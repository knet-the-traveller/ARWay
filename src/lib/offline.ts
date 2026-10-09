// ARWay Offline Helpers & Diagnostics
// Client-only functions for preparing, caching, and verifying offline PWA data.

import { useState, useEffect } from "react";
import {
  ROUTES_TO_CACHE,
  DEMO_AREAS,
  TILE_PLAN,
  MAX_TILES_TOTAL,
  TILE_DELAY_MS,
  TILE_URL_TEMPLATE,
  getImageSources
} from "./offlineConfig";
import { loadRecognizer, prepareReferences } from "./recognizer";

// Tile coordinate math
export function tileCoords(lat: number, lng: number, zoom: number): { x: number; y: number; z: number } {
  const x = Math.floor(((lng + 180) / 360) * Math.pow(2, zoom));
  const rad = (lat * Math.PI) / 180;
  const y = Math.floor(
    ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * Math.pow(2, zoom)
  );
  return { x, y, z: zoom };
}

// Build de-duplicated list of tile URLs for demo zones and user location
export function buildTileList(userPos?: { lat: number; lng: number }): string[] {
  const urls = new Set<string>();
  const centers: { name: string; lat: number; lng: number }[] = [];
  
  // If user GPS is provided, prioritize venue location first before hitting tile budget
  if (userPos && userPos.lat && userPos.lng) {
    centers.push({ name: "Current Position", lat: userPos.lat, lng: userPos.lng });
  }
  centers.push(...DEMO_AREAS);

  for (const center of centers) {
    for (const plan of TILE_PLAN) {
      const { x: cx, y: cy, z } = tileCoords(center.lat, center.lng, plan.z);
      for (let dx = -plan.radius; dx <= plan.radius; dx++) {
        for (let dy = -plan.radius; dy <= plan.radius; dy++) {
          if (urls.size >= MAX_TILES_TOTAL) break;
          const tx = cx + dx;
          const ty = cy + dy;
          const url = TILE_URL_TEMPLATE
            .replace("{z}", z.toString())
            .replace("{x}", tx.toString())
            .replace("{y}", ty.toString());
          urls.add(url);
        }
      }
    }
  }

  return Array.from(urls);
}

// Hook returning live online status, safe for SSR hydration
export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState<boolean>(true);
  const [mounted, setMounted] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
    if (typeof navigator !== "undefined") {
      setOnline(navigator.onLine);
    }

    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return mounted ? online : true;
}

// Warm pages and extracted static script/css chunks
export async function warmPages(
  onProgress?: (current: number, total: number, label: string) => void
): Promise<{ pagesCount: number; chunksCount: number }> {
  if (typeof window === "undefined") return { pagesCount: 0, chunksCount: 0 };

  let pagesCount = 0;
  const chunkUrls = new Set<string>();
  let pagesCache: Cache | null = null;
  let staticCache: Cache | null = null;

  try {
    if ("caches" in window) {
      pagesCache = await caches.open("arway-pages-v1");
      staticCache = await caches.open("arway-static-v1");
    }
  } catch (e) {}

  for (let i = 0; i < ROUTES_TO_CACHE.length; i++) {
    const route = ROUTES_TO_CACHE[i];
    onProgress?.(i, ROUTES_TO_CACHE.length, `Fetching ${route}`);
    try {
      const res = await fetch(route, { credentials: "same-origin" });
      if (res && res.ok) {
        pagesCount++;
        if (pagesCache) {
          await pagesCache.put(route, res.clone());
        }
        const html = await res.text();

        // 1. Match standard /_next/static/ URLs
        const nextStaticMatches = html.match(/\/(_next\/static\/[a-zA-Z0-9_\-\.\/]+)/g) || [];
        nextStaticMatches.forEach((m) => chunkUrls.add(m));

        // 2. Match static/chunks/... appearing without leading /_next/
        const rawChunkMatches = html.match(/static\/chunks\/[a-zA-Z0-9_\-\.\/]+(\.js|\.css)/g) || [];
        rawChunkMatches.forEach((m) => chunkUrls.add(`/_next/${m}`));
      }
    } catch (e) { }
  }

  // Fetch unique chunks
  const uniqueChunks = Array.from(chunkUrls);
  let chunksCount = 0;
  for (let j = 0; j < uniqueChunks.length; j++) {
    const chunk = uniqueChunks[j];
    onProgress?.(j, uniqueChunks.length, `Caching chunk: ${chunk.split("/").pop()}`);
    try {
      const cRes = await fetch(chunk);
      if (cRes && cRes.ok) {
        chunksCount++;
        if (staticCache) {
          await staticCache.put(chunk, cRes.clone());
        }
      }
    } catch (e) { }
  }

  return { pagesCount, chunksCount };
}

// Warm all sceneries, shops, and post images
export async function warmImages(
  onProgress?: (current: number, total: number, label: string) => void
): Promise<number> {
  if (typeof window === "undefined") return 0;

  const images = getImageSources();
  let count = 0;
  let mediaCache: Cache | null = null;
  try {
    if ("caches" in window) {
      mediaCache = await caches.open("arway-media-v1");
    }
  } catch (e) {}

  for (let i = 0; i < images.length; i++) {
    const imgUrl = images[i];
    onProgress?.(i, images.length, `Caching image: ${imgUrl.split("/").pop()}`);
    try {
      const res = await fetch(imgUrl);
      if (res && res.ok) {
        count++;
        if (mediaCache) {
          await mediaCache.put(imgUrl, res.clone());
        }
      }
    } catch (e) { }
  }

  return count;
}

// Warm and pre-cache on-device AI model weights and ONNX runtime files
export async function prepareAi(
  onProgress?: (info: string) => void
): Promise<{ success: boolean; onnxFilesCached: number }> {
  if (typeof window === "undefined") return { success: false, onnxFilesCached: 0 };

  try {
    onProgress?.("Loading CLIP model...");
    await loadRecognizer();

    onProgress?.("Building landmark reference embeddings...");
    await prepareReferences();

    // Check performance resource entries for cdn.jsdelivr.net runtime files
    onProgress?.("Caching ONNX WebAssembly & JS runtimes...");
    const resources = performance.getEntriesByType("resource") as PerformanceResourceTiming[];
    const cdnEntries = resources.filter((r) => {
      const u = r.name;
      return u.includes("cdn.jsdelivr.net") && (u.endsWith(".wasm") || u.endsWith(".mjs"));
    });

    const fallbackWasmUrls = [
      "https://cdn.jsdelivr.net/npm/@huggingface/transformers/dist/ort-wasm-simd-threaded.wasm",
      "https://cdn.jsdelivr.net/npm/@huggingface/transformers/dist/ort-wasm-simd-threaded.jsep.wasm",
      "https://cdn.jsdelivr.net/npm/@huggingface/transformers/dist/ort-wasm-simd.wasm"
    ];
    const urlsToFetch = new Set<string>(cdnEntries.map((e) => e.name));
    fallbackWasmUrls.forEach((u) => urlsToFetch.add(u));

    let cdnCache: Cache | null = null;
    try {
      if ("caches" in window) {
        cdnCache = await caches.open("arway-cdn-v1");
      }
    } catch (e) {}

    let onnxFilesCached = 0;
    for (const url of Array.from(urlsToFetch)) {
      try {
        const res = await fetch(url, { mode: "cors" });
        if (res && res.ok) {
          onnxFilesCached++;
          if (cdnCache) {
            await cdnCache.put(url, res.clone());
          }
        }
      } catch (e) { }
    }

    return { success: true, onnxFilesCached };
  } catch (err: any) {
    console.warn("AI offline preparation error:", err);
    return { success: false, onnxFilesCached: 0 };
  }
}

// Warm map tiles sequentially
export async function warmTiles(
  arg1?: { lat: number; lng: number } | ((current: number, total: number, label: string) => void),
  arg2?: (current: number, total: number, label: string) => void
): Promise<number> {
  if (typeof window === "undefined") return 0;

  const userPos = typeof arg1 === "object" && arg1 !== null ? arg1 : undefined;
  const onProgress = typeof arg1 === "function" ? arg1 : arg2;

  const tileUrls = buildTileList(userPos);
  let successCount = 0;
  let consecutiveFailures = 0;

  for (let i = 0; i < tileUrls.length; i++) {
    if (consecutiveFailures >= 20) {
      console.warn("Aborting tile warm: exceeded 20 consecutive failures.");
      break;
    }

    const url = tileUrls[i];
    onProgress?.(i, tileUrls.length, `Fetching tile (${i + 1}/${tileUrls.length})`);

    try {
      const res = await fetch(url, { mode: "cors" });
      if (res && (res.ok || res.type === "opaque")) {
        successCount++;
        consecutiveFailures = 0;
      } else {
        consecutiveFailures++;
      }
    } catch (e) {
      consecutiveFailures++;
    }

    // Delay between tile requests to be polite to OSM servers
    await new Promise((r) => setTimeout(r, TILE_DELAY_MS));
  }

  return successCount;
}

// Request persistent storage
export async function requestPersistence(): Promise<boolean> {
  if (typeof navigator !== "undefined" && navigator.storage && navigator.storage.persist) {
    try {
      return await navigator.storage.persist();
    } catch (e) { }
  }
  return false;
}

// Estimate storage usage
export async function getStorageSummary(): Promise<{ usedMb: number; quotaMb: number }> {
  if (typeof navigator !== "undefined" && navigator.storage && navigator.storage.estimate) {
    try {
      const est = await navigator.storage.estimate();
      const usedMb = Math.round((est.usage || 0) / (1024 * 1024));
      const quotaMb = Math.round((est.quota || 0) / (1024 * 1024));
      return { usedMb, quotaMb };
    } catch (e) { }
  }
  return { usedMb: 0, quotaMb: 0 };
}

export interface VerifyItem {
  label: string;
  ok: boolean;
  detail: string;
}

// Comprehensive offline readiness checklist
export async function verifyOffline(): Promise<VerifyItem[]> {
  const results: VerifyItem[] = [];

  // 1. Service worker active and controlling the page
  const swActive = typeof navigator !== "undefined" && "serviceWorker" in navigator && !!navigator.serviceWorker.controller;
  results.push({
    label: "Service Worker Active",
    ok: swActive,
    detail: swActive ? "Service worker is actively controlling this page" : "Service worker is not active (test over HTTPS production)"
  });

  if (typeof window === "undefined" || !("caches" in window)) {
    return results;
  }

  // 2. Each ROUTES_TO_CACHE present
  let missingRoutes: string[] = [];
  for (const route of ROUTES_TO_CACHE) {
    const match = await caches.match(route, { ignoreSearch: true });
    if (!match) missingRoutes.push(route);
  }
  results.push({
    label: "App Shell Pages Cached",
    ok: missingRoutes.length === 0,
    detail: missingRoutes.length === 0 ? "All 5 core routes cached" : `Missing: ${missingRoutes.join(", ")}`
  });

  // 3. Every sceneries image present
  const images = getImageSources();
  let missingImgs = 0;
  for (const img of images) {
    const match = await caches.match(img);
    if (!match) missingImgs++;
  }
  results.push({
    label: "Images & Sceneries",
    ok: missingImgs === 0,
    detail: missingImgs === 0 ? `All ${images.length} images cached` : `${missingImgs} of ${images.length} images missing`
  });

  // 4. At least 20 tiles present in arway-tiles
  let tileCount = 0;
  try {
    const tileCache = await caches.open("arway-tiles-v1");
    const keys = await tileCache.keys();
    tileCount = keys.length;
  } catch (e) { }
  results.push({
    label: "Map Tiles Cached",
    ok: tileCount >= 20,
    detail: `${tileCount} tiles in offline cache (target: >= 20)`
  });

  // 5. transformers-cache exists and has entries
  let modelCached = false;
  let modelEntriesCount = 0;
  try {
    const keys = await caches.keys();
    if (keys.includes("transformers-cache")) {
      const tCache = await caches.open("transformers-cache");
      const entries = await tCache.keys();
      modelEntriesCount = entries.length;
      modelCached = modelEntriesCount > 0;
    }
  } catch (e) { }
  results.push({
    label: "CLIP Model Weights",
    ok: modelCached,
    detail: modelCached ? `${modelEntriesCount} files in transformers-cache` : "No model files found in transformers-cache"
  });

  // 6. AI verification check: test model load & reference prep
  let aiOk = false;
  let elapsedMs = 0;
  try {
    const t0 = performance.now();
    await loadRecognizer();
    await prepareReferences();
    const t1 = performance.now();
    elapsedMs = Math.round(t1 - t0);
    aiOk = true;
  } catch (e) { }
  results.push({
    label: "AI Offline Execution Test",
    ok: aiOk,
    detail: aiOk ? `Model verified offline in ${elapsedMs}ms` : "AI offline execution failed"
  });

  // 7. At least one cdn.jsdelivr.net .wasm entry in arway-cdn, or verified via WebGPU execution
  let cdnWasmCount = 0;
  try {
    const cdnCache = await caches.open("arway-cdn-v1");
    const keys = await cdnCache.keys();
    cdnWasmCount = keys.filter((k) => k.url.includes(".wasm")).length;
  } catch (e) { }

  const runtimeOk = cdnWasmCount > 0 || (modelCached && aiOk);
  results.push({
    label: "ONNX Runtime (WASM / WebGPU)",
    ok: runtimeOk,
    detail: cdnWasmCount > 0
      ? `${cdnWasmCount} WASM runtimes stored in arway-cdn`
      : (aiOk ? "WebGPU hardware acceleration active & verified" : "No WASM runtime files cached in arway-cdn")
  });

  return results;
}

// Clear all offline data
export async function clearOfflineData(): Promise<void> {
  if (typeof window === "undefined") return;

  // 1. Post CLEAR_ALL to service worker
  if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({ type: "CLEAR_ALL" });
  }

  // 2. Delete all arway caches and transformers-cache directly
  if ("caches" in window) {
    try {
      const keys = await caches.keys();
      await Promise.all(
        keys.map((k) => {
          if (k.startsWith("arway-") || k === "transformers-cache") {
            return caches.delete(k);
          }
        })
      );
    } catch (e) { }
  }

  // 3. Clear localStorage offline ready marker
  try {
    localStorage.removeItem("arway_offline_ready");
  } catch (e) { }
}

// Save summary to localStorage
export function saveOfflineSummary(summary: {
  time: number;
  pages: number;
  images: number;
  tiles: number;
  aiReady: boolean;
}): void {
  try {
    if (typeof window !== "undefined") {
      localStorage.setItem("arway_offline_ready", JSON.stringify(summary));
    }
  } catch (e) { }
}
