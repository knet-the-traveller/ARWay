export interface LatLng { lat: number; lng: number; }

// Reuse haversine from distance.ts, but implement it here to be self-contained
export function haversineDistanceM(p1: LatLng, p2: LatLng): number {
  const R = 6371e3; // metres
  const phi1 = p1.lat * Math.PI/180; // φ, λ in radians
  const phi2 = p2.lat * Math.PI/180;
  const deltaPhi = (p2.lat-p1.lat) * Math.PI/180;
  const deltaLambda = (p2.lng-p1.lng) * Math.PI/180;

  const a = Math.sin(deltaPhi/2) * Math.sin(deltaPhi/2) +
            Math.cos(phi1) * Math.cos(phi2) *
            Math.sin(deltaLambda/2) * Math.sin(deltaLambda/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

export function bearingDeg(a: LatLng, b: LatLng): number {
  const lat1 = a.lat * Math.PI / 180;
  const lat2 = b.lat * Math.PI / 180;
  const dLon = (b.lng - a.lng) * Math.PI / 180;

  const y = Math.sin(dLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) -
            Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  const brng = Math.atan2(y, x);
  return (brng * 180 / Math.PI + 360) % 360;
}

export function normalizeAngle(deg: number): number {
  let angle = (deg % 360 + 360) % 360;
  if (angle > 180) angle -= 360;
  return angle;
}

export function offsetLatLng(origin: LatLng, bearingDeg: number, meters: number): LatLng {
  const R = 6371e3;
  const dByR = meters / R;
  const lat = origin.lat * Math.PI / 180;
  const lon = origin.lng * Math.PI / 180;
  const brng = bearingDeg * Math.PI / 180;

  const outLat = Math.asin(Math.sin(lat) * Math.cos(dByR) + Math.cos(lat) * Math.sin(dByR) * Math.cos(brng));
  const outLon = lon + Math.atan2(Math.sin(brng) * Math.sin(dByR) * Math.cos(lat), Math.cos(dByR) - Math.sin(lat) * Math.sin(outLat));
  
  return { lat: outLat * 180 / Math.PI, lng: outLon * 180 / Math.PI };
}

export function toLocalMeters(origin: LatLng, point: LatLng): { east: number, north: number } {
  // Equirectangular approximation
  const R = 6371e3;
  const dLat = (point.lat - origin.lat) * Math.PI / 180;
  const dLon = (point.lng - origin.lng) * Math.PI / 180;
  const latMid = (origin.lat + point.lat) / 2 * Math.PI / 180;
  
  const north = R * dLat;
  const east = R * dLon * Math.cos(latMid);
  return { east, north };
}

function projectPointOnLineSegment(p: {east: number, north: number}, a: {east: number, north: number}, b: {east: number, north: number}) {
  const v = { east: b.east - a.east, north: b.north - a.north };
  const w = { east: p.east - a.east, north: p.north - a.north };
  const c1 = w.east * v.east + w.north * v.north;
  const c2 = v.east * v.east + v.north * v.north;
  
  let bParam = 0;
  if (c2 !== 0) {
    bParam = c1 / c2;
  }
  
  if (bParam < 0) return { point: a, t: 0 };
  if (bParam > 1) return { point: b, t: 1 };
  
  return { point: { east: a.east + bParam * v.east, north: a.north + bParam * v.north }, t: bParam };
}

export function snapToRoute(route: LatLng[], position: LatLng) {
  if (route.length < 2) return { index: 0, distanceFromRouteM: 0, alongM: 0, snappedPoint: position };
  
  let bestIndex = 0;
  let minSqDist = Infinity;
  let bestPoint = { east: 0, north: 0 };
  let bestT = 0;
  
  // convert route to local meters relative to position
  const localRoute = route.map(pt => toLocalMeters(position, pt));
  
  for (let i = 0; i < localRoute.length - 1; i++) {
    const a = localRoute[i];
    const b = localRoute[i + 1];
    const { point, t } = projectPointOnLineSegment({east: 0, north: 0}, a, b);
    const sqDist = point.east * point.east + point.north * point.north;
    if (sqDist < minSqDist) {
      minSqDist = sqDist;
      bestIndex = i;
      bestPoint = point;
      bestT = t;
    }
  }
  
  // convert bestPoint back to latlng roughly
  const bearing = (Math.atan2(bestPoint.east, bestPoint.north) * 180 / Math.PI + 360) % 360;
  const dist = Math.sqrt(minSqDist);
  const snappedPoint = offsetLatLng(position, bearing, dist);
  
  return { index: bestIndex, distanceFromRouteM: dist, alongM: bestT, snappedPoint };
}

export function sliceAhead(route: LatLng[], snapped: { index: number, alongM: number, snappedPoint: LatLng }, lengthM: number) {
  if (route.length === 0) return [];
  if (snapped.index >= route.length - 1) return [snapped.snappedPoint];
  
  const points: LatLng[] = [snapped.snappedPoint];
  let accumulatedM = 0;
  
  let currentPt = snapped.snappedPoint;
  let targetIndex = snapped.index + 1;
  
  while (targetIndex < route.length && accumulatedM < lengthM) {
    const targetPt = route[targetIndex];
    const distToTarget = haversineDistanceM(currentPt, targetPt);
    
    if (accumulatedM + distToTarget > lengthM) {
      // interpolate
      const remainingM = lengthM - accumulatedM;
      const brng = bearingDeg(currentPt, targetPt);
      points.push(offsetLatLng(currentPt, brng, remainingM));
      break;
    } else {
      points.push(targetPt);
      accumulatedM += distToTarget;
      currentPt = targetPt;
      targetIndex++;
    }
  }
  
  // Densify so points are at most 1m apart
  const densified: LatLng[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    densified.push(a);
    const dist = haversineDistanceM(a, b);
    const brng = bearingDeg(a, b);
    let steps = Math.floor(dist);
    for (let s = 1; s <= steps; s++) {
      if (s === Math.round(dist)) continue; // skip the end point to avoid dupes
      densified.push(offsetLatLng(a, brng, s));
    }
  }
  if (points.length > 0) {
    densified.push(points[points.length - 1]);
  }
  
  return densified;
}

export function remainingDistanceM(route: LatLng[], snapped: { index: number, snappedPoint: LatLng }) {
  if (route.length < 2) return 0;
  let dist = 0;
  if (snapped.index < route.length - 1) {
    dist += haversineDistanceM(snapped.snappedPoint, route[snapped.index + 1]);
  }
  for (let i = snapped.index + 1; i < route.length - 1; i++) {
    dist += haversineDistanceM(route[i], route[i + 1]);
  }
  return dist;
}
