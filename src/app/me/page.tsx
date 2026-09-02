"use client";

import React, { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ShieldCheck,
  LogOut,
  Bell,
  BookOpen,
  Inbox,
  Award,
  Layers,
  Shield,
  PackageCheck,
  Clock,
  MapPin,
  Key,
  X,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import PostCard from "@/components/feed/PostCard";
import { SCHOOL_CONFIG } from "@/lib/constants";
import { StatusBadge } from "@/components/common/Badge";

export default function MyPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<"POSTS" | "RESERVATIONS">("POSTS");
  const [myPosts, setMyPosts] = useState<any[]>([]);
  const [myReservations, setMyReservations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // 비밀번호 변경 모달 상태
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwLoading, setPwLoading] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 4) {
      setPwMsg({ type: "error", text: "새 비밀번호는 최소 4자 이상이어야 합니다." });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwMsg({ type: "error", text: "새 비밀번호가 서로 일치하지 않습니다." });
      return;
    }
    setPwLoading(true);
    setPwMsg(null);
    try {
      const res = await fetch("/api/me/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPwMsg({ type: "error", text: data.error || "비밀번호 변경에 실패했습니다." });
      } else {
        setPwMsg({ type: "success", text: "비밀번호가 성공적으로 변경되었습니다!" });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setTimeout(() => {
          setShowPasswordModal(false);
          setPwMsg(null);
        }, 1200);
      }
    } catch {
      setPwMsg({ type: "error", text: "서버 통신 오류가 발생했습니다." });
    } finally {
      setPwLoading(false);
    }
  };

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    if (session?.user?.id) {
      Promise.all([
        fetch("/api/posts")
          .then((res) => res.json())
          .then((data) => {
            if (data.posts) {
              setMyPosts(
                data.posts.filter((p: any) => p.authorId === session.user.id)
              );
            }
          }),
        fetch("/api/me/reservations")
          .then((res) => res.json())
          .then((data) => {
            if (data.reservations) {
              setMyReservations(data.reservations);
            }
          }),
      ])
        .catch((err) => console.error(err))
        .finally(() => setLoading(false));
    }
  }, [session]);

  if (status === "loading" || !session?.user) {
    return (
      <div className="max-w-2xl mx-auto p-4 text-center py-20 text-xs text-slate-400">
        프로필을 불러오는 중...
      </div>
    );
  }

  const user = session.user;
  const isAdmin = user.role === "ADMIN" || user.role === "TEACHER";

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-4 pb-20">
      {/* 1. 프로필 카드 */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-black text-xl flex items-center justify-center shadow-md">
              {user.name?.[0] || "👤"}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-base sm:text-lg font-black text-slate-900">
                  {user.name || "사용자"}
                </h1>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                  {isAdmin ? "교직원/관리자" : `${user.grade}학년 ${user.classNo}반`}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {SCHOOL_CONFIG.name} · 학번: <strong>{user.studentNoMasked}</strong>
              </p>
            </div>
          </div>

          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-slate-50 rounded-xl transition-colors"
            title="로그아웃"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>

        {/* 2. 교내 신뢰 지표 카드 */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-center space-y-0.5">
            <div className="text-[11px] font-bold text-slate-500 flex items-center justify-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              반환 완료 기여
            </div>
            <div className="text-lg font-black text-emerald-700">
              {user.returnedCount || 0}회
            </div>
            <p className="text-[10px] text-slate-400">교내 분실물 주인 찾아줌</p>
          </div>

          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-center space-y-0.5">
            <div className="text-[11px] font-bold text-slate-500 flex items-center justify-center gap-1">
              <Award className="w-3.5 h-3.5 text-blue-600" />
              학적 인증 상태
            </div>
            <div className="text-lg font-black text-blue-700">인증완료</div>
            <p className="text-[10px] text-slate-400">학생 명부 등록 정상</p>
          </div>
        </div>

        {/* 바로가기 링크들 */}
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
          <Link
            href="/alerts"
            className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 hover:bg-blue-50 text-xs font-bold text-slate-700 hover:text-blue-700 transition-colors"
          >
            <Bell className="w-4 h-4 text-blue-600" />
            키워드 알림 관리
          </Link>

          {isAdmin && (
            <Link
              href="/admin"
              className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-xs font-bold text-amber-800 transition-colors"
            >
              <Shield className="w-4 h-4 text-amber-600" />
              관리자 대시보드
            </Link>
          )}

          <button
            onClick={() => {
              setPwMsg(null);
              setShowPasswordModal(true);
            }}
            className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 hover:bg-emerald-50 text-xs font-bold text-slate-700 hover:text-emerald-700 transition-colors text-left"
          >
            <Key className="w-4 h-4 text-emerald-600" />
            비밀번호 변경
          </button>

          <Link
            href="/privacy"
            className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-600 transition-colors"
          >
            <BookOpen className="w-4 h-4 text-slate-500" />
            교내 개인정보 처리방침
          </Link>
        </div>
      </div>

      {/* 3. 탭 바: 내가 등록한 글 vs 내가 예약한 분실물 */}
      <div className="flex border-b border-slate-200 bg-white rounded-2xl p-1 gap-1">
        <button
          onClick={() => setActiveTab("POSTS")}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            activeTab === "POSTS"
              ? "bg-blue-600 text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-50"
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          내가 등록한 물품 ({myPosts.length})
        </button>
        <button
          onClick={() => setActiveTab("RESERVATIONS")}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            activeTab === "RESERVATIONS"
              ? "bg-blue-600 text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-50"
          }`}
        >
          <PackageCheck className="w-3.5 h-3.5" />
          내가 예약한 분실물 ({myReservations.length})
        </button>
      </div>

      {/* 4. 탭 콘텐츠 영역 */}
      <div className="space-y-3">
        {loading ? (
          <div className="text-center py-10 text-xs text-slate-400">
            불러오는 중...
          </div>
        ) : activeTab === "POSTS" ? (
          myPosts.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-8 text-center text-slate-400 space-y-1">
              <Inbox className="w-8 h-8 mx-auto text-slate-300" />
              <p className="text-xs">등록한 글이 없습니다.</p>
            </div>
          ) : (
            myPosts.map((post) => <PostCard key={post.id} post={post} />)
          )
        ) : myReservations.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-8 text-center text-slate-400 space-y-1">
            <PackageCheck className="w-8 h-8 mx-auto text-slate-300" />
            <p className="text-xs">수령 예약한 물품이 없습니다.</p>
            <p className="text-[11px] text-slate-400">
              분실물 게시판에서 내 물건을 찾으면 수령 예약을 신청해 보세요.
            </p>
          </div>
        ) : (
          myReservations.map((item) => (
            <Link
              key={item.id}
              href={`/posts/${item.postId}`}
              className="block bg-white rounded-2xl border border-slate-200 p-4 hover:border-blue-400 hover:shadow-sm transition-all space-y-2.5"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 truncate max-w-xs">
                  {item.post?.title}
                </span>
                <StatusBadge status={item.post?.status || item.status} />
              </div>

              <div className="bg-slate-50 rounded-xl p-2.5 text-xs text-slate-600 space-y-1">
                <div className="flex items-center gap-1.5 text-amber-900 font-semibold">
                  <Clock className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                  <span>방문 예정: {item.visitTime || "점심시간"}</span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-500">
                  <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>장소: {item.pickupPlace || SCHOOL_CONFIG.defaultHandoverPlace}</span>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
      {/* 비밀번호 변경 모달 */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Key className="w-4 h-4 text-emerald-600" />
                비밀번호 변경
              </h2>
              <button
                onClick={() => setShowPasswordModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {pwMsg && (
              <div
                className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${
                  pwMsg.type === "success"
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                    : "bg-rose-50 text-rose-700 border border-rose-200"
                }`}
              >
                {pwMsg.type === "success" ? (
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" />
                ) : (
                  <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
                )}
                <span>{pwMsg.text}</span>
              </div>
            )}

            <form onSubmit={handlePasswordChange} className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-slate-600 mb-1 block">
                  현재 비밀번호 (초기: 1234)
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="현재 비밀번호 입력"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 mb-1 block">
                  새 비밀번호 (최소 4자 이상)
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="새 비밀번호 입력"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 mb-1 block">
                  새 비밀번호 확인
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="새 비밀번호 다시 입력"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="flex-1 py-2.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={pwLoading}
                  className="flex-1 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md transition-colors disabled:opacity-50"
                >
                  {pwLoading ? "변경 중..." : "변경 완료"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
