"use client";
import { useState, useEffect } from "react";
import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Comment } from "@/lib/hooks/useComments";

// 跟useBrandComments.ts很像,差在查詢條件換成uid而不是brandSlug——
// 用在個人資料頁「我的留言」,列出這個人自己發過的所有留言(跨品牌、跨飲料)
export type MyComment = Comment & { brandSlug: string; drinkId: string };

export function useMyComments(uid: string | null) {
  const [comments, setComments] = useState<MyComment[]>([]);
  // 第一次onSnapshot回來之前都算loading中,避免「空清單」被誤認成「真的沒留言過」
  const [commentsLoading, setCommentsLoading] = useState(true);

  useEffect(() => {
    if (!uid) {
      // 沒登入就直接清空,不用查資料庫,跟useUserBadges.ts同一套邏輯
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setComments([]);
      setCommentsLoading(false);
      return;
    }
    setCommentsLoading(true);
    const q = query(collection(db, "comments"), where("uid", "==", uid), orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<MyComment, "id">),
      }));
      setComments(list);
      setCommentsLoading(false);
    });

    return () => unsubscribe();
  }, [uid]);

  return { comments, commentsLoading };
}
