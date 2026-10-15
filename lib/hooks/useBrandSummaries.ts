"use client";
import { useState, useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { BrandSummary } from "@/lib/brands";

export function useBrandSummaries() {
  const [brands, setBrands] = useState<BrandSummary[]>([]);
  const [brandsLoading, setBrandsLoading] = useState(true);

  useEffect(() => {
    const fetchBrands = async () => {
      const brandsSnapshot = await getDocs(collection(db, "brands"));
      const brandsData = brandsSnapshot.docs.map((d) => d.data() as BrandSummary);
      setBrands(brandsData);
      setBrandsLoading(false);
    };
    fetchBrands();
  }, []);

  return { brands, brandsLoading };
}