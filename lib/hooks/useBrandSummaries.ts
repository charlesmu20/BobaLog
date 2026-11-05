"use client";
import useSWR from "swr";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { BrandSummary } from "@/lib/brands";

// 真正去Firestore抓資料的function,交給SWR在需要的時候呼叫——
// 這支本身跟改寫前的fetchBrands幾乎一樣,只是不再自己管loading/error/cancelled這些狀態,
// 改交給SWR統一處理
async function fetchBrandSummaries(): Promise<BrandSummary[]> {
  const brandsSnapshot = await getDocs(collection(db, "brands"));
  return brandsSnapshot.docs.map((d) => d.data() as BrandSummary);
}

// 用SWR包起來:第一個參數"brands"是快取的key,所有呼叫useBrandSummaries()的地方
// (首頁、品牌頁的回報表單、飲料頁的回報表單)只要key一樣,就會共用同一份快取結果,
// 不會各自重複發請求去Firestore抓同樣的品牌清單
export function useBrandSummaries() {
  const { data, error, isLoading, mutate } = useSWR("brands", fetchBrandSummaries);

  // 回傳的形狀刻意跟改寫前一模一樣(brands/brandsLoading/brandsError/retry),
  // 這樣所有原本在用這個hook的地方都不用改一行程式碼
  return {
    brands: data ?? [],
    brandsLoading: isLoading,
    brandsError: !!error,
    retry: () => mutate(),
  };
}
