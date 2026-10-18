"use client";
import { motion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = { name: string; url: string };

export default function NavLinks({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  return (
    <div className="relative flex items-center gap-1 bg-[#F6EFE4] rounded-full p-1">
      {items.map((item) => {
        const isActive = pathname === item.url;
        return (
          <Link
            key={item.name}
            href={item.url}
            className="relative z-10 px-4 py-1.5 text-sm font-medium rounded-full transition-colors"
            style={{ color: isActive ? "#FFFFFF" : "#8A7A63" }}
          >
            {item.name}
            {isActive && (
              <motion.div
                layoutId="nav-pill"
                className="absolute inset-0 -z-10 rounded-full bg-primary"
                transition={{ type: "spring", stiffness: 350, damping: 30 }}
              >
                {/* 模糊的發光底層 */}
                <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-8 h-2 bg-primary/50 rounded-full blur-sm" />
                {/* 實心的燈條本體 */}
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-5 h-[3px] bg-primary rounded-full" />
              </motion.div>
            )}
          </Link>
        );
      })}
    </div>
  );
}