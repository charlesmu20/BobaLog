"use client";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle } from "lucide-react";
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
  const {
    messages,
    sendMessage,
    sending,
    error,
    canRetry,
    retryLastMessage,
    confirmDraft,
    cancelDraft,
    reportWrongDraft,
  } = useChatMessages(user?.uid ?? null);
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [showLoginModal, setShowLoginModal] = useState(false);
  // 使用者選了照片、但還沒按送出的那個暫存狀態——真正的File物件(要送去給後端)跟
  // 本機縮圖預覽網址(給輸入框那排顯示用)分開存,兩個是不同用途
  const [pendingImage, setPendingImage] = useState<File | null>(null);
  const [pendingImagePreview, setPendingImagePreview] = useState<string | null>(null);

  // 捲到最新訊息用的錨點——放在訊息清單最底部,每次訊息變多、開始打字中動畫、
  // 或是重新打開面板時,都把這個錨點捲進可視範圍,使用者不用自己手動往下滑
  const bottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, sending, open]);

  // 面板打開時自動把游標focus到輸入框,使用者不用自己先點一下才能打字——
  // ChatInputBar用forwardRef把文字input的DOM節點曝露出來,這裡才抓得到
  const textInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (open) textInputRef.current?.focus();
  }, [open]);

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
            // 面板背景從純一色改成極淡的漸層(上面偏暖一點、接近header的橙色調,往下漸漸退回
            // 原本的米色),加一點點顏色層次,但幅度刻意很小,不會搶走卡片本身的視覺重點
            // 外框改用跟全站「粗邊框貼紙風格」同一個深咖啡色(lib/sticker-card.ts的
            // border-[3px] border-[#3C332B]),不用純黑——純黑跟整體暖色調(橙色header、
            // 米色背景)不搭,這個深咖啡色才是全站粗邊框共用的顏色語言
            className="fixed inset-4 z-40 flex flex-col overflow-hidden rounded-3xl bg-gradient-to-b from-[#F7EAD7] to-[#FBF8F3] shadow-2xl ring-[3px] ring-[#3C332B] min-[760px]:inset-auto min-[760px]:bottom-24 min-[760px]:right-6 min-[760px]:h-[560px] min-[760px]:w-[420px]"
          >
            <ChatHeader onClose={() => setOpen(false)} />

            <div className="flex-1 space-y-2.5 overflow-y-auto px-3 pb-4 pt-6">
              {messages.length === 0 && !sending && (
                // 套用跟其他assistant訊息一樣的進場動畫(從chat-message-item.tsx匯入
                // 同一份Avatar、bubbleMotion,不要自己另外重複寫一份樣式)
                <motion.div {...bubbleMotion(false)} className="flex items-end gap-2">
                  <Avatar />
                  <div className="max-w-[80%] rounded-2xl rounded-bl-md bg-white px-4 py-2.5 text-sm text-[#3C332B] shadow-sm ring-1 ring-black/5">
                    嗨!想記一筆剛喝的,或是想找飲料喝,都可以跟我說~
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
                  onQuickReply={(text) => sendMessage(text)}
                  quickReplyDisabled={sending}
                  showTimestamp
                  onNavigate={() => setOpen(false)}
                />
              ))}
              <AnimatePresence>{sending && <TypingIndicator />}</AnimatePresence>
              {error && (
                // 錯誤訊息改成跟其他AI回覆同一套泡泡風格(頭像+泡泡),只是用警示色調跟
                // AlertCircle圖示跟一般回覆區分開,不要再是一行裸的紅字。旁邊附一顆「重試」
                // 按鈕,點了直接重打上一次失敗的那句話(canRetry/retryLastMessage來自
                // useChatMessages),使用者不用自己重新打一次字
                <motion.div {...bubbleMotion(false)} className="flex items-end justify-start gap-2">
                  <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-red-100">
                    <AlertCircle className="size-3.5 text-red-500" />
                  </div>
                  <div className="flex max-w-[80%] items-center gap-2.5 rounded-2xl rounded-bl-md bg-red-50 px-4 py-2.5 text-sm text-red-700 shadow-sm ring-1 ring-red-200">
                    <span>{error}</span>
                    {canRetry && (
                      <button
                        onClick={retryLastMessage}
                        disabled={sending}
                        className="shrink-0 cursor-pointer rounded-full bg-red-100 px-2.5 py-1 text-xs font-medium text-red-700 transition-colors hover:bg-red-200 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        重試
                      </button>
                    )}
                  </div>
                </motion.div>
              )}
              <div ref={bottomRef} />
            </div>

            <ChatInputBar
              ref={textInputRef}
              input={input}
              onInputChange={setInput}
              onSend={handleSend}
              sending={sending}
              pendingImagePreview={pendingImagePreview}
              onImageSelect={handleImageSelect}
              onImageClear={handleImageClear}
              onQuickAction={(text) => sendMessage(text)}
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
