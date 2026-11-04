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
// 另外「合併標價要拆成多筆」這條規則後來改掉了——飲料名稱本來就有很多品牌是合併寫法
// 存成一筆(例如「紅/綠茶拿鐵」),為了跟飲料端的處理方式一致、也避免比對時對不起來,
// 加料一樣維持照片上的原始寫法,不主動拆分

import { FunctionDeclaration, GoogleGenAI } from "@google/genai";

export type ExtractedDrink = {
  name: string;
  priceM: number;
  priceL: number;
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
        description: "只有drinksVisible是true時才需要填。照片裡看到的每一杯飲料,一杯一筆",
        items: {
          type: "object",
          properties: {
            name: {
              type: "string",
              description:
                "飲料名稱,照菜單上印的文字忠實轉譯,不要自己改字。忽略名稱前後的裝飾性小圖示" +
                "(箭頭、星號等)跟「推薦」「人氣」這類行銷徽章文字。名稱裡若有「A/B」這種同價格" +
                "二選一寫法(例如「鮮乳/奶茶」),維持原樣寫在同一個name裡,不要拆成兩筆。",
            },
            priceM: {
              type: "number",
              description:
                "中杯(或菜單上唯一標示的那個杯型)的價格。如果菜單只標一種價格(沒有區分" +
                "M/L兩欄),這個欄位跟priceL填一樣的數字。如果菜單同時列出杯裝跟瓶裝/罐裝價格," +
                "只取杯裝價格。如果列出三種以上價格,只取前兩種,其餘忽略。",
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
        description: "只有addOnsVisible是true時才需要填。每一款加購配料一筆。",
        items: {
          type: "object",
          properties: {
            name: {
              type: "string",
              description:
                "加料名稱,照菜單上印的文字忠實轉譯。如果好幾個配料名稱合併標同一個價格" +
                "(例如「椰果/波霸/仙草凍 +10」),維持原樣寫在同一個name裡,不要拆成多筆。" +
                "如果這個加購項目有限制文字(例如「限冷飲」),直接寫進name裡," +
                "例如「蒟蒻凍(限冷飲)」。同一個加購項目如果重複出現在菜單上好幾次," +
                "只收錄一次就好。",
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
    drinks?: { name: string; priceM: number; priceL: number }[];
    addOnsVisible?: boolean;
    addOns?: { name: string; price: number }[];
    uncertainNote?: string;
  };

  return {
    // required欄位,理論上Gemini一定會填,預設值用true(照舊比對)而不是false,
    // 避免萬一真的漏填時反而讓原本該比對的飲料被跳過不檢查
    drinksVisible: args.drinksVisible ?? true,
    drinks: args.drinks ?? [],
    addOnsVisible: args.addOnsVisible ?? false,
    addOns: args.addOns ?? [],
    uncertainNote: args.uncertainNote?.trim() || undefined,
  };
}
