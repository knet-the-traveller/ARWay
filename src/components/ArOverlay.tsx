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

export default function ArOverlay({ route, position, accuracy, heading, pitch, active, destination }: ArOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!active || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
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
      if (!ctx || !position) return;
      
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);
      
      if (heading === null) {
        ctx.fillStyle = "white";
        ctx.font = `${16 * window.devicePixelRatio}px sans-serif`;
        ctx.textAlign = "center";
        ctx.fillText("Compass not available", width / 2, height / 2);
        return;
      }
      
      const isWeakGps = accuracy !== null && accuracy > MAX_ACCURACY_M;
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

      if (!route || route.length === 0) return;

      try {
        const snapped = snapToRoute(route, position);
        const path = sliceAhead(route, snapped, LOOKAHEAD_M);
        if (path.length < 2) return;

        const f = (width / 2) / Math.tan((CAMERA_HFOV_DEG / 2) * Math.PI / 180);
        const cx = width / 2;
        const cy = height / 2;
        
        const pitchRad = pitch * Math.PI / 180;
        const cosPitch = Math.cos(pitchRad);
        const sinPitch = Math.sin(pitchRad);

        const projectPoint = (d: number, relAngleDeg: number, yGround: number) => {
          const relRad = relAngleDeg * Math.PI / 180;
          const x3d = d * Math.sin(relRad);
          const z3d = d * Math.cos(relRad);
          
          const y3d = yGround;
          
          const yRot = y3d * cosPitch - z3d * sinPitch;
          const zRot = y3d * sinPitch + z3d * cosPitch;
          
          return { x: x3d, y: yRot, z: zRot };
        };

        const screenProject = (pt3d: { x: number, y: number, z: number }) => {
          if (pt3d.z < NEAR_CLIP_M) return null;
          return {
            sx: cx + f * pt3d.x / pt3d.z,
            sy: cy + f * pt3d.y / pt3d.z
          };
        };

        const time = performance.now() / 1000;
        
        ctx.globalAlpha = isWeakGps ? 0.5 : 1.0;

        // Collect ribbon quads
        for (let i = 0; i < path.length - 1; i++) {
          const p1 = path[i];
          const p2 = path[i + 1];
          const brng = bearingDeg(p1, p2);
          
          const d1 = haversineDistanceM(position, p1);
          const rel1 = normalizeAngle(bearingDeg(position, p1) - heading);
          
          const d2 = haversineDistanceM(position, p2);
          const rel2 = normalizeAngle(bearingDeg(position, p2) - heading);
          
          const left1 = offsetLatLng(p1, brng - 90, LINE_HALF_WIDTH_M);
          const right1 = offsetLatLng(p1, brng + 90, LINE_HALF_WIDTH_M);
          const left2 = offsetLatLng(p2, brng - 90, LINE_HALF_WIDTH_M);
          const right2 = offsetLatLng(p2, brng + 90, LINE_HALF_WIDTH_M);
          
          const pts = [
            { d: haversineDistanceM(position, left1), rel: normalizeAngle(bearingDeg(position, left1) - heading) },
            { d: haversineDistanceM(position, right1), rel: normalizeAngle(bearingDeg(position, right1) - heading) },
            { d: haversineDistanceM(position, right2), rel: normalizeAngle(bearingDeg(position, right2) - heading) },
            { d: haversineDistanceM(position, left2), rel: normalizeAngle(bearingDeg(position, left2) - heading) }
          ];
          
          const pts3d = pts.map(p => projectPoint(p.d, p.rel, CAMERA_HEIGHT_M));
          
          // simple clipping: if both z are behind near plane, skip segment entirely (approximate)
          if (pts3d.every(p => p.z < NEAR_CLIP_M)) continue;
          
          const spts = pts3d.map(screenProject);
          if (spts.some(sp => sp === null)) continue; // ignore segments crossing the near plane for simplicity in this prototype
          
          const alphaFade = Math.max(0, 1 - (d1 / LOOKAHEAD_M));
          
          ctx.fillStyle = `rgba(59, 130, 246, ${0.4 * alphaFade})`; // blue-500
          ctx.strokeStyle = `rgba(255, 255, 255, ${0.8 * alphaFade})`;
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
          ctx.moveTo(spts[0]!.sx, spts[0]!.sy);
          ctx.lineTo(spts[3]!.sx, spts[3]!.sy);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(spts[1]!.sx, spts[1]!.sy);
          ctx.lineTo(spts[2]!.sx, spts[2]!.sy);
          ctx.stroke();
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
              projectPoint(haversineDistanceM(position, p), normalizeAngle(bearingDeg(position, p) - heading), CAMERA_HEIGHT_M)
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

        // Off-screen guidance
        // find a point ~7m ahead
        let guidePt = null;
        let dAccum = 0;
        for (let i = 0; i < path.length; i++) {
          const d = haversineDistanceM(position, path[i]);
          if (d >= 5 && d <= 12) {
            guidePt = path[i];
            break;
          }
        }
        
        if (guidePt) {
          const d = haversineDistanceM(position, guidePt);
          const relAngle = normalizeAngle(bearingDeg(position, guidePt) - heading);
          if (Math.abs(relAngle) > 55) {
            ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
            ctx.strokeStyle = "white";
            ctx.lineWidth = 2 * window.devicePixelRatio;
            
            if (Math.abs(relAngle) > 130) {
              ctx.font = `bold ${18 * window.devicePixelRatio}px sans-serif`;
              ctx.textAlign = "center";
              ctx.fillStyle = "white";
              ctx.fillText("Turn around", cx, cy);
            } else {
              const isLeft = relAngle < 0;
              const text = isLeft ? "Turn left to follow the route" : "Turn right to follow the route";
              
              ctx.font = `bold ${16 * window.devicePixelRatio}px sans-serif`;
              ctx.textAlign = isLeft ? "left" : "right";
              ctx.fillStyle = "white";
              
              const tx = isLeft ? 40 * window.devicePixelRatio : width - 40 * window.devicePixelRatio;
              ctx.fillText(text, tx, cy);
              
              // Draw arrow
              ctx.beginPath();
              if (isLeft) {
                ctx.moveTo(30 * window.devicePixelRatio, cy);
                ctx.lineTo(15 * window.devicePixelRatio, cy - 10 * window.devicePixelRatio);
                ctx.lineTo(15 * window.devicePixelRatio, cy + 10 * window.devicePixelRatio);
              } else {
                ctx.moveTo(width - 30 * window.devicePixelRatio, cy);
                ctx.lineTo(width - 15 * window.devicePixelRatio, cy - 10 * window.devicePixelRatio);
                ctx.lineTo(width - 15 * window.devicePixelRatio, cy + 10 * window.devicePixelRatio);
              }
              ctx.fill();
            }
          }
        }
        
        // Destination marker
        if (destination) {
          const distToDest = haversineDistanceM(position, destination);
          if (distToDest < LOOKAHEAD_M) {
            const rel = normalizeAngle(bearingDeg(position, destination) - heading);
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
              ctx.fillText(destination.name, spt.sx, spt.sy - 15 * window.devicePixelRatio);
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
  }, [active, route, position, accuracy, heading, pitch, destination]);

  return (
    <canvas 
      ref={canvasRef} 
      className="absolute inset-0 pointer-events-none z-10" 
      style={{ opacity: active ? 1 : 0 }} 
    />
  );
}
