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
  bolt: '#22d3ee',
  gold: '#facc15',
  red: '#ef4444',
  white: '#ffffff',
  muted: '#71717a',
  purple: '#7c3aed',
};

const COLORS = {
  bg: '#09090b', surface: '#18181b', primary: '#22d3ee', secondary: '#facc15',
  text: '#ffffff', muted: '#71717a', error: '#ef4444',
};

const SCORE_FLOW_COLORS: ScoreFlowColors = { ...COLORS };
const LEADERBOARD_COLORS: LeaderboardColors = { ...COLORS };
const GAME_ID = 'coil';

// --- CONSTANTS ---
const BASE_SPEED = 120;
const BOOST_SPEED = 240;
const SEG_DIST = 6;
const TRAIL_LIFE = 2.0;
const CHARGE_RADIUS = 10;
const STORM_CELL_SPEED_BASE = 50;
const ARENA_SHRINK_RATE = 3;
const SURGE_INTERVAL = 30;
const SURGE_DURATION = 3;
const SURGE_SHRINK_RATE = 20;
const BOOST_BURN_RATE = 2;
const HEAD_R = 5;
const CRACKLE_INTERVAL = 4;
const HOLD_THRESHOLD = 0.15;

interface TrailSeg { x: number; y: number; t: number; }
interface Charge { x: number; y: number; flicker: number; alive: boolean; }
interface StormCell { x: number; y: number; angle: number; speed: number; trail: TrailSeg[]; alive: boolean; turnTimer: number; }
interface Particle { x: number; y: number; vx: number; vy: number; life: number; maxLife: number; color: string; size: number; }

interface GameState {
  bolt: { x: number; y: number; angle: number; length: number; holdFlash: number };
  trail: TrailSeg[];
  charges: Charge[];
  stormCells: StormCell[];
  particles: Particle[];
  score: number;
  gameTime: number;
  phase: 'start' | 'playing' | 'dying' | 'over' | 'tutorial';
  arenaRadius: number;
  arenaCenter: { x: number; y: number };
  turnDir: number;
  boosting: boolean;
  boostBurnAccum: number;
  frameCount: number;
  flashTimer: number;
  flashColor: string;
  surgeTimer: number;
  surgeActive: boolean;
  surgeWarned: boolean;
  deathTimer: number;
  touching: boolean;
  holdTimer: number;
  tapFired: boolean;
  W: number;
  H: number;
  safeTop: number;
  running: boolean;
  audioCtx: AudioContext | null;
  rumbleNode: OscillatorNode | null;
  rumbleGain: GainNode | null;
  buzzNode: OscillatorNode | null;
  buzzGain: GainNode | null;
  // Tutorial
  tutStep: number;
  tutSuccess: boolean;
  tutSuccessTimer: number;
  tutTaps: number;
  tutCollects: number;
  tutBoostTime: number;
  tutTrapped: boolean;
}

export default function CoilGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<'start' | 'playing' | 'tutorial' | 'gameover' | 'leaderboard'>('start');
  const [score, setScore] = useState(0);
  const [socialLoaded, setSocialLoaded] = useState(false);
  const [submittedEntryId, setSubmittedEntryId] = useState<number | null>(null);
  const [progression, setProgression] = useState<ProgressionResult | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const { user } = usePixelpitSocial(socialLoaded);
  const GAME_URL = typeof window !== 'undefined' ? `${window.location.origin}/pixelpit/arcade/coil` : 'https://pixelpit.gg/pixelpit/arcade/coil';

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
    bolt: { x: 0, y: 0, angle: -Math.PI / 2, length: 15, holdFlash: 0 },
    trail: [], charges: [], stormCells: [], particles: [],
    score: 0, gameTime: 0, phase: 'start',
    arenaRadius: 200, arenaCenter: { x: 0, y: 0 },
    turnDir: 1, boosting: false, boostBurnAccum: 0,
    frameCount: 0, flashTimer: 0, flashColor: '',
    surgeTimer: 0, surgeActive: false, surgeWarned: false, deathTimer: 0,
    touching: false, holdTimer: 0, tapFired: false,
    W: 0, H: 0, safeTop: 0, running: false,
    audioCtx: null, rumbleNode: null, rumbleGain: null, buzzNode: null, buzzGain: null,
    tutStep: 0, tutSuccess: false, tutSuccessTimer: 0,
    tutTaps: 0, tutCollects: 0, tutBoostTime: 0, tutTrapped: false,
  });

  const initAudio = useCallback(() => {
    const game = g.current;
    if (!game.audioCtx) game.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    if (game.audioCtx.state === 'suspended') game.audioCtx.resume();
  }, []);

  const startRumble = useCallback(() => {
    const game = g.current;
    if (!game.audioCtx || game.rumbleNode) return;
    game.rumbleNode = game.audioCtx.createOscillator();
    game.rumbleNode.type = 'sine'; game.rumbleNode.frequency.value = 60;
    game.rumbleGain = game.audioCtx.createGain(); game.rumbleGain.gain.value = 0.03;
    game.rumbleNode.connect(game.rumbleGain).connect(game.audioCtx.destination);
    game.rumbleNode.start();
  }, []);

  const startBuzz = useCallback(() => {
    const game = g.current;
    if (!game.audioCtx || game.buzzNode) return;
    game.buzzNode = game.audioCtx.createOscillator();
    game.buzzNode.type = 'sawtooth'; game.buzzNode.frequency.value = 200;
    game.buzzGain = game.audioCtx.createGain(); game.buzzGain.gain.value = 0;
    game.buzzNode.connect(game.buzzGain).connect(game.audioCtx.destination);
    game.buzzNode.start();
  }, []);

  const initGame = useCallback(() => {
    const game = g.current;
    const cx = game.W / 2, cy = game.H / 2;
    game.arenaCenter = { x: cx, y: cy };
    game.arenaRadius = Math.min(game.W, game.H) * 0.45;
    game.bolt = { x: cx, y: cy + game.arenaRadius * 0.3, angle: -Math.PI / 2, length: 15, holdFlash: 0 };
    game.trail = [{ x: game.bolt.x, y: game.bolt.y, t: 0 }];
    game.charges = []; game.stormCells = []; game.particles = [];
    game.score = 0; game.gameTime = 0;
    game.turnDir = 1; game.boosting = false; game.boostBurnAccum = 0;
    game.frameCount = 0; game.flashTimer = 0; game.flashColor = '';
    game.surgeTimer = 0; game.surgeActive = false; game.surgeWarned = false; game.deathTimer = 0;
    game.touching = false; game.holdTimer = 0; game.tapFired = false;
    spawnCharges(game, 12);
    spawnStormCell(game);
  }, []);

  const startGame = useCallback(() => {
    initAudio();
    const game = g.current;
    initGame();
    startRumble(); startBuzz();
    game.phase = 'playing'; game.running = true;
    setGameState('playing'); setShowShareModal(false); setProgression(null);
  }, [initAudio, initGame, startRumble, startBuzz]);

  const startTutorial = useCallback(() => {
    initAudio();
    const game = g.current;
    const cx = game.W / 2, cy = game.H / 2;
    game.arenaCenter = { x: cx, y: cy };
    game.arenaRadius = Math.min(game.W, game.H) * 0.45;
    game.bolt = { x: cx, y: cy + game.arenaRadius * 0.2, angle: -Math.PI / 2, length: 15, holdFlash: 0 };
    game.trail = [{ x: game.bolt.x, y: game.bolt.y, t: 0 }];
    game.charges = []; game.stormCells = []; game.particles = [];
    game.score = 0; game.gameTime = 0;
    game.turnDir = 1; game.boosting = false; game.boostBurnAccum = 0;
    game.frameCount = 0; game.flashTimer = 0; game.surgeTimer = 0; game.surgeActive = false; game.surgeWarned = false;
    game.tutStep = 0; game.tutSuccess = false; game.tutSuccessTimer = 0;
    game.tutTaps = 0; game.tutCollects = 0; game.tutBoostTime = 0; game.tutTrapped = false;
    game.phase = 'tutorial'; game.running = true;
    startRumble(); startBuzz();
    // Setup first tutorial step
    setupTutStep(game, 0);
    setGameState('tutorial');
  }, [initAudio, startRumble, startBuzz]);

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
    function playCrackle() {
      const ac = g.current.audioCtx; if (!ac) return;
      const buf = ac.createBuffer(1, ac.sampleRate * 0.015, ac.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * 0.15;
      const src = ac.createBufferSource(); src.buffer = buf;
      const gn = ac.createGain(); gn.gain.value = 0.08;
      src.connect(gn).connect(ac.destination); src.start();
    }

    function playZap() {
      const ac = g.current.audioCtx; if (!ac) return;
      const o = ac.createOscillator(); o.type = 'square';
      o.frequency.setValueAtTime(800, ac.currentTime);
      o.frequency.linearRampToValueAtTime(2000, ac.currentTime + 0.05);
      const gn = ac.createGain(); gn.gain.setValueAtTime(0.15, ac.currentTime);
      gn.gain.linearRampToValueAtTime(0, ac.currentTime + 0.05);
      o.connect(gn).connect(ac.destination); o.start(); o.stop(ac.currentTime + 0.05);
    }

    function playCellDeath() {
      const ac = g.current.audioCtx; if (!ac) return;
      const buf = ac.createBuffer(1, ac.sampleRate * 0.08, ac.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.max(0, 1 - i / d.length);
      const src = ac.createBufferSource(); src.buffer = buf;
      const gn = ac.createGain(); gn.gain.value = 0.2;
      src.connect(gn).connect(ac.destination); src.start();
    }

    function playBoom() {
      const ac = g.current.audioCtx; if (!ac) return;
      const o = ac.createOscillator(); o.type = 'sine';
      o.frequency.setValueAtTime(80, ac.currentTime);
      o.frequency.linearRampToValueAtTime(30, ac.currentTime + 0.5);
      const gn = ac.createGain(); gn.gain.setValueAtTime(0.4, ac.currentTime);
      gn.gain.linearRampToValueAtTime(0, ac.currentTime + 0.5);
      o.connect(gn).connect(ac.destination); o.start(); o.stop(ac.currentTime + 0.5);
      const buf = ac.createBuffer(1, ac.sampleRate * 0.3, ac.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.max(0, 1 - i / d.length) * 0.5;
      const src = ac.createBufferSource(); src.buffer = buf;
      const g2 = ac.createGain(); g2.gain.value = 0.3;
      src.connect(g2).connect(ac.destination); src.start();
    }

    function playSurgeWarning() {
      const ac = g.current.audioCtx; if (!ac) return;
      const o = ac.createOscillator(); o.type = 'sine';
      o.frequency.setValueAtTime(300, ac.currentTime);
      o.frequency.linearRampToValueAtTime(900, ac.currentTime + 1);
      const gn = ac.createGain(); gn.gain.setValueAtTime(0.1, ac.currentTime);
      gn.gain.linearRampToValueAtTime(0, ac.currentTime + 1);
      o.connect(gn).connect(ac.destination); o.start(); o.stop(ac.currentTime + 1);
    }

    function setBuzzVolume(v: number) {
      const game = g.current;
      if (game.buzzGain && game.audioCtx) game.buzzGain.gain.setTargetAtTime(v, game.audioCtx.currentTime, 0.05);
    }

    function updateRumble(pressure: number) {
      const game = g.current;
      if (game.rumbleGain) game.rumbleGain.gain.value = 0.03 + pressure * 0.07;
    }

    // --- Tutorial steps ---
    const TUT_STEPS = [
      { name: 'TAP TO ARC', instruction: 'TAP TO TURN', check: (gm: GameState) => gm.tutTaps >= 4 },
      { name: 'COLLECT SPARKS', instruction: 'STEER INTO WHITE SPARKS', check: (gm: GameState) => gm.tutCollects >= 3 },
      { name: 'HOLD TO BOOST', instruction: 'HOLD TO OVERDRIVE', check: (gm: GameState) => gm.tutBoostTime >= 0.8 },
      { name: 'DODGE RED', instruction: 'AVOID RED TRAILS', check: (gm: GameState) => gm.gameTime > 4 },
      { name: 'THE TRAP', instruction: 'LURE RED INTO YOUR TRAIL', check: (gm: GameState) => gm.tutTrapped },
    ];

    function tutRespawn(game: GameState) {
      game.bolt.x = game.arenaCenter.x;
      game.bolt.y = game.arenaCenter.y + game.arenaRadius * 0.2;
      game.bolt.angle = -Math.PI / 2;
      game.trail = [{ x: game.bolt.x, y: game.bolt.y, t: 0 }];
      game.particles = []; game.gameTime = 0; game.turnDir = 1; game.boosting = false;
      setupTutStep(game, game.tutStep);
    }

    function advanceTutorial(game: GameState) {
      game.tutStep++;
      game.tutSuccess = false; game.tutSuccessTimer = 0;
      if (game.tutStep >= TUT_STEPS.length) {
        // Tutorial complete — start real game
        initGame();
        game.phase = 'playing'; game.running = true;
        setGameState('playing');
        return;
      }
      game.bolt.x = game.arenaCenter.x;
      game.bolt.y = game.arenaCenter.y + game.arenaRadius * 0.2;
      game.bolt.angle = -Math.PI / 2;
      game.trail = [{ x: game.bolt.x, y: game.bolt.y, t: 0 }];
      game.particles = []; game.gameTime = 0; game.turnDir = 1; game.boosting = false;
      setupTutStep(game, game.tutStep);
    }

    // --- Die ---
    function die(game: GameState) {
      if (game.phase === 'tutorial') {
        spawnParticles(game, game.bolt.x, game.bolt.y, T.red, 8);
        game.flashColor = T.red; game.flashTimer = 0.1;
        tutRespawn(game);
        return;
      }
      game.phase = 'dying'; game.deathTimer = 0;
      playBoom(); setBuzzVolume(0);
      spawnParticles(game, game.bolt.x, game.bolt.y, T.bolt, 35);
      game.flashColor = T.white; game.flashTimer = 0.2;
    }

    // --- Update ---
    function update(dt: number) {
      const game = g.current;
      if (game.phase === 'dying') {
        game.deathTimer += dt;
        for (const p of game.particles) { p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; }
        game.particles = game.particles.filter(p => p.life > 0);
        if (game.flashTimer > 0) game.flashTimer -= dt;
        if (game.deathTimer > 1.8) {
          game.phase = 'over'; game.running = false;
          setScore(game.score); setGameState('gameover');
          fetch('/api/pixelpit/stats', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ game: GAME_ID }) }).catch(() => {});
        }
        return;
      }
      if (game.phase !== 'playing' && game.phase !== 'tutorial') return;

      game.gameTime += dt;
      game.frameCount++;

      // Hold detection
      if (game.touching) {
        game.holdTimer += dt;
        if (game.holdTimer > HOLD_THRESHOLD && game.bolt.length > 3) {
          if (!game.boosting) game.bolt.holdFlash = 0.06;
          game.boosting = true; game.tapFired = true;
          setBuzzVolume(0.12);
        }
      }

      // Move bolt
      const speed = game.boosting ? BOOST_SPEED : BASE_SPEED;
      game.bolt.x += Math.cos(game.bolt.angle) * speed * dt;
      game.bolt.y += Math.sin(game.bolt.angle) * speed * dt;

      if (game.frameCount % CRACKLE_INTERVAL === 0) playCrackle();

      // Trail
      const lastSeg = game.trail[game.trail.length - 1];
      const dx = game.bolt.x - lastSeg.x, dy = game.bolt.y - lastSeg.y;
      if (dx * dx + dy * dy >= SEG_DIST * SEG_DIST) {
        game.trail.push({ x: game.bolt.x, y: game.bolt.y, t: game.gameTime });
      }

      // Boost burns tail
      if (game.boosting) {
        game.boostBurnAccum += BOOST_BURN_RATE * dt;
        while (game.boostBurnAccum >= 1 && game.bolt.length > 3) {
          game.bolt.length--; game.boostBurnAccum -= 1;
          game.score = Math.max(0, game.score - 1);
          if (game.trail.length > 2) {
            const tailSeg = game.trail[Math.max(0, game.trail.length - game.bolt.length - 1)];
            if (tailSeg) spawnParticles(game, tailSeg.x, tailSeg.y, T.gold, 2);
          }
        }
      }

      // Collect charges
      for (const c of game.charges) {
        if (!c.alive) continue;
        const cdx = game.bolt.x - c.x, cdy = game.bolt.y - c.y;
        if (cdx * cdx + cdy * cdy < (HEAD_R + CHARGE_RADIUS) * (HEAD_R + CHARGE_RADIUS)) {
          c.alive = false; game.score += 1; game.bolt.length += 3;
          playZap(); spawnParticles(game, c.x, c.y, T.white, 6);
          if (game.phase === 'tutorial') game.tutCollects++;
        }
      }
      game.charges = game.charges.filter(c => c.alive);
      if (game.phase !== 'tutorial' && game.charges.length < 6 + Math.floor(game.gameTime / 10)) {
        spawnCharges(game, 3);
      }

      // Arena shrink (not in tutorial)
      if (game.phase !== 'tutorial') {
        game.surgeTimer += dt;
        if (!game.surgeWarned && game.surgeTimer > SURGE_INTERVAL - 1) {
          game.surgeWarned = true; playSurgeWarning();
        }
        if (game.surgeTimer >= SURGE_INTERVAL) {
          game.surgeActive = true;
          if (game.surgeTimer >= SURGE_INTERVAL + SURGE_DURATION) {
            game.surgeTimer = 0; game.surgeActive = false; game.surgeWarned = false;
          }
        }
        const shrink = game.surgeActive ? SURGE_SHRINK_RATE : ARENA_SHRINK_RATE;
        game.arenaRadius = Math.max(60, game.arenaRadius - shrink * dt);
        updateRumble(1 - game.arenaRadius / (Math.min(game.W, game.H) * 0.45));
      } else {
        game.arenaRadius = Math.min(game.W, game.H) * 0.45;
        game.surgeTimer = 0; game.surgeActive = false;
      }

      // Arena boundary death
      const distFromCenter = Math.hypot(game.bolt.x - game.arenaCenter.x, game.bolt.y - game.arenaCenter.y);
      if (distFromCenter > game.arenaRadius) { die(game); return; }

      // Self-collision
      const ownedStart = Math.max(0, game.trail.length - game.bolt.length);
      for (let i = 0; i < ownedStart - 5; i++) {
        const seg = game.trail[i];
        if (game.gameTime - seg.t > TRAIL_LIFE) continue;
        const sdx = game.bolt.x - seg.x, sdy = game.bolt.y - seg.y;
        if (sdx * sdx + sdy * sdy < HEAD_R * HEAD_R * 4) { die(game); return; }
      }

      // Storm cells
      if (game.phase !== 'tutorial') {
        const d = Math.min(game.gameTime / 60, 1);
        if (game.stormCells.filter(s => s.alive).length < 2 + Math.floor(d * 4)) spawnStormCell(game);
      }

      for (const cell of game.stormCells) {
        if (!cell.alive) continue;
        cell.turnTimer -= dt;
        if (cell.turnTimer <= 0) {
          cell.angle += (Math.random() - 0.5) * Math.PI * 0.5;
          cell.turnTimer = 1 + Math.random() * 2;
        }
        cell.x += Math.cos(cell.angle) * cell.speed * dt;
        cell.y += Math.sin(cell.angle) * cell.speed * dt;
        const cellDist = Math.hypot(cell.x - game.arenaCenter.x, cell.y - game.arenaCenter.y);
        if (cellDist > game.arenaRadius - 10) {
          cell.angle = Math.atan2(game.arenaCenter.y - cell.y, game.arenaCenter.x - cell.x) + (Math.random() - 0.5) * 0.5;
        }
        const cellLast = cell.trail.length > 0 ? cell.trail[cell.trail.length - 1] : null;
        if (!cellLast || Math.hypot(cell.x - cellLast.x, cell.y - cellLast.y) > SEG_DIST) {
          cell.trail.push({ x: cell.x, y: cell.y, t: game.gameTime });
        }
        cell.trail = cell.trail.filter(s => game.gameTime - s.t < TRAIL_LIFE * 0.7);

        // Head hits cell trail → death
        for (const seg of cell.trail) {
          const sdx = game.bolt.x - seg.x, sdy = game.bolt.y - seg.y;
          if (sdx * sdx + sdy * sdy < HEAD_R * HEAD_R * 4) { die(game); return; }
        }

        // Cell hits player trail → cell shatters
        const playerTrailStart = Math.max(0, game.trail.length - game.bolt.length);
        for (let i = playerTrailStart; i < game.trail.length; i++) {
          const seg = game.trail[i];
          const sdx = cell.x - seg.x, sdy = cell.y - seg.y;
          if (sdx * sdx + sdy * sdy < 64) {
            cell.alive = false; playCellDeath();
            spawnParticles(game, cell.x, cell.y, T.red, 10);
            if (game.phase === 'tutorial') game.tutTrapped = true;
            for (let j = 0; j < 4; j++) {
              const ca = Math.random() * Math.PI * 2, cr = 15 + Math.random() * 25;
              game.charges.push({ x: cell.x + Math.cos(ca) * cr, y: cell.y + Math.sin(ca) * cr, flicker: Math.random() * Math.PI * 2, alive: true });
            }
            break;
          }
        }
      }
      game.stormCells = game.stormCells.filter(s => s.alive);

      // Particles
      for (const p of game.particles) { p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; }
      game.particles = game.particles.filter(p => p.life > 0);

      if (game.flashTimer > 0) game.flashTimer -= dt;
      if (game.phase === 'tutorial' && game.boosting) game.tutBoostTime += dt;

      // Tutorial check
      if (game.phase === 'tutorial' && !game.tutSuccess && TUT_STEPS[game.tutStep].check(game)) {
        game.tutSuccess = true; game.tutSuccessTimer = 1.2;
        spawnParticles(game, game.bolt.x, game.bolt.y, T.bolt, 12);
        game.flashColor = T.bolt; game.flashTimer = 0.1;
      }
      if (game.phase === 'tutorial' && game.tutSuccess) {
        game.tutSuccessTimer -= dt;
        if (game.tutSuccessTimer <= 0) advanceTutorial(game);
      }
    }

    // --- Draw ---
    function draw() {
      const game = g.current;
      if (game.phase === 'start' || game.phase === 'over') return;

      ctx!.fillStyle = T.bg; ctx!.fillRect(0, 0, game.W, game.H);

      // Storm clouds
      ctx!.globalAlpha = 0.03;
      for (let i = 0; i < 8; i++) {
        const cx = game.arenaCenter.x + Math.sin(game.gameTime * 0.9 + i * 1.7) * game.arenaRadius * 0.4;
        const cy = game.arenaCenter.y + Math.cos(game.gameTime * 0.6 + i * 2.1) * game.arenaRadius * 0.3;
        ctx!.fillStyle = T.purple; ctx!.beginPath(); ctx!.arc(cx, cy, 40 + i * 20, 0, Math.PI * 2); ctx!.fill();
      }
      ctx!.globalAlpha = 0.02;
      for (let i = 0; i < 6; i++) {
        const cx = game.arenaCenter.x + Math.cos(game.gameTime * 0.7 + i * 2.3) * game.arenaRadius * 0.5;
        const cy = game.arenaCenter.y + Math.sin(game.gameTime * 0.5 + i * 1.9) * game.arenaRadius * 0.4;
        ctx!.fillStyle = T.purple; ctx!.beginPath(); ctx!.arc(cx, cy, 30 + i * 25, 0, Math.PI * 2); ctx!.fill();
      }
      ctx!.globalAlpha = 1;

      // Arena boundary
      ctx!.strokeStyle = game.surgeActive ? T.red : T.purple;
      ctx!.lineWidth = game.surgeActive ? 3 : 1.5;
      ctx!.globalAlpha = 0.4 + (game.surgeActive ? Math.sin(game.gameTime * 20) * 0.3 : 0);
      ctx!.beginPath(); ctx!.arc(game.arenaCenter.x, game.arenaCenter.y, game.arenaRadius, 0, Math.PI * 2); ctx!.stroke();
      ctx!.globalAlpha = 1;

      // Edge darkening
      const edgeGrad = ctx!.createRadialGradient(game.arenaCenter.x, game.arenaCenter.y, game.arenaRadius * 0.6, game.arenaCenter.x, game.arenaCenter.y, game.arenaRadius + 40);
      edgeGrad.addColorStop(0, 'rgba(0,0,0,0)'); edgeGrad.addColorStop(1, 'rgba(0,0,0,0.9)');
      ctx!.fillStyle = edgeGrad; ctx!.fillRect(0, 0, game.W, game.H);

      // Charges
      for (const c of game.charges) {
        if (!c.alive) continue;
        c.flicker += 0.3;
        ctx!.globalAlpha = 0.5 + Math.sin(c.flicker) * 0.4;
        ctx!.fillStyle = T.white; ctx!.shadowBlur = 6; ctx!.shadowColor = T.white;
        ctx!.beginPath(); ctx!.arc(c.x, c.y, 3, 0, Math.PI * 2); ctx!.fill();
        ctx!.lineWidth = 1; ctx!.strokeStyle = T.white; ctx!.beginPath();
        ctx!.moveTo(c.x - 5, c.y); ctx!.lineTo(c.x + 5, c.y);
        ctx!.moveTo(c.x, c.y - 5); ctx!.lineTo(c.x, c.y + 5);
        ctx!.stroke(); ctx!.shadowBlur = 0;
      }
      ctx!.globalAlpha = 1;

      // Storm cell trails
      for (const cell of game.stormCells) {
        if (!cell.alive) continue;
        ctx!.lineWidth = 2;
        for (let i = 1; i < cell.trail.length; i++) {
          const age = game.gameTime - cell.trail[i].t;
          const alpha = Math.max(0, 1 - age / (TRAIL_LIFE * 0.7)) * 0.4;
          ctx!.strokeStyle = T.red; ctx!.globalAlpha = alpha;
          const rj = ((i % 2) * 2 - 1) * 2;
          ctx!.beginPath();
          ctx!.moveTo(cell.trail[i - 1].x + rj, cell.trail[i - 1].y);
          ctx!.lineTo(cell.trail[i].x - rj, cell.trail[i].y);
          ctx!.stroke();
        }
        ctx!.globalAlpha = 0.8; ctx!.fillStyle = T.red; ctx!.shadowBlur = 6; ctx!.shadowColor = T.red;
        ctx!.beginPath(); ctx!.arc(cell.x, cell.y, 4, 0, Math.PI * 2); ctx!.fill(); ctx!.shadowBlur = 0;
      }
      ctx!.globalAlpha = 1;

      // Player trail
      const trailStart = Math.max(0, game.trail.length - game.bolt.length * 2);
      ctx!.lineWidth = 2;
      for (let i = trailStart + 1; i < game.trail.length; i++) {
        const age = game.gameTime - game.trail[i].t;
        if (age > TRAIL_LIFE) continue;
        const alpha = Math.max(0, 1 - age / TRAIL_LIFE);
        const isOwned = i >= game.trail.length - game.bolt.length;
        ctx!.strokeStyle = game.boosting && isOwned ? T.gold : T.bolt;
        ctx!.globalAlpha = alpha * (isOwned ? 0.9 : 0.3);
        ctx!.shadowBlur = isOwned ? 4 + (game.bolt.length / 10) * 6 : 0;
        ctx!.shadowColor = game.boosting ? T.gold : T.bolt;
        const baseJitter = isOwned ? ((i % 2) * 2 - 1) * 3.5 : ((i % 2) * 2 - 1) * 1;
        const bigJitter = (i % 5 === 0 && isOwned) ? ((i % 10 < 5) ? 6 : -6) : 0;
        const jx = baseJitter + bigJitter;
        ctx!.beginPath();
        ctx!.moveTo(game.trail[i - 1].x + jx, game.trail[i - 1].y);
        ctx!.lineTo(game.trail[i].x - jx, game.trail[i].y);
        ctx!.stroke();
      }
      ctx!.shadowBlur = 0; ctx!.globalAlpha = 1;

      // Bolt head
      if (game.phase !== 'dying') {
        if (game.bolt.holdFlash > 0) game.bolt.holdFlash -= 1 / 60;
        const headColor = game.bolt.holdFlash > 0 ? T.gold : game.boosting ? T.gold : T.bolt;
        ctx!.fillStyle = headColor;
        ctx!.shadowBlur = game.bolt.holdFlash > 0 ? 20 : 10; ctx!.shadowColor = headColor;
        ctx!.beginPath(); ctx!.arc(game.bolt.x, game.bolt.y, HEAD_R, 0, Math.PI * 2); ctx!.fill();
        ctx!.shadowBlur = 0;
      }

      // Particles
      for (const p of game.particles) {
        ctx!.globalAlpha = p.life / p.maxLife; ctx!.fillStyle = p.color;
        ctx!.beginPath(); ctx!.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx!.fill();
      }
      ctx!.globalAlpha = 1;

      // Flash
      if (game.flashTimer > 0) {
        ctx!.fillStyle = game.flashColor; ctx!.globalAlpha = game.flashTimer / 0.15 * 0.3;
        ctx!.fillRect(0, 0, game.W, game.H); ctx!.globalAlpha = 1;
      }

      // HUD
      if (game.phase === 'playing' || game.phase === 'dying') {
        ctx!.fillStyle = T.white; ctx!.font = '16px monospace'; ctx!.textAlign = 'left';
        ctx!.fillText(game.score + '', 16, game.safeTop + 28);
        const barW = 60, barH = 4, barX = 16, barY = game.safeTop + 34;
        const pct = Math.min(game.bolt.length / 80, 1);
        ctx!.fillStyle = T.surface; ctx!.fillRect(barX, barY, barW, barH);
        ctx!.fillStyle = game.bolt.length < 5 ? T.red : game.boosting ? T.gold : T.bolt;
        ctx!.fillRect(barX, barY, barW * pct, barH);
        if (game.surgeActive) {
          ctx!.fillStyle = T.red; ctx!.globalAlpha = 0.5 + Math.sin(game.gameTime * 10) * 0.3;
          ctx!.font = 'bold 12px monospace'; ctx!.textAlign = 'center';
          ctx!.fillText('STORM SURGE', game.W / 2, game.safeTop + 28);
          ctx!.globalAlpha = 1;
        }
      }

      // Tutorial HUD
      if (game.phase === 'tutorial') {
        const step = TUT_STEPS[game.tutStep];
        ctx!.fillStyle = T.bolt; ctx!.font = 'bold 14px monospace'; ctx!.textAlign = 'center';
        ctx!.fillText(step.name, game.W / 2, game.safeTop + 24);
        ctx!.fillStyle = T.white; ctx!.font = '12px monospace';
        ctx!.fillText(step.instruction, game.W / 2, game.safeTop + 42);
        for (let i = 0; i < TUT_STEPS.length; i++) {
          const dx = game.W / 2 + (i - 2) * 16, dy = game.H - 40;
          ctx!.fillStyle = i < game.tutStep ? T.bolt : i === game.tutStep ? T.white : T.muted;
          ctx!.beginPath(); ctx!.arc(dx, dy, i === game.tutStep ? 4 : 3, 0, Math.PI * 2); ctx!.fill();
        }
        ctx!.fillStyle = T.muted; ctx!.font = '11px monospace'; ctx!.textAlign = 'right';
        ctx!.fillText('SKIP \u25B8', game.W - 16, game.safeTop + 24);
        if (game.tutSuccess) {
          ctx!.fillStyle = T.bolt; ctx!.font = 'bold 24px monospace'; ctx!.textAlign = 'center';
          ctx!.shadowBlur = 12; ctx!.shadowColor = T.bolt;
          ctx!.fillText('NICE!', game.W / 2, game.H * 0.4);
          ctx!.shadowBlur = 0;
        }
      }
    }

    // --- Input ---
    function isSkipTap(ex: number, ey: number) {
      return ex > g.current.W - 80 && ey < g.current.safeTop + 50;
    }

    function handleDown(e: PointerEvent) {
      e.preventDefault();
      const game = g.current;
      initAudio();
      if (game.phase === 'tutorial' && isSkipTap(e.clientX, e.clientY)) {
        initGame(); startRumble(); startBuzz();
        game.phase = 'playing'; game.running = true;
        setGameState('playing');
        return;
      }
      game.touching = true; game.holdTimer = 0; game.tapFired = false;
    }

    function handleUp(e: PointerEvent) {
      e.preventDefault();
      const game = g.current;
      if (!game.tapFired && game.holdTimer < HOLD_THRESHOLD && (game.phase === 'playing' || game.phase === 'tutorial')) {
        const angle = (70 - Math.min(game.bolt.length * 0.8, 35)) * Math.PI / 180;
        game.bolt.angle += angle * game.turnDir;
        game.turnDir *= -1;
        if (game.phase === 'tutorial') game.tutTaps++;
      }
      game.touching = false; game.holdTimer = 0; game.tapFired = false;
      game.boosting = false; setBuzzVolume(0);
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.code === 'Space') {
        const game = g.current;
        game.touching = true; game.holdTimer = 0; game.tapFired = false;
      }
    }
    function handleKeyUp(e: KeyboardEvent) {
      if (e.code === 'Space') {
        const game = g.current;
        if (!game.tapFired && game.holdTimer < HOLD_THRESHOLD && (game.phase === 'playing' || game.phase === 'tutorial')) {
          const angle = (70 - Math.min(game.bolt.length * 0.8, 35)) * Math.PI / 180;
          game.bolt.angle += angle * game.turnDir;
          game.turnDir *= -1;
          if (game.phase === 'tutorial') game.tutTaps++;
        }
        game.touching = false; game.holdTimer = 0; game.tapFired = false;
        game.boosting = false; setBuzzVolume(0);
      }
    }

    canvas.addEventListener('pointerdown', handleDown);
    canvas.addEventListener('pointerup', handleUp);
    canvas.addEventListener('pointercancel', handleUp as any);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);

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
      canvas.removeEventListener('pointerup', handleUp);
      canvas.removeEventListener('pointercancel', handleUp as any);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initAudio, initGame, startRumble, startBuzz]);

  return (
    <>
      <Script src="/pixelpit/social.js" strategy="lazyOnload" onLoad={() => setSocialLoaded(true)} />
      <canvas ref={canvasRef} style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', display: 'block', background: T.bg, touchAction: 'none' }} />

      {gameState === 'start' && (
        <div style={{ position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: COLORS.bg, zIndex: 100, textAlign: 'center', padding: 40 }}>
          <div style={{ background: COLORS.surface, border: `1px solid ${T.border}`, padding: '50px 60px', borderRadius: 16 }}>
            {/* Lightning bolt icon */}
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" style={{ margin: '0 auto 12px', display: 'block' }}>
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill={T.bolt} />
            </svg>
            <h1 style={{ fontFamily: 'ui-monospace, monospace', fontSize: 56, fontWeight: 700, color: T.white, marginBottom: 16, letterSpacing: 6 }}>COIL</h1>
            <p style={{ fontSize: 14, fontFamily: 'ui-monospace, monospace', color: T.muted, marginBottom: 30, lineHeight: 1.8, letterSpacing: 1 }}>
              tap to arc · hold to boost
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
              <button onClick={startGame} style={{ background: T.bolt, color: T.bg, border: 'none', padding: '16px 50px', fontSize: 16, fontFamily: 'ui-monospace, monospace', fontWeight: 600, cursor: 'pointer', borderRadius: 8, letterSpacing: 2 }}>play</button>
              <button onClick={startTutorial} style={{ background: 'transparent', color: T.muted, border: `1px solid ${T.border}`, padding: '12px 35px', fontSize: 12, fontFamily: 'ui-monospace, monospace', cursor: 'pointer', borderRadius: 6, letterSpacing: 2 }}>tutorial</button>
            </div>
          </div>
          <div style={{ marginTop: 24, fontSize: 12, fontFamily: 'ui-monospace, monospace', letterSpacing: 3 }}>
            <span style={{ color: T.bolt }}>pixel</span><span style={{ color: T.gold }}>pit</span><span style={{ color: T.muted }}> arcade</span>
          </div>
        </div>
      )}

      {gameState === 'gameover' && (
        <div style={{ position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(9,9,11,0.85)', zIndex: 100, textAlign: 'center', padding: 40 }}>
          <h1 style={{ fontFamily: 'ui-monospace, monospace', fontSize: 14, fontWeight: 300, color: T.muted, marginBottom: 12, letterSpacing: 4 }}>SHORT CIRCUIT</h1>
          <div style={{ fontFamily: 'ui-monospace, monospace', fontSize: 72, fontWeight: 700, color: T.white, marginBottom: 8 }}>{score}</div>
          <div style={{ fontFamily: 'ui-monospace, monospace', fontSize: 13, color: T.muted, marginBottom: 25 }}>sparks collected</div>
          <ScoreFlow score={score} gameId={GAME_ID} colors={SCORE_FLOW_COLORS} maxScore={200} onRankReceived={(rank, entryId) => setSubmittedEntryId(entryId ?? null)} onProgression={(prog) => setProgression(prog)} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
            <button onClick={startGame} style={{ background: T.bolt, color: T.bg, border: 'none', borderRadius: 8, padding: '16px 50px', fontSize: 15, fontFamily: 'ui-monospace, monospace', fontWeight: 600, cursor: 'pointer', letterSpacing: 2 }}>play again</button>
            <button onClick={() => setGameState('leaderboard')} style={{ background: 'transparent', border: `1px solid ${T.border}`, borderRadius: 6, color: T.muted, padding: '14px 35px', fontSize: 11, fontFamily: 'ui-monospace, monospace', cursor: 'pointer', letterSpacing: 2 }}>leaderboard</button>
            {user ? (
              <button onClick={() => setShowShareModal(true)} style={{ background: 'transparent', border: `1px solid ${T.border}`, borderRadius: 6, color: T.muted, padding: '14px 35px', fontSize: 11, fontFamily: 'ui-monospace, monospace', cursor: 'pointer', letterSpacing: 2 }}>share / groups</button>
            ) : (
              <ShareButtonContainer id="share-btn-container" url={typeof window !== 'undefined' ? `${window.location.origin}/pixelpit/arcade/coil/share/${score}` : ''} text={`I scored ${score} on COIL! Can you beat me?`} style="minimal" socialLoaded={socialLoaded} />
            )}
          </div>
        </div>
      )}

      {gameState === 'leaderboard' && <Leaderboard gameId={GAME_ID} limit={8} entryId={submittedEntryId ?? undefined} colors={LEADERBOARD_COLORS} onClose={() => setGameState('gameover')} groupsEnabled={true} gameUrl={GAME_URL} socialLoaded={socialLoaded} />}
      {showShareModal && user && <ShareModal gameUrl={GAME_URL} score={score} colors={LEADERBOARD_COLORS} onClose={() => setShowShareModal(false)} />}
    </>
  );
}

// --- Standalone helpers ---
function spawnParticles(game: { particles: Particle[] }, x: number, y: number, color: string, count: number) {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2, spd = 40 + Math.random() * 120;
    game.particles.push({ x, y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd, life: 0.3 + Math.random() * 0.3, maxLife: 0.3 + Math.random() * 0.3, color, size: 1 + Math.random() * 2 });
  }
}

function spawnCharges(game: { charges: Charge[]; arenaCenter: { x: number; y: number }; arenaRadius: number }, n: number) {
  for (let i = 0; i < n; i++) {
    const angle = Math.random() * Math.PI * 2, dist = Math.random() * (game.arenaRadius - 30);
    game.charges.push({ x: game.arenaCenter.x + Math.cos(angle) * dist, y: game.arenaCenter.y + Math.sin(angle) * dist, flicker: Math.random() * Math.PI * 2, alive: true });
  }
}

function spawnStormCell(game: { stormCells: StormCell[]; arenaCenter: { x: number; y: number }; arenaRadius: number; gameTime: number }) {
  const angle = Math.random() * Math.PI * 2;
  const dist = game.arenaRadius * 0.5 + Math.random() * game.arenaRadius * 0.3;
  const d = Math.min(game.gameTime / 60, 1);
  game.stormCells.push({
    x: game.arenaCenter.x + Math.cos(angle) * dist, y: game.arenaCenter.y + Math.sin(angle) * dist,
    angle: Math.random() * Math.PI * 2, speed: STORM_CELL_SPEED_BASE + d * 40,
    trail: [], alive: true, turnTimer: 1 + Math.random() * 2,
  });
}

function setupTutStep(game: GameState, step: number) {
  game.charges = []; game.stormCells = [];
  if (step === 0) { game.bolt.length = 15; game.score = 0; game.tutTaps = 0; }
  else if (step === 1) {
    game.bolt.length = 10; game.score = 0; game.tutCollects = 0;
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + (i - 2) * 0.3, d = 60 + i * 30;
      game.charges.push({ x: game.arenaCenter.x + Math.cos(a) * d, y: game.arenaCenter.y + Math.sin(a) * d, flicker: Math.random() * Math.PI * 2, alive: true });
    }
  } else if (step === 2) {
    game.bolt.length = 25; game.score = 10; game.tutBoostTime = 0;
  } else if (step === 3) {
    game.bolt.length = 15; game.score = 5;
    const angle = game.bolt.angle + Math.PI;
    game.stormCells.push({ x: game.arenaCenter.x + Math.cos(angle) * 80, y: game.arenaCenter.y + Math.sin(angle) * 80, angle: game.bolt.angle + Math.PI / 4, speed: 35, trail: [], alive: true, turnTimer: 3 });
    for (let i = 0; i < 4; i++) {
      const ca = game.bolt.angle + (i - 1.5) * 0.4;
      game.charges.push({ x: game.bolt.x + Math.cos(ca) * (50 + i * 25), y: game.bolt.y + Math.sin(ca) * (50 + i * 25), flicker: Math.random() * Math.PI * 2, alive: true });
    }
  } else if (step === 4) {
    game.bolt.length = 20; game.score = 5; game.tutTrapped = false;
    game.stormCells.push({ x: game.arenaCenter.x + 60, y: game.arenaCenter.y, angle: Math.PI, speed: 40, trail: [], alive: true, turnTimer: 5 });
  }
}
