"use client";
import { Heart } from "lucide-react";
import Link from "next/link";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import BrandIcon from "@/components/brand-icon";

// 前三名用主題強調色,第4名以後統一米白,不然顏色會太花
const RANK_STYLES: Record<number, string> = {
  1: "bg-[#A6C285] text-[#2E4019]",
  2: "bg-[#C9732F] text-white",
  3: "bg-[#E3D8C6] text-[#4A3424]",
};

export default function FavoriteBrandMedal({
  id,
  rank,
  name,
  slug,
  icon,
  onToggleFavorite,
  isEditMode,
}: {
  id: string;
  rank: number;
  name: string;
  slug: string;
  icon: string;
  onToggleFavorite: () => void;
  isEditMode: boolean;
}) {
  // dnd-kit的排序hook:setNodeRef要接到最外層、attributes+listeners決定「按在哪裡可以拖」,
  // transform/transition是放開後其他項目滑動讓位的動畫。
  // disabled跟著isEditMode:不是編輯模式的時候,卡片完全不會進入拖曳狀態,單純就是連結
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
      className={`flex w-[110px] touch-manipulation select-none flex-col items-center ${
        isEditMode ? "cursor-grab active:cursor-grabbing" : ""
      } ${isDragging ? "z-20 -rotate-2 scale-[1.06]" : ""}`}
    >
      <div className="relative mb-2.5 h-[92px] w-[92px]">
        {/* 外圈裝飾圓環,加上底色讓它像有個「底盤」撐著,不是只有一條線 */}
        <div
          className={`absolute inset-0 rounded-full border-2 border-[#C9732F]/35 bg-[#F6EFE4] transition-shadow duration-150 ${
            isDragging ? "shadow-[6px_8px_0_0_#3C332B]" : ""
          }`}
        />

        {/* 內圈放品牌logo。編輯模式中根本不渲染<Link>,換成普通<div>——
            沒有連結元素,瀏覽器就沒有東西可以跳轉,不用依賴preventDefault擋不擋得住 */}
        {isEditMode ? (
          <div className="absolute inset-[6px] block overflow-hidden rounded-full border-2 border-white shadow-[0_6px_14px_-4px_rgba(201,115,47,0.5)]">
            <BrandIcon name={name} icon={icon} size="w-full h-full" />
          </div>
        ) : (
          <Link
            href={`/brand/${slug}`}
            draggable={false}
            className="absolute inset-[6px] block overflow-hidden rounded-full border-2 border-white shadow-[0_6px_14px_-4px_rgba(201,115,47,0.5)]"
          >
            <BrandIcon name={name} icon={icon} size="w-full h-full" />
          </Link>
        )}

        {/* 名次牌,左上角,前三名有強調色 */}
        <span
          className={`absolute -top-1.5 -left-1.5 flex h-6 min-w-6 items-center justify-center rounded-lg border-2 border-[#3C332B] px-1 text-xs font-black tabular-nums ${
            RANK_STYLES[rank] ?? "bg-[#F6F2EA] text-[#8A7A63]"
          }`}
        >
          {rank}
        </span>

        {/* 取消收藏按鈕,獨立於拖曳跟上面的連結之外(stopPropagation讓按下去時不會被當成拖曳的起手式) */}
        <button
          onClick={onToggleFavorite}
          onPointerDown={(e) => e.stopPropagation()}
          aria-label="取消收藏"
          className="absolute -top-1 -right-1 flex h-[32px] w-[32px] items-center justify-center rounded-full border border-[#E3D8C6] bg-white"
        >
          <Heart className="h-4 w-4" style={{ color: "#C9732F" }} fill="#C9732F" />
        </button>
      </div>

      {isEditMode ? (
        <span className="text-center text-sm font-medium text-[#4A3424]">{name}</span>
      ) : (
        <Link href={`/brand/${slug}`} draggable={false} className="text-center text-sm font-medium text-[#4A3424]">
          {name}
        </Link>
      )}
    </div>
  );
}
