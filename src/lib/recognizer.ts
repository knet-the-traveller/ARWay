import { MODEL_ID, INPUT_SIZE } from "./recognizerConfig";
import { sceneries } from "./sceneries";

let pipelineInstance: any = null;
let currentDevice: string = "webgpu";
let references: Array<{ placeId: string; name: string; vector: Float32Array }> = [];

const CACHE_DB_NAME = "ARWayRecognizer";
const CACHE_STORE_NAME = "embeddings";
const CACHE_VERSION = 1;

// Simple IndexedDB wrapper
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(CACHE_DB_NAME, CACHE_VERSION);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(CACHE_STORE_NAME);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function getCachedVector(key: string): Promise<Float32Array | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(CACHE_STORE_NAME, "readonly");
      const store = tx.objectStore(CACHE_STORE_NAME);
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result as Float32Array || null);
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    return null;
  }
}

async function setCachedVector(key: string, vector: Float32Array): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(CACHE_STORE_NAME, "readwrite");
      const store = tx.objectStore(CACHE_STORE_NAME);
      const req = store.put(vector, key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (e) {}
}

export async function loadRecognizer(onProgress?: (info: any) => void) {
  if (pipelineInstance) return { device: currentDevice };

  const { pipeline, env } = await import("@huggingface/transformers");
  env.allowLocalModels = false;
  if (env.backends?.onnx?.wasm) {
    env.backends.onnx.wasm.numThreads = 1;
  }

  try {
    const hasWebGPU = typeof navigator !== "undefined" && "gpu" in navigator;
    if (hasWebGPU) {
      currentDevice = "webgpu";
      pipelineInstance = await pipeline("image-feature-extraction", MODEL_ID, {
        dtype: "q8",
        device: "webgpu",
        progress_callback: onProgress
      });
    } else {
      throw new Error("WebGPU not available");
    }
  } catch (err) {
    currentDevice = "wasm";
    pipelineInstance = await pipeline("image-feature-extraction", MODEL_ID, {
      dtype: "q8",
      device: "wasm",
      progress_callback: onProgress
    });
  }

  // Warm-up on a blank canvas
  const canvas = document.createElement("canvas");
  canvas.width = INPUT_SIZE;
  canvas.height = INPUT_SIZE;
  const blankUrl = canvas.toDataURL("image/jpeg");
  await pipelineInstance(blankUrl);

  return { device: currentDevice };
}

function normalizeVector(vector: number[] | Float32Array): Float32Array {
  const arr = vector instanceof Float32Array ? vector : new Float32Array(vector);
  let sum = 0;
  for (let i = 0; i < arr.length; i++) {
    sum += arr[i] * arr[i];
  }
  const norm = Math.sqrt(sum);
  if (norm > 0) {
    for (let i = 0; i < arr.length; i++) {
      arr[i] /= norm;
    }
  }
  return arr;
}

function resizeImageToCanvasDataUrl(img: HTMLImageElement | HTMLVideoElement): string {
  const canvas = document.createElement("canvas");
  canvas.width = INPUT_SIZE;
  canvas.height = INPUT_SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  const w = img instanceof HTMLVideoElement ? img.videoWidth : img.width;
  const h = img instanceof HTMLVideoElement ? img.videoHeight : img.height;
  
  const size = Math.min(w, h);
  const sx = (w - size) / 2;
  const sy = (h - size) / 2;

  ctx.drawImage(img, sx, sy, size, size, 0, 0, INPUT_SIZE, INPUT_SIZE);
  return canvas.toDataURL("image/jpeg", 0.9);
}

function loadHTMLImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
    img.src = url;
  });
}

export async function prepareReferences(onProgress?: (done: number, total: number) => void) {
  const placesWithImages = sceneries.filter(s => !!s.image);
  sceneries.filter(s => !s.image).forEach(s => console.warn(`Skipped ${s.name} (no image)`));

  const total = placesWithImages.length;
  let done = 0;
  references = [];

  for (const place of placesWithImages) {
    const imageUrl = place.image!;
    const cacheKey = `${imageUrl}_v${CACHE_VERSION}`;
    
    let vector = await getCachedVector(cacheKey);
    if (!vector) {
      try {
        const img = await loadHTMLImage(imageUrl);
        const dataUrl = resizeImageToCanvasDataUrl(img);
        const output = await pipelineInstance(dataUrl);
        vector = normalizeVector(output.data);
        await setCachedVector(cacheKey, vector);
      } catch (err) {
        console.error(`Failed to embed reference for ${place.name}:`, err);
      }
    }

    if (vector) {
      references.push({ placeId: place.id, name: place.name, vector });
    }

    done++;
    if (onProgress) onProgress(done, total);
  }
}

export async function embedFrame(video: HTMLVideoElement): Promise<Float32Array | null> {
  if (!pipelineInstance) return null;
  const dataUrl = resizeImageToCanvasDataUrl(video);
  if (!dataUrl) return null;
  const output = await pipelineInstance(dataUrl);
  return normalizeVector(output.data);
}

export function matchFrame(vector: Float32Array) {
  const scores = new Map<string, { name: string; score: number }>();

  // Use max similarity if a place has multiple vectors (we only have 1 right now, but supports future extensions)
  for (const ref of references) {
    let dotProduct = 0;
    for (let i = 0; i < vector.length; i++) {
      dotProduct += vector[i] * ref.vector[i];
    }
    
    const existing = scores.get(ref.placeId);
    if (!existing || dotProduct > existing.score) {
      scores.set(ref.placeId, { name: ref.name, score: dotProduct });
    }
  }

  const results = Array.from(scores.entries()).map(([placeId, data]) => ({
    placeId,
    name: data.name,
    score: data.score
  }));

  results.sort((a, b) => b.score - a.score);

  const top3 = results.slice(0, 3);
  const margin = top3.length > 1 ? top3[0].score - top3[1].score : 0;

  return { top3, margin };
}
