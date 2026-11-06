"use client";
import { useState, useEffect, useMemo } from "react";
import { collection, query, where, orderBy, onSnapshot, addDoc, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useUserProfiles } from "@/lib/hooks/useUserProfiles";

export type Comment = {
  id: string;
  uid: string;
  displayName: string;
  // 頭貼不是Firestore文件本來就有的欄位,是用useUserProfiles即時查到的才合併進來,
  // 查不到(帳號還沒同步過頭貼,或本來就沒設定)就是undefined,畫面上顯示預設圖示
  photoURL?: string | null;
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

  // 留言文件裡存的displayName/photoURL都是發文當下的快照,改名字/換頭貼不會回頭更新舊留言——
  // 這邊改成額外查一次users/{uid}目前的名字/頭貼,查得到就蓋過去;查不到(例如帳號是舊資料,
  // 還沒同步過users文件,或剛送出留言、即時資料還沒抓回來)才退回用留言裡存的那份快照。
  // 頭貼有快照可以墊著先顯示,就不用像以前一樣完全等第二次查詢回來才有圖可以看
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

  // 新增一則留言。沒登入就擋下來,跟useRatings的submitRating同一招
  // 空白/字數檢查不在這裡做,留給畫面表單那邊處理
  const submitComment = async (displayName: string, photoURL: string | null, text: string) => {
    if (!uid) return;
    await addDoc(collection(db, "comments"), {
      uid,
      displayName,
      photoURL,
      brandSlug,
      drinkId,
      text,
      createdAt: Date.now(),
    });
  };

  return { comments: resolvedComments, submitComment };
}

// 編輯/刪除是單純對同一份"comments"文件操作,不管是從飲料頁(useComments)
// 還是品牌頁的「顧客留言」(useBrandComments)呼叫邏輯都一樣,所以獨立成一般函式,
// 不綁在特定hook裡,兩邊import直接用,不用各自重複寫一份
export async function editComment(commentId: string, text: string) {
  await updateDoc(doc(db, "comments", commentId), { text });
}

export async function deleteComment(commentId: string) {
  await deleteDoc(doc(db, "comments", commentId));
}