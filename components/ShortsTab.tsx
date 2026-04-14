import React, { useState, useEffect, useRef } from 'react';
import { renderTextWithEmojis } from '../utils/emoji';
import { Heart, MessageCircle, Share2, Music, Loader2, UserPlus, UserCheck, Play, Zap, Tv, Plus, TrendingUp, ThumbsUp, ThumbsDown, MessageSquare, Repeat, Pause, Volume2, VolumeX, Copy, Check, X, ChevronUp, ChevronDown, Captions, User } from 'lucide-react';
import { DEFAULT_AVATAR } from '../constants';
import { auth, db } from '../firebase';
import { useClickOutside } from '../utils/hooks';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  doc, 
  getDoc, 
  setDoc, 
  deleteDoc, 
  updateDoc, 
  increment,
  getDocs,
  limit,
  serverTimestamp,
  arrayUnion
} from 'firebase/firestore';
import { Video } from '../types';
import { generateSnowflake } from '../utils/snowflake';
import Username from './Username';

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
      const videosRef = collection(db, 'videos');
      const q = query(
        videosRef,
        where('is_short', '==', true)
      );

      const snapshot = await getDocs(q);
      const allShorts = await Promise.all(snapshot.docs.map(async (d) => {
        const data = d.data();
        const profileRef = doc(db, 'profiles', data.creator_id);
        const profileSnap = await getDoc(profileRef);
        const profileData = profileSnap.exists() ? profileSnap.data() : null;
        
        return { 
          id: d.id, 
          ...data,
          creator_display_name: profileData?.display_name || profileData?.username || data.creator_name
        } as Video;
      }));

      // Filter based on phased publication
      let filteredShorts = allShorts.filter(short => {
        if (short.is_promoted) return true;
        if (user?.uid && short.target_user_ids?.includes(user.uid)) return true;
        if (user?.uid && short.creator_id === user.uid) return true; // Always show own shorts
        return false;
      });

      // Sort based on recommendation system and popularity
      const userPrefs = profile?.preferences || {};
      
      filteredShorts.sort((a, b) => {
        const scoreA = a.type ? (userPrefs[a.type] || 0) : 0;
        const scoreB = b.type ? (userPrefs[b.type] || 0) : 0;
        
        if (scoreA !== scoreB) return scoreB - scoreA;
        
        const popA = (a.likes || 0) + (a.views || 0);
        const popB = (b.likes || 0) + (b.views || 0);
        
        return popB - popA;
      });

      setShorts(filteredShorts);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching shorts:', err);
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
  const sharePopupRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  useClickOutside(sharePopupRef, () => setShowSharePopup(false));
  const [copiedId, setCopiedId] = useState(false);
  const [progress, setProgress] = useState(0);
  const [volume, setVolume] = useState(1);
  const [showSubtitles, setShowSubtitles] = useState(true);
  const [currentSubtitle, setCurrentSubtitle] = useState<string | null>(null);

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
    if (!user?.uid) return;
    
    const videoRef = doc(db, 'videos', short.id);
    await updateDoc(videoRef, {
      views: increment(1)
    });

    const userViewRef = doc(db, 'video_views', `${user.uid}_${short.id}`);
    const userViewSnap = await getDoc(userViewRef);
    const currentCount = userViewSnap.exists() ? userViewSnap.data().view_count : 0;
    
    await setDoc(userViewRef, {
      user_id: user.uid, 
      video_id: short.id, 
      view_count: currentCount + 1,
      last_view_at: serverTimestamp()
    }, { merge: true });

    if (short.type) {
      const profileRef = doc(db, 'profiles', user.uid);
      const profileSnap = await getDoc(profileRef);
      const prefs = profileSnap.data()?.preferences || {};
      prefs[short.type] = (prefs[short.type] || 0) + 1;
      await updateDoc(profileRef, { preferences: prefs });
    }
  };

  const updateWatchStats = async (percentage: number) => {
    if (!user?.uid) return;
    
    const videoRef = doc(db, 'videos', short.id);
    const videoSnap = await getDoc(videoRef);
    if (!videoSnap.exists()) return;

    let stats = videoSnap.data().watch_stats || [];
    const userStatIndex = stats.findIndex((s: any) => s.user_id === user.uid);
    if (userStatIndex > -1) {
      stats[userStatIndex].watch_percentage = Math.max(stats[userStatIndex].watch_percentage, percentage);
    } else {
      stats.push({ user_id: user.uid, watch_percentage: percentage });
    }

    // Check for promotion to 100% (Phase 2)
    let isPromoted = videoSnap.data().is_promoted;
    const targetUserIds = videoSnap.data().target_user_ids || [];
    
    if (!isPromoted && targetUserIds.length > 0) {
      const targetUsersStats = stats.filter((s: any) => targetUserIds.includes(s.user_id));
      const reachedTargetCount = targetUsersStats.length;
      const totalTargetCount = targetUserIds.length;
      
      const highWatchCount = targetUsersStats.filter((s: any) => s.watch_percentage >= 80).length;
      const watchCriteriaMet = highWatchCount >= (totalTargetCount * 0.6);
      
      const likeRatioMet = likeCount >= (reachedTargetCount * 0.6);

      if (watchCriteriaMet && likeRatioMet) {
        isPromoted = true;
      }
    }

    await updateDoc(videoRef, { 
      watch_stats: stats,
      is_promoted: isPromoted
    });
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
    if (!user?.uid) return;

    // Check Like
    const likeRef = doc(db, 'video_likes', `${user.uid}_${short.id}`);
    const likeSnap = await getDoc(likeRef);
    setLiked(likeSnap.exists());

    // Check Sub
    const subRef = doc(db, 'subscriptions', `${user.uid}_${short.creator_id}`);
    const subSnap = await getDoc(subRef);
    setIsSubscribed(subSnap.exists());

    // Get Like Count
    const videoRef = doc(db, 'videos', short.id);
    const videoSnap = await getDoc(videoRef);
    setLikeCount(videoSnap.data()?.likes || 0);

    // Get Subscriber Count
    const subsRef = collection(db, 'subscriptions');
    const sq = query(subsRef, where('creator_id', '==', short.creator_id));
    const sSnap = await getDocs(sq);
    setSubscriberCount(sSnap.size);
  };

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user?.uid) return;

    const likeId = `${user.uid}_${short.id}`;
    const likeRef = doc(db, 'video_likes', likeId);
    const videoRef = doc(db, 'videos', short.id);

    if (liked) {
      await deleteDoc(likeRef);
      await updateDoc(videoRef, { likes: increment(-1) });
      setLikeCount(prev => prev - 1);
      setLiked(false);
    } else {
      await setDoc(likeRef, {
        id: generateSnowflake(),
        video_id: short.id, 
        user_id: user.uid,
        created_at: serverTimestamp()
      });
      await updateDoc(videoRef, { likes: increment(1) });
      setLikeCount(prev => prev + 1);
      setLiked(true);
    }
  };

  const handleSubscribe = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user?.uid || user.uid === short.creator_id) return;

    const subId = `${user.uid}_${short.creator_id}`;
    const subRef = doc(db, 'subscriptions', subId);

    if (isSubscribed) {
      await deleteDoc(subRef);
      setIsSubscribed(false);
      setSubscriberCount(prev => prev - 1);
    } else {
      await setDoc(subRef, {
        id: generateSnowflake(),
        follower_id: user.uid, 
        creator_id: short.creator_id,
        created_at: serverTimestamp()
      });
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
      const current = videoRef.current.currentTime;
      const total = videoRef.current.duration;
      const p = (current / total) * 100;
      setProgress(p || 0);

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
        <div className="relative h-full max-h-[calc(100vh-140px)] sm:max-h-[calc(100vh-100px)] aspect-[9/16] bg-black rounded-2xl overflow-hidden shadow-2xl flex items-center justify-center group border border-white/10">
          <video 
            ref={videoRef}
            src={short.url}
            loop
            playsInline
            onTimeUpdate={handleTimeUpdate}
            className="h-full w-full object-contain cursor-pointer bg-black"
            onClick={togglePlay}
          />

          {/* Subtitles Overlay */}
          {currentSubtitle && (
            <div className="absolute bottom-32 left-1/2 -translate-x-1/2 z-40 px-4 py-2 bg-black/60 backdrop-blur-md rounded-xl text-white text-center text-sm font-medium max-w-[80%] animate-in fade-in slide-in-from-bottom-2 duration-300">
              {currentSubtitle}
            </div>
          )}

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
          <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-start opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 z-20">
            <div className="flex gap-3">
              <button 
                onClick={(e) => { e.stopPropagation(); togglePlay(); }}
                className="w-10 h-10 flex items-center justify-center bg-black/60 hover:bg-white hover:text-black text-white rounded-full backdrop-blur-md transition-all"
              >
                {isPaused ? <Play size={20} fill="white" /> : <Pause size={20} fill="white" />}
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); setShowSubtitles(!showSubtitles); }}
                className={`w-10 h-10 flex items-center justify-center bg-black/60 hover:bg-white hover:text-black rounded-full backdrop-blur-md transition-all ${showSubtitles ? 'text-blue-400' : 'text-white'}`}
              >
                <Captions size={20} />
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
          <div className="absolute bottom-0 left-0 right-0 p-6 bg-black/40 pointer-events-none z-20">
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
                    <span className="text-[10px] font-bold text-white/60 font-mono">
                      ID: {short.creator_display_id || 'N/A'}
                    </span>
                    {short.creator_display_id && (
                      <button 
                        onClick={(e) => copyId(e, short.creator_display_id)}
                        className="p-0.5 hover:bg-white/10 rounded-md text-white/60 hover:text-white transition-all"
                        title="Copier l'ID"
                      >
                        {copiedId ? <Check size={10} className="text-emerald-500" /> : <Copy size={10} />}
                      </button>
                    )}
                    <span className="text-white/40 text-[8px]">•</span>
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

              <div className="flex items-center gap-2">
                <Music size={14} className="text-white" />
                <div className="overflow-hidden whitespace-nowrap w-full">
                  <p className="text-xs font-bold text-white leading-relaxed animate-marquee inline-block">
                    Son original - {short.creator_name} • {renderTextWithEmojis(short.title)}
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
              className={`w-14 h-14 rounded-2xl flex items-center justify-center backdrop-blur-md transition-all active:scale-90 ${liked ? 'bg-white text-red-500 shadow-xl' : 'bg-white/10 text-white hover:bg-white/20 shadow-sm border border-white/10'}`}
            >
              <Heart size={28} fill={liked ? "currentColor" : "none"} />
            </button>
            <span className="text-[13px] font-bold text-white">{likeCount}</span>
          </div>

          <div className="flex flex-col items-center gap-2">
            <button className="w-14 h-14 rounded-2xl flex items-center justify-center bg-white/10 text-white backdrop-blur-md hover:bg-white/20 shadow-sm border border-white/10 transition-all">
              <MessageSquare size={28} />
            </button>
            <span className="text-[13px] font-bold text-white">2,3k</span>
          </div>

          <div className="flex flex-col items-center gap-2 relative">
            <button 
              onClick={handleShare}
              className="w-14 h-14 rounded-2xl flex items-center justify-center bg-white/10 text-white backdrop-blur-md hover:bg-white/20 shadow-sm border border-white/10 transition-all"
            >
              <Share2 size={28} />
            </button>
            <span className="text-[13px] font-bold text-white">Partager</span>

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

      {/* Navigation Buttons (Far Right) */}
      <div className="absolute right-8 top-1/2 -translate-y-1/2 flex flex-col gap-4 z-30 hidden lg:flex">
        <button 
          onClick={() => {
            const container = document.querySelector('.shorts-container');
            if (container) container.scrollBy({ top: -container.clientHeight, behavior: 'smooth' });
          }}
          className="w-12 h-12 rounded-2xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center backdrop-blur-md transition-all shadow-sm border border-white/10"
        >
          <ChevronUp size={24} />
        </button>
        <button 
          onClick={() => {
            const container = document.querySelector('.shorts-container');
            if (container) container.scrollBy({ top: container.clientHeight, behavior: 'smooth' });
          }}
          className="w-12 h-12 rounded-2xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center backdrop-blur-md transition-all shadow-sm border border-white/10"
        >
          <ChevronDown size={24} />
        </button>
      </div>
    </div>
  );
};

export default ShortsTab;
