
import React, { useState, useEffect } from 'react';
import { Search, Zap, TrendingUp, Tv, PlayCircle, Sparkles, Loader2, Play, Heart, MessageCircle, Send, X, Plus, Volume2, VolumeX, Copy, Check, ThumbsUp, ThumbsDown, Share2 } from 'lucide-react';
import { supabase } from '../services/supabase';
import { Video } from '../types';

interface Comment {
  id: string;
  username: string;
  avatar_url: string;
  content: string;
  created_at: string;
}

interface VideoTabProps {
  onBecomeCreator: () => void;
  user?: any;
  profile?: any;
}

const VideoTab: React.FC<VideoTabProps> = ({ onBecomeCreator, user, profile }) => {
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
  const [copied, setCopied] = useState(false);
  const [loadingComments, setLoadingComments] = useState(false);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [showDateTooltip, setShowDateTooltip] = useState(false);

  const tags = ['Tout', 'Design', 'Code', 'Gaming', 'Musique', 'Shorts'];

  useEffect(() => {
    fetchVideos();
  }, []);

  useEffect(() => {
    if (selectedVideo) {
      fetchVideoData();
      incrementViews(selectedVideo.id);
    }
  }, [selectedVideo]);

  const formatRelativeDate = (dateString: string) => {
    if (!dateString) return "il y a quelques instants";
    const date = new Date(dateString);
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

  const formatAbsoluteDate = (dateString: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const fetchVideos = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('videos')
      .select('*')
      .eq('is_short', false)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching videos:', error);
    } else {
      setVideos(data || []);
    }
    setLoading(false);
  };

  const fetchVideoData = async () => {
    if (!selectedVideo) return;
    setLoadingComments(true);

    // Fetch Comments
    const { data: commentsData } = await supabase
      .from('video_comments')
      .select('*')
      .eq('video_id', selectedVideo.id)
      .order('created_at', { ascending: false });
    
    setComments(commentsData || []);

    // Fetch Likes
    const { count } = await supabase
      .from('video_likes')
      .select('*', { count: 'exact', head: true })
      .eq('video_id', selectedVideo.id);
    
    setLikeCount(count || 0);

    // Fetch Subscriber Count
    const { count: subCount } = await supabase
      .from('subscriptions')
      .select('*', { count: 'exact', head: true })
      .eq('creator_id', selectedVideo.creator_id);
    
    setSubscriberCount(subCount || 0);

    // Check if user liked & subscribed
    if (user) {
      const { data: userLike } = await supabase
        .from('video_likes')
        .select('*')
        .eq('video_id', selectedVideo.id)
        .eq('user_id', user.id)
        .single();
      
      setHasLiked(!!userLike);

      const { data: userSub } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('follower_id', user.id)
        .eq('creator_id', selectedVideo.creator_id)
        .single();
      
      setIsSubscribed(!!userSub);
    }
    setLoadingComments(false);
  };

  const handleSubscribe = async () => {
    if (!user || !selectedVideo || user.id === selectedVideo.creator_id) return;

    if (isSubscribed) {
      await supabase.from('subscriptions').delete().match({ follower_id: user.id, creator_id: selectedVideo.creator_id });
      setIsSubscribed(false);
      setSubscriberCount(prev => prev - 1);
    } else {
      await supabase.from('subscriptions').insert([{ follower_id: user.id, creator_id: selectedVideo.creator_id }]);
      setIsSubscribed(true);
      setSubscriberCount(prev => prev + 1);
    }
  };

  const handleShare = () => {
    setShowSharePopup(!showSharePopup);
    setCopied(false);
  };

  const copyToClipboard = () => {
    const url = `${window.location.origin}/?video=${selectedVideo?.id}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const incrementViews = async (videoId: string) => {
    await supabase.rpc('increment_video_views', { video_id: videoId });
  };

  const handleLike = async () => {
    if (!user || !selectedVideo) return;

    if (hasLiked) {
      await supabase.from('video_likes').delete().match({ video_id: selectedVideo.id, user_id: user.id });
      setLikeCount(prev => prev - 1);
      setHasLiked(false);
    } else {
      await supabase.from('video_likes').insert([{ video_id: selectedVideo.id, user_id: user.id }]);
      setLikeCount(prev => prev + 1);
      setHasLiked(true);
    }
  };

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newComment.trim() || !selectedVideo) return;

    const comment = {
      video_id: selectedVideo.id,
      user_id: user.id,
      username: profile?.username || user.email?.split('@')[0],
      avatar_url: profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`,
      content: newComment
    };

    const { data, error } = await supabase.from('video_comments').insert([comment]).select().single();

    if (!error && data) {
      setComments(prev => [data, ...prev]);
      setNewComment('');
    }
  };

  const filteredVideos = videos.filter(v => 
    v.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    v.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-full animate-in fade-in duration-700">
      {selectedVideo ? (
        /* Vue Lecture Vidéo (Style YouTube) */
        <div className="flex flex-col lg:flex-row gap-8 pb-20">
          {/* Colonne Principale (Gauche) */}
          <div className="flex-1 min-w-0">
            {/* Lecteur Vidéo - Format Rectangle (16:9) */}
            <div className="relative aspect-video bg-black rounded-xl overflow-hidden shadow-2xl group mb-6 border border-white/5">
              <video 
                src={selectedVideo.url} 
                controls 
                autoPlay
                className="w-full h-full object-contain"
              />
              <button 
                onClick={() => setSelectedVideo(null)}
                className="absolute top-4 left-4 z-10 p-2 bg-black/60 hover:bg-white hover:text-black text-white rounded-full backdrop-blur-md transition-all opacity-0 group-hover:opacity-100 flex items-center gap-2 px-3"
              >
                <X size={16} />
                <span className="text-[10px] font-black uppercase tracking-widest">Retour</span>
              </button>
            </div>

            {/* Titre et Infos */}
            <div className="space-y-4">
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-tight">
                {selectedVideo.title}
              </h1>

              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <img 
                      src={selectedVideo.creator_avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedVideo.creator_id}`} 
                      className="w-10 h-10 rounded-full border border-white/10" 
                      alt="" 
                    />
                  </div>
                  <div className="mr-4">
                    <p className="text-sm font-black text-white flex items-center gap-1">
                      {selectedVideo.creator_name}
                    </p>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{subscriberCount} abonné{subscriberCount > 1 ? 's' : ''}</p>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {user && user.id === selectedVideo.creator_id ? (
                      <button 
                        className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-[12px] font-bold rounded-full transition-all"
                      >
                        Gérer les vidéos
                      </button>
                    ) : (
                    <button 
                      onClick={handleSubscribe}
                      className={`px-4 py-2 rounded-full text-[14px] font-bold transition-all active:scale-95 ${isSubscribed ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-white text-black hover:bg-slate-200'}`}
                    >
                      {isSubscribed ? 'Abonné' : "S'abonner"}
                    </button>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2 md:pb-0">
                  <button 
                    onClick={handleLike}
                    className={`flex items-center gap-2 px-6 py-2 rounded-full transition-all text-[14px] font-bold active:scale-90 ${hasLiked ? 'bg-white text-black' : 'bg-white/10 text-white hover:bg-white/20'}`}
                  >
                    <Heart size={20} fill={hasLiked ? "currentColor" : "none"} className={hasLiked ? "text-red-500" : "text-white"} /> 
                    {likeCount}
                  </button>
                  
                  <div className="relative">
                    <button 
                      onClick={handleShare}
                      className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-[12px] font-bold rounded-full transition-all whitespace-nowrap"
                    >
                      <Share2 size={18} /> Partager
                    </button>
                    
                    {showSharePopup && (
                      <div className="absolute bottom-full mb-4 right-0 w-80 bg-[#282828] border border-white/10 rounded-xl p-4 shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-300 z-50">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="text-sm font-bold text-white">Partager</h4>
                          <button onClick={() => setShowSharePopup(false)} className="text-slate-400 hover:text-white">
                            <X size={20} />
                          </button>
                        </div>
                        <div className="flex items-center gap-3 bg-black/40 border border-white/10 rounded-lg p-3">
                          <input 
                            type="text" 
                            readOnly 
                            value={`${window.location.origin}/?video=${selectedVideo.id}`}
                            className="bg-transparent text-xs text-slate-300 outline-none flex-1 truncate"
                          />
                          <button 
                            onClick={copyToClipboard}
                            className="px-4 py-1.5 bg-sky-500 text-white text-xs font-bold rounded-full hover:bg-sky-400 transition-colors flex items-center gap-2"
                          >
                            {copied ? <><Check size={14} /> Copié</> : 'Copier'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <button className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-[12px] font-bold rounded-full transition-all whitespace-nowrap">
                    <Plus size={18} /> Enregistrer
                  </button>
                </div>
              </div>

              {/* Description Box */}
              <div 
                onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                className="bg-white/5 hover:bg-white/10 transition-colors rounded-xl p-3 mt-4 cursor-pointer"
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
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-[#616161] text-white text-[12px] rounded-md whitespace-nowrap z-50 shadow-xl">
                        {formatAbsoluteDate(selectedVideo.created_at)}
                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-[#616161]"></div>
                      </div>
                    )}
                  </div>
                </div>
                <p className={`text-sm text-white leading-relaxed whitespace-pre-wrap ${!isDescriptionExpanded ? 'line-clamp-[7]' : ''}`}>
                  {selectedVideo.description || "Aucune description fournie."}
                </p>
                {selectedVideo.description && selectedVideo.description.length > 0 && (
                  <button className="mt-2 text-sm font-bold text-white hover:text-slate-300 transition-colors">
                    {isDescriptionExpanded ? 'Moins' : 'Plus'}
                  </button>
                )}
              </div>

              {/* Commentaires */}
              <div className="mt-8 space-y-6">
                <div className="flex items-center gap-4 mb-8">
                  <h3 className="text-lg font-black text-white tracking-tight">{comments.length} commentaires</h3>
                  <button className="flex items-center gap-2 text-[10px] font-black text-white uppercase tracking-widest">
                    <TrendingUp size={14} /> Trier par
                  </button>
                </div>

                {/* Input Commentaire */}
                <div className="flex gap-4 mb-10">
                  <img 
                    src={profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.id || 'guest'}`} 
                    className="w-10 h-10 rounded-full border border-white/10 flex-shrink-0" 
                    alt="" 
                  />
                  <div className="flex-1">
                    {user ? (
                      <form onSubmit={handlePostComment} className="relative group">
                        <input 
                          type="text" 
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          placeholder="Ajouter un commentaire..."
                          className="w-full bg-transparent border-b border-white/10 py-2 text-sm text-white outline-none focus:border-white transition-all"
                        />
                        <div className="flex justify-end gap-2 mt-2 opacity-0 group-focus-within:opacity-100 transition-opacity">
                          <button 
                            type="button" 
                            onClick={() => setNewComment('')}
                            className="px-4 py-2 text-[10px] font-black text-white uppercase tracking-widest hover:bg-white/10 rounded-full"
                          >
                            Annuler
                          </button>
                          <button 
                            type="submit"
                            disabled={!newComment.trim()}
                            className="px-4 py-2 bg-sky-500 disabled:bg-slate-800 text-white text-[10px] font-black uppercase tracking-widest rounded-full shadow-lg shadow-sky-500/20"
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
                    <div className="flex justify-center py-10"><Loader2 className="animate-spin text-sky-500" /></div>
                  ) : comments.length > 0 ? (
                    comments.map(comment => (
                      <div key={comment.id} className="flex gap-4 group">
                        <img src={comment.avatar_url || undefined} className="w-10 h-10 rounded-full flex-shrink-0 border border-white/10" alt="" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[11px] font-black text-white">@{comment.username}</span>
                            <span className="text-[10px] font-medium text-slate-500">il y a 1 heure</span>
                          </div>
                          <p className="text-sm text-slate-300 leading-relaxed mb-3">{comment.content}</p>
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-1">
                              <button className="p-1.5 hover:bg-white/10 rounded-full transition-colors">
                                <Heart size={14} className="text-slate-500" />
                              </button>
                              <span className="text-[10px] font-bold text-slate-500">12</span>
                              <button className="p-1.5 hover:bg-white/10 rounded-full transition-colors">
                                <TrendingUp size={14} className="text-slate-500 rotate-180" />
                              </button>
                            </div>
                            <button className="text-[10px] font-black text-white uppercase tracking-widest hover:bg-white/10 px-3 py-1.5 rounded-full transition-all">
                              Répondre
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-10 opacity-30">
                      <MessageCircle size={40} className="mx-auto mb-4" />
                      <p className="text-[10px] font-black uppercase tracking-widest">Aucun commentaire pour le moment</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Colonne Latérale (Droite) - Vidéos Recommandées */}
          <div className="w-full lg:w-[400px] space-y-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em]">Vidéos suggérées</h3>
              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
                {['Tout', 'De la série', 'Similaires'].map((tag, i) => (
                  <button 
                    key={tag} 
                    className={`flex-shrink-0 px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all ${i === 0 ? 'bg-white text-black' : 'bg-white/10 text-white hover:bg-white/20'}`}
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
                  className="flex gap-3 group cursor-pointer"
                >
                  <div className="relative w-40 h-24 flex-shrink-0 rounded-xl overflow-hidden bg-slate-900 border border-white/5">
                    <img src={video.thumbnail_url || undefined} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt="" />
                    <div className="absolute bottom-1 right-1 bg-black/80 px-1 py-0.5 rounded text-[9px] font-bold text-white">
                      12:34
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-bold text-white line-clamp-2 leading-snug mb-1 group-hover:text-sky-400 transition-colors">
                      {video.title}
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
            <div className="flex items-center gap-3 mb-1">
                <span className="text-[9px] font-black uppercase tracking-[0.5em] text-sky-500">Flux Wexo</span>
            </div>
            <h1 className="text-3xl sm:text-5xl font-black capitalize text-white tracking-tighter leading-none mb-3">
              Vidéos
            </h1>
            <div className="h-1.5 w-14 bg-sky-500 rounded-full shadow-[0_5px_15px_rgba(56,189,248,0.4)]"></div>
          </div>

          {/* Barre de recherche Vidéo */}
          <div className="space-y-6">
            <div className="relative group w-full max-w-2xl mx-auto">
              <div className="relative">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-sky-400 transition-colors" size={20} />
                <input 
                  type="text" 
                  placeholder="Rechercher une vidéo..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-900/80 border border-slate-800 rounded-2xl py-3.5 pl-14 pr-6 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 text-white transition-all shadow-xl"
                />
              </div>
            </div>

            {/* Tags */}
            <div className="flex gap-2 overflow-x-auto no-scrollbar py-2 px-1 max-w-3xl mx-auto justify-start sm:justify-center">
              {tags.map((tag, i) => (
                <button 
                  key={tag} 
                  className={`flex-shrink-0 px-5 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all active:scale-95 ${i === 0 ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/20' : 'bg-slate-900/50 text-slate-400 border border-slate-800'}`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="text-sky-500 animate-spin" size={40} />
            </div>
          ) : filteredVideos.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredVideos.map((video) => (
                <div 
                  key={video.id} 
                  onClick={() => setSelectedVideo(video)}
                  className="group bg-slate-900/40 border border-slate-800/50 rounded-3xl overflow-hidden hover:border-sky-500/30 transition-all duration-300 cursor-pointer"
                >
                  <div className="relative aspect-video overflow-hidden">
                    <img src={video.thumbnail_url || undefined} alt={video.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="w-12 h-12 bg-white text-black rounded-full flex items-center justify-center transform scale-90 group-hover:scale-100 transition-transform">
                        <Play size={20} fill="black" />
                      </div>
                    </div>
                  </div>
                  <div className="p-5">
                    <div className="flex gap-3">
                      <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0 border border-slate-800">
                        <img src={video.creator_avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${video.creator_id}`} alt="Avatar" className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-white font-bold text-sm mb-1 line-clamp-2 leading-tight">{video.title}</h4>
                        <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">{video.creator_name}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-[9px] font-bold text-slate-600">{video.views} vues</span>
                          <span className="text-slate-800">•</span>
                          <span className="text-[9px] font-bold text-slate-600">Il y a 2 jours</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* État vide optimisé */
            <div className="relative group overflow-hidden bg-slate-900/20 border-2 border-slate-800/40 rounded-[2.5rem] py-16 flex flex-col items-center justify-center text-center px-6 shadow-inner">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-sky-500/5 rounded-full blur-[80px]"></div>
              
              <div className="relative z-10 mb-8">
                  <div className="w-20 h-20 bg-slate-950 rounded-[1.8rem] flex items-center justify-center text-slate-800 shadow-2xl border border-slate-800 group-hover:border-sky-500/50 transition-colors">
                      <PlayCircle size={44} className="text-slate-700 group-hover:text-sky-500 transition-colors" />
                  </div>
                  <div className="absolute -top-1 -right-1 w-9 h-9 bg-sky-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-sky-500/30">
                      <Zap size={16} fill="white" />
                  </div>
              </div>
              
              <div className="relative z-10 max-w-lg">
                  <h3 className="text-3xl font-black text-white mb-3 tracking-tighter leading-none">Wexo Vidéo</h3>
                  <p className="text-slate-400 text-sm leading-relaxed font-medium mb-10 max-w-xs mx-auto">
                      Il n'y a aucune vidéo ou publiez-en vous-même.
                  </p>
                  
                  <div className="flex flex-wrap justify-center gap-4 mb-10">
                      <div className="flex items-center gap-2 bg-slate-950/80 px-4 py-3 rounded-xl border border-slate-800/50 text-[8px] font-black uppercase tracking-widest text-slate-500">
                          <TrendingUp size={12} className="text-emerald-500" /> Intelligent
                      </div>
                      <div className="flex items-center gap-2 bg-slate-950/80 px-4 py-3 rounded-xl border border-slate-800/50 text-[8px] font-black uppercase tracking-widest text-slate-500">
                          <Tv size={12} className="text-sky-500" /> Flux HD
                      </div>
                  </div>
    
                  <button 
                    onClick={onBecomeCreator}
                    className="bg-white text-black hover:bg-sky-500 hover:text-white font-black text-[10px] uppercase tracking-[0.2em] px-10 py-5 rounded-2xl shadow-2xl transition-all active:scale-95 flex items-center gap-3 mx-auto"
                  >
                      <Sparkles size={16} /> Devenir Créateur
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
