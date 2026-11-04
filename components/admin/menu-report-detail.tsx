"use client";
import { useState } from "react";
import { Camera, Undo2, Loader2 } from "lucide-react";
import { STICKER_CARD_BASE } from "@/lib/sticker-card";
import { STICKER_BUTTON_BASE } from "@/lib/sticker-button";
import {
  ISSUE_TYPE_LABELS,
  reportStatusLabel,
  type MenuReport,
  type DiffType,
} from "@/lib/menu-report-types";
import { useMenuReportActions } from "@/lib/hooks/useMenuReportActions";
import MenuReportDiffCard, { formatPrices, type DiffDecision } from "./menu-report-diff-card";
import PhotoLightbox from "./photo-lightbox";

const STATUS_BADGE_CLASS: Record<MenuReport["status"], string> = {
  pending: "bg-[#FAC775] text-[#633806]",
  approved: "bg-[#C0DD97] text-[#27500A]",
  rejected: "bg-[#D3D1C7] text-[#444441]",
  applied: "bg-[#C0DD97] text-[#27500A]",
};

function formatDate(ts: MenuReport["createdAt"]): string {
  if (!ts) return "";
  const d = ts.toDate();
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, "0")}:${d
    .getMinutes()
    .toString()
    .padStart(2, "0")}`;
}

type FlatDiff = {
  diffId: string;
  kind: "drink" | "addOn";
  type: DiffType;
  name: string;
  priceLine: string;
};

export default function MenuReportDetail({ report }: { report: MenuReport }) {
  const { working, error, applyDecision, revertAllChanges, updateStatus } =
    useMenuReportActions();
  const [decisions, setDecisions] = useState<Record<string, DiffDecision>>({});
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [noApplyConfirmOpen, setNoApplyConfirmOpen] = useState(false);
  const [note, setNote] = useState(report.note ?? "");
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const flatDiffs: FlatDiff[] = [
    ...(report.aiDiff?.drinks ?? []).map((d) => ({
      diffId: d.diffId,
      kind: "drink" as const,
      type: d.type,
      name: d.name,
      priceLine:
        d.type === "possiblyRemoved"
          ? `原價 ${formatPrices(d.currentPrices)}`
          : d.type === "priceMismatch"
            ? `${formatPrices(d.currentPrices)} → ${formatPrices(d.extractedPrices)}`
            : formatPrices(d.extractedPrices),
    })),
    ...(report.aiDiff?.addOns ?? []).map((a) => ({
      diffId: a.diffId,
      kind: "addOn" as const,
      type: a.type,
      name: a.name,
      priceLine:
        a.type === "possiblyRemoved"
          ? `原價 ${a.currentPrice}元`
          : a.type === "priceMismatch"
            ? `${a.currentPrice}元 → ${a.extractedPrice}元`
            : `${a.extractedPrice}元`,
    })),
  ];

  const approvedDiffIds = Object.entries(decisions)
    .filter(([, d]) => d === "approved")
    .map(([id]) => id);

  const approvedSummary = flatDiffs.filter((d) => approvedDiffIds.includes(d.diffId));
  const summaryByType = {
    newItem: approvedSummary.filter((d) => d.type === "newItem").length,
    priceMismatch: approvedSummary.filter((d) => d.type === "priceMismatch").length,
    possiblyRemoved: approvedSummary.filter((d) => d.type === "possiblyRemoved").length,
  };

  const handleApply = async () => {
    await applyDecision(report.id, approvedDiffIds);
    setConfirmOpen(false);
    setDecisions({});
  };

  const handleNoApply = async () => {
    await updateStatus(report.id, "rejected", note);
    setNoApplyConfirmOpen(false);
  };

  const hasPhoto = !!report.photoUrl;
  // 套用過的話(status==="applied")就不顯示原始diff清單了,改用下面「已套用的變更」
  // 區塊呈現實際結果;其他情況(包含已拒絕/已核准)diff清單還是留著給人看,
  // 只是核准/拒絕、全部核准/全部拒絕、送出按鈕要鎖住不能再點——
  // 不是整塊消失,是靠reviewLocked把互動元件鎖住
  const diffReady = report.aiDiffStatus === "done" && report.status !== "applied";
  const reviewLocked = report.status !== "pending";
  const diffFailed = report.aiDiffStatus === "error";
  const noDiffToReview = !hasPhoto || diffFailed;
  const stillRecognizing = hasPhoto && !report.aiDiffStatus && report.status === "pending";

  return (
    <div className="flex-1 min-w-0 p-5">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <h3 className="text-base font-bold text-[#3C332B]">{report.brandName}</h3>
        <span className="rounded-full bg-[#F0997B] px-2.5 py-0.5 text-xs font-bold text-[#4A1B0C]">
          {ISSUE_TYPE_LABELS[report.issueType]}
        </span>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${STATUS_BADGE_CLASS[report.status]}`}>
          {reportStatusLabel(report)}
        </span>
        <span className="text-xs text-[#8A7A63]">{formatDate(report.createdAt)}</span>
      </div>

      <div className="mb-5 flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="mb-1 text-xs font-bold text-[#8A7A63]">使用者說明</p>
          <p className="text-sm text-[#3C332B]">{report.description || "(沒有填寫說明)"}</p>
        </div>
        {hasPhoto && (
          <button
            type="button"
            onClick={() => setLightboxOpen(true)}
            className="group relative size-16 shrink-0 cursor-pointer overflow-hidden rounded-xl border-2 border-[#3C332B]"
            aria-label="放大看回報照片"
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- 遠端Storage照片縮圖 */}
            <img src={report.photoUrl ?? undefined} alt="回報照片縮圖" className="h-full w-full object-cover" />
            <span className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/30">
              <Camera className="size-4 text-white opacity-0 transition-opacity group-hover:opacity-100" />
            </span>
          </button>
        )}
      </div>

      {lightboxOpen && report.photoUrl && (
        <PhotoLightbox url={report.photoUrl} onClose={() => setLightboxOpen(false)} />
      )}

      {/* AI辨識時自己跳過了某些看不清楚的品項,主動回報哪裡有問題——不管這筆回報
          現在是什麼狀態都顯示,提醒審核的人這次比對結果可能不完整,要特別注意 */}
      {report.aiDiff?.uncertainNote && (
        <p className="mb-4 rounded-xl border-2 border-dashed border-[#E3B655] bg-[#FDF0D5] px-4 py-3 text-sm text-[#7A5209]">
          AI提醒:{report.aiDiff.uncertainNote}
        </p>
      )}

      {/* 這張照片沒拍到飲料主菜單/加料區塊的話,對應那邊完全沒有進行比對——不是
          「比對完發現都一樣」,是「根本沒比對」,要跟人明說,不然會誤以為沒問題 */}
      {report.aiDiffStatus === "done" && report.aiDiff && !report.aiDiff.drinksCompared && (
        <p className="mb-4 rounded-xl border-2 border-dashed border-[#C9BBA2] bg-[#F6F2EA] px-4 py-3 text-sm text-[#6B5D4F]">
          這張照片沒有拍到飲料主菜單,飲料的部分這次沒有進行比對。
        </p>
      )}
      {report.aiDiffStatus === "done" && report.aiDiff && !report.aiDiff.addOnsCompared && (
        <p className="mb-4 rounded-xl border-2 border-dashed border-[#C9BBA2] bg-[#F6F2EA] px-4 py-3 text-sm text-[#6B5D4F]">
          這張照片沒有拍到加料區塊,加料的部分這次沒有進行比對。
        </p>
      )}

      {stillRecognizing && (
        <div className="flex items-center gap-2 rounded-xl border-2 border-dashed border-[#C9BBA2] px-4 py-3 text-sm text-[#8A7A63]">
          <Loader2 className="size-4 shrink-0 animate-spin" />
          AI辨識進行中,完成後這裡會自動顯示比對結果,不用手動整理頁面。
        </div>
      )}

      {diffFailed && (
        <p className="mb-4 rounded-xl bg-[#FCEBEB] px-4 py-3 text-sm text-[#791F1F]">
          AI辨識失敗:{report.aiDiffError ?? "未知錯誤"}。請自行核對說明文字跟照片後手動處理。
        </p>
      )}

      {/* AI有順利比對完,但一筆差異都沒找到(例如菜單本來就跟資料庫一致,或者
          只是印法不同但內容沒變,被compareMenuPhoto.ts的合併名稱比對擋下來了)。
          這種情況diffReady會是true但flatDiffs是空陣列,下面那個「有差異」區塊
          完全不會顯示——沒有這段的話畫面會整個空白,卡在pending沒辦法標記完成 */}
      {diffReady && flatDiffs.length === 0 && (
        <>
          <p className="mb-4 rounded-xl border-2 border-dashed border-[#C9BBA2] px-4 py-3 text-sm text-[#8A7A63]">
            AI比對完成,沒有發現任何差異,菜單資料應該是正確的。
          </p>
          <button
            type="button"
            disabled={working || reviewLocked}
            onClick={() => setNoApplyConfirmOpen(true)}
            className={`${STICKER_BUTTON_BASE} w-full rounded-xl py-2.5 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-50`}
          >
            標記已處理
          </button>
        </>
      )}

      {diffReady && flatDiffs.length > 0 && (
        <>
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-xs font-bold text-[#8A7A63]">
              AI比對差異(共{flatDiffs.length}筆,已核准{approvedDiffIds.length}筆)
            </p>
            <div className="flex gap-1.5">
              {/* 這兩顆是「按一下套用到全部」的一次性動作按鈕,不是目前狀態的開關,
                  所以故意用同一種中性樣式(不特別把某一顆塗成綠色),避免看起來像是
                  「目前選中哪一個」的切換鈕 */}
              <button
                type="button"
                disabled={reviewLocked}
                onClick={() =>
                  setDecisions(Object.fromEntries(flatDiffs.map((d) => [d.diffId, "approved" as const])))
                }
                className="rounded-lg border-2 border-[#3C332B] bg-[#F6F2EA] px-2.5 py-1 text-xs font-bold text-[#3C332B] transition-colors enabled:cursor-pointer enabled:hover:bg-[#EDE6D8] disabled:cursor-not-allowed disabled:opacity-50"
              >
                全部核准
              </button>
              <button
                type="button"
                disabled={reviewLocked}
                onClick={() =>
                  setDecisions(Object.fromEntries(flatDiffs.map((d) => [d.diffId, "rejected" as const])))
                }
                className="rounded-lg border-2 border-[#3C332B] bg-[#F6F2EA] px-2.5 py-1 text-xs font-bold text-[#3C332B] transition-colors enabled:cursor-pointer enabled:hover:bg-[#EDE6D8] disabled:cursor-not-allowed disabled:opacity-50"
              >
                全部拒絕
              </button>
            </div>
          </div>
          <div className="mb-4 grid grid-cols-1 gap-2 min-[600px]:grid-cols-2">
            {flatDiffs.map((d) => (
              <MenuReportDiffCard
                key={d.diffId}
                type={d.type}
                name={d.name}
                priceLine={d.priceLine}
                decision={decisions[d.diffId]}
                onDecide={(decision) => setDecisions((prev) => ({ ...prev, [d.diffId]: decision }))}
                locked={reviewLocked}
              />
            ))}
          </div>

          {/* 同一顆按鈕依核准筆數切換動作:有核准項目就跳「確認套用」視窗;
              一筆都沒核准(例如全部拒絕)就跳「確認標記已處理」視窗——兩種都要先
              跳確認視窗,不能按下去就直接送出,不用另外多放一顆按鈕。
              reviewLocked時鎖住不能再點,但不隱藏——這筆回報處理完的結果還是留著給人看 */}
          <button
            type="button"
            disabled={working || reviewLocked}
            onClick={() =>
              approvedDiffIds.length > 0 ? setConfirmOpen(true) : setNoApplyConfirmOpen(true)
            }
            className={`${STICKER_BUTTON_BASE} w-full rounded-xl py-2.5 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-x-0 disabled:hover:translate-y-0 disabled:hover:shadow-[3px_3px_0_0_#3C332B]`}
          >
            {approvedDiffIds.length > 0
              ? `套用已核准的變更(${approvedDiffIds.length})`
              : "不套用,直接標記已處理"}
          </button>
        </>
      )}

      {report.status === "applied" && report.appliedChanges && report.appliedChanges.length > 0 && (
        <>
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-xs font-bold text-[#8A7A63]">已套用的變更</p>
            {report.appliedChanges.some((c) => !c.reverted) && (
              <button
                type="button"
                disabled={working}
                onClick={() => revertAllChanges(report.id)}
                className="flex items-center gap-1 rounded-lg border-2 border-[#3C332B] bg-[#F6F2EA] px-2.5 py-1 text-xs font-bold text-[#3C332B] transition-colors enabled:cursor-pointer enabled:hover:bg-[#EDE6D8] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {working ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Undo2 className="size-3.5" />
                )}
                {working ? "復原中..." : "一次復原全部"}
              </button>
            )}
          </div>
          <div className="mb-4 grid grid-cols-1 gap-2 min-[600px]:grid-cols-2">
            {report.appliedChanges.map((c) => (
              <div
                key={c.diffId}
                className={`flex items-center justify-between gap-3 rounded-2xl border-[2px] border-[#3C332B] px-3 py-2 ${
                  c.reverted ? "bg-[#F1EFE8] opacity-60" : "bg-white"
                }`}
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-[#3C332B]">{c.name}</p>
                  <p className="mt-0.5 text-xs text-[#8A7A63]">{c.reverted ? "已復原" : "已套用"}</p>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {noDiffToReview && report.status === "pending" && (
        <>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="備註(選填),例如已經自己去哪裡處理好了"
            rows={2}
            className="mb-3 w-full resize-none rounded-xl border-2 border-[#3C332B] bg-white px-3 py-2 text-sm text-[#3C332B] placeholder:text-[#9A8B7A] focus:outline-none"
          />
          <div className="flex gap-2">
            <button
              type="button"
              disabled={working}
              onClick={() => updateStatus(report.id, "approved", note)}
              className={`${STICKER_BUTTON_BASE} flex-1 rounded-xl py-2.5 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-50`}
            >
              核准
            </button>
            <button
              type="button"
              disabled={working}
              onClick={() => updateStatus(report.id, "rejected", note)}
              className="flex-1 cursor-pointer rounded-xl border-[3px] border-[#3C332B] bg-[#F6F2EA] py-2.5 text-sm font-bold text-[#3C332B] transition-colors hover:bg-[#EDE6D8] disabled:cursor-not-allowed disabled:opacity-50"
            >
              拒絕
            </button>
          </div>
        </>
      )}

      {(report.status === "approved" || report.status === "rejected") && report.note && (
        <p className="text-sm text-[#8A7A63]">備註:{report.note}</p>
      )}

      {error && <p className="mt-3 text-sm text-[#A3372B]">{error}</p>}

      {confirmOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-5">
          <div className={`${STICKER_CARD_BASE} w-full max-w-xs p-5 shadow-[5px_5px_0_0_#3C332B]`}>
            <h4 className="mb-3 text-base font-bold text-[#3C332B]">確認套用</h4>
            <ul className="mb-4 space-y-1 text-sm text-[#3C332B]">
              {summaryByType.newItem > 0 && <li>新增 {summaryByType.newItem} 筆</li>}
              {summaryByType.priceMismatch > 0 && <li>更新價格 {summaryByType.priceMismatch} 筆</li>}
              {summaryByType.possiblyRemoved > 0 && <li>刪除 {summaryByType.possiblyRemoved} 筆</li>}
            </ul>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                className="flex-1 cursor-pointer rounded-xl border-2 border-[#3C332B] bg-white py-2 text-sm font-bold text-[#3C332B] hover:bg-[#F6F2EA]"
              >
                取消
              </button>
              <button
                type="button"
                disabled={working}
                onClick={handleApply}
                className={`${STICKER_BUTTON_BASE} flex-1 rounded-xl py-2 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-50`}
              >
                {working ? "套用中..." : "確認套用"}
              </button>
            </div>
          </div>
        </div>
      )}

      {noApplyConfirmOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-5">
          <div className={`${STICKER_CARD_BASE} w-full max-w-xs p-5 shadow-[5px_5px_0_0_#3C332B]`}>
            <h4 className="mb-3 text-base font-bold text-[#3C332B]">確認標記已處理</h4>
            <p className="mb-4 text-sm text-[#3C332B]">
              不會套用任何變更到菜單,直接把這筆回報標記成已處理,確定嗎?
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setNoApplyConfirmOpen(false)}
                className="flex-1 cursor-pointer rounded-xl border-2 border-[#3C332B] bg-white py-2 text-sm font-bold text-[#3C332B] hover:bg-[#F6F2EA]"
              >
                取消
              </button>
              <button
                type="button"
                disabled={working}
                onClick={handleNoApply}
                className={`${STICKER_BUTTON_BASE} flex-1 rounded-xl py-2 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-50`}
              >
                {working ? "處理中..." : "確認標記"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
