
import React from 'react';
import { Play, Megaphone, Info, Zap, TrendingUp, Sparkles, Star } from 'lucide-react';
import { TabId } from '../types';

interface HomeTabProps {
  user: any;
  profile: any;
  onTabChange: (id: TabId) => void;
}

const HomeTab: React.FC<HomeTabProps> = ({ user, profile, onTabChange }) => {
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
