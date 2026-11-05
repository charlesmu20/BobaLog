"use client";
import { Search } from "lucide-react";

// 品牌菜單頁搜尋框專用:較扁平的白底輸入框,沒有清除按鈕、也沒有下拉結果
// (這裡的搜尋是純本地陣列篩選,打字就直接更新畫面,不需要onFocus/onBlur這些)
export default function MenuSearchInput({
  value,
  onChange,
  placeholder = "搜尋...",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="relative">
      <Search className="w-4 h-4 text-[#6B5D4F] absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-10 pl-9 pr-3 rounded-lg border-[3px] border-[#3C332B] bg-white text-sm text-[#3C332B] shadow-[3px_3px_0_0_#3C332B] focus:outline-none focus:shadow-[4px_4px_0_0_#A6C285] transition-shadow"
      />
    </div>
  );
}
