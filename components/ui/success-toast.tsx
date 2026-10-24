"use client";
import { CheckCircle2 } from "lucide-react";
import { STICKER_CARD_BASE } from "@/lib/sticker-card";

// 跟useSuccessToast搭配使用的共用提示元件,message是null就不渲染。
// 固定在左下角,避免跟右下角的勳章解鎖toast疊在一起
export default function SuccessToast({ message }: { message: string | null }) {
  if (!message) return null;

  return (
    <div className="fixed bottom-4 left-4 z-[60] w-[calc(100vw-2rem)] max-w-xs">
      <div
        role="status"
        className={`flex items-center gap-2.5 p-3 ${STICKER_CARD_BASE} shadow-[4px_4px_0_0_#3C332B] animate-in fade-in slide-in-from-bottom-4 duration-300`}
      >
        <CheckCircle2 className="h-5 w-5 shrink-0 text-[#3B6D11]" />
        <p className="text-sm font-medium text-[#3C332B]">{message}</p>
      </div>
    </div>
  );
}
