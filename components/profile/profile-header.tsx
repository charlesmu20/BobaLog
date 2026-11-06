"use client";
import { useRef, useState } from "react";
import { updateProfile, type User } from "firebase/auth";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { Camera, Pencil, Check, X as XIcon, User as UserIcon, LogOut, Loader2 } from "lucide-react";
import { auth, storage } from "@/lib/firebase";
import { resizeImageToBlob } from "@/lib/image-utils";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

export default function ProfileHeader({
  user,
  onRefresh,
  onError,
  onSuccess,
  onLogout,
}: {
  user: User;
  // 改名字/換頭貼成功後呼叫,逼CurrentUserProvider的user狀態重新整理一份新的,
  // 不然畫面(包含NavBar上的頭貼)不會跟著更新
  onRefresh: () => Promise<void>;
  onError: (message: string) => void;
  onSuccess: (message: string) => void;
  onLogout: () => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(user.displayName ?? "");
  const [savingName, setSavingName] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const startEditName = () => {
    setNameInput(user.displayName ?? "");
    setEditingName(true);
  };

  const handleSaveName = async () => {
    const trimmed = nameInput.trim();
    if (!trimmed) {
      onError("名字不能是空的");
      return;
    }
    if (!auth.currentUser) return;
    setSavingName(true);
    try {
      await updateProfile(auth.currentUser, { displayName: trimmed });
      await onRefresh();
      setEditingName(false);
      onSuccess("名字已更新");
    } catch {
      onError("更新名字失敗,請稍後再試");
    } finally {
      setSavingName(false);
    }
  };

  // 跟report-modal.tsx同一套做法:選好的照片先用resizeImageToBlob縮小、轉成jpeg,
  // 才上傳到Storage,避免手機原圖好幾MB整包塞進去
  const handleSelectPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // 清空value,這樣使用者選同一個檔案兩次也會觸發onChange
    e.target.value = "";
    if (!file || !auth.currentUser) return;
    if (!file.type.startsWith("image/")) {
      onError("請選擇圖片檔案");
      return;
    }
    setUploadingPhoto(true);
    try {
      const blob = await resizeImageToBlob(file, 480, 0.85);
      const photoRef = storageRef(storage, `avatars/${user.uid}/avatar.jpg`);
      await uploadBytes(photoRef, blob, { contentType: "image/jpeg" });
      const photoUrl = await getDownloadURL(photoRef);
      await updateProfile(auth.currentUser, { photoURL: photoUrl });
      await onRefresh();
      onSuccess("頭貼已更新");
    } catch {
      onError("上傳頭貼失敗,請稍後再試");
    } finally {
      setUploadingPhoto(false);
    }
  };

  return (
    // 封面式頭貼區:深綠色底+點點紋路(跟勳章頁「已解鎖」展示櫃背景同一招),
    // 頭貼疊在封面底部。手機版置中,760px以上改成靠左。
    // 頭貼用position:absolute疊在封面上(不佔文件流高度),文字區則用固定pt/pl空出頭貼的
    // 高度/寬度——兩者分開算,姓名編輯匡打開時變高也不會互相影響,下面的資料回顧也不會被蓋住
    <div className="relative">
      <div className="relative h-[72px] bg-[#2E3D22] bg-[radial-gradient(#ffffff26_1.5px,transparent_1.5px)] bg-[length:14px_14px]">
        <button
          type="button"
          onClick={onLogout}
          className="absolute right-3 top-3 flex cursor-pointer items-center gap-1.5 rounded-full border-2 border-[#F6F2EA]/40 bg-[#F6F2EA]/10 px-3 py-1.5 text-sm font-semibold text-[#F6F2EA] transition-colors hover:bg-[#F6F2EA]/20"
        >
          <LogOut className="h-4 w-4" />
          登出
        </button>
      </div>

      {/* 頭貼改用絕對定位疊在封面底部,脫離文件流——這樣姓名編輯匡被打開時變高,
          也不會像之前用負margin+items-end那樣把姓名往上擠進封面裡。手機置中,桌機靠左 */}
      <div className="absolute left-1/2 top-[40px] -translate-x-1/2 min-[760px]:left-4 min-[760px]:translate-x-0">
        <div className="relative shrink-0">
          <Avatar className="h-16 w-16 border-[3px] border-[#F6F2EA] shadow-[0_0_0_2px_#3C332B]">
            <AvatarImage src={user.photoURL ?? undefined} alt={user.displayName ?? "使用者"} />
            <AvatarFallback className="bg-[#F6EFE4] text-[#8A7A63]">
              <UserIcon className="h-6 w-6" />
            </AvatarFallback>
          </Avatar>
          {/* 上傳頭貼時蓋一層半透明黑+轉圈圈,原本只有把相機按鈕disabled,
              使用者看不太出來有在動作,加這個才夠明顯 */}
          {uploadingPhoto && (
            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/45">
              <Loader2 className="h-6 w-6 animate-spin text-white" />
            </div>
          )}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingPhoto}
            aria-label="換頭貼"
            className="absolute -bottom-0.5 -right-0.5 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full border-2 border-[#3C332B] bg-[#A6C285] text-[#2E4019] transition-transform hover:scale-110 disabled:opacity-60"
          >
            {uploadingPhoto ? <Loader2 className="h-3 w-3 animate-spin" /> : <Camera className="h-3 w-3" />}
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleSelectPhoto} className="hidden" />
        </div>
      </div>

      {/* 文字區:用固定的pt/pl空出頭貼的高度/寬度,不管姓名是純文字還是編輯中的輸入匡,
          起始位置都是固定的,高度變化不會影響跟封面的間距 */}
      <div className="flex flex-col items-center px-4 pt-[68px] min-[760px]:flex-row min-[760px]:items-center min-[760px]:gap-3 min-[760px]:px-4 min-[760px]:pb-1 min-[760px]:pl-[88px] min-[760px]:pt-4">
        <div className="min-w-0 text-center min-[760px]:text-left">
          {editingName ? (
            <div className="flex items-center gap-1.5">
              <input
                autoFocus
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveName();
                  if (e.key === "Escape") setEditingName(false);
                }}
                maxLength={30}
                className="min-w-0 flex-1 rounded-lg border-2 border-[#3C332B] bg-white px-2 py-1 text-base font-bold text-[#3C332B] outline-none"
              />
              <button
                type="button"
                onClick={handleSaveName}
                disabled={savingName}
                aria-label="儲存名字"
                className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-full border-2 border-[#3C332B] bg-[#A6C285] text-[#2E4019] disabled:opacity-60"
              >
                <Check className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setEditingName(false)}
                aria-label="取消"
                className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-full border-2 border-[#3C332B] bg-white text-[#8A7A63]"
              >
                <XIcon className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <button type="button" onClick={startEditName} className="flex cursor-pointer items-center gap-1.5">
              <span className="truncate text-lg font-bold text-[#3C332B]">{user.displayName || "使用者"}</span>
              <Pencil className="h-3.5 w-3.5 shrink-0 text-[#8A7A63]" />
            </button>
          )}
          {user.email && <p className="truncate text-xs text-[#8A7A63]">{user.email}</p>}
        </div>
      </div>
    </div>
  );
}
