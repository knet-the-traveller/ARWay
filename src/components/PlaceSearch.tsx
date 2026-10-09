"use client";

import { useState, useEffect, useRef } from "react";
import { haversineDistanceM } from "@/lib/geo";
import { sceneries } from "@/lib/sceneries";
import { shops } from "@/lib/shops";

export interface PlaceResult {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  tag?: string;
  distanceM?: number;
}

interface PlaceSearchProps {
  userLocation?: { lat: number; lng: number } | null;
  userPosition?: { lat: number; lng: number } | null;
  destinationName?: string | null;
  onSelectPlace?: (place: { lat: number; lng: number; name: string; address?: string }) => void;
  onSelect?: (place: { lat: number; lng: number; name: string; address?: string }) => void;
  className?: string;
}

const COMMON_NEARBY_POIS: PlaceResult[] = [
  // Fast Food & Everyday Spots in Intramuros / Manila / Makati Demo Zones (100% offline ready)
  { id: "poi-mcdo-intramuros", name: "McDonald's Intramuros", address: "General Luna St, Intramuros, Manila", lat: 14.5898, lng: 120.9749, tag: "Fast Food" },
  { id: "poi-mcdo-binondo", name: "McDonald's Binondo", address: "Plaza Lorenzo Ruiz, Binondo, Manila", lat: 14.5997, lng: 120.9744, tag: "Fast Food" },
  { id: "poi-mcdo-greenbelt", name: "McDonald's Greenbelt", address: "Ayala Center, Makati, Metro Manila", lat: 14.5518, lng: 121.0205, tag: "Fast Food" },
  { id: "poi-mcdo-sm-makati", name: "McDonald's SM Makati", address: "Hotel Dr, Ayala Center, Makati", lat: 14.5494, lng: 121.0267, tag: "Fast Food" },
  { id: "poi-jollibee-intramuros", name: "Jollibee Intramuros", address: "Muralla St, Intramuros, Manila", lat: 14.5925, lng: 120.9782, tag: "Fast Food" },
  { id: "poi-jollibee-binondo", name: "Jollibee Plaza Lorenzo Ruiz", address: "Quintin Paredes St, Binondo, Manila", lat: 14.5993, lng: 120.9748, tag: "Fast Food" },
  { id: "poi-jollibee-ayala", name: "Jollibee Ayala Triangle", address: "Paseo de Roxas, Makati", lat: 14.5568, lng: 121.0239, tag: "Fast Food" },
  { id: "poi-7eleven-general-luna", name: "7-Eleven General Luna", address: "General Luna St, Intramuros, Manila", lat: 14.5888, lng: 120.9752, tag: "Store" },
  { id: "poi-starbucks-isabel", name: "Starbucks Puerta de Isabel II", address: "Muralla St, Intramuros, Manila", lat: 14.5946, lng: 120.9765, tag: "Cafe" },
  { id: "poi-starbucks-greenbelt", name: "Starbucks Greenbelt 3", address: "Esperanza St, Ayala Center, Makati", lat: 14.5522, lng: 121.0211, tag: "Cafe" }
];

export default function PlaceSearch({
  userLocation,
  userPosition,
  destinationName,
  onSelectPlace,
  onSelect,
  className = ""
}: PlaceSearchProps) {
  const effectiveUserPos = userLocation || userPosition || null;
  const [query, setQuery] = useState(destinationName || "");
  const [results, setResults] = useState<PlaceResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (destinationName) {
      setQuery(destinationName);
    }
  }, [destinationName]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const searchPlaces = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || trimmed.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    // 1. Local search from common POIs (McDonald's, Jollibee, etc.), sceneries, and shops (100% offline ready)
    const lower = trimmed.toLowerCase();
    const cleanLower = lower.replace(/['']/g, "");
    const localMatches: PlaceResult[] = [];

    // Check offline POIs (McDonald's, Jollibee, 7-Eleven, etc.)
    for (const p of COMMON_NEARBY_POIS) {
      const pName = p.name.toLowerCase();
      const pClean = pName.replace(/['']/g, "");
      if (pName.includes(lower) || pClean.includes(cleanLower) || p.address.toLowerCase().includes(lower)) {
        const dist = effectiveUserPos ? haversineDistanceM(effectiveUserPos, { lat: p.lat, lng: p.lng }) : undefined;
        localMatches.push({ ...p, distanceM: dist });
      }
    }

    // Check sceneries
    for (const s of sceneries) {
      const sName = s.name.toLowerCase();
      const sClean = sName.replace(/['']/g, "");
      if (sName.includes(lower) || sClean.includes(cleanLower) || s.address.toLowerCase().includes(lower)) {
        const dist = effectiveUserPos ? haversineDistanceM(effectiveUserPos, { lat: s.lat, lng: s.lng }) : undefined;
        localMatches.push({
          id: `local-scenery-${s.id}`,
          name: s.name,
          address: s.address,
          lat: s.lat,
          lng: s.lng,
          tag: "Heritage",
          distanceM: dist
        });
      }
    }

    // Check shops
    for (const sh of shops) {
      const shName = sh.name.toLowerCase();
      const shClean = shName.replace(/['']/g, "");
      if (shName.includes(lower) || shClean.includes(cleanLower) || sh.address.toLowerCase().includes(lower)) {
        const dist = effectiveUserPos ? haversineDistanceM(effectiveUserPos, { lat: sh.lat, lng: sh.lng }) : undefined;
        localMatches.push({
          id: `local-shop-${sh.id}`,
          name: sh.name,
          address: sh.address,
          lat: sh.lat,
          lng: sh.lng,
          tag: "Shop",
          distanceM: dist
        });
      }
    }

    try {
      const onlineMatches: PlaceResult[] = [];

      // 2. Photon Geocoder (Fast OpenStreetMap Search by Komoot, 0 keys needed)
      const photonQuery = trimmed.replace(/['']/g, "");
      let url = `https://photon.komoot.io/api/?q=${encodeURIComponent(photonQuery)}&limit=6`;
      if (effectiveUserPos) {
        url += `&lat=${effectiveUserPos.lat}&lon=${effectiveUserPos.lng}`;
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2500);
      const res = await fetch(url, { signal: controller.signal }).catch(() => null);
      clearTimeout(timeout);

      if (res && res.ok) {
        const data = await res.json();
        if (data && data.features && data.features.length > 0) {
          data.features.forEach((f: any, idx: number) => {
            const props = f.properties || {};
            const coords = f.geometry?.coordinates || [0, 0];
            const lng = coords[0];
            const lat = coords[1];

            const name = props.name || props.street || trimmed;
            const addressParts = [
              props.street ? `${props.housenumber || ""} ${props.street}`.trim() : null,
              props.city || props.district || props.county,
              props.country
            ].filter(Boolean);

            const address = addressParts.join(", ") || props.country || "Location";
            const dist = effectiveUserPos ? haversineDistanceM(effectiveUserPos, { lat, lng }) : undefined;

            onlineMatches.push({
              id: `photon-${idx}-${lat}-${lng}`,
              name,
              address,
              lat,
              lng,
              distanceM: dist
            });
          });
        }
      }

      // 3. Nominatim Fallback if Photon returned 0 results online
      if (onlineMatches.length === 0 && typeof navigator !== "undefined" && navigator.onLine) {
        try {
          const nomUrl = `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(trimmed)}&countrycodes=ph&limit=6&accept-language=en`;
          const nCtrl = new AbortController();
          const nTimeout = setTimeout(() => nCtrl.abort(), 2500);
          const nRes = await fetch(nomUrl, { signal: nCtrl.signal }).catch(() => null);
          clearTimeout(nTimeout);

          if (nRes && nRes.ok) {
            const nData = await nRes.json();
            if (Array.isArray(nData)) {
              nData.forEach((item: any, idx: number) => {
                const parts = item.display_name.split(",");
                const name = parts[0].trim();
                const address = parts.slice(1, 4).join(",").trim() || "Philippines";
                const lat = parseFloat(item.lat);
                const lng = parseFloat(item.lon);
                const dist = effectiveUserPos ? haversineDistanceM(effectiveUserPos, { lat, lng }) : undefined;

                onlineMatches.push({
                  id: `nom-${idx}-${lat}-${lng}`,
                  name,
                  address,
                  lat,
                  lng,
                  distanceM: dist
                });
              });
            }
          }
        } catch {}
      }

      // Deduplicate and combine (local POIs prioritize instant offline response)
      const combined = [...localMatches];
      for (const om of onlineMatches) {
        const isDup = combined.some(c =>
          Math.abs(c.lat - om.lat) < 0.0003 && Math.abs(c.lng - om.lng) < 0.0003
        );
        if (!isDup) combined.push(om);
      }

      if (effectiveUserPos) {
        combined.sort((a, b) => (a.distanceM || 0) - (b.distanceM || 0));
      }

      setResults(combined);
      setIsOpen(true);
    } catch {
      setResults(localMatches);
      setIsOpen(localMatches.length > 0);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (!val.trim()) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    debounceTimerRef.current = setTimeout(() => {
      searchPlaces(val);
    }, 250);
  };

  const handleSelect = (place: PlaceResult) => {
    setQuery(place.name);
    setIsOpen(false);
    const payload = {
      lat: place.lat,
      lng: place.lng,
      name: place.name,
      address: place.address
    };
    onSelectPlace?.(payload);
    onSelect?.(payload);
  };

  const formatDistance = (m?: number) => {
    if (m === undefined) return "";
    if (m < 1000) return `${Math.round(m)}m`;
    return `${(m / 1000).toFixed(1)}km`;
  };

  return (
    <div ref={containerRef} className={`relative z-50 w-full ${className}`}>
      {/* SEARCH BAR INPUT */}
      <div className="relative flex items-center bg-[#1c1c1e]/90 backdrop-blur-md rounded-2xl border border-white/10 shadow-lg px-3 py-2 text-white">
        <svg className="w-4 h-4 text-neutral-400 mr-2 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
          <circle cx="11" cy="11" r="8" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35" />
        </svg>

        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={() => query.length >= 2 && setIsOpen(true)}
          placeholder="Search McDonald's, street, landmark..."
          className="bg-transparent flex-1 text-xs text-white placeholder-neutral-500 focus:outline-none min-w-0"
        />

        {loading && (
          <div className="w-3.5 h-3.5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mr-1 shrink-0" />
        )}

        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setResults([]);
              setIsOpen(false);
            }}
            className="w-5 h-5 rounded-full bg-neutral-800 text-neutral-400 hover:text-white flex items-center justify-center text-xs ml-1 shrink-0"
          >
            ✕
          </button>
        )}
      </div>

      {/* AUTOCOMPLETE RESULTS DROPDOWN */}
      {isOpen && results.length > 0 && (
        <div 
          className="absolute top-full left-0 right-0 mt-1.5 bg-[#1c1c1e]/98 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden divide-y divide-white/5 max-h-[220px] overflow-y-auto z-[500]"
          onTouchStart={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.preventDefault()}
        >
          {results.map((res) => (
            <button
              key={res.id}
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleSelect(res);
              }}
              onClick={() => handleSelect(res)}
              className="w-full text-left px-3.5 py-2.5 hover:bg-white/5 active:bg-blue-600/20 flex items-center justify-between gap-2 transition-colors group cursor-pointer"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-white truncate group-hover:text-blue-400 transition-colors">
                    {res.name}
                  </span>
                  {res.tag && (
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                      {res.tag}
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-neutral-400 truncate mt-0.5">
                  {res.address}
                </div>
              </div>

              {res.distanceM !== undefined && (
                <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-neutral-800/80 text-neutral-300 border border-white/5 shrink-0">
                  {formatDistance(res.distanceM)}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {isOpen && !loading && query.length >= 2 && results.length === 0 && (
        <div className="absolute top-full left-0 right-0 mt-1.5 bg-[#1c1c1e]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-3 text-center text-xs text-neutral-400 z-[500]">
          No matching places found. Try tapping the map to drop a pin.
        </div>
      )}
    </div>
  );
}
