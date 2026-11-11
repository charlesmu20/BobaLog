// 這個檔案負責把extractLogDraft.ts(聽懂使用者的話)跟catalog.ts(比對真實資料)串起來,
// 並且判斷「東西夠不夠清楚可以直接存檔」還是「要先回問使用者一句話」。

import type { Firestore } from "firebase-admin/firestore";
import type { ExtractedDrink } from "./extractLogDraft";
import {
  loadCatalog,
  matchBrand,
  matchDrinkInBrand,
  matchDrinkAcrossBrands,
  matchAddOnInBrand,
  type CatalogBrand,
} from "../catalog";

// 一杯已經確定可以顯示成確認卡片的資料。addOns是比對到真實選項的加料(有name、price,
// 金額已經算進amount裡了);比對不到真實選項的加料不會出現在這裡,而是被塞進note文字。
// brandSlug/drinkId:品牌/飲料的固定代號(跟lib/types.ts的LogEntry同一組欄位),
// 確認記帳寫進logs時要帶著一起存——不然之後品牌改名,這筆log在編輯表單上會抓不到
// 對應的品牌/飲料(跟log-modal.tsx手動新增log時存的理由一樣,這裡原本漏掉了)
export type DraftItem = {
  brandName: string;
  brandIcon: string;
  brandSlug: string;
  drinkName: string;
  drinkId: string;
  size: "M" | "L" | null;
  amount: number;
  note: string;
  addOns: { name: string; price: number }[];
};

// 回傳給前端的結果,只有兩種可能:
// question:資訊還不夠清楚(可能是Gemini自己覺得不夠,也可能是比對完發現有疑慮,
//          例如杯型不確定、或好幾個候選),只回一句話讓使用者繼續講,
//          前端顯示成一般聊天訊息就好
// drafts:這一輪偵測到的「每一杯」都確定了品牌、飲料、杯型,可以顯示確認卡片——
//        採all-or-nothing:只要有任何一杯沒辦法確定,就不會回這個type,
//        整批都會變成question,請使用者重新完整描述,不會「只挑成功的幾杯」先回傳
export type ChatLogResult =
  | {
      type: "question";
      text: string;
    }
  | {
      type: "drafts";
      drafts: DraftItem[];
    };

// 把「已經知道抽取結果之後」的邏輯(拿真實菜單比對、判斷全部成功還是整批打回去)獨立出來。
// 原本這支是給「單獨呼叫的resolveLogDraft」內部用的,那支自己重打一次extractLogDraft再呼叫
// 這裡——後來統一聊天入口(chatAssistant/routeMessage.ts)改成用同一次合併呼叫就抽出items,
// 不需要再重打一次extractLogDraft,resolveLogDraft本身也沒有呼叫端在用了,已經整支刪除,
// 只留這支給chatAssistant.ts呼叫
export async function resolveLogDraftFromItems(db: Firestore, items: ExtractedDrink[]): Promise<ChatLogResult> {
  // items可能只有1杯,也可能有好幾杯——「要不要先問使用者要記幾杯」這個判斷,
  // 交給Gemini自己依語意決定(見extractLogDraft.ts的LOG_SYSTEM_INSTRUCTION):
  // 使用者意圖不清楚時,Gemini會直接用文字回問(resolveLogDraft裡extraction.type會是
  // "reply",上面那段就處理掉了,不會走到這裡);只有意圖已經清楚、Gemini真的呼叫了工具,
  // 才會走到這裡,所以這裡不用再額外判斷,直接對每一杯各自比對、各自記錄
  // 「成功了(draft)」或「失敗了(為什麼、第幾杯)」,全部跑完才一次判斷:
  // 要嘛全部成功、要嘛整批打回去,不會只挑成功的幾杯先回傳
  const catalog = await loadCatalog(db);

  const outcomes: MatchOutcome[] = items.map((item, index) => matchOneItem(item, index, catalog));
  const failures = outcomes.filter((o): o is MatchFailure => !o.ok);

  if (failures.length > 0) {
    // 只有1杯的情況,維持原本單杯的問法,不要套用多杯那種「第幾杯」的講法
    if (items.length === 1) {
      return { type: "question", text: describeFailure(failures[0]) };
    }

    // 好幾杯的情況:把每一杯失敗的原因都列出來(用describeFailureShort,不是describeFailure——
    // 單杯那套問法是直接對使用者說話的語氣「可以確認一下嗎?」,擠在「第N杯」後面會不通順,
    // 多杯這裡只需要客觀講出「第N杯,什麼問題」,最後統一用一句話收尾請使用者整批重講)
    const lines = failures.map((f) => `第${f.index + 1}杯${describeFailureShort(f)}`);
    return {
      type: "question",
      text: `這次偵測到${items.length}杯飲料,但:\n${lines.join("\n")}\n麻煩你重新完整描述一下這${items.length}杯分別是什麼品牌、飲料(跟杯型)。`,
    };
  }

  // 全部都成功了,一次回傳所有draft
  return {
    type: "drafts",
    drafts: outcomes.filter((o): o is MatchSuccess => o.ok).map((o) => o.draft),
  };
}

// 單一一杯的比對結果:成功就帶draft,失敗就帶「第幾杯、原始講的名字、失敗原因」
type MatchSuccess = { ok: true; index: number; draft: DraftItem };
type MatchFailure =
  | { ok: false; index: number; drinkName: string; reason: "not_found" }
  | { ok: false; index: number; drinkName: string; reason: "ambiguous"; options: string[] }
  | { ok: false; index: number; drinkName: string; reason: "size_unclear"; drinkLabel: string }
  | { ok: false; index: number; brandName: string; reason: "brand_not_found" };
type MatchOutcome = MatchSuccess | MatchFailure;

// 把「比對一杯飲料」的邏輯抽出來獨立成一個函式,resolveLogDraft對每一杯都呼叫一次這個——
// 跟原本單杯版本的比對邏輯完全一樣,只是多帶一個index(這是items陣列裡的第幾筆,從0開始),
// 失敗的話不直接組文字,只記錄「為什麼失敗」,文字留給describeFailure統一組
function matchOneItem(item: ExtractedDrink, index: number, catalog: CatalogBrand[]): MatchOutcome {
  const brand = item.brandName ? matchBrand(item.brandName, catalog) : null;

  // 【修復】使用者(或對話歷史裡轉述的)有講品牌名稱,但這個品牌在真實資料裡完全比對不到——
  // 這跟「使用者根本沒講品牌」是兩回事,要先分開判斷,不能直接退回去matchDrinkAcrossBrands
  // 在「全部品牌」裡找飲料名稱。原本的寫法沒分這兩種情況,品牌比對不到時會跟「沒講品牌」
  // 走同一條路,結果使用者講了一個不存在的品牌(例如「紅茶巴士」),卻得到一堆完全不相干
  // 品牌的選項(因為「奶茶」這種常見名稱在好幾十個品牌裡都找得到),看起來像是系統偷偷
  // 把品牌資訊丟掉,很容易誤會。正確做法是:品牌名稱有講、但比對不到,直接老實說品牌找不到,
  // 不要擅自擴大搜尋範圍去猜使用者可能想講哪個品牌
  if (item.brandName && !brand) {
    return { ok: false, index, brandName: item.brandName, reason: "brand_not_found" };
  }

  // 不管有沒有先比對到品牌,最後都整理成同一種格式:{brand, drink}[]。
  // 會走到matchDrinkAcrossBrands這條路的,理論上只剩「item.brandName真的是空字串」這種情況——
  // 依LOG_SYSTEM_INSTRUCTION的規則,Gemini應該不會在完全沒品牌線索時呼叫這個工具
  // (會先用文字反問),所以這裡只是留著當防呆退路,不是預期中的常態路徑
  const candidates = brand
    ? matchDrinkInBrand(item.drinkName, brand).map((drink) => ({ brand, drink }))
    : matchDrinkAcrossBrands(item.drinkName, catalog);

  // 一個候選都沒有:真的找不到
  if (candidates.length === 0) {
    return { ok: false, index, drinkName: item.drinkName, reason: "not_found" };
  }

  // 好幾個候選:有歧義,把選項記下來(文字留給describeFailure組)
  if (candidates.length > 1) {
    const options = candidates.map((c, i) => `${i + 1}. ${c.brand.name}的${c.drink.name}`);
    return { ok: false, index, drinkName: item.drinkName, reason: "ambiguous", options };
  }

  // 剛好1個候選,確定是哪杯飲料了
  const { brand: resolvedBrand, drink } = candidates[0];
  const hasSizeOptions = drink.prices.M !== drink.prices.L;

  // 這杯真的有兩種杯型可以選,但使用者沒講,要問清楚才能算金額
  if (hasSizeOptions && !item.size) {
    return { ok: false, index, drinkName: item.drinkName, reason: "size_unclear", drinkLabel: drink.name };
  }

  const size = hasSizeOptions ? item.size : null;

  // 每一個加料文字都各自去這個品牌的加料清單裡比對——剛好比對到1個,就採用這個真實選項
  // (名稱、價格都用真實資料,金額算進amount);比對不到或比對到好幾個,都不當成失敗、
  // 不會觸發整批打回去,而是把使用者原本講的文字直接塞進備註,讓使用者自己在卡片上
  // 確認/調整(這是使用者自己選的處理方式:備註裡看得到、金額也還是可以手動調整)
  const resolvedAddOns: { name: string; price: number }[] = [];
  const unmatchedAddOnTexts: string[] = [];
  for (const rawAddOn of item.addOns) {
    const addOnCandidates = matchAddOnInBrand(rawAddOn, resolvedBrand);
    if (addOnCandidates.length === 1) {
      resolvedAddOns.push(addOnCandidates[0]);
    } else {
      unmatchedAddOnTexts.push(rawAddOn);
    }
  }

  const addOnsTotal = resolvedAddOns.reduce((sum, a) => sum + a.price, 0);
  const amount = drink.prices[size ?? "M"] + addOnsTotal;

  const noteParts = [item.note, ...unmatchedAddOnTexts.map((t) => `加${t}(未確認是否為本店加料,請自行調整金額)`)].filter(
    (part) => part !== ""
  );

  return {
    ok: true,
    index,
    draft: {
      brandName: resolvedBrand.name,
      brandIcon: resolvedBrand.icon,
      brandSlug: resolvedBrand.slug,
      drinkName: drink.name,
      drinkId: drink.id,
      size,
      amount,
      note: noteParts.join("、"),
      addOns: resolvedAddOns,
    },
  };
}

// 把一筆失敗原因組成給使用者看的那一段話(不含「第幾杯」這個前綴——單杯情況不需要前綴,
// 多杯情況由呼叫的地方自己補上「第N杯」再接這段話)。
// 用換行符號\n列選項,不要用頓號全部擠成一段,不然選項一多擠在一起很難讀——
// 前端的泡泡要搭配white-space:pre-line才會真的換行顯示
function describeFailure(f: MatchFailure): string {
  if (f.reason === "brand_not_found") {
    return `我找不到「${f.brandName}」這個品牌,可以確認一下品牌名稱嗎?`;
  }
  if (f.reason === "not_found") {
    return `我找不到符合「${f.drinkName}」的飲料,可以確認一下品牌或完整的飲料名稱嗎?`;
  }
  if (f.reason === "ambiguous") {
    return `找到好幾個可能符合「${f.drinkName}」的選項:\n${f.options.join("\n")}\n請問是哪一個?`;
  }
  return `「${f.drinkLabel}」有中杯跟大杯兩種,請問你是要哪一種?`;
}

// 多杯情況專用的短版說法——跟describeFailure講的是同一件事,但不是對使用者說話的語氣
// (不會說「可以確認一下嗎」「請問是哪一個」),是客觀陳述「這一杯怎麼了」,
// 因為前面已經接了「第N杯」,整句話只在最後統一收尾請使用者重講一次就好
function describeFailureShort(f: MatchFailure): string {
  if (f.reason === "brand_not_found") {
    return `找不到品牌「${f.brandName}」`;
  }
  if (f.reason === "not_found") {
    return `「${f.drinkName}」找不到符合的飲料`;
  }
  if (f.reason === "ambiguous") {
    return `「${f.drinkName}」有好幾個可能的選項:\n${f.options.join("\n")}`;
  }
  return `「${f.drinkLabel}」有中杯跟大杯兩種,不確定是哪一種`;
}
