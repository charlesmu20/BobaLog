"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Coffee } from "lucide-react";
import type { BrandSummary } from "@/lib/brands";

const rotations = [-4, 3, -2, 2, -3, 4];

export default function BrandCardGrid({ brands }: { brands: BrandSummary[] }) {
    const [openBrand, setOpenBrand] = useState<string | null>(null);
    const gridRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
			const handleClickOutside = (e: MouseEvent) => {
				if (gridRef.current && !gridRef.current.contains(e.target as Node)) {
					setOpenBrand(null);
      	}
			};
			document.addEventListener("mousedown", handleClickOutside);
			return () => document.removeEventListener("mousedown", handleClickOutside);
		}, []);

		return (
			<div>
				<div className="text-sm font-medium text-[#4A3424] mb-4">所有品牌</div>

				<div ref={gridRef} className="flex flex-wrap gap-7 px-2">
					{brands.map((brand, i) => (
						<div
							key={brand.name}
							onClick={() =>
								setOpenBrand(openBrand === brand.name ? null : brand.name)
							}
							style={{ transform: `rotate(${rotations[i % rotations.length]}deg)` }}
            	className={`relative bg-[#E4E8D3] border border-[#D3D9BE] rounded-[4px] p-2.5 pb-4 shadow-sm cursor-pointer transition-transform hover:-translate-y-1 hover:scale-[1.03] hover:rotate-0 ${
            	  openBrand === brand.name ? "z-30" : "z-10"
            	}`}
						>

							<img
								src={brand.icon}
								alt={brand.name}
								className="w-[70px] h-[70px] rounded object-cover mb-2 border-2 border-[#E3D8C6]"
							/>
							<div className="text-xs text-[#4A3424] text-center">{brand.name}</div>

							{openBrand === brand.name && (
								<div
									style={{ transform: `translateY(-50%) rotate(${-rotations[i % rotations.length]}deg)` }}
									className="absolute top-1/2 left-full ml-3 bg-[#F6EFE4] border border-[#E3D8C6] rounded-xl p-4 w-[160px] shadow-xl z-20"
								>
									<div className="absolute top-1/2 -left-1.5 -translate-y-1/2 w-3 h-3 bg-[#F6EFE4] border-l border-b border-[#E3D8C6] rotate-45" />
									<div className="flex items-center gap-1.5 text-sm text-[#4A3424] mb-2.5">
										<Coffee className="w-3.5 h-3.5 text-[#8A7A63]" />
										{brand.drinkCount} 款飲品
									</div>
                 <Link
                   href={`/brand/${brand.slug}`}
                   onClick={(e) => e.stopPropagation()}
                   className="block w-full text-center bg-[#C9732F] text-white rounded-lg py-2 text-xs font-medium cursor-pointer hover:bg-[#B3652A]"
                 >
                   瀏覽菜單
                 </Link>
								</div>
							)}

						</div>
					))}
				</div>

			</div>
		)
}