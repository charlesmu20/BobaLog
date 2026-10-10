"use client";

import { useState, useEffect,useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { onAuthStateChanged, User , signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import Image from "next/image";

export default function NavBar() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  // 監聽使用者登入狀態
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);
  // 登出功能
  const handleLogout = async () => {
    await signOut(auth);
    setMenuOpen(false);
  };

  // 關閉展開選單的功能，當使用者點擊選單外的區域時，會自動關閉選單
  useEffect(() => {                                   
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (pathname === "/login") {
    return null;
  }

  return (
    <nav className="border-b">
      <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center">
          <Image src="/bobalog-logo.png" alt="BobaLog" width={110} height={32} priority />
        </Link>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-6">
            <Link href="/log" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              歷史紀錄
            </Link>
            <Link href="/map" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              地圖
            </Link>
            <Link href="/favorites" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              收藏
            </Link>
          </div>

          <div className="h-5 w-px bg-border" />

          <div className="h-9 w-24 flex items-center justify-center">
          {loading ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : user ? (
            <div className="relative" ref={menuRef}>
              <Button
                variant="outline"
                className="cursor-pointer"
                onClick={() => setMenuOpen((prev) => !prev)}
              >
                {user.displayName || "我的"}
              </Button>
              {menuOpen && (
                <div className="absolute right-0 mt-2 w-32 bg-white border rounded-md shadow-md py-1 z-50">
                  <Link
                    href="/profile"
                    className="block px-4 py-2 text-sm hover:bg-gray-100"
                    onClick={() => setMenuOpen(false)}
                  >
                    個人資料
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="block w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-gray-100"
                  >
                    登出
                  </button>
                </div>
              )}
            </div>
          ) : (
              <Link href="/login">
              <Button className="cursor-pointer">登入</Button>
              </Link>
          )}
          </div>
        </div>
      </div>
    </nav>
  );
}