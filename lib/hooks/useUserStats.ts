"use client";
import { useState, useEffect } from "react";
import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";
import type { UserStats } from "@/lib/badges";

export function useUserStats(uid: string | null) {
  const [stats, setStats] = useState<UserStats | null>(null);

  useEffect(() => {
    if (!uid) {
      setStats(null);
      return;
    }
    // 準備呼叫後端的getMyStats這個callable function
    const getMyStats = httpsCallable<void, UserStats>(functions, "getMyStats");
    // 真正發送請求,等後端算完回傳結果
    getMyStats().then((result) => {
      setStats(result.data);
    });
  }, [uid]);

  return { stats };
}
