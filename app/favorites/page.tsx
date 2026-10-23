"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Store, CupSoda } from "lucide-react";
import {
  DndContext,
  MouseSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, rectSortingStrategy, arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { useBrandSummaries } from "@/lib/hooks/useBrandSummaries";
import { useSearchIndex } from "@/lib/hooks/useSearchIndex";
import { useFavorites } from "@/lib/hooks/useFavorites";
import FavoriteBrandMedal from "@/components/favorite-brand-medal";
import FavoriteDrinkCard from "@/components/favorite-drink-card";
import LoadingCard from "@/components/loading-card";

const MAIN_CLASS = "mx-auto w-full max-w-6xl min-w-0 px-2.5 py-6 min-[760px]:px-6";

function EmptyState({ variant }: { variant: "brand" | "drink" }) {
  const copy =
    variant === "brand"
      ? {
          Icon: Store,
          title: "還沒有本命品牌",
          desc: "到品牌頁按下愛心,常喝的那家就會住進這裡。",
          cta: "去逛逛品牌",
        }
      : {
          Icon: CupSoda,
          title: "杯架還是空的",
          desc: "喝到驚為天人的那杯,按下愛心就收進來,下次不用再煩惱點什麼。",
          cta: "找杯新飲料",
        };
  const { Icon } = copy;
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border-[3px] border-dashed border-[#3C332B]/30 px-6 py-14 text-center">
      <span className="flex size-12 items-center justify-center rounded-full border-2 border-[#3C332B] bg-[#F6F2EA]">
        <Icon className="size-5 text-[#8A7A63]" strokeWidth={2} aria-hidden />
      </span>
      <p className="text-base font-black text-[#4A3424]">{copy.title}</p>
      <p className="max-w-xs text-sm text-[#8A7A63]">{copy.desc}</p>
      <Link
        href="/"
        className="mt-1 rounded-full border-2 border-[#3C332B] bg-[#A6C285] px-4 py-1.5 text-sm font-bold text-[#2E4019] shadow-[3px_3px_0_0_#3C332B] transition-transform hover:-translate-y-0.5"
      >
        {copy.cta}
      </Link>
    </div>
  );
}

export default function FavoritesPage() {
  const { user, checkingAuth } = useCurrentUser();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"brand" | "drink">("brand");

  const { brands, brandsLoading } = useBrandSummaries();
  const { drinks, indexLoaded, loadIndex } = useSearchIndex();
  const {
    favoriteBrandSlugs,
    favoriteDrinkIds,
    favoritesLoading,
    toggleBrandFavorite,
    toggleDrinkFavorite,
    reorderBrandFavorites,
    reorderDrinkFavorites,
  } = useFavorites(user?.uid ?? null);

  useEffect(() => {
    loadIndex();
  }, []);

  useEffect(() => {
    if (!checkingAuth && !user) {
      router.push("/login");
    }
  }, [checkingAuth, user, router]);

  // 本地樂觀排序:拖曳放開的當下先改這裡,畫面馬上反應,背景再悄悄把新順序寫回Firestore,
  // 不用等資料庫往返一圈才看到效果。favoriteBrandSlugs/favoriteDrinkIds變動時
  // (收藏/取消收藏、或Firestore那邊確認寫入完成)才整個同步一次
  const [localBrandOrder, setLocalBrandOrder] = useState<string[]>([]);
  const [localDrinkOrder, setLocalDrinkOrder] = useState<string[]>([]);

  const favoriteBrandSlugsKey = favoriteBrandSlugs.join(",");
  const favoriteDrinkIdsKey = favoriteDrinkIds.join(",");

  useEffect(() => {
    // 跟著Firestore來的順序同步本地拖曳狀態,屬於跟外部資料同步的合理情境。
    // 依賴用join後的字串(而不是陣列本身),因為favoriteBrandSlugs每次render都是新陣列參照,
    // 直接放進依賴陣列會造成無限觸發
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLocalBrandOrder(favoriteBrandSlugs);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [favoriteBrandSlugsKey]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLocalDrinkOrder(favoriteDrinkIds);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [favoriteDrinkIdsKey]);

  // 拖曳放開的瞬間,滑鼠/手指通常還停在某個項目的連結上面,瀏覽器會在mouseup之後
  // 照樣補發一個click事件,害Link以為「使用者點了它」就跳轉過去。
  // 用這個旗標記住「剛剛發生過拖曳」,連結點擊時檢查一下、擋掉這一次就重置回false,
  // 下次正常點擊才不會被誤擋
  const justDraggedRef = useRef(false);
  const blockClickIfJustDragged = () => {
    if (justDraggedRef.current) {
      justDraggedRef.current = false;
      return true;
    }
    return false;
  };

  // 滑鼠跟觸控分開設定,因為兩種輸入習慣不一樣:
  // 滑鼠按下去通常會立刻移動,所以用「移動超過8px才算拖曳」(distance),按下去拖一下就有反應;
  // 觸控則容易跟「滑動捲頁」搶手勢,所以改用「按住150ms才算拖曳」(delay),快速滑動捲頁不會被誤判成拖曳
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  if (checkingAuth || !user) {
    return null;
  }

  const dataLoading = brandsLoading || !indexLoaded || favoritesLoading;

  if (dataLoading) {
    return (
      <main className={MAIN_CLASS}>
        <LoadingCard message="載入收藏中..." />
      </main>
    );
  }

  const brandMap = new Map(brands.map((b) => [b.slug, b]));
  const drinkMap = new Map(drinks.map((d) => [d.id, d]));

  // 用brandMap/drinkMap把slug/id換成完整資料,順便濾掉「收藏了但品牌/飲料本身已經不存在」的髒資料——
  // 這裡才是畫面實際會渲染的清單,所以SortableContext的items也要用這份(而不是原始的localBrandOrder),
  // 避免兩邊對不起來
  const orderedBrands = localBrandOrder.map((slug) => brandMap.get(slug)).filter((b) => b !== undefined);
  const orderedDrinks = localDrinkOrder.map((id) => drinkMap.get(id)).filter((d) => d !== undefined);
  const orderedBrandSlugs = orderedBrands.map((b) => b.slug);
  const orderedDrinkIds = orderedDrinks.map((d) => d.id);

  function handleBrandDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = orderedBrandSlugs.indexOf(String(active.id));
    const newIndex = orderedBrandSlugs.indexOf(String(over.id));
    if (oldIndex === -1 || newIndex === -1) return;
    const next = arrayMove(orderedBrandSlugs, oldIndex, newIndex);
    setLocalBrandOrder(next);
    reorderBrandFavorites(next);
  }

  function handleDrinkDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = orderedDrinkIds.indexOf(String(active.id));
    const newIndex = orderedDrinkIds.indexOf(String(over.id));
    if (oldIndex === -1 || newIndex === -1) return;
    const next = arrayMove(orderedDrinkIds, oldIndex, newIndex);
    setLocalDrinkOrder(next);
    reorderDrinkFavorites(next);
  }

  return (
    <main className={MAIN_CLASS}>
      <h1 className="text-2xl font-black text-[#3C332B]">收藏</h1>
      <p className="mt-1 text-sm text-[#8A7A63]">按住項目拖曳,就能調整順序</p>

      <div className="mt-5 mb-6 inline-flex rounded-full border-[3px] border-[#3C332B] bg-[#F6EFE4] p-1">
        <button
          onClick={() => setActiveTab("brand")}
          className={`rounded-full px-5 py-1.5 text-sm font-black transition-colors ${
            activeTab === "brand" ? "bg-[#A6C285] text-[#2E4019] shadow-[3px_3px_0_0_#3C332B]" : "text-[#8A7A63]"
          }`}
        >
          品牌
        </button>
        <button
          onClick={() => setActiveTab("drink")}
          className={`rounded-full px-5 py-1.5 text-sm font-black transition-colors ${
            activeTab === "drink" ? "bg-[#A6C285] text-[#2E4019] shadow-[3px_3px_0_0_#3C332B]" : "text-[#8A7A63]"
          }`}
        >
          飲料
        </button>
      </div>

      {activeTab === "brand" ? (
        orderedBrands.length === 0 ? (
          <EmptyState variant="brand" />
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={() => {
              justDraggedRef.current = true;
            }}
            onDragEnd={handleBrandDragEnd}
          >
            <SortableContext items={orderedBrandSlugs} strategy={rectSortingStrategy}>
              <div className="flex flex-wrap gap-x-6 gap-y-8">
                {orderedBrands.map((b, i) => (
                  <FavoriteBrandMedal
                    key={b.slug}
                    id={b.slug}
                    rank={i + 1}
                    name={b.name}
                    slug={b.slug}
                    icon={b.icon}
                    onToggleFavorite={() => toggleBrandFavorite(b.slug)}
                    onLinkClick={blockClickIfJustDragged}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )
      ) : orderedDrinks.length === 0 ? (
        <EmptyState variant="drink" />
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={() => {
            justDraggedRef.current = true;
          }}
          onDragEnd={handleDrinkDragEnd}
        >
          <SortableContext items={orderedDrinkIds} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {orderedDrinks.map((d, i) => (
                <FavoriteDrinkCard
                  key={d.id}
                  id={d.id}
                  rank={i + 1}
                  name={d.name}
                  brandName={d.brandName}
                  brandSlug={d.brandSlug}
                  brandIcon={d.brandIcon}
                  drinkId={d.id}
                  onToggleFavorite={() => toggleDrinkFavorite(d.brandSlug, d.id)}
                  onLinkClick={blockClickIfJustDragged}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </main>
  );
}
