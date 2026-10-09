"use client";

import { useState, useMemo, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { shops, categories } from "@/lib/shops";
import { getDistance } from "@/lib/distance";
import { useGeolocation } from "@/hooks/useGeolocation";
import PageHeader from "@/components/sceneries/PageHeader";
import ShopListCard from "@/components/shop/ShopListCard";

function formatShopDistance(km: number): string {
  if (km < 1) {
    return `${Math.round(km * 1000)} m`;
  }
  return `${km.toFixed(1)} km`;
}

function ShopContent() {
  const { position, error } = useGeolocation();
  const searchParams = useSearchParams();
  const initialType = searchParams.get("type");

  const availableCategories = useMemo(() => {
    // Only keep categories that have at least one shop
    const activeIds = new Set(shops.map(s => s.categoryId));
    return categories.filter(c => activeIds.has(c.id));
  }, []);

  const [activeFilterId, setActiveFilterId] = useState<string>("All");

  useEffect(() => {
    if (initialType) {
      // Find category by label (case-insensitive)
      const match = availableCategories.find(
        c => c.label.toLowerCase() === initialType.toLowerCase()
      );
      if (match) setActiveFilterId(match.id);
    }
  }, [initialType, availableCategories]);

  const filteredShops = useMemo(() => {
    let filtered = shops;
    if (activeFilterId !== "All") {
      filtered = shops.filter(s => s.categoryId === activeFilterId);
    }
    
    // Sort by nearest first
    const refLat = position ? position.lat : 14.5896;
    const refLng = position ? position.lng : 120.9747;

    return [...filtered].sort((a, b) => {
      const distA = getDistance(refLat, refLng, a.lat, a.lng);
      const distB = getDistance(refLat, refLng, b.lat, b.lng);
      return distA - distB;
    });
  }, [activeFilterId, position]);

  return (
    <>
      <div className="flex-1 overflow-y-auto no-scrollbar pb-[calc(56px+env(safe-area-inset-bottom)+24px)] flex flex-col">
        {/* Title block */}
        <div className="px-4 flex flex-col mt-2 mb-4 shrink-0">
          <h2 className="font-display text-[34px] leading-none" style={{ color: "var(--aw-accent)" }}>Shop</h2>
          <p className="text-[14px] mt-1" style={{ color: "var(--aw-muted)" }}>Food, souvenirs and stays you can walk to.</p>
        </div>

        {/* Filter chips */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar px-4 pb-4 shrink-0">
          <button
            onClick={() => setActiveFilterId("All")}
            className="h-[44px] px-[18px] rounded-full text-[14px] shrink-0 transition-colors"
            style={{
              backgroundColor: activeFilterId === "All" ? "var(--aw-accent)" : "var(--aw-surface-2)",
              color: activeFilterId === "All" ? "#121b2c" : "var(--aw-muted)",
              fontWeight: activeFilterId === "All" ? 700 : 400
            }}
          >
            All
          </button>
          {availableCategories.map(cat => {
            const isActive = activeFilterId === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveFilterId(cat.id)}
                className="h-[44px] px-[18px] rounded-full text-[14px] shrink-0 transition-colors"
                style={{
                  backgroundColor: isActive ? "var(--aw-accent)" : "var(--aw-surface-2)",
                  color: isActive ? "#121b2c" : "var(--aw-muted)",
                  fontWeight: isActive ? 700 : 400
                }}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Shop list */}
        <div className="px-4 pb-4 flex flex-col gap-[12px]">
          {filteredShops.length === 0 ? (
            <div className="flex flex-col items-center justify-center pt-10 gap-4">
              <p className="text-[14px]" style={{ color: "var(--aw-muted)" }}>No shops in this category yet.</p>
              <button 
                onClick={() => setActiveFilterId("All")}
                className="font-bold text-[14px] active:opacity-70"
                style={{ color: "var(--aw-accent)" }}
              >
                Show all
              </button>
            </div>
          ) : (
            filteredShops.map((shop) => {
              let distanceText = "Offline pack";
              
              if (position) {
                const dist = getDistance(position.lat, position.lng, shop.lat, shop.lng);
                distanceText = formatShopDistance(dist);
              } else if (error || !position) {
                // Fall back to Intramuros reference point
                const dist = getDistance(14.5896, 120.9747, shop.lat, shop.lng);
                distanceText = formatShopDistance(dist);
              }

              return (
                <ShopListCard 
                  key={shop.id} 
                  shop={shop} 
                  distanceText={distanceText} 
                />
              );
            })
          )}
        </div>
      </div>
    </>
  );
}

export default function ShopPage() {
  return (
    <main 
      className="flex flex-col w-full flex-1 min-h-0 overflow-hidden font-sans"
      style={{ backgroundColor: "var(--aw-bg)" }}
    >
      <PageHeader />
      <Suspense fallback={<div className="flex-1" />}>
        <ShopContent />
      </Suspense>
    </main>
  );
}
