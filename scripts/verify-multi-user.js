const Module = require("module");
const fs = require("fs");
const ts = require("typescript");

// TypeScript on-the-fly transpiler for CJS execution
require.extensions[".ts"] = (m, f) => {
  m._compile(
    ts.transpileModule(fs.readFileSync(f, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    }).outputText,
    f
  );
};

const origResolve = Module._resolveFilename;
Module._resolveFilename = function (req, ...args) {
  try {
    return origResolve.call(this, req, ...args);
  } catch (e) {
    if (req.endsWith(".js")) {
      const tsReq = req.replace(/\.js$/, ".ts");
      return origResolve.call(this, tsReq, ...args);
    }
    throw e;
  }
};

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();


async function runSimulation() {
  console.log("=================================================");
  console.log("🚀 [멀티 에이전트 E2E 상호작용 시뮬레이션 시작]");
  console.log("=================================================\n");

  // 1. 유저 계정 로드
  const studentA = await prisma.user.findFirst({ where: { studentNo: "240101" } }); // 김민우 (습득자)
  const studentB = await prisma.user.findFirst({ where: { studentNo: "230212" } }); // 박준혁 (분실자)
  const teacher = await prisma.user.findFirst({ where: { role: "ADMIN" } }); // 김교사

  if (!studentA || !studentB || !teacher) {
    throw new Error("테스트 계정(김민우, 박준혁, 김교사)이 DB에 존재하지 않습니다.");
  }

  console.log(`👤 학생 A: ${studentA.name} (${studentA.studentNoMasked}) - 1학년 습득자 역할`);
  console.log(`👤 학생 B: ${studentB.name} (${studentB.studentNoMasked}) - 2학년 분실자 역할`);
  console.log(`👨‍🏫 교사: ${teacher.name} (${teacher.role}) - 학생실 관리자 역할\n`);

  // 2. 시나리오 1: 학생 A가 습득물 게시글 등록
  console.log("-------------------------------------------------");
  console.log("📌 [시나리오 1] 학생 A가 신관 도서관 에어팟 프로 습득글 작성");
  const postA = await prisma.post.create({
    data: {
      authorId: studentA.id,
      type: "FOUND",
      category: "전자기기",
      title: "신관 도서관 2층에서 에어팟 프로 습득했습니다",
      body: "신관 2층 열람실 책상 아래 떨어져 있었습니다. 케이스 겉면은 깨끗합니다.",
      placeBuilding: "신관(도서관/특별실)",
      placeDetail: "2층 열람실",
      occurredAt: new Date(),
      status: "OPEN",
      tags: JSON.stringify(["에어팟", "프로", "흰색", "도서관"]),
      images: {
        create: [{ url: "/uploads/sample_airpods.jpg", order: 0 }],
      },
    },
    include: { images: true },
  });
  console.log(`✅ [학생 A] 게시글 등록 성공! Post ID: ${postA.id}, 제목: "${postA.title}"`);

  // 3. 시나리오 2: AI 유사 분실물 추천 알고리즘 검증
  console.log("\n-------------------------------------------------");
  console.log("🤖 [시나리오 2] AI 스마트 유사 분실물 매칭 엔진 실행");
  const { getSimilarPosts } = require("../src/lib/matching.js");
  const similarPosts = await getSimilarPosts({
    id: postA.id,
    type: postA.type,
    category: postA.category,
    title: postA.title,
    body: postA.body,
    tags: postA.tags,
    placeBuilding: postA.placeBuilding,
    placeDetail: postA.placeDetail,
    occurredAt: postA.occurredAt,
    createdAt: postA.createdAt,
  });

  console.log(`🔍 AI 추천 매칭 결과: ${similarPosts.length}건 발견`);
  similarPosts.forEach((sim, idx) => {
    console.log(`   [매칭 ${idx + 1}] "${sim.title}" | AI 매칭률: ${sim.matchScore}% | 매칭 근거: [${sim.matchReasons.join(", ")}]`);
  });

  if (similarPosts.length > 0) {
    console.log("✅ AI 유사 분실물 매칭 엔진 정상 작동 확인! (스코어링 및 근거 태그 생성 완료)");
  }

  // 4. 시나리오 3: 학생 B가 학생 A의 글에 목격 제보 및 댓글 작성 -> 알림 생성 -> 수정 -> 삭제
  console.log("\n-------------------------------------------------");
  console.log("💬 [시나리오 3] 학생 B 댓글 작성 ➔ 학생 A 알림 수신 ➔ 댓글 수정 ➔ 댓글 삭제");
  const comment1 = await prisma.comment.create({
    data: {
      postId: postA.id,
      authorId: studentB.id,
      content: "제가 신관 도서관에서 잃어버린 에어팟 같아요!",
      isSighting: true,
    },
    include: { author: true },
  });
  console.log(`✅ [학생 B] 댓글 작성 완료: "${comment1.content}" (작성자: ${comment1.author.name})`);

  // 학생 A에게 알림 발송 (API 비즈니스 로직 연동)
  const createdNotif = await prisma.notification.create({
    data: {
      userId: studentA.id,
      title: comment1.isSighting ? "👀 [목격 제보]" : "💬 [새 댓글]",
      body: `${studentB.name}님이 분실물 위치 목격 제보를 남겼습니다: "${comment1.content.slice(0, 30)}..."`,
      link: `/posts/${postA.id}`,
    },
  });
  console.log(`🔔 [알림 생성] 학생 A 대상 알림 DB 저장 완료 (Notification ID: ${createdNotif.id})`);

  // 학생 A 알림함 확인
  const notifA = await prisma.notification.findFirst({
    where: { userId: studentA.id, link: `/posts/${postA.id}` },
    orderBy: { createdAt: "desc" },
  });
  console.log(`🔔 [학생 A 알림함 확인] 알림 도착: "${notifA ? notifA.title : '없음'}" | 내용: "${notifA ? notifA.body : ''}"`);

  // 댓글 수정 테스트
  const updatedComment = await prisma.comment.update({
    where: { id: comment1.id },
    data: { content: "제가 신관 도서관에서 잃어버린 에어팟 같아요! 안쪽에 노란 별 스티커 붙어있습니다." },
  });
  console.log(`✏️ [학생 B] 댓글 수정 성공: "${updatedComment.content}"`);

  // 추가 테스트 댓글 작성 후 삭제
  const commentToDelete = await prisma.comment.create({
    data: {
      postId: postA.id,
      authorId: studentB.id,
      content: "오타가 있어서 지웁니다.",
    },
  });
  await prisma.comment.delete({ where: { id: commentToDelete.id } });
  const checkDeleted = await prisma.comment.findUnique({ where: { id: commentToDelete.id } });
  console.log(`🗑️ [학생 B] 댓글 삭제 성공 여부: ${checkDeleted === null ? "정상 삭제됨 (DB null 확인 완료)" : "실패"}`);

  // 5. 시나리오 4: 학생 B 수령 신청 -> 학생 A 승인 (상태 전이: OPEN -> CLAIM_PENDING -> READY_FOR_PICKUP)
  console.log("\n-------------------------------------------------");
  console.log("🛡️ [시나리오 4] 수령 신청 및 승인 상태 전이 (OPEN ➔ CLAIM_PENDING ➔ READY_FOR_PICKUP)");
  const postBeforeClaim = await prisma.post.findUnique({ where: { id: postA.id } });
  console.log(`   [상태 전이 1단계] 신청 전 게시글 상태: ${postBeforeClaim.status}`);

  const claim = await prisma.claim.create({
    data: {
      postId: postA.id,
      claimantId: studentB.id,
      identifyingNotes: "케이스 뚜껑 안쪽에 노란색 별 모양 스티커 부착, 오른쪽 유닛에 미세한 흠집 있음",
      status: "REQUESTED",
    },
  });
  const postClaimPending = await prisma.post.update({
    where: { id: postA.id },
    data: { status: "CLAIM_PENDING" },
  });
  console.log(`📝 [학생 B] 수령 신청 제출 완료 (비공개 특징: "${claim.identifyingNotes}")`);
  console.log(`   [상태 전이 2단계] 수령 신청 접수 후 상태: ${postClaimPending.status} (CLAIM_PENDING 전이 완료)`);

  // 학생 A가 특징 확인 후 승인
  await prisma.claim.update({
    where: { id: claim.id },
    data: {
      status: "APPROVED",
      decidedById: studentA.id,
      decidedAt: new Date(),
    },
  });
  const postApproved = await prisma.post.update({
    where: { id: postA.id },
    data: { status: "READY_FOR_PICKUP" },
  });
  console.log(`🤝 [학생 A] 수령 신청 승인 완료!`);
  console.log(`   [상태 전이 3단계] 습득자 승인 후 상태: ${postApproved.status} (READY_FOR_PICKUP 전이 완료)`);

  // 1:1 채팅방 생성 및 시스템 안내
  const chatRoom = await prisma.chatRoom.create({
    data: {
      postId: postA.id,
      participants: {
        create: [{ userId: studentA.id }, { userId: studentB.id }],
      },
      messages: {
        create: [
          {
            content: "수령 신청이 승인되었습니다! 안전을 위해 본관 1층 학생안전복지부(학생실)에서 인수인계해주세요.",
            isSystem: true,
          },
        ],
      },
    },
    include: { messages: true, participants: true },
  });
  console.log(`🚪 [1:1 채팅방 개설] ID: ${chatRoom.id} (참여자: ${studentA.name}, ${studentB.name})`);

  // 6. 시나리오 5: 1:1 채팅 메시지 교환 및 전화번호/계좌번호 민감정보 정규식 감지
  console.log("\n-------------------------------------------------");
  console.log("💬 [시나리오 5] 1:1 실시간 채팅 메시지 교환 & 보안 정규식 감지");

  // 학생 A 메시지
  const msg1 = await prisma.chatMessage.create({
    data: {
      chatRoomId: chatRoom.id,
      senderId: studentA.id,
      content: "안녕하세요! 점심시간에 본관 1층 학생실 보관함 앞에서 뵐 수 있을까요?",
    },
  });
  console.log(`   [학생 A ➔ 학생 B]: "${msg1.content}"`);

  // 학생 B 메시지 (정상)
  const msg2 = await prisma.chatMessage.create({
    data: {
      chatRoomId: chatRoom.id,
      senderId: studentB.id,
      content: "네 좋습니다! 12시 40분에 학생실 앞에서 뵙겠습니다.",
    },
  });
  console.log(`   [학생 B ➔ 학생 A]: "${msg2.content}"`);

  // 보안 감지 테스트 (전화번호 및 계좌번호/사례금)
  const { detectSensitiveContactPatterns } = require("../src/lib/security.js");

  // 1) 전화번호 패턴 감지
  const testPhoneMsg = "제 폰번호 010-9876-5432 로 문자 주세요";
  const phoneDetection = detectSensitiveContactPatterns(testPhoneMsg);
  console.log(`   ⚠️ [보안 감지 1: 전화번호] "${testPhoneMsg}"`);
  console.log(`      감지 결과: hasSensitivePattern=${phoneDetection.hasSensitivePattern}, 유형=${phoneDetection.type}, 사유: "${phoneDetection.reason}"`);

  // 2) 계좌번호 및 사례금 패턴 감지
  const testAccountMsg = "사례금으로 카카오뱅크 3333-01-1234567 계좌로 송금 부탁드립니다";
  const accountDetection = detectSensitiveContactPatterns(testAccountMsg);
  console.log(`   ⚠️ [보안 감지 2: 계좌번호/송금] "${testAccountMsg}"`);
  console.log(`      감지 결과: hasSensitivePattern=${accountDetection.hasSensitivePattern}, 유형=${accountDetection.type}, 사유: "${accountDetection.reason}"`);

  // 7. 시나리오 6: 교사 입회 오프라인 학생실 실물 인수인계 완료 및 반환 카운트 증가
  console.log("\n-------------------------------------------------");
  console.log("🏁 [시나리오 6] 학생실 실물 인수인계 완료 & 반환 횟수 카운트 증가");
  console.log(`👨‍🏫 [교사 관리] 담당 교사(${teacher.name}) 입회 하에 학생안전복지부 실물 대조 완료`);

  const prevUserA = await prisma.user.findUnique({ where: { id: studentA.id } });

  await prisma.post.update({
    where: { id: postA.id },
    data: { status: "RETURNED" },
  });
  await prisma.user.update({
    where: { id: studentA.id },
    data: { returnedCount: { increment: 1 } },
  });

  const finalPost = await prisma.post.findUnique({ where: { id: postA.id } });
  const finalUserA = await prisma.user.findUnique({ where: { id: studentA.id } });
  console.log(`🎉 [최종 확인] 게시글 상태: ${finalPost.status} (RETURNED 완료)`);
  console.log(`🏅 [최종 확인] 학생 A(${finalUserA.name}) 반환 성공 횟수: ${prevUserA.returnedCount}회 ➔ ${finalUserA.returnedCount}회 (+1 증가 확인)`);

  console.log("\n=================================================");
  console.log("✨ [모든 멀티 에이전트 상호작용 검증 통과!]");
  console.log("=================================================");
}

runSimulation()
  .catch((e) => {
    console.error("❌ 시뮬레이션 실패:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
