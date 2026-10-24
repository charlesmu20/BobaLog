"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import LogModal from "@/components/log/log-modal";
import HistoryView from "@/components/log/history-view";
import LoadingCard from "@/components/loading-card";
import ErrorCard from "@/components/error-card";
import SuccessToast from "@/components/ui/success-toast";
import { useBrands } from "@/lib/hooks/useBrands";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { useSuccessToast } from "@/lib/hooks/useSuccessToast";

// 跟首頁、品牌頁同一套:手機版px-2.5讓內容多一點寬度可以用,760px以上才切回px-6
const MAIN_CLASS = "w-full min-w-0 max-w-6xl mx-auto px-2.5 py-5 min-[760px]:px-6";

export default function LogPage() {
  const { user, checkingAuth } = useCurrentUser();
  const [logOpen, setLogOpen] = useState(false);
  const router = useRouter();
  const { brands, brandsLoading, brandsError, retry } = useBrands();
  // 新增/編輯紀錄成功後的小型提示,跟勳章解鎖toast同一套視覺語言,
  // 但擺在左下角避免跟badge-unlock-toast(右下角)疊在一起
  const { toast: successToast, showToast: setSuccessToast } = useSuccessToast();

  useEffect(() => {
    if (!checkingAuth && !user) {
      router.push("/login");
    }
  }, [checkingAuth, user, router]);


    if (checkingAuth || !user || brandsLoading) {
        return (
          <main className={MAIN_CLASS}>
            <LoadingCard />
          </main>
        );
    }

    // 抓取品牌清單失敗(離線、網路問題等):給可重試的錯誤卡片,
    // 不然畫面會卡在上面的LoadingCard轉圈圈出不來
    if (brandsError) {
        return (
          <main className={MAIN_CLASS}>
            <ErrorCard title="品牌資料載入失敗" onRetry={retry} />
          </main>
        );
    }

  return (
    <main className={MAIN_CLASS}>
      <HistoryView
        uid={user.uid}
        brands={brands}
        onAddClick={() => setLogOpen(true)}
        onSuccess={setSuccessToast}
      />

      <LogModal
        open={logOpen}
        onClose={() => setLogOpen(false)}
        uid={user.uid}
        brands={brands}
        onSuccess={setSuccessToast}
      />

      <SuccessToast message={successToast} />
    </main>
  );
}