"use client";

import { useState, useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Brand, Drink } from "@/lib/brands";

export function useBrands() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [brandsLoading, setBrandsLoading] = useState(true);

  useEffect(() => {
    const fetchBrands = async () => {
      const brandsSnapshot = await getDocs(collection(db, "brands"));
      const brandsData = await Promise.all(
        brandsSnapshot.docs.map(async (brandDoc) => {
          const drinksSnapshot = await getDocs(
            collection(db, "brands", brandDoc.id, "drinks")
          );
          const drinks = drinksSnapshot.docs.map((d) => d.data() as Drink);
          return { ...brandDoc.data(), drinks } as Brand;
        })
      );
      setBrands(brandsData);
      setBrandsLoading(false);
    };
    fetchBrands();
  }, []);

  return { brands, brandsLoading };
}