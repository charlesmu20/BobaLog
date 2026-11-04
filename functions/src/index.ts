import * as admin from "firebase-admin";
import { onDocumentWritten, onDocumentCreated } from "firebase-functions/v2/firestore";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { checkAndAwardBadges } from "./badges/checkAndAwardBadges";
import { getUserStats } from "./badges/stats";
import { GEMINI_API_KEY, ChatTurn } from "./gemini";
import type { ChatImage } from "./chatLog/extractLogDraft";
import { PLACES_API_KEY } from "./recommend/places";
import { resolveChatAssistant } from "./chatAssistant/chatAssistant";
import { compareMenuPhoto } from "./menuReport/compareMenuPhoto";
import { applyMenuReportChanges } from "./menuReport/applyMenuReportChanges";
import { revertAllAppliedChanges } from "./menuReport/revertAllAppliedChanges";

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

// ========== 回報菜單錯誤:AI辨識+自動比對 ==========
// onDocumentCreated:使用者送出回報的那一刻觸發一次就好(不像onDocumentWritten,
// 之後管理頁面寫入核准/拒絕狀態時不會再重複觸發一次AI辨識)。
// 只有附照片的回報才需要跑AI辨識+比對,其餘(單純文字說明)的回報維持pending,
// 交給管理頁面純人工處理。
// aiDiffStatus有三種狀態:"pending"(還在跑或還沒跑)、"done"(比對完成,aiDiff有內容)、
// "error"(辨識或比對過程出錯,aiDiffError會記錄原因,管理頁面要顯示出來讓人知道
// 這筆要自己手動核對,不是沒有照片)
export const onMenuReportCreated = onDocumentCreated(
    { document: "menuReports/{reportId}", region: "asia-east1", secrets: [GEMINI_API_KEY] },
    async (event) => {
        const snap = event.data;
        if (!snap) return;

        const report = snap.data() as { brandSlug?: string; photoUrl?: string | null };
        if (!report.photoUrl || !report.brandSlug) {
            // 沒有照片——不需要AI辨識,保持原本的pending狀態給人工處理
            return;
        }

        try {
            const diff = await compareMenuPhoto(
                admin.firestore(),
                GEMINI_API_KEY.value(),
                report.brandSlug,
                report.photoUrl
            );
            await snap.ref.update({
                aiDiffStatus: "done",
                aiDiff: diff,
            });
        } catch (err) {
            logger.error("menuReport AI比對失敗", { reportId: event.params.reportId, err });
            await snap.ref.update({
                aiDiffStatus: "error",
                aiDiffError: err instanceof Error ? err.message : String(err),
            });
        }
    }
);

// ========== 回報菜單錯誤:管理頁面審核動作 ==========
// 兩支都是admin限定,用custom claims(scripts/set-admin.ts設定的admin:true)判斷,
// 不是看前端有沒有顯示管理頁面入口——前端隱藏按鈕不算權限控制,真正擋人一定要在後端做。
// 實際改brands資料的邏輯都寫在menuReport/底下,這裡只負責驗證身份+把參數轉交過去

function assertAdmin(isAuthed: boolean, isAdmin: boolean): void {
    if (!isAuthed) {
        throw new HttpsError("unauthenticated", "請先登入");
    }
    if (!isAdmin) {
        throw new HttpsError("permission-denied", "只有管理員能執行這個操作");
    }
}

// 管理員在diff卡片上核准了某些項目、按下「套用」之後呼叫——真正去改brands的資料,
// 套用前會把每一筆「改之前的樣子」記錄下來,給下面的revertAllMenuReportChanges用
export const applyMenuReportDecision = onCall({ region: "asia-east1" }, async (request) => {
    assertAdmin(!!request.auth, request.auth?.token.admin === true);
    const { reportId, approvedDiffIds } = request.data as {
        reportId?: string;
        approvedDiffIds?: string[];
    };
    if (!reportId || !Array.isArray(approvedDiffIds)) {
        throw new HttpsError("invalid-argument", "缺少reportId或approvedDiffIds");
    }
    return await applyMenuReportChanges(admin.firestore(), reportId, approvedDiffIds);
});

// 一次復原這筆回報全部還沒復原過的變更。套用過的回報不會回到待審核、
// 也不能重新套用,這支function單純是補救用:把brands資料改回套用前的樣子
export const revertAllMenuReportChanges = onCall({ region: "asia-east1" }, async (request) => {
    assertAdmin(!!request.auth, request.auth?.token.admin === true);
    const { reportId } = request.data as { reportId?: string };
    if (!reportId) {
        throw new HttpsError("invalid-argument", "缺少reportId");
    }
    return await revertAllAppliedChanges(admin.firestore(), reportId);
});
