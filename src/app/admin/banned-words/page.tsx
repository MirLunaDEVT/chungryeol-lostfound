"use client";

import React, { useState, useEffect } from "react";
import AdminNav from "@/components/admin/AdminNav";
import { VolumeX, Plus, Trash2, ShieldCheck, AlertCircle } from "lucide-react";

export default function AdminBannedWordsPage() {
  const [words, setWords] = useState<any[]>([]);
  const [newWord, setNewWord] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const fetchWords = async () => {
    try {
      const res = await fetch("/api/admin/banned-words");
      const data = await res.json();
      if (data.words) setWords(data.words);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWords();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWord.trim()) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/banned-words", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ word: newWord.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setNewWord("");
        fetchWords();
      } else {
        alert(data.error);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/admin/banned-words?id=${id}`, { method: "DELETE" });
      setWords(words.filter((w) => w.id !== id));
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
            교내 금칙어 및 비속어 사전 관리
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            등록된 단어가 포함된 게시글, 댓글, 채팅은 작성 단계에서 즉시 자동 차단됩니다.
          </p>
        </div>

        {/* 금칙어 등록 폼 */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-3">
          <h2 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
            <VolumeX className="w-4 h-4 text-rose-600" />
            새 금칙어 추가
          </h2>

          <form onSubmit={handleAdd} className="flex gap-2">
            <input
              type="text"
              value={newWord}
              onChange={(e) => setNewWord(e.target.value)}
              placeholder="차단할 비속어 또는 금칙어 입력..."
              className="flex-1 text-xs p-3 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
            <button
              type="submit"
              disabled={submitting || !newWord.trim()}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow transition-colors flex items-center gap-1"
            >
              <Plus className="w-4 h-4" />
              추가
            </button>
          </form>
        </div>

        {/* 금칙어 목록 */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-3">
          <h2 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            현재 적용 중인 금칙어 목록 ({words.length}개)
          </h2>

          <div className="flex items-center gap-2 flex-wrap pt-1">
            {loading ? (
              <span className="text-xs text-slate-400">불러오는 중...</span>
            ) : words.length === 0 ? (
              <span className="text-xs text-slate-400">등록된 금칙어가 없습니다.</span>
            ) : (
              words.map((w) => (
                <span
                  key={w.id}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 border border-rose-200 text-rose-800 font-semibold text-xs rounded-xl"
                >
                  {w.word}
                  <button
                    onClick={() => handleDelete(w.id)}
                    className="text-rose-400 hover:text-rose-700"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </span>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
