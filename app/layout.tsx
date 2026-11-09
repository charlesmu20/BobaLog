import type { Metadata } from "next";
import Script from "next/script";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import NavBar from "@/components/nav/nav-bar";
import Footer from "@/components/footer";
import BadgeUnlockToast from "@/components/badges/badge-unlock-toast";
import ChatPanel from "@/components/chat/chat-panel";
import { CurrentUserProvider } from "@/lib/hooks/useCurrentUser";
import { UserBadgesProvider } from "@/lib/hooks/useUserBadges";

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
        {/* 關掉瀏覽器自己的捲動位置還原:像/badges這種頁面,剛重整時先顯示矮矮的loading卡片,
            瀏覽器想把你「上次捲到的位置」還原回來時,頁面根本還沒那麼高,只能先捲一半,
            等真正內容載入、頁面變高後才又捲一次到真正的位置——變成畫面「跳兩次」,
            而且最後停在上次捲到的地方,不是最上方。用beforeInteractive確保這段比
            React接手、甚至比瀏覽器要還原捲動位置都還早執行,從根本不讓瀏覽器自己亂捲 */}
        <Script id="disable-scroll-restoration" strategy="beforeInteractive">
          {"if ('scrollRestoration' in window.history) { window.history.scrollRestoration = 'manual'; }"}
        </Script>
        {/* CurrentUserProvider本身(跟Context.Provider一樣)不會產生額外的DOM節點,
            所以包在這裡不會打斷body這個CSS Grid跟它底下NavBar/main/Footer的對應關係 */}
        <CurrentUserProvider>
          {/* 要包在CurrentUserProvider底下,因為它內部要靠useCurrentUser()拿uid去訂閱userBadges */}
          <UserBadgesProvider>
            <NavBar />
            {children}
            <Footer />
            <BadgeUnlockToast />
            <ChatPanel />
          </UserBadgesProvider>
        </CurrentUserProvider>
      </body>
    </html>
  );
}