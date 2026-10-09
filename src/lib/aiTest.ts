export type ModelProgressCallback = (info: any) => void;

let pipelineInstance: any = null;
let currentDevice: string = "webgpu";

export async function loadModel(progressCallback?: ModelProgressCallback) {
  if (pipelineInstance) return { device: currentDevice, time: 0 };

  const start = performance.now();
  const { pipeline, env } = await import("@huggingface/transformers");

  // Disable local models
  env.allowLocalModels = false;
  if (env.backends?.onnx?.wasm) {
    env.backends.onnx.wasm.numThreads = 1;
  }

  try {
    const hasWebGPU = typeof navigator !== "undefined" && "gpu" in navigator;
    if (hasWebGPU) {
      currentDevice = "webgpu";
      pipelineInstance = await pipeline("image-feature-extraction", "Xenova/clip-vit-base-patch32", {
        dtype: "q8",
        device: "webgpu",
        progress_callback: progressCallback
      });
    } else {
      throw new Error("WebGPU not available");
    }
  } catch (err) {
    console.warn("WebGPU failed, falling back to wasm", err);
    currentDevice = "wasm";
    pipelineInstance = await pipeline("image-feature-extraction", "Xenova/clip-vit-base-patch32", {
      dtype: "q8",
      device: "wasm",
      progress_callback: progressCallback
    });
  }

  const end = performance.now();
  return { device: currentDevice, time: (end - start) / 1000 };
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

export function cosineSimilarity(vecA: Float32Array, vecB: Float32Array): number {
  let dotProduct = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
  }
  return dotProduct;
}

export async function extractImageFeature(imageUrlOrBlob: string): Promise<{ vector: Float32Array, time: number }> {
  if (!pipelineInstance) {
    throw new Error("Model not loaded");
  }
  
  // Resize to 224x224
  const resizedUrl = await resizeTo224(imageUrlOrBlob);

  const startInf = performance.now();
  const output = await pipelineInstance(resizedUrl);
  // output.data is Float32Array
  const vector = normalizeVector(output.data);
  const endInf = performance.now();
  
  return { vector, time: endInf - startInf };
}

export async function resizeTo224(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 224;
      canvas.height = 224;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(img, 0, 0, 224, 224);
        resolve(canvas.toDataURL("image/jpeg", 0.9));
      } else {
        reject(new Error("No canvas context"));
      }
    };
    img.onerror = (e) => reject(new Error("Failed to load image for resize"));
    img.src = url;
  });
}
