"use client";
import { useState } from "react";
import { useSearchIndex } from "@/lib/hooks/useSearchIndex";
import SearchDropdown from "@/components/home/search-dropdown";
import BrandMarquee from "@/components/home/brand-marquee";
import SearchInput from "@/components/search-input";
import type { BrandSummary } from "@/lib/brands";

export default function HeroSearch({ brands }: { brands: BrandSummary[] }) {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const { brands: searchBrands, drinks, loadIndex } = useSearchIndex();

  const term = query.trim();
  const showPanel = focused;
  // term 有內容才真的去篩選
  const matchedBrands = term ? searchBrands.filter((b) => b.name.includes(term)) : [];
  const matchedDrinks = term ? drinks.filter((d) => d.name.includes(term)) : [];

  // 顏色都是從v0生成的樣式直接搬過來的hex值(深咖啡#5B4636/深褐邊框陰影#3C332B/
  // 米白卡片#F6F2EA/唯一強調色抹茶綠#A6C285),沒有去動globals.css的:root變數,
  // 所以只有首頁長這樣,其他頁面不受影響
  return (
    <div className="relative w-full min-w-0 bg-[#5B4636] border-[3px] border-[#3C332B] rounded-2xl overflow-visible">
      <div className="px-5 pt-8 pb-6 text-left min-[760px]:px-6 min-[760px]:pt-10 min-[760px]:pb-7 md:px-8 md:pt-12 md:pb-8">
        <h1 className="text-[clamp(2.5rem,6vw,4rem)] font-black leading-[1.05]">
          <span className="block text-[#F6F2EA]">找找</span>
          <span className="block text-[#A6C285]">今天想喝的</span>
        </h1>
        <p className="mt-3 text-sm text-[#F6F2EA]/80">瀏覽品牌菜單,記下你的每一杯</p>

        <div className="relative mt-6 max-w-md">
          <SearchInput
            variant="pill"
            showClear
            value={query}
            onChange={setQuery}
            onFocus={() => {
              setFocused(true);
              loadIndex();
            }}
            onBlur={() => setTimeout(() => setFocused(false), 150)}
            placeholder="搜尋品牌或飲料..."
          />
          {/* showPanel 是 true 才畫出 SearchDropdown*/}
          {showPanel && (
            <SearchDropdown term={term} matchedBrands={matchedBrands} matchedDrinks={matchedDrinks} />
          )}
        </div>
      </div>

      {/* 雙排跑馬燈取代原本隨機飄浮的8個logo,品牌一多也不用curate */}
      <div className="min-w-0 pb-6">
        <BrandMarquee brands={brands} />
      </div>
    </div>
  );
}
