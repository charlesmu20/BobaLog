"use client";
import { Search } from "lucide-react";
import BrandIcon from "@/components/brand-icon";
import { ClearInputButton } from "@/components/ui/clear-input-button";
import { DropdownPanel, DROPDOWN_ITEM_CLASS } from "@/components/ui/dropdown-panel";
import { useDropdown } from "@/lib/hooks/useDropdown";
import type { Brand, Drink } from "@/lib/brands";
import type { SearchDrink } from "@/lib/hooks/useSearchIndex";

// 飲料搜尋欄位,從log-modal.tsx拆出來。選了品牌就只在該品牌底下的飲料裡找,
// 沒選品牌則改用跨品牌搜尋索引(搜尋結果多了brandSlug/brandName/brandIcon,
// 用"brandSlug" in d判斷是不是跨品牌結果)。開關下拉選單的狀態一樣留在這裡自己管
export default function DrinkField({
  selectedBrand,
  drinkInput,
  drinkOptions,
  placeholder,
  onInputChange,
  onFocus,
  onSelect,
  onSelectCrossBrand,
  onClear,
}: {
  selectedBrand: Brand | null;
  drinkInput: string;
  drinkOptions: (Drink | SearchDrink)[];
  placeholder: string;
  onInputChange: (value: string) => void;
  onFocus: () => void;
  onSelect: (drink: Drink) => void;
  onSelectCrossBrand: (drink: SearchDrink) => void;
  onClear: () => void;
}) {
  const { open, setOpen, handleBlur } = useDropdown();

  return (
    <div className="relative mb-4">
      <label className="text-sm text-[#8A7A63] block mb-1">飲料</label>
      <div className="flex items-center gap-2.5 rounded-2xl border-[3px] border-[#3C332B] bg-[#F6F2EA] px-4 shadow-[4px_4px_0_0_#3C332B] transition-shadow focus-within:shadow-[6px_6px_0_0_#A6C285]">
        <Search className="h-4 w-4 shrink-0 text-[#6B5D4F]" aria-hidden="true" />
        <input
          type="text"
          value={drinkInput}
          onChange={(e) => {
            onInputChange(e.target.value);
            setOpen(true);
          }}
          onFocus={() => {
            setOpen(true);
            onFocus();
          }}
          onBlur={handleBlur}
          placeholder={placeholder}
          className="min-w-0 flex-1 bg-transparent py-3 text-sm font-medium text-[#3C332B] placeholder:text-[#9A8B7A] focus:outline-none"
        />
        {drinkInput && <ClearInputButton onClick={onClear} />}
      </div>
      {open && drinkOptions.length > 0 && (
        <DropdownPanel>
          {drinkOptions.map((d) => {
            const isCrossBrandResult = !selectedBrand && "brandSlug" in d;
            return (
              <div
                key={isCrossBrandResult ? `${(d as SearchDrink).brandSlug}-${(d as SearchDrink).id}` : d.name}
                onMouseDown={() => {
                  if (isCrossBrandResult) onSelectCrossBrand(d as SearchDrink);
                  else onSelect(d);
                  setOpen(false);
                }}
                className={`${DROPDOWN_ITEM_CLASS} flex items-center justify-between gap-2`}
              >
                <span className="truncate">{d.name}</span>
                {isCrossBrandResult ? (
                  <span className="flex shrink-0 items-center gap-1.5 text-xs text-[#8A7A63]">
                    <BrandIcon name={(d as SearchDrink).brandName} icon={(d as SearchDrink).brandIcon} />
                    {(d as SearchDrink).brandName}
                  </span>
                ) : (
                  d.category && <span className="shrink-0 text-xs text-[#8A7A63]">{d.category}</span>
                )}
              </div>
            );
          })}
        </DropdownPanel>
      )}
    </div>
  );
}
