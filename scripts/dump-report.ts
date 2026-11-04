// 除錯用小工具:把指定的menuReports文件(含AI比對結果)跟對應品牌的真實資料
// 一起印出來,方便核對AI辨識/比對結果準不準。用法:
//   npx tsx scripts/dump-report.ts <reportId>
// 不知道reportId的話,不帶參數直接執行,會列出最近10筆回報(含id)讓你選——
// 管理頁面本身不會把reportId顯示在網址列或畫面上,這樣比較好找
import { readFileSync } from "fs";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const serviceAccount = JSON.parse(
  readFileSync(new URL("./serviceAccountKey.json", import.meta.url), "utf-8")
);

initializeApp({
  credential: cert(serviceAccount),
});

const db = getFirestore();

const reportId = process.argv[2];

async function listRecent() {
  const snap = await db.collection("menuReports").orderBy("createdAt", "desc").limit(10).get();
  console.log("最近10筆回報(由新到舊):\n");
  snap.docs.forEach((d) => {
    const r = d.data() as {
      brandName?: string;
      status?: string;
      aiDiffStatus?: string;
      createdAt?: { toDate: () => Date };
    };
    const time = r.createdAt?.toDate().toLocaleString("zh-TW") ?? "(無時間)";
    console.log(`${d.id}  ${r.brandName ?? "(無品牌)"}  ${r.status ?? "?"}  aiDiffStatus=${r.aiDiffStatus ?? "-"}  ${time}`);
  });
  console.log("\n用法: npx tsx scripts/dump-report.ts <上面複製的reportId>");
}

async function dump() {
  const reportSnap = await db.collection("menuReports").doc(reportId).get();
  if (!reportSnap.exists) {
    console.error(`找不到 menuReports/${reportId}`);
    process.exit(1);
  }
  const report = reportSnap.data() as {
    brandSlug?: string;
    aiDiffStatus?: string;
    aiDiff?: {
      drinks: unknown[];
      addOns: unknown[];
      drinksCompared: boolean;
      addOnsCompared: boolean;
      uncertainNote?: string;
    };
    aiDiffError?: string;
  };

  console.log(`===== menuReports/${reportId}.aiDiffStatus =====`);
  console.log(report.aiDiffStatus ?? "(尚未產生,觸發器可能還沒跑完或沒被叫起來)");

  if (report.aiDiff) {
    console.log(`\n===== aiDiff.drinks (共 ${report.aiDiff.drinks.length} 筆) =====`);
    console.log(JSON.stringify(report.aiDiff.drinks, null, 2));
    console.log(`\n===== aiDiff.addOns (共 ${report.aiDiff.addOns.length} 筆) =====`);
    console.log(JSON.stringify(report.aiDiff.addOns, null, 2));
    console.log(`\ndrinksCompared: ${report.aiDiff.drinksCompared}`);
    console.log(`addOnsCompared: ${report.aiDiff.addOnsCompared}`);
    console.log(`\n===== aiDiff.uncertainNote =====`);
    console.log(
      "uncertainNote" in report.aiDiff
        ? JSON.stringify(report.aiDiff.uncertainNote)
        : "(這個欄位完全不存在於文件裡——Gemini這次沒有回傳uncertainNote)"
    );
  }
  if (report.aiDiffError) {
    console.log(`\n===== aiDiffError =====`);
    console.log(report.aiDiffError);
  }

  if (report.brandSlug) {
    const brandRef = db.collection("brands").doc(report.brandSlug);
    const [brandSnap, drinksSnap] = await Promise.all([
      brandRef.get(),
      brandRef.collection("drinks").get(),
    ]);
    console.log(`\n===== brands/${report.brandSlug}.addOns (資料庫原本的,共 ${(brandSnap.data()?.addOns ?? []).length} 筆) =====`);
    console.log(JSON.stringify(brandSnap.data()?.addOns ?? [], null, 2));
    console.log(`\n===== brands/${report.brandSlug}/drinks 子collection筆數 =====`);
    console.log(drinksSnap.size);
  }
}

if (!reportId) {
  listRecent().catch(console.error);
} else {
  dump().catch(console.error);
}
