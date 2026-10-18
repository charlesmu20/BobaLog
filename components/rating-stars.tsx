"use client";
import { useState } from "react";
import { Star } from "lucide-react";

export default function RatingStars({
  myRating,
  onRate,
}: {
  myRating: number | null;
  onRate: (rating: number) => void;
}) {
  const [hoverValue, setHoverValue] = useState<number | null>(null);
  const stars = [1, 2, 3, 4, 5];
  const value = hoverValue ?? myRating ?? 0;

  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs text-[#8A7A63]">你的評分</span>
      <div className="flex gap-0.5" onMouseLeave={() => setHoverValue(null)}>
        {stars.map((i) => {
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
                className="w-4 h-4"
                style={{ color: filled ? "#C9732F" : "#D3C9B8" }}
                fill={filled ? "#C9732F" : "none"}
              />
            </button>
          );
        })}
      </div>
      {myRating !== null && (
        <span className="text-xs text-[#8A7A63]">已評分</span>
      )}
    </div>
  );
}