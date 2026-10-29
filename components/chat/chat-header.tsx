"use client";
import { X, Sparkles } from "lucide-react";

// 聊天面板最上面的漸層header:頭像+標題+關閉按鈕。
// 只需要知道「關閉按鈕按下去要做什麼」,所以只吃一個onClose prop,
// 不需要知道open狀態本身是怎麼管理的——那是chat-panel.tsx的事
export default function ChatHeader({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex items-center gap-2.5 bg-gradient-to-r from-[#D98A44] to-[#B2612A] p-4">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/20">
        <Sparkles className="size-4 text-white" />
      </div>
      <div className="flex-1">
        <p className="font-bold text-white">記帳小幫手</p>
        <p className="text-xs text-white/70">隨時幫你記一筆</p>
      </div>
      <button onClick={onClose} aria-label="關閉" className="text-white/70 hover:text-white">
        <X className="size-4" />
      </button>
    </div>
  );
}
