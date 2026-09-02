import { prisma } from "./prisma";

export type AuditActionType =
  | "LOGIN_SUCCESS"
  | "LOGIN_FAILED_CREDENTIALS"
  | "LOGIN_FAILED_DOMAIN"
  | "LOGIN_BLOCKED_SUSPENDED"
  | "POST_CREATED"
  | "POST_DELETED"
  | "POST_HIDDEN_ADMIN"
  | "CLAIM_REQUESTED"
  | "CLAIM_APPROVED"
  | "CLAIM_REJECTED"
  | "ITEM_RETURNED"
  | "USER_REPORTED"
  | "USER_WARNED"
  | "USER_SUSPENDED"
  | "USER_UNSUSPENDED"
  | "ROSTER_UPLOADED"
  | "BANNED_WORD_MODIFIED";

/**
 * 보안 감사 로그를 데이터베이스에 영구 기록합니다.
 */
export async function createAuditLog(params: {
  userId?: string | null;
  action: AuditActionType | string;
  ipAddress?: string | null;
  userAgent?: string | null;
  details?: Record<string, any> | string;
}) {
  try {
    const detailsString =
      typeof params.details === "object"
        ? JSON.stringify(params.details)
        : params.details;

    await prisma.auditLog.create({
      data: {
        userId: params.userId || null,
        action: params.action,
        ipAddress: params.ipAddress || null,
        userAgent: params.userAgent || null,
        details: detailsString || null,
      },
    });
  } catch (error) {
    console.error("Failed to write audit log:", error);
    // 감사 로그 실패가 메인 트랜잭션을 중단시키지 않도록 방어
  }
}
