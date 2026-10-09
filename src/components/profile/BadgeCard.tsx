export interface Badge {
  id: string;
  name: string;
  icon: string;
  earned: boolean;
}

export const defaultBadges: Badge[] = [
  { id: "1", name: "First route", icon: "🧭", earned: true },
  { id: "2", name: "Early bird", icon: "🌅", earned: true },
  { id: "3", name: "Walled city walker", icon: "🏰", earned: false },
  { id: "4", name: "Offline explorer", icon: "📶", earned: false },
];

export function BadgeCard({ badge }: { badge: Badge }) {
  return (
    <div 
      className="w-[104px] rounded-2xl flex flex-col items-center shrink-0"
      style={{ 
        backgroundColor: "var(--aw-surface)", 
        padding: "14px 8px",
        opacity: badge.earned ? 1 : 0.4
      }}
    >
      <div 
        className="w-[44px] h-[44px] rounded-full flex items-center justify-center mb-2"
        style={{ backgroundColor: "var(--aw-surface-2)", fontSize: "22px" }}
      >
        {badge.icon}
      </div>
      <span className="font-bold text-[13px] text-center leading-tight line-clamp-2" style={{ color: "var(--aw-cream)" }}>
        {badge.name}
      </span>
    </div>
  );
}
