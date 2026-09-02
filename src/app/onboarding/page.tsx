"use client";

import React, { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { ShieldCheck, CheckCircle2, AlertCircle, ChevronRight, School } from "lucide-react";
import { SCHOOL_CONFIG } from "@/lib/constants";

export default function OnboardingPage() {
  const { data: session, update } = useSession();
  const router = useRouter();

  const [step, setStep] = useState<1 | 2>(1); // 1: 온보딩 가이드 3장, 2: 학적 인증 폼
  const [guideIndex, setGuideIndex] = useState(0);

  const [studentNo, setStudentNo] = useState("");
  const [name, setName] = useState(session?.user?.name || "");
  const [grade, setGrade] = useState("1");
  const [classNo, setClassNo] = useState("1");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const guideSlides = [
    {
      title: "우리 학교 구성원만 쓰는 안전한 분실물 찾기",
      desc: "외부인과 익명 장난을 차단하기 위해 모든 글은 실명 기반으로 등록되며, 재학생 명단 대조를 통해 학교 구성원만 이용할 수 있습니다.",
      icon: "🏫",
    },
    {
      title: "사진은 필수, 고유 정보는 수령 시 확인용으로!",
      desc: "물건을 주웠다면 겉모습 사진을 올려주세요. 지갑 안의 신분증 이름이나 에어팟 케이스 안쪽 스티커 같은 고유 특징은 글에 적지 말고 수령 질문 확인용으로 남겨두세요.",
      icon: "📸",
    },
    {
      title: "수령 승인 후 인수인계는 학생실에서",
      desc: "잃어버린 학생이 수령을 신청하면 습득자가 고유 특징을 확인 후 승인합니다. 승인 후 안전을 위해 본관 1층 학생안전복지부(학생실)에서 만나 돌려주세요.",
      icon: "🤝",
    },
  ];

  const handleCompleteOnboarding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentNo.trim() || !name.trim()) {
      setErrorMsg("학번과 이름을 모두 입력해주세요.");
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentNo: studentNo.trim(),
          name: name.trim(),
          grade: Number(grade),
          classNo: Number(classNo),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "학적 확인에 실패했습니다.");
      }

      // 세션 갱신
      await update({
        user: {
          name: data.user.name,
          studentNo: data.user.studentNo,
          studentNoMasked: data.user.studentNoMasked,
          status: "ACTIVE",
        },
      });

      router.push("/");
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-200 p-6 sm:p-8">
        {step === 1 ? (
          /* Step 1: 온보딩 가이드 3장 슬라이드 */
          <div className="space-y-6 text-center">
            <div className="w-20 h-20 mx-auto rounded-3xl bg-blue-50 border border-blue-100 flex items-center justify-center text-4xl shadow-inner">
              {guideSlides[guideIndex].icon}
            </div>

            <div className="space-y-2">
              <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full">
                이용 가이드 {guideIndex + 1} / 3
              </span>
              <h2 className="text-lg font-black text-slate-900 leading-snug">
                {guideSlides[guideIndex].title}
              </h2>
              <p className="text-xs text-slate-500 leading-relaxed px-2">
                {guideSlides[guideIndex].desc}
              </p>
            </div>

            {/* 인디케이터 점 */}
            <div className="flex justify-center gap-1.5 pt-2">
              {guideSlides.map((_, idx) => (
                <span
                  key={idx}
                  className={`h-1.5 rounded-full transition-all ${
                    idx === guideIndex ? "w-6 bg-blue-600" : "w-1.5 bg-slate-200"
                  }`}
                />
              ))}
            </div>

            <div className="flex gap-2 pt-4">
              {guideIndex < 2 ? (
                <button
                  onClick={() => setGuideIndex((prev) => prev + 1)}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-1 transition-colors"
                >
                  다음 <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={() => setStep(2)}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-1 transition-colors"
                >
                  학적 정보 인증 시작하기 <CheckCircle2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        ) : (
          /* Step 2: 학적 정보 입력 폼 */
          <div className="space-y-5">
            <div className="text-center space-y-1">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-2">
                <School className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-black text-slate-900">
                재학생 명단 대조 인증
              </h2>
              <p className="text-xs text-slate-500">
                학교 마스터 명단과 대조하여 본인 확인을 완료합니다.
              </p>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-start gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleCompleteOnboarding} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  학번 (6자리) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={studentNo}
                  onChange={(e) => setStudentNo(e.target.value)}
                  placeholder="예: 240102 (입학년도2+반2+번호2)"
                  className="w-full text-xs p-3 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  타인에게는 앞 4자리만 보이며 끝 2자리는 마스킹(2401**) 처리됩니다.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  이름 (실명) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="예: 정서윤"
                  className="w-full text-xs p-3 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    학년
                  </label>
                  <select
                    value={grade}
                    onChange={(e) => setGrade(e.target.value)}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="1">1학년</option>
                    <option value="2">2학년</option>
                    <option value="3">3학년</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    반
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="15"
                    value={classNo}
                    onChange={(e) => setClassNo(e.target.value)}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-500 leading-relaxed">
                ✓ 실명 확인 및 교내 신뢰 유지를 위해 명단과 일치하지 않는 정보는 가입이 제한됩니다.
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition-colors"
              >
                {loading ? "학적 대조 확인 중..." : "인증 완료하고 시작하기"}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
