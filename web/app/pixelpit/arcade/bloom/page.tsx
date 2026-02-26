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
  bg: '#f8fafc',
  surface: '#ffffff',
  border: '#334155',
  seed: '#22c55e',
  seedDark: '#15803d',
  gate: '#facc15',
  gateGlow: '#fde68a',
  thorn: '#ef4444',
  thornDark: '#991b1b',
  wall: '#94a3b8',
  wallDark: '#64748b',
  wallCrack: '#475569',
  root: '#92400e',
  rootGlow: '#a3e635',
  text: '#1e293b',
  muted: '#94a3b8',
  white: '#ffffff',
};

const COLORS = {
  bg: '#f8fafc', surface: '#ffffff', primary: '#22c55e', secondary: '#facc15',
  text: '#1e293b', muted: '#94a3b8', error: '#ef4444',
};

const SCORE_FLOW_COLORS: ScoreFlowColors = { ...COLORS };
const LEADERBOARD_COLORS: LeaderboardColors = { ...COLORS };
const GAME_ID = 'bloom';

// --- CONSTANTS ---
const SEED_R = 4;
const SEED_SPEED = 200;
const WIND_WOBBLE = 15;
const GATE_W = 60;
const GATE_H = 8;
const WALL_X_OFFSET = 60;
const SLING_X = 40;
const LAUNCH_SPEED = 300;
const ROOT_DURATION = 3;
const ROOT_BOOST = 1.5;

interface Seed {
  x: number; y: number; vx: number; vy: number;
  alive: boolean; phase: number; boosted: boolean; hitGates: Set<number>;
}
interface Gate { x: number; y: number; type: 'sun' | 'thorn'; mult: number; moving: boolean; }
interface Wall { x: number; hp: number; maxHP: number; cracking: number; }
interface Root { x: number; y: number; plantedLevel: number; }
interface Particle { x: number; y: number; vx: number; vy: number; life: number; maxLife: number; color: string; size: number; }

interface GameState {
  seeds: Seed[];
  gates: Gate[];
  wall: Wall;
  roots: Root[];
  particles: Particle[];
  level: number;
  score: number;
  bestScore: number;
  seedsLaunched: number;
  seedsAlive: number;
  phase: 'start' | 'aiming' | 'playing' | 'cleared' | 'over' | 'tutorial';
  aimAngle: number;
  aiming: boolean;
  aimStart: { x: number; y: number } | null;
  shotsLeft: number;
  screenShake: number;
  flashTimer: number;
  levelTimer: number;
  wallX: number;
  gameTime: number;
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
  tutWallCracked: boolean;
  tutSeedHitGate: boolean;
  tutSeedLaunched: boolean;
}

const TUT_STEPS = [
  { name: 'AIM & LAUNCH', instruction: 'DRAG BACK, RELEASE TO FIRE' },
  { name: 'MULTIPLY', instruction: 'AIM THROUGH THE GOLD GATE' },
  { name: 'PICK YOUR PATH', instruction: 'AVOID RED THORNS' },
  { name: 'ROOTS', instruction: 'SEEDS BOOST THROUGH GREEN' },
  { name: 'CRACK THE WALL', instruction: 'CLEAR THE LEVEL' },
];

export default function BloomGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<'start' | 'playing' | 'tutorial' | 'gameover' | 'leaderboard'>('start');
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(0);
  const [socialLoaded, setSocialLoaded] = useState(false);
  const [submittedEntryId, setSubmittedEntryId] = useState<number | null>(null);
  const [progression, setProgression] = useState<ProgressionResult | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const { user } = usePixelpitSocial(socialLoaded);
  const GAME_URL = typeof window !== 'undefined' ? `${window.location.origin}/pixelpit/arcade/bloom` : 'https://pixelpit.gg/pixelpit/arcade/bloom';

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
    seeds: [], gates: [], wall: { x: 0, hp: 0, maxHP: 0, cracking: 0 }, roots: [], particles: [],
    level: 0, score: 0, bestScore: 0, seedsLaunched: 0, seedsAlive: 0,
    phase: 'start', aimAngle: 0, aiming: false, aimStart: null,
    shotsLeft: 0, screenShake: 0, flashTimer: 0, levelTimer: 0, wallX: 0, gameTime: 0,
    W: 0, H: 0, safeTop: 0, running: false, audioCtx: null,
    tutActive: false, tutStep: 0, tutSuccess: false, tutSuccessTimer: 0,
    tutWallCracked: false, tutSeedHitGate: false, tutSeedLaunched: false,
  });

  const initAudio = useCallback(() => {
    const game = g.current;
    if (!game.audioCtx) game.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    if (game.audioCtx.state === 'suspended') game.audioCtx.resume();
  }, []);

  const setupLevel = useCallback((lvl: number) => {
    const game = g.current;
    game.level = lvl;
    game.seeds = [];
    game.gates = [];
    game.particles = [];
    game.seedsLaunched = 0;
    game.seedsAlive = 0;
    game.shotsLeft = Math.max(3, 6 - Math.floor(lvl / 5));
    game.wallX = game.W - WALL_X_OFFSET;
    const baseHP = 8 + lvl * 4 + Math.floor(lvl / 3) * 5;
    game.wall = { x: game.wallX, hp: baseHP, maxHP: baseHP, cracking: 0 };

    const gateZoneStart = SLING_X + 80;
    const gateZoneEnd = game.wallX - 40;
    const numColumns = 2 + Math.min(Math.floor(lvl / 3), 4);

    for (let col = 0; col < numColumns; col++) {
      const gx = gateZoneStart + (gateZoneEnd - gateZoneStart) * ((col + 0.5) / numColumns);
      const numGates = 2 + Math.floor(Math.random() * 2);
      const spacing = (game.H - 80) / (numGates + 1);

      for (let row = 0; row < numGates; row++) {
        const gy = 40 + spacing * (row + 1);
        const isThorn = lvl >= 4 && Math.random() < Math.min(0.15 + lvl * 0.02, 0.4);

        if (isThorn) {
          game.gates.push({ x: gx, y: gy, type: 'thorn', mult: 0, moving: lvl >= 15 });
        } else {
          const maxMult = lvl < 4 ? 2 : lvl < 9 ? 3 : 4;
          const mult = 2 + Math.floor(Math.random() * (maxMult - 1));
          game.gates.push({ x: gx, y: gy, type: 'sun', mult, moving: lvl >= 15 });
        }
      }
    }

    game.roots = game.roots.filter(r => lvl - r.plantedLevel < ROOT_DURATION);
    game.phase = 'aiming';
  }, []);

  const initGame = useCallback(() => {
    const game = g.current;
    game.seeds = []; game.gates = []; game.roots = []; game.particles = [];
    game.level = 0; game.score = 0;
    game.bestScore = parseInt(localStorage.getItem('bloom_best') || '0');
    game.aimAngle = 0; game.aiming = false; game.aimStart = null;
    game.screenShake = 0; game.flashTimer = 0; game.gameTime = 0;
    game.tutActive = false;
  }, []);

  const startGame = useCallback(() => {
    initAudio();
    const game = g.current;
    initGame();
    setupLevel(1);
    game.running = true;
    setGameState('playing'); setShowShareModal(false); setProgression(null);
  }, [initAudio, initGame, setupLevel]);

  const startTutorial = useCallback(() => {
    initAudio();
    const game = g.current;
    game.tutActive = true;
    game.tutStep = 0;
    game.tutSuccess = false;
    game.tutSuccessTimer = 0;
    game.level = 0;
    game.score = 0;
    game.seeds = []; game.gates = []; game.roots = []; game.particles = [];
    game.screenShake = 0; game.flashTimer = 0; game.gameTime = 0;
    game.phase = 'aiming';
    game.running = true;
    setupTutStep(game, 0);
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
    function playThwip() {
      const ac = g.current.audioCtx; if (!ac) return;
      const o = ac.createOscillator(); o.type = 'sine';
      o.frequency.setValueAtTime(200, ac.currentTime);
      o.frequency.linearRampToValueAtTime(600, ac.currentTime + 0.06);
      const gn = ac.createGain(); gn.gain.setValueAtTime(0.15, ac.currentTime);
      gn.gain.linearRampToValueAtTime(0, ac.currentTime + 0.08);
      o.connect(gn).connect(ac.destination); o.start(); o.stop(ac.currentTime + 0.08);
    }

    function playSplit(mult: number) {
      const ac = g.current.audioCtx; if (!ac) return;
      const freq = 400 + mult * 150;
      const o = ac.createOscillator(); o.type = 'triangle'; o.frequency.value = freq;
      const gn = ac.createGain(); gn.gain.setValueAtTime(0.1, ac.currentTime);
      gn.gain.linearRampToValueAtTime(0, ac.currentTime + 0.06);
      o.connect(gn).connect(ac.destination); o.start(); o.stop(ac.currentTime + 0.06);
    }

    function playThornHit() {
      const ac = g.current.audioCtx; if (!ac) return;
      const buf = ac.createBuffer(1, ac.sampleRate * 0.05, ac.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
      const src = ac.createBufferSource(); src.buffer = buf;
      const gn = ac.createGain(); gn.gain.value = 0.12;
      src.connect(gn).connect(ac.destination); src.start();
    }

    function playWallHit() {
      const ac = g.current.audioCtx; if (!ac) return;
      const o = ac.createOscillator(); o.type = 'sine'; o.frequency.value = 100;
      const gn = ac.createGain(); gn.gain.setValueAtTime(0.05, ac.currentTime);
      gn.gain.linearRampToValueAtTime(0, ac.currentTime + 0.04);
      o.connect(gn).connect(ac.destination); o.start(); o.stop(ac.currentTime + 0.04);
    }

    function playCrumble() {
      const ac = g.current.audioCtx; if (!ac) return;
      const buf = ac.createBuffer(1, ac.sampleRate * 0.3, ac.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length) * 0.4;
      const src = ac.createBufferSource(); src.buffer = buf;
      const gn = ac.createGain(); gn.gain.value = 0.2;
      src.connect(gn).connect(ac.destination); src.start();
      const o = ac.createOscillator(); o.type = 'sine';
      o.frequency.setValueAtTime(80, ac.currentTime);
      o.frequency.linearRampToValueAtTime(40, ac.currentTime + 0.3);
      const g2 = ac.createGain(); g2.gain.setValueAtTime(0.2, ac.currentTime);
      g2.gain.linearRampToValueAtTime(0, ac.currentTime + 0.3);
      o.connect(g2).connect(ac.destination); o.start(); o.stop(ac.currentTime + 0.3);
      const notes = [523, 659, 784, 1047, 1319];
      for (let i = 0; i < 5; i++) {
        const t = ac.currentTime + 0.1 + i * 0.05;
        const c = ac.createOscillator(); c.type = 'triangle'; c.frequency.value = notes[i];
        const cg = ac.createGain(); cg.gain.setValueAtTime(0.08, t);
        cg.gain.linearRampToValueAtTime(0, t + 0.12);
        c.connect(cg).connect(ac.destination); c.start(t); c.stop(t + 0.12);
      }
    }

    function playRootHum() {
      const ac = g.current.audioCtx; if (!ac) return;
      const o = ac.createOscillator(); o.type = 'sine'; o.frequency.value = 180;
      const gn = ac.createGain(); gn.gain.setValueAtTime(0.04, ac.currentTime);
      gn.gain.linearRampToValueAtTime(0, ac.currentTime + 0.15);
      o.connect(gn).connect(ac.destination); o.start(); o.stop(ac.currentTime + 0.15);
    }

    function spawnParticles(x: number, y: number, color: string, count: number, spdMult?: number) {
      spdMult = spdMult || 1;
      const game = g.current;
      for (let i = 0; i < count; i++) {
        const a = Math.random() * Math.PI * 2;
        const spd = (20 + Math.random() * 60) * spdMult;
        game.particles.push({
          x, y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd,
          life: 0.2 + Math.random() * 0.3, maxLife: 0.2 + Math.random() * 0.3,
          color, size: 1 + Math.random() * 3,
        });
      }
    }

    function spawnSeed(x: number, y: number, vx: number, vy: number) {
      const game = g.current;
      game.seeds.push({
        x, y, vx, vy,
        alive: true, phase: Math.random() * Math.PI * 2,
        boosted: false, hitGates: new Set(),
      });
      game.seedsAlive++;
    }

    // --- Tutorial step setup ---
    function tutResetStep() {
      const game = g.current;
      game.phase = 'aiming';
      setupTutStep(game, game.tutStep);
    }

    function advanceTutorial() {
      const game = g.current;
      game.tutStep++;
      game.tutSuccess = false;
      game.tutSuccessTimer = 0;
      if (game.tutStep >= TUT_STEPS.length) {
        game.tutActive = false;
        initGame();
        initAudio();
        setupLevel(1);
        game.running = true;
        setGameState('playing');
        return;
      }
      game.phase = 'aiming';
      setupTutStep(game, game.tutStep);
    }

    // --- Update ---
    function update(dt: number) {
      const game = g.current;
      if (game.phase === 'start' || game.phase === 'over') return;
      game.gameTime += dt;

      // Update seeds
      for (const seed of game.seeds) {
        if (!seed.alive) continue;
        seed.phase += dt * 4;
        const wobble = Math.sin(seed.phase) * WIND_WOBBLE * dt;
        seed.x += seed.vx * dt;
        seed.y += seed.vy * dt + wobble;
        seed.vy *= 0.98;

        if (seed.y < SEED_R) { seed.y = SEED_R; seed.vy = Math.abs(seed.vy) * 0.5; }
        if (seed.y > game.H - SEED_R) { seed.y = game.H - SEED_R; seed.vy = -Math.abs(seed.vy) * 0.5; }

        // Gate collision
        for (let gi = 0; gi < game.gates.length; gi++) {
          const gate = game.gates[gi];
          if (seed.hitGates.has(gi)) continue;
          const dx = Math.abs(seed.x - gate.x);
          const dy = Math.abs(seed.y - gate.y);
          if (dx < GATE_W / 2 + SEED_R && dy < GATE_H / 2 + SEED_R) {
            seed.hitGates.add(gi);
            if (gate.type === 'thorn') {
              seed.alive = false;
              game.seedsAlive--;
              spawnParticles(seed.x, seed.y, T.thorn, 6);
              playThornHit();
            } else {
              for (let i = 1; i < gate.mult; i++) {
                const childHits = new Set(seed.hitGates);
                game.seeds.push({
                  x: seed.x + (Math.random() - 0.5) * 6,
                  y: seed.y + (Math.random() - 0.5) * 12,
                  vx: seed.vx * (0.9 + Math.random() * 0.2),
                  vy: seed.vy + (Math.random() - 0.5) * 40,
                  alive: true, phase: Math.random() * Math.PI * 2,
                  boosted: seed.boosted, hitGates: childHits,
                });
                game.seedsAlive++;
              }
              spawnParticles(gate.x, gate.y, T.gateGlow, 4);
              playSplit(gate.mult);
            }
          }
        }

        // Root boost
        for (const root of game.roots) {
          const dx = Math.abs(seed.x - root.x);
          const dy = Math.abs(seed.y - root.y);
          if (dx < 20 && dy < 20 && !seed.boosted) {
            seed.boosted = true;
            seed.vx *= ROOT_BOOST;
            spawnParticles(root.x, root.y, T.rootGlow, 3);
            playRootHum();
          }
        }

        // Wall collision
        if (seed.x >= game.wall.x) {
          seed.alive = false;
          game.seedsAlive--;
          game.wall.hp--;
          game.wall.cracking = 0.1;
          spawnParticles(game.wall.x, seed.y, T.wallDark, 2);
          playWallHit();

          game.roots.push({ x: game.wall.x + 5 + Math.random() * 15, y: seed.y, plantedLevel: game.level });

          if (game.wall.hp <= 0) {
            if (game.tutActive) game.tutWallCracked = true;
            game.phase = 'cleared';
            game.levelTimer = 0;
            game.score += game.level * 10;
            game.screenShake = 0.2;
            game.flashTimer = 0.1;
            spawnParticles(game.wall.x, game.H / 2, T.wall, 25, 2);
            playCrumble();
          }
        }

        if (seed.x > game.W + 20) {
          seed.alive = false;
          game.seedsAlive--;
        }
      }

      // Check game over
      if (game.phase === 'playing' && game.seedsAlive <= 0 && game.shotsLeft <= 0) {
        if (game.wall.hp > 0) {
          if (game.tutActive) {
            tutResetStep();
          } else {
            game.phase = 'over';
            game.running = false;
            if (game.score >= game.bestScore) {
              game.bestScore = game.score;
              localStorage.setItem('bloom_best', String(game.bestScore));
            }
            setScore(game.score); setLevel(game.level); setGameState('gameover');
            fetch('/api/pixelpit/stats', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ game: GAME_ID }) }).catch(() => {});
          }
        }
      }

      if (game.phase === 'playing' && game.shotsLeft > 0) {
        game.phase = 'aiming';
      }

      // Cleared → next level
      if (game.phase === 'cleared') {
        game.levelTimer += dt;
        if (game.levelTimer > 1.5) {
          if (game.tutActive) {
            if (!game.tutSuccess) {
              game.tutSuccess = true;
              game.tutSuccessTimer = 1.2;
            }
            game.tutSuccessTimer -= dt;
            if (game.tutSuccessTimer <= 0) advanceTutorial();
          } else {
            setupLevel(game.level + 1);
          }
        }
      }

      // Moving gates
      for (const gate of game.gates) {
        if (gate.moving) {
          gate.y += Math.sin(game.gameTime * 1.5 + gate.x * 0.01) * 30 * dt;
          gate.y = Math.max(30, Math.min(game.H - 30, gate.y));
        }
      }

      if (game.screenShake > 0) game.screenShake -= dt;
      if (game.flashTimer > 0) game.flashTimer -= dt;

      for (const p of game.particles) {
        p.x += p.vx * dt; p.y += p.vy * dt;
        p.vy += 100 * dt;
        p.life -= dt;
      }
      game.particles = game.particles.filter(p => p.life > 0);
      game.seeds = game.seeds.filter(s => s.alive);

      // Tutorial check
      if (game.tutActive && game.tutWallCracked && game.phase === 'cleared') {
        // handled above in cleared logic
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

      // Wind lines
      ctx!.strokeStyle = T.white;
      ctx!.globalAlpha = 0.03;
      ctx!.lineWidth = 1;
      for (let i = 0; i < 12; i++) {
        const wx = ((game.gameTime * 60 + i * 80) % (game.W + 100)) - 50;
        const wy = (i * 67) % game.H;
        ctx!.beginPath();
        ctx!.moveTo(wx, wy);
        ctx!.lineTo(wx + 30, wy - 8);
        ctx!.stroke();
      }
      ctx!.globalAlpha = 1;

      // Roots
      for (const root of game.roots) {
        const age = game.level - root.plantedLevel;
        const alpha = Math.max(0, 1 - age / ROOT_DURATION) * 0.4;
        ctx!.fillStyle = T.root;
        ctx!.globalAlpha = alpha;
        ctx!.beginPath();
        ctx!.moveTo(root.x, root.y);
        ctx!.quadraticCurveTo(root.x - 8, root.y + 15, root.x - 3, root.y + 25);
        ctx!.lineWidth = 2; ctx!.strokeStyle = T.root; ctx!.stroke();
        ctx!.beginPath(); ctx!.arc(root.x, root.y, 3, 0, Math.PI * 2); ctx!.fill();
        if (alpha > 0.1) {
          ctx!.fillStyle = T.rootGlow;
          ctx!.globalAlpha = alpha * 0.1;
          ctx!.fillRect(root.x - 5, 0, 10, game.H);
          ctx!.globalAlpha = alpha * 0.25;
          ctx!.beginPath(); ctx!.arc(root.x, root.y, 12, 0, Math.PI * 2); ctx!.fill();
        }
      }
      ctx!.globalAlpha = 1;

      // Gates
      for (const gate of game.gates) {
        if (gate.type === 'sun') {
          ctx!.fillStyle = T.gate;
          ctx!.strokeStyle = '#b45309';
          ctx!.lineWidth = 2;
          const gx = gate.x - GATE_W / 2, gy = gate.y - GATE_H / 2;
          ctx!.fillRect(gx, gy, GATE_W, GATE_H);
          ctx!.strokeRect(gx, gy, GATE_W, GATE_H);
          ctx!.strokeStyle = T.gateGlow; ctx!.lineWidth = 1; ctx!.globalAlpha = 0.3;
          for (let i = -2; i <= 2; i++) {
            ctx!.beginPath();
            ctx!.moveTo(gate.x + i * 12, gy - 4);
            ctx!.lineTo(gate.x + i * 12, gy - 10);
            ctx!.stroke();
          }
          ctx!.globalAlpha = 1;
          ctx!.fillStyle = T.text; ctx!.font = 'bold 10px monospace'; ctx!.textAlign = 'center';
          ctx!.fillText('x' + gate.mult, gate.x, gate.y + 4);
        } else {
          ctx!.fillStyle = T.thorn; ctx!.strokeStyle = T.thornDark; ctx!.lineWidth = 2;
          const gx = gate.x - GATE_W / 2, gy = gate.y - GATE_H / 2;
          ctx!.fillRect(gx, gy, GATE_W, GATE_H);
          ctx!.strokeRect(gx, gy, GATE_W, GATE_H);
          ctx!.fillStyle = T.thornDark;
          for (let i = 0; i < 5; i++) {
            const spx = gx + 6 + i * 12;
            ctx!.beginPath(); ctx!.moveTo(spx - 3, gy); ctx!.lineTo(spx, gy - 6); ctx!.lineTo(spx + 3, gy); ctx!.fill();
            ctx!.beginPath(); ctx!.moveTo(spx - 3, gy + GATE_H); ctx!.lineTo(spx, gy + GATE_H + 6); ctx!.lineTo(spx + 3, gy + GATE_H); ctx!.fill();
          }
          ctx!.fillStyle = T.white; ctx!.font = 'bold 10px monospace'; ctx!.textAlign = 'center';
          ctx!.fillText('x0', gate.x, gate.y + 4);
        }
      }

      // Wall
      if (game.wall && game.wall.hp > 0) {
        const hpPct = game.wall.hp / game.wall.maxHP;
        const wallW = 20;
        ctx!.fillStyle = hpPct > 0.5 ? T.wall : hpPct > 0.2 ? T.wallDark : T.wallCrack;
        ctx!.fillRect(game.wall.x, 0, wallW, game.H);
        ctx!.strokeStyle = T.border; ctx!.lineWidth = 2;
        ctx!.strokeRect(game.wall.x, 0, wallW, game.H);
        const crackCount = Math.floor((1 - hpPct) * 8);
        ctx!.strokeStyle = T.wallCrack; ctx!.lineWidth = 1;
        for (let i = 0; i < crackCount; i++) {
          const cy = (game.H / (crackCount + 1)) * (i + 1);
          ctx!.beginPath();
          ctx!.moveTo(game.wall.x, cy);
          ctx!.lineTo(game.wall.x + wallW * 0.5, cy + Math.sin(i * 3) * 10);
          ctx!.lineTo(game.wall.x + wallW, cy + Math.cos(i * 2) * 8);
          ctx!.stroke();
        }
        ctx!.fillStyle = T.white; ctx!.font = 'bold 12px monospace'; ctx!.textAlign = 'center';
        ctx!.save();
        ctx!.translate(game.wall.x + wallW / 2, game.H / 2);
        ctx!.rotate(-Math.PI / 2);
        ctx!.fillText(game.wall.hp + ' HP', 0, 4);
        ctx!.restore();
        if (game.wall.cracking > 0) {
          ctx!.fillStyle = T.white; ctx!.globalAlpha = game.wall.cracking;
          ctx!.fillRect(game.wall.x, 0, wallW, game.H);
          ctx!.globalAlpha = 1;
          game.wall.cracking -= 0.005;
        }
      }

      // Seeds
      for (const seed of game.seeds) {
        if (!seed.alive) continue;
        ctx!.fillStyle = seed.boosted ? T.rootGlow : T.seed;
        ctx!.strokeStyle = T.seedDark; ctx!.lineWidth = 1;
        const speed = Math.hypot(seed.vx, seed.vy);
        const stretch = 1 + speed * 0.001;
        const angle = Math.atan2(seed.vy, seed.vx);
        ctx!.save();
        ctx!.translate(seed.x, seed.y);
        ctx!.rotate(angle);
        ctx!.scale(stretch, 1 / stretch);
        ctx!.beginPath(); ctx!.arc(0, 0, SEED_R, 0, Math.PI * 2); ctx!.fill(); ctx!.stroke();
        ctx!.fillStyle = T.seedDark;
        ctx!.beginPath();
        ctx!.moveTo(-SEED_R, 0);
        ctx!.quadraticCurveTo(-SEED_R - 4, -3, -SEED_R - 6, 0);
        ctx!.quadraticCurveTo(-SEED_R - 4, 3, -SEED_R, 0);
        ctx!.fill();
        ctx!.restore();
      }

      // Particles
      for (const p of game.particles) {
        ctx!.globalAlpha = p.life / p.maxLife;
        ctx!.fillStyle = p.color;
        ctx!.beginPath(); ctx!.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx!.fill();
      }
      ctx!.globalAlpha = 1;

      // Flash
      if (game.flashTimer > 0) {
        ctx!.fillStyle = T.gate; ctx!.globalAlpha = game.flashTimer * 2;
        ctx!.fillRect(0, 0, game.W, game.H); ctx!.globalAlpha = 1;
      }

      // Slingshot
      if (game.phase === 'aiming') {
        ctx!.fillStyle = T.seedDark;
        ctx!.beginPath(); ctx!.arc(SLING_X, game.H / 2, 8, 0, Math.PI * 2); ctx!.fill();
        ctx!.strokeStyle = T.border; ctx!.lineWidth = 2; ctx!.stroke();
        if (game.aiming) {
          ctx!.strokeStyle = T.seed; ctx!.lineWidth = 2;
          ctx!.setLineDash([4, 4]);
          ctx!.beginPath();
          ctx!.moveTo(SLING_X, game.H / 2);
          const aimLen = 60;
          ctx!.lineTo(SLING_X + Math.cos(game.aimAngle) * aimLen, game.H / 2 + Math.sin(game.aimAngle) * aimLen);
          ctx!.stroke();
          ctx!.setLineDash([]);
        }
      }

      // HUD
      if (game.phase !== 'start') {
        ctx!.fillStyle = T.text; ctx!.font = 'bold 16px monospace'; ctx!.textAlign = 'center';
        ctx!.fillText(game.seeds.filter(s => s.alive).length + ' seeds', game.W / 2, game.safeTop + 24);
        ctx!.font = '12px monospace'; ctx!.textAlign = 'left';
        ctx!.fillText('LVL ' + game.level, 12, game.safeTop + 24);
        ctx!.textAlign = 'right';
        ctx!.fillText(String(game.score), game.W - 12, game.safeTop + 24);
        if (game.shotsLeft > 0) {
          ctx!.fillStyle = T.seed;
          for (let i = 0; i < game.shotsLeft; i++) {
            ctx!.beginPath(); ctx!.arc(SLING_X + i * 14, game.H - 20, 4, 0, Math.PI * 2); ctx!.fill();
          }
        }
      }

      // Level cleared overlay
      if (game.phase === 'cleared') {
        const t = Math.min(game.levelTimer / 0.4, 1);
        const c1 = 1.70158, c3 = c1 + 1;
        const scale = t < 1 ? 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2) : 1;
        ctx!.save();
        ctx!.translate(game.W / 2, game.H / 2 - 10);
        ctx!.scale(scale, scale);
        ctx!.fillStyle = T.gate; ctx!.globalAlpha = 0.9;
        ctx!.font = 'bold 28px monospace'; ctx!.textAlign = 'center';
        ctx!.fillText('CLEARED!', 0, 0);
        ctx!.restore();
        ctx!.font = '14px monospace'; ctx!.fillStyle = T.text;
        ctx!.globalAlpha = Math.min(game.levelTimer * 3, 0.6); ctx!.textAlign = 'center';
        ctx!.fillText('+' + (game.level * 10) + ' pts', game.W / 2, game.H / 2 + 20);
        ctx!.globalAlpha = 1;
      }

      // Tutorial HUD
      if (game.tutActive && game.phase !== 'start') {
        const step = TUT_STEPS[game.tutStep];
        ctx!.fillStyle = T.seed; ctx!.font = 'bold 14px monospace'; ctx!.textAlign = 'center';
        ctx!.fillText(step.name, game.W / 2, game.safeTop + 44);
        ctx!.fillStyle = T.text; ctx!.font = '12px monospace';
        ctx!.fillText(step.instruction, game.W / 2, game.safeTop + 60);
        for (let i = 0; i < TUT_STEPS.length; i++) {
          const dotX = game.W / 2 + (i - 2) * 16;
          const dotY = game.H - 40;
          ctx!.fillStyle = i < game.tutStep ? T.seed : i === game.tutStep ? T.text : T.muted;
          ctx!.beginPath(); ctx!.arc(dotX, dotY, i === game.tutStep ? 4 : 3, 0, Math.PI * 2); ctx!.fill();
        }
        ctx!.fillStyle = T.muted; ctx!.font = '11px monospace'; ctx!.textAlign = 'right';
        ctx!.fillText('SKIP \u25B8', game.W - 16, game.safeTop + 24);
        if (game.tutSuccess) {
          ctx!.fillStyle = T.seed; ctx!.font = 'bold 24px monospace'; ctx!.textAlign = 'center';
          ctx!.fillText('NICE!', game.W / 2, game.H * 0.4);
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

      if (game.tutActive && isSkipTap(e.clientX, e.clientY)) {
        game.tutActive = false;
        initGame();
        initAudio();
        setupLevel(1);
        game.running = true;
        setGameState('playing');
        return;
      }

      if (game.phase === 'cleared') return;
      if (game.phase === 'aiming' && game.shotsLeft > 0) {
        game.aiming = true;
        game.aimStart = { x: e.clientX, y: e.clientY };
      }
    }

    function handleMove(e: PointerEvent) {
      e.preventDefault();
      const game = g.current;
      if (!game.aiming) return;
      const dx = e.clientX - game.aimStart!.x;
      const dy = e.clientY - game.aimStart!.y;
      game.aimAngle = Math.atan2(-dy, -dx);
      game.aimAngle = Math.max(-Math.PI * 0.4, Math.min(Math.PI * 0.4, game.aimAngle));
    }

    function handleUp(e: PointerEvent) {
      e.preventDefault();
      const game = g.current;
      if (!game.aiming) return;
      game.aiming = false;
      if (game.phase === 'aiming' && game.shotsLeft > 0) {
        const vx = Math.cos(game.aimAngle) * LAUNCH_SPEED + SEED_SPEED;
        const vy = Math.sin(game.aimAngle) * LAUNCH_SPEED;
        spawnSeed(SLING_X + 10, game.H / 2, Math.abs(vx), vy);
        game.shotsLeft--;
        game.seedsLaunched++;
        playThwip();
        if (game.shotsLeft > 0) game.phase = 'aiming';
        else game.phase = 'playing';
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.code === 'Space') {
        const game = g.current;
        if (game.phase === 'aiming' && game.shotsLeft > 0) {
          spawnSeed(SLING_X + 10, game.H / 2, SEED_SPEED + LAUNCH_SPEED * 0.8, (Math.random() - 0.5) * 40);
          game.shotsLeft--;
          game.seedsLaunched++;
          playThwip();
          if (game.shotsLeft <= 0) game.phase = 'playing';
        }
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
  }, [initAudio, initGame, setupLevel]);

  return (
    <>
      <Script src="/pixelpit/social.js" strategy="lazyOnload" onLoad={() => setSocialLoaded(true)} />
      <canvas ref={canvasRef} style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', display: 'block', background: T.bg, touchAction: 'none' }} />

      {gameState === 'start' && (
        <div style={{ position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: COLORS.bg, zIndex: 100, textAlign: 'center', padding: 40 }}>
          <div style={{ background: COLORS.surface, border: `1px solid ${T.border}`, padding: '50px 60px', borderRadius: 16 }}>
            {/* Seed icon */}
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: T.seed, border: `3px solid ${T.seedDark}`, margin: '0 auto 12px' }} />
            <h1 style={{ fontFamily: 'ui-monospace, monospace', fontSize: 56, fontWeight: 700, color: T.text, marginBottom: 16, letterSpacing: 6 }}>BLOOM</h1>
            <p style={{ fontSize: 14, fontFamily: 'ui-monospace, monospace', color: T.muted, marginBottom: 30, lineHeight: 1.8, letterSpacing: 1 }}>
              aim + launch seeds<br />multiply through gates<br />crack the wall
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
              <button onClick={startGame} style={{ background: T.seed, color: T.white, border: 'none', padding: '16px 50px', fontSize: 16, fontFamily: 'ui-monospace, monospace', fontWeight: 600, cursor: 'pointer', borderRadius: 8, letterSpacing: 2 }}>play</button>
              <button onClick={startTutorial} style={{ background: 'transparent', color: T.muted, border: `1px solid ${T.border}`, padding: '12px 35px', fontSize: 12, fontFamily: 'ui-monospace, monospace', cursor: 'pointer', borderRadius: 6, letterSpacing: 2 }}>tutorial</button>
            </div>
          </div>
          <div style={{ marginTop: 24, fontSize: 12, fontFamily: 'ui-monospace, monospace', letterSpacing: 3 }}>
            <span style={{ color: T.seed }}>pixel</span><span style={{ color: T.gate }}>pit</span><span style={{ color: T.muted }}> arcade</span>
          </div>
        </div>
      )}

      {gameState === 'gameover' && (
        <div style={{ position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(248,250,252,0.85)', zIndex: 100, textAlign: 'center', padding: 40 }}>
          <h1 style={{ fontFamily: 'ui-monospace, monospace', fontSize: 14, fontWeight: 300, color: T.thorn, marginBottom: 12, letterSpacing: 4 }}>WILTED</h1>
          <div style={{ fontFamily: 'ui-monospace, monospace', fontSize: 72, fontWeight: 700, color: T.text, marginBottom: 8 }}>{score}</div>
          <div style={{ fontFamily: 'ui-monospace, monospace', fontSize: 13, color: T.muted, marginBottom: 25 }}>Level {level}</div>
          <ScoreFlow score={score} gameId={GAME_ID} colors={SCORE_FLOW_COLORS} maxScore={500} onRankReceived={(rank, entryId) => setSubmittedEntryId(entryId ?? null)} onProgression={(prog) => setProgression(prog)} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
            <button onClick={startGame} style={{ background: T.seed, color: T.white, border: 'none', borderRadius: 8, padding: '16px 50px', fontSize: 15, fontFamily: 'ui-monospace, monospace', fontWeight: 600, cursor: 'pointer', letterSpacing: 2 }}>play again</button>
            <button onClick={() => setGameState('leaderboard')} style={{ background: 'transparent', border: `1px solid ${T.border}`, borderRadius: 6, color: T.muted, padding: '14px 35px', fontSize: 11, fontFamily: 'ui-monospace, monospace', cursor: 'pointer', letterSpacing: 2 }}>leaderboard</button>
            {user ? (
              <button onClick={() => setShowShareModal(true)} style={{ background: 'transparent', border: `1px solid ${T.border}`, borderRadius: 6, color: T.muted, padding: '14px 35px', fontSize: 11, fontFamily: 'ui-monospace, monospace', cursor: 'pointer', letterSpacing: 2 }}>share / groups</button>
            ) : (
              <ShareButtonContainer id="share-btn-container" url={typeof window !== 'undefined' ? `${window.location.origin}/pixelpit/arcade/bloom/share/${score}` : ''} text={`I scored ${score} on BLOOM! Can you beat me?`} style="minimal" socialLoaded={socialLoaded} />
            )}
          </div>
        </div>
      )}

      {gameState === 'leaderboard' && <Leaderboard gameId={GAME_ID} limit={8} entryId={submittedEntryId ?? undefined} colors={LEADERBOARD_COLORS} onClose={() => setGameState('gameover')} groupsEnabled={true} gameUrl={GAME_URL} socialLoaded={socialLoaded} />}
      {showShareModal && user && <ShareModal gameUrl={GAME_URL} score={score} colors={LEADERBOARD_COLORS} onClose={() => setShowShareModal(false)} />}
    </>
  );
}

// --- Tutorial step setup (standalone) ---
function setupTutStep(game: GameState, step: number) {
  const W = game.W, H = game.H;
  game.seeds = []; game.gates = []; game.particles = [];
  game.wallX = W - WALL_X_OFFSET;
  game.tutWallCracked = false;
  game.seedsAlive = 0; game.seedsLaunched = 0;

  if (step === 0) {
    game.wall = { x: game.wallX, hp: 2, maxHP: 2, cracking: 0 };
    game.gates.push({ x: W * 0.4, y: H / 2, type: 'sun', mult: 2, moving: false });
    game.shotsLeft = 3;
  } else if (step === 1) {
    game.wall = { x: game.wallX, hp: 6, maxHP: 6, cracking: 0 };
    game.gates.push({ x: W * 0.3, y: H * 0.4, type: 'sun', mult: 2, moving: false });
    game.gates.push({ x: W * 0.6, y: H * 0.4, type: 'sun', mult: 2, moving: false });
    game.shotsLeft = 2;
  } else if (step === 2) {
    game.wall = { x: game.wallX, hp: 8, maxHP: 8, cracking: 0 };
    game.gates.push({ x: W * 0.35, y: H * 0.3, type: 'sun', mult: 3, moving: false });
    game.gates.push({ x: W * 0.6, y: H * 0.3, type: 'sun', mult: 2, moving: false });
    game.gates.push({ x: W * 0.35, y: H * 0.65, type: 'thorn', mult: 0, moving: false });
    game.gates.push({ x: W * 0.6, y: H * 0.65, type: 'sun', mult: 4, moving: false });
    game.shotsLeft = 3;
  } else if (step === 3) {
    game.wall = { x: game.wallX, hp: 4, maxHP: 4, cracking: 0 };
    game.gates.push({ x: W * 0.5, y: H / 2, type: 'sun', mult: 2, moving: false });
    game.roots = [];
    for (let i = 0; i < 5; i++) {
      game.roots.push({ x: W * 0.65 + i * 12, y: H / 2 + (i - 2) * 8, plantedLevel: game.level });
    }
    game.shotsLeft = 2;
  } else if (step === 4) {
    game.wall = { x: game.wallX, hp: 15, maxHP: 15, cracking: 0 };
    game.gates.push({ x: W * 0.3, y: H * 0.3, type: 'sun', mult: 2, moving: false });
    game.gates.push({ x: W * 0.3, y: H * 0.6, type: 'sun', mult: 3, moving: false });
    game.gates.push({ x: W * 0.55, y: H * 0.35, type: 'sun', mult: 2, moving: false });
    game.gates.push({ x: W * 0.55, y: H * 0.7, type: 'thorn', mult: 0, moving: false });
    game.shotsLeft = 4;
  }
}
