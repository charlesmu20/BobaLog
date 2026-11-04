"use client";

import { useMemo, useState } from "react";
import { collection, doc, serverTimestamp, setDoc } from "firebase/firestore";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { Search, X, Camera, ChevronDown } from "lucide-react";
import { db, storage } from "@/lib/firebase";
import { resizeImageToBlob } from "@/lib/image-utils";
import type { BrandSummary } from "@/lib/brands";
import BrandIcon from "@/components/brand-icon";
import { ClearInputButton } from "@/components/ui/clear-input-button";
import { STICKER_CARD_BASE } from "@/lib/sticker-card";
import { STICKER_BUTTON_BASE } from "@/lib/sticker-button";

// 跟log-modal.tsx共用同一套「粗邊框硬陰影」下拉選單視覺語言(三個class定義也直接複製
// 那邊的,沒有抽共用檔案出來——目前只有這兩個地方在用,等第三個地方也要用再抽)
const dropdownPanelClass = "absolute left-0 right-0 bg-white border-[3px] border-[#3C332B] rounded-2xl shadow-[4px_4px_0_0_#3C332B] mt-1.5 z-10 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150";
const dropdownScrollClass = "max-h-48 overflow-y-auto py-1.5";
const dropdownItemClass = "px-4 py-2 text-sm cursor-pointer hover:bg-[#F6EFE4] rounded-lg mx-1.5 text-[#4A3424]";

export type MenuReportIssueType = "menuItem" | "price" | "update";

const ISSUE_TYPE_OPTIONS: { value: MenuReportIssueType; label: string }[] = [
  { value: "menuItem", label: "菜單品項問題" },
  { value: "price", label: "菜單價格問題" },
  { value: "update", label: "菜單更新" },
];

export default function ReportModal({
  open,
  onClose,
  uid,
  brands,
  // 從品牌/飲料頁面點進來時,外層把目前頁面的品牌slug傳進來,自動帶入這個品牌——
  // 使用者還是可以自己改選別的品牌,不是鎖死的
  defaultBrandSlug,
  // 從飲料詳情頁點進來時,外層會帶一句「「飲料名稱」:」當作說明欄的起手式,
  // 使用者不用重打一次是哪一杯飲料,游標直接接著打具體問題就好
  initialDescription,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  uid: string;
  brands: BrandSummary[];
  defaultBrandSlug?: string;
  initialDescription?: string;
  onSuccess?: (message: string) => void;
}) {
  const initialBrand = defaultBrandSlug
    ? brands.find((b) => b.slug === defaultBrandSlug) ?? null
    : null;

  const [issueType, setIssueType] = useState<MenuReportIssueType>("menuItem");
  const [issueTypeListOpen, setIssueTypeListOpen] = useState(false);
  const selectedIssueTypeLabel = ISSUE_TYPE_OPTIONS.find((o) => o.value === issueType)?.label ?? "";

  const [brandInput, setBrandInput] = useState(initialBrand?.name ?? "");
  const [brandListOpen, setBrandListOpen] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState<BrandSummary | null>(initialBrand);

  const [description, setDescription] = useState(initialDescription ?? "");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const filteredBrands = useMemo(
    () => brands.filter((b) => b.name.includes(brandInput)),
    [brandInput, brands]
  );

  // 問題說明是必填——光一個「菜單價格問題」這種分類不夠具體,要有文字說清楚
  // 哪杯飲料、差多少錢,之後看回報的人才知道怎麼處理
  const isDescriptionValid = description.trim() !== "";

  const resetForm = () => {
    setIssueType("menuItem");
    setBrandInput("");
    setSelectedBrand(null);
    setDescription(initialDescription ?? "");
    handleClearPhoto();
  };

  const handleSelectBrand = (brand: BrandSummary) => {
    setSelectedBrand(brand);
    setBrandInput(brand.name);
    setBrandListOpen(false);
  };

  const handleClearBrand = () => {
    setBrandInput("");
    setSelectedBrand(null);
  };

  const handleSelectPhoto = (file: File) => {
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleClearPhoto = () => {
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoFile(null);
    setPhotoPreview(null);
  };

  const handleSubmit = async () => {
    if (!selectedBrand || !isDescriptionValid) return;
    setSubmitting(true);
    setError("");
    try {
      // 先生出文件ID(doc()不傳第二個參數,不會真的建立文件,只是拿到一個預先配好的ID),
      // 這樣照片上傳的Storage路徑才能跟最後存進Firestore的那筆文件對應起來
      const reportRef = doc(collection(db, "menuReports"));

      let photoUrl: string | null = null;
      if (photoFile) {
        const blob = await resizeImageToBlob(photoFile);
        const photoRef = storageRef(storage, `reportPhotos/${uid}/${reportRef.id}.jpg`);
        await uploadBytes(photoRef, blob, { contentType: "image/jpeg" });
        photoUrl = await getDownloadURL(photoRef);
      }

      await setDoc(reportRef, {
        uid,
        brandSlug: selectedBrand.slug,
        brandName: selectedBrand.name,
        issueType,
        description: description.trim(),
        photoUrl,
        status: "pending",
        createdAt: serverTimestamp(),
      });

      resetForm();
      onSuccess?.("回報已送出,謝謝你!");
      onClose();
    } catch {
      setError("送出失敗,請稍後再試");
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-5 z-50 animate-in fade-in duration-200">
      <div className={`${STICKER_CARD_BASE} max-w-sm w-full overflow-hidden shadow-[6px_6px_0_0_#3C332B] animate-in fade-in zoom-in-95 duration-200`}>
        <div className="max-h-[90vh] overflow-y-auto p-6">
          <div className="flex justify-between items-center mb-5">
            <h2 className="text-lg font-bold text-[#3C332B]">回報菜單問題</h2>
            <button onClick={onClose} aria-label="關閉" className="text-[#8A7A63] cursor-pointer transition-colors hover:text-[#3C332B]">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="relative mb-4">
            <label className="text-sm text-[#8A7A63] block mb-1">問題類型</label>
            {/* 跟下面「品牌」欄位、log-modal.tsx的加料欄位同一套「點擊展開面板」下拉樣式
                (不是原生<select>,原生select沒辦法套上粗邊框硬陰影這套自訂外觀) */}
            <button
              type="button"
              onClick={() => setIssueTypeListOpen((v) => !v)}
              onBlur={() => setTimeout(() => setIssueTypeListOpen(false), 150)}
              className="flex w-full items-center justify-between gap-2.5 rounded-2xl border-[3px] border-[#3C332B] bg-[#F6F2EA] px-4 py-3 text-left shadow-[4px_4px_0_0_#3C332B] transition-shadow focus:outline-none focus-visible:shadow-[6px_6px_0_0_#A6C285]"
            >
              <span className="text-sm font-medium text-[#3C332B]">{selectedIssueTypeLabel}</span>
              <ChevronDown className="h-4 w-4 shrink-0 text-[#6B5D4F]" aria-hidden="true" />
            </button>
            {issueTypeListOpen && (
              <div className={dropdownPanelClass}>
                <div className={dropdownScrollClass}>
                  {ISSUE_TYPE_OPTIONS.map((option) => (
                    <div
                      key={option.value}
                      onMouseDown={() => {
                        setIssueType(option.value);
                        setIssueTypeListOpen(false);
                      }}
                      className={dropdownItemClass}
                    >
                      {option.label}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="relative mb-4">
            <label className="text-sm text-[#8A7A63] block mb-1">品牌</label>
            <div className="flex items-center gap-2.5 rounded-2xl border-[3px] border-[#3C332B] bg-[#F6F2EA] px-4 shadow-[4px_4px_0_0_#3C332B] transition-shadow focus-within:shadow-[6px_6px_0_0_#A6C285]">
              {selectedBrand ? (
                <BrandIcon name={selectedBrand.name} icon={selectedBrand.icon} size="w-5 h-5" />
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
                  if (selectedBrand && value !== selectedBrand.name) setSelectedBrand(null);
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
                      key={b.slug}
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

          <div className="mb-4">
            <label className="text-sm text-[#8A7A63] block mb-1">問題說明</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full resize-none rounded-2xl border-[3px] border-[#3C332B] bg-[#F6F2EA] px-4 py-3 text-sm font-medium text-[#3C332B] placeholder:text-[#9A8B7A] shadow-[4px_4px_0_0_#3C332B] transition-shadow focus:outline-none focus-visible:shadow-[6px_6px_0_0_#A6C285]"
            />
          </div>

          <div className="mb-5">
            <label className="text-sm text-[#8A7A63] block mb-1.5">
              附上照片<span className="text-[#B9AC97]">・選填</span>
            </label>
            {photoPreview ? (
              <div className="relative inline-block">
                {/* eslint-disable-next-line @next/next/no-img-element -- 選完照片當下的本機縮圖預覽
                    (URL.createObjectURL產生的blob網址),next/image的優化流程沒辦法處理blob網址 */}
                <img
                  src={photoPreview}
                  alt="待送出的照片"
                  className="h-20 w-20 rounded-xl object-cover ring-1 ring-black/10"
                />
                <button
                  type="button"
                  onClick={handleClearPhoto}
                  aria-label="移除照片"
                  className="absolute -right-1.5 -top-1.5 flex size-5 cursor-pointer items-center justify-center rounded-full bg-[#3C332B] text-white shadow transition-colors hover:bg-black"
                >
                  <X className="size-3" />
                </button>
              </div>
            ) : (
              <label className="flex h-14 cursor-pointer items-center justify-center gap-2 rounded-2xl border-[1.5px] border-dashed border-[#C9BBA2] bg-white text-sm text-[#8A7A63] transition-colors hover:border-[#3C332B] hover:text-[#3C332B]">
                <Camera className="h-4 w-4" aria-hidden="true" />
                點擊上傳菜單照片
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleSelectPhoto(file);
                    e.target.value = "";
                  }}
                />
              </label>
            )}
          </div>

          {error && <p className="text-[#A3372B] text-sm mb-3">{error}</p>}

          <button
            onClick={handleSubmit}
            disabled={!selectedBrand || !isDescriptionValid || submitting}
            className={`${STICKER_BUTTON_BASE} w-full rounded-xl py-3 font-bold disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-x-0 disabled:hover:translate-y-0 disabled:hover:shadow-[3px_3px_0_0_#3C332B]`}
          >
            {submitting ? "送出中..." : "送出回報"}
          </button>
        </div>
      </div>
    </div>
  );
}
