import Link from "next/link";
import { useHomeStatus } from "@/hooks/useHomeStatus";
import { DEMO_AREAS } from "@/lib/offlineConfig";

export default function PackCard() {
  const { isOnline, offlineReady } = useHomeStatus();
  const areaNames = DEMO_AREAS.map(a => a.name).join(", ");

  if (offlineReady) {
    return (
      <div 
        className="w-full rounded-[20px] p-[14px] flex items-center justify-between"
        style={{ backgroundColor: "#17303a", border: "1px solid var(--aw-green)" }}
      >
        <div className="flex items-center gap-3">
          <svg className="w-8 h-8 shrink-0 text-[var(--aw-green)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4" />
          </svg>
          <div className="flex flex-col">
            <span className="font-display font-bold text-[var(--aw-green)] text-[17px] leading-tight">Offline Pack</span>
            <span className="text-[var(--aw-muted)] text-[12px] leading-tight mt-1 line-clamp-2">Vision AI & maps downloaded. Covers {areaNames}</span>
          </div>
        </div>
        <div 
          className="font-bold text-[12px] px-3 py-1 rounded-full shrink-0 ml-2"
          style={{ backgroundColor: "var(--aw-green)", color: "#17303a" }}
        >
          Ready
        </div>
      </div>
    );
  }

  // Not ready
  return (
    <div 
      className="w-full rounded-[20px] p-[14px] flex items-center justify-between"
      style={{ backgroundColor: "#2d2417", border: "1px solid #f59e0b" }}
    >
      <div className="flex items-center gap-3">
        <svg className="w-8 h-8 shrink-0 text-[#f59e0b]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9" />
        </svg>
        <div className="flex flex-col">
          <span className="font-display font-bold text-[#f59e0b] text-[17px] leading-tight">Offline Pack</span>
          <span className="text-[var(--aw-muted)] text-[12px] leading-tight mt-1 line-clamp-2">Download the AI model and maps to use ARWay without signal</span>
        </div>
      </div>
      
      {!isOnline ? (
        <div 
          className="font-bold text-[10px] px-2 py-1 rounded-full shrink-0 ml-2 text-center"
          style={{ backgroundColor: "transparent", color: "#f59e0b", border: "1px solid #f59e0b", maxWidth: "60px" }}
        >
          Not downloaded
        </div>
      ) : (
        <Link 
          href="/offline-setup"
          className="font-bold text-[12px] px-3 py-1 rounded-full shrink-0 ml-2 active:opacity-70"
          style={{ backgroundColor: "#f59e0b", color: "#2d2417" }}
        >
          Download
        </Link>
      )}
    </div>
  );
}
