"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function LegalConsentModal() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const consented = localStorage.getItem("arway_legal_consent_v1");
      if (!consented) {
        setIsOpen(true);
      }
    } catch {
      // Storage unavailable or private mode
    }
  }, []);

  const handleAccept = () => {
    try {
      localStorage.setItem("arway_legal_consent_v1", "1");
    } catch {
      // ignore
    }
    setIsOpen(false);
  };

  // Do not render on /privacy or /terms so users can read the full documents without obstruction
  if (!mounted || !isOpen || pathname === "/privacy" || pathname === "/terms") {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-sm bg-[#121318] border border-white/15 rounded-2xl shadow-2xl p-5 text-white flex flex-col gap-4 max-h-[85vh] overflow-y-auto overscroll-contain touch-pan-y">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <h3 className="font-bold text-base tracking-tight text-white">Welcome to ARWay</h3>
              <p className="text-xs text-neutral-400">Offline Landmark Vision &amp; Wayfinder</p>
            </div>
          </div>
        </div>

        {/* Intro */}
        <p className="text-xs text-neutral-300 leading-relaxed">
          Before exploring, please review our privacy commitment and terms. ARWay is designed from the ground up for strict privacy and local offline operation.
        </p>

        {/* Feature Disclosures */}
        <div className="space-y-2.5 bg-white/5 p-3 rounded-xl border border-white/5 text-[11px] text-neutral-300">
          <div className="flex items-start gap-2.5">
            <span className="text-blue-400 mt-0.5 text-sm">🛡️</span>
            <div>
              <span className="font-semibold text-white">Zero Cloud Video Streaming:</span> Camera frames are processed 100% locally on your device via client WebGPU/WASM AI. Video never leaves your phone.
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <span className="text-emerald-400 mt-0.5 text-sm">📍</span>
            <div>
              <span className="font-semibold text-white">Local Navigation Processing:</span> Real-time GPS and compass data are calculated in-device for bearing and wayfinding. No location trails are sent to any remote server.
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <span className="text-purple-400 mt-0.5 text-sm">💾</span>
            <div>
              <span className="font-semibold text-white">Zero Tracking Cookies:</span> We set zero ad or analytics tracking cookies. Storage is strictly used for offline PWA maps and landmark data.
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <span className="text-amber-400 mt-0.5 text-sm">🚶</span>
            <div>
              <span className="font-semibold text-white">Pedestrian AR Safety:</span> ARWay is an auxiliary guide. Always pay attention to real-world traffic, pedestrian signals, and surroundings when walking.
            </div>
          </div>
        </div>

        {/* Links to Full Documents */}
        <div className="flex items-center justify-between text-[11px] text-neutral-400 px-1">
          <Link 
            href="/privacy" 
            className="text-blue-400 hover:text-blue-300 underline underline-offset-2 transition-colors"
          >
            Privacy &amp; Cookie Policy
          </Link>
          <span className="text-neutral-600">•</span>
          <Link 
            href="/terms" 
            className="text-blue-400 hover:text-blue-300 underline underline-offset-2 transition-colors"
          >
            Terms of Service
          </Link>
        </div>

        {/* Action Button */}
        <button
          type="button"
          onClick={handleAccept}
          className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 active:scale-98 text-white text-xs font-semibold rounded-xl shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2 mt-1"
        >
          <span>Accept &amp; Continue</span>
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
        </button>
      </div>
    </div>
  );
}
