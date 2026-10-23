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
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm font-bold text-[#3C332B] bg-[#F6F2EA] border-[3px] border-[#3C332B] rounded-full px-3.5 py-1.5 mb-6 shadow-[3px_3px_0_0_#3C332B] transition-all hover:bg-[#A6C285] hover:-translate-y-0.5 hover:shadow-[4px_4px_0_0_#3C332B]"
      >
        <ArrowLeft className="w-4 h-4" />
        返回首頁
      </Link>

      <div className="flex items-center gap-3 mb-6">
        {/* 點品牌icon+名稱連回這個品牌的菜單頁(目前就在這一頁,等於重新整理一次) */}
        <Link href={`/brand/${brand.slug}`} className="group flex items-center gap-3">
          <img
            src={brand.icon}
            alt={brand.name}
            className="w-16 h-16 rounded-lg border-[3px] border-[#3C332B] shadow-[3px_3px_0_0_#3C332B] object-cover transition-transform duration-200 group-hover:scale-105"
          />
          <div>
            <div className="text-xl font-black text-[#3C332B] transition-colors group-hover:text-[#A6C285]">{brand.name}</div>
            <div className="text-xs text-[#6B5D4F]">{brand.drinks.length} 款飲品</div>
          </div>
        </Link>
        <button
          onClick={onToggleFavorite}
          className="w-9 h-9 rounded-full bg-[#F6F2EA] border-[3px] border-[#3C332B] flex items-center justify-center flex-shrink-0 ml-1 cursor-pointer transition-transform hover:-translate-y-0.5"
          aria-label="收藏這個品牌"
        >
          <Heart className="w-4 h-4" style={{ color: "#3C332B" }} fill={isFavorite ? "#A6C285" : "none"} />
        </button>
      </div>
    </>
  );
}