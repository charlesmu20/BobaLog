"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Navigation } from "lucide-react";
import {
  AdvancedMarker,
  useAdvancedMarkerRef,
  InfoWindow,
  useMap,
  useMapsLibrary,
} from "@vis.gl/react-google-maps";
import { matchBrand } from "@/lib/matchBrand";
import { distanceMeters } from "@/lib/distance";
import { isCurrentlyOpen, getTodayHoursLabel } from "@/lib/openingHours";
import type { BrandSummary } from "@/lib/brands";
import type { RawPlace, PlaceResult, MapFilters } from "@/lib/mapTypes";
import OpenStatusBadge from "@/components/map/open-status-badge";

const SEARCH_RADIUS_METERS = 1500;
const SEARCH_EXPANDED_RADIUS_METERS = 15000; // 有打字搜尋店名時用這個,範圍放大到涵蓋大台北

// locationRestriction的型別只吃矩形(LatLngBoundsLiteral),不像locationBias可以直接給圓形,
// 所以搜尋店名時要自己把「中心點+半徑」換算成一個矩形範圍。1度緯度約111320公尺是固定的,
// 1度經度的實際距離會隨緯度變化(越往南北極經線越密),所以要先乘cos(緯度)修正
function boundsFromRadius(center: { lat: number; lng: number }, radiusMeters: number) {
  const latDelta = radiusMeters / 111320;
  const lngDelta = radiusMeters / (111320 * Math.cos((center.lat * Math.PI) / 180));
  return {
    north: center.lat + latDelta,
    south: center.lat - latDelta,
    east: center.lng + lngDelta,
    west: center.lng - lngDelta,
  };
}

// 真正打Places API(New)搜附近店家、畫pin、畫被選中的詳情卡片,這塊一定要放在<Map>裡面,
// 因為useMap()、AdvancedMarker、InfoWindow都要吃Map的context才能用
export default function PlacesLayer({
  center,
  brands,
  searchQuery,
  filters,
  onResults,
  selectedId,
  onSelect,
}: {
  center: { lat: number; lng: number };
  brands: BrandSummary[];
  searchQuery: string;
  filters: MapFilters;
  onResults: (places: PlaceResult[]) => void;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const map = useMap();
  const placesLib = useMapsLibrary("places");
  const [rawPlaces, setRawPlaces] = useState<RawPlace[]>([]);

  // 只負責打Google API抓附近店家,不處理品牌比對——這樣Firestore的brands晚載入完成
  // 也不需要重打一次Google API,省錢也不會畫面重新閃一次loading
  useEffect(() => {
    if (!map || !placesLib) return;

    let cancelled = false;

    (async () => {
      try {
        const query = searchQuery.trim();
        const isSearching = query.length > 0;
        const radius = isSearching ? SEARCH_EXPANDED_RADIUS_METERS : SEARCH_RADIUS_METERS;

        const { places: results } = await placesLib.Place.searchByText({
          textQuery: isSearching ? `${query} 手搖飲料店` : "手搖飲料店",
          fields: ["displayName", "location", "businessStatus", "regularOpeningHours"],
          // 一般瀏覽用locationBias(只是偏好附近,還是可能抓到範圍外的);有打字搜尋
          // 改用locationRestriction——硬性限制在這個範圍內,不然搜「50嵐」這種連鎖店,
          // 用relevance排序反而可能把很遠的分店也排進來
          ...(isSearching
            ? { locationRestriction: boundsFromRadius(center, radius) }
            : { locationBias: { center, radius } }),
          maxResultCount: 20,
          language: "zh-TW",
          rankPreference: "DISTANCE",
        });

        if (cancelled) return;

        const mapped: RawPlace[] = results
          .filter((r: google.maps.places.Place) => r.location)
          .map((r: google.maps.places.Place) => {
            const loc = { lat: r.location!.lat(), lng: r.location!.lng() };
            return {
              id: r.id,
              name: r.displayName ?? "未知店家",
              location: loc,
              isClosed:
                r.businessStatus === "CLOSED_PERMANENTLY" ||
                r.businessStatus === "CLOSED_TEMPORARILY",
              isOpenNow: isCurrentlyOpen(r.regularOpeningHours?.periods),
              todayHours: getTodayHoursLabel(r.regularOpeningHours?.weekdayDescriptions),
              distance: distanceMeters(center, loc),
            };
          })
          .filter((p) => p.distance <= radius * 1.5)
          .sort((a, b) => a.distance - b.distance);

        setRawPlaces(mapped);

        // 有打字搜尋、而且真的搜到結果的話,自動選中最近的那一家(地圖會順便平移過去)——
        // 不然搜到的店很可能完全在目前畫面外,使用者只能從清單裡自己找。故意寫在這裡
        // (API拿到資料的當下),不要另外開一個監聽places變化的useEffect去做,不然之後
        // brands重新載入、places重新算一次的時候,也會被誤判成「又有新搜尋結果」,
        // 把使用者原本手動選的店家強制切走
        if (isSearching && mapped.length > 0) {
          onSelect(mapped[0].id);
        }
      } catch (err) {
        console.error("搜尋附近店家失敗", err);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, placesLib, center.lat, center.lng, searchQuery]);

  // rawPlaces或brands(Firestore)任一個更新,這裡就自動重新算一次每家店對應哪個品牌。
  // 這裡故意手動用useMemo鎖住參考值:下面的useEffect要靠「places參考值沒變就不會重新觸發」
  // 來避免onResults→父層setState→重新render→這裡又算出新陣列→effect又觸發的無限迴圈。
  // Next.js的React Compiler沒辦法確認從外部import進來的matchBrand是純函式(同樣輸入一定同樣輸出),
  // 所以不敢保證它自動編譯出來的版本跟這裡手寫的memoization行為一致,就直接放棄優化這個元件、
  // 回報react-hooks/preserve-manual-memoization——程式本身邏輯是對的,tsc跟實際執行都沒問題,
  // 這純粹是這個還在實驗階段的工具的已知限制,所以這裡直接關掉這條規則
  // eslint-disable-next-line react-hooks/preserve-manual-memoization
  const places: PlaceResult[] = useMemo(() => {
    return rawPlaces.map((p) => ({ ...p, brand: matchBrand(p.name, brands) }));
  }, [rawPlaces, brands]);

  // 篩選條件套用在這裡:只看營業中→isOpenNow不是true的藏起來;只看已收錄品牌→沒比對到
  // brand的藏起來。下面onResults跟畫pin都改用visiblePlaces,這樣篩選才會「地圖pin跟
  // 左側清單一起消失」,不會只有清單藏起來、地圖上pin還留著
  const visiblePlaces = useMemo(() => {
    return places.filter((p) => {
      if (filters.onlyOpen && p.isOpenNow !== true) return false;
      if (filters.onlyWithBrand && !p.brand) return false;
      return true;
    });
  }, [places, filters]);

  useEffect(() => {
    onResults(visiblePlaces);
  }, [visiblePlaces, onResults]);

  // 選中的店家一變(不管是點地圖上的pin,還是點左側清單),就把地圖平滑移過去置中。
  // 左側清單點的那家店很可能根本不在目前畫面範圍內,沒有這段的話選了也看不到發生什麼事。
  // panTo本身就是帶動畫的平移,不用自己額外做動畫效果
  useEffect(() => {
    if (!map || !selectedId) return;
    const target = visiblePlaces.find((p) => p.id === selectedId);
    if (!target) return;
    map.panTo(target.location);
  }, [map, selectedId, visiblePlaces]);

  // 點擊地圖空白處(不是點在任何pin上)就把選中的店家清掉,詳情卡片跟著關閉。
  // AdvancedMarker的onClick不會順便觸發地圖本身的click事件,所以這裡不用擔心
  // 點pin的時候也會被這個監聽器誤判成「點空白處」
  useEffect(() => {
    if (!map) return;
    const listener = map.addListener("click", () => onSelect(""));
    return () => listener.remove();
  }, [map, onSelect]);

  return (
    <>
      {visiblePlaces.map((place) => (
        <PlaceMarker
          key={place.id}
          place={place}
          isSelected={selectedId === place.id}
          onSelect={onSelect}
        />
      ))}
    </>
  );
}

// 單一店家的圓形pin+被點擊時的詳情彈窗。拆成自己的元件是因為每個pin都要有自己的
// useAdvancedMarkerRef(),這樣InfoWindow才能正確anchor在「這個pin自己身上」,
// 不會再用猜的位置蓋住logo
function PlaceMarker({
  place,
  isSelected,
  onSelect,
}: {
  place: PlaceResult;
  isSelected: boolean;
  onSelect: (id: string) => void;
}) {
  const [markerRef, marker] = useAdvancedMarkerRef();
  const size = place.brand ? 36 : 18;

  return (
    <>
      <AdvancedMarker ref={markerRef} position={place.location} onClick={() => onSelect(place.id)}>
        <div
          className={`rounded-full overflow-hidden border-2 border-white shadow-md cursor-pointer transition-transform duration-150 ease-out hover:scale-110 ${
            isSelected ? "scale-110 ring-2 ring-[#C9732F]" : ""
          }`}
          style={{ width: size, height: size }}
        >
          {place.brand ? (
            <img src={place.brand.icon} alt={place.brand.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-[#A8A29E]" />
          )}
        </div>
      </AdvancedMarker>

      {isSelected && marker && (
        // headerDisabled:關掉Google預設的標題列。Google的InfoWindow預設會在內容上方
        // 留一整條空白列給它自己的關閉鈕用,不管我們的內容多短,那塊空白都會在——
        // 這就是「上面缺一塊」的真正原因。改成自己畫關閉鈕,就不會有這塊多餘的空白了
        <InfoWindow anchor={marker} headerDisabled onCloseClick={() => onSelect("")}>
          <div
            style={{
              fontSize: 12,
              color: "#4A3424",
              width: 210,
              position: "relative",
              paddingRight: 16,
              boxSizing: "border-box",
              animation: "infowindow-pop 0.18s ease-out",
            }}
          >
            <button
              onClick={() => onSelect("")}
              aria-label="關閉"
              style={{
                position: "absolute",
                top: -2,
                right: 0,
                border: "none",
                background: "transparent",
                padding: 2,
                cursor: "pointer",
                fontSize: 13,
                lineHeight: 1,
                color: "#8A7A63",
              }}
            >
              ✕
            </button>
            <p style={{ fontWeight: 500, margin: 0 }}>{place.name}</p>
            <div style={{ display: "flex", alignItems: "center", gap: 6, margin: "3px 0" }}>
              <span style={{ color: "#8A7A63" }}>{place.distance}m</span>
              <OpenStatusBadge isClosed={place.isClosed} isOpenNow={place.isOpenNow} />
            </div>
            {place.todayHours && (
              <p style={{ color: "#8A7A63", margin: "0 0 6px" }}>{place.todayHours}</p>
            )}
            <div style={{ display: "flex", alignItems: "center", marginTop: 2, marginRight: -16 }}>
              {place.brand && (
                <Link href={`/brand/${place.brand.slug}`} style={{ color: "#C9732F", fontSize: 11 }}>
                  查看菜單 →
                </Link>
              )}
              {/* 導航:直接連去Google Maps的路線規劃,帶destination_place_id可以準確定位到
                  這家店(不是只靠經緯度)。跟查看菜單同一排,marginLeft:auto推到最右邊——
                  之前用position:absolute固定在角落,Google量這張卡片高度時量不準,
                  按鈕會飄到卡片外面,改成正常排版的一部分就不會有這個問題 */}
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${place.location.lat},${place.location.lng}&destination_place_id=${place.id}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="開始導航"
                title="開始導航"
                style={{
                  marginLeft: "auto",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 22,
                  height: 22,
                  borderRadius: 9999,
                  backgroundColor: "#FAEEDA",
                  color: "#C9732F",
                  flexShrink: 0,
                }}
              >
                <Navigation style={{ width: 12, height: 12 }} />
              </a>
            </div>
          </div>
        </InfoWindow>
      )}
    </>
  );
}
