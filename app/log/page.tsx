"use client";
import { FlowButton } from "@/components/ui/flow-button";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import LogModal from "@/components/log-modal";
import HistoryView from "@/components/history-view";
import PageTitle from "@/components/ui/page-title";

export default function LogPage() {
  const [user, setUser] = useState<User | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [logOpen, setLogOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        router.push("/login");
      } else {
        setUser(currentUser);
        setCheckingAuth(false);
      }
    });
    return () => unsubscribe();
  }, [router]);

  if (checkingAuth || !user) {
    return null;
  }

  return (
    <main className="w-full max-w-6xl mx-auto px-6 py-5">
      <div className="flex justify-between items-center mb-6">
        <PageTitle>歷史紀錄</PageTitle>
        <FlowButton text="＋ 新增紀錄" onClick={() => setLogOpen(true)} />
      </div>

      <HistoryView uid={user.uid} />
        
      <LogModal
        open={logOpen}
        onClose={() => setLogOpen(false)}
        uid={user.uid}
      />
    </main>
  );
}