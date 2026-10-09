export function OfflinePackCard() {
  return (
    <div className="rounded-2xl p-4 mt-5" style={{ backgroundColor: "var(--aw-surface)" }}>
      <div className="flex items-center justify-between mb-1">
        <span className="font-display text-[18px]" style={{ color: "var(--aw-cream)" }}>Offline pack</span>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: "var(--aw-green)" }} />
          <span className="text-[13px] font-bold" style={{ color: "var(--aw-green)" }}>Ready</span>
        </div>
      </div>
      <p className="text-[13px] mb-3" style={{ color: "var(--aw-muted)" }}>
        Saved on this phone &middot; 48 MB
      </p>
      <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "var(--aw-surface-2)" }}>
        <div className="h-full w-full rounded-full" style={{ backgroundColor: "var(--aw-green)" }} />
      </div>
    </div>
  );
}
