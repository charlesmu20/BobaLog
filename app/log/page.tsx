"use client";
import { FlowButton } from "@/components/ui/flow-button";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import LogModal from "@/components/log-modal";
import HistoryView from "@/components/history-view";
import PageTitle from "@/components/ui/page-title";
import type { Brand, Drink } from "@/lib/brands";
import { useBrands } from "@/lib/hooks/useBrands";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";

export default function LogPage() {
  const { user, checkingAuth } = useCurrentUser();
  const [logOpen, setLogOpen] = useState(false);
  const router = useRouter();
  const { brands, brandsLoading } = useBrands();

  useEffect(() => {
    if (!checkingAuth && !user) {
      router.push("/login");
    }
  }, [checkingAuth, user, router]);


    if (checkingAuth || !user || brandsLoading) {
        return null;
    }

  return (
    <main className="w-full max-w-6xl mx-auto px-6 py-5">
      <div className="flex justify-between items-center mb-6">
        <PageTitle>歷史紀錄</PageTitle>
        <FlowButton text="＋ 新增紀錄" onClick={() => setLogOpen(true)} />
      </div>

      <HistoryView uid={user.uid} brands={brands} />
        
      <LogModal
        open={logOpen}
        onClose={() => setLogOpen(false)}
        uid={user.uid}
        brands={brands}
      />
    </main>
  );
}