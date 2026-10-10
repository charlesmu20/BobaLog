// components/map-view.tsx
"use client";

import { useState, useEffect } from "react";
import { APIProvider, Map } from "@vis.gl/react-google-maps";
import { Loader2 } from "lucide-react";

const DEFAULT_CENTER = { lat: 25.033, lng: 121.5654 }; // 定位失敗時的備用位置：台北車站

export default function MapView() {
  const [center, setCenter] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) {
      setCenter(DEFAULT_CENTER);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCenter({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      () => {
        setCenter(DEFAULT_CENTER);
      }
    );
  }, []);

  if (!center) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY as string}>
      <Map
        defaultCenter={center}
        defaultZoom={15}
        style={{ width: "100%", height: "100%" }}
        gestureHandling="greedy"
        disableDefaultUI={false}
      />
    </APIProvider>
  );
}