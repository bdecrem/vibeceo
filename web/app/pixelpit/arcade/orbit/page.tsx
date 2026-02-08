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

const GAME_ID = 'orbit';

const TILE_SIZE = 60; // Taller lanes for clearer positioning
const PLAYER_SIZE = 20;
const ABDUCTION_TIMEOUT = 3000; // 3 seconds idle = abducted

// Level thresholds
const LEVEL_THRESHOLDS = [0, 25, 50]; // Level 1: 0-24, Level 2: 25-49, Level 3: 50+

// Level themes
const LEVEL_THEMES = {
  1: {
    name: 'EARTH ORBIT',
    skyTop: '#0a0a2a',
    skyBottom: '#1a1a4a',
    platform: '#4a4a5a',
    platformAccent: '#3a3a4a',
    lane: '#1E1B4B',
    laneGlow: '#7c3aed',
  },
  2: {
    name: 'DEEP SPACE',
    skyTop: '#1a0a2a',
    skyBottom: '#3a1a4a',
    platform: '#3a3a4a',
    platformAccent: '#2a2a3a',
    lane: '#2a1a3a',
    laneGlow: '#d946ef',
  },
  3: {
    name: 'VOID EDGE',
    skyTop: '#0a0505',
    skyBottom: '#1a0a0a',
    platform: '#2a2a2a',
    platformAccent: '#1a1a1a',
    lane: '#1a0a0a',
    laneGlow: '#ef4444',
  },
};

function getLevel(row: number): 1 | 2 | 3 {
  if (row >= 50) return 3;
  if (row >= 25) return 2;
  return 1;
}

// Lane types
type LaneType = 'platform' | 'lane' | 'debris' | 'beam';

interface Lane {
  y: number;
  type: LaneType;
  objects: LaneObject[];
  speed: number;
  direction: 1 | -1;
  hasWarning?: boolean;
  beamActive?: boolean;
}

interface LaneObject {
  x: number;
  width: number;
  type: 'ufo' | 'asteroid' | 'satellite' | 'mothership' | 'crystal';
  color?: string;
}

// Audio - PixelPit style (D minor, 95 BPM, punchy)
let audioCtx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let currentScore = 0; // For music intensity ramping

function initAudio() {
  if (audioCtx) return;
  audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  masterGain = audioCtx.createGain();
  masterGain.gain.value = 0.35;
  masterGain.connect(audioCtx.destination);
  if (audioCtx.state === 'suspended') audioCtx.resume();
}

// HOP: Soft sine boop, 300→600Hz, lowpass 800Hz, soft attack
function playHop() {
  if (!audioCtx || !masterGain) return;
  const t = audioCtx.currentTime;
  
  const osc = audioCtx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(300, t);
  osc.frequency.exponentialRampToValueAtTime(600, t + 0.12);
  
  // Lowpass at 800Hz to cut harshness
  const filter = audioCtx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 800;
  
  const gain = audioCtx.createGain();
  // Soft attack - fade in over 10ms
  gain.gain.setValueAtTime(0.001, t);
  gain.gain.linearRampToValueAtTime(0.07, t + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
  
  osc.connect(filter);
  filter.connect(gain);
  gain.connect(masterGain);
  
  osc.start(t);
  osc.stop(t + 0.12);
}

// ZAP/DEATH: Smooth sine "whomp", pitch dive, no noise
function playZap() {
  if (!audioCtx || !masterGain) return;
  const t = audioCtx.currentTime;
  
  // Smooth sine wave with pitch dive
  const osc = audioCtx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(300, t);
  osc.frequency.exponentialRampToValueAtTime(30, t + 0.25);
  
  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(0.1, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
  
  osc.connect(gain);
  gain.connect(masterGain);
  osc.start(t);
  osc.stop(t + 0.25);
  
  // Soft sub rumble
  const sub = audioCtx.createOscillator();
  sub.type = 'sine';
  sub.frequency.value = 40;
  const subGain = audioCtx.createGain();
  subGain.gain.setValueAtTime(0.08, t);
  subGain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
  sub.connect(subGain);
  subGain.connect(masterGain);
  sub.start(t);
  sub.stop(t + 0.3);
}

// VOID: Reverse reverb swell, detuned chord, sub bass (40% quieter)
function playVoid() {
  if (!audioCtx || !masterGain) return;
  const t = audioCtx.currentTime;
  
  // Detuned dissonant chord (D, Eb, A - unsettling)
  const freqs = [73.42, 77.78, 110]; // D2, Eb2, A2
  freqs.forEach((freq, i) => {
    const osc = audioCtx!.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq + (Math.random() - 0.5) * 2;
    const gain = audioCtx!.createGain();
    // Reverse reverb: volume swells IN then cuts (40% quieter)
    gain.gain.setValueAtTime(0.001, t);
    gain.gain.exponentialRampToValueAtTime(0.07, t + 0.4);
    gain.gain.setValueAtTime(0, t + 0.45);
    osc.connect(gain);
    gain.connect(masterGain!);
    osc.start(t);
    osc.stop(t + 0.5);
  });
  
  // Sub bass rumble (40% quieter)
  const sub = audioCtx.createOscillator();
  sub.type = 'sine';
  sub.frequency.value = 30;
  const subGain = audioCtx.createGain();
  subGain.gain.setValueAtTime(0.001, t);
  subGain.gain.exponentialRampToValueAtTime(0.15, t + 0.3);
  subGain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
  sub.connect(subGain);
  subGain.connect(masterGain);
  sub.start(t);
  sub.stop(t + 0.6);
}

// CRYSTAL: Gentle chime - lower octave, no noise, soft decay
function playCrystal() {
  if (!audioCtx || !masterGain) return;
  const t = audioCtx.currentTime;
  
  // Drop an octave (440 base instead of 880), slight randomization
  const baseFreq = 440 + (Math.random() - 0.5) * 20;
  const freqs = [baseFreq, baseFreq * 1.5, baseFreq * 2]; // Root, 5th, octave
  
  freqs.forEach((freq, i) => {
    const osc = audioCtx!.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;
    const gain = audioCtx!.createGain();
    // Softer: 0.04 gain, slower 0.25s decay
    gain.gain.setValueAtTime(0.04 - i * 0.01, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
    osc.connect(gain);
    gain.connect(masterGain!);
    osc.start(t);
    osc.stop(t + 0.25);
  });
  // No noise burst - cleaner sound
}

function playBeamWarning() {
  if (!audioCtx || !masterGain) return;
  const t = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sine';
  osc.frequency.value = 440;
  gain.gain.setValueAtTime(0.06, t);
  gain.gain.setValueAtTime(0, t + 0.1);
  gain.gain.setValueAtTime(0.06, t + 0.2);
  gain.gain.setValueAtTime(0, t + 0.3);
  osc.connect(gain);
  gain.connect(masterGain);
  osc.start(t);
  osc.stop(t + 0.3);
}

function playLevelUp(toLevel: 1 | 2 | 3 = 2) {
  if (!audioCtx || !masterGain) return;
  const t = audioCtx.currentTime;
  
  if (toLevel === 3) {
    // VOID DESCENT: Falling dissonant chord
    const notes = [D_MINOR.D5, D_MINOR.Bb4, D_MINOR.Eb4, D_MINOR.D3];
    notes.forEach((freq, i) => {
      const osc = audioCtx!.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.value = freq;
      osc.frequency.exponentialRampToValueAtTime(freq * 0.5, t + 0.5);
      const gain = audioCtx!.createGain();
      gain.gain.setValueAtTime(0, t + i * 0.1);
      gain.gain.linearRampToValueAtTime(0.06, t + i * 0.1 + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.1 + 0.6);
      osc.connect(gain);
      gain.connect(masterGain!);
      osc.start(t + i * 0.1);
      osc.stop(t + i * 0.1 + 0.7);
    });
    // Bass drop
    const bass = audioCtx.createOscillator();
    bass.type = 'sine';
    bass.frequency.value = 40;
    const bassGain = audioCtx.createGain();
    bassGain.gain.setValueAtTime(0.3, t + 0.3);
    bassGain.gain.exponentialRampToValueAtTime(0.001, t + 0.8);
    bass.connect(bassGain);
    bassGain.connect(masterGain);
    bass.start(t + 0.3);
    bass.stop(t + 0.8);
  } else {
    // Rising chord for L1→L2
    const notes = [D_MINOR.D4, D_MINOR.F4, D_MINOR.A4, D_MINOR.D5];
    notes.forEach((freq, i) => {
      const osc = audioCtx!.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const gain = audioCtx!.createGain();
      gain.gain.setValueAtTime(0, t + i * 0.08);
      gain.gain.linearRampToValueAtTime(0.08, t + i * 0.08 + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.08 + 0.4);
      osc.connect(gain);
      gain.connect(masterGain!);
      osc.start(t + i * 0.08);
      osc.stop(t + i * 0.08 + 0.5);
    });
  }
}

function playSpark() {
  if (!audioCtx || !masterGain) return;
  const t = audioCtx.currentTime;
  // Tiny crackle
  const noiseBuffer = audioCtx.createBuffer(1, audioCtx.sampleRate * 0.05, audioCtx.sampleRate);
  const noiseData = noiseBuffer.getChannelData(0);
  for (let i = 0; i < noiseData.length; i++) {
    noiseData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (noiseData.length * 0.15));
  }
  const noise = audioCtx.createBufferSource();
  noise.buffer = noiseBuffer;
  const filter = audioCtx.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.value = 2000;
  const gain = audioCtx.createGain();
  gain.gain.value = 0.04;
  noise.connect(filter);
  filter.connect(gain);
  gain.connect(masterGain);
  noise.start(t);
}

// MUSIC SYSTEM: D minor, 95 BPM, level-aware layers
let musicOscs: OscillatorNode[] = [];
let musicGains: GainNode[] = [];
let musicIntervals: NodeJS.Timeout[] = [];
let currentLevel = 1;

// D minor scale frequencies
const D_MINOR = {
  D2: 73.42, Eb2: 77.78, E2: 82.41, F2: 87.31, G2: 98, A2: 110, Bb2: 116.54, C3: 130.81,
  D3: 146.83, E3: 164.81, F3: 174.61, G3: 196, A3: 220, Bb3: 233.08, C4: 261.63,
  D4: 293.66, Eb4: 311.13, E4: 329.63, F4: 349.23, G4: 392, A4: 440, Bb4: 466.16, C5: 523.25, D5: 587.33
};

const BPM = 95;
const BEAT_MS = 60000 / BPM;
const SIXTEENTH = BEAT_MS / 4;

function startMusic(level: 1 | 2 | 3 = 1) {
  if (!audioCtx || !masterGain) return;
  stopMusic();
  currentLevel = level;
  
  // Level 3: VOID DRONE (sub-20Hz rumble you feel more than hear)
  if (level === 3) {
    const drone = audioCtx.createOscillator();
    drone.type = 'sine';
    drone.frequency.value = 18; // Sub-bass you feel
    const droneGain = audioCtx.createGain();
    droneGain.gain.value = 0.15;
    drone.connect(droneGain);
    droneGain.connect(masterGain);
    drone.start();
    musicOscs.push(drone);
    musicGains.push(droneGain);
  }
  
  // Atmospheric pad - Level 1: D minor, Level 2: Dm7 (add C), Level 3: NO PAD (void)
  if (level < 3) {
    const padNotes = level === 2 
      ? [D_MINOR.D2, D_MINOR.A2, D_MINOR.C3, D_MINOR.D3] // Dm7 - dreamier
      : [D_MINOR.D2, D_MINOR.A2, D_MINOR.D3];
    padNotes.forEach(freq => {
      const osc = audioCtx!.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const gain = audioCtx!.createGain();
      gain.gain.setValueAtTime(0, audioCtx!.currentTime);
      gain.gain.linearRampToValueAtTime(0.04, audioCtx!.currentTime + 2);
      osc.connect(gain);
      gain.connect(masterGain!);
      osc.start();
      musicOscs.push(osc);
      musicGains.push(gain);
    });
  }
  
  // Sub bass pulse - Level 3: every beat (more intense), else every 2 beats
  const bassRate = level === 3 ? BEAT_MS : BEAT_MS * 2;
  const bassInterval = setInterval(() => {
    if (!audioCtx || !masterGain) return;
    const t = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = D_MINOR.D2;
    const gain = audioCtx.createGain();
    const bassVol = level === 3 ? 0.2 : 0.15;
    gain.gain.setValueAtTime(bassVol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(t);
    osc.stop(t + 0.4);
  }, bassRate);
  musicIntervals.push(bassInterval);
  
  // Arpeggio - Level 2+: faster (8th notes), Level 3: add dissonance
  const arpRate = level >= 2 ? BEAT_MS / 2 : SIXTEENTH;
  const arpNotes = level === 3 
    ? [D_MINOR.D4, D_MINOR.Eb4, D_MINOR.A4, D_MINOR.D5, D_MINOR.Eb4, D_MINOR.A4] // Dissonant
    : [D_MINOR.D4, D_MINOR.F4, D_MINOR.A4, D_MINOR.D5, D_MINOR.A4, D_MINOR.F4];
  let arpIndex = 0;
  let filterFreq = 800 + level * 200;
  let filterDir = 1;
  
  const arpInterval = setInterval(() => {
    if (!audioCtx || !masterGain) return;
    const t = audioCtx.currentTime;
    
    const osc = audioCtx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = arpNotes[arpIndex];
    
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = filterFreq;
    filter.Q.value = 3 + level;
    
    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0.04 + level * 0.01, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(masterGain);
    osc.start(t);
    osc.stop(t + 0.15);
    
    arpIndex = (arpIndex + 1) % arpNotes.length;
    filterFreq += filterDir * 50;
    if (filterFreq > 2000 + level * 300) filterDir = -1;
    if (filterFreq < 400) filterDir = 1;
  }, arpRate);
  musicIntervals.push(arpInterval);
  
  // Hi-hat - Level 2+ only (8th notes)
  if (level >= 2) {
    const hihatInterval = setInterval(() => {
      if (!audioCtx || !masterGain) return;
      const t = audioCtx.currentTime;
      
      const noiseBuffer = audioCtx.createBuffer(1, audioCtx.sampleRate * 0.05, audioCtx.sampleRate);
      const noiseData = noiseBuffer.getChannelData(0);
      for (let i = 0; i < noiseData.length; i++) {
        noiseData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (noiseData.length * 0.1));
      }
      const noise = audioCtx.createBufferSource();
      noise.buffer = noiseBuffer;
      
      const highpass = audioCtx.createBiquadFilter();
      highpass.type = 'highpass';
      highpass.frequency.value = 8000;
      
      const gain = audioCtx.createGain();
      gain.gain.value = level === 3 ? 0.04 : 0.025;
      
      noise.connect(highpass);
      highpass.connect(gain);
      gain.connect(masterGain);
      noise.start(t);
    }, BEAT_MS / 2);
    musicIntervals.push(hihatInterval);
  }
  
  // Star twinkle (5% chance per beat)
  const twinkleInterval = setInterval(() => {
    if (!audioCtx || !masterGain) return;
    if (Math.random() > 0.05) return;
    
    const t = audioCtx.currentTime;
    const twinkleNotes = [D_MINOR.A4, D_MINOR.C5, D_MINOR.D5, D_MINOR.F4];
    const freq = twinkleNotes[Math.floor(Math.random() * twinkleNotes.length)];
    
    const osc = audioCtx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq * 2;
    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0.03, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(t);
    osc.stop(t + 0.3);
  }, BEAT_MS);
  musicIntervals.push(twinkleInterval);
}

function stopMusic() {
  for (const osc of musicOscs) {
    try { osc.stop(); } catch {}
  }
  musicOscs = [];
  musicGains = [];
  for (const interval of musicIntervals) {
    clearInterval(interval);
  }
  musicIntervals = [];
}

function updateMusicLevel(level: 1 | 2 | 3) {
  if (level !== currentLevel) {
    startMusic(level);
  }
}

function updateMusicIntensity(score: number) {
  currentScore = score;
}

const SCORE_FLOW_COLORS: ScoreFlowColors = {
  bg: '#0a0a2a',
  surface: '#1a1a3a',
  primary: '#7C3AED',
  secondary: '#22D3EE',
  text: '#E5E7EB',
  muted: '#6B7280',
  error: '#ef4444',
};

const LEADERBOARD_COLORS: LeaderboardColors = {
  bg: '#0a0a2a',
  surface: '#1a1a3a',
  primary: '#7C3AED',
  secondary: '#22D3EE',
  text: '#E5E7EB',
  muted: '#6B7280',
};

export default function OrbitGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<'start' | 'playing' | 'gameover' | 'leaderboard'>('start');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [canvasSize, setCanvasSize] = useState({ w: 400, h: 700 });
  const [socialLoaded, setSocialLoaded] = useState(false);
  const [submittedEntryId, setSubmittedEntryId] = useState<number | null>(null);
  const [progression, setProgression] = useState<ProgressionResult | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);

  const { user } = usePixelpitSocial(socialLoaded);

  const GAME_URL = typeof window !== 'undefined'
    ? `${window.location.origin}/pixelpit/arcade/${GAME_ID}`
    : `https://pixelpit.gg/pixelpit/arcade/${GAME_ID}`;

  const gameRef = useRef({
    running: false,
    playerX: 0,
    playerY: 0,
    playerRow: 0,
    maxRow: 0,
    targetX: 0,
    targetY: 0,
    isHopping: false,
    hopProgress: 0,
    lanes: [] as Lane[],
    cameraY: 0,
    lastMoveTime: 0,
    abductorActive: false,
    abductorX: 0,
    abductorY: 0,
    crystals: 0,
    deathType: '',
    displayScore: 0,
    level: 1 as 1 | 2 | 3,
    levelTransition: 0, // 0 = none, >0 = showing banner countdown
    transitionFlash: 0, // white/black flash timer
    stars: [] as { x: number; y: number; size: number; twinkle: number; color?: string }[],
    // Visual FX
    screenShake: { x: 0, y: 0 },
    comets: [] as { x: number; y: number; vx: number; vy: number; life: number }[],
    nebulaClouds: [] as { x: number; y: number; size: number; alpha: number }[],
    sparks: [] as { x: number; y: number; vx: number; vy: number; life: number }[],
  });

  const generateLane = useCallback((row: number, canvasW: number): Lane => {
    // First few rows are safe platforms
    if (row < 2) {
      return { y: -row * TILE_SIZE, type: 'platform', objects: [], speed: 0, direction: 1 };
    }
    
    const rand = Math.random();
    let type: LaneType;
    
    // No debris fields for first 15 lanes - easier start
    if (row < 15) {
      if (rand < 0.35) type = 'platform';
      else if (rand < 0.9) type = 'lane';
      else type = 'beam';
    } else {
      if (rand < 0.3) type = 'platform';
      else if (rand < 0.7) type = 'lane';
      else if (rand < 0.9) type = 'debris';
      else type = 'beam';
    }
    
    const direction = Math.random() < 0.5 ? 1 : -1 as 1 | -1;
    const baseSpeed = 1 + Math.min(row / 50, 2);
    let speed = baseSpeed * (0.5 + Math.random());
    
    const objects: LaneObject[] = [];
    const colors = ['#FF6B6B', '#4ECDC4', '#A855F7', '#22D3EE', '#F472B6'];
    
    if (type === 'lane') {
      // UFOs and asteroids
      const numObjects = 2 + Math.floor(Math.random() * 2);
      const gap = canvasW / numObjects;
      for (let i = 0; i < numObjects; i++) {
        const isAsteroid = Math.random() < 0.3;
        objects.push({
          x: i * gap + Math.random() * (gap * 0.5),
          width: isAsteroid ? 70 : 45,
          type: isAsteroid ? 'asteroid' : 'ufo',
          color: colors[Math.floor(Math.random() * colors.length)],
        });
      }
      speed *= 1.2;
    } else if (type === 'debris') {
      // Satellites to ride on
      const numSats = 2 + Math.floor(Math.random() * 2);
      const gap = canvasW / numSats;
      for (let i = 0; i < numSats; i++) {
        objects.push({
          x: i * gap + Math.random() * (gap * 0.3),
          width: 60 + Math.random() * 40,
          type: 'satellite',
        });
      }
      speed *= 0.6;
    } else if (type === 'beam') {
      speed = 8;
    }
    
    // Crystals on platforms sometimes
    if (type === 'platform' && Math.random() < 0.2) {
      objects.push({
        x: Math.random() * canvasW,
        width: 20,
        type: 'crystal',
      });
    }
    
    return { y: -row * TILE_SIZE, type, objects, speed, direction };
  }, []);

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

  const startGame = useCallback(() => {
    initAudio();
    startMusic(); // Start fresh music (iOS audio unlocked by button tap)
    const game = gameRef.current;
    game.running = true;
    game.playerRow = 0;
    game.maxRow = 0;
    game.playerX = canvasSize.w / 2;
    game.playerY = 0;
    game.targetX = game.playerX;
    game.targetY = game.playerY;
    game.isHopping = false;
    game.hopProgress = 0;
    game.cameraY = game.playerY - canvasSize.h * 0.7;
    game.lastMoveTime = Date.now();
    game.abductorActive = false;
    game.crystals = 0;
    game.displayScore = 0;
    game.level = 1;
    game.levelTransition = 0;
    game.transitionFlash = 0;
    game.deathType = '';
    game.screenShake = { x: 0, y: 0 };
    game.comets = [];
    game.sparks = [];

    setSubmittedEntryId(null);
    setProgression(null);
    setShowShareModal(false);
    
    // Generate stars with potential colors for level 2
    const starColors = ['#ffffff', '#a5b4fc', '#f9a8d4', '#fcd34d', '#67e8f9'];
    game.stars = [];
    for (let i = 0; i < 120; i++) {
      game.stars.push({
        x: Math.random() * canvasSize.w,
        y: Math.random() * 3000 - 1500,
        size: 1 + Math.random() * 2,
        twinkle: Math.random() * Math.PI * 2,
        color: starColors[Math.floor(Math.random() * starColors.length)],
      });
    }
    
    // Generate nebula clouds for level 2
    game.nebulaClouds = [];
    for (let i = 0; i < 8; i++) {
      game.nebulaClouds.push({
        x: Math.random() * canvasSize.w,
        y: Math.random() * 3000 - 1500,
        size: 100 + Math.random() * 150,
        alpha: 0.1 + Math.random() * 0.15,
      });
    }
    
    // Generate initial lanes
    game.lanes = [];
    for (let i = -5; i < 30; i++) {
      game.lanes.push(generateLane(i, canvasSize.w));
    }
    
    setScore(0);
    setGameState('playing');
  }, [generateLane, canvasSize]);

  // Handle resize
  useEffect(() => {
    const updateSize = () => {
      setCanvasSize({
        w: window.innerWidth,
        h: window.innerHeight,
      });
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = canvasSize.w;
    canvas.height = canvasSize.h;

    let animationId: number;
    let beamTimer = 0;

    const update = (dt: number) => {
      const game = gameRef.current;
      if (!game.running) return;

      // Level transition countdown
      if (game.levelTransition > 0) {
        game.levelTransition -= dt;
      }
      if (game.transitionFlash > 0) {
        game.transitionFlash -= dt;
      }

      // Level 3: Screen shake - MORE INTENSE (5% chance, 6px)
      if (game.level === 3 && Math.random() < 0.05) {
        game.screenShake = { 
          x: (Math.random() - 0.5) * 12, 
          y: (Math.random() - 0.5) * 12 
        };
      } else {
        game.screenShake.x *= 0.85;
        game.screenShake.y *= 0.85;
      }

      // Level 2+: Random comets - burst after transition (2% first 10s, then 0.5%)
      const cometChance = game.levelTransition > -8 && game.level >= 2 ? 0.02 : 0.005;
      if (game.level >= 2 && Math.random() < cometChance) {
        game.comets.push({
          x: -50,
          y: game.cameraY + Math.random() * canvasSize.h,
          vx: 8 + Math.random() * 4,
          vy: 2 + Math.random() * 2,
          life: 1,
        });
      }
      // Update comets
      game.comets = game.comets.filter(c => {
        c.x += c.vx;
        c.y += c.vy;
        c.life -= dt * 0.5;
        return c.life > 0 && c.x < canvasSize.w + 100;
      });

      // Update sparks (from damaged satellites in level 3)
      game.sparks = game.sparks.filter(s => {
        s.x += s.vx;
        s.y += s.vy;
        s.vy += 50 * dt; // gravity
        s.life -= dt * 2;
        return s.life > 0;
      });

      const now = Date.now();

      // Abductor (alien mothership if idle)
      if (!game.abductorActive && now - game.lastMoveTime > ABDUCTION_TIMEOUT) {
        game.abductorActive = true;
        game.abductorX = -100;
        game.abductorY = game.playerY - 50;
      }

      if (game.abductorActive) {
        game.abductorX += 6;
        if (game.abductorX > game.playerX - 20 && game.abductorX < game.playerX + 20) {
          game.running = false;
          game.deathType = 'abducted';
          stopMusic();
          playVoid();
          if (game.maxRow > highScore) setHighScore(game.maxRow);
          setGameState('gameover');
          fetch('/api/pixelpit/stats', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ game: GAME_ID }),
          }).catch(() => {});
          return;
        }
      }

      // Update hop animation
      if (game.isHopping) {
        game.hopProgress += dt * 8;
        if (game.hopProgress >= 1) {
          game.isHopping = false;
          game.hopProgress = 0;
          game.playerX = game.targetX;
          game.playerY = game.targetY;
        } else {
          game.playerX = game.playerX + (game.targetX - game.playerX) * 0.3;
          game.playerY = game.playerY + (game.targetY - game.playerY) * 0.3;
        }
      }

      // Camera follows player
      const targetCameraY = game.playerY - canvasSize.h * 0.7;
      game.cameraY += (targetCameraY - game.cameraY) * 0.1;

      // Update lane objects
      for (const lane of game.lanes) {
        for (const obj of lane.objects) {
          if (obj.type !== 'crystal') {
            obj.x += lane.speed * lane.direction;
            
            if (lane.direction > 0 && obj.x > canvasSize.w + obj.width) {
              obj.x = -obj.width;
            } else if (lane.direction < 0 && obj.x < -obj.width) {
              obj.x = canvasSize.w + obj.width;
            }
          }
        }

        // Beam logic (like trains)
        if (lane.type === 'beam') {
          beamTimer += dt;
          if (!lane.beamActive && beamTimer > 3 + Math.random() * 4) {
            lane.beamActive = true;
            lane.hasWarning = true;
            playBeamWarning();
            setTimeout(() => {
              if (lane.beamActive) {
                lane.objects = [{
                  x: lane.direction > 0 ? -200 : canvasSize.w + 200,
                  width: 200,
                  type: 'mothership',
                }];
                setTimeout(() => {
                  lane.beamActive = false;
                  lane.hasWarning = false;
                  lane.objects = [];
                  beamTimer = 0;
                }, 2000);
              }
            }, 1000);
          }
        }
      }

      // Check player collision
      const currentLane = game.lanes.find(l => Math.abs(l.y - (-game.playerRow * TILE_SIZE)) < 5);
      if (currentLane && !game.isHopping) {
        // Debris field - must be on satellite
        if (currentLane.type === 'debris') {
          let onSatellite = false;
          for (const obj of currentLane.objects) {
            if (obj.type === 'satellite') {
              // Generous hitbox for landing on satellites (player-favorable)
              if (game.playerX > obj.x - 15 && game.playerX < obj.x + obj.width + 15) {
                onSatellite = true;
                game.playerX += currentLane.speed * currentLane.direction;
                game.targetX = game.playerX;
                break;
              }
            }
          }
          if (!onSatellite) {
            game.running = false;
            game.deathType = 'void';
            stopMusic();
            playVoid();
            if (game.maxRow > highScore) setHighScore(game.maxRow);
            setGameState('gameover');
            fetch('/api/pixelpit/stats', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ game: GAME_ID }),
            }).catch(() => {});
            return;
          }
        }

        // Lane or beam - check UFO/asteroid/mothership collision
        if (currentLane.type === 'lane' || currentLane.type === 'beam') {
          for (const obj of currentLane.objects) {
            if (obj.type === 'ufo' || obj.type === 'asteroid' || obj.type === 'mothership') {
              // Tight hitbox for hazards (player-favorable, near misses = safe)
              if (game.playerX > obj.x + 5 && game.playerX < obj.x + obj.width - 5) {
                game.running = false;
                game.deathType = obj.type === 'mothership' ? 'beam' : 'collision';
                stopMusic();
                playZap();
                if (game.maxRow > highScore) setHighScore(game.maxRow);
                setGameState('gameover');
                fetch('/api/pixelpit/stats', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ game: GAME_ID }),
                }).catch(() => {});
                return;
              }
            }
          }
        }

        // Crystal collection
        for (let i = currentLane.objects.length - 1; i >= 0; i--) {
          const obj = currentLane.objects[i];
          if (obj.type === 'crystal' && Math.abs(game.playerX - obj.x) < 30) {
            currentLane.objects.splice(i, 1);
            game.crystals++;
            playCrystal();
          }
        }
      }

      // Generate more lanes ahead
      const maxLaneRow = Math.max(...game.lanes.map(l => -l.y / TILE_SIZE));
      if (game.playerRow > maxLaneRow - 20) {
        for (let i = 0; i < 10; i++) {
          game.lanes.push(generateLane(Math.floor(maxLaneRow) + i + 1, canvasSize.w));
        }
      }

      // Remove old lanes
      game.lanes = game.lanes.filter(l => -l.y / TILE_SIZE > game.playerRow - 10);
    };

    const draw = () => {
      const game = gameRef.current;
      const theme = LEVEL_THEMES[game.level];
      
      // Apply screen shake
      ctx.save();
      ctx.translate(game.screenShake.x, game.screenShake.y);
      
      // Level-based background
      const gradient = ctx.createLinearGradient(0, 0, 0, canvasSize.h);
      gradient.addColorStop(0, theme.skyTop);
      gradient.addColorStop(1, theme.skyBottom);
      ctx.fillStyle = gradient;
      ctx.fillRect(-10, -10, canvasSize.w + 20, canvasSize.h + 20);

      // Level 3: Black hole in distance
      if (game.level === 3) {
        const bhX = canvasSize.w / 2;
        const bhY = 80;
        // Outer glow
        const bhGrad = ctx.createRadialGradient(bhX, bhY, 0, bhX, bhY, 120);
        bhGrad.addColorStop(0, 'rgba(0, 0, 0, 1)');
        bhGrad.addColorStop(0.3, 'rgba(30, 0, 0, 0.8)');
        bhGrad.addColorStop(0.6, 'rgba(80, 0, 0, 0.3)');
        bhGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = bhGrad;
        ctx.beginPath();
        ctx.arc(bhX, bhY, 120, 0, Math.PI * 2);
        ctx.fill();
        // Core
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(bhX, bhY, 25, 0, Math.PI * 2);
        ctx.fill();
        // Accretion ring
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(bhX, bhY, 50, 15, 0, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Level 2: Nebula clouds
      if (game.level >= 2) {
        for (const cloud of game.nebulaClouds) {
          const screenY = cloud.y - game.cameraY * 0.3; // Parallax
          if (screenY < -cloud.size || screenY > canvasSize.h + cloud.size) continue;
          const nebulaGrad = ctx.createRadialGradient(cloud.x, screenY, 0, cloud.x, screenY, cloud.size);
          const nebulaColor = game.level === 3 ? '139, 0, 0' : '168, 85, 247';
          nebulaGrad.addColorStop(0, `rgba(${nebulaColor}, ${cloud.alpha})`);
          nebulaGrad.addColorStop(0.5, `rgba(${nebulaColor}, ${cloud.alpha * 0.5})`);
          nebulaGrad.addColorStop(1, `rgba(${nebulaColor}, 0)`);
          ctx.fillStyle = nebulaGrad;
          ctx.beginPath();
          ctx.arc(cloud.x, screenY, cloud.size, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Level 1: Earth in distance at bottom
      if (game.level === 1 && game.cameraY < 500) {
        const earthY = canvasSize.h + 100 - game.cameraY * 0.2;
        if (earthY < canvasSize.h + 200) {
          // Earth glow
          const earthGrad = ctx.createRadialGradient(canvasSize.w / 2, earthY, 80, canvasSize.w / 2, earthY, 150);
          earthGrad.addColorStop(0, 'rgba(59, 130, 246, 0.3)');
          earthGrad.addColorStop(1, 'rgba(59, 130, 246, 0)');
          ctx.fillStyle = earthGrad;
          ctx.beginPath();
          ctx.arc(canvasSize.w / 2, earthY, 150, 0, Math.PI * 2);
          ctx.fill();
          // Earth body
          ctx.fillStyle = '#1e40af';
          ctx.beginPath();
          ctx.arc(canvasSize.w / 2, earthY, 80, 0, Math.PI * 2);
          ctx.fill();
          // Continents
          ctx.fillStyle = '#22c55e';
          ctx.beginPath();
          ctx.ellipse(canvasSize.w / 2 - 20, earthY - 10, 25, 15, 0.3, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.ellipse(canvasSize.w / 2 + 30, earthY + 20, 20, 12, -0.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Level 2: Gas giant in upper corner
      if (game.level === 2) {
        const giantX = canvasSize.w - 80;
        const giantY = 120;
        // Outer glow
        const giantGrad = ctx.createRadialGradient(giantX, giantY, 40, giantX, giantY, 100);
        giantGrad.addColorStop(0, 'rgba(251, 146, 60, 0.4)');
        giantGrad.addColorStop(0.5, 'rgba(249, 115, 22, 0.2)');
        giantGrad.addColorStop(1, 'rgba(249, 115, 22, 0)');
        ctx.fillStyle = giantGrad;
        ctx.beginPath();
        ctx.arc(giantX, giantY, 100, 0, Math.PI * 2);
        ctx.fill();
        // Planet body
        ctx.fillStyle = '#ea580c';
        ctx.beginPath();
        ctx.arc(giantX, giantY, 50, 0, Math.PI * 2);
        ctx.fill();
        // Bands
        ctx.strokeStyle = '#c2410c';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(giantX, giantY, 35, 0.2, Math.PI - 0.2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(giantX, giantY, 25, 0.3, Math.PI - 0.3);
        ctx.stroke();
        // Ring
        ctx.strokeStyle = 'rgba(251, 191, 36, 0.5)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(giantX, giantY, 70, 15, -0.2, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Stars
      for (const star of game.stars) {
        let screenY = star.y - game.cameraY;
        let spaghettiFactor = 0; // How close to black hole (0-1)
        
        // Level 3: Stars get pulled toward black hole + spaghettification
        if (game.level === 3) {
          const pullX = canvasSize.w / 2 - star.x;
          const pullY = 80 - screenY;
          const dist = Math.sqrt(pullX * pullX + pullY * pullY);
          if (dist < 300 && dist > 30) {
            const pull = 0.025 * (300 - dist) / 300;
            star.x += pullX * pull;
            screenY += pullY * pull * 0.5;
            spaghettiFactor = Math.max(0, 1 - dist / 150); // Closer = whiter
          }
          // Skip stars that got too close (consumed by black hole)
          if (dist < 40) continue;
        }
        
        if (screenY < -10 || screenY > canvasSize.h + 10) continue;
        const twinkle = 0.5 + 0.5 * Math.sin(Date.now() / 500 + star.twinkle);
        
        // Level-based star colors
        let starColor: string;
        if (game.level === 3) {
          // Spaghettification: fade from red to WHITE as they approach black hole
          const r = 255;
          const g = Math.floor(150 + spaghettiFactor * 105);
          const b = Math.floor(150 + spaghettiFactor * 105);
          const alpha = twinkle * (0.6 + spaghettiFactor * 0.4);
          starColor = `rgba(${r}, ${g}, ${b}, ${alpha})`;
        } else if (game.level === 2) {
          // Use colorful stars
          const rgb = star.color === '#a5b4fc' ? '165, 180, 252' 
                    : star.color === '#f9a8d4' ? '249, 168, 212'
                    : star.color === '#fcd34d' ? '252, 211, 77'
                    : star.color === '#67e8f9' ? '103, 232, 249'
                    : '255, 255, 255';
          starColor = `rgba(${rgb}, ${twinkle * 0.9})`;
        } else {
          starColor = `rgba(255, 255, 255, ${twinkle * 0.8})`;
        }
        ctx.fillStyle = starColor;
        ctx.beginPath();
        ctx.arc(star.x, screenY, star.size * (1 + spaghettiFactor * 0.5), 0, Math.PI * 2);
        ctx.fill();
      }

      // Comets (level 2+)
      for (const comet of game.comets) {
        const screenY = comet.y - game.cameraY;
        ctx.strokeStyle = `rgba(255, 255, 255, ${comet.life})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(comet.x, screenY);
        ctx.lineTo(comet.x - 30, screenY - 10);
        ctx.stroke();
        ctx.fillStyle = `rgba(255, 255, 255, ${comet.life})`;
        ctx.beginPath();
        ctx.arc(comet.x, screenY, 3, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw lanes
      for (const lane of game.lanes) {
        const screenY = lane.y - game.cameraY;
        if (screenY < -TILE_SIZE * 2 || screenY > canvasSize.h + TILE_SIZE) continue;

        // Lane background - level themed
        if (lane.type === 'platform') {
          ctx.fillStyle = theme.platform;
          ctx.fillRect(0, screenY, canvasSize.w, TILE_SIZE);
          // Crater/detail
          ctx.fillStyle = theme.platformAccent;
          for (let cx = 30; cx < canvasSize.w; cx += 80) {
            ctx.beginPath();
            ctx.arc(cx, screenY + 25, 8, 0, Math.PI * 2);
            ctx.fill();
          }
          // Level 3: warning stripes
          if (game.level === 3) {
            ctx.strokeStyle = '#ef4444';
            ctx.lineWidth = 2;
            for (let sx = 0; sx < canvasSize.w; sx += 40) {
              ctx.beginPath();
              ctx.moveTo(sx, screenY);
              ctx.lineTo(sx + 20, screenY + TILE_SIZE);
              ctx.stroke();
            }
          }
        } else if (lane.type === 'lane') {
          ctx.fillStyle = theme.lane;
          ctx.fillRect(0, screenY, canvasSize.w, TILE_SIZE);
          ctx.strokeStyle = theme.laneGlow;
          ctx.lineWidth = 2;
          ctx.setLineDash([15, 15]);
          ctx.beginPath();
          ctx.moveTo(0, screenY + TILE_SIZE / 2);
          ctx.lineTo(canvasSize.w, screenY + TILE_SIZE / 2);
          ctx.stroke();
          ctx.setLineDash([]);
        } else if (lane.type === 'debris') {
          ctx.fillStyle = '#030712';
          ctx.fillRect(0, screenY, canvasSize.w, TILE_SIZE);
          // Void particles - level colored
          ctx.fillStyle = game.level === 3 ? '#7f1d1d' : game.level === 2 ? '#581c87' : '#4B5563';
          for (let px = 10; px < canvasSize.w; px += 30) {
            ctx.beginPath();
            ctx.arc(px + Math.sin(Date.now() / 1000 + px) * 5, screenY + 25, 2, 0, Math.PI * 2);
            ctx.fill();
          }
        } else if (lane.type === 'beam') {
          ctx.fillStyle = '#1C1917';
          ctx.fillRect(0, screenY, canvasSize.w, TILE_SIZE);
          if (lane.hasWarning) {
            ctx.fillStyle = Math.floor(Date.now() / 200) % 2 ? '#EF4444' : '#7F1D1D';
            ctx.beginPath();
            ctx.arc(30, screenY + 25, 8, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        // Draw objects - level themed
        for (const obj of lane.objects) {
          const objY = screenY + TILE_SIZE / 2;
          
          if (obj.type === 'ufo') {
            // UFO - Level 1: classic, Level 2: angular magenta + trail, Level 3: menacing red + eyes
            const ufoColor = game.level === 3 ? '#dc2626' : game.level === 2 ? '#d946ef' : (obj.color || '#A855F7');
            const domeColor = game.level === 3 ? '#ef4444' : game.level === 2 ? '#f0abfc' : '#22D3EE';
            
            // Level 2+: Trail behind UFO
            if (game.level >= 2) {
              const trailColor = game.level === 3 ? 'rgba(239, 68, 68, 0.3)' : 'rgba(217, 70, 239, 0.4)';
              ctx.fillStyle = trailColor;
              const trailDir = lane.direction > 0 ? -1 : 1;
              for (let t = 1; t <= 4; t++) {
                ctx.globalAlpha = 0.3 - t * 0.06;
                ctx.beginPath();
                ctx.ellipse(obj.x + obj.width / 2 + trailDir * t * 12, objY, 8, 6, 0, 0, Math.PI * 2);
                ctx.fill();
              }
              ctx.globalAlpha = 1;
            }
            
            ctx.fillStyle = ufoColor;
            if (game.level >= 2) {
              // Angular shape for level 2+
              ctx.beginPath();
              ctx.moveTo(obj.x, objY);
              ctx.lineTo(obj.x + obj.width * 0.3, objY - 10);
              ctx.lineTo(obj.x + obj.width * 0.7, objY - 10);
              ctx.lineTo(obj.x + obj.width, objY);
              ctx.lineTo(obj.x + obj.width * 0.7, objY + 8);
              ctx.lineTo(obj.x + obj.width * 0.3, objY + 8);
              ctx.closePath();
              ctx.fill();
            } else {
              ctx.beginPath();
              ctx.ellipse(obj.x + obj.width / 2, objY, obj.width / 2, 12, 0, 0, Math.PI * 2);
              ctx.fill();
            }
            ctx.fillStyle = domeColor;
            ctx.beginPath();
            ctx.arc(obj.x + obj.width / 2, objY - 8, 10, Math.PI, 0);
            ctx.fill();
            
            // Level 3: Glowing red eyes
            if (game.level === 3) {
              ctx.fillStyle = '#ff0000';
              ctx.shadowColor = '#ff0000';
              ctx.shadowBlur = 8;
              ctx.beginPath();
              ctx.arc(obj.x + obj.width / 2 - 4, objY - 8, 2, 0, Math.PI * 2);
              ctx.fill();
              ctx.beginPath();
              ctx.arc(obj.x + obj.width / 2 + 4, objY - 8, 2, 0, Math.PI * 2);
              ctx.fill();
              ctx.shadowBlur = 0;
            }
            
            // Lights
            ctx.fillStyle = game.level === 3 ? '#fca5a5' : '#FBBF24';
            for (let l = 0; l < 3; l++) {
              ctx.beginPath();
              ctx.arc(obj.x + 10 + l * 12, objY + 5, 3, 0, Math.PI * 2);
              ctx.fill();
            }
          } else if (obj.type === 'asteroid') {
            // Asteroid - Level 1: gray, Level 2: purple crystal, Level 3: black shards
            const astColor = game.level === 3 ? '#1f1f1f' : game.level === 2 ? '#7c3aed' : '#78716C';
            const astAccent = game.level === 3 ? '#374151' : game.level === 2 ? '#a78bfa' : '#57534E';
            
            // Level 2: Glowing crystal asteroids
            if (game.level === 2) {
              ctx.shadowColor = '#a78bfa';
              ctx.shadowBlur = 15;
            }
            
            ctx.fillStyle = astColor;
            if (game.level === 3) {
              // Jagged shards
              ctx.beginPath();
              ctx.moveTo(obj.x + obj.width / 2, objY - 15);
              ctx.lineTo(obj.x + obj.width * 0.8, objY - 5);
              ctx.lineTo(obj.x + obj.width, objY + 5);
              ctx.lineTo(obj.x + obj.width * 0.6, objY + 12);
              ctx.lineTo(obj.x + obj.width * 0.3, objY + 8);
              ctx.lineTo(obj.x, objY);
              ctx.lineTo(obj.x + obj.width * 0.2, objY - 10);
              ctx.closePath();
              ctx.fill();
            } else {
              ctx.beginPath();
              ctx.arc(obj.x + obj.width / 2, objY, obj.width / 3, 0, Math.PI * 2);
              ctx.fill();
              ctx.fillStyle = astAccent;
              ctx.beginPath();
              ctx.arc(obj.x + obj.width / 2 - 8, objY - 5, 8, 0, Math.PI * 2);
              ctx.fill();
            }
            ctx.shadowBlur = 0;
          } else if (obj.type === 'satellite') {
            // Satellite - Level 1: standard, Level 2: rusted, Level 3: emergency beacon
            const satColor = game.level === 3 ? '#991b1b' : game.level === 2 ? '#78716c' : '#6B7280';
            const panelColor = game.level === 3 ? '#450a0a' : game.level === 2 ? '#44403c' : '#1E40AF';
            ctx.fillStyle = satColor;
            ctx.fillRect(obj.x, objY - 8, obj.width, 16);
            ctx.fillStyle = panelColor;
            ctx.fillRect(obj.x - 15, objY - 12, 15, 24);
            ctx.fillRect(obj.x + obj.width, objY - 12, 15, 24);
            // Level 3: flashing beacon + sparks
            if (game.level === 3) {
              if (Math.floor(Date.now() / 300) % 2) {
                ctx.fillStyle = '#ef4444';
                ctx.beginPath();
                ctx.arc(obj.x + obj.width / 2, objY - 12, 4, 0, Math.PI * 2);
                ctx.fill();
              }
              // Random sparks with crackle sound
              if (Math.random() < 0.03) {
                for (let s = 0; s < 3; s++) {
                  game.sparks.push({
                    x: obj.x + Math.random() * obj.width,
                    y: lane.y + TILE_SIZE / 2,
                    vx: (Math.random() - 0.5) * 60,
                    vy: -Math.random() * 40 - 20,
                    life: 0.5 + Math.random() * 0.5,
                  });
                }
                playSpark();
              }
            } else {
              ctx.strokeStyle = '#9CA3AF';
              ctx.lineWidth = 2;
              ctx.beginPath();
              ctx.moveTo(obj.x + obj.width / 2, objY - 8);
              ctx.lineTo(obj.x + obj.width / 2, objY - 20);
              ctx.stroke();
            }
          } else if (obj.type === 'mothership') {
            ctx.fillStyle = '#1F2937';
            ctx.fillRect(obj.x, objY - 25, obj.width, 50);
            ctx.fillStyle = '#DC2626';
            ctx.fillRect(obj.x, objY - 25, 40, 50);
            ctx.fillStyle = '#22D3EE';
            for (let w = 50; w < obj.width - 20; w += 30) {
              ctx.fillRect(obj.x + w, objY - 10, 20, 15);
            }
            ctx.fillStyle = 'rgba(34, 211, 238, 0.3)';
            ctx.beginPath();
            ctx.moveTo(obj.x + obj.width / 2 - 30, objY + 25);
            ctx.lineTo(obj.x + obj.width / 2 + 30, objY + 25);
            ctx.lineTo(obj.x + obj.width / 2 + 50, objY + 100);
            ctx.lineTo(obj.x + obj.width / 2 - 50, objY + 100);
            ctx.fill();
          } else if (obj.type === 'crystal') {
            // Energy crystal
            ctx.fillStyle = '#22D3EE';
            ctx.shadowColor = '#22D3EE';
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.moveTo(obj.x, objY);
            ctx.lineTo(obj.x + 8, objY - 12);
            ctx.lineTo(obj.x + 16, objY);
            ctx.lineTo(obj.x + 8, objY + 12);
            ctx.closePath();
            ctx.fill();
            ctx.shadowBlur = 0;
          }
        }
      }

      // Draw player (astronaut) - cute, iconic, clear silhouette
      const playerScreenX = game.playerX;
      const playerScreenY = game.playerY - game.cameraY;
      const hopOffset = game.isHopping ? Math.sin(game.hopProgress * Math.PI) * 15 : 0;
      const px = playerScreenX;
      const py = playerScreenY + TILE_SIZE / 2 - hopOffset;
      
      // Player art fits within ~40px wide x 50px tall (within TILE_SIZE lane)
      
      // Shadow (ground contact)
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.beginPath();
      ctx.ellipse(px, playerScreenY + TILE_SIZE - 6, 10, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      
      // Jetpack (behind body)
      ctx.fillStyle = '#4B5563';
      const jpX = px + 8;
      const jpY = py + 2;
      ctx.beginPath();
      ctx.roundRect(jpX, jpY - 8, 6, 14, 2);
      ctx.fill();
      // Jetpack thrusters
      ctx.fillStyle = '#374151';
      ctx.beginPath();
      ctx.arc(jpX + 3, jpY + 8, 3, 0, Math.PI * 2);
      ctx.fill();
      // Thruster glow (subtle)
      if (game.isHopping) {
        ctx.fillStyle = 'rgba(251, 146, 60, 0.6)';
        ctx.beginPath();
        ctx.ellipse(jpX + 3, jpY + 14, 2, 4, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      
      // Body (compact white suit)
      ctx.fillStyle = '#F9FAFB';
      ctx.beginPath();
      ctx.roundRect(px - 7, py - 2, 14, 16, 4);
      ctx.fill();
      // Body outline
      ctx.strokeStyle = '#D1D5DB';
      ctx.lineWidth = 1;
      ctx.stroke();
      
      // Suit stripe (cyan accent)
      ctx.fillStyle = '#22D3EE';
      ctx.fillRect(px - 2, py + 2, 4, 10);
      
      // Helmet (big bubble - cute proportions)
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(px, py - 10, 11, 0, Math.PI * 2);
      ctx.fill();
      // Helmet rim
      ctx.strokeStyle = '#E5E7EB';
      ctx.lineWidth = 2;
      ctx.stroke();
      
      // Visor (golden, reflective)
      const visorGrad = ctx.createLinearGradient(px - 6, py - 16, px + 6, py - 4);
      visorGrad.addColorStop(0, '#FCD34D');
      visorGrad.addColorStop(0.5, '#F59E0B');
      visorGrad.addColorStop(1, '#D97706');
      ctx.fillStyle = visorGrad;
      ctx.beginPath();
      ctx.arc(px, py - 10, 7, 0, Math.PI * 2);
      ctx.fill();
      
      // Visor shine (two reflections)
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.beginPath();
      ctx.arc(px - 3, py - 13, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.beginPath();
      ctx.arc(px + 2, py - 8, 1.5, 0, Math.PI * 2);
      ctx.fill();
      
      // Antenna (adds silhouette + character)
      ctx.strokeStyle = '#9CA3AF';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(px, py - 21);
      ctx.lineTo(px, py - 28);
      ctx.stroke();
      // Antenna ball (blinks in sync with level)
      const antennaBlink = Math.sin(Date.now() / 300) > 0;
      ctx.fillStyle = game.level === 3 ? '#EF4444' : game.level === 2 ? '#A855F7' : '#22D3EE';
      if (antennaBlink) {
        ctx.shadowColor = ctx.fillStyle;
        ctx.shadowBlur = 6;
      }
      ctx.beginPath();
      ctx.arc(px, py - 30, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Abductor (alien ship)
      if (game.abductorActive) {
        const abductorScreenY = game.abductorY - game.cameraY;
        ctx.fillStyle = '#4C1D95';
        ctx.beginPath();
        ctx.ellipse(game.abductorX, abductorScreenY, 50, 20, 0, 0, Math.PI * 2);
        ctx.fill();
        // Beam
        ctx.fillStyle = 'rgba(167, 139, 250, 0.4)';
        ctx.beginPath();
        ctx.moveTo(game.abductorX - 20, abductorScreenY + 20);
        ctx.lineTo(game.abductorX + 20, abductorScreenY + 20);
        ctx.lineTo(game.abductorX + 40, abductorScreenY + 80);
        ctx.lineTo(game.abductorX - 40, abductorScreenY + 80);
        ctx.fill();
      }

      // UI
      ctx.fillStyle = '#FFF';
      ctx.font = 'bold 28px ui-monospace';
      ctx.textAlign = 'center';
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = 4;
      ctx.fillText(`${game.displayScore}`, canvasSize.w / 2, 40);
      
      ctx.font = '16px ui-monospace';
      ctx.fillText(`HI: ${highScore}`, canvasSize.w / 2, 65);
      
      if (game.crystals > 0) {
        ctx.fillStyle = '#22D3EE';
        ctx.fillText(`💎 ×${1 + game.crystals}`, canvasSize.w / 2, 90);
      }
      
      ctx.shadowBlur = 0;

      // Tap hint
      if (game.maxRow === 0) {
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.font = '16px ui-monospace';
        ctx.fillText('TAP TO JUMP FORWARD', canvasSize.w / 2, canvasSize.h - 100);
        ctx.fillText('SWIPE ← → TO MOVE', canvasSize.w / 2, canvasSize.h - 75);
      }
      
      // Draw sparks (from damaged satellites in level 3)
      for (const spark of game.sparks) {
        const screenY = spark.y - game.cameraY;
        ctx.fillStyle = `rgba(251, 191, 36, ${spark.life})`;
        ctx.beginPath();
        ctx.arc(spark.x, screenY, 2, 0, Math.PI * 2);
        ctx.fill();
      }

      // Level 3: Vignette (darkened edges)
      if (game.level === 3) {
        const vignetteGrad = ctx.createRadialGradient(
          canvasSize.w / 2, canvasSize.h / 2, canvasSize.h * 0.3,
          canvasSize.w / 2, canvasSize.h / 2, canvasSize.h * 0.8
        );
        vignetteGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
        vignetteGrad.addColorStop(1, 'rgba(0, 0, 0, 0.6)');
        ctx.fillStyle = vignetteGrad;
        ctx.fillRect(0, 0, canvasSize.w, canvasSize.h);
      }

      // Level transition banner
      if (game.levelTransition > 0) {
        const alpha = Math.min(game.levelTransition, 1);
        
        // Level 3: screen goes black first
        if (game.level === 3 && game.levelTransition > 1.2) {
          ctx.fillStyle = `rgba(0, 0, 0, ${(game.levelTransition - 1.2) * 3})`;
          ctx.fillRect(0, 0, canvasSize.w, canvasSize.h);
        }
        
        ctx.fillStyle = `rgba(0, 0, 0, ${alpha * 0.8})`;
        ctx.fillRect(0, canvasSize.h / 2 - 60, canvasSize.w, 120);
        
        ctx.fillStyle = theme.laneGlow;
        ctx.font = 'bold 36px ui-monospace';
        ctx.textAlign = 'center';
        ctx.shadowColor = theme.laneGlow;
        ctx.shadowBlur = 30;
        ctx.fillText(theme.name, canvasSize.w / 2, canvasSize.h / 2 + 12);
        ctx.shadowBlur = 0;
        
        // Particle burst effect
        if (game.levelTransition > 1) {
          const burstAlpha = game.levelTransition - 1;
          for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2 + Date.now() / 500;
            const dist = (1.5 - game.levelTransition) * 100 + 30;
            const px = canvasSize.w / 2 + Math.cos(angle) * dist;
            const py = canvasSize.h / 2 + Math.sin(angle) * dist;
            ctx.fillStyle = `rgba(255, 255, 255, ${burstAlpha * 0.5})`;
            ctx.beginPath();
            ctx.arc(px, py, 4, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      // Transition flash
      if (game.transitionFlash > 0) {
        const flashColor = game.level === 3 ? '0, 0, 0' : '255, 255, 255';
        ctx.fillStyle = `rgba(${flashColor}, ${game.transitionFlash * 2})`;
        ctx.fillRect(0, 0, canvasSize.w, canvasSize.h);
      }

      ctx.restore(); // End screen shake transform
    };

    let lastTime = 0;
    const gameLoop = (timestamp: number) => {
      const dt = Math.min((timestamp - lastTime) / 1000, 0.05);
      lastTime = timestamp;
      update(dt);
      draw();
      animationId = requestAnimationFrame(gameLoop);
    };
    animationId = requestAnimationFrame(gameLoop);

    // Input handling
    let touchStartX = 0;
    let touchStartY = 0;
    let touchStartTime = 0;

    const handleMove = (dx: number, dy: number) => {
      const game = gameRef.current;
      if (!game.running || game.isHopping) return;

      let newRow = game.playerRow;
      let newX = game.playerX;

      if (Math.abs(dx) > Math.abs(dy)) {
        if (dx > 30) newX += TILE_SIZE;
        else if (dx < -30) newX -= TILE_SIZE;
        else return;
      } else {
        if (dy < -30) {
          newRow++;
        } else if (dy > 30) {
          newRow = Math.max(0, newRow - 1);
        } else {
          newRow++;
        }
      }

      newX = Math.max(TILE_SIZE / 2, Math.min(canvasSize.w - TILE_SIZE / 2, newX));

      game.targetX = newX;
      game.targetY = -newRow * TILE_SIZE;
      game.playerRow = newRow;
      game.isHopping = true;
      game.hopProgress = 0;
      game.lastMoveTime = Date.now();
      game.abductorActive = false;

      if (newRow > game.maxRow) {
        game.maxRow = newRow;
        // Crystals = score multiplier: each hop worth (1 + crystals) points
        const points = 1 + game.crystals;
        game.displayScore += points;
        setScore(game.displayScore);
        updateMusicIntensity(newRow);
        
        // Check for level change
        const newLevel = getLevel(newRow);
        if (newLevel !== game.level) {
          game.level = newLevel;
          game.levelTransition = 1.5; // Show banner for 1.5 seconds
          game.transitionFlash = newLevel === 3 ? 0.3 : 0.15; // Black flash for void, white for others
          playLevelUp(newLevel);
          updateMusicLevel(newLevel);
        }
      }

      playHop();
    };

    const handleTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
      touchStartTime = Date.now();
    };

    const handleTouchEnd = (e: TouchEvent) => {
      e.preventDefault();
      const dx = e.changedTouches[0].clientX - touchStartX;
      const dy = e.changedTouches[0].clientY - touchStartY;
      const elapsed = Date.now() - touchStartTime;
      
      if (elapsed < 200 && Math.abs(dx) < 20 && Math.abs(dy) < 20) {
        handleMove(0, -50);
      } else {
        handleMove(dx, dy);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp' || e.key === 'w') handleMove(0, -50);
      else if (e.key === 'ArrowDown' || e.key === 's') handleMove(0, 50);
      else if (e.key === 'ArrowLeft' || e.key === 'a') handleMove(-50, 0);
      else if (e.key === 'ArrowRight' || e.key === 'd') handleMove(50, 0);
    };

    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd, { passive: false });
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      cancelAnimationFrame(animationId);
      stopMusic();
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [gameState, canvasSize, generateLane, highScore]);

  return (
    <>
    <Script
      src="/pixelpit/social.js"
      onLoad={() => setSocialLoaded(true)}
    />
    <div style={{
      position: 'fixed',
      inset: 0,
      background: '#0a0a1a',
      fontFamily: 'ui-monospace, monospace',
    }}>
      {gameState === 'start' && (
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 20,
          background: 'linear-gradient(180deg, #0a0a1a 0%, #1a0a2e 100%)',
        }}>
          <div style={{ fontSize: 80, marginBottom: 10 }}>🚀</div>
          <h1 style={{
            color: '#E5E7EB',
            fontSize: 48,
            marginBottom: 10,
            fontWeight: 900,
          }}>
            ORBIT
          </h1>

          <p style={{
            color: '#9CA3AF',
            fontSize: 16,
            marginBottom: 30,
            textAlign: 'center',
            lineHeight: 1.6,
            maxWidth: 280,
          }}>
            Tap to jump forward.<br />
            Swipe to move sideways.<br />
            Dodge UFOs, ride satellites!
          </p>

          <button
            onClick={startGame}
            style={{
              background: '#7C3AED',
              color: '#fff',
              border: 'none',
              padding: '18px 60px',
              fontSize: 18,
              fontWeight: 700,
              cursor: 'pointer',
              borderRadius: 30,
              boxShadow: '0 4px 15px rgba(124, 58, 237, 0.4)',
            }}
          >
            LAUNCH
          </button>
          
          {highScore > 0 && (
            <p style={{ color: '#6B7280', marginTop: 20 }}>
              High Score: {highScore}
            </p>
          )}
        </div>
      )}

      {gameState === 'playing' && (
        <canvas
          ref={canvasRef}
          style={{
            display: 'block',
            touchAction: 'none',
          }}
        />
      )}

      {gameState === 'gameover' && (
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(0,0,0,0.9)',
          overflow: 'auto',
          padding: '40px 20px',
        }}>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            maxWidth: 400,
            width: '100%',
          }}>
            <div style={{ fontSize: 50, marginBottom: 6 }}>
              {gameRef.current.deathType === 'void' ? '🕳️' :
               gameRef.current.deathType === 'abducted' ? '👽' : '💥'}
            </div>
            <h1 style={{ color: '#E5E7EB', fontSize: 20, marginBottom: 6, letterSpacing: 4, fontWeight: 800 }}>
              {gameRef.current.deathType === 'void' ? 'LOST IN VOID!' :
               gameRef.current.deathType === 'abducted' ? 'ABDUCTED!' : 'COLLISION!'}
            </h1>
            <p style={{
              fontSize: 64,
              fontWeight: 200,
              color: '#7C3AED',
              marginBottom: 4,
              lineHeight: 1,
            }}>
              {score}
            </p>
            {score >= highScore && score > 0 && (
              <p style={{ color: '#22D3EE', fontSize: 14, marginBottom: 10, letterSpacing: 2 }}>
                NEW HIGH SCORE!
              </p>
            )}

            <button
              onClick={startGame}
              style={{
                background: '#7C3AED',
                color: '#fff',
                border: 'none',
                padding: '16px 50px',
                fontSize: 18,
                fontWeight: 600,
                cursor: 'pointer',
                borderRadius: 30,
                marginBottom: 16,
                boxShadow: '0 4px 15px rgba(124, 58, 237, 0.4)',
              }}
            >
              RELAUNCH
            </button>

            {/* Progression display */}
            {progression && (
              <div style={{
                background: '#1a1a3a',
                borderRadius: 12,
                padding: '12px 24px',
                marginBottom: 16,
                textAlign: 'center',
              }}>
                <div style={{ fontSize: 18, color: '#7C3AED', marginBottom: 4 }}>
                  +{progression.xpEarned} XP
                </div>
                <div style={{ fontSize: 12, color: '#6B7280' }}>
                  Level {progression.level}{progression.streak > 1 ? ` • ${progression.multiplier}x streak` : ''}
                </div>
              </div>
            )}

            {/* Score submission */}
            <ScoreFlow
              score={score}
              gameId={GAME_ID}
              colors={SCORE_FLOW_COLORS}
              maxScore={75}
              onRankReceived={(rank, entryId) => {
                setSubmittedEntryId(entryId ?? null);
              }}
              onProgression={(prog) => setProgression(prog)}
            />

            {/* Action buttons */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
              alignItems: 'center',
              marginTop: 16,
              width: '100%',
            }}>
              <button
                onClick={() => setGameState('leaderboard')}
                style={{
                  background: 'transparent',
                  border: '1px solid #1a1a3a',
                  borderRadius: 6,
                  color: '#6B7280',
                  padding: '12px 30px',
                  fontSize: 11,
                  fontFamily: 'ui-monospace, monospace',
                  cursor: 'pointer',
                  letterSpacing: 2,
                }}
              >
                leaderboard
              </button>
              {user ? (
                <button
                  onClick={() => setShowShareModal(true)}
                  style={{
                    background: 'transparent',
                    border: '1px solid #1a1a3a',
                    borderRadius: 6,
                    color: '#6B7280',
                    padding: '12px 30px',
                    fontSize: 11,
                    fontFamily: 'ui-monospace, monospace',
                    cursor: 'pointer',
                    letterSpacing: 2,
                  }}
                >
                  share / groups
                </button>
              ) : (
                <ShareButtonContainer
                  id="share-btn-container"
                  url={typeof window !== 'undefined' ? `${window.location.origin}/pixelpit/arcade/${GAME_ID}/share/${score}` : ''}
                  text={`I scored ${score} on ORBIT! Can you beat me?`}
                  style="minimal"
                  socialLoaded={socialLoaded}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Leaderboard screen */}
      {gameState === 'leaderboard' && (
        <div style={{
          position: 'absolute',
          inset: 0,
          zIndex: 10,
          background: 'rgba(0,0,0,0.95)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
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
        </div>
      )}

      {/* Share modal */}
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
