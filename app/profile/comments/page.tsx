"use client";
import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, MessageSquare } from "lucide-react";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { useMyComments } from "@/lib/hooks/useMyComments";
import { useBrands } from "@/lib/hooks/useBrands";
import { loadingGuard, errorGuard } from "@/components/async-guard";
import { STICKER_CARD_BASE } from "@/lib/sticker-card";
import BrandIcon from "@/components/brand-icon";
import { getBrandIcon } from "@/lib/history-utils";

const MAIN_CLASS = "w-full min-w-0 max-w-6xl mx-auto px-2.5 py-6 min-h-screen min-[760px]:px-6";

// 跟components/drink/comment-section.tsx、components/brand-menu/brand-comments-list.tsx
// 同一支時間格式,這邊沒有共用檔案可以import,就地放一份就好
function formatRelativeTime(timestamp: number) {
  const diffMs = Date.now() - timestamp;
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "剛剛";
  if (minutes < 60) return `${minutes}分鐘前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}小時前`;
  const days = Math.floor(hours / 24);
  return `${days}天前`;
}

export default function MyCommentsPage() {
  const { user, checkingAuth } = useCurrentUser();
  const router = useRouter();
  const { comments, commentsLoading } = useMyComments(user?.uid ?? null);
  const { brands, brandsLoading, brandsError, retry } = useBrands();

  useEffect(() => {
    if (!checkingAuth && !user) {
      router.push("/login");
    }
  }, [checkingAuth, user, router]);

  // brandSlug/drinkId要換成品牌名稱、飲料名稱才給人看,這裡先建好對照表
  const brandMap = useMemo(() => new Map(brands.map((b) => [b.slug, b])), [brands]);

  if (checkingAuth || !user || commentsLoading || brandsLoading) return loadingGuard(MAIN_CLASS);

  if (brandsError) return errorGuard(MAIN_CLASS, "品牌資料載入失敗", undefined, retry);

  return (
    <main className={MAIN_CLASS}>
      <Link
        href="/profile"
        className="mb-4 inline-flex items-center gap-1.5 rounded-full border-2 border-[#3C332B] bg-[#F6EFE4] px-3.5 py-1.5 text-sm font-bold text-[#4A3424] transition-transform hover:-translate-y-0.5"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        返回個人資料
      </Link>

      <h1 className="mb-4 text-lg font-black text-[#3C332B]">我的留言 ({comments.length})</h1>

      {comments.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border-[3px] border-dashed border-[#3C332B]/30 px-6 py-14 text-center">
          <span className="flex size-12 items-center justify-center rounded-full border-2 border-[#3C332B] bg-[#F6F2EA]">
            <MessageSquare className="size-5 text-[#8A7A63]" strokeWidth={2} aria-hidden />
          </span>
          <p className="text-base font-black text-[#4A3424]">還沒有留言過</p>
          <p className="max-w-xs text-sm text-[#8A7A63]">喝到喜歡(或踩雷)的飲料,去留言分享給大家參考吧。</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {comments.map((c) => {
            const brand = brandMap.get(c.brandSlug);
            const drink = brand?.drinks.find((d) => d.id === c.drinkId);
            return (
              <Link
                key={c.id}
                href={`/brand/${c.brandSlug}/drink/${c.drinkId}`}
                className={`${STICKER_CARD_BASE} flex items-start gap-2.5 p-3.5 transition-transform hover:-translate-y-0.5`}
              >
                {brand && <BrandIcon name={brand.name} icon={getBrandIcon(brand.name, brands)} size="w-8 h-8" />}
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="text-sm font-bold text-[#3C332B]">{brand?.name ?? "未知品牌"}</span>
                    {drink && (
                      <span className="text-xs font-semibold bg-[#A6C285] text-[#3C332B] border border-[#3C332B] px-2 py-0.5 rounded-full">
                        {drink.name}
                      </span>
                    )}
                    <span className="text-xs text-[#9A8B7A]">{formatRelativeTime(c.createdAt)}</span>
                  </div>
                  <p className="mt-1 text-sm text-[#3C332B] break-words">{c.text}</p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}
