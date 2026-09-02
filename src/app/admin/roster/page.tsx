"use client";

import React, { useState, useEffect } from "react";
import AdminNav from "@/components/admin/AdminNav";
import {
  FileSpreadsheet,
  Upload,
  Search,
  Check,
  X,
  AlertCircle,
  Download,
  Users,
  UserCheck,
} from "lucide-react";

export default function AdminRosterPage() {
  const [roster, setRoster] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [csvInput, setCsvInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchRoster = async (q = "") => {
    try {
      const res = await fetch(`/api/admin/roster?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (data.roster) setRoster(data.roster);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoster(search);
  }, [search]);

  // CSV 업로드
  const handleUploadCsv = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!csvInput.trim()) return;

    setUploading(true);
    setMsg(null);

    try {
      const res = await fetch("/api/admin/roster", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csvText: csvInput.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "업로드 실패");

      setMsg({ type: "success", text: data.message });
      setCsvInput("");
      fetchRoster();
    } catch (err: any) {
      setMsg({ type: "error", text: err.message });
    } finally {
      setUploading(false);
    }
  };

  // 재학/재직 상태 토글 (졸업/전학 처리)
  const handleToggleEnrollment = async (id: string, currentEnrolled: boolean) => {
    try {
      const res = await fetch("/api/admin/roster", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, enrolled: !currentEnrolled }),
      });
      const data = await res.json();
      if (data.success) {
        setRoster(
          roster.map((item) =>
            item.id === id ? { ...item, enrolled: !currentEnrolled } : item
          )
        );
      }
    } catch (err) {
      console.error(err);
    }
  };

  const sampleCsv = `학번,이름,학년,반,역할
240103,강하늘,1,1,STUDENT
240104,윤도현,1,2,STUDENT
230206,한소희,2,3,STUDENT
T9902,이선생,null,null,TEACHER`;

  return (
    <div className="space-y-4">
      <AdminNav />

      <div className="max-w-4xl mx-auto px-4 space-y-6 pb-12">
        <div>
          <h1 className="text-xl font-black text-slate-900">
            재학생·교직원 마스터 명단 관리
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            명단에 있는 학번·이름만 학교 계정 연동 및 로그인이 허용됩니다. 명단 제외 시 즉시 로그인이 차단됩니다.
          </p>
        </div>

        {msg && (
          <div
            className={`p-3.5 rounded-2xl text-xs font-semibold flex items-center gap-2 ${
              msg.type === "success"
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                : "bg-rose-50 text-rose-700 border border-rose-200"
            }`}
          >
            {msg.type === "success" ? (
              <Check className="w-4 h-4 text-emerald-600" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600" />
            )}
            <span>{msg.text}</span>
          </div>
        )}

        {/* 1. CSV 일괄 업로드 섹션 */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
              <FileSpreadsheet className="w-4 h-4 text-blue-600" />
              신학기 재학생 명단 CSV 일괄 업로드
            </h2>
            <button
              type="button"
              onClick={() => setCsvInput(sampleCsv)}
              className="text-[11px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              <Download className="w-3 h-3" />
              샘플 CSV 형식 붙여넣기
            </button>
          </div>

          <form onSubmit={handleUploadCsv} className="space-y-2.5">
            <textarea
              rows={4}
              value={csvInput}
              onChange={(e) => setCsvInput(e.target.value)}
              placeholder="헤더: 학번,이름,학년,반,역할 (또는 studentNo,name,grade,classNo,role)
240101,김민우,1,2,STUDENT
230205,이지은,2,3,STUDENT
T9901,김교사,null,null,ADMIN"
              className="w-full p-3 text-xs font-mono bg-slate-50 border border-slate-300 rounded-2xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
            <div className="flex justify-between items-center text-[11px] text-slate-400">
              <span>기존 학번은 정보가 갱신(업서트)되며 신규 학번은 자동 등록됩니다.</span>
              <button
                type="submit"
                disabled={uploading || !csvInput.trim()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow transition-colors flex items-center gap-1"
              >
                <Upload className="w-3.5 h-3.5" />
                {uploading ? "업로드 중..." : "명단 동기화 실행"}
              </button>
            </div>
          </form>
        </div>

        {/* 2. 재학생 명단 테이블 */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <h2 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
              <Users className="w-4 h-4 text-blue-600" />
              명단 목록 ({roster.length}명)
            </h2>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="학번 또는 이름 검색..."
                className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold">
                <tr>
                  <th className="p-2.5">학번</th>
                  <th className="p-2.5">이름</th>
                  <th className="p-2.5">학년/반</th>
                  <th className="p-2.5">역할</th>
                  <th className="p-2.5">앱 가입 상태</th>
                  <th className="p-2.5 text-center">재학 상태 (졸업/전학)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-slate-400">
                      명단을 불러오는 중...
                    </td>
                  </tr>
                ) : roster.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-slate-400">
                      검색 조건에 맞는 명단이 없습니다.
                    </td>
                  </tr>
                ) : (
                  roster.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="p-2.5 font-mono font-bold text-slate-900">
                        {item.studentNo}
                      </td>
                      <td className="p-2.5 font-semibold text-slate-800">
                        {item.name}
                      </td>
                      <td className="p-2.5 text-slate-600">
                        {item.grade ? `${item.grade}학년 ${item.classNo}반` : "-"}
                      </td>
                      <td className="p-2.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          item.role === "ADMIN" || item.role === "TEACHER"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-blue-50 text-blue-700"
                        }`}>
                          {item.role}
                        </span>
                      </td>
                      <td className="p-2.5">
                        {item.activatedAt ? (
                          <span className="inline-flex items-center gap-1 text-emerald-600 font-bold text-[11px]">
                            <UserCheck className="w-3.5 h-3.5" />
                            연동 완료
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">
                            미가입 (대기)
                          </span>
                        )}
                      </td>
                      <td className="p-2.5 text-center">
                        <button
                          onClick={() => handleToggleEnrollment(item.id, item.enrolled)}
                          className={`px-3 py-1 rounded-xl font-bold text-[11px] transition-colors ${
                            item.enrolled
                              ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                              : "bg-rose-100 text-rose-800 hover:bg-rose-200"
                          }`}
                        >
                          {item.enrolled ? "재학(정상)" : "제외(차단됨)"}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
