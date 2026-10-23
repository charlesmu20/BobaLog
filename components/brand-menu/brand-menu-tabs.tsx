"use client";
import { useEffect, useRef, useState } from "react";

export default function BrandMenuTabs({
  categories,
  onSelect,
}: {
  categories: string[];
  onSelect: (category: string) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // 判斷目前捲動位置左右兩邊「還有沒有內容」,決定哪一邊要淡出
  const updateScrollState = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateScrollState();
    const resizeObserver = new ResizeObserver(updateScrollState);
    resizeObserver.observe(el);
    el.addEventListener("scroll", updateScrollState);
    return () => {
      resizeObserver.disconnect();
      el.removeEventListener("scroll", updateScrollState);
    };
  }, [categories]);

  // 沒有捲軸也沒有箭頭按鈕時,唯一能提示使用者「這裡還能往左/右滑」的線索,
  // 就是讓那一側的標籤用遮罩淡出(而不是硬生生被切斷),哪邊還有內容哪邊才淡出
  const showMask = canScrollLeft || canScrollRight;
  const leftStop = canScrollLeft ? "transparent, black 20px" : "black";
  const rightStop = canScrollRight ? "black calc(100% - 20px), transparent" : "black";
  const maskImage = `linear-gradient(to right, ${leftStop}, ${rightStop})`;

  return (
    <div
      ref={scrollRef}
      className="flex gap-2 mb-4 overflow-x-auto flex-nowrap [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
      style={showMask ? { WebkitMaskImage: maskImage, maskImage } : undefined}
    >
      {categories.map((category) => (
        <button
          key={category}
          onClick={() => onSelect(category)}
          className="flex-shrink-0 text-xs px-4 py-1.5 rounded-full bg-[#F6F2EA] border-2 border-[#3C332B] text-[#3C332B] transition-colors cursor-pointer hover:bg-[#A6C285] active:bg-[#95B374]"
        >
          {category}
        </button>
      ))}
    </div>
  );
}
