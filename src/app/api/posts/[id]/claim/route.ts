import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SCHOOL_CONFIG } from "@/lib/constants";
import { createAuditLog } from "@/lib/audit";
import { checkBannedWords, detectSensitiveContactPatterns, maskStudentNo } from "@/lib/security";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    const postId = params.id;
    const post = await prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post) {
      return NextResponse.json({ error: "글을 찾을 수 없습니다." }, { status: 404 });
    }

    const isAuthor = post.authorId === session.user.id;
    const isAdmin =
      session.user.role === "ADMIN" || session.user.role === "TEACHER";

    // 작성자나 교사/관리자는 전체 예약 내역 열람 가능, 일반 학생은 본인 예약 건만
    const claims = await prisma.claim.findMany({
      where: isAuthor || isAdmin
        ? { postId }
        : { postId, claimantId: session.user.id },
      include: {
        claimant: {
          select: {
            id: true,
            name: true,
            studentNoMasked: true,
            grade: true,
            classNo: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ claims });
  } catch (error) {
    console.error("Claim GET error:", error);
    return NextResponse.json(
      { error: "예약 내역을 불러오지 못했습니다." },
      { status: 500 }
    );
  }
}

// 1. 수령 예약 접수 (POST) - 원자적 잠금, 알박기 방지, 금칙어/개인정보 필터링 적용
export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    const postId = params.id;
    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: { author: true },
    });

    if (!post) {
      return NextResponse.json({ error: "글을 찾을 수 없습니다." }, { status: 404 });
    }

    const { identifyingNotes, visitTime, pickupPlace, studentNo, name } = await req.json();

    let claimantUserId = session?.user?.id;

    if (session?.user?.role !== "ADMIN" && (studentNo || name)) {
      const trimmedNo = (studentNo || "").trim();
      const trimmedName = (name || "").trim();

      if (trimmedNo && trimmedName) {
        let claimantUser = await prisma.user.findUnique({
          where: { studentNo: trimmedNo },
        });

        if (!claimantUser) {
          let grade = null;
          let classNo = null;
          if (trimmedNo.length === 4) {
            grade = parseInt(trimmedNo[0], 10);
            classNo = parseInt(trimmedNo[1], 10);
          }
          claimantUser = await prisma.user.create({
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
        }
        claimantUserId = claimantUser.id;
      }
    }

    if (!claimantUserId) {
      return NextResponse.json({ error: "신청자의 학번과 실명을 입력해주세요." }, { status: 400 });
    }

    // 악용 방지 1: 본인 글 셀프 수령 예약 차단
    if (post.authorId === claimantUserId) {
      return NextResponse.json(
        { error: "본인이 등록한 글에는 수령 예약을 할 수 없습니다." },
        { status: 400 }
      );
    }

    // 악용 방지 2: 종료되거나 잠긴 글 예약 차단
    if (post.status === "RETURNED" || post.status === "HIDDEN") {
      return NextResponse.json(
        { error: "이미 반환 완료되었거나 마감된 물건입니다." },
        { status: 400 }
      );
    }

    if (post.status === "RESERVED" || post.status === "CLAIM_PENDING") {
      return NextResponse.json(
        { error: "이미 다른 학생이 수령 예약 중인 물품입니다." },
        { status: 400 }
      );
    }

    // 악용 방지 3: '알박기'(Reservation DoS) 방지 - 학생당 동시 활성 예약 최대 3건 제한
    const activeClaimsCount = await prisma.claim.count({
      where: {
        claimantId: claimantUserId,
        status: "REQUESTED",
        post: { status: "RESERVED" },
      },
    });

    if (activeClaimsCount >= 3) {
      return NextResponse.json(
        {
          error:
            "현재 진행 중인 수령 예약이 3건 있습니다. 다른 분실물 예약을 위해 기존 예약을 완료하거나 취소한 후 신청해주세요.",
        },
        { status: 429 }
      );
    }

    if (!identifyingNotes || identifyingNotes.trim().length < 5) {
      return NextResponse.json(
        {
          error: "허위 수령 방지를 위해 사진에 없는 본인만의 단서를 최소 5자 이상 적어주세요.",
        },
        { status: 400 }
      );
    }

    const reservationTime = visitTime?.trim() || "점심시간 12:40";
    const handoverPlace = pickupPlace?.trim() || SCHOOL_CONFIG.defaultHandoverPlace;

    // 악용 방지 4: 비공개 단서 내 금칙어/욕설 검사
    const dbBannedWords = (await prisma.bannedWord.findMany()).map((b) => b.word);
    const bannedDetected = checkBannedWords(`${identifyingNotes} ${reservationTime}`, dbBannedWords);
    if (bannedDetected) {
      return NextResponse.json(
        { error: `비공개 단서에 금칙어("${bannedDetected}")가 포함되어 있어 등록할 수 없습니다.` },
        { status: 400 }
      );
    }

    // 악용 방지 5: 비공개 단서 내 전화번호/외부메신저/계좌번호 유출 차단
    const sensitive = detectSensitiveContactPatterns(`${identifyingNotes} ${reservationTime}`);
    if (sensitive.hasSensitivePattern) {
      return NextResponse.json(
        { error: sensitive.reason || "비공개 단서에 개인 연락처 또는 계좌/사례금 요구 내용을 적을 수 없습니다." },
        { status: 400 }
      );
    }

    // 악용 방지 6: 동시 예약 경쟁(Race Condition) 방지 - 원자적 트랜잭션 처리
    let newClaim: any;
    try {
      newClaim = await prisma.$transaction(async (tx) => {
        // status가 OPEN인 경우에만 1건 atomic update
        const updated = await tx.post.updateMany({
          where: { id: postId, status: "OPEN" },
          data: { status: "RESERVED" },
        });

        if (updated.count === 0) {
          throw new Error("ALREADY_RESERVED");
        }

        const claim = await tx.claim.create({
          data: {
            postId,
            claimantId: claimantUserId,
            identifyingNotes: identifyingNotes.trim(),
            visitTime: reservationTime,
            pickupPlace: handoverPlace,
            status: "REQUESTED",
          },
          include: { claimant: true },
        });

        // 습득자에게 실시간 알림 발송
        await tx.notification.create({
          data: {
            userId: post.authorId,
            title: "📦 [수령 예약 접수] 내 등록 물품에 수령 예약이 들어왔습니다!",
            body: `${session.user.name || "학생"}님이 "${post.title}" 물품을 본인 것으로 확인하고 수령 예약(${reservationTime})을 신청했습니다.`,
            link: `/posts/${postId}`,
          },
        });

        return claim;
      });
    } catch (txError: any) {
      if (txError.message === "ALREADY_RESERVED") {
        return NextResponse.json(
          { error: "방금 다른 학생이 먼저 수령 예약을 접수했습니다." },
          { status: 409 }
        );
      }
      throw txError;
    }

    // 감사 로그 기록
    await createAuditLog({
      userId: claimantUserId,
      action: "CLAIM_REQUESTED",
      details: {
        postId,
        postTitle: post.title,
        visitTime: reservationTime,
        pickupPlace: handoverPlace,
      },
    });

    return NextResponse.json({
      message: "수령 예약이 완료되었습니다. 지정된 시간에 학생실에서 물품을 확인하세요.",
      claim: newClaim,
    });
  } catch (error) {
    console.error("Claim POST error:", error);
    return NextResponse.json(
      { error: "수령 예약 접수 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

// 2. 예약 처리 (인수인계 완료 / 예약 취소) (PATCH)
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    const postId = params.id;
    const { claimId, action } = await req.json();

    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: { author: true },
    });

    if (!post) {
      return NextResponse.json({ error: "글을 찾을 수 없습니다." }, { status: 404 });
    }

    const claim = await prisma.claim.findUnique({
      where: { id: claimId },
      include: { claimant: true },
    });

    if (!claim) {
      return NextResponse.json({ error: "예약 내역을 찾을 수 없습니다." }, { status: 404 });
    }

    const isAuthor = post.authorId === session.user.id;
    const isClaimant = claim.claimantId === session.user.id;
    const isAdmin =
      session.user.role === "ADMIN" || session.user.role === "TEACHER";

    // 악용 방지 7: 미인가 권한 차단
    if (!isAuthor && !isClaimant && !isAdmin) {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    if (action === "COMPLETE" || action === "APPROVE") {
      // 악용 방지 8: 인수인계 완료는 오직 습득자(작성자) 또는 담당 교사만 승인 가능!
      // (예약자 본인이 셀프로 인수인계 완료를 눌러 반환 조작하는 편법 원천 차단)
      if (!isAuthor && !isAdmin) {
        return NextResponse.json(
          { error: "물품 인수인계 완료 승인은 습득자(작성자) 또는 학생실 지도교사만 처리할 수 있습니다." },
          { status: 403 }
        );
      }

      await prisma.$transaction(async (tx) => {
        await tx.claim.update({
          where: { id: claimId },
          data: {
            status: "APPROVED",
            handoverCompleted: true,
            decidedById: session.user.id,
            decidedAt: new Date(),
          },
        });

        await tx.post.update({
          where: { id: postId },
          data: { status: "RETURNED" },
        });

        // 습득자의 반환 완료 기여도 +1 증가
        await tx.user.update({
          where: { id: post.authorId },
          data: { returnedCount: { increment: 1 } },
        });

        // 예약자에게 반환 완료 알림
        await tx.notification.create({
          data: {
            userId: claim.claimantId,
            title: "🎉 [반환 완료] 물품 인수인계가 완료되었습니다!",
            body: `"${post.title}" 물품이 학생실에서 정상적으로 인수인계 완료 처리되었습니다.`,
            link: `/posts/${postId}`,
          },
        });
      });

      // 감사 로그
      await createAuditLog({
        userId: session.user.id,
        action: "HANDOVER_COMPLETED",
        details: {
          postId,
          claimId,
          claimantId: claim.claimantId,
        },
      });

      return NextResponse.json({
        message: "인수인계 및 반환 완료 처리가 완료되었습니다.",
      });
    } else if (action === "CANCEL" || action === "REJECT") {
      // 예약 취소는 예약자 본인, 작성자, 교사 모두 가능
      await prisma.$transaction(async (tx) => {
        await tx.claim.update({
          where: { id: claimId },
          data: {
            status: "CANCELLED",
            decidedById: session.user.id,
            decidedAt: new Date(),
          },
        });

        await tx.post.update({
          where: { id: postId },
          data: { status: "OPEN" },
        });

        // 상대방에게 알림 발송
        const targetUserId = isClaimant ? post.authorId : claim.claimantId;
        await tx.notification.create({
          data: {
            userId: targetUserId,
            title: "⚠️ [예약 취소] 수령 예약이 취소되었습니다.",
            body: `"${post.title}" 물품의 수령 예약이 취소되어 다시 찾는 중 상태로 전환되었습니다.`,
            link: `/posts/${postId}`,
          },
        });
      });

      return NextResponse.json({
        message: "수령 예약이 취소되고 물품이 다시 찾는 중 상태로 변경되었습니다.",
      });
    }

    return NextResponse.json({ error: "잘못된 액션 요청입니다." }, { status: 400 });
  } catch (error) {
    console.error("Claim PATCH error:", error);
    return NextResponse.json(
      { error: "예약 상태 변경 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
