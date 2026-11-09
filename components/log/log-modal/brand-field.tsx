"use client";
import { Search } from "lucide-react";
import BrandIcon from "@/components/brand-icon";
import { ClearInputButton } from "@/components/ui/clear-input-button";
import { DropdownPanel, DROPDOWN_ITEM_CLASS } from "@/components/ui/dropdown-panel";
import { useDropdown } from "@/lib/hooks/useDropdown";
import type { Brand } from "@/lib/brands";

// 品牌搜尋欄位,從log-modal.tsx拆出來。開關下拉選單的狀態(open)完全是這個欄位
// 自己的UI細節,不影響金額/飲料等其他欄位的計算,所以用useDropdown留在這裡自己管,
// 不用再往上丟給log-modal.tsx
export default function BrandField({
  brands,
  brandInput,
  selectedBrand,
  onInputChange,
  onSelect,
  onClear,
}: {
  brands: Brand[];
  brandInput: string;
  selectedBrand: Brand | null;
  onInputChange: (value: string) => void;
  onSelect: (brand: Brand) => void;
  onClear: () => void;
}) {
  const { open, setOpen, handleBlur } = useDropdown();

  const filteredBrands = brands.filter((b) => b.name.includes(brandInput));

  return (
    <div className="relative mb-4">
      <label className="text-sm text-[#8A7A63] block mb-1">品牌</label>
      {/* 跟首頁Hero搜尋框同一套樣式:米白底+粗邊框+硬陰影,focus時陰影變綠色變大。
          選了品牌之後把左邊的搜尋圖示換成品牌icon,沒選的時候維持放大鏡 */}
      <div className="flex items-center gap-2.5 rounded-2xl border-[3px] border-[#3C332B] bg-[#F6F2EA] px-4 shadow-[4px_4px_0_0_#3C332B] transition-shadow focus-within:shadow-[6px_6px_0_0_#A6C285]">
        {selectedBrand ? (
          <BrandIcon name={selectedBrand.name} icon={selectedBrand.icon} size="w-5 h-5" />
        ) : (
          <Search className="h-4 w-4 shrink-0 text-[#6B5D4F]" aria-hidden="true" />
        )}
        <input
          type="text"
          value={brandInput}
          onChange={(e) => {
            onInputChange(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={handleBlur}
          placeholder="輸入或選擇品牌"
          className="min-w-0 flex-1 bg-transparent py-3 text-sm font-medium text-[#3C332B] placeholder:text-[#9A8B7A] focus:outline-none"
        />
        {brandInput && <ClearInputButton onClick={onClear} />}
      </div>
      {open && filteredBrands.length > 0 && (
        <DropdownPanel>
          {filteredBrands.map((b) => (
            <div
              key={b.name}
              onMouseDown={() => {
                onSelect(b);
                setOpen(false);
              }}
              className={`${DROPDOWN_ITEM_CLASS} flex items-center gap-2`}
            >
              <BrandIcon name={b.name} icon={b.icon} />
              <span>{b.name}</span>
            </div>
          ))}
        </DropdownPanel>
      )}
    </div>
  );
}
