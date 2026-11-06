"use client";
import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { useLogs } from "@/lib/hooks/useLogs";
import { useUserBadges } from "@/lib/hooks/useUserBadges";
import { useFavorites } from "@/lib/hooks/useFavorites";
import { useMyComments } from "@/lib/hooks/useMyComments";
import { useBrands } from "@/lib/hooks/useBrands";
import { useSuccessToast } from "@/lib/hooks/useSuccessToast";
import { calcStreak } from "@/lib/history-utils";
import { BADGES, type BadgeDefinition } from "@/lib/badges";
import { loadingGuard, errorGuard } from "@/components/async-guard";
import { STICKER_CARD_BASE } from "@/lib/sticker-card";
import ProfileHeader from "@/components/profile/profile-header";
import ProfileStats from "@/components/profile/profile-stats";
import SuccessToast from "@/components/ui/success-toast";

const MAIN_CLASS = "w-full min-w-0 max-w-6xl mx-auto px-2.5 py-6 min-h-screen min-[760px]:px-6";

export default function ProfilePage() {
  const { user, checkingAuth, refreshUser } = useCurrentUser();
  const router = useRouter();
  const { logs } = useLogs(user?.uid ?? null);
  const { unlockedBadges, badgesLoading } = useUserBadges(user?.uid ?? null);
  const { favoriteBrandSlugs, favoriteDrinkIds, favoritesLoading } = useFavorites(user?.uid ?? null);
  const { comments: myComments, commentsLoading } = useMyComments(user?.uid ?? null);
  const { brands, brandsLoading, brandsError, retry } = useBrands();
  // 改名字/換頭貼成功跟失敗都借用同一個toast顯示,不另外做一個錯誤用的樣式——
  // 這兩個操作失敗的機率很低,沒必要為此多做一個元件
  const { toast, showToast } = useSuccessToast();

  useEffect(() => {
    if (!checkingAuth && !user) {
      router.push("/login");
    }
  }, [checkingAuth, user, router]);

  // 累計花費/杯數:不分月份,全部logs加總,跟history-view.tsx本月版本的算法同一套邏輯
  const totalAmount = useMemo(() => logs.reduce((sum, log) => sum + log.amount, 0), [logs]);
  const totalCount = logs.length;
  const streakDays = useMemo(() => calcStreak(logs), [logs]);

  // 最愛品牌(全部時間,只取第一名):依brand分組計數,取count最高的那一個
  const favoriteBrand = useMemo(() => {
    const counts = new Map<string, number>();
    for (const log of logs) counts.set(log.brand, (counts.get(log.brand) ?? 0) + 1);
    let best: { name: string; count: number } | null = null;
    for (const [name, count] of counts) {
      if (!best || count > best.count) best = { name, count };
    }
    return best;
  }, [logs]);

  // 最愛飲料:用「品牌+飲料名」當key分組,避免不同品牌同名飲料被誤算成同一杯
  const favoriteDrink = useMemo(() => {
    const counts = new Map<string, { brand: string; drink: string; count: number }>();
    for (const log of logs) {
      const key = `${log.brand}::${log.drink}`;
      const entry = counts.get(key);
      if (entry) entry.count += 1;
      else counts.set(key, { brand: log.brand, drink: log.drink, count: 1 });
    }
    let best: { brand: string; drink: string; count: number } | null = null;
    for (const entry of counts.values()) {
      if (!best || entry.count > best.count) best = entry;
    }
    return best;
  }, [logs]);

  // 最近解鎖的勳章,依解鎖時間新到舊排序,只取最新2個——疊在「已解鎖勳章」格子的數字旁邊,
  // 放太多個會把那格擠得太寬,跟其他格子高度/寬度對不齊
  const recentBadges: BadgeDefinition[] = useMemo(() => {
    return BADGES.filter((b) => unlockedBadges.has(b.id))
      .sort((a, b) => unlockedBadges.get(b.id)!.getTime() - unlockedBadges.get(a.id)!.getTime())
      .slice(0, 2);
  }, [unlockedBadges]);

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/");
  };

  if (checkingAuth || !user || brandsLoading || badgesLoading || favoritesLoading || commentsLoading) {
    return loadingGuard(MAIN_CLASS);
  }

  if (brandsError) return errorGuard(MAIN_CLASS, "品牌資料載入失敗", undefined, retry);

  return (
    <main className={MAIN_CLASS}>
      {/* 整個頁面就是一張卡:封面式頭貼區(含登出)+資料回顧,不再分兩張卡並排。
          overflow-hidden讓封面的方角不會超出卡片本身的圓角 */}
      <div className={`${STICKER_CARD_BASE} overflow-hidden shadow-[4px_4px_0_0_#3C332B]`}>
        <ProfileHeader user={user} onRefresh={refreshUser} onError={showToast} onSuccess={showToast} onLogout={handleLogout} />

        <div className="px-4 pb-4 pt-5 min-[760px]:px-6 min-[760px]:pb-5">
          <ProfileStats
            totalAmount={totalAmount}
            totalCount={totalCount}
            streakDays={streakDays}
            unlockedBadgeCount={unlockedBadges.size}
            totalBadgeCount={BADGES.length}
            favoriteBrand={favoriteBrand}
            favoriteDrink={favoriteDrink}
            brands={brands}
            recentBadges={recentBadges}
            favoriteBrandCount={favoriteBrandSlugs.length}
            favoriteDrinkCount={favoriteDrinkIds.length}
            commentCount={myComments.length}
          />
        </div>
      </div>

      <SuccessToast message={toast} />
    </main>
  );
}
