"use client";
import { useState, useEffect } from "react";
import { collection, query, where, orderBy, onSnapshot, addDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export type Comment = {
  id: string;
  uid: string;
  displayName: string;
  text: string;
  createdAt: number;
};

export function useComments(brandSlug: string, drinkId: string, uid: string | null) {
  const [comments, setComments] = useState<Comment[]>([]);

  useEffect(() => {
    // 查這杯飲料底下的全部留言,搭配orderBy讓最新的排最上面
    const q = query(
      collection(db, "comments"),
      where("brandSlug", "==", brandSlug),
      where("drinkId", "==", drinkId),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Comment, "id">),
      }));
      setComments(list);
    });

    return () => unsubscribe();
  }, [brandSlug, drinkId]);

  // 新增一則留言。沒登入就擋下來,跟useRatings的submitRating同一招
  // 空白/字數檢查不在這裡做,留給畫面表單那邊處理
  const submitComment = async (displayName: string, text: string) => {
    if (!uid) return;
    await addDoc(collection(db, "comments"), {
      uid,
      displayName,
      brandSlug,
      drinkId,
      text,
      createdAt: Date.now(),
    });
  };

  return { comments, submitComment };
}