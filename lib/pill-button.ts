// 圓角藥丸形按鈕的共用底樣式(地圖頁的「店家清單」展開按鈕、「搜尋這個區域」按鈕
// 原本是兩份幾乎一模一樣的class字串,只有外層排版相關的部分不一樣)。
// 粗黑邊+米白底+硬陰影,按下去陰影壓縮+位移,hover變深一點。
// margin、寬度、文字對齊方式這些版面相關的class每個地方不一樣,不包含在base裡,
// 各自使用的地方自己接在後面。
export const PILL_BUTTON_BASE =
  "cursor-pointer flex items-center gap-1.5 rounded-full border-[3px] border-[#3C332B] bg-[#F6F2EA] px-3 py-1.5 text-xs font-medium text-[#4A3424] shadow-[3px_3px_0_0_#3C332B] transition-all hover:bg-[#F6EFE4] hover:shadow-[2px_2px_0_0_#3C332B] hover:translate-x-px hover:translate-y-px";
