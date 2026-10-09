import BottomNav from "./BottomNav";
import LegalConsentModal from "./LegalConsentModal";

export default function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-center min-h-[100dvh] w-full bg-neutral-950 min-[431px]:p-4">
      <div className="relative flex flex-col overflow-hidden bg-black w-full h-[100dvh] min-[431px]:w-[375px] min-[431px]:h-[667px] min-[431px]:rounded-[24px] min-[431px]:border min-[431px]:border-gray-800 min-[431px]:shadow-2xl">
        {/* Content area */}
        <div className="flex-1 min-h-0 relative flex flex-col">
          {children}
        </div>
        
        {/* Bottom Navigation */}
        <BottomNav />

        {/* First-Launch Legal & Privacy Consent Modal */}
        <LegalConsentModal />
      </div>
    </div>
  );
}
