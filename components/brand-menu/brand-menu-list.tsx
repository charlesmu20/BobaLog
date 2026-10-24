"use client";
import Link from "next/link";
import { Heart, Star } from "lucide-react";
import type { Drink } from "@/lib/brands";
import type { DrinkRatingSummary } from "@/lib/hooks/useRating";

export default function BrandMenuList({
  brandSlug,
  grouped,
  isDrinkFavorited,
  onToggleFavoriteDrink,
  registerSectionRef,
  highlightedCategory,
  ratingsByDrink,
}: {
  brandSlug: string;
  grouped: Record<string, Drink[]>;
  isDrinkFavorited: (drinkId: string) => boolean;
  onToggleFavoriteDrink: (drinkId: string) => void;
  registerSectionRef: (category: string, el: HTMLDivElement | null) => void;
  highlightedCategory: string | null;
  // 只有被評分過的飲料才會出現在這個map裡,沒評分過的drink.id查不到就不顯示角標
  ratingsByDrink: Record<string, DrinkRatingSummary>;
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
              const rating = drink.id ? ratingsByDrink[drink.id] : undefined;

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
                  {/* gap-x/gap-y分開寫:水平間距(M跟L徽章之間)維持原本緊湊的1.5,
                      垂直間距(星星被擠到下一行時,跟上面價格徽章的距離)加大一點,不要太貼 */}
                  <div className="relative flex flex-wrap items-center justify-between gap-x-1.5 gap-y-2 mt-2 pointer-events-none">
                    {/* shrink-0+whitespace-nowrap:原本評分星星擠進來時,這兩個價格徽章會被flex擠壓到
                        低於文字原本寬度,導致「M」「$50」中間被迫分行。鎖住不讓它縮小、文字也不換行,
                        真的放不下時改讓整排(含星星)一起wrap到下一行,而不是框框內部斷字 */}
                    <div className="flex shrink-0 gap-1.5">
                      {sameSizePrice ? (
                        <span className="whitespace-nowrap text-xs font-medium text-[#3C332B] bg-[#F6F2EA] border border-[#3C332B] px-2 py-0.5 rounded">
                          ${drink.prices.M}
                        </span>
                      ) : (
                        <>
                          <span className="whitespace-nowrap text-xs font-medium text-[#3C332B] bg-[#F6F2EA] border border-[#3C332B] px-2 py-0.5 rounded">
                            M ${drink.prices.M}
                          </span>
                          <span className="whitespace-nowrap text-xs font-medium text-[#3C332B] bg-[#F6F2EA] border border-[#3C332B] px-2 py-0.5 rounded">
                            L ${drink.prices.L}
                          </span>
                        </>
                      )}
                    </div>
                    {/* 只有被評分過的飲料(rating存在且count>0)才顯示,右下角一顆實心星星+平均分數 */}
                    {rating && rating.count > 0 && (
                      <span className="flex shrink-0 items-center gap-0.5 text-xs font-medium text-[#3C332B]">
                        <Star className="w-3 h-3" style={{ color: "#C9732F" }} fill="#C9732F" />
                        {rating.average.toFixed(1)}
                      </span>
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