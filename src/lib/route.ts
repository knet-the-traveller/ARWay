import { LatLng, haversineDistanceM, bearingDeg } from "./geo";
import { sceneries } from "./sceneries";
import { shops } from "./shops";

export interface RouteStep {
  text: string;
  distanceM: number;
  lat: number;
  lng: number;
}

export interface RouteData {
  coords: LatLng[];
  distanceM: number;
  durationS: number;
  steps: RouteStep[];
  source: "network" | "cache" | "corridor";
}

const ROUTE_CACHE_KEY = "arway_routes_v2";

function getCachedRoutes(): Record<string, RouteData> {
  if (typeof window === "undefined") return {};
  try {
    const str = localStorage.getItem(ROUTE_CACHE_KEY);
    return str ? JSON.parse(str) : {};
  } catch (e) {
    return {};
  }
}

function saveRouteToCache(from: LatLng, to: LatLng, route: RouteData) {
  if (typeof window === "undefined") return;
  try {
    const cache = getCachedRoutes();
    const key = `${to.lat.toFixed(4)},${to.lng.toFixed(4)}`;
    cache[key] = route;
    localStorage.setItem(ROUTE_CACHE_KEY, JSON.stringify(cache));
  } catch (e) {}
}

function findCachedRoute(to: LatLng): RouteData | null {
  const cache = getCachedRoutes();
  const toLat = to.lat.toFixed(4);
  const toLng = to.lng.toFixed(4);

  for (const [key, route] of Object.entries(cache)) {
    const [kLat, kLng] = key.split(",");
    if (
      Math.abs(parseFloat(kLat) - parseFloat(toLat)) < 0.0003 &&
      Math.abs(parseFloat(kLng) - parseFloat(toLng)) < 0.0003
    ) {
      return { ...route, source: "cache" };
    }
  }
  return null;
}

// Generate an orthogonal street-corridor path aligned to street axes (not piercing buildings)
export function generateStreetCorridorRoute(from: LatLng, to: LatLng): RouteData {
  const dLat = to.lat - from.lat;
  const dLng = to.lng - from.lng;
  const straightDist = haversineDistanceM(from, to);

  if (straightDist < 20) {
    return {
      coords: [from, to],
      distanceM: straightDist,
      durationS: straightDist / 1.3,
      steps: [
        { text: "Proceed to destination", distanceM: straightDist, lat: from.lat, lng: from.lng },
        { text: "Arrive at destination", distanceM: 0, lat: to.lat, lng: to.lng },
      ],
      source: "corridor",
    };
  }

  // Determine primary axis: walk along the larger axis first, then turn onto cross street
  const isLatPrimary = Math.abs(dLat) >= Math.abs(dLng);
  const cornerLat = isLatPrimary ? to.lat : from.lat;
  const cornerLng = isLatPrimary ? from.lng : to.lng;
  const corner: LatLng = { lat: cornerLat, lng: cornerLng };

  const leg1Dist = haversineDistanceM(from, corner);
  const leg2Dist = haversineDistanceM(corner, to);

  // Add intermediate fillet points around corner for a smooth sidewalk curve
  const fillet1: LatLng = {
    lat: from.lat + (corner.lat - from.lat) * 0.88,
    lng: from.lng + (corner.lng - from.lng) * 0.88,
  };
  const fillet2: LatLng = {
    lat: corner.lat + (to.lat - corner.lat) * 0.12,
    lng: corner.lng + (to.lng - corner.lng) * 0.12,
  };

  const coords = [from, fillet1, corner, fillet2, to];
  const totalDist = leg1Dist + leg2Dist;

  // Compute cardinal directions & turn maneuver
  const brng1 = bearingDeg(from, corner);
  const brng2 = bearingDeg(corner, to);
  let turnAngle = (brng2 - brng1 + 360) % 360;
  let turnWord = turnAngle > 180 ? "left" : "right";

  let cardinal1 = "street";
  if (brng1 >= 315 || brng1 < 45) cardinal1 = "north along street";
  else if (brng1 >= 45 && brng1 < 135) cardinal1 = "east along street";
  else if (brng1 >= 135 && brng1 < 225) cardinal1 = "south along street";
  else cardinal1 = "west along street";

  const steps: RouteStep[] = [
    {
      text: `Follow ${cardinal1} (${Math.round(leg1Dist)} m)`,
      distanceM: leg1Dist,
      lat: from.lat,
      lng: from.lng,
    },
    {
      text: `Turn ${turnWord} onto cross street (${Math.round(leg2Dist)} m)`,
      distanceM: leg2Dist,
      lat: corner.lat,
      lng: corner.lng,
    },
    {
      text: "Arrive at destination",
      distanceM: 0,
      lat: to.lat,
      lng: to.lng,
    },
  ];

  return {
    coords,
    distanceM: totalDist,
    durationS: totalDist / 1.3,
    steps,
    source: "corridor",
  };
}

export async function fetchWalkingRoute(from: LatLng, to: LatLng): Promise<RouteData> {
  const isOffline = typeof navigator !== "undefined" && navigator.onLine === false;

  const tryFetch = async (profile: "foot" | "driving") => {
    if (isOffline) throw new Error("Offline");

    const url = `https://routing.openstreetmap.de/routed-foot/route/v1/${profile}/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson&steps=true`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (!res.ok) throw new Error("Fetch failed");

    const data = await res.json();
    if (data.code !== "Ok" || !data.routes || data.routes.length === 0) {
      throw new Error("No route");
    }

    const route = data.routes[0];
    const coords = route.geometry.coordinates.map((c: [number, number]) => ({ lat: c[1], lng: c[0] }));
    const distanceM = route.distance;
    const durationS = route.duration;

    const steps: RouteStep[] = route.legs[0].steps.map((step: any) => {
      const type = step.maneuver.type;
      const modifier = step.maneuver.modifier;
      const name = step.name;

      let text = "Continue";
      if (type === "turn") {
        text = `Turn ${modifier || ""} onto ${name || "unnamed road"}`;
      } else if (type === "arrive") {
        text = "Arrive at destination";
      } else if (name) {
        text = `Continue on ${name}`;
      } else if (modifier) {
        text = `Bear ${modifier}`;
      }

      return {
        text: text.trim(),
        distanceM: step.distance,
        lat: step.maneuver.location[1],
        lng: step.maneuver.location[0],
      };
    });

    return { coords, distanceM, durationS, steps, source: "network" as const };
  };

  try {
    if (isOffline) throw new Error("Offline");

    let routeData: RouteData | null = null;
    try {
      routeData = await tryFetch("foot");
    } catch (e) {
      if (!isOffline) {
        routeData = await tryFetch("driving");
      } else {
        throw e;
      }
    }

    saveRouteToCache(from, to, routeData);
    return routeData;
  } catch (err) {
    // 1. Check multi-key cache for pre-cached OSRM route
    const cached = findCachedRoute(to);
    if (cached) {
      return cached;
    }

    // 2. Generate street corridor route (avoids cutting through building walls)
    return generateStreetCorridorRoute(from, to);
  }
}

// Pre-cache walking routes for all cataloged landmarks and shops
export async function warmCatalogRoutes(
  fromPos: LatLng,
  onProgress?: (current: number, total: number, label: string) => void
): Promise<number> {
  const destinations = [...sceneries, ...shops];
  let cachedCount = 0;

  for (let i = 0; i < destinations.length; i++) {
    const dest = destinations[i];
    onProgress?.(i, destinations.length, `Route: ${dest.name}`);
    try {
      const r = await fetchWalkingRoute(fromPos, { lat: dest.lat, lng: dest.lng });
      if (r && r.source === "network") {
        cachedCount++;
      }
    } catch (e) {}

    // Polite throttling
    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  return cachedCount;
}

