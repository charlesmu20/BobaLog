"use client";

import useSWR from "swr";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Brand, Drink } from "@/lib/brands";

// 跟useBrandSummaries.ts同一招:抓取邏輯抽成獨立function讓SWR呼叫,
// 這支本身是N+1查詢(1次brands + N次每個品牌各自的drinks),成本比useBrandSummaries高不少,
// 所以更值得快取——記帳頁只要打開過一次,之後同一個session內都不用再整套重抓
async function fetchBrands(): Promise<Brand[]> {
  const brandsSnapshot = await getDocs(collection(db, "brands"));
  return Promise.all(
    brandsSnapshot.docs.map(async (brandDoc) => {
      const drinksSnapshot = await getDocs(collection(db, "brands", brandDoc.id, "drinks"));
      const drinks = drinksSnapshot.docs.map((d) => ({ ...(d.data() as Drink), id: d.id }));
      return { ...brandDoc.data(), drinks } as Brand;
    })
  );
}

export function useBrands() {
  const { data, error, isLoading, mutate } = useSWR("brands-with-drinks", fetchBrands);

  // 回傳形狀維持跟改寫前一樣,app/log/page.tsx不用改
  return {
    brands: data ?? [],
    brandsLoading: isLoading,
    brandsError: !!error,
    retry: () => mutate(),
  };
}
