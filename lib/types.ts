import { Timestamp } from "firebase/firestore";
import type { AddOn } from "@/lib/brands";

export type LogEntry = {
  id: string;
  brand: string;
  drink: string;
  size: "M" | "L" | null;
  amount: number;
  date: string;
  note: string;
  // 這筆紀錄當時選了哪些加料,存name+price的快照,不是參照——
  // 不然以後品牌的加料價格調整,舊紀錄的金額會跟著跑掉
  addOns?: AddOn[];
  createdAt: Timestamp;
};