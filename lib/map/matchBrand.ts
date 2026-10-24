import type { BrandSummary } from "@/lib/brands";

// 把Google Places抓到的店名(例如「50嵐 台北西門店」)拿去跟Firestore目前最新的品牌清單比對,
// 比對到就回傳品牌資料(可以連去菜單頁),比對不到就回傳null。
//
// 不能要求「店名完整包含品牌全名」:像「UG Tea 樂己」這種中英夾雜的品牌,
// Google地圖上常常只掛簡短招牌(例如「UG忠孝敦化店」),不會把「Tea」「樂己」都寫進去,
// 完整比對永遠不會成功。改成把品牌名稱用空白拆成好幾段(「UG Tea 樂己」→["UG","Tea","樂己"]),
// 店名只要包含其中任一段就算比對成功;排除掉1個字的短段落,避免太容易跟不相干的店家誤判。
// 大部分品牌名稱本來就沒有空白,拆完還是整段沒變,行為跟原本完全一樣
//
// normalize:比對前先轉小寫、去掉常見的裝飾字「の」。
// 英文/中英夾雜品牌在Google地圖上常常大小寫跟我們存的不一樣(例如資料是「Mr.Wish」,
// Google店名顯示「Mr.WISH 希望好茶」),直接比對永遠失敗;另外不少手搖飲品牌習慣用日文的
// 「の」取代「之/的」做裝飾(例如「甘蔗媽媽」Google上常顯示成「甘蔗の媽媽」),
// 兩邊都先去掉の再比對,才抓得到
function normalize(text: string) {
  return text.toLowerCase().replace(/の/g, "");
}

export function matchBrand(placeName: string, brands: BrandSummary[]) {
  const normalizedPlaceName = normalize(placeName);
  return (
    brands.find((b) =>
      b.name
        .split(/\s+/)
        .filter((segment) => segment.length >= 2)
        .some((segment) => normalizedPlaceName.includes(normalize(segment)))
    ) ?? null
  );
}
