// 勳章的「定義」:標題、說明、分類,純粹給畫面顯示用。
export type BadgeCategory = "logging" | "interaction";

// 跟callable function(getMyStats)回傳的統計數字欄位名稱要一致
export type UserStatKey =
  | "logCount"
  | "distinctBrandCount"
  | "favoriteBrandCount"
  | "favoriteDrinkCount"
  | "ratingCount"
  | "commentCount";

// getMyStats這個callable function回傳的資料形狀
export type UserStats = Record<UserStatKey, number>;

// 畫面用的圖示名稱(對應components/badges/glyphs.tsx裡畫出來的SVG圖案)
export type GlyphName = "cup" | "brand" | "drink-heart" | "star" | "comment";
// tier:同一家族、難度遞增的勳章(例如飲料紀錄里程碑);single:獨立、沒有難度遞增關係的勳章
export type BadgeFamily = "tier" | "single";

export type BadgeDefinition = {
  id: string;
  title: string;
  description: string;
  category: BadgeCategory;
  statKey: UserStatKey; // 對應要看哪個統計數字
  threshold: number; // 門檻
  glyph: GlyphName;
  family: BadgeFamily;
  tier?: 1 | 2 | 3; // family是"tier"的才需要,代表這是家族裡的第幾階
};

export const BADGES: BadgeDefinition[] = [
  // 飲料紀錄里程碑(3階家族,共用杯子圖示,輪廓隨等級變化)
  { id: "drinks-5", title: "初心者", description: "累積紀錄5杯飲料", category: "logging", statKey: "logCount", threshold: 5, glyph: "cup", family: "tier", tier: 1 },
  { id: "drinks-15", title: "常客", description: "累積紀錄15杯飲料", category: "logging", statKey: "logCount", threshold: 15, glyph: "cup", family: "tier", tier: 2 },
  { id: "drinks-30", title: "飲料達人", description: "累積紀錄30杯飲料", category: "logging", statKey: "logCount", threshold: 30, glyph: "cup", family: "tier", tier: 3 },

  // 品牌多樣性(2階家族,共用品牌圖示)
  { id: "brands-5", title: "品牌探索家", description: "喝過5個不同品牌", category: "logging", statKey: "distinctBrandCount", threshold: 5, glyph: "brand", family: "tier", tier: 1 },
  { id: "brands-10", title: "品牌收藏家", description: "喝過10個不同品牌", category: "logging", statKey: "distinctBrandCount", threshold: 10, glyph: "brand", family: "tier", tier: 2 },

  // 互動類(各自獨立,沒有家族關係,各自用不同外型的徽章)
  { id: "favorite-brands-5", title: "品牌鐵粉", description: "收藏滿5個品牌", category: "interaction", statKey: "favoriteBrandCount", threshold: 5, glyph: "brand", family: "single" },
  { id: "favorite-drinks-5", title: "飲料鐵粉", description: "收藏滿5杯飲料", category: "interaction", statKey: "favoriteDrinkCount", threshold: 5, glyph: "drink-heart", family: "single" },
  { id: "ratings-5", title: "評分達人", description: "評分滿5杯飲料", category: "interaction", statKey: "ratingCount", threshold: 5, glyph: "star", family: "single" },
  { id: "comments-5", title: "愛分享", description: "留言滿5則", category: "interaction", statKey: "commentCount", threshold: 5, glyph: "comment", family: "single" },
];
