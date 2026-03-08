
import React from 'react';
import { Post } from '../types';
import { Heart, MessageCircle, Share2, MoreHorizontal } from 'lucide-react';

interface PostCardProps {
  post: Post;
}

const PostCard: React.FC<PostCardProps> = ({ post }) => {
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden mb-6">
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src={post.avatar || undefined} className="w-10 h-10 rounded-full" alt="avatar" />
          <div>
            <h4 className="font-semibold text-sm text-white">{post.author}</h4>
            <p className="text-xs text-slate-500">{post.timestamp}</p>
          </div>
        </div>
        <button className="text-slate-500 hover:text-white transition-colors">
          <MoreHorizontal size={20} />
        </button>
      </div>
      <div className="px-4 pb-4">
        <p className="text-sm text-slate-400 mb-4">{post.content}</p>
        {post.image && <img src={post.image} className="rounded-xl w-full border border-white/10 shadow-lg" alt="post content" />}
      </div>
      <div className="px-4 py-3 border-t border-white/10 flex items-center gap-6">
        <button className="flex items-center gap-2 text-slate-500 hover:text-red-500 transition-colors">
          <Heart size={18} /> <span className="text-xs font-medium">{post.likes}</span>
        </button>
        <button className="flex items-center gap-2 text-slate-500 hover:text-white transition-colors">
          <MessageCircle size={18} /> <span className="text-xs font-medium">{post.comments}</span>
        </button>
        <button className="flex items-center gap-2 text-slate-500 hover:text-emerald-500 transition-colors ml-auto">
          <Share2 size={18} />
        </button>
      </div>
    </div>
  );
};

export default PostCard;
