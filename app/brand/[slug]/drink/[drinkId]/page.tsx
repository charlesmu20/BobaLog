"use client";
import { use, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Star } from "lucide-react";
import { useBrand } from "@/lib/hooks/useBrand";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { useRatings } from "@/lib/hooks/useRating";
import RatingStars from "@/components/rating-stars";
import LoginRequiredModal from "@/components/login-required-modal";

export default function DrinkCommentPage({
  params,
}: {
  params: Promise<{ slug: string; drinkId: string }>;
}) {
  const { slug, drinkId } = use(params);
  const { brand, brandLoading } = useBrand(slug);
  const { user } = useCurrentUser();
  // 評分資料跟登入狀態要放在最上面、兩個提早return之前,不然畫面切換時hook呼叫數量會對不上
  const { average, count, myRating, submitRating } = useRatings(slug, drinkId, user?.uid ?? null);
  const [showLoginModal, setShowLoginModal] = useState(false);

  if (brandLoading) {
    return <div>載入中...</div>;
  }

  if (!brand) {
    return <div>找不到這個品牌</div>;
  }

  const drink = brand.drinks.find((d) => d.id === drinkId);

  if (!drink) {
    return <div>找不到這杯飲料</div>;
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

  return (
    <main className="w-full mx-auto px-6 py-6 min-h-screen" style={{ maxWidth: "1152px" }}>
      {/* 登入提示彈窗,沒登入點星星時會打開 */}
      <LoginRequiredModal open={showLoginModal} onClose={() => setShowLoginModal(false)} />

      <Link href={`/brand/${slug}`} className="inline-flex items-center gap-1 text-sm text-[#8A7A63] mb-6">
        <ArrowLeft className="w-4 h-4" />
        返回菜單
      </Link>

      <div className="flex items-center gap-4 mb-4">
        <img
          src={brand.icon}
          alt={brand.name}
          className="w-16 h-16 rounded-lg border-2 border-white shadow-sm object-cover"
        />
        <div className="text-lg font-medium text-[#4A3424]">{brand.name}</div>
      </div>

      <div className="block py-3 px-5 mb-10">
        <div className="flex items-baseline gap-3 flex-wrap mb-1">
          <h1 className="text-xl font-medium text-[#4A3424]">{drink.name}</h1>
          <div className="flex gap-2">
            {sameSizePrice ? (
              <span className="text-sm text-[#8A7A63] bg-[#F6EFE4] px-3 py-1 rounded-full">${drink.prices.M}</span>
            ) : (
              <>
                <span className="text-sm text-[#8A7A63] bg-[#F6EFE4] px-3 py-1 rounded-full">M ${drink.prices.M}</span>
                <span className="text-sm text-[#8A7A63] bg-[#F6EFE4] px-3 py-1 rounded-full">L ${drink.prices.L}</span>
              </>
            )}
          </div>
          {/* 平均分數,接在價格標籤後面同一排;完全沒人評分過就顯示「尚無評分」,不出現0.0這種怪數字 */}
          {count > 0 ? (
            <div className="flex items-center gap-1.5 self-center">
              <Star className="w-4 h-4" style={{ color: "#C9732F" }} fill="#C9732F" />
              <span className="text-sm font-medium text-[#4A3424]">{average.toFixed(1)}</span>
              <span className="text-xs text-[#8A7A63]">({count}人評分)</span>
            </div>
          ) : (
            <span className="text-xs text-[#8A7A63]">尚無評分</span>
          )}
        </div>
        {drink.note && <p className="text-sm text-[#8A7A63]">{drink.note}</p>}

        {/* 分隔線,把上面的飲料資訊跟下面的評分區隔開 */}
        <div className="h-px bg-[#E3D8C6] my-4" />

        {/* 互動星星元件:myRating是我已經存的分數,onRate是點擊後要執行的函式 */}
        <RatingStars myRating={myRating} onRate={handleRate} />
      </div>

      {/* 下一步:留言列表+留言表單 */}
    </main>
  );
}