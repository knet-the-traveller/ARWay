import { useState } from "react";
import Link from "next/link";
import { FeedPost as FeedPostType } from "@/lib/homeFeed";
import { Post } from "@/lib/posts";
import { NavArrowIcon } from "@/components/icons/NavArrowIcon";
import { sceneries } from "@/lib/sceneries";
import { shops } from "@/lib/shops";

type CombinedPost = FeedPostType | Post;

function isLegacyPost(post: CombinedPost): post is Post {
  return (post as Post).createdAt !== undefined;
}

function getTimeAgoString(createdAt: number): string {
  const diff = Date.now() - createdAt;
  if (diff < 60000) return "Just now";
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d`;
}

const getMutedAvatarStyle = (username: string) => {
  const tones = ["#8b5a2b", "#a0522d", "#cd853f", "#6b4423", "#8f6b4d", "#7c5c43", "#996633", "#5c4033"];
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
  }
  return { backgroundColor: tones[Math.abs(hash) % tones.length], color: "var(--aw-cream)" };
};

export default function FeedPost({ post, onLikeToggle }: { post: CombinedPost, onLikeToggle?: (id: string) => void }) {
  const isLegacy = isLegacyPost(post);
  
  const [localLiked, setLocalLiked] = useState(isLegacy ? post.likedByMe : false);
  const [localLikesCount, setLocalLikesCount] = useState(post.likes);
  const [imgError, setImgError] = useState(false);

  const toggleLike = () => {
    if (onLikeToggle && isLegacy) {
      onLikeToggle(post.id);
    } else {
      // Local state fallback for mock posts
      if (localLiked) {
        setLocalLikesCount(c => c - 1);
        setLocalLiked(false);
      } else {
        setLocalLikesCount(c => c + 1);
        setLocalLiked(true);
      }
    }
  };

  // Compute display values
  const username = post.username;
  const avatarLetter = isLegacy ? username.charAt(0).toUpperCase() : post.avatarLetter;
  const placeName = post.placeName;
  const caption = post.caption;
  const image = post.image;
  const timeText = isLegacy ? getTimeAgoString(post.createdAt) : post.timeAgo;
  
  // Use real persisted values for legacy posts
  const displayLikes = isLegacy && onLikeToggle ? post.likes : localLikesCount;
  const displayLiked = isLegacy && onLikeToggle ? post.likedByMe : localLiked;

  // "Go there" destination lookup
  const findDestinationUrl = () => {
    const lower = placeName.trim().toLowerCase();
    const sceneMatch = sceneries.find(s => s.name.toLowerCase() === lower);
    if (sceneMatch) return `/maps?lat=${sceneMatch.lat}&lng=${sceneMatch.lng}&name=${encodeURIComponent(sceneMatch.name)}`;
    const shopMatch = shops.find(s => s.name.toLowerCase() === lower);
    if (shopMatch) return `/maps?lat=${shopMatch.lat}&lng=${shopMatch.lng}&name=${encodeURIComponent(shopMatch.name)}`;
    return `/maps`;
  };

  return (
    <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: "var(--aw-surface)" }}>
      {/* Header */}
      <div className="p-[12px] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div 
            className="w-[40px] h-[40px] rounded-full flex items-center justify-center font-bold text-lg"
            style={isLegacy ? getMutedAvatarStyle(username) : getMutedAvatarStyle(username)}
          >
            {avatarLetter}
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-[15px] leading-tight" style={{ color: "var(--aw-cream)" }}>{username}</span>
            <span className="text-[13px] leading-tight mt-0.5" style={{ color: "var(--aw-muted)" }}>{placeName}</span>
          </div>
        </div>
        {timeText && <span className="text-[13px]" style={{ color: "var(--aw-muted)" }}>{timeText}</span>}
      </div>

      {/* Image */}
      <div className="w-full h-[240px] relative" style={{ backgroundColor: "var(--aw-bg)" }}>
        {!image || imgError ? (
          <div className="w-full h-full" style={{ background: "linear-gradient(135deg, #3b5a8a, #7b5846)" }} />
        ) : (
          <img 
            src={image} 
            alt={placeName} 
            className="w-full h-full object-cover" 
            onError={() => setImgError(true)} 
          />
        )}
      </div>

      {/* Action Row & Caption */}
      <div className="p-[12px]">
        <div className="flex items-center justify-between mb-3">
          <button 
            onClick={toggleLike} 
            className="flex items-center gap-2 active:opacity-70"
            style={{ color: displayLiked ? "var(--aw-accent)" : "var(--aw-muted)" }}
          >
            <svg className="w-6 h-6" style={{ fill: displayLiked ? "var(--aw-accent)" : "none" }} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            <span className="font-medium">{displayLikes}</span>
          </button>

          <Link 
            href={findDestinationUrl()} 
            className="h-[44px] px-5 rounded-full flex items-center gap-[8px] font-bold active:opacity-80 transition-opacity"
            style={{ backgroundColor: "var(--aw-accent)", color: "#121b2c" }}
          >
            <NavArrowIcon size={16} />
            Go there
          </Link>
        </div>
        
        <p className="text-[14px] leading-snug" style={{ color: "var(--aw-cream)" }}>
          <span className="font-bold mr-2">{username}</span>
          {caption}
        </p>
      </div>
    </div>
  );
}
