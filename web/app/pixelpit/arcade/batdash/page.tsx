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

// BAT DASH theme - Gotham night, dark and dramatic
const THEME = {
  sky: '#0f172a',        // Dark blue night sky
  skyDark: '#020617',    // Deeper dark
  bat: '#1e1b4b',        // Dark purple bat
  batWing: '#312e81',    // Slightly lighter wing
  batEye: '#fef08a',     // Yellow glowing eyes
  cape: '#4c1d95',       // Purple cape
  building: '#334155',   // Gray buildings
  buildingDark: '#1e293b', // Darker building shade
  window: '#fef08a',     // Lit windows (yellow)
  windowOff: '#475569',  // Unlit windows
  ground: '#1e293b',     // Dark ground
  groundDark: '#0f172a', // Darker ground
  moon: '#fef9c3',       // Moon glow
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

// D minor scale frequencies - dark, dramatic, heroic
const NOTES = {
  D3: 146.83, F3: 174.61, A3: 220.00, D4: 293.66, // Melody
  D2: 73.42, A1: 55.00, // Deep bass
};
const MELODY = [NOTES.D3, NOTES.F3, NOTES.A3, NOTES.D4, NOTES.A3, NOTES.F3]; // D minor arpeggio
const BPM = 90; // Slower, more dramatic
const BEAT_MS = 60000 / BPM;

function initAudio() {
  if (audioCtx) return;
  audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  masterGain = audioCtx.createGain();
  masterGain.gain.value = 0.5;
  masterGain.connect(audioCtx.destination);
  if (audioCtx.state === 'suspended') audioCtx.resume();
}

function playMusicNote() {
  if (!audioCtx || !masterGain) return;
  const t = audioCtx.currentTime;
  
  // Dramatic D minor arpeggio with sawtooth (darker sound)
  const melodyOsc = audioCtx.createOscillator();
  const melodyGain = audioCtx.createGain();
  const filter = audioCtx.createBiquadFilter();
  melodyOsc.type = 'sawtooth';
  melodyOsc.frequency.value = MELODY[musicBeat % 6];
  filter.type = 'lowpass';
  filter.frequency.value = 800;
  melodyGain.gain.setValueAtTime(0.2, t);
  melodyGain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
  melodyOsc.connect(filter);
  filter.connect(melodyGain);
  melodyGain.connect(masterGain);
  melodyOsc.start(t);
  melodyOsc.stop(t + 0.4);
  
  // Deep bass: D2 and A1 alternating - dramatic foundation
  if (musicBeat % 2 === 0) {
    const bassOsc = audioCtx.createOscillator();
    const bassGain = audioCtx.createGain();
    bassOsc.type = 'sine';
    bassOsc.frequency.value = musicBeat % 4 === 0 ? NOTES.D2 : NOTES.A1;
    bassGain.gain.setValueAtTime(0.6, t);
    bassGain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
    bassOsc.connect(bassGain);
    bassGain.connect(masterGain);
    bassOsc.start(t);
    bassOsc.stop(t + 0.5);
  }
  
  // Occasional dramatic string stab (every 8 beats)
  if (musicBeat % 8 === 0) {
    const stabOsc = audioCtx.createOscillator();
    const stabGain = audioCtx.createGain();
    stabOsc.type = 'sawtooth';
    stabOsc.frequency.value = NOTES.D4;
    stabGain.gain.setValueAtTime(0.15, t);
    stabGain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
    stabOsc.connect(stabGain);
    stabGain.connect(masterGain);
    stabOsc.start(t);
    stabOsc.stop(t + 0.6);
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
  // Dramatic swoosh - like a cape flapping
  const t = audioCtx.currentTime;
  // White noise swoosh
  const bufferSize = audioCtx.sampleRate * 0.1;
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2);
  }
  const noise = audioCtx.createBufferSource();
  noise.buffer = buffer;
  const filter = audioCtx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 1000;
  filter.Q.value = 0.5;
  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(0.2, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
  noise.connect(filter);
  filter.connect(gain);
  gain.connect(masterGain);
  noise.start();
  // Plus a subtle low thud for weight
  const thud = audioCtx.createOscillator();
  const thudGain = audioCtx.createGain();
  thud.type = 'sine';
  thud.frequency.value = 100;
  thudGain.gain.setValueAtTime(0.1, t);
  thudGain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
  thud.connect(thudGain);
  thudGain.connect(masterGain);
  thud.start(t);
  thud.stop(t + 0.1);
}

function playScore() {
  if (!audioCtx || !masterGain) return;
  // Happy ascending ding
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(523, audioCtx.currentTime);  // C5
  osc.frequency.exponentialRampToValueAtTime(784, audioCtx.currentTime + 0.1);  // G5
  gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);
  osc.connect(gain);
  gain.connect(masterGain);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.15);
  // Second chime
  setTimeout(() => {
    if (!audioCtx || !masterGain) return;
    const osc2 = audioCtx.createOscillator();
    const gain2 = audioCtx.createGain();
    osc2.type = 'sine';
    osc2.frequency.value = 1047;  // C6
    gain2.gain.setValueAtTime(0.12, audioCtx.currentTime);
    gain2.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.12);
    osc2.connect(gain2);
    gain2.connect(masterGain);
    osc2.start();
    osc2.stop(audioCtx.currentTime + 0.12);
  }, 80);
}

function playDeath() {
  if (!audioCtx || !masterGain) return;
  // Bonk
  const bonk = audioCtx.createOscillator();
  const bonkGain = audioCtx.createGain();
  bonk.type = 'square';
  bonk.frequency.value = 150;
  bonkGain.gain.setValueAtTime(0.25, audioCtx.currentTime);
  bonkGain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.1);
  bonk.connect(bonkGain);
  bonkGain.connect(masterGain);
  bonk.start();
  bonk.stop(audioCtx.currentTime + 0.1);
  // Sad descending slide
  setTimeout(() => {
    if (!audioCtx || !masterGain) return;
    const slide = audioCtx.createOscillator();
    const slideGain = audioCtx.createGain();
    slide.type = 'sawtooth';
    slide.frequency.setValueAtTime(400, audioCtx.currentTime);
    slide.frequency.exponentialRampToValueAtTime(80, audioCtx.currentTime + 0.4);
    slideGain.gain.setValueAtTime(0.15, audioCtx.currentTime);
    slideGain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4);
    slide.connect(slideGain);
    slideGain.connect(masterGain);
    slide.start();
    slide.stop(audioCtx.currentTime + 0.4);
  }, 100);
}

export default function FlappyGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<'start' | 'playing' | 'gameover' | 'leaderboard'>('start');
  const [score, setScore] = useState(0);
  const [musicEnabled, setMusicEnabled] = useState(false);
  const [socialLoaded, setSocialLoaded] = useState(false);
  const [submittedEntryId, setSubmittedEntryId] = useState<number | null>(null);
  const [progression, setProgression] = useState<ProgressionResult | null>(null);

  const { user } = usePixelpitSocial(socialLoaded);
  
  // Music toggle (handles iOS audio unlock)
  const toggleMusic = useCallback(() => {
    initAudio();  // Ensure audio context exists
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    if (musicEnabled) {
      stopMusic();
      setMusicEnabled(false);
    } else {
      startMusic();
      setMusicEnabled(true);
    }
  }, [musicEnabled]);

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
  }, []);

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
    const colors = [THEME.bat, '#fff', THEME.batWing, THEME.batEye];
    for (let i = 0; i < 20; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 4;
      game.particles.push({
        x: game.bird.x,
        y: game.bird.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
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

      // Night sky gradient - Gotham style
      const skyGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
      skyGrad.addColorStop(0, THEME.sky);
      skyGrad.addColorStop(0.6, THEME.skyDark);
      skyGrad.addColorStop(1, '#000');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Moon in corner
      ctx.fillStyle = THEME.moon;
      ctx.globalAlpha = 0.3;
      ctx.beginPath();
      ctx.arc(canvas.width - 80, 80, 40, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.6;
      ctx.beginPath();
      ctx.arc(canvas.width - 80, 80, 35, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      
      // Distant city skyline silhouette (background)
      ctx.fillStyle = '#0f172a';
      for (let x = 0; x < canvas.width; x += 60) {
        const h = 50 + Math.sin(x * 0.05) * 30 + Math.random() * 10;
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
        
        // Windows on top building
        ctx.fillStyle = THEME.window;
        for (let wy = 20; wy < pipe.gapY - 30; wy += 35) {
          for (let wx = 10; wx < game.pipeWidth - 10; wx += 18) {
            ctx.globalAlpha = Math.random() > 0.3 ? 0.8 : 0.2; // Some windows lit
            ctx.fillRect(pipe.x + wx, wy, 10, 15);
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
        
        // Windows on bottom building
        ctx.fillStyle = THEME.window;
        for (let wy = pipe.gapY + game.pipeGap + 30; wy < game.groundY - 20; wy += 35) {
          for (let wx = 10; wx < game.pipeWidth - 10; wx += 18) {
            ctx.globalAlpha = Math.random() > 0.3 ? 0.8 : 0.2;
            ctx.fillRect(pipe.x + wx, wy, 10, 15);
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

      // BAT with squash/stretch and cape!
      ctx.save();
      ctx.translate(game.bird.x, game.bird.y);
      ctx.scale(game.bird.scaleX, game.bird.scaleY);
      const s = game.bird.size;
      
      // Cape trailing behind (flowing)
      ctx.fillStyle = THEME.cape;
      ctx.beginPath();
      ctx.moveTo(-s * 0.5, 0);
      ctx.quadraticCurveTo(-s * 2, s * 0.5 + game.bird.vy * 2, -s * 2.5, s * 1.5);
      ctx.quadraticCurveTo(-s * 1.5, s * 1, -s * 0.5, s * 0.3);
      ctx.fill();
      
      // Bat body (oval)
      ctx.fillStyle = THEME.bat;
      ctx.beginPath();
      ctx.ellipse(0, 0, s * 0.8, s * 0.6, 0, 0, Math.PI * 2);
      ctx.fill();
      
      // Bat head
      ctx.beginPath();
      ctx.arc(s * 0.5, -s * 0.2, s * 0.4, 0, Math.PI * 2);
      ctx.fill();
      
      // Bat ears
      ctx.beginPath();
      ctx.moveTo(s * 0.3, -s * 0.5);
      ctx.lineTo(s * 0.2, -s * 1);
      ctx.lineTo(s * 0.5, -s * 0.5);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(s * 0.6, -s * 0.5);
      ctx.lineTo(s * 0.8, -s * 1);
      ctx.lineTo(s * 0.7, -s * 0.5);
      ctx.fill();
      
      // Wings (animated based on velocity)
      const wingFlap = Math.sin(Date.now() / 80) * 0.3;
      ctx.fillStyle = THEME.batWing;
      // Left wing
      ctx.beginPath();
      ctx.moveTo(-s * 0.3, 0);
      ctx.quadraticCurveTo(-s * 1.5, -s * (0.8 + wingFlap), -s * 1.8, s * 0.2);
      ctx.quadraticCurveTo(-s * 1, s * 0.3, -s * 0.3, s * 0.2);
      ctx.fill();
      // Right wing
      ctx.beginPath();
      ctx.moveTo(s * 0.3, 0);
      ctx.quadraticCurveTo(s * 1.2, -s * (0.6 + wingFlap), s * 1.5, s * 0.3);
      ctx.quadraticCurveTo(s * 0.8, s * 0.3, s * 0.3, s * 0.2);
      ctx.fill();
      
      // Glowing eyes
      ctx.fillStyle = THEME.batEye;
      ctx.shadowColor = THEME.batEye;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.ellipse(s * 0.35, -s * 0.25, 3, 2, 0, 0, Math.PI * 2);
      ctx.ellipse(s * 0.6, -s * 0.25, 3, 2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // NO wing section below - removed bird wing
      ctx.fillStyle = '#f5cd5e';
      ctx.beginPath();
      ctx.ellipse(-8, 5, 12, 8, 0, 0, Math.PI * 2);
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
          ctx.fillText('TAP TO FLY', canvas.width / 2, canvas.height / 2 + 80);
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

      {/* Music toggle button */}
      {(gameState === 'playing' || gameState === 'start') && (
        <button
          onClick={(e) => { e.stopPropagation(); toggleMusic(); }}
          style={{
            position: 'fixed',
            top: 'max(20px, env(safe-area-inset-top, 20px))',
            right: 20,
            zIndex: 200,
            background: musicEnabled ? COLORS.gold : 'rgba(0,0,0,0.5)',
            color: musicEnabled ? COLORS.bg : '#fff',
            border: 'none',
            borderRadius: 8,
            padding: '10px 14px',
            fontSize: 20,
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          }}
          aria-label={musicEnabled ? 'Mute music' : 'Play music'}
        >
          {musicEnabled ? '🎵' : '🔇'}
        </button>
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
              tap to fly<br />
              soar through gotham
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
            the night falls
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
              url={typeof window !== 'undefined' ? `${window.location.origin}/pixelpit/arcade/flappy/share/${score}` : ''}
              text={`I scored ${score} on FLAPPY! Can you beat me? 🐦`}
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
