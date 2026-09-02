"use client";

import React from "react";
import { SCHOOL_CONFIG } from "@/lib/constants";

interface FilterTabsProps {
  currentType: string;
  onTypeChange: (type: string) => void;
  currentCategory: string;
  onCategoryChange: (cat: string) => void;
  currentBuilding: string;
  onBuildingChange: (bldg: string) => void;
}

export default function FilterTabs({
  currentType,
  onTypeChange,
  currentCategory,
  onCategoryChange,
  currentBuilding,
  onBuildingChange,
}: FilterTabsProps) {
  const tabs = [
    { key: "ALL", label: "전체" },
    { key: "FOUND", label: "✨ 주웠어요 (습득)" },
    { key: "LOST", label: "🚨 잃어버렸어요 (분실)" },
    { key: "NOTICE", label: "📢 학교공지" },
  ];

  const categories = ["전체", ...SCHOOL_CONFIG.categories];

  return (
    <div className="bg-white border-b border-slate-200 py-2.5 px-4 space-y-2.5">
      {/* 1. 상단 메인 탭 */}
      <div className="flex border-b border-slate-100 pb-2 gap-4 text-sm font-bold">
        {tabs.map((tab) => {
          const isActive = currentType === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => onTypeChange(tab.key)}
              className={`pb-1.5 transition-all relative ${
                isActive
                  ? "text-blue-600 font-extrabold"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              {tab.label}
              {isActive && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full" />
              )}
            </button>
          );
        })}
      </div>

      {/* 2. 카테고리 가로 스크롤 칩 & 건물 드롭다운 */}
      <div className="flex items-center gap-2">
        {/* 건물 선택 드롭다운 */}
        <div className="flex-shrink-0">
          <select
            value={currentBuilding}
            onChange={(e) => onBuildingChange(e.target.value)}
            className="text-xs font-semibold bg-slate-100 border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="전체">🏢 전체 장소</option>
            {SCHOOL_CONFIG.buildings.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </div>

        {/* 카테고리 가로스크롤 */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          {categories.map((cat) => {
            const isCatActive = currentCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => onCategoryChange(cat)}
                className={`text-xs px-2.5 py-1 rounded-full whitespace-nowrap font-medium transition-all ${
                  isCatActive
                    ? "bg-slate-900 text-white font-bold shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
