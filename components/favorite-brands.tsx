import BrandIcon from "@/components/brand-icon";
import { Crown } from "lucide-react";
import { getBrandIcon } from "@/lib/history-utils";

const CROWN_COLORS = ["text-amber-500", "text-gray-400", "text-amber-700"];

export default function FavoriteBrands({
  list,
  selectedMonth,
}: {
  list: { brand: string; count: number }[];
  selectedMonth: string;
}) {
  const slots = [0, 1, 2].map((i) => list[i] ?? null);

  return (
    <div className="bg-[#E3CBB8]/30 rounded-xl p-3.5">
      <div className="text-sm text-[#7A4F38] mb-3">當月最愛品牌</div>
      <div className="flex flex-col">
        {slots.map((b, i) => (
          <div key={i} className="flex items-center gap-3 py-2">
            <div className="w-5 text-base font-medium text-[#7A4F38] text-center">
              {i + 1}
            </div>
            {b ? (
              <>
                <Crown className={`w-5 h-5 ${CROWN_COLORS[i]}`} />
                <BrandIcon name={b.brand} icon={getBrandIcon(b.brand)} size="w-8 h-8" />
                <div className="text-base flex-1 text-[#4A3424]">{b.brand}</div>
                <div>
                  <span className="text-lg font-bold text-[#4A3424]">{b.count}</span>{" "}
                  <span className="text-base text-[#7A4F38]">杯</span>
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