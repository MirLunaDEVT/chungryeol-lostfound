import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
    const { type } = await req.json(); // "HELPFUL" | "ME_TOO"

    if (!type || !["HELPFUL", "ME_TOO"].includes(type)) {
      return NextResponse.json({ error: "유효하지 않은 반응 유형입니다." }, { status: 400 });
    }

    // 기존 반응 확인 (토글)
    const existing = await prisma.reaction.findUnique({
      where: {
        postId_userId_type: {
          postId,
          userId: session.user.id,
          type,
        },
      },
    });

    if (existing) {
      await prisma.reaction.delete({
        where: { id: existing.id },
      });
      return NextResponse.json({ success: true, active: false });
    } else {
      await prisma.reaction.create({
        data: {
          postId,
          userId: session.user.id,
          type,
        },
      });
      return NextResponse.json({ success: true, active: true });
    }
  } catch (error) {
    console.error("Reaction toggle error:", error);
    return NextResponse.json(
      { error: "반응 처리 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
