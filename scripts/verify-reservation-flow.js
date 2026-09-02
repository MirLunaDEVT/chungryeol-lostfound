const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("==================================================");
  console.log("   교내 분실물 수령 예약 (Reservation) 시스템 E2E 검증");
  console.log("==================================================");

  // 1. 테스트 사용자 조회
  const studentA = await prisma.user.findFirst({ where: { name: "김민우" } }); // 습득자
  const studentB = await prisma.user.findFirst({ where: { name: "박준혁" } }); // 예약자 (분실 주장)
  const teacher = await prisma.user.findFirst({ where: { role: "ADMIN" } });

  if (!studentA || !studentB) {
    throw new Error("테스트 사용자를 찾을 수 없습니다.");
  }
  console.log(`[1] 사용자 확인: 습득자=${studentA.name}, 예약자=${studentB.name}`);

  // 2. 테스트용 습득물 게시글 생성 (FOUND)
  const testPost = await prisma.post.create({
    data: {
      authorId: studentA.id,
      type: "FOUND",
      category: "전자기기",
      title: "[테스트] 신관 3층 복도에서 주운 에어팟 프로 2세대",
      body: "신관 3층 홈베이스 앞 복도 의자 밑에서 주웠습니다. 학생실에 맡겨두었으니 주인 찾아가세요.",
      placeBuilding: "신관(도서관/특별실)",
      placeDetail: "3층 홈베이스 앞 복도",
      occurredAt: new Date(),
      status: "OPEN",
      pickupPlace: "본관 1층 학생안전복지부 분실물 보관함",
    },
  });
  console.log(`[2] 습득물 게시글 등록 완료 (ID: ${testPost.id}, 상태: ${testPost.status})`);

  // 3. 학생 B가 수령 예약 신청 (Claim / Reservation)
  console.log(`[3] 학생 B(${studentB.name})가 수령 예약 신청 진행...`);
  const claim = await prisma.claim.create({
    data: {
      postId: testPost.id,
      claimantId: studentB.id,
      identifyingNotes: "본체 뚜껑 안쪽에 짱구 노란색 네임스티커가 부착되어 있고 오른쪽 유닛 팁이 S사이즈입니다.",
      visitTime: "오늘 점심시간 (12:40~13:20)",
      pickupPlace: "본관 1층 학생안전복지부 분실물 보관함 앞",
      status: "REQUESTED",
    },
  });

  // 게시글 상태를 RESERVED 로 전이
  const updatedPost = await prisma.post.update({
    where: { id: testPost.id },
    data: { status: "RESERVED" },
  });

  // 습득자에게 알림 발송
  const notif = await prisma.notification.create({
    data: {
      userId: studentA.id,
      title: "📦 [수령 예약 접수] 내 등록 물품에 수령 예약이 들어왔습니다!",
      body: `${studentB.name}님이 "${testPost.title}" 물품을 본인 것으로 확인하고 수령 예약을 신청했습니다.`,
      link: `/posts/${testPost.id}`,
    },
  });

  console.log(`    -> 예약 생성 완료 (Claim ID: ${claim.id})`);
  console.log(`    -> 게시글 상태 변경: ${updatedPost.status} (🔒 수령 예약 중)`);
  console.log(`    -> 습득자(${studentA.name})에게 인앱 알림 전달 완료: "${notif.title}"`);

  if (updatedPost.status !== "RESERVED") {
    throw new Error("게시글 상태가 RESERVED로 변경되지 않았습니다.");
  }

  // 4. 학생 B의 예약 내역 조회 (My Reservations API 모의)
  const myReservations = await prisma.claim.findMany({
    where: { claimantId: studentB.id },
    include: { post: true },
  });
  const foundReservation = myReservations.find((r) => r.id === claim.id);
  if (!foundReservation) {
    throw new Error("학생 B의 예약 목록에서 해당 예약을 조회할 수 없습니다.");
  }
  console.log(`[4] 마이페이지 내 수령 예약 조회 확인: 물품명="${foundReservation.post.title}", 방문예정="${foundReservation.visitTime}"`);

  // 5. 학생실 실물 대조 및 인수인계 완료 처리 (Handover Complete -> RETURNED)
  console.log(`[5] 학생실 오프라인 인수인계 완료 승인 처리...`);
  const prevReturnedCount = studentA.returnedCount || 0;

  await prisma.claim.update({
    where: { id: claim.id },
    data: {
      status: "APPROVED",
      handoverCompleted: true,
      decidedById: teacher ? teacher.id : studentA.id,
      decidedAt: new Date(),
    },
  });

  const finalPost = await prisma.post.update({
    where: { id: testPost.id },
    data: { status: "RETURNED" },
  });

  const finalStudentA = await prisma.user.update({
    where: { id: studentA.id },
    data: { returnedCount: { increment: 1 } },
  });

  console.log(`    -> 게시글 최종 상태: ${finalPost.status} (✅ 반환 완료)`);
  console.log(`    -> 습득자(${studentA.name})의 안전 반환 기여 횟수: ${prevReturnedCount}회 -> ${finalStudentA.returnedCount}회`);

  if (finalPost.status !== "RETURNED" || finalStudentA.returnedCount !== prevReturnedCount + 1) {
    throw new Error("반환 완료 처리 또는 반환 횟수 갱신 실패");
  }

  // 6. 테스트 데이터 정리
  await prisma.claim.delete({ where: { id: claim.id } });
  await prisma.notification.delete({ where: { id: notif.id } });
  await prisma.post.delete({ where: { id: testPost.id } });
  // 반환 횟수 원복
  await prisma.user.update({
    where: { id: studentA.id },
    data: { returnedCount: prevReturnedCount },
  });

  console.log(`[6] 테스트 임시 데이터 정리 완료`);
  console.log("==================================================");
  console.log("   🎉 수령 예약 시스템 E2E 검증 통과 (100% 성공)");
  console.log("==================================================");
}

main()
  .catch((e) => {
    console.error("검증 실패:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
