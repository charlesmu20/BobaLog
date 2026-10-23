"use client";
import { useState, useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { BrandSummary } from "@/lib/brands";

export function useBrandSummaries() {
  const [brands, setBrands] = useState<BrandSummary[]>([]);
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
        if (cancelled) return;
        const brandsData = brandsSnapshot.docs.map((d) => d.data() as BrandSummary);
        setBrands(brandsData);
      } catch (err) {
        // 抓取失敗(離線、網路問題、Firestore規則拒絕等)也要讓loading結束,
        // 不然畫面會卡在「載入中」出不來
        console.error("抓取品牌資料失敗:", err);
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