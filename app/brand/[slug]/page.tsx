"use client";
import { use, useState, useRef, useEffect, useMemo } from "react";
import { useBrand } from "@/lib/hooks/useBrand";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { useFavorites, useBrandFavoriteCount } from "@/lib/hooks/useFavorites";
import { useBrandRatings } from "@/lib/hooks/useRating";
import { useBrandSummaries } from "@/lib/hooks/useBrandSummaries";
import { useBrandComments } from "@/lib/hooks/useBrandComments";
import type { Drink } from "@/lib/brands";
import BrandMenuHeader from "@/components/brand-menu/brand-menu-header";
import MenuSearchInput from "@/components/brand-menu/menu-search-input";
import BrandMenuTabs from "@/components/brand-menu/brand-menu-tabs";
import BrandMenuList from "@/components/brand-menu/brand-menu-list";
import BrandMenuViewTabs from "@/components/brand-menu/brand-menu-view-tabs";
import BrandCommentsList from "@/components/brand-menu/brand-comments-list";
import LoginRequiredModal from "@/components/login-required-modal";
import ReportModal from "@/components/report/report-modal";
import { loadingGuard, errorGuard } from "@/components/async-guard";
import SuccessToast from "@/components/ui/success-toast";
import { useSuccessToast } from "@/lib/hooks/useSuccessToast";
import { requireLogin } from "@/lib/login-guard";
import { useFavoriteToggle } from "@/lib/hooks/useFavoriteToggle";

const MAIN_CLASS = "w-full min-w-0 max-w-6xl mx-auto px-2.5 py-6 min-h-screen min-[760px]:px-6";

export default function BrandMenuPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const { brand, brandLoading, brandError, retry } = useBrand(slug);
  const { user } = useCurrentUser();
  // 把 slug 跟登入狀態丟進去,拿到「查詢收藏狀態」跟「切換收藏」用的工具
  const { isBrandFavorited, isDrinkFavorited, toggleBrandFavorite, toggleDrinkFavorite } = useFavorites(user?.uid ?? null);
  const brandFavoriteCount = useBrandFavoriteCount(slug);
  const ratingsByDrink = useBrandRatings(slug);
  // 回報表單的品牌下拉選單要給完整品牌清單(BrandSummary就夠,不用完整Brand含飲料),
  // 跟useBrand(slug)是兩份不同的資料,各自負責不同用途
  const { brands: brandSummaries } = useBrandSummaries();
  // 整個品牌(不分飲料)的留言,給下面「顧客留言」那個頁籤用
  const { comments: brandComments, commentsError: brandCommentsError } = useBrandComments(slug);

  const [view, setView] = useState<"menu" | "comments">("menu");
  const [search, setSearch] = useState("");
  const [highlightedCategory, setHighlightedCategory] = useState<string | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  // 記著目前正在觀察中的IntersectionObserver,這樣換頁或連續點不同分類標籤時
  // 可以主動把上一個還沒觸發的observer收掉,不會留著沒人管的觀察者
  const observerRef = useRef<IntersectionObserver | null>(null);
  const { toast, showToast } = useSuccessToast();
  // 沒登入就彈登入視窗,已登入才真的切換收藏+跳提示,跟飲料頁共用同一套邏輯
  const toggleFavoriteWithToast = useFavoriteToggle(user, () => setShowLoginModal(true), showToast);

  // 元件被移除(換頁)時,如果還有觀察中、還沒捲到定點觸發的observer,順便清掉
  useEffect(() => {
    return () => observerRef.current?.disconnect();
  }, []);

  // 把一整排飲料,按照 category(分類)欄位分組,變成 { "找茶": [...], "奶茶": [...] } 這種形狀
  const groupByCategory = (drinks: Drink[]) => {
    return drinks.reduce((acc, drink) => {
      const key = drink.category ?? "其他";
      if (!acc[key]) acc[key] = [];
      acc[key].push(drink);
      return acc;
    }, {} as Record<string, Drink[]>);
  };
  // 這個品牌總共有哪些分類(用來畫上面的分類標籤列)。用useMemo包起來,
  // 只有brand真的變了才重新分組一次
  const allCategories = useMemo(() => Object.keys(groupByCategory(brand?.drinks ?? [])), [brand]);
  // 如果搜尋框有輸入文字,就只留下名稱包含關鍵字的飲料;沒輸入就顯示全部
  const filteredDrinks = useMemo(() => {
    const drinks = brand?.drinks ?? [];
    const keyword = search.trim();
    return keyword ? drinks.filter((d) => d.name.includes(keyword)) : drinks;
  }, [brand, search]);
  // 把篩選後的結果再分組一次,畫面實際顯示的是這個,同樣只在filteredDrinks真的變了才重算
  const groupedFiltered = useMemo(() => groupByCategory(filteredDrinks), [filteredDrinks]);

  if (brandLoading) return loadingGuard(MAIN_CLASS);

  // 抓取失敗(離線、網路問題等):可以重試
  if (brandError) return errorGuard(MAIN_CLASS, "品牌資料載入失敗", undefined, retry);

  // 查無此品牌(網址打錯、品牌下架):重試沒有意義,不給重試按鈕
  if (!brand) return errorGuard(MAIN_CLASS, "找不到這個品牌", "這個品牌可能已經下架或網址有誤");
  
  // 點擊「收藏品牌」按鈕時執行的函式
  const handleToggleBrandFavorite = () => {
    toggleFavoriteWithToast(isBrandFavorited(slug), () => toggleBrandFavorite(slug));
  };
  // 點擊回報按鈕時執行的函式,跟收藏同一套登入檢查邏輯——沒登入先彈登入提示
  const handleOpenReport = () => {
    if (!requireLogin(user, () => setShowLoginModal(true))) return;
    setShowReportModal(true);
  };
  // 點擊「收藏飲料」按鈕時執行的函式
  const handleToggleDrinkFavorite = (drinkId: string) => {
    toggleFavoriteWithToast(isDrinkFavorited(slug, drinkId), () => toggleDrinkFavorite(slug, drinkId));
  };
  // 點擊分類標籤時:捲動到對應區塊,並短暫高亮提示那個區塊
  const scrollToCategory = (category: string) => {
   const el = sectionRefs.current[category];
   if (!el) return;
   el.scrollIntoView({ behavior: "smooth", block: "start" });
   // 連續點好幾個不同分類標籤時,上一個還沒捲到定點的observer就沒用了,先收掉再開新的
   observerRef.current?.disconnect();
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
   observerRef.current = observer;
  };

  return (
    <main className={MAIN_CLASS}>
			{/* 登入提示彈窗,open控制要不要顯示,onClose是按X或背景時怎麼關掉 */}
      <LoginRequiredModal open={showLoginModal} onClose={() => setShowLoginModal(false)} />
			{/* 品牌頂部資訊區(名稱、icon、收藏愛心) */}
      <BrandMenuHeader
        brand={brand}
        isFavorite={isBrandFavorited(slug)}
        favoriteCount={brandFavoriteCount}
        onToggleFavorite={handleToggleBrandFavorite}
        onReport={handleOpenReport}
      />
			{/* 菜單/顧客留言頁籤 */}
      <BrandMenuViewTabs view={view} onChange={setView} commentCount={brandComments.length} />

      {view === "menu" ? (
        <>
			{/* 搜尋框 */}
          <div className="mb-5">
            <MenuSearchInput value={search} onChange={setSearch} placeholder="搜尋這個品牌的飲料..." />
          </div>
			{/* 分類標籤列 */}
          <BrandMenuTabs categories={allCategories} onSelect={scrollToCategory} />
			{/* 飲料清單本體 */}
          <BrandMenuList
            brandSlug={slug}
            grouped={groupedFiltered}
            isDrinkFavorited={(drinkId) => isDrinkFavorited(slug, drinkId)}
            onToggleFavoriteDrink={handleToggleDrinkFavorite}
            ratingsByDrink={ratingsByDrink}
            registerSectionRef={(category, el) => {
              sectionRefs.current[category] = el;
            }}
            highlightedCategory={highlightedCategory}
            addOns={brand.addOns}
          />
        </>
      ) : (
        <BrandCommentsList
          brandSlug={slug}
          comments={brandComments}
          commentsError={brandCommentsError}
          drinks={brand.drinks}
        />
      )}

      <SuccessToast message={toast} />

      <ReportModal
        open={showReportModal}
        onClose={() => setShowReportModal(false)}
        uid={user?.uid ?? ""}
        brands={brandSummaries}
        defaultBrandSlug={slug}
        onSuccess={showToast}
      />
    </main>
  );
}