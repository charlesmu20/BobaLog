"use client";
import { Check, X } from "lucide-react";
import type { DiffType } from "@/lib/menu-report-types";

const TYPE_LABELS: Record<DiffType, string> = {
  newItem: "新品項",
  priceMismatch: "價格不符",
  possiblyRemoved: "疑似下架",
};

// 每種差異類型配色不一樣,方便一眼掃過去分辨——跟其他地方的徽章風格一致(淺底深字)
const TYPE_BADGE_CLASS: Record<DiffType, string> = {
  newItem: "bg-[#EAF3DE] text-[#3B6D11]",
  priceMismatch: "bg-[#FBEAF0] text-[#993556]",
  possiblyRemoved: "bg-[#F1EFE8] text-[#5F5E5A]",
};

export type DiffDecision = "approved" | "rejected" | undefined;

function formatPrices(prices?: { M: number; L: number }): string {
  if (!prices) return "";
  return prices.M === prices.L ? `${prices.M}元` : `M${prices.M} / L${prices.L}`;
}

export default function MenuReportDiffCard({
  type,
  name,
  priceLine,
  decision,
  onDecide,
  locked,
}: {
  type: DiffType;
  name: string;
  priceLine: string;
  decision: DiffDecision;
  onDecide: (decision: DiffDecision) => void;
  // 這筆回報已經處理完了(不是pending)——卡片本身跟選過的結果都還留著給人看,
  // 只是核准/拒絕這兩顆按鈕要鎖住不能再點,不是把整張卡片藏起來
  locked?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border-[2px] border-[#3C332B] bg-white px-3 py-2">
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <span className={`inline-block shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${TYPE_BADGE_CLASS[type]}`}>
            {TYPE_LABELS[type]}
          </span>
          <p className="truncate text-sm font-bold text-[#3C332B]">{name}</p>
        </div>
        <p className="mt-0.5 text-xs text-[#8A7A63]">{priceLine}</p>
      </div>
      <div className="flex shrink-0 gap-1.5">
        <button
          type="button"
          disabled={locked}
          onClick={() => onDecide(decision === "approved" ? undefined : "approved")}
          className={`flex items-center gap-1 rounded-lg border-2 border-[#3C332B] px-2 py-1 text-xs font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
            decision === "approved"
              ? "bg-[#A6C285] text-[#2E4019]"
              : "bg-[#F6F2EA] text-[#3C332B] enabled:hover:bg-[#EDE6D8]"
          } ${locked ? "" : "cursor-pointer"}`}
        >
          <Check className="size-3.5" /> 核准
        </button>
        <button
          type="button"
          disabled={locked}
          onClick={() => onDecide(decision === "rejected" ? undefined : "rejected")}
          className={`flex items-center gap-1 rounded-lg border-2 border-[#3C332B] px-2 py-1 text-xs font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
            decision === "rejected"
              ? "bg-[#F0997B] text-[#4A1B0C]"
              : "bg-[#F6F2EA] text-[#3C332B] enabled:hover:bg-[#EDE6D8]"
          } ${locked ? "" : "cursor-pointer"}`}
        >
          <X className="size-3.5" /> 拒絕
        </button>
      </div>
    </div>
  );
}

export { formatPrices };
