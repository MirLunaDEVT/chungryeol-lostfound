"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import ImageCarousel from "@/components/post/ImageCarousel";
import ClaimModal from "@/components/post/ClaimModal";
import ReportModal from "@/components/post/ReportModal";
import SimilarPosts from "@/components/post/SimilarPosts";
import { TypeBadge, StatusBadge } from "@/components/common/Badge";
import {
  MapPin,
  Clock,
  Eye,
  ShieldCheck,
  ThumbsUp,
  AlertTriangle,
  Trash2,
  CheckCircle,
  PackageCheck,
  Calendar,
  XCircle,
  Sparkles,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { ko } from "date-fns/locale";
import { SCHOOL_CONFIG } from "@/lib/constants";

export default function PostDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();

  const postId = params.id as string;
  const [post, setPost] = useState<any | null>(null);
  const [similarPosts, setSimilarPosts] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({
    helpfulCount: 0,
    sightingCount: 0,
    userHelpful: false,
    userSighting: false,
  });
  const [loading, setLoading] = useState(true);

  // 모달 상태
  const [claimModalOpen, setClaimModalOpen] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchPost = async () => {
    try {
      const res = await fetch(`/api/posts/${postId}`);
      const data = await res.json();
      if (data.post) {
        setPost(data.post);
        setSimilarPosts(data.similarPosts || []);
        if (data.stats) setStats(data.stats);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPost();
  }, [postId]);

  // 반응 토글 (도움돼요 / 저도 봤어요)
  const handleToggleReaction = async (type: "HELPFUL" | "ME_TOO") => {
    if (!session?.user) {
      router.push("/login");
      return;
    }

    try {
      const res = await fetch(`/api/posts/${postId}/reactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });
      const data = await res.json();
      if (data.success) {
        setStats((prev: any) => {
          if (type === "HELPFUL") {
            const nextActive = !prev.userHelpful;
            return {
              ...prev,
              userHelpful: nextActive,
              helpfulCount: nextActive
                ? prev.helpfulCount + 1
                : Math.max(0, prev.helpfulCount - 1),
            };
          } else {
            const nextActive = !prev.userSighting;
            return {
              ...prev,
              userSighting: nextActive,
              sightingCount: nextActive
                ? prev.sightingCount + 1
                : Math.max(0, prev.sightingCount - 1),
            };
          }
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  // 글 삭제
  const handleDelete = async () => {
    if (!confirm("정말 이 게시글을 삭제하시겠습니까?")) return;
    try {
      const res = await fetch(`/api/posts/${postId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "삭제 실패");
      router.push("/");
    } catch (err: any) {
      alert(err.message);
    }
  };

  // 수령 예약 승인/인수인계 완료/취소 처리
  const handleClaimDecision = async (claimId: string, action: string) => {
    const confirmMsg =
      action === "COMPLETE"
        ? "본관 1층 학생실에서 실물 인수인계가 완료되었습니까? (반환 완료로 영구 종결)"
        : "수령 예약을 취소하고 물품을 다시 찾는 중 상태로 되돌리시겠습니까?";

    if (!confirm(confirmMsg)) return;

    setActionLoading(true);
    try {
      const res = await fetch(`/api/posts/${postId}/claim`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ claimId, action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "처리 실패");

      alert(data.message);
      fetchPost();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 space-y-4 animate-pulse max-w-2xl mx-auto">
        <div className="h-64 bg-slate-200 rounded-3xl" />
        <div className="h-8 bg-slate-200 rounded w-1/2" />
        <div className="h-20 bg-slate-200 rounded" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="p-8 text-center text-slate-500 max-w-2xl mx-auto">
        게시글을 찾을 수 없습니다.
      </div>
    );
  }

  const isAuthor = session?.user?.id === post.authorId;
  const isAdmin =
    session?.user?.role === "ADMIN" || session?.user?.role === "TEACHER";
  const parsedTags = post.tags ? JSON.parse(post.tags) : [];

  let timeAgo = "";
  let fullTime = "";
  try {
    timeAgo = formatDistanceToNow(new Date(post.createdAt), {
      addSuffix: true,
      locale: ko,
    });
    fullTime = format(new Date(post.createdAt), "yyyy.MM.dd HH:mm", {
      locale: ko,
    });
  } catch {
    timeAgo = "방금 전";
  }

  const activeClaim =
    post.claims && post.claims.length > 0
      ? post.claims.find(
          (c: any) => c.status === "REQUESTED" || c.status === "APPROVED"
        ) || post.claims[0]
      : null;

  const isClaimant = session?.user?.id === activeClaim?.claimantId;

  return (
    <div className="max-w-2xl mx-auto p-4 pb-28 space-y-5">
      {/* 1. 이미지 캐러셀 */}
      <ImageCarousel images={post.images || []} />

      {/* 2. 작성자 프로필 & 액션 */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-700 font-bold flex items-center justify-center border border-blue-200">
              {post.author?.name?.[0] || "👤"}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm text-slate-900">
                  {post.author?.role === "ADMIN" || post.author?.role === "TEACHER"
                    ? "생활지도교사"
                    : `${post.author?.grade ?? ""}학년 ${post.author?.classNo ?? ""}반 ${post.author?.name || "학생"}`}
                </span>
                <span className="text-[10px] text-slate-400">
                  ({post.author?.studentNoMasked || ""})
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                <span>{timeAgo}</span>
                <span>·</span>
                <span className="flex items-center gap-0.5">
                  <Eye className="w-3.5 h-3.5" />
                  조회 {post.viewCount}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {(isAuthor || isAdmin) && post.status !== "RETURNED" && (
              <button
                onClick={handleDelete}
                className="flex items-center gap-1 text-rose-600 hover:text-rose-700 font-medium px-2 py-1 rounded-lg transition-colors text-xs"
              >
                <Trash2 className="w-3.5 h-3.5" />
                삭제
              </button>
            )}

            <button
              onClick={() => setReportModalOpen(true)}
              className="flex items-center gap-1 text-slate-400 hover:text-rose-600 transition-colors text-xs"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              신고
            </button>
          </div>
        </div>

        {/* 신뢰 반환 기여 뱃지 */}
        {(post.author?.returnedCount ?? 0) > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-emerald-800 bg-emerald-50/70 p-2.5 rounded-2xl border border-emerald-200/80">
            <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>
              교내 분실물 안전 반환 기여: <strong>{post.author.returnedCount}회</strong>
            </span>
          </div>
        )}
      </div>

      {/* 3. 본문 및 물품 정보 */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-4">
        {/* 뱃지 라인 */}
        <div className="flex items-center gap-2 flex-wrap">
          <TypeBadge type={post.type} />
          <StatusBadge status={post.status} />
          <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
            {post.category}
          </span>
        </div>

        {/* 제목 */}
        <h1 className="text-lg sm:text-xl font-black text-slate-900 leading-snug">
          {post.title}
        </h1>

        {/* 위치 & 발생 시간 */}
        <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1.5 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-blue-600 flex-shrink-0" />
            <span className="font-bold text-slate-800">
              {post.placeBuilding} {post.placeDetail}
            </span>
          </div>
          <div className="flex items-center gap-2 text-slate-500">
            <Clock className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <span>발생 시점: {fullTime}</span>
          </div>
        </div>

        {/* 본문 내용 */}
        <p className="text-sm text-slate-800 whitespace-pre-line leading-relaxed pt-2">
          {post.body}
        </p>

        {/* 태그 목록 */}
        {parsedTags.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap pt-2">
            {parsedTags.map((tag: string, idx: number) => (
              <span
                key={idx}
                className="text-xs text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full font-medium"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* 반응 버튼 (도움돼요 / 저도 봤어요) */}
        <div className="flex items-center gap-2 pt-4 border-t border-slate-100">
          <button
            onClick={() => handleToggleReaction("HELPFUL")}
            className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-colors flex items-center justify-center gap-1.5 ${
              stats.userHelpful
                ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
            }`}
          >
            <ThumbsUp className="w-3.5 h-3.5" />
            도움돼요 {stats.helpfulCount > 0 && stats.helpfulCount}
          </button>
          <button
            onClick={() => handleToggleReaction("ME_TOO")}
            className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-colors flex items-center justify-center gap-1.5 ${
              stats.userSighting
                ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            저도 봤어요 {stats.sightingCount > 0 && stats.sightingCount}
          </button>
        </div>
      </div>

      {/* 4. AI 유사 분실/습득물 추천 배너 */}
      <SimilarPosts posts={similarPosts} />

      {/* 5. 수령 예약 현황 및 인수인계 안내 카드 */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-4">
        {post.status === "RETURNED" ? (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-center space-y-2">
            <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle className="w-6 h-6" />
            </div>
            <h3 className="font-extrabold text-sm text-emerald-950">
              안전하게 반환 완료되었습니다!
            </h3>
            <p className="text-xs text-emerald-800">
              본관 1층 학생안전복지부에서 실물 확인 및 인수인계가 완료되어 마감된 게시글입니다.
            </p>
          </div>
        ) : activeClaim ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
                <PackageCheck className="w-4 h-4 text-amber-600" />
                현재 수령 예약 진행 현황
              </h3>
              <span className="text-[11px] font-bold text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full border border-amber-300">
                인수인계 대기 중
              </span>
            </div>

            <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-4 space-y-2.5 text-xs text-amber-950">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">예약 신청자:</span>
                <span className="font-bold">
                  {activeClaim.claimant?.name} ({activeClaim.claimant?.grade}학년 {activeClaim.claimant?.classNo}반)
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">학생실 방문 예정:</span>
                <span className="font-bold text-amber-900">
                  {activeClaim.visitTime || "점심시간 12:40"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">인수인계 장소:</span>
                <span className="font-medium">
                  {activeClaim.pickupPlace || SCHOOL_CONFIG.defaultHandoverPlace}
                </span>
              </div>

              {/* 본인 확인 단서 (작성자, 예약자 본인, 교사만 열람 가능) */}
              {(isAuthor || isClaimant || isAdmin) && activeClaim.identifyingNotes && (
                <div className="pt-2 border-t border-amber-200/80 mt-2 space-y-1">
                  <span className="text-[11px] font-bold text-amber-900">
                    🔒 비공개 본인 확인 단서 (실물 대조용):
                  </span>
                  <p className="p-2.5 bg-white rounded-xl border border-amber-200 text-slate-800 font-medium">
                    "{activeClaim.identifyingNotes}"
                  </p>
                </div>
              )}
            </div>

            {/* 인수인계 완료 및 예약 취소 액션 버튼 */}
            <div className="flex items-center gap-2 pt-1">
              {(isAuthor || isAdmin) && (
                <button
                  onClick={() => handleClaimDecision(activeClaim.id, "COMPLETE")}
                  disabled={actionLoading}
                  className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition-colors flex items-center justify-center gap-1.5"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  학생실 인수인계 완료 (반환)
                </button>
              )}

              {(isAuthor || isClaimant || isAdmin) && (
                <button
                  onClick={() => handleClaimDecision(activeClaim.id, "CANCEL")}
                  disabled={actionLoading}
                  className="py-2.5 px-4 bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-600 font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-1"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  예약 취소
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-blue-50/70 border border-blue-200 rounded-2xl p-4 space-y-2">
            <h3 className="font-bold text-xs text-blue-900 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              교내 안전 분실물 수령 예약 안내
            </h3>
            <p className="text-xs text-blue-800 leading-relaxed">
              본인이 분실한 물건이 맞다면, 하단의 <strong>[내 물건 수령 예약하기]</strong>를 클릭하여 쉬는시간/점심시간 방문 일정을 예약하세요.
            </p>
            <p className="text-[11px] text-blue-600">
              * 학생 간의 불필요한 마찰을 방지하기 위해 댓글/채팅 대신 학교 공식 학생실 예약 시스템으로 운영됩니다.
            </p>
          </div>
        )}
      </div>

      {/* 6. 하단 고정 액션 바 */}
      <div className="fixed bottom-0 left-0 right-0 z-20 bg-white/95 backdrop-blur border-t border-slate-200 p-3 shadow-lg">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
            <MapPin className="w-3.5 h-3.5 text-blue-600" />
            <span className="hidden sm:inline">인수인계 장소:</span>
            <span>본관 1층 학생안전복지부</span>
          </div>

          <div className="flex items-center gap-2">
            {post.status === "RETURNED" ? (
              <span className="px-4 py-2 bg-slate-100 text-slate-500 font-bold text-xs rounded-xl border border-slate-200">
                ✓ 반환 완료된 물품
              </span>
            ) : post.status === "RESERVED" ? (
              <span className="px-4 py-2 bg-amber-50 text-amber-800 font-bold text-xs rounded-xl border border-amber-200">
                🔒 현재 수령 예약 진행 중
              </span>
            ) : !isAuthor ? (
              <button
                onClick={() => setClaimModalOpen(true)}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-1.5"
              >
                <PackageCheck className="w-4 h-4" />
                내 물건 수령 예약하기
              </button>
            ) : (
              <span className="px-3 py-1.5 text-slate-400 text-xs font-semibold">
                내가 등록한 물품 (예약 대기)
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 수령 예약 모달 */}
      <ClaimModal
        postId={post.id}
        postTitle={post.title}
        isOpen={claimModalOpen}
        onClose={() => setClaimModalOpen(false)}
        onSuccess={() => {
          fetchPost();
        }}
      />

      {/* 신고 모달 */}
      <ReportModal
        targetType="POST"
        targetId={post.id}
        isOpen={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
      />
    </div>
  );
}
