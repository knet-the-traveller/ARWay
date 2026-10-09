"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

function HomeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  );
}

function ImageSquareIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}

import { NavArrowIcon } from "@/components/icons/NavArrowIcon";

function UserIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  );
}

function ShoppingBagIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
    </svg>
  );
}

export default function BottomNav() {
  const pathname = usePathname();

  const tabs = [
    { name: "Home", href: "/", icon: HomeIcon },
    { name: "Sceneries", href: "/sceneries", icon: ImageSquareIcon },
    { name: "Navigate", href: "/maps", icon: NavArrowIcon, isCenter: true },
    { name: "Shop", href: "/shop", icon: ShoppingBagIcon },
    { name: "Profile", href: "/profile", icon: UserIcon },
  ];

  return (
    <nav
      className="flex w-full shrink-0 z-50 relative"
      style={{
        backgroundColor: "var(--aw-nav)",
        height: "calc(56px + env(safe-area-inset-bottom))",
        paddingBottom: "env(safe-area-inset-bottom)",
        borderTop: "1px solid var(--aw-border)"
      }}
    >
      <div className="absolute inset-0 bg-black/20 pointer-events-none" />
      {tabs.map((tab) => {
        const isActive = pathname === tab.href;
        const Icon = tab.icon;
        
        if (tab.isCenter) {
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-label={tab.name}
              aria-current={isActive ? "page" : undefined}
              className="flex flex-1 flex-col items-center h-[56px] min-h-[44px] relative"
            >
              <div 
                className="absolute w-[54px] h-[54px] rounded-full flex items-center justify-center shadow-lg"
                style={{
                  top: "-14px",
                  backgroundColor: "var(--aw-accent)",
                  color: "#121b2c"
                }}
              >
                {tab.name === "Navigate" ? (
                  <Icon size={26} className="-mt-[2px]" />
                ) : (
                  <Icon className="w-7 h-7 -ml-0.5 -mt-0.5" />
                )}
              </div>
              <span 
                className="text-[12px] absolute bottom-1 font-semibold"
                style={{ color: isActive ? "var(--aw-accent)" : "var(--aw-muted)" }}
              >
                {tab.name}
              </span>
            </Link>
          );
        }

        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-label={tab.name}
            aria-current={isActive ? "page" : undefined}
            className="flex flex-1 flex-col items-center justify-center h-[56px] min-h-[44px] relative z-10"
            style={{ color: isActive ? "var(--aw-accent)" : "var(--aw-muted)" }}
          >
            <Icon className="w-6 h-6 mb-1" />
            <span className={`text-[12px] ${isActive ? "font-semibold" : ""}`}>
              {tab.name}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
