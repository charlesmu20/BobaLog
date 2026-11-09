"use client";
import { X, Check, Plus } from "lucide-react";
import { DropdownPanel, DROPDOWN_ITEM_CLASS } from "@/components/ui/dropdown-panel";
import { useDropdown } from "@/lib/hooks/useDropdown";
import type { AddOn } from "@/lib/brands";

// 加料欄位,從log-modal.tsx拆出來。跟品牌/飲料欄位同一個視覺語言,但這裡是多選,
// 所以用按鈕觸發面板(不是輸入框),收合後用逗號列出已選項目。
// 展開/收合(sectionOpen)跟已選項目(selected)會影響外層金額計算,留在log-modal.tsx;
// 下拉面板開關(open)只是這個欄位自己的UI細節,用useDropdown自己管
export default function AddOnField({
  addOns,
  selected,
  sectionOpen,
  onToggle,
  onOpenSection,
  onCollapseSection,
}: {
  addOns: AddOn[];
  selected: AddOn[];
  sectionOpen: boolean;
  onToggle: (addOn: AddOn) => void;
  onOpenSection: () => void;
  onCollapseSection: () => void;
}) {
  const { open, setOpen, handleBlur } = useDropdown();

  if (addOns.length === 0) return null;

  if (!sectionOpen) {
    return (
      <button
        type="button"
        onClick={onOpenSection}
        className="mb-4 flex items-center gap-1 rounded-full border-2 border-dashed border-[#C9BBA2] px-3 py-1.5 text-xs font-medium text-[#8A7A63] transition-colors cursor-pointer hover:border-[#3C332B] hover:text-[#3C332B]"
      >
        <Plus className="h-3 w-3" />
        加料・選填
      </button>
    );
  }

  const addOnsTotal = selected.reduce((sum, a) => sum + a.price, 0);

  return (
    <div className="relative mb-4">
      <div className="flex items-center gap-1 mb-1">
        <label className="text-sm text-[#8A7A63]">
          加料<span className="text-[#B9AC97]">・選填</span>
        </label>
        <button
          type="button"
          onClick={onCollapseSection}
          aria-label="收合加料欄位"
          className="text-[#8A7A63] cursor-pointer transition-colors hover:text-[#3C332B]"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      {/* 這裡是多選,所以收合後用逗號列出已選項目,不是選完就關起來——行點擊時用onMouseDown
          先preventDefault擋掉按鈕blur,面板才不會選一個就立刻收合,選到滿意再點別的地方關閉 */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        onBlur={handleBlur}
        className="flex w-full items-center justify-between gap-2.5 rounded-2xl border-[3px] border-[#3C332B] bg-[#F6F2EA] px-4 py-3 text-left shadow-[4px_4px_0_0_#3C332B] transition-shadow focus:outline-none focus-visible:shadow-[6px_6px_0_0_#A6C285]"
      >
        <span className={`text-sm font-medium ${selected.length > 0 ? "text-[#3C332B]" : "text-[#9A8B7A]"}`}>
          {selected.length > 0 ? selected.map((a) => a.name).join("、") : "選擇加料(選填)"}
        </span>
        {addOnsTotal > 0 && <span className="shrink-0 text-sm font-medium text-[#C9732F]">+${addOnsTotal}</span>}
      </button>
      {open && (
        <DropdownPanel>
          {addOns.map((addOn) => {
            const checked = selected.some((a) => a.name === addOn.name);
            return (
              <div
                key={addOn.name}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => onToggle(addOn)}
                className={`${DROPDOWN_ITEM_CLASS} flex cursor-pointer items-center justify-between gap-2`}
              >
                <span className="flex items-center gap-2.5">
                  <span
                    className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px] border-2 border-[#3C332B] ${
                      checked ? "bg-[#A6C285]" : "bg-transparent"
                    }`}
                  >
                    {checked && <Check className="h-3 w-3" style={{ color: "#3C332B" }} />}
                  </span>
                  {addOn.name}
                </span>
                <span className="text-xs text-[#8A7A63]">+${addOn.price}</span>
              </div>
            );
          })}
        </DropdownPanel>
      )}
    </div>
  );
}
