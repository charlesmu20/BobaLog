import { GoogleGenAI, FunctionDeclaration } from "@google/genai";
import { defineSecret } from "firebase-functions/params";

// Gemini API金鑰存在Cloud Secret Manager,不會出現在程式碼或前端,
// 部署前要先用`firebase functions:secrets:set GEMINI_API_KEY`設定好
export const GEMINI_API_KEY = defineSecret("GEMINI_API_KEY");

export type ChatTurn = { role: "user" | "model"; text: string };

export type RecommendResult = {
  reply: string;
  recommendation: { brandName: string; drinkName: string; reason: string } | null;
};

// Gemini覺得使用者是在問飲料推薦時,就會呼叫這個工具,把推薦結果整理成結構化資料,
// 不是只回一段自由文字——這樣前端才能穩定解析出品牌/飲料/理由,之後擴充「自動記帳」
// 工具時也是同一套模式
const RECOMMEND_DRINK_DECLARATION: FunctionDeclaration = {
  name: "recommend_drink",
  description: "根據使用者描述的口味、甜度、場合等偏好,推薦一款具體的手搖飲",
  parametersJsonSchema: {
    type: "object",
    properties: {
      brandName: { type: "string", description: "推薦的手搖飲品牌名稱" },
      drinkName: { type: "string", description: "推薦的飲料名稱" },
      reason: { type: "string", description: "用一兩句話說明為什麼推薦這杯,語氣親切" },
    },
    required: ["brandName", "drinkName", "reason"],
  },
};

const SYSTEM_INSTRUCTION =
  "你是BobaLog這個手搖飲紀錄App裡的推薦助手。使用者會用文字描述想喝什麼(例如口味、甜度、場合),你要推薦一款具體的手搖飲," +
  "並呼叫recommend_drink這個工具回傳結構化的推薦結果。如果使用者的訊息不是在問飲料推薦(例如打招呼、問別的事情)," +
  "就不用呼叫工具,直接用自然、簡短、親切的語氣回覆文字就好。";

// 第一垂直切片:只做純文字輸入+recommend_drink這一個工具,不含照片、不含比對資料庫、
// 不含自動記帳——先確認Gemini串接、function calling、onCall這整套機制真的能動
export async function recommendDrink(
  apiKey: string,
  message: string,
  history: ChatTurn[]
): Promise<RecommendResult> {
  const ai = new GoogleGenAI({ apiKey });

  const contents = [
    ...history.map((turn) => ({ role: turn.role, parts: [{ text: turn.text }] })),
    { role: "user" as const, parts: [{ text: message }] },
  ];

  const response = await ai.models.generateContent({
    model: "gemini-3.8-flash",
    contents,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      tools: [{ functionDeclarations: [RECOMMEND_DRINK_DECLARATION] }],
    },
  });

  const call = response.functionCalls?.[0];
  if (call && call.name === "recommend_drink" && call.args) {
    const args = call.args as { brandName: string; drinkName: string; reason: string };
    return {
      reply: `我推薦你喝「${args.brandName}」的「${args.drinkName}」——${args.reason}`,
      recommendation: args,
    };
  }

  return {
    reply: response.text?.trim() || "不好意思,我沒聽懂,可以換個方式說說看嗎?",
    recommendation: null,
  };
}
