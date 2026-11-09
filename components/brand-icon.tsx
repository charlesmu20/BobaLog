import Image from "next/image";

// 品牌/飲料的小圓形icon,全站共用(收藏頁、地圖、首頁、菜單頁都靠這個元件畫圖示)。
// 原本是純<img>,換成next/image可以自動壓縮、轉成webp、做lazy loading。
export default function BrandIcon({
  name,
  icon,
  size = "w-6 h-6",
}: {
  name: string;
  icon: string;
  size?: string;
}) {
  // icon有可能是空字串——例如記帳紀錄裡存的品牌名稱,跟lib/brands.ts目前的品牌清單對不起來
  // (品牌改名、或資料本身就打錯字),getBrandIcon找不到對應品牌就回傳""。
  // Next Image的src不能是空字串(會跳console error、還可能讓瀏覽器重抓整頁),
  // 這種情況改顯示品牌名稱第一個字當文字版icon,不要硬塞空字串進去
  if (!icon) {
    return (
      <div
        className={`relative ${size} shrink-0 overflow-hidden rounded-full bg-[#E3D8C6] flex items-center justify-center text-[#6B5338] font-bold text-xs`}
      >
        {name.trim().charAt(0) || "?"}
      </div>
    );
  }

  return (
    <div className={`relative ${size} shrink-0 overflow-hidden rounded-full`}>
      <Image src={icon} alt={name} fill sizes="96px" className="object-cover" />
    </div>
  );
}
