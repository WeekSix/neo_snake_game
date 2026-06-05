import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Play, RotateCcw, Pause, Keyboard, Zap } from 'lucide-react';

const GRID_SIZE = 20;
const INITIAL_SPEED = 150;
const SPEED_INCREMENT = 2;
const MIN_SPEED = 60;

type Point = { x: number; y: number };
type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

export default function SnakeGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [snake, setSnake] = useState<Point[]>([{ x: 10, y: 10 }]);
  const [food, setFood] = useState<Point>({ x: 15, y: 15 });
  const [direction, setDirection] = useState<Direction>('RIGHT');
  const [isGameOver, setIsGameOver] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [speed, setSpeed] = useState(INITIAL_SPEED);
  const [gameStarted, setGameStarted] = useState(false);

  const directionRef = useRef<Direction>('RIGHT');
  const requestRef = useRef<number>(null);
  const lastUpdateTimeRef = useRef<number>(0);

  // Load high score
  useEffect(() => {
    const saved = localStorage.getItem('neon-snake-highscore');
    if (saved) setHighScore(parseInt(saved, 10));
  }, []);

  // Save high score
  useEffect(() => {
    if (score > highScore) {
      setHighScore(score);
      localStorage.setItem('neon-snake-highscore', score.toString());
    }
  }, [score, highScore]);

  const generateFood = useCallback((currentSnake: Point[]): Point => {
    let newFood: Point;
    while (true) {
      newFood = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE),
      };
      // Check if food is on snake
      const onSnake = currentSnake.some(p => p.x === newFood.x && p.y === newFood.y);
      if (!onSnake) break;
    }
    return newFood;
  }, []);

  const triggerShake = () => {
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 300);
  };

  const resetGame = () => {
    setSnake([{ x: 10, y: 10 }]);
    setFood({ x: 15, y: 15 });
    setDirection('RIGHT');
    directionRef.current = 'RIGHT';
    setIsGameOver(false);
    setScore(0);
    setSpeed(INITIAL_SPEED);
    setGameStarted(true);
    setIsPaused(false);
  };

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowUp':
      case 'w':
      case 'W':
        if (directionRef.current !== 'DOWN') setDirection('UP');
        break;
      case 'ArrowDown':
      case 's':
      case 'S':
        if (directionRef.current !== 'UP') setDirection('DOWN');
        break;
      case 'ArrowLeft':
      case 'a':
      case 'A':
        if (directionRef.current !== 'RIGHT') setDirection('LEFT');
        break;
      case 'ArrowRight':
      case 'd':
      case 'D':
        if (directionRef.current !== 'LEFT') setDirection('RIGHT');
        break;
      case ' ':
        if (gameStarted && !isGameOver) setIsPaused(prev => !prev);
        break;
    }
  }, [gameStarted, isGameOver]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    directionRef.current = direction;
  }, [direction]);

  const update = useCallback((time: number) => {
    if (isPaused || isGameOver || !gameStarted) {
      requestRef.current = requestAnimationFrame(update);
      return;
    }

    const deltaTime = time - lastUpdateTimeRef.current;
    if (deltaTime >= speed) {
      lastUpdateTimeRef.current = time;

      setSnake(prevSnake => {
        const head = prevSnake[0];
        const newHead = { ...head };

        switch (directionRef.current) {
          case 'UP': newHead.y -= 1; break;
          case 'DOWN': newHead.y += 1; break;
          case 'LEFT': newHead.x -= 1; break;
          case 'RIGHT': newHead.x += 1; break;
        }

        // Check collisions
        if (
          newHead.x < 0 || newHead.x >= GRID_SIZE ||
          newHead.y < 0 || newHead.y >= GRID_SIZE ||
          prevSnake.some(p => p.x === newHead.x && p.y === newHead.y)
        ) {
          setIsGameOver(true);
          triggerShake();
          return prevSnake;
        }

        const newSnake = [newHead, ...prevSnake];

        // Check food
        if (newHead.x === food.x && newHead.y === food.y) {
          setScore(s => s + 10);
          setFood(generateFood(newSnake));
          setSpeed(s => Math.max(MIN_SPEED, s - SPEED_INCREMENT));
        } else {
          newSnake.pop();
        }

        return newSnake;
      });
    }

    requestRef.current = requestAnimationFrame(update);
  }, [food, generateFood, isGameOver, isPaused, speed, gameStarted]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(update);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [update]);

  // Render logic
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const cellSize = canvas.width / GRID_SIZE;

    // Clear background
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw grid lines (subtle)
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 1;
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

    // Draw food
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#ff0055';
    ctx.fillStyle = '#ff0055';
    ctx.beginPath();
    ctx.arc(
      food.x * cellSize + cellSize / 2,
      food.y * cellSize + cellSize / 2,
      cellSize / 2.5,
      0,
      Math.PI * 2
    );
    ctx.fill();

    // Draw snake
    ctx.shadowBlur = 10;
    snake.forEach((p, i) => {
      const isHead = i === 0;
      ctx.shadowColor = isHead ? '#00f2ff' : '#0066ff';
      ctx.fillStyle = isHead ? '#00f2ff' : '#0066ff';
      
      // Rounded rectangles for snake body
      const padding = 2;
      ctx.beginPath();
      ctx.roundRect(
        p.x * cellSize + padding,
        p.y * cellSize + padding,
        cellSize - padding * 2,
        cellSize - padding * 2,
        4
      );
      ctx.fill();

      // Eyes for the head
      if (isHead) {
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#000';
        const eyeSize = cellSize / 6;
        const eyeOffset = cellSize / 4;
        
        // Position eyes based on direction
        let eye1: Point, eye2: Point;
        switch (directionRef.current) {
          case 'UP':
            eye1 = { x: p.x * cellSize + eyeOffset, y: p.y * cellSize + eyeOffset };
            eye2 = { x: p.x * cellSize + cellSize - eyeOffset, y: p.y * cellSize + eyeOffset };
            break;
          case 'DOWN':
            eye1 = { x: p.x * cellSize + eyeOffset, y: p.y * cellSize + cellSize - eyeOffset };
            eye2 = { x: p.x * cellSize + cellSize - eyeOffset, y: p.y * cellSize + cellSize - eyeOffset };
            break;
          case 'LEFT':
            eye1 = { x: p.x * cellSize + eyeOffset, y: p.y * cellSize + eyeOffset };
            eye2 = { x: p.x * cellSize + eyeOffset, y: p.y * cellSize + cellSize - eyeOffset };
            break;
          case 'RIGHT':
            eye1 = { x: p.x * cellSize + cellSize - eyeOffset, y: p.y * cellSize + eyeOffset };
            eye2 = { x: p.x * cellSize + cellSize - eyeOffset, y: p.y * cellSize + cellSize - eyeOffset };
            break;
        }
        ctx.fillRect(eye1.x - eyeSize/2, eye1.y - eyeSize/2, eyeSize, eyeSize);
        ctx.fillRect(eye2.x - eyeSize/2, eye2.y - eyeSize/2, eyeSize, eyeSize);
      }
    });

    // Reset shadow for next frame
    ctx.shadowBlur = 0;
  }, [snake, food]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#050505] text-white p-4 font-sans">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ 
          opacity: 1, 
          y: 0,
          x: isShaking ? [0, -10, 10, -10, 10, 0] : 0
        }}
        transition={{
          x: isShaking ? { duration: 0.3, ease: "easeInOut" } : { duration: 0.5 }
        }}
        className="w-full max-w-md"
      >
        {/* Header */}
        <div className="flex justify-between items-end mb-6">
          <div>
            <h1 className="text-4xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-[#00f2ff] to-[#0066ff] uppercase">
              Neon Snake
            </h1>
            <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-gray-500">Cybernetic Protocol v1.0</p>
          </div>
          <div className="text-right">
            <div className="text-[10px] font-mono uppercase text-gray-500 mb-1">High Score</div>
            <div className="text-xl font-bold font-mono text-[#ff0055]">{highScore.toString().padStart(6, '0')}</div>
          </div>
        </div>

        {/* Game Container */}
        <div className="relative aspect-square w-full bg-[#0a0a0a] border border-gray-800 rounded-xl overflow-hidden shadow-2xl shadow-[#00f2ff]/5">
          <canvas
            ref={canvasRef}
            width={400}
            height={400}
            className="w-full h-full block"
          />

          {/* Overlays */}
          <AnimatePresence>
            {!gameStarted && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center p-8 text-center"
              >
                <Zap className="w-12 h-12 text-[#00f2ff] mb-4 animate-pulse" />
                <h2 className="text-2xl font-bold mb-2 uppercase tracking-widest">Initialize System</h2>
                <p className="text-gray-400 text-sm mb-8">Use WASD or Arrow Keys to navigate the data stream.</p>
                <button 
                  onClick={resetGame}
                  className="group relative px-8 py-3 bg-transparent border-2 border-[#00f2ff] text-[#00f2ff] font-bold uppercase tracking-widest overflow-hidden transition-all hover:bg-[#00f2ff] hover:text-black"
                >
                  <span className="relative z-10 flex items-center gap-2">
                    <Play className="w-4 h-4" /> Start Protocol
                  </span>
                </button>
              </motion.div>
            )}

            {isGameOver && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="absolute inset-0 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center"
              >
                <h2 className="text-4xl font-black text-[#ff0055] mb-2 uppercase tracking-tighter italic">Connection Lost</h2>
                <div className="mb-8">
                  <div className="text-gray-500 text-xs uppercase font-mono mb-1">Final Score</div>
                  <div className="text-5xl font-black font-mono text-white">{score}</div>
                </div>
                <button 
                  onClick={resetGame}
                  className="flex items-center gap-2 px-8 py-3 bg-[#ff0055] text-white font-bold uppercase tracking-widest rounded-sm hover:bg-[#ff3377] transition-colors"
                >
                  <RotateCcw className="w-4 h-4" /> Reboot
                </button>
              </motion.div>
            )}

            {isPaused && !isGameOver && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center"
              >
                <div className="flex flex-col items-center gap-2">
                  <Pause className="w-12 h-12 text-white animate-pulse" />
                  <span className="text-xs font-mono uppercase tracking-[0.3em]">System Paused</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer Stats */}
        <div className="grid grid-cols-3 gap-4 mt-6">
          <div className="bg-[#0a0a0a] border border-gray-800 p-3 rounded-lg">
            <div className="text-[10px] font-mono uppercase text-gray-500 mb-1">Score</div>
            <div className="text-xl font-bold font-mono text-[#00f2ff]">{score.toString().padStart(4, '0')}</div>
          </div>
          <div className="bg-[#0a0a0a] border border-gray-800 p-3 rounded-lg">
            <div className="text-[10px] font-mono uppercase text-gray-500 mb-1 flex items-center gap-1">
              <Zap className="w-2 h-2" /> Speed
            </div>
            <div className="text-xl font-bold font-mono text-white">
              {Math.round((160 - speed) / 10)}x
            </div>
          </div>
          <div className="bg-[#0a0a0a] border border-gray-800 p-3 rounded-lg">
            <div className="text-[10px] font-mono uppercase text-gray-500 mb-1 flex items-center gap-1">
              <Keyboard className="w-2 h-2" /> Input
            </div>
            <div className="text-xs font-bold font-mono text-gray-300 truncate">
              {direction}
            </div>
          </div>
        </div>

        {/* Controls Hint */}
        <div className="mt-8 flex justify-center gap-8 text-[10px] font-mono uppercase text-gray-600 tracking-widest">
          <div className="flex items-center gap-2">
            <span className="px-1.5 py-0.5 border border-gray-700 rounded">WASD</span>
            <span>Move</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-1.5 py-0.5 border border-gray-700 rounded">SPACE</span>
            <span>Pause</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
