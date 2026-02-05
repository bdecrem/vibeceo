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
  type ProgressionResult,
} from '@/app/pixelpit/components';

// BAT DASH theme - Neon noir, high contrast
const THEME = {
  sky: '#0a0a1a',        // Near black
  skyDark: '#050510',    // Void
  bat: '#1a1a2e',        // Dark suit
  batWing: '#16213e',    // Wings
  batEye: '#fff',        // Derpy white eyes
  batPupil: '#000',      // Black pupils
  cape: '#7c3aed',       // VIVID purple cape
  skin: '#fcd5ce',       // Pale flesh
  undies: '#ff3366',     // HOT PINK undies (funnier)
  belt: '#ffd700',       // Gold belt
  beltGlow: '#ffed4a',   // Belt glow
  building: '#1e293b',   // Dark buildings
  buildingDark: '#0f172a', // Darker
  buildingEdge: '#334155', // Subtle edge
  window: '#fef3c7',     // Warm window glow
  windowOff: '#1e293b',  // Dark windows
  ground: '#0f172a',     // Dark ground
  groundLine: '#334155', // Ground detail
  moon: '#fef9c3',       // Moon
  moonGlow: '#fef08a',   // Moon outer glow
  sweat: '#67e8f9',      // Cyan sweat (more visible)
  heroGlow: '#a855f7',   // Purple glow around hero
};

// UI colors - dark Gotham theme
const COLORS = {
  bg: '#020617',
  surface: '#0f172a',
  gold: '#fef08a',
  purple: '#7c3aed',
  teal: '#2dd4bf',
  cream: '#f8fafc',
  muted: '#64748b',
  coral: '#f87171',
};

const SCORE_FLOW_COLORS: ScoreFlowColors = {
  bg: COLORS.bg,
  surface: COLORS.surface,
  primary: COLORS.gold,
  secondary: COLORS.purple,
  text: COLORS.cream,
  muted: COLORS.muted,
  error: COLORS.coral,
};

const LEADERBOARD_COLORS: LeaderboardColors = {
  bg: COLORS.bg,
  surface: COLORS.surface,
  primary: COLORS.gold,
  secondary: COLORS.purple,
  text: COLORS.cream,
  muted: COLORS.muted,
};

const GAME_ID = 'batdash';

// Audio context (initialized on first interaction)
let audioCtx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let musicInterval: ReturnType<typeof setInterval> | null = null;
let musicBeat = 0;

// DARK SYNTHWAVE - Hotline Miami meets midnight city
const NOTES = {
  // Dark minor key (A minor / D minor vibes)
  A2: 110.00, C3: 130.81, D3: 146.83, E3: 164.81, F3: 174.61, G3: 196.00,
  A3: 220.00, C4: 261.63, D4: 293.66, E4: 329.63,
  // Sub bass
  A1: 55.00, D2: 73.42,
};
// Moody arpeggio pattern (minor, brooding)
const ARP = [NOTES.A3, NOTES.C4, NOTES.E4, NOTES.D4, NOTES.C4, NOTES.A3, NOTES.E3, NOTES.G3];
const BASS_PATTERN = [NOTES.A1, 0, NOTES.A1, 0, NOTES.D2, 0, NOTES.A1, NOTES.A1];
const BPM = 118; // That perfect dark driving tempo
const BEAT_MS = 60000 / BPM / 2; // 8th notes

function initAudio() {
  if (audioCtx) return;
  audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  masterGain = audioCtx.createGain();
  masterGain.gain.value = 0.35;
  masterGain.connect(audioCtx.destination);
  if (audioCtx.state === 'suspended') audioCtx.resume();
}

function playMusicNote() {
  if (!audioCtx || !masterGain) return;
  const t = audioCtx.currentTime;
  const step = musicBeat % 8;

  // Pulsing synth arp (filtered saw, very 80s)
  const arpNote = ARP[step];
  if (arpNote) {
    const arp = audioCtx.createOscillator();
    const arpGain = audioCtx.createGain();
    const arpFilter = audioCtx.createBiquadFilter();
    arp.type = 'sawtooth';
    arp.frequency.value = arpNote;
    arpFilter.type = 'lowpass';
    arpFilter.frequency.value = 1800 + Math.sin(musicBeat * 0.2) * 600; // Filter sweep
    arpFilter.Q.value = 2;
    arpGain.gain.setValueAtTime(0.12, t);
    arpGain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    arp.connect(arpFilter);
    arpFilter.connect(arpGain);
    arpGain.connect(masterGain);
    arp.start(t);
    arp.stop(t + 0.12);
  }

  // Thick sub bass (sine + slight saw layer)
  const bassNote = BASS_PATTERN[step];
  if (bassNote) {
    const bass = audioCtx.createOscillator();
    const bass2 = audioCtx.createOscillator();
    const bassGain = audioCtx.createGain();
    bass.type = 'sine';
    bass2.type = 'sawtooth';
    bass.frequency.value = bassNote;
    bass2.frequency.value = bassNote * 2;
    bassGain.gain.setValueAtTime(0.25, t);
    bassGain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    const bassFilter = audioCtx.createBiquadFilter();
    bassFilter.type = 'lowpass';
    bassFilter.frequency.value = 200;
    bass.connect(bassGain);
    bass2.connect(bassFilter);
    bassFilter.connect(bassGain);
    bassGain.connect(masterGain);
    bass.start(t);
    bass2.start(t);
    bass.stop(t + 0.15);
    bass2.stop(t + 0.15);
  }

  // Punchy kick on 1 and 5 (the THUMP)
  if (step === 0 || step === 4) {
    const kick = audioCtx.createOscillator();
    const kickGain = audioCtx.createGain();
    kick.type = 'sine';
    kick.frequency.setValueAtTime(150, t);
    kick.frequency.exponentialRampToValueAtTime(30, t + 0.1);
    kickGain.gain.setValueAtTime(0.5, t);
    kickGain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    kick.connect(kickGain);
    kickGain.connect(masterGain);
    kick.start(t);
    kick.stop(t + 0.15);
    // Click transient
    const click = audioCtx.createOscillator();
    const clickGain = audioCtx.createGain();
    click.type = 'square';
    click.frequency.value = 1000;
    clickGain.gain.setValueAtTime(0.1, t);
    clickGain.gain.exponentialRampToValueAtTime(0.001, t + 0.01);
    click.connect(clickGain);
    clickGain.connect(masterGain);
    click.start(t);
    click.stop(t + 0.02);
  }

  // Tight hihat on every 8th
  const hatBuffer = audioCtx.sampleRate * 0.03;
  const hatBuf = audioCtx.createBuffer(1, hatBuffer, audioCtx.sampleRate);
  const hatData = hatBuf.getChannelData(0);
  for (let i = 0; i < hatBuffer; i++) {
    hatData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / hatBuffer, 4);
  }
  const hat = audioCtx.createBufferSource();
  hat.buffer = hatBuf;
  const hatGain = audioCtx.createGain();
  const hatFilter = audioCtx.createBiquadFilter();
  hatFilter.type = 'highpass';
  hatFilter.frequency.value = 7000;
  hatGain.gain.value = step % 2 === 0 ? 0.08 : 0.04; // Accent pattern
  hat.connect(hatFilter);
  hatFilter.connect(hatGain);
  hatGain.connect(masterGain);
  hat.start(t);

  // Snare on 3 and 7
  if (step === 2 || step === 6) {
    const snrBuffer = audioCtx.sampleRate * 0.12;
    const snrBuf = audioCtx.createBuffer(1, snrBuffer, audioCtx.sampleRate);
    const snrData = snrBuf.getChannelData(0);
    for (let i = 0; i < snrBuffer; i++) {
      snrData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / snrBuffer, 2);
    }
    const snr = audioCtx.createBufferSource();
    snr.buffer = snrBuf;
    const snrGain = audioCtx.createGain();
    const snrFilter = audioCtx.createBiquadFilter();
    snrFilter.type = 'bandpass';
    snrFilter.frequency.value = 3000;
    snrGain.gain.value = 0.18;
    snr.connect(snrFilter);
    snrFilter.connect(snrGain);
    snrGain.connect(masterGain);
    snr.start(t);
    // Snare body
    const snrBody = audioCtx.createOscillator();
    const snrBodyGain = audioCtx.createGain();
    snrBody.type = 'triangle';
    snrBody.frequency.setValueAtTime(200, t);
    snrBody.frequency.exponentialRampToValueAtTime(100, t + 0.05);
    snrBodyGain.gain.setValueAtTime(0.15, t);
    snrBodyGain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    snrBody.connect(snrBodyGain);
    snrBodyGain.connect(masterGain);
    snrBody.start(t);
    snrBody.stop(t + 0.1);
  }

  // Synth stab every 16 steps (builds tension)
  if (musicBeat % 16 === 0) {
    [NOTES.A3, NOTES.C4, NOTES.E4].forEach((freq, i) => {
      const stab = audioCtx!.createOscillator();
      const stabGain = audioCtx!.createGain();
      const stabFilter = audioCtx!.createBiquadFilter();
      stab.type = 'sawtooth';
      stab.frequency.value = freq;
      stabFilter.type = 'lowpass';
      stabFilter.frequency.setValueAtTime(3000, t);
      stabFilter.frequency.exponentialRampToValueAtTime(500, t + 0.3);
      stabGain.gain.setValueAtTime(0.08, t);
      stabGain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
      stab.connect(stabFilter);
      stabFilter.connect(stabGain);
      stabGain.connect(masterGain!);
      stab.start(t);
      stab.stop(t + 0.35);
    });
  }

  musicBeat++;
}

function startMusic() {
  if (!audioCtx || musicInterval) return;
  musicBeat = 0;
  
  // Play first note immediately (iOS unlock requires immediate playback)
  playMusicNote();
  
  // Then continue with interval
  musicInterval = setInterval(playMusicNote, BEAT_MS);
}

function stopMusic() {
  if (musicInterval) {
    clearInterval(musicInterval);
    musicInterval = null;
  }
}

function playFlap() {
  if (!audioCtx || !masterGain) return;
  const t = audioCtx.currentTime;

  // Punchy synth whoosh - stylized, not realistic
  const whoosh = audioCtx.createOscillator();
  const whooshGain = audioCtx.createGain();
  const whooshFilter = audioCtx.createBiquadFilter();
  whoosh.type = 'sawtooth';
  whoosh.frequency.setValueAtTime(200, t);
  whoosh.frequency.exponentialRampToValueAtTime(80, t + 0.08);
  whooshFilter.type = 'lowpass';
  whooshFilter.frequency.setValueAtTime(2000, t);
  whooshFilter.frequency.exponentialRampToValueAtTime(200, t + 0.08);
  whooshGain.gain.setValueAtTime(0.15, t);
  whooshGain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
  whoosh.connect(whooshFilter);
  whooshFilter.connect(whooshGain);
  whooshGain.connect(masterGain);
  whoosh.start(t);
  whoosh.stop(t + 0.1);

  // Subtle grunt undertone (he IS struggling)
  const grunt = audioCtx.createOscillator();
  const gruntGain = audioCtx.createGain();
  grunt.type = 'sine';
  grunt.frequency.setValueAtTime(90, t);
  grunt.frequency.exponentialRampToValueAtTime(60, t + 0.08);
  gruntGain.gain.setValueAtTime(0.08, t);
  gruntGain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
  grunt.connect(gruntGain);
  gruntGain.connect(masterGain);
  grunt.start(t);
  grunt.stop(t + 0.1);
}

function playScore() {
  if (!audioCtx || !masterGain) return;
  const t = audioCtx.currentTime;

  // Tight synth hit - satisfying but quick
  const hit = audioCtx.createOscillator();
  const hitGain = audioCtx.createGain();
  const hitFilter = audioCtx.createBiquadFilter();
  hit.type = 'square';
  hit.frequency.value = 440;
  hitFilter.type = 'lowpass';
  hitFilter.frequency.setValueAtTime(4000, t);
  hitFilter.frequency.exponentialRampToValueAtTime(800, t + 0.08);
  hitGain.gain.setValueAtTime(0.12, t);
  hitGain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
  hit.connect(hitFilter);
  hitFilter.connect(hitGain);
  hitGain.connect(masterGain);
  hit.start(t);
  hit.stop(t + 0.1);

  // Rising arp blip
  [330, 440, 550].forEach((freq, i) => {
    const blip = audioCtx!.createOscillator();
    const blipGain = audioCtx!.createGain();
    blip.type = 'sine';
    blip.frequency.value = freq;
    blipGain.gain.setValueAtTime(0.08, t + i * 0.04);
    blipGain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.04 + 0.06);
    blip.connect(blipGain);
    blipGain.connect(masterGain!);
    blip.start(t + i * 0.04);
    blip.stop(t + i * 0.04 + 0.08);
  });
}

function playDeath() {
  if (!audioCtx || !masterGain) return;
  const t = audioCtx.currentTime;

  // Impact - deep thud
  const thud = audioCtx.createOscillator();
  const thudGain = audioCtx.createGain();
  thud.type = 'sine';
  thud.frequency.setValueAtTime(100, t);
  thud.frequency.exponentialRampToValueAtTime(30, t + 0.2);
  thudGain.gain.setValueAtTime(0.4, t);
  thudGain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
  thud.connect(thudGain);
  thudGain.connect(masterGain);
  thud.start(t);
  thud.stop(t + 0.25);

  // Noise burst
  const noiseLen = audioCtx.sampleRate * 0.15;
  const noiseBuf = audioCtx.createBuffer(1, noiseLen, audioCtx.sampleRate);
  const noiseData = noiseBuf.getChannelData(0);
  for (let i = 0; i < noiseLen; i++) {
    noiseData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / noiseLen, 2);
  }
  const noise = audioCtx.createBufferSource();
  noise.buffer = noiseBuf;
  const noiseGain = audioCtx.createGain();
  const noiseFilter = audioCtx.createBiquadFilter();
  noiseFilter.type = 'bandpass';
  noiseFilter.frequency.value = 1500;
  noiseGain.gain.value = 0.2;
  noise.connect(noiseFilter);
  noiseFilter.connect(noiseGain);
  noiseGain.connect(masterGain);
  noise.start(t);

  // Descending pitch slide (defeat)
  setTimeout(() => {
    if (!audioCtx || !masterGain) return;
    const slide = audioCtx.createOscillator();
    const slideGain = audioCtx.createGain();
    const slideFilter = audioCtx.createBiquadFilter();
    slide.type = 'sawtooth';
    slide.frequency.setValueAtTime(300, audioCtx.currentTime);
    slide.frequency.exponentialRampToValueAtTime(50, audioCtx.currentTime + 0.4);
    slideFilter.type = 'lowpass';
    slideFilter.frequency.value = 600;
    slideGain.gain.setValueAtTime(0.1, audioCtx.currentTime);
    slideGain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4);
    slide.connect(slideFilter);
    slideFilter.connect(slideGain);
    slideGain.connect(masterGain);
    slide.start();
    slide.stop(audioCtx.currentTime + 0.4);
  }, 150);
}

// Game over messages - randomly selected
const GAME_OVER_MESSAGES = [
  'oof. he tried.',
  'the underpants survive',
  'not all heroes soar',
  'gravity wins again',
  'a hero rests',
  'back to the couch',
  'he gave it his all',
  'the cape is fine',
  'night: 1, hero: 0',
  'well. that happened.',
  "he'll be back",
  'at least he had the outfit',
];

export default function FlappyGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<'start' | 'playing' | 'gameover' | 'leaderboard'>('start');
  const [score, setScore] = useState(0);
  const [musicEnabled, setMusicEnabled] = useState(false);
  const [socialLoaded, setSocialLoaded] = useState(false);
  const [submittedEntryId, setSubmittedEntryId] = useState<number | null>(null);
  const [progression, setProgression] = useState<ProgressionResult | null>(null);
  const [gameOverMessage, setGameOverMessage] = useState('');

  const { user } = usePixelpitSocial(socialLoaded);

  // Game state ref (sizes scaled for mobile)
  const getMobileScale = () => typeof window !== 'undefined' ? Math.min(window.innerWidth / 500, 1) : 1;
  const gameRef = useRef({
    running: false,
    warmup: false,       // Warmup phase (2 sec before pipes)
    warmupStart: 0,      // Timestamp when warmup began
    score: 0,
    pipesPassed: 0,      // Track pipes for difficulty curve
    mobileScale: 1,      // Set on resize
    bird: { x: 0, y: 0, vy: 0, size: 24, scaleX: 1, scaleY: 1 },  // Smaller bird (was 30)
    pipes: [] as Array<{ x: number; gapY: number; scored: boolean; wobble: number }>,
    particles: [] as Array<{ x: number; y: number; vx: number; vy: number; life: number; color: string }>,
    screenFlash: 0,      // Flash intensity (0-1)
    countdown: '',       // Countdown text to display
    gravity: 0.4,
    jumpForce: -9,
    pipeGap: 220,        // Easier start
    minGap: 160,         // Never harder than this
    gapShrinkRate: 2,    // Shrink by 2px every 5 pipes
    pipeWidth: 50,        // Slightly narrower pipes (was 60)
    pipeSpeed: 2.5,
    speedIncreaseRate: 0.1,  // Speed up by 0.1 every 5 pipes
    groundY: 0,
  });

  const startGame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Unlock audio on iOS - Play button tap is a valid user gesture
    initAudio();
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    // Auto-start music
    if (!musicEnabled) {
      startMusic();
      setMusicEnabled(true);
    }

    const game = gameRef.current;
    game.bird.x = canvas.width * 0.2;
    game.bird.y = canvas.height * 0.5;
    game.bird.vy = 0;
    game.bird.scaleX = 1;
    game.bird.scaleY = 1;
    game.pipes = [];
    game.particles = [];
    game.score = 0;
    game.pipesPassed = 0;
    game.screenFlash = 0;
    game.pipeGap = 220;      // Reset difficulty
    game.pipeSpeed = 2.5;
    game.running = true;
    game.warmup = true;      // Start in warmup mode
    game.warmupStart = Date.now();
    game.countdown = '';
    game.groundY = canvas.height - 50;

    setScore(0);
    setGameState('playing');
    setSubmittedEntryId(null);
    setProgression(null);
    // Don't spawn pipes yet - wait for warmup to end
  }, [musicEnabled]);

  const spawnPipe = useCallback(() => {
    const canvas = canvasRef.current;
    const game = gameRef.current;
    if (!canvas) return;

    const minY = 100;
    const maxY = game.groundY - game.pipeGap - 100;
    const gapY = minY + Math.random() * (maxY - minY);
    game.pipes.push({ x: canvas.width, gapY, scored: false, wobble: Math.random() * Math.PI * 2 });
  }, []);
  
  const spawnDeathParticles = useCallback(() => {
    const game = gameRef.current;
    // Include underpants red and skin for comic effect
    const colors = [THEME.bat, THEME.undies, THEME.skin, THEME.belt, THEME.cape, '#fff'];
    for (let i = 0; i < 25; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 5;
      game.particles.push({
        x: game.bird.x,
        y: game.bird.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 3,
        life: 1,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }
  }, []);

  const flap = useCallback(() => {
    initAudio();
    const game = gameRef.current;
    if (gameState === 'start') {
      startGame();
    } else if (gameState === 'playing' && game.running) {
      // Squash on flap (stretch vertically, compress horizontally)
      game.bird.scaleX = 0.7;
      game.bird.scaleY = 1.4;
      playFlap();
      // Only apply jump force after warmup
      if (!game.warmup) {
        game.bird.vy = game.jumpForce;
      }
    } else if (gameState === 'gameover') {
      setGameState('start');
    }
  }, [gameState, startGame]);

  const gameOver = useCallback(() => {
    const game = gameRef.current;
    game.running = false;
    spawnDeathParticles();
    playDeath();

    // Track play for analytics
    if (game.score >= 1) {
      fetch('/api/pixelpit/stats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ game: GAME_ID }),
      }).catch(() => {});
    }

    // Pick random game over message
    setGameOverMessage(GAME_OVER_MESSAGES[Math.floor(Math.random() * GAME_OVER_MESSAGES.length)]);

    setScore(game.score);
    setTimeout(() => setGameState('gameover'), 500);  // Slightly longer to see particles
  }, [spawnDeathParticles]);

  // Game loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      gameRef.current.groundY = canvas.height - 50;
      gameRef.current.mobileScale = getMobileScale();
    };
    resize();
    window.addEventListener('resize', resize);

    let animationId: number;

    const update = () => {
      const game = gameRef.current;
      
      // Always update particles (even after death)
      for (let i = game.particles.length - 1; i >= 0; i--) {
        const p = game.particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.15;  // Gravity on particles
        p.life -= 0.02;
        if (p.life <= 0) game.particles.splice(i, 1);
      }
      
      // Decay screen flash
      if (game.screenFlash > 0) {
        game.screenFlash *= 0.85;
        if (game.screenFlash < 0.01) game.screenFlash = 0;
      }
      
      if (!game.running) return;
      
      // Squash/stretch recovery (lerp back to 1)
      game.bird.scaleX += (1 - game.bird.scaleX) * 0.15;
      game.bird.scaleY += (1 - game.bird.scaleY) * 0.15;

      // Warmup phase: 2 seconds before real game starts
      if (game.warmup) {
        const elapsed = (Date.now() - game.warmupStart) / 1000;
        
        // Gentle bob instead of gravity
        game.bird.y = canvas.height * 0.5 + Math.sin(Date.now() / 200) * 8;
        game.bird.vy = 0;
        
        // Countdown display
        if (elapsed < 1) {
          game.countdown = 'TAP TO FLAP';
        } else if (elapsed < 1.33) {
          game.countdown = '3';
        } else if (elapsed < 1.66) {
          game.countdown = '2';
        } else if (elapsed < 2) {
          game.countdown = '1';
        } else {
          // Warmup done - GO!
          game.countdown = 'GO!';
          game.warmup = false;
          game.screenFlash = 0.5;  // Green flash
          spawnPipe();  // First pipe
          // Clear GO! after a moment
          setTimeout(() => { game.countdown = ''; }, 300);
        }
        return;  // Skip rest of update during warmup
      }

      // Bird physics (after warmup)
      game.bird.vy += game.gravity;
      game.bird.y += game.bird.vy;

      // Spawn pipes
      if (game.pipes.length === 0 || game.pipes[game.pipes.length - 1].x < canvas.width - 300) {
        spawnPipe();
      }

      // Update pipes
      for (let i = game.pipes.length - 1; i >= 0; i--) {
        game.pipes[i].x -= game.pipeSpeed;
        game.pipes[i].wobble += 0.08;  // Animate wobble

        // Score
        if (!game.pipes[i].scored && game.pipes[i].x + game.pipeWidth < game.bird.x) {
          game.pipes[i].scored = true;
          game.score++;
          game.pipesPassed++;
          game.screenFlash = 0.4;  // Flash on score
          setScore(game.score);
          playScore();
          
          // Progressive difficulty: every 5 pipes
          if (game.pipesPassed % 5 === 0) {
            game.pipeSpeed = Math.min(game.pipeSpeed + game.speedIncreaseRate, 4);
            game.pipeGap = Math.max(game.pipeGap - game.gapShrinkRate, game.minGap);
          }
        }

        // Remove off-screen
        if (game.pipes[i].x + game.pipeWidth < 0) {
          game.pipes.splice(i, 1);
        }
      }

      // Collision - ground/ceiling
      if (game.bird.y + game.bird.size > game.groundY || game.bird.y - game.bird.size < 0) {
        gameOver();
        return;
      }

      // Collision - pipes
      for (const pipe of game.pipes) {
        if (game.bird.x + game.bird.size > pipe.x && game.bird.x - game.bird.size < pipe.x + game.pipeWidth) {
          if (game.bird.y - game.bird.size < pipe.gapY || game.bird.y + game.bird.size > pipe.gapY + game.pipeGap) {
            gameOver();
            return;
          }
        }
      }
    };

    const draw = () => {
      const game = gameRef.current;

      // Deep noir sky gradient
      const skyGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
      skyGrad.addColorStop(0, '#0a0a18');
      skyGrad.addColorStop(0.4, THEME.sky);
      skyGrad.addColorStop(0.8, THEME.skyDark);
      skyGrad.addColorStop(1, '#000');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Subtle stars
      ctx.fillStyle = '#fff';
      for (let i = 0; i < 30; i++) {
        const sx = (i * 137 + 50) % canvas.width;
        const sy = (i * 89 + 20) % (canvas.height * 0.4);
        ctx.globalAlpha = 0.3 + Math.sin(Date.now() / 1000 + i) * 0.2;
        ctx.fillRect(sx, sy, 1, 1);
      }
      ctx.globalAlpha = 1;

      // Moon with proper glow
      const moonX = canvas.width - 70;
      const moonY = 70;
      // Outer glow
      const moonGlow = ctx.createRadialGradient(moonX, moonY, 20, moonX, moonY, 80);
      moonGlow.addColorStop(0, 'rgba(254, 249, 195, 0.2)');
      moonGlow.addColorStop(0.5, 'rgba(254, 249, 195, 0.05)');
      moonGlow.addColorStop(1, 'rgba(254, 249, 195, 0)');
      ctx.fillStyle = moonGlow;
      ctx.fillRect(moonX - 80, moonY - 80, 160, 160);
      // Moon body
      ctx.fillStyle = THEME.moon;
      ctx.globalAlpha = 0.9;
      ctx.beginPath();
      ctx.arc(moonX, moonY, 28, 0, Math.PI * 2);
      ctx.fill();
      // Moon craters (subtle)
      ctx.fillStyle = 'rgba(0,0,0,0.1)';
      ctx.beginPath();
      ctx.arc(moonX - 8, moonY - 5, 6, 0, Math.PI * 2);
      ctx.arc(moonX + 10, moonY + 8, 4, 0, Math.PI * 2);
      ctx.arc(moonX - 3, moonY + 10, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;

      // Distant city skyline (parallax, no flicker)
      ctx.fillStyle = '#0f172a';
      for (let x = 0; x < canvas.width; x += 50) {
        const seed = Math.sin(x * 0.1) * 0.5 + 0.5;
        const h = 40 + seed * 50;
        ctx.fillRect(x, game.groundY - h, 55, h);
      }

      // Buildings (pipes) with windows
      for (const pipe of game.pipes) {
        const wobbleOffset = Math.sin(pipe.wobble) * 1;
        
        ctx.save();
        ctx.translate(pipe.x + game.pipeWidth / 2, 0);
        ctx.translate(wobbleOffset, 0);
        ctx.translate(-(pipe.x + game.pipeWidth / 2), 0);
        
        // Top building (hanging down)
        ctx.fillStyle = THEME.building;
        ctx.fillRect(pipe.x, 0, game.pipeWidth, pipe.gapY);
        // Building edge detail
        ctx.fillStyle = THEME.buildingDark;
        ctx.fillRect(pipe.x, 0, 4, pipe.gapY);
        ctx.fillRect(pipe.x + game.pipeWidth - 4, 0, 4, pipe.gapY);
        // Bottom ledge
        ctx.fillStyle = THEME.buildingDark;
        ctx.fillRect(pipe.x - 8, pipe.gapY - 15, game.pipeWidth + 16, 15);
        
        // Windows on top building - mostly static, rare special effects
        // Pick ONE special window per building based on pipe position
        const specialSeed = Math.abs(Math.sin(pipe.x * 0.1)) ;
        const specialType = Math.floor(specialSeed * 5);
        const specialWy = 20 + Math.floor(specialSeed * 3) * 35;
        const specialWx = 10;

        for (let wy = 20; wy < pipe.gapY - 30; wy += 35) {
          for (let wx = 10; wx < game.pipeWidth - 10; wx += 18) {
            const seed = Math.abs(Math.sin(pipe.x * 0.05 + wx * 3 + wy * 7));
            const isLit = seed > 0.35;
            const isSpecial = (wy === specialWy && wx === specialWx && pipe.gapY > 150);

            // Base window
            ctx.globalAlpha = isLit ? 0.9 : 0.12;
            ctx.fillStyle = THEME.window;
            ctx.fillRect(pipe.x + wx, wy, 10, 15);

            // Special window effects (rare - only one per building)
            if (isSpecial && isLit) {
              const wx2 = pipe.x + wx;
              const time = Date.now();

              if (specialType === 0) {
                // ZZZs floating out
                ctx.globalAlpha = 0.7;
                ctx.fillStyle = '#a5f3fc';
                ctx.font = 'bold 8px monospace';
                const zOffset = (time / 500) % 3;
                ctx.fillText('z', wx2 + 12 + zOffset * 3, wy - 2 - zOffset * 4);
                ctx.font = 'bold 10px monospace';
                ctx.fillText('Z', wx2 + 16 + zOffset * 4, wy - 8 - zOffset * 5);
                ctx.font = 'bold 12px monospace';
                ctx.globalAlpha = 0.4;
                ctx.fillText('Z', wx2 + 22 + zOffset * 3, wy - 16 - zOffset * 4);
              } else if (specialType === 1) {
                // Party strobes
                const strobeColor = Math.floor(time / 80) % 4;
                const colors = ['#f472b6', '#a78bfa', '#34d399', '#fbbf24'];
                ctx.fillStyle = colors[strobeColor];
                ctx.globalAlpha = 0.9;
                ctx.fillRect(pipe.x + wx, wy, 10, 15);
                // Light rays
                ctx.globalAlpha = 0.3;
                ctx.beginPath();
                ctx.moveTo(wx2 + 5, wy + 7);
                ctx.lineTo(wx2 - 5 + Math.sin(time / 100) * 8, wy - 15);
                ctx.lineTo(wx2 + 15 + Math.cos(time / 100) * 8, wy - 15);
                ctx.fill();
              } else if (specialType === 2) {
                // TV glow (flickering blue)
                const flicker = Math.sin(time / 50) * 0.3 + 0.6;
                ctx.fillStyle = `rgba(100, 180, 255, ${flicker})`;
                ctx.fillRect(pipe.x + wx, wy, 10, 15);
                // Scan lines
                ctx.fillStyle = 'rgba(0,0,0,0.3)';
                for (let sy = wy; sy < wy + 15; sy += 3) {
                  ctx.fillRect(pipe.x + wx, sy, 10, 1);
                }
              } else if (specialType === 3) {
                // Music notes floating
                ctx.globalAlpha = 0.8;
                ctx.fillStyle = '#fbbf24';
                ctx.font = '10px serif';
                const noteY = (time / 300) % 20;
                ctx.fillText('♪', wx2 + 11, wy + 5 - noteY);
                ctx.globalAlpha = 0.5;
                ctx.fillText('♫', wx2 + 15, wy + 10 - (noteY + 5) % 20);
              } else {
                // Red alarm / emergency light
                const pulse = Math.sin(time / 150) > 0;
                if (pulse) {
                  ctx.fillStyle = '#ef4444';
                  ctx.globalAlpha = 0.9;
                  ctx.fillRect(pipe.x + wx, wy, 10, 15);
                  // Glow
                  ctx.globalAlpha = 0.2;
                  ctx.beginPath();
                  ctx.arc(wx2 + 5, wy + 7, 15, 0, Math.PI * 2);
                  ctx.fill();
                }
              }
            }
          }
        }
        ctx.globalAlpha = 1;

        // Bottom building (rising up)
        ctx.fillStyle = THEME.building;
        ctx.fillRect(pipe.x, pipe.gapY + game.pipeGap, game.pipeWidth, canvas.height - pipe.gapY - game.pipeGap);
        // Building edge detail
        ctx.fillStyle = THEME.buildingDark;
        ctx.fillRect(pipe.x, pipe.gapY + game.pipeGap, 4, canvas.height);
        ctx.fillRect(pipe.x + game.pipeWidth - 4, pipe.gapY + game.pipeGap, 4, canvas.height);
        // Top ledge
        ctx.fillStyle = THEME.buildingDark;
        ctx.fillRect(pipe.x - 8, pipe.gapY + game.pipeGap, game.pipeWidth + 16, 15);
        
        // Windows on bottom building - mostly static, rare special effects
        const specialSeed2 = Math.abs(Math.cos(pipe.x * 0.15));
        const specialType2 = Math.floor(specialSeed2 * 5);
        const baseWy = pipe.gapY + game.pipeGap + 30;
        const specialWy2 = baseWy + Math.floor(specialSeed2 * 2) * 35;

        for (let wy = baseWy; wy < game.groundY - 20; wy += 35) {
          for (let wx = 10; wx < game.pipeWidth - 10; wx += 18) {
            const seed = Math.abs(Math.sin(pipe.x * 0.07 + wx * 5 + wy * 11));
            const isLit = seed > 0.3;
            const isSpecial = (wy === specialWy2 && wx === 10 && game.groundY - baseWy > 60);

            // Base window
            ctx.globalAlpha = isLit ? 0.9 : 0.12;
            ctx.fillStyle = THEME.window;
            ctx.fillRect(pipe.x + wx, wy, 10, 15);

            // Special window effects
            if (isSpecial && isLit) {
              const wx2 = pipe.x + wx;
              const time = Date.now();

              if (specialType2 === 0) {
                // Steam/smoke rising
                ctx.globalAlpha = 0.4;
                ctx.fillStyle = '#e2e8f0';
                const smokeT = (time / 400) % 1;
                for (let s = 0; s < 3; s++) {
                  const sT = (smokeT + s * 0.3) % 1;
                  const sx = wx2 + 5 + Math.sin(sT * 6 + s) * 4;
                  const sy = wy - 5 - sT * 25;
                  ctx.globalAlpha = 0.3 * (1 - sT);
                  ctx.beginPath();
                  ctx.arc(sx, sy, 3 + sT * 3, 0, Math.PI * 2);
                  ctx.fill();
                }
              } else if (specialType2 === 1) {
                // Neon sign flicker (like a bar)
                const flicker = Math.random() > 0.1;
                if (flicker) {
                  ctx.fillStyle = '#f472b6';
                  ctx.globalAlpha = 0.95;
                  ctx.fillRect(pipe.x + wx, wy, 10, 15);
                  // Neon glow
                  ctx.globalAlpha = 0.15;
                  ctx.shadowColor = '#f472b6';
                  ctx.shadowBlur = 10;
                  ctx.fillRect(pipe.x + wx - 2, wy - 2, 14, 19);
                  ctx.shadowBlur = 0;
                }
              } else if (specialType2 === 2) {
                // Candle flicker (warm, cozy)
                const flicker = 0.6 + Math.sin(time / 80) * 0.2 + Math.random() * 0.2;
                ctx.fillStyle = `rgba(251, 191, 36, ${flicker})`;
                ctx.fillRect(pipe.x + wx, wy, 10, 15);
              } else if (specialType2 === 3) {
                // Phone screen glow (scrolling)
                ctx.fillStyle = 'rgba(96, 165, 250, 0.7)';
                ctx.globalAlpha = 0.8;
                ctx.fillRect(pipe.x + wx + 3, wy + 4, 4, 7);
                // Thumb scrolling
                const scrollY = (time / 200) % 6;
                ctx.fillStyle = 'rgba(0,0,0,0.5)';
                ctx.fillRect(pipe.x + wx + 4, wy + 5 + scrollY, 2, 2);
              } else {
                // Welding sparks
                if (Math.random() > 0.7) {
                  ctx.fillStyle = '#fef08a';
                  ctx.globalAlpha = 0.9;
                  for (let sp = 0; sp < 5; sp++) {
                    const spx = wx2 + 5 + (Math.random() - 0.5) * 15;
                    const spy = wy + 7 + (Math.random() - 0.5) * 10;
                    ctx.fillRect(spx, spy, 2, 2);
                  }
                  // Bright center
                  ctx.beginPath();
                  ctx.arc(wx2 + 5, wy + 7, 3, 0, Math.PI * 2);
                  ctx.fill();
                }
              }
            }
          }
        }
        ctx.globalAlpha = 1;
        
        ctx.restore();
      }

      // Ground - dark street
      ctx.fillStyle = THEME.ground;
      ctx.fillRect(0, game.groundY, canvas.width, canvas.height - game.groundY);
      ctx.fillStyle = THEME.groundDark;
      ctx.fillRect(0, game.groundY, canvas.width, 5);

      // CHUBBY HERO - indie style with glow
      ctx.save();
      ctx.translate(game.bird.x, game.bird.y);
      ctx.scale(game.bird.scaleX, game.bird.scaleY);
      const s = game.bird.size;

      // HERO GLOW (subtle purple aura)
      ctx.shadowColor = THEME.heroGlow;
      ctx.shadowBlur = 15;
      ctx.fillStyle = 'rgba(168, 85, 247, 0.15)';
      ctx.beginPath();
      ctx.ellipse(0, 0, s * 1.2, s * 1.0, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Cape with glow effect (actually dramatic now)
      ctx.shadowColor = THEME.cape;
      ctx.shadowBlur = 8;
      ctx.fillStyle = THEME.cape;
      ctx.beginPath();
      ctx.moveTo(-s * 0.3, -s * 0.2);
      ctx.quadraticCurveTo(-s * 1.4, s * 0.4 + game.bird.vy * 2, -s * 1.8, s * 1.2);
      ctx.lineTo(-s * 1.5, s * 0.9);
      ctx.quadraticCurveTo(-s * 0.9, s * 0.3, -s * 0.3, s * 0.1);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Stick legs dangling
      ctx.strokeStyle = THEME.skin;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-s * 0.2, s * 0.6);
      ctx.lineTo(-s * 0.3, s * 1.2);
      ctx.moveTo(s * 0.2, s * 0.6);
      ctx.lineTo(s * 0.3, s * 1.2);
      ctx.stroke();

      // Little boots
      ctx.fillStyle = '#1e1b4b';
      ctx.beginPath();
      ctx.ellipse(-s * 0.3, s * 1.25, 4, 3, 0, 0, Math.PI * 2);
      ctx.ellipse(s * 0.3, s * 1.25, 4, 3, 0, 0, Math.PI * 2);
      ctx.fill();

      // Chubby body with beer belly
      ctx.fillStyle = THEME.bat;
      ctx.beginPath();
      ctx.ellipse(0, 0, s * 0.7, s * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();
      // Beer belly poking out
      ctx.fillStyle = THEME.skin;
      ctx.beginPath();
      ctx.ellipse(0, s * 0.15, s * 0.35, s * 0.25, 0, 0, Math.PI * 2);
      ctx.fill();

      // HOT PINK UNDERPANTS ON OUTSIDE (iconic)
      ctx.shadowColor = THEME.undies;
      ctx.shadowBlur = 6;
      ctx.fillStyle = THEME.undies;
      ctx.beginPath();
      ctx.moveTo(-s * 0.5, s * 0.3);
      ctx.lineTo(s * 0.5, s * 0.3);
      ctx.lineTo(s * 0.4, s * 0.7);
      ctx.lineTo(-s * 0.4, s * 0.7);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;

      // UTILITY BELT (gold with glow)
      ctx.shadowColor = THEME.beltGlow;
      ctx.shadowBlur = 10;
      ctx.fillStyle = THEME.belt;
      ctx.fillRect(-s * 0.6, s * 0.25, s * 1.2, s * 0.15);
      ctx.shadowBlur = 0;
      // Belt buckle (shiny)
      ctx.fillStyle = THEME.beltGlow;
      ctx.beginPath();
      ctx.ellipse(0, s * 0.32, s * 0.12, s * 0.1, 0, 0, Math.PI * 2);
      ctx.fill();
      // Belt pouches
      ctx.fillStyle = '#b45309';
      ctx.fillRect(-s * 0.55, s * 0.2, s * 0.15, s * 0.2);
      ctx.fillRect(s * 0.4, s * 0.2, s * 0.15, s * 0.2);

      // Stick arms flailing
      const armWave = Math.sin(Date.now() / 100) * 0.3;
      ctx.strokeStyle = THEME.skin;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-s * 0.5, 0);
      ctx.lineTo(-s * 1.0, -s * (0.3 + armWave));
      ctx.moveTo(s * 0.5, 0);
      ctx.lineTo(s * 1.0, -s * (0.5 - armWave));
      ctx.stroke();

      // Little gloved hands
      ctx.fillStyle = '#1e1b4b';
      ctx.beginPath();
      ctx.arc(-s * 1.0, -s * (0.3 + armWave), 4, 0, Math.PI * 2);
      ctx.arc(s * 1.0, -s * (0.5 - armWave), 4, 0, Math.PI * 2);
      ctx.fill();

      // Head (slightly too big)
      ctx.fillStyle = THEME.bat;
      ctx.beginPath();
      ctx.arc(0, -s * 0.5, s * 0.45, 0, Math.PI * 2);
      ctx.fill();

      // Cowl opening showing chubby face
      ctx.fillStyle = THEME.skin;
      ctx.beginPath();
      ctx.ellipse(0, -s * 0.4, s * 0.25, s * 0.3, 0, 0, Math.PI * 2);
      ctx.fill();

      // Derpy bat ears (one slightly bent)
      ctx.fillStyle = THEME.bat;
      ctx.beginPath();
      ctx.moveTo(-s * 0.25, -s * 0.8);
      ctx.lineTo(-s * 0.35, -s * 1.3);
      ctx.lineTo(-s * 0.1, -s * 0.85);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(s * 0.25, -s * 0.8);
      ctx.lineTo(s * 0.4, -s * 1.25);  // Slightly bent
      ctx.lineTo(s * 0.35, -s * 1.15);
      ctx.lineTo(s * 0.1, -s * 0.85);
      ctx.fill();

      // Derpy eyes (looking different directions)
      ctx.fillStyle = THEME.batEye;
      ctx.beginPath();
      ctx.ellipse(-s * 0.1, -s * 0.45, 5, 6, 0, 0, Math.PI * 2);
      ctx.ellipse(s * 0.1, -s * 0.45, 5, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      // Pupils looking different ways
      ctx.fillStyle = THEME.batPupil;
      ctx.beginPath();
      ctx.arc(-s * 0.12, -s * 0.43, 2, 0, Math.PI * 2);  // Looking left
      ctx.arc(s * 0.12, -s * 0.47, 2, 0, Math.PI * 2);   // Looking up
      ctx.fill();

      // Worried eyebrows
      ctx.strokeStyle = THEME.bat;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-s * 0.18, -s * 0.55);
      ctx.lineTo(-s * 0.02, -s * 0.58);
      ctx.moveTo(s * 0.02, -s * 0.58);
      ctx.lineTo(s * 0.18, -s * 0.55);
      ctx.stroke();

      // Open mouth (stressed/yelling)
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.ellipse(0, -s * 0.25, s * 0.1, s * 0.08, 0, 0, Math.PI * 2);
      ctx.fill();

      // Sweat drops (animated, flying off)
      ctx.shadowColor = THEME.sweat;
      ctx.shadowBlur = 4;
      ctx.fillStyle = THEME.sweat;
      const sweatAnim = (Date.now() / 150) % 1;
      // Left sweat drop flying
      ctx.beginPath();
      ctx.ellipse(-s * 0.4 - sweatAnim * 8, -s * 0.55 - sweatAnim * 5, 2, 3, 0.4, 0, Math.PI * 2);
      ctx.fill();
      // Right sweat drop
      ctx.beginPath();
      ctx.ellipse(s * 0.45 + sweatAnim * 6, -s * 0.5 - sweatAnim * 4, 2, 3, -0.4, 0, Math.PI * 2);
      ctx.fill();
      // Extra drop when really struggling (high velocity)
      if (Math.abs(game.bird.vy) > 5) {
        ctx.globalAlpha = 0.7;
        ctx.beginPath();
        ctx.ellipse(-s * 0.2 - sweatAnim * 10, -s * 0.7 - sweatAnim * 8, 1.5, 2.5, 0.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
      ctx.shadowBlur = 0;

      // 5 o'clock shadow
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.beginPath();
      ctx.ellipse(0, -s * 0.2, s * 0.15, s * 0.1, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
      
      // Death particles
      for (const p of game.particles) {
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4 + p.life * 4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      
      // Screen flash on score (green for GO!, white otherwise)
      if (game.screenFlash > 0) {
        const flashColor = game.countdown === 'GO!' ? '163, 230, 53' : '255, 255, 255';
        ctx.fillStyle = `rgba(${flashColor}, ${game.screenFlash})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      
      // Countdown text during warmup
      if (game.countdown) {
        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        if (game.countdown === 'TAP TO FLAP') {
          // Pulsing instruction text
          const pulse = 0.6 + Math.sin(Date.now() / 200) * 0.4;
          ctx.globalAlpha = pulse;
          ctx.font = 'bold 24px ui-monospace, monospace';
          ctx.fillStyle = THEME.moon;
          ctx.shadowColor = '#000';
          ctx.shadowBlur = 4;
          ctx.fillText('tap. carry him.', canvas.width / 2, canvas.height / 2 + 80);
        } else if (game.countdown === 'GO!') {
          // Big purple GO! - Gotham style
          ctx.font = 'bold 72px ui-monospace, monospace';
          ctx.fillStyle = '#a855f7';
          ctx.shadowColor = THEME.batEye;
          ctx.shadowBlur = 15;
          ctx.fillText('GO!', canvas.width / 2, canvas.height / 2);
        } else {
          // Countdown numbers (3, 2, 1)
          ctx.font = 'bold 96px ui-monospace, monospace';
          ctx.fillStyle = '#fff';
          ctx.shadowColor = '#000';
          ctx.shadowBlur = 8;
          ctx.fillText(game.countdown, canvas.width / 2, canvas.height / 2);
        }
        
        ctx.restore();
      }
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
      flap();
    };
    const handleMouse = () => flap();
    const handleKey = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        flap();
      }
    };

    canvas.addEventListener('touchstart', handleTouch);
    canvas.addEventListener('mousedown', handleMouse);
    document.addEventListener('keydown', handleKey);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('touchstart', handleTouch);
      canvas.removeEventListener('mousedown', handleMouse);
      document.removeEventListener('keydown', handleKey);
    };
  }, [flap, gameOver, spawnPipe]);
  
  // Stop music on unmount only
  useEffect(() => {
    return () => { stopMusic(); };
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
          background: ${THEME.skyDark};
          overflow: hidden;
          touch-action: none;
          user-select: none;
        }
        button {
          transition: all 0.15s ease-out;
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
          0%, 100% { box-shadow: 0 8px 30px rgba(168,85,247,0.3); }
          50% { box-shadow: 0 8px 40px rgba(168,85,247,0.5); }
        }
      `}</style>

      <canvas
        ref={canvasRef}
        style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh' }}
      />

      {/* Score during play */}
      {gameState === 'playing' && (
        <div style={{
          position: 'fixed',
          top: 'max(60px, env(safe-area-inset-top, 60px))',
          left: 0,
          right: 0,
          textAlign: 'center',
          zIndex: 10,
          pointerEvents: 'none',
        }}>
          <div style={{
            fontFamily: 'ui-monospace, monospace',
            fontSize: 'min(64px, 12vw)',
            fontWeight: 700,
            color: '#fff',
            textShadow: '3px 3px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000',
          }}>
            {score}
          </div>
        </div>
      )}

      {/* Start screen */}
      {gameState === 'start' && (
        <div style={{
          position: 'fixed',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(0,0,0,0.4)',
          zIndex: 100,
        }}>
          <div style={{
            background: COLORS.surface,
            borderRadius: 16,
            padding: '50px 60px',
            textAlign: 'center',
            boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          }}>
            <h1 style={{
              fontFamily: 'ui-monospace, monospace',
              fontSize: 52,
              fontWeight: 700,
              color: COLORS.gold,
              marginBottom: 20,
              letterSpacing: 4,
              textShadow: '0 0 40px rgba(254,240,138,0.4)',
            }}>
              BAT DASH
            </h1>
            <p style={{
              fontSize: 16,
              fontFamily: 'ui-monospace, monospace',
              color: COLORS.purple,
              marginBottom: 35,
              letterSpacing: 2,
            }}>
              tap to flap<br />
              he&apos;s trying his best
            </p>
            <button
              className="btn-primary"
              onClick={startGame}
              style={{
                background: COLORS.gold,
                color: COLORS.bg,
                border: 'none',
                padding: '16px 50px',
                fontSize: 18,
                fontFamily: 'ui-monospace, monospace',
                fontWeight: 600,
                cursor: 'pointer',
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
            fontFamily: 'ui-monospace, monospace',
            letterSpacing: 3,
          }}>
            <span style={{ color: COLORS.gold }}>pixel</span>
            <span style={{ color: COLORS.teal }}>pit</span>
            <span style={{ color: COLORS.cream, opacity: 0.6 }}> arcade</span>
          </div>
        </div>
      )}

      {/* Game over screen */}
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
          padding: 40,
        }}>
          <h1 style={{
            fontFamily: 'ui-monospace, monospace',
            fontSize: 28,
            fontWeight: 300,
            color: COLORS.purple,
            marginBottom: 15,
            letterSpacing: 6,
          }}>
            {gameOverMessage}
          </h1>
          <div style={{
            fontFamily: 'ui-monospace, monospace',
            fontSize: 80,
            fontWeight: 200,
            color: COLORS.gold,
            marginBottom: 30,
            textShadow: '0 0 40px rgba(247,220,111,0.4)',
          }}>
            {score}
          </div>

          {/* Progression display */}
          {progression && (
            <div style={{
              background: COLORS.surface,
              borderRadius: 12,
              padding: '16px 24px',
              marginBottom: 20,
              textAlign: 'center',
            }}>
              <div style={{
                fontFamily: 'ui-monospace, monospace',
                fontSize: 18,
                color: COLORS.gold,
                marginBottom: 8,
              }}>
                +{progression.xpEarned} XP
              </div>
              <div style={{
                fontFamily: 'ui-monospace, monospace',
                fontSize: 12,
                color: COLORS.muted,
              }}>
                Level {progression.level} • {progression.streak > 1 ? `${progression.multiplier}x streak` : ''}
              </div>
            </div>
          )}

          {/* Score submission */}
          <ScoreFlow
            score={score}
            gameId={GAME_ID}
            colors={SCORE_FLOW_COLORS}
            xpDivisor={1}
            onRankReceived={(rank, entryId) => {
              setSubmittedEntryId(entryId ?? null);
            }}
            onProgression={(prog) => setProgression(prog)}
          />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 15, alignItems: 'center', marginTop: 20 }}>
            <button
              className="btn-primary"
              onClick={startGame}
              style={{
                background: COLORS.teal,
                color: COLORS.bg,
                border: 'none',
                borderRadius: 8,
                padding: '16px 50px',
                fontSize: 15,
                fontFamily: 'ui-monospace, monospace',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 8px 25px rgba(115,191,46,0.3)',
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
                fontFamily: 'ui-monospace, monospace',
                cursor: 'pointer',
                letterSpacing: 2,
              }}
            >
              leaderboard
            </button>
            <ShareButtonContainer
              id="share-btn-container"
              url={typeof window !== 'undefined' ? `${window.location.origin}/pixelpit/arcade/batdash/share/${score}` : ''}
              text={`I helped this chubby hero fly ${score} buildings in BAT DASH! He's trying his best 🦇`}
              style="minimal"
              socialLoaded={socialLoaded}
            />
          </div>
        </div>
      )}

      {/* Leaderboard screen */}
      {gameState === 'leaderboard' && (
        <Leaderboard
          gameId={GAME_ID}
          limit={10}
          entryId={submittedEntryId ?? undefined}
          colors={LEADERBOARD_COLORS}
          onClose={() => setGameState('gameover')}
        />
      )}
    </>
  );
}
