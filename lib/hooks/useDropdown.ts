"use client";
import { useState } from "react";

// 品牌/飲料/加料三組下拉選單在log-modal.tsx裡原本各自複製了一份一模一樣的開關邏輯:
// focus/點擊打開,blur延遲150ms才真的關閉——不能馬上關,不然選項列表的onMouseDown/onClick
// 還沒來得及觸發,輸入框就先blur把面板收掉了,點擊會打空。抽成共用hook,三個地方都用同一份
export function useDropdown() {
  const [open, setOpen] = useState(false);

  const handleBlur = () => {
    setTimeout(() => setOpen(false), 150);
  };

  return { open, setOpen, handleBlur };
}
