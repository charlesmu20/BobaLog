"use client";

import { useBrandSummaries } from "@/lib/hooks/useBrandSummaries";
import HeroSearch from "@/components/home/hero-search";
import BrandCardGrid from "@/components/home/brand-card-grid";
import LoadingCard from "@/components/loading-card";
import ErrorCard from "@/components/error-card";

export default function Home() {
  const { brands, brandsLoading, brandsError, retry } = useBrandSummaries();

  // 品牌資料還沒抓完的話,先顯示loading卡片,整頁(Hero+卡片)等資料回來才一次渲染,
  // 避免Hero先跳出來、卡片過一下才補上的分階段感
  if (brandsLoading) {
    return (
      <main className="w-full min-w-0 max-w-6xl mx-auto px-2.5 py-5 min-[760px]:px-6">
        <LoadingCard />
      </main>
    );
  }

  // 抓取失敗(離線、網路問題等):不再卡住,顯示錯誤卡片+重試按鈕
  if (brandsError) {
    return (
      <main className="w-full min-w-0 max-w-6xl mx-auto px-2.5 py-5 min-[760px]:px-6">
        <ErrorCard title="品牌資料載入失敗" onRetry={retry} />
      </main>
    );
  }

  return (
    <main className="w-full min-w-0 max-w-6xl mx-auto px-2.5 py-5 min-[760px]:px-6">
      {/* 資料備妥後,整個區塊用現成的.rise動畫(globals.css)淡入+微微上滑,
          跟卡片grid本身的進場動畫語言一致 */}
      <div className="rise">
        <HeroSearch brands={brands} />
        <div className="mt-8">
          <BrandCardGrid brands={brands} />
        </div>
      </div>
    </main>
  );
}
