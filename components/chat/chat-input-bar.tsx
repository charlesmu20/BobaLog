"use client";
import { useRef } from "react";
import { Send, Camera, X } from "lucide-react";

// 聊天面板最下面的輸入框+送出按鈕。input/onInputChange這組是「controlled input」
// 的標準寫法:文字內容本身還是存在chat-panel.tsx的useState裡,這裡只負責顯示跟
// 把使用者打字/按下送出的事件往上傳,自己不保留任何聊天相關的狀態。
// 圖片也是同一套做法:選完照片後的「待送出照片」狀態(File本身、縮圖網址)
// 都存在chat-panel.tsx,這裡只負責顯示縮圖+觸發選擇/移除
export default function ChatInputBar({
  input,
  onInputChange,
  onSend,
  sending,
  pendingImagePreview,
  onImageSelect,
  onImageClear,
}: {
  input: string;
  onInputChange: (value: string) => void;
  onSend: () => void;
  sending: boolean;
  // 選完照片後的縮圖預覽網址(URL.createObjectURL產生的),還沒選照片是null
  pendingImagePreview: string | null;
  onImageSelect: (file: File) => void;
  onImageClear: () => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  // 文字跟照片至少要有一個才能送出,純文字也可以送(原本的行為),純照片也可以送
  const canSend = !sending && (input.trim() !== "" || !!pendingImagePreview);

  return (
    <div className="bg-white p-3">
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
            className="absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full bg-[#3C332B] text-white shadow cursor-pointer"
          >
            <X className="size-3" />
          </button>
        </div>
      )}
      
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
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={(e) => {
            // isComposing是true代表輸入法還在選字(注音/拼音選字階段),
            // 這時候的Enter是在「確認選字」,不是真的要送出,要排除掉,
            // 不然每次用輸入法打完字按Enter送出,都會變成觸發兩次
            if (e.key === "Enter" && !e.nativeEvent.isComposing) onSend();
          }}
          placeholder={pendingImagePreview ? "想補充什麼嗎?(選填)" : "跟我說你喝了什麼..."}
          className="flex-1 bg-transparent px-2 py-1 text-sm outline-none"
        />
        <button
          onClick={onSend}
          disabled={!canSend}
          className="flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#D98A44] to-[#B2612A] text-white disabled:opacity-40"
        >
          <Send className="size-4" />
        </button>
      </div>
    </div>
  );
}
