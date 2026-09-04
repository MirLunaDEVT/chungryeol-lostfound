import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  checkBannedWords,
  checkPostRateLimit,
  detectSensitiveContactPatterns,
  maskStudentNo,
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
      studentNo, // 작성자 학번
      name,      // 작성자 실명
    } = body;

    let authorUser: any = null;

    // 1. 관리자 계정 로그인 상태인 경우
    if (session?.user?.role === "ADMIN" || session?.user?.role === "TEACHER") {
      authorUser = await prisma.user.findUnique({
        where: { id: session.user.id },
      });
      if (!authorUser) {
        return NextResponse.json({ error: "관리자 계정을 찾을 수 없습니다." }, { status: 404 });
      }
    } else {
      // 2. 학생 글 작성: 학번과 실명 필수 검증 (교내 안전 정책)
      if (!studentNo || !name) {
        return NextResponse.json(
          { error: "게시글 작성을 위해 학번과 실명을 정확히 입력해주세요." },
          { status: 400 }
        );
      }

      const trimmedNo = studentNo.trim();
      const trimmedName = name.trim();

      if (!/^[0-9]{4,6}$/.test(trimmedNo)) {
        return NextResponse.json(
          { error: "학번은 4~6자리 숫자로 입력해주세요. (예: 3105)" },
          { status: 400 }
        );
      }

      if (trimmedName.length < 2) {
        return NextResponse.json(
          { error: "이름은 2글자 이상의 실명으로 입력해주세요." },
          { status: 400 }
        );
      }

      // 학번에 해당하는 User 조회 또는 생성
      authorUser = await prisma.user.findUnique({
        where: { studentNo: trimmedNo },
      });

      if (!authorUser) {
        let grade = null;
        let classNo = null;
        if (trimmedNo.length === 4) {
          grade = parseInt(trimmedNo[0], 10);
          classNo = parseInt(trimmedNo[1], 10);
        }
        authorUser = await prisma.user.create({
          data: {
            studentNo: trimmedNo,
            studentNoMasked: maskStudentNo(trimmedNo),
            name: trimmedName,
            grade,
            classNo,
            role: "STUDENT",
            status: "ACTIVE",
          },
        });
      } else {
        if (authorUser.name !== trimmedName) {
          authorUser = await prisma.user.update({
            where: { id: authorUser.id },
            data: { name: trimmedName },
          });
        }
      }

      if (authorUser.status === "SUSPENDED") {
        return NextResponse.json(
          { error: "해당 학번은 교내 운영 수칙 위반으로 게시글 작성이 일시 제한되었습니다." },
          { status: 403 }
        );
      }
    }

    // 속도제한 (Rate limit) 검사 (10분 1회, 1일 5회)
    const rateCheck = checkPostRateLimit(authorUser);
    if (!rateCheck.allowed) {
      return NextResponse.json({ error: rateCheck.reason }, { status: 429 });
    }

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
      isPinned && (authorUser.role === "ADMIN" || authorUser.role === "TEACHER");

    // 게시글 및 이미지 트랜잭션 생성
    const newPost = await prisma.post.create({
      data: {
        authorId: authorUser.id,
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
      where: { id: authorUser.id },
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
      authorId: authorUser.id,
    });

    // 감사 로그 기록
    await createAuditLog({
      userId: authorUser.id,
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
