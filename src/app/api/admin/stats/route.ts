import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (
      !session?.user?.id ||
      (session.user.role !== "ADMIN" && session.user.role !== "TEACHER")
    ) {
      return NextResponse.json({ error: "관리자 권한이 필요합니다." }, { status: 403 });
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [
      pendingReportsCount,
      pendingClaimsCount,
      todayPostsCount,
      suspendedUsersCount,
      totalStudentsCount,
      totalLockersCount,
      recentAuditLogs,
    ] = await Promise.all([
      prisma.report.count({ where: { status: "PENDING" } }),
      prisma.claim.count({ where: { status: "REQUESTED" } }),
      prisma.post.count({ where: { createdAt: { gte: todayStart } } }),
      prisma.user.count({ where: { status: "SUSPENDED" } }),
      prisma.rosterEntry.count({ where: { role: "STUDENT" } }),
      prisma.schoolLockerItem.count({ where: { isReturned: false } }),
      prisma.auditLog.findMany({
        take: 10,
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: { name: true, studentNoMasked: true, role: true },
          },
        },
      }),
    ]);

    return NextResponse.json({
      stats: {
        pendingReportsCount,
        pendingClaimsCount,
        todayPostsCount,
        suspendedUsersCount,
        totalStudentsCount,
        totalLockersCount,
      },
      recentAuditLogs,
    });
  } catch (error) {
    console.error("Admin stats GET error:", error);
    return NextResponse.json(
      { error: "통계 정보를 불러오지 못했습니다." },
      { status: 500 }
    );
  }
}
