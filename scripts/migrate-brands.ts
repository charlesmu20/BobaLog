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
  let batch = db.batch();
  let opCount = 0;

  for (const brand of brands) {
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

  console.log("完成!已寫入所有品牌與飲料資料。");
}

migrate().catch(console.error);