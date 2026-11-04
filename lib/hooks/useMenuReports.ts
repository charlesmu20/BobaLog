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

  useEffect(() => {
    if (!enabled) return;
    const q = query(collection(db, "menuReports"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setReports(
        snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<MenuReport, "id">) }))
      );
      setLoading(false);
    });
    return () => unsubscribe();
  }, [enabled]);

  return { reports, loading };
}
