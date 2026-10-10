export type Drink = {
  name: string;
  category?: string;
  prices: {
    M: number;
    L: number;
  };
};

export type Brand = {
  name: string;
  icon: string;
  drinks: Drink[];
};

export const brands: Brand[] = [
  {
    name: "50嵐",
    icon: "/brand-icons/50lanl.png",
    drinks: [
      // 找好茶
      { name: "茉莉綠茶", category: "找好茶", prices: { M: 35, L: 40 } },
      { name: "阿薩姆紅茶", category: "找好茶", prices: { M: 35, L: 40 } },
      { name: "四季春青茶", category: "找好茶", prices: { M: 35, L: 40 } },
      { name: "黃金烏龍", category: "找好茶", prices: { M: 35, L: 40 } },
      { name: "檸檬綠茶", category: "找好茶", prices: { M: 50, L: 60 } },
      { name: "梅の綠", category: "找好茶", prices: { M: 50, L: 60 } },
      { name: "桔子綠", category: "找好茶", prices: { M: 50, L: 60 } },
      { name: "8冰綠", category: "找好茶", prices: { M: 50, L: 60 } },
      { name: "養樂多綠", category: "找好茶", prices: { M: 50, L: 60 } },
      { name: "旺來紅茶", category: "找好茶", prices: { M: 50, L: 60 } },
      { name: "旺來綠茶", category: "找好茶", prices: { M: 50, L: 60 } },
      { name: "柚子紅茶", category: "找好茶", prices: { M: 60, L: 75 } },
      { name: "柚子綠茶", category: "找好茶", prices: { M: 60, L: 75 } },
      { name: "柚子青茶", category: "找好茶", prices: { M: 60, L: 75 } },
      { name: "柚子烏龍", category: "找好茶", prices: { M: 60, L: 75 } },
      { name: "鮮柚綠", category: "找好茶", prices: { M: 60, L: 75 } },
      // 找口感
      { name: "四季春珍波椰", category: "找口感", prices: { M: 40, L: 50 } },
      { name: "波霸紅茶", category: "找口感", prices: { M: 40, L: 50 } },
      { name: "波霸綠茶", category: "找口感", prices: { M: 40, L: 50 } },
      { name: "波霸青茶", category: "找口感", prices: { M: 40, L: 50 } },
      { name: "波霸烏龍", category: "找口感", prices: { M: 40, L: 50 } },
      { name: "波霸奶茶", category: "找口感", prices: { M: 50, L: 60 } },
      { name: "波霸奶綠", category: "找口感", prices: { M: 50, L: 60 } },
      { name: "珍珠紅茶", category: "找口感", prices: { M: 40, L: 50 } },
      { name: "珍珠綠茶", category: "找口感", prices: { M: 40, L: 50 } },
      { name: "珍珠青茶", category: "找口感", prices: { M: 40, L: 50 } },
      { name: "珍珠烏龍", category: "找口感", prices: { M: 40, L: 50 } },
      { name: "珍珠奶茶", category: "找口感", prices: { M: 50, L: 60 } },
      { name: "珍珠奶綠", category: "找口感", prices: { M: 50, L: 60 } },
      { name: "椰果奶茶", category: "找口感", prices: { M: 50, L: 60 } },
      { name: "布丁奶茶", category: "找口感", prices: { M: 60, L: 75 } },
      { name: "布丁奶綠", category: "找口感", prices: { M: 60, L: 75 } },
      { name: "布丁紅茶", category: "找口感", prices: { M: 50, L: 60 } },
      { name: "布丁綠茶", category: "找口感", prices: { M: 50, L: 60 } },
      { name: "布丁青茶", category: "找口感", prices: { M: 50, L: 60 } },
      { name: "布丁烏龍", category: "找口感", prices: { M: 50, L: 60 } },
      // 找奶茶
      { name: "奶茶", category: "找奶茶", prices: { M: 50, L: 60 } },
      { name: "奶綠", category: "找奶茶", prices: { M: 50, L: 60 } },
      { name: "紅茶瑪奇朵", category: "找奶茶", prices: { M: 50, L: 60 } },
      { name: "烏龍瑪奇朵", category: "找奶茶", prices: { M: 50, L: 60 } },
      { name: "四季奶青", category: "找奶茶", prices: { M: 50, L: 60 } },
      { name: "黃金烏龍奶茶", category: "找奶茶", prices: { M: 50, L: 60 } },
      { name: "阿華田", category: "找奶茶", prices: { M: 55, L: 65 } },
      // 找新鮮
      { name: "檸檬汁", category: "找新鮮", prices: { M: 55, L: 65 } },
      { name: "金桔檸檬", category: "找新鮮", prices: { M: 55, L: 65 } },
      { name: "檸檬梅汁", category: "找新鮮", prices: { M: 60, L: 75 } },
      { name: "檸檬養樂多", category: "找新鮮", prices: { M: 60, L: 80 } },
      { name: "8冰茶", category: "找新鮮", prices: { M: 50, L: 60 } },
      { name: "柚子茶", category: "找新鮮", prices: { M: 50, L: 60 } },
      { name: "鮮柚汁", category: "找新鮮", prices: { M: 60, L: 75 } },
      { name: "葡萄柚多多", category: "找新鮮", prices: { M: 60, L: 80 } },
      // 找冰淇淋
      { name: "冰淇淋紅茶", category: "找冰淇淋", prices: { M: 50, L: 60 } },
      { name: "冰淇淋綠茶", category: "找冰淇淋", prices: { M: 50, L: 60 } },
      { name: "芒果青", category: "找冰淇淋", prices: { M: 60, L: 80 } },
      { name: "荔枝烏龍", category: "找冰淇淋", prices: { M: 60, L: 80 } },
      // 紅茶拿鐵
      { name: "紅茶拿鐵", category: "紅茶拿鐵", prices: { M: 60, L: 75 } },
      { name: "綠茶拿鐵", category: "紅茶拿鐵", prices: { M: 60, L: 75 } },
      { name: "黃金烏龍拿鐵", category: "紅茶拿鐵", prices: { M: 60, L: 75 } },
      { name: "阿華田拿鐵", category: "紅茶拿鐵", prices: { M: 65, L: 80 } },
    ],
  },
    {
    name: "清心福全",
    icon: "/brand-icons/chingshin.png",
    drinks: [
      // 茶品系列
      { name: "烏龍綠茶", category: "茶品系列", prices: { M: 30, L: 35 } },
      { name: "特級綠茶", category: "茶品系列", prices: { M: 30, L: 35 } },
      { name: "錫蘭紅茶", category: "茶品系列", prices: { M: 30, L: 35 } },
      { name: "極品菁茶", category: "茶品系列", prices: { M: 30, L: 35 } },
      { name: "原鄉四季", category: "茶品系列", prices: { M: 30, L: 35 } },
      { name: "特選普洱", category: "茶品系列", prices: { M: 30, L: 35 } },
      // 冬瓜/百香系列
      { name: "冬瓜茶", category: "冬瓜/百香系列", prices: { M: 40, L: 40 } },
      { name: "冬瓜烏龍", category: "冬瓜/百香系列", prices: { M: 45, L: 45 } },
      { name: "冬瓜檸檬", category: "冬瓜/百香系列", prices: { M: 60, L: 60 } },
      { name: "百香果綠茶", category: "冬瓜/百香系列", prices: { M: 60, L: 60 } },
      { name: "雙Q百香果綠茶", category: "冬瓜/百香系列", prices: { M: 70, L: 70 } },
      // 季節鮮果系列
      { name: "鳳梨紅茶", category: "季節鮮果系列", prices: { M: 50, L: 60 } },
      { name: "蜜香檸檬", category: "季節鮮果系列", prices: { M: 60, L: 75 } },
      { name: "檸檬汁", category: "季節鮮果系列", prices: { M: 50, L: 55 } },
      { name: "金桔檸檬", category: "季節鮮果系列", prices: { M: 55, L: 70 } },
      { name: "桔子", category: "季節鮮果系列", prices: { M: 55, L: 70 } },
      { name: "檸檬紅茶", category: "季節鮮果系列", prices: { M: 50, L: 65 } },
      { name: "檸檬綠茶", category: "季節鮮果系列", prices: { M: 50, L: 65 } },
      { name: "蘆薈香檸檬", category: "季節鮮果系列", prices: { M: 70, L: 90 } },
      // 鮮奶/拿鐵系列
      { name: "相思紅豆鮮奶茶", category: "鮮奶/拿鐵系列", prices: { M: 70, L: 80 } },
      { name: "鮮奶茶", category: "鮮奶/拿鐵系列", prices: { M: 55, L: 70 } },
      { name: "珍珠鮮奶茶", category: "鮮奶/拿鐵系列", prices: { M: 55, L: 70 } },
      { name: "粉圓鮮奶茶", category: "鮮奶/拿鐵系列", prices: { M: 55, L: 70 } },
      { name: "頂級可可鮮奶", category: "鮮奶/拿鐵系列", prices: { M: 65, L: 85 } },
      // 奶茶系列
      { name: "相思紅豆奶茶", category: "奶茶系列", prices: { M: 60, L: 70 } },
      { name: "珍珠奶茶", category: "奶茶系列", prices: { M: 50, L: 60 } },
      { name: "粉圓奶茶", category: "奶茶系列", prices: { M: 50, L: 60 } },
      { name: "錫蘭奶茶", category: "奶茶系列", prices: { M: 50, L: 60 } },
      { name: "烏龍奶茶", category: "奶茶系列", prices: { M: 50, L: 60 } },
      { name: "特級奶茶", category: "奶茶系列", prices: { M: 50, L: 60 } },
      { name: "仙草凍奶茶", category: "奶茶系列", prices: { M: 50, L: 60 } },
      { name: "椰果奶茶", category: "奶茶系列", prices: { M: 50, L: 60 } },
      { name: "布丁奶茶", category: "奶茶系列", prices: { M: 50, L: 60 } },
      { name: "咖啡凍奶茶", category: "奶茶系列", prices: { M: 50, L: 60 } },
      { name: "蜜香奶茶", category: "奶茶系列", prices: { M: 50, L: 65 } },
      { name: "琥珀黑糖奶茶", category: "奶茶系列", prices: { M: 50, L: 60 } },
      // 優多系列
      { name: "優多百香果綠茶", category: "優多系列", prices: { M: 65, L: 65 } },
      { name: "優多檸檬", category: "優多系列", prices: { M: 70, L: 70 } },
      { name: "優多綠茶", category: "優多系列", prices: { M: 55, L: 55 } },
      { name: "蘆薈優多綠茶", category: "優多系列", prices: { M: 75, L: 75 } },
      // 果醋系列
      { name: "蘋果醋", category: "果醋系列", prices: { M: 45, L: 55 } },
      { name: "蘋果紅茶醋", category: "果醋系列", prices: { M: 50, L: 60 } },
      { name: "蜜香蘋果醋", category: "果醋系列", prices: { M: 50, L: 65 } },
      { name: "蜜莓果醋", category: "果醋系列", prices: { M: 50, L: 60 } },
      { name: "蜜香藍莓醋", category: "果醋系列", prices: { M: 55, L: 70 } },
      // 特調系列
      { name: "梅子綠茶", category: "特調系列", prices: { M: 45, L: 55 } },
      { name: "蜜香烏龍", category: "特調系列", prices: { M: 45, L: 55 } },
      { name: "蜜香綠茶", category: "特調系列", prices: { M: 45, L: 55 } },
      // 冬季熱飲系列
      { name: "頂級可可", category: "冬季熱飲系列", prices: { M: 50, L: 65 } },
      { name: "白醇杏仁鮮奶", category: "冬季熱飲系列", prices: { M: 45, L: 55 } },
      { name: "蜜茶", category: "冬季熱飲系列", prices: { M: 35, L: 45 } },
      { name: "情人茶", category: "冬季熱飲系列", prices: { M: 50, L: 60 } },
      { name: "咖啡奶茶", category: "冬季熱飲系列", prices: { M: 50, L: 65 } },
      { name: "桂圓茶", category: "冬季熱飲系列", prices: { M: 45, L: 55 } },
      { name: "桂圓鮮奶茶", category: "冬季熱飲系列", prices: { M: 65, L: 80 } },
      { name: "薑薑好茶", category: "冬季熱飲系列", prices: { M: 45, L: 55 } },
      { name: "薑薑奶茶", category: "冬季熱飲系列", prices: { M: 55, L: 70 } },
    ],
  },
    {
    name: "迷客夏",
    icon: "/brand-icons/Milksha.png",
    drinks: [
      // 果粒茶系列(招牌創始商品)
      { name: "香橙果粒茶", category: "果粒茶系列", prices: { M: 85, L: 85 } },
      { name: "柳橙果粒茶", category: "果粒茶系列", prices: { M: 80, L: 80 } },
      { name: "葡萄柚果粒茶", category: "果粒茶系列", prices: { M: 80, L: 80 } },
      { name: "葡萄柚果粒蜜茶", category: "果粒茶系列", prices: { M: 80, L: 80 } },
      // 原味茶
      { name: "粉粿金萱", category: "原味茶", prices: { M: 50, L: 50 } },
      { name: "紅荌烏龍", category: "原味茶", prices: { M: 45, L: 45 } },
      { name: "高山金萱茶", category: "原味茶", prices: { M: 40, L: 40 } },
      { name: "茉莉綠茶", category: "原味茶", prices: { M: 40, L: 40 } },
      { name: "錫蘭紅茶", category: "原味茶", prices: { M: 40, L: 40 } },
      { name: "蜜桃紅茶", category: "原味茶", prices: { M: 45, L: 45 } },
      { name: "紅荌雙Q", category: "原味茶", prices: { M: 55, L: 55 } },
      { name: "金萱雙Q", category: "原味茶", prices: { M: 50, L: 50 } },
      // 濃醇系列
      { name: "蜜桃奶茶", category: "濃醇系列", prices: { M: 65, L: 65 } },
      { name: "錫蘭奶茶", category: "濃醇系列", prices: { M: 55, L: 55 } },
      { name: "波霸奶茶", category: "濃醇系列", prices: { M: 55, L: 55 } },
      { name: "仙草凍奶茶", category: "濃醇系列", prices: { M: 55, L: 55 } },
      { name: "玫瑰奶茶", category: "濃醇系列", prices: { M: 65, L: 65 } },
      { name: "阿華田奶茶", category: "濃醇系列", prices: { M: 60, L: 60 } },
      // 經典特調
      { name: "梅子冰茶", category: "經典特調", prices: { M: 45, L: 45 } },
      { name: "梅子綠茶", category: "經典特調", prices: { M: 55, L: 55 } },
      { name: "多多綠茶", category: "經典特調", prices: { M: 55, L: 55 } },
      // 鮮果茶飲
      { name: "粉粿橙香紅萱", category: "鮮果茶飲", prices: { M: 85, L: 85 } },
      { name: "橙香紅萱", category: "鮮果茶飲", prices: { M: 75, L: 75 } },
      { name: "柚香紅萱", category: "鮮果茶飲", prices: { M: 75, L: 75 } },
      { name: "百香雙Q果", category: "鮮果茶飲", prices: { M: 65, L: 65 } },
      { name: "百香綠茶", category: "鮮果茶飲", prices: { M: 65, L: 65 } },
      { name: "百香多多", category: "鮮果茶飲", prices: { M: 70, L: 70 } },
      { name: "翡翠檸檬", category: "鮮果茶飲", prices: { M: 70, L: 70 } },
      { name: "粉粿檸檬", category: "鮮果茶飲", prices: { M: 70, L: 70 } },
      { name: "冰萃檸檬", category: "鮮果茶飲", prices: { M: 55, L: 55 } },
      { name: "蜂蜜檸檬", category: "鮮果茶飲", prices: { M: 60, L: 60 } },
      { name: "柚香翡翠", category: "鮮果茶飲", prices: { M: 70, L: 70 } },
      // 芝芝系列
      { name: "芝芝金萱", category: "芝芝系列", prices: { M: 55, L: 55 } },
      { name: "芝芝錫蘭紅茶", category: "芝芝系列", prices: { M: 55, L: 55 } },
      { name: "芝芝金萱雙Q", category: "芝芝系列", prices: { M: 65, L: 65 } },
      { name: "芝芝蜜桃紅茶", category: "芝芝系列", prices: { M: 65, L: 65 } },
      { name: "芝芝茉莉綠茶", category: "芝芝系列", prices: { M: 60, L: 60 } },
      { name: "芝芝錫蘭奶茶", category: "芝芝系列", prices: { M: 75, L: 75 } },
      { name: "芝芝阿華田", category: "芝芝系列", prices: { M: 80, L: 80 } },
      // 寶石系列(無咖啡因)
      { name: "蕎麥綠寶石", category: "寶石系列", prices: { M: 45, L: 45 } },
      // 鮮奶系列
      { name: "粉粿紅茶拿鐵", category: "鮮奶系列", prices: { M: 70, L: 70 } },
      { name: "紅茶拿鐵", category: "鮮奶系列", prices: { M: 70, L: 70 } },
      { name: "波霸紅茶拿鐵", category: "鮮奶系列", prices: { M: 70, L: 70 } },
      { name: "仙草凍紅茶拿鐵", category: "鮮奶系列", prices: { M: 70, L: 70 } },
      { name: "阿華田拿鐵", category: "鮮奶系列", prices: { M: 70, L: 70 } },
      { name: "玫瑰紅茶拿鐵", category: "鮮奶系列", prices: { M: 75, L: 75 } },
    ],
  },
]