import type { Brand } from "@/lib/brands";
import type { LogEntry } from "@/lib/types";

export const WEEKDAYS = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];
export const CUP_COLORS = ["bg-blue-500", "bg-green-500", "bg-purple-500", "bg-orange-500", "bg-pink-500"];

export const getCurrentMonthKey = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
};

export const monthKeyOf = (dateStr: string) => dateStr.slice(0, 7);

export const formatMonthLabel = (key: string) => {
  const [y, m] = key.split("-");
  return `${y}年${Number(m)}月`;
};

export const formatDateHeader = (dateStr: string) => {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return `${m}月${d}日 ${WEEKDAYS[date.getDay()]}`;
};

export const getBrandIcon = (name: string, brands: Brand[]) =>
  brands.find((b) => b.name === name)?.icon || "";

// 把Date轉成"YYYY-MM-DD"——原本date-picker.tsx、log-modal.tsx各自複製了一份一樣的函式,
// 這裡本來也有一份叫toDateKey的,乾脆統一改名export出去,三個地方共用同一份
export const toDateString = (d: Date) => {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

// 連續記帳天數:從今天開始往前算有記錄的連續天數。今天還沒記的話不算斷,
// 從昨天開始算(畢竟今天還沒過完);如果昨天也沒記,streak就是0
export const calcStreak = (logs: LogEntry[]) => {
  const dateSet = new Set(logs.map((l) => l.date));
  const cursor = new Date();
  if (!dateSet.has(toDateString(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
    if (!dateSet.has(toDateString(cursor))) return 0;
  }
  let streak = 0;
  while (dateSet.has(toDateString(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
};