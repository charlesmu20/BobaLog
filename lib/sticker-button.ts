// 抹茶綠硬陰影CTA按鈕的共用底樣式(NavBar登入按鈕、ErrorCard重試按鈕都是同一套:
// 按下去陰影壓縮+位移,hover變深綠)。尺寸(padding/文字大小/圓角)每個地方不一樣,
// 所以不包含在base裡,各自使用的地方自己接。
export const STICKER_BUTTON_BASE =
  "cursor-pointer bg-[#A6C285] text-[#3C332B] border-[3px] border-[#3C332B] shadow-[3px_3px_0_0_#3C332B] transition-all hover:bg-[#95B374] hover:shadow-[2px_2px_0_0_#3C332B] hover:translate-x-px hover:translate-y-px";
