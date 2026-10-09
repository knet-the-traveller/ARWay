"use client";

import dynamic from "next/dynamic";
import { useGeolocation } from "@/hooks/useGeolocation";
import CameraView from "@/components/CameraView";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useEffect, useMemo, useState, useRef } from "react";
import LandmarkScanner from "@/components/LandmarkScanner";
import ArOverlay from "@/components/ArOverlay";
import NavPanel from "@/components/NavPanel";
import { fetchWalkingRoute, RouteData } from "@/lib/route";
import { useHeading } from "@/hooks/useHeading";
import { LatLng, remainingDistanceM as getRemainingDistance, snapToRoute, haversineDistanceM, bearingDeg } from "@/lib/geo";

const MapView = dynamic(() => import("@/components/MapView"), {
  ssr: false,
});

import PlaceSearch from "@/components/PlaceSearch";
import SplitHandle from "@/components/SplitHandle";

const MIN_RATIO = 0.30;
const MAX_RATIO = 0.70;

function MapsContent() {
  const router = useRouter();
  const { position, accuracy, error } = useGeolocation();
  const searchParams = useSearchParams();
  const [videoEl, setVideoEl] = useState<HTMLVideoElement | null>(null);

  const [routeData, setRouteData] = useState<RouteData | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState(false);
  
  const [arActive, setArActive] = useState(false);
  const { heading, pitch, requestPermission, calibrationOffset, setCalibrationOffset } = useHeading();
  
  const [realign, setRealign] = useState(true);

  // Split layout state
  const [cameraRatio, setCameraRatio] = useState(0.55);
  const splitContainerRef = useRef<HTMLDivElement>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [compactNav, setCompactNav] = useState(false);
  const lastResizeEventTimeRef = useRef<number>(0);

  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        const storedRealign = localStorage.getItem("arway_realign");
        if (storedRealign !== null) {
          setRealign(storedRealign === "1");
        }
        
        const storedRatio = localStorage.getItem("arway_split_ratio");
        if (storedRatio !== null) {
          let r = parseFloat(storedRatio);
          if (r >= MIN_RATIO && r <= MAX_RATIO) {
            setCameraRatio(r);
          }
        }
      }
    } catch (e) {}
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
        localStorage.setItem("arway_split_ratio", r.toString());
      }
    } catch (e) {}
    triggerMapResize(false);
  };

  const handleRatioReset = () => {
    setCameraRatio(0.55);
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem("arway_split_ratio", "0.55");
      }
    } catch (e) {}
    triggerMapResize(false);
  };

  const handleToggleRealign = () => {
    const next = !realign;
    setRealign(next);
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem("arway_realign", next ? "1" : "0");
      }
    } catch (e) {}
  };

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

  const [customDestination, setCustomDestination] = useState<{lat: number, lng: number, name: string} | null>(null);
  
  const destination = customDestination || queryDestination;

  const effectivePosition = position; // always use real position

  const remainingDist = useMemo(() => {
    if (!routeData || !effectivePosition) return 0;
    const snapped = snapToRoute(routeData.coords, effectivePosition);
    return getRemainingDistance(routeData.coords, snapped) + haversineDistanceM(effectivePosition, snapped.snappedPoint);
  }, [routeData, effectivePosition]);

  useEffect(() => {
    let active = true;
    const getRoute = async () => {
      if (!destination || !effectivePosition) return;
      setRouteLoading(true);
      setRouteError(false);
      try {
        const data = await fetchWalkingRoute(effectivePosition, destination);
        if (active) {
          setRouteData(data);
        }
      } catch (e) {
        if (active) setRouteError(true);
      } finally {
        if (active) setRouteLoading(false);
      }
    };
    
    // Only refetch if destination changes significantly
    getRoute();

    return () => { active = false; };
  }, [destination?.lat, destination?.lng]);

  useEffect(() => {
    // Off route check
    if (routeData && effectivePosition && routeData.source === "network" && destination) {
      const snapped = snapToRoute(routeData.coords, effectivePosition);
      if (snapped.distanceFromRouteM > 30) {
        if (!routeOffPathTimer.current) {
          routeOffPathTimer.current = setTimeout(() => {
            // Reroute
            fetchWalkingRoute(effectivePosition, destination).then(data => setRouteData(data)).catch(() => {});
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
  }, [effectivePosition, routeData, destination]);

  const handleStartAr = async () => {
    await requestPermission();
    setArActive(true);
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
      
      <div ref={splitContainerRef} className="flex-1 w-full flex flex-col min-h-0 relative">
        {/* TOP: CAMERA */}
        <div className="w-full relative min-h-0 overflow-hidden" style={{ flexBasis: `${cameraRatio * 100}%` }}>
          <CameraView onVideoReady={setVideoEl} />
          {arActive && (
            <ArOverlay 
              active={arActive}
              accuracy={accuracy}
              destination={destination}
              heading={heading}
              pitch={pitch}
              position={effectivePosition}
              route={routeData?.coords || null}
              realign={realign}
            />
          )}
          <LandmarkScanner video={videoEl} arActive={arActive} />
        </div>

        {/* DIVIDER */}
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
          <PlaceSearch 
            userPosition={effectivePosition} 
            destinationName={destination?.name || null} 
            onSelect={handlePlaceSelect} 
          />
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
            compact={compactNav}
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
