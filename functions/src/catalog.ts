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

// 只做小寫/の去除/去頭尾空白,刻意不裁切結尾的「茶」字——搭配normalize()一起用,
// 接住下面looseMatch要修的那個情況(見looseMatch的註解)
function normalizeKeepTrailingTea(text: string): string {
  return text.toLowerCase().replace(/の/g, "").trim();
}

// 「鬆散比對」:兩邊正規化之後,看其中一邊是不是包含另一邊,兩個方向都接受。
// 這裡跟地圖那邊的matchBrand.ts不一樣——matchBrand.ts只處理「Google店名一定比品牌全名
// 更囉嗦,店名包著品牌名」這一種方向,因為Google的店名本來就是比較長、比較雜的那一邊。
// 但這裡要比對的是Gemini從使用者口語訊息抽出來的文字,使用者可能講全名(比canonical名稱長,
// 像一整句話夾著名稱),也可能講縮寫(比canonical名稱短,例如只講「四季烏龍」漏講「奶茶」),
// 兩種情況都要接得住,所以兩個方向都檢查
// 把文字裡的中文數字轉成阿拉伯數字,只處理0~99這個範圍——目前唯一需要的情境是
// 品牌名稱「五十嵐」要能對應到真實資料存的「50嵐」(這是台灣人最常見的兩種寫法,
// 使用者打「五十嵐」的機率搞不好比打「50嵐」還高)。只在matchBrand這裡用,
// 不動normalize()本身,避免影響到飲料名稱比對(菜單上有些飲料名稱本來就帶數字編號,
// 例如UG Tea的「307」「308」,本來就是阿拉伯數字,跟這個函式要處理的中文數字無關,
// 但還是不想讓這個轉換邏輯波及到不相關的比對,所以刻意限定只套用在品牌名稱這一層)
const CHINESE_DIGITS: Record<string, number> = {
  零: 0,
  一: 1,
  二: 2,
  兩: 2,
  三: 3,
  四: 4,
  五: 5,
  六: 6,
  七: 7,
  八: 8,
  九: 9,
};

function convertChineseNumeralsToDigits(text: string): string {
  let result = "";
  let i = 0;
  while (i < text.length) {
    const char = text[i];
    if (char in CHINESE_DIGITS && text[i + 1] === "十") {
      // 「X十」或「X十Y」這種兩位數的開頭,例如「五十」(50)、「五十三」(53)
      const tens = CHINESE_DIGITS[char];
      if (text[i + 2] in CHINESE_DIGITS) {
        result += String(tens * 10 + CHINESE_DIGITS[text[i + 2]]);
        i += 3;
      } else {
        result += String(tens * 10);
        i += 2;
      }
      continue;
    }
    if (char === "十") {
      // 單獨的「十」,前面沒有接中文數字,當作10(例如「十嵐」這種講法)
      result += "10";
      i++;
      continue;
    }
    if (char in CHINESE_DIGITS) {
      result += String(CHINESE_DIGITS[char]);
      i++;
      continue;
    }
    result += char;
    i++;
  }
  return result;
}

function looseMatch(rawText: string, canonicalName: string) {
  const a = normalize(rawText);
  const b = normalize(canonicalName);
  if (a && b && (a.includes(b) || b.includes(a))) return true;

  // 【修復】上面那組比對,兩邊都已經把結尾的「茶」字裁掉了——這本來是為了接住
  // 「使用者多打/少打結尾這個茶字」的情況(例如使用者講「東方美人茶」,菜單存的是
  // 「北埔·東方美人」),但這個裁切是看「每一邊自己的字數」各自獨立決定要不要裁,
  // 沒有考慮到兩邊字數可能差很多:如果使用者講的本身就是一個很短、剛好以「茶」結尾的
  // 兩個字(例如「奶茶」「紅茶」,長度剛好2,不會被裁掉),要去比對一個「前綴+這兩個字」
  // 組成、長度大於2的飲料名稱(例如「萬波奶茶」「阿薩姆紅茶」,長度>2會被裁掉結尾的茶字,
  // 變成「萬波奶」「阿薩姆紅」),裁完之後兩邊一個有茶字、一個沒有,反而比對失敗——
  // 明明原始文字「萬波奶茶」裡就完整包含使用者講的「奶茶」兩個字。
  // 所以這裡用「兩邊都保留茶字」的版本再比一次,只要其中一種組合(都裁掉/都保留)
  // 比對得上就算數,不會互相蓋掉
  const aKeepTea = normalizeKeepTrailingTea(rawText);
  const bKeepTea = normalizeKeepTrailingTea(canonicalName);
  if (!aKeepTea || !bKeepTea) return false;
  return aKeepTea.includes(bKeepTea) || bKeepTea.includes(aKeepTea);
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
// 先試鬆散比對(包含關係,原始文字跟中文數字轉換後的文字都各試一次——接住「五十嵐」
// 對應資料存的「50嵐」這種情況),完全沒中的話,才退一步容忍「打錯一個字」(編輯距離<=1,
// 同樣兩種寫法都各試一次)——這個容錯只在完全比對不到的時候才啟動,不會蓋掉原本比對得到的結果
export function matchBrand(rawText: string, brands: CatalogBrand[]): CatalogBrand | null {
  const convertedText = convertChineseNumeralsToDigits(rawText);
  const exact = brands.find((b) => looseMatch(rawText, b.name) || looseMatch(convertedText, b.name));
  if (exact) return exact;

  const a = normalize(rawText);
  const aConverted = normalize(convertedText);
  return (
    brands.find((b) => {
      const bNormalized = normalize(b.name);
      return editDistance(a, bNormalized) <= 1 || editDistance(aConverted, bNormalized) <= 1;
    }) ?? null
  );
}

// 打錯一個字的容錯:跟matchBrand用的是同一種編輯距離規則,只是這裡共用給飲料/加料名稱用。
// 字數太短(少於3字)不套用——字一短,「只差一個字」涵蓋的範圍就很寬,容易誤配到完全不相關
// 的名稱(例如「紅茶」改一個字就能變成一堆不相干的兩字詞),跟subsequenceMatch同樣的理由
function typoMatch(rawText: string, canonicalName: string): boolean {
  const a = normalize(rawText);
  const b = normalize(canonicalName);
  if (a.length < 3 || b.length < 3) return false;
  return editDistance(a, b) <= 1;
}

// 飲料名稱、加料名稱共用的比對規則,抽成一個泛型函式——matchDrinkInBrand(單一品牌內)、
// matchDrinkAcrossBrands(跨全部品牌)、matchAddOnInBrand(加料)原本各自把這些規則
//複製了一份,比對的對象(drinks/addOns)不同、但規則完全一樣,統一用getName取出要比對的
// 名稱字串就能共用,不用三份一模一樣的程式碼
// 1. 完全一樣的名稱——找到就只採用這個,不要再混進下面幾層的結果,不然像「珍珠奶茶」
//    這種精準輸入,會被菜單裡剛好字面上包含「奶茶」兩個字的其他飲料(例如單純的「奶茶」)
//    一起拉進候選清單,變成語意上完全不同的東西也被列成選項
// 2. 鬆散比對(連續子字串包含)——接住「珍奶」這種縮寫,或是多打了幾個字的情況
// 3. 子序列比對(順序對、但可以不連續)——接住「黑糖鮮奶」漏講中間「珍珠」兩個字,
//    對應到真正「黑糖珍珠鮮奶茶」這種情況
// 4. 打錯一個字的容錯——接住「白鶴那提」這種只差一個字(提/堤)就對不上前三層的情況,
//    跟matchBrand對品牌名稱的容錯是同一套規則,只在前三層完全沒中的時候才啟動
function matchByTiers<T>(rawText: string, items: T[], getName: (item: T) => string): T[] {
  const exact = items.filter((item) => normalize(getName(item)) === normalize(rawText));
  if (exact.length > 0) return exact;

  const loose = items.filter((item) => looseMatch(rawText, getName(item)));
  if (loose.length > 0) return loose;

  const subsequence = items.filter((item) => subsequenceMatch(rawText, getName(item)));
  if (subsequence.length > 0) return subsequence;

  return items.filter((item) => typoMatch(rawText, getName(item)));
}

// 已經知道是哪個品牌了,在它底下的飲料清單裡找使用者說的飲料名稱。
// 回傳「所有」比對到的飲料,可能0個、1個、或好幾個——跟matchBrand不一樣,這裡故意不只拿第一個,
// 因為同一個品牌底下很可能有好幾款飲料都鬆散包含同一段文字(例如使用者只說「紅茶」,
// 這個品牌可能同時有「檸檬紅茶」「阿薩姆紅茶」「蜂蜜紅茶」,通通符合)。
// 真正該挑哪一款不是我們自己偷偷決定,交給呼叫的地方看命中數量再處理。
export function matchDrinkInBrand(rawText: string, brand: CatalogBrand): CatalogDrink[] {
  return matchByTiers(rawText, brand.drinks, (d) => d.name);
}

// 不知道品牌、只知道飲料名稱,直接在全部品牌的飲料裡找。
// 回傳「所有」比對到的(品牌,飲料)組合,可能是0個、1個、或好幾個。
//
// 分層要「整個全部品牌」retry完才退下一層,不能每個品牌各自獨立退層——
// 原本的寫法是對每個品牌各自呼叫matchDrinkInBrand(各自在品牌內部做完三層),
// 再把結果攤平合併,這樣會有bug:假設A品牌有一款飲料名稱完全精準符合(exact),
// B品牌雖然沒有精準符合,但剛好有別的飲料鬆散包含同一段文字(loose)——A的exact
// 結果跟B的loose結果會被攤平混在同一份候選清單裡,使用者明明講的是A品牌那杯
// 一模一樣名稱的飲料,卻被B品牌不相關的鬆散命中拖累,變成一堆選項要問使用者選。
// 正確做法是:先看「全部品牌」裡有沒有任何exact命中,有的話只採用這些exact結果就好,
// 完全不看loose/subsequence;全部品牌都沒有exact命中,才退一層改成收集全部品牌的loose結果;
// 以此類推——做法是先把全部品牌的飲料攤平成同一份清單(每筆帶著自己的brand),
// 再整份一起丟進matchByTiers,「retry整個全部品牌才退下一層」就自然成立,不用額外寫邏輯
export function matchDrinkAcrossBrands(
  rawText: string,
  brands: CatalogBrand[]
): { brand: CatalogBrand; drink: CatalogDrink }[] {
  const flattened = brands.flatMap((brand) => brand.drinks.map((drink) => ({ brand, drink })));
  return matchByTiers(rawText, flattened, (item) => item.drink.name);
}

// 已經知道是哪個品牌了(飲料都比對確定之後才會知道),在它的加料清單裡找使用者說的加料名稱。
// 規則跟matchDrinkInBrand共用同一個matchByTiers,只是比對的對象換成brand.addOns
export function matchAddOnInBrand(rawText: string, brand: CatalogBrand): CatalogAddOn[] {
  return matchByTiers(rawText, brand.addOns, (a) => a.name);
}

// 模組層級的快取:記在這支檔案自己的記憶體裡,不是資料庫也不是前端——Cloud Functions
// 短時間內連續被呼叫時,很高機率會重複使用同一個還沒被回收的執行環境,這個變數就會一直
// 留著,直到過期或整個執行環境被回收(閒置一段時間沒人用)才會重置。
// 聊天室一次對話常常連續打好幾句話(記帳問細節、推薦問口味、看看其他選項...),
// 每一句話都重新把整份品牌+飲料資料從Firestore撈一次,資料明明沒變,完全是白工——
// 加這層快取之後,同一段時間內的重複呼叫可以直接重用上一次撈到的結果。
//
// 但這層只在「同一個執行環境」裡有效——Cloud Functions不保證連續幾次呼叫會用到
// 同一個執行環境,換了一個新的(或冷啟動的)執行環境,這個變數是空的,還是得整份
// 重新查一次。所以下面另外加了一層「大家共用」的Firestore快取文件,解決換執行環境
// 就失效的問題:這個模組變數負責最快的那一層(完全不用問資料庫),Firestore那份
// 文件負責「換了執行環境,也還能用別人剛查好的結果」那一層,兩層疊在一起用
let cachedCatalog: { data: CatalogBrand[]; fetchedAt: number } | null = null;
// 60秒:快取有效期限不要設太長——管理員審核「菜單回報」之後,品牌/飲料資料是真的會被
// 改掉的,设一個短的有效期限,確保改完之後最多一分鐘左右聊天機器人就會看到新資料,
// 不會因為快取永遠生效而一直用舊資料
const CATALOG_CACHE_TTL_MS = 60 * 1000;

// 共用快取存在這份Firestore文件裡(跟「brands」collection平行、不會跟真正的品牌資料混在一起)。
// 整份品牌+飲料資料直接存成這份文件的一個欄位——Firestore單份文件的大小上限是1MB,
// 這份菜單資料遠遠不到這個量,不用擔心超過
const CATALOG_CACHE_COLLECTION = "cache";
const CATALOG_CACHE_DOC_ID = "catalog";

// 從Firestore把整份品牌+飲料菜單撈出來,給上面這些比對函式用。
// 跟lib/hooks/useSearchIndex.ts的做法一樣:每個品牌底下的drinks子collection平行發出去查,
// 不要一個做完才查下一個,N個品牌就是N個查詢一起發出去,一起等結果回來
export async function loadCatalog(db: Firestore): Promise<CatalogBrand[]> {
  // 下面這幾個console.log是特別加來讓你可以在Firebase Functions的log裡親眼確認,
  // 這次呼叫到底是走了哪一條路——「本機記憶體快取」「共用Firestore快取」還是
  // 「真的重新整個查一次」,三種情況訊息都不一樣,方便肉眼對照
  if (cachedCatalog && Date.now() - cachedCatalog.fetchedAt < CATALOG_CACHE_TTL_MS) {
    console.log("[菜單快取] 命中本機記憶體快取,沒有碰Firestore");
    return cachedCatalog.data;
  }

  const cacheDocRef = db.collection(CATALOG_CACHE_COLLECTION).doc(CATALOG_CACHE_DOC_ID);

  // 自己這個執行環境沒有快取,但別的執行環境可能已經查過、寫進了這份共用的Firestore
  // 快取文件——先讀這一份文件(只要1次讀取)看看新不新鮮,新鮮的話直接拿來用,
  // 不用自己重新查一次全部品牌+飲料(45次左右的讀取)。
  // 這份讀取失敗(例如文件還不存在,或剛好網路出狀況)不應該讓整個查詢跟著失敗,
  // 退回去重新查就好,所以包一層try/catch,只記錄錯誤不往外丟
  try {
    const cacheSnap = await cacheDocRef.get();
    const cached = cacheSnap.data() as { data: CatalogBrand[]; fetchedAt: number } | undefined;
    if (cached && Date.now() - cached.fetchedAt < CATALOG_CACHE_TTL_MS) {
      cachedCatalog = cached;
      console.log("[菜單快取] 命中共用Firestore快取文件,只讀了1次,沒有重新查全部品牌");
      return cached.data;
    }
  } catch (err) {
    console.error("讀取共用菜單快取失敗,改成重新查詢完整菜單", err);
  }

  console.log("[菜單快取] 快取沒命中(過期或是第一次),真的重新查一次全部品牌+飲料");
  const brandsSnap = await db.collection("brands").get();

  const data = await Promise.all(
    brandsSnap.docs.map(async (brandDoc) => {
      const brandData = brandDoc.data();
      const drinksSnap = await db.collection("brands").doc(brandDoc.id).collection("drinks").get();
      return {
        id: brandDoc.id,
        name: brandData.name,
        slug: brandData.slug,
        icon: brandData.icon,
        drinks: drinksSnap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<CatalogDrink, "id">),
        })),
        addOns: (brandData.addOns as CatalogAddOn[] | undefined) ?? [],
      };
    })
  );

  const fetchedAt = Date.now();
  cachedCatalog = { data, fetchedAt };

  // 把剛查好的結果寫回共用快取文件,讓之後換到別的執行環境的請求也能直接用這份結果。
  // 寫入失敗一樣不影響這次查詢本身——這次拿到的data還是對的,頂多下次其他執行環境
  // 沒搶到這份快取、要自己重新查一次而已,所以同樣只記錄錯誤、不丟出去
  try {
    await cacheDocRef.set({ data, fetchedAt });
  } catch (err) {
    console.error("寫入共用菜單快取失敗", err);
  }

  return data;
}
