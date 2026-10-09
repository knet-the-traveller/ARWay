"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix Leaflet marker issue
const createCustomIcon = (heading?: number | null) => {
  const rot = heading !== null && heading !== undefined ? heading : 0;
  const arrowHtml = heading !== null && heading !== undefined
    ? `<div style="transform: rotate(${rot}deg); width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;">
         <div style="width: 0; height: 0; border-left: 5px solid transparent; border-right: 5px solid transparent; border-bottom: 10px solid white; transform: translateY(-3px);"></div>
       </div>`
    : "";

  return L.divIcon({
    className: "custom-marker",
    html: `<div style="background-color: #3b82f6; width: 18px; height: 18px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.5);">${arrowHtml}</div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
};

const createDestinationIcon = () => {
  return L.divIcon({
    className: "dest-marker",
    html: `<div style="background-color: #ef4444; width: 16px; height: 16px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.5);"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
};

interface MapViewProps {
  position: { lat: number; lng: number } | null;
  destination?: { lat: number; lng: number; name: string } | null;
  route?: [number, number][]; // [lat, lng][]
  onMapClick?: (lat: number, lng: number) => void;
  heading?: number | null;
}

export default function MapView({
  position,
  destination,
  route,
  onMapClick,
  heading,
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const posMarkerRef = useRef<L.Marker | null>(null);
  const destMarkerRef = useRef<L.Marker | null>(null);
  const routeOutlineRef = useRef<L.Polyline | null>(null);
  const routePolylineRef = useRef<L.Polyline | null>(null);
  const lastRouteStrRef = useRef<string>("");
  const onMapClickRef = useRef(onMapClick);

  useEffect(() => {
    onMapClickRef.current = onMapClick;
  }, [onMapClick]);

  // Initialize Map and Resize Observer
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let isMounted = true;

    // Reset container if Leaflet previously attached to it
    if ((container as any)._leaflet_id) {
      try {
        delete (container as any)._leaflet_id;
      } catch {}
    }
    container.innerHTML = "";

    const defaultCenter = { lat: 14.5917, lng: 120.9734 }; // Manila Cathedral / Intramuros Demo Area
    const initialCenter = position || destination || defaultCenter;

    let map: L.Map;
    try {
      map = L.map(container, {
        center: [initialCenter.lat, initialCenter.lng],
        zoom: 17,
        minZoom: 14,
        maxZoom: 19,
        zoomControl: false,
      });
    } catch (e) {
      console.warn("Failed to initialize Leaflet map:", e);
      return;
    }

    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      minZoom: 14,
      maxZoom: 19,
      maxNativeZoom: 17,
      minNativeZoom: 14,
    }).addTo(map);

    map.on("click", (e: L.LeafletMouseEvent) => {
      onMapClickRef.current?.(e.latlng.lat, e.latlng.lng);
    });

    mapRef.current = map;

    // ResizeObserver safely guarded against unmount/detach
    const observer = new ResizeObserver(() => {
      if (!isMounted) return;
      const c = containerRef.current;
      const m = mapRef.current;
      if (!c || !m || !c.isConnected || c.clientWidth === 0 || c.clientHeight === 0) {
        return;
      }
      try {
        m.invalidateSize();
      } catch {}
    });
    observer.observe(container);

    const timer = setTimeout(() => {
      if (isMounted && mapRef.current && containerRef.current?.isConnected) {
        try {
          mapRef.current.invalidateSize();
        } catch {}
      }
    }, 200);

    return () => {
      isMounted = false;
      observer.disconnect();
      clearTimeout(timer);

      if (mapRef.current) {
        try {
          mapRef.current.off();
          mapRef.current.remove();
        } catch (e) {
          // Suppress unmount errors
        }
        mapRef.current = null;
      }

      if (containerRef.current) {
        try {
          delete (containerRef.current as any)._leaflet_id;
          containerRef.current.innerHTML = "";
        } catch {}
      }

      posMarkerRef.current = null;
      destMarkerRef.current = null;
      routeOutlineRef.current = null;
      routePolylineRef.current = null;
      lastRouteStrRef.current = "";
    };
  }, []);

  const hasCenteredOnPosRef = useRef(false);

  // Update position marker & heading
  useEffect(() => {
    const map = mapRef.current;
    const container = containerRef.current;
    if (!map || !container || !container.isConnected) return;

    try {
      if (position) {
        const icon = createCustomIcon(heading);
        if (!posMarkerRef.current) {
          posMarkerRef.current = L.marker([position.lat, position.lng], {
            icon,
            zIndexOffset: 1000,
          }).addTo(map);
        } else {
          posMarkerRef.current.setLatLng([position.lat, position.lng]);
          posMarkerRef.current.setIcon(icon);
        }

        // Smoothly center on initial GPS fix if no destination is selected
        if (!hasCenteredOnPosRef.current && !destination) {
          map.setView([position.lat, position.lng], 17);
          hasCenteredOnPosRef.current = true;
        }
      } else if (posMarkerRef.current) {
        posMarkerRef.current.remove();
        posMarkerRef.current = null;
      }
    } catch {}
  }, [position, heading, destination]);

  // Update destination marker & tooltip
  useEffect(() => {
    const map = mapRef.current;
    const container = containerRef.current;
    if (!map || !container || !container.isConnected) return;

    try {
      if (destination) {
        const icon = createDestinationIcon();
        if (!destMarkerRef.current) {
          destMarkerRef.current = L.marker([destination.lat, destination.lng], {
            icon,
          })
            .bindTooltip(destination.name, { permanent: true, direction: "top" })
            .addTo(map);
        } else {
          destMarkerRef.current.setLatLng([destination.lat, destination.lng]);
          destMarkerRef.current.setTooltipContent(destination.name);
        }

        // Pan to newly selected destination
        map.panTo([destination.lat, destination.lng]);
      } else if (destMarkerRef.current) {
        destMarkerRef.current.remove();
        destMarkerRef.current = null;
      }
    } catch {}
  }, [destination]);

  // Update route polylines and viewport
  useEffect(() => {
    const map = mapRef.current;
    const container = containerRef.current;
    if (!map || !container || !container.isConnected) return;

    try {
      const routeStr = JSON.stringify(route || []);
      const routeChanged = routeStr !== lastRouteStrRef.current;

      if (route && route.length > 0) {
        if (!routeOutlineRef.current) {
          routeOutlineRef.current = L.polyline(route, {
            color: "white",
            weight: 8,
            opacity: 0.8,
          }).addTo(map);
        } else {
          routeOutlineRef.current.setLatLngs(route);
        }

        if (!routePolylineRef.current) {
          routePolylineRef.current = L.polyline(route, {
            color: "#3b82f6",
            weight: 5,
            opacity: 0.9,
          }).addTo(map);
        } else {
          routePolylineRef.current.setLatLngs(route);
        }

        if (routeChanged) {
          lastRouteStrRef.current = routeStr;
          const bounds = L.latLngBounds(route);
          map.fitBounds(bounds, { padding: [30, 30], maxZoom: 17 });
        }
      } else {
        lastRouteStrRef.current = "";
        if (routeOutlineRef.current) {
          routeOutlineRef.current.remove();
          routeOutlineRef.current = null;
        }
        if (routePolylineRef.current) {
          routePolylineRef.current.remove();
          routePolylineRef.current = null;
        }
        if (position) {
          map.setView([position.lat, position.lng]);
        }
      }
    } catch {}
  }, [route, position]);

  return (
    <div className="w-full h-full relative z-0">
      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
}
