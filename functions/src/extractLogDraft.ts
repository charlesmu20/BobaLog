// 這個檔案負責:把使用者用文字描述的一句話(例如「我剛喝了50嵐的四季烏龍奶茶,大杯」),
// 丟給Gemini做function calling,抽取出品牌、飲料、杯型、備註這幾個欄位。
// 這裡只做「聽懂使用者在說什麼」,不管抽出來的品牌/飲料是不是真的存在
// 那是functions/src/catalog.ts負責的事,兩邊分開。

import { FunctionDeclaration, GoogleGenAI } from "@google/genai";
import type { ChatTurn } from "./gemini";

// 拍照記帳用:前端把照片縮小壓縮後轉成base64傳過來,這裡直接轉成Gemini看得懂的inlineData格式
export type ChatImage = { mimeType: string; data: string };

// 單杯飲料抽取出來的欄位——一張收據/一句話可能偵測到好幾杯,每一杯都是一份這個形狀
export type ExtractedDrink = {
  brandName: string;
  drinkName: string;
  size: "M" | "L" | null;
  note: string;
  addOns: string[];
};

// Gemini處理完一句話之後,只會有兩種結果:
// extracted:資訊夠清楚,抽出了至少一杯的品牌/飲料/杯型/備註(items是陣列,一張收據/
//           一句話講好幾杯的話,這裡就會有好幾筆),可以拿去後面比對真實資料
// reply:資訊不夠清楚(例如沒提品牌),或者這句話根本跟記帳無關(像打招呼),
//       這種情況Gemini不會抽取任何東西,只會回一段文字(可能是追問,也可能是閒聊回覆)
export type LogExtractionResult =
  | {
      type: "extracted";
      items: ExtractedDrink[];
    }
  | {
      type: "reply";
      text: string;
    };

// create_log_draft這張表單的定義。只有在Gemini判斷「至少知道品牌跟飲料」時才應該呼叫這個工具,
// 其他欄位(size、note)可以不填——所以required裡只放brandName、drinkName兩個必填欄位
// 【表單格式定義】
const CREATE_LOG_DRAFT_DECLARATION: FunctionDeclaration = {
  name: "create_log_draft",
  description:
    "使用者描述了一杯剛喝過(或想記錄)的飲料,而且品牌跟飲料資訊都夠清楚時,呼叫這個工具記錄下來。" +
    "如果這一句話或這張照片裡包含不只一杯飲料,而且使用者要記錄這好幾杯的意圖已經清楚" +
    "(詳細判斷規則見系統指令),請針對每一杯飲料各自呼叫一次這個工具,一杯填一次完整的參數," +
    "不要把好幾杯合併成一次呼叫",
  parametersJsonSchema: {
    type: "object",
    properties: {
      brandName: {
        type: "string",
        description: "使用者說的品牌名稱,照使用者原本的講法填,不用自己判斷這個品牌是否真的存在",
      },
      drinkName: {
        type: "string",
        description:
          "使用者說的飲料名稱,如果使用者用了簡稱或口語(例如珍奶),請還原成比較完整的講法再填。" +
          "如果品牌已經清楚、只是飲料名稱講得簡略或不完整(例如只說「檸檬」,沒講是檸檬綠茶、" +
          "檸檬汁還是其他哪一款),不要自己猜測或改填成某個具體款式,照使用者原本講的簡略文字填" +
          "就好——到底對應到哪一款真正存在的飲料,是後端拿真實菜單比對的工作,不是你的工作",
      },
      size: {
        type: "string",
        enum: ["M", "L"],
        description: "杯型,使用者沒提到杯型就不要填這個欄位",
      },
      note: {
        type: "string",
        description: "甜度、冰塊等附加資訊,使用者沒提到就不要填這個欄位",
      },
      addOns: {
        type: "array",
        items: { type: "string" },
        description:
          "使用者提到想加的料(例如珍珠、椰果、布丁),把使用者原本講的加料名稱原封不動填進來," +
          "不用自己判斷這個品牌是否真的有這項加料選項(那是後端拿真實資料比對的工作)," +
          "使用者沒提到加料就不用填這個欄位",
      },
    },
    required: ["brandName", "drinkName"],
  },
};

// 【跟Gemini說規則】
const SYSTEM_INSTRUCTION =
  "你是BobaLog這個手搖飲紀錄App裡的記帳小幫手。使用者會用一句話描述他剛喝過(或想記錄)的飲料," +
  "有時候會改成傳一張照片(手搖飲的收據,或是飲料杯身、標籤貼紙),也可能兩個都有(照片+一句補充文字)。" +
  "如果收到照片,請從照片裡讀出品牌名稱跟飲料名稱——收據上通常會印店名跟品項,杯身或標籤貼紙上可能印著" +
  "飲料的店家logo、品名、甜度冰塊等資訊,照片拍得模糊或角度不好、看不清楚的話,不要亂猜,比照文字描述" +
  "不夠清楚時的處理方式,直接用文字回問使用者。" +
  "你要抽取品牌名稱跟飲料名稱,如果使用者用了簡稱或口語(例如「珍奶」),請自己理解還原成比較完整的講法。" +
  "如果使用者有提到想加的料(例如「加珍珠」「多加一份椰果」),把addOns這個欄位填上使用者原本講的" +
  "加料名稱就好,不用自己判斷這個品牌是否真的有這項加料——這跟飲料名稱簡略時的處理原則一樣," +
  "交給後端拿真實資料比對,你只負責忠實記錄使用者講了什麼。" +
  "只有在品牌跟飲料資訊都足夠清楚時,才呼叫create_log_draft這個工具。" +
  "如果偵測到不只一杯飲料(例如收據上有好幾個品項、或使用者一次講了好幾杯),要先判斷使用者" +
  "是不是已經清楚表達『這幾杯都要記』的意圖——例如使用者自己講了『我要記兩杯』『這幾杯都幫我記』、" +
  "或者明確列出了每一杯要記什麼,這些都算意圖清楚;如果只是傳一張收據照片、完全沒提到" +
  "要記幾杯或要不要全部記,意圖就不算清楚。意圖清楚的話,針對每一杯都各自呼叫一次" +
  "create_log_draft,每一杯用自己的一組參數,不要漏掉任何一杯,也不要把好幾杯擠進同一次呼叫裡。" +
  "意圖不清楚的話,不要呼叫工具,改用純文字列出偵測到的每一杯(品牌、飲料、杯型、加料、備註都要" +
  "完整列出來,因為之後的對話不會再看到原始照片或訊息,只能靠這段文字回想),格式固定如下:" +
  "『這次看到N杯:\\n1. 品牌 飲料(杯型),加料:...,備註:...\\n2. ...\\n你今天要記幾杯?全部都要的話跟我說" +
  "「全部」,不然就告訴我要哪幾杯。』,等使用者回覆之後,再依照對話歷史判斷使用者確認要記哪幾杯。" +
  "這個『意圖是否清楚』的判斷,不受中間其他追問(例如確認某一杯的細節)影響——只要使用者在這次" +
  "對話裡的某一句話曾經清楚表達過『這幾杯都要記』,之後不管中間追問了幾輪細節,最終整理出完整" +
  "資訊時都不需要再問一次要記幾杯,直接呼叫create_log_draft就好。" +
  "如果使用者完全沒提到品牌,或者連飲料的大分類都看不出來(例如只說「飲料」「手搖飲」這種," +
  "完全不知道是茶類、奶茶類還是果汁類),才不要呼叫工具,直接用自然、簡短的語氣回問使用者," +
  "請他補充品牌或更具體的飲料名稱。但如果品牌已經清楚,飲料名稱只是講得比較簡略" +
  "(例如「檸檬」「紅茶」這種可能對應到好幾款、但看得出大概類型的講法),不要自己先猜是哪一款、" +
  "也不要自己列出可能的選項讓使用者選,直接照使用者原本的講法呼叫create_log_draft就好——" +
  "真正存在的候選有哪些,交給後端拿真實菜單比對,比對到好幾個或完全比對不到的話,後端自己會" +
  "用真實資料回問使用者,不需要你先用自己的知識猜。" +
  "如果使用者的訊息跟記帳完全無關(例如打招呼、問別的事情),也不要呼叫工具,直接自然回覆文字就好。" +
  "如果對話歷史裡,你(assistant)上一則訊息列出了編號選項要使用者挑(例如「1. ... 2. ...請問是哪一個?」)," +
  "而使用者這次的訊息是在回答這個選擇(可能是數字、「第幾個」、或直接重複/摘要某個選項的關鍵字)," +
  "請對照上一則訊息裡對應的那個選項,照抄那個選項完整的品牌名稱跟飲料名稱,直接呼叫create_log_draft," +
  "不要因為使用者這句話本身很短、看起來資訊不足,就忽略前面的選項清單重新問一次。" +
  "如果對話歷史裡,你(assistant)上一則訊息是用上面那個固定格式列出好幾杯飲料、問使用者" +
  "『今天要記幾杯』,而使用者這次的訊息是在回答這個問題" +
  "(可能說『全部』『都要』,或講編號、飲料名稱,或說『不要第X杯』『少一杯』之類)," +
  "請針對使用者確認要保留的每一杯,各自呼叫一次create_log_draft,完整照抄上一則訊息裡" +
  "列出的品牌名稱、飲料名稱、杯型、備註,不要自己改動或重新猜測內容,也不要因為使用者這句話" +
  "很短,就忽略前面列出的清單重新整句問一次。" +
  "回覆的文字一律用純文字,不要用任何markdown語法(例如**粗體**、_斜體_、#標題、-項目符號等)," +
  "前端只會把文字原封不動顯示出來,markdown符號不會被轉換,只會變成使用者看得到的星號或井字號。";

// 真正呼叫Gemini的函式:把表單定義、系統指令、使用者這句話(可能還有照片)、對話歷史,
// 全部包好送出去。image是選填的——拍照記帳才會有,純文字訊息沿用原本的流程
export async function extractLogDraft(
  apiKey: string,
  message: string,
  history: ChatTurn[],
  image?: ChatImage
): Promise<LogExtractionResult> {
  // 【建立Gemini連線】
  const ai = new GoogleGenAI({ apiKey });

  // 這一輪使用者訊息的parts:文字跟圖片都是選填,但至少會有一個
  // (chatLog.ts/index.ts那邊已經擋掉「兩個都沒有」的情況),所以這裡用filter把空字串的
  // text part濾掉就好,不用再判斷「真的什麼都沒有」這種情況
  const userParts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];
  if (message) userParts.push({ text: message });
  if (image) userParts.push({ inlineData: { mimeType: image.mimeType, data: image.data } });

  // 【組對話內容:歷史紀錄+這句新訊息】
  const contents = [
    ...history.map((turn) => ({ role: turn.role, parts: [{ text: turn.text }] })),
    { role: "user" as const, parts: userParts },
  ];

  // 【送出去問Gemini】
  const response = await ai.models.generateContent({
    model: "gemini-3.8-flash",
    contents,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      tools: [{ functionDeclarations: [CREATE_LOG_DRAFT_DECLARATION] }],
    },
  });

  // 【看Gemini有沒有呼叫工具——多杯的話,Gemini會在同一次回應裡呼叫好幾次,
  // 所以這裡要用filter拿全部的呼叫,不是只拿第一個】
  const calls = response.functionCalls?.filter((c) => c.name === "create_log_draft" && c.args) ?? [];
  if (calls.length > 0) {
    // 【每個呼叫都組成一筆ExtractedDrink,全部放進items陣列回傳】
    const items: ExtractedDrink[] = calls.map((call) => {
      const args = call.args as {
        brandName: string;
        drinkName: string;
        size?: "M" | "L";
        note?: string;
        addOns?: string[];
      };
      return {
        brandName: args.brandName,
        drinkName: args.drinkName,
        size: args.size ?? null,
        note: args.note ?? "",
        addOns: args.addOns ?? [],
      };
    });
    return { type: "extracted", items };
  }

  // 【沒呼叫工具,組成reply回傳】
  return {
    type: "reply",
    text: response.text?.trim() || "不好意思,我沒聽懂,可以換個方式說說看嗎?",
  };
}
