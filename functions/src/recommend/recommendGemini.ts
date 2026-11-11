// 「推薦飲料」功能專用,負責跟Gemini溝通的兩個時機:
//
// (1) extractRecommendIntent:看使用者這句話(可能是第一句,也可能是反問之後的回答),
//     抽取出情境判斷需要的資訊——口味關鍵字、指定的品牌名稱、提到的地點名稱。
//     抽出來的是「使用者原始講法」,比對是否真的存在是後端(catalog.ts/matchBrand等)的工作,
//     這裡只負責聽懂使用者在講什麼,跟extractLogDraft.ts的角色分工原則一樣。
//
// (2) pickRecommendation:協調函式(#149)已經組好一份真實存在的候選飲料清單之後,
//     交給Gemini從清單裡挑一杯、說明理由——Gemini只能回傳清單裡的編號(index),
//     不能自己瞎掰品牌或飲料名稱,這是跟舊版做法A(自由發揮,沒有比對真實資料)最大的差別。
//
// 「要不要反問使用者口味」這個判斷,不是Gemini的工作,是協調函式看「有沒有候選清單」
// 直接決定的(沒candidates就反問,有candidates就呼叫pickRecommendation)——反問的問題文字
// 跟選項是固定模板(見下面buildClarifyingQuestion),不需要另外呼叫Gemini生成,因為選項內容
// 本來就固定、不需要語意判斷

import { FunctionDeclaration, GoogleGenAI } from "@google/genai";
import type { ChatTurn } from "../gemini";
import type { CandidateDrink } from "./candidateDrinks";

// ========== 固定反問模板(不呼叫Gemini) ==========

// 情境一反問使用者時,口味類型固定六選(可多選)——跟candidateDrinks.ts的preferredKeywords
// 直接對上,使用者選了哪些,就原封不動當作關鍵字傳回去用就好
export const TASTE_OPTIONS = ["純茶", "水果茶", "奶茶", "鮮奶類", "奶蓋", "無咖啡因"];

// 組反問文字跟選項,純資料處理、不呼叫Gemini——這些問題內容本來就是固定模板,沒有需要語意判斷的地方。
// askNearbyBrand:只有「使用者拒絕定位/定位失敗」這種情況才要多問一句「附近有看到什麼店」,
// 一般情境一(已經知道使用者位置,只是附近沒有符合的收藏)不需要問這個,因為後端已經知道附近有哪些品牌了
export function buildClarifyingQuestion(options: { askNearbyBrand: boolean }): {
  text: string;
  tasteOptions: string[];
} {
  const lines = [
    "想喝什麼類型的飲料呢?可以選一個或多個,也可以自己打字告訴我:",
    TASTE_OPTIONS.join(" / "),
    "有特別喜歡的品牌嗎?(選填)",
  ];
  if (options.askNearbyBrand) {
    lines.push("附近有看到什麼手搖飲店嗎?(選填,我會幫你看看有沒有符合的)");
  }
  return { text: lines.join("\n"), tasteOptions: TASTE_OPTIONS };
}

// 情境三(使用者已經指定品牌,但還沒講口味)專用的反問——跟情境一的buildClarifyingQuestion
// 很像,只是開頭要點名這個品牌,讓使用者知道「我們聽到品牌了,只是還缺口味這個線索」,
// 不是從頭問起
export function buildBrandClarifyingQuestion(brandName: string): {
  text: string;
  tasteOptions: string[];
} {
  const lines = [
    `想喝${brandName}的哪種類型呢?可以選一個或多個,也可以自己打字告訴我:`,
    TASTE_OPTIONS.join(" / "),
    "或者都可以,讓我隨便幫你選也行!",
  ];
  return { text: lines.join("\n"), tasteOptions: TASTE_OPTIONS };
}

// ========== (1) extractRecommendIntent ==========

// intent:有抽到跟推薦相關的線索(就算使用者什麼都沒講,keywords/brandNameRaw/
//        mentionedLocationRaw全部留空,也算一種「有效」的intent,表示「沒有額外資訊,
//        後端請用預設方式處理」,跟完全不相關的reply是不同情況)
// reply:這句話跟飲料推薦完全無關(打招呼、問別的事),Gemini直接回一段文字,不算抽取
// noPreference:使用者這句話明確表示「沒有偏好、讓你決定」(例如『都可以』『隨便』『你決定』),
//              或是在已經給過推薦之後問「還有其他的嗎/還有別的選擇嗎」卻沒有補充新的具體偏好——
//              這兩種都算。要跟「單純還沒提到偏好」分開看:像第一次問「幫我推薦飲料」這種,
//              使用者只是還沒講,不代表他「明確表示」沒差,這種noPreference要是false,
//              讓協調函式照舊反問;只有使用者這句話真的在表達「我沒差/你決定」的時候才是true,
//              這樣協調函式才知道「已經問過了,不用再問一次,可以照使用者說的放寬條件去選」
// nearbyBrandNamesRaw:跟brandNameRaw是兩件不一樣的事,不要混用——brandNameRaw是使用者
// 「明確指定想喝這個品牌」(情境三,候選範圍會鎖定只剩這一家);nearbyBrandNamesRaw是使用者
// 單純在回答「附近有看到什麼店?」這個反問(只有定位失敗/沒給座標時才會問),列出來的
// 可能有好幾家,只是用來當作「附近品牌」這個地理篩選範圍的替代資料來源,不代表使用者
// 一定要喝哪一家——所以設計成陣列,不是跟brandNameRaw共用同一個單數欄位
export type RecommendIntentResult =
  | {
      type: "intent";
      keywords: string[];
      brandNameRaw: string | null;
      mentionedLocationRaw: string | null;
      nearbyBrandNamesRaw: string[];
      noPreference: boolean;
    }
  | { type: "reply"; text: string };

// 【表單格式定義】三個欄位都選填,因為使用者可能什麼都沒講(這時候還是要呼叫工具,
// 只是keywords給空陣列、brandName/mentionedLocation不填),讓協調函式知道「這句話是在問推薦,
// 只是沒有額外資訊」,跟「這句話根本不是在問推薦」(=reply)分開處理
// 有export出去——統一聊天入口(chatAssistant/routeMessage.ts)會把這個declaration跟
// create_log_draft一起掛在同一次Gemini呼叫裡,讓Gemini自己判斷要呼叫哪一個,不是分開打兩次
export const EXTRACT_INTENT_DECLARATION: FunctionDeclaration = {
  name: "extract_recommend_intent",
  description:
    "使用者在問飲料推薦相關的問題時,呼叫這個工具,整理出使用者這句話裡跟推薦有關的線索," +
    "即使使用者什麼都沒提到也要呼叫(這時候全部欄位留空),表示『目前沒有額外資訊,請用預設方式處理』",
  parametersJsonSchema: {
    type: "object",
    properties: {
      keywords: {
        type: "array",
        items: { type: "string" },
        description:
          "使用者提到的口味/飲料類型關鍵字,例如純茶、水果茶、奶茶、鮮奶類、奶蓋、無咖啡因," +
          "或使用者自己講的其他口味描述(例如清爽、甜一點、不要咖啡因之類),沒提到就給空陣列。" +
          "【重要】這個陣列不是只能放使用者原本講的那一個詞——後端是拿這些詞去飲料的名稱/分類/" +
          "備註裡做字串比對,符合任何一個就算。同一個意思,不同品牌常常用不同字眼寫在菜單上" +
          "(例如同樣是水果茶,有品牌寫『水果茶』,也有品牌寫『鮮果茶』)。除了使用者原本講的詞," +
          "請多想1~3個同樣意思、手搖飲菜單上常見的具體寫法一起填進去,增加比對到的機會——" +
          "尤其使用者講的是比較抽象的口感形容詞(例如『清爽』『解膩』這種不會直接寫在飲料名稱上" +
          "的詞)時更需要補。不用展開到太發散,2~4個關鍵字、挑最常見的幾種寫法就好,避免塞進" +
          "太籠統的單一個字(例如單一個『茶』字)反而把不相關的也一起撈進來。" +
          "【重要】如果對話紀錄裡之前已經確立過關鍵字(例如使用者說過『奶蓋』,已經推薦過幾杯)," +
          "這次使用者是問『還有其他的嗎』『還有別的選擇嗎』這種沒有講新偏好的話,要把之前確立的" +
          "關鍵字原封不動填回來(不要因為這句話本身沒提到就留空),表示『還是同一個需求,只是要看更多』",
      },
      brandName: {
        type: "string",
        description:
          "使用者指定想喝的品牌名稱,照使用者原本的講法填,沒有指定就不要填這個欄位。" +
          "同樣地,如果對話紀錄裡之前已經確立過品牌,這次只是問『還有其他的嗎』,也要把這個品牌" +
          "原封不動填回來,不要留空",
      },
      mentionedLocation: {
        type: "string",
        description:
          "使用者提到的地點名稱(例如中山捷運站、台北車站、公司),用來找這個地點附近的店," +
          "沒有提到地點就不要填這個欄位",
      },
      nearbyBrandNames: {
        type: "array",
        items: { type: "string" },
        description:
          "【跟brandName不一樣,請分清楚】這個欄位專門用來接『附近有看到什麼手搖飲店嗎?』這句" +
          "反問的答案——使用者只是在列出附近實際看到的店,可能一家,也可能好幾家,不代表" +
          "使用者一定要喝哪一家,只是提供地理範圍讓後端去查這些店裡有沒有符合口味的飲料。" +
          "跟brandName的差別:brandName是使用者明確表示『我就是想喝這個品牌』,只會有一個;" +
          "這個欄位是單純列出附近看到的店家,用陣列,沒有限制只能填一個。" +
          "如果使用者這句話沒有在回答『附近有看到什麼店』,或完全沒提到任何店名,就不要填。" +
          "同樣地,如果對話紀錄裡之前已經確立過這份清單,這次使用者是問『還有其他的嗎』," +
          "也要把這份清單原封不動填回來,不要留空",
      },
      noPreference: {
        type: "boolean",
        description:
          "使用者這句話是否『明確表示』沒有偏好、讓你自己決定(例如『都可以』『隨便』『你決定』)," +
          "或是已經收到推薦後問『還有其他的嗎』『還有別的選擇嗎』卻沒有補充新的具體偏好。" +
          "如果使用者只是單純還沒提到任何偏好(例如第一次就說『幫我推薦飲料』),這裡要填false," +
          "不是true——noPreference專門表示『使用者講出了沒差這件事』,不是『使用者沒講』",
      },
    },
    required: ["keywords", "noPreference"],
  },
};

// 同樣有export出去——統一聊天入口組合指令時,會把這段原封不動接進去,不會改寫內容,
// 只在外層多加一段「這次兩個工具都有可能,怎麼判斷要用哪一個」的仲裁說明
export const EXTRACT_INTENT_SYSTEM_INSTRUCTION =
  "你是BobaLog這個手搖飲紀錄App裡的飲料推薦小幫手。使用者會用文字描述想喝什麼飲料,或者回答你" +
  "之前反問的問題(口味類型、喜歡的品牌、附近的店)。只要使用者的訊息跟『想喝什麼、要推薦什麼』" +
  "有關,就呼叫extract_recommend_intent這個工具,把你聽到的線索填進去——即使使用者完全沒提到" +
  "任何具體資訊(例如只說『推薦我喝什麼』『不知道想喝什麼』),也要呼叫這個工具,把keywords留成" +
  "空陣列、其他欄位都不填,表示『沒有額外資訊,請後端用預設方式處理』。" +
  "noPreference這個欄位要特別注意:只有使用者『明確表示』沒有偏好、讓你決定" +
  "(例如『都可以』『隨便』『你決定』),或是已經收到推薦後問『還有其他的嗎』卻沒有補充新偏好," +
  "才填true;使用者只是單純還沒提到任何偏好(像剛開口問『幫我推薦飲料』),這裡要填false。" +
  "【重要】keywords這個陣列不是只能照抄使用者講的那一個詞——後端是拿這些詞去飲料的名稱/分類/" +
  "備註裡做字串比對,符合任何一個就算。同一個意思不同品牌常常用不同字眼寫在菜單上(例如同樣是" +
  "水果茶,有品牌寫『水果茶』,也有品牌寫『鮮果茶』),所以除了使用者原本講的詞,請多想1~3個" +
  "同樣意思、手搖飲菜單上常見的具體寫法一起填進去——使用者講的是比較抽象的口感形容詞" +
  "(例如『清爽』『解膩』)時更需要補幾個具體一點的詞。2~4個關鍵字、挑最常見的幾種寫法就好," +
  "不用展開到太發散,也避免塞進太籠統的單一個字(例如單一個『茶』字)。" +
  "【重要】使用者問『還有其他的嗎』時,noPreference填true的同時,也別忘了把對話紀錄裡" +
  "之前已經確立的keywords/brandName/nearbyBrandNames原封不動填回去,不要因為這句話本身" +
  "沒有重複講一次就留空——這兩件事是分開的:noPreference表示『這句話沒有補充新偏好』," +
  "keywords/brandName/nearbyBrandNames則是『整個對話到目前為止已經確立的偏好』," +
  "三者要同時正確填寫。" +
  "【重要,請分清楚brandName跟nearbyBrandNames】這是兩個完全不同的欄位,不要混用:" +
  "brandName是使用者『明確表示想喝這個品牌』(例如『我想喝50嵐』),只會是單一一個品牌;" +
  "nearbyBrandNames是使用者在回答你問的『附近有看到什麼手搖飲店嗎?』這句話,單純列出" +
  "附近實際看到的店家,可能列出一家,也常常是好幾家,這種情況下不管列出幾家,都要填進" +
  "nearbyBrandNames這個陣列,不要只挑一家填進brandName、把其他家漏掉——這跟『使用者指定" +
  "想喝哪個品牌』是兩回事,使用者只是在幫忙描述附近環境,沒有要你鎖定其中一家。" +
  "如果使用者的訊息跟飲料推薦完全無關(例如打招呼、問別的事情),不要呼叫工具,直接用自然、" +
  "簡短、親切的語氣回覆文字就好。" +
  "回覆的文字一律用純文字,不要用任何markdown語法(例如**粗體**、_斜體_、#標題、-項目符號等)。";

// 把Gemini呼叫extract_recommend_intent的結果(args)轉成RecommendIntentResult的intent分支——
// 單獨抽出來,這樣統一聊天入口(routeMessage.ts)判斷出這次是推薦、要處理同一次合併呼叫裡的
// 結果時,可以直接重用這段解析邏輯,不用自己再複製一份同樣的轉換規則
export function buildRecommendIntentFromArgs(args: {
  keywords?: string[];
  brandName?: string;
  mentionedLocation?: string;
  nearbyBrandNames?: string[];
  noPreference?: boolean;
}): Extract<RecommendIntentResult, { type: "intent" }> {
  return {
    type: "intent",
    keywords: args.keywords ?? [],
    brandNameRaw: args.brandName ?? null,
    mentionedLocationRaw: args.mentionedLocation ?? null,
    nearbyBrandNamesRaw: args.nearbyBrandNames ?? [],
    noPreference: args.noPreference ?? false,
  };
}

// 原本這裡還有一支export async function extractRecommendIntent(),自己單獨打一次Gemini
// (只帶extract_recommend_intent這一個工具)——是記帳/推薦分開兩個模式時代的入口。
// 統一聊天入口(chatAssistant/routeMessage.ts)改成記帳跟推薦兩組工具定義同時掛在
// 同一次Gemini呼叫裡之後,已經沒有任何地方會走這支單獨呼叫的路徑,整支已確認是死碼刪除。
// 現在的流程是:routeMessage.ts一次呼叫→用上面這支buildRecommendIntentFromArgs組出intent
// →直接丟給recommendCoordinator.ts的resolveRecommendChatFromIntent,不會再經過這裡

// ========== (2) pickRecommendation ==========

// picked:Gemini從候選清單裡選了剛好一杯,附上推薦理由——這種情況現在比較少見,
//        只有候選清單真的只剩一個合理選擇,或使用者明確表示要你直接幫忙決定
//        (例如『你選就好』『隨便』)時才會發生。這種情況畫成推薦卡片
//        (前端那張logo+品牌+飲料+按鈕的卡片)
// options:【預設行為】挑最多3杯列出來讓使用者自己選,不是只挑一杯硬塞——
//         避免使用者講「我要奶茶」這種還算模糊的需求時,後端等於隨機幫他決定一杯,
//         讓使用者自己比較幾個選項感覺比較不隨機。候選裡真的符合的不到3杯,
//         就有幾杯列幾杯,不用硬湊到3杯而列進不符合的。這種情況不用畫成卡片,
//         純文字條列就好——由協調函式(recommendCoordinator.ts)自己把品牌+飲料名稱
//         排成一份文字清單,不是讓Gemini自己寫,保證列出來的都是候選清單裡真實存在的東西
// invalidIndex:Gemini回傳的編號全部都在候選清單範圍外(防呆用——理論上不該發生,
//              但Gemini畢竟是語言模型,不能完全排除它數錯編號的情況)
// reply:Gemini覺得清單裡沒有任何一杯真的符合使用者需求,沒有呼叫工具,直接回文字老實說
export type PickRecommendationResult =
  | { type: "picked"; brand: CandidateDrink["brand"]; drink: CandidateDrink["drink"]; reason: string }
  | { type: "options"; options: { brand: CandidateDrink["brand"]; drink: CandidateDrink["drink"] }[]; reason: string }
  | { type: "invalidIndex" }
  | { type: "reply"; text: string };

const PICK_RECOMMENDATION_DECLARATION: FunctionDeclaration = {
  name: "pick_recommendation",
  description:
    "從提供的候選飲料清單裡,挑出要推薦給使用者的飲料,並說明理由。預設挑3杯讓使用者自己比較" +
    "選擇,不要只挑一杯硬塞;如果清單裡真的符合的不到3杯,就有幾杯挑幾杯,不用硬湊。" +
    "只有候選清單裡真的只剩一個合理選擇,或使用者很明確表示要你直接幫忙決定" +
    "(例如『你選就好』『隨便』),才挑剛好一杯。如果使用者是問『還有其他的嗎』『還有別的選擇嗎』," +
    "要從對話紀錄裡看出之前已經推薦過哪些飲料,這次改挑還沒推薦過的,不要重複列出同一杯。" +
    "候選清單的排列順序沒有特別意義,不代表距離或任何優先順序,挑選時只需要看口味符不符合," +
    "不用考慮清單裡的前後位置。挑3杯的時候盡量來自不同品牌,不要三杯都選同一個品牌,除非清單裡" +
    "符合條件的品牌真的只有一兩個,這種情況才可以同一品牌選多款",
  parametersJsonSchema: {
    type: "object",
    properties: {
      indexes: {
        type: "array",
        items: { type: "number" },
        description: "候選清單裡要推薦的編號,預設填3個;候選不足3個或情境只適合單選時才填更少",
      },
      reason: { type: "string", description: "用一兩句話說明為什麼推薦這幾杯,語氣親切" },
    },
    required: ["indexes", "reason"],
  },
};

// 把candidates陣列排版成Gemini看得懂的純文字清單,一行一杯:「編號. 品牌 - 飲料(分類)」
function buildCandidateListText(candidates: CandidateDrink[]): string {
  return candidates
    .map((c, i) => {
      const category = c.drink.category ? `(${c.drink.category})` : "";
      return `${i}. ${c.brand.name} - ${c.drink.name}${category}`;
    })
    .join("\n");
}

// 候選清單是每次呼叫才知道的動態資料,所以系統指令也要動態組——把清單文字直接寫進
// system instruction裡,跟extractLogDraft.ts那種固定不變的系統指令不一樣
function buildPickSystemInstruction(candidates: CandidateDrink[]): string {
  return (
    "你是BobaLog這個手搖飲紀錄App裡的飲料推薦小幫手。這裡有一份真實存在的候選飲料清單," +
    "每一行是「編號. 品牌 - 飲料(分類)」:\n" +
    buildCandidateListText(candidates) +
    "\n\n你要根據使用者描述的口味、場合等偏好,從上面清單裡挑出符合的飲料,呼叫" +
    "pick_recommendation這個工具,indexes填清單上的編號。預設請挑3個編號,讓使用者自己比較" +
    "看看,不要只挑一個就定案;如果清單裡真的符合的不到3杯,就有幾杯挑幾杯,不用硬湊進不符合的。" +
    "只有清單裡真的只剩一個合理選擇,或使用者很明確表示要你直接幫忙決定(例如『你選就好』" +
    "『隨便』),才只挑一個編號。" +
    "如果對話紀錄裡,你之前已經推薦過幾杯,這次使用者是在問『還有其他的嗎』『還有別的選擇嗎』," +
    "要避開之前已經列過的那幾杯,從清單裡挑還沒推薦過的飲料,不要重複列出同一杯。" +
    "候選清單的排列順序沒有特別意義,不代表距離或任何優先順序,挑選時只需要看口味符不符合," +
    "不用考慮清單裡的前後位置。挑3杯的時候盡量來自不同品牌,不要三杯都選同一個品牌,除非清單裡" +
    "符合條件的品牌真的只有一兩個,這種情況才可以同一品牌選多款。" +
    "reason用一兩句話說明為什麼推薦這幾杯,語氣親切。只能挑清單裡真的有的編號,不能自己" +
    "編造清單以外的品牌或飲料。" +
    "如果清單裡沒有任何一杯真的符合使用者的需求,不要勉強硬選,也不要呼叫工具,直接用自然、" +
    "簡短的語氣老實回覆,告訴使用者目前找不到符合的選項。" +
    "回覆的文字一律用純文字,不要用任何markdown語法。"
  );
}

export async function pickRecommendation(
  apiKey: string,
  message: string,
  history: ChatTurn[],
  candidates: CandidateDrink[]
): Promise<PickRecommendationResult> {
  // 記錄這次真正送給Gemini看的候選清單——debug用,方便事後去Cloud Functions的log裡
  // 核對「該抓到的飲料有沒有真的被抓進候選清單」,不用再憑印象猜
  console.log(
    "[推薦]候選清單:",
    JSON.stringify({ message, candidateCount: candidates.length, candidates: buildCandidateListText(candidates) })
  );

  const ai = new GoogleGenAI({ apiKey });

  const contents = [
    ...history.map((turn) => ({ role: turn.role, parts: [{ text: turn.text }] })),
    { role: "user" as const, parts: [{ text: message }] },
  ];

  const response = await ai.models.generateContent({
    model: "gemini-3.8-flash",
    contents,
    config: {
      systemInstruction: buildPickSystemInstruction(candidates),
      tools: [{ functionDeclarations: [PICK_RECOMMENDATION_DECLARATION] }],
    },
  });

  const call = response.functionCalls?.find((c) => c.name === "pick_recommendation" && c.args);
  if (call) {
    const args = call.args as { indexes: number[]; reason: string };
    // Gemini填的編號裡,可能有幾個剛好數錯超出範圍——過濾掉無效的,留下真的存在的那些就好,
    // 不用因為裡面有一兩個錯的就整批放棄
    const picked = args.indexes.map((i) => candidates[i]).filter((c): c is CandidateDrink => !!c);

    const result: PickRecommendationResult =
      picked.length === 0
        ? { type: "invalidIndex" }
        : picked.length === 1
          ? { type: "picked", brand: picked[0].brand, drink: picked[0].drink, reason: args.reason }
          : {
              type: "options",
              options: picked.map((p) => ({ brand: p.brand, drink: p.drink })),
              reason: args.reason,
            };
    console.log("[推薦]挑選結果:", JSON.stringify({ indexes: args.indexes, result }));
    return result;
  }

  const fallback: PickRecommendationResult = {
    type: "reply",
    text: response.text?.trim() || "不好意思,目前找不到適合推薦的飲料,可以換個方式說說看嗎?",
  };
  console.log("[推薦]挑選結果:沒有呼叫工具", JSON.stringify(fallback));
  return fallback;
}
