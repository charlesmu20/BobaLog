"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2, Home, NotebookText, MapPin, Heart, Trophy, Menu, X } from "lucide-react";
import Image from "next/image";
import NavLinks from "@/components/nav/nav-links";
import UserMenu from "@/components/nav/user-menu";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { NAV_ICON_BUTTON_BASE } from "@/lib/nav-icon-button";
import { STICKER_BUTTON_BASE } from "@/lib/sticker-button";

const navItems = [
  { name: "首頁", url: "/", icon: Home },
  { name: "日誌", url: "/log", icon: NotebookText },
  { name: "地圖", url: "/map", icon: MapPin },
  { name: "收藏", url: "/favorites", icon: Heart },
  { name: "成就", url: "/badges", icon: Trophy },
];

export default function NavBar() {
  const { user, checkingAuth: loading } = useCurrentUser();
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);

  // 換頁後自動收起手機版選單(render期間比對pathname變化再setState,
  // 不用useEffect,避免觸發多餘的連鎖render)
  const [menuPathname, setMenuPathname] = useState(pathname);
  if (pathname !== menuPathname) {
    setMenuPathname(pathname);
    setMenuOpen(false);
  }

  // 捲動超過10px就記成「已捲動」,讓漂浮卡片的陰影變深一點,製造浮起來的感覺
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // 選單開著的時候,點外面或按Escape就收起來
  useEffect(() => {
    if (!menuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [menuOpen]);

  if (pathname === "/login") {
    return null;
  }

  return (
    // 外層負責定位:跟首頁 main 一樣用 max-w-6xl mx-auto,讓卡片的左右邊界對齊下面的頁面內容。
    // 高度寫死成「nav收合時」的實際高度(border 6px + 內距 + logo 42px 算出來的),
    // nav本身永遠absolute浮在裡面,不管選單開不開,這塊高度都不會變——
    // 這樣選單展開只是視覺上蓋過去,不會推動下面的Hero,也不會有「容器塌下去再補回來」的閃爍風險。
    <div className="sticky top-0 z-40 w-full min-w-0 max-w-6xl mx-auto h-[84px] min-[760px]:h-[92px]">
      <nav
        ref={navRef}
        className={`absolute left-2.5 right-2.5 top-3 overflow-hidden bg-white rounded-2xl border-[3px] border-[#3C332B] transition-shadow duration-200 min-[760px]:left-6 min-[760px]:right-6 ${
          scrolled ? "shadow-[6px_6px_0_0_#3C332B]" : "shadow-[4px_4px_0_0_#3C332B]"
        }`}
      >
        <div className="flex items-center justify-between px-3 py-3 min-[760px]:px-8 min-[760px]:py-4">
          <div className="flex items-center gap-6 min-[760px]:gap-8 min-w-0">
            <Link href="/" className="flex items-center shrink-0 transition-transform hover:scale-105">
              <Image src="/bobalog.png" alt="BobaLog" width={110} height={42} priority className="h-auto w-[110px]" />
            </Link>

            {/* 760px以上:原本的文字+圖示pill;以下交給漢堡選單,不會再擠在一起 */}
            <div className="hidden min-[760px]:block">
              <NavLinks items={navItems} />
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* 漢堡按鈕只在760px以下出現,點了往下展開選單 */}
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label={menuOpen ? "關閉選單" : "開啟選單"}
              aria-expanded={menuOpen}
              className={`${NAV_ICON_BUTTON_BASE} hover:scale-110 hover:shadow-[2px_2px_0_0_#3C332B] min-[760px]:hidden`}
            >
              {menuOpen ? (
                <X className="h-4 w-4 text-[#3C332B]" aria-hidden="true" />
              ) : (
                <Menu className="h-4 w-4 text-[#3C332B]" aria-hidden="true" />
              )}
            </button>

            {/* 760px以上固定寬度避免跳動;760px以下不用留那麼多死空間,靠內容自然寬度貼齊右邊 */}
            <div className="h-9 min-w-9 min-[760px]:w-24 flex items-center justify-end">
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              ) : user ? (
                <UserMenu user={user} />
              ) : (
                <Link href="/login">
                  <Button className={`${STICKER_BUTTON_BASE} rounded-xl h-8 px-2.5 text-xs min-[760px]:h-9 min-[760px]:px-4 min-[760px]:text-sm`}>
                    登入
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* 手機版展開選單:跟nav是同一個元素(靠nav自己的overflow-hidden+rounded-2xl裁切),
            保證無縫,會把下面的Hero推下去;垂直列出4個項目,圖示+完整文字,
            以後加第5個項目也只是這裡多一行 */}
        {menuOpen && (
          <div className="min-[760px]:hidden border-t-[3px] border-[#3C332B]">
            {navItems.map((item) => {
              const isActive = pathname === item.url;
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.url}
                  className={`flex items-center gap-3 px-5 py-3 text-sm font-medium border-b border-[#E3D8C6] last:border-b-0 transition-colors ${
                    isActive ? "bg-[#A6C285] text-[#3C332B]" : "text-[#6B5D4F] hover:bg-[#F6EFE4]"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                  {item.name}
                </Link>
              );
            })}
          </div>
        )}
      </nav>
    </div>
  );
}
