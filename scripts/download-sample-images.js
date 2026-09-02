const fs = require("fs");
const path = require("path");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const UPLOADS_DIR = path.join(process.cwd(), "public", "uploads");

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const SAMPLE_IMAGES = [
  {
    filename: "sample_airpods.jpg",
    url: "https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?w=600&auto=format&fit=crop&q=80",
  },
  {
    filename: "sample_airpods_lost.jpg",
    url: "https://images.unsplash.com/photo-1572569511254-d8f925fe2cbb?w=600&auto=format&fit=crop&q=80",
  },
  {
    filename: "sample_student_card.jpg",
    url: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=600&auto=format&fit=crop&q=80",
  },
  {
    filename: "sample_uniform.jpg",
    url: "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=600&auto=format&fit=crop&q=80",
  },
  {
    filename: "sample_tumbler.jpg",
    url: "https://images.unsplash.com/photo-1517256064527-09c73fc73e38?w=600&auto=format&fit=crop&q=80",
  },
  {
    filename: "sample_glasses.jpg",
    url: "https://images.unsplash.com/photo-1591076482161-42ce6da69f67?w=600&auto=format&fit=crop&q=80",
  },
  {
    filename: "sample_pencil_case.jpg",
    url: "https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?w=600&auto=format&fit=crop&q=80",
  },
];

async function main() {
  console.log("📥 샘플 이미지 로컬 다운로드 및 저장 중...");

  for (const item of SAMPLE_IMAGES) {
    const dest = path.join(UPLOADS_DIR, item.filename);
    try {
      const res = await fetch(item.url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const arrayBuffer = await res.arrayBuffer();
      fs.writeFileSync(dest, Buffer.from(arrayBuffer));
      console.log(`✅ 저장 완료: /uploads/${item.filename} (${(arrayBuffer.byteLength / 1024).toFixed(1)} KB)`);
    } catch (err) {
      console.error(`❌ 다운로드 실패 (${item.filename}):`, err.message);
    }
  }

  // 시뮬레이션으로 생성되었던 중복 테스트 게시글 삭제
  console.log("\n🧹 시뮬레이션 중복 테스트 게시글 정리 중...");
  const deleteResult = await prisma.post.deleteMany({
    where: {
      title: "신관 도서관 2층에서 에어팟 프로 습득했습니다",
    },
  });
  console.log(`🗑️ 삭제된 임시 테스트 글: ${deleteResult.count}건`);

  // 기존 글들의 이미지 경로를 안정적인 로컬 /uploads 경로로 업데이트
  console.log("\n🔄 기존 게시글 이미지 경로를 로컬 /uploads 경로로 업데이트...");
  const updates = [
    { titleSubstring: "컴퓨터실 앞 에어팟", localUrl: "/uploads/sample_airpods.jpg" },
    { titleSubstring: "점심시간에 에어팟", localUrl: "/uploads/sample_airpods_lost.jpg" },
    { titleSubstring: "학생증", localUrl: "/uploads/sample_student_card.jpg" },
    { titleSubstring: "체육복", localUrl: "/uploads/sample_uniform.jpg" },
    { titleSubstring: "텀블러", localUrl: "/uploads/sample_tumbler.jpg" },
    { titleSubstring: "안경", localUrl: "/uploads/sample_glasses.jpg" },
    { titleSubstring: "필통", localUrl: "/uploads/sample_pencil_case.jpg" },
  ];

  for (const u of updates) {
    const post = await prisma.post.findFirst({
      where: { title: { contains: u.titleSubstring } },
      include: { images: true },
    });

    if (post && post.images.length > 0) {
      await prisma.postImage.update({
        where: { id: post.images[0].id },
        data: { url: u.localUrl },
      });
      console.log(`   [업데이트] "${post.title.slice(0, 20)}..." -> ${u.localUrl}`);
    }
  }

  console.log("\n✨ 모든 예시 이미지 로컬 저장 및 DB 동기화 완료!");
}

main()
  .catch((e) => console.error("Error:", e))
  .finally(async () => {
    await prisma.$disconnect();
  });
