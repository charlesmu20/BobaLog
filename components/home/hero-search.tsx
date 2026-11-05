"use client";
import { useState } from "react";
import { useAlgoliaSearch } from "@/lib/hooks/useAlgoliaSearch";
import SearchDropdown from "@/components/home/search-dropdown";
import BrandMarquee from "@/components/home/brand-marquee";
import HeroSearchInput from "@/components/home/hero-search-input";
import type { BrandSummary } from "@/lib/brands";

export default function HeroSearch({ brands }: { brands: BrandSummary[] }) {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);

  const term = query.trim();
  const showPanel = focused;
  // 查詢直接發去Algolia(useAlgoliaSearch.ts)
  const { matchedBrands, matchedDrinks, searching, searchError } = useAlgoliaSearch(term);


  return (
    <div className="relative w-full min-w-0 bg-[#5B4636] border-[3px] border-[#3C332B] rounded-2xl overflow-visible">
      <div className="px-5 pt-8 pb-6 text-left min-[760px]:px-6 min-[760px]:pt-10 min-[760px]:pb-7 md:px-8 md:pt-12 md:pb-8">
        
        <h1 className="text-[clamp(2.5rem,6vw,4rem)] font-black leading-[1.05]">
          <span className="block text-[#F6F2EA]">找找</span>
          <span className="block text-[#A6C285]">今天想喝的</span>
        </h1>
        <p className="mt-3 text-sm text-[#F6F2EA]/80">瀏覽品牌菜單,記下你的每一杯</p>

        <div className="relative mt-6 max-w-md">
          <HeroSearchInput
            value={query}
            onChange={setQuery}
            onFocus={() => setFocused(true)}
            onBlur={() => setTimeout(() => setFocused(false), 150)}
            placeholder="搜尋品牌或飲料..."
          />
          {/* showPanel 是 true 才畫出 SearchDropdown*/}
          {showPanel && (
            <SearchDropdown
              term={term}
              matchedBrands={matchedBrands}
              matchedDrinks={matchedDrinks}
              searching={searching}
              searchError={searchError}
            />
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
