"use client";
import { useState, useEffect } from "react";
import { doc, getDoc, collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Brand, Drink } from "@/lib/brands";

export function useBrand(slug: string) {
  const [brand, setBrand] = useState<Brand | null>(null);
  const [brandLoading, setBrandLoading] = useState(true);
  const [brandError, setBrandError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const fetchBrand = async () => {
      setBrandLoading(true);
      setBrandError(false);
      try {
        const brandRef = doc(db, "brands", slug);
        const brandSnap = await getDoc(brandRef);

        if (!brandSnap.exists()) {
          // 查無此品牌是正常情況(網址打錯、品牌下架),不是錯誤,不用重試按鈕
          if (!cancelled) setBrand(null);
          return;
        }

        const drinksSnapshot = await getDocs(collection(db, "brands", slug, "drinks"));
        const drinks = drinksSnapshot.docs.map((d) => ({ ...(d.data() as Drink), id: d.id }));

        if (!cancelled) setBrand({ ...brandSnap.data(), drinks } as Brand);
      } catch (err) {
        // 抓取失敗(離線、網路問題等)才是真的錯誤,要讓loading結束並顯示可重試的狀態,
        // 不然畫面會卡在「載入中」出不來
        console.error("抓取品牌資料失敗:", err);
        if (!cancelled) {
          setBrand(null);
          setBrandError(true);
        }
      } finally {
        if (!cancelled) setBrandLoading(false);
      }
    };

    fetchBrand();
    return () => {
      cancelled = true;
    };
  }, [slug, retryKey]);

  return { brand, brandLoading, brandError, retry: () => setRetryKey((k) => k + 1) };
}
