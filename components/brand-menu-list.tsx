"use client";
import Link from "next/link";
import { Heart } from "lucide-react";
import type { Drink } from "@/lib/brands";

export default function BrandMenuList({
  brandSlug,
  grouped,
  isDrinkFavorited,
  onToggleFavoriteDrink,
  registerSectionRef,
  highlightedCategory,
}: {
  brandSlug: string;
  grouped: Record<string, Drink[]>;
  isDrinkFavorited: (drinkId: string) => boolean;
  onToggleFavoriteDrink: (drinkId: string) => void;
  registerSectionRef: (category: string, el: HTMLDivElement | null) => void;
  highlightedCategory: string | null;
}) {
  const entries = Object.entries(grouped);

  return (
    <div className="bg-white rounded-xl border border-[#E3D8C6] shadow-sm p-5">
      {entries.map(([category, drinks]) => (
        <div
          key={category}
          ref={(el) => registerSectionRef(category, el)}
          className="mb-4 last:mb-0 scroll-mt-[88px]"
        >
          <div
            className={`flex items-center gap-2 mb-3 -mx-2 px-2 py-1 rounded-lg transition-colors duration-300 ${
              highlightedCategory === category ? "bg-[#FBE4C8]" : "bg-transparent"
            }`}
          >
            <div className="w-1 h-4 bg-[#C9732F] rounded-full" />
            <div className="text-base font-medium text-[#4A3424]">{category}</div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-5">
            {drinks.map((drink) => {
              const sameSizePrice = drink.prices.M === drink.prices.L;
              const favorited = drink.id ? isDrinkFavorited(drink.id) : false;

              return (
                <div
                  key={drink.id ?? drink.name}
                  className="group relative py-3 px-2 -mx-2 rounded-lg border-b border-dashed border-[#E3D8C6] transition-colors duration-200 hover:bg-[#FBE4C8]/50 cursor-pointer"
                >
                  {/* 整排都能點擊跳到評論頁,蓋在最底層;愛心按鈕蓋在上面,用pointer-events把兩者的點擊分開處理 */}
                  {drink.id && (
                    <Link
                      href={`/brand/${brandSlug}/drink/${drink.id}`}
                      className="absolute inset-0"
                      aria-label={`查看 ${drink.name} 的評論`}
                    />
                  )}

                  <div className="relative flex items-start justify-between gap-2 pointer-events-none">
                    <span className="text-sm text-[#4A3424] truncate flex-1 min-w-0 transition-all duration-200 group-hover:text-[#C9732F] group-hover:translate-x-0.5">
                      {drink.name}
                    </span>
                    <button
                      onClick={() => drink.id && onToggleFavoriteDrink(drink.id)}
                      aria-label="收藏這個飲品"
                      className="pointer-events-auto w-6 h-6 rounded-full border border-[#E3D8C6] bg-white flex items-center justify-center flex-shrink-0"
                    >
                      <Heart
                        className="w-3.5 h-3.5"
                        style={{ color: favorited ? "#C9732F" : "#D3C9B8" }}
                        fill={favorited ? "#C9732F" : "none"}
                      />
                    </button>
                  </div>
                  <div className="relative flex gap-1.5 mt-2 pointer-events-none">
                    {sameSizePrice ? (
                      <span className="text-xs text-[#8A7A63] bg-[#F6EFE4] px-2 py-0.5 rounded">
                        ${drink.prices.M}
                      </span>
                    ) : (
                      <>
                        <span className="text-xs text-[#8A7A63] bg-[#F6EFE4] px-2 py-0.5 rounded">
                          M ${drink.prices.M}
                        </span>
                        <span className="text-xs text-[#8A7A63] bg-[#F6EFE4] px-2 py-0.5 rounded">
                          L ${drink.prices.L}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
      {entries.length === 0 && <div className="text-sm text-[#8A7A63] text-center py-6">找不到符合的飲品</div>}
    </div>
  );
}