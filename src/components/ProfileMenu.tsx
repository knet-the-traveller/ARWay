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

          {/* Privacy Policy */}
          <div className="flex items-center justify-between px-4 h-[52px] border-b border-[#262626] active:bg-[#262626] transition-colors cursor-pointer" onClick={() => setShowPrivacy(true)}>
            <div className="flex items-center">
              <ShieldIcon className="w-6 h-6 text-white mr-3" />
              <span className="text-[16px] text-white">Privacy Policy</span>
            </div>
            <ChevronRightIcon className="w-5 h-5 text-gray-500" />
          </div>

          {/* About */}
          <div className="flex items-center justify-between px-4 h-[52px] border-b border-[#262626] active:bg-[#262626] transition-colors cursor-pointer" onClick={() => setShowAbout(true)}>
            <div className="flex items-center">
              <InfoIcon className="w-6 h-6 text-white mr-3" />
              <span className="text-[16px] text-white">About ARWay</span>
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
          <div className="fixed bottom-0 left-0 right-0 max-h-[80vh] bg-[#1c1c1e] z-[203] rounded-t-2xl flex flex-col sm:w-[375px] sm:left-1/2 sm:-translate-x-1/2">
            <div className="flex items-center justify-between p-4 border-b border-gray-800 shrink-0">
              <h2 className="text-white font-semibold text-lg">{showPrivacy ? 'Privacy Policy' : 'About ARWay'}</h2>
              <button onClick={() => { setShowPrivacy(false); setShowAbout(false); }} className="p-1 active:opacity-70 text-white">
                <CloseIcon className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 text-gray-300 pb-12" style={{ paddingBottom: "calc(48px + env(safe-area-inset-bottom))" }}>
              {showPrivacy ? (
                <p>We do not track your personal data. Location data is processed locally on your device for distance calculation and map rendering. This is a prototype application.</p>
              ) : (
                <>
                  <h3 className="text-white font-bold text-xl mb-1">ARWay</h3>
                  <p className="text-sm text-gray-500 mb-4">v0.1 prototype</p>
                  <p>AR walking navigation for Manila.</p>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}
