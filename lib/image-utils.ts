// 聊天室「拍照記帳」要把使用者選的照片轉成Gemini看得懂的格式(base64+mimeType)。
// 先用canvas把圖片縮小到最長邊maxDimension以內、轉成JPEG壓縮過,再轉base64。
//
// resizeImageToBase64跟resizeImageToBlob共用同一段「讀檔案→畫到canvas縮小」的邏輯,
// 差別只在最後canvas要轉成base64字串(給Gemini當inline data用)還是Blob(給Storage上傳用)——
// 抽成loadResizedCanvas共用,兩支function各自只負責最後那一小段轉檔案格式的部分

export type EncodedImage = { mimeType: string; data: string };

async function loadResizedCanvas(file: File, maxDimension: number): Promise<HTMLCanvasElement> {
  // 這裡只是要拿來讀寬高,讀完就可以把這個臨時網址釋放掉
  const objectUrl = URL.createObjectURL(file);
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
