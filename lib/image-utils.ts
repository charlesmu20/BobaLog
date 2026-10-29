// 聊天室「拍照記帳」要把使用者選的照片轉成Gemini看得懂的格式(base64+mimeType)。
// 先用canvas把圖片縮小到最長邊maxDimension以內、轉成JPEG壓縮過,再轉base64。

export type EncodedImage = { mimeType: string; data: string };

export async function resizeImageToBase64(
  file: File,
  maxDimension = 1280,
  quality = 0.8
): Promise<EncodedImage> {
  // 編碼成base64文字——這裡只是要拿來讀寬高,讀完就可以把這個臨時網址釋放掉
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

  // canvas.toDataURL回傳格式是"data:image/jpeg;base64,xxxx",要把前面那段逗號前的部分切掉,
  // 只留純base64字串給Gemini API用
  const resizedDataUrl = canvas.toDataURL("image/jpeg", quality);
  const data = resizedDataUrl.split(",")[1] ?? "";

  return { mimeType: "image/jpeg", data };
}
