"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useOnlineStatus } from "@/lib/offline";
import { 
  loadRecognizer, 
  prepareReferences, 
  embedFrame, 
  matchFrame 
} from "@/lib/recognizer";
import { MIN_SCORE, MIN_MARGIN, CONFIRM_FRAMES, SCAN_INTERVAL_MS } from "@/lib/recognizerConfig";
import { sceneries } from "@/lib/sceneries";
import { LockIcon, BugIcon, CloseIcon } from "./icons";

interface LandmarkScannerProps {
  video: HTMLVideoElement | null;
  arActive?: boolean;
  cameraActive?: boolean;
  onToggleCamera?: () => void;
  zoom?: number;
}

export default function LandmarkScanner({ 
  video, 
  arActive, 
  cameraActive = true, 
  onToggleCamera,
  zoom = 1
}: LandmarkScannerProps) {
  const router = useRouter();
  const isOnline = useOnlineStatus();
  const [isOfflineReady, setIsOfflineReady] = useState(false);

  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        const ready = localStorage.getItem("arway_offline_ready");
        setIsOfflineReady(!!ready);
      }
    } catch (e) {}
  }, []);

  const [isScanning, setIsScanning] = useState(false);
  const [loadingPhase, setLoadingPhase] = useState<"idle" | "model" | "references" | "done" | "error">("idle");
  const [loadError, setLoadError] = useState<string | null>(null);
  
  const [modelProgress, setModelProgress] = useState(0);
  const [refDone, setRefDone] = useState(0);
  const [refTotal, setRefTotal] = useState(0);
  
  const [deviceUsed, setDeviceUsed] = useState("unknown");
  const [showDebug, setShowDebug] = useState(false);

  // Scan state
  const [topMatch, setTopMatch] = useState<{ placeId: string, name: string, score: number } | null>(null);
  const [isNeutral, setIsNeutral] = useState(false);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [dismissedMatchId, setDismissedMatchId] = useState<string | null>(null);

  const loopRef = useRef<any>(null);
  const matchHistoryRef = useRef<string[]>([]);
  const isScanningRef = useRef(false);

  useEffect(() => {
    isScanningRef.current = isScanning;
    if (!isScanning) {
      if (loopRef.current) clearTimeout(loopRef.current);
      setTopMatch(null);
      setIsNeutral(false);
    } else {
      if (loadingPhase === "done") {
        scheduleScan();
      }
    }
    return () => {
      if (loopRef.current) clearTimeout(loopRef.current);
    };
  }, [isScanning, loadingPhase, video]);

  const scheduleScan = () => {
    if (loopRef.current) clearTimeout(loopRef.current);
    loopRef.current = setTimeout(runScan, SCAN_INTERVAL_MS);
  };

  const runScan = async () => {
    if (!isScanningRef.current || document.hidden || !video || video.readyState < 2) {
      scheduleScan();
      return;
    }

    const t0 = performance.now();
    try {
      const vector = await embedFrame(video, zoom);
      if (!vector) {
        scheduleScan();
        return;
      }
      
      const { top3, margin } = matchFrame(vector);
      const t1 = performance.now();

      setDebugInfo({
        ms: t1 - t0,
        top3,
        margin
      });

      const best = top3[0];
      if (best && best.score >= MIN_SCORE && margin >= MIN_MARGIN) {
        matchHistoryRef.current.push(best.placeId);
        if (matchHistoryRef.current.length > CONFIRM_FRAMES) {
          matchHistoryRef.current.shift();
        }
        
        const allSame = matchHistoryRef.current.length === CONFIRM_FRAMES && 
                        matchHistoryRef.current.every(id => id === best.placeId);
        
        if (allSame) {
          if (dismissedMatchId !== best.placeId) {
            setTopMatch(best);
            setIsNeutral(false);
          }
        } else {
          setIsNeutral(true);
        }
      } else {
        matchHistoryRef.current = [];
        setIsNeutral(true);
      }
    } catch (e) {
      console.error(e);
    }
    scheduleScan();
  };

  const startScanning = async () => {
    setIsScanning(true);
    setDismissedMatchId(null);
    if (loadingPhase === "idle" || loadingPhase === "error") {
      setLoadingPhase("model");
      setLoadError(null);
      try {
        const info = await loadRecognizer((data) => {
          if (data.status === "progress" && data.progress !== undefined) {
            setModelProgress(Math.round(data.progress));
          }
        });
        setDeviceUsed(info.device);
        
        setLoadingPhase("references");
        await prepareReferences((done, total) => {
          setRefDone(done);
          setRefTotal(total);
        });

        setLoadingPhase("done");
      } catch (err: any) {
        setLoadError(err.message || "Failed to load AI");
        setLoadingPhase("error");
        setIsScanning(false);
      }
    }
  };

  const stopScanning = () => {
    setIsScanning(false);
    matchHistoryRef.current = [];
  };

  const navigateTo = (placeId: string) => {
    const place = sceneries.find(s => s.id === placeId);
    if (place) {
      router.replace(`/maps?lat=${place.lat}&lng=${place.lng}&name=${encodeURIComponent(place.name)}`);
    }
  };

  const renderCameraButton = () => {
    let ringColor = "transparent";
    let pulse = false;
    let iconOpacity = 1;
    let progress = 0;
    
    if (loadingPhase === "model") {
      ringColor = "#3b82f6";
      iconOpacity = 0.5;
      progress = modelProgress;
    } else if (loadingPhase === "references") {
      ringColor = "#3b82f6";
      iconOpacity = 0.5;
      progress = refTotal ? (refDone / refTotal) * 100 : 0;
    } else if (loadingPhase === "error") {
      ringColor = "#ef4444";
    } else if (isScanning) {
      ringColor = "#3b82f6";
      pulse = true;
    }

    const handleClick = () => {
      if (!cameraActive && onToggleCamera) {
        onToggleCamera();
        startScanning();
        return;
      }
      if (isScanning) {
        stopScanning();
      } else {
        startScanning();
      }
    };

    return (
      <button 
        onClick={handleClick}
        aria-label={isScanning ? "Stop scanning" : "Scan landmarks"}
        title={isScanning ? "Stop AI scan" : "Scan landmark with on-device AI"}
        className="relative w-[40px] h-[40px] rounded-full bg-black/65 backdrop-blur-sm border border-white/10 flex items-center justify-center text-white pointer-events-auto active:scale-95 shadow-md flex-shrink-0 z-40"
      >
        {pulse && (
          <div className="absolute inset-0 rounded-full border-2 border-blue-500 animate-ping opacity-75" />
        )}
        {(loadingPhase === "model" || loadingPhase === "references") && (
          <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 44 44">
            <circle cx="22" cy="22" r="21" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="2" />
            <circle cx="22" cy="22" r="21" fill="none" stroke={ringColor} strokeWidth="2" 
              strokeDasharray={132} strokeDashoffset={132 - (132 * progress) / 100} 
              className="transition-all duration-300"
            />
          </svg>
        )}
        {loadingPhase === "error" && (
          <div className="absolute inset-0 rounded-full border-2 border-red-500" />
        )}
        {isScanning && loadingPhase === "done" && (
          <div className="absolute inset-0 rounded-full border-2 border-blue-500" />
        )}
        <svg 
          className="w-6 h-6" 
          style={{ opacity: iconOpacity }} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24" 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        >
          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
          <circle cx="12" cy="13" r="4" />
        </svg>
      </button>
    );
  };

  const bottomOffset = (arActive !== false) ? "84px" : "12px";

  return (
    <div className="absolute inset-0 pointer-events-none z-20 flex flex-col">
      {/* Top Section */}
      <div className="absolute top-4 left-4 right-4 flex justify-between items-start z-30 pointer-events-none">
        
        {/* Left Column */}
        <div className="flex flex-col gap-2 items-start max-w-[65%]">
          {/* Offline Sync Status Badge */}
          <Link
            href="/offline-setup"
            className={`pointer-events-auto backdrop-blur-md rounded-full px-3 py-1.5 flex items-center shadow-md border transition-all active:scale-95 ${
              !isOfflineReady
                ? "bg-black/75 border-red-500/40 text-red-200 shadow-red-950/20"
                : isOnline
                  ? "bg-black/75 border-emerald-500/40 text-emerald-300 shadow-emerald-950/20"
                  : "bg-black/75 border-sky-400/50 text-sky-200 shadow-sky-950/20"
            }`}
            title={
              !isOfflineReady
                ? "Tap to sync offline maps and on-device AI"
                : isOnline
                  ? "Offline assets synced to device"
                  : "Running 100% on-device (offline)"
            }
          >
            <span
              className={`w-2 h-2 rounded-full mr-2 shrink-0 ${
                !isOfflineReady
                  ? "bg-red-500 shadow-[0_0_6px_#ef4444]"
                  : isOnline
                    ? "bg-emerald-400 shadow-[0_0_6px_#10b981]"
                    : "bg-sky-400 shadow-[0_0_6px_#38bdf8]"
              }`}
            />
            <span className="text-[11px] font-semibold whitespace-nowrap">
              {!isOfflineReady
                ? "Offline Not Sync"
                : isOnline
                  ? "Offline Synced"
                  : "Offline Mode"}
            </span>
          </Link>
          {/* Privacy Badge */}
          {isScanning && (
            <div className="bg-black/60 backdrop-blur-sm rounded-full px-3 py-1.5 flex items-center shadow-sm">
              <LockIcon className="w-3.5 h-3.5 text-green-400 mr-2 flex-shrink-0" />
              <span className="text-white text-[11px] font-medium whitespace-nowrap">On-device AI</span>
            </div>
          )}

          {/* Neutral State / Status Pill */}
          {isScanning && isNeutral && !topMatch && loadingPhase === "done" && (
            <div className="bg-black/60 backdrop-blur-sm rounded-full px-4 py-2 flex items-center shadow-md transition-opacity">
              <span className="text-white text-[13px] font-medium">
                {debugInfo && debugInfo.top3[0]?.score < MIN_SCORE ? "Not sure" : "Looking for a landmark..."}
              </span>
            </div>
          )}
        </div>

        {/* Center Column: Loading / Error Cards */}
        <div className="flex flex-col items-center w-[40%]">
          {(loadingPhase === "model" || loadingPhase === "references") && (
            <div className="bg-[#1c1c1e]/90 backdrop-blur-md p-3 rounded-xl shadow-xl w-full max-w-[280px] pointer-events-auto text-center">
              <h3 className="text-white font-semibold text-[13px] mb-1">Loading on-device AI...</h3>
              <p className="text-gray-400 text-[11px]">Preparing landmarks ({refDone}/{refTotal})</p>
            </div>
          )}
          {loadingPhase === "error" && (
            <div className="bg-[#1c1c1e]/90 backdrop-blur-md p-3 rounded-xl shadow-xl w-full max-w-[280px] pointer-events-auto flex flex-col items-center">
              <h3 className="text-red-400 font-semibold text-[13px] mb-1">Failed to load</h3>
              <p className="text-gray-400 text-[11px] text-center mb-2">{loadError}</p>
              <button onClick={startScanning} className="bg-gray-700 text-white rounded-lg px-4 py-1.5 text-[12px] font-semibold active:bg-gray-600">Retry</button>
            </div>
          )}
        </div>

        {/* Right Column */}
        <div className="flex flex-col gap-2 items-end w-[40%]">
          <div className="flex items-center gap-1.5 pointer-events-auto">
            {/* Camera Power Toggle (Start/Stop Camera Stream) */}
            {onToggleCamera && (
              <button
                type="button"
                onClick={onToggleCamera}
                aria-label={cameraActive ? "Turn off camera" : "Turn on camera"}
                title={cameraActive ? "Camera active. Tap to turn OFF and save battery." : "Camera in standby. Tap to turn ON."}
                className={`relative w-[40px] h-[40px] rounded-full backdrop-blur-md flex items-center justify-center pointer-events-auto active:scale-95 transition-all shadow-md select-none ${
                  cameraActive 
                    ? "bg-black/65 border border-emerald-500/50 text-emerald-400" 
                    : "bg-black/85 border border-neutral-700 text-neutral-400"
                }`}
              >
                {cameraActive ? (
                  <>
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#10b981]" />
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </>
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    <line x1="3" y1="3" x2="21" y2="21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                )}
              </button>
            )}

            {/* Landmark AI Scanner */}
            {renderCameraButton()}
          </div>

          {/* Debug Toggle */}
          {isScanning && loadingPhase === "done" && (
            <button 
              type="button"
              onClick={() => setShowDebug(!showDebug)}
              className="w-[36px] h-[36px] rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center text-gray-300 pointer-events-auto active:scale-95 shadow-sm flex-shrink-0"
              title="Toggle AI recognition debug logs"
            >
              <BugIcon className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Debug Panel */}
      {showDebug && debugInfo && isScanning && loadingPhase === "done" && (
        <div 
          className="absolute left-4 right-4 z-30 pointer-events-none flex flex-col items-center"
          style={{ bottom: `calc(${bottomOffset} + ${topMatch ? '70px' : '0px'})` }}
        >
          {topMatch ? (
            // Compact line if result card is showing
            <div className="w-full max-w-[340px] bg-black/80 backdrop-blur-md rounded-lg p-2 text-[11px] text-green-400 font-mono shadow-lg pointer-events-auto truncate text-center mb-2">
              {deviceUsed} | {Math.round(debugInfo.ms)}ms | {debugInfo.top3[0]?.name} ({(debugInfo.top3[0]?.score || 0).toFixed(3)})
            </div>
          ) : (
            // Full panel otherwise (ensuring it doesn't cover bottom-center 120x110px)
            <div className="w-full max-h-[40vh] overflow-y-auto bg-black/80 backdrop-blur-md rounded-xl p-3 text-[11px] text-green-400 font-mono shadow-lg pointer-events-auto max-w-[340px]">
              <p className="text-white mb-1">Device: {deviceUsed}</p>
              <p className="mb-2">Time: {Math.round(debugInfo.ms)}ms</p>
              <p className="text-gray-400 mb-1 border-b border-gray-700 pb-1">Top 3 matches:</p>
              {debugInfo.top3.map((m: any, i: number) => (
                <div key={i} className="flex justify-between truncate">
                  <span className="truncate mr-2">{m.name}</span>
                  <span>{m.score.toFixed(3)}</span>
                </div>
              ))}
              <p className="mt-2 text-yellow-400">Margin: {debugInfo.margin.toFixed(3)}</p>
              <p className="text-gray-500 mt-1">Req: sc&gt;={MIN_SCORE} mg&gt;={MIN_MARGIN}</p>
            </div>
          )}
        </div>
      )}

      {/* Match Result Card */}
      {topMatch && (
        <div 
          className="absolute left-4 right-4 z-30 pointer-events-auto flex justify-center"
          style={{ bottom: bottomOffset }}
        >
          <div className="bg-[#1c1c1e]/90 backdrop-blur-md p-3 rounded-2xl shadow-xl w-full max-w-[340px] relative animate-in slide-in-from-bottom-4 duration-300">
            <button 
              onClick={() => {
                setDismissedMatchId(topMatch.placeId);
                setTopMatch(null);
                setIsNeutral(true);
                matchHistoryRef.current = [];
              }}
              className="absolute top-2 right-2 w-8 h-8 flex items-center justify-center text-gray-400 active:text-white transition-colors"
            >
              <CloseIcon className="w-5 h-5" />
            </button>
            <div className="pr-10 mb-3">
              <div className="inline-block bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded text-[11px] font-bold mb-1 uppercase tracking-wider">
                Match {Math.round(topMatch.score * 100)}%
              </div>
              <h3 className="text-white font-semibold text-[17px] leading-tight mb-0.5">{topMatch.name}</h3>
              <p className="text-gray-400 text-[13px] line-clamp-1">{sceneries.find(s => s.id === topMatch.placeId)?.address}</p>
            </div>
            <button 
              onClick={() => navigateTo(topMatch.placeId)}
              className="w-full bg-[#3b82f6] text-white rounded-xl h-[44px] font-semibold text-[15px] active:bg-blue-600 transition-colors shadow-sm"
            >
              Navigate here
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
