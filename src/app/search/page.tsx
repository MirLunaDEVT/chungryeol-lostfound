"use client";

import React, { useState, useEffect } from "react";
import PostCard from "@/components/feed/PostCard";
import { Search as SearchIcon, X, Tag, Inbox } from "lucide-react";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const popularKeywords = [
    "에어팟",
    "학생증",
    "텀블러",
    "체육복",
    "안경",
    "필통",
    "버즈",
    "지갑",
  ];

  const searchPosts = async (searchTerm: string) => {
    if (!searchTerm.trim()) {
      setPosts([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/posts?search=${encodeURIComponent(searchTerm.trim())}`);
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

  const handleKeywordClick = (kw: string) => {
    setQuery(kw);
    searchPosts(kw);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    searchPosts(query);
  };

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-4">
      {/* 검색 바 */}
      <div className="bg-white rounded-2xl border border-slate-200 p-2 shadow-sm">
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
          <SearchIcon className="w-5 h-5 text-slate-400 ml-2" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="물건 이름, 브랜드, 색상, 교내 장소로 검색..."
            className="flex-1 py-2 text-xs sm:text-sm bg-transparent focus:outline-none"
            autoFocus
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setPosts([]);
              }}
              className="p-1 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow transition-colors"
          >
            검색
          </button>
        </form>
      </div>

      {/* 추천 키워드 태그 */}
      <div className="space-y-2">
        <div className="text-xs font-bold text-slate-600 flex items-center gap-1">
          <Tag className="w-3.5 h-3.5 text-blue-600" />
          자주 찾는 분실물 키워드
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {popularKeywords.map((kw) => (
            <button
              key={kw}
              onClick={() => handleKeywordClick(kw)}
              className="text-xs px-3 py-1.5 rounded-xl bg-white hover:bg-blue-50 border border-slate-200 text-slate-700 font-medium transition-colors"
            >
              #{kw}
            </button>
          ))}
        </div>
      </div>

      {/* 검색 결과 */}
      <div className="space-y-2.5 pt-2">
        {loading ? (
          <div className="text-center py-10 text-xs text-slate-400">
            검색 중...
          </div>
        ) : query && posts.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-10 text-center space-y-2 my-4">
            <Inbox className="w-8 h-8 text-slate-300 mx-auto" />
            <h4 className="text-sm font-bold text-slate-800">
              "{query}" 관련 글을 찾지 못했습니다.
            </h4>
            <p className="text-xs text-slate-500">
              키워드 알림을 등록해두면 새 글이 올라올 때 즉시 알려드립니다!
            </p>
          </div>
        ) : (
          posts.map((post) => <PostCard key={post.id} post={post} />)
        )}
      </div>
    </div>
  );
}
