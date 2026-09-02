"use client";

import React, { useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import { REPORT_REASONS } from "@/lib/constants";

interface ReportModalProps {
  targetType: "POST" | "COMMENT" | "CHAT_MESSAGE" | "USER";
  targetId?: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function ReportModal({
  targetType,
  targetId,
  isOpen,
  onClose,
}: ReportModalProps) {
  const [reason, setReason] = useState(REPORT_REASONS[0]);
  const [details, setDetails] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const payload: any = {
      targetType,
      reason,
      details,
    };

    if (targetType === "POST") payload.postId = targetId;
    if (targetType === "COMMENT") payload.commentId = targetId;
    if (targetType === "CHAT_MESSAGE") payload.chatMessageId = targetId;
    if (targetType === "USER") payload.reportedUserId = targetId;

    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "신고 처리에 실패했습니다.");

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-5 relative border border-slate-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 text-rose-600 mb-2">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <h3 className="text-base font-bold text-slate-900">교내 규정 위반 신고</h3>
        </div>

        {success ? (
          <div className="py-8 text-center text-emerald-600 font-bold text-sm">
            신고가 정상 접수되었습니다. 학교 관리자가 확인 후 조치합니다.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3.5 mt-3">
            {error && (
              <div className="p-2.5 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-xl">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                신고 사유 선택
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-rose-500"
              >
                {REPORT_REASONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                상세 내용 (선택)
              </label>
              <textarea
                rows={3}
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="구체적인 상황을 적어주시면 빠른 처리에 도움이 됩니다."
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-rose-500 resize-none"
              />
            </div>

            <div className="text-[11px] text-slate-400">
              ※ 허위 신고는 교내 규정에 의해 불이익을 받을 수 있습니다. 동일 글 신고 3회 누적 시 자동 숨김 처리됩니다.
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 rounded-xl shadow"
              >
                {loading ? "접수 중..." : "신고 접수하기"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
