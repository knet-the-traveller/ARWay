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

export async function fetchWalkingRoute(from: LatLng, to: LatLng): Promise<RouteData> {
  // If browser is explicitly offline, skip remote fetch immediately
  const isOffline = typeof navigator !== "undefined" && navigator.onLine === false;

  const tryFetch = async (profile: "foot" | "driving") => {
    if (isOffline) throw new Error("Offline");

    const url = `https://routing.openstreetmap.de/routed-foot/route/v1/${profile}/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson&steps=true`;
    
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    
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
        lng: step.maneuver.location[0]
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
      // If foot failed or timed out, only try driving if online
      if (!isOffline) {
        routeData = await tryFetch("driving");
      } else {
        throw e;
      }
    }
    
    // Save to cache
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem("arway_route_cache", JSON.stringify({
          to: { lat: parseFloat(to.lat.toFixed(4)), lng: parseFloat(to.lng.toFixed(4)) },
          route: routeData
        }));
      }
    } catch (e) {}
    
    return routeData;
    
  } catch (err) {
    // Fallback order
    try {
      if (typeof window !== "undefined") {
        const cachedStr = localStorage.getItem("arway_route_cache");
        if (cachedStr) {
          const cached = JSON.parse(cachedStr);
          if (
            Math.abs(cached.to.lat - parseFloat(to.lat.toFixed(4))) < 0.0001 &&
            Math.abs(cached.to.lng - parseFloat(to.lng.toFixed(4))) < 0.0001
          ) {
            return { ...cached.route, source: "cache" };
          }
        }
      }
    } catch (e) {}

    // Straight line fallback
    const distanceM = haversineDistanceM(from, to);
    return {
      coords: [from, to],
      distanceM,
      durationS: distanceM / 1.3,
      steps: [
        { text: "Head straight towards destination", distanceM, lat: from.lat, lng: from.lng },
        { text: "Arrive at destination", distanceM: 0, lat: to.lat, lng: to.lng }
      ],
      source: "straight"
    };
  }
}
