// ARWay Offline PWA Configuration
// All tunable parameters for offline caching and verification live here.

import { sceneries } from "./sceneries";
import { shops } from "./shops";

// 1. Routes to pre-cache in arway-pages
export const ROUTES_TO_CACHE: string[] = [
  "/",
  "/maps",
  "/sceneries",
  "/shop",
  "/profile"
];

// 2. Demo areas for offline map tiles pre-caching
export interface DemoArea {
  name: string;
  lat: number;
  lng: number;
}

export const DEMO_AREAS: DemoArea[] = [
  { name: "SM Makati / Ayala Center", lat: 14.5494, lng: 121.0267 },
  { name: "Rizal Park (Luneta)", lat: 14.5826, lng: 120.9787 },
  { name: "Bonifacio Global City (BGC)", lat: 14.5507, lng: 121.0494 }
];

// 3. Tile plan: zoom levels and grid radius around each demo area center
// A radius of r produces a (2*r + 1)^2 tile grid.
export const TILE_PLAN = [
  { z: 15, radius: 1 }, // 9 tiles
  { z: 16, radius: 2 }, // 25 tiles
  { z: 17, radius: 3 }  // 49 tiles
];

// 4. Rate limits and politeness delays for OpenStreetMap tile servers
export const MAX_TILES_TOTAL = 250;
export const TILE_DELAY_MS = 150;

// 5. Tile URL template matching MapView.tsx exactly
export const TILE_URL_TEMPLATE = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";

// 6. Dynamic image paths aggregated from data sources
export function getImageSources(): string[] {
  const images = new Set<string>();

  // Sceneries images
  for (const item of sceneries) {
    if (item.image) images.add(item.image);
    if (item.images && Array.isArray(item.images)) {
      item.images.forEach((img) => images.add(img));
    }
  }

  // Shop images
  for (const item of shops) {
    if (item.image) images.add(item.image);
  }

  // Posts images
  if (typeof window !== "undefined") {
    try {
      const data = localStorage.getItem("arway_posts");
      if (data) {
        const posts = JSON.parse(data);
        if (Array.isArray(posts)) {
          for (const post of posts) {
            if (post.image && (post.image.startsWith("/sceneries/") || post.image.startsWith("/shops/"))) {
              images.add(post.image);
            }
          }
        }
      }
    } catch (e) { }
  }

  // Seed post images defined in posts.ts
  const seedPostImages = [
    "/sceneries/Luneta.jpg",
    "/sceneries/Intramuros.jpg",
    "/sceneries/Fort-Santiago-Intramuros.avif",
    "/sceneries/Dolomite-Beach.jpg",
    "/sceneries/Ayala-Triangle.jpg"
  ];
  seedPostImages.forEach((img) => images.add(img));

  return Array.from(images);
}
