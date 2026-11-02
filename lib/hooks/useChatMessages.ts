"use client";
import { useState, useRef, useEffect } from "react";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "@/lib/firebase";
import { resizeImageToBase64, type EncodedImage } from "@/lib/image-utils";

// 一則聊天訊息。draft是選填的——有這個欄位,代表這則AI回覆是「品牌/飲料/杯型都確定了,
// 可以顯示確認卡片」,UI看到draft存在就該畫成卡片,不是純文字泡泡。
// success也是選填的,代表「這筆已經成功寫進logs了」,UI看到就該畫成綠色的成功小卡片,
// 不要跟一般文字回覆或draft卡片混在一起畫。
// imageUrl也是選填的,只有使用者自己傳的那則訊息會有——存使用者端的本機預覽網址
// (URL.createObjectURL),純粹給聊天紀錄畫面顯示用,不是真的上傳到某個地方的網址
export type ChatMessage = {
  id: string;
  uid: string;
  role: "user" | "model";
  text: string;
  createdAt: number;
  imageUrl?: string;
  draft?: {
    brandName: string;
    brandIcon: string;
    drinkName: string;
    size: "M" | "L" | null;
    amount: number;
    note: string;
    addOns: { name: string; price: number }[];
  };
  success?: {
    brandName: string;
    brandIcon: string;
    drinkName: string;
    amount: number;
  };
  // recommendation也是選填的,只有「推薦飲料」模式、且Gemini真的選出一杯時才會有——
  // UI看到這個欄位存在,就該畫成推薦卡片(logo+品牌+飲料名稱+前往飲料頁按鈕),
  // 跟draft/success這兩種卡片分開處理,因為按鈕要做的事不一樣(不是確認/取消,是導去飲料頁)
  recommendation?: {
    brandName: string;
    brandIcon: string;
    brandSlug: string;
    drinkName: string;
    drinkId: string;
    reason: string;
  };
  // multiplePicks也是選填的——情境二/情境三挑了幾杯(2~3杯)列出來,UI看到這個欄位存在,
  // 要畫成幾張小卡片(logo+品牌+飲料名稱+連去菜單頁的按鈕),不是像recommendation那樣的
  // 單張大卡片,也不是文字清單
  multiplePicks?: {
    brandName: string;
    brandIcon: string;
    brandSlug: string;
    drinkName: string;
    drinkId: string;
  }[];
  // 跟multiplePicks配對的共同理由,選填——使用者有給關鍵字的情況(情境二/情境三帶口味)
  // 才會有,畫在卡片上方一小段文字;使用者明確說「都可以」的情況沒有理由可言,這裡會是
  // undefined,前端就不顯示這段文字
  multiplePicksReason?: string;
  // 跟multiplePicks配對——後端算出「候選清單裡符合條件的,是不是比這次列出來的還多」,
  // true的話卡片下面要多畫一顆「看看其他選項」按鈕,點了等於幫使用者送出「還有其他選項嗎」
  // 這句話,不用自己手動打字
  multiplePicksHasMore?: boolean;
};

// 跟functions/src/chatAssistant/chatAssistant.ts裡的ChatAssistantResult是同一種形狀
// (#155:拿掉原本手動切換記帳/推薦模式的做法,改成後端自己判斷這句話屬於哪一邊)。
// domain欄位代表這次回應是從記帳那邊來的,還是推薦那邊來的——brand/drink這裡只列出
// 畫卡片真的會用到的欄位(name/icon/slug、id/name),不是整份CatalogBrand/CatalogDrink
type ChatAssistantResponse =
  | { domain: "log"; type: "question"; text: string }
  | { domain: "log"; type: "drafts"; drafts: DraftItem[] }
  | { domain: "recommend"; type: "reply"; text: string }
  | {
      domain: "recommend";
      type: "recommendation";
      brand: { name: string; icon: string; slug: string };
      drink: { id: string; name: string };
      reason: string;
    }
  | {
      domain: "recommend";
      type: "multiplePicks";
      picks: { brand: { name: string; icon: string; slug: string }; drink: { id: string; name: string } }[];
      reason?: string;
      hasMore: boolean;
    }
  | { domain: "recommend"; type: "clarify"; text: string; tasteOptions: string[] }
  | { domain: "chat"; type: "reply"; text: string };

// 問瀏覽器拿一次使用者目前的座標,給後端findNearbyBrands用(推薦飲料時才用得到)。
// 現在每句話送出前都會問一次,因為前端已經不知道這句話最後會被判斷成記帳還是推薦——
// 拿不到(使用者拒絕定位、裝置不支援、或5秒內沒回應)就回null就好,不當作錯誤——
// 後端本來就處理「沒有座標」這種情況(退回查整個catalog),跟現在的行為一樣,
// 只是現在多了「如果真的拿得到,就用更準確的附近品牌去推薦」這個機會。
// maximumAge給5分鐘,同一次聊天裡使用者連續問幾句推薦,不用每次都重新定位一次,
// 瀏覽器可以直接回快取的座標,反應比較快
function getBrowserLocation(): Promise<{ lat: number; lng: number } | null> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({ lat: position.coords.latitude, lng: position.coords.longitude });
      },
      () => {
        // 使用者拒絕定位權限,或定位失敗——安靜地當作沒有座標,不要跳錯誤訊息打斷聊天
        resolve(null);
      },
      { timeout: 5000, maximumAge: 5 * 60 * 1000 }
    );
  });
}

// 跟functions/src/chatLog.ts裡的DraftItem是同一種形狀,但因為前端是獨立的TS專案,
// 沒辦法直接import後端的型別,所以在這裡重新宣告一份一樣的
type DraftItem = {
  brandName: string;
  brandIcon: string;
  drinkName: string;
  size: "M" | "L" | null;
  amount: number;
  note: string;
  addOns: { name: string; price: number }[];
};

// AI聊天視窗的對話紀錄。這份對話紀錄只存在前端記憶體(一般useState),不寫進Firestore——
// 重新整理整個網頁會重置,但只是關掉/打開聊天面板不會(聊天面板本身一直掛在layout.tsx,
// 沒有被卸載)。對話本身只是一次性草稿,真正要長期保存的是confirmDraft寫進logs那筆資料。
export function useChatMessages(uid: string | null) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sending, setSending] = useState(false);
  // 呼叫失敗時的提示,只存在前端
  const [error, setError] = useState<string | null>(null);
  // 失敗的那次呼叫原本的文字+照片,留著給「重試」按鈕用——使用者不用自己重打一次。
  // 成功送出(不管哪一次)就清空;重新呼叫（重試或送出新訊息)一開始也會先清空,
  // 避免殘留上一次失敗的內容
  const [lastFailed, setLastFailed] = useState<{ text: string; image?: File | null } | null>(null);
  // 用ref保留最新的messages,避免sendMessage內用到閉包裡舊的陣列
  const messagesRef = useRef<ChatMessage[]>([]);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // 真正呼叫後端+處理回應的邏輯,不負責把使用者這句話畫面上的泡泡加進對話紀錄——
  // 那件事交給呼叫端(sendMessage加新泡泡、retryLastMessage不用,因為泡泡早就在畫面上了),
  // 這樣「重試」才能重打同一次請求,又不會把使用者那句話在畫面上重複顯示兩次
  async function runAssistantCall(trimmed: string, image?: File | null) {
    // uid一定要有才能繼續(呼叫端sendMessage/retryLastMessage理論上都已經確認過了),
    // 這裡重新擋一次單純是為了讓TypeScript在這個函式作用域內把uid窄化成string——
    // 不然底下好幾個setMessages都會因為uid型別是string|null而報錯
    if (!uid) return;
    setSending(true);
    setError(null);
    try {
      // 把這句之前的對話歷史整理成Gemini要的格式(這句本身當作message單獨傳,不重複放進history)
      const history = messagesRef.current.map((m) => ({ role: m.role, text: m.text }));

      // 照片縮小壓縮後轉成base64(拍照記帳用——推薦飲料不吃圖片,但這裡不用先判斷
      // 這句話最後會被後端判斷成記帳還是推薦,有照片就先轉,後端自己會決定用不用)
      let encodedImage: EncodedImage | undefined;
      if (image) {
        encodedImage = await resizeImageToBase64(image);
      }

      // 先問一次瀏覽器定位——使用者如果已經同意過,這次通常馬上就能拿到(或拿到快取座標),
      // 拒絕或拿不到也不卡住,直接繼續送出訊息,後端會自己退回查整個catalog。
      // #155拿掉手動模式切換之後,前端不知道這句話最後會被判斷成記帳還是推薦,所以每句話
      // 都問一次——拿到快取座標的話幾乎是瞬間完成,不會明顯拖慢記帳訊息的速度
      const location = await getBrowserLocation();

      const chatAssistant = httpsCallable<
        {
          message: string;
          history: typeof history;
          image?: EncodedImage;
          location?: { lat: number; lng: number };
        },
        ChatAssistantResponse
      >(functions, "chatAssistant");
      const result = await chatAssistant({
        message: trimmed,
        history,
        image: encodedImage,
        location: location ?? undefined,
      });
      const data = result.data;

      if (data.domain === "log" && data.type === "drafts") {
        // 已經確定了(可能1杯,也可能好幾杯),每一杯都各自變成一則帶draft的訊息,
        // UI那邊看到draft存在就會畫成確認卡片——每一則訊息都有自己的id,
        // 彼此是獨立的卡片,使用者對其中一張按確認/取消,不會影響到其他幾張
        const draftMessages: ChatMessage[] = data.drafts.map((d) => {
          const sizeLabel = d.size ? `(${d.size === "M" ? "中杯" : "大杯"})` : "";
          // 有比對到真實加料選項的話,順便列進整理好的那句話裡,讓使用者一眼就看到
          // 金額裡已經包含哪些加料,不用自己點開卡片才看得到
          const addOnsLabel = d.addOns.length > 0 ? `,加${d.addOns.map((a) => a.name).join("、")}` : "";
          return {
            id: crypto.randomUUID(),
            uid,
            role: "model",
            text: `幫你整理好了:${d.brandName} ${d.drinkName}${sizeLabel}${addOnsLabel} $${d.amount}`,
            draft: d,
            createdAt: Date.now(),
          };
        });
        setMessages((prev) => [...prev, ...draftMessages]);
      } else if (data.domain === "recommend" && data.type === "recommendation") {
        const { brand, drink, reason } = data;
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            uid,
            role: "model",
            text: reason,
            recommendation: {
              brandName: brand.name,
              brandIcon: brand.icon,
              brandSlug: brand.slug,
              drinkName: drink.name,
              drinkId: drink.id,
              reason,
            },
            createdAt: Date.now(),
          },
        ]);
      } else if (data.domain === "recommend" && data.type === "multiplePicks") {
        // 挑了幾杯列出來,畫成幾張小卡片——text欄位放一句純文字摘要(不是畫面上會顯示的
        // 泡泡,是給對話歷史用的,讓Gemini之後看得到「上一輪已經列過哪些」,「還有其他的嗎」
        // 才能正確避開重複)。有理由的話(情境二/情境三帶關鍵字)一起記進text跟
        // multiplePicksReason;「都可以」那種沒理由的情況,reason是undefined,
        // text只放列表,不會有多餘的句子
        const picks = data.picks;
        const reason = data.reason;
        const hasMore = data.hasMore;
        const lines = picks.map((p, i) => `${i + 1}. ${p.brand.name} - ${p.drink.name}`);
        const text = reason
          ? `這裡有幾個選擇:\n${lines.join("\n")}\n\n${reason}`
          : `好的,那幫你隨便選了幾款:\n${lines.join("\n")}`;
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            uid,
            role: "model",
            text,
            multiplePicks: picks.map((p) => ({
              brandName: p.brand.name,
              brandIcon: p.brand.icon,
              brandSlug: p.brand.slug,
              drinkName: p.drink.name,
              drinkId: p.drink.id,
            })),
            multiplePicksReason: reason,
            multiplePicksHasMore: hasMore,
            createdAt: Date.now(),
          },
        ]);
      } else {
        // 剩下的情況(記帳的question、推薦的clarify反問/reply、兩邊都無關的chat reply)
        // 都當純文字顯示就好。text抽成區域變數是因為result.data在這個分支裡TypeScript
        // 窄化不完全,要在外面先取出來才抓得到型別
        const text = data.text;
        setMessages((prev) => [...prev, { id: crypto.randomUUID(), uid, role: "model", text, createdAt: Date.now() }]);
      }
      // 這次成功了,之前如果有失敗紀錄(不管是不是這次重試的同一筆),都可以清掉——
      // 代表「上一個卡住的問題已經過去了」,重試按鈕沒必要繼續留著
      setLastFailed(null);
    } catch {
      // 呼叫失敗(網路、Gemini出錯等)——記下這次失敗的原始內容,讓「重試」按鈕
      // 可以直接重打一次一樣的請求,使用者不用自己重新打一次字
      setError("不好意思,剛剛出了點問題,可以再試一次嗎?");
      setLastFailed({ text: trimmed, image });
    } finally {
      setSending(false);
    }
  }

  //送出一句話,image是選填的(拍照記帳用)——文字、照片至少要有一個,兩個都給也可以
  // (例如拍收據照片+補一句「這是大杯」)。負責把使用者這句話加進畫面上的對話紀錄,
  // 真正呼叫後端的部分交給runAssistantCall
  async function sendMessage(text: string, image?: File | null) {
    const trimmed = text.trim();
    if (!uid || (!trimmed && !image)) return;

    // 照片要在清掉前端狀態之前先轉好——這裡的預覽網址(imageUrl)是給聊天紀錄畫面
    // 顯示用的本機網址,跟真正送去給Gemini辨識的base64資料是分開的兩份
    const imagePreviewUrl = image ? URL.createObjectURL(image) : undefined;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      uid,
      role: "user",
      text: trimmed,
      imageUrl: imagePreviewUrl,
      createdAt: Date.now(),
    };
    setMessages((prev) => [...prev, userMessage]);

    await runAssistantCall(trimmed, image);
  }

  // 重試:用上一次失敗時記下來的文字+照片,重新呼叫一次後端——不會再加一則新的使用者泡泡,
  // 因為那句話本來就已經顯示在畫面上了(失敗的時候沒有被移除),重複加會變成同一句話出現兩次
  async function retryLastMessage() {
    if (!lastFailed) return;
    await runAssistantCall(lastFailed.text, lastFailed.image);
  }

  // 取消:把這則帶draft的訊息移除,並留一句話收尾——不要悄悄消失什麼都不說,
  // 不然使用者會搞不清楚是真的取消成功了,還是卡住了
  function cancelDraft(message: ChatMessage) {
    if (!uid) return;
    setMessages((prev) => [
      ...prev.filter((m) => m.id !== message.id),
      {
        id: crypto.randomUUID(),
        uid,
        role: "model",
        text: "好的,這筆先不記了,需要的話隨時再跟我說。",
        createdAt: Date.now(),
      },
    ]);
  }

  // 「這不對」:跟取消不一樣,這個情境是AI配錯了但使用者還想繼續講,
  // 所以除了把錯的那張卡片移除,還要留一句話接話,讓對話自然延續下去
  // (不要整個清空,前面的對話歷史還在,Gemini之後看得到剛剛配錯的是什麼)
  function reportWrongDraft(message: ChatMessage) {
    if (!uid) return;
    setMessages((prev) => [
      ...prev.filter((m) => m.id !== message.id),
      {
        id: crypto.randomUUID(),
        uid,
        role: "model",
        text: "好的,不好意思配錯了,可以再跟我說一次正確的品牌或飲料嗎?",
        createdAt: Date.now(),
      },
    ]);
  }

  // 確認記帳:把draft資料(加上使用者可能調整過的金額、日期、備註)寫進真正的logs,
  // 成功後把這張卡片換成一句收尾訊息——前面的對話歷史保留,跟cancelDraft/reportWrongDraft
  // 同一套做法(filter掉這則、append新的一則),不再像以前整段清空
  async function confirmDraft(message: ChatMessage, amount: number, date: string, note: string) {
    if (!uid || !message.draft) return;
    const { brandName, brandIcon, drinkName, size, addOns } = message.draft;

    await addDoc(collection(db, "logs"), {
      uid,
      brand: brandName,
      drink: drinkName,
      size,
      amount,
      date,
      note,
      addOns,
      createdAt: serverTimestamp(),
    });

    setMessages((prev) => [
      ...prev.filter((m) => m.id !== message.id),
      {
        id: crypto.randomUUID(),
        uid,
        role: "model",
        text: `已經記錄:${brandName} ${drinkName} $${amount}`,
        success: { brandName, brandIcon, drinkName, amount },
        createdAt: Date.now(),
      },
    ]);
  }

  return {
    messages,
    sendMessage,
    sending,
    error,
    canRetry: lastFailed !== null,
    retryLastMessage,
    confirmDraft,
    cancelDraft,
    reportWrongDraft,
  };
}
