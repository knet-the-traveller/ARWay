"use client";

import dynamic from "next/dynamic";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useEffect, useMemo, useState, useRef } from "react";
import NavPanel from "@/components/NavPanel";
import PlaceSearch from "@/components/PlaceSearch";
import SplitHandle from "@/components/SplitHandle";
import { fetchWalkingRoute, RouteData } from "@/lib/route";
import { useHeading } from "@/hooks/useHeading";
import { LatLng, remainingDistanceM as getRemainingDistance, snapToRoute, haversineDistanceM, bearingDeg, offsetLatLng } from "@/lib/geo";

const CameraView = dynamic(() => import("@/components/CameraView"), {
  ssr: false,
});

const LandmarkScanner = dynamic(() => import("@/components/LandmarkScanner"), {
  ssr: false,
});

const ArOverlay = dynamic(() => import("@/components/ArOverlay"), {
  ssr: false,
});

const MapView = dynamic(() => import("@/components/MapView"), {
  ssr: false,
});

const DEMO_FALLBACK_COORDS = { lat: 14.5917, lng: 120.9734 };
const MIN_RATIO = 0.30;
const MAX_RATIO = 0.70;

function MapsContent() {
  const router = useRouter();
  const { position, livePosition, accuracy, error, isDemoMode, toggleDemoMode } = useGeolocation();
  const searchParams = useSearchParams();
  const [videoEl, setVideoEl] = useState<HTMLVideoElement | null>(null);
  const [cameraActive, setCameraActive] = useState(true);

  const [routeData, setRouteData] = useState<RouteData | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState(false);

  const [arActive, setArActive] = useState(false);
  const { heading, pitch, requestPermission, calibrationOffset, setCalibrationOffset } = useHeading();
  
  const [realign, setRealign] = useState(true);
  const [simulatedWalk, setSimulatedWalk] = useState(false);
  const [simulatedDist, setSimulatedDist] = useState(0);
  const [holdingWalk, setHoldingWalk] = useState(false);

  // Split layout state
  const [cameraRatio, setCameraRatio] = useState(0.55);
  const splitContainerRef = useRef<HTMLDivElement>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [compactNav, setCompactNav] = useState(false);
  const lastResizeEventTimeRef = useRef<number>(0);

  const routeOffPathTimer = useRef<any>(null);

  const queryDestination = useMemo(() => {
    const lat = searchParams.get("lat");
    const lng = searchParams.get("lng");
    const name = searchParams.get("name");
    if (lat && lng && name) {
      return { lat: parseFloat(lat), lng: parseFloat(lng), name };
    }
    return null;
  }, [searchParams]);

  const [customDestination, setCustomDestination] = useState<{ lat: number, lng: number, name: string, address?: string } | null>(null);

  const destination = customDestination || queryDestination;

  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        const storedRealign = localStorage.getItem("arway_realign");
        if (storedRealign !== null) {
          setRealign(storedRealign === "1");
        }
        
        const storedRatio = localStorage.getItem("arway_split_ratio");
        if (storedRatio !== null) {
          const r = parseFloat(storedRatio);
          if (r >= MIN_RATIO && r <= MAX_RATIO) {
            setCameraRatio(r);
          }
        }
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (!mapContainerRef.current) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setCompactNav(entry.contentRect.height < 300);
      }
    });
    ro.observe(mapContainerRef.current);
    return () => ro.disconnect();
  }, []);

  const triggerMapResize = (throttle: boolean) => {
    const now = Date.now();
    if (!throttle || now - lastResizeEventTimeRef.current > 100) {
      window.dispatchEvent(new Event("resize"));
      lastResizeEventTimeRef.current = now;
    }
  };

  const handleRatioChange = (r: number) => {
    setCameraRatio(r);
    triggerMapResize(true);
  };

  const handleRatioCommit = (r: number) => {
    setCameraRatio(r);
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem("arway_split_ratio", r.toFixed(2));
      }
    } catch {}
    triggerMapResize(false);
  };

  const handleRatioReset = () => {
    handleRatioCommit(0.55);
  };

  const handleToggleRealign = () => {
    setRealign(prev => {
      const next = !prev;
      try {
        if (typeof window !== "undefined") {
          localStorage.setItem("arway_realign", next ? "1" : "0");
        }
      } catch {}
      return next;
    });
  };

  const effectivePosition = useMemo(() => {
    if (simulatedWalk && routeData && routeData.coords.length > 0) {
      let rem = simulatedDist;
      let pos = routeData.coords[0];
      for (let i = 0; i < routeData.coords.length - 1; i++) {
        const d = haversineDistanceM(routeData.coords[i], routeData.coords[i + 1]);
        if (rem > d) {
          rem -= d;
          pos = routeData.coords[i + 1];
        } else {
          pos = offsetLatLng(routeData.coords[i], bearingDeg(routeData.coords[i], routeData.coords[i + 1]), rem);
          break;
        }
      }
      return pos;
    }
    return position || (isDemoMode ? DEMO_FALLBACK_COORDS : livePosition) || DEMO_FALLBACK_COORDS;
  }, [position, isDemoMode, livePosition, simulatedWalk, simulatedDist, routeData]);

  const remainingDist = useMemo(() => {
    if (!destination) return 0;
    if (routeData && routeData.coords.length > 0 && effectivePosition) {
      const snapped = snapToRoute(routeData.coords, effectivePosition);
      return getRemainingDistance(routeData.coords, snapped) + haversineDistanceM(effectivePosition, snapped.snappedPoint);
    }
    return haversineDistanceM(effectivePosition || DEMO_FALLBACK_COORDS, destination);
  }, [routeData, effectivePosition, destination]);

  useEffect(() => {
    let active = true;
    if (!destination) {
      setRouteData(null);
      setRouteLoading(false);
      setRouteError(false);
      return;
    }

    const fromPos = position || (isDemoMode ? DEMO_FALLBACK_COORDS : livePosition) || DEMO_FALLBACK_COORDS;

    const getRoute = async () => {
      setRouteLoading(true);
      setRouteError(false);
      try {
        const data = await fetchWalkingRoute(fromPos, destination);
        if (active) {
          setRouteData(data);
          setSimulatedDist(0);
        }
      } catch (e) {
        if (active) setRouteError(true);
      } finally {
        if (active) setRouteLoading(false);
      }
    };

    getRoute();

    return () => { active = false; };
  }, [destination?.lat, destination?.lng, destination?.name, position?.lat, position?.lng, isDemoMode, livePosition?.lat, livePosition?.lng]);

  useEffect(() => {
    if (!simulatedWalk && routeData && position && routeData.source === "network" && destination) {
      const snapped = snapToRoute(routeData.coords, position);
      if (snapped.distanceFromRouteM > 30) {
        if (!routeOffPathTimer.current) {
          routeOffPathTimer.current = setTimeout(() => {
            fetchWalkingRoute(position, destination).then(data => setRouteData(data)).catch(() => {});
            routeOffPathTimer.current = null;
          }, 5000);
        }
      } else {
        if (routeOffPathTimer.current) {
          clearTimeout(routeOffPathTimer.current);
          routeOffPathTimer.current = null;
        }
      }
    }
    return () => {
      if (routeOffPathTimer.current) clearTimeout(routeOffPathTimer.current);
    };
  }, [position, routeData, simulatedWalk, destination]);

  useEffect(() => {
    if (simulatedWalk && holdingWalk) {
      const interval = setInterval(() => {
        setSimulatedDist(d => d + 1.4 / 10);
      }, 100);
      return () => clearInterval(interval);
    }
  }, [simulatedWalk, holdingWalk]);

  const handleStartAr = async () => {
    await requestPermission();
    setArActive(true);
    if (!cameraActive) {
      setCameraActive(true);
    }
    if (cameraRatio < 0.60) {
      setCameraRatio(0.65);
    }
  };

  const handleRecenter = () => {
    if (routeData && effectivePosition && heading !== null) {
      const snapped = snapToRoute(routeData.coords, effectivePosition);
      if (snapped.index < routeData.coords.length - 1) {
        const routeBrng = bearingDeg(snapped.snappedPoint, routeData.coords[snapped.index + 1]);
        const uncalibratedHeading = (heading - calibrationOffset + 360) % 360;
        setCalibrationOffset((routeBrng - uncalibratedHeading + 360) % 360);
      }
    }
  };

  const handleClear = () => {
    setCustomDestination(null);
    setRouteData(null);
    setArActive(false);
    if (queryDestination) {
      router.replace('/maps');
    }
  };

  const handleMapClick = (lat: number, lng: number) => {
    setCustomDestination({ lat, lng, name: "Dropped pin" });
  };

  const handlePlaceSelect = (place: { name: string, lat: number, lng: number }) => {
    setCustomDestination(place);
  };

  return (
    <main className="flex flex-col w-full flex-1 min-h-0 bg-black text-white overflow-hidden relative">
      {/* SIMULATED BADGE */}
      {simulatedWalk && (
        <div className="absolute top-12 left-0 w-full z-50 pointer-events-none flex justify-center">
          <div className="bg-red-600 text-white text-xs px-2 py-0.5 font-bold tracking-widest rounded shadow-md animate-pulse">SIMULATED</div>
        </div>
      )}

      <div ref={splitContainerRef} className="flex-1 w-full flex flex-col min-h-0 relative">
        {/* TOP: CAMERA */}
        <div className="w-full relative min-h-0 overflow-hidden" style={{ flexBasis: `${cameraRatio * 100}%` }}>
          <CameraView 
            onVideoReady={setVideoEl} 
            isActive={cameraActive}
            onToggleActive={() => setCameraActive(prev => !prev)}
          />
          {arActive && cameraActive && (
            <ArOverlay 
              active={arActive && cameraActive}
              accuracy={simulatedWalk ? 5 : accuracy}
              destination={destination}
              heading={heading}
              pitch={pitch}
              position={effectivePosition}
              route={routeData?.coords || (destination && effectivePosition ? [effectivePosition, destination] : null)}
              realign={realign}
            />
          )}
          <LandmarkScanner 
            video={videoEl} 
            arActive={arActive} 
            cameraActive={cameraActive}
            onToggleCamera={() => setCameraActive(prev => !prev)}
          />
        </div>

        {/* DRAGGABLE DIVIDER */}
        <SplitHandle 
          ratio={cameraRatio} 
          min={MIN_RATIO} 
          max={MAX_RATIO} 
          onChange={handleRatioChange}
          onCommit={handleRatioCommit}
          onReset={handleRatioReset}
          containerRef={splitContainerRef}
        />

        {/* BOTTOM: MAP */}
        <div ref={mapContainerRef} className="w-full relative min-h-0 overflow-hidden" style={{ flexGrow: 1 }}>
          {/* FLOATING MAP CONTROLS: SEARCH BAR & STATUS PILLS */}
          <div className="absolute top-2.5 left-2.5 right-2.5 z-[400] flex flex-col gap-1.5 pointer-events-none">
            {/* PLACE SEARCH INPUT */}
            <div className="pointer-events-auto">
              <PlaceSearch 
                userPosition={effectivePosition} 
                destinationName={destination?.name || null} 
                onSelect={handlePlaceSelect} 
              />
            </div>

            {/* STATUS PILLS ROW */}
            <div className="flex items-center justify-between gap-2 pointer-events-auto">
              <div 
                className="bg-black/85 backdrop-blur-md px-2.5 py-1 rounded-full text-[11px] font-medium shadow-md border border-white/10 flex items-center gap-1.5 select-none"
                title={isDemoMode ? "Demo Mode: Intramuros heritage zone coordinates active" : error ? `GPS error: ${error}` : accuracy ? `GPS Accuracy: ±${Math.round(accuracy)}m` : "Acquiring GPS fix..."}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${isDemoMode ? "bg-amber-400" : error ? "bg-rose-400" : accuracy ? "bg-emerald-400" : "bg-neutral-400 animate-pulse"}`} />
                <span className="text-neutral-300">
                  {isDemoMode ? "Demo GPS (Intramuros)" : error ? "No GPS (Tap map)" : accuracy ? `GPS ±${Math.round(accuracy)}m` : "Acquiring GPS..."}
                </span>
              </div>

              <button
                type="button"
                onClick={toggleDemoMode}
                className={`px-2.5 py-1 rounded-full text-[11px] font-medium shadow-md border backdrop-blur-md transition-all active:scale-95 flex items-center gap-1 select-none ${
                  isDemoMode
                    ? "bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30"
                    : "bg-black/85 text-neutral-300 border-white/10 hover:text-white hover:bg-neutral-800"
                }`}
                title="Toggle between Live GPS and Intramuros Demo Tour"
              >
                <span>{isDemoMode ? "📍 Real GPS" : "🎯 Demo Tour"}</span>
              </button>
            </div>
          </div>

          <MapView 
            position={effectivePosition} 
            destination={destination} 
            route={routeData?.coords.map(c => [c.lat, c.lng])} 
            onMapClick={handleMapClick}
            heading={heading}
          />
          <NavPanel 
            destination={destination}
            routeData={routeData}
            routeLoading={routeLoading}
            routeError={routeError}
            arActive={arActive}
            onStartAr={handleStartAr}
            onStopAr={() => setArActive(false)}
            onRecenter={handleRecenter}
            onClear={handleClear}
            remainingDistanceM={remainingDist}
            realign={realign}
            onToggleRealign={handleToggleRealign}
            simulatedWalk={simulatedWalk}
            onToggleSimulate={() => setSimulatedWalk(!simulatedWalk)}
            onHoldWalk={setHoldingWalk}
            compact={compactNav}
            position={effectivePosition}
          />
        </div>
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
