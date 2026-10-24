import type { ReactNode } from "react";
import { Wallet, Coffee, ArrowUp, ArrowDown, Flame, Coins } from "lucide-react";
import { STICKER_CARD_BASE } from "@/lib/sticker-card";

function StatCard({
  icon,
  iconBg,
  iconColor,
  label,
  value,
  diffLabel,
  diffPositive,
}: {
  icon: ReactNode;
  iconBg: string;
  iconColor: string;
  label: string;
  value: string;
  diffLabel?: string | null;
  diffPositive?: boolean;
}) {
  return (
    // min-h-[88px]:4張卡高度不一樣會導致items-center置中的基準不同,看起來圖示/文字
    // 沒對齊同一條線——給一個共同的最小高度,四張卡才會站在同一個基準上置中
    <div className={`${STICKER_CARD_BASE} flex min-h-[88px] items-center gap-3 p-3.5 shadow-[3px_3px_0_0_#3C332B] hover:shadow-[2px_2px_0_0_#3C332B] hover:translate-x-px hover:translate-y-px transition-all`}>
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-[#3C332B]"
        style={{ backgroundColor: iconBg }}
      >
        <span style={{ color: iconColor }}>{icon}</span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-xs text-[#8A7A63]">{label}</div>
        {/* 數字跟徽章本來就不該換行,一律同一行——靠外層StatCards欄位現在有
            minmax(320px,440px)的寬度保底,每張卡夠寬塞得下,不用再靠換行來避免擠爆 */}
        <div className="flex items-center gap-2">
          <div className="text-xl font-bold text-[#3C332B] whitespace-nowrap">{value}</div>
          {diffLabel && (
            <span
              className={`inline-flex shrink-0 items-center gap-0.5 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] ${
                diffPositive ? "text-[#A3372B] bg-[#A3372B]/10" : "text-[#3B6D11] bg-[#3B6D11]/10"
              }`}
            >
              {diffPositive ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
              {diffLabel}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function StatCards({
  total,
  count,
  totalDiff,
  countDiff,
  avgPerCup,
  streakDays,
}: {
  total: number;
  count: number;
  totalDiff: number;
  countDiff: number;
  avgPerCup: number;
  streakDays: number;
}) {
  return (
    // 原本「當月花費」「當月杯數」兩張疊在左欄,新的「平均每杯花費」「連續記帳天數」
    // 兩張疊在右欄,變成2x2格子,還是維持在原本StatCards這個窄欄位裡,不動旁邊的最愛品牌
    // 數字跟徽章不換行,所以手機版太窄時改成4張疊一欄(每張卡拿到全部寬度,塞得下不用換行),
    // 480px以上才切回2x2——min-w-0是因為這裡是外層grid(minmax(320px,440px))的直接子項目,
    // grid子項目預設min-width是auto(=內容自然寬度),沒有min-w-0的話寬度上限會被撐爆
    <div className="grid min-w-0 grid-cols-1 gap-3 min-[480px]:grid-cols-2">
      <StatCard
        icon={<Wallet className="h-4 w-4" />}
        iconBg="#D9C4A8"
        iconColor="#6B5338"
        label="當月花費"
        value={`$${total}`}
        diffLabel={totalDiff !== 0 ? (totalDiff > 0 ? `+$${totalDiff}` : `-$${Math.abs(totalDiff)}`) : null}
        diffPositive={totalDiff > 0}
      />
      <StatCard
        icon={<Coins className="h-4 w-4" />}
        iconBg="#E8CB96"
        iconColor="#6B5338"
        label="平均每杯"
        value={count > 0 ? `$${avgPerCup}` : "—"}
      />
      <StatCard
        icon={<Coffee className="h-4 w-4" />}
        iconBg="#C3CBA8"
        iconColor="#55602E"
        label="當月杯數"
        value={`${count} 杯`}
        diffLabel={countDiff !== 0 ? (countDiff > 0 ? `+${countDiff}杯` : `-${Math.abs(countDiff)}杯`) : null}
        diffPositive={countDiff > 0}
      />
      <StatCard
        icon={<Flame className="h-4 w-4" />}
        iconBg="#F2C14E"
        iconColor="#854F0B"
        label="連續記帳"
        value={`${streakDays} 天`}
      />
    </div>
  );
}
