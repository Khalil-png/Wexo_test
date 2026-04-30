
import React, { useState, useEffect, useRef } from 'react';
import { useClickOutside } from '../utils/hooks';
import { Heart, MessageCircle, Share2, Loader2, User as UserIcon, Play, Music, Image as ImageIcon, X, ArrowLeft, Send, ThumbsUp, ThumbsDown, Copy, Check, CheckCircle, Sparkles } from 'lucide-react';
import { DEFAULT_AVATAR } from '../constants';
import { renderTextWithEmojis } from '../utils/emoji';
import { pb } from '../services/pocketbaseService';
// Firebase désactivé

interface Post {
  id: string;
  user_id: string;
  user_email?: string;
  user_role?: 'admin' | 'user';
  content: string;
  media_url: string | null;
  media_type: 'image' | 'video' | 'audio' | null;
  created_at: any;
  type?: string;
  name_of_type?: string | null;
  language?: string;
  profiles: {
    username: string;
    avatar_url: string | null;
    display_name?: string;
  };
  likes_count: number;
  user_has_liked: boolean;
  author?: string;
  author_id?: string;
  author_email?: string;
  author_is_verified?: boolean;
  author_role?: 'admin' | 'user';
  author_display_name?: string;
  avatar?: string;
}

interface PostsTabProps {
  user: any;
  profile: any;
}

const PostsTab: React.FC<PostsTabProps> = ({ user, profile }) => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [showSharePopup, setShowSharePopup] = useState(false);
  const sharePopupRef = useRef<HTMLDivElement>(null);
  useClickOutside(sharePopupRef, () => setShowSharePopup(false));
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const resultList = await pb.collection('posts').getList(1, 50, {
        sort: '-created',
        expand: 'user_id'
      });

      // Get user likes
      let userLikes: string[] = [];
      if (user?.uid) {
        try {
          const likesList = await pb.collection('post_likes').getList(1, 200, {
            filter: `user_id="${user.uid}"`
          });
          userLikes = likesList.items.map(l => l.post_id);
        } catch (e) {}
      }

      const formattedPosts = resultList.items.map(p => {
        const author = p.expand?.user_id;
        const fallbackName = p.user_id || 'Utilisateur';

        return {
          id: p.id,
          user_id: p.user_id,
          content: p.content,
          media_url: p.media_url,
          media_type: p.media_type || (p.media_url ? 'image' : null),
          created_at: p.created,
          likes_count: p.likes_count || 0,
          user_has_liked: userLikes.includes(p.id),
          profiles: {
            username: author?.username || fallbackName,
            avatar_url: author?.avatar_url || DEFAULT_AVATAR,
            display_name: author?.name || author?.username || fallbackName
          },
          author_display_name: author?.name || author?.username || fallbackName,
          author_role: author?.role || 'user',
          author_is_verified: author?.is_verified || false
        };
      });

      setPosts(formattedPosts as any);
    } catch (err) {
      console.error('Error fetching posts:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async (postId: string, hasLiked: boolean, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!user?.uid) return;
    
    try {
      if (hasLiked) {
        // Unlike: Find the like record and delete it
        const result = await pb.collection('post_likes').getList(1, 1, {
          filter: `post_id="${postId}" && user_id="${user.uid}"`
        });
        if (result.items.length > 0) {
          await pb.collection('post_likes').delete(result.items[0].id);
        }
        
        // Update post likes_count
        const post = posts.find(p => p.id === postId);
        if (post) {
          await pb.collection('posts').update(postId, {
            'likes_count+': -1
          });
        }
      } else {
        // Like: Create like record
        await pb.collection('post_likes').create({
          post_id: postId,
          user_id: user.uid
        });

        // Update post likes_count
        const post = posts.find(p => p.id === postId);
        if (post) {
          await pb.collection('posts').update(postId, {
            'likes_count+': 1
          });

          // NOTIFICATION for author
          if (post.user_id !== user.uid) {
            try {
              await pb.collection('notifications').create({
                user_id: post.user_id,
                sender_id: user.uid,
                type: 'like',
                title: 'Nouveau like',
                content: `${profile?.display_name || user.displayName || 'Un utilisateur'} a aimé votre post.`,
                status: 'pending',
                read: false
              });
            } catch (nErr) {}
          }
        }
      }

      // Update local state
      setPosts(prev => prev.map(p => {
        if (p.id === postId) {
          return {
            ...p,
            user_has_liked: !hasLiked,
            likes_count: p.likes_count + (hasLiked ? -1 : 1)
          };
        }
        return p;
      }));
      if (selectedPost && selectedPost.id === postId) {
        setSelectedPost(prev => prev ? {
          ...prev,
          user_has_liked: !hasLiked,
          likes_count: prev.likes_count + (hasLiked ? -1 : 1)
        } : null);
      }
    } catch (err) {
      console.error("Erreur interaction like:", err);
    }
  };

  const formatRelativeDate = (dateString: any) => {
    if (!dateString) return '';
    const date = dateString.toDate ? dateString.toDate() : new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return `il y a ${diffInSeconds}s`;
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return `il y a ${diffInMinutes}m`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `il y a ${diffInHours}h`;
    const diffInDays = Math.floor(diffInHours / 24);
    return `il y a ${diffInDays}j`;
  };

  const copyToClipboard = () => {
    if (!selectedPost) return;
    const url = `https://wexo.netlify.app/?post=${selectedPost.id}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="text-white animate-spin" size={40} />
      </div>
    );
  }

  if (selectedPost) {
    return (
      <div className="flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500 bg-transparent min-h-screen">
        {/* Header with Back Button */}
        <div className="flex items-center gap-4 mb-8">
          <button 
            onClick={() => setSelectedPost(null)}
            className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl text-white transition-all active:scale-90"
          >
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-5xl font-black text-white tracking-tighter">Posts</h1>
        </div>

        <div className="relative bg-transparent rounded-3xl overflow-hidden max-w-4xl">
          {/* Top Right Action Buttons (Blue Squares) */}
          <div className="absolute top-0 right-0 flex items-center gap-2 z-20">
            <button 
              onClick={() => handleLike(selectedPost.id, selectedPost.user_has_liked)}
              className={`w-12 h-10 flex items-center justify-center rounded-lg transition-all active:scale-90 ${selectedPost.user_has_liked ? 'bg-blue-500 text-white' : 'bg-blue-900/40 text-blue-300 hover:bg-blue-800/60'}`}
            >
              <Heart size={20} fill={selectedPost.user_has_liked ? "currentColor" : "none"} />
            </button>
            <button className="w-12 h-10 flex items-center justify-center bg-blue-900/40 text-blue-300 hover:bg-blue-800/60 rounded-lg transition-all">
              <MessageCircle size={20} />
            </button>
            <button 
              onClick={copyToClipboard}
              className={`w-12 h-10 flex items-center justify-center rounded-lg transition-all ${copied ? 'bg-emerald-500 text-white' : 'bg-blue-900/40 text-blue-300 hover:bg-blue-800/60'}`}
            >
              {copied ? <CheckCircle size={20} /> : <Share2 size={20} />}
            </button>
          </div>

          {/* User Info */}
          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 rounded-full overflow-hidden bg-white/5 border border-white/10">
              {selectedPost.user_id === 'gemini' ? (
                <div className="w-full h-full overflow-hidden rounded-full">
                  <img 
                    src="https://static.vecteezy.com/system/resources/thumbnails/055/687/065/small_2x/gemini-google-icon-symbol-logo-free-png.png" 
                    className="w-full h-full object-cover" 
                    alt="Gemini"
                    referrerPolicy="no-referrer"
                  />
                </div>
              ) : (
                <img src={selectedPost.profiles?.avatar_url || DEFAULT_AVATAR} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" />
              )}
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-bold text-white tracking-tight">{selectedPost.profiles?.display_name || selectedPost.profiles?.username || 'Utilisateur'}</span>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-400">@{selectedPost.profiles?.username}</span>
                <span className="text-slate-700">•</span>
                <span className="text-xs font-bold text-slate-500">{formatRelativeDate(selectedPost.created_at)}</span>
              </div>
            </div>
          </div>

          {/* Text Content */}
          <div className="mb-8 pl-1">
            <p className="text-xl text-white font-medium leading-relaxed">
              {renderTextWithEmojis(selectedPost.content)}
            </p>
          </div>

          {/* Media Section */}
          {selectedPost.media_url && (
            <div className="rounded-3xl overflow-hidden border border-white/5 bg-black/40 shadow-2xl max-w-2xl">
              {selectedPost.media_type === 'image' && (
                <img 
                  src={selectedPost.media_url} 
                  className="w-full h-auto object-contain" 
                  alt="" 
                  referrerPolicy="no-referrer"
                />
              )}
              {selectedPost.media_type === 'video' && (
                <video src={selectedPost.media_url} controls autoPlay className="w-full bg-black" />
              )}
              {selectedPost.media_type === 'audio' && (
                <div className="p-12 flex flex-col items-center justify-center gap-6 bg-gradient-to-br from-white/5 to-transparent">
                  <Music size={64} className="text-white/20" />
                  <audio src={selectedPost.media_url} controls className="w-full" />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Share Modal (Relative to the container) */}
        {showSharePopup && (
          <div className="absolute inset-0 z-[20] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div ref={sharePopupRef} className="bg-[#1a1a1a] border border-white/10 rounded-3xl p-6 w-full max-w-md shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-white">Partager le post</h3>
                <button onClick={() => setShowSharePopup(false)} className="p-2 hover:bg-white/5 rounded-2xl text-slate-400">
                  <X size={24} />
                </button>
              </div>
              <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-2xl p-4 mb-6">
                <input 
                  type="text" 
                  readOnly 
                  value={`${window.location.origin}/?post=${selectedPost.id}`}
                  className="bg-transparent text-sm text-slate-400 outline-none flex-1 truncate"
                />
                <button 
                  onClick={copyToClipboard}
                  className="p-2 bg-white text-black rounded-xl hover:bg-slate-200 transition-all active:scale-95"
                >
                  {copied ? <Check size={20} className="text-emerald-600" /> : <Copy size={20} />}
                </button>
              </div>
              <button 
                onClick={() => setShowSharePopup(false)}
                className="w-full py-4 bg-white text-black font-bold rounded-2xl hover:bg-slate-200 transition-all"
              >
                Fermer
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400 bg-white/5 rounded-2xl border border-white/10 border-dashed">
        <MessageCircle size={48} className="mb-4 opacity-20" />
        <h2 className="text-2xl font-bold text-white mb-2">Aucun post pour le moment</h2>
        <p className="text-sm">Soyez le premier à publier !</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-700 pb-20">
      {posts.map((post) => (
        <div 
          key={post.id} 
          onClick={() => setSelectedPost(post)}
          className="bg-[#1a1a1a] border border-white/10 rounded-2xl overflow-hidden shadow-xl flex flex-col group hover:border-white/20 transition-all cursor-pointer active:scale-[0.98]"
        >
          <div className="p-4 flex flex-col flex-1">
            {/* Header */}
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-full overflow-hidden border border-white/10 flex-shrink-0">
                {post.user_id === 'gemini' ? (
                  <div className="w-full h-full overflow-hidden rounded-full">
                    <img 
                      src="https://static.vecteezy.com/system/resources/thumbnails/055/687/065/small_2x/gemini-google-icon-symbol-logo-free-png.png" 
                      className="w-full h-full object-cover" 
                      alt="Gemini"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                ) : (
                  <img src={post.profiles?.avatar_url || DEFAULT_AVATAR} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" />
              )}
            </div>
            <div className="min-w-0">
              <h3 className="text-white font-bold text-xs truncate">{post.profiles?.display_name || post.profiles?.username || 'Utilisateur'}</h3>
              <p className="text-slate-500 text-[10px]">{formatRelativeDate(post.created_at)}</p>
            </div>
            </div>

            {/* Content */}
            <p className="text-white text-xs leading-relaxed mb-4 line-clamp-3 flex-1">
              {renderTextWithEmojis(post.content)}
            </p>

            {/* Media */}
            {post.media_url && (
              <div className="rounded-2xl overflow-hidden border border-white/5 bg-black/40 mb-4 aspect-video flex items-center justify-center relative">
                {post.media_type === 'image' && (
                  <img src={post.media_url} alt="Post media" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                )}
                {post.media_type === 'video' && (
                  <>
                    <video src={post.media_url} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-all">
                      <Play size={32} className="text-white opacity-80" fill="white" />
                    </div>
                  </>
                )}
                {post.media_type === 'audio' && (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-white/5 p-4">
                    <Music size={24} className="text-slate-500" />
                    <div className="text-[10px] font-bold text-slate-500">Audio</div>
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-white/5">
              <div className="flex items-center gap-4">
                <button 
                  onClick={(e) => handleLike(post.id, post.user_has_liked, e)}
                  className={`flex items-center gap-1.5 transition-all active:scale-90 ${post.user_has_liked ? 'text-red-500' : 'text-slate-500 hover:text-white'}`}
                >
                  <Heart size={16} fill={post.user_has_liked ? "currentColor" : "none"} />
                  <span className="text-[10px] font-bold">{post.likes_count}</span>
                </button>
                <button className="flex items-center gap-1.5 text-slate-500 hover:text-white transition-colors">
                  <MessageCircle size={16} />
                  <span className="text-[10px] font-bold">Détails</span>
                </button>
              </div>
              <button className="text-slate-500 hover:text-white transition-colors">
                <Share2 size={16} />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default PostsTab;

