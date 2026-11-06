"use client";
import { Flag } from "lucide-react";

// 品牌頁的「回報菜單錯誤」跟飲料頁的「回報問題」,原本是兩份幾乎一樣的按鈕,
// 只差文字不一樣,統一抽成這裡共用,label當prop傳進去
export function ReportButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className="ml-auto h-9 shrink-0 cursor-pointer rounded-full border-[3px] border-[#3C332B] bg-[#F6F2EA] flex items-center gap-1.5 px-3 transition-transform hover:-translate-y-0.5"
    >
      <Flag className="w-4 h-4 shrink-0" style={{ color: "#3C332B" }} />
      <span className="whitespace-nowrap text-xs font-bold text-[#3C332B]">{label}</span>
    </button>
  );
}
