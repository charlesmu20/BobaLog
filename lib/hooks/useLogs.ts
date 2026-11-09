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
  const [logsError, setLogsError] = useState(false);
  // 重試用:改這個值會讓下面的effect重新跑一次,等於重新訂閱一次onSnapshot
  const [retryToken, setRetryToken] = useState(0);

  useEffect(() => {
    // 沒登入就不訂閱,跟useFavorites.ts同樣的理由——這個判斷當下就能決定,
    // 不需要額外setState清空
    if (!uid) return;
    // 重新訂閱前(換帳號、retry)先清掉上一輪的錯誤狀態
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLogsError(false);
    const q = query(collection(db, "logs"), where("uid", "==", uid), orderBy("date", "desc"));
    // logs是記帳頁、個人資料頁的核心內容(不是裝飾性小角標),監聽失敗卻沒接錯誤回呼的話,
    // 畫面會悄悄一直顯示空清單,看起來像完全沒記過帳,所以比照useUserBadges加上錯誤回呼
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as LogEntry[];
        setLogs(data);
      },
      (error) => {
        console.error("logs監聽失敗", error);
        setLogsError(true);
      }
    );
    return () => unsubscribe();
  }, [uid, retryToken]);

  return { logs, logsError, retryLogs: () => setRetryToken((t) => t + 1) };
}
