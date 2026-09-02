"use client";

import React, { useState, useEffect } from "react";
import AdminNav from "@/components/admin/AdminNav";
import {
  AlertTriangle,
  CheckCircle,
  EyeOff,
  UserX,
  ShieldAlert,
  Clock,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";

export default function AdminReportsPage() {
  const [reports, setReports] = useState<any[]>([]);
  const [filterStatus, setFilterStatus] = useState("PENDING");
  const [loading, setLoading] = useState(true);

  const fetchReports = async (status = filterStatus) => {
    try {
      const res = await fetch(`/api/admin/reports?status=${status}`);
      const data = await res.json();
      if (data.reports) setReports(data.reports);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports(filterStatus);
  }, [filterStatus]);

  const handleResolve = async (reportId: string, action: string) => {
    const actionLabel =
      action === "DISMISS"
        ? "이상 없음으로 종결"
        : action === "HIDE_CONTENT"
        ? "해당 콘텐츠 숨김"
        : action === "WARN_USER"
        ? "작성자에게 경고 1회 부여"
        : "작성자 계정 즉시 정지";

    if (!confirm(`정말 "${actionLabel}" 처리를 진행하시겠습니까?`)) return;

    try {
      const res = await fetch("/api/admin/reports", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportId, action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "처리 실패");
      alert(data.message);
      fetchReports(filterStatus);
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-4">
      <AdminNav />

      <div className="max-w-4xl mx-auto px-4 space-y-5 pb-12">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h1 className="text-xl font-black text-slate-900">
              교내 규정 위반 신고 심사 큐
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              허위 분실물 게시, 사칭, 만남 유도, 도배 및 욕설 신고를 검토하고 조치합니다.
            </p>
          </div>

          <div className="flex gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-bold">
            <button
              onClick={() => setFilterStatus("PENDING")}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                filterStatus === "PENDING"
                  ? "bg-white text-rose-700 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              대기 중
            </button>
            <button
              onClick={() => setFilterStatus("ALL")}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                filterStatus === "ALL"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              전체 내역
            </button>
          </div>
        </div>

        {/* 신고 목록 */}
        <div className="space-y-3">
          {loading ? (
            <div className="text-center py-12 text-slate-400 text-xs">
              신고 목록을 불러오는 중...
            </div>
          ) : reports.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center text-slate-400 space-y-1">
              <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto" />
              <h3 className="text-sm font-bold text-slate-800">
                처리 대기 중인 신고가 없습니다!
              </h3>
              <p className="text-xs text-slate-500">
                교내 분실물 게시판이 깨끗하게 유지되고 있습니다.
              </p>
            </div>
          ) : (
            reports.map((report) => (
              <div
                key={report.id}
                className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-3"
              >
                {/* 헤더 */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-700 border border-rose-200">
                      신고 사유: {report.reason}
                    </span>
                    <span className="text-xs text-slate-400">
                      대상: {report.targetType}
                    </span>
                  </div>

                  <span className="text-[11px] text-slate-400">
                    {format(new Date(report.createdAt), "yyyy.MM.dd HH:mm")}
                  </span>
                </div>

                {/* 신고자 & 상세 설명 */}
                <div className="text-xs text-slate-600 space-y-1">
                  <div>
                    <span className="font-bold text-slate-700">신고자:</span>{" "}
                    {report.reporter.name} ({report.reporter.studentNoMasked})
                  </div>
                  {report.details && (
                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="font-bold text-slate-800 block mb-0.5">
                        신고자 진술 내용:
                      </span>
                      "{report.details}"
                    </div>
                  )}
                </div>

                {/* 신고 대상 원본 프리뷰 */}
                {report.post && (
                  <div className="p-3 bg-blue-50/50 rounded-2xl border border-blue-100 text-xs text-blue-900 flex items-center justify-between">
                    <div>
                      <span className="font-bold">신고된 게시글:</span>{" "}
                      "{report.post.title}" ({report.post.status})
                    </div>
                    <Link
                      href={`/posts/${report.post.id}`}
                      target="_blank"
                      className="text-blue-600 hover:text-blue-800 font-bold flex items-center gap-0.5"
                    >
                      게시글 확인 <ExternalLink className="w-3 h-3" />
                    </Link>
                  </div>
                )}

                {/* 처리 액션 버튼 (PENDING 상태인 경우) */}
                {report.status === "PENDING" ? (
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
                    <button
                      onClick={() => handleResolve(report.id, "DISMISS")}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors"
                    >
                      ✓ 이상 없음 (종결)
                    </button>
                    {report.postId && (
                      <button
                        onClick={() => handleResolve(report.id, "HIDE_CONTENT")}
                        className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1"
                      >
                        <EyeOff className="w-3.5 h-3.5" />
                        게시글 즉시 숨김
                      </button>
                    )}
                    <button
                      onClick={() => handleResolve(report.id, "WARN_USER")}
                      className="px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1"
                    >
                      <ShieldAlert className="w-3.5 h-3.5" />
                      작성자 경고 1회 부여
                    </button>
                    <button
                      onClick={() => handleResolve(report.id, "SUSPEND_USER")}
                      className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1"
                    >
                      <UserX className="w-3.5 h-3.5" />
                      작성자 계정 즉시 정지
                    </button>
                  </div>
                ) : (
                  <div className="p-2.5 bg-slate-50 rounded-xl text-xs text-slate-500 flex items-center justify-between">
                    <span>
                      <strong>처리 결과:</strong> {report.actionTaken}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {report.resolvedAt && format(new Date(report.resolvedAt), "MM.dd HH:mm")} 처리 완료
                    </span>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
