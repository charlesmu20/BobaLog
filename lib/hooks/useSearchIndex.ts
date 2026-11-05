"use client";
import { useState } from "react";
import useSWR from "swr";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Drink } from "@/lib/brands";

export type SearchBrand = {
  name: string;
  slug: string;
  icon: string;
};

export type SearchDrink = Drink & {
  id: string;
  brandName: string;
  brandSlug: string;
  brandIcon: string;
};

type SearchIndexData = { brands: SearchBrand[]; drinks: SearchDrink[] };

// 跟useBrands.ts同一種N+1查詢,抽成獨立function給SWR呼叫
async function fetchSearchIndex(): Promise<SearchIndexData> {
  const brandsSnapshot = await getDocs(collection(db, "brands"));

  // 每個品牌的飲料子集合同時發出去,不要排隊依序等
  const results = await Promise.all(
    brandsSnapshot.docs.map(async (brandDoc) => {
      const brandData = brandDoc.data();
      const drinksSnapshot = await getDocs(collection(db, "brands", brandDoc.id, "drinks"));
      const drinks: SearchDrink[] = drinksSnapshot.docs.map((d) => ({
        ...(d.data() as Drink),
        id: d.id,
        brandName: brandData.name,
        brandSlug: brandData.slug,
        brandIcon: brandData.icon,
      }));
      return {
        brand: { name: brandData.name, slug: brandData.slug, icon: brandData.icon } as SearchBrand,
        drinks,
      };
    })
  );

  return {
    brands: results.map((r) => r.brand),
    drinks: results.flatMap((r) => r.drinks),
  };
}

export function useSearchIndex() {
  // 原本的loadIndex()是「要手動呼叫才抓」,不是一掛載就自動抓——用shouldLoad控制
  // SWR的key要不要從null變成真正的字串,key是null時SWR完全不會發請求。
  // 這裡故意跟useBrands.ts用不同的key("search-index"跟"brands-with-drinks"),
  // 因為兩邊回傳的資料形狀不一樣(這裡多了brandName/brandSlug/brandIcon這些搜尋專用欄位),
  // 不能共用同一份快取,硬共用的話某一邊會拿到形狀不對的資料
  const [shouldLoad, setShouldLoad] = useState(false);
  const { data, isLoading } = useSWR(shouldLoad ? "search-index" : null, fetchSearchIndex);

  // 回傳形狀維持跟改寫前一樣(brands/drinks/indexLoading/indexLoaded/loadIndex),
  // app/favorites/page.tsx、components/log/log-modal.tsx都不用改
  return {
    brands: data?.brands ?? [],
    drinks: data?.drinks ?? [],
    indexLoading: isLoading,
    indexLoaded: !!data,
    loadIndex: () => setShouldLoad(true),
  };
}
