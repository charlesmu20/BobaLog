"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import PageTitle from "@/components/ui/page-title";
import { useBrandSummaries } from "@/lib/hooks/useBrandSummaries";
import { useSearchIndex } from "@/lib/hooks/useSearchIndex";
import { useFavorites } from "@/lib/hooks/useFavorites";
import FavoriteBrandMedal from "@/components/favorite-brand-medal";
import FavoriteDrinkCard from "@/components/favorite-drink-card";

export default function FavoritesPage() {
  const { user, checkingAuth } = useCurrentUser();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"brand" | "drink">("brand");

  const { brands } = useBrandSummaries();
  const { drinks, loadIndex } = useSearchIndex();
  const { isBrandFavorited, isDrinkFavorited, toggleBrandFavorite, toggleDrinkFavorite } = useFavorites(user?.uid ?? null);

  useEffect(() => {
    loadIndex();
  }, []);

  useEffect(() => {
    if (!checkingAuth && !user) {
      router.push("/login");
    }
  }, [checkingAuth, user, router]);

  if (checkingAuth || !user) {
    return null;
  }

  const favoriteBrands = brands.filter((b) => isBrandFavorited(b.slug));
  const favoriteDrinks = drinks.filter((d) => isDrinkFavorited(d.brandSlug, d.id));

  return (
    <main className="w-full mx-auto px-6 py-6 min-h-screen" style={{ maxWidth: "1152px" }}>
      <PageTitle>收藏</PageTitle>

      <div className="inline-flex bg-[#F6EFE4] rounded-full p-1 mt-5 mb-5">
        <button
          onClick={() => setActiveTab("brand")}
          className={`text-sm px-5 py-1.5 rounded-full transition-colors ${
            activeTab === "brand" ? "bg-[#C9732F] text-white font-medium" : "text-[#8A7A63]"
          }`}
        >
          品牌
        </button>
        <button
          onClick={() => setActiveTab("drink")}
          className={`text-sm px-5 py-1.5 rounded-full transition-colors ${
            activeTab === "drink" ? "bg-[#C9732F] text-white font-medium" : "text-[#8A7A63]"
          }`}
        >
          飲料
        </button>
      </div>

      {activeTab === "brand" ? (
        favoriteBrands.length === 0 ? (
          <p className="text-sm text-[#8A7A63] text-center py-12">暫時無收藏品牌/飲品</p>
        ) : (
          <div className="flex flex-wrap gap-x-6 gap-y-8">
            {favoriteBrands.map((b) => (
              <FavoriteBrandMedal
                key={b.slug}
                name={b.name}
                slug={b.slug}
                icon={b.icon}
                onToggleFavorite={() => toggleBrandFavorite(b.slug)}
              />
            ))}
          </div>
        )
      ) : favoriteDrinks.length === 0 ? (
        <p className="text-sm text-[#8A7A63] text-center py-12">暫時無收藏品牌/飲品</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {favoriteDrinks.map((d) => (
            <FavoriteDrinkCard
              key={d.id}
              name={d.name}
              brandName={d.brandName}
              brandSlug={d.brandSlug}
              brandIcon={d.brandIcon}
              drinkId={d.id}
              onToggleFavorite={() => toggleDrinkFavorite(d.brandSlug, d.id)}
            />
          ))}
        </div>
      )}
    </main>
  );
}