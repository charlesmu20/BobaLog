import Link from "next/link";
import BrandIcon from "@/components/brand-icon";
import { getBrandIcon } from "@/lib/history-utils";
import { STICKER_CARD_BASE } from "@/lib/sticker-card";
import type { Brand } from "@/lib/brands";
import type { BadgeDefinition } from "@/lib/badges";
import { MedalA } from "@/components/badges/medal-a";

function StatCell({
  label,
  value,
  href,
  badges,
}: {
  label: string;
  value: string;
  href?: string;
  // 已解鎖勳章那格專用:在數字右邊疊幾個最近解鎖的勳章小圖示,不額外佔一整排版面
  badges?: BadgeDefinition[];
}) {
  const content = (
    <div className="flex-1 px-1 py-1 text-center">
      <div className="flex items-center justify-center gap-1">
        <p className="text-base font-bold text-[#3C332B] whitespace-nowrap min-[760px]:text-lg">{value}</p>
        {badges && badges.length > 0 && (
          <div className="flex shrink-0">
            {badges.map((badge, i) => (
              <div
                key={badge.id}
                className={`h-3.5 w-3.5 shrink-0 rounded-full border border-[#3C332B] bg-white p-0.5 min-[760px]:h-4 min-[760px]:w-4 ${i > 0 ? "-ml-1" : ""}`}
              >
                <MedalA badge={badge} />
              </div>
            ))}
          </div>
        )}
      </div>
      <p className="mt-0.5 text-[10px] text-[#8A7A63] whitespace-nowrap min-[760px]:text-[11px]">{label}</p>
    </div>
  );
  return href ? (
    <Link href={href} className="flex-1 transition-opacity hover:opacity-70">
      {content}
    </Link>
  ) : (
    content
  );
}

export default function ProfileStats({
  totalAmount,
  totalCount,
  streakDays,
  unlockedBadgeCount,
  totalBadgeCount,
  favoriteBrand,
  favoriteDrink,
  brands,
  recentBadges,
  favoriteBrandCount,
  favoriteDrinkCount,
  commentCount,
}: {
  totalAmount: number;
  totalCount: number;
  streakDays: number;
  unlockedBadgeCount: number;
  totalBadgeCount: number;
  favoriteBrand: { name: string; count: number } | null;
  favoriteDrink: { brand: string; drink: string; count: number } | null;
  brands: Brand[];
  recentBadges: BadgeDefinition[];
  favoriteBrandCount: number;
  favoriteDrinkCount: number;
  commentCount: number;
}) {
  return (
    <div>
      {/* 兩排橫條式統計,中間用divide虛線隔開,不是一格一格的卡片——
          跟封面式頭貼區的整體視覺語言搭,比較有雜誌/票根的感覺。
          外層border-y+divide-y:第一排跟第二排共用中間那條分隔線,不會變成兩條線疊在一起 */}
      <div className="divide-y-2 divide-dashed divide-[#3C332B]/25 border-y-2 border-dashed border-[#3C332B]/25">
        <div className="flex divide-x-2 divide-dashed divide-[#3C332B]/25 py-3">
          <StatCell label="累計花費" value={`$${totalAmount}`} />
          <StatCell label="累計杯數" value={`${totalCount} 杯`} />
          <StatCell label="連續記帳" value={`${streakDays} 天`} />
          <StatCell
            label="已解鎖勳章"
            value={`${unlockedBadgeCount}/${totalBadgeCount}`}
            href="/badges"
            badges={recentBadges}
          />
        </div>
        <div className="flex divide-x-2 divide-dashed divide-[#3C332B]/25 py-3">
          <StatCell label="已收藏品牌" value={`${favoriteBrandCount}`} href="/favorites?tab=brand" />
          <StatCell label="已收藏飲料" value={`${favoriteDrinkCount}`} href="/favorites?tab=drink" />
          <StatCell label="我的留言" value={`${commentCount} 則`} href="/profile/comments" />
        </div>
      </div>

      {(favoriteBrand || favoriteDrink) && (
        <div className="mt-3 grid grid-cols-1 gap-2.5 min-[480px]:grid-cols-2">
          {favoriteBrand && (
            <div className={`${STICKER_CARD_BASE} flex items-center gap-2.5 p-3`}>
              <BrandIcon name={favoriteBrand.name} icon={getBrandIcon(favoriteBrand.name, brands)} size="w-8 h-8" />
              <div className="min-w-0">
                <p className="text-[11px] text-[#8A7A63]">最愛品牌</p>
                <p className="truncate text-sm font-bold text-[#3C332B]">
                  {favoriteBrand.name} · {favoriteBrand.count} 次
                </p>
              </div>
            </div>
          )}
          {favoriteDrink && (
            <div className={`${STICKER_CARD_BASE} flex items-center gap-2.5 p-3`}>
              <BrandIcon name={favoriteDrink.brand} icon={getBrandIcon(favoriteDrink.brand, brands)} size="w-8 h-8" />
              <div className="min-w-0">
                <p className="text-[11px] text-[#8A7A63]">最愛飲料</p>
                <p className="truncate text-sm font-bold text-[#3C332B]">
                  {favoriteDrink.brand} · {favoriteDrink.drink} · {favoriteDrink.count} 次
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
