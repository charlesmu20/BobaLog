// navbar 右側那排圓形圖示按鈕共用的底樣式(漢堡選單按鈕、使用者頭像),
// hover的觸發方式不同(按鈕本身hover / 外層group-hover),所以不包含hover,
// 各自在用的地方自己接對應的hover class。
export const NAV_ICON_BUTTON_BASE =
  "flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border-[3px] border-[#3C332B] bg-[#F6F2EA] transition-transform duration-150";
