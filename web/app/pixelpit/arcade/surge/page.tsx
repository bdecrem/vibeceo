'use client';

import React, { useEffect, useRef, useState } from 'react';
import Script from 'next/script';
import {
  ScoreFlow,
  Leaderboard,
  ShareButtonContainer,
  usePixelpitSocial,
  type ScoreFlowColors,
  type LeaderboardColors,
} from '@/app/pixelpit/components';

// SURGE theme - Electric yellow energy, dark grid, purple black holes
const THEME = {
  bgPrimary: '#0a0a12',      // deep dark
  bgSecondary: '#12121e',    // cards, surface
  energyColor: '#facc15',    // electric yellow
  energyGlow: '#fde047',     // bright yellow glow
  blackHoleColor: '#7c3aed', // purple
  blackHoleGlow: '#a855f7',  // light purple
  gridColor: '#1e1e2e',      // subtle grid
  emptyCell: '#16161f',      // unlit cell
  particleColors: ['#facc15', '#fde047', '#a855f7'],
};

const COLORS = {
  bg: '#0a0a12',
  surface: '#12121e',
  yellow: '#facc15',
  yellowLight: '#fde047',
  purple: '#7c3aed',
  purpleLight: '#a855f7',
  cream: '#f8fafc',
  muted: '#94a3b8',
  coral: '#f87171',
};

const SCORE_FLOW_COLORS: ScoreFlowColors = {
  bg: COLORS.bg,
  surface: COLORS.surface,
  primary: COLORS.yellow,
  secondary: COLORS.purple,
  text: COLORS.cream,
  muted: COLORS.muted,
  error: COLORS.coral,
};

const LEADERBOARD_COLORS: LeaderboardColors = {
  bg: COLORS.bg,
  surface: COLORS.surface,
  primary: COLORS.yellow,
  secondary: COLORS.purple,
  text: COLORS.cream,
  muted: COLORS.muted,
};

// Cell states
const CELL_EMPTY = 0;
const CELL_ENERGIZED = 1;
const CELL_BLACK_HOLE = 2;
const CELL_FLICKERING = 3; // appears/disappears

// Difficulty levels
const LEVELS = [
  { name: 'level 1', timeLimit: 30, blackHoles: 3, flickering: 0, spreadDelay: 150 },
  { name: 'level 2', timeLimit: 28, blackHoles: 5, flickering: 0, spreadDelay: 140 },
  { name: 'level 3', timeLimit: 26, blackHoles: 7, flickering: 2, spreadDelay: 130 },
  { name: 'level 4', timeLimit: 24, blackHoles: 9, flickering: 3, spreadDelay: 120 },
  { name: 'level 5', timeLimit: 22, blackHoles: 12, flickering: 4, spreadDelay: 110 },
  { name: 'surge!', timeLimit: 20, blackHoles: 15, flickering: 5, spreadDelay: 100 },
];

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

const GAME_ID = 'surge';
const GRID_SIZE = 10; // 10x10 grid
const TARGET_COVERAGE = 0.90; // 90% to win

export default function SurgeGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<'start' | 'playing' | 'gameover' | 'victory' | 'leaderboard'>('start');
  const [score, setScore] = useState(0);
  const [coverage, setCoverage] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [currentLevel, setCurrentLevel] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [socialLoaded, setSocialLoaded] = useState(false);
  const [submittedEntryId, setSubmittedEntryId] = useState<number | null>(null);

  // Initialize social hooks
  usePixelpitSocial(socialLoaded);

  // Game refs
  const gameRef = useRef({
    running: false,
    level: 0,
    grid: [] as number[][],
    energizedCells: new Set<string>(),
    blackHoles: new Set<string>(),
    flickeringCells: new Map<string, { visible: boolean; nextFlip: number }>(),
    spreadQueue: [] as { x: number; y: number; time: number }[],
    lastSpreadTime: 0,
    spreadDelay: 150,
    timeLeft: 30,
    startTime: 0,
    coverage: 0,
    particles: [] as Particle[],
    screenShake: { x: 0, y: 0, intensity: 0 },
    audioCtx: null as AudioContext | null,
    masterGain: null as GainNode | null,
    pulsePhase: 0,
    frameCount: 0,
  });

  // Audio functions
  const initAudio = () => {
    const game = gameRef.current;
    if (game.audioCtx) return;
    game.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    game.masterGain = game.audioCtx.createGain();
    game.masterGain.connect(game.audioCtx.destination);
    game.masterGain.gain.value = soundEnabled ? 1 : 0;
  };

  const playSoftSound = (freq: number, dur: number, type: OscillatorType, vol: number, cutoff: number) => {
    const game = gameRef.current;
    if (!game.audioCtx || !soundEnabled || !game.masterGain) return;
    const osc = game.audioCtx.createOscillator();
    const flt = game.audioCtx.createBiquadFilter();
    const gain = game.audioCtx.createGain();
    osc.connect(flt);
    flt.connect(gain);
    gain.connect(game.masterGain);
    osc.type = type;
    osc.frequency.value = freq;
    flt.type = 'lowpass';
    flt.frequency.value = cutoff;
    gain.gain.setValueAtTime(vol, game.audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, game.audioCtx.currentTime + dur);
    osc.start();
    osc.stop(game.audioCtx.currentTime + dur);
  };

  const tapSound = () => playSoftSound(800, 0.08, 'sine', 0.12, 2000);
  const spreadSound = () => playSoftSound(600 + Math.random() * 200, 0.05, 'triangle', 0.05, 1500);
  const blackHoleSound = () => playSoftSound(150, 0.15, 'sawtooth', 0.08, 400);
  const victorySound = () => {
    playSoftSound(523, 0.15, 'sine', 0.1, 3000);
    setTimeout(() => playSoftSound(659, 0.15, 'sine', 0.1, 3000), 100);
    setTimeout(() => playSoftSound(784, 0.2, 'sine', 0.12, 3000), 200);
  };
  const gameOverSound = () => playSoftSound(200, 0.4, 'sawtooth', 0.1, 300);

  // Initialize grid for a level
  const initGrid = (level: number) => {
    const game = gameRef.current;
    const levelData = LEVELS[level];

    game.grid = [];
    game.energizedCells.clear();
    game.blackHoles.clear();
    game.flickeringCells.clear();
    game.spreadQueue = [];
    game.particles = [];

    // Create empty grid
    for (let y = 0; y < GRID_SIZE; y++) {
      game.grid[y] = [];
      for (let x = 0; x < GRID_SIZE; x++) {
        game.grid[y][x] = CELL_EMPTY;
      }
    }

    // Place black holes randomly
    const positions: string[] = [];
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        positions.push(`${x},${y}`);
      }
    }

    // Shuffle and pick black hole positions
    for (let i = positions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [positions[i], positions[j]] = [positions[j], positions[i]];
    }

    for (let i = 0; i < levelData.blackHoles && i < positions.length; i++) {
      const [x, y] = positions[i].split(',').map(Number);
      game.grid[y][x] = CELL_BLACK_HOLE;
      game.blackHoles.add(`${x},${y}`);
    }

    // Place flickering cells
    const remainingPositions = positions.slice(levelData.blackHoles);
    for (let i = 0; i < levelData.flickering && i < remainingPositions.length; i++) {
      const [x, y] = remainingPositions[i].split(',').map(Number);
      game.grid[y][x] = CELL_FLICKERING;
      game.flickeringCells.set(`${x},${y}`, {
        visible: Math.random() > 0.5,
        nextFlip: Date.now() + 1000 + Math.random() * 2000
      });
    }

    game.spreadDelay = levelData.spreadDelay;
    game.timeLeft = levelData.timeLimit;
    game.coverage = 0;
  };

  // Calculate coverage percentage
  const calculateCoverage = (): number => {
    const game = gameRef.current;
    let totalCells = 0;
    let energizedCells = 0;

    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        const cell = game.grid[y][x];
        if (cell !== CELL_BLACK_HOLE) {
          totalCells++;
          if (game.energizedCells.has(`${x},${y}`)) {
            energizedCells++;
          }
        }
      }
    }

    return totalCells > 0 ? energizedCells / totalCells : 0;
  };

  // Calculate final score
  const calculateScore = (coveragePercent: number, timeRemaining: number, level: number): number => {
    const baseScore = Math.floor(coveragePercent * 1000);
    const speedBonus = Math.floor(timeRemaining * 10);
    const perfectBonus = coveragePercent >= 1.0 ? baseScore : 0; // 2x multiplier for 100%
    const levelBonus = level * 100;

    return baseScore + speedBonus + perfectBonus + levelBonus;
  };

  // Energize a cell and queue spreading
  const energizeCell = (x: number, y: number) => {
    const game = gameRef.current;
    const key = `${x},${y}`;

    if (x < 0 || x >= GRID_SIZE || y < 0 || y >= GRID_SIZE) return false;
    if (game.energizedCells.has(key)) return false;
    if (game.blackHoles.has(key)) {
      blackHoleSound();
      // Screen shake when hitting black hole
      game.screenShake.intensity = 8;
      return false;
    }

    // Check flickering cell
    const flickerState = game.flickeringCells.get(key);
    if (flickerState && !flickerState.visible) return false;

    game.energizedCells.add(key);
    spreadSound();

    // Spawn particles
    const canvas = canvasRef.current;
    if (canvas) {
      const cellSize = Math.min(canvas.width, canvas.height) * 0.8 / GRID_SIZE;
      const offsetX = (canvas.width - cellSize * GRID_SIZE) / 2;
      const offsetY = (canvas.height - cellSize * GRID_SIZE) / 2;
      const px = offsetX + x * cellSize + cellSize / 2;
      const py = offsetY + y * cellSize + cellSize / 2;

      for (let i = 0; i < 4; i++) {
        game.particles.push({
          x: px,
          y: py,
          vx: (Math.random() - 0.5) * 4,
          vy: (Math.random() - 0.5) * 4,
          life: 20 + Math.random() * 10,
          maxLife: 30,
          color: THEME.particleColors[Math.floor(Math.random() * THEME.particleColors.length)],
          size: 2 + Math.random() * 2,
        });
      }
    }

    // Queue spreading to neighbors
    const now = Date.now();
    const neighbors = [
      { x: x - 1, y },
      { x: x + 1, y },
      { x, y: y - 1 },
      { x, y: y + 1 },
    ];

    neighbors.forEach(n => {
      if (n.x >= 0 && n.x < GRID_SIZE && n.y >= 0 && n.y < GRID_SIZE) {
        game.spreadQueue.push({ x: n.x, y: n.y, time: now + game.spreadDelay });
      }
    });

    return true;
  };

  // Handle tap/click on grid
  const handleGridInput = (clientX: number, clientY: number) => {
    const game = gameRef.current;
    const canvas = canvasRef.current;
    if (!game.running || !canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    const cellSize = Math.min(canvas.width, canvas.height) * 0.8 / GRID_SIZE;
    const offsetX = (canvas.width - cellSize * GRID_SIZE) / 2;
    const offsetY = (canvas.height - cellSize * GRID_SIZE) / 2;

    const gridX = Math.floor((x - offsetX) / cellSize);
    const gridY = Math.floor((y - offsetY) / cellSize);

    if (gridX >= 0 && gridX < GRID_SIZE && gridY >= 0 && gridY < GRID_SIZE) {
      if (energizeCell(gridX, gridY)) {
        tapSound();
      }
    }
  };

  // Start game
  const startGame = (level: number = 0) => {
    const game = gameRef.current;
    initAudio();
    if (game.audioCtx?.state === 'suspended') game.audioCtx.resume();

    initGrid(level);
    game.running = true;
    game.level = level;
    game.startTime = Date.now();

    setCurrentLevel(level);
    setCoverage(0);
    setTimeLeft(LEVELS[level].timeLimit);
    setScore(0);
    setGameState('playing');
  };

  // Handle victory
  const handleVictory = () => {
    const game = gameRef.current;
    game.running = false;

    const finalCoverage = calculateCoverage();
    const finalScore = calculateScore(finalCoverage, game.timeLeft, game.level);

    victorySound();
    setScore(finalScore);
    setCoverage(finalCoverage);
    setSubmittedEntryId(null);

    // Track play
    if (finalScore >= 1) {
      fetch('/api/pixelpit/stats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ game: GAME_ID }),
      }).catch(() => {});
    }

    // Check if there's a next level
    if (game.level < LEVELS.length - 1) {
      setGameState('victory');
    } else {
      setGameState('gameover');
    }
  };

  // Handle game over (time ran out)
  const handleGameOver = () => {
    const game = gameRef.current;
    game.running = false;
    game.screenShake.intensity = 20;

    const finalCoverage = calculateCoverage();
    const finalScore = calculateScore(finalCoverage, 0, game.level);

    gameOverSound();
    setScore(finalScore);
    setCoverage(finalCoverage);
    setSubmittedEntryId(null);

    // Track play
    if (finalScore >= 1) {
      fetch('/api/pixelpit/stats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ game: GAME_ID }),
      }).catch(() => {});
    }

    setTimeout(() => setGameState('gameover'), 400);
  };

  // Game loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    let animationId: number;

    const update = () => {
      const game = gameRef.current;
      if (!game.running) return;

      const now = Date.now();

      // Update timer
      const elapsed = (now - game.startTime) / 1000;
      game.timeLeft = Math.max(0, LEVELS[game.level].timeLimit - elapsed);
      setTimeLeft(Math.ceil(game.timeLeft));

      // Check time out
      if (game.timeLeft <= 0) {
        handleGameOver();
        return;
      }

      // Process spread queue
      const readyToSpread = game.spreadQueue.filter(s => now >= s.time);
      game.spreadQueue = game.spreadQueue.filter(s => now < s.time);

      readyToSpread.forEach(s => {
        energizeCell(s.x, s.y);
      });

      // Update flickering cells
      game.flickeringCells.forEach((state, key) => {
        if (now >= state.nextFlip) {
          state.visible = !state.visible;
          state.nextFlip = now + 1000 + Math.random() * 2000;

          // If cell becomes invisible and was energized, remove energy
          if (!state.visible && game.energizedCells.has(key)) {
            game.energizedCells.delete(key);
          }
        }
      });

      // Update coverage
      game.coverage = calculateCoverage();
      setCoverage(game.coverage);

      // Check victory
      if (game.coverage >= TARGET_COVERAGE) {
        handleVictory();
        return;
      }

      // Update screen shake
      if (game.screenShake.intensity > 0) {
        game.screenShake.x = (Math.random() - 0.5) * game.screenShake.intensity;
        game.screenShake.y = (Math.random() - 0.5) * game.screenShake.intensity;
        game.screenShake.intensity *= 0.9;
      }
    };

    const draw = () => {
      const game = gameRef.current;
      game.frameCount++;
      game.pulsePhase += 0.06;

      ctx.save();

      // Apply screen shake
      if (game.screenShake.intensity > 0.5) {
        ctx.translate(game.screenShake.x, game.screenShake.y);
      }

      // Background
      ctx.fillStyle = THEME.bgPrimary;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Calculate grid dimensions
      const cellSize = Math.min(canvas.width, canvas.height) * 0.8 / GRID_SIZE;
      const offsetX = (canvas.width - cellSize * GRID_SIZE) / 2;
      const offsetY = (canvas.height - cellSize * GRID_SIZE) / 2;
      const gap = 2;

      // Draw grid
      for (let y = 0; y < GRID_SIZE; y++) {
        for (let x = 0; x < GRID_SIZE; x++) {
          const px = offsetX + x * cellSize;
          const py = offsetY + y * cellSize;
          const key = `${x},${y}`;

          const isEnergized = game.energizedCells.has(key);
          const isBlackHole = game.blackHoles.has(key);
          const flickerState = game.flickeringCells.get(key);

          // Skip flickering cells that are invisible
          if (flickerState && !flickerState.visible) {
            // Draw faint outline
            ctx.strokeStyle = 'rgba(255,255,255,0.1)';
            ctx.lineWidth = 1;
            ctx.setLineDash([4, 4]);
            ctx.strokeRect(px + gap, py + gap, cellSize - gap * 2, cellSize - gap * 2);
            ctx.setLineDash([]);
            continue;
          }

          if (isBlackHole) {
            // Black hole - purple with glow
            const pulse = Math.sin(game.pulsePhase + x * 0.5 + y * 0.5) * 0.3 + 0.7;
            ctx.shadowBlur = 20 * pulse;
            ctx.shadowColor = THEME.blackHoleGlow;
            ctx.fillStyle = THEME.blackHoleColor;
            ctx.beginPath();
            ctx.arc(px + cellSize / 2, py + cellSize / 2, (cellSize - gap * 2) / 2, 0, Math.PI * 2);
            ctx.fill();

            // Inner spiral effect
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.beginPath();
            ctx.arc(px + cellSize / 2, py + cellSize / 2, (cellSize - gap * 2) / 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
          } else if (isEnergized) {
            // Energized cell - yellow with glow
            const pulse = Math.sin(game.pulsePhase + x * 0.3 + y * 0.3) * 0.2 + 0.8;
            ctx.shadowBlur = 15 * pulse;
            ctx.shadowColor = THEME.energyGlow;
            ctx.fillStyle = THEME.energyColor;
            ctx.fillRect(px + gap, py + gap, cellSize - gap * 2, cellSize - gap * 2);

            // Inner glow
            ctx.fillStyle = `rgba(255,255,255,${0.3 * pulse})`;
            ctx.fillRect(px + gap + 4, py + gap + 4, cellSize - gap * 2 - 8, cellSize - gap * 2 - 8);
            ctx.shadowBlur = 0;
          } else {
            // Empty cell
            ctx.fillStyle = THEME.emptyCell;
            ctx.fillRect(px + gap, py + gap, cellSize - gap * 2, cellSize - gap * 2);

            // Subtle border
            ctx.strokeStyle = THEME.gridColor;
            ctx.lineWidth = 1;
            ctx.strokeRect(px + gap, py + gap, cellSize - gap * 2, cellSize - gap * 2);
          }

          // Flickering indicator
          if (flickerState && flickerState.visible) {
            ctx.strokeStyle = 'rgba(255,255,255,0.3)';
            ctx.lineWidth = 1;
            ctx.setLineDash([2, 2]);
            ctx.strokeRect(px + gap, py + gap, cellSize - gap * 2, cellSize - gap * 2);
            ctx.setLineDash([]);
          }
        }
      }

      // Draw particles
      game.particles = game.particles.filter(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.1;
        p.life--;
        if (p.life <= 0) return false;

        const alpha = Math.max(0, p.life / p.maxLife);
        const radius = Math.max(0.5, p.size * alpha);
        ctx.fillStyle = p.color.replace(')', `,${alpha})`).replace('rgb', 'rgba');
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        return true;
      });

      ctx.restore();
    };

    const gameLoop = () => {
      update();
      draw();
      animationId = requestAnimationFrame(gameLoop);
    };

    gameLoop();

    // Input handlers
    const handleTouch = (e: TouchEvent) => {
      e.preventDefault();
      handleGridInput(e.touches[0].clientX, e.touches[0].clientY);
    };
    const handleMouse = (e: MouseEvent) => handleGridInput(e.clientX, e.clientY);

    canvas.addEventListener('touchstart', handleTouch, { passive: false });
    canvas.addEventListener('mousedown', handleMouse);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('touchstart', handleTouch);
      canvas.removeEventListener('mousedown', handleMouse);
    };
  }, []);

  return (
    <>
      <Script
        src="/pixelpit/social.js"
        onLoad={() => setSocialLoaded(true)}
      />

      <style jsx global>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          background: ${COLORS.bg};
          color: ${COLORS.cream};
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          overflow: hidden;
          touch-action: none;
          user-select: none;
        }

        button {
          transition: all 0.15s ease-out;
          position: relative;
          overflow: hidden;
        }
        button:hover {
          transform: translateY(-2px);
          filter: brightness(1.1);
        }
        button:active {
          transform: translateY(1px);
        }

        .btn-primary {
          animation: btnGlow 3s ease-in-out infinite;
        }
        @keyframes btnGlow {
          0%, 100% { box-shadow: 0 8px 30px rgba(250,204,21,0.3); }
          50% { box-shadow: 0 8px 40px rgba(250,204,21,0.5); }
        }
      `}</style>

      <canvas
        ref={canvasRef}
        style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh' }}
      />

      {/* Sound Toggle */}
      <button
        onClick={() => {
          initAudio();
          setSoundEnabled(!soundEnabled);
          if (gameRef.current.masterGain) {
            gameRef.current.masterGain.gain.value = soundEnabled ? 0 : 1;
          }
        }}
        style={{
          position: 'fixed',
          top: 20,
          right: 20,
          zIndex: 150,
          background: 'rgba(0,0,0,0.4)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 8,
          padding: '10px 14px',
          color: COLORS.cream,
          fontFamily: "ui-monospace, monospace",
          fontSize: 14,
          cursor: 'pointer',
          opacity: soundEnabled ? 0.8 : 0.4,
        }}
      >
        {soundEnabled ? '♪' : '♪̶'}
      </button>

      {/* Playing UI */}
      {gameState === 'playing' && (
        <div style={{
          position: 'fixed',
          top: 25,
          left: 0,
          right: 0,
          textAlign: 'center',
          zIndex: 10,
          pointerEvents: 'none',
        }}>
          {/* Timer */}
          <div style={{
            fontFamily: "ui-monospace, monospace",
            fontSize: 48,
            fontWeight: 200,
            color: timeLeft <= 10 ? COLORS.coral : COLORS.yellow,
            textShadow: `0 0 40px ${timeLeft <= 10 ? 'rgba(248,113,113,0.4)' : 'rgba(250,204,21,0.4)'}`,
          }}>
            {Math.ceil(timeLeft)}
          </div>

          {/* Coverage */}
          <div style={{
            fontFamily: "ui-monospace, monospace",
            fontSize: 16,
            color: COLORS.purpleLight,
            marginTop: 8,
            letterSpacing: 2,
          }}>
            {Math.floor(coverage * 100)}% / 90%
          </div>

          {/* Level */}
          <div style={{
            fontFamily: "ui-monospace, monospace",
            fontSize: 11,
            color: COLORS.muted,
            marginTop: 6,
            letterSpacing: 4,
            textTransform: 'lowercase',
          }}>
            {LEVELS[currentLevel].name}
          </div>
        </div>
      )}

      {/* Start Screen */}
      {gameState === 'start' && (
        <div style={{
          position: 'fixed',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: COLORS.bg,
          zIndex: 100,
          textAlign: 'center',
          padding: 40,
        }}>
          <div style={{
            background: COLORS.surface,
            border: '1px solid rgba(255,255,255,0.05)',
            padding: '50px 60px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
            borderRadius: 16,
          }}>
            <h1 style={{
              fontFamily: "ui-monospace, monospace",
              fontSize: 64,
              fontWeight: 300,
              color: COLORS.yellow,
              marginBottom: 20,
              letterSpacing: 8,
              textShadow: '0 0 40px rgba(250,204,21,0.4)',
            }}>
              SURGE
            </h1>
            <p style={{
              fontSize: 14,
              fontFamily: "ui-monospace, monospace",
              color: COLORS.purpleLight,
              marginBottom: 35,
              lineHeight: 1.8,
              letterSpacing: 2,
            }}>
              tap to spread energy<br />
              cover 90% to win<br />
              avoid black holes
            </p>
            <button
              className="btn-primary"
              onClick={() => startGame(0)}
              style={{
                background: COLORS.yellow,
                color: COLORS.bg,
                border: 'none',
                padding: '16px 50px',
                fontSize: 16,
                fontFamily: "ui-monospace, monospace",
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 8px 30px rgba(250,204,21,0.3)',
                borderRadius: 8,
                letterSpacing: 2,
              }}
            >
              play
            </button>
          </div>
          <div style={{
            marginTop: 30,
            fontSize: 12,
            fontFamily: "ui-monospace, monospace",
            letterSpacing: 3,
          }}>
            <span style={{ color: COLORS.yellow }}>pixel</span>
            <span style={{ color: COLORS.purple }}>pit</span>
            <span style={{ color: COLORS.cream, opacity: 0.4 }}> arcade</span>
          </div>
        </div>
      )}

      {/* Victory Screen (level complete) */}
      {gameState === 'victory' && (
        <div style={{
          position: 'fixed',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: COLORS.bg,
          zIndex: 100,
          textAlign: 'center',
          padding: 40,
        }}>
          <h1 style={{
            fontFamily: "ui-monospace, monospace",
            fontSize: 32,
            fontWeight: 300,
            color: COLORS.purpleLight,
            marginBottom: 15,
            letterSpacing: 6,
          }}>
            level complete!
          </h1>
          <div style={{
            fontFamily: "ui-monospace, monospace",
            fontSize: 64,
            fontWeight: 200,
            color: COLORS.yellow,
            marginBottom: 10,
            textShadow: '0 0 40px rgba(250,204,21,0.4)',
          }}>
            {score}
          </div>
          <div style={{
            fontFamily: "ui-monospace, monospace",
            fontSize: 16,
            color: COLORS.muted,
            marginBottom: 30,
          }}>
            {Math.floor(coverage * 100)}% coverage
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 15, alignItems: 'center' }}>
            <button
              className="btn-primary"
              onClick={() => startGame(currentLevel + 1)}
              style={{
                background: COLORS.yellow,
                color: COLORS.bg,
                border: 'none',
                borderRadius: 8,
                padding: '16px 50px',
                fontSize: 15,
                fontFamily: "ui-monospace, monospace",
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 8px 25px rgba(250,204,21,0.3)',
                letterSpacing: 2,
              }}
            >
              next level
            </button>
            <button
              onClick={() => setGameState('gameover')}
              style={{
                background: 'transparent',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 6,
                color: COLORS.muted,
                padding: '14px 35px',
                fontSize: 11,
                fontFamily: "ui-monospace, monospace",
                cursor: 'pointer',
                letterSpacing: 2,
              }}
            >
              submit score
            </button>
          </div>
        </div>
      )}

      {/* Game Over Screen */}
      {gameState === 'gameover' && (
        <div style={{
          position: 'fixed',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: COLORS.bg,
          zIndex: 100,
          textAlign: 'center',
          padding: 40,
        }}>
          <h1 style={{
            fontFamily: "ui-monospace, monospace",
            fontSize: 28,
            fontWeight: 300,
            color: coverage >= TARGET_COVERAGE ? COLORS.purpleLight : COLORS.coral,
            marginBottom: 15,
            letterSpacing: 6,
          }}>
            {coverage >= TARGET_COVERAGE ? 'you win!' : 'time\'s up'}
          </h1>
          <div style={{
            fontFamily: "ui-monospace, monospace",
            fontSize: 80,
            fontWeight: 200,
            color: COLORS.yellow,
            marginBottom: 10,
            textShadow: '0 0 40px rgba(250,204,21,0.4)',
          }}>
            {score}
          </div>
          <div style={{
            fontFamily: "ui-monospace, monospace",
            fontSize: 14,
            color: COLORS.muted,
            marginBottom: 25,
          }}>
            {Math.floor(coverage * 100)}% coverage • level {currentLevel + 1}
          </div>

          {/* Score Submission */}
          <ScoreFlow
            score={score}
            gameId={GAME_ID}
            colors={SCORE_FLOW_COLORS}
            onRankReceived={(rank, entryId) => {
              setSubmittedEntryId(entryId ?? null);
            }}
          />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 15, alignItems: 'center' }}>
            <button
              className="btn-primary"
              onClick={() => startGame(0)}
              style={{
                background: COLORS.purple,
                color: COLORS.cream,
                border: 'none',
                borderRadius: 8,
                padding: '16px 50px',
                fontSize: 15,
                fontFamily: "ui-monospace, monospace",
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 8px 25px rgba(124,58,237,0.3)',
                letterSpacing: 2,
              }}
            >
              play again
            </button>
            <button
              onClick={() => setGameState('leaderboard')}
              style={{
                background: 'transparent',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 6,
                color: COLORS.muted,
                padding: '14px 35px',
                fontSize: 11,
                fontFamily: "ui-monospace, monospace",
                cursor: 'pointer',
                letterSpacing: 2,
              }}
            >
              leaderboard
            </button>
            <ShareButtonContainer
              id="share-btn-container"
              url={typeof window !== 'undefined' ? `${window.location.origin}/pixelpit/arcade/surge/share/${score}` : ''}
              text={`I scored ${score} on SURGE! ${Math.floor(coverage * 100)}% coverage. Can you beat me?`}
              style="minimal"
              socialLoaded={socialLoaded}
            />
          </div>
        </div>
      )}

      {/* Leaderboard Screen */}
      {gameState === 'leaderboard' && (
        <Leaderboard
          gameId={GAME_ID}
          limit={8}
          entryId={submittedEntryId ?? undefined}
          colors={LEADERBOARD_COLORS}
          onClose={() => setGameState('gameover')}
        />
      )}
    </>
  );
}
