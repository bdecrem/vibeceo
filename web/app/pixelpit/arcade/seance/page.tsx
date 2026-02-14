'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import Script from 'next/script';
import {
  ScoreFlow,
  Leaderboard,
  ShareButtonContainer,
  usePixelpitSocial,
  type ScoreFlowColors,
  type LeaderboardColors,
} from '@/app/pixelpit/components';

const GAME_ID = 'seance';

// INDIE BITE theme - Spooky cute
const THEME = {
  bg: '#1a1625',        // Dark purple-black
  surface: '#2d2640',   // Slightly lighter
  portal: '#a855f7',    // Purple portal
  ghostWhite: '#f8fafc',
  ghostCyan: '#22d3ee',
  ghostPink: '#f472b6',
  ghostGreen: '#4ade80',
  ghostOrange: '#fb923c',
  furniture: '#71717a',
  furnitureDark: '#525252',
  text: '#ffffff',
};

// Piece types
type PieceType = 'player' | 'ghost' | 'furniture';
type Orientation = 'horizontal' | 'vertical' | 'both';

interface Piece {
  id: string;
  type: PieceType;
  x: number;
  y: number;
  width: number;
  height: number;
  orientation: Orientation;
  color: string;
}

interface Level {
  grid: number; // grid size (4, 5, or 6)
  exit: { x: number; y: number; side: 'top' | 'right' | 'bottom' | 'left' };
  pieces: Piece[];
  minMoves: number;
}

// 10 levels with proper tutorial progression (Tap spec)
const LEVELS: Level[] = [
  // LEVEL 1: One vertical blocker (2 moves) - Learn: "Drag blocker to clear path"
  {
    grid: 4,
    exit: { x: 3, y: 1, side: 'right' },
    minMoves: 2,
    pieces: [
      { id: 'player', type: 'player', x: 0, y: 1, width: 1, height: 1, orientation: 'both', color: THEME.ghostWhite },
      { id: 'g1', type: 'ghost', x: 2, y: 1, width: 1, height: 2, orientation: 'vertical', color: THEME.ghostCyan },
    ],
  },
  // LEVEL 2: One horizontal blocker (2 moves) - Learn: "Horizontal pieces move horizontally"
  {
    grid: 4,
    exit: { x: 1, y: 3, side: 'bottom' },
    minMoves: 2,
    pieces: [
      { id: 'player', type: 'player', x: 1, y: 0, width: 1, height: 1, orientation: 'both', color: THEME.ghostWhite },
      { id: 'g1', type: 'ghost', x: 0, y: 1, width: 2, height: 1, orientation: 'horizontal', color: THEME.ghostPink },
    ],
  },
  // LEVEL 3: V + H ghost combo (3 moves) - Learn: "Both orientations"
  // Fixed: g2 starts at y=1 so it can move UP to clear y=2
  {
    grid: 4,
    exit: { x: 3, y: 2, side: 'right' },
    minMoves: 3,
    pieces: [
      { id: 'player', type: 'player', x: 0, y: 2, width: 1, height: 1, orientation: 'both', color: THEME.ghostWhite },
      { id: 'g1', type: 'ghost', x: 1, y: 1, width: 2, height: 1, orientation: 'horizontal', color: THEME.ghostCyan },
      { id: 'g2', type: 'ghost', x: 2, y: 2, width: 1, height: 2, orientation: 'vertical', color: THEME.ghostPink },
    ],
  },
  // LEVEL 4: Two vertical ghosts (3 moves) - Learn: "Sequencing - which one first?"
  // Fixed: Both ghosts start at y=1 so they can move DOWN to clear y=1
  {
    grid: 4,
    exit: { x: 3, y: 1, side: 'right' },
    minMoves: 3,
    pieces: [
      { id: 'player', type: 'player', x: 0, y: 1, width: 1, height: 1, orientation: 'both', color: THEME.ghostWhite },
      { id: 'g1', type: 'ghost', x: 1, y: 1, width: 1, height: 2, orientation: 'vertical', color: THEME.ghostCyan },
      { id: 'g2', type: 'ghost', x: 2, y: 1, width: 1, height: 2, orientation: 'vertical', color: THEME.ghostPink },
    ],
  },
  // LEVEL 5: Introduce furniture (2 moves) - Learn: "Furniture works the same"
  {
    grid: 4,
    exit: { x: 3, y: 2, side: 'right' },
    minMoves: 2,
    pieces: [
      { id: 'player', type: 'player', x: 0, y: 2, width: 1, height: 1, orientation: 'both', color: THEME.ghostWhite },
      { id: 'f1', type: 'furniture', x: 1, y: 2, width: 2, height: 1, orientation: 'horizontal', color: THEME.furniture },
    ],
  },
  // LEVEL 6: Ghost + furniture mix (4 moves) - Learn: "Mix piece types"
  // Fixed: g1 starts at y=1 so it can move DOWN to clear y=1, g2 can move DOWN too
  {
    grid: 4,
    exit: { x: 3, y: 1, side: 'right' },
    minMoves: 4,
    pieces: [
      { id: 'player', type: 'player', x: 0, y: 1, width: 1, height: 1, orientation: 'both', color: THEME.ghostWhite },
      { id: 'g1', type: 'ghost', x: 1, y: 1, width: 1, height: 2, orientation: 'vertical', color: THEME.ghostCyan },
      { id: 'f1', type: 'furniture', x: 2, y: 0, width: 1, height: 2, orientation: 'vertical', color: THEME.furniture },
      { id: 'g2', type: 'ghost', x: 3, y: 1, width: 1, height: 2, orientation: 'vertical', color: THEME.ghostPink },
    ],
  },
  // LEVEL 7: 5x5 grid intro (4 moves) - Learn: "Bigger grid, more planning"
  {
    grid: 5,
    exit: { x: 4, y: 2, side: 'right' },
    minMoves: 4,
    pieces: [
      { id: 'player', type: 'player', x: 0, y: 2, width: 1, height: 1, orientation: 'both', color: THEME.ghostWhite },
      { id: 'g1', type: 'ghost', x: 2, y: 1, width: 1, height: 2, orientation: 'vertical', color: THEME.ghostCyan },
      { id: 'g2', type: 'ghost', x: 3, y: 2, width: 1, height: 2, orientation: 'vertical', color: THEME.ghostPink },
    ],
  },
  // LEVEL 8: 5x5 challenge (5 moves)
  {
    grid: 5,
    exit: { x: 4, y: 2, side: 'right' },
    minMoves: 5,
    pieces: [
      { id: 'player', type: 'player', x: 0, y: 2, width: 1, height: 1, orientation: 'both', color: THEME.ghostWhite },
      { id: 'g1', type: 'ghost', x: 1, y: 1, width: 2, height: 1, orientation: 'horizontal', color: THEME.ghostCyan },
      { id: 'g2', type: 'ghost', x: 2, y: 2, width: 1, height: 2, orientation: 'vertical', color: THEME.ghostPink },
      { id: 'f1', type: 'furniture', x: 3, y: 0, width: 1, height: 3, orientation: 'vertical', color: THEME.furniture },
    ],
  },
  // LEVEL 9: 6x6 intro (5 moves) - Learn: "Final grid size"
  {
    grid: 6,
    exit: { x: 5, y: 2, side: 'right' },
    minMoves: 5,
    pieces: [
      { id: 'player', type: 'player', x: 0, y: 2, width: 1, height: 1, orientation: 'both', color: THEME.ghostWhite },
      { id: 'g1', type: 'ghost', x: 2, y: 1, width: 1, height: 2, orientation: 'vertical', color: THEME.ghostCyan },
      { id: 'g2', type: 'ghost', x: 3, y: 2, width: 2, height: 1, orientation: 'horizontal', color: THEME.ghostPink },
      { id: 'g3', type: 'ghost', x: 5, y: 1, width: 1, height: 2, orientation: 'vertical', color: THEME.ghostGreen },
    ],
  },
  // LEVEL 10: Grand finale (6+ moves)
  {
    grid: 6,
    exit: { x: 5, y: 3, side: 'right' },
    minMoves: 6,
    pieces: [
      { id: 'player', type: 'player', x: 0, y: 3, width: 1, height: 1, orientation: 'both', color: THEME.ghostWhite },
      { id: 'g1', type: 'ghost', x: 1, y: 2, width: 2, height: 1, orientation: 'horizontal', color: THEME.ghostCyan },
      { id: 'g2', type: 'ghost', x: 2, y: 3, width: 1, height: 2, orientation: 'vertical', color: THEME.ghostPink },
      { id: 'g3', type: 'ghost', x: 4, y: 1, width: 1, height: 3, orientation: 'vertical', color: THEME.ghostGreen },
      { id: 'f1', type: 'furniture', x: 3, y: 4, width: 2, height: 1, orientation: 'horizontal', color: THEME.furniture },
      { id: 'f2', type: 'furniture', x: 5, y: 2, width: 1, height: 2, orientation: 'vertical', color: THEME.furnitureDark },
    ],
  },
];

// Social colors
const SCORE_FLOW_COLORS: ScoreFlowColors = {
  bg: THEME.bg,
  surface: THEME.surface,
  primary: THEME.portal,
  secondary: THEME.ghostCyan,
  text: THEME.text,
  muted: '#9ca3af',
  error: '#ef4444',
};

const LEADERBOARD_COLORS: LeaderboardColors = {
  bg: THEME.bg,
  surface: THEME.surface,
  primary: THEME.portal,
  secondary: THEME.ghostCyan,
  text: THEME.text,
  muted: '#9ca3af',
};

// Audio
let audioCtx: AudioContext | null = null;
let masterGain: GainNode | null = null;

function initAudio() {
  if (audioCtx) return;
  audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  masterGain = audioCtx.createGain();
  masterGain.gain.value = 0.4;
  masterGain.connect(audioCtx.destination);
  if (audioCtx.state === 'suspended') audioCtx.resume();
}

// Ethereal whoosh on slide
function playSlide() {
  if (!audioCtx || !masterGain) return;
  const t = audioCtx.currentTime;
  
  const bufferSize = audioCtx.sampleRate * 0.15;
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    const env = Math.sin((i / bufferSize) * Math.PI);
    data[i] = (Math.random() * 2 - 1) * env * 0.3;
  }
  const noise = audioCtx.createBufferSource();
  noise.buffer = buffer;
  
  const filter = audioCtx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(800, t);
  filter.frequency.exponentialRampToValueAtTime(400, t + 0.15);
  filter.Q.value = 1;
  
  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(0.15, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
  
  noise.connect(filter);
  filter.connect(gain);
  gain.connect(masterGain);
  noise.start(t);
}

// Spooky chime on level complete
function playLevelComplete() {
  if (!audioCtx || !masterGain) return;
  const t = audioCtx.currentTime;
  
  // Ethereal chord
  const freqs = [523.25, 659.25, 783.99]; // C5, E5, G5
  freqs.forEach((freq, i) => {
    const osc = audioCtx!.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;
    
    const gain = audioCtx!.createGain();
    gain.gain.setValueAtTime(0.12, t + i * 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.8);
    
    osc.connect(gain);
    gain.connect(masterGain!);
    osc.start(t + i * 0.05);
    osc.stop(t + 0.8);
  });
}

// Ghostly "wooo" on exit
function playGhostExit() {
  if (!audioCtx || !masterGain) return;
  const t = audioCtx.currentTime;
  
  const osc = audioCtx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(400, t);
  osc.frequency.exponentialRampToValueAtTime(600, t + 0.2);
  osc.frequency.exponentialRampToValueAtTime(350, t + 0.5);
  
  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(0.15, t + 0.1);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
  
  osc.connect(gain);
  gain.connect(masterGain);
  osc.start(t);
  osc.stop(t + 0.6);
}

// Spook wave sound (every 5 moves)
function playSpookWave() {
  if (!audioCtx || !masterGain) return;
  const t = audioCtx.currentTime;
  
  // Low rumble
  const osc = audioCtx.createOscillator();
  osc.type = 'sine';
  osc.frequency.value = 80;
  
  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(0.1, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
  
  osc.connect(gain);
  gain.connect(masterGain);
  osc.start(t);
  osc.stop(t + 0.3);
}

export default function SeancePage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [canvasSize, setCanvasSize] = useState({ w: 400, h: 600 });
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'levelComplete' | 'gameComplete'>('menu');
  const [currentLevel, setCurrentLevel] = useState(0);
  const [moves, setMoves] = useState(0);
  const [totalStars, setTotalStars] = useState(0);
  const [socialLoaded, setSocialLoaded] = useState(false);
  const [submittedEntryId, setSubmittedEntryId] = useState<number | null>(null);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  
  const gameRef = useRef({
    pieces: [] as Piece[],
    dragging: null as string | null,
    dragStart: { x: 0, y: 0 },
    dragOffset: { x: 0, y: 0 },
    spookWaveTimer: 0,
    showSpookWave: false,
    exitAnimation: false,
    exitAnimationProgress: 0,
    moveHistory: [] as Piece[][],
  });

  usePixelpitSocial(socialLoaded);

  // Resize handler
  useEffect(() => {
    const handleResize = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const size = Math.min(vw, vh - 100, 500);
      setCanvasSize({ w: size, h: size + 150 });
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Analytics tracking (Push: fire on game complete)
  useEffect(() => {
    if (gameState === 'gameComplete' && currentLevel >= 1) {
      fetch('/api/pixelpit/stats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ game: GAME_ID }),
      }).catch(() => {}); // Silent fail
    }
  }, [gameState, currentLevel]);

  // Calculate grid cell size
  const getGridSize = useCallback(() => {
    const level = LEVELS[currentLevel];
    const gridPx = Math.min(canvasSize.w - 40, canvasSize.h - 180);
    const cellSize = gridPx / level.grid;
    const offsetX = (canvasSize.w - gridPx) / 2;
    const offsetY = 80;
    return { gridPx, cellSize, offsetX, offsetY, gridSize: level.grid };
  }, [canvasSize, currentLevel]);

  // Start level
  const startLevel = useCallback((levelIndex: number) => {
    initAudio();
    const level = LEVELS[levelIndex];
    const game = gameRef.current;
    game.pieces = level.pieces.map(p => ({ ...p }));
    game.dragging = null;
    game.spookWaveTimer = 0;
    game.showSpookWave = false;
    game.exitAnimation = false;
    game.exitAnimationProgress = 0;
    game.moveHistory = [];
    setCurrentLevel(levelIndex);
    setMoves(0);
    setGameState('playing');
  }, []);

  // Check win condition
  const checkWin = useCallback(() => {
    const level = LEVELS[currentLevel];
    const game = gameRef.current;
    const player = game.pieces.find(p => p.type === 'player');
    if (!player) return false;
    
    // Player reached exit
    return player.x === level.exit.x && player.y === level.exit.y;
  }, [currentLevel]);

  // Calculate stars
  const getStars = useCallback((moveCount: number, minMoves: number) => {
    if (moveCount <= minMoves) return 3;
    if (moveCount <= minMoves * 1.5) return 2;
    return 1;
  }, []);

  // Check if piece can move to position
  const canMoveTo = useCallback((piece: Piece, newX: number, newY: number) => {
    const level = LEVELS[currentLevel];
    const game = gameRef.current;
    
    // Bounds check
    if (newX < 0 || newY < 0) return false;
    if (newX + piece.width > level.grid || newY + piece.height > level.grid) return false;
    
    // Collision check with other pieces
    for (const other of game.pieces) {
      if (other.id === piece.id) continue;
      
      // AABB collision
      if (newX < other.x + other.width &&
          newX + piece.width > other.x &&
          newY < other.y + other.height &&
          newY + piece.height > other.y) {
        return false;
      }
    }
    
    return true;
  }, [currentLevel]);

  // Move piece along its axis
  const movePiece = useCallback((pieceId: string, dx: number, dy: number) => {
    const game = gameRef.current;
    const piece = game.pieces.find(p => p.id === pieceId);
    if (!piece) return false;
    
    // Check orientation constraints
    if (piece.orientation === 'horizontal' && dy !== 0) return false;
    if (piece.orientation === 'vertical' && dx !== 0) return false;
    
    const newX = piece.x + dx;
    const newY = piece.y + dy;
    
    if (canMoveTo(piece, newX, newY)) {
      // Save state for undo
      game.moveHistory.push(game.pieces.map(p => ({ ...p })));
      
      piece.x = newX;
      piece.y = newY;
      return true;
    }
    return false;
  }, [canMoveTo]);

  // Undo last move
  const undoMove = useCallback(() => {
    const game = gameRef.current;
    if (game.moveHistory.length === 0) return;
    
    game.pieces = game.moveHistory.pop()!;
    setMoves(m => Math.max(0, m - 1));
    playSlide();
  }, []);

  // Handle level complete
  const handleLevelComplete = useCallback(() => {
    const level = LEVELS[currentLevel];
    const stars = getStars(moves, level.minMoves);
    setTotalStars(s => s + stars);
    
    playGhostExit();
    setTimeout(() => {
      playLevelComplete();
      
      if (currentLevel >= LEVELS.length - 1) {
        // Game complete!
        setGameState('gameComplete');
        setSocialLoaded(true);
      } else {
        setGameState('levelComplete');
      }
    }, 600);
  }, [currentLevel, moves, getStars, totalStars]);

  // Input handlers
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (gameState !== 'playing') return;
    
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const { cellSize, offsetX, offsetY } = getGridSize();
    
    // Find clicked piece
    const game = gameRef.current;
    for (const piece of game.pieces) {
      const px = offsetX + piece.x * cellSize;
      const py = offsetY + piece.y * cellSize;
      const pw = piece.width * cellSize;
      const ph = piece.height * cellSize;
      
      if (x >= px && x <= px + pw && y >= py && y <= py + ph) {
        game.dragging = piece.id;
        game.dragStart = { x: piece.x, y: piece.y };
        game.dragOffset = { x: x - px, y: y - py };
        break;
      }
    }
  }, [gameState, getGridSize]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (gameState !== 'playing') return;
    
    const game = gameRef.current;
    if (!game.dragging) return;
    
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const { cellSize, offsetX, offsetY } = getGridSize();
    
    const piece = game.pieces.find(p => p.id === game.dragging);
    if (!piece) return;
    
    // Calculate target cell
    const targetX = Math.round((x - offsetX - game.dragOffset.x) / cellSize);
    const targetY = Math.round((y - offsetY - game.dragOffset.y) / cellSize);
    
    // Calculate movement delta
    let dx = targetX - game.dragStart.x;
    let dy = targetY - game.dragStart.y;
    
    // Constrain to orientation
    if (piece.orientation === 'horizontal') dy = 0;
    if (piece.orientation === 'vertical') dx = 0;
    
    // Try to move step by step
    while (dx !== 0 || dy !== 0) {
      const stepX = dx > 0 ? 1 : dx < 0 ? -1 : 0;
      const stepY = dy > 0 ? 1 : dy < 0 ? -1 : 0;
      
      if (canMoveTo(piece, piece.x + stepX, piece.y + stepY)) {
        piece.x += stepX;
        piece.y += stepY;
        dx -= stepX;
        dy -= stepY;
      } else {
        break;
      }
    }
  }, [gameState, getGridSize, canMoveTo]);

  const handlePointerUp = useCallback(() => {
    const game = gameRef.current;
    if (!game.dragging) return;
    
    const piece = game.pieces.find(p => p.id === game.dragging);
    if (piece) {
      // Check if piece actually moved
      if (piece.x !== game.dragStart.x || piece.y !== game.dragStart.y) {
        // Save undo state
        const prevState = game.pieces.map(p => {
          if (p.id === piece.id) {
            return { ...p, x: game.dragStart.x, y: game.dragStart.y };
          }
          return { ...p };
        });
        game.moveHistory.push(prevState);
        
        setMoves(m => m + 1);
        playSlide();
        
        // Check for spook wave
        if ((moves + 1) % 5 === 0) {
          game.showSpookWave = true;
          game.spookWaveTimer = 0.5;
          playSpookWave();
        }
        
        // Check win
        if (checkWin()) {
          game.exitAnimation = true;
          handleLevelComplete();
        }
      }
    }
    
    game.dragging = null;
  }, [moves, checkWin, handleLevelComplete]);

  // Game loop
  useEffect(() => {
    if (gameState !== 'playing' && gameState !== 'levelComplete') return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    let animationId: number;
    let lastTime = performance.now();
    
    const draw = () => {
      const now = performance.now();
      const dt = (now - lastTime) / 1000;
      lastTime = now;
      
      const game = gameRef.current;
      const { gridPx, cellSize, offsetX, offsetY, gridSize } = getGridSize();
      const level = LEVELS[currentLevel];
      
      // Update spook wave
      if (game.showSpookWave) {
        game.spookWaveTimer -= dt;
        if (game.spookWaveTimer <= 0) {
          game.showSpookWave = false;
        }
      }
      
      // Update exit animation
      if (game.exitAnimation) {
        game.exitAnimationProgress += dt * 5; // ~200ms total (Dither spec)
      }
      
      // Background
      ctx.fillStyle = THEME.bg;
      ctx.fillRect(0, 0, canvasSize.w, canvasSize.h);
      
      // Title
      ctx.fillStyle = THEME.text;
      ctx.font = 'bold 24px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText(`Level ${currentLevel + 1}`, canvasSize.w / 2, 35);
      
      // Moves counter
      ctx.font = '16px system-ui';
      ctx.fillStyle = '#9ca3af';
      ctx.fillText(`Moves: ${moves}`, canvasSize.w / 2, 60);
      
      // Grid background
      ctx.fillStyle = THEME.surface;
      ctx.fillRect(offsetX, offsetY, gridPx, gridPx);
      
      // Grid lines
      ctx.strokeStyle = '#3f3755';
      ctx.lineWidth = 1;
      for (let i = 0; i <= gridSize; i++) {
        ctx.beginPath();
        ctx.moveTo(offsetX + i * cellSize, offsetY);
        ctx.lineTo(offsetX + i * cellSize, offsetY + gridPx);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(offsetX, offsetY + i * cellSize);
        ctx.lineTo(offsetX + gridPx, offsetY + i * cellSize);
        ctx.stroke();
      }
      
      // Exit portal
      const portalX = offsetX + level.exit.x * cellSize + cellSize / 2;
      const portalY = offsetY + level.exit.y * cellSize + cellSize / 2;
      
      // Check if player is adjacent to portal
      const player = game.pieces.find(p => p.type === 'player');
      const isAdjacent = player && (
        Math.abs(player.x - level.exit.x) + Math.abs(player.y - level.exit.y) <= 1
      );
      // Slow when far (1 pulse/2s = 1000ms), fast when adjacent (3 pulses/s = 333ms)
      const pulseSpeed = isAdjacent ? 333 : 2000;
      const actualPulse = Math.sin(now / pulseSpeed * Math.PI * 2) * 0.25 + 0.85;
      
      // Draw portal particles (sparkles drifting toward center)
      ctx.save();
      for (let i = 0; i < 5; i++) {
        const angle = (now / 1000 + i * Math.PI * 0.4) % (Math.PI * 2);
        const dist = 25 + Math.sin(now / 300 + i) * 10;
        const sparkleX = portalX + Math.cos(angle) * dist;
        const sparkleY = portalY + Math.sin(angle) * dist;
        const sparkleSize = 2 + Math.sin(now / 200 + i * 2) * 1;
        
        ctx.globalAlpha = 0.6 + Math.sin(now / 150 + i) * 0.3;
        ctx.fillStyle = '#c084fc';
        ctx.beginPath();
        ctx.arc(sparkleX, sparkleY, sparkleSize, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
      
      // Portal glow (BRIGHT per Dither)
      ctx.save();
      ctx.shadowBlur = 30 * actualPulse;
      ctx.shadowColor = THEME.portal;
      ctx.fillStyle = THEME.portal;
      ctx.beginPath();
      ctx.arc(portalX, portalY, cellSize * 0.38 * actualPulse, 0, Math.PI * 2);
      ctx.fill();
      // Inner bright core
      ctx.fillStyle = '#e9d5ff';
      ctx.beginPath();
      ctx.arc(portalX, portalY, cellSize * 0.15, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      
      // Draw pieces
      for (const piece of game.pieces) {
        const px = offsetX + piece.x * cellSize;
        const py = offsetY + piece.y * cellSize;
        const pw = piece.width * cellSize - 4;
        const ph = piece.height * cellSize - 4;
        
        // Skip player if exit animation — PORTAL SUCC effect (Dither request)
        if (piece.type === 'player' && game.exitAnimation) {
          const progress = Math.min(game.exitAnimationProgress, 1);
          
          // Position: start -> portal center
          const startX = px + 2 + pw/2;
          const startY = py + 2 + ph/2;
          const animX = startX + (portalX - startX) * progress;
          const animY = startY + (portalY - startY) * progress;
          
          // Stretch effect: elongate toward portal as it gets sucked in
          // Early: normal shape. Late: stretched thin toward portal
          const stretchProgress = Math.pow(progress, 0.7); // Ease in
          const baseRadius = pw / 2 - 2;
          
          // Calculate angle to portal
          const angleToPortal = Math.atan2(portalY - startY, portalX - startX);
          
          // Stretch multipliers (perpendicular shrinks, parallel stretches)
          const stretchParallel = 1 + stretchProgress * 1.5;  // Gets longer
          const stretchPerp = 1 - stretchProgress * 0.6;       // Gets thinner
          
          // Scale down as it enters
          const scale = 1 - progress * 0.9;
          
          ctx.save();
          ctx.globalAlpha = 1 - progress * progress; // Fade accelerates at end
          ctx.shadowBlur = 20 + progress * 15;
          ctx.shadowColor = THEME.portal; // Glow shifts to portal color
          ctx.fillStyle = piece.color;
          
          // Transform for stretch effect
          ctx.translate(animX, animY);
          ctx.rotate(angleToPortal);
          ctx.scale(stretchParallel * scale, stretchPerp * scale);
          
          // Draw stretched ellipse
          ctx.beginPath();
          ctx.arc(0, 0, baseRadius, 0, Math.PI * 2);
          ctx.fill();
          
          // Eyes (stretched and fading)
          if (progress < 0.7) {
            ctx.fillStyle = THEME.bg;
            const eyeSize = baseRadius / 4 * (1 - progress);
            ctx.beginPath();
            ctx.arc(-eyeSize * 2, -eyeSize, eyeSize, 0, Math.PI * 2);
            ctx.arc(eyeSize * 2, -eyeSize, eyeSize, 0, Math.PI * 2);
            ctx.fill();
          }
          
          ctx.restore();
          continue;
        }
        
        // Spook wave shake (bigger wobble per Dither)
        let shakeX = 0, shakeY = 0;
        const isSpooking = game.showSpookWave && piece.type !== 'furniture';
        if (isSpooking) {
          shakeX = (Math.random() - 0.5) * 8;
          shakeY = (Math.random() - 0.5) * 8;
        }
        
        ctx.save();
        
        if (piece.type === 'player' || piece.type === 'ghost') {
          // Ghost glow (flash white during spook wave)
          ctx.shadowBlur = isSpooking ? 25 : 12;
          const glowColor = isSpooking ? '#ffffff' : piece.color;
          ctx.shadowColor = glowColor;
          ctx.fillStyle = isSpooking ? '#ffffff' : piece.color;
          
          // Draw ghost shape
          const cx = px + 2 + pw/2 + shakeX;
          const cy = py + 2 + ph/2 + shakeY;
          
          if (piece.type === 'player') {
            // PLAYER: Rounder, friendlier shape (circle with wavy bottom)
            ctx.beginPath();
            const r = Math.min(pw, ph) / 2 - 2;
            // Top dome
            ctx.arc(cx, cy - r * 0.2, r, Math.PI, 0);
            // Wavy bottom
            const waveY = cy + r * 0.6;
            ctx.quadraticCurveTo(cx + r, waveY, cx + r * 0.5, waveY + r * 0.3);
            ctx.quadraticCurveTo(cx, waveY, cx - r * 0.5, waveY + r * 0.3);
            ctx.quadraticCurveTo(cx - r, waveY, cx - r, cy - r * 0.2);
            ctx.fill();
          } else {
            // BLOCKERS: More angular, slightly menacing
            ctx.beginPath();
            if (piece.width > piece.height) {
              // Horizontal ghost - stretched hexagon
              const halfW = pw / 2;
              const halfH = ph / 2 - 2;
              ctx.moveTo(px + 2 + shakeX + 8, py + 2 + shakeY);
              ctx.lineTo(px + 2 + shakeX + pw - 8, py + 2 + shakeY);
              ctx.lineTo(px + 2 + shakeX + pw, py + 2 + shakeY + halfH);
              ctx.lineTo(px + 2 + shakeX + pw - 8, py + 2 + shakeY + ph);
              ctx.lineTo(px + 2 + shakeX + 8, py + 2 + shakeY + ph);
              ctx.lineTo(px + 2 + shakeX, py + 2 + shakeY + halfH);
              ctx.closePath();
            } else {
              // Vertical ghost - stretched hexagon
              const halfW = pw / 2 - 2;
              const halfH = ph / 2;
              ctx.moveTo(px + 2 + shakeX + halfW + 2, py + 2 + shakeY);
              ctx.lineTo(px + 2 + shakeX + pw, py + 2 + shakeY + 8);
              ctx.lineTo(px + 2 + shakeX + pw, py + 2 + shakeY + ph - 8);
              ctx.lineTo(px + 2 + shakeX + halfW + 2, py + 2 + shakeY + ph);
              ctx.lineTo(px + 2 + shakeX, py + 2 + shakeY + ph - 8);
              ctx.lineTo(px + 2 + shakeX, py + 2 + shakeY + 8);
              ctx.closePath();
            }
            ctx.fill();
          }
          
          // EYES for ALL ghosts (big, cute, slightly worried)
          ctx.fillStyle = THEME.bg;
          const eyeSize = piece.type === 'player' 
            ? Math.min(pw, ph) / 5  // Bigger eyes for player
            : Math.min(pw, ph) / 6;
          const eyeY = cy - eyeSize * 0.3;
          const eyeSpacing = piece.type === 'player' ? eyeSize * 1.5 : eyeSize * 1.2;
          
          // Eye whites
          ctx.beginPath();
          ctx.arc(cx - eyeSpacing, eyeY, eyeSize, 0, Math.PI * 2);
          ctx.arc(cx + eyeSpacing, eyeY, eyeSize, 0, Math.PI * 2);
          ctx.fill();
          
          // Pupils (looking slightly down = worried)
          ctx.fillStyle = '#18181b';
          const pupilSize = eyeSize * 0.5;
          ctx.beginPath();
          ctx.arc(cx - eyeSpacing, eyeY + pupilSize * 0.3, pupilSize, 0, Math.PI * 2);
          ctx.arc(cx + eyeSpacing, eyeY + pupilSize * 0.3, pupilSize, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Furniture (muted, no glow)
          ctx.fillStyle = piece.color;
          ctx.beginPath();
          ctx.roundRect(px + 2 + shakeX, py + 2 + shakeY, pw, ph, 4);
          ctx.fill();
        }
        
        ctx.restore();
      }
      
      // Undo button
      if (gameRef.current.moveHistory.length > 0) {
        const btnX = 20;
        const btnY = canvasSize.h - 60;
        const btnW = 80;
        const btnH = 40;
        
        ctx.fillStyle = THEME.surface;
        ctx.beginPath();
        ctx.roundRect(btnX, btnY, btnW, btnH, 8);
        ctx.fill();
        
        ctx.fillStyle = THEME.text;
        ctx.font = '14px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText('Undo', btnX + btnW/2, btnY + btnH/2 + 5);
      }
      
      // Min moves hint
      ctx.fillStyle = '#6b7280';
      ctx.font = '12px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText(`Par: ${level.minMoves} moves`, canvasSize.w / 2, canvasSize.h - 40);
      
      animationId = requestAnimationFrame(draw);
    };
    
    draw();
    return () => cancelAnimationFrame(animationId);
  }, [gameState, canvasSize, currentLevel, moves, getGridSize]);

  // Handle undo button click
  const handleClick = useCallback((e: React.MouseEvent) => {
    if (gameState !== 'playing') return;
    
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Check undo button
    const btnX = 20;
    const btnY = canvasSize.h - 60;
    const btnW = 80;
    const btnH = 40;
    
    if (x >= btnX && x <= btnX + btnW && y >= btnY && y <= btnY + btnH) {
      undoMove();
    }
  }, [gameState, canvasSize, undoMove]);

  return (
    <>
      <Script src="https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.3/dist/confetti.browser.min.js" />
      
      <div className="min-h-screen flex flex-col items-center justify-center p-4" style={{ backgroundColor: THEME.bg }}>
        {gameState === 'menu' && (
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-4" style={{ color: THEME.text }}>👻 SÉANCE</h1>
            <p className="text-lg mb-8" style={{ color: '#9ca3af' }}>Help the ghost escape!</p>
            <button
              onClick={() => startLevel(0)}
              className="px-8 py-4 rounded-xl text-xl font-bold"
              style={{ backgroundColor: THEME.portal, color: THEME.text }}
            >
              Start
            </button>
          </div>
        )}
        
        {gameState === 'playing' && (
          <canvas
            ref={canvasRef}
            width={canvasSize.w}
            height={canvasSize.h}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
            onClick={handleClick}
            style={{ touchAction: 'none' }}
          />
        )}
        
        {gameState === 'levelComplete' && (
          <div className="text-center">
            <h2 className="text-3xl font-bold mb-4" style={{ color: THEME.text }}>Level Complete!</h2>
            <div className="text-4xl mb-4">
              {'⭐'.repeat(getStars(moves, LEVELS[currentLevel].minMoves))}
              {'☆'.repeat(3 - getStars(moves, LEVELS[currentLevel].minMoves))}
            </div>
            <p className="mb-6" style={{ color: '#9ca3af' }}>
              Moves: {moves} (Par: {LEVELS[currentLevel].minMoves})
            </p>
            <button
              onClick={() => startLevel(currentLevel + 1)}
              className="px-8 py-4 rounded-xl text-xl font-bold"
              style={{ backgroundColor: THEME.portal, color: THEME.text }}
            >
              Next Level
            </button>
          </div>
        )}
        
        {gameState === 'gameComplete' && (
          <div className="text-center">
            <h2 className="text-3xl font-bold mb-4" style={{ color: THEME.text }}>🎉 All Levels Complete!</h2>
            <div className="text-2xl mb-4" style={{ color: THEME.portal }}>
              Total Stars: {totalStars} / {LEVELS.length * 3}
            </div>
            <button
              onClick={() => {
                setTotalStars(0);
                startLevel(0);
              }}
              className="px-8 py-4 rounded-xl text-xl font-bold"
              style={{ backgroundColor: THEME.portal, color: THEME.text }}
            >
              Play Again
            </button>
            
            <div className="mt-6 w-full max-w-sm">
              <ScoreFlow
                score={totalStars}
                gameId={GAME_ID}
                colors={SCORE_FLOW_COLORS}
                onRankReceived={(rank, entryId) => setSubmittedEntryId(entryId ?? null)}
              />
            </div>
            
            <div className="mt-4">
              <ShareButtonContainer
                id="share-btn-seance"
                url={`${typeof window !== 'undefined' ? window.location.origin : ''}/pixelpit/arcade/seance/share/${totalStars}`}
                text={`I escaped with ${totalStars} stars in SÉANCE! 👻`}
                style="minimal"
                socialLoaded={socialLoaded}
              />
            </div>
            
            <button
              onClick={() => setShowLeaderboard(!showLeaderboard)}
              className="mt-4 px-6 py-2 rounded-full border-2"
              style={{ borderColor: THEME.portal, color: THEME.portal, backgroundColor: 'transparent' }}
            >
              {showLeaderboard ? 'Hide Leaderboard' : 'View Leaderboard'}
            </button>
            
            {showLeaderboard && (
              <div className="mt-4 w-full max-w-md">
                <Leaderboard
                  gameId={GAME_ID}
                  limit={10}
                  entryId={submittedEntryId ?? undefined}
                  colors={LEADERBOARD_COLORS}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
