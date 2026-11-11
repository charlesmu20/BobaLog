// 「菜單回報」功能專用:把使用者附的菜單照片丟給Gemini,請它盡量忠實地轉成結構化資料
// (飲料名稱+M/L價格、加料名稱+價格),給compareMenuPhoto.ts拿去跟Firestore裡的真實資料比對。
//
// 這裡的規則是從使用者原本請別的AI對話窗生成的「手搖飲菜單轉換規則」濃縮改編過來的——
// 原始規則是設計給「建立一整個新品牌資料庫、人在旁邊即時確認」這種情境用,這裡只留下
// 跟我們比對需求(名稱+價格)直接相關的部分:價格邏輯(M/L對應、只有一價格就M=L、
// 瓶裝/罐裝不收、三種價格只收前兩欄)、加料重複出現只收一次、限制文字塞進name裡、
// 名稱清理(忽略裝飾圖示)都保留;分類(category)、備註(note)整段拿掉(我們決定這兩個
// 欄位不比對);「列出判斷點讓人確認」這個互動流程也拿掉,改成「看不清楚/沒把握就直接
// 不要填那一項」,因為這支function是全自動跑、沒有人即時盯著,跟我們比對邏輯「有抓到才
// 比對,沒抓到的不處理」的精神是一致的,只是從「問人」改成「跳過」。
// 加料的「合併標價要不要拆成多筆」這條規則後來又改了一次方向——實測真實品牌菜單時
// 發現,加料跟飲料不一樣:飲料的合併寫法(例如「紅/綠茶拿鐵」)通常代表「同一杯飲料、
// 二選一口味」,本來就是同一個品項,不該拆;但加料的合併標價(例如「珍珠｜仙草凍｜
// 綠茶凍 10元」)代表的是「好幾種各自獨立、可以分開單點的配料,剛好價格一樣所以印在
// 一起」,資料庫裡也是一款配料一筆分開存,如果AI不拆、照抄成一筆合併name,比對時會
// 整組對不上資料庫既有的個別品項,被誤判成「一堆舊的下架+一筆新的」。所以加料改回:
// 只要看得出來是不同的獨立品項,即使價格相同、印在同一行,也要拆成多筆,各自沿用那個
// 共同價格

import { FunctionDeclaration, GoogleGenAI } from "@google/genai";

export type ExtractedDrink = {
  name: string;
  priceM: number;
  priceL: number;
  // 品名後面括號裡的補充說明(甜度限制、過敏原警語、成分描述等)——不塞進name裡,
  // 單獨抓出來,核准新品項時直接存進drinks文件的note欄位
  note?: string;
};

export type ExtractedAddOn = {
  name: string;
  price: number;
};

export type MenuExtractionResult = {
  // 這張照片裡到底有沒有拍到飲料主菜單區塊——沒拍到的話drinks一定是空陣列,
  // 但比對邏輯要靠這個欄位判斷「要不要進行飲料比對」,不能只看drinks是不是空陣列
  // (例如使用者這次只想回報加料價格,故意只拍加料表,沒拍到飲料菜單,這時候drinks
  // 會是空陣列,但不代表「所有飲料都下架了」,不能照常比對下去)
  drinksVisible: boolean;
  drinks: ExtractedDrink[];
  // 這張照片裡到底有沒有拍到加料/配料區塊——沒拍到的話addOns一定是空陣列,
  // 但比對邏輯要靠這個欄位判斷「要不要進行加料比對」,不能只看addOns是不是空陣列
  // (萬一真的有拍到、但剛好那個品牌沒有加料選項,也會是空陣列,兩種情況意義不同)
  addOnsVisible: boolean;
  addOns: ExtractedAddOn[];
  // Gemini自己回報「哪裡看不清楚/沒把握/跳過了」的簡短說明,給管理頁面顯示,
  // 提醒人工審核時要特別注意哪裡——沒有不確定的地方就不會有這個欄位
  uncertainNote?: string;
};

const RECORD_MENU_DECLARATION: FunctionDeclaration = {
  name: "record_menu_photo",
  description: "把這張手搖飲菜單照片裡看得到的飲料跟加料資訊,盡量忠實地記錄下來。",
  parametersJsonSchema: {
    type: "object",
    properties: {
      drinksVisible: {
        type: "boolean",
        description:
          "這張照片裡有沒有拍到「飲料主菜單」的區塊(列出各種飲品名稱+價格,不是加料/" +
          "配料這種附屬選購清單)。沒有拍到的話填false,drinks欄位留空陣列——例如使用者" +
          "這次只拍了加料價目表、沒拍到飲料菜單本身,就要填false,不可以因為drinks是空的" +
          "就誤以為填true。",
      },
      drinks: {
        type: "array",
        description:
          "只有drinksVisible是true時才需要填。照片裡看到的每一杯飲料,一杯一筆。" +
          "【重要】有些菜單會把同一個品名配好幾欄價格——先判斷這幾欄代表的是「尺寸」還是" +
          "「不同做法/配方」:欄位標題是M/L、中杯/大杯、小/中/大這類尺寸字樣的,才是尺寸," +
          "照下面priceM/priceL的規則填就好;欄位標題不是尺寸、而是像「茶/奶茶/拿鐵」" +
          "「原味/特調」這種不同做法或配方的,不要硬塞進M/L、更不可以因為超過兩欄就把" +
          "其中一欄直接丟掉不記——改成每一欄各自算一筆獨立的飲料,name要把「品名+那一欄" +
          "的做法」接在一起(例如「四季春」配「茶/奶茶/拿鐵」三欄,要拆成「四季春」" +
          "「四季春奶茶」「四季春拿鐵」三筆分開記錄,不是「四季春」一筆硬塞兩個價格、" +
          "丟掉第三欄沒記到),每一筆自己的priceM、priceL填同一個數字(因為這筆本身" +
          "沒有尺寸差異)。",
        items: {
          type: "object",
          properties: {
            name: {
              type: "string",
              description:
                "飲料名稱,照菜單上印的文字忠實轉譯,只留純粹的品名本身,不要自己改字" +
                "(例如看到「珈琲」不要自己改寫成比較常見的「咖啡」,兩個是不同的原始用字," +
                "一定要照抄菜單上印的那個字)。忽略名稱前後的裝飾性小圖示(箭頭、星號等)跟" +
                "「推薦」「人氣」這類行銷徽章文字。【重要】如果品名後面還有括號補充說明" +
                "(例如「(最低甜度1分糖)」「(本產品含有堅果類)」「(3%奶精 味蕾升華)」這類" +
                "甜度限制、過敏原警語、成分描述),不要把這段放進name裡——這段改填到note" +
                "欄位,name只留括號前面乾淨的品名。名稱裡若有「A/B」這種同價格二選一寫法" +
                "(例如「鮮乳/奶茶」),維持原樣寫在同一個name裡,不要拆成兩筆。但如果是上面" +
                "drinks欄位說明的「品名配好幾種做法欄位」被拆成多筆的情況,name要把做法接在" +
                "品名後面,例如「四季春奶茶」「四季春拿鐵」,不要漏掉這個後綴。",
            },
            note: {
              type: "string",
              description:
                "品名後面括號裡的補充說明文字,例如甜度限制、過敏原警語、成分描述等," +
                "原樣抄錄進來,不要自己改寫、也不用保留括號本身。如果這個品項沒有這類" +
                "補充說明,這個欄位不用填。",
            },
            priceM: {
              type: "number",
              description:
                "中杯(或菜單上唯一標示的那個杯型)的價格。如果菜單只標一種價格(沒有區分" +
                "M/L兩欄,包括上面「拆成多筆」之後每一筆本身只有一個價格的情況),這個欄位" +
                "跟priceL填一樣的數字。如果菜單同時列出杯裝跟瓶裝/罐裝價格,只取杯裝價格。" +
                "如果是真正的尺寸分類、而且列出三種以上尺寸,只取前兩種,其餘忽略。",
            },
            priceL: {
              type: "number",
              description: "大杯的價格,規則同priceM——只有一種價格就跟priceM填一樣的數字。",
            },
          },
          required: ["name", "priceM", "priceL"],
        },
      },
      addOnsVisible: {
        type: "boolean",
        description:
          "這張照片裡有沒有拍到「加料」「配料」這種額外加購選項的區塊(通常是另外一個" +
          "價目表,列出珍珠、椰果這類品項+加購價)。沒有拍到的話填false,addOns欄位留空陣列。",
      },
      addOns: {
        type: "array",
        description:
          "只有addOnsVisible是true時才需要填。每一款加購配料一筆——【重要】如果菜單上" +
          "把好幾個不同名稱的配料合併標示在同一個價格旁邊(例如「椰果/波霸/仙草凍 +10」" +
          "「珍珠｜仙草凍｜綠茶凍 10」),只要看得出來這些是各自獨立、可以分開單點的" +
          "配料品項,就要拆成多筆分開記錄(「椰果」「波霸」「仙草凍」各自一筆),每一筆" +
          "都填那個共同標示的價格,不要合併成一個name字串塞在一起。",
        items: {
          type: "object",
          properties: {
            name: {
              type: "string",
              description:
                "加料名稱,照菜單上印的文字忠實轉譯(多個品項合併標價時,已經在上面" +
                "拆成多筆,這裡只填這一筆自己的品項名稱)。如果這個加購項目有限制文字" +
                "(例如「限冷飲」),直接寫進name裡,例如「蒟蒻凍(限冷飲)」。同一個" +
                "加購項目如果重複出現在菜單上好幾次,只收錄一次就好。",
            },
            price: { type: "number", description: "這款加料的加購價格。" },
          },
          required: ["name", "price"],
        },
      },
      uncertainNote: {
        type: "string",
        description:
          "強制規則:只要drinks或addOns裡有任何一個品項是因為看不清楚、沒把握而被你跳過" +
          "沒收錄(不管是名稱還是價格看不清楚),這個欄位就「一定要」填寫,不能留空、" +
          "不能省略——這是必填的收尾動作,不是可有可無的附加資訊。內容用一兩句話簡短" +
          "說明是哪裡有問題,例如「右上角有兩個品項被遮住看不清楚價格,已跳過」「加料表" +
          "最下面一行反光看不清楚」。只有在整張照片完全清楚、真的沒有跳過任何東西的情況," +
          "才可以不填這個欄位。",
      },
    },
    required: ["drinksVisible", "drinks", "addOnsVisible", "addOns"],
  },
};

const SYSTEM_INSTRUCTION =
  "你正在幫忙辨識一張手搖飲店的菜單照片,目標是盡量貼近原始菜單的事實內容,不要自己編造" +
  "價格或品名。如果照片中某個品項的名稱或價格因為解析度太低、角度不好、被遮擋等原因看不清楚、" +
  "沒有把握,直接整筆跳過、不要收錄這一項,不要用猜的硬填——漏掉比錯誤更好,因為這些資料" +
  "之後會被人工核對,寧可少抓一些、也不要抓錯。圖片看起來雜訊、模糊時,先嘗試仔細看局部區域" +
  "再判斷,不要因為整體畫質不好就整張放棄不辨識。重要:只要你跳過了任何一個品項沒收錄," +
  "呼叫record_menu_photo時就一定要同時填寫uncertainNote欄位,簡短說明是哪裡看不清楚——" +
  "這一步是強制的,不可以跳過不填,讓人工審核的人知道要特別注意、可能需要重新拍照。" +
  "辨識完畢後呼叫record_menu_photo這個工具回傳結果。";

export async function extractMenuFromPhoto(
  apiKey: string,
  imageBase64: string,
  mimeType: string
): Promise<MenuExtractionResult> {
  const ai = new GoogleGenAI({ apiKey });

  const response = await ai.models.generateContent({
    model: "gemini-3.8-flash",
    contents: [
      {
        role: "user",
        parts: [
          { text: "請辨識這張手搖飲菜單照片。" },
          { inlineData: { mimeType, data: imageBase64 } },
        ],
      },
    ],
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      tools: [{ functionDeclarations: [RECORD_MENU_DECLARATION] }],
    },
  });

  const call = response.functionCalls?.find((c) => c.name === "record_menu_photo" && c.args);
  if (!call) {
    // Gemini沒有呼叫工具(例如完全看不出這是菜單照片)——回傳空結果,
    // 讓compareMenuPhoto.ts那邊自然算出「照片有的我們沒有」全部是空、「我們有照片沒有」全部列出來,
    // 這樣不太合理,所以呼叫端要另外判斷「完全沒辨識到任何東西」的情況,不要照單全收當成比對結果
    return { drinksVisible: false, drinks: [], addOnsVisible: false, addOns: [] };
  }

  const args = call.args as {
    drinksVisible?: boolean;
    drinks?: { name: string; priceM: number; priceL: number; note?: string }[];
    addOnsVisible?: boolean;
    addOns?: { name: string; price: number }[];
    uncertainNote?: string;
  };

  return {
    // required欄位,理論上Gemini一定會填,但萬一真的漏填,兩個欄位都預設false(跳過比對)
    // 而不是true——漏填時drinks/addOns也會一起變成空陣列,如果這時候visible預設成true,
    // compareMenuPhoto.ts會把它當成「有拍到、但這次什麼都沒有」,資料庫裡現有的東西全部
    // 被判斷成疑似下架,反而踩到最上面那段安全檢查想避免的危險情境。寧可漏填時跳過不比對,
    // 也不要錯誤地觸發大量「疑似下架」
    drinksVisible: args.drinksVisible ?? false,
    drinks: (args.drinks ?? []).map((d) => ({
      ...d,
      note: d.note?.trim() || undefined,
    })),
    addOnsVisible: args.addOnsVisible ?? false,
    addOns: args.addOns ?? [],
    uncertainNote: args.uncertainNote?.trim() || undefined,
  };
}
