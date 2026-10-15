"use client";
import { Search } from "lucide-react";

export default function BrandMenuSearch({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="relative mb-5">
      <Search className="w-4 h-4 text-[#8A7A63] absolute left-3 top-1/2 -translate-y-1/2" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="搜尋這個品牌的飲料..."
        className="w-full h-10 pl-9 pr-3 rounded-lg border border-[#E3D8C6] bg-white text-sm text-[#4A3424]"
      />
    </div>
  );
}