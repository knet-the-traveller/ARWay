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
import { LatLng, remainingDistanceM as getRemainingDistance, snapToRoute, haversineDistanceM, bearingDeg, offsetLatLng } from "@/lib/geo";

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
  
  const [simulatedWalk, setSimulatedWalk] = useState(false);
  const [simulatedDist, setSimulatedDist] = useState(0);
  const [holdingWalk, setHoldingWalk] = useState(false);

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

  const effectivePosition = useMemo(() => {
    if (simulatedWalk && routeData && routeData.coords.length > 0) {
      // Simulate position along route
      let rem = simulatedDist;
      let pos = routeData.coords[0];
      for (let i = 0; i < routeData.coords.length - 1; i++) {
        const d = haversineDistanceM(routeData.coords[i], routeData.coords[i+1]);
        if (rem > d) {
          rem -= d;
          pos = routeData.coords[i+1];
        } else {
          pos = offsetLatLng(routeData.coords[i], bearingDeg(routeData.coords[i], routeData.coords[i+1]), rem);
          break;
        }
      }
      return pos;
    }
    return position;
  }, [position, simulatedWalk, simulatedDist, routeData]);

  const remainingDist = useMemo(() => {
    if (!routeData || !effectivePosition) return 0;
    const snapped = snapToRoute(routeData.coords, effectivePosition);
    return getRemainingDistance(routeData.coords, snapped) + haversineDistanceM(effectivePosition, snapped.snappedPoint);
  }, [routeData, effectivePosition]);

  useEffect(() => {
    let active = true;
    const getRoute = async () => {
      if (!destination || !position) return;
      setRouteLoading(true);
      setRouteError(false);
      try {
        const data = await fetchWalkingRoute(position, destination);
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
    
    // Only refetch if destination changes significantly
    getRoute();

    return () => { active = false; };
  }, [destination?.lat, destination?.lng]);

  useEffect(() => {
    // Off route check
    if (!simulatedWalk && routeData && position && routeData.source === "network" && destination) {
      const snapped = snapToRoute(routeData.coords, position);
      if (snapped.distanceFromRouteM > 30) {
        if (!routeOffPathTimer.current) {
          routeOffPathTimer.current = setTimeout(() => {
            // Reroute
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
        setSimulatedDist(d => d + 1.4 / 10); // 1.4 m/s at 100ms intervals
      }, 100);
      return () => clearInterval(interval);
    }
  }, [simulatedWalk, holdingWalk]);

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
      
      {simulatedWalk && (
        <div className="absolute top-10 left-0 w-full z-50 pointer-events-none flex justify-center">
          <div className="bg-red-600 text-white text-xs px-2 py-0.5 font-bold tracking-widest rounded shadow-md animate-pulse">SIMULATED</div>
        </div>
      )}

      {/* TOP: CAMERA */}
      <div className="w-full h-[55%] relative">
        <CameraView onVideoReady={setVideoEl} />
        {arActive && (
          <ArOverlay 
            active={arActive}
            accuracy={simulatedWalk ? 5 : accuracy}
            destination={destination}
            heading={heading}
            pitch={pitch}
            position={effectivePosition}
            route={routeData?.coords || null}
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
          simulatedWalk={simulatedWalk}
          onToggleSimulate={() => setSimulatedWalk(!simulatedWalk)}
          onHoldWalk={setHoldingWalk}
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
