import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "관리자 권한이 필요합니다." }, { status: 403 });
    }

    const words = await prisma.bannedWord.findMany({
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ words });
  } catch (error) {
    console.error("Banned words GET error:", error);
    return NextResponse.json(
      { error: "금칙어 목록을 불러오지 못했습니다." },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "관리자 권한이 필요합니다." }, { status: 403 });
    }

    const { word } = await req.json();
    if (!word || !word.trim()) {
      return NextResponse.json({ error: "금칙어를 입력해주세요." }, { status: 400 });
    }

    const cleanWord = word.trim();

    const created = await prisma.bannedWord.upsert({
      where: { word: cleanWord },
      update: {},
      create: { word: cleanWord },
    });

    await createAuditLog({
      userId: session.user.id,
      action: "BANNED_WORD_MODIFIED",
      details: { added: cleanWord },
    });

    return NextResponse.json({ success: true, word: created });
  } catch (error) {
    console.error("Banned word POST error:", error);
    return NextResponse.json(
      { error: "금칙어 추가 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "관리자 권한이 필요합니다." }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID가 필요합니다." }, { status: 400 });
    }

    await prisma.bannedWord.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: "금칙어가 삭제되었습니다." });
  } catch (error) {
    console.error("Banned word DELETE error:", error);
    return NextResponse.json(
      { error: "금칙어 삭제 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
