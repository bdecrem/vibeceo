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
  firefly: '#facc15',
  trail: '#facc15',
  territory: '#facc15',
  territoryEdge: '#a3e635',
  ember: '#92400e',
  moth: '#f472b6',
  mothGold: '#facc15',
  white: '#ffffff',
  muted: '#71717a',
  red: '#ef4444',
};

const COLORS = {
  bg: '#09090b', surface: '#18181b', primary: '#facc15', secondary: '#a3e635',
  text: '#ffffff', muted: '#71717a', error: '#ef4444',
};

const SCORE_FLOW_COLORS: ScoreFlowColors = { ...COLORS };
const LEADERBOARD_COLORS: LeaderboardColors = { ...COLORS };
const GAME_ID = 'claim';

const CELL = 12;
const PLAYER_SPEED = 100;
const PLAYER_R = 4;
const GLOW_RADIUS = 50;
const MOTH_SPEED_BASE = 35;
const MOTH_ATTRACT_RANGE = 120;
const TERRITORY_DECAY = 45;
const DECAY_ACCEL = 0.985;
const TRAIL_MOTH_KILL = 8;

interface Moth {
  x: number; y: number; vx: number; vy: number;
  speed: number; flicker: number; alive: boolean;
}
interface Particle {
  x: number; y: number; vx: number; vy: number;
  life: number; maxLife: number; color: string; size: number;
}
interface TrailCell { x: number; y: number; gx: number; gy: number; }
interface FloodCell { gx: number; gy: number; delay: number; done?: boolean; }
interface FloodMoth { moth: Moth; delay: number; done?: boolean; }

interface TutStep {
  name: string; instruction: string;
  setup: (g: GameState) => void;
  check: (g: GameState) => boolean;
}

interface GameState {
  W: number; H: number; safeTop: number;
  gridW: number; gridH: number;
  territory: Float32Array[];
  player: { x: number; y: number; dx: number; dy: number; inZone: boolean };
  trail: TrailCell[]; moths: Moth[]; particles: Particle[];
  score: number; gameTime: number;
  phase: 'start' | 'playing' | 'dying' | 'over' | 'tutorial';
  flashTimer: number; flashColor: string;
  deathTimer: number; outsideTimer: number; decayMult: number;
  floodQueue: FloodCell[]; floodTimer: number; floodActive: boolean; floodMoths: FloodMoth[];
  litCount: number;
  audioCtx: AudioContext | null;
  running: boolean;
  // Audio nodes
  cricketNode: AudioBufferSourceNode | null; cricketGain: GainNode | null;
  humNode: OscillatorNode | null; humGain: GainNode | null;
  heartbeatInterval: ReturnType<typeof setInterval> | null;
  // Touch
  swipeStart: { x: number; y: number } | null;
  // Tutorial
  tutActive: boolean; tutStep: number; tutSuccess: boolean; tutSuccessTimer: number;
  tutTurns: number; tutReturned: boolean; tutClaimed: boolean; tutClaimedArea: number; tutTrappedMoth: boolean;
}

export default function ClaimGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<'start' | 'playing' | 'tutorial' | 'gameover' | 'leaderboard'>('start');
  const [score, setScore] = useState(0);
  const [socialLoaded, setSocialLoaded] = useState(false);
  const [submittedEntryId, setSubmittedEntryId] = useState<number | null>(null);
  const [progression, setProgression] = useState<ProgressionResult | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const { user } = usePixelpitSocial(socialLoaded);
  const GAME_URL = typeof window !== 'undefined' ? `${window.location.origin}/pixelpit/arcade/claim` : 'https://pixelpit.gg/pixelpit/arcade/claim';

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
    W: 0, H: 0, safeTop: 0, gridW: 0, gridH: 0, territory: [],
    player: { x: 0, y: 0, dx: 0, dy: -1, inZone: true },
    trail: [], moths: [], particles: [],
    score: 0, gameTime: 0,
    phase: 'start', flashTimer: 0, flashColor: '',
    deathTimer: 0, outsideTimer: 0, decayMult: 1,
    floodQueue: [], floodTimer: 0, floodActive: false, floodMoths: [],
    litCount: 0, audioCtx: null, running: false,
    cricketNode: null, cricketGain: null, humNode: null, humGain: null, heartbeatInterval: null,
    swipeStart: null,
    tutActive: false, tutStep: 0, tutSuccess: false, tutSuccessTimer: 0,
    tutTurns: 0, tutReturned: false, tutClaimed: false, tutClaimedArea: 0, tutTrappedMoth: false,
  });

  const initAudio = useCallback(() => {
    const game = g.current;
    if (!game.audioCtx) game.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    if (game.audioCtx.state === 'suspended') game.audioCtx.resume();
  }, []);

  const initGame = useCallback((game: GameState) => {
    game.gridW = Math.ceil(game.W / CELL);
    game.gridH = Math.ceil(game.H / CELL);
    game.territory = [];
    for (let y = 0; y < game.gridH; y++) game.territory[y] = new Float32Array(game.gridW);
    const cx = Math.floor(game.gridW / 2), cy = Math.floor(game.gridH / 2);
    game.litCount = 0;
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        const gx = cx + dx, gy = cy + dy;
        if (gx >= 0 && gx < game.gridW && gy >= 0 && gy < game.gridH) {
          game.territory[gy][gx] = 0.01;
          game.litCount++;
        }
      }
    }
    game.player = { x: cx * CELL + CELL / 2, y: cy * CELL + CELL / 2, dx: 0, dy: -1, inZone: true };
    game.trail = []; game.moths = []; game.particles = [];
    game.score = 0; game.gameTime = 0;
    game.flashTimer = 0; game.flashColor = '';
    game.deathTimer = 0; game.outsideTimer = 0; game.decayMult = 1;
    game.floodQueue = []; game.floodTimer = 0; game.floodActive = false; game.floodMoths = [];
  }, []);

  const startGame = useCallback(() => {
    initAudio();
    const game = g.current;
    initGame(game);
    game.phase = 'playing'; game.running = true;
    setGameState('playing'); setShowShareModal(false); setProgression(null);
  }, [initAudio, initGame]);

  const startTutorial = useCallback(() => {
    initAudio();
    const game = g.current;
    game.tutActive = true; game.tutStep = 0; game.tutSuccess = false; game.tutSuccessTimer = 0;
    initGame(game);
    game.gameTime = 0.02;
    game.score = Math.round(game.litCount / (game.gridW * game.gridH) * 100);
    game.phase = 'playing'; game.running = true;
    setGameState('tutorial');
  }, [initAudio, initGame]);

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
    function startCrickets() {
      const game = g.current;
      if (!game.audioCtx || game.cricketNode) return;
      const buf = game.audioCtx.createBuffer(1, game.audioCtx.sampleRate * 2, game.audioCtx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      game.cricketNode = game.audioCtx.createBufferSource(); game.cricketNode.buffer = buf; game.cricketNode.loop = true;
      const bp = game.audioCtx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 4000; bp.Q.value = 8;
      game.cricketGain = game.audioCtx.createGain(); game.cricketGain.gain.value = 0.02;
      game.cricketNode.connect(bp).connect(game.cricketGain).connect(game.audioCtx.destination);
      game.cricketNode.start();
    }

    function startHum() {
      const game = g.current;
      if (!game.audioCtx || game.humNode) return;
      game.humNode = game.audioCtx.createOscillator(); game.humNode.type = 'sine'; game.humNode.frequency.value = 220;
      game.humGain = game.audioCtx.createGain(); game.humGain.gain.value = 0;
      game.humNode.connect(game.humGain).connect(game.audioCtx.destination); game.humNode.start();
    }

    function setHumVolume(v: number) {
      const game = g.current;
      if (game.humGain && game.audioCtx) game.humGain.gain.setTargetAtTime(Math.min(v, 0.08), game.audioCtx.currentTime, 0.05);
    }

    function startHeartbeat(bpm: number) {
      stopHeartbeat();
      const game = g.current;
      game.heartbeatInterval = setInterval(() => {
        if (!game.audioCtx) return;
        const o = game.audioCtx.createOscillator(); o.type = 'sine'; o.frequency.value = 50;
        const gn = game.audioCtx.createGain(); gn.gain.setValueAtTime(0.12, game.audioCtx.currentTime);
        gn.gain.linearRampToValueAtTime(0, game.audioCtx.currentTime + 0.15);
        o.connect(gn).connect(game.audioCtx.destination); o.start(); o.stop(game.audioCtx.currentTime + 0.15);
      }, 60000 / bpm);
    }

    function stopHeartbeat() {
      const game = g.current;
      if (game.heartbeatInterval) { clearInterval(game.heartbeatInterval); game.heartbeatInterval = null; }
    }

    function playClaim(area: number) {
      const actx = g.current.audioCtx; if (!actx) return;
      const whompFreq = area > 30 ? 80 : 120;
      const whompDur = area > 30 ? 0.4 : 0.2;
      const o = actx.createOscillator(); o.type = 'sine';
      o.frequency.setValueAtTime(whompFreq, actx.currentTime);
      o.frequency.linearRampToValueAtTime(40, actx.currentTime + whompDur);
      const gn = actx.createGain(); gn.gain.setValueAtTime(Math.min(0.25 + area * 0.003, 0.4), actx.currentTime);
      gn.gain.linearRampToValueAtTime(0, actx.currentTime + whompDur + 0.1);
      o.connect(gn).connect(actx.destination); o.start(); o.stop(actx.currentTime + whompDur + 0.1);
      const notes = [523, 659, 784, 1047, 1319, 1568, 1760];
      const chimeCount = Math.min(Math.max(Math.floor(area / 5), 2), 7);
      for (let i = 0; i < chimeCount; i++) {
        const t = actx.currentTime + 0.04 * i;
        const c = actx.createOscillator(); c.type = 'triangle'; c.frequency.value = notes[i % notes.length];
        const cg = actx.createGain(); cg.gain.setValueAtTime(0.08, t);
        cg.gain.linearRampToValueAtTime(0, t + 0.15);
        c.connect(cg).connect(actx.destination); c.start(t); c.stop(t + 0.15);
      }
    }

    function playMothPing() {
      const actx = g.current.audioCtx; if (!actx) return;
      const pentatonic = [523, 587, 659, 784, 880];
      const freq = pentatonic[Math.floor(Math.random() * pentatonic.length)];
      const o = actx.createOscillator(); o.type = 'sine'; o.frequency.value = freq;
      const gn = actx.createGain(); gn.gain.setValueAtTime(0.1, actx.currentTime);
      gn.gain.linearRampToValueAtTime(0, actx.currentTime + 0.1);
      o.connect(gn).connect(actx.destination); o.start(); o.stop(actx.currentTime + 0.1);
    }

    function playDeath() {
      const actx = g.current.audioCtx; if (!actx) return;
      for (let i = 0; i < 6; i++) {
        const t = actx.currentTime + i * 0.04;
        const o = actx.createOscillator(); o.type = 'sine'; o.frequency.value = 400 - i * 50;
        const gn = actx.createGain(); gn.gain.setValueAtTime(0.1, t);
        gn.gain.linearRampToValueAtTime(0, t + 0.03);
        o.connect(gn).connect(actx.destination); o.start(t); o.stop(t + 0.04);
      }
      const lo = actx.createOscillator(); lo.type = 'sine'; lo.frequency.value = 55;
      const lg = actx.createGain(); lg.gain.setValueAtTime(0, actx.currentTime);
      lg.gain.setValueAtTime(0.15, actx.currentTime + 0.5);
      lg.gain.linearRampToValueAtTime(0, actx.currentTime + 2);
      lo.connect(lg).connect(actx.destination); lo.start(); lo.stop(actx.currentTime + 2);
    }

    // --- Helpers ---
    function isTerritory(game: GameState, gx: number, gy: number) {
      if (gx < 0 || gx >= game.gridW || gy < 0 || gy >= game.gridH) return false;
      return game.territory[gy][gx] > 0;
    }

    function spawnParticles(game: GameState, x: number, y: number, color: string, count: number) {
      for (let i = 0; i < count; i++) {
        const a = Math.random() * Math.PI * 2;
        const spd = 30 + Math.random() * 80;
        game.particles.push({ x, y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd, life: 0.2 + Math.random() * 0.3, maxLife: 0.2 + Math.random() * 0.3, color, size: 1 + Math.random() * 2 });
      }
    }

    function spawnMoth(game: GameState) {
      const angle = Math.random() * Math.PI * 2;
      // Difficulty ramp: d goes 0→1 over 90 seconds
      const d = Math.min(game.gameTime / 90, 1);
      // Early: spawn far away (5+ seconds of travel time). Late: spawn close (1-2 seconds away)
      const maxDim = Math.max(game.W, game.H);
      const baseDist = maxDim * 0.5;  // far at start
      const minDist = maxDim * 0.12;  // close late game
      const dist = baseDist - d * (baseDist - minDist) + Math.random() * 40;
      // Early: slow moths. Late: fast moths
      const speed = MOTH_SPEED_BASE * 0.5 + d * MOTH_SPEED_BASE * 1.2 + Math.random() * 15;
      game.moths.push({
        x: game.player.x + Math.cos(angle) * dist,
        y: game.player.y + Math.sin(angle) * dist,
        vx: (Math.random() - 0.5) * 20, vy: (Math.random() - 0.5) * 20,
        speed, flicker: Math.random() * Math.PI * 2, alive: true,
      });
    }

    function claimLoop(game: GameState): number {
      if (game.trail.length < 3) { game.trail = []; return 0; }
      for (const t of game.trail) {
        if (t.gx >= 0 && t.gx < game.gridW && t.gy >= 0 && t.gy < game.gridH) {
          if (game.territory[t.gy][t.gx] === 0) game.litCount++;
          game.territory[t.gy][t.gx] = game.gameTime;
        }
      }
      const outside: Uint8Array[] = [];
      for (let y = 0; y < game.gridH; y++) outside[y] = new Uint8Array(game.gridW);
      const queue: [number, number][] = [];
      for (let x = 0; x < game.gridW; x++) {
        if (!isTerritory(game, x, 0)) { queue.push([x, 0]); outside[0][x] = 1; }
        if (!isTerritory(game, x, game.gridH - 1)) { queue.push([x, game.gridH - 1]); outside[game.gridH - 1][x] = 1; }
      }
      for (let y = 1; y < game.gridH - 1; y++) {
        if (!isTerritory(game, 0, y)) { queue.push([0, y]); outside[y][0] = 1; }
        if (!isTerritory(game, game.gridW - 1, y)) { queue.push([game.gridW - 1, y]); outside[y][game.gridW - 1] = 1; }
      }
      while (queue.length > 0) {
        const [cx, cy] = queue.shift()!;
        for (const [ddx, ddy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
          const nx = cx + ddx, ny = cy + ddy;
          if (nx < 0 || nx >= game.gridW || ny < 0 || ny >= game.gridH) continue;
          if (outside[ny][nx] || isTerritory(game, nx, ny)) continue;
          outside[ny][nx] = 1; queue.push([nx, ny]);
        }
      }
      const closureGx = Math.floor(game.player.x / CELL);
      const closureGy = Math.floor(game.player.y / CELL);
      game.floodQueue = []; game.floodMoths = [];
      const toFlood: { gx: number; gy: number; dist: number }[] = [];
      for (let y = 0; y < game.gridH; y++) {
        for (let x = 0; x < game.gridW; x++) {
          if (!outside[y][x] && game.territory[y][x] === 0) {
            toFlood.push({ gx: x, gy: y, dist: Math.hypot(x - closureGx, y - closureGy) });
          }
        }
      }
      toFlood.sort((a, b) => a.dist - b.dist);
      const FLOOD_RATE = 0.005;
      for (let i = 0; i < toFlood.length; i++) {
        game.floodQueue.push({ gx: toFlood[i].gx, gy: toFlood[i].gy, delay: i * FLOOD_RATE });
      }
      for (const moth of game.moths) {
        if (!moth.alive) continue;
        const mgx = Math.floor(moth.x / CELL), mgy = Math.floor(moth.y / CELL);
        if (mgx >= 0 && mgx < game.gridW && mgy >= 0 && mgy < game.gridH && !outside[mgy][mgx]) {
          game.floodMoths.push({ moth, delay: Math.hypot(mgx - closureGx, mgy - closureGy) * FLOOD_RATE });
        }
      }
      game.trail = []; game.floodTimer = 0; game.floodActive = true;
      if (toFlood.length > 0 || game.floodMoths.length > 0) {
        playClaim(toFlood.length + game.floodMoths.length * 2);
        game.flashColor = T.territory; game.flashTimer = 0.15;
      }
      return toFlood.length + game.floodMoths.length * 3;
    }

    function die(game: GameState) {
      if (game.tutActive) {
        spawnParticles(game, game.player.x, game.player.y, T.red, 8);
        game.flashColor = T.red; game.flashTimer = 0.1;
        // Respawn
        const cx = Math.floor(game.gridW / 2), cy = Math.floor(game.gridH / 2);
        game.player.x = cx * CELL + CELL / 2; game.player.y = cy * CELL + CELL / 2;
        game.player.dx = 0; game.player.dy = -1; game.player.inZone = true;
        game.trail = []; game.outsideTimer = 0;
        stopHeartbeat(); setHumVolume(0);
        return;
      }
      game.phase = 'dying'; game.deathTimer = 0;
      stopHeartbeat(); setHumVolume(0);
      const pct = Math.round(game.litCount / (game.gridW * game.gridH) * 100);
      game.score = pct;
      playDeath();
    }

    // --- Tutorial ---
    const TUT_STEPS: TutStep[] = [
      {
        name: 'STEER', instruction: 'SWIPE TO TURN',
        setup(game) { game.moths = []; game.tutTurns = 0; },
        check(game) { return game.tutTurns >= 3; },
      },
      {
        name: 'LEAVE & RETURN', instruction: 'EXIT ZONE, THEN COME BACK',
        setup(game) { game.moths = []; game.tutReturned = false; },
        check(game) { return game.tutReturned; },
      },
      {
        name: 'CLOSE THE LOOP', instruction: 'MAKE A LOOP TO CLAIM LAND',
        setup(game) { game.moths = []; game.tutClaimed = false; game.tutClaimedArea = 0; },
        check(game) { return game.tutClaimedArea > 0; },
      },
      {
        name: 'TRAP MOTHS', instruction: 'LOOP AROUND A MOTH',
        setup(game) {
          game.tutTrappedMoth = false;
          const cx = Math.floor(game.gridW / 2), cy = Math.floor(game.gridH / 2);
          game.moths = [{ x: cx * CELL + CELL * 4, y: cy * CELL - CELL * 2, vx: 0, vy: 0, speed: 15, flicker: 0, alive: true }];
        },
        check(game) { return game.tutTrappedMoth; },
      },
      {
        name: 'LIGHT THE MEADOW', instruction: 'REACH 5% LIT',
        setup(game) { game.moths = []; for (let i = 0; i < 2; i++) spawnMoth(game); },
        check(game) { return game.score >= 5; },
      },
    ];

    function advanceTutorial(game: GameState) {
      game.tutStep++; game.tutSuccess = false; game.tutSuccessTimer = 0;
      if (game.tutStep >= TUT_STEPS.length) {
        game.tutActive = false;
        // Reset for real game
        game.gridW = Math.ceil(game.W / CELL); game.gridH = Math.ceil(game.H / CELL);
        game.territory = [];
        for (let y = 0; y < game.gridH; y++) game.territory[y] = new Float32Array(game.gridW);
        const cx = Math.floor(game.gridW / 2), cy = Math.floor(game.gridH / 2);
        game.litCount = 0;
        for (let dy2 = -2; dy2 <= 2; dy2++) for (let dx2 = -2; dx2 <= 2; dx2++) {
          const gx = cx + dx2, gy = cy + dy2;
          if (gx >= 0 && gx < game.gridW && gy >= 0 && gy < game.gridH) { game.territory[gy][gx] = 0.01; game.litCount++; }
        }
        game.player = { x: cx * CELL + CELL / 2, y: cy * CELL + CELL / 2, dx: 0, dy: -1, inZone: true };
        game.trail = []; game.moths = []; game.particles = [];
        game.score = 0; game.gameTime = 0; game.flashTimer = 0; game.deathTimer = 0;
        game.outsideTimer = 0; game.decayMult = 1;
        game.floodQueue = []; game.floodTimer = 0; game.floodActive = false; game.floodMoths = [];
        game.phase = 'playing';
        startCrickets(); startHum();
        setGameState('playing');
        return;
      }
      const cx = Math.floor(game.gridW / 2), cy = Math.floor(game.gridH / 2);
      game.player.x = cx * CELL + CELL / 2; game.player.y = cy * CELL + CELL / 2;
      game.player.dx = 0; game.player.dy = -1; game.player.inZone = true;
      game.trail = []; game.outsideTimer = 0;
      stopHeartbeat(); setHumVolume(0); game.gameTime = 0.02;
      TUT_STEPS[game.tutStep].setup(game);
    }

    function skipTutorial(game: GameState) {
      game.tutActive = false;
      game.gridW = Math.ceil(game.W / CELL); game.gridH = Math.ceil(game.H / CELL);
      game.territory = [];
      for (let y = 0; y < game.gridH; y++) game.territory[y] = new Float32Array(game.gridW);
      const cx = Math.floor(game.gridW / 2), cy = Math.floor(game.gridH / 2);
      game.litCount = 0;
      for (let dy2 = -2; dy2 <= 2; dy2++) for (let dx2 = -2; dx2 <= 2; dx2++) {
        const gx = cx + dx2, gy = cy + dy2;
        if (gx >= 0 && gx < game.gridW && gy >= 0 && gy < game.gridH) { game.territory[gy][gx] = 0.01; game.litCount++; }
      }
      game.player = { x: cx * CELL + CELL / 2, y: cy * CELL + CELL / 2, dx: 0, dy: -1, inZone: true };
      game.trail = []; game.moths = []; game.particles = [];
      game.score = 0; game.gameTime = 0; game.flashTimer = 0; game.deathTimer = 0;
      game.outsideTimer = 0; game.decayMult = 1;
      game.floodQueue = []; game.floodTimer = 0; game.floodActive = false; game.floodMoths = [];
      game.phase = 'playing';
      startCrickets(); startHum();
      setGameState('playing');
    }

    // --- Update ---
    function update(dt: number) {
      const game = g.current;
      if (game.phase === 'start' || game.phase === 'over') return;
      if (game.phase === 'dying') { updateDying(game, dt); return; }
      if (game.phase !== 'playing') return;

      game.gameTime += dt;
      game.decayMult *= Math.pow(DECAY_ACCEL, dt);
      if (game.flashTimer > 0) game.flashTimer -= dt;

      // Move player
      game.player.x += game.player.dx * PLAYER_SPEED * dt;
      game.player.y += game.player.dy * PLAYER_SPEED * dt;

      // Die at screen edges
      if (game.player.x < 0 || game.player.x > game.W || game.player.y < 0 || game.player.y > game.H) {
        die(game); return;
      }

      const gx = Math.floor(game.player.x / CELL);
      const gy = Math.floor(game.player.y / CELL);
      const wasInZone = game.player.inZone;
      game.player.inZone = isTerritory(game, gx, gy);

      if (!game.player.inZone) {
        game.outsideTimer += dt;
        if (!game.trail.some(t => t.gx === gx && t.gy === gy)) {
          game.trail.push({ x: game.player.x, y: game.player.y, gx, gy });
        }
        const bpm = 60 + Math.min(game.outsideTimer * 30, 120);
        if (!game.heartbeatInterval) startHeartbeat(bpm);
        setHumVolume(game.trail.length * 0.003);
        // Self-collision
        for (let i = 0; i < game.trail.length - 3; i++) {
          if (game.trail[i].gx === gx && game.trail[i].gy === gy) { die(game); return; }
        }
      } else {
        if (game.trail.length > 0) {
          const bonus = claimLoop(game);
          game.score += bonus;
          if (game.tutActive) {
            game.tutReturned = true;
            if (bonus > 0) { game.tutClaimed = true; game.tutClaimedArea += bonus; }
          }
        } else if (game.tutActive && !wasInZone) {
          game.tutReturned = true;
        }
        game.outsideTimer = 0; stopHeartbeat(); setHumVolume(0);
      }

      // Flood fill animation
      if (game.floodActive) {
        game.floodTimer += dt;
        let anyLeft = false;
        for (const cell of game.floodQueue) {
          if (cell.done) continue;
          if (game.floodTimer >= cell.delay) {
            game.territory[cell.gy][cell.gx] = game.gameTime; cell.done = true; game.litCount++;
            spawnParticles(game, cell.gx * CELL + CELL / 2, cell.gy * CELL + CELL / 2, T.territory, 1);
          } else { anyLeft = true; }
        }
        for (const fm of game.floodMoths) {
          if (fm.done) continue;
          if (game.floodTimer >= fm.delay) {
            fm.moth.alive = false; fm.done = true;
            spawnParticles(game, fm.moth.x, fm.moth.y, T.mothGold, 8);
            playMothPing();
            if (game.tutActive) game.tutTrappedMoth = true;
          } else { anyLeft = true; }
        }
        if (!anyLeft) game.floodActive = false;
      }

      // Territory decay
      const decayThreshold = TERRITORY_DECAY * game.decayMult;
      for (let y = 0; y < game.gridH; y++) {
        for (let x = 0; x < game.gridW; x++) {
          if (game.territory[y][x] > 0 && game.gameTime - game.territory[y][x] > decayThreshold) {
            game.territory[y][x] = 0; game.litCount--;
          }
        }
      }

      game.score = Math.round(game.litCount / (game.gridW * game.gridH) * 100);

      // Moth spawning — ramps over 90 seconds
      if (!game.tutActive || game.tutStep >= 4) {
        const d = Math.min(game.gameTime / 90, 1);
        const maxMoths = game.tutActive ? 3 : 2 + Math.floor(d * 10);
        const spawnChance = 0.01 + d * 0.04; // rare early, frequent late
        if (game.moths.filter(m => m.alive).length < maxMoths && Math.random() < spawnChance) {
          spawnMoth(game);
        }
      }

      // Update moths
      for (const moth of game.moths) {
        if (!moth.alive) continue;
        moth.flicker += dt * 8;
        // Difficulty ramp for moth aggression
        const aggroD = Math.min(game.gameTime / 90, 1);
        const attractStrength = 0.2 + aggroD * 0.8; // 0.2 early → 1.0 late
        const attractRange = MOTH_ATTRACT_RANGE * (0.6 + aggroD * 0.8); // smaller range early, bigger late
        if (game.trail.length > 0 && !game.player.inZone) {
          let nearest: TrailCell | null = null, nearDist = Infinity;
          for (const t of game.trail) {
            const d2 = Math.hypot(moth.x - t.x, moth.y - t.y);
            if (d2 < nearDist) { nearDist = d2; nearest = t; }
          }
          if (nearest && nearDist < attractRange + game.trail.length * 2) {
            moth.vx += (nearest.x - moth.x) / Math.max(nearDist, 1) * moth.speed * attractStrength * dt;
            moth.vy += (nearest.y - moth.y) / Math.max(nearDist, 1) * moth.speed * attractStrength * dt;
          }
        }
        // Random wander: more erratic early (less threatening), more focused late
        const wander = 50 - aggroD * 25;
        moth.vx += (Math.random() - 0.5) * wander * dt;
        moth.vy += (Math.random() - 0.5) * wander * dt;
        const mspd = Math.hypot(moth.vx, moth.vy);
        if (mspd > moth.speed) { moth.vx *= moth.speed / mspd; moth.vy *= moth.speed / mspd; }
        moth.x += moth.vx * dt; moth.y += moth.vy * dt;
        if (!game.player.inZone && game.trail.length > 0) {
          for (const t of game.trail) {
            if (Math.hypot(moth.x - t.x, moth.y - t.y) < TRAIL_MOTH_KILL) { die(game); return; }
          }
        }
        if (Math.hypot(moth.x - game.player.x, moth.y - game.player.y) < PLAYER_R + 5 && !game.player.inZone) {
          die(game); return;
        }
      }
      game.moths = game.moths.filter(m => m.alive);

      // Particles
      for (const p of game.particles) { p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; }
      game.particles = game.particles.filter(p => p.life > 0);

      // Tutorial check
      if (game.tutActive && !game.tutSuccess && TUT_STEPS[game.tutStep].check(game)) {
        game.tutSuccess = true; game.tutSuccessTimer = 1.2;
        spawnParticles(game, game.player.x, game.player.y, T.firefly, 12);
        game.flashColor = T.firefly; game.flashTimer = 0.1;
      }
      if (game.tutActive && game.tutSuccess) {
        game.tutSuccessTimer -= dt;
        if (game.tutSuccessTimer <= 0) advanceTutorial(game);
      }
      if (game.tutActive) game.decayMult = 1;
    }

    function updateDying(game: GameState, dt: number) {
      game.deathTimer += dt;
      if (game.trail.length > 0 && game.deathTimer > 0.1) {
        const seg = game.trail.pop();
        if (seg) spawnParticles(game, seg.x, seg.y, T.ember, 3);
      }
      for (const p of game.particles) { p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; }
      game.particles = game.particles.filter(p => p.life > 0);
      if (game.deathTimer > 2.0) {
        game.phase = 'over'; game.running = false;
        setScore(game.score); setGameState('gameover');
        fetch('/api/pixelpit/stats', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ game: GAME_ID }) }).catch(() => {});
      }
    }

    // --- Draw ---
    function draw() {
      const game = g.current;
      if (game.phase === 'start' || game.phase === 'over') return;

      ctx!.fillStyle = T.bg; ctx!.fillRect(0, 0, game.W, game.H);

      // Territory glow
      for (let y = 0; y < game.gridH; y++) {
        for (let x = 0; x < game.gridW; x++) {
          if (game.territory[y][x] <= 0) continue;
          const age = game.gameTime - game.territory[y][x];
          const maxAge = TERRITORY_DECAY * game.decayMult;
          const fade = Math.max(0, 1 - age / maxAge);
          if (fade > 0.7) { ctx!.fillStyle = T.territory; ctx!.globalAlpha = fade * 0.3; }
          else if (fade > 0.3) { ctx!.fillStyle = '#d97706'; ctx!.globalAlpha = fade * 0.25; }
          else { ctx!.fillStyle = T.ember; ctx!.globalAlpha = fade * 0.2; }
          ctx!.fillRect(x * CELL, y * CELL, CELL, CELL);
        }
      }
      ctx!.globalAlpha = 1;

      // Territory glow near player
      const pgx = Math.floor(game.player.x / CELL), pgy = Math.floor(game.player.y / CELL);
      const glowR = Math.ceil(GLOW_RADIUS / CELL);
      for (let dy = -glowR; dy <= glowR; dy++) {
        for (let dx = -glowR; dx <= glowR; dx++) {
          const gx2 = pgx + dx, gy2 = pgy + dy;
          if (gx2 < 0 || gx2 >= game.gridW || gy2 < 0 || gy2 >= game.gridH) continue;
          if (game.territory[gy2][gx2] <= 0) continue;
          const dist = Math.hypot(dx, dy) * CELL;
          if (dist > GLOW_RADIUS) continue;
          ctx!.fillStyle = T.territoryEdge; ctx!.globalAlpha = (1 - dist / GLOW_RADIUS) * 0.15;
          ctx!.fillRect(gx2 * CELL, gy2 * CELL, CELL, CELL);
        }
      }
      ctx!.globalAlpha = 1;

      // Fog
      const fogGrad = ctx!.createRadialGradient(game.player.x, game.player.y, GLOW_RADIUS * 0.5, game.player.x, game.player.y, GLOW_RADIUS * 2);
      fogGrad.addColorStop(0, 'rgba(9,9,11,0)'); fogGrad.addColorStop(1, 'rgba(9,9,11,0.92)');
      ctx!.fillStyle = fogGrad; ctx!.fillRect(0, 0, game.W, game.H);

      // Re-draw territory over fog
      for (let y = 0; y < game.gridH; y++) {
        for (let x = 0; x < game.gridW; x++) {
          if (game.territory[y][x] <= 0) continue;
          const age = game.gameTime - game.territory[y][x];
          const maxAge = TERRITORY_DECAY * game.decayMult;
          const fade = Math.max(0, 1 - age / maxAge);
          if (fade < 0.05) continue;
          ctx!.fillStyle = fade > 0.5 ? T.territory : T.ember;
          ctx!.globalAlpha = fade * 0.18;
          ctx!.fillRect(x * CELL, y * CELL, CELL, CELL);
        }
      }
      ctx!.globalAlpha = 1;

      // Trail with moth proximity warning
      if (game.trail.length > 1) {
        const threatened = new Set<number>();
        for (const moth of game.moths) {
          if (!moth.alive) continue;
          for (let i = 0; i < game.trail.length; i++) {
            if (Math.hypot(moth.x - game.trail[i].x, moth.y - game.trail[i].y) < 30) threatened.add(i);
          }
        }
        ctx!.lineWidth = 2; ctx!.shadowBlur = 6;
        for (let i = 1; i < game.trail.length; i++) {
          const danger = threatened.has(i) || threatened.has(i - 1);
          ctx!.strokeStyle = danger ? T.red : T.trail;
          ctx!.shadowColor = danger ? T.red : T.trail;
          ctx!.globalAlpha = danger ? 0.6 + Math.sin(game.gameTime * 15) * 0.3 : 0.8;
          ctx!.beginPath(); ctx!.moveTo(game.trail[i - 1].x, game.trail[i - 1].y);
          ctx!.lineTo(game.trail[i].x, game.trail[i].y); ctx!.stroke();
        }
        ctx!.strokeStyle = T.trail; ctx!.shadowColor = T.trail; ctx!.globalAlpha = 0.8;
        ctx!.beginPath(); ctx!.moveTo(game.trail[game.trail.length - 1].x, game.trail[game.trail.length - 1].y);
        ctx!.lineTo(game.player.x, game.player.y); ctx!.stroke();
        ctx!.shadowBlur = 0; ctx!.globalAlpha = 1;
      }

      // Moths
      for (const moth of game.moths) {
        if (!moth.alive) continue;
        const dist = Math.hypot(moth.x - game.player.x, moth.y - game.player.y);
        const nearTrail = game.trail.some(t => Math.hypot(moth.x - t.x, moth.y - t.y) < 40);
        const mgx = Math.floor(moth.x / CELL), mgy = Math.floor(moth.y / CELL);
        const nearTerritory = mgx >= 0 && mgx < game.gridW && mgy >= 0 && mgy < game.gridH && game.territory[mgy][mgx] > 0;
        const maxVis = nearTrail || nearTerritory ? 1 : (dist < 100 ? 1 : 0);
        const vis = maxVis * (dist < GLOW_RADIUS ? 1 : Math.max(0, 1 - (dist - GLOW_RADIUS) / 60));
        ctx!.globalAlpha = vis * (0.4 + Math.sin(moth.flicker) * 0.3);
        ctx!.fillStyle = T.moth; ctx!.shadowBlur = 4; ctx!.shadowColor = T.moth;
        ctx!.beginPath(); ctx!.arc(moth.x, moth.y, 3, 0, Math.PI * 2); ctx!.fill();
        ctx!.shadowBlur = 0;
      }
      ctx!.globalAlpha = 1;

      // Player firefly
      if (game.phase !== 'over') {
        ctx!.fillStyle = T.firefly; ctx!.shadowBlur = 16; ctx!.shadowColor = T.firefly;
        ctx!.beginPath(); ctx!.arc(game.player.x, game.player.y, PLAYER_R, 0, Math.PI * 2); ctx!.fill();
        ctx!.shadowBlur = 0;
        const glowGrad = ctx!.createRadialGradient(game.player.x, game.player.y, 0, game.player.x, game.player.y, GLOW_RADIUS);
        glowGrad.addColorStop(0, 'rgba(250,204,21,0.06)'); glowGrad.addColorStop(1, 'rgba(250,204,21,0)');
        ctx!.fillStyle = glowGrad;
        ctx!.fillRect(game.player.x - GLOW_RADIUS, game.player.y - GLOW_RADIUS, GLOW_RADIUS * 2, GLOW_RADIUS * 2);
      }

      // Particles
      for (const p of game.particles) {
        ctx!.globalAlpha = p.life / p.maxLife; ctx!.fillStyle = p.color;
        ctx!.beginPath(); ctx!.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx!.fill();
      }
      ctx!.globalAlpha = 1;

      // Flash
      if (game.flashTimer > 0) {
        ctx!.fillStyle = game.flashColor; ctx!.globalAlpha = game.flashTimer / 0.15 * 0.15;
        ctx!.fillRect(0, 0, game.W, game.H); ctx!.globalAlpha = 1;
      }

      // HUD
      if (game.phase === 'playing' || game.phase === 'dying') {
        ctx!.fillStyle = T.white; ctx!.font = '16px monospace'; ctx!.textAlign = 'left';
        ctx!.fillText(game.score + '%', 16, game.safeTop + 28);
        if (game.trail.length > 0) {
          const tPct = Math.min(game.trail.length / 40, 1);
          ctx!.fillStyle = game.trail.length > 20 ? T.red : T.trail; ctx!.globalAlpha = 0.5;
          ctx!.fillRect(4, game.safeTop + 50, 3, game.H * 0.3 * tPct); ctx!.globalAlpha = 1;
        }
      }

      // Tutorial HUD
      if (game.tutActive && game.phase === 'playing') {
        const step = TUT_STEPS[game.tutStep];
        ctx!.fillStyle = T.firefly; ctx!.font = 'bold 14px monospace'; ctx!.textAlign = 'center';
        ctx!.fillText(step.name, game.W / 2, game.safeTop + 24);
        ctx!.fillStyle = T.white; ctx!.font = '12px monospace';
        ctx!.fillText(step.instruction, game.W / 2, game.safeTop + 42);
        for (let i = 0; i < TUT_STEPS.length; i++) {
          const dotX = game.W / 2 + (i - 2) * 16, dotY = game.H - 40;
          ctx!.fillStyle = i < game.tutStep ? T.firefly : i === game.tutStep ? T.white : T.muted;
          ctx!.beginPath(); ctx!.arc(dotX, dotY, i === game.tutStep ? 4 : 3, 0, Math.PI * 2); ctx!.fill();
        }
        ctx!.fillStyle = T.muted; ctx!.font = '11px monospace'; ctx!.textAlign = 'right';
        ctx!.fillText('SKIP ▸', game.W - 16, game.safeTop + 24);
        if (game.tutSuccess) {
          ctx!.fillStyle = T.firefly; ctx!.font = 'bold 24px monospace'; ctx!.textAlign = 'center';
          ctx!.shadowBlur = 12; ctx!.shadowColor = T.firefly;
          ctx!.fillText('NICE!', game.W / 2, game.H * 0.4); ctx!.shadowBlur = 0;
        }
      }
      ctx!.textAlign = 'left';
    }

    // --- Input ---
    const handleDown = (e: PointerEvent) => {
      e.preventDefault();
      const game = g.current;
      initAudio();

      if (game.tutActive) {
        if (e.clientX > game.W - 80 && e.clientY < game.safeTop + 50) { skipTutorial(game); return; }
      }
      game.swipeStart = { x: e.clientX, y: e.clientY };
    };

    const handleMove = (e: PointerEvent) => {
      e.preventDefault();
      const game = g.current;
      if (!game.swipeStart || game.phase !== 'playing') return;
      const dx = e.clientX - game.swipeStart.x;
      const dy = e.clientY - game.swipeStart.y;
      if (Math.hypot(dx, dy) < 10) return;
      let ndx = game.player.dx, ndy = game.player.dy;
      if (Math.abs(dx) > Math.abs(dy)) { ndx = dx > 0 ? 1 : -1; ndy = 0; }
      else { ndx = 0; ndy = dy > 0 ? 1 : -1; }
      if (ndx !== -game.player.dx || ndy !== -game.player.dy) {
        if (ndx !== game.player.dx || ndy !== game.player.dy) {
          if (game.tutActive) game.tutTurns++;
        }
        game.player.dx = ndx; game.player.dy = ndy;
      }
      game.swipeStart = { x: e.clientX, y: e.clientY };
    };

    const handleUp = (e: PointerEvent) => { e.preventDefault(); g.current.swipeStart = null; };

    const handleKeyDown = (e: KeyboardEvent) => {
      const game = g.current;
      if (game.phase !== 'playing') return;
      const odx = game.player.dx, ody = game.player.dy;
      if ((e.key === 'ArrowUp' || e.key === 'w') && game.player.dy !== 1) { game.player.dx = 0; game.player.dy = -1; }
      if ((e.key === 'ArrowDown' || e.key === 's') && game.player.dy !== -1) { game.player.dx = 0; game.player.dy = 1; }
      if ((e.key === 'ArrowLeft' || e.key === 'a') && game.player.dx !== 1) { game.player.dx = -1; game.player.dy = 0; }
      if ((e.key === 'ArrowRight' || e.key === 'd') && game.player.dx !== -1) { game.player.dx = 1; game.player.dy = 0; }
      if (game.tutActive && (game.player.dx !== odx || game.player.dy !== ody)) game.tutTurns++;
    };

    canvas.addEventListener('pointerdown', handleDown);
    canvas.addEventListener('pointermove', handleMove);
    canvas.addEventListener('pointerup', handleUp);
    canvas.addEventListener('pointercancel', handleUp);
    document.addEventListener('keydown', handleKeyDown);

    // Init tutorial setup if entering tutorial
    if (g.current.tutActive && g.current.phase === 'playing') {
      TUT_STEPS[0].setup(g.current);
      startCrickets(); startHum();
    }

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
      canvas.removeEventListener('pointercancel', handleUp);
      document.removeEventListener('keydown', handleKeyDown);
      const game = g.current;
      if (game.heartbeatInterval) clearInterval(game.heartbeatInterval);
      if (game.cricketNode) try { game.cricketNode.stop(); } catch {}
      if (game.humNode) try { game.humNode.stop(); } catch {}
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initAudio]);

  return (
    <>
      <Script src="/pixelpit/social.js" strategy="lazyOnload" onLoad={() => setSocialLoaded(true)} />
      <canvas ref={canvasRef} style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', display: 'block', background: T.bg, touchAction: 'none' }} />

      {gameState === 'start' && (
        <div style={{ position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: COLORS.bg, zIndex: 100, textAlign: 'center', padding: 40 }}>
          <div style={{ background: COLORS.surface, border: `1px solid ${T.border}`, padding: '50px 60px', borderRadius: 16 }}>
            <div style={{ width: 20, height: 20, borderRadius: '50%', background: T.firefly, margin: '0 auto 12px', border: `2px solid ${T.white}` }} />
            <h1 style={{ fontFamily: 'ui-monospace, monospace', fontSize: 56, fontWeight: 700, color: T.white, marginBottom: 16, letterSpacing: 6 }}>CLAIM</h1>
            <p style={{ fontSize: 14, fontFamily: 'ui-monospace, monospace', color: T.muted, marginBottom: 30, lineHeight: 1.8, letterSpacing: 1 }}>
              swipe to steer · loop to claim
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
              <button onClick={startGame} style={{ background: T.firefly, color: T.bg, border: 'none', padding: '16px 50px', fontSize: 16, fontFamily: 'ui-monospace, monospace', fontWeight: 600, cursor: 'pointer', borderRadius: 8, letterSpacing: 2 }}>play</button>
              <button onClick={startTutorial} style={{ background: 'transparent', color: T.muted, border: `1px solid ${T.border}`, padding: '12px 35px', fontSize: 12, fontFamily: 'ui-monospace, monospace', cursor: 'pointer', borderRadius: 6, letterSpacing: 2 }}>tutorial</button>
            </div>
          </div>
          <div style={{ marginTop: 24, fontSize: 12, fontFamily: 'ui-monospace, monospace', letterSpacing: 3 }}>
            <span style={{ color: T.territoryEdge }}>pixel</span><span style={{ color: T.firefly }}>pit</span><span style={{ color: T.muted }}> arcade</span>
          </div>
        </div>
      )}

      {gameState === 'gameover' && (
        <div style={{ position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(9,9,11,0.85)', zIndex: 100, textAlign: 'center', padding: 40 }}>
          <h1 style={{ fontFamily: 'ui-monospace, monospace', fontSize: 14, fontWeight: 300, color: T.ember, marginBottom: 12, letterSpacing: 4 }}>LIGHTS OUT</h1>
          <div style={{ fontFamily: 'ui-monospace, monospace', fontSize: 72, fontWeight: 700, color: T.white, marginBottom: 8 }}>{score}%</div>
          <div style={{ fontFamily: 'ui-monospace, monospace', fontSize: 13, color: T.muted, marginBottom: 25 }}>meadow claimed</div>
          <ScoreFlow score={score} gameId={GAME_ID} colors={SCORE_FLOW_COLORS} maxScore={100} onRankReceived={(rank, entryId) => setSubmittedEntryId(entryId ?? null)} onProgression={(prog) => setProgression(prog)} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
            <button onClick={startGame} style={{ background: T.firefly, color: T.bg, border: 'none', borderRadius: 8, padding: '16px 50px', fontSize: 15, fontFamily: 'ui-monospace, monospace', fontWeight: 600, cursor: 'pointer', letterSpacing: 2 }}>play again</button>
            <button onClick={() => setGameState('leaderboard')} style={{ background: 'transparent', border: `1px solid ${T.border}`, borderRadius: 6, color: T.muted, padding: '14px 35px', fontSize: 11, fontFamily: 'ui-monospace, monospace', cursor: 'pointer', letterSpacing: 2 }}>leaderboard</button>
            {user ? (
              <button onClick={() => setShowShareModal(true)} style={{ background: 'transparent', border: `1px solid ${T.border}`, borderRadius: 6, color: T.muted, padding: '14px 35px', fontSize: 11, fontFamily: 'ui-monospace, monospace', cursor: 'pointer', letterSpacing: 2 }}>share / groups</button>
            ) : (
              <ShareButtonContainer id="share-btn-container" url={typeof window !== 'undefined' ? `${window.location.origin}/pixelpit/arcade/claim/share/${score}` : ''} text={`I claimed ${score}% on CLAIM! Can you beat me?`} style="minimal" socialLoaded={socialLoaded} />
            )}
          </div>
        </div>
      )}

      {gameState === 'leaderboard' && <Leaderboard gameId={GAME_ID} limit={8} entryId={submittedEntryId ?? undefined} colors={LEADERBOARD_COLORS} onClose={() => setGameState('gameover')} groupsEnabled={true} gameUrl={GAME_URL} socialLoaded={socialLoaded} />}
      {showShareModal && user && <ShareModal gameUrl={GAME_URL} score={score} colors={LEADERBOARD_COLORS} onClose={() => setShowShareModal(false)} />}
    </>
  );
}
