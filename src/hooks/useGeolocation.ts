import { useState, useEffect } from "react";

export const DEMO_FALLBACK_COORDS = {
  lat: 14.5917,
  lng: 120.9734,
};

export function useGeolocation() {
  const [livePosition, setLivePosition] = useState<{ lat: number; lng: number } | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);

  // Initialize demo mode preference
  useEffect(() => {
    if (typeof window !== "undefined") {
      const searchParams = new URLSearchParams(window.location.search);
      const urlDemo = searchParams.get("demo") === "true";
      const savedDemo = localStorage.getItem("arway_demo_mode") === "true";
      if (urlDemo || savedDemo) {
        setIsDemoMode(true);
      }
    }
  }, []);

  const toggleDemoMode = () => {
    setIsDemoMode((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") {
        localStorage.setItem("arway_demo_mode", next ? "true" : "false");
      }
      return next;
    });
  };

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setLivePosition({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
        setAccuracy(pos.coords.accuracy);
        setError(null);
      },
      (err) => {
        setError(err.message);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 15000,
      }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, []);

  const position = isDemoMode ? DEMO_FALLBACK_COORDS : livePosition;

  return { 
    position, 
    livePosition,
    accuracy: isDemoMode ? 5 : accuracy, 
    error,
    isDemoMode,
    toggleDemoMode,
    setIsDemoMode
  };
}
