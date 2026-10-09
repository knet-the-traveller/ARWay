"use client";

import { useEffect, useRef, useState } from "react";
import { LatLng, haversineDistanceM, bearingDeg, normalizeAngle, snapToRoute, sliceAhead, offsetLatLng, lateralOffsetMeters } from "@/lib/geo";

interface ArOverlayProps {
  route: LatLng[] | null;
  position: LatLng | null;
  accuracy: number | null;
  heading: number | null;
  pitch: number;
  active: boolean;
  destination: { lat: number, lng: number, name: string } | null;
  realign?: boolean;
}

const CAMERA_HFOV_DEG = 62;
const CAMERA_HEIGHT_M = 1.4;
const LOOKAHEAD_M = 40;
const LINE_HALF_WIDTH_M = 0.45;
const NEAR_CLIP_M = 1.0;
const MAX_ACCURACY_M = 25;
const EDGE_CLAMP_DEG = 45;
const TURN_AROUND_DEG = 120;
const ON_ROUTE_DEG = 15;
const HEADING_HOLD_MS = 3000;
const POSITION_HOLD_MS = 5000;
const MAX_REALIGN_OFFSET_M = 12;
const REALIGN_SMOOTHING = 0.1;

export default function ArOverlay({ route, position, accuracy, heading, pitch, active, destination, realign = true }: ArOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hudBadgeRef = useRef<HTMLDivElement>(null);
  const hudLabelRef = useRef<HTMLDivElement>(null);
  const hudArrowRef = useRef<SVGSVGElement>(null);

  const lastHeadingRef = useRef<{ val: number, time: number } | null>(null);
  const lastPositionRef = useRef<{ val: LatLng, time: number } | null>(null);
  const lastAccuracyRef = useRef<number | null>(null);
  const routeRef = useRef(route);
  const destinationRef = useRef(destination);
  const pitchRef = useRef(pitch);
  const realignRef = useRef(realign);
  
  const sCosRef = useRef(1);
  const sSinRef = useRef(0);
  const canvasClearedRef = useRef(true);

  const offsetEastRef = useRef(0);
  const offsetNorthRef = useRef(0);

  const [showSafety, setShowSafety] = useState(false);
  const [safetyOpacity, setSafetyOpacity] = useState(0);

  useEffect(() => {
    if (active) {
      setShowSafety(true);
      requestAnimationFrame(() => setSafetyOpacity(1));
      
      const fadeTimer = setTimeout(() => {
        setSafetyOpacity(0);
      }, 4500);
      
      const unmountTimer = setTimeout(() => {
        setShowSafety(false);
      }, 5500);
      
      return () => {
        clearTimeout(fadeTimer);
        clearTimeout(unmountTimer);
      };
    } else {
      setShowSafety(false);
      setSafetyOpacity(0);
    }
  }, [active]);

  useEffect(() => {
    if (heading !== null) lastHeadingRef.current = { val: heading, time: Date.now() };
    if (position !== null) lastPositionRef.current = { val: position, time: Date.now() };
    lastAccuracyRef.current = accuracy;
    routeRef.current = route;
    destinationRef.current = destination;
    pitchRef.current = pitch;
    realignRef.current = realign;
  }, [heading, position, accuracy, route, destination, pitch, realign]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;

    const handleResize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
    };

    handleResize();
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(canvas);

    const draw = () => {
      animationId = requestAnimationFrame(draw);

      if (!active) {
        if (!canvasClearedRef.current) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          canvasClearedRef.current = true;
        }
        return;
      }
      canvasClearedRef.current = false;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const now = Date.now();
      const posObj = lastPositionRef.current;
      const headObj = lastHeadingRef.current;
      const currentRoute = routeRef.current;
      const currentDest = destinationRef.current;

      const hasValidPosition = posObj && (now - posObj.time < POSITION_HOLD_MS);
      const isWeakGps = !hasValidPosition || (lastAccuracyRef.current !== null && lastAccuracyRef.current > MAX_ACCURACY_M);

      if (!posObj) {
        return;
      }

      let currentPos = posObj.val;

      try {
        const snapped = (currentRoute && currentRoute.length > 1) 
          ? snapToRoute(currentRoute, currentPos) 
          : null;

        if (realignRef.current && snapped && currentRoute && currentRoute.length > 1) {
          const latOffset = lateralOffsetMeters(snapped.snappedPoint, currentPos);
          if (latOffset.distanceM <= MAX_REALIGN_OFFSET_M) {
            offsetNorthRef.current += (latOffset.north - offsetNorthRef.current) * REALIGN_SMOOTHING;
            offsetEastRef.current += (latOffset.east - offsetEastRef.current) * REALIGN_SMOOTHING;
            
            const adjLat = currentPos.lat + offsetNorthRef.current / 111139;
            const adjLng = currentPos.lng + offsetEastRef.current / (111139 * Math.cos(currentPos.lat * Math.PI / 180));
            currentPos = { lat: adjLat, lng: adjLng };
          } else {
            offsetNorthRef.current *= 0.9;
            offsetEastRef.current *= 0.9;
          }
        } else {
          offsetNorthRef.current *= 0.9;
          offsetEastRef.current *= 0.9;
        }

        const path = (currentRoute && currentRoute.length > 1 && snapped)
          ? sliceAhead(currentRoute, snapped, LOOKAHEAD_M)
          : (currentDest ? [currentPos, currentDest] : null);

        if (!path || path.length < 2) {
          return;
        }

        const guidePt = path.length > 1 ? path[1] : path[0];
        const currentHeading = headObj 
          ? headObj.val 
          : (guidePt ? bearingDeg(currentPos, guidePt) : 0);

        const rawS = normalizeAngle(bearingDeg(currentPos, guidePt) - currentHeading);
        const sRad = rawS * Math.PI / 180;
        const curCos = Math.cos(sRad);
        const curSin = Math.sin(sRad);
        
        sCosRef.current += (curCos - sCosRef.current) * 0.15;
        sSinRef.current += (curSin - sSinRef.current) * 0.15;
        const smoothedAngle = Math.atan2(sSinRef.current, sCosRef.current) * 180 / Math.PI;

        const absAngle = Math.abs(smoothedAngle);
        let statusText = "On route";
        let statusBg = "rgba(22, 163, 74, 0.85)"; // green-600
        let isSteering = false;

        if (absAngle <= ON_ROUTE_DEG) {
          statusText = "On route";
          statusBg = "rgba(22, 163, 74, 0.85)"; // green
        } else if (absAngle >= TURN_AROUND_DEG) {
          statusText = "Turn around";
          statusBg = "rgba(220, 38, 38, 0.85)"; // red
          isSteering = true;
        } else {
          statusText = smoothedAngle > 0 ? "Bear right" : "Bear left";
          statusBg = "rgba(234, 179, 8, 0.85)"; // yellow
          isSteering = true;
        }

        if (isWeakGps) {
          statusText += " (Weak GPS)";
        }

        if (hudBadgeRef.current && hudLabelRef.current && hudArrowRef.current) {
          hudBadgeRef.current.style.backgroundColor = statusBg;
          hudLabelRef.current.innerText = statusText;
          hudArrowRef.current.style.transform = `rotate(${smoothedAngle}deg)`;
        }

        const w = canvas.width;
        const h = canvas.height;
        const cx = w / 2;
        const cy = h / 2;
        const f = (w / 2) / Math.tan((CAMERA_HFOV_DEG * Math.PI / 180) / 2);

        const pitchDeg = pitchRef.current;
        const pitchRad = pitchDeg * Math.PI / 180;
        const cosPitch = Math.cos(pitchRad);
        const sinPitch = Math.sin(pitchRad);

        const projectPoint = (d: number, relAngleDeg: number, yGround: number) => {
          let steeredRel = relAngleDeg;
          if (isSteering) {
            const steerOffset = smoothedAngle > 0 ? -15 : 15;
            steeredRel += steerOffset;
          }
          steeredRel = Math.max(-EDGE_CLAMP_DEG, Math.min(EDGE_CLAMP_DEG, steeredRel));

          const relRad = steeredRel * Math.PI / 180;
          const x3d = d * Math.sin(relRad);
          let z3d = d * Math.cos(relRad);
          
          if (z3d < NEAR_CLIP_M) z3d = NEAR_CLIP_M;
          
          const y3d = yGround;
          const yRot = y3d * cosPitch - z3d * sinPitch;
          const zRot = y3d * sinPitch + z3d * cosPitch;
          
          return { x: x3d, y: yRot, z: zRot };
        };

        const screenProject = (pt3d: { x: number, y: number, z: number }) => {
          if (pt3d.z < 0.1) return null;
          return {
            sx: cx + f * pt3d.x / pt3d.z,
            sy: cy + f * pt3d.y / pt3d.z
          };
        };

        const time = performance.now() / 1000;
        ctx.globalAlpha = isWeakGps ? 0.6 : 1.0;

        // Collect ribbon quads
        for (let i = 0; i < path.length - 1; i++) {
          const p1 = path[i];
          const p2 = path[i + 1];
          const brng = bearingDeg(p1, p2);
          
          const d1 = haversineDistanceM(currentPos, p1);
          const d2 = haversineDistanceM(currentPos, p2);
          
          const left1 = offsetLatLng(p1, brng - 90, LINE_HALF_WIDTH_M);
          const right1 = offsetLatLng(p1, brng + 90, LINE_HALF_WIDTH_M);
          const left2 = offsetLatLng(p2, brng - 90, LINE_HALF_WIDTH_M);
          const right2 = offsetLatLng(p2, brng + 90, LINE_HALF_WIDTH_M);
          
          const pts = [
            { d: haversineDistanceM(currentPos, left1), rel: normalizeAngle(bearingDeg(currentPos, left1) - currentHeading) },
            { d: haversineDistanceM(currentPos, right1), rel: normalizeAngle(bearingDeg(currentPos, right1) - currentHeading) },
            { d: haversineDistanceM(currentPos, right2), rel: normalizeAngle(bearingDeg(currentPos, right2) - currentHeading) },
            { d: haversineDistanceM(currentPos, left2), rel: normalizeAngle(bearingDeg(currentPos, left2) - currentHeading) }
          ];
          
          const pts3d = pts.map(p => projectPoint(p.d, p.rel, CAMERA_HEIGHT_M));
          const spts = pts3d.map(screenProject);
          if (spts.some(sp => sp === null)) continue;
          
          const alphaFade = Math.max(0, 1 - (d1 / LOOKAHEAD_M));
          
          ctx.fillStyle = `rgba(59, 130, 246, ${isSteering ? 0.28 * alphaFade : 0.4 * alphaFade})`;
          ctx.strokeStyle = `rgba(255, 255, 255, ${isSteering ? 0.6 * alphaFade : 0.8 * alphaFade})`;
          ctx.lineWidth = 2 * window.devicePixelRatio;
          
          ctx.beginPath();
          ctx.moveTo(spts[0]!.sx, spts[0]!.sy);
          ctx.lineTo(spts[1]!.sx, spts[1]!.sy);
          ctx.lineTo(spts[2]!.sx, spts[2]!.sy);
          ctx.lineTo(spts[3]!.sx, spts[3]!.sy);
          ctx.closePath();
          ctx.fill();
          
          // Outlines
          ctx.beginPath();
          if (isSteering) ctx.setLineDash([10 * window.devicePixelRatio, 10 * window.devicePixelRatio]);
          else ctx.setLineDash([]);
          
          ctx.moveTo(spts[0]!.sx, spts[0]!.sy);
          ctx.lineTo(spts[3]!.sx, spts[3]!.sy);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(spts[1]!.sx, spts[1]!.sy);
          ctx.lineTo(spts[2]!.sx, spts[2]!.sy);
          ctx.stroke();
          ctx.setLineDash([]);
        }

        // Chevrons
        let distAlong = 0;
        const chevronSpacing = 3;
        const chevronOffset = (time * 1.5) % chevronSpacing;
        
        for (let i = 0; i < path.length - 1; i++) {
          const p1 = path[i];
          const p2 = path[i + 1];
          const segDist = haversineDistanceM(p1, p2);
          const brng = bearingDeg(p1, p2);
          
          for (let m = chevronOffset; m < segDist; m += chevronSpacing) {
            const actualD = distAlong + m;
            if (actualD > LOOKAHEAD_M) break;
            
            const pt = offsetLatLng(p1, brng, m);
            const ptLeft = offsetLatLng(pt, brng - 135, LINE_HALF_WIDTH_M * 0.8);
            const ptRight = offsetLatLng(pt, brng + 135, LINE_HALF_WIDTH_M * 0.8);
            
            const pts3d = [ptLeft, pt, ptRight].map(p => 
              projectPoint(haversineDistanceM(currentPos, p), normalizeAngle(bearingDeg(currentPos, p) - currentHeading), CAMERA_HEIGHT_M)
            );
            
            const spts = pts3d.map(screenProject);
            if (spts.every(sp => sp !== null)) {
              const alphaFade = Math.max(0, 1 - (actualD / LOOKAHEAD_M));
              ctx.strokeStyle = `rgba(255, 255, 255, ${0.9 * alphaFade})`;
              ctx.lineWidth = 3 * window.devicePixelRatio;
              ctx.beginPath();
              ctx.moveTo(spts[0]!.sx, spts[0]!.sy);
              ctx.lineTo(spts[1]!.sx, spts[1]!.sy);
              ctx.lineTo(spts[2]!.sx, spts[2]!.sy);
              ctx.stroke();
            }
          }
          distAlong += segDist;
        }

        // Destination marker
        if (currentDest) {
          const distToDest = haversineDistanceM(currentPos, currentDest);
          if (distToDest < LOOKAHEAD_M) {
            const rel = normalizeAngle(bearingDeg(currentPos, currentDest) - currentHeading);
            const pt3d = projectPoint(distToDest, rel, CAMERA_HEIGHT_M - 2.0);
            const spt = screenProject(pt3d);
            if (spt) {
              ctx.fillStyle = "rgba(220, 38, 38, 0.9)";
              ctx.beginPath();
              const r = 8 * window.devicePixelRatio;
              ctx.arc(spt.sx, spt.sy, r, 0, Math.PI * 2);
              ctx.fill();
              ctx.strokeStyle = "white";
              ctx.lineWidth = 2 * window.devicePixelRatio;
              ctx.stroke();
              
              ctx.fillStyle = "white";
              ctx.font = `bold ${14 * window.devicePixelRatio}px sans-serif`;
              ctx.textAlign = "center";
              ctx.fillText(currentDest.name, spt.sx, spt.sy - 15 * window.devicePixelRatio);
            }
          }
        }

      } catch (err) {
        console.error("ArOverlay error", err);
      }
    };

    animationId = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animationId);
      resizeObserver.disconnect();
    };
  }, [active]);

  return (
    <div className="absolute inset-0 pointer-events-none z-10">
      <canvas 
        ref={canvasRef} 
        className="absolute inset-0 w-full h-full" 
        style={{ opacity: active ? 1 : 0 }} 
      />
      {showSafety && (
        <div 
          className="absolute top-12 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-sm text-white text-[12px] px-4 py-1.5 rounded-full shadow-md z-20 transition-opacity duration-1000 whitespace-nowrap max-w-[80%] text-center pointer-events-none"
          style={{ opacity: safetyOpacity }}
        >
          Stay on the sidewalk. Watch for traffic.
        </div>
      )}
      {active && (
        <div className="absolute bottom-6 left-0 right-0 flex flex-col items-center justify-end pointer-events-none pb-4">
          <div 
            ref={hudLabelRef} 
            className="text-white text-[14px] font-semibold mb-2" 
            style={{ textShadow: "0px 1px 3px rgba(0,0,0,0.8)" }}
          >
            On route
          </div>
          <div 
            ref={hudBadgeRef} 
            className="w-[56px] h-[56px] rounded-full flex items-center justify-center shadow-lg transition-colors duration-150"
            style={{ backgroundColor: "rgba(22, 163, 74, 0.85)" }}
          >
            <svg 
              ref={hudArrowRef}
              className="w-8 h-8 text-white transition-transform duration-150"
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2.5" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <path d="M12 19V5" />
              <polyline points="5 12 12 5 19 12" />
            </svg>
          </div>
        </div>
      )}
    </div>
  );
}
