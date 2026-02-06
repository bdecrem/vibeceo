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

// CAVE MOTH theme — Luna moth in a crystal cavern
const THEME = {
  bg: '#0a0a1a',
  cave: '#2d1b4e',
  caveGlow: '#6c3483',
  player: '#a8e6cf',
  glow: '#4ecdc4',
  spike: '#9b59b6',
  spikeInner: '#e91e8f',
  text: '#f0e6ff',
  gridLine: '#1a1133',
  accent: '#c6f68d',
  gold: '#f4d03f',
};

// Background grid offset
let gridOffset = 0;

const GAME_ID = 'cavemoth';

const GAME_URL = typeof window !== 'undefined'
  ? `${window.location.origin}/pixelpit/arcade/cavemoth`
  : 'https://pixelpit.gg/pixelpit/arcade/cavemoth';

// Social colors
const SCORE_FLOW_COLORS: ScoreFlowColors = {
  bg: THEME.bg,
  surface: '#1a1133',
  primary: THEME.glow,
  secondary: THEME.accent,
  text: THEME.text,
  muted: '#8b7fa8',
  error: THEME.spikeInner,
};

const LEADERBOARD_COLORS: LeaderboardColors = {
  bg: THEME.bg,
  surface: '#1a1133',
  primary: THEME.glow,
  secondary: THEME.accent,
  text: THEME.text,
  muted: '#8b7fa8',
};

// Audio
let audioCtx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let musicInterval: ReturnType<typeof setInterval> | null = null;
let musicBeat = 0;
let musicLevel = 1;

// D minor: D2 = 73.42 Hz (darker than E minor)
const D2 = 73.42;
const BPM = 90;
const BEAT_MS = 60000 / BPM;

function initAudio() {
  if (audioCtx) return;
  audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  masterGain = audioCtx.createGain();
  masterGain.gain.value = 0.35;
  masterGain.connect(audioCtx.destination);
  if (audioCtx.state === 'suspended') audioCtx.resume();
}

function playMusicBeat() {
  if (!audioCtx || !masterGain) return;
  const t = audioCtx.currentTime;

  // Cave drone (triangle wave — softer, more ambient)
  const drone = audioCtx.createOscillator();
  const droneGain = audioCtx.createGain();
  drone.type = 'triangle';
  drone.frequency.value = D2;
  droneGain.gain.setValueAtTime(0.1, t);
  droneGain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
  drone.connect(droneGain);
  droneGain.connect(masterGain);
  drone.start(t);
  drone.stop(t + 0.6);

  // Kick on beats 0 and 2 (muffled, cave-like)
  if (musicBeat % 2 === 0) {
    const kick = audioCtx.createOscillator();
    const kickGain = audioCtx.createGain();
    kick.type = 'sine';
    kick.frequency.setValueAtTime(120, t);
    kick.frequency.exponentialRampToValueAtTime(30, t + 0.12);
    kickGain.gain.setValueAtTime(0.35, t);
    kickGain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    kick.connect(kickGain);
    kickGain.connect(masterGain);
    kick.start(t);
    kick.stop(t + 0.15);
  }

  // Crystal chime hi-hat (filtered noise with resonance)
  const hatRate = musicLevel >= 3 ? 1 : 2;
  if (musicBeat % hatRate === 0) {
    const bufferSize = audioCtx.sampleRate * 0.04;
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 4);
    }
    const hat = audioCtx.createBufferSource();
    hat.buffer = buffer;
    const hatFilter = audioCtx.createBiquadFilter();
    hatFilter.type = 'bandpass';
    hatFilter.frequency.value = 9000;
    hatFilter.Q.value = 3;
    const hatGain = audioCtx.createGain();
    hatGain.gain.value = 0.08 + musicLevel * 0.02;
    hat.connect(hatFilter);
    hatFilter.connect(hatGain);
    hatGain.connect(masterGain);
    hat.start(t);
  }

  // Sub pulse at level 4+ (every 4 beats)
  if (musicLevel >= 4 && musicBeat % 4 === 0) {
    const bass = audioCtx.createOscillator();
    const bassGain = audioCtx.createGain();
    bass.type = 'sine';
    bass.frequency.value = D2 * 2;
    bassGain.gain.setValueAtTime(0.12, t);
    bassGain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    bass.connect(bassGain);
    bassGain.connect(masterGain);
    bass.start(t);
    bass.stop(t + 0.12);
  }

  musicBeat++;
}

function startMusic() {
  if (!audioCtx || musicInterval) return;
  musicBeat = 0;
  playMusicBeat();
  musicInterval = setInterval(playMusicBeat, BEAT_MS / 2);
}

function stopMusic() {
  if (musicInterval) {
    clearInterval(musicInterval);
    musicInterval = null;
  }
}

function setMusicIntensity(level: number) {
  musicLevel = level;
}

function playLevelUp() {
  if (!audioCtx || !masterGain) return;
  const t = audioCtx.currentTime;
  // Crystal chime arpeggio (rising)
  [0, 0.12, 0.24].forEach((delay, i) => {
    const osc = audioCtx!.createOscillator();
    const gain = audioCtx!.createGain();
    osc.type = 'triangle';
    osc.frequency.value = D2 * Math.pow(2, i + 2);
    gain.gain.setValueAtTime(0.12, t + delay);
    gain.gain.exponentialRampToValueAtTime(0.001, t + delay + 0.2);
    osc.connect(gain);
    gain.connect(masterGain!);
    osc.start(t + delay);
    osc.stop(t + delay + 0.2);
  });
}

function playFlip(goingUp: boolean) {
  if (!audioCtx || !masterGain) return;
  const t = audioCtx.currentTime;

  // Directional tonal sweep — pitch follows gravity direction
  const osc = audioCtx.createOscillator();
  const oscGain = audioCtx.createGain();
  osc.type = 'sine';
  if (goingUp) {
    osc.frequency.setValueAtTime(200, t);
    osc.frequency.exponentialRampToValueAtTime(600, t + 0.07);
  } else {
    osc.frequency.setValueAtTime(600, t);
    osc.frequency.exponentialRampToValueAtTime(200, t + 0.07);
  }
  oscGain.gain.setValueAtTime(0.12, t);
  oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
  osc.connect(oscGain);
  oscGain.connect(masterGain);
  osc.start(t);
  osc.stop(t + 0.08);

  // Noise whoosh layer — bandpass filtered to match direction
  const bufferSize = audioCtx.sampleRate * 0.05;
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2);
  }
  const noise = audioCtx.createBufferSource();
  noise.buffer = buffer;
  const filter = audioCtx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = goingUp ? 2200 : 800;
  filter.Q.value = 1.5;
  const nGain = audioCtx.createGain();
  nGain.gain.setValueAtTime(0.18, t);
  nGain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
  noise.connect(filter);
  filter.connect(nGain);
  nGain.connect(masterGain);
  noise.start(t);
}

function playNearMiss() {
  if (!audioCtx || !masterGain) return;
  const t = audioCtx.currentTime;
  // Crystal tension whistle — close call
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(1200, t);
  osc.frequency.exponentialRampToValueAtTime(2400, t + 0.08);
  gain.gain.setValueAtTime(0.07, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
  osc.connect(gain);
  gain.connect(masterGain);
  osc.start(t);
  osc.stop(t + 0.12);
}

function playDeath() {
  if (!audioCtx || !masterGain) return;
  const t = audioCtx.currentTime;

  // Sub hit (gut-punch impact)
  const sub = audioCtx.createOscillator();
  const subGain = audioCtx.createGain();
  sub.type = 'sine';
  sub.frequency.setValueAtTime(60, t);
  sub.frequency.exponentialRampToValueAtTime(18, t + 0.3);
  subGain.gain.setValueAtTime(0.5, t);
  subGain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
  sub.connect(subGain);
  subGain.connect(masterGain);
  sub.start(t);
  sub.stop(t + 0.3);

  // Crystal shatter glissando
  const shatter = audioCtx.createOscillator();
  const shatterGain = audioCtx.createGain();
  shatter.type = 'triangle';
  shatter.frequency.setValueAtTime(800, t);
  shatter.frequency.exponentialRampToValueAtTime(40, t + 0.4);
  shatterGain.gain.setValueAtTime(0.25, t);
  shatterGain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
  shatter.connect(shatterGain);
  shatterGain.connect(masterGain);
  shatter.start(t);
  shatter.stop(t + 0.4);

  // Debris rattle (longer tail)
  setTimeout(() => {
    if (!audioCtx || !masterGain) return;
    const bufferSize = audioCtx.sampleRate * 0.25;
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 3);
    }
    const noise = audioCtx.createBufferSource();
    noise.buffer = buffer;
    const lp = audioCtx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 2000;
    const g = audioCtx.createGain();
    g.gain.value = 0.15;
    noise.connect(lp);
    lp.connect(g);
    g.connect(masterGain);
    noise.start();
  }, 40);
}

// Ambient cave particles (module-level, persist across games)
const ambientSparkles: Array<{ x: number; y: number; size: number; alpha: number; speed: number; drift: number }> = [];
let fogOffset = 0;

// Depth labels for level-ups
const DEPTH_LABELS = [
  '', // level 1 (no label)
  'DEEPER...',
  'CRYSTAL VEIN',
  'THE DEEP',
  'THE ABYSS',
];

export default function CaveMothGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<'start' | 'playing' | 'gameover' | 'leaderboard'>('start');
  const [score, setScore] = useState(0);
  const [socialLoaded, setSocialLoaded] = useState(false);
  const [submittedEntryId, setSubmittedEntryId] = useState<number | null>(null);
  const [progression, setProgression] = useState<ProgressionResult | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);

  const { user } = usePixelpitSocial(socialLoaded);

  const [musicEnabled, setMusicEnabled] = useState(false);

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

  const gameRef = useRef({
    running: false,
    score: 0,
    distance: 0,
    level: 1,
    lastLevelScore: 0,
    levelUpFlash: '',
    player: { x: 0, y: 0, vy: 0, size: 20, scaleX: 1, scaleY: 1 },
    gravity: 0.4,
    maxFallSpeed: 8,
    tunnelTop: 0,
    tunnelBottom: 0,
    spikes: [] as Array<{ x: number; top: boolean; height: number }>,
    spikeGap: 300,
    spikeSize: 30,
    scrollSpeed: 3,
    particles: [] as Array<{ x: number; y: number; vx: number; vy: number; life: number }>,
    flipParticles: [] as Array<{ x: number; y: number; vx: number; vy: number; life: number; size: number }>,
    trail: [] as Array<{ x: number; y: number; alpha: number }>,
    shake: 0,
    screenFlash: 0,
    wingPhase: 0,
    nearMissFlash: 0,
    nearMissX: 0,
    nearMissY: 0,
    frameCount: 0,
    // Fingerprint tutorial hints
    tapCount: 0,
    hint1Alpha: 0,  // grey fingerprint above moth
    hint2Alpha: 0,  // grey fingerprint below moth
  });

  const startGame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Unlock audio on iOS — Play button tap is a valid user gesture
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
    const tunnelHeight = canvas.height * 0.6;
    game.tunnelTop = (canvas.height - tunnelHeight) / 2;
    game.tunnelBottom = game.tunnelTop + tunnelHeight;

    game.player.x = canvas.width * 0.2;
    game.player.y = canvas.height / 2;
    game.player.vy = 0;
    game.player.scaleX = 1;
    game.player.scaleY = 1;
    game.gravity = 0.4;
    game.score = 0;
    game.distance = 0;
    game.level = 1;
    game.lastLevelScore = 0;
    game.levelUpFlash = '';
    game.spikes = [];
    game.particles = [];
    game.trail = [];
    game.shake = 0;
    game.screenFlash = 0;
    game.spikeGap = 300;
    game.spikeSize = 30;
    game.scrollSpeed = 3;
    game.running = true;
    game.wingPhase = 0;
    game.flipParticles = [];
    game.nearMissFlash = 0;
    game.frameCount = 0;
    game.tapCount = 0;
    game.hint1Alpha = 0;
    game.hint2Alpha = 0;

    setMusicIntensity(1);

    setScore(0);
    setGameState('playing');
    setSubmittedEntryId(null);
    setProgression(null);
    setShowShareModal(false);
  }, [musicEnabled]);

  const flip = useCallback(() => {
    initAudio();
    const game = gameRef.current;
    if (gameState === 'start') {
      startGame();
    } else if (gameState === 'playing' && game.running) {
      game.gravity *= -1;
      game.tapCount++;
      const goingUp = game.gravity < 0;
      // Fingerprint hints for first two taps
      if (game.tapCount === 1) game.hint1Alpha = 1;
      if (game.tapCount === 2) game.hint2Alpha = 1;
      // Wing flutter burst on flip
      game.player.scaleX = goingUp ? 0.7 : 1.3;
      game.player.scaleY = goingUp ? 1.3 : 0.7;
      playFlip(goingUp);
      // Wing scale particles scatter behind
      for (let i = 0; i < 8; i++) {
        const angle = Math.PI + (Math.random() - 0.5) * 1.2;
        const speed = 1.5 + Math.random() * 3;
        game.flipParticles.push({
          x: game.player.x,
          y: game.player.y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed + (goingUp ? 1.5 : -1.5),
          life: 1,
          size: 1 + Math.random() * 2.5,
        });
      }
      game.shake = 0.8; // Micro-shake on flip
    } else if (gameState === 'gameover') {
      setGameState('start');
    }
  }, [gameState, startGame]);

  const gameOver = useCallback(() => {
    const game = gameRef.current;
    game.running = false;
    game.shake = 5;
    playDeath();

    // Death particles — big dramatic burst (moth shatters)
    for (let i = 0; i < 25; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.5 + Math.random() * 6;
      game.particles.push({
        x: game.player.x + (Math.random() - 0.5) * 12,
        y: game.player.y + (Math.random() - 0.5) * 12,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
      });
    }
    // Screen flash on death (brief white)
    game.screenFlash = 0.8;

    // Analytics
    if (game.score >= 1) {
      fetch('/api/pixelpit/stats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ game: GAME_ID }),
      }).catch(() => {});
    }

    setScore(game.score);
    setTimeout(() => setGameState('gameover'), 500);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      const game = gameRef.current;
      const tunnelHeight = canvas.height * 0.6;
      game.tunnelTop = (canvas.height - tunnelHeight) / 2;
      game.tunnelBottom = game.tunnelTop + tunnelHeight;

      // Re-seed ambient sparkles on resize
      ambientSparkles.length = 0;
      for (let i = 0; i < 25; i++) {
        ambientSparkles.push({
          x: Math.random() * canvas.width,
          y: game.tunnelTop + Math.random() * (game.tunnelBottom - game.tunnelTop),
          size: 0.5 + Math.random() * 2,
          alpha: 0.15 + Math.random() * 0.4,
          speed: 0.1 + Math.random() * 0.3,
          drift: Math.random() * Math.PI * 2,
        });
      }
    };
    resize();
    window.addEventListener('resize', resize);

    let animationId: number;

    const update = () => {
      const game = gameRef.current;

      game.frameCount++;

      // Update death particles
      for (let i = game.particles.length - 1; i >= 0; i--) {
        const p = game.particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.03;
        if (p.life <= 0) game.particles.splice(i, 1);
      }

      // Update flip particles (faster decay, drift with gravity)
      for (let i = game.flipParticles.length - 1; i >= 0; i--) {
        const fp = game.flipParticles[i];
        fp.x += fp.vx;
        fp.y += fp.vy;
        fp.vx *= 0.96;
        fp.vy *= 0.96;
        fp.life -= 0.05;
        if (fp.life <= 0) game.flipParticles.splice(i, 1);
      }

      // Decay shake
      if (game.shake > 0) game.shake *= 0.9;

      // Decay near-miss flash
      if (game.nearMissFlash > 0) {
        game.nearMissFlash *= 0.88;
        if (game.nearMissFlash < 0.02) game.nearMissFlash = 0;
      }

      // Fade fingerprint hints
      if (game.hint1Alpha > 0) { game.hint1Alpha -= 0.012; if (game.hint1Alpha < 0) game.hint1Alpha = 0; }
      if (game.hint2Alpha > 0) { game.hint2Alpha -= 0.012; if (game.hint2Alpha < 0) game.hint2Alpha = 0; }

      // Update trail
      for (let i = game.trail.length - 1; i >= 0; i--) {
        game.trail[i].alpha -= 0.04;
        game.trail[i].x -= game.scrollSpeed;
        if (game.trail[i].alpha <= 0) game.trail.splice(i, 1);
      }

      // Update ambient sparkles
      for (const s of ambientSparkles) {
        s.drift += 0.02;
        s.x -= game.scrollSpeed * 0.3;
        s.y += Math.sin(s.drift) * 0.3;
        if (s.x < -10) {
          s.x = canvas.width + 10;
          s.y = game.tunnelTop + Math.random() * (game.tunnelBottom - game.tunnelTop);
        }
      }

      // Fog parallax
      fogOffset = (fogOffset + game.scrollSpeed * 0.2) % (canvas.width * 2);

      // Wing animation
      game.wingPhase += 0.15;

      if (!game.running) return;

      // Add to trail
      if (game.trail.length === 0 ||
          Math.abs(game.trail[game.trail.length - 1].y - game.player.y) > 5) {
        game.trail.push({ x: game.player.x, y: game.player.y, alpha: 0.5 });
      }

      // Player physics
      game.player.vy += game.gravity;
      game.player.vy = Math.max(-game.maxFallSpeed, Math.min(game.maxFallSpeed, game.player.vy));
      game.player.y += game.player.vy;

      // Squish recovery
      game.player.scaleX += (1 - game.player.scaleX) * 0.15;
      game.player.scaleY += (1 - game.player.scaleY) * 0.15;

      // Distance/score
      game.distance += game.scrollSpeed;
      game.score = Math.floor(game.distance / 10);
      setScore(game.score);

      // Decay level-up flash
      if (game.levelUpFlash && game.screenFlash <= 0) {
        game.levelUpFlash = '';
      }
      if (game.screenFlash > 0) {
        game.screenFlash *= 0.92;
        if (game.screenFlash < 0.01) game.screenFlash = 0;
      }

      // Level up every 200 points
      const newLevel = Math.floor(game.score / 200) + 1;
      if (newLevel > game.level) {
        game.level = newLevel;
        const label = DEPTH_LABELS[Math.min(game.level - 1, DEPTH_LABELS.length - 1)] || `DEPTH ${game.level}`;
        game.levelUpFlash = label;
        game.screenFlash = 0.6;
        game.scrollSpeed = Math.min(3 + (game.level - 1) * 0.2, 8);
        setMusicIntensity(Math.min(game.level, 5));
        playLevelUp();
        setTimeout(() => { game.levelUpFlash = ''; }, 800);
      }

      // Difficulty ramp — three phases
      // Phase 1 (score < 100): gentle warmup
      // Phase 2 (score 100-300): taller crystals, more variation, tighter spacing
      // Phase 3 (score 300+): extreme variation, asymmetric danger, narrow gaps
      game.spikeGap = Math.max(100, 300 - (game.level - 1) * 30);
      game.spikeSize = Math.min(80, 30 + (game.level - 1) * 6);

      // Spawn spikes (stalactites/stalagmites)
      const lastSpike = game.spikes[game.spikes.length - 1];
      if (!lastSpike || lastSpike.x < canvas.width - game.spikeGap) {
        const tunnelHeight = game.tunnelBottom - game.tunnelTop;
        const sc = game.score;

        // Height variation increases with score
        const variation = sc < 100 ? 30 : sc < 300 ? 70 : 120;
        // Min gap shrinks: 80 → 65 → 50
        const minGap = sc < 100 ? 80 : sc < 300 ? 65 : 50;

        let topHeight: number;
        let bottomHeight: number;

        // After phase 2, occasionally spawn asymmetric pairs (one tall, one short)
        if (sc >= 100 && Math.random() < (sc >= 300 ? 0.45 : 0.25)) {
          // Asymmetric: one crystal dominates
          if (Math.random() < 0.5) {
            topHeight = game.spikeSize + variation * (0.6 + Math.random() * 0.4);
            bottomHeight = game.spikeSize * 0.4 + Math.random() * 15;
          } else {
            topHeight = game.spikeSize * 0.4 + Math.random() * 15;
            bottomHeight = game.spikeSize + variation * (0.6 + Math.random() * 0.4);
          }
        } else {
          topHeight = game.spikeSize + Math.random() * variation;
          bottomHeight = game.spikeSize + Math.random() * variation;
        }

        if (topHeight + bottomHeight < tunnelHeight - minGap) {
          game.spikes.push({ x: canvas.width + 50, top: true, height: topHeight });
          game.spikes.push({ x: canvas.width + 50, top: false, height: bottomHeight });
        }
      }

      // Update spikes
      for (let i = game.spikes.length - 1; i >= 0; i--) {
        game.spikes[i].x -= game.scrollSpeed;
        if (game.spikes[i].x < -100) game.spikes.splice(i, 1);
      }

      // Collision with tunnel walls
      if (game.player.y - game.player.size / 2 < game.tunnelTop ||
          game.player.y + game.player.size / 2 > game.tunnelBottom) {
        gameOver();
        return;
      }

      // Collision with spikes
      const px = game.player.x;
      const py = game.player.y;
      const ps = game.player.size / 2;
      for (const spike of game.spikes) {
        const spikeLeft = spike.x - 15;
        const spikeRight = spike.x + 15;
        if (px + ps > spikeLeft && px - ps < spikeRight) {
          if (spike.top) {
            const spikeBottom = game.tunnelTop + spike.height;
            if (py - ps < spikeBottom) {
              gameOver();
              return;
            }
          } else {
            const spikeTop = game.tunnelBottom - spike.height;
            if (py + ps > spikeTop) {
              gameOver();
              return;
            }
          }
        }
      }

      // Near-miss detection — survived but barely
      if (game.nearMissFlash < 0.3) {
        for (const spike of game.spikes) {
          const spikeLeft = spike.x - 15;
          const spikeRight = spike.x + 15;
          if (px + ps > spikeLeft && px - ps < spikeRight) {
            let dist: number;
            let tipY: number;
            if (spike.top) {
              tipY = game.tunnelTop + spike.height;
              dist = py - ps - tipY;
            } else {
              tipY = game.tunnelBottom - spike.height;
              dist = tipY - (py + ps);
            }
            if (dist > 0 && dist < 18) {
              game.nearMissFlash = 1;
              game.nearMissX = spike.x;
              game.nearMissY = tipY;
              playNearMiss();
              break;
            }
          }
        }
      }
    };

    const draw = () => {
      const game = gameRef.current;

      // Apply shake
      ctx.save();
      if (game.shake > 0.1) {
        ctx.translate(
          (Math.random() - 0.5) * game.shake * 2,
          (Math.random() - 0.5) * game.shake * 2
        );
      }

      // Background — depth shifts warmer as you go deeper
      ctx.fillStyle = THEME.bg;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      if (game.level > 1) {
        ctx.fillStyle = `rgba(40, 8, 0, ${Math.min((game.level - 1) * 0.02, 0.08)})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      const tunnelHeight = game.tunnelBottom - game.tunnelTop;

      // Back fog layer (slow parallax — gives depth)
      ctx.globalAlpha = 0.05;
      ctx.fillStyle = THEME.caveGlow;
      const fogX = -fogOffset % (canvas.width * 2);
      ctx.fillRect(fogX, game.tunnelTop + tunnelHeight * 0.25, canvas.width * 2, tunnelHeight * 0.15);
      ctx.fillRect(fogX + canvas.width * 0.6, game.tunnelTop + tunnelHeight * 0.6, canvas.width * 1.5, tunnelHeight * 0.1);
      ctx.globalAlpha = 1;

      // Scrolling crystal lattice grid (dimmer)
      gridOffset = (gridOffset + game.scrollSpeed * 0.5) % 50;
      ctx.strokeStyle = THEME.gridLine;
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.15;
      for (let x = -gridOffset; x < canvas.width + 50; x += 50) {
        ctx.beginPath();
        ctx.moveTo(x, game.tunnelTop);
        ctx.lineTo(x, game.tunnelBottom);
        ctx.stroke();
      }
      for (let i = 0; i <= 4; i++) {
        const y = game.tunnelTop + (tunnelHeight * i / 4);
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      // Ambient cave sparkles
      for (const s of ambientSparkles) {
        ctx.globalAlpha = s.alpha * (0.5 + 0.5 * Math.sin(s.drift * 2));
        ctx.fillStyle = THEME.accent;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // Speed lines — when moving fast, horizontal streaks
      if (game.running && Math.abs(game.player.vy) > 4) {
        const intensity = Math.min((Math.abs(game.player.vy) - 4) / 4, 1);
        ctx.strokeStyle = THEME.glow;
        ctx.lineWidth = 1;
        ctx.globalAlpha = intensity * 0.12;
        for (let i = 0; i < 6; i++) {
          const ly = game.player.y + (Math.random() - 0.5) * 100;
          const lx = game.player.x - 30 - Math.random() * 80;
          const len = 25 + Math.random() * 60;
          ctx.beginPath();
          ctx.moveTo(lx, ly);
          ctx.lineTo(lx - len, ly);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      }

      // Rocky cave wall texture — irregular bumps along the walls
      ctx.fillStyle = THEME.cave;
      const rockPhase = gridOffset;
      for (let x = -rockPhase % 28; x < canvas.width + 28; x += 22 + Math.abs(Math.sin(x * 0.08)) * 10) {
        const topH = 3 + Math.abs(Math.sin(x * 0.07)) * 10;
        ctx.fillRect(x - 4, game.tunnelTop, 7, topH);
        const botH = 3 + Math.abs(Math.cos(x * 0.09)) * 10;
        ctx.fillRect(x - 4, game.tunnelBottom - botH, 7, botH);
      }

      // Cave wall glow lines
      ctx.strokeStyle = THEME.cave;
      ctx.lineWidth = 3;
      ctx.shadowColor = THEME.caveGlow;
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.moveTo(0, game.tunnelTop);
      ctx.lineTo(canvas.width, game.tunnelTop);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, game.tunnelBottom);
      ctx.lineTo(canvas.width, game.tunnelBottom);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Stalactites/Stalagmites — crystal style with shimmer
      for (const spike of game.spikes) {
        // Outer crystal (amethyst)
        ctx.fillStyle = THEME.spike;
        ctx.beginPath();
        if (spike.top) {
          ctx.moveTo(spike.x - 15, game.tunnelTop);
          ctx.lineTo(spike.x, game.tunnelTop + spike.height);
          ctx.lineTo(spike.x + 15, game.tunnelTop);
        } else {
          ctx.moveTo(spike.x - 15, game.tunnelBottom);
          ctx.lineTo(spike.x, game.tunnelBottom - spike.height);
          ctx.lineTo(spike.x + 15, game.tunnelBottom);
        }
        ctx.fill();

        // Second facet (offset, darker — adds crystal depth)
        ctx.fillStyle = '#7d3c98';
        ctx.globalAlpha = 0.5;
        ctx.beginPath();
        if (spike.top) {
          ctx.moveTo(spike.x + 2, game.tunnelTop);
          ctx.lineTo(spike.x + 5, game.tunnelTop + spike.height * 0.6);
          ctx.lineTo(spike.x + 14, game.tunnelTop);
        } else {
          ctx.moveTo(spike.x + 2, game.tunnelBottom);
          ctx.lineTo(spike.x + 5, game.tunnelBottom - spike.height * 0.6);
          ctx.lineTo(spike.x + 14, game.tunnelBottom);
        }
        ctx.fill();
        ctx.globalAlpha = 1;

        // Inner facet (magenta hot edge)
        ctx.fillStyle = THEME.spikeInner;
        ctx.globalAlpha = 0.5;
        ctx.beginPath();
        if (spike.top) {
          ctx.moveTo(spike.x - 6, game.tunnelTop);
          ctx.lineTo(spike.x + 1, game.tunnelTop + spike.height * 0.75);
          ctx.lineTo(spike.x + 3, game.tunnelTop);
        } else {
          ctx.moveTo(spike.x - 6, game.tunnelBottom);
          ctx.lineTo(spike.x + 1, game.tunnelBottom - spike.height * 0.75);
          ctx.lineTo(spike.x + 3, game.tunnelBottom);
        }
        ctx.fill();
        ctx.globalAlpha = 1;

        // Animated crystal tip shimmer
        const shimmer = 0.25 + 0.25 * Math.sin(game.frameCount * 0.08 + spike.x * 0.05);
        ctx.fillStyle = '#ffffff';
        ctx.globalAlpha = shimmer;
        ctx.shadowColor = THEME.spikeInner;
        ctx.shadowBlur = 8 + shimmer * 10;
        const tipY = spike.top
          ? game.tunnelTop + spike.height - 2
          : game.tunnelBottom - spike.height + 2;
        ctx.beginPath();
        ctx.arc(spike.x, tipY, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
      }

      // Phosphorescent trail — organic, varying size
      for (let i = 0; i < game.trail.length; i++) {
        const t = game.trail[i];
        const sz = 2 + t.alpha * 4 + Math.sin(i * 0.8) * 1.5;
        ctx.globalAlpha = t.alpha * 0.5;
        ctx.fillStyle = THEME.accent;
        ctx.shadowColor = THEME.accent;
        ctx.shadowBlur = 5;
        ctx.beginPath();
        ctx.arc(t.x, t.y, Math.max(sz, 1), 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
      ctx.globalAlpha = 1;

      // Near-miss ring flash
      if (game.nearMissFlash > 0.02) {
        const nmAlpha = game.nearMissFlash;
        const nmRadius = (1 - nmAlpha) * 35 + 8;
        ctx.globalAlpha = nmAlpha * 0.7;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.shadowColor = THEME.glow;
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(game.nearMissX, game.nearMissY, nmRadius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
      }

      // Flip particles (wing scales — warm accent color)
      for (const fp of game.flipParticles) {
        ctx.globalAlpha = fp.life * 0.7;
        ctx.fillStyle = fp.life > 0.5 ? THEME.player : THEME.accent;
        ctx.beginPath();
        ctx.arc(fp.x, fp.y, fp.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // === MOTH CHARACTER ===
      ctx.save();
      ctx.translate(game.player.x, game.player.y);
      ctx.scale(game.player.scaleX, game.player.scaleY);

      const wingFlap = Math.sin(game.wingPhase) * 0.2;
      const isFluttering = Math.abs(game.player.vy) > 3;
      const flapAmp = isFluttering ? wingFlap * 2.5 : wingFlap;

      // Outer glow (pulses subtly)
      const glowPulse = 14 + Math.sin(game.frameCount * 0.06) * 4;
      ctx.shadowColor = THEME.glow;
      ctx.shadowBlur = glowPulse;

      // Left wing
      ctx.fillStyle = THEME.player;
      ctx.globalAlpha = 0.55;
      ctx.save();
      ctx.rotate(flapAmp);
      ctx.beginPath();
      ctx.moveTo(-4, -2);
      ctx.quadraticCurveTo(-20, -15, -15, 3);
      ctx.quadraticCurveTo(-9, 9, -4, 4);
      ctx.closePath();
      ctx.fill();
      // Left eyespot (luna moth signature!)
      ctx.fillStyle = THEME.glow;
      ctx.globalAlpha = 0.6;
      ctx.beginPath();
      ctx.arc(-12, -4, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.globalAlpha = 0.45;
      ctx.beginPath();
      ctx.arc(-12, -4, 1.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Right wing
      ctx.globalAlpha = 0.55;
      ctx.fillStyle = THEME.player;
      ctx.save();
      ctx.rotate(-flapAmp);
      ctx.beginPath();
      ctx.moveTo(4, -2);
      ctx.quadraticCurveTo(20, -15, 15, 3);
      ctx.quadraticCurveTo(9, 9, 4, 4);
      ctx.closePath();
      ctx.fill();
      // Right eyespot
      ctx.fillStyle = THEME.glow;
      ctx.globalAlpha = 0.6;
      ctx.beginPath();
      ctx.arc(12, -4, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.globalAlpha = 0.45;
      ctx.beginPath();
      ctx.arc(12, -4, 1.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.globalAlpha = 1;

      // Body
      ctx.fillStyle = THEME.player;
      ctx.shadowBlur = 20;
      ctx.beginPath();
      ctx.ellipse(0, 0, 5, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Antennae
      ctx.strokeStyle = THEME.player;
      ctx.lineWidth = 1.5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-2, -7);
      ctx.quadraticCurveTo(-8, -17, -5, -19);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(2, -7);
      ctx.quadraticCurveTo(8, -17, 5, -19);
      ctx.stroke();

      // Antenna tips (glowing accent, pulse)
      const antPulse = 1 + Math.sin(game.frameCount * 0.1) * 0.5;
      ctx.fillStyle = THEME.accent;
      ctx.shadowColor = THEME.accent;
      ctx.shadowBlur = 6 + antPulse * 4;
      ctx.beginPath();
      ctx.arc(-5, -19, 1.5 * antPulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(5, -19, 1.5 * antPulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Eyes — glow when calm, widen when scared
      const speed = Math.abs(game.player.vy);
      const eyeSize = speed > 5 ? 3 : 2;
      ctx.fillStyle = speed > 5 ? '#1a0a2e' : THEME.bg;
      ctx.beginPath();
      ctx.arc(-2.5, -3, eyeSize, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(2.5, -3, eyeSize, 0, Math.PI * 2);
      ctx.fill();
      // Eye glint
      if (speed <= 5) {
        ctx.fillStyle = '#ffffff';
        ctx.globalAlpha = 0.5;
        ctx.beginPath();
        ctx.arc(-1.8, -3.8, 0.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(3.2, -3.8, 0.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      ctx.restore();

      // Death particles — bigger burst, mixed colors
      for (const p of game.particles) {
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.life > 0.6 ? THEME.player : THEME.spikeInner;
        ctx.shadowColor = THEME.glow;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2 + p.life * 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
      ctx.globalAlpha = 1;

      // Front fog wisps (faster parallax, very subtle)
      ctx.globalAlpha = 0.03;
      ctx.fillStyle = THEME.caveGlow;
      const fogX2 = -(fogOffset * 2.5) % (canvas.width * 2);
      ctx.fillRect(fogX2, game.tunnelTop + tunnelHeight * 0.45, canvas.width * 1.8, tunnelHeight * 0.08);
      ctx.globalAlpha = 1;

      // Vignette — draws attention to center
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      const maxR = Math.max(canvas.width, canvas.height) * 0.7;
      const vig = ctx.createRadialGradient(cx, cy, maxR * 0.4, cx, cy, maxR);
      vig.addColorStop(0, 'rgba(10,10,26,0)');
      vig.addColorStop(1, 'rgba(10,10,26,0.55)');
      ctx.fillStyle = vig;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Fingerprint tutorial hints
      if (game.hint1Alpha > 0 || game.hint2Alpha > 0) {
        const drawFingerprint = (fx: number, fy: number, alpha: number) => {
          ctx.save();
          ctx.translate(fx, fy);
          ctx.globalAlpha = alpha * 0.35;
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.5;
          // Stylized fingerprint: concentric arcs with slight offsets
          const ridges = [6, 10, 14, 18, 22];
          for (let i = 0; i < ridges.length; i++) {
            const r = ridges[i];
            const offsetY = i * 0.8 - 1.5; // slight vertical drift per ridge
            ctx.beginPath();
            ctx.arc(0, offsetY, r, -Math.PI * 0.8, Math.PI * 0.8);
            ctx.stroke();
          }
          ctx.restore();
        };
        // Hint 1: above moth
        if (game.hint1Alpha > 0) {
          drawFingerprint(game.player.x, game.player.y - 55, game.hint1Alpha);
        }
        // Hint 2: below moth
        if (game.hint2Alpha > 0) {
          drawFingerprint(game.player.x, game.player.y + 55, game.hint2Alpha);
        }
      }

      // Screen flash (gold for level up, white for death)
      if (game.screenFlash > 0) {
        const flashColor = game.running
          ? `rgba(244, 208, 63, ${game.screenFlash * 0.3})`
          : `rgba(255, 255, 255, ${game.screenFlash * 0.25})`;
        ctx.fillStyle = flashColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      // Level up text
      if (game.levelUpFlash) {
        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = 'bold 44px ui-monospace, monospace';
        ctx.fillStyle = THEME.gold;
        ctx.shadowColor = THEME.gold;
        ctx.shadowBlur = 30;
        ctx.fillText(game.levelUpFlash, canvas.width / 2, canvas.height / 2);
        // Echo text (offset, faded)
        ctx.globalAlpha = 0.3;
        ctx.fillText(game.levelUpFlash, canvas.width / 2, canvas.height / 2 + 3);
        ctx.restore();
      }

      ctx.restore(); // Shake
    };

    const gameLoop = () => {
      update();
      draw();
      animationId = requestAnimationFrame(gameLoop);
    };
    gameLoop();

    // Input
    const handleTouch = (e: TouchEvent) => { e.preventDefault(); flip(); };
    const handleMouse = () => flip();
    const handleKey = (e: KeyboardEvent) => { if (e.code === 'Space') { e.preventDefault(); flip(); } };

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
  }, [flip, gameOver]);

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
          background: ${THEME.bg};
          overflow: hidden;
          touch-action: none;
          user-select: none;
        }
      `}</style>

      <canvas
        ref={canvasRef}
        style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh' }}
      />

      {/* Score */}
      {gameState === 'playing' && (
        <div style={{
          position: 'fixed',
          top: 'max(40px, env(safe-area-inset-top, 40px))',
          left: 0,
          right: 0,
          textAlign: 'center',
          zIndex: 10,
          pointerEvents: 'none',
        }}>
          <div style={{
            fontFamily: 'ui-monospace, monospace',
            fontSize: 48,
            fontWeight: 700,
            color: THEME.text,
            textShadow: `0 0 20px ${THEME.glow}`,
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
          background: 'rgba(10,10,26,0.85)',
          zIndex: 100,
        }}>
          <h1 style={{
            fontFamily: 'ui-monospace, monospace',
            fontSize: 64,
            fontWeight: 700,
            color: THEME.glow,
            marginBottom: 16,
            textShadow: `0 0 40px ${THEME.glow}`,
            transform: 'rotate(180deg)',
          }}>
            CAVE MOTH
          </h1>
          <p style={{
            fontFamily: 'ui-monospace, monospace',
            fontSize: 16,
            color: THEME.text,
            opacity: 0.7,
            marginBottom: 40,
            letterSpacing: 2,
          }}>
            tap to flip
          </p>
          <button
            onClick={startGame}
            style={{
              background: THEME.glow,
              color: THEME.bg,
              border: 'none',
              padding: '16px 50px',
              fontSize: 18,
              fontFamily: 'ui-monospace, monospace',
              fontWeight: 600,
              cursor: 'pointer',
              borderRadius: 4,
            }}
          >
            play
          </button>
        </div>
      )}

      {/* Game over */}
      {gameState === 'gameover' && (
        <div style={{
          position: 'fixed',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: THEME.bg,
          zIndex: 100,
          padding: 40,
        }}>
          <p style={{
            fontFamily: 'ui-monospace, monospace',
            fontSize: 24,
            color: THEME.spikeInner,
            marginBottom: 15,
            letterSpacing: 4,
          }}>
            shattered
          </p>
          <div style={{
            fontFamily: 'ui-monospace, monospace',
            fontSize: 72,
            fontWeight: 200,
            color: THEME.glow,
            marginBottom: 20,
            textShadow: `0 0 30px ${THEME.glow}`,
          }}>
            {score}
          </div>

          {/* Progression display */}
          {progression && (
            <div style={{
              background: '#1a1133',
              borderRadius: 12,
              padding: '16px 24px',
              marginBottom: 20,
              textAlign: 'center',
            }}>
              <div style={{
                fontFamily: 'ui-monospace, monospace',
                fontSize: 18,
                color: THEME.glow,
                marginBottom: 8,
              }}>
                +{progression.xpEarned} XP
              </div>
              <div style={{
                fontFamily: 'ui-monospace, monospace',
                fontSize: 12,
                color: '#8b7fa8',
              }}>
                Level {progression.level} {progression.streak > 1 ? `• ${progression.multiplier}x streak` : ''}
              </div>
            </div>
          )}

          {/* Score submission */}
          <ScoreFlow
            score={score}
            gameId={GAME_ID}
            colors={SCORE_FLOW_COLORS}
            maxScore={1000}
            onRankReceived={(rank, entryId) => {
              setSubmittedEntryId(entryId ?? null);
            }}
            onProgression={(prog) => setProgression(prog)}
          />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 15, alignItems: 'center', marginTop: 20 }}>
            <button
              onClick={startGame}
              style={{
                background: THEME.glow,
                color: THEME.bg,
                border: 'none',
                padding: '16px 50px',
                fontSize: 18,
                fontFamily: 'ui-monospace, monospace',
                fontWeight: 600,
                cursor: 'pointer',
                borderRadius: 4,
                boxShadow: `0 8px 25px ${THEME.glow}40`,
              }}
            >
              play again
            </button>
            <button
              onClick={() => setGameState('leaderboard')}
              style={{
                background: 'transparent',
                border: '1px solid #2d1b4e',
                borderRadius: 4,
                color: '#8b7fa8',
                padding: '14px 35px',
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
                  border: '1px solid #2d1b4e',
                  borderRadius: 4,
                  color: '#8b7fa8',
                  padding: '14px 35px',
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
                url={typeof window !== 'undefined' ? `${window.location.origin}/pixelpit/arcade/cavemoth/share/${score}` : ''}
                text={`I scored ${score} on CAVE MOTH! Can you beat me?`}
                style="minimal"
                socialLoaded={socialLoaded}
              />
            )}
          </div>
        </div>
      )}

      {/* Leaderboard */}
      {gameState === 'leaderboard' && (
        <Leaderboard
          gameId={GAME_ID}
          limit={8}
          entryId={submittedEntryId ?? undefined}
          colors={LEADERBOARD_COLORS}
          onClose={() => setGameState('gameover')}
          groupsEnabled={true}
          gameUrl={GAME_URL}
          socialLoaded={socialLoaded}
        />
      )}

      {/* ShareModal */}
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
