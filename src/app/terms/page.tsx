"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

export default function TermsOfServicePage() {
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
          <h1 className="text-lg font-bold text-white tracking-tight">Terms of Service</h1>
          <p className="text-xs text-neutral-400">Effective Date: October 10, 2026 • Version 1.2.0</p>
        </div>
      </div>

      <div className="space-y-6 text-xs text-neutral-300 leading-relaxed">
        {/* Pedestrian Safety Alert Box */}
        <div className="p-4 rounded-xl bg-amber-500/15 border border-amber-500/30 space-y-2">
          <div className="flex items-center gap-2 text-amber-400 font-semibold text-sm">
            <span>⚠️</span>
            <span>Important Pedestrian &amp; Navigation Safety Warning</span>
          </div>
          <p className="text-neutral-300 text-[11px] leading-relaxed">
            ARWay provides augmented reality ground guidance and historical landmark recognition for pedestrian tourists. <strong>Never stare continuously at your phone screen while in motion.</strong> Always pause in a safe, stationary location to view AR directions or scan landmarks.
          </p>
        </div>

        {/* 1. Acceptance of Terms */}
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            1. Acceptance of Terms
          </h2>
          <p>
            By accessing or using ARWay (&quot;the Application&quot;), provided by PointVoid0 / Sector 4, you agree to be bound by these Terms of Service. If you do not agree to these terms, do not access or use the Application.
          </p>
        </section>

        {/* 2. Pedestrian Safety and Situational Awareness */}
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            2. Pedestrian Responsibility &amp; Situational Awareness
          </h2>
          <p>
            You expressly acknowledge and agree that:
          </p>
          <ul className="list-disc pl-4 space-y-1 text-neutral-400 text-[11px]">
            <li><strong>Auxiliary Nature:</strong> ARWay is strictly an auxiliary guidance tool. It does not replace physical sight, common sense, or real-world situational awareness.</li>
            <li><strong>Traffic &amp; Hazards:</strong> You must always yield to vehicular traffic, obey pedestrian crossing signals, and be vigilant regarding uneven sidewalks, construction zones, stairs, and environmental obstacles.</li>
            <li><strong>No Motorized Use:</strong> You may NOT use ARWay while operating any motor vehicle, motorcycle, electric scooter, or bicycle.</li>
            <li><strong>Assumption of Risk:</strong> You assume all risks associated with walking and navigating public and private spaces.</li>
          </ul>
        </section>

        {/* 3. Open Data & Intellectual Property */}
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            3. Open Data &amp; Attribution
          </h2>
          <p>
            ARWay is built upon open data and open-source models:
          </p>
          <ul className="list-disc pl-4 space-y-1 text-neutral-400 text-[11px]">
            <li><strong>OpenStreetMap:</strong> Map tiles and spatial data are © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer" className="text-blue-400 underline">OpenStreetMap contributors</a>, licensed under the Open Database License (ODbL).</li>
            <li><strong>Machine Learning Models:</strong> Landmark embeddings are derived using quantized models via Transformers.js under the Apache 2.0 / MIT licenses.</li>
          </ul>
        </section>

        {/* 4. As-Is Prototype Disclaimer */}
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
            4. Warranty Disclaimer (&quot;As-Is&quot;)
          </h2>
          <p>
            THE APPLICATION IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO ACCURACY OF ROUTING, SENSOR PRECISION, OR LANDMARK RECOGNITION. SENSORS (MAGNETOMETER, GPS) MAY EXPERIENCE DRIFT OR INTERFERENCE IN URBAN CANYONS OR METALLIC STRUCTURES.
          </p>
        </section>

        {/* 5. Limitation of Liability */}
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
            5. Limitation of Liability
          </h2>
          <p>
            TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, THE DEVELOPERS AND CONTRIBUTORS SHALL NOT BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, OR CONSEQUENTIAL DAMAGES, INCLUDING BODILY INJURY, PROPERTY DAMAGE, OR LOSS OF DATA ARISING FROM YOUR USE OF OR INABILITY TO USE THE APPLICATION.
          </p>
        </section>

        {/* 6. Governing Law */}
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-500" />
            6. Governing Law &amp; Jurisdiction
          </h2>
          <p>
            These Terms shall be governed by and construed in accordance with the laws of the Republic of the Philippines, without regard to conflict of law provisions.
          </p>
        </section>

        {/* 7. Contact Information */}
        <section className="space-y-2 pt-2 border-t border-white/10">
          <h2 className="text-sm font-semibold text-white">7. Contact Developers</h2>
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
