"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { useIsAdmin } from "@/lib/hooks/useIsAdmin";
import { useMenuReports } from "@/lib/hooks/useMenuReports";
import { STICKER_CARD_BASE } from "@/lib/sticker-card";
import { loadingGuard, errorGuard } from "@/components/async-guard";
import MenuReportSidebar from "@/components/admin/menu-report-sidebar";
import MenuReportDetail from "@/components/admin/menu-report-detail";

const MAIN_CLASS = "mx-auto w-full max-w-6xl min-w-0 px-2.5 py-6 min-[760px]:px-6";

export default function MenuReportAdminPage() {
  const { user, checkingAuth } = useCurrentUser();
  const { isAdmin, checkingAdmin } = useIsAdmin();
  const router = useRouter();
  const { reports, loading, error, retry } = useMenuReports(isAdmin);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (!checkingAuth && !user) {
      router.push("/login");
    }
  }, [checkingAuth, user, router]);

  // 不是管理員就直接退回首頁,不讓非管理員看到「沒有權限瀏覽這個頁面」的畫面
  useEffect(() => {
    if (!checkingAuth && !checkingAdmin && user && !isAdmin) {
      router.push("/");
    }
  }, [checkingAuth, checkingAdmin, user, isAdmin, router]);

  // 進頁面、或清單更新後(新回報進來)還沒選過任何一筆的話,預設選第一筆待審核的——
  // 跟著reports(外部Firestore資料)同步本地選取狀態,屬於合理情境。但只能自動選一次:
  // 手機版「返回清單」會把selectedId清成null,如果沒有這個ref擋著,這個effect會把
  // selectedId清成null這件事也當成「還沒選過」,立刻又自動選回第一筆待審核的,
  // 導致返回鍵看起來完全沒反應、卡死在detail畫面出不去——一旦自動選過一次,
  // 之後使用者自己清空選取就是他主動要看清單,不該再被這裡覆蓋回去
  const didAutoSelect = useRef(false);
  useEffect(() => {
    if (selectedId || didAutoSelect.current) return;
    const firstPending = reports.find((r) => r.status === "pending");
    if (firstPending) {
      didAutoSelect.current = true;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedId(firstPending.id);
    }
  }, [reports, selectedId]);

  if (checkingAuth || checkingAdmin) return loadingGuard(MAIN_CLASS, "確認權限中...");

  if (!user) return null;

  // 非管理員:上面的useEffect會觸發導回首頁,這裡直接不渲染任何內容,
  // 避免redirect生效前先閃一下「沒有權限」的畫面
  if (!isAdmin) return null;

  if (loading) return loadingGuard(MAIN_CLASS, "載入回報中...");

  if (error) return errorGuard(MAIN_CLASS, "回報資料載入失敗", undefined, retry);

  const selectedReport = reports.find((r) => r.id === selectedId) ?? null;

  return (
    <main className={MAIN_CLASS}>
      <h2 className="mb-4 text-lg font-bold text-[#3C332B]">菜單回報管理</h2>
      {/* 【優化】固定住卡片的高度(扣掉上面導覽列+標題大概的高度),裡面sidebar/detail
          各自用overflow-y-auto自己捲動——不然回報的diff筆數一多(例如一次20幾筆),
          整張卡片會被撐到很長,連同上面導覽列、左側回報清單一起被捲走,要切換別筆回報
          還得先捲回最上面,很不方便。但這個「固定高度+內部各自捲動」只適合桌面的
          左右兩欄並排——手機版(760px以下)改成「抽屜式」切換:沒選回報時只顯示
          sidebar清單(全寬,跟著整頁捲動),選了一筆之後sidebar整個藏起來、detail
          改成佔滿畫面(用返回鍵切回清單),同一時間手機版畫面上只會有一個東西, 不鎖高度。
          overflow-hidden不管手機版桌面版都要加——卡片本身是圓角(rounded-2xl),
          裡面sidebar那個「已處理」橘色標題列是方正色塊、貼齊卡片邊緣,沒有這個會讓
          方正的角從圓角外面凸出來,不只是桌面版兩欄並排時會這樣,手機版單欄堆疊
          一樣會露出來 */}
      <div
        className={`${STICKER_CARD_BASE} flex flex-col overflow-hidden shadow-[4px_4px_0_0_#3C332B] min-[760px]:h-[calc(100vh-200px)] min-[760px]:min-h-[500px] min-[760px]:flex-row`}
      >
        <MenuReportSidebar
          reports={reports}
          selectedId={selectedId}
          onSelect={setSelectedId}
          hideOnMobile={!!selectedReport}
        />
        {selectedReport ? (
          // key換成report.id:切換回報時元件整個重新掛載,核准/拒絕的本地選擇狀態、
          // 備註欄位內容才會跟著重置,不會把上一筆回報沒送出的草稿帶到這一筆來
          <MenuReportDetail
            key={selectedReport.id}
            report={selectedReport}
            onBack={() => setSelectedId(null)}
          />
        ) : (
          <div className="hidden min-h-[160px] flex-1 items-center justify-center text-sm text-[#8A7A63] min-[760px]:flex">
            選一筆回報查看詳細內容
          </div>
        )}
      </div>
    </main>
  );
}
