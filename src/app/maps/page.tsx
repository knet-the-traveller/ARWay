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

  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        const stored = localStorage.getItem("arway_realign");
        if (stored !== null) {
          setRealign(stored === "1");
        }
      }
    } catch (e) {}
  }, []);

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
      
      {/* TOP: CAMERA */}
      <div className="w-full h-[55%] relative">
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
      <div className="w-full h-[1px] bg-gray-800 z-10" />

      {/* BOTTOM: MAP */}
      <div className="w-full h-[45%] relative">
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
