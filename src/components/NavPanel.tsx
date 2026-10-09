"use client";

import { useEffect, useState } from "react";
import { RouteData } from "@/lib/route";
import { haversineDistanceM } from "@/lib/geo";

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
  realign?: boolean;
  onToggleRealign?: () => void;
  simulatedWalk?: boolean;
  onToggleSimulate?: () => void;
  onHoldWalk?: (held: boolean) => void;
  compact?: boolean;
  position?: { lat: number, lng: number } | null;
}

export default function NavPanel({ 
  destination, routeData, routeLoading, routeError, 
  arActive, onStartAr, onStopAr, onRecenter, onClear, 
  remainingDistanceM, realign = true, onToggleRealign, 
  simulatedWalk = false, onToggleSimulate, onHoldWalk,
  compact = false, position
}: NavPanelProps) {

  const [showHint, setShowHint] = useState(true);
  const [hintOpacity, setHintOpacity] = useState(1);

  useEffect(() => {
    if (!destination) {
      setShowHint(true);
      setHintOpacity(1);
      
      const fadeTimer = setTimeout(() => {
        setHintOpacity(0);
      }, 4000);
      
      const hideTimer = setTimeout(() => {
        setShowHint(false);
      }, 4400);
      
      return () => {
        clearTimeout(fadeTimer);
        clearTimeout(hideTimer);
      };
    }
  }, [destination]);

  if (!destination) {
    if (!showHint) return null;
    return (
      <div 
        className="absolute bottom-4 left-4 right-4 bg-[#1c1c1e]/90 backdrop-blur-md text-white p-3.5 rounded-2xl shadow-xl border border-white/10 z-20 pointer-events-auto transition-opacity duration-300"
        style={{ opacity: hintOpacity }}
      >
        <p className="text-[13px] text-neutral-300 text-center">Search a place above, tap the map to drop a pin, or pick a preset</p>
      </div>
    );
  }

  if (remainingDistanceM < 15 && routeData) {
    return (
      <div className="absolute bottom-4 left-4 right-4 bg-green-900/90 backdrop-blur-md text-white p-4 rounded-2xl shadow-xl z-20 pointer-events-auto text-center">
        <h3 className="text-lg font-bold mb-1">You've arrived!</h3>
        <p className="text-sm text-green-200 mb-3">{destination.name}</p>
        <button onClick={onClear} className="bg-white text-green-900 w-full h-[44px] rounded-xl font-bold active:bg-gray-200 transition-colors">Finish</button>
      </div>
    );
  }

  // Calculate distance & ETA immediately
  const distM = routeData 
    ? remainingDistanceM 
    : (remainingDistanceM || (position ? haversineDistanceM(position, destination) : 0));

  const distText = distM < 1000 
    ? `${Math.round(distM)} m` 
    : `${(distM / 1000).toFixed(1)} km`;

  const etaMins = Math.max(1, Math.ceil(distM / 1.3 / 60));

  let stepText = "Follow route";
  if (routeLoading) {
    stepText = "Calculating street route...";
  } else if (routeData && routeData.steps && routeData.steps.length > 0) {
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
    stepText = step ? step.text : "Follow route";
  } else if (routeError) {
    stepText = "Direct line to destination";
  }

  const sourceLabel = routeLoading 
    ? "Calculating..." 
    : routeData?.source === "network" 
    ? "Live route" 
    : routeData?.source === "cache" 
    ? "Saved route (offline)" 
    : "Direct line";

  const sourceColor = routeLoading
    ? "bg-blue-500/20 text-blue-300"
    : routeData?.source === "straight" 
    ? "bg-amber-500/20 text-amber-300" 
    : routeData?.source === "cache" 
    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" 
    : "bg-gray-800 text-gray-300";

  if (compact) {
    return (
      <div className="absolute bottom-4 left-4 right-4 bg-[#1c1c1e]/95 backdrop-blur-md text-white p-3 rounded-2xl shadow-xl z-20 pointer-events-auto flex flex-col gap-2 max-h-[84px]">
        <div className="flex justify-between items-center">
          <h3 className="text-[15px] font-semibold truncate flex-1 min-w-0 pr-2">{destination.name}</h3>
          <div className="flex items-center text-[12px] text-gray-300 flex-shrink-0 gap-1.5">
            <span className="font-medium text-white">{distText}</span>
            <span>&middot;</span>
            <span>{etaMins} min</span>
          </div>
        </div>

        <div className="flex gap-2 h-[44px]">
          {arActive ? (
            <button onClick={onStopAr} className="flex-1 bg-red-500 text-white font-semibold rounded-xl active:bg-red-600 transition-colors text-sm">Stop</button>
          ) : (
            <button onClick={onStartAr} className="flex-1 bg-blue-500 text-white font-semibold rounded-xl active:bg-blue-600 transition-colors text-sm">Start AR</button>
          )}
          {arActive && (
            <button onClick={onRecenter} className="px-3 bg-gray-700 text-white font-semibold rounded-xl active:bg-gray-600 transition-colors text-xs">Recenter</button>
          )}
          <button onClick={onClear} className="px-3 bg-gray-800 text-gray-300 font-semibold rounded-xl active:bg-gray-700 transition-colors text-xs">Clear</button>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute bottom-4 left-4 right-4 bg-[#1c1c1e]/95 backdrop-blur-md text-white p-3 rounded-2xl shadow-xl z-20 pointer-events-auto flex flex-col gap-3 max-h-[140px]">
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
            {stepText}
          </p>
        </div>
        
        <div className="flex flex-col gap-1 flex-shrink-0">
          {onToggleRealign && (
            <label className="flex items-center gap-1.5 text-[10px] text-gray-500 bg-black/40 px-2 py-1 rounded cursor-pointer">
              <input type="checkbox" checked={realign} onChange={onToggleRealign} className="w-3 h-3 accent-blue-500" />
              Realign
            </label>
          )}
          {onToggleSimulate && (
            <label className="flex items-center gap-1.5 text-[10px] text-gray-500 bg-black/40 px-2 py-1 rounded cursor-pointer">
              <input type="checkbox" checked={simulatedWalk} onChange={onToggleSimulate} className="w-3 h-3 accent-blue-500" />
              Simulate
            </label>
          )}
          {simulatedWalk && onHoldWalk && (
            <button 
              onPointerDown={() => onHoldWalk(true)} 
              onPointerUp={() => onHoldWalk(false)}
              onPointerLeave={() => onHoldWalk(false)}
              className="bg-blue-600/30 text-blue-300 rounded text-xs py-1 h-[24px] font-semibold select-none active:bg-blue-600 active:text-white transition-colors"
            >
              Hold to Walk
            </button>
          )}
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
