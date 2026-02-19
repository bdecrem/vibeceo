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

const GAME_ID = 'puff';

const THEME = {
  bg: '#0ea5e9',
  surface: '#0284c7',
  border: '#000000',
  coral: '#f472b6',
  inflate: '#34d399',
  deflate: '#ef4444',
  double: '#facc15',
  wall: '#78716c',
  gap: '#22d3ee',
  fish: '#fbbf24',
  text: '#ffffff',
  sand: '#fef3c7',
};

const SCORE_FLOW_COLORS: ScoreFlowColors = {
  bg: THEME.surface,
  surface: THEME.bg,
  primary: THEME.fish,
  secondary: THEME.inflate,
  text: THEME.text,
  muted: '#7dd3fc',
  error: THEME.deflate,
};

const LEADERBOARD_COLORS: LeaderboardColors = {
  bg: THEME.surface,
  surface: THEME.bg,
  primary: THEME.fish,
  secondary: THEME.inflate,
  text: THEME.text,
  muted: '#7dd3fc',
};

const GAME_WIDTH = 400;
const GAME_HEIGHT = 600;
const LANE_COUNT = 3;
const LANE_WIDTH = GAME_WIDTH / LANE_COUNT;
const LANES = [LANE_WIDTH / 2, LANE_WIDTH + LANE_WIDTH / 2, 2 * LANE_WIDTH + LANE_WIDTH / 2];

const BASE_SPEED = 300;
const FISH_Y = GAME_HEIGHT - 100; // fish stays near bottom (vertical scroll upward)

type GateType = 'inflate' | 'deflate' | 'double';
interface Gate {
  lane: number;
  y: number;
  type: GateType;
  value: number; // +1,+2,+3,-1,-2 or 2 for double
  hit: boolean;
}

type ObstacleType = 'wall' | 'gap';
interface Obstacle {
  y: number;
  type: ObstacleType;
  sizeReq: number;
  hit: boolean;
  passed: boolean;
}

interface Particle {
  x: number; y: number; vx: number; vy: number;
  life: number; color: string; size: number;
}

interface Bubble {
  x: number; y: number; r: number; speed: number; wobble: number;
}

interface Seaweed {
  x: number; segments: number; phase: number;
}

// ── AUDIO ──────────────────────────────────────────
let audioCtx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let musicGain: GainNode | null = null;
let musicPlaying = false;
let musicInterval: ReturnType<typeof setInterval> | null = null;
let musicStep = 0;

function initAudio() {
  if (audioCtx) return;
  audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  masterGain = audioCtx.createGain();
  masterGain.gain.value = 1.0;
  masterGain.connect(audioCtx.destination);
  musicGain = audioCtx.createGain();
  musicGain.gain.value = 0.4;
  musicGain.connect(masterGain);
  if (audioCtx.state === 'suspended') audioCtx.resume();
}

// Underwater ambience — gentle step sequencer
const MUSIC = {
  bpm: 80,
  bass: [65, 0, 0, 0, 0, 65, 0, 0, 62, 0, 0, 0, 0, 0, 58, 0],
  pad:  [196, 0, 262, 0, 0, 0, 220, 0, 196, 0, 0, 247, 0, 0, 0, 0],
  bub:  [0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
};

function mBass(freq: number) {
  if (!audioCtx || !musicGain || !freq) return;
  const t = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const flt = audioCtx.createBiquadFilter();
  const g = audioCtx.createGain();
  osc.connect(flt); flt.connect(g); g.connect(musicGain);
  osc.type = 'sine'; osc.frequency.value = freq;
  flt.type = 'lowpass'; flt.frequency.value = 120;
  g.gain.setValueAtTime(0.2, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
  osc.start(t); osc.stop(t + 0.32);
}

function mPad(freq: number) {
  if (!audioCtx || !musicGain || !freq) return;
  const t = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const flt = audioCtx.createBiquadFilter();
  const g = audioCtx.createGain();
  osc.connect(flt); flt.connect(g); g.connect(musicGain);
  osc.type = 'sine'; osc.frequency.value = freq;
  flt.type = 'lowpass'; flt.frequency.value = 600; flt.Q.value = 2;
  g.gain.setValueAtTime(0.06, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
  osc.start(t); osc.stop(t + 0.42);
}

function mBub() {
  if (!audioCtx || !musicGain) return;
  const t = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  osc.connect(g); g.connect(musicGain);
  osc.type = 'sine';
  osc.frequency.setValueAtTime(400 + Math.random() * 200, t);
  osc.frequency.exponentialRampToValueAtTime(800 + Math.random() * 400, t + 0.06);
  g.gain.setValueAtTime(0.03, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
  osc.start(t); osc.stop(t + 0.1);
}

function musicTick() {
  if (!audioCtx || !musicPlaying) return;
  const s = musicStep % 16;
  mBass(MUSIC.bass[s]);
  mPad(MUSIC.pad[s]);
  if (MUSIC.bub[s]) mBub();
  musicStep++;
}

function startMusic() {
  if (musicPlaying) return;
  initAudio();
  if (audioCtx?.state === 'suspended') audioCtx.resume();
  musicPlaying = true; musicStep = 0;
  musicInterval = setInterval(musicTick, (60 / MUSIC.bpm) * 1000 / 4);
}

function stopMusic() {
  musicPlaying = false;
  if (musicInterval) { clearInterval(musicInterval); musicInterval = null; }
}

// SFX
function sfxInflate() {
  if (!audioCtx || !masterGain) return;
  const t = audioCtx.currentTime;
  [400, 600, 800].forEach((f, i) => {
    const o = audioCtx!.createOscillator();
    const g = audioCtx!.createGain();
    o.connect(g); g.connect(masterGain!);
    o.type = 'sine';
    o.frequency.setValueAtTime(f, t + i * 0.04);
    o.frequency.exponentialRampToValueAtTime(f * 1.5, t + i * 0.04 + 0.06);
    g.gain.setValueAtTime(0.08, t + i * 0.04);
    g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.04 + 0.1);
    o.start(t + i * 0.04); o.stop(t + i * 0.04 + 0.12);
  });
}

function sfxDeflate() {
  if (!audioCtx || !masterGain) return;
  const t = audioCtx.currentTime;
  const o = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  o.connect(g); g.connect(masterGain);
  o.type = 'sine';
  o.frequency.setValueAtTime(500, t);
  o.frequency.exponentialRampToValueAtTime(100, t + 0.2);
  g.gain.setValueAtTime(0.12, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
  o.start(t); o.stop(t + 0.22);
}

function sfxSmash() {
  if (!audioCtx || !masterGain) return;
  const t = audioCtx.currentTime;
  const bufLen = audioCtx.sampleRate * 0.12;
  const buf = audioCtx.createBuffer(1, bufLen, audioCtx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < bufLen; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / bufLen);
  const src = audioCtx.createBufferSource(); src.buffer = buf;
  const flt = audioCtx.createBiquadFilter(); flt.type = 'lowpass'; flt.frequency.value = 1200;
  const g = audioCtx.createGain();
  g.gain.setValueAtTime(0.2, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
  src.connect(flt); flt.connect(g); g.connect(masterGain); src.start();
  // Sub
  const sub = audioCtx.createOscillator();
  const sg = audioCtx.createGain();
  sub.connect(sg); sg.connect(masterGain);
  sub.type = 'sine'; sub.frequency.value = 60;
  sg.gain.setValueAtTime(0.15, t); sg.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
  sub.start(t); sub.stop(t + 0.18);
}

function sfxSqueeze() {
  if (!audioCtx || !masterGain) return;
  const t = audioCtx.currentTime;
  const o = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  o.connect(g); g.connect(masterGain);
  o.type = 'sine';
  o.frequency.setValueAtTime(300, t);
  o.frequency.exponentialRampToValueAtTime(900, t + 0.05);
  g.gain.setValueAtTime(0.1, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
  o.start(t); o.stop(t + 0.1);
}

function sfxBonk() {
  if (!audioCtx || !masterGain) return;
  const t = audioCtx.currentTime;
  // Bonk
  const o = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  o.connect(g); g.connect(masterGain);
  o.type = 'triangle'; o.frequency.value = 200;
  g.gain.setValueAtTime(0.15, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
  o.start(t); o.stop(t + 0.17);
  // Sad trombone
  [233, 220, 196, 175].forEach((f, i) => {
    const o2 = audioCtx!.createOscillator();
    const g2 = audioCtx!.createGain();
    o2.connect(g2); g2.connect(masterGain!);
    o2.type = 'sawtooth'; o2.frequency.value = f;
    const flt = audioCtx!.createBiquadFilter(); flt.type = 'lowpass'; flt.frequency.value = 400;
    o2.disconnect(); o2.connect(flt); flt.connect(g2);
    g2.gain.setValueAtTime(0.04, t + 0.2 + i * 0.15);
    g2.gain.exponentialRampToValueAtTime(0.001, t + 0.2 + i * 0.15 + 0.14);
    o2.start(t + 0.2 + i * 0.15); o2.stop(t + 0.2 + i * 0.15 + 0.16);
  });
}

function sfxLaneSwitch() {
  if (!audioCtx || !masterGain) return;
  const t = audioCtx.currentTime;
  const o = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  o.connect(g); g.connect(masterGain);
  o.type = 'triangle'; o.frequency.value = 500;
  g.gain.setValueAtTime(0.05, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.03);
  o.start(t); o.stop(t + 0.04);
}

function sfxDeath() {
  if (!audioCtx || !masterGain) return;
  const t = audioCtx.currentTime;
  const o = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  o.connect(g); g.connect(masterGain);
  o.type = 'sine';
  o.frequency.setValueAtTime(400, t);
  o.frequency.exponentialRampToValueAtTime(50, t + 0.6);
  g.gain.setValueAtTime(0.2, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
  o.start(t); o.stop(t + 0.62);
}

// ── SECTION GENERATION ──────────────────────────────
function generateSection(sectionNum: number, startY: number): { gates: Gate[]; obstacles: Obstacle[] } {
  const gates: Gate[] = [];
  const obstacles: Obstacle[] = [];
  const spacing = 120;
  let y = startY;

  // Difficulty ramp
  const difficulty = Math.min(sectionNum, 20);
  const phase = ((sectionNum - 1) % 3) + 1; // 1, 2, 3 repeating

  if (phase === 1) {
    // Inflate section — gates to grow, then wall test
    const gateCount = 3 + Math.min(Math.floor(difficulty / 3), 4);
    for (let i = 0; i < gateCount; i++) {
      y -= spacing;
      const lane = Math.floor(Math.random() * 3);
      const vals = [1, 1, 2, 2, 3];
      gates.push({ lane, y, type: 'inflate', value: vals[Math.floor(Math.random() * vals.length)], hit: false });
      // Occasional deflate gate in another lane to add choice
      if (Math.random() < 0.2 + difficulty * 0.02) {
        const otherLane = (lane + 1 + Math.floor(Math.random() * 2)) % 3;
        gates.push({ lane: otherLane, y, type: 'deflate', value: -(1 + Math.floor(Math.random() * 2)), hit: false });
      }
    }
    y -= spacing;
    const wallReq = Math.min(3 + Math.floor(difficulty / 2), 8);
    obstacles.push({ y, type: 'wall', sizeReq: wallReq, hit: false, passed: false });
  } else if (phase === 2) {
    // Mixed — need to manage size down, then gap test
    const gateCount = 5 + Math.min(Math.floor(difficulty / 3), 3);
    for (let i = 0; i < gateCount; i++) {
      y -= spacing;
      const lane = Math.floor(Math.random() * 3);
      if (i < gateCount / 2) {
        // First half: inflate
        gates.push({ lane, y, type: 'inflate', value: 1 + Math.floor(Math.random() * 2), hit: false });
      } else {
        // Second half: deflate to prepare for gap
        const r = Math.random();
        if (r < 0.6) {
          gates.push({ lane, y, type: 'deflate', value: -(1 + Math.floor(Math.random() * 2)), hit: false });
        } else {
          gates.push({ lane, y, type: 'inflate', value: 1, hit: false });
        }
      }
    }
    y -= spacing;
    const gapReq = Math.max(2, 5 - Math.floor(difficulty / 4));
    obstacles.push({ y, type: 'gap', sizeReq: gapReq, hit: false, passed: false });
  } else {
    // Phase 3 — wall AND gap back-to-back, with double gates mixed in
    const gateCount = 6 + Math.min(Math.floor(difficulty / 2), 6);
    for (let i = 0; i < gateCount; i++) {
      y -= spacing;
      const lane = Math.floor(Math.random() * 3);
      const r = Math.random();
      if (r < 0.1 + difficulty * 0.01) {
        gates.push({ lane, y, type: 'double', value: 2, hit: false });
      } else if (i < gateCount * 0.6) {
        gates.push({ lane, y, type: 'inflate', value: 1 + Math.floor(Math.random() * 3), hit: false });
      } else {
        gates.push({ lane, y, type: 'deflate', value: -(1 + Math.floor(Math.random() * 2)), hit: false });
      }
    }
    y -= spacing;
    const wallReq = Math.min(4 + Math.floor(difficulty / 2), 9);
    obstacles.push({ y, type: 'wall', sizeReq: wallReq, hit: false, passed: false });
    y -= spacing * 1.5;
    // Some deflate gates between wall and gap
    for (let i = 0; i < 2 + Math.floor(difficulty / 4); i++) {
      y -= spacing * 0.8;
      const lane = Math.floor(Math.random() * 3);
      gates.push({ lane, y, type: 'deflate', value: -(1 + Math.floor(Math.random() * 2)), hit: false });
    }
    y -= spacing;
    const gapReq = Math.max(2, 5 - Math.floor(difficulty / 5));
    obstacles.push({ y, type: 'gap', sizeReq: gapReq, hit: false, passed: false });
  }

  return { gates, obstacles };
}

export default function PuffPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [canvasSize, setCanvasSize] = useState({ w: GAME_WIDTH, h: GAME_HEIGHT });
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'gameover' | 'leaderboard'>('menu');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [socialLoaded, setSocialLoaded] = useState(false);
  const [submittedEntryId, setSubmittedEntryId] = useState<number | null>(null);
  const [progression, setProgression] = useState<ProgressionResult | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);

  const { user } = usePixelpitSocial(socialLoaded);

  const GAME_URL = typeof window !== 'undefined'
    ? `${window.location.origin}/pixelpit/arcade/${GAME_ID}`
    : `https://pixelpit.gg/pixelpit/arcade/${GAME_ID}`;

  const gameRef = useRef({
    lane: 1,
    playerX: LANES[1],
    fishSize: 3,
    targetSize: 3,
    scrollY: 0,
    speed: BASE_SPEED,
    gates: [] as Gate[],
    obstacles: [] as Obstacle[],
    particles: [] as Particle[],
    bubbles: [] as Bubble[],
    seaweeds: [] as Seaweed[],
    score: 0,
    distance: 0,
    lives: 3,
    section: 0,
    screenShake: 0,
    invulnTimer: 0,
    sizeAnimTimer: 0,
    sizeAnimDir: 0, // 1=inflate, -1=deflate
    popupText: '',
    popupTimer: 0,
    lastSectionEndY: 0,
  });

  const inputRef = useRef({
    touchStartX: 0,
    swiping: false,
  });

  // Resize
  useEffect(() => {
    const handleResize = () => {
      const vw = window.innerWidth;
      const vh = window.visualViewport?.height ?? window.innerHeight;
      const maxW = Math.min(vw, 600);
      const maxH = Math.min(vh, 500);
      // Maintain aspect ratio
      const scale = Math.min(maxW / GAME_WIDTH, maxH / GAME_HEIGHT);
      setCanvasSize({ w: Math.floor(GAME_WIDTH * scale), h: Math.floor(GAME_HEIGHT * scale) });
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Load high score
  useEffect(() => {
    const saved = localStorage.getItem('puff_highscore');
    if (saved) setHighScore(parseInt(saved));
  }, []);

  // Group code + logout
  useEffect(() => {
    if (!socialLoaded || typeof window === 'undefined') return;
    if (!(window as any).PixelpitSocial) return;
    const params = new URLSearchParams(window.location.search);
    if (params.has('logout')) {
      (window as any).PixelpitSocial.logout();
      params.delete('logout');
      window.history.replaceState({}, '', params.toString() ? `${window.location.pathname}?${params}` : window.location.pathname);
      window.location.reload();
      return;
    }
    const groupCode = (window as any).PixelpitSocial.getGroupCodeFromUrl();
    if (groupCode) (window as any).PixelpitSocial.storeGroupCode(groupCode);
  }, [socialLoaded]);

  // Analytics
  useEffect(() => {
    if (gameState === 'gameover' && score >= 1) {
      fetch('/api/pixelpit/stats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ game: GAME_ID }),
      }).catch(() => {});
    }
  }, [gameState, score]);

  const spawnBubbles = useCallback((count: number) => {
    const bubbles: Bubble[] = [];
    for (let i = 0; i < count; i++) {
      bubbles.push({
        x: Math.random() * GAME_WIDTH,
        y: GAME_HEIGHT + Math.random() * 200,
        r: 2 + Math.random() * 4,
        speed: 30 + Math.random() * 40,
        wobble: Math.random() * Math.PI * 2,
      });
    }
    return bubbles;
  }, []);

  const spawnSeaweeds = useCallback(() => {
    const sw: Seaweed[] = [];
    for (let i = 0; i < 8; i++) {
      sw.push({
        x: 10 + Math.random() * (GAME_WIDTH - 20),
        segments: 4 + Math.floor(Math.random() * 4),
        phase: Math.random() * Math.PI * 2,
      });
    }
    return sw;
  }, []);

  const startGame = useCallback(() => {
    initAudio();
    startMusic();
    const game = gameRef.current;
    game.lane = 1;
    game.playerX = LANES[1];
    game.fishSize = 3;
    game.targetSize = 3;
    game.scrollY = 0;
    game.speed = BASE_SPEED;
    game.gates = [];
    game.obstacles = [];
    game.particles = [];
    game.bubbles = spawnBubbles(20);
    game.seaweeds = spawnSeaweeds();
    game.score = 0;
    game.distance = 0;
    game.lives = 3;
    game.section = 0;
    game.screenShake = 0;
    game.invulnTimer = 0;
    game.sizeAnimTimer = 0;
    game.popupText = '';
    game.popupTimer = 0;
    game.lastSectionEndY = 0;

    // Generate first 3 sections
    let endY = 0;
    for (let i = 1; i <= 3; i++) {
      const sec = generateSection(i, endY - GAME_HEIGHT * 0.3);
      game.gates.push(...sec.gates);
      game.obstacles.push(...sec.obstacles);
      const allY = [...sec.gates.map(g => g.y), ...sec.obstacles.map(o => o.y)];
      endY = Math.min(...allY);
      game.section = i;
    }
    game.lastSectionEndY = endY;

    setScore(0);
    setSubmittedEntryId(null);
    setProgression(null);
    setShowShareModal(false);
    setGameState('playing');
  }, [spawnBubbles, spawnSeaweeds]);

  const switchLane = useCallback((dir: number) => {
    const game = gameRef.current;
    const newLane = Math.max(0, Math.min(2, game.lane + dir));
    if (newLane !== game.lane) {
      sfxLaneSwitch();
      game.lane = newLane;
    }
  }, []);

  // Game loop
  useEffect(() => {
    if (gameState !== 'playing') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let lastTime = performance.now();

    const scaleX = canvasSize.w / GAME_WIDTH;
    const scaleY = canvasSize.h / GAME_HEIGHT;

    const endGame = () => {
      stopMusic();
      sfxDeath();
      const game = gameRef.current;
      setScore(game.score);
      setGameState('gameover');
      if (game.score > highScore) {
        setHighScore(game.score);
        localStorage.setItem('puff_highscore', game.score.toString());
      }
    };

    const spawnParticles = (x: number, y: number, color: string, count: number) => {
      const game = gameRef.current;
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 40 + Math.random() * 80;
        game.particles.push({
          x, y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 0.4 + Math.random() * 0.3,
          color,
          size: 3 + Math.random() * 5,
        });
      }
    };

    const update = (dt: number) => {
      const game = gameRef.current;

      // Invuln timer
      if (game.invulnTimer > 0) game.invulnTimer -= dt;

      // Size anim
      if (game.sizeAnimTimer > 0) game.sizeAnimTimer -= dt;

      // Popup
      if (game.popupTimer > 0) {
        game.popupTimer -= dt;
        if (game.popupTimer <= 0) game.popupText = '';
      }

      // Screen shake decay
      game.screenShake *= 0.9;
      if (game.screenShake < 0.5) game.screenShake = 0;

      // Scroll upward
      game.scrollY -= game.speed * dt;
      game.distance += game.speed * dt;
      game.score = Math.floor(game.distance / 10);
      setScore(game.score);

      // Move player toward target lane
      const targetX = LANES[game.lane];
      const dx = targetX - game.playerX;
      game.playerX += dx * 12 * dt;

      // Smooth size transitions
      const sizeDiff = game.targetSize - game.fishSize;
      game.fishSize += sizeDiff * 8 * dt;

      // Check gates
      for (const gate of game.gates) {
        if (gate.hit) continue;
        const gateScreenY = gate.y - game.scrollY;
        if (gateScreenY > FISH_Y - 20 && gateScreenY < FISH_Y + 20 && gate.lane === game.lane) {
          gate.hit = true;
          if (gate.type === 'double') {
            game.targetSize = Math.min(10, game.targetSize * 2);
            sfxInflate();
            game.sizeAnimTimer = 0.3;
            game.sizeAnimDir = 1;
            spawnParticles(game.playerX, FISH_Y, THEME.double, 8);
            game.popupText = '×2!';
            game.popupTimer = 0.5;
          } else if (gate.type === 'inflate') {
            game.targetSize = Math.min(10, game.targetSize + gate.value);
            sfxInflate();
            game.sizeAnimTimer = 0.3;
            game.sizeAnimDir = 1;
            spawnParticles(game.playerX, FISH_Y, THEME.inflate, 6);
            game.popupText = `+${gate.value}`;
            game.popupTimer = 0.4;
          } else {
            game.targetSize = Math.max(1, game.targetSize + gate.value);
            sfxDeflate();
            game.sizeAnimTimer = 0.3;
            game.sizeAnimDir = -1;
            spawnParticles(game.playerX, FISH_Y, THEME.deflate, 6);
            game.popupText = `${gate.value}`;
            game.popupTimer = 0.4;
          }
        }
      }

      // Check obstacles
      for (const obs of game.obstacles) {
        if (obs.hit || obs.passed) continue;
        const obsScreenY = obs.y - game.scrollY;
        if (obsScreenY > FISH_Y - 25 && obsScreenY < FISH_Y + 25) {
          const currentSize = Math.round(game.fishSize);
          if (obs.type === 'wall') {
            if (currentSize >= obs.sizeReq) {
              // Smash through!
              obs.passed = true;
              sfxSmash();
              game.screenShake = 12;
              game.score += 50 * obs.sizeReq;
              setScore(game.score);
              spawnParticles(game.playerX, FISH_Y, THEME.wall, 15);
              game.popupText = 'SMASH!';
              game.popupTimer = 0.6;
            } else {
              // Bounce off
              obs.hit = true;
              sfxBonk();
              game.screenShake = 15;
              game.lives--;
              game.invulnTimer = 1.5;
              spawnParticles(game.playerX, FISH_Y, '#ff0000', 10);
              game.popupText = 'TOO SMALL!';
              game.popupTimer = 0.8;
              if (game.lives <= 0) { endGame(); return; }
            }
          } else {
            // Gap
            if (currentSize <= obs.sizeReq) {
              // Squeeze through!
              obs.passed = true;
              sfxSqueeze();
              game.score += 50 * (obs.sizeReq + 1);
              setScore(game.score);
              spawnParticles(game.playerX, FISH_Y, THEME.gap, 12);
              game.popupText = 'SQUEEZE!';
              game.popupTimer = 0.6;
            } else {
              // Stuck
              obs.hit = true;
              sfxBonk();
              game.screenShake = 15;
              game.lives--;
              game.invulnTimer = 1.5;
              spawnParticles(game.playerX, FISH_Y, '#ff0000', 10);
              game.popupText = 'TOO BIG!';
              game.popupTimer = 0.8;
              if (game.lives <= 0) { endGame(); return; }
            }
          }
        }
      }

      // Generate more sections as needed
      const lookAhead = game.scrollY - GAME_HEIGHT * 2;
      if (game.lastSectionEndY > lookAhead) {
        game.section++;
        // Speed increase per section
        game.speed = BASE_SPEED * Math.pow(1.1, Math.floor((game.section - 1) / 3));
        const sec = generateSection(game.section, game.lastSectionEndY - GAME_HEIGHT * 0.3);
        game.gates.push(...sec.gates);
        game.obstacles.push(...sec.obstacles);
        const allY = [...sec.gates.map(g => g.y), ...sec.obstacles.map(o => o.y)];
        game.lastSectionEndY = Math.min(...allY);
      }

      // Cleanup off-screen elements
      const bottomY = game.scrollY + GAME_HEIGHT + 200;
      game.gates = game.gates.filter(g => g.y - game.scrollY < GAME_HEIGHT + 100);
      game.obstacles = game.obstacles.filter(o => o.y - game.scrollY < GAME_HEIGHT + 100);

      // Update particles
      game.particles = game.particles.filter(p => {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 100 * dt;
        p.life -= dt;
        return p.life > 0;
      });

      // Update bubbles
      for (const b of game.bubbles) {
        b.y -= b.speed * dt;
        b.x += Math.sin(performance.now() / 1000 + b.wobble) * 0.5;
        if (b.y < -20) {
          b.y = GAME_HEIGHT + 20;
          b.x = Math.random() * GAME_WIDTH;
        }
      }
    };

    const drawFish = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number, t: number, invuln: boolean, animTimer: number, animDir: number) => {
      const s = 12 + (size - 1) * 3.5; // Visual radius: 12 to 43.5
      const spikiness = Math.min(1, (size - 1) / 6); // 0=smooth, 1=spiky
      const puffAnim = animTimer > 0 ? Math.sin(animTimer * 20) * 0.15 * animDir : 0;
      const breathe = Math.sin(t * 3) * 0.03;
      const scale = 1 + puffAnim + breathe;

      if (invuln && Math.sin(t * 16) < 0) return; // Blink when invulnerable

      ctx.save();
      ctx.translate(x, y);
      ctx.scale(scale, scale);

      // Body — round puffer fish
      ctx.fillStyle = THEME.fish;
      ctx.beginPath();
      ctx.ellipse(0, 0, s, s * 0.85, 0, 0, Math.PI * 2);
      ctx.fill();

      // Belly (lighter)
      ctx.fillStyle = '#fde68a';
      ctx.beginPath();
      ctx.ellipse(0, s * 0.15, s * 0.65, s * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Spikes (more when bigger)
      if (spikiness > 0.1) {
        ctx.fillStyle = '#f59e0b';
        const spikeCount = Math.floor(8 + spikiness * 8);
        for (let i = 0; i < spikeCount; i++) {
          const angle = (i / spikeCount) * Math.PI * 2;
          const spikeLen = s * 0.2 * spikiness + Math.sin(t * 5 + i) * 2;
          const sx = Math.cos(angle) * s;
          const sy = Math.sin(angle) * s * 0.85;
          ctx.beginPath();
          ctx.moveTo(sx, sy);
          ctx.lineTo(
            Math.cos(angle) * (s + spikeLen),
            Math.sin(angle) * (s * 0.85 + spikeLen)
          );
          ctx.lineTo(
            Math.cos(angle + 0.15) * s,
            Math.sin(angle + 0.15) * s * 0.85
          );
          ctx.fill();
        }
      }

      // Eyes
      const eyeSpread = s * 0.35;
      const eyeY = -s * 0.15;
      const eyeR = Math.max(3, s * 0.18);
      const pupilR = eyeR * 0.55;

      // Eye whites
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(-eyeSpread, eyeY, eyeR, 0, Math.PI * 2);
      ctx.arc(eyeSpread, eyeY, eyeR, 0, Math.PI * 2);
      ctx.fill();

      // Pupils — bigger when bigger (cute wide eyes), smaller when small (sad)
      const pupilScale = size >= 5 ? 1.1 : size <= 2 ? 0.7 : 1;
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.arc(-eyeSpread, eyeY, pupilR * pupilScale, 0, Math.PI * 2);
      ctx.arc(eyeSpread, eyeY, pupilR * pupilScale, 0, Math.PI * 2);
      ctx.fill();

      // Eye highlights
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(-eyeSpread - pupilR * 0.3, eyeY - pupilR * 0.3, pupilR * 0.3, 0, Math.PI * 2);
      ctx.arc(eyeSpread - pupilR * 0.3, eyeY - pupilR * 0.3, pupilR * 0.3, 0, Math.PI * 2);
      ctx.fill();

      // Mouth
      if (size <= 2) {
        // Sad frown
        ctx.strokeStyle = '#92400e';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(0, s * 0.15, s * 0.15, Math.PI * 0.2, Math.PI * 0.8);
        ctx.stroke();
      } else if (size >= 7) {
        // Big happy O mouth
        ctx.fillStyle = '#92400e';
        ctx.beginPath();
        ctx.ellipse(0, s * 0.08, s * 0.12, s * 0.1, 0, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Normal smile
        ctx.strokeStyle = '#92400e';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(0, -s * 0.02, s * 0.15, Math.PI * 0.2, Math.PI * 0.8);
        ctx.stroke();
      }

      // Cheek blush
      if (size >= 4) {
        ctx.fillStyle = 'rgba(251, 146, 60, 0.3)';
        ctx.beginPath();
        ctx.ellipse(-eyeSpread - 2, eyeY + eyeR + 2, eyeR * 0.6, eyeR * 0.3, 0, 0, Math.PI * 2);
        ctx.ellipse(eyeSpread + 2, eyeY + eyeR + 2, eyeR * 0.6, eyeR * 0.3, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      // Tail fin
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.moveTo(0, s * 0.7);
      ctx.lineTo(-s * 0.35, s * 1.1 + Math.sin(t * 8) * 3);
      ctx.lineTo(s * 0.35, s * 1.1 + Math.sin(t * 8 + 1) * 3);
      ctx.closePath();
      ctx.fill();

      // Side fins
      const finFlap = Math.sin(t * 6) * 0.3;
      ctx.fillStyle = '#f59e0baa';
      // Left fin
      ctx.beginPath();
      ctx.moveTo(-s * 0.8, 0);
      ctx.lineTo(-s * 1.1 - Math.cos(finFlap) * 5, -s * 0.15);
      ctx.lineTo(-s * 0.8, s * 0.2);
      ctx.closePath();
      ctx.fill();
      // Right fin
      ctx.beginPath();
      ctx.moveTo(s * 0.8, 0);
      ctx.lineTo(s * 1.1 + Math.cos(finFlap) * 5, -s * 0.15);
      ctx.lineTo(s * 0.8, s * 0.2);
      ctx.closePath();
      ctx.fill();

      ctx.restore();
    };

    const draw = () => {
      const now = performance.now();
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;
      update(dt);

      const game = gameRef.current;
      const t = now / 1000;

      const shakeX = (Math.random() - 0.5) * game.screenShake;
      const shakeY = (Math.random() - 0.5) * game.screenShake;

      ctx.save();
      ctx.scale(scaleX, scaleY);
      ctx.translate(shakeX, shakeY);

      // Background — ocean gradient
      const bgGrad = ctx.createLinearGradient(0, 0, 0, GAME_HEIGHT);
      bgGrad.addColorStop(0, '#0369a1');
      bgGrad.addColorStop(0.5, THEME.bg);
      bgGrad.addColorStop(1, THEME.surface);
      ctx.fillStyle = bgGrad;
      ctx.fillRect(-10, -10, GAME_WIDTH + 20, GAME_HEIGHT + 20);

      // Light rays from top
      ctx.globalAlpha = 0.06;
      for (let i = 0; i < 5; i++) {
        const rx = 40 + i * 80 + Math.sin(t * 0.3 + i) * 20;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(rx - 15, 0);
        ctx.lineTo(rx + 15, 0);
        ctx.lineTo(rx + 40 + i * 10, GAME_HEIGHT);
        ctx.lineTo(rx - 40 - i * 10, GAME_HEIGHT);
        ctx.closePath();
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // Sandy bottom
      ctx.fillStyle = THEME.sand;
      ctx.fillRect(0, GAME_HEIGHT - 30, GAME_WIDTH, 30);
      // Sand bumps
      ctx.fillStyle = '#fcd34d';
      for (let i = 0; i < 10; i++) {
        const bx = i * 45 + 10;
        ctx.beginPath();
        ctx.ellipse(bx, GAME_HEIGHT - 28, 15 + Math.sin(i) * 5, 6, 0, Math.PI, Math.PI * 2);
        ctx.fill();
      }

      // Seaweed
      ctx.strokeStyle = '#16a34a';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      for (const sw of game.seaweeds) {
        let sx = sw.x;
        let sy = GAME_HEIGHT - 28;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        for (let seg = 0; seg < sw.segments; seg++) {
          sy -= 12;
          sx += Math.sin(t * 1.5 + sw.phase + seg * 0.5) * 6;
          ctx.lineTo(sx, sy);
        }
        ctx.stroke();
      }

      // Coral decorations at bottom
      ctx.fillStyle = THEME.coral;
      ctx.globalAlpha = 0.5;
      for (let i = 0; i < 6; i++) {
        const cx = i * 70 + 30;
        ctx.beginPath();
        ctx.arc(cx, GAME_HEIGHT - 32, 8 + Math.sin(i * 2) * 3, Math.PI, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // Bubbles (ambient)
      for (const b of game.bubbles) {
        ctx.strokeStyle = 'rgba(255,255,255,0.25)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.stroke();
        // Highlight
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        ctx.beginPath();
        ctx.arc(b.x - b.r * 0.3, b.y - b.r * 0.3, b.r * 0.3, 0, Math.PI * 2);
        ctx.fill();
      }

      // Lane dividers (subtle)
      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.lineWidth = 1;
      ctx.setLineDash([8, 12]);
      for (let i = 1; i < LANE_COUNT; i++) {
        ctx.beginPath();
        ctx.moveTo(i * LANE_WIDTH, 0);
        ctx.lineTo(i * LANE_WIDTH, GAME_HEIGHT);
        ctx.stroke();
      }
      ctx.setLineDash([]);

      // Draw gates
      for (const gate of game.gates) {
        if (gate.hit) continue;
        const gy = gate.y - game.scrollY;
        if (gy < -60 || gy > GAME_HEIGHT + 60) continue;
        const gx = LANES[gate.lane];
        const gw = LANE_WIDTH * 0.7;
        const gh = 36;

        let color: string;
        let label: string;
        if (gate.type === 'inflate') {
          color = THEME.inflate;
          label = `+${gate.value}`;
        } else if (gate.type === 'deflate') {
          color = THEME.deflate;
          label = `${gate.value}`;
        } else {
          color = THEME.double;
          label = '×2';
        }

        // Gate background
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.85;
        const cornerR = 8;
        ctx.beginPath();
        ctx.roundRect(gx - gw / 2, gy - gh / 2, gw, gh, cornerR);
        ctx.fill();
        ctx.globalAlpha = 1;

        // Gate border
        ctx.strokeStyle = '#ffffff44';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(gx - gw / 2, gy - gh / 2, gw, gh, cornerR);
        ctx.stroke();

        // Gate text
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 18px ui-monospace, monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, gx, gy);

        // Icon
        if (gate.type === 'inflate') {
          // Up arrow
          ctx.fillStyle = '#ffffffaa';
          ctx.beginPath();
          ctx.moveTo(gx - gw / 2 + 10, gy + 4);
          ctx.lineTo(gx - gw / 2 + 16, gy - 6);
          ctx.lineTo(gx - gw / 2 + 22, gy + 4);
          ctx.closePath();
          ctx.fill();
        } else if (gate.type === 'deflate') {
          // Down arrow
          ctx.fillStyle = '#ffffffaa';
          ctx.beginPath();
          ctx.moveTo(gx + gw / 2 - 22, gy - 4);
          ctx.lineTo(gx + gw / 2 - 16, gy + 6);
          ctx.lineTo(gx + gw / 2 - 10, gy - 4);
          ctx.closePath();
          ctx.fill();
        } else {
          // Star
          ctx.fillStyle = '#ffffffaa';
          const starX = gx - gw / 2 + 16;
          ctx.beginPath();
          for (let i = 0; i < 5; i++) {
            const a = (i * Math.PI * 2) / 5 - Math.PI / 2;
            const r = i % 2 === 0 ? 7 : 3;
            ctx.lineTo(starX + Math.cos(a) * r, gy + Math.sin(a) * r);
          }
          ctx.closePath();
          ctx.fill();
        }
      }

      // Draw obstacles
      for (const obs of game.obstacles) {
        if (obs.hit || obs.passed) continue;
        const oy = obs.y - game.scrollY;
        if (oy < -80 || oy > GAME_HEIGHT + 80) continue;

        if (obs.type === 'wall') {
          // Barnacle wall — spans all 3 lanes
          ctx.fillStyle = THEME.wall;
          ctx.fillRect(10, oy - 25, GAME_WIDTH - 20, 50);

          // Stone texture
          ctx.fillStyle = '#57534e';
          for (let i = 0; i < 8; i++) {
            const bx = 20 + i * 48;
            ctx.fillRect(bx, oy - 20, 30, 15);
          }
          ctx.fillStyle = '#44403c';
          for (let i = 0; i < 6; i++) {
            const bx = 40 + i * 55;
            ctx.fillRect(bx, oy, 25, 12);
          }

          // Barnacles
          ctx.fillStyle = '#a8a29e';
          for (let i = 0; i < 5; i++) {
            ctx.beginPath();
            ctx.arc(30 + i * 85, oy - 15, 4, Math.PI, Math.PI * 2);
            ctx.fill();
          }

          // Size number
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 28px ui-monospace, monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(`${obs.sizeReq}`, GAME_WIDTH / 2, oy);

          // Label
          ctx.font = '10px ui-monospace, monospace';
          ctx.fillStyle = '#ffffffaa';
          ctx.fillText('SMASH ≥', GAME_WIDTH / 2, oy - 18);
        } else {
          // Coral gap — coral walls on sides with a gap sized by sizeReq
          const gapWidth = 20 + obs.sizeReq * 8;
          const cx = GAME_WIDTH / 2;

          // Left coral
          ctx.fillStyle = THEME.coral;
          ctx.fillRect(10, oy - 25, cx - gapWidth / 2 - 10, 50);
          // Right coral
          ctx.fillRect(cx + gapWidth / 2, oy - 25, GAME_WIDTH - cx - gapWidth / 2 - 10, 50);

          // Gap highlight
          ctx.fillStyle = THEME.gap + '44';
          ctx.fillRect(cx - gapWidth / 2, oy - 25, gapWidth, 50);

          // Size number in the gap
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 28px ui-monospace, monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(`${obs.sizeReq}`, cx, oy);

          // Label
          ctx.font = '10px ui-monospace, monospace';
          ctx.fillStyle = '#ffffffaa';
          ctx.fillText('SQUEEZE ≤', cx, oy - 18);
        }
      }

      // Particles
      for (const p of game.particles) {
        ctx.globalAlpha = Math.min(1, p.life * 3);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * Math.min(1, p.life * 2), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // Draw fish
      drawFish(ctx, game.playerX, FISH_Y, game.fishSize, t,
        game.invulnTimer > 0, game.sizeAnimTimer, game.sizeAnimDir);

      // Size indicator next to fish
      const sizeStr = Math.round(game.fishSize).toString();
      ctx.fillStyle = '#ffffffcc';
      ctx.font = 'bold 16px ui-monospace, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(sizeStr, game.playerX, FISH_Y - 30 - (game.fishSize - 1) * 3);

      // HUD
      ctx.textBaseline = 'top';
      // Score center
      ctx.fillStyle = THEME.text;
      ctx.font = 'bold 24px ui-monospace, monospace';
      ctx.textAlign = 'center';
      ctx.fillText(game.score.toLocaleString(), GAME_WIDTH / 2, 12);

      // Lives — hearts
      for (let i = 0; i < 3; i++) {
        ctx.fillStyle = i < game.lives ? '#ef4444' : '#ffffff30';
        ctx.font = '18px serif';
        ctx.textAlign = 'left';
        ctx.fillText('♥', 12 + i * 22, 14);
      }

      // Size bar — right side
      const barX = GAME_WIDTH - 30;
      const barH = 80;
      const barY = 12;
      ctx.fillStyle = '#ffffff20';
      ctx.fillRect(barX, barY, 16, barH);
      const fillH = (game.fishSize / 10) * barH;
      const sizeColor = game.fishSize >= 7 ? THEME.inflate : game.fishSize <= 2 ? THEME.deflate : THEME.fish;
      ctx.fillStyle = sizeColor;
      ctx.fillRect(barX, barY + barH - fillH, 16, fillH);
      ctx.strokeStyle = '#ffffff44';
      ctx.lineWidth = 1;
      ctx.strokeRect(barX, barY, 16, barH);

      // Popup text
      if (game.popupText && game.popupTimer > 0) {
        const popAlpha = Math.min(1, game.popupTimer * 3);
        ctx.save();
        ctx.globalAlpha = popAlpha;
        ctx.font = 'bold 32px ui-monospace, monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#ffffff';
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#000000';
        ctx.fillText(game.popupText, GAME_WIDTH / 2, FISH_Y - 60 - (1 - game.popupTimer) * 30);
        ctx.shadowBlur = 0;
        ctx.restore();
      }

      ctx.restore();

      animationId = requestAnimationFrame(draw);
    };

    draw();

    // Controls
    let isTouchDevice = false;
    const handleTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      isTouchDevice = true;
      inputRef.current.touchStartX = e.touches[0].clientX;
      inputRef.current.swiping = true;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!inputRef.current.swiping) return;
      const dx = e.touches[0].clientX - inputRef.current.touchStartX;
      if (Math.abs(dx) > 30) {
        switchLane(dx > 0 ? 1 : -1);
        inputRef.current.touchStartX = e.touches[0].clientX;
      }
    };

    const handleTouchEnd = () => {
      if (!inputRef.current.swiping) return;
      inputRef.current.swiping = false;
    };

    // Tap fallback
    const handleClick = (e: MouseEvent) => {
      if (isTouchDevice) return;
      const rect = canvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const mid = rect.width / 2;
      switchLane(clickX > mid ? 1 : -1);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'a') switchLane(-1);
      if (e.key === 'ArrowRight' || e.key === 'd') switchLane(1);
    };

    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd);
    canvas.addEventListener('click', handleClick);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      cancelAnimationFrame(animationId);
      stopMusic();
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchmove', handleTouchMove);
      canvas.removeEventListener('touchend', handleTouchEnd);
      canvas.removeEventListener('click', handleClick);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [gameState, canvasSize, switchLane, highScore]);

  return (
    <>
      <Script src="/pixelpit/social.js" onLoad={() => setSocialLoaded(true)} />

      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: THEME.surface,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'ui-monospace, monospace',
          WebkitUserSelect: 'none',
          userSelect: 'none',
          WebkitTouchCallout: 'none',
          WebkitTapHighlightColor: 'transparent',
        } as React.CSSProperties}
      >
        {gameState === 'menu' && (
          <div style={{ textAlign: 'center', padding: 30, maxWidth: 360 }}>
            <div style={{ fontSize: 64, marginBottom: 8 }}>🐡</div>
            <h1 style={{
              color: THEME.text,
              fontSize: 56,
              margin: '0 0 6px',
              fontWeight: 900,
              letterSpacing: '8px',
            }}>
              PUFF
            </h1>
            <div style={{
              width: 40, height: 2,
              background: THEME.fish,
              margin: '0 auto 28px',
            }} />
            <p style={{
              color: '#bae6fd',
              fontSize: 11,
              marginBottom: 36,
              lineHeight: 2.2,
              letterSpacing: '3px',
              textTransform: 'uppercase',
            }}>
              INFLATE THROUGH WALLS<br />
              DEFLATE THROUGH GAPS<br />
              <span style={{ color: THEME.fish }}>SIZE MATTERS</span>
            </p>
            {highScore > 0 && (
              <p style={{ color: '#7dd3fc', fontSize: 12, marginBottom: 24 }}>
                BEST: {highScore}
              </p>
            )}
            <button
              onClick={startGame}
              style={{
                background: 'transparent',
                color: THEME.text,
                border: `2px solid ${THEME.fish}`,
                padding: '14px 56px',
                fontSize: 14,
                fontWeight: 700,
                letterSpacing: '6px',
                borderRadius: 12,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = THEME.fish;
                e.currentTarget.style.color = THEME.surface;
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = THEME.text;
              }}
            >
              SWIM
            </button>
            <button
              onClick={() => setGameState('leaderboard')}
              style={{
                display: 'block',
                margin: '24px auto 0',
                background: 'transparent',
                color: '#7dd3fc',
                border: 'none',
                padding: '8px 16px',
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '3px',
                cursor: 'pointer',
              }}
            >
              LEADERBOARD
            </button>
          </div>
        )}

        {gameState === 'playing' && (
          <canvas
            ref={canvasRef}
            width={canvasSize.w}
            height={canvasSize.h}
            style={{ touchAction: 'none' }}
          />
        )}

        {gameState === 'gameover' && (
          <div style={{
            textAlign: 'center',
            padding: 20,
            maxWidth: 360,
            overflowY: 'auto',
            maxHeight: '100vh',
          }}>
            <div style={{ fontSize: 48, marginBottom: 8 }}>🐡</div>
            <h1 style={{
              color: THEME.deflate,
              fontSize: 14,
              margin: '0 0 16px',
              fontWeight: 700,
              letterSpacing: '6px',
            }}>
              POPPED
            </h1>
            <div style={{
              color: THEME.text,
              fontSize: 64,
              fontWeight: 900,
              marginBottom: 4,
              letterSpacing: '2px',
            }}>
              {score}
            </div>
            {score >= highScore && highScore > 0 && (
              <p style={{
                color: THEME.fish,
                fontSize: 11,
                letterSpacing: '4px',
                marginBottom: 4,
              }}>
                NEW BEST
              </p>
            )}
            <p style={{
              color: '#7dd3fc',
              fontSize: 11,
              marginBottom: 16,
              letterSpacing: '2px',
            }}>
              BEST {highScore}
            </p>

            <div style={{ width: '100%', maxWidth: 350, margin: '0 auto' }}>
              <ScoreFlow
                score={score}
                gameId={GAME_ID}
                maxScore={500}
                colors={SCORE_FLOW_COLORS}
                onRankReceived={(rank, entryId) => setSubmittedEntryId(entryId ?? null)}
                onProgression={(prog) => setProgression(prog)}
              />
            </div>

            {progression && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 8 }}>
                <div style={{ color: THEME.fish, fontSize: 13, fontWeight: 700 }}>+{progression.xpEarned} XP</div>
                <div style={{ color: '#7dd3fc', fontSize: 12 }}>Level {progression.level}</div>
                {progression.streak > 1 && (
                  <div style={{ color: THEME.inflate, fontSize: 12 }}>{progression.multiplier}x streak</div>
                )}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 12 }}>
              <button
                onClick={() => setGameState('leaderboard')}
                style={{
                  background: 'transparent',
                  color: '#7dd3fc',
                  border: `1px solid #7dd3fc44`,
                  padding: '10px 16px',
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: '2px',
                  borderRadius: 8,
                  cursor: 'pointer',
                }}
              >
                RANKS
              </button>
              {user ? (
                <button
                  onClick={() => setShowShareModal(true)}
                  style={{
                    background: 'transparent',
                    color: '#7dd3fc',
                    border: `1px solid #7dd3fc44`,
                    padding: '10px 16px',
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: '2px',
                    borderRadius: 8,
                    cursor: 'pointer',
                  }}
                >
                  SHARE / GROUPS
                </button>
              ) : (
                <ShareButtonContainer
                  id="share-btn-puff"
                  url={`${GAME_URL}/share/${score}`}
                  text={`I scored ${score} on PUFF! 🐡 Can you size up?`}
                  style="minimal"
                  socialLoaded={socialLoaded}
                />
              )}
            </div>

            <button
              onClick={startGame}
              style={{
                marginTop: 12,
                background: 'transparent',
                color: THEME.text,
                border: `2px solid ${THEME.fish}`,
                padding: '14px 44px',
                fontSize: 14,
                fontWeight: 700,
                letterSpacing: '6px',
                borderRadius: 12,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = THEME.fish;
                e.currentTarget.style.color = THEME.surface;
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = THEME.text;
              }}
            >
              AGAIN
            </button>
          </div>
        )}

        {gameState === 'leaderboard' && (
          <Leaderboard
            gameId={GAME_ID}
            limit={10}
            entryId={submittedEntryId ?? undefined}
            colors={LEADERBOARD_COLORS}
            onClose={() => setGameState(score > 0 ? 'gameover' : 'menu')}
            groupsEnabled={true}
            gameUrl={GAME_URL}
            socialLoaded={socialLoaded}
          />
        )}

        {showShareModal && user && (
          <ShareModal
            gameUrl={GAME_URL}
            score={score}
            colors={LEADERBOARD_COLORS}
            onClose={() => setShowShareModal(false)}
          />
        )}
      </div>
    </>
  );
}
