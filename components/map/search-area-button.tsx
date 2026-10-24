"use client";

import { useEffect } from "react";
import { useMap, MapControl, ControlPosition } from "@vis.gl/react-google-maps";
import { Search } from "lucide-react";
import { distanceMeters } from "@/lib/map/distance";

const DRAG_THRESHOLD_METERS = 400;

// 這支不自己管「畫面現在在哪裡」的狀態,改成單純的受控元件:pendingCenter是上層(MapWithSidebar)
// 統一管的「目前畫面被移到哪了」,這裡只負責兩件事——(1)使用者拖曳地圖結束時,
// 回報新的中心點給上層(2)要不要顯示按鈕,直接拿pendingCenter跟searchCenter(上次真正搜尋
// 用的中心)算距離決定,是derived state,不用自己另外存一份、也不用擔心資料過期對不起來
export default function SearchAreaButton({
  searchCenter,
  pendingCenter,
  onMapMoved,
  onSearchHere,
}: {
  searchCenter: { lat: number; lng: number };
  pendingCenter: { lat: number; lng: number } | null;
  onMapMoved: (center: { lat: number; lng: number }) => void;
  onSearchHere: (center: { lat: number; lng: number }) => void;
}) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;
    const listener = map.addListener("dragend", () => {
      const c = map.getCenter();
      if (!c) return;
      onMapMoved({ lat: c.lat(), lng: c.lng() });
    });
    return () => listener.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);

  const visible =
    pendingCenter !== null && distanceMeters(searchCenter, pendingCenter) > DRAG_THRESHOLD_METERS;

  if (!visible || !pendingCenter) return null;

  return (
    <MapControl position={ControlPosition.TOP_CENTER}>
      <button
        onClick={() => onSearchHere(pendingCenter)}
        // 改成粗黑邊+硬陰影的貼紙按鈕風格,原本是白底圓角+模糊陰影,跟全站其他按鈕對不起來
        className="mt-3 flex cursor-pointer items-center gap-1.5 rounded-full border-[3px] border-[#3C332B] bg-[#F6F2EA] px-3 py-1.5 text-xs font-medium text-[#4A3424] shadow-[3px_3px_0_0_#3C332B] transition-all hover:bg-[#F6EFE4] hover:shadow-[2px_2px_0_0_#3C332B] hover:translate-x-px hover:translate-y-px"
      >
        <Search className="w-3.5 h-3.5" />
        搜尋這個區域
      </button>
    </MapControl>
  );
}
