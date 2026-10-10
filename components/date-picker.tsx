"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"];

function toDateString(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function formatDisplay(dateStr: string) {
  const [y, m, d] = dateStr.split("-");
  return `${y}/${m}/${d}`;
}

export default function DatePicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [viewDate, setViewDate] = useState(() => new Date(value));
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

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth(); // 0-11

  // 這個月1號是星期幾,決定月曆格子前面要留幾個空格
  const startWeekday = new Date(year, month, 1).getDay();
  // 這個月總共幾天
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (number | null)[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const handleSelectDay = (day: number) => {
    onChange(toDateString(new Date(year, month, day)));
    setOpen(false);
  };

  const handleToday = () => {
    const today = new Date();
    setViewDate(today);
    onChange(toDateString(today));
    setOpen(false);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="border border-[#E3D8C6] rounded-lg px-3 py-2 w-full text-left text-[#4A3424] cursor-pointer"
      >
        {formatDisplay(value)}
      </button>

      {open && (
        <div className="absolute left-0 mt-2 bg-white border border-[#E3D8C6] rounded-xl shadow-lg p-3 z-50 w-64">
          <div className="flex items-center justify-between mb-2">
            <button type="button" onClick={() => setViewDate(new Date(year, month - 1, 1))} className="text-[#6B5338] cursor-pointer p-1">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-medium text-[#473A28]">{year}年{month + 1}月</span>
            <button type="button" onClick={() => setViewDate(new Date(year, month + 1, 1))} className="text-[#6B5338] cursor-pointer p-1">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-1">
            {WEEKDAYS.map((w) => (
              <div key={w} className="text-xs text-[#8A7A63] text-center">{w}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {cells.map((day, i) => {
              if (day === null) return <div key={`empty-${i}`} />;
              const dateStr = toDateString(new Date(year, month, day));
              const isSelected = dateStr === value;
              return (
                <button
                  type="button"
                  key={day}
                  onClick={() => handleSelectDay(day)}
                  className={`text-sm rounded-full py-1 cursor-pointer ${
                    isSelected ? "bg-[#C9732F] text-white" : "text-[#4A3424] hover:bg-[#F6EFE4]"
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>

          <button type="button" onClick={handleToday} className="mt-2 text-sm text-[#C9732F] cursor-pointer w-full text-right">
            今天
          </button>
        </div>
      )}
    </div>
  );
}