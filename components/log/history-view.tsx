"use client";

import { useState, useEffect, useMemo } from "react";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { Plus, ChevronDown } from "lucide-react";
import { db } from "@/lib/firebase";
import LogModal from "@/components/log/log-modal";
import StatCards from "@/components/log/stat-cards";
import MonthFilter from "@/components/log/month-filter";
import FavoriteBrands from "@/components/log/favorite-brands";
import DailyReceiptList from "@/components/log/daily-receipt-list";
import { getCurrentMonthKey, monthKeyOf, calcStreak } from "@/lib/history-utils";
import type { LogEntry } from "@/lib/types";
import type { Brand } from "@/lib/brands";
import ConfirmDialog from "@/components/log/confirm-dialog";

export default function HistoryView({
  uid,
  brands,
  onAddClick,
  onSuccess,
}: {
  uid: string;
  brands: Brand[];
  onAddClick: () => void;
  // 編輯紀錄成功後要顯示的toast訊息,往上交給log頁面統一處理(新增紀錄的LogModal在頁面那層)
  onSuccess?: (message: string) => void;
}) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthKey());
  const [editingLog, setEditingLog] = useState<LogEntry | null>(null);
	const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
	// 確認刪除後,先讓這一筆淡出(fadingOutId）,動畫播完才真的呼叫deleteDoc——
	// 不然Firestore一刪完onSnapshot馬上重新渲染,畫面會瞬間消失,沒有動畫可言
	const [fadingOutId, setFadingOutId] = useState<string | null>(null);
	// 手機版「當月統計」+「最愛品牌」這一整排預設收起來,點按鈕才展開——
	// 兩個都是本月摘要性質的資訊,合併成同一個收折比較一致。760px以上不受這個狀態影響,永遠展開
	const [statsOpen, setStatsOpen] = useState(false);
	//與資料庫連線，取得使用者的紀錄
	useEffect(() => {
	const q = query(
			collection(db, "logs"),
			where("uid", "==", uid),
			orderBy("date", "desc")
	);
	const unsubscribe = onSnapshot(q, (snapshot) => {
			const data = snapshot.docs.map((doc) => ({
			id: doc.id,
			...doc.data(),
			})) as LogEntry[];
			setLogs(data);
	});
	return () => unsubscribe();
	}, [uid]);
	//month-filter
	const monthOptions = useMemo(() => {
	const set = new Set<string>();
	for (const log of logs) {
			set.add(monthKeyOf(log.date));
	}
	set.add(getCurrentMonthKey());
	return Array.from(set).sort((a, b) => (a < b ? 1 : -1));
	}, [logs]);
	//filter logs by selected month
	const logsInSelectedMonth = useMemo(() => {
	return logs.filter((log) => monthKeyOf(log.date) === selectedMonth);
	}, [logs, selectedMonth]);
  //StatCards
  const monthlyTotal = useMemo(
    () => logsInSelectedMonth.reduce((sum, log) => sum + log.amount, 0),
    [logsInSelectedMonth]
  );

  const monthlyCount = logsInSelectedMonth.length;

  //平均每杯花費
  const avgPerCup = monthlyCount > 0 ? Math.round(monthlyTotal / monthlyCount) : 0;

  //連續記帳天數:用全部的logs(不受月份篩選影響),從今天往前算
  const streakDays = useMemo(() => calcStreak(logs), [logs]);

	const { previousMonthTotal, previousMonthCount } = useMemo(() => {
  const [year, month] = selectedMonth.split("-").map(Number);
  const prevKey = `${new Date(year, month - 2, 1).getFullYear()}-${String(
    new Date(year, month - 2, 1).getMonth() + 1
  ).padStart(2, "0")}`;
  const prevLogs = logs.filter((log) => monthKeyOf(log.date) === prevKey);
  return {
    previousMonthTotal: prevLogs.reduce((sum, log) => sum + log.amount, 0),
    previousMonthCount: prevLogs.length,
  };
}, [logs, selectedMonth]);
  //favorite-brands
  const favoriteBrands = useMemo(() => {
    const counts = new Map<string, number>();
    for (const log of logsInSelectedMonth) {
      counts.set(log.brand, (counts.get(log.brand) || 0) + 1);
    }
    const list = Array.from(counts.entries()).map(([brand, count]) => ({
      brand,
      count,
    }));
    list.sort((a, b) => b.count - a.count);
    return list.slice(0, 3);
  }, [logsInSelectedMonth]);
	//DailyReceiptList
	const groupedByDate = useMemo(() => {
	const groups = new Map<string, LogEntry[]>();
	for (const log of logsInSelectedMonth) {
			if (!groups.has(log.date)) groups.set(log.date, []);
			groups.get(log.date)!.push(log);
	}
	return Array.from(groups.entries())
			.map(([key, items]) => ({
			key,
			date: key,
			items,
			subtotal: items.reduce((sum, log) => sum + log.amount, 0),
			}))
			.sort((a, b) => (a.date < b.date ? 1 : -1));
	}, [logsInSelectedMonth]);
  const handleConfirmDelete = () => {
  if (!deleteTargetId) return;
  const id = deleteTargetId;
  setDeleteTargetId(null);
  setFadingOutId(id);
  // 等220ms淡出動畫播完,才真的送出刪除——跟daily-receipt-list.tsx的
  // transition duration-200對上,留一點點餘裕避免卡在半透明狀態被切掉
  setTimeout(() => {
    deleteDoc(doc(db, "logs", id)).finally(() => setFadingOutId(null));
  }, 220);
	};

  return (
    <div>
      {/* 月份篩選跟新增紀錄放同一排,之前新增紀錄自己佔一排、月份篩選又自己佔一排,
          中間空了一塊 */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <MonthFilter value={selectedMonth} onChange={setSelectedMonth} options={monthOptions} />
        <button
          type="button"
          onClick={onAddClick}
          className="flex items-center gap-1 rounded-full border-[3px] border-[#3C332B] bg-[#3C332B] px-4 py-2 text-sm font-bold text-[#F6F2EA] shadow-[3px_3px_0_0_#3C332B] transition-all cursor-pointer hover:bg-[#A6C285] hover:text-[#3C332B] hover:shadow-[2px_2px_0_0_#3C332B] hover:translate-x-px hover:translate-y-px"
        >
          <Plus className="h-4 w-4" />
          新增紀錄
        </button>
      </div>
		{/* 手機版:按鈕+內容合併成同一個大框框(貼紙卡邊框+陰影),點按鈕用max-height
			做展開/收合動畫。760px以上frameDiv跟中間的動畫wrapper都用display:contents
			讓自己消失、不產生任何box——裡面最後那層grid(StatCards+FavoriteBrands
			直接當子元素)就等同回到原本的結構,align-items:stretch兩邊高度自動對齊
			完全不受影響 */}
		<div className="mb-4 overflow-hidden rounded-2xl border-[3px] border-[#3C332B] bg-[#F6F2EA] shadow-[3px_3px_0_0_#3C332B] min-[760px]:contents">
			<button
				type="button"
				onClick={() => setStatsOpen((v) => !v)}
				aria-expanded={statsOpen}
				className="flex w-full items-center justify-center gap-1.5 cursor-pointer px-3 py-2.5 text-xs font-medium text-[#4A3424] transition-colors hover:bg-[#F6EFE4] min-[760px]:hidden"
			>
				本月摘要
				<ChevronDown className={`h-3.5 w-3.5 shrink-0 transition-transform duration-300 ${statsOpen ? "rotate-180" : ""}`} />
			</button>
			<div
				className={`overflow-hidden transition-[max-height] duration-300 ease-in-out min-[760px]:contents ${
					statsOpen ? "max-h-[1000px] border-t-2 border-[#E3D8C6]" : "max-h-0"
				}`}
			>
				{/* 760px以下疊成單欄;760px以上左邊StatCards用minmax鎖在320~440px之間,
					右邊最愛品牌用1fr吃掉所有剩餘空間——螢幕變窄時只有最愛品牌在縮,StatCards
					維持在範圍內不會被擠爆 */}
				<div className="grid grid-cols-1 gap-3 p-3 min-[760px]:grid-cols-[minmax(320px,440px)_1fr] min-[760px]:gap-3 min-[760px]:p-0 min-[760px]:mb-4">
					<StatCards
						total={monthlyTotal}
						count={monthlyCount}
						totalDiff={monthlyTotal - previousMonthTotal}
						countDiff={monthlyCount - previousMonthCount}
						avgPerCup={avgPerCup}
						streakDays={streakDays}
					/>
					<FavoriteBrands list={favoriteBrands} brands={brands} />
				</div>
			</div>
		</div>
      <DailyReceiptList
        groups={groupedByDate}
        onEdit={setEditingLog}
        onDelete={setDeleteTargetId}
		brands={brands}
		fadingOutId={fadingOutId}
      />
      <LogModal
        key={editingLog?.id ?? "new"}
        open={!!editingLog}
        onClose={() => setEditingLog(null)}
        uid={uid}
        editingLog={editingLog}
		brands={brands}
		onSuccess={onSuccess}
      />
			{deleteTargetId && (
				<ConfirmDialog
					message="確定要刪除這筆紀錄嗎?"
					onCancel={() => setDeleteTargetId(null)}
					onConfirm={handleConfirmDelete}
				/>
			)}
    </div>
  );
}