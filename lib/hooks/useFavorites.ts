"use client";
import { useState, useEffect } from "react";
import { collection, query, where, onSnapshot, doc, setDoc, deleteDoc, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase";

type FavoriteBrandDoc = { slug: string; order: number };
type FavoriteDrinkDoc = { brandSlug: string; drinkId: string; order: number };

export function useFavorites(uid: string | null) {
  const [favoriteBrandDocs, setFavoriteBrandDocs] = useState<FavoriteBrandDoc[]>([]);
  const [favoriteDrinkDocs, setFavoriteDrinkDocs] = useState<FavoriteDrinkDoc[]>([]);
  // 第一次onSnapshot回來之前都算loading中,避免收藏頁一進站就先閃一下「還沒收藏任何東西」的空狀態
  const [favoritesLoading, setFavoritesLoading] = useState(true);

  //沒登入的話就不訂閱資料庫,下面回傳的isBrandFavorited/isDrinkFavorited會直接用uid擋掉、回傳false,
  // 不需要在這裡用setState清空(那樣會被react-hooks/set-state-in-effect標記,
  // 因為這個判斷當下就能決定,不是在等任何外部資料回應)
  useEffect(() => {
    if (!uid) return;
    // 換人登入、準備重新訂閱資料庫時先標記成loading中,避免收藏頁閃一下舊資料或空狀態
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFavoritesLoading(true);
    // 去 favoriteBrands 這個集合,挑出 uid 欄位等於「現在這個人」的文件
    const brandsQuery = query(collection(db, "favoriteBrands"), where("uid", "==", uid));
    // 資料庫有變化就自動重新執行
    const unsubscribeBrands = onSnapshot(brandsQuery, (snapshot) => {
      const docs = snapshot.docs.map((d) => {
        const data = d.data();
        // 舊資料(拖曳排序功能上線前就收藏的)沒有order欄位,先用createdAt頂著當排序依據,
        // 使用者只要拖曳過一次,所有項目就會被改寫成乾淨的0,1,2...整數
        const order = typeof data.order === "number" ? data.order : (data.createdAt ?? 0);
        return { slug: data.slug as string, order };
      });
      docs.sort((a, b) => a.order - b.order);
      setFavoriteBrandDocs(docs);
      setFavoritesLoading(false);
    });

    const drinksQuery = query(collection(db, "favoriteDrinks"), where("uid", "==", uid));
    const unsubscribeDrinks = onSnapshot(drinksQuery, (snapshot) => {
      const docs = snapshot.docs.map((d) => {
        const data = d.data();
        const order = typeof data.order === "number" ? data.order : (data.createdAt ?? 0);
        return { brandSlug: data.brandSlug as string, drinkId: data.drinkId as string, order };
      });
      docs.sort((a, b) => a.order - b.order);
      setFavoriteDrinkDocs(docs);
    });

    // 元件消失、或是 uid 變了(換人登入)的時候,把之前的監聽取消掉,避免浪費資源、資料錯亂
    return () => {
      unsubscribeBrands();
      unsubscribeDrinks();
    };
  }, [uid]);

  // 依排序後的順序排列的slug/id陣列,頁面直接拿這個去對應完整的品牌/飲料資料
  const favoriteBrandSlugs = favoriteBrandDocs.map((d) => d.slug);
  const favoriteDrinkIds = favoriteDrinkDocs.map((d) => d.drinkId);
  const favoriteBrandSlugSet = new Set(favoriteBrandSlugs);
  const favoriteDrinkIdSet = new Set(favoriteDrinkIds);

  // 收藏/取消收藏「品牌」的函式
  const toggleBrandFavorite = async (slug: string) => {
    if (!uid) return;

    const ref = doc(db, "favoriteBrands", `${uid}_${slug}`);
    if (favoriteBrandSlugSet.has(slug)) {
      await deleteDoc(ref);
    } else {
      // 新收藏的排到最後面(目前最大order+1)
      const nextOrder = favoriteBrandDocs.length > 0 ? Math.max(...favoriteBrandDocs.map((d) => d.order)) + 1 : 0;
      await setDoc(ref, { uid, slug, order: nextOrder, createdAt: Date.now() });
    }
  };
  // 收藏/取消收藏「飲料」的函式

  const toggleDrinkFavorite = async (brandSlug: string, drinkId: string) => {
    if (!uid) return;
    const ref = doc(db, "favoriteDrinks", `${uid}_${drinkId}`);
    if (favoriteDrinkIdSet.has(drinkId)) {
      await deleteDoc(ref);
    } else {
      const nextOrder = favoriteDrinkDocs.length > 0 ? Math.max(...favoriteDrinkDocs.map((d) => d.order)) + 1 : 0;
      await setDoc(ref, { uid, brandSlug, drinkId, order: nextOrder, createdAt: Date.now() });
    }
  };

  // 拖曳排序放開後呼叫:newOrderSlugs是拖完之後的新順序,一次用batch把每筆文件的order改成它在陣列裡的位置
  const reorderBrandFavorites = async (newOrderSlugs: string[]) => {
    if (!uid) return;
    const batch = writeBatch(db);
    newOrderSlugs.forEach((slug, index) => {
      batch.update(doc(db, "favoriteBrands", `${uid}_${slug}`), { order: index });
    });
    await batch.commit();
  };

  const reorderDrinkFavorites = async (newOrderDrinkIds: string[]) => {
    if (!uid) return;
    const batch = writeBatch(db);
    newOrderDrinkIds.forEach((drinkId, index) => {
      batch.update(doc(db, "favoriteDrinks", `${uid}_${drinkId}`), { order: index });
    });
    await batch.commit();
  };

  // 把這個 hook 內部狀態包成外部好用的介面,讓頁面元件可以直接呼叫。
  // 這裡用uid擋一下:沒登入的話不管state裡還留著上一個使用者登出前的舊資料沒有,一律當作沒收藏
  return {
    favoriteBrandSlugs: uid ? favoriteBrandSlugs : [],
    favoriteDrinkIds: uid ? favoriteDrinkIds : [],
    favoritesLoading,
    isBrandFavorited: (slug: string) => !!uid && favoriteBrandSlugSet.has(slug),
    isDrinkFavorited: (brandSlug: string, drinkId: string) => !!uid && favoriteDrinkIdSet.has(drinkId),
    toggleBrandFavorite,
    toggleDrinkFavorite,
    reorderBrandFavorites,
    reorderDrinkFavorites,
  };
}
