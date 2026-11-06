"use client";
import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { syncUserProfile } from "@/lib/user-profile";

type CurrentUserValue = { user: User | null; checkingAuth: boolean; refreshUser: () => Promise<void> };

// 全站只在CurrentUserProvider這裡訂閱一次onAuthStateChanged,
// 不管底下有幾個元件呼叫useCurrentUser(),都是從同一份Context拿結果,
// 不會每個元件各自重新訂閱一次監聽器
const CurrentUserContext = createContext<CurrentUserValue | null>(null);

export function CurrentUserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setCheckingAuth(false);
      // 每次登入狀態確定有人(含signup、登入、重新整理後恢復session)就同步一次公開名字快照,
      // 不用等使用者特地去改名字那個畫面才第一次建立users/{uid}文件
      if (currentUser) void syncUserProfile(currentUser);
    });
    return () => unsubscribe();
  }, []);

  // 個人資料頁改名字/換頭貼後呼叫:reload()會更新auth.currentUser內部的資料,
  // 但不會自動觸發onAuthStateChanged重新發送一次,所以要手動把新資料寫回state畫面才會更新。
  // 用Object.create保留原本的prototype(reload/getIdToken這些方法還能用),
  // 只是包成一個新的物件參照,讓React的reference比較能偵測到變化
  const refreshUser = async () => {
    if (!auth.currentUser) return;
    await auth.currentUser.reload();
    const current = auth.currentUser;
    if (current) {
      setUser(Object.assign(Object.create(Object.getPrototypeOf(current)), current));
      // 改名字/換頭貼後,同步更新一次公開名字快照,留言那邊才能即時查到新名字
      void syncUserProfile(current);
    }
  };

  return (
    <CurrentUserContext.Provider value={{ user, checkingAuth, refreshUser }}>
      {children}
    </CurrentUserContext.Provider>
  );
}

// 保留原本的useCurrentUser()這個名字跟用法(回傳{user, checkingAuth}),
// 底下9個呼叫的地方完全不用改——只是從原本「自己訂閱監聽器」,
// 改成「向上伸手去CurrentUserProvider放的Context箱子裡拿」
export function useCurrentUser() {
  const value = useContext(CurrentUserContext);
  if (!value) {
    // 沒包在CurrentUserProvider底下就呼叫,代表用法本身有誤——直接丟錯誤,
    // 比悄悄回傳一份假的{user: null, checkingAuth: true}更容易在開發時就抓到問題
    throw new Error("useCurrentUser必須在CurrentUserProvider底下使用");
  }
  return value;
}
