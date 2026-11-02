// 推薦飲料功能專用的候選組裝邏輯,角色跟chatLog.ts很像——chatLog.ts是把Gemini抽取的
// 記帳資訊拿去跟catalog.ts比對,這裡是把Gemini判斷出來的「使用者想問什麼」拿去跟
// catalog.ts比對,組出真正要交給Gemini挑選/解釋的候選清單。catalog.ts本身只負責
// 比對邏輯(matchBrand、matchDrinkInBrand...),不負責「這次該怎麼用」這種情境判斷,
// 情境判斷通通收斂在這個檔案

import { matchBrand, type CatalogBrand, type CatalogDrink } from "../catalog";

// 情境三:使用者指名特定品牌問有沒有好喝的(例如「50嵐有什麼好喝的」)。這個情境不套用
// 地理限制——使用者自己指名的品牌,不管在哪都要查,不是讓AI從附近隨便挑,所以這裡完全
// 不用理會使用者位置。
//
// 這裡原本還支援「指定品牌+指定飲料」的精確查詢(例如「50嵐有沒有芒果」找不到時,
// 自動去其他品牌找類似的),但呼叫端(recommendCoordinator.ts)從來沒有真的傳
// drinkNameRaw進來——這種「某品牌沒有某款飲料,問其他品牌有沒有」的情境,實測發現
// 現有的對話式追問(使用者自己接著問「那其他品牌呢」)就能正確處理、交給Gemini從
// 附近品牌池重新找,不需要這裡另外寫一套專門邏輯,所以把這塊未使用的分支拿掉,
// 只留下「品牌找不到」跟「品牌找到了」兩種結果
export type BrandDrinkQueryResult =
  // 使用者講的品牌名字,在真實品牌清單裡完全比對不到
  | { type: "brandNotFound" }
  // 品牌比對到了,整個品牌的飲料都算候選,讓後面交給Gemini的那一步自己去看
  // 使用者有沒有講口味、從這個品牌裡挑
  | { type: "inBrand"; brand: CatalogBrand; drinks: CatalogDrink[] };

export function resolveBrandDrinkQuery(brandNameRaw: string, catalog: CatalogBrand[]): BrandDrinkQueryResult {
  const brand = matchBrand(brandNameRaw, catalog);
  if (!brand) {
    return { type: "brandNotFound" };
  }
  return { type: "inBrand", brand, drinks: brand.drinks };
}
