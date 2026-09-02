"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, PlusCircle, Bell, User } from "lucide-react";

export default function BottomNav() {
  const pathname = usePathname();

  // 로그인 및 온보딩 화면에서는 하단 탭바 숨김
  if (pathname === "/login" || pathname === "/onboarding") {
    return null;
  }

  const navItems = [
    { href: "/", label: "홈", icon: Home, exact: true },
    { href: "/search", label: "검색", icon: Search },
    { href: "/posts/new", label: "글쓰기", icon: PlusCircle, isHighlight: true },
    { href: "/alerts", label: "알림", icon: Bell },
    { href: "/me", label: "마이/예약", icon: User },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur border-t border-slate-200 shadow-lg md:hidden">
      <div className="max-w-md mx-auto grid grid-cols-5 h-16 items-center px-1">
        {navItems.map((item) => {
          const isActive = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);

          if (item.isHighlight) {
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center justify-center -mt-4 group"
              >
                <div className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/30 group-active:scale-95 transition-transform">
                  <item.icon className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-bold text-blue-600 mt-1">
                  {item.label}
                </span>
              </Link>
            );
          }

          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center py-1 transition-colors min-h-[44px] ${
                isActive ? "text-blue-600 font-bold" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? "stroke-[2.5px]" : "stroke-2"}`} />
              <span className="text-[10px] mt-0.5">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
