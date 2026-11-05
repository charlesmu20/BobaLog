"use client";
import { Search, X } from "lucide-react";

export default function HeroSearchInput({
  value,
  onChange,
  placeholder = "搜尋...",
  onFocus,
  onBlur,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  onFocus?: () => void;
  onBlur?: () => void;
}) {
  
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
        className="min-w-0 flex-1 bg-transparent py-3 text-base font-medium text-[#3C332B] placeholder:text-[#9A8B7A] focus:outline-none"
      />
      {value && (
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
