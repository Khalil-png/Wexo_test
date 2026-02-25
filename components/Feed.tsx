
import React from 'react';
import { Play, TrendingUp, Users, Zap, Film, Plus, Heart, MessageSquare } from 'lucide-react';

const Feed: React.FC = () => {
  return (
    <div className="w-full space-y-16 pb-24 animate-in fade-in duration-700">
      {/* Stories Section : Vertical Grid pour mobile */}
      <section className="space-y-8">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xl font-black text-white tracking-tighter flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-500/10 rounded-2xl flex items-center justify-center">
              <Zap className="text-amber-500" size={20} fill="currentColor" />
            </div>
            Wexo Stories
          </h3>
          <button className="text-[10px] font-black uppercase tracking-widest text-sky-400 hover:text-sky-300 transition-colors">Voir Tout</button>
        </div>
        
        {/* Grille responsive : 3 colonnes sur mobile, pas de scroll horizontal */}
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-4 sm:gap-6">
          {/* Bouton Ajouter */}
          <div className="aspect-[2/3.5] rounded-[1.5rem] bg-slate-900 border-2 border-dashed border-slate-800 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-900/80 hover:border-sky-500/50 transition-all group overflow-hidden shadow-xl active:scale-95">
            <div className="w-12 h-12 bg-sky-500 rounded-full flex items-center justify-center text-white mb-4 group-hover:scale-110 transition-transform shadow-lg shadow-sky-500/20">
              <Plus size={24} />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 group-hover:text-slate-300">Poster</span>
          </div>

          {/* Stories Mockup Grid */}
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((item) => (
            <div key={item} className="aspect-[2/3.5] rounded-[1.5rem] bg-slate-900 border border-slate-800 overflow-hidden relative group cursor-pointer shadow-xl hover:shadow-sky-500/10 transition-all active:scale-95">
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent z-10 opacity-80"></div>
              <img 
                src={`https://picsum.photos/seed/wexo_story_${item}/400/700`} 
                className="w-full h-full object-cover group-hover:scale-110 transition-all duration-1000" 
                alt="Story"
              />
              <div className="absolute top-4 left-4 z-20">
                <div className="w-9 h-9 rounded-full border-2 border-sky-500 p-0.5 overflow-hidden shadow-lg">
                  <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=user${item}`} className="w-full h-full rounded-full object-cover" alt="user" />
                </div>
              </div>
              <div className="absolute bottom-4 left-4 z-20">
                <span className="text-[10px] font-black text-white uppercase tracking-widest truncate w-20 block">@User_{item}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        <div className="lg:col-span-8 space-y-12">
          <section className="space-y-8">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-xl font-black text-white tracking-tighter flex items-center gap-3">
                <div className="w-10 h-10 bg-sky-500/10 rounded-2xl flex items-center justify-center">
                  <Play className="text-sky-500" size={20} fill="currentColor" />
                </div>
                À la une
              </h3>
            </div>
            
            <div className="space-y-10">
              {[1, 2].map(i => (
                <div key={i} className="bg-slate-900/50 border border-slate-800 rounded-[2.5rem] overflow-hidden shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-700">
                  <div className="p-6 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl border-2 border-slate-800 overflow-hidden">
                        <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=post${i}`} alt="user" />
                      </div>
                      <div>
                        <p className="text-sm font-black text-white tracking-tight">Wexo Officiel</p>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Il y a {i}h • Public</p>
                      </div>
                    </div>
                  </div>
                  <div className="px-6 pb-6 space-y-6">
                    <p className="text-base text-slate-300 leading-relaxed font-medium">
                      Bienvenue sur la version 2.0 de Wexo ! Nous avons optimisé l'expérience mobile pour que tout soit fluide, vertical et instinctif. Profitez de vos stories en grille et de vos vidéos préférées !
                    </p>
                    <div className="aspect-[16/9] bg-slate-950 rounded-[1.5rem] overflow-hidden border border-slate-800">
                      <img src={`https://images.unsplash.com/photo-${i === 1 ? '1550745165-9bc0b252726f' : '1451187580459-43490279c0fa'}?auto=format&fit=crop&q=80&w=1200`} className="w-full h-full object-cover" alt="post content" />
                    </div>
                  </div>
                  <div className="px-8 py-5 bg-slate-900/80 border-t border-slate-800 flex items-center gap-10">
                    <button className="flex items-center gap-3 text-slate-400 hover:text-sky-400 transition-all font-black text-[11px] uppercase tracking-widest group">
                      <Heart size={20} className="group-hover:fill-sky-400" /> 12k
                    </button>
                    <button className="flex items-center gap-3 text-slate-400 hover:text-sky-400 transition-all font-black text-[11px] uppercase tracking-widest group">
                      <MessageSquare size={20} /> 450
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Sidebar Droite - Masquée sur mobile pour laisser place au scroll vertical simple */}
        <div className="lg:col-span-4 space-y-10">
          <section className="bg-slate-900/40 border border-slate-800 rounded-[2rem] p-8 shadow-xl backdrop-blur-sm">
            <h3 className="font-black text-sm uppercase tracking-[0.2em] mb-8 flex items-center gap-3 text-slate-300">
              <TrendingUp size={18} className="text-emerald-500" /> Tendances
            </h3>
            <div className="space-y-6">
              {[
                { tag: '#Wexo2025', count: '1.2M posts' },
                { tag: '#PixelUser', count: '850k posts' },
                { tag: '#CreativeFlow', count: '420k posts' },
                { tag: '#WebDevelopment', count: '310k posts' }
              ].map((item, i) => (
                <div key={i} className="cursor-pointer group flex items-center justify-between">
                  <div>
                    <p className="text-sm font-black text-slate-200 group-hover:text-sky-400 transition-colors tracking-tight">{item.tag}</p>
                    <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mt-1">{item.count}</p>
                  </div>
                  <Plus size={16} className="text-slate-700 group-hover:text-sky-500 transition-all" />
                </div>
              ))}
            </div>
          </section>

          <section className="bg-gradient-to-br from-sky-500 to-indigo-600 rounded-[2rem] p-8 shadow-2xl shadow-sky-500/20 border border-white/10 relative overflow-hidden group">
            <div className="relative z-10">
              <h3 className="font-black text-lg text-white tracking-tighter mb-2 flex items-center gap-3">
                <Users size={20} /> Wexo Club
              </h3>
              <p className="text-xs text-white/80 mb-6 font-medium leading-relaxed">Accédez à des contenus exclusifs et des outils de production pro.</p>
              <button className="w-full bg-white text-slate-900 hover:bg-sky-100 font-black text-[11px] uppercase tracking-widest py-4 rounded-2xl shadow-xl transition-all active:scale-95">
                Découvrir
              </button>
            </div>
            <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Feed;
