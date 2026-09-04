import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req: Request) {
  try {

    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "업로드할 파일이 없습니다." }, { status: 400 });
    }

    // 1. MIME 타입 검증 (실행 파일, 스크립트 등 악성코드 원천 차단)
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "JPG, PNG, WebP 이미지 파일만 업로드할 수 있습니다." },
        { status: 400 }
      );
    }

    // 2. 용량 제한 (최대 5MB)
    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "사진 용량은 최대 5MB 이하만 가능합니다." },
        { status: 400 }
      );
    }

    // 3. Vercel 서버리스(읽기 전용 파일시스템) 호환 Base64 Data URL 변환
    // 클라이언트에서 1200px 80%로 이미 최적화 압축되었으므로, DB에 안전하고 영구적으로 보존됩니다.
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const mimeType = file.type || "image/jpeg";
    const fileUrl = `data:${mimeType};base64,${buffer.toString("base64")}`;

    return NextResponse.json({ success: true, url: fileUrl });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "파일 업로드 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
