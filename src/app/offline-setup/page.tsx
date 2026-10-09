"use client";

import { useState, useEffect } from "react";
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

export default function OfflineSetupPage() {
  const isOnline = useOnlineStatus();
  const [mounted, setMounted] = useState<boolean>(false);

  // Status block state
  const [swActive, setSwActive] = useState<boolean>(false);
  const [storageInfo, setStorageInfo] = useState<{ usedMb: number; quotaMb: number }>({ usedMb: 0, quotaMb: 0 });
  const [persistent, setPersistent] = useState<boolean>(false);

  // Preparation progress states
  const [isPreparing, setIsPreparing] = useState<boolean>(false);
  const [step1Progress, setStep1Progress] = useState<{ count: number; total: number; label: string; err?: string }>({ count: 0, total: 5, label: "Pending" });
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
      setStep1Progress({ count: 0, total: 5, label: "Starting..." });
      pagesRes = await warmPages((curr, tot, lbl) => {
        setStep1Progress({ count: curr, total: tot, label: lbl });
      });
      setStep1Progress({
        count: pagesRes.pagesCount,
        total: 5,
        label: `Cached ${pagesRes.pagesCount} pages and ${pagesRes.chunksCount} code chunks`
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
      tilesCount = await warmTiles((curr, tot, lbl) => {
        setStep4Progress({ count: curr, total: tot, label: lbl });
      });
      setStep4Progress({ count: tilesCount, total: tilesCount, label: `Cached ${tilesCount} demo map tiles` });
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

  return (
    <main className="flex flex-col w-full flex-1 min-h-0 bg-black text-white relative overflow-hidden">
      <div className="flex-1 min-h-0 overflow-y-auto p-4 font-sans max-w-[420px] w-full mx-auto pb-24 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {/* HEADER */}
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-white tracking-tight">Offline setup</h1>
          <div suppressHydrationWarning className={`px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 ${
            (mounted ? isOnline : true) ? "bg-emerald-950/80 text-emerald-400 border border-emerald-500/30" : "bg-amber-950/80 text-amber-400 border border-amber-500/30"
          }`}>
            <span className={`w-2 h-2 rounded-full ${(mounted ? isOnline : true) ? "bg-emerald-400" : "bg-amber-400"}`} />
            <span suppressHydrationWarning>{(mounted ? isOnline : true) ? "Online" : "Offline"}</span>
          </div>
        </div>

        {/* STATUS BLOCK */}
        <section className="bg-neutral-900 border border-neutral-800 rounded-xl p-3.5 mb-5 space-y-2 text-xs">
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
        </section>

        {/* INSTRUCTIONS */}
        <p className="text-neutral-400 text-xs leading-relaxed mb-4">
          1) Open this page online. 2) Tap Prepare offline. 3) Tap Verify. 4) Turn on airplane mode and reopen the app.
        </p>

        {/* ACTION 1: PREPARE OFFLINE */}
        <div className="mb-6 space-y-3">
          <button
            onClick={handlePrepare}
            disabled={!(mounted ? isOnline : true) || isPreparing}
            className={`w-full h-11 rounded-xl font-semibold text-sm transition-all flex items-center justify-center ${
              !(mounted ? isOnline : true)
                ? "bg-neutral-800 text-neutral-500 cursor-not-allowed"
                : isPreparing
                ? "bg-blue-600/50 text-white cursor-wait"
                : "bg-[#3b82f6] text-white active:bg-blue-700"
            }`}
          >
            {isPreparing ? "Preparing data..." : "Prepare offline"}
          </button>

          {mounted && !isOnline && (
            <p className="text-amber-400/90 text-xs text-center font-medium">
              Connect to the internet once to prepare
            </p>
          )}

          {/* PROGRESS ROWS */}
          {(isPreparing || prepSummary) && (
            <div className="bg-neutral-900/90 border border-neutral-800 rounded-xl p-3 space-y-2.5 text-xs">
              {/* Step 1: Pages */}
              <div>
                <div className="flex justify-between text-neutral-300 font-medium mb-1">
                  <span>1. Pages & Code</span>
                  <span>{step1Progress.count} / {step1Progress.total}</span>
                </div>
                <p className="text-neutral-500 text-[11px] truncate">{step1Progress.label}</p>
                {step1Progress.err && <p className="text-red-400 text-[11px]">{step1Progress.err}</p>}
              </div>

              {/* Step 2: Images */}
              <div>
                <div className="flex justify-between text-neutral-300 font-medium mb-1">
                  <span>2. Sceneries & Images</span>
                  <span>{step2Progress.count}</span>
                </div>
                <p className="text-neutral-500 text-[11px] truncate">{step2Progress.label}</p>
                {step2Progress.err && <p className="text-red-400 text-[11px]">{step2Progress.err}</p>}
              </div>

              {/* Step 3: AI Model */}
              <div>
                <div className="flex justify-between text-neutral-300 font-medium mb-1">
                  <span>3. On-Device AI Model</span>
                  <span>{step3Progress.done ? "Ready" : "..."}</span>
                </div>
                <p className="text-neutral-500 text-[11px] truncate">{step3Progress.label}</p>
                {step3Progress.err && <p className="text-red-400 text-[11px]">{step3Progress.err}</p>}
              </div>

              {/* Step 4: Map Tiles */}
              <div>
                <div className="flex justify-between text-neutral-300 font-medium mb-1">
                  <span>4. Demo Map Tiles</span>
                  <span>{step4Progress.count}</span>
                </div>
                <p className="text-neutral-500 text-[11px] truncate">{step4Progress.label}</p>
                {step4Progress.err && <p className="text-red-400 text-[11px]">{step4Progress.err}</p>}
              </div>
            </div>
          )}

          {prepSummary && (
            <div className="p-2.5 bg-emerald-950/40 border border-emerald-500/20 text-emerald-300 text-xs rounded-xl">
              {prepSummary}
            </div>
          )}
        </div>

        {/* ACTION 2: VERIFY OFFLINE READINESS */}
        <div className="mb-4">
          <button
            onClick={handleVerify}
            disabled={isVerifying}
            className="w-full h-11 rounded-xl font-semibold text-sm bg-neutral-800 border border-neutral-700 text-white active:bg-neutral-700 transition-colors"
          >
            {isVerifying ? "Verifying..." : "Verify offline readiness"}
          </button>

          {verifyList && (
            <div className="mt-3 bg-neutral-900 border border-neutral-800 rounded-xl divide-y divide-neutral-800">
              {verifyList.map((item, idx) => (
                <div key={idx} className="p-3 flex items-start gap-2.5 text-xs">
                  <span className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-[11px] font-bold ${
                    item.ok ? "bg-emerald-500 text-black" : "bg-red-500 text-white"
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

        {/* ACTION 3: COPY REPORT */}
        <div className="mb-4">
          <button
            onClick={handleCopyReport}
            className="w-full h-11 rounded-xl font-medium text-xs bg-neutral-900 text-neutral-300 border border-neutral-800 active:bg-neutral-800 transition-colors"
          >
            Copy report
          </button>
          {copyFeedback && (
            <p className="text-emerald-400 text-xs text-center mt-1.5 font-medium">{copyFeedback}</p>
          )}
        </div>

        {/* ACTION 4: CLEAR OFFLINE DATA */}
        <div className="mb-6">
          <button
            onClick={() => setShowClearModal(true)}
            className="w-full h-11 rounded-xl font-medium text-xs text-red-400 border border-red-500/30 hover:bg-red-500/10 active:bg-red-500/20 transition-colors"
          >
            Clear offline data
          </button>
        </div>
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
