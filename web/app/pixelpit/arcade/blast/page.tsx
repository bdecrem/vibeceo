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

const GAME_ID = 'blast';

// INDIE BITE theme - Neon arcade
const THEME = {
  bg: '#09090b',
  surface: '#18181b',
  slime: '#22d3ee',     // Cyan player
  goo: '#67e8f9',       // Lighter cyan for projectiles
  triangle: '#f472b6',  // Pink
  square: '#a78bfa',    // Purple
  hexagon: '#facc15',   // Yellow
  boss: '#ef4444',      // Red
  text: '#ffffff',
};

// Shape sizes
const SIZE = {
  big: 32,      // Loop spec
  medium: 20,   // Loop spec
  small: 12,    // Loop spec
};

// Physics (Loop spec v2)
const PLAYER_SPEED = 400;
const GOO_SPEED = 750;       // Fast projectiles (was 500)
const BASE_ENEMY_SPEED = 60; // Loop spec: 60px/sec base
const DESCENT_STEP = 12;     // Gradual descent like classic Space Invaders
const DESCENT_PAUSE = 200;   // Loop spec: 200ms pause on step-down
const MAX_BULLETS = 5;       // Steady stream, no burst gaps (was 3)
const MAX_SHAPES = 20;       // Loop spec: cap to prevent chaos
const ENEMY_FIRE_INTERVAL = 2; // seconds, hexagons only
// Shape behavior:
// - Triangle (pink): fodder — 1 HP, standard. Easy combo fuel.
// - Square (purple): armored — big squares take 2 hits before splitting.
// - Hexagon (yellow): shooter — only shape that fires back at the player.
const SPEED_MULT_PER_KILL = 1.02; // Loop spec: 2% faster per kill
const SPEED_CAP = 3.0;       // Loop spec: max 3x speed

type ShapeType = 'triangle' | 'square' | 'hexagon';
type ShapeSize = 'big' | 'medium' | 'small';

interface Shape {
  id: number;
  x: number;
  y: number;
  type: ShapeType;
  size: ShapeSize;
  rotation: number;
  rotationSpeed: number;
  hp: number;
}

interface Goo {
  x: number;
  y: number;
  vy: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  size: number;
}

interface Boss {
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  phase: number;
  attackTimer: number;
}

// Social colors
const SCORE_FLOW_COLORS: ScoreFlowColors = {
  bg: THEME.bg,
  surface: THEME.surface,
  primary: THEME.slime,
  secondary: THEME.triangle,
  text: THEME.text,
  muted: '#71717a',
  error: '#ef4444',
};

const LEADERBOARD_COLORS: LeaderboardColors = {
  bg: THEME.bg,
  surface: THEME.surface,
  primary: THEME.slime,
  secondary: THEME.triangle,
  text: THEME.text,
  muted: '#71717a',
};

// ── AUDIO ENGINE ──────────────────────────────────────────
// Two-tier gain: sfxGain for effects, musicGain for soundtrack
// Both route through masterGain for global volume control.
// iOS: resume() called on init AND on startMusic for gesture unlock.

let audioCtx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let sfxGain: GainNode | null = null;
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
  sfxGain = audioCtx.createGain();
  sfxGain.gain.value = 0.5;
  sfxGain.connect(masterGain);
  musicGain = audioCtx.createGain();
  musicGain.gain.value = 0.6;
  musicGain.connect(masterGain);
  if (audioCtx.state === 'suspended') audioCtx.resume();
}

// ── MUSIC: Dark Minimal Step Sequencer ───────────────────
// 108 BPM, Am key. Sparse kick, metallic hats, deep sub, filtered arp.
const MUSIC = {
  bpm: 108,
  // 16-step patterns. 0 = silence, number = freq (Hz) or 1 = trigger.
  kick: [1,0,0,0, 0,0,1,0, 1,0,0,0, 0,0,0,0],
  hat:  [0,0,1,0, 0,0,1,1, 0,0,1,0, 0,1,1,0],
  bass: [55,0,55,0, 0,55,0,0, 52,0,52,0, 0,0,49,0],
  arp:  [220,0,330,0, 262,0,0,196, 220,0,294,0, 262,0,0,0],
};

function musicKick() {
  if (!audioCtx || !musicGain) return;
  const t = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain); gain.connect(musicGain);
  osc.type = 'sine';
  osc.frequency.setValueAtTime(75, t);
  osc.frequency.exponentialRampToValueAtTime(28, t + 0.18);
  gain.gain.setValueAtTime(0.3, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
  osc.start(t); osc.stop(t + 0.3);
}

function musicHat() {
  if (!audioCtx || !musicGain) return;
  const bufLen = audioCtx.sampleRate * 0.025;
  const buf = audioCtx.createBuffer(1, bufLen, audioCtx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < bufLen; i++) d[i] = Math.random() * 2 - 1;
  const src = audioCtx.createBufferSource();
  src.buffer = buf;
  const hp = audioCtx.createBiquadFilter();
  hp.type = 'highpass'; hp.frequency.value = 9000;
  const lp = audioCtx.createBiquadFilter();
  lp.type = 'lowpass'; lp.frequency.value = 12000;
  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(0.04, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.035);
  src.connect(hp); hp.connect(lp); lp.connect(gain); gain.connect(musicGain);
  src.start();
}

function musicBass(freq: number) {
  if (!audioCtx || !musicGain || freq === 0) return;
  const t = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const flt = audioCtx.createBiquadFilter();
  const gain = audioCtx.createGain();
  osc.connect(flt); flt.connect(gain); gain.connect(musicGain);
  osc.type = 'sine';
  osc.frequency.value = freq;
  flt.type = 'lowpass'; flt.frequency.value = 140;
  gain.gain.setValueAtTime(0.25, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
  osc.start(t); osc.stop(t + 0.22);
}

function musicArp(freq: number) {
  if (!audioCtx || !musicGain || freq === 0) return;
  const t = audioCtx.currentTime;
  // Two detuned square waves for width
  for (const detune of [-6, 6]) {
    const osc = audioCtx.createOscillator();
    const flt = audioCtx.createBiquadFilter();
    const gain = audioCtx.createGain();
    osc.connect(flt); flt.connect(gain); gain.connect(musicGain);
    osc.type = 'square';
    osc.frequency.value = freq;
    osc.detune.value = detune;
    flt.type = 'lowpass';
    flt.frequency.setValueAtTime(1800, t);
    flt.frequency.exponentialRampToValueAtTime(400, t + 0.12);
    flt.Q.value = 3;
    gain.gain.setValueAtTime(0.04, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
    osc.start(t); osc.stop(t + 0.16);
  }
}

function musicTick() {
  if (!audioCtx || !musicPlaying) return;
  const s = musicStep % 16;
  if (MUSIC.kick[s]) musicKick();
  if (MUSIC.hat[s]) musicHat();
  if (musicStep % 2 === 0) musicBass(MUSIC.bass[(musicStep / 2) % 16]);
  musicArp(MUSIC.arp[s]);
  musicStep++;
}

function startMusic() {
  if (musicPlaying) return;
  initAudio();
  if (audioCtx?.state === 'suspended') audioCtx.resume();
  musicPlaying = true;
  musicStep = 0;
  const stepTime = (60 / MUSIC.bpm) * 1000 / 4; // 16th notes
  musicInterval = setInterval(musicTick, stepTime);
}

function stopMusic() {
  musicPlaying = false;
  if (musicInterval) { clearInterval(musicInterval); musicInterval = null; }
}

// ── SOUND EFFECTS ────────────────────────────────────────

function playShoot() {
  if (!audioCtx || !sfxGain) return;
  const t = audioCtx.currentTime;
  // Laser: filtered saw sweep down
  const osc = audioCtx.createOscillator();
  const flt = audioCtx.createBiquadFilter();
  const gain = audioCtx.createGain();
  osc.connect(flt); flt.connect(gain); gain.connect(sfxGain);
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(900, t);
  osc.frequency.exponentialRampToValueAtTime(200, t + 0.08);
  flt.type = 'lowpass'; flt.frequency.value = 2000;
  gain.gain.setValueAtTime(0.12, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
  osc.start(t); osc.stop(t + 0.1);
}

function playHit(big = false) {
  if (!audioCtx || !sfxGain) return;
  const t = audioCtx.currentTime;
  // Crunch: noise burst + pitch thud
  const bufLen = audioCtx.sampleRate * 0.06;
  const buf = audioCtx.createBuffer(1, bufLen, audioCtx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < bufLen; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / bufLen);
  const src = audioCtx.createBufferSource();
  src.buffer = buf;
  const flt = audioCtx.createBiquadFilter();
  flt.type = 'lowpass'; flt.frequency.value = big ? 800 : 2000;
  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(big ? 0.15 : 0.08, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
  src.connect(flt); flt.connect(gain); gain.connect(sfxGain);
  src.start();
  // Sub thud on big hits
  if (big) {
    const sub = audioCtx.createOscillator();
    const subG = audioCtx.createGain();
    sub.connect(subG); subG.connect(sfxGain);
    sub.type = 'sine'; sub.frequency.value = 55;
    subG.gain.setValueAtTime(0.15, t);
    subG.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    sub.start(t); sub.stop(t + 0.18);
  }
}

function playDeath() {
  if (!audioCtx || !sfxGain) return;
  const t = audioCtx.currentTime;
  // Sweep down + noise wash
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain); gain.connect(sfxGain);
  osc.type = 'sine';
  osc.frequency.setValueAtTime(500, t);
  osc.frequency.exponentialRampToValueAtTime(40, t + 0.7);
  gain.gain.setValueAtTime(0.2, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.7);
  osc.start(t); osc.stop(t + 0.7);
  // Noise wash (darkening filter sweep)
  const bufLen = audioCtx.sampleRate * 0.5;
  const buf = audioCtx.createBuffer(1, bufLen, audioCtx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < bufLen; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / bufLen) * 0.5;
  const src = audioCtx.createBufferSource();
  src.buffer = buf;
  const flt = audioCtx.createBiquadFilter();
  flt.type = 'lowpass';
  flt.frequency.setValueAtTime(3000, t);
  flt.frequency.exponentialRampToValueAtTime(150, t + 0.5);
  const nG = audioCtx.createGain();
  nG.gain.setValueAtTime(0.1, t);
  nG.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
  src.connect(flt); flt.connect(nG); nG.connect(sfxGain);
  src.start();
}

function playWaveClear() {
  if (!audioCtx || !sfxGain) return;
  const t = audioCtx.currentTime;
  // Rising filtered arp: Am → C → E → A (minor triad + octave)
  [440, 523.25, 659.25, 880].forEach((freq, i) => {
    const osc = audioCtx!.createOscillator();
    const flt = audioCtx!.createBiquadFilter();
    const gain = audioCtx!.createGain();
    osc.connect(flt); flt.connect(gain); gain.connect(sfxGain!);
    osc.type = 'sine';
    osc.frequency.value = freq;
    flt.type = 'lowpass'; flt.frequency.value = 2500;
    gain.gain.setValueAtTime(0.1, t + i * 0.07);
    gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.07 + 0.25);
    osc.start(t + i * 0.07);
    osc.stop(t + i * 0.07 + 0.28);
  });
}

function playCombo(count: number) {
  if (!audioCtx || !sfxGain) return;
  const t = audioCtx.currentTime;
  // Rising pitch with combo, filtered triangle wave
  const freq = Math.min(350 + count * 60, 1200);
  const osc = audioCtx.createOscillator();
  const flt = audioCtx.createBiquadFilter();
  const gain = audioCtx.createGain();
  osc.connect(flt); flt.connect(gain); gain.connect(sfxGain);
  osc.type = 'triangle';
  osc.frequency.value = freq;
  flt.type = 'lowpass'; flt.frequency.value = 1500;
  gain.gain.setValueAtTime(0.08, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
  osc.start(t); osc.stop(t + 0.1);
}

export default function BlastPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [canvasSize, setCanvasSize] = useState({ w: 400, h: 600 });
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'gameover' | 'leaderboard'>('menu');
  const [score, setScore] = useState(0);
  const [wave, setWave] = useState(1);
  const [highScore, setHighScore] = useState(0);
  const [socialLoaded, setSocialLoaded] = useState(false);
  const [submittedEntryId, setSubmittedEntryId] = useState<number | null>(null);
  const [progression, setProgression] = useState<ProgressionResult | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);

  const gameRef = useRef({
    player: { x: 200, y: 550, squash: 1, shootCooldown: 0 },
    shapes: [] as Shape[],
    goos: [] as Goo[],
    particles: [] as Particle[],
    gooTrail: [] as { x: number; y: number; life: number }[], // Dither: goo trail when moving
    lastPlayerX: 0, // Track for goo trail
    boss: null as Boss | null,
    bossProjectiles: [] as { x: number; y: number; vx: number; vy: number }[],
    enemyProjectiles: [] as { x: number; y: number; vy: number }[], // Shapes fire back
    wave: 1,
    score: 0,
    combo: 0,
    comboTimer: 0,
    enemyDirection: 1,
    enemySpeed: BASE_ENEMY_SPEED,
    enemyBaseSpeed: BASE_ENEMY_SPEED, // Track base for wave
    killsThisWave: 0, // Track kills for speed multiplier
    enemyFireTimer: ENEMY_FIRE_INTERVAL,
    moveDown: false,
    shapeIdCounter: 0,
    screenShake: 0,
    waveClearing: false,
  });

  const inputRef = useRef({
    targetX: 200,
    firing: false,
  });

  const { user } = usePixelpitSocial(socialLoaded);

  const GAME_URL = typeof window !== 'undefined'
    ? `${window.location.origin}/pixelpit/arcade/${GAME_ID}`
    : `https://pixelpit.gg/pixelpit/arcade/${GAME_ID}`;

  // Group code + logout URL handling
  useEffect(() => {
    if (!socialLoaded || typeof window === 'undefined') return;
    if (!window.PixelpitSocial) return;

    const params = new URLSearchParams(window.location.search);
    if (params.has('logout')) {
      window.PixelpitSocial.logout();
      params.delete('logout');
      const newUrl = params.toString()
        ? `${window.location.pathname}?${params.toString()}`
        : window.location.pathname;
      window.history.replaceState({}, '', newUrl);
      window.location.reload();
      return;
    }

    const groupCode = window.PixelpitSocial.getGroupCodeFromUrl();
    if (groupCode) {
      window.PixelpitSocial.storeGroupCode(groupCode);
    }
  }, [socialLoaded]);

  // Load high score
  useEffect(() => {
    const saved = localStorage.getItem('blast_highscore');
    if (saved) setHighScore(parseInt(saved));
  }, []);

  // Resize handler
  useEffect(() => {
    const handleResize = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const w = Math.min(vw - 20, 450);
      const h = Math.min(vh - 100, 700);
      setCanvasSize({ w, h });
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Analytics tracking (Push: fire on game over)
  useEffect(() => {
    if (gameState === 'gameover' && score >= 1) {
      fetch('/api/pixelpit/stats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ game: GAME_ID }),
      }).catch(() => {}); // Silent fail
    }
  }, [gameState, score]);

  // HP for a shape: squares get extra HP at big size
  const getShapeHp = (type: ShapeType, size: ShapeSize): number => {
    if (type === 'square' && size === 'big') return 2;
    return 1;
  };

  // Spawn wave (Loop spec)
  const spawnWave = useCallback((waveNum: number) => {
    const game = gameRef.current;
    game.waveClearing = false;
    game.shapes = [];
    game.boss = null;
    game.bossProjectiles = [];
    game.enemyProjectiles = [];
    game.enemyFireTimer = ENEMY_FIRE_INTERVAL;
    game.killsThisWave = 0;
    // Base speed for this wave — ramps faster (8% per wave instead of 5%)
    game.enemyBaseSpeed = BASE_ENEMY_SPEED * (1 + waveNum * 0.08);
    game.enemySpeed = game.enemyBaseSpeed;
    
    // Boss every 3 waves (3, 6, 9, 12...)
    if (waveNum >= 3 && waveNum % 3 === 0) {
      const bossNum = Math.floor(waveNum / 3); // 1st boss at wave 3, 2nd at 6, etc.
      const bossHp = 6 + bossNum * 4; // 10, 14, 18, 22...
      game.boss = {
        x: canvasSize.w / 2,
        y: 80,
        hp: bossHp,
        maxHp: bossHp,
        phase: bossNum, // Higher phase = harder behavior
        attackTimer: 1.5,
      };
      return;
    }

    // Wave progression — ramps quickly between boss waves
    let largeCount: number, mediumCount: number, smallCount: number, rows: number;
    if (waveNum === 1) {
      // TUTORIAL: 3 large shapes, spread wide, center row
      const spacing = 80;
      const startX = (canvasSize.w - 2 * spacing) / 2;
      const types: ShapeType[] = ['triangle', 'square', 'hexagon'];
      for (let i = 0; i < 3; i++) {
        game.shapes.push({
          id: game.shapeIdCounter++,
          x: startX + i * spacing,
          y: 100,
          type: types[i],
          size: 'big',
          rotation: 0,
          rotationSpeed: 1,
          hp: 1,
        });
      }
      game.enemySpeed = BASE_ENEMY_SPEED;
      game.enemyDirection = 1;
      return;
    }

    if (waveNum === 2) {
      largeCount = 5; mediumCount = 3; smallCount = 0; rows = 2;
    } else {
      // Waves 4-5, 7-8, 10-11, etc. — scale aggressively
      const cycle = Math.floor((waveNum - 1) / 3); // Which boss cycle (0, 1, 2...)
      const posInCycle = ((waveNum - 1) % 3); // 0=post-boss/early, 1=pre-boss
      largeCount = 5 + cycle * 2 + posInCycle;
      mediumCount = 3 + cycle * 2 + posInCycle;
      smallCount = 2 + cycle * 2 + posInCycle;
      rows = Math.min(3 + cycle + Math.floor(posInCycle / 2), 6);
    }
    
    // Create shape pool with proper size distribution
    const shapePool: { size: ShapeSize; type: ShapeType }[] = [];
    const types: ShapeType[] = ['triangle', 'square', 'hexagon'];
    
    for (let i = 0; i < largeCount; i++) {
      shapePool.push({ size: 'big', type: types[i % 3] });
    }
    for (let i = 0; i < mediumCount; i++) {
      shapePool.push({ size: 'medium', type: types[(i + 1) % 3] });
    }
    for (let i = 0; i < smallCount; i++) {
      shapePool.push({ size: 'small', type: types[(i + 2) % 3] });
    }
    
    // Shuffle pool
    for (let i = shapePool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shapePool[i], shapePool[j]] = [shapePool[j], shapePool[i]];
    }
    
    // Layout in grid
    const cols = Math.ceil(shapePool.length / rows);
    const spacing = 50;
    const startX = (canvasSize.w - (cols - 1) * spacing) / 2;
    const startY = 60;
    
    let shapeIndex = 0;
    for (let row = 0; row < rows && shapeIndex < shapePool.length; row++) {
      for (let col = 0; col < cols && shapeIndex < shapePool.length; col++) {
        const { size, type } = shapePool[shapeIndex];
        game.shapes.push({
          id: game.shapeIdCounter++,
          x: startX + col * spacing,
          y: startY + row * spacing,
          type,
          size,
          rotation: Math.random() * Math.PI * 2,
          rotationSpeed: (Math.random() - 0.5) * 2,
          hp: getShapeHp(type, size),
        });
        shapeIndex++;
      }
    }
    
    // Speed scales with wave (8% per wave)
    game.enemySpeed = BASE_ENEMY_SPEED * (1 + waveNum * 0.08);
    game.enemyDirection = 1;
  }, [canvasSize]);

  // Start game
  const startGame = useCallback(() => {
    initAudio();
    const game = gameRef.current;
    game.player = { x: canvasSize.w / 2, y: canvasSize.h - 50, squash: 1, shootCooldown: 0 };
    game.goos = [];
    game.particles = [];
    game.enemyProjectiles = [];
    game.wave = 1;
    game.score = 0;
    game.combo = 0;
    game.comboTimer = 0;
    game.screenShake = 0;
    game.waveClearing = false;
    game.enemyFireTimer = ENEMY_FIRE_INTERVAL;
    inputRef.current.targetX = canvasSize.w / 2;
    spawnWave(1);
    setScore(0);
    setWave(1);
    setSubmittedEntryId(null);
    setProgression(null);
    setShowShareModal(false);
    setGameState('playing');
    startMusic();
  }, [canvasSize, spawnWave]);

  // Get shape color
  const getShapeColor = (type: ShapeType) => {
    switch (type) {
      case 'triangle': return THEME.triangle;
      case 'square': return THEME.square;
      case 'hexagon': return THEME.hexagon;
    }
  };

  // Get shape size pixels
  const getShapeSize = (size: ShapeSize) => SIZE[size];

  // Spawn particles
  const spawnParticles = useCallback((x: number, y: number, color: string, count: number) => {
    const game = gameRef.current;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 50 + Math.random() * 100;
      game.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.5 + Math.random() * 0.3,
        color,
        size: 3 + Math.random() * 4,
      });
    }
  }, []);

  // Hit shape — decrement HP, split/destroy when HP reaches 0
  const hitShape = useCallback((shape: Shape) => {
    const game = gameRef.current;
    const color = getShapeColor(shape.type);

    // Decrement HP — if still alive, just show hit feedback
    shape.hp--;
    if (shape.hp > 0) {
      spawnParticles(shape.x, shape.y, color, 4);
      playHit(false);
      game.screenShake = 3;
      return;
    }

    // Shape destroyed — particles + split
    spawnParticles(shape.x, shape.y, color, 8);

    // Wave 1: no splits, shapes just die (tutorial)
    if (game.wave === 1) {
      playHit(true);
      game.shapes = game.shapes.filter(s => s.id !== shape.id);
      return;
    }

    if (shape.size === 'big') {
      // Split into 2 medium
      for (let i = 0; i < 2; i++) {
        const childSize: ShapeSize = 'medium';
        game.shapes.push({
          id: game.shapeIdCounter++,
          x: shape.x + (i === 0 ? -20 : 20),
          y: shape.y,
          type: shape.type,
          size: childSize,
          rotation: Math.random() * Math.PI * 2,
          rotationSpeed: (Math.random() - 0.5) * 3,
          hp: getShapeHp(shape.type, childSize),
        });
      }
      playHit(true);
    } else if (shape.size === 'medium') {
      // Split into 2 small
      for (let i = 0; i < 2; i++) {
        const childSize: ShapeSize = 'small';
        game.shapes.push({
          id: game.shapeIdCounter++,
          x: shape.x + (i === 0 ? -12 : 12),
          y: shape.y,
          type: shape.type,
          size: childSize,
          rotation: Math.random() * Math.PI * 2,
          rotationSpeed: (Math.random() - 0.5) * 4,
          hp: getShapeHp(shape.type, childSize),
        });
      }
      playHit(false);
    } else {
      // Small destroyed
      playHit(false);
    }

    // Remove original
    game.shapes = game.shapes.filter(s => s.id !== shape.id);

    // Speed boost per kill (2% per kill, cap at 3x)
    game.killsThisWave++;
    const speedMult = Math.min(Math.pow(SPEED_MULT_PER_KILL, game.killsThisWave), SPEED_CAP);
    game.enemySpeed = game.enemyBaseSpeed * speedMult;
  }, [spawnParticles]);

  // Input handlers
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (gameState !== 'playing') return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // X (quit) button hit area — top-right corner
    if (x > canvasSize.w - 48 && y < 48) {
      const game = gameRef.current;
      stopMusic();
      playDeath();
      game.screenShake = 10;
      setScore(game.score);
      setWave(game.wave);
      setGameState('gameover');
      if (game.score > highScore) {
        setHighScore(game.score);
        localStorage.setItem('blast_highscore', game.score.toString());
      }
      return;
    }

    inputRef.current.targetX = x;
    inputRef.current.firing = true;
  }, [gameState, canvasSize, highScore]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (gameState !== 'playing') return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    inputRef.current.targetX = x;
  }, [gameState]);

  const handlePointerUp = useCallback(() => {
    inputRef.current.firing = false;
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

    const update = (dt: number) => {
      const game = gameRef.current;
      const input = inputRef.current;

      // Move player toward target
      const dx = input.targetX - game.player.x;
      const moveSpeed = PLAYER_SPEED * dt;
      if (Math.abs(dx) > moveSpeed) {
        game.player.x += Math.sign(dx) * moveSpeed;
      } else {
        game.player.x = input.targetX;
      }
      game.player.x = Math.max(25, Math.min(canvasSize.w - 25, game.player.x));

      // Shooting — hold to fire
      game.player.shootCooldown -= dt;
      if (input.firing && game.player.shootCooldown <= 0 && game.goos.length < MAX_BULLETS) {
        game.goos.push({
          x: game.player.x,
          y: game.player.y - 20,
          vy: -GOO_SPEED,
        });
        game.player.squash = 0.7;
        game.player.shootCooldown = 0.15;
        playShoot();
      }

      // Recover squash
      game.player.squash += (1 - game.player.squash) * 10 * dt;

      // Goo trail when moving fast (Dither juice)
      const moveDelta = Math.abs(game.player.x - game.lastPlayerX);
      if (moveDelta > 3) {
        game.gooTrail.push({
          x: game.player.x,
          y: game.player.y + 15,
          life: 0.3,
        });
      }
      game.lastPlayerX = game.player.x;
      game.gooTrail = game.gooTrail.filter(t => {
        t.life -= dt;
        return t.life > 0;
      });

      // Update goos
      for (const goo of game.goos) {
        goo.y += goo.vy * dt;
      }
      game.goos = game.goos.filter(g => g.y > -10);

      // Update combo timer
      if (game.comboTimer > 0) {
        game.comboTimer -= dt;
        if (game.comboTimer <= 0) {
          game.combo = 0;
        }
      }

      // Screen shake decay
      game.screenShake *= 0.9;

      // BOSS LOGIC
      if (game.boss) {
        const boss = game.boss;
        
        // Boss movement — faster and wider at higher phases
        const moveSpeed = 2 + boss.phase * 0.5;
        const moveFreq = 500 - boss.phase * 30;
        boss.x += Math.sin(performance.now() / Math.max(moveFreq, 200)) * moveSpeed;

        // Boss attacks — faster cooldown, more projectiles at higher phases
        boss.attackTimer -= dt;
        if (boss.attackTimer <= 0) {
          const baseCooldown = Math.max(1.2 - boss.phase * 0.15, 0.4);
          boss.attackTimer = baseCooldown;
          const projSpeed = 200 + boss.phase * 30;
          // Fire aimed projectile
          const angle = Math.atan2(game.player.y - boss.y, game.player.x - boss.x);
          game.bossProjectiles.push({
            x: boss.x,
            y: boss.y + 30,
            vx: Math.cos(angle) * projSpeed,
            vy: Math.sin(angle) * projSpeed,
          });
          // Phase 2+ (wave 6+): spread shot — two extra projectiles
          if (boss.phase >= 2) {
            const spread = 0.3;
            game.bossProjectiles.push(
              { x: boss.x, y: boss.y + 30, vx: Math.cos(angle - spread) * projSpeed, vy: Math.sin(angle - spread) * projSpeed },
              { x: boss.x, y: boss.y + 30, vx: Math.cos(angle + spread) * projSpeed, vy: Math.sin(angle + spread) * projSpeed },
            );
          }
        }
        
        // Boss projectiles
        for (const proj of game.bossProjectiles) {
          proj.x += proj.vx * dt;
          proj.y += proj.vy * dt;
          
          // Hit player
          const dx = proj.x - game.player.x;
          const dy = proj.y - game.player.y;
          if (Math.sqrt(dx * dx + dy * dy) < 25) {
            // Player hit!
            stopMusic();
            playDeath();
            game.screenShake = 20;
            setGameState('gameover');
            if (game.score > highScore) {
              setHighScore(game.score);
              localStorage.setItem('blast_highscore', game.score.toString());
            }
            return;
          }
        }
        game.bossProjectiles = game.bossProjectiles.filter(p =>
          p.y < canvasSize.h + 20 && p.x > -20 && p.x < canvasSize.w + 20
        );
        
        // Check goo hits on boss
        for (const goo of game.goos) {
          const dx = goo.x - boss.x;
          const dy = goo.y - boss.y;
          if (Math.sqrt(dx * dx + dy * dy) < 50) {
            boss.hp--;
            game.score += 50;
            setScore(game.score);
            spawnParticles(goo.x, goo.y, THEME.boss, 5);
            playHit(true);
            game.screenShake = 5;
            game.goos = game.goos.filter(g => g !== goo);
            
            if (boss.hp <= 0) {
              // Boss defeated!
              spawnParticles(boss.x, boss.y, THEME.boss, 30);
              game.score += 500;
              setScore(game.score);
              playWaveClear();
              game.screenShake = 15;
              game.boss = null;
              game.wave++;
              setWave(game.wave);
              setTimeout(() => spawnWave(game.wave), 1000);
            }
            break;
          }
        }
        
      } else {
        // REGULAR WAVE LOGIC
        
        // Move shapes
        let hitEdge = false;
        for (const shape of game.shapes) {
          shape.x += game.enemyDirection * game.enemySpeed * dt;

          const size = getShapeSize(shape.size);
          if (shape.x < size || shape.x > canvasSize.w - size) {
            hitEdge = true;
          }
        }

        // Reverse and descend (once per direction change — clamp to prevent re-trigger)
        if (hitEdge) {
          game.enemyDirection *= -1;
          for (const shape of game.shapes) {
            const size = getShapeSize(shape.size);
            shape.x = Math.max(size, Math.min(canvasSize.w - size, shape.x));
            shape.y += DESCENT_STEP;
            
            // Check if shapes reached player
            if (shape.y > canvasSize.h - 80) {
              stopMusic();
              playDeath();
              game.screenShake = 20;
              setGameState('gameover');
              if (game.score > highScore) {
                setHighScore(game.score);
                localStorage.setItem('blast_highscore', game.score.toString());
              }
              return;
            }
          }
          // Speed recalculated in hitShape on each kill
        }
        
        // Check goo collisions
        for (const goo of [...game.goos]) {
          for (const shape of [...game.shapes]) {
            const size = getShapeSize(shape.size);
            const dx = goo.x - shape.x;
            const dy = goo.y - shape.y;
            if (Math.sqrt(dx * dx + dy * dy) < size) {
              // Hit!
              game.combo++;
              game.comboTimer = 1.5;
              const points = (shape.size === 'big' ? 10 : shape.size === 'medium' ? 20 : 30) * game.combo;
              game.score += points;
              setScore(game.score);
              
              if (game.combo > 1) {
                playCombo(game.combo);
              }
              
              hitShape(shape);
              game.goos = game.goos.filter(g => g !== goo);
              break;
            }
          }
        }
        
        // Enemy fire — only hexagons shoot back (starting wave 2)
        const hexagons = game.shapes.filter(s => s.type === 'hexagon');
        if (game.wave >= 2 && hexagons.length > 0) {
          game.enemyFireTimer -= dt;
          if (game.enemyFireTimer <= 0) {
            game.enemyFireTimer = ENEMY_FIRE_INTERVAL;
            const shooter = hexagons[Math.floor(Math.random() * hexagons.length)];
            game.enemyProjectiles.push({
              x: shooter.x,
              y: shooter.y + getShapeSize(shooter.size),
              vy: 150,
            });
          }
        }
        
        // Update enemy projectiles
        for (const proj of game.enemyProjectiles) {
          proj.y += proj.vy * dt;
          
          // Hit player
          const dx = proj.x - game.player.x;
          const dy = proj.y - game.player.y;
          if (Math.sqrt(dx * dx + dy * dy) < 25) {
            stopMusic();
            playDeath();
            game.screenShake = 20;
            setGameState('gameover');
            if (game.score > highScore) {
              setHighScore(game.score);
              localStorage.setItem('blast_highscore', game.score.toString());
            }
            return;
          }
        }
        game.enemyProjectiles = game.enemyProjectiles.filter(p => p.y < canvasSize.h + 20);
        
        // Check wave clear (guard to prevent firing every frame during timeout)
        if (game.shapes.length === 0 && !game.waveClearing) {
          game.waveClearing = true;
          game.enemyProjectiles = []; // Clear projectiles on wave clear
          playWaveClear();
          game.wave++;
          setWave(game.wave);
          setTimeout(() => spawnWave(game.wave), 1000);
        }
      }

      // Update particles
      game.particles = game.particles.filter(p => {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 200 * dt; // gravity
        p.life -= dt;
        return p.life > 0;
      });
    };

    // Persistent background stars (seeded once)
    const bgStars: { x: number; y: number; r: number; a: number; speed: number }[] = [];
    for (let i = 0; i < 60; i++) {
      bgStars.push({
        x: Math.random() * canvasSize.w,
        y: Math.random() * canvasSize.h,
        r: 0.5 + Math.random() * 1.2,
        a: 0.15 + Math.random() * 0.35,
        speed: 0.2 + Math.random() * 0.6,
      });
    }

    // Helper: draw shape path (reused for fill + stroke passes)
    const shapePath = (ctx: CanvasRenderingContext2D, type: ShapeType, r: number) => {
      ctx.beginPath();
      if (type === 'triangle') {
        for (let i = 0; i < 3; i++) {
          const a = (i * Math.PI * 2) / 3 - Math.PI / 2;
          const px = Math.cos(a) * r, py = Math.sin(a) * r;
          i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        }
      } else if (type === 'square') {
        const h = r * 0.75;
        ctx.moveTo(-h, -h); ctx.lineTo(h, -h); ctx.lineTo(h, h); ctx.lineTo(-h, h);
      } else {
        for (let i = 0; i < 6; i++) {
          const a = (i * Math.PI * 2) / 6;
          const px = Math.cos(a) * r, py = Math.sin(a) * r;
          i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        }
      }
      ctx.closePath();
    };

    const draw = () => {
      const now = performance.now();
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;
      update(dt);

      const game = gameRef.current;
      const t = now / 1000; // seconds for animations

      // Screen shake
      const shakeX = (Math.random() - 0.5) * game.screenShake;
      const shakeY = (Math.random() - 0.5) * game.screenShake;
      ctx.save();
      ctx.translate(shakeX, shakeY);

      // ── BACKGROUND ──────────────────────────────────
      // Deep gradient
      const bgGrad = ctx.createLinearGradient(0, 0, 0, canvasSize.h);
      bgGrad.addColorStop(0, '#06060f');
      bgGrad.addColorStop(0.5, '#0a0a1a');
      bgGrad.addColorStop(1, '#0f0a1e');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(-10, -10, canvasSize.w + 20, canvasSize.h + 20);

      // Drifting stars
      for (const star of bgStars) {
        star.y += star.speed * dt * 30;
        if (star.y > canvasSize.h) { star.y = 0; star.x = Math.random() * canvasSize.w; }
        const twinkle = star.a + Math.sin(t * 2 + star.x) * 0.1;
        ctx.globalAlpha = twinkle;
        ctx.fillStyle = '#c4b5fd';
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // Subtle grid
      ctx.strokeStyle = '#ffffff06';
      ctx.lineWidth = 1;
      for (let x = 0; x < canvasSize.w; x += 40) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvasSize.h); ctx.stroke();
      }
      for (let y = 0; y < canvasSize.h; y += 40) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvasSize.w, y); ctx.stroke();
      }

      // ── DANGER ZONE — subtle line where enemies kill you ──
      ctx.strokeStyle = '#ef444418';
      ctx.lineWidth = 1;
      ctx.setLineDash([8, 8]);
      ctx.beginPath(); ctx.moveTo(0, canvasSize.h - 80); ctx.lineTo(canvasSize.w, canvasSize.h - 80); ctx.stroke();
      ctx.setLineDash([]);

      // ── HUD — all top-aligned via textBaseline='top' ──
      const hudTop = 14;
      const hudSmall = '700 14px "SF Mono", "Fira Code", "Consolas", monospace';
      ctx.textBaseline = 'top';

      // Combo multiplier — left, no scaling, same size as wave
      if (game.combo > 1) {
        const comboAlpha = Math.min(game.comboTimer / 0.5, 1);
        ctx.save();
        ctx.globalAlpha = comboAlpha;
        ctx.textAlign = 'left';
        ctx.font = hudSmall;
        ctx.fillStyle = THEME.hexagon;
        ctx.fillText(`${game.combo}x`, 14, hudTop);
        ctx.globalAlpha = 1;
        ctx.restore();
      }

      // SCORE — center, largest, with commas
      const scoreStr = game.score.toLocaleString();
      ctx.textAlign = 'center';
      ctx.fillStyle = THEME.slime;
      ctx.font = '700 24px "SF Mono", "Fira Code", "Consolas", monospace';
      ctx.fillText(scoreStr, canvasSize.w / 2, hudTop);

      // WAVE — right, just left of X, bright
      ctx.font = hudSmall;
      ctx.textAlign = 'right';
      ctx.fillStyle = THEME.teal;
      ctx.fillText(`W${game.wave}`, canvasSize.w - 44, hudTop);

      // X (quit) button — top right, same font as wave
      ctx.font = hudSmall;
      ctx.textAlign = 'right';
      ctx.fillStyle = '#ffffff80';
      ctx.fillText('✕', canvasSize.w - 14, hudTop);

      // ── GOO PROJECTILES ─────────────────────────────
      for (const goo of game.goos) {
        // Trail streak
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = THEME.slime;
        ctx.beginPath();
        ctx.ellipse(goo.x, goo.y + 12, 3, 16, 0, 0, Math.PI * 2);
        ctx.fill();
        // Core
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 12;
        ctx.shadowColor = THEME.goo;
        ctx.fillStyle = THEME.goo;
        ctx.beginPath();
        ctx.ellipse(goo.x, goo.y, 4, 8, 0, 0, Math.PI * 2);
        ctx.fill();
        // Hot center
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.ellipse(goo.x, goo.y - 2, 2, 4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // ── ALIENS ───────────────────────────────────────
      for (const shape of game.shapes) {
        const r = getShapeSize(shape.size);
        const color = getShapeColor(shape.type);
        const pulse = 1 + Math.sin(t * 3 + shape.id * 0.7) * 0.04;
        const maxHp = getShapeHp(shape.type, shape.size);
        const frame = Math.floor(t * 3 + shape.id * 0.5) % 2;

        ctx.save();
        ctx.translate(shape.x, shape.y);
        ctx.scale(pulse, pulse);

        const w = r * 0.8;
        const h = r * 0.55;

        // Glow
        ctx.globalAlpha = 0.12;
        ctx.shadowBlur = 18;
        ctx.shadowColor = color;
        ctx.fillStyle = color;
        ctx.fillRect(-w * 1.15, -h * 1.15, w * 2.3, h * 2.3);
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;

        // Body — solid filled rectangle
        ctx.fillStyle = color;
        ctx.fillRect(-w, -h, w * 2, h * 2);

        // Eyes — two dots
        const eyeR = Math.max(1.5, r * 0.08);
        ctx.fillStyle = '#ffffff';
        ctx.shadowBlur = 6;
        ctx.shadowColor = '#ffffff';
        ctx.beginPath();
        ctx.arc(-w * 0.4, -h * 0.15, eyeR, 0, Math.PI * 2);
        ctx.arc(w * 0.4, -h * 0.15, eyeR, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Feet — two tiny nubs, alternating
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.globalAlpha = 0.8;
        const footLen = r * 0.25;
        if (frame === 0) {
          ctx.beginPath();
          ctx.moveTo(-w * 0.5, h); ctx.lineTo(-w * 0.7, h + footLen);
          ctx.moveTo(w * 0.5, h); ctx.lineTo(w * 0.7, h + footLen);
          ctx.stroke();
        } else {
          ctx.beginPath();
          ctx.moveTo(-w * 0.5, h); ctx.lineTo(-w * 0.35, h + footLen);
          ctx.moveTo(w * 0.5, h); ctx.lineTo(w * 0.35, h + footLen);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;

        // Armored: plating line
        if (shape.type === 'square' && shape.hp > 1) {
          ctx.strokeStyle = color;
          ctx.lineWidth = 1;
          ctx.globalAlpha = 0.5;
          ctx.beginPath();
          ctx.moveTo(-w * 0.8, 0); ctx.lineTo(w * 0.8, 0);
          ctx.stroke();
          ctx.globalAlpha = 1;
        }

        // Crack when damaged
        if (shape.hp < maxHp && shape.hp > 0) {
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1;
          ctx.globalAlpha = 0.6;
          ctx.beginPath();
          ctx.moveTo(-r * 0.15, -r * 0.2);
          ctx.lineTo(r * 0.08, r * 0.05);
          ctx.lineTo(-r * 0.03, r * 0.25);
          ctx.stroke();
          ctx.globalAlpha = 1;
        }

        ctx.restore();
      }

      // ── BOSS ────────────────────────────────────────
      if (game.boss) {
        const boss = game.boss;
        const bossBreath = 1 + Math.sin(t * 2) * 0.04;

        ctx.save();
        ctx.translate(boss.x, boss.y);
        ctx.scale(bossBreath, bossBreath);

        // Outer glow
        ctx.globalAlpha = 0.12;
        ctx.shadowBlur = 50;
        ctx.shadowColor = THEME.boss;
        ctx.fillStyle = THEME.boss;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const a = (i * Math.PI * 2) / 6 + t * 0.5;
          const px = Math.cos(a) * 65, py = Math.sin(a) * 65;
          i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;

        // Body — hollow + stroke
        ctx.fillStyle = THEME.boss + '25';
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const a = (i * Math.PI * 2) / 6 + t * 0.5;
          const px = Math.cos(a) * 50, py = Math.sin(a) * 50;
          i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = THEME.boss;
        ctx.lineWidth = 3;
        ctx.stroke();

        // Inner rotating hex
        ctx.strokeStyle = THEME.boss;
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.5;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const a = (i * Math.PI * 2) / 6 - t * 0.8;
          const px = Math.cos(a) * 28, py = Math.sin(a) * 28;
          i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.stroke();
        ctx.globalAlpha = 1;

        ctx.restore();

        // HP bar — sleek
        const barW = 80, barH = 4, barX = boss.x - barW / 2, barY = boss.y + 62;
        ctx.fillStyle = '#ffffff10';
        ctx.fillRect(barX, barY, barW, barH);
        ctx.fillStyle = THEME.boss;
        ctx.shadowBlur = 8;
        ctx.shadowColor = THEME.boss;
        ctx.fillRect(barX, barY, barW * (boss.hp / boss.maxHp), barH);
        ctx.shadowBlur = 0;

        // Boss projectiles
        for (const proj of game.bossProjectiles) {
          ctx.shadowBlur = 15;
          ctx.shadowColor = THEME.boss;
          ctx.fillStyle = THEME.boss;
          ctx.beginPath();
          ctx.arc(proj.x, proj.y, 6, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(proj.x, proj.y, 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      }

      // ── ENEMY PROJECTILES ───────────────────────────
      for (const proj of game.enemyProjectiles) {
        ctx.shadowBlur = 12;
        ctx.shadowColor = THEME.hexagon;
        ctx.fillStyle = THEME.hexagon;
        ctx.beginPath();
        ctx.arc(proj.x, proj.y, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(proj.x, proj.y, 1.5, 0, Math.PI * 2);
        ctx.fill();
        // Trail
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = THEME.hexagon;
        ctx.beginPath();
        ctx.ellipse(proj.x, proj.y - 8, 2, 8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
      }

      // ── PARTICLES ───────────────────────────────────
      for (const p of game.particles) {
        ctx.globalAlpha = Math.min(p.life * 2, 1);
        ctx.shadowBlur = 6;
        ctx.shadowColor = p.color;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * Math.min(p.life * 2, 1), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;

      // ── GOO TRAIL ───────────────────────────────────
      for (const trail of game.gooTrail) {
        ctx.globalAlpha = trail.life * 1.5;
        ctx.fillStyle = THEME.slime + '60';
        ctx.beginPath();
        ctx.arc(trail.x, trail.y, 4 * trail.life, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // ── PLAYER (CHEVRON HULL) ────────────────────────
      const player = game.player;

      // Find nearest enemy for eye tracking
      let nearestShape: Shape | null = null;
      let nearestDist = Infinity;
      for (const shape of game.shapes) {
        const dx = shape.x - player.x;
        const dy = shape.y - player.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < nearestDist) { nearestDist = dist; nearestShape = shape; }
      }
      // Also track boss
      if (game.boss) {
        const dx = game.boss.x - player.x;
        const dy = game.boss.y - player.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < nearestDist) { nearestDist = dist; nearestShape = null; /* use boss pos below */ }
      }
      const trackX = nearestShape ? nearestShape.x : (game.boss ? game.boss.x : player.x);
      const trackY = nearestShape ? nearestShape.y : (game.boss ? game.boss.y : player.y - 100);

      const isShooting = player.shootCooldown > 0.15;
      // Tilt toward movement direction
      const moveDx = inputRef.current.targetX - player.x;
      const tilt = Math.max(-0.25, Math.min(0.25, moveDx * 0.003));

      ctx.save();
      ctx.translate(player.x, player.y);
      ctx.scale(1 / player.squash, player.squash);
      ctx.rotate(tilt);

      // Ground glow (reflected light on floor)
      ctx.globalAlpha = 0.12;
      ctx.fillStyle = THEME.slime;
      ctx.beginPath();
      ctx.ellipse(0, 24, 22, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;

      // Hull outer glow
      ctx.globalAlpha = 0.08;
      ctx.shadowBlur = 30;
      ctx.shadowColor = THEME.slime;
      ctx.fillStyle = THEME.slime;
      ctx.beginPath();
      ctx.moveTo(0, -22);
      ctx.lineTo(22, 16);
      ctx.lineTo(0, 8);
      ctx.lineTo(-22, 16);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;

      // Hull wireframe — chevron pointing up
      ctx.shadowBlur = 15;
      ctx.shadowColor = THEME.slime;
      ctx.strokeStyle = THEME.slime;
      ctx.lineWidth = 2;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';

      // Main chevron shape
      ctx.beginPath();
      ctx.moveTo(0, -20);       // tip
      ctx.lineTo(18, 14);       // right wing
      ctx.lineTo(0, 6);         // inner notch
      ctx.lineTo(-18, 14);      // left wing
      ctx.closePath();
      ctx.stroke();

      // Muzzle flare when shooting
      if (isShooting) {
        ctx.shadowBlur = 25;
        ctx.shadowColor = THEME.goo;
        ctx.fillStyle = THEME.goo;
        ctx.globalAlpha = 0.8;
        ctx.beginPath();
        ctx.moveTo(0, -24);
        ctx.lineTo(4, -20);
        ctx.lineTo(-4, -20);
        ctx.closePath();
        ctx.fill();
        // Bright core
        ctx.fillStyle = '#ffffff';
        ctx.globalAlpha = 0.9;
        ctx.beginPath();
        ctx.arc(0, -22, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
      }

      // Inner struts (structural detail)
      ctx.strokeStyle = THEME.slime;
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.25;
      ctx.beginPath();
      ctx.moveTo(0, -14);
      ctx.lineTo(10, 10);
      ctx.moveTo(0, -14);
      ctx.lineTo(-10, 10);
      ctx.stroke();
      ctx.globalAlpha = 1;

      // Core eye — single glowing dot that tracks nearest enemy
      const eyeDx = trackX - player.x;
      const eyeDy = trackY - player.y;
      const eyeDist = Math.sqrt(eyeDx * eyeDx + eyeDy * eyeDy);
      const eyeMaxOffset = 4;
      const eyeOX = eyeDist > 0 ? (eyeDx / eyeDist) * eyeMaxOffset : 0;
      const eyeOY = eyeDist > 0 ? Math.min((eyeDy / eyeDist) * eyeMaxOffset, 2) : 0;

      // Eye socket area (subtle dark)
      ctx.fillStyle = '#00000040';
      ctx.beginPath();
      ctx.arc(0, -2, 6, 0, Math.PI * 2);
      ctx.fill();

      // Eye glow
      ctx.shadowBlur = 12;
      ctx.shadowColor = THEME.slime;
      ctx.fillStyle = THEME.slime;
      ctx.beginPath();
      ctx.arc(eyeOX, -2 + eyeOY, 3.5, 0, Math.PI * 2);
      ctx.fill();

      // Eye hot center
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(eyeOX, -2 + eyeOY, 1.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.restore();

      // ── VIGNETTE ────────────────────────────────────
      const vigGrad = ctx.createRadialGradient(
        canvasSize.w / 2, canvasSize.h / 2, canvasSize.h * 0.35,
        canvasSize.w / 2, canvasSize.h / 2, canvasSize.h * 0.75,
      );
      vigGrad.addColorStop(0, '#00000000');
      vigGrad.addColorStop(1, '#000000aa');
      ctx.fillStyle = vigGrad;
      ctx.fillRect(-10, -10, canvasSize.w + 20, canvasSize.h + 20);

      // ── SCANLINES (very subtle) ─────────────────────
      ctx.fillStyle = '#00000012';
      for (let y = 0; y < canvasSize.h; y += 4) {
        ctx.fillRect(0, y, canvasSize.w, 1);
      }

      ctx.restore();

      animationId = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animationId);
  }, [gameState, canvasSize, spawnWave, hitShape, spawnParticles, highScore]);

  return (
    <>
      <Script src="https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.3/dist/confetti.browser.min.js" />
      <Script src="/pixelpit/social.js" onLoad={() => setSocialLoaded(true)} />

      <div
        className="min-h-screen flex flex-col items-center justify-center p-4"
        style={{
          background: 'linear-gradient(180deg, #06060f 0%, #0a0a1a 50%, #0f0a1e 100%)',
          WebkitUserSelect: 'none',
          userSelect: 'none',
          WebkitTouchCallout: 'none',
          WebkitTapHighlightColor: 'transparent',
        } as React.CSSProperties}
      >
        {gameState === 'menu' && (
          <div className="text-center" style={{ fontFamily: "'SF Mono', 'Fira Code', 'Consolas', monospace" }}>
            <div style={{ color: THEME.slime, fontSize: 14, letterSpacing: 6, opacity: 0.5, marginBottom: 12 }}>
              PIXELPIT ARCADE
            </div>
            <h1 style={{
              fontSize: 56,
              fontWeight: 900,
              color: THEME.slime,
              letterSpacing: 8,
              textShadow: `0 0 40px ${THEME.slime}66, 0 0 80px ${THEME.slime}22`,
              marginBottom: 8,
              lineHeight: 1,
            }}>
              BLAST
            </h1>
            <p style={{ color: '#6b7280', fontSize: 14, letterSpacing: 3, marginBottom: 24 }}>
              THEY COME IN WAVES
            </p>
            {highScore > 0 && (
              <p style={{ color: '#4b5563', fontSize: 12, marginBottom: 24 }}>
                BEST: {highScore}
              </p>
            )}
            <button
              onClick={startGame}
              style={{
                background: 'transparent',
                border: `2px solid ${THEME.slime}`,
                color: THEME.slime,
                padding: '14px 40px',
                fontSize: 16,
                fontWeight: 700,
                letterSpacing: 4,
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = THEME.slime; e.currentTarget.style.color = THEME.bg; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = THEME.slime; }}
            >
              PLAY
            </button>
            <p style={{ color: '#4b5563', fontSize: 11, marginTop: 20, letterSpacing: 2 }}>
              DRAG TO MOVE &middot; HOLD TO FIRE
            </p>
            <div style={{ display: 'flex', gap: 20, justifyContent: 'center', marginTop: 16 }}>
              <span style={{ color: THEME.triangle, fontSize: 11, letterSpacing: 1 }}>&#9650; FODDER</span>
              <span style={{ color: THEME.square, fontSize: 11, letterSpacing: 1 }}>&#9632; ARMORED</span>
              <span style={{ color: THEME.hexagon, fontSize: 11, letterSpacing: 1 }}>&#11042; SHOOTER</span>
            </div>
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
            style={{ touchAction: 'none' }}
          />
        )}

        {gameState === 'gameover' && (
          <div className="text-center" style={{ fontFamily: "'SF Mono', 'Fira Code', 'Consolas', monospace", maxWidth: 400, width: '100%' }}>
            <div style={{ color: '#ffffff20', fontSize: 12, letterSpacing: 6, marginBottom: 8 }}>
              GAME OVER
            </div>
            <div style={{ color: '#ffffff40', fontSize: 13, letterSpacing: 3, marginBottom: 4 }}>
              WAVE {wave}
            </div>
            <div style={{
              fontSize: 64,
              fontWeight: 900,
              color: THEME.slime,
              textShadow: `0 0 40px ${THEME.slime}44`,
              lineHeight: 1,
              marginBottom: 24,
            }}>
              {score}
            </div>

            {/* Progression display */}
            {progression && (
              <div style={{
                background: THEME.surface,
                borderRadius: 12,
                padding: '16px 24px',
                marginBottom: 20,
                textAlign: 'center',
              }}>
                <div style={{ fontSize: 18, color: THEME.slime, marginBottom: 8 }}>
                  +{progression.xpEarned} XP
                </div>
                <div style={{ fontSize: 12, color: '#71717a' }}>
                  Level {progression.level}{progression.streak > 1 ? ` • ${progression.multiplier}x streak` : ''}
                </div>
              </div>
            )}

            <div className="w-full max-w-sm mb-4">
              <ScoreFlow
                score={score}
                gameId={GAME_ID}
                colors={SCORE_FLOW_COLORS}
                maxScore={500}
                onRankReceived={(rank, entryId) => setSubmittedEntryId(entryId ?? null)}
                onProgression={(prog) => setProgression(prog)}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center', marginTop: 20, width: '100%' }}>
              <button
                onClick={startGame}
                style={{
                  background: 'transparent',
                  border: `2px solid ${THEME.slime}`,
                  color: THEME.slime,
                  padding: '10px 28px',
                  fontSize: 13,
                  fontWeight: 700,
                  letterSpacing: 3,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = THEME.slime; e.currentTarget.style.color = THEME.bg; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = THEME.slime; }}
              >
                AGAIN
              </button>
              <button
                onClick={() => setGameState('leaderboard')}
                style={{
                  background: 'transparent',
                  border: '2px solid #ffffff20',
                  color: '#ffffff60',
                  padding: '10px 28px',
                  fontSize: 13,
                  fontWeight: 700,
                  letterSpacing: 3,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#ffffff40'; e.currentTarget.style.color = '#ffffffaa'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#ffffff20'; e.currentTarget.style.color = '#ffffff60'; }}
              >
                RANKS
              </button>
              {user ? (
                <button
                  onClick={() => setShowShareModal(true)}
                  style={{
                    background: 'transparent',
                    border: '2px solid #ffffff20',
                    color: '#ffffff60',
                    padding: '10px 28px',
                    fontSize: 13,
                    fontWeight: 700,
                    letterSpacing: 3,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#ffffff40'; e.currentTarget.style.color = '#ffffffaa'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#ffffff20'; e.currentTarget.style.color = '#ffffff60'; }}
                >
                  SHARE / GROUPS
                </button>
              ) : (
                <ShareButtonContainer
                  id="share-btn-blast"
                  url={typeof window !== 'undefined' ? `${window.location.origin}/pixelpit/arcade/blast/share/${score}` : ''}
                  text={`${score} points — Wave ${wave} in BLAST! Can you beat me?`}
                  style="minimal"
                  socialLoaded={socialLoaded}
                />
              )}
            </div>
          </div>
        )}

        {/* Leaderboard — full screen, not wrapped in custom modal */}
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
        {/* ShareModal — at component root, outside game-over div */}
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
