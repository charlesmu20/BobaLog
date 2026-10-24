// 收藏頁(品牌勳章+飲料卡片)用的顏色邏輯。
// 依照品牌slug/飲料id算出一個固定的顏色索引,讓每張卡片有自己專屬的顏色,
// 而且不會因為拖曳排序換了名次就跟著變色(如果用rank當索引,拖曳時顏色會一直跳,很奇怪)。
// 顏色都是從網站既有的主題色調整透明度做出粉彩感,不是另外發明新的色票。
export function stableColorIndex(key: string, mod: number): number {
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) % 100000;
  }
  return hash % mod;
}

// 品牌勳章的外圈底色,循環套用。外框統一用粗黑線(跟網站其他貼紙卡一致),
// 只有底色變,不動border顏色
export const FAVORITE_RING_TINTS = [
  "bg-[#A6C285]/30", // 抹茶綠
  "bg-[#C9732F]/25", // 焦糖橘
  "bg-[#E3D8C6]", // 卡其棕
  "bg-[#9A8B7A]/30", // 霧灰棕
];

// 飲料卡片的卡面底色,循環套用。外框一樣維持粗黑線不變
export const FAVORITE_CARD_TINTS = [
  "bg-[#DCE8C8]", // 抹茶綠
  "bg-[#F5D9BE]", // 焦糖橘
  "bg-[#E3D8C6]", // 卡其棕
  "bg-[#DDD5CA]", // 霧灰棕
];

// 第4名以後的名次牌顏色,循環套用(前三名維持獎牌金銀銅的特殊色,不受這個影響)
export const FAVORITE_FALLBACK_RANK_STYLES = [
  "bg-[#A6C285]/60 text-[#2E4019]",
  "bg-[#C9732F]/55 text-white",
  "bg-[#9A8B7A]/55 text-white",
  "bg-[#8A7A63]/55 text-white",
];
