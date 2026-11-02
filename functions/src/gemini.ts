import { defineSecret } from "firebase-functions/params";

// Gemini API金鑰存在Cloud Secret Manager,不會出現在程式碼或前端,
// 部署前要先用`firebase functions:secrets:set GEMINI_API_KEY`設定好
export const GEMINI_API_KEY = defineSecret("GEMINI_API_KEY");

// 兩個聊天功能(自動記帳chatLog、推薦飲料recommend)共用的對話歷史格式,
// 所以留在根目錄,不跟著任何一個功能搬進子資料夾。
// 【做法B】這個檔案以前還放了recommendDrink(做法A:純Gemini自由發揮、沒有比對真實資料,
// 已經被打回票),現在改成只留GEMINI_API_KEY跟ChatTurn這兩個真正共用的東西——
// 推薦飲料功能自己的Gemini呼叫邏輯搬到recommend/recommendGemini.ts了,
// 跟chatLog功能的extractLogDraft.ts放在chatLog/資料夾是同樣的道理
export type ChatTurn = { role: "user" | "model"; text: string };
