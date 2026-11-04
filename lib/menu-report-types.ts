// 菜單回報功能(使用者送出+管理頁面審核)共用的型別,跟functions/src/menuReport/
// 底下的型別手動保持一致(前端是獨立的TS專案,沒辦法直接import後端的型別)
import type { Timestamp } from "firebase/firestore";

export type MenuReportIssueType = "menuItem" | "price" | "update";
export const ISSUE_TYPE_LABELS: Record<MenuReportIssueType, string> = {
  menuItem: "菜單品項問題",
  price: "菜單價格問題",
  update: "菜單更新",
};

export type MenuReportStatus = "pending" | "approved" | "rejected" | "applied";
export const STATUS_LABELS: Record<MenuReportStatus, string> = {
  pending: "待審核",
  approved: "已核准",
  rejected: "已拒絕",
  applied: "已套用",
};

export type DiffType = "newItem" | "priceMismatch" | "possiblyRemoved";

export type DrinkDiffItem = {
  diffId: string;
  type: DiffType;
  name: string;
  currentPrices?: { M: number; L: number };
  extractedPrices?: { M: number; L: number };
  drinkId?: string;
  category?: string | null;
  note?: string | null;
};

export type AddOnDiffItem = {
  diffId: string;
  type: DiffType;
  name: string;
  currentPrice?: number;
  extractedPrice?: number;
};

export type AppliedChange = {
  diffId: string;
  kind: "drink" | "addOn";
  type: DiffType;
  name: string;
  drinkId?: string;
  previousState: unknown;
  reverted: boolean;
};

export type MenuReport = {
  id: string;
  uid: string;
  brandSlug: string;
  brandName: string;
  issueType: MenuReportIssueType;
  description: string;
  photoUrl: string | null;
  status: MenuReportStatus;
  note?: string | null;
  createdAt: Timestamp | null;
  aiDiffStatus?: "done" | "error";
  aiDiff?: {
    drinks: DrinkDiffItem[];
    addOns: AddOnDiffItem[];
    // 這次比對有沒有真的比對到飲料主菜單/加料區塊——沒比對到的那邊,drinks/addOns
    // 不是代表「全部下架了」,是代表「這張照片根本沒拍到那個區塊」,管理頁面要分開提示
    drinksCompared: boolean;
    addOnsCompared: boolean;
    // AI自己回報「哪裡看不清楚/沒把握/跳過了」的簡短說明——沒有不確定的地方就不會有這個欄位
    uncertainNote?: string;
  };
  aiDiffError?: string;
  appliedChanges?: AppliedChange[];
  appliedAt?: Timestamp | null;
};

// 套用過的回報,復原全部之後status還是維持"applied"不變(刻意設計——套用過的
// 回報不會回到待審核、也不能重新套用,見functions/src/menuReport/
// applyMenuReportChanges.ts的status==="applied"檢查),單看status看不出
// 「其實已經復原了」,得另外看appliedChanges是不是全部reverted。
// 這個函式統一算出畫面上要顯示的狀態文字,側邊欄跟詳情頁的狀態徽章都共用,
// 不用各自重寫一次判斷邏輯
export function reportStatusLabel(report: Pick<MenuReport, "status" | "appliedChanges">): string {
  if (report.status === "applied") {
    const allReverted =
      !!report.appliedChanges?.length && report.appliedChanges.every((c) => c.reverted);
    return allReverted ? `${STATUS_LABELS.applied}(已復原)` : STATUS_LABELS.applied;
  }
  return STATUS_LABELS[report.status];
}
