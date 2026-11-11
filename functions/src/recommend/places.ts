// 用Google Places API (New)的Text Search REST端點,找使用者座標附近的手搖飲料店,
// 給「推薦飲料」功能抓附近品牌用。
//
// 跟前端components/map/places-layer.tsx用的是同一招(textQuery:"手搖飲料店"+locationBias+
// rankPreference:DISTANCE),只是這裡改成直接發HTTP request,不透過瀏覽器限定的JS SDK
// (@vis.gl/react-google-maps那套是瀏覽器用的套件,Node.js環境跑不起來)。金鑰用的是
// 另外申請、伺服器專用的PLACES_API_KEY(存在Secret Manager,跟GEMINI_API_KEY同一套做法),
// 不是前端那支公開金鑰。

import type { Firestore } from "firebase-admin/firestore";
import { defineSecret } from "firebase-functions/params";

export const PLACES_API_KEY = defineSecret("PLACES_API_KEY");

export type NearbyPlace = {
  name: string;
  lat: number;
  lng: number;
};

// Places API是計費的,而且同一段對話裡使用者常常會連續問好幾句推薦(問完口味、
// 點「看看其他選項」、再追問一次...),人實際上根本沒有移動位置、講的也常常是同一個
// 地點名稱——如果每一句都重新打一次Places API,等於白白浪費錢,也是整個推薦流程
// 偏慢的其中一段(詳見catalog.ts加共用快取時討論過的拆解)。
// 做法比照catalog.ts的loadCatalog:查詢結果存成一份Firestore文件(不是模組記憶體,
// 理由也跟catalog.ts一樣——Cloud Functions不保證同一個執行環境會被重複使用),
// 之後同樣座標/同樣地點名稱的查詢,先看這份文件新不新鮮,新鮮就直接用,不用重打API。
//
// 這裡刻意只快取「打Places API的原始結果」(店名+座標,或地點座標),不快取
// nearbyBrands.ts比對完的「比對到哪些品牌」——比對品牌用的是catalog.ts的即時資料,
// 兩者快取時間週期不一定一樣,分開存比較不會互相牽連
const PLACES_CACHE_COLLECTION = "placesCache";
// 30分鐘:店家的地理位置幾乎不會變動,地點名稱對應的座標更是幾乎永遠不變,
// 不像catalog.ts那份菜單資料有「管理員剛改完,想盡快讓使用者看到新資料」的時效性考量,
// 所以可以給比菜單快取(60秒)長得多的有效期限,降低真正打API的次數
const PLACES_CACHE_TTL_MS = 30 * 60 * 1000;

// 把任意文字(使用者打的地點名稱,可能帶標點、emoji、各種奇怪字元)轉成一串安全、
// 固定長度的英數字字串,可以直接拿來當Firestore文件ID用——不用擔心使用者打的內容
// 剛好含有文件ID不允許的字元(例如斜線)。只是用來當快取的key,不需要真的無碰撞,
// 塞進同一個品牌名稱重複查詢時能命中同一份快取就夠了
function hashToSafeId(text: string): string {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash * 31 + text.charCodeAt(i)) | 0;
  }
  return Math.abs(hash).toString(36);
}

// 把座標四捨五入到小數點後3位(約111公尺的精度)再組key——查詢半徑本來就有2.5公里,
// 差這一點誤差不影響「附近有哪些店」這個結果,但可以讓附近範圍內、座標有一點點飄移
// (GPS本來就不會每次都回傳一模一樣的座標)的查詢,還是能命中同一份快取
function roundCoord(n: number): string {
  return n.toFixed(3);
}

// 讀/寫快取文件共用的邏輯抽出來,resolveLocationName、searchNearbyBobaShops
// 兩邊的快取做法完全一樣,只有docId不同——不要重複寫兩份一樣的try/catch。
// 回傳值刻意用{hit, data}包起來,不要直接回傳T|null——resolveLocationName合法的快取內容
// 本身就可能是null(代表「這個地點名稱真的解析不到座標」,這個結果也值得被快取住,
// 不然每次都要重新打一次API得到同樣查不到的結果)。如果只回傳T|null,就沒辦法分辨
// 「快取命中、而且快取的內容剛好是null」跟「根本沒命中快取」這兩種情況
async function readPlacesCache<T>(db: Firestore, docId: string): Promise<{ hit: true; data: T } | { hit: false }> {
  try {
    const snap = await db.collection(PLACES_CACHE_COLLECTION).doc(docId).get();
    const cached = snap.data() as { data: T; fetchedAt: number } | undefined;
    if (cached && Date.now() - cached.fetchedAt < PLACES_CACHE_TTL_MS) {
      return { hit: true, data: cached.data };
    }
  } catch (err) {
    console.error(`[Places快取]讀取失敗(${docId}),改成重新呼叫API`, err);
  }
  return { hit: false };
}

async function writePlacesCache<T>(db: Firestore, docId: string, data: T): Promise<void> {
  try {
    await db.collection(PLACES_CACHE_COLLECTION).doc(docId).set({ data, fetchedAt: Date.now() });
  } catch (err) {
    console.error(`[Places快取]寫入失敗(${docId})`, err);
  }
}

// 下面searchNearbyBobaShops、resolveLocationName都是打同一個Places Text Search端點,
// 差別只在body內容跟FieldMask——這段共用的「打API+檢查有沒有成功」抽出來,兩邊各自
// 組好自己要的body/fieldMask呼叫這支,再各自處理拿到的JSON要怎麼過濾、轉成什麼型別
// (這部分兩邊不一樣,所以不共用)
async function callPlacesTextSearch(apiKey: string, body: object, fieldMask: string): Promise<unknown> {
  const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      // FieldMask一定要給,不給的話Places API (New)會直接回錯誤——這是新版API控制計費範圍
      // 的機制,只跟它要我們真的用得到的欄位
      "X-Goog-FieldMask": fieldMask,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Places API回傳錯誤(${response.status}): ${errorText}`);
  }

  return response.json();
}

export async function searchNearbyBobaShops(
  db: Firestore,
  apiKey: string,
  center: { lat: number; lng: number },
  radiusMeters: number
): Promise<NearbyPlace[]> {
  const cacheKey = `nearby_${roundCoord(center.lat)}_${roundCoord(center.lng)}`;
  const cached = await readPlacesCache<NearbyPlace[]>(db, cacheKey);
  if (cached.hit) return cached.data;

  const data = (await callPlacesTextSearch(
    apiKey,
    {
      textQuery: "手搖飲料店",
      languageCode: "zh-TW",
      locationBias: {
        circle: {
          center: { latitude: center.lat, longitude: center.lng },
          radius: radiusMeters,
        },
      },
      maxResultCount: 20,
      rankPreference: "DISTANCE",
    },
    "places.displayName,places.location"
  )) as {
    places?: {
      displayName?: { text?: string };
      location?: { latitude?: number; longitude?: number };
    }[];
  };

  // Google有時候會回傳缺座標或缺店名的怪結果,這種直接濾掉,不要讓後面比對品牌的
  // 邏輯還要處理「可能是undefined」這種情況
  const places = (data.places ?? [])
    .filter(
      (p) =>
        !!p.displayName?.text &&
        p.location?.latitude != null &&
        p.location?.longitude != null
    )
    .map((p) => ({
      name: p.displayName!.text!,
      lat: p.location!.latitude!,
      lng: p.location!.longitude!,
    }));

  await writePlacesCache(db, cacheKey, places);
  return places;
}

// 使用者可能用文字提到一個地點(例如「我等等要去中山捷運站」),不想等瀏覽器GPS定位,
// 這裡幫忙把地點名稱解析成座標——跟searchNearbyBobaShops共用同一個Text Search端點,
// 只是這次查的是地點本身,不是「附近的手搖飲料店」,所以不用locationBias/rankPreference,
// 只拿第一筆結果的座標就好。協調函式(recommendCoordinator.ts)拿到座標之後,
// 會把它當成跟瀏覽器GPS一樣的座標,丟進findNearbyBrands繼續走原本的流程
export async function resolveLocationName(
  db: Firestore,
  apiKey: string,
  locationName: string
): Promise<{ lat: number; lng: number } | null> {
  // trim一下再做key,避免使用者多打/少打前後空白就被當成不同地點,白白多打一次API
  const cacheKey = `location_${hashToSafeId(locationName.trim())}`;
  const cached = await readPlacesCache<{ lat: number; lng: number } | null>(db, cacheKey);
  // hit就直接採用,就算cached.data剛好是null(代表「這個地點名稱解析不到座標」)
  // 也一樣算數——這也是一個值得快取住的有效結果,不用因為是null就又重新打一次API
  if (cached.hit) {
    return cached.data;
  }

  const data = (await callPlacesTextSearch(
    apiKey,
    { textQuery: locationName, languageCode: "zh-TW", maxResultCount: 1 },
    "places.location"
  )) as {
    places?: { location?: { latitude?: number; longitude?: number } }[];
  };

  const place = data.places?.[0];
  const resolved =
    place?.location?.latitude == null || place?.location?.longitude == null
      ? null
      : { lat: place.location.latitude, lng: place.location.longitude };

  await writePlacesCache(db, cacheKey, resolved);
  return resolved;
}
