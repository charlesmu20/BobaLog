"use client";
import { motion } from "framer-motion";
import { MessageCircle } from "lucide-react";

// 右下角那顆浮動圓形按鈕。永遠渲染(沒登入也看得到),只吃一個onClick——
// 有沒有登入、按下去該開面板還是跳登入提示,都是chat-panel.tsx的handleToggle在判斷,
// 這個元件自己不知道、也不需要知道使用者登入狀態
export default function ChatToggleButton({ onClick }: { onClick: () => void }) {
  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      aria-label="開啟聊天"
      className="fixed bottom-6 right-6 z-40 flex size-14 items-center justify-center rounded-full bg-gradient-to-br from-[#D98A44] to-[#B2612A] text-white shadow-xl"
    >
      <MessageCircle className="size-6" />
    </motion.button>
  );
}
