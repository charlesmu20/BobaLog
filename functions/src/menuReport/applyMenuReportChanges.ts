// 「菜單回報」管理頁面:管理員在diff卡片上核准了某些項目、按下「套用」之後,
// 這支function負責真正去改brands的資料。
//
// 只有被核准的diffId才會處理,沒被核准的(拒絕or還沒決定)完全不動。
// 飲料存在brands/{slug}/drinks子collection,加料存在brands/{slug}文件的addOns陣列欄位,
// 兩種儲存方式不一樣,所以寫入邏輯分開處理。
//
// 套用前,每一筆都會先把「被改之前的樣子」記錄成一筆AppliedChange,整包存回
// menuReports文件的appliedChanges陣列——這是之後revertAllAppliedChanges.ts
// 唯一能拿到「怎麼改回去」的資料來源,所以這一步不能漏。

import { HttpsError } from "firebase-functions/v2/https";
import type { Firestore } from "firebase-admin/firestore";
import { FieldValue } from "firebase-admin/firestore";
import type { DrinkDiffItem, AddOnDiffItem } from "./compareMenuPhoto";
import { type AppliedChange, computeDrinkId } from "./menuReportTypes";

export async function applyMenuReportChanges(
  db: Firestore,
  reportId: string,
  approvedDiffIds: string[]
): Promise<{ appliedCount: number }> {
  const reportRef = db.collection("menuReports").doc(reportId);

  return db.runTransaction(async (tx) => {
    const reportSnap = await tx.get(reportRef);
    if (!reportSnap.exists) {
      throw new HttpsError("not-found", "找不到這筆回報");
    }
    const report = reportSnap.data() as {
      brandSlug?: string;
      status?: string;
      aiDiff?: { drinks: DrinkDiffItem[]; addOns: AddOnDiffItem[] };
    };
    if (!report.brandSlug || !report.aiDiff) {
      throw new HttpsError("failed-precondition", "這筆回報沒有AI比對結果,無法套用");
    }
    if (report.status === "applied") {
      throw new HttpsError("failed-precondition", "這筆回報已經套用過了");
    }

    const brandRef = db.collection("brands").doc(report.brandSlug);
    const brandSnap = await tx.get(brandRef);
    if (!brandSnap.exists) {
      throw new HttpsError("not-found", "找不到對應的品牌資料");
    }
    const brandData = brandSnap.data() as { addOns?: { name: string; price: number }[] };
    // 加料是陣列欄位,沒辦法像飲料子collection那樣單筆更新,
    // 所以這裡先讀出完整陣列,在記憶體裡把核准的變更都做完,最後一次寫回去
    const addOns = [...(brandData.addOns ?? [])];

    const approvedSet = new Set(approvedDiffIds);
    const appliedChanges: AppliedChange[] = [];
    let drinkCountDelta = 0;

    for (const diff of report.aiDiff.drinks) {
      if (!approvedSet.has(diff.diffId)) continue;

      if (diff.type === "newItem") {
        const drinkId = computeDrinkId(report.brandSlug, diff.name);
        tx.set(brandRef.collection("drinks").doc(drinkId), {
          name: diff.name,
          category: null,
          note: null,
          prices: diff.extractedPrices,
        });
        drinkCountDelta += 1;
        appliedChanges.push({
          diffId: diff.diffId,
          kind: "drink",
          type: "newItem",
          name: diff.name,
          drinkId,
          previousState: null,
          reverted: false,
        });
      } else if (diff.type === "priceMismatch" && diff.drinkId) {
        tx.update(brandRef.collection("drinks").doc(diff.drinkId), {
          prices: diff.extractedPrices,
        });
        appliedChanges.push({
          diffId: diff.diffId,
          kind: "drink",
          type: "priceMismatch",
          name: diff.name,
          drinkId: diff.drinkId,
          previousState: { prices: diff.currentPrices },
          reverted: false,
        });
      } else if (diff.type === "possiblyRemoved" && diff.drinkId) {
        tx.delete(brandRef.collection("drinks").doc(diff.drinkId));
        drinkCountDelta -= 1;
        appliedChanges.push({
          diffId: diff.diffId,
          kind: "drink",
          type: "possiblyRemoved",
          name: diff.name,
          drinkId: diff.drinkId,
          previousState: {
            name: diff.name,
            category: diff.category ?? null,
            note: diff.note ?? null,
            prices: diff.currentPrices,
          },
          reverted: false,
        });
      }
    }

    for (const diff of report.aiDiff.addOns) {
      if (!approvedSet.has(diff.diffId)) continue;

      if (diff.type === "newItem") {
        addOns.push({ name: diff.name, price: diff.extractedPrice as number });
        appliedChanges.push({
          diffId: diff.diffId,
          kind: "addOn",
          type: "newItem",
          name: diff.name,
          previousState: null,
          reverted: false,
        });
      } else if (diff.type === "priceMismatch") {
        const idx = addOns.findIndex((a) => a.name === diff.name);
        if (idx >= 0) {
          const previousPrice = addOns[idx].price;
          addOns[idx] = { name: diff.name, price: diff.extractedPrice as number };
          appliedChanges.push({
            diffId: diff.diffId,
            kind: "addOn",
            type: "priceMismatch",
            name: diff.name,
            previousState: { price: previousPrice },
            reverted: false,
          });
        }
      } else if (diff.type === "possiblyRemoved") {
        const idx = addOns.findIndex((a) => a.name === diff.name);
        if (idx >= 0) {
          const previousPrice = addOns[idx].price;
          addOns.splice(idx, 1);
          appliedChanges.push({
            diffId: diff.diffId,
            kind: "addOn",
            type: "possiblyRemoved",
            name: diff.name,
            previousState: { name: diff.name, price: previousPrice },
            reverted: false,
          });
        }
      }
    }

    if (appliedChanges.length === 0) {
      throw new HttpsError("invalid-argument", "沒有核准任何項目可以套用");
    }

    tx.update(brandRef, {
      addOns,
      ...(drinkCountDelta !== 0 ? { drinkCount: FieldValue.increment(drinkCountDelta) } : {}),
    });

    tx.update(reportRef, {
      status: "applied",
      appliedChanges: FieldValue.arrayUnion(...appliedChanges),
      appliedAt: FieldValue.serverTimestamp(),
    });

    return { appliedCount: appliedChanges.length };
  });
}
