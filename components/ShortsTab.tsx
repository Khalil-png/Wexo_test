import React, { useState, useEffect, useRef } from 'react';
import { renderTextWithEmojis } from '../utils/emoji';
import { Heart, MessageCircle, Share2, Music, Loader2, UserPlus, UserCheck, Play, Zap, Tv, Plus, TrendingUp, ThumbsUp, ThumbsDown, MessageSquare, Repeat, Pause, Volume2, VolumeX, Copy, Check, X, ChevronUp, ChevronDown, Captions, User, Send } from 'lucide-react';
import { DEFAULT_AVATAR } from '../constants';
import { pb } from '../services/pocketbaseService';
// Firebase désactivé
import { useClickOutside } from '../utils/hooks';
import { Video } from '../types';
import { generateSnowflake } from '../utils/snowflake';
import Username from './Username';
import { isMobileDevice } from '../src/utils/device';

interface ShortsTabProps {
  user?: any;
  profile?: any;
}

const ShortsTab: React.FC<ShortsTabProps> = ({ user, profile }) => {
  const [shorts, setShorts] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeShortIndex, setActiveShortIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchShorts();
  }, [user?.uid]);

  const fetchShorts = async () => {
    setLoading(true);
    try {
      let resultList;
      try {
        // Nouvelle collection PocketBase 'shorts'
        resultList = await pb.collection('shorts').getList(1, 40, {
          sort: '-created',
          expand: 'creator_id'
        });
      } catch (err) {
        console.warn('Echec fetch collection shorts, essai fallback videos:', err);
        // Fallback sur 'videos' si 'shorts' est vide ou en cours de migration
        resultList = await pb.collection('videos').getList(1, 40, {
          sort: '-created',
          expand: 'author,user_id,creator_id',
          filter: 'is_short = true'
        });
      }

      const formattedShorts = resultList.items.map(v => {
        // Support pour les deux types de structures (nouveaux 'shorts' et vieux 'videos')
        const author = v.expand?.creator_id || v.expand?.author || v.expand?.user_id;
        return {
          id: v.id,
          title: v.title,
          description: v.description,
          url: v.url || v.video_url, // 'url' pour shorts, 'video_url' pour videos
          thumbnail_url: v.thumbnail_url,
          creator_id: v.creator_id || v.author || v.user_id,
          creator_name: author?.username || 'Utilisateur',
          creator_display_name: author?.name || author?.username || 'Utilisateur',
          creator_avatar: author?.avatar_url || DEFAULT_AVATAR,
          creator_is_verified: author?.is_verified || false,
          views: Number(v.views) || 0,
          likes: Number(v.likes) || 0,
          is_short: v.collectionName === 'shorts' ? true : v.is_short,
          created_at: v.created
        };
      });

      setShorts(formattedShorts as any);
    } catch (err) {
      console.error('Error fetching shorts completely failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleScroll = () => {
    if (!containerRef.current) return;
    const index = Math.round(containerRef.current.scrollTop / containerRef.current.clientHeight);
    if (index !== activeShortIndex) {
      setActiveShortIndex(index);
    }
  };

  const scrollToNext = () => {
    if (!containerRef.current) return;
    containerRef.current.scrollBy({ top: containerRef.current.clientHeight, behavior: 'smooth' });
  };

  const scrollToPrev = () => {
    if (!containerRef.current) return;
    containerRef.current.scrollBy({ top: -containerRef.current.clientHeight, behavior: 'smooth' });
  };

  const isAnimating = useRef(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      if (isAnimating.current) {
        e.preventDefault();
        return;
      }

      if (Math.abs(e.deltaY) < 10) return;

      e.preventDefault();
      isAnimating.current = true;

      const direction = e.deltaY > 0 ? 1 : -1;
      const itemHeight = container.clientHeight;
      const currentScroll = container.scrollTop;
      
      const currentIndex = Math.round(currentScroll / itemHeight);
      const nextIndex = Math.max(0, Math.min(shorts.length - 1, currentIndex + direction));
      
      container.scrollTo({
        top: nextIndex * itemHeight,
        behavior: 'smooth'
      });

      setTimeout(() => {
        isAnimating.current = false;
      }, 500);
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [shorts.length]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-[#0f0f0f]">
        <Loader2 className="text-white animate-spin" size={40} />
      </div>
    );
  }

  if (shorts.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-10 bg-[#0f0f0f]">
        <div className="w-20 h-20 bg-white/5 rounded-2xl flex items-center justify-center mb-6 border border-white/10">
          <Music size={40} className="text-slate-700" />
        </div>
        <h3 className="text-xl font-bold text-white mb-2 tracking-tighter">Aucun Short disponible</h3>
        <p className="text-slate-400 text-sm max-w-xs">Soyez le premier à publier un Short depuis l'onglet "Ma chaîne" !</p>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      onScroll={handleScroll}
      className="shorts-container h-full w-full overflow-y-scroll snap-y snap-mandatory no-scrollbar bg-[#0f0f0f]"
    >
      {shorts.map((short, index) => (
        <ShortItem 
          key={short.id} 
          short={short} 
          isActive={index === activeShortIndex} 
          user={user}
          profile={profile}
        />
      ))}
    </div>
  );
};

interface ShortItemProps {
  short: Video;
  isActive: boolean;
  user?: any;
  profile?: any;
}

const ShortItem: React.FC<ShortItemProps> = ({ short, isActive, user, profile }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(short.likes || 0);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscriberCount, setSubscriberCount] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [showPauseIcon, setShowPauseIcon] = useState(false);
  const [showPlayIcon, setShowPlayIcon] = useState(false);
  const [showSharePopup, setShowSharePopup] = useState(false);
  const sharePopupRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  useClickOutside(sharePopupRef, () => setShowSharePopup(false));
  const [copiedId, setCopiedId] = useState(false);
  const [progress, setProgress] = useState(0);
  const [volume, setVolume] = useState(1);
  const [showSubtitles, setShowSubtitles] = useState(true);
  const [currentSubtitle, setCurrentSubtitle] = useState<string | null>(null);
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [comments, setComments] = useState<any[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [isPostingComment, setIsPostingComment] = useState(false);
  const isLikeProcessing = useRef(false);

  const hasCountedFirstView = useRef(false);
  const hasCountedSecondView = useRef(false);
  const maxViewsReached = useRef(false);
  const lastStatsUpdate = useRef(0);

  useEffect(() => {
    hasCountedFirstView.current = false;
    hasCountedSecondView.current = false;
    maxViewsReached.current = false;
    lastStatsUpdate.current = 0;
  }, [short.id]);

  const incrementView = async () => {
    if (!user?.uid || !short.id) return;
    try {
      const userId = user.id || user.uid;
      let viewRecord;
      try {
        viewRecord = await pb.collection('views').getFirstListItem(`user_id="${userId}" && video_id="${short.id}"`);
      } catch (e) {}

      if (!viewRecord) {
        await pb.collection('views').create({ user_id: userId, video_id: short.id, count: 1 });
        const res = await pb.collection('shorts').getOne(short.id).catch(() => null);
        if (res) await pb.collection('shorts').update(short.id, { views: (res.views || 0) + 1 });
      } else if (viewRecord.count < 2) {
        await pb.collection('views').update(viewRecord.id, { count: 2 });
        const res = await pb.collection('shorts').getOne(short.id).catch(() => null);
        if (res) await pb.collection('shorts').update(short.id, { views: (res.views || 0) + 1 });
      }
    } catch (err) {
      console.error("Erreur incrementView shorts:", err);
    }
  };

  const updateWatchStats = async (percentage: number) => {
    if (!user?.uid) return;
    // Migration NAS
  };

  useEffect(() => {
    if (isActive && videoRef.current) {
      videoRef.current.play().catch(() => {});
      setIsPaused(false);
    } else if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
      setIsPaused(true);
    }
  }, [isActive]);

  useEffect(() => {
    if (isActive) {
      checkInteractions();
    }
  }, [user?.uid, isActive]);

  const checkInteractions = async () => {
    if (!user?.uid || !short.id) return;
    const userId = user.id || user.uid;
    try {
      const likeRes = await pb.collection('likes').getFirstListItem(`user_id="${userId}" && video_id="${short.id}"`).catch(() => null);
      setLiked(!!likeRes);
      
      const subRes = await pb.collection('subscriptions').getFirstListItem(`follower_id="${userId}" && following_id="${short.creator_id}"`).catch(() => null);
      setIsSubscribed(!!subRes);
      
      const creator = await pb.collection('users').getOne(short.creator_id).catch(() => null);
      if (creator) setSubscriberCount(creator.subscribers || 0);
    } catch (err) {
      console.error("Error checking interactions:", err);
    }
  };

  const handleLike = async (e: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!user?.uid || isLikeProcessing.current) return;
    
    isLikeProcessing.current = true;
    const userId = user.id || user.uid;
    try {
      // Optimistic Update
      const prevLiked = liked;
      setLiked(!prevLiked);
      setLikeCount(prev => prevLiked ? Math.max(0, prev - 1) : prev + 1);

      if (prevLiked) {
        // Dé-liker
        try {
          const existingLike = await pb.collection('likes').getFirstListItem(`user_id="${userId}" && video_id="${short.id}"`).catch(() => null);
          if (existingLike) await pb.collection('likes').delete(existingLike.id);
          await pb.collection('shorts').update(short.id, { "likes-": 1 });
        } catch (e) {}
      } else {
        // Liker
        await pb.collection('likes').create({ user_id: userId, video_id: short.id });
        await pb.collection('shorts').update(short.id, { "likes+": 1 });
      }
    } catch (err) {
      console.error("Error handling short like:", err);
      // Revert in case of error
      checkInteractions();
    } finally {
      isLikeProcessing.current = false;
    }
  };

  const handleSubscribe = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user?.uid || user.uid === short.creator_id) return;
    // Migration NAS
  };

  const togglePlay = async () => {
    if (!videoRef.current) return;
    try {
      if (videoRef.current.paused) {
        await videoRef.current.play();
        setIsPaused(false);
        setShowPlayIcon(true);
        setTimeout(() => setShowPlayIcon(false), 500);
      } else {
        videoRef.current.pause();
        setIsPaused(true);
        setShowPauseIcon(true);
        setTimeout(() => setShowPauseIcon(false), 500);
      }
    } catch (err) {
      console.warn("Shorts play/pause interrupted:", err);
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    const newMuted = !videoRef.current.muted;
    videoRef.current.muted = newMuted;
    setIsMuted(newMuted);
    if (!newMuted && volume === 0) {
      setVolume(0.5);
      videoRef.current.volume = 0.5;
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (videoRef.current) {
      videoRef.current.volume = val;
      const isMute = val === 0;
      videoRef.current.muted = isMute;
      setIsMuted(isMute);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const current = videoRef.current.currentTime;
      const total = videoRef.current.duration;
      const p = total > 0 ? (current / total) * 100 : 0;
      setProgress(isNaN(p) ? 0 : p);

      // Subtitles logic
      if (short.transcription && showSubtitles) {
        const activeSub = short.transcription.find(s => current >= s.start && current <= s.end);
        setCurrentSubtitle(activeSub ? activeSub.text : null);
      } else {
        setCurrentSubtitle(null);
      }

      // View counting logic
      if (p >= 50 && !maxViewsReached.current) {
        if (!hasCountedFirstView.current) {
          hasCountedFirstView.current = true;
          incrementView();
        } else if (videoRef.current.paused && !hasCountedSecondView.current) {
          // Second view logic
        }
      }

      // Periodic watch stats update
      if (Math.abs(p - lastStatsUpdate.current) >= 5) {
        lastStatsUpdate.current = p;
        updateWatchStats(p);
      }
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    const val = parseFloat(e.target.value);
    if (videoRef.current) {
      const time = (val / 100) * videoRef.current.duration;
      videoRef.current.currentTime = time;
      setProgress(val);
    }
  };

  const copyId = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowSharePopup(!showSharePopup);
    setCopied(false);
  };

  const handlePostComment = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!short.id || !user || !newComment.trim()) return;
    const userId = user.id || user.uid;
    setIsPostingComment(true);
    try {
      const record = await pb.collection('comments').create({
        user_id: userId,
        video_id: short.id,
        content: newComment
      });

      const newCommentObj = {
        id: record.id,
        user_id: userId,
        username: profile?.username || 'Utilisateur',
        avatar_url: profile?.avatar_url || DEFAULT_AVATAR,
        content: newComment,
        created_at: record.created,
        likes: 0
      };

      setComments([newCommentObj, ...comments]);
      setNewComment("");
    } catch (err) {
      console.error("Erreur lors du postage du commentaire (short):", err);
    } finally {
      setIsPostingComment(false);
    }
  };

  const fetchComments = async () => {
    if (!short.id) return;
    setLoadingComments(true);
    try {
      const records = await pb.collection('comments').getList(1, 50, {
        filter: `video_id="${short.id}"`,
        sort: '-created',
        expand: 'user_id'
      });

      const formatted = records.items.map(r => ({
        id: r.id,
        user_id: r.user_id,
        username: r.expand?.user_id?.username || 'Utilisateur',
        avatar_url: (r.expand?.user_id?.avatar_url) || DEFAULT_AVATAR,
        content: r.content,
        created_at: r.created,
        likes: r.likes || 0
      }));

      setComments(formatted);
    } catch (err) {
      console.error("Error fetching comments for short:", err);
    } finally {
      setLoadingComments(false);
    }
  };

  useEffect(() => {
    if (showComments) {
      fetchComments();
    }
  }, [showComments, short.id]);

  const copyToClipboard = (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `https://wexo.netlify.app/?short=${short.id}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="h-full w-full snap-start relative flex items-center justify-center bg-black overflow-hidden">
      {/* Main Content Area (Centered) */}
      <div className={`relative flex h-full w-full justify-center ${isMobileDevice() ? 'items-stretch px-0' : 'items-center gap-6 max-w-screen-xl px-4'}`}>
        
        {/* Video Container */}
        <div className={`relative h-full bg-black overflow-hidden flex items-center justify-center group ${isMobileDevice() ? 'w-full rounded-0' : 'max-h-[calc(100vh-100px)] aspect-[9/16] rounded-2xl shadow-2xl border border-white/10'}`}>
          <video 
            ref={videoRef}
            src={short.url}
            loop
            playsInline
            onTimeUpdate={handleTimeUpdate}
            className="h-full w-full object-cover sm:object-contain cursor-pointer bg-black"
            onClick={togglePlay}
          />

          {/* Subtitles Overlay */}
          {currentSubtitle && (
            <div className="absolute bottom-32 left-1/2 -translate-x-1/2 z-40 px-4 py-2 bg-black/60 backdrop-blur-md rounded-xl text-white text-center text-sm font-medium max-w-[80%] animate-in fade-in slide-in-from-bottom-2 duration-300">
              {currentSubtitle}
            </div>
          )}

          {/* Pause/Play Overlay Icons - Toujours visibles au clic */}
          {showPauseIcon && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-50 animate-out fade-out zoom-out duration-500">
              <div className="w-20 h-20 bg-black/50 rounded-full flex items-center justify-center">
                <Pause size={40} className="text-white" fill="white" />
              </div>
            </div>
          )}
          {showPlayIcon && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-50 animate-out fade-out zoom-out duration-500">
              <div className="w-20 h-20 bg-black/50 rounded-full flex items-center justify-center">
                <Play size={40} className="text-white" fill="white" />
              </div>
            </div>
          )}

          {/* Top Controls (Overlay) - Simplified */}
          <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-start opacity-0 group-hover:opacity-100 transition-opacity z-20">
            <div className="flex gap-3">
              <button 
                onClick={(e) => { e.stopPropagation(); togglePlay(); }}
                className="w-10 h-10 flex items-center justify-center bg-black/50 hover:bg-black/80 text-white rounded-full backdrop-blur-md transition-all"
              >
                {isPaused ? <Play size={20} fill="white" /> : <Pause size={20} fill="white" />}
              </button>
              
              <div className="flex items-center bg-black/50 hover:bg-black/80 rounded-full px-3 py-2 transition-all group/volume backdrop-blur-md border border-white/5 shadow-2xl">
                <button 
                  onClick={(e) => { e.stopPropagation(); toggleMute(); }}
                  className="text-white p-1 hover:scale-110 transition-transform"
                >
                  {isMuted || volume === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
                </button>
                <div className="w-0 group-hover/volume:w-24 overflow-hidden transition-all duration-300 flex items-center">
                  <input 
                    type="range" 
                    min="0" 
                    max="1" 
                    step="0.01" 
                    value={isMuted ? 0 : volume} 
                    onChange={handleVolumeChange}
                    className="volume-slider w-20 h-1 mx-2 cursor-pointer"
                    style={{
                      background: `linear-gradient(to right, #ffffff ${isMuted ? 0 : volume * 100}%, rgba(255,255,255,0.2) ${isMuted ? 0 : volume * 100}%)`
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Info (Overlay) */}
          <div className="absolute bottom-0 left-0 right-0 p-6 z-20 pointer-events-none">
            <div className="flex flex-col gap-3 pointer-events-auto">
              <div className="flex items-center gap-3">
                <img 
                  src={short.creator_avatar || DEFAULT_AVATAR} 
                  className="w-9 h-9 rounded-full border border-white/20"
                  alt=""
                  referrerPolicy="no-referrer"
                />
                <div className="flex flex-col">
                  <Username 
                    username={short.creator_name || 'Utilisateur'} 
                    displayName={short.creator_display_name}
                    isVerified={short.creator_is_verified} 
                    isAdmin={short.creator_role === 'admin'}
                    email={short.creator_email}
                    className="text-sm font-bold text-white tracking-tight" 
                    badgeSize={14} 
                  />
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[10px] font-bold text-white/60">{subscriberCount} abonné{subscriberCount > 1 ? 's' : ''}</span>
                  </div>
                </div>
                {user && user.uid !== short.creator_id && (
                  <button 
                    onClick={handleSubscribe}
                    className={`px-4 py-1.5 rounded-2xl text-xs font-bold transition-all active:scale-95 ${isSubscribed ? 'bg-white/20 text-white' : 'bg-white text-black hover:bg-white/20 hover:text-white'}`}
                  >
                    {isSubscribed ? 'Abonné' : "S'abonner"}
                  </button>
                )}
              </div>
              
              <p className="text-sm font-medium text-white line-clamp-2 leading-snug">
                {renderTextWithEmojis(short.title)}
              </p>

              {short.type && (
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-white/20 text-white text-[9px] font-bold rounded">
                    {short.type}
                  </span>
                  {short.name_of_type && (
                    <span className="text-[10px] font-bold text-white/60 truncate">
                      {short.name_of_type}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Progress Bar (YouTube Style) - Inside Video Container */}
          <div className="absolute bottom-0 left-0 right-0 h-1 z-30 flex items-center group/progress">
            <input 
              type="range"
              min="0"
              max="100"
              step="0.1"
              value={progress}
              onChange={handleSeek}
              className="progress-slider"
              style={{
                background: `linear-gradient(to right, #ffffff ${progress}%, rgba(255,255,255,0.2) ${progress}%)`
              }}
            />
          </div>
        </div>

        {/* Right Side Actions */}
        <div className={`flex flex-col gap-5 items-center justify-end ${isMobileDevice() ? 'absolute right-4 bottom-24 z-40' : 'pb-12'}`}>
          <div className="flex flex-col items-center gap-2">
            <button 
              onClick={handleLike}
              className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center backdrop-blur-md transition-all active:scale-90 ${liked ? 'bg-white text-red-500 shadow-xl' : 'bg-white/10 text-white hover:bg-white/20 shadow-sm border border-white/10'}`}
            >
              <Heart size={isMobileDevice() ? 24 : 28} fill={liked ? "currentColor" : "none"} />
            </button>
            <span className="text-[12px] sm:text-[13px] font-bold text-white drop-shadow-md">{likeCount}</span>
          </div>

          <div className="flex flex-col items-center gap-2">
            <button 
              onClick={() => setShowComments(true)}
              className="w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center bg-white/10 text-white backdrop-blur-md hover:bg-white/20 shadow-sm border border-white/10 transition-all"
            >
              <MessageSquare size={isMobileDevice() ? 24 : 28} />
            </button>
            <span className="text-[10px] sm:text-[13px] font-bold text-white drop-shadow-md">Commenter</span>
          </div>

          <div className="flex flex-col items-center gap-2 relative">
            <button 
              onClick={handleShare}
              className="w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center bg-white/10 text-white backdrop-blur-md hover:bg-white/20 shadow-sm border border-white/10 transition-all"
            >
              <Share2 size={isMobileDevice() ? 24 : 28} />
            </button>
            <span className="text-[10px] sm:text-[13px] font-bold text-white drop-shadow-md">Partager</span>

            {showSharePopup && (
              <div 
                ref={sharePopupRef}
                className="absolute bottom-full mb-4 right-0 w-72 bg-[#1a1a1a] border border-white/10 rounded-2xl p-4 shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-300 z-50 pointer-events-auto"
              >
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-bold text-white">Partager</h4>
                  <button onClick={(e) => { e.stopPropagation(); setShowSharePopup(false); }} className="text-slate-400 hover:text-white">
                    <X size={20} />
                  </button>
                </div>
                <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-2xl p-3">
                  <input 
                    type="text" 
                    readOnly 
                    value={`https://wexo.netlify.app/?short=${short.id}`}
                    className="bg-transparent text-xs text-slate-400 outline-none flex-1 truncate"
                  />
                  <button 
                    onClick={copyToClipboard}
                    className="w-10 h-10 bg-white text-black rounded-2xl hover:bg-slate-200 transition-all active:scale-95 flex items-center justify-center shadow-lg flex-shrink-0"
                    title={copied ? "Copié !" : "Copier le lien"}
                  >
                    {copied ? <Check size={18} className="text-emerald-600" /> : <Copy size={18} />}
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="mt-4">
            <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white/10 animate-spin-slow shadow-lg">
              <img 
                src={short.thumbnail_url || `https://picsum.photos/seed/${short.id}/100/100`} 
                className="w-full h-full object-cover" 
                alt="" 
              />
            </div>
          </div>
        </div>
      </div>

      {/* Comments Overlay */}
      {showComments && (
        <div className="absolute inset-0 z-50 flex flex-col bg-black/95 animate-in slide-in-from-bottom duration-300">
          <div className="flex items-center justify-between p-4 border-b border-white/10">
            <h3 className="text-lg font-bold text-white">Commentaires</h3>
            <button 
              onClick={() => setShowComments(false)}
              className="p-2 text-slate-400 hover:text-white"
            >
              <X size={24} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {loadingComments ? (
              <div className="flex justify-center py-20"><Loader2 className="animate-spin text-white" /></div>
            ) : comments.length > 0 ? (
              comments.map(comment => (
                <div key={comment.id} className="flex gap-3">
                  <img src={comment.avatar_url} className="w-8 h-8 rounded-full border border-white/10" alt="" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-white">@{comment.username}</span>
                      <span className="text-[10px] text-slate-500">il y a quelques instants</span>
                    </div>
                    <p className="text-sm text-slate-300 leading-relaxed">{comment.content}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-20 text-slate-500 text-sm italic">Aucun commentaire pour le moment.</div>
            )}
          </div>

          <div className="p-4 border-t border-white/10 bg-[#0f0f0f]">
            <form onSubmit={handlePostComment} className="flex gap-3">
              <input 
                type="text" 
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Ajouter un commentaire..."
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white outline-none focus:border-white/30"
              />
              <button 
                type="submit"
                disabled={!newComment.trim() || isPostingComment}
                className="p-2 bg-white text-black rounded-xl disabled:bg-white/20"
              >
                <Send size={18} />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Navigation Buttons (Far Right) */}
      <div className="absolute right-8 top-1/2 -translate-y-1/2 flex flex-col gap-4 z-30 hidden lg:flex">
        <button 
          onClick={(e) => {
            e.stopPropagation();
            const container = document.querySelector('.shorts-container');
            if (container) container.scrollBy({ top: -container.clientHeight, behavior: 'smooth' });
          }}
          className="w-14 h-14 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center backdrop-blur-md transition-all shadow-xl border border-white/20 active:scale-95"
          title="Précédent"
        >
          <ChevronUp size={28} />
        </button>
        <button 
          onClick={(e) => {
            e.stopPropagation();
            const container = document.querySelector('.shorts-container');
            if (container) container.scrollBy({ top: container.clientHeight, behavior: 'smooth' });
          }}
          className="w-14 h-14 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center backdrop-blur-md transition-all shadow-xl border border-white/20 active:scale-95"
          title="Suivant"
        >
          <ChevronDown size={28} />
        </button>
      </div>
    </div>
  );
};

export default ShortsTab;
