"use client";

import { useBrandSummaries } from "@/lib/hooks/useBrandSummaries";
import HeroSearch from "@/components/home/hero-search";
import BrandCardGrid from "@/components/home/brand-card-grid";
import { loadingGuard, errorGuard } from "@/components/async-guard";

const MAIN_CLASS = "w-full min-w-0 max-w-6xl mx-auto px-2.5 py-5 min-[760px]:px-6";

export default function Home() {
  const { brands, brandsLoading, brandsError, retry } = useBrandSummaries();

  if (brandsLoading) return loadingGuard(MAIN_CLASS);
  if (brandsError) return errorGuard(MAIN_CLASS, "品牌資料載入失敗", undefined, retry);

  return (
    <main className={MAIN_CLASS}>
      <div className="rise">

        <HeroSearch brands={brands} />
        <div className="mt-8">
          <BrandCardGrid brands={brands} />
        </div>
        
      </div>
    </main>
  );
}
