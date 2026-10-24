"use client";

import { useState, useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Brand, Drink } from "@/lib/brands";

export function useBrands() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [brandsLoading, setBrandsLoading] = useState(true);
  const [brandsError, setBrandsError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const fetchBrands = async () => {
      setBrandsLoading(true);
      setBrandsError(false);
      try {
        const brandsSnapshot = await getDocs(collection(db, "brands"));
        const brandsData = await Promise.all(
          brandsSnapshot.docs.map(async (brandDoc) => {
            const drinksSnapshot = await getDocs(
              collection(db, "brands", brandDoc.id, "drinks")
            );
            const drinks = drinksSnapshot.docs.map((d) => d.data() as Drink);
            return { ...brandDoc.data(), drinks } as Brand;
          })
        );
        if (!cancelled) setBrands(brandsData);
      } catch (err) {
        // 抓取失敗(離線、網路問題等)才是真的錯誤,要讓loading結束並顯示可重試的狀態,
        // 不然畫面會卡在「載入中」出不來——跟useBrand.ts(單數,品牌詳情頁用的)同一套修法
        console.error("抓取品牌清單失敗:", err);
        if (!cancelled) setBrandsError(true);
      } finally {
        if (!cancelled) setBrandsLoading(false);
      }
    };

    fetchBrands();
    return () => {
      cancelled = true;
    };
  }, [retryKey]);

  return { brands, brandsLoading, brandsError, retry: () => setRetryKey((k) => k + 1) };
}
