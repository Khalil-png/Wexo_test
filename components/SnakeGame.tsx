
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Trophy, RotateCcw, Play, Pause, ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';

const GRID_SIZE = 20;
const INITIAL_SNAKE = [{ x: 10, y: 10 }];
const INITIAL_DIRECTION = { x: 0, y: -1 };
const INITIAL_SPEED = 150;

const SnakeGame: React.FC = () => {
  const [snake, setSnake] = useState(INITIAL_SNAKE);
  const [food, setFood] = useState({ x: 5, y: 5 });
  const [direction, setDirection] = useState(INITIAL_DIRECTION);
  const [isGameOver, setIsGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [isPaused, setIsPaused] = useState(true);
  const [speed, setSpeed] = useState(INITIAL_SPEED);
  
  const gameLoopRef = useRef<NodeJS.Timeout | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const generateFood = useCallback(() => {
    let newFood;
    while (true) {
      newFood = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE),
      };
      // Check if food is on snake
      const onSnake = snake.some(segment => segment.x === newFood?.x && segment.y === newFood?.y);
      if (!onSnake) break;
    }
    setFood(newFood);
  }, [snake]);

  const resetGame = () => {
    setSnake(INITIAL_SNAKE);
    setDirection(INITIAL_DIRECTION);
    setScore(0);
    setIsGameOver(false);
    setIsPaused(false);
    setSpeed(INITIAL_SPEED);
    generateFood();
  };

  const moveSnake = useCallback(() => {
    if (isGameOver || isPaused) return;

    setSnake(prevSnake => {
      const head = { ...prevSnake[0] };
      head.x += direction.x;
      head.y += direction.y;

      // Check wall collision
      if (head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE) {
        setIsGameOver(true);
        return prevSnake;
      }

      // Check self collision
      if (prevSnake.some(segment => segment.x === head.x && segment.y === head.y)) {
        setIsGameOver(true);
        return prevSnake;
      }

      const newSnake = [head, ...prevSnake];

      // Check food collision
      if (head.x === food.x && head.y === food.y) {
        setScore(s => {
          const newScore = s + 10;
          if (newScore > highScore) setHighScore(newScore);
          return newScore;
        });
        generateFood();
        // Increase speed slightly
        setSpeed(prev => Math.max(prev - 2, 50));
      } else {
        newSnake.pop();
      }

      return newSnake;
    });
  }, [direction, food, isGameOver, isPaused, highScore, generateFood]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowUp':
          if (direction.y === 0) setDirection({ x: 0, y: -1 });
          break;
        case 'ArrowDown':
          if (direction.y === 0) setDirection({ x: 0, y: 1 });
          break;
        case 'ArrowLeft':
          if (direction.x === 0) setDirection({ x: -1, y: 0 });
          break;
        case 'ArrowRight':
          if (direction.x === 0) setDirection({ x: 1, y: 0 });
          break;
        case ' ':
          setIsPaused(prev => !prev);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [direction]);

  useEffect(() => {
    if (!isPaused && !isGameOver) {
      gameLoopRef.current = setInterval(moveSnake, speed);
    } else {
      if (gameLoopRef.current) clearInterval(gameLoopRef.current);
    }
    return () => {
      if (gameLoopRef.current) clearInterval(gameLoopRef.current);
    };
  }, [isPaused, isGameOver, moveSnake, speed]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const cellSize = canvas.width / GRID_SIZE;

    // Clear canvas
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw grid (optional, very subtle)
    ctx.strokeStyle = '#ffffff05';
    for (let i = 0; i <= GRID_SIZE; i++) {
      ctx.beginPath();
      ctx.moveTo(i * cellSize, 0);
      ctx.lineTo(i * cellSize, canvas.height);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * cellSize);
      ctx.lineTo(canvas.width, i * cellSize);
      ctx.stroke();
    }

    // Draw snake
    snake.forEach((segment, index) => {
      ctx.fillStyle = index === 0 ? '#ffffff' : '#ffffff80';
      ctx.beginPath();
      const radius = cellSize / 2.5;
      const x = segment.x * cellSize + cellSize / 2;
      const y = segment.y * cellSize + cellSize / 2;
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    });

    // Draw food
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    const foodX = food.x * cellSize + cellSize / 2;
    const foodY = food.y * cellSize + cellSize / 2;
    ctx.arc(foodX, foodY, cellSize / 3, 0, Math.PI * 2);
    ctx.fill();
    // Add glow to food
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#ef4444';
    ctx.stroke();
    ctx.shadowBlur = 0;

  }, [snake, food]);

  return (
    <div className="flex flex-col items-center gap-6 p-4 sm:p-8 bg-white/5 rounded-2xl border border-white/10 w-full max-w-2xl mx-auto">
      <div className="flex items-center justify-between w-full mb-2">
        <div className="flex flex-col">
          <h3 className="text-xl font-black text-white">Snake</h3>
          <p className="text-[10px] text-slate-500 font-bold">Classic Arcade</p>
        </div>
        <div className="flex gap-4">
          <div className="flex flex-col items-end">
            <span className="text-[9px] text-slate-500 font-bold uppercase">Score</span>
            <span className="text-xl font-black text-white">{score}</span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[9px] text-slate-500 font-bold uppercase">Record</span>
            <span className="text-xl font-black text-emerald-400">{highScore}</span>
          </div>
        </div>
      </div>

      <div className="relative group">
        <canvas 
          ref={canvasRef} 
          width={400} 
          height={400} 
          className="bg-[#1a1a1a] rounded-2xl border border-white/10 shadow-2xl w-full aspect-square max-w-[400px]"
        />
        
        {(isPaused || isGameOver) && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center animate-in fade-in duration-300">
            {isGameOver ? (
              <div className="text-center space-y-4">
                <Trophy size={48} className="text-amber-400 mx-auto mb-2" />
                <h4 className="text-2xl font-black text-white">Game Over</h4>
                <p className="text-slate-300 text-sm font-bold">Score final : {score}</p>
                <button 
                  onClick={resetGame}
                  className="bg-white text-black px-8 py-3 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-200 transition-all flex items-center gap-2 mx-auto"
                >
                  <RotateCcw size={16} /> Rejouer
                </button>
              </div>
            ) : (
              <button 
                onClick={() => setIsPaused(false)}
                className="bg-white text-black w-16 h-16 rounded-2xl flex items-center justify-center hover:scale-110 transition-all shadow-2xl"
              >
                <Play size={32} fill="currentColor" />
              </button>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-4 w-full">
        <button 
          onClick={() => setIsPaused(!isPaused)}
          className="p-4 bg-white/5 border border-white/10 rounded-2xl text-white hover:bg-white/10 transition-all"
        >
          {isPaused ? <Play size={20} fill="currentColor" /> : <Pause size={20} fill="currentColor" />}
        </button>
        <button 
          onClick={resetGame}
          className="p-4 bg-white/5 border border-white/10 rounded-2xl text-white hover:bg-white/10 transition-all"
        >
          <RotateCcw size={20} />
        </button>
      </div>

      {/* Mobile Controls */}
      <div className="grid grid-cols-3 gap-2 sm:hidden mt-4">
        <div />
        <button onClick={() => direction.y === 0 && setDirection({ x: 0, y: -1 })} className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center text-white"><ChevronUp size={24} /></button>
        <div />
        <button onClick={() => direction.x === 0 && setDirection({ x: -1, y: 0 })} className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center text-white"><ChevronLeft size={24} /></button>
        <button onClick={() => direction.y === 0 && setDirection({ x: 0, y: 1 })} className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center text-white"><ChevronDown size={24} /></button>
        <button onClick={() => direction.x === 0 && setDirection({ x: 1, y: 0 })} className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center text-white"><ChevronRight size={24} /></button>
      </div>
      
      <p className="text-[10px] text-slate-500 font-bold hidden sm:block">
        Utilisez les flèches du clavier pour diriger le serpent
      </p>
    </div>
  );
};

export default SnakeGame;
