"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

export default function PrivacyPolicyPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-white p-5 pb-20 max-w-2xl mx-auto font-sans select-none">
      {/* Top Header */}
      <div className="flex items-center gap-3 mb-6 pt-2 border-b border-white/10 pb-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
          title="Go back"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h1 className="text-lg font-bold text-white tracking-tight">Privacy &amp; Cookie Policy</h1>
          <p className="text-xs text-neutral-400">Effective Date: October 10, 2026 • Version 1.2.0</p>
        </div>
      </div>

      <div className="space-y-6 text-xs text-neutral-300 leading-relaxed">
        {/* Core Philosophy Banner */}
        <div className="p-4 rounded-xl bg-blue-600/15 border border-blue-500/25 space-y-2">
          <div className="flex items-center gap-2 text-blue-400 font-semibold text-sm">
            <span>🛡️</span>
            <span>Zero Cloud Vision • 100% On-Device Processing</span>
          </div>
          <p className="text-neutral-300 text-[11px] leading-relaxed">
            ARWay was engineered with privacy-by-design principles adhering to the Philippine Data Privacy Act of 2012 (RA 10173), GDPR, and CCPA. We believe your camera feed, GPS location, and travel habits belong to you alone.
          </p>
        </div>

        {/* 1. Camera Video Feed */}
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            1. Camera Video Feed &amp; Landmark Recognition
          </h2>
          <p>
            ARWay requests camera access to render the real-time augmented reality HUD and recognize heritage landmarks.
          </p>
          <ul className="list-disc pl-4 space-y-1 text-neutral-400 text-[11px]">
            <li><strong>Zero Video Upload:</strong> Video frames are analyzed locally in your device&apos;s volatile RAM using client-side WebGPU and WASM neural networks.</li>
            <li><strong>No Cloud Transmissions:</strong> No camera frames, photos, or video streams are ever uploaded, transmitted to, or stored on remote servers.</li>
            <li><strong>Temporary Execution:</strong> Video frames are discarded instantly after real-time mathematical embedding comparison (&lt;50ms).</li>
          </ul>
        </section>

        {/* 2. Geolocation and Compass */}
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            2. Geolocation &amp; Device Orientation
          </h2>
          <p>
            When enabled, ARWay accesses your device&apos;s GPS coordinates and hardware magnetometer (compass) strictly for:
          </p>
          <ul className="list-disc pl-4 space-y-1 text-neutral-400 text-[11px]">
            <li>Calculating real-time walking azimuth, distance, and ground navigation chevrons to your selected destination.</li>
            <li>Centering the offline Leaflet map view on your current position.</li>
            <li><strong>Zero Tracking:</strong> Your coordinates are never logged to a central database or shared with advertising networks.</li>
          </ul>
        </section>

        {/* 3. Cookies and Storage Policy */}
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
            3. Cookie &amp; Local Storage Policy
          </h2>
          <p>
            ARWay does <strong>not</strong> use advertising cookies, marketing trackers, or third-party tracking pixels. We strictly utilize client-side browser storage mechanisms for core offline PWA functionality:
          </p>
          <div className="bg-white/5 rounded-xl p-3 border border-white/5 space-y-2 text-[11px]">
            <div>
              <span className="font-semibold text-white">localStorage:</span> Stores user preferences (e.g. offline consent flag, recent route history up to 25 items, dark theme).
            </div>
            <div>
              <span className="font-semibold text-white">CacheStorage:</span> Stores PWA application shells, scenery images, and pre-cached OpenStreetMap raster tiles for offline navigation.
            </div>
            <div>
              <span className="font-semibold text-white">IndexedDB:</span> Stores quantized landmark embeddings to enable instant offline vision matching.
            </div>
          </div>
        </section>

        {/* 4. Third-Party Integrations */}
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            4. Third-Party Integrations &amp; Embeds
          </h2>
          <p>
            When internet connectivity is active, ARWay may interface with the following open-source services:
          </p>
          <ul className="list-disc pl-4 space-y-1 text-neutral-400 text-[11px]">
            <li><strong>OpenStreetMap (OSM Foundation):</strong> Map raster tile requests (<code className="text-neutral-300">tile.openstreetmap.org</code>). Subject to OSM Acceptable Use Policy.</li>
            <li><strong>Project OSRM:</strong> Online walking path wayfinding (<code className="text-neutral-300">routing.openstreetmap.de</code>). Only waypoint coordinates are sent; no personal identifiers.</li>
            <li><strong>Komoot Photon:</strong> Search autocomplete geocoding (<code className="text-neutral-300">photon.komoot.io</code>). Only search query strings are transmitted.</li>
            <li><strong>jsDelivr CDN:</strong> Fetches static ONNX WASM runtime binaries (<code className="text-neutral-300">cdn.jsdelivr.net</code>).</li>
          </ul>
        </section>

        {/* 5. User Data Control & Deletion */}
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
            5. Data Subject Rights &amp; Data Deletion
          </h2>
          <p>
            Under RA 10173 and GDPR, you have full ownership of your data. Because all ARWay data resides directly on your physical device, you can permanently erase all stored data at any time:
          </p>
          <div className="flex items-center gap-2 pt-1">
            <Link
              href="/offline-setup"
              className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium rounded-lg border border-white/10 transition-colors"
            >
              Open Offline Setup &amp; Wipe Cache
            </Link>
            <span className="text-[11px] text-neutral-500">or clear your browser site data.</span>
          </div>
        </section>

        {/* 6. Contact Developers */}
        <section className="space-y-2 pt-2 border-t border-white/10">
          <h2 className="text-sm font-semibold text-white">6. Contact Developers</h2>
          <p className="text-[11px] text-neutral-400">
            For inquiries regarding privacy, data protection, or open-source compliance, reach out to the development team:
          </p>
          <div className="bg-white/5 p-3 rounded-xl border border-white/5 text-[11px] space-y-1 text-neutral-300">
            <div><strong className="text-white">Team:</strong> Sector 4 (AppBuildersPH 2026)</div>
            <div><strong className="text-white">Developer Email:</strong> <a href="mailto:markkennethbgalario@gmail.com" className="text-blue-400 underline">markkennethbgalario@gmail.com</a></div>
            <div><strong className="text-white">Team Lead GitHub:</strong> <a href="https://github.com/knet-the-traveller" target="_blank" rel="noreferrer" className="text-blue-400 underline">github.com/knet-the-traveller</a></div>
          </div>
        </section>
      </div>
    </div>
  );
}
