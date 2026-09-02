"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Search, Bell, Shield, Sparkles, User as UserIcon } from "lucide-react";
import DemoSwitcher from "./DemoSwitcher";
import { SCHOOL_CONFIG } from "@/lib/constants";

export default function Header() {
  const { data: session } = useSession();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (session?.user) {
      fetch("/api/alerts")
        .then((res) => res.json())
        .then((data) => {
          if (typeof data.unreadCount === "number") {
            setUnreadCount(data.unreadCount);
          }
        })
        .catch((err) => console.error(err));
    }
  }, [session]);

  const isAdmin =
    session?.user?.role === "ADMIN" || session?.user?.role === "TEACHER";

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200 shadow-sm transition-all">
      <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* 로고 & 학교명 */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white font-black text-xs shadow-md group-hover:scale-105 transition-transform">
            충렬
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-base tracking-tight text-slate-900 group-hover:text-blue-600 transition-colors">
                {SCHOOL_CONFIG.siteName}
              </span>
              <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-blue-50 text-blue-600 border border-blue-200">
                {SCHOOL_CONFIG.name}
              </span>
            </div>
            <p className="text-[10px] text-slate-400 -mt-0.5 hidden sm:block">
              교내 분실물 안전 반환 & 생활 커뮤니티
            </p>
          </div>
        </Link>

        {/* 우측 도구: 검색, 알림, 데모 스위처, 관리자/MY */}
        <div className="flex items-center gap-2 sm:gap-3">
          <DemoSwitcher />

          <Link
            href="/search"
            className="p-2 text-slate-600 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-colors"
            title="검색"
          >
            <Search className="w-4 h-4" />
          </Link>

          {session?.user && (
            <Link
              href="/alerts"
              className="relative p-2 text-slate-600 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-colors"
              title="알림 센터"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-bounce">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </Link>
          )}

          {isAdmin && (
            <Link
              href="/admin"
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors shadow-sm"
              title="관리자 대시보드"
            >
              <Shield className="w-3.5 h-3.5 text-amber-600" />
              <span className="hidden sm:inline">관리자</span>
            </Link>
          )}

          {session?.user ? (
            <Link
              href="/me"
              className="flex items-center gap-1.5 pl-1.5 pr-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
            >
              <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-[11px]">
                {session.user.name?.[0] || "👤"}
              </div>
              <span className="font-semibold hidden sm:inline">
                {session.user.name || "사용자"}
              </span>
            </Link>
          ) : (
            <Link
              href="/login"
              className="px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow transition-colors"
            >
              로그인
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
