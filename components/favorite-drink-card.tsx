"use client";
import { Heart } from "lucide-react";
import Link from "next/link";
import BrandIcon from "@/components/brand-icon";

export default function FavoriteDrinkCard({
  name,
  brandName,
  brandSlug,
  brandIcon,
  drinkId,
  onToggleFavorite,
}: {
  name: string;
  brandName: string;
  brandSlug: string;
  brandIcon: string;
  drinkId: string;
  onToggleFavorite: () => void;
}) {
  return (
    <div className="bg-white border border-[#E3D8C6] rounded-2xl p-3.5 relative flex items-center gap-3">
      {/* 取消收藏按鈕,獨立於下面的連結之外 */}
      <button
        onClick={onToggleFavorite}
        aria-label="取消收藏"
        className="absolute top-2.5 right-2.5 w-6 h-6 rounded-full bg-white border border-[#E3D8C6] flex items-center justify-center cursor-pointer"
      >
        <Heart className="w-3 h-3" style={{ color: "#C9732F" }} fill="#C9732F" />
      </button>

      {/* 品牌logo當卡片裡最大的視覺元素,點了跳去留言頁 */}
      <Link
        href={`/brand/${brandSlug}/drink/${drinkId}`}
        className="w-14 h-14 rounded-full overflow-hidden border-2 border-[#F6EFE4] shadow-[0_4px_10px_-2px_rgba(201,115,47,0.4)] flex-shrink-0 block"
      >
        <BrandIcon name={brandName} icon={brandIcon} size="w-full h-full" />
      </Link>

      {/* 飲料名稱(主要)+品牌名稱(次要),同樣包成連結 */}
      <Link href={`/brand/${brandSlug}/drink/${drinkId}`} className="min-w-0 pr-5">
        <p className="text-lg text-[#4A3424] font-medium truncate">{name}</p>
        <p className="text-sm text-[#8A7A63] truncate">{brandName}</p>
      </Link>
    </div>
  );
}