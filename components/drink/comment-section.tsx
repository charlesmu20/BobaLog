"use client";
import { useMemo, useState } from "react";
import { User, Pencil, Trash2 } from "lucide-react";
import type { Comment } from "@/lib/hooks/useComments";
import { Textarea } from "@/components/ui/textarea";
import { STICKER_BUTTON_BASE } from "@/lib/sticker-button";
import ConfirmDialog from "@/components/log/confirm-dialog";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useImagesReady } from "@/lib/hooks/useImagesReady";

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
  commentsError = false,
  isLoggedIn,
  currentUid,
  onSubmit,
  onRequireLogin,
  onEdit,
  onDelete,
}: {
  comments: Comment[];
  commentsError?: boolean;
  isLoggedIn: boolean;
  currentUid: string | null;
  onSubmit: (text: string) => void;
  onRequireLogin: () => void;
  onEdit: (commentId: string, text: string) => void;
  onDelete: (commentId: string) => void;
}) {
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  // 正在編輯哪一則留言(行內切換成textarea),跟哪一則留言正要被刪除(跳確認彈窗)
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // 這批留言的頭貼要等「全部」都預先載入好才一起顯示,不要因為圖片下載
  // 速度不同,各自隨機先後跳出來(哪一個排視覺上面下面無關)
  const photoUrls = useMemo(() => comments.map((c) => c.photoURL), [comments]);
  const avatarsReady = useImagesReady(photoUrls);

  const startEdit = (c: Comment) => {
    setEditingId(c.id);
    setEditText(c.text);
  };

  const saveEdit = () => {
    const trimmed = editText.trim();
    if (!trimmed) return;
    onEdit(editingId as string, trimmed);
    setEditingId(null);
  };

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
        {/* commentsError優先判斷:監聽失敗時comments也會是空陣列,
            不能讓它被誤判成「還沒有留言」這個正常的空狀態 */}
        {commentsError ? (
          <p className="text-xs text-red-500">留言載入失敗,重新整理看看</p>
        ) : comments.length === 0 ? (
          <p className="text-xs text-[#6B5D4F]">還沒有留言,來留下第一則吧</p>
        ) : (
          comments.map((c) => {
            const isMine = currentUid !== null && c.uid === currentUid;
            const isEditing = editingId === c.id;
            return (
              // key用c.id,舊留言不會重新mount、新留言第一次出現時才會播放這個進場動畫,
              // 不會每次有人留言畫面上所有留言就整排一起閃一次
              <div key={c.id} className="flex gap-2.5 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <Avatar className="w-8 h-8 border-2 border-[#3C332B] flex-shrink-0">
                  <AvatarImage src={avatarsReady ? (c.photoURL ?? undefined) : undefined} alt={c.displayName} />
                  <AvatarFallback className="bg-white">
                    <User className="w-4 h-4" style={{ color: "#3C332B" }} />
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-[#3C332B]">{c.displayName}</span>
                    <span className="text-xs text-[#6B5D4F]">{formatRelativeTime(c.createdAt)}</span>
                    {/* 只有自己的留言才看得到編輯/刪除,別人的留言完全不會出現這兩顆按鈕 */}
                    {isMine && !isEditing && (
                      <div className="flex items-center gap-0.5 ml-auto">
                        <button
                          type="button"
                          onClick={() => startEdit(c)}
                          aria-label="編輯留言"
                          className="cursor-pointer rounded-md p-1 text-[#9A8B7A] transition-colors hover:bg-[#F6EFE4] hover:text-[#3C332B]"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingId(c.id)}
                          aria-label="刪除留言"
                          className="cursor-pointer rounded-md p-1 text-[#9A8B7A] transition-colors hover:bg-[#F6EFE4] hover:text-[#A3372B]"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                  {isEditing ? (
                    <div className="mt-1">
                      <Textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        className="min-h-[50px] resize-none rounded-xl border-[3px] border-[#3C332B] bg-white text-sm text-[#3C332B] focus-visible:border-[#3C332B] focus-visible:ring-0"
                      />
                      <div className="flex justify-end gap-2 mt-1.5">
                        <button
                          onClick={() => setEditingId(null)}
                          className="rounded-full border-2 border-[#3C332B] bg-white px-3 py-1 text-xs font-medium text-[#4A3424] cursor-pointer transition-colors hover:bg-[#F6EFE4]"
                        >
                          取消
                        </button>
                        <button
                          onClick={saveEdit}
                          className={`${STICKER_BUTTON_BASE} rounded-full px-3 py-1 text-xs`}
                        >
                          儲存
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-[#3C332B] mt-0.5 break-words">{c.text}</p>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {deletingId && (
        <ConfirmDialog
          message="確定要刪除這則留言嗎?"
          onCancel={() => setDeletingId(null)}
          onConfirm={() => {
            onDelete(deletingId);
            setDeletingId(null);
          }}
        />
      )}
    </div>
  );
}