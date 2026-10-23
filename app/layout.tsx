import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import NavBar from "@/components/nav-bar";
import Footer from "@/components/footer";
import BadgeUnlockToast from "@/components/badges/badge-unlock-toast";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "BobaLog",
  description: "手搖飲紀錄",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="zh-TW"
      className={`${geistSans.variable} ${geistMono.variable} min-h-full antialiased`}
    >
      {/* 改用CSS Grid(auto/1fr/auto)取代巢狀flex:body > 包一層div > main 這樣兩層auto高度
          疊在一起,瀏覽器不一定能正確把高度一路撐下去給main用height:100%的Google Map——
          這就是地圖頁空白的原因。Grid的1fr中間那格高度是直接算出來的,main不用再包一層div,
          地圖的flex-1/height:100%才吃得到實際的高度。 */}
      <body className="min-h-screen w-full overflow-x-hidden grid grid-rows-[auto_1fr_auto]">
        <NavBar />
        {children}
        <Footer />
        <BadgeUnlockToast />
      </body>
    </html>
  );
}