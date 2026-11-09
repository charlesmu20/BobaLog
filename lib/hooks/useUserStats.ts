"use client";
import useSWR from "swr";
import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";
import type { UserStats } from "@/lib/badges";

async function fetchUserStats(): Promise<UserStats> {
  const getMyStats = httpsCallable<void, UserStats>(functions, "getMyStats");
  const result = await getMyStats();
  return result.data;
}

export function useUserStats(uid: string | null) {
  // 跟useBrands.ts同一套做法,改用SWR:
  // 1. key帶上uid(["user-stats", uid])——換帳號時SWR會當成不同的快取key處理,
  //    就算舊帳號那次呼叫比較晚回來,也不會蓋到新帳號的資料,不用自己寫cancelled旗標擋
  // 2. uid是null(還沒登入)時key傳null,SWR就不會發送請求
  // 3. error/isLoading/mutate(重試)都是現成的,不用自己額外維護
  const { data, error, isLoading, mutate } = useSWR(uid ? ["user-stats", uid] : null, fetchUserStats);

  return {
    stats: data ?? null,
    statsLoading: isLoading,
    statsError: !!error,
    retry: () => mutate(),
  };
}
