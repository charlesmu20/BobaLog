// 一次性腳本:把Firestore裡「現有」的飲料資料全部補進Algolia的drinks索引。
//
// 為什麼需要這支:brands collection是用Firebase官方的「Search with Algolia」擴充功能
// 自動同步,裝的時候有勾選「Full Index existing documents: Yes」,裝好那瞬間就會
// 自動把現有資料回填進去。但drinks那邊(functions/src/search/syncDrinksToAlgolia.ts)
// 是我們自己寫的Cloud Function,只會在「之後」有文件異動時才觸發,不會主動回填
// 「部署之前」就已經存在的飲料資料——所以要跑這支腳本補一次,之後的異動就會
// 由那支Cloud Function自動同步,不用再跑第二次。
//
// 用法:ALGOLIA_WRITE_API_KEY=你的key npx tsx scripts/backfill-drinks-algolia.ts
// (Write API Key故意用環境變數傳入、不寫死在檔案裡,避免機密金鑰進版控)
import { readFileSync } from "fs";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { algoliasearch } from "algoliasearch";

const ALGOLIA_APP_ID = "5873XNQFPF";
const ALGOLIA_DRINKS_INDEX = "drinks";

const writeApiKey = process.env.ALGOLIA_WRITE_API_KEY;
if (!writeApiKey) {
  console.error(
    "缺少ALGOLIA_WRITE_API_KEY環境變數。用法:ALGOLIA_WRITE_API_KEY=你的key npx tsx scripts/backfill-drinks-algolia.ts"
  );
  process.exit(1);
}

const serviceAccount = JSON.parse(
  readFileSync(new URL("./serviceAccountKey.json", import.meta.url), "utf-8")
);

initializeApp({
  credential: cert(serviceAccount),
});

const db = getFirestore();
const client = algoliasearch(ALGOLIA_APP_ID, writeApiKey);

async function backfill() {
  const brandsSnap = await db.collection("brands").get();

  // 每個品牌底下的drinks子collection平行撈出來,不要排隊依序等
  const results = await Promise.all(
    brandsSnap.docs.map(async (brandDoc) => {
      const brandData = brandDoc.data() as { name?: string; icon?: string };
      const drinksSnap = await db.collection("brands").doc(brandDoc.id).collection("drinks").get();
      return drinksSnap.docs.map((d) => {
        const drinkData = d.data() as { name: string };
        return {
          objectID: d.id,
          name: drinkData.name,
          brandSlug: brandDoc.id,
          brandName: brandData.name ?? "",
          brandIcon: brandData.icon ?? "",
        };
      });
    })
  );

  const records = results.flat();

  if (records.length === 0) {
    console.log("沒有找到任何飲料資料,沒有東西要同步。");
    return;
  }

  await client.saveObjects({ indexName: ALGOLIA_DRINKS_INDEX, objects: records });

  console.log(`完成!已同步 ${records.length} 筆飲料資料進Algolia的「${ALGOLIA_DRINKS_INDEX}」索引。`);
}

backfill().catch(console.error);
