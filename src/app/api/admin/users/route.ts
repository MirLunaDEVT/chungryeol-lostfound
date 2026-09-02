import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "관리자 권한이 필요합니다." }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") || "";

    const users = await prisma.user.findMany({
      where: q
        ? {
            OR: [
              { name: { contains: q } },
              { studentNo: { contains: q } },
              { email: { contains: q } },
            ],
          }
        : undefined,
      orderBy: [{ role: "desc" }, { createdAt: "desc" }],
    });

    return NextResponse.json({ users });
  } catch (error) {
    console.error("Admin users GET error:", error);
    return NextResponse.json(
      { error: "사용자 목록을 불러오지 못했습니다." },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "관리자 권한이 필요합니다." }, { status: 403 });
    }

    const { userId, status, role, suspendedReason } = await req.json();

    const updateData: any = {};
    if (status) updateData.status = status;
    if (role) updateData.role = role;
    if (suspendedReason !== undefined) updateData.suspendedReason = suspendedReason;

    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    await createAuditLog({
      userId: session.user.id,
      action: status === "SUSPENDED" ? "USER_SUSPENDED" : "USER_MODIFIED",
      details: { targetUserId: userId, status, role, suspendedReason },
    });

    return NextResponse.json({ success: true, user });
  } catch (error) {
    console.error("Admin user PATCH error:", error);
    return NextResponse.json(
      { error: "사용자 정보 수정 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
