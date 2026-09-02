import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SCHOOL_CONFIG } from "@/lib/constants";
import { maskStudentNo } from "@/lib/security";
import { createAuditLog } from "@/lib/audit";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    const { studentNo, name, grade, classNo } = await req.json();

    if (!studentNo || !name) {
      return NextResponse.json(
        { error: "학번과 이름을 정확히 입력해주세요." },
        { status: 400 }
      );
    }

    const cleanStudentNo = studentNo.trim();
    const cleanName = name.trim();

    // 1. 학번 형식 검증 (6자리 정규식)
    if (!SCHOOL_CONFIG.studentNoRegex.test(cleanStudentNo)) {
      return NextResponse.json(
        { error: "학번 형식이 올바르지 않습니다. (예: 240101 - 입학년도2+반2+번호2)" },
        { status: 400 }
      );
    }

    // 2. 관리자가 업로드한 재학생 명단(Roster)과 엄격 대조
    const roster = await prisma.rosterEntry.findUnique({
      where: { studentNo: cleanStudentNo },
    });

    if (!roster || !roster.enrolled) {
      return NextResponse.json(
        {
          error:
            "학교 재학생 명단에 등록되지 않은 학번이거나 현재 재학 중이 아닙니다. 학생실(교무실)에 문의하세요.",
        },
        { status: 403 }
      );
    }

    if (roster.name !== cleanName) {
      return NextResponse.json(
        { error: "재학생 명단의 이름과 일치하지 않습니다. 실명을 입력해주세요." },
        { status: 400 }
      );
    }

    // 3. 이미 다른 구글 계정이나 사용자에게 바인딩된 학번인지 확인 (중복 가입 차단)
    const existingBinding = await prisma.user.findFirst({
      where: {
        studentNo: cleanStudentNo,
        id: { not: session.user.id },
      },
    });

    if (existingBinding) {
      return NextResponse.json(
        { error: "이미 가입 완료된 학번입니다. 본인 계정이 아니라면 학생실로 문의하세요." },
        { status: 409 }
      );
    }

    // 4. 사용자 계정 활성화
    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        studentNo: cleanStudentNo,
        studentNoMasked: maskStudentNo(cleanStudentNo),
        name: cleanName,
        grade: Number(grade) || roster.grade,
        classNo: Number(classNo) || roster.classNo,
        role: roster.role,
        status: "ACTIVE",
      },
    });

    // 5. 명단에 활성화 시각 기록
    await prisma.rosterEntry.update({
      where: { id: roster.id },
      data: { activatedAt: new Date() },
    });

    await createAuditLog({
      userId: updatedUser.id,
      action: "ONBOARDING_COMPLETED",
      details: { studentNo: cleanStudentNo, name: cleanName },
    });

    return NextResponse.json({
      success: true,
      message: "학적 확인이 완료되었습니다. 안전한 분실물 찾기 이용을 환영합니다!",
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        studentNo: updatedUser.studentNo,
        studentNoMasked: updatedUser.studentNoMasked,
        role: updatedUser.role,
        status: updatedUser.status,
      },
    });
  } catch (error) {
    console.error("Onboarding error:", error);
    return NextResponse.json(
      { error: "온보딩 처리 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
