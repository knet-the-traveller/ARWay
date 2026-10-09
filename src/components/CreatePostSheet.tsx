import { useState, useRef, useEffect } from "react";
import { addPost } from "@/lib/posts";
import { resizeImage } from "@/lib/image";
import { CloseIcon, PlusIcon, PinIcon } from "./icons";

interface CreatePostSheetProps {
  onClose: () => void;
  onSuccess: () => void;
}

interface LocationCoord {
  lat: number;
  lng: number;
}

export default function CreatePostSheet({ onClose, onSuccess }: CreatePostSheetProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [locationText, setLocationText] = useState("");
  const [suggestionCoords, setSuggestionCoords] = useState<LocationCoord | null>(null);
  const [suggestions, setSuggestions] = useState<Array<{ displayName: string, shortName: string, lat: number, lng: number }>>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const [isGpsOn, setIsGpsOn] = useState(false);
  const [gpsCoords, setGpsCoords] = useState<LocationCoord | null>(null);
  const [gpsStatus, setGpsStatus] = useState<string | null>(null);
  const [isGpsError, setIsGpsError] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      setPreview(URL.createObjectURL(f));
    }
  };

  useEffect(() => {
    const text = locationText.trim();
    if (text.length < 3 || !showSuggestions) {
      setSuggestions([]);
      return;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(async () => {
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(text)}&countrycodes=ph&limit=5&accept-language=en`, { signal: controller.signal });
        if (!res.ok) return;
        const data = await res.json();
        setSuggestions(data.map((item: any) => {
          const parts = item.display_name.split(",");
          return {
            displayName: item.display_name,
            shortName: parts[0].trim(),
            lat: parseFloat(item.lat),
            lng: parseFloat(item.lon)
          };
        }));
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          // fail silently
        }
      }
    }, 1000);

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [locationText, showSuggestions]);

  const handleLocationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocationText(e.target.value);
    setSuggestionCoords(null);
    setShowSuggestions(true);
  };

  const handlePickSuggestion = (sugg: any) => {
    setLocationText(sugg.shortName);
    setSuggestionCoords({ lat: sugg.lat, lng: sugg.lng });
    setShowSuggestions(false);
  };

  const toggleGps = () => {
    if (isGpsOn) {
      setIsGpsOn(false);
      setGpsCoords(null);
      setGpsStatus(null);
      setIsGpsError(false);
      return;
    }

    setIsGpsOn(true);
    setGpsStatus("Getting your location...");
    setIsGpsError(false);

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const accuracy = Math.round(pos.coords.accuracy);
        
        setGpsCoords({ lat, lng });
        setGpsStatus(`Location attached (about ±${accuracy} m)`);

        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&accept-language=en`);
          if (res.ok) {
            const data = await res.json();
            const placeName = data.name || (data.address ? `${data.address.road || ''} ${data.address.suburb || data.address.city || ''}`.trim() : "");
            
            setLocationText(prev => {
              if (!prev.trim() && placeName) return placeName;
              if (!prev.trim() && !placeName) return "My current location";
              return prev;
            });
          } else {
            setLocationText(prev => !prev.trim() ? "My current location" : prev);
          }
        } catch (err) {
          setLocationText(prev => !prev.trim() ? "My current location" : prev);
        }
      }, (err) => {
        setIsGpsOn(false);
        setGpsCoords(null);
        setGpsStatus("Couldn't get your location. Check your browser permissions.");
        setIsGpsError(true);
      }, { enableHighAccuracy: true, timeout: 10000 });
    } else {
      setIsGpsOn(false);
      setGpsStatus("Couldn't get your location. Check your browser permissions.");
      setIsGpsError(true);
    }
  };

  const finalName = locationText.trim();
  const hasCoords = isGpsOn ? !!gpsCoords : !!suggestionCoords;

  const handleSubmit = async () => {
    if (!file || !finalName) return;
    setLoading(true);
    setError(null);
    try {
      const dataUrl = await resizeImage(file, 720, 0.7);
      const coords = isGpsOn && gpsCoords ? gpsCoords : suggestionCoords;
      
      await addPost({
        id: "post-" + Date.now(),
        username: "you",
        caption,
        image: dataUrl,
        placeName: finalName,
        lat: coords?.lat,
        lng: coords?.lng,
        createdAt: Date.now(),
        likes: 0,
        likedByMe: false,
      });
      onSuccess();
    } catch (err: any) {
      setError(err.message || "Failed to post");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div 
        className="fixed inset-0 bg-black/60 z-[100] backdrop-blur-sm" 
        onClick={onClose} 
      />
      <div className="fixed bottom-0 left-0 right-0 max-h-[85vh] h-full bg-[#1c1c1e] z-[101] rounded-t-2xl flex flex-col sm:w-[375px] sm:left-1/2 sm:-translate-x-1/2">
        <div className="flex items-center justify-between p-4 border-b border-gray-800 shrink-0">
          <h2 className="text-white font-semibold text-lg">New Post</h2>
          <button onClick={onClose} className="p-1 active:opacity-70 text-white">
            <CloseIcon className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-6">
          {error && (
            <div className="p-3 bg-red-500/20 text-red-400 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div 
            className="w-full aspect-[4/5] bg-neutral-900 border-2 border-dashed border-gray-700 rounded-xl overflow-hidden flex flex-col items-center justify-center relative active:bg-neutral-800"
            onClick={() => fileInputRef.current?.click()}
          >
            {preview ? (
              <img src={preview} alt="Preview" className="w-full h-full object-cover" />
            ) : (
              <>
                <PlusIcon className="w-10 h-10 text-gray-500 mb-2" />
                <span className="text-gray-400 font-medium">Tap to add photo</span>
              </>
            )}
            <input 
              type="file" 
              accept="image/*" 
              className="hidden" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
            />
          </div>

          <div className="flex flex-col gap-2 relative">
            <label className="text-white font-semibold text-sm">Location</label>
            <input 
              type="text"
              placeholder="Where is this? e.g. Luneta Park"
              value={locationText}
              onChange={handleLocationChange}
              maxLength={80}
              className="w-full bg-neutral-900 border border-gray-700 rounded-lg p-3 text-white text-[16px] focus:outline-none focus:border-blue-500"
            />
            {suggestions.length > 0 && showSuggestions && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-[#262626] border border-gray-700 rounded-lg z-10 overflow-hidden shadow-lg">
                {suggestions.map((sugg, i) => (
                  <div 
                    key={i} 
                    className="flex items-center min-h-[44px] px-3 py-2 border-b border-gray-700 last:border-b-0 active:bg-gray-700 cursor-pointer"
                    onClick={() => handlePickSuggestion(sugg)}
                  >
                    <span className="text-[14px] text-white line-clamp-2">{sugg.displayName}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-col mt-2">
              <div className="flex items-center justify-between min-h-[44px]">
                <div className="flex items-center">
                  <PinIcon className="w-5 h-5 text-gray-400 mr-2" />
                  <span className="text-[15px] text-white font-medium">Use my current location</span>
                </div>
                <button 
                  onClick={toggleGps}
                  className={`w-12 h-7 rounded-full relative transition-colors ${isGpsOn ? 'bg-[#3b82f6]' : 'bg-gray-600'}`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full absolute top-1 transition-transform ${isGpsOn ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
              {gpsStatus && (
                <span className={`text-[12px] ml-7 ${isGpsError ? 'text-red-400' : 'text-gray-400'} ${gpsStatus.includes('attached') ? 'text-green-400' : ''}`}>
                  {gpsStatus}
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2 pb-6">
            <div className="flex items-center justify-between">
              <label className="text-white font-semibold text-sm">Caption</label>
              <span className="text-gray-500 text-xs">{caption.length} / 150</span>
            </div>
            <textarea 
              value={caption}
              onChange={e => setCaption(e.target.value.slice(0, 150))}
              className="w-full bg-neutral-900 border border-gray-700 rounded-lg p-3 text-white text-[16px] focus:outline-none focus:border-blue-500 resize-none h-24"
              placeholder="Write a caption..."
            />
          </div>
        </div>

        <div className="p-4 border-t border-gray-800 bg-[#1c1c1e] shrink-0" style={{ paddingBottom: "calc(16px + env(safe-area-inset-bottom))" }}>
          {!hasCoords && finalName && (
            <p className="text-gray-400 text-[12px] mb-2 text-center">
              Tip: turn on your location or pick a suggestion so others can navigate here.
            </p>
          )}
          <button 
            onClick={handleSubmit}
            disabled={!file || !finalName || loading}
            className="w-full bg-[#3b82f6] text-white rounded-xl h-[50px] font-semibold text-lg disabled:opacity-50 active:bg-blue-600 transition-colors"
          >
            {loading ? "Posting..." : "Post"}
          </button>
        </div>
      </div>
    </>
  );
}
