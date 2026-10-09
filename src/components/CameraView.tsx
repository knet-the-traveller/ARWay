"use client";

import { useEffect, useRef, useState } from "react";

interface CameraViewProps {
  onVideoReady?: (video: HTMLVideoElement | null) => void;
  isActive?: boolean;
  onToggleActive?: () => void;
  zoom?: 0.5 | 1 | 2;
  onZoomChange?: (zoom: 0.5 | 1 | 2) => void;
}

interface RearLensInfo {
  deviceId: string;
  label: string;
  name: string;
  isUltraWide: boolean;
  isMain: boolean;
}

export default function CameraView({ 
  onVideoReady, 
  isActive = true, 
  onToggleActive,
  zoom: externalZoom,
  onZoomChange
}: CameraViewProps = {}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const trackRef = useRef<MediaStreamTrack | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [currentZoom, setCurrentZoom] = useState<0.5 | 1 | 2>(externalZoom || 1);
  const [usingCssZoom, setUsingCssZoom] = useState(false);
  
  // Hardware multi-lens state for Samsung A54 and multi-camera devices
  const [availableLenses, setAvailableLenses] = useState<RearLensInfo[]>([]);
  const [activeLens, setActiveLens] = useState<RearLensInfo | null>(null);
  const [mainLensId, setMainLensId] = useState<string | null>(null);
  const [ultraWideLensId, setUltraWideLensId] = useState<string | null>(null);

  // Sync external zoom prop if updated externally
  useEffect(() => {
    if (externalZoom !== undefined && externalZoom !== currentZoom) {
      handleSetZoom(externalZoom);
    }
  }, [externalZoom]);

  // Helper to switch physical hardware video stream by deviceId
  const switchPhysicalStream = async (deviceId: string, targetZoomLevel: 0.5 | 1 | 2 = 1) => {
    try {
      setStarting(true);
      // Stop existing hardware stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      trackRef.current = null;

      const newStream = await navigator.mediaDevices.getUserMedia({
        video: {
          deviceId: { exact: deviceId },
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      });

      streamRef.current = newStream;
      const [newTrack] = newStream.getVideoTracks();
      if (newTrack) {
        trackRef.current = newTrack;
        // Try hardware zoom if targetZoomLevel is 2x
        if (targetZoomLevel === 2) {
          try {
            const caps = newTrack.getCapabilities ? (newTrack.getCapabilities() as any) : {};
            if (caps && caps.zoom && caps.zoom.max >= 2) {
              await newTrack.applyConstraints({ advanced: [{ zoom: 2 } as any] });
              setUsingCssZoom(false);
            } else {
              setUsingCssZoom(true);
            }
          } catch {
            setUsingCssZoom(true);
          }
        } else {
          setUsingCssZoom(false);
        }
      }

      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
        await videoRef.current.play().catch(() => {});
      }

      // Update active lens state
      const matched = availableLenses.find((l) => l.deviceId === deviceId);
      if (matched) {
        setActiveLens(matched);
      }
    } catch (e: any) {
      console.warn("Failed to switch physical camera stream:", e);
    } finally {
      setStarting(false);
    }
  };

  const handleSetZoom = async (lvl: 0.5 | 1 | 2) => {
    setCurrentZoom(lvl);
    onZoomChange?.(lvl);

    // If switching to 0.5x and a dedicated ultra-wide hardware sensor exists:
    if (lvl === 0.5 && ultraWideLensId && activeLens?.deviceId !== ultraWideLensId) {
      console.log("Switching physical sensor to Ultra-Wide (0.5x)...");
      await switchPhysicalStream(ultraWideLensId, 0.5);
      return;
    }

    // If switching to 1x or 2x and we are currently on ultra-wide, switch back to main 1x sensor:
    if ((lvl === 1 || lvl === 2) && mainLensId && activeLens?.deviceId !== mainLensId) {
      console.log("Switching physical sensor back to Main 1x (50MP)...");
      await switchPhysicalStream(mainLensId, lvl);
      return;
    }

    // Otherwise apply zoom on the current active sensor:
    const track = trackRef.current;
    let hardwareApplied = false;

    if (track) {
      try {
        const capabilities = track.getCapabilities ? (track.getCapabilities() as any) : {};
        if (capabilities && capabilities.zoom) {
          const min = capabilities.zoom.min ?? 1;
          const max = capabilities.zoom.max ?? 10;
          if (lvl >= min && lvl <= max) {
            await track.applyConstraints({
              advanced: [{ zoom: lvl } as any]
            });
            hardwareApplied = true;
          }
        }
      } catch (e) {
        console.log("Hardware zoom apply exception:", e);
      }
    }

    setUsingCssZoom(!hardwareApplied);
  };

  // Cycle through physical lenses manually (allows instant hardware verification)
  const cyclePhysicalLens = async () => {
    if (availableLenses.length <= 1) return;
    const currentIndex = availableLenses.findIndex((l) => l.deviceId === activeLens?.deviceId);
    const nextIndex = (currentIndex + 1) % availableLenses.length;
    const nextLens = availableLenses[nextIndex];
    if (nextLens) {
      console.log(`Manually switching to lens: ${nextLens.name} (${nextLens.deviceId})`);
      await switchPhysicalStream(nextLens.deviceId, currentZoom);
      setActiveLens(nextLens);
      // Auto-sync zoom pill to 0.5x if ultra-wide, or 1x if main
      if (nextLens.isUltraWide) {
        setCurrentZoom(0.5);
        onZoomChange?.(0.5);
      } else if (nextLens.isMain && currentZoom === 0.5) {
        setCurrentZoom(1);
        onZoomChange?.(1);
      }
    }
  };

  useEffect(() => {
    let unmounted = false;

    async function startCamera() {
      if (!isActive) return;
      setError(null);
      setStarting(true);
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error("Camera API not supported in this environment");
        }

        let stream: MediaStream | null = null;

        // Step 1: Open initial camera stream to grant camera permissions
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { 
              facingMode: { ideal: "environment" },
              width: { ideal: 1920 },
              height: { ideal: 1080 }
            },
            audio: false,
          });
        } catch {
          // Fallback to any default camera (e.g. laptop webcam)
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
        }

        if (unmounted || !isActive) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        // Step 2: Now that permissions are active, enumerate devices with full labels!
        let discoveredMainId: string | null = null;
        let discoveredUltraWideId: string | null = null;
        let parsedLenses: RearLensInfo[] = [];

        try {
          const allDevices = await navigator.mediaDevices.enumerateDevices();
          const videoDevices = allDevices.filter((d) => d.kind === "videoinput");

          // Exclude front/selfie cameras
          const rearCandidates = videoDevices.filter((d) => {
            const lbl = (d.label || "").toLowerCase();
            return !lbl.includes("front") && !lbl.includes("selfie") && !lbl.includes("user");
          });

          // Filter for back cameras or fallback to rearCandidates
          const explicitBack = rearCandidates.filter((d) => {
            const lbl = (d.label || "").toLowerCase();
            return lbl.includes("back") || lbl.includes("rear") || lbl.includes("environment") || lbl.includes("camera2");
          });

          const pool = explicitBack.length > 0 ? explicitBack : rearCandidates;

          parsedLenses = pool.map((d, index) => {
            const lbl = (d.label || "").toLowerCase();
            // On Samsung Galaxy A54:
            // "camera2 0, facing back" -> Main 50MP 1x
            // "camera2 2, facing back" -> Ultra-wide 12MP 0.5x
            // "camera2 3, facing back" -> Macro
            const isUltra = lbl.includes("ultra") || lbl.includes("0.5") || lbl.includes("wide-angle") || lbl.includes("camera2 2") || lbl.includes("camera 2");
            const isMain = lbl.includes("camera2 0") || lbl.includes("camera 0") || lbl.includes("back 0") || (!isUltra && !lbl.includes("macro") && (index === 0 || lbl.includes("main")));

            let name = `Camera ${index + 1}`;
            if (isUltra) name = "0.5x Ultra-Wide";
            else if (isMain) name = "1x Main (50MP)";
            else if (lbl.includes("macro")) name = "Macro";

            return {
              deviceId: d.deviceId,
              label: d.label || `Camera ${index + 1}`,
              name,
              isUltraWide: isUltra,
              isMain
            };
          });

          // Find specific Main vs UltraWide IDs
          const mainObj = parsedLenses.find((l) => l.isMain) || parsedLenses[0];
          const ultraObj = parsedLenses.find((l) => l.isUltraWide) || parsedLenses.find((l) => l.deviceId !== mainObj?.deviceId);

          if (mainObj) discoveredMainId = mainObj.deviceId;
          if (ultraObj && ultraObj.deviceId !== discoveredMainId) discoveredUltraWideId = ultraObj.deviceId;

          setAvailableLenses(parsedLenses);
          setMainLensId(discoveredMainId);
          setUltraWideLensId(discoveredUltraWideId);

          // Step 3: Check currently active track.
          // On Samsung A54, "facingMode: { ideal: 'environment' }" often defaults to camera2 2 (Ultra-wide)!
          // If we want 1x (default) and the active track is NOT the main 50MP sensor, switch immediately!
          const activeTrack = stream.getVideoTracks()[0];
          const activeTrackLabel = (activeTrack?.label || "").toLowerCase();
          const activeTrackSettings = activeTrack?.getSettings ? activeTrack.getSettings() : {};
          const activeDeviceId = activeTrackSettings.deviceId;

          const isCurrentlyUltraWide = activeTrackLabel.includes("camera2 2") || 
            activeTrackLabel.includes("ultra") || 
            (discoveredUltraWideId && activeDeviceId === discoveredUltraWideId);

          if (discoveredMainId && (isCurrentlyUltraWide || (activeDeviceId && activeDeviceId !== discoveredMainId))) {
            console.log("Samsung A54 default was ultra-wide; immediately switching to physical 1x Main sensor:", discoveredMainId);
            // Stop ultra-wide bootstrap stream
            stream.getTracks().forEach((t) => t.stop());

            // Open the physical 50MP Main 1x camera
            stream = await navigator.mediaDevices.getUserMedia({
              video: {
                deviceId: { exact: discoveredMainId },
                width: { ideal: 1920 },
                height: { ideal: 1080 }
              },
              audio: false
            });
          }
        } catch (enumErr) {
          console.warn("Post-permission camera enumeration note:", enumErr);
        }

        if (unmounted || !isActive) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        const [track] = stream.getVideoTracks();
        if (track) {
          trackRef.current = track;
        }

        // Set active lens info
        const activeTrackSettings = track?.getSettings ? track.getSettings() : {};
        const currentDevId = activeTrackSettings.deviceId;
        const currentLens = parsedLenses.find((l) => l.deviceId === currentDevId) || 
          parsedLenses.find((l) => l.isMain) || 
          (parsedLenses.length > 0 ? parsedLenses[0] : null);
        setActiveLens(currentLens);

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      } catch (err: any) {
        if (!unmounted) {
          setError(err.message || "Camera permission needed");
        }
      } finally {
        if (!unmounted) {
          setStarting(false);
        }
      }
    }

    if (isActive) {
      startCamera();
    } else {
      // Release hardware camera sensor immediately
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      trackRef.current = null;
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      if (onVideoReady) {
        onVideoReady(null);
      }
    }

    return () => {
      unmounted = true;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      trackRef.current = null;
      if (onVideoReady) {
        onVideoReady(null);
      }
    };
  }, [isActive, onVideoReady]);

  const handlePlay = () => {
    if (onVideoReady && videoRef.current && isActive) {
      onVideoReady(videoRef.current);
    }
  };

  const cssScale = usingCssZoom
    ? (currentZoom === 2 ? 2.0 : currentZoom === 0.5 ? 0.8 : 1.0)
    : 1.0;

  return (
    <div className="relative w-full h-full bg-neutral-950 overflow-hidden select-none">
      {!isActive ? (
        /* BATTERY & CPU SAVER STANDBY SCREEN */
        <div className="flex flex-col items-center justify-center w-full h-full bg-[#0a0a0c] text-white p-6 text-center relative overflow-hidden">
          <div className="absolute w-56 h-56 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

          <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-3 shadow-inner text-neutral-400">
            <svg className="w-6 h-6 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              <line x1="3" y1="3" x2="21" y2="21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>

          <h4 className="text-sm font-semibold text-white">Camera in Standby</h4>
          <p className="text-[11px] text-neutral-400 mt-1 max-w-[230px] leading-relaxed">
            Camera sensor turned off to preserve battery life and prevent phone overheating.
          </p>

          {onToggleActive && (
            <button
              type="button"
              onClick={onToggleActive}
              className="mt-3.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-xs font-semibold rounded-xl shadow-lg shadow-blue-600/25 transition-all flex items-center gap-2 pointer-events-auto"
            >
              <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
              <span>Turn On Camera</span>
            </button>
          )}
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center w-full h-full text-white p-4 text-center bg-neutral-950">
          <div className="w-12 h-12 rounded-full bg-neutral-800 flex items-center justify-center mb-3">
            <svg className="w-6 h-6 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-neutral-300">Camera preview unavailable</p>
          <p className="text-xs text-neutral-500 mt-1 max-w-xs">{error}</p>
          {onToggleActive && (
            <button
              type="button"
              onClick={onToggleActive}
              className="mt-3 px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold text-neutral-200 rounded-lg"
            >
              Retry Camera
            </button>
          )}
        </div>
      ) : (
        <>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            onPlay={handlePlay}
            onLoadedMetadata={handlePlay}
            className="w-full h-full object-cover origin-center"
            style={{ 
              transform: `scale(${cssScale})`, 
              transition: "transform 0.25s ease-out" 
            }}
          />

          {starting && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center pointer-events-none">
              <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {/* PHYSICAL LENS INDICATOR & TOGGLE (Direct hardware switch for Samsung multi-lens) */}
          {availableLenses.length > 1 && (
            <div className="absolute bottom-2.5 left-2.5 z-30 pointer-events-auto">
              <button
                type="button"
                onClick={cyclePhysicalLens}
                className="bg-black/65 hover:bg-black/85 backdrop-blur-md px-2 py-1 rounded-full border border-white/10 text-[10px] text-neutral-300 hover:text-white flex items-center gap-1 shadow-md active:scale-95 transition-all select-none"
                title="Tap to switch physical rear camera sensor (Main 50MP vs Ultra-wide 12MP)"
              >
                <svg className="w-3 h-3 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span className="font-semibold text-[10px] text-blue-300">{activeLens?.name || "Lens"}</span>
              </button>
            </div>
          )}

          {/* NATIVE 0.5x | 1x | 2x SEGMENTED ZOOM PILL */}
          <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 z-30 pointer-events-auto bg-black/65 backdrop-blur-md px-1 py-0.5 rounded-full border border-white/10 flex items-center gap-1 shadow-xl select-none">
            {([0.5, 1, 2] as const).map((level) => (
              <button
                key={level}
                type="button"
                onClick={() => handleSetZoom(level)}
                className={`h-6 px-2.5 rounded-full text-[11px] font-bold transition-all flex items-center justify-center active:scale-90 ${
                  currentZoom === level
                    ? "bg-white text-black shadow-md font-extrabold scale-105"
                    : "text-neutral-400 hover:text-white hover:bg-white/10"
                }`}
                title={`Set camera zoom to ${level}x`}
              >
                {level}x
              </button>
            ))}
          </div>

          {/* QUICK PAUSE TOGGLE PILL AT BOTTOM RIGHT OF CAMERA */}
          {onToggleActive && (
            <div className="absolute bottom-2.5 right-2.5 z-30 pointer-events-auto">
              <button
                type="button"
                onClick={onToggleActive}
                className="bg-black/65 hover:bg-black/85 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10 text-[10px] text-neutral-300 hover:text-white flex items-center gap-1.5 shadow-md active:scale-95 transition-all select-none"
                title="Pause camera sensor to save battery and cool phone down"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Pause Cam</span>
              </button>
            </div>
          )}
        </>
      )}
      <div className="absolute inset-0 pointer-events-none" />
    </div>
  );
}
