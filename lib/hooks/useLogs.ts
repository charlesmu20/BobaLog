"use client";
import { useState, useEffect } from "react";
import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { LogEntry } from "@/lib/types";

// 原本這段(即時監聽使用者的logs)只活在history-view.tsx裡面,app/log/page.tsx
// 這層的LogModal(「新增紀錄」用的那個)拿不到。抽成共用hook,跟useFavorites.ts、
// useComments.ts同一套模式,page.tsx呼叫一次,透過props同時分給HistoryView跟LogModal,
// 不要兩邊各自開一條onSnapshot監聽同一份資料
export function useLogs(uid: string | null) {
  const [logs, setLogs] = useState<LogEntry[]>([]);

  useEffect(() => {
    // 沒登入就不訂閱,跟useFavorites.ts同樣的理由——這個判斷當下就能決定,
    // 不需要額外setState清空
    if (!uid) return;
    const q = query(collection(db, "logs"), where("uid", "==", uid), orderBy("date", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as LogEntry[];
      setLogs(data);
    });
    return () => unsubscribe();
  }, [uid]);

  return { logs };
}
