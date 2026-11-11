"use client";
import { X, Sparkles, RotateCcw } from "lucide-react";

// 聊天面板最上面的漸層header:頭像+標題+重新整理按鈕+關閉按鈕。
// 只需要知道「按鈕按下去要做什麼」,所以只吃onClose/onReset兩個callback,
// 不需要知道open狀態、對話紀錄本身是怎麼管理的——那是chat-panel.tsx的事
//
// #155:拿掉原本手動切換記帳/推薦模式的按鈕——後端現在會自己判斷每句話是記帳還是推薦
// (routeMessage.ts),標題/副標題不再需要照mode換字,固定顯示一個統一的小幫手身分就好
//
// onReset:效果跟「把整個網頁重新整理一次」一樣(清空這次對話紀錄,從頭開始問),
// 不是「關閉面板」——使用者可能只是想甩掉一段卡住/講歪的對話,重新問,
// 不想因此把整個聊天面板關掉再重新打開那麼麻煩
export default function ChatHeader({ onClose, onReset }: { onClose: () => void; onReset: () => void }) {
  return (
    <div className="flex items-center gap-2.5 bg-gradient-to-r from-[#D98A44] to-[#B2612A] p-4">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/20">
        <Sparkles className="size-4 text-white" />
      </div>
      <div className="flex-1">
        <p className="font-bold text-white">BobaLog小幫手</p>
        <p className="text-xs text-white/70">記一筆,或是找飲料喝,跟我說就好</p>
      </div>
      {/* 圓形底色常駐顯示(不是只有hover才出現),跟左邊頭像的bg-white/20同一種圓形風格
          互相呼應;hover時加深成bg-white/30給明確的互動回饋。尺寸也加大一點(size-9),
          原本size-8+只有icon沒有底色,太不顯眼 */}
      <button
        onClick={onReset}
        aria-label="重新整理對話"
        title="重新整理對話"
        className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full bg-white/20 text-white transition-colors hover:bg-white/30"
      >
        <RotateCcw className="size-4" />
      </button>
      <button
        onClick={onClose}
        aria-label="關閉"
        className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full bg-white/20 text-white transition-colors hover:bg-white/30"
      >
        <X className="size-5" />
      </button>
    </div>
  );
}
