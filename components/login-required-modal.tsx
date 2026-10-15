"use client";
import Link from "next/link";
import { X } from "lucide-react";

export default function LoginRequiredModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="relative bg-white rounded-xl shadow-sm p-6 w-full max-w-xs text-center">
        <button
          onClick={onClose}
          aria-label="關閉"
          className="absolute top-3 right-3 text-[#8A7A63]"
        >
          <X className="w-4 h-4" />
        </button>
        <p className="text-sm text-[#4A3424] mb-4 mt-2">請先登入</p>
        <Link
          href="/login"
          className="inline-block bg-[#C9732F] text-white text-sm px-5 py-2 rounded-full"
        >
          前往登入
        </Link>
      </div>
    </div>
  );
}