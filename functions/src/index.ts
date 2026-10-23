import * as admin from "firebase-admin";
import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { checkAndAwardBadges } from "./checkAndAwardBadges";
import { getUserStats } from "./stats";

admin.initializeApp();

// callable function:前端主動呼叫,回傳「目前登入的人」自己的統計數字,給勳章頁面算進度用
export const getMyStats = onCall({ region: "asia-east1" }, async (request) => {
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "請先登入");
    }
    return await getUserStats(request.auth.uid);
});

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
