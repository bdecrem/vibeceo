'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import Script from 'next/script';
import {
  ScoreFlow,
  Leaderboard,
  ShareButtonContainer,
  ShareModal,
  usePixelpitSocial,
  type ScoreFlowColors,
  type LeaderboardColors,
  type ProgressionResult,
} from '@/app/pixelpit/components';

const GAME_ID = 'popcult';
const GAME_NAME = 'POP CULT';

const COLS = 10;
const ROWS = 15;
const BALL_COLORS = ['#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6'];
const HIGHLIGHT_COLORS = ['#ff7675', '#74b9ff', '#55efc4', '#ffeaa7', '#d6a2e8'];

const COLORS = {
  bg: '#e8e4dc',
  surface: '#d4d0c8',
  primary: '#222222',
  secondary: '#ff3366',
  text: '#222222',
  muted: '#888888',
  error: '#e74c3c',
};

const SCORE_FLOW_COLORS: ScoreFlowColors = {
  bg: COLORS.bg,
  surface: COLORS.surface,
  primary: COLORS.primary,
  secondary: COLORS.secondary,
  text: COLORS.text,
  muted: COLORS.muted,
  error: COLORS.error,
};

const LEADERBOARD_COLORS: LeaderboardColors = {
  bg: COLORS.bg,
  surface: COLORS.surface,
  primary: COLORS.primary,
  secondary: COLORS.secondary,
  text: COLORS.text,
  muted: COLORS.muted,
};

// ===== AUDIO ENGINE (module-level to survive re-renders) =====
let audioCtx: AudioContext | null = null;
function initAudio() {
  if (!audioCtx) audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  if (audioCtx.state === 'suspended') audioCtx.resume();
}

// Music — Chill puzzle groove, 105 BPM, D minor
const MUSIC_BPM = 105;
const MUSIC_STEP_MS = (60 / MUSIC_BPM) * 1000 / 4;
const M_BASS = [73.42, 0, 0, 0, 0, 0, 73.42, 0, 87.31, 0, 0, 0, 0, 0, 82.41, 0];
const M_ARP = [
  587.33, 0, 698.46, 0, 880, 0, 698.46, 0, 587.33, 0, 0, 880, 0, 698.46, 0, 0,
  466.16, 0, 587.33, 0, 698.46, 0, 0, 587.33, 0, 698.46, 0, 0, 587.33, 0, 466.16, 0,
  392, 0, 466.16, 0, 587.33, 0, 466.16, 0, 0, 587.33, 0, 466.16, 0, 392, 0, 0,
  440, 0, 554.37, 0, 659.25, 0, 0, 554.37, 0, 0, 440, 0, 554.37, 0, 659.25, 0,
];
const M_KICK = [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0];
const M_HAT = [0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 1, 0];

let musicPlaying = false;
let musicInterval: ReturnType<typeof setInterval> | null = null;
let musicStep = 0;

function mKick() {
  if (!audioCtx) return;
  const now = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gn = audioCtx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(120, now);
  osc.frequency.exponentialRampToValueAtTime(35, now + 0.1);
  gn.gain.setValueAtTime(0.15, now);
  gn.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
  osc.connect(gn); gn.connect(audioCtx.destination);
  osc.start(); osc.stop(now + 0.18);
  osc.onended = () => { osc.disconnect(); gn.disconnect(); };
}

function mHat() {
  if (!audioCtx) return;
  const now = audioCtx.currentTime;
  const len = Math.floor(audioCtx.sampleRate * 0.015);
  const buf = audioCtx.createBuffer(1, len, audioCtx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  const src = audioCtx.createBufferSource();
  src.buffer = buf;
  const hp = audioCtx.createBiquadFilter();
  hp.type = 'highpass'; hp.frequency.value = 9000;
  const gn = audioCtx.createGain();
  gn.gain.setValueAtTime(0.04, now);
  gn.gain.exponentialRampToValueAtTime(0.001, now + 0.025);
  src.connect(hp); hp.connect(gn); gn.connect(audioCtx.destination);
  src.start();
  src.onended = () => { src.disconnect(); hp.disconnect(); gn.disconnect(); };
}

function mBass(freq: number) {
  if (!audioCtx || freq === 0) return;
  const now = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const flt = audioCtx.createBiquadFilter();
  const gn = audioCtx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.value = freq;
  flt.type = 'lowpass'; flt.frequency.value = 250; flt.Q.value = 4;
  gn.gain.setValueAtTime(0.08, now);
  gn.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
  osc.connect(flt); flt.connect(gn); gn.connect(audioCtx.destination);
  osc.start(); osc.stop(now + 0.16);
  osc.onended = () => { osc.disconnect(); flt.disconnect(); gn.disconnect(); };
}

function mArp(freq: number) {
  if (!audioCtx || freq === 0) return;
  const now = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const flt = audioCtx.createBiquadFilter();
  const gn = audioCtx.createGain();
  osc.type = 'triangle';
  osc.frequency.value = freq;
  flt.type = 'lowpass'; flt.frequency.value = 2200; flt.Q.value = 1.5;
  gn.gain.setValueAtTime(0.03, now);
  gn.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
  osc.connect(flt); flt.connect(gn); gn.connect(audioCtx.destination);
  osc.start(); osc.stop(now + 0.12);
  osc.onended = () => { osc.disconnect(); flt.disconnect(); gn.disconnect(); };
}

function musicTick() {
  if (!audioCtx || !musicPlaying) return;
  const s16 = musicStep % 16;
  if (M_KICK[s16]) mKick();
  if (M_HAT[s16]) mHat();
  mBass(M_BASS[s16]);
  mArp(M_ARP[musicStep % M_ARP.length]);
  musicStep++;
}

function startMusic() {
  if (musicPlaying) return;
  initAudio();
  musicPlaying = true;
  musicStep = 0;
  musicInterval = setInterval(musicTick, MUSIC_STEP_MS);
}

function stopMusic() {
  musicPlaying = false;
  if (musicInterval) { clearInterval(musicInterval); musicInterval = null; }
}

function playComboSfx(groupSize: number) {
  if (!audioCtx) return;
  const now = audioCtx.currentTime;
  const baseFreq = 400;
  const noteCount = Math.min(groupSize, 12);
  for (let i = 0; i < noteCount; i++) {
    const freq = baseFreq * Math.pow(1.12, i);
    const delay = i * 0.04;
    const osc = audioCtx.createOscillator();
    const gn = audioCtx.createGain();
    osc.type = groupSize >= 10 ? 'sine' : 'triangle';
    osc.frequency.value = freq;
    gn.gain.setValueAtTime(0, now + delay);
    gn.gain.linearRampToValueAtTime(0.08, now + delay + 0.01);
    gn.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.15);
    osc.connect(gn); gn.connect(audioCtx.destination);
    osc.start(now + delay); osc.stop(now + delay + 0.15);
    osc.onended = () => { osc.disconnect(); gn.disconnect(); };
  }
  if (groupSize >= 8) {
    const osc = audioCtx.createOscillator();
    const gn = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(100, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.2);
    gn.gain.setValueAtTime(0.12, now);
    gn.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    osc.connect(gn); gn.connect(audioCtx.destination);
    osc.start(); osc.stop(now + 0.3);
    osc.onended = () => { osc.disconnect(); gn.disconnect(); };
  }
}

function playPopSfx() {
  if (!audioCtx) return;
  const now = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gn = audioCtx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(600, now);
  osc.frequency.exponentialRampToValueAtTime(200, now + 0.06);
  gn.gain.setValueAtTime(0.06, now);
  gn.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
  osc.connect(gn); gn.connect(audioCtx.destination);
  osc.start(); osc.stop(now + 0.08);
  osc.onended = () => { osc.disconnect(); gn.disconnect(); };
}

// ===== GAME LOGIC =====
type Grid = (number | null)[][];

function createGrid(): Grid {
  const grid: Grid = [];
  for (let r = 0; r < ROWS; r++) {
    grid[r] = [];
    for (let c = 0; c < COLS; c++) {
      grid[r][c] = Math.floor(Math.random() * BALL_COLORS.length);
    }
  }
  return grid;
}

function findGroup(grid: Grid, r: number, c: number): [number, number][] {
  const color = grid[r][c];
  if (color === null) return [];
  const visited = new Set<number>();
  const stack: [number, number][] = [[r, c]];
  const group: [number, number][] = [];
  while (stack.length) {
    const [cr, cc] = stack.pop()!;
    const key = cr * COLS + cc;
    if (visited.has(key)) continue;
    if (cr < 0 || cr >= ROWS || cc < 0 || cc >= COLS) continue;
    if (grid[cr][cc] !== color) continue;
    visited.add(key);
    group.push([cr, cc]);
    stack.push([cr - 1, cc], [cr + 1, cc], [cr, cc - 1], [cr, cc + 1]);
  }
  return group;
}

function hasValidMoves(grid: Grid): boolean {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (grid[r][c] === null) continue;
      if (findGroup(grid, r, c).length >= 2) return true;
    }
  }
  return false;
}

function applyGravity(grid: Grid): Grid {
  const newGrid: Grid = grid.map(row => [...row]);
  for (let c = 0; c < COLS; c++) {
    let writeRow = ROWS - 1;
    for (let r = ROWS - 1; r >= 0; r--) {
      if (newGrid[r][c] !== null) {
        if (r !== writeRow) {
          newGrid[writeRow][c] = newGrid[r][c];
          newGrid[r][c] = null;
        }
        writeRow--;
      }
    }
    for (let r = writeRow; r >= 0; r--) newGrid[r][c] = null;
  }
  // Collapse empty columns left
  const activeCols: number[] = [];
  for (let c = 0; c < COLS; c++) {
    if (newGrid[ROWS - 1][c] !== null) activeCols.push(c);
  }
  if (activeCols.length < COLS) {
    const collapsed: Grid = [];
    for (let r = 0; r < ROWS; r++) {
      collapsed[r] = [];
      for (let i = 0; i < activeCols.length; i++) collapsed[r][i] = newGrid[r][activeCols[i]];
      for (let i = activeCols.length; i < COLS; i++) collapsed[r][i] = null;
    }
    return collapsed;
  }
  return newGrid;
}

function countRemaining(grid: Grid): number {
  let count = 0;
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      if (grid[r][c] !== null) count++;
  return count;
}

export default function PopCultGame() {
  const [gameState, setGameState] = useState<'playing' | 'gameover' | 'leaderboard'>('playing');
  const [score, setScore] = useState(0);
  const [socialLoaded, setSocialLoaded] = useState(false);
  const [submittedEntryId, setSubmittedEntryId] = useState<number | null>(null);
  const [progression, setProgression] = useState<ProgressionResult | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);

  const { user } = usePixelpitSocial(socialLoaded);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scoreRef = useRef(0);
  const gridRef = useRef<Grid>(createGrid());
  const busyRef = useRef(false);
  const hoveredGroupRef = useRef<[number, number][]>([]);
  const animationsRef = useRef<{ r: number; c: number; type: string; startTime: number }[]>([]);
  const cellSizeRef = useRef(0);
  const previewRef = useRef<HTMLDivElement>(null);
  const comboRef = useRef<HTMLDivElement>(null);

  const GAME_URL = typeof window !== 'undefined'
    ? `${window.location.origin}/pixelpit/arcade/${GAME_ID}`
    : `https://pixelpit.gg/pixelpit/arcade/${GAME_ID}`;

  // Group code detection
  useEffect(() => {
    if (!socialLoaded || typeof window === 'undefined') return;
    if (!window.PixelpitSocial) return;
    const params = new URLSearchParams(window.location.search);
    if (params.has('logout')) {
      window.PixelpitSocial.logout();
      params.delete('logout');
      const newUrl = params.toString() ? `${window.location.pathname}?${params.toString()}` : window.location.pathname;
      window.history.replaceState({}, '', newUrl);
      window.location.reload();
      return;
    }
    const groupCode = window.PixelpitSocial.getGroupCodeFromUrl();
    if (groupCode) window.PixelpitSocial.storeGroupCode(groupCode);
  }, [socialLoaded]);

  // Canvas drawing
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const grid = gridRef.current;
    const cellSize = cellSizeRef.current;
    const hoveredGroup = hoveredGroupRef.current;
    const animations = animationsRef.current;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#d4d0c8';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const hoverSet = new Set(hoveredGroup.map(([r, c]) => r * COLS + c));
    const now = performance.now();

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (grid[r][c] === null) continue;
        const x = c * cellSize;
        const y = r * cellSize;
        const colorIdx = grid[r][c]!;
        const isHovered = hoverSet.has(r * COLS + c);
        const radius = cellSize * 0.42;
        const cx = x + cellSize / 2;
        const cy = y + cellSize / 2;

        const grad = ctx.createRadialGradient(cx - radius * 0.25, cy - radius * 0.3, radius * 0.1, cx, cy, radius);
        if (isHovered) {
          grad.addColorStop(0, '#fff');
          grad.addColorStop(0.4, HIGHLIGHT_COLORS[colorIdx]);
          grad.addColorStop(1, BALL_COLORS[colorIdx]);
        } else {
          grad.addColorStop(0, HIGHLIGHT_COLORS[colorIdx]);
          grad.addColorStop(1, BALL_COLORS[colorIdx]);
        }

        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();

        if (!isHovered) {
          ctx.beginPath();
          ctx.arc(cx + 1, cy + 2, radius, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(0,0,0,0.06)';
          ctx.fill();
          ctx.beginPath();
          ctx.arc(cx, cy, radius, 0, Math.PI * 2);
          ctx.fillStyle = grad;
          ctx.fill();
        }

        if (isHovered) {
          ctx.beginPath();
          ctx.arc(cx, cy, radius + 1, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(255,255,255,0.6)';
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      }
    }

    // Pop animations
    for (let i = animations.length - 1; i >= 0; i--) {
      const a = animations[i];
      const elapsed = now - a.startTime;
      const progress = Math.min(elapsed / 250, 1);
      if (a.type === 'pop') {
        const cx = a.c * cellSize + cellSize / 2;
        const cy = a.r * cellSize + cellSize / 2;
        const baseRadius = cellSize * 0.42;
        const animR = baseRadius * (1 + progress * 0.5);
        const alpha = 1 - progress;
        ctx.beginPath();
        ctx.arc(cx, cy, animR, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${alpha * 0.5})`;
        ctx.fill();
      }
      if (progress >= 1) animations.splice(i, 1);
    }

    if (animations.length > 0) requestAnimationFrame(draw);
  }, []);

  // Resize handler
  const resize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const maxW = Math.min(window.innerWidth * 0.95, 420);
    const cs = Math.floor(maxW / COLS);
    cellSizeRef.current = cs;
    canvas.width = cs * COLS;
    canvas.height = cs * ROWS;
    draw();
  }, [draw]);

  // Init game
  const initGame = useCallback(() => {
    gridRef.current = createGrid();
    scoreRef.current = 0;
    busyRef.current = false;
    hoveredGroupRef.current = [];
    animationsRef.current = [];
    setScore(0);
    setSubmittedEntryId(null);
    setProgression(null);
    setShowShareModal(false);
    setGameState('playing');
    stopMusic();
    setTimeout(resize, 0);
  }, [resize]);

  // Setup canvas events
  useEffect(() => {
    if (gameState !== 'playing') return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    resize();
    window.addEventListener('resize', resize);

    function getGridPos(e: MouseEvent | TouchEvent): [number, number] | null {
      const rect = canvas!.getBoundingClientRect();
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      const c = Math.floor(x / cellSizeRef.current);
      const r = Math.floor(y / cellSizeRef.current);
      if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return null;
      return [r, c];
    }

    function handleMouseMove(e: MouseEvent) {
      if (busyRef.current) return;
      const pos = getGridPos(e);
      const preview = previewRef.current;
      if (!pos) { hoveredGroupRef.current = []; if (preview) preview.textContent = ''; draw(); return; }
      const [r, c] = pos;
      const grid = gridRef.current;
      if (grid[r][c] === null) { hoveredGroupRef.current = []; if (preview) preview.textContent = ''; draw(); return; }
      const group = findGroup(grid, r, c);
      if (group.length < 2) { hoveredGroupRef.current = []; if (preview) preview.textContent = ''; draw(); return; }
      hoveredGroupRef.current = group;
      const pts = group.length * (group.length - 1);
      if (preview) preview.textContent = `${group.length} balls \u00b7 ${pts} pts`;
      draw();
    }

    function handleMouseLeave() {
      hoveredGroupRef.current = [];
      if (previewRef.current) previewRef.current.textContent = '';
      draw();
    }

    async function handleTap(e: MouseEvent | TouchEvent) {
      if ('touches' in e) e.preventDefault();
      if (busyRef.current) return;
      const pos = getGridPos(e);
      if (!pos) return;
      const [r, c] = pos;
      const grid = gridRef.current;
      if (grid[r][c] === null) return;
      const group = findGroup(grid, r, c);
      if (group.length < 2) return;

      busyRef.current = true;
      hoveredGroupRef.current = [];
      if (previewRef.current) previewRef.current.textContent = '';

      // Start music on first tap
      if (!musicPlaying) startMusic();

      // Score — classic n*(n-1)
      const pts = group.length * (group.length - 1);
      scoreRef.current += pts;
      setScore(scoreRef.current);

      // Combo SFX + text
      playComboSfx(group.length);
      const combo = comboRef.current;
      if (combo && group.length >= 4) {
        combo.textContent = group.length >= 20 ? `LEGENDARY \u00b7 ${pts}` :
                            group.length >= 15 ? `INCREDIBLE \u00b7 ${pts}` :
                            group.length >= 10 ? `MASSIVE \u00b7 ${pts}` :
                            group.length >= 6 ? `NICE \u00b7 ${pts}` :
                            `${pts} pts`;
        combo.className = 'show';
        setTimeout(() => { if (combo) combo.className = ''; }, 900);
      }

      // Pop animation + sfx
      playPopSfx();
      const now = performance.now();
      for (const [gr, gc] of group) {
        animationsRef.current.push({ r: gr, c: gc, type: 'pop', startTime: now });
        grid[gr][gc] = null;
      }
      draw();

      await new Promise(resolve => setTimeout(resolve, 280));

      // Gravity + collapse
      gridRef.current = applyGravity(grid);
      draw();

      // Check game over
      if (!hasValidMoves(gridRef.current)) {
        await new Promise(resolve => setTimeout(resolve, 600));
        const remaining = countRemaining(gridRef.current);
        if (remaining === 0) {
          scoreRef.current += 2000;
          setScore(scoreRef.current);
          if (combo) {
            combo.textContent = 'PERFECT';
            combo.className = 'show';
          }
          await new Promise(resolve => setTimeout(resolve, 1200));
        }
        stopMusic();
        // Analytics
        fetch('/api/pixelpit/stats', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ game: GAME_ID }),
        }).catch(() => {});
        setGameState('gameover');
      }

      busyRef.current = false;
    }

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseleave', handleMouseLeave);
    canvas.addEventListener('click', handleTap);
    canvas.addEventListener('touchstart', handleTap as any, { passive: false });

    return () => {
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
      canvas.removeEventListener('click', handleTap);
      canvas.removeEventListener('touchstart', handleTap as any);
      stopMusic();
    };
  }, [gameState, draw, resize]);

  return (
    <>
      <Script src="/pixelpit/social.js" onLoad={() => setSocialLoaded(true)} />

      <style jsx global>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          background: ${COLORS.bg};
          font-family: -apple-system, system-ui, 'Segoe UI', sans-serif;
          touch-action: manipulation;
          -webkit-user-select: none;
          user-select: none;
          overflow: hidden;
        }
        .combo {
          position: fixed;
          top: 45%;
          left: 50%;
          transform: translate(-50%, -50%);
          font-size: 42px;
          font-weight: 900;
          color: #ff3366;
          text-shadow: 0 2px 8px rgba(255,51,102,0.3);
          pointer-events: none;
          opacity: 0;
          z-index: 10;
        }
        .combo.show {
          animation: comboFlash 0.9s ease-out forwards;
        }
        @keyframes comboFlash {
          0% { opacity: 1; transform: translate(-50%, -50%) scale(0.6); }
          25% { opacity: 1; transform: translate(-50%, -50%) scale(1.15); }
          100% { opacity: 0; transform: translate(-50%, -50%) scale(1) translateY(-40px); }
        }
      `}</style>

      {/* --- PLAYING --- */}
      {gameState === 'playing' && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          minHeight: '100dvh',
          paddingTop: 'env(safe-area-inset-top)',
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            width: 'min(95vw, 420px)',
            padding: '10px 4px 6px',
          }}>
            <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: 3, textTransform: 'uppercase' as const, color: '#444' }}>
              Pop Cult
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#666', fontVariantNumeric: 'tabular-nums' }}>
              {score.toLocaleString()}
            </div>
          </div>
          <canvas
            ref={canvasRef}
            style={{ borderRadius: 8, boxShadow: '0 2px 16px rgba(0,0,0,0.12)', cursor: 'pointer' }}
          />
          <div ref={previewRef} style={{
            height: 22, color: '#999', fontSize: 12, marginTop: 6,
            fontWeight: 500, fontVariantNumeric: 'tabular-nums',
          }} />
          <div ref={comboRef} className="combo" />
        </div>
      )}

      {/* --- GAME OVER --- */}
      {gameState === 'gameover' && (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          background: COLORS.bg,
        }}>
          <div style={{
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            maxWidth: 400,
            width: '100%',
          }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#222', letterSpacing: 2, marginBottom: 4 }}>
              GAME OVER
            </div>
            <div style={{ fontSize: 14, color: '#888', marginBottom: 20 }}>no more moves</div>

            <div style={{ fontSize: 64, fontWeight: 900, color: '#222', marginBottom: 8, lineHeight: 1 }}>
              {score.toLocaleString()}
            </div>
            <div style={{ fontSize: 12, color: '#888', letterSpacing: 2, marginBottom: 24 }}>POINTS</div>

            {progression && (
              <div style={{
                background: COLORS.surface,
                borderRadius: 12,
                padding: '16px 24px',
                marginBottom: 20,
                textAlign: 'center',
              }}>
                <div style={{ fontSize: 18, color: COLORS.secondary, marginBottom: 8 }}>
                  +{progression.xpEarned} XP
                </div>
                <div style={{ fontSize: 12, color: COLORS.muted }}>
                  Level {progression.level}{progression.streak > 1 ? ` \u2022 ${progression.multiplier}x streak` : ''}
                </div>
              </div>
            )}

            <ScoreFlow
              score={score}
              gameId={GAME_ID}
              colors={SCORE_FLOW_COLORS}
              maxScore={600}
              onRankReceived={(rank, entryId) => setSubmittedEntryId(entryId ?? null)}
              onProgression={(prog) => setProgression(prog)}
            />

            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              alignItems: 'center',
              marginTop: 20,
              width: '100%',
            }}>
              <button onClick={initGame} style={{
                fontSize: 15,
                padding: '14px 40px',
                border: '2px solid #222',
                background: '#222',
                color: COLORS.bg,
                borderRadius: 24,
                cursor: 'pointer',
                letterSpacing: 2,
                fontWeight: 700,
                textTransform: 'uppercase' as const,
                fontFamily: 'inherit',
              }}>
                AGAIN
              </button>
              <button onClick={() => setGameState('leaderboard')} style={{
                background: 'transparent',
                border: `1px solid ${COLORS.surface}`,
                borderRadius: 6,
                color: COLORS.muted,
                padding: '12px 30px',
                fontSize: 11,
                fontFamily: 'inherit',
                cursor: 'pointer',
                letterSpacing: 2,
              }}>
                leaderboard
              </button>
              {user ? (
                <button onClick={() => setShowShareModal(true)} style={{
                  background: 'transparent',
                  border: `1px solid ${COLORS.surface}`,
                  borderRadius: 6,
                  color: COLORS.muted,
                  padding: '12px 30px',
                  fontSize: 11,
                  fontFamily: 'inherit',
                  cursor: 'pointer',
                  letterSpacing: 2,
                }}>
                  share / groups
                </button>
              ) : (
                <ShareButtonContainer
                  id="share-btn-container"
                  url={typeof window !== 'undefined' ? `${window.location.origin}/pixelpit/arcade/${GAME_ID}/share/${score}` : ''}
                  text={`I scored ${score} on POP CULT! Can you beat me?`}
                  style="minimal"
                  socialLoaded={socialLoaded}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- LEADERBOARD --- */}
      {gameState === 'leaderboard' && (
        <Leaderboard
          gameId={GAME_ID}
          limit={10}
          entryId={submittedEntryId ?? undefined}
          colors={LEADERBOARD_COLORS}
          onClose={() => setGameState('gameover')}
          groupsEnabled={true}
          gameUrl={GAME_URL}
          socialLoaded={socialLoaded}
        />
      )}

      {/* --- SHARE MODAL --- */}
      {showShareModal && user && (
        <ShareModal
          gameUrl={GAME_URL}
          score={score}
          colors={LEADERBOARD_COLORS}
          onClose={() => setShowShareModal(false)}
        />
      )}
    </>
  );
}
