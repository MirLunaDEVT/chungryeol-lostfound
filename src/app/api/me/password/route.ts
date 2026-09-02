import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { createAuditLog } from "@/lib/audit";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    const { currentPassword, newPassword } = await req.json();

    if (!newPassword || newPassword.length < 4) {
      return NextResponse.json(
        { error: "새 비밀번호는 최소 4자 이상이어야 합니다." },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user) {
      return NextResponse.json({ error: "사용자를 찾을 수 없습니다." }, { status: 404 });
    }

    // 기존 비밀번호가 설정되어 있는 경우 현재 비밀번호 대조
    if (user.passwordHash) {
      if (!currentPassword) {
        return NextResponse.json(
          { error: "현재 사용 중인 비밀번호를 입력해주세요." },
          { status: 400 }
        );
      }

      const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isMatch) {
        return NextResponse.json(
          { error: "현재 비밀번호가 일치하지 않습니다." },
          { status: 400 }
        );
      }
    }

    // 새 비밀번호 해시 암호화
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(newPassword, salt);

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: hash },
    });

    await createAuditLog({
      userId: user.id,
      action: "PASSWORD_CHANGED",
      details: { studentNo: user.studentNo },
    });

    return NextResponse.json({
      success: true,
      message: "비밀번호가 성공적으로 변경되었습니다.",
    });
  } catch (error) {
    console.error("Failed to change password:", error);
    return NextResponse.json(
      { error: "비밀번호 변경 처리 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
