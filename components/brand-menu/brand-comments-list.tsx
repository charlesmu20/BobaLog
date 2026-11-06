"use client";
import Link from "next/link";
import { User } from "lucide-react";
import type { BrandComment } from "@/lib/hooks/useBrandComments";
import type { Drink } from "@/lib/brands";
import { STICKER_CARD_BASE } from "@/lib/sticker-card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

// 跟components/drink/comment-section.tsx裡那支一樣的時間格式,這邊沒有共用檔案可以import,
// 就地放一份就好,不用為了一個小function特地抽出去一個新檔案
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

export default function BrandCommentsList({
  brandSlug,
  comments,
  drinks,
}: {
  brandSlug: string;
  comments: BrandComment[];
  drinks: Drink[];
}) {
  // comments只存drinkId,畫面要顯示的是飲料名稱,所以查一下對照表
  const drinkNameById = new Map(drinks.map((d) => [d.id, d.name]));

  if (comments.length === 0) {
    return <p className="text-sm text-[#6B5D4F] py-6 text-center">這個品牌還沒有任何留言</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {comments.map((c) => {
        const drinkName = drinkNameById.get(c.drinkId);
        return (
          <div key={c.id} className={`${STICKER_CARD_BASE} p-3.5`}>
            <div className="flex items-start gap-2.5">
              <Avatar className="w-8 h-8 border-2 border-[#3C332B] flex-shrink-0">
                <AvatarImage src={c.photoURL ?? undefined} alt={c.displayName} />
                <AvatarFallback className="bg-white">
                  <User className="w-4 h-4" style={{ color: "#3C332B" }} />
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="text-sm font-bold text-[#3C332B]">{c.displayName}</span>
                  <span className="text-xs text-[#9A8B7A]">{formatRelativeTime(c.createdAt)}</span>
                  {/* 查無品牌本身的飲料資料就不顯示標籤(例如飲料後來被下架了),不讓畫面出現undefined */}
                  {drinkName && (
                    <Link
                      href={`/brand/${brandSlug}/drink/${c.drinkId}`}
                      className="text-xs font-semibold bg-[#A6C285] text-[#3C332B] border border-[#3C332B] px-2 py-0.5 rounded-full hover:bg-[#95B374] transition-colors"
                    >
                      {drinkName}
                    </Link>
                  )}
                </div>
                <p className="text-sm text-[#3C332B] mt-1 break-words">{c.text}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
