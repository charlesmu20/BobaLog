import * as admin from "firebase-admin";
import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { checkAndAwardBadges } from "./checkAndAwardBadges";
import { getUserStats } from "./stats";
import { GEMINI_API_KEY, recommendDrink, ChatTurn } from "./gemini";
import { resolveLogDraft } from "./chatLog";
import type { ChatImage } from "./extractLogDraft";

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
// callable function:AI聊天視窗第一垂直切片——推薦飲料。【暫停中,舊版】目前還是
// 被打回票的「純Gemini自由發揮、沒有比對真實資料」版本,之後要照「做法B」重寫
// (自己的評分演算法算候選,Gemini只用index挑選+解釋)。前端送出這一輪的訊息+對話歷史,
// 這裡呼叫Gemini並回傳推薦結果。API金鑰透過secrets帶進來,不會出現在程式碼或前端
export const chatRecommend = onCall(
    { region: "asia-east1", secrets: [GEMINI_API_KEY] },
    async (request) => {
        if (!request.auth) {
            throw new HttpsError("unauthenticated", "請先登入");
        }
        const { message, history } = request.data as { message?: string; history?: ChatTurn[] };
        if (!message || typeof message !== "string" || !message.trim()) {
            throw new HttpsError("invalid-argument", "訊息內容不能是空的");
        }
        return await recommendDrink(GEMINI_API_KEY.value(), message, history ?? []);
    }
);

// callable function:聊天視窗自動記帳用。【現在在做的這個】串接chatLog.ts裡的resolveLogDraft,
// 把Gemini抽取的結果拿去跟真實菜單比對,回傳「要追問一句話」或「已經確定可以存檔的draft」。
// image是選填的(拍照記帳用)——message、image至少要有一個,兩個都給也可以
// (拍照片+補一句文字說明)
export const chatLog = onCall(
    { region: "asia-east1", secrets: [GEMINI_API_KEY] },
    async (request) => {
        if (!request.auth) {
            throw new HttpsError("unauthenticated", "請先登入");
        }
        const { message, history, image } = request.data as {
            message?: string;
            history?: ChatTurn[];
            image?: ChatImage;
        };
        const hasMessage = typeof message === "string" && !!message.trim();
        const hasImage = !!image?.data;
        if (!hasMessage && !hasImage) {
            throw new HttpsError("invalid-argument", "訊息內容不能是空的");
        }
        return await resolveLogDraft(
            admin.firestore(),
            GEMINI_API_KEY.value(),
            hasMessage ? (message as string) : "",
            history ?? [],
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
