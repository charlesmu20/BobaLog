"use client";
import { requireLogin } from "@/lib/login-guard";

// 收藏品牌、收藏飲料兩個地方的「切換收藏」邏輯一模一樣:沒登入先擋下來,
// 已登入才真的呼叫toggle,並依「切換前」是否已收藏,跳出對應文字的提示,
// 所以抽成這個共用hook,呼叫端只要給它「切換前的狀態」跟「怎麼切換」就好
export function useFavoriteToggle(
  user: unknown,
  onRequireLogin: () => void,
  showToast: (message: string) => void
) {
  return (wasFavorited: boolean, toggle: () => void) => {
    if (!requireLogin(user, onRequireLogin)) return;
    toggle();
    showToast(wasFavorited ? "已取消收藏" : "已加入收藏");
  };
}
