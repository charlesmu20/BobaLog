// 品牌/飲料/加料下拉選單共用的面板外觀,原本log-modal.tsx裡三組各自複製了
// 一份幾乎一樣的dropdownPanelClass/dropdownScrollClass,抽成共用元件。
// 邊框圓角跟捲動(overflow-y-auto)不能放在同一層——原生捲軸是瀏覽器畫的,
// 不會乖乖沿著rounded-2xl的弧度走,選項一多出現捲軸,右下角圓角會被捲軸截斷看起來像缺角。
// 拆成外層(邊框+圓角+陰影+overflow-hidden負責真的把內容裁成圓角)、
// 內層(只管max-h+捲動),捲軸被包在裁切範圍裡面,就不會戳出圓角外面。
// 呼叫端記得把容器(input所在的那層div)設成relative,這裡才能絕對定位疊在下方
export function DropdownPanel({ children }: { children: React.ReactNode }) {
  return (
    <div className="absolute left-0 right-0 bg-white border-[3px] border-[#3C332B] rounded-2xl shadow-[4px_4px_0_0_#3C332B] mt-1.5 z-10 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
      <div className="max-h-48 overflow-y-auto py-1.5">{children}</div>
    </div>
  );
}

export const DROPDOWN_ITEM_CLASS =
  "px-4 py-2 text-sm cursor-pointer hover:bg-[#F6EFE4] rounded-lg mx-1.5 text-[#4A3424]";
