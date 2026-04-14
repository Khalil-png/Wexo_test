
import React, { useEffect, useState } from 'react';
import { renderTextWithEmojis } from '../utils/emoji';
import { Play, Bell, Info, Zap, TrendingUp, Sparkles, Flame, Globe, User as UserIcon, AlertTriangle, AlignLeft, Heart, Eye } from 'lucide-react';
import { TabId, Video } from '../types';
import { db } from '../firebase';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  getDocs,
  doc,
  getDoc
} from 'firebase/firestore';
import { DEFAULT_AVATAR } from '../constants';
import Username from './Username';

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
    fetchFeaturedVideo();
    fetchMembers();
  }, []);

  const fetchFeaturedVideo = async () => {
    setLoadingVideo(true);
    try {
      const videosRef = collection(db, 'videos');
      const q = query(
        videosRef,
        where('is_short', '==', false),
        orderBy('views', 'desc'),
        limit(1)
      );

      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        setFeaturedVideo({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Video);
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
      const profilesRef = collection(db, 'profiles');
      const q = query(
        profilesRef,
        orderBy('created_at', 'desc'),
        limit(10)
      );

      const snapshot = await getDocs(q);
      const data = snapshot.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter((m: any) => m.id !== 'gemini');
      setMembers(data);
    } catch (err: any) {
      console.error("Erreur de récupération:", err);
      setFetchError(true);
    } finally {
      setLoadingMembers(false);
    }
  };

  const handleFeaturedClick = () => {
    if (featuredVideo) {
      const url = new URL(window.location.href);
      url.searchParams.set('video', featuredVideo.id);
      window.history.pushState({}, '', url);
      onTabChange('video');
    }
  };

  return (
    <div className="space-y-12 animate-in fade-in duration-700 pb-20">
      {/* Cadre de Bienvenue optimisé sans décorations */}
      <section className="relative overflow-hidden bg-[#1a1a1a] rounded-2xl p-6 sm:p-12 border border-white/5">
        <div className="relative z-10">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4 tracking-tight">
            {user ? `Salut, ${profile?.display_name || profile?.username || 'l\'ami'} !` : 'Wexo Social.'}
          </h2>
          <p className="text-slate-400 text-base sm:text-lg max-w-xl leading-relaxed">
            {user 
              ? "L'espace où vos idées prennent vie. Gérez vos projets et restez connecté." 
              : "La plateforme de nouvelle génération fusionnant outils pro et interaction sociale."}
          </p>
          {!user && (
            <div className="mt-8">
               <button 
                 onClick={() => onTabChange('aide')}
                 className="px-8 py-3 bg-white text-black rounded-2xl text-sm font-bold tracking-tight active:scale-95 transition-all hover:bg-slate-200 shadow-sm"
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
          <h3 className="text-base font-bold text-white/90 flex items-center gap-3 tracking-tight">
            <Globe size={18} className="text-white" />
            Communauté Wexo
          </h3>
          <button className="text-[10px] font-bold text-slate-500 hover:text-white transition-colors">Voir tout</button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
          {loadingMembers ? (
            Array(6).fill(0).map((_, i) => (
              <div key={i} className="bg-white/5 border border-white/10 rounded-2xl animate-pulse h-32" />
            ))
          ) : members.length > 0 ? (
            members.map((member) => (
              <div key={member.id} className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col items-center text-center group hover:bg-white/[0.07] transition-all cursor-pointer">
                <div className="w-12 h-12 mb-3 group-hover:scale-105 transition-transform">
                  {member.id === 'gemini' ? (
                    <div className="w-full h-full overflow-hidden rounded-full">
                      <img 
                        src="https://static.vecteezy.com/system/resources/thumbnails/055/687/065/small_2x/gemini-google-icon-symbol-logo-free-png.png" 
                        className="w-full h-full object-cover" 
                        alt="Gemini"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  ) : (
                    <img src={member.avatar_url || DEFAULT_AVATAR} className="w-full h-full rounded-full object-cover border border-white/10" alt="" referrerPolicy="no-referrer" />
                  )}
                </div>
                <Username 
                  username={member.username} 
                  displayName={member.display_name}
                  isVerified={member.is_verified} 
                  isAdmin={member.role === 'admin'}
                  email={member.email}
                  className="text-xs font-bold text-white truncate w-full justify-center" 
                  badgeSize={10} 
                />
                <span className="text-[10px] font-medium text-slate-500 mt-1">Membre</span>
              </div>
            ))
          ) : (
            <div className="col-span-full py-10 text-center bg-white/5 rounded-2xl border border-dashed border-white/10">
              <p className="text-xs font-bold text-slate-500">Aucun membre pour le moment</p>
            </div>
          )}
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-8">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-base font-bold text-white/90 flex items-center gap-3 tracking-tight">
              <Flame size={18} className="text-white" />
              Vidéos à la une
            </h3>
          </div>
          
          <div 
            onClick={handleFeaturedClick}
            className="aspect-video bg-[#1a1a1a] border border-white/10 rounded-2xl flex flex-col items-center justify-center text-slate-400 transition-all hover:bg-white/5 hover:border-white/60 group cursor-pointer relative overflow-hidden ring-0 hover:ring-4 ring-white/10"
          >
            {loadingVideo ? (
              <div className="animate-pulse flex flex-col items-center">
                <div className="w-16 h-16 bg-white/10 rounded-2xl mb-6"></div>
                <div className="w-32 h-3 bg-white/10 rounded-full"></div>
              </div>
            ) : featuredVideo ? (
              <>
                {/* Thumbnail Background */}
                <div className="absolute inset-0 z-0 rounded-2xl overflow-hidden">
                  <img 
                    src={featuredVideo.thumbnail_url} 
                    className="w-full h-full object-cover"
                    alt={featuredVideo.title}
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-black/30 z-20"></div>
                </div>

                {/* Stats Bottom Left */}
                <div className="absolute bottom-6 left-6 z-10 flex items-center gap-3">
                  <div className="flex items-center gap-1.5 text-white/90 text-[10px] font-bold tracking-tight bg-black/60 px-2.5 py-1 rounded-2xl border border-white/10">
                    <Eye size={12} />
                    {featuredVideo.views.toLocaleString()}
                  </div>
                  <div className="flex items-center gap-1.5 text-white/90 text-[10px] font-bold tracking-tight bg-black/60 px-2.5 py-1 rounded-2xl border border-white/10">
                    <Heart size={12} fill="currentColor" className="text-red-500" />
                    {featuredVideo.likes.toLocaleString()}
                  </div>
                </div>

                {/* Creator Bottom Right */}
                <div className="absolute bottom-6 right-6 z-10 flex items-center gap-2.5 bg-black/60 p-1.5 pr-3 rounded-2xl border border-white/10">
                  <div className="w-7 h-7 rounded-full overflow-hidden border border-white/20">
                    <img src={featuredVideo.creator_avatar || DEFAULT_AVATAR} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" />
                  </div>
                  <Username 
                    username={featuredVideo.creator_name || 'Utilisateur'} 
                    displayName={featuredVideo.creator_display_name}
                    isVerified={featuredVideo.creator_is_verified} 
                    className="text-[10px] font-bold text-white tracking-tight" 
                    badgeSize={10} 
                  />
                </div>

                {/* Video Title Top Left */}
                <div className="absolute top-6 left-6 z-10 max-w-[70%]">
                  <h4 className="text-lg font-bold text-white tracking-tight drop-shadow-md line-clamp-2 leading-tight">
                    {renderTextWithEmojis(featuredVideo.title)}
                  </h4>
                </div>
              </>
            ) : (
              <>
                {/* Background Image with Blur */}
                <div className="absolute inset-0 z-0">
                  <img 
                    src="https://picsum.photos/seed/wexo_featured/1200/800" 
                    className="w-full h-full object-cover opacity-10 transition-transform duration-1000"
                    alt=""
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-[#0f0f0f]/60"></div>
                </div>

                <div className="w-16 h-16 flex items-center justify-center mb-4 group-hover:scale-110 transition-all duration-300 relative z-10 text-white drop-shadow-2xl">
                  <Play size={48} className="ml-1" fill="currentColor" />
                </div>
                <p className="text-xs font-bold text-white relative z-10 tracking-tight drop-shadow-md">Prêt pour la diffusion</p>
              </>
            )}
          </div>
        </div>

        <div className="space-y-8">
          <div className="px-2">
            <h3 className="text-base font-bold text-white/90 flex items-center gap-3 tracking-tight">
              <Bell size={18} className="text-white" />
              Annonces
            </h3>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-8 flex flex-col items-center justify-center text-center min-h-[300px]">
            <AlignLeft size={20} className="text-slate-700 mb-4" />
            <h4 className="text-white font-bold text-sm mb-1 tracking-tight">Annonces Wexo</h4>
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
