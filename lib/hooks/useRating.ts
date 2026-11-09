"use client";
import { useState, useEffect } from "react";
import { collection, query, where, onSnapshot, doc, setDoc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export function useRatings(brandSlug: string, drinkId: string, uid: string | null) {
  // 所有人給的分數 例如 [5, 3, 4]
  const [ratings, setRatings] = useState<number[]>([]);
  // 自己對這杯飲料的評分
  const [myRating, setMyRating] = useState<number | null>(null);
  const [ratingsError, setRatingsError] = useState(false);

  useEffect(() => {
    // 重新訂閱前先清掉上一輪的錯誤狀態
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRatingsError(false);
    // 去 ratings 這個集合,挑出 brandSlug 跟 drinkId 都符合「這杯飲料」的文件
    const q = query(
      collection(db, "ratings"),
      where("brandSlug", "==", brandSlug),
      where("drinkId", "==", drinkId)
    );
    // 這裡沒有loading畫面可以卡住,監聽失敗原本只會悄悄變成「尚無評分」,
    // 跟真的沒人評分看起來一模一樣,加上error狀態讓畫面能分辨這兩種情況
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const values: number[] = [];
        let mine: number | null = null;
        // 把每一份文件的分數取出來,順便檢查是不是「我」打的那一筆
        snapshot.docs.forEach((d) => {
          const data = d.data();
          values.push(data.rating);
          if (uid && data.uid === uid) {
            mine = data.rating;
          }
        });
        setRatings(values);
        setMyRating(mine);
      },
      (error) => {
        console.error("ratings監聽失敗", error);
        setRatingsError(true);
      }
    );
    return () => unsubscribe();
  }, [brandSlug, drinkId, uid]);
  //平均分數
  const average = ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;
  //送出//更新自己的評分
  const submitRating = async (rating: number) => {
    if (!uid) return;
    const ref = doc(db, "ratings", `${uid}_${drinkId}`);
    await setDoc(ref, { uid, brandSlug, drinkId, rating, createdAt: Date.now() });
  };

  // 取消自己的評分:直接把那份文件刪掉,onSnapshot會自動把myRating變回null
  const clearRating = async () => {
    if (!uid) return;
    const ref = doc(db, "ratings", `${uid}_${drinkId}`);
    await deleteDoc(ref);
  };

  return { average, count: ratings.length, myRating, ratingsError, submitRating, clearRating };
}

export type DrinkRatingSummary = { average: number; count: number };

// 菜單頁要同時顯示「這個品牌底下每一杯飲料」的評分,如果每張卡片都各自呼叫一次
// useRatings,等於同時開幾十個onSnapshot監聽。改成只查一次「這個品牌的所有評分」,
// 在前端依drinkId分組算平均,一個監聽就夠
export function useBrandRatings(brandSlug: string) {
  const [ratingsByDrink, setRatingsByDrink] = useState<Record<string, DrinkRatingSummary>>({});

  useEffect(() => {
    const q = query(collection(db, "ratings"), where("brandSlug", "==", brandSlug));
    // 這只是菜單列表上的裝飾性評分角標,監聽失敗頂多角標停在舊數字,
    // 不值得為此做整套錯誤UI,但至少console記錄一下方便之後除錯
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const sums: Record<string, { total: number; count: number }> = {};
        snapshot.docs.forEach((d) => {
          const data = d.data();
          const drinkId = data.drinkId as string;
          if (!sums[drinkId]) sums[drinkId] = { total: 0, count: 0 };
          sums[drinkId].total += data.rating;
          sums[drinkId].count += 1;
        });
        const result: Record<string, DrinkRatingSummary> = {};
        for (const [drinkId, { total, count }] of Object.entries(sums)) {
          result[drinkId] = { average: total / count, count };
        }
        setRatingsByDrink(result);
      },
      (error) => console.error("brandRatings監聽失敗", error)
    );
    return () => unsubscribe();
  }, [brandSlug]);

  return ratingsByDrink;
}