// 「推薦飲料」功能的總指揮——把#142~#148寫好的每一塊拼起來,決定這一輪對話
// 到底要怎麼回覆使用者。串起來的順序:
//
// 1. extractRecommendIntent(#148):聽懂使用者這句話——口味關鍵字、指定的品牌、提到的地點。
//    這句話跟推薦完全無關的話,到這裡就結束了,直接回文字。
// 2. 決定座標:使用者提到的地點名稱優先(resolveLocationName,#149新增),
//    沒提到或解析不到才退回用瀏覽器GPS(呼叫端傳進來的userLocation)。
// 3. 判斷情境,組出候選清單:
//    情境三(指定品牌)優先判斷,不管地點——resolveBrandDrinkQuery(#147)。
//    情境二(有口味關鍵字)——用附近品牌(有座標的話)或整個catalog,candidateDrinks.ts
//    的preferredKeywords確保關鍵字相關的飲料不會被裁切掉。
//    情境一(什麼都沒給)——一律反問使用者想喝什麼類型,不直接推薦。
//    【決策】原本這裡會先查收藏(favoriteBrands.ts,#145),有收藏就跳過反問直接推薦——
//    後來討論覺得這樣不對:收藏代表的是「長期喜歡的飲料」,不等於「現在這一刻想喝什麼」,
//    使用者說「都可以/沒想法」時直接端出收藏內容,等於沒問清楚就幫他決定,跟整個推薦功能
//    一路在做的「減少隨機感、讓使用者自己選」方向衝突,所以拿掉了,全部一律先反問。
//    收藏功能本身還在,只是推薦這裡不再呼叫它——favoriteBrands.ts這支檔案後來
//    確認完全沒有其他地方在用(純死碼),已經整支刪除,不是留著沒呼叫。
// 4. 有候選清單的情況,交給pickRecommendation(#148)挑幾杯+給理由。
//    情境一反問完,使用者回答後會帶著關鍵字再問一次,下一輪就會走進情境二,
//    用真正查到的候選資料推薦,不是憑空亂猜。

import type { Firestore } from "firebase-admin/firestore";
import type { ChatTurn } from "../gemini";
import type { CatalogBrand, CatalogDrink } from "../catalog";
import { loadCatalog } from "../catalog";
import { findNearbyBrands } from "./nearbyBrands";
import { resolveBrandDrinkQuery } from "./recommendCatalog";
import { buildCandidateDrinks, anyDrinkMatchesKeywords, MAX_TOTAL, type CandidateDrink } from "./candidateDrinks";
import { resolveLocationName } from "./places";
import {
  extractRecommendIntent,
  pickRecommendation,
  buildClarifyingQuestion,
  buildBrandClarifyingQuestion,
  type RecommendIntentResult,
} from "./recommendGemini";

// reply:單純回一段文字(跟推薦無關、找不到品牌、候選清單挑不出東西都算這種)
// recommendation:真的選出一杯飲料了,有明確理由——使用者有給線索(關鍵字/品牌),
//                 Gemini判斷只剩這一杯真的合適
// multiplePicks:挑了幾杯(2~3杯)列出來,畫成幾張小卡片(logo+品牌+飲料名稱+連去菜單頁的
//               按鈕),不是文字清單。reason選填——情境二/情境三「有講口味關鍵字」的情況,
//               Gemini會給一句說明這幾杯為什麼符合的共同理由,卡片上方會顯示這句;情境三
//               使用者明確說「都可以」的情況,沒有理由可言(硬掰一句「適合你」反而怪),
//               reason就不填,前端看到undefined就不顯示那段文字
// clarify:反問使用者,text是問題全文,tasteOptions是六個固定口味選項(前端可以拿去渲染按鈕)
// hasMore(配合multiplePicks):候選清單裡符合條件的飲料,是不是比這次列出來的還多——
// true的話前端會多畫一顆「看看其他選項」按鈕,讓使用者不用自己手動打「還有其他選項嗎」,
// 點一下就等於送出那句話。判斷方式是看candidates.length(整份候選清單,還沒被Gemini挑選前)
// 是不是比這次picks的數量多,不是真的保證「一定還找得到不一樣的」——如果候選裡符合口味的
// 真的被挑光了,使用者點了按鈕,也只會像平常問「還有其他的嗎」一樣,收到Gemini老實回覆
// 「目前沒有其他符合的了」,不是致命問題
export type RecommendChatResult =
  | { type: "reply"; text: string }
  | { type: "recommendation"; brand: CatalogBrand; drink: CatalogDrink; reason: string }
  | {
      type: "multiplePicks";
      picks: { brand: CatalogBrand; drink: CatalogDrink }[];
      reason?: string;
      hasMore: boolean;
    }
  | { type: "clarify"; text: string; tasteOptions: string[] };

export async function resolveRecommendChat(
  db: Firestore,
  geminiApiKey: string,
  placesApiKey: string,
  // uid目前沒用到——情境一拿掉收藏判斷之後,這支函式裡沒有任何地方需要知道是哪個使用者。
  // 還是留著這個參數,保留跟index.ts呼叫端一致的介面,之後如果又要接回收藏或其他
  // 跟使用者綁定的判斷,不用再改一次呼叫端
  uid: string,
  message: string,
  history: ChatTurn[],
  userLocation: { lat: number; lng: number } | null
): Promise<RecommendChatResult> {
  // ===== 1. 聽懂使用者在講什麼 =====
  const intent = await extractRecommendIntent(geminiApiKey, message, history);
  if (intent.type === "reply") {
    return { type: "reply", text: intent.text };
  }

  return await resolveRecommendChatFromIntent(db, geminiApiKey, placesApiKey, message, history, userLocation, intent);
}

// 把「已經知道intent之後」的邏輯(情境判斷、組候選、呼叫Gemini挑選)獨立出來——
// 統一聊天入口(chatAssistant/routeMessage.ts)會用同一次合併呼叫就抽出intent,
// 不需要再讓這支函式自己重打一次extractRecommendIntent,直接把intent傳進來接著跑就好。
// resolveRecommendChat(上面那支)維持原本單獨呼叫的介面,內部呼叫這支,行為完全不變
export async function resolveRecommendChatFromIntent(
  db: Firestore,
  geminiApiKey: string,
  placesApiKey: string,
  message: string,
  history: ChatTurn[],
  userLocation: { lat: number; lng: number } | null,
  intent: Extract<RecommendIntentResult, { type: "intent" }>
): Promise<RecommendChatResult> {
  const catalog = await loadCatalog(db);

  // ===== 情境三:指定了品牌,不用管地點,直接查這個品牌底下的飲料 =====
  if (intent.brandNameRaw) {
    const query = resolveBrandDrinkQuery(intent.brandNameRaw, catalog);
    if (query.type !== "inBrand") {
      return {
        type: "reply",
        text: `不好意思,我這邊找不到「${intent.brandNameRaw}」這個品牌,要不要換一個名稱試試看?`,
      };
    }

    // 只有品牌、沒有口味關鍵字——先反問這個品牌想喝哪種類型,不要直接亂挑。
    // 只有使用者「明確表示沒差」(noPreference)才放行,跳過反問直接去挑;
    // 第一次單純沒提到口味(noPreference是false)就先反問,避免像「不知道要喝什麼類型」
    // 這種話也直接被當成「隨便」處理
    if (intent.keywords.length === 0 && !intent.noPreference) {
      const clarifying = buildBrandClarifyingQuestion(query.brand.name);
      return { type: "clarify", text: clarifying.text, tasteOptions: clarifying.tasteOptions };
    }

    // 只有這一個品牌在用候選名額,不用像情境二那樣限制「每個品牌最多8款」,
    // 把maxPerBrand放寬到跟整體上限一樣,只靠MAX_TOTAL把關就好(詳見candidateDrinks.ts的註解)
    const candidates = buildCandidateDrinks(
      [{ brand: query.brand, drinks: query.drinks }],
      intent.keywords,
      MAX_TOTAL
    );
    // 使用者明確說沒差的話,一樣交給pickRecommendation(#148)挑,沿用它原本就有的
    // 「預設3杯、問還有其他的時避開已經列過的」邏輯——不用另外做一套亂數抽選機制,
    // 不然「還有其他的嗎」這種追問會變成兩套不同的實作在各自維護要不要重複。
    // 差別只在顯示方式:asCardsWithoutReason讓結尾那段把理由拿掉、包成卡片陣列回傳,
    // 不要像平常帶關鍵字挑選時那樣畫成有理由的文字清單——畢竟使用者自己都說沒差了,
    // 硬掰一個「適合你」的理由反而奇怪
    return await pickFromCandidates(geminiApiKey, message, history, candidates, {
      asCardsWithoutReason: intent.keywords.length === 0 && intent.noPreference,
    });
  }

  // ===== 2. 決定座標:使用者提到的地點名稱優先,沒有才退回瀏覽器GPS =====
  // 【錯誤處理】resolveLocationName、findNearbyBrands內部打Google Places API失敗時會
  // throw(配額用完、網路不穩等)——用try/catch接住,當作「這次查不到」處理就好,不要讓
  // Places API一時打嗝就搞到整句推薦直接失敗。反正程式本來就有「沒有地點資訊」的退路
  // (地點解析不到就用瀏覽器GPS、沒有座標就退回查全部品牌),出錯跟「本來就查不到」
  // 走的是同一條路,使用者感受不到差別,只是少了地理篩選這個優化
  let location = userLocation;
  if (intent.mentionedLocationRaw) {
    try {
      const resolved = await resolveLocationName(placesApiKey, intent.mentionedLocationRaw);
      if (resolved) {
        location = resolved;
      }
    } catch (err) {
      console.error("[推薦]resolveLocationName失敗,當作解析不到地點處理:", err);
    }
  }

  let nearbyResult: Awaited<ReturnType<typeof findNearbyBrands>> | null = null;
  if (location) {
    try {
      nearbyResult = await findNearbyBrands(placesApiKey, location, catalog);
    } catch (err) {
      console.error("[推薦]findNearbyBrands失敗,當作沒有附近品牌資料處理:", err);
    }
  }
  const nearbyBrands = nearbyResult ? nearbyResult.brands : null;

  // ===== 情境二:有口味關鍵字,不用反問,直接拿附近品牌(有座標)或全部品牌去找候選 =====
  if (intent.keywords.length > 0) {
    const pool = nearbyBrands ?? catalog;

    // 【修復】候選範圍原本鎖定在附近品牌就不會再退回整個資料庫——但附近品牌剛好都沒賣
    // 使用者要的東西時(例如附近只查到50嵐、清心福全,使用者問的「綠豆沙」卻是CoCo都可、
    // 水巷茶弄才有),關鍵字在這份候選池裡會完全比對不到,Gemini只能誠實回覆「沒有」,
    // 但使用者根本不知道這其實是因為搜尋範圍被限制在附近、不是整個系統真的沒有。
    // 修法:只有「候選範圍真的是附近品牌(nearbyResult.type === 'nearby')」而且在這份
    // 附近名單裡關鍵字完全比對不到的時候,才整個改查全資料庫,並且在回覆裡附註
    // 「附近沒有,這是全部品牌裡找到的」,讓使用者知道哪裡買得到,不是單純說沒有
    const isNearbyPool = nearbyResult?.type === "nearby";
    const nearbyPoolHasMatch = isNearbyPool
      ? anyDrinkMatchesKeywords(
          pool.map((brand) => ({ brand, drinks: brand.drinks })),
          intent.keywords
        )
      : true;
    const fallbackToAllBrands = isNearbyPool && !nearbyPoolHasMatch;
    const effectivePool = fallbackToAllBrands ? catalog : pool;

    const candidates = buildCandidateDrinks(
      effectivePool.map((brand) => ({ brand, drinks: brand.drinks })),
      intent.keywords
    );
    // nearbyNote:候選範圍真的是「附近品牌」而且有找到符合的(不是定位失敗、附近沒比對到
    // 品牌、或這次退回查全資料庫的情況)——附註「這是根據附近推薦的」。
    // fallbackNote:附近品牌裡關鍵字完全沒中、改查全資料庫的情況——附註「附近沒有,
    // 這是全部品牌裡找到的」,兩個註記只會出現一個
    return await pickFromCandidates(geminiApiKey, message, history, candidates, {
      nearbyNote: isNearbyPool && !fallbackToAllBrands,
      fallbackNote: fallbackToAllBrands,
    });
  }

  // ===== 情境一:什麼都沒給——一律反問,不直接推薦(見檔案開頭的決策說明) =====
  // 這裡如果使用者連反問之後都回「都可以」,不要像情境三那樣放寬去挑——情境三至少
  // 還有「使用者指定的品牌」這個範圍,隨便選也選得有限度;情境一完全沒有品牌也沒有口味,
  // 範圍是整個catalog,硬要選等於憑空亂推薦,還是老實說需要至少一個線索才能幫忙
  if (intent.noPreference) {
    return {
      type: "reply",
      text: "不好意思,我這邊至少需要知道你想喝的類型,或是想喝哪個品牌,才能幫你推薦喔,要不要告訴我看看?",
    };
  }

  // 完全沒有地點資訊的時候才多問一句「附近有什麼店」,已經知道座標就不用問這個,
  // 後端自己查得到
  const clarifying = buildClarifyingQuestion({ askNearbyBrand: location === null });
  return { type: "clarify", text: clarifying.text, tasteOptions: clarifying.tasteOptions };
}

// 候選清單組好之後的最後一步都一樣:清單是空的就老實說找不到,
// 不然就交給pickRecommendation(#148)挑幾杯——情境三、情境二都共用這段收尾
// (情境一現在一律反問,不會組候選清單,所以不會走到這裡)
//
// asCardsWithoutReason:情境三使用者明確說「都可以」時會傳true——這種情況一樣呼叫
// pickRecommendation(不自己另外做亂數邏輯,原因見呼叫端的註解),只是把Gemini給的
// 理由拿掉,因為沒有真正的理由可言
//
// nearbyNote:情境二真的有用到附近品牌、而且附近品牌裡有找到符合的(不是退回查整個catalog)
// 時會傳true——在結果裡附註一句「這是根據附近推薦的」,讓使用者知道這份推薦有把距離考慮進去,
// 不是完全不管位置。
// fallbackNote:情境二附近品牌裡關鍵字完全比對不到、改查全資料庫時會傳true——在結果裡附註
// 「附近沒有,這是全部品牌裡找到的」,讓使用者知道哪裡買得到,不是單純回覆「沒有」。
// 這兩個註記互斥,呼叫端不會同時傳true
function appendNote(reason: string, options: { nearbyNote?: boolean; fallbackNote?: boolean }, forOptions: boolean): string {
  if (options.fallbackNote) {
    return `${reason}(附近的品牌沒有找到,這是全部合作品牌裡${forOptions ? "整理的推薦" : "找到的"},出發前記得先確認一下附近有沒有分店)`;
  }
  if (options.nearbyNote) {
    return `${reason}(這是根據你附近的飲料店${forOptions ? "整理的推薦" : "推薦的"})`;
  }
  return reason;
}

async function pickFromCandidates(
  apiKey: string,
  message: string,
  history: ChatTurn[],
  candidates: CandidateDrink[],
  options: { asCardsWithoutReason?: boolean; nearbyNote?: boolean; fallbackNote?: boolean } = {}
): Promise<RecommendChatResult> {
  if (candidates.length === 0) {
    return { type: "reply", text: "不好意思,目前找不到符合的選項,要不要換個條件試試看?" };
  }

  const picked = await pickRecommendation(apiKey, message, history, candidates);

  if (picked.type === "picked") {
    // 單選一律當作recommendation畫成那張比較大的單一卡片,不管有沒有附近備註/
    // 要不要附理由,這點不受asCardsWithoutReason影響——只有多選(options)才會因為
    // asCardsWithoutReason決定要不要帶理由
    if (options.asCardsWithoutReason) {
      return {
        type: "multiplePicks",
        picks: [{ brand: picked.brand, drink: picked.drink }],
        hasMore: candidates.length > 1,
      };
    }
    const reason = appendNote(picked.reason, options, false);
    return { type: "recommendation", brand: picked.brand, drink: picked.drink, reason };
  }

  if (picked.type === "options") {
    // 使用者想看幾個選項——統一畫成幾張小卡片(MultiplePicksCards),不是文字清單。
    // 有理由的話(一般情境二/情境三帶關鍵字的情況)一起帶上去,卡片上方會顯示這句共同理由;
    // asCardsWithoutReason(使用者明確說都可以)的情況就不帶理由
    const hasMore = candidates.length > picked.options.length;
    if (options.asCardsWithoutReason) {
      return { type: "multiplePicks", picks: picked.options, hasMore };
    }
    const reason = appendNote(picked.reason, options, true);
    return { type: "multiplePicks", picks: picked.options, reason, hasMore };
  }

  if (picked.type === "invalidIndex") {
    // 防呆用,理論上不該發生——Gemini選了候選清單範圍外的編號
    return { type: "reply", text: "不好意思,我這邊選擇的時候出了點問題,可以再說一次你的需求嗎?" };
  }
  return { type: "reply", text: picked.text };
}
