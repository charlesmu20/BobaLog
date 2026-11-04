// 把lib/brands.ts裡的品牌資料同步進Firestore——但只新增Firestore裡「還不存在」
// 的品牌(用slug判斷),已經存在的品牌完全跳過、不碰。
//
// 這是故意的設計,不是偷懶:品牌上線之後,使用者可以透過「回報菜單」功能回報
// 價格/品項異動,管理員核准套用後會直接改Firestore,但不會同步寫回lib/brands.ts
// 這個檔案。如果這支腳本每次都把lib/brands.ts整個陣列重新set()一次,等於每次
// 「加一個新品牌」都會順便把其他所有品牌被回報改過的資料蓋回lib/brands.ts裡
// 那份舊的、沒有異動的版本——這支腳本現在只负責「新增」,不負責「同步既有品牌」,
// 要更新既有品牌的資料,交給回報審核流程,不要透過這支腳本。
import { readFileSync } from "fs";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { brands } from "../lib/brands";
import { createHash } from "crypto";

const serviceAccount = JSON.parse(
  readFileSync(new URL("./serviceAccountKey.json", import.meta.url), "utf-8")
);

initializeApp({
  credential: cert(serviceAccount),
});

const db = getFirestore();

async function migrate() {
  const existingSnap = await db.collection("brands").get();
  const existingSlugs = new Set(existingSnap.docs.map((d) => d.id));

  const newBrands = brands.filter((b) => !existingSlugs.has(b.slug));
  const skippedBrands = brands.filter((b) => existingSlugs.has(b.slug));

  if (skippedBrands.length > 0) {
    console.log(`跳過(Firestore裡已存在,不動它):${skippedBrands.map((b) => b.name).join("、")}`);
  }

  if (newBrands.length === 0) {
    console.log("沒有新品牌需要新增。");
    return;
  }

  let batch = db.batch();
  let opCount = 0;

  for (const brand of newBrands) {
    const brandRef = db.collection("brands").doc(brand.slug);
    batch.set(brandRef, {
      name: brand.name,
      slug: brand.slug,
      icon: brand.icon,
      addOns: brand.addOns ?? [],
      drinkCount: brand.drinks.length,
    });
    opCount++;

    for (const drink of brand.drinks) {
      const drinkId = (parseInt(createHash("md5").update(`${brand.slug}-${drink.name}`).digest("hex").slice(0, 8), 16) % 10000000).toString();
      const drinkRef = brandRef.collection("drinks").doc(drinkId);
      batch.set(drinkRef, { name: drink.name, category: drink.category ?? null, note: drink.note ?? null, prices: drink.prices });
      opCount++;

      if (opCount >= 400) {
        await batch.commit();
        batch = db.batch();
        opCount = 0;
      }
    }
  }

  if (opCount > 0) {
    await batch.commit();
  }

  console.log(`完成!已新增品牌:${newBrands.map((b) => b.name).join("、")}`);
}

migrate().catch(console.error);