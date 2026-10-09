import { MODEL_ID, INPUT_SIZE, REFERENCE_VERSION } from "./recognizerConfig";
import { sceneries } from "./sceneries";
import precomputedEmbeddings from "./precomputedEmbeddings.json";

let pipelineInstance: any = null;
let currentDevice: string = "webgpu";
let references: Array<{ placeId: string; name: string; vector: Float32Array }> = [];

const CACHE_DB_NAME = "ARWayRecognizer";
const CACHE_STORE_NAME = "embeddings";

// Simple IndexedDB wrapper
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(CACHE_DB_NAME, REFERENCE_VERSION);
    req.onupgradeneeded = (event: any) => {
      const db = event.target.result;
      if (db.objectStoreNames.contains(CACHE_STORE_NAME)) {
        db.deleteObjectStore(CACHE_STORE_NAME);
      }
      db.createObjectStore(CACHE_STORE_NAME);
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

function resizeImageToCanvasDataUrl(img: HTMLImageElement | HTMLVideoElement, zoom: number = 1): string {
  const canvas = document.createElement("canvas");
  canvas.width = INPUT_SIZE;
  canvas.height = INPUT_SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  const w = img instanceof HTMLVideoElement ? img.videoWidth : img.width;
  const h = img instanceof HTMLVideoElement ? img.videoHeight : img.height;
  
  // Base square crop
  let size = Math.min(w, h);
  // Apply zoom factor (e.g. 2x zoom crops the center 50% of the image)
  if (zoom > 1) {
    size = Math.round(size / zoom);
  }
  
  const sx = Math.round((w - size) / 2);
  const sy = Math.round((h - size) / 2);

  ctx.drawImage(img, sx, sy, size, size, 0, 0, INPUT_SIZE, INPUT_SIZE);
  return canvas.toDataURL("image/jpeg", 0.9);
}

function extractAugmentedCrops(img: HTMLImageElement): string[] {
  const crops: string[] = [];
  const w = img.width;
  const h = img.height;
  
  const canvas = document.createElement("canvas");
  canvas.width = INPUT_SIZE;
  canvas.height = INPUT_SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) return crops;

  const pushCrop = () => crops.push(canvas.toDataURL("image/jpeg", 0.9));

  // (a) Center square crop
  const size = Math.min(w, h);
  const cx = (w - size) / 2;
  const cy = (h - size) / 2;
  ctx.drawImage(img, cx, cy, size, size, 0, 0, INPUT_SIZE, INPUT_SIZE);
  pushCrop();

  // (b) Center square crop flipped horizontally
  ctx.save();
  ctx.translate(INPUT_SIZE, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(img, cx, cy, size, size, 0, 0, INPUT_SIZE, INPUT_SIZE);
  ctx.restore();
  pushCrop();

  // (c) Zoomed center crop (center 70% of the image)
  const zSize = size * 0.7;
  const zx = cx + (size - zSize) / 2;
  const zy = cy + (size - zSize) / 2;
  ctx.drawImage(img, zx, zy, zSize, zSize, 0, 0, INPUT_SIZE, INPUT_SIZE);
  pushCrop();

  // (d) & (e) Left and right biased crops (for landscape), or top/bottom (for portrait)
  if (w > h) {
    // Landscape
    ctx.drawImage(img, 0, cy, size, size, 0, 0, INPUT_SIZE, INPUT_SIZE);
    pushCrop(); // Left-biased
    ctx.drawImage(img, w - size, cy, size, size, 0, 0, INPUT_SIZE, INPUT_SIZE);
    pushCrop(); // Right-biased
  } else if (h > w) {
    // Portrait
    ctx.drawImage(img, cx, 0, size, size, 0, 0, INPUT_SIZE, INPUT_SIZE);
    pushCrop(); // Top-biased
    ctx.drawImage(img, cx, h - size, size, size, 0, 0, INPUT_SIZE, INPUT_SIZE);
    pushCrop(); // Bottom-biased
  } else {
    // Square, just re-use center
    ctx.drawImage(img, cx, cy, size, size, 0, 0, INPUT_SIZE, INPUT_SIZE);
    pushCrop();
    pushCrop();
  }

  return crops;
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
  references = [];

  // 1. Instant load from precomputed offline embeddings (< 50ms, zero CPU/GPU overhead)
  if (Array.isArray(precomputedEmbeddings) && precomputedEmbeddings.length > 0) {
    const total = precomputedEmbeddings.length;
    for (let i = 0; i < total; i++) {
      const item = precomputedEmbeddings[i];
      references.push({
        placeId: item.placeId,
        name: item.name,
        vector: new Float32Array(item.vector)
      });
      if (onProgress) {
        onProgress(i + 1, total);
      }
    }
    return;
  }

  // 2. Dynamic fallback if precomputed embeddings are unavailable
  let allTasks: Array<{ placeId: string, name: string, url: string, suffix: string }> = [];
  
  for (const place of sceneries) {
    const imageUrls = place.images ? [...place.images] : [];
    if (place.image) imageUrls.push(place.image);
    
    if (imageUrls.length === 0) {
      console.warn(`Skipped ${place.name} (no image)`);
      continue;
    }
    
    imageUrls.forEach((url, i) => {
      // For each image, there will be 5 augmentations
      for (let j = 0; j < 5; j++) {
        allTasks.push({ placeId: place.id, name: place.name, url, suffix: `${i}_${j}` });
      }
    });
  }

  const total = allTasks.length;
  let done = 0;

  // Group by URL to only load each image once
  const tasksByUrl = new Map<string, Array<{ placeId: string, name: string, suffix: string }>>();
  for (const t of allTasks) {
    if (!tasksByUrl.has(t.url)) tasksByUrl.set(t.url, []);
    tasksByUrl.get(t.url)!.push(t);
  }

  for (const [url, tasks] of Array.from(tasksByUrl.entries())) {
    try {
      const img = await loadHTMLImage(url);
      const crops = extractAugmentedCrops(img);
      
      for (let j = 0; j < crops.length; j++) {
        const task = tasks.find(t => t.suffix.endsWith(`_${j}`));
        if (!task) continue;

        const cacheKey = `${url}_aug_${j}_v${REFERENCE_VERSION}`;
        let vector = await getCachedVector(cacheKey);
        
        if (!vector) {
          const output = await pipelineInstance(crops[j]);
          vector = normalizeVector(output.data);
          await setCachedVector(cacheKey, vector);
        }

        if (vector) {
          references.push({ placeId: task.placeId, name: task.name, vector });
        }
        
        done++;
        if (onProgress) onProgress(done, total);
      }
    } catch (err) {
      console.error(`Failed to embed reference for ${url}:`, err);
      done += tasks.length;
      if (onProgress) onProgress(done, total);
    }
  }
}

export async function embedFrame(video: HTMLVideoElement, zoom: number = 1): Promise<Float32Array | null> {
  if (!pipelineInstance) return null;
  const dataUrl = resizeImageToCanvasDataUrl(video, zoom);
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
