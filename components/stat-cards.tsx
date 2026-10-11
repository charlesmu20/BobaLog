import { Wallet, Coffee, ArrowUp, ArrowDown } from "lucide-react";

export default function StatCards({
  total,
  count,
  totalDiff,
  countDiff,
}: {
  total: number;
  count: number;
  totalDiff: number;
  countDiff: number;
}) {
  return (
    <div className="flex flex-col gap-3 h-full">
      <div className="flex-1 bg-[#E8D9C5]/40 rounded-xl p-3 flex items-center gap-3 border border-[#E3D8C6]/60 shadow-sm hover:scale-[1.01] transition-transform duration-150">
        <div className="w-8 h-8 rounded-full bg-[#D9C4A8] flex items-center justify-center shrink-0">
          <Wallet className="w-4 h-4 text-[#6B5338]" />
        </div>
        <div>
          <div className="text-xs text-[#6B5338]">當月花費</div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="text-xl font-medium text-[#473A28]">${total}</div>
            {totalDiff !== 0 && (
              <span className={`inline-flex items-center gap-0.5 text-[11px] px-2 py-0.5 rounded-full ${
                totalDiff > 0 ? "text-[#A3372B] bg-[#A3372B]/10" : "text-[#3B6D11] bg-[#3B6D11]/10"
              }`}>
                {totalDiff > 0 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                {totalDiff > 0 ? `+$${totalDiff}` : `-$${Math.abs(totalDiff)}`}
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="flex-1 bg-[#D6DCC4] rounded-xl p-3 flex items-center gap-3 border border-[#E3D8C6]/60 shadow-sm hover:scale-[1.01] transition-transform duration-150">
        <div className="w-8 h-8 rounded-full bg-[#C3CBA8] flex items-center justify-center shrink-0">
          <Coffee className="w-4 h-4 text-[#55602E]" />
        </div>
        <div>
          <div className="text-xs text-[#55602E]">當月杯數</div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="text-xl font-medium text-[#333B1C]">{count} 杯</div>
            {countDiff !== 0 && (
              <span className={`inline-flex items-center gap-0.5 text-[11px] px-2 py-0.5 rounded-full ${
                countDiff > 0 ? "text-[#55602E] bg-[#55602E]/15" : "text-[#8A7A63] bg-[#8A7A63]/10"
              }`}>
                {countDiff > 0 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                {countDiff > 0 ? `+${countDiff}杯` : `-${Math.abs(countDiff)}杯`}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}