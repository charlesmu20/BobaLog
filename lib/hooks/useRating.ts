"use client";
import { useState, useEffect } from "react";
import { collection, query, where, onSnapshot, doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export function useRatings(brandSlug: string, drinkId: string, uid: string | null) {
  // 所有人給的分數 例如 [5, 3, 4]
  const [ratings, setRatings] = useState<number[]>([]);
  // 自己對這杯飲料的評分
  const [myRating, setMyRating] = useState<number | null>(null);
  
  useEffect(() => {
    // 去 ratings 這個集合,挑出 brandSlug 跟 drinkId 都符合「這杯飲料」的文件
    const q = query(
      collection(db, "ratings"),
      where("brandSlug", "==", brandSlug),
      where("drinkId", "==", drinkId)
    );
    //資料庫有變化就自動重新執行
    const unsubscribe = onSnapshot(q, (snapshot) => {
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
    });
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

  return { average, count: ratings.length, myRating, submitRating };
}