"use client";
import { motion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";

type NavItem = { name: string; url: string; icon: LucideIcon };

// 760px以上的桌面版pill:圖示+完整文字橫排。760px以下改用NavBar裡的漢堡選單,
// 不會再出現4個項目擠在一起或字被迫換行的狀況。
export default function NavLinks({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  return (
    <div className="relative flex items-center gap-1 bg-[#F6EFE4] rounded-full p-1">
      {items.map((item) => {
        const isActive = pathname === item.url;
        const Icon = item.icon;
        return (
          <Link
            key={item.name}
            href={item.url}
            className={`relative z-10 flex items-center gap-1.5 whitespace-nowrap px-4 py-1.5 text-sm font-medium rounded-full transition-all duration-150 ${
              isActive ? "" : "hover:bg-white hover:scale-105 hover:shadow-[2px_2px_0_0_#3C332B]"
            }`}
            style={{ color: isActive ? "#3C332B" : "#8A7A63" }}
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
            {item.name}
            {isActive && (
              <motion.div
                layoutId="nav-pill"
                className="absolute inset-0 -z-10 rounded-full bg-[#A6C285] border-2 border-[#3C332B]"
                transition={{ type: "spring", stiffness: 350, damping: 30 }}
              />
            )}
          </Link>
        );
      })}
    </div>
  );
}
