"use client";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { useChatMessages } from "@/lib/hooks/useChatMessages";
import ChatMessageItem, { Avatar, bubbleMotion } from "@/components/chat/chat-message-item";
import LoginRequiredModal from "@/components/login-required-modal";
import ChatHeader from "@/components/chat/chat-header";
import ChatInputBar from "@/components/chat/chat-input-bar";
import ChatToggleButton from "@/components/chat/chat-toggle-button";
import TypingIndicator from "@/components/chat/typing-indicator";

// 全站共用的浮動聊天視窗,掛在app/layout.tsx。浮動按鈕本身沒登入也看得到——
// 跟收藏功能一樣的做法,讓沒登入的訪客知道有這個功能,點下去才用LoginRequiredModal
// 提示去登入,而不是整個按鈕都藏起來
//
// 這個檔案是「總指揮」:管所有狀態、決定要不要開面板,畫面的四大塊
// (header/輸入框/浮動按鈕/打字中動畫)都拆到各自的檔案,這裡只負責組裝、傳資料
export default function ChatPanel() {
  const pathname = usePathname();
  const { user } = useCurrentUser();
  const { messages, sendMessage, sending, error, confirmDraft, cancelDraft, reportWrongDraft } =
    useChatMessages(user?.uid ?? null);
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [showLoginModal, setShowLoginModal] = useState(false);
  // 使用者選了照片、但還沒按送出的那個暫存狀態——真正的File物件(要送去給後端)跟
  // 本機縮圖預覽網址(給輸入框那排顯示用)分開存,兩個是不同用途
  const [pendingImage, setPendingImage] = useState<File | null>(null);
  const [pendingImagePreview, setPendingImagePreview] = useState<string | null>(null);

  // 登入頁自己就是在處理「登入」這件事,不需要再疊一個「請先登入才能用聊天」的浮動按鈕,
  // 直接整個不渲染——跟之前user是null時的那個return null是同一種做法,只是判斷條件換成頁面路徑
  if (pathname === "/login") return null;

  function handleImageSelect(file: File) {
    // 選新照片前,先把上一張(如果有)的預覽網址釋放掉,不然每選一次就多留一個沒用到的blob網址
    if (pendingImagePreview) URL.revokeObjectURL(pendingImagePreview);
    setPendingImage(file);
    setPendingImagePreview(URL.createObjectURL(file));
  }

  function handleImageClear() {
    if (pendingImagePreview) URL.revokeObjectURL(pendingImagePreview);
    setPendingImage(null);
    setPendingImagePreview(null);
  }

  function handleSend() {
    const text = input;
    const image = pendingImage;
    setInput("");
    // 送出之後輸入框那個縮圖就用不到了,比照handleImageClear把網址釋放掉。
    // sendMessage會拿原始的image檔案自己另外生一份「聊天紀錄裡」要顯示的新網址,
    if (pendingImagePreview) URL.revokeObjectURL(pendingImagePreview);
    setPendingImage(null);
    setPendingImagePreview(null);
    sendMessage(text, image);
  }

  function handleToggle() {
    if (!user) {
      setShowLoginModal(true);
      return;
    }
    setOpen((prev) => !prev);
  }

  return (
    <>
      <LoginRequiredModal open={showLoginModal} onClose={() => setShowLoginModal(false)} />

      <AnimatePresence>
        {user && open && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            // 手機版(760px以下,跟nav-bar.tsx同一條斷點):inset-4讓面板四邊各留1rem,
            // 不特別設寬高,position:fixed配合四個方向都有值,瀏覽器會自動撐滿剩下的空間——
            // 等於「幾乎全螢幕」的面板,不會再被寫死的420px寬度切掉。
            // 760px以上(min-[760px]:):改回原本右下角固定420x560的樣子,inset-auto
            // 把手機版的inset-4重設掉,改用bottom-24/right-6+寫死的h/w
            className="fixed inset-4 z-40 flex flex-col overflow-hidden rounded-3xl bg-[#FBF8F3] shadow-2xl ring-1 ring-black/5 min-[760px]:inset-auto min-[760px]:bottom-24 min-[760px]:right-6 min-[760px]:h-[560px] min-[760px]:w-[420px]"
          >
            <ChatHeader onClose={() => setOpen(false)} />

            <div className="flex-1 space-y-2.5 overflow-y-auto px-3 pb-4 pt-6">
              {messages.length === 0 && !sending && (
                // 套用跟其他assistant訊息一樣的進場動畫(從chat-message-item.tsx匯入
                // 同一份Avatar、bubbleMotion,不要自己另外重複寫一份樣式)
                <motion.div {...bubbleMotion(false)} className="flex items-end gap-2">
                  <Avatar />
                  <div className="max-w-[80%] rounded-2xl rounded-bl-md bg-white px-4 py-2.5 text-sm text-[#3C332B] shadow-sm ring-1 ring-black/5">
                    嗨!跟我說你剛喝了什麼,我幫你記一筆。
                  </div>
                </motion.div>
              )}
              {messages.map((m) => (
                <ChatMessageItem
                  key={m.id}
                  message={m}
                  onConfirm={confirmDraft}
                  onCancel={cancelDraft}
                  onWrong={reportWrongDraft}
                />
              ))}
              <AnimatePresence>{sending && <TypingIndicator />}</AnimatePresence>
              {error && <p className="text-sm text-red-600">{error}</p>}
            </div>

            <ChatInputBar
              input={input}
              onInputChange={setInput}
              onSend={handleSend}
              sending={sending}
              pendingImagePreview={pendingImagePreview}
              onImageSelect={handleImageSelect}
              onImageClear={handleImageClear}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* 面板打開時把浮動按鈕藏起來——手機版面板是inset-4全螢幕式,
          按鈕的bottom-6/right-6位置會疊在面板右下角、蓋住輸入框,不藏起來會很醜。
          面板裡已經有X可以關,不需要同時顯示兩個開關 */}
      {!open && <ChatToggleButton onClick={handleToggle} />}
    </>
  );
}
