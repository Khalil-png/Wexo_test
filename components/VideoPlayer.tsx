import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, Settings, Captions } from 'lucide-react';

import { pb } from '../services/pocketbaseService';
// Firebase désactivé

interface VideoPlayerProps {
  src: string;
  videoId?: string;
  userId?: string;
  poster?: string;
  className?: string;
  autoPlay?: boolean;
  onFullscreen?: () => void;
  showCustomControls?: boolean;
  transcription?: { start: number, end: number, text: string }[] | null;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ 
  src, 
  videoId,
  userId,
  poster, 
  className = "", 
  autoPlay = true,
  onFullscreen,
  showCustomControls = true,
  transcription = null
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [progress, setProgress] = useState(0);
  const [hoverProgress, setHoverProgress] = useState<number | null>(null);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [isHovering, setIsHovering] = useState(false);
  const [showSubtitles, setShowSubtitles] = useState(true);
  const [currentSubtitle, setCurrentSubtitle] = useState<string | null>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Algorithm state
  const hasCountedFirstView = useRef(false);
  const hasCountedSecondView = useRef(false);
  const maxViewsReached = useRef(false);

  // Cache local pour éviter les requêtes répétées au serveur dans la même session
  const seenVideos = useRef<Set<string>>(new Set());

  const incrementView = async () => {
    if (!videoId || !userId || seenVideos.current.has(videoId)) return;
    
    seenVideos.current.add(videoId); // Marquer comme vu localement IMMÉDIATEMENT

    try {
      // Pour alléger le serveur, on fait une seule requête "optimiste" ou groupée si possible
      // Ici on garde PocketBase mais on réduit le nombre de READS
      
      // On incrémente directement via un service spécialisé ou une méthode plus directe
      // Dans PocketBase, on peut utiliser des hooks ou simplement limiter les étapes.
      
      const userIdVal = userId;
      // On ne vérifie plus si viewRecord existe si on a déjà l'info en local cache (seenVideos)
      // On lance la création du record de vue en tâche de fond (non bloquant)
      pb.collection('views').create({
        user_id: userIdVal,
        video_id: videoId,
        count: 1
      }).catch(() => {
        // Si ça échoue (déjà existant par exemple), ce n'est pas grave
      });
      
      // Update global count
      const video = await pb.collection('videos').getOne(videoId).catch(() => null);
      if (video) {
        await pb.collection('videos').update(videoId, {
          "views+": 1 // Utilise l'opérateur d'incrémentation native de PocketBase si supporté
        }).catch(async () => {
           // Fallback standard si l'opérateur + n'est pas supporté
           await pb.collection('videos').update(videoId, { views: (video.views || 0) + 1 });
        });
      } else {
        const short = await pb.collection('shorts').getOne(videoId).catch(() => null);
        if (short) {
           await pb.collection('shorts').update(videoId, { "views+": 1 }).catch(async () => {
             await pb.collection('shorts').update(videoId, { views: (short.views || 0) + 1 });
           });
        }
      }
    } catch (err) {
      console.error("Erreur lors de l'incrément de vue:", err);
    }
  };

  const updateWatchStats = async (percentage: number) => {
    if (!videoId) return;
    
    // Migration NAS : Mise à jour stats de visionnage
    console.log(`Stat visionnage NAS: ${percentage}% pour ${videoId}`);
  };

  const togglePlay = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (videoRef.current) {
      try {
        if (isPlaying) {
          videoRef.current.pause();
        } else {
          await videoRef.current.play();
        }
        setIsPlaying(!isPlaying);
      } catch (err) {
        console.warn("Play/Pause transition interrupted:", err);
      }
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const current = videoRef.current.currentTime;
      const total = videoRef.current.duration;
      const percentage = total > 0 ? (current / total) * 100 : 0;
      
      setCurrentTime(current);
      setProgress(isNaN(percentage) ? 0 : percentage);

      // Subtitles logic
      if (transcription && showSubtitles) {
        const activeSub = transcription.find(s => current >= s.start && current <= s.end);
        setCurrentSubtitle(activeSub ? activeSub.text : null);
      } else {
        setCurrentSubtitle(null);
      }

      // View counting logic
      if (percentage >= 50 && !maxViewsReached.current) {
        if (!hasCountedFirstView.current) {
          hasCountedFirstView.current = true;
          incrementView();
        } else if (videoRef.current.paused && !hasCountedSecondView.current) {
          // This part is tricky: "si il regarde en moins la moitié de la vidéo et que il quitte la video et qu'il re regarde..."
          // We'll handle the second view if they start over or resume after a pause/close
        }
      }

      // Periodic watch stats update
      if (Math.floor(current) % 5 === 0) {
        updateWatchStats(percentage);
      }
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = (Number(e.target.value) / 100) * duration;
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setProgress(Number(e.target.value));
    }
  };

  const handleProgressMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = (x / rect.width) * 100;
    setHoverProgress(percentage);
  };

  const handleProgressMouseLeave = () => {
    setHoverProgress(null);
  };

  const toggleMute = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setVolume(val);
    if (videoRef.current) {
      videoRef.current.volume = val;
      setIsMuted(val === 0);
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  const handleMouseMove = () => {
    if (!isHovering) setIsHovering(true);
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => setShowControls(false), 3000);
  };

  const handleMouseLeave = () => {
    setIsHovering(false);
    setShowControls(false);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
  };

  useEffect(() => {
    return () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, []);

  return (
    <div 
      className={`relative group rounded-2xl overflow-hidden shadow-2xl bg-black flex items-center justify-center ${className}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onMouseEnter={() => setIsHovering(true)}
    >
      <div className="relative max-w-full max-h-full flex items-center justify-center">
        <video 
          ref={videoRef}
          src={src} 
          poster={poster}
          autoPlay={autoPlay}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onClick={togglePlay}
          className="max-w-full max-h-full block object-contain"
        />

        {/* Subtitles Overlay */}
        {currentSubtitle && (
          <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-40 px-4 py-2 bg-black/60 backdrop-blur-md rounded-xl text-white text-center text-sm md:text-lg font-medium max-w-[80%] animate-in fade-in slide-in-from-bottom-2 duration-300">
            {currentSubtitle}
          </div>
        )}
        
        {showCustomControls && (
          <div className={`absolute bottom-0 left-0 right-0 p-3 sm:p-6 bg-black/40 flex flex-col gap-3 sm:gap-5 transition-opacity duration-300 ${(showControls && isHovering) || !isPlaying ? 'opacity-100' : 'opacity-0'}`}>
            {/* Progress Bar Container */}
            <div 
              className="relative w-full h-2 flex items-center group/progress mb-1"
              onMouseMove={handleProgressMouseMove}
              onMouseLeave={handleProgressMouseLeave}
            >
              {/* Background Line */}
              <div className="absolute w-full h-1.5 bg-white/20 rounded-full" />
              
              {/* Hover Preview Line (Light Gray) */}
              {hoverProgress !== null && hoverProgress > progress && (
                <div 
                  className="absolute h-1.5 bg-white/40 rounded-full z-[5]" 
                  style={{ 
                    left: `${progress}%`, 
                    width: `${hoverProgress - progress}%` 
                  }}
                />
              )}

              {/* Progress Line */}
              <div 
                className="absolute h-1.5 bg-white rounded-full z-10" 
                style={{ width: `${progress}%` }}
              />
              {/* Progress Dot (Thumb) */}
              <div 
                className="absolute w-4 h-4 bg-white rounded-full z-20 transition-all opacity-0 group-hover/progress:opacity-100 group-hover/progress:scale-110 shadow-none"
                style={{ 
                  left: `${progress}%`,
                  transform: 'translateX(-50%)' 
                }}
              />
              {/* Hidden Input for Interaction */}
              <input 
                type="range"
                min="0"
                max="100"
                step="0.1"
                value={progress}
                onChange={handleSeek}
                className="absolute w-full h-full opacity-0 cursor-pointer z-30"
              />
            </div>
            
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 sm:gap-3">
                {/* Play/Pause */}
                <button 
                  onClick={togglePlay} 
                  className="w-9 h-9 sm:w-11 sm:h-11 flex items-center justify-center bg-black/60 hover:bg-black/80 text-white rounded-full transition-all backdrop-blur-md shadow-xl"
                >
                  {isPlaying ? <Pause size={18} fill="currentColor" className="sm:w-[22px] sm:h-[22px]" /> : <Play size={18} fill="currentColor" className="ml-0.5 sm:ml-1 sm:w-[22px] sm:h-[22px]" />}
                </button>
                
                {/* Volume Pill */}
                <div className="flex items-center h-9 sm:h-11 bg-black/60 rounded-full backdrop-blur-md shadow-xl group/vol transition-all duration-300 overflow-hidden">
                  <button 
                    onClick={toggleMute} 
                    className="w-9 h-9 sm:w-11 sm:h-11 flex items-center justify-center text-white hover:text-blue-400 transition-colors shrink-0"
                  >
                    {isMuted ? <VolumeX size={16} className="sm:w-5 sm:h-5" /> : <Volume2 size={16} className="sm:w-5 sm:h-5" />}
                  </button>
                  
                  {/* Custom Volume Slider - Only visible on hover */}
                  <div className="w-0 group-hover/vol:w-20 sm:group-hover/vol:w-28 transition-all duration-300 flex items-center pr-3 sm:pr-4">
                    <div className="relative w-16 sm:w-24 h-1.5 flex items-center">
                      {/* Volume Background Line */}
                      <div className="absolute w-full h-1 bg-white/20 rounded-full" />
                      {/* Volume Progress Line */}
                      <div 
                        className="absolute h-1 bg-white rounded-full z-10" 
                        style={{ width: `${(isMuted ? 0 : volume) * 100}%` }}
                      />
                      {/* Volume Dot */}
                      <div 
                        className="absolute w-3 h-3 bg-white rounded-full z-20 opacity-0 group-hover/vol:opacity-100 transition-opacity duration-300 shadow-none"
                        style={{ left: `calc(${(isMuted ? 0 : volume) * 100}% - 6px)` }}
                      />
                      {/* Hidden Input */}
                      <input 
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={isMuted ? 0 : volume}
                        onChange={handleVolumeChange}
                        className="absolute w-full h-full opacity-0 cursor-pointer z-30"
                      />
                    </div>
                  </div>
                </div>
                
                {/* Time Display */}
                <div className="px-3 sm:px-6 h-9 sm:h-11 flex items-center justify-center bg-black/60 text-white rounded-full backdrop-blur-md shadow-xl text-[10px] sm:text-sm font-bold tracking-wider whitespace-nowrap">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </div>
              </div>
              
              <div className="flex items-center gap-2 sm:gap-3">
                {/* Subtitles */}
                <button 
                  onClick={() => setShowSubtitles(!showSubtitles)}
                  className={`w-9 h-9 sm:w-11 sm:h-11 flex items-center justify-center bg-black/60 hover:bg-black/80 rounded-full transition-all backdrop-blur-md shadow-xl ${showSubtitles ? 'text-blue-400' : 'text-white'}`}
                >
                  <Captions size={16} className="sm:w-5 sm:h-5" />
                </button>
                
                {/* Settings (UI only) */}
                <button className="w-9 h-9 sm:w-11 sm:h-11 flex items-center justify-center bg-black/60 hover:bg-black/80 text-white rounded-full transition-all backdrop-blur-md shadow-xl">
                  <Settings size={16} className="sm:w-5 sm:h-5" />
                </button>
                
                {/* Fullscreen */}
                <button 
                  onClick={() => {
                    if (onFullscreen) {
                      onFullscreen();
                    } else if (videoRef.current?.requestFullscreen) {
                      videoRef.current.requestFullscreen();
                    }
                  }}
                  className="w-9 h-9 sm:w-11 sm:h-11 flex items-center justify-center bg-black/60 hover:bg-black/80 text-white rounded-full transition-all backdrop-blur-md shadow-xl"
                >
                  <Maximize size={16} className="sm:w-5 sm:h-5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoPlayer;
