import React from "react";
import Link from "next/link";
import { Plus } from "lucide-react";

export default function FloatingWriteButton() {
  return (
    <Link
      href="/posts/new"
      className="fixed bottom-20 right-5 md:bottom-8 md:right-8 z-20 flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-3 rounded-full shadow-float hover:scale-105 active:scale-95 transition-all min-h-[48px] min-w-[48px]"
      title="분실/습득물 글쓰기"
    >
      <Plus className="w-5 h-5 stroke-[2.5]" />
      <span className="text-sm hidden sm:inline">글쓰기</span>
    </Link>
  );
}
