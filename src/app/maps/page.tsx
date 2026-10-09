"use client";

import dynamic from "next/dynamic";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useEffect, useMemo, useState, useRef } from "react";
import NavPanel from "@/components/NavPanel";
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

function MapsContent() {
  const router = useRouter();
  const { position, accuracy, error, isManual, setManualPosition } = useGeolocation();
  const searchParams = useSearchParams();
  const [videoEl, setVideoEl] = useState<HTMLVideoElement | null>(null);

  const [routeData, setRouteData] = useState<RouteData | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState(false);

  const [arActive, setArActive] = useState(false);
  const { heading, pitch, requestPermission, calibrationOffset, setCalibrationOffset } = useHeading();

  const [lastKnownPos, setLastKnownPos] = useState<LatLng | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("arway_last_position");
        if (saved) setLastKnownPos(JSON.parse(saved));
      } catch (e) {}
    }
  }, []);

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

  const [customDestination, setCustomDestination] = useState<{ lat: number, lng: number, name: string } | null>(null);

  const destination = customDestination || queryDestination;

  const effectivePosition: LatLng | null = useMemo(() => {
    return position || lastKnownPos;
  }, [position, lastKnownPos]);

  const remainingDist = useMemo(() => {
    if (!destination || !effectivePosition) return 0;
    if (routeData && routeData.coords.length > 0) {
      const snapped = snapToRoute(routeData.coords, effectivePosition);
      return getRemainingDistance(routeData.coords, snapped) + haversineDistanceM(effectivePosition, snapped.snappedPoint);
    }
    return haversineDistanceM(effectivePosition, destination);
  }, [routeData, effectivePosition, destination]);

  useEffect(() => {
    let active = true;
    if (!destination || !effectivePosition) {
      setRouteData(null);
      setRouteLoading(false);
      setRouteError(false);
      return;
    }

    const getRoute = async () => {
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

    getRoute();

    return () => { active = false; };
  }, [destination?.lat, destination?.lng, destination?.name, effectivePosition?.lat, effectivePosition?.lng]);

  useEffect(() => {
    // Off route check
    if (routeData && effectivePosition && routeData.source === "network" && destination) {
      const snapped = snapToRoute(routeData.coords, effectivePosition);
      if (snapped.distanceFromRouteM > 35) {
        if (!routeOffPathTimer.current) {
          routeOffPathTimer.current = setTimeout(() => {
            fetchWalkingRoute(effectivePosition, destination).then(data => setRouteData(data)).catch(() => { });
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

  const [splitRatio, setSplitRatio] = useState<number>(50); // percentage height of camera (25% to 75%)
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    setIsDragging(true);

    const handlePointerMove = (moveEvent: PointerEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const relativeY = moveEvent.clientY - rect.top;
      const newRatio = (relativeY / rect.height) * 100;
      // Clamp strictly between 25% and 75%
      const clampedRatio = Math.min(75, Math.max(25, newRatio));
      setSplitRatio(clampedRatio);
    };

    const handlePointerUp = () => {
      setIsDragging(false);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.dispatchEvent(new Event("resize"));
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  };

  const handleStartAr = async () => {
    await requestPermission();
    setArActive(true);
    // When activating AR, automatically expand camera if it's currently small
    if (splitRatio < 60) {
      setSplitRatio(70);
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
    if (!effectivePosition) {
      setManualPosition({ lat, lng });
    } else {
      setCustomDestination({ lat, lng, name: "Dropped pin" });
    }
  };

  return (
    <main 
      ref={containerRef}
      className={`flex flex-col w-full flex-1 min-h-0 bg-black text-white overflow-hidden relative ${isDragging ? "select-none" : ""}`}
    >
      {/* TOP: CAMERA (Resizable: 25% to 75%) */}
      <div 
        style={{ height: `${splitRatio}%` }}
        className={`w-full relative ${isDragging ? "" : "transition-[height] duration-200 ease-out"}`}
      >
        <CameraView onVideoReady={setVideoEl} />
        {arActive && (
          <ArOverlay
            active={arActive}
            accuracy={accuracy}
            destination={destination}
            heading={heading}
            pitch={pitch}
            position={effectivePosition}
            route={routeData?.coords || (destination && effectivePosition ? [effectivePosition, destination] : null)}
          />
        )}
        <LandmarkScanner video={videoEl} arActive={arActive} />
      </div>

      {/* DRAGGABLE DIVIDER (Drag up/down: 25% to 75% split) */}
      <div 
        onPointerDown={handlePointerDown}
        className="w-full h-6 -my-3 z-30 cursor-row-resize flex items-center justify-center touch-none select-none group relative"
        title="Drag up or down to resize Camera and Map"
      >
        <div className="w-full h-[1px] bg-neutral-800 group-hover:bg-neutral-600 transition-colors" />
        <div className="absolute w-12 h-1.5 rounded-full bg-neutral-400/80 group-hover:bg-white group-active:bg-blue-400 group-active:scale-110 shadow-md transition-all flex items-center justify-center">
          <div className="w-4 h-0.5 rounded-full bg-white/50" />
        </div>
      </div>

      {/* BOTTOM: MAP (Resizable: 25% to 75%) */}
      <div 
        style={{ height: `${100 - splitRatio}%` }}
        className={`w-full relative ${isDragging ? "" : "transition-[height] duration-200 ease-out"}`}
      >
        {/* GPS STATUS PILL (Floats cleanly over map, non-obtrusive) */}
        <div className="absolute top-2.5 left-2.5 z-[400]">
          <div 
            className="bg-black/75 backdrop-blur-md px-2.5 py-1 rounded-full text-[11px] font-medium shadow-md border border-white/10 flex items-center gap-1.5 pointer-events-auto select-none"
            title={
              isManual
                ? "Manual position set by map tap"
                : error
                ? `GPS: ${error}`
                : accuracy
                ? `GPS Accuracy: ±${Math.round(accuracy)}m`
                : "Acquiring GPS fix..."
            }
          >
            <span 
              className={`w-1.5 h-1.5 rounded-full ${
                isManual
                  ? "bg-blue-400"
                  : error || (!position && !lastKnownPos)
                  ? "bg-amber-400"
                  : accuracy
                  ? "bg-emerald-400"
                  : "bg-neutral-400 animate-pulse"
              }`} 
            />
            <span className="text-neutral-300">
              {isManual
                ? "Custom Pin"
                : accuracy
                ? `GPS ±${Math.round(accuracy)}m`
                : error || (!position && !lastKnownPos)
                ? "GPS unavailable (tap map)"
                : "Locating GPS..."}
            </span>
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
          simulatedWalk={false}
          onToggleSimulate={() => {}}
          onHoldWalk={() => {}}
          position={effectivePosition}
        />
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
