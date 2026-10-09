"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  useOnlineStatus,
  warmPages,
  warmImages,
  prepareAi,
  warmTiles,
  requestPersistence,
  getStorageSummary,
  verifyOffline,
  clearOfflineData,
  saveOfflineSummary,
  VerifyItem
} from "@/lib/offline";
import { ROUTES_TO_CACHE } from "@/lib/offlineConfig";

export default function OfflineSetupPage() {
  const isOnline = useOnlineStatus();
  const [mounted, setMounted] = useState<boolean>(false);

  // Status block state
  const [swActive, setSwActive] = useState<boolean>(false);
  const [storageInfo, setStorageInfo] = useState<{ usedMb: number; quotaMb: number }>({ usedMb: 0, quotaMb: 0 });
  const [persistent, setPersistent] = useState<boolean>(false);

  // Preparation progress states
  const [isPreparing, setIsPreparing] = useState<boolean>(false);
  const [step1Progress, setStep1Progress] = useState<{ count: number; total: number; label: string; err?: string }>({ count: 0, total: ROUTES_TO_CACHE.length, label: "Pending" });
  const [step2Progress, setStep2Progress] = useState<{ count: number; total: number; label: string; err?: string }>({ count: 0, total: 0, label: "Pending" });
  const [step3Progress, setStep3Progress] = useState<{ label: string; err?: string; done: boolean }>({ label: "Pending", done: false });
  const [step4Progress, setStep4Progress] = useState<{ count: number; total: number; label: string; err?: string }>({ count: 0, total: 0, label: "Pending" });
  const [prepSummary, setPrepSummary] = useState<string | null>(null);

  // Verification results
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [verifyList, setVerifyList] = useState<VerifyItem[] | null>(null);

  // Modal confirm for clear
  const [showClearModal, setShowClearModal] = useState<boolean>(false);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  // Load status
  const refreshStatus = async () => {
    if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
      setSwActive(!!navigator.serviceWorker.controller);
    }
    const storage = await getStorageSummary();
    setStorageInfo(storage);

    if (typeof navigator !== "undefined" && navigator.storage && navigator.storage.persisted) {
      const isPersisted = await navigator.storage.persisted().catch(() => false);
      setPersistent(isPersisted);
    }
  };

  useEffect(() => {
    setMounted(true);
    refreshStatus();
  }, []);

  // 1. Prepare offline execution
  const handlePrepare = async () => {
    if (!isOnline || isPreparing) return;
    setIsPreparing(true);
    setPrepSummary(null);

    let pagesRes = { pagesCount: 0, chunksCount: 0 };
    let imgsCount = 0;
    let aiRes = { success: false, onnxFilesCached: 0 };
    let tilesCount = 0;

    // Step 1: Pages & Chunks
    try {
      setStep1Progress({ count: 0, total: ROUTES_TO_CACHE.length, label: "Starting..." });
      pagesRes = await warmPages((curr, tot, lbl) => {
        setStep1Progress({ count: curr, total: tot, label: lbl });
      });
      setStep1Progress({
        count: pagesRes.pagesCount,
        total: ROUTES_TO_CACHE.length,
        label: `Cached ${pagesRes.pagesCount} core routes (HTML & RSC) and ${pagesRes.chunksCount} code chunks`
      });
    } catch (e: any) {
      setStep1Progress((prev) => ({ ...prev, err: e.message || "Failed to cache pages" }));
    }

    // Step 2: Images
    try {
      setStep2Progress({ count: 0, total: 14, label: "Starting..." });
      imgsCount = await warmImages((curr, tot, lbl) => {
        setStep2Progress({ count: curr, total: tot, label: lbl });
      });
      setStep2Progress({ count: imgsCount, total: imgsCount, label: `Cached ${imgsCount} images` });
    } catch (e: any) {
      setStep2Progress((prev) => ({ ...prev, err: e.message || "Failed to cache images" }));
    }

    // Step 3: AI Model
    try {
      setStep3Progress({ label: "Downloading & initializing model...", done: false });
      aiRes = await prepareAi((lbl) => {
        setStep3Progress({ label: lbl, done: false });
      });
      setStep3Progress({
        label: aiRes.success ? `Model & references ready (${aiRes.onnxFilesCached} runtimes cached)` : "Model preparation partial",
        done: aiRes.success
      });
    } catch (e: any) {
      setStep3Progress({ label: "Failed to initialize model", err: e.message || "Error", done: false });
    }

    // Step 4: Map Tiles
    try {
      setStep4Progress({ count: 0, total: 100, label: "Starting..." });
      let userPos: { lat: number; lng: number } | undefined = undefined;
      try {
        if (typeof navigator !== "undefined" && "geolocation" in navigator) {
          userPos = await new Promise((resolve) => {
            navigator.geolocation.getCurrentPosition(
              (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
              () => resolve(undefined),
              { timeout: 2000, maximumAge: 60000 }
            );
          });
        }
      } catch {}

      tilesCount = await warmTiles((curr, tot, lbl) => {
        setStep4Progress({ count: curr, total: tot, label: lbl });
      }, userPos);
      setStep4Progress({ count: tilesCount, total: tilesCount, label: `Cached ${tilesCount} map tiles (${userPos ? "local neighborhood + demo areas" : "demo areas"})` });
    } catch (e: any) {
      setStep4Progress((prev) => ({ ...prev, err: e.message || "Failed to cache tiles" }));
    }

    // Request persistent storage
    const granted = await requestPersistence();
    setPersistent(granted);

    saveOfflineSummary({
      time: Date.now(),
      pages: pagesRes.pagesCount,
      images: imgsCount,
      tiles: tilesCount,
      aiReady: aiRes.success
    });

    await refreshStatus();
    setIsPreparing(false);
    setPrepSummary(`Offline preparation complete! ${pagesRes.pagesCount} pages, ${imgsCount} images, ${tilesCount} tiles saved.`);
  };

  // 2. Verify offline readiness
  const handleVerify = async () => {
    setIsVerifying(true);
    const list = await verifyOffline();
    setVerifyList(list);
    await refreshStatus();
    setIsVerifying(false);
  };

  // 3. Copy plain text report
  const handleCopyReport = () => {
    const lines = [
      "=== ARWay Offline Verification Report ===",
      `Status: ${isOnline ? "Online" : "Offline (Airplane Mode)"}`,
      `Service Worker: ${swActive ? "Active" : "Not Active"}`,
      `Storage Used: ${storageInfo.usedMb} MB / ${storageInfo.quotaMb} MB`,
      `Persistence Granted: ${persistent ? "Yes" : "No"}`,
      `Preparation: ${prepSummary || "Not prepared in this session"}`
    ];

    if (verifyList) {
      lines.push("\n--- Verification Checklist ---");
      for (const item of verifyList) {
        lines.push(`[${item.ok ? "PASS" : "FAIL"}] ${item.label}: ${item.detail}`);
      }
    }

    const reportText = lines.join("\n");
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(reportText).then(() => {
        setCopyFeedback("Report copied to clipboard!");
        setTimeout(() => setCopyFeedback(null), 3000);
      });
    }
  };

  // 4. Clear all data
  const handleConfirmClear = async () => {
    setShowClearModal(false);
    await clearOfflineData();
    setVerifyList(null);
    setPrepSummary(null);
    setStep1Progress({ count: 0, total: 5, label: "Pending" });
    setStep2Progress({ count: 0, total: 0, label: "Pending" });
    setStep3Progress({ label: "Pending", done: false });
    setStep4Progress({ count: 0, total: 0, label: "Pending" });
    await refreshStatus();
  };

  const [showDiagnostics, setShowDiagnostics] = useState<boolean>(false);

  // Check if pack is already installed
  const isPackInstalled = Boolean(prepSummary || storageInfo.usedMb > 30 || step3Progress.done);

  return (
    <main className="flex flex-col w-full flex-1 min-h-0 bg-black text-white relative overflow-hidden">
      <div className="flex-1 min-h-0 overflow-y-auto p-4 font-sans max-w-[420px] w-full mx-auto pb-24 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {/* HEADER */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Link
              href="/maps"
              className="w-8 h-8 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-300 hover:text-white active:bg-neutral-800 transition-colors shrink-0"
              title="Back to Maps"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div>
              <h1 className="text-lg font-bold text-white tracking-tight">Offline Sync</h1>
              <p className="text-[11px] text-neutral-400">On-Device AI & Maps Cache</p>
            </div>
          </div>
          <div suppressHydrationWarning className={`px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 ${(mounted ? isOnline : true) ? "bg-emerald-950/80 text-emerald-400 border border-emerald-500/30" : "bg-sky-950/80 text-sky-400 border border-sky-500/30"
            }`}>
            <span className={`w-2 h-2 rounded-full ${(mounted ? isOnline : true) ? "bg-emerald-400" : "bg-sky-400"}`} />
            <span suppressHydrationWarning>{(mounted ? isOnline : true) ? "Online (Wi-Fi)" : "Airplane Mode"}</span>
          </div>
        </div>

        {/* ASSETS SUMMARY CARD */}
        <section className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 mb-4">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-xs font-semibold text-white">Local Cache Assets</h2>
            <span suppressHydrationWarning className="text-[11px] font-mono text-neutral-400">
              {storageInfo.usedMb} MB / {storageInfo.quotaMb || 10240} MB
            </span>
          </div>

          <p className="text-xs text-neutral-400 leading-relaxed mb-3">
            Syncing stores all required models and maps locally so tourists in stone fortresses and historical zones can navigate streets and scan landmarks with zero cellular data or roaming fees.
          </p>

          <ul className="space-y-2 text-xs text-neutral-300 border-t border-neutral-800/80 pt-3">
            <li className="flex items-start gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-neutral-400 mt-1.5 shrink-0" />
              <span><strong>Vision model:</strong> Quantized CLIP neural network for on-device landmark recognition</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-neutral-400 mt-1.5 shrink-0" />
              <span><strong>Reference embeddings:</strong> 14 heritage landmark photo vectors</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-neutral-400 mt-1.5 shrink-0" />
              <span><strong>Map tiles:</strong> Intramuros & Makati demo area zoom tiles (14–17)</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-neutral-400 mt-1.5 shrink-0" />
              <span><strong>App shell:</strong> Offline recovery pages and static assets</span>
            </li>
          </ul>
        </section>

        {/* SYNC ACTION CARD */}
        <section className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 mb-4 space-y-3">
          <div className="flex justify-between items-center text-xs">
            <span className="text-neutral-400">Sync status</span>
            <span suppressHydrationWarning className={`font-semibold flex items-center gap-1.5 text-xs ${
              isPackInstalled ? "text-emerald-400" : "text-red-400"
            }`}>
              <span className={`w-2 h-2 rounded-full ${isPackInstalled ? "bg-emerald-400 shadow-[0_0_6px_#10b981]" : "bg-red-500 shadow-[0_0_6px_#ef4444]"}`} />
              <span>{isPackInstalled ? "Offline Synced" : "Offline Not Synced"}</span>
            </span>
          </div>

          {/* Sync Button */}
          <button
            onClick={handlePrepare}
            disabled={!(mounted ? isOnline : true) || isPreparing}
            className={`w-full h-11 rounded-xl font-medium text-xs transition-all flex items-center justify-center gap-2 shadow-sm ${
              !(mounted ? isOnline : true)
                ? "bg-neutral-800 text-neutral-500 cursor-not-allowed"
                : isPreparing
                  ? "bg-blue-600/60 text-white cursor-wait"
                  : isPackInstalled
                    ? "bg-neutral-800 hover:bg-neutral-750 text-neutral-200 border border-neutral-700 active:bg-neutral-700"
                    : "bg-[#3b82f6] hover:bg-blue-600 text-white active:bg-blue-700"
            }`}
          >
            {isPreparing ? (
              <>
                <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                <span>Syncing offline data...</span>
              </>
            ) : isPackInstalled ? (
              <span>Re-sync offline data</span>
            ) : (
              <span>Sync for offline use</span>
            )}
          </button>

          {mounted && !isOnline && (
            <p className="text-amber-400 text-xs text-center font-medium">
              Connect to Wi-Fi to sync offline assets.
            </p>
          )}

          {/* PROGRESS ROWS (VISIBLE DURING/AFTER SYNC) */}
          {(isPreparing || prepSummary) && (
            <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-3 space-y-2 text-xs mt-3">
              <div>
                <div className="flex justify-between text-neutral-300 mb-0.5">
                  <span>App shell</span>
                  <span className="font-mono text-neutral-400">{step1Progress.count}/{step1Progress.total}</span>
                </div>
                <p className="text-neutral-500 text-[11px] truncate">{step1Progress.label}</p>
                {step1Progress.err && <p className="text-red-400 text-[11px]">{step1Progress.err}</p>}
              </div>

              <div>
                <div className="flex justify-between text-neutral-300 mb-0.5">
                  <span>Reference photos</span>
                  <span className="font-mono text-neutral-400">{step2Progress.count}</span>
                </div>
                <p className="text-neutral-500 text-[11px] truncate">{step2Progress.label}</p>
                {step2Progress.err && <p className="text-red-400 text-[11px]">{step2Progress.err}</p>}
              </div>

              <div>
                <div className="flex justify-between text-neutral-300 mb-0.5">
                  <span>Vision model</span>
                  <span className="font-mono text-neutral-400">{step3Progress.done ? "Ready" : "..."}</span>
                </div>
                <p className="text-neutral-500 text-[11px] truncate">{step3Progress.label}</p>
                {step3Progress.err && <p className="text-red-400 text-[11px]">{step3Progress.err}</p>}
              </div>

              <div>
                <div className="flex justify-between text-neutral-300 mb-0.5">
                  <span>Map tiles</span>
                  <span className="font-mono text-neutral-400">{step4Progress.count}</span>
                </div>
                <p className="text-neutral-500 text-[11px] truncate">{step4Progress.label}</p>
                {step4Progress.err && <p className="text-red-400 text-[11px]">{step4Progress.err}</p>}
              </div>
            </div>
          )}

          {prepSummary && (
            <div className="p-2.5 bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs rounded-lg">
              {prepSummary}
            </div>
          )}
        </section>

        {/* AIRPLANE MODE INSTRUCTIONS */}
        <section className="bg-neutral-900 border border-neutral-800 rounded-xl p-3.5 mb-4 text-xs space-y-1.5">
          <div className="font-medium text-neutral-200">Testing offline mode:</div>
          <ol className="list-decimal list-inside space-y-1 text-neutral-400 leading-relaxed pl-1 text-[11px]">
            <li>Sync assets while online.</li>
            <li>Enable Airplane Mode (disable Wi-Fi and Cellular).</li>
            <li>Reopen app — camera vision, maps, and AR navigation will run locally.</li>
          </ol>
        </section>

        {/* COLLAPSIBLE DEVELOPER & CACHE DIAGNOSTICS FOR JUDGES */}
        <section className="border border-neutral-800/80 rounded-2xl overflow-hidden mb-6">
          <button
            onClick={() => setShowDiagnostics(!showDiagnostics)}
            className="w-full p-3.5 bg-neutral-900 hover:bg-neutral-850 flex items-center justify-between text-left transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="text-sm">⚙️</span>
              <div>
                <span className="text-xs font-bold text-neutral-200">Developer & Cache Diagnostics</span>
                <p className="text-[10px] text-neutral-500">Technical audit tools for hackathon judges</p>
              </div>
            </div>
            <span className={`text-neutral-400 text-xs transition-transform duration-200 ${showDiagnostics ? "rotate-180" : ""}`}>
              ▼
            </span>
          </button>

          {showDiagnostics && (
            <div className="p-4 bg-neutral-950 border-t border-neutral-800 space-y-4 text-xs">
              {/* RAW CACHE STATUS */}
              <div className="space-y-2 bg-neutral-900/80 rounded-xl p-3 border border-neutral-800/80">
                <div className="flex justify-between items-center">
                  <span className="text-neutral-400">Service Worker</span>
                  <span suppressHydrationWarning className={swActive ? "text-emerald-400 font-medium" : "text-amber-400 font-medium"}>
                    {swActive ? "Active" : "Not active (open HTTPS prod)"}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-neutral-400">Storage Used</span>
                  <span suppressHydrationWarning className="text-neutral-200 font-mono">
                    {storageInfo.usedMb} MB / {storageInfo.quotaMb} MB
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-neutral-400">Persistence Granted</span>
                  <span suppressHydrationWarning className={persistent ? "text-emerald-400 font-medium" : "text-neutral-400"}>
                    {persistent ? "Yes" : "No"}
                  </span>
                </div>
              </div>

              {/* ACTION: VERIFY OFFLINE READINESS */}
              <div>
                <button
                  onClick={handleVerify}
                  disabled={isVerifying}
                  className="w-full h-10 rounded-xl font-semibold text-xs bg-neutral-800 border border-neutral-700 text-white active:bg-neutral-700 transition-colors"
                >
                  {isVerifying ? "Verifying..." : "Run Technical Verification Test"}
                </button>

                {verifyList && (
                  <div className="mt-3 bg-neutral-900 border border-neutral-800 rounded-xl divide-y divide-neutral-800">
                    {verifyList.map((item, idx) => (
                      <div key={idx} className="p-2.5 flex items-start gap-2.5 text-xs">
                        <span className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-bold ${item.ok ? "bg-emerald-500 text-black" : "bg-red-500 text-white"
                          }`}>
                          {item.ok ? "✓" : "✕"}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-neutral-200">{item.label}</div>
                          <div className="text-neutral-400 text-[11px] mt-0.5">{item.detail}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ACTION: COPY REPORT */}
              <div>
                <button
                  onClick={handleCopyReport}
                  className="w-full h-10 rounded-xl font-medium text-xs bg-neutral-900 text-neutral-300 border border-neutral-800 active:bg-neutral-800 transition-colors"
                >
                  Copy Diagnostic Report
                </button>
                {copyFeedback && (
                  <p className="text-emerald-400 text-xs text-center mt-1.5 font-medium">{copyFeedback}</p>
                )}
              </div>

              {/* ACTION: CLEAR OFFLINE DATA */}
              <div>
                <button
                  onClick={() => setShowClearModal(true)}
                  className="w-full h-10 rounded-xl font-medium text-xs text-red-400 border border-red-500/30 hover:bg-red-500/10 active:bg-red-500/20 transition-colors"
                >
                  Clear Cached Offline Data
                </button>
              </div>
            </div>
          )}
        </section>
      </div>

      {/* CONFIRM MODAL */}
      {showClearModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 max-w-[320px] w-full text-center space-y-4">
            <h3 className="text-base font-bold text-white">Clear offline data?</h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
              This removes the saved app, model and map data from this device.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowClearModal(false)}
                className="flex-1 h-10 rounded-xl bg-neutral-800 text-neutral-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmClear}
                className="flex-1 h-10 rounded-xl bg-red-600 text-white text-xs font-semibold"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
  