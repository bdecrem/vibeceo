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
  bg: '#0a0a0a', gear: '#2a2a2e', cyan: '#22d3ee', fuchsia: '#d946ef',
  gold: '#facc15', text: '#ffffff', grey: '#555555', slime: '#a3e635',
};

const PHASE_COLORS = [T.cyan, T.fuchsia, T.gold];

const COLORS = {
  bg: '#0a0a0a', surface: '#18181b', primary: '#22d3ee', secondary: '#d946ef',
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

const GAME_ID = 'phase';
const GEAR_SPACING = 140;
const GEAR_OUTER_R = 55;
const GEAR_INNER_R = 20;
const GRAVITY = 400;
const TAP_IMPULSE = -220;
const TERMINAL_VEL = 350;
const CHIME_FREQ: Record<string, number> = { [T.cyan]: 880, [T.fuchsia]: 587, [T.gold]: 392 };

interface Gear { index: number; x: number; y: number; angle: number; speed: number; segments: string[]; numSegments: number; passed: boolean; }
interface Particle { x: number; y: number; vx: number; vy: number; r: number; color: string; life: number; maxLife: number; }
interface TrailPoint { x: number; y: number; life: number; }
interface Ghost { x: number; y: number; vx: number; vy: number; r: number; trail: TrailPoint[]; }

function hexToRgb(hex: string): [number, number, number] {
  return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
}
function lerpColor(c1: string, c2: string, t: number): string {
  const [r1, g1, b1] = hexToRgb(c1);
  const [r2, g2, b2] = hexToRgb(c2);
  return `rgb(${Math.round(r1 + (r2 - r1) * t)},${Math.round(g1 + (g2 - g1) * t)},${Math.round(b1 + (b2 - b1) * t)})`;
}

export default function PhaseGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<'start' | 'playing' | 'gameover' | 'leaderboard'>('start');
  const [score, setScore] = useState(0);
  const [finalGears, setFinalGears] = useState(0);
  const [finalMultiplier, setFinalMultiplier] = useState(1);
  const [socialLoaded, setSocialLoaded] = useState(false);
  const [submittedEntryId, setSubmittedEntryId] = useState<number | null>(null);
  const [progression, setProgression] = useState<ProgressionResult | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);

  const { user } = usePixelpitSocial(socialLoaded);
  const GAME_URL = typeof window !== 'undefined' ? `${window.location.origin}/pixelpit/arcade/phase` : 'https://pixelpit.gg/pixelpit/arcade/phase';

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
    ghost: { x: 0, y: 150, vx: 0, vy: 0, r: 10, trail: [] } as Ghost,
    gears: [] as Gear[], particles: [] as Particle[],
    score: 0, gearsCleared: 0, multiplier: 1,
    currentPhaseColor: PHASE_COLORS[0], nextPhaseColor: null as string | null,
    phaseShiftWarning: 0, phaseShiftTimer: 0,
    gameTime: 0, deadTimer: 0, cameraY: 0,
    screenShake: { timer: 0, intensity: 0 },
    invertFlash: 0, borderPulse: 0,
    phase: 'start' as 'start' | 'playing' | 'tutorial' | 'dead' | 'over',
    running: false, W: 0, H: 0,
    audioCtx: null as AudioContext | null,
    tickInterval: null as ReturnType<typeof setInterval> | null,
    // tutorial
    tutorialStep: -1, tutorialPhase: 'instruction' as 'instruction' | 'playing' | 'success',
    tutorialTimer: 0, tutorialGearsCleared: 0,
  });

  // Audio
  const initAudio = useCallback(() => {
    const game = g.current;
    if (!game.audioCtx) game.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    if (game.audioCtx.state === 'suspended') game.audioCtx.resume();
  }, []);

  const playPhaseThrough = useCallback((color: string) => {
    const ctx = g.current.audioCtx; if (!ctx) return;
    const osc = ctx.createOscillator(); const gn = ctx.createGain();
    osc.connect(gn); gn.connect(ctx.destination); osc.type = 'sine';
    osc.frequency.value = CHIME_FREQ[color] || 660;
    gn.gain.setValueAtTime(0.1, ctx.currentTime);
    gn.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
    osc.start(); osc.stop(ctx.currentTime + 0.25);
  }, []);

  const playClank = useCallback(() => {
    const ctx = g.current.audioCtx; if (!ctx) return;
    const osc = ctx.createOscillator(); const gn = ctx.createGain();
    osc.connect(gn); gn.connect(ctx.destination); osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(300, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.15);
    gn.gain.setValueAtTime(0.2, ctx.currentTime);
    gn.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
    osc.start(); osc.stop(ctx.currentTime + 0.2);
    const buf = ctx.createBuffer(1, ctx.sampleRate * 0.1, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    const src = ctx.createBufferSource(); const ng = ctx.createGain();
    src.buffer = buf; src.connect(ng); ng.connect(ctx.destination);
    ng.gain.setValueAtTime(0.12, ctx.currentTime);
    ng.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15); src.start();
  }, []);

  const playShift = useCallback(() => {
    const ctx = g.current.audioCtx; if (!ctx) return;
    for (let i = 0; i < 4; i++) {
      setTimeout(() => {
        if (!ctx) return;
        const osc = ctx.createOscillator(); const gn = ctx.createGain();
        osc.connect(gn); gn.connect(ctx.destination); osc.type = 'triangle';
        osc.frequency.value = 400 + i * 150;
        gn.gain.setValueAtTime(0.08, ctx.currentTime);
        gn.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
        osc.start(); osc.stop(ctx.currentTime + 0.12);
      }, i * 60);
    }
  }, []);

  const playTap = useCallback(() => {
    const ctx = g.current.audioCtx; if (!ctx) return;
    const osc = ctx.createOscillator(); const gn = ctx.createGain();
    osc.connect(gn); gn.connect(ctx.destination); osc.type = 'sine';
    osc.frequency.value = 440;
    gn.gain.setValueAtTime(0.05, ctx.currentTime);
    gn.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);
    osc.start(); osc.stop(ctx.currentTime + 0.06);
  }, []);

  const playLevelUp = useCallback(() => {
    const ctx = g.current.audioCtx; if (!ctx) return;
    const osc = ctx.createOscillator(); const gn = ctx.createGain();
    osc.connect(gn); gn.connect(ctx.destination); osc.type = 'square';
    osc.frequency.setValueAtTime(300, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(600, ctx.currentTime + 0.2);
    gn.gain.setValueAtTime(0.12, ctx.currentTime);
    gn.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.start(); osc.stop(ctx.currentTime + 0.3);
  }, []);

  const startTick = useCallback((bpm: number) => {
    const game = g.current;
    if (game.tickInterval) clearInterval(game.tickInterval);
    const ms = 60000 / bpm;
    game.tickInterval = setInterval(() => {
      if (!game.audioCtx) return;
      const osc = game.audioCtx.createOscillator(); const gn = game.audioCtx.createGain();
      osc.connect(gn); gn.connect(game.audioCtx.destination); osc.type = 'square';
      osc.frequency.value = 1200;
      gn.gain.setValueAtTime(0.02, game.audioCtx.currentTime);
      gn.gain.exponentialRampToValueAtTime(0.001, game.audioCtx.currentTime + 0.02);
      osc.start(); osc.stop(game.audioCtx.currentTime + 0.02);
    }, ms);
  }, []);

  const stopTick = useCallback(() => {
    const game = g.current;
    if (game.tickInterval) { clearInterval(game.tickInterval); game.tickInterval = null; }
  }, []);

  const spawnParticles = useCallback((x: number, y: number, color: string, count: number) => {
    const game = g.current;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2; const speed = 40 + Math.random() * 80;
      const life = 0.2 + Math.random() * 0.3;
      game.particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, r: 1.5 + Math.random() * 2.5, color, life, maxLife: life });
    }
  }, []);

  function getGearWorldY(gear: Gear): number { return 250 + gear.index * GEAR_SPACING; }

  function createGear(index: number, phaseColor?: string): Gear {
    const color = phaseColor || g.current.currentPhaseColor;
    const numSegments = 4;
    const matchCount = index < 20 ? 2 : 1;
    const segments: string[] = [];
    const otherColors = PHASE_COLORS.filter(c => c !== color);
    const matchIndices: number[] = [];
    while (matchIndices.length < matchCount) {
      const idx = Math.floor(Math.random() * numSegments);
      if (!matchIndices.includes(idx)) matchIndices.push(idx);
    }
    for (let i = 0; i < numSegments; i++) {
      segments.push(matchIndices.includes(i) ? color : otherColors[Math.floor(Math.random() * otherColors.length)]);
    }
    const baseSpeed = 0.8 + Math.min(index * 0.04, 1.5);
    const dir = Math.random() < 0.5 ? 1 : -1;
    return { index, x: g.current.W / 2, y: 0, angle: Math.random() * Math.PI * 2, speed: baseSpeed * dir, segments, numSegments, passed: false };
  }

  function checkGearCollision(ghost: Ghost, gear: Gear, currentColor: string): 'none' | 'phase' | 'hit' {
    const gy = getGearWorldY(gear);
    const ghostTop = ghost.y - ghost.r; const ghostBot = ghost.y + ghost.r;
    if (ghostBot < gy - GEAR_OUTER_R || ghostTop > gy + GEAR_OUTER_R) return 'none';
    const dx = ghost.x - gear.x; const dy = ghost.y - gy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < GEAR_INNER_R - ghost.r) return 'none';
    if (dist > GEAR_OUTER_R + ghost.r) return 'none';
    let angle = Math.atan2(dy, dx) - gear.angle;
    angle = ((angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    const segAngle = (Math.PI * 2) / gear.numSegments;
    const segIdx = Math.floor(angle / segAngle);
    return gear.segments[segIdx] === currentColor ? 'phase' : 'hit';
  }

  const TUTORIAL_STEPS = [
    { name: 'FLOAT', instruction: 'TAP TO FLOAT UP', successText: 'NICE!', gearCount: 1 },
    { name: 'COLOR', instruction: 'MATCH YOUR COLOR', successText: 'PHASED!', gearCount: 2 },
    { name: 'SHIFT', instruction: 'YOUR COLOR WILL CHANGE', successText: 'READY!', gearCount: 2 },
  ];

  const initGame = useCallback(() => {
    const game = g.current;
    game.ghost = { x: game.W / 2, y: 150, vx: 0, vy: 0, r: 10, trail: [] };
    game.gears = []; game.particles = [];
    game.score = 0; game.gearsCleared = 0; game.multiplier = 1;
    game.currentPhaseColor = PHASE_COLORS[0]; game.nextPhaseColor = null;
    game.phaseShiftWarning = 0; game.phaseShiftTimer = 0;
    game.gameTime = 0; game.deadTimer = 0; game.cameraY = 0;
    game.screenShake = { timer: 0, intensity: 0 };
    game.invertFlash = 0; game.borderPulse = 0;
    game.tutorialStep = -1; game.tutorialPhase = 'instruction'; game.tutorialTimer = 0; game.tutorialGearsCleared = 0;
    stopTick();
    for (let i = 0; i < 20; i++) game.gears.push(createGear(i));
  }, [stopTick]);

  const startPlaying = useCallback(() => {
    initGame(); initAudio();
    const game = g.current;
    game.phase = 'playing'; game.running = true;
    game.ghost.y = 150; game.ghost.vy = 0;
    startTick(60);
    setGameState('playing'); setShowShareModal(false); setProgression(null);
  }, [initGame, initAudio, startTick]);

  const setupTutorialStep = useCallback((step: number) => {
    const game = g.current;
    game.gears = []; game.particles = [];
    game.gearsCleared = 0; game.score = 0; game.cameraY = 0;
    game.tutorialGearsCleared = 0;
    game.ghost = { x: game.W / 2, y: 150, vx: 0, vy: 0, r: 10, trail: [] };
    game.phaseShiftWarning = 0; game.phaseShiftTimer = 0;
    game.nextPhaseColor = null; game.invertFlash = 0; game.borderPulse = 0;

    if (step === 0) {
      game.currentPhaseColor = T.cyan;
      const gear = createGear(0, T.cyan);
      gear.segments = [T.cyan, T.cyan, T.cyan, T.cyan]; gear.speed = 0.3;
      game.gears.push(gear);
    } else if (step === 1) {
      game.currentPhaseColor = T.cyan;
      for (let i = 0; i < 2; i++) {
        const gear = createGear(i, T.cyan);
        gear.speed = 0.5 * (i % 2 === 0 ? 1 : -1);
        game.gears.push(gear);
      }
    } else if (step === 2) {
      game.currentPhaseColor = T.cyan;
      const g1 = createGear(0, T.cyan); g1.speed = 0.4; game.gears.push(g1);
      const g2 = createGear(1, T.fuchsia); g2.speed = -0.4; game.gears.push(g2);
    }
  }, []);

  const startTutorial = useCallback(() => {
    const game = g.current;
    game.phase = 'tutorial'; game.running = true;
    game.tutorialStep = 0; game.tutorialPhase = 'instruction'; game.tutorialTimer = 0;
    initAudio();
    setupTutorialStep(0);
    setGameState('playing');
  }, [initAudio, setupTutorialStep]);

  // Game loop
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;

    function resize() { canvas!.width = window.innerWidth; canvas!.height = window.innerHeight; g.current.W = canvas!.width; g.current.H = canvas!.height; }
    resize(); window.addEventListener('resize', resize);

    const handleTap = (e: TouchEvent | MouseEvent) => {
      if (e instanceof TouchEvent) e.preventDefault();
      const game = g.current;
      const clientX = e instanceof TouchEvent ? e.touches[0].clientX : (e as MouseEvent).clientX;

      if (game.phase === 'playing') {
        game.ghost.vy = TAP_IMPULSE;
        game.ghost.vx = (clientX - game.ghost.x) * 0.8;
        playTap();
      } else if (game.phase === 'tutorial' && game.tutorialPhase === 'playing') {
        // check skip button
        const clientY = e instanceof TouchEvent ? e.touches[0].clientY : (e as MouseEvent).clientY;
        if (clientX > game.W - 80 && clientY < 45) {
          game.tutorialStep = -1; stopTick(); initGame(); startPlaying();
          return;
        }
        game.ghost.vy = TAP_IMPULSE;
        game.ghost.vx = (clientX - game.ghost.x) * 0.8;
        playTap();
      } else if (game.phase === 'tutorial') {
        const clientY = e instanceof TouchEvent ? e.touches[0].clientY : (e as MouseEvent).clientY;
        if (clientX > game.W - 80 && clientY < 45) {
          game.tutorialStep = -1; stopTick(); initGame(); startPlaying();
        }
      }
      initAudio();
    };

    canvas.addEventListener('touchstart', handleTap, { passive: false });
    canvas.addEventListener('click', handleTap);

    let lastTime = performance.now(); let animId: number;

    function updateGhostPhysics(dt: number, gravityMod?: number) {
      const game = g.current;
      const grav = gravityMod || (GRAVITY + Math.min(game.gearsCleared * 3, 200));
      game.ghost.vy += grav * dt;
      if (game.ghost.vy > TERMINAL_VEL) game.ghost.vy = TERMINAL_VEL;
      game.ghost.y += game.ghost.vy * dt;
      game.ghost.x += game.ghost.vx * dt;
      game.ghost.vx *= 0.95;
      game.ghost.x = Math.max(game.ghost.r, Math.min(game.W - game.ghost.r, game.ghost.x));
      game.ghost.trail.push({ x: game.ghost.x, y: game.ghost.y, life: 0.3 });
      if (game.ghost.trail.length > 15) game.ghost.trail.shift();
      for (const t of game.ghost.trail) t.life -= dt;
    }

    function die() {
      const game = g.current;
      game.phase = 'dead'; game.deadTimer = 0;
      playClank();
      game.screenShake = { timer: 0.2, intensity: 4 };
      stopTick();
      spawnParticles(game.ghost.x, game.ghost.y, game.currentPhaseColor, 12);
    }

    function regenerateGears() {
      const game = g.current;
      for (const gear of game.gears) {
        if (!gear.passed) {
          const otherColors = PHASE_COLORS.filter(c => c !== game.currentPhaseColor);
          const matchCount = gear.index < 20 ? 2 : 1;
          const matchIndices: number[] = [];
          while (matchIndices.length < matchCount) {
            const idx = Math.floor(Math.random() * gear.numSegments);
            if (!matchIndices.includes(idx)) matchIndices.push(idx);
          }
          for (let i = 0; i < gear.numSegments; i++) {
            gear.segments[i] = matchIndices.includes(i) ? game.currentPhaseColor : otherColors[Math.floor(Math.random() * otherColors.length)];
          }
        }
      }
    }

    function update(dt: number) {
      const game = g.current;
      if (game.phase === 'start') { game.gameTime += dt; return; }
      game.gameTime += dt;

      if (game.phase === 'tutorial') { updateTutorial(dt); return; }

      if (game.phase === 'dead') {
        game.deadTimer += dt;
        game.ghost.vy += 300 * dt;
        game.ghost.y += game.ghost.vy * dt;
        if (game.deadTimer >= 1.5) {
          game.phase = 'over';
          setScore(game.score); setFinalGears(game.gearsCleared); setFinalMultiplier(game.multiplier);
          setGameState('gameover');
          if (game.score >= 1) fetch('/api/pixelpit/stats', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ game: GAME_ID }) }).catch(() => {});
        }
        return;
      }

      if (game.phase !== 'playing') return;

      updateGhostPhysics(dt);

      if (game.ghost.y < game.cameraY - 100) { die(); return; }

      for (const gear of game.gears) gear.angle += gear.speed * dt;

      for (const gear of game.gears) {
        if (gear.passed) continue;
        const gy = getGearWorldY(gear);
        if (Math.abs(game.ghost.y - gy) > GEAR_OUTER_R + game.ghost.r) continue;
        const result = checkGearCollision(game.ghost, gear, game.currentPhaseColor);
        if (result === 'phase') {
          gear.passed = true; game.gearsCleared++; game.score += game.multiplier;
          playPhaseThrough(game.currentPhaseColor);
          spawnParticles(game.ghost.x, game.ghost.y, game.currentPhaseColor, 8);
          if (game.gearsCleared > 0 && game.gearsCleared % 10 === 0 && game.phaseShiftWarning === 0 && !game.nextPhaseColor) {
            const available = PHASE_COLORS.filter(c => c !== game.currentPhaseColor);
            game.nextPhaseColor = available[Math.floor(Math.random() * available.length)];
            game.phaseShiftWarning = 1.5; game.phaseShiftTimer = 0;
          }
          startTick(60 + Math.min(game.gearsCleared * 2, 120));
        }
        if (result === 'hit') { die(); return; }
      }

      // phase shift
      if (game.phaseShiftWarning > 0) {
        game.phaseShiftWarning -= dt; game.phaseShiftTimer += dt;
        if (game.phaseShiftWarning <= 0) {
          game.currentPhaseColor = game.nextPhaseColor!;
          game.nextPhaseColor = null; game.phaseShiftWarning = 0; game.phaseShiftTimer = 0;
          game.invertFlash = 0.05; game.multiplier++;
          playShift(); regenerateGears();
        }
      }

      game.borderPulse = (game.phaseShiftWarning > 0 && game.phaseShiftWarning <= 0.5) ? Math.sin(game.gameTime * 12) * 0.5 + 0.5 : 0;

      const targetCam = game.ghost.y - game.H * 0.35;
      game.cameraY += (targetCam - game.cameraY) * 3 * dt;

      const lastGear = game.gears[game.gears.length - 1];
      if (lastGear && getGearWorldY(lastGear) - game.cameraY < game.H + 200) game.gears.push(createGear(lastGear.index + 1));
      while (game.gears.length > 0 && getGearWorldY(game.gears[0]) < game.cameraY - 200) game.gears.shift();

      if (game.screenShake.timer > 0) game.screenShake.timer -= dt;
      if (game.invertFlash > 0) game.invertFlash -= dt;

      for (let i = game.particles.length - 1; i >= 0; i--) {
        const p = game.particles[i]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt;
        if (p.life <= 0) game.particles.splice(i, 1);
      }
    }

    function updateTutorial(dt: number) {
      const game = g.current;
      if (game.tutorialStep < 0 || game.tutorialStep >= TUTORIAL_STEPS.length) return;

      if (game.tutorialPhase === 'instruction') {
        game.tutorialTimer += dt;
        if (game.tutorialTimer >= 1.2) { game.tutorialPhase = 'playing'; game.tutorialTimer = 0; }
        return;
      }

      if (game.tutorialPhase === 'playing') {
        updateGhostPhysics(dt, 300);
        for (const gear of game.gears) gear.angle += gear.speed * dt;

        // step 3: trigger phase shift after first gear
        if (game.tutorialStep === 2 && game.tutorialGearsCleared === 1 && game.phaseShiftWarning === 0 && !game.nextPhaseColor) {
          game.nextPhaseColor = T.fuchsia; game.phaseShiftWarning = 1.5; game.phaseShiftTimer = 0;
        }

        if (game.phaseShiftWarning > 0) {
          game.phaseShiftWarning -= dt; game.phaseShiftTimer += dt;
          if (game.phaseShiftWarning <= 0) {
            game.currentPhaseColor = game.nextPhaseColor!;
            game.nextPhaseColor = null; game.phaseShiftWarning = 0; game.phaseShiftTimer = 0;
            game.invertFlash = 0.05; playShift();
            for (const gear of game.gears) {
              if (!gear.passed) {
                const otherColors = PHASE_COLORS.filter(c => c !== game.currentPhaseColor);
                for (let i = 0; i < gear.numSegments; i++) {
                  gear.segments[i] = (i < 2) ? game.currentPhaseColor : otherColors[Math.floor(Math.random() * otherColors.length)];
                }
              }
            }
          }
        }

        game.borderPulse = (game.phaseShiftWarning > 0 && game.phaseShiftWarning <= 0.5) ? Math.sin(game.gameTime * 12) * 0.5 + 0.5 : 0;

        for (const gear of game.gears) {
          if (gear.passed) continue;
          const gy = getGearWorldY(gear);
          if (Math.abs(game.ghost.y - gy) > GEAR_OUTER_R + game.ghost.r) continue;
          const result = checkGearCollision(game.ghost, gear, game.currentPhaseColor);
          if (result === 'phase') {
            gear.passed = true; game.tutorialGearsCleared++;
            playPhaseThrough(game.currentPhaseColor);
            spawnParticles(game.ghost.x, game.ghost.y, game.currentPhaseColor, 8);
          }
          if (result === 'hit') {
            game.ghost.vy = TAP_IMPULSE * 0.5;
            game.screenShake = { timer: 0.1, intensity: 2 };
            playClank(); break;
          }
        }

        const targetCam = game.ghost.y - game.H * 0.35;
        game.cameraY += (targetCam - game.cameraY) * 3 * dt;
        if (game.screenShake.timer > 0) game.screenShake.timer -= dt;
        if (game.invertFlash > 0) game.invertFlash -= dt;
        for (let i = game.particles.length - 1; i >= 0; i--) {
          const p = game.particles[i]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt;
          if (p.life <= 0) game.particles.splice(i, 1);
        }

        const target = TUTORIAL_STEPS[game.tutorialStep].gearCount;
        if (game.tutorialGearsCleared >= target) {
          game.tutorialPhase = 'success'; game.tutorialTimer = 0; playLevelUp();
        }
        return;
      }

      if (game.tutorialPhase === 'success') {
        game.tutorialTimer += dt;
        const delay = game.tutorialStep === TUTORIAL_STEPS.length - 1 ? 1.0 : 0.6;
        if (game.tutorialTimer >= delay) {
          game.tutorialStep++;
          if (game.tutorialStep >= TUTORIAL_STEPS.length) {
            game.tutorialStep = -1; stopTick(); initGame(); startPlaying();
          } else {
            game.tutorialPhase = 'instruction'; game.tutorialTimer = 0;
            setupTutorialStep(game.tutorialStep);
          }
        }
      }
    }

    function drawGearsAndGhost(ctx: CanvasRenderingContext2D) {
      const game = g.current;
      for (const gear of game.gears) {
        const gy = getGearWorldY(gear) - game.cameraY;
        if (gy < -80 || gy > game.H + 80) continue;
        const segAngle = (Math.PI * 2) / gear.numSegments;
        for (let i = 0; i < gear.numSegments; i++) {
          const startA = gear.angle + i * segAngle; const endA = startA + segAngle;
          ctx.fillStyle = gear.passed ? T.grey : gear.segments[i];
          ctx.globalAlpha = gear.passed ? 0.15 : 0.8;
          ctx.beginPath();
          ctx.arc(gear.x, gy, GEAR_OUTER_R, startA, endA);
          ctx.arc(gear.x, gy, GEAR_INNER_R, endA, startA, true);
          ctx.closePath(); ctx.fill();
          if (!gear.passed && gear.segments[i] === game.currentPhaseColor) {
            ctx.shadowBlur = 8; ctx.shadowColor = gear.segments[i]; ctx.fill(); ctx.shadowBlur = 0;
          }
        }
        ctx.globalAlpha = gear.passed ? 0.1 : 0.3;
        ctx.fillStyle = T.gear;
        ctx.beginPath(); ctx.arc(gear.x, gy, GEAR_INNER_R, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
      }

      // particles
      for (const p of game.particles) {
        const py = p.y - game.cameraY;
        ctx.globalAlpha = p.life / p.maxLife; ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.arc(p.x, py, p.r * (p.life / p.maxLife), 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;

      // trail
      for (const t of game.ghost.trail) {
        if (t.life <= 0) continue;
        const ty = t.y - game.cameraY;
        ctx.globalAlpha = t.life / 0.3 * 0.3; ctx.fillStyle = game.currentPhaseColor;
        ctx.beginPath(); ctx.arc(t.x, ty, game.ghost.r * 0.6, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;

      // ghost
      const gy = game.ghost.y - game.cameraY;
      let auraColor = game.currentPhaseColor;
      if (game.phaseShiftWarning > 0 && game.nextPhaseColor) {
        const t = Math.sin(game.phaseShiftTimer * 8) * 0.5 + 0.5;
        auraColor = lerpColor(game.currentPhaseColor, game.nextPhaseColor, t);
      }
      ctx.shadowBlur = 16; ctx.shadowColor = auraColor;
      ctx.fillStyle = auraColor; ctx.globalAlpha = 0.4;
      ctx.beginPath(); ctx.arc(game.ghost.x, gy, game.ghost.r + 4, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
      ctx.shadowColor = T.text; ctx.fillStyle = T.text;
      ctx.beginPath(); ctx.arc(game.ghost.x, gy, game.ghost.r, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = auraColor;
      ctx.beginPath(); ctx.arc(game.ghost.x, gy, game.ghost.r * 0.4, 0, Math.PI * 2); ctx.fill();
    }

    function draw() {
      const game = g.current;
      if (game.invertFlash > 0) { ctx!.fillStyle = T.text; ctx!.fillRect(0, 0, game.W, game.H); return; }
      if (game.phase === 'start' || game.phase === 'over') return;

      ctx!.fillStyle = T.bg; ctx!.fillRect(0, 0, game.W, game.H);

      // bg lines
      ctx!.strokeStyle = '#141414'; ctx!.lineWidth = 1;
      for (let x = game.W * 0.15; x <= game.W * 0.85; x += game.W * 0.35) {
        ctx!.beginPath(); ctx!.moveTo(x, 0); ctx!.lineTo(x, game.H); ctx!.stroke();
      }

      ctx!.save();
      if (game.screenShake.timer > 0) {
        const s = game.screenShake.intensity * (game.screenShake.timer / 0.2);
        ctx!.translate((Math.random() * 2 - 1) * s, (Math.random() * 2 - 1) * s);
      }
      drawGearsAndGhost(ctx!);
      ctx!.restore();

      // HUD
      if (game.phase === 'playing') {
        ctx!.fillStyle = T.text; ctx!.font = 'bold 28px monospace'; ctx!.textAlign = 'left';
        ctx!.fillText(game.score + '', 16, 40);
        ctx!.font = '14px monospace'; ctx!.fillStyle = T.grey;
        ctx!.fillText('gear ' + game.gearsCleared, 16, 60);
        if (game.multiplier > 1) {
          ctx!.fillStyle = game.currentPhaseColor; ctx!.font = 'bold 18px monospace'; ctx!.textAlign = 'right';
          ctx!.fillText(game.multiplier + 'x', game.W - 16, 40);
        }
      }

      // border pulse + warning text
      if (game.borderPulse > 0 && game.nextPhaseColor) {
        ctx!.strokeStyle = game.nextPhaseColor; ctx!.lineWidth = 3;
        ctx!.globalAlpha = game.borderPulse * 0.6;
        ctx!.strokeRect(2, 2, game.W - 4, game.H - 4); ctx!.globalAlpha = 1;
      }
      if (game.phaseShiftWarning > 0 && game.nextPhaseColor) {
        ctx!.fillStyle = game.nextPhaseColor;
        ctx!.globalAlpha = 0.3 + Math.sin(game.gameTime * 6) * 0.15;
        ctx!.font = '12px monospace'; ctx!.textAlign = 'center';
        ctx!.fillText('PHASE SHIFT', game.W / 2, 30); ctx!.globalAlpha = 1;
      }

      // tutorial overlay
      if (game.phase === 'tutorial') {
        if (game.tutorialStep >= 0 && game.tutorialStep < TUTORIAL_STEPS.length) {
          // step counter
          ctx!.fillStyle = 'rgba(255,255,255,0.4)'; ctx!.font = '14px monospace'; ctx!.textAlign = 'left';
          ctx!.fillText((game.tutorialStep + 1) + '/' + TUTORIAL_STEPS.length, 16, 30);
          // instruction
          if (game.tutorialPhase === 'instruction' || game.tutorialPhase === 'playing') {
            ctx!.fillStyle = T.text; ctx!.font = 'bold 22px monospace'; ctx!.textAlign = 'center';
            ctx!.fillText(TUTORIAL_STEPS[game.tutorialStep].instruction, game.W / 2, 50);
          }
          // success
          if (game.tutorialPhase === 'success') {
            ctx!.fillStyle = T.slime; ctx!.font = 'bold 36px monospace'; ctx!.textAlign = 'center';
            ctx!.shadowBlur = 12; ctx!.shadowColor = T.slime;
            ctx!.fillText(TUTORIAL_STEPS[game.tutorialStep].successText, game.W / 2, game.H / 2 - 20);
            ctx!.shadowBlur = 0;
          }
          // skip
          ctx!.fillStyle = 'rgba(255,255,255,0.3)'; ctx!.font = '14px monospace'; ctx!.textAlign = 'right';
          ctx!.fillText('SKIP >', game.W - 16, 30);
        }
      }

      // dead overlay
      if (game.phase === 'dead') {
        const t = Math.min(game.deadTimer / 1.0, 1);
        ctx!.fillStyle = `rgba(0,0,0,${t * 0.6})`; ctx!.fillRect(0, 0, game.W, game.H);
        ctx!.fillStyle = T.text; ctx!.font = 'bold 32px monospace'; ctx!.textAlign = 'center';
        ctx!.fillText('CLANK', game.W / 2, game.H / 2 - 10);
      }

      ctx!.textAlign = 'left';
    }

    function loop(ts: number) {
      const dt = Math.min((ts - lastTime) / 1000, 0.05); lastTime = ts;
      if (g.current.running) { update(dt); draw(); }
      animId = requestAnimationFrame(loop);
    }
    animId = requestAnimationFrame(loop);

    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', resize); canvas.removeEventListener('touchstart', handleTap); canvas.removeEventListener('click', handleTap); stopTick(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initAudio, initGame, playPhaseThrough, playClank, playShift, playTap, playLevelUp, startTick, stopTick, spawnParticles, startPlaying, setupTutorialStep]);

  return (
    <>
      <Script src="/pixelpit/social.js" strategy="lazyOnload" onLoad={() => setSocialLoaded(true)} />
      <canvas ref={canvasRef} style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', display: 'block', background: T.bg, touchAction: 'none' }} />

      {gameState === 'start' && (
        <div style={{ position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: COLORS.bg, zIndex: 100, textAlign: 'center', padding: 40 }}>
          <div style={{ background: COLORS.surface, border: '1px solid rgba(255,255,255,0.05)', padding: '50px 60px', boxShadow: '0 20px 60px rgba(0,0,0,0.5)', borderRadius: 16 }}>
            <div style={{ width: 20, height: 20, borderRadius: '50%', background: T.cyan, margin: '0 auto 20px', boxShadow: `0 0 16px ${T.cyan}` }} />
            <h1 style={{ fontFamily: 'ui-monospace, monospace', fontSize: 64, fontWeight: 300, color: T.cyan, marginBottom: 20, letterSpacing: 8, textShadow: `0 0 40px rgba(34,211,238,0.4)` }}>PHASE</h1>
            <p style={{ fontSize: 14, fontFamily: 'ui-monospace, monospace', color: COLORS.secondary, marginBottom: 35, lineHeight: 1.8, letterSpacing: 2 }}>
              tap to float through gears<br />match your color to phase through<br />wrong color = clank
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
              <button onClick={startPlaying} style={{ background: T.cyan, color: COLORS.bg, border: 'none', padding: '16px 50px', fontSize: 16, fontFamily: 'ui-monospace, monospace', fontWeight: 600, cursor: 'pointer', borderRadius: 8, letterSpacing: 2, boxShadow: `0 8px 30px rgba(34,211,238,0.3)` }}>play</button>
              <button onClick={startTutorial} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: COLORS.muted, padding: '12px 40px', fontSize: 13, fontFamily: 'ui-monospace, monospace', cursor: 'pointer', borderRadius: 6, letterSpacing: 2 }}>tutorial</button>
            </div>
          </div>
          <div style={{ marginTop: 30, fontSize: 12, fontFamily: 'ui-monospace, monospace', letterSpacing: 3 }}>
            <span style={{ color: T.cyan }}>pixel</span><span style={{ color: COLORS.secondary }}>pit</span><span style={{ color: COLORS.text, opacity: 0.4 }}> arcade</span>
          </div>
        </div>
      )}

      {gameState === 'gameover' && (
        <div style={{ position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: COLORS.bg, zIndex: 100, textAlign: 'center', padding: 40 }}>
          <h1 style={{ fontFamily: 'ui-monospace, monospace', fontSize: 28, fontWeight: 300, color: T.fuchsia, marginBottom: 15, letterSpacing: 6 }}>clank</h1>
          <div style={{ fontFamily: 'ui-monospace, monospace', fontSize: 80, fontWeight: 200, color: T.cyan, marginBottom: 10, textShadow: `0 0 40px rgba(34,211,238,0.4)` }}>{score}</div>
          <div style={{ fontFamily: 'ui-monospace, monospace', fontSize: 14, color: COLORS.muted, marginBottom: 30 }}>gears: {finalGears} · {finalMultiplier}x multiplier</div>
          <ScoreFlow score={score} gameId={GAME_ID} colors={SCORE_FLOW_COLORS} maxScore={100} onRankReceived={(rank, entryId) => setSubmittedEntryId(entryId ?? null)} onProgression={(prog) => setProgression(prog)} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 15, alignItems: 'center' }}>
            <button onClick={startPlaying} style={{ background: T.cyan, color: COLORS.bg, border: 'none', borderRadius: 8, padding: '16px 50px', fontSize: 15, fontFamily: 'ui-monospace, monospace', fontWeight: 600, cursor: 'pointer', boxShadow: `0 8px 25px rgba(34,211,238,0.3)`, letterSpacing: 2 }}>play again</button>
            <button onClick={() => setGameState('leaderboard')} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, color: COLORS.muted, padding: '14px 35px', fontSize: 11, fontFamily: 'ui-monospace, monospace', cursor: 'pointer', letterSpacing: 2 }}>leaderboard</button>
            {user ? (
              <button onClick={() => setShowShareModal(true)} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, color: COLORS.muted, padding: '14px 35px', fontSize: 11, fontFamily: 'ui-monospace, monospace', cursor: 'pointer', letterSpacing: 2 }}>share / groups</button>
            ) : (
              <ShareButtonContainer id="share-btn-container" url={typeof window !== 'undefined' ? `${window.location.origin}/pixelpit/arcade/phase/share/${score}` : ''} text={`I scored ${score} on PHASE! Can you beat me?`} style="minimal" socialLoaded={socialLoaded} />
            )}
          </div>
        </div>
      )}

      {gameState === 'leaderboard' && <Leaderboard gameId={GAME_ID} limit={8} entryId={submittedEntryId ?? undefined} colors={LEADERBOARD_COLORS} onClose={() => setGameState('gameover')} groupsEnabled={true} gameUrl={GAME_URL} socialLoaded={socialLoaded} />}
      {showShareModal && user && <ShareModal gameUrl={GAME_URL} score={score} colors={LEADERBOARD_COLORS} onClose={() => setShowShareModal(false)} />}
    </>
  );
}
