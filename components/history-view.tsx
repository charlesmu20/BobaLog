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
import { db } from "@/lib/firebase";
import LogModal from "@/components/log-modal";
import StatCards from "@/components/stat-cards";
import MonthFilter from "@/components/month-filter";
import FavoriteBrands from "@/components/favorite-brands";
import DailyReceiptList from "@/components/daily-receipt-list";
import { getCurrentMonthKey, monthKeyOf } from "@/lib/history-utils";
import type { LogEntry } from "@/lib/types";
import ConfirmDialog from "@/components/confirm-dialog";

export default function HistoryView({ uid }: { uid: string }) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthKey());
  const [editingLog, setEditingLog] = useState<LogEntry | null>(null);
	const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
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
  const handleConfirmDelete = async () => {
  if (!deleteTargetId) return;
  await deleteDoc(doc(db, "logs", deleteTargetId));
  setDeleteTargetId(null);
	};

  return (
    <div>
			<MonthFilter value={selectedMonth} onChange={setSelectedMonth} options={monthOptions} />
		<div className="grid grid-cols-[1fr_1.4fr] gap-3 mb-4">
			<StatCards
				total={monthlyTotal}
				count={monthlyCount}
				totalDiff={monthlyTotal - previousMonthTotal}
				countDiff={monthlyCount - previousMonthCount}
			/>
			<FavoriteBrands list={favoriteBrands} selectedMonth={selectedMonth} />
		</div>
      <DailyReceiptList
        groups={groupedByDate}
        onEdit={setEditingLog}
        onDelete={setDeleteTargetId}
      />
      <LogModal
        open={!!editingLog}
        onClose={() => setEditingLog(null)}
        uid={uid}
        editingLog={editingLog}
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