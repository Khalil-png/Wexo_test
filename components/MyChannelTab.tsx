
import React, { useState, useEffect } from 'react';
import { Search, Play, Heart, MessageCircle, Share2, Plus, ArrowLeft, Loader2, Sparkles, User as UserIcon, Info, AlertCircle, Upload, Trash2, Edit2, CheckCircle2, Zap } from 'lucide-react';
import { supabase } from '../services/supabase';
import { Video } from '../types';
import { DEFAULT_AVATAR } from '../constants';
import { generateSnowflake } from '../utils/snowflake';

interface MyChannelTabProps {
  user: any;
  profile: any;
}

const MyChannelTab: React.FC<MyChannelTabProps> = ({ user, profile }) => {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Delete modal state
  const [deleteModalStep, setDeleteModalStep] = useState<'confirm' | 'download' | null>(null);
  const [videoToDelete, setVideoToDelete] = useState<Video | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isShort, setIsShort] = useState(false);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  const categories = ['Jeux vidéo', 'Récent', 'Nouveautés', 'Animation', 'Musique'];

  useEffect(() => {
    if (user) {
      fetchMyVideos();
    }
  }, [user]);

  const fetchMyVideos = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('videos')
      .select('*')
      .eq('creator_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching videos:', error);
    } else {
      setVideos(data || []);
    }
    setLoading(false);
  };

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

  const uploadFile = async (file: File, bucket: string) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = fileName;

    // Tentative d'upload
    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, file);

    if (uploadError) {
      console.error(`Erreur Storage dans le bucket ${bucket}:`, uploadError);
      if (uploadError.message.includes('row-level security')) {
        throw new Error(`Le dossier "${bucket}" est verrouillé. Allez dans Supabase -> Storage -> Policies et ajoutez une règle "Full Access" pour tout le monde.`);
      }
      throw uploadError;
    }

    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath);

    return publicUrl;
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !videoFile) return;

    setUploading(true);
    setError(null);
    setSuccess(null);
    
    console.log("Tentative de publication avec RPC bypass_publish_video...");

    try {
      // 1. Upload Video
      console.log("Étape 1: Upload du fichier vidéo...");
      let videoUrl = '';
      try {
        videoUrl = await uploadFile(videoFile, isShort ? 'shorts' : 'videos');
      } catch (err: any) {
        console.error("ERREUR STORAGE VIDEO:", err);
        throw new Error(`[ERREUR STORAGE VIDEO] ${err.message || err}`);
      }
      
      // 2. Upload Thumbnail if exists
      console.log("Étape 2: Upload de la miniature...");
      let finalThumbnailUrl = `https://picsum.photos/seed/${Math.random()}/640/360`;
      if (thumbnailFile) {
        try {
          finalThumbnailUrl = await uploadFile(thumbnailFile, 'thumbnails');
        } catch (err: any) {
          console.error("ERREUR STORAGE THUMBNAIL:", err);
          // On continue si c'est juste la miniature
        }
      }

      // 3. Insert into Database
      console.log("Étape 3: Insertion BDD...");
      const { error: dbError } = await supabase
        .from('videos')
        .insert({
          id: generateSnowflake(),
          title: title || 'Sans titre',
          description: description || '',
          url: videoUrl,
          thumbnail_url: finalThumbnailUrl,
          creator_id: user.id,
          creator_name: profile?.username || user.email?.split('@')[0] || 'Utilisateur',
          creator_avatar: profile?.avatar_url || DEFAULT_AVATAR,
          is_short: isShort,
          views: 0,
          likes: 0,
          categories: selectedCategories
        });

      if (dbError) {
        console.error("ERREUR BDD:", dbError);
        const msg = dbError.message.includes('row-level security')
          ? "ERREUR BDD : Le verrou RLS de la table 'videos' est encore actif. Exécutez le script SQL 'Terre Brûlée'."
          : dbError.message;
        throw new Error(`[ERREUR BDD] ${msg}`);
      }

      setSuccess('Vidéo publiée avec succès !');
      setTitle('');
      setDescription('');
      setVideoFile(null);
      setThumbnailFile(null);
      setSelectedCategories([]);
      setShowUploadModal(false);
      fetchMyVideos();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || "Une erreur est survenue lors de l'envoi.");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    const video = videos.find(v => v.id === id);
    if (!video) return;
    setVideoToDelete(video);
    setDeleteModalStep('confirm');
  };

  const confirmDelete = async () => {
    if (!videoToDelete) return;

    const { error } = await supabase
      .from('videos')
      .delete()
      .eq('id', videoToDelete.id);

    if (error) {
      setError(error.message);
    } else {
      setVideos(videos.filter(v => v.id !== videoToDelete.id));
      setDeleteModalStep(null);
      setVideoToDelete(null);
    }
  };

  const downloadVideo = async () => {
    if (!videoToDelete) return;
    try {
      const response = await fetch(videoToDelete.url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${videoToDelete.title || 'video'}.mp4`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Download failed:', err);
    }
  };

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-6 text-center animate-in fade-in duration-700">
        <div className="text-slate-700 mb-8">
          <Info size={48} />
        </div>
        <h2 className="text-3xl font-black text-white mb-4 tracking-tighter">Connexion requise</h2>
        <p className="text-slate-400 text-sm max-w-sm font-medium leading-relaxed">
          Vous devez être connecté pour pouvoir accéder à votre chaîne et publier des vidéos.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-10 animate-in fade-in duration-700">
      <div className="relative group overflow-hidden bg-white/5 border-2 border-white/10 rounded-3xl p-8 sm:p-12 flex flex-col sm:flex-row items-center gap-8">
        <div className="relative">
          <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full overflow-hidden border-4 border-white/10 shadow-2xl">
            <img 
              src={profile?.avatar_url || DEFAULT_AVATAR} 
              alt="Avatar" 
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        <div className="flex-1 text-center sm:text-left">
          <h2 className="text-3xl sm:text-4xl font-black text-white mb-2 tracking-tighter">
            {profile?.username || user.email?.split('@')[0]}
          </h2>
          <p className="text-slate-400 text-sm font-medium mb-6">
            {videos.length} vidéo{videos.length > 1 ? 's' : ''} • Créateur Wexo
          </p>
          
          <button 
            onClick={() => setShowUploadModal(true)}
            className="bg-white text-black hover:bg-slate-200 font-black text-[10px] uppercase tracking-[0.2em] px-8 py-4 rounded-2xl shadow-xl shadow-white/5 transition-all active:scale-95 flex items-center gap-3 mx-auto sm:mx-0"
          >
            <Plus size={16} /> Publier une vidéo
          </button>
        </div>
      </div>

      {/* Liste des vidéos */}
      <div className="space-y-6">
        <div className="flex items-center justify-between px-2">
          <h3 className="text-xl font-black text-white tracking-tight">Mes Vidéos</h3>
          <div className="h-px flex-1 bg-white/10 mx-6 hidden sm:block"></div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="text-white animate-spin" size={40} />
          </div>
        ) : videos.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center text-center bg-white/5 rounded-[3rem] border-2 border-white/10 border-dashed">
            <Play size={48} className="text-slate-700 mb-4" />
            <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Aucune vidéo publiée</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {videos.map((video) => (
              <div key={video.id} className="group bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:bg-white/10 hover:border-white/30 transition-all duration-300 shadow-sm p-1">
                <div className="relative aspect-video overflow-hidden rounded-xl">
                  <img src={video.thumbnail_url || undefined} alt={video.title} className="w-full h-full object-cover transition-transform duration-700" />
                  
                  {video.is_short && (
                    <div className="absolute top-3 left-3 px-2 py-1 bg-white text-black text-[8px] font-black uppercase tracking-widest rounded-md flex items-center gap-1 shadow-lg z-20">
                      <Zap size={10} fill="currentColor" /> Short
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <div className="flex gap-3">
                    <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0 border border-white/10">
                      <img src={profile?.avatar_url || DEFAULT_AVATAR} alt="Avatar" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-white font-bold text-sm mb-1 line-clamp-2 leading-tight">{video.title}</h4>
                      <div className="flex items-center gap-2 flex-wrap mb-3">
                        <p className="text-slate-400 text-[10px] font-black">{profile?.username || user.email?.split('@')[0]}</p>
                        <span className="text-slate-700 text-[9px]">•</span>
                        <span className="text-[9px] font-bold text-slate-500">{video.views} vues</span>
                        <span className="text-slate-700 text-[9px]">•</span>
                        <span className="text-[9px] font-bold text-slate-500">{formatRelativeDate(video.created_at)}</span>
                      </div>
                      
                      <div className="flex gap-2">
                        <button className="flex-1 flex items-center justify-center gap-2 py-2 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-white/5">
                          <Edit2 size={14} /> Modifier
                        </button>
                        <button 
                          onClick={() => handleDelete(video.id)}
                          className="flex-1 flex items-center justify-center gap-2 py-2 bg-red-500/5 hover:bg-red-500/10 text-slate-400 hover:text-red-400 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-red-500/5"
                        >
                          <Trash2 size={14} /> Supprimer
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal d'upload */}
      {showUploadModal && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-xl" onClick={() => !uploading && setShowUploadModal(false)}></div>
          
          <div className="relative w-full max-w-xl bg-[#1a1a1a] border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-8 sm:p-10">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-2xl font-black text-white tracking-tighter">Publier une vidéo</h2>
                  <p className="text-slate-400 text-xs font-medium uppercase tracking-widest mt-1">Partagez votre contenu</p>
                </div>
                <button 
                  onClick={() => setShowUploadModal(false)}
                  className="p-2 text-slate-400 hover:text-white bg-white/10 rounded-xl transition-colors"
                >
                  <Plus size={20} className="rotate-45" />
                </button>
              </div>

              <form onSubmit={handleUpload} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Titre de la vidéo</label>
                  <input 
                    required
                    type="text" 
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ex: Mon premier vlog"
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-sm focus:outline-none focus:ring-2 focus:ring-white/20 text-white transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Description</label>
                  <textarea 
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Dites-en plus sur votre vidéo..."
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-sm focus:outline-none focus:ring-2 focus:ring-white/20 text-white transition-all min-h-[100px] resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Fichier Vidéo</label>
                    <div className="relative">
                      <input 
                        required
                        type="file" 
                        accept="video/*"
                        onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
                        className="hidden"
                        id="video-upload"
                      />
                      <label 
                        htmlFor="video-upload"
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-xs text-slate-500 cursor-pointer hover:border-white/50 transition-all flex items-center gap-2 overflow-hidden"
                      >
                        <Play size={14} className="flex-shrink-0" />
                        <span className="truncate">{videoFile ? videoFile.name : "Choisir une vidéo"}</span>
                      </label>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Miniature (Optionnel)</label>
                    <div className="relative">
                      <input 
                        type="file" 
                        accept="image/*"
                        onChange={(e) => setThumbnailFile(e.target.files?.[0] || null)}
                        className="hidden"
                        id="thumbnail-upload"
                      />
                      <label 
                        htmlFor="thumbnail-upload"
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-xs text-slate-500 cursor-pointer hover:border-white/50 transition-all flex items-center gap-2 overflow-hidden"
                      >
                        <Upload size={14} className="flex-shrink-0" />
                        <span className="truncate">{thumbnailFile ? thumbnailFile.name : "Choisir une image"}</span>
                      </label>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-4 bg-white/5 border border-white/10 rounded-2xl">
                  <input 
                    type="checkbox" 
                    id="isShort"
                    checked={isShort}
                    onChange={(e) => setIsShort(e.target.checked)}
                    className="w-5 h-5 rounded-lg bg-[#0f0f0f] border-white/10 text-white focus:ring-white/20"
                  />
                  <label htmlFor="isShort" className="flex items-center gap-2 cursor-pointer">
                    <Zap size={16} className={isShort ? "text-white" : "text-slate-500"} />
                    <span className="text-xs font-black uppercase tracking-widest text-white">Marquer comme Short (Format Vertical)</span>
                  </label>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Catégories (Plusieurs choix possibles)</label>
                  <div className="flex flex-wrap gap-2">
                    {categories.map(cat => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => {
                          if (selectedCategories.includes(cat)) {
                            setSelectedCategories(prev => prev.filter(c => c !== cat));
                          } else {
                            setSelectedCategories(prev => [...prev, cat]);
                          }
                        }}
                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${
                          selectedCategories.includes(cat) 
                            ? 'bg-white text-black border-white' 
                            : 'bg-white/5 text-slate-400 border-white/10 hover:bg-white/10'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                {error && (
                  <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-500 text-xs font-bold">
                    <AlertCircle size={16} />
                    {error}
                  </div>
                )}

                <button 
                  type="submit"
                  disabled={uploading}
                  className="w-full bg-white text-black hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed font-black text-[10px] uppercase tracking-[0.2em] py-5 rounded-2xl shadow-2xl transition-all active:scale-95 flex items-center justify-center gap-3"
                >
                  {uploading ? (
                    <>
                      <Loader2 size={18} className="animate-spin" /> Publication...
                    </>
                  ) : (
                    <>
                      <Upload size={18} /> Publier maintenant
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Notification de succès */}
      {success && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[400] bg-emerald-500 text-white px-8 py-4 rounded-2xl shadow-2xl shadow-emerald-500/20 flex items-center gap-3 animate-in slide-in-from-bottom-10 duration-500">
          <CheckCircle2 size={20} />
          <span className="text-xs font-black uppercase tracking-widest">{success}</span>
        </div>
      )}

      {/* Modal de suppression multi-étapes */}
      {deleteModalStep && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setDeleteModalStep(null)}></div>
          <div className="relative w-full max-w-md bg-[#1a1a1a] border border-white/10 rounded-[2rem] p-8 shadow-2xl animate-in zoom-in-95 duration-200">
            {deleteModalStep === 'confirm' ? (
              <div className="text-center">
                <div className="w-16 h-16 bg-red-500/20 rounded-2xl flex items-center justify-center text-red-400 mx-auto mb-6">
                  <Trash2 size={32} />
                </div>
                <h3 className="text-xl font-black text-white mb-2">Supprimer la vidéo ?</h3>
                <p className="text-slate-500 text-sm mb-8">Cette action est irréversible. Êtes-vous sûr de vouloir continuer ?</p>
                <div className="flex flex-col gap-3">
                  <button 
                    onClick={() => setDeleteModalStep('download')}
                    className="w-full py-4 bg-white text-black font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-slate-200 transition-all"
                  >
                    Oui, continuer
                  </button>
                  <button 
                    onClick={() => setDeleteModalStep(null)}
                    className="w-full py-4 bg-white/10 text-white font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-white/20 transition-all"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center">
                <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center text-white mx-auto mb-6">
                  <Upload size={32} className="rotate-180" />
                </div>
                <h3 className="text-xl font-black text-white mb-2">Sauvegarder avant ?</h3>
                <p className="text-slate-500 text-sm mb-8">Voulez-vous télécharger la vidéo sur votre appareil avant sa suppression définitive ?</p>
                <div className="flex flex-col gap-3">
                  <button 
                    onClick={async () => {
                      await downloadVideo();
                      confirmDelete();
                    }}
                    className="w-full py-4 bg-white text-black font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-slate-200 transition-all flex items-center justify-center gap-2"
                  >
                    <Upload size={14} className="rotate-180" /> Télécharger et supprimer
                  </button>
                  <div className="grid grid-cols-2 gap-3">
                    <button 
                      onClick={() => setDeleteModalStep(null)}
                      className="py-4 bg-white/10 text-white font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-white/20 transition-all"
                    >
                      Annuler
                    </button>
                    <button 
                      onClick={confirmDelete}
                      className="py-4 bg-red-500/10 text-red-400 border border-red-500/20 font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-red-500/20 transition-all"
                    >
                      Non, supprimer
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MyChannelTab;
