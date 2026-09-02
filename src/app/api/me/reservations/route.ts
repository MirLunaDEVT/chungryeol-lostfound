import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    const reservations = await prisma.claim.findMany({
      where: { claimantId: session.user.id },
      include: {
        post: {
          include: {
            images: true,
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
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ reservations });
  } catch (err) {
    console.error("Reservations GET error:", err);
    return NextResponse.json(
      { error: "수령 예약 목록 조회 실패" },
      { status: 500 }
    );
  }
}
