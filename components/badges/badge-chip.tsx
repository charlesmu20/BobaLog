import type { BadgeDefinition } from "@/lib/badges";
import { STICKER_CARD_BASE } from "@/lib/sticker-card";
import { UnlockedStamp } from "./unlocked-stamp";

// 已解鎖勳章的小格子版本,放在「戰利品展示」區塊,跟下面還沒解鎖的完整長列分開
export function BadgeChip({
  badge,
  unlockedAt,
  medal,
}: {
  badge: BadgeDefinition;
  unlockedAt: Date;
  medal: React.ReactNode;
}) {
  return (
    <div
      className={`flex flex-col items-center gap-2.5 p-3 pb-3.5 text-center transition-transform duration-150 odd:-rotate-1 even:rotate-1 hover:-translate-y-0.5 motion-reduce:transition-none ${STICKER_CARD_BASE} shadow-[3px_3px_0_0_#3C332B] hover:shadow-[5px_5px_0_0_#3C332B]`}
    >
      <div className="size-16 sm:size-[72px]">{medal}</div>

      <div className="min-w-0">
        <p className="text-sm font-black text-[#4A3424]">{badge.title}</p>
        <p className="mt-0.5 text-xs leading-snug text-[#8A7A63]">{badge.description}</p>
      </div>

      <UnlockedStamp date={unlockedAt} size="sm" className="mt-auto" />
    </div>
  );
}
