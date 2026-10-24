"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";
import { formatMonthLabel } from "@/lib/history-utils";
import { STICKER_CARD_BASE } from "@/lib/sticker-card";

export default function MonthFilter({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    // 原本這裡有mb-4,是以前MonthFilter自己佔一整排時留的下方間距。
    // 現在它被搬進history-view.tsx的flex一排(跟新增紀錄按鈕並排),這個margin
    // 會讓它比旁邊的按鈕「高」一截,items-center對齊基準跟著跑掉、兩顆看起來沒切齊
    <div>
      <div className="relative inline-block" ref={ref}>
        <button
          onClick={() => setOpen((prev) => !prev)}
          className="flex items-center gap-2 text-sm font-medium text-[#4A3424] bg-[#F6F2EA] border-[3px] border-[#3C332B] rounded-full pl-4 pr-3 py-2 cursor-pointer shadow-[3px_3px_0_0_#3C332B] transition-all hover:bg-[#F6EFE4] hover:shadow-[2px_2px_0_0_#3C332B] hover:translate-x-px hover:translate-y-px"
        >
          {formatMonthLabel(value)}
          <ChevronDown
            className={`w-4 h-4 text-[#8A7A63] transition-transform duration-200 ${
              open ? "rotate-180" : ""
            }`}
          />
        </button>
        {open && (
          <div
            className={`absolute left-0 mt-2 w-40 ${STICKER_CARD_BASE} shadow-[4px_4px_0_0_#3C332B] py-1.5 z-50 max-h-64 overflow-y-auto`}
            style={{ animation: "infowindow-pop 0.15s ease-out" }}
          >
            {options.map((m) => (
              <button
                key={m}
                onClick={() => {
                  onChange(m);
                  setOpen(false);
                }}
                className="flex items-center justify-between w-full text-left px-4 py-2 text-sm hover:bg-[#F6EFE4] transition-colors rounded-lg cursor-pointer"
              >
                <span className={m === value ? "text-[#C9732F] font-medium" : "text-[#4A3424]"}>
                  {formatMonthLabel(m)}
                </span>
                {m === value && <Check className="w-4 h-4 text-[#C9732F]" />}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}