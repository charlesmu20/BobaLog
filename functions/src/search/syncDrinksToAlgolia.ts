// 「首頁搜尋改用Algolia」功能的一部分:brands collection那邊交給Firebase官方的
// 「Search with Algolia」擴充功能自動處理(裝在ext-firestore-algolia-search這個實例),
// 但drinks是brands底下的子collection,文件本身只有name/category/note/prices,
// 沒有品牌名稱/icon這些資訊——擴充功能只會原封不動同步文件本身的欄位,沒辦法幫忙補上
// 父層的品牌資訊,所以這段飲料的同步邏輯只好自己寫:監聽drinks子collection異動,
// 補上品牌資訊後手動呼叫Algolia API寫進去。
//
// 跟brands那個擴充功能用同一個Algolia application,但索引開在另一個獨立的index
// (ALGOLIA_DRINKS_INDEX),這樣前端hero-search.tsx才能分開查「符合的品牌」
// 跟「符合的飲料」,維持跟現在useSearchIndex.ts一樣的資料形狀。

import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { defineSecret } from "firebase-functions/params";
import * as logger from "firebase-functions/logger";
import { algoliasearch } from "algoliasearch";

// App ID不是機密資訊(Algolia自己說這個可以放心寫在前端),所以不用當secret處理,
// 直接寫死常數就好;Write API Key才是真正要保護的,走secret
const ALGOLIA_APP_ID = "5873XNQFPF";
export const ALGOLIA_WRITE_API_KEY = defineSecret("ALGOLIA_WRITE_API_KEY");
const ALGOLIA_DRINKS_INDEX = "drinks";

type DrinkDoc = {
  name: string;
  category?: string | null;
  note?: string | null;
  prices: { M: number; L: number };
};

type BrandDoc = {
  name?: string;
  icon?: string;
};

export const onDrinkWrittenSyncAlgolia = onDocumentWritten(
  {
    document: "brands/{slug}/drinks/{drinkId}",
    region: "asia-east1",
    secrets: [ALGOLIA_WRITE_API_KEY],
  },
  async (event) => {
    const { slug, drinkId } = event.params;
    const client = algoliasearch(ALGOLIA_APP_ID, ALGOLIA_WRITE_API_KEY.value());

    const afterSnap = event.data?.after;

    // after不存在或文件已不存在:這筆飲料被刪除了(菜單回報套用possiblyRemoved、
    // 或revert把newItem復原掉都會觸發這個分支),同步把Algolia裡對應那筆也刪掉
    if (!afterSnap || !afterSnap.exists) {
      try {
        await client.deleteObject({ indexName: ALGOLIA_DRINKS_INDEX, objectID: drinkId });
      } catch (err) {
        logger.error("同步刪除Algolia飲料記錄失敗", { slug, drinkId, err });
      }
      return;
    }

    const drinkData = afterSnap.data() as DrinkDoc;

    // 飲料文件本身沒有品牌資訊,另外讀一次父層brands文件補上去——
    // 這樣Algolia那邊的搜尋結果才顯示得出來「是哪個品牌的哪杯飲料」
    const brandSnap = await afterSnap.ref.firestore.collection("brands").doc(slug).get();
    const brandData = brandSnap.data() as BrandDoc | undefined;

    try {
      await client.saveObject({
        indexName: ALGOLIA_DRINKS_INDEX,
        body: {
          objectID: drinkId,
          name: drinkData.name,
          brandSlug: slug,
          brandName: brandData?.name ?? "",
          brandIcon: brandData?.icon ?? "",
        },
      });
    } catch (err) {
      logger.error("同步飲料資料到Algolia失敗", { slug, drinkId, err });
    }
  }
);
