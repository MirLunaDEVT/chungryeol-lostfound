"use client";

import React, { useState } from "react";
import { PackageCheck, Clock, MapPin, X, ShieldAlert } from "lucide-react";
import { SCHOOL_CONFIG } from "@/lib/constants";

interface ClaimModalProps {
  postId: string;
  postTitle: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const VISIT_TIME_PRESETS = [
  "오늘 점심시간 (12:40~13:20)",
  "오늘 방과후 (16:30~17:00)",
  "내일 아침 등교 (08:20~08:40)",
  "내일 점심시간 (12:40~13:20)",
];

export default function ClaimModal({
  postId,
  postTitle,
  isOpen,
  onClose,
  onSuccess,
}: ClaimModalProps) {
  const [visitTime, setVisitTime] = useState(VISIT_TIME_PRESETS[0]);
  const [customTime, setCustomTime] = useState("");
  const [isCustom, setIsCustom] = useState(false);
  const [notes, setNotes] = useState("");
  const [claimantStudentNo, setClaimantStudentNo] = useState("");
  const [claimantName, setClaimantName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const savedNo = localStorage.getItem("chungryeol_student_no");
      const savedName = localStorage.getItem("chungryeol_student_name");
      if (savedNo) setClaimantStudentNo(savedNo);
      if (savedName) setClaimantName(savedName);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const finalVisitTime = isCustom ? customTime.trim() : visitTime;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!claimantStudentNo.trim() || !claimantName.trim()) {
      setError("신청자의 학번과 실명을 정확히 입력해주세요.");
      return;
    }

    if (!/^[0-9]{4,6}$/.test(claimantStudentNo.trim())) {
      setError("학번은 4~6자리 숫자로 입력해주세요. (예: 3105)");
      return;
    }

    if (!finalVisitTime) {
      setError("학생실 방문 예정 시간을 선택하거나 입력해주세요.");
      return;
    }

    if (!notes.trim() || notes.trim().length < 5) {
      setError("허위 수령 방지를 위해 사진에 없는 본인만의 단서를 최소 5글자 이상 적어주세요.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (typeof window !== "undefined") {
        localStorage.setItem("chungryeol_student_no", claimantStudentNo.trim());
        localStorage.setItem("chungryeol_student_name", claimantName.trim());
      }

      const res = await fetch(`/api/posts/${postId}/claim`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifyingNotes: notes.trim(),
          visitTime: finalVisitTime,
          pickupPlace: SCHOOL_CONFIG.defaultHandoverPlace,
          studentNo: claimantStudentNo.trim(),
          name: claimantName.trim(),
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "수령 예약에 실패했습니다.");
      }

      alert("수령 예약이 완료되었습니다! 안내된 시간에 학생실에서 인수인계받으세요.");
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-5 sm:p-6 relative border border-slate-200 space-y-4">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* 헤더 */}
        <div className="flex items-center gap-2.5 text-blue-600">
          <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 flex-shrink-0">
            <PackageCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black text-slate-900">
              내 물건 찾기 (수령 예약 신청)
            </h2>
            <p className="text-[11px] text-slate-500 truncate max-w-xs">
              대상 물품: <span className="font-bold text-slate-800">"{postTitle}"</span>
            </p>
          </div>
        </div>

        {/* 허위 수령 방지 안내 */}
        <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-3 text-xs text-amber-900 space-y-1">
          <div className="flex items-center gap-1.5 font-bold text-amber-800">
            <ShieldAlert className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span>학생실 공식 인수인계 예약 안내</span>
          </div>
          <p className="text-[11px] text-amber-800 leading-relaxed">
            게시글 사진에 공개되지 않은 <strong>나만의 식별 단서</strong>(케이스 안쪽 스티커, 안감 색상, 일련번호 등)를 적어주시면, 학생실에서 실물 대조 후 안전하게 인수인계합니다.
          </p>
        </div>

        {error && (
          <div className="p-3 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-xl">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 신청자 학번 & 실명 입력 */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
            <label className="block text-xs font-bold text-slate-700">
              수령 신청자 정보 <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-bold text-slate-500 mb-0.5 block">
                  학번 (4자리)
                </label>
                <input
                  type="text"
                  value={claimantStudentNo}
                  onChange={(e) => setClaimantStudentNo(e.target.value.trim())}
                  placeholder="예: 3105"
                  maxLength={6}
                  className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 text-xs font-bold bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 mb-0.5 block">
                  이름 (실명)
                </label>
                <input
                  type="text"
                  value={claimantName}
                  onChange={(e) => setClaimantName(e.target.value.trim())}
                  placeholder="예: 홍길동"
                  maxLength={10}
                  className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 text-xs font-bold bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>
            </div>
          </div>

          {/* 1. 방문 시간 선택 */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-blue-600" />
              학생실 방문 희망 시간 <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-1.5 mb-2">
              {VISIT_TIME_PRESETS.map((preset) => (
                <button
                  type="button"
                  key={preset}
                  onClick={() => {
                    setVisitTime(preset);
                    setIsCustom(false);
                  }}
                  className={`p-2 rounded-xl text-left text-xs font-medium border transition-all ${
                    !isCustom && visitTime === preset
                      ? "bg-blue-50 text-blue-700 border-blue-400 font-bold shadow-xs"
                      : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setIsCustom(true)}
              className={`w-full p-2 rounded-xl text-xs text-left border transition-all ${
                isCustom
                  ? "bg-blue-50 text-blue-700 border-blue-400 font-bold"
                  : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
              }`}
            >
              ✏️ 직접 시간 입력하기...
            </button>

            {isCustom && (
              <input
                type="text"
                value={customTime}
                onChange={(e) => setCustomTime(e.target.value)}
                placeholder="예: 오늘 3교시 쉬는시간 11:30"
                className="mt-2 w-full text-xs p-2.5 bg-white border border-blue-400 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            )}
          </div>

          {/* 2. 본인 확인 단서 (필수) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              비공개 본인 확인 단서 (고유 특징) <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="예: 케이스 뚜껑 안쪽에 노란색 별 스티커가 붙어있고, 오른쪽 유닛에 긁힌 자국이 있습니다."
              className="w-full text-xs p-3 bg-slate-50 border border-slate-300 rounded-2xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none"
            />
            <p className="text-[10px] text-slate-400 mt-1">
              * 이 내용은 습득자와 담당 선생님에게만 안전하게 전달됩니다.
            </p>
          </div>

          {/* 3. 인수인계 장소 */}
          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 text-xs text-slate-600 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <div>
              <span className="font-bold text-slate-800">공식 인수인계 장소:</span>{" "}
              {SCHOOL_CONFIG.defaultHandoverPlace}
            </div>
          </div>

          {/* 하단 버튼 */}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-2xl transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 px-4 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-2xl transition-colors shadow-md flex items-center justify-center gap-1.5"
            >
              {loading ? "예약 처리 중..." : "수령 예약 완료하기"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
