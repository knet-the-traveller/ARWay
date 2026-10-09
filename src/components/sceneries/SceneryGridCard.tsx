import { useState } from "react";
import Link from "next/link";
import { Scenery } from "@/lib/sceneries";

export default function SceneryGridCard({ scenery, distanceText }: { scenery: Scenery, distanceText: string }) {
  const [imgError, setImgError] = useState(false);
  
  const category = (scenery as any).category || (
    scenery.name.includes("Park") ? "Park" : 
    scenery.name.includes("Church") || scenery.name.includes("Cathedral") ? "Church" : 
    scenery.name.includes("Museum") ? "Museum" : 
    scenery.name.includes("Bay") || scenery.name.includes("River") || scenery.name.includes("Beach") ? "Waterfront" : "Historic"
  );
  
  const rating = (scenery as any).rating || 4.5;

  return (
    <Link 
      href={`/maps?name=${encodeURIComponent(scenery.name)}`}
      className="aw-card rounded-2xl overflow-hidden flex flex-col active:scale-[0.98] transition-transform"
    >
      <div className="w-full h-[120px] shrink-0">
        {!scenery.image || imgError ? (
          <div className="w-full h-full" style={{ background: "linear-gradient(135deg, #3b5a8a, #7b5846)" }} />
        ) : (
          <img 
            src={scenery.image} 
            alt={scenery.name} 
            className="w-full h-full object-cover" 
            onError={() => setImgError(true)} 
          />
        )}
      </div>
      <div className="p-3 flex flex-col gap-1">
        <h3 className="font-display text-[18px] leading-tight line-clamp-2" style={{ color: "var(--aw-cream)" }}>
          {scenery.name}
        </h3>
        <p className="text-[13px] leading-tight" style={{ color: "var(--aw-muted)" }}>
          {category} &middot; <span style={{ color: "var(--aw-accent)" }}>★</span> {rating}
        </p>
        <p className="text-[13px] font-semibold flex items-center gap-1 leading-tight mt-1" style={{ color: "var(--aw-cream)" }}>
          <svg className="w-[14px] h-[14px] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          {distanceText}
        </p>
      </div>
    </Link>
  );
}
