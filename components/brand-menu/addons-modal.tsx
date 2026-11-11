"use client";
import { X } from "lucide-react";
import { STICKER_CARD_BASE } from "@/lib/sticker-card";
import type { AddOn } from "@/lib/brands";

// 菜單頁「加料」彈出視窗——純展示用,列出這個品牌可以加購的配料名稱+價格,
// 不是選購用的互動元件(那是log-modal/addon-field.tsx在記帳時用的),
// 跟login-required-modal.tsx同一套視覺語言:粗邊框貼紙卡+淡入放大
export default function AddOnsModal({
  open,
  onClose,
  addOns,
}: {
  open: boolean;
  onClose: () => void;
  addOns: AddOn[];
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`relative ${STICKER_CARD_BASE} w-full max-w-sm p-6 shadow-[6px_6px_0_0_#3C332B] animate-in fade-in zoom-in-95 duration-200`}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="關閉"
          className="absolute right-3 top-3 cursor-pointer text-[#8A7A63] transition-colors hover:text-[#3C332B]"
        >
          <X className="h-4 w-4" />
        </button>
        <h3 className="mb-4 text-base font-bold text-[#3C332B]">加料</h3>
        <ul className="max-h-[60vh] space-y-1 overflow-y-auto">
          {addOns.map((addOn) => (
            <li
              key={addOn.name}
              className="flex items-center justify-between gap-3 rounded-xl border-b border-dashed border-[#D9CFC0] px-1 py-2 last:border-b-0"
            >
              <span className="text-sm text-[#3C332B]">{addOn.name}</span>
              <span className="shrink-0 text-sm font-medium text-[#C9732F]">+${addOn.price}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
