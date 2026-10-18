"use client";
import { useState } from "react";
import { User } from "lucide-react";
import type { Comment } from "@/lib/hooks/useComments";
import { Textarea } from "@/components/ui/textarea";

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
      <p className="text-sm font-medium text-[#4A3424] mb-3">留言 ({comments.length})</p>

      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="分享你的想法..."
        className="min-h-[60px] resize-none border-[#E3D8C6] text-sm text-[#4A3424] placeholder:text-[#8A7A63] focus-visible:border-[#C9732F] focus-visible:ring-[#C9732F]/30"
      />
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
      <div className="flex justify-end mt-2">
        <button
          onClick={handleSubmit}
          className="bg-[#C9732F] text-white text-sm px-4 py-1.5 rounded-lg"
        >
          送出
        </button>
      </div>

      <div className="h-px bg-[#E3D8C6] my-4" />

      <div className="flex flex-col gap-4">
        {comments.length === 0 ? (
          <p className="text-xs text-[#8A7A63]">還沒有留言,來留下第一則吧</p>
        ) : (
          comments.map((c) => (
            <div key={c.id} className="flex gap-2.5">
              <div className="w-8 h-8 rounded-full bg-[#F6EFE4] flex items-center justify-center flex-shrink-0">
                <User className="w-4 h-4" style={{ color: "#C9732F" }} />
              </div>
              <div className="min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-medium text-[#4A3424]">{c.displayName}</span>
                  <span className="text-xs text-[#8A7A63]">{formatRelativeTime(c.createdAt)}</span>
                </div>
                <p className="text-sm text-[#4A3424] mt-0.5 break-words">{c.text}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}