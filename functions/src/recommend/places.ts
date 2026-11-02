// 用Google Places API (New)的Text Search REST端點,找使用者座標附近的手搖飲料店,
// 給「推薦飲料」功能抓附近品牌用。
//
// 跟前端components/map/places-layer.tsx用的是同一招(textQuery:"手搖飲料店"+locationBias+
// rankPreference:DISTANCE),只是這裡改成直接發HTTP request,不透過瀏覽器限定的JS SDK
// (@vis.gl/react-google-maps那套是瀏覽器用的套件,Node.js環境跑不起來)。金鑰用的是
// 另外申請、伺服器專用的PLACES_API_KEY(存在Secret Manager,跟GEMINI_API_KEY同一套做法),
// 不是前端那支公開金鑰。

import { defineSecret } from "firebase-functions/params";

export const PLACES_API_KEY = defineSecret("PLACES_API_KEY");

export type NearbyPlace = {
  name: string;
  lat: number;
  lng: number;
};

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
  apiKey: string,
  center: { lat: number; lng: number },
  radiusMeters: number
): Promise<NearbyPlace[]> {
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
  return (data.places ?? [])
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
}

// 使用者可能用文字提到一個地點(例如「我等等要去中山捷運站」),不想等瀏覽器GPS定位,
// 這裡幫忙把地點名稱解析成座標——跟searchNearbyBobaShops共用同一個Text Search端點,
// 只是這次查的是地點本身,不是「附近的手搖飲料店」,所以不用locationBias/rankPreference,
// 只拿第一筆結果的座標就好。協調函式(recommendCoordinator.ts)拿到座標之後,
// 會把它當成跟瀏覽器GPS一樣的座標,丟進findNearbyBrands繼續走原本的流程
export async function resolveLocationName(
  apiKey: string,
  locationName: string
): Promise<{ lat: number; lng: number } | null> {
  const data = (await callPlacesTextSearch(
    apiKey,
    { textQuery: locationName, languageCode: "zh-TW", maxResultCount: 1 },
    "places.location"
  )) as {
    places?: { location?: { latitude?: number; longitude?: number } }[];
  };

  const place = data.places?.[0];
  if (place?.location?.latitude == null || place?.location?.longitude == null) {
    return null;
  }
  return { lat: place.location.latitude, lng: place.location.longitude };
}
