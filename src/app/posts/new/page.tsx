"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Camera, AlertCircle, Sparkles, MapPin, Tag, ShieldCheck, X, HelpCircle } from "lucide-react";
import { SCHOOL_CONFIG } from "@/lib/constants";
import { sanitizeAndCompressImage } from "@/lib/image-processor";

export default function NewPostPage() {
  const router = useRouter();
  const { data: session } = useSession();

  const [type, setType] = useState<"LOST" | "FOUND" | "COMMUNITY">("FOUND");
  const [category, setCategory] = useState(SCHOOL_CONFIG.categories[0]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [placeBuilding, setPlaceBuilding] = useState(SCHOOL_CONFIG.buildings[0]);
  const [placeDetail, setPlaceDetail] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [images, setImages] = useState<string[]>([]);

  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // 태그 추가
  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const val = tagInput.trim().replace(/^#/, "");
      if (val && !tags.includes(val) && tags.length < 5) {
        setTags([...tags, val]);
        setTagInput("");
      }
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  // 사진 업로드 핸들러
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (images.length + files.length > 5) {
      setErrorMsg("사진은 최대 5장까지만 등록 가능합니다.");
      return;
    }

    setUploading(true);
    setErrorMsg(null);

    try {
      for (let i = 0; i < files.length; i++) {
        // 브라우저 캔버스에서 EXIF GPS 메타데이터 제거 및 1200px 압축
        const cleanFile = await sanitizeAndCompressImage(files[i]);
        const formData = new FormData();
        formData.append("file", cleanFile);

        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "사진 업로드 실패");

        setImages((prev) => [...prev, data.url]);
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleRemoveImage = (indexToRemove: number) => {
    setImages(images.filter((_, idx) => idx !== indexToRemove));
  };

  // 글 작성 제출
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      setErrorMsg("제목과 내용을 모두 작성해주세요.");
      return;
    }

    if ((type === "LOST" || type === "FOUND") && images.length === 0) {
      setErrorMsg("정확한 물건 확인과 장난 방지를 위해 사진을 최소 1장 이상 등록해야 합니다.");
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          category,
          title: title.trim(),
          content: content.trim(),
          placeBuilding,
          placeDetail: placeDetail.trim(),
          images,
          tags,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "글 등록 중 오류가 발생했습니다.");
      }

      router.push(`/posts/${data.post.id}`);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-4">
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-5 sm:p-7 space-y-5">
        <div>
          <h1 className="text-xl font-black text-slate-900">
            분실 / 습득물 등록하기
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            학생실 인수인계 장소와 실명 정보를 기반으로 안전하게 등록됩니다.
          </p>
        </div>

        {errorMsg && (
          <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-start gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* 작성 가이드라인 인라인 배너 */}
        <div className="bg-blue-50/80 border border-blue-200 rounded-2xl p-4 text-xs text-blue-900 space-y-1">
          <div className="flex items-center gap-1.5 font-bold text-blue-800">
            <ShieldCheck className="w-4 h-4 text-blue-600 flex-shrink-0" />
            안전 분실물 등록 수칙
          </div>
          <p className="text-[11px] leading-relaxed text-blue-700">
            • <strong>겉모습만 공개:</strong> 지갑 안 신분증 실명이나 케이스 안쪽 고유 낙서·스티커 등은 적지 마세요.
          </p>
          <p className="text-[11px] leading-relaxed text-blue-700">
            • 고유 특징은 분실자가 수령 신청을 할 때 <strong>본인 확인용 퀴즈</strong>로 활용됩니다.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 1. 글 유형 선택 (3버튼) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              게시글 유형 <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setType("FOUND")}
                className={`py-2.5 rounded-xl text-xs font-bold transition-all border ${
                  type === "FOUND"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-300 shadow-sm ring-2 ring-emerald-400"
                    : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                }`}
              >
                ✨ 주웠어요 (습득물)
              </button>
              <button
                type="button"
                onClick={() => setType("LOST")}
                className={`py-2.5 rounded-xl text-xs font-bold transition-all border ${
                  type === "LOST"
                    ? "bg-rose-50 text-rose-700 border-rose-300 shadow-sm ring-2 ring-rose-400"
                    : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                }`}
              >
                🚨 잃어버렸어요 (분실물)
              </button>
            </div>
          </div>

          {/* 2. 사진 업로드 (최대 5장, 첫 장 썸네일) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              사진 등록 (최대 5장) {type !== "COMMUNITY" && <span className="text-rose-500">*필수</span>}
            </label>
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
              {/* 추가 버튼 */}
              {images.length < 5 && (
                <label className="w-20 h-20 rounded-2xl border-2 border-dashed border-slate-300 hover:border-blue-500 hover:bg-blue-50/50 flex flex-col items-center justify-center cursor-pointer text-slate-400 hover:text-blue-600 transition-colors flex-shrink-0">
                  <Camera className="w-6 h-6 mb-1" />
                  <span className="text-[10px] font-bold">
                    {uploading ? "업로드..." : `${images.length}/5`}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    disabled={uploading}
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </label>
              )}

              {/* 업로드된 사진 미리보기 */}
              {images.map((url, idx) => (
                <div
                  key={idx}
                  className="relative w-20 h-20 rounded-2xl overflow-hidden border border-slate-200 flex-shrink-0 bg-slate-100 group"
                >
                  <img src={url} alt={`미리보기 ${idx}`} className="w-full h-full object-cover" />
                  {idx === 0 && (
                    <span className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[9px] font-bold text-center py-0.5">
                      대표사진
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(idx)}
                    className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-0.5 hover:bg-rose-600 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* 3. 제목 & 카테고리 */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-1">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                물품 카테고리 <span className="text-rose-500">*</span>
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full text-xs p-3 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {SCHOOL_CONFIG.categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                제목 <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="예: 신관 3층 복도에서 주운 에어팟 프로 본체"
                className="w-full text-xs p-3 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* 4. 분실/발견 장소 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                교내 건물/구역 <span className="text-rose-500">*</span>
              </label>
              <select
                value={placeBuilding}
                onChange={(e) => setPlaceBuilding(e.target.value)}
                className="w-full text-xs p-3 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {SCHOOL_CONFIG.buildings.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                상세 위치 (층, 반, 근처 시설)
              </label>
              <input
                type="text"
                value={placeDetail}
                onChange={(e) => setPlaceDetail(e.target.value)}
                placeholder="예: 2층 2-3반 앞 정수기 옆"
                className="w-full text-xs p-3 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* 5. 본문 내용 */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              상세 설명 <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={4}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="물건을 발견한 상황이나 상태를 설명해주세요. (개인 전화번호나 외부 메신저 링크는 감지 시 경고/차단됩니다.)"
              className="w-full text-xs p-3 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* 6. 특징 태그 키워드 */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              특징 키워드 태그 (알림 및 검색 매칭)
            </label>
            <div className="flex items-center gap-1.5 flex-wrap p-2 bg-slate-50 border border-slate-300 rounded-xl focus-within:ring-2 focus-within:ring-blue-500 focus-within:bg-white">
              {tags.map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-md"
                >
                  #{t}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(t)}
                    className="hover:text-blue-950"
                  >
                    ×
                  </button>
                </span>
              ))}
              {tags.length < 5 && (
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleAddTag}
                  placeholder={tags.length === 0 ? "엔터로 키워드 추가 (예: 에어팟, 민트색)" : ""}
                  className="text-xs bg-transparent border-none focus:outline-none flex-1 min-w-[120px]"
                />
              )}
            </div>
          </div>

          {/* 7. 인수인계 안내 */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-600 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-slate-500 flex-shrink-0" />
            <span>
              기본 인수인계 장소: <strong>{SCHOOL_CONFIG.defaultHandoverPlace}</strong>
            </span>
          </div>

          {/* 제출 버튼 */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-md transition-all active:scale-[0.99]"
          >
            {loading ? "등록 중..." : "게시글 등록 완료"}
          </button>
        </form>
      </div>
    </div>
  );
}
