"use client";

import { useState, useRef, useEffect } from "react";
import { Search, X, SlidersHorizontal } from "lucide-react";
import type { PlaceResult, MapFilters } from "@/lib/mapTypes";
import OpenStatusBadge from "@/components/map/open-status-badge";

export default function MapSidebar({
  places,
  selectedId,
  onSelect,
  searchQuery,
  onSearch,
  filters,
  onFiltersChange,
}: {
  places: PlaceResult[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  searchQuery: string;
  onSearch: (query: string) => void;
  filters: MapFilters;
  onFiltersChange: (filters: MapFilters) => void;
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
    <div className="w-[220px] flex-shrink-0 bg-white border-r border-[#E3D8C6] flex flex-col">
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
          <button
            type="button"
            onClick={() => {
              setInputValue("");
              onSearch("");
            }}
            aria-label="清除搜尋"
            className="text-[#8A7A63] flex-shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}

        {/* 篩選:點了跳出小面板,裡面兩個checkbox勾了就即時套用,不用再按確定 */}
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

          {filterOpen && (
            <div
              className="absolute right-0 top-6 z-10 w-40 bg-white rounded-lg shadow-md border border-[#E3D8C6] p-2"
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

      <div className="p-3 border-b border-[#E3D8C6]">
        <p className="text-xs font-medium text-[#4A3424]">
          {searchQuery ? `「${searchQuery}」的搜尋結果` : "附近店家"}
          {places.length > 0 && ` (${places.length})`}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {places.length === 0 && (
          <p className="text-xs text-[#8A7A63] px-2 py-3">
            {hasActiveFilter
              ? "沒有符合篩選條件的店家"
              : searchQuery
              ? "附近沒有找到符合的店家"
              : "正在幫你找附近的手搖飲..."}
          </p>
        )}

        {places.map((place) => (
          <button
            key={place.id}
            onClick={() => onSelect(place.id)}
            className={`w-full text-left flex items-center gap-2 p-2 rounded-lg mb-1 transition-colors ${
              selectedId === place.id ? "bg-[#FAEEDA] border border-[#C9732F]" : "hover:bg-[#F6EFE4] border border-transparent"
            }`}
          >
            {place.brand ? (
              <img src={place.brand.icon} alt={place.brand.name} className="w-6 h-6 rounded-full object-cover flex-shrink-0" />
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
