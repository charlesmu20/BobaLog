"use client";
import { forwardRef, useRef } from "react";
import { Send, Camera, X } from "lucide-react";

// 聊天面板最下面的輸入框+送出按鈕。input/onInputChange這組是「controlled input」
// 的標準寫法:文字內容本身還是存在chat-panel.tsx的useState裡,這裡只負責顯示跟
// 把使用者打字/按下送出的事件往上傳,自己不保留任何聊天相關的狀態。
// 圖片也是同一套做法:選完照片後的「待送出照片」狀態(File本身、縮圖網址)
// 都存在chat-panel.tsx,這裡只負責顯示縮圖+觸發選擇/移除
//
// 用forwardRef把文字input的DOM節點往外曝露——chat-panel.tsx需要在面板打開時
// 呼叫.focus(),但input本身是這個元件內部的細節,所以用ref轉傳,不是改成
// 這個元件自己去管「要不要focus」(那是chat-panel.tsx的open狀態才知道的事)
const ChatInputBar = forwardRef<HTMLInputElement, {
  input: string;
  onInputChange: (value: string) => void;
  onSend: () => void;
  sending: boolean;
  // 選完照片後的縮圖預覽網址(URL.createObjectURL產生的),還沒選照片是null
  pendingImagePreview: string | null;
  onImageSelect: (file: File) => void;
  onImageClear: () => void;
  // 快捷鍵按鈕用——「我要記帳」「我要推薦飲料」這兩顆,點了直接送出固定文字,
  // 等同使用者自己打字講這句話,不用另外做一套跟sendMessage不一樣的邏輯,後端
  // (routeMessage.ts)看到這種明確的話自然會判斷對邊,記帳那邊資訊不足會自動反問
  // 品牌/飲料,推薦那邊沒給口味也會自動反問想喝的類型,不用前端自己模擬AI的回覆
  onQuickAction: (text: string) => void;
}>(function ChatInputBar(
  {
    input,
    onInputChange,
    onSend,
    sending,
    pendingImagePreview,
    onImageSelect,
    onImageClear,
    onQuickAction,
  },
  ref
) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  // 文字跟照片至少要有一個才能送出,純文字也可以送(原本的行為),純照片也可以送
  const canSend = !sending && (input.trim() !== "" || !!pendingImagePreview);

  return (
    // border-t把這一整塊(快捷鍵+輸入框)跟上面訊息列表區隔開來——訊息區是漸層米色
    // 背景,這裡是純白,原本只靠顏色落差分界,邊界有點模糊,加一條細的分隔線讓
    // 兩個區塊的交界更清楚
    <div className="border-t border-black/10 bg-white p-3">
      {pendingImagePreview && (
        <div className="relative mb-2 inline-block">
          {/* eslint-disable-next-line @next/next/no-img-element -- 這是選完照片當下的本機縮圖預覽
              (URL.createObjectURL產生的blob網址),next/image的優化流程沒辦法處理blob網址 */}
          <img
            src={pendingImagePreview}
            alt="待送出的照片"
            className="h-16 w-16 rounded-xl object-cover ring-1 ring-black/10"
          />
          <button
            type="button"
            onClick={onImageClear}
            aria-label="移除照片"
            className="absolute -right-1.5 -top-1.5 flex size-5 cursor-pointer items-center justify-center rounded-full bg-[#3C332B] text-white shadow transition-colors hover:bg-black"
          >
            <X className="size-3" />
          </button>
        </div>
      )}

      {/* 常駐的快捷鍵,不綁在「訊息是不是空的」這個條件上——隨時都可以點,
          直接開一個新的記帳/推薦對話,不用自己打字講。樣式比照菜單頁的分類標籤
          (brand-menu-tabs.tsx)——粗邊框貼紙風格、靠左排,不是鋪滿整排的大按鈕 */}
      <div className="mb-2 flex gap-2">
        <button
          type="button"
          onClick={() => onQuickAction("我要記帳")}
          disabled={sending}
          className="flex-shrink-0 cursor-pointer rounded-full border-2 border-[#B2612A] px-3 py-1 text-xs font-medium text-[#B2612A] transition-colors hover:bg-[#B2612A]/10 active:bg-[#B2612A]/20 disabled:cursor-not-allowed disabled:opacity-40"
        >
          我要記帳
        </button>
        <button
          type="button"
          onClick={() => onQuickAction("推薦飲料給我")}
          disabled={sending}
          className="flex-shrink-0 cursor-pointer rounded-full border-2 border-[#B2612A] px-3 py-1 text-xs font-medium text-[#B2612A] transition-colors hover:bg-[#B2612A]/10 active:bg-[#B2612A]/20 disabled:cursor-not-allowed disabled:opacity-40"
        >
          推薦飲料給我
        </button>
      </div>

      <div className="flex items-center gap-2 rounded-full bg-[#F6F2EA] px-2 py-1.5 ring-1 ring-black/5 focus-within:ring-2 focus-within:ring-[#C9732F]/40">
        {/* capture="environment"在手機上會優先開後鏡頭相機,桌機瀏覽器會忽略這個屬性,
            直接跳出檔案選擇視窗,兩邊都能正常運作 */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onImageSelect(file);
            // 清空value,不然選同一張照片兩次時onChange不會再觸發
            e.target.value = "";
          }}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          aria-label="上傳照片"
          className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-[#8A7A63] transition-colors hover:bg-black/5 hover:text-[#4A3424]"
        >
          <Camera className="size-4" />
        </button>
        <input
          ref={ref}
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={(e) => {
            // isComposing是true代表輸入法還在選字(注音/拼音選字階段),
            // 這時候的Enter是在「確認選字」,不是真的要送出,要排除掉,
            // 不然每次用輸入法打完字按Enter送出,都會變成觸發兩次
            if (e.key === "Enter" && !e.nativeEvent.isComposing) onSend();
          }}
          placeholder={pendingImagePreview ? "想補充什麼嗎?(選填)" : "記一筆,或找飲料喝,跟我說..."}
          // 字體至少要16px(text-base),不然iOS Safari點輸入框時會自動放大整個畫面
          // (手機瀏覽器的內建行為:輸入框字體小於16px時會幫你zoom in方便看清楚打字)
          className="flex-1 bg-transparent px-2 py-1 text-base outline-none"
        />
        <button
          onClick={onSend}
          disabled={!canSend}
          className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full bg-gradient-to-br from-[#D98A44] to-[#B2612A] text-white transition hover:brightness-110 active:brightness-95 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Send className="size-4" />
        </button>
      </div>
    </div>
  );
});

export default ChatInputBar;
