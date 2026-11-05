"use client";
import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth } from "@/lib/firebase";

type CurrentUserValue = { user: User | null; checkingAuth: boolean };

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
    });
    return () => unsubscribe();
  }, []);

  return (
    <CurrentUserContext.Provider value={{ user, checkingAuth }}>
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
