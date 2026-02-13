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

const GAME_ID = 'chroma';

// Colors
const COLORS = [
  { name: 'Pink', hex: '#f472b6' },
  { name: 'Cyan', hex: '#22d3ee' },
  { name: 'Yellow', hex: '#facc15' },
  { name: 'Purple', hex: '#a78bfa' },
];

// Physics
const HOP_FORCE = -13;
const GRAVITY = 0.45;
const MAX_FALL_SPEED = 12;
const LANDING_OFFSET = 30; // chameleon center Y relative to ring center when landed

// PLAYROOM theme - Jungle
const THEME = {
  bg: '#166534',
  bgLight: '#22c55e',
  sky: '#7dd3fc',
  text: '#ffffff',
  textDark: '#1e293b',
};

// Social colors
const SCORE_FLOW_COLORS: ScoreFlowColors = {
  bg: '#166534',
  surface: '#15803d',
  primary: '#facc15',
  secondary: '#22d3ee',
  text: '#ffffff',
  muted: '#86efac',
  error: '#ef4444',
};

const LEADERBOARD_COLORS: LeaderboardColors = {
  bg: '#166534',
  surface: '#15803d',
  primary: '#facc15',
  secondary: '#22d3ee',
  text: '#ffffff',
  muted: '#86efac',
};

// Audio - Jungle Beats (Dither spec)
let audioCtx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let musicGain: GainNode | null = null;
let currentZone = 0;
let musicPlaying = false;
let musicIntervalId: number | null = null;

function initAudio() {
  if (audioCtx) return;
  audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  masterGain = audioCtx.createGain();
  masterGain.gain.value = 0.4;
  masterGain.connect(audioCtx.destination);
  musicGain = audioCtx.createGain();
  musicGain.gain.value = 0.15;
  musicGain.connect(audioCtx.destination);
  if (audioCtx.state === 'suspended') audioCtx.resume();
}

// === MUSIC: Zone-layered jungle beats at 120 BPM ===
const BPM = 120;
const BEAT_MS = 60000 / BPM;

// Marimba notes (C major pentatonic: C4, D4, E4, G4, A4)
const MARIMBA_NOTES = [261.63, 293.66, 329.63, 392.00, 440.00];
// Bass notes
const BASS_NOTES = [130.81, 146.83, 164.81]; // C3, D3, E3

function playMarimba(freq: number, time: number, duration = 0.15) {
  if (!audioCtx || !musicGain) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sine';
  osc.frequency.value = freq;
  // Quick attack, medium decay (marimba-like)
  gain.gain.setValueAtTime(0.3, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
  osc.connect(gain);
  gain.connect(musicGain!);
  osc.start(time);
  osc.stop(time + duration);
}

function playBongo(time: number, high = false) {
  if (!audioCtx || !musicGain) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(high ? 400 : 200, time);
  osc.frequency.exponentialRampToValueAtTime(high ? 200 : 100, time + 0.05);
  gain.gain.setValueAtTime(0.2, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.1);
  osc.connect(gain);
  gain.connect(musicGain!);
  osc.start(time);
  osc.stop(time + 0.1);
}

function playBass(freq: number, time: number) {
  if (!audioCtx || !musicGain) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'triangle';
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.25, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.3);
  osc.connect(gain);
  gain.connect(musicGain!);
  osc.start(time);
  osc.stop(time + 0.3);
}

function playBirdChirp(time: number) {
  if (!audioCtx || !musicGain) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(1200, time);
  osc.frequency.setValueAtTime(1600, time + 0.05);
  osc.frequency.setValueAtTime(1400, time + 0.1);
  gain.gain.setValueAtTime(0.08, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);
  osc.connect(gain);
  gain.connect(musicGain!);
  osc.start(time);
  osc.stop(time + 0.15);
}

let beatCount = 0;
function playMusicBeat(zone: number) {
  if (!audioCtx || !musicGain) return;
  const t = audioCtx.currentTime;
  beatCount++;
  
  // Marimba pattern (all zones) - simple arpeggios
  const noteIndex = beatCount % MARIMBA_NOTES.length;
  playMarimba(MARIMBA_NOTES[noteIndex], t, 0.2);
  
  // Light percussion (all zones)
  if (beatCount % 2 === 0) {
    playBongo(t + 0.01, beatCount % 4 === 0);
  }
  
  // Zone 2+: Add bass on beats 1 and 3
  if (zone >= 2 && (beatCount % 4 === 1 || beatCount % 4 === 3)) {
    const bassNote = BASS_NOTES[Math.floor(beatCount / 4) % BASS_NOTES.length];
    playBass(bassNote, t);
  }
  
  // Zone 3+: Bird chirps occasionally
  if (zone >= 3 && Math.random() < 0.15) {
    playBirdChirp(t + Math.random() * 0.2);
  }
}

function startMusic() {
  if (musicPlaying) return;
  musicPlaying = true;
  beatCount = 0;
  musicIntervalId = window.setInterval(() => {
    playMusicBeat(currentZone);
  }, BEAT_MS / 2); // Half-beat for more movement
}

function stopMusic() {
  musicPlaying = false;
  if (musicIntervalId) {
    clearInterval(musicIntervalId);
    musicIntervalId = null;
  }
}

function setMusicZone(zone: number) {
  currentZone = zone;
}

// === SFX (Dither spec) ===

// Hop: Soft springy "boing"
function playHop() {
  if (!audioCtx || !masterGain) return;
  const t = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(280, t);
  osc.frequency.exponentialRampToValueAtTime(420, t + 0.06);
  osc.frequency.exponentialRampToValueAtTime(350, t + 0.12);
  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(0.18, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
  osc.connect(gain);
  gain.connect(masterGain);
  osc.start(t);
  osc.stop(t + 0.15);
}

// Correct pass: Chime/ding (pitch based on zone)
function playPass(zone = 1) {
  if (!audioCtx || !masterGain) return;
  const t = audioCtx.currentTime;
  // Higher pitch for higher zones
  const baseFreq = 600 + (zone - 1) * 150;
  
  const osc = audioCtx.createOscillator();
  const osc2 = audioCtx.createOscillator();
  osc.type = 'sine';
  osc2.type = 'sine';
  osc.frequency.value = baseFreq;
  osc2.frequency.value = baseFreq * 1.5; // Perfect fifth harmony
  
  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(0.12, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
  
  osc.connect(gain);
  osc2.connect(gain);
  gain.connect(masterGain);
  osc.start(t);
  osc2.start(t);
  osc.stop(t + 0.25);
  osc2.stop(t + 0.25);
}

// Bug eat: "Thwip" tongue + tiny "gulp"
function playEat() {
  if (!audioCtx || !masterGain) return;
  const t = audioCtx.currentTime;
  
  // Thwip (fast rising then falling)
  const osc1 = audioCtx.createOscillator();
  osc1.type = 'sine';
  osc1.frequency.setValueAtTime(200, t);
  osc1.frequency.exponentialRampToValueAtTime(800, t + 0.04);
  osc1.frequency.exponentialRampToValueAtTime(400, t + 0.08);
  const gain1 = audioCtx.createGain();
  gain1.gain.setValueAtTime(0.2, t);
  gain1.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
  osc1.connect(gain1);
  gain1.connect(masterGain);
  osc1.start(t);
  osc1.stop(t + 0.1);
  
  // Gulp (low bubble)
  const osc2 = audioCtx.createOscillator();
  osc2.type = 'sine';
  osc2.frequency.setValueAtTime(150, t + 0.08);
  osc2.frequency.exponentialRampToValueAtTime(80, t + 0.15);
  const gain2 = audioCtx.createGain();
  gain2.gain.setValueAtTime(0, t);
  gain2.gain.setValueAtTime(0.15, t + 0.08);
  gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
  osc2.connect(gain2);
  gain2.connect(masterGain);
  osc2.start(t + 0.08);
  osc2.stop(t + 0.2);
}

// Death: Record scratch + sad thud
function playDeath() {
  if (!audioCtx || !masterGain) return;
  const t = audioCtx.currentTime;
  stopMusic();
  
  // Record scratch (noise burst with falling pitch)
  const bufferSize = audioCtx.sampleRate * 0.15;
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
  }
  const noise = audioCtx.createBufferSource();
  noise.buffer = buffer;
  const noiseGain = audioCtx.createGain();
  noiseGain.gain.setValueAtTime(0.2, t);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
  noise.connect(noiseGain);
  noiseGain.connect(masterGain);
  noise.start(t);
  
  // Sad thud
  const osc = audioCtx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(150, t + 0.1);
  osc.frequency.exponentialRampToValueAtTime(60, t + 0.4);
  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(0, t);
  gain.gain.setValueAtTime(0.25, t + 0.1);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
  osc.connect(gain);
  gain.connect(masterGain);
  osc.start(t + 0.1);
  osc.stop(t + 0.5);
}

// Near miss: Quick tension "whoosh" (Dither spec)
function playNearMiss() {
  if (!audioCtx || !masterGain) return;
  const t = audioCtx.currentTime;
  
  // Filtered noise burst - tense woosh
  const bufferSize = audioCtx.sampleRate * 0.12;
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    const env = Math.sin((i / bufferSize) * Math.PI); // Bell curve
    data[i] = (Math.random() * 2 - 1) * env;
  }
  const noise = audioCtx.createBufferSource();
  noise.buffer = buffer;
  
  // Bandpass filter for "whoosh" character
  const filter = audioCtx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(2000, t);
  filter.frequency.exponentialRampToValueAtTime(500, t + 0.12);
  filter.Q.value = 2;
  
  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(0.15, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
  
  noise.connect(filter);
  filter.connect(gain);
  gain.connect(masterGain);
  noise.start(t);
}

// Zone transition: Ascending arpeggio flourish (Dither spec)
function playZoneTransition(toZone: number) {
  if (!audioCtx || !masterGain) return;
  const t = audioCtx.currentTime;
  
  // C major arpeggio, higher octave for higher zones
  const baseOctave = 3 + toZone; // Zone 2 = octave 5, Zone 3 = octave 6
  const baseFreq = 261.63 * Math.pow(2, baseOctave - 4); // C at that octave
  const notes = [1, 1.25, 1.5, 2]; // C, E, G, C (major arpeggio)
  
  notes.forEach((mult, i) => {
    const osc = audioCtx!.createOscillator();
    const gain = audioCtx!.createGain();
    osc.type = 'sine';
    osc.frequency.value = baseFreq * mult;
    
    const noteTime = t + i * 0.08;
    gain.gain.setValueAtTime(0, t);
    gain.gain.setValueAtTime(0.15, noteTime);
    gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.3);
    
    osc.connect(gain);
    gain.connect(masterGain!);
    osc.start(noteTime);
    osc.stop(noteTime + 0.3);
  });
}

// 100 milestone: Celebration stinger 🎉 (Dither spec)
function playMilestone() {
  if (!audioCtx || !masterGain) return;
  const t = audioCtx.currentTime;
  
  // Triumphant chord (C major) + sparkle
  const chordFreqs = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
  
  chordFreqs.forEach((freq, i) => {
    const osc = audioCtx!.createOscillator();
    const gain = audioCtx!.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    
    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
    
    osc.connect(gain);
    gain.connect(masterGain!);
    osc.start(t);
    osc.stop(t + 0.5);
  });
  
  // Sparkle: quick high notes
  for (let i = 0; i < 4; i++) {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 2000 + Math.random() * 1000;
    
    const sparkleTime = t + 0.1 + i * 0.05;
    gain.gain.setValueAtTime(0, t);
    gain.gain.setValueAtTime(0.08, sparkleTime);
    gain.gain.exponentialRampToValueAtTime(0.001, sparkleTime + 0.1);
    
    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(sparkleTime);
    osc.stop(sparkleTime + 0.1);
  }
}

interface Obstacle {
  y: number;
  type: 'ring' | 'bars' | 'flower';
  rotation: number;
  spinSpeed: number;
  spinDirection: number;
  colorOffset: number;
  passed: boolean;
  landed: boolean;
  // For flower type
  currentColorIndex: number;
  colorTimer: number;
  colorDuration: number;
  // For training wheels (first 15 obstacles)
  specialColors?: number[]; // Override segment colors [0,1,2,3] = 4 segments
}

interface Bug {
  y: number;
  x: number;
  colorIndex: number;
  eaten: boolean;
  orbitAngle: number;
  baseX: number; // center of patrol
  patrolWidth: number; // how far left/right it drifts
  patrolSpeed: number; // how fast it drifts
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
}

export default function ChromaGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<'start' | 'playing' | 'end'>('start');
  const [canvasSize, setCanvasSize] = useState({ w: 400, h: 700 });
  const [finalScore, setFinalScore] = useState(0);

  // Social
  const [socialLoaded, setSocialLoaded] = useState(false);
  const [submittedEntryId, setSubmittedEntryId] = useState<number | null>(null);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  
  usePixelpitSocial(socialLoaded);

  const gameRef = useRef({
    running: false,
    chameleon: {
      x: 200,
      y: 500,
      vy: 0,
      colorIndex: 0,
      squash: 1,
      eyeOffset: { x: 0, y: 0 },
      tongueOut: false,
      tongueTimer: 0,
      dead: false,
      deathTimer: 0,
      onGround: true,
      currentPlatform: null as null | Obstacle,
      previousPlatform: null as null | Obstacle,
    },
    cameraY: 0,
    score: 0,
    highScore: 0,
    obstacles: [] as Obstacle[],
    bugs: [] as Bug[],
    particles: [] as Particle[],
    nextObstacleY: 400,
    lastObstacleType: 'ring' as string,
    zone: 1,
    lastMilestone: 0, // Track 100-point milestones for celebration SFX
    obstacleCount: 0, // Track how many obstacles spawned for training wheels
  });

  const getZone = useCallback((height: number) => {
    if (height < 250) return 1;
    if (height < 500) return 2;
    if (height < 1000) return 3;
    return 4;
  }, []);

  // ZONE CONFIG (Loop spec - revised with Zone 1A/1B split)
  // Uses distance thresholds: 0-100, 100-250, 250-500, 500-1000, 1000+
  const getZoneConfig = (distance: number) => {
    if (distance < 100) {
      // Zone 1A: COLOR MATCHING (can't die, learn colors)
      return {
        zone: '1A',
        spinMult: 0.3,  // Very slow
        gap: 220,       // Very generous spacing
        bugEvery: 0,    // NO BUGS - just learn colors
        ringChance: 1.0, barChance: 0, flowerChance: 0,
        colorCount: 1,  // All same color = impossible to fail
      };
    } else if (distance < 250) {
      // Zone 1B: COLOR CHANGE (introduce bugs)
      return {
        zone: '1B',
        spinMult: 0.4,
        gap: 200,
        bugEvery: 2,    // Bug every 2nd obstacle (very frequent)
        ringChance: 1.0, barChance: 0, flowerChance: 0,
        colorCount: 2,  // 2 colors
      };
    } else if (distance < 500) {
      // Zone 2: UNDERSTORY
      return {
        zone: '2',
        spinMult: 0.6,
        gap: 180,
        bugEvery: 4,
        ringChance: 0.7, barChance: 0.3, flowerChance: 0,
        colorCount: 2,
      };
    } else if (distance < 1000) {
      // Zone 3: CANOPY
      return {
        zone: '3',
        spinMult: 0.8,
        gap: 150,
        bugEvery: 5,
        ringChance: 0.5, barChance: 0.3, flowerChance: 0.2,
        colorCount: 4,
      };
    } else {
      // Zone 4: TREETOPS
      return {
        zone: '4',
        spinMult: 1.0,
        gap: 120,
        bugEvery: 6,
        ringChance: 0.4, barChance: 0.3, flowerChance: 0.3,
        colorCount: 4,
      };
    }
  };

  const getSpinSpeed = useCallback((baseSpeed: number, distance: number) => {
    // Zone-based spin speed (Loop spec)
    const config = getZoneConfig(distance);
    return baseSpeed * config.spinMult;
  }, []);

  const spawnObstacle = useCallback((y: number, playerColorIndex: number, distance: number) => {
    const game = gameRef.current;
    game.obstacleCount++;
    
    const config = getZoneConfig(distance);
    
    // Obstacle type based on zone (Loop spec)
    let type: 'ring' | 'bars' | 'flower' = 'ring';
    const typeRoll = Math.random();
    if (typeRoll < config.ringChance) {
      type = 'ring';
    } else if (typeRoll < config.ringChance + config.barChance) {
      type = 'bars';
    } else {
      type = 'flower';
    }

    // Color complexity based on zone's colorCount
    let specialColors: number[];

    if (config.colorCount === 1) {
      // Zone 1A: All same color — IMPOSSIBLE TO FAIL
      specialColors = [playerColorIndex, playerColorIndex, playerColorIndex, playerColorIndex];
    } else if (config.colorCount === 2) {
      // Zone 1B/2: 2 colors, guaranteed player color in 2 slots
      const other = (playerColorIndex + 1 + Math.floor(Math.random() * 3)) % 4;
      const slots = [playerColorIndex, other, playerColorIndex, other];
      const shift = Math.floor(Math.random() * 4);
      specialColors = slots.map((_, i) => slots[(i + shift) % 4]);
    } else {
      // Zone 3+: Full 4 colors (25% timing window)
      const others = [0, 1, 2, 3].filter(c => c !== playerColorIndex);
      for (let i = others.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [others[i], others[j]] = [others[j], others[i]];
      }
      specialColors = [others[0], others[1], others[2], playerColorIndex];
      const shift = Math.floor(Math.random() * 4);
      specialColors = specialColors.map((_, i) => specialColors[(i + shift) % 4]);
    }
    game.lastObstacleType = type;

    const baseSpinSpeed = (Math.PI * 2) / 3;

    const obstacle: Obstacle = {
      y,
      type,
      rotation: Math.random() * Math.PI * 2,
      spinSpeed: getSpinSpeed(baseSpinSpeed, distance),
      spinDirection: Math.random() > 0.5 ? 1 : -1,
      colorOffset: 0,
      passed: false,
      landed: false,
      currentColorIndex: 0,
      colorTimer: 0,
      colorDuration: 0,
      specialColors,
    };

    game.obstacles.push(obstacle);
  }, [getSpinSpeed]);

  const spawnBug = useCallback((y: number, _currentColorIndex: number) => {
    // Random color — player decides whether to catch or avoid
    const colorIndex = Math.floor(Math.random() * 4);
    const centerX = canvasSize.w / 2;
    const patrolWidth = 60 + Math.random() * 40; // 60-100px drift from center

    const bug: Bug = {
      y,
      x: centerX,
      baseX: centerX,
      colorIndex,
      eaten: false,
      orbitAngle: Math.random() * Math.PI * 2,
      patrolWidth,
      patrolSpeed: 1.5 + Math.random() * 1.5, // 1.5-3x speed
    };

    gameRef.current.bugs.push(bug);
  }, [canvasSize]);

  const startGame = useCallback(() => {
    initAudio();
    
    const game = gameRef.current;
    game.running = true;
    game.obstacleCount = 0; // Reset training wheel counter
    game.chameleon = {
      x: canvasSize.w / 2,
      y: canvasSize.h - 100,
      vy: 0,
      colorIndex: 0,
      squash: 1,
      eyeOffset: { x: 0, y: 0 },
      tongueOut: false,
      tongueTimer: 0,
      dead: false,
      deathTimer: 0,
      onGround: true,
      currentPlatform: null,
      previousPlatform: null,
    };
    game.cameraY = 0;
    game.score = 0;
    game.obstacles = [];
    game.bugs = [];
    game.particles = [];
    game.nextObstacleY = canvasSize.h - 250;
    game.zone = 1;
    game.lastMilestone = 0;

    // Spawn initial rings (Zone 1A = can't die)
    const startConfig = getZoneConfig(0);
    for (let i = 0; i < 4; i++) {
      const spawnDistance = Math.abs(game.nextObstacleY - (canvasSize.h - 250));
      spawnObstacle(game.nextObstacleY, game.chameleon.colorIndex, spawnDistance);
      game.nextObstacleY -= startConfig.gap;
    }

    // Spawn first bug
    spawnBug(canvasSize.h - 400, 0);

    // Start jungle beats!
    setMusicZone(1);
    startMusic();

    setGameState('playing');
  }, [canvasSize, spawnObstacle, spawnBug]);

  const hop = useCallback(() => {
    const game = gameRef.current;
    const cham = game.chameleon;
    if (cham.dead) return;

    // Leave current platform
    if (cham.onGround || cham.currentPlatform) {
      cham.previousPlatform = cham.currentPlatform;
      cham.currentPlatform = null;
      cham.onGround = false;
    }

    cham.vy = HOP_FORCE;
    cham.squash = 0.7;
    playHop();
  }, []);

  useEffect(() => {
    const updateSize = () => {
      setCanvasSize({
        w: Math.min(window.innerWidth, 500),
        h: window.innerHeight,
      });
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || gameState !== 'playing') return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = canvasSize.w;
    canvas.height = canvasSize.h;

    let animationId: number;
    let lastTime = 0;

    const update = (dt: number) => {
      const game = gameRef.current;
      if (!game.running) return;

      const cham = game.chameleon;

      if (cham.dead) {
        cham.deathTimer += dt;
        cham.vy += GRAVITY;
        cham.y += cham.vy;
        
        if (cham.deathTimer > 1.5) {
          game.running = false;
          setFinalScore(game.score);
          game.highScore = Math.max(game.highScore, game.score);
          setGameState('end');
        }
        return;
      }

      // Physics - only when airborne
      if (!cham.onGround && !cham.currentPlatform) {
        const prevY = cham.y;
        cham.vy += GRAVITY;
        cham.vy = Math.min(cham.vy, MAX_FALL_SPEED);
        cham.y += cham.vy;

        // Landing detection — check each ring
        for (const obs of game.obstacles) {
          if (obs.passed) continue;

          const landingY = obs.y + LANDING_OFFSET;

          // Rising into a ring from below
          if (prevY > landingY && cham.y <= landingY) {
            // Re-landing on the ring we just left — always safe
            if (obs === cham.previousPlatform) {
              cham.currentPlatform = obs;
              cham.y = landingY;
              cham.vy = 0;
              cham.squash = 0.8;
              break;
            }

            // New ring — which segment is at the bottom?
            // Check each segment to find which one contains angle π/2 (bottom)
            let segment = 0;
            for (let i = 0; i < 4; i++) {
              const segStart = ((obs.rotation + i * Math.PI / 2) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
              const segEnd = ((obs.rotation + (i + 1) * Math.PI / 2) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
              const target = Math.PI / 2;
              // Check if target is within [segStart, segEnd), handling wraparound
              if (segStart <= segEnd) {
                if (target >= segStart && target < segEnd) { segment = i; break; }
              } else {
                if (target >= segStart || target < segEnd) { segment = i; break; }
              }
            }
            const segmentColor = obs.specialColors
              ? obs.specialColors[segment]
              : (segment + obs.colorOffset) % 4;

            console.log('LANDING:', {
              rotation: (obs.rotation * 180 / Math.PI).toFixed(1) + '°',
              segment,
              segmentColor,
              colorName: COLORS[segmentColor]?.name,
              chamColor: cham.colorIndex,
              chamColorName: COLORS[cham.colorIndex]?.name,
              specialColors: obs.specialColors,
              colorOffset: obs.colorOffset,
              match: segmentColor === cham.colorIndex,
            });

            if (segmentColor === cham.colorIndex) {
              // Safe landing!
              cham.currentPlatform = obs;
              obs.landed = true;
              cham.y = landingY;
              cham.vy = 0;
              cham.squash = 0.8;
              
              // Near miss detection: how close was the segment boundary?
              // Calculate angular distance to nearest boundary
              const target = Math.PI / 2; // Bottom position
              const segStartAngle = ((obs.rotation + segment * Math.PI / 2) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
              const segEndAngle = ((obs.rotation + (segment + 1) * Math.PI / 2) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
              
              // Distance from target to segment boundaries (in radians)
              const distToStart = Math.min(
                Math.abs(target - segStartAngle),
                Math.PI * 2 - Math.abs(target - segStartAngle)
              );
              const distToEnd = Math.min(
                Math.abs(target - segEndAngle),
                Math.PI * 2 - Math.abs(target - segEndAngle)
              );
              const nearestBoundaryDist = Math.min(distToStart, distToEnd);
              
              // Play pass chime
              playPass(game.zone);
              
              // Near miss: within ~15 degrees of boundary on spinning rings = extra whoosh!
              if (nearestBoundaryDist < 0.26 && obs.spinSpeed > 0.3) {
                playNearMiss();
              }

              // Snap ring so landed segment is centered at bottom
              obs.rotation = Math.PI / 4 - segment * Math.PI / 2;

              // Mark all rings below as passed
              for (const other of game.obstacles) {
                if (other.y > obs.y && other !== obs) {
                  other.passed = true;
                }
              }

              // Particles
              for (let p = 0; p < 8; p++) {
                game.particles.push({
                  x: cham.x,
                  y: cham.y - game.cameraY,
                  vx: (Math.random() - 0.5) * 4,
                  vy: (Math.random() - 0.5) * 4,
                  life: 0.5,
                  color: COLORS[cham.colorIndex].hex,
                });
              }
              break;
            } else {
              // Wrong color — death!
              cham.dead = true;
              cham.vy = HOP_FORCE / 2; // Bounce off
              playDeath();
              break;
            }
          }

          // Falling back down through previous platform
          if (obs === cham.previousPlatform && prevY < landingY && cham.y >= landingY) {
            cham.currentPlatform = obs;
            cham.y = landingY;
            cham.vy = 0;
            cham.squash = 0.8;
            break;
          }
        }
      }

      // Squash recovery
      cham.squash += (1 - cham.squash) * 0.2;

      // Tongue timer
      if (cham.tongueOut) {
        cham.tongueTimer -= dt;
        if (cham.tongueTimer <= 0) {
          cham.tongueOut = false;
        }
      }

      // Camera follows chameleon
      const targetCameraY = cham.y - canvasSize.h * 0.6;
      if (targetCameraY < game.cameraY) {
        game.cameraY = targetCameraY;
      }

      // Score based on height
      const height = Math.max(0, (canvasSize.h - 150) - cham.y + game.cameraY);
      game.score = Math.max(game.score, Math.floor(height / 10));
      const newZone = getZone(game.score * 10);
      if (newZone !== game.zone) {
        if (newZone > game.zone) {
          playZoneTransition(newZone); // Ascending arpeggio
        }
        game.zone = newZone;
        setMusicZone(newZone); // Update music layers
      }
      
      // Milestone celebration (every 100 points)
      const milestone = Math.floor(game.score / 100);
      if (milestone > game.lastMilestone) {
        game.lastMilestone = milestone;
        playMilestone();
      }

      // Spawn new obstacles (distance-based spacing and bug frequency)
      while (game.nextObstacleY > game.cameraY - 200) {
        // Calculate distance from start (higher Y = lower distance)
        const spawnDistance = Math.abs(game.nextObstacleY - (canvasSize.h - 250));
        const config = getZoneConfig(spawnDistance);
        
        spawnObstacle(game.nextObstacleY, cham.colorIndex, spawnDistance);
        
        // Zone-based gap between obstacles
        game.nextObstacleY -= config.gap + Math.random() * 20;

        // Zone-based bug frequency (0 = no bugs in Zone 1A)
        if (config.bugEvery > 0 && game.obstacleCount % config.bugEvery === 0) {
          spawnBug(game.nextObstacleY + config.gap * 0.3, cham.colorIndex);
        }
      }

      // Update obstacles — freeze the ring the chameleon is sitting on
      for (const obs of game.obstacles) {
        if (obs === cham.currentPlatform) continue;
        obs.rotation += obs.spinSpeed * obs.spinDirection * dt;
      }

      // Bug collisions
      for (const bug of game.bugs) {
        if (bug.eaten) continue;

        bug.orbitAngle += dt * bug.patrolSpeed;
        // Drift left/right so player can catch or avoid
        bug.x = bug.baseX + Math.sin(bug.orbitAngle) * bug.patrolWidth;
        const bugScreenX = bug.x;
        const bugScreenY = bug.y - game.cameraY + Math.cos(bug.orbitAngle * 2) * 6;
        const chamScreenY = cham.y - game.cameraY;

        const dx = cham.x - bugScreenX;
        const dy = chamScreenY - bugScreenY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 40) {
          bug.eaten = true;
          cham.colorIndex = bug.colorIndex;
          cham.tongueOut = true;
          cham.tongueTimer = 0.1;
          playEat();

          for (let p = 0; p < 12; p++) {
            game.particles.push({
              x: cham.x,
              y: cham.y - game.cameraY,
              vx: (Math.random() - 0.5) * 6,
              vy: (Math.random() - 0.5) * 6,
              life: 0.6,
              color: COLORS[bug.colorIndex].hex,
            });
          }
        }
      }

      // Particles
      game.particles = game.particles.filter((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.life -= dt * 2;
        return p.life > 0;
      });

      // Cleanup off-screen
      game.obstacles = game.obstacles.filter((o) => o.y > game.cameraY - 100);
      game.bugs = game.bugs.filter((b) => b.y > game.cameraY - 100 && !b.eaten);

      // Death by falling
      if (cham.y - game.cameraY > canvasSize.h + 100) {
        cham.dead = true;
        playDeath();
      }
    };

    const draw = () => {
      const game = gameRef.current;
      const cham = game.chameleon;

      // Background gradient based on zone
      const zoneColors = [
        ['#166534', '#15803d'], // Forest floor
        ['#15803d', '#22c55e'], // Understory
        ['#22c55e', '#86efac'], // Canopy
        ['#86efac', '#7dd3fc'], // Treetops
      ];
      const colors = zoneColors[Math.min(game.zone - 1, 3)];
      
      const gradient = ctx.createLinearGradient(0, 0, 0, canvasSize.h);
      gradient.addColorStop(0, colors[1]);
      gradient.addColorStop(1, colors[0]);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvasSize.w, canvasSize.h);

      // Draw decorative vines
      ctx.strokeStyle = '#166534';
      ctx.lineWidth = 3;
      for (let i = 0; i < 3; i++) {
        const x = 50 + i * 150;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        for (let y = 0; y < canvasSize.h; y += 20) {
          ctx.lineTo(x + Math.sin((y - game.cameraY * 0.1) / 30) * 15, y);
        }
        ctx.stroke();
      }

      // Draw obstacles
      for (const obs of game.obstacles) {
        const screenY = obs.y - game.cameraY;
        if (screenY < -100 || screenY > canvasSize.h + 100) continue;

        ctx.save();
        ctx.translate(canvasSize.w / 2, screenY);

        if (obs.type === 'ring') {
          // Draw 4-segment ring
          const radius = 80;
          const thickness = 20;
          
          for (let i = 0; i < 4; i++) {
            const startAngle = obs.rotation + (i * Math.PI / 2);
            const endAngle = startAngle + Math.PI / 2 - 0.1;
            
            // Use specialColors if present (training wheels), otherwise normal offset
            const colorIndex = obs.specialColors 
              ? obs.specialColors[i]
              : (i + obs.colorOffset) % 4;
            
            ctx.beginPath();
            ctx.arc(0, 0, radius, startAngle, endAngle);
            ctx.arc(0, 0, radius - thickness, endAngle, startAngle, true);
            ctx.closePath();
            ctx.fillStyle = COLORS[colorIndex].hex;
            ctx.fill();
            ctx.strokeStyle = '#00000030';
            ctx.lineWidth = 2;
            ctx.stroke();
          }
        } else if (obs.type === 'bars') {
          // Two colored bars
          const barPhase = Math.sin(obs.rotation);
          const barWidth = 150;
          const barHeight = 15;

          for (let i = 0; i < 2; i++) {
            const colorIndex = (obs.colorOffset + i * 2) % 4;
            const yOffset = i === 0 ? barPhase * 15 : -barPhase * 15;
            
            ctx.fillStyle = COLORS[colorIndex].hex;
            ctx.fillRect(-barWidth / 2, yOffset - barHeight / 2, barWidth, barHeight);
            ctx.strokeStyle = '#00000030';
            ctx.lineWidth = 2;
            ctx.strokeRect(-barWidth / 2, yOffset - barHeight / 2, barWidth, barHeight);
          }
        } else if (obs.type === 'flower') {
          // Pulsing flower
          const petalRadius = 45;
          const pulseScale = 0.9 + Math.sin(obs.colorTimer / obs.colorDuration * Math.PI) * 0.1;
          
          // Petals
          ctx.fillStyle = COLORS[obs.currentColorIndex].hex;
          for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2 + obs.rotation * 0.2;
            const px = Math.cos(angle) * petalRadius * pulseScale;
            const py = Math.sin(angle) * petalRadius * pulseScale;
            ctx.beginPath();
            ctx.ellipse(px, py, 20 * pulseScale, 12 * pulseScale, angle, 0, Math.PI * 2);
            ctx.fill();
          }

          // Center (always safe)
          ctx.fillStyle = '#facc15';
          ctx.beginPath();
          ctx.arc(0, 0, 20, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      }

      // Draw bugs
      for (const bug of game.bugs) {
        if (bug.eaten) continue;
        
        const screenX = bug.x;
        const screenY = bug.y - game.cameraY + Math.cos(bug.orbitAngle * 2) * 6;
        
        if (screenY < -50 || screenY > canvasSize.h + 50) continue;

        // Bug body
        ctx.fillStyle = COLORS[bug.colorIndex].hex;
        ctx.beginPath();
        ctx.ellipse(screenX, screenY, 10, 8, 0, 0, Math.PI * 2);
        ctx.fill();

        // Wings
        ctx.fillStyle = '#ffffff80';
        const wingFlap = Math.sin(Date.now() / 30) * 0.3;
        ctx.beginPath();
        ctx.ellipse(screenX - 5, screenY - 8 + wingFlap * 5, 6, 4, -0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(screenX + 5, screenY - 8 - wingFlap * 5, 6, 4, 0.3, 0, Math.PI * 2);
        ctx.fill();

        // Eyes
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(screenX - 3, screenY - 2, 2, 0, Math.PI * 2);
        ctx.arc(screenX + 3, screenY - 2, 2, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw chameleon
      const chamScreenY = cham.y - game.cameraY;
      
      ctx.save();
      ctx.translate(cham.x, chamScreenY);
      
      if (cham.dead) {
        ctx.rotate(cham.deathTimer * 5);
        ctx.globalAlpha = 1 - cham.deathTimer / 1.5;
      }

      // Body (scaled by squash)
      const bodyWidth = 28 * (1 / cham.squash);
      const bodyHeight = 22 * cham.squash;
      
      ctx.fillStyle = COLORS[cham.colorIndex].hex;
      ctx.beginPath();
      ctx.ellipse(0, 0, bodyWidth, bodyHeight, 0, 0, Math.PI * 2);
      ctx.fill();

      // Darker belly
      ctx.fillStyle = '#00000020';
      ctx.beginPath();
      ctx.ellipse(0, 5, bodyWidth * 0.8, bodyHeight * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Tail
      ctx.strokeStyle = COLORS[cham.colorIndex].hex;
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-bodyWidth, 0);
      ctx.quadraticCurveTo(-bodyWidth - 15, -10, -bodyWidth - 10, -20);
      ctx.stroke();

      // Tongue
      if (cham.tongueOut) {
        ctx.strokeStyle = '#f472b6';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(bodyWidth - 5, -5);
        ctx.lineTo(bodyWidth + 30, -15);
        ctx.stroke();
        ctx.fillStyle = '#f472b6';
        ctx.beginPath();
        ctx.arc(bodyWidth + 30, -15, 4, 0, Math.PI * 2);
        ctx.fill();
      }

      // Eyes (googly, move independently)
      const eyeOffsetX = Math.sin(Date.now() / 500) * 2;
      const eyeOffsetY = Math.cos(Date.now() / 700) * 1;

      // Eye sockets
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(-8, -10, 10, 10, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(8, -10, 10, 10, 0, 0, Math.PI * 2);
      ctx.fill();

      // Pupils
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.arc(-8 + eyeOffsetX, -10 + eyeOffsetY, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(8 - eyeOffsetX, -10 - eyeOffsetY, 4, 0, Math.PI * 2);
      ctx.fill();

      // Legs
      ctx.strokeStyle = COLORS[cham.colorIndex].hex;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(-10, bodyHeight - 5);
      ctx.lineTo(-15, bodyHeight + 8);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(10, bodyHeight - 5);
      ctx.lineTo(15, bodyHeight + 8);
      ctx.stroke();

      ctx.restore();

      // Draw particles
      for (const p of game.particles) {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.life * 2;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // HUD
      ctx.fillStyle = THEME.text;
      ctx.font = 'bold 32px ui-monospace, monospace';
      ctx.textAlign = 'center';
      ctx.fillText(game.score.toString(), canvasSize.w / 2, 50);

      // Current color indicator
      ctx.fillStyle = COLORS[cham.colorIndex].hex;
      ctx.beginPath();
      ctx.arc(canvasSize.w - 30, 40, 15, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Zone indicator
      ctx.fillStyle = '#ffffff80';
      ctx.font = '14px ui-monospace';
      ctx.textAlign = 'left';
      const zoneNames = ['Forest Floor', 'Understory', 'Canopy', 'Treetops'];
      ctx.fillText(zoneNames[game.zone - 1], 15, 35);
    };

    const gameLoop = (timestamp: number) => {
      const dt = Math.min((timestamp - lastTime) / 1000, 0.05);
      lastTime = timestamp;
      update(dt);
      draw();
      animationId = requestAnimationFrame(gameLoop);
    };
    animationId = requestAnimationFrame(gameLoop);

    // Input
    const handleTap = () => {
      hop();
    };

    canvas.addEventListener('click', handleTap);
    canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      handleTap();
    }, { passive: false });

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [gameState, canvasSize, hop, getZone, spawnObstacle, spawnBug, startGame]);

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
          fontFamily: 'ui-monospace, monospace',
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        {gameState === 'start' && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 20,
              background: `linear-gradient(180deg, ${THEME.bgLight} 0%, ${THEME.bg} 100%)`,
            }}
          >
            <div style={{ fontSize: 80, marginBottom: 10 }}>🦎</div>
            <h1
              style={{
                color: THEME.text,
                fontSize: 48,
                marginBottom: 10,
                fontWeight: 900,
              }}
            >
              CHROMA
            </h1>

            <p
              style={{
                color: '#86efac',
                fontSize: 16,
                marginBottom: 30,
                textAlign: 'center',
                lineHeight: 1.6,
                maxWidth: 280,
              }}
            >
              Tap to hop. Match your color.<br />
              Eat bugs to change.<br />
              Climb the jungle canopy!
            </p>

            {/* Color preview */}
            <div
              style={{
                display: 'flex',
                gap: 12,
                marginBottom: 30,
              }}
            >
              {COLORS.map((color, i) => (
                <div
                  key={i}
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    background: color.hex,
                    border: '3px solid #ffffff',
                  }}
                />
              ))}
            </div>

            <button
              onClick={startGame}
              style={{
                background: '#facc15',
                color: THEME.textDark,
                border: 'none',
                padding: '18px 60px',
                fontSize: 18,
                fontWeight: 700,
                cursor: 'pointer',
                borderRadius: 30,
                boxShadow: '0 4px 0 #ca8a04',
              }}
            >
              START
            </button>

            {gameRef.current.highScore > 0 && (
              <div style={{ marginTop: 20, color: '#86efac', fontSize: 16 }}>
                Best: {gameRef.current.highScore}
              </div>
            )}

            <button
              onClick={() => setShowLeaderboard(true)}
              style={{
                marginTop: 20,
                background: 'transparent',
                color: THEME.text,
                border: `2px solid ${THEME.text}30`,
                padding: '10px 24px',
                fontSize: 14,
                cursor: 'pointer',
                borderRadius: 20,
              }}
            >
              Leaderboard
            </button>
          </div>
        )}

        {showLeaderboard && gameState !== 'playing' && (
          <div
            onClick={() => setShowLeaderboard(false)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.8)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 100,
              padding: 20,
            }}
          >
            <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: 400 }}>
              <Leaderboard
                gameId={GAME_ID}
                limit={10}
                entryId={submittedEntryId ?? undefined}
                colors={LEADERBOARD_COLORS}
              />
            </div>
            <button
              onClick={() => setShowLeaderboard(false)}
              style={{
                marginTop: 20,
                background: '#facc15',
                color: THEME.textDark,
                border: 'none',
                padding: '12px 30px',
                fontSize: 14,
                cursor: 'pointer',
                borderRadius: 20,
              }}
            >
              Close
            </button>
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

        {gameState === 'end' && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              background: THEME.bg,
              padding: 20,
              overflowY: 'auto',
            }}
          >
            <div style={{ fontSize: 60, marginBottom: 10 }}>🦎</div>
            <h1
              style={{
                color: '#ef4444',
                fontSize: 36,
                marginBottom: 5,
                fontWeight: 900,
              }}
            >
              WRONG COLOR!
            </h1>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 8,
                marginBottom: 20,
              }}
            >
              <div style={{ color: '#86efac', fontSize: 14, letterSpacing: 2 }}>HEIGHT</div>
              <div style={{ color: THEME.text, fontSize: 64, fontWeight: 'bold' }}>
                {finalScore}
              </div>
              {finalScore === gameRef.current.highScore && finalScore > 0 && (
                <div style={{ color: '#facc15', fontSize: 14 }}>NEW BEST! 🎉</div>
              )}
            </div>

            <div style={{ width: '100%', maxWidth: 350 }}>
              <ScoreFlow
                score={finalScore}
                gameId={GAME_ID}
                colors={SCORE_FLOW_COLORS}
                onRankReceived={(rank, entryId) => setSubmittedEntryId(entryId ?? null)}
              />
            </div>

            <div style={{ marginTop: 15 }}>
              <ShareButtonContainer
                id="share-btn-chroma"
                url={`${typeof window !== 'undefined' ? window.location.origin : ''}/pixelpit/arcade/chroma/share/${finalScore}`}
                text={`I climbed ${finalScore}m in CHROMA! 🦎`}
                style="minimal"
                socialLoaded={socialLoaded}
              />
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 15 }}>
              <button
                onClick={() => setShowLeaderboard(!showLeaderboard)}
                style={{
                  background: 'transparent',
                  color: THEME.text,
                  border: `2px solid ${THEME.text}`,
                  padding: '12px 20px',
                  fontSize: 14,
                  cursor: 'pointer',
                  borderRadius: 20,
                }}
              >
                {showLeaderboard ? 'Hide' : 'Leaderboard'}
              </button>
              <button
                onClick={startGame}
                style={{
                  background: '#facc15',
                  color: THEME.textDark,
                  border: 'none',
                  padding: '12px 30px',
                  fontSize: 16,
                  fontWeight: 600,
                  cursor: 'pointer',
                  borderRadius: 20,
                }}
              >
                TRY AGAIN
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
