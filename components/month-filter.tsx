"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";
import { formatMonthLabel } from "@/lib/history-utils";

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
    <div className="mb-4">
      <div className="relative inline-block" ref={ref}>
        <button
          onClick={() => setOpen((prev) => !prev)}
          className="flex items-center gap-2 text-base font-medium text-foreground bg-card border-[1.5px] border-primary/30 rounded-full pl-4 pr-3 py-2.5 cursor-pointer shadow-sm hover:shadow-md transition-shadow"
        >
          {formatMonthLabel(value)}
          <ChevronDown
            className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${
              open ? "rotate-180" : ""
            }`}
          />
        </button>
        {open && (
          <div className="absolute left-0 mt-2 w-40 bg-card border border-border rounded-2xl shadow-lg py-1.5 z-50 max-h-64 overflow-y-auto animate-in fade-in slide-in-from-top-1 duration-150">
            {options.map((m) => (
              <button
                key={m}
                onClick={() => {
                  onChange(m);
                  setOpen(false);
                }}
                className="flex items-center justify-between w-full text-left px-4 py-2 text-sm hover:bg-muted transition-colors rounded-lg cursor-pointer"
              >
                <span className={m === value ? "text-primary font-medium" : "text-foreground"}>
                  {formatMonthLabel(m)}
                </span>
                {m === value && <Check className="w-4 h-4 text-primary" />}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}