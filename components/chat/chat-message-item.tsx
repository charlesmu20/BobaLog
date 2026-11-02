"use client";
import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Sparkles, Check, ArrowRight } from "lucide-react";
import type { ChatMessage } from "@/lib/hooks/useChatMessages";
import BrandIcon from "@/components/brand-icon";
import { toDateString } from "@/lib/history-utils";
import TypewriterText from "@/components/chat/typewriter-text";

// AI頭像,assistant的每則訊息(純文字跟確認卡片都算)前面都會放一個——
// 用柔和的漸層圓形+陰影,不是粗黑框那種硬線條。
// 有export出去給chat-panel.tsx用——面板一開始沒有訊息時顯示的那句問候語,
// 要畫成跟這裡一樣的樣子,不要自己另外重複寫一份
export function Avatar() {
  return (
    <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#D98A44] to-[#B2612A] shadow-sm">
      <Sparkles className="size-3.5 text-white" />
    </div>
  );
}

// 訊息進場的滑入動畫,使用者的話從右邊滑入、AI的話從左邊滑入。
// 同樣有export出去給chat-panel.tsx的問候語套用,這樣兩邊動畫手感才會一致
export function bubbleMotion(isUser: boolean) {
  return {
    initial: { opacity: 0, y: 8, x: isUser ? 12 : -12 },
    animate: { opacity: 1, y: 0, x: 0 },
    transition: { duration: 0.25, ease: [0.22, 1, 0.36, 1] as const },
  };
}

// 格式統一用 YYYY/MM/DD HH:mm(24小時制),月/日/時/分都補零成兩位數
function formatMessageTime(createdAt: number): string {
  const d = new Date(createdAt);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// 一則聊天訊息該畫成哪一種樣子:使用者自己講的話、AI的純文字回覆(追問/閒聊)、
// AI已經確定品牌飲料可以顯示確認卡片的那種、還是已經成功記帳的那種——
// 用role、draft、success這三個欄位判斷,順序很重要:draft/success要先判斷,
// 沒有的話才當作一般文字回覆
export default function ChatMessageItem({
  message,
  onConfirm,
  onCancel,
  onWrong,
  onQuickReply,
  quickReplyDisabled,
  showTimestamp,
  onNavigate,
}: {
  message: ChatMessage;
  onConfirm: (message: ChatMessage, amount: number, date: string, note: string) => void;
  onCancel: (message: ChatMessage) => void;
  onWrong: (message: ChatMessage) => void;
  // 卡片上的快捷按鈕用——目前只有MultiplePicksCards的「看看其他選項」在用,點了直接送出
  // 固定文字,等同使用者自己手動打字問「還有其他選項嗎」,不用另外做一套跟sendMessage
  // 不一樣的邏輯(避免重複關鍵字/品牌、避開已經推薦過的那套機制都原封不動沿用)
  onQuickReply: (text: string) => void;
  // 送出中(sending)的時候要disable,避免使用者連點按鈕,短時間內送出好幾次重複的請求
  quickReplyDisabled: boolean;
  // 每則訊息上面都顯示時間分隔線——目前chat-panel.tsx固定傳true,留著這個prop
  // 是方便之後如果想改回「只在間隔夠久時才顯示」,邏輯收斂在呼叫端就好,
  // 這個元件自己不用改
  showTimestamp: boolean;
  // 使用者點推薦卡片上的連結、要跳去飲料頁面時呼叫——chat-panel.tsx傳進來的其實是
  // 「把面板收起來」(setOpen(false)),跳轉當下順便把面板收起來,不要擋住剛導過去
  // 的那個頁面(手機版面板是幾乎全螢幕,擋得更明顯)。聊天紀錄不會因此消失,
  // ChatPanel是掛在layout.tsx的全域元件,之後再打開面板,訊息state還在原地
  onNavigate: () => void;
}) {
  let content: React.ReactNode;

  if (message.role === "user") {
    content = (
      <motion.div {...bubbleMotion(true)} className="flex justify-end">
        <div className="max-w-[80%] overflow-hidden rounded-2xl rounded-br-md bg-gradient-to-br from-[#D98A44] to-[#B2612A] text-sm text-white shadow-md">
          {message.imageUrl && (
            // 這是使用者送出那張照片的本機預覽網址(URL.createObjectURL產生的blob網址),
            // 不是真的存在某個地方的圖片網址,next/image的優化流程沒辦法處理blob網址
            // eslint-disable-next-line @next/next/no-img-element
            <img src={message.imageUrl} alt="使用者傳送的照片" className="max-h-48 w-full object-cover" />
          )}
          {message.text && <div className="whitespace-pre-line px-4 py-2.5">{message.text}</div>}
        </div>
      </motion.div>
    );
  } else if (message.draft) {
    content = <DraftCard message={message} onConfirm={onConfirm} onCancel={onCancel} onWrong={onWrong} />;
  } else if (message.success) {
    content = <SuccessBubble success={message.success} />;
  } else if (message.recommendation) {
    content = <RecommendationCard recommendation={message.recommendation} onNavigate={onNavigate} />;
  } else if (message.multiplePicks) {
    content = (
      <MultiplePicksCards
        picks={message.multiplePicks}
        reason={message.multiplePicksReason}
        hasMore={message.multiplePicksHasMore}
        onQuickReply={onQuickReply}
        quickReplyDisabled={quickReplyDisabled}
        onNavigate={onNavigate}
      />
    );
  } else {
    content = (
      <motion.div {...bubbleMotion(false)} className="flex items-end justify-start gap-2">
        <Avatar />
        <div className="max-w-[80%] whitespace-pre-line rounded-2xl rounded-bl-md bg-white px-4 py-2.5 text-sm text-[#3C332B] shadow-sm ring-1 ring-black/5">
          <TypewriterText text={message.text} />
        </div>
      </motion.div>
    );
  }

  // 時間顯示在訊息下方,跟著訊息本身的對齊方向走——使用者的話靠右(pr-1微調對齊
  // 泡泡圓角),AI這邊(純文字、卡片、多選清單都算)靠左,pl-9是刻意空出頭像
  // (size-7)+間距(gap-2)的寬度,讓時間跟泡泡文字的起始位置對齊,不是對齊到
  // 頭像下面。外層故意用plain div(不是flex column)包,讓content自己原本的
  // flex justify-end/justify-start版面維持100%寬度不受影響,不然套一層
  // items-end的flex column,content會被壓成shrink-to-fit,泡泡反而被擠到
  // 提早換行(之前踩過這個坑)。
  //
  // 平常不顯示,只有滑鼠移到這則訊息上面(hover)才淡入出現,比照一般聊天
  // 軟體的做法,不要每則訊息下面都一直掛著一行時間字,畫面比較乾淨
  const isUser = message.role === "user";
  return (
    <div className="group">
      {content}
      {showTimestamp && (
        <div className={`flex ${isUser ? "justify-end pr-1" : "justify-start pl-9"}`}>
          <span className="text-[11px] text-[#8A7A63]/70 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
            {formatMessageTime(message.createdAt)}
          </span>
        </div>
      )}
    </div>
  );
}

// 成功記帳的小卡片:綠色系、頭像換成打勾圖示(不是一般的Sparkles AI頭像),
// 帶上品牌logo+飲料名稱+金額,風格刻意跟一般文字回覆/draft卡片區分開,
// 一眼就能認出「這筆已經成功了」,不用去讀文字內容
function SuccessBubble({ success }: { success: NonNullable<ChatMessage["success"]> }) {
  return (
    <motion.div {...bubbleMotion(false)} className="flex items-center gap-2">
      <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#4E8F5C] shadow-sm">
        <Check className="size-4 text-white" strokeWidth={3} />
      </div>
      <div className="flex items-center gap-2 rounded-full bg-[#EAF4EC] py-2 pl-2 pr-4 ring-1 ring-[#4E8F5C]/20">
        <BrandIcon name={success.brandName} icon={success.brandIcon} size="w-6 h-6" />
        <p className="text-sm text-[#2F5D3A]">
          <span className="font-bold">{success.drinkName}</span> 已記錄・${success.amount}
        </p>
      </div>
    </motion.div>
  );
}

// 推薦飲料的結果卡片:品牌logo+品牌名稱+飲料名稱+Gemini給的理由,外加一顆按鈕
// 直接連去這杯飲料的頁面(留言/評分那頁,跟菜單頁點飲料進去是同一個路由)。
// 跟DraftCard不一樣,這裡沒有任何可以調整的欄位、也沒有確認/取消——純粹顯示結果+導頁,
// 所以不需要用到useState,是一個單純的展示用元件
function RecommendationCard({
  recommendation,
  onNavigate,
}: {
  recommendation: NonNullable<ChatMessage["recommendation"]>;
  onNavigate: () => void;
}) {
  return (
    <motion.div {...bubbleMotion(false)} className="flex items-end justify-start gap-2">
      <Avatar />
      <div className="w-64 rounded-2xl bg-white p-3.5 shadow-lg ring-1 ring-black/5">
        <div className="flex items-center gap-2">
          <BrandIcon name={recommendation.brandName} icon={recommendation.brandIcon} size="w-8 h-8" />
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-[#3C332B]">
              {recommendation.brandName} {recommendation.drinkName}
            </p>
          </div>
        </div>

        <p className="mt-2 text-xs leading-relaxed text-[#8A7A63]">{recommendation.reason}</p>

        <Link
          href={`/brand/${recommendation.brandSlug}/drink/${recommendation.drinkId}`}
          onClick={onNavigate}
          className="mt-2.5 flex w-full cursor-pointer items-center justify-center gap-1 rounded-full bg-gradient-to-br from-[#D98A44] to-[#B2612A] py-1.5 text-sm font-bold text-white shadow-md transition hover:brightness-110 active:brightness-95"
        >
          看看這杯
          <ArrowRight className="size-3.5" />
        </Link>
      </div>
    </motion.div>
  );
}

// 情境二(有口味關鍵字)或情境三(使用者明確說「都可以」)挑了幾杯(2~3杯)列出來的結果——
// 跟RecommendationCard不一樣的地方是好幾杯各自疊成一張張小卡片,不是單張大卡片。
// reason是選填的:有關鍵字的情況Gemini會給一句共同理由,畫在卡片上方一小段文字;
// 「都可以」那種沒理由可言的情況,reason是undefined,不顯示這段文字(硬掰一句「適合你」
// 反而怪,詳見recommendCoordinator.ts的說明)。頭像(Avatar)只在最前面放一次,
// 不要每張小卡片都各自放一個
function MultiplePicksCards({
  picks,
  reason,
  hasMore,
  onQuickReply,
  quickReplyDisabled,
  onNavigate,
}: {
  picks: NonNullable<ChatMessage["multiplePicks"]>;
  reason?: string;
  // 後端算出候選清單裡符合條件的是不是比這幾張卡片還多——true才畫「看看其他選項」按鈕,
  // 不然清單真的就這幾杯而已,按鈕沒有意義
  hasMore?: boolean;
  onQuickReply: (text: string) => void;
  quickReplyDisabled: boolean;
  onNavigate: () => void;
}) {
  return (
    <motion.div {...bubbleMotion(false)} className="flex items-end justify-start gap-2">
      <Avatar />
      {/* 整個回覆(理由+幾張飲料+看看其他選項按鈕)包在同一個白色對話泡泡裡,不要像以前
          那樣理由、每張飲料、按鈕各自浮一個白底泡泡——飲料那幾列改用米色底(跟DraftCard
          金額/日期欄位同一種「卡片裡的小方塊」風格),視覺上才看得出來是同一則回覆 */}
      <div className="w-64 rounded-2xl rounded-bl-md bg-white p-3.5 shadow-lg ring-1 ring-black/5">
        {reason && <p className="mb-2.5 text-xs leading-relaxed text-[#8A7A63]">{reason}</p>}
        <div className="flex flex-col gap-2">
          {picks.map((pick, i) => (
            <div
              key={`${pick.brandSlug}-${pick.drinkId}-${i}`}
              className="flex items-center gap-2 rounded-xl bg-[#F6F2EA] p-2"
            >
              <BrandIcon name={pick.brandName} icon={pick.brandIcon} size="w-7 h-7" />
              <p className="min-w-0 flex-1 truncate text-sm font-bold text-[#3C332B]">
                {pick.brandName} {pick.drinkName}
              </p>
              <Link
                href={`/brand/${pick.brandSlug}/drink/${pick.drinkId}`}
                onClick={onNavigate}
                className="flex shrink-0 cursor-pointer items-center justify-center rounded-full bg-gradient-to-br from-[#D98A44] to-[#B2612A] p-1.5 text-white shadow-md transition hover:brightness-110 active:brightness-95"
              >
                <ArrowRight className="size-3.5" />
              </Link>
            </div>
          ))}
        </div>
        {hasMore && (
          // 點了等於幫使用者送出「我想看看其他選項」這句話——不是另外呼叫新的API,
          // 就是走sendMessage原本那條路,所以避開重複、沿用已確立的關鍵字/品牌這些邏輯
          // 全部原封不動適用,跟使用者自己手動打字問「還有其他選項嗎」完全一樣
          <button
            onClick={() => onQuickReply("我想看看其他選項")}
            disabled={quickReplyDisabled}
            className="mt-2.5 w-full cursor-pointer rounded-full py-1.5 text-xs font-medium text-[#B2612A] ring-1 ring-[#B2612A]/30 transition-colors hover:bg-[#B2612A]/5 disabled:cursor-not-allowed disabled:opacity-40"
          >
            看看其他選項
          </button>
        )}
      </div>
    </motion.div>
  );
}

// 金額、日期在這裡用state管理,讓使用者可以自己調整——調整的只是這張卡片當下顯示的值,
// 真正寫進logs是按下確認的那一刻,把這裡的amount/date傳給confirmDraft
function DraftCard({
  message,
  onConfirm,
  onCancel,
  onWrong,
}: {
  message: ChatMessage;
  onConfirm: (message: ChatMessage, amount: number, date: string, note: string) => void;
  onCancel: (message: ChatMessage) => void;
  onWrong: (message: ChatMessage) => void;
}) {
  const draft = message.draft!;
  const [amount, setAmount] = useState(String(draft.amount));
  const [date, setDate] = useState(toDateString(new Date()));
  const [note, setNote] = useState(draft.note);

  const sizeLabel = draft.size === "M" ? "中杯" : draft.size === "L" ? "大杯" : null;
  // 比對到真實選項的加料(有name、price,金額已經算進draft.amount裡了)——
  // 比對不到的加料不會出現在這裡,是被塞進draft.note文字裡,使用者會在下面的備註欄位看到
  const addOnsLabel = draft.addOns.length > 0 ? draft.addOns.map((a) => a.name).join("、") : null;

  // 金額欄的輸入驗證:清空、打非數字、或打0/負數都不合法——
  // 不合法就讓「確認記帳」按鈕disable掉,不讓這種資料寫進Firestore
  const parsedAmount = Number(amount);
  const isAmountValid = amount.trim() !== "" && Number.isFinite(parsedAmount) && parsedAmount > 0;

  return (
    <motion.div {...bubbleMotion(false)} className="flex items-end justify-start gap-2">
      <Avatar />
      <div className="w-64 rounded-2xl bg-white p-3.5 shadow-lg ring-1 ring-black/5">
        {/* 品牌logo+名稱+杯型擠在同一列,不再分開佔一整行 */}
        <div className="flex items-center gap-2">
          <BrandIcon name={draft.brandName} icon={draft.brandIcon} size="w-8 h-8" />
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-[#3C332B]">
              {draft.brandName} {draft.drinkName}
            </p>
            {(sizeLabel || addOnsLabel) && (
              <p className="text-xs text-[#8A7A63]">
                {sizeLabel}
                {sizeLabel && addOnsLabel && "・"}
                {addOnsLabel && `加${addOnsLabel}`}
              </p>
            )}
          </div>
        </div>

        {/* 金額、日期各自佔一排,但label跟輸入框擠在同一個pill裡(不是放在上面另一行)——
            日期改用瀏覽器原生的<input type="date">(不再用DatePicker那個粗邊框彈窗元件) */}
        <div
          className={`mt-2.5 flex items-center gap-2 rounded-xl bg-[#F6F2EA] px-3 py-1.5 ring-1 focus-within:ring-2 focus-within:ring-[#C9732F]/40 ${
            isAmountValid ? "ring-black/5" : "ring-red-400"
          }`}
        >
          <span className="shrink-0 text-xs font-medium text-[#8A7A63]">金額</span>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full bg-transparent text-sm outline-none"
          />
        </div>
        {!isAmountValid && <p className="mt-1 text-xs text-red-500">請輸入大於0的金額</p>}

        <div className="mt-2 flex items-center gap-2 rounded-xl bg-[#F6F2EA] px-3 py-1.5 ring-1 ring-black/5 focus-within:ring-2 focus-within:ring-[#C9732F]/40">
          <span className="shrink-0 text-xs font-medium text-[#8A7A63]">日期</span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full bg-transparent text-sm outline-none"
          />
        </div>

        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="備註:甜度、冰塊..."
          className="mt-2 w-full rounded-xl bg-[#F6F2EA] px-2.5 py-1.5 text-sm outline-none ring-1 ring-black/5 focus:ring-2 focus:ring-[#C9732F]/40"
        />

        <div className="mt-2.5 flex gap-2">
          <button
            onClick={() => onCancel(message)}
            className="flex-1 cursor-pointer rounded-full py-1.5 text-xs font-medium text-[#8A7A63] ring-1 ring-black/10 transition-colors hover:bg-black/[0.03]"
          >
            取消
          </button>
          <button
            onClick={() => onWrong(message)}
            className="flex-1 cursor-pointer rounded-full py-1.5 text-xs font-medium text-[#8A7A63] ring-1 ring-black/10 transition-colors hover:bg-black/[0.03]"
          >
            這不對
          </button>
        </div>
        <button
          onClick={() => onConfirm(message, parsedAmount, date, note)}
          disabled={!isAmountValid}
          className="mt-1.5 w-full cursor-pointer rounded-full bg-gradient-to-br from-[#D98A44] to-[#B2612A] py-1.5 text-sm font-bold text-white shadow-md transition hover:brightness-110 active:brightness-95 disabled:cursor-not-allowed disabled:opacity-40"
        >
          確認記帳
        </button>
      </div>
    </motion.div>
  );
}
