"use client";

import React, { useState, useEffect, Suspense } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Lock, AlertCircle, ArrowRight, BookOpen, ShieldCheck, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { SCHOOL_CONFIG } from "@/lib/constants";

function LoginForm() {
  const { status } = useSession();
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // 관리자 전용 폼 토글
  const [showAdminForm, setShowAdminForm] = useState(false);
  const [adminId, setAdminId] = useState("");
  const [adminPassword, setAdminPassword] = useState("");

  useEffect(() => {
    if (status === "authenticated") {
      router.push("/");
    }
  }, [status, router]);

  // 학생 1클릭 바로 입장
  const handleStudentQuickLogin = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await signIn("student-quick", { redirect: false });
      if (res?.error) {
        setErrorMsg("입장 처리 실패: " + res.error);
        setLoading(false);
      } else {
        window.location.href = "/";
      }
    } catch {
      setErrorMsg("입장 중 오류가 발생했습니다.");
      setLoading(false);
    }
  };

  // 관리자/교직원 로그인
  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminId || !adminPassword) {
      setErrorMsg("관리자 아이디와 비밀번호를 모두 입력해주세요.");
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    const res = await signIn("credentials", {
      studentNo: adminId.trim(),
      password: adminPassword,
      redirect: false,
    });

    if (res?.error) {
      setErrorMsg(res.error);
      setLoading(false);
    } else {
      window.location.href = "/admin";
    }
  };

  return (
    <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-200 p-6 sm:p-8 space-y-6">
      {/* 학교 로고 & 타이틀 */}
      <div className="text-center space-y-2">
        <div className="w-16 h-16 rounded-full bg-white border border-slate-200 p-1 flex items-center justify-center mx-auto shadow-md overflow-hidden">
          <img
            src="/logo.png"
            alt="충렬고등학교 로고"
            className="w-full h-full object-contain"
          />
        </div>
        <h1 className="text-2xl font-black tracking-tight text-slate-900">
          {SCHOOL_CONFIG.siteName}
        </h1>
        <p className="text-xs font-semibold text-blue-600 bg-blue-50 inline-block px-2.5 py-1 rounded-full border border-blue-200">
          🏫 {SCHOOL_CONFIG.name} 구성원 전용
        </p>
        <p className="text-xs text-slate-500">
          잃어버린 소지품을 쉽고 빠르게 찾는 교내 안전 플랫폼
        </p>
      </div>

      {/* 에러 메시지 알림 */}
      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-start gap-2 animate-in fade-in">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* 1. 학생 로그인 섹션 (대형 버튼) */}
      <div className="space-y-3 pt-2">
        <button
          onClick={handleStudentQuickLogin}
          disabled={loading}
          className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-800 text-white font-black text-base sm:text-lg shadow-xl shadow-blue-500/25 flex items-center justify-center gap-3 transition-all transform active:scale-[0.98] disabled:opacity-50"
        >
          <span>🎒</span>
          <span>{loading ? "입장 처리 중..." : "충렬고 학생으로 바로 시작하기"}</span>
          <ArrowRight className="w-5 h-5 ml-1" />
        </button>

        <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-100 space-y-1">
          <div className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            별도 계정 연동이나 회원가입 없이 즉시 이용
          </div>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            게시글을 작성할 때 <strong>본인의 학번과 실명</strong>을 정확하게 기재해 주시면 됩니다.
          </p>
        </div>
      </div>

      {/* 2. 관리자 로그인 섹션 (작고 깔끔하게) */}
      <div className="pt-4 border-t border-slate-100 text-center">
        {!showAdminForm ? (
          <button
            onClick={() => {
              setErrorMsg(null);
              setShowAdminForm(true);
            }}
            className="text-xs text-slate-400 hover:text-slate-600 transition-colors flex items-center justify-center gap-1.5 mx-auto py-1"
          >
            <Lock className="w-3.5 h-3.5 text-slate-400" />
            교직원 / 관리자 로그인
          </button>
        ) : (
          <form
            onSubmit={handleAdminLogin}
            className="space-y-3 text-left p-4 bg-slate-50 rounded-2xl border border-slate-200 animate-in fade-in"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-blue-600" />
                교직원 / 관리자 전용
              </span>
              <button
                type="button"
                onClick={() => setShowAdminForm(false)}
                className="text-[11px] text-slate-400 hover:text-slate-600"
              >
                닫기
              </button>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-600 mb-1 block">
                교번 / 관리자 ID
              </label>
              <input
                type="text"
                value={adminId}
                onChange={(e) => setAdminId(e.target.value)}
                placeholder="예: T9901"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-600 mb-1 block">
                비밀번호
              </label>
              <input
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                placeholder="비밀번호 입력"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl shadow-sm transition-colors disabled:opacity-50"
            >
              {loading ? "확인 중..." : "관리자 로그인"}
            </button>
          </form>
        )}
      </div>

      {/* 하단 개인정보처리방침 안내 */}
      <div className="text-center pt-1">
        <Link
          href="/privacy"
          className="text-[11px] text-slate-400 hover:text-slate-600 underline flex items-center justify-center gap-1"
        >
          <BookOpen className="w-3 h-3" />
          교내 개인정보 처리방침
        </Link>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4">
      <Suspense fallback={<div className="text-slate-400 text-xs">화면 로딩 중...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
