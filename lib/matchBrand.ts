import type { BrandSummary } from "@/lib/brands";

// 把Google Places抓到的店名(例如「50嵐 台北西門店」)拿去跟Firestore目前最新的品牌清單比對,
// 比對到就回傳品牌資料(可以連去菜單頁),比對不到就回傳null。
export function matchBrand(placeName: string, brands: BrandSummary[]) {
  return brands.find((b) => placeName.includes(b.name)) ?? null;
}
