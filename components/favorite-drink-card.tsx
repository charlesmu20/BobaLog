"use client";
import { Heart } from "lucide-react";
import Link from "next/link";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import BrandIcon from "@/components/brand-icon";

const RANK_STYLES: Record<number, string> = {
  1: "bg-[#A6C285] text-[#2E4019]",
  2: "bg-[#C9732F] text-white",
  3: "bg-[#E3D8C6] text-[#4A3424]",
};

export default function FavoriteDrinkCard({
  id,
  rank,
  name,
  brandName,
  brandSlug,
  brandIcon,
  drinkId,
  onToggleFavorite,
  isEditMode,
}: {
  id: string;
  rank: number;
  name: string;
  brandName: string;
  brandSlug: string;
  brandIcon: string;
  drinkId: string;
  onToggleFavorite: () => void;
  isEditMode: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled: !isEditMode,
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes}
      {...listeners}
      className={`relative flex touch-manipulation select-none items-center gap-3 rounded-2xl border-[3px] border-[#3C332B] bg-[#F6F2EA] p-3.5 shadow-[4px_4px_0_0_#3C332B] transition-shadow duration-150 ${
        isEditMode ? "cursor-grab active:cursor-grabbing" : ""
      } ${isDragging ? "z-20 scale-[1.04] -rotate-1 shadow-[8px_10px_0_0_#3C332B]" : ""}`}
    >
      {/* 名次牌 */}
      <span
        className={`flex h-6 min-w-6 shrink-0 items-center justify-center rounded-lg border-2 border-[#3C332B] px-1 text-xs font-black tabular-nums ${
          RANK_STYLES[rank] ?? "bg-white text-[#8A7A63]"
        }`}
      >
        {rank}
      </span>

      {/* 取消收藏按鈕,獨立於拖曳之外 */}
      <button
        onClick={onToggleFavorite}
        onPointerDown={(e) => e.stopPropagation()}
        aria-label="取消收藏"
        className="absolute top-2.5 right-2.5 flex h-6 w-6 items-center justify-center rounded-full border border-[#E3D8C6] bg-white"
      >
        <Heart className="h-3 w-3" style={{ color: "#C9732F" }} fill="#C9732F" />
      </button>

      {/* 品牌logo,點了跳去留言頁 */}
      <Link
        href={`/brand/${brandSlug}/drink/${drinkId}`}
        draggable={false}
        onClick={(e) => {
          // 編輯模式中點擊一律不跳轉,只能拖曳
          if (isEditMode) e.preventDefault();
        }}
        className="block h-14 w-14 shrink-0 overflow-hidden rounded-full border-2 border-[#F6EFE4] shadow-[0_4px_10px_-2px_rgba(201,115,47,0.4)]"
      >
        <BrandIcon name={brandName} icon={brandIcon} size="w-full h-full" />
      </Link>

      {/* 飲料名稱(主要)+品牌名稱(次要),同樣包成連結 */}
      <Link
        href={`/brand/${brandSlug}/drink/${drinkId}`}
        draggable={false}
        onClick={(e) => {
          if (isEditMode) e.preventDefault();
        }}
        className="min-w-0 pr-5"
      >
        <p className="truncate text-lg font-medium text-[#4A3424]">{name}</p>
        <p className="truncate text-sm text-[#8A7A63]">{brandName}</p>
      </Link>
    </div>
  );
}
