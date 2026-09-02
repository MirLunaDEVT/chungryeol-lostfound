import React from "react";
import Link from "next/link";
import { Sparkles, MapPin, CheckCircle2 } from "lucide-react";
import { TypeBadge } from "../common/Badge";

interface SimilarPost {
  id: string;
  type: string;
  category: string;
  title: string;
  placeBuilding: string;
  placeDetail: string;
  images: Array<{ url: string }>;
  matchScore?: number;
  matchReasons?: string[];
}

export default function SimilarPosts({ posts }: { posts: SimilarPost[] }) {
  if (!posts || posts.length === 0) return null;

  return (
    <div className="bg-gradient-to-r from-blue-50/90 via-indigo-50/80 to-purple-50/70 border border-blue-200 rounded-3xl p-4 sm:p-5 my-6 shadow-xs">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-indigo-950 font-black text-sm">
          <div className="w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-xs">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <span>AI 추천: 이 글과 일치하는 분실/습득물이 있어요!</span>
        </div>
        <span className="text-[11px] font-bold text-indigo-600 bg-indigo-100/70 px-2 py-0.5 rounded-full">
          {posts.length}건 매칭
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {posts.map((item) => {
          const score = item.matchScore || 75;
          const scoreColor =
            score >= 80
              ? "bg-emerald-100 text-emerald-800 border-emerald-300"
              : score >= 60
              ? "bg-blue-100 text-blue-800 border-blue-300"
              : "bg-amber-100 text-amber-800 border-amber-300";

          return (
            <Link
              key={item.id}
              href={`/posts/${item.id}`}
              className="flex flex-col gap-2 p-3 bg-white rounded-2xl border border-indigo-100 hover:border-indigo-400 hover:shadow-md transition-all group"
            >
              <div className="flex items-center gap-3">
                {/* 썸네일 */}
                <div className="w-14 h-14 rounded-xl bg-slate-100 flex-shrink-0 overflow-hidden border border-slate-200 group-hover:scale-105 transition-transform relative">
                  {item.images && item.images[0] ? (
                    <img
                      src={item.images[0].url}
                      alt={item.title}
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                        const parent = e.currentTarget.parentElement;
                        if (parent) {
                          const fallback = parent.querySelector(".fallback-box");
                          if (fallback) fallback.classList.remove("hidden");
                        }
                      }}
                      className="w-full h-full object-cover"
                    />
                  ) : null}
                  <div
                    className={`w-full h-full flex items-center justify-center text-slate-300 text-base fallback-box ${
                      item.images && item.images[0] ? "hidden" : ""
                    }`}
                  >
                    📦
                  </div>
                </div>

                {/* 정보 */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <TypeBadge type={item.type} />
                    <span
                      className={`text-[10px] font-black px-1.5 py-0.5 rounded-md border ${scoreColor}`}
                    >
                      AI 매칭률 {score}%
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-800 truncate group-hover:text-blue-600 transition-colors">
                    {item.title}
                  </h4>
                  <p className="text-[10px] text-slate-400 truncate flex items-center gap-0.5 mt-0.5">
                    <MapPin className="w-2.5 h-2.5 flex-shrink-0" />
                    <span>{item.placeBuilding} {item.placeDetail || ""}</span>
                  </p>
                </div>
              </div>

              {/* 매칭 근거 태그 */}
              {item.matchReasons && item.matchReasons.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-slate-100 text-[10px]">
                  {item.matchReasons.map((reason, idx) => (
                    <span
                      key={idx}
                      className="bg-slate-50 text-slate-600 px-1.5 py-0.5 rounded-md border border-slate-200 font-medium"
                    >
                      {reason}
                    </span>
                  ))}
                </div>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
