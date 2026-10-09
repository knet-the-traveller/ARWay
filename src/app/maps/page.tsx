"use client";

import dynamic from "next/dynamic";
import { useGeolocation } from "@/hooks/useGeolocation";
import CameraView from "@/components/CameraView";
import { useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import LandmarkScanner from "@/components/LandmarkScanner";

const MapView = dynamic(() => import("@/components/MapView"), {
  ssr: false,
});

function MapsContent() {
  const { position, accuracy, error } = useGeolocation();
  const searchParams = useSearchParams();
  const [videoEl, setVideoEl] = useState<HTMLVideoElement | null>(null);

  const destination = useMemo(() => {
    const lat = searchParams.get("lat");
    const lng = searchParams.get("lng");
    const name = searchParams.get("name");
    if (lat && lng && name) {
      return { lat: parseFloat(lat), lng: parseFloat(lng), name };
    }
    return null;
  }, [searchParams]);

  return (
    <main className="flex flex-col w-full flex-1 min-h-0 bg-black text-white overflow-hidden relative">
      {/* STATUS BAR */}
      <div className="absolute top-0 left-0 w-full z-50 pointer-events-none p-2 flex justify-center">
        <div className="bg-black/60 text-white text-xs px-3 py-1 rounded-full shadow-md backdrop-blur-sm">
          {error ? (
            <span className="text-red-400">GPS Error: {error}</span>
          ) : accuracy ? (
            <span>GPS ±{Math.round(accuracy)} m</span>
          ) : (
            <span>Locating...</span>
          )}
        </div>
      </div>

      {/* TOP: CAMERA */}
      <div className="w-full h-[55%] relative">
        <CameraView onVideoReady={setVideoEl} />
        <LandmarkScanner video={videoEl} />
      </div>

      {/* DIVIDER */}
      <div className="w-full h-[1px] bg-gray-800 z-10" />

      {/* BOTTOM: MAP */}
      <div className="w-full h-[45%] relative">
        <MapView position={position} destination={destination} />
      </div>
    </main>
  );
}

export default function MapsPage() {
  return (
    <Suspense fallback={<div className="flex-1 bg-black" />}>
      <MapsContent />
    </Suspense>
  );
}
