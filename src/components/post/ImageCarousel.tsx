"use client";

import React, { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function ImageCarousel({ images }: { images: Array<{ url: string }> }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!images || images.length === 0) {
    return (
      <div className="w-full h-64 bg-slate-100 flex flex-col items-center justify-center text-slate-400">
        <span className="text-4xl mb-2">📦</span>
        <span className="text-sm font-medium">등록된 사진이 없습니다.</span>
      </div>
    );
  }

  const prev = () => {
    setCurrentIndex((curr) => (curr === 0 ? images.length - 1 : curr - 1));
  };

  const next = () => {
    setCurrentIndex((curr) => (curr === images.length - 1 ? 0 : curr + 1));
  };

  return (
    <div className="relative w-full bg-black/5 aspect-square max-h-96 overflow-hidden rounded-2xl border border-slate-200">
      <img
        src={images[currentIndex].url}
        alt={`사진 ${currentIndex + 1}`}
        className="w-full h-full object-contain bg-slate-900/5"
      />

      {images.length > 1 && (
        <>
          <button
            onClick={prev}
            className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/60 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={next}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/60 transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          {/* 인디케이터 뱃지 */}
          <div className="absolute bottom-3 right-3 bg-black/60 text-white text-xs font-semibold px-2 py-0.5 rounded-full">
            {currentIndex + 1} / {images.length}
          </div>
        </>
      )}
    </div>
  );
}
