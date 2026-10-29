// 這個檔案負責兩件事:(1)從Firestore把完整的品牌+飲料菜單撈出來,
// (2)拿使用者說的文字(品牌名、飲料名)去跟這份真實菜單比對,
// 比對到才算數,比對不到就老實回報「沒比對到」,不會亂猜。

import type { Firestore } from "firebase-admin/firestore";

// 飲料的型別,對應Firestore「brands/{brandId}/drinks/{drinkId}」這個子collection裡每一筆文件,
// id是Firestore自動給的文件ID,其他欄位跟lib/brands.ts的Drink型別一樣
export type CatalogDrink = {
  id: string;
  name: string;
  category?: string;
  note?: string;
  prices: { M: number; L: number };
};

// 可加料的型別,對應「brands/{brandId}」文件裡的addOns欄位(不是子collection,
// 是直接存在品牌文件本身的陣列),跟lib/brands.ts的AddOn型別一樣
export type CatalogAddOn = {
  name: string;
  price: number;
};

// 品牌的型別,對應「brands/{brandId}」這份文件本身,drinks是底下子collection撈出來的全部飲料,
// addOns是這個品牌文件自己帶的可加料清單(可能是空陣列,不是每個品牌都有加料選項)
export type CatalogBrand = {
  id: string;
  name: string;
  slug: string;
  icon: string;
  drinks: CatalogDrink[];
  addOns: CatalogAddOn[];
};

// 比對前先轉小寫、去掉常見的裝飾字「の」(跟lib/map/matchBrand.ts同樣的理由:
// 有些品牌習慣用「の」取代「之/的」,兩邊都先去掉才比對得起來)。
// 最後如果結尾是「茶」字,也先拿掉再比對——「茶」字本身沒有辨識度,但使用者口語描述
// 飲料時常常會隨口加減這個字(例如菜單上存的是「北埔·東方美人」,使用者講「東方美人茶」),
// 兩邊結尾有沒有這個字不一致的話,包含關係、子序列比對都會因為這一個字對不上而整個失敗,
// 所以先統一拿掉。只在長度大於2的時候才拿掉,避免把「紅茶」「奶茶」這種短名稱
// 整個削到只剩1個字,變得太籠統、容易亂比對到不相關的飲料
function normalize(text: string) {
  const base = text.toLowerCase().replace(/の/g, "").trim();
  if (base.length > 2 && base.endsWith("茶")) {
    return base.slice(0, -1);
  }
  return base;
}

// 「鬆散比對」:兩邊正規化之後,看其中一邊是不是包含另一邊,兩個方向都接受。
// 這裡跟地圖那邊的matchBrand.ts不一樣——matchBrand.ts只處理「Google店名一定比品牌全名
// 更囉嗦,店名包著品牌名」這一種方向,因為Google的店名本來就是比較長、比較雜的那一邊。
// 但這裡要比對的是Gemini從使用者口語訊息抽出來的文字,使用者可能講全名(比canonical名稱長,
// 像一整句話夾著名稱),也可能講縮寫(比canonical名稱短,例如只講「四季烏龍」漏講「奶茶」),
// 兩種情況都要接得住,所以兩個方向都檢查
function looseMatch(rawText: string, canonicalName: string) {
  const a = normalize(rawText);
  const b = normalize(canonicalName);
  if (!a || !b) return false;
  return a.includes(b) || b.includes(a);
}

// 子序列比對:字的「順序」要對,但中間可以夾雜其他字,不需要連續——
// 用來接住使用者講話漏掉中間某個詞的情況,例如「黑糖鮮奶」漏講了「珍珠」,
// 對應到真正的「黑糖珍珠鮮奶茶」:黑→糖→(中間跳過珍珠)→鮮→奶,順序仍然對得上。
// shorter長度小於3才不套用,因為字數太少的話,很容易在不相關的名稱裡也剛好湊出同樣順序
function isSubsequence(shorter: string, longer: string): boolean {
  let i = 0;
  for (const char of longer) {
    if (char === shorter[i]) i++;
  }
  return i === shorter.length;
}

function subsequenceMatch(rawText: string, canonicalName: string): boolean {
  const a = normalize(rawText);
  const b = normalize(canonicalName);
  if (!a || !b) return false;
  const [shorter, longer] = a.length <= b.length ? [a, b] : [b, a];
  if (shorter.length < 3) return false;
  return isSubsequence(shorter, longer);
}

// 編輯距離:兩個字串最少要改幾個字才能變成一樣(插入、刪除、取代各算一次)。
// 用來接住品牌名稱打錯一兩個字的情況,例如「茶的魔手」vs「茶之魔手」編輯距離是1
function editDistance(a: string, b: string): number {
  const dp: number[][] = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) dp[i][0] = i;
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[a.length][b.length];
}

// 使用者說的品牌名稱(可能口語、不完整),去跟真實品牌清單比對,比對到回傳那個品牌,沒比對到回傳null。
// 先試鬆散比對(包含關係),完全沒中的話,才退一步容忍「打錯一個字」(編輯距離<=1)——
// 這個容錯只在完全比對不到的時候才啟動,不會蓋掉原本比對得到的結果
export function matchBrand(rawText: string, brands: CatalogBrand[]): CatalogBrand | null {
  const exact = brands.find((b) => looseMatch(rawText, b.name));
  if (exact) return exact;

  const a = normalize(rawText);
  return brands.find((b) => editDistance(a, normalize(b.name)) <= 1) ?? null;
}

// 已經知道是哪個品牌了,在它底下的飲料清單裡找使用者說的飲料名稱。
// 回傳「所有」比對到的飲料,可能0個、1個、或好幾個——跟matchBrand不一樣,這裡故意不只拿第一個,
// 因為同一個品牌底下很可能有好幾款飲料都鬆散包含同一段文字(例如使用者只說「紅茶」,
// 這個品牌可能同時有「檸檬紅茶」「阿薩姆紅茶」「蜂蜜紅茶」,通通符合)。
// 真正該挑哪一款不是我們自己偷偷決定,交給呼叫的地方看命中數量再處理。
//
// 比對分三層,一層完全沒中才退到下一層:
// 1. 完全一樣的飲料名稱——找到就只採用這個,不要再混進下面兩層的結果,不然像「珍珠奶茶」
//    這種精準輸入,會被菜單裡剛好字面上包含「奶茶」兩個字的其他飲料(例如單純的「奶茶」)
//    一起拉進候選清單,變成語意上完全不同的東西也被列成選項
// 2. 鬆散比對(連續子字串包含)——接住「珍奶」這種縮寫,或是多打了幾個字的情況
// 3. 子序列比對(順序對、但可以不連續)——接住「黑糖鮮奶」漏講中間「珍珠」兩個字,
//    對應到真正「黑糖珍珠鮮奶茶」這種情況
export function matchDrinkInBrand(rawText: string, brand: CatalogBrand): CatalogDrink[] {
  const exact = brand.drinks.filter((d) => normalize(d.name) === normalize(rawText));
  if (exact.length > 0) return exact;

  const loose = brand.drinks.filter((d) => looseMatch(rawText, d.name));
  if (loose.length > 0) return loose;

  return brand.drinks.filter((d) => subsequenceMatch(rawText, d.name));
}

// 不知道品牌、只知道飲料名稱,直接在全部品牌的飲料裡找。
// 回傳「所有」比對到的(品牌,飲料)組合,可能是0個、1個、或好幾個。
// 這裡呼叫matchDrinkInBrand也會拿到陣列,所以要把每個品牌命中的每一款飲料都攤平塞進同一份清單——
// 這樣「同一品牌裡有多款符合」跟「好幾個不同品牌都有符合」這兩種歧義,最後都會變成同一份
// 候選清單,之後要問使用者「是這幾款裡的哪一個」的時候,不用分兩套邏輯處理
export function matchDrinkAcrossBrands(
  rawText: string,
  brands: CatalogBrand[]
): { brand: CatalogBrand; drink: CatalogDrink }[] {
  const hits: { brand: CatalogBrand; drink: CatalogDrink }[] = [];
  for (const brand of brands) {
    for (const drink of matchDrinkInBrand(rawText, brand)) {
      hits.push({ brand, drink });
    }
  }
  return hits;
}

// 已經知道是哪個品牌了(飲料都比對確定之後才會知道),在它的加料清單裡找使用者說的加料名稱。
// 邏輯跟matchDrinkInBrand幾乎一樣(同樣分三層、同樣回傳「所有」命中),只是比對的對象
// 換成brand.addOns——加料選項通常比較少,名稱也比較短,不至於需要另外寫一套比對規則
export function matchAddOnInBrand(rawText: string, brand: CatalogBrand): CatalogAddOn[] {
  const exact = brand.addOns.filter((a) => normalize(a.name) === normalize(rawText));
  if (exact.length > 0) return exact;

  const loose = brand.addOns.filter((a) => looseMatch(rawText, a.name));
  if (loose.length > 0) return loose;

  return brand.addOns.filter((a) => subsequenceMatch(rawText, a.name));
}

// 從Firestore把整份品牌+飲料菜單撈出來,給上面這些比對函式用。
// 跟lib/hooks/useSearchIndex.ts的做法一樣:每個品牌底下的drinks子collection平行發出去查,
// 不要一個做完才查下一個,N個品牌就是N個查詢一起發出去,一起等結果回來
export async function loadCatalog(db: Firestore): Promise<CatalogBrand[]> {
  const brandsSnap = await db.collection("brands").get();

  return Promise.all(
    brandsSnap.docs.map(async (brandDoc) => {
      const data = brandDoc.data();
      const drinksSnap = await db.collection("brands").doc(brandDoc.id).collection("drinks").get();
      return {
        id: brandDoc.id,
        name: data.name,
        slug: data.slug,
        icon: data.icon,
        drinks: drinksSnap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<CatalogDrink, "id">),
        })),
        addOns: (data.addOns as CatalogAddOn[] | undefined) ?? [],
      };
    })
  );
}
