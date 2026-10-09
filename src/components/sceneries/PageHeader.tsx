export default function PageHeader() {
  return (
    <header className="flex items-center justify-between sticky top-0 z-10 p-4" style={{ backgroundColor: "var(--aw-bg)" }}>
      <h1 className="font-display text-[28px] leading-none tracking-tight" style={{ color: "var(--aw-accent)" }}>ARWays</h1>
      <div className="aw-pill px-3 py-1.5 rounded-full flex items-center gap-1.5">
        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "var(--aw-green)" }}></div>
        <span className="text-[12px] font-medium leading-none" style={{ color: "var(--aw-muted)" }}>Works offline</span>
      </div>
    </header>
  );
}
