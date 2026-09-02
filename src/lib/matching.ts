import { prisma } from "./prisma";

/**
 * 한국어 텍스트에서 주요 명사 및 키워드 토큰을 추출합니다.
 * 불용어 및 조사(은/는/이/가/에서/을/를 등)를 정제합니다.
 */
function extractKeywords(text: string): Set<string> {
  if (!text) return new Set();

  const stopWords = new Set([
    "은", "는", "이", "가", "을", "를", "의", "에", "에서", "으로", "로",
    "와", "과", "도", "만", "까지", "부터", "하고", "주웠어요", "주웠습니다",
    "잃어버렸어요", "잃어버렸습니다", "분실", "습득", "찾아요", "보관중",
    "있습니다", "있어요", "합니다", "해요", "제보", "어디", "그", "저", "것"
  ]);

  const tokens = new Set<string>();
  // 특수문자 제거 후 공백 및 괄호 분리
  const cleaned = text
    .toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()\[\]]/g, " ")
    .trim();

  const words = cleaned.split(/\s+/);

  for (const rawWord of words) {
    if (!rawWord || rawWord.length < 2) continue;

    let word = rawWord;
    // 일반적인 한국어 조사 어미 제거
    for (const suffix of ["에서", "으로", "까지", "부터", "하고", "을", "를", "은", "는", "이", "가", "의", "에", "로", "와", "과", "도"]) {
      if (word.length > suffix.length + 1 && word.endsWith(suffix)) {
        word = word.slice(0, -suffix.length);
        break;
      }
    }

    if (word.length >= 2 && !stopWords.has(word)) {
      tokens.add(word);
    }
  }

  return tokens;
}

/**
 * 특정 키워드가 포함된 새 글이 등록되었을 때, 구독한 유저들에게 알림을 발송합니다.
 */
export async function triggerKeywordAlerts(post: {
  id: string;
  title: string;
  body: string;
  category: string;
  placeBuilding: string;
  tags?: string | null;
  type?: string;
  authorId?: string;
}) {
  try {
    const textToMatch = `${post.title} ${post.body} ${post.category} ${post.placeBuilding} ${post.tags || ""}`.toLowerCase();

    // 등록된 모든 키워드 구독 조회
    const alerts = await prisma.keywordAlert.findMany({
      include: {
        user: true,
      },
    });

    const notificationsToCreate = [];

    for (const alert of alerts) {
      if (post.authorId && alert.userId === post.authorId) continue;
      const keyword = alert.keyword.toLowerCase().trim();
      if (!keyword) continue;

      if (textToMatch.includes(keyword)) {
        notificationsToCreate.push({
          userId: alert.userId,
          title: `🔔 관심 키워드 "${alert.keyword}" 발견!`,
          body: `"${post.title}" 글이 새로 등록되었습니다.`,
          link: `/posts/${post.id}`,
        });
      }
    }

    if (notificationsToCreate.length > 0) {
      await prisma.notification.createMany({
        data: notificationsToCreate,
      });
    }
  } catch (error) {
    console.error("Failed to trigger keyword alerts:", error);
  }
}

export interface SmartSimilarPost {
  id: string;
  type: string;
  category: string;
  title: string;
  placeBuilding: string;
  placeDetail: string;
  images: Array<{ url: string }>;
  matchScore: number;
  matchReasons: string[];
}

/**
 * 다중 요소 기반 AI 유사 분실/습득물 추천 알고리즘
 * 
 * 1. 반대 유형(LOST <-> FOUND) 상호 매칭 (잃어버린 자와 주운 자의 연결)
 * 2. 카테고리 일치도 (30점)
 * 3. 발생 건물 및 세부 장소 일치도 (25점)
 * 4. 형태소/키워드 토큰 오버랩 자카드 유사도 (30점)
 * 5. 시간 근접성 (최근 7일 이내 시차 계산, 15점)
 * 종합 점수 40점 이상의 후보군을 매칭률 순으로 정렬하고 설명 가능한 근거 태그를 제공합니다.
 */
export async function getSimilarPosts(currentPost: {
  id: string;
  type: string;
  category: string;
  title?: string;
  body?: string;
  tags?: string | null;
  placeBuilding: string;
  placeDetail?: string;
  occurredAt?: Date;
  createdAt: Date;
}): Promise<SmartSimilarPost[]> {
  try {
    // 잃어버렸어요(LOST) 글이면 주웠어요(FOUND) 글을 우선 매칭하고, 그 반대도 탐색
    const targetType = currentPost.type === "LOST" ? "FOUND" : currentPost.type === "FOUND" ? "LOST" : "ALL";
    const fourteenDaysAgo = new Date(
      currentPost.createdAt.getTime() - 14 * 24 * 60 * 60 * 1000
    );

    // 1. 후보군 풀 조회 (최근 14일 이내 열려있는 글)
    const whereClause: any = {
      id: { not: currentPost.id },
      status: { in: ["OPEN", "CLAIM_PENDING"] },
      createdAt: { gte: fourteenDaysAgo },
    };

    if (targetType !== "ALL") {
      whereClause.type = targetType;
    }

    const candidates = await prisma.post.findMany({
      where: whereClause,
      include: {
        images: {
          orderBy: { order: "asc" },
          take: 1,
        },
      },
      take: 20,
    });

    if (candidates.length === 0) return [];

    // 2. 현재 게시글의 키워드 토큰 추출
    const currentTokens = extractKeywords(
      `${currentPost.title || ""} ${currentPost.body || ""} ${currentPost.tags || ""}`
    );

    const scoredResults: SmartSimilarPost[] = [];

    for (const cand of candidates) {
      let score = 0;
      const reasons: string[] = [];

      // ① 카테고리 일치 검사 (30점)
      if (cand.category === currentPost.category) {
        score += 30;
        reasons.push(`📂 ${cand.category}`);
      }

      // ② 장소 일치 검사 (최대 25점)
      if (cand.placeBuilding === currentPost.placeBuilding) {
        score += 20;
        reasons.push(`📍 ${cand.placeBuilding}`);
        // 세부 장소 키워드 겹침 검사 (+5점)
        if (
          currentPost.placeDetail &&
          cand.placeDetail &&
          (cand.placeDetail.includes(currentPost.placeDetail) ||
            currentPost.placeDetail.includes(cand.placeDetail))
        ) {
          score += 5;
        }
      }

      // ③ 키워드 토큰 자카드 유사도 검사 (최대 30점)
      const candTokens = extractKeywords(
        `${cand.title} ${cand.body} ${cand.tags || ""}`
      );
      const commonTokens = Array.from(currentTokens).filter((token) =>
        candTokens.has(token)
      );

      if (commonTokens.length > 0) {
        const tokenScore = Math.min(30, commonTokens.length * 15);
        score += tokenScore;
        reasons.push(`🏷️ ${commonTokens.slice(0, 2).join(", ")}`);
      }

      // ④ 시간 근접성 검사 (최대 15점)
      const candDate = cand.occurredAt || cand.createdAt;
      const currentDate = currentPost.occurredAt || currentPost.createdAt;
      const diffMs = Math.abs(candDate.getTime() - currentDate.getTime());
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

      if (diffDays <= 1) {
        score += 15;
        reasons.push(`⏱️ 1일 이내`);
      } else if (diffDays <= 3) {
        score += 10;
        reasons.push(`⏱️ ${diffDays}일 차이`);
      } else if (diffDays <= 7) {
        score += 5;
      }

      // 40점 이상만 유의미한 AI 추천으로 판정
      if (score >= 40) {
        scoredResults.push({
          id: cand.id,
          type: cand.type,
          category: cand.category,
          title: cand.title,
          placeBuilding: cand.placeBuilding,
          placeDetail: cand.placeDetail,
          images: cand.images.map((img) => ({ url: img.url })),
          matchScore: Math.min(99, Math.round(score)),
          matchReasons: reasons.slice(0, 3),
        });
      }
    }

    // 매칭 스코어 내림차순 정렬 후 상위 4개 반환
    scoredResults.sort((a, b) => b.matchScore - a.matchScore);
    return scoredResults.slice(0, 4);
  } catch (error) {
    console.error("Failed to compute smart similar posts:", error);
    return [];
  }
}
