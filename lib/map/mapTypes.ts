import type { matchBrand } from "@/lib/map/matchBrand";

// Google搜到的原始店家資料,還沒比對品牌
export type RawPlace = {
  id: string;
  name: string;
  location: { lat: number; lng: number };
  isClosed: boolean;
  isOpenNow: boolean | null; // true=營業中, false=休息中, null=Google沒給這家店的營業時間資料
  todayHours: string | null; // 今天的營業時間文字,例如「星期一: 10:00–22:00」,null代表沒有資料
  distance: number;
};

// 比對完品牌之後的最終資料,給地圖pin跟左側清單用
export type PlaceResult = RawPlace & {
  brand: ReturnType<typeof matchBrand>;
};

// 篩選條件,地圖pin跟左側清單共用同一份狀態
export type MapFilters = {
  onlyOpen: boolean; // 只看營業中
  onlyWithBrand: boolean; // 只看已收錄品牌(有品牌icon、能連到菜單頁的店)
};
