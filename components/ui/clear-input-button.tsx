"use client";
import { X } from "lucide-react";

// 深咖啡圓圈底+米白X的清除鈕,原本log-modal.tsx(品牌/飲料兩處)跟map-sidebar.tsx
// (搜尋框)各自複製貼上了一份幾乎一樣的按鈕,大小/aria-label不同而已,統一抽成這裡共用
const SIZE_CLASSES = {
  sm: { button: "h-5 w-5", icon: "w-3 h-3" },
  md: { button: "h-6 w-6", icon: "h-3.5 w-3.5" },
} as const;

export function ClearInputButton({
  onClick,
  label = "清除",
  size = "md",
  className = "",
}: {
  onClick: () => void;
  label?: string;
  size?: keyof typeof SIZE_CLASSES;
  className?: string;
}) {
  const { button, icon } = SIZE_CLASSES[size];
  return (
    <button
      type="button"
      onClick={onClick}
      // 先擋掉mousedown的預設行為,輸入框才不會在點擊這顆按鈕的瞬間先觸發blur,
      // 導致依賴blur關閉的下拉選單搶先收掉、點擊事件根本打不到按鈕上
      onMouseDown={(e) => e.preventDefault()}
      aria-label={label}
      className={`flex ${button} shrink-0 cursor-pointer items-center justify-center rounded-full bg-[#3C332B] text-[#F6F2EA] transition-colors hover:bg-[#A6C285] hover:text-[#3C332B] ${className}`}
    >
      <X className={icon} aria-hidden="true" />
    </button>
  );
}
