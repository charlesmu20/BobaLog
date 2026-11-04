// 「菜單回報」管理頁面:一次復原這筆回報全部還沒復原過的變更。
// 同一個transaction裡把所有未復原的appliedChanges都處理完,飲料逐筆動作、
// 加料整包讀出來改完再寫回去一次,避免同一個brands文件被寫入好幾次搶資源。
//
// 這筆回報的status維持"applied"不變——套用過的回報不會再回到待審核,
// 也不能重新套用(見applyMenuReportChanges.ts的status==="applied"檢查),
// 復原只是單純把brands資料改回去,純粹補救用。

import { HttpsError } from "firebase-functions/v2/https";
import type { Firestore } from "firebase-admin/firestore";
import { FieldValue } from "firebase-admin/firestore";
import type { AppliedChange } from "./menuReportTypes";

export async function revertAllAppliedChanges(
  db: Firestore,
  reportId: string
): Promise<{ revertedCount: number }> {
  const reportRef = db.collection("menuReports").doc(reportId);

  return db.runTransaction(async (tx) => {
    const reportSnap = await tx.get(reportRef);
    if (!reportSnap.exists) {
      throw new HttpsError("not-found", "找不到這筆回報");
    }
    const report = reportSnap.data() as {
      brandSlug?: string;
      appliedChanges?: AppliedChange[];
    };
    if (!report.brandSlug || !report.appliedChanges) {
      throw new HttpsError("failed-precondition", "這筆回報沒有已套用的變更");
    }

    const pendingChanges = report.appliedChanges.filter((c) => !c.reverted);
    if (pendingChanges.length === 0) {
      throw new HttpsError("failed-precondition", "沒有可以復原的變更");
    }

    const brandRef = db.collection("brands").doc(report.brandSlug);
    const needsAddOnsRead = pendingChanges.some((c) => c.kind === "addOn");
    let addOns: { name: string; price: number }[] = [];
    if (needsAddOnsRead) {
      const brandSnap = await tx.get(brandRef);
      const brandData = brandSnap.data() as { addOns?: { name: string; price: number }[] };
      addOns = [...(brandData.addOns ?? [])];
    }

    let drinkCountDelta = 0;

    for (const change of pendingChanges) {
      if (change.kind === "drink" && change.drinkId) {
        const drinkRef = brandRef.collection("drinks").doc(change.drinkId);
        if (change.type === "newItem") {
          tx.delete(drinkRef);
          drinkCountDelta -= 1;
        } else if (change.type === "priceMismatch") {
          const prev = change.previousState as { prices: { M: number; L: number } };
          tx.update(drinkRef, { prices: prev.prices });
        } else if (change.type === "possiblyRemoved") {
          const prev = change.previousState as {
            name: string;
            category: string | null;
            note: string | null;
            prices: { M: number; L: number };
          };
          tx.set(drinkRef, prev);
          drinkCountDelta += 1;
        }
      } else if (change.kind === "addOn") {
        if (change.type === "newItem") {
          const idx = addOns.findIndex((a) => a.name === change.name);
          if (idx >= 0) addOns.splice(idx, 1);
        } else if (change.type === "priceMismatch") {
          const prev = change.previousState as { price: number };
          const idx = addOns.findIndex((a) => a.name === change.name);
          if (idx >= 0) addOns[idx] = { name: change.name, price: prev.price };
        } else if (change.type === "possiblyRemoved") {
          const prev = change.previousState as { name: string; price: number };
          addOns.push(prev);
        }
      }
    }

    if (needsAddOnsRead || drinkCountDelta !== 0) {
      tx.update(brandRef, {
        ...(needsAddOnsRead ? { addOns } : {}),
        ...(drinkCountDelta !== 0 ? { drinkCount: FieldValue.increment(drinkCountDelta) } : {}),
      });
    }

    // pendingChanges就是全部還沒復原過的,所以這裡不用額外比對ID,
    // 直接把每一筆沒復原過的標記成已復原就好
    const updatedChanges = report.appliedChanges.map((c) =>
      c.reverted ? c : { ...c, reverted: true }
    );

    tx.update(reportRef, { appliedChanges: updatedChanges });

    return { revertedCount: pendingChanges.length };
  });
}
