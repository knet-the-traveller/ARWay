"use client";

import { useState, useMemo } from "react";
import { shops, categories } from "@/lib/shops";
import { getDistance, formatDistance } from "@/lib/distance";
import { useGeolocation } from "@/hooks/useGeolocation";
import ShopCard from "@/components/ShopCard";

export default function ShopPage() {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("All");
  const { position, error } = useGeolocation();

  const filteredShops = useMemo(() => {
    let filtered = shops;
    if (selectedCategoryId !== "All") {
      filtered = shops.filter(s => s.categoryId === selectedCategoryId);
    }
    
    if (!position) return filtered;

    return [...filtered].sort((a, b) => {
      const distA = getDistance(position.lat, position.lng, a.lat, a.lng);
      const distB = getDistance(position.lat, position.lng, b.lat, b.lng);
      return distA - distB;
    });
  }, [selectedCategoryId, position]);

  return (
    <main className="flex flex-col w-full flex-1 min-h-0 bg-black text-white">
      <header className="p-[16px] shrink-0">
        <h1 className="text-[22px] font-semibold text-white">Shop</h1>
      </header>

      {/* Category Chips */}
      <div className="flex overflow-x-auto px-[16px] py-1 shrink-0 gap-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        <button
          onClick={() => setSelectedCategoryId("All")}
          className="shrink-0 flex items-center justify-center min-h-[44px] outline-none"
        >
          <span className={`flex items-center justify-center h-[36px] rounded-full px-4 text-[14px] transition-colors ${
            selectedCategoryId === "All" ? "bg-[#3b82f6] text-white" : "bg-gray-800 text-gray-200"
          }`}>
            All
          </span>
        </button>
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategoryId(cat.id)}
            className="shrink-0 flex items-center justify-center min-h-[44px] outline-none"
          >
            <span className={`flex items-center justify-center h-[36px] rounded-full px-4 text-[14px] transition-colors ${
              selectedCategoryId === cat.id ? "bg-[#3b82f6] text-white" : "bg-gray-800 text-gray-200"
            }`}>
              {cat.label}
            </span>
          </button>
        ))}
      </div>

      {/* Shop List */}
      <div className="flex-1 min-h-0 overflow-y-auto px-[16px] pb-[16px] pt-[8px] flex flex-col gap-[12px] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {filteredShops.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            No shops yet
          </div>
        ) : (
          filteredShops.map((shop) => {
            let distanceText = "Locating...";
            
            if (error) {
              distanceText = "Distance unavailable";
            } else if (position) {
              const dist = getDistance(position.lat, position.lng, shop.lat, shop.lng);
              distanceText = formatDistance(dist);
            }

            return (
              <ShopCard 
                key={shop.id} 
                shop={shop} 
                distanceText={distanceText} 
              />
            );
          })
        )}
      </div>
    </main>
  );
}
