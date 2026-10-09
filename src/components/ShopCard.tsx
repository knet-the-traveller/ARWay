import Link from "next/link";
import { Shop, categories } from "@/lib/shops";
import ScenePlaceholder from "./ScenePlaceholder";

interface ShopCardProps {
  shop: Shop;
  distanceText: string;
}

export default function ShopCard({ shop, distanceText }: ShopCardProps) {
  const categoryLabel = categories.find(c => c.id === shop.categoryId)?.label || "Shop";
  const navigateUrl = `/maps?lat=${shop.lat}&lng=${shop.lng}&name=${encodeURIComponent(shop.name)}`;

  return (
    <Link href={navigateUrl} className="flex flex-row bg-[#919191] rounded-[20px] p-[12px] active:opacity-90 transition-opacity w-full">
      <div className="w-[80px] h-[80px] rounded-[10px] overflow-hidden shrink-0 bg-[#7a7a7a] flex items-center justify-center relative">
        {shop.image ? (
          <img src={shop.image} alt={shop.name} className="w-full h-full object-cover" />
        ) : (
          <ScenePlaceholder />
        )}
      </div>
      <div className="ml-[12px] flex flex-col justify-center overflow-hidden flex-1">
        <h3 className="text-[#000] text-[17px] font-normal leading-[1.2] line-clamp-2">
          {shop.name}
        </h3>
        <div className="mt-1">
          <span className="inline-block bg-[#7a7a7a] text-white text-[12px] px-2 py-0.5 rounded-full font-medium">
            {categoryLabel}
          </span>
        </div>
        <p className="text-[#000] text-[13px] mt-1">
          {distanceText}
        </p>
      </div>
    </Link>
  );
}
