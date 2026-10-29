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
};

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

// 跟functions/src/chatLog.ts裡的ChatLogResult是同一種形狀。drafts是陣列——
// 一次偵測到好幾杯(一張收據多個品項)的話,這裡就會有好幾筆,全部都確定了才會是這個type
// (all-or-nothing:只要有任何一杯沒確定,後端就不會回drafts,會整批變成question)
type ChatLogResponse = { type: "question"; text: string } | { type: "drafts"; drafts: DraftItem[] };

// AI聊天視窗的對話紀錄。這份對話紀錄只存在前端記憶體(一般useState),不寫進Firestore——
// 重新整理整個網頁會重置,但只是關掉/打開聊天面板不會(聊天面板本身一直掛在layout.tsx,
// 沒有被卸載)。對話本身只是一次性草稿,真正要長期保存的是confirmDraft寫進logs那筆資料。
export function useChatMessages(uid: string | null) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sending, setSending] = useState(false);
  // 呼叫失敗時的提示,只存在前端
  const [error, setError] = useState<string | null>(null);
  // 用ref保留最新的messages,避免sendMessage內用到閉包裡舊的陣列
  const messagesRef = useRef<ChatMessage[]>([]);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  //送出一句話,image是選填的(拍照記帳用)——文字、照片至少要有一個,兩個都給也可以
  // (例如拍收據照片+補一句「這是大杯」)
  async function sendMessage(text: string, image?: File | null) {
    const trimmed = text.trim();
    if (!uid || (!trimmed && !image)) return;

    setSending(true);
    setError(null);
    try {
      // 照片要在清掉前端狀態之前先轉好——這裡的預覽網址(imageUrl)是給聊天紀錄畫面
      // 顯示用的本機網址,跟真正送去給Gemini辨識的base64資料(encodedImage)是分開的兩份
      const imagePreviewUrl = image ? URL.createObjectURL(image) : undefined;

      // 先把使用者這句話(可能連同照片)加進畫面上的對話紀錄
      const userMessage: ChatMessage = {
        id: crypto.randomUUID(),
        uid,
        role: "user",
        text: trimmed,
        imageUrl: imagePreviewUrl,
        createdAt: Date.now(),
      };
      setMessages((prev) => [...prev, userMessage]);

      // 把這句之前的對話歷史整理成Gemini要的格式(這句本身當作message單獨傳,不重複放進history)
      const history = messagesRef.current.map((m) => ({ role: m.role, text: m.text }));

      // 照片縮小壓縮後轉成base64
      let encodedImage: EncodedImage | undefined;
      if (image) {
        encodedImage = await resizeImageToBase64(image);
      }

      const chatLog = httpsCallable<
        { message: string; history: typeof history; image?: EncodedImage },
        ChatLogResponse
      >(functions, "chatLog");
      const result = await chatLog({ message: trimmed, history, image: encodedImage });

      if (result.data.type === "drafts") {
        // 已經確定了(可能1杯,也可能好幾杯),每一杯都各自變成一則帶draft的訊息,
        // UI那邊看到draft存在就會畫成確認卡片——每一則訊息都有自己的id,
        // 彼此是獨立的卡片,使用者對其中一張按確認/取消,不會影響到其他幾張
        const draftMessages: ChatMessage[] = result.data.drafts.map((d) => {
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
      } else {
        // 還需要追問,純文字訊息就好。先把text抽出來存成區域變數——result.data在這個
        // if/else分支裡雖然已經窄化成"question"這個型別,但TypeScript不會把這個窄化
        // 帶進下面setMessages的callback函式裡,要在外面先取出來才抓得到型別
        const text = result.data.text;
        setMessages((prev) => [...prev, { id: crypto.randomUUID(), uid, role: "model", text, createdAt: Date.now() }]);
      }
    } catch {
      // 呼叫失敗(網路、Gemini出錯等)
      setError("不好意思,剛剛出了點問題,可以再試一次嗎?");
    } finally {
      setSending(false);
    }
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

  return { messages, sendMessage, sending, error, confirmDraft, cancelDraft, reportWrongDraft };
}
