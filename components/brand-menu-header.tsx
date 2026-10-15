"use client";
import Link from "next/link";
import { ArrowLeft, Heart } from "lucide-react";
import type { Brand } from "@/lib/brands";

export default function BrandMenuHeader({
  brand,
  isFavorite,
  onToggleFavorite,
}: {
  brand: Brand;
  isFavorite: boolean;
  onToggleFavorite: () => void;
}) {
  return (
    <>
      <Link href="/" className="inline-flex items-center gap-1 text-sm text-[#8A7A63] mb-6">
        <ArrowLeft className="w-4 h-4" />
        返回首頁
      </Link>

      <div className="flex items-center gap-3 mb-6">
        <img
          src={brand.icon}
          alt={brand.name}
          className="w-16 h-16 rounded-lg border-2 border-white shadow-sm object-cover"
        />
        <div>
          <div className="text-xl font-medium text-[#4A3424]">{brand.name}</div>
          <div className="text-xs text-[#8A7A63]">{brand.drinks.length} 款飲品</div>
        </div>
        <button
          onClick={onToggleFavorite}
          className="w-9 h-9 rounded-full bg-white border border-[#E3D8C6] flex items-center justify-center flex-shrink-0 ml-1"
          aria-label="收藏這個品牌"
        >
          <Heart className="w-4 h-4" style={{ color: "#C9732F" }} fill={isFavorite ? "#C9732F" : "none"} />
        </button>
      </div>
    </>
  );
}