import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (
      !session?.user?.id ||
      (session.user.role !== "ADMIN" && session.user.role !== "TEACHER")
    ) {
      return NextResponse.json({ error: "관리자 권한이 필요합니다." }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || "PENDING";

    const reports = await prisma.report.findMany({
      where: status !== "ALL" ? { status } : undefined,
      include: {
        reporter: {
          select: { id: true, name: true, studentNoMasked: true, role: true },
        },
        reportedUser: {
          select: { id: true, name: true, studentNoMasked: true, status: true, warningCount: true },
        },
        post: {
          select: { id: true, title: true, type: true, status: true, authorId: true },
        },
        comment: {
          select: { id: true, content: true, authorId: true },
        },
        chatMessage: {
          select: { id: true, content: true, senderId: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ reports });
  } catch (error) {
    console.error("Admin reports GET error:", error);
    return NextResponse.json(
      { error: "신고 목록을 불러오지 못했습니다." },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (
      !session?.user?.id ||
      (session.user.role !== "ADMIN" && session.user.role !== "TEACHER")
    ) {
      return NextResponse.json({ error: "관리자 권한이 필요합니다." }, { status: 403 });
    }

    const { reportId, action, notes } = await req.json();
    // action: "DISMISS" | "HIDE_CONTENT" | "WARN_USER" | "SUSPEND_USER"

    const report = await prisma.report.findUnique({
      where: { id: reportId },
      include: { post: true, comment: true, chatMessage: true },
    });

    if (!report) {
      return NextResponse.json({ error: "신고 내역을 찾을 수 없습니다." }, { status: 404 });
    }

    let reportStatus = "REVIEWED_NO_ACTION";
    let actionTakenDesc = notes || "";

    if (action === "DISMISS") {
      reportStatus = "REVIEWED_NO_ACTION";
      actionTakenDesc = "정상 게시글/대화로 판단하여 조치 없이 종결";
    } else if (action === "HIDE_CONTENT") {
      reportStatus = "CONTENT_HIDDEN";
      if (report.postId) {
        await prisma.post.update({
          where: { id: report.postId },
          data: { status: "HIDDEN" },
        });
      }
      actionTakenDesc = "부적절 콘텐츠 숨김 처리 완료";
    } else if (action === "WARN_USER") {
      reportStatus = "USER_WARNED";
      const targetUserId =
        report.reportedUserId ||
        report.post?.authorId ||
        report.comment?.authorId ||
        report.chatMessage?.senderId;

      if (targetUserId) {
        const updated = await prisma.user.update({
          where: { id: targetUserId },
          data: { warningCount: { increment: 1 } },
        });
        // 경고 3회 이상이면 자동 계정 정지
        if (updated.warningCount >= 3) {
          await prisma.user.update({
            where: { id: targetUserId },
            data: {
              status: "SUSPENDED",
              suspendedReason: "누적 경고 3회 초과로 인한 자동 정지",
            },
          });
        }
      }
      actionTakenDesc = "작성자에게 경고 1회 부여";
    } else if (action === "SUSPEND_USER") {
      reportStatus = "USER_SUSPENDED";
      const targetUserId =
        report.reportedUserId ||
        report.post?.authorId ||
        report.comment?.authorId ||
        report.chatMessage?.senderId;

      if (targetUserId) {
        await prisma.user.update({
          where: { id: targetUserId },
          data: {
            status: "SUSPENDED",
            suspendedReason: notes || "교내 생활규정 위반 및 허위/부적절 이용으로 정지",
          },
        });
      }
      if (report.postId) {
        await prisma.post.update({
          where: { id: report.postId },
          data: { status: "HIDDEN" },
        });
      }
      actionTakenDesc = "작성자 계정 즉시 정지 및 콘텐츠 숨김";
    }

    await prisma.report.update({
      where: { id: reportId },
      data: {
        status: reportStatus,
        actionTaken: actionTakenDesc,
        resolvedAt: new Date(),
      },
    });

    await createAuditLog({
      userId: session.user.id,
      action: "REPORT_RESOLVED",
      details: { reportId, action, actionTakenDesc },
    });

    return NextResponse.json({
      success: true,
      message: "신고 조치가 완료되었습니다.",
    });
  } catch (error) {
    console.error("Admin report PATCH error:", error);
    return NextResponse.json(
      { error: "신고 처리 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
