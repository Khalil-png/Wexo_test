
import React, { useState, useEffect, useRef } from 'react';
import { renderTextWithEmojis } from '../utils/emoji';
import VideoPlayer from './VideoPlayer';
import { useClickOutside } from '../utils/hooks';
import { Search, Zap, TrendingUp, Tv, PlayCircle, Video as VideoIcon, Loader2, Play, Heart, MessageCircle, Send, X, Plus, Volume2, VolumeX, Copy, Check, ThumbsUp, ThumbsDown, Share2, ArrowLeft, Sparkles, User } from 'lucide-react';
import { pb } from '../services/pocketbaseService';
// Firebase désactivé
import { generateSnowflake } from '../utils/snowflake';
import { Video } from '../types';
import { DEFAULT_AVATAR } from '../constants';
import Username from './Username';

interface Comment {
  id: string;
  user_id: string;
  username: string;
  display_name?: string;
  avatar_url: string;
  user_is_verified?: boolean;
  content: string;
  created_at: any;
  likes?: number;
  hasLiked?: boolean;
}

interface VideoTabProps {
  onBecomeCreator: () => void;
  onTabChange: (id: string) => void;
  user?: any;
  profile?: any;
}

// Icône de caméra de film personnalisée
const MovieCameraIcon = ({ size = 16, className = "" }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2.5" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    {/* Corps de la caméra */}
    <rect x="2" y="10" width="14" height="10" rx="2" />
    {/* Objectif */}
    <path d="m16 13 5-3v10l-5-3" />
    {/* Bobines sur le dessus */}
    <circle cx="6" cy="6" r="3" />
    <circle cx="12" cy="6" r="3" />
  </svg>
);

const VideoTab: React.FC<VideoTabProps> = ({ onBecomeCreator, onTabChange, user, profile }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  
  // Interaction states
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [hasLiked, setHasLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscriberCount, setSubscriberCount] = useState(0);
  const [showSharePopup, setShowSharePopup] = useState(false);
  const sharePopupRef = useRef<HTMLDivElement>(null);
  useClickOutside(sharePopupRef, () => setShowSharePopup(false));
  const [copied, setCopied] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [isPostingComment, setIsPostingComment] = useState(false);
  const isLikeProcessing = useRef(false);

  const handleShare = () => {
    setShowSharePopup(!showSharePopup);
  };

  const copyToClipboard = () => {
    const url = `https://wexo.netlify.app/?video=${selectedVideo?.id}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  const [loadingComments, setLoadingComments] = useState(false);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [showDateTooltip, setShowDateTooltip] = useState(false);
  const [selectedTag, setSelectedTag] = useState('Tout');

  const tags = ['Tout', 'Jeux vidéo', 'Récent', 'Nouveautés', 'Animation', 'Musique'];

  useEffect(() => {
    fetchVideos();
  }, []);

  const fetchVideos = async () => {
    setLoading(true);
    try {
      let resultList;
      try {
        // Tentative avec filtre et expansion
        resultList = await pb.collection('videos').getList(1, 40, {
          sort: '-created',
          expand: 'author,user_id,creator_id',
          filter: 'is_short != true'
        });
      } catch (err) {
        console.warn('Filtre ou expansion VideoTab échoué, essai simple:', err);
        // Fallback sans filtre strict si la structure diffère
        resultList = await pb.collection('videos').getList(1, 50, {
          sort: '-created',
          expand: 'author,user_id,creator_id'
        });
      }

      const formattedVideos = resultList.items
        .filter(v => {
          // Filtrage manuel si le filtre serveur a échoué
          if (v.is_short === true) return false;
          return true;
        })
        .map(v => {
          const author = v.expand?.author || v.expand?.user_id || v.expand?.creator_id;
          return {
            id: v.id,
            title: v.title,
            description: v.description,
            url: v.video_url || v.url,
            thumbnail_url: v.thumbnail_url,
            creator_id: v.author || v.user_id || v.creator_id,
            creator_name: author?.username || 'Utilisateur',
            creator_display_name: author?.name || author?.username || 'Utilisateur',
            creator_avatar: author?.avatar_url || DEFAULT_AVATAR,
            creator_is_verified: author?.is_verified || false,
            views: Number(v.views) || 0,
            likes: Number(v.likes) || 0,
            is_short: v.is_short,
            created_at: v.created
          };
        });

      setVideos(formattedVideos as any);
    } catch (err) {
      console.error('Error fetching videos completely failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchVideoById = async (id: string) => {
    try {
      const record = await pb.collection('videos').getOne(id, {
        expand: 'author'
      });
      const author = record.expand?.author;
      const video = {
        id: record.id,
        title: record.title,
        description: record.description,
        url: record.video_url,
        thumbnail_url: record.thumbnail_url,
        creator_id: record.author,
        creator_name: author?.username || 'Utilisateur',
        creator_display_name: author?.name || author?.username || 'Utilisateur',
        creator_avatar: author?.avatar_url || DEFAULT_AVATAR,
        creator_is_verified: author?.is_verified || false,
        views: record.views || 0,
        likes: record.likes || 0,
        is_short: record.is_short,
        created_at: record.created
      };
      setSelectedVideo(video as any);
      return video;
    } catch (err) {
      console.error('Error fetching video by id:', err);
      return null;
    }
  };

  useEffect(() => {
    if (selectedVideo) {
      // Update URL when video is selected
      const url = new URL(window.location.href);
      url.searchParams.set('video', selectedVideo.id);
      window.history.pushState({}, '', url);
      fetchVideoData();
      incrementViews(selectedVideo.id);
    } else {
      // Clear video param when closing player
      const url = new URL(window.location.href);
      url.searchParams.delete('video');
      window.history.pushState({}, '', url);
    }
  }, [selectedVideo]);

  const formatRelativeDate = (dateString: any) => {
    if (!dateString) return "il y a quelques instants";
    const date = dateString.toDate ? dateString.toDate() : new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return `il y a ${diffInSeconds} secondes`;
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return `il y a ${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''}`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `il y a ${diffInHours} heure${diffInHours > 1 ? 's' : ''}`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 30) return `il y a ${diffInDays} jour${diffInDays > 1 ? 's' : ''}`;
    const diffInMonths = Math.floor(diffInDays / 30);
    if (diffInMonths < 12) return `il y a ${diffInMonths} mois`;
    const diffInYears = Math.floor(diffInMonths / 12);
    return `il y a ${diffInYears} an${diffInYears > 1 ? 's' : ''}`;
  };

  const formatAbsoluteDate = (dateString: any) => {
    if (!dateString) return "";
    const date = dateString.toDate ? dateString.toDate() : new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const copyId = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const fetchVideoData = async () => {
    if (!selectedVideo) return;
    const userId = user?.id || user?.uid;
    setLoadingComments(true);

    try {
      const collection = selectedVideo.is_short ? 'shorts' : 'videos';
      
      // 1. Compter le nombre réel de likes
      const likesCountRes = await pb.collection('likes').getList(1, 1, {
        filter: `video_id="${selectedVideo.id}"`,
        fields: 'id'
      }).catch(() => ({ totalItems: 0 }));
      setLikeCount(likesCountRes.totalItems);

      // 2. Compter le nombre réel de vues
      const viewsCountRes = await pb.collection('views').getList(1, 1, {
        filter: `video_id="${selectedVideo.id}"`,
        fields: 'id'
      }).catch(() => ({ totalItems: 0 }));
      const currentViewsCount = viewsCountRes.totalItems;

      if (userId) {
        const likeRecord = await pb.collection('likes').getFirstListItem(`user_id="${userId}" && video_id="${selectedVideo.id}"`).catch(() => null);
        setHasLiked(!!likeRecord);
        
        const subRecord = await pb.collection('subscriptions').getFirstListItem(`follower_id="${userId}" && following_id="${selectedVideo.creator_id}"`).catch(() => null);
        setIsSubscribed(!!subRecord);
      }

      // Charger les commentaires
      const commentsRecords = await pb.collection('comments').getList(1, 50, {
        filter: `video_id="${selectedVideo.id}"`,
        sort: '-created',
        expand: 'user_id'
      });

      const formattedComments = commentsRecords.items.map(record => ({
        id: record.id,
        user_id: record.user_id,
        username: record.expand?.user_id?.username || 'Utilisateur',
        display_name: record.expand?.user_id?.name || record.expand?.user_id?.username,
        avatar_url: record.expand?.user_id?.avatar ? pb.getFileUrl(record.expand.user_id, record.expand.user_id.avatar) : DEFAULT_AVATAR,
        content: record.content,
        created_at: record.created,
        likes: record.likes || 0
      }));

      setComments(formattedComments as any);
    } catch (err) {
      console.error('Error fetching video data:', err);
    } finally {
      setLoadingComments(false);
    }
  };

  const handleSubscribe = async () => {
    // Migration NAS
  };

  // Cache local pour les vues
  const viewedVideos = useRef<Set<string>>(new Set());

  const incrementViews = async (videoId: string) => {
    if (viewedVideos.current.has(videoId)) return;
    viewedVideos.current.add(videoId);

    try {
      // On crée l'enregistrement de vue
      await pb.collection('views').create({ 
        user_id: user?.id || user?.uid || "anonymous", 
        video_id: videoId, 
        count: 1 
      }).catch(() => {});
      
      // On rafraîchit les données si c'est la vidéo sélectionnée
      if (selectedVideo?.id === videoId) {
        fetchVideoData();
      }
    } catch (err) {
      console.warn('Error incrementing views:', err);
    }
  };

  const handleLike = async (e: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!selectedVideo || !user || isLikeProcessing.current) return;
    
    isLikeProcessing.current = true;
    const userId = user.id || user.uid;
    const isShort = !!selectedVideo.is_short;
    const collection = isShort ? 'shorts' : 'videos';

    try {
      // 1. Vérification réelle sur le serveur pour éviter les doublons (demande utilisateur)
      const existingLike = await pb.collection('likes').getFirstListItem(`user_id="${userId}" && video_id="${selectedVideo.id}"`).catch(() => null);
      const isActuallyLiked = !!existingLike;
      
      const prevHasLiked = hasLiked;
      
      // Si on veut liker
      if (!prevHasLiked) {
        if (isActuallyLiked) {
          // Déjà liké sur le serveur, on synchronise juste l'UI
          setHasLiked(true);
        } else {
          // Création propre
          await pb.collection('likes').create({ user_id: userId, video_id: selectedVideo.id });
          // PLUS DE MISE À JOUR DU CHAMP LIKES
          setHasLiked(true);
          setLikeCount(prev => prev + 1);
        }
      } 
      // Si on veut retirer le like
      else {
        if (isActuallyLiked) {
          await pb.collection('likes').delete(existingLike.id);
          // PLUS DE MISE À JOUR DU CHAMP LIKES
          setHasLiked(false);
          setLikeCount(prev => Math.max(0, prev - 1));
        } else {
          // Déjà retiré sur le serveur
          setHasLiked(false);
        }
      }
    } catch (err) {
      console.error('Error handling like:', err);
      // Re-synchronisation globale en cas d'erreur
      fetchVideoData();
    } finally {
      isLikeProcessing.current = false;
    }
  };

  const handlePostComment = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedVideo || !user || !newComment.trim()) return;
    const userId = user.id || user.uid;
    setIsPostingComment(true);
    try {
      const record = await pb.collection('comments').create({
        user_id: userId,
        video_id: selectedVideo.id,
        content: newComment
      });

      const newCommentObj: Comment = {
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
      console.error("Erreur lors du postage du commentaire:", err);
    } finally {
      setIsPostingComment(false);
    }
  };

  const handleCommentLike = async (commentId: string) => {
    // Migration NAS
  };

  const filteredVideos = videos.filter(v => {
    const matchesSearch = v.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         v.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (selectedTag === 'Tout') return matchesSearch;
    
    const videoCategories = v.categories || [];
    return matchesSearch && videoCategories.includes(selectedTag);
  });

  return (
    <div className="w-full animate-in fade-in duration-700">
      {selectedVideo ? (
        /* Vue Lecture Vidéo (Style YouTube) */
        <div className="flex flex-col lg:flex-row gap-8 pb-20">
          {/* Colonne Principale (Gauche) */}
          <div className="flex-1 min-w-0">
            {/* Bouton Retour déplacé en dehors du rectangle */}
            <button 
              onClick={() => setSelectedVideo(null)}
              className="mb-6 flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg transition-all border border-white/10 group active:scale-95"
            >
              <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
              <span className="text-xs font-bold">Retour</span>
            </button>

            {/* Lecteur Vidéo - Format Rectangle (16:9) */}
            <div className="relative aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl group mb-3 border border-white/10">
              <VideoPlayer 
                src={selectedVideo.url} 
                videoId={selectedVideo.id}
                userId={user?.id || user?.uid}
                transcription={selectedVideo.transcription}
                className="w-full h-full"
              />
            </div>

            {/* Titre et Infos */}
            <div className="space-y-2">
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-tight">
                {renderTextWithEmojis(selectedVideo.title)}
              </h1>

              {selectedVideo.type && (
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 bg-white/10 text-white text-[10px] font-bold rounded-md">
                    {selectedVideo.type}
                  </span>
                  {selectedVideo.name_of_type && (
                    <span className="text-xs font-bold text-slate-400">
                      • {selectedVideo.name_of_type}
                    </span>
                  )}
                </div>
              )}

              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full border border-white/10 overflow-hidden">
                    <img src={selectedVideo.creator_avatar || DEFAULT_AVATAR} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" />
                  </div>
                  <div className="mr-4">
                    <div className="flex flex-col">
                      <Username 
                        username={selectedVideo.creator_name || 'Utilisateur'} 
                        displayName={selectedVideo.creator_display_name}
                        isVerified={selectedVideo.creator_is_verified} 
                        isAdmin={selectedVideo.creator_role === 'admin'}
                        email={selectedVideo.creator_email}
                        className="text-sm font-bold text-white" 
                        badgeSize={14} 
                      />
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <p className="text-[10px] font-bold text-slate-500">{subscriberCount} abonné{subscriberCount > 1 ? 's' : ''}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {user && (user.uid === selectedVideo.creator_id || user.id === selectedVideo.creator_id) ? (
                      <button 
                        onClick={() => onTabChange('ma-chaine')}
                        className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-[12px] font-bold rounded-2xl transition-all"
                      >
                        Gérer les vidéos
                      </button>
                    ) : (
                    <button 
                      onClick={handleSubscribe}
                      className={`px-4 py-2 rounded-2xl text-[14px] font-bold transition-all active:scale-95 ${isSubscribed ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-white text-black hover:bg-slate-200'}`}
                    >
                      {isSubscribed ? 'Abonné' : "S'abonner"}
                    </button>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 pb-2 md:pb-0">
                  <button 
                    onClick={handleLike}
                    className={`flex items-center gap-2 px-6 py-2 rounded-full transition-all text-[14px] font-bold active:scale-90 ${hasLiked ? 'bg-white text-black' : 'bg-white/10 text-white hover:bg-white/20'}`}
                  >
                    <Heart size={20} fill={hasLiked ? "currentColor" : "none"} className={hasLiked ? "text-red-500" : "text-slate-400"} /> 
                    {likeCount}
                  </button>
                  
                  <div className="relative">
                    <button 
                      onClick={handleShare}
                      className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-[12px] font-bold rounded-2xl transition-all whitespace-nowrap"
                    >
                      <Share2 size={18} /> Partager
                    </button>
                    
                    {showSharePopup && (
                      <div ref={sharePopupRef} className="absolute bottom-full mb-4 right-0 md:right-auto md:left-1/2 md:-translate-x-1/2 w-72 sm:w-80 bg-[#1a1a1a] border border-white/10 rounded-2xl p-5 shadow-[0_20px_50px_rgba(0,0,0,0.5)] animate-in fade-in slide-in-from-bottom-4 duration-300 z-50">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="text-sm font-bold text-white tracking-tight">Partager la vidéo</h4>
                          <button onClick={() => setShowSharePopup(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors">
                            <X size={18} />
                          </button>
                        </div>
                        <div className="space-y-4">
                          <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl p-3 group hover:border-white/20 transition-all">
                            <input 
                              type="text" 
                              readOnly 
                              value={`https://wexo.netlify.app/?video=${selectedVideo.id}`}
                              className="bg-transparent text-xs text-slate-400 outline-none flex-1 truncate font-medium"
                            />
                            <button 
                              onClick={copyToClipboard}
                              className="w-10 h-10 bg-white text-black rounded-2xl hover:bg-slate-200 transition-all active:scale-95 flex items-center justify-center shadow-lg flex-shrink-0"
                              title={copied ? "Copié !" : "Copier le lien"}
                            >
                              {copied ? <Check size={18} className="text-emerald-600" /> : <Copy size={18} />}
                            </button>
                          </div>
                          <p className="text-[10px] text-slate-500 font-bold text-center">Lien direct vers Wexo</p>
                        </div>
                        {/* Arrow */}
                        <div className="absolute top-full right-6 md:right-auto md:left-1/2 md:-translate-x-1/2 border-8 border-transparent border-t-[#1a1a1a]"></div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Description Box */}
              <div 
                onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                className="bg-white/5 hover:bg-white/10 transition-colors rounded-2xl p-3 mt-4 cursor-pointer"
              >
                <div className="flex items-center gap-2 text-sm font-bold text-white mb-1">
                  <span>{selectedVideo.views.toLocaleString()} vues</span>
                  <div className="relative">
                    <span 
                      onMouseEnter={() => setShowDateTooltip(true)}
                      onMouseLeave={() => setShowDateTooltip(false)}
                      className="hover:underline"
                    >
                      {formatRelativeDate(selectedVideo.created_at)}
                    </span>
                    
                    {showDateTooltip && (
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-[#616161] text-white text-[12px] rounded-2xl whitespace-nowrap z-50 shadow-xl">
                        {formatAbsoluteDate(selectedVideo.created_at)}
                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-[#616161]"></div>
                      </div>
                    )}
                  </div>
                </div>
                <p className={`text-sm text-slate-300 leading-relaxed whitespace-pre-wrap ${!isDescriptionExpanded ? 'line-clamp-[7]' : ''}`}>
                  {renderTextWithEmojis(selectedVideo.description || "Aucune description fournie.")}
                </p>
                {selectedVideo.description && selectedVideo.description.length > 0 && (
                  <button className="mt-2 text-sm font-bold text-white hover:text-slate-400 transition-colors">
                    {isDescriptionExpanded ? 'Moins' : 'Plus'}
                  </button>
                )}
              </div>

              {/* Commentaires */}
              <div className="mt-8 space-y-6">
                <div className="flex items-center gap-4 mb-8">
                  <h3 className="text-lg font-bold text-white tracking-tight">{comments.length} commentaires</h3>
                  <button className="flex items-center gap-2 text-xs font-bold text-white">
                    <TrendingUp size={14} /> Trier par
                  </button>
                </div>

                {/* Input Commentaire */}
                <div className="flex gap-4 mb-10">
                  <img 
                    src={profile?.avatar_url || DEFAULT_AVATAR} 
                    className="w-10 h-10 rounded-full border border-white/10 flex-shrink-0" 
                    alt=""
                    referrerPolicy="no-referrer"
                  />
                  <div className="flex-1">
                    {user ? (
                      <form onSubmit={handlePostComment} className="relative group">
                        <input 
                          type="text" 
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          placeholder="Ajouter un commentaire..."
                          className="w-full bg-transparent border-b border-white/10 py-2 text-sm text-white outline-none focus:border-white/30 transition-all"
                        />
                        <div className="flex justify-end gap-2 mt-2 opacity-0 group-focus-within:opacity-100 transition-opacity">
                          <button 
                            type="button" 
                            onClick={() => setNewComment('')}
                            className="px-4 py-2 text-xs font-bold text-slate-400 hover:bg-white/5 rounded-2xl"
                          >
                            Annuler
                          </button>
                          <button 
                            type="submit"
                            disabled={!newComment.trim()}
                            className="px-4 py-2 bg-white disabled:bg-white/20 text-black text-xs font-bold rounded-2xl shadow-lg"
                          >
                            Commenter
                          </button>
                        </div>
                      </form>
                    ) : (
                      <p className="text-xs text-slate-500 italic py-2">Connectez-vous pour commenter</p>
                    )}
                  </div>
                </div>

                {/* Liste des commentaires */}
                <div className="space-y-8">
                  {loadingComments ? (
                    <div className="flex justify-center py-10"><Loader2 className="animate-spin text-white" /></div>
                  ) : comments.length > 0 ? (
                    comments.map(comment => (
                      <div key={comment.id} className="flex gap-4 group">
                        <div className="w-10 h-10 rounded-full flex-shrink-0 border border-white/10 overflow-hidden">
                          <img src={comment.avatar_url || DEFAULT_AVATAR} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Username 
                              username={comment.username} 
                              displayName={comment.display_name}
                              isVerified={comment.user_is_verified} 
                              className={`text-xs font-bold ${comment.user_id === selectedVideo.creator_id ? 'bg-white text-black px-2 py-0.5 rounded-md' : 'text-white'}`}
                              badgeSize={10}
                            />
                            <span className="text-[10px] font-medium text-slate-500">{formatRelativeDate(comment.created_at)}</span>
                          </div>
                          <p className="text-sm text-slate-300 leading-relaxed mb-3">{renderTextWithEmojis(comment.content)}</p>
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-1">
                              <button 
                                onClick={() => handleCommentLike(comment.id)}
                                className={`p-1.5 rounded-full transition-colors ${comment.hasLiked ? 'bg-red-500/10 text-red-500' : 'hover:bg-white/5 text-slate-500'}`}
                              >
                                <Heart size={14} fill={comment.hasLiked ? "currentColor" : "none"} />
                              </button>
                              <span className={`text-[10px] font-bold ${comment.hasLiked ? 'text-red-500' : 'text-slate-500'}`}>
                                {comment.likes || 0}
                              </span>
                            </div>
                            <button className="text-[10px] font-bold text-white hover:bg-white/5 px-3 py-1.5 rounded-2xl transition-all">
                              Répondre
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-10 opacity-30">
                      <MessageCircle size={40} className="mx-auto mb-4 text-white" />
                      <p className="text-xs font-bold text-white">Aucun commentaire pour le moment</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Colonne Latérale (Droite) - Vidéos Recommandées */}
          <div className="w-full lg:w-[400px] space-y-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold text-slate-500">Vidéos suggérées</h3>
              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
                {['Tout', 'De la série', 'Similaires'].map((tag, i) => (
                  <button 
                    key={tag} 
                    className={`flex-shrink-0 px-3 py-1 rounded-2xl text-[10px] font-bold transition-all ${i === 0 ? 'bg-[#272727] text-white' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              {videos.filter(v => v.id !== selectedVideo.id).map((video) => (
                <div 
                  key={video.id} 
                  onClick={() => {
                    setSelectedVideo(video);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="flex gap-3 group cursor-pointer p-2 -m-2 rounded-2xl hover:bg-white/5 transition-all duration-300"
                >
                  <div className="relative w-40 h-24 flex-shrink-0 rounded-2xl overflow-hidden bg-white/5 border border-white/10">
                    <img src={video.thumbnail_url || undefined} className="w-full h-full object-cover transition-transform duration-500" alt="" />
                    <div className="absolute bottom-1 right-1 bg-black/80 px-1 py-0.5 rounded-2xl text-[9px] font-bold text-white z-20">
                      12:34
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-bold text-white line-clamp-2 leading-snug mb-1 group-hover:text-white transition-colors">
                      {renderTextWithEmojis(video.title)}
                    </h4>
                    <p className="text-[10px] font-medium text-slate-500 mb-0.5 flex items-center gap-1">
                      {video.creator_name}
                      <Sparkles size={8} className="text-slate-500" />
                    </p>
                    <div className="flex items-center gap-1 text-[9px] font-medium text-slate-500">
                      <span>{video.views} vues</span>
                      <span>•</span>
                      <span>il y a 1 an</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* Liste des Vidéos (Grille) */
        <div className="space-y-10">
          {/* Header spécifique à l'onglet Vidéo */}
          <div className="mb-8 animate-in slide-in-from-left duration-700">
            <h1 className="text-3xl sm:text-5xl font-black capitalize text-white tracking-tighter leading-none mb-3">
              Vidéos
            </h1>
          </div>

          {/* Barre de recherche Vidéo */}
          <div className="space-y-6">
            <div className="relative group w-full max-w-2xl mx-auto">
              <div className="relative">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-white transition-colors" size={20} />
                <input 
                  type="text" 
                  placeholder="Rechercher une vidéo..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 pl-14 pr-6 text-sm focus:outline-none focus:ring-2 focus:ring-white/10 text-white transition-all shadow-xl"
                />
              </div>
            </div>

            {/* Tags */}
            <div className="flex gap-2 overflow-x-auto no-scrollbar py-2 px-1 max-w-3xl mx-auto justify-start sm:justify-center">
              {tags.map((tag) => (
                <button 
                  key={tag} 
                  onClick={() => setSelectedTag(tag)}
                  className={`flex-shrink-0 px-5 py-2 rounded-2xl text-xs font-bold transition-all active:scale-95 ${selectedTag === tag ? 'bg-white text-black' : 'bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10'}`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="text-white animate-spin" size={40} />
            </div>
          ) : filteredVideos.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredVideos.map((video) => (
                <div 
                  key={video.id} 
                  onClick={() => setSelectedVideo(video)}
                  className="group bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:bg-white/10 hover:border-white/30 transition-all duration-300 cursor-pointer shadow-sm p-1"
                >
                  <div className="relative aspect-video overflow-hidden rounded-xl">
                    <img src={video.thumbnail_url || undefined} alt={video.title} className="w-full h-full object-cover transition-transform duration-700" />
                  </div>
                  <div className="p-3">
                    <div className="flex gap-3">
                      <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0 border border-white/10">
                        <img src={video.creator_avatar || DEFAULT_AVATAR} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" />
                      </div>
                      <div className="flex-1 min-0">
                        <h4 className="text-white font-bold text-sm mb-1 line-clamp-2 leading-tight">{renderTextWithEmojis(video.title)}</h4>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Username 
                            username={video.creator_name || 'Utilisateur'} 
                            displayName={video.creator_display_name}
                            isVerified={video.creator_is_verified} 
                            className="text-slate-400 text-xs font-bold" 
                            badgeSize={10} 
                          />
                          <span className="text-slate-700 text-[9px]">•</span>
                          <span className="text-xs font-bold text-slate-500">{video.views} vues</span>
                          <span className="text-slate-700 text-[9px]">•</span>
                          <span className="text-xs font-bold text-slate-500">{formatRelativeDate(video.created_at)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* État vide optimisé */
            <div className="relative group overflow-hidden bg-white/5 border-2 border-white/10 rounded-2xl py-16 flex flex-col items-center justify-center text-center px-6 shadow-inner">
              
              <div className="relative z-10 mb-8">
                  <div className="w-20 h-20 bg-white/5 rounded-2xl flex items-center justify-center text-slate-700 shadow-2xl border border-white/10 group-hover:border-white/30 transition-colors">
                      <PlayCircle size={44} className="text-slate-600 group-hover:text-white transition-colors" />
                  </div>
                  <div className="absolute -top-1 -right-1 w-9 h-9 bg-white rounded-2xl flex items-center justify-center text-black shadow-lg">
                      <Zap size={16} fill="black" />
                  </div>
              </div>
              
              <div className="relative z-10 max-w-lg">
                  <h3 className="text-3xl font-bold text-white mb-3 tracking-tighter leading-none">Wexo Vidéo</h3>
                  <p className="text-slate-400 text-sm leading-relaxed font-medium mb-10 max-w-xs mx-auto">
                      Il n'y a aucune vidéo pour le moment, cliquer si dessous pour poster votre propre vidéo
                  </p>
                  
                  <button 
                    onClick={onBecomeCreator}
                    className="bg-white text-black hover:bg-slate-200 font-bold text-xs px-10 py-5 rounded-2xl shadow-2xl transition-all active:scale-95 flex items-center gap-3 mx-auto"
                  >
                      <MovieCameraIcon size={18} /> Devenir Créateur
                  </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default VideoTab;
