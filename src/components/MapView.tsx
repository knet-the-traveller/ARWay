"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import { Tooltip } from "react-leaflet";

// Fix Leaflet marker issue
const createCustomIcon = () => {
  return L.divIcon({
    className: "custom-marker",
    html: `<div style="background-color: #3b82f6; width: 16px; height: 16px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.5);"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
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

function MapUpdater({ position, destination }: { position: { lat: number; lng: number } | null, destination?: { lat: number, lng: number, name: string } | null }) {
  const map = useMap();

  useEffect(() => {
    // Ensure map resizes correctly
    setTimeout(() => {
      map.invalidateSize();
    }, 100);
  }, [map]);

  useEffect(() => {
    if (position && destination) {
      const bounds = L.latLngBounds(
        [position.lat, position.lng],
        [destination.lat, destination.lng]
      );
      map.fitBounds(bounds, { padding: [50, 50] });
    } else if (position) {
      map.setView([position.lat, position.lng]);
    } else if (destination) {
      map.setView([destination.lat, destination.lng]);
    }
  }, [position, destination, map]);

  return null;
}

interface MapViewProps {
  position: { lat: number; lng: number } | null;
  destination?: { lat: number; lng: number; name: string } | null;
}

export default function MapView({ position, destination }: MapViewProps) {
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
        {position && (
          <Marker
            position={[position.lat, position.lng]}
            icon={createCustomIcon()}
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
        <MapUpdater position={position} destination={destination} />
      </MapContainer>
    </div>
  );
}
