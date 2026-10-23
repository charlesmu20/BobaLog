"use client";
import { useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Drink } from "@/lib/brands";

export type SearchBrand = {
  name: string;
  slug: string;
  icon: string;
};

export type SearchDrink = Drink & {
  id: string;
  brandName: string;
  brandSlug: string;
  brandIcon: string;
};

export function useSearchIndex() {
  const [brands, setBrands] = useState<SearchBrand[]>([]);
  const [drinks, setDrinks] = useState<SearchDrink[]>([]);
  const [indexLoading, setIndexLoading] = useState(false);
  const [indexLoaded, setIndexLoaded] = useState(false);

  const loadIndex = async () => {
    if (indexLoaded || indexLoading) return;
    setIndexLoading(true);

    const brandsSnapshot = await getDocs(collection(db, "brands"));

    // 每個品牌的飲料子集合同時發出去,不要排隊依序等——N個品牌就是N個請求一起發,
    // 等全部一起回來,不是像以前那樣一個做完才做下一個(N+1次依序請求)
    const results = await Promise.all(
      brandsSnapshot.docs.map(async (brandDoc) => {
        const brandData = brandDoc.data();
        const drinksSnapshot = await getDocs(collection(db, "brands", brandDoc.id, "drinks"));
        const drinks: SearchDrink[] = drinksSnapshot.docs.map((d) => ({
          ...(d.data() as Drink),
          id: d.id,
          brandName: brandData.name,
          brandSlug: brandData.slug,
          brandIcon: brandData.icon,
        }));
        return {
          brand: { name: brandData.name, slug: brandData.slug, icon: brandData.icon } as SearchBrand,
          drinks,
        };
      })
    );

    const brandList = results.map((r) => r.brand);
    const drinkList = results.flatMap((r) => r.drinks);

    setBrands(brandList);
    setDrinks(drinkList);
    setIndexLoading(false);
    setIndexLoaded(true);
  };

  return { brands, drinks, indexLoading, indexLoaded, loadIndex };
}