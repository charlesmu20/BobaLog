import BrandIcon from "@/components/brand-icon";
import { Coffee } from "lucide-react";
import { Pencil, Trash2 } from "lucide-react";
import { formatDateHeader, getBrandIcon } from "@/lib/history-utils";
import type { LogEntry } from "@/lib/types";

export default function DailyReceiptList({
  groups,
  onEdit,
  onDelete,
}: {
  groups: { key: string; date: string; items: LogEntry[]; subtotal: number }[];
  onEdit: (log: LogEntry) => void;
  onDelete: (id: string) => void;
}) {
  if (groups.length === 0) {
    return (
      <div className="text-center text-muted-foreground text-sm py-10">
        這個月還沒有任何紀錄
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {groups.map((group) => (
        <div key={group.key} className="bg-[#F6EFE4]/70 border border-[#E3D8C6]/60 rounded-xl p-4 border border-[#E3D8C6]/60 shadow-sm hover:scale-[1.01] transition-transform duration-150">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm text-muted-foreground">{formatDateHeader(group.date)}</div>
            <div className="flex items-center gap-4">
              <span className="text-lg font-semibold text-foreground">${group.subtotal}</span>
              <span className="flex items-center gap-1 text-sm text-muted-foreground">
                <Coffee className="w-3.5 h-3.5" />
                {group.items.length}
              </span>
            </div>
          </div>
          <div className="flex flex-col">
            {group.items.map((item, idx) => (
                <div key={item.id} className="flex items-center gap-3 py-2">
                    
                <div className="flex items-center gap-2 shrink-0">
                <BrandIcon name={item.brand} icon={getBrandIcon(item.brand)} />
                <div>
                    <div className="text-sm font-medium text-foreground">
                    {item.drink}
                    {item.size ? (
                        <span className="text-xs font-normal text-muted-foreground"> {item.size}</span>
                    ) : null}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">{item.brand}</div>
                </div>
                </div>
                    <div className="flex-1 text-sm text-muted-foreground truncate pl-4">
                    {item.note}
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                    <span className="text-sm">${item.amount}</span>
                    <button onClick={() => onEdit(item)} className="text-muted-foreground cursor-pointer">
                        <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => onDelete(item.id)} className="text-destructive cursor-pointer">
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