import { Post } from "@/lib/posts";
import { PinIcon, HeartOutlineIcon, HeartFilledIcon, NavigateArrowIcon } from "./icons";
import Link from "next/link";
import { getDistance, formatDistance } from "@/lib/distance";

function getAvatarColor(username: string) {
  const colors = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#06b6d4", "#3b82f6", "#8b5cf6", "#d946ef"];
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

function formatRelativeTime(ms: number) {
  const diff = Date.now() - ms;
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${Math.max(1, mins)}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

interface PostCardProps {
  post: Post;
  userLat?: number;
  userLng?: number;
  onLike: (id: string) => void;
}

export default function PostCard({ post, userLat, userLng, onLike }: PostCardProps) {
  const distanceText = userLat !== undefined && userLng !== undefined && post.lat !== undefined && post.lng !== undefined
    ? formatDistance(getDistance(userLat, userLng, post.lat, post.lng))
    : null;

  const navigateUrl = post.lat !== undefined && post.lng !== undefined
    ? `/maps?lat=${post.lat}&lng=${post.lng}&name=${encodeURIComponent(post.placeName)}`
    : '#';

  let lastTap = 0;
  const handleDoubleTap = () => {
    const now = Date.now();
    if (now - lastTap < 300) {
      onLike(post.id);
    }
    lastTap = now;
  };

  const hasCoords = post.lat !== undefined && post.lng !== undefined;

  return (
    <div className="flex flex-col bg-black text-white py-4 border-b border-gray-900">
      {/* Top Row */}
      <div className="flex items-center px-4 mb-3">
        <div 
          className="w-[36px] h-[36px] rounded-full flex items-center justify-center font-bold text-white shrink-0"
          style={{ backgroundColor: getAvatarColor(post.username) }}
        >
          {post.username.charAt(0).toUpperCase()}
        </div>
        <div className="ml-3 flex flex-col justify-center">
          <span className="font-semibold text-[14px] leading-tight">{post.username}</span>
          <div className="flex items-center mt-0.5 text-gray-400">
            <PinIcon className="w-3 h-3 mr-1 shrink-0" />
            <span className="text-[12px] leading-tight">{post.placeName}</span>
          </div>
        </div>
      </div>

      {/* Image */}
      <div 
        className="w-full relative aspect-[4/5] bg-gray-900"
        onTouchEnd={handleDoubleTap}
        onClick={handleDoubleTap}
      >
        {post.image && (
          <img src={post.image} alt="Post image" className="w-full h-full object-cover" />
        )}
      </div>

      {/* Actions Row */}
      <div className="flex items-center justify-between px-4 mt-3">
        <button 
          onClick={() => onLike(post.id)}
          className="flex items-center gap-2 p-1 -ml-1 active:opacity-70 transition-opacity"
        >
          {post.likedByMe ? (
            <HeartFilledIcon className="w-7 h-7 text-red-500" />
          ) : (
            <HeartOutlineIcon className="w-7 h-7 text-white" />
          )}
          <span className="font-semibold text-[14px]">{post.likes}</span>
        </button>
        {hasCoords && (
          <Link 
            href={navigateUrl}
            className="bg-blue-500 text-white rounded-full flex items-center justify-center px-4 h-[44px] min-w-[120px] active:bg-blue-600 transition-colors"
          >
            <span className="font-semibold text-[14px] mr-2">Go there</span>
            <NavigateArrowIcon className="w-5 h-5" />
          </Link>
        )}
      </div>

      {/* Distance & Caption */}
      <div className="px-4 mt-2 flex flex-col">
        {hasCoords && distanceText && (
          <span className="text-[12px] text-gray-400 mb-1">{distanceText}</span>
        )}
        <p className="text-[14px] line-clamp-3">
          <span className="font-bold mr-2">{post.username}</span>
          {post.caption}
        </p>
        <span className="text-[12px] text-gray-500 mt-1">{formatRelativeTime(post.createdAt)}</span>
      </div>
    </div>
  );
}
