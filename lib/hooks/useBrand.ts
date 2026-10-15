"use client";
import { useState, useEffect } from "react";
import { doc, getDoc, collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Brand, Drink } from "@/lib/brands";

export function useBrand(slug: string) {
  const [brand, setBrand] = useState<Brand | null>(null);
  const [brandLoading, setBrandLoading] = useState(true);

  useEffect(() => {
    const fetchBrand = async () => {
      const brandRef = doc(db, "brands", slug);
      const brandSnap = await getDoc(brandRef);

      if (!brandSnap.exists()) {
        setBrand(null);
        setBrandLoading(false);
        return;
      }

      const drinksSnapshot = await getDocs(collection(db, "brands", slug, "drinks"));
      const drinks = drinksSnapshot.docs.map((d) => ({ ...(d.data() as Drink), id: d.id }));

      setBrand({ ...brandSnap.data(), drinks } as Brand);
      setBrandLoading(false);
    };
    fetchBrand();
  }, [slug]);

  return { brand, brandLoading };
}