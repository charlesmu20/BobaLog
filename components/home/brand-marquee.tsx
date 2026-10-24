import Link from "next/link";
import Image from "next/image";
import type { BrandSummary } from "@/lib/brands";

// 雙排跑馬燈,品牌logo一排往左一排往右連續滾動(從v0生成的樣式搬過來),
// 用全部品牌(不是隨機抽幾個),品牌一多也不用curate,滾動自然會全部看到
function MarqueeRow({
  brands,
  reverse,
  duration,
}: {
  brands: BrandSummary[];
  reverse?: boolean;
  duration: string;
}) {
  return (
    <div className="marquee w-full min-w-0 overflow-hidden py-2">
      <div
        className="marquee-track"
        data-reverse={reverse ? "true" : "false"}
        style={{ "--marquee-duration": duration } as React.CSSProperties}
      >
        {/* 畫兩份一樣的清單接在一起,捲動到一半剛好無縫接回開頭;
            第二份aria-hidden+tabIndex=-1,不然螢幕閱讀器/鍵盤tab會重複念兩次 */}
        {[0, 1].map((copy) => (
          <div key={copy} className="flex shrink-0 gap-4 pr-4" aria-hidden={copy === 1 ? true : undefined}>
            {brands.map((brand) => (
              <Link
                key={brand.slug}
                href={`/brand/${brand.slug}`}
                title={brand.name}
                tabIndex={copy === 1 ? -1 : undefined}
                className="relative block h-14 w-14 md:h-16 md:w-16 shrink-0 overflow-hidden rounded-full border-2 border-[#F6F2EA] bg-[#F6F2EA] transition-transform hover:-translate-y-1 hover:scale-110"
              >
                <Image src={brand.icon} alt={copy === 0 ? brand.name : ""} fill sizes="64px" className="object-cover" />
              </Link>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function BrandMarquee({ brands }: { brands: BrandSummary[] }) {
  if (brands.length === 0) return null;
  const reversed = [...brands].reverse();
  return (
    <div className="flex w-full min-w-0 flex-col gap-1">
      <MarqueeRow brands={brands} duration="50s" />
      <MarqueeRow brands={reversed} reverse duration="60s" />
    </div>
  );
}
