"use client";

import { useState, useEffect } from "react";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useOnlineStatus } from "@/lib/offline";

export default function GpsStatusPill({ className = "" }: { className?: string }) {
  const { accuracy, error, isDemoMode } = useGeolocation();
  const isOnline = useOnlineStatus();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const dotColor = !mounted
    ? "bg-neutral-400"
    : isDemoMode
    ? "bg-amber-400"
    : !isOnline
    ? accuracy
      ? "bg-emerald-400"
      : "bg-sky-400"
    : error
    ? "bg-rose-400"
    : accuracy
    ? "bg-emerald-400"
    : "bg-neutral-400 animate-pulse";

  const label = !mounted
    ? "Acquiring GPS..."
    : isDemoMode
    ? "Demo GPS (Intramuros)"
    : !isOnline
    ? accuracy
      ? `Offline GPS ±${Math.round(accuracy)}m`
      : "Offline (Airplane)"
    : error
    ? "No GPS"
    : accuracy
    ? `GPS ±${Math.round(accuracy)}m`
    : "Acquiring GPS...";

  return (
    <div
      suppressHydrationWarning
      className={`bg-black/85 backdrop-blur-md px-2.5 py-1 rounded-full text-[11px] font-medium shadow-md border border-white/10 flex items-center gap-1.5 select-none shrink-0 ${className}`}
      title={isDemoMode ? "Demo Mode: Intramuros heritage zone coordinates active" : !isOnline ? "Physical Offline Mode" : error ? `GPS error: ${error}` : accuracy ? `GPS Accuracy: ±${Math.round(accuracy)}m` : "Acquiring GPS fix..."}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
      <span className="text-neutral-300 leading-none" suppressHydrationWarning>
        {label}
      </span>
    </div>
  );
}
