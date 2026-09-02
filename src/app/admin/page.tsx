"use client";

import React, { useState, useEffect } from "react";
import AdminNav from "@/components/admin/AdminNav";
import {
  AlertTriangle,
  Clock,
  Sparkles,
  UserX,
  Users,
  Box,
  Shield,
  Activity,
  ArrowUpRight,
} from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";

function formatLogAction(action: string) {
  switch (action) {
    case "CLAIM_REQUESTED":
      return (
        <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-extrabold">
          📦 수령 예약
        </span>
      );
    case "HANDOVER_COMPLETED":
    case "ITEM_RETURNED":
      return (
        <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-extrabold">
          ✅ 반환 완료
        </span>
      );
    case "POST_CREATED":
      return (
        <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-extrabold">
          📝 새 글 등록
        </span>
      );
    case "POST_DELETED":
      return (
        <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-extrabold">
          🗑️ 게시글 삭제
        </span>
      );
    case "LOGIN_SUCCESS":
      return (
        <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold">
          🔑 로그인
        </span>
      );
    case "ROSTER_UPLOADED":
      return (
        <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-extrabold">
          📋 학생 명부
        </span>
      );
    case "USER_SUSPENDED":
    case "USER_WARNED":
      return (
        <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-300 text-[10px] font-extrabold">
          ⚠️ 계정 제재
        </span>
      );
    default:
      return (
        <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold">
          {action}
        </span>
      );
  }
}

function formatLogDetails(details: string | null) {
  if (!details) return "-";
  try {
    const parsed = JSON.parse(details);
    if (parsed.postTitle || parsed.title) {
      return `${parsed.postTitle || parsed.title}${parsed.visitTime ? ` · 방문: ${parsed.visitTime}` : ""}`;
    }
    if (parsed.count && parsed.school) {
      return `${parsed.school} 학생 명부 ${parsed.count}명 등록/갱신`;
    }
    return Object.entries(parsed)
      .slice(0, 3)
      .map(([k, v]) => `${k}: ${v}`)
      .join(", ");
  } catch {
    return details;
  }
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((res) => res.json())
      .then((resData) => setData(resData))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-4">
      <AdminNav />

      <div className="max-w-4xl mx-auto px-4 space-y-5 pb-10">
        <div>
          <h1 className="text-xl font-black text-slate-900">
            교내 안전 관리 대시보드
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            학생실 분실물 인수인계, 허위 수령 방지 및 교내 규정 신고 현황을 관리합니다.
          </p>
        </div>

        {/* 1. 지표 카드 그리드 */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 animate-pulse">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-24 bg-white rounded-2xl border border-slate-200" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {/* 미처리 신고 */}
            <Link
              href="/admin/reports"
              className="bg-white p-4 rounded-2xl border border-rose-200 shadow-sm hover:border-rose-400 transition-all group"
            >
              <div className="flex items-center justify-between text-rose-600 mb-1">
                <span className="text-xs font-bold">미처리 신고</span>
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div className="text-2xl font-black text-rose-600">
                {data?.stats?.pendingReportsCount || 0}건
              </div>
              <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-0.5">
                신고 심사 큐 바로가기 <ArrowUpRight className="w-3 h-3" />
              </p>
            </Link>

            {/* 수령 대기 건 */}
            <div className="bg-white p-4 rounded-2xl border border-amber-200 shadow-sm">
              <div className="flex items-center justify-between text-amber-700 mb-1">
                <span className="text-xs font-bold">수령 확인 대기</span>
                <Clock className="w-4 h-4" />
              </div>
              <div className="text-2xl font-black text-amber-700">
                {data?.stats?.pendingClaimsCount || 0}건
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                학생 고유 특징 검증 중
              </p>
            </div>

            {/* 오늘 신규 글 */}
            <div className="bg-white p-4 rounded-2xl border border-blue-200 shadow-sm">
              <div className="flex items-center justify-between text-blue-600 mb-1">
                <span className="text-xs font-bold">오늘 등록된 글</span>
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="text-2xl font-black text-blue-600">
                {data?.stats?.todayPostsCount || 0}건
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                10분 작성 속도제한 적용
              </p>
            </div>

            {/* 정지 계정 */}
            <Link
              href="/admin/users"
              className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:border-slate-400 transition-all"
            >
              <div className="flex items-center justify-between text-slate-700 mb-1">
                <span className="text-xs font-bold">정지된 계정</span>
                <UserX className="w-4 h-4 text-slate-400" />
              </div>
              <div className="text-2xl font-black text-slate-800">
                {data?.stats?.suspendedUsersCount || 0}명
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                규정 위반 계정 관리
              </p>
            </Link>

            {/* 재학생 명단 */}
            <Link
              href="/admin/roster"
              className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:border-slate-400 transition-all"
            >
              <div className="flex items-center justify-between text-slate-700 mb-1">
                <span className="text-xs font-bold">등록 재학생 명단</span>
                <Users className="w-4 h-4 text-slate-400" />
              </div>
              <div className="text-2xl font-black text-slate-800">
                {data?.stats?.totalStudentsCount || 0}명
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                CSV 업로드 동기화
              </p>
            </Link>

            {/* 보관함 미반환 수 */}
            <Link
              href="/admin/lockers"
              className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:border-slate-400 transition-all"
            >
              <div className="flex items-center justify-between text-slate-700 mb-1">
                <span className="text-xs font-bold">학생실 보관 물품</span>
                <Box className="w-4 h-4 text-slate-400" />
              </div>
              <div className="text-2xl font-black text-slate-800">
                {data?.stats?.totalLockersCount || 0}개
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                실물 사물함 수납 현황
              </p>
            </Link>
          </div>
        )}

        {/* 2. 보안 감사 로그 (Audit Logs) */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-blue-600" />
              최근 보안 감사 로그 (Audit Log)
            </h2>
            <span className="text-[10px] text-slate-400">
              로그인 실패, 상태 변경, 관리자 조치 기록
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold">
                <tr>
                  <th className="p-2.5">일시</th>
                  <th className="p-2.5">작업(Action)</th>
                  <th className="p-2.5">대상/사용자</th>
                  <th className="p-2.5">상세 내용</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data?.recentAuditLogs && data.recentAuditLogs.length > 0 ? (
                  data.recentAuditLogs.map((log: any) => (
                    <tr key={log.id} className="hover:bg-slate-50">
                      <td className="p-2.5 text-slate-400 whitespace-nowrap">
                        {format(new Date(log.createdAt), "MM.dd HH:mm:ss")}
                      </td>
                      <td className="p-2.5 whitespace-nowrap">
                        {formatLogAction(log.action)}
                      </td>
                      <td className="p-2.5 text-slate-700 font-medium">
                        {log.user ? (
                          <span>
                            {log.user.name}{" "}
                            <span className="text-[11px] text-slate-400">
                              ({log.user.studentNoMasked})
                            </span>
                          </span>
                        ) : (
                          <span className="text-slate-400">시스템/익명</span>
                        )}
                      </td>
                      <td className="p-2.5 text-slate-600 max-w-sm font-medium">
                        {formatLogDetails(log.details)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="p-6 text-center text-slate-400">
                      기록된 감사 로그가 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
