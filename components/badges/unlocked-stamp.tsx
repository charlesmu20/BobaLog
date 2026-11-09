import { Check } from "lucide-react";
import { formatDotDate } from "@/lib/history-utils";

// 已解鎖勳章的「✓ 解鎖於 YYYY.MM.DD」小標籤——badge-chip.tsx(格子版)跟badge-row.tsx(長列版)
// 原本各自貼了一份幾乎一樣的JSX,只有尺寸不同,抽成這個共用元件。size="sm"給格子版用,預設"md"給長列版用
export function UnlockedStamp({
  date,
  size = "md",
  className = "",
}: {
  date: Date;
  size?: "sm" | "md";
  className?: string;
}) {
  const isSmall = size === "sm";
  return (
    <p
      className={`inline-flex items-center rounded-full border-2 border-[#3C332B] bg-[#A6C285] py-0.5 font-bold text-[#2E4019] tabular-nums ${
        isSmall ? "gap-1 px-2.5 text-[11px]" : "gap-1.5 px-2.5 text-xs"
      } ${className}`}
    >
      <Check className={isSmall ? "size-3" : "size-3.5"} strokeWidth={3.5} aria-hidden />
      <span className="sr-only">解鎖於</span>
      {formatDotDate(date)}
    </p>
  );
}
