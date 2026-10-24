"use client";

import { useEffect } from "react";
import { AdvancedMarker, MapControl, ControlPosition, useMap } from "@vis.gl/react-google-maps";
import { LocateFixed } from "lucide-react";
import { NAV_ICON_BUTTON_BASE } from "@/lib/nav-icon-button";

// 畫出使用者目前位置的藍點標記,右下角放一顆「回到我的位置」按鈕。
// 按鈕用MapControl插進Google地圖原生的控制項插槽(跟內建縮放按鈕同一區),
// 風格比較一致,也不用自己處理絕對定位
export default function MyLocationControl({
  center,
  onRecenter,
}: {
  center: { lat: number; lng: number };
  onRecenter?: () => void;
}) {
  const map = useMap();

  // <Map fullscreenControl={false}>這個prop其實有設,但實測全螢幕按鈕還是會跑出來
  // (懷疑是套件版本的bug,或是Map ID在Google Cloud那邊設定的樣式蓋過了這個prop)。
  // 改成拿到原生地圖物件後直接呼叫setOptions蓋一次,比較不會受套件本身的行為影響
  useEffect(() => {
    if (!map) return;
    map.setOptions({ fullscreenControl: false });
  }, [map]);

  return (
    <>
      <AdvancedMarker position={center}>
        <div
          style={{
            width: 18,
            height: 18,
            borderRadius: "50%",
            backgroundColor: "#4285F4",
            border: "3px solid white",
            boxShadow: "0 0 0 1px rgba(0,0,0,0.15), 0 2px 4px rgba(0,0,0,0.3)",
          }}
        />
      </AdvancedMarker>

      <MapControl position={ControlPosition.RIGHT_BOTTOM}>
        <button
          onClick={() => {
            if (!map) return;
            map.panTo(center);
            map.setZoom(16);
            // 這個按鈕是「帶使用者明確回到自己的位置」,所以順便直接把搜尋中心換回來、
            // 重新搜附近店家,不用還要使用者自己再多點一次「搜尋這個區域」
            onRecenter?.();
          }}
          // 跟NavBar那排圓形圖示按鈕同一套底樣式(粗黑邊+米白底)
          className={`${NAV_ICON_BUTTON_BASE} m-2 shadow-[2px_2px_0_0_#3C332B] hover:bg-[#F6EFE4] hover:shadow-[1px_1px_0_0_#3C332B] hover:translate-x-px hover:translate-y-px`}
          aria-label="回到我的位置"
        >
          <LocateFixed className="w-5 h-5 text-[#4A3424]" />
        </button>
      </MapControl>
    </>
  );
}
