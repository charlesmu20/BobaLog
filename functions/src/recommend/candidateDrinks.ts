// 「推薦飲料」功能專用:把「這次要在哪些品牌裡找」(#144附近品牌清單、#145收藏、
// #147指定品牌查詢,都會算出一份品牌清單)裁切成真正要交給Gemini看的候選飲料清單。
//
// 不裁切的話,附近品牌一多,候選可能動輒幾百筆,浪費token也讓Gemini更難選——
// 規則訂為:每個品牌最多抽maxPerBrand款,整體不超過MAX_TOTAL款。
//
// 【修復】原本的做法是「一個品牌一個品牌輪流裁切,裁到MAX_TOTAL就整個停下來」——
// 這在情境二「有定位、附近品牌已經照Google排序,越近的在陣列越前面」時沒問題,
// 因為陣列順序本身就代表相關性。但情境二如果沒有定位(目前前端GPS還沒接,或是
// 使用者定位失敗),會退回查「整個資料庫」(目前是44個品牌),這時候brandDrinkPools
// 的順序只是資料庫回傳的任意順序,跟「哪個品牌真的符合使用者要的口味」完全沒關係——
// 實測發現使用者問「黑糖珍珠鮮奶」這種明明很多品牌都有賣的東西,卻完全配不到,
// 原因就是:陣列排在前面的那幾個品牌(不一定真的有黑糖珍珠鮮奶)就把30款預算用完了,
// 後面40個品牌(就算裡面真的有符合的飲料)根本沒機會被加進候選清單,Gemini連看都看不到。
//
// 修法:不要先一個品牌一個品牌各自裁切,改成把「所有品牌的所有飲料」先攤平成同一份清單,
// 整份用關鍵字排序(符合的排前面)之後,才依序挑進最終候選清單(同時顧每個品牌不超過
// maxPerBrand、整體不超過MAX_TOTAL)——這樣不管符合的飲料藏在哪個品牌,只要符合關鍵字
// 就會被排到前面優先選進候選,不會因為剛好不是陣列裡前幾個品牌就被犧牲掉。
//
// 【加入隨機性】原本「符合關鍵字的」跟「不符合的」這兩組裡面,組內順序完全照原始陣列順序
// (情境二有定位時代表「越近越前面」)排死死的——結果是同一個關鍵字、同一個定位,每次問
// 候選清單幾乎一樣,使用者會覺得「怎麼每次都推薦這幾杯」。改成組內用「距離加權隨機」
// (weightedShuffle):原本排越前面(越近)的候選,被排到前面的機率越高,但不是絕對,
// 排後面一點的也有機會被抽到前面——這樣同一個關鍵字問很多次,候選清單會不太一樣,
// 但整體還是偏向原本排序好的那些(通常是比較近的)。「符合關鍵字」永遠優先於「不符合」
// 這個大原則不變,只是各自組內不再是死板的固定順序。
// 配合這個改動,原本請Gemini「盡量選候選清單裡排前面、比較近的」這條指令(recommendGemini.ts)
// 也拿掉了,因為清單本身已經不是嚴格的近到遠排序,硬要Gemini偏好前面只會把隨機性抵銷掉。
// 品牌多樣性(三杯盡量不同品牌)也不是在這裡用程式碼寫死規則去保證,是用軟性指令交給
// Gemini自己判斷(使用者要求「軟性」,不要求強制一定要三個不同品牌)。

import type { CatalogBrand, CatalogDrink } from "../catalog";

export type CandidateDrink = { brand: CatalogBrand; drink: CatalogDrink };

const MAX_PER_BRAND = 8;
// 整體上限也要讓呼叫端拿得到(見下面maxPerBrand的說明),所以改成export
export const MAX_TOTAL = 30;

// brandDrinkPools:每個品牌要從哪個「候選池」裡抽,呼叫端自己決定——附近品牌通常
// 給整個菜單(brand.drinks),但像情境三使用者已經指定某款飲料時,候選池本來就只有
// 一兩款,呼叫端直接把那個子集傳進來就好,不用每次都假設要用整個菜單
//
// preferredKeywords:使用者這次講的口味關鍵字(例如情境二的「鮮奶類」,或情境一反問後
// 使用者選的類型)。裁切之前,先用這些關鍵字把「名稱/category/note裡有出現關鍵字」的
// 飲料排到前面——這裡只是寬鬆排序,不是精準分類,真正「這杯算不算鮮奶類」的判斷還是
// 交給Gemini做,這層只是確保可能相關的飲料不會在送到Gemini手上之前就被裁切邏輯誤殺
//
// maxPerBrand:預設是8,用來避免單一品牌(尤其是菜單很大的品牌)把候選名額全部佔滿,
// 犧牲掉多樣性。情境三(使用者指定了單一品牌)只有一個品牌在用這份預算,呼叫端會把
// maxPerBrand放寬到跟MAX_TOTAL一樣,只靠整體上限把關就好
export function buildCandidateDrinks(
  brandDrinkPools: { brand: CatalogBrand; drinks: CatalogDrink[] }[],
  preferredKeywords: string[] = [],
  maxPerBrand: number = MAX_PER_BRAND
): CandidateDrink[] {
  // 先攤平成同一份清單,不分品牌——真正的優先順序留給下面的關鍵字排序去決定
  const flat: CandidateDrink[] = [];
  for (const { brand, drinks } of brandDrinkPools) {
    for (const drink of drinks) {
      flat.push({ brand, drink });
    }
  }

  const prioritized = prioritizeByKeywords(flat, preferredKeywords);

  // 整份排序好的清單,依序挑進最終候選,同時顧「每個品牌不超過maxPerBrand」跟
  // 「整體不超過MAX_TOTAL」這兩個上限——符合關鍵字的飲料排在前面,會優先被挑中,
  // 不管它屬於哪個品牌、原本排在陣列第幾個
  const result: CandidateDrink[] = [];
  const countPerBrand = new Map<string, number>();
  for (const candidate of prioritized) {
    if (result.length >= MAX_TOTAL) break;
    const usedByThisBrand = countPerBrand.get(candidate.brand.id) ?? 0;
    if (usedByThisBrand >= maxPerBrand) continue;
    result.push(candidate);
    countPerBrand.set(candidate.brand.id, usedByThisBrand + 1);
  }

  return result;
}

// 把「名稱/category/note裡有出現任一關鍵字」的飲料排到前面,其餘排在後面——「符合關鍵字優先」
// 這個大順序還是固定的,但matched、rest各自組內部不再維持死板的原始順序,改用weightedShuffle
// 加權隨機洗牌(見下面說明)。沒有關鍵字可用時(例如使用者說「都可以」,整份都算同一組),
// 也要洗牌,不然同一個品牌每次都會拿到菜單順序最前面那幾杯
// 中文沒有空白分詞,單純字串包含比對沒辦法分辨「奶茶」跟「鮮奶茶」——「奶茶」兩個字
// 剛好是「鮮奶茶」的子字串,照字面比對的話使用者打「奶茶」也會把「鮮奶茶」「純鮮奶茶」
// 「英式鮮奶茶」這些都撈進來。但這兩種在手搖飲業界公認是不同的飲品(奶茶通常奶精基底,
// 鮮奶茶是鮮奶基底),使用者真的想喝鮮奶茶自己會打「鮮奶茶」,所以只排除「奶茶」前面
// 緊接著「鮮」字的那種情況;其他形容詞+奶茶的組合(「厚奶茶」「絲滑奶茶」「醇奶茶」
// 這類品牌自己取的行銷名稱,本質上還是奶茶)不受影響,一樣算符合
function includesKeyword(text: string, keyword: string): boolean {
  if (keyword !== "奶茶") return text.includes(keyword);
  let searchFrom = 0;
  while (true) {
    const index = text.indexOf(keyword, searchFrom);
    if (index === -1) return false;
    if (text[index - 1] !== "鮮") return true;
    searchFrom = index + 1;
  }
}

function matchesKeywords(drink: CatalogDrink, keywords: string[]): boolean {
  const text = `${drink.name} ${drink.category ?? ""} ${drink.note ?? ""}`;
  return keywords.some((keyword) => includesKeyword(text, keyword));
}

function prioritizeByKeywords(candidates: CandidateDrink[], keywords: string[]): CandidateDrink[] {
  if (keywords.length === 0) return weightedShuffle(candidates);

  const matched: CandidateDrink[] = [];
  const rest: CandidateDrink[] = [];
  for (const candidate of candidates) {
    (matchesKeywords(candidate.drink, keywords) ? matched : rest).push(candidate);
  }
  return [...weightedShuffle(matched), ...weightedShuffle(rest)];
}

// 檢查一份「品牌+飲料池」裡,有沒有任何一款飲料符合關鍵字——不裁切、不排序,純粹回答
// 「這個範圍裡到底有沒有相關的東西」。用在recommendCoordinator.ts情境二:附近品牌範圍
// 關鍵字完全比對不到的時候,要不要退回查整個資料庫,靠這支函式判斷
export function anyDrinkMatchesKeywords(
  brandDrinkPools: { brand: CatalogBrand; drinks: CatalogDrink[] }[],
  keywords: string[]
): boolean {
  if (keywords.length === 0) return true;
  return brandDrinkPools.some(({ drinks }) => drinks.some((drink) => matchesKeywords(drink, keywords)));
}

// 距離加權隨機洗牌:輸入陣列裡排越前面的(情境二有定位時代表越近),被洗牌後排到前面的
// 機率越高,但不是絕對——用「權重反比的隨機key」排序(Efraimidis-Spirakis加權抽樣的
// 簡化版本):每個候選的權重 = n - 原始位置(最前面權重最高是n,最後面最低是1),
// key = -Math.log(亂數) / 權重,權重越高key的期望值越小,但乘上-Math.log(亂數)之後
// 還是有運氣成分,所以排後面的偶爾也會被洗到前面去。最後依key由小到大排序就是洗牌結果。
function weightedShuffle(candidates: CandidateDrink[]): CandidateDrink[] {
  const n = candidates.length;
  if (n <= 1) return candidates;
  const withKey = candidates.map((candidate, index) => ({
    candidate,
    key: -Math.log(Math.random()) / (n - index),
  }));
  withKey.sort((a, b) => a.key - b.key);
  return withKey.map((w) => w.candidate);
}
