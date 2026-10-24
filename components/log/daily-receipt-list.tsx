import BrandIcon from "@/components/brand-icon";
import { Coffee } from "lucide-react";
import { Pencil, Trash2 } from "lucide-react";
import { formatDateHeader, getBrandIcon } from "@/lib/history-utils";
import { STICKER_CARD_BASE } from "@/lib/sticker-card";
import type { LogEntry } from "@/lib/types";
import type { Brand } from "@/lib/brands";

export default function DailyReceiptList({
  groups,
  onEdit,
  onDelete,
  brands,
  fadingOutId,
}: {
  groups: { key: string; date: string; items: LogEntry[]; subtotal: number }[];
  onEdit: (log: LogEntry) => void;
  onDelete: (id: string) => void;
  brands: Brand[];
  // 確認刪除後,先讓這一筆淡出再真的從Firestore刪除,不要瞬間消失
  fadingOutId?: string | null;
}) {
  if (groups.length === 0) {
    return (
      <div className="text-center text-[#8A7A63] text-sm py-10">
        這個月還沒有任何紀錄
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {groups.map((group) => (
        <div key={group.key} className={`${STICKER_CARD_BASE} p-4 shadow-[4px_4px_0_0_#3C332B] transition-all hover:shadow-[3px_3px_0_0_#3C332B] hover:translate-x-px hover:translate-y-px`}>
          <div className="flex items-center justify-between mb-3 pb-3 border-b border-dashed border-[#D9C9AE]">
            <div className="text-sm text-[#8A7A63]">{formatDateHeader(group.date)}</div>
            <div className="flex items-center gap-4">
              <span className="text-lg font-bold text-[#3C332B]">${group.subtotal}</span>
              <span className="flex items-center gap-1 text-sm text-[#8A7A63]">
                <Coffee className="w-3.5 h-3.5" />
                {group.items.length}
              </span>
            </div>
          </div>
          <div className="flex flex-col divide-y divide-[#E3D8C6]/60">
            {group.items.map((item) => (
                <div
                  key={item.id}
                  className={`flex items-center gap-3 py-2 transition-all duration-200 ${
                    fadingOutId === item.id ? "opacity-0 scale-95" : "opacity-100 scale-100"
                  }`}
                >
                <div className="flex items-center gap-2 shrink-0">
                <BrandIcon name={item.brand} icon={getBrandIcon(item.brand, brands)} />
                <div>
                    {/* 加料跟杯型一樣,併進飲料名稱同一行(用同樣的淺咖啡小字),
                        不要自己獨立一整行——不然會變成飲料名/加料/品牌三行都擠在一起,
                        加料那行又跟品牌那行同樣淺咖啡色、同樣字級,看起來像重複兩行一樣的灰字 */}
                    <div className="text-sm font-medium text-[#3C332B]">
                    {item.drink}
                    {item.size ? (
                        <span className="text-xs font-normal text-[#8A7A63]"> {item.size}</span>
                    ) : null}
                    {item.addOns && item.addOns.length > 0 ? (
                        <span className="text-xs font-normal text-[#8A7A63]"> +{item.addOns.map((a) => a.name).join("、")}</span>
                    ) : null}
                    </div>
                    <div className="text-xs text-[#8A7A63] mt-0.5">{item.brand}</div>
                </div>
                </div>
                    <div className="flex-1 text-sm text-[#8A7A63] truncate pl-4">
                    {item.note}
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                    <span className="text-sm font-medium text-[#4A3424]">${item.amount}</span>
                    <button onClick={() => onEdit(item)} aria-label="編輯" className="text-[#8A7A63] cursor-pointer transition-colors hover:text-[#C9732F]">
                        <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => onDelete(item.id)} aria-label="刪除" className="text-[#A3372B] cursor-pointer transition-colors hover:text-[#7a2420]">
                        <Trash2 className="w-4 h-4" />
                    </button>
                    </div>
                </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}