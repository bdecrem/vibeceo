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
  copper: '#d97706',
  copperHi: '#fbbf24',
  bolt: '#60a5fa',
  boltEdge: '#ffffff',
  target: '#22c55e',
  targetGlow: '#4ade80',
  insulator: '#22d3ee',
  white: '#ffffff',
  gold: '#facc15',
  red: '#ef4444',
  muted: '#71717a',
  text: '#ffffff',
};

const COLORS = {
  bg: '#09090b', surface: '#18181b', primary: '#d97706', secondary: '#60a5fa',
  text: '#ffffff', muted: '#71717a', error: '#ef4444',
};

const SCORE_FLOW_COLORS: ScoreFlowColors = { ...COLORS };
const LEADERBOARD_COLORS: LeaderboardColors = { ...COLORS };
const GAME_ID = 'spark';

// --- CONSTANTS ---
const STROKE_W_MIN = 4;
const STROKE_W_MAX = 8;
const GRAVITY = 600;
const LIGHTNING_DELAY = 1.5;
const LIGHTNING_SPEED = 800;
const SOURCE_R = 12;
const TARGET_R = 14;
const INSULATOR_BORDER = 2;
const SEGMENT_MIN_LEN = 4;
const CONNECT_DIST = 25;

interface StrokePoint { x: number; y: number; w: number; }
interface Stroke { points: StrokePoint[]; vy: number; settled: boolean; }
interface Particle { x: number; y: number; vx: number; vy: number; life: number; maxLife: number; color: string; size: number; }
interface Rect { x: number; y: number; w: number; h: number; }
interface ArcPoint { x: number; y: number; }

interface GameState {
  W: number; H: number; safeTop: number;
  source: { x: number; y: number };
  targetPos: { x: number; y: number };
  insulators: Rect[];
  platforms: Rect[];
  inkLimit: number;
  parInk: number;
  strokes: Stroke[];
  currentStroke: StrokePoint[] | null;
  inkUsed: number;
  level: number;
  score: number;
  bestScore: number;
  phase: 'start' | 'drawing' | 'dropping' | 'waiting' | 'arcing' | 'cleared' | 'failed' | 'over';
  particles: Particle[];
  screenShake: number;
  flashTimer: number;
  flashColor: string;
  dropTimer: number;
  waitTimer: number;
  arcTimer: number;
  arcPath: ArcPoint[] | null;
  arcProgress: number;
  arcReachedTarget: boolean;
  gameTime: number;
  celebTimer: number;
  drawSpeed: number;
  zapsLeft: number;
  arcFadeTimer: number;
  idleTimer: number;
  running: boolean;
  audioCtx: AudioContext | null;
  chargeNode: OscillatorNode | null;
  chargeGain: GainNode | null;
  arcToneNode: OscillatorNode | null;
  arcToneGain: GainNode | null;
  // Tutorial
  tutActive: boolean;
  tutStep: number;
  tutSuccess: boolean;
  tutSuccessTimer: number;
  tutCleared: boolean;
}

// --- Level generation ---
function generateLevel(lvl: number, W: number, H: number, safeTop: number) {
  const margin = 40;
  const playW = W - margin * 2;
  const playH = H - margin * 2 - safeTop;
  const ox = margin;
  const oy = margin + safeTop;

  const source = { x: W / 2, y: oy + 20 };
  const target = { x: W / 2, y: oy + playH - 20 };
  const insulators: Rect[] = [];
  const platforms: Rect[] = [{ x: ox, y: oy + playH + 10, w: playW, h: 20 }];

  if (lvl >= 2) target.x = ox + playW * (0.3 + Math.random() * 0.4);
  if (lvl >= 3) {
    const numIns = Math.min(Math.floor((lvl - 2) / 2) + 1, 4);
    for (let i = 0; i < numIns; i++) {
      const iw = 40 + Math.random() * 40;
      const ih = 12;
      const ix = ox + playW * (0.15 + Math.random() * 0.6);
      const iy = oy + playH * (0.25 + i * 0.15 + Math.random() * 0.08);
      insulators.push({ x: ix, y: iy, w: iw, h: ih });
    }
  }
  if (lvl >= 4) {
    const numPlat = Math.min(Math.floor((lvl - 3) / 2) + 1, 3);
    for (let i = 0; i < numPlat; i++) {
      const pw = 50 + Math.random() * 40;
      const ph = 8;
      const px = ox + playW * (0.1 + Math.random() * 0.7);
      const py = oy + playH * (0.3 + i * 0.2 + Math.random() * 0.05);
      platforms.push({ x: px, y: py, w: pw, h: ph });
    }
  }
  if (lvl >= 2) source.x = ox + playW * (0.3 + Math.random() * 0.4);

  const inkLimit = Math.max(150, 400 - lvl * 20);
  const parInk = Math.floor(inkLimit * 0.6);

  for (const ins of insulators) {
    if (Math.abs(ins.x + ins.w / 2 - source.x) < 30 && Math.abs(ins.y - source.y) < 30) ins.y += 40;
    if (Math.abs(ins.x + ins.w / 2 - target.x) < 30 && Math.abs(ins.y - target.y) < 30) ins.y -= 40;
  }

  return { source, target, insulators, platforms, inkLimit, parInk };
}

// --- Geometry helpers ---
function lineIntersectsLine(x1: number, y1: number, x2: number, y2: number, x3: number, y3: number, x4: number, y4: number) {
  const d = (x2 - x1) * (y4 - y3) - (y2 - y1) * (x4 - x3);
  if (Math.abs(d) < 0.001) return false;
  const t = ((x3 - x1) * (y4 - y3) - (y3 - y1) * (x4 - x3)) / d;
  const u = ((x3 - x1) * (y2 - y1) - (y3 - y1) * (x2 - x1)) / d;
  return t >= 0 && t <= 1 && u >= 0 && u <= 1;
}

function segmentIntersectsRect(x1: number, y1: number, x2: number, y2: number, rect: Rect) {
  const left = rect.x, right = rect.x + rect.w, top = rect.y, bottom = rect.y + rect.h;
  if (x1 >= left && x1 <= right && y1 >= top && y1 <= bottom) return true;
  if (x2 >= left && x2 <= right && y2 >= top && y2 <= bottom) return true;
  return lineIntersectsLine(x1, y1, x2, y2, left, top, right, top) ||
    lineIntersectsLine(x1, y1, x2, y2, left, bottom, right, bottom) ||
    lineIntersectsLine(x1, y1, x2, y2, left, top, left, bottom) ||
    lineIntersectsLine(x1, y1, x2, y2, right, top, right, bottom);
}

function pointInRect(px: number, py: number, rect: Rect) {
  return px >= rect.x && px <= rect.x + rect.w && py >= rect.y && py <= rect.y + rect.h;
}

function jaggedPath(x1: number, y1: number, x2: number, y2: number, segments: number, amplitude: number) {
  const points: ArcPoint[] = [];
  const dx = x2 - x1, dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  const nx = -dy / len, ny = dx / len;
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const jag = i === 0 || i === segments ? 0 : (Math.random() * 2 - 1) * amplitude;
    points.push({ x: x1 + dx * t + nx * jag, y: y1 + dy * t + ny * jag });
  }
  return points;
}

function spawnParticles(particles: Particle[], x: number, y: number, color: string, count: number, spdMult = 1) {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const spd = (30 + Math.random() * 80) * spdMult;
    particles.push({ x, y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd, life: 0.3 + Math.random() * 0.3, maxLife: 0.3 + Math.random() * 0.3, color, size: 1 + Math.random() * 3 });
  }
}

function computeGhostOffset(stroke: Stroke, platforms: Rect[], insulators: Rect[], H: number) {
  let minDrop = Infinity;
  for (const pt of stroke.points) {
    for (const plat of platforms) {
      if (pt.x >= plat.x && pt.x <= plat.x + plat.w && plat.y > pt.y) minDrop = Math.min(minDrop, plat.y - pt.y);
    }
    for (const ins of insulators) {
      if (pt.x >= ins.x && pt.x <= ins.x + ins.w && ins.y > pt.y) minDrop = Math.min(minDrop, ins.y - pt.y);
    }
  }
  const lowestPt = Math.max(...stroke.points.map(p => p.y));
  if (minDrop === Infinity) return H - 20 - lowestPt;
  return minDrop - (lowestPt - Math.min(...stroke.points.map(p => p.y)));
}

export default function SparkGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<'start' | 'playing' | 'tutorial' | 'gameover' | 'leaderboard'>('start');
  const [score, setScore] = useState(0);
  const [socialLoaded, setSocialLoaded] = useState(false);
  const [submittedEntryId, setSubmittedEntryId] = useState<number | null>(null);
  const [progression, setProgression] = useState<ProgressionResult | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const { user } = usePixelpitSocial(socialLoaded);
  const GAME_URL = typeof window !== 'undefined' ? `${window.location.origin}/pixelpit/arcade/spark` : 'https://pixelpit.gg/pixelpit/arcade/spark';

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
    W: 0, H: 0, safeTop: 0,
    source: { x: 0, y: 0 }, targetPos: { x: 0, y: 0 },
    insulators: [], platforms: [],
    inkLimit: 400, parInk: 240,
    strokes: [], currentStroke: null, inkUsed: 0,
    level: 0, score: 0, bestScore: 0,
    phase: 'start',
    particles: [], screenShake: 0, flashTimer: 0, flashColor: T.white,
    dropTimer: 0, waitTimer: 0, arcTimer: 0,
    arcPath: null, arcProgress: 0, arcReachedTarget: false,
    gameTime: 0, celebTimer: 0, drawSpeed: 0,
    zapsLeft: 3, arcFadeTimer: 0, idleTimer: 0,
    running: true,
    audioCtx: null, chargeNode: null, chargeGain: null, arcToneNode: null, arcToneGain: null,
    tutActive: false, tutStep: 0, tutSuccess: false, tutSuccessTimer: 0, tutCleared: false,
  });

  const initAudio = useCallback(() => {
    const game = g.current;
    if (!game.audioCtx) game.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    if (game.audioCtx.state === 'suspended') game.audioCtx.resume();
  }, []);

  const setupLevel = useCallback((lvl: number) => {
    const game = g.current;
    game.level = lvl;
    const gen = generateLevel(lvl, game.W, game.H, game.safeTop);
    game.source = gen.source; game.targetPos = gen.target;
    game.insulators = gen.insulators; game.platforms = gen.platforms;
    game.inkLimit = gen.inkLimit; game.parInk = gen.parInk;
    game.strokes = []; game.currentStroke = null; game.inkUsed = 0;
    game.particles = []; game.phase = 'drawing';
    game.dropTimer = 0; game.waitTimer = 0; game.arcTimer = 0;
    game.arcPath = null; game.arcProgress = 0; game.arcReachedTarget = false;
    game.celebTimer = 0; game.drawSpeed = 0; game.zapsLeft = 3;
    game.arcFadeTimer = 0; game.idleTimer = 0;
  }, []);

  const retryLevel = useCallback(() => {
    const game = g.current;
    game.strokes = []; game.currentStroke = null; game.inkUsed = 0;
    game.particles = []; game.phase = 'drawing';
    game.dropTimer = 0; game.waitTimer = 0; game.arcTimer = 0;
    game.arcPath = null; game.arcProgress = 0; game.arcReachedTarget = false;
    game.drawSpeed = 0; game.arcFadeTimer = 0; game.idleTimer = 0;
  }, []);

  const startGame = useCallback(() => {
    initAudio();
    const game = g.current;
    game.level = 0; game.score = 0;
    game.bestScore = parseInt(localStorage.getItem('spark_best') || '0');
    game.phase = 'start'; game.strokes = []; game.currentStroke = null;
    game.particles = []; game.screenShake = 0; game.flashTimer = 0;
    game.gameTime = 0; game.tutActive = false;
    game.running = true;
    setupLevel(1);
    setGameState('playing'); setShowShareModal(false); setProgression(null);
  }, [initAudio, setupLevel]);

  const startTutorial = useCallback(() => {
    initAudio();
    const game = g.current;
    game.tutActive = true; game.tutStep = 0;
    game.tutSuccess = false; game.tutSuccessTimer = 0;
    game.level = 0; game.score = 0; game.gameTime = 0;
    game.screenShake = 0; game.flashTimer = 0; game.arcFadeTimer = 0;
    game.dropTimer = 0; game.waitTimer = 0; game.arcTimer = 0;
    game.arcPath = null; game.arcProgress = 0; game.arcReachedTarget = false;
    game.celebTimer = 0; game.running = true;
    // Setup first tutorial step inline
    setupTutStep(game, 0);
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

    // --- Audio helpers ---
    function playDrawHum(speed: number) {
      const ac = g.current.audioCtx; if (!ac) return;
      const freq = 80 + Math.min(speed * 0.3, 200);
      const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.value = freq;
      const gn = ac.createGain(); gn.gain.setValueAtTime(0.03, ac.currentTime);
      gn.gain.linearRampToValueAtTime(0, ac.currentTime + 0.05);
      o.connect(gn).connect(ac.destination); o.start(); o.stop(ac.currentTime + 0.05);
    }

    function playClang(mass: number) {
      const ac = g.current.audioCtx; if (!ac) return;
      const freq = 200 - Math.min(mass * 0.5, 120);
      const o = ac.createOscillator(); o.type = 'triangle'; o.frequency.value = freq;
      const gn = ac.createGain(); gn.gain.setValueAtTime(0.15, ac.currentTime);
      gn.gain.linearRampToValueAtTime(0.03, ac.currentTime + 0.12);
      gn.gain.linearRampToValueAtTime(0, ac.currentTime + 0.25);
      o.connect(gn).connect(ac.destination); o.start(); o.stop(ac.currentTime + 0.25);
      const buf = ac.createBuffer(1, ac.sampleRate * 0.04, ac.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
      const src = ac.createBufferSource(); src.buffer = buf;
      const ng = ac.createGain(); ng.gain.value = 0.1;
      src.connect(ng).connect(ac.destination); src.start();
    }

    function playCrack() {
      const ac = g.current.audioCtx; if (!ac) return;
      const buf = ac.createBuffer(1, ac.sampleRate * 0.03, ac.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length) * 0.8;
      const src = ac.createBufferSource(); src.buffer = buf;
      const gn = ac.createGain(); gn.gain.value = 0.2;
      src.connect(gn).connect(ac.destination); src.start();
    }

    function playZap() {
      const ac = g.current.audioCtx; if (!ac) return;
      const o = ac.createOscillator(); o.type = 'sawtooth';
      o.frequency.setValueAtTime(100, ac.currentTime);
      o.frequency.linearRampToValueAtTime(800, ac.currentTime + 0.15);
      const gn = ac.createGain(); gn.gain.setValueAtTime(0.12, ac.currentTime);
      gn.gain.linearRampToValueAtTime(0.2, ac.currentTime + 0.1);
      gn.gain.linearRampToValueAtTime(0, ac.currentTime + 0.2);
      o.connect(gn).connect(ac.destination); o.start(); o.stop(ac.currentTime + 0.2);
    }

    function playSuccess() {
      const ac = g.current.audioCtx; if (!ac) return;
      [523, 659, 784, 1047].forEach((freq, i) => {
        const t = ac.currentTime + i * 0.08;
        const o = ac.createOscillator(); o.type = 'sine'; o.frequency.value = freq;
        const gn = ac.createGain(); gn.gain.setValueAtTime(0.1, t);
        gn.gain.linearRampToValueAtTime(0, t + 0.3);
        o.connect(gn).connect(ac.destination); o.start(t); o.stop(t + 0.3);
      });
    }

    function playFizzle() {
      const ac = g.current.audioCtx; if (!ac) return;
      const buf = ac.createBuffer(1, ac.sampleRate * 0.3, ac.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length) * 0.3;
      const src = ac.createBufferSource(); src.buffer = buf;
      const gn = ac.createGain(); gn.gain.value = 0.1;
      src.connect(gn).connect(ac.destination); src.start();
    }

    function startChargingHum() {
      const ac = g.current.audioCtx; if (!ac) return;
      const game = g.current;
      game.chargeNode = ac.createOscillator(); game.chargeNode.type = 'sine';
      game.chargeNode.frequency.setValueAtTime(60, ac.currentTime);
      game.chargeNode.frequency.linearRampToValueAtTime(200, ac.currentTime + LIGHTNING_DELAY);
      game.chargeGain = ac.createGain();
      game.chargeGain.gain.setValueAtTime(0.03, ac.currentTime);
      game.chargeGain.gain.linearRampToValueAtTime(0.08, ac.currentTime + LIGHTNING_DELAY);
      game.chargeNode.connect(game.chargeGain).connect(ac.destination);
      game.chargeNode.start(); game.chargeNode.stop(ac.currentTime + LIGHTNING_DELAY + 0.1);
    }

    function startArcTone(duration: number) {
      const ac = g.current.audioCtx; if (!ac) return;
      const game = g.current;
      game.arcToneNode = ac.createOscillator(); game.arcToneNode.type = 'sawtooth';
      game.arcToneNode.frequency.setValueAtTime(200, ac.currentTime);
      game.arcToneNode.frequency.linearRampToValueAtTime(800, ac.currentTime + duration);
      game.arcToneGain = ac.createGain();
      game.arcToneGain.gain.setValueAtTime(0.04, ac.currentTime);
      game.arcToneGain.gain.linearRampToValueAtTime(0.1, ac.currentTime + duration);
      game.arcToneNode.connect(game.arcToneGain).connect(ac.destination);
      game.arcToneNode.start(); game.arcToneNode.stop(ac.currentTime + duration + 0.1);
    }

    // --- Tutorial steps ---
    const TUT_STEPS = [
      { name: 'DRAW', instruction: 'DRAW A COPPER PATH', check: (gm: GameState) => gm.tutCleared },
      { name: 'DROP & ZAP', instruction: 'DRAW, THEN TAP ZAP', check: (gm: GameState) => gm.tutCleared },
      { name: 'ROUTE AROUND', instruction: 'AVOID THE INSULATOR', check: (gm: GameState) => gm.tutCleared },
      { name: 'INK MATTERS', instruction: 'USE LESS INK FOR STARS', check: (gm: GameState) => gm.tutCleared },
      { name: 'PLAN THE DROP', instruction: 'LAND ON THE PLATFORM', check: (gm: GameState) => gm.tutCleared },
    ];

    function tutRetry() { setupTutStep(g.current, g.current.tutStep); }

    function advanceTutorial() {
      const game = g.current;
      game.tutStep++; game.tutSuccess = false; game.tutSuccessTimer = 0;
      if (game.tutStep >= TUT_STEPS.length) {
        game.tutActive = false;
        game.level = 0; game.score = 0; game.bestScore = parseInt(localStorage.getItem('spark_best') || '0');
        game.phase = 'start'; game.strokes = []; game.currentStroke = null;
        game.particles = []; game.screenShake = 0; game.flashTimer = 0; game.gameTime = 0;
        setupLevel(1);
        setGameState('playing');
        return;
      }
      setupTutStep(game, game.tutStep);
    }

    function skipTutorial() {
      const game = g.current;
      game.tutActive = false;
      game.level = 0; game.score = 0; game.bestScore = parseInt(localStorage.getItem('spark_best') || '0');
      game.phase = 'start'; game.strokes = []; game.currentStroke = null;
      game.particles = []; game.screenShake = 0; game.flashTimer = 0; game.gameTime = 0;
      setupLevel(1);
      setGameState('playing');
    }

    // --- Electric pathfinding ---
    function findElectricPath(game: GameState) {
      const nodes: { x: number; y: number; type: string; strokeIdx?: number; ptIdx?: number }[] = [{ x: game.source.x, y: game.source.y, type: 'source' }];
      for (let si = 0; si < game.strokes.length; si++) {
        const stroke = game.strokes[si];
        if (!stroke.settled) continue;
        for (let pi = 0; pi < stroke.points.length; pi++) {
          nodes.push({ x: stroke.points[pi].x, y: stroke.points[pi].y, type: 'stroke', strokeIdx: si, ptIdx: pi });
        }
      }
      const targetIdx = nodes.length;
      nodes.push({ x: game.targetPos.x, y: game.targetPos.y, type: 'target' });

      const adj: number[][] = Array.from({ length: nodes.length }, () => []);

      // Connect consecutive points in same stroke
      let ni = 1;
      for (const stroke of game.strokes) {
        if (!stroke.settled) continue;
        for (let i = 0; i < stroke.points.length - 1; i++) {
          const p1 = stroke.points[i], p2 = stroke.points[i + 1];
          let blocked = false;
          for (const ins of game.insulators) {
            if (segmentIntersectsRect(p1.x, p1.y, p2.x, p2.y, ins)) { blocked = true; break; }
          }
          if (!blocked) { adj[ni + i].push(ni + i + 1); adj[ni + i + 1].push(ni + i); }
        }
        ni += stroke.points.length;
      }

      // Connect nearby nodes
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          if (nodes[i].type === 'stroke' && nodes[j].type === 'stroke' && nodes[i].strokeIdx === nodes[j].strokeIdx) continue;
          const d = Math.hypot(nodes[i].x - nodes[j].x, nodes[i].y - nodes[j].y);
          if (d <= CONNECT_DIST) {
            let blocked = false;
            for (const ins of game.insulators) {
              if (segmentIntersectsRect(nodes[i].x, nodes[i].y, nodes[j].x, nodes[j].y, ins)) { blocked = true; break; }
            }
            if (!blocked) { adj[i].push(j); adj[j].push(i); }
          }
        }
      }

      // BFS
      const visited = new Set<number>();
      const parent = new Map<number, number>();
      const queue = [0]; visited.add(0);
      while (queue.length > 0) {
        const cur = queue.shift()!;
        if (cur === targetIdx) {
          const path: ArcPoint[] = [];
          let n: number | undefined = targetIdx;
          while (n !== undefined) { path.unshift(nodes[n]); n = parent.get(n); }
          return path;
        }
        for (const next of adj[cur]) {
          if (!visited.has(next)) { visited.add(next); parent.set(next, cur); queue.push(next); }
        }
      }
      return null;
    }

    function buildArcPath(path: ArcPoint[]) {
      const jagPoints: ArcPoint[] = [];
      for (let i = 0; i < path.length - 1; i++) {
        const p1 = path[i], p2 = path[i + 1];
        const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
        const segs = Math.max(3, Math.floor(dist / 8));
        const amp = Math.min(dist * 0.15, 12);
        const jag = jaggedPath(p1.x, p1.y, p2.x, p2.y, segs, amp);
        if (i > 0) jag.shift();
        jagPoints.push(...jag);
      }
      return jagPoints;
    }

    function arcPathLength(arcPath: ArcPoint[] | null) {
      if (!arcPath || arcPath.length < 2) return 1;
      let len = 0;
      for (let i = 1; i < arcPath.length; i++) len += Math.hypot(arcPath[i].x - arcPath[i - 1].x, arcPath[i].y - arcPath[i - 1].y);
      return Math.max(len, 1);
    }

    function triggerZap() {
      const game = g.current;
      if (game.strokes.length === 0) return;
      game.phase = 'dropping'; game.dropTimer = 0; game.idleTimer = 0;
      for (const stroke of game.strokes) { stroke.vy = 0; stroke.settled = false; }
    }

    // --- Gravity drop ---
    function dropStrokes(game: GameState, dt: number) {
      let allSettled = true;
      for (const stroke of game.strokes) {
        if (stroke.settled) continue;
        allSettled = false;
        stroke.vy += GRAVITY * dt;
        const dy = stroke.vy * dt;
        let landed = false;
        let landY = game.H + 100;

        for (const pt of stroke.points) {
          const newY = pt.y + dy;
          for (const plat of game.platforms) {
            if (pt.x >= plat.x && pt.x <= plat.x + plat.w && pt.y <= plat.y && newY >= plat.y) {
              landY = Math.min(landY, plat.y); landed = true;
            }
          }
          for (const ins of game.insulators) {
            if (pt.x >= ins.x && pt.x <= ins.x + ins.w && pt.y <= ins.y && newY >= ins.y) {
              landY = Math.min(landY, ins.y); landed = true;
            }
          }
        }

        if (landed) {
          const lowestPt = Math.max(...stroke.points.map(p => p.y));
          const offset = landY - lowestPt;
          for (const pt of stroke.points) pt.y += offset;
          stroke.vy = 0; stroke.settled = true;
          playClang(stroke.points.length);
          game.screenShake = 0.04;
        } else {
          for (const pt of stroke.points) pt.y += dy;
          if (stroke.points[0].y > game.H + 50) stroke.settled = true;
        }
      }
      return allSettled;
    }

    // --- Update ---
    function update(dt: number) {
      const game = g.current;
      if (game.phase === 'start' || game.phase === 'over') { game.gameTime += dt; return; }
      game.gameTime += dt;

      // Auto-zap timer
      if (game.phase === 'drawing' && game.strokes.length > 0 && !game.currentStroke) {
        if (!(game.tutActive && game.tutStep === 1)) {
          game.idleTimer += dt;
          if (game.idleTimer >= 3.0) triggerZap();
        }
      }

      if (game.phase === 'dropping') {
        game.dropTimer += dt;
        const allSettled = dropStrokes(game, dt);
        if (allSettled || game.dropTimer > 1.0) {
          for (const stroke of game.strokes) stroke.settled = true;
          game.phase = 'waiting'; game.waitTimer = 0;
          startChargingHum();
        }
      }

      if (game.phase === 'waiting') {
        game.waitTimer += dt;
        if (game.waitTimer >= LIGHTNING_DELAY) {
          const path = findElectricPath(game);
          if (path) {
            game.arcPath = buildArcPath(path);
            game.arcProgress = 0; game.arcReachedTarget = false;
            game.phase = 'arcing'; game.arcTimer = 0; game.arcFadeTimer = 0;
            playCrack();
            const totalLen = arcPathLength(game.arcPath);
            startArcTone(totalLen / LIGHTNING_SPEED);
          } else {
            game.zapsLeft--;
            if (game.zapsLeft <= 0) {
              if (game.tutActive) { tutRetry(); }
              else {
                game.phase = 'over';
                if (game.score >= game.bestScore) { game.bestScore = game.score; localStorage.setItem('spark_best', String(game.bestScore)); }
                setScore(game.score); setGameState('gameover');
                fetch('/api/pixelpit/stats', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ game: GAME_ID }) }).catch(() => {});
              }
            } else { game.phase = 'failed'; }
            spawnParticles(game.particles, game.source.x, game.source.y, T.bolt, 8);
            playFizzle();
          }
        }
      }

      if (game.phase === 'arcing') {
        game.arcTimer += dt;
        const totalLen = arcPathLength(game.arcPath);
        game.arcProgress = Math.min(1, game.arcTimer * LIGHTNING_SPEED / totalLen);
        if (game.arcProgress >= 1 && !game.arcReachedTarget) {
          game.arcReachedTarget = true;
          if (game.tutActive) game.tutCleared = true;
          game.phase = 'cleared'; game.celebTimer = 0; game.arcFadeTimer = 0.3;
          const stars = game.inkUsed <= game.parInk ? 3 : game.inkUsed <= game.inkLimit * 0.85 ? 2 : 1;
          const levelScore = game.level * 10 + stars * 5;
          game.score += levelScore;
          game.flashTimer = 0.15; game.flashColor = T.white; game.screenShake = 0.1;
          spawnParticles(game.particles, game.targetPos.x, game.targetPos.y, T.target, 15, 1.5);
          spawnParticles(game.particles, game.targetPos.x, game.targetPos.y, T.bolt, 10);
          playZap();
          setTimeout(() => playSuccess(), 100);
        }
      }

      if (game.arcFadeTimer > 0) game.arcFadeTimer -= dt;

      if (game.phase === 'cleared') {
        game.celebTimer += dt;
        if (game.celebTimer > 2.2) {
          if (game.tutActive) {
            if (!game.tutSuccess) { game.tutSuccess = true; game.tutSuccessTimer = 1.2; }
            game.tutSuccessTimer -= dt;
            if (game.tutSuccessTimer <= 0) advanceTutorial();
          } else {
            setupLevel(game.level + 1);
          }
        }
      }

      if (game.screenShake > 0) game.screenShake -= dt * 2;
      if (game.flashTimer > 0) game.flashTimer -= dt;

      for (const p of game.particles) { p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.97; p.vy *= 0.97; p.life -= dt; }
      game.particles = game.particles.filter(p => p.life > 0);
    }

    // --- Draw ---
    function draw() {
      const game = g.current;
      if (game.phase === 'start') return; // React overlay handles start

      const sx = game.screenShake > 0 ? (Math.random() - 0.5) * 4 : 0;
      const sy = game.screenShake > 0 ? (Math.random() - 0.5) * 4 : 0;
      ctx!.save();
      ctx!.translate(sx, sy);

      ctx!.fillStyle = T.bg; ctx!.fillRect(-10, -10, game.W + 20, game.H + 20);

      // Flash
      if (game.flashTimer > 0) {
        ctx!.fillStyle = game.flashColor; ctx!.globalAlpha = game.flashTimer * 3;
        ctx!.fillRect(0, 0, game.W, game.H); ctx!.globalAlpha = 1;
      }

      // Platforms
      for (const plat of game.platforms) {
        if (plat.y > game.H) continue;
        ctx!.fillStyle = T.surface; ctx!.fillRect(plat.x, plat.y, plat.w, plat.h);
        ctx!.strokeStyle = T.border; ctx!.lineWidth = 1; ctx!.strokeRect(plat.x, plat.y, plat.w, plat.h);
      }

      // Insulators
      for (const ins of game.insulators) {
        ctx!.fillStyle = 'rgba(34,211,238,0.15)'; ctx!.fillRect(ins.x, ins.y, ins.w, ins.h);
        ctx!.strokeStyle = T.insulator; ctx!.globalAlpha = 0.2; ctx!.lineWidth = 1;
        ctx!.beginPath();
        const step = 8;
        for (let i = 0; i < ins.w + ins.h; i += step) {
          ctx!.moveTo(ins.x + Math.min(i, ins.w), ins.y + Math.max(0, i - ins.w));
          ctx!.lineTo(ins.x + Math.max(0, i - ins.h), ins.y + Math.min(i, ins.h));
        }
        ctx!.stroke(); ctx!.globalAlpha = 1;
        ctx!.strokeStyle = T.insulator; ctx!.lineWidth = INSULATOR_BORDER;
        ctx!.strokeRect(ins.x, ins.y, ins.w, ins.h);
      }

      // Source
      ctx!.fillStyle = T.bolt; ctx!.shadowColor = T.bolt; ctx!.shadowBlur = 12;
      ctx!.beginPath(); ctx!.arc(game.source.x, game.source.y, SOURCE_R, 0, Math.PI * 2); ctx!.fill();
      ctx!.shadowBlur = 0;
      ctx!.strokeStyle = T.white; ctx!.lineWidth = 2; ctx!.beginPath();
      ctx!.moveTo(game.source.x - 3, game.source.y - 7);
      ctx!.lineTo(game.source.x + 2, game.source.y - 1);
      ctx!.lineTo(game.source.x - 2, game.source.y + 1);
      ctx!.lineTo(game.source.x + 3, game.source.y + 7);
      ctx!.stroke();

      // Target
      const targetPulse = Math.sin(game.gameTime * 3) * 0.3 + 0.7;
      ctx!.fillStyle = T.target; ctx!.shadowColor = T.target; ctx!.shadowBlur = 10 * targetPulse;
      ctx!.beginPath(); ctx!.arc(game.targetPos.x, game.targetPos.y, TARGET_R, 0, Math.PI * 2); ctx!.fill();
      ctx!.shadowBlur = 0;
      ctx!.strokeStyle = T.white; ctx!.shadowColor = T.target; ctx!.shadowBlur = 6 * targetPulse; ctx!.lineWidth = 2.5;
      const gx = game.targetPos.x, gy = game.targetPos.y;
      ctx!.beginPath();
      ctx!.moveTo(gx, gy - 8); ctx!.lineTo(gx, gy + 3);
      ctx!.moveTo(gx - 9, gy + 3); ctx!.lineTo(gx + 9, gy + 3);
      ctx!.moveTo(gx - 6, gy + 7); ctx!.lineTo(gx + 6, gy + 7);
      ctx!.moveTo(gx - 3, gy + 11); ctx!.lineTo(gx + 3, gy + 11);
      ctx!.stroke(); ctx!.shadowBlur = 0;

      // Drawn strokes
      for (const stroke of game.strokes) {
        if (stroke.points.length < 2) continue;
        ctx!.strokeStyle = T.copper; ctx!.lineCap = 'round';
        ctx!.shadowColor = T.copperHi; ctx!.shadowBlur = 4;
        for (let i = 1; i < stroke.points.length; i++) {
          ctx!.lineWidth = stroke.points[i].w || 6;
          ctx!.beginPath();
          ctx!.moveTo(stroke.points[i - 1].x, stroke.points[i - 1].y);
          ctx!.lineTo(stroke.points[i].x, stroke.points[i].y);
          ctx!.stroke();
        }
        ctx!.shadowBlur = 0;
      }

      // Connection feedback
      if (game.phase === 'drawing' || game.phase === 'dropping' || game.phase === 'waiting') {
        const endpoints: ArcPoint[] = [{ x: game.source.x, y: game.source.y }];
        for (const stroke of game.strokes) {
          if (stroke.points.length < 2) continue;
          endpoints.push(stroke.points[0]); endpoints.push(stroke.points[stroke.points.length - 1]);
        }
        endpoints.push({ x: game.targetPos.x, y: game.targetPos.y });
        ctx!.strokeStyle = T.bolt; ctx!.lineWidth = 1; ctx!.globalAlpha = 0.25;
        ctx!.setLineDash([3, 5]);
        for (let i = 0; i < endpoints.length; i++) {
          for (let j = i + 1; j < endpoints.length; j++) {
            const d = Math.hypot(endpoints[i].x - endpoints[j].x, endpoints[i].y - endpoints[j].y);
            if (d <= CONNECT_DIST && d > 3) {
              ctx!.beginPath(); ctx!.moveTo(endpoints[i].x, endpoints[i].y);
              ctx!.lineTo(endpoints[j].x, endpoints[j].y); ctx!.stroke();
            }
          }
        }
        ctx!.setLineDash([]); ctx!.globalAlpha = 1;
      }

      // Connectivity radius circles
      if (game.phase === 'drawing') {
        ctx!.strokeStyle = T.bolt; ctx!.lineWidth = 1; ctx!.globalAlpha = 0.08;
        for (const stroke of game.strokes) {
          if (stroke.points.length < 2) continue;
          const first = stroke.points[0], last = stroke.points[stroke.points.length - 1];
          ctx!.beginPath(); ctx!.arc(first.x, first.y, 25, 0, Math.PI * 2); ctx!.stroke();
          ctx!.beginPath(); ctx!.arc(last.x, last.y, 25, 0, Math.PI * 2); ctx!.stroke();
        }
        ctx!.globalAlpha = 1;
      }

      // Ghost preview
      if (game.phase === 'drawing') {
        for (const stroke of game.strokes) {
          if (stroke.points.length < 2) continue;
          const offset = computeGhostOffset(stroke, game.platforms, game.insulators, game.H);
          if (offset < 2) continue;
          ctx!.strokeStyle = T.copper; ctx!.lineWidth = 4; ctx!.lineCap = 'round';
          ctx!.globalAlpha = 0.15; ctx!.setLineDash([4, 6]);
          ctx!.beginPath(); ctx!.moveTo(stroke.points[0].x, stroke.points[0].y + offset);
          for (let i = 1; i < stroke.points.length; i++) ctx!.lineTo(stroke.points[i].x, stroke.points[i].y + offset);
          ctx!.stroke(); ctx!.setLineDash([]); ctx!.globalAlpha = 1;
        }
      }

      // Current stroke being drawn
      if (game.currentStroke && game.currentStroke.length >= 2) {
        ctx!.strokeStyle = T.copperHi; ctx!.lineCap = 'round'; ctx!.globalAlpha = 0.7;
        for (let i = 1; i < game.currentStroke.length; i++) {
          ctx!.lineWidth = game.currentStroke[i].w || 6;
          ctx!.beginPath();
          ctx!.moveTo(game.currentStroke[i - 1].x, game.currentStroke[i - 1].y);
          ctx!.lineTo(game.currentStroke[i].x, game.currentStroke[i].y);
          ctx!.stroke();
        }
        ctx!.globalAlpha = 1;
      }

      // Lightning arc
      const showArc = (game.phase === 'arcing' || (game.phase === 'cleared' && game.arcFadeTimer > 0)) && game.arcPath && game.arcPath.length >= 2;
      if (showArc && game.arcPath) {
        const drawTo = game.phase === 'arcing' ? Math.floor(game.arcProgress * (game.arcPath.length - 1)) : game.arcPath.length - 1;
        const fadeAlpha = game.phase === 'cleared' ? game.arcFadeTimer / 0.3 : 1;

        ctx!.strokeStyle = T.bolt; ctx!.lineWidth = 4;
        ctx!.shadowColor = T.bolt; ctx!.shadowBlur = 16; ctx!.globalAlpha = 0.6 * fadeAlpha;
        ctx!.beginPath(); ctx!.moveTo(game.arcPath[0].x, game.arcPath[0].y);
        for (let i = 1; i <= drawTo; i++) ctx!.lineTo(game.arcPath[i].x, game.arcPath[i].y);
        ctx!.stroke(); ctx!.shadowBlur = 0;

        ctx!.strokeStyle = T.boltEdge; ctx!.lineWidth = 2; ctx!.globalAlpha = 0.9 * fadeAlpha;
        ctx!.beginPath(); ctx!.moveTo(game.arcPath[0].x, game.arcPath[0].y);
        for (let i = 1; i <= drawTo; i++) ctx!.lineTo(game.arcPath[i].x, game.arcPath[i].y);
        ctx!.stroke(); ctx!.globalAlpha = 1;

        if (drawTo > 0 && drawTo < game.arcPath.length) {
          const tip = game.arcPath[drawTo];
          ctx!.fillStyle = T.white; ctx!.shadowColor = T.bolt; ctx!.shadowBlur = 10;
          ctx!.beginPath(); ctx!.arc(tip.x, tip.y, 3, 0, Math.PI * 2); ctx!.fill(); ctx!.shadowBlur = 0;
          if (Math.random() < 0.3) spawnParticles(game.particles, tip.x, tip.y, T.bolt, 1, 0.5);
        }
      }

      // Particles
      for (const p of game.particles) {
        ctx!.globalAlpha = p.life / p.maxLife; ctx!.fillStyle = p.color;
        ctx!.beginPath(); ctx!.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx!.fill();
      }
      ctx!.globalAlpha = 1;

      // HUD
      if (game.phase !== 'over') {
        ctx!.fillStyle = T.text; ctx!.font = 'bold 16px monospace'; ctx!.textAlign = 'left';
        ctx!.fillText('LVL ' + game.level, 12, game.safeTop + 24);
        ctx!.textAlign = 'right'; ctx!.fillText(String(game.score), game.W - 12, game.safeTop + 24);

        // Ink meter
        const inkPct = Math.min(game.inkUsed / game.inkLimit, 1);
        const meterW = 100, meterH = 6;
        const meterX = game.W / 2 - meterW / 2, meterY = game.safeTop + 16;
        ctx!.fillStyle = T.border; ctx!.fillRect(meterX, meterY, meterW, meterH);
        ctx!.fillStyle = inkPct < 0.6 ? T.copper : inkPct < 0.85 ? T.gold : T.red;
        ctx!.fillRect(meterX, meterY, meterW * inkPct, meterH);
        ctx!.strokeStyle = T.muted; ctx!.lineWidth = 1; ctx!.strokeRect(meterX, meterY, meterW, meterH);
        const parMark = game.parInk / game.inkLimit;
        ctx!.strokeStyle = T.target; ctx!.lineWidth = 1; ctx!.beginPath();
        ctx!.moveTo(meterX + meterW * parMark, meterY - 2);
        ctx!.lineTo(meterX + meterW * parMark, meterY + meterH + 2); ctx!.stroke();
        ctx!.fillStyle = T.muted; ctx!.font = '10px monospace'; ctx!.textAlign = 'center';
        ctx!.fillText('INK', game.W / 2, meterY + meterH + 12);

        // Zap counter
        ctx!.fillStyle = game.zapsLeft <= 1 ? T.red : T.muted;
        ctx!.font = '11px monospace'; ctx!.textAlign = 'right';
        ctx!.fillText('ZAP ' + game.zapsLeft + '/3', game.W - 12, game.safeTop + 40);

        // Buttons
        if (game.phase === 'drawing') {
          ctx!.fillStyle = T.muted; ctx!.globalAlpha = 0.5; ctx!.font = '12px monospace';
          ctx!.textAlign = 'left'; ctx!.fillText('\u21BA RETRY', 12, game.H - 16);
          ctx!.textAlign = 'right'; ctx!.fillText('ZAP', game.W - 12, game.H - 16);
          ctx!.globalAlpha = 1;
        }
      }

      // Cleared overlay
      if (game.phase === 'cleared') {
        const t = Math.min(game.celebTimer / 0.3, 1);
        const c1 = 1.70158, c3 = c1 + 1;
        const scale = t < 1 ? 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2) : 1;
        ctx!.save(); ctx!.translate(game.W / 2, game.H / 2 - 20); ctx!.scale(scale, scale);
        ctx!.fillStyle = T.target; ctx!.font = 'bold 28px monospace'; ctx!.textAlign = 'center';
        ctx!.fillText('CONNECTED!', 0, 0); ctx!.restore();

        const stars = game.inkUsed <= game.parInk ? 3 : game.inkUsed <= game.inkLimit * 0.85 ? 2 : 1;
        ctx!.fillStyle = T.gold; ctx!.font = '20px monospace'; ctx!.textAlign = 'center';
        const starStr = '\u2605'.repeat(stars) + '\u2606'.repeat(3 - stars);
        ctx!.fillText(starStr, game.W / 2, game.H / 2 + 15);
        ctx!.fillStyle = T.muted; ctx!.font = '12px monospace';
        ctx!.fillText(Math.floor(game.inkUsed) + ' ink (par ' + game.parInk + ')', game.W / 2, game.H / 2 + 38);
      }

      // Failed overlay
      if (game.phase === 'failed') {
        ctx!.fillStyle = 'rgba(9,9,11,0.7)'; ctx!.fillRect(0, 0, game.W, game.H);
        ctx!.fillStyle = T.red; ctx!.font = 'bold 20px monospace'; ctx!.textAlign = 'center';
        ctx!.fillText('NO PATH', game.W / 2, game.H / 2 - 10);
        ctx!.fillStyle = T.muted; ctx!.font = '13px monospace';
        ctx!.fillText(game.zapsLeft + ' zap' + (game.zapsLeft !== 1 ? 's' : '') + ' left', game.W / 2, game.H / 2 + 15);
        ctx!.fillText('TAP TO RETRY', game.W / 2, game.H / 2 + 35);
      }

      // Tutorial HUD
      if (game.tutActive) {
        const step = TUT_STEPS[game.tutStep];
        ctx!.fillStyle = T.bolt; ctx!.font = 'bold 14px monospace'; ctx!.textAlign = 'center';
        ctx!.fillText(step.name, game.W / 2, game.safeTop + 58);
        ctx!.fillStyle = T.muted; ctx!.font = '12px monospace';
        ctx!.fillText(step.instruction, game.W / 2, game.safeTop + 74);
        for (let i = 0; i < TUT_STEPS.length; i++) {
          const dotX = game.W / 2 + (i - 2) * 16, dotY = game.H - 40;
          ctx!.fillStyle = i < game.tutStep ? T.bolt : i === game.tutStep ? T.white : T.muted;
          ctx!.beginPath(); ctx!.arc(dotX, dotY, i === game.tutStep ? 4 : 3, 0, Math.PI * 2); ctx!.fill();
        }
        ctx!.fillStyle = T.muted; ctx!.font = '11px monospace'; ctx!.textAlign = 'right';
        ctx!.fillText('SKIP \u25B8', game.W - 16, game.safeTop + 24);
        if (game.tutSuccess) {
          ctx!.fillStyle = T.bolt; ctx!.font = 'bold 24px monospace'; ctx!.textAlign = 'center';
          ctx!.shadowBlur = 12; ctx!.shadowColor = T.bolt;
          ctx!.fillText('NICE!', game.W / 2, game.H * 0.4); ctx!.shadowBlur = 0;
        }
      }

      ctx!.restore();
    }

    // --- Input ---
    function isSkipTap(tx: number, ty: number) { return tx > g.current.W - 80 && ty < g.current.safeTop + 50; }

    function handleDown(e: PointerEvent) {
      e.preventDefault();
      const game = g.current;
      const tx = e.clientX, ty = e.clientY;

      if (game.phase === 'over') {
        // Handled by React overlay
        return;
      }
      if (game.phase === 'failed') {
        if (game.tutActive) { tutRetry(); } else { retryLevel(); }
        return;
      }
      if (game.tutActive && isSkipTap(tx, ty)) { skipTutorial(); return; }
      if (game.phase === 'cleared') return;

      // Retry button
      if (game.phase === 'drawing' && tx < 90 && ty > game.H - 40) { retryLevel(); return; }
      // Zap button
      if (game.phase === 'drawing' && tx > game.W - 70 && ty > game.H - 40) { triggerZap(); return; }

      if (game.phase === 'drawing') {
        for (const ins of game.insulators) { if (pointInRect(tx, ty, ins)) return; }
        game.currentStroke = [{ x: tx, y: ty, w: STROKE_W_MAX }];
      }
    }

    function handleMove(e: PointerEvent) {
      e.preventDefault();
      const game = g.current;
      if (!game.currentStroke || game.phase !== 'drawing') return;
      const tx = e.clientX, ty = e.clientY;
      const last = game.currentStroke[game.currentStroke.length - 1];
      const dist = Math.hypot(tx - last.x, ty - last.y);
      if (dist >= SEGMENT_MIN_LEN) {
        if (game.inkUsed + dist > game.inkLimit) return;
        for (const ins of game.insulators) { if (segmentIntersectsRect(last.x, last.y, tx, ty, ins)) return; }
        const strokeW = STROKE_W_MAX - Math.min(dist / 15, 1) * (STROKE_W_MAX - STROKE_W_MIN);
        game.currentStroke.push({ x: tx, y: ty, w: strokeW });
        game.inkUsed += dist; game.drawSpeed = dist; game.idleTimer = 0;
        if (game.currentStroke.length % 3 === 0) playDrawHum(dist);
      }
    }

    function handleUp(e: PointerEvent) {
      e.preventDefault();
      const game = g.current;
      if (!game.currentStroke || game.phase !== 'drawing') return;
      if (game.currentStroke.length >= 2) {
        game.strokes.push({ points: [...game.currentStroke], vy: 0, settled: false });
      }
      game.currentStroke = null; game.drawSpeed = 0;
    }

    function handleKeyDown(e: KeyboardEvent) {
      const game = g.current;
      if (e.code === 'Space' || e.code === 'Enter') {
        if (game.phase === 'failed') { if (game.tutActive) tutRetry(); else retryLevel(); return; }
        if (game.phase === 'drawing' && game.strokes.length > 0) triggerZap();
      }
      if (e.code === 'KeyR' && game.phase === 'drawing') retryLevel();
    }

    canvas.addEventListener('pointerdown', handleDown);
    canvas.addEventListener('pointermove', handleMove);
    canvas.addEventListener('pointerup', handleUp);
    canvas.addEventListener('pointercancel', handleUp);
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
      canvas.removeEventListener('pointerdown', handleDown);
      canvas.removeEventListener('pointermove', handleMove);
      canvas.removeEventListener('pointerup', handleUp);
      canvas.removeEventListener('pointercancel', handleUp);
      document.removeEventListener('keydown', handleKeyDown);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initAudio, setupLevel, retryLevel]);

  return (
    <>
      <Script src="/pixelpit/social.js" strategy="lazyOnload" onLoad={() => setSocialLoaded(true)} />
      <canvas ref={canvasRef} style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', display: 'block', background: T.bg, touchAction: 'none' }} />

      {gameState === 'start' && (
        <div style={{ position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: COLORS.bg, zIndex: 100, textAlign: 'center', padding: 40 }}>
          <div style={{ background: COLORS.surface, border: `1px solid ${T.border}`, padding: '50px 60px', borderRadius: 16 }}>
            {/* Lightning bolt icon */}
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" style={{ margin: '0 auto 12px', display: 'block' }}>
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill={T.bolt} />
            </svg>
            <h1 style={{ fontFamily: 'ui-monospace, monospace', fontSize: 56, fontWeight: 700, color: T.white, marginBottom: 16, letterSpacing: 6 }}>SPARK</h1>
            <p style={{ fontSize: 14, fontFamily: 'ui-monospace, monospace', color: T.muted, marginBottom: 30, lineHeight: 1.8, letterSpacing: 1 }}>
              draw · drop · connect
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
              <button onClick={startGame} style={{ background: T.copper, color: T.bg, border: 'none', padding: '16px 50px', fontSize: 16, fontFamily: 'ui-monospace, monospace', fontWeight: 600, cursor: 'pointer', borderRadius: 8, letterSpacing: 2 }}>play</button>
              <button onClick={startTutorial} style={{ background: 'transparent', color: T.muted, border: `1px solid ${T.border}`, padding: '12px 35px', fontSize: 12, fontFamily: 'ui-monospace, monospace', cursor: 'pointer', borderRadius: 6, letterSpacing: 2 }}>tutorial</button>
            </div>
          </div>
          <div style={{ marginTop: 24, fontSize: 12, fontFamily: 'ui-monospace, monospace', letterSpacing: 3 }}>
            <span style={{ color: T.copper }}>pixel</span><span style={{ color: T.gold }}>pit</span><span style={{ color: T.muted }}> arcade</span>
          </div>
        </div>
      )}

      {gameState === 'gameover' && (
        <div style={{ position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(9,9,11,0.85)', zIndex: 100, textAlign: 'center', padding: 40 }}>
          <h1 style={{ fontFamily: 'ui-monospace, monospace', fontSize: 14, fontWeight: 300, color: T.muted, marginBottom: 12, letterSpacing: 4 }}>SHORTED</h1>
          <div style={{ fontFamily: 'ui-monospace, monospace', fontSize: 72, fontWeight: 700, color: T.white, marginBottom: 8 }}>{score}</div>
          <div style={{ fontFamily: 'ui-monospace, monospace', fontSize: 13, color: T.muted, marginBottom: 25 }}>points scored</div>
          <ScoreFlow score={score} gameId={GAME_ID} colors={SCORE_FLOW_COLORS} maxScore={500} onRankReceived={(rank, entryId) => setSubmittedEntryId(entryId ?? null)} onProgression={(prog) => setProgression(prog)} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
            <button onClick={startGame} style={{ background: T.copper, color: T.bg, border: 'none', borderRadius: 8, padding: '16px 50px', fontSize: 15, fontFamily: 'ui-monospace, monospace', fontWeight: 600, cursor: 'pointer', letterSpacing: 2 }}>play again</button>
            <button onClick={() => setGameState('leaderboard')} style={{ background: 'transparent', border: `1px solid ${T.border}`, borderRadius: 6, color: T.muted, padding: '14px 35px', fontSize: 11, fontFamily: 'ui-monospace, monospace', cursor: 'pointer', letterSpacing: 2 }}>leaderboard</button>
            {user ? (
              <button onClick={() => setShowShareModal(true)} style={{ background: 'transparent', border: `1px solid ${T.border}`, borderRadius: 6, color: T.muted, padding: '14px 35px', fontSize: 11, fontFamily: 'ui-monospace, monospace', cursor: 'pointer', letterSpacing: 2 }}>share / groups</button>
            ) : (
              <ShareButtonContainer id="share-btn-container" url={typeof window !== 'undefined' ? `${window.location.origin}/pixelpit/arcade/spark/share/${score}` : ''} text={`I scored ${score} on SPARK! Can you beat me?`} style="minimal" socialLoaded={socialLoaded} />
            )}
          </div>
        </div>
      )}

      {gameState === 'leaderboard' && <Leaderboard gameId={GAME_ID} limit={8} entryId={submittedEntryId ?? undefined} colors={LEADERBOARD_COLORS} onClose={() => setGameState('gameover')} groupsEnabled={true} gameUrl={GAME_URL} socialLoaded={socialLoaded} />}
      {showShareModal && user && <ShareModal gameUrl={GAME_URL} score={score} colors={LEADERBOARD_COLORS} onClose={() => setShowShareModal(false)} />}
    </>
  );
}

// --- Tutorial step setup ---
function setupTutStep(game: GameState, step: number) {
  game.strokes = []; game.currentStroke = null; game.inkUsed = 0;
  game.particles = []; game.zapsLeft = 3; game.idleTimer = 0;
  game.tutCleared = false; game.phase = 'drawing';
  game.dropTimer = 0; game.waitTimer = 0; game.arcTimer = 0;
  game.arcPath = null; game.arcProgress = 0; game.arcReachedTarget = false;
  game.drawSpeed = 0; game.arcFadeTimer = 0;

  const W = game.W, H = game.H, safeTop = game.safeTop;

  if (step === 0) {
    game.source = { x: W / 2, y: safeTop + 80 };
    game.targetPos = { x: W / 2, y: H - 80 };
    game.insulators = [];
    game.platforms = [{ x: 0, y: H + 10, w: W, h: 20 }];
    game.inkLimit = 500; game.parInk = 300;
  } else if (step === 1) {
    game.source = { x: W * 0.3, y: safeTop + 80 };
    game.targetPos = { x: W * 0.3, y: H - 80 };
    game.insulators = [];
    game.platforms = [{ x: 0, y: H + 10, w: W, h: 20 }];
    game.inkLimit = 500; game.parInk = 300;
  } else if (step === 2) {
    game.source = { x: W / 2, y: safeTop + 80 };
    game.targetPos = { x: W / 2, y: H - 80 };
    game.insulators = [{ x: W / 2 - 40, y: H * 0.45, w: 80, h: 12 }];
    game.platforms = [{ x: 0, y: H + 10, w: W, h: 20 }];
    game.inkLimit = 500; game.parInk = 250;
  } else if (step === 3) {
    game.source = { x: W * 0.35, y: safeTop + 80 };
    game.targetPos = { x: W * 0.65, y: H - 80 };
    game.insulators = [];
    game.platforms = [{ x: 0, y: H + 10, w: W, h: 20 }];
    game.inkLimit = 250; game.parInk = 150;
  } else if (step === 4) {
    game.source = { x: W * 0.3, y: safeTop + 60 };
    game.targetPos = { x: W * 0.7, y: H - 60 };
    game.insulators = [];
    game.platforms = [
      { x: W * 0.4, y: H * 0.5, w: 80, h: 8 },
      { x: 0, y: H + 10, w: W, h: 20 },
    ];
    game.inkLimit = 400; game.parInk = 200;
  }
}
