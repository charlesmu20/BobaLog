"use client";
import { useState, useEffect } from "react";
import { collection, query, where, onSnapshot, doc, setDoc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export function useFavorites(uid: string | null) {

  const [favoriteBrandSlugs, setFavoriteBrandSlugs] = useState<Set<string>>(new Set());
  const [favoriteDrinkIds, setFavoriteDrinkIds] = useState<Set<string>>(new Set());

//沒登入的話就把清單清空，不需查資料庫
  useEffect(() => {
    if (!uid) {
      setFavoriteBrandSlugs(new Set());
      setFavoriteDrinkIds(new Set());
      return;
    }
    // 去 favoriteBrands 這個集合,挑出 uid 欄位等於「現在這個人」的文件
    const brandsQuery = query(collection(db, "favoriteBrands"), where("uid", "==", uid));
    // 資料庫有變化就自動重新執行
    const unsubscribeBrands = onSnapshot(brandsQuery, (snapshot) => {
      setFavoriteBrandSlugs(new Set(snapshot.docs.map((d) => d.data().slug)));
    });
    
    const drinksQuery = query(collection(db, "favoriteDrinks"), where("uid", "==", uid));
    const unsubscribeDrinks = onSnapshot(drinksQuery, (snapshot) => {
      setFavoriteDrinkIds(new Set(snapshot.docs.map((d) => d.data().drinkId)));
    });

    // 元件消失、或是 uid 變了(換人登入)的時候,把之前的監聽取消掉,避免浪費資源、資料錯亂
    return () => {
      unsubscribeBrands();
      unsubscribeDrinks();
    };

  }, [uid]);

  // 收藏/取消收藏「品牌」的函式
  const toggleBrandFavorite = async (slug: string) => {
    if (!uid) return;

    const ref = doc(db, "favoriteBrands", `${uid}_${slug}`);
    if (favoriteBrandSlugs.has(slug)) {
      await deleteDoc(ref);
    } else {
      await setDoc(ref, { uid, slug, createdAt: Date.now() });
    }
  };
  // 收藏/取消收藏「飲料」的函式

  const toggleDrinkFavorite = async (brandSlug: string, drinkId: string) => {
    if (!uid) return;
    const ref = doc(db, "favoriteDrinks", `${uid}_${drinkId}`);
    if (favoriteDrinkIds.has(drinkId)) {
      await deleteDoc(ref);
    } else {
      await setDoc(ref, { uid, brandSlug, drinkId, createdAt: Date.now() });
    }
  };

  // 把這個 hook 內部狀態包成外部好用的介面,讓頁面元件可以直接呼叫
  return {
    isBrandFavorited: (slug: string) => favoriteBrandSlugs.has(slug),
    isDrinkFavorited: (brandSlug: string, drinkId: string) => favoriteDrinkIds.has(drinkId),
    toggleBrandFavorite,
    toggleDrinkFavorite,
  };
}