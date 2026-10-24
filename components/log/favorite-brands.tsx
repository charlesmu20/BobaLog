import BrandIcon from "@/components/brand-icon";
import { getBrandIcon } from "@/lib/history-utils";
import { STICKER_CARD_BASE } from "@/lib/sticker-card";
import type { Brand } from "@/lib/brands";
import { RANK_STYLES } from "@/lib/rank-styles";

export default function FavoriteBrands({
  list,
  brands,
}: {
  list: { brand: string; count: number }[];
  brands: Brand[];
}) {
  const slots = [0, 1, 2].map((i) => list[i] ?? null);

  return (
    <div className={`${STICKER_CARD_BASE} p-3.5 shadow-[3px_3px_0_0_#3C332B] transition-all hover:shadow-[2px_2px_0_0_#3C332B] hover:translate-x-px hover:translate-y-px`}>
      <div className="text-sm text-[#8A7A63] mb-3">當月最愛品牌</div>
      <div className="flex flex-col">
        {slots.map((b, i) => (
          <div key={i} className="flex items-center gap-3 py-2">
            <div
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-[#3C332B] text-xs font-bold ${
                b ? RANK_STYLES[i + 1] : "bg-[#F6F2EA] text-[#9A8B7A]"
              }`}
            >
              {i + 1}
            </div>
            {b ? (
              <>
                <BrandIcon name={b.brand} icon={getBrandIcon(b.brand, brands)} size="w-8 h-8" />
                <div className="text-base flex-1 text-[#4A3424]">{b.brand}</div>
                <div>
                  <span className="text-lg font-bold text-[#3C332B]">{b.count}</span>{" "}
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