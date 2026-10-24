"use client";
import { useState, useEffect } from "react";

// 共用的「短暫成功提示」邏輯:呼叫showToast(message)顯示,過一段時間後自動消失。
// 記帳頁、品牌菜單頁、飲料頁都要用同一套,抽出來避免每個頁面各自重複寫
// 一樣的useState+useEffect(之前記帳頁的toast就是這樣寫的)
export function useSuccessToast(duration = 2500) {
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), duration);
    return () => clearTimeout(timer);
  }, [toast, duration]);

  return { toast, showToast: setToast };
}
