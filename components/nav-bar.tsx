"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import Image from "next/image";
import NavLinks from "@/components/nav-links";
import UserMenu from "@/components/user-menu";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";

const navItems = [
  { name: "首頁", url: "/" },
  { name: "日誌", url: "/log" },
  { name: "地圖", url: "/map" },
  { name: "收藏", url: "/favorites" },
];

export default function NavBar() {
  const { user, checkingAuth: loading } = useCurrentUser();
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);

  // 捲動超過10px就記成「已捲動」,讓漂浮卡片的陰影變深一點,製造浮起來的感覺
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  if (pathname === "/login") {
    return null;
  }

  return (
    // 外層負責定位:跟首頁 main 一樣用 max-w-6xl mx-auto px-6,讓漂浮卡片的左右邊界
    // 對齊下面的頁面內容,不會因為螢幕變寬就拉得過長;pt-3 則是卡片跟瀏覽器頂端之間的縫隙。
    <div className="sticky top-0 z-40 max-w-6xl mx-auto px-6 pt-3">
      <nav
        className={`bg-white rounded-2xl transition-shadow duration-200 ${
          scrolled ? "shadow-lg" : "shadow-sm"
        }`}
      >
        <div className="flex items-center justify-between px-8 py-4">
          {/* logo 跟分類pill群組用 gap-8 明確拉開距離,不要依賴justify-between自己喬 */}
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center transition-transform hover:scale-105">
              <Image src="/bobalog.png" alt="BobaLog" width={110} height={42} priority />
            </Link>

            <NavLinks items={navItems} />
          </div>

          {/* 固定寬度、靠右對齊:不管顯示轉圈圈、頭像、還是登入按鈕,這塊區域大小都不會變,避免navbar跳動 */}
          <div className="h-9 w-24 flex items-center justify-end">
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : user ? (
              <UserMenu user={user} />
            ) : (
              <Link href="/login">
                <Button className="cursor-pointer">登入</Button>
              </Link>
            )}
          </div>
        </div>
      </nav>
    </div>
  );
}