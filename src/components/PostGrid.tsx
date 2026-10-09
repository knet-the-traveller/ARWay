import { Post } from "@/lib/posts";
import Link from "next/link";
import { CameraOutlineIcon, PinIcon } from "./icons";

interface PostGridProps {
  posts: Post[];
  onPostClick: (post: Post) => void;
}

export default function PostGrid({ posts, onPostClick }: PostGridProps) {
  if (posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <div className="w-[60px] h-[60px] rounded-full border border-[#262626] flex items-center justify-center mb-4">
          <CameraOutlineIcon className="w-8 h-8 text-white" />
        </div>
        <h3 className="text-white font-semibold text-[16px] mb-1">No posts yet</h3>
        <p className="text-gray-400 text-[13px] text-center mb-6">
          Share a place you love and others will want to go there.
        </p>
        <Link 
          href="/" 
          className="bg-[#3b82f6] text-white font-semibold text-[14px] px-6 py-2 rounded-full active:opacity-80 transition-opacity"
        >
          Go to Home
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-[1px]">
      {posts.map(post => (
        <div 
          key={post.id} 
          className="relative aspect-square bg-[#262626] cursor-pointer"
          onClick={() => onPostClick(post)}
        >
          {post.image && (
            <img 
              src={post.image} 
              alt={post.placeName} 
              className="w-full h-full object-cover" 
            />
          )}
          <div className="absolute bottom-1.5 left-1.5">
            <PinIcon className="w-4 h-4 text-white drop-shadow-md" />
          </div>
        </div>
      ))}
    </div>
  );
}
