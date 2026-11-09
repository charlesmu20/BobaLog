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
  // brand/drink欄位存的是「當下的顯示名稱」快照,品牌改名後就對不起來(編輯表單會抓不到
  // 對應的品牌/飲料,整個表單變空白)。brandSlug/drinkId才是不會變的固定代號(slug本來就是
  // 品牌頁網址用的那個,drinkId是Firestore文件id),存這兩個欄位,之後改名也還找得到對應的
  // 品牌/飲料。只套用在新紀錄——這兩個欄位是optional,舊紀錄沒有這兩欄,
  // 比對時會自動退回用brand/drink名稱比對(跟原本行為一樣,不會改變舊紀錄的顯示)
  brandSlug?: string;
  drinkId?: string;
};