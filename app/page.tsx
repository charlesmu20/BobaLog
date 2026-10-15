"use client";

import { useBrandSummaries } from "@/lib/hooks/useBrandSummaries";
import HeroSearch from "@/components/hero-search";
import BrandCardGrid from "@/components/brand-card-grid";

export default function Home() {

  const { brands, brandsLoading } = useBrandSummaries();

  
  return (
    <main className="w-full max-w-6xl mx-auto px-6 py-5">

      <HeroSearch />
      <div className="mt-8">
        {!brandsLoading && <BrandCardGrid brands={brands} />}
      </div>

    </main>
  );
}