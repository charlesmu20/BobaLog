"use client";
import { useState } from "react";
import { Star } from "lucide-react";

export default function RatingStars({
  myRating, // 從外面傳進來:「我」之前已經送出、存在資料庫裡的評分(沒評過就是 null)
  onRate, // 從外面傳進來:點擊某顆星星時要呼叫的函式,把「我選了幾顆」往外傳出去
}: {
  myRating: number | null;
  onRate: (rating: number) => void;
}) {
  // 記錄滑鼠目前停在第幾顆星星上,純粹拿來做「預覽效果」用,跟真正存進資料庫的myRating分開
  const [hoverValue, setHoverValue] = useState<number | null>(null);
  const stars = [1, 2, 3, 4, 5];
  
  // 決定「現在畫面上該亮到第幾顆」
  const value = hoverValue ?? myRating ?? 0;

  return (
    <div>
      <p className="text-xs text-[#8A7A63] mb-2">你的評分</p>
      {/* onMouseLeave 綁在這個外層div(包住全部5顆星星),不是綁在每顆星星上 */}
      <div className="flex gap-1" onMouseLeave={() => setHoverValue(null)}>
        {stars.map((i) => {
          // 這顆星星(第i顆)在目前的value之下,算不算「該填滿」
          const filled = i <= value;
          return (
            <button
              key={i}
              type="button"
              onMouseEnter={() => setHoverValue(i)}
              onClick={() => onRate(i)}
              aria-label={`給 ${i} 顆星`}
            >
              <Star
                className="w-6 h-6"
                style={{ color: filled ? "#C9732F" : "#D3C9B8" }}
                fill={filled ? "#C9732F" : "none"}
              />
            </button>
          );
        })}
      </div>
      {/* 只有「已經評過分」才顯示這行文字提醒 */}
      {myRating !== null && (
        <p className="text-xs text-[#8A7A63] mt-2">你給了 {myRating} 顆星</p>
      )}
    </div>
  );
}