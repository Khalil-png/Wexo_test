
import React, { useState, useEffect } from 'react';
import { RotateCcw, Trophy, User, Cpu } from 'lucide-react';

type Player = 'X' | 'O' | null;

const TicTacToe: React.FC = () => {
  const [board, setBoard] = useState<Player[]>(Array(9).fill(null));
  const [isXNext, setIsXNext] = useState(true);
  const [winner, setWinner] = useState<Player | 'Draw'>(null);
  const [winningLine, setWinningLine] = useState<number[] | null>(null);
  const [scores, setScores] = useState({ X: 0, O: 0, Draw: 0 });

  const calculateWinner = (squares: Player[]) => {
    const lines = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
      [0, 3, 6], [1, 4, 7], [2, 5, 8], // columns
      [0, 4, 8], [2, 4, 6]             // diagonals
    ];
    for (let i = 0; i < lines.length; i++) {
      const [a, b, c] = lines[i];
      if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
        return { winner: squares[a], line: lines[i] };
      }
    }
    if (squares.every(square => square !== null)) {
      return { winner: 'Draw' as const, line: null };
    }
    return null;
  };

  const handleClick = (i: number) => {
    if (winner || board[i]) return;
    const newBoard = board.slice();
    newBoard[i] = isXNext ? 'X' : 'O';
    setBoard(newBoard);
    setIsXNext(!isXNext);

    const result = calculateWinner(newBoard);
    if (result) {
      setWinner(result.winner);
      setWinningLine(result.line);
      setScores(prev => ({
        ...prev,
        [result.winner]: prev[result.winner as keyof typeof prev] + 1
      }));
    }
  };

  const resetGame = () => {
    setBoard(Array(9).fill(null));
    setIsXNext(true);
    setWinner(null);
    setWinningLine(null);
  };

  return (
    <div className="flex flex-col items-center gap-6 p-4 sm:p-8 bg-white/5 rounded-xl border border-white/10 w-full max-w-2xl mx-auto">
      <div className="flex items-center justify-between w-full mb-2">
        <div className="flex flex-col">
          <h3 className="text-xl font-black text-white">Morpion</h3>
          <p className="text-[10px] text-slate-500 font-bold">Tic Tac Toe</p>
        </div>
        <div className="flex gap-4">
          <div className="flex flex-col items-end">
            <span className="text-[9px] text-slate-500 font-bold uppercase">X (Vous)</span>
            <span className="text-xl font-black text-blue-400">{scores.X}</span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[9px] text-slate-500 font-bold uppercase">O (Ami)</span>
            <span className="text-xl font-black text-red-400">{scores.O}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 w-full max-w-[300px] aspect-square">
        {board.map((square, i) => {
          const isWinningSquare = winningLine?.includes(i);
          return (
            <button
              key={i}
              onClick={() => handleClick(i)}
              disabled={!!winner || !!square}
              className={`
                h-full w-full rounded-xl flex items-center justify-center text-4xl font-black transition-all
                ${!square && !winner ? 'bg-white/5 hover:bg-white/10' : 'bg-white/5'}
                ${isWinningSquare ? 'bg-emerald-500/20 text-emerald-400 border-2 border-emerald-500/50' : 'border border-white/10'}
                ${square === 'X' ? 'text-blue-400' : 'text-red-400'}
              `}
            >
              {square}
            </button>
          );
        })}
      </div>

      <div className="flex flex-col items-center gap-4 w-full">
        {winner ? (
          <div className="text-center animate-in zoom-in duration-300">
            <h4 className="text-2xl font-black text-white mb-2">
              {winner === 'Draw' ? 'Égalité !' : `Victoire de ${winner} !`}
            </h4>
            <button 
              onClick={resetGame}
              className="bg-white text-black px-8 py-3 rounded-xl font-black uppercase text-xs tracking-widest hover:bg-slate-200 transition-all flex items-center gap-2 mx-auto"
            >
              <RotateCcw size={16} /> Rejouer
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3 px-6 py-3 bg-white/5 rounded-xl border border-white/10">
            <div className={`w-2 h-2 rounded-full animate-pulse ${isXNext ? 'bg-blue-400' : 'bg-red-400'}`} />
            <span className="text-xs font-bold text-white">
              Tour de : {isXNext ? 'X' : 'O'}
            </span>
          </div>
        )}

        <button 
          onClick={resetGame}
          className="p-4 bg-white/5 border border-white/10 rounded-xl text-white hover:bg-white/10 transition-all mt-2"
          title="Réinitialiser"
        >
          <RotateCcw size={20} />
        </button>
      </div>
    </div>
  );
};

export default TicTacToe;
