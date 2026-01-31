'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Script from 'next/script';
import {
  ScoreFlow,
  Leaderboard,
  ShareButtonContainer,
  type ScoreFlowColors,
  type LeaderboardColors,
} from '@/app/pixelpit/components';

// =============================================================================
// NEON PLAYROOM STYLE — from styleguide
// =============================================================================

const COLORS = {
  bg: {
    deep: '#0f172a',      // main background
    surface: '#1e293b',   // cards, panels
    elevated: '#334155',  // hover states
  },
  primary: {
    pink: '#ec4899',      // Hot pink — THE lead
    cyan: '#22d3ee',      // Electric cyan — secondary
    yellow: '#fbbf24',    // Amber — energy, coins
    green: '#34d399',     // Emerald — success
    purple: '#a78bfa',    // Violet — special
  },
  text: {
    primary: '#f8fafc',
    secondary: '#94a3b8',
    muted: '#64748b',
  },
};

const SHADOWS = {
  md: '3px 3px 0px 0px rgba(0,0,0,0.8)',
  lg: '4px 4px 0px 0px rgba(0,0,0,0.8)',
};

// Bubble colors — vibrant to match Neon Playroom
const BUBBLE_COLORS = [
  COLORS.primary.pink,
  COLORS.primary.cyan,
  COLORS.primary.yellow,
  COLORS.primary.green,
  COLORS.primary.purple,
  '#f87171', // coral red
];

// Component color mappings
const SCORE_FLOW_COLORS: ScoreFlowColors = {
  bg: COLORS.bg.deep,
  surface: COLORS.bg.surface,
  primary: COLORS.primary.pink,
  secondary: COLORS.primary.cyan,
  text: COLORS.text.primary,
  muted: COLORS.text.secondary,
  error: '#f87171',
};

const LEADERBOARD_COLORS: LeaderboardColors = {
  bg: COLORS.bg.deep,
  surface: COLORS.bg.surface,
  primary: COLORS.primary.pink,
  secondary: COLORS.primary.cyan,
  text: COLORS.text.primary,
  muted: COLORS.text.secondary,
};

// =============================================================================
// CHAIN SCORING
// =============================================================================

// Chain of 2=10pts, 3=30pts, 5=100pts, 10+=500pts
function getChainScore(chainLength: number): number {
  if (chainLength < 2) return 0;
  if (chainLength >= 10) return 500;
  if (chainLength >= 5) return 100;
  if (chainLength >= 3) return 30;
  return 10; // chain of 2
}

// =============================================================================
// TYPES
// =============================================================================

interface Bubble {
  id: number;
  x: number;
  y: number;
  radius: number;
  color: string;
  colorIndex: number;
  vy: number;
  popping: boolean;
  popProgress: number;
}

interface PopEffect {
  x: number;
  y: number;
  color: string;
  progress: number;
  chainSize: number;
  scoreValue: number;
}

type GameState = 'menu' | 'playing' | 'gameover' | 'leaderboard';

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function PopGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<GameState>('menu');
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [socialLoaded, setSocialLoaded] = useState(false);
  const [submittedEntryId, setSubmittedEntryId] = useState<number | null>(null);

  // Game state refs
  const bubblesRef = useRef<Bubble[]>([]);
  const effectsRef = useRef<PopEffect[]>([]);
  const scoreRef = useRef(0);
  const levelRef = useRef(1);
  const bubbleIdRef = useRef(0);
  const frameRef = useRef(0);
  const lastTimeRef = useRef(0);
  const gameRunningRef = useRef(false);
  const escapedBubblesRef = useRef(0);
  const maxEscapedRef = useRef(10);

  const GAME_ID = 'pop';

  // Difficulty by level
  const getDifficulty = useCallback((lvl: number) => {
    const baseSpeed = 0.4;
    const speedIncrease = 0.08 * (lvl - 1);
    const numColors = Math.min(3 + Math.floor(lvl / 2), BUBBLE_COLORS.length);
    const spawnRate = Math.max(100 - (lvl * 8), 35);
    return {
      riseSpeed: baseSpeed + speedIncrease,
      numColors,
      spawnRate,
      bubbleRadius: 26,
    };
  }, []);

  const initGame = useCallback(() => {
    bubblesRef.current = [];
    effectsRef.current = [];
    scoreRef.current = 0;
    levelRef.current = 1;
    bubbleIdRef.current = 0;
    frameRef.current = 0;
    escapedBubblesRef.current = 0;
    setScore(0);
    setLevel(1);
    setSubmittedEntryId(null);
  }, []);

  const spawnBubble = useCallback((canvasWidth: number, canvasHeight: number) => {
    const difficulty = getDifficulty(levelRef.current);
    const colorIndex = Math.floor(Math.random() * difficulty.numColors);
    const radius = difficulty.bubbleRadius;
    const x = radius + Math.random() * (canvasWidth - radius * 2);

    const bubble: Bubble = {
      id: bubbleIdRef.current++,
      x,
      y: canvasHeight + radius,
      radius,
      color: BUBBLE_COLORS[colorIndex],
      colorIndex,
      vy: -difficulty.riseSpeed,
      popping: false,
      popProgress: 0,
    };

    bubblesRef.current.push(bubble);
  }, [getDifficulty]);

  const findConnectedBubbles = useCallback((startBubble: Bubble, bubbles: Bubble[]): Bubble[] => {
    const connected: Set<number> = new Set();
    const toCheck: Bubble[] = [startBubble];
    const targetColor = startBubble.colorIndex;

    while (toCheck.length > 0) {
      const current = toCheck.pop()!;
      if (connected.has(current.id)) continue;
      if (current.colorIndex !== targetColor) continue;
      if (current.popping) continue;

      connected.add(current.id);

      for (const other of bubbles) {
        if (connected.has(other.id)) continue;
        if (other.colorIndex !== targetColor) continue;
        if (other.popping) continue;

        const dx = current.x - other.x;
        const dy = current.y - other.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const touchDist = current.radius + other.radius + 6;

        if (dist < touchDist) {
          toCheck.push(other);
        }
      }
    }

    return bubbles.filter(b => connected.has(b.id));
  }, []);

  const handleTap = useCallback((tapX: number, tapY: number) => {
    if (!gameRunningRef.current) return;

    const bubbles = bubblesRef.current;

    let tappedBubble: Bubble | null = null;
    for (const bubble of bubbles) {
      if (bubble.popping) continue;
      const dx = tapX - bubble.x;
      const dy = tapY - bubble.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < bubble.radius) {
        tappedBubble = bubble;
        break;
      }
    }

    if (!tappedBubble) return;

    const chain = findConnectedBubbles(tappedBubble, bubbles);

    if (chain.length >= 2) {
      const chainScore = getChainScore(chain.length);
      scoreRef.current += chainScore;
      setScore(scoreRef.current);

      for (const bubble of chain) {
        bubble.popping = true;
        bubble.popProgress = 0;
      }

      let cx = 0, cy = 0;
      for (const b of chain) {
        cx += b.x;
        cy += b.y;
      }
      cx /= chain.length;
      cy /= chain.length;

      effectsRef.current.push({
        x: cx,
        y: cy,
        color: tappedBubble.color,
        progress: 0,
        chainSize: chain.length,
        scoreValue: chainScore,
      });

      const newLevel = Math.floor(scoreRef.current / 500) + 1;
      if (newLevel > levelRef.current) {
        levelRef.current = newLevel;
        setLevel(newLevel);
      }
    }
  }, [findConnectedBubbles]);

  const gameLoop = useCallback((timestamp: number) => {
    if (!gameRunningRef.current) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    lastTimeRef.current = timestamp;

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.width / dpr;
    const height = canvas.height / dpr;

    // Clear
    ctx.fillStyle = COLORS.bg.deep;
    ctx.fillRect(0, 0, width, height);

    // Subtle grid background
    ctx.strokeStyle = 'rgba(236, 72, 153, 0.05)';
    ctx.lineWidth = 1;
    const gridSize = 32;
    for (let x = 0; x < width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Spawn bubbles
    frameRef.current++;
    const difficulty = getDifficulty(levelRef.current);
    if (frameRef.current % difficulty.spawnRate === 0) {
      spawnBubble(width, height);
    }

    // Update bubbles
    const activeBubbles: Bubble[] = [];
    for (const bubble of bubblesRef.current) {
      if (bubble.popping) {
        bubble.popProgress += 0.12;
        if (bubble.popProgress >= 1) continue;
        activeBubbles.push(bubble);
      } else {
        bubble.y += bubble.vy;

        if (bubble.y + bubble.radius < 0) {
          escapedBubblesRef.current++;
          if (escapedBubblesRef.current >= maxEscapedRef.current) {
            gameRunningRef.current = false;
            // Track play
            if (scoreRef.current >= 1) {
              fetch('/api/pixelpit/stats', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ game: GAME_ID }),
              }).catch(() => {});
            }
            setGameState('gameover');
            return;
          }
          continue;
        }

        activeBubbles.push(bubble);
      }
    }
    bubblesRef.current = activeBubbles;

    // Update effects
    const activeEffects: PopEffect[] = [];
    for (const effect of effectsRef.current) {
      effect.progress += 0.04;
      if (effect.progress < 1) {
        activeEffects.push(effect);
      }
    }
    effectsRef.current = activeEffects;

    // Draw bubbles
    for (const bubble of bubblesRef.current) {
      ctx.save();

      if (bubble.popping) {
        const scale = 1 + bubble.popProgress * 0.6;
        const alpha = 1 - bubble.popProgress;
        ctx.globalAlpha = alpha;

        // Popping glow
        ctx.shadowBlur = 30;
        ctx.shadowColor = bubble.color;

        ctx.beginPath();
        ctx.arc(bubble.x, bubble.y, bubble.radius * scale, 0, Math.PI * 2);
        ctx.fillStyle = bubble.color;
        ctx.fill();
      } else {
        // Bubble with glow
        ctx.shadowBlur = 15;
        ctx.shadowColor = bubble.color;

        ctx.beginPath();
        ctx.arc(bubble.x, bubble.y, bubble.radius, 0, Math.PI * 2);

        // Gradient fill
        const gradient = ctx.createRadialGradient(
          bubble.x - bubble.radius * 0.3,
          bubble.y - bubble.radius * 0.3,
          bubble.radius * 0.1,
          bubble.x,
          bubble.y,
          bubble.radius
        );
        gradient.addColorStop(0, '#ffffff');
        gradient.addColorStop(0.2, bubble.color);
        gradient.addColorStop(1, bubble.color);

        ctx.fillStyle = gradient;
        ctx.fill();

        // Hard pixel border
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Highlight
        ctx.beginPath();
        ctx.arc(
          bubble.x - bubble.radius * 0.25,
          bubble.y - bubble.radius * 0.25,
          bubble.radius * 0.18,
          0,
          Math.PI * 2
        );
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.fill();
      }

      ctx.restore();
    }

    // Draw effects
    for (const effect of effectsRef.current) {
      const alpha = 1 - effect.progress;
      const radius = 40 + effect.progress * 80;

      ctx.beginPath();
      ctx.arc(effect.x, effect.y, radius, 0, Math.PI * 2);
      ctx.strokeStyle = effect.color;
      ctx.lineWidth = 4;
      ctx.globalAlpha = alpha * 0.6;
      ctx.stroke();
      ctx.globalAlpha = 1;

      // Score popup
      if (effect.progress < 0.7) {
        const textAlpha = 1 - (effect.progress / 0.7);
        ctx.globalAlpha = textAlpha;
        ctx.font = 'bold 18px monospace';
        ctx.fillStyle = COLORS.primary.yellow;
        ctx.textAlign = 'center';
        ctx.shadowBlur = 10;
        ctx.shadowColor = COLORS.primary.yellow;
        ctx.fillText(`+${effect.scoreValue}`, effect.x, effect.y - 30 - effect.progress * 50);
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
      }
    }

    // Escape warning bar at top
    const escapedRatio = escapedBubblesRef.current / maxEscapedRef.current;
    if (escapedRatio > 0) {
      // Background bar
      ctx.fillStyle = COLORS.bg.surface;
      ctx.fillRect(0, 0, width, 6);

      // Progress bar
      ctx.fillStyle = '#f87171';
      ctx.fillRect(0, 0, width * escapedRatio, 6);

      // Glow when getting critical
      if (escapedRatio > 0.6) {
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#f87171';
        ctx.fillRect(0, 0, width * escapedRatio, 6);
        ctx.shadowBlur = 0;
      }
    }

    requestAnimationFrame(gameLoop);
  }, [getDifficulty, spawnBubble]);

  const startGame = useCallback(() => {
    initGame();
    gameRunningRef.current = true;
    lastTimeRef.current = performance.now();
    setGameState('playing');
    requestAnimationFrame(gameLoop);
  }, [initGame, gameLoop]);

  // Canvas resize
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const container = canvas.parentElement;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;

      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(dpr, dpr);
      }
    };

    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  // Input handlers
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const getCanvasCoords = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect();
      return {
        x: clientX - rect.left,
        y: clientY - rect.top,
      };
    };

    const handleTouch = (e: TouchEvent) => {
      e.preventDefault();
      const touch = e.touches[0];
      const { x, y } = getCanvasCoords(touch.clientX, touch.clientY);
      handleTap(x, y);
    };

    const handleClick = (e: MouseEvent) => {
      const { x, y } = getCanvasCoords(e.clientX, e.clientY);
      handleTap(x, y);
    };

    canvas.addEventListener('touchstart', handleTouch, { passive: false });
    canvas.addEventListener('click', handleClick);

    return () => {
      canvas.removeEventListener('touchstart', handleTouch);
      canvas.removeEventListener('click', handleClick);
    };
  }, [handleTap]);

  // =============================================================================
  // RENDER
  // =============================================================================

  return (
    <div
      data-testid="pop-game"
      className="min-h-screen flex flex-col font-mono"
      style={{ backgroundColor: COLORS.bg.deep }}
    >
      <Script src="/pixelpit/social.js" onLoad={() => setSocialLoaded(true)} />

      {/* HUD - visible during gameplay */}
      {gameState === 'playing' && (
        <div
          data-testid="game-hud"
          className="absolute top-4 left-0 right-0 z-10 flex justify-between px-4"
          style={{ pointerEvents: 'none' }}
        >
          <div
            data-testid="score-display"
            className="font-mono text-lg tracking-tight"
            style={{ color: COLORS.primary.yellow, textShadow: '2px 2px 0 rgba(0,0,0,0.5)' }}
          >
            {score}
          </div>
          <div
            data-testid="level-display"
            className="font-mono text-sm tracking-tight"
            style={{ color: COLORS.primary.cyan, textShadow: '2px 2px 0 rgba(0,0,0,0.5)' }}
          >
            LVL {level}
          </div>
        </div>
      )}

      {/* Game Canvas */}
      {gameState === 'playing' && (
        <div className="flex-1 relative" data-testid="game-canvas-container">
          <canvas
            ref={canvasRef}
            data-testid="game-canvas"
            className="absolute inset-0 w-full h-full touch-none"
          />
        </div>
      )}

      {/* Menu Screen */}
      {gameState === 'menu' && (
        <div
          data-testid="menu-screen"
          className="flex-1 flex flex-col items-center justify-center p-6 text-center"
        >
          {/* Title */}
          <h1
            className="text-4xl font-bold mb-2 tracking-tight font-mono"
            style={{
              color: COLORS.primary.pink,
              textShadow: `4px 4px 0px ${COLORS.primary.cyan}`,
            }}
          >
            POP
          </h1>
          <p
            className="text-xs mb-8 tracking-widest uppercase font-mono"
            style={{ color: COLORS.text.secondary }}
          >
            chain reaction bubbles
          </p>

          {/* Instructions Card */}
          <div
            className="p-4 mb-6 border-2 border-black text-left"
            style={{
              backgroundColor: COLORS.bg.surface,
              boxShadow: SHADOWS.lg,
              maxWidth: 280,
            }}
          >
            <div className="text-xs font-mono space-y-2" style={{ color: COLORS.text.primary }}>
              <p><span style={{ color: COLORS.primary.pink }}>►</span> Tap bubbles to pop</p>
              <p><span style={{ color: COLORS.primary.cyan }}>►</span> Same colors chain together</p>
              <p><span style={{ color: COLORS.primary.yellow }}>►</span> Don&apos;t let them escape!</p>
            </div>
          </div>

          {/* Scoring Card */}
          <div
            className="p-3 mb-8 border-2 border-black"
            style={{
              backgroundColor: COLORS.bg.surface,
              boxShadow: SHADOWS.md,
              maxWidth: 200,
            }}
          >
            <div className="text-xs font-mono" style={{ color: COLORS.primary.yellow }}>
              <p>2 = 10 pts</p>
              <p>3 = 30 pts</p>
              <p>5 = 100 pts</p>
              <p>10+ = 500 pts</p>
            </div>
          </div>

          {/* Play Button */}
          <button
            data-testid="start-button"
            onClick={startGame}
            className="px-8 py-4 text-sm font-bold uppercase tracking-widest font-mono border-2 border-black transition-all active:translate-x-1 active:translate-y-1 active:shadow-none"
            style={{
              backgroundColor: COLORS.primary.pink,
              color: '#000000',
              boxShadow: SHADOWS.lg,
            }}
          >
            PLAY
          </button>

          {/* Branding */}
          <div className="mt-8 text-xs font-mono tracking-widest">
            <span style={{ color: COLORS.primary.pink }}>PIXEL</span>
            <span style={{ color: COLORS.primary.cyan }}>PIT</span>
            <span style={{ color: COLORS.text.muted }}> arcade</span>
          </div>
        </div>
      )}

      {/* Game Over Screen */}
      {gameState === 'gameover' && (
        <div
          data-testid="gameover-screen"
          className="flex-1 flex flex-col items-center justify-center p-6"
        >
          <h2
            className="text-xl font-bold mb-2 tracking-widest uppercase font-mono"
            style={{ color: COLORS.text.secondary }}
          >
            game over
          </h2>
          <div
            data-testid="final-score"
            className="text-5xl font-bold mb-6 font-mono"
            style={{
              color: COLORS.primary.yellow,
              textShadow: `0 0 30px ${COLORS.primary.yellow}60`,
            }}
          >
            {score}
          </div>

          {/* Score Flow */}
          <div className="w-full max-w-sm mb-6">
            <ScoreFlow
              score={score}
              gameId={GAME_ID}
              colors={SCORE_FLOW_COLORS}
              onRankReceived={(rank, entryId) => {
                setSubmittedEntryId(entryId ?? null);
              }}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-3 w-full max-w-xs">
            <button
              data-testid="play-again-button"
              onClick={startGame}
              className="px-6 py-3 text-xs font-bold uppercase tracking-widest font-mono border-2 border-black transition-all active:translate-x-1 active:translate-y-1 active:shadow-none"
              style={{
                backgroundColor: COLORS.primary.pink,
                color: '#000000',
                boxShadow: SHADOWS.lg,
              }}
            >
              PLAY AGAIN
            </button>

            <button
              data-testid="leaderboard-button"
              onClick={() => setGameState('leaderboard')}
              className="px-6 py-3 text-xs font-bold uppercase tracking-widest font-mono border-2 border-black transition-all active:translate-x-1 active:translate-y-1 active:shadow-none"
              style={{
                backgroundColor: COLORS.primary.cyan,
                color: '#000000',
                boxShadow: SHADOWS.lg,
              }}
            >
              LEADERBOARD
            </button>

            <ShareButtonContainer
              id="share-btn-pop"
              url={typeof window !== 'undefined'
                ? `${window.location.origin}/pixelpit/arcade/pop/share/${score}`
                : ''
              }
              text={`I scored ${score} on POP! Can you beat my chain reactions?`}
              style="minimal"
              socialLoaded={socialLoaded}
            />
          </div>
        </div>
      )}

      {/* Leaderboard Screen */}
      {gameState === 'leaderboard' && (
        <div data-testid="leaderboard-screen" className="flex-1 p-4">
          <Leaderboard
            gameId={GAME_ID}
            limit={8}
            entryId={submittedEntryId ?? undefined}
            colors={LEADERBOARD_COLORS}
            onClose={() => setGameState('gameover')}
          />
        </div>
      )}
    </div>
  );
}
