"use client";

import { useState, useEffect } from "react";
import { getUser, isSignedIn, signOut, User } from "@/lib/user";
import { getPosts, toggleLike, Post } from "@/lib/posts";
import SignInScreen from "@/components/SignInScreen";
import EditProfileSheet from "@/components/EditProfileSheet";
import ProfileMenu from "@/components/ProfileMenu";
import PostGrid from "@/components/PostGrid";
import PostViewer from "@/components/PostViewer";
import { MenuIcon, GridIcon } from "@/components/icons";
import { useGeolocation } from "@/hooks/useGeolocation";

function getAvatarColor(username: string) {
  const colors = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#06b6d4", "#3b82f6", "#8b5cf6", "#d946ef"];
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

export default function ProfilePage() {
  const [isClient, setIsClient] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  
  const [posts, setPosts] = useState<Post[]>([]);
  const [stats, setStats] = useState({ posts: 0, likes: 0, places: 0 });

  const [showEdit, setShowEdit] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [viewingPost, setViewingPost] = useState<Post | null>(null);

  const { position } = useGeolocation();

  const loadData = async () => {
    const allPosts = await getPosts();
    const myPosts = allPosts.filter(p => p.username === "you");
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
    // update the viewing post locally so it toggles instantly
    if (viewingPost && viewingPost.id === id) {
      setViewingPost({
        ...viewingPost,
        likedByMe: !viewingPost.likedByMe,
        likes: viewingPost.likedByMe ? viewingPost.likes - 1 : viewingPost.likes + 1
      });
    }
  };

  if (!isClient) return <div className="flex-1 bg-[#000]" />;

  if (!signedIn || !user) {
    return <SignInScreen onSignIn={() => {
      setSignedIn(true);
      setUser(getUser());
      loadData();
    }} />;
  }

  return (
    <main className="flex flex-col w-full flex-1 min-h-0 bg-[#000] text-white relative">
      <div className="flex-1 overflow-y-auto pb-[16px] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        
        {/* Top bar (sticky) */}
        <div className="sticky top-0 bg-[#000] h-[48px] px-4 flex items-center justify-between z-10">
          <span className="text-[18px] font-semibold text-white">@{user.username}</span>
          <button 
            className="w-[44px] h-[44px] flex items-center justify-center -mr-2 active:opacity-70 text-white"
            onClick={() => setShowMenu(true)}
          >
            <MenuIcon className="w-7 h-7" />
          </button>
        </div>

        {/* Header Block */}
        <div className="px-4 pt-2 pb-4">
          <div className="flex items-center justify-between mb-4">
            <div 
              className="w-[80px] h-[80px] rounded-full flex items-center justify-center text-white font-semibold text-[32px] shrink-0"
              style={{ backgroundColor: getAvatarColor(user.username) }}
            >
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex flex-1 justify-around ml-6">
              <div className="flex flex-col items-center">
                <span className="text-[17px] font-semibold text-white">{stats.posts}</span>
                <span className="text-[12px] text-gray-400">Posts</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-[17px] font-semibold text-white">{stats.likes}</span>
                <span className="text-[12px] text-gray-400">Likes</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-[17px] font-semibold text-white">{stats.places}</span>
                <span className="text-[12px] text-gray-400">Places</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col mb-4">
            <span className="text-[14px] font-semibold text-white">{user.name}</span>
            <span className="text-[14px] text-gray-300 line-clamp-3 mt-0.5 whitespace-pre-wrap">{user.bio}</span>
          </div>

          <button 
            onClick={() => setShowEdit(true)}
            className="w-full py-1.5 min-h-[44px] bg-[#262626] rounded-lg font-semibold text-white text-[14px] active:opacity-80 transition-opacity"
          >
            Edit Profile
          </button>
        </div>

        {/* Tab Strip */}
        <div className="border-b border-[#262626] flex justify-center pt-2">
          <div className="px-4 border-b-2 border-white pb-2 -mb-[1px]">
            <GridIcon className="w-6 h-6 text-white" />
          </div>
        </div>

        {/* Post Grid */}
        <PostGrid 
          posts={posts} 
          onPostClick={(p) => setViewingPost(p)} 
        />

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
