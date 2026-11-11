"use client";
import { motion } from "framer-motion";
import { Avatar } from "@/components/chat/chat-message-item";

// AI正在組織回覆的時候顯示,三顆小圓點輪流跳動。不吃任何props,
// 純粹的裝飾元件——要不要顯示由外面(chat-panel.tsx)的AnimatePresence+sending狀態決定。
// 頭像改用chat-message-item.tsx匯出的共用Avatar,不要自己再重複寫一份一樣的漸層圓形樣式
export default function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex items-end gap-2"
    >
      <Avatar />
      <div className="flex items-center gap-1 rounded-2xl rounded-bl-md bg-white px-4 py-3 shadow-sm ring-1 ring-black/5">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="size-1.5 rounded-full bg-[#8A7A63]"
            animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
            transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15, ease: "easeInOut" }}
          />
        ))}
      </div>
    </motion.div>
  );
}
