import { useState, useEffect } from "react";
import { useGeolocation } from "@/hooks/useGeolocation";
import { sceneries } from "@/lib/sceneries";
import { haversineDistanceM } from "@/lib/geo";

export function useHomeStatus() {
  const { position, error } = useGeolocation();
  const [isOnline, setIsOnline] = useState(true);
  const [offlineReady, setOfflineReady] = useState(false);
  const [locationText, setLocationText] = useState<string | null>("Locating...");

  useEffect(() => {
    setIsOnline(navigator.onLine);
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("arway_offline_ready");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.aiReady && navigator.serviceWorker && navigator.serviceWorker.controller) {
          setOfflineReady(true);
        }
      }
    } catch (e) {}
  }, []);

  useEffect(() => {
    if (error) {
      setLocationText(null);
      return;
    }

    if (!position) {
      const timer = setTimeout(() => {
        // We use functional state update here to only clear it if it hasn't been set by GPS yet
        setLocationText(prev => prev === "Locating..." ? null : prev);
      }, 10000);
      return () => clearTimeout(timer);
    }

    let nearest = sceneries[0];
    let minDist = Infinity;
    for (const place of sceneries) {
      const dist = haversineDistanceM(position, { lat: place.lat, lng: place.lng });
      if (dist < minDist) {
        minDist = dist;
        nearest = place;
      }
    }

    const distKm = minDist / 1000;
    if (distKm <= 1.5) {
      setLocationText(`Near ${nearest.name}`);
    } else if (distKm <= 20) {
      setLocationText(`${distKm.toFixed(1)} km from ${nearest.name}`);
    } else {
      setLocationText("Outside the guided areas");
    }
  }, [position, error]);

  return { isOnline, offlineReady, locationText };
}
