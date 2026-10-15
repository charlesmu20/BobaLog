"use client";

import { useState, useEffect, useMemo } from "react";
import {
  collection,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Brand, Drink } from "@/lib/brands";
import BrandIcon from "@/components/brand-icon";
import DatePicker from "@/components/date-picker";
import type { LogEntry } from "@/lib/types";
import { ClearInputButton } from "@/components/ui/clear-input-button";

const toDateString = (d: Date) => {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const dropdownPanelClass = "absolute left-0 right-0 bg-white border border-[#E3D8C6] rounded-2xl shadow-lg mt-1.5 py-1.5 max-h-48 overflow-y-auto z-10 animate-in fade-in slide-in-from-top-1 duration-150";
const dropdownItemClass = "px-4 py-2 text-sm cursor-pointer hover:bg-[#F6EFE4] rounded-lg mx-1.5 text-[#4A3424]";

export default function LogModal({
  open,
  onClose,
  uid,
  editingLog,
  brands,
}: {
  open: boolean;
  onClose: () => void;
  uid: string;
  editingLog?: LogEntry | null;
  brands: Brand[];
}) {
  const [brandInput, setBrandInput] = useState("");
  const [brandListOpen, setBrandListOpen] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null);

  const [drinkInput, setDrinkInput] = useState("");
  const [drinkListOpen, setDrinkListOpen] = useState(false);
  const [selectedDrink, setSelectedDrink] = useState<Drink | null>(null);

  const [size, setSize] = useState<"M" | "L">("M");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(toDateString(new Date()));
  const [note, setNote] = useState("");
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
  };

  useEffect(() => {
    if (editingLog) {
      const brand = brands.find((b) => b.name === editingLog.brand) || null;
      const drink = brand?.drinks.find((d) => d.name === editingLog.drink) || null;
      setSelectedBrand(brand);
      setBrandInput(editingLog.brand);
      setSelectedDrink(drink);
      setDrinkInput(editingLog.drink);
      setSize(editingLog.size || "M");
      setAmount(String(editingLog.amount));
      setDate(editingLog.date);
      setNote(editingLog.note || "");
    } else {
      resetForm();
    }
  }, [editingLog]);

  const filteredBrands = useMemo(
    () => brands.filter((b) => b.name.includes(brandInput)),
    [brandInput]
  );

  const filteredDrinks = useMemo(() => {
    if (!selectedBrand) return [];
    return selectedBrand.drinks.filter((d) => d.name.includes(drinkInput));
  }, [selectedBrand, drinkInput]);

  const hasSizeOptions = selectedDrink
    ? selectedDrink.prices.M !== selectedDrink.prices.L
    : false;

  const handleSelectBrand = (brand: Brand) => {
    setSelectedBrand(brand);
    setBrandInput(brand.name);
    setBrandListOpen(false);
    setDrinkInput("");
    setSelectedDrink(null);
    setAmount("");
  };

  const handleSelectDrink = (drink: Drink) => {
    setSelectedDrink(drink);
    setDrinkInput(drink.name);
    setDrinkListOpen(false);
    setSize("M");
    setAmount(String(drink.prices.M));
  };

  const handleSizeChange = (value: "M" | "L") => {
    setSize(value);
    if (selectedDrink) {
      setAmount(String(selectedDrink.prices[value]));
    }
  };
  const handleClearBrand = () => {
    setBrandInput("");
    setSelectedBrand(null);
    setDrinkInput("");
    setSelectedDrink(null);
    setAmount("");
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
      onClose();
    } catch (err) {
      setError("儲存失敗,請稍後再試");
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-5 z-50">
      <div className="bg-white rounded-2xl p-6 max-w-sm w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-lg font-bold text-[#473A28]">
            {editingLog ? "編輯消費紀錄" : "記一筆消費"}
          </h2>
          <button onClick={onClose} className="text-[#8A7A63] cursor-pointer">
            ✕
          </button>
        </div>

        <div className="mb-4">
          <label className="text-sm text-[#6B5338] block mb-1">日期</label>
          <DatePicker value={date} onChange={setDate} />
        </div>

        <div className="relative mb-4">
          <label className="text-sm text-[#6B5338] block mb-1">品牌</label>
          <div className="relative">
            {selectedBrand && (
              <img
                src={selectedBrand.icon}
                alt={selectedBrand.name}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full object-cover"
              />
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
              className={`border border-[#E3D8C6] rounded-lg px-3 py-2 w-full text-[#4A3424] ${
                selectedBrand ? "pl-9" : ""
              } ${brandInput ? "pr-8" : ""}`}
            />
            {brandInput && <ClearInputButton onClick={handleClearBrand} />}
          </div>
          {brandListOpen && filteredBrands.length > 0 && (
            <div className={dropdownPanelClass}>
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
          )}
        </div>

        <div className="relative mb-4">
          <label className="text-sm text-[#6B5338] block mb-1">飲料</label>
          <div className="relative">
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
              className={`border border-[#E3D8C6] rounded-lg px-3 py-2 w-full text-[#4A3424] disabled:bg-[#F6EFE4]/60 ${
                drinkInput ? "pr-8" : ""
              }`}
            />
            {drinkInput && <ClearInputButton onClick={handleClearDrink} />}
          </div>
          {drinkListOpen && filteredDrinks.length > 0 && (
            <div className={dropdownPanelClass}>
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
          )}
        </div>

        {hasSizeOptions && (
          <div className="mb-4">
            <label className="text-sm text-[#6B5338] block mb-1">杯型</label>
            <div className="flex gap-2">
              <button
                onClick={() => handleSizeChange("M")}
                className={`flex-1 border rounded-lg py-2 text-sm cursor-pointer ${
                  size === "M"
                    ? "border-[#C9732F] bg-[#F6EFE4] text-[#C9732F]"
                    : "border-[#E3D8C6] text-[#4A3424]"
                }`}
              >
                中杯 M
              </button>
              <button
                onClick={() => handleSizeChange("L")}
                className={`flex-1 border rounded-lg py-2 text-sm cursor-pointer ${
                  size === "L"
                    ? "border-[#C9732F] bg-[#F6EFE4] text-[#C9732F]"
                    : "border-[#E3D8C6] text-[#4A3424]"
                }`}
              >
                大杯 L
              </button>
            </div>
          </div>
        )}

        <div className="mb-4">
          <label className="text-sm text-[#6B5338] block mb-1">金額(可修改)</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="選飲料後自動帶入"
            className="border border-[#E3D8C6] rounded-lg px-3 py-2 w-full text-[#4A3424]"
          />
        </div>

        <div className="mb-5">
          <label className="text-sm text-[#6B5338] block mb-1">備註</label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="甜度、冰塊、加料"
            className="border border-[#E3D8C6] rounded-lg px-3 py-2 w-full text-[#4A3424]"
          />
        </div>

        {error && <p className="text-red-500 text-sm mb-3">{error}</p>}

        <button
          onClick={handleSubmit}
          disabled={!selectedBrand || !selectedDrink || !amount || submitting}
          className="w-full bg-[#C9732F] text-white py-3 rounded-lg font-medium disabled:opacity-50 cursor-pointer hover:bg-[#B3652A]"
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