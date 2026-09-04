"use client";

import React, { useState, useEffect, Suspense } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { AlertCircle, Lock } from "lucide-react";
import Link from "next/link";
import { SCHOOL_CONFIG } from "@/lib/constants";

function LoginForm() {
  const { status } = useSession();
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // 관리자 폼 토글
  const [showAdminForm, setShowAdminForm] = useState(false);
  const [adminId, setAdminId] = useState("");
  const [adminPassword, setAdminPassword] = useState("");

  useEffect(() => {
    if (status === "authenticated") {
      router.push("/");
    }
  }, [status, router]);

  // 학생 바로 입장 (1클릭)
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
      setErrorMsg("입장 처리 중 오류가 발생했습니다. 다시 시도해주세요.");
      setLoading(false);
    }
  };

  // 관리자/교직원 로그인
  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminId || !adminPassword) {
      setErrorMsg("교번(ID)과 비밀번호를 모두 입력해주세요.");
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
    <div className="w-full max-w-[390px] bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8 space-y-6">
      {/* 헤더 */}
      <div className="text-center space-y-2.5">
        <div className="w-14 h-14 rounded-full bg-white border border-slate-100 flex items-center justify-center mx-auto overflow-hidden shadow-xs">
          <img
            src="/logo.png"
            alt="충렬고등학교 로고"
            className="w-full h-full object-contain"
          />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            {SCHOOL_CONFIG.siteName}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            충렬고등학교 교내 분실물 확인 및 반환 서비스
          </p>
        </div>
      </div>

      {/* 에러 알림 */}
      {errorMsg && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-start gap-2 animate-in fade-in">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* 1. 학생 입장 버튼 (자연스럽고 신뢰감 있는 단색 버튼) */}
      <div className="space-y-3 pt-1">
        <button
          onClick={handleStudentQuickLogin}
          disabled={loading}
          className="w-full h-12 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-medium text-sm flex items-center justify-center transition-all disabled:opacity-50 active:scale-[0.99] cursor-pointer"
        >
          {loading ? "접속 중..." : "학생 바로 입장하기"}
        </button>

        <p className="text-xs text-slate-500 text-center leading-relaxed">
          별도 로그인 없이 바로 게시글을 확인하실 수 있습니다.
          <br />
          <span className="text-[11px] text-slate-400">
            (게시글 작성 또는 수령 신청 시에만 학번·이름을 입력합니다)
          </span>
        </p>
      </div>

      {/* 2. 교직원/관리자 로그인 영역 (하단에 작고 단정하게 분리) */}
      <div className="pt-4 border-t border-slate-100 text-center">
        {!showAdminForm ? (
          <button
            onClick={() => {
              setErrorMsg(null);
              setShowAdminForm(true);
            }}
            className="text-xs text-slate-400 hover:text-slate-600 transition-colors inline-flex items-center gap-1.5 py-1"
          >
            <Lock className="w-3.5 h-3.5" />
            교직원 및 관리자 로그인
          </button>
        ) : (
          <form
            onSubmit={handleAdminLogin}
            className="space-y-3 text-left p-4 bg-slate-50 rounded-xl border border-slate-200 animate-in fade-in"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700">
                교직원 / 관리자 로그인
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
              <label className="text-[11px] font-medium text-slate-600 mb-1 block">
                아이디 (교번)
              </label>
              <input
                type="text"
                value={adminId}
                onChange={(e) => setAdminId(e.target.value)}
                placeholder="예: T9901"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white focus:ring-1 focus:ring-slate-900 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="text-[11px] font-medium text-slate-600 mb-1 block">
                비밀번호
              </label>
              <input
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                placeholder="비밀번호"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white focus:ring-1 focus:ring-slate-900 focus:outline-hidden"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-9 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? "확인 중..." : "로그인"}
            </button>
          </form>
        )}
      </div>

      {/* 개인정보처리방침 링크 */}
      <div className="text-center pt-1">
        <Link
          href="/privacy"
          className="text-[11px] text-slate-400 hover:text-slate-500 underline"
        >
          교내 개인정보 처리방침
        </Link>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <Suspense fallback={<div className="text-slate-400 text-xs">화면 로딩 중...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
