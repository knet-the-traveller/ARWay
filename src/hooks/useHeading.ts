import { useState, useEffect, useCallback, useRef } from "react";
import { normalizeAngle } from "@/lib/geo";

export function useHeading() {
  const [heading, setHeading] = useState<number | null>(null);
  const [pitch, setPitch] = useState<number>(0);
  const [supported, setSupported] = useState(false);
  const [needsPermission, setNeedsPermission] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [calibrationOffset, setCalibrationOffsetState] = useState(0);

  const headingCosRef = useRef(1);
  const headingSinRef = useRef(0);
  const pitchRef = useRef(0);

  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        const savedOffset = localStorage.getItem("arway_heading_offset");
        if (savedOffset) {
          setCalibrationOffsetState(parseFloat(savedOffset));
        }
      }
    } catch (e) {}

    // Check support
    if (typeof window !== "undefined" && window.DeviceOrientationEvent) {
      setSupported(true);
      if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
        setNeedsPermission(true);
      } else {
        startListening();
      }
    }
    
    return () => stopListening();
  }, []);

  const setCalibrationOffset = (n: number) => {
    setCalibrationOffsetState(n);
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem("arway_heading_offset", n.toString());
      }
    } catch (e) {}
  };

  const handleOrientation = useCallback((event: any) => {
    if (event.webkitCompassHeading !== undefined && event.webkitCompassHeading !== null) {
      // iOS Safari
      let h = event.webkitCompassHeading;
      let beta = event.beta || 0;
      
      const p = beta - 90;
      
      const alpha = 0.15;
      headingCosRef.current = headingCosRef.current * (1 - alpha) + Math.cos(h * Math.PI / 180) * alpha;
      headingSinRef.current = headingSinRef.current * (1 - alpha) + Math.sin(h * Math.PI / 180) * alpha;
      pitchRef.current = pitchRef.current * (1 - alpha) + p * alpha;
      
      let smoothedHeading = Math.atan2(headingSinRef.current, headingCosRef.current) * 180 / Math.PI;
      smoothedHeading = (smoothedHeading + 360) % 360;
      
      setHeading(smoothedHeading);
      setPitch(pitchRef.current);
    } else if (event.alpha !== null) {
      // Android / Chrome
      const alphaDeg = event.alpha;
      const betaDeg = event.beta;
      const gammaDeg = event.gamma;

      if (alphaDeg !== null && betaDeg !== null && gammaDeg !== null) {
        const _alpha = alphaDeg * Math.PI / 180;
        const _beta = betaDeg * Math.PI / 180;
        const _gamma = gammaDeg * Math.PI / 180;

        const vx = -Math.cos(_alpha) * Math.sin(_gamma) - Math.sin(_alpha) * Math.sin(_beta) * Math.cos(_gamma);
        const vy = -Math.sin(_alpha) * Math.sin(_gamma) + Math.cos(_alpha) * Math.sin(_beta) * Math.cos(_gamma);

        let h = Math.atan2(vx, vy) * 180 / Math.PI;
        if (vy < 0) {
          h += 180;
        } else if (vx < 0) {
          h += 360;
        }
        h = (h + 360) % 360;

        const p = betaDeg - 90;

        const alphaFilter = 0.15;
        headingCosRef.current = headingCosRef.current * (1 - alphaFilter) + Math.cos(h * Math.PI / 180) * alphaFilter;
        headingSinRef.current = headingSinRef.current * (1 - alphaFilter) + Math.sin(h * Math.PI / 180) * alphaFilter;
        pitchRef.current = pitchRef.current * (1 - alphaFilter) + p * alphaFilter;
        
        let smoothedHeading = Math.atan2(headingSinRef.current, headingCosRef.current) * 180 / Math.PI;
        smoothedHeading = (smoothedHeading + 360) % 360;
        
        setHeading(smoothedHeading);
        setPitch(pitchRef.current);
      }
    }
  }, []);

  const startListening = () => {
    if (typeof window !== "undefined") {
      const w = window as any;
      if ('ondeviceorientationabsolute' in w) {
        w.addEventListener("deviceorientationabsolute", handleOrientation);
      } else {
        w.addEventListener("deviceorientation", handleOrientation);
      }
    }
  };

  const stopListening = () => {
    if (typeof window !== "undefined") {
      const w = window as any;
      w.removeEventListener("deviceorientationabsolute", handleOrientation);
      w.removeEventListener("deviceorientation", handleOrientation);
    }
  };

  const requestPermission = async () => {
    if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
      try {
        const response = await (DeviceOrientationEvent as any).requestPermission();
        if (response === 'granted') {
          setNeedsPermission(false);
          startListening();
        } else {
          setError("Compass permission denied");
        }
      } catch (err: any) {
        setError(err.message || "Failed to request permission");
      }
    }
  };

  const finalHeading = heading !== null ? (heading + calibrationOffset + 360) % 360 : null;

  return { 
    heading: finalHeading, 
    pitch, 
    supported, 
    needsPermission, 
    requestPermission, 
    calibrationOffset, 
    setCalibrationOffset, 
    error 
  };
}
