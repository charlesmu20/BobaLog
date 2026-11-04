"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { useIsAdmin } from "@/lib/hooks/useIsAdmin";
import { useMenuReports } from "@/lib/hooks/useMenuReports";
import { STICKER_CARD_BASE } from "@/lib/sticker-card";
import LoadingCard from "@/components/loading-card";
import MenuReportSidebar from "@/components/admin/menu-report-sidebar";
import MenuReportDetail from "@/components/admin/menu-report-detail";

const MAIN_CLASS = "mx-auto w-full max-w-6xl min-w-0 px-2.5 py-6 min-[760px]:px-6";

export default function MenuReportAdminPage() {
  const { user, checkingAuth } = useCurrentUser();
  const { isAdmin, checkingAdmin } = useIsAdmin();
  const router = useRouter();
  const { reports, loading } = useMenuReports(isAdmin);
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
  // 跟著reports(外部Firestore資料)同步本地選取狀態,屬於合理情境
  useEffect(() => {
    if (selectedId) return;
    const firstPending = reports.find((r) => r.status === "pending");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (firstPending) setSelectedId(firstPending.id);
  }, [reports, selectedId]);

  if (checkingAuth || checkingAdmin) {
    return (
      <main className={MAIN_CLASS}>
        <LoadingCard message="確認權限中..." />
      </main>
    );
  }

  if (!user) return null;

  // 非管理員:上面的useEffect會觸發導回首頁,這裡直接不渲染任何內容,
  // 避免redirect生效前先閃一下「沒有權限」的畫面
  if (!isAdmin) return null;

  if (loading) {
    return (
      <main className={MAIN_CLASS}>
        <LoadingCard message="載入回報中..." />
      </main>
    );
  }

  const selectedReport = reports.find((r) => r.id === selectedId) ?? null;

  return (
    <main className={MAIN_CLASS}>
      <h2 className="mb-4 text-lg font-bold text-[#3C332B]">菜單回報管理</h2>
      <div
        className={`${STICKER_CARD_BASE} flex min-h-[500px] overflow-hidden shadow-[4px_4px_0_0_#3C332B]`}
      >
        <MenuReportSidebar reports={reports} selectedId={selectedId} onSelect={setSelectedId} />
        {selectedReport ? (
          // key換成report.id:切換回報時元件整個重新掛載,核准/拒絕的本地選擇狀態、
          // 備註欄位內容才會跟著重置,不會把上一筆回報沒送出的草稿帶到這一筆來
          <MenuReportDetail key={selectedReport.id} report={selectedReport} />
        ) : (
          <div className="flex flex-1 items-center justify-center text-sm text-[#8A7A63]">
            從左側選一筆回報查看
          </div>
        )}
      </div>
    </main>
  );
}
