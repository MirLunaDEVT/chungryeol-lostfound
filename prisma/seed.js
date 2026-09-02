const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Initializing Clean Production Database for 충렬고등학교...");

  // 1. 기존 데이터 정리
  await prisma.auditLog.deleteMany();
  await prisma.report.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.keywordAlert.deleteMany();
  await prisma.claim.deleteMany();
  await prisma.reaction.deleteMany();
  await prisma.postImage.deleteMany();
  await prisma.post.deleteMany();
  await prisma.user.deleteMany();
  await prisma.rosterEntry.deleteMany();
  await prisma.schoolLockerItem.deleteMany();
  await prisma.bannedWord.deleteMany();

  // 2. 관리자 금칙어 사전 생성
  const defaultBannedWords = [
    "시발", "씨발", "개새끼", "병신", "존나", "졸라", "새끼", "닥쳐", "미친",
    "조건만남", "담배", "술", "대리구매", "섹스", "야동", "카톡아이디", "오픈채팅", "토토"
  ];
  for (const word of defaultBannedWords) {
    await prisma.bannedWord.create({ data: { word } });
  }

  // 3. 비밀번호 공통 해시 생성 (초기 관리자 임시 비밀번호: "1234")
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash("1234", salt);

  // 4. 시스템 마스터 관리자(교직원) 학적 등록
  await prisma.rosterEntry.create({
    data: {
      studentNo: "T9901",
      name: "관리교사",
      grade: null,
      classNo: null,
      role: "ADMIN",
      enrolled: true,
      activatedAt: new Date(),
    },
  });

  // 5. 마스터 관리자 활성화 유저 생성
  await prisma.user.create({
    data: {
      studentNo: "T9901",
      studentNoMasked: "교직원",
      name: "관리교사",
      email: "teacher@pscr.hs.kr",
      role: "ADMIN",
      status: "ACTIVE",
      passwordHash,
      returnedCount: 0,
      warningCount: 0,
    },
  });

  console.log("✅ Production Database Initialized cleanly! 0 posts, 0 sample students, 1 master admin created.");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
