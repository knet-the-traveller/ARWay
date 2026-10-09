import ScenePlaceholder from "./ScenePlaceholder";
import { Scenery } from "@/lib/sceneries";

interface SceneryCardProps {
  scenery: Scenery;
  distanceText: string;
}

export default function SceneryCard({ scenery, distanceText }: SceneryCardProps) {
  return (
    <div className="flex flex-row bg-[#919191] rounded-[20px] p-[12px] active:opacity-90 transition-opacity w-full">
      <div className="w-[80px] h-[80px] rounded-[10px] overflow-hidden shrink-0 bg-white">
        {scenery.image ? (
          <img src={scenery.image} alt={scenery.name} className="w-full h-full object-cover" />
        ) : (
          <ScenePlaceholder />
        )}
      </div>
      <div className="ml-[12px] flex flex-col justify-center overflow-hidden">
        <h3 className="text-[#000] text-[17px] font-normal leading-[1.2] line-clamp-2">
          {scenery.name}
        </h3>
        <p className="text-[#000] text-[13px] mt-1">
          {distanceText}
        </p>
      </div>
    </div>
  );
}
