import React from "react";

export function TypeBadge({ type }: { type: string }) {
  switch (type) {
    case "LOST":
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-700 border border-rose-200">
          🚨 잃어버렸어요
        </span>
      );
    case "FOUND":
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 border border-emerald-200">
          ✨ 주웠어요
        </span>
      );
    case "COMMUNITY":
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 border border-blue-200">
          💬 학교생활
        </span>
      );
    case "NOTICE":
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300">
          📢 학교공지
        </span>
      );
    default:
      return null;
  }
}

export function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "OPEN":
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
          보관/찾는 중
        </span>
      );
    case "RESERVED":
    case "CLAIM_PENDING":
    case "READY_FOR_PICKUP":
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-amber-100 text-amber-900 border border-amber-300">
          🔒 수령 예약 중
        </span>
      );
    case "RETURNED":
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-slate-200 text-slate-700 border border-slate-300">
          ✓ 반환 완료
        </span>
      );
    case "HIDDEN":
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-red-100 text-red-700">
          숨김 처리됨
        </span>
      );
    default:
      return null;
  }
}
