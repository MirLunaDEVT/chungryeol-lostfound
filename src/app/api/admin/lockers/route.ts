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

    const lockers = await prisma.schoolLockerItem.findMany({
      orderBy: [{ isReturned: "asc" }, { intakeDate: "desc" }],
    });

    return NextResponse.json({ lockers });
  } catch (error) {
    console.error("Lockers GET error:", error);
    return NextResponse.json(
      { error: "보관함 현황을 불러오지 못했습니다." },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (
      !session?.user?.id ||
      (session.user.role !== "ADMIN" && session.user.role !== "TEACHER")
    ) {
      return NextResponse.json({ error: "관리자 또는 교사만 등록할 수 있습니다." }, { status: 403 });
    }

    const { lockerCode, itemSummary } = await req.json();
    if (!lockerCode || !itemSummary) {
      return NextResponse.json(
        { error: "사물함 번호와 물품 요약을 입력해주세요." },
        { status: 400 }
      );
    }

    const lockerItem = await prisma.schoolLockerItem.create({
      data: {
        lockerCode: lockerCode.trim(),
        itemSummary: itemSummary.trim(),
        managedBy: session.user.name,
      },
    });

    return NextResponse.json({ success: true, item: lockerItem });
  } catch (error) {
    console.error("Locker POST error:", error);
    return NextResponse.json(
      { error: "보관함 물품 등록 중 오류가 발생했습니다." },
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
      return NextResponse.json({ error: "관리자 또는 교사만 처리할 수 있습니다." }, { status: 403 });
    }

    const { id, isReturned } = await req.json();

    const updated = await prisma.schoolLockerItem.update({
      where: { id },
      data: {
        isReturned: !!isReturned,
        returnDate: isReturned ? new Date() : null,
      },
    });

    return NextResponse.json({ success: true, item: updated });
  } catch (error) {
    console.error("Locker PATCH error:", error);
    return NextResponse.json(
      { error: "보관함 상태 변경 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
