"use client";

import { useState } from "react";
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
  simulatedWalk: boolean;
  onToggleSimulate: () => void;
  onHoldWalk: (held: boolean) => void;
  position?: { lat: number; lng: number } | null;
}

export default function NavPanel({ 
  destination, routeData, routeLoading, routeError, 
  arActive, onStartAr, onStopAr, onRecenter, onClear, 
  remainingDistanceM, simulatedWalk, onToggleSimulate, onHoldWalk,
  position
}: NavPanelProps) {

  if (!destination) {
    return (
      <div className="absolute bottom-4 left-4 right-4 bg-[#1c1c1e] text-white p-4 rounded-2xl shadow-xl z-20 pointer-events-auto">
        <p className="text-[14px] text-gray-300 text-center">Pick a place from Sceneries, Shop, or Home, or tap the map</p>
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
    ? "Offline street route" 
    : routeData?.source === "corridor"
    ? "Street corridor guide"
    : "Direct guide";

  const sourceColor = routeLoading
    ? "bg-blue-500/20 text-blue-300"
    : routeData?.source === "network" 
    ? "bg-blue-500/20 text-blue-300" 
    : routeData?.source === "cache" 
    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" 
    : "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30";

  return (
    <div className="absolute bottom-4 left-4 right-4 bg-[#1c1c1e]/95 backdrop-blur-md text-white p-3.5 rounded-2xl shadow-xl z-20 pointer-events-auto flex flex-col gap-3">
      <div className="flex justify-between items-start">
        <div className="flex-1 min-w-0 pr-2">
          <h3 className="text-[17px] font-semibold truncate leading-tight">{destination.name}</h3>
          <div className="flex items-center text-[13px] text-gray-400 mt-1 gap-2 flex-wrap">
            <span className="font-medium text-white">{distText}</span>
            <span>&middot;</span>
            <span>{etaMins} min</span>
            <span>&middot;</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-md font-medium truncate ${sourceColor}`}>{sourceLabel}</span>
          </div>
          <p className="text-[14px] text-blue-400 font-medium mt-1.5 truncate">
            {stepText}
          </p>
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
