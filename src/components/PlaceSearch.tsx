import { useState, useRef, useEffect } from "react";
import { sceneries } from "@/lib/sceneries";
import { shops } from "@/lib/shops";

interface PlaceSearchProps {
  userPosition: { lat: number, lng: number } | null;
  destinationName: string | null;
  onSelect: (place: { name: string, lat: number, lng: number }) => void;
}

interface SearchResult {
  name: string;
  address: string;
  lat: number;
  lng: number;
  tag?: "Sceneries" | "Shop" | "Online";
}

const SearchIcon = () => (
  <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const ClearIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 18L18 6M6 6l12 12" />
  </svg>
);

export default function PlaceSearch({ userPosition, destinationName, onSelect }: PlaceSearchProps) {
  const [text, setText] = useState("");
  const [focused, setFocused] = useState(false);
  const [onlineResults, setOnlineResults] = useState<SearchResult[]>([]);
  const [isSearchingOnline, setIsSearchingOnline] = useState(false);
  const [onlineError, setOnlineError] = useState<string | null>(null);
  
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastSearchTimeRef = useRef<number>(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!focused) {
      if (destinationName) {
        setText(destinationName);
      } else {
        setText("");
      }
    }
  }, [destinationName, focused]);

  const handleClear = () => {
    setText("");
    setOnlineResults([]);
    setOnlineError(null);
    inputRef.current?.focus();
  };

  const handleSelect = (res: SearchResult) => {
    onSelect({ name: res.name, lat: res.lat, lng: res.lng });
    setFocused(false);
    setText(res.name);
    if (inputRef.current) inputRef.current.blur();
  };

  // Local filtering
  const lowerText = text.toLowerCase();
  const localResults: SearchResult[] = [];
  
  if (lowerText.length > 0) {
    for (const s of sceneries) {
      if (s.name.toLowerCase().includes(lowerText) || s.address.toLowerCase().includes(lowerText)) {
        localResults.push({ name: s.name, address: s.address, lat: s.lat, lng: s.lng, tag: "Sceneries" });
      }
    }
    for (const s of shops) {
      if (s.name.toLowerCase().includes(lowerText) || s.address.toLowerCase().includes(lowerText)) {
        localResults.push({ name: s.name, address: s.address, lat: s.lat, lng: s.lng, tag: "Shop" });
      }
    }
  }
  
  // Truncate to 5 total local places
  const topLocal = localResults.slice(0, 5);
  
  // Deduplicate online results
  const combined: SearchResult[] = [...topLocal];
  for (const o of onlineResults) {
    const isDup = combined.some(c => 
      c.name === o.name && 
      Math.abs(c.lat - o.lat) < 0.0001 && 
      Math.abs(c.lng - o.lng) < 0.0001
    );
    if (!isDup) {
      combined.push(o);
    }
  }

  const triggerOnlineSearch = async () => {
    if (text.length < 3) return;
    
    if (!navigator.onLine) {
      setOnlineError("You're offline. Showing saved places only.");
      return;
    }

    const now = Date.now();
    if (now - lastSearchTimeRef.current < 1000) return;
    lastSearchTimeRef.current = now;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const ac = new AbortController();
    abortControllerRef.current = ac;

    setOnlineError(null);
    setIsSearchingOnline(true);
    setOnlineResults([]);

    try {
      let url = `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(text)}&countrycodes=ph&limit=6&accept-language=en&bounded=0`;
      if (userPosition) {
        const { lat, lng } = userPosition;
        url += `&viewbox=${lng - 0.3},${lat + 0.3},${lng + 0.3},${lat - 0.3}`;
      }

      const timeoutId = setTimeout(() => ac.abort(), 8000);
      const response = await fetch(url, { signal: ac.signal });
      clearTimeout(timeoutId);

      if (!response.ok) throw new Error("Bad response");
      
      const data = await response.json();
      
      const mapped = data.map((item: any) => {
        const parts = item.display_name.split(",");
        const name = parts[0].trim();
        const address = parts.slice(1).join(",").trim();
        return {
          name,
          address,
          lat: parseFloat(item.lat),
          lng: parseFloat(item.lon),
          tag: "Online" as const
        };
      });
      setOnlineResults(mapped);
    } catch (err: any) {
      if (err.name !== "AbortError") {
        setOnlineError("Couldn't search online. Check your connection.");
      }
    } finally {
      setIsSearchingOnline(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      triggerOnlineSearch();
    }
  };

  const showDropdown = focused && text.length > 0;

  return (
    <div 
      className="absolute top-2 left-2 right-2 mr-[56px] z-[1100]"
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="relative w-full h-[44px] bg-zinc-900/92 backdrop-blur-md rounded-full border border-zinc-700 flex items-center px-3 shadow-lg">
        <SearchIcon />
        <input
          ref={inputRef}
          type="text"
          placeholder="Search a place"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            // Delay hide so clicks on dropdown can process
            setTimeout(() => setFocused(false), 200);
          }}
          onKeyDown={handleKeyDown}
          className="flex-1 bg-transparent text-white placeholder-gray-400 outline-none px-2 text-[16px]"
        />
        {text.length > 0 && (
          <button 
            onClick={handleClear}
            className="w-11 h-11 flex items-center justify-center text-gray-400 active:text-white"
          >
            <ClearIcon />
          </button>
        )}
      </div>

      {showDropdown && (
        <div className="absolute top-[48px] left-0 right-0 max-h-[200px] overflow-y-auto bg-zinc-900/95 backdrop-blur-md border border-zinc-700 rounded-[16px] shadow-xl py-1 flex flex-col no-scrollbar">
          {combined.map((res, i) => (
            <button
              key={`${res.name}-${res.lat}-${res.lng}-${i}`}
              onPointerDown={(e) => {
                e.preventDefault();
                handleSelect(res);
              }}
              className="w-full text-left px-4 py-2 min-h-[48px] border-b border-zinc-800 last:border-0 active:bg-zinc-800 flex flex-col justify-center"
            >
              <div className="flex justify-between items-baseline gap-2">
                <span className="text-white font-bold text-[14px] truncate">{res.name}</span>
                {res.tag && (
                  <span className="text-[10px] text-gray-400 bg-black/40 px-1.5 py-0.5 rounded truncate flex-shrink-0">
                    {res.tag}
                  </span>
                )}
              </div>
              <span className="text-gray-400 text-[12px] truncate block w-full">{res.address}</span>
            </button>
          ))}

          {isSearchingOnline && (
            <div className="px-4 py-3 min-h-[48px] flex items-center">
              <span className="text-gray-400 text-[13px]">Searching...</span>
            </div>
          )}

          {onlineError && (
            <div className="px-4 py-3 min-h-[48px] flex items-center">
              <span className="text-gray-500 text-[13px]">{onlineError}</span>
            </div>
          )}

          {!isSearchingOnline && !onlineError && text.length >= 3 && combined.length < 10 && (
            <button
              onPointerDown={(e) => {
                e.preventDefault();
                triggerOnlineSearch();
              }}
              className="w-full text-left px-4 py-3 min-h-[48px] text-[13px] text-blue-400 active:bg-zinc-800 flex items-center border-t border-zinc-800"
            >
              Search online for "{text}"
            </button>
          )}

          {!isSearchingOnline && combined.length === 0 && !onlineError && (
            <div className="px-4 py-3 min-h-[48px] flex items-center">
              <span className="text-gray-500 text-[13px]">No places found</span>
            </div>
          )}
        </div>
      )}
      
      <style dangerouslySetInnerHTML={{__html: `
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}} />
    </div>
  );
}

