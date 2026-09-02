"use client";

import React, { useState, useEffect } from "react";
import FilterTabs from "@/components/feed/FilterTabs";
import PostCard from "@/components/feed/PostCard";
import FloatingWriteButton from "@/components/feed/FloatingWriteButton";
import { Search, Megaphone, Inbox, Sparkles, AlertCircle } from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";

export default function FeedPage() {
  const { data: session } = useSession();
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentType, setCurrentType] = useState("ALL");
  const [currentCategory, setCurrentCategory] = useState("전체");
  const [currentBuilding, setCurrentBuilding] = useState("전체");
  const [searchTerm, setSearchTerm] = useState("");

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (currentType !== "ALL") params.append("type", currentType);
      if (currentCategory !== "전체") params.append("category", currentCategory);
      if (currentBuilding !== "전체") params.append("building", currentBuilding);
      if (searchTerm.trim()) params.append("search", searchTerm.trim());

      const res = await fetch(`/api/posts?${params.toString()}`);
      const data = await res.json();
      if (data.posts) {
        setPosts(data.posts);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, [currentType, currentCategory, currentBuilding]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchPosts();
  };

  // 공지사항과 일반 게시글 분리
  const pinnedNotices = posts.filter((p) => p.isPinned);
  const normalPosts = posts.filter((p) => !p.isPinned);

  return (
    <div className="space-y-3">
      {/* 1. 상단 필터바 */}
      <FilterTabs
        currentType={currentType}
        onTypeChange={setCurrentType}
        currentCategory={currentCategory}
        onCategoryChange={setCurrentCategory}
        currentBuilding={currentBuilding}
        onBuildingChange={setCurrentBuilding}
      />

      {/* 2. 빠른 검색 바 */}
      <div className="px-4">
        <form onSubmit={handleSearchSubmit} className="relative">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="에어팟, 학생증, 텀블러, 체육복 등 검색..."
            className="w-full pl-9 pr-20 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <button
            type="submit"
            className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-colors"
          >
            검색
          </button>
        </form>
      </div>

      {/* 3. 온보딩 미완료 경고 알림 */}
      {session?.user?.status === "PENDING_ONBOARDING" && (
        <div className="mx-4 p-3 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-between text-xs text-amber-900 shadow-sm">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span>학적 명단 확인이 아직 완료되지 않았습니다.</span>
          </div>
          <Link
            href="/onboarding"
            className="px-2.5 py-1 bg-amber-600 text-white font-bold text-[11px] rounded-lg shadow-sm"
          >
            학적 인증하기
          </Link>
        </div>
      )}

      {/* 4. 고정 학교 공지사항 */}
      {pinnedNotices.length > 0 && (
        <div className="px-4 space-y-2">
          {pinnedNotices.map((notice) => (
            <Link
              key={notice.id}
              href={`/posts/${notice.id}`}
              className="flex items-center gap-3 p-3 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl shadow-sm hover:border-amber-300 transition-all"
            >
              <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center flex-shrink-0 font-bold">
                <Megaphone className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-extrabold text-amber-800 bg-amber-200/70 px-1.5 py-0.2 rounded">
                    공지
                  </span>
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                    {notice.title}
                  </h4>
                </div>
                <p className="text-[11px] text-slate-500 truncate mt-0.5">
                  {notice.body}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* 5. 피드 리스트 */}
      <div className="px-4 space-y-2.5">
        {loading ? (
          /* 로딩 스켈레톤 */
          <div className="space-y-3 py-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-28 bg-white rounded-2xl border border-slate-200 animate-pulse p-4 flex gap-3"
              >
                <div className="w-24 h-full bg-slate-200 rounded-xl" />
                <div className="flex-1 space-y-2 py-1">
                  <div className="h-4 bg-slate-200 rounded w-1/3" />
                  <div className="h-4 bg-slate-200 rounded w-2/3" />
                  <div className="h-3 bg-slate-200 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : normalPosts.length === 0 ? (
          /* 빈 상태 (Empty State) */
          <div className="bg-white rounded-3xl border border-slate-200 p-10 text-center space-y-3 my-6">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-3xl">
              <Inbox className="w-8 h-8 text-slate-400" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-slate-800">
                아직 등록된 분실물이 없어요
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed max-w-xs mx-auto">
                주운 물건이 있거나 잃어버린 소지품이 있다면 사진을 찍어 가장 먼저 올려보세요!
              </p>
            </div>
            <Link
              href="/posts/new"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition-all"
            >
              <Sparkles className="w-3.5 h-3.5" />
              첫 분실/습득물 등록하기
            </Link>
          </div>
        ) : (
          normalPosts.map((post) => <PostCard key={post.id} post={post} />)
        )}
      </div>

      {/* 플로팅 글쓰기 버튼 */}
      <FloatingWriteButton />
    </div>
  );
}
