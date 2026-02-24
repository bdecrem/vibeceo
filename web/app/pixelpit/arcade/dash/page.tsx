'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
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

const T = {
  bg: '#09090b',
  surface: '#18181b',
  border: '#27272a',
  pink: '#f472b6',
  cyan: '#22d3ee',
  gold: '#facc15',
  green: '#a3e635',
  white: '#ffffff',
  muted: '#71717a',
  danger: '#ef4444',
};

const COLORS = {
  bg: '#09090b', surface: '#18181b', primary: '#22d3ee', secondary: '#a3e635',
  text: '#ffffff', muted: '#71717a', error: '#ef4444',
};

const SCORE_FLOW_COLORS: ScoreFlowColors = { ...COLORS };
const LEADERBOARD_COLORS: LeaderboardColors = { ...COLORS };
const GAME_ID = 'dash';

const CELL = 40;
const HOP_TIME = 0.08;
const PLAYER_R = 6;
const ION_R = 5;
const MAX_CHARGE = 5;
const DEATH_PUSH_SPEED = 0.6;

interface Signal { x: number; w: number; }
interface Lane {
  type: 'rest' | 'slow' | 'fast' | 'inhibitor' | 'bridge';
  speed?: number; signals?: Signal[]; flickerPhase?: number;
  pads?: { col: number; fadeTimer: number; alive: boolean }[];
}
interface Ion { col: number; row: number; alive: boolean; pulse: number; }
interface Particle { x: number; y: number; vx: number; vy: number; life: number; color: string; size: number; }
interface HopAnim { fromCol: number; fromRow: number; toCol: number; toRow: number; timer: number; duration: number; }
interface TrailPoint { x: number; y: number; age: number; }

interface TutStep {
  name: string;
  instruction: string;
  setup: (game: GameState) => void;
  check: (game: GameState) => boolean;
}

interface GameState {
  player: { col: number; row: number; bursting?: boolean };
  lanes: Map<number, Lane>; ions: Ion[]; particles: Particle[];
  trail: TrailPoint[];
  cameraRow: number; score: number; charge: number;
  phase: 'start' | 'playing' | 'dead' | 'over' | 'tutorial';
  gameTime: number; deathWallRow: number;
  hopAnim: HopAnim | null;
  freezeTimer: number; flashColor: string | null; flashTimer: number;
  screenDarkness: number;
  safeTop: number; audioCtx: AudioContext | null;
  running: boolean; W: number; H: number;
  // Tutorial
  tutStep: number; tutSuccess: boolean; tutSuccessTimer: number;
  tutHops: number; tutIonsCollected: number; tutBursted: boolean;
  // Touch
  touchStartX: number; touchStartY: number; touchStartTime: number;
  // Death
  deathPulseInterval: ReturnType<typeof setInterval> | null;
  deathTimeout: ReturnType<typeof setTimeout> | null;
}

export default function DashGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<'start' | 'playing' | 'tutorial' | 'gameover' | 'leaderboard'>('start');
  const [score, setScore] = useState(0);
  const [socialLoaded, setSocialLoaded] = useState(false);
  const [submittedEntryId, setSubmittedEntryId] = useState<number | null>(null);
  const [progression, setProgression] = useState<ProgressionResult | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const { user } = usePixelpitSocial(socialLoaded);
  const GAME_URL = typeof window !== 'undefined' ? `${window.location.origin}/pixelpit/arcade/dash` : 'https://pixelpit.gg/pixelpit/arcade/dash';

  useEffect(() => {
    if (!socialLoaded || typeof window === 'undefined' || !window.PixelpitSocial) return;
    const params = new URLSearchParams(window.location.search);
    if (params.has('logout')) {
      window.PixelpitSocial.logout(); params.delete('logout');
      window.history.replaceState({}, '', params.toString() ? `${window.location.pathname}?${params.toString()}` : window.location.pathname);
      window.location.reload(); return;
    }
    const groupCode = window.PixelpitSocial.getGroupCodeFromUrl();
    if (groupCode) window.PixelpitSocial.storeGroupCode(groupCode);
  }, [socialLoaded]);

  const g = useRef<GameState>({
    player: { col: 0, row: 0 },
    lanes: new Map(), ions: [], particles: [], trail: [],
    cameraRow: 0, score: 0, charge: 2,
    phase: 'start', gameTime: 0, deathWallRow: -4,
    hopAnim: null, freezeTimer: 0, flashColor: null, flashTimer: 0,
    screenDarkness: 0, safeTop: 0, audioCtx: null, running: false, W: 0, H: 0,
    tutStep: 0, tutSuccess: false, tutSuccessTimer: 0,
    tutHops: 0, tutIonsCollected: 0, tutBursted: false,
    touchStartX: 0, touchStartY: 0, touchStartTime: 0,
    deathPulseInterval: null, deathTimeout: null,
  });

  const initAudio = useCallback(() => {
    const game = g.current;
    if (!game.audioCtx) game.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    if (game.audioCtx.state === 'suspended') game.audioCtx.resume();
  }, []);

  const playHop = useCallback(() => {
    const ctx = g.current.audioCtx; if (!ctx) return;
    const bufSize = ctx.sampleRate * 0.02;
    const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1) * 0.3;
    const src = ctx.createBufferSource(); src.buffer = buf;
    const gn = ctx.createGain();
    gn.gain.setValueAtTime(0.15, ctx.currentTime);
    gn.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.02);
    src.connect(gn); gn.connect(ctx.destination);
    src.start(); src.stop(ctx.currentTime + 0.02);
  }, []);

  const playCollect = useCallback(() => {
    const ctx = g.current.audioCtx; if (!ctx) return;
    const notes = [440, 528, 660, 792, 880, 1056, 1320];
    const freq = notes[Math.floor(Math.random() * notes.length)];
    const osc = ctx.createOscillator(); const gn = ctx.createGain();
    osc.connect(gn); gn.connect(ctx.destination);
    osc.type = 'sine'; osc.frequency.value = freq;
    gn.gain.setValueAtTime(0.1, ctx.currentTime);
    gn.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    osc.start(); osc.stop(ctx.currentTime + 0.15);
  }, []);

  const playBurst = useCallback(() => {
    const ctx = g.current.audioCtx; if (!ctx) return;
    for (let i = 0; i < 3; i++) {
      const osc = ctx.createOscillator(); const gn = ctx.createGain();
      osc.connect(gn); gn.connect(ctx.destination);
      osc.type = 'square'; osc.frequency.value = [200, 300, 400][i];
      gn.gain.setValueAtTime(0.06, ctx.currentTime);
      gn.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
      osc.start(); osc.stop(ctx.currentTime + 0.2);
    }
  }, []);

  const playDeath = useCallback(() => {
    const ctx = g.current.audioCtx; if (!ctx) return;
    const bufSize = ctx.sampleRate * 0.3;
    const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1);
    const src = ctx.createBufferSource(); src.buffer = buf;
    const gn = ctx.createGain();
    gn.gain.setValueAtTime(0.2, ctx.currentTime);
    gn.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    src.connect(gn); gn.connect(ctx.destination);
    src.start(); src.stop(ctx.currentTime + 0.3);
  }, []);

  const startGame = useCallback(() => {
    initAudio();
    const game = g.current;
    const cols = Math.floor(game.W / CELL);
    game.player = { col: Math.floor(cols / 2), row: 0 };
    game.lanes = new Map(); game.ions = []; game.particles = []; game.trail = [];
    game.cameraRow = 0; game.score = 0; game.charge = 2;
    game.gameTime = 0; game.deathWallRow = -4;
    game.hopAnim = null; game.freezeTimer = 0; game.flashColor = null; game.flashTimer = 0;
    game.screenDarkness = 0;
    for (let r = -2; r < 40; r++) generateRow(game, r);
    game.phase = 'playing'; game.running = true;
    setGameState('playing'); setShowShareModal(false); setProgression(null);
  }, [initAudio]);

  const startTutorial = useCallback(() => {
    initAudio();
    const game = g.current;
    game.phase = 'tutorial'; game.running = true;
    game.tutStep = 0; game.tutSuccess = false; game.tutSuccessTimer = 0;
    game.gameTime = 0;
    setGameState('tutorial');
  }, [initAudio]);

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;

    function resize() {
      canvas!.width = window.innerWidth; canvas!.height = window.innerHeight;
      g.current.W = canvas!.width; g.current.H = canvas!.height;
      g.current.safeTop = parseInt(getComputedStyle(document.documentElement).getPropertyValue('env(safe-area-inset-top)')) || 0;
    }
    resize(); window.addEventListener('resize', resize);

    // --- Lane generation ---
    function makeSignalLane(type: 'slow' | 'fast' | 'inhibitor', d: number, W: number): Lane {
      const baseSpeed = type === 'slow' ? 80 : type === 'fast' ? 180 : 120;
      const speed = baseSpeed + d * 80;
      const dir = type === 'inhibitor' ? -1 : (Math.random() < 0.5 ? 1 : -1);
      const gap = type === 'slow' ? (180 - d * 40) : (140 - d * 30);
      const signals: Signal[] = [];
      const count = Math.ceil((W + 400) / gap);
      for (let i = 0; i < count; i++) {
        signals.push({
          x: i * gap + Math.random() * gap * 0.3,
          w: type === 'slow' ? 30 + Math.random() * 15 : type === 'fast' ? 10 + Math.random() * 8 : 20 + Math.random() * 10,
        });
      }
      return { type, speed: speed * dir, signals, flickerPhase: Math.random() * Math.PI * 2 };
    }

    function makeBridgeLane(d: number, W: number): Lane {
      const padCount = 3 + Math.floor(Math.random() * 3);
      const pads = [];
      const spacing = W / (padCount + 1);
      const cols = Math.floor(W / CELL);
      for (let i = 0; i < padCount; i++) {
        const cx = spacing * (i + 1) + (Math.random() - 0.5) * spacing * 0.3;
        const col = Math.round(cx / CELL);
        pads.push({ col: Math.max(1, Math.min(cols - 2, col)), fadeTimer: 2.5 + Math.random() * 1.5 - d * 0.8, alive: true });
      }
      return { type: 'bridge', pads };
    }

    function makeLane(row: number, difficulty: number, W: number): Lane {
      const d = Math.min(difficulty, 1);
      if (row <= 2) return { type: 'rest' };
      if (row <= 10) {
        if (Math.random() < 0.4) return { type: 'rest' };
        return makeSignalLane('slow', d, W);
      }
      if (row <= 25) {
        const r = Math.random();
        if (r < 0.15) return { type: 'rest' };
        if (r < 0.25) return makeBridgeLane(d, W);
        if (r < 0.4) return makeSignalLane('fast', d, W);
        if (r < 0.55 && row > 15) return makeSignalLane('inhibitor', d, W);
        return makeSignalLane('slow', d, W);
      }
      const r = Math.random();
      if (r < 0.08) return { type: 'rest' };
      if (r < 0.2) return makeBridgeLane(d, W);
      if (r < 0.4) return makeSignalLane('fast', d, W);
      if (r < 0.6) return makeSignalLane('inhibitor', d, W);
      return makeSignalLane('slow', d, W);
    }

    // --- Tutorial steps ---
    const TUT_STEPS: TutStep[] = [
      {
        name: 'HOP FORWARD', instruction: 'TAP TO HOP',
        setup(game) {
          const cols = Math.floor(game.W / CELL);
          game.player = { col: Math.floor(cols / 2), row: 0 };
          game.lanes = new Map(); game.ions = []; game.particles = []; game.trail = [];
          game.cameraRow = 0; game.score = 0; game.charge = 2; game.deathWallRow = -999;
          game.hopAnim = null; game.freezeTimer = 0; game.flashTimer = 0; game.screenDarkness = 0;
          game.tutHops = 0;
          for (let r = -1; r <= 5; r++) game.lanes.set(r, { type: 'rest' });
        },
        check(game) { return game.tutHops >= 4; },
      },
      {
        name: 'DODGE SIGNALS', instruction: 'TIME YOUR HOPS',
        setup(game) {
          const cols = Math.floor(game.W / CELL);
          game.player = { col: Math.floor(cols / 2), row: 0 };
          game.lanes = new Map(); game.ions = []; game.particles = []; game.trail = [];
          game.cameraRow = 0; game.score = 0; game.charge = 2; game.deathWallRow = -999;
          game.hopAnim = null; game.freezeTimer = 0; game.flashTimer = 0; game.screenDarkness = 0;
          game.tutHops = 0;
          game.lanes.set(-1, { type: 'rest' });
          game.lanes.set(0, { type: 'rest' });
          game.lanes.set(1, makeSignalLane('slow', 0, game.W));
          game.lanes.set(2, { type: 'rest' });
          game.lanes.set(3, makeSignalLane('slow', 0, game.W));
          game.lanes.set(4, { type: 'rest' });
          game.lanes.set(5, { type: 'rest' });
        },
        check(game) { return game.player.row >= 4; },
      },
      {
        name: 'COLLECT IONS', instruction: 'FLY THROUGH GREEN DOTS',
        setup(game) {
          const cols = Math.floor(game.W / CELL);
          const mid = Math.floor(cols / 2);
          game.player = { col: mid, row: 0 };
          game.lanes = new Map(); game.ions = []; game.particles = []; game.trail = [];
          game.cameraRow = 0; game.score = 0; game.charge = 0; game.deathWallRow = -999;
          game.hopAnim = null; game.freezeTimer = 0; game.flashTimer = 0; game.screenDarkness = 0;
          game.tutIonsCollected = 0;
          for (let r = -1; r <= 8; r++) game.lanes.set(r, { type: 'rest' });
          game.ions.push({ col: mid, row: 1.5, alive: true, pulse: 0 });
          game.ions.push({ col: mid + 1, row: 3.5, alive: true, pulse: 1 });
          game.ions.push({ col: mid - 1, row: 5.5, alive: true, pulse: 2 });
        },
        check(game) { return game.tutIonsCollected >= 3; },
      },
      {
        name: 'BURST', instruction: 'LONG PRESS WHEN FULL',
        setup(game) {
          const cols = Math.floor(game.W / CELL);
          game.player = { col: Math.floor(cols / 2), row: 0 };
          game.lanes = new Map(); game.ions = []; game.particles = []; game.trail = [];
          game.cameraRow = 0; game.score = 0; game.charge = MAX_CHARGE; game.deathWallRow = -999;
          game.hopAnim = null; game.freezeTimer = 0; game.flashTimer = 0; game.screenDarkness = 0;
          game.tutBursted = false;
          game.lanes.set(-1, { type: 'rest' });
          game.lanes.set(0, { type: 'rest' });
          const sigLane = makeSignalLane('slow', 0.3, game.W);
          sigLane.speed = (sigLane.speed || 0) * 0.3;
          game.lanes.set(1, sigLane);
          game.lanes.set(2, { type: 'rest' });
          game.lanes.set(3, { type: 'rest' });
        },
        check(game) { return game.tutBursted && game.player.row >= 2; },
      },
      {
        name: 'DASH!', instruction: 'REACH ROW 10',
        setup(game) {
          const cols = Math.floor(game.W / CELL);
          game.player = { col: Math.floor(cols / 2), row: 0 };
          game.lanes = new Map(); game.ions = []; game.particles = []; game.trail = [];
          game.cameraRow = 0; game.score = 0; game.charge = 2; game.deathWallRow = -999;
          game.hopAnim = null; game.freezeTimer = 0; game.flashTimer = 0; game.screenDarkness = 0;
          for (let r = -2; r < 20; r++) {
            if (r <= 1) game.lanes.set(r, { type: 'rest' });
            else {
              const d = Math.min(r / 80, 0.3);
              game.lanes.set(r, makeLane(r, d, game.W));
            }
          }
          for (let r = 2; r < 15; r++) {
            if (Math.random() < 0.5) {
              game.ions.push({ col: 1 + Math.floor(Math.random() * (cols - 2)), row: r + 0.5, alive: true, pulse: Math.random() * 6 });
            }
          }
        },
        check(game) { return game.score >= 10; },
      },
    ];

    // --- Helpers ---
    function getWorldPos(game: GameState, col: number, row: number) {
      const x = col * CELL + CELL / 2;
      const y = game.H * 0.7 - (row - game.cameraRow) * CELL;
      return { x, y };
    }

    function spawnParticles(game: GameState, x: number, y: number, color: string, count: number) {
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2, speed = 30 + Math.random() * 80;
        game.particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: 1, color, size: 1.5 + Math.random() * 2.5 });
      }
    }

    function activateBurst(game: GameState) {
      if (game.charge < MAX_CHARGE) return;
      game.charge = 0;
      game.player.bursting = true;
      setTimeout(() => { game.player.bursting = false; }, 300);
      playBurst();
      game.flashColor = T.gold; game.flashTimer = 0.15;
      const pos = getWorldPos(game, game.player.col, game.player.row);
      spawnParticles(game, pos.x, pos.y, T.gold, 15);
    }

    function tryHop(game: GameState, dc: number, dr: number) {
      if (game.hopAnim) return;
      const cols = Math.floor(game.W / CELL);
      const newCol = game.player.col + dc;
      const newRow = game.player.row + dr;
      if (newCol < 0 || newCol >= cols) return;
      game.hopAnim = { fromCol: game.player.col, fromRow: game.player.row, toCol: newCol, toRow: newRow, timer: 0, duration: HOP_TIME };
      playHop();
    }

    function collectIons(game: GameState) {
      for (const ion of game.ions) {
        if (!ion.alive) continue;
        if (Math.abs(ion.col - game.player.col) < 1 && Math.abs(ion.row - game.player.row) < 1) {
          ion.alive = false;
          game.charge = Math.min(game.charge + 1, MAX_CHARGE);
          playCollect();
          const pos = getWorldPos(game, ion.col, ion.row);
          spawnParticles(game, pos.x, pos.y, T.green, 6);
        }
      }
    }

    function checkCollisionAt(game: GameState, col: number, row: number): boolean {
      const lane = game.lanes.get(row);
      if (!lane) return false;
      if (lane.type === 'slow' || lane.type === 'fast' || lane.type === 'inhibitor') {
        const px = col * CELL + CELL / 2;
        for (const sig of lane.signals || []) {
          if (px > sig.x - sig.w / 2 - PLAYER_R && px < sig.x + sig.w / 2 + PLAYER_R) {
            if (game.player.bursting) {
              spawnParticles(game, px, getWorldPos(game, col, row).y, T.gold, 10);
              sig.x = -9999;
              return false;
            }
            die(game);
            return true;
          }
        }
      }
      if (lane.type === 'bridge') {
        const onPad = (lane.pads || []).some(pad => pad.alive && Math.abs(pad.col - col) <= 1);
        if (!onPad) { die(game); return true; }
      }
      return false;
    }

    let humOsc: OscillatorNode | null = null;
    let humGain: GainNode | null = null;
    function startHum(game: GameState) {
      if (!game.audioCtx || humOsc) return;
      humOsc = game.audioCtx.createOscillator();
      humGain = game.audioCtx.createGain();
      humOsc.connect(humGain); humGain.connect(game.audioCtx.destination);
      humOsc.type = 'sine'; humOsc.frequency.value = 60;
      humGain.gain.value = 0.03;
      humOsc.start();
    }
    function stopHum() {
      if (humOsc) { try { humOsc.stop(); } catch {} humOsc = null; humGain = null; }
    }

    function die(game: GameState) {
      game.phase = 'dead';
      playDeath();
      stopHum();
      game.freezeTimer = 0.03;
      game.flashColor = T.white; game.flashTimer = 0.1;
      if (game.deathPulseInterval) clearInterval(game.deathPulseInterval);
      if (game.deathTimeout) clearTimeout(game.deathTimeout);
      game.deathPulseInterval = setInterval(() => {
        const actx = game.audioCtx; if (!actx) return;
        const osc = actx.createOscillator(); const gn = actx.createGain();
        osc.connect(gn); gn.connect(actx.destination);
        osc.type = 'sine'; osc.frequency.value = 40;
        gn.gain.setValueAtTime(0.08, actx.currentTime);
        gn.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + 0.15);
        osc.start(); osc.stop(actx.currentTime + 0.15);
      }, 500);
      game.deathTimeout = setTimeout(() => {
        if (game.deathPulseInterval) clearInterval(game.deathPulseInterval);
        game.deathPulseInterval = null;
        game.phase = 'over'; game.running = false;
        setScore(game.score); setGameState('gameover');
        fetch('/api/pixelpit/stats', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ game: GAME_ID }) }).catch(() => {});
      }, 1500);
    }

    // --- Drawing helpers ---
    function drawNerveBackground(game: GameState) {
      ctx!.strokeStyle = T.border; ctx!.lineWidth = 1; ctx!.globalAlpha = 0.3;
      const scrollOffset = game.cameraRow * CELL * 0.3;
      for (let i = 0; i < 8; i++) {
        const sx = ((i * 137 + 42) % game.W);
        const baseY = ((i * 89 + 17) % (game.H + 200)) - 100 + (scrollOffset % (game.H + 200));
        ctx!.beginPath(); ctx!.moveTo(sx, baseY);
        for (let j = 0; j < 5; j++) {
          ctx!.lineTo(sx + (j + 1) * 25 * (i % 2 === 0 ? 1 : -1), baseY + (j + 1) * 35);
        }
        ctx!.stroke();
      }
      ctx!.globalAlpha = 1;
    }

    function drawLanes(game: GameState) {
      for (const [row, lane] of game.lanes) {
        const { y } = getWorldPos(game, 0, row);
        if (y < -CELL * 2 || y > game.H + CELL * 2) continue;
        if (lane.type === 'rest') {
          ctx!.fillStyle = T.surface; ctx!.globalAlpha = 0.15;
          ctx!.fillRect(0, y - CELL / 2, game.W, CELL); ctx!.globalAlpha = 1;
        }
        if (lane.type === 'slow' || lane.type === 'fast' || lane.type === 'inhibitor') {
          const color = lane.type === 'slow' ? T.pink : lane.type === 'fast' ? T.cyan : T.gold;
          for (const sig of lane.signals || []) {
            if (sig.x < -60 || sig.x > game.W + 60) continue;
            let alpha = 1;
            if (lane.type === 'fast') alpha = 0.3 + Math.abs(Math.sin(game.gameTime * 8 + (lane.flickerPhase || 0))) * 0.7;
            ctx!.fillStyle = color; ctx!.globalAlpha = alpha;
            ctx!.shadowBlur = 6; ctx!.shadowColor = color;
            const sh = lane.type === 'slow' ? 10 : lane.type === 'fast' ? 4 : 7;
            ctx!.beginPath(); ctx!.roundRect(sig.x - sig.w / 2, y - sh / 2, sig.w, sh, 2); ctx!.fill();
            ctx!.shadowBlur = 0; ctx!.globalAlpha = 1;
            if (lane.type === 'inhibitor') {
              const dir = (lane.speed || 0) > 0 ? '›' : '‹';
              ctx!.fillStyle = color; ctx!.globalAlpha = 0.7;
              ctx!.font = '9px monospace'; ctx!.textAlign = 'center';
              ctx!.fillText(dir, sig.x, y + 3); ctx!.textAlign = 'left'; ctx!.globalAlpha = 1;
            }
          }
        }
        if (lane.type === 'bridge') {
          for (const pad of lane.pads || []) {
            const px = pad.col * CELL + CELL / 2;
            const alpha = pad.alive ? Math.min(1, pad.fadeTimer / 1.0) : 0;
            if (alpha <= 0) continue;
            ctx!.fillStyle = T.cyan; ctx!.globalAlpha = alpha * 0.6;
            ctx!.shadowBlur = 4; ctx!.shadowColor = T.cyan;
            ctx!.beginPath(); ctx!.arc(px, y, CELL / 2 - 4, 0, Math.PI * 2); ctx!.fill(); ctx!.shadowBlur = 0;
            ctx!.strokeStyle = T.cyan; ctx!.lineWidth = 1; ctx!.globalAlpha = alpha * 0.8;
            ctx!.beginPath(); ctx!.arc(px, y, CELL / 2 - 4, 0, Math.PI * 2); ctx!.stroke();
            ctx!.globalAlpha = 1;
          }
        }
      }
    }

    function drawIons(game: GameState) {
      for (const ion of game.ions) {
        if (!ion.alive) continue;
        const pos = getWorldPos(game, ion.col, ion.row);
        if (pos.y < -20 || pos.y > game.H + 20) continue;
        ion.pulse += 0.05;
        const pulse = 1 + Math.sin(ion.pulse) * 0.2;
        const r = ION_R * pulse;
        ctx!.fillStyle = T.green; ctx!.globalAlpha = 0.25;
        ctx!.beginPath(); ctx!.arc(pos.x, pos.y, r * 2.5, 0, Math.PI * 2); ctx!.fill(); ctx!.globalAlpha = 1;
        ctx!.fillStyle = T.green; ctx!.shadowBlur = 6; ctx!.shadowColor = T.green;
        ctx!.beginPath(); ctx!.arc(pos.x, pos.y, r, 0, Math.PI * 2); ctx!.fill(); ctx!.shadowBlur = 0;
      }
    }

    function drawTrail(game: GameState) {
      for (const tp of game.trail) {
        const alpha = (1 - tp.age / 0.15) * 0.4;
        const r = PLAYER_R * (1 - tp.age / 0.15) * 0.7;
        ctx!.fillStyle = T.cyan; ctx!.globalAlpha = alpha;
        ctx!.beginPath(); ctx!.arc(tp.x, tp.y, r, 0, Math.PI * 2); ctx!.fill(); ctx!.globalAlpha = 1;
      }
    }

    function drawPlayer(game: GameState) {
      let px: number, py: number;
      if (game.hopAnim) {
        const t = game.hopAnim.timer / game.hopAnim.duration;
        const ease = t * (2 - t);
        const from = getWorldPos(game, game.hopAnim.fromCol, game.hopAnim.fromRow);
        const to = getWorldPos(game, game.hopAnim.toCol, game.hopAnim.toRow);
        px = from.x + (to.x - from.x) * ease;
        py = from.y + (to.y - from.y) * ease - Math.sin(t * Math.PI) * 8;
      } else {
        const pos = getWorldPos(game, game.player.col, game.player.row);
        px = pos.x; py = pos.y;
      }
      const glowI = game.charge / MAX_CHARGE;
      if (glowI > 0.5) {
        ctx!.fillStyle = T.cyan; ctx!.globalAlpha = (glowI - 0.5) * 0.15;
        ctx!.beginPath(); ctx!.arc(px, py, PLAYER_R * 4, 0, Math.PI * 2); ctx!.fill(); ctx!.globalAlpha = 1;
      }
      if (game.player.bursting) {
        ctx!.fillStyle = T.gold; ctx!.globalAlpha = 0.3;
        ctx!.beginPath(); ctx!.arc(px, py, PLAYER_R * 3, 0, Math.PI * 2); ctx!.fill(); ctx!.globalAlpha = 1;
      }
      ctx!.fillStyle = T.cyan; ctx!.shadowBlur = 8 + glowI * 8; ctx!.shadowColor = T.cyan;
      ctx!.beginPath(); ctx!.arc(px, py, PLAYER_R, 0, Math.PI * 2); ctx!.fill();
      ctx!.fillStyle = T.white;
      ctx!.beginPath(); ctx!.arc(px, py, PLAYER_R * 0.4, 0, Math.PI * 2); ctx!.fill();
      ctx!.shadowBlur = 0;
    }

    function drawParticles(game: GameState) {
      for (const p of game.particles) {
        ctx!.fillStyle = p.color; ctx!.globalAlpha = p.life;
        ctx!.beginPath(); ctx!.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx!.fill(); ctx!.globalAlpha = 1;
      }
    }

    function drawChargeHUD(game: GameState) {
      ctx!.textAlign = 'right';
      for (let i = 0; i < MAX_CHARGE; i++) {
        const cx = game.W - 16 - (MAX_CHARGE - 1 - i) * 14;
        const cy = 28 + game.safeTop;
        ctx!.fillStyle = i < game.charge ? T.green : T.border;
        ctx!.shadowBlur = i < game.charge ? 4 : 0; ctx!.shadowColor = T.green;
        ctx!.beginPath(); ctx!.arc(cx, cy, 4, 0, Math.PI * 2); ctx!.fill(); ctx!.shadowBlur = 0;
      }
      if (game.charge >= MAX_CHARGE) {
        ctx!.fillStyle = T.green; ctx!.font = '10px monospace';
        ctx!.globalAlpha = 0.5 + Math.sin(game.gameTime * 4) * 0.3;
        ctx!.fillText('LONG PRESS TO BURST', game.W - 16, 44 + game.safeTop);
        ctx!.globalAlpha = 1;
      }
      ctx!.textAlign = 'left';
    }

    function updateTrail(game: GameState, dt: number) {
      if (!game.hopAnim) {
        const pos = getWorldPos(game, game.player.col, game.player.row);
        game.trail.push({ x: pos.x, y: pos.y, age: 0 });
      } else {
        const t = game.hopAnim.timer / game.hopAnim.duration;
        const ease = t * (2 - t);
        const from = getWorldPos(game, game.hopAnim.fromCol, game.hopAnim.fromRow);
        const to = getWorldPos(game, game.hopAnim.toCol, game.hopAnim.toRow);
        game.trail.push({
          x: from.x + (to.x - from.x) * ease,
          y: from.y + (to.y - from.y) * ease - Math.sin(t * Math.PI) * 8,
          age: 0,
        });
      }
      for (const tp of game.trail) tp.age += dt;
      game.trail = game.trail.filter(tp => tp.age < 0.15);
      if (game.trail.length > 5) game.trail = game.trail.slice(-5);
    }

    function updateSignals(game: GameState, dt: number) {
      for (const [, lane] of game.lanes) {
        if (lane.type === 'slow' || lane.type === 'fast' || lane.type === 'inhibitor') {
          for (const sig of lane.signals || []) {
            sig.x += (lane.speed || 0) * dt;
            if ((lane.speed || 0) > 0 && sig.x > game.W + 50) sig.x = -50;
            if ((lane.speed || 0) < 0 && sig.x < -50) sig.x = game.W + 50;
          }
        }
        if (lane.type === 'bridge') {
          for (const pad of lane.pads || []) {
            if (pad.alive) { pad.fadeTimer -= dt; if (pad.fadeTimer <= 0) pad.alive = false; }
          }
        }
      }
    }

    function updateParticles(game: GameState, dt: number) {
      for (let i = game.particles.length - 1; i >= 0; i--) {
        const p = game.particles[i];
        p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 2.5;
        if (p.life <= 0) game.particles.splice(i, 1);
      }
    }

    // --- Tutorial ---
    function updateTutorial(dt: number) {
      const game = g.current;
      game.gameTime += dt;
      if (game.freezeTimer > 0) { game.freezeTimer -= dt; return; }
      if (game.flashTimer > 0) game.flashTimer -= dt;
      updateTrail(game, dt);

      if (game.hopAnim) {
        game.hopAnim.timer += dt;
        if (game.hopAnim.timer >= game.hopAnim.duration) {
          game.player.col = game.hopAnim.toCol;
          game.player.row = game.hopAnim.toRow;
          game.hopAnim = null;
          game.tutHops++;
          if (game.player.row > game.score) game.score = game.player.row;
          // Collision check (tutorial = respawn)
          const lane = game.lanes.get(game.player.row);
          if (lane && (lane.type === 'slow' || lane.type === 'fast' || lane.type === 'inhibitor')) {
            const px = game.player.col * CELL + CELL / 2;
            for (const sig of lane.signals || []) {
              if (px > sig.x - sig.w / 2 - PLAYER_R && px < sig.x + sig.w / 2 + PLAYER_R) {
                if (game.player.bursting) {
                  spawnParticles(game, px, getWorldPos(game, game.player.col, game.player.row).y, T.gold, 10);
                  sig.x = -9999;
                  if (game.tutStep === 3) game.tutBursted = true;
                } else {
                  game.flashColor = T.danger; game.flashTimer = 0.1;
                  game.player.row = Math.max(0, game.player.row - 1);
                }
                break;
              }
            }
          }
          // Collect ions
          for (const ion of game.ions) {
            if (!ion.alive) continue;
            if (Math.abs(ion.col - game.player.col) < 1 && Math.abs(ion.row - game.player.row) < 1) {
              ion.alive = false;
              game.charge = Math.min(game.charge + 1, MAX_CHARGE);
              game.tutIonsCollected++;
              playCollect();
              const pos = getWorldPos(game, ion.col, ion.row);
              spawnParticles(game, pos.x, pos.y, T.green, 6);
            }
          }
        }
      }

      updateSignals(game, dt);
      const targetCam = game.player.row - 3;
      game.cameraRow += (targetCam - game.cameraRow) * 4 * dt;
      const targetDark = 1 - (game.charge / MAX_CHARGE);
      game.screenDarkness += (targetDark * 0.5 - game.screenDarkness) * 3 * dt;
      updateParticles(game, dt);

      if (!game.tutSuccess && TUT_STEPS[game.tutStep].check(game)) {
        game.tutSuccess = true; game.tutSuccessTimer = 1.5;
        playCollect();
      }
      if (game.tutSuccess) {
        game.tutSuccessTimer -= dt;
        if (game.tutSuccessTimer <= 0) {
          game.tutStep++; game.tutSuccess = false; game.tutSuccessTimer = 0;
          if (game.tutStep >= TUT_STEPS.length) {
            stopHum();
            // Start real game
            const cols = Math.floor(game.W / CELL);
            game.player = { col: Math.floor(cols / 2), row: 0 };
            game.lanes = new Map(); game.ions = []; game.particles = []; game.trail = [];
            game.cameraRow = 0; game.score = 0; game.charge = 2; game.deathWallRow = -4;
            game.hopAnim = null; game.freezeTimer = 0; game.flashColor = null; game.flashTimer = 0; game.screenDarkness = 0; game.gameTime = 0;
            for (let r = -2; r < 40; r++) generateRow(game, r);
            game.phase = 'playing';
            startHum(game);
            setGameState('playing');
            return;
          }
          TUT_STEPS[game.tutStep].setup(game);
        }
      }
    }

    function drawTutorial() {
      const game = g.current;
      ctx!.fillStyle = T.bg; ctx!.fillRect(0, 0, game.W, game.H);
      drawNerveBackground(game);
      if (game.screenDarkness > 0.01) {
        ctx!.fillStyle = `rgba(0,0,0,${game.screenDarkness})`;
        ctx!.fillRect(0, 0, game.W, game.H);
      }
      drawLanes(game); drawIons(game); drawTrail(game); drawPlayer(game); drawParticles(game);
      if (game.flashTimer > 0 && game.flashColor) {
        ctx!.fillStyle = game.flashColor; ctx!.globalAlpha = game.flashTimer / 0.15;
        ctx!.fillRect(0, 0, game.W, game.H); ctx!.globalAlpha = 1;
      }
      // HUD
      ctx!.textAlign = 'center';
      ctx!.fillStyle = T.muted; ctx!.font = '12px monospace';
      ctx!.fillText('TUTORIAL ' + (game.tutStep + 1) + ' / ' + TUT_STEPS.length, game.W / 2, 24 + game.safeTop);
      ctx!.fillStyle = T.white; ctx!.font = 'bold 20px monospace';
      ctx!.fillText(TUT_STEPS[game.tutStep].name, game.W / 2, 48 + game.safeTop);
      if (!game.tutSuccess) {
        ctx!.fillStyle = T.muted; ctx!.font = '14px monospace';
        ctx!.fillText(TUT_STEPS[game.tutStep].instruction, game.W / 2, game.H - 40);
      }
      drawChargeHUD(game);
      if (game.tutStep === 4) {
        ctx!.textAlign = 'left'; ctx!.fillStyle = T.white; ctx!.font = 'bold 22px monospace';
        ctx!.fillText(game.score + ' / 10', 16, 32 + game.safeTop);
      }
      if (game.tutSuccess) {
        ctx!.globalAlpha = Math.min(1, game.tutSuccessTimer);
        ctx!.textAlign = 'center'; ctx!.fillStyle = T.cyan; ctx!.font = 'bold 28px monospace';
        ctx!.shadowBlur = 15; ctx!.shadowColor = T.cyan;
        ctx!.fillText(game.tutStep === TUT_STEPS.length - 1 ? 'GO!' : 'NICE!', game.W / 2, game.H / 2);
        ctx!.shadowBlur = 0; ctx!.globalAlpha = 1;
      }
      ctx!.textAlign = 'right'; ctx!.fillStyle = T.muted; ctx!.font = '12px monospace';
      ctx!.fillText('SKIP ›', game.W - 16, 24 + game.safeTop);
      ctx!.textAlign = 'left';
    }

    // --- Main update ---
    function update(dt: number) {
      const game = g.current;
      if (game.phase === 'start' || game.phase === 'over') return;
      if (game.phase === 'tutorial') { updateTutorial(dt); return; }
      if (game.phase === 'dead') return; // death handled by timeout

      if (game.freezeTimer > 0) { game.freezeTimer -= dt; return; }
      game.gameTime += dt;
      if (game.flashTimer > 0) game.flashTimer -= dt;
      updateTrail(game, dt);

      if (game.hopAnim) {
        game.hopAnim.timer += dt;
        const t = Math.min(game.hopAnim.timer / game.hopAnim.duration, 1);
        if (t > 0.3) {
          if (checkCollisionAt(game, game.hopAnim.toCol, game.hopAnim.toRow)) return;
        }
        if (game.hopAnim.timer >= game.hopAnim.duration) {
          game.player.col = game.hopAnim.toCol;
          game.player.row = game.hopAnim.toRow;
          game.hopAnim = null;
          if (game.player.row > game.score) game.score = game.player.row;
          collectIons(game);
        }
      }

      updateSignals(game, dt);
      const targetCam = game.player.row - 3;
      game.cameraRow += (targetCam - game.cameraRow) * 4 * dt;
      game.deathWallRow += DEATH_PUSH_SPEED * dt;
      if (game.player.row <= game.deathWallRow) { die(game); return; }

      // Generate ahead
      for (let r = Math.floor(game.cameraRow) - 2; r < Math.floor(game.cameraRow) + 30; r++) {
        generateRow(game, r);
      }
      // Cleanup
      for (const [row] of game.lanes) {
        if (row < game.cameraRow - 10) game.lanes.delete(row);
      }
      game.ions = game.ions.filter(ion => ion.row > game.cameraRow - 10);

      const targetDark = 1 - (game.charge / MAX_CHARGE);
      game.screenDarkness += (targetDark * 0.5 - game.screenDarkness) * 3 * dt;
      updateParticles(game, dt);
    }

    function draw() {
      const game = g.current;
      if (game.phase === 'start' || game.phase === 'over') return;
      if (game.phase === 'tutorial') { drawTutorial(); return; }

      ctx!.fillStyle = T.bg; ctx!.fillRect(0, 0, game.W, game.H);
      drawNerveBackground(game);
      if (game.screenDarkness > 0.01) {
        ctx!.fillStyle = `rgba(0,0,0,${game.screenDarkness})`;
        ctx!.fillRect(0, 0, game.W, game.H);
      }
      drawLanes(game); drawIons(game); drawTrail(game);
      if (game.phase !== 'dead') drawPlayer(game);
      drawParticles(game);

      // Death wall
      const wallY = getWorldPos(game, 0, game.deathWallRow).y;
      if (wallY < game.H + 10) {
        const grad = ctx!.createLinearGradient(0, wallY, 0, wallY + CELL * 3);
        grad.addColorStop(0, 'rgba(239,68,68,0.4)'); grad.addColorStop(1, 'rgba(239,68,68,0)');
        ctx!.fillStyle = grad; ctx!.fillRect(0, wallY, game.W, CELL * 3);
        ctx!.fillStyle = T.danger; ctx!.globalAlpha = 0.6 + Math.sin(game.gameTime * 4) * 0.2;
        ctx!.fillRect(0, wallY, game.W, 2); ctx!.globalAlpha = 1;
      }

      // Flash
      if (game.flashTimer > 0 && game.flashColor) {
        ctx!.fillStyle = game.flashColor; ctx!.globalAlpha = game.flashTimer / 0.15;
        ctx!.fillRect(0, 0, game.W, game.H); ctx!.globalAlpha = 1;
      }

      // Charge vignette
      if (game.charge >= 4) {
        const hazeAlpha = game.charge >= MAX_CHARGE ? 0.12 : 0.06;
        const edgeW = game.W * 0.3;
        const gl = ctx!.createLinearGradient(0, 0, edgeW, 0);
        gl.addColorStop(0, `rgba(34,211,238,${hazeAlpha})`); gl.addColorStop(1, 'rgba(34,211,238,0)');
        ctx!.fillStyle = gl; ctx!.fillRect(0, 0, edgeW, game.H);
        const gr = ctx!.createLinearGradient(game.W, 0, game.W - edgeW, 0);
        gr.addColorStop(0, `rgba(34,211,238,${hazeAlpha})`); gr.addColorStop(1, 'rgba(34,211,238,0)');
        ctx!.fillStyle = gr; ctx!.fillRect(game.W - edgeW, 0, edgeW, game.H);
        const gt = ctx!.createLinearGradient(0, 0, 0, edgeW);
        gt.addColorStop(0, `rgba(34,211,238,${hazeAlpha * 0.7})`); gt.addColorStop(1, 'rgba(34,211,238,0)');
        ctx!.fillStyle = gt; ctx!.fillRect(0, 0, game.W, edgeW);
        const gb = ctx!.createLinearGradient(0, game.H, 0, game.H - edgeW);
        gb.addColorStop(0, `rgba(34,211,238,${hazeAlpha * 0.7})`); gb.addColorStop(1, 'rgba(34,211,238,0)');
        ctx!.fillStyle = gb; ctx!.fillRect(0, game.H - edgeW, game.W, edgeW);
      }

      // HUD
      ctx!.fillStyle = T.white; ctx!.font = 'bold 24px monospace'; ctx!.textAlign = 'left';
      ctx!.fillText(game.score + '', 16, 32 + game.safeTop);
      drawChargeHUD(game);
      ctx!.textAlign = 'left';
    }

    // Init tutorial on mount if phase is tutorial
    if (g.current.phase === 'tutorial') {
      startHum(g.current);
      TUT_STEPS[0].setup(g.current);
    }

    // --- Input ---
    const handleTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      const game = g.current;
      initAudio();
      if (game.phase === 'tutorial') {
        const ex = e.touches[0].clientX;
        const ey = e.touches[0].clientY;
        if (ex >= game.W - 80 && ey <= 50 + game.safeTop) {
          // Skip tutorial
          stopHum();
          const cols = Math.floor(game.W / CELL);
          game.player = { col: Math.floor(cols / 2), row: 0 };
          game.lanes = new Map(); game.ions = []; game.particles = []; game.trail = [];
          game.cameraRow = 0; game.score = 0; game.charge = 2; game.deathWallRow = -4;
          game.hopAnim = null; game.freezeTimer = 0; game.flashColor = null; game.flashTimer = 0; game.screenDarkness = 0; game.gameTime = 0;
          for (let r = -2; r < 40; r++) generateRow(game, r);
          game.phase = 'playing'; startHum(game);
          setGameState('playing');
          return;
        }
      }
      game.touchStartX = e.touches[0].clientX;
      game.touchStartY = e.touches[0].clientY;
      game.touchStartTime = performance.now();
    };

    const handleTouchEnd = (e: TouchEvent) => {
      const game = g.current;
      if ((game.phase !== 'playing' && game.phase !== 'tutorial') || game.hopAnim) return;
      const ex = e.changedTouches[0].clientX;
      const ey = e.changedTouches[0].clientY;
      const dx = ex - game.touchStartX;
      const dy = ey - game.touchStartY;
      const dt = performance.now() - game.touchStartTime;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dt > 400 && dist < 15 && game.charge >= MAX_CHARGE) { activateBurst(game); return; }
      if (dist < 15 || dt < 50) { tryHop(game, 0, 1); }
      else if (Math.abs(dx) > Math.abs(dy)) { tryHop(game, dx > 0 ? 1 : -1, 0); }
      else if (dy < 0) { tryHop(game, 0, 1); }
      else { tryHop(game, 0, -1); }
    };

    const handleMouseDown = (e: MouseEvent) => {
      const game = g.current;
      initAudio();
      if (game.phase === 'tutorial') {
        if (e.clientX >= game.W - 80 && e.clientY <= 50 + game.safeTop) {
          stopHum();
          const cols = Math.floor(game.W / CELL);
          game.player = { col: Math.floor(cols / 2), row: 0 };
          game.lanes = new Map(); game.ions = []; game.particles = []; game.trail = [];
          game.cameraRow = 0; game.score = 0; game.charge = 2; game.deathWallRow = -4;
          game.hopAnim = null; game.freezeTimer = 0; game.flashColor = null; game.flashTimer = 0; game.screenDarkness = 0; game.gameTime = 0;
          for (let r = -2; r < 40; r++) generateRow(game, r);
          game.phase = 'playing'; startHum(game);
          setGameState('playing');
          return;
        }
      }
      game.touchStartX = e.clientX;
      game.touchStartY = e.clientY;
      game.touchStartTime = performance.now();
    };

    const handleMouseUp = (e: MouseEvent) => {
      const game = g.current;
      if ((game.phase !== 'playing' && game.phase !== 'tutorial') || game.hopAnim) return;
      const dx = e.clientX - game.touchStartX;
      const dy = e.clientY - game.touchStartY;
      const dt = performance.now() - game.touchStartTime;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dt > 400 && dist < 15 && game.charge >= MAX_CHARGE) { activateBurst(game); return; }
      if (dist < 15 || dt < 50) { tryHop(game, 0, 1); }
      else if (Math.abs(dx) > Math.abs(dy)) { tryHop(game, dx > 0 ? 1 : -1, 0); }
      else if (dy < 0) { tryHop(game, 0, 1); }
      else { tryHop(game, 0, -1); }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const game = g.current;
      if ((game.phase !== 'playing' && game.phase !== 'tutorial') || game.hopAnim) return;
      if (e.key === 'ArrowUp' || e.key === 'w') tryHop(game, 0, 1);
      else if (e.key === 'ArrowDown' || e.key === 's') tryHop(game, 0, -1);
      else if (e.key === 'ArrowLeft' || e.key === 'a') tryHop(game, -1, 0);
      else if (e.key === 'ArrowRight' || e.key === 'd') tryHop(game, 1, 0);
      else if (e.key === ' ' && game.charge >= MAX_CHARGE) activateBurst(game);
    };

    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd, { passive: false });
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('keydown', handleKeyDown);

    let lastTime = performance.now(); let animId: number;
    function loop(ts: number) {
      const dt = Math.min((ts - lastTime) / 1000, 0.05); lastTime = ts;
      if (g.current.running) { update(dt); draw(); }
      animId = requestAnimationFrame(loop);
    }
    animId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animId); window.removeEventListener('resize', resize);
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchend', handleTouchEnd);
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('keydown', handleKeyDown);
      stopHum();
      const game = g.current;
      if (game.deathPulseInterval) clearInterval(game.deathPulseInterval);
      if (game.deathTimeout) clearTimeout(game.deathTimeout);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initAudio, playHop, playCollect, playBurst, playDeath]);

  return (
    <>
      <Script src="/pixelpit/social.js" strategy="lazyOnload" onLoad={() => setSocialLoaded(true)} />
      <canvas ref={canvasRef} style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', display: 'block', background: T.bg, touchAction: 'none' }} />

      {gameState === 'start' && (
        <div style={{ position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: COLORS.bg, zIndex: 100, textAlign: 'center', padding: 40 }}>
          <div style={{ background: COLORS.surface, border: `1px solid ${T.border}`, padding: '50px 60px', borderRadius: 16 }}>
            <div style={{ width: 20, height: 20, borderRadius: '50%', background: T.cyan, margin: '0 auto 12px', border: `2px solid ${T.white}` }} />
            <h1 style={{ fontFamily: 'ui-monospace, monospace', fontSize: 56, fontWeight: 700, color: T.white, marginBottom: 16, letterSpacing: 6 }}>DASH</h1>
            <p style={{ fontSize: 14, fontFamily: 'ui-monospace, monospace', color: T.muted, marginBottom: 30, lineHeight: 1.8, letterSpacing: 1 }}>
              tap to hop · swipe to dodge<br />collect ions · burst through signals
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
              <button onClick={startGame} style={{ background: T.cyan, color: T.bg, border: 'none', padding: '16px 50px', fontSize: 16, fontFamily: 'ui-monospace, monospace', fontWeight: 600, cursor: 'pointer', borderRadius: 8, letterSpacing: 2 }}>play</button>
              <button onClick={startTutorial} style={{ background: 'transparent', color: T.muted, border: `1px solid ${T.border}`, padding: '12px 35px', fontSize: 12, fontFamily: 'ui-monospace, monospace', cursor: 'pointer', borderRadius: 6, letterSpacing: 2 }}>tutorial</button>
            </div>
          </div>
          <div style={{ marginTop: 24, fontSize: 12, fontFamily: 'ui-monospace, monospace', letterSpacing: 3 }}>
            <span style={{ color: T.green }}>pixel</span><span style={{ color: T.cyan }}>pit</span><span style={{ color: T.muted }}> arcade</span>
          </div>
        </div>
      )}

      {gameState === 'gameover' && (
        <div style={{ position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(9,9,11,0.85)', zIndex: 100, textAlign: 'center', padding: 40 }}>
          <h1 style={{ fontFamily: 'ui-monospace, monospace', fontSize: 14, fontWeight: 300, color: T.muted, marginBottom: 12, letterSpacing: 4 }}>SIGNAL LOST</h1>
          <div style={{ fontFamily: 'ui-monospace, monospace', fontSize: 72, fontWeight: 700, color: T.white, marginBottom: 8 }}>{score}</div>
          <div style={{ fontFamily: 'ui-monospace, monospace', fontSize: 13, color: T.muted, marginBottom: 25 }}>distance reached</div>
          <ScoreFlow score={score} gameId={GAME_ID} colors={SCORE_FLOW_COLORS} maxScore={200} onRankReceived={(rank, entryId) => setSubmittedEntryId(entryId ?? null)} onProgression={(prog) => setProgression(prog)} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
            <button onClick={startGame} style={{ background: T.cyan, color: T.bg, border: 'none', borderRadius: 8, padding: '16px 50px', fontSize: 15, fontFamily: 'ui-monospace, monospace', fontWeight: 600, cursor: 'pointer', letterSpacing: 2 }}>play again</button>
            <button onClick={() => setGameState('leaderboard')} style={{ background: 'transparent', border: `1px solid ${T.border}`, borderRadius: 6, color: T.muted, padding: '14px 35px', fontSize: 11, fontFamily: 'ui-monospace, monospace', cursor: 'pointer', letterSpacing: 2 }}>leaderboard</button>
            {user ? (
              <button onClick={() => setShowShareModal(true)} style={{ background: 'transparent', border: `1px solid ${T.border}`, borderRadius: 6, color: T.muted, padding: '14px 35px', fontSize: 11, fontFamily: 'ui-monospace, monospace', cursor: 'pointer', letterSpacing: 2 }}>share / groups</button>
            ) : (
              <ShareButtonContainer id="share-btn-container" url={typeof window !== 'undefined' ? `${window.location.origin}/pixelpit/arcade/dash/share/${score}` : ''} text={`I reached ${score} on DASH! Can you beat me?`} style="minimal" socialLoaded={socialLoaded} />
            )}
          </div>
        </div>
      )}

      {gameState === 'leaderboard' && <Leaderboard gameId={GAME_ID} limit={8} entryId={submittedEntryId ?? undefined} colors={LEADERBOARD_COLORS} onClose={() => setGameState('gameover')} groupsEnabled={true} gameUrl={GAME_URL} socialLoaded={socialLoaded} />}
      {showShareModal && user && <ShareModal gameUrl={GAME_URL} score={score} colors={LEADERBOARD_COLORS} onClose={() => setShowShareModal(false)} />}
    </>
  );
}

// --- Standalone helper (used by both useEffect and callbacks) ---
function generateRow(game: { lanes: Map<number, Lane>; ions: Ion[]; W: number }, row: number) {
  if (game.lanes.has(row)) return;
  const d = Math.min(row / 50, 1);
  const W = game.W;
  const cols = Math.floor(W / CELL);

  // Inline lane generation
  let lane: Lane;
  if (row <= 2) { lane = { type: 'rest' }; }
  else if (row <= 10) {
    if (Math.random() < 0.4) lane = { type: 'rest' };
    else lane = makeSignalLaneStatic('slow', d, W);
  } else if (row <= 25) {
    const r = Math.random();
    if (r < 0.15) lane = { type: 'rest' };
    else if (r < 0.25) lane = makeBridgeLaneStatic(d, W);
    else if (r < 0.4) lane = makeSignalLaneStatic('fast', d, W);
    else if (r < 0.55 && row > 15) lane = makeSignalLaneStatic('inhibitor', d, W);
    else lane = makeSignalLaneStatic('slow', d, W);
  } else {
    const r = Math.random();
    if (r < 0.08) lane = { type: 'rest' };
    else if (r < 0.2) lane = makeBridgeLaneStatic(d, W);
    else if (r < 0.4) lane = makeSignalLaneStatic('fast', d, W);
    else if (r < 0.6) lane = makeSignalLaneStatic('inhibitor', d, W);
    else lane = makeSignalLaneStatic('slow', d, W);
  }
  game.lanes.set(row, lane);

  if (row > 2 && Math.random() < 0.35) {
    const col = 1 + Math.floor(Math.random() * (cols - 2));
    game.ions.push({ col, row: row - 0.5, alive: true, pulse: Math.random() * Math.PI * 2 });
  }
}

function makeSignalLaneStatic(type: 'slow' | 'fast' | 'inhibitor', d: number, W: number): Lane {
  const baseSpeed = type === 'slow' ? 80 : type === 'fast' ? 180 : 120;
  const speed = baseSpeed + d * 80;
  const dir = type === 'inhibitor' ? -1 : (Math.random() < 0.5 ? 1 : -1);
  const gap = type === 'slow' ? (180 - d * 40) : (140 - d * 30);
  const signals: Signal[] = [];
  const count = Math.ceil((W + 400) / gap);
  for (let i = 0; i < count; i++) {
    signals.push({
      x: i * gap + Math.random() * gap * 0.3,
      w: type === 'slow' ? 30 + Math.random() * 15 : type === 'fast' ? 10 + Math.random() * 8 : 20 + Math.random() * 10,
    });
  }
  return { type, speed: speed * dir, signals, flickerPhase: Math.random() * Math.PI * 2 };
}

function makeBridgeLaneStatic(d: number, W: number): Lane {
  const padCount = 3 + Math.floor(Math.random() * 3);
  const pads = [];
  const spacing = W / (padCount + 1);
  const cols = Math.floor(W / CELL);
  for (let i = 0; i < padCount; i++) {
    const cx = spacing * (i + 1) + (Math.random() - 0.5) * spacing * 0.3;
    const col = Math.round(cx / CELL);
    pads.push({ col: Math.max(1, Math.min(cols - 2, col)), fadeTimer: 2.5 + Math.random() * 1.5 - d * 0.8, alive: true });
  }
  return { type: 'bridge', pads };
}
