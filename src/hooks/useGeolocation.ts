import { useState, useEffect } from "react";

// Manila Cathedral / Intramuros Demo Coordinates for indoor hackathon judging
const DEMO_FALLBACK_COORDS = {
  lat: 14.5917,
  lng: 120.9734,
};

export function useGeolocation() {
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let hasLiveFix = false;

    // Check for explicit ?demo=true override
    const searchParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
    const forceDemo = searchParams?.get("demo") === "true";

    if (forceDemo) {
      setPosition(DEMO_FALLBACK_COORDS);
      setAccuracy(5);
      return;
    }

    // Set fallback position after 2 seconds if GPS is offline or locating
    const fallbackTimer = setTimeout(() => {
      if (!hasLiveFix) {
        setPosition((current) => current || DEMO_FALLBACK_COORDS);
        setAccuracy((current) => current || 10);
      }
    }, 2000);

    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      setPosition(DEMO_FALLBACK_COORDS);
      setAccuracy(10);
      return () => clearTimeout(fallbackTimer);
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        hasLiveFix = true;
        setPosition({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
        setAccuracy(pos.coords.accuracy);
        setError(null);
      },
      (err) => {
        setError(err.message);
        // On error (e.g. offline PC without GPS), ensure fallback is active
        setPosition((current) => current || DEMO_FALLBACK_COORDS);
        setAccuracy(10);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 10000,
      }
    );

    return () => {
      clearTimeout(fallbackTimer);
      navigator.geolocation.clearWatch(watchId);
    };
  }, []);

  return { position, accuracy, error };
}
