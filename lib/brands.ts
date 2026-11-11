// BobaLog 品牌/飲料相關型別定義。
// 原本這個檔案還有一份3300多行的品牌靜態資料陣列(開發初期拿來一次性匯入Firestore用的
// 草稿資料),但App現在全面改用Firestore即時資料(lib/hooks/useBrands.ts、
// useBrandSummaries.ts等),菜單異動也都是透過「菜單回報」功能走AI比對+管理員審核流程
// 直接寫回Firestore,不會再回頭改這個檔案——那份靜態陣列已經沒有任何程式碼在用,
// 清掉只留下面大家還在共用的型別定義。

export type Drink = {
  name: string;
  category?: string;
  note?: string; // 附加標籤,例如:季節限定、無咖啡因、限冷飲、固定冰量
  prices: {
    M: number;
    L: number;
  };
  id?: string;
};

export type AddOn = {
  name: string;
  price: number;
};

export type Brand = {
  name: string;
  slug: string;
  icon: string;
  drinks: Drink[];
  addOns?: AddOn[]; // 這個品牌可加的料(例如珍珠、椰果),沒有就不用寫這個欄位
};

export type BrandSummary = {
  name: string;
  slug: string;
  icon: string;
  addOns?: AddOn[];
  drinkCount: number;
};
