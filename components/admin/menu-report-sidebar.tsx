"use client";
import { ISSUE_TYPE_LABELS, reportStatusLabel, type MenuReport } from "@/lib/menu-report-types";

function formatDate(ts: MenuReport["createdAt"]): string {
  if (!ts) return "";
  const d = ts.toDate();
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function subLabel(report: MenuReport): string {
  // 已經處理完的回報,清單上直接顯示最終結果(已核准/已拒絕/已套用,
  // 已套用的話reportStatusLabel會自動判斷要不要補上「(已復原)」),
  // 比顯示「AI已比對」這種辨識狀態更有用——辨識狀態是給還在審核的回報看的
  if (report.status !== "pending") return reportStatusLabel(report);
  if (!report.photoUrl) return "沒有照片";
  if (report.aiDiffStatus === "done") return "AI已比對";
  if (report.aiDiffStatus === "error") return "AI辨識失敗";
  return "AI辨識中";
}

// 「已處理」分組裡,不同結果用不同顏色的文字區隔,一眼掃過去就能分辨——
// 拒絕用警示的紅色調、套用(含核准)用肯定的綠色調,已復原額外用提醒用的
// 琥珀色調(表示「套用過,但後來被復原了」,跟單純的「已套用」要能區分開來)
function subLabelColorClass(report: MenuReport): string {
  if (report.status === "rejected") return "text-[#A3372B]";
  if (report.status === "approved") return "text-[#3B6D11]";
  if (report.status === "applied") {
    const allReverted =
      !!report.appliedChanges?.length && report.appliedChanges.every((c) => c.reverted);
    return allReverted ? "text-[#A3680F]" : "text-[#3B6D11]";
  }
  return "text-[#6B6153]";
}

function Group({
  title,
  reports,
  selectedId,
  onSelect,
  muted,
}: {
  title: string;
  reports: MenuReport[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  muted?: boolean;
}) {
  if (reports.length === 0) return null;
  return (
    <>
      <div className="bg-[#C9732F] px-3 py-1.5">
        <span className="text-xs font-bold text-[#FFF6EC]">
          {title}({reports.length})
        </span>
      </div>
      {reports.map((r) => (
        <button
          key={r.id}
          type="button"
          onClick={() => onSelect(r.id)}
          className={`block w-full cursor-pointer border-b-2 border-[#3C332B]/20 px-3 py-2.5 text-left transition-colors ${
            selectedId === r.id ? "bg-[#FFFDF8]" : "hover:bg-[#EDE6D8]"
          } ${muted ? "opacity-60" : ""}`}
        >
          <p className="truncate text-sm font-bold text-[#3C332B]">{r.brandName}</p>
          <span className="mt-1 inline-block rounded-full bg-[#B2612A] px-2 py-0.5 text-[11px] font-bold text-[#FFF6EC]">
            {ISSUE_TYPE_LABELS[r.issueType]}
          </span>
          <p className="mt-1 text-xs text-[#6B6153]">
            {formatDate(r.createdAt)} · <span className={`font-bold ${subLabelColorClass(r)}`}>{subLabel(r)}</span>
          </p>
        </button>
      ))}
    </>
  );
}

export default function MenuReportSidebar({
  reports,
  selectedId,
  onSelect,
}: {
  reports: MenuReport[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const pending = reports.filter((r) => r.status === "pending");
  const done = reports.filter((r) => r.status !== "pending");

  return (
    <div className="flex w-[210px] shrink-0 flex-col overflow-y-auto border-r-[3px] border-[#3C332B]">
      {reports.length === 0 && (
        <p className="flex flex-1 items-center justify-center px-3 text-center text-sm text-[#8A7A63]">
          目前沒有任何回報
        </p>
      )}
      <Group title="待審核" reports={pending} selectedId={selectedId} onSelect={onSelect} />
      <Group title="已處理" reports={done} selectedId={selectedId} onSelect={onSelect} muted />
    </div>
  );
}
