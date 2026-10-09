"use client";

import { useState, useEffect } from "react";
import { getPosts, toggleLike, Post } from "@/lib/posts";
import { useGeolocation } from "@/hooks/useGeolocation";
import PostCard from "@/components/PostCard";
import CreatePostSheet from "@/components/CreatePostSheet";
import { PlusIcon } from "@/components/icons";

export default function Home() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [showCreateSheet, setShowCreateSheet] = useState(false);
  const { position } = useGeolocation();

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
    <main className="flex flex-col w-full flex-1 min-h-0 bg-black text-white overflow-hidden">
      {/* HEADER */}
      <header className="flex items-center justify-between px-4 h-[48px] shrink-0 border-b border-gray-900 bg-black/90 backdrop-blur-md z-10 sticky top-0">
        <h1 className="text-[20px] font-semibold text-white tracking-tight">ARWay</h1>
        <button 
          className="p-1 -mr-1 text-white active:opacity-70 h-[44px] min-w-[44px] flex items-center justify-center"
          onClick={() => setShowCreateSheet(true)}
        >
          <PlusIcon className="w-7 h-7" />
        </button>
      </header>

      {/* FEED */}
      <div className="flex-1 overflow-y-auto pb-[16px] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {posts.map(post => (
          <PostCard 
            key={post.id}
            post={post}
            userLat={position?.lat}
            userLng={position?.lng}
            onLike={handleLike}
          />
        ))}
      </div>

      {showCreateSheet && (
        <CreatePostSheet 
          onClose={() => setShowCreateSheet(false)}
          onSuccess={handleCreateSuccess}
        />
      )}
    </main>
  );
}
