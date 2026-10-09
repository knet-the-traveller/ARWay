import { Post } from "@/lib/posts";
import PostCard from "./PostCard";
import { ArrowLeftIcon } from "./icons";

interface PostViewerProps {
  post: Post;
  userLat?: number;
  userLng?: number;
  onClose: () => void;
  onLike: (id: string) => void;
}

export default function PostViewer({ post, userLat, userLng, onClose, onLike }: PostViewerProps) {
  return (
    <div className="absolute inset-0 bg-[#000] z-[150] flex flex-col">
      <div className="flex items-center h-[48px] px-2 shrink-0 border-b border-[#262626]">
        <button 
          onClick={onClose} 
          className="w-[44px] h-[44px] flex items-center justify-center text-white active:opacity-70"
        >
          <ArrowLeftIcon className="w-6 h-6" />
        </button>
        <div className="flex-1 text-center font-semibold text-[16px] text-white pr-[44px]">
          Post
        </div>
      </div>
      <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        <PostCard 
          post={post}
          userLat={userLat}
          userLng={userLng}
          onLike={onLike}
        />
      </div>
    </div>
  );
}
