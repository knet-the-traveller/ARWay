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
        className="absolute bottom-2.5 left-2.5 right-2.5 bg-[#1c1c1e]/90 backdrop-blur-md text-white px-3 py-1.5 rounded-xl shadow-xl border border-white/10 z-20 pointer-events-auto transition-opacity duration-300 text-center"
        style={{ opacity: hintOpacity }}
      >
        <p className="text-[11px] text-neutral-300">Search a place above or tap the map to drop a pin</p>
      </div>
    );
  }

  if (remainingDistanceM < 15 && routeData) {
    return (
      <div className="absolute bottom-2.5 left-2.5 right-2.5 bg-emerald-950/95 backdrop-blur-md text-white px-3 py-2 rounded-xl shadow-xl border border-emerald-500/30 z-20 pointer-events-auto flex items-center justify-between">
        <div className="min-w-0 flex-1 pr-2">
          <div className="text-xs font-bold text-emerald-300 flex items-center gap-1">
            <span>🎉</span>
            <span>You've arrived!</span>
          </div>
          <p className="text-[11px] text-neutral-300 truncate">{destination.name}</p>
        </div>
        <button onClick={onClear} className="bg-emerald-500 text-black px-3 py-1 rounded-lg font-bold text-xs active:scale-95 transition-all">Finish</button>
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
    ? "..." 
    : routeData?.source === "network" 
    ? "Live" 
    : routeData?.source === "cache" 
    ? "Saved" 
    : "Direct";

  const sourceColor = routeLoading
    ? "bg-blue-500/20 text-blue-300"
    : routeData?.source === "network" 
    ? "bg-blue-500/20 text-blue-300 border-blue-500/30" 
    : routeData?.source === "cache" 
    ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" 
    : "bg-amber-500/20 text-amber-300 border-amber-500/30";

  return (
    <div className="absolute bottom-2.5 left-2.5 right-2.5 bg-[#1c1c1e]/95 backdrop-blur-xl text-white px-3 py-2 rounded-2xl shadow-2xl border border-white/10 z-20 pointer-events-auto flex flex-col gap-1.5">
      {/* ROW 1: DESTINATION + METRICS + QUICK TOGGLES + CLOSE */}
      <div className="flex items-center justify-between gap-1.5">
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <h3 className="text-xs sm:text-[13px] font-semibold text-white truncate max-w-[130px] sm:max-w-[180px]">
            {destination.name}
          </h3>
          <div className="flex items-center gap-1 text-[11px] text-neutral-300 bg-white/5 border border-white/10 px-1.5 py-0.5 rounded-full shrink-0">
            <span className="font-semibold text-white">{distText}</span>
            <span className="text-neutral-500">&middot;</span>
            <span>{etaMins}m</span>
          </div>
          <span className={`text-[9px] px-1 py-0.2 rounded border hidden xs:inline-block shrink-0 ${sourceColor}`}>
            {sourceLabel}
          </span>
        </div>

        {/* CONTROLS & CLEAR */}
        <div className="flex items-center gap-1 shrink-0">
          {onToggleRealign && (
            <button
              type="button"
              onClick={onToggleRealign}
              className={`px-1.5 py-0.5 rounded text-[10px] font-medium border flex items-center gap-0.5 transition-all ${
                realign ? "bg-blue-500/20 text-blue-300 border-blue-500/40" : "bg-white/5 text-neutral-400 border-white/10"
              }`}
              title="Toggle route snap alignment"
            >
              <span>📐</span>
            </button>
          )}

          {onToggleSimulate && (
            <button
              type="button"
              onClick={onToggleSimulate}
              className={`px-1.5 py-0.5 rounded text-[10px] font-medium border flex items-center gap-0.5 transition-all ${
                simulatedWalk ? "bg-purple-500/20 text-purple-300 border-purple-500/40" : "bg-white/5 text-neutral-400 border-white/10"
              }`}
              title="Toggle simulated GPS walking"
            >
              <span>🎮</span>
            </button>
          )}

          <button
            type="button"
            onClick={onClear}
            className="w-5 h-5 rounded-full bg-white/10 hover:bg-white/20 active:scale-90 flex items-center justify-center text-neutral-400 hover:text-white text-[10px] ml-0.5 transition-all shrink-0"
            title="Clear route"
          >
            ✕
          </button>
        </div>
      </div>

      {/* ROW 2: DIRECTION CUE + ACTION BUTTON */}
      <div className="flex items-center justify-between gap-2 min-h-[30px]">
        {/* DIRECTION INSTRUCTION */}
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <span className="text-[11px] sm:text-xs text-blue-400 font-medium truncate">
            {stepText}
          </span>

          {simulatedWalk && onHoldWalk && (
            <button 
              type="button"
              onPointerDown={() => onHoldWalk(true)} 
              onPointerUp={() => onHoldWalk(false)}
              onPointerLeave={() => onHoldWalk(false)}
              className="px-2 py-0.5 bg-blue-600 text-white rounded text-[10px] font-bold active:bg-blue-500 shrink-0 select-none shadow-sm transition-colors"
            >
              Hold Walk
            </button>
          )}
        </div>

        {/* AR TRIGGER / CONTROLS */}
        <div className="shrink-0 flex items-center gap-1">
          {arActive ? (
            <>
              <button 
                type="button"
                onClick={onRecenter} 
                className="h-7 px-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-medium rounded-xl text-[11px] transition-all active:scale-95"
                title="Recenter compass heading"
              >
                Recenter
              </button>
              <button 
                type="button"
                onClick={onStopAr} 
                className="h-7 px-3 bg-rose-600 hover:bg-rose-500 text-white font-semibold rounded-xl text-xs active:scale-95 transition-all flex items-center gap-1 shadow-md shadow-rose-600/30"
              >
                <span className="w-2 h-2 rounded-sm bg-white" />
                <span>Stop AR</span>
              </button>
            </>
          ) : (
            <button 
              type="button"
              onClick={onStartAr} 
              className="h-7 px-3.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl text-xs active:scale-95 transition-all flex items-center gap-1 shadow-md shadow-blue-600/30"
            >
              <svg className="w-3 h-3 fill-current" viewBox="0 0 24 24">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
              <span>Start AR</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

