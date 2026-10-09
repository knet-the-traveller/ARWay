import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
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
}

export default function LandmarkScanner({ video }: LandmarkScannerProps) {
  const router = useRouter();
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
      const vector = await embedFrame(video);
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

  if (!isScanning && loadingPhase !== "error") {
    return (
      <div className="absolute inset-0 pointer-events-none flex flex-col justify-end items-center pb-6 z-20">
        <button 
          onClick={startScanning}
          className="pointer-events-auto bg-[#3b82f6] text-white rounded-full h-[44px] px-8 font-semibold text-[15px] shadow-lg active:bg-blue-600 transition-colors"
        >
          Scan landmarks
        </button>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 pointer-events-none z-20 flex flex-col">
      {/* Top Section */}
      <div className="absolute top-4 left-4 right-4 flex flex-col gap-2 z-30 pointer-events-none">
        <div className="flex justify-between items-start">
          {/* Privacy Badge */}
          {isScanning ? (
            <div className="bg-black/60 backdrop-blur-sm rounded-full px-3 py-1.5 flex items-center shadow-sm">
              <LockIcon className="w-3.5 h-3.5 text-green-400 mr-2 flex-shrink-0" />
              <span className="text-white text-[11px] font-medium whitespace-nowrap">On-device AI</span>
            </div>
          ) : <div />}

          {/* Debug Toggle */}
          {isScanning && loadingPhase === "done" && (
            <button 
              onClick={() => setShowDebug(!showDebug)}
              className="w-[44px] h-[44px] rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center text-gray-300 pointer-events-auto active:bg-black/80 shadow-sm flex-shrink-0"
            >
              <BugIcon className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Neutral State / Status Pill */}
        {isScanning && isNeutral && !topMatch && loadingPhase === "done" && (
          <div className="self-start bg-black/60 backdrop-blur-sm rounded-full px-4 py-2 flex items-center shadow-md transition-opacity">
            <span className="text-white text-[13px] font-medium">
              {debugInfo && debugInfo.top3[0]?.score < MIN_SCORE ? "Not sure" : "Looking for a landmark..."}
            </span>
          </div>
        )}
      </div>

      {/* Bottom Section */}
      <div className="mt-auto p-4 flex flex-col items-center gap-4 w-full z-30 pointer-events-none">
        
        {/* Loading State */}
        {(loadingPhase === "model" || loadingPhase === "references") && (
          <div className="bg-[#1c1c1e]/90 backdrop-blur-md p-4 rounded-xl shadow-xl w-[280px] pointer-events-auto text-center">
            <h3 className="text-white font-semibold text-[15px] mb-2">Loading on-device AI...</h3>
            {loadingPhase === "model" ? (
              <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 transition-all" style={{ width: `${modelProgress}%` }} />
              </div>
            ) : (
              <p className="text-gray-400 text-[13px]">Preparing landmarks ({refDone}/{refTotal})</p>
            )}
          </div>
        )}

        {/* Error State */}
        {loadingPhase === "error" && (
          <div className="bg-[#1c1c1e]/90 backdrop-blur-md p-4 rounded-xl shadow-xl w-[280px] pointer-events-auto flex flex-col items-center">
            <h3 className="text-red-400 font-semibold text-[15px] mb-2">Failed to load</h3>
            <p className="text-gray-400 text-[13px] text-center mb-4">{loadError}</p>
            <button onClick={startScanning} className="bg-gray-700 text-white rounded-lg px-6 py-2 text-[14px] font-semibold active:bg-gray-600">Retry</button>
          </div>
        )}

        {/* Debug Panel (Bottom Area) */}
        {showDebug && debugInfo && isScanning && loadingPhase === "done" && (
          topMatch ? (
            // Compact line if result card is showing
            <div className="w-full bg-black/80 backdrop-blur-md rounded-lg p-2 text-[11px] text-green-400 font-mono shadow-lg pointer-events-auto truncate text-center">
              {deviceUsed} | {Math.round(debugInfo.ms)}ms | {debugInfo.top3[0]?.name} ({(debugInfo.top3[0]?.score || 0).toFixed(3)})
            </div>
          ) : (
            // Full panel otherwise
            <div className="w-full max-h-[40vh] overflow-y-auto bg-black/80 backdrop-blur-md rounded-xl p-3 text-[11px] text-green-400 font-mono shadow-lg pointer-events-auto">
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
          )
        )}

        {/* Match Result Card */}
        {topMatch && (
          <div className="bg-[#1c1c1e]/90 backdrop-blur-md p-3 rounded-2xl shadow-xl w-full max-w-[340px] pointer-events-auto relative animate-in slide-in-from-bottom-4 duration-300">
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
        )}

        {/* Stop Scanning Button */}
        {isScanning && loadingPhase === "done" && (
          <button 
            onClick={stopScanning}
            className="pointer-events-auto bg-gray-800/80 backdrop-blur-sm text-white rounded-full h-[44px] px-6 font-medium text-[14px] shadow-lg border border-gray-700 active:bg-gray-700 transition-colors mb-2"
          >
            Stop scanning
          </button>
        )}
      </div>
    </div>
  );
}
