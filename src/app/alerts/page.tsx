"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Bell, Tag, Plus, Trash2, CheckCheck, Clock, Inbox, ArrowRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";

export default function AlertsPage() {
  const { data: session } = useSession();
  const [keywords, setKeywords] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [newKeyword, setNewKeyword] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const [kwRes, notifRes] = await Promise.all([
        fetch("/api/alerts/keywords"),
        fetch("/api/alerts"),
      ]);
      const kwData = await kwRes.json();
      const notifData = await notifRes.json();

      if (kwData.keywords) setKeywords(kwData.keywords);
      if (notifData.notifications) setNotifications(notifData.notifications);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddKeyword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyword.trim()) return;

    setSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/alerts/keywords", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword: newKeyword.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "키워드 등록 실패");

      setNewKeyword("");
      fetchData();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteKeyword = async (id: string) => {
    try {
      await fetch(`/api/alerts/keywords?id=${id}`, { method: "DELETE" });
      setKeywords(keywords.filter((k) => k.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await fetch("/api/alerts", { method: "PATCH" });
      setNotifications(notifications.map((n) => ({ ...n, isRead: true })));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6">
      {/* 1. 키워드 알림 구독 관리 */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <Tag className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-black text-slate-900">
              키워드 알림 구독
            </h2>
            <p className="text-xs text-slate-500">
              새 글이 올라왔을 때 키워드가 포함되어 있으면 즉시 알려드립니다.
            </p>
          </div>
        </div>

        {errorMsg && (
          <div className="text-xs text-rose-600 font-semibold p-2.5 bg-rose-50 rounded-xl">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleAddKeyword} className="flex gap-2">
          <input
            type="text"
            value={newKeyword}
            onChange={(e) => setNewKeyword(e.target.value)}
            placeholder="알림받을 키워드 (예: 에어팟, 민트색 텀블러, 학생증)"
            className="flex-1 text-xs p-3 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={submitting || !newKeyword.trim()}
            className="px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow transition-colors flex items-center gap-1 flex-shrink-0"
          >
            <Plus className="w-4 h-4" />
            등록
          </button>
        </form>

        {/* 등록된 키워드 칩 목록 */}
        <div className="space-y-1.5">
          <span className="text-[11px] font-bold text-slate-500">
            구독 중인 키워드 ({keywords.length}/10):
          </span>
          <div className="flex items-center gap-2 flex-wrap">
            {keywords.length > 0 ? (
              keywords.map((k) => (
                <span
                  key={k.id}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 text-blue-800 text-xs font-bold border border-blue-200 shadow-sm"
                >
                  #{k.keyword}
                  <button
                    type="button"
                    onClick={() => handleDeleteKeyword(k.id)}
                    className="text-blue-400 hover:text-rose-600 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </span>
              ))
            ) : (
              <span className="text-xs text-slate-400">
                등록된 키워드가 없습니다.
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 2. 인앱 알림 센터 */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
              <Bell className="w-4 h-4" />
            </div>
            <h2 className="text-base font-black text-slate-900">
              알림함 ({notifications.filter((n) => !n.isRead).length}건 안읽음)
            </h2>
          </div>

          {notifications.some((n) => !n.isRead) && (
            <button
              onClick={handleMarkAllAsRead}
              className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              모두 읽음
            </button>
          )}
        </div>

        {/* 알림 리스트 */}
        <div className="divide-y divide-slate-100">
          {notifications.length > 0 ? (
            notifications.map((n) => (
              <Link
                key={n.id}
                href={n.link || "#"}
                className={`block py-3.5 px-2 rounded-2xl transition-colors hover:bg-slate-50 ${
                  !n.isRead ? "bg-blue-50/40" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold text-slate-900">
                        {n.title}
                      </h4>
                      {!n.isRead && (
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                      )}
                    </div>
                    <p className="text-xs text-slate-600 mt-1 leading-snug">
                      {n.body}
                    </p>
                  </div>
                  <span className="text-[10px] text-slate-400 whitespace-nowrap flex items-center gap-0.5 mt-0.5">
                    <Clock className="w-3 h-3" />
                    {formatDistanceToNow(new Date(n.createdAt), {
                      addSuffix: true,
                      locale: ko,
                    })}
                  </span>
                </div>
              </Link>
            ))
          ) : (
            <div className="text-center py-10 text-slate-400 space-y-2">
              <Inbox className="w-8 h-8 mx-auto text-slate-300" />
              <p className="text-xs">수신된 알림이 없습니다.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
