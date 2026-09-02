const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding SchoolFound Database...");

  // 1. 기존 데이터 정리
  await prisma.auditLog.deleteMany();
  await prisma.report.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.keywordAlert.deleteMany();
  await prisma.chatMessage.deleteMany();
  await prisma.chatParticipant.deleteMany();
  await prisma.chatRoom.deleteMany();
  await prisma.claim.deleteMany();
  await prisma.reaction.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.postImage.deleteMany();
  await prisma.post.deleteMany();
  await prisma.user.deleteMany();
  await prisma.rosterEntry.deleteMany();
  await prisma.schoolLockerItem.deleteMany();
  await prisma.bannedWord.deleteMany();

  // 2. 관리자 금칙어 생성
  const defaultBannedWords = [
    "시발", "씨발", "개새끼", "병신", "존나", "졸라", "새끼", "닥쳐", "미친",
    "조건만남", "담배", "술", "대리구매", "섹스", "야동", "카톡아이디", "오픈채팅", "토토"
  ];
  for (const word of defaultBannedWords) {
    await prisma.bannedWord.create({ data: { word } });
  }

  // 3. 비밀번호 공통 해시 생성 (초기 비밀번호: "1234")
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash("1234", salt);

  // 4. 재학생/교직원 마스터 명단(Roster) 생성
  const rosterData = [
    { studentNo: "T9901", name: "김교사", grade: null, classNo: null, role: "ADMIN" },
    { studentNo: "240101", name: "김민우", grade: 1, classNo: 2, role: "STUDENT" },
    { studentNo: "230205", name: "이지은", grade: 2, classNo: 3, role: "STUDENT" },
    { studentNo: "230212", name: "박준혁", grade: 2, classNo: 3, role: "STUDENT" },
    { studentNo: "220115", name: "최수아", grade: 3, classNo: 1, role: "STUDENT" },
    { studentNo: "240102", name: "정서윤", grade: 1, classNo: 1, role: "STUDENT" }, // 아직 미연동 학생
  ];

  for (const r of rosterData) {
    await prisma.rosterEntry.create({
      data: {
        studentNo: r.studentNo,
        name: r.name,
        grade: r.grade,
        classNo: r.classNo,
        role: r.role,
        enrolled: true,
        activatedAt: r.studentNo !== "240102" ? new Date() : null,
      },
    });
  }

  // 5. 활성화된 유저 생성 (교사 1명, 학생 4명)
  const teacherUser = await prisma.user.create({
    data: {
      studentNo: "T9901",
      studentNoMasked: "교직원",
      name: "김교사",
      email: "teacher@school.hs.kr",
      role: "ADMIN",
      status: "ACTIVE",
      passwordHash,
      returnedCount: 15,
      warningCount: 0,
    },
  });

  const student1 = await prisma.user.create({
    data: {
      studentNo: "240101",
      studentNoMasked: "2401**",
      name: "김민우",
      email: "240101@student.school.hs.kr",
      grade: 1,
      classNo: 2,
      role: "STUDENT",
      status: "ACTIVE",
      passwordHash,
      returnedCount: 3,
      warningCount: 0,
    },
  });

  const student2 = await prisma.user.create({
    data: {
      studentNo: "230205",
      studentNoMasked: "2302**",
      name: "이지은",
      email: "230205@student.school.hs.kr",
      grade: 2,
      classNo: 3,
      role: "STUDENT",
      status: "ACTIVE",
      passwordHash,
      returnedCount: 1,
      warningCount: 0,
    },
  });

  const student3 = await prisma.user.create({
    data: {
      studentNo: "230212",
      studentNoMasked: "2302**",
      name: "박준혁",
      email: "230212@student.school.hs.kr",
      grade: 2,
      classNo: 3,
      role: "STUDENT",
      status: "ACTIVE",
      passwordHash,
      returnedCount: 0,
      warningCount: 0,
    },
  });

  const student4 = await prisma.user.create({
    data: {
      studentNo: "220115",
      studentNoMasked: "2201**",
      name: "최수아",
      email: "220115@student.school.hs.kr",
      grade: 3,
      classNo: 1,
      role: "STUDENT",
      status: "ACTIVE",
      passwordHash,
      returnedCount: 2,
      warningCount: 0,
    },
  });

  // 6. 분실물 보관함 (학생실 실물 수납 등록 현황)
  await prisma.schoolLockerItem.createMany({
    data: [
      {
        lockerCode: "L-01",
        itemSummary: "삼성 갤럭시 버즈2 (보라색 케이스, 학생안전복지부 보관 중)",
        managedBy: "김교사",
        isReturned: false,
      },
      {
        lockerCode: "L-02",
        itemSummary: "검정색 3단 우산 (노란 손잡이)",
        managedBy: "김교사",
        isReturned: false,
      },
      {
        lockerCode: "L-03",
        itemSummary: "2025 수능특강 영어영역 교재 (2학년 3반 앞 수거)",
        managedBy: "김교사",
        isReturned: true,
        returnDate: new Date(),
      },
    ],
  });

  // 7. 분실/습득/공지/커뮤니티 게시글 8개 생성
  // 글 1: [NOTICE] 교사 공지
  const noticePost = await prisma.post.create({
    data: {
      authorId: teacherUser.id,
      type: "NOTICE",
      category: "기타",
      title: "📢 [공지] 1학기 분실물 정기 수합 및 반환 절차 안내",
      body: "충렬고 학생안전복지부(본관 1층)에서 안내드립니다. 교내에서 주운 물건은 사진을 찍어 분실물 찾기 사이트에 등록 후, 즉시 학생실 분실물 보관함(L-01~10)으로 전달해 주시기 바랍니다. 모든 수령은 본인 확인 절차(고유 특징 진술) 후 안전하게 진행됩니다.",
      placeBuilding: "본관",
      placeDetail: "1층 학생안전복지부",
      occurredAt: new Date(Date.now() - 3600 * 1000 * 24),
      status: "OPEN",
      isPinned: true,
      viewCount: 142,
    },
  });

  // 글 2: [FOUND] 에어팟 프로 2세대 본체 습득 (인기글)
  const postFoundAirpods = await prisma.post.create({
    data: {
      authorId: student1.id,
      type: "FOUND",
      category: "전자기기",
      title: "신관 3층 컴퓨터실 앞 에어팟 프로 본체 주웠어요",
      body: "3층 복도 정수기 옆 바닥에 떨어져 있었습니다. 흰색 기본 케이스에 작은 키링이 달려있습니다. 키링 종류와 본체 뚜껑 안쪽 특징을 말씀해주시면 본관 1층 학생실에서 전달하겠습니다.",
      placeBuilding: "신관(도서관/특별실)",
      placeDetail: "3층 컴퓨터실 앞 정수기 부근",
      occurredAt: new Date(Date.now() - 3600 * 1000 * 2),
      status: "OPEN",
      viewCount: 68,
      tags: JSON.stringify(["에어팟", "애플", "화이트", "이어폰"]),
      images: {
        create: [
          {
            url: "/uploads/sample_airpods.jpg",
            order: 0,
          },
        ],
      },
    },
  });

  // 글 3: [LOST] 에어팟 본체 분실 (유사 글 매칭용)
  const postLostAirpods = await prisma.post.create({
    data: {
      authorId: student2.id,
      type: "LOST",
      category: "전자기기",
      title: "오늘 점심시간에 에어팟 본체 잃어버렸습니다 ㅠㅠ",
      body: "신관 쪽 이동수업 다녀오다가 주머니에서 빠진 것 같아요. 본체 케이스에 시나모롤 스티커가 붙어있습니다. 보신 분 꼭 댓글이나 채팅 부탁드립니다!",
      placeBuilding: "신관(도서관/특별실)",
      placeDetail: "2층에서 3층 올라가는 계단 또는 복도",
      occurredAt: new Date(Date.now() - 3600 * 1000 * 3),
      status: "OPEN",
      viewCount: 45,
      tags: JSON.stringify(["에어팟", "시나모롤", "전자기기"]),
      images: {
        create: [
          {
            url: "/uploads/sample_airpods_lost.jpg",
            order: 0,
          },
        ],
      },
    },
  });

  // 글 4: [FOUND] 2학년 학생증 습득
  const postFoundCard = await prisma.post.create({
    data: {
      authorId: student3.id,
      type: "FOUND",
      category: "학생증/출입증",
      title: "급식실 퇴식구 근처에서 2학년 학생증 주웠습니다",
      body: "개인정보 보호를 위해 이름은 가리고 올립니다. 2학년 3반 학생증이고, 분실물 보관함에 맡겨두었습니다. 학생실 오셔서 본인 확인 후 찾아가세요.",
      placeBuilding: "급식동(식당)",
      placeDetail: "1층 식당 퇴식구 수저통 옆",
      occurredAt: new Date(Date.now() - 3600 * 1000 * 5),
      status: "OPEN",
      viewCount: 33,
      tags: JSON.stringify(["학생증", "카드", "급식실"]),
      images: {
        create: [
          {
            url: "/uploads/sample_student_card.jpg",
            order: 0,
          },
        ],
      },
    },
  });

  // 글 5: [LOST] 체육복 상의 분실
  await prisma.post.create({
    data: {
      authorId: student4.id,
      type: "LOST",
      category: "의류/모자",
      title: "체육관 2층 스탠드에 남색 체육복 상의(100호) 두고 온 것 같습니다",
      body: "어제 5교시 체육 수업 끝나고 깜빡했습니다. 목 깃 안쪽에 이름 텍에 '최'라고 작게 적혀있어요.",
      placeBuilding: "체육관/강당",
      placeDetail: "2층 스탠드 맨 뒷줄",
      occurredAt: new Date(Date.now() - 3600 * 1000 * 20),
      status: "OPEN",
      viewCount: 19,
      tags: JSON.stringify(["체육복", "남색", "100호"]),
      images: {
        create: [
          {
            url: "/uploads/sample_uniform.jpg",
            order: 0,
          },
        ],
      },
    },
  });

  // 글 6: [FOUND] 써모스 민트색 텀블러 습득 (수령 신청 진행 중)
  const postFoundTumbler = await prisma.post.create({
    data: {
      authorId: student1.id,
      type: "FOUND",
      category: "텀블러/식기",
      title: "도서관 1층 열람실 12번 책상에 민트색 텀블러 주웠어요",
      body: "500ml 크기 써모스 텀블러입니다. 뚜껑 색상이랑 바닥면 스크래치 여부로 본인 확인하겠습니다.",
      placeBuilding: "신관(도서관/특별실)",
      placeDetail: "1층 열람실 12번 좌석",
      occurredAt: new Date(Date.now() - 3600 * 1000 * 8),
      status: "CLAIM_PENDING",
      viewCount: 51,
      tags: JSON.stringify(["텀블러", "써모스", "민트색"]),
      images: {
        create: [
          {
            url: "/uploads/sample_tumbler.jpg",
            order: 0,
          },
        ],
      },
    },
  });

  // 글 7: [FOUND] 검정 뿔테 안경 (반환 완료 상태 샘플)
  const postReturnedGlasses = await prisma.post.create({
    data: {
      authorId: student2.id,
      type: "FOUND",
      category: "안경",
      title: "운동장 벤치에서 검정 뿔테 안경 주웠습니다",
      body: "안경다리 안쪽에 골드 포인트가 있는 안경입니다. 학생실에서 주인 확인 후 잘 돌려드렸습니다!",
      placeBuilding: "운동장/스탠드",
      placeDetail: "축구골대 뒤 벤치",
      occurredAt: new Date(Date.now() - 3600 * 1000 * 48),
      status: "RETURNED",
      viewCount: 92,
      tags: JSON.stringify(["안경", "검정뿔테"]),
      images: {
        create: [
          {
            url: "/uploads/sample_glasses.jpg",
            order: 0,
          },
        ],
      },
    },
  });

  // 글 8: [COMMUNITY] 목격 제보 커뮤니티 글
  const postCommunity = await prisma.post.create({
    data: {
      authorId: student4.id,
      type: "COMMUNITY",
      category: "기타",
      title: "오늘 본관 2층 홈베이스 사물함 위에 필통 하나 덩그러니 놓여있네요",
      body: "빨간색 체크무늬 필통인데 주인이 안 와서 그냥 두고 왔어요. 잃어버리신 분 빨리 가보세요!",
      placeBuilding: "본관",
      placeDetail: "2층 홈베이스 사물함 위",
      occurredAt: new Date(Date.now() - 3600 * 1000 * 1),
      status: "OPEN",
      viewCount: 27,
      tags: JSON.stringify(["필통", "제보", "홈베이스"]),
      images: {
        create: [
          {
            url: "/uploads/sample_pencil_case.jpg",
            order: 0,
          },
        ],
      },
    },
  });

  // 8. 텀블러 글에 대한 수령 신청(Claim) 샘플
  await prisma.claim.create({
    data: {
      postId: postFoundTumbler.id,
      claimantId: student3.id,
      status: "REQUESTED",
      identifyingNotes: "뚜껑은 베이지색이고 바닥에 작은 찌그러짐이 있습니다. 지난주 금요일에 도서관 갔다가 두고 왔습니다.",
      adminNote: "1학년 2반 김민우 학생에게 확인 요청 알림 전달됨",
    },
  });

  // 9. 댓글 및 목격 제보 샘플
  await prisma.comment.create({
    data: {
      postId: postFoundAirpods.id,
      authorId: student2.id,
      content: "혹시 본체 뒤에 페어링 버튼 쪽에 스크래치 살짝 나있나요? 제 것 같은데 수령 신청 넣었습니다!",
      isSighting: false,
    },
  });

  await prisma.comment.create({
    data: {
      postId: postLostAirpods.id,
      authorId: student1.id,
      content: "방금 신관 3층 컴퓨터실 앞에서 본체 주워서 글 올렸어요! 확인해보세요!",
      isSighting: true, // 목격/제보 댓글
    },
  });

  // 10. 반응 (도움돼요)
  await prisma.reaction.create({
    data: {
      postId: postFoundAirpods.id,
      userId: student2.id,
      type: "HELPFUL",
    },
  });

  // 11. 키워드 알림 구독 샘플
  await prisma.keywordAlert.create({
    data: {
      userId: student2.id,
      keyword: "에어팟",
    },
  });
  await prisma.keywordAlert.create({
    data: {
      userId: student3.id,
      keyword: "텀블러",
    },
  });

  // 12. 인앱 알림 샘플
  await prisma.notification.create({
    data: {
      userId: student2.id,
      title: "💬 새 댓글 알림",
      body: "김민우님이 내 분실물 글에 목격 제보 댓글을 남겼습니다.",
      link: `/posts/${postLostAirpods.id}`,
    },
  });

  // 13. 관리자 신고 큐 샘플 (장난글 신고 1건)
  await prisma.report.create({
    data: {
      reporterId: student4.id,
      targetType: "POST",
      postId: postCommunity.id,
      reason: "장난글/허위게시 의심",
      details: "사물함 위에 있는 물건인데 이미 주인이 찾아갔는지 확인이 필요합니다.",
      status: "PENDING",
    },
  });

  // 14. 초기 보안 감사 로그
  await prisma.auditLog.create({
    data: {
      userId: teacherUser.id,
      action: "ROSTER_UPLOADED",
      details: JSON.stringify({ count: rosterData.length, school: "충렬고등학교" }),
    },
  });

  console.log("✅ Seeding complete! 1 teacher, 4 active students, 8 posts, 1 claim, 1 report, 3 lockers created.");
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
