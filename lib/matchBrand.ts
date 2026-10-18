import type { BrandSummary } from "@/lib/brands";

// 把Google Places抓到的店名(例如「50嵐 台北西門店」)拿去跟Firestore目前最新的品牌清單比對,
// 比對到就回傳品牌資料(可以連去菜單頁),比對不到就回傳null。
// brands要用useBrandSummaries()從Firestore抓,不要用lib/brands.ts那份靜態資料——
// 那份只是當初migration用的種子資料,之後在Firestore新增品牌不會同步回來
export function matchBrand(placeName: string, brands: BrandSummary[]) {
  return brands.find((b) => placeName.includes(b.name)) ?? null;
}
