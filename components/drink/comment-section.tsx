"use client";
import { useState } from "react";
import { User } from "lucide-react";
import type { Comment } from "@/lib/hooks/useComments";
import { Textarea } from "@/components/ui/textarea";
import { STICKER_BUTTON_BASE } from "@/lib/sticker-button";

const MAX_LENGTH = 200;

// 把timestamp轉成「幾分鐘前/幾小時前/幾天前」這種相對時間文字
function formatRelativeTime(timestamp: number) {
  const diffMs = Date.now() - timestamp;
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "剛剛";
  if (minutes < 60) return `${minutes}分鐘前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}小時前`;
  const days = Math.floor(hours / 24);
  return `${days}天前`;
}

export default function CommentSection({
  comments,
  isLoggedIn,
  onSubmit,
  onRequireLogin,
}: {
  comments: Comment[];
  isLoggedIn: boolean;
  onSubmit: (text: string) => void;
  onRequireLogin: () => void;
}) {
  const [text, setText] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = () => {
    if (!isLoggedIn) {
      onRequireLogin();
      return;
    }
    const trimmed = text.trim();
    if (!trimmed) {
      setError("請先輸入留言內容");
      return;
    }
    if (trimmed.length > MAX_LENGTH) {
      setError(`留言不能超過${MAX_LENGTH}字`);
      return;
    }
    setError("");
    onSubmit(trimmed);
    setText("");
  };

  return (
    <div>
      <p className="text-base font-black text-[#3C332B] mb-3">留言 ({comments.length})</p>

      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="分享你的想法..."
        className="min-h-[60px] resize-none rounded-xl border-[3px] border-[#3C332B] bg-white text-sm text-[#3C332B] shadow-[3px_3px_0_0_#3C332B] transition-shadow placeholder:text-[#9A8B7A] focus-visible:border-[#3C332B] focus-visible:shadow-[4px_4px_0_0_#A6C285] focus-visible:ring-0"
      />
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
      <div className="flex justify-end mt-2.5">
        <button
          onClick={handleSubmit}
          className={`${STICKER_BUTTON_BASE} rounded-xl px-4 py-1.5 text-sm`}
        >
          送出
        </button>
      </div>

      <div className="flex flex-col gap-4 mt-5">
        {comments.length === 0 ? (
          <p className="text-xs text-[#6B5D4F]">還沒有留言,來留下第一則吧</p>
        ) : (
          comments.map((c) => (
            // key用c.id,舊留言不會重新mount、新留言第一次出現時才會播放這個進場動畫,
            // 不會每次有人留言畫面上所有留言就整排一起閃一次
            <div key={c.id} className="flex gap-2.5 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="w-8 h-8 rounded-full border-2 border-[#3C332B] bg-white flex items-center justify-center flex-shrink-0">
                <User className="w-4 h-4" style={{ color: "#3C332B" }} />
              </div>
              <div className="min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-bold text-[#3C332B]">{c.displayName}</span>
                  <span className="text-xs text-[#6B5D4F]">{formatRelativeTime(c.createdAt)}</span>
                </div>
                <p className="text-sm text-[#3C332B] mt-0.5 break-words">{c.text}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}