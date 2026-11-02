// 勳章的「判斷規則」,給Cloud Functions實際比對使用者數字用的。
// id要跟 lib/badges.ts 的id一一對應(同一個勳章,兩邊id要一樣),
// 門檻數字改的話兩邊也都要記得改。

export type UserStats = {
  logCount: number; // 累積紀錄的飲料杯數(logs數量)
  distinctBrandCount: number; // 喝過的不重複品牌數
  favoriteBrandCount: number; // 收藏的品牌數
  favoriteDrinkCount: number; // 收藏的飲料數
  ratingCount: number; // 評分過的飲料數
  commentCount: number; // 留言則數
};

export type BadgeRule = {
  id: string;
  check: (stats: UserStats) => boolean;
};

export const BADGE_RULES: BadgeRule[] = [
  // 飲料紀錄里程碑
  { id: "drinks-5", check: (s) => s.logCount >= 5 },
  { id: "drinks-15", check: (s) => s.logCount >= 15 },
  { id: "drinks-30", check: (s) => s.logCount >= 30 },

  // 品牌多樣性
  { id: "brands-5", check: (s) => s.distinctBrandCount >= 5 },
  { id: "brands-10", check: (s) => s.distinctBrandCount >= 10 },

  // 互動類
  { id: "favorite-brands-5", check: (s) => s.favoriteBrandCount >= 5 },
  { id: "favorite-drinks-5", check: (s) => s.favoriteDrinkCount >= 5 },
  { id: "ratings-5", check: (s) => s.ratingCount >= 5 },
  { id: "comments-5", check: (s) => s.commentCount >= 5 },
];
