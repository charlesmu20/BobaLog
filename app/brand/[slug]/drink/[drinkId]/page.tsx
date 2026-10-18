"use client";
import { use, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Star } from "lucide-react";
import { useBrand } from "@/lib/hooks/useBrand";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { useRatings } from "@/lib/hooks/useRating";
import { useComments } from "@/lib/hooks/useComments";
import RatingStars from "@/components/rating-stars";
import CommentSection from "@/components/comment-section";
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
  const { comments, submitComment } = useComments(slug, drinkId, user?.uid ?? null);
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

  // 送出留言時執行的函式:把目前使用者的名字(沒有就用「匿名」頂著)跟留言內容一起存進去
  const handleSubmitComment = (text: string) => {
    submitComment(user?.displayName ?? "匿名", text);
  };

  return (
    <main className="w-full mx-auto px-6 py-6 min-h-screen" style={{ maxWidth: "1152px" }}>
      {/* 登入提示彈窗,沒登入點星星或送留言時會打開 */}
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

      {/* 飲料資訊卡片:名稱、價格、平均分數、你的評分全部放同一排,用淺底色+圓角包成一張卡片 */}
      <div className="bg-[#FBF7EF] rounded-2xl px-5 py-4 mb-4">
        <div className="flex items-center gap-3 flex-wrap">
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

          {/* 直立分隔線,隔開「價格」跟「平均分數」 */}
          <div className="w-px h-4 bg-[#E3D8C6]" />

          {/* 平均分數;完全沒人評分過就顯示「尚無評分」,不出現0.0這種怪數字 */}
          {count > 0 ? (
            <div className="flex items-center gap-1.5">
              <Star className="w-4 h-4" style={{ color: "#C9732F" }} fill="#C9732F" />
              <span className="text-sm font-medium text-[#4A3424]">{average.toFixed(1)}</span>
              <span className="text-xs text-[#8A7A63]">({count}人評分)</span>
            </div>
          ) : (
            <span className="text-xs text-[#8A7A63]">尚無評分</span>
          )}

          {/* 直立分隔線,隔開「平均分數」跟「你的評分」 */}
          <div className="w-px h-4 bg-[#E3D8C6]" />

          {/* 互動星星元件:myRating是我已經存的分數,onRate是點擊後要執行的函式。現在直接放在同一排裡,不再獨立一塊 */}
          <RatingStars myRating={myRating} onRate={handleRate} />
        </div>
        {drink.note && <p className="text-sm text-[#8A7A63] mt-2">{drink.note}</p>}
      </div>

      {/* 留言區卡片,跟上面飲料資訊卡片用一樣的底色,兩張卡片靠mb-4的間距隔開 */}
      <div className="bg-[#FBF7EF] rounded-2xl px-5 py-4">
        <CommentSection
          comments={comments}
          isLoggedIn={!!user}
          onSubmit={handleSubmitComment}
          onRequireLogin={() => setShowLoginModal(true)}
        />
      </div>
    </main>
  );
}
