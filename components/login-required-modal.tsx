"use client";
import Link from "next/link";
import { X, LogIn } from "lucide-react";
import { STICKER_CARD_BASE } from "@/lib/sticker-card";
import { STICKER_BUTTON_BASE } from "@/lib/sticker-button";

export default function LoginRequiredModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    // 跟confirm-dialog.tsx、log-modal.tsx同一套:粗邊框貼紙卡+打開時淡入放大,
    // 原本是舊的白底圓角陰影樣式,沒跟上全站改版
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className={`relative ${STICKER_CARD_BASE} p-6 w-full max-w-xs text-center shadow-[6px_6px_0_0_#3C332B] animate-in fade-in zoom-in-95 duration-200`}>
        <button
          onClick={onClose}
          aria-label="關閉"
          className="absolute top-3 right-3 text-[#8A7A63] cursor-pointer transition-colors hover:text-[#3C332B]"
        >
          <X className="w-4 h-4" />
        </button>
        <div className="mx-auto mb-3 mt-1 flex h-11 w-11 items-center justify-center rounded-full border-2 border-[#3C332B] bg-[#F6EFE4]">
          <LogIn className="h-5 w-5 text-[#6B5338]" />
        </div>
        <p className="text-sm font-medium text-[#4A3424] mb-5">請先登入才能使用這個功能</p>
        <Link
          href="/login"
          className={`${STICKER_BUTTON_BASE} inline-flex items-center justify-center rounded-full px-5 py-2 text-sm font-bold`}
        >
          前往登入
        </Link>
      </div>
    </div>
  );
}
