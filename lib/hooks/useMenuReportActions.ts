"use client";
import { useState } from "react";
import { httpsCallable } from "firebase/functions";
import { doc, updateDoc } from "firebase/firestore";
import { db, functions } from "@/lib/firebase";

const applyMenuReportDecisionFn = httpsCallable<
  { reportId: string; approvedDiffIds: string[] },
  { appliedCount: number }
>(functions, "applyMenuReportDecision");

const revertAllMenuReportChangesFn = httpsCallable<
  { reportId: string },
  { revertedCount: number }
>(functions, "revertAllMenuReportChanges");

// 【修復】原本「只要是Error實例就顯示err.message」這條規則太寬鬆——Firebase SDK
// 自己丟出來的錯誤(例如離線時Cloud Function呼叫失敗)也是Error的實例,但message
// 內容是像"internal"這種看不懂的技術代號,不是給人看的。我們自己後端丟的HttpsError
// (例如「這筆回報已經套用過了」)則一定是看得懂的中文句子——這份專案的慣例是所有
// 後端錯誤訊息都用中文寫,所以用「message裡有沒有中文字」當判斷依據:有中文字才信任
// 它、顯示給使用者看,不然一律退回預設的fallback訊息,不要把技術性代號曝露出來
function extractMessage(err: unknown, fallback: string): string {
  if (err instanceof Error && /[一-鿿]/.test(err.message)) {
    return err.message;
  }
  return fallback;
}

// 管理頁面的審核動作,共用一個working/error狀態就好(畫面上同一時間只會做一件事)。
// 三個動作都是「setWorking→try執行→失敗記錄錯誤訊息→finally收尾」同一套流程,
// 差別只在實際呼叫什麼跟失敗時要顯示的訊息,所以抽成run()共用,下面各動作只要負責
// 「打哪支API」+「失敗要說什麼」就好
export function useMenuReportActions() {
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");

  const run = async <T,>(action: () => Promise<T>, fallbackMessage: string): Promise<T> => {
    setWorking(true);
    setError("");
    try {
      return await action();
    } catch (err) {
      setError(extractMessage(err, fallbackMessage));
      throw err;
    } finally {
      setWorking(false);
    }
  };

  const applyDecision = (reportId: string, approvedDiffIds: string[]) =>
    run(() => applyMenuReportDecisionFn({ reportId, approvedDiffIds }), "套用失敗,請稍後再試");

  const revertAllChanges = (reportId: string) =>
    run(() => revertAllMenuReportChangesFn({ reportId }), "復原失敗,請稍後再試");

  // 沒照片的回報、或AI辨識失敗的回報,直接標記status(+可選備註),
  // 不經過Cloud Function——這裡不會動到brands的資料,所以不需要後端邏輯
  const updateStatus = (reportId: string, status: "approved" | "rejected", note: string) =>
    run(
      () => updateDoc(doc(db, "menuReports", reportId), { status, note: note.trim() || null }),
      "更新失敗,請稍後再試"
    );

  return { working, error, applyDecision, revertAllChanges, updateStatus };
}
