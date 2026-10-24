"use client";

import { useState, useMemo } from "react";
import {
  collection,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import Image from "next/image";
import { Search, X, CircleDollarSign, PenLine, Check } from "lucide-react";
import { db } from "@/lib/firebase";
import type { Brand, Drink, AddOn } from "@/lib/brands";
import BrandIcon from "@/components/brand-icon";
import DatePicker from "@/components/log/date-picker";
import { ClearInputButton } from "@/components/ui/clear-input-button";
import type { LogEntry } from "@/lib/types";
import { STICKER_CARD_BASE } from "@/lib/sticker-card";
import { STICKER_BUTTON_BASE } from "@/lib/sticker-button";
import { toDateString } from "@/lib/history-utils";

// 邊框圓角跟捲動(overflow-y-auto)不能放在同一個div——原生捲軸是瀏覽器畫的,
// 不會乖乖沿著rounded-2xl的弧度走,選項一多出現捲軸,右下角圓角就會被捲軸截斷看起來像缺角。
// 拆成外層(邊框+圓角+陰影+overflow-hidden負責真的把內容裁成圓角)、
// 內層(只管max-h+捲動),捲軸被包在裁切範圍裡面,就不會戳出圓角外面
const dropdownPanelClass = "absolute left-0 right-0 bg-white border-[3px] border-[#3C332B] rounded-2xl shadow-[4px_4px_0_0_#3C332B] mt-1.5 z-10 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150";
const dropdownScrollClass = "max-h-48 overflow-y-auto py-1.5";
const dropdownItemClass = "px-4 py-2 text-sm cursor-pointer hover:bg-[#F6EFE4] rounded-lg mx-1.5 text-[#4A3424]";

export default function LogModal({
  open,
  onClose,
  uid,
  editingLog,
  brands,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  uid: string;
  editingLog?: LogEntry | null;
  brands: Brand[];
  // 儲存成功後要顯示的訊息,交給外層(history-view/log頁面)決定要不要彈toast
  onSuccess?: (message: string) => void;
}) {
  // 原本這些初始值是用useEffect在「editingLog變了之後」才setState回填,
  // 會被react-hooks/set-state-in-effect標記(effect裡直接setState,沒有等任何外部東西)。
  // 現在改成直接在這裡算出正確的初始值;要搭配外層(history-view.tsx)幫<LogModal>加上
  // key={editingLog?.id ?? "new"},這樣每次切換成編輯不同筆紀錄,React都會把這個元件當成
  // 全新的重新掛載一次,這些初始值才會重新跑一次,效果跟原本的useEffect一樣,但不用在effect裡setState
  const initialBrand = editingLog ? brands.find((b) => b.name === editingLog.brand) ?? null : null;
  const initialDrink =
    editingLog && initialBrand ? initialBrand.drinks.find((d) => d.name === editingLog.drink) ?? null : null;
  const initialAddOns = editingLog?.addOns ?? [];

  const [brandInput, setBrandInput] = useState(editingLog?.brand ?? "");
  const [brandListOpen, setBrandListOpen] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(initialBrand);

  const [drinkInput, setDrinkInput] = useState(editingLog?.drink ?? "");
  const [drinkListOpen, setDrinkListOpen] = useState(false);
  const [selectedDrink, setSelectedDrink] = useState<Drink | null>(initialDrink);

  const [size, setSize] = useState<"M" | "L">(editingLog?.size || "M");
  const [amount, setAmount] = useState(editingLog ? String(editingLog.amount) : "");
  const [date, setDate] = useState(editingLog?.date ?? toDateString(new Date()));
  const [note, setNote] = useState(editingLog?.note ?? "");
  const [selectedAddOns, setSelectedAddOns] = useState<AddOn[]>(initialAddOns);
  const [addOnListOpen, setAddOnListOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

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
  };

  const filteredBrands = useMemo(
    () => brands.filter((b) => b.name.includes(brandInput)),
    [brandInput, brands]
  );

  const filteredDrinks = useMemo(() => {
    if (!selectedBrand) return [];
    return selectedBrand.drinks.filter((d) => d.name.includes(drinkInput));
  }, [selectedBrand, drinkInput]);

  const hasSizeOptions = selectedDrink
    ? selectedDrink.prices.M !== selectedDrink.prices.L
    : false;

  // 加料選項是品牌底下的(不是飲料底下),選了品牌就能顯示;
  // 沒有addOns或是空陣列的品牌,這塊UI直接不渲染
  const addOns = selectedBrand?.addOns ?? [];
  const addOnsTotal = selectedAddOns.reduce((sum, a) => sum + a.price, 0);

  const handleSelectBrand = (brand: Brand) => {
    setSelectedBrand(brand);
    setBrandInput(brand.name);
    setBrandListOpen(false);
    setDrinkInput("");
    setSelectedDrink(null);
    setAmount("");
    // 換品牌,加料清單也跟著換了,舊的選擇留著沒意義
    setSelectedAddOns([]);
  };

  const handleSelectDrink = (drink: Drink) => {
    setSelectedDrink(drink);
    setDrinkInput(drink.name);
    setDrinkListOpen(false);
    setSize("M");
    // 換飲料不影響已選的加料(加料是品牌層級的),金額要把加料的加價一起算進去
    setAmount(String(drink.prices.M + addOnsTotal));
  };

  const handleSizeChange = (value: "M" | "L") => {
    setSize(value);
    if (selectedDrink) {
      setAmount(String(selectedDrink.prices[value] + addOnsTotal));
    }
  };

  // 勾選/取消加料:跟切換M/L杯型同一套邏輯,只要飲料已經選了,金額就自動重算
  // (飲料本身價格+目前選的加料加總),直接蓋掉原本的金額
  const handleToggleAddOn = (addOn: AddOn) => {
    setSelectedAddOns((prev) => {
      const exists = prev.some((a) => a.name === addOn.name);
      const next = exists ? prev.filter((a) => a.name !== addOn.name) : [...prev, addOn];
      if (selectedDrink) {
        const nextTotal = next.reduce((sum, a) => sum + a.price, 0);
        setAmount(String(selectedDrink.prices[size] + nextTotal));
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

  const handleSubmit = async () => {
    if (!selectedBrand || !selectedDrink || !amount) return;
    setSubmitting(true);
    setError("");
    try {
      const payload = {
        uid,
        brand: selectedBrand.name,
        drink: selectedDrink.name,
        size: hasSizeOptions ? size : null,
        amount: Number(amount),
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
      <div className={`${STICKER_CARD_BASE} p-6 max-w-sm w-full max-h-[90vh] overflow-y-auto shadow-[6px_6px_0_0_#3C332B] animate-in fade-in zoom-in-95 duration-200`}>
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-lg font-bold text-[#3C332B]">
            {editingLog ? "編輯消費紀錄" : "記一筆消費"}
          </h2>
          <button onClick={onClose} aria-label="關閉" className="text-[#8A7A63] cursor-pointer transition-colors hover:text-[#3C332B]">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="mb-4">
          <label className="text-sm text-[#8A7A63] block mb-1">日期</label>
          <DatePicker value={date} onChange={setDate} />
        </div>

        <div className="relative mb-4">
          <label className="text-sm text-[#8A7A63] block mb-1">品牌</label>
          {/* 跟首頁Hero搜尋框同一套樣式:米白底+粗邊框+硬陰影,focus時陰影變綠色變大。
              選了品牌之後把左邊的搜尋圖示換成品牌icon,沒選的時候維持放大鏡 */}
          <div className="flex items-center gap-2.5 rounded-2xl border-[3px] border-[#3C332B] bg-[#F6F2EA] px-4 shadow-[4px_4px_0_0_#3C332B] transition-shadow focus-within:shadow-[6px_6px_0_0_#A6C285]">
            {selectedBrand ? (
              <div className="relative h-5 w-5 shrink-0 overflow-hidden rounded-full">
                <Image src={selectedBrand.icon} alt={selectedBrand.name} fill sizes="20px" className="object-cover" />
              </div>
            ) : (
              <Search className="h-4 w-4 shrink-0 text-[#6B5D4F]" aria-hidden="true" />
            )}
            <input
              type="text"
              value={brandInput}
              onChange={(e) => {
                const value = e.target.value;
                setBrandInput(value);
                setBrandListOpen(true);
                if (selectedBrand && value !== selectedBrand.name) {
                  setSelectedBrand(null);
                  setDrinkInput("");
                  setSelectedDrink(null);
                  setAmount("");
                }
              }}
              onFocus={() => setBrandListOpen(true)}
              onBlur={() => setTimeout(() => setBrandListOpen(false), 150)}
              placeholder="輸入或選擇品牌"
              className="min-w-0 flex-1 bg-transparent py-3 text-sm font-medium text-[#3C332B] placeholder:text-[#9A8B7A] focus:outline-none"
            />
            {brandInput && <ClearInputButton onClick={handleClearBrand} />}
          </div>
          {brandListOpen && filteredBrands.length > 0 && (
            <div className={dropdownPanelClass}>
              <div className={dropdownScrollClass}>
                {filteredBrands.map((b) => (
                  <div
                    key={b.name}
                    onMouseDown={() => handleSelectBrand(b)}
                    className={`${dropdownItemClass} flex items-center gap-2`}
                  >
                    <BrandIcon name={b.name} icon={b.icon} />
                    <span>{b.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="relative mb-4">
          <label className="text-sm text-[#8A7A63] block mb-1">飲料</label>
          <div
            className={`flex items-center gap-2.5 rounded-2xl border-[3px] border-[#3C332B] px-4 shadow-[4px_4px_0_0_#3C332B] transition-shadow focus-within:shadow-[6px_6px_0_0_#A6C285] ${
              selectedBrand ? "bg-[#F6F2EA]" : "bg-[#F6F2EA]/60"
            }`}
          >
            <Search className="h-4 w-4 shrink-0 text-[#6B5D4F]" aria-hidden="true" />
            <input
              type="text"
              value={drinkInput}
              onChange={(e) => {
                const value = e.target.value;
                setDrinkInput(value);
                setDrinkListOpen(true);
                if (selectedDrink && value !== selectedDrink.name) {
                  setSelectedDrink(null);
                }
              }}
              onFocus={() => selectedBrand && setDrinkListOpen(true)}
              onBlur={() => setTimeout(() => setDrinkListOpen(false), 150)}
              disabled={!selectedBrand}
              placeholder={selectedBrand ? "輸入或選擇飲料" : "請先選擇品牌"}
              className="min-w-0 flex-1 bg-transparent py-3 text-sm font-medium text-[#3C332B] placeholder:text-[#9A8B7A] focus:outline-none disabled:cursor-not-allowed"
            />
            {drinkInput && <ClearInputButton onClick={handleClearDrink} />}
          </div>
          {drinkListOpen && filteredDrinks.length > 0 && (
            <div className={dropdownPanelClass}>
              <div className={dropdownScrollClass}>
                {filteredDrinks.map((d) => (
                  <div
                    key={d.name}
                    onMouseDown={() => handleSelectDrink(d)}
                    className={`${dropdownItemClass} flex justify-between`}
                  >
                    <span>{d.name}</span>
                    {d.category && (
                      <span className="text-xs text-[#8A7A63]">{d.category}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

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

        {addOns.length > 0 && (
          <div className="relative mb-4">
            <label className="text-sm text-[#8A7A63] block mb-1">
              加料<span className="text-[#B9AC97]">・選填</span>
            </label>
            {/* 跟品牌/飲料欄位同一個視覺語言,但這裡是多選,所以收合後用逗號列出已選項目,
                不是選完就關起來——行點擊時用onMouseDown先preventDefault擋掉按鈕blur,
                面板才不會選一個就立刻收合,選到滿意再點別的地方關閉 */}
            <button
              type="button"
              onClick={() => setAddOnListOpen((v) => !v)}
              onBlur={() => setTimeout(() => setAddOnListOpen(false), 150)}
              className="flex w-full items-center justify-between gap-2.5 rounded-2xl border-[3px] border-[#3C332B] bg-[#F6F2EA] px-4 py-3 text-left shadow-[4px_4px_0_0_#3C332B] transition-shadow focus:outline-none focus-visible:shadow-[6px_6px_0_0_#A6C285]"
            >
              <span className={`text-sm font-medium ${selectedAddOns.length > 0 ? "text-[#3C332B]" : "text-[#9A8B7A]"}`}>
                {selectedAddOns.length > 0 ? selectedAddOns.map((a) => a.name).join("、") : "選擇加料(選填)"}
              </span>
              {addOnsTotal > 0 && (
                <span className="shrink-0 text-sm font-medium text-[#C9732F]">+${addOnsTotal}</span>
              )}
            </button>
            {addOnListOpen && (
              <div className={dropdownPanelClass}>
                <div className={dropdownScrollClass}>
                  {addOns.map((addOn) => {
                    const checked = selectedAddOns.some((a) => a.name === addOn.name);
                    return (
                      <div
                        key={addOn.name}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => handleToggleAddOn(addOn)}
                        className={`${dropdownItemClass} flex cursor-pointer items-center justify-between gap-2`}
                      >
                        <span className="flex items-center gap-2.5">
                          <span
                            className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px] border-2 border-[#3C332B] ${
                              checked ? "bg-[#A6C285]" : "bg-transparent"
                            }`}
                          >
                            {checked && <Check className="h-3 w-3" style={{ color: "#3C332B" }} />}
                          </span>
                          {addOn.name}
                        </span>
                        <span className="text-xs text-[#8A7A63]">+${addOn.price}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="mb-4">
          <label className="text-sm text-[#8A7A63] block mb-1">金額(可修改)</label>
          <div className="flex items-center gap-2.5 rounded-2xl border-[3px] border-[#3C332B] bg-[#F6F2EA] px-4 shadow-[4px_4px_0_0_#3C332B] transition-shadow focus-within:shadow-[6px_6px_0_0_#A6C285]">
            <CircleDollarSign className="h-4 w-4 shrink-0 text-[#6B5D4F]" aria-hidden="true" />
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="選飲料後自動帶入"
              className="min-w-0 flex-1 bg-transparent py-3 text-sm font-medium text-[#3C332B] placeholder:text-[#9A8B7A] focus:outline-none"
            />
          </div>
        </div>

        <div className="mb-5">
          <label className="text-sm text-[#8A7A63] block mb-1">備註</label>
          <div className="flex items-center gap-2.5 rounded-2xl border-[3px] border-[#3C332B] bg-[#F6F2EA] px-4 shadow-[4px_4px_0_0_#3C332B] transition-shadow focus-within:shadow-[6px_6px_0_0_#A6C285]">
            <PenLine className="h-4 w-4 shrink-0 text-[#6B5D4F]" aria-hidden="true" />
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="甜度、冰塊"
              className="min-w-0 flex-1 bg-transparent py-3 text-sm font-medium text-[#3C332B] placeholder:text-[#9A8B7A] focus:outline-none"
            />
          </div>
        </div>

        {error && <p className="text-[#A3372B] text-sm mb-3">{error}</p>}

        <button
          onClick={handleSubmit}
          disabled={!selectedBrand || !selectedDrink || !amount || submitting}
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
  );
}