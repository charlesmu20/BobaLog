"use client";
import { X } from "lucide-react";

export function ClearInputButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8A7A63]/40 cursor-pointer"
    >
      <X className="w-4 h-4" />
    </button>
  );
}