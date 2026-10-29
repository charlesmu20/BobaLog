"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, Check } from "lucide-react";
import type { ChatMessage } from "@/lib/hooks/useChatMessages";
import BrandIcon from "@/components/brand-icon";
import { toDateString } from "@/lib/history-utils";

// AI頭像,assistant的每則訊息(純文字跟確認卡片都算)前面都會放一個——
// 用柔和的漸層圓形+陰影,不是粗黑框那種硬線條。
// 有export出去給chat-panel.tsx用——面板一開始沒有訊息時顯示的那句問候語,
// 要畫成跟這裡一樣的樣子,不要自己另外重複寫一份
export function Avatar() {
  return (
    <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#D98A44] to-[#B2612A] shadow-sm">
      <Sparkles className="size-3.5 text-white" />
    </div>
  );
}

// 訊息進場的滑入動畫,使用者的話從右邊滑入、AI的話從左邊滑入。
// 同樣有export出去給chat-panel.tsx的問候語套用,這樣兩邊動畫手感才會一致
export function bubbleMotion(isUser: boolean) {
  return {
    initial: { opacity: 0, y: 8, x: isUser ? 12 : -12 },
    animate: { opacity: 1, y: 0, x: 0 },
    transition: { duration: 0.25, ease: [0.22, 1, 0.36, 1] as const },
  };
}

// 一則聊天訊息該畫成哪一種樣子:使用者自己講的話、AI的純文字回覆(追問/閒聊)、
// AI已經確定品牌飲料可以顯示確認卡片的那種、還是已經成功記帳的那種——
// 用role、draft、success這三個欄位判斷,順序很重要:draft/success要先判斷,
// 沒有的話才當作一般文字回覆
export default function ChatMessageItem({
  message,
  onConfirm,
  onCancel,
  onWrong,
}: {
  message: ChatMessage;
  onConfirm: (message: ChatMessage, amount: number, date: string, note: string) => void;
  onCancel: (message: ChatMessage) => void;
  onWrong: (message: ChatMessage) => void;
}) {
  if (message.role === "user") {
    return (
      <motion.div {...bubbleMotion(true)} className="flex justify-end">
        <div className="max-w-[80%] overflow-hidden rounded-2xl rounded-br-md bg-gradient-to-br from-[#D98A44] to-[#B2612A] text-sm text-white shadow-md">
          {message.imageUrl && (
            // 這是使用者送出那張照片的本機預覽網址(URL.createObjectURL產生的blob網址),
            // 不是真的存在某個地方的圖片網址,next/image的優化流程沒辦法處理blob網址
            // eslint-disable-next-line @next/next/no-img-element
            <img src={message.imageUrl} alt="使用者傳送的照片" className="max-h-48 w-full object-cover" />
          )}
          {message.text && <div className="whitespace-pre-line px-4 py-2.5">{message.text}</div>}
        </div>
      </motion.div>
    );
  }

  if (message.draft) {
    return <DraftCard message={message} onConfirm={onConfirm} onCancel={onCancel} onWrong={onWrong} />;
  }

  if (message.success) {
    return <SuccessBubble success={message.success} />;
  }

  return (
    <motion.div {...bubbleMotion(false)} className="flex items-end justify-start gap-2">
      <Avatar />
      <div className="max-w-[80%] whitespace-pre-line rounded-2xl rounded-bl-md bg-white px-4 py-2.5 text-sm text-[#3C332B] shadow-sm ring-1 ring-black/5">
        {message.text}
      </div>
    </motion.div>
  );
}

// 成功記帳的小卡片:綠色系、頭像換成打勾圖示(不是一般的Sparkles AI頭像),
// 帶上品牌logo+飲料名稱+金額,風格刻意跟一般文字回覆/draft卡片區分開,
// 一眼就能認出「這筆已經成功了」,不用去讀文字內容
function SuccessBubble({ success }: { success: NonNullable<ChatMessage["success"]> }) {
  return (
    <motion.div {...bubbleMotion(false)} className="flex items-center gap-2">
      <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#4E8F5C] shadow-sm">
        <Check className="size-4 text-white" strokeWidth={3} />
      </div>
      <div className="flex items-center gap-2 rounded-full bg-[#EAF4EC] py-2 pl-2 pr-4 ring-1 ring-[#4E8F5C]/20">
        <BrandIcon name={success.brandName} icon={success.brandIcon} size="w-6 h-6" />
        <p className="text-sm text-[#2F5D3A]">
          <span className="font-bold">{success.drinkName}</span> 已記錄・${success.amount}
        </p>
      </div>
    </motion.div>
  );
}

// 金額、日期在這裡用state管理,讓使用者可以自己調整——調整的只是這張卡片當下顯示的值,
// 真正寫進logs是按下確認的那一刻,把這裡的amount/date傳給confirmDraft
function DraftCard({
  message,
  onConfirm,
  onCancel,
  onWrong,
}: {
  message: ChatMessage;
  onConfirm: (message: ChatMessage, amount: number, date: string, note: string) => void;
  onCancel: (message: ChatMessage) => void;
  onWrong: (message: ChatMessage) => void;
}) {
  const draft = message.draft!;
  const [amount, setAmount] = useState(String(draft.amount));
  const [date, setDate] = useState(toDateString(new Date()));
  const [note, setNote] = useState(draft.note);

  const sizeLabel = draft.size === "M" ? "中杯" : draft.size === "L" ? "大杯" : null;
  // 比對到真實選項的加料(有name、price,金額已經算進draft.amount裡了)——
  // 比對不到的加料不會出現在這裡,是被塞進draft.note文字裡,使用者會在下面的備註欄位看到
  const addOnsLabel = draft.addOns.length > 0 ? draft.addOns.map((a) => a.name).join("、") : null;

  // 金額欄的輸入驗證:清空、打非數字、或打0/負數都不合法——
  // 不合法就讓「確認記帳」按鈕disable掉,不讓這種資料寫進Firestore
  const parsedAmount = Number(amount);
  const isAmountValid = amount.trim() !== "" && Number.isFinite(parsedAmount) && parsedAmount > 0;

  return (
    <motion.div {...bubbleMotion(false)} className="flex items-end justify-start gap-2">
      <Avatar />
      <div className="w-64 rounded-2xl bg-white p-3.5 shadow-lg ring-1 ring-black/5">
        {/* 品牌logo+名稱+杯型擠在同一列,不再分開佔一整行 */}
        <div className="flex items-center gap-2">
          <BrandIcon name={draft.brandName} icon={draft.brandIcon} size="w-8 h-8" />
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-[#3C332B]">
              {draft.brandName} {draft.drinkName}
            </p>
            {(sizeLabel || addOnsLabel) && (
              <p className="text-xs text-[#8A7A63]">
                {sizeLabel}
                {sizeLabel && addOnsLabel && "・"}
                {addOnsLabel && `加${addOnsLabel}`}
              </p>
            )}
          </div>
        </div>

        {/* 金額、日期各自佔一排,但label跟輸入框擠在同一個pill裡(不是放在上面另一行)——
            日期改用瀏覽器原生的<input type="date">(不再用DatePicker那個粗邊框彈窗元件) */}
        <div
          className={`mt-2.5 flex items-center gap-2 rounded-xl bg-[#F6F2EA] px-3 py-1.5 ring-1 focus-within:ring-2 focus-within:ring-[#C9732F]/40 ${
            isAmountValid ? "ring-black/5" : "ring-red-400"
          }`}
        >
          <span className="shrink-0 text-xs font-medium text-[#8A7A63]">金額</span>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full bg-transparent text-sm outline-none"
          />
        </div>
        {!isAmountValid && <p className="mt-1 text-xs text-red-500">請輸入大於0的金額</p>}

        <div className="mt-2 flex items-center gap-2 rounded-xl bg-[#F6F2EA] px-3 py-1.5 ring-1 ring-black/5 focus-within:ring-2 focus-within:ring-[#C9732F]/40">
          <span className="shrink-0 text-xs font-medium text-[#8A7A63]">日期</span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full bg-transparent text-sm outline-none"
          />
        </div>

        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="備註:甜度、冰塊..."
          className="mt-2 w-full rounded-xl bg-[#F6F2EA] px-2.5 py-1.5 text-sm outline-none ring-1 ring-black/5 focus:ring-2 focus:ring-[#C9732F]/40"
        />

        <div className="mt-2.5 flex gap-2">
          <button
            onClick={() => onCancel(message)}
            className="flex-1 rounded-full py-1.5 text-xs font-medium text-[#8A7A63] ring-1 ring-black/10 hover:bg-black/[0.03]"
          >
            取消
          </button>
          <button
            onClick={() => onWrong(message)}
            className="flex-1 rounded-full py-1.5 text-xs font-medium text-[#8A7A63] ring-1 ring-black/10 hover:bg-black/[0.03]"
          >
            這不對
          </button>
        </div>
        <button
          onClick={() => onConfirm(message, parsedAmount, date, note)}
          disabled={!isAmountValid}
          className="mt-1.5 w-full rounded-full bg-gradient-to-br from-[#D98A44] to-[#B2612A] py-1.5 text-sm font-bold text-white shadow-md disabled:opacity-40"
        >
          確認記帳
        </button>
      </div>
    </motion.div>
  );
}
