"use client";

import { useState, useMemo } from "react";
import {
  collection,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import { X, CircleDollarSign, PenLine, Plus } from "lucide-react";
import { db } from "@/lib/firebase";
import type { Brand, Drink, AddOn } from "@/lib/brands";
import DatePicker from "@/components/log/date-picker";
import BrandField from "@/components/log/log-modal/brand-field";
import DrinkField from "@/components/log/log-modal/drink-field";
import AddOnField from "@/components/log/log-modal/addon-field";
import QuickPicks from "@/components/log/log-modal/quick-picks";
import type { LogEntry } from "@/lib/types";
import { STICKER_CARD_BASE } from "@/lib/sticker-card";
import { STICKER_BUTTON_BASE } from "@/lib/sticker-button";
import { toDateString } from "@/lib/history-utils";
import { useSearchIndex, type SearchDrink } from "@/lib/hooks/useSearchIndex";

export default function LogModal({
  open,
  onClose,
  uid,
  editingLog,
  brands,
  logs,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  uid: string;
  editingLog?: LogEntry | null;
  brands: Brand[];
  // 使用者之前記過的所有紀錄,拿來做「快速記帳」的候選清單——只在新增模式顯示,
  // 編輯模式(editingLog存在)不需要
  logs: LogEntry[];
  // 儲存成功後要顯示的訊息,交給外層(history-view/log頁面)決定要不要彈toast
  onSuccess?: (message: string) => void;
}) {
  // 原本這些初始值是用useEffect在「editingLog變了之後」才setState回填,
  // 會被react-hooks/set-state-in-effect標記(effect裡直接setState,沒有等任何外部東西)。
  // 現在改成直接在這裡算出正確的初始值;要搭配外層(history-view.tsx)幫<LogModal>加上
  // key={editingLog?.id ?? "new"},這樣每次切換成編輯不同筆紀錄,React都會把這個元件當成
  // 全新的重新掛載一次,這些初始值才會重新跑一次,效果跟原本的useEffect一樣,但不用在effect裡setState
  // 先用brandSlug/drinkId比對(不受改名影響),舊紀錄沒有這兩個欄位的話(undefined),
  // find會直接找不到、自動退回用名稱比對——行為跟原本一樣,不會影響舊紀錄
  const initialBrand = editingLog
    ? brands.find((b) => b.slug === editingLog.brandSlug) ?? brands.find((b) => b.name === editingLog.brand) ?? null
    : null;
  const initialDrink =
    editingLog && initialBrand
      ? initialBrand.drinks.find((d) => d.id === editingLog.drinkId) ??
        initialBrand.drinks.find((d) => d.name === editingLog.drink) ??
        null
      : null;
  const initialAddOns = editingLog?.addOns ?? [];

  const [brandInput, setBrandInput] = useState(editingLog?.brand ?? "");
  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(initialBrand);

  const [drinkInput, setDrinkInput] = useState(editingLog?.drink ?? "");
  const [selectedDrink, setSelectedDrink] = useState<Drink | null>(initialDrink);

  const [size, setSize] = useState<"M" | "L">(editingLog?.size || "M");
  const [amount, setAmount] = useState(editingLog ? String(editingLog.amount) : "");
  const [date, setDate] = useState(editingLog?.date ?? toDateString(new Date()));
  const [note, setNote] = useState(editingLog?.note ?? "");
  const [selectedAddOns, setSelectedAddOns] = useState<AddOn[]>(initialAddOns);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // 加料、備註都是選填欄位,預設收合成一個小按鈕,不佔版面高度,點了才展開成完整欄位——
  // 版面太長常常需要捲動才能按到「新增紀錄」。如果是編輯模式而且本來就有填,直接展開
  // 讓使用者看得到原本填了什麼,不用自己點開
  const [addOnSectionOpen, setAddOnSectionOpen] = useState(initialAddOns.length > 0);
  const [noteSectionOpen, setNoteSectionOpen] = useState(!!editingLog?.note);

  const resetForm = () => {
    setBrandInput("");
    setSelectedBrand(null);
    setDrinkInput("");
    setSelectedDrink(null);
    setSize("M");
    setAmount("");
    setDate(toDateString(new Date()));
    setNote("");
    setSelectedAddOns([]);
    setAddOnSectionOpen(false);
    setNoteSectionOpen(false);
  };

  // 還沒選品牌的話,飲料欄位改成跨品牌搜尋(用首頁Hero搜尋同一套useSearchIndex),
  // 已經選了品牌就維持原本只在該品牌底下的飲料裡面找
  const searchIndex = useSearchIndex();

  const filteredDrinks = useMemo(() => {
    if (selectedBrand) {
      return selectedBrand.drinks.filter((d) => d.name.includes(drinkInput));
    }
    // 沒選品牌、也還沒打字的話先不要把整個資料庫的飲料全部倒出來
    if (!drinkInput) return [];
    return searchIndex.drinks.filter((d) => d.name.includes(drinkInput));
  }, [selectedBrand, drinkInput, searchIndex.drinks]);

  // 快速記帳:只在新增模式(沒有editingLog)顯示。按「喝過幾次」排序,常喝的排前面,
  // 不是單純按最近一次記錄的時間——logs本身是date desc排序,所以同一組合第一次
  // 遇到的就是最新那筆,直接拿來當點擊後要帶入的資料(金額用最近一次實際付的錢)
  const quickPicks = useMemo(() => {
    if (editingLog) return [];
    const countMap = new Map<string, { count: number; mostRecent: LogEntry }>();
    for (const log of logs) {
      const key = `${log.brand}-${log.drink}-${log.size ?? ""}`;
      const existing = countMap.get(key);
      if (existing) {
        existing.count += 1;
      } else {
        countMap.set(key, { count: 1, mostRecent: log });
      }
    }
    return Array.from(countMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 6)
      .map((v) => v.mostRecent);
  }, [logs, editingLog]);

  const hasSizeOptions = selectedDrink
    ? selectedDrink.prices.M !== selectedDrink.prices.L
    : false;

  // 加料選項是品牌底下的(不是飲料底下),選了品牌就能顯示;
  // 沒有addOns或是空陣列的品牌,這塊UI直接不渲染
  const addOns = selectedBrand?.addOns ?? [];

  // 「飲料價格+目前選的加料加總」這個算式原本在選飲料/切杯型/勾加料/收合加料
  // 四個地方各寫一次,抽成這個小helper統一算
  const computeAmount = (drink: Drink, sizeValue: "M" | "L", addOnsList: AddOn[]) =>
    drink.prices[sizeValue] + addOnsList.reduce((sum, a) => sum + a.price, 0);

  // 跟聊天室DraftCard同一套驗證:金額欄位清空或打非正數,擋掉送出
  const amountTouched = amount.trim() !== "";
  const parsedAmount = Number(amount);
  const isAmountValid = amountTouched && Number.isFinite(parsedAmount) && parsedAmount > 0;

  const handleBrandInputChange = (value: string) => {
    setBrandInput(value);
    if (selectedBrand && value !== selectedBrand.name) {
      setSelectedBrand(null);
      setDrinkInput("");
      setSelectedDrink(null);
      setAmount("");
    }
  };

  const handleSelectBrand = (brand: Brand) => {
    setSelectedBrand(brand);
    setBrandInput(brand.name);
    setDrinkInput("");
    setSelectedDrink(null);
    setAmount("");
    // 換品牌,加料清單也跟著換了,舊的選擇留著沒意義
    setSelectedAddOns([]);
  };

  const handleDrinkInputChange = (value: string) => {
    setDrinkInput(value);
    if (selectedDrink && value !== selectedDrink.name) {
      setSelectedDrink(null);
    }
  };

  const handleDrinkFocus = () => {
    // 還沒選品牌時才需要跨品牌搜尋索引,已經選了品牌的話直接用brands.drinks就夠了;
    // loadIndex內部本身有防重複載入,叫兩次也沒差
    if (!selectedBrand) searchIndex.loadIndex();
  };

  const handleSelectDrink = (drink: Drink) => {
    setSelectedDrink(drink);
    setDrinkInput(drink.name);
    setSize("M");
    // 換飲料不影響已選的加料(加料是品牌層級的),金額要把加料的加價一起算進去
    setAmount(String(computeAmount(drink, "M", selectedAddOns)));
  };

  // 跨品牌搜尋選到的飲料:品牌欄位自動帶入該飲料所屬的品牌,
  // 加料清單是品牌層級的,換品牌了舊的選擇留著沒意義,直接清空
  const handleSelectCrossBrandDrink = (d: SearchDrink) => {
    const brand = brands.find((b) => b.slug === d.brandSlug) ?? null;
    setSelectedBrand(brand);
    setBrandInput(d.brandName);
    setSelectedDrink(d);
    setDrinkInput(d.name);
    setSize("M");
    setAmount(String(d.prices.M));
    setSelectedAddOns([]);
  };

  // 快速記帳:只回填品牌、飲料、杯型,金額直接用那筆歷史紀錄的金額(保留原本實際付的錢)。
  // 刻意不回填加料——handleToggleAddOn是根據「目前render」的selectedAddOns去重算金額,
  // 如果在這裡呼叫setSelectedAddOns,算出來的金額會跟上面setAmount互相蓋掉,順序抓不準
  const handleQuickPick = (entry: LogEntry) => {
    // 同上,先用slug/id比對,找不到才退回用名稱比對
    const brand = brands.find((b) => b.slug === entry.brandSlug) ?? brands.find((b) => b.name === entry.brand) ?? null;
    const drink =
      brand?.drinks.find((d) => d.id === entry.drinkId) ?? brand?.drinks.find((d) => d.name === entry.drink) ?? null;
    setSelectedBrand(brand);
    setBrandInput(entry.brand);
    setSelectedDrink(drink);
    setDrinkInput(entry.drink);
    setSize(entry.size ?? "M");
    setAmount(String(entry.amount));
    setSelectedAddOns([]);
  };

  const handleSizeChange = (value: "M" | "L") => {
    setSize(value);
    if (selectedDrink) {
      setAmount(String(computeAmount(selectedDrink, value, selectedAddOns)));
    }
  };

  // 勾選/取消加料:跟切換M/L杯型同一套邏輯,只要飲料已經選了,金額就自動重算
  // (飲料本身價格+目前選的加料加總),直接蓋掉原本的金額
  const handleToggleAddOn = (addOn: AddOn) => {
    setSelectedAddOns((prev) => {
      const exists = prev.some((a) => a.name === addOn.name);
      const next = exists ? prev.filter((a) => a.name !== addOn.name) : [...prev, addOn];
      if (selectedDrink) {
        setAmount(String(computeAmount(selectedDrink, size, next)));
      }
      return next;
    });
  };

  const handleClearBrand = () => {
    setBrandInput("");
    setSelectedBrand(null);
    setDrinkInput("");
    setSelectedDrink(null);
    setAmount("");
    setSelectedAddOns([]);
  };

  const handleClearDrink = () => {
    setDrinkInput("");
    setSelectedDrink(null);
  };

  // 加料欄位收合回去:選的加料清掉,金額也要跟著扣回去(跟handleToggleAddOn同一套算法,
  // 只是這裡是直接歸零)
  const handleCollapseAddOns = () => {
    setSelectedAddOns([]);
    setAddOnSectionOpen(false);
    if (selectedDrink) {
      setAmount(String(computeAmount(selectedDrink, size, [])));
    }
  };

  const handleCollapseNote = () => {
    setNote("");
    setNoteSectionOpen(false);
  };

  const handleSubmit = async () => {
    if (!selectedBrand || !selectedDrink || !isAmountValid) return;
    setSubmitting(true);
    setError("");
    try {
      const payload = {
        uid,
        brand: selectedBrand.name,
        drink: selectedDrink.name,
        // brandSlug/drinkId:固定代號,品牌/飲料之後改名也還找得到——
        // 不影響brand/drink這兩個欄位原本的用途(當下顯示名稱的快照)
        brandSlug: selectedBrand.slug,
        drinkId: selectedDrink.id ?? null,
        size: hasSizeOptions ? size : null,
        amount: parsedAmount,
        date: date,
        note,
        addOns: selectedAddOns,
      };
      if (editingLog) {
        await updateDoc(doc(db, "logs", editingLog.id), payload);
      } else {
        await addDoc(collection(db, "logs"), {
          ...payload,
          createdAt: serverTimestamp(),
        });
      }
      resetForm();
      onSuccess?.(editingLog ? "已更新紀錄" : "已新增一筆紀錄");
      onClose();
    } catch {
      setError("儲存失敗,請稍後再試");
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-5 z-50 animate-in fade-in duration-200">
      {/* 邊框圓角跟捲動不能放同一層,原理跟DropdownPanel的註解一樣——捲軸是瀏覽器畫的,
          不會乖乖沿著rounded-2xl走。外層只負責邊框+圓角+陰影+overflow-hidden裁切,
          真正的捲動包在內層div */}
      <div className={`${STICKER_CARD_BASE} max-w-sm w-full overflow-hidden shadow-[6px_6px_0_0_#3C332B] animate-in fade-in zoom-in-95 duration-200`}>
      <div className="max-h-[90vh] overflow-y-auto p-6">
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-lg font-bold text-[#3C332B]">
            {editingLog ? "編輯消費紀錄" : "記一筆消費"}
          </h2>
          <button onClick={onClose} aria-label="關閉" className="text-[#8A7A63] cursor-pointer transition-colors hover:text-[#3C332B]">
            <X className="w-4 h-4" />
          </button>
        </div>

        <QuickPicks entries={quickPicks} brands={brands} onPick={handleQuickPick} />

        <div className="mb-4">
          <label className="text-sm text-[#8A7A63] block mb-1">日期</label>
          <DatePicker value={date} onChange={setDate} />
        </div>

        <BrandField
          brands={brands}
          brandInput={brandInput}
          selectedBrand={selectedBrand}
          onInputChange={handleBrandInputChange}
          onSelect={handleSelectBrand}
          onClear={handleClearBrand}
        />

        <DrinkField
          selectedBrand={selectedBrand}
          drinkInput={drinkInput}
          drinkOptions={filteredDrinks}
          placeholder={selectedBrand ? "輸入或選擇飲料" : "輸入飲料名稱(可跨品牌搜尋)"}
          onInputChange={handleDrinkInputChange}
          onFocus={handleDrinkFocus}
          onSelect={handleSelectDrink}
          onSelectCrossBrand={handleSelectCrossBrandDrink}
          onClear={handleClearDrink}
        />

        {hasSizeOptions && (
          <div className="mb-4">
            <label className="text-sm text-[#8A7A63] block mb-1">杯型</label>
            <div className="flex gap-2">
              <button
                onClick={() => handleSizeChange("M")}
                className={`flex-1 rounded-2xl py-3 text-sm font-medium cursor-pointer transition-all ${
                  size === "M"
                    ? "border-[3px] border-[#3C332B] bg-[#F6F2EA] text-[#C9732F] shadow-[4px_4px_0_0_#3C332B]"
                    : "border-[3px] border-[#E3D8C6] text-[#4A3424] hover:border-[#C9732F]"
                }`}
              >
                中杯 M
              </button>
              <button
                onClick={() => handleSizeChange("L")}
                className={`flex-1 rounded-2xl py-3 text-sm font-medium cursor-pointer transition-all ${
                  size === "L"
                    ? "border-[3px] border-[#3C332B] bg-[#F6F2EA] text-[#C9732F] shadow-[4px_4px_0_0_#3C332B]"
                    : "border-[3px] border-[#E3D8C6] text-[#4A3424] hover:border-[#C9732F]"
                }`}
              >
                大杯 L
              </button>
            </div>
          </div>
        )}

        <AddOnField
          addOns={addOns}
          selected={selectedAddOns}
          sectionOpen={addOnSectionOpen}
          onToggle={handleToggleAddOn}
          onOpenSection={() => setAddOnSectionOpen(true)}
          onCollapseSection={handleCollapseAddOns}
        />

        <div className="mb-4">
          <label className="text-sm text-[#8A7A63] block mb-1">金額(可修改)</label>
          <div
            className={`flex items-center gap-2.5 rounded-2xl border-[3px] bg-[#F6F2EA] px-4 shadow-[4px_4px_0_0_#3C332B] transition-shadow focus-within:shadow-[6px_6px_0_0_#A6C285] ${
              amountTouched && !isAmountValid ? "border-[#A3372B]" : "border-[#3C332B]"
            }`}
          >
            <CircleDollarSign className="h-4 w-4 shrink-0 text-[#6B5D4F]" aria-hidden="true" />
            <input
              type="number"
              min="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="選飲料後自動帶入"
              className="min-w-0 flex-1 bg-transparent py-3 text-sm font-medium text-[#3C332B] placeholder:text-[#9A8B7A] focus:outline-none"
            />
          </div>
          {amountTouched && !isAmountValid && (
            <p className="mt-1 text-xs text-[#A3372B]">金額需為大於0的數字</p>
          )}
        </div>

        {noteSectionOpen ? (
        <div className="mb-5">
          <div className="flex items-center gap-1 mb-1">
            <label className="text-sm text-[#8A7A63]">備註</label>
            <button
              type="button"
              onClick={handleCollapseNote}
              aria-label="收合備註欄位"
              className="text-[#8A7A63] cursor-pointer transition-colors hover:text-[#3C332B]"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="flex items-center gap-2.5 rounded-2xl border-[3px] border-[#3C332B] bg-[#F6F2EA] px-4 shadow-[4px_4px_0_0_#3C332B] transition-shadow focus-within:shadow-[6px_6px_0_0_#A6C285]">
            <PenLine className="h-4 w-4 shrink-0 text-[#6B5D4F]" aria-hidden="true" />
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="甜度、冰塊"
              autoFocus
              className="min-w-0 flex-1 bg-transparent py-3 text-sm font-medium text-[#3C332B] placeholder:text-[#9A8B7A] focus:outline-none"
            />
          </div>
        </div>
        ) : (
          <button
            type="button"
            onClick={() => setNoteSectionOpen(true)}
            className="mb-5 flex items-center gap-1 rounded-full border-2 border-dashed border-[#C9BBA2] px-3 py-1.5 text-xs font-medium text-[#8A7A63] transition-colors cursor-pointer hover:border-[#3C332B] hover:text-[#3C332B]"
          >
            <Plus className="h-3 w-3" />
            備註・選填
          </button>
        )}

        {error && <p className="text-[#A3372B] text-sm mb-3">{error}</p>}

        <button
          onClick={handleSubmit}
          disabled={!selectedBrand || !selectedDrink || !isAmountValid || submitting}
          className={`${STICKER_BUTTON_BASE} w-full rounded-xl py-3 font-bold disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-x-0 disabled:hover:translate-y-0 disabled:hover:shadow-[3px_3px_0_0_#3C332B]`}
        >
          {submitting
            ? editingLog
              ? "儲存中..."
              : "新增中..."
            : editingLog
            ? "儲存變更"
            : "新增紀錄"}
        </button>
      </div>
      </div>
    </div>
  );
}
