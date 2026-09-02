"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Users,
  AlertTriangle,
  UserX,
  FileSpreadsheet,
  Shield,
  Box,
  VolumeX,
} from "lucide-react";

export default function AdminNav() {
  const pathname = usePathname();

  const links = [
    { href: "/admin", label: "대시보드", icon: BarChart3, exact: true },
    { href: "/admin/roster", label: "학적 명단(CSV)", icon: FileSpreadsheet },
    { href: "/admin/reports", label: "신고 관리", icon: AlertTriangle },
    { href: "/admin/users", label: "계정·정지", icon: UserX },
    { href: "/admin/banned-words", label: "금칙어 관리", icon: VolumeX },
    { href: "/admin/lockers", label: "학생실 보관함", icon: Box },
  ];

  return (
    <div className="bg-white border-b border-slate-200 px-4 py-2.5 overflow-x-auto no-scrollbar shadow-xs">
      <div className="flex items-center gap-2">
        <span className="text-xs font-black text-amber-800 bg-amber-100 px-2 py-1 rounded-lg flex items-center gap-1 flex-shrink-0">
          <Shield className="w-3.5 h-3.5" />
          관리자 메뉴
        </span>

        <div className="flex items-center gap-1">
          {links.map((link) => {
            const isActive = link.exact
              ? pathname === link.href
              : pathname.startsWith(link.href);

            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  isActive
                    ? "bg-slate-900 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {link.label}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
