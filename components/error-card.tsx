import { STICKER_CARD_BASE } from "@/lib/sticker-card";
import { STICKER_BUTTON_BASE } from "@/lib/sticker-button";

// 置中的錯誤卡片+重試按鈕,搭配各頁面自己的資料抓取失敗狀態使用,
export default function ErrorCard({
  title = "資料載入失敗",
  description = "請檢查網路連線後再試一次",
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className={`${STICKER_CARD_BASE} flex flex-col items-center gap-3 px-10 py-8 shadow-[5px_5px_0_0_#3C332B]`}>
        <p className="text-sm font-bold text-[#3C332B]">{title}</p>
        <p className="text-xs text-[#6B5D4F]">{description}</p>
        {/* 像「找不到這個品牌」這種情況重試沒有意義,不傳onRetry就不顯示按鈕 */}
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className={`${STICKER_BUTTON_BASE} mt-1 rounded-xl px-4 py-1.5 text-xs font-bold`}
          >
            重試
          </button>
        )}
      </div>
    </div>
  );
}
