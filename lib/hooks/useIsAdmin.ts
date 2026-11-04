"use client";
import { useState, useEffect } from "react";
import { useCurrentUser } from "./useCurrentUser";

// 判斷目前登入的人是不是管理員,靠的是scripts/set-admin.ts設定在Firebase Auth帳號上的
// custom claims(admin: true),不是看前端有沒有顯示管理頁面入口——這裡只負責決定
// 要不要顯示管理頁面UI,真正擋人的權限檢查在Firestore rules跟Cloud Function那邊。
// getIdTokenResult()預設會用快取的token,custom claims剛設定完、沒有重新登入的話
// 不會馬上反映,這是預期中的行為(設定admin時的script有提醒要重新登入一次)
export function useIsAdmin() {
  const { user, checkingAuth } = useCurrentUser();
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingAdmin, setCheckingAdmin] = useState(true);

  useEffect(() => {
    if (checkingAuth) return;
    if (!user) {
      // 跟著Firebase Auth的登入狀態同步,屬於跟外部資料同步的合理情境(跟favorites/page.tsx
      // 跟著favoriteBrandSlugs同步本地排序狀態是同一種case)
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsAdmin(false);
      setCheckingAdmin(false);
      return;
    }
    let cancelled = false;
    user.getIdTokenResult().then((result) => {
      if (cancelled) return;
      setIsAdmin(result.claims.admin === true);
      setCheckingAdmin(false);
    });
    return () => {
      cancelled = true;
    };
  }, [user, checkingAuth]);

  return { isAdmin, checkingAdmin: checkingAuth || checkingAdmin };
}
