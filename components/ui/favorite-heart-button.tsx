"use client";
import { Heart } from "lucide-react";

// 品牌頁的收藏愛心(+全站幾人收藏的數字徽章)跟飲料頁的那顆,結構跟樣式幾乎一模一樣,
// 統一抽成這裡共用——count為0時不顯示徽章
export function FavoriteHeartButton({
  isFavorited,
  count,
  onClick,
  ariaLabel,
  className = "",
}: {
  isFavorited: boolean;
  count: number;
  onClick: () => void;
  ariaLabel: string;
  className?: string;
}) {
  return (
    <div className={`relative flex-shrink-0 ${className}`}>
      <button
        onClick={onClick}
        aria-label={ariaLabel}
        className="w-9 h-9 rounded-full bg-[#F6F2EA] border-[3px] border-[#3C332B] flex items-center justify-center cursor-pointer transition-transform hover:-translate-y-0.5"
      >
        <Heart className="w-4 h-4" style={{ color: "#3C332B" }} fill={isFavorited ? "#A6C285" : "none"} />
      </button>
      {count > 0 && (
        <span className="absolute -top-1.5 -right-2 rounded-full border-[1.5px] border-[#3C332B] bg-[#A6C285] px-1.5 py-0 text-[10px] font-bold leading-[1.3] text-[#213318]">
          {count}
        </span>
      )}
    </div>
  );
}
