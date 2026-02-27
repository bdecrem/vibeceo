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
  bg: '#09090b',
  surface: '#18181b',
  border: '#27272a',
  red: '#ef4444',
  blue: '#3b82f6',
  green: '#22c55e',
  white: '#ffffff',
  gold: '#facc15',
  muted: '#71717a',
  text: '#ffffff',
  absorber: '#18181b',
};

const COLORS = {
  bg: '#09090b', surface: '#18181b', primary: '#ffffff', secondary: '#facc15',
  text: '#ffffff', muted: '#71717a', error: '#ef4444',
};

const SCORE_FLOW_COLORS: ScoreFlowColors = { ...COLORS };
const LEADERBOARD_COLORS: LeaderboardColors = { ...COLORS };
const GAME_ID = 'glint';

// --- CONSTANTS ---
const SHARD_R = 8;
const SHARD_SPEED = 400;
const HIT_FREEZE_MS = 40;
const WALL_THICK = 12;
const TARGET_R = 18;
const TRAIL_MAX = 60;
const BOUNCE_LIMIT = 20;

interface Wall {
  x: number; y: number; w: number; h: number;
  color: 'red' | 'blue' | 'green' | 'absorber' | 'neutral';
  moving?: boolean; moveAxis?: 'x' | 'y'; moveRange?: number; moveSpeed?: number;
  baseX?: number; baseY?: number;
}
interface Shard { x: number; y: number; vx: number; vy: number; launched: boolean; alive: boolean; }
interface Target { x: number; y: number; }
interface Particle { x: number; y: number; vx: number; vy: number; life: number; maxLife: number; color: string; size: number; }
interface TrailPt { x: number; y: number; }

interface GameState {
  shard: Shard | null;
  trail: TrailPt[];
  walls: Wall[];
  target: Target | null;
  particles: Particle[];
  level: number;
  score: number;
  bestScore: number;
  bounces: number;
  phase: 'start' | 'aiming' | 'flying' | 'dying' | 'cleared' | 'over' | 'tutorial';
  aimAngle: number;
  aiming: boolean;
  hitFreeze: boolean;
  freezeTimer: number;
  screenShake: number;
  flashTimer: number;
  flashColor: string;
  gameTime: number;
  shardStart: { x: number; y: number };
  par: number;
  colorsCollected: { red: boolean; blue: boolean; green: boolean };
  shotsThisLevel: number;
  deathTimer: number;
  desatTimer: number;
  celebTimer: number;
  W: number;
  H: number;
  safeTop: number;
  running: boolean;
  audioCtx: AudioContext | null;
  // Tutorial
  tutActive: boolean;
  tutStep: number;
  tutSuccess: boolean;
  tutSuccessTimer: number;
  tutCleared: boolean;
}

export default function GlintGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<'start' | 'playing' | 'tutorial' | 'gameover' | 'leaderboard'>('start');
  const [score, setScore] = useState(0);
  const [finalLevel, setFinalLevel] = useState(0);
  const [socialLoaded, setSocialLoaded] = useState(false);
  const [submittedEntryId, setSubmittedEntryId] = useState<number | null>(null);
  const [progression, setProgression] = useState<ProgressionResult | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const { user } = usePixelpitSocial(socialLoaded);
  const GAME_URL = typeof window !== 'undefined' ? `${window.location.origin}/pixelpit/arcade/glint` : 'https://pixelpit.gg/pixelpit/arcade/glint';

  useEffect(() => {
    if (!socialLoaded || typeof window === 'undefined' || !window.PixelpitSocial) return;
    const params = new URLSearchParams(window.location.search);
    if (params.has('logout')) {
      window.PixelpitSocial.logout(); params.delete('logout');
      window.history.replaceState({}, '', params.toString() ? `${window.location.pathname}?${params.toString()}` : window.location.pathname);
      window.location.reload(); return;
    }
    const groupCode = window.PixelpitSocial.getGroupCodeFromUrl();
    if (groupCode) window.PixelpitSocial.storeGroupCode(groupCode);
  }, [socialLoaded]);

  const g = useRef<GameState>({
    shard: null, trail: [], walls: [], target: null, particles: [],
    level: 0, score: 0, bestScore: 0, bounces: 0, phase: 'start',
    aimAngle: 0, aiming: false,
    hitFreeze: false, freezeTimer: 0,
    screenShake: 0, flashTimer: 0, flashColor: T.white,
    gameTime: 0, shardStart: { x: 0, y: 0 }, par: 2,
    colorsCollected: { red: false, blue: false, green: false },
    shotsThisLevel: 0, deathTimer: 0, desatTimer: 0, celebTimer: 0,
    W: 0, H: 0, safeTop: 0, running: false, audioCtx: null,
    tutActive: false, tutStep: 0, tutSuccess: false, tutSuccessTimer: 0, tutCleared: false,
  });

  const initAudio = useCallback(() => {
    const game = g.current;
    if (!game.audioCtx) game.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    if (game.audioCtx.state === 'suspended') game.audioCtx.resume();
  }, []);

  const setupLevel = useCallback((lvl: number) => {
    const game = g.current;
    game.level = lvl;
    const gen = generateLevel(lvl, game.W, game.H, game.safeTop);
    game.walls = gen.walls;
    game.shardStart = gen.shardStart;
    game.target = gen.target;
    game.par = gen.par;
    game.bounces = 0;
    game.shotsThisLevel = 0;
    game.colorsCollected = { red: false, blue: false, green: false };
    game.trail = [];
    game.particles = [];
    game.shard = { x: gen.shardStart.x, y: gen.shardStart.y, vx: 0, vy: 0, launched: false, alive: true };
    game.phase = 'aiming';
    game.hitFreeze = false; game.freezeTimer = 0;
    game.flashTimer = 0; game.celebTimer = 0; game.desatTimer = 0;
  }, []);

  const startGame = useCallback(() => {
    initAudio();
    const game = g.current;
    game.level = 0; game.score = 0; game.gameTime = 0;
    game.bestScore = parseInt(localStorage.getItem('glint_best') || '0');
    game.tutActive = false;
    game.running = true;
    setupLevel(1);
    setGameState('playing'); setShowShareModal(false); setProgression(null);
  }, [initAudio, setupLevel]);

  const startTutorial = useCallback(() => {
    initAudio();
    const game = g.current;
    game.tutActive = true; game.tutStep = 0; game.tutSuccess = false; game.tutSuccessTimer = 0;
    game.level = 0; game.score = 0; game.gameTime = 0;
    game.screenShake = 0; game.flashTimer = 0;
    game.hitFreeze = false; game.freezeTimer = 0;
    game.deathTimer = 0; game.desatTimer = 0;
    game.running = true;
    setupTutStep(game, 0);
    game.phase = 'aiming';
    setGameState('tutorial');
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

    // --- Audio helpers ---
    function playBounce(color: string) {
      const ac = g.current.audioCtx; if (!ac) return;
      if (color === 'neutral') {
        const buf = ac.createBuffer(1, ac.sampleRate * 0.02, ac.sampleRate);
        const d = buf.getChannelData(0);
        for (let j = 0; j < d.length; j++) d[j] = (Math.random() * 2 - 1) * (1 - j / d.length) * 0.4;
        const src = ac.createBufferSource(); src.buffer = buf;
        const gn = ac.createGain(); gn.gain.value = 0.08;
        src.connect(gn).connect(ac.destination); src.start();
        return;
      }
      const freq = color === 'red' ? 261.63 : color === 'blue' ? 329.63 : 392.00;
      const o = ac.createOscillator(); o.type = 'triangle'; o.frequency.value = freq;
      const gn = ac.createGain(); gn.gain.setValueAtTime(0.15, ac.currentTime);
      gn.gain.linearRampToValueAtTime(0, ac.currentTime + 0.3);
      o.connect(gn).connect(ac.destination); o.start(); o.stop(ac.currentTime + 0.3);
    }

    function playChord() {
      const ac = g.current.audioCtx; if (!ac) return;
      [261.63, 329.63, 392.00, 523.25].forEach((freq, i) => {
        const t = ac.currentTime + i * 0.05;
        const o = ac.createOscillator(); o.type = 'sine'; o.frequency.value = freq;
        const gn = ac.createGain(); gn.gain.setValueAtTime(0.12, t);
        gn.gain.linearRampToValueAtTime(0, t + 0.6);
        o.connect(gn).connect(ac.destination); o.start(t); o.stop(t + 0.6);
      });
    }

    function playPrismExplode() {
      const ac = g.current.audioCtx; if (!ac) return;
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
        const t = ac.currentTime + i * 0.08;
        const o = ac.createOscillator(); o.type = 'sine'; o.frequency.value = freq;
        const gn = ac.createGain(); gn.gain.setValueAtTime(0.1, t);
        gn.gain.linearRampToValueAtTime(0, t + 0.4);
        o.connect(gn).connect(ac.destination); o.start(t); o.stop(t + 0.4);
      });
    }

    function playBuzz() {
      const ac = g.current.audioCtx; if (!ac) return;
      const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 80;
      const gn = ac.createGain(); gn.gain.setValueAtTime(0.12, ac.currentTime);
      gn.gain.linearRampToValueAtTime(0, ac.currentTime + 0.3);
      o.connect(gn).connect(ac.destination); o.start(); o.stop(ac.currentTime + 0.3);
    }

    function playAbsorb() {
      const ac = g.current.audioCtx; if (!ac) return;
      const o = ac.createOscillator(); o.type = 'sine';
      o.frequency.setValueAtTime(300, ac.currentTime);
      o.frequency.linearRampToValueAtTime(60, ac.currentTime + 0.2);
      const gn = ac.createGain(); gn.gain.setValueAtTime(0.1, ac.currentTime);
      gn.gain.linearRampToValueAtTime(0, ac.currentTime + 0.2);
      o.connect(gn).connect(ac.destination); o.start(); o.stop(ac.currentTime + 0.2);
    }

    function playLaunch() {
      const ac = g.current.audioCtx; if (!ac) return;
      const o = ac.createOscillator(); o.type = 'sine';
      o.frequency.setValueAtTime(200, ac.currentTime);
      o.frequency.linearRampToValueAtTime(500, ac.currentTime + 0.06);
      const gn = ac.createGain(); gn.gain.setValueAtTime(0.1, ac.currentTime);
      gn.gain.linearRampToValueAtTime(0, ac.currentTime + 0.08);
      o.connect(gn).connect(ac.destination); o.start(); o.stop(ac.currentTime + 0.08);
    }

    function playEdgeClick() {
      const ac = g.current.audioCtx; if (!ac) return;
      const buf = ac.createBuffer(1, ac.sampleRate * 0.02, ac.sampleRate);
      const d = buf.getChannelData(0);
      for (let j = 0; j < d.length; j++) d[j] = (Math.random() * 2 - 1) * (1 - j / d.length) * 0.5;
      const src = ac.createBufferSource(); src.buffer = buf;
      const gn = ac.createGain(); gn.gain.value = 0.06;
      src.connect(gn).connect(ac.destination); src.start();
    }

    // --- Tutorial steps ---
    const TUT_STEPS = [
      { name: 'AIM & LAUNCH', instruction: 'TAP TO AIM, RELEASE TO FIRE', check: (gm: GameState) => gm.tutCleared },
      { name: 'BOUNCE', instruction: 'BOUNCE OFF THE WALL', check: (gm: GameState) => gm.tutCleared },
      { name: 'COLLECT COLOR', instruction: 'HIT THE RED WALL FIRST', check: (gm: GameState) => gm.tutCleared },
      { name: 'MIX LIGHT', instruction: 'COLLECT ALL 3 COLORS', check: (gm: GameState) => gm.tutCleared },
      { name: 'AVOID BLACK', instruction: 'BLACK WALLS = DEATH', check: (gm: GameState) => gm.tutCleared },
    ];

    function advanceTutorial(game: GameState) {
      game.tutStep++;
      game.tutSuccess = false; game.tutSuccessTimer = 0;
      if (game.tutStep >= TUT_STEPS.length) {
        game.tutActive = false;
        game.level = 0; game.score = 0; game.gameTime = 0;
        game.bestScore = parseInt(localStorage.getItem('glint_best') || '0');
        setupLevel(1);
        game.running = true;
        setGameState('playing');
        return;
      }
      setupTutStep(game, game.tutStep);
      game.phase = 'aiming';
    }

    function tutResetShot(game: GameState) {
      setupTutStep(game, game.tutStep);
      game.phase = 'aiming';
    }

    function resetShot(game: GameState) {
      game.shard = { x: game.shardStart.x, y: game.shardStart.y, vx: 0, vy: 0, launched: false, alive: true };
      game.trail = [];
      game.bounces = 0;
      game.colorsCollected = { red: false, blue: false, green: false };
      game.phase = 'aiming';
    }

    function getShardColor(game: GameState): string {
      const r = game.colorsCollected.red, b = game.colorsCollected.blue, gr = game.colorsCollected.green;
      if (r && b && gr) return T.white;
      if (r && b) return '#c084fc';
      if (r && gr) return '#facc15';
      if (b && gr) return '#22d3ee';
      if (r) return T.red;
      if (b) return T.blue;
      if (gr) return T.green;
      return T.white;
    }

    function isWhiteLight(game: GameState): boolean {
      return game.colorsCollected.red && game.colorsCollected.blue && game.colorsCollected.green;
    }

    function spawnParticles(game: GameState, x: number, y: number, color: string, count: number, spdMult = 1) {
      for (let i = 0; i < count; i++) {
        const a = Math.random() * Math.PI * 2;
        const spd = (30 + Math.random() * 80) * spdMult;
        game.particles.push({ x, y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd, life: 0.3 + Math.random() * 0.4, maxLife: 0.3 + Math.random() * 0.4, color, size: 2 + Math.random() * 3 });
      }
    }

    function spawnRainbow(game: GameState, x: number, y: number, count: number) {
      const colors = [T.red, T.blue, T.green, T.gold, '#c084fc', '#22d3ee', T.white];
      for (let i = 0; i < count; i++) {
        const a = Math.random() * Math.PI * 2;
        const spd = 60 + Math.random() * 120;
        game.particles.push({ x, y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd, life: 0.5 + Math.random() * 0.5, maxLife: 0.5 + Math.random() * 0.5, color: colors[i % colors.length], size: 2 + Math.random() * 4 });
      }
    }

    function reflectShard(game: GameState, wall: Wall): boolean {
      const shard = game.shard!;
      const sx = shard.x, sy = shard.y;
      const wx = wall.x, wy = wall.y, ww = wall.w, wh = wall.h;
      const cx = Math.max(wx, Math.min(sx, wx + ww));
      const cy = Math.max(wy, Math.min(sy, wy + wh));
      const dx = sx - cx, dy = sy - cy;
      const dist = Math.hypot(dx, dy);
      if (dist > SHARD_R) return false;
      if (ww > wh) {
        shard.vy = -shard.vy;
        shard.y += (dy > 0 ? 1 : -1) * (SHARD_R - Math.abs(dy) + 1);
      } else {
        shard.vx = -shard.vx;
        shard.x += (dx > 0 ? 1 : -1) * (SHARD_R - Math.abs(dx) + 1);
      }
      return true;
    }

    function computeTrajectory(game: GameState, startX: number, startY: number, angle: number, maxBounces: number) {
      const points = [{ x: startX, y: startY }];
      let x = startX, y = startY;
      let vx = Math.cos(angle) * SHARD_SPEED;
      let vy = Math.sin(angle) * SHARD_SPEED;
      const dt = 0.002;
      let bouncesLeft = maxBounces;
      for (let step = 0; step < 600 && bouncesLeft >= 0; step++) {
        x += vx * dt; y += vy * dt;
        if (x < SHARD_R) { x = SHARD_R; vx = -vx; bouncesLeft--; points.push({ x, y }); continue; }
        if (x > game.W - SHARD_R) { x = game.W - SHARD_R; vx = -vx; bouncesLeft--; points.push({ x, y }); continue; }
        if (y < game.safeTop + SHARD_R) { y = game.safeTop + SHARD_R; vy = -vy; bouncesLeft--; points.push({ x, y }); continue; }
        if (y > game.H - SHARD_R) { y = game.H - SHARD_R; vy = -vy; bouncesLeft--; points.push({ x, y }); continue; }
        for (const wall of game.walls) {
          const wcx = Math.max(wall.x, Math.min(x, wall.x + wall.w));
          const wcy = Math.max(wall.y, Math.min(y, wall.y + wall.h));
          const ddx = x - wcx, ddy = y - wcy;
          if (Math.hypot(ddx, ddy) <= SHARD_R) {
            if (wall.w > wall.h) { vy = -vy; y += (ddy > 0 ? 1 : -1) * 2; }
            else { vx = -vx; x += (ddx > 0 ? 1 : -1) * 2; }
            bouncesLeft--; points.push({ x, y }); break;
          }
        }
      }
      if (points.length < 2 || (points[points.length - 1].x !== x || points[points.length - 1].y !== y)) {
        points.push({ x, y });
      }
      return points;
    }

    // --- Update ---
    function update(dt: number) {
      const game = g.current;
      if (game.phase === 'start' || game.phase === 'over') return;
      game.gameTime += dt;

      // Hit freeze
      if (game.hitFreeze) {
        game.freezeTimer -= dt;
        if (game.freezeTimer <= 0) game.hitFreeze = false;
        return;
      }

      // Moving walls
      for (const wall of game.walls) {
        if (wall.moving && wall.baseX !== undefined && wall.baseY !== undefined) {
          const offset = Math.sin(game.gameTime * (wall.moveSpeed || 1) * Math.PI * 2) * (wall.moveRange || 0);
          if (wall.moveAxis === 'x') wall.x = wall.baseX + offset;
          else wall.y = wall.baseY + offset;
        }
      }

      // Shard physics
      if (game.phase === 'flying' && game.shard && game.shard.alive) {
        const shard = game.shard;
        shard.x += shard.vx * dt;
        shard.y += shard.vy * dt;

        game.trail.push({ x: shard.x, y: shard.y });
        if (game.trail.length > TRAIL_MAX) game.trail.shift();

        // Screen edge bounces (free, don't count)
        let edgeBounced = false;
        if (shard.x < SHARD_R) { shard.x = SHARD_R; shard.vx = Math.abs(shard.vx); edgeBounced = true; }
        if (shard.x > game.W - SHARD_R) { shard.x = game.W - SHARD_R; shard.vx = -Math.abs(shard.vx); edgeBounced = true; }
        if (shard.y < game.safeTop + SHARD_R) { shard.y = game.safeTop + SHARD_R; shard.vy = Math.abs(shard.vy); edgeBounced = true; }
        if (shard.y > game.H - SHARD_R) { shard.y = game.H - SHARD_R; shard.vy = -Math.abs(shard.vy); edgeBounced = true; }
        if (edgeBounced) {
          game.screenShake = 0.04;
          spawnParticles(game, shard.x, shard.y, T.muted, 2);
          playEdgeClick();
        }

        // Wall collisions
        for (const wall of game.walls) {
          if (reflectShard(game, wall)) {
            if (wall.color === 'absorber') {
              if (game.tutActive) {
                spawnParticles(game, shard.x, shard.y, T.muted, 8);
                playAbsorb(); game.screenShake = 0.06;
                tutResetShot(game); return;
              }
              game.phase = 'dying' as any; game.deathTimer = 0.3;
              spawnParticles(game, shard.x, shard.y, T.muted, 12);
              playAbsorb(); game.screenShake = 0.1;
              return;
            }
            game.bounces++;
            game.hitFreeze = true; game.freezeTimer = HIT_FREEZE_MS / 1000;
            game.screenShake = 0.05;
            if (wall.color === 'red' || wall.color === 'blue' || wall.color === 'green') {
              const wasNew = !game.colorsCollected[wall.color];
              game.colorsCollected[wall.color] = true;
              const wallColor = wall.color === 'red' ? T.red : wall.color === 'blue' ? T.blue : T.green;
              spawnParticles(game, shard.x, shard.y, wallColor, 7);
              playBounce(wall.color);
              if (wasNew && isWhiteLight(game)) {
                playChord(); game.flashTimer = 0.15; game.flashColor = T.white; game.screenShake = 0.1;
              }
            } else {
              spawnParticles(game, shard.x, shard.y, T.muted, 4);
              playBounce('neutral');
            }
            break;
          }
        }

        // Target collision
        if (shard.alive && game.target) {
          const tdx = shard.x - game.target.x, tdy = shard.y - game.target.y;
          if (Math.hypot(tdx, tdy) < TARGET_R + SHARD_R) {
            if (isWhiteLight(game)) {
              if (game.tutActive) game.tutCleared = true;
              game.phase = 'cleared' as any; game.celebTimer = 0;
              const bounceScore = Math.max(1, (game.par + 2 - game.bounces)) * 10;
              const levelBonus = game.level * 5;
              game.score += bounceScore + levelBonus;
              spawnRainbow(game, game.target.x, game.target.y, 30);
              playPrismExplode();
              game.flashTimer = 0.2; game.flashColor = T.white; game.screenShake = 0.15;
            } else {
              const tdist = Math.hypot(tdx, tdy);
              const nx = tdx / tdist, ny = tdy / tdist;
              shard.vx = nx * SHARD_SPEED; shard.vy = ny * SHARD_SPEED;
              shard.x = game.target.x + nx * (TARGET_R + SHARD_R + 2);
              shard.y = game.target.y + ny * (TARGET_R + SHARD_R + 2);
              game.bounces++; playBuzz();
              game.screenShake = 0.08; game.flashTimer = 0.1; game.flashColor = T.red; game.desatTimer = 0.15;
              spawnParticles(game, game.target.x, game.target.y, T.muted, 6);
            }
          }
        }

        // Bounce limit
        if (game.bounces >= BOUNCE_LIMIT && shard.alive) {
          shard.alive = false;
          if (game.tutActive) { tutResetShot(game); playBuzz(); }
          else { resetShot(game); playBuzz(); }
        }
      }

      // Dying
      if ((game.phase as string) === 'dying') {
        game.deathTimer -= dt;
        for (const p of game.particles) { p.x += p.vx * dt * 0.3; p.y += p.vy * dt * 0.3; p.life -= dt; }
        game.particles = game.particles.filter(p => p.life > 0);
        if (game.screenShake > 0) game.screenShake -= dt * 2;
        if (game.deathTimer <= 0) {
          if (game.shard) game.shard.alive = false;
          game.phase = 'over';
          game.running = false;
          if (game.score >= game.bestScore) {
            game.bestScore = game.score;
            localStorage.setItem('glint_best', String(game.bestScore));
          }
          setScore(game.score); setFinalLevel(game.level); setGameState('gameover');
          fetch('/api/pixelpit/stats', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ game: GAME_ID }) }).catch(() => {});
        }
        return;
      }

      // Cleared
      if ((game.phase as string) === 'cleared') {
        game.celebTimer += dt;
        if (game.celebTimer > 2.2) {
          if (game.tutActive) {
            if (!game.tutSuccess) { game.tutSuccess = true; game.tutSuccessTimer = 1.2; }
            game.tutSuccessTimer -= dt;
            if (game.tutSuccessTimer <= 0) advanceTutorial(game);
          } else {
            setupLevel(game.level + 1);
          }
        }
      }

      if (game.screenShake > 0) game.screenShake -= dt * 2;
      if (game.flashTimer > 0) game.flashTimer -= dt;
      if (game.desatTimer > 0) game.desatTimer -= dt;

      // Particles
      for (const p of game.particles) { p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.98; p.vy *= 0.98; p.life -= dt; }
      game.particles = game.particles.filter(p => p.life > 0);

      // Tutorial check
      if (game.tutActive && !game.tutSuccess && TUT_STEPS[game.tutStep] && TUT_STEPS[game.tutStep].check(game)) {
        // Already handled in cleared logic
      }
    }

    // --- Draw ---
    function draw() {
      const game = g.current;
      if (game.phase === 'start' || game.phase === 'over') return;

      const sx = game.screenShake > 0 ? (Math.random() - 0.5) * 4 : 0;
      const sy = game.screenShake > 0 ? (Math.random() - 0.5) * 4 : 0;
      ctx!.save();
      ctx!.translate(sx, sy);

      ctx!.fillStyle = T.bg;
      ctx!.fillRect(-10, -10, game.W + 20, game.H + 20);

      // Flash
      if (game.flashTimer > 0) {
        ctx!.fillStyle = game.flashColor; ctx!.globalAlpha = game.flashTimer * 3;
        ctx!.fillRect(0, 0, game.W, game.H); ctx!.globalAlpha = 1;
      }

      // Desaturate overlay
      if (game.desatTimer > 0) {
        ctx!.fillStyle = '#333'; ctx!.globalAlpha = game.desatTimer * 3;
        ctx!.fillRect(0, 0, game.W, game.H); ctx!.globalAlpha = 1;
      }

      // Walls
      for (const wall of game.walls) {
        if (wall.color === 'absorber') {
          ctx!.fillStyle = T.absorber; ctx!.strokeStyle = T.muted; ctx!.lineWidth = 1;
          ctx!.fillRect(wall.x, wall.y, wall.w, wall.h);
          ctx!.strokeRect(wall.x, wall.y, wall.w, wall.h);
          ctx!.strokeStyle = T.muted; ctx!.globalAlpha = 0.3;
          const step = 8;
          ctx!.beginPath();
          for (let i = 0; i < wall.w + wall.h; i += step) {
            ctx!.moveTo(wall.x + Math.min(i, wall.w), wall.y + Math.max(0, i - wall.w));
            ctx!.lineTo(wall.x + Math.max(0, i - wall.h), wall.y + Math.min(i, wall.h));
          }
          ctx!.stroke(); ctx!.globalAlpha = 1;
        } else {
          const color = wall.color === 'red' ? T.red : wall.color === 'blue' ? T.blue : wall.color === 'green' ? T.green : T.muted;
          ctx!.fillStyle = color; ctx!.shadowColor = color; ctx!.shadowBlur = 14;
          ctx!.fillRect(wall.x, wall.y, wall.w, wall.h); ctx!.shadowBlur = 0;
          ctx!.strokeStyle = T.white; ctx!.globalAlpha = 0.3; ctx!.lineWidth = 1;
          ctx!.strokeRect(wall.x, wall.y, wall.w, wall.h); ctx!.globalAlpha = 1;
          const label = wall.color === 'red' ? 'R' : wall.color === 'blue' ? 'B' : wall.color === 'green' ? 'G' : '';
          if (label) {
            ctx!.fillStyle = T.white; ctx!.font = 'bold 10px monospace'; ctx!.textAlign = 'center';
            ctx!.fillText(label, wall.x + wall.w / 2, wall.y + wall.h / 2 + 4);
          }
        }
      }

      // Target (prism)
      if (game.target) {
        const shimmer = game.gameTime * 2;
        const pr = TARGET_R + Math.sin(game.gameTime * 4) * 2;
        const colors = [T.red, T.gold, T.green, '#22d3ee', T.blue, '#c084fc'];
        for (let i = 0; i < 6; i++) {
          const a = shimmer + i * Math.PI / 3;
          ctx!.fillStyle = colors[i]; ctx!.globalAlpha = 0.15;
          ctx!.beginPath();
          ctx!.arc(game.target.x + Math.cos(a) * 4, game.target.y + Math.sin(a) * 4, pr - 2, 0, Math.PI * 2);
          ctx!.fill();
        }
        ctx!.globalAlpha = 1;
        ctx!.strokeStyle = T.white; ctx!.lineWidth = 2;
        ctx!.beginPath(); ctx!.arc(game.target.x, game.target.y, pr, 0, Math.PI * 2); ctx!.stroke();
        ctx!.fillStyle = T.white; ctx!.globalAlpha = 0.2;
        ctx!.beginPath();
        ctx!.moveTo(game.target.x, game.target.y - pr * 0.6);
        ctx!.lineTo(game.target.x + pr * 0.5, game.target.y);
        ctx!.lineTo(game.target.x, game.target.y + pr * 0.6);
        ctx!.lineTo(game.target.x - pr * 0.5, game.target.y);
        ctx!.closePath(); ctx!.fill(); ctx!.globalAlpha = 1;
      }

      // Trail
      if (game.trail.length > 1) {
        const color = getShardColor(game);
        for (let i = 1; i < game.trail.length; i++) {
          const alpha = 0.3 + (i / game.trail.length) * 0.5;
          ctx!.strokeStyle = color; ctx!.globalAlpha = alpha; ctx!.lineWidth = 3;
          ctx!.beginPath();
          ctx!.moveTo(game.trail[i - 1].x, game.trail[i - 1].y);
          ctx!.lineTo(game.trail[i].x, game.trail[i].y);
          ctx!.stroke();
        }
        ctx!.globalAlpha = 1;
      }

      // Shard
      if (game.shard && (game.shard.alive || (game.phase as string) === 'dying')) {
        const color = (game.phase as string) === 'dying' ? T.muted : getShardColor(game);
        ctx!.fillStyle = color; ctx!.shadowColor = color; ctx!.shadowBlur = 12;
        ctx!.beginPath(); ctx!.arc(game.shard.x, game.shard.y, SHARD_R, 0, Math.PI * 2); ctx!.fill();
        ctx!.shadowBlur = 0;
        ctx!.fillStyle = T.white; ctx!.globalAlpha = 0.5;
        ctx!.beginPath(); ctx!.arc(game.shard.x - 1, game.shard.y - 1, SHARD_R * 0.4, 0, Math.PI * 2); ctx!.fill();
        ctx!.globalAlpha = 1;
      }

      // Aim line
      if (game.phase === 'aiming' && game.aiming && game.shard) {
        const points = computeTrajectory(game, game.shard.x, game.shard.y, game.aimAngle, 1);
        ctx!.strokeStyle = getShardColor(game); ctx!.globalAlpha = 0.5; ctx!.lineWidth = 1;
        ctx!.setLineDash([4, 6]);
        ctx!.beginPath(); ctx!.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) ctx!.lineTo(points[i].x, points[i].y);
        ctx!.stroke(); ctx!.setLineDash([]); ctx!.globalAlpha = 1;
      }

      // Particles
      for (const p of game.particles) {
        ctx!.globalAlpha = p.life / p.maxLife; ctx!.fillStyle = p.color;
        ctx!.beginPath(); ctx!.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx!.fill();
      }
      ctx!.globalAlpha = 1;

      // HUD
      if (!game.tutActive) {
        ctx!.fillStyle = T.text; ctx!.font = 'bold 16px monospace'; ctx!.textAlign = 'left';
        ctx!.fillText('LVL ' + game.level, 12, game.safeTop + 24);
        ctx!.textAlign = 'right';
        ctx!.fillText(String(game.score), game.W - 12, game.safeTop + 24);

        // Color dots
        const colorDots = [
          { c: T.red, collected: game.colorsCollected.red },
          { c: T.blue, collected: game.colorsCollected.blue },
          { c: T.green, collected: game.colorsCollected.green },
        ];
        for (let i = 0; i < 3; i++) {
          const dx = game.W / 2 + (i - 1) * 20, dy = game.safeTop + 20;
          ctx!.fillStyle = colorDots[i].c;
          ctx!.globalAlpha = colorDots[i].collected ? 1 : 0.2;
          ctx!.beginPath(); ctx!.arc(dx, dy, 5, 0, Math.PI * 2); ctx!.fill();
          if (colorDots[i].collected) {
            ctx!.shadowColor = colorDots[i].c; ctx!.shadowBlur = 6;
            ctx!.beginPath(); ctx!.arc(dx, dy, 5, 0, Math.PI * 2); ctx!.fill();
            ctx!.shadowBlur = 0;
          }
          const labels = ['R', 'B', 'G'];
          ctx!.fillStyle = colorDots[i].c;
          ctx!.globalAlpha = colorDots[i].collected ? 0.8 : 0.2;
          ctx!.font = '9px monospace'; ctx!.textAlign = 'center';
          ctx!.fillText(labels[i], dx, dy + 14);
        }
        ctx!.globalAlpha = 1;

        if ((game.phase === 'flying' || (game.phase as string) === 'cleared')) {
          ctx!.fillStyle = T.muted; ctx!.font = '12px monospace'; ctx!.textAlign = 'center';
          ctx!.fillText(game.bounces + ' bounces  PAR ' + game.par, game.W / 2, game.safeTop + 46);
        }
        ctx!.fillStyle = T.muted; ctx!.font = '11px monospace'; ctx!.textAlign = 'left';
        ctx!.fillText('SHOT ' + game.shotsThisLevel, 12, game.safeTop + 40);
        if (game.phase === 'aiming' || game.phase === 'flying') {
          ctx!.fillStyle = T.muted; ctx!.globalAlpha = 0.5; ctx!.font = '12px monospace'; ctx!.textAlign = 'left';
          ctx!.fillText('\u21BA RETRY', 12, game.H - 16); ctx!.globalAlpha = 1;
        }
      }

      // Level cleared overlay
      if ((game.phase as string) === 'cleared') {
        const t = Math.min(game.celebTimer / 0.3, 1);
        const c1 = 1.70158, c3 = c1 + 1;
        const scale = t < 1 ? 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2) : 1;
        ctx!.save();
        ctx!.translate(game.W / 2, game.H / 2 - 20); ctx!.scale(scale, scale);
        ctx!.fillStyle = T.white; ctx!.font = 'bold 28px monospace'; ctx!.textAlign = 'center';
        ctx!.fillText('REFRACTED!', 0, 0);
        ctx!.restore();
        const stars = game.bounces <= game.par ? 3 : game.bounces <= game.par + 2 ? 2 : 1;
        ctx!.fillStyle = T.gold; ctx!.font = '20px monospace'; ctx!.textAlign = 'center';
        ctx!.fillText('\u2605'.repeat(stars) + '\u2606'.repeat(3 - stars), game.W / 2, game.H / 2 + 15);
        ctx!.fillStyle = T.muted; ctx!.font = '12px monospace';
        ctx!.fillText(game.bounces + ' bounces (par ' + game.par + ')', game.W / 2, game.H / 2 + 38);
      }

      // Tutorial HUD
      if (game.tutActive) {
        const step = TUT_STEPS[game.tutStep];
        if (step) {
          ctx!.fillStyle = T.white; ctx!.font = 'bold 14px monospace'; ctx!.textAlign = 'center';
          ctx!.fillText(step.name, game.W / 2, game.safeTop + 24);
          ctx!.fillStyle = T.muted; ctx!.font = '12px monospace';
          ctx!.fillText(step.instruction, game.W / 2, game.safeTop + 42);
          for (let i = 0; i < TUT_STEPS.length; i++) {
            const dx = game.W / 2 + (i - 2) * 16, dy = game.H - 40;
            ctx!.fillStyle = i < game.tutStep ? T.white : i === game.tutStep ? T.text : T.muted;
            ctx!.beginPath(); ctx!.arc(dx, dy, i === game.tutStep ? 4 : 3, 0, Math.PI * 2); ctx!.fill();
          }
          ctx!.fillStyle = T.muted; ctx!.font = '11px monospace'; ctx!.textAlign = 'right';
          ctx!.fillText('SKIP \u25B8', game.W - 16, game.safeTop + 24);
          if (game.tutSuccess) {
            ctx!.fillStyle = T.white; ctx!.font = 'bold 24px monospace'; ctx!.textAlign = 'center';
            ctx!.shadowBlur = 12; ctx!.shadowColor = T.white;
            ctx!.fillText('NICE!', game.W / 2, game.H * 0.4); ctx!.shadowBlur = 0;
          }
        }
      }

      ctx!.restore();
    }

    // --- Input ---
    function isSkipTap(ex: number, ey: number) {
      return ex > g.current.W - 80 && ey < g.current.safeTop + 50;
    }

    function handleDown(e: PointerEvent) {
      e.preventDefault();
      const game = g.current;
      initAudio();

      if (game.tutActive && isSkipTap(e.clientX, e.clientY)) {
        game.tutActive = false;
        game.level = 0; game.score = 0; game.gameTime = 0;
        game.bestScore = parseInt(localStorage.getItem('glint_best') || '0');
        setupLevel(1); game.running = true;
        setGameState('playing');
        return;
      }

      if ((game.phase as string) === 'cleared') return;

      // Retry tap
      if ((game.phase === 'aiming' || game.phase === 'flying') && e.clientX < 90 && e.clientY > game.H - 40) {
        resetShot(game); return;
      }

      if (game.phase === 'aiming' && game.shard) {
        game.aiming = true;
        game.aimAngle = Math.atan2(e.clientY - game.shard.y, e.clientX - game.shard.x);
      }
    }

    function handleMove(e: PointerEvent) {
      e.preventDefault();
      const game = g.current;
      if (!game.aiming || !game.shard) return;
      game.aimAngle = Math.atan2(e.clientY - game.shard.y, e.clientX - game.shard.x);
    }

    function handleUp(e: PointerEvent) {
      e.preventDefault();
      const game = g.current;
      if (!game.aiming) return;
      game.aiming = false;
      if (game.phase === 'aiming' && game.shard) {
        game.shard.vx = Math.cos(game.aimAngle) * SHARD_SPEED;
        game.shard.vy = Math.sin(game.aimAngle) * SHARD_SPEED;
        game.shard.launched = true;
        game.phase = 'flying' as any;
        game.shotsThisLevel++;
        playLaunch();
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      const game = g.current;
      if (e.code === 'KeyR' && (game.phase === 'aiming' || game.phase === 'flying')) {
        resetShot(game);
      }
    }

    canvas.addEventListener('pointerdown', handleDown);
    canvas.addEventListener('pointermove', handleMove);
    canvas.addEventListener('pointerup', handleUp);
    canvas.addEventListener('pointercancel', handleUp as any);
    document.addEventListener('keydown', handleKeyDown);

    let lastTime = performance.now(); let animId: number;
    function loop(ts: number) {
      const dt = Math.min((ts - lastTime) / 1000, 0.05); lastTime = ts;
      if (g.current.running) { update(dt); draw(); }
      animId = requestAnimationFrame(loop);
    }
    animId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animId); window.removeEventListener('resize', resize);
      canvas.removeEventListener('pointerdown', handleDown);
      canvas.removeEventListener('pointermove', handleMove);
      canvas.removeEventListener('pointerup', handleUp);
      canvas.removeEventListener('pointercancel', handleUp as any);
      document.removeEventListener('keydown', handleKeyDown);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initAudio, setupLevel]);

  return (
    <>
      <Script src="/pixelpit/social.js" strategy="lazyOnload" onLoad={() => setSocialLoaded(true)} />
      <canvas ref={canvasRef} style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', display: 'block', background: T.bg, touchAction: 'none' }} />

      {gameState === 'start' && (
        <div style={{ position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: COLORS.bg, zIndex: 100, textAlign: 'center', padding: 40 }}>
          <div style={{ background: COLORS.surface, border: `1px solid ${T.border}`, padding: '50px 60px', borderRadius: 16 }}>
            {/* Prism icon */}
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" style={{ margin: '0 auto 12px', display: 'block' }}>
              <path d="M12 2L2 20h20L12 2z" fill="none" stroke={T.white} strokeWidth="1.5" />
              <path d="M12 8L8 16h8L12 8z" fill={T.white} fillOpacity="0.2" />
            </svg>
            <h1 style={{ fontFamily: 'ui-monospace, monospace', fontSize: 56, fontWeight: 700, color: T.white, marginBottom: 16, letterSpacing: 6 }}>GLINT</h1>
            <p style={{ fontSize: 14, fontFamily: 'ui-monospace, monospace', color: T.muted, marginBottom: 30, lineHeight: 1.8, letterSpacing: 1 }}>
              aim · bounce · refract
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
              <button onClick={startGame} style={{ background: T.white, color: T.bg, border: 'none', padding: '16px 50px', fontSize: 16, fontFamily: 'ui-monospace, monospace', fontWeight: 600, cursor: 'pointer', borderRadius: 8, letterSpacing: 2 }}>play</button>
              <button onClick={startTutorial} style={{ background: 'transparent', color: T.muted, border: `1px solid ${T.border}`, padding: '12px 35px', fontSize: 12, fontFamily: 'ui-monospace, monospace', cursor: 'pointer', borderRadius: 6, letterSpacing: 2 }}>tutorial</button>
            </div>
          </div>
          <div style={{ marginTop: 24, fontSize: 12, fontFamily: 'ui-monospace, monospace', letterSpacing: 3 }}>
            <span style={{ color: T.white }}>pixel</span><span style={{ color: T.gold }}>pit</span><span style={{ color: T.muted }}> arcade</span>
          </div>
        </div>
      )}

      {gameState === 'gameover' && (
        <div style={{ position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(9,9,11,0.85)', zIndex: 100, textAlign: 'center', padding: 40 }}>
          <h1 style={{ fontFamily: 'ui-monospace, monospace', fontSize: 14, fontWeight: 300, color: T.muted, marginBottom: 12, letterSpacing: 4 }}>ABSORBED</h1>
          <div style={{ fontFamily: 'ui-monospace, monospace', fontSize: 72, fontWeight: 700, color: T.white, marginBottom: 8 }}>{score}</div>
          <div style={{ fontFamily: 'ui-monospace, monospace', fontSize: 13, color: T.muted, marginBottom: 25 }}>level {finalLevel}</div>
          <ScoreFlow score={score} gameId={GAME_ID} colors={SCORE_FLOW_COLORS} maxScore={500} onRankReceived={(rank, entryId) => setSubmittedEntryId(entryId ?? null)} onProgression={(prog) => setProgression(prog)} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
            <button onClick={startGame} style={{ background: T.white, color: T.bg, border: 'none', borderRadius: 8, padding: '16px 50px', fontSize: 15, fontFamily: 'ui-monospace, monospace', fontWeight: 600, cursor: 'pointer', letterSpacing: 2 }}>play again</button>
            <button onClick={() => setGameState('leaderboard')} style={{ background: 'transparent', border: `1px solid ${T.border}`, borderRadius: 6, color: T.muted, padding: '14px 35px', fontSize: 11, fontFamily: 'ui-monospace, monospace', cursor: 'pointer', letterSpacing: 2 }}>leaderboard</button>
            {user ? (
              <button onClick={() => setShowShareModal(true)} style={{ background: 'transparent', border: `1px solid ${T.border}`, borderRadius: 6, color: T.muted, padding: '14px 35px', fontSize: 11, fontFamily: 'ui-monospace, monospace', cursor: 'pointer', letterSpacing: 2 }}>share / groups</button>
            ) : (
              <ShareButtonContainer id="share-btn-container" url={typeof window !== 'undefined' ? `${window.location.origin}/pixelpit/arcade/glint/share/${score}` : ''} text={`I scored ${score} on GLINT! Can you beat me?`} style="minimal" socialLoaded={socialLoaded} />
            )}
          </div>
        </div>
      )}

      {gameState === 'leaderboard' && <Leaderboard gameId={GAME_ID} limit={8} entryId={submittedEntryId ?? undefined} colors={LEADERBOARD_COLORS} onClose={() => setGameState('gameover')} groupsEnabled={true} gameUrl={GAME_URL} socialLoaded={socialLoaded} />}
      {showShareModal && user && <ShareModal gameUrl={GAME_URL} score={score} colors={LEADERBOARD_COLORS} onClose={() => setShowShareModal(false)} />}
    </>
  );
}

// --- Level generation ---
function generateLevel(lvl: number, W: number, H: number, safeTop: number) {
  const walls: Wall[] = [];
  const margin = 40;
  const playW = W - margin * 2;
  const playH = H - margin * 2 - safeTop;
  const ox = margin;
  const oy = margin + safeTop;
  const colors: Array<'red' | 'blue' | 'green'> = ['red', 'blue', 'green'];

  if (lvl <= 10) {
    const numAbsorbers = lvl >= 5 ? Math.min(3, Math.floor((lvl - 4) / 2)) : 0;
    const hasMoving = lvl >= 7;

    for (let i = 0; i < 3; i++) {
      const color = colors[i % 3];
      const isHoriz = Math.random() > 0.5;
      const wall: Wall = isHoriz
        ? { x: ox + playW * (0.2 + Math.random() * 0.5), y: oy + playH * (0.2 + i * 0.25 + Math.random() * 0.1), w: 60 + Math.random() * 40, h: WALL_THICK, color }
        : { x: ox + playW * (0.2 + i * 0.25 + Math.random() * 0.1), y: oy + playH * (0.2 + Math.random() * 0.5), w: WALL_THICK, h: 60 + Math.random() * 40, color };
      if (hasMoving && i === 2) {
        wall.moving = true; wall.moveAxis = isHoriz ? 'x' : 'y';
        wall.moveRange = 30 + Math.random() * 30; wall.moveSpeed = 0.8 + Math.random() * 0.6;
        wall.baseX = wall.x; wall.baseY = wall.y;
      }
      walls.push(wall);
    }

    for (let i = 0; i < numAbsorbers; i++) {
      const isHoriz = Math.random() > 0.5;
      walls.push({
        x: ox + playW * (0.15 + Math.random() * 0.6), y: oy + playH * (0.15 + Math.random() * 0.6),
        w: isHoriz ? 40 + Math.random() * 30 : WALL_THICK, h: isHoriz ? WALL_THICK : 40 + Math.random() * 30,
        color: 'absorber',
      });
    }
  } else {
    for (let i = 0; i < 3; i++) {
      const isHoriz = Math.random() > 0.5;
      const wall: Wall = {
        x: ox + playW * (0.15 + Math.random() * 0.6), y: oy + playH * (0.15 + Math.random() * 0.6),
        w: isHoriz ? 50 + Math.random() * 50 : WALL_THICK, h: isHoriz ? WALL_THICK : 50 + Math.random() * 50,
        color: colors[i],
      };
      if (Math.random() < 0.4) {
        wall.moving = true; wall.moveAxis = isHoriz ? 'x' : 'y';
        wall.moveRange = 30 + Math.random() * 40; wall.moveSpeed = 0.8 + Math.random() * 0.8;
        wall.baseX = wall.x; wall.baseY = wall.y;
      }
      walls.push(wall);
    }
    const numAbs = 1 + Math.floor(Math.random() * 3);
    for (let i = 0; i < numAbs; i++) {
      const isHoriz = Math.random() > 0.5;
      walls.push({
        x: ox + playW * (0.1 + Math.random() * 0.7), y: oy + playH * (0.1 + Math.random() * 0.7),
        w: isHoriz ? 35 + Math.random() * 40 : WALL_THICK, h: isHoriz ? WALL_THICK : 35 + Math.random() * 40,
        color: 'absorber',
      });
    }
  }

  const shardStart = { x: ox + 30 + Math.random() * 40, y: oy + playH * 0.7 + Math.random() * (playH * 0.2) };
  const target = { x: ox + playW * 0.65 + Math.random() * (playW * 0.25), y: oy + playH * 0.1 + Math.random() * (playH * 0.3) };

  for (const wall of walls) {
    if (Math.hypot(wall.x + wall.w / 2 - shardStart.x, wall.y + wall.h / 2 - shardStart.y) < 50) wall.y += 60;
    if (Math.hypot(wall.x + wall.w / 2 - target.x, wall.y + wall.h / 2 - target.y) < 50) wall.x -= 60;
  }

  const par = Math.max(2, 3 + 1);
  return { walls, shardStart, target, par };
}

function setupTutStep(game: any, step: number) {
  const margin = 40;
  const ox = margin, oy = margin + (game.safeTop || 0);
  const playW = (game.W || 400) - margin * 2, playH = (game.H || 700) - margin * 2 - (game.safeTop || 0);

  game.walls = []; game.trail = []; game.particles = []; game.bounces = 0;
  game.shotsThisLevel = 0; game.tutCleared = false;

  if (step === 0) {
    game.shardStart = { x: ox + 40, y: oy + playH * 0.7 };
    game.target = { x: ox + playW * 0.7, y: oy + playH * 0.3 };
    game.par = 1;
    game.colorsCollected = { red: true, blue: true, green: true };
  } else if (step === 1) {
    game.shardStart = { x: ox + 40, y: oy + playH * 0.7 };
    game.target = { x: ox + playW * 0.8, y: oy + playH * 0.2 };
    game.walls.push({ x: ox + playW * 0.45, y: oy + playH * 0.3, w: 80, h: WALL_THICK, color: 'neutral' });
    game.par = 2;
    game.colorsCollected = { red: true, blue: true, green: true };
  } else if (step === 2) {
    game.shardStart = { x: ox + 40, y: oy + playH * 0.7 };
    game.target = { x: ox + playW * 0.8, y: oy + playH * 0.2 };
    game.walls.push({ x: ox + playW * 0.4, y: oy + playH * 0.45, w: 70, h: WALL_THICK, color: 'red' });
    game.par = 2;
    game.colorsCollected = { red: false, blue: true, green: true };
  } else if (step === 3) {
    game.shardStart = { x: ox + 40, y: oy + playH * 0.8 };
    game.target = { x: ox + playW * 0.85, y: oy + playH * 0.15 };
    game.walls.push({ x: ox + playW * 0.25, y: oy + playH * 0.6, w: WALL_THICK, h: 60, color: 'red' });
    game.walls.push({ x: ox + playW * 0.5, y: oy + playH * 0.35, w: 70, h: WALL_THICK, color: 'blue' });
    game.walls.push({ x: ox + playW * 0.7, y: oy + playH * 0.55, w: WALL_THICK, h: 50, color: 'green' });
    game.par = 4;
    game.colorsCollected = { red: false, blue: false, green: false };
  } else if (step === 4) {
    game.shardStart = { x: ox + 40, y: oy + playH * 0.8 };
    game.target = { x: ox + playW * 0.85, y: oy + playH * 0.15 };
    game.walls.push({ x: ox + playW * 0.3, y: oy + playH * 0.55, w: WALL_THICK, h: 50, color: 'red' });
    game.walls.push({ x: ox + playW * 0.5, y: oy + playH * 0.3, w: 60, h: WALL_THICK, color: 'blue' });
    game.walls.push({ x: ox + playW * 0.7, y: oy + playH * 0.5, w: WALL_THICK, h: 50, color: 'green' });
    game.walls.push({ x: ox + playW * 0.45, y: oy + playH * 0.65, w: 50, h: WALL_THICK, color: 'absorber' });
    game.par = 4;
    game.colorsCollected = { red: false, blue: false, green: false };
  }

  game.shard = { x: game.shardStart.x, y: game.shardStart.y, vx: 0, vy: 0, launched: false, alive: true };
}
