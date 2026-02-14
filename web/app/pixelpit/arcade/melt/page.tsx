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

const GAME_ID = 'melt';

// Game settings
const GAME_WIDTH = 400;
const GAME_HEIGHT = 700;
const LANES = [GAME_WIDTH * 0.25, GAME_WIDTH * 0.5, GAME_WIDTH * 0.75]; // 3 lanes
const MELT_RATE = 2; // px lost per second
const MIN_SIZE = 8; // Death threshold
const MAX_SIZE = 64;
const START_SIZE = 48;
const SCROLL_SPEED = 150; // pixels per second
const LAVA_DAMAGE = 8; // Shrink on lava hit
const ICE_GAIN = 12; // Growth on ice pickup

// Theme — VOLCANIC DESCENT
const THEME = {
  bg: '#000000',
  bgDeep: '#0a0000',
  lavaDark: '#8b0000',
  lavaMid: '#cc2200',
  lavaHot: '#ff4400',
  lavaWhite: '#ff8844',
  rock: '#111111',
  rockLight: '#1a1a1a',
  ice: '#ffffff',
  iceCore: '#aaeeff',
  iceDim: '#556677',
  steam: '#ffffff30',
  text: '#ffffff',
  textDim: '#444444',
  danger: '#ff2200',
};

// Social colors — match the dark/gritty aesthetic
const SCORE_FLOW_COLORS: ScoreFlowColors = {
  bg: '#000000',
  surface: '#111111',
  primary: '#ff4400',
  secondary: '#aaeeff',
  text: '#ffffff',
  muted: '#444444',
  error: '#ff2200',
};

const LEADERBOARD_COLORS: LeaderboardColors = {
  bg: '#000000',
  surface: '#111111',
  primary: '#ff4400',
  secondary: '#aaeeff',
  text: '#ffffff',
  muted: '#444444',
};

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  size: number;
  type: 'steam' | 'sparkle' | 'sizzle';
}

interface Obstacle {
  lane: number;
  y: number;
  type: 'lava';
}

interface IcePickup {
  lane: number;
  y: number;
  collected: boolean;
}

// ============================================================
// AUDIO — dark ambient step sequencer + SFX (BEAM-style)
// ============================================================
let audioCtx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let musicGain: GainNode | null = null;
let musicPlaying = false;
let musicInterval: ReturnType<typeof setInterval> | null = null;
let musicStep = 0;
let arpStep = 0;

function initAudio() {
  if (audioCtx) return;
  audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  masterGain = audioCtx.createGain();
  masterGain.gain.value = 0.5;
  masterGain.connect(audioCtx.destination);
  musicGain = audioCtx.createGain();
  musicGain.gain.value = 0.18;
  musicGain.connect(masterGain);
  if (audioCtx.state === 'suspended') audioCtx.resume();
}

// --- Music: dark minor-key step sequencer ---
const MUSIC = {
  bpm: 100,
  // Sub bass in D minor territory — D1, rests, C1, Bb0
  bass: [36.7, 0, 36.7, 0, 0, 0, 36.7, 0, 32.7, 0, 0, 0, 29.14, 0, 32.7, 0],
  // Dark minor arps — Dm, Am, Gm, Bb
  arp: [
    [294, 349, 440, 523],   // Dm: D4 F4 A4 C5
    [220, 262, 330, 392],   // Am: A3 C4 E4 G4
    [196, 233, 294, 349],   // Gm: G3 Bb3 D4 F4
    [233, 294, 349, 440],   // Bb: Bb3 D4 F4 A4
  ],
  // Sparse kick — rumble not dance
  kick: [1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0],
  // Off-beat hats, very quiet
  hat:  [0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1],
};

function playKick() {
  if (!audioCtx || !masterGain) return;
  const t = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(musicGain!);
  osc.type = 'sine';
  osc.frequency.setValueAtTime(80, t);
  osc.frequency.exponentialRampToValueAtTime(25, t + 0.15);
  gain.gain.setValueAtTime(0.35, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
  osc.start(t);
  osc.stop(t + 0.25);
}

function playHat() {
  if (!audioCtx || !musicGain) return;
  const bufLen = audioCtx.sampleRate * 0.03;
  const buf = audioCtx.createBuffer(1, bufLen, audioCtx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < bufLen; i++) d[i] = Math.random() * 2 - 1;
  const src = audioCtx.createBufferSource();
  src.buffer = buf;
  const hp = audioCtx.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 8000;
  const lp = audioCtx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 11000;
  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(0.04, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.04);
  src.connect(hp);
  hp.connect(lp);
  lp.connect(gain);
  gain.connect(musicGain);
  src.start();
}

function playBass(freq: number) {
  if (!audioCtx || !musicGain || freq === 0) return;
  const t = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const flt = audioCtx.createBiquadFilter();
  const gain = audioCtx.createGain();
  osc.connect(flt);
  flt.connect(gain);
  gain.connect(musicGain);
  osc.type = 'sine';
  osc.frequency.value = freq;
  flt.type = 'lowpass';
  flt.frequency.value = 150;
  gain.gain.setValueAtTime(0.22, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
  osc.start(t);
  osc.stop(t + 0.2);
}

function playArp(freqs: number[]) {
  if (!audioCtx || !musicGain) return;
  const t = audioCtx.currentTime;
  const freq = freqs[arpStep % freqs.length];
  const osc = audioCtx.createOscillator();
  const flt = audioCtx.createBiquadFilter();
  const gain = audioCtx.createGain();
  osc.connect(flt);
  flt.connect(gain);
  gain.connect(musicGain);
  osc.type = 'triangle';
  osc.frequency.value = freq;
  flt.type = 'lowpass';
  flt.frequency.value = 1500;
  flt.Q.value = 2;
  gain.gain.setValueAtTime(0.04, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
  osc.start(t);
  osc.stop(t + 0.16);
}

function musicTick() {
  if (!audioCtx || !musicPlaying) return;
  if (MUSIC.kick[musicStep % 16]) playKick();
  if (MUSIC.hat[musicStep % 16]) playHat();
  if (musicStep % 2 === 0) playBass(MUSIC.bass[(musicStep / 2) % 16]);
  const barIndex = Math.floor(musicStep / 16) % 4;
  playArp(MUSIC.arp[barIndex]);
  arpStep++;
  musicStep++;
}

function startMusic() {
  if (musicPlaying) return;
  initAudio();
  if (audioCtx?.state === 'suspended') audioCtx.resume();
  musicPlaying = true;
  musicStep = 0;
  arpStep = 0;
  const stepTime = (60 / MUSIC.bpm) * 1000 / 4;
  musicInterval = setInterval(musicTick, stepTime);
}

function stopMusic() {
  musicPlaying = false;
  if (musicInterval) {
    clearInterval(musicInterval);
    musicInterval = null;
  }
}

// --- SFX — all routed through masterGain ---

function playCrystallize() {
  if (!audioCtx || !masterGain) return;
  const t = audioCtx.currentTime;
  // Bright rising chime — ice pickup
  [880, 1175, 1480].forEach((freq, i) => {
    const osc = audioCtx!.createOscillator();
    const flt = audioCtx!.createBiquadFilter();
    const gain = audioCtx!.createGain();
    osc.connect(flt);
    flt.connect(gain);
    gain.connect(masterGain!);
    osc.type = 'sine';
    osc.frequency.value = freq;
    flt.type = 'lowpass';
    flt.frequency.value = 3000;
    gain.gain.setValueAtTime(0.1, t + i * 0.06);
    gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.06 + 0.18);
    osc.start(t + i * 0.06);
    osc.stop(t + i * 0.06 + 0.2);
  });
}

function playSizzle() {
  if (!audioCtx || !masterGain) return;
  const t = audioCtx.currentTime;
  // Filtered noise burst + sub thud
  const bufLen = audioCtx.sampleRate * 0.2;
  const buf = audioCtx.createBuffer(1, bufLen, audioCtx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < bufLen; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / bufLen);
  const src = audioCtx.createBufferSource();
  src.buffer = buf;
  const flt = audioCtx.createBiquadFilter();
  flt.type = 'lowpass';
  flt.frequency.value = 600;
  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(0.12, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
  src.connect(flt);
  flt.connect(gain);
  gain.connect(masterGain);
  src.start();
  // Sub thud
  const sub = audioCtx.createOscillator();
  const subGain = audioCtx.createGain();
  sub.connect(subGain);
  subGain.connect(masterGain);
  sub.type = 'sine';
  sub.frequency.value = 50;
  subGain.gain.setValueAtTime(0.15, t);
  subGain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
  sub.start(t);
  sub.stop(t + 0.22);
}

function playEvaporate() {
  if (!audioCtx || !masterGain) return;
  const t = audioCtx.currentTime;
  // Descending sweep + noise wash — death
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(masterGain);
  osc.type = 'sine';
  osc.frequency.setValueAtTime(500, t);
  osc.frequency.exponentialRampToValueAtTime(60, t + 0.6);
  gain.gain.setValueAtTime(0.18, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
  osc.start(t);
  osc.stop(t + 0.6);
  // Noise wash
  const bufLen = audioCtx.sampleRate * 0.4;
  const buf = audioCtx.createBuffer(1, bufLen, audioCtx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < bufLen; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / bufLen) * 0.5;
  const src = audioCtx.createBufferSource();
  src.buffer = buf;
  const flt = audioCtx.createBiquadFilter();
  flt.type = 'lowpass';
  flt.frequency.setValueAtTime(4000, t);
  flt.frequency.exponentialRampToValueAtTime(200, t + 0.5);
  const nGain = audioCtx.createGain();
  nGain.gain.setValueAtTime(0.1, t);
  nGain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
  src.connect(flt);
  flt.connect(nGain);
  nGain.connect(masterGain);
  src.start();
}

function playLaneSwitch() {
  if (!audioCtx || !masterGain) return;
  const t = audioCtx.currentTime;
  // Quick soft tick on lane change
  const osc = audioCtx.createOscillator();
  const flt = audioCtx.createBiquadFilter();
  const gain = audioCtx.createGain();
  osc.connect(flt);
  flt.connect(gain);
  gain.connect(masterGain);
  osc.type = 'triangle';
  osc.frequency.value = 400;
  flt.type = 'lowpass';
  flt.frequency.value = 1200;
  gain.gain.setValueAtTime(0.06, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
  osc.start(t);
  osc.stop(t + 0.05);
}

export default function MeltGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<'start' | 'playing' | 'gameOver'>('start');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [canvasSize, setCanvasSize] = useState({ w: GAME_WIDTH, h: GAME_HEIGHT });

  // Social
  const [socialLoaded, setSocialLoaded] = useState(false);
  const [submittedEntryId, setSubmittedEntryId] = useState<number | null>(null);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [progression, setProgression] = useState<ProgressionResult | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);

  const { user } = usePixelpitSocial(socialLoaded);

  const GAME_URL = typeof window !== 'undefined'
    ? `${window.location.origin}/pixelpit/arcade/melt`
    : 'https://pixelpit.gg/pixelpit/arcade/melt';

  const gameRef = useRef({
    lane: 1, // 0=left, 1=center, 2=right
    targetLane: 1,
    playerX: LANES[1],
    playerY: GAME_HEIGHT * 0.75,
    playerSize: START_SIZE,
    scrollY: 0,
    obstacles: [] as Obstacle[],
    icePickups: [] as IcePickup[],
    particles: [] as Particle[],
    score: 0,
    distance: 0,
    lastSpawnY: 0,
    screenShake: 0,
    flashRed: 0,
    gameTime: 0, // Track time for tutorial phases
    popupText: '' as string,
    popupTimer: 0,
    tutorialPhase: 0, // 0=melting, 1=first ice, 2=first rock, 3=normal
    difficultyPhase: 1, // 1=onboarding, 2=learning, 3=challenge, 4=mastery
    lastPhaseAnnounced: 0,
  });

  const spawnRow = useCallback((y: number) => {
    const game = gameRef.current;

    // 0-2 lava, capped at 2 so at least 1 lane is always clear
    const lavaCount = Math.random() < 0.7 ? (Math.random() < 0.5 ? 1 : 2) : 0;
    const hasIce = Math.random() < 0.25;

    const usedLanes: number[] = [];

    for (let i = 0; i < Math.min(lavaCount, 2); i++) {
      let lane: number;
      do {
        lane = Math.floor(Math.random() * 3);
      } while (usedLanes.includes(lane));
      usedLanes.push(lane);
      game.obstacles.push({ lane, y, type: 'lava' });
    }

    if (hasIce) {
      const emptyLanes = [0, 1, 2].filter(l => !usedLanes.includes(l));
      if (emptyLanes.length > 0) {
        const lane = emptyLanes[Math.floor(Math.random() * emptyLanes.length)];
        game.icePickups.push({ lane, y, collected: false });
      }
    }
  }, []);

  const spawnObstacles = useCallback((startY: number, endY: number) => {
    const game = gameRef.current;
    const spacing = 180; // Space between rows
    
    for (let y = startY; y < endY; y += spacing) {
      spawnRow(y);
    }
    game.lastSpawnY = endY;
  }, [spawnRow]);

  const startGame = useCallback(() => {
    initAudio();
    startMusic();
    const game = gameRef.current;
    game.lane = 1;
    game.targetLane = 1;
    game.playerX = LANES[1];
    game.playerY = GAME_HEIGHT * 0.75;
    game.playerSize = MAX_SIZE; // Start at MAX for tutorial
    game.scrollY = 0;
    game.obstacles = [];
    game.icePickups = [];
    game.particles = [];
    game.score = 0;
    game.distance = 0;
    game.lastSpawnY = GAME_HEIGHT;
    game.screenShake = 0;
    game.flashRed = 0;
    game.gameTime = 0;
    game.popupText = '';
    game.popupTimer = 0;
    game.tutorialPhase = 0;
    
    // NO initial obstacles - tutorial approach
    // Phase 0-3s: empty, just melting
    // Phase 3-6s: first ice appears
    // Phase 6-10s: first rock appears
    // After 10s: normal spawning
    
    setScore(0);
    setSubmittedEntryId(null);
    setShowLeaderboard(false);
    setShowShareModal(false);
    setProgression(null);
    setGameState('playing');
  }, []);

  const switchLane = useCallback((direction: number) => {
    const game = gameRef.current;
    const newLane = Math.max(0, Math.min(2, game.lane + direction));
    if (newLane !== game.lane) playLaneSwitch();
    game.lane = newLane;
    game.targetLane = newLane;
  }, []);

  // Group code + logout URL handling
  useEffect(() => {
    if (!socialLoaded || typeof window === 'undefined') return;
    if (!(window as any).PixelpitSocial) return;

    const params = new URLSearchParams(window.location.search);
    if (params.has('logout')) {
      (window as any).PixelpitSocial.logout();
      params.delete('logout');
      const newUrl = params.toString()
        ? `${window.location.pathname}?${params.toString()}`
        : window.location.pathname;
      window.history.replaceState({}, '', newUrl);
      window.location.reload();
      return;
    }

    const groupCode = (window as any).PixelpitSocial.getGroupCodeFromUrl();
    if (groupCode) {
      (window as any).PixelpitSocial.storeGroupCode(groupCode);
    }
  }, [socialLoaded]);

  useEffect(() => {
    const updateSize = () => {
      const w = Math.min(window.innerWidth, 500);
      const h = Math.min(window.innerHeight, 800);
      setCanvasSize({ w, h });
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  useEffect(() => {
    if (gameState !== 'playing') return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let lastTime = performance.now();

    const scale = Math.min(canvasSize.w / GAME_WIDTH, canvasSize.h / GAME_HEIGHT);
    const offsetX = (canvasSize.w - GAME_WIDTH * scale) / 2;
    const offsetY = (canvasSize.h - GAME_HEIGHT * scale) / 2;

    const update = (dt: number) => {
      const game = gameRef.current;
      
      // Track game time for tutorial
      game.gameTime += dt;
      
      // Tutorial phases
      if (game.tutorialPhase === 0 && game.gameTime < 3) {
        // Phase 0: Just melting, show "YOU'RE MELTING!"
        if (game.gameTime < 0.1) {
          game.popupText = "YOU'RE MELTING!";
          game.popupTimer = 2.5;
        }
      } else if (game.tutorialPhase === 0 && game.gameTime >= 3) {
        // Phase 1: Spawn first ice in center lane
        game.tutorialPhase = 1;
        game.icePickups.push({ lane: 1, y: game.scrollY + GAME_HEIGHT + 100, collected: false });
      } else if (game.tutorialPhase === 1 && game.gameTime >= 6) {
        // Phase 2: Spawn first rock (in side lane, easy to dodge)
        game.tutorialPhase = 2;
        game.obstacles.push({ lane: 0, y: game.scrollY + GAME_HEIGHT + 100, type: 'lava' });
      } else if (game.tutorialPhase === 2 && game.gameTime >= 10) {
        // Phase 3: Normal gameplay
        game.tutorialPhase = 3;
      }
      
      // CONTINUOUS DIFFICULTY RAMP (no discrete phases)
      // All parameters scale SLOWLY with distance - gentler curve
      const dist = game.distance;
      
      // Speed: 1.0x at start → 1.8x at 10000 distance (slower ramp)
      const speedMult = Math.min(1.8, 1.0 + (dist / 10000) * 0.8);
      
      // Melt rate: 1.0x at start → 1.3x at 10000 distance (gentler)
      const meltMult = Math.min(1.3, 1.0 + (dist / 10000) * 0.3);
      
      // Rock density: spacing shrinks from 220 → 120 over 8000 distance
      const spacing = Math.max(120, 220 - (dist / 8000) * 100);
      
      // Rock chance: 0.3 at start → 0.7 at 6000 distance (slower ramp)
      const rockChance = Math.min(0.7, 0.3 + (dist / 6000) * 0.4);
      
      // Ice frequency: 0.5 at start → 0.2 at 8000 distance (stays generous longer)
      const iceChance = Math.max(0.2, 0.5 - (dist / 8000) * 0.3);
      
      // Pairs chance: 0% at start, slowly increases to 40% at 5000+ (much gentler)
      const pairsChance = Math.min(0.4, dist / 5000 * 0.4);
      
      // Normal spawning after tutorial
      if (game.tutorialPhase >= 3 && game.scrollY + GAME_HEIGHT > game.lastSpawnY - 300) {
        // Build rows first, then validate across rows
        const rows: { y: number; lavaLanes: number[]; iceLane: number | null }[] = [];

        for (let y = game.lastSpawnY; y < game.lastSpawnY + 500; y += spacing) {
          const lavaLanes: number[] = [];

          if (Math.random() < rockChance) {
            const rockCount = Math.random() < pairsChance ? 2 : 1;
            for (let i = 0; i < Math.min(rockCount, 2); i++) {
              let lane: number;
              let attempts = 0;
              do {
                lane = Math.floor(Math.random() * 3);
                attempts++;
              } while (lavaLanes.includes(lane) && attempts < 10);
              if (!lavaLanes.includes(lane)) lavaLanes.push(lane);
            }
          }

          let iceLane: number | null = null;
          if (Math.random() < iceChance && lavaLanes.length < 3) {
            const emptyLanes = [0, 1, 2].filter(l => !lavaLanes.includes(l));
            if (emptyLanes.length > 0) {
              iceLane = emptyLanes[Math.floor(Math.random() * emptyLanes.length)];
            }
          }

          rows.push({ y, lavaLanes, iceLane });
        }

        // VALIDATION PASS: ensure adjacent rows always leave a reachable lane
        for (let r = 1; r < rows.length; r++) {
          const prev = rows[r - 1];
          const curr = rows[r];
          // Find lanes clear in BOTH adjacent rows (player must be able to path through)
          const clearLanes = [0, 1, 2].filter(
            l => !prev.lavaLanes.includes(l) && !curr.lavaLanes.includes(l)
          );
          // If no clear path, remove a random lava from the current row
          if (clearLanes.length === 0 && curr.lavaLanes.length > 0) {
            // Pick a lane that's clear in prev row to open up
            const prevClear = [0, 1, 2].filter(l => !prev.lavaLanes.includes(l));
            if (prevClear.length > 0) {
              const openLane = prevClear[Math.floor(Math.random() * prevClear.length)];
              curr.lavaLanes = curr.lavaLanes.filter(l => l !== openLane);
            } else {
              // Both rows are maxed — just remove one from current
              curr.lavaLanes.pop();
            }
          }
        }

        // VALIDATION PASS: ensure ice is never in a lava lane of adjacent rows
        for (let r = 0; r < rows.length; r++) {
          const curr = rows[r];
          if (curr.iceLane === null) continue;
          // Check if ice lane has lava in the next row (ice is offset toward next row)
          const next = rows[r + 1];
          if (next && next.lavaLanes.includes(curr.iceLane)) {
            // Move ice to a lane clear in both this row and next
            const safeLanes = [0, 1, 2].filter(
              l => !curr.lavaLanes.includes(l) && !next.lavaLanes.includes(l)
            );
            curr.iceLane = safeLanes.length > 0
              ? safeLanes[Math.floor(Math.random() * safeLanes.length)]
              : null; // drop ice if truly no safe lane
          }
        }

        // Commit rows to game state
        for (const row of rows) {
          for (const lane of row.lavaLanes) {
            game.obstacles.push({ lane, y: row.y, type: 'lava' });
          }
          if (row.iceLane !== null) {
            game.icePickups.push({ lane: row.iceLane, y: row.y + spacing * 0.4, collected: false });
          }
        }
        game.lastSpawnY += 500;
      }
      
      // Update popup timer
      if (game.popupTimer > 0) {
        game.popupTimer -= dt;
        if (game.popupTimer <= 0) game.popupText = '';
      }
      
      // Scroll (continuous speed ramp)
      game.scrollY += SCROLL_SPEED * speedMult * dt;
      game.distance += SCROLL_SPEED * speedMult * dt;
      
      // Melt! (continuous melt ramp)
      game.playerSize -= MELT_RATE * meltMult * dt;
      
      // Spawn steam particles (more when small)
      const steamRate = 0.3 + (1 - game.playerSize / MAX_SIZE) * 0.5;
      if (Math.random() < steamRate) {
        game.particles.push({
          x: game.playerX + (Math.random() - 0.5) * game.playerSize,
          y: game.playerY - game.playerSize / 2,
          vx: (Math.random() - 0.5) * 20,
          vy: -30 - Math.random() * 30,
          life: 0.8,
          color: THEME.steam,
          size: 4 + Math.random() * 4,
          type: 'steam',
        });
      }
      
      // Check death
      if (game.playerSize <= MIN_SIZE) {
        stopMusic();
        playEvaporate();
        // Big steam burst
        for (let i = 0; i < 20; i++) {
          game.particles.push({
            x: game.playerX,
            y: game.playerY,
            vx: (Math.random() - 0.5) * 100,
            vy: -50 - Math.random() * 50,
            life: 1,
            color: THEME.steam,
            size: 8,
            type: 'steam',
          });
        }
        setHighScore(h => Math.max(h, game.score));
        setGameState('gameOver');
        if (game.score >= 1) {
          fetch('/api/pixelpit/stats', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ game: GAME_ID }),
          }).catch(() => {});
        }
        return;
      }
      
      // Move player toward target lane
      const targetX = LANES[game.lane];
      const dx = targetX - game.playerX;
      game.playerX += dx * 12 * dt;
      
      // Check collisions
      const halfSize = game.playerSize / 2;
      
      for (const obs of game.obstacles) {
        const obsY = obs.y - game.scrollY;
        if (obsY < -50 || obsY > GAME_HEIGHT + 50) continue;
        
        // Same lane collision
        if (obs.lane === game.lane) {
          const obsX = LANES[obs.lane];
          const dist = Math.abs(game.playerY - obsY);
          if (dist < halfSize + 25) {
            // Hit lava!
            game.playerSize -= LAVA_DAMAGE;
            game.screenShake = 0.3;
            game.flashRed = 0.2;
            game.popupText = 'OUCH!';
            game.popupTimer = 0.5;
            playSizzle();
            
            // Sizzle particles
            for (let i = 0; i < 8; i++) {
              game.particles.push({
                x: game.playerX,
                y: game.playerY,
                vx: (Math.random() - 0.5) * 80,
                vy: -40 - Math.random() * 40,
                life: 0.4,
                color: THEME.lavaMid,
                size: 6,
                type: 'sizzle',
              });
            }
            
            // Remove this obstacle
            obs.y = -1000;
          }
        }
      }
      
      // Check ice pickups
      for (const ice of game.icePickups) {
        if (ice.collected) continue;
        const iceY = ice.y - game.scrollY;
        if (iceY < -50 || iceY > GAME_HEIGHT + 50) continue;
        
        if (ice.lane === game.lane) {
          const dist = Math.abs(game.playerY - iceY);
          if (dist < halfSize + 20) {
            ice.collected = true;
            game.playerSize = Math.min(MAX_SIZE, game.playerSize + ICE_GAIN);
            game.popupText = 'ICE!';
            game.popupTimer = 0.5;
            playCrystallize();
            
            // Sparkle particles
            for (let i = 0; i < 12; i++) {
              const angle = (i / 12) * Math.PI * 2;
              game.particles.push({
                x: LANES[ice.lane],
                y: iceY,
                vx: Math.cos(angle) * 60,
                vy: Math.sin(angle) * 60,
                life: 0.5,
                color: THEME.iceCore,
                size: 5,
                type: 'sparkle',
              });
            }
          }
        }
      }
      
      // Score: distance + size bonus (bigger = 2x multiplier)
      const sizeMultiplier = 1 + (game.playerSize - MIN_SIZE) / (MAX_SIZE - MIN_SIZE);
      game.score = Math.floor(game.distance / 5 * sizeMultiplier);
      setScore(game.score);
      
      // Decay effects
      game.screenShake *= 0.9;
      game.flashRed -= dt * 5;
      if (game.flashRed < 0) game.flashRed = 0;
      
      // Update particles
      game.particles = game.particles.filter(p => {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (p.type === 'steam') p.vy -= 20 * dt; // Steam rises
        p.life -= dt * 2;
        return p.life > 0;
      });
      
      // Cleanup
      game.obstacles = game.obstacles.filter(o => o.y - game.scrollY > -100);
      game.icePickups = game.icePickups.filter(i => i.y - game.scrollY > -100 && !i.collected);
    };

    const draw = () => {
      const game = gameRef.current;
      const t = Date.now() / 1000;
      const sizePercent = (game.playerSize - MIN_SIZE) / (MAX_SIZE - MIN_SIZE);

      // Screen shake
      const shakeX = game.screenShake * (Math.random() - 0.5) * 14;
      const shakeY = game.screenShake * (Math.random() - 0.5) * 14;

      // === BACKGROUND — pure black with heat ===
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, canvasSize.w, canvasSize.h);

      // Subtle heat glow from below — the only color in the background
      const heatGlow = ctx.createRadialGradient(
        canvasSize.w / 2, canvasSize.h * 1.1, 0,
        canvasSize.w / 2, canvasSize.h * 1.1, canvasSize.h * 0.8
      );
      heatGlow.addColorStop(0, `rgba(139, 0, 0, ${0.12 + Math.sin(t) * 0.04})`);
      heatGlow.addColorStop(1, 'transparent');
      ctx.fillStyle = heatGlow;
      ctx.fillRect(0, 0, canvasSize.w, canvasSize.h);

      // Hit flash — full screen red
      if (game.flashRed > 0) {
        ctx.fillStyle = `rgba(255, 34, 0, ${game.flashRed * 0.5})`;
        ctx.fillRect(0, 0, canvasSize.w, canvasSize.h);
      }

      ctx.save();
      ctx.translate(offsetX + shakeX, offsetY + shakeY);
      ctx.scale(scale, scale);

      // === SPEED LINES — vertical streaks that sell velocity ===
      const lineOffset = (game.scrollY * 2) % 40;
      ctx.strokeStyle = 'rgba(255,255,255,0.015)';
      ctx.lineWidth = 1;
      for (let lx = 20; lx < GAME_WIDTH; lx += 18) {
        ctx.beginPath();
        ctx.moveTo(lx + Math.sin(lx) * 3, -lineOffset);
        ctx.lineTo(lx + Math.sin(lx) * 3, GAME_HEIGHT);
        ctx.stroke();
      }

      // === LAVA — harsh, hot, dangerous ===
      for (const obs of game.obstacles) {
        const oy = obs.y - game.scrollY;
        if (oy < -60 || oy > GAME_HEIGHT + 60) continue;
        const ox = LANES[obs.lane];
        const pulse = Math.sin(t * 5 + obs.y * 0.08);

        // Warning glow — a faint hot circle
        ctx.fillStyle = `rgba(204, 34, 0, ${0.06 + pulse * 0.02})`;
        ctx.beginPath();
        ctx.arc(ox, oy, 50, 0, Math.PI * 2);
        ctx.fill();

        // Core — white-hot horizontal slash
        ctx.fillStyle = THEME.lavaHot;
        ctx.fillRect(ox - 30, oy - 4, 60, 8);
        // Bright center line
        ctx.fillStyle = THEME.lavaWhite;
        ctx.fillRect(ox - 20, oy - 2, 40, 4);
        // Outer heat haze bars
        ctx.fillStyle = `rgba(204, 34, 0, ${0.4 + pulse * 0.2})`;
        ctx.fillRect(ox - 36, oy - 8, 72, 2);
        ctx.fillRect(ox - 36, oy + 6, 72, 2);
      }

      // === ICE PICKUPS — sharp, bright, precious ===
      for (const ice of game.icePickups) {
        if (ice.collected) continue;
        const iy = ice.y - game.scrollY;
        if (iy < -60 || iy > GAME_HEIGHT + 60) continue;
        const ix = LANES[ice.lane];
        const flicker = Math.sin(t * 8 + ice.y) > 0 ? 1 : 0.7;

        // Vertical beacon line
        ctx.strokeStyle = `rgba(170, 238, 255, ${0.08 * flicker})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(ix, iy - 60);
        ctx.lineTo(ix, iy + 60);
        ctx.stroke();

        // The pickup — a simple bright diamond
        ctx.fillStyle = `rgba(255, 255, 255, ${0.9 * flicker})`;
        ctx.beginPath();
        ctx.moveTo(ix, iy - 12);
        ctx.lineTo(ix + 8, iy);
        ctx.lineTo(ix, iy + 12);
        ctx.lineTo(ix - 8, iy);
        ctx.closePath();
        ctx.fill();
      }

      // === PARTICLES ===
      for (const p of game.particles) {
        ctx.globalAlpha = Math.min(1, p.life * 1.5);
        ctx.fillStyle = p.color;
        if (p.type === 'sparkle') {
          ctx.fillRect(p.x - 1, p.y - 1, 2, 2);
        } else {
          ctx.beginPath();
          ctx.arc(p.x, p.y, Math.max(1, p.size * p.life), 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;

      // === PLAYER — a shard of ice, not a cartoon ===
      const size = game.playerSize;
      const x = game.playerX;
      const y = game.playerY;
      const halfS = size / 2;

      // Trail — fading afterimage
      ctx.fillStyle = `rgba(170, 238, 255, ${0.03 * sizePercent})`;
      ctx.fillRect(x - halfS * 0.6, y + halfS, halfS * 1.2, 30);

      // Glow — gets redder as you shrink
      const r = Math.floor(255 * (1 - sizePercent));
      const g = Math.floor(238 * sizePercent);
      const b = Math.floor(255 * sizePercent);
      const glowAlpha = 0.15 + (1 - sizePercent) * 0.15;
      const glow = ctx.createRadialGradient(x, y, 0, x, y, size * 1.2);
      glow.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${glowAlpha})`);
      glow.addColorStop(1, 'transparent');
      ctx.fillStyle = glow;
      ctx.fillRect(x - size * 1.5, y - size * 1.5, size * 3, size * 3);

      // Body — sharp geometric shard, pure white fading to grey as it melts
      const brightness = Math.floor(180 + 75 * sizePercent);
      const bodyColor = `rgb(${brightness}, ${brightness}, ${brightness})`;
      ctx.fillStyle = bodyColor;
      ctx.beginPath();
      ctx.moveTo(x, y - halfS);           // top point
      ctx.lineTo(x + halfS, y);           // right
      ctx.lineTo(x + halfS * 0.6, y + halfS); // bottom right
      ctx.lineTo(x - halfS * 0.6, y + halfS); // bottom left
      ctx.lineTo(x - halfS, y);           // left
      ctx.closePath();
      ctx.fill();

      // Internal fracture line
      ctx.strokeStyle = `rgba(170, 238, 255, ${0.2 * sizePercent})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x - halfS * 0.3, y - halfS * 0.4);
      ctx.lineTo(x + halfS * 0.1, y + halfS * 0.3);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x + halfS * 0.2, y - halfS * 0.2);
      ctx.lineTo(x - halfS * 0.1, y + halfS * 0.5);
      ctx.stroke();

      // Highlight edge — top-left facet
      ctx.fillStyle = `rgba(255, 255, 255, ${0.15 + sizePercent * 0.1})`;
      ctx.beginPath();
      ctx.moveTo(x, y - halfS);
      ctx.lineTo(x - halfS, y);
      ctx.lineTo(x - halfS * 0.5, y - halfS * 0.1);
      ctx.closePath();
      ctx.fill();

      // Melting drips — just thin lines falling off
      if (sizePercent < 0.7) {
        const dripAlpha = (0.7 - sizePercent) * 0.6;
        ctx.strokeStyle = `rgba(${brightness}, ${brightness}, ${brightness}, ${dripAlpha})`;
        ctx.lineWidth = 1.5;
        const d1 = Math.sin(t * 3) * 4;
        ctx.beginPath();
        ctx.moveTo(x + halfS * 0.3, y + halfS);
        ctx.lineTo(x + halfS * 0.3, y + halfS + 8 + d1);
        ctx.stroke();
        if (sizePercent < 0.4) {
          const d2 = Math.sin(t * 4 + 1) * 3;
          ctx.beginPath();
          ctx.moveTo(x - halfS * 0.2, y + halfS);
          ctx.lineTo(x - halfS * 0.2, y + halfS + 6 + d2);
          ctx.stroke();
        }
      }

      ctx.restore();

      // === SCANLINES — CRT overlay ===
      ctx.fillStyle = 'rgba(0,0,0,0.04)';
      for (let sy = 0; sy < canvasSize.h; sy += 3) {
        ctx.fillRect(0, sy, canvasSize.w, 1);
      }

      // === VIGNETTE — always on, darker at edges ===
      const vig = ctx.createRadialGradient(
        canvasSize.w / 2, canvasSize.h / 2, canvasSize.h * 0.3,
        canvasSize.w / 2, canvasSize.h / 2, canvasSize.h * 0.7
      );
      vig.addColorStop(0, 'transparent');
      vig.addColorStop(1, 'rgba(0,0,0,0.5)');
      ctx.fillStyle = vig;
      ctx.fillRect(0, 0, canvasSize.w, canvasSize.h);

      // === DANGER VIGNETTE — red overlay when dying ===
      if (sizePercent < 0.25) {
        const pulse = Math.sin(t * 8) * 0.5 + 0.5;
        const dVig = ctx.createRadialGradient(
          canvasSize.w / 2, canvasSize.h / 2, canvasSize.h * 0.15,
          canvasSize.w / 2, canvasSize.h / 2, canvasSize.h * 0.55
        );
        dVig.addColorStop(0, 'transparent');
        dVig.addColorStop(1, `rgba(255, 34, 0, ${pulse * 0.4})`);
        ctx.fillStyle = dVig;
        ctx.fillRect(0, 0, canvasSize.w, canvasSize.h);
      }

      // === POPUP TEXT ===
      if (game.popupText && game.popupTimer > 0) {
        const popupAlpha = Math.min(1, game.popupTimer * 3);
        ctx.save();
        ctx.globalAlpha = popupAlpha;
        ctx.font = 'bold 36px ui-monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = game.popupText === 'OUCH!' ? THEME.danger : '#ffffff';
        ctx.fillText(game.popupText, canvasSize.w / 2, canvasSize.h * 0.38);
        ctx.restore();
      }

      // === HUD — minimal, out of the way ===
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 24px ui-monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`${game.score}`, 16, 36);

      // Multiplier
      const multiplier = 1 + sizePercent;
      if (multiplier >= 1.3) {
        ctx.fillStyle = THEME.textDim;
        ctx.font = '12px ui-monospace';
        ctx.fillText(`${multiplier.toFixed(1)}x`, 16, 54);
      }

      // Size bar — thin line at top right
      const barW = 60;
      const barX = canvasSize.w - barW - 16;
      const barY = 30;
      ctx.fillStyle = '#111';
      ctx.fillRect(barX, barY, barW, 3);
      ctx.fillStyle = sizePercent > 0.25 ? '#fff' : THEME.danger;
      ctx.fillRect(barX, barY, barW * Math.max(0, sizePercent), 3);
    };

    const gameLoop = (timestamp: number) => {
      const dt = Math.min((timestamp - lastTime) / 1000, 0.05);
      lastTime = timestamp;
      update(dt);
      draw();
      animationId = requestAnimationFrame(gameLoop);
    };
    animationId = requestAnimationFrame(gameLoop);

    // Touch controls — tap left half = left, right half = right
    let isTouchDevice = false;
    const handleTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      isTouchDevice = true;
      const midX = window.innerWidth / 2;
      switchLane(e.touches[0].clientX > midX ? 1 : -1);
    };

    // Mouse click — same logic, but skip if touch device (avoids double-fire)
    const handleClick = (e: MouseEvent) => {
      if (isTouchDevice) return;
      const rect = canvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const midX = rect.width / 2;
      switchLane(clickX > midX ? 1 : -1);
    };

    // Keyboard controls
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'a') switchLane(-1);
      if (e.key === 'ArrowRight' || e.key === 'd') switchLane(1);
    };

    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('click', handleClick);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      cancelAnimationFrame(animationId);
      stopMusic();
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('click', handleClick);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [gameState, canvasSize, spawnObstacles, switchLane]);

  return (
    <>
      <Script
        src="/pixelpit/social.js"
        strategy="afterInteractive"
        onLoad={() => setSocialLoaded(true)}
      />

      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: THEME.bg,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'ui-monospace, monospace',
        }}
      >
        {gameState === 'start' && (
          <div style={{ textAlign: 'center', padding: 30, maxWidth: 360 }}>
            <h1 style={{
              color: THEME.text,
              fontSize: 64,
              margin: '0 0 6px',
              fontWeight: 900,
              letterSpacing: '8px',
            }}>
              MELT
            </h1>
            <div style={{
              width: 40,
              height: 2,
              background: THEME.lavaMid,
              margin: '0 auto 28px',
            }} />
            <p style={{
              color: THEME.textDim,
              fontSize: 11,
              marginBottom: 36,
              lineHeight: 2.2,
              letterSpacing: '3px',
              textTransform: 'uppercase',
            }}>
              DODGE LAVA<br />
              COLLECT ICE<br />
              <span style={{ color: THEME.lavaMid }}>STAY ALIVE</span>
            </p>
            <button
              onClick={startGame}
              style={{
                background: 'transparent',
                color: THEME.text,
                border: `1px solid ${THEME.textDim}`,
                padding: '14px 56px',
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '6px',
                borderRadius: 0,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = THEME.text;
                e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = THEME.textDim;
                e.currentTarget.style.background = 'transparent';
              }}
            >
              START
            </button>
            <button
              onClick={() => setShowLeaderboard(true)}
              style={{
                display: 'block',
                margin: '24px auto 0',
                background: 'transparent',
                color: THEME.textDim,
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

        {showLeaderboard && gameState !== 'playing' && (
          <Leaderboard
            gameId={GAME_ID}
            limit={10}
            entryId={submittedEntryId ?? undefined}
            colors={LEADERBOARD_COLORS}
            onClose={() => setShowLeaderboard(false)}
            groupsEnabled={true}
            gameUrl={GAME_URL}
            socialLoaded={socialLoaded}
          />
        )}

        {gameState === 'playing' && (
          <canvas
            ref={canvasRef}
            width={canvasSize.w}
            height={canvasSize.h}
            style={{ touchAction: 'none' }}
          />
        )}

        {gameState === 'gameOver' && (
          <div style={{
            textAlign: 'center',
            padding: 20,
            maxWidth: 360,
            overflowY: 'auto',
            maxHeight: '100vh',
          }}>
            <h1 style={{
              color: THEME.danger,
              fontSize: 14,
              margin: '0 0 16px',
              fontWeight: 700,
              letterSpacing: '6px',
            }}>
              EVAPORATED
            </h1>
            <div style={{
              color: THEME.text,
              fontSize: 72,
              fontWeight: 900,
              marginBottom: 4,
              letterSpacing: '2px',
            }}>
              {score}
            </div>
            {score >= highScore && highScore > 0 && (
              <p style={{
                color: THEME.lavaMid,
                fontSize: 11,
                letterSpacing: '4px',
                marginBottom: 4,
              }}>
                NEW BEST
              </p>
            )}
            <p style={{
              color: THEME.textDim,
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
                <div style={{ color: THEME.lavaHot, fontSize: 13, fontWeight: 700 }}>+{progression.xpEarned} XP</div>
                <div style={{ color: THEME.textDim, fontSize: 12 }}>Level {progression.level}</div>
                {progression.streak > 1 && (
                  <div style={{ color: THEME.iceCore, fontSize: 12 }}>{progression.multiplier}x streak</div>
                )}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 12 }}>
              <button
                onClick={() => setShowLeaderboard(!showLeaderboard)}
                style={{
                  background: 'transparent',
                  color: THEME.textDim,
                  border: `1px solid ${THEME.textDim}`,
                  padding: '10px 16px',
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: '2px',
                  borderRadius: 0,
                  cursor: 'pointer',
                }}
              >
                {showLeaderboard ? 'HIDE' : 'RANKS'}
              </button>
              {user ? (
                <button
                  onClick={() => setShowShareModal(true)}
                  style={{
                    background: 'transparent',
                    color: THEME.textDim,
                    border: `1px solid ${THEME.textDim}`,
                    padding: '10px 16px',
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: '2px',
                    borderRadius: 0,
                    cursor: 'pointer',
                  }}
                >
                  SHARE / GROUPS
                </button>
              ) : (
                <ShareButtonContainer
                  id="share-btn-container"
                  url={`${GAME_URL}/share/${score}`}
                  text={`I scored ${score} on MELT! Can you survive the heat?`}
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
                border: `1px solid ${THEME.textDim}`,
                padding: '14px 44px',
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '6px',
                borderRadius: 0,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = THEME.text;
                e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = THEME.textDim;
                e.currentTarget.style.background = 'transparent';
              }}
            >
              AGAIN
            </button>
          </div>
        )}
      </div>

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
