"use client";
import { Search, X } from "lucide-react";

// 共用搜尋框,兩種variant對應原本首頁Hero跟品牌菜單頁各自刻的搜尋框:
// - "pill":首頁Hero用的大顆藥丸造型,米白底包在深褐卡片裡,可選清除按鈕
// - "compact":品牌菜單頁用的,較扁平的白底輸入框,沒有清除按鈕
export default function SearchInput({
  value,
  onChange,
  placeholder = "搜尋...",
  onFocus,
  onBlur,
  showClear = false,
  variant = "pill",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  onFocus?: () => void;
  onBlur?: () => void;
  showClear?: boolean;
  variant?: "pill" | "compact";
}) {
  if (variant === "compact") {
    return (
      <div className="relative">
        <Search className="w-4 h-4 text-[#6B5D4F] absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={onFocus}
          onBlur={onBlur}
          placeholder={placeholder}
          className="w-full h-10 pl-9 pr-3 rounded-lg border-[3px] border-[#3C332B] bg-white text-sm text-[#3C332B] shadow-[3px_3px_0_0_#3C332B] focus:outline-none focus:shadow-[4px_4px_0_0_#A6C285] transition-shadow"
        />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2.5 rounded-2xl border-[3px] border-[#3C332B] bg-[#F6F2EA] px-4 shadow-[4px_4px_0_0_#3C332B] transition-shadow focus-within:shadow-[6px_6px_0_0_#A6C285]">
      <Search className="h-4 w-4 shrink-0 text-[#6B5D4F]" aria-hidden="true" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={onFocus}
        onBlur={onBlur}
        placeholder={placeholder}
        className="min-w-0 flex-1 bg-transparent py-3 text-sm font-medium text-[#3C332B] placeholder:text-[#9A8B7A] focus:outline-none"
      />
      {showClear && value && (
        <button
          type="button"
          aria-label="清除搜尋"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onChange("")}
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#3C332B] text-[#F6F2EA] transition-colors hover:bg-[#A6C285] hover:text-[#3C332B]"
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
