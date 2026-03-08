
import React, { useEffect, useState } from 'react';
import { Play, Megaphone, Info, Zap, TrendingUp, Sparkles, Star, Users, User as UserIcon, AlertTriangle, AlignLeft, Heart, Eye } from 'lucide-react';
import { TabId, Video } from '../types';
import { supabase } from '../services/supabase';
import { DEFAULT_AVATAR } from '../constants';

interface HomeTabProps {
  user: any;
  profile: any;
  onTabChange: (id: TabId) => void;
}

const HomeTab: React.FC<HomeTabProps> = ({ user, profile, onTabChange }) => {
  const [members, setMembers] = useState<any[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [featuredVideo, setFeaturedVideo] = useState<Video | null>(null);
  const [loadingVideo, setLoadingVideo] = useState(true);

  useEffect(() => {
    fetchMembers();
    fetchFeaturedVideo();
  }, []);

  const fetchFeaturedVideo = async () => {
    setLoadingVideo(true);
    try {
      // On récupère la vidéo avec le plus de vues
      const { data, error } = await supabase
        .from('videos')
        .select('*')
        .eq('is_short', false)
        .order('views', { ascending: false })
        .limit(1);

      if (error) throw error;
      if (data && data.length > 0) {
        setFeaturedVideo(data[0]);
      }
    } catch (err) {
      console.error("Erreur vidéo à la une:", err);
    } finally {
      setLoadingVideo(false);
    }
  };

  const fetchMembers = async () => {
    setLoadingMembers(true);
    setFetchError(false);
    
    try {
      // On utilise le client Supabase officiel qui est mieux configuré
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, updated_at')
        .order('updated_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      if (data) {
        setMembers(data);
        
        // Chargement asynchrone des avatars pour ne pas bloquer
        data.forEach(async (member: any) => {
          try {
            const { data: avatarData } = await supabase
              .from('profiles')
              .select('avatar_url')
              .eq('id', member.id)
              .single();
            
            if (avatarData?.avatar_url) {
              setMembers(prev => prev.map(m => m.id === member.id ? { ...m, avatar_url: avatarData.avatar_url } : m));
            }
          } catch (e) { /* Erreur silencieuse */ }
        });
      }
    } catch (err: any) {
      console.error("Erreur de récupération:", err);
      // On détecte spécifiquement le blocage navigateur
      const isNetworkError = err.message === 'Failed to fetch' || err.name === 'TypeError';
      setFetchError(true);
      
      if (isNetworkError) {
        console.warn("⚠️ Blocage réseau détecté. Probablement un AdBlocker ou VPN Opera GX.");
      }
    } finally {
      setLoadingMembers(false);
    }
  };

  const handleFeaturedClick = () => {
    if (featuredVideo) {
      // Update URL without reloading
      const url = new URL(window.location.href);
      url.searchParams.set('video', featuredVideo.id);
      window.history.pushState({}, '', url);
      
      // Navigate to video tab
      onTabChange('video');
    }
  };

  return (
    <div className="space-y-12 animate-in fade-in duration-700 pb-20">
      {/* Cadre de Bienvenue optimisé sans décorations */}
      <section className="relative overflow-hidden bg-[#1a1a1a] rounded-3xl p-6 sm:p-12 shadow-xl border border-white/10">
        <div className="relative z-10">
          <h2 className="text-3xl sm:text-5xl font-black text-white mb-6 tracking-tighter leading-none">
            {user ? `Salut, ${profile?.username || 'l\'ami'} !` : 'Wexo Social.'}
          </h2>
          <p className="text-slate-400 text-base sm:text-lg max-w-xl leading-relaxed font-medium">
            {user 
              ? "L'espace où vos idées prennent vie. Gérez vos projets et restez connecté." 
              : "La plateforme de nouvelle génération fusionnant outils pro et interaction sociale."}
          </p>
          {!user && (
            <div className="mt-8">
               <button 
                 onClick={() => onTabChange('aide')}
                 className="px-10 py-4 bg-white text-black rounded-2xl text-base font-bold tracking-tight active:scale-95 transition-all hover:bg-slate-200 shadow-sm"
               >
                 En savoir plus
               </button>
            </div>
          )}
        </div>
      </section>

      {/* Section Communauté / Nouveaux Membres */}
      <section className="space-y-6">
        <div className="flex items-center justify-between px-2">
          <h3 className="text-lg font-black text-white/90 flex items-center gap-4 tracking-tighter">
            <div className="w-10 h-10 bg-emerald-500/10 rounded-2xl flex items-center justify-center border border-emerald-500/20">
              <Users size={16} className="text-emerald-500" />
            </div>
            Communauté Wexo
          </h3>
          <button className="text-[10px] font-bold text-slate-500 hover:text-white transition-colors uppercase tracking-widest">Voir tout</button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
          {loadingMembers ? (
            Array(6).fill(0).map((_, i) => (
              <div key={i} className="bg-white/5 border border-white/10 rounded-2xl animate-pulse h-32"></div>
            ))
          ) : fetchError ? (
            <div className="col-span-full py-10 px-6 text-center bg-red-500/5 rounded-3xl border border-dashed border-red-500/20">
              <div className="w-12 h-12 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-red-500/20">
                <AlertTriangle size={24} className="text-red-500" />
              </div>
              <p className="text-xs font-black text-white uppercase tracking-tighter mb-2">Connexion Impossible</p>
              <p className="text-[10px] text-slate-400 mb-6 max-w-xs mx-auto leading-relaxed">
                Le navigateur refuse de contacter Supabase.<br/>
                <span className="text-amber-600 font-bold">Spécial Opera GX :</span><br/>
                1. Désactive le <span className="text-white">Bloqueur de Pub</span> (icône bouclier).<br/>
                2. Désactive le <span className="text-white">VPN Opera</span> s'il est actif.<br/>
                3. Essaie en <span className="text-white">Navigation Privée</span> (Ctrl+Maj+N).
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <button 
                  onClick={fetchMembers}
                  className="w-full sm:w-auto px-8 py-3 bg-white text-black text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-slate-200 transition-all active:scale-95"
                >
                  Réessayer
                </button>
                <button 
                  onClick={() => {
                    localStorage.clear();
                    sessionStorage.clear();
                    window.location.reload();
                  }}
                  className="w-full sm:w-auto px-8 py-3 bg-red-500 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-red-600 transition-all active:scale-95"
                >
                  Réinitialiser la session
                </button>
              </div>
            </div>
          ) : members.length > 0 ? (
            members.map((member) => (
              <div key={member.id} className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col items-center text-center group hover:border-white/30 transition-all cursor-pointer shadow-sm">
                <div className="w-12 h-12 rounded-full overflow-hidden mb-3 border border-white/10 group-hover:scale-110 transition-transform shadow-lg">
                  <img src={member.avatar_url || DEFAULT_AVATAR} alt={member.username} className="w-full h-full object-cover" />
                </div>
                <span className="text-[10px] font-bold text-white truncate w-full">{member.username}</span>
                <span className="text-[8px] font-medium text-slate-500 uppercase tracking-tighter mt-1">Membre</span>
              </div>
            ))
          ) : (
            <div className="col-span-full py-10 text-center bg-white/5 rounded-3xl border border-dashed border-white/10">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Aucun membre pour le moment</p>
            </div>
          )}
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-8">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-lg font-black text-white/90 flex items-center gap-4 tracking-tighter">
              <div className="w-10 h-10 bg-yellow-500/10 rounded-2xl flex items-center justify-center border border-yellow-500/20">
                <Star size={16} className="text-yellow-400" fill="currentColor" />
              </div>
              Vidéos à la une
            </h3>
          </div>
          
          <div 
            onClick={handleFeaturedClick}
            className="aspect-video bg-[#1a1a1a] border border-white/10 rounded-2xl flex flex-col items-center justify-center text-slate-400 transition-all hover:bg-white/5 hover:border-white/30 group cursor-pointer shadow-2xl relative overflow-hidden p-1"
          >
            {loadingVideo ? (
              <div className="animate-pulse flex flex-col items-center">
                <div className="w-20 h-20 bg-white/10 rounded-2xl mb-6"></div>
                <div className="w-32 h-4 bg-white/10 rounded-full"></div>
              </div>
            ) : featuredVideo ? (
              <>
                {/* Thumbnail Background */}
                <div className="absolute inset-0 z-0 rounded-xl overflow-hidden m-1">
                  <img 
                    src={featuredVideo.thumbnail_url} 
                    className="w-full h-full object-cover transition-transform duration-700"
                    alt={featuredVideo.title}
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent z-20"></div>
                </div>

                {/* Stats Bottom Left */}
                <div className="absolute bottom-8 left-8 z-10 flex items-center gap-4">
                  <div className="flex items-center gap-1.5 text-white/90 text-xs font-black tracking-tighter bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
                    <Eye size={14} />
                    {featuredVideo.views.toLocaleString()}
                  </div>
                  <div className="flex items-center gap-1.5 text-white/90 text-xs font-black tracking-tighter bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
                    <Heart size={14} fill="currentColor" className="text-red-500" />
                    {featuredVideo.likes.toLocaleString()}
                  </div>
                </div>

                {/* Creator Bottom Right */}
                <div className="absolute bottom-8 right-8 z-10 flex items-center gap-3 bg-black/40 backdrop-blur-md p-2 pr-4 rounded-2xl border border-white/10">
                  <div className="w-8 h-8 rounded-full overflow-hidden border border-white/20">
                    <img 
                      src={featuredVideo.creator_avatar || DEFAULT_AVATAR} 
                      alt={featuredVideo.creator_name} 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <span className="text-xs font-black text-white tracking-tighter">{featuredVideo.creator_name}</span>
                </div>

                {/* Video Title Top Left */}
                <div className="absolute top-8 left-8 z-10 max-w-[70%]">
                  <h4 className="text-xl font-black text-white tracking-tighter drop-shadow-lg line-clamp-2 leading-tight">
                    {featuredVideo.title}
                  </h4>
                </div>
              </>
            ) : (
              <>
                {/* Background Image with Blur */}
                <div className="absolute inset-0 z-0">
                  <img 
                    src="https://picsum.photos/seed/wexo_featured/1200/800" 
                    className="w-full h-full object-cover blur-3xl opacity-20 transition-transform duration-1000"
                    alt=""
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0f0f0f] via-transparent to-transparent"></div>
                </div>

                <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mb-6 group-hover:scale-110 transition-all duration-500 shadow-[0_0_40px_rgba(255,255,255,0.1)] group-hover:shadow-[0_0_60px_rgba(255,255,255,0.2)] border border-white/10 relative z-10 text-black">
                  <Play size={32} className="ml-1" fill="currentColor" />
                </div>
                <p className="text-sm font-black text-white/90 relative z-10 group-hover:text-white transition-colors tracking-tight">Prêt pour la diffusion</p>
              </>
            )}
          </div>
        </div>

        <div className="space-y-8">
          <div className="px-2">
            <h3 className="text-lg font-black text-white/90 flex items-center gap-4 tracking-tighter">
              <div className="w-10 h-10 bg-blue-500/10 rounded-2xl flex items-center justify-center border border-blue-500/20">
                <Megaphone size={16} className="text-blue-500" />
              </div>
              Annonces
            </h3>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-8 flex flex-col items-center justify-center text-center shadow-xl relative overflow-hidden min-h-[300px]">
            <AlignLeft size={24} className="text-slate-600 mb-6" />
            <h4 className="text-white font-black text-base mb-2 tracking-tight">Annonces Wexo</h4>
            <p className="text-[10px] text-slate-500 font-bold leading-relaxed">
              Aucunes annonces Wexo pour le moment.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomeTab;
