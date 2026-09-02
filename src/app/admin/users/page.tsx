"use client";

import React, { useState, useEffect } from "react";
import AdminNav from "@/components/admin/AdminNav";
import { Users, Search, Shield, UserX, UserCheck, AlertCircle } from "lucide-react";
import { format } from "date-fns";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchUsers = async (q = "") => {
    try {
      const res = await fetch(`/api/admin/users?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (data.users) setUsers(data.users);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers(search);
  }, [search]);

  const handleToggleSuspend = async (user: any) => {
    const isSuspended = user.status === "SUSPENDED";
    const nextStatus = isSuspended ? "ACTIVE" : "SUSPENDED";
    const reason = isSuspended
      ? null
      : prompt("정지 사유를 입력하세요:", "교내 규정 위반 및 허위 게시") || "교내 규정 위반";

    if (!isSuspended && !reason) return;

    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          status: nextStatus,
          suspendedReason: reason,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setUsers(
          users.map((u) => (u.id === user.id ? { ...u, status: nextStatus, suspendedReason: reason } : u))
        );
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleChangeRole = async (user: any, newRole: string) => {
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          role: newRole,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setUsers(
          users.map((u) => (u.id === user.id ? { ...u, role: newRole } : u))
        );
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-4">
      <AdminNav />

      <div className="max-w-4xl mx-auto px-4 space-y-5 pb-12">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h1 className="text-xl font-black text-slate-900">
              계정 및 권한 제재 관리
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              사용자 계정 상태(정상/정지)를 토글하고 관리자·교사 역할을 지정합니다.
            </p>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="이름, 학번, 이메일 검색..."
              className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold">
              <tr>
                <th className="p-2.5">사용자</th>
                <th className="p-2.5">학번</th>
                <th className="p-2.5">이메일</th>
                <th className="p-2.5">역할</th>
                <th className="p-2.5">경고/반환</th>
                <th className="p-2.5">상태</th>
                <th className="p-2.5 text-center">조치</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-slate-400">
                    사용자 목록을 불러오는 중...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-slate-400">
                    사용자가 없습니다.
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const isSuspended = u.status === "SUSPENDED";
                  return (
                    <tr key={u.id} className="hover:bg-slate-50">
                      <td className="p-2.5 font-bold text-slate-900">
                        {u.name}
                      </td>
                      <td className="p-2.5 font-mono text-slate-700">
                        {u.studentNo}
                      </td>
                      <td className="p-2.5 text-slate-500 max-w-[150px] truncate">
                        {u.email || "-"}
                      </td>
                      <td className="p-2.5">
                        <select
                          value={u.role}
                          onChange={(e) => handleChangeRole(u, e.target.value)}
                          className="text-[11px] font-bold p-1 rounded bg-slate-100 border border-slate-200"
                        >
                          <option value="STUDENT">STUDENT</option>
                          <option value="TEACHER">TEACHER</option>
                          <option value="ADMIN">ADMIN</option>
                        </select>
                      </td>
                      <td className="p-2.5 text-slate-600">
                        경고 {u.warningCount}회 / 반환 {u.returnedCount}회
                      </td>
                      <td className="p-2.5">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            isSuspended
                              ? "bg-rose-100 text-rose-800"
                              : "bg-emerald-100 text-emerald-800"
                          }`}
                        >
                          {u.status}
                        </span>
                      </td>
                      <td className="p-2.5 text-center">
                        <button
                          onClick={() => handleToggleSuspend(u)}
                          className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-colors ${
                            isSuspended
                              ? "bg-blue-100 text-blue-800 hover:bg-blue-200"
                              : "bg-rose-100 text-rose-800 hover:bg-rose-200"
                          }`}
                        >
                          {isSuspended ? "정지 해제" : "계정 정지"}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
