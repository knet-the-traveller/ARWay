import Link from "next/link";

interface TrailCardProps {
  title: string;
  stops: number;
  distance: string;
  image: string;
}

export default function TrailCard({ title, stops, distance, image }: TrailCardProps) {
  return (
    <Link 
      href={`/maps?name=${encodeURIComponent(title)}`}
      className="aw-card w-[230px] shrink-0 rounded-[20px] p-2 flex flex-col active:scale-[0.98] transition-transform"
    >
      <div className="w-full h-[90px] rounded-[14px] overflow-hidden mb-3" style={{ backgroundColor: "var(--aw-bg)" }}>
        {image ? (
          <img src={image} alt={title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full" style={{ background: "linear-gradient(to bottom right, var(--aw-surface-2), var(--aw-bg))" }} />
        )}
      </div>
      <h3 className="font-display text-[18px] text-[var(--aw-cream)] leading-tight mb-2 px-1 line-clamp-2 min-h-[44px]">
        {title}
      </h3>
      <div className="flex justify-between items-center px-1 text-[13px] text-[var(--aw-muted)] mb-1">
        <span>{stops} Stops</span>
        <span>{distance}</span>
      </div>
    </Link>
  );
}
