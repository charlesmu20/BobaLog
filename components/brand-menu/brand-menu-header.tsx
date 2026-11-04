"use client";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Heart, Flag } from "lucide-react";
import type { Brand } from "@/lib/brands";

export default function BrandMenuHeader({
  brand,
  isFavorite,
  onToggleFavorite,
  onReport,
}: {
  brand: Brand;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  // 回報這個品牌的菜單有問題(品項/價格/更新),跟收藏愛心放在同一排,
  // 因為使用者發現資料有誤通常就是在看這個品牌的菜單時——跟收藏同一個情境
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
        {/* 點品牌icon+名稱連回這個品牌的菜單頁(目前就在這一頁,等於重新整理一次) */}
        <Link href={`/brand/${brand.slug}`} className="group flex min-w-0 items-center gap-3">
          <div className="relative w-16 h-16 shrink-0 overflow-hidden rounded-lg border-[3px] border-[#3C332B] shadow-[3px_3px_0_0_#3C332B]">
            <Image
              src={brand.icon}
              alt={brand.name}
              fill
              sizes="64px"
              className="object-cover transition-transform duration-200 group-hover:scale-105"
            />
          </div>
          <div className="min-w-0">
            <div className="truncate text-xl font-black text-[#3C332B] transition-colors group-hover:text-[#A6C285]">{brand.name}</div>
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
        {/* 原本只有一個旗子icon,使用者反應看不出來是幹嘛的——改成icon+文字,
            一眼就知道是「回報菜單錯誤」的按鈕 */}
        <button
          onClick={onReport}
          className="h-9 shrink-0 cursor-pointer rounded-full border-[3px] border-[#3C332B] bg-[#F6F2EA] flex items-center gap-1.5 px-3 transition-transform hover:-translate-y-0.5"
        >
          <Flag className="w-4 h-4 shrink-0" style={{ color: "#3C332B" }} />
          <span className="whitespace-nowrap text-xs font-bold text-[#3C332B]">回報菜單錯誤</span>
        </button>
      </div>
    </>
  );
}