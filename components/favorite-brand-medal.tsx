"use client";
import { Heart } from "lucide-react";
import Link from "next/link";
import BrandIcon from "@/components/brand-icon";

export default function FavoriteBrandMedal({
  name,
  slug,
  icon,
  onToggleFavorite,
}: {
  name: string;
  slug: string;
  icon: string;
  onToggleFavorite: () => void;
}) {
  return (
    <div className="flex flex-col items-center w-[110px]">
      <div className="relative w-[92px] h-[92px] mb-2.5">
        {/* 外圈裝飾圓環,加上底色讓它像有個「底盤」撐著,不是只有一條線 */}
        <div className="absolute inset-0 rounded-full border-2 border-[#C9732F]/35 bg-[#F6EFE4]" />

        {/* 內圈放品牌logo,點了跳去菜單頁 */}
        <Link
          href={`/brand/${slug}`}
          className="absolute inset-[6px] rounded-full overflow-hidden border-2 border-white shadow-[0_6px_14px_-4px_rgba(201,115,47,0.5)] block"
        >
          <BrandIcon name={name} icon={icon} size="w-full h-full" />
        </Link>

        {/* 取消收藏按鈕,獨立於上面的連結之外 */}
        <button
          onClick={onToggleFavorite}
          aria-label="取消收藏"
          className="absolute -top-1 -right-1 w-[32px] h-[32px] rounded-full bg-white border border-[#E3D8C6] flex items-center justify-center cursor-pointer"
        >
          <Heart className="w-4 h-4" style={{ color: "#C9732F" }} fill="#C9732F" />
        </button>
      </div>

      <Link href={`/brand/${slug}`} className="text-sm text-[#4A3424] font-medium text-center">
        {name}
      </Link>
    </div>
  );
}