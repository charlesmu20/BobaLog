"use client";
import { useState } from "react";
import { Search } from "lucide-react";
import { useSearchIndex } from "@/lib/hooks/useSearchIndex";
import SearchDropdown from "@/components/search-dropdown";

export default function HeroSearch() {
  const [query, setQuery] = useState(""); 
  const [focused, setFocused] = useState(false); 
  const { brands, drinks, loadIndex } = useSearchIndex();

  const term = query.trim();
  const showPanel = focused;  
  // term 有內容才真的去篩選
  const matchedBrands = term ? brands.filter((b) => b.name.includes(term)) : [];
  const matchedDrinks = term ? drinks.filter((d) => d.name.includes(term)) : [];

  return (
    <div className="relative bg-[#F6EFE4] border border-[#E3D8C6] rounded-2xl px-8 py-16 text-center">
      {/* 裝飾用 */}
      <div className="absolute inset-0 overflow-hidden rounded-2xl">
        <div className="absolute left-[12%] bottom-0 w-2.5 h-2.5 rounded-full bg-[#4A3424] animate-[float-up_6s_ease-in_infinite]" />
        <div className="absolute left-[24%] bottom-0 w-[7px] h-[7px] rounded-full bg-[#4A3424] animate-[float-up_8s_ease-in_infinite] [animation-delay:1.5s]" />
        <div className="absolute left-[68%] bottom-0 w-[9px] h-[9px] rounded-full bg-[#4A3424] animate-[float-up_7s_ease-in_infinite] [animation-delay:0.8s]" />
        <div className="absolute left-[82%] bottom-0 w-1.5 h-1.5 rounded-full bg-[#4A3424] animate-[float-up_9s_ease-in_infinite] [animation-delay:3s]" />
        <div className="absolute left-[45%] bottom-0 w-2 h-2 rounded-full bg-[#4A3424] animate-[float-up_6.5s_ease-in_infinite] [animation-delay:2.2s]" />
      </div>

      <div className="relative">
        <h2 className="text-3xl font-bold text-[#4A3424] mb-8">BobaLog 手搖飲紀錄網站</h2>
        <h1 className="text-2xl text-[#7A4F38]  mb-2">找找今天想喝的</h1>
        <p className="text-sm text-[#7A4F38] mb-6">瀏覽品牌菜單,記下你的每一杯</p>

        <div className="relative max-w-md mx-auto text-left">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-[#8A7A63]" />
          
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => {
              setFocused(true);
              loadIndex();
            }}
            onBlur={() => setTimeout(() => setFocused(false), 150)}
            placeholder="搜尋品牌或飲料..."
            className="w-full rounded-full border border-[#E3D8C6] bg-white pl-11 pr-4 py-3 text-sm text-[#4A3424]"
          />
          {/* showPanel 是 true 才畫出 SearchDropdown*/}
          {showPanel && (
            <SearchDropdown term={term} matchedBrands={matchedBrands} matchedDrinks={matchedDrinks} />
          )}
        </div>
      </div>
    </div>
  );
}