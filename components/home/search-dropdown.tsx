import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import type { AlgoliaBrandHit, AlgoliaDrinkHit } from "@/lib/hooks/useAlgoliaSearch";
import { STICKER_CARD_BASE } from "@/lib/sticker-card";

//把搜尋到的關鍵字標綠色
function highlightMatch(text: string, term: string) {
  if (!term) return text;
  const index = text.indexOf(term);
  if (index === -1) return text;
  return (
    <>
      {text.slice(0, index)}
      <mark className="bg-[#A6C285] text-[#3C332B] rounded-sm px-0.5">{text.slice(index, index + term.length)}</mark>
      {text.slice(index + term.length)}
    </>
  );
}

export default function SearchDropdown({
  term,
  matchedBrands,
  matchedDrinks,
  searching,
  searchError,
}: {
  term: string;
  matchedBrands: AlgoliaBrandHit[];
  matchedDrinks: AlgoliaDrinkHit[];
  searching: boolean;
  searchError: boolean;
}) {

  if (!term) {
    return (
      <div className={`${STICKER_CARD_BASE} absolute top-full mt-3 w-full shadow-[6px_6px_0_0_#3C332B] overflow-hidden z-30`}>
        <div className="px-5 py-6 text-center text-sm font-medium text-[#6B5D4F]">輸入品牌或飲料名稱開始搜尋</div>
      </div>
    );
  }

  const hasResults = matchedBrands.length > 0 || matchedDrinks.length > 0;

  return (
    <div className={`${STICKER_CARD_BASE} absolute top-full mt-3 w-full shadow-[6px_6px_0_0_#3C332B] overflow-hidden z-30`}>
      <div className="max-h-[60vh] overflow-y-auto py-2">
      {/* 優先順序:searching(還在查) > searchError(查詢失敗) > 真的查無結果,
          避免還沒查完或查失敗時,被誤會成「查完了但真的沒有這個品牌或飲料」 */}
      {!hasResults && searching && (
        <div className="px-5 py-6 text-center text-sm font-medium text-[#6B5D4F]">搜尋中...</div>
      )}
      {!hasResults && !searching && searchError && (
        <div className="px-5 py-6 text-center text-sm font-medium text-[#6B5D4F]">搜尋發生錯誤,請稍後再試</div>
      )}
      {!hasResults && !searching && !searchError && (
        <div className="px-5 py-6 text-center text-sm font-medium text-[#6B5D4F]">找不到相關品牌或飲料</div>
      )}
        {/* 品牌結果區塊 */}
      {matchedBrands.length > 0 && (
        <div>
          <div className="px-5 pb-1 pt-3 text-sm font-bold text-[#6B5D4F]">品牌</div>
          {matchedBrands.map((b) => (
            <Link
              key={b.slug}
              href={`/brand/${b.slug}`}
              className="flex items-center gap-3 px-5 py-2.5 transition-colors hover:bg-[#A6C285] hover:text-[#3C332B] group"
            >
              <div className="relative w-10 h-10 shrink-0 overflow-hidden rounded-full border-2 border-[#3C332B]">
                <Image src={b.icon} alt={b.name} fill sizes="40px" className="object-cover" />
              </div>
              <span className="text-base font-bold text-[#3C332B] flex-1 truncate">{highlightMatch(b.name, term)}</span>
              <ArrowUpRight className="w-5 h-5 text-[#6B5D4F] shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>
          ))}
        </div>
      )}

      {/* 飲料結果區塊 */}
      {matchedDrinks.length > 0 && (
        <div>
          <div className="px-5 pb-1 pt-3 text-sm font-bold text-[#6B5D4F]">飲料</div>
          {matchedDrinks.map((d) => (
            <Link
              key={d.id}
              href={`/brand/${d.brandSlug}/drink/${d.id}`}
              className="flex items-center gap-3 px-5 py-2.5 transition-colors hover:bg-[#A6C285] hover:text-[#3C332B] group"
            >
              <div className="relative w-10 h-10 shrink-0 overflow-hidden rounded-full border-2 border-[#3C332B]">
                <Image src={d.brandIcon} alt="" fill sizes="40px" className="object-cover" />
              </div>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-base font-bold text-[#3C332B]">{highlightMatch(d.name, term)}</span>
                <span className="block truncate text-sm text-[#6B5D4F]">{d.brandName}</span>
              </span>
              <ArrowUpRight className="w-5 h-5 text-[#6B5D4F] shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>
          ))}
        </div>
      )}
      </div>
    </div>
  );
}
