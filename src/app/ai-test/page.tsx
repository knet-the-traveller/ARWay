"use client";

import { useState, useEffect, useRef } from "react";
import { loadModel, extractImageFeature, cosineSimilarity, resizeTo224 } from "@/lib/aiTest";
import { sceneries } from "@/lib/sceneries";

export default function AITestPage() {
  const [deviceInfo, setDeviceInfo] = useState<any>({});
  
  const [modelStatus, setModelStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [modelProgress, setModelProgress] = useState<{ file: string, progress: number } | null>(null);
  const [modelInfo, setModelInfo] = useState<{ device: string, loadTime: number } | null>(null);
  const [modelError, setModelError] = useState<string | null>(null);

  const [embedStatus, setEmbedStatus] = useState<"idle" | "running" | "done" | "error">("idle");
  const [embedProgress, setEmbedProgress] = useState(0);
  const [embedInfo, setEmbedInfo] = useState<{ totalTime: number, avgTime: number, count: number, skipped: string[] } | null>(null);
  const [vectors, setVectors] = useState<Array<{ id: string, name: string, vector: Float32Array, image: string }>>([]);

  const [testSource, setTestSource] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Array<{ name: string, score: number }>>([]);
  const [testTime, setTestTime] = useState<number | null>(null);

  const [cameraActive, setCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  const [selfTestStatus, setSelfTestStatus] = useState<"idle" | "running" | "done" | "error">("idle");
  const [selfTestInfo, setSelfTestInfo] = useState<{ score: number, total: number, confusions: string[], minTime: number, avgTime: number, maxTime: number } | null>(null);

  useEffect(() => {
    setDeviceInfo({
      ua: navigator.userAgent,
      cores: navigator.hardwareConcurrency || "n/a",
      mem: (navigator as any).deviceMemory || "n/a",
      webgpu: "gpu" in navigator ? "yes" : "no",
      coi: typeof crossOriginIsolated !== "undefined" && crossOriginIsolated ? "yes" : "no"
    });
  }, []);

  const handleLoadModel = async () => {
    setModelStatus("loading");
    setModelError(null);
    try {
      const info = await loadModel((data) => {
        if (data.status === "progress" && data.progress !== undefined) {
          setModelProgress({ file: data.file, progress: data.progress });
        }
      });
      setModelInfo({ device: info.device, loadTime: info.time });
      setModelStatus("ready");
    } catch (err: any) {
      setModelError(err.message || "Failed to load model");
      setModelStatus("error");
    }
  };

  const handleEmbedPhotos = async () => {
    setEmbedStatus("running");
    try {
      const placesWithImages = sceneries.filter(s => !!s.image);
      const skipped = sceneries.filter(s => !s.image).map(s => s.name);
      
      const results = [];
      let totalTime = 0;

      for (let i = 0; i < placesWithImages.length; i++) {
        setEmbedProgress(i + 1);
        const place = placesWithImages[i];
        
        const { vector, time } = await extractImageFeature(place.image!);
        totalTime += time;
        results.push({ id: place.id, name: place.name, vector, image: place.image! });
      }

      setVectors(results);
      setEmbedInfo({
        totalTime,
        avgTime: totalTime / placesWithImages.length,
        count: placesWithImages.length,
        skipped
      });
      setEmbedStatus("done");
    } catch (err: any) {
      console.error(err);
      setEmbedStatus("error");
      alert(err.message || "Error embedding photos");
    }
  };

  const startCamera = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
      setStream(s);
      setCameraActive(true);
      if (videoRef.current) {
        videoRef.current.srcObject = s;
      }
    } catch (err) {
      alert("Camera unavailable");
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
      setStream(null);
    }
    setCameraActive(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0);
      const url = canvas.toDataURL("image/jpeg");
      stopCamera();
      runTestOnImage(url);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      const url = URL.createObjectURL(f);
      runTestOnImage(url);
    }
  };

  const runTestOnImage = async (url: string) => {
    setTestSource(url);
    setTestResults([]);
    setTestTime(null);
    try {
      const { vector, time } = await extractImageFeature(url);
      setTestTime(time);
      
      const scores = vectors.map(v => ({
        name: v.name,
        score: cosineSimilarity(vector, v.vector)
      }));
      scores.sort((a, b) => b.score - a.score);
      setTestResults(scores.slice(0, 3));
    } catch (err: any) {
      alert(err.message || "Error testing photo");
    }
  };

  const handleSelfTest = async () => {
    setSelfTestStatus("running");
    try {
      let correct = 0;
      const confusions: string[] = [];
      const times: number[] = [];

      for (let run = 0; run < 3; run++) {
        for (const place of vectors) {
          const { vector, time } = await extractImageFeature(place.image);
          times.push(time);
          
          if (run === 0) {
            let bestName = "";
            let bestScore = -Infinity;
            for (const v of vectors) {
              const score = cosineSimilarity(vector, v.vector);
              if (score > bestScore) {
                bestScore = score;
                bestName = v.name;
              }
            }
            if (bestName === place.name) {
              correct++;
            } else {
              confusions.push(`${place.name} was matched as ${bestName}`);
            }
          }
        }
      }

      times.sort((a, b) => a - b);
      const minTime = times[0];
      const maxTime = times[times.length - 1];
      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;

      setSelfTestInfo({
        score: correct,
        total: vectors.length,
        confusions,
        minTime,
        avgTime,
        maxTime
      });
      setSelfTestStatus("done");
    } catch (err: any) {
      alert(err.message || "Error during self test");
      setSelfTestStatus("error");
    }
  };

  const copyResults = () => {
    const summary = `
AI Feasibility Test Results:
Device Info:
- UA: ${deviceInfo.ua}
- Cores: ${deviceInfo.cores}
- Mem: ${deviceInfo.mem}
- WebGPU: ${deviceInfo.webgpu}
- COI: ${deviceInfo.coi}

Model Load:
- Device used: ${modelInfo?.device || "n/a"}
- Load time: ${modelInfo?.loadTime?.toFixed(1) || "n/a"} s

Embeddings:
- Total embedded: ${embedInfo?.count || 0}
- Avg embed time: ${embedInfo?.avgTime?.toFixed(0) || "n/a"} ms

Self-Test:
- Score: ${selfTestInfo?.score || 0} / ${selfTestInfo?.total || 0}
- Confusions: ${selfTestInfo?.confusions.length ? selfTestInfo.confusions.join(", ") : "None"}
- Min inference time: ${selfTestInfo?.minTime?.toFixed(0) || "n/a"} ms
- Avg inference time: ${selfTestInfo?.avgTime?.toFixed(0) || "n/a"} ms
- Max inference time: ${selfTestInfo?.maxTime?.toFixed(0) || "n/a"} ms
    `.trim();
    navigator.clipboard.writeText(summary);
    alert("Copied to clipboard");
  };

  return (
    <main className="w-full flex-1 min-h-0 bg-black text-white overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
      <div className="p-4 flex flex-col gap-6 pb-[16px]">
        <div>
          <h1 className="text-[22px] font-semibold text-white">AI Feasibility Test</h1>
          <p className="text-[14px] text-gray-400 mt-1">Runs a CLIP model on this device. Check the numbers below.</p>
        </div>

        <div className="bg-[#1c1c1e] p-4 rounded-xl flex flex-col gap-1 text-[14px]">
          <h3 className="font-semibold text-white mb-2">Device Info</h3>
          <p className="text-gray-300"><span className="text-gray-500">UA:</span> {deviceInfo.ua}</p>
          <p className="text-gray-300"><span className="text-gray-500">Cores:</span> {deviceInfo.cores}</p>
          <p className="text-gray-300"><span className="text-gray-500">Mem:</span> {deviceInfo.mem}</p>
          <p className="text-gray-300"><span className="text-gray-500">WebGPU:</span> {deviceInfo.webgpu}</p>
          <p className="text-gray-300"><span className="text-gray-500">Cross-Origin Isolated:</span> {deviceInfo.coi}</p>
        </div>

        {/* Step 1 */}
        <div className="flex flex-col gap-3">
          <button 
            onClick={handleLoadModel}
            disabled={modelStatus === "loading" || modelStatus === "ready"}
            className="w-full bg-blue-500 text-white rounded-lg h-[44px] font-semibold text-[14px] disabled:opacity-50 active:bg-blue-600 transition-colors"
          >
            1. Load model
          </button>
          
          {modelStatus === "loading" && modelProgress && (
            <div className="text-[14px] text-gray-400">
              Loading: {modelProgress.file} ({Math.round(modelProgress.progress)}%)
            </div>
          )}
          
          {modelStatus === "ready" && modelInfo && (
            <div className="flex flex-col gap-1 text-[14px]">
              <div className="inline-block bg-green-500/20 text-green-400 px-3 py-1 rounded-full w-max text-[13px] font-medium mb-1">
                Model ready
              </div>
              <p className="text-gray-300">Device used: <span className="text-white font-medium">{modelInfo.device}</span></p>
              <p className="text-gray-300">Load time: <span className="text-white font-medium">{modelInfo.loadTime.toFixed(1)} s</span></p>
            </div>
          )}
          
          {modelStatus === "error" && modelError && (
            <p className="text-red-400 text-[14px]">{modelError}</p>
          )}
        </div>

        {/* Step 2 */}
        <div className="flex flex-col gap-3">
          <button 
            onClick={handleEmbedPhotos}
            disabled={modelStatus !== "ready" || embedStatus === "running" || embedStatus === "done"}
            className="w-full bg-blue-500 text-white rounded-lg h-[44px] font-semibold text-[14px] disabled:opacity-50 active:bg-blue-600 transition-colors"
          >
            2. Embed sceneries photos
          </button>

          {embedStatus === "running" && (
            <p className="text-[14px] text-gray-400">Processing {embedProgress} / {sceneries.filter(s => !!s.image).length}...</p>
          )}

          {embedStatus === "done" && embedInfo && (
            <div className="flex flex-col gap-1 text-[14px] text-gray-300">
              <p>Total time: <span className="text-white font-medium">{Math.round(embedInfo.totalTime)} ms</span></p>
              <p>Avg time per image: <span className="text-white font-medium">{Math.round(embedInfo.avgTime)} ms</span></p>
              <p>Photos embedded: <span className="text-white font-medium">{embedInfo.count}</span></p>
              {embedInfo.skipped.length > 0 && (
                <p className="text-gray-500 text-[12px] mt-1">Skipped (no image): {embedInfo.skipped.join(", ")}</p>
              )}
            </div>
          )}
        </div>

        {/* Step 3 */}
        <div className="flex flex-col gap-3">
          <div className="flex gap-2">
            <button 
              onClick={startCamera}
              disabled={embedStatus !== "done" || cameraActive}
              className="flex-1 bg-blue-500 text-white rounded-lg h-[44px] font-semibold text-[14px] disabled:opacity-50 active:bg-blue-600 transition-colors"
            >
              Take photo
            </button>
            <label className="flex-1 bg-blue-500 text-white rounded-lg h-[44px] font-semibold text-[14px] flex items-center justify-center cursor-pointer active:bg-blue-600 transition-colors opacity-100 disabled:opacity-50" style={{ opacity: embedStatus !== "done" ? 0.5 : 1, pointerEvents: embedStatus !== "done" ? 'none' : 'auto' }}>
              Upload photo
              <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} disabled={embedStatus !== "done"} />
            </label>
          </div>

          {cameraActive && (
            <div className="w-full bg-[#1c1c1e] rounded-xl p-4 flex flex-col items-center">
              <video ref={videoRef} autoPlay playsInline muted className="w-full max-h-[300px] object-cover rounded-lg mb-4 bg-black" />
              <div className="flex gap-2 w-full">
                <button onClick={capturePhoto} className="flex-1 bg-white text-black h-[44px] rounded-lg font-semibold text-[14px] active:bg-gray-200 transition-colors">Capture</button>
                <button onClick={stopCamera} className="flex-1 bg-gray-700 text-white h-[44px] rounded-lg font-semibold text-[14px] active:bg-gray-600 transition-colors">Close</button>
              </div>
            </div>
          )}

          {testSource && (
            <div className="bg-[#1c1c1e] p-4 rounded-xl flex flex-col items-center gap-4">
              <img src={testSource} alt="Test" className="max-h-[200px] rounded-lg object-contain" />
              {testTime !== null && (
                <div className="w-full flex flex-col gap-2">
                  <p className="text-[14px] text-gray-400 mb-2">Inference time: <span className="text-white font-medium">{Math.round(testTime)} ms</span></p>
                  <h4 className="text-[14px] font-semibold text-white mb-1">Top matches:</h4>
                  {testResults.map((r, i) => (
                    <div key={i} className="flex flex-col gap-1 mb-2">
                      <div className="flex justify-between text-[14px]">
                        <span className="text-white">{r.name}</span>
                        <span className="text-gray-400">{r.score.toFixed(3)}</span>
                      </div>
                      <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500" style={{ width: `${Math.max(0, Math.min(100, r.score * 100))}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Step 4 */}
        <div className="flex flex-col gap-3">
          <button 
            onClick={handleSelfTest}
            disabled={embedStatus !== "done" || selfTestStatus === "running"}
            className="w-full bg-blue-500 text-white rounded-lg h-[44px] font-semibold text-[14px] disabled:opacity-50 active:bg-blue-600 transition-colors"
          >
            4. Run self-test
          </button>

          {selfTestStatus === "running" && (
            <p className="text-[14px] text-gray-400">Running self-test loops (3 passes)...</p>
          )}

          {selfTestStatus === "done" && selfTestInfo && (
            <div className="flex flex-col gap-1 text-[14px] text-gray-300">
              <p>Score: <span className="text-white font-medium">{selfTestInfo.score} / {selfTestInfo.total} correctly matched</span></p>
              {selfTestInfo.confusions.length > 0 && (
                <div className="mt-2">
                  <p className="text-gray-400 mb-1">Confusions:</p>
                  <ul className="list-disc pl-5 text-red-400">
                    {selfTestInfo.confusions.map((c, i) => <li key={i}>{c}</li>)}
                  </ul>
                </div>
              )}
              <div className="mt-2 flex flex-col gap-0.5">
                <p>Min inference time: <span className="text-white">{Math.round(selfTestInfo.minTime)} ms</span></p>
                <p>Avg inference time: <span className="text-white">{Math.round(selfTestInfo.avgTime)} ms</span></p>
                <p>Max inference time: <span className="text-white">{Math.round(selfTestInfo.maxTime)} ms</span></p>
              </div>
            </div>
          )}
        </div>

        <button 
          onClick={copyResults}
          className="w-full border border-gray-600 text-white rounded-lg h-[44px] font-semibold text-[14px] active:bg-gray-800 transition-colors mt-4"
        >
          Copy results
        </button>

      </div>
    </main>
  );
}
