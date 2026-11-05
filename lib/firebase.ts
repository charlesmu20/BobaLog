// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getFunctions } from "firebase/functions";
import { getStorage } from "firebase/storage";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
};

// Initialize Firebase
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// 開啟Firestore的本地持久化快取(存在瀏覽器的IndexedDB裡):重新整理、或暫時斷線時,
// 畫面能先用上次抓到的資料顯示,不用整頁卡住等網路;多分頁同時開同一個網站也共用同一份本地快取
// (persistentMultipleTabManager)。initializeFirestore只能對同一個app呼叫一次,
// 開發模式下Next.js的Fast Refresh可能讓這支檔案重新跑一次,第二次呼叫會丟錯誤——
// 這時代表已經初始化過了,改用getFirestore拿現有的instance即可。
// 伺服器端(沒有瀏覽器、沒有IndexedDB)則直接用預設的getFirestore。
function createFirestore() {
  if (typeof window === "undefined") {
    return getFirestore(app);
  }
  try {
    return initializeFirestore(app, {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    });
  } catch {
    return getFirestore(app);
  }
}

export const db = createFirestore();
export const auth = getAuth(app);
// 地區要跟functions實際部署的地區一致(asia-east1),不然前端會找不到function
export const functions = getFunctions(app, "asia-east1");
// 菜單回報功能的照片上傳用——這個專案第一次接Storage,bucket是用免付費位置(US-EAST1)建的
export const storage = getStorage(app);