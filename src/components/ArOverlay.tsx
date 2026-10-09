import { useEffect, useRef } from "react";
import { LatLng, haversineDistanceM, bearingDeg, normalizeAngle, snapToRoute, sliceAhead, offsetLatLng } from "@/lib/geo";

interface ArOverlayProps {
  route: LatLng[] | null;
  position: LatLng | null;
  accuracy: number | null;
  heading: number | null;
  pitch: number;
  active: boolean;
  destination: { lat: number, lng: number, name: string } | null;
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

export default function ArOverlay({ route, position, accuracy, heading, pitch, active, destination }: ArOverlayProps) {
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
  
  const sCosRef = useRef(1);
  const sSinRef = useRef(0);
  const canvasClearedRef = useRef(true);

  useEffect(() => {
    if (heading !== null) lastHeadingRef.current = { val: heading, time: Date.now() };
    if (position !== null) lastPositionRef.current = { val: position, time: Date.now() };
    lastAccuracyRef.current = accuracy;
    routeRef.current = route;
    destinationRef.current = destination;
    pitchRef.current = pitch;
  }, [heading, position, accuracy, route, destination, pitch]);

  useEffect(() => {
    if (!active) {
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext("2d");
        if (ctx) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        canvasClearedRef.current = true;
      }
      return;
    }
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;
    let resizeObserver: ResizeObserver;

    const updateSize = () => {
      const rect = canvas.parentElement?.getBoundingClientRect();
      if (rect) {
        canvas.width = rect.width * window.devicePixelRatio;
        canvas.height = rect.height * window.devicePixelRatio;
        canvas.style.width = `${rect.width}px`;
        canvas.style.height = `${rect.height}px`;
      }
    };

    resizeObserver = new ResizeObserver(updateSize);
    if (canvas.parentElement) {
      resizeObserver.observe(canvas.parentElement);
    }
    updateSize();

    const draw = () => {
      animationId = requestAnimationFrame(draw);
      
      const now = Date.now();
      let currentHeading = null;
      if (lastHeadingRef.current && (now - lastHeadingRef.current.time < HEADING_HOLD_MS)) {
        currentHeading = lastHeadingRef.current.val;
      }
      
      let currentPos = null;
      if (lastPositionRef.current && (now - lastPositionRef.current.time < POSITION_HOLD_MS)) {
        currentPos = lastPositionRef.current.val;
      }
      
      const currentRoute = routeRef.current;
      const currentDest = destinationRef.current;
      const currentPitch = pitchRef.current;
      const currentAcc = lastAccuracyRef.current;
      
      const width = canvas.width;
      const height = canvas.height;

      if (!currentPos || !currentRoute || currentRoute.length === 0) {
        if (hudBadgeRef.current) hudBadgeRef.current.style.display = "none";
        if (hudLabelRef.current) hudLabelRef.current.style.display = "none";
        return;
      }

      try {
        ctx.clearRect(0, 0, width, height);
        canvasClearedRef.current = false;

        const snapped = snapToRoute(currentRoute, currentPos);
        const path = sliceAhead(currentRoute, snapped, LOOKAHEAD_M);
        if (path.length < 2) return;

        // Ensure continuity if off route
        if (snapped.distanceFromRouteM > 1.0) {
           path.unshift(currentPos);
        }

        // Calculate steering guide point
        let guidePt = path[0];
        for (let i = 0; i < path.length; i++) {
          const d = haversineDistanceM(currentPos, path[i]);
          if (d >= 6) {
            guidePt = path[i];
            break;
          }
        }

        // Use live heading, cached heading, or fallback to bearing to guide point
        let effectiveHeading = currentHeading;
        if (effectiveHeading === null && lastHeadingRef.current) {
          effectiveHeading = lastHeadingRef.current.val;
        }
        if (effectiveHeading === null) {
          effectiveHeading = bearingDeg(currentPos, guidePt);
        }

        const rawS = normalizeAngle(bearingDeg(currentPos, guidePt) - effectiveHeading);
        const alpha = 0.2;
        sCosRef.current = sCosRef.current * (1 - alpha) + Math.cos(rawS * Math.PI / 180) * alpha;
        sSinRef.current = sSinRef.current * (1 - alpha) + Math.sin(rawS * Math.PI / 180) * alpha;
        
        let S = Math.atan2(sSinRef.current, sCosRef.current) * 180 / Math.PI;
        
        // Update HUD content
        const absS = Math.abs(S);
        if (hudBadgeRef.current && hudLabelRef.current && hudArrowRef.current) {
          hudBadgeRef.current.style.display = "flex";
          hudLabelRef.current.style.display = "block";
          hudArrowRef.current.style.transform = `rotate(${S}deg)`;
          if (absS < ON_ROUTE_DEG) {
            hudBadgeRef.current.style.backgroundColor = "rgba(22, 163, 74, 0.85)"; // green-600
            hudLabelRef.current.innerText = "On route";
          } else if (absS > TURN_AROUND_DEG) {
            hudBadgeRef.current.style.backgroundColor = "rgba(220, 38, 38, 0.85)"; // red-600
            hudLabelRef.current.innerText = "Turn around";
          } else {
            hudBadgeRef.current.style.backgroundColor = "rgba(217, 119, 6, 0.85)"; // amber-600
            const dir = S < 0 ? "left" : "right";
            hudLabelRef.current.innerText = `Turn ${dir} ${Math.round(absS)}°`;
          }
        }

        let isSteering = false;
        let angleOffset = 0;
        if (absS > EDGE_CLAMP_DEG) {
          isSteering = true;
          angleOffset = S - Math.sign(S) * EDGE_CLAMP_DEG;
        }
        
        const isWeakGps = currentAcc !== null && currentAcc > MAX_ACCURACY_M;
        if (isWeakGps) {
          ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
          ctx.beginPath();
          ctx.roundRect(width / 2 - 60 * window.devicePixelRatio, 20 * window.devicePixelRatio, 120 * window.devicePixelRatio, 30 * window.devicePixelRatio, 15 * window.devicePixelRatio);
          ctx.fill();
          ctx.fillStyle = "white";
          ctx.font = `${14 * window.devicePixelRatio}px sans-serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("Weak GPS", width / 2, 35 * window.devicePixelRatio);
        }

        const f = (width / 2) / Math.tan((CAMERA_HFOV_DEG / 2) * Math.PI / 180);
        const cx = width / 2;
        const cy = height / 2;
        
        const pitchRad = currentPitch * Math.PI / 180;
        const cosPitch = Math.cos(pitchRad);
        const sinPitch = Math.sin(pitchRad);

        const projectPoint = (d: number, relAngleDeg: number, yGround: number) => {
          const steeredRel = relAngleDeg - angleOffset;
          const relRad = steeredRel * Math.PI / 180;
          const x3d = d * Math.sin(relRad);
          let z3d = d * Math.cos(relRad);
          
          if (z3d < NEAR_CLIP_M) z3d = NEAR_CLIP_M; // clamp forward distance to prevent dropping
          
          const y3d = yGround;
          
          const yRot = y3d * cosPitch - z3d * sinPitch;
          const zRot = y3d * sinPitch + z3d * cosPitch;
          
          return { x: x3d, y: yRot, z: zRot };
        };

        const screenProject = (pt3d: { x: number, y: number, z: number }) => {
          if (pt3d.z < 0.1) return null; // fallback safety
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
            { d: haversineDistanceM(currentPos, left1), rel: normalizeAngle(bearingDeg(currentPos, left1) - effectiveHeading) },
            { d: haversineDistanceM(currentPos, right1), rel: normalizeAngle(bearingDeg(currentPos, right1) - effectiveHeading) },
            { d: haversineDistanceM(currentPos, right2), rel: normalizeAngle(bearingDeg(currentPos, right2) - effectiveHeading) },
            { d: haversineDistanceM(currentPos, left2), rel: normalizeAngle(bearingDeg(currentPos, left2) - effectiveHeading) }
          ];
          
          const pts3d = pts.map(p => projectPoint(p.d, p.rel, CAMERA_HEIGHT_M));
          
          const spts = pts3d.map(screenProject);
          if (spts.some(sp => sp === null)) continue;
          
          const alphaFade = Math.max(0, 1 - (d1 / LOOKAHEAD_M));
          
          ctx.fillStyle = `rgba(59, 130, 246, ${isSteering ? 0.28 * alphaFade : 0.4 * alphaFade})`; // blue-500, softer if steering
          ctx.strokeStyle = `rgba(255, 255, 255, ${isSteering ? 0.6 * alphaFade : 0.8 * alphaFade})`;
          ctx.lineWidth = 2 * window.devicePixelRatio;
          
          ctx.beginPath();
          ctx.moveTo(spts[0]!.sx, spts[0]!.sy);
          ctx.lineTo(spts[1]!.sx, spts[1]!.sy);
          ctx.lineTo(spts[2]!.sx, spts[2]!.sy);
          ctx.lineTo(spts[3]!.sx, spts[3]!.sy);
          ctx.closePath();
          ctx.fill();
          
          // outlines
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
              projectPoint(haversineDistanceM(currentPos, p), normalizeAngle(bearingDeg(currentPos, p) - effectiveHeading), CAMERA_HEIGHT_M)
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
            const rel = normalizeAngle(bearingDeg(currentPos, currentDest) - effectiveHeading);
            // float it 2m above ground
            const pt3d = projectPoint(distToDest, rel, CAMERA_HEIGHT_M - 2.0);
            const spt = screenProject(pt3d);
            if (spt) {
              ctx.fillStyle = "rgba(220, 38, 38, 0.9)"; // red-600
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
