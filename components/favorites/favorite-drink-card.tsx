"use client";
import { Heart } from "lucide-react";
import Link from "next/link";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import BrandIcon from "@/components/brand-icon";
import { RANK_STYLES } from "@/lib/rank-styles";

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
      // 注意:這個外層div不能加transition-transform/transition-all這種會動到transform的class!
      // dnd-kit自己用inline style控制transform+transition(拖曳中transition是null讓位移即時跟手)。
      // 卡片真正的視覺樣式(邊框/陰影/hover動畫)都搬到下面的內層div,避免跟這裡的transform打架
      className={`touch-manipulation select-none ${isEditMode ? "cursor-grab active:cursor-grabbing" : ""} ${
        isDragging ? "z-20 -rotate-1 scale-[1.04]" : ""
      }`}
    >
      <div
        className={`group relative flex items-center gap-3 rounded-2xl border-[3px] border-[#3C332B] bg-[#F6F2EA] p-3.5 shadow-[4px_4px_0_0_#3C332B] transition-all duration-150 ${
          isDragging
            ? "shadow-[8px_10px_0_0_#3C332B]"
            : "hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0_0_#3C332B] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[2px_2px_0_0_#3C332B]"
        }`}
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
          className="absolute top-2.5 right-2.5 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full border border-[#E3D8C6] bg-white transition-transform duration-150 hover:scale-110 active:scale-95"
        >
          <Heart className="h-3 w-3" style={{ color: "#C9732F" }} fill="#C9732F" />
        </button>

        {/* 品牌logo,點了跳去留言頁。編輯模式中根本不渲染<Link>,換成普通<div>——
            沒有連結元素,瀏覽器就沒有東西可以跳轉,不用依賴preventDefault擋不擋得住 */}
        {isEditMode ? (
          <div className="block h-14 w-14 shrink-0 overflow-hidden rounded-full border-2 border-[#F6EFE4] shadow-[0_4px_10px_-2px_rgba(201,115,47,0.4)]">
            <BrandIcon name={brandName} icon={brandIcon} size="w-full h-full" />
          </div>
        ) : (
          <Link
            href={`/brand/${brandSlug}/drink/${drinkId}`}
            draggable={false}
            className="block h-14 w-14 shrink-0 cursor-pointer overflow-hidden rounded-full border-2 border-[#F6EFE4] shadow-[0_4px_10px_-2px_rgba(201,115,47,0.4)] transition-transform duration-200 group-hover:scale-105"
          >
            <BrandIcon name={brandName} icon={brandIcon} size="w-full h-full" />
          </Link>
        )}

        {/* 飲料名稱(主要)+品牌名稱(次要),同樣包成連結 */}
        {isEditMode ? (
          <div className="min-w-0 pr-5">
            <p className="truncate text-lg font-medium text-[#4A3424]">{name}</p>
            <p className="truncate text-sm text-[#8A7A63]">{brandName}</p>
          </div>
        ) : (
          <Link
            href={`/brand/${brandSlug}/drink/${drinkId}`}
            draggable={false}
            className="min-w-0 cursor-pointer pr-5"
          >
            <p className="truncate text-lg font-medium text-[#4A3424] transition-colors group-hover:text-[#C9732F]">
              {name}
            </p>
            <p className="truncate text-sm text-[#8A7A63]">{brandName}</p>
          </Link>
        )}
      </div>
    </div>
  );
}
