import { DEFAULT_BANNED_WORDS, SCHOOL_CONFIG } from "./constants";

/**
 * 텍스트 내 금칙어 포함 여부를 검사합니다.
 * @param text 검사할 텍스트
 * @param customBannedWords DB에서 로드된 추가 금칙어 목록
 * @returns 감지된 금칙어 또는 null
 */
export function checkBannedWords(
  text: string,
  customBannedWords: string[] = []
): string | null {
  if (!text) return null;
  const allWords = [...DEFAULT_BANNED_WORDS, ...customBannedWords];
  const cleanedText = text.replace(/\s+/g, "").toLowerCase();

  for (const word of allWords) {
    if (!word) continue;
    const cleanedWord = word.replace(/\s+/g, "").toLowerCase();
    if (cleanedText.includes(cleanedWord)) {
      return word;
    }
  }
  return null;
}

/**
 * 채팅 및 댓글에서 외부 연락처(전화번호, 외부 메신저 링크) 패턴을 감지합니다.
 * 교내 안전을 위해 외부 사적 연락이나 사기 유도를 방지합니다.
 */
export function detectSensitiveContactPatterns(text: string): {
  hasSensitivePattern: boolean;
  type?: "PHONE" | "EXTERNAL_LINK" | "FINANCIAL";
  reason?: string;
} {
  if (!text) return { hasSensitivePattern: false };

  // 1. 한국 휴대전화 및 일반전화 번호 패턴 (하이픈 유무 포함)
  const phoneRegex = /(?<!\d)(01[016789]|02|0[3-9]\d)[-.\s]?\d{3,4}[-.\s]?\d{4}(?!\d)|(\b\d{10,11}\b)/;
  if (phoneRegex.test(text)) {
    return {
      hasSensitivePattern: true,
      type: "PHONE",
      reason: "전화번호 공유는 금지되어 있습니다. 교내 1:1 대화만 이용하세요.",
    };
  }

  // 2. 오픈채팅, 텔레그램, 외부 단축 링크 패턴
  const linkRegex = /(https?:\/\/|www\.|open\.kakao|kakaotalk|t\.me\/|discord\.gg|instagram\.com|line\.me|bit\.ly)/i;
  if (linkRegex.test(text)) {
    return {
      hasSensitivePattern: true,
      type: "EXTERNAL_LINK",
      reason: "외부 링크 및 사적 메신저는 사용할 수 없습니다.",
    };
  }

  // 3. 사례금 요구, 송금, 중고거래화, 계좌번호 패턴 차단
  if (/계좌|입금|송금|사례금|기프티콘|문상|돈받고|중고/.test(text)) {
    return {
      hasSensitivePattern: true,
      type: "FINANCIAL",
      reason: "사례금 요구, 계좌 송금 및 중고거래 유도는 엄격히 금지됩니다.",
    };
  }

  const accountRegex = /(\d{2,6}[- ]?\d{2,6}[- ]?\d{2,8})/;
  if (accountRegex.test(text) && /은행|국민|신한|우리|하나|농협|카카오|토스|케이뱅크|기업|우체국/.test(text)) {
    return {
      hasSensitivePattern: true,
      type: "FINANCIAL",
      reason: "계좌번호 입력이 감지되었습니다. 물건 인수인계는 학생실에서만 진행하세요.",
    };
  }

  return { hasSensitivePattern: false };
}

/**
 * 글쓰기 속도제한(Rate Limit) 체크:
 * 계정당 10분에 1개, 하루 최대 5개
 */
export function checkPostRateLimit(user: {
  lastPostedAt?: Date | null;
  todayPostCount?: number;
  role?: string;
}): { allowed: boolean; reason?: string } {
  // 관리자나 교사는 학교 공지 등으로 인해 속도제한 면제
  if (user.role === "ADMIN" || user.role === "TEACHER") {
    return { allowed: true };
  }

  const now = new Date();

  // 1. 10분 쿨타임 검사
  if (user.lastPostedAt) {
    const lastPosted = new Date(user.lastPostedAt);
    const diffMinutes = (now.getTime() - lastPosted.getTime()) / (1000 * 60);
    if (diffMinutes < SCHOOL_CONFIG.postRateLimitMinutes) {
      const remainMinutes = Math.ceil(
        SCHOOL_CONFIG.postRateLimitMinutes - diffMinutes
      );
      return {
        allowed: false,
        reason: `도배 방지를 위해 글 작성 후 10분간 새 글을 올릴 수 없습니다. (${remainMinutes}분 후 가능)`,
      };
    }
  }

  // 2. 일일 최대 글 수 제한
  if (
    user.todayPostCount !== undefined &&
    user.todayPostCount >= SCHOOL_CONFIG.maxDailyPosts
  ) {
    return {
      allowed: false,
      reason: `하루 최대 글 작성 한도(${SCHOOL_CONFIG.maxDailyPosts}건)를 초과했습니다. 내일 다시 등록해주세요.`,
    };
  }

  return { allowed: true };
}

/**
 * 학번 마스킹 헬퍼: "240101" -> "2401**"
 */
export function maskStudentNo(studentNo: string): string {
  if (!studentNo) return "";
  if (studentNo.length <= 3) return studentNo;
  if (studentNo.length === 4) {
    // 충렬고 4자리 학번 e.g. "3105" (3학년 1반 5번) -> "31**"
    return studentNo.slice(0, 2) + "**";
  }
  if (studentNo.length === 5) {
    // 5자리 학번 e.g. "31005" -> "310**"
    return studentNo.slice(0, 3) + "**";
  }
  // 6자리 학번 e.g. "240101" -> "2401**", 교사 "T9901" -> "T99**"
  return studentNo.slice(0, 4) + "**";
}

/**
 * 이름 마스킹 헬퍼: "김철수" -> "김*수", "남궁민" -> "남*민"
 */
export function maskName(name: string): string {
  if (!name) return "";
  if (name.length <= 2) return name[0] + "*";
  return name[0] + "*".repeat(name.length - 2) + name[name.length - 1];
}
