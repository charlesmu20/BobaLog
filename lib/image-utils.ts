// 聊天室「拍照記帳」要把使用者選的照片轉成Gemini看得懂的格式(base64+mimeType)。
// 先用canvas把圖片縮小到最長邊maxDimension以內、轉成JPEG壓縮過,再轉base64。
//
// resizeImageToBase64跟resizeImageToBlob共用同一段「讀檔案→畫到canvas縮小」的邏輯,
// 差別只在最後canvas要轉成base64字串(給Gemini當inline data用)還是Blob(給Storage上傳用)——
// 抽成loadResizedCanvas共用,兩支function各自只負責最後那一小段轉檔案格式的部分

export type EncodedImage = { mimeType: string; data: string };

// 判斷選到的檔案是不是HEIC/HEIF格式——iPhone拍照預設就是存成這個格式。
// 瀏覽器的<img>標籤本身沒辦法直接解碼HEIC,一定要先轉成JPEG/PNG才能繼續用canvas處理,
// 不然會在loadResizedCanvas裡讀取失敗(image.onerror)。
// 判斷方式:優先看file.type(大部分瀏覽器會正確回報image/heic、image/heif),
// 但有些舊版Android瀏覽器讀不到正確的mimeType(可能是空字串或application/octet-stream),
// 這種情況退而用副檔名判斷
function isHeic(file: File): boolean {
  const type = file.type.toLowerCase();
  if (type === "image/heic" || type === "image/heif") return true;
  const name = file.name.toLowerCase();
  return name.endsWith(".heic") || name.endsWith(".heif");
}

// 把HEIC/HEIF檔案轉成JPEG,回傳一個可以直接拿去給<img>讀取的新File。
// heic2any是專門做這件事的函式庫(用WASM在瀏覽器端解碼,不用後端幫忙),體積不小,
// 這裡故意用動態import,只有真的遇到HEIC檔案時才載入這包,大部分人選的都是一般
// JPEG/PNG照片,不需要讓每個人都載入這包用不到的程式碼
async function convertHeicToJpeg(file: File): Promise<File> {
  const { default: heic2any } = await import("heic2any");
  const converted = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.9 });
  // iPhone的Live Photo等情況,HEIC裡可能包含好幾張畫面,heic2any這時候會回傳Blob陣列——
  // 這裡只需要代表性的第一張畫面就夠了,不需要全部轉出來
  const blob = Array.isArray(converted) ? converted[0] : converted;
  return new File([blob], file.name.replace(/\.(heic|heif)$/i, ".jpg"), { type: "image/jpeg" });
}

// 把選到的檔案轉成瀏覽器(<img>標籤)看得懂的格式——是HEIC/HEIF就轉成JPEG,
// 不是的話原封不動傳回去。這支特別export出去,是因為「縮圖預覽」這件事不是只有
// loadResizedCanvas這裡要用:聊天室選完照片、還沒送出前的那個小縮圖(chat-panel.tsx的
// pendingImagePreview),跟訊息紀錄裡「使用者傳送的照片」那個縮圖(useChatMessages.ts的
// imageUrl),這兩個地方都是直接拿原始File去URL.createObjectURL(),如果是HEIC檔案,
// 瀏覽器一樣讀不出來,會變成一個破圖示——這兩個地方也要先转成displayable格式,
// 不能只顧到「送去給Gemini辨識/存進Storage」這條路徑
export async function toDisplayableImage(file: File): Promise<File> {
  return isHeic(file) ? await convertHeicToJpeg(file) : file;
}

async function loadResizedCanvas(file: File, maxDimension: number): Promise<HTMLCanvasElement> {
  const sourceFile = await toDisplayableImage(file);
  // 這裡只是要拿來讀寬高,讀完就可以把這個臨時網址釋放掉
  const objectUrl = URL.createObjectURL(sourceFile);
  let img: HTMLImageElement;
  try {
    img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("照片格式無法讀取"));
      image.src = objectUrl;
    });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }

  // 只縮小,不放大——照片本來就比maxDimension小的話,scale會是1,維持原尺寸
  const scale = Math.min(1, maxDimension / Math.max(img.width, img.height));
  const width = Math.round(img.width * scale);
  const height = Math.round(img.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("無法處理照片");
  ctx.drawImage(img, 0, 0, width, height);
  return canvas;
}

export async function resizeImageToBase64(
  file: File,
  maxDimension = 1280,
  quality = 0.8
): Promise<EncodedImage> {
  const canvas = await loadResizedCanvas(file, maxDimension);
  // canvas.toDataURL回傳格式是"data:image/jpeg;base64,xxxx",要把前面那段逗號前的部分切掉,
  // 只留純base64字串給Gemini API用
  const resizedDataUrl = canvas.toDataURL("image/jpeg", quality);
  const data = resizedDataUrl.split(",")[1] ?? "";

  return { mimeType: "image/jpeg", data };
}

// 菜單回報功能的照片上傳用——上傳到Firebase Storage要的是Blob,不是base64字串,
// 所以用canvas.toBlob,不是canvas.toDataURL。縮小邏輯(maxDimension/quality)跟上面
// 共用同一套,避免使用者選一張手機原圖(可能好幾MB)直接整包塞進Storage
export async function resizeImageToBlob(
  file: File,
  maxDimension = 1280,
  quality = 0.8
): Promise<Blob> {
  const canvas = await loadResizedCanvas(file, maxDimension);
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("無法處理照片"));
      },
      "image/jpeg",
      quality
    );
  });
}
