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

const T = {
  bg: '#000000',
  amber: '#D4A574',
  gold: '#FFD700',
  teal: '#2D9596',
  violet: '#7B68EE',
  pink: '#FF69B4',
  text: '#FFD700',
  muted: '#888888',
  danger: '#FF6B6B',
};

const COLORS = {
  bg: '#000000', surface: '#18181b', primary: '#FFD700', secondary: '#2D9596',
  text: '#ffffff', muted: '#71717a', error: '#ef4444',
};

const SCORE_FLOW_COLORS: ScoreFlowColors = {
  bg: COLORS.bg, surface: COLORS.surface, primary: COLORS.primary,
  secondary: COLORS.secondary, text: COLORS.text, muted: COLORS.muted, error: COLORS.error,
};
const LEADERBOARD_COLORS: LeaderboardColors = {
  bg: COLORS.bg, surface: COLORS.surface, primary: COLORS.primary,
  secondary: COLORS.secondary, text: COLORS.text, muted: COLORS.muted,
};

const GAME_ID = 'shine';
const BPM = 110;
const BEAT_SEC = 60 / BPM;

// Each gem type maps to a different instrument sound
interface GemType { color: string; points: number; name: string; instrument: 'hihat' | 'snare' | 'bass' | 'bell' | 'stab'; }
interface Gem { x: number; y: number; type: GemType; radius: number; age: number; maxLife: number; pulse: number; alive: boolean; spawnTime: number; beatSubdiv: number; }
interface Particle { x: number; y: number; vx: number; vy: number; life: number; color: string; size: number; }
interface FloatingText { x: number; y: number; text: string; color: string; life: number; vy: number; }

const gemTypes: GemType[] = [
  { color: T.amber, points: 1, name: 'amber', instrument: 'hihat' },
  { color: T.gold, points: 2, name: 'gold', instrument: 'snare' },
  { color: T.teal, points: 3, name: 'teal', instrument: 'bass' },
  { color: T.violet, points: 5, name: 'violet', instrument: 'bell' },
  { color: T.pink, points: 10, name: 'pink', instrument: 'stab' },
];

function selectGemType(): GemType {
  const r = Math.random();
  if (r < 0.35) return gemTypes[0];
  if (r < 0.60) return gemTypes[1];
  if (r < 0.80) return gemTypes[2];
  if (r < 0.93) return gemTypes[3];
  return gemTypes[4];
}

function getComboMultiplier(c: number): number {
  if (c >= 8) return 2.0;
  if (c >= 5) return 1.5;
  if (c >= 3) return 1.2;
  return 1.0;
}

export default function ShineGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<'start' | 'playing' | 'gameover' | 'leaderboard'>('start');
  const [score, setScore] = useState(0);
  const [finalCollected, setFinalCollected] = useState(0);
  const [finalMaxCombo, setFinalMaxCombo] = useState(0);
  const [socialLoaded, setSocialLoaded] = useState(false);
  const [submittedEntryId, setSubmittedEntryId] = useState<number | null>(null);
  const [progression, setProgression] = useState<ProgressionResult | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);

  const { user } = usePixelpitSocial(socialLoaded);
  const GAME_URL = typeof window !== 'undefined' ? `${window.location.origin}/pixelpit/arcade/shine` : 'https://pixelpit.gg/pixelpit/arcade/shine';

  useEffect(() => {
    if (!socialLoaded || typeof window === 'undefined' || !window.PixelpitSocial) return;
    const params = new URLSearchParams(window.location.search);
    if (params.has('logout')) {
      window.PixelpitSocial.logout(); params.delete('logout');
      const newUrl = params.toString() ? `${window.location.pathname}?${params.toString()}` : window.location.pathname;
      window.history.replaceState({}, '', newUrl); window.location.reload(); return;
    }
    const groupCode = window.PixelpitSocial.getGroupCodeFromUrl();
    if (groupCode) window.PixelpitSocial.storeGroupCode(groupCode);
  }, [socialLoaded]);

  const g = useRef({
    gems: [] as Gem[], particles: [] as Particle[], floatingTexts: [] as FloatingText[],
    score: 0, collected: 0, timeLeft: 30, gameTime: 0,
    combo: 0, comboTimer: 0, comboMultiplier: 1, maxCombo: 0,
    phase: 'start' as 'start' | 'playing' | 'over' | 'tutorial',
    screenShake: { timer: 0, intensity: 0 },
    hitFreeze: 0, missDarken: 0,
    comboBreakFlash: { timer: 0, scale: 1, text: '', mult: 1 },
    timerFlash: 0, safeTop: 0,
    beatPulse: 0, // visual pulse on quarter notes
    currentPhase: 1 as 1 | 2 | 3,
    phaseName: 'QUARTER NOTES' as string,
    // tutorial state
    tutStep: 0, tutGems: [] as Gem[], tutCollected: 0, tutCombo: 0,
    tutSuccess: false, tutSuccessTimer: 0, tutMissShown: false,
    tutTimeLeft: 0, spawnTimer: 0,
    // audio
    audioCtx: null as AudioContext | null,
    masterGain: null as GainNode | null,
    // beat clock
    beatStartTime: 0, // audioContext.currentTime when game started
    lastScheduledBeat: -1, // last beat subdivision index scheduled
    running: false, W: 0, H: 0,
  });

  const initAudio = useCallback(() => {
    const game = g.current;
    if (!game.audioCtx) game.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    if (game.audioCtx.state === 'suspended') game.audioCtx.resume();
  }, []);

  // --- INSTRUMENT SOUNDS ---
  const playKick = useCallback((time: number) => {
    const ctx = g.current.audioCtx; if (!ctx) return;
    const dest = g.current.masterGain || ctx.destination;
    const osc = ctx.createOscillator(); const gn = ctx.createGain();
    osc.connect(gn); gn.connect(dest);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, time);
    osc.frequency.exponentialRampToValueAtTime(40, time + 0.12);
    gn.gain.setValueAtTime(0.35, time);
    gn.gain.exponentialRampToValueAtTime(0.001, time + 0.25);
    osc.start(time); osc.stop(time + 0.25);
    // click layer
    const osc2 = ctx.createOscillator(); const gn2 = ctx.createGain();
    osc2.connect(gn2); gn2.connect(dest);
    osc2.type = 'triangle'; osc2.frequency.value = 80;
    gn2.gain.setValueAtTime(0.2, time);
    gn2.gain.exponentialRampToValueAtTime(0.001, time + 0.08);
    osc2.start(time); osc2.stop(time + 0.08);
  }, []);

  const playInstrument = useCallback((instrument: string, perfect: boolean) => {
    const ctx = g.current.audioCtx; if (!ctx) return;
    const dest = g.current.masterGain || ctx.destination;
    const now = ctx.currentTime;
    const vol = perfect ? 0.2 : 0.08;

    switch (instrument) {
      case 'hihat': {
        // Noise-like hi-hat using high-freq square
        const osc = ctx.createOscillator(); const gn = ctx.createGain();
        const filt = ctx.createBiquadFilter();
        osc.type = 'square'; osc.frequency.value = 6000 + Math.random() * 2000;
        filt.type = 'highpass'; filt.frequency.value = 7000;
        osc.connect(filt); filt.connect(gn); gn.connect(dest);
        gn.gain.setValueAtTime(vol, now);
        gn.gain.exponentialRampToValueAtTime(0.001, now + (perfect ? 0.08 : 0.04));
        osc.start(now); osc.stop(now + 0.1);
        break;
      }
      case 'snare': {
        // Snare: noise burst + body
        const osc = ctx.createOscillator(); const gn = ctx.createGain();
        osc.type = 'triangle'; osc.frequency.value = 200;
        osc.connect(gn); gn.connect(dest);
        gn.gain.setValueAtTime(vol * 1.2, now);
        gn.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        osc.start(now); osc.stop(now + 0.15);
        // noise layer
        const osc2 = ctx.createOscillator(); const gn2 = ctx.createGain();
        const filt = ctx.createBiquadFilter();
        osc2.type = 'square'; osc2.frequency.value = 4000 + Math.random() * 3000;
        filt.type = 'bandpass'; filt.frequency.value = 5000; filt.Q.value = 0.5;
        osc2.connect(filt); filt.connect(gn2); gn2.connect(dest);
        gn2.gain.setValueAtTime(vol * 0.8, now);
        gn2.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        osc2.start(now); osc2.stop(now + 0.1);
        break;
      }
      case 'bass': {
        // Synth bass
        const osc = ctx.createOscillator(); const gn = ctx.createGain();
        osc.type = 'sawtooth';
        const notes = [55, 65.4, 73.4, 82.4];
        osc.frequency.value = notes[Math.floor(Math.random() * notes.length)];
        const filt = ctx.createBiquadFilter();
        filt.type = 'lowpass'; filt.frequency.value = perfect ? 600 : 300;
        osc.connect(filt); filt.connect(gn); gn.connect(dest);
        gn.gain.setValueAtTime(vol * 1.5, now);
        gn.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        osc.start(now); osc.stop(now + 0.2);
        break;
      }
      case 'bell': {
        // Bell / metallic
        const freqs = [880, 1108, 1320];
        freqs.forEach((f, i) => {
          const osc = ctx.createOscillator(); const gn = ctx.createGain();
          osc.type = 'sine'; osc.frequency.value = f;
          osc.connect(gn); gn.connect(dest);
          gn.gain.setValueAtTime(vol * 0.7, now + i * 0.01);
          gn.gain.exponentialRampToValueAtTime(0.001, now + (perfect ? 0.4 : 0.15));
          osc.start(now + i * 0.01); osc.stop(now + 0.5);
        });
        break;
      }
      case 'stab': {
        // Chord stab
        const root = [220, 247, 262, 294][Math.floor(Math.random() * 4)];
        [root, root * 1.25, root * 1.5].forEach((f, i) => {
          const osc = ctx.createOscillator(); const gn = ctx.createGain();
          osc.type = perfect ? 'sawtooth' : 'triangle'; osc.frequency.value = f;
          const filt = ctx.createBiquadFilter();
          filt.type = 'lowpass'; filt.frequency.value = perfect ? 2000 : 800;
          osc.connect(filt); filt.connect(gn); gn.connect(dest);
          gn.gain.setValueAtTime(vol * 0.6, now + i * 0.01);
          gn.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
          osc.start(now + i * 0.01); osc.stop(now + 0.3);
        });
        break;
      }
    }
  }, []);

  const playMissThud = useCallback(() => {
    const ctx = g.current.audioCtx; if (!ctx) return;
    const osc = ctx.createOscillator(); const gn = ctx.createGain();
    osc.connect(gn); gn.connect(ctx.destination); osc.type = 'sine';
    osc.frequency.setValueAtTime(80, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.15);
    gn.gain.setValueAtTime(0.2, ctx.currentTime);
    gn.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
    osc.start(); osc.stop(ctx.currentTime + 0.2);
  }, []);

  const playComboBreak = useCallback(() => {
    const ctx = g.current.audioCtx; if (!ctx) return;
    const osc = ctx.createOscillator(); const gn = ctx.createGain();
    osc.connect(gn); gn.connect(ctx.destination); osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(400, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(120, ctx.currentTime + 0.2);
    gn.gain.setValueAtTime(0.1, ctx.currentTime);
    gn.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
    osc.start(); osc.stop(ctx.currentTime + 0.25);
  }, []);

  const playCollect = useCallback((freq: number) => {
    const ctx = g.current.audioCtx; if (!ctx) return;
    const osc = ctx.createOscillator(); const gn = ctx.createGain();
    osc.connect(gn); gn.connect(ctx.destination); osc.type = 'sine'; osc.frequency.value = freq;
    gn.gain.setValueAtTime(0.15, ctx.currentTime);
    gn.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    osc.start(); osc.stop(ctx.currentTime + 0.15);
  }, []);

  const playSound = useCallback((freq: number, duration: number, type: OscillatorType, vol: number) => {
    const ctx = g.current.audioCtx; if (!ctx) return;
    const osc = ctx.createOscillator(); const gn = ctx.createGain();
    osc.connect(gn); gn.connect(ctx.destination); osc.type = type; osc.frequency.value = freq;
    gn.gain.setValueAtTime(vol, ctx.currentTime);
    gn.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.start(); osc.stop(ctx.currentTime + duration);
  }, []);

  const initGame = useCallback(() => {
    const game = g.current;
    game.gems = []; game.particles = []; game.floatingTexts = [];
    game.score = 0; game.collected = 0; game.timeLeft = 30; game.gameTime = 0;
    game.combo = 0; game.comboTimer = 0; game.comboMultiplier = 1; game.maxCombo = 0;
    game.screenShake = { timer: 0, intensity: 0 };
    game.hitFreeze = 0; game.missDarken = 0;
    game.comboBreakFlash = { timer: 0, scale: 1, text: '', mult: 1 };
    game.timerFlash = 0; game.beatPulse = 0;
    game.currentPhase = 1; game.phaseName = 'QUARTER NOTES';
    game.lastScheduledBeat = -1;
  }, []);

  const startGame = useCallback(() => {
    initGame(); initAudio();
    const game = g.current;
    game.phase = 'playing'; game.running = true;
    // Setup master gain
    const ctx = game.audioCtx!;
    game.masterGain = ctx.createGain();
    game.masterGain.gain.value = 0.7;
    game.masterGain.connect(ctx.destination);
    game.beatStartTime = ctx.currentTime;
    game.lastScheduledBeat = -1;
    setGameState('playing'); setShowShareModal(false); setProgression(null);
  }, [initGame, initAudio]);

  const startTutorial = useCallback(() => {
    const game = g.current;
    initAudio();
    game.phase = 'tutorial'; game.running = true;
    game.tutStep = 0; game.tutSuccess = false; game.tutSuccessTimer = 0;
    game.score = 0; game.combo = 0; game.comboTimer = 0; game.comboMultiplier = 1;
    game.gems = []; game.particles = []; game.floatingTexts = [];
    game.comboBreakFlash = { timer: 0, scale: 1, text: '', mult: 1 };
    setGameState('playing'); setShowShareModal(false); setProgression(null);
  }, [initAudio]);

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;

    function resize() {
      canvas!.width = window.innerWidth; canvas!.height = window.innerHeight;
      g.current.W = canvas!.width; g.current.H = canvas!.height;
      g.current.safeTop = parseInt(getComputedStyle(document.documentElement).getPropertyValue('env(safe-area-inset-top)')) || 0;
    }
    resize(); window.addEventListener('resize', resize);

    function spawnGemAt(game: typeof g.current, subdiv: number) {
      const margin = 60;
      const x = margin + Math.random() * (game.W - margin * 2);
      const y = margin + 100 + game.safeTop + Math.random() * (game.H - margin * 2 - 150 - game.safeTop);
      const type = selectGemType();
      // Size based on subdivision: quarter=30, eighth=24, sixteenth=18
      const radius = subdiv === 4 ? 30 : subdiv === 2 ? 24 : 18;
      game.gems.push({ x, y, type, radius, age: 0, maxLife: BEAT_SEC * 1.5, pulse: 0, alive: true, spawnTime: game.gameTime, beatSubdiv: subdiv });
    }

    function spawnGem(game: typeof g.current) {
      spawnGemAt(game, 4);
    }

    function spawnParticles(game: typeof g.current, x: number, y: number, color: string, count: number) {
      for (let i = 0; i < count; i++) {
        game.particles.push({ x, y, vx: (Math.random() - 0.5) * 8, vy: (Math.random() - 0.5) * 8, life: 1, color, size: Math.random() * 4 + 2 });
      }
    }

    function spawnFloatingText(game: typeof g.current, x: number, y: number, text: string, color: string) {
      game.floatingTexts.push({ x, y, text, color, life: 1, vy: -1.5 });
    }

    // --- TUTORIAL HELPERS ---
    function setupTutorialStep(game: typeof g.current) {
      const W = game.W, H = game.H;
      game.tutGems = []; game.tutCollected = 0;
      switch (game.tutStep) {
        case 0:
          game.tutGems.push({ x: W / 2, y: H / 2, type: gemTypes[1], radius: 30, age: 0, maxLife: 999, pulse: 0, alive: true, spawnTime: 0, beatSubdiv: 4 });
          break;
        case 1:
          [gemTypes[0], gemTypes[2], gemTypes[4]].forEach((t, i) => {
            game.tutGems.push({ x: [W * 0.25, W * 0.5, W * 0.75][i], y: H / 2, type: t, radius: 28, age: 0, maxLife: 999, pulse: 0, alive: true, spawnTime: 0, beatSubdiv: 4 });
          });
          break;
        case 2:
          game.tutCombo = 0;
          [[-50, -40], [50, -40], [-50, 40], [50, 40]].forEach(([ox, oy]) => {
            game.tutGems.push({ x: W / 2 + ox, y: H / 2 + oy, type: gemTypes[1], radius: 26, age: 0, maxLife: 999, pulse: 0, alive: true, spawnTime: 0, beatSubdiv: 4 });
          });
          break;
        case 3:
          game.tutMissShown = false; game.tutTimeLeft = 15;
          game.tutGems.push({ x: W / 2, y: H * 0.4, type: gemTypes[0], radius: 25, age: 0, maxLife: 2.0, pulse: 0, alive: true, spawnTime: 0, beatSubdiv: 4 });
          break;
        case 4:
          game.tutTimeLeft = 10; game.tutCombo = 0; game.spawnTimer = 0;
          break;
      }
    }

    function advanceTutorial(game: typeof g.current) {
      game.tutStep++; game.tutSuccess = false; game.tutSuccessTimer = 0;
      if (game.tutStep >= 5) {
        game.phase = 'playing';
        game.gems = []; game.particles = []; game.floatingTexts = [];
        game.score = 0; game.collected = 0; game.timeLeft = 30; game.gameTime = 0;
        game.combo = 0; game.comboTimer = 0; game.comboMultiplier = 1; game.maxCombo = 0;
        game.spawnTimer = 0; game.beatPulse = 0;
        game.currentPhase = 1; game.phaseName = 'QUARTER NOTES';
        // Setup audio for actual game
        const actx = game.audioCtx;
        if (actx) {
          game.masterGain = actx.createGain();
          game.masterGain.gain.value = 0.7;
          game.masterGain.connect(actx.destination);
          game.beatStartTime = actx.currentTime;
          game.lastScheduledBeat = -1;
        }
        return;
      }
      game.gems = []; game.particles = []; game.floatingTexts = [];
      game.combo = 0; game.comboTimer = 0; game.comboMultiplier = 1;
      game.comboBreakFlash = { timer: 0, scale: 1, text: '', mult: 1 };
      setupTutorialStep(game);
    }

    const STEP_NAMES = ['TAP TO COLLECT', 'GEM VALUES', 'COMBOS', 'MISS PENALTY', 'READY?'];
    const STEP_INSTRUCTIONS = ['TAP THE GEM', 'RARER GEMS = MORE POINTS', 'TAP FAST FOR MULTIPLIERS', 'MISSED GEMS COST TIME', 'SURVIVE 10 SECONDS'];

    function checkTutorialStep(game: typeof g.current): boolean {
      switch (game.tutStep) {
        case 0: return game.tutCollected >= 1;
        case 1: return game.tutCollected >= 3;
        case 2: return game.tutCombo >= 3;
        case 3: return game.tutMissShown && game.tutCollected >= 1;
        case 4: return game.tutTimeLeft <= 0;
        default: return false;
      }
    }

    if (g.current.phase === 'tutorial') setupTutorialStep(g.current);

    const handleTap = (e: TouchEvent | MouseEvent) => {
      if (e instanceof TouchEvent) e.preventDefault();
      const game = g.current;
      const px = e instanceof TouchEvent ? e.touches[0].clientX : e.clientX;
      const py = e instanceof TouchEvent ? e.touches[0].clientY : e.clientY;
      initAudio();

      if (game.phase === 'tutorial') {
        if (game.tutSuccess) return;
        if (px >= game.W - 80 && py <= 50) {
          game.phase = 'playing';
          game.gems = []; game.particles = []; game.floatingTexts = [];
          game.score = 0; game.collected = 0; game.timeLeft = 30; game.gameTime = 0;
          game.combo = 0; game.comboTimer = 0; game.comboMultiplier = 1; game.maxCombo = 0;
          game.spawnTimer = 0;
          const actx = game.audioCtx;
          if (actx) {
            game.masterGain = actx.createGain();
            game.masterGain.gain.value = 0.7;
            game.masterGain.connect(actx.destination);
            game.beatStartTime = actx.currentTime;
            game.lastScheduledBeat = -1;
          }
          return;
        }
        const activeGems = game.tutStep === 4 ? game.gems : game.tutGems;
        for (let i = activeGems.length - 1; i >= 0; i--) {
          const gem = activeGems[i];
          const dx = px - gem.x, dy = py - gem.y;
          if (dx * dx + dy * dy < gem.radius * gem.radius) {
            game.score += gem.type.points; game.tutCollected++;
            if (game.tutStep === 2) { game.tutCombo++; game.combo++; game.comboTimer = 0.9; game.comboMultiplier = getComboMultiplier(game.combo); }
            spawnParticles(game, gem.x, gem.y, gem.type.color, 15);
            spawnFloatingText(game, gem.x, gem.y - 30, '+' + gem.type.points, gem.type.color);
            playCollect(440);
            if (gem.type.points >= 5) { game.hitFreeze = 0.03; game.screenShake = { timer: 0.08, intensity: 2 }; }
            activeGems.splice(i, 1);
            break;
          }
        }
        return;
      }

      if (game.phase !== 'playing') return;

      for (let i = game.gems.length - 1; i >= 0; i--) {
        const gem = game.gems[i];
        const dx = px - gem.x, dy = py - gem.y;
        if (dx * dx + dy * dy < (gem.radius + 5) * (gem.radius + 5)) {
          const lifeRatio = gem.age / gem.maxLife;
          const isPerfect = lifeRatio <= 0.4;
          const mult = game.comboMultiplier;
          const basePoints = isPerfect ? gem.type.points : Math.max(1, Math.ceil(gem.type.points / 2));
          const pts = Math.round(basePoints * mult);
          game.score += pts; game.collected++;
          game.combo++; game.comboTimer = 0.9;
          game.comboMultiplier = getComboMultiplier(game.combo);
          if (game.combo > game.maxCombo) game.maxCombo = game.combo;

          const pCount = isPerfect ? 25 : 12;
          spawnParticles(game, gem.x, gem.y, isPerfect ? T.gold : gem.type.color, pCount);
          if (isPerfect) {
            for (let j = 0; j < 8; j++) {
              game.particles.push({ x: gem.x, y: gem.y, vx: (Math.random() - 0.5) * 12, vy: (Math.random() - 0.5) * 12, life: 1, color: '#FFFFFF', size: Math.random() * 3 + 1 });
            }
          }

          const comboText = mult > 1 ? ` x${mult}` : '';
          const tierLabel = isPerfect ? 'PERFECT' : 'OK';
          const tierColor = isPerfect ? T.gold : gem.type.color;
          spawnFloatingText(game, gem.x, gem.y - 30, `${tierLabel} +${pts}${comboText}`, tierColor);
          if (game.combo >= 3) spawnFloatingText(game, game.W / 2, game.H * 0.15, `${game.combo} COMBO!`, T.gold);

          // Play instrument sound
          playInstrument(gem.type.instrument, isPerfect);

          if (gem.type.points >= 5) { game.hitFreeze = 0.03; game.screenShake = { timer: 0.08, intensity: 2 }; }
          game.gems.splice(i, 1);
          break;
        }
      }
    };

    canvas.addEventListener('touchstart', handleTap, { passive: false });
    canvas.addEventListener('click', handleTap);

    let lastTime = performance.now(); let animId: number;

    function updateTutorial(dt: number) {
      const game = g.current;
      game.gameTime += dt;
      if (game.hitFreeze > 0) { game.hitFreeze -= dt; return; }

      if (!game.tutSuccess && checkTutorialStep(game)) {
        game.tutSuccess = true; game.tutSuccessTimer = 1.5;
        playSound(880, 0.3, 'sine', 0.2);
      }
      if (game.tutSuccess) {
        game.tutSuccessTimer -= dt;
        if (game.tutSuccessTimer <= 0) advanceTutorial(game);
      }

      if (game.tutStep === 3 && !game.tutSuccess) {
        for (let i = game.tutGems.length - 1; i >= 0; i--) {
          const gem = game.tutGems[i];
          gem.age += dt; gem.pulse = Math.sin(gem.age * 5) * 0.2 + 1;
          if (gem.age >= gem.maxLife) {
            game.tutTimeLeft = Math.max(0, game.tutTimeLeft - 0.35);
            game.missDarken = 0.1; game.timerFlash = 0.15;
            playMissThud(); game.tutMissShown = true;
            game.tutGems.splice(i, 1);
            setTimeout(() => {
              if (game.phase === 'tutorial' && game.tutStep === 3) {
                game.tutGems.push({ x: game.W / 2, y: game.H * 0.6, type: gemTypes[2], radius: 28, age: 0, maxLife: 999, pulse: 0, alive: true, spawnTime: 0, beatSubdiv: 4 });
              }
            }, 500);
          }
        }
      }

      if (game.tutStep === 4 && !game.tutSuccess) {
        game.tutTimeLeft -= dt;
        if (game.tutTimeLeft <= 0) game.tutTimeLeft = 0;
        game.spawnTimer += dt;
        if (game.spawnTimer >= 0.7) { spawnGem(game); game.spawnTimer = 0; }
        for (let i = game.gems.length - 1; i >= 0; i--) {
          const gem = game.gems[i]; gem.age += dt; gem.pulse = Math.sin(gem.age * 5) * 0.2 + 1;
          if (gem.age >= gem.maxLife) game.gems.splice(i, 1);
        }
        if (game.comboTimer > 0) {
          game.comboTimer -= dt;
          if (game.comboTimer <= 0) { if (game.combo >= 3) playComboBreak(); game.combo = 0; game.comboMultiplier = 1; }
        }
      }

      if (game.tutStep !== 3 && game.tutStep !== 4) {
        for (const gem of game.tutGems) { gem.age += dt; gem.pulse = Math.sin(gem.age * 5) * 0.2 + 1; }
      }

      for (let i = game.particles.length - 1; i >= 0; i--) { const p = game.particles[i]; p.x += p.vx; p.y += p.vy; p.vy += 0.2; p.life -= 0.02; if (p.life <= 0) game.particles.splice(i, 1); }
      for (let i = game.floatingTexts.length - 1; i >= 0; i--) { const ft = game.floatingTexts[i]; ft.y += ft.vy; ft.life -= dt * 1.5; if (ft.life <= 0) game.floatingTexts.splice(i, 1); }
      if (game.screenShake.timer > 0) game.screenShake.timer -= dt;
      if (game.missDarken > 0) game.missDarken -= dt;
      if (game.timerFlash > 0) game.timerFlash -= dt;
    }

    function update(dt: number) {
      const game = g.current;
      if (game.phase === 'start' || game.phase === 'over') return;
      if (game.phase === 'tutorial') { updateTutorial(dt); return; }
      if (game.hitFreeze > 0) { game.hitFreeze -= dt; return; }
      game.gameTime += dt;

      // timer
      game.timeLeft -= dt;
      if (game.timeLeft <= 0) { game.timeLeft = 0; endGame(game); return; }

      // Phase progression
      if (game.gameTime < 10) {
        game.currentPhase = 1; game.phaseName = 'QUARTER NOTES';
      } else if (game.gameTime < 20) {
        game.currentPhase = 2; game.phaseName = 'EIGHTH NOTES';
      } else {
        game.currentPhase = 3; game.phaseName = 'SIXTEENTH NOTES';
      }

      // combo
      if (game.comboTimer > 0) {
        game.comboTimer -= dt;
        if (game.comboTimer <= 0) {
          if (game.combo >= 3) {
            playComboBreak();
            game.comboBreakFlash = { timer: 0.12, scale: 1, text: game.combo + ' COMBO  x' + game.comboMultiplier, mult: game.comboMultiplier };
          }
          game.combo = 0; game.comboMultiplier = 1;
        }
      }

      // Beat-synced spawning using audioContext.currentTime
      const actx = game.audioCtx;
      if (actx) {
        const now = actx.currentTime;
        const elapsed = now - game.beatStartTime;

        // Determine subdivision size based on phase
        // Phase 1: quarter notes (1 per beat) → subdivIndex increments every BEAT_SEC
        // Phase 2: eighth notes → subdivIndex increments every BEAT_SEC/2
        // Phase 3: sixteenth notes → subdivIndex increments every BEAT_SEC/4
        const subdivSec = game.currentPhase === 1 ? BEAT_SEC : game.currentPhase === 2 ? BEAT_SEC / 2 : BEAT_SEC / 4;
        const currentSubdiv = Math.floor(elapsed / subdivSec);

        // Schedule ahead by 0.1s
        const lookAheadSubdiv = Math.floor((elapsed + 0.1) / subdivSec);

        for (let si = game.lastScheduledBeat + 1; si <= lookAheadSubdiv; si++) {
          const beatTime = game.beatStartTime + si * subdivSec;
          // Is this a quarter note?
          const isQuarter = (si * subdivSec) % BEAT_SEC < 0.001 || Math.abs((si * subdivSec) % BEAT_SEC - BEAT_SEC) < 0.001;
          const isEighth = !isQuarter && ((si * subdivSec) % (BEAT_SEC / 2) < 0.001 || Math.abs((si * subdivSec) % (BEAT_SEC / 2) - BEAT_SEC / 2) < 0.001);

          // Play kick on every quarter note
          if (isQuarter || (si === 0)) {
            playKick(beatTime);
          }

          // Determine subdivision type for the spawned gem
          let subdivType = 1; // sixteenth
          if (isQuarter || si === 0) subdivType = 4;
          else if (isEighth) subdivType = 2;

          // Spawn a gem on this subdivision
          spawnGemAt(game, subdivType);
        }

        game.lastScheduledBeat = lookAheadSubdiv;

        // Beat pulse (visual) - based on quarter notes
        const quarterBeat = elapsed / BEAT_SEC;
        const beatFrac = quarterBeat - Math.floor(quarterBeat);
        game.beatPulse = Math.max(0, 1 - beatFrac * 4); // quick flash then fade
      }

      // gems age
      for (let i = game.gems.length - 1; i >= 0; i--) {
        const gem = game.gems[i];
        gem.age += dt; gem.pulse = Math.sin(gem.age * 5) * 0.2 + 1;
        if (gem.age >= gem.maxLife) {
          game.timeLeft = Math.max(0, game.timeLeft - 0.35);
          game.missDarken = 0.1; game.timerFlash = 0.15;
          playMissThud();
          if (game.timeLeft <= 0) { game.timeLeft = 0; endGame(game); return; }
          game.gems.splice(i, 1);
        }
      }

      // particles
      for (let i = game.particles.length - 1; i >= 0; i--) {
        const p = game.particles[i]; p.x += p.vx; p.y += p.vy; p.vy += 0.2; p.life -= 0.02;
        if (p.life <= 0) game.particles.splice(i, 1);
      }

      // floating text
      for (let i = game.floatingTexts.length - 1; i >= 0; i--) {
        const ft = game.floatingTexts[i]; ft.y += ft.vy; ft.life -= dt * 1.5;
        if (ft.life <= 0) game.floatingTexts.splice(i, 1);
      }

      if (game.screenShake.timer > 0) game.screenShake.timer -= dt;
      if (game.missDarken > 0) game.missDarken -= dt;
      if (game.comboBreakFlash.timer > 0) {
        game.comboBreakFlash.timer -= dt;
        game.comboBreakFlash.scale = Math.max(0, game.comboBreakFlash.timer / 0.12);
      }
      if (game.timerFlash > 0) game.timerFlash -= dt;
    }

    function endGame(game: typeof g.current) {
      game.phase = 'over'; game.running = false;
      // Fade out master gain
      if (game.masterGain && game.audioCtx) {
        game.masterGain.gain.setValueAtTime(game.masterGain.gain.value, game.audioCtx.currentTime);
        game.masterGain.gain.exponentialRampToValueAtTime(0.001, game.audioCtx.currentTime + 0.5);
      }
      setScore(game.score); setFinalCollected(game.collected); setFinalMaxCombo(game.maxCombo);
      setGameState('gameover');
      if (game.score >= 1) fetch('/api/pixelpit/stats', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ game: GAME_ID }) }).catch(() => {});
    }

    function drawGem(c: CanvasRenderingContext2D, gem: Gem) {
      const life = 1 - gem.age / gem.maxLife;
      const alpha = Math.max(0, life);
      const size = gem.radius * gem.pulse;
      const hexA1 = Math.floor(alpha * 255).toString(16).padStart(2, '0');
      const hexA2 = Math.floor(alpha * 100).toString(16).padStart(2, '0');
      const grad = c.createRadialGradient(gem.x, gem.y, 0, gem.x, gem.y, size * 2);
      grad.addColorStop(0, gem.type.color + hexA1); grad.addColorStop(0.5, gem.type.color + hexA2); grad.addColorStop(1, gem.type.color + '00');
      c.fillStyle = grad; c.beginPath(); c.arc(gem.x, gem.y, size * 2, 0, Math.PI * 2); c.fill();
      c.fillStyle = gem.type.color; c.globalAlpha = alpha;
      c.beginPath(); c.arc(gem.x, gem.y, size, 0, Math.PI * 2); c.fill(); c.globalAlpha = 1;
      if (alpha > 0.7) {
        c.strokeStyle = '#fff'; c.globalAlpha = (Math.sin(gem.age * 10) * 0.3 + 0.5) * alpha; c.lineWidth = 2;
        c.beginPath(); c.moveTo(gem.x - size * 0.6, gem.y); c.lineTo(gem.x + size * 0.6, gem.y);
        c.moveTo(gem.x, gem.y - size * 0.6); c.lineTo(gem.x, gem.y + size * 0.6); c.stroke(); c.globalAlpha = 1;
      }
    }

    function drawTutorial() {
      const game = g.current; const W = game.W, H = game.H;
      ctx!.fillStyle = 'rgba(0, 0, 0, 0.3)'; ctx!.fillRect(0, 0, W, H);
      const hy = game.safeTop;

      ctx!.save();
      if (game.screenShake.timer > 0) {
        const s = game.screenShake.intensity * (game.screenShake.timer / 0.08);
        ctx!.translate((Math.random() * 2 - 1) * s, (Math.random() * 2 - 1) * s);
      }
      const activeGems = game.tutStep === 4 ? game.gems : game.tutGems;
      for (const gem of activeGems) drawGem(ctx!, gem);
      for (const p of game.particles) { ctx!.fillStyle = p.color; ctx!.globalAlpha = p.life; ctx!.beginPath(); ctx!.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx!.fill(); ctx!.globalAlpha = 1; }
      ctx!.restore();
      for (const ft of game.floatingTexts) { ctx!.fillStyle = ft.color; ctx!.globalAlpha = ft.life; ctx!.font = 'bold 18px monospace'; ctx!.textAlign = 'center'; ctx!.fillText(ft.text, ft.x, ft.y); ctx!.globalAlpha = 1; }
      if (game.missDarken > 0) { ctx!.fillStyle = `rgba(0,0,0,${game.missDarken * 3})`; ctx!.fillRect(0, 0, W, H); }

      ctx!.textAlign = 'center';
      ctx!.fillStyle = T.muted; ctx!.font = '12px monospace';
      ctx!.fillText('TUTORIAL ' + (game.tutStep + 1) + ' / 5', W / 2, 28 + hy);
      ctx!.fillStyle = T.gold; ctx!.font = 'bold 20px monospace';
      ctx!.shadowBlur = 10; ctx!.shadowColor = 'rgba(255,215,0,0.4)';
      ctx!.fillText(STEP_NAMES[game.tutStep], W / 2, 52 + hy); ctx!.shadowBlur = 0;

      if (!game.tutSuccess) {
        ctx!.fillStyle = T.amber; ctx!.font = '16px monospace';
        const instrY = game.tutStep === 4 ? H - 60 : H * 0.22;
        ctx!.fillText(STEP_INSTRUCTIONS[game.tutStep], W / 2, instrY);
        if (game.tutStep === 1) {
          for (const gem of game.tutGems) { ctx!.fillStyle = gem.type.color; ctx!.font = 'bold 14px monospace'; ctx!.fillText(gem.type.points + ' PT' + (gem.type.points > 1 ? 'S' : ''), gem.x, gem.y - 45); }
        }
        if (game.tutStep === 2 && game.combo >= 1) { ctx!.fillStyle = T.gold; ctx!.font = 'bold 16px monospace'; ctx!.fillText(game.combo + ' / 3 COMBO', W / 2, H * 0.78); }
        if ((game.tutStep === 3 || game.tutStep === 4) && game.tutTimeLeft !== undefined) {
          ctx!.textAlign = 'right'; ctx!.fillStyle = game.timerFlash > 0 ? T.danger : T.teal; ctx!.font = 'bold 20px monospace';
          ctx!.fillText(game.tutTimeLeft.toFixed(1), W - 16, 52 + hy); ctx!.textAlign = 'center';
        }
        if (game.tutStep === 3 && game.tutMissShown && game.tutGems.length > 0) { ctx!.fillStyle = T.teal; ctx!.font = '14px monospace'; ctx!.fillText('NOW TAP THE GEM', W / 2, H * 0.78); }
      }

      if (game.tutSuccess) {
        const a = Math.min(1, game.tutSuccessTimer);
        ctx!.globalAlpha = a; ctx!.fillStyle = T.gold; ctx!.font = 'bold 28px monospace';
        ctx!.shadowBlur = 15; ctx!.shadowColor = 'rgba(255,215,0,0.6)';
        ctx!.fillText(game.tutStep === 4 ? 'GO!' : 'NICE!', W / 2, H / 2);
        ctx!.shadowBlur = 0; ctx!.globalAlpha = 1;
      }

      ctx!.textAlign = 'right'; ctx!.fillStyle = T.muted; ctx!.font = '12px monospace';
      ctx!.fillText('SKIP >', W - 16, 28 + hy);
      ctx!.textAlign = 'left'; ctx!.fillStyle = T.muted; ctx!.font = '10px monospace'; ctx!.fillText('SCORE', 16, H - 24);
      ctx!.fillStyle = T.gold; ctx!.font = 'bold 16px monospace'; ctx!.fillText(game.score + '', 16, H - 8);
      ctx!.textAlign = 'left';
    }

    function draw() {
      const game = g.current;
      if (game.phase === 'start' || game.phase === 'over') return;
      if (game.phase === 'tutorial') { drawTutorial(); return; }
      const W = game.W, H = game.H;

      // Background with beat pulse
      const pulseAlpha = game.beatPulse * 0.08;
      ctx!.fillStyle = `rgba(0, 0, 0, ${0.25 - pulseAlpha})`;
      ctx!.fillRect(0, 0, W, H);
      if (pulseAlpha > 0.001) {
        ctx!.fillStyle = `rgba(255, 215, 0, ${pulseAlpha})`;
        ctx!.fillRect(0, 0, W, H);
      }

      ctx!.save();
      if (game.screenShake.timer > 0) {
        const s = game.screenShake.intensity * (game.screenShake.timer / 0.08);
        ctx!.translate((Math.random() * 2 - 1) * s, (Math.random() * 2 - 1) * s);
      }

      // Beat pulse ring in center
      if (game.beatPulse > 0.01) {
        const ringRadius = 40 + (1 - game.beatPulse) * 80;
        ctx!.strokeStyle = `rgba(255, 215, 0, ${game.beatPulse * 0.3})`;
        ctx!.lineWidth = 2;
        ctx!.beginPath(); ctx!.arc(W / 2, H / 2, ringRadius, 0, Math.PI * 2); ctx!.stroke();
      }

      for (const gem of game.gems) drawGem(ctx!, gem);

      for (const p of game.particles) {
        ctx!.fillStyle = p.color; ctx!.globalAlpha = p.life;
        ctx!.beginPath(); ctx!.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx!.fill();
        ctx!.globalAlpha = 1;
      }
      ctx!.restore();

      for (const ft of game.floatingTexts) {
        ctx!.fillStyle = ft.color; ctx!.globalAlpha = ft.life;
        ctx!.font = 'bold 18px monospace'; ctx!.textAlign = 'center';
        ctx!.fillText(ft.text, ft.x, ft.y); ctx!.globalAlpha = 1;
      }

      if (game.missDarken > 0) {
        ctx!.fillStyle = `rgba(0,0,0,${game.missDarken * 3})`;
        ctx!.fillRect(0, 0, W, H);
      }

      if (game.combo >= 3) {
        ctx!.strokeStyle = T.gold; ctx!.lineWidth = 2;
        ctx!.globalAlpha = 0.3 + Math.sin(game.gameTime * 8) * 0.15;
        ctx!.strokeRect(2, 2, W - 4, H - 4); ctx!.globalAlpha = 1;
      }

      // --- HUD ---
      const hy = game.safeTop;
      ctx!.textAlign = 'left';
      ctx!.fillStyle = T.gold; ctx!.font = 'bold 24px monospace';
      ctx!.shadowBlur = 10; ctx!.shadowColor = 'rgba(255,215,0,0.4)';
      ctx!.fillText('SHINE', 16, 32 + hy); ctx!.shadowBlur = 0;

      ctx!.fillStyle = T.muted; ctx!.font = '10px monospace';
      ctx!.fillText('SCORE', 16, 56 + hy);
      ctx!.fillStyle = T.gold; ctx!.font = 'bold 22px monospace';
      ctx!.shadowBlur = 8; ctx!.shadowColor = 'rgba(255,215,0,0.3)';
      ctx!.fillText(game.score + '', 16, 78 + hy); ctx!.shadowBlur = 0;

      ctx!.textAlign = 'right';
      ctx!.fillStyle = T.muted; ctx!.font = '10px monospace';
      ctx!.fillText('TIME', W - 16, 56 + hy);
      const timerColor = game.timerFlash > 0 ? T.danger : (game.timeLeft <= 10 ? T.danger : T.teal);
      ctx!.fillStyle = timerColor; ctx!.font = 'bold 22px monospace';
      const timerStr = game.timeLeft < 10 ? game.timeLeft.toFixed(1) : Math.ceil(game.timeLeft) + '';
      if (game.timeLeft <= 10 || game.timerFlash > 0) {
        const dangPulse = game.timeLeft <= 10 ? Math.sin(game.gameTime * 6) * 0.05 : 0;
        const missPulse = game.timerFlash > 0 ? (game.timerFlash / 0.15) * 0.12 : 0;
        const pulse = 1 + dangPulse + missPulse;
        ctx!.save(); ctx!.translate(W - 16, 78 + hy); ctx!.scale(pulse, pulse);
        ctx!.fillText(timerStr, 0, 0); ctx!.restore();
      } else {
        ctx!.fillText(timerStr, W - 16, 78 + hy);
      }

      // Phase name display
      ctx!.textAlign = 'center';
      ctx!.fillStyle = T.teal; ctx!.font = 'bold 12px monospace';
      ctx!.globalAlpha = 0.6;
      ctx!.fillText(game.phaseName, W / 2, H - 20);
      ctx!.globalAlpha = 1;

      // combo display
      if (game.combo >= 3) {
        ctx!.textAlign = 'center'; ctx!.fillStyle = T.gold;
        ctx!.font = 'bold 16px monospace'; ctx!.globalAlpha = 0.8;
        ctx!.fillText(game.combo + ' COMBO  x' + game.comboMultiplier, W / 2, 32 + hy);
        ctx!.globalAlpha = 1;
      } else if (game.comboBreakFlash.timer > 0) {
        ctx!.textAlign = 'center'; ctx!.fillStyle = T.danger;
        ctx!.font = 'bold 16px monospace'; ctx!.globalAlpha = game.comboBreakFlash.scale;
        ctx!.save(); ctx!.translate(W / 2, 32 + hy);
        ctx!.scale(game.comboBreakFlash.scale, game.comboBreakFlash.scale);
        ctx!.fillText(game.comboBreakFlash.text, 0, 0);
        ctx!.restore(); ctx!.globalAlpha = 1;
      }

      ctx!.textAlign = 'center';
      ctx!.fillStyle = T.muted; ctx!.font = '10px monospace';
      ctx!.fillText('COLLECTED', W / 2, 56 + hy);
      ctx!.fillStyle = T.amber; ctx!.font = 'bold 16px monospace';
      ctx!.fillText(game.collected + '', W / 2, 74 + hy);
      ctx!.textAlign = 'left';
    }

    function loop(ts: number) {
      const dt = Math.min((ts - lastTime) / 1000, 0.05); lastTime = ts;
      if (g.current.running) { update(dt); draw(); }
      animId = requestAnimationFrame(loop);
    }
    animId = requestAnimationFrame(loop);

    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', resize); canvas.removeEventListener('touchstart', handleTap); canvas.removeEventListener('click', handleTap); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initAudio, playCollect, playComboBreak, playMissThud, playSound, playInstrument, playKick]);

  return (
    <>
      <Script src="/pixelpit/social.js" strategy="lazyOnload" onLoad={() => setSocialLoaded(true)} />
      <canvas ref={canvasRef} style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', display: 'block', background: T.bg, touchAction: 'none' }} />

      {gameState === 'start' && (
        <div style={{ position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: COLORS.bg, zIndex: 100, textAlign: 'center', padding: 40 }}>
          <div style={{ background: COLORS.surface, border: '1px solid rgba(255,255,255,0.05)', padding: '50px 60px', boxShadow: '0 20px 60px rgba(0,0,0,0.5)', borderRadius: 16 }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: `radial-gradient(circle, ${T.gold}, ${T.amber})`, margin: '0 auto 20px', boxShadow: `0 0 30px ${T.gold}66` }} />
            <h1 style={{ fontFamily: 'ui-monospace, monospace', fontSize: 64, fontWeight: 300, color: T.gold, marginBottom: 20, letterSpacing: 8, textShadow: `0 0 40px rgba(255,215,0,0.4)` }}>SHINE</h1>
            <p style={{ fontSize: 14, fontFamily: 'ui-monospace, monospace', color: T.amber, marginBottom: 35, lineHeight: 1.8, letterSpacing: 2 }}>
              tap gems on the beat<br />build combos for multipliers<br />missed gems cost time
            </p>
            <button onClick={startGame} style={{ background: T.gold, color: COLORS.bg, border: 'none', padding: '16px 50px', fontSize: 16, fontFamily: 'ui-monospace, monospace', fontWeight: 600, cursor: 'pointer', borderRadius: 8, letterSpacing: 2, boxShadow: `0 8px 30px rgba(255,215,0,0.3)` }}>play</button>
            <button onClick={startTutorial} style={{ background: 'transparent', border: `1px solid ${T.muted}`, color: T.muted, padding: '10px 30px', fontSize: 12, fontFamily: 'ui-monospace, monospace', cursor: 'pointer', borderRadius: 6, letterSpacing: 2, marginTop: 12 }}>tutorial</button>
          </div>
          <div style={{ marginTop: 30, fontSize: 12, fontFamily: 'ui-monospace, monospace', letterSpacing: 3 }}>
            <span style={{ color: T.gold }}>pixel</span><span style={{ color: T.teal }}>pit</span><span style={{ color: COLORS.text, opacity: 0.4 }}> arcade</span>
          </div>
        </div>
      )}

      {gameState === 'gameover' && (
        <div style={{ position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: COLORS.bg, zIndex: 100, textAlign: 'center', padding: 40 }}>
          <h1 style={{ fontFamily: 'ui-monospace, monospace', fontSize: 28, fontWeight: 300, color: T.muted, marginBottom: 15, letterSpacing: 6 }}>time up</h1>
          <div style={{ fontFamily: 'ui-monospace, monospace', fontSize: 80, fontWeight: 200, color: T.gold, marginBottom: 10, textShadow: `0 0 40px rgba(255,215,0,0.4)` }}>{score}</div>
          <div style={{ fontFamily: 'ui-monospace, monospace', fontSize: 14, color: COLORS.muted, marginBottom: 30 }}>collected: {finalCollected} · max combo: {finalMaxCombo}</div>
          <ScoreFlow score={score} gameId={GAME_ID} colors={SCORE_FLOW_COLORS} maxScore={200} onRankReceived={(rank, entryId) => setSubmittedEntryId(entryId ?? null)} onProgression={(prog) => setProgression(prog)} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 15, alignItems: 'center' }}>
            <button onClick={startGame} style={{ background: T.gold, color: COLORS.bg, border: 'none', borderRadius: 8, padding: '16px 50px', fontSize: 15, fontFamily: 'ui-monospace, monospace', fontWeight: 600, cursor: 'pointer', boxShadow: `0 8px 25px rgba(255,215,0,0.3)`, letterSpacing: 2 }}>play again</button>
            <button onClick={() => setGameState('leaderboard')} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, color: COLORS.muted, padding: '14px 35px', fontSize: 11, fontFamily: 'ui-monospace, monospace', cursor: 'pointer', letterSpacing: 2 }}>leaderboard</button>
            {user ? (
              <button onClick={() => setShowShareModal(true)} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, color: COLORS.muted, padding: '14px 35px', fontSize: 11, fontFamily: 'ui-monospace, monospace', cursor: 'pointer', letterSpacing: 2 }}>share / groups</button>
            ) : (
              <ShareButtonContainer id="share-btn-container" url={typeof window !== 'undefined' ? `${window.location.origin}/pixelpit/arcade/shine/share/${score}` : ''} text={`I scored ${score} on SHINE! Can you beat me?`} style="minimal" socialLoaded={socialLoaded} />
            )}
          </div>
        </div>
      )}

      {gameState === 'leaderboard' && <Leaderboard gameId={GAME_ID} limit={8} entryId={submittedEntryId ?? undefined} colors={LEADERBOARD_COLORS} onClose={() => setGameState('gameover')} groupsEnabled={true} gameUrl={GAME_URL} socialLoaded={socialLoaded} />}
      {showShareModal && user && <ShareModal gameUrl={GAME_URL} score={score} colors={LEADERBOARD_COLORS} onClose={() => setShowShareModal(false)} />}
    </>
  );
}
