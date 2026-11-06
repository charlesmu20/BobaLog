"use client";
import { motion } from "framer-motion";

// 菜單/顧客留言的頁籤切換
export default function BrandMenuViewTabs({
  view,
  onChange,
  commentCount,
}: {
  view: "menu" | "comments";
  onChange: (view: "menu" | "comments") => void;
  commentCount: number;
}) {
  const tabs: { key: "menu" | "comments"; label: string }[] = [
    { key: "menu", label: "菜單" },
    { key: "comments", label: `留言 ${commentCount}` },
  ];

  return (
    <div className="px-1 mb-5">
      <div className="flex gap-7 border-b-2 border-[#E3D8C6]">
        {tabs.map((tab) => {
          const isActive = view === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => onChange(tab.key)}
              className={`relative cursor-pointer pb-2.5 text-sm transition-colors ${
                isActive ? "font-bold text-[#3C332B]" : "font-medium text-[#8A7A63] hover:text-[#6B5D4F]"
              }`}
            >
              {tab.label}
              {/* layoutId讓底線在兩個頁籤間切換時用滑動的,不是直接消失再出現,
                  跟nav-links.tsx的active pill是同一招 */}
              {isActive && (
                <motion.div
                  layoutId="comment-tab-underline"
                  className="absolute left-0 right-0 -bottom-0.5 h-[3px] rounded-full bg-[#A6C285]"
                  transition={{ type: "spring", stiffness: 350, damping: 30 }}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
