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
  const [commentsError, setCommentsError] = useState(false);
  // 重試用:改這個值會讓下面的effect重新跑一次,等於重新訂閱一次onSnapshot
  const [retryToken, setRetryToken] = useState(0);

  useEffect(() => {
    if (!uid) {
      // 沒登入就直接清空,不用查資料庫,跟useUserBadges.ts同一套邏輯
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setComments([]);
      setCommentsLoading(false);
      setCommentsError(false);
      return;
    }
    setCommentsLoading(true);
    setCommentsError(false);
    const q = query(collection(db, "comments"), where("uid", "==", uid), orderBy("createdAt", "desc"));

    // 跟useUserBadges.ts同一個理由加上第三個錯誤回呼:這個頁面的loadingGuard
    // 就是靠commentsLoading控制的,監聽失敗卻沒有這個回呼的話,loading會永遠關不掉
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list = snapshot.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<MyComment, "id">),
        }));
        setComments(list);
        setCommentsLoading(false);
      },
      (error) => {
        console.error("myComments監聽失敗", error);
        setCommentsLoading(false);
        setCommentsError(true);
      }
    );

    return () => unsubscribe();
  }, [uid, retryToken]);

  return { comments, commentsLoading, commentsError, retryComments: () => setRetryToken((t) => t + 1) };
}
