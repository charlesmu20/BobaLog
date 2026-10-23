"use client";
import { useState, useEffect } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";

export function useUserBadges(uid: string | null) {
  // 改用Map:key是勳章id,value是解鎖時間,除了能查「解鎖了嗎」還能查「什麼時候解鎖的」
  const [unlockedBadges, setUnlockedBadges] = useState<Map<string, Date>>(new Map());
  // 第一次onSnapshot回來之前都算loading中,避免「空Map」被誤認成「真的0個勳章」
  const [badgesLoading, setBadgesLoading] = useState(true);

  useEffect(() => {
    // 沒登入就直接清空,不用查資料庫
    if (!uid) {
      setUnlockedBadges(new Map());
      setBadgesLoading(false);
      return;
    }
    setBadgesLoading(true);
    // 去 userBadges 這個集合,挑出 uid 欄位等於「現在這個人」的文件
    const q = query(collection(db, "userBadges"), where("uid", "==", uid));

    // 資料庫有變化就自動重新執行(Cloud Functions解鎖新勳章時,畫面會自動更新)
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const entries = snapshot.docs.map((doc) => {
        const data = doc.data();
        // unlockedAt是Firestore的Timestamp物件,要呼叫.toDate()轉成一般的JS Date
        return [data.badgeId, data.unlockedAt.toDate()] as [string, Date];
      });
      setUnlockedBadges(new Map(entries));
      setBadgesLoading(false);
    });

    return () => unsubscribe();
  }, [uid]);

  return { unlockedBadges, badgesLoading };
}