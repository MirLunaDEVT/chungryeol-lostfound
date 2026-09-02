import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    const keywords = await prisma.keywordAlert.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ keywords });
  } catch (error) {
    console.error("Keywords GET error:", error);
    return NextResponse.json(
      { error: "키워드 목록을 불러오지 못했습니다." },
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

    const { keyword } = await req.json();
    if (!keyword || !keyword.trim()) {
      return NextResponse.json({ error: "키워드를 입력해주세요." }, { status: 400 });
    }

    const cleanKeyword = keyword.trim();

    // 중복 구독 방지
    const existing = await prisma.keywordAlert.findFirst({
      where: {
        userId: session.user.id,
        keyword: cleanKeyword,
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "이미 등록된 키워드입니다." },
        { status: 409 }
      );
    }

    const count = await prisma.keywordAlert.count({
      where: { userId: session.user.id },
    });

    if (count >= 10) {
      return NextResponse.json(
        { error: "키워드는 최대 10개까지 등록 가능합니다." },
        { status: 400 }
      );
    }

    const newAlert = await prisma.keywordAlert.create({
      data: {
        userId: session.user.id,
        keyword: cleanKeyword,
      },
    });

    return NextResponse.json({ success: true, keyword: newAlert });
  } catch (error) {
    console.error("Keyword create error:", error);
    return NextResponse.json(
      { error: "키워드 등록 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID가 필요합니다." }, { status: 400 });
    }

    await prisma.keywordAlert.deleteMany({
      where: {
        id,
        userId: session.user.id,
      },
    });

    return NextResponse.json({ success: true, message: "키워드가 삭제되었습니다." });
  } catch (error) {
    console.error("Keyword delete error:", error);
    return NextResponse.json(
      { error: "키워드 삭제 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
