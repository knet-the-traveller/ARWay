// ARWay Service Worker - Hand-written offline PWA support
// No external PWA libraries (plain JavaScript only)

const CACHE_VERSION = "v1";

const CACHE_PAGES = `arway-pages-${CACHE_VERSION}`;
const CACHE_STATIC = `arway-static-${CACHE_VERSION}`;
const CACHE_MEDIA = `arway-media-${CACHE_VERSION}`;
const CACHE_TILES = `arway-tiles-${CACHE_VERSION}`;
const CACHE_CDN = `arway-cdn-${CACHE_VERSION}`;

const CURRENT_CACHES = [
  CACHE_PAGES,
  CACHE_STATIC,
  CACHE_MEDIA,
  CACHE_TILES,
  CACHE_CDN
];

const TILE_HOSTS = ["tile.openstreetmap.org"];
const MAX_TILES = 400;

// Install: precache /offline.html and skip waiting
self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_PAGES).then(async (cache) => {
      try {
        await cache.add("/offline.html");
      } catch (err) {
        const offlineFallback = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>ARWay - You're offline</title><style>body{margin:0;padding:24px;background:#000;color:#fff;font-family:-apple-system,sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;text-align:center}h1{font-size:22px;margin:0 0 12px}p{font-size:15px;color:#a3a3a3;margin:0 0 24px;max-width:320px}button{width:100%;max-width:320px;height:48px;background:#3b82f6;color:#fff;border:none;border-radius:12px;font-weight:600;cursor:pointer}</style></head><body><h1>You're offline</h1><p>Open ARWay once while online and tap Prepare offline on the Offline setup page so everything is saved on your phone.</p><button onclick="window.location.reload()">Try again</button></body></html>`;
        await cache.put("/offline.html", new Response(offlineFallback, {
          status: 200,
          headers: { "Content-Type": "text/html" }
        }));
      }
    })
  );
});

// Activate: clean up outdated arway- caches and claim clients
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.map((key) => {
          if (key.startsWith("arway-") && !CURRENT_CACHES.includes(key)) {
            return caches.delete(key);
          }
        })
      );
      await self.clients.claim();
    })()
  );
});

// Message listener
self.addEventListener("message", (event) => {
  if (!event.data) return;

  if (event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }

  if (event.data.type === "CLEAR_ALL") {
    event.waitUntil(
      (async () => {
        const keys = await caches.keys();
        await Promise.all(
          keys.map((k) => {
            if (k.startsWith("arway-")) {
              return caches.delete(k);
            }
          })
        );
        if (event.ports && event.ports[0]) {
          event.ports[0].postMessage({ ok: true });
        } else if (event.source) {
          event.source.postMessage({ type: "CLEAR_ALL_DONE", ok: true });
        }
      })()
    );
  }
});

// Fetch Interception
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // Exclude ignored endpoints and Turbopack dev/HMR requests
  if (
    url.pathname.includes("/api/") ||
    url.hostname === "routing.openstreetmap.de" ||
    url.hostname === "nominatim.openstreetmap.org" ||
    url.hostname === "huggingface.co" ||
    url.hostname === "hf.co" ||
    url.protocol === "chrome-extension:" ||
    url.pathname.includes("turbopack") ||
    url.pathname.includes("webpack-hmr") ||
    url.pathname.includes(".hot-update.") ||
    req.headers.has("range")
  ) {
    return;
  }

  // 1. Navigation requests (HTML pages)
  if (req.mode === "navigate") {
    event.respondWith(
      (async () => {
        const pagesCache = await caches.open(CACHE_PAGES);

        // Network-first with a 4-second timeout
        try {
          const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve(null), 4000));
          const fetchPromise = fetch(req).then((res) => {
            if (res && res.ok) {
              pagesCache.put(req, res.clone());
            }
            return res;
          }).catch(() => null);

          const networkRes = await Promise.race([fetchPromise, timeoutPromise]);
          if (networkRes && networkRes.ok) {
            return networkRes;
          }
        } catch (e) {}

        // Fallback: match URL ignoring search params
        const cachedMatch = await pagesCache.match(req, { ignoreSearch: true });
        if (cachedMatch) return cachedMatch;

        // Fallback: cached "/maps"
        const mapsMatch = await pagesCache.match("/maps", { ignoreSearch: true });
        if (mapsMatch) return mapsMatch;

        // Fallback: root "/"
        const rootMatch = await pagesCache.match("/", { ignoreSearch: true });
        if (rootMatch) return rootMatch;

        // Fallback: /offline.html
        const offlineMatch = await pagesCache.match("/offline.html");
        if (offlineMatch) return offlineMatch;

        // Guaranteed inline 200 HTML recovery page (never 503 so Chrome never shows dinosaur)
        const inlineHtml = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>ARWay - Offline</title><style>body{margin:0;padding:24px;background:#000;color:#fff;font-family:-apple-system,sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;text-align:center}h1{font-size:20px;margin-bottom:8px}p{font-size:14px;color:#888;margin-bottom:20px;max-width:280px}a{display:inline-block;padding:12px 24px;background:#3b82f6;color:#fff;border-radius:12px;text-decoration:none;font-weight:600}</style></head><body><h1>Offline Navigation</h1><p>This tab is not saved yet. Return to Maps or connect online to prepare offline assets.</p><a href="/maps">Return to Maps</a></body></html>`;
        return new Response(inlineHtml, {
          status: 200,
          headers: { "Content-Type": "text/html; charset=utf-8" }
        });
      })()
    );
    return;
  }

  // 2. /_next/static/* (hashed immutable Next.js assets in production) -> Cache-First
  if (url.origin === self.location.origin && url.pathname.startsWith("/_next/static/")) {
    // In development mode, do not intercept or cache Turbopack dev chunks
    if (url.pathname.includes("/dev/") || url.pathname.includes("turbopack")) {
      return;
    }

    event.respondWith(
      (async () => {
        const staticCache = await caches.open(CACHE_STATIC);
        const cached = await staticCache.match(req);
        if (cached) return cached;

        try {
          const res = await fetch(req);
          if (res && res.ok) {
            staticCache.put(req, res.clone());
          }
          return res;
        } catch (e) {
          // If offline and missing, return empty response so build doesn't throw fatal crash
          return new Response("", { status: 404 });
        }
      })()
    );
    return;
  }

  // 3. Same-origin RSC and data requests
  const isRsc = req.headers.get("RSC") === "1" || url.searchParams.has("_rsc") || url.pathname.startsWith("/_next/data/");
  if (url.origin === self.location.origin && isRsc) {
    event.respondWith(
      (async () => {
        const pagesCache = await caches.open(CACHE_PAGES);
        try {
          const res = await fetch(req);
          if (res && res.ok) {
            pagesCache.put(req, res.clone());
            return res;
          }
        } catch (e) {}

        const cached = await pagesCache.match(req, { ignoreSearch: true });
        if (cached) return cached;

        // If neither, let request fail so Next.js falls back to full-page navigation
        return new Response("RSC fetch failed", { status: 503 });
      })()
    );
    return;
  }

  // 4. Same-origin media, images, fonts, icons -> Cache-First
  const isMedia = url.origin === self.location.origin && (
    url.pathname.startsWith("/sceneries/") ||
    url.pathname.startsWith("/shops/") ||
    url.pathname.startsWith("/icons/") ||
    req.destination === "image" ||
    req.destination === "font"
  );
  if (isMedia) {
    event.respondWith(
      (async () => {
        const mediaCache = await caches.open(CACHE_MEDIA);
        const cached = await mediaCache.match(req);
        if (cached) return cached;

        try {
          const res = await fetch(req);
          if (res && res.ok) {
            mediaCache.put(req, res.clone());
          }
          return res;
        } catch (e) {
          return new Response("", { status: 404 });
        }
      })()
    );
    return;
  }

  // 5. OpenStreetMap Tiles -> Cache-First into arway-tiles
  if (TILE_HOSTS.some((host) => url.hostname.includes(host))) {
    event.respondWith(
      (async () => {
        const tilesCache = await caches.open(CACHE_TILES);
        const cached = await tilesCache.match(req);
        if (cached) return cached;

        try {
          // Leaflet requests tiles with no-cors. Refetch with cors to store clean non-opaque response.
          let res;
          try {
            res = await fetch(new Request(url.toString(), { mode: "cors" }));
          } catch (corsErr) {
            res = await fetch(req);
          }

          if (res && (res.ok || res.type === "opaque")) {
            await tilesCache.put(req, res.clone());

            // Limit cache to MAX_TILES
            const keys = await tilesCache.keys();
            if (keys.length > MAX_TILES) {
              const overflow = keys.length - MAX_TILES;
              for (let i = 0; i < overflow; i++) {
                await tilesCache.delete(keys[i]);
              }
            }
            return res;
          }
        } catch (e) {}

        // If offline and tile missing, return 204 No Content so Leaflet stays blank without error
        return new Response(null, { status: 204 });
      })()
    );
    return;
  }

  // 6. ONNX runtime files from cdn.jsdelivr.net -> Cache-First into arway-cdn
  if (url.hostname === "cdn.jsdelivr.net") {
    event.respondWith(
      (async () => {
        const cdnCache = await caches.open(CACHE_CDN);
        const cached = await cdnCache.match(req);
        if (cached) return cached;

        try {
          const res = await fetch(req);
          if (res && res.ok) {
            cdnCache.put(req, res.clone());
          }
          return res;
        } catch (e) {
          return new Response("", { status: 404 });
        }
      })()
    );
    return;
  }
});
