"use client";

/**
 * 備註給明天的自己看:
 *
 * 地圖功能現在拆成四個檔案,各自負責一塊:
 *
 * 1. components/map-view.tsx(這支) —— 外殼。只負責「拿使用者定位」「loading畫面」
 *    「外層圓角卡片容器」「組裝左側清單+右側地圖」,邏輯很薄,通常不太需要改。
 *
 * 2. components/map/places-layer.tsx —— 大腦。真正打Google Places API(New)
 *    搜附近店家、把結果跟Firestore品牌清單比對、畫地圖上每一顆圓形pin跟點擊後的
 *    詳情彈窗。明天要調pin的動畫效果,改這支裡面的PlaceMarker元件。
 *
 * 3. components/map/map-sidebar.tsx —— 左側店家清單UI。明天要加的「營業中/
 *    距離排序」篩選功能,UI大概會加在這支裡面(資料篩選邏輯則看要放在這支
 *    還是上提到MapWithSidebar,到時候再討論)。
 *
 * 4. lib/mapTypes.ts —— PlacesLayer跟MapSidebar共用的型別(RawPlace、PlaceResult)。
 *
 * 資料流向:PlacesLayer抓到店家+比對完品牌 → 透過onResults往上回報給本檔案的
 * MapWithSidebar → MapWithSidebar把資料往下傳給MapSidebar畫清單。選中哪一家店
 * (selectedId)也是放在MapWithSidebar,左側清單跟地圖pin共用同一份選取狀態。
 */

import { useState, useEffect } from "react";
import { APIProvider, Map } from "@vis.gl/react-google-maps";
import { Loader2 } from "lucide-react";
import { useBrandSummaries } from "@/lib/hooks/useBrandSummaries";
import type { PlaceResult, MapFilters } from "@/lib/mapTypes";
import PlacesLayer from "@/components/map/places-layer";
import MapSidebar from "@/components/map/map-sidebar";
import MyLocationControl from "@/components/map/my-location-control";
import SearchAreaButton from "@/components/map/search-area-button";

const DEFAULT_CENTER = { lat: 25.033, lng: 121.5654 }; // 定位失敗時的備用位置:台北車站
const MAP_ID = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID as string; // 圓形pin用AdvancedMarker,一定要有Map ID

export default function MapView() {
  const [center, setCenter] = useState<{ lat: number; lng: number } | null>(null);

  //抓使用者位置
  useEffect(() => {
    //如果瀏覽器不支援定位功能
    if (!navigator.geolocation) {
      // navigator在SSR時不存在,這個檢查一定要放在只跑在瀏覽器端的useEffect裡才安全。
      // 這裡的setState是合理的初始化(不支援定位就直接退回預設值),不是真的在等外部系統回應,
      // 跟下面getCurrentPosition那兩個callback裡的setState性質不一樣,所以這行關掉規則
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCenter(DEFAULT_CENTER);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => setCenter({ lat: position.coords.latitude, lng: position.coords.longitude }),
      () => setCenter(DEFAULT_CENTER)
    );
  }, []);

  // 外層這張卡片負責圓角+裁邊,loading跟地圖本體都包在裡面,邊界才會一致
  return (
    <div className="h-[600px] w-full rounded-2xl overflow-hidden border border-[#E3D8C6] shadow-sm bg-white">
      {!center ? (
        <div className="flex h-full items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY as string}>
          <MapWithSidebar center={center} />
        </APIProvider>
      )}
    </div>
  );
}

function MapWithSidebar({ center }: { center: { lat: number; lng: number } }) {
  const [places, setPlaces] = useState<PlaceResult[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // 搜尋店家的座標
  const [searchCenter, setSearchCenter] = useState(center);
  // 畫面現在被移到哪裡了,但還沒真的拿去搜尋(用來決定要不要出現搜尋按鈕)
  const [pendingCenter, setPendingCenter] = useState<{ lat: number; lng: number } | null>(null);
  //搜尋輸入匡
  const [searchQuery, setSearchQuery] = useState("");
  // 篩選條件:地圖pin跟左側清單共用同一份狀態,放在這裡(兩邊的共同父層)往下傳
  const [filters, setFilters] = useState<MapFilters>({ onlyOpen: false, onlyWithBrand: false });
  // 不等brandsLoading也沒關係,brands晚一點從Firestore抓完,PlacesLayer裡的useMemo會自動重算一次品牌對應
  const { brands } = useBrandSummaries();

  return (
    <div className="flex h-full min-h-0">
      <MapSidebar
        places={places}
        selectedId={selectedId}
        onSelect={setSelectedId}
        searchQuery={searchQuery}
        onSearch={setSearchQuery}
        filters={filters}
        onFiltersChange={setFilters}
      />

      <div className="flex-1 relative">
        <Map
          mapId={MAP_ID}
          defaultCenter={center}
          defaultZoom={16}
          style={{ width: "100%", height: "100%" }}
          gestureHandling="greedy"
          disableDefaultUI={false}
          mapTypeControl={false}
          rotateControl={false}
          streetViewControl={false}
          fullscreenControl={false}
        >
          <PlacesLayer
            center={searchCenter}
            brands={brands}
            searchQuery={searchQuery}
            filters={filters}
            onResults={setPlaces}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
          <MyLocationControl center={center} onRecenter={() => setPendingCenter(center)} />
          <SearchAreaButton
            searchCenter={searchCenter}
            pendingCenter={pendingCenter}
            onMapMoved={setPendingCenter}
            onSearchHere={(c) => {
              setSearchCenter(c);
              setPendingCenter(null);
            }}
          />
        </Map>
      </div>
    </div>
  );
}
