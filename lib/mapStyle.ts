// Google地圖的自訂樣式:把預設的藍綠色改成跟BobaLog米茶色系搭配的顏色
export const mapStyle: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#F6EFE4" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#8A7A63" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#FFFFFF" }, { weight: 2 }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#E3D8C6" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#D3C9B8" }] },
  { featureType: "landscape", elementType: "geometry", stylers: [{ color: "#F6EFE4" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#D6DCC4" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#C7D9D6" }] },
  // 關掉Google預設的店家圖示跟標籤,我們自己畫pin,不然會跟自己的pin打架
  { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
];