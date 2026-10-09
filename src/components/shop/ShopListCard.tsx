import { useState } from "react";
import Link from "next/link";
import { Shop, categories } from "@/lib/shops";
import { NavArrowIcon } from "@/components/icons/NavArrowIcon";

interface ShopListCardProps {
  shop: Shop;
  distanceText: string;
}

export default function ShopListCard({ shop, distanceText }: ShopListCardProps) {
  const [imgError, setImgError] = useState(false);
  const categoryLabel = categories.find(c => c.id === shop.categoryId)?.label || "Shop";
  const navigateUrl = `/maps?lat=${shop.lat}&lng=${shop.lng}&name=${encodeURIComponent(shop.name)}`;

  return (
    <Link 
      href={navigateUrl}
      className="aw-card rounded-2xl p-3 flex flex-row items-center active:scale-[0.98] transition-transform w-full"
    >
      {/* Thumbnail */}
      <div className="w-[76px] h-[76px] rounded-xl shrink-0 overflow-hidden relative">
        {!shop.image || imgError ? (
          <div className="w-full h-full" style={{ background: "linear-gradient(135deg, #3b5a8a, #7b5846)" }} />
        ) : (
          <img 
            src={shop.image} 
            alt={shop.name} 
            loading="lazy"
            className="w-full h-full object-cover" 
            onError={() => setImgError(true)} 
          />
        )}
      </div>

      {/* Middle column */}
      <div className="flex-1 min-w-0 ml-3 mr-3 flex flex-col gap-1 justify-center">
        <h3 className="font-display text-[18px] leading-tight line-clamp-2" style={{ color: "var(--aw-cream)" }}>
          {shop.name}
        </h3>
        
        <div className="flex items-center gap-1.5 mt-0.5">
          <span 
            className="rounded-md px-2 py-0.5 text-[12px] font-bold"
            style={{ backgroundColor: "var(--aw-surface-2)", color: "var(--aw-accent)" }}
          >
            {categoryLabel}
          </span>
          {shop.rating !== undefined && (
            <span className="text-[13px] font-bold flex items-center gap-0.5" style={{ color: "var(--aw-cream)" }}>
              <span style={{ color: "var(--aw-accent)" }}>★</span> {shop.rating}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 leading-tight mt-0.5">
          {shop.isOpen !== undefined && (
            <span 
              className="text-[13px] font-bold mr-1" 
              style={{ color: shop.isOpen ? "var(--aw-green)" : "#8fa3c8" }}
            >
              {shop.isOpen ? "Open now" : "Closed"}
            </span>
          )}
          <svg className="w-[12px] h-[12px] shrink-0" style={{ color: "var(--aw-muted)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-[13px]" style={{ color: "var(--aw-muted)" }}>
            {distanceText}
          </span>
        </div>

        {shop.amenities && shop.amenities.length > 0 && (
          <div className="italic text-[13px] leading-tight mt-0.5 truncate" style={{ color: "var(--aw-muted)" }}>
            {shop.amenities[0]}
          </div>
        )}
      </div>

      {/* Right button */}
      <div 
        className="shrink-0 h-[44px] min-w-[76px] rounded-full flex items-center justify-center gap-[8px] font-bold text-[15px] px-3"
        style={{ backgroundColor: "var(--aw-accent)", color: "#121b2c" }}
      >
        <NavArrowIcon size={18} />
        Go
      </div>
    </Link>
  );
}
