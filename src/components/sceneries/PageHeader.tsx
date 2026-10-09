"use client";

import GpsStatusPill from "@/components/GpsStatusPill";

export default function PageHeader({ showStatus = true }: { showStatus?: boolean }) {
  return (
    <header className="flex items-center justify-between sticky top-0 z-10 p-4" style={{ backgroundColor: "var(--aw-bg)" }}>
      <h1 className="font-display text-[28px] leading-none tracking-tight" style={{ color: "var(--aw-accent)" }}>ARWay</h1>
      {showStatus && <GpsStatusPill />}
    </header>
  );
}
