import { RouteData } from "@/lib/route";

interface NavPanelProps {
  destination: { lat: number, lng: number, name: string } | null;
  routeData: RouteData | null;
  routeLoading: boolean;
  routeError: boolean;
  arActive: boolean;
  onStartAr: () => void;
  onStopAr: () => void;
  onRecenter: () => void;
  onClear: () => void;
  remainingDistanceM: number;
  realign: boolean;
  onToggleRealign: () => void;
}

export default function NavPanel({ 
  destination, routeData, routeLoading, routeError, 
  arActive, onStartAr, onStopAr, onRecenter, onClear, 
  remainingDistanceM, realign, onToggleRealign 
}: NavPanelProps) {

  if (!destination) {
    return (
      <div className="absolute bottom-16 left-4 right-4 bg-[#1c1c1e] text-white p-4 rounded-2xl shadow-xl z-20 pointer-events-auto">
        <p className="text-[14px] text-gray-300 text-center">Pick a place from Sceneries, Shop, or Home, or tap the map</p>
      </div>
    );
  }

  if (routeLoading) {
    return (
      <div className="absolute bottom-16 left-4 right-4 bg-[#1c1c1e] text-white p-4 rounded-2xl shadow-xl z-20 pointer-events-auto flex items-center justify-center h-[100px]">
        <p className="text-[15px] font-medium text-gray-300">Loading route...</p>
      </div>
    );
  }

  if (routeError) {
    return (
      <div className="absolute bottom-16 left-4 right-4 bg-[#1c1c1e] text-white p-4 rounded-2xl shadow-xl z-20 pointer-events-auto flex flex-col items-center justify-center h-[100px]">
        <p className="text-[15px] font-medium text-red-400 mb-2">Failed to load route</p>
        <button onClick={onClear} className="text-gray-300 active:text-white px-4 py-1 border border-gray-600 rounded-lg text-sm">Clear destination</button>
      </div>
    );
  }

  if (remainingDistanceM < 15 && routeData) {
    return (
      <div className="absolute bottom-16 left-4 right-4 bg-green-900/90 backdrop-blur-md text-white p-4 rounded-2xl shadow-xl z-20 pointer-events-auto text-center">
        <h3 className="text-lg font-bold mb-1">You've arrived!</h3>
        <p className="text-sm text-green-200 mb-3">{destination.name}</p>
        <button onClick={onClear} className="bg-white text-green-900 w-full h-[44px] rounded-xl font-bold active:bg-gray-200 transition-colors">Finish</button>
      </div>
    );
  }

  if (routeData) {
    const distText = remainingDistanceM < 1000 
      ? `${Math.round(remainingDistanceM)} m` 
      : `${(remainingDistanceM / 1000).toFixed(1)} km`;
    
    const etaMins = Math.ceil(remainingDistanceM / 1.3 / 60);

    // Find next step based on remaining distance approx
    const distanceCovered = routeData.distanceM - remainingDistanceM;
    let step = routeData.steps[0];
    let stepAccum = 0;
    for (const s of routeData.steps) {
      stepAccum += s.distanceM;
      if (stepAccum > distanceCovered) {
        step = s;
        break;
      }
    }

    const sourceLabel = routeData.source === "network" ? "Live route" 
                      : routeData.source === "cache" ? "Saved route (offline)" 
                      : "Direct line only";
    const sourceColor = routeData.source === "straight" ? "bg-red-500/20 text-red-400" : "bg-gray-800 text-gray-300";

    return (
      <div className="absolute bottom-4 left-4 right-4 bg-[#1c1c1e]/95 backdrop-blur-md text-white p-3 rounded-2xl shadow-xl z-20 pointer-events-auto flex flex-col gap-3 max-h-[130px]">
        <div className="flex justify-between items-start">
          <div className="flex-1 min-w-0 pr-2">
            <h3 className="text-[17px] font-semibold truncate leading-tight">{destination.name}</h3>
            <div className="flex items-center text-[13px] text-gray-400 mt-0.5 gap-2">
              <span className="font-medium text-white">{distText}</span>
              <span>&middot;</span>
              <span>{etaMins} min</span>
              <span>&middot;</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-md truncate ${sourceColor}`}>{sourceLabel}</span>
            </div>
            <p className="text-[14px] text-blue-400 font-medium mt-1 truncate">
              {step ? step.text : "Follow route"}
            </p>
          </div>
          
          <div className="flex flex-col gap-1 flex-shrink-0">
            <label className="flex items-center gap-1.5 text-[10px] text-gray-500 bg-black/40 px-2 py-1 rounded h-[44px] cursor-pointer active:bg-black/60">
              <input type="checkbox" checked={realign} onChange={onToggleRealign} className="w-3 h-3 accent-blue-500" />
              Realign
            </label>
          </div>
        </div>

        <div className="flex gap-2 h-[44px]">
          {arActive ? (
            <button onClick={onStopAr} className="flex-1 bg-red-500 text-white font-semibold rounded-xl active:bg-red-600 transition-colors">Stop AR</button>
          ) : (
            <button onClick={onStartAr} className="flex-1 bg-blue-500 text-white font-semibold rounded-xl active:bg-blue-600 transition-colors">Start AR</button>
          )}
          {arActive && (
            <button onClick={onRecenter} className="px-4 bg-gray-700 text-white font-semibold rounded-xl active:bg-gray-600 transition-colors text-sm">Recenter</button>
          )}
          <button onClick={onClear} className="px-4 bg-gray-800 text-gray-300 font-semibold rounded-xl active:bg-gray-700 transition-colors text-sm">Clear</button>
        </div>
      </div>
    );
  }

  return null;
}
