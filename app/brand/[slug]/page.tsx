"use client";
import { use, useState, useRef } from "react";
import { useBrand } from "@/lib/hooks/useBrand";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { useFavorites } from "@/lib/hooks/useFavorites";
import type { Drink } from "@/lib/brands";
import BrandMenuHeader from "@/components/brand-menu-header";
import BrandMenuSearch from "@/components/brand-menu-search";
import BrandMenuTabs from "@/components/brand-menu-tabs";
import BrandMenuList from "@/components/brand-menu-list";
import LoginRequiredModal from "@/components/login-required-modal";

export default function BrandMenuPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const { brand, brandLoading } = useBrand(slug);
  const { user } = useCurrentUser();
  // 把 slug 跟登入狀態丟進去,拿到「查詢收藏狀態」跟「切換收藏」用的工具
  const { isBrandFavorited, isDrinkFavorited, toggleBrandFavorite, toggleDrinkFavorite } = useFavorites(user?.uid ?? null);

  const [search, setSearch] = useState("");
  const [highlightedCategory, setHighlightedCategory] = useState<string | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  if (brandLoading) {
    return <div>載入中...</div>;
  }

  if (!brand) {
    return <div>找不到這個品牌</div>;
  }
  // 點擊「收藏品牌」按鈕時執行的函式
  const handleToggleBrandFavorite = () => {
    if (!user) {
      setShowLoginModal(true);
      return;
    }
    toggleBrandFavorite(slug);
  };
  // 點擊「收藏飲料」按鈕時執行的函式
  const handleToggleDrinkFavorite = (drinkId: string) => {
    if (!user) {
      setShowLoginModal(true);
      return;
    }
    toggleDrinkFavorite(slug, drinkId);
  };
  // 把一整排飲料,按照 category(分類)欄位分組,變成 { "找茶": [...], "奶茶": [...] } 這種形狀
  const groupByCategory = (drinks: Drink[]) => {
    return drinks.reduce((acc, drink) => {
      const key = drink.category ?? "其他";
      if (!acc[key]) acc[key] = [];
      acc[key].push(drink);
      return acc;
    }, {} as Record<string, Drink[]>);
  };
  // 這個品牌總共有哪些分類(用來畫上面的分類標籤列)
  const allCategories = Object.keys(groupByCategory(brand.drinks));
	// 如果搜尋框有輸入文字,就只留下名稱包含關鍵字的飲料;沒輸入就顯示全部
  const filteredDrinks = search.trim()
    ? brand.drinks.filter((d) => d.name.includes(search.trim()))
    : brand.drinks;
  // 把篩選後的結果再分組一次,畫面實際顯示的是這個
  const groupedFiltered = groupByCategory(filteredDrinks);
  // 點擊分類標籤時:捲動到對應區塊,並短暫高亮提示那個區塊
  const scrollToCategory = (category: string) => {
   const el = sectionRefs.current[category];
   if (!el) return;
   el.scrollIntoView({ behavior: "smooth", block: "start" });
   const observer = new IntersectionObserver(
     (entries) => {
       if (entries[0].isIntersecting) {
         setHighlightedCategory(category);
         setTimeout(() => setHighlightedCategory(null), 600);
         observer.disconnect();
       }
     },
     { threshold: 0.5 }
   );
   observer.observe(el);
  };

  return (
    <main className="w-full mx-auto px-6 py-6 min-h-screen" style={{ maxWidth: "1152px" }}>
			{/* 登入提示彈窗,open控制要不要顯示,onClose是按X或背景時怎麼關掉 */}
      <LoginRequiredModal open={showLoginModal} onClose={() => setShowLoginModal(false)} />
			{/* 品牌頂部資訊區(名稱、icon、收藏愛心) */}
      <BrandMenuHeader
        brand={brand}
        isFavorite={isBrandFavorited(slug)}
        onToggleFavorite={handleToggleBrandFavorite}
      />
			{/* 搜尋框 */}
      <BrandMenuSearch value={search} onChange={setSearch} />
			{/* 分類標籤列 */}
      <BrandMenuTabs categories={allCategories} onSelect={scrollToCategory} />
			{/* 飲料清單本體 */}
      <BrandMenuList
        brandSlug={slug}
        grouped={groupedFiltered}
        isDrinkFavorited={(drinkId) => isDrinkFavorited(slug, drinkId)}
        onToggleFavoriteDrink={handleToggleDrinkFavorite}
        registerSectionRef={(category, el) => {
          sectionRefs.current[category] = el;
        }}
        highlightedCategory={highlightedCategory}
      />
    </main>
  );
}