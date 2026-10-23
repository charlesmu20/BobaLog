"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Lock, Sparkles, Target, Trophy } from "lucide-react";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { useUserBadges } from "@/lib/hooks/useUserBadges";
import { useUserStats } from "@/lib/hooks/useUserStats";
import { BadgeRow } from "@/components/badges/badge-row";
import { BadgeChip } from "@/components/badges/badge-chip";
import { MedalA } from "@/components/badges/medal-a";
import LoadingCard from "@/components/loading-card";
import { STICKER_CARD_BASE } from "@/lib/sticker-card";
import { BADGES, BadgeCategory } from "@/lib/badges";

const MAIN_CLASS = "mx-auto min-h-screen w-full max-w-6xl min-w-0 px-2.5 py-6 min-[760px]:px-6";

// 分類的中文標題,跟lib/badges.ts裡的category欄位一一對應
const CATEGORY_LABELS: Record<BadgeCategory, string> = {
  logging: "飲料紀錄里程碑",
  interaction: "互動/收藏里程碑",
};
const CATEGORIES: BadgeCategory[] = ["logging", "interaction"];

type NextUp = { title: string; description: string; current: number; threshold: number };

// 區塊大標題(已解鎖/未解鎖):貼紙風格的膠囊標籤+右側虛線延伸,matcha綠代表已解鎖、卡其灰代表未解鎖
function SectionHeading({
  id,
  icon,
  label,
  count,
  tone,
}: {
  id: string;
  icon: React.ReactNode;
  label: string;
  count: number;
  tone: "matcha" | "khaki";
}) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <h2
        id={id}
        className={`inline-flex -rotate-1 items-center gap-2 rounded-full border-[3px] border-[#3C332B] py-1.5 pr-2 pl-4 text-lg font-black shadow-[3px_3px_0_0_#3C332B] ${
          tone === "matcha" ? "bg-[#A6C285] text-[#2E4019]" : "bg-[#C7C2B7] text-[#4A3424]"
        }`}
      >
        {icon}
        {label}
        <span className="ml-1 rounded-full bg-[#3C332B] px-2.5 py-0.5 text-sm font-black text-[#F6F2EA] tabular-nums">
          {count}
        </span>
      </h2>
      <span aria-hidden className="flex-1 border-t-[3px] border-dashed border-[#3C332B]/30" />
    </div>
  );
}

// 「未解鎖」底下的分類子標題:比大標題更輕量,用菱形色塊+點狀分隔線
function CategoryHeading({ label, done, total }: { label: string; done: number; total: number }) {
  return (
    <div className="mb-3 flex items-center gap-2.5">
      <span aria-hidden className="size-3 shrink-0 rotate-45 rounded-[3px] border-[3px] border-[#3C332B] bg-[#C9732F]" />
      <h3 className="text-base font-black text-[#4A3424]">{label}</h3>
      <span className="rounded-full border-2 border-[#3C332B] bg-[#E3D8C6] px-2 py-px text-xs font-black text-[#4A3424] tabular-nums">
        {done}/{total}
      </span>
      <span aria-hidden className="flex-1 border-t-2 border-dotted border-[#3C332B]/30" />
    </div>
  );
}

// 最上方總覽卡:大大的「已解鎖 X/9」數字、九宮格進度方塊、下一個目標的迷你進度條
function AchievementSummary({
  unlockedCount,
  totalCount,
  nextUp,
}: {
  unlockedCount: number;
  totalCount: number;
  nextUp: NextUp | null;
}) {
  const percent = Math.round((unlockedCount / totalCount) * 100);
  const allDone = unlockedCount === totalCount;

  return (
    <section aria-label="成就總覽">
      <div className={`overflow-hidden ${STICKER_CARD_BASE} shadow-[6px_6px_0_0_#3C332B]`}>
        <div className="flex items-center justify-between gap-3 bg-[#3C332B] px-4 py-2.5 text-[#F6F2EA]">
          <h1 className="text-base font-black tracking-widest">我的成就</h1>
          <span className="text-[11px] font-bold tracking-[0.2em] text-[#A6C285]">ACHIEVEMENTS</span>
        </div>

        {/* sm以上橫向排列(數字+進度條在左、下一個目標在右),避免整張卡在全寬版面下變成一條空蕩蕩的直條 */}
        <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-stretch sm:gap-6">
          <div className="sm:w-60 sm:shrink-0">
            <p className="flex items-baseline leading-none">
              <span className="text-6xl font-black text-[#4A3424] tabular-nums">{unlockedCount}</span>
              <span className="text-2xl font-black text-[#8A7A63] tabular-nums">/{totalCount}</span>
            </p>
            <p className="mt-2 text-sm font-bold text-[#8A7A63]">已解鎖勳章</p>

            {/* 完成度:跟下面勳章列表的進度條用同一套樣式,不額外做貼紙裝飾 */}
            <div className="mt-4">
              <div
                role="progressbar"
                aria-label="整體完成度"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={percent}
                className="h-3 overflow-hidden rounded-full border-[3px] border-[#3C332B] bg-[#E3D8C6]"
              >
                <div className="h-full bg-[#A6C285]" style={{ width: `${percent}%` }} />
              </div>
              <p className="mt-1.5 text-right text-xs font-bold text-[#8A7A63] tabular-nums">{percent}%</p>
            </div>
          </div>

          {(allDone || nextUp) && (
            <div className="border-t-[3px] border-dashed border-[#3C332B]/30 pt-5 sm:flex-1 sm:border-t-0 sm:border-l-[3px] sm:pt-0 sm:pl-6">
              {allDone ? (
                <p className="flex items-center gap-2 text-sm font-black text-[#4A3424]">
                  <Sparkles className="size-4 text-[#C9732F]" strokeWidth={3} aria-hidden />
                  全部勳章收集完成！
                </p>
              ) : (
                nextUp && (
                  <div>
                    <p className="flex items-center gap-1.5 text-xs font-black tracking-wider text-[#4A3424]">
                      <Target className="size-4 text-[#C9732F]" strokeWidth={3} aria-hidden />
                      下一個目標
                    </p>
                    <div className="mt-1.5 flex items-baseline justify-between gap-2">
                      <p className="text-base font-black text-[#4A3424]">{nextUp.title}</p>
                      <p className="shrink-0 text-sm font-black text-[#4A3424] tabular-nums">
                        {nextUp.current}/{nextUp.threshold}
                      </p>
                    </div>
                    <p className="mt-0.5 text-xs text-[#8A7A63]">{nextUp.description}</p>
                    <div
                      role="progressbar"
                      aria-label={`${nextUp.title}進度`}
                      aria-valuemin={0}
                      aria-valuemax={nextUp.threshold}
                      aria-valuenow={nextUp.current}
                      className="mt-2.5 h-3.5 overflow-hidden rounded-full border-[3px] border-[#3C332B] bg-[#E3D8C6]"
                    >
                      <div
                        className="h-full border-r-[3px] border-[#3C332B] bg-[#C9732F]"
                        style={{ width: `${(nextUp.current / nextUp.threshold) * 100}%` }}
                      />
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export default function BadgesPage() {
  const { user, checkingAuth } = useCurrentUser();
  const router = useRouter();
  // user是null的時候(還沒登入/還在檢查中)就傳null給hook,不要讓uid是undefined
  const { unlockedBadges, badgesLoading } = useUserBadges(user?.uid ?? null);
  const { stats } = useUserStats(user?.uid ?? null);

  // 跟favorites/page.tsx一樣的登入保護:確定沒登入就導去/login
  useEffect(() => {
    if (!checkingAuth && !user) {
      router.push("/login");
    }
  }, [checkingAuth, user, router]);

  // 還在檢查登入狀態、或確定沒登入,畫面先什麼都不顯示
  if (checkingAuth || !user) {
    return null;
  }

  // 勳章清單、統計數字,兩個都抓完才一次顯示整頁,跟首頁同一套邏輯,
  // 不要讓總覽卡、已解鎖、未解鎖分批跳出來
  if (badgesLoading || stats === null) {
    return (
      <main className={MAIN_CLASS}>
        <LoadingCard message="載入成就中..." />
      </main>
    );
  }

  // 已解鎖的,不分類別,整批放在最上面的展示區
  const unlockedList = BADGES.filter((b) => unlockedBadges.has(b.id));
  const unlockedCount = unlockedList.length;
  const totalCount = BADGES.length;
  const lockedCount = totalCount - unlockedCount;

  // 下一個最接近解鎖的勳章:stats抓回來後,從未解鎖的裡面挑完成度最高的一個
  const nextUpCandidate = stats
    ? BADGES.filter((b) => !unlockedBadges.has(b.id))
        .map((b) => ({ badge: b, current: Math.min(stats[b.statKey], b.threshold) }))
        .sort((a, b) => b.current / b.badge.threshold - a.current / a.badge.threshold)[0]
    : undefined;
  const nextUp: NextUp | null = nextUpCandidate
    ? {
        title: nextUpCandidate.badge.title,
        description: nextUpCandidate.badge.description,
        current: nextUpCandidate.current,
        threshold: nextUpCandidate.badge.threshold,
      }
    : null;

  return (
    <main className={MAIN_CLASS}>
      <div className="flex flex-col gap-8">
        {/* 總覽卡:顯示已解鎖數量、下一個目標 */}
        <AchievementSummary
          unlockedCount={unlockedCount}
          totalCount={totalCount}
          nextUp={nextUp}
        />

        {/* 已解鎖:不分類別,小格子陳列在點點紋路的展示櫃背景裡,像戰利品展示 */}
        {unlockedCount > 0 && (
          <section aria-labelledby="unlocked-heading">
            <SectionHeading
              id="unlocked-heading"
              icon={<Trophy className="size-5" strokeWidth={2.75} aria-hidden />}
              label="已解鎖"
              count={unlockedCount}
              tone="matcha"
            />
            <div className="rounded-2xl border-[3px] border-[#3C332B] bg-[#E3D8C6] bg-[radial-gradient(#3C332B26_1.5px,transparent_1.5px)] bg-[length:14px_14px] p-3 shadow-[4px_4px_0_0_#3C332B] sm:p-4">
              <div className="grid grid-cols-2 gap-3 min-[480px]:grid-cols-3 sm:gap-4 lg:grid-cols-4">
                {unlockedList.map((badge) => (
                  <BadgeChip
                    key={badge.id}
                    badge={badge}
                    unlockedAt={unlockedBadges.get(badge.id)!}
                    medal={<MedalA badge={badge} />}
                  />
                ))}
              </div>
            </div>
          </section>
        )}

        {/* 未解鎖:標題樣式跟上面「已解鎖」共用,底下再依分類(logging/interaction)分組 */}
        {unlockedCount < totalCount && (
          <section aria-labelledby="locked-heading">
            <SectionHeading
              id="locked-heading"
              icon={<Lock className="size-5" strokeWidth={2.75} aria-hidden />}
              label="未解鎖"
              count={lockedCount}
              tone="khaki"
            />
            <div className="flex flex-col gap-8">
              {CATEGORIES.map((category) => {
                const inCategory = BADGES.filter((b) => b.category === category);
                const locked = inCategory.filter((b) => !unlockedBadges.has(b.id));
                if (locked.length === 0) return null;
                return (
                  <div key={category}>
                    <CategoryHeading
                      label={CATEGORY_LABELS[category]}
                      done={inCategory.length - locked.length}
                      total={inCategory.length}
                    />
                    <ul className="grid gap-4 md:grid-cols-2">
                      {locked.map((badge) => (
                        <BadgeRow
                          key={badge.id}
                          badge={badge}
                          unlockedAt={undefined}
                          current={stats ? stats[badge.statKey] : null}
                          medal={<MedalA badge={badge} />}
                        />
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
