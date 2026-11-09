import BrandIcon from "@/components/brand-icon";
import { getBrandIcon } from "@/lib/history-utils";
import { STICKER_CARD_BASE } from "@/lib/sticker-card";
import type { Brand } from "@/lib/brands";
import { RANK_STYLES } from "@/lib/rank-styles";

// 當月飲料排行,跟favorite-brands.tsx同一套排版,只是排名的單位從「品牌」
// 換成「品牌+飲料」的組合——同品牌不同飲料分開算,同品牌同飲料不分M/L杯型合併算同一組
export default function FavoriteDrinks({
  list,
  brands,
}: {
  list: { brand: string; drink: string; count: number }[];
  brands: Brand[];
}) {
  const slots = [0, 1, 2].map((i) => list[i] ?? null);

  return (
    <div className={`${STICKER_CARD_BASE} p-3.5 shadow-[3px_3px_0_0_#3C332B] transition-all hover:shadow-[2px_2px_0_0_#3C332B] hover:translate-x-px hover:translate-y-px`}>
      {/* 橘色菱形色塊,跟勳章頁CategoryHeading同一個點綴,幫標題加一點顏色重量 */}
      <div className="mb-3 flex items-center gap-2">
        <span aria-hidden className="size-2.5 shrink-0 rotate-45 rounded-[2px] border-2 border-[#3C332B] bg-[#C9732F]" />
        <span className="text-sm text-[#8A7A63]">當月飲料排行</span>
      </div>
      <div className="flex flex-col">
        {slots.map((d, i) => (
          <div key={i} className="flex items-center gap-3 py-2">
            <div
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-[#3C332B] text-xs font-bold ${
                d ? RANK_STYLES[i + 1] : "bg-[#F6F2EA] text-[#9A8B7A]"
              }`}
            >
              {i + 1}
            </div>
            {d ? (
              <>
                {/* 品牌名稱不另外顯示文字——左邊BrandIcon已經能辨識是哪個品牌,
                    跟當月最愛品牌卡同樣改成單行,不用為了多顯示品牌名稱字再多佔一行高度 */}
                <BrandIcon name={d.brand} icon={getBrandIcon(d.brand, brands)} size="w-8 h-8" />
                <div className="min-w-0 flex-1 truncate text-base text-[#4A3424]">{d.drink}</div>
                <div>
                  <span className="text-lg font-bold text-[#3C332B]">{d.count}</span>{" "}
                  <span className="text-base text-[#8A7A63]">杯</span>
                </div>
              </>
            ) : (
              <div className="flex-1" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
