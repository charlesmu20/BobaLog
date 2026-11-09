import BrandIcon from "@/components/brand-icon";
import { getBrandIcon } from "@/lib/history-utils";
import type { Brand } from "@/lib/brands";
import type { LogEntry } from "@/lib/types";

// 快速記帳那排橫向捲動按鈕,從log-modal.tsx拆出來,純展示用、不帶任何計算邏輯
export default function QuickPicks({
  entries,
  brands,
  onPick,
}: {
  entries: LogEntry[];
  brands: Brand[];
  onPick: (entry: LogEntry) => void;
}) {
  if (entries.length === 0) return null;

  return (
    <div className="mb-4">
      <label className="text-sm text-[#8A7A63] block mb-1.5">快速記帳</label>
      {/* 單排橫向捲動,不要flex-wrap——不然筆數不是整除時,最後一排會留一塊明顯的空白。
          原本想用攔截滾輪事件的方式,把一般滑鼠的垂直捲動轉成這排的水平捲動,
          但React的onWheel沒辦法真的攔住瀏覽器預設的垂直捲動(會變成兩個方向同時在捲,
          更怪),所以改成顯示一條細細的橫向捲軸——沒有觸控板的話,直接用滑鼠拖這條捲軸
          就能看到被截掉的項目,跟外層彈窗本身的直式捲軸(max-h-[90vh] overflow-y-auto)
          一樣沒有刻意隱藏,是同一套做法 */}
      <div className="flex gap-1.5 overflow-x-auto flex-nowrap pb-1.5 [scrollbar-width:thin] [scrollbar-color:#D8CBB5_transparent] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#D8CBB5]">
        {entries.map((entry) => (
          <button
            key={entry.id}
            type="button"
            onClick={() => onPick(entry)}
            className="flex shrink-0 items-center gap-1 rounded-full border-2 border-[#3C332B] bg-[#F6F2EA] py-1 pl-1 pr-2.5 text-xs font-medium text-[#4A3424] shadow-[2px_2px_0_0_#3C332B] transition-all cursor-pointer hover:bg-[#A6C285] hover:shadow-[1px_1px_0_0_#3C332B] hover:translate-x-px hover:translate-y-px"
          >
            <BrandIcon name={entry.brand} icon={getBrandIcon(entry.brand, brands)} size="w-4 h-4" />
            {entry.drink}
          </button>
        ))}
      </div>
    </div>
  );
}
