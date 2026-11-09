"use client";
import { useEffect, useRef, type RefObject } from "react";

// date-picker.tsx、month-filter.tsx原本各自複製了一份一模一樣的「點外面關閉下拉選單」邏輯
// (監聽mousedown、判斷ref.current.contains),抽成共用hook,跟useDropdown.ts同一種DRY做法。
// onOutside用callbackRef存最新版本、effect本身只依賴ref——呼叫端每次render傳進來的
// 通常是行內箭頭函式(() => setOpen(false)),這樣才不會因為那個箭頭函式每次render
// 都是新的而讓監聽器重複移除/掛上,維持原本「掛載時掛一次」的行為
export function useClickOutside(ref: RefObject<HTMLElement | null>, onOutside: () => void) {
  const callbackRef = useRef(onOutside);
  // 寫入ref.current要放進effect裡,不能在render期間直接賦值(react-hooks/refs規則)——
  // 這個effect的deps是[onOutside],每次render傳進來新的箭頭函式都會讓它重新跑一次,
  // 但只是賦值,成本可以忽略;下面那個「真正掛監聽器」的effect deps只有[ref],
  // 不會被這個重新跑影響
  useEffect(() => {
    callbackRef.current = onOutside;
  }, [onOutside]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        callbackRef.current();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [ref]);
}
