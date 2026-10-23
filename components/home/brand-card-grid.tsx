import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { BrandSummary } from "@/lib/brands";
import { STICKER_CARD_BASE } from "@/lib/sticker-card";

// 這版是直接把v0生成的卡片樣式搬過來的:厚邊框+硬陰影的貼紙卡,
// hover時卡片往左上浮起、陰影變大且變成強調色,按下去陰影會壓縮回去。
// 整張卡片本身就是連結(不用再點一下才展開選單),所以原本的openBrand展開/
// 點外面關閉那套useState+useRef+useEffect邏輯都拿掉了,元件變成不需要state的簡單版。
export default function BrandCardGrid({ brands }: { brands: BrandSummary[] }) {
  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <h2 className="text-2xl md:text-3xl font-black tracking-tight text-[#3C332B]">所有品牌</h2>
        <span className="rounded-full border-[3px] border-[#3C332B] bg-[#A6C285] px-3 py-1 text-xs font-bold text-[#3C332B]">
          {brands.length} 個品牌
        </span>
      </div>

      <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5 md:grid-cols-4 lg:grid-cols-5">
        {brands.map((brand, i) => (
          <li key={brand.slug} className="rise" style={{ animationDelay: `${Math.min(i, 14) * 0.04}s` }}>
            <Link
              href={`/brand/${brand.slug}`}
              className={`${STICKER_CARD_BASE} group flex h-full flex-col overflow-hidden shadow-[5px_5px_0_0_#3C332B] transition-all duration-200 hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[9px_9px_0_0_#A6C285] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[2px_2px_0_0_#3C332B]`}
            >
              <div className="flex flex-1 flex-col items-center gap-2.5 px-3 pb-4 pt-6">
                <img
                  src={brand.icon}
                  alt={brand.name}
                  className="h-16 w-16 rounded-full border-[3px] border-[#3C332B] object-cover transition-transform duration-300 group-hover:rotate-[8deg] group-hover:scale-110"
                />
                <div className="text-center">
                  <div className="text-sm font-black leading-tight text-[#3C332B]">{brand.name}</div>
                  <div className="mt-0.5 text-xs font-medium text-[#6B5D4F]">{brand.drinkCount} 款飲品</div>
                </div>
              </div>
              <div className="flex items-center justify-between border-t-[3px] border-[#3C332B] bg-[#3C332B] px-3 py-2 text-xs font-bold text-[#F6F2EA] transition-colors group-hover:bg-[#A6C285] group-hover:text-[#3C332B]">
                瀏覽菜單
                <ArrowUpRight
                  className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                  aria-hidden="true"
                />
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
