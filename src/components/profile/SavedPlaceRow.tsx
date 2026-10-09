import { useState } from "react";
import Link from "next/link";
import { getDistance } from "@/lib/distance";

interface SavedPlaceRowProps {
  name: string;
  category: string;
  image?: string;
  lat: number;
  lng: number;
  userLat?: number;
  userLng?: number;
}

function formatDistanceKm(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}

export function SavedPlaceRow({ name, category, image, lat, lng, userLat, userLng }: SavedPlaceRowProps) {
  const [imgError, setImgError] = useState(false);
  const navigateUrl = `/maps?lat=${lat}&lng=${lng}&name=${encodeURIComponent(name)}`;
  
  let distanceText = "";
  if (userLat !== undefined && userLng !== undefined) {
    distanceText = formatDistanceKm(getDistance(userLat, userLng, lat, lng));
  } else {
    distanceText = formatDistanceKm(getDistance(14.5896, 120.9747, lat, lng));
  }

  return (
    <Link 
      href={navigateUrl}
      className="aw-card rounded-2xl p-3 flex flex-row items-center gap-[14px] active:scale-[0.98] transition-transform w-full"
    >
      <div className="w-[72px] h-[72px] rounded-xl shrink-0 overflow-hidden relative">
        {!image || imgError ? (
          <div className="w-full h-full" style={{ background: "linear-gradient(135deg, #3b5a8a, #7b5846)" }} />
        ) : (
          <img 
            src={image} 
            alt={name} 
            loading="lazy"
            className="w-full h-full object-cover" 
            onError={() => setImgError(true)} 
          />
        )}
      </div>

      <div className="flex-1 min-w-0 flex flex-col justify-center gap-0.5">
        <h3 className="font-display text-[18px] leading-tight truncate" style={{ color: "var(--aw-cream)" }}>
          {name}
        </h3>
        <p className="text-[13px]" style={{ color: "var(--aw-muted)" }}>
          {category ? `${category} · ` : ""}{distanceText} away
        </p>
      </div>

      <div className="shrink-0">
        <svg className="w-5 h-5" style={{ color: "var(--aw-cream)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </Link>
  );
}
