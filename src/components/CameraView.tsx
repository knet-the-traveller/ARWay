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
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err: any) {
        setError(err.message || "Failed to access camera");
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
    <div className="relative w-full h-full bg-black">
      {error ? (
        <div className="flex items-center justify-center w-full h-full text-white p-4 text-center">
          <p>Camera Error: {error}</p>
        </div>
      ) : (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          onPlay={handlePlay}
          className="w-full h-full object-cover"
        />
      )}
      {/* AR overlay goes here */}
      <div className="absolute inset-0 pointer-events-none" />
    </div>
  );
}
