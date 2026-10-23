"use client";
import { use, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useBrand } from "@/lib/hooks/useBrand";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { useRatings } from "@/lib/hooks/useRating";
import { useComments } from "@/lib/hooks/useComments";
import RatingStars, { StaticStars } from "@/components/drink/rating-stars";
import CommentSection from "@/components/drink/comment-section";
import LoginRequiredModal from "@/components/login-required-modal";
import LoadingCard from "@/components/loading-card";
import ErrorCard from "@/components/error-card";

const MAIN_CLASS = "w-full min-w-0 max-w-6xl mx-auto px-2.5 py-6 min-h-screen min-[760px]:px-6";

export default function DrinkCommentPage({
  params,
}: {
  params: Promise<{ slug: string; drinkId: string }>;
}) {
  const { slug, drinkId } = use(params);
  const { brand, brandLoading, brandError, retry } = useBrand(slug);
  const { user } = useCurrentUser();
  // 評分資料跟登入狀態要放在最上面、兩個提早return之前,不然畫面切換時hook呼叫數量會對不上
  const { average, count, myRating, submitRating } = useRatings(slug, drinkId, user?.uid ?? null);
  const { comments, submitComment } = useComments(slug, drinkId, user?.uid ?? null);
  const [showLoginModal, setShowLoginModal] = useState(false);

  if (brandLoading) {
    return (
      <main className={MAIN_CLASS}>
        <LoadingCard />
      </main>
    );
  }

  // 抓取失敗(離線、網路問題等):可以重試
  if (brandError) {
    return (
      <main className={MAIN_CLASS}>
        <ErrorCard title="品牌資料載入失敗" onRetry={retry} />
      </main>
    );
  }

  // 查無此品牌(網址打錯、品牌下架):重試沒有意義,不給重試按鈕
  if (!brand) {
    return (
      <main className={MAIN_CLASS}>
        <ErrorCard title="找不到這個品牌" description="這個品牌可能已經下架或網址有誤" />
      </main>
    );
  }

  const drink = brand.drinks.find((d) => d.id === drinkId);

  if (!drink) {
    return (
      <main className={MAIN_CLASS}>
        <ErrorCard title="找不到這杯飲料" description="這杯飲料可能已經下架或網址有誤" />
      </main>
    );
  }

  const sameSizePrice = drink.prices.M === drink.prices.L;

  // 點星星時執行的函式:沒登入就彈登入視窗、擋下來不送出;有登入才真的呼叫submitRating存進Firestore
  const handleRate = (rating: number) => {
    if (!user) {
      setShowLoginModal(true);
      return;
    }
    submitRating(rating);
  };

  // 送出留言時執行的函式:把目前使用者的名字(沒有就用「匿名」頂著)跟留言內容一起存進去
  const handleSubmitComment = (text: string) => {
    submitComment(user?.displayName ?? "匿名", text);
  };

  return (
    <main className={MAIN_CLASS}>
      {/* 登入提示彈窗,沒登入點星星或送留言時會打開 */}
      <LoginRequiredModal open={showLoginModal} onClose={() => setShowLoginModal(false)} />

      <Link
        href={`/brand/${slug}`}
        className="inline-flex items-center gap-1.5 text-sm font-bold text-[#3C332B] bg-[#F6F2EA] border-[3px] border-[#3C332B] rounded-full px-3.5 py-1.5 mb-6 shadow-[3px_3px_0_0_#3C332B] transition-all hover:bg-[#A6C285] hover:-translate-y-0.5 hover:shadow-[4px_4px_0_0_#3C332B]"
      >
        <ArrowLeft className="w-4 h-4" />
        返回菜單
      </Link>

      {/* 飲料資訊+留言合併成一張卡片,中間用跟「平均評分/你的評分」之間一樣的虛線分隔,
          避免兩張卡各自有一層厚邊框硬陰影疊在一起太重。
          「評分優先」版面(跟v0要的方向C)——左邊品牌(小)+飲料名稱(大)+價格+備註,
          右邊獨立切出一塊計分板(平均評分在上、你的評分在下、中間虛線隔開)。
          品牌icon+名稱原本獨立浮在卡片外面,左欄內容太少導致下方空一大塊,
          所以併進卡片左欄當作飲料名稱上面的小標籤,順便補滿空間 */}
      <section
        aria-label={drink.name}
        className="rounded-2xl border-[3px] border-[#3C332B] bg-[#F6F2EA] p-4 shadow-[4px_4px_0_0_#3C332B] md:p-5"
      >
        <div className="grid gap-4 md:grid-cols-[1fr_15rem] md:gap-5">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <img
                src={brand.icon}
                alt={brand.name}
                className="w-10 h-10 rounded-md border-2 border-[#3C332B] object-cover"
              />
              <span className="text-sm font-bold text-[#6B5D4F]">{brand.name}</span>
            </div>
            <h1 className="text-2xl font-black leading-tight text-[#3C332B]">{drink.name}</h1>
            <ul aria-label="價格" className="flex flex-wrap gap-2">
              {sameSizePrice ? (
                <li className="inline-flex items-baseline gap-1.5 rounded-full border-2 border-[#3C332B] bg-white px-3 py-1 text-sm font-bold text-[#3C332B]">
                  <span className="text-xs font-medium text-[#9A8B7A]">M / L</span>${drink.prices.M}
                </li>
              ) : (
                <>
                  <li className="inline-flex items-baseline gap-1.5 rounded-full border-2 border-[#3C332B] bg-white px-3 py-1 text-sm font-bold text-[#3C332B]">
                    <span className="text-xs font-medium text-[#9A8B7A]">M</span>${drink.prices.M}
                  </li>
                  <li className="inline-flex items-baseline gap-1.5 rounded-full border-2 border-[#3C332B] bg-white px-3 py-1 text-sm font-bold text-[#3C332B]">
                    <span className="text-xs font-medium text-[#9A8B7A]">L</span>${drink.prices.L}
                  </li>
                </>
              )}
            </ul>
            {drink.note && <p className="mt-auto text-sm leading-relaxed text-[#6B5D4F]">{drink.note}</p>}
          </div>

          <aside aria-label="評分" className="flex flex-col gap-2.5 rounded-xl border-2 border-[#3C332B] bg-[#F6EFE4] p-3.5">
            <div className="flex flex-col gap-1">
              <span className="text-xs font-bold tracking-wide text-[#6B5D4F]">平均評分</span>
              {/* 標題列固定h-9高度,「尚無評分」/實際分數兩種狀態共用同一個高度,
                  使用者剛評分時(count從0變1)框框才不會跟著跳動 */}
              {count > 0 ? (
                <div className="flex h-9 items-baseline gap-2">
                  <span className="text-3xl font-black leading-none tabular-nums text-[#3C332B]">{average.toFixed(1)}</span>
                  <span className="text-xs text-[#6B5D4F]">({count}人評分)</span>
                </div>
              ) : (
                <div className="flex h-9 items-center">
                  <span className="text-base font-bold text-[#6B5D4F]">尚無評分</span>
                </div>
              )}
              <StaticStars value={count > 0 ? average : 0} />
            </div>

            <div className="flex flex-col gap-1 border-t-2 border-dashed border-[#3C332B]/30 pt-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold tracking-wide text-[#6B5D4F]">你的評分</span>
                {myRating !== null && (
                  <span className="rounded-full border-2 border-[#3C332B] bg-white px-2 py-0.5 text-xs font-bold text-[#3C332B]">已評分</span>
                )}
              </div>
              <RatingStars myRating={myRating} onRate={handleRate} />
            </div>
          </aside>
        </div>

        <div className="border-t-2 border-dashed border-[#3C332B]/30 my-4 md:my-5" />

        <CommentSection
          comments={comments}
          isLoggedIn={!!user}
          onSubmit={handleSubmitComment}
          onRequireLogin={() => setShowLoginModal(true)}
        />
      </section>
    </main>
  );
}
