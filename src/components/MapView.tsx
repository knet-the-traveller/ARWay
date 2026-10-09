"use client";

import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Polyline, Tooltip, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix Leaflet marker issue
const createCustomIcon = (heading?: number | null) => {
  const rot = heading !== null && heading !== undefined ? heading : 0;
  const arrowHtml = heading !== null && heading !== undefined
    ? `<div style="transform: rotate(${rot}deg); width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;">
         <div style="width: 0; height: 0; border-left: 5px solid transparent; border-right: 5px solid transparent; border-bottom: 10px solid white; transform: translateY(-3px);"></div>
       </div>`
    : '';

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

function MapUpdater({ position, destination, route, onMapClick }: { position: { lat: number; lng: number } | null, destination?: { lat: number, lng: number, name: string } | null, route?: [number, number][], onMapClick?: (lat: number, lng: number) => void }) {
  const map = useMap();
  const lastRouteRef = useRef<string>("");

  useMapEvents({
    click(e) {
      if (onMapClick) onMapClick(e.latlng.lat, e.latlng.lng);
    }
  });

  useEffect(() => {
    // Ensure map resizes correctly
    setTimeout(() => {
      map.invalidateSize();
    }, 100);
  }, [map]);

  useEffect(() => {
    const routeStr = JSON.stringify(route || []);
    const routeChanged = routeStr !== lastRouteRef.current;
    
    if (route && route.length > 0 && routeChanged) {
      lastRouteRef.current = routeStr;
      const bounds = L.latLngBounds(route);
      map.fitBounds(bounds, { padding: [30, 30], maxZoom: 17 });
    } else if (position && !route) {
      map.setView([position.lat, position.lng]);
    }
  }, [position, route, map]);

  return null;
}

interface MapViewProps {
  position: { lat: number; lng: number } | null;
  destination?: { lat: number; lng: number; name: string } | null;
  route?: [number, number][]; // [lat, lng][]
  onMapClick?: (lat: number, lng: number) => void;
  heading?: number | null;
}

export default function MapView({ position, destination, route, onMapClick, heading }: MapViewProps) {
  const defaultCenter = { lat: 14.5995, lng: 120.9842 }; // Manila
  const center = position || destination || defaultCenter;

  return (
    <div className="w-full h-full relative z-0">
      <MapContainer
        center={[center.lat, center.lng]}
        zoom={17}
        zoomControl={false}
        className="w-full h-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {route && route.length > 0 && (
          <>
            <Polyline positions={route} color="white" weight={8} opacity={0.8} />
            <Polyline positions={route} color="#3b82f6" weight={5} opacity={0.9} />
          </>
        )}
        {position && (
          <Marker
            position={[position.lat, position.lng]}
            icon={createCustomIcon(heading)}
            zIndexOffset={1000}
          />
        )}
        {destination && (
          <Marker
            position={[destination.lat, destination.lng]}
            icon={createDestinationIcon()}
          >
            <Tooltip permanent direction="top">{destination.name}</Tooltip>
          </Marker>
        )}
        <MapUpdater position={position} destination={destination} route={route} onMapClick={onMapClick} />
      </MapContainer>
    </div>
  );
}
