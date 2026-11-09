"use client";
import { useState, useEffect, useMemo } from "react";
import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Comment } from "@/lib/hooks/useComments";
import { useUserProfiles } from "@/lib/hooks/useUserProfiles";

// 比useComments.ts多一個drinkId欄位——菜單頁要顯示「這則留言是在講哪杯飲料」,
// 所以不能只拿id/displayName/text/createdAt這幾個欄位,drinkId也要留著
export type BrandComment = Comment & { drinkId: string };

// 跟useComments.ts很像,差在這支不用傳drinkId——因為comments是獨立的頂層collection,
// 每則留言本來就直接存brandSlug欄位,所以「抓整個品牌的留言」只要一個query就夠,
// 不用先抓全部drinkId再一支一支查(不是N+1)
export function useBrandComments(brandSlug: string) {
  const [comments, setComments] = useState<BrandComment[]>([]);
  const [commentsError, setCommentsError] = useState(false);

  useEffect(() => {
    // 重新訂閱前先清掉上一輪的錯誤狀態,retry後才不會卡著舊的錯誤訊息
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCommentsError(false);
    const q = query(collection(db, "comments"), where("brandSlug", "==", brandSlug), orderBy("createdAt", "desc"));

    // 跟useComments.ts同一個理由:沒有loading畫面可以卡,監聽失敗原本只會悄悄變成空清單,
    // 看起來像「這個品牌還沒人留言」
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list = snapshot.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<BrandComment, "id">),
        }));
        setComments(list);
      },
      (error) => {
        console.error("brandComments監聽失敗", error);
        setCommentsError(true);
      }
    );

    return () => unsubscribe();
  }, [brandSlug]);

  // 跟useComments.ts同一招:留言裡存的displayName/photoURL都是發文當下的快照,
  // 改名字/換頭貼不會回頭更新,所以查一次users/{uid}目前的名字/頭貼蓋過去,查不到才退回舊快照
  const uidsInComments = useMemo(() => comments.map((c) => c.uid), [comments]);
  const liveProfiles = useUserProfiles(uidsInComments);
  const resolvedComments = useMemo(
    () =>
      comments.map((c) => ({
        ...c,
        displayName: liveProfiles[c.uid]?.displayName ?? c.displayName,
        photoURL: liveProfiles[c.uid]?.photoURL ?? c.photoURL,
      })),
    [comments, liveProfiles]
  );

  return { comments: resolvedComments, commentsError };
}
