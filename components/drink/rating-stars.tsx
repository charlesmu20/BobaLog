"use client";
import { useState } from "react";
import { Star } from "lucide-react";

const STARS = [1, 2, 3, 4, 5];

// 可互動的星星輸入(只有星星本身;「你的評分」標籤跟「已評分」提示由外層頁面自己排版,
// 這樣才能套進v0那版「計分板」的直式排法——標籤+已評分在上面一排,星星單獨一排在下面)
export default function RatingStars({
  myRating,
  onRate,
}: {
  myRating: number | null;
  onRate: (rating: number) => void;
}) {
  const [hoverValue, setHoverValue] = useState<number | null>(null);
  const value = hoverValue ?? myRating ?? 0;

  return (
    <div
      role="radiogroup"
      aria-label="你的評分"
      className="-ml-1.5 flex items-center"
      onMouseLeave={() => setHoverValue(null)}
    >
      {STARS.map((n) => {
        const filled = n <= value;
        return (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={myRating === n}
            aria-label={`給 ${n} 顆星`}
            onMouseEnter={() => setHoverValue(n)}
            onFocus={() => setHoverValue(n)}
            onBlur={() => setHoverValue(null)}
            onClick={() => onRate(n)}
            className="-mx-px cursor-pointer rounded-md p-1.5 transition-transform hover:scale-110"
          >
            <Star
              className="w-5 h-5"
              style={{ color: filled ? "#A6C285" : "#D9CFC0" }}
              fill={filled ? "#A6C285" : "none"}
            />
          </button>
        );
      })}
    </div>
  );
}

// 顯示用的靜態星星(平均評分旁邊那排),不能點。
// 用遮罩按比例填滿每顆星(不是四捨五入到整顆),4.5分才會真的顯示成4顆半,
// 不會跟5.0分看起來一樣
export function StaticStars({ value }: { value: number }) {
  return (
    <div aria-hidden className="flex items-center gap-0.5">
      {STARS.map((n) => {
        const fillPercent = Math.max(0, Math.min(1, value - (n - 1))) * 100;
        return (
          <span key={n} className="relative inline-block w-4 h-4">
            <Star className="absolute inset-0 w-4 h-4" style={{ color: "#D9CFC0" }} />
            <span className="absolute inset-0 overflow-hidden" style={{ width: `${fillPercent}%` }}>
              <Star className="w-4 h-4" style={{ color: "#A6C285" }} fill="#A6C285" />
            </span>
          </span>
        );
      })}
    </div>
  );
}
