// 「菜單回報」管理頁面共用的型別+小工具,給applyMenuReportChanges.ts跟
// revertAllAppliedChanges.ts一起用

import { createHash } from "crypto";

// 套用一筆diff之後,記錄下來的「這筆變更長怎樣」,存在menuReports文件的
// appliedChanges陣列裡,是之後revertAllAppliedChanges.ts復原唯一依賴的資料。
//
// 一筆回報一生只會被套用一次(套用過、不管有沒有復原,都不能再重新套用——
// 見applyMenuReportChanges.ts的status==="applied"檢查),所以diffId在這個
// 陣列裡天生就不會重複,可以直接拿來當key/比對用,不需要額外的獨立ID。
export type AppliedChange = {
  diffId: string;
  kind: "drink" | "addOn";
  type: "newItem" | "priceMismatch" | "possiblyRemoved";
  name: string;
  // 只有kind是drink才有(加料是陣列欄位,用name比對,沒有獨立的文件ID)
  drinkId?: string;
  // 復原時要寫回去的樣子。newItem的話是null(復原=刪除掉剛剛新增的);
  // priceMismatch是{prices: 原價}或{price: 原價};possiblyRemoved是完整的原始資料
  previousState: unknown;
  reverted: boolean;
};

// 飲料文件ID用品牌slug+名稱算出來的固定雜湊值,不是隨機ID——這樣同一個品牌、
// 同一個名稱不管是誰、什麼時候新增的,算出來都是同一個ID,不會重複建立
export function computeDrinkId(slug: string, name: string): string {
  return (
    parseInt(createHash("md5").update(`${slug}-${name}`).digest("hex").slice(0, 8), 16) % 10000000
  ).toString();
}
