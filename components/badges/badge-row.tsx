import { Check, Flame, Lock } from "lucide-react";
import type { BadgeDefinition } from "@/lib/badges";

function formatDate(d: Date) {
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}.${mm}.${dd}`;
}

export function BadgeRow({
  badge,
  unlockedAt,
  current,
  medal,
}: {
  badge: BadgeDefinition;
  unlockedAt: Date | undefined;
  current: number | null; // null代表stats還沒抓回來,先不要顯示假的0
  medal: React.ReactNode;
}) {
  const unlocked = unlockedAt !== undefined;
  const ratio = current === null ? 0 : Math.max(0, Math.min(1, current / badge.threshold));
  const percent = Math.floor(ratio * 100);
  // 未解鎖、且完成度達80%以上:算「快完成了」,進度條跟提示牌都改用橘色強調
  const almostThere = !unlocked && percent >= 80;

  return (
    <li
      className={`flex items-center gap-4 rounded-2xl border-[3px] border-[#3C332B] p-3.5 shadow-[4px_4px_0_0_#3C332B] sm:p-4 ${
        unlocked ? "bg-[#F6F2EA]" : "bg-[#C7C2B7]"
      }`}
    >
      <div className="relative size-[72px] shrink-0 sm:size-20">
        <div className={`size-full ${unlocked ? "" : "opacity-60 grayscale"}`}>{medal}</div>
        {!unlocked && (
          <span
            className="absolute -right-1.5 -bottom-1.5 flex size-7 rotate-6 items-center justify-center rounded-full border-[3px] border-[#3C332B] bg-[#F6F2EA]"
            aria-hidden
          >
            <Lock className="size-3.5 text-[#3C332B]" strokeWidth={3} />
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-base leading-tight font-black text-[#4A3424]">{badge.title}</h3>
          {!unlocked && current !== null && (
            <span className="shrink-0 rounded-full border-2 border-[#3C332B] bg-[#F6F2EA] px-2 py-0.5 text-xs font-black text-[#4A3424] tabular-nums">
              {`${Math.min(current, badge.threshold)}/${badge.threshold}`}
            </span>
          )}
        </div>
        <p className={`mt-1 text-sm leading-snug ${unlocked ? "text-[#4A3424]" : "text-[#4A3424]/80"}`}>
          {badge.description}
        </p>

        {unlocked ? (
          <p className="mt-2.5 inline-flex items-center gap-1.5 rounded-full border-2 border-[#3C332B] bg-[#A6C285] px-2.5 py-0.5 text-xs font-bold text-[#2E4019] tabular-nums">
            <Check className="size-3.5" strokeWidth={3.5} aria-hidden />
            <span className="sr-only">解鎖於</span>
            {formatDate(unlockedAt)}
          </p>
        ) : current === null ? (
          // stats還沒抓回來:先顯示一個淡淡的骨架佔位,不要顯示假的0/threshold
          <div className="mt-3" aria-hidden>
            <div className="h-[18px] animate-pulse rounded-full border-[3px] border-[#3C332B] bg-[#E3D8C6]" />
            <div className="mt-1.5 h-4" />
          </div>
        ) : (
          <div className="mt-3">
            <div
              role="progressbar"
              aria-label={`${badge.title}進度`}
              aria-valuemin={0}
              aria-valuemax={badge.threshold}
              aria-valuenow={Math.min(current, badge.threshold)}
              className="h-[18px] overflow-hidden rounded-full border-[3px] border-[#3C332B] bg-[#E3D8C6]"
            >
              <div
                className={`h-full ${almostThere ? "bg-[#C9732F]" : "bg-[#A6C285]"} ${
                  percent > 0 && percent < 100 ? "border-r-[3px] border-[#3C332B]" : ""
                }`}
                style={{ width: `${ratio * 100}%` }}
              />
            </div>
            <div className="mt-1.5 flex min-h-5 items-center justify-between gap-2 text-xs font-bold">
              <span className="text-[#4A3424]/80 tabular-nums">已完成 {percent}%</span>
              {almostThere && (
                <span className="inline-flex items-center gap-1 rounded-full border-2 border-[#C9732F] bg-[#F6F2EA] px-2 py-px text-[#4A3424]">
                  <Flame className="size-3 text-[#C9732F]" strokeWidth={3} aria-hidden />
                  快完成了
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </li>
  );
}
