import { LatLng, haversineDistanceM } from "./geo";

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
  source: "network" | "cache" | "straight";
}

// PRIVACY AND OFFLINE NOTES:
// - Only the start and destination coordinates are sent to the routing server.
// - This only occurs when explicitly fetching a route. 
// - After a route is loaded or cached, AR guidance makes no further network requests.

export interface CachedRouteItem {
  key: string;
  to: LatLng;
  name?: string;
  from: LatLng;
  route: RouteData;
  timestamp: number;
}

const CACHE_KEY_V2 = "arway_route_cache_v2";
const CACHE_KEY_V1 = "arway_route_cache";

export function getCachedRoutes(): CachedRouteItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CACHE_KEY_V2);
    if (!raw) return [];
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function saveRouteToCache(from: LatLng, to: LatLng & { name?: string }, route: RouteData) {
  if (typeof window === "undefined") return;
  try {
    const key = `${to.lat.toFixed(4)},${to.lng.toFixed(4)}`;
    const current = getCachedRoutes().filter(item => item.key !== key);
    const newEntry: CachedRouteItem = {
      key,
      to: { lat: to.lat, lng: to.lng },
      name: to.name,
      from: { lat: from.lat, lng: from.lng },
      route: { ...route, source: "cache" },
      timestamp: Date.now(),
    };
    // Keep most recent 25 routes
    const updated = [newEntry, ...current].slice(0, 25);
    localStorage.setItem(CACHE_KEY_V2, JSON.stringify(updated));

    // Also update v1 legacy key for backward compatibility
    localStorage.setItem(CACHE_KEY_V1, JSON.stringify({
      to: { lat: parseFloat(to.lat.toFixed(4)), lng: parseFloat(to.lng.toFixed(4)) },
      route: route
    }));
  } catch (e) {
    console.warn("Failed to cache route:", e);
  }
}

function findMatchingCachedRoute(to: LatLng): RouteData | null {
  if (typeof window === "undefined") return null;
  try {
    const routes = getCachedRoutes();
    for (const item of routes) {
      const d = haversineDistanceM(item.to, to);
      if (d < 40) { // Within 40 meters of saved destination
        return { ...item.route, source: "cache" };
      }
    }

    // Check v1 legacy cache
    const cachedStr = localStorage.getItem(CACHE_KEY_V1);
    if (cachedStr) {
      const cached = JSON.parse(cachedStr);
      if (
        Math.abs(cached.to.lat - to.lat) < 0.0004 &&
        Math.abs(cached.to.lng - to.lng) < 0.0004
      ) {
        return { ...cached.route, source: "cache" };
      }
    }
  } catch {
    // ignore
  }
  return null;
}

export async function fetchWalkingRoute(from: LatLng, to: LatLng & { name?: string }): Promise<RouteData> {
  const isOffline = typeof navigator !== "undefined" && navigator.onLine === false;

  // If offline, check cache immediately
  if (isOffline) {
    const cached = findMatchingCachedRoute(to);
    if (cached) return cached;
  }

  const tryFetchUrl = async (url: string) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (!res.ok) throw new Error("Fetch failed: " + res.status);
    const data = await res.json();
    if (data.code !== "Ok" || !data.routes || data.routes.length === 0) {
      throw new Error("No route found");
    }

    const route = data.routes[0];
    const coords = route.geometry.coordinates.map((c: [number, number]) => ({ lat: c[1], lng: c[0] }));
    const distanceM = route.distance;
    const durationS = route.duration;

    const steps: RouteStep[] = (route.legs?.[0]?.steps || []).map((step: any) => {
      const type = step.maneuver.type;
      const modifier = step.maneuver.modifier;
      const name = step.name;

      let text = "Continue";
      if (type === "turn") {
        text = `Turn ${modifier || ""} onto ${name || "path"}`;
      } else if (type === "arrive") {
        text = `Arrive at ${to.name || "destination"}`;
      } else if (name) {
        text = `Continue on ${name}`;
      } else if (modifier) {
        text = `Bear ${modifier}`;
      }

      return {
        text: text.trim(),
        distanceM: step.distance,
        lat: step.maneuver.location[1],
        lng: step.maneuver.location[0]
      };
    });

    return { coords, distanceM, durationS, steps, source: "network" as const };
  };

  try {
    if (isOffline) throw new Error("Offline");

    let routeData: RouteData | null = null;

    // 1. Primary: openstreetmap.de foot routing
    try {
      const primaryUrl = `https://routing.openstreetmap.de/routed-foot/route/v1/foot/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson&steps=true`;
      routeData = await tryFetchUrl(primaryUrl);
    } catch {
      // 2. Secondary: project-osrm.org fallback
      try {
        const secondaryUrl = `https://router.project-osrm.org/route/v1/foot/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson&steps=true`;
        routeData = await tryFetchUrl(secondaryUrl);
      } catch {
        // 3. Tertiary: driving profile if foot routing fails
        const drivingUrl = `https://routing.openstreetmap.de/routed-car/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson&steps=true`;
        routeData = await tryFetchUrl(drivingUrl);
      }
    }

    if (routeData) {
      saveRouteToCache(from, to, routeData);
      return routeData;
    }
  } catch {
    // Fall through to cache/straight
  }

  // Fallback 1: check local cache
  const cached = findMatchingCachedRoute(to);
  if (cached) {
    return cached;
  }

  // Fallback 2: straight line dead-reckoning bearing
  const distanceM = haversineDistanceM(from, to);
  return {
    coords: [from, to],
    distanceM,
    durationS: distanceM / 1.3,
    steps: [
      { text: `Head towards ${to.name || "destination"}`, distanceM, lat: from.lat, lng: from.lng },
      { text: `Arrive at ${to.name || "destination"}`, distanceM: 0, lat: to.lat, lng: to.lng }
    ],
    source: "straight"
  };
}
