"use client";

import { useState, useEffect, useRef } from "react";
import { haversineDistanceM } from "@/lib/geo";

export interface PlaceResult {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  distanceM?: number;
}

interface PlaceSearchProps {
  userLocation?: { lat: number; lng: number } | null;
  onSelectPlace: (place: { lat: number; lng: number; name: string; address?: string }) => void;
  className?: string;
}

export default function PlaceSearch({ userLocation, onSelectPlace, className = "" }: PlaceSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PlaceResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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
    if (!text.trim() || text.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      // 1. Try Photon Geocoder (Fast OpenStreetMap Search by Komoot, 0 keys needed)
      let url = `https://photon.komoot.io/api/?q=${encodeURIComponent(text)}&limit=6`;
      if (userLocation) {
        url += `&lat=${userLocation.lat}&lon=${userLocation.lng}`;
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3500);

      const res = await fetch(url, { signal: controller.signal }).catch(() => null);
      clearTimeout(timeout);

      if (res && res.ok) {
        const data = await res.json();
        if (data && data.features && data.features.length > 0) {
          const mapped: PlaceResult[] = data.features.map((f: any, idx: number) => {
            const props = f.properties || {};
            const coords = f.geometry?.coordinates || [0, 0];
            const lng = coords[0];
            const lat = coords[1];

            const name = props.name || props.street || text;
            const addressParts = [
              props.street ? `${props.housenumber || ""} ${props.street}`.trim() : null,
              props.city || props.district || props.county,
              props.country
            ].filter(Boolean);

            const address = addressParts.join(", ") || props.country || "Location";
            const dist = userLocation ? haversineDistanceM(userLocation, { lat, lng }) : undefined;

            return {
              id: `photon-${idx}-${lat}-${lng}`,
              name,
              address,
              lat,
              lng,
              distanceM: dist
            };
          });

          // Sort by distance if user location is available
          if (userLocation) {
            mapped.sort((a, b) => (a.distanceM || 0) - (b.distanceM || 0));
          }

          setResults(mapped);
          setLoading(false);
          setIsOpen(true);
          return;
        }
      }

      // 2. Fallback to OpenStreetMap Nominatim
      const nomUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(text)}&limit=5`;
      const nomRes = await fetch(nomUrl).catch(() => null);
      if (nomRes && nomRes.ok) {
        const nomData = await nomRes.json();
        if (Array.isArray(nomData) && nomData.length > 0) {
          const mapped: PlaceResult[] = nomData.map((item: any, idx: number) => {
            const lat = parseFloat(item.lat);
            const lng = parseFloat(item.lon);
            const dist = userLocation ? haversineDistanceM(userLocation, { lat, lng }) : undefined;
            return {
              id: `nom-${idx}-${lat}-${lng}`,
              name: item.display_name.split(",")[0] || text,
              address: item.display_name,
              lat,
              lng,
              distanceM: dist
            };
          });
          setResults(mapped);
          setLoading(false);
          setIsOpen(true);
          return;
        }
      }

      setResults([]);
    } catch (e) {
      setResults([]);
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
    }, 300);
  };

  const handleSelect = (place: PlaceResult) => {
    setQuery(place.name);
    setIsOpen(false);
    onSelectPlace({
      lat: place.lat,
      lng: place.lng,
      name: place.name,
      address: place.address
    });
  };

  const handleQuickPreset = (preset: string) => {
    setQuery(preset);
    searchPlaces(preset);
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
          placeholder="Search any building, McDonald's, street..."
          className="bg-transparent flex-1 text-xs text-white placeholder-neutral-500 focus:outline-none min-w-0"
        />

        {loading && (
          <div className="w-3.5 h-3.5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mr-1 shrink-0" />
        )}

        {query && (
          <button
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

      {/* QUICK PRESET CHIPS (shown when input focused or empty) */}
      {!query && (
        <div className="flex gap-1.5 mt-1.5 px-0.5 overflow-x-auto scrollbar-none">
          {["McDonald's", "Jollibee", "Coffee", "7-Eleven"].map((chip) => (
            <button
              key={chip}
              onClick={() => handleQuickPreset(chip)}
              className="text-[10px] px-2.5 py-1 rounded-full bg-neutral-900/80 hover:bg-neutral-800 border border-white/10 text-neutral-300 whitespace-nowrap active:scale-95 transition-all shadow-sm"
            >
              {chip}
            </button>
          ))}
        </div>
      )}

      {/* AUTOCOMPLETE RESULTS DROPDOWN */}
      {isOpen && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1.5 bg-[#1c1c1e]/98 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden divide-y divide-white/5 max-h-[220px] overflow-y-auto z-[500]">
          {results.map((res) => (
            <button
              key={res.id}
              onClick={() => handleSelect(res)}
              className="w-full text-left px-3.5 py-2.5 hover:bg-white/5 active:bg-blue-600/20 flex items-center justify-between gap-2 transition-colors group"
            >
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold text-white truncate group-hover:text-blue-400 transition-colors">
                  {res.name}
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
