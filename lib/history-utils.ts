import { brands } from "@/lib/brands";

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

export const getBrandIcon = (name: string) =>
  brands.find((b) => b.name === name)?.icon || "";