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
import type { PlaceResult, MapFilters } from "@/lib/map/mapTypes";
import { STICKER_CARD_BASE } from "@/lib/sticker-card";
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

  // 外層這張卡片負責圓角+裁邊,loading跟地圖本體都包在裡面,邊界才會一致。
  // 邊框/陰影改用全站共用的STICKER_CARD_BASE(粗黑邊+硬陰影),原本是細細的米色邊框+
  // 模糊陰影,跟收藏頁、首頁這些地方的貼紙卡風格對不起來
  // 手機寬度縮一點高度(520px),760px以上才用原本的600px,
  // 不然清單疊到地圖上面後,整塊區域在小螢幕上會佔掉太多畫面高度
  return (
    <div className={`${STICKER_CARD_BASE} h-[520px] w-full overflow-hidden shadow-[6px_6px_0_0_#3C332B] min-[760px]:h-[600px]`}>
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

  // 760px以下「店家清單」那一塊預設收起來,點MapSidebar裡的藥丸按鈕才展開
  // (搜尋列不受影響,永遠顯示);760px以上這個狀態完全不影響畫面,清單永遠展開
  const [isListOpen, setIsListOpen] = useState(false);

  // 不管是點地圖上的pin、還是點清單裡的項目選中一家店,手機版都順便把清單收回去——
  // 不然選完店家清單還蓋在地圖上面,看不到剛選的那個pin跑到哪裡、也看不到詳情彈窗
  function handleSelect(id: string) {
    setSelectedId(id);
    setIsListOpen(false);
  }

  // 760px以下清單疊在地圖上面(flex-col),760px以上才左右並排(flex-row)——
  // 原本清單固定220px寬、不管螢幕多窄都硬擠在地圖旁邊,手機寬度扣掉220px地圖只剩
  // 一百多px,完全不能用
  return (
    <div className="flex flex-col h-full min-h-0 min-[760px]:flex-row">
      <MapSidebar
        places={places}
        selectedId={selectedId}
        onSelect={handleSelect}
        searchQuery={searchQuery}
        onSearch={setSearchQuery}
        filters={filters}
        onFiltersChange={setFilters}
        isOpen={isListOpen}
        onToggle={() => setIsListOpen((v) => !v)}
      />

      <div className="flex-1 min-h-0">
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
            onSelect={handleSelect}
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
