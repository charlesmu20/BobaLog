import { Loader2 } from "lucide-react";
import { STICKER_CARD_BASE } from "@/lib/sticker-card";

// 置中的loading卡片,首頁、收藏頁、地圖頁等任何需要「資料抓完才顯示」的頁面都能用
export default function LoadingCard({ message = "載入中..." }: { message?: string }) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className={`${STICKER_CARD_BASE} flex flex-col items-center gap-3 px-10 py-8 shadow-[5px_5px_0_0_#3C332B]`}>
        <Loader2 className="h-8 w-8 animate-spin text-[#A6C285]" aria-hidden="true" />
        <p className="text-sm font-bold text-[#3C332B]">{message}</p>
      </div>
    </div>
  );
}
