"use client";

import React, { useState } from "react";
import Link from "next/link";
import { MapPin, ThumbsUp, Clock, ShieldCheck } from "lucide-react";
import { TypeBadge, StatusBadge } from "../common/Badge";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";

interface PostCardProps {
  post: {
    id: string;
    type: string;
    category: string;
    title: string;
    body: string;
    placeBuilding: string;
    placeDetail: string;
    status: string;
    isPinned?: boolean;
    occurredAt: string | Date;
    createdAt: string | Date;
    viewCount: number;
    images?: Array<{ url: string }>;
    author: {
      name: string;
      studentNoMasked: string;
      grade: number | null;
      classNo: number | null;
      role: string;
      returnedCount: number;
    };
    _count?: {
      reactions?: number;
      claims?: number;
    };
  };
}

export default function PostCard({ post }: PostCardProps) {
  const [imgError, setImgError] = useState(false);
  const isReturned = post.status === "RETURNED";
  const thumbnail = post.images && post.images.length > 0 ? post.images[0].url : null;

  // 상대 시간 표시 (방금 전, 5분 전 등)
  let timeText = "";
  try {
    timeText = formatDistanceToNow(new Date(post.createdAt), {
      addSuffix: true,
      locale: ko,
    });
  } catch {
    timeText = "방금 전";
  }

  return (
    <Link
      href={`/posts/${post.id}`}
      className={`block bg-white rounded-2xl border border-slate-200/80 p-3.5 sm:p-4 hover:border-blue-400 hover:shadow-card transition-all duration-200 ${
        isReturned ? "opacity-60 bg-slate-50/70" : ""
      } ${post.isPinned ? "border-amber-300 bg-amber-50/40" : ""}`}
    >
      <div className="flex gap-3.5">
        {/* 썸네일 이미지 (모바일 당근 스타일 정사각형 카드) */}
        <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-xl overflow-hidden bg-slate-100 flex-shrink-0 border border-slate-200/60">
          {thumbnail && !imgError ? (
            <img
              src={thumbnail}
              alt={post.title}
              onError={() => setImgError(true)}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 text-xs font-medium p-2 text-center bg-slate-50">
              <span className="text-xl mb-1">📦</span>
              <span className="text-[10px] text-slate-500 font-semibold">
                {post.category}
              </span>
            </div>
          )}

          {isReturned && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <span className="text-white text-xs font-extrabold px-2 py-0.5 rounded bg-black/60">
                반환완료
              </span>
            </div>
          )}
        </div>

        {/* 본문 정보 */}
        <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
          <div>
            {/* 뱃지 라인 */}
            <div className="flex items-center gap-1.5 mb-1 flex-wrap">
              <TypeBadge type={post.type} />
              <StatusBadge status={post.status} />
              <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                {post.category}
              </span>
            </div>

            {/* 제목 */}
            <h3 className="font-bold text-slate-900 text-sm sm:text-base leading-snug truncate">
              {post.title}
            </h3>

            {/* 장소 및 시간 */}
            <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
              <span className="flex items-center gap-0.5 truncate">
                <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                {post.placeBuilding} {post.placeDetail}
              </span>
              <span>·</span>
              <span className="flex items-center gap-0.5 flex-shrink-0">
                <Clock className="w-3 h-3 text-slate-400" />
                {timeText}
              </span>
            </div>
          </div>

          {/* 하단: 작성자 및 반응 카운트 */}
          <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-100 mt-2">
            <div className="flex items-center gap-1.5">
              <span className="font-medium text-slate-600">
                {post.author?.role === "ADMIN" || post.author?.role === "TEACHER"
                  ? "생활지도교사"
                  : `${post.author?.grade ?? ""}학년 ${post.author?.classNo ?? ""}반 ${post.author?.name || "학생"}`}
              </span>
              {(post.author?.returnedCount ?? 0) > 0 && (
                <span className="inline-flex items-center gap-0.5 text-[10px] text-emerald-600 font-semibold bg-emerald-50 px-1 py-0.2 rounded border border-emerald-200" title="안전 반환 기여">
                  <ShieldCheck className="w-3 h-3" />
                  {post.author.returnedCount}회
                </span>
              )}
            </div>

            <div className="flex items-center gap-2.5 text-slate-500 text-[11px]">
              {(post._count?.reactions ?? 0) > 0 && (
                <span className="flex items-center gap-0.5">
                  <ThumbsUp className="w-3.5 h-3.5" />
                  {post._count?.reactions}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
