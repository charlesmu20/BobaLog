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
    const brandList: SearchBrand[] = [];
    const drinkList: SearchDrink[] = [];

    for (const brandDoc of brandsSnapshot.docs) {
      const brandData = brandDoc.data();
      brandList.push({ name: brandData.name, slug: brandData.slug, icon: brandData.icon });

      const drinksSnapshot = await getDocs(collection(db, "brands", brandDoc.id, "drinks"));
      drinksSnapshot.docs.forEach((d) => {
        drinkList.push({
          ...(d.data() as Drink),
          id: d.id,
          brandName: brandData.name,
          brandSlug: brandData.slug,
          brandIcon: brandData.icon,
        });
      });
    }

    setBrands(brandList);
    setDrinks(drinkList);
    setIndexLoading(false);
    setIndexLoaded(true);
  };

  return { brands, drinks, indexLoading, indexLoaded, loadIndex };
}