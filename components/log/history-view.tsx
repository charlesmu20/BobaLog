"use client";

import { useState, useMemo } from "react";
import { deleteDoc, doc } from "firebase/firestore";
import { Plus, ChevronDown } from "lucide-react";
import { db } from "@/lib/firebase";
import LogModal from "@/components/log/log-modal";
import StatCards from "@/components/log/stat-cards";
import MonthFilter from "@/components/log/month-filter";
import FavoriteBrands from "@/components/log/favorite-brands";
import FavoriteDrinks from "@/components/log/favorite-drinks";
import DailyReceiptList from "@/components/log/daily-receipt-list";
import { getCurrentMonthKey, monthKeyOf, calcStreak, formatMonthLabel } from "@/lib/history-utils";
import type { LogEntry } from "@/lib/types";
import type { Brand } from "@/lib/brands";
import ConfirmDialog from "@/components/log/confirm-dialog";

export default function HistoryView({
  uid,
  brands,
  logs,
  onAddClick,
  onSuccess,
}: {
  uid: string;
  brands: Brand[];
  // logs的抓取(onSnapshot監聽)現在搬到app/log/page.tsx那層的useLogs,
  // 這裡只負責拿現成的資料來算月份篩選、統計、分組這些衍生畫面,不再自己監聽
  logs: LogEntry[];
  onAddClick: () => void;
  // 編輯紀錄成功後要顯示的toast訊息,往上交給log頁面統一處理(新增紀錄的LogModal在頁面那層)
  onSuccess?: (message: string) => void;
}) {
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthKey());
  const [editingLog, setEditingLog] = useState<LogEntry | null>(null);
	const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
	// 確認刪除後,先讓這一筆淡出(fadingOutId）,動畫播完才真的呼叫deleteDoc——
	// 不然Firestore一刪完onSnapshot馬上重新渲染,畫面會瞬間消失,沒有動畫可言
	const [fadingOutId, setFadingOutId] = useState<string | null>(null);
	// 手機版「當月統計」+「最愛品牌」這一整排預設收起來,點按鈕才展開——
	// 兩個都是本月摘要性質的資訊,合併成同一個收折比較一致。760px以上不受這個狀態影響,永遠展開
	const [statsOpen, setStatsOpen] = useState(false);
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
  //當月飲料排行:跟favoriteBrand同一套分組邏輯,但key換成「品牌+飲料」的組合,
  //不分M/L杯型合併算同一組——跟profile頁面算全時間最愛飲料的key邏輯一致
  const favoriteDrinks = useMemo(() => {
    const counts = new Map<string, { brand: string; drink: string; count: number }>();
    for (const log of logsInSelectedMonth) {
      const key = `${log.brand}::${log.drink}`;
      const entry = counts.get(key);
      if (entry) entry.count += 1;
      else counts.set(key, { brand: log.brand, drink: log.drink, count: 1 });
    }
    return Array.from(counts.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);
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
		{/* 整塊(header bar+內容)從小尺寸到寬螢幕都是同一個框框、同一個底色,不再用
			display:contents讓外框在寬螢幕消失——跟勳章頁「我的成就」總覽卡一樣,
			永遠是一張完整的卡片。1076px以下才會有收合按鈕可以點(展開/收合這塊),
			1076px以上固定展開(min-[1076px]:max-h-none蓋掉收合用的max-height) */}
		<div className="mb-4 overflow-hidden rounded-2xl border-[3px] border-[#3C332B] shadow-[3px_3px_0_0_#3C332B]">
			{/* 深咖啡實心header bar,跟勳章頁「我的成就」總覽卡同一套語言 */}
			<div className="flex items-center justify-between gap-2 bg-[#3C332B] px-4 py-2.5 text-[#F6F2EA]">
				<span className="text-sm font-bold tracking-wide">本月摘要</span>
				<div className="flex items-center gap-3">
					<span className="text-xs font-bold tracking-widest text-[#A6C285]">{formatMonthLabel(selectedMonth)}</span>
					<button
						type="button"
						onClick={() => setStatsOpen((v) => !v)}
						aria-expanded={statsOpen}
						aria-label="展開或收合本月摘要"
						className="flex cursor-pointer items-center text-[#F6F2EA] min-[1076px]:hidden"
					>
						<ChevronDown className={`h-3.5 w-3.5 shrink-0 transition-transform duration-300 ${statsOpen ? "rotate-180" : ""}`} />
					</button>
				</div>
			</div>
			{/* 底色換成跟勳章頁「已解鎖」展示櫃同一款點點紋路底(khaki+radial-gradient小圓點),
				取代原本平淡的米白,裡面的StatCards/FavoriteBrands小卡維持原本白底,視覺上才會浮起來 */}
			<div
				className={`overflow-hidden bg-[#E3D8C6] bg-[radial-gradient(#3C332B26_1.5px,transparent_1.5px)] bg-[length:14px_14px] transition-[max-height] duration-300 ease-in-out min-[1076px]:max-h-none ${
					statsOpen ? "max-h-[1000px]" : "max-h-0"
				}`}
			>
				{/* 1075px以下全部疊成單欄,StatCards跟最愛品牌/飲料排行上下疊放、都用滿整個寬度,
					不再讓最愛品牌/飲料排行去分StatCards旁邊剩下的空間,從根本上避開擠爆文字的問題。
					1076px以上才切回左右並排(StatCards鎖在320~440px窄欄,右邊1fr)——這個寬度下
					1fr拿到的剩餘空間一定夠寬,兩張卡用repeat(auto-fit,minmax(260px,1fr))自動排版 */}
				<div className="grid grid-cols-1 gap-3 p-3 min-[1076px]:grid-cols-[minmax(320px,440px)_1fr]">
					<StatCards
						total={monthlyTotal}
						count={monthlyCount}
						totalDiff={monthlyTotal - previousMonthTotal}
						countDiff={monthlyCount - previousMonthCount}
						avgPerCup={avgPerCup}
						streakDays={streakDays}
					/>
					<div className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-3">
						<FavoriteBrands list={favoriteBrands} brands={brands} />
						<FavoriteDrinks list={favoriteDrinks} brands={brands} />
					</div>
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
		logs={logs}
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