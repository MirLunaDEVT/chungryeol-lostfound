import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Papa from "papaparse";
import { createAuditLog } from "@/lib/audit";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "관리자 권한이 필요합니다." }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") || "";

    const rosterList = await prisma.rosterEntry.findMany({
      where: q
        ? {
            OR: [
              { studentNo: { contains: q } },
              { name: { contains: q } },
            ],
          }
        : undefined,
      orderBy: [{ grade: "asc" }, { classNo: "asc" }, { studentNo: "asc" }],
    });

    const studentNos = rosterList.map((r) => r.studentNo);
    const users = await prisma.user.findMany({
      where: { studentNo: { in: studentNos } },
      select: { id: true, studentNo: true, status: true, email: true },
    });
    const userMap = new Map(users.map((u) => [u.studentNo, u]));

    const roster = rosterList.map((r) => ({
      ...r,
      user: userMap.get(r.studentNo) || null,
    }));

    return NextResponse.json({ roster });
  } catch (error) {
    console.error("Roster GET error:", error);
    return NextResponse.json(
      { error: "재학생 명단을 불러오지 못했습니다." },
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

    const { csvText, entries } = await req.json();

    let itemsToProcess: Array<{
      studentNo: string;
      name: string;
      grade?: number | null;
      classNo?: number | null;
      role?: string;
    }> = [];

    if (csvText) {
      const parsed = Papa.parse(csvText.trim(), {
        header: true,
        skipEmptyLines: true,
      });

      itemsToProcess = (parsed.data as any[]).map((row) => ({
        studentNo: String(row.studentNo || row["학번"] || "").trim(),
        name: String(row.name || row["이름"] || "").trim(),
        grade: row.grade || row["학년"] ? Number(row.grade || row["학년"]) : null,
        classNo: row.classNo || row["반"] ? Number(row.classNo || row["반"]) : null,
        role: (row.role || row["역할"] || "STUDENT").toUpperCase(),
      }));
    } else if (Array.isArray(entries)) {
      itemsToProcess = entries;
    }

    if (itemsToProcess.length === 0) {
      return NextResponse.json({ error: "유효한 데이터가 없습니다." }, { status: 400 });
    }

    let successCount = 0;
    for (const item of itemsToProcess) {
      if (!item.studentNo || !item.name) continue;

      await prisma.rosterEntry.upsert({
        where: { studentNo: item.studentNo },
        update: {
          name: item.name,
          grade: item.grade || null,
          classNo: item.classNo || null,
          role: item.role === "TEACHER" || item.role === "ADMIN" ? item.role : "STUDENT",
          enrolled: true,
        },
        create: {
          studentNo: item.studentNo,
          name: item.name,
          grade: item.grade || null,
          classNo: item.classNo || null,
          role: item.role === "TEACHER" || item.role === "ADMIN" ? item.role : "STUDENT",
          enrolled: true,
        },
      });
      successCount++;
    }

    await createAuditLog({
      userId: session.user.id,
      action: "ROSTER_UPLOADED",
      details: { processedCount: successCount },
    });

    return NextResponse.json({
      success: true,
      message: `성공적으로 ${successCount}명의 명단이 동기화되었습니다.`,
    });
  } catch (error) {
    console.error("Roster POST error:", error);
    return NextResponse.json(
      { error: "명단 처리 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

// 재학/재직 상태 토글 (졸업/전학 처리)
export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "관리자 권한이 필요합니다." }, { status: 403 });
    }

    const { id, enrolled } = await req.json();

    const updated = await prisma.rosterEntry.update({
      where: { id },
      data: { enrolled: !!enrolled },
    });

    // 만약 졸업/전학(false)으로 변경 시, 연결된 User 계정도 비활성화 처리
    if (!enrolled) {
      await prisma.user.updateMany({
        where: { studentNo: updated.studentNo },
        data: {
          status: "GRADUATED",
          suspendedReason: "명단 제외 (졸업 또는 전학)",
        },
      });
    } else {
      await prisma.user.updateMany({
        where: { studentNo: updated.studentNo },
        data: { status: "ACTIVE", suspendedReason: null },
      });
    }

    await createAuditLog({
      userId: session.user.id,
      action: "ROSTER_ENROLLMENT_TOGGLED",
      details: { studentNo: updated.studentNo, enrolled },
    });

    return NextResponse.json({ success: true, entry: updated });
  } catch (error) {
    console.error("Roster PATCH error:", error);
    return NextResponse.json(
      { error: "상태 변경 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
