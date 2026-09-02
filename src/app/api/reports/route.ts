import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SCHOOL_CONFIG } from "@/lib/constants";
import { createAuditLog } from "@/lib/audit";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    const {
      targetType, // "POST" | "COMMENT" | "CHAT_MESSAGE" | "USER"
      postId,
      commentId,
      chatMessageId,
      reportedUserId,
      reason,
      details,
    } = await req.json();

    if (!targetType || !reason) {
      return NextResponse.json(
        { error: "신고 대상 및 신고 사유를 입력해주세요." },
        { status: 400 }
      );
    }

    // 중복 신고 방지 (동일 유저가 동일 대상을 반복 신고하는 것 차단)
    const existingReport = await prisma.report.findFirst({
      where: {
        reporterId: session.user.id,
        targetType,
        postId: postId || null,
        commentId: commentId || null,
        chatMessageId: chatMessageId || null,
        reportedUserId: reportedUserId || null,
      },
    });

    if (existingReport) {
      return NextResponse.json(
        { error: "이미 접수된 신고입니다. 관리자가 검토 중입니다." },
        { status: 409 }
      );
    }

    // 신고 접수 생성
    const report = await prisma.report.create({
      data: {
        reporterId: session.user.id,
        targetType,
        postId: postId || null,
        commentId: commentId || null,
        chatMessageId: chatMessageId || null,
        reportedUserId: reportedUserId || null,
        reason,
        details: details ? details.trim() : null,
      },
    });

    // 만약 게시글(POST)에 대한 신고인 경우, 누적 신고 횟수 확인
    if (targetType === "POST" && postId) {
      const postReportCount = await prisma.report.count({
        where: { postId },
      });

      // 동일 글 신고 N회(기본 3회) 이상 시 자동 숨김 처리
      if (postReportCount >= SCHOOL_CONFIG.reportAutoThreshold) {
        await prisma.post.update({
          where: { id: postId },
          data: { status: "HIDDEN" },
        });

        await createAuditLog({
          userId: session.user.id,
          action: "POST_AUTO_HIDDEN_REPORT_THRESHOLD",
          details: { postId, count: postReportCount },
        });
      }
    }

    await createAuditLog({
      userId: session.user.id,
      action: "USER_REPORTED",
      details: { targetType, reason, reportId: report.id },
    });

    return NextResponse.json({
      success: true,
      message: "신고가 정상 접수되었습니다. 학교 관리자가 신속히 검토하겠습니다.",
    });
  } catch (error) {
    console.error("Report POST error:", error);
    return NextResponse.json(
      { error: "신고 접수 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
