"use client";
import { use, useState, useRef } from "react";
import { useBrand } from "@/lib/hooks/useBrand";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { useFavorites } from "@/lib/hooks/useFavorites";
import type { Drink } from "@/lib/brands";
import BrandMenuHeader from "@/components/brand-menu/brand-menu-header";
import SearchInput from "@/components/search-input";
import BrandMenuTabs from "@/components/brand-menu/brand-menu-tabs";
import BrandMenuList from "@/components/brand-menu/brand-menu-list";
import LoginRequiredModal from "@/components/login-required-modal";
import LoadingCard from "@/components/loading-card";
import ErrorCard from "@/components/error-card";

const MAIN_CLASS = "w-full min-w-0 max-w-6xl mx-auto px-2.5 py-6 min-h-screen min-[760px]:px-6";

export default function BrandMenuPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const { brand, brandLoading, brandError, retry } = useBrand(slug);
  const { user } = useCurrentUser();
  // 把 slug 跟登入狀態丟進去,拿到「查詢收藏狀態」跟「切換收藏」用的工具
  const { isBrandFavorited, isDrinkFavorited, toggleBrandFavorite, toggleDrinkFavorite } = useFavorites(user?.uid ?? null);

  const [search, setSearch] = useState("");
  const [highlightedCategory, setHighlightedCategory] = useState<string | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  if (brandLoading) {
    return (
      <main className={MAIN_CLASS}>
        <LoadingCard />
      </main>
    );
  }

  // 抓取失敗(離線、網路問題等):可以重試
  if (brandError) {
    return (
      <main className={MAIN_CLASS}>
        <ErrorCard title="品牌資料載入失敗" onRetry={retry} />
      </main>
    );
  }

  // 查無此品牌(網址打錯、品牌下架):重試沒有意義,不給重試按鈕
  if (!brand) {
    return (
      <main className={MAIN_CLASS}>
        <ErrorCard title="找不到這個品牌" description="這個品牌可能已經下架或網址有誤" />
      </main>
    );
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
    <main className={MAIN_CLASS}>
			{/* 登入提示彈窗,open控制要不要顯示,onClose是按X或背景時怎麼關掉 */}
      <LoginRequiredModal open={showLoginModal} onClose={() => setShowLoginModal(false)} />
			{/* 品牌頂部資訊區(名稱、icon、收藏愛心) */}
      <BrandMenuHeader
        brand={brand}
        isFavorite={isBrandFavorited(slug)}
        onToggleFavorite={handleToggleBrandFavorite}
      />
			{/* 搜尋框 */}
      <div className="mb-5">
        <SearchInput variant="compact" value={search} onChange={setSearch} placeholder="搜尋這個品牌的飲料..." />
      </div>
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