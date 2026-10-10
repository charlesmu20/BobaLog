import { Wallet, Coffee } from "lucide-react";

export default function StatCards({
  total,
  count,
}: {
  total: number;
  count: number;
}) {
  return (
    <div className="flex flex-col gap-3 h-full">
      <div className="flex-1 bg-[#E8D9C5]/40 rounded-xl p-3 flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-[#D9C4A8] flex items-center justify-center shrink-0">
          <Wallet className="w-4 h-4 text-[#6B5338]" />
        </div>
        <div>
          <div className="text-xs text-[#6B5338]">當月花費</div>
          <div className="text-xl font-medium text-[#473A28]">${total}</div>
        </div>
      </div>
      <div className="flex-1 bg-[#D6DCC4] rounded-xl p-3 flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-[#C3CBA8] flex items-center justify-center shrink-0">
          <Coffee className="w-4 h-4 text-[#55602E]" />
        </div>
        <div>
          <div className="text-xs text-[#55602E]">當月杯數</div>
          <div className="text-xl font-medium text-[#333B1C]">{count} 杯</div>
        </div>
      </div>
    </div>
  );
}