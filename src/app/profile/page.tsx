"use client";

import { useState, useEffect } from "react";
import { getUser, isSignedIn, User } from "@/lib/user";
import { getPosts, toggleLike, Post } from "@/lib/posts";
import { sceneries } from "@/lib/sceneries";
import SignInScreen from "@/components/SignInScreen";
import EditProfileSheet from "@/components/EditProfileSheet";
import ProfileMenu from "@/components/ProfileMenu";
import PostViewer from "@/components/PostViewer";
import { MenuIcon } from "@/components/icons";
import { useGeolocation } from "@/hooks/useGeolocation";
import PageHeader from "@/components/sceneries/PageHeader";
import { BadgeCard, defaultBadges } from "@/components/profile/BadgeCard";
import { OfflinePackCard } from "@/components/profile/OfflinePackCard";
import { SavedPlaceRow } from "@/components/profile/SavedPlaceRow";
import { PostTile } from "@/components/profile/PostTile";

export default function ProfilePage() {
  const [isClient, setIsClient] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  
  const [posts, setPosts] = useState<Post[]>([]);
  const [stats, setStats] = useState({ posts: 0, likes: 0, places: 0 });

  const [showEdit, setShowEdit] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [viewingPost, setViewingPost] = useState<Post | null>(null);
  const [activeTab, setActiveTab] = useState<"Posts" | "Saved">("Posts");

  const { position } = useGeolocation();

  const loadData = async () => {
    const allPosts = await getPosts();
    // Use both "you" and the actual username as fallback for old posts
    const myPosts = allPosts.filter(p => p.username === "you" || p.username === getUser()?.username);
    setPosts(myPosts);

    const likes = myPosts.reduce((acc, p) => acc + p.likes, 0);
    const places = new Set(myPosts.map(p => p.placeName.trim().toLowerCase())).size;
    setStats({ posts: myPosts.length, likes, places });
  };

  useEffect(() => {
    setIsClient(true);
    setSignedIn(isSignedIn());
    if (isSignedIn()) {
      setUser(getUser());
      loadData();
    }
  }, []);

  const handleSignOut = () => {
    setSignedIn(false);
    setShowMenu(false);
  };

  const handleViewerClose = async () => {
    setViewingPost(null);
    await loadData();
  };

  const handleLike = async (id: string) => {
    await toggleLike(id);
    if (viewingPost && viewingPost.id === id) {
      setViewingPost({
        ...viewingPost,
        likedByMe: !viewingPost.likedByMe,
        likes: viewingPost.likedByMe ? viewingPost.likes - 1 : viewingPost.likes + 1
      });
    }
  };

  if (!isClient) return <div className="flex-1" style={{ backgroundColor: "var(--aw-bg)" }} />;

  if (!signedIn || !user) {
    return <SignInScreen onSignIn={() => {
      setSignedIn(true);
      setUser(getUser());
      loadData();
    }} />;
  }

  // Find saved places based on the user's posts
  const savedPlaceNames = new Set(posts.map(p => p.placeName.trim().toLowerCase()));
  const savedPlaces = sceneries.filter(s => savedPlaceNames.has(s.name.trim().toLowerCase()));

  return (
    <main 
      className="flex flex-col w-full flex-1 min-h-0 overflow-hidden font-sans relative"
      style={{ backgroundColor: "var(--aw-bg)" }}
    >
      <div className="absolute top-0 right-4 z-20 h-[56px] flex items-center">
        <button 
          className="w-[44px] h-[44px] flex items-center justify-end active:opacity-70"
          style={{ color: "var(--aw-muted)" }}
          onClick={() => setShowMenu(true)}
        >
          <MenuIcon className="w-7 h-7" />
        </button>
      </div>

      <PageHeader showStatus={false} />

      <div className="flex-1 overflow-y-auto no-scrollbar pb-[calc(56px+env(safe-area-inset-bottom)+24px)]">
        <div className="px-4">
          
          {/* Profile top row */}
          <div className="flex items-center gap-5 mt-2">
            <div 
              className="w-[84px] h-[84px] rounded-full flex items-center justify-center font-display font-bold text-[40px] shrink-0"
              style={{ backgroundColor: "var(--aw-accent)", color: "#121b2c" }}
            >
              {user.name.charAt(0).toUpperCase()}
            </div>
            
            <div className="flex-1 flex justify-between px-2">
              <div className="flex flex-col items-center">
                <span className="font-bold text-[22px]" style={{ color: "var(--aw-cream)" }}>{stats.posts}</span>
                <span className="text-[13px]" style={{ color: "var(--aw-muted)" }}>Posts</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="font-bold text-[22px]" style={{ color: "var(--aw-cream)" }}>{stats.likes}</span>
                <span className="text-[13px]" style={{ color: "var(--aw-muted)" }}>Likes</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="font-bold text-[22px]" style={{ color: "var(--aw-cream)" }}>{stats.places}</span>
                <span className="text-[13px]" style={{ color: "var(--aw-muted)" }}>Places</span>
              </div>
            </div>
          </div>

          {/* Identity block */}
          <div className="mt-3 flex flex-col gap-0.5">
            <div className="flex items-baseline gap-2">
              <span className="font-bold text-[16px]" style={{ color: "var(--aw-cream)" }}>{user.name}</span>
              <span className="text-[14px]" style={{ color: "var(--aw-muted)" }}>@{user.username}</span>
            </div>
            <p className="text-[14px] whitespace-pre-wrap leading-snug" style={{ color: "var(--aw-cream)" }}>
              {user.bio}
            </p>
          </div>

          {/* Edit profile */}
          <button 
            onClick={() => setShowEdit(true)}
            className="w-full h-[48px] rounded-full font-bold text-[15px] mt-4 active:opacity-80 transition-opacity"
            style={{ 
              backgroundColor: "transparent",
              border: "1px solid var(--aw-accent)",
              color: "var(--aw-accent)" 
            }}
          >
            Edit profile
          </button>

          {/* Badges */}
          <h2 className="font-display text-[22px] mt-6 mb-3" style={{ color: "var(--aw-cream)" }}>Badges</h2>
        </div>

        <div className="flex gap-[12px] overflow-x-auto no-scrollbar snap-x snap-mandatory px-4">
          {defaultBadges.map(b => (
            <div key={b.id} className="snap-start shrink-0">
              <BadgeCard badge={b} />
            </div>
          ))}
          <div className="w-1 shrink-0 snap-start" />
        </div>

        <div className="px-4 flex flex-col">
          <OfflinePackCard />

          {/* Segmented tabs */}
          <div 
            className="rounded-full p-1.5 flex mt-5 mb-4"
            style={{ backgroundColor: "var(--aw-surface)" }}
          >
            <button
              onClick={() => setActiveTab("Posts")}
              className="flex-1 h-[48px] rounded-full font-bold text-[15px] transition-colors"
              style={{
                backgroundColor: activeTab === "Posts" ? "var(--aw-accent)" : "transparent",
                color: activeTab === "Posts" ? "#121b2c" : "var(--aw-muted)"
              }}
            >
              Posts
            </button>
            <button
              onClick={() => setActiveTab("Saved")}
              className="flex-1 h-[48px] rounded-full font-bold text-[15px] transition-colors"
              style={{
                backgroundColor: activeTab === "Saved" ? "var(--aw-accent)" : "transparent",
                color: activeTab === "Saved" ? "#121b2c" : "var(--aw-muted)"
              }}
            >
              Saved ({savedPlaces.length})
            </button>
          </div>

          {/* Tab content */}
          {activeTab === "Posts" && (
            posts.length === 0 ? (
              <p className="text-center mt-10 text-[14px]" style={{ color: "var(--aw-muted)" }}>No posts yet.</p>
            ) : (
              <div className="grid grid-cols-3 gap-1">
                {posts.map(post => (
                  <PostTile key={post.id} post={post} onClick={setViewingPost} />
                ))}
              </div>
            )
          )}

          {activeTab === "Saved" && (
            savedPlaces.length === 0 ? (
              <p className="text-center mt-10 text-[14px]" style={{ color: "var(--aw-muted)" }}>Nothing saved yet.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {savedPlaces.map(place => {
                  const cat = (place as any).category || (
                    place.name.includes("Park") ? "Park" : 
                    place.name.includes("Church") || place.name.includes("Cathedral") ? "Church" : 
                    place.name.includes("Museum") ? "Museum" : 
                    place.name.includes("Bay") || place.name.includes("River") || place.name.includes("Beach") ? "Waterfront" : "Historic"
                  );
                  
                  return (
                    <SavedPlaceRow 
                      key={place.id}
                      name={place.name}
                      category={cat}
                      image={place.image}
                      lat={place.lat}
                      lng={place.lng}
                      userLat={position?.lat}
                      userLng={position?.lng}
                    />
                  );
                })}
              </div>
            )
          )}

        </div>
      </div>

      {showEdit && (
        <EditProfileSheet 
          user={user} 
          onClose={() => setShowEdit(false)} 
          onSuccess={(updated) => {
            setUser(updated);
            setShowEdit(false);
          }} 
        />
      )}

      {showMenu && (
        <ProfileMenu 
          onClose={() => setShowMenu(false)}
          onSignOut={handleSignOut}
        />
      )}

      {viewingPost && (
        <PostViewer 
          post={viewingPost}
          userLat={position?.lat}
          userLng={position?.lng}
          onClose={handleViewerClose}
          onLike={handleLike}
        />
      )}
    </main>
  );
}
