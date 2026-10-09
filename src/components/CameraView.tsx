"use client";

import { useEffect, useRef, useState } from "react";

export default function CameraView() {
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
    };
  }, []);

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
          className="w-full h-full object-cover"
        />
      )}
      {/* AR overlay goes here */}
      <div className="absolute inset-0 pointer-events-none" />
    </div>
  );
}
