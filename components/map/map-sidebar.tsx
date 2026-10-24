"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { Search, SlidersHorizontal, ChevronDown } from "lucide-react";
import type { PlaceResult, MapFilters } from "@/lib/map/mapTypes";
import { STICKER_CARD_BASE } from "@/lib/sticker-card";
import OpenStatusBadge from "@/components/map/open-status-badge";
import { ClearInputButton } from "@/components/ui/clear-input-button";

export default function MapSidebar({
  places,
  selectedId,
  onSelect,
  searchQuery,
  onSearch,
  filters,
  onFiltersChange,
  isOpen,
  onToggle,
}: {
  places: PlaceResult[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  searchQuery: string;
  onSearch: (query: string) => void;
  filters: MapFilters;
  onFiltersChange: (filters: MapFilters) => void;
  // 760px以下只控制「店家清單」這一塊要不要展開,預設收起來;搜尋列不受這個狀態影響,
  // 永遠顯示。760px以上這個狀態完全不影響畫面,清單永遠展開
  isOpen: boolean;
  onToggle: () => void;
}) {
  // inputValue是輸入框自己的文字,每打一個字就會變;searchQuery是「真正送出去搜尋」的字串,
  // 按Enter才會更新。這樣打字不會每個字都打一次Google API,只有清空輸入框會立刻連動
  // (不用等Enter)自動跳回附近店家模式
  const [inputValue, setInputValue] = useState(searchQuery);
  const [filterOpen, setFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);
  const hasActiveFilter = filters.onlyOpen || filters.onlyWithBrand;

  // 點篩選面板以外的地方就自動關閉——監聽整個document的滑鼠按下事件,
  // 點到的地方不在filterRef範圍內才關,只有filterOpen是true時才需要監聽
  useEffect(() => {
    if (!filterOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setFilterOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [filterOpen]);

  return (
    // 清單跟地圖之間的分隔線是這個頁面最主要的結構分界,改成粗黑邊(跟全站其他卡片
    // 邊界同一套語言),裡面比較次要的小分隔線(搜尋列、清單標題下方)維持原本細線就好,
    // 不然整個側欄會塞滿太多條粗黑線,反而雜亂。
    // 760px以下清單疊在地圖上面,所以改成滿寬+底部粗邊線;760px以上才切回原本固定
    // 220px寬+滿高+右側粗邊線。
    // 這個外層面板本身永遠顯示(搜尋列不應該被收起來)——isOpen只決定下面「店家清單」
    // 那一塊要不要展開,所以這裡不再整個用hidden/flex切換
    <div className="flex w-full flex-shrink-0 flex-col bg-white border-b-[3px] border-[#3C332B] min-[760px]:h-full min-[760px]:w-[220px] min-[760px]:border-b-0 min-[760px]:border-r-[3px]">
      {/* 搜尋與篩選表單 */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSearch(inputValue.trim());
        }}
        className="p-3 border-b border-[#E3D8C6] flex items-center gap-1.5"
      >
        <button
          type="submit"
          aria-label="搜尋"
          className="text-[#8A7A63] flex-shrink-0 cursor-pointer hover:text-[#C9732F] transition-colors"
        >
          <Search className="w-3.5 h-3.5" />
        </button>
        <input
          value={inputValue}
          onChange={(e) => {
            const next = e.target.value;
            setInputValue(next);
            if (next.trim() === "") onSearch("");
          }}
          placeholder="搜尋店名(例如:50嵐)"
          className="flex-1 min-w-0 text-xs outline-none placeholder:text-[#C2B9A8] text-[#4A3424]"
        />
        {inputValue && (
          <ClearInputButton
            onClick={() => {
              setInputValue("");
              onSearch("");
            }}
            label="清除搜尋"
            size="sm"
          />
        )}

        {/* 篩選 */}
        <div ref={filterRef} className="relative flex-shrink-0">
          <button
            type="button"
            onClick={() => setFilterOpen((v) => !v)}
            aria-label="篩選"
            className={`flex-shrink-0 cursor-pointer transition-colors ${
              hasActiveFilter ? "text-[#C9732F]" : "text-[#8A7A63] hover:text-[#C9732F]"
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
          </button>
          {/* 篩選彈出面板,跟user-menu下拉選單用同一套STICKER_CARD_BASE,
              不要再是白底+模糊陰影的樣式 */}
          {filterOpen && (
            <div
              className={`absolute right-0 top-6 z-10 w-40 ${STICKER_CARD_BASE} shadow-[4px_4px_0_0_#3C332B] p-2`}
              style={{ transformOrigin: "top right", animation: "infowindow-pop 0.15s ease-out" }}
            >
              <label className="flex items-center gap-2 px-1 py-1.5 text-xs text-[#4A3424] cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.onlyOpen}
                  onChange={(e) => onFiltersChange({ ...filters, onlyOpen: e.target.checked })}
                  className="accent-[#C9732F] cursor-pointer"
                />
                只看營業中
              </label>
              <label className="flex items-center gap-2 px-1 py-1.5 text-xs text-[#4A3424] cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.onlyWithBrand}
                  onChange={(e) => onFiltersChange({ ...filters, onlyWithBrand: e.target.checked })}
                  className="accent-[#C9732F] cursor-pointer"
                />
                只看已收錄品牌
              </label>
            </div>
          )}
        </div>
      </form>
      {/* 手機版:佔滿一整排、文字置中的按鈕(跟SearchAreaButton同一套邊框/陰影樣式),
          展開/收合下面的店家清單——搜尋列已經搬到上面永遠顯示,這裡收合的只是清單本身 */}
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className="mx-3 mt-3 mb-2 flex w-[calc(100%-1.5rem)] items-center justify-center gap-1.5 cursor-pointer rounded-full border-[3px] border-[#3C332B] bg-[#F6F2EA] px-3 py-1.5 text-xs font-medium text-[#4A3424] shadow-[3px_3px_0_0_#3C332B] transition-all hover:bg-[#F6EFE4] hover:shadow-[2px_2px_0_0_#3C332B] hover:translate-x-px hover:translate-y-px min-[760px]:hidden"
      >
        {searchQuery ? `「${searchQuery}」的搜尋結果` : "店家清單"}
        {places.length > 0 && ` (${places.length})`}
        <ChevronDown className={`h-3.5 w-3.5 shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>
      {/* 760px以上清單永遠展開,這裡退回原本單純的文字標題,不需要是按鈕 */}
      <p className="hidden p-3 border-b border-[#E3D8C6] text-xs font-medium text-[#4A3424] min-[760px]:block">
        {searchQuery ? `「${searchQuery}」的搜尋結果` : "附近店家"}
        {places.length > 0 && ` (${places.length})`}
      </p>
      {/* 無結果。min-h-0是關鍵:flex子項目預設min-height是auto(=內容自然高度),
          清單一多,沒有這個就會把外層撐高、內部捲動失效。
          手機版isOpen=false時用hidden整塊收起來;isOpen=true時限制max-h-[180px]
          (超過內部捲動,避免清單展開時把地圖擠到只剩一條縫);760px以上用
          min-[760px]:強制蓋過,永遠展開、填滿剩餘高度,不受isOpen影響 */}
      <div
        className={`${isOpen ? "" : "hidden"} max-h-[180px] overflow-y-auto p-2 min-[760px]:block min-[760px]:max-h-none min-[760px]:flex-1 min-[760px]:min-h-0`}
      >
        {places.length === 0 && (
          <p className="text-xs text-[#8A7A63] px-2 py-3">
            {hasActiveFilter
              ? "沒有符合篩選條件的店家"
              : searchQuery
              ? "附近沒有找到符合的店家"
              : "正在幫你找附近的手搖飲..."}
          </p>
        )}
      {/*  */}
        {places.map((place) => (
          <button
            key={place.id}
            onClick={() => onSelect(place.id)}
            className={`w-full cursor-pointer text-left flex items-center gap-2 p-2 rounded-lg mb-1 transition-colors ${
              selectedId === place.id ? "bg-[#FAEEDA] border-2 border-[#C9732F]" : "hover:bg-[#F6EFE4] border-2 border-transparent"
            }`}
          >
            {place.brand ? (
              <div className="relative w-6 h-6 shrink-0 overflow-hidden rounded-full">
                <Image src={place.brand.icon} alt={place.brand.name} fill sizes="24px" className="object-cover" />
              </div>
            ) : (
              <div className="w-6 h-6 rounded-full bg-[#A8A29E] flex-shrink-0" />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-[#4A3424] truncate">{place.name}</p>
              <div className="flex items-center gap-1.5 text-[10px]">
                <span className="text-[#8A7A63]">{place.distance}m</span>
                <OpenStatusBadge isClosed={place.isClosed} isOpenNow={place.isOpenNow} />
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
