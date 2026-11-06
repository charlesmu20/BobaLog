"use client";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";
import type { Brand } from "@/lib/brands";
import { FavoriteHeartButton } from "@/components/ui/favorite-heart-button";
import { ReportButton } from "@/components/ui/report-button";

export default function BrandMenuHeader({
  brand,
  isFavorite,
  favoriteCount,
  onToggleFavorite,
  onReport,
}: {
  brand: Brand;
  isFavorite: boolean;
  favoriteCount: number;
  onToggleFavorite: () => void;
  onReport: () => void;
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

      <div className="flex flex-wrap items-center gap-3 mb-6">
        {/* 品牌icon+名稱,就在這個頁面上,不用連結點自己 */}
        <div className="flex min-w-0 items-center gap-3">
          <div className="relative w-16 h-16 shrink-0 overflow-hidden rounded-lg border-[3px] border-[#3C332B] shadow-[3px_3px_0_0_#3C332B]">
            <Image
              src={brand.icon}
              alt={brand.name}
              fill
              sizes="64px"
              className="object-cover"
            />
          </div>
          <div className="min-w-0">
            <div className="truncate text-xl font-black text-[#3C332B]">{brand.name}</div>
            <div className="text-xs text-[#6B5D4F]">{brand.drinks.length} 款飲品</div>
          </div>
        </div>
        <FavoriteHeartButton
          isFavorited={isFavorite}
          count={favoriteCount}
          onClick={onToggleFavorite}
          ariaLabel={isFavorite ? "取消收藏這個品牌" : "收藏這個品牌"}
          className="ml-1"
        />
        <ReportButton onClick={onReport} label="回報菜單錯誤" />
      </div>
    </>
  );
}