import React from "react";
import Link from "next/link";
import { ArrowLeft, ShieldCheck, Lock, Eye, FileText, CheckCircle2 } from "lucide-react";
import { SCHOOL_CONFIG } from "@/lib/constants";

export default function PrivacyPolicyPage() {
  return (
    <div className="max-w-2xl mx-auto p-4 space-y-5 pb-16">
      <div className="flex items-center gap-2 mb-2">
        <Link
          href="/"
          className="p-1.5 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 shadow-xs"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <h1 className="text-lg font-black text-slate-900">
          교내 개인정보 처리방침
        </h1>
      </div>

      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6 text-xs text-slate-700 leading-relaxed">
        {/* 요약 박스 */}
        <div className="bg-blue-50/80 border border-blue-200 rounded-2xl p-4 space-y-2">
          <div className="flex items-center gap-2 font-black text-blue-900 text-sm">
            <ShieldCheck className="w-5 h-5 text-blue-600 flex-shrink-0" />
            {SCHOOL_CONFIG.name} 교내 분실물 플랫폼 개인정보 보호 서약
          </div>
          <p className="text-[11px] text-blue-800 leading-normal">
            본 서비스는 우리 학교 학생과 교직원의 안전하고 신속한 분실물 반환 및 악용 방지(허위 수령, 장난 게시, 사칭 등)만을 목적으로 최소한의 개인정보를 수집·처리합니다.
          </p>
        </div>

        {/* 1. 수집하는 개인정보 항목 */}
        <div className="space-y-2">
          <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
            <span className="w-1.5 h-4 bg-blue-600 rounded-full" />
            1. 수집하는 개인정보의 항목
          </h2>
          <p className="text-slate-600">
            서비스는 외부인의 침입과 무분별한 악용을 방지하기 위해 다음 항목만을 수집합니다:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-slate-600">
            <li>
              <strong>필수 항목:</strong> 학번(6자리), 실명, 학년/반, 학교 전용 구글 계정 이메일.
            </li>
            <li>
              <strong>서비스 이용 시 생성 정보:</strong> 분실/습득 등록 사진, 교내 발견 장소, 1:1 인수인계 대화 기록, 식별 질문 답변, 감사 로그.
            </li>
            <li>
              <strong className="text-rose-600">수집하지 않는 항목:</strong> 개인 휴대전화번호, 주민등록번호, 자택 주소, 위치기반 실시간 GPS 좌표. (수령 연락은 앱 내 1:1 안전 대화만 이용)
            </li>
          </ul>
        </div>

        {/* 2. 개인정보의 수집 및 이용 목적 */}
        <div className="space-y-2">
          <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
            <span className="w-1.5 h-4 bg-blue-600 rounded-full" />
            2. 수집 및 이용 목적
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="font-bold text-slate-900 block mb-0.5">
                ① 교내 구성원 인증
              </span>
              학교 재학생 및 교직원 명단과의 대조를 통한 외부인 차단.
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="font-bold text-slate-900 block mb-0.5">
                ② 분실물 확인 및 반환
              </span>
              물건의 실제 소유주 확인을 위한 비공개 식별 질문 검증 및 학생실 인수인계.
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="font-bold text-slate-900 block mb-0.5">
                ③ 부정이용 및 사기 방지
              </span>
              허위 수령 시도, 욕설, 장난 게시 방지 및 교내 생활규정 위반 시 감사 증거 확보.
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="font-bold text-slate-900 block mb-0.5">
                ④ 키워드 알림 전송
              </span>
              학생이 지정한 관심 물품 키워드 등록 시 일치하는 새 글의 알림 제공.
            </div>
          </div>
        </div>

        {/* 3. 개인정보의 보유 및 이용 기간 */}
        <div className="space-y-2">
          <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
            <span className="w-1.5 h-4 bg-blue-600 rounded-full" />
            3. 보유 및 이용 기간
          </h2>
          <ul className="list-disc pl-5 space-y-1 text-slate-600">
            <li>
              <strong>학생 계정 정보:</strong> 졸업 또는 전학(학적 명단 제외) 시 즉시 로그인 권한이 차단되며, 30일 이내 파기됩니다.
            </li>
            <li>
              <strong>반환 완료된 게시글 및 대화 기록:</strong> 반환 완료 시점으로부터 90일간 안전 분쟁 예방 및 감사 목적으로 보관 후 영구 삭제됩니다.
            </li>
            <li>
              <strong>보안 감사 로그:</strong> 교내 안전 및 감사 목적에 따라 1년간 암호화 보관됩니다.
            </li>
          </ul>
        </div>

        {/* 4. 개인정보의 제3자 제공 및 열람 제한 */}
        <div className="space-y-2">
          <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
            <span className="w-1.5 h-4 bg-blue-600 rounded-full" />
            4. 제3자 제공 및 열람 제한 (엄격 통제)
          </h2>
          <p className="text-slate-600">
            본 서비스는 수집된 개인정보를 어떠한 경우에도 외부 제3자(영리 기업, 마케팅 업체 등)에게 제공하거나 공유하지 않습니다.
          </p>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
            <div className="font-bold text-slate-800 flex items-center gap-1">
              <Lock className="w-3.5 h-3.5 text-blue-600" />
              학번 및 실명 노출 보호 장치
            </div>
            <p className="text-[11px] text-slate-500">
              일반 학생 화면에서는 학번 전체가 노출되지 않으며 끝 2자리는 항상 마스킹(예: 2401**) 처리됩니다. 전체 학번 및 관리자 열람 권한은 학교 승인을 받은 생활지도 담당 교사 및 시스템 관리자에게만 부여됩니다.
            </p>
          </div>
        </div>

        {/* 5. 담당자 안내 */}
        <div className="border-t border-slate-200 pt-4 text-[11px] text-slate-500 space-y-0.5">
          <p><strong>관리 부서:</strong> {SCHOOL_CONFIG.name} 학생안전복지부</p>
          <p><strong>관리자 이메일:</strong> {SCHOOL_CONFIG.adminEmail}</p>
          <p><strong>시행 일자:</strong> 2026년 3월 1일</p>
        </div>
      </div>
    </div>
  );
}
