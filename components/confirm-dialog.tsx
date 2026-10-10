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
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-80">
        <p className="text-sm mb-4">{message}</p>
        <div className="flex justify-end gap-3">
          <button onClick={onCancel} className="text-sm text-gray-500 cursor-pointer">
            取消
          </button>
          <button onClick={onConfirm} className="text-sm text-red-500 cursor-pointer">
            確定刪除
          </button>
        </div>
      </div>
    </div>
  );
}