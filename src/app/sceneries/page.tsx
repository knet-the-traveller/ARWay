"use client";

import { useMemo } from "react";
import { sceneries } from "@/lib/sceneries";
import { getDistance, formatDistance } from "@/lib/distance";
import { useGeolocation } from "@/hooks/useGeolocation";
import SceneryCard from "@/components/SceneryCard";

export default function SceneriesPage() {
  const { position, error } = useGeolocation();

  const sortedSceneries = useMemo(() => {
    if (!position) return sceneries;

    return [...sceneries].sort((a, b) => {
      const distA = getDistance(position.lat, position.lng, a.lat, a.lng);
      const distB = getDistance(position.lat, position.lng, b.lat, b.lng);
      return distA - distB;
    });
  }, [position]);

  return (
    <main className="flex flex-col w-full flex-1 min-h-0 bg-black text-white">
      <header className="p-[16px] shrink-0">
        <h1 className="text-[22px] font-semibold text-white">Sceneries</h1>
      </header>

      <div className="flex-1 min-h-0 overflow-y-auto px-[16px] pb-[16px] flex flex-col gap-[12px] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {sortedSceneries.map((scenery) => {
          let distanceText = "Locating...";
          
          if (error) {
            distanceText = "Distance unavailable";
          } else if (position) {
            const dist = getDistance(position.lat, position.lng, scenery.lat, scenery.lng);
            distanceText = formatDistance(dist);
          }

          return (
            <SceneryCard 
              key={scenery.id} 
              scenery={scenery} 
              distanceText={distanceText} 
            />
          );
        })}
      </div>
    </main>
  );
}
