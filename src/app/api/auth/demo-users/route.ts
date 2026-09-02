import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        studentNo: true,
        studentNoMasked: true,
        grade: true,
        classNo: true,
        role: true,
        email: true,
        status: true,
        returnedCount: true,
      },
      orderBy: [{ role: "desc" }, { studentNo: "asc" }],
    });

    return NextResponse.json({ users });
  } catch (error) {
    console.error("Failed to fetch demo users:", error);
    return NextResponse.json(
      { error: "사용자 목록을 불러오지 못했습니다." },
      { status: 500 }
    );
  }
}
