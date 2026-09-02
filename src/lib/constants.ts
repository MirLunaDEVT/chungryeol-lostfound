// 학교 및 시스템 전역 환경 설정 상수
export const SCHOOL_CONFIG = {
  name: process.env.NEXT_PUBLIC_SCHOOL_NAME || "충렬고등학교",
  siteName: process.env.NEXT_PUBLIC_SITE_NAME || "분실물 찾기",
  allowedGoogleDomains: (process.env.GOOGLE_ALLOWED_DOMAINS || "pscr.hs.kr")
    .split(",")
    .map((d) => d.trim()),
  teacherDomain: process.env.TEACHER_DOMAIN || "pscr.hs.kr",
  adminEmail: process.env.ADMIN_EMAIL || "teacher@pscr.hs.kr",
  defaultHandoverPlace:
    process.env.DEFAULT_HANDOVER_PLACE || "본관 1층 학생안전복지부 분실물 보관함",
  studentNoRegex: new RegExp(process.env.STUDENT_NO_REGEX || "^([0-9]{4,6}|T[0-9]{4})$"),
  // 건물 프리셋
  buildings: [
    "본관",
    "신관(도서관/특별실)",
    "체육관/강당",
    "급식동(식당)",
    "운동장/스탠드",
    "정문/통학버스 승강장",
    "기타 교내 구역",
  ],
  // 카테고리 프리셋
  categories: [
    "전자기기",
    "학생증/출입증",
    "의류/모자",
    "텀블러/식기",
    "필통/문구",
    "책/교재",
    "지갑/카드",
    "열쇠",
    "안경",
    "기타",
  ],
  // 게시글 작성 속도제한 (10분에 1건)
  postRateLimitMinutes: 10,
  // 1일 글쓰기 최대 제한
  maxDailyPosts: 5,
  // 자동 숨김 처리 신고 임계값
  reportAutoThreshold: 3,
};

// 역할
export const ROLES = {
  STUDENT: "STUDENT",       // 일반 학생
  OPERATOR: "OPERATOR",     // 학생회 운영진 (본인, 부회장 - 신고처리, 글숨김, 공지)
  TEACHER: "TEACHER",       // 생활지도교사
  ADMIN: "ADMIN",           // 마스터 관리자 (담당 선생님)
} as const;

// 게시글 유형
export const POST_TYPES = {
  LOST: "LOST",           // 잃어버렸어요
  FOUND: "FOUND",         // 주웠어요
  COMMUNITY: "COMMUNITY", // 커뮤니티 (제보/목격/일반)
  NOTICE: "NOTICE",       // 교내 공식 공지
} as const;

// 게시글 상태
export const POST_STATUS = {
  OPEN: "OPEN",                         // 찾는 중 / 보관 중
  CLAIM_PENDING: "CLAIM_PENDING",       // 수령 신청 심사 중
  READY_FOR_PICKUP: "READY_FOR_PICKUP", // 수령 승인 (인수인계 대기)
  RETURNED: "RETURNED",                 // 반환 완료
  HIDDEN: "HIDDEN",                     // 숨김 (신고 누적/관리자 조치)
} as const;

// 수령 신청 상태
export const CLAIM_STATUS = {
  REQUESTED: "REQUESTED",
  NEED_INFO: "NEED_INFO",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  CANCELLED: "CANCELLED",
} as const;

// 신고 사유 프리셋
export const REPORT_REASONS = [
  "허위 분실/습득 신고",
  "타인 사칭 또는 개인정보 유출",
  "욕설, 비방, 장난글",
  "분실물을 미끼로 만남 유도 또는 사기",
  "중고거래, 금전 요구, 사례금 유도",
  "기타 교내 규정 위반",
];

// 기본 교내 금칙어 목록 (관리자가 DB에서 추가/삭제 가능)
export const DEFAULT_BANNED_WORDS = [
  "시발", "씨발", "개새끼", "병신", "존나", "졸라", "새끼", "닥쳐", "미친",
  "자살", "살인", "조건만남", "담배", "술", "대리구매", "섹스", "야동", "카톡아이디",
  "오픈채팅", "토토", "도박"
];
