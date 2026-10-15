import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { SearchBrand, SearchDrink } from "@/lib/hooks/useSearchIndex";

//把搜尋到的關鍵字標橘色
function highlightMatch(text: string, term: string) {
  if (!term) return text;
  const index = text.indexOf(term);
  if (index === -1) return text;
  return (
    <>
      {text.slice(0, index)}
      <span className="text-[#C9732F] font-medium">{text.slice(index, index + term.length)}</span>
      {text.slice(index + term.length)}
    </>
  );
}

export default function SearchDropdown({
  term,
  matchedBrands,
  matchedDrinks,
}: {
  term: string;
  matchedBrands: SearchBrand[];
  matchedDrinks: SearchDrink[];
}) {

  if (!term) {
    return (
      <div className="absolute top-full mt-1 w-full bg-white border border-[#E3D8C6] rounded-xl shadow-sm overflow-hidden z-50">
        <div className="px-4 py-6 text-center text-sm text-[#8A7A63]">輸入品牌或飲料名稱開始搜尋</div>
      </div>
    );
  }

  const hasResults = matchedBrands.length > 0 || matchedDrinks.length > 0;

  return (
    <div className="absolute top-full mt-1 w-full bg-white border border-[#E3D8C6] rounded-xl shadow-sm overflow-hidden z-50">
      <div className="max-h-[360px] overflow-y-auto py-2">
      {!hasResults && (
        <div className="px-4 py-6 text-center text-sm text-[#8A7A63]">找不到相關品牌或飲料</div>
      )}
        {/* 品牌結果區塊 */}
      {matchedBrands.length > 0 && (
        <div>
          {/* 品牌 */}     
          <div className="flex items-center gap-1.5 px-4 pt-3 pb-1">
            <div className="w-[3px] h-3 bg-[#C9732F] rounded-full" />
            <span className="text-xs text-[#8A7A63]">品牌</span>
          </div>
          {/* 結果 */}   
          {matchedBrands.map((b) => (
            <Link
              key={b.slug}
              href={`/brand/${b.slug}`}
              className="flex items-center gap-3 px-4 py-2 hover:bg-[#F6EFE4]"
            >

              {/* 品牌圖示 */}
              <img src={b.icon} alt={b.name} className="w-7 h-7 rounded-full object-cover border border-[#E3D8C6]" />
              {/* 品牌名稱 */}
              <span className="text-sm text-[#4A3424]">{highlightMatch(b.name, term)}</span>

            </Link>
          ))}
        </div>
      )}
      {/* 品牌與飲料的分隔線 */}
      {matchedBrands.length > 0 && matchedDrinks.length > 0 && (
        <div className="border-t border-dashed border-[#E3D8C6] mx-4" />
      )}

      {/* 飲料結果區塊 */}
      {matchedDrinks.length > 0 && (
        <div>
          {/* 飲料 */} 
          <div className="flex items-center gap-1.5 px-4 pt-3 pb-1">
            <div className="w-[3px] h-3 bg-[#C9732F] rounded-full" />
            <span className="text-xs text-[#8A7A63]">飲料</span>
          </div>
          {/* 結果 */}
          {matchedDrinks.map((d) => (
            <Link
              key={d.id}
              href={`/brand/${d.brandSlug}/drink/${d.id}`}
              className="flex items-center justify-between gap-2 px-4 py-2 hover:bg-[#F6EFE4]"
            >

              <div className="flex items-center gap-2 min-w-0">
                {/* 飲料名稱 */}
                <span className="text-sm text-[#4A3424] truncate">{highlightMatch(d.name, term)}</span>
                {/* 飲料名稱右邊的 品牌與小圖示 */}
                <span className="inline-flex items-center gap-1 text-xs text-[#8A7A63] bg-[#F6EFE4] pl-1 pr-2 py-0.5 rounded-full flex-shrink-0">
                    <img src={d.brandIcon} alt="" className="w-3.5 h-3.5 rounded-full object-cover" />
                    {d.brandName}
                </span>

              </div>
              {/* 最右方箭頭 */}
              <ChevronRight className="w-4 h-4 text-[#D3C9B8] flex-shrink-0" />
            </Link>
          ))}
        </div>
      )}
      </div>
    </div>
  );
}