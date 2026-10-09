import { useState } from "react";
import { Post } from "@/lib/posts";

interface PostTileProps {
  post: Post;
  onClick: (post: Post) => void;
}

export function PostTile({ post, onClick }: PostTileProps) {
  const [imgError, setImgError] = useState(false);

  return (
    <div 
      onClick={() => onClick(post)}
      className="aspect-square rounded-xl overflow-hidden relative cursor-pointer active:scale-[0.98] transition-transform"
    >
      {!post.image || imgError ? (
        <div className="w-full h-full" style={{ background: "linear-gradient(135deg, #3b5a8a, #7b5846)" }} />
      ) : (
        <img 
          src={post.image} 
          alt={post.caption} 
          loading="lazy"
          className="w-full h-full object-cover" 
          onError={() => setImgError(true)} 
        />
      )}
      
      {post.likes > 0 && (
        <div 
          className="absolute bottom-2 left-2 rounded-full px-2 py-1 flex items-center gap-1"
          style={{ backgroundColor: "rgba(18,27,44,0.75)" }}
        >
          <svg className="w-3 h-3 text-white fill-white" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
          <span className="text-white font-bold text-[12px] leading-none">{post.likes}</span>
        </div>
      )}
    </div>
  );
}
