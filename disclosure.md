# The Disclosures

**Project:** ARWay (Offline Landmark Vision & Wayfinder)  
**Track:** Local AI Track — AppBuildersPH 2026  
**Team:** Sector 4 (@knet-the-traveller)  

---

## 1. Models Used

### In-App Edge Inference Model (Runs on Device)
| Model Name | Task | Runs Where | Format | Source | License |
|---|---|---|---|---|---|
| `Xenova/clip-vit-base-patch32` | Zero-shot visual landmark feature extraction and cosine similarity classification | Client-side mobile browser memory via WebGPU / WASM | ONNX (8-bit quantized, ~120 MB) | Hugging Face / Transformers.js | MIT |

* **Zero Cloud Inference:** 100% of landmark vision inference executes entirely on the user's mobile device. No camera frames, images, or video streams are ever transmitted over the network or stored on external servers.
* **Pre-Computed Reference Embeddings:** Static 512-dimension normalized embeddings for the 14 catalogued heritage landmarks are stored in [`src/lib/precomputedEmbeddings.json`](./src/lib/precomputedEmbeddings.json) for instantaneous (<50ms) offline comparison without model training overhead.
* **No In-House Model Training:** No proprietary machine learning foundation models were trained from scratch or fine-tuned by the team; we utilized open-source quantized ONNX foundation weights.

### AI Models & Systems Used During Development
During the design, engineering, and testing phases of the hackathon, the team utilized the following AI models and developer tools:
* **Google Antigravity (Advanced Agentic Coding):** Primary autonomous AI coding agent used to implement components, write TypeScript logic, refactor canvas mathematical projections, implement Service Worker cache segregation, and manage git workflows.
* **Gemini (Google DeepMind):** Used for algorithmic reasoning, sensor math analysis, spatial vector calculation review, and system architecture planning.
* **Claude (Anthropic):** Used for preliminary ideation, requirement refinement, and structured prompt engineering.

*All AI-generated code, algorithms, and configurations were actively reviewed, debugged, hardened, and physically verified on mobile hardware by the human developer.*

---

## 2. Technologies and Frameworks

* **Core Framework:** Next.js 16.4.0 (App Router, Turbopack)
* **UI & Rendering:** React 19.3.0, TypeScript 5
* **Styling:** Tailwind CSS v4 (vanilla CSS variables for dynamic themes and safe-area insets)
* **Mapping Engine:** Leaflet 1.9.4 & native imperative DOM lifecycle bindings
* **Local Machine Learning Runtime:** `@huggingface/transformers` v4.3.1 (with ONNX Runtime Web executing via WebGPU with WASM CPU fallback)
* **Native Browser Hardware APIs:**
  - `MediaDevices.getUserMedia()` — Multi-camera hardware enumeration and live video feed
  - `Geolocation API` — GPS satellite coordinate capture with EMA accuracy tracking
  - `DeviceOrientationEvent` (`deviceorientationabsolute` on Android, `webkitCompassHeading` on iOS) — Magnetometer hardware compass
  - `Canvas 2D API` — Custom 2.5D perspective ground ribbon, animated chevrons, and destination markers
  - `Service Worker API` & `Cache Storage API` — Handcrafted 5-tier segregated offline cache system (`arway-pages`, `arway-rsc`, `arway-static`, `arway-media`, `arway-tiles`, `arway-cdn`)
  - `StorageManager` (`navigator.storage.persist()`) — Persistent browser storage allocation
  - `IndexedDB` — Transformers.js model weight caching (`transformers-cache`)
  - `localStorage` — Offline readiness markers, user consent preferences, and demo tour states
* **Hand-Written PWA Architecture:** Zero heavyweight third-party PWA wrappers (NO `next-pwa`, NO `workbox`, NO `three.js`, NO `webxr`).

---

## 3. APIs and Cloud Services

| Service / Endpoint | Purpose | Trigger / Timing | Offline Behavior |
|---|---|---|---|
| **OpenStreetMap Tile Servers** (`tile.openstreetmap.org`) | Cartographic street map raster tiles | Initial online browsing and during `/offline-setup` tile pre-warming | Pre-cached tiles served from `arway-tiles-v2`; dark grid fallback for un-synced regions |
| **OSRM Walking Routing** (`routing.openstreetmap.de` / `project-osrm.org`) | Pedestrian turn-by-turn route geometry | Initial route calculation to selected destination | Cached in `arway_route_cache_v2`; falls back to 0ms direct-bearing straight-line vector |
| **Photon / Nominatim** (`photon.komoot.io` / `nominatim.openstreetmap.org`) | POI typeahead and address geocoding | User typing queries into the map search bar | Falls back to catalogued heritage sites, local shops, and manual pin drops |
| **Hugging Face CDN** (`huggingface.co`) | Quantized ONNX weights for CLIP | One-time download during initial visit or offline preparation | Stored in IndexedDB (`transformers-cache`) for permanent offline execution |
| **jsDelivr CDN** (`cdn.jsdelivr.net`) | ONNX WebAssembly & JSEP runtime binaries | One-time download during initial visit | Stored in `arway-cdn-v2` for permanent offline execution |
| **Vercel** | Edge hosting, static asset delivery, and SSL termination | Initial web application load over HTTPS | App shell completely cached in `arway-pages-v2` and `arway-static-v2` |

* **Zero Cloud Vision / Cloud LLMs:** Camera feeds NEVER touch any server. No external cloud vision, image recognition, or cloud LLM APIs are invoked at runtime.
* **Zero Paid / Private API Keys:** All network lookups utilize public, open endpoints or local fallbacks.
* *Map data © OpenStreetMap contributors (ODbL).*

---

## 4. Existing Code and Assets

* **Open-Source Packages:** All dependencies referenced in [`package.json`](./package.json) are standard open-source libraries under MIT, Apache-2.0, or BSD licenses.
* **Visual Assets & Photography:**
  - Landmark reference photographs (Manila Cathedral, Fort Santiago, San Agustin Church, Rizal Monument, etc.) and demo shop imagery were gathered online during the hackathon proper for testing and prototype demonstration purposes.
  - App icons, SVG vector graphics, and mascot illustrations were designed or formatted during the hackathon sprint.
* **Placeholder & Mock Data:**
  - Demo shop catalog (`shops.ts`), heritage descriptions (`sceneries.ts`), and initial tourist feed posts (`homeFeed.ts`) were composed during the hackathon.
* **Development History:**
  - All source code, Git commits, architecture designs, PWA service workers, mathematical AR projections, and offline synchronization engines were authored during the official AppBuildersPH 2026 hackathon window (October 9–10, 2026).

---

## 5. AI Development Tools

* **Google Antigravity:**
  - Integrated agentic coding tool used as the primary developer assistant for implementing features, writing unit tests, synchronizing Git branches, refactoring 2.5D projection geometry, and debugging offline Service Worker edge cases.
* **Gemini (Google DeepMind):**
  - Utilized for high-level system reasoning, sensor math optimization (exponential moving average compass smoothing, 3D perspective projection formulas), and legal compliance policy drafting.
* **Claude (Anthropic):**
  - Utilized for rapid prompt formulation, sprint task breakdown, and technical documentation synthesis.

*Human verification: 100% of all generated code, sensor calibrations, and offline cache routines were reviewed, edited, and validated on physical Android and iOS mobile hardware by the development team.*
