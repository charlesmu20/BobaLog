// 統一聊天入口的總指揮——取代原本前端手動切換「記帳模式/推薦模式」的做法(#155)。
// 先用routeMessage.ts判斷這句話是記帳還是推薦(或都不是),再接去chatLog.ts/
// recommendCoordinator.ts原本就有的「已經知道抽取結果,接下來怎麼處理」那段邏輯——
// 這兩段邏輯完全沒有被改寫,只是不再由各自獨立的Gemini呼叫觸發,改成由這裡的路由結果觸發。

import type { Firestore } from "firebase-admin/firestore";
import type { ChatTurn } from "../gemini";
import { routeMessage } from "./routeMessage";
import type { ChatImage } from "../chatLog/extractLogDraft";
import { resolveLogDraftFromItems, type ChatLogResult } from "../chatLog/chatLog";
import { resolveRecommendChatFromIntent, type RecommendChatResult } from "../recommend/recommendCoordinator";

// domain欄位讓前端知道這次回應是從哪一邊來的——雖然目前前端只需要看type就知道要畫成
// 什麼樣子(question/drafts是記帳卡片,reply/recommendation/multiplePicks/clarify是
// 推薦卡片),但留著domain方便以後除錯、或是以後兩邊的type萬一有重名需要分辨
export type ChatAssistantResult =
  | ({ domain: "log" } & ChatLogResult)
  | ({ domain: "recommend" } & RecommendChatResult)
  | { domain: "chat"; type: "reply"; text: string };

export async function resolveChatAssistant(
  db: Firestore,
  geminiApiKey: string,
  placesApiKey: string,
  message: string,
  history: ChatTurn[],
  userLocation: { lat: number; lng: number } | null,
  image?: ChatImage
): Promise<ChatAssistantResult> {
  const routed = await routeMessage(geminiApiKey, message, history, image);

  if (routed.type === "log") {
    const result = await resolveLogDraftFromItems(db, routed.items);
    return { domain: "log", ...result };
  }

  if (routed.type === "recommend") {
    const result = await resolveRecommendChatFromIntent(
      db,
      geminiApiKey,
      placesApiKey,
      message,
      history,
      userLocation,
      routed.intent
    );
    return { domain: "recommend", ...result };
  }

  return { domain: "chat", type: "reply", text: routed.text };
}
