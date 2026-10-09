"use client";

import { useEffect, useRef, useState } from "react";

interface CameraViewProps {
  onVideoReady?: (video: HTMLVideoElement | null) => void;
  isActive?: boolean;
  onToggleActive?: () => void;
  zoom?: 0.5 | 1 | 2;
  onZoomChange?: (zoom: 0.5 | 1 | 2) => void;
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

  // Sync external zoom prop if updated externally
  useEffect(() => {
    if (externalZoom !== undefined && externalZoom !== currentZoom) {
      handleSetZoom(externalZoom);
    }
  }, [externalZoom]);

  const handleSetZoom = async (lvl: 0.5 | 1 | 2) => {
    setCurrentZoom(lvl);
    onZoomChange?.(lvl);

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

        // 1. Device enumeration to avoid 0.5x ultra-wide default on Samsung A54 and multi-lens Android devices
        try {
          const devices = await navigator.mediaDevices.enumerateDevices();
          const videoDevices = devices.filter((d) => d.kind === "videoinput");

          const backCameras = videoDevices.filter((d) => {
            const label = d.label.toLowerCase();
            return label.includes("back") || label.includes("rear") || label.includes("environment");
          });

          if (backCameras.length > 1) {
            // Main 1x camera usually has label '0' or does not mention 'ultra' / '0.5' / 'wide-angle'
            const mainCamera = backCameras.find((d) => {
              const label = d.label.toLowerCase();
              return !label.includes("ultra") && !label.includes("0.5") && !label.includes("wide-angle") && !label.includes("wide angle");
            }) || backCameras[0];

            if (mainCamera && mainCamera.deviceId) {
              stream = await navigator.mediaDevices.getUserMedia({
                video: {
                  deviceId: { exact: mainCamera.deviceId },
                  width: { ideal: 1920 },
                  height: { ideal: 1080 }
                },
                audio: false
              });
            }
          }
        } catch (enumErr) {
          console.log("Device enumeration fallback:", enumErr);
        }

        // Standard fallback if specific lens device ID was not selected
        if (!stream) {
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
        }

        if (unmounted || !isActive) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        const [track] = stream.getVideoTracks();
        if (track) {
          trackRef.current = track;
          // Apply initial 1x zoom constraint
          try {
            const capabilities = track.getCapabilities ? (track.getCapabilities() as any) : {};
            if (capabilities && capabilities.zoom) {
              const target = Math.max(1.0, capabilities.zoom.min || 1.0);
              await track.applyConstraints({
                advanced: [{ zoom: target } as any]
              });
            }
          } catch (zErr) {
            console.log("Initial zoom constraint error:", zErr);
          }
        }

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
