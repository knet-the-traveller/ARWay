# The Disclosures

**Project:** ARWay  
**Track:** Local AI  
**Event:** AppBuildersPH Hackathon 2026  
**Team:** Sector 4  
**Team Members:** Mark Kenneth Galario, Kirby Caranyagan, Abegail Sonsona, Mark Andrew Cruz  
**Repository:** https://github.com/knet-the-traveller/ARWay  
**Live Application:** https://ar-way.vercel.app  

---

## 1. Models Used

| Model Name | Task | Runs Where | Format | Source | License |
|---|---|---|---|---|---|
| **`Xenova/clip-vit-base-patch32`** | Zero-shot image feature extraction for heritage landmark recognition | 100% on-device in browser via WebGPU / WASM | Quantized ONNX (q8) | Hugging Face / Transformers.js | MIT (OpenAI CLIP base) |

* **Zero Cloud Inference:** The computer vision model runs completely inside the user's mobile browser memory. Video frames from the smartphone camera never leave the device, ensuring 100% privacy and zero latency.
* **No Fine-Tuning or Training:** No proprietary machine learning model was trained or fine-tuned by the team. Landmark recognition uses pre-computed normalized 512-dimensional feature embeddings matched via cosine similarity on the client device.
* **Zero Cloud LLM Usage:** No large language models (cloud or local) are queried during runtime to prevent mobile RAM exhaustion and eliminate API latency. Landmark information is retrieved from static JSON metadata.

---

## 2. Technologies and Frameworks

* **Core Framework:** Next.js 16.4.0 (App Router, Turbopack) with React 19.3.0 and TypeScript 5.
* **Styling:** Tailwind CSS v4 with mobile-first viewport design (optimized for 375×667 iPhone SE / Android form factors).
* **AI & Inference Runtime:** `@huggingface/transformers` 4.3.1 with ONNX Runtime Web (`ort-wasm-simd-threaded.wasm`, `ort-wasm-simd-threaded.jsep.wasm`) utilizing WebGPU hardware acceleration and WebAssembly multithreading fallbacks.
* **Mapping & Geospatial:** Native Leaflet 1.9.4 and `react-leaflet` 5.0.0.
* **Service Worker & PWA Stack:** Handcrafted vanilla JavaScript Service Worker (`public/sw.js`) utilizing 6 segregated Cache API buckets (`arway-pages-v2`, `arway-rsc-v2`, `arway-static-v2`, `arway-media-v2`, `arway-tiles-v2`, `arway-cdn-v2`). No external PWA libraries (`next-pwa` or Workbox) were used.
* **Browser Web APIs:**
  - `navigator.mediaDevices.getUserMedia` (multi-camera hardware enumeration, 0.5x ultra-wide, 1x main, 2x telephoto selection)
  - `DeviceOrientationEvent` (`webkitCompassHeading` for iOS and `deviceorientationabsolute` for Android)
  - `navigator.geolocation` (HTML5 Geolocation with fallback demo mode)
  - HTML5 Canvas 2D (custom 2.5D perspective ribbon and ground chevrons rendering)
  - IndexedDB (`transformers-cache` for ONNX model weights and landmark embeddings)
  - Web Storage API (`localStorage` for user session, post feeds, and offline state)
* **Hosting & Deployment:** Vercel edge deployment with automated preview branches and production deployments.

---

## 3. APIs and Cloud Services

| Service | Purpose | When Invoked | Offline Fallback |
|---|---|---|---|
| **OpenStreetMap Tile CDN** (`tile.openstreetmap.org`) | Base map raster street tiles | Initial online map browsing and offline pre-warming | Pre-cached raster tiles in `arway-tiles-v2` or dark vector fallback grid |
| **OSRM Walking Routing** (`routing.openstreetmap.de` / `project-osrm.org`) | Turn-by-turn walking street routing geometry | When setting a new destination online | Cached walking routes in `localStorage` or instant straight-line dead-reckoning bearing |
| **Photon / Nominatim** (`photon.komoot.io` / `nominatim.openstreetmap.org`) | Universal search autocomplete and reverse geocoding | When typing destination in search bar while connected | Pre-loaded catalog of heritage spots, local shops, and offline essentials |
| **Hugging Face CDN** (`huggingface.co`) | Quantized ONNX weights download | One-time initial setup download (~120 MB) | Cached in browser IndexedDB (`transformers-cache`) |
| **jsDelivr CDN** (`cdn.jsdelivr.net`) | ONNX WebAssembly runtime binaries | One-time initial setup download | Pre-cached in `arway-cdn-v2` |
| **Vercel** | Web application shell hosting | Initial website visit over HTTPS | Pre-warmed PWA app shell in `arway-pages-v2` and `arway-static-v2` |

* **Zero Cloud AI / LLM APIs:** No OpenAI, Anthropic, Google Gemini, or other cloud AI endpoints are invoked at application runtime.
* **No Tracking or Third-Party Analytics:** No third-party trackers, external advertising SDKs, or invasive analytics scripts are embedded.

---

## 4. Existing Code and Assets

* **Open-Source Code:**
  - Standard open-source libraries listed in `package.json` (Next.js, React, Leaflet, Transformers.js).
* **Visual & Media Assets:**
  - Landmark reference photos and heritage images (Intramuros, Rizal Park, Manila Cathedral, Fort Santiago) were collected from open public web sources and Wikipedia Commons for demonstration and embedding generation.
  - Shop listings, food items, and promotional media are generic placeholder assets used for hackathon demonstration purposes.
  - Site mascots and logo designs were generated and formatted for the project during the hackathon.
* **Development Timeline:**
  - Repository initialized during AppBuildersPH Hackathon on October 9, 2026.
  - Complete application implementation—including the on-device CLIP inference pipeline, camera sensor calibration, hardware lens switching, 2.5D canvas perspective math, and offline Service Worker architecture—was developed during the hackathon sprint (October 9–10, 2026).
  - All mock posts, user profiles, and test routines were crafted specifically for this project.

---

## 5. AI Development Tools

The development of ARWay utilized advanced AI coding and reasoning assistants to accelerate development velocity:

* **Google Antigravity:**
  - Primary autonomous AI coding agent and pair-programming assistant.
  - Used for implementing core application architecture, writing handcrafted Service Worker caching logic, implementing 2.5D Canvas perspective mathematics, conducting Git synchronization, and troubleshooting hardware sensor anomalies.
* **Google Gemini:**
  - Used for architectural analysis, code reasoning, multimodal debugging, and mobile optimization strategies.
* **Claude (Anthropic):**
  - Used for sprint planning, prompt crafting, system design structuring, and documentation refinement.

* **Human Supervision & Review:**
  - Every line of AI-assisted code was reviewed, validated, and debugged by Sector 4 team members.
  - All critical hardware interactions (Samsung Galaxy A54 5G hardware camera lens switching, physical compass orientation, and true Airplane Mode offline verification) were executed and verified on physical smartphones by the team.
