import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  CloseIcon, 
  BellIcon, 
  RulerIcon, 
  ShieldIcon, 
  InfoIcon, 
  LogoutIcon,
  ChevronRightIcon
} from "./icons";
import ConfirmDialog from "./ConfirmDialog";

interface ProfileMenuProps {
  onClose: () => void;
  onSignOut: () => void;
}

export default function ProfileMenu({ onClose, onSignOut }: ProfileMenuProps) {
  const router = useRouter();
  const [notifications, setNotifications] = useState(true);
  const [units, setUnits] = useState("km");
  
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showAbout, setShowAbout] = useState(false);

  useEffect(() => {
    try {
      const notifs = localStorage.getItem("arway_pref_notifications");
      if (notifs !== null) setNotifications(notifs === "1");
      const un = localStorage.getItem("arway_pref_units");
      if (un) setUnits(un);
    } catch (e) {
      console.error(e);
    }
  }, []);

  const toggleNotifications = () => {
    try {
      const val = !notifications;
      setNotifications(val);
      localStorage.setItem("arway_pref_notifications", val ? "1" : "0");
    } catch (e) {}
  };

  const toggleUnits = () => {
    try {
      const val = units === "km" ? "mi" : "km";
      setUnits(val);
      localStorage.setItem("arway_pref_units", val);
    } catch (e) {}
  };

  const handleSignOut = () => {
    setShowLogoutConfirm(false);
    onSignOut();
  };

  return (
    <>
      <div 
        className="fixed inset-0 bg-black/60 z-[200] backdrop-blur-sm" 
        onClick={onClose} 
      />
      
      <div className="fixed top-0 right-0 h-full w-[78%] bg-[#1a1a1a] z-[201] flex flex-col sm:w-[292px] transition-transform duration-200">
        <div className="flex items-center justify-between p-4 border-b border-[#262626] shrink-0">
          <h2 className="text-white font-semibold text-lg">Settings</h2>
          <button onClick={onClose} className="p-1 active:opacity-70 text-white">
            <CloseIcon className="w-6 h-6" />
          </button>
        </div>

        <div className="flex flex-col flex-1 overflow-y-auto">
          {/* Offline Mode & Data Setup */}
          <div 
            className="flex items-center justify-between px-4 py-3 border-b border-[#262626] active:bg-[#262626] transition-colors cursor-pointer" 
            onClick={() => {
              onClose();
              router.push("/offline-setup");
            }}
          >
            <div className="flex items-center">
              <div className="w-6 h-6 rounded-full bg-blue-500/20 text-[#3b82f6] flex items-center justify-center mr-3 shrink-0">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </div>
              <div className="flex flex-col">
                <span className="text-[15px] font-medium text-white">Offline Sync</span>
                <span className="text-[11px] text-gray-400">Sync local AI model & map tiles</span>
              </div>
            </div>
            <ChevronRightIcon className="w-5 h-5 text-gray-500" />
          </div>

          {/* Notifications */}
          <div className="flex items-center justify-between px-4 h-[52px] border-b border-[#262626]">
            <div className="flex items-center">
              <BellIcon className="w-6 h-6 text-white mr-3" />
              <span className="text-[16px] text-white">Notifications</span>
            </div>
            <button 
              onClick={toggleNotifications}
              className={`w-12 h-7 rounded-full relative transition-colors ${notifications ? 'bg-[#3b82f6]' : 'bg-gray-600'}`}
            >
              <div className={`w-5 h-5 bg-white rounded-full absolute top-1 transition-transform ${notifications ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>

          {/* Distance Units */}
          <div className="flex items-center justify-between px-4 h-[52px] border-b border-[#262626] active:bg-[#262626] transition-colors cursor-pointer" onClick={toggleUnits}>
            <div className="flex items-center">
              <RulerIcon className="w-6 h-6 text-white mr-3" />
              <span className="text-[16px] text-white">Distance Units</span>
            </div>
            <div className="flex items-center">
              <span className="text-[14px] text-gray-400 mr-2">{units}</span>
            </div>
          </div>

          {/* Privacy & Cookie Policy */}
          <div 
            className="flex items-center justify-between px-4 h-[52px] border-b border-[#262626] active:bg-[#262626] transition-colors cursor-pointer" 
            onClick={() => {
              onClose();
              router.push("/privacy");
            }}
          >
            <div className="flex items-center">
              <ShieldIcon className="w-6 h-6 text-white mr-3" />
              <div className="flex flex-col">
                <span className="text-[15px] font-medium text-white">Privacy &amp; Cookie Policy</span>
                <span className="text-[10px] text-gray-400">On-device vision &amp; zero tracking</span>
              </div>
            </div>
            <ChevronRightIcon className="w-5 h-5 text-gray-500" />
          </div>

          {/* Terms of Service */}
          <div 
            className="flex items-center justify-between px-4 h-[52px] border-b border-[#262626] active:bg-[#262626] transition-colors cursor-pointer" 
            onClick={() => {
              onClose();
              router.push("/terms");
            }}
          >
            <div className="flex items-center">
              <div className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center mr-3 shrink-0">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="flex flex-col">
                <span className="text-[15px] font-medium text-white">Terms of Service</span>
                <span className="text-[10px] text-gray-400">Pedestrian AR safety disclaimer</span>
              </div>
            </div>
            <ChevronRightIcon className="w-5 h-5 text-gray-500" />
          </div>

          {/* Contact Developers */}
          <div 
            className="flex items-center justify-between px-4 h-[52px] border-b border-[#262626] active:bg-[#262626] transition-colors cursor-pointer" 
            onClick={() => setShowPrivacy(true)}
          >
            <div className="flex items-center">
              <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mr-3 shrink-0">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <span className="text-[15px] font-medium text-white">Contact Developers</span>
            </div>
            <ChevronRightIcon className="w-5 h-5 text-gray-500" />
          </div>

          {/* About */}
          <div className="flex items-center justify-between px-4 h-[52px] border-b border-[#262626] active:bg-[#262626] transition-colors cursor-pointer" onClick={() => setShowAbout(true)}>
            <div className="flex items-center">
              <InfoIcon className="w-6 h-6 text-white mr-3" />
              <span className="text-[15px] font-medium text-white">About ARWay</span>
            </div>
            <ChevronRightIcon className="w-5 h-5 text-gray-500" />
          </div>
        </div>

        {/* Log Out */}
        <div className="mt-auto border-t border-[#262626] shrink-0" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
          <div 
            className="flex items-center px-4 h-[52px] active:bg-[#262626] transition-colors cursor-pointer" 
            onClick={() => setShowLogoutConfirm(true)}
          >
            <LogoutIcon className="w-6 h-6 text-[#ef4444] mr-3" />
            <span className="text-[16px] text-[#ef4444]">Log Out</span>
          </div>
        </div>
      </div>

      {showLogoutConfirm && (
        <ConfirmDialog 
          title="Log out of ARWay?"
          confirmText="Log Out"
          onConfirm={handleSignOut}
          onCancel={() => setShowLogoutConfirm(false)}
        />
      )}

      {(showPrivacy || showAbout) && (
        <>
          <div className="fixed inset-0 bg-black/60 z-[202] backdrop-blur-sm" onClick={() => { setShowPrivacy(false); setShowAbout(false); }} />
          <div className="fixed bottom-0 left-0 right-0 max-h-[85vh] bg-[#1c1c1e] z-[203] rounded-t-2xl flex flex-col sm:w-[375px] sm:left-1/2 sm:-translate-x-1/2 overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-800 shrink-0">
              <h2 className="text-white font-semibold text-lg">{showPrivacy ? 'Contact Developers' : 'About ARWay'}</h2>
              <button onClick={() => { setShowPrivacy(false); setShowAbout(false); }} className="p-1 active:opacity-70 text-white">
                <CloseIcon className="w-6 h-6" />
              </button>
            </div>
            <div className="p-5 text-gray-300 pb-12 text-xs space-y-4" style={{ paddingBottom: "calc(48px + env(safe-area-inset-bottom))" }}>
              {showPrivacy ? (
                <div className="space-y-3">
                  <p className="text-neutral-300 leading-relaxed">
                    Have feedback, discovered a bug, or have questions about local offline AI or compliance? We&apos;d love to hear from you.
                  </p>

                  <div className="bg-white/5 rounded-xl p-3 border border-white/5 space-y-2">
                    <div>
                      <span className="text-neutral-400 block text-[10px]">ORGANIZATION / TEAM</span>
                      <span className="text-white font-medium">PointVoid0 / Sector 4</span>
                    </div>
                    <div>
                      <span className="text-neutral-400 block text-[10px]">EVENT & TRACK</span>
                      <span className="text-white font-medium">AppBuildersPH 2026 — Local AI Track</span>
                    </div>
                    <div>
                      <span className="text-neutral-400 block text-[10px]">SUPPORT EMAIL</span>
                      <a href="mailto:support@arway.ph" className="text-blue-400 underline font-medium">support@arway.ph</a>
                    </div>
                    <div>
                      <span className="text-neutral-400 block text-[10px]">GITHUB REPOSITORY</span>
                      <a href="https://github.com/PointVoid0/Sector4" target="_blank" rel="noreferrer" className="text-blue-400 underline font-medium">github.com/PointVoid0/Sector4</a>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setShowPrivacy(false);
                        onClose();
                        router.push("/privacy");
                      }}
                      className="flex-1 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg font-medium text-center transition-colors"
                    >
                      Privacy Policy
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowPrivacy(false);
                        onClose();
                        router.push("/terms");
                      }}
                      className="flex-1 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg font-medium text-center transition-colors"
                    >
                      Terms of Service
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <h3 className="text-white font-bold text-xl mb-0.5">ARWay</h3>
                    <div className="inline-block px-2 py-0.5 bg-blue-500/20 text-blue-400 text-[10px] font-semibold rounded-full border border-blue-500/30">
                      v1.2.0 (AppBuildersPH 2026 Production)
                    </div>
                  </div>
                  <p className="leading-relaxed">
                    ARWay is an offline-first Augmented Reality Wayfinder and Landmark Vision guide for Manila heritage zones. Powered by client-side Transformers.js and offline vector search.
                  </p>
                  <div className="p-3 bg-white/5 rounded-xl border border-white/5 space-y-1 text-[11px] text-neutral-300">
                    <div>⚡ <strong>Instant AI:</strong> Quantized CLIP embeddings (&lt;50ms)</div>
                    <div>🧭 <strong>AR HUD:</strong> Compass-aligned ground navigation chevrons</div>
                    <div>📶 <strong>100% Offline:</strong> Standalone PWA with zero cloud video upload</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}
