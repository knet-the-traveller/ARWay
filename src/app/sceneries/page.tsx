"use client";

import { useMemo, useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { sceneries, Scenery } from "@/lib/sceneries";
import { getDistance } from "@/lib/distance";
import { useGeolocation } from "@/hooks/useGeolocation";
import PageHeader from "@/components/sceneries/PageHeader";
import SceneryGridCard from "@/components/sceneries/SceneryGridCard";

function formatSceneryDistance(km: number): string {
  if (km < 1) {
    return `${Math.round(km * 1000)} m`;
  }
  return `${km.toFixed(1)} km`;
}

type SortType = "Nearest first" | "Top rated" | "A to Z";
const FILTERS = ["All", "Historic", "Church", "Museum", "Waterfront", "Park"];

function SceneriesContent() {
  const { position, error } = useGeolocation();
  const searchParams = useSearchParams();
  const initialType = searchParams.get("type");

  const [activeFilter, setActiveFilter] = useState("All");
  const [sortType, setSortType] = useState<SortType>("Nearest first");

  useEffect(() => {
    if (initialType) {
      const match = FILTERS.find(f => f.toLowerCase() === initialType.toLowerCase());
      if (match) setActiveFilter(match);
    }
  }, [initialType]);

  const cycleSort = () => {
    if (sortType === "Nearest first") setSortType("Top rated");
    else if (sortType === "Top rated") setSortType("A to Z");
    else setSortType("Nearest first");
  };

  const getSceneryCategory = (s: Scenery) => {
    const cat = (s as any).category;
    if (cat) return cat;
    if (s.name.includes("Park")) return "Park";
    if (s.name.includes("Church") || s.name.includes("Cathedral")) return "Church";
    if (s.name.includes("Museum")) return "Museum";
    if (s.name.includes("Bay") || s.name.includes("River") || s.name.includes("Beach")) return "Waterfront";
    return "Historic";
  };

  const filteredSceneries = useMemo(() => {
    if (activeFilter === "All") return sceneries;
    return sceneries.filter(s => getSceneryCategory(s).toLowerCase() === activeFilter.toLowerCase());
  }, [activeFilter]);

  const sortedSceneries = useMemo(() => {
    const arr = [...filteredSceneries];
    
    // Intramuros reference point
    const refLat = position ? position.lat : 14.5896;
    const refLng = position ? position.lng : 120.9747;

    return arr.sort((a, b) => {
      if (sortType === "Nearest first") {
        const distA = getDistance(refLat, refLng, a.lat, a.lng);
        const distB = getDistance(refLat, refLng, b.lat, b.lng);
        return distA - distB;
      }
      if (sortType === "Top rated") {
        const ratingA = (a as any).rating || 4.5;
        const ratingB = (b as any).rating || 4.5;
        return ratingB - ratingA;
      }
      // A to Z
      return a.name.localeCompare(b.name);
    });
  }, [filteredSceneries, sortType, position]);

  return (
    <>
      <div className="flex-1 overflow-y-auto no-scrollbar pb-[calc(56px+env(safe-area-inset-bottom)+24px)] flex flex-col">
        {/* Title row */}
        <div className="px-4 flex items-center justify-between mt-2 mb-4 shrink-0">
          <h2 className="font-display text-[34px] leading-none" style={{ color: "var(--aw-accent)" }}>Sceneries</h2>
          <button 
            onClick={cycleSort}
            className="h-[44px] px-4 rounded-full font-bold text-[14px] active:opacity-80 transition-opacity shrink-0"
            style={{ backgroundColor: "var(--aw-accent)", color: "#121b2c" }}
          >
            {sortType}
          </button>
        </div>

        {/* Filter chips */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar px-4 pb-4 shrink-0">
          {FILTERS.map(f => {
            const isActive = activeFilter === f;
            return (
              <button
                key={f}
                onClick={() => setActiveFilter(f)}
                className="h-[44px] px-[18px] rounded-full text-[14px] shrink-0 transition-colors"
                style={{
                  backgroundColor: isActive ? "var(--aw-accent)" : "var(--aw-surface-2)",
                  color: isActive ? "#121b2c" : "var(--aw-muted)",
                  fontWeight: isActive ? 700 : 400
                }}
              >
                {f}
              </button>
            );
          })}
        </div>

        {/* Card grid */}
        <div className="px-4 pb-4">
          {sortedSceneries.length === 0 ? (
            <div className="flex flex-col items-center justify-center pt-10 gap-4">
              <p className="text-[14px]" style={{ color: "var(--aw-muted)" }}>No places in this category yet.</p>
              <button 
                onClick={() => setActiveFilter("All")}
                className="font-bold text-[14px] active:opacity-70"
                style={{ color: "var(--aw-accent)" }}
              >
                Show all
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-[12px]">
              {sortedSceneries.map((scenery) => {
                let distanceText = "Offline pack";
                
                if (position) {
                  const dist = getDistance(position.lat, position.lng, scenery.lat, scenery.lng);
                  distanceText = formatSceneryDistance(dist);
                } else if (error || !position) {
                  // Fall back to Intramuros reference point
                  const dist = getDistance(14.5896, 120.9747, scenery.lat, scenery.lng);
                  distanceText = formatSceneryDistance(dist);
                }

                return (
                  <SceneryGridCard 
                    key={scenery.id} 
                    scenery={scenery} 
                    distanceText={distanceText} 
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default function SceneriesPage() {
  return (
    <main 
      className="flex flex-col w-full flex-1 min-h-0 overflow-hidden font-sans"
      style={{ backgroundColor: "var(--aw-bg)" }}
    >
      <PageHeader />
      <Suspense fallback={<div className="flex-1" />}>
        <SceneriesContent />
      </Suspense>
    </main>
  );
}
