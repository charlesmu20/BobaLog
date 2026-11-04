// 「菜單回報」功能專用:把Gemini辨識出來的菜單內容,跟Firestore裡這個品牌真實的資料
// (brands/{slug}/drinks子collection + brands/{slug}文件的addOns欄位)比對,
// 算出差異清單,給管理頁面顯示、核准/拒絕用。
//
// 比對只看名稱(trim掉頭尾空白後整串比對)+價格,不比對category、note——這兩個欄位
// 是我們自己定義的分類標籤,不是菜單上會直接印出來的「事實」,硬要AI辨識準確度太差,
// 討論過後決定跳過

import type { Firestore } from "firebase-admin/firestore";
import { extractMenuFromPhoto, type ExtractedDrink, type ExtractedAddOn } from "./geminiMenuExtract";

export type MenuDiffType = "newItem" | "priceMismatch" | "possiblyRemoved";

export type DrinkDiffItem = {
  diffId: string;
  type: MenuDiffType;
  name: string;
  // 現有資料庫裡原本的樣子——type是newItem時沒有這個欄位(資料庫裡本來就沒有)
  currentPrices?: { M: number; L: number };
  // 照片辨識出來的樣子——type是possiblyRemoved時沒有這個欄位(照片裡沒看到)
  extractedPrices?: { M: number; L: number };
  // 只有possiblyRemoved需要用到:被刪除前的完整資料,之後套用變更/復原時要用
  drinkId?: string;
  category?: string | null;
  note?: string | null;
};

export type AddOnDiffItem = {
  diffId: string;
  type: MenuDiffType;
  name: string;
  currentPrice?: number;
  extractedPrice?: number;
};

export type MenuDiffResult = {
  drinks: DrinkDiffItem[];
  addOns: AddOnDiffItem[];
  // 這次比對有沒有真的做飲料比對(跟extractMenuFromPhoto的drinksVisible一致)——
  // 管理頁面顯示「這張照片沒拍到飲料主菜單」這段提示文字要靠這個欄位判斷
  drinksCompared: boolean;
  // 這次比對有沒有真的做加料比對(跟extractMenuFromPhoto的addOnsVisible一致)——
  // 管理頁面顯示「這張照片沒拍到加料區塊」這段提示文字要靠這個欄位判斷
  addOnsCompared: boolean;
  // Gemini自己回報「哪裡看不清楚/沒把握/跳過了」的簡短說明,直接從extractMenuFromPhoto
  // 原樣帶過來——沒有不確定的地方就不會有這個欄位
  uncertainNote?: string;
};

let diffIdCounter = 0;
function nextDiffId(): string {
  diffIdCounter += 1;
  return `diff-${Date.now()}-${diffIdCounter}`;
}

// 名稱比對前先做最基本的正規化(去掉頭尾空白)——不做更複雜的模糊比對(例如忽略標點符號、
// 同義詞),故意保守一點:比對不到寧可當作「可能是新品項」讓人工確認,也不要因為太激進的
// 模糊比對把兩杯根本不同的飲料誤判成同一杯
function normalizeName(name: string): string {
  return name.trim();
}

// 把「珍珠/仙草凍/綠茶凍」這種用「/」合併印在菜單上的名字拆開,個別去掉頭尾空白。
// 用途:菜單上把好幾個同價格的品項合併印在一起,但資料庫是拆開存的(反之亦然),
// 這種純粹是「印法不同」不是「內容真的變了」,拆開來一一比對才抓得到
function splitMergedName(name: string): string[] {
  return name
    .split("/")
    .map((part) => normalizeName(part))
    .filter((part) => part.length > 0);
}

function diffDrinks(
  ourDrinks: { id: string; name: string; category: string | null; note: string | null; prices: { M: number; L: number } }[],
  extracted: ExtractedDrink[]
): DrinkDiffItem[] {
  const result: DrinkDiffItem[] = [];
  const matchedOurDrinkIds = new Set<string>();

  for (const item of extracted) {
    const normalizedExtractedName = normalizeName(item.name);
    const match = ourDrinks.find((d) => normalizeName(d.name) === normalizedExtractedName);

    if (!match) {
      // 飲料這邊故意不做「拆開合併名稱」的比對嘗試——跟geminiMenuExtract.ts裡
      // 「合併標價不拆成多筆」的規則是同一個立場:飲料名稱本來就有很多品牌習慣用
      // 合併寫法存成一筆(例如「紅/綠茶拿鐵」),資料庫這邊也應該照同樣的合併寫法存,
      // 不是拆開存。真的比對不到整串名字,就老實當成新品項讓人工判斷——如果是
      // 資料庫存法沒跟菜單印法一致(例如拆開存成兩筆),這樣產生的newItem+
      // possiblyRemoved正好能提醒人工「這筆資料庫存法可能要跟著改成合併寫法」,
      // 而不是程式自己硬湊兩筆合併起來。加料(diffAddOns)則相反,看到合併寫法
      // 還是會嘗試拆開比對,因為加料本來就是分開的選購項目,拆開看才合理。
      result.push({
        diffId: nextDiffId(),
        type: "newItem",
        name: item.name,
        extractedPrices: { M: item.priceM, L: item.priceL },
      });
      continue;
    }

    matchedOurDrinkIds.add(match.id);
    const priceDiffers = match.prices.M !== item.priceM || match.prices.L !== item.priceL;
    if (priceDiffers) {
      result.push({
        diffId: nextDiffId(),
        type: "priceMismatch",
        name: match.name,
        currentPrices: match.prices,
        extractedPrices: { M: item.priceM, L: item.priceL },
        drinkId: match.id,
        category: match.category,
        note: match.note,
      });
    }
    // 名稱對得上、價格也一樣——沒有差異,不產生任何diff項目
  }

  // 我們資料庫裡有、但這次辨識結果完全沒比對到的飲料——疑似下架
  for (const drink of ourDrinks) {
    if (matchedOurDrinkIds.has(drink.id)) continue;
    result.push({
      diffId: nextDiffId(),
      type: "possiblyRemoved",
      name: drink.name,
      currentPrices: drink.prices,
      drinkId: drink.id,
      category: drink.category,
      note: drink.note,
    });
  }

  return result;
}

function diffAddOns(
  ourAddOns: { name: string; price: number }[],
  extracted: ExtractedAddOn[]
): AddOnDiffItem[] {
  const result: AddOnDiffItem[] = [];
  const matchedOurNames = new Set<string>();

  for (const item of extracted) {
    const normalizedExtractedName = normalizeName(item.name);
    const match = ourAddOns.find((a) => normalizeName(a.name) === normalizedExtractedName);

    if (!match) {
      // 整串名字對不到——同樣先試試看是不是菜單上把好幾個同價格加料合併印成一筆
      // (例如「珍珠/仙草凍/綠茶凍 10元」),資料庫是拆開存的。邏輯跟diffDrinks一樣
      const parts = splitMergedName(item.name);
      if (parts.length > 1) {
        const partMatches = parts.map((part) => ourAddOns.find((a) => normalizeName(a.name) === part));
        const allMatched = partMatches.every((m) => m && m.price === item.price);
        if (allMatched) {
          for (const m of partMatches) matchedOurNames.add(normalizeName(m!.name));
          continue;
        }
      }

      result.push({
        diffId: nextDiffId(),
        type: "newItem",
        name: item.name,
        extractedPrice: item.price,
      });
      continue;
    }

    matchedOurNames.add(normalizeName(match.name));
    if (match.price !== item.price) {
      result.push({
        diffId: nextDiffId(),
        type: "priceMismatch",
        name: match.name,
        currentPrice: match.price,
        extractedPrice: item.price,
      });
    }
  }

  for (const addOn of ourAddOns) {
    if (matchedOurNames.has(normalizeName(addOn.name))) continue;
    result.push({
      diffId: nextDiffId(),
      type: "possiblyRemoved",
      name: addOn.name,
      currentPrice: addOn.price,
    });
  }

  return result;
}

export async function compareMenuPhoto(
  db: Firestore,
  geminiApiKey: string,
  brandSlug: string,
  photoUrl: string
): Promise<MenuDiffResult> {
  // 【抓照片,轉成Gemini看得懂的base64】——這張照片早就已經上傳到Storage、
  // photoUrl是公開可讀的下載連結,直接fetch就能拿到,不用另外再走Storage Admin SDK
  const photoResponse = await fetch(photoUrl);
  if (!photoResponse.ok) {
    throw new Error(`下載回報照片失敗(${photoResponse.status})`);
  }
  const photoBuffer = await photoResponse.arrayBuffer();
  const photoBase64 = Buffer.from(photoBuffer).toString("base64");

  // 【讀真實菜單資料】——brands/{slug}的drinks是子collection,不是陣列欄位,
  // 跟scripts/migrate-brands.ts寫入時的結構要一致
  const brandRef = db.collection("brands").doc(brandSlug);
  const [brandSnap, drinksSnap, extraction] = await Promise.all([
    brandRef.get(),
    brandRef.collection("drinks").get(),
    extractMenuFromPhoto(geminiApiKey, photoBase64, "image/jpeg"),
  ]);

  const ourDrinks = drinksSnap.docs.map((d) => {
    const data = d.data() as { name: string; category: string | null; note: string | null; prices: { M: number; L: number } };
    return { id: d.id, name: data.name, category: data.category ?? null, note: data.note ?? null, prices: data.prices };
  });
  const ourAddOns = ((brandSnap.data()?.addOns as { name: string; price: number }[]) ?? []);

  // Gemini完全沒辨識出任何東西(不是菜單照片、整張照片太模糊看不出內容,或Gemini
  // 根本沒呼叫record_menu_photo這個工具,兩個visible欄位都會是false)。這種狀況如果
  // 照常比對下去,會把資料庫裡所有飲料/加料都判斷成「疑似下架」,看起來像是一次正常
  // 比對完成(aiDiffStatus還是"done")、只是菜單被整個換掉了——很危險,尤其管理頁面有
  // 「全部核准」這種一鍵套用的捷徑,一個手滑可能把整個品牌的菜單清空。丟出錯誤讓這筆
  // 回報變成aiDiffStatus:"error",逼管理員自己手動核對,而不是把「什麼都沒看到」
  // 當成「全部都下架了」
  if (!extraction.drinksVisible && !extraction.addOnsVisible) {
    throw new Error("AI完全辨識不出菜單內容,請確認照片清晰度或重新拍攝");
  }

  // 飲料/加料各自獨立判斷要不要比對——使用者可能這次只拍了其中一個區塊
  // (例如只想回報加料價格,只拍加料表沒拍飲料菜單),沒拍到的那邊drinks/addOns
  // 原本就會是空陣列,不能跟「這個品牌真的全部下架了」混在一起比對,
  // 否則會產生跟上面同樣危險的「全部疑似下架」結果
  const drinkDiffs = extraction.drinksVisible ? diffDrinks(ourDrinks, extraction.drinks) : [];
  const addOnDiffs = extraction.addOnsVisible ? diffAddOns(ourAddOns, extraction.addOns) : [];

  return {
    drinks: drinkDiffs,
    addOns: addOnDiffs,
    drinksCompared: extraction.drinksVisible,
    addOnsCompared: extraction.addOnsVisible,
    // 沒有不確定的地方就完全不要帶這個欄位——Firestore Admin SDK預設不接受
    // 欄位值是undefined,不能像一般物件一樣寫uncertainNote: undefined
    ...(extraction.uncertainNote ? { uncertainNote: extraction.uncertainNote } : {}),
  };
}
