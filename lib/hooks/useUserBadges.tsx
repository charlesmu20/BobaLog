"use client";
import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useCurrentUser } from "./useCurrentUser";

type UserBadgesValue = {
  unlockedBadges: Map<string, Date>;
  badgesLoading: boolean;
  badgesError: boolean;
  retryBadges: () => void;
};

// 跟useCurrentUser.tsx同一套做法:全站只在這個Provider裡訂閱一次userBadges的onSnapshot,
// 不管底下有幾個元件呼叫useUserBadges(),都是從同一份Context拿結果,不會各自重新訂閱一次監聽器。
// 原本app/badges/page.tsx、app/profile/page.tsx、全域的badge-unlock-toast.tsx三個地方
// 各自呼叫同名的hook,只要同時在/badges或/profile頁面,就會開出兩條查同一份資料的重複監聽器
const UserBadgesContext = createContext<UserBadgesValue | null>(null);

export function UserBadgesProvider({ children }: { children: ReactNode }) {
  const { user } = useCurrentUser();
  const uid = user?.uid ?? null;

  const [unlockedBadges, setUnlockedBadges] = useState<Map<string, Date>>(new Map());
  const [badgesLoading, setBadgesLoading] = useState(true);
  const [badgesError, setBadgesError] = useState(false);
  // 重試用:改這個值會讓下面的effect重新跑一次,等於重新訂閱一次onSnapshot
  const [retryToken, setRetryToken] = useState(0);

  useEffect(() => {
    // 沒登入就直接清空,不用查資料庫
    if (!uid) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setUnlockedBadges(new Map());
      setBadgesLoading(false);
      setBadgesError(false);
      return;
    }
    setBadgesLoading(true);
    setBadgesError(false);
    const q = query(collection(db, "userBadges"), where("uid", "==", uid));

    // onSnapshot其實可以接第三個參數當錯誤回呼,原本沒有接——如果這條監聽
    // 因為安全規則、網路問題等原因失敗,callback根本不會被呼叫,badgesLoading
    // 會永遠卡在true,畫面也就永遠轉圈圈出不來。現在失敗時至少把loading關掉、標記錯誤
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const entries = snapshot.docs.map((doc) => {
          const data = doc.data();
          return [data.badgeId, data.unlockedAt.toDate()] as [string, Date];
        });
        setUnlockedBadges(new Map(entries));
        setBadgesLoading(false);
      },
      (error) => {
        console.error("userBadges監聽失敗", error);
        setBadgesLoading(false);
        setBadgesError(true);
      }
    );

    return () => unsubscribe();
  }, [uid, retryToken]);

  return (
    <UserBadgesContext.Provider
      value={{
        unlockedBadges,
        badgesLoading,
        badgesError,
        retryBadges: () => setRetryToken((t) => t + 1),
      }}
    >
      {children}
    </UserBadgesContext.Provider>
  );
}

// 保留原本的useUserBadges()這個名字,底下呼叫的地方不用改用法——
// 只是從原本「自己傳uid進來訂閱」,改成「向上伸手去UserBadgesProvider放的Context箱子裡拿」,
// 所以不用再傳uid參數了
export function useUserBadges() {
  const value = useContext(UserBadgesContext);
  if (!value) {
    throw new Error("useUserBadges必須在UserBadgesProvider底下使用");
  }
  return value;
}
