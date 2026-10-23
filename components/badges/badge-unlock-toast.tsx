"use client";
import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { useUserBadges } from "@/lib/hooks/useUserBadges";
import { BADGES } from "@/lib/badges";
import { MedalA } from "@/components/badges/medal-a";
import { STICKER_CARD_BASE } from "@/lib/sticker-card";

type ToastItem = { id: string; badgeId: string };

// 全域勳章解鎖慶祝toast:掛在app/layout.tsx
// 只要Firestore的userBadges即時多了一筆新文件,就會跳出提示,不用特別跑去/badges才看得到。
export default function BadgeUnlockToast() {
  const { user } = useCurrentUser();
  const { unlockedBadges, badgesLoading } = useUserBadges(user?.uid ?? null);
  // null代表「還沒做過第一次同步」,第一次同步只負責記錄、不彈toast,
  // 避免一進站就把使用者本來就有的勳章誤判成「剛剛解鎖」
  const seenRef = useRef<Set<string> | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  // 換人時seenRef要重置
  useEffect(() => {
    seenRef.current = null;
    setToasts([]);
  }, [user?.uid]);

  useEffect(() => {
    if (badgesLoading) return;

    if (seenRef.current === null) {
      seenRef.current = new Set(unlockedBadges.keys());
      return;
    }
    //抓出新解鎖的勳章
    const newlyUnlocked: string[] = [];
    for (const badgeId of unlockedBadges.keys()) {
      if (!seenRef.current.has(badgeId)) {
        newlyUnlocked.push(badgeId);
      }
    }
    // 不管是新增還是被收回,都用這次最新的狀態整個重記一次,下次比對才會準
    seenRef.current = new Set(unlockedBadges.keys());

    if (newlyUnlocked.length > 0) {
      setToasts((prev) => [
        ...prev,
        ...newlyUnlocked.map((badgeId) => ({ id: `${badgeId}-${Date.now()}`, badgeId })),
      ]);
    }
  }, [unlockedBadges, badgesLoading]);

  function dismiss(id: string) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  // 每個toast顯示5秒後自動消失
  useEffect(() => {
    if (toasts.length === 0) return;
    const timers = toasts.map((t) => setTimeout(() => dismiss(t.id), 5000));
    return () => {
      timers.forEach(clearTimeout);
    };
  }, [toasts]);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[60] flex w-[calc(100vw-2rem)] max-w-xs flex-col gap-2">
      {toasts.map((t) => {
        const badge = BADGES.find((b) => b.id === t.badgeId);
        if (!badge) return null;
        return (
          <div
            key={t.id}
            role="status"
            className={`flex items-center gap-3 p-3 ${STICKER_CARD_BASE} shadow-[4px_4px_0_0_#3C332B] animate-in fade-in slide-in-from-bottom-4 duration-300`}
          >
            <div className="size-12 shrink-0">
              <MedalA badge={badge} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-[#A6C285]">勳章解鎖！</p>
              <p className="truncate text-sm font-black text-[#4A3424]">{badge.title}</p>
            </div>
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              aria-label="關閉"
              className="shrink-0 text-[#8A7A63] hover:text-[#4A3424]"
            >
              <X className="size-4" aria-hidden />
            </button>
          </div>
        );
      })}
    </div>
  );
}
