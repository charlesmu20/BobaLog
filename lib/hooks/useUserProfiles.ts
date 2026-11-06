"use client";
import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";

export type LiveUserProfile = { displayName?: string; photoURL?: string | null };

// 依照一串uid即時訂閱users/{uid}文件,回傳uid對應到「目前」名字/頭貼的map。
// 用在comments這類本來只存了uid+發文當下displayName快照(沒有頭貼)的地方——
// 查不到(例如使用者還沒同步過、或文件不存在)就不會出現在這個map裡,
// 呼叫端自己決定要不要退回用原本存的那份舊快照當fallback
export function useUserProfiles(uids: string[]) {
  const [profiles, setProfiles] = useState<Record<string, LiveUserProfile>>({});

  // 用uids去重+排序後串成字串當作dependency,避免每次render傳進來的陣列參照不同
  // 就整批重新訂閱(comments每次onSnapshot都會回傳新的陣列參照)
  const key = [...new Set(uids)].sort().join(",");

  useEffect(() => {
    const distinctUids = key ? key.split(",") : [];
    // uid清單變空就不訂閱——不特地清掉舊的profiles,反正呼叫端是拿uid去map裡查,
    // 清單空了也不會有東西去查這些殘留的舊資料,留著無害,不用為了清而觸發一次多餘的setState
    if (distinctUids.length === 0) return;

    const unsubscribes = distinctUids.map((uid) =>
      onSnapshot(doc(db, "users", uid), (snap) => {
        if (!snap.exists()) return;
        const data = snap.data();
        const next: LiveUserProfile = { displayName: data.displayName, photoURL: data.photoURL };
        setProfiles((prev) => {
          const current = prev[uid];
          if (current && current.displayName === next.displayName && current.photoURL === next.photoURL) {
            return prev;
          }
          return { ...prev, [uid]: next };
        });
      })
    );

    return () => unsubscribes.forEach((unsub) => unsub());
  }, [key]);

  return profiles;
}
