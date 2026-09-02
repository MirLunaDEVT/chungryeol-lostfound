"use client";

import React, { useState, useEffect } from "react";
import AdminNav from "@/components/admin/AdminNav";
import { Box, Plus, CheckCircle, Clock } from "lucide-react";
import { format } from "date-fns";

export default function AdminLockersPage() {
  const [lockers, setLockers] = useState<any[]>([]);
  const [lockerCode, setLockerCode] = useState("L-04");
  const [itemSummary, setItemSummary] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const fetchLockers = async () => {
    try {
      const res = await fetch("/api/admin/lockers");
      const data = await res.json();
      if (data.lockers) setLockers(data.lockers);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLockers();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemSummary.trim()) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/lockers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lockerCode, itemSummary: itemSummary.trim() }),
      });
      if (res.ok) {
        setItemSummary("");
        fetchLockers();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleReturn = async (id: string, isReturned: boolean) => {
    try {
      const res = await fetch("/api/admin/lockers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, isReturned: !isReturned }),
      });
      if (res.ok) fetchLockers();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-4">
      <AdminNav />

      <div className="max-w-4xl mx-auto px-4 space-y-5 pb-12">
        <div>
          <h1 className="text-xl font-black text-slate-900">
            학생실 분실물 보관함(사물함) 현황
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            본관 1층 학생안전복지부 내 실물 분실물 보관함(L-01~10) 수납 상태를 기록·관리합니다.
          </p>
        </div>

        {/* 신규 실물 보관함 수납 등록 */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-3">
          <h2 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
            <Box className="w-4 h-4 text-blue-600" />
            실물 분실물 보관 등록
          </h2>

          <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-4 gap-2">
            <input
              type="text"
              value={lockerCode}
              onChange={(e) => setLockerCode(e.target.value)}
              placeholder="보관함 번호 (예: L-01)"
              className="text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <input
              type="text"
              value={itemSummary}
              onChange={(e) => setItemSummary(e.target.value)}
              placeholder="물품 요약 (예: 에어팟 2세대 흰색 케이스)"
              className="sm:col-span-2 text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <button
              type="submit"
              disabled={submitting || !itemSummary.trim()}
              className="py-2.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow transition-colors flex items-center justify-center gap-1"
            >
              <Plus className="w-4 h-4" />
              보관 등록
            </button>
          </form>
        </div>

        {/* 보관함 목록 테이블 */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold">
              <tr>
                <th className="p-2.5">사물함 코드</th>
                <th className="p-2.5">보관 물품 요약</th>
                <th className="p-2.5">접수 일시</th>
                <th className="p-2.5">담당 교사</th>
                <th className="p-2.5">상태</th>
                <th className="p-2.5 text-center">조치</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-slate-400">
                    현황을 불러오는 중...
                  </td>
                </tr>
              ) : lockers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-slate-400">
                    현재 보관 중인 물품이 없습니다.
                  </td>
                </tr>
              ) : (
                lockers.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="p-2.5 font-mono font-bold text-blue-700">
                      {item.lockerCode}
                    </td>
                    <td className="p-2.5 font-semibold text-slate-800">
                      {item.itemSummary}
                    </td>
                    <td className="p-2.5 text-slate-500">
                      {format(new Date(item.intakeDate), "yyyy.MM.dd HH:mm")}
                    </td>
                    <td className="p-2.5 text-slate-600">{item.managedBy}</td>
                    <td className="p-2.5">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          item.isReturned
                            ? "bg-slate-100 text-slate-600"
                            : "bg-emerald-100 text-emerald-800"
                        }`}
                      >
                        {item.isReturned ? "반환완료" : "보관 중"}
                      </span>
                    </td>
                    <td className="p-2.5 text-center">
                      <button
                        onClick={() => handleToggleReturn(item.id, item.isReturned)}
                        className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-colors ${
                          item.isReturned
                            ? "bg-slate-200 text-slate-700 hover:bg-slate-300"
                            : "bg-emerald-600 text-white hover:bg-emerald-700"
                        }`}
                      >
                        {item.isReturned ? "보관으로 변경" : "반환 완료 확인"}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
