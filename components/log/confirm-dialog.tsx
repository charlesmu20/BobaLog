import { STICKER_CARD_BASE } from "@/lib/sticker-card";

export default function ConfirmDialog({
  message,
  onCancel,
  onConfirm,
}: {
  message: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className={`${STICKER_CARD_BASE} p-6 w-80 shadow-[6px_6px_0_0_#3C332B] animate-in fade-in zoom-in-95 duration-200`}>
        <p className="text-sm text-[#4A3424] mb-5">{message}</p>
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="rounded-full border-[3px] border-[#3C332B] bg-white px-4 py-1.5 text-xs font-medium text-[#4A3424] cursor-pointer transition-colors hover:bg-[#F6EFE4]"
          >
            取消
          </button>
          <button
            onClick={onConfirm}
            className="rounded-full border-[3px] border-[#3C332B] bg-[#A3372B] px-4 py-1.5 text-xs font-bold text-white cursor-pointer shadow-[2px_2px_0_0_#3C332B] transition-all hover:shadow-[1px_1px_0_0_#3C332B] hover:translate-x-px hover:translate-y-px"
          >
            確定刪除
          </button>
        </div>
      </div>
    </div>
  );
}