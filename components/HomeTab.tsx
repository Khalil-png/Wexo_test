
import React, { useEffect, useState } from 'react';
import { Play, Megaphone, Info, Zap, TrendingUp, Sparkles, Star, Users, User as UserIcon, AlertTriangle } from 'lucide-react';
import { TabId } from '../types';
import { supabase } from '../services/supabase';

interface HomeTabProps {
  user: any;
  profile: any;
  onTabChange: (id: TabId) => void;
}

const HomeTab: React.FC<HomeTabProps> = ({ user, profile, onTabChange }) => {
  const [members, setMembers] = useState<any[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [fetchError, setFetchError] = useState(false);

  useEffect(() => {
    fetchMembers();
  }, []);

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

  return (
    <div className="space-y-12 animate-in fade-in duration-700 pb-20">
      {/* Cadre de Bienvenue optimisé sans marge haute */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 rounded-[2.5rem] p-6 sm:p-12 shadow-2xl border border-slate-800/50">
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
                 className="px-10 py-4 bg-slate-800/50 backdrop-blur-md text-white border border-white/10 rounded-2xl text-base font-bold tracking-tight active:scale-95 transition-all hover:bg-slate-800 hover:border-white/20"
               >
                 En savoir plus
               </button>
            </div>
          )}
        </div>
        
        {/* Décorations */}
        <div className="absolute top-[-20%] right-[-10%] w-72 h-72 bg-sky-500/10 rounded-full blur-[80px]"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-64 h-64 bg-indigo-500/10 rounded-full blur-[80px]"></div>
      </section>

      {/* Section Communauté / Nouveaux Membres */}
      <section className="space-y-6">
        <div className="flex items-center justify-between px-2">
          <h3 className="text-[10px] font-black uppercase tracking-[0.4em] flex items-center gap-4 text-slate-500">
            <div className="w-10 h-10 bg-emerald-500/10 rounded-2xl flex items-center justify-center border border-emerald-500/20">
              <Users size={16} className="text-emerald-500" />
            </div>
            Communauté Wexo
          </h3>
          <button className="text-[9px] font-black uppercase tracking-widest text-sky-500 hover:text-sky-400 transition-colors">Voir tout</button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
          {loadingMembers ? (
            Array(6).fill(0).map((_, i) => (
              <div key={i} className="bg-slate-900/40 border border-slate-800/60 rounded-3xl p-4 animate-pulse h-32"></div>
            ))
          ) : fetchError ? (
            <div className="col-span-full py-10 px-6 text-center bg-red-500/5 rounded-[2.5rem] border border-dashed border-red-500/20">
              <div className="w-12 h-12 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-red-500/20">
                <AlertTriangle size={24} className="text-red-500" />
              </div>
              <p className="text-xs font-black text-white uppercase tracking-tighter mb-2">Connexion Impossible</p>
              <p className="text-[10px] text-slate-500 mb-6 max-w-xs mx-auto leading-relaxed">
                Le navigateur refuse de contacter Supabase.<br/>
                <span className="text-amber-400 font-bold">Spécial Opera GX :</span><br/>
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
              <div key={member.id} className="bg-slate-900/40 border border-slate-800/60 rounded-3xl p-4 flex flex-col items-center text-center group hover:border-sky-500/30 transition-all cursor-pointer">
                <div className="w-12 h-12 rounded-2xl overflow-hidden mb-3 border border-slate-800 group-hover:scale-110 transition-transform shadow-lg">
                  <img src={member.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${member.id}`} alt={member.username} className="w-full h-full object-cover" />
                </div>
                <span className="text-[10px] font-bold text-white truncate w-full">{member.username}</span>
                <span className="text-[8px] font-medium text-slate-500 uppercase tracking-tighter mt-1">Membre</span>
              </div>
            ))
          ) : (
            <div className="col-span-full py-10 text-center bg-slate-900/20 rounded-3xl border border-dashed border-slate-800">
              <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Aucun membre pour le moment</p>
            </div>
          )}
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-8">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-[10px] font-black uppercase tracking-[0.4em] flex items-center gap-4 text-slate-500">
              <div className="w-10 h-10 bg-sky-500/10 rounded-2xl flex items-center justify-center border border-sky-500/20">
                <Star size={16} className="text-sky-500" fill="currentColor" />
              </div>
              Vidéos à la une
            </h3>
          </div>
          
          <div className="aspect-video bg-slate-900/60 border border-slate-800 rounded-[3rem] flex flex-col items-center justify-center text-slate-700 transition-all hover:bg-slate-900/80 group cursor-pointer shadow-xl relative overflow-hidden">
            <div className="w-16 h-16 bg-slate-800/40 backdrop-blur-xl rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-sky-500 transition-all duration-500 shadow-2xl group-hover:text-white border border-white/5 relative z-10">
              <Play size={28} className="ml-1" fill="currentColor" />
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600 relative z-10 group-hover:text-sky-400 transition-colors">Prêt pour la diffusion</p>
          </div>
        </div>

        <div className="space-y-8">
          <div className="px-2">
            <h3 className="text-[10px] font-black uppercase tracking-[0.4em] flex items-center gap-4 text-slate-500">
              <div className="w-10 h-10 bg-amber-500/10 rounded-2xl flex items-center justify-center border border-amber-500/20">
                <Megaphone size={16} className="text-amber-500" />
              </div>
              Annonces
            </h3>
          </div>

          <div className="bg-slate-900/40 border border-slate-800/60 rounded-[2.5rem] p-8 flex flex-col items-center justify-center text-center shadow-xl relative overflow-hidden min-h-[300px]">
            <Sparkles size={24} className="text-slate-700 mb-6" />
            <h4 className="text-white font-black text-base mb-2 tracking-tight">Focus Créativité</h4>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.1em] leading-relaxed">
              Votre fil d'actualité est à jour.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomeTab;
