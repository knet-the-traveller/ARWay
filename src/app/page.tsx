"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { getPosts, toggleLike, Post } from "@/lib/posts";
import { useGeolocation } from "@/hooks/useGeolocation";
import { sceneries } from "@/lib/sceneries";
import { haversineDistanceM } from "@/lib/geo";
import CreatePostSheet from "@/components/CreatePostSheet";
import PackCard from "@/components/home/PackCard";
import TrailCard from "@/components/home/TrailCard";
import FeedPost from "@/components/home/FeedPost";
import GpsStatusPill from "@/components/GpsStatusPill";
import { sampleFeed } from "@/lib/homeFeed";
import { NavArrowIcon } from "@/components/icons/NavArrowIcon";

export default function Home() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [showCreateSheet, setShowCreateSheet] = useState(false);
  const { position, isDemoMode } = useGeolocation();

  // Dynamically resolve current location name from live GPS or demo fallback
  const currentLocationName = useMemo(() => {
    if (isDemoMode) {
      return "Intramuros";
    }
    if (!position) {
      return "unrecognize location";
    }

    let closestName: string | null = null;
    let minDistance = Infinity;

    for (const s of sceneries) {
      const dist = haversineDistanceM(position, { lat: s.lat, lng: s.lng });
      if (dist < minDistance) {
        minDistance = dist;
        // Clean district/barangay or place name
        const district = s.address.split(",")[0].trim();
        closestName = district && !district.includes("Blvd") ? district : s.name;
      }
    }

    if (closestName && minDistance <= 2500) {
      return closestName;
    }

    return "unrecognize location";
  }, [position, isDemoMode]);

  const loadPosts = async () => {
    const data = await getPosts();
    setPosts(data);
  };

  useEffect(() => {
    loadPosts();
  }, []);

  const handleLike = async (id: string) => {
    await toggleLike(id);
    await loadPosts();
  };

  const handleCreateSuccess = async () => {
    setShowCreateSheet(false);
    await loadPosts();
  };

  return (
    <main 
      className="flex flex-col w-full flex-1 min-h-0 overflow-hidden"
      style={{ backgroundColor: "var(--aw-bg)" }}
    >
      <div className="flex-1 overflow-y-auto no-scrollbar pb-[calc(56px+env(safe-area-inset-bottom)+24px)] p-4 flex flex-col gap-4">
        
        {/* HEADER */}
        <header className="flex items-center justify-between">
          <h1 className="font-display text-[28px] leading-none tracking-tight" style={{ color: "var(--aw-accent)" }}>ARWay</h1>
          <GpsStatusPill />
        </header>

        {/* LOCATION & GREETING */}
        <div className="flex flex-col gap-1 mt-1">
          <div className="flex items-center gap-1 text-[13px]" style={{ color: "var(--aw-muted)" }}>
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.242-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span suppressHydrationWarning>Currently in: {currentLocationName}</span>
          </div>
          <h2 className="font-display text-[30px] leading-tight" style={{ color: "var(--aw-cream)" }}>Hi, Knet</h2>
        </div>

        {/* OFFLINE PACK */}
        <PackCard />

        {/* HERO CARD */}
        <div 
          className="rounded-[24px] p-5 flex flex-col mt-2"
          style={{ background: "linear-gradient(135deg, var(--aw-maroon), var(--aw-surface) 70%)" }}
        >
          <h2 className="font-display text-[32px] leading-tight mb-2" style={{ color: "var(--aw-cream)" }}>Point. Walk. Arrive.</h2>
          <p className="text-[14px] leading-snug max-w-[85%] mb-5" style={{ color: "var(--aw-muted)" }}>
            Aim your camera at a landmark and follow the arrow to the next one, even with no signal.
          </p>
          <div className="flex items-center gap-3">
            <Link 
              href="/maps" 
              className="flex-1 h-[48px] aw-btn-primary rounded-full flex items-center justify-center gap-[8px] font-bold active:opacity-80 transition-opacity"
            >
              <NavArrowIcon size={20} />
              Start Route
            </Link>
            <Link 
              href="/maps" 
              className="flex-1 h-[48px] aw-btn-outline rounded-full flex items-center justify-center gap-2 font-bold active:bg-white/10 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Identify
            </Link>
          </div>
        </div>

        {/* OFFLINE TRAILS */}
        <div className="mt-4 flex flex-col gap-3">
          <h2 className="font-display text-[22px] leading-tight" style={{ color: "var(--aw-cream)" }}>Offline Walking Trails</h2>
          <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory no-scrollbar -mx-4 px-4 pb-2">
            <div className="snap-start shrink-0">
              <TrailCard 
                title="Intramuros Heritage Trail"
                stops={4}
                distance="1.2 km total"
                image="/sceneries/Intramuros.jpg"
              />
            </div>
            <div className="snap-start shrink-0">
              <TrailCard 
                title="Sunset Baywalk Tour"
                stops={3}
                distance="2.1 km total"
                image="/sceneries/Manila-Baywalk.jpg"
              />
            </div>
            <div className="snap-start shrink-0 w-2" />
          </div>
        </div>

        {/* BROWSE BY TYPE */}
        <div className="mt-2 flex flex-col gap-3">
          <h2 className="font-display text-[22px] leading-tight" style={{ color: "var(--aw-cream)" }}>Browse by type</h2>
          <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 pb-1">
            {["Historic", "Church", "Museum", "Waterfront"].map((type) => (
              <Link 
                key={type}
                href={`/sceneries?type=${type.toLowerCase()}`}
                className="shrink-0 h-[40px] px-5 aw-chip rounded-full flex items-center justify-center text-[14px] font-medium active:opacity-80"
              >
                {type}
              </Link>
            ))}
          </div>
        </div>

        {/* FROM TRAVELERS (MERGED FEED) */}
        <div className="mt-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-[22px] leading-tight" style={{ color: "var(--aw-cream)" }}>From travelers</h2>
            <button 
              className="h-[44px] px-2 flex items-center gap-1 active:opacity-70 font-bold text-[14px] bg-transparent"
              style={{ color: "var(--aw-accent)" }}
              onClick={() => setShowCreateSheet(true)}
            >
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              New Post
            </button>
          </div>
          
          <div className="flex flex-col gap-[12px]">
            {posts.length === 0 && sampleFeed.length === 0 ? (
              <p className="text-[14px] text-center my-6" style={{ color: "var(--aw-muted)" }}>
                No posts yet. Be the first to share a place.
              </p>
            ) : (
              <>
                {posts.map((post) => (
                  <FeedPost key={post.id} post={post} onLikeToggle={handleLike} />
                ))}
                {sampleFeed.map((post) => (
                  <FeedPost key={post.id} post={post} />
                ))}
              </>
            )}
          </div>
        </div>

      </div>

      {showCreateSheet && (
        <div className="absolute inset-0 z-[100]">
          <CreatePostSheet 
            onClose={() => setShowCreateSheet(false)}
            onSuccess={handleCreateSuccess}
          />
        </div>
      )}
    </main>
  );
}
