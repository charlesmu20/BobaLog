"use client";

export default function BrandMenuTabs({
  categories,
  onSelect,
}: {
  categories: string[];
  onSelect: (category: string) => void;
}) {
  return (
    <div className="flex gap-2 mb-4 flex-wrap">
      {categories.map((category) => (
        <button
          key={category}
          onClick={() => onSelect(category)}
          className="text-xs px-4 py-1.5 rounded-full bg-[#E4E8D3] text-[#4A3424] hover:bg-[#C9732F] hover:text-[#FAEEDA] transition-colors cursor-pointer"
        >
          {category}
        </button>
      ))}
    </div>
  );
}