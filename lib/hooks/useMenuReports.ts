"use client";
import { useState, useEffect } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { MenuReport } from "@/lib/menu-report-types";

// 管理頁面專用:即時讀取全部回報(靠firestore.rules的admin.token.admin==true放行,
// 一般使用者的onSnapshot在這裡會直接被Firestore擋下來,不會跑到這個hook)
export function useMenuReports(enabled: boolean) {
  const [reports, setReports] = useState<MenuReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  // 重試用:改這個值會讓下面的effect重新跑一次,等於重新訂閱一次onSnapshot
  const [retryToken, setRetryToken] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    // 重新訂閱前(retry)先標記loading中、清掉上一輪的錯誤狀態
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setError(false);
    const q = query(collection(db, "menuReports"), orderBy("createdAt", "desc"));
    // 這頁的loadingGuard是靠loading控制的,監聽失敗卻沒接錯誤回呼的話會永遠卡在「載入回報中...」
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setReports(
          snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<MenuReport, "id">) }))
        );
        setLoading(false);
      },
      (err) => {
        console.error("menuReports監聽失敗", err);
        setLoading(false);
        setError(true);
      }
    );
    return () => unsubscribe();
  }, [enabled, retryToken]);

  return { reports, loading, error, retry: () => setRetryToken((t) => t + 1) };
}
