// 統一聊天入口專用:在同一次Gemini呼叫裡,把記帳(create_log_draft)跟推薦飲料
// (extract_recommend_intent)兩個工具「同時」亮出來,讓Gemini自己判斷這句話該呼叫哪一個——
// 不是先打一次Gemini做分類、判斷完再分開打第二次個別領域的抽取,是同一次呼叫、同時看兩種可能,
// 跟原本各自獨立呼叫(extractLogDraft.ts的extractLogDraft、recommendGemini.ts的
// extractRecommendIntent)比起來,速度沒有變慢,只是現在一次呼叫要同時判斷「要用哪個工具」
// 跟「填哪些欄位」。
//
// 兩個工具原本各自的declaration、系統指令規則完全沒有被改寫或混在一起——這裡只是把兩段
// 文字直接接在一起(用===分隔清楚標題),外層另外加一小段「兩個都有可能的時候,怎麼判斷
// 要用哪一個」的仲裁說明。之後如果要再調整記帳或推薦各自的細節規則,直接改
// extractLogDraft.ts/recommendGemini.ts裡原本的那段文字就好,這裡不用跟著動。
//
// 關鍵的仲裁原則:這句話「本身」的內容如果已經很明確屬於某一邊(例如清楚提到要記錄的
// 品牌+飲料,或清楚在問/回答推薦相關的問題),就算對話歷史裡上一輪问的是另一邊的問題,
// 也要切過去正確的那邊,不能被「上一輪問了什麼」這個慣性卡住——這是跟使用者討論過、
// 確認過的「推薦反問到一半,突然說要記帳」這個情境能不能正確切換的關鍵。只有這句話
// 本身語意不夠具體(例如很短,單獨看不出是在講哪一邊)時,才參考對話歷史裡自己上一輪
// 問了什麼來判斷。

import { GoogleGenAI } from "@google/genai";
import type { ChatTurn } from "../gemini";
import {
  CREATE_LOG_DRAFT_DECLARATION,
  LOG_SYSTEM_INSTRUCTION,
  buildExtractedDrinksFromCalls,
  type ChatImage,
  type ExtractedDrink,
} from "../chatLog/extractLogDraft";
import {
  EXTRACT_INTENT_DECLARATION,
  EXTRACT_INTENT_SYSTEM_INSTRUCTION,
  buildRecommendIntentFromArgs,
  type RecommendIntentResult,
} from "../recommend/recommendGemini";

// log:判斷是記帳,items是這次抽到的每一杯(可能好幾杯),跟原本chatLog.ts收到的extracted一樣
// recommend:判斷是推薦飲料,intent是抽到的意圖,跟原本recommendCoordinator.ts收到的一樣
// reply:兩個工具都沒呼叫——這句話跟記帳、推薦都無關(打招呼、問別的事情),直接回文字
export type RouteResult =
  | { type: "log"; items: ExtractedDrink[] }
  | { type: "recommend"; intent: Extract<RecommendIntentResult, { type: "intent" }> }
  | { type: "reply"; text: string };

const ROUTING_SYSTEM_INSTRUCTION =
  "你是BobaLog這個手搖飲紀錄App裡的小幫手,同時身兼兩個身分:幫使用者記錄剛喝過(或想記錄)的" +
  "飲料,或是幫使用者推薦想喝的飲料。你手上有兩個工具:create_log_draft(記帳用)、" +
  "extract_recommend_intent(推薦飲料用)。請先判斷使用者這句話(可能還附了一張照片)屬於" +
  "哪一種,再照該工具底下列出的詳細規則去呼叫:\n" +
  "- 使用者在描述一杯剛喝過(或想記錄)的飲料,或傳了收據/飲料照片,屬於記帳,呼叫create_log_draft。\n" +
  "- 使用者在問要喝什麼、想要推薦、或在回答你之前問的口味/品牌問題,屬於推薦飲料," +
  "呼叫extract_recommend_intent。\n" +
  "- 【重要】這句話「本身」的內容如果已經很明確屬於其中一種(例如清楚提到了具體品牌+飲料," +
  "語氣像在陳述已經喝過/要記一筆),就算你自己上一輪問的是推薦相關的問題,也要切去呼叫" +
  "記帳的工具,不要被上一輪的脈絡綁住;反過來也一樣——使用者這句話清楚在問推薦、或在回答你" +
  "推薦相關的提問,就算你上一輪在聊記帳,也要切去推薦,不要被上一輪的脈絡綁住。\n" +
  "- 只有這句話本身語意不夠具體(例如很短、單獨看不出屬於哪一種)時,才參考對話紀錄裡" +
  "你自己上一輪問了什麼,順著那個方向判斷這句話在回答哪一邊。\n" +
  "- 如果這句話跟記帳、推薦都無關(打招呼、問別的事情),兩個工具都不要呼叫,直接用自然、" +
  "簡短、親切的語氣回覆文字就好,不要用任何markdown語法。\n\n" +
  "=== 記帳(create_log_draft)詳細規則 ===\n" +
  LOG_SYSTEM_INSTRUCTION +
  "\n\n=== 推薦飲料(extract_recommend_intent)詳細規則 ===\n" +
  EXTRACT_INTENT_SYSTEM_INSTRUCTION;

export async function routeMessage(
  apiKey: string,
  message: string,
  history: ChatTurn[],
  image?: ChatImage
): Promise<RouteResult> {
  const ai = new GoogleGenAI({ apiKey });

  const userParts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];
  if (message) userParts.push({ text: message });
  if (image) userParts.push({ inlineData: { mimeType: image.mimeType, data: image.data } });

  const contents = [
    ...history.map((turn) => ({ role: turn.role, parts: [{ text: turn.text }] })),
    { role: "user" as const, parts: userParts },
  ];

  const response = await ai.models.generateContent({
    model: "gemini-3.8-flash",
    contents,
    config: {
      systemInstruction: ROUTING_SYSTEM_INSTRUCTION,
      tools: [{ functionDeclarations: [CREATE_LOG_DRAFT_DECLARATION, EXTRACT_INTENT_DECLARATION] }],
    },
  });

  // 記帳那邊一次回應裡可能呼叫好幾次(一杯一次),先用filter全部抓出來
  const logCalls = response.functionCalls?.filter((c) => c.name === "create_log_draft" && c.args) ?? [];
  if (logCalls.length > 0) {
    const items = buildExtractedDrinksFromCalls(logCalls);
    console.log("[路由]判定為記帳:", JSON.stringify({ message, itemCount: items.length }));
    return { type: "log", items };
  }

  const recommendCall = response.functionCalls?.find((c) => c.name === "extract_recommend_intent" && c.args);
  if (recommendCall) {
    const intent = buildRecommendIntentFromArgs(
      recommendCall.args as {
        keywords?: string[];
        brandName?: string;
        mentionedLocation?: string;
        nearbyBrandNames?: string[];
        noPreference?: boolean;
      }
    );
    console.log("[路由]判定為推薦:", JSON.stringify({ message, intent }));
    return { type: "recommend", intent };
  }

  const text = response.text?.trim() || "不好意思,我沒聽懂,可以換個方式說說看嗎?";
  console.log("[路由]兩邊都無關,直接回覆文字:", JSON.stringify({ message }));
  return { type: "reply", text };
}
