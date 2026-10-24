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
  return (
    <div className={`relative ${size} shrink-0 overflow-hidden rounded-full`}>
      <Image src={icon} alt={name} fill sizes="96px" className="object-cover" />
    </div>
  );
}
