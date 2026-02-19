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
const T = {
  bg: '#0a0a0a',
  surface: '#18181b',
  slime: '#a3e635',
  cyan: '#22d3ee',
  fuchsia: '#d946ef',
  gold: '#facc15',
  grey: '#555555',
  text: '#ffffff',
  mercury: '#e8e8f0',
  mercuryHighlight: '#ffffff',
  black: '#111111',
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
  bg: COLORS.bg, surface: COLORS.surface, primary: COLORS.primary,
  secondary: COLORS.secondary, text: COLORS.text, muted: COLORS.muted, error: COLORS.error,
};

const LEADERBOARD_COLORS: LeaderboardColors = {
  bg: COLORS.bg, surface: COLORS.surface, primary: COLORS.primary,
  secondary: COLORS.secondary, text: COLORS.text, muted: COLORS.muted,
};

const GAME_ID = 'sift';

// --- CONSTANTS ---
const LAYER_HEIGHT = 12;
const LAYER_SPACING = 80;
const GAP_SIZE_MIN = 0.15;
const GAP_SIZE_MAX = 0.25;

interface Layer {
  index: number; y: number; rotation: number;
  gapCenter: number; gapSize: number; color: string;
  isMagnetic: boolean; isBlack: boolean; magnetDir: number; passed: boolean;
}
interface Particle {
  x: number; y: number; vx: number; vy: number;
  r: number; color: string; life: number; maxLife: number;
}
interface ShatterBead {
  x: number; y: number; vx: number; vy: number; r: number; life: number;
}
interface Mercury {
  x: number; y: number; r: number; vy: number; vx: number;
  onSurface: boolean; glowIntensity: number;
}

interface TutorialStepDef {
  name: string; instruction: string; successText: string;
  setup: (W: number, layers: Layer[], mercury: Mercury) => void;
  check: (combo: number, passCount: number) => boolean;
}

function createLayer(index: number): Layer {
  const isMagnetic = index > 5 && Math.random() < 0.15;
  const isBlack = index > 10 && Math.random() < 0.08;
  const gapSize = GAP_SIZE_MIN + Math.random() * (GAP_SIZE_MAX - GAP_SIZE_MIN);
  const gapCenter = 0.2 + Math.random() * 0.6;
  return {
    index, y: 0, rotation: 0, gapCenter,
    gapSize: isBlack ? 0 : gapSize,
    color: isBlack ? T.black : (isMagnetic ? T.fuchsia : T.cyan),
    isMagnetic, isBlack,
    magnetDir: Math.random() < 0.5 ? -1 : 1,
    passed: false,
  };
}

function createTutorialLayer(index: number, opts: Partial<Layer>): Layer {
  return {
    index, y: 0, rotation: 0,
    gapCenter: opts.gapCenter ?? 0.5,
    gapSize: opts.gapSize ?? 0.22,
    color: opts.color ?? T.cyan,
    isMagnetic: opts.isMagnetic ?? false,
    isBlack: opts.isBlack ?? false,
    magnetDir: opts.magnetDir ?? 1,
    passed: false,
  };
}

function getComboMultiplier(combo: number): number {
  if (combo >= 8) return 5;
  if (combo >= 5) return 3;
  if (combo >= 3) return 2;
  return 1;
}

function getLayerWorldY(layer: Layer): number {
  return 200 + layer.index * LAYER_SPACING;
}

export default function SiftGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<'start' | 'playing' | 'tutorial' | 'gameover' | 'leaderboard'>('start');
  const [score, setScore] = useState(0);
  const [finalDepth, setFinalDepth] = useState(0);
  const [finalMaxCombo, setFinalMaxCombo] = useState(0);
  const [socialLoaded, setSocialLoaded] = useState(false);
  const [submittedEntryId, setSubmittedEntryId] = useState<number | null>(null);
  const [progression, setProgression] = useState<ProgressionResult | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);

  const { user } = usePixelpitSocial(socialLoaded);

  const GAME_URL = typeof window !== 'undefined'
    ? `${window.location.origin}/pixelpit/arcade/sift`
    : 'https://pixelpit.gg/pixelpit/arcade/sift';

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
    if (groupCode) window.PixelpitSocial.storeGroupCode(groupCode);
  }, [socialLoaded]);

  // All mutable game state in a ref
  const g = useRef({
    mercury: { x: 0, y: 150, r: 14, vy: 0, vx: 0, onSurface: false, glowIntensity: 0 } as Mercury,
    layers: [] as Layer[],
    particles: [] as Particle[],
    shatterBeads: [] as ShatterBead[],
    score: 0, combo: 0, maxCombo: 0, depth: 0,
    cameraY: 0, gameTime: 0, deadTimer: 0,
    squash: { timer: 0, scaleX: 1, scaleY: 1 },
    screenShake: { timer: 0, intensity: 0 },
    comboFlash: 0,
    isDragging: false, dragStartX: 0,
    // audio
    audioCtx: null as AudioContext | null,
    droneOsc: null as OscillatorNode | null,
    droneGain: null as GainNode | null,
    // tutorial
    tutorialStep: -1,
    tutorialPhase: 'instruction' as 'instruction' | 'playing' | 'success',
    tutorialTimer: 0,
    tutorialPassCount: 0,
    // phase
    phase: 'start' as 'start' | 'playing' | 'tutorial' | 'dead' | 'over',
    running: false,
    W: 0, H: 0,
  });

  // --- TUTORIAL STEPS ---
  const TUTORIAL_STEPS: TutorialStepDef[] = [
    {
      name: 'ROTATE', instruction: 'DRAG TO ALIGN THE GAP', successText: 'NICE!',
      setup(W, layers, mercury) {
        layers.length = 0;
        mercury.x = W / 2; mercury.y = 100; mercury.r = 14; mercury.vy = 0; mercury.vx = 0; mercury.glowIntensity = 0;
        layers.push(createTutorialLayer(0, { gapCenter: 0.3, gapSize: 0.25 }));
        layers.push(createTutorialLayer(1, { gapCenter: 0.7, gapSize: 0.25 }));
        layers.push(createTutorialLayer(2, { gapCenter: 0.4, gapSize: 0.25 }));
      },
      check(_combo, passCount) { return passCount >= 2; },
    },
    {
      name: 'COMBO', instruction: 'CHAIN DROPS FOR BONUS', successText: '3x COMBO!',
      setup(W, layers, mercury) {
        layers.length = 0;
        mercury.x = W / 2; mercury.y = 100; mercury.r = 14; mercury.vy = 0; mercury.vx = 0; mercury.glowIntensity = 0;
        layers.push(createTutorialLayer(0, { gapCenter: 0.5, gapSize: 0.25 }));
        layers.push(createTutorialLayer(1, { gapCenter: 0.48, gapSize: 0.25 }));
        layers.push(createTutorialLayer(2, { gapCenter: 0.52, gapSize: 0.25 }));
        layers.push(createTutorialLayer(3, { gapCenter: 0.5, gapSize: 0.25 }));
      },
      check(combo) { return combo >= 3; },
    },
    {
      name: 'MAGNETS', instruction: 'MAGNETIC LAYERS PULL YOU', successText: 'READY!',
      setup(W, layers, mercury) {
        layers.length = 0;
        mercury.x = W / 2; mercury.y = 100; mercury.r = 14; mercury.vy = 0; mercury.vx = 0; mercury.glowIntensity = 0;
        layers.push(createTutorialLayer(0, { gapCenter: 0.5, gapSize: 0.25 }));
        layers.push(createTutorialLayer(1, { gapCenter: 0.5, gapSize: 0.25, isMagnetic: true, color: T.fuchsia, magnetDir: 1 }));
        layers.push(createTutorialLayer(2, { gapCenter: 0.35, gapSize: 0.25 }));
      },
      check(_combo, passCount) { return passCount >= 2; },
    },
  ];

  // --- AUDIO ---
  const initAudio = useCallback(() => {
    const game = g.current;
    if (!game.audioCtx) game.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    if (game.audioCtx.state === 'suspended') game.audioCtx.resume();
  }, []);

  const playPing = useCallback((depth: number) => {
    const ctx = g.current.audioCtx; if (!ctx) return;
    const osc = ctx.createOscillator(); const gn = ctx.createGain();
    osc.connect(gn); gn.connect(ctx.destination);
    osc.type = 'sine'; osc.frequency.value = Math.max(200, 800 - depth * 12);
    gn.gain.setValueAtTime(0.12, ctx.currentTime);
    gn.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
    osc.start(); osc.stop(ctx.currentTime + 0.2);
  }, []);

  const playCombo = useCallback((combo: number) => {
    const ctx = g.current.audioCtx; if (!ctx) return;
    for (let i = 0; i < Math.min(combo, 5); i++) {
      setTimeout(() => {
        const osc = ctx.createOscillator(); const gn = ctx.createGain();
        osc.connect(gn); gn.connect(ctx.destination);
        osc.type = 'triangle'; osc.frequency.value = 600 - i * 60;
        gn.gain.setValueAtTime(0.08, ctx.currentTime);
        gn.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
        osc.start(); osc.stop(ctx.currentTime + 0.15);
      }, i * 50);
    }
  }, []);

  const playShatter = useCallback(() => {
    const ctx = g.current.audioCtx; if (!ctx) return;
    const buf = ctx.createBuffer(1, ctx.sampleRate * 0.4, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    const src = ctx.createBufferSource(); const ng = ctx.createGain();
    src.buffer = buf; src.connect(ng); ng.connect(ctx.destination);
    ng.gain.setValueAtTime(0.2, ctx.currentTime);
    ng.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    src.start();
    const osc = ctx.createOscillator(); const og = ctx.createGain();
    osc.connect(og); og.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(100, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(20, ctx.currentTime + 0.3);
    og.gain.setValueAtTime(0.25, ctx.currentTime);
    og.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc.start(); osc.stop(ctx.currentTime + 0.4);
  }, []);

  const playMagnetHum = useCallback(() => {
    const ctx = g.current.audioCtx; if (!ctx) return;
    const osc = ctx.createOscillator(); const gn = ctx.createGain();
    osc.connect(gn); gn.connect(ctx.destination);
    osc.type = 'sawtooth'; osc.frequency.value = 80;
    gn.gain.setValueAtTime(0.03, ctx.currentTime);
    gn.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    osc.start(); osc.stop(ctx.currentTime + 0.5);
  }, []);

  const playLevelUp = useCallback(() => {
    const ctx = g.current.audioCtx; if (!ctx) return;
    const osc = ctx.createOscillator(); const gn = ctx.createGain();
    osc.connect(gn); gn.connect(ctx.destination);
    osc.type = 'square';
    osc.frequency.setValueAtTime(300, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(600, ctx.currentTime + 0.2);
    gn.gain.setValueAtTime(0.12, ctx.currentTime);
    gn.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.start(); osc.stop(ctx.currentTime + 0.3);
  }, []);

  const startDrone = useCallback(() => {
    const game = g.current; if (!game.audioCtx) return;
    game.droneOsc = game.audioCtx.createOscillator();
    game.droneGain = game.audioCtx.createGain();
    game.droneOsc.connect(game.droneGain);
    game.droneGain.connect(game.audioCtx.destination);
    game.droneOsc.type = 'sine'; game.droneOsc.frequency.value = 55;
    game.droneGain.gain.value = 0.04; game.droneOsc.start();
  }, []);

  const stopDrone = useCallback(() => {
    const game = g.current;
    if (game.droneOsc) { try { game.droneOsc.stop(); } catch(e){} game.droneOsc = null; }
  }, []);

  const spawnParticles = useCallback((x: number, y: number, color: string, count: number) => {
    const game = g.current;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 30 + Math.random() * 80;
      const life = 0.2 + Math.random() * 0.3;
      game.particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, r: 1.5 + Math.random() * 2, color, life, maxLife: life });
    }
  }, []);

  const spawnShatter = useCallback((x: number, y: number) => {
    const game = g.current;
    game.shatterBeads = [];
    for (let i = 0; i < 12; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 80 + Math.random() * 150;
      game.shatterBeads.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 50, r: 2 + Math.random() * 4, life: 1.5 });
    }
  }, []);

  // --- INIT ---
  const initGame = useCallback(() => {
    const game = g.current;
    game.mercury = { x: game.W / 2, y: 150, r: 14, vy: 0, vx: 0, onSurface: false, glowIntensity: 0 };
    game.layers = [];
    game.particles = [];
    game.shatterBeads = [];
    game.score = 0; game.combo = 0; game.maxCombo = 0; game.depth = 0;
    game.cameraY = 0; game.gameTime = 0; game.deadTimer = 0;
    game.squash = { timer: 0, scaleX: 1, scaleY: 1 };
    game.screenShake = { timer: 0, intensity: 0 };
    game.comboFlash = 0; game.isDragging = false;
    game.tutorialStep = -1; game.tutorialPhase = 'instruction';
    game.tutorialTimer = 0; game.tutorialPassCount = 0;
    stopDrone();
    for (let i = 0; i < 30; i++) game.layers.push(createLayer(i));
  }, [stopDrone]);

  const startGame = useCallback(() => {
    initGame(); initAudio(); startDrone();
    g.current.phase = 'playing'; g.current.running = true;
    setGameState('playing'); setShowShareModal(false); setProgression(null);
  }, [initGame, initAudio, startDrone]);

  const startTutorial = useCallback(() => {
    const game = g.current;
    initGame(); initAudio(); startDrone();
    game.phase = 'tutorial'; game.tutorialStep = 0;
    game.tutorialPhase = 'instruction'; game.tutorialTimer = 0;
    game.tutorialPassCount = 0; game.layers = []; game.particles = [];
    TUTORIAL_STEPS[0].setup(game.W, game.layers, game.mercury);
    game.running = true;
    setGameState('tutorial');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initGame, initAudio, startDrone]);

  // --- GAME LOOP ---
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;

    function resize() {
      canvas!.width = window.innerWidth; canvas!.height = window.innerHeight;
      g.current.W = canvas!.width; g.current.H = canvas!.height;
    }
    resize(); window.addEventListener('resize', resize);

    // Input
    const handleTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      const game = g.current;
      game.isDragging = true; game.dragStartX = e.touches[0].clientX;
      initAudio();
    };
    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      const game = g.current;
      if (!game.isDragging || (game.phase !== 'playing' && !(game.phase === 'tutorial' && game.tutorialPhase === 'playing'))) return;
      const dx = (e.touches[0].clientX - game.dragStartX) / (game.W * 0.3);
      const active = getActiveLayer(game);
      if (active) {
        active.rotation += dx;
        if (active.rotation > 1) active.rotation -= 1;
        if (active.rotation < 0) active.rotation += 1;
      }
      game.dragStartX = e.touches[0].clientX;
    };
    const handleTouchEnd = (e: TouchEvent) => { e.preventDefault(); g.current.isDragging = false; };
    const handleMouseDown = (e: MouseEvent) => {
      g.current.isDragging = true; g.current.dragStartX = e.clientX; initAudio();
    };
    const handleMouseMove = (e: MouseEvent) => {
      const game = g.current;
      if (!game.isDragging || (game.phase !== 'playing' && !(game.phase === 'tutorial' && game.tutorialPhase === 'playing'))) return;
      const dx = (e.clientX - game.dragStartX) / (game.W * 0.3);
      const active = getActiveLayer(game);
      if (active) {
        active.rotation += dx;
        if (active.rotation > 1) active.rotation -= 1;
        if (active.rotation < 0) active.rotation += 1;
      }
      game.dragStartX = e.clientX;
    };
    const handleMouseUp = () => { g.current.isDragging = false; };

    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd, { passive: false });
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);

    function getActiveLayer(game: typeof g.current): Layer | null {
      for (const l of game.layers) {
        const ly = getLayerWorldY(l);
        if (ly > game.mercury.y && !l.passed) return l;
      }
      return null;
    }

    function getGravity(game: typeof g.current): number {
      if (game.phase === 'tutorial') return 200;
      return 300 + game.depth * 8;
    }

    function checkGap(l: Layer, mx: number): boolean {
      const gapLeft = ((l.gapCenter - l.gapSize / 2 + l.rotation) % 1 + 1) % 1;
      const gapRight = ((l.gapCenter + l.gapSize / 2 + l.rotation) % 1 + 1) % 1;
      if (l.gapSize === 0) return false;
      if (gapLeft < gapRight) return mx > gapLeft && mx < gapRight;
      return mx > gapLeft || mx < gapRight;
    }

    let lastTime = performance.now();
    let animId: number;

    function update(dt: number) {
      const game = g.current;
      if (game.phase === 'tutorial') { updateTutorial(dt); return; }
      if (game.phase === 'dead') {
        game.deadTimer += dt;
        for (const b of game.shatterBeads) { b.x += b.vx * dt; b.y += b.vy * dt; b.vy += 200 * dt; b.life -= dt; }
        if (game.deadTimer >= 2.0) {
          game.phase = 'over';
          setScore(game.score); setFinalDepth(game.depth); setFinalMaxCombo(game.maxCombo);
          setGameState('gameover');
          if (game.score >= 1) {
            fetch('/api/pixelpit/stats', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ game: GAME_ID }) }).catch(() => {});
          }
        }
        return;
      }
      if (game.phase !== 'playing') return;

      game.gameTime += dt;
      const gravity = getGravity(game);
      game.mercury.vy += gravity * dt;

      // Magnets
      for (const l of game.layers) {
        if (!l.isMagnetic || l.passed) continue;
        const ly = getLayerWorldY(l);
        const dist = Math.abs(game.mercury.y - ly);
        if (dist < LAYER_SPACING * 0.8) {
          const strength = 120 * (1 - dist / (LAYER_SPACING * 0.8));
          game.mercury.vx += l.magnetDir * strength * dt;
          if (dist < LAYER_SPACING * 0.5 && Math.random() < 0.05) playMagnetHum();
        }
      }

      game.mercury.y += game.mercury.vy * dt;
      game.mercury.x += game.mercury.vx * dt;
      game.mercury.vx *= 0.95;
      game.mercury.x = Math.max(game.mercury.r, Math.min(game.W - game.mercury.r, game.mercury.x));

      // Layer collisions
      for (const l of game.layers) {
        if (l.passed) continue;
        const ly = getLayerWorldY(l);
        if (game.mercury.y + game.mercury.r < ly || game.mercury.y - game.mercury.r > ly + LAYER_HEIGHT) continue;
        if (game.mercury.vy <= 0) continue;

        if (checkGap(l, game.mercury.x / game.W)) {
          l.passed = true; game.depth++; game.combo++;
          if (game.combo > game.maxCombo) game.maxCombo = game.combo;
          const mult = getComboMultiplier(game.combo);
          game.score += mult;
          playPing(game.depth);
          if (game.combo >= 3) { playCombo(game.combo); game.comboFlash = 0.2; }
          spawnParticles(game.mercury.x, ly, T.slime, 8);
          game.mercury.glowIntensity = Math.min(game.combo * 3, 20);
        } else {
          if (l.isBlack) {
            game.phase = 'dead'; game.deadTimer = 0;
            spawnShatter(game.mercury.x, game.mercury.y);
            playShatter(); stopDrone();
            game.screenShake = { timer: 0.2, intensity: 5 };
            return;
          }
          game.mercury.y = ly - game.mercury.r;
          game.mercury.vy = -game.mercury.vy * 0.4;
          if (Math.abs(game.mercury.vy) < 20) game.mercury.vy = 0;
          game.combo = 0; game.mercury.glowIntensity = Math.max(0, game.mercury.glowIntensity - 5);
          game.squash = { timer: 0.15, scaleX: 1.3, scaleY: 0.7 };
          game.screenShake = { timer: 0.08, intensity: 1 };
        }
      }

      // Squash
      if (game.squash.timer > 0) {
        game.squash.timer -= dt;
        const t = game.squash.timer / 0.15;
        game.squash.scaleX = 1 + 0.3 * t; game.squash.scaleY = 1 - 0.3 * t;
      } else { game.squash.scaleX = 1; game.squash.scaleY = 1; }

      // Camera
      const targetCam = game.mercury.y - game.H * 0.35;
      game.cameraY += (targetCam - game.cameraY) * 3 * dt;

      // Generate/cull layers
      const last = game.layers[game.layers.length - 1];
      if (last && getLayerWorldY(last) - game.cameraY < game.H + 200) {
        game.layers.push(createLayer(last.index + 1));
      }
      while (game.layers.length > 0 && getLayerWorldY(game.layers[0]) < game.cameraY - 200) {
        game.layers.shift();
      }

      if (game.screenShake.timer > 0) game.screenShake.timer -= dt;
      if (game.comboFlash > 0) game.comboFlash -= dt;

      for (let i = game.particles.length - 1; i >= 0; i--) {
        const p = game.particles[i]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt;
        if (p.life <= 0) game.particles.splice(i, 1);
      }

      if (game.droneGain) game.droneGain.gain.value = 0.04 + Math.min(game.depth * 0.002, 0.1);
    }

    function updateTutorial(dt: number) {
      const game = g.current;
      if (game.tutorialStep < 0 || game.tutorialStep >= TUTORIAL_STEPS.length) return;
      const step = TUTORIAL_STEPS[game.tutorialStep];
      game.gameTime += dt;

      if (game.tutorialPhase === 'instruction') {
        game.tutorialTimer += dt;
        if (game.tutorialTimer >= 1.2) { game.tutorialPhase = 'playing'; game.tutorialTimer = 0; }
        return;
      }

      if (game.tutorialPhase === 'success') {
        game.tutorialTimer += dt;
        const delay = game.tutorialStep === TUTORIAL_STEPS.length - 1 ? 1.0 : 0.6;
        if (game.tutorialTimer >= delay) {
          game.tutorialStep++;
          if (game.tutorialStep >= TUTORIAL_STEPS.length) {
            initGame(); initAudio(); startDrone();
            game.phase = 'playing'; setGameState('playing');
            return;
          }
          game.tutorialPhase = 'instruction'; game.tutorialTimer = 0;
          game.tutorialPassCount = 0; game.layers = []; game.particles = []; game.combo = 0;
          game.depth = 0; game.cameraY = 0;
          TUTORIAL_STEPS[game.tutorialStep].setup(game.W, game.layers, game.mercury);
        }
        return;
      }

      // Playing phase
      const gravity = 200;
      game.mercury.vy += gravity * dt;

      for (const l of game.layers) {
        if (!l.isMagnetic || l.passed) continue;
        const ly = getLayerWorldY(l);
        const dist = Math.abs(game.mercury.y - ly);
        if (dist < LAYER_SPACING * 0.8) {
          const strength = 120 * (1 - dist / (LAYER_SPACING * 0.8));
          game.mercury.vx += l.magnetDir * strength * dt;
          if (dist < LAYER_SPACING * 0.5 && Math.random() < 0.05) playMagnetHum();
        }
      }

      game.mercury.y += game.mercury.vy * dt;
      game.mercury.x += game.mercury.vx * dt;
      game.mercury.vx *= 0.95;
      game.mercury.x = Math.max(game.mercury.r, Math.min(game.W - game.mercury.r, game.mercury.x));

      for (const l of game.layers) {
        if (l.passed) continue;
        const ly = getLayerWorldY(l);
        if (game.mercury.y + game.mercury.r < ly || game.mercury.y - game.mercury.r > ly + LAYER_HEIGHT) continue;
        if (game.mercury.vy <= 0) continue;

        if (checkGap(l, game.mercury.x / game.W)) {
          l.passed = true; game.depth++; game.combo++; game.tutorialPassCount++;
          playPing(game.depth);
          spawnParticles(game.mercury.x, ly, T.slime, 8);
          game.mercury.glowIntensity = Math.min(game.combo * 3, 20);
          if (game.combo >= 3) { playCombo(game.combo); game.comboFlash = 0.2; }
        } else {
          game.mercury.y = ly - game.mercury.r;
          game.mercury.vy = -game.mercury.vy * 0.4;
          if (Math.abs(game.mercury.vy) < 20) game.mercury.vy = 0;
          game.combo = 0; game.mercury.glowIntensity = 0;
          game.squash = { timer: 0.15, scaleX: 1.3, scaleY: 0.7 };
          game.screenShake = { timer: 0.08, intensity: 1 };
        }
      }

      if (game.squash.timer > 0) {
        game.squash.timer -= dt;
        const t = game.squash.timer / 0.15;
        game.squash.scaleX = 1 + 0.3 * t; game.squash.scaleY = 1 - 0.3 * t;
      } else { game.squash.scaleX = 1; game.squash.scaleY = 1; }

      const targetCam = game.mercury.y - game.H * 0.35;
      game.cameraY += (targetCam - game.cameraY) * 3 * dt;

      if (game.screenShake.timer > 0) game.screenShake.timer -= dt;
      if (game.comboFlash > 0) game.comboFlash -= dt;

      for (let i = game.particles.length - 1; i >= 0; i--) {
        const p = game.particles[i]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt;
        if (p.life <= 0) game.particles.splice(i, 1);
      }

      if (step.check(game.combo, game.tutorialPassCount)) {
        game.tutorialPhase = 'success'; game.tutorialTimer = 0; playLevelUp();
      }
    }

    function drawLayersAndMercury() {
      const game = g.current;
      const W = game.W;
      const active = getActiveLayer(game);

      for (const l of game.layers) {
        const ly = getLayerWorldY(l) - game.cameraY;
        if (ly < -20 || ly > game.H + 20) continue;
        if (l.passed) ctx!.globalAlpha = 0.15;

        const gapLeft = ((l.gapCenter - l.gapSize / 2 + l.rotation) % 1 + 1) % 1;
        const gapRight = ((l.gapCenter + l.gapSize / 2 + l.rotation) % 1 + 1) % 1;

        let barColor = l.color;
        if (active === l && !l.passed) {
          if (l.color === T.cyan) barColor = '#44e8ff';
          else if (l.color === T.fuchsia) barColor = '#e06af5';
        }

        ctx!.fillStyle = barColor;
        if (l.isMagnetic && !l.passed) {
          const pulse = 0.6 + Math.sin(game.gameTime * 4) * 0.4;
          ctx!.globalAlpha = l.passed ? 0.15 : pulse;
        }

        if (l.gapSize === 0) {
          ctx!.fillRect(0, ly, W, LAYER_HEIGHT);
        } else if (gapLeft < gapRight) {
          ctx!.fillRect(0, ly, gapLeft * W, LAYER_HEIGHT);
          ctx!.fillRect(gapRight * W, ly, W - gapRight * W, LAYER_HEIGHT);
          if (!l.passed) {
            const gapAlpha = active === l ? (0.2 + Math.sin(game.gameTime * 6) * 0.1) : 0.25;
            ctx!.fillStyle = T.slime; ctx!.globalAlpha = gapAlpha;
            ctx!.shadowBlur = 6; ctx!.shadowColor = T.slime;
            ctx!.fillRect(gapLeft * W, ly, (gapRight - gapLeft) * W, LAYER_HEIGHT);
            ctx!.shadowBlur = 0;
          }
        } else {
          ctx!.fillRect(gapRight * W, ly, (gapLeft - gapRight) * W, LAYER_HEIGHT);
          if (!l.passed) {
            const gapAlpha = active === l ? (0.2 + Math.sin(game.gameTime * 6) * 0.1) : 0.25;
            ctx!.fillStyle = T.slime; ctx!.globalAlpha = gapAlpha;
            ctx!.shadowBlur = 6; ctx!.shadowColor = T.slime;
            ctx!.fillRect(0, ly, gapRight * W, LAYER_HEIGHT);
            ctx!.fillRect(gapLeft * W, ly, W - gapLeft * W, LAYER_HEIGHT);
            ctx!.shadowBlur = 0;
          }
        }
        ctx!.globalAlpha = 1;
      }

      // Particles
      for (const p of game.particles) {
        const py = p.y - game.cameraY;
        ctx!.globalAlpha = p.life / p.maxLife; ctx!.fillStyle = p.color;
        ctx!.beginPath(); ctx!.arc(p.x, py, p.r * (p.life / p.maxLife), 0, Math.PI * 2); ctx!.fill();
      }
      ctx!.globalAlpha = 1;

      // Mercury
      const my = game.mercury.y - game.cameraY;
      const glow = game.mercury.glowIntensity;
      ctx!.save(); ctx!.translate(game.mercury.x, my);
      ctx!.scale(game.squash.scaleX, game.squash.scaleY);
      if (glow > 0) { ctx!.shadowBlur = glow; ctx!.shadowColor = glow > 12 ? T.text : T.mercury; }
      ctx!.fillStyle = glow > 15 ? T.text : T.mercury;
      ctx!.beginPath(); ctx!.arc(0, 0, game.mercury.r, 0, Math.PI * 2); ctx!.fill();
      ctx!.shadowBlur = 0;
      ctx!.fillStyle = 'rgba(255,255,255,0.5)';
      ctx!.beginPath(); ctx!.arc(-game.mercury.r * 0.3, -game.mercury.r * 0.3, game.mercury.r * 0.35, 0, Math.PI * 2); ctx!.fill();
      ctx!.restore();
    }

    function draw() {
      const game = g.current;
      const W = game.W, H = game.H;
      if (game.phase === 'start' || game.phase === 'over') return;

      // Background
      const redAmount = Math.min(game.depth / 50, 1);
      if (redAmount > 0) {
        const r = Math.round(10 + redAmount * 20), gv = Math.round(10 - redAmount * 5), b = Math.round(10 - redAmount * 5);
        ctx!.fillStyle = `rgb(${r},${gv},${b})`;
      } else {
        ctx!.fillStyle = T.bg;
      }
      ctx!.fillRect(0, 0, W, H);

      ctx!.save();
      if (game.screenShake.timer > 0) {
        const s = game.screenShake.intensity * (game.screenShake.timer / 0.2);
        ctx!.translate((Math.random() * 2 - 1) * s, (Math.random() * 2 - 1) * s);
      }

      drawLayersAndMercury();

      // Shatter beads
      if (game.phase === 'dead') {
        for (const b of game.shatterBeads) {
          if (b.life <= 0) continue;
          const by = b.y - game.cameraY;
          ctx!.globalAlpha = b.life / 1.5; ctx!.fillStyle = T.mercury;
          ctx!.beginPath(); ctx!.arc(b.x, by, b.r, 0, Math.PI * 2); ctx!.fill();
        }
        ctx!.globalAlpha = 1;
      }
      ctx!.restore();

      // HUD
      if (game.phase === 'playing') {
        ctx!.fillStyle = T.text; ctx!.font = 'bold 28px monospace'; ctx!.textAlign = 'left';
        ctx!.fillText(game.score + '', 16, 40);
        ctx!.font = '14px monospace'; ctx!.fillStyle = T.grey;
        ctx!.fillText('depth ' + game.depth, 16, 60);
        if (game.combo >= 3) {
          ctx!.fillStyle = T.slime; ctx!.font = 'bold 20px monospace'; ctx!.textAlign = 'center';
          ctx!.fillText(getComboMultiplier(game.combo) + 'x', W / 2, 40);
        }
        if (game.comboFlash > 0) {
          ctx!.strokeStyle = T.slime; ctx!.lineWidth = 2;
          ctx!.globalAlpha = game.comboFlash / 0.2;
          ctx!.strokeRect(2, 2, W - 4, H - 4); ctx!.globalAlpha = 1;
        }
      }

      // Tutorial HUD
      if (game.phase === 'tutorial' && game.tutorialStep >= 0 && game.tutorialStep < TUTORIAL_STEPS.length) {
        const step = TUTORIAL_STEPS[game.tutorialStep];
        ctx!.fillStyle = 'rgba(255,255,255,0.4)'; ctx!.font = '14px monospace'; ctx!.textAlign = 'left';
        ctx!.fillText((game.tutorialStep + 1) + '/' + TUTORIAL_STEPS.length, 16, 30);
        if (game.tutorialPhase === 'instruction' || game.tutorialPhase === 'playing') {
          ctx!.fillStyle = T.text; ctx!.font = 'bold 22px monospace'; ctx!.textAlign = 'center';
          ctx!.fillText(step.instruction, W / 2, 50);
        }
        if (game.combo >= 3) {
          ctx!.fillStyle = T.slime; ctx!.font = 'bold 20px monospace'; ctx!.textAlign = 'center';
          ctx!.fillText(getComboMultiplier(game.combo) + 'x', W / 2, 80);
        }
        if (game.comboFlash > 0) {
          ctx!.strokeStyle = T.slime; ctx!.lineWidth = 2;
          ctx!.globalAlpha = game.comboFlash / 0.2;
          ctx!.strokeRect(2, 2, W - 4, H - 4); ctx!.globalAlpha = 1;
        }
        if (game.tutorialPhase === 'success') {
          ctx!.fillStyle = T.slime; ctx!.font = 'bold 36px monospace'; ctx!.textAlign = 'center';
          ctx!.shadowBlur = 12; ctx!.shadowColor = T.slime;
          ctx!.fillText(step.successText, W / 2, H / 2 - 20); ctx!.shadowBlur = 0;
        }
        ctx!.fillStyle = 'rgba(255,255,255,0.3)'; ctx!.font = '14px monospace'; ctx!.textAlign = 'right';
        ctx!.fillText('SKIP >', W - 16, 30);
      }

      // Dead overlay
      if (game.phase === 'dead') {
        const t = Math.min(game.deadTimer / 1.5, 1);
        ctx!.fillStyle = `rgba(0,0,0,${t * 0.6})`; ctx!.fillRect(0, 0, W, H);
        ctx!.fillStyle = T.text; ctx!.font = 'bold 32px monospace'; ctx!.textAlign = 'center';
        ctx!.fillText('SHATTERED', W / 2, H / 2 - 10);
      }

      ctx!.textAlign = 'left';
    }

    function loop(ts: number) {
      const dt = Math.min((ts - lastTime) / 1000, 0.05);
      lastTime = ts;
      if (g.current.running) { update(dt); draw(); }
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
      stopDrone();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initAudio, initGame, playPing, playCombo, playShatter, playMagnetHum, playLevelUp, spawnParticles, spawnShatter, startDrone, stopDrone]);

  const skipTutorial = useCallback(() => {
    initGame(); initAudio(); startDrone();
    g.current.phase = 'playing'; g.current.running = true;
    setGameState('playing');
  }, [initGame, initAudio, startDrone]);

  return (
    <>
      <Script src="/pixelpit/social.js" strategy="lazyOnload" onLoad={() => setSocialLoaded(true)} />
      <canvas
        ref={canvasRef}
        style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', display: 'block', background: T.bg, touchAction: 'none' }}
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
            {/* Mercury ball */}
            <div style={{
              width: 36, height: 36, borderRadius: 9999, background: T.mercury,
              boxShadow: '0 0 20px rgba(232,232,240,0.4)',
              margin: '0 auto 20px',
            }} />
            <h1 style={{
              fontFamily: 'ui-monospace, monospace', fontSize: 64, fontWeight: 300,
              color: COLORS.primary, marginBottom: 20, letterSpacing: 8,
              textShadow: '0 0 40px rgba(163,230,53,0.4)',
            }}>SIFT</h1>
            <p style={{
              fontSize: 14, fontFamily: 'ui-monospace, monospace', color: COLORS.secondary,
              marginBottom: 35, lineHeight: 1.8, letterSpacing: 2,
            }}>
              drag to rotate layers<br />let the mercury fall through<br />chain drops for combos
            </p>
            <button onClick={startGame} style={{
              background: COLORS.primary, color: COLORS.bg, border: 'none',
              padding: '16px 50px', fontSize: 16, fontFamily: 'ui-monospace, monospace',
              fontWeight: 600, cursor: 'pointer', borderRadius: 8, letterSpacing: 2,
              boxShadow: '0 8px 30px rgba(163,230,53,0.3)',
            }}>play</button>
            <div style={{ marginTop: 16 }}>
              <button onClick={startTutorial} style={{
                background: 'transparent', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 6, color: COLORS.muted, padding: '10px 30px',
                fontSize: 12, fontFamily: 'ui-monospace, monospace', cursor: 'pointer', letterSpacing: 2,
              }}>tutorial</button>
            </div>
          </div>
          <div style={{ marginTop: 30, fontSize: 12, fontFamily: 'ui-monospace, monospace', letterSpacing: 3 }}>
            <span style={{ color: COLORS.primary }}>pixel</span>
            <span style={{ color: COLORS.secondary }}>pit</span>
            <span style={{ color: COLORS.text, opacity: 0.4 }}> arcade</span>
          </div>
        </div>
      )}

      {/* Tutorial Skip */}
      {gameState === 'tutorial' && (
        <button onClick={skipTutorial} style={{
          position: 'fixed', top: 12, right: 16, zIndex: 50,
          background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.3)',
          fontSize: 14, fontFamily: 'ui-monospace, monospace', cursor: 'pointer', padding: '8px 12px',
        }}>SKIP &gt;</button>
      )}

      {/* Game Over */}
      {gameState === 'gameover' && (
        <div style={{
          position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', background: COLORS.bg,
          zIndex: 100, textAlign: 'center', padding: 40,
        }}>
          <h1 style={{
            fontFamily: 'ui-monospace, monospace', fontSize: 28, fontWeight: 300,
            color: COLORS.secondary, marginBottom: 15, letterSpacing: 6,
          }}>shattered</h1>
          <div style={{
            fontFamily: 'ui-monospace, monospace', fontSize: 80, fontWeight: 200,
            color: COLORS.primary, marginBottom: 10,
            textShadow: '0 0 40px rgba(163,230,53,0.4)',
          }}>{score}</div>
          <div style={{
            fontFamily: 'ui-monospace, monospace', fontSize: 14, color: COLORS.muted, marginBottom: 30,
          }}>depth: {finalDepth} · max combo: {finalMaxCombo}x</div>

          <ScoreFlow
            score={score} gameId={GAME_ID} colors={SCORE_FLOW_COLORS} maxScore={200}
            onRankReceived={(rank, entryId) => { setSubmittedEntryId(entryId ?? null); }}
            onProgression={(prog) => setProgression(prog)}
          />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 15, alignItems: 'center' }}>
            <button onClick={startGame} style={{
              background: COLORS.primary, color: COLORS.bg, border: 'none',
              borderRadius: 8, padding: '16px 50px', fontSize: 15,
              fontFamily: 'ui-monospace, monospace', fontWeight: 600, cursor: 'pointer',
              boxShadow: '0 8px 25px rgba(163,230,53,0.3)', letterSpacing: 2,
            }}>play again</button>
            <button onClick={() => setGameState('leaderboard')} style={{
              background: 'transparent', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 6, color: COLORS.muted, padding: '14px 35px', fontSize: 11,
              fontFamily: 'ui-monospace, monospace', cursor: 'pointer', letterSpacing: 2,
            }}>leaderboard</button>
            {user ? (
              <button onClick={() => setShowShareModal(true)} style={{
                background: 'transparent', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 6, color: COLORS.muted, padding: '14px 35px', fontSize: 11,
                fontFamily: 'ui-monospace, monospace', cursor: 'pointer', letterSpacing: 2,
              }}>share / groups</button>
            ) : (
              <ShareButtonContainer
                id="share-btn-container"
                url={typeof window !== 'undefined' ? `${window.location.origin}/pixelpit/arcade/sift/share/${score}` : ''}
                text={`I scored ${score} on SIFT! Can you beat me?`}
                style="minimal" socialLoaded={socialLoaded}
              />
            )}
          </div>
        </div>
      )}

      {/* Leaderboard */}
      {gameState === 'leaderboard' && (
        <Leaderboard
          gameId={GAME_ID} limit={8} entryId={submittedEntryId ?? undefined}
          colors={LEADERBOARD_COLORS} onClose={() => setGameState('gameover')}
          groupsEnabled={true} gameUrl={GAME_URL} socialLoaded={socialLoaded}
        />
      )}

      {/* Share Modal */}
      {showShareModal && user && (
        <ShareModal
          gameUrl={GAME_URL} score={score} colors={LEADERBOARD_COLORS}
          onClose={() => setShowShareModal(false)}
        />
      )}
    </>
  );
}
