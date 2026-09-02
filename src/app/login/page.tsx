"use client";

import React, { useState, useEffect, Suspense } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { ShieldCheck, Lock, AlertCircle, ArrowRight, BookOpen } from "lucide-react";
import Link from "next/link";
import { SCHOOL_CONFIG } from "@/lib/constants";

function LoginForm() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const errorParam = searchParams.get("error");

  const [activeTab, setActiveTab] = useState<"GOOGLE" | "STUDENT_NO">("GOOGLE");
  const [studentNo, setStudentNo] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (status === "authenticated") {
      router.push("/");
    }
  }, [status, router]);

  useEffect(() => {
    if (errorParam === "InvalidDomain") {
      setErrorMsg(
        `허용되지 않은 구글 계정입니다. 학교 이메일(${SCHOOL_CONFIG.allowedGoogleDomains.join(
          ", "
        )})로만 로그인할 수 있습니다.`
      );
    } else if (errorParam === "Suspended") {
      setErrorMsg("교내 규정 위반으로 계정이 일시 정지되었습니다. 학생실에 문의하세요.");
    }
  }, [errorParam]);

  const handleCredentialsLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentNo || !password) {
      setErrorMsg("학번과 비밀번호를 입력해주세요.");
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    const res = await signIn("credentials", {
      studentNo,
      name,
      password,
      redirect: false,
    });

    if (res?.error) {
      setErrorMsg(res.error);
      setLoading(false);
    } else {
      window.location.href = "/";
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
          외부인·익명·장난 게시를 차단하는 교내 분실물 안전 플랫폼
        </p>
      </div>

      {/* 에러 메시지 알림 */}
      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-start gap-2 animate-in fade-in">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* 탭 전환: 구글 로그인 (기본) vs 학번 로그인 (보조) */}
      <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-xl text-xs font-bold">
        <button
          onClick={() => {
            setActiveTab("GOOGLE");
            setErrorMsg(null);
          }}
          className={`py-2 rounded-lg transition-all ${
            activeTab === "GOOGLE"
              ? "bg-white text-blue-700 shadow-sm font-extrabold"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          학교 구글 계정
        </button>
        <button
          onClick={() => {
            setActiveTab("STUDENT_NO");
            setErrorMsg(null);
          }}
          className={`py-2 rounded-lg transition-all ${
            activeTab === "STUDENT_NO"
              ? "bg-white text-blue-700 shadow-sm font-extrabold"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          학번·명단 인증
        </button>
      </div>

      {/* Tab 1: 구글 로그인 (기본 권장) */}
      {activeTab === "GOOGLE" && (
        <div className="space-y-4">
          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-xs text-slate-600 space-y-1.5">
            <div className="font-bold text-slate-800 flex items-center gap-1">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              학교 Google Workspace 연동
            </div>
            <p className="text-[11px] text-slate-500">
              허용 도메인: <strong>{SCHOOL_CONFIG.allowedGoogleDomains.join(", ")}</strong>
            </p>
            <p className="text-[11px] text-slate-400">
              개인 Gmail이나 외부 학교 계정은 접속이 원천 차단됩니다.
            </p>
          </div>

          <button
            onClick={() => signIn("google", { callbackUrl: "/" })}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl bg-white hover:bg-slate-50 text-slate-800 font-bold text-sm border border-slate-300 shadow-sm transition-all active:scale-[0.99]"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"
              />
              <path
                fill="#FBBC05"
                d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
              />
            </svg>
            학교 구글 계정으로 로그인
          </button>
        </div>
      )}

      {/* Tab 2: 학번 + 이름 인증 로그인 (보조) */}
      {activeTab === "STUDENT_NO" && (
        <form onSubmit={handleCredentialsLogin} className="space-y-3.5">
          <div className="bg-blue-50/70 p-3 rounded-xl border border-blue-200 text-[11px] text-blue-900">
            💡 관리자가 업로드한 <strong>재학생 명단</strong>과 대조 후 로그인됩니다. 최초 비밀번호(PIN)는 <strong>1234</strong> 입니다.
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              학번 (6자리)
            </label>
            <input
              type="text"
              value={studentNo}
              onChange={(e) => setStudentNo(e.target.value)}
              placeholder="예: 240101 (입학년도2+반2+번호2)"
              className="w-full text-xs p-3 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              이름 (실명)
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: 김민우"
              className="w-full text-xs p-3 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              비밀번호 (또는 초기 PIN)
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="초기값: 1234"
              className="w-full text-xs p-3 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition-colors"
          >
            {loading ? "명단 확인 중..." : "학적 명단 대조 및 로그인"}
          </button>
        </form>
      )}

      {/* 하단 개인정보처리방침 안내 */}
      <div className="text-center pt-2">
        <Link
          href="/privacy"
          className="text-[11px] text-slate-500 hover:text-blue-600 underline flex items-center justify-center gap-1"
        >
          <BookOpen className="w-3 h-3" />
          교내 개인정보 처리방침 확인하기
        </Link>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4">
      <Suspense fallback={<div className="text-slate-400 text-xs">로그인 화면 로딩 중...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
