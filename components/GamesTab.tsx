
import React, { useState } from 'react';
import { Gamepad2, Trophy, Play, ChevronRight, ArrowLeft } from 'lucide-react';
import SnakeGame from './SnakeGame';
import TicTacToe from './TicTacToe';

type GameId = 'snake' | 'morpion' | null;

const GamesTab: React.FC = () => {
  const [activeGame, setActiveGame] = useState<GameId>(null);

  const games = [
    {
      id: 'snake' as const,
      title: 'Snake',
      description: 'Le classique jeu du serpent. Mangez les pommes et grandissez sans vous mordre la queue !',
      icon: <Gamepad2 className="text-emerald-400" size={32} />,
      color: 'bg-emerald-500/10',
      borderColor: 'border-emerald-500/20',
      tag: 'Arcade'
    },
    {
      id: 'morpion' as const,
      title: 'Morpion',
      description: 'Alignez trois symboles identiques pour gagner contre un ami ou l\'IA.',
      icon: <Gamepad2 className="text-primary" size={32} style={{ color: 'var(--primary-color)' }} />,
      color: 'bg-primary/10',
      borderColor: 'border-primary/20',
      tag: 'Stratégie'
    }
  ];

  if (activeGame === 'snake') {
    return (
      <div className="flex flex-col gap-6 animate-in slide-in-from-right duration-500">
        <button 
          onClick={() => setActiveGame(null)}
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors w-fit group"
        >
          <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
          <span className="text-xs font-bold">Retour aux jeux</span>
        </button>
        <SnakeGame />
      </div>
    );
  }

  if (activeGame === 'morpion') {
    return (
      <div className="flex flex-col gap-6 animate-in slide-in-from-right duration-500">
        <button 
          onClick={() => setActiveGame(null)}
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors w-fit group"
        >
          <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
          <span className="text-xs font-bold">Retour aux jeux</span>
        </button>
        <TicTacToe />
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-black text-white">Espace Jeux</h2>
        <p className="text-slate-400 text-sm font-medium">Détendez-vous avec nos mini-jeux classiques.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {games.map((game) => (
          <div 
            key={game.id}
            onClick={() => setActiveGame(game.id)}
            className={`
              group relative overflow-hidden rounded-xl border ${game.borderColor} ${game.color} 
              p-8 cursor-pointer hover:scale-[1.02] transition-all active:scale-95 shadow-2xl
            `}
          >
            <div className="relative z-10 flex flex-col h-full">
              <div className="flex items-start justify-between mb-6">
                <div className="p-4 bg-white/10 rounded-xl backdrop-blur-md border border-white/10 group-hover:scale-110 transition-transform">
                  {game.icon}
                </div>
                <span className="px-4 py-1.5 bg-white/10 rounded-xl text-[10px] font-black text-white/80 border border-white/10">
                  {game.tag}
                </span>
              </div>
              
              <div className="space-y-3">
                <h3 className="text-2xl font-black text-white">{game.title}</h3>
                <p className="text-slate-300 text-sm font-medium leading-relaxed line-clamp-2">
                  {game.description}
                </p>
              </div>

              <div className="mt-8 flex items-center gap-2 text-white font-black text-[10px] group-hover:gap-4 transition-all">
                Jouer maintenant <ChevronRight size={16} />
              </div>
            </div>

            {/* Decorative elements */}
            <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/5 rounded-full blur-3xl group-hover:bg-white/10 transition-colors" />
            <div className="absolute top-0 right-0 p-8 opacity-0 group-hover:opacity-10 transition-opacity">
              <Play size={120} fill="currentColor" />
            </div>
          </div>
        ))}

        {/* Coming Soon Card */}
        <div className="rounded-xl border border-white/5 bg-white/5 p-8 flex flex-col items-center justify-center text-center border-dashed">
          <div className="w-16 h-16 rounded-xl bg-white/5 flex items-center justify-center text-slate-600 mb-4">
            <Gamepad2 size={32} />
          </div>
          <h3 className="text-lg font-bold text-slate-500">Bientôt plus...</h3>
          <p className="text-slate-600 text-xs font-medium">De nouveaux jeux arrivent chaque semaine.</p>
        </div>
      </div>
    </div>
  );
};

export default GamesTab;
