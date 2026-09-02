"use client";

import React, { useState, useEffect } from "react";
import { signIn, useSession } from "next-auth/react";
import { UserCheck, Shield, ChevronDown, RefreshCw } from "lucide-react";

interface DemoUser {
  id: string;
  name: string;
  studentNo: string;
  studentNoMasked: string;
  grade: number | null;
  classNo: number | null;
  role: string;
  status: string;
  returnedCount: number;
}

export default function DemoSwitcher() {
  const { data: session } = useSession();
  const [users, setUsers] = useState<DemoUser[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/auth/demo-users")
      .then((res) => res.json())
      .then((data) => {
        if (data.users) setUsers(data.users);
      })
      .catch((err) => console.error(err));
  }, []);

  const handleSwitchUser = async (user: DemoUser) => {
    setLoading(true);
    try {
      const res = await signIn("demo-login", {
        userId: user.id,
        redirect: false,
      });
      if (res?.error) {
        console.error("Switch error:", res.error);
        setLoading(false);
      } else {
        window.location.href = user.status === "PENDING_ONBOARDING" ? "/onboarding" : "/";
      }
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };

  return (
    <div className="relative inline-block text-left">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors shadow-sm"
        title="계정 간편 전환 (교사/학생 테스트용)"
      >
        <UserCheck className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">데모 계정 전환</span>
        <ChevronDown className="w-3 h-3 text-blue-500" />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-200 z-50 py-2 divide-y divide-slate-100 animate-in fade-in zoom-in-95 duration-100">
            <div className="px-3 py-2 bg-slate-50">
              <p className="text-xs font-bold text-slate-800">
                👤 계정 1클릭 전환 (테스트 전용)
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                교사와 학생 역할을 번갈아 테스트할 수 있습니다.
              </p>
            </div>

            <div className="max-h-72 overflow-y-auto py-1">
              {users.map((u) => {
                const isCurrent = session?.user?.id === u.id;
                const isTeacher = u.role === "ADMIN" || u.role === "TEACHER";

                return (
                  <button
                    key={u.id}
                    disabled={loading || isCurrent}
                    onClick={() => {
                      setIsOpen(false);
                      handleSwitchUser(u);
                    }}
                    className={`w-full text-left px-3 py-2.5 text-xs flex items-center justify-between hover:bg-blue-50 transition-colors ${
                      isCurrent ? "bg-blue-50/70 font-bold" : ""
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {isTeacher ? (
                        <span className="p-1 rounded-md bg-amber-100 text-amber-700">
                          <Shield className="w-3.5 h-3.5" />
                        </span>
                      ) : (
                        <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-[10px]">
                          {u.name?.[0] || "👤"}
                        </span>
                      )}
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-slate-900">
                            {u.name}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            {isTeacher ? "생활지도교사" : `${u.grade}학년 ${u.classNo}반`}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400">
                          학번: {u.studentNoMasked} · 반환기여: {u.returnedCount}회
                        </p>
                      </div>
                    </div>
                    {isCurrent && (
                      <span className="text-[10px] font-bold text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded">
                        현재
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="p-2 text-center bg-slate-50 text-[10px] text-slate-400">
              {loading && (
                <span className="flex items-center justify-center gap-1 text-blue-600 font-medium">
                  <RefreshCw className="w-3 h-3 animate-spin" /> 전환 중...
                </span>
              )}
              {!loading && "Google OAuth 또는 학번 로그인도 가능합니다."}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
