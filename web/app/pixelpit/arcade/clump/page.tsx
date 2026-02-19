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

// --- INDIE BITE THEME ---
const THEME = {
  bg: '#0a0a0a',
  grid: '#1a1a1a',
  slime: '#a3e635',
  cyan: '#22d3ee',
  fuchsia: '#d946ef',
  gold: '#facc15',
  grey: '#555555',
  text: '#ffffff',
};

const COLORS = {
  bg: '#0a0a0a',
  surface: '#18181b',
  primary: '#a3e635',
  secondary: '#22d3ee',
  text: '#ffffff',
  muted: '#71717a',
  error: '#ef4444',
};

const SCORE_FLOW_COLORS: ScoreFlowColors = {
  bg: COLORS.bg,
  surface: COLORS.surface,
  primary: COLORS.primary,
  secondary: COLORS.secondary,
  text: COLORS.text,
  muted: COLORS.muted,
  error: COLORS.error,
};

const LEADERBOARD_COLORS: LeaderboardColors = {
  bg: COLORS.bg,
  surface: COLORS.surface,
  primary: COLORS.primary,
  secondary: COLORS.secondary,
  text: COLORS.text,
  muted: COLORS.muted,
};

const GAME_ID = 'clump';

// --- EASING ---
function easeOutQuad(t: number) { return t * (2 - t); }
function easeOutElastic(t: number) {
  const p = 0.3;
  return Math.pow(2, -10 * t) * Math.sin((t - p / 4) * (2 * Math.PI) / p) + 1;
}

// --- WORLD CONSTANTS ---
const WORLD_W = 2000;
const WORLD_H = 2000;
const GRID_SIZE = 60;
const GAME_DURATION = 60;

const TIERS = [
  { minR: 3, maxR: 6, color: THEME.grey, count: 200 },
  { minR: 8, maxR: 14, color: THEME.cyan, count: 80 },
  { minR: 16, maxR: 28, color: THEME.fuchsia, count: 30 },
  { minR: 32, maxR: 48, color: THEME.gold, count: 0 },
];

interface GameObject {
  x: number; y: number; r: number; color: string;
  tier: number; alive: boolean; absorbT: number;
}
interface Particle {
  x: number; y: number; vx: number; vy: number;
  r: number; color: string; life: number; maxLife: number;
}
interface Orbiter {
  angle: number; dist: number; r: number; color: string;
  speed: number; wobblePhase: number; wobbleAmp: number;
}

// --- TUTORIAL ---
interface TutorialStep {
  name: string;
  instruction: string;
  successText: string;
  setup: (state: GameState, objects: GameObject[]) => void;
  check: (state: GameState, objects: GameObject[], waypoint: any, gotHit: boolean) => boolean;
}

interface GameState {
  x: number; y: number; r: number; score: number;
  time: number; speed: number;
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    name: 'STEER',
    instruction: 'DRAG TO MOVE',
    successText: 'NICE!',
    setup(state) {
      state.x = WORLD_W / 2; state.y = WORLD_H / 2; state.r = 12;
    },
    check(state, _obj, waypoint) {
      if (!waypoint) return false;
      const dx = state.x - waypoint.x;
      const dy = state.y - waypoint.y;
      return Math.sqrt(dx * dx + dy * dy) < waypoint.r + state.r;
    },
  },
  {
    name: 'ABSORB',
    instruction: 'EAT SMALLER THINGS',
    successText: 'BIGGER!',
    setup(state, objects) {
      state.x = WORLD_W / 2; state.y = WORLD_H / 2; state.r = 14;
      objects.length = 0;
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const dist = 80 + Math.random() * 60;
        objects.push({
          x: WORLD_W / 2 + Math.cos(angle) * dist,
          y: WORLD_H / 2 + Math.sin(angle) * dist,
          r: 4 + Math.random() * 2,
          color: THEME.grey, tier: 0, alive: true, absorbT: -1,
        });
      }
    },
    check(_state, objects) {
      return objects.filter(o => o.alive).length <= 5;
    },
  },
  {
    name: 'AVOID',
    instruction: 'AVOID BIGGER THINGS',
    successText: 'READY!',
    setup(state, objects) {
      state.x = WORLD_W / 2; state.y = WORLD_H / 2; state.r = 16;
      objects.length = 0;
      for (let i = 0; i < 3; i++) {
        const angle = (i / 3) * Math.PI * 2 + 0.5;
        objects.push({
          x: WORLD_W / 2 + Math.cos(angle) * 100,
          y: WORLD_H / 2 + Math.sin(angle) * 100,
          r: 5, color: THEME.grey, tier: 0, alive: true, absorbT: -1,
        });
      }
      // big fuchsia obstacle drifting
      objects.push({
        x: WORLD_W / 2 - 150, y: WORLD_H / 2,
        r: 28, color: THEME.fuchsia, tier: 2, alive: true, absorbT: -1,
      });
    },
    check(_state, objects) {
      return objects.filter(o => o.alive && o.tier === 0).length === 0;
    },
  },
];

export default function ClumpGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<'start' | 'playing' | 'tutorial' | 'gameover' | 'leaderboard'>('start');
  const [score, setScore] = useState(0);
  const [socialLoaded, setSocialLoaded] = useState(false);
  const [submittedEntryId, setSubmittedEntryId] = useState<number | null>(null);
  const [progression, setProgression] = useState<ProgressionResult | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);

  const { user } = usePixelpitSocial(socialLoaded);

  const GAME_URL = typeof window !== 'undefined'
    ? `${window.location.origin}/pixelpit/arcade/clump`
    : 'https://pixelpit.gg/pixelpit/arcade/clump';

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

  // All mutable game state in a ref
  const g = useRef({
    state: { x: WORLD_W / 2, y: WORLD_H / 2, r: 12, score: 0, time: GAME_DURATION, speed: 200 } as GameState,
    objects: [] as GameObject[],
    particles: [] as Particle[],
    orbiters: [] as Orbiter[],
    gameTime: 0,
    knockback: null as { vx: number; vy: number; timer: number } | null,
    hitStop: 0,
    screenShake: { timer: 0, intensity: 0 },
    hitFlash: 0,
    iFrames: 0,
    comboCount: 0,
    comboTimer: 0,
    comboFlashTimer: 0,
    currentTier: 0,
    prevTier: 0,
    pulseTimer: 0,
    pulseScale: 1,
    tier4Spawned: false,
    inputX: 0, inputY: 0, inputActive: false,
    // audio
    audioCtx: null as AudioContext | null,
    droneOsc: null as OscillatorNode | null,
    droneGain: null as GainNode | null,
    hihatInterval: null as any,
    arpInterval: null as any,
    beatInterval: null as any,
    musicTier: -1,
    // tutorial
    tutorialStep: -1,
    tutorialPhase: 'instruction' as 'instruction' | 'playing' | 'success',
    tutorialTimer: 0,
    tutorialWaypoint: null as { x: number; y: number; r: number; pulseT: number } | null,
    tutorialGotHit: false,
    // phase tracking
    phase: 'start' as 'start' | 'playing' | 'tutorial' | 'ending' | 'over',
    endFreezeTimer: 0,
    running: false,
  });

  // --- AUDIO ---
  const initAudio = useCallback(() => {
    const game = g.current;
    if (!game.audioCtx) {
      game.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (game.audioCtx.state === 'suspended') game.audioCtx.resume();
  }, []);

  const playAbsorb = useCallback((playerRadius: number) => {
    const ctx = g.current.audioCtx;
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.frequency.value = 800 - Math.min(playerRadius * 3, 600);
    osc.type = 'triangle';
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
    osc.start(); osc.stop(ctx.currentTime + 0.12);
  }, []);

  const playHit = useCallback(() => {
    const ctx = g.current.audioCtx;
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gn = ctx.createGain();
    osc.connect(gn); gn.connect(ctx.destination);
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(200, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(60, ctx.currentTime + 0.15);
    gn.gain.setValueAtTime(0.2, ctx.currentTime);
    gn.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
    osc.start(); osc.stop(ctx.currentTime + 0.2);
  }, []);

  const playLevelUp = useCallback(() => {
    const ctx = g.current.audioCtx;
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gn = ctx.createGain();
    osc.connect(gn); gn.connect(ctx.destination);
    osc.type = 'square';
    osc.frequency.setValueAtTime(300, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(600, ctx.currentTime + 0.2);
    gn.gain.setValueAtTime(0.12, ctx.currentTime);
    gn.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.start(); osc.stop(ctx.currentTime + 0.3);
  }, []);

  const playBoom = useCallback(() => {
    const ctx = g.current.audioCtx;
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gn = ctx.createGain();
    const lpf = ctx.createBiquadFilter();
    lpf.type = 'lowpass';
    lpf.frequency.setValueAtTime(400, ctx.currentTime);
    lpf.frequency.exponentialRampToValueAtTime(60, ctx.currentTime + 0.5);
    osc.connect(lpf); lpf.connect(gn); gn.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(120, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(20, ctx.currentTime + 0.8);
    gn.gain.setValueAtTime(0.3, ctx.currentTime);
    gn.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);
    osc.start(); osc.stop(ctx.currentTime + 1.2);
    // noise layer
    const buf = ctx.createBuffer(1, ctx.sampleRate * 0.6, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    const src = ctx.createBufferSource();
    const ng = ctx.createGain();
    src.buffer = buf; src.connect(ng); ng.connect(ctx.destination);
    ng.gain.setValueAtTime(0.08, ctx.currentTime);
    ng.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
    src.start();
  }, []);

  // --- MUSIC LAYERS ---
  const startDrone = useCallback(() => {
    const game = g.current;
    if (!game.audioCtx) return;
    game.droneOsc = game.audioCtx.createOscillator();
    game.droneGain = game.audioCtx.createGain();
    game.droneOsc.connect(game.droneGain);
    game.droneGain.connect(game.audioCtx.destination);
    game.droneOsc.type = 'sine';
    game.droneOsc.frequency.value = 65.41;
    game.droneGain.gain.value = 0.06;
    game.droneOsc.start();
  }, []);

  const stopMusic = useCallback(() => {
    const game = g.current;
    if (game.hihatInterval) { clearInterval(game.hihatInterval); game.hihatInterval = null; }
    if (game.arpInterval) { clearInterval(game.arpInterval); game.arpInterval = null; }
    if (game.beatInterval) { clearInterval(game.beatInterval); game.beatInterval = null; }
    if (game.droneOsc) { try { game.droneOsc.stop(); } catch(e){} game.droneOsc = null; }
  }, []);

  const startHihats = useCallback(() => {
    const game = g.current;
    if (game.hihatInterval || !game.audioCtx) return;
    game.hihatInterval = setInterval(() => {
      const ctx = game.audioCtx;
      if (!ctx) return;
      const buf = ctx.createBuffer(1, ctx.sampleRate * 0.05, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
      const src = ctx.createBufferSource();
      const gn = ctx.createGain();
      src.buffer = buf; src.connect(gn); gn.connect(ctx.destination);
      gn.gain.value = 0.04;
      src.start();
    }, 250);
  }, []);

  const startArp = useCallback(() => {
    const game = g.current;
    if (game.arpInterval || !game.audioCtx) return;
    const notes = [261.6, 311.1, 392.0, 523.3];
    let idx = 0;
    game.arpInterval = setInterval(() => {
      const ctx = game.audioCtx;
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gn = ctx.createGain();
      osc.connect(gn); gn.connect(ctx.destination);
      osc.type = 'sawtooth';
      osc.frequency.value = notes[idx % notes.length];
      gn.gain.setValueAtTime(0.05, ctx.currentTime);
      gn.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      osc.start(); osc.stop(ctx.currentTime + 0.15);
      idx++;
    }, 200);
  }, []);

  const startBeat = useCallback(() => {
    const game = g.current;
    if (game.beatInterval || !game.audioCtx) return;
    game.beatInterval = setInterval(() => {
      const ctx = game.audioCtx;
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gn = ctx.createGain();
      osc.connect(gn); gn.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(80, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + 0.15);
      gn.gain.setValueAtTime(0.15, ctx.currentTime);
      gn.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
      osc.start(); osc.stop(ctx.currentTime + 0.2);
    }, 500);
  }, []);

  // --- PARTICLES ---
  const spawnParticles = useCallback((x: number, y: number, color: string, count: number) => {
    const game = g.current;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 50 + Math.random() * 100;
      const life = 0.3 + Math.random() * 0.2;
      game.particles.push({
        x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        r: 2 + Math.random() * 3, color, life, maxLife: life,
      });
    }
  }, []);

  function getTier(radius: number): number {
    if (radius >= 60) return 3;
    if (radius >= 30) return 2;
    if (radius >= 16) return 1;
    return 0;
  }

  function getZoom(r: number): number {
    const minZoom = 0.3;
    const maxZoom = 1.5;
    const t = Math.min((r - 12) / 80, 1);
    return maxZoom - (maxZoom - minZoom) * easeOutQuad(t);
  }

  // --- SPAWN ---
  const spawnObjects = useCallback(() => {
    const game = g.current;
    game.objects = [];
    for (let ti = 0; ti < 3; ti++) {
      const tier = TIERS[ti];
      for (let i = 0; i < tier.count; i++) {
        game.objects.push({
          x: Math.random() * WORLD_W, y: Math.random() * WORLD_H,
          r: tier.minR + Math.random() * (tier.maxR - tier.minR),
          color: tier.color, tier: ti, alive: true, absorbT: -1,
        });
      }
    }
  }, []);

  const spawnTier4 = useCallback(() => {
    const game = g.current;
    if (game.tier4Spawned) return;
    game.tier4Spawned = true;
    const tier = TIERS[3];
    for (let i = 0; i < 12; i++) {
      game.objects.push({
        x: Math.random() * WORLD_W, y: Math.random() * WORLD_H,
        r: tier.minR + Math.random() * (tier.maxR - tier.minR),
        color: tier.color, tier: 3, alive: true, absorbT: -1,
      });
    }
  }, []);

  // --- INIT GAME ---
  const initGame = useCallback(() => {
    const game = g.current;
    game.state = { x: WORLD_W / 2, y: WORLD_H / 2, r: 12, score: 0, time: GAME_DURATION, speed: 200 };
    game.particles = [];
    game.orbiters = [];
    game.gameTime = 0;
    game.knockback = null;
    game.hitStop = 0;
    game.screenShake = { timer: 0, intensity: 0 };
    game.hitFlash = 0;
    game.iFrames = 0;
    game.comboCount = 0;
    game.comboTimer = 0;
    game.comboFlashTimer = 0;
    game.currentTier = 0;
    game.prevTier = 0;
    game.pulseTimer = 0;
    game.pulseScale = 1;
    game.tier4Spawned = false;
    game.musicTier = -1;
    game.endFreezeTimer = 0;
    game.tutorialStep = -1;
    game.tutorialGotHit = false;
    stopMusic();
    spawnObjects();
  }, [stopMusic, spawnObjects]);

  // --- START ---
  const startGame = useCallback(() => {
    initGame();
    initAudio();
    startDrone();
    g.current.phase = 'playing';
    g.current.running = true;
    setGameState('playing');
    setShowShareModal(false);
    setProgression(null);
  }, [initGame, initAudio, startDrone]);

  const startTutorial = useCallback(() => {
    initGame();
    initAudio();
    g.current.phase = 'tutorial';
    g.current.tutorialStep = 0;
    g.current.tutorialPhase = 'instruction';
    g.current.tutorialTimer = 0;
    g.current.objects = [];
    g.current.particles = [];
    g.current.tutorialWaypoint = {
      x: WORLD_W / 2 + 150, y: WORLD_H / 2 - 100, r: 20, pulseT: 0,
    };
    TUTORIAL_STEPS[0].setup(g.current.state, g.current.objects);
    g.current.running = true;
    setGameState('tutorial');
  }, [initGame, initAudio]);

  // --- GAME LOOP ---
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    function resize() {
      canvas!.width = window.innerWidth;
      canvas!.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    // Input handlers
    const handleTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      const game = g.current;
      game.inputActive = true;
      game.inputX = e.touches[0].clientX;
      game.inputY = e.touches[0].clientY;
      initAudio();
    };
    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      g.current.inputX = e.touches[0].clientX;
      g.current.inputY = e.touches[0].clientY;
    };
    const handleTouchEnd = (e: TouchEvent) => {
      e.preventDefault();
      g.current.inputActive = false;
    };
    const handleMouseDown = (e: MouseEvent) => {
      g.current.inputActive = true;
      g.current.inputX = e.clientX;
      g.current.inputY = e.clientY;
      initAudio();
    };
    const handleMouseMove = (e: MouseEvent) => {
      if (g.current.inputActive) {
        g.current.inputX = e.clientX;
        g.current.inputY = e.clientY;
      }
    };
    const handleMouseUp = () => { g.current.inputActive = false; };

    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd, { passive: false });
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);

    let lastTime = performance.now();
    let animId: number;

    function getWorldPos(cx: number, cy: number) {
      const game = g.current;
      const zoom = getZoom(game.state.r);
      const camX = game.state.x - canvas!.width / 2 / zoom;
      const camY = game.state.y - canvas!.height / 2 / zoom;
      return { x: camX + cx / zoom, y: camY + cy / zoom };
    }

    function update(dt: number) {
      const game = g.current;

      if (game.phase === 'tutorial') {
        updateTutorial(dt);
        return;
      }
      if (game.phase !== 'playing' && game.phase !== 'ending') return;

      if (game.phase === 'ending') {
        game.endFreezeTimer += dt;
        if (game.endFreezeTimer >= 2.0) {
          game.phase = 'over';
          setScore(game.state.score);
          setGameState('gameover');
          // Analytics
          if (game.state.score >= 1) {
            fetch('/api/pixelpit/stats', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ game: GAME_ID }),
            }).catch(() => {});
          }
        }
        return;
      }

      // Timer
      game.state.time -= dt;
      if (game.state.time <= 15 && !game.tier4Spawned) spawnTier4();
      if (game.state.time <= 0) {
        game.state.time = 0;
        game.phase = 'ending';
        game.endFreezeTimer = 0;
        stopMusic();
        playBoom();
        return;
      }

      // Hit-stop
      if (game.hitStop > 0) { game.hitStop -= dt; return; }

      // Knockback
      if (game.knockback) {
        game.knockback.timer -= dt;
        const t = Math.max(0, game.knockback.timer / 0.15);
        const speed = t * t;
        game.state.x += game.knockback.vx * speed * dt;
        game.state.y += game.knockback.vy * speed * dt;
        game.state.x = Math.max(game.state.r, Math.min(WORLD_W - game.state.r, game.state.x));
        game.state.y = Math.max(game.state.r, Math.min(WORLD_H - game.state.r, game.state.y));
        if (game.knockback.timer <= 0) game.knockback = null;
      }

      if (game.screenShake.timer > 0) game.screenShake.timer -= dt;
      if (game.hitFlash > 0) game.hitFlash -= dt;
      if (game.iFrames > 0) game.iFrames -= dt;

      // Movement
      if (game.inputActive) {
        const wp = getWorldPos(game.inputX, game.inputY);
        const dx = wp.x - game.state.x;
        const dy = wp.y - game.state.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 2) {
          const spd = game.state.speed / (1 + game.state.r * 0.02);
          const move = Math.min(spd * dt, dist);
          game.state.x += (dx / dist) * move;
          game.state.y += (dy / dist) * move;
        }
      }
      game.state.x = Math.max(game.state.r, Math.min(WORLD_W - game.state.r, game.state.x));
      game.state.y = Math.max(game.state.r, Math.min(WORLD_H - game.state.r, game.state.y));

      // Collision
      for (const obj of game.objects) {
        if (!obj.alive) continue;
        const dx = obj.x - game.state.x;
        const dy = obj.y - game.state.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Hit bigger
        if (game.iFrames <= 0 && obj.r >= game.state.r && dist < game.state.r + obj.r * 0.5) {
          const nx = (game.state.x - obj.x) / (dist || 1);
          const ny = (game.state.y - obj.y) / (dist || 1);
          const sizeRatio = Math.min(obj.r / game.state.r, 3);
          const force = 300 + sizeRatio * 200;
          game.knockback = { vx: nx * force, vy: ny * force, timer: 0.15 };
          game.hitStop = 0.05;
          game.screenShake = { timer: 0.12, intensity: 3 };
          game.hitFlash = 0.07;

          const loseCount = Math.min(game.orbiters.length, 2 + Math.floor(Math.random() * 2));
          for (let i = 0; i < loseCount; i++) {
            const orb = game.orbiters.pop();
            if (!orb) break;
            const angle = Math.random() * Math.PI * 2;
            const spawnDist = game.state.r + 10;
            game.objects.push({
              x: game.state.x + Math.cos(angle) * spawnDist,
              y: game.state.y + Math.sin(angle) * spawnDist,
              r: 4 + Math.random() * 2, color: THEME.slime,
              tier: 0, alive: true, absorbT: -1,
            });
            spawnParticles(
              game.state.x + Math.cos(angle) * game.state.r,
              game.state.y + Math.sin(angle) * game.state.r,
              THEME.slime, 3
            );
          }

          const shrinkArea = loseCount * 25;
          game.state.r = Math.max(12, Math.sqrt(Math.max(0, game.state.r * game.state.r - shrinkArea)));
          game.currentTier = getTier(game.state.r);
          game.iFrames = 0.3;
          playHit();
          break;
        }

        // Absorb smaller
        if (obj.r >= game.state.r) continue;
        if (dist < game.state.r + obj.r * 0.3) {
          obj.alive = false;
          obj.absorbT = 0;
          const area = obj.r * obj.r;
          game.state.r = Math.sqrt(game.state.r * game.state.r + area * 0.3);
          game.state.score += Math.round(obj.r);
          spawnParticles(obj.x, obj.y, obj.color, 6);
          playAbsorb(game.state.r);

          // orbiter
          if (game.orbiters.length < 30) {
            const orbDist = 0.5 + Math.random() * 0.5;
            game.orbiters.push({
              angle: Math.random() * Math.PI * 2,
              dist: orbDist,
              r: Math.min(obj.r * 0.6, 8) * (1.2 - orbDist * 0.6),
              color: obj.color,
              speed: (0.5 + Math.random() * 1.0) * (Math.random() < 0.5 ? 1 : -1),
              wobblePhase: Math.random() * Math.PI * 2,
              wobbleAmp: 0.08 + Math.random() * 0.15,
            });
          }

          // combo
          game.comboCount++;
          game.comboTimer = 1.0;
          if (game.comboCount >= 3) {
            game.comboFlashTimer = 0.3;
            game.state.score += game.comboCount * 5;
          }

          // tier check
          game.currentTier = getTier(game.state.r);
          if (game.currentTier > game.prevTier) {
            game.prevTier = game.currentTier;
            game.pulseTimer = 0.2;
            playLevelUp();
            if (game.currentTier >= 1 && game.musicTier < 1) { game.musicTier = 1; startHihats(); }
            if (game.currentTier >= 2 && game.musicTier < 2) { game.musicTier = 2; startArp(); }
            if (game.currentTier >= 3 && game.musicTier < 3) { game.musicTier = 3; startBeat(); }
          }
        }
      }

      // Absorb animation
      for (const obj of game.objects) {
        if (obj.absorbT >= 0 && obj.absorbT < 1) {
          obj.absorbT += dt * 10;
          obj.x += (game.state.x - obj.x) * dt * 20;
          obj.y += (game.state.y - obj.y) * dt * 20;
        }
      }

      // Combo timer
      if (game.comboTimer > 0) {
        game.comboTimer -= dt;
        if (game.comboTimer <= 0) game.comboCount = 0;
      }
      if (game.comboFlashTimer > 0) game.comboFlashTimer -= dt;

      // Pulse
      if (game.pulseTimer > 0) {
        game.pulseTimer -= dt;
        const t = 1 - (game.pulseTimer / 0.2);
        game.pulseScale = 1 + 0.15 * (1 - easeOutElastic(t));
      } else {
        game.pulseScale = 1;
      }

      // Orbiters
      game.gameTime += dt;
      for (const orb of game.orbiters) {
        orb.angle += orb.speed * dt;
      }

      // Particles
      for (let i = game.particles.length - 1; i >= 0; i--) {
        const p = game.particles[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.life -= dt;
        if (p.life <= 0) game.particles.splice(i, 1);
      }
    }

    function updateTutorial(dt: number) {
      const game = g.current;
      const step = TUTORIAL_STEPS[game.tutorialStep];
      if (!step) return;

      game.gameTime += dt;
      game.tutorialTimer += dt;

      if (game.tutorialPhase === 'instruction') {
        if (game.tutorialTimer > 0.8) {
          game.tutorialPhase = 'playing';
          game.tutorialTimer = 0;
        }
        return;
      }

      if (game.tutorialPhase === 'success') {
        if (game.tutorialTimer > 0.8) {
          game.tutorialStep++;
          if (game.tutorialStep >= TUTORIAL_STEPS.length) {
            // launch real game
            initGame();
            initAudio();
            startDrone();
            game.phase = 'playing';
            setGameState('playing');
            return;
          }
          game.tutorialPhase = 'instruction';
          game.tutorialTimer = 0;
          game.objects = [];
          game.particles = [];
          game.orbiters = [];
          const nextStep = TUTORIAL_STEPS[game.tutorialStep];
          if (game.tutorialStep === 0) {
            game.tutorialWaypoint = { x: WORLD_W / 2 + 150, y: WORLD_H / 2 - 100, r: 20, pulseT: 0 };
          } else {
            game.tutorialWaypoint = null;
          }
          nextStep.setup(game.state, game.objects);
        }
        return;
      }

      // playing phase — update movement + collision
      if (game.hitStop > 0) { game.hitStop -= dt; return; }
      if (game.knockback) {
        game.knockback.timer -= dt;
        const t = Math.max(0, game.knockback.timer / 0.15);
        game.state.x += game.knockback.vx * t * t * dt;
        game.state.y += game.knockback.vy * t * t * dt;
        if (game.knockback.timer <= 0) game.knockback = null;
      }
      if (game.screenShake.timer > 0) game.screenShake.timer -= dt;
      if (game.hitFlash > 0) game.hitFlash -= dt;
      if (game.iFrames > 0) game.iFrames -= dt;

      if (game.inputActive) {
        const wp = getWorldPos(game.inputX, game.inputY);
        const dx = wp.x - game.state.x;
        const dy = wp.y - game.state.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 2) {
          const spd = game.state.speed / (1 + game.state.r * 0.02);
          const move = Math.min(spd * dt, dist);
          game.state.x += (dx / dist) * move;
          game.state.y += (dy / dist) * move;
        }
      }

      // waypoint pulse
      if (game.tutorialWaypoint) {
        game.tutorialWaypoint.pulseT += dt;
      }

      // tutorial collision (simplified — same as main but no combo/tier/music)
      for (const obj of game.objects) {
        if (!obj.alive) continue;
        const dx = obj.x - game.state.x;
        const dy = obj.y - game.state.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        // hit bigger
        if (game.iFrames <= 0 && obj.r >= game.state.r && dist < game.state.r + obj.r * 0.5) {
          const nx = (game.state.x - obj.x) / (dist || 1);
          const ny = (game.state.y - obj.y) / (dist || 1);
          const sizeRatio = Math.min(obj.r / game.state.r, 3);
          const force = 300 + sizeRatio * 200;
          game.knockback = { vx: nx * force, vy: ny * force, timer: 0.15 };
          game.hitStop = 0.05;
          game.screenShake = { timer: 0.12, intensity: 3 };
          game.hitFlash = 0.07;
          game.iFrames = 0.3;
          game.tutorialGotHit = true;
          playHit();
          break;
        }
        if (obj.r >= game.state.r) continue;
        if (dist < game.state.r + obj.r * 0.3) {
          obj.alive = false;
          obj.absorbT = 0;
          game.state.r = Math.sqrt(game.state.r * game.state.r + obj.r * obj.r * 0.3);
          spawnParticles(obj.x, obj.y, obj.color, 6);
          playAbsorb(game.state.r);
        }
      }

      // absorb animation
      for (const obj of game.objects) {
        if (obj.absorbT >= 0 && obj.absorbT < 1) {
          obj.absorbT += dt * 10;
          obj.x += (game.state.x - obj.x) * dt * 20;
          obj.y += (game.state.y - obj.y) * dt * 20;
        }
      }

      // particles
      for (let i = game.particles.length - 1; i >= 0; i--) {
        const p = game.particles[i];
        p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt;
        if (p.life <= 0) game.particles.splice(i, 1);
      }

      // move drifting big obj in avoid step
      if (game.tutorialStep === 2) {
        const big = game.objects.find(o => o.tier === 2);
        if (big) {
          big.x += 30 * dt;
          if (big.x > WORLD_W / 2 + 200) big.x = WORLD_W / 2 - 200;
        }
      }

      // check success
      if (step.check(game.state, game.objects, game.tutorialWaypoint, game.tutorialGotHit)) {
        game.tutorialPhase = 'success';
        game.tutorialTimer = 0;
      }
    }

    function draw() {
      const game = g.current;
      const W = canvas!.width;
      const H = canvas!.height;

      if (game.phase === 'start' || game.phase === 'over') return;

      const zoom = getZoom(game.state.r);
      const camX = game.state.x - W / 2 / zoom;
      const camY = game.state.y - H / 2 / zoom;

      // bg
      let bg = THEME.bg;
      if (game.state.time <= 10 && game.phase === 'playing') {
        const t = 1 - game.state.time / 10;
        const r = Math.round(10 + t * 16);
        const gv = Math.round(10 - t * 5);
        const b = Math.round(10 - t * 5);
        bg = `rgb(${r},${gv},${b})`;
      }
      ctx!.fillStyle = bg;
      ctx!.fillRect(0, 0, W, H);

      ctx!.save();
      if (game.screenShake.timer > 0) {
        const s = game.screenShake.intensity * (game.screenShake.timer / 0.12);
        ctx!.translate((Math.random() * 2 - 1) * s, (Math.random() * 2 - 1) * s);
      }
      ctx!.scale(zoom, zoom);
      ctx!.translate(-camX, -camY);

      // Grid
      ctx!.strokeStyle = THEME.grid;
      ctx!.lineWidth = 1;
      const startX = Math.floor(camX / GRID_SIZE) * GRID_SIZE;
      const startY = Math.floor(camY / GRID_SIZE) * GRID_SIZE;
      const endX = camX + W / zoom;
      const endY = camY + H / zoom;
      for (let x = startX; x <= endX; x += GRID_SIZE) {
        ctx!.beginPath(); ctx!.moveTo(x, camY); ctx!.lineTo(x, endY); ctx!.stroke();
      }
      for (let y = startY; y <= endY; y += GRID_SIZE) {
        ctx!.beginPath(); ctx!.moveTo(camX, y); ctx!.lineTo(endX, y); ctx!.stroke();
      }

      // Heartbeat grid
      if (game.state.time <= 10 && game.phase === 'playing') {
        const beat = Math.sin(game.state.time * 4) * 0.5 + 0.5;
        ctx!.strokeStyle = `rgba(239,68,68,${beat * 0.15})`;
        ctx!.lineWidth = 2;
        for (let x = startX; x <= endX; x += GRID_SIZE) {
          ctx!.beginPath(); ctx!.moveTo(x, camY); ctx!.lineTo(x, endY); ctx!.stroke();
        }
        for (let y = startY; y <= endY; y += GRID_SIZE) {
          ctx!.beginPath(); ctx!.moveTo(camX, y); ctx!.lineTo(endX, y); ctx!.stroke();
        }
      }

      // Tutorial waypoint
      if (game.phase === 'tutorial' && game.tutorialWaypoint && game.tutorialPhase === 'playing') {
        const wp = game.tutorialWaypoint;
        const pulse = 1 + Math.sin(wp.pulseT * 4) * 0.2;
        ctx!.globalAlpha = 0.4;
        ctx!.fillStyle = THEME.slime;
        ctx!.shadowBlur = 20;
        ctx!.shadowColor = THEME.slime;
        ctx!.beginPath();
        ctx!.arc(wp.x, wp.y, wp.r * pulse, 0, Math.PI * 2);
        ctx!.fill();
        ctx!.shadowBlur = 0;
        ctx!.globalAlpha = 1;
      }

      // Objects
      for (const obj of game.objects) {
        if (obj.absorbT >= 1) continue;
        let r = obj.r;
        let alpha = 1;
        if (obj.absorbT >= 0) {
          r *= (1 - obj.absorbT);
          alpha = 1 - obj.absorbT;
        }
        if (!obj.alive && obj.absorbT < 0) continue;
        const sx = (obj.x - camX) * zoom;
        const sy = (obj.y - camY) * zoom;
        if (sx < -50 || sx > W + 50 || sy < -50 || sy > H + 50) continue;
        ctx!.globalAlpha = alpha;
        ctx!.fillStyle = obj.color;
        if (obj.tier >= 2) { ctx!.shadowBlur = 6; ctx!.shadowColor = obj.color; }
        ctx!.beginPath();
        ctx!.arc(obj.x, obj.y, r, 0, Math.PI * 2);
        ctx!.fill();
        ctx!.shadowBlur = 0;
        ctx!.globalAlpha = 1;
      }

      // Particles
      for (const p of game.particles) {
        ctx!.globalAlpha = p.life / p.maxLife;
        ctx!.fillStyle = p.color;
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, p.r * (p.life / p.maxLife), 0, Math.PI * 2);
        ctx!.fill();
      }
      ctx!.globalAlpha = 1;

      // Player blob
      const pr = game.state.r * game.pulseScale;
      const blobColor = game.hitFlash > 0 ? '#ef4444' : THEME.slime;
      if (game.iFrames > 0 && Math.floor(game.gameTime * 20) % 2 === 0) {
        ctx!.globalAlpha = 0.4;
      }
      ctx!.shadowBlur = 12;
      ctx!.shadowColor = blobColor;
      ctx!.fillStyle = blobColor;
      ctx!.beginPath();
      ctx!.arc(game.state.x, game.state.y, pr, 0, Math.PI * 2);
      ctx!.fill();
      ctx!.shadowBlur = 0;
      ctx!.globalAlpha = 1;
      ctx!.fillStyle = 'rgba(200, 255, 150, 0.3)';
      ctx!.beginPath();
      ctx!.arc(game.state.x, game.state.y, pr * 0.5, 0, Math.PI * 2);
      ctx!.fill();

      // Orbiters
      for (const orb of game.orbiters) {
        const wobble = Math.sin(game.gameTime * 3 * Math.abs(orb.speed) + orb.wobblePhase) * orb.wobbleAmp;
        const d = pr * (orb.dist + wobble);
        const ox = game.state.x + Math.cos(orb.angle) * d;
        const oy = game.state.y + Math.sin(orb.angle) * d;
        ctx!.globalAlpha = 0.45;
        ctx!.fillStyle = orb.color;
        ctx!.beginPath();
        ctx!.arc(ox, oy, orb.r * game.pulseScale, 0, Math.PI * 2);
        ctx!.fill();
      }
      ctx!.globalAlpha = 1;

      ctx!.restore();

      // --- HUD ---
      if (game.phase === 'playing') {
        ctx!.fillStyle = THEME.text;
        ctx!.font = 'bold 28px monospace';
        ctx!.textAlign = 'center';
        ctx!.fillText(Math.ceil(game.state.time) + 's', W / 2, 40);
        ctx!.font = '20px monospace';
        ctx!.textAlign = 'left';
        ctx!.fillText('Score: ' + game.state.score, 16, 40);

        if (game.comboFlashTimer > 0) {
          ctx!.strokeStyle = THEME.slime;
          ctx!.lineWidth = 3;
          ctx!.globalAlpha = game.comboFlashTimer / 0.3;
          ctx!.strokeRect(4, 4, W - 8, H - 8);
          ctx!.globalAlpha = 1;
          ctx!.fillStyle = THEME.slime;
          ctx!.font = 'bold 32px monospace';
          ctx!.textAlign = 'center';
          ctx!.fillText('COMBO x' + game.comboCount, W / 2, H / 2 - 60);
        }
      }

      // Tutorial HUD
      if (game.phase === 'tutorial') {
        const step = TUTORIAL_STEPS[game.tutorialStep];
        if (step) {
          ctx!.fillStyle = 'rgba(255,255,255,0.4)';
          ctx!.font = '14px monospace';
          ctx!.textAlign = 'left';
          ctx!.fillText((game.tutorialStep + 1) + '/' + TUTORIAL_STEPS.length, 16, 30);

          if (game.tutorialPhase === 'instruction' || game.tutorialPhase === 'playing') {
            ctx!.fillStyle = THEME.text;
            ctx!.font = 'bold 24px monospace';
            ctx!.textAlign = 'center';
            ctx!.fillText(step.instruction, W / 2, 50);
          }

          if (game.tutorialPhase === 'success') {
            ctx!.fillStyle = THEME.slime;
            ctx!.font = 'bold 36px monospace';
            ctx!.textAlign = 'center';
            ctx!.shadowBlur = 12;
            ctx!.shadowColor = THEME.slime;
            ctx!.fillText(step.successText, W / 2, H / 2 - 20);
            ctx!.shadowBlur = 0;
          }

          // SKIP button (drawn on canvas, click handled in React overlay)
          ctx!.fillStyle = 'rgba(255,255,255,0.3)';
          ctx!.font = '14px monospace';
          ctx!.textAlign = 'right';
          ctx!.fillText('SKIP >', W - 16, 30);
        }
      }

      // Ending
      if (game.phase === 'ending') {
        const t = Math.min(game.endFreezeTimer / 1.5, 1);
        ctx!.fillStyle = `rgba(0,0,0,${t * 0.5})`;
        ctx!.fillRect(0, 0, W, H);
        ctx!.fillStyle = THEME.text;
        ctx!.font = 'bold 36px monospace';
        ctx!.textAlign = 'center';
        ctx!.fillText("TIME'S UP", W / 2, H / 2 - 20);
      }

      ctx!.textAlign = 'left';
    }

    function loop(ts: number) {
      const dt = Math.min((ts - lastTime) / 1000, 0.05);
      lastTime = ts;
      if (g.current.running) {
        update(dt);
        draw();
      }
      animId = requestAnimationFrame(loop);
    }
    animId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchmove', handleTouchMove);
      canvas.removeEventListener('touchend', handleTouchEnd);
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseup', handleMouseUp);
      stopMusic();
    };
  }, [initAudio, initGame, playAbsorb, playBoom, playHit, playLevelUp, spawnObjects, spawnParticles, spawnTier4, startArp, startBeat, startDrone, startHihats, stopMusic]);

  // Skip tutorial handler
  const skipTutorial = useCallback(() => {
    initGame();
    initAudio();
    startDrone();
    g.current.phase = 'playing';
    g.current.running = true;
    setGameState('playing');
  }, [initGame, initAudio, startDrone]);

  return (
    <>
      <Script
        src="/pixelpit/social.js"
        strategy="lazyOnload"
        onLoad={() => setSocialLoaded(true)}
      />
      <canvas
        ref={canvasRef}
        style={{
          position: 'fixed',
          inset: 0,
          width: '100%',
          height: '100%',
          display: 'block',
          background: THEME.bg,
          touchAction: 'none',
        }}
      />

      {/* Start Screen */}
      {gameState === 'start' && (
        <div style={{
          position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', background: COLORS.bg,
          zIndex: 100, textAlign: 'center', padding: 40,
        }}>
          <div style={{
            background: COLORS.surface, border: '1px solid rgba(255,255,255,0.05)',
            padding: '50px 60px', boxShadow: '0 20px 60px rgba(0,0,0,0.5)', borderRadius: 16,
          }}>
            <h1 style={{
              fontFamily: 'ui-monospace, monospace', fontSize: 64, fontWeight: 300,
              color: COLORS.primary, marginBottom: 20, letterSpacing: 8,
              textShadow: '0 0 40px rgba(163,230,53,0.4)',
            }}>
              CLUMP
            </h1>
            <p style={{
              fontSize: 14, fontFamily: 'ui-monospace, monospace', color: COLORS.secondary,
              marginBottom: 35, lineHeight: 1.8, letterSpacing: 2,
            }}>
              absorb everything smaller<br />
              avoid everything bigger<br />
              60 seconds
            </p>
            <button
              onClick={startGame}
              style={{
                background: COLORS.primary, color: COLORS.bg, border: 'none',
                padding: '16px 50px', fontSize: 16, fontFamily: 'ui-monospace, monospace',
                fontWeight: 600, cursor: 'pointer', borderRadius: 8, letterSpacing: 2,
                boxShadow: '0 8px 30px rgba(163,230,53,0.3)',
              }}
            >
              play
            </button>
            <div style={{ marginTop: 16 }}>
              <button
                onClick={startTutorial}
                style={{
                  background: 'transparent', border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 6, color: COLORS.muted, padding: '10px 30px',
                  fontSize: 12, fontFamily: 'ui-monospace, monospace', cursor: 'pointer',
                  letterSpacing: 2,
                }}
              >
                tutorial
              </button>
            </div>
          </div>
          <div style={{
            marginTop: 30, fontSize: 12, fontFamily: 'ui-monospace, monospace', letterSpacing: 3,
          }}>
            <span style={{ color: COLORS.primary }}>pixel</span>
            <span style={{ color: COLORS.secondary }}>pit</span>
            <span style={{ color: COLORS.text, opacity: 0.4 }}> arcade</span>
          </div>
        </div>
      )}

      {/* Tutorial Skip Overlay */}
      {gameState === 'tutorial' && (
        <button
          onClick={skipTutorial}
          style={{
            position: 'fixed', top: 12, right: 16, zIndex: 50,
            background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.3)',
            fontSize: 14, fontFamily: 'ui-monospace, monospace', cursor: 'pointer',
            padding: '8px 12px',
          }}
        >
          SKIP &gt;
        </button>
      )}

      {/* Game Over Screen */}
      {gameState === 'gameover' && (
        <div style={{
          position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', background: COLORS.bg,
          zIndex: 100, textAlign: 'center', padding: 40,
        }}>
          <h1 style={{
            fontFamily: 'ui-monospace, monospace', fontSize: 28, fontWeight: 300,
            color: COLORS.secondary, marginBottom: 15, letterSpacing: 6,
          }}>
            time&apos;s up
          </h1>
          <div style={{
            fontFamily: 'ui-monospace, monospace', fontSize: 80, fontWeight: 200,
            color: COLORS.primary, marginBottom: 10,
            textShadow: '0 0 40px rgba(163,230,53,0.4)',
          }}>
            {score}
          </div>
          <div style={{
            fontFamily: 'ui-monospace, monospace', fontSize: 14, color: COLORS.muted,
            marginBottom: 30,
          }}>
            final size: {Math.round(g.current.state.r)}px
          </div>

          <ScoreFlow
            score={score}
            gameId={GAME_ID}
            colors={SCORE_FLOW_COLORS}
            maxScore={500}
            onRankReceived={(rank, entryId) => {
              setSubmittedEntryId(entryId ?? null);
            }}
            onProgression={(prog) => setProgression(prog)}
          />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 15, alignItems: 'center' }}>
            <button
              onClick={startGame}
              style={{
                background: COLORS.primary, color: COLORS.bg, border: 'none',
                borderRadius: 8, padding: '16px 50px', fontSize: 15,
                fontFamily: 'ui-monospace, monospace', fontWeight: 600, cursor: 'pointer',
                boxShadow: '0 8px 25px rgba(163,230,53,0.3)', letterSpacing: 2,
              }}
            >
              play again
            </button>
            <button
              onClick={() => setGameState('leaderboard')}
              style={{
                background: 'transparent', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 6, color: COLORS.muted, padding: '14px 35px', fontSize: 11,
                fontFamily: 'ui-monospace, monospace', cursor: 'pointer', letterSpacing: 2,
              }}
            >
              leaderboard
            </button>
            {user ? (
              <button
                onClick={() => setShowShareModal(true)}
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
                share / groups
              </button>
            ) : (
              <ShareButtonContainer
                id="share-btn-container"
                url={typeof window !== 'undefined' ? `${window.location.origin}/pixelpit/arcade/clump/share/${score}` : ''}
                text={`I scored ${score} on CLUMP! Can you beat me?`}
                style="minimal"
                socialLoaded={socialLoaded}
              />
            )}
          </div>
        </div>
      )}

      {/* Leaderboard Modal */}
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

      {/* Share Modal */}
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
