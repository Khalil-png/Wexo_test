
import React, { useState } from 'react';
import { renderTextWithEmojis } from '../utils/emoji';
import { Post } from '../types';
import { Heart, MessageCircle, Share2, MoreHorizontal, Copy, Check, User } from 'lucide-react';
import VideoPlayer from './VideoPlayer';
import Username from './Username';
import { DEFAULT_AVATAR } from '../constants';

interface PostCardProps {
  post: Post;
}

const PostCard: React.FC<PostCardProps> = ({ post }) => {
  const [copiedId, setCopiedId] = useState(false);

  const copyId = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden mb-6">
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src={post.avatar || DEFAULT_AVATAR} className="w-10 h-10 rounded-full" alt="avatar" referrerPolicy="no-referrer" />
          <div className="flex flex-col">
            <Username 
              username={post.author} 
              displayName={post.author_display_name}
              isVerified={post.author_is_verified} 
              isAdmin={post.author_role === 'admin'} 
              email={post.author_email}
              className="font-semibold text-sm text-white" 
              badgeSize={14} 
            />
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold text-slate-500 font-mono">
                ID: {post.author_display_id || 'N/A'}
              </span>
              {post.author_display_id && (
                <button 
                  onClick={(e) => copyId(e, post.author_display_id)}
                  className="p-0.5 hover:bg-white/10 rounded-md text-slate-500 hover:text-white transition-all"
                  title="Copier l'ID"
                >
                  {copiedId ? <Check size={10} className="text-emerald-500" /> : <Copy size={10} />}
                </button>
              )}
              <span className="text-slate-700 text-[8px]">•</span>
              <p className="text-[10px] text-slate-500">{post.timestamp}</p>
            </div>
          </div>
        </div>
        <button className="text-slate-500 hover:text-white transition-colors">
          <MoreHorizontal size={20} />
        </button>
      </div>
      <div className="px-4 pb-4">
        <p className="text-sm text-slate-400 mb-4">{renderTextWithEmojis(post.content)}</p>
        {post.image && <img src={post.image} className="rounded-2xl w-full border border-white/10 shadow-lg" alt="post content" />}
        {post.video && (
          <div className="rounded-2xl overflow-hidden border border-white/10 shadow-lg bg-black aspect-video">
            <VideoPlayer src={post.video} transcription={post.transcription} className="w-full h-full" />
          </div>
        )}
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
