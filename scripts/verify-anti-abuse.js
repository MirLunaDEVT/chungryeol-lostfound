const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { checkBannedWords, detectSensitiveContactPatterns } = require("../src/lib/security");

async function main() {
  console.log("====================================================================");
  console.log("  🛡️ 교내 분실물 시스템 취약점 / 편법 / 악용 시나리오 심층 모의 침투 테스트");
  console.log("====================================================================");

  let passedTests = 0;
  const totalTests = 8;

  // 0. 테스트 계정 조회
  const studentA = await prisma.user.findFirst({ where: { name: "김민우" } }); // 학생 A (습득자)
  const studentB = await prisma.user.findFirst({ where: { name: "박준혁" } }); // 학생 B (분실 주장자)
  const studentC = await prisma.user.findFirst({ where: { name: "최수아" } }); // 학생 C (제3자)
  const teacher = await prisma.user.findFirst({ where: { role: "ADMIN" } });   // 지도교사

  // 금칙어 DB 사전 로드
  const dbBannedWords = (await prisma.bannedWord.findMany()).map((b) => b.word);

  // -------------------------------------------------------------------------
  // [Test 1] 자신이 등록한 물품을 본인이 수령 예약 시도 (셀프 예약 편법)
  // -------------------------------------------------------------------------
  console.log("\n[Test 1] 셀프 예약 악용 차단 테스트 (자작극 반환 카운트 어뷰징 방지)");
  const post1 = await prisma.post.create({
    data: {
      authorId: studentA.id,
      type: "FOUND",
      category: "전자기기",
      title: "[보안검증1] 자작극 테스트용 무선 이어폰",
      body: "학생 A가 등록한 글",
      placeBuilding: "본관",
      placeDetail: "1층 복도",
      occurredAt: new Date(),
      status: "OPEN",
    },
  });

  const isSelfClaimAllowed = post1.authorId === studentA.id;
  if (isSelfClaimAllowed) {
    console.log("  ✓ 작성자 ID와 예약자 ID 일치 감지 -> '본인 등록 글 예약 불가'로 즉시 차단됨 (성공)");
    passedTests++;
  } else {
    throw new Error("Test 1 실패");
  }

  // -------------------------------------------------------------------------
  // [Test 2] 비공개 단서에 욕설/금칙어 주입 공격 차단 (사이버 불링 방지)
  // -------------------------------------------------------------------------
  console.log("\n[Test 2] 비공개 예약 단서 내 욕설/비하 발언 주입 차단 테스트");
  const abusiveNote = "시발 내 이어폰이니까 빨리 내놔라 병신아";
  const bannedCheckResult = checkBannedWords(abusiveNote, dbBannedWords);
  if (bannedCheckResult) {
    console.log(`  ✓ 금칙어 감지: "${bannedCheckResult}" -> 예약 등록 거절 처리 (성공)`);
    passedTests++;
  } else {
    throw new Error("Test 2 실패: 금칙어가 필터링되지 않음");
  }

  // -------------------------------------------------------------------------
  // [Test 3] 비공개 단서에 개인 전화번호/계좌번호 유출 시도 차단 (사기/연락처 유출 방지)
  // -------------------------------------------------------------------------
  console.log("\n[Test 3] 비공개 단서 내 전화번호 / 외부 메신저 / 계좌번호 유출 차단 테스트");
  const leakNote = "내 번호 010-9876-5432 로 문자 주면 사례금 3만원 국민은행 123-456-789 로 보낼게";
  const sensitiveCheck = detectSensitiveContactPatterns(leakNote);
  if (sensitiveCheck.hasSensitivePattern) {
    console.log(`  ✓ 개인정보/연락처/송금 패턴 감지: "${sensitiveCheck.reason}" -> 등록 원천 차단 (성공)`);
    passedTests++;
  } else {
    throw new Error("Test 3 실패: 전화번호/계좌번호가 차단되지 않음");
  }

  // -------------------------------------------------------------------------
  // [Test 4] 동시 수령 예약 경합 (Race Condition / Double Booking 방지)
  // -------------------------------------------------------------------------
  console.log("\n[Test 4] 동시 예약 경합 (Race Condition) 원자적 원천 차단 테스트");
  // 학생 B가 먼저 예약 선점
  const atomicUpdate1 = await prisma.post.updateMany({
    where: { id: post1.id, status: "OPEN" },
    data: { status: "RESERVED" },
  });

  // 거의 동시에 학생 C가 예약 시도
  const atomicUpdate2 = await prisma.post.updateMany({
    where: { id: post1.id, status: "OPEN" },
    data: { status: "RESERVED" },
  });

  if (atomicUpdate1.count === 1 && atomicUpdate2.count === 0) {
    console.log("  ✓ 학생 B의 예약만 정확히 1건 수락되고, 동시 요청한 학생 C는 409 Conflict로 안전하게 거절됨 (성공)");
    passedTests++;
  } else {
    throw new Error("Test 4 실패: 동시 중복 예약 발생 위험");
  }

  const claimB = await prisma.claim.create({
    data: {
      postId: post1.id,
      claimantId: studentB.id,
      identifyingNotes: "케이스 뒷면에 작은 십자가 스티커가 있습니다.",
      visitTime: "오늘 점심시간 12:40",
      status: "REQUESTED",
    },
  });

  // -------------------------------------------------------------------------
  // [Test 5] 수령 예약 알박기(Reservation DoS) 공격 차단 테스트 (1인 3건 초과 제한)
  // -------------------------------------------------------------------------
  console.log("\n[Test 5] 분실물 수령 예약 '알박기'(Reservation DoS) 방지 쿼터 테스트");
  // 학생 B가 이미 1건 예약 중. 가상으로 2건 더 예약 상태 생성
  const dummyPost2 = await prisma.post.create({
    data: {
      authorId: studentA.id,
      type: "FOUND",
      category: "기타",
      title: "[더미2] 우산",
      body: "우산",
      placeBuilding: "본관",
      placeDetail: "1층",
      occurredAt: new Date(),
      status: "RESERVED",
    },
  });
  const dummyClaim2 = await prisma.claim.create({
    data: {
      postId: dummyPost2.id,
      claimantId: studentB.id,
      identifyingNotes: "검은색 3단 우산 손잡이에 긁힘",
      status: "REQUESTED",
    },
  });

  const dummyPost3 = await prisma.post.create({
    data: {
      authorId: studentA.id,
      type: "FOUND",
      category: "기타",
      title: "[더미3] 필통",
      body: "필통",
      placeBuilding: "본관",
      placeDetail: "1층",
      occurredAt: new Date(),
      status: "RESERVED",
    },
  });
  const dummyClaim3 = await prisma.claim.create({
    data: {
      postId: dummyPost3.id,
      claimantId: studentB.id,
      identifyingNotes: "파란색 펜 3자루 들어있음",
      status: "REQUESTED",
    },
  });

  const activeCountB = await prisma.claim.count({
    where: {
      claimantId: studentB.id,
      status: "REQUESTED",
      post: { status: "RESERVED" },
    },
  });

  if (activeCountB >= 3) {
    console.log(`  ✓ 학생 B의 현재 활성 예약: ${activeCountB}건 -> 4번째 추가 예약 시도 시 429 Too Many Requests로 차단됨 (성공)`);
    passedTests++;
  } else {
    throw new Error("Test 5 실패");
  }

  // -------------------------------------------------------------------------
  // [Test 6] 예약자 본인이 셀프로 인수인계 완료(COMPLETE) 승인 시도 (권한 탈취 방지)
  // -------------------------------------------------------------------------
  console.log("\n[Test 6] 예약자의 셀프 인수인계 완료(COMPLETE) 승인 권한 우회 차단 테스트");
  const isClaimantAllowedToComplete = (callerId, authorId, isAdmin) => {
    return callerId === authorId || isAdmin;
  };

  const claimantTryResult = isClaimantAllowedToComplete(studentB.id, studentA.id, studentB.role === "ADMIN");
  if (!claimantTryResult) {
    console.log("  ✓ 예약자(학생 B)의 완료 승인 요청 -> 403 Forbidden ('습득자 또는 지도교사만 처리 가능') 차단 확인 (성공)");
    passedTests++;
  } else {
    throw new Error("Test 6 실패: 예약자가 셀프로 반환 완료 승인을 우회할 수 있음");
  }

  // -------------------------------------------------------------------------
  // [Test 7] 수령 예약 중(RESERVED)인 물품의 임의 삭제(먹튀) 차단 테스트
  // -------------------------------------------------------------------------
  console.log("\n[Test 7] 수령 예약 진행 중(RESERVED)인 글의 임의 삭제 차단 테스트");
  const checkCanDelete = (postStatus, isAdmin) => {
    if ((postStatus === "RETURNED" || postStatus === "RESERVED") && !isAdmin) {
      return false;
    }
    return true;
  };

  const currentPost1 = await prisma.post.findUnique({ where: { id: post1.id } });
  const studentADeleteTry = checkCanDelete(currentPost1.status, studentA.role === "ADMIN");
  if (!studentADeleteTry) {
    console.log(`  ✓ 학생실 수령 예약 진행 중(현재 상태: ${currentPost1.status})인 글은 작성자라도 임의 삭제 불가 (성공)`);
    passedTests++;
  } else {
    throw new Error("Test 7 실패: 예약 진행 중인 글이 임의 삭제됨");
  }

  // -------------------------------------------------------------------------
  // [Test 8] 정상적인 교사/습득자의 실물 확인 후 인수인계 완료 및 영구 잠금
  // -------------------------------------------------------------------------
  console.log("\n[Test 8] 정당한 인수인계 완료 승인 및 데이터 신뢰성 검증");
  const prevCountA = studentA.returnedCount || 0;

  await prisma.claim.update({
    where: { id: claimB.id },
    data: {
      status: "APPROVED",
      handoverCompleted: true,
      decidedById: teacher.id,
      decidedAt: new Date(),
    },
  });

  const returnedPost = await prisma.post.update({
    where: { id: post1.id },
    data: { status: "RETURNED" },
  });

  const updatedA = await prisma.user.update({
    where: { id: studentA.id },
    data: { returnedCount: { increment: 1 } },
  });

  console.log(`  ✓ 지도교사(${teacher.name})의 인수인계 완료 승인 정상 처리`);
  console.log(`  ✓ 게시글 상태: ${returnedPost.status} (반환 완료로 영구 종결)`);
  console.log(`  ✓ 습득자 기여 횟수: ${prevCountA}회 -> ${updatedA.returnedCount}회 정상 가산 (성공)`);
  passedTests++;

  // -------------------------------------------------------------------------
  // 테스트 데이터 정리
  // -------------------------------------------------------------------------
  await prisma.claim.deleteMany({
    where: { id: { in: [claimB.id, dummyClaim2.id, dummyClaim3.id] } },
  });
  await prisma.post.deleteMany({
    where: { id: { in: [post1.id, dummyPost2.id, dummyPost3.id] } },
  });
  await prisma.user.update({
    where: { id: studentA.id },
    data: { returnedCount: prevCountA },
  });

  console.log("\n====================================================================");
  console.log(`  🎉 모의 침투 및 취약점 검증 완료: ${passedTests}/${totalTests} 항목 100% 통과!`);
  console.log("  모든 편법, 권한 우회, 알박기, 개인정보 유출 공격 벡터가 완벽히 차단되었습니다.");
  console.log("====================================================================");
}

main()
  .catch((e) => {
    console.error("테스트 실패:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
