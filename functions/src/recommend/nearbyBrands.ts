// 「推薦飲料」功能專用:找出使用者附近有哪些我們認識的品牌。
// 把places.ts(打Google API)、placeBrandMatch.ts(比對品牌)這兩支底層工具串起來,
// 決定「這次到底要在哪些品牌裡找候選」。
//
// 邏輯簡化成兩階段,不做放大半徑/分頁那層(討論過:Places API單次呼叫的結果數有上限,
// 撞到上限時放大半徑也沒用,因為回傳的還是同一批「最近的N家」,所以直接跳過這層):
// 查一次2.5公里範圍,有比對到品牌就用;一個都比對不到,就直接不限距離、查整個資料庫。
//
// Google的locationBias是軟性偏好,不保證回傳結果一定在2公里內——但這裡不像地圖頁
// 需要精確距離去畫「300公尺」這種標籤給使用者看,只是要抓「大概在附近」的品牌當候選,
// 所以不另外自己再算一次真實距離過濾,直接信任Google排序後的結果就好

import type { Firestore } from "firebase-admin/firestore";
import { searchNearbyBobaShops } from "./places";
import { matchPlaceToBrand } from "./placeBrandMatch";
import type { CatalogBrand } from "../catalog";

const NEARBY_RADIUS_METERS = 2500;

export type NearbyBrandsResult =
  // 附近真的找到我們認識的品牌,候選範圍就限制在這些品牌裡
  | { type: "nearby"; brands: CatalogBrand[] }
  // 附近一個都找不到(或根本沒有座標可用),退回整個資料庫,候選範圍是全部品牌
  | { type: "allBrands"; brands: CatalogBrand[] };

export async function findNearbyBrands(
  db: Firestore,
  placesApiKey: string,
  center: { lat: number; lng: number },
  catalog: CatalogBrand[]
): Promise<NearbyBrandsResult> {
  const rawPlaces = await searchNearbyBobaShops(db, placesApiKey, center, NEARBY_RADIUS_METERS);

  const matchedBrands = dedupeBrands(
    rawPlaces
      .map((place) => matchPlaceToBrand(place.name, catalog))
      .filter((brand): brand is CatalogBrand => brand !== null)
  );

  if (matchedBrands.length > 0) {
    return { type: "nearby", brands: matchedBrands };
  }

  return { type: "allBrands", brands: catalog };
}

// 附近店家常常是同一個品牌開好幾家分店(例如50嵐信陽店、50嵐南陽店都可能同時出現在
// 搜尋結果裡),比對完會重複——用品牌id去重,同一個品牌只留一筆
function dedupeBrands(brands: CatalogBrand[]): CatalogBrand[] {
  const seen = new Set<string>();
  const result: CatalogBrand[] = [];
  for (const brand of brands) {
    if (seen.has(brand.id)) continue;
    seen.add(brand.id);
    result.push(brand);
  }
  return result;
}
