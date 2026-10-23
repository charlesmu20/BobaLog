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
    <div className="bg-[#F6F2EA] rounded-2xl border-[3px] border-[#3C332B] shadow-[5px_5px_0_0_#3C332B] p-5">
      {entries.map(([category, drinks]) => (
        <div
          key={category}
          ref={(el) => registerSectionRef(category, el)}
          className={`mb-4 last:mb-0 scroll-mt-[100px] min-[650px]:scroll-mt-[108px] rounded-2xl border-[3px] p-3 -mx-3 transition-all duration-300 ${
            highlightedCategory === category
              ? "border-[#3C332B] bg-white shadow-[4px_4px_0_0_#A6C285]"
              : "border-transparent shadow-none"
          }`}
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1 h-4 bg-[#A6C285] rounded-full border border-[#3C332B]" />
            <div className="text-base font-black text-[#3C332B]">{category}</div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-5">
            {drinks.map((drink) => {
              const sameSizePrice = drink.prices.M === drink.prices.L;
              const favorited = drink.id ? isDrinkFavorited(drink.id) : false;

              return (
                <div
                  key={drink.id ?? drink.name}
                  className="group relative py-3 px-2 -mx-2 rounded-lg border-b border-dashed border-[#D9CFC0] transition-colors duration-200 hover:bg-[#A6C285]/20 cursor-pointer"
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
                    <span className="text-sm font-medium text-[#3C332B] truncate flex-1 min-w-0 transition-all duration-200 group-hover:translate-x-0.5">
                      {drink.name}
                    </span>
                    <button
                      onClick={() => drink.id && onToggleFavoriteDrink(drink.id)}
                      aria-label="收藏這個飲品"
                      className="pointer-events-auto w-6 h-6 rounded-full border-2 border-[#3C332B] bg-white flex items-center justify-center flex-shrink-0 cursor-pointer transition-transform hover:scale-110 active:scale-90"
                    >
                      <Heart
                        className="w-3.5 h-3.5 transition-transform"
                        style={{ color: favorited ? "#A6C285" : "#9A8B7A" }}
                        fill={favorited ? "#A6C285" : "none"}
                      />
                    </button>
                  </div>
                  <div className="relative flex gap-1.5 mt-2 pointer-events-none">
                    {sameSizePrice ? (
                      <span className="text-xs font-medium text-[#3C332B] bg-[#F6F2EA] border border-[#3C332B] px-2 py-0.5 rounded">
                        ${drink.prices.M}
                      </span>
                    ) : (
                      <>
                        <span className="text-xs font-medium text-[#3C332B] bg-[#F6F2EA] border border-[#3C332B] px-2 py-0.5 rounded">
                          M ${drink.prices.M}
                        </span>
                        <span className="text-xs font-medium text-[#3C332B] bg-[#F6F2EA] border border-[#3C332B] px-2 py-0.5 rounded">
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
      {entries.length === 0 && <div className="text-sm text-[#6B5D4F] text-center py-6">找不到符合的飲品</div>}
    </div>
  );
}