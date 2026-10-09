import { useState, useEffect, useCallback } from "react";

export function useGeolocation() {
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("arway_last_position");
        if (saved) return JSON.parse(saved);
      } catch (e) {}
    }
    return null;
  });
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isManual, setIsManual] = useState<boolean>(false);

  const setManualPosition = useCallback((coords: { lat: number; lng: number }) => {
    setPosition(coords);
    setIsManual(true);
    setAccuracy(5);
    try {
      localStorage.setItem("arway_last_position", JSON.stringify(coords));
    } catch (e) {}
  }, []);

  useEffect(() => {
    // Check for explicit ?demo=true query override for synthetic testing
    const searchParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
    const forceDemo = searchParams?.get("demo") === "true";

    if (forceDemo) {
      const demoCoords = { lat: 14.5917, lng: 120.9734 };
      setPosition(demoCoords);
      setAccuracy(5);
      setIsManual(true);
      return;
    }

    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const coords = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };
        setPosition(coords);
        setAccuracy(pos.coords.accuracy);
        setError(null);
        setIsManual(false);

        try {
          localStorage.setItem("arway_last_position", JSON.stringify(coords));
        } catch (e) {}
      },
      (err) => {
        setError(err.message);
        // Do NOT overwrite existing position with hardcoded demo coords.
        // If position is null, it remains null until user taps map or grants GPS.
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

  return { position, accuracy, error, isManual, setManualPosition };
}

