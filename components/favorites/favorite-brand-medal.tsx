"use client";
import { Heart } from "lucide-react";
import Link from "next/link";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import BrandIcon from "@/components/brand-icon";
import { RANK_STYLES } from "@/lib/rank-styles";

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
      // 注意:這個div不能加transition-transform/transition-all這種會動到transform的class!
      // dnd-kit自己用inline style控制transform+transition(拖曳中transition是null讓位移即時跟手,
      // 放開後才給一個動畫值做歸位動畫)。如果這裡的class也想對transform做transition,
      // 瀏覽器會把dnd-kit每一幀更新的transform也套用那個動畫時間,拖曳起來就會變得延遲、黏黏的。
      // hover的放大/陰影效果都改放在下面內層的圓環/連結上,不會跟這裡衝突。
      className={`group flex w-[110px] touch-manipulation select-none flex-col items-center ${
        isEditMode ? "cursor-grab active:cursor-grabbing" : ""
      } ${isDragging ? "z-20 -rotate-2 scale-[1.06]" : ""}`}
    >
      <div className="relative mb-2.5 h-[92px] w-[92px]">
        {/* 外圈裝飾圓環,邊框改成跟全站卡片/按鈕一致的粗黑邊(border-[3px] #3C332B),
            而不是原本那條細細的半透明橘色線,視覺上才跟其他sticker風格的元件統一。
            hover時只有投影浮起,邊框顏色不跟著變(跟其他元件的hover行為一致) */}
        <div
          className={`absolute inset-0 rounded-full border-[3px] border-[#3C332B] bg-[#F6EFE4] transition-all duration-150 ${
            isDragging ? "shadow-[6px_8px_0_0_#3C332B]" : "group-hover:shadow-[3px_4px_0_0_#3C332B]"
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
            className="absolute inset-[6px] block cursor-pointer overflow-hidden rounded-full border-2 border-white shadow-[0_6px_14px_-4px_rgba(201,115,47,0.5)] transition-transform duration-200 group-hover:scale-105"
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
          className="absolute -top-1 -right-1 flex h-[32px] w-[32px] cursor-pointer items-center justify-center rounded-full border border-[#E3D8C6] bg-white transition-transform duration-150 hover:scale-110 active:scale-95"
        >
          <Heart className="h-4 w-4" style={{ color: "#C9732F" }} fill="#C9732F" />
        </button>
      </div>

      {isEditMode ? (
        <span className="text-center text-sm font-medium text-[#4A3424]">{name}</span>
      ) : (
        <Link
          href={`/brand/${slug}`}
          draggable={false}
          className="cursor-pointer text-center text-sm font-medium text-[#4A3424] transition-colors group-hover:text-[#C9732F]"
        >
          {name}
        </Link>
      )}
    </div>
  );
}
