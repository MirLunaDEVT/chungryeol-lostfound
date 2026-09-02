"use client";

import React, { useState } from "react";
import AdminNav from "@/components/admin/AdminNav";
import { Megaphone, Plus, CheckCircle } from "lucide-react";
import { useRouter } from "next/navigation";

export default function AdminNoticesPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    setLoading(true);
    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "NOTICE",
          category: "기타",
          title: `📢 [공지] ${title.trim()}`,
          content: content.trim(),
          placeBuilding: "본관",
          placeDetail: "1층 학생안전복지부",
          isPinned: true,
        }),
      });

      if (res.ok) {
        setSuccess(true);
        setTitle("");
        setContent("");
        setTimeout(() => {
          router.push("/");
        }, 1200);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <AdminNav />

      <div className="max-w-2xl mx-auto px-4 space-y-5 pb-12">
        <div>
          <h1 className="text-xl font-black text-slate-900">
            교내 분실물 공지사항 작성
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            작성된 공지는 메인 피드 최상단에 고정 배너로 노출됩니다.
          </p>
        </div>

        {success && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            공지사항이 성공적으로 등록되어 피드 상단에 고정되었습니다.
          </div>
        )}

        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                공지 제목
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="예: 1학기말 미수령 분실물 일괄 폐기 및 기부 안내"
                className="w-full text-xs p-3 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                공지 내용
              </label>
              <textarea
                rows={5}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="학생들에게 안내할 상세 공지 내용을 입력하세요."
                className="w-full text-xs p-3 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !title.trim() || !content.trim()}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md transition-colors flex items-center justify-center gap-1.5"
            >
              <Megaphone className="w-4 h-4" />
              {loading ? "등록 중..." : "피드 상단 고정 공지 등록"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
