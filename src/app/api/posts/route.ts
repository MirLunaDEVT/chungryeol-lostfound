import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  checkBannedWords,
  checkPostRateLimit,
  detectSensitiveContactPatterns,
} from "@/lib/security";
import { triggerKeywordAlerts } from "@/lib/matching";
import { createAuditLog } from "@/lib/audit";
import { SCHOOL_CONFIG } from "@/lib/constants";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type"); // ALL, LOST, FOUND, COMMUNITY
    const category = searchParams.get("category");
    const building = searchParams.get("building");
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    const whereClause: any = {};

    // 1. 유형 필터
    if (type && type !== "ALL") {
      whereClause.type = type;
    }

    // 2. 카테고리 필터
    if (category && category !== "전체") {
      whereClause.category = category;
    }

    // 3. 건물 장소 필터
    if (building && building !== "전체") {
      whereClause.placeBuilding = building;
    }

    // 4. 상태 필터 (기본: 숨김 글 제외)
    if (status && status !== "ALL") {
      whereClause.status = status;
    } else {
      whereClause.status = { not: "HIDDEN" };
    }

    // 5. 검색어 필터 (제목, 본문, 태그)
    if (search && search.trim()) {
      const q = search.trim();
      whereClause.OR = [
        { title: { contains: q } },
        { body: { contains: q } },
        { tags: { contains: q } },
        { placeDetail: { contains: q } },
      ];
    }

    const posts = await prisma.post.findMany({
      where: whereClause,
      include: {
        author: {
          select: {
            id: true,
            name: true,
            studentNoMasked: true,
            grade: true,
            classNo: true,
            role: true,
            returnedCount: true,
          },
        },
        images: {
          orderBy: { order: "asc" },
        },
        _count: {
          select: {
            reactions: true,
            claims: true,
          },
        },
      },
      orderBy: [
        { isPinned: "desc" }, // 공지사항 상단 고정
        { createdAt: "desc" }, // 등록일시 최신순
      ],
    });

    return NextResponse.json({ posts });
  } catch (error) {
    console.error("Posts GET error:", error);
    return NextResponse.json(
      { error: "게시글 목록을 불러오지 못했습니다." },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user || user.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "활동 가능한 학생/교사 계정만 글을 작성할 수 있습니다." },
        { status: 403 }
      );
    }

    // 속도제한 (Rate limit) 검사 (10분 1회, 1일 5회)
    const rateCheck = checkPostRateLimit(user);
    if (!rateCheck.allowed) {
      return NextResponse.json({ error: rateCheck.reason }, { status: 429 });
    }

    const body = await req.json();
    const {
      type,
      category,
      title,
      content,
      placeBuilding,
      placeDetail,
      occurredAt,
      images, // string[] URLs
      tags,   // string[]
      isPinned,
    } = body;

    // 필수 항목 검증 (사진 1장 이상 필수 - 익명/장난 방지)
    if (!title || !content || !category || !placeBuilding || !type) {
      return NextResponse.json(
        { error: "제목, 내용, 카테고리, 장소, 유형을 모두 입력해주세요." },
        { status: 400 }
      );
    }

    // 커뮤니티나 공지가 아닌 분실/습득글은 사진 필수 강제
    if ((type === "LOST" || type === "FOUND") && (!images || images.length === 0)) {
      return NextResponse.json(
        { error: "정확한 확인을 위해 사진을 최소 1장 이상 첨부해야 합니다." },
        { status: 400 }
      );
    }

    // 금칙어 검사
    const dbBannedWords = (await prisma.bannedWord.findMany()).map((b) => b.word);
    const bannedDetected = checkBannedWords(
      `${title} ${content} ${tags ? tags.join(" ") : ""}`,
      dbBannedWords
    );
    if (bannedDetected) {
      return NextResponse.json(
        { error: `금칙어("${bannedDetected}")가 포함되어 있어 등록할 수 없습니다.` },
        { status: 400 }
      );
    }

    // 전화번호, 외부메신저 링크 및 사례금/송금/계좌 요구 차단
    const sensitive = detectSensitiveContactPatterns(`${title} ${content}`);
    if (sensitive.hasSensitivePattern) {
      return NextResponse.json(
        { error: sensitive.reason || "개인 연락처 또는 사례금/계좌 관련 내용은 게시할 수 없습니다." },
        { status: 400 }
      );
    }

    // 관리자 공지 권한 검증
    const canPin =
      isPinned && (user.role === "ADMIN" || user.role === "TEACHER");

    // 게시글 및 이미지 트랜잭션 생성
    const newPost = await prisma.post.create({
      data: {
        authorId: user.id,
        type,
        category,
        title: title.trim(),
        body: content.trim(),
        placeBuilding,
        placeDetail: (placeDetail || "").trim(),
        occurredAt: occurredAt ? new Date(occurredAt) : new Date(),
        tags: tags ? JSON.stringify(tags) : null,
        isPinned: canPin,
        pickupPlace: SCHOOL_CONFIG.defaultHandoverPlace,
        images: {
          create: (images || []).map((url: string, idx: number) => ({
            url,
            order: idx,
          })),
        },
      },
      include: {
        images: true,
        author: {
          select: {
            id: true,
            name: true,
            studentNoMasked: true,
            grade: true,
            classNo: true,
          },
        },
      },
    });

    // 유저의 마지막 작성 시각 및 당일 카운트 업데이트
    await prisma.user.update({
      where: { id: user.id },
      data: {
        lastPostedAt: new Date(),
        todayPostCount: { increment: 1 },
      },
    });

    // 키워드 알림 구독자들에게 알림 생성 발송
    await triggerKeywordAlerts({
      id: newPost.id,
      title: newPost.title,
      body: newPost.body,
      category: newPost.category,
      placeBuilding: newPost.placeBuilding,
      tags: newPost.tags,
      type: newPost.type,
      authorId: user.id,
    });

    // 감사 로그 기록
    await createAuditLog({
      userId: user.id,
      action: "POST_CREATED",
      details: {
        postId: newPost.id,
        type: newPost.type,
        category: newPost.category,
        title: newPost.title,
      },
    });

    return NextResponse.json({ success: true, post: newPost });
  } catch (error) {
    console.error("Post creation error:", error);
    return NextResponse.json(
      { error: "글을 등록하는 도중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
