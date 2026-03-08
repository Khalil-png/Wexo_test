import React, { useState, useEffect, useRef } from 'react';
import { Heart, MessageCircle, Share2, Music, Loader2, UserPlus, UserCheck, Play, Zap, Tv, Plus, TrendingUp, ThumbsUp, ThumbsDown, MessageSquare, Repeat, Pause, Volume2, VolumeX, Copy, Check, X, ChevronUp, ChevronDown } from 'lucide-react';
import { DEFAULT_AVATAR } from '../constants';
import { supabase } from '../services/supabase';
import { Video } from '../types';
import { generateSnowflake } from '../utils/snowflake';

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
  }, []);

  const fetchShorts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('videos')
      .select('*')
      .eq('is_short', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching shorts:', error);
    } else {
      setShorts(data || []);
    }
    setLoading(false);
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
      // Si on est déjà en train d'animer, on bloque les autres inputs
      if (isAnimating.current) {
        e.preventDefault();
        return;
      }

      // Seuil pour éviter les micro-scrolls accidentels (plus sensible)
      if (Math.abs(e.deltaY) < 10) return;

      e.preventDefault();
      isAnimating.current = true;

      const direction = e.deltaY > 0 ? 1 : -1;
      const itemHeight = container.clientHeight;
      const currentScroll = container.scrollTop;
      
      // Calcul de l'index cible basé sur la position actuelle
      const currentIndex = Math.round(currentScroll / itemHeight);
      const nextIndex = Math.max(0, Math.min(shorts.length - 1, currentIndex + direction));
      
      container.scrollTo({
        top: nextIndex * itemHeight,
        behavior: 'smooth'
      });

      // On débloque après la fin de l'animation
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
        <div className="w-20 h-20 bg-white/5 rounded-3xl flex items-center justify-center mb-6 border border-white/10">
          <Music size={40} className="text-slate-700" />
        </div>
        <h3 className="text-xl font-black text-white mb-2 uppercase tracking-tighter">Aucun Short disponible</h3>
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
        />
      ))}
    </div>
  );
};

interface ShortItemProps {
  short: Video;
  isActive: boolean;
  user?: any;
}

const ShortItem: React.FC<ShortItemProps> = ({ short, isActive, user }) => {
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
  const [copied, setCopied] = useState(false);
  const [progress, setProgress] = useState(0);
  const [volume, setVolume] = useState(1);

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
  }, [user, isActive]);

  const checkInteractions = async () => {
    if (user) {
      // Check Like
      const { data: like } = await supabase
        .from('video_likes')
        .select('*')
        .eq('video_id', short.id)
        .eq('user_id', user.id)
        .single();
      setLiked(!!like);

      // Check Sub
      const { data: sub } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('follower_id', user.id)
        .eq('creator_id', short.creator_id)
        .single();
      setIsSubscribed(!!sub);
    }

    // Get Like Count
    const { count } = await supabase
      .from('video_likes')
      .select('*', { count: 'exact', head: true })
      .eq('video_id', short.id);
    setLikeCount(count || 0);

    // Get Subscriber Count
    const { count: subCount } = await supabase
      .from('subscriptions')
      .select('*', { count: 'exact', head: true })
      .eq('creator_id', short.creator_id);
    setSubscriberCount(subCount || 0);
  };

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;

    if (liked) {
      await supabase.from('video_likes').delete().match({ video_id: short.id, user_id: user.id });
      setLikeCount(prev => prev - 1);
      setLiked(false);
    } else {
      await supabase.from('video_likes').insert([{ 
        id: generateSnowflake(),
        video_id: short.id, 
        user_id: user.id 
      }]);
      setLikeCount(prev => prev + 1);
      setLiked(true);
    }
  };

  const handleSubscribe = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user || user.id === short.creator_id) return;

    if (isSubscribed) {
      await supabase.from('subscriptions').delete().match({ follower_id: user.id, creator_id: short.creator_id });
      setIsSubscribed(false);
      setSubscriberCount(prev => prev - 1);
    } else {
      await supabase.from('subscriptions').insert([{ 
        id: generateSnowflake(),
        follower_id: user.id, 
        creator_id: short.creator_id 
      }]);
      setIsSubscribed(true);
      setSubscriberCount(prev => prev + 1);
    }
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPaused(false);
      setShowPlayIcon(true);
      setTimeout(() => setShowPlayIcon(false), 500);
    } else {
      videoRef.current.pause();
      setIsPaused(true);
      setShowPauseIcon(true);
      setTimeout(() => setShowPauseIcon(false), 500);
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
      const p = (videoRef.current.currentTime / videoRef.current.duration) * 100;
      setProgress(p || 0);
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

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowSharePopup(!showSharePopup);
    setCopied(false);
  };

  const copyToClipboard = (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `https://wexo.netlify.app/?short=${short.id}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="h-full w-full snap-start relative flex items-center justify-center bg-[#0f0f0f] overflow-hidden">
      {/* Main Content Area (Centered) */}
      <div className="relative flex items-center gap-6 h-full w-full max-w-screen-xl px-4 justify-center">
        
        {/* Video Container */}
        <div className="relative h-[calc(100vh-100px)] aspect-[9/16] bg-black rounded-3xl overflow-hidden shadow-2xl flex items-center justify-center group border border-white/10">
          <video 
            ref={videoRef}
            src={short.url}
            loop
            playsInline
            onTimeUpdate={handleTimeUpdate}
            className="h-full w-full object-contain cursor-pointer bg-black"
            onClick={togglePlay}
          />

          {/* Play/Pause Overlay Icons */}
          {showPauseIcon && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-50 animate-out fade-out zoom-out duration-500">
              <div className="w-20 h-20 bg-black/40 rounded-full flex items-center justify-center">
                <Pause size={40} className="text-white" fill="white" />
              </div>
            </div>
          )}
          {showPlayIcon && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-50 animate-out fade-out zoom-out duration-500">
              <div className="w-20 h-20 bg-black/40 rounded-full flex items-center justify-center">
                <Play size={40} className="text-white" fill="white" />
              </div>
            </div>
          )}

          {/* Top Controls (Overlay) - Simplified */}
          <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-start opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-b from-black/60 to-transparent z-20">
            <div className="flex gap-3">
              <button 
                onClick={(e) => { e.stopPropagation(); togglePlay(); }}
                className="p-2.5 bg-black/60 hover:bg-white hover:text-black text-white rounded-full backdrop-blur-md transition-all"
              >
                {isPaused ? <Play size={20} fill="white" /> : <Pause size={20} fill="white" />}
              </button>
              <div className="flex items-center bg-[#0f0f0f] hover:bg-black rounded-full px-3 py-2 transition-all group/volume backdrop-blur-md border border-white/5 shadow-2xl">
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
          <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none z-20">
            <div className="flex flex-col gap-3 pointer-events-auto">
              <div className="flex items-center gap-3">
                <img 
                  src={short.creator_avatar || DEFAULT_AVATAR} 
                  className="w-9 h-9 rounded-full border border-white/20"
                  alt=""
                />
                <div className="flex flex-col">
                  <span className="text-sm font-black text-white tracking-tight">@{short.creator_name}</span>
                  <span className="text-[9px] font-bold text-white/60 uppercase tracking-widest">{subscriberCount} abonné{subscriberCount > 1 ? 's' : ''}</span>
                </div>
                {user && user.id !== short.creator_id && (
                  <button 
                    onClick={handleSubscribe}
                    className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 ${isSubscribed ? 'bg-white/20 text-white' : 'bg-white text-black hover:bg-white/20 hover:text-white'}`}
                  >
                    {isSubscribed ? 'Abonné' : "S'abonner"}
                  </button>
                )}
              </div>
              
              <p className="text-sm font-medium text-white line-clamp-2 leading-snug">
                {short.title}
              </p>

              <div className="flex items-center gap-2">
                <Music size={14} className="text-white" />
                <div className="overflow-hidden whitespace-nowrap w-full">
                  <p className="text-[10px] font-black text-white leading-relaxed animate-marquee inline-block">
                    Son original - {short.creator_name} • {short.title}
                  </p>
                </div>
              </div>
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

        {/* Right Side Actions (Next to Video) */}
        <div className="flex flex-col gap-5 items-center justify-end pb-12">
          <div className="flex flex-col items-center gap-2">
            <button 
              onClick={handleLike}
              className={`w-14 h-14 rounded-full flex items-center justify-center backdrop-blur-md transition-all active:scale-90 ${liked ? 'bg-white text-red-500 shadow-xl' : 'bg-white/10 text-white hover:bg-white/20 shadow-sm border border-white/10'}`}
            >
              <Heart size={28} fill={liked ? "currentColor" : "none"} />
            </button>
            <span className="text-[13px] font-bold text-white">{likeCount}</span>
          </div>

          <div className="flex flex-col items-center gap-2">
            <button className="w-14 h-14 rounded-full flex items-center justify-center bg-white/10 text-white backdrop-blur-md hover:bg-white/20 shadow-sm border border-white/10 transition-all">
              <MessageSquare size={28} />
            </button>
            <span className="text-[13px] font-bold text-white">2,3k</span>
          </div>

          <div className="flex flex-col items-center gap-2 relative">
            <button 
              onClick={handleShare}
              className="w-14 h-14 rounded-full flex items-center justify-center bg-white/10 text-white backdrop-blur-md hover:bg-white/20 shadow-sm border border-white/10 transition-all"
            >
              <Share2 size={28} />
            </button>
            <span className="text-[13px] font-bold text-white">Partager</span>

            {showSharePopup && (
              <div className="absolute bottom-full mb-4 right-0 w-72 bg-[#1a1a1a] border border-white/10 rounded-xl p-4 shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-300 z-50 pointer-events-auto">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-bold text-white">Partager</h4>
                  <button onClick={(e) => { e.stopPropagation(); setShowSharePopup(false); }} className="text-slate-400 hover:text-white">
                    <X size={20} />
                  </button>
                </div>
                <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg p-3">
                  <input 
                    type="text" 
                    readOnly 
                    value={`https://wexo.netlify.app/?short=${short.id}`}
                    className="bg-transparent text-xs text-slate-400 outline-none flex-1 truncate"
                  />
                  <button 
                    onClick={copyToClipboard}
                    className="w-10 h-10 bg-white text-black rounded-lg hover:bg-slate-200 transition-all active:scale-95 flex items-center justify-center shadow-lg flex-shrink-0"
                    title={copied ? "Copié !" : "Copier le lien"}
                  >
                    {copied ? <Check size={18} className="text-emerald-600" /> : <Copy size={18} />}
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="mt-4">
            <div className="w-12 h-12 rounded-xl overflow-hidden border-2 border-white/10 animate-spin-slow shadow-lg">
              <img 
                src={short.thumbnail_url || `https://picsum.photos/seed/${short.id}/100/100`} 
                className="w-full h-full object-cover" 
                alt="" 
              />
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Buttons (Far Right) */}
      <div className="absolute right-8 top-1/2 -translate-y-1/2 flex flex-col gap-4 z-30 hidden lg:flex">
        <button 
          onClick={() => {
            const container = document.querySelector('.shorts-container');
            if (container) container.scrollBy({ top: -container.clientHeight, behavior: 'smooth' });
          }}
          className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center backdrop-blur-md transition-all shadow-sm border border-white/10"
        >
          <ChevronUp size={24} />
        </button>
        <button 
          onClick={() => {
            const container = document.querySelector('.shorts-container');
            if (container) container.scrollBy({ top: container.clientHeight, behavior: 'smooth' });
          }}
          className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center backdrop-blur-md transition-all shadow-sm border border-white/10"
        >
          <ChevronDown size={24} />
        </button>
      </div>
    </div>
  );
};

export default ShortsTab;
