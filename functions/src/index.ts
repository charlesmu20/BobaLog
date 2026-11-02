import * as admin from "firebase-admin";
import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { checkAndAwardBadges } from "./badges/checkAndAwardBadges";
import { getUserStats } from "./badges/stats";
import { GEMINI_API_KEY, ChatTurn } from "./gemini";
import type { ChatImage } from "./chatLog/extractLogDraft";
import { PLACES_API_KEY } from "./recommend/places";
import { resolveChatAssistant } from "./chatAssistant/chatAssistant";

admin.initializeApp();

// ========== 勳章系統:統計資料查詢 ==========
// callable function:前端主動呼叫,回傳「目前登入的人」自己的統計數字,給勳章頁面算進度用
export const getMyStats = onCall({ region: "asia-east1" }, async (request) => {
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "請先登入");
    }
    return await getUserStats(request.auth.uid);
});

// ========== AI聊天視窗 ==========
// callable function:AI聊天視窗統一入口(#155)——取代原本分開的chatRecommend、chatLog
// 兩支callable function跟前端手動切換模式的按鈕。串接chatAssistant.ts的resolveChatAssistant:
// 先讓Gemini在同一次呼叫裡自己判斷這句話是記帳還是推薦飲料(或都不是),判斷完再接去
// 原本記帳/推薦各自的處理邏輯(拿真實資料比對、組候選、呼叫Gemini挑選或反問)——
// 這兩段邏輯本身完全沒變,只是不再由前端的mode開關決定要呼叫哪一支。
// image是選填的(拍照記帳用)、location是選填的(瀏覽器GPS,推薦飲料用到),
// message、image至少要有一個。API金鑰(Gemini+Places)透過secrets帶進來,不會出現在前端
export const chatAssistant = onCall(
    { region: "asia-east1", secrets: [GEMINI_API_KEY, PLACES_API_KEY] },
    async (request) => {
        if (!request.auth) {
            throw new HttpsError("unauthenticated", "請先登入");
        }
        const { message, history, image, location } = request.data as {
            message?: string;
            history?: ChatTurn[];
            image?: ChatImage;
            location?: { lat: number; lng: number };
        };
        const hasMessage = typeof message === "string" && !!message.trim();
        const hasImage = !!image?.data;
        if (!hasMessage && !hasImage) {
            throw new HttpsError("invalid-argument", "訊息內容不能是空的");
        }
        return await resolveChatAssistant(
            admin.firestore(),
            GEMINI_API_KEY.value(),
            PLACES_API_KEY.value(),
            hasMessage ? (message as string) : "",
            history ?? [],
            location ?? null,
            image
        );
    }
);

// ========== 勳章系統:自動檢查觸發器 ==========
// onDocumentWritten:新增、修改、刪除文件都會觸發(跟onDocumentCreated不同,
// 它只抓得到新增)。這樣不管使用者是記了一筆新log,還是回去把log刪掉,
// 都會重新檢查一次勳章,該收回的也會收回。
// event.data.after是異動後的狀態(刪除時沒有資料),event.data.before是異動前的狀態
// (新增時沒有資料),所以uid要兩邊都試著抓。

export const onLogWritten = onDocumentWritten("logs/{logId}", async (event) => {
    const uid = event.data?.after.data()?.uid ?? event.data?.before.data()?.uid;
    if (!uid) return;

    await checkAndAwardBadges(uid);
});

export const onFavoriteBrandWritten = onDocumentWritten("favoriteBrands/{docId}", async (event) => {
    const uid = event.data?.after.data()?.uid ?? event.data?.before.data()?.uid;
    if (!uid) return;

    await checkAndAwardBadges(uid);
});

export const onFavoriteDrinkWritten = onDocumentWritten("favoriteDrinks/{docId}", async (event) => {
    const uid = event.data?.after.data()?.uid ?? event.data?.before.data()?.uid;
    if (!uid) return;

    await checkAndAwardBadges(uid);
});

export const onRatingWritten = onDocumentWritten("ratings/{docId}", async (event) => {
    const uid = event.data?.after.data()?.uid ?? event.data?.before.data()?.uid;
    if (!uid) return;

    await checkAndAwardBadges(uid);
});

export const onCommentWritten = onDocumentWritten("comments/{commentId}", async (event) => {
    const uid = event.data?.after.data()?.uid ?? event.data?.before.data()?.uid;
    if (!uid) return;

    await checkAndAwardBadges(uid);
});
