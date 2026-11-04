"use client";
import { X } from "lucide-react";

// 點回報照片縮圖放大看用的簡單燈箱,點背景或X都能關掉
export default function PhotoLightbox({ url, onClose }: { url: string; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-5 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="關閉"
        className="absolute right-5 top-5 flex size-9 cursor-pointer items-center justify-center rounded-full bg-white/90 text-[#3C332B] shadow-[3px_3px_0_0_#3C332B]"
      >
        <X className="size-5" />
      </button>
      {/* eslint-disable-next-line @next/next/no-img-element -- 遠端Storage照片,原尺寸直接顯示在燈箱裡,
          不需要next/image的優化流程 */}
      <img
        src={url}
        alt="回報照片放大檢視"
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] max-w-[90vw] rounded-xl object-contain shadow-[6px_6px_0_0_rgba(0,0,0,0.4)]"
      />
    </div>
  );
}
