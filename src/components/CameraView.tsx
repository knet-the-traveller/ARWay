"use client";

import { useEffect, useRef, useState } from "react";

interface CameraViewProps {
  onVideoReady?: (video: HTMLVideoElement | null) => void;
}

export default function CameraView({ onVideoReady }: CameraViewProps = {}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;

    async function startCamera() {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error("Camera API not supported in this environment");
        }

        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: "environment" } },
            audio: false,
          });
        } catch (envErr) {
          // Fallback to any user/default camera (e.g. laptop webcam)
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
        }

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          // Ensure play triggers
          videoRef.current.play().catch(() => {});
        }
      } catch (err: any) {
        setError(err.message || "Camera permission needed");
      }
    }

    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
      if (onVideoReady) {
        onVideoReady(null);
      }
    };
  }, [onVideoReady]);

  const handlePlay = () => {
    if (onVideoReady && videoRef.current) {
      onVideoReady(videoRef.current);
    }
  };

  return (
    <div className="relative w-full h-full bg-neutral-900 overflow-hidden">
      {error ? (
        <div className="flex flex-col items-center justify-center w-full h-full text-white p-4 text-center bg-neutral-950">
          <div className="w-12 h-12 rounded-full bg-neutral-800 flex items-center justify-center mb-3">
            <svg className="w-6 h-6 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-neutral-300">Camera preview unavailable</p>
          <p className="text-xs text-neutral-500 mt-1 max-w-xs">{error}</p>
        </div>
      ) : (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          onPlay={handlePlay}
          onLoadedMetadata={handlePlay}
          className="w-full h-full object-cover"
        />
      )}
      <div className="absolute inset-0 pointer-events-none" />
    </div>
  );
}
