// 營業狀態的小圓點+文字徽章,地圖詳情卡片(InfoWindow)跟左側清單共用。
// 故意全部用inline style寫(不用Tailwind className),因為InfoWindow的內容是Google地圖
// 自己接管渲染的區域,用inline style才能保證不管在哪裡用、顏色都一定會生效
const DOT_STYLE = {
  width: 6,
  height: 6,
  borderRadius: 9999,
  display: "inline-block",
  marginRight: 4,
};

const COLORS = {
  closed: "#8A7A63", // 已停業:沿用原本的灰棕色,跟品牌已經在用的muted文字色一致
  open: "#4F9361", // 營業中:帶一點灰調的綠色,跟米色系背景比較搭,不會太跳
  notOpen: "#C2493B", // 休息中:帶一點磚紅的紅色,跟brand accent橘色(#C9732F)區隔開來
};

export default function OpenStatusBadge({
  isClosed,
  isOpenNow,
}: {
  isClosed: boolean;
  isOpenNow: boolean | null;
}) {
  if (isClosed) {
    return (
      <span style={{ display: "inline-flex", alignItems: "center", color: COLORS.closed }}>
        <span style={{ ...DOT_STYLE, backgroundColor: COLORS.closed }} />
        已停業
      </span>
    );
  }

  if (isOpenNow === true) {
    return (
      <span style={{ display: "inline-flex", alignItems: "center", color: COLORS.open }}>
        <span style={{ ...DOT_STYLE, backgroundColor: COLORS.open }} />
        營業中
      </span>
    );
  }

  if (isOpenNow === false) {
    return (
      <span style={{ display: "inline-flex", alignItems: "center", color: COLORS.notOpen }}>
        <span style={{ ...DOT_STYLE, backgroundColor: COLORS.notOpen }} />
        休息中
      </span>
    );
  }

  // Google沒給這家店的營業時間資料,不知道現在開不開,乾脆什麼都不顯示,不要亂猜
  return null;
}
