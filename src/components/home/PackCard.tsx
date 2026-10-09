export default function PackCard() {
  return (
    <div 
      className="w-full rounded-[20px] p-[14px] flex items-center justify-between"
      style={{ backgroundColor: "#17303a", border: "1px solid var(--aw-green)" }}
    >
      <div className="flex items-center gap-3">
        <svg className="w-8 h-8 text-[var(--aw-green)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4" />
        </svg>
        <div className="flex flex-col">
          <span className="font-display font-bold text-[var(--aw-green)] text-[17px] leading-tight">Intramuros Pack</span>
          <span className="text-[var(--aw-muted)] text-[12px] leading-tight mt-1">Vision AI & Maps Downloaded</span>
        </div>
      </div>
      <div 
        className="font-bold text-[12px] px-3 py-1 rounded-full"
        style={{ backgroundColor: "var(--aw-green)", color: "#17303a" }}
      >
        Ready
      </div>
    </div>
  );
}
