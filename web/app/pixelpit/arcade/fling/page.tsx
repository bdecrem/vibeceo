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
  white: '#ffffff',
  gnat: '#a3e635',
  moth: '#f472b6',
  firefly: '#facc15',
  wasp: '#ef4444',
  silk: '#ffffff',
  muted: '#71717a',
  gold: '#facc15',
  cyan: '#22d3ee',
};

const COLORS = {
  bg: '#09090b', surface: '#18181b', primary: '#ffffff', secondary: '#a3e635',
  text: '#ffffff', muted: '#71717a', error: '#ef4444',
};

const SCORE_FLOW_COLORS: ScoreFlowColors = { ...COLORS };
const LEADERBOARD_COLORS: LeaderboardColors = { ...COLORS };
const GAME_ID = 'fling';

const SPIDER_R = 5;
const SLIDE_SPEED_BASE = 100;
const FLING_RANGE = 120;
const SLOWMO_DURATION = 0.6;
const FLING_VY = -350;
const FLING_VX_RANGE = 80;
const GRAVITY = 500;
const STRAND_SPACING = 200;
const CATCH_DELAY = 0.08;

interface Bug { x: number; y: number; type: string; alive: boolean; vx: number; vy: number; size: number; blinkPhase: number; caught: boolean; }
interface Strand { x: number; y: number; len: number; }
interface SilkLine { x1: number; y1: number; x2: number; y2: number; timer: number; live: boolean; }
interface Particle { x: number; y: number; vx: number; vy: number; life: number; color: string; size: number; }
interface Dewdrop { x: number; y: number; alive: boolean; pulse: number; }
interface CatchEntry { bug: Bug; dist: number; }

interface GameState {
  spider: { x: number; y: number; vy: number; vx: number; onStrand: Strand | null; legAnim: number; dewSlowTimer: number; deathWarning: number; };
  strands: Strand[]; bugs: Bug[]; silkLines: SilkLine[]; particles: Particle[]; dewdrops: Dewdrop[];
  cameraY: number; score: number; combo: number; comboTimer: number; flingCount: number;
  phase: string; gameTime: number; slowmoTimer: number;
  screenShake: { timer: number; intensity: number; }; flashColor: string | null; flashTimer: number;
  catchQueue: CatchEntry[]; catchIndex: number; catchTimer: number;
  strandMagnetTarget: Strand | null;
  W: number; H: number; safeTop: number; audioCtx: AudioContext | null; running: boolean;
  tutStep: number; tutSuccess: boolean; tutSuccessTimer: number; tutCatches: number; tutFlings: number;
}

export default function FlingGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<'start' | 'playing' | 'tutorial' | 'gameover' | 'leaderboard'>('start');
  const [score, setScore] = useState(0);
  const [socialLoaded, setSocialLoaded] = useState(false);
  const [submittedEntryId, setSubmittedEntryId] = useState<number | null>(null);
  const [progression, setProgression] = useState<ProgressionResult | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const { user } = usePixelpitSocial(socialLoaded);
  const GAME_URL = typeof window !== 'undefined' ? `${window.location.origin}/pixelpit/arcade/fling` : 'https://pixelpit.gg/pixelpit/arcade/fling';

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
    spider: { x: 0, y: 0, vy: 0, vx: 0, onStrand: null, legAnim: 0, dewSlowTimer: 0, deathWarning: 0 },
    strands: [], bugs: [], silkLines: [], particles: [], dewdrops: [],
    cameraY: 0, score: 0, combo: 0, comboTimer: 0, flingCount: 0,
    phase: 'start', gameTime: 0, slowmoTimer: 0,
    screenShake: { timer: 0, intensity: 0 }, flashColor: null, flashTimer: 0,
    catchQueue: [], catchIndex: 0, catchTimer: 0, strandMagnetTarget: null,
    W: 0, H: 0, safeTop: 0, audioCtx: null, running: false,
    tutStep: 0, tutSuccess: false, tutSuccessTimer: 0, tutCatches: 0, tutFlings: 0,
  });

  const initAudio = useCallback(() => {
    const game = g.current;
    if (!game.audioCtx) game.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    if (game.audioCtx.state === 'suspended') game.audioCtx.resume();
  }, []);

  const startGame = useCallback(() => {
    initAudio();
    const game = g.current;
    initGameState(game);
    game.phase = 'sliding'; game.running = true;
    setGameState('playing'); setShowShareModal(false); setProgression(null);
  }, [initAudio]);

  const startTutorial = useCallback(() => {
    initAudio();
    const game = g.current;
    game.phase = 'tutorial_sliding'; game.running = true;
    game.tutStep = 0; game.tutSuccess = false; game.tutSuccessTimer = 0;
    game.gameTime = 0; game.tutCatches = 0; game.tutFlings = 0;
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
    let slideOsc: OscillatorNode | null = null;
    let slideGain: GainNode | null = null;
    function startSlideHum() {
      const actx = g.current.audioCtx; if (!actx || slideOsc) return;
      slideOsc = actx.createOscillator(); slideGain = actx.createGain();
      slideOsc.connect(slideGain); slideGain.connect(actx.destination);
      slideOsc.type = 'sine'; slideOsc.frequency.value = 800; slideGain.gain.value = 0.02;
      slideOsc.start();
    }
    function stopSlideHum() { if (slideOsc) { try { slideOsc.stop(); } catch {} slideOsc = null; slideGain = null; } }
    function updateSlideHum(speed: number) { if (slideOsc) slideOsc.frequency.value = 600 + speed * 2; }

    function playFlingLaunch() {
      const actx = g.current.audioCtx; if (!actx) return;
      const bufSize = actx.sampleRate * 0.08;
      const buf = actx.createBuffer(1, bufSize, actx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufSize) * 0.3;
      const src = actx.createBufferSource(); src.buffer = buf;
      const gn = actx.createGain();
      gn.gain.setValueAtTime(0.15, actx.currentTime);
      gn.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + 0.08);
      src.connect(gn); gn.connect(actx.destination); src.start(); src.stop(actx.currentTime + 0.08);
      const osc = actx.createOscillator(); const og = actx.createGain();
      osc.connect(og); og.connect(actx.destination); osc.type = 'sine';
      osc.frequency.setValueAtTime(400, actx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1200, actx.currentTime + 0.08);
      og.gain.setValueAtTime(0.08, actx.currentTime);
      og.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + 0.08);
      osc.start(); osc.stop(actx.currentTime + 0.08);
    }

    function playCatch(index: number) {
      const actx = g.current.audioCtx; if (!actx) return;
      const notes = [523, 587, 659, 784, 880, 1047, 1175];
      const freq = notes[index % notes.length];
      const osc = actx.createOscillator(); const gn = actx.createGain();
      osc.connect(gn); gn.connect(actx.destination);
      osc.type = 'triangle'; osc.frequency.value = freq;
      gn.gain.setValueAtTime(0.12, actx.currentTime);
      gn.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + 0.2);
      osc.start(); osc.stop(actx.currentTime + 0.2);
    }

    function playComboChord() {
      const actx = g.current.audioCtx; if (!actx) return;
      [523, 659, 784].forEach((f, i) => {
        const osc = actx.createOscillator(); const gn = actx.createGain();
        osc.connect(gn); gn.connect(actx.destination);
        osc.type = 'triangle'; osc.frequency.value = f;
        gn.gain.setValueAtTime(0.06, actx.currentTime + i * 0.03);
        gn.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + 0.4);
        osc.start(actx.currentTime + i * 0.03); osc.stop(actx.currentTime + 0.4);
      });
    }

    function playWaspBuzz() {
      const actx = g.current.audioCtx; if (!actx) return;
      const osc = actx.createOscillator(); const gn = actx.createGain();
      osc.connect(gn); gn.connect(actx.destination);
      osc.type = 'sawtooth'; osc.frequency.value = 120;
      gn.gain.setValueAtTime(0.15, actx.currentTime);
      gn.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + 0.2);
      osc.start(); osc.stop(actx.currentTime + 0.2);
    }

    function playMiss() {
      const actx = g.current.audioCtx; if (!actx) return;
      const bufSize = actx.sampleRate * 0.3;
      const buf = actx.createBuffer(1, bufSize, actx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1) * 0.15 * (1 - i / bufSize);
      const src = actx.createBufferSource(); src.buffer = buf;
      const filt = actx.createBiquadFilter(); filt.type = 'lowpass'; filt.frequency.value = 400;
      const gn = actx.createGain();
      gn.gain.setValueAtTime(0.1, actx.currentTime);
      gn.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + 0.3);
      src.connect(filt); filt.connect(gn); gn.connect(actx.destination);
      src.start(); src.stop(actx.currentTime + 0.3);
    }

    // --- Helpers ---
    function getBugColor(type: string) {
      return type === 'gnat' ? T.gnat : type === 'moth' ? T.moth : type === 'firefly' ? T.firefly : T.wasp;
    }

    function spawnParticles(x: number, y: number, color: string, count: number) {
      const game = g.current;
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2, speed = 20 + Math.random() * 60;
        game.particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: 1, color, size: 1.5 + Math.random() * 2 });
      }
    }

    function makeBug(x: number, y: number, type: string, d: number): Bug {
      const speed = type === 'wasp' ? 60 + d * 40 : type === 'moth' ? 30 + d * 20 : 15 + d * 10;
      const dir = Math.random() < 0.5 ? 1 : -1;
      return { x, y, type, alive: true, vx: speed * dir, vy: (Math.random() - 0.5) * 10,
        size: type === 'gnat' ? 3 : type === 'moth' ? 5 : type === 'firefly' ? 3 : 4,
        blinkPhase: Math.random() * Math.PI * 2, caught: false };
    }

    function generateStrand(game: GameState, worldY: number) {
      const x = 40 + Math.random() * (game.W - 80);
      const strand: Strand = { x, y: worldY, len: 80 + Math.random() * 60 };
      game.strands.push(strand);
      const d = Math.min(game.flingCount / 30, 1);
      const clusterCount = 1 + Math.floor(Math.random() * 2) + Math.floor(d);
      for (let c = 0; c < clusterCount; c++) {
        const cx = 40 + Math.random() * (game.W - 80);
        const cy = worldY - 40 - Math.random() * (STRAND_SPACING - 80);
        const gnatCount = 2 + Math.floor(Math.random() * 3);
        for (let i = 0; i < gnatCount; i++) {
          game.bugs.push(makeBug(cx + (Math.random() - 0.5) * 30, cy + (Math.random() - 0.5) * 20, 'gnat', d));
        }
        if (game.flingCount > 15 && Math.random() < Math.min(0.15 + d * 0.3, 0.5)) {
          game.bugs.push(makeBug(cx + (Math.random() < 0.5 ? -25 : 25), cy + (Math.random() - 0.5) * 15, 'wasp', d));
        }
        if (game.flingCount > 5 && Math.random() < 0.3 + d * 0.2) {
          game.bugs.push(makeBug(Math.random() < 0.5 ? -10 : game.W + 10, cy + (Math.random() - 0.5) * 40, 'moth', d));
        }
        if (game.flingCount > 15 && Math.random() < 0.15 + d * 0.1) {
          game.bugs.push(makeBug(Math.random() * game.W, cy + (Math.random() - 0.5) * 60, 'firefly', d));
        }
      }
      if (Math.random() < 0.4) {
        game.dewdrops.push({ x: strand.x + (Math.random() - 0.5) * 20, y: worldY - 10 - Math.random() * (strand.len - 20), alive: true, pulse: Math.random() * Math.PI * 2 });
      }
    }

    // --- Fling / slowmo ---
    function enterSlowmo(game: GameState) {
      game.phase = game.phase.startsWith('tutorial') ? 'tutorial_slowmo' : 'slowmo';
      game.slowmoTimer = SLOWMO_DURATION;
      game.catchQueue = [];
      for (const bug of game.bugs) {
        if (!bug.alive || bug.caught) continue;
        const dx = bug.x - game.spider.x;
        const dy = (bug.y - game.cameraY) - (game.spider.y - game.cameraY);
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist <= FLING_RANGE) {
          if (bug.type === 'firefly') { const vis = Math.sin(game.gameTime * 4 + bug.blinkPhase); if (vis < 0) continue; }
          game.catchQueue.push({ bug, dist });
        }
      }
      game.catchQueue.sort((a, b) => a.dist - b.dist);
      game.catchIndex = 0; game.catchTimer = 0; game.combo = 0;
    }

    function doFling(game: GameState) {
      const isTut = game.phase.startsWith('tutorial');
      game.phase = isTut ? 'tutorial_flinging' : 'flinging';
      game.spider.onStrand = null;
      game.spider.vy = FLING_VY;
      game.spider.vx = (Math.random() - 0.5) * FLING_VX_RANGE;
      game.spider.legAnim = 1;
      playFlingLaunch();
      setTimeout(() => {
        if (isTut ? game.phase !== 'tutorial_flinging' : game.phase !== 'flinging') return;
        enterSlowmo(game);
      }, 120);
    }

    function processCatches(game: GameState, dt: number) {
      game.catchTimer -= dt;
      if (game.catchIndex < game.catchQueue.length && game.catchTimer <= 0) {
        game.catchTimer = CATCH_DELAY;
        const entry = game.catchQueue[game.catchIndex];
        game.silkLines.push({ x1: game.spider.x, y1: game.spider.y - game.cameraY, x2: entry.bug.x, y2: entry.bug.y - game.cameraY, timer: 0.15, live: true });
        entry.bug.caught = true; entry.bug.alive = false;
        if (entry.bug.type === 'wasp') {
          game.score = Math.max(0, game.score - 5);
          game.screenShake = { timer: 0.15, intensity: 3 };
          playWaspBuzz();
          spawnParticles(entry.bug.x, entry.bug.y - game.cameraY, T.wasp, 8);
        } else {
          const pts = entry.bug.type === 'gnat' ? 1 : entry.bug.type === 'moth' ? 3 : 5;
          game.score += pts; game.combo++;
          game.tutCatches++;
          playCatch(game.catchIndex);
          spawnParticles(entry.bug.x, entry.bug.y - game.cameraY, getBugColor(entry.bug.type), 5);
        }
        game.catchIndex++;
      }
    }

    function endSlowmo(game: GameState) {
      if (game.combo === 0) playMiss();
      if (game.combo >= 3) { playComboChord(); game.flashColor = T.gold; game.flashTimer = 0.2; game.comboTimer = 2; }
      game.flingCount++;
      game.tutFlings++;
      game.phase = game.phase.startsWith('tutorial') ? 'tutorial_falling' : 'falling';
    }

    function die(game: GameState) {
      game.phase = 'dead'; stopSlideHum(); playMiss();
      setTimeout(() => { game.phase = 'over'; game.running = false; setScore(game.score); setGameState('gameover');
        fetch('/api/pixelpit/stats', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ game: GAME_ID }) }).catch(() => {});
      }, 1200);
    }

    // --- Tutorial steps ---
    const TUT_STEPS = [
      { name: 'SLIDE & FLING', instruction: 'TAP TO FLING OFF THE STRAND',
        setup(game: GameState) {
          game.spider = { x: game.W / 2, y: game.H * 0.3, vy: 0, vx: 0, onStrand: null, legAnim: 0, dewSlowTimer: 0, deathWarning: 0 };
          game.strands = []; game.bugs = []; game.silkLines = []; game.particles = []; game.dewdrops = [];
          game.cameraY = 0; game.score = 0; game.combo = 0; game.comboTimer = 0; game.flingCount = 0;
          game.slowmoTimer = 0; game.catchQueue = []; game.catchIndex = 0; game.catchTimer = 0;
          game.screenShake = { timer: 0, intensity: 0 }; game.flashColor = null; game.flashTimer = 0;
          game.tutFlings = 0;
          for (let i = 0; i < 4; i++) game.strands.push({ x: game.W * 0.3 + Math.random() * game.W * 0.4, y: i * STRAND_SPACING + 100, len: 100 });
          game.spider.onStrand = game.strands[0]; game.spider.x = game.strands[0].x; game.spider.y = game.strands[0].y;
        },
        check(game: GameState) { return game.tutFlings >= 2; },
      },
      { name: 'CATCH BUGS', instruction: 'FLING NEAR BUGS TO CATCH',
        setup(game: GameState) {
          game.spider = { x: game.W / 2, y: game.H * 0.3, vy: 0, vx: 0, onStrand: null, legAnim: 0, dewSlowTimer: 0, deathWarning: 0 };
          game.strands = []; game.bugs = []; game.silkLines = []; game.particles = []; game.dewdrops = [];
          game.cameraY = 0; game.score = 0; game.combo = 0; game.comboTimer = 0; game.flingCount = 0;
          game.slowmoTimer = 0; game.catchQueue = []; game.catchIndex = 0; game.catchTimer = 0;
          game.screenShake = { timer: 0, intensity: 0 }; game.flashColor = null; game.flashTimer = 0;
          game.tutCatches = 0;
          game.strands.push({ x: game.W / 2, y: 100, len: 90 });
          game.bugs.push(makeBug(game.W / 2 + 40, 60, 'gnat', 0));
          game.bugs.push(makeBug(game.W / 2 - 30, 70, 'gnat', 0));
          game.bugs.push(makeBug(game.W / 2 + 10, 50, 'gnat', 0));
          game.bugs.forEach(b => { b.vx = 0; b.vy = 0; });
          game.strands.push({ x: game.W * 0.4, y: 350, len: 90 });
          game.strands.push({ x: game.W * 0.6, y: 600, len: 90 });
          game.spider.onStrand = game.strands[0]; game.spider.x = game.strands[0].x; game.spider.y = game.strands[0].y;
        },
        check(game: GameState) { return game.tutCatches >= 2; },
      },
      { name: 'AVOID WASPS', instruction: 'RED BUGS COST -5 POINTS',
        setup(game: GameState) {
          game.spider = { x: game.W / 2, y: game.H * 0.3, vy: 0, vx: 0, onStrand: null, legAnim: 0, dewSlowTimer: 0, deathWarning: 0 };
          game.strands = []; game.bugs = []; game.silkLines = []; game.particles = []; game.dewdrops = [];
          game.cameraY = 0; game.score = 10; game.combo = 0; game.comboTimer = 0; game.flingCount = 0;
          game.slowmoTimer = 0; game.catchQueue = []; game.catchIndex = 0; game.catchTimer = 0;
          game.screenShake = { timer: 0, intensity: 0 }; game.flashColor = null; game.flashTimer = 0;
          game.strands.push({ x: game.W / 2, y: 100, len: 90 });
          game.bugs.push(makeBug(game.W / 2 - 40, 65, 'gnat', 0));
          game.bugs.push(makeBug(game.W / 2 + 50, 55, 'wasp', 0));
          game.bugs.forEach(b => { b.vx = 0; b.vy = 0; });
          game.strands.push({ x: game.W * 0.45, y: 350, len: 90 });
          game.strands.push({ x: game.W * 0.55, y: 600, len: 90 });
          game.spider.onStrand = game.strands[0]; game.spider.x = game.strands[0].x; game.spider.y = game.strands[0].y;
        },
        check(game: GameState) { return game.flingCount >= 1; },
      },
      { name: 'COMBO', instruction: 'CATCH 3+ FOR COMBO BONUS',
        setup(game: GameState) {
          game.spider = { x: game.W / 2, y: game.H * 0.3, vy: 0, vx: 0, onStrand: null, legAnim: 0, dewSlowTimer: 0, deathWarning: 0 };
          game.strands = []; game.bugs = []; game.silkLines = []; game.particles = []; game.dewdrops = [];
          game.cameraY = 0; game.score = 0; game.combo = 0; game.comboTimer = 0; game.flingCount = 0;
          game.slowmoTimer = 0; game.catchQueue = []; game.catchIndex = 0; game.catchTimer = 0;
          game.screenShake = { timer: 0, intensity: 0 }; game.flashColor = null; game.flashTimer = 0;
          game.strands.push({ x: game.W / 2, y: 100, len: 90 });
          game.bugs.push(makeBug(game.W / 2 - 30, 60, 'gnat', 0));
          game.bugs.push(makeBug(game.W / 2 + 20, 55, 'gnat', 0));
          game.bugs.push(makeBug(game.W / 2 - 10, 45, 'gnat', 0));
          game.bugs.push(makeBug(game.W / 2 + 40, 50, 'moth', 0));
          game.bugs.forEach(b => { b.vx = 0; b.vy = 0; });
          game.strands.push({ x: game.W * 0.5, y: 350, len: 90 });
          game.spider.onStrand = game.strands[0]; game.spider.x = game.strands[0].x; game.spider.y = game.strands[0].y;
        },
        check(game: GameState) { return game.combo >= 3; },
      },
      { name: 'HUNT!', instruction: 'REACH SCORE 10',
        setup(game: GameState) {
          game.spider = { x: game.W / 2, y: game.H * 0.3, vy: 0, vx: 0, onStrand: null, legAnim: 0, dewSlowTimer: 0, deathWarning: 0 };
          game.strands = []; game.bugs = []; game.silkLines = []; game.particles = []; game.dewdrops = [];
          game.cameraY = 0; game.score = 0; game.combo = 0; game.comboTimer = 0; game.flingCount = 0;
          game.slowmoTimer = 0; game.catchQueue = []; game.catchIndex = 0; game.catchTimer = 0;
          game.screenShake = { timer: 0, intensity: 0 }; game.flashColor = null; game.flashTimer = 0;
          for (let i = 0; i < 15; i++) {
            const x = 40 + Math.random() * (game.W - 80);
            const sy = i * STRAND_SPACING + 100;
            game.strands.push({ x, y: sy, len: 80 + Math.random() * 60 });
            const bugCount = 2 + Math.floor(Math.random() * 3);
            for (let j = 0; j < bugCount; j++) {
              game.bugs.push(makeBug(x + (Math.random() - 0.5) * 100, sy - 30 - Math.random() * (STRAND_SPACING - 80), 'gnat', 0));
            }
          }
          game.spider.onStrand = game.strands[0]; game.spider.x = game.strands[0].x; game.spider.y = game.strands[0].y;
        },
        check(game: GameState) { return game.score >= 10; },
      },
    ];

    // --- Drawing ---
    function drawCobwebs(game: GameState) {
      ctx!.strokeStyle = T.border; ctx!.lineWidth = 0.5; ctx!.globalAlpha = 0.2;
      const scroll = game.cameraY * 0.2;
      for (let i = 0; i < 5; i++) {
        const cx = ((i * 173 + 50) % game.W);
        const cy = ((i * 127 + scroll) % (game.H + 200)) - 100;
        ctx!.beginPath();
        for (let j = 0; j < 6; j++) { const a = j * Math.PI / 3; ctx!.moveTo(cx, cy); ctx!.lineTo(cx + Math.cos(a) * 60, cy + Math.sin(a) * 60); }
        ctx!.stroke();
        for (let r = 20; r <= 60; r += 20) { ctx!.beginPath(); ctx!.arc(cx, cy, r, 0, Math.PI * 2); ctx!.stroke(); }
      }
      ctx!.globalAlpha = 1;
    }

    function drawScene(game: GameState) {
      const inSlowmo = game.phase === 'slowmo' || game.phase === 'tutorial_slowmo';
      ctx!.save();
      if (game.screenShake.timer > 0) {
        const s = game.screenShake.intensity * (game.screenShake.timer / 0.15);
        ctx!.translate((Math.random() * 2 - 1) * s, (Math.random() * 2 - 1) * s);
      }
      if (inSlowmo) { ctx!.fillStyle = 'rgba(0,0,0,0.6)'; ctx!.fillRect(0, 0, game.W, game.H); }

      // Strands
      for (const strand of game.strands) {
        const sy = strand.y - game.cameraY;
        if (sy + strand.len < -20 || sy > game.H + 20) continue;
        ctx!.strokeStyle = T.white; ctx!.lineWidth = 1.5; ctx!.globalAlpha = inSlowmo ? 0.2 : 0.5;
        ctx!.shadowBlur = 3; ctx!.shadowColor = T.white;
        ctx!.beginPath(); ctx!.moveTo(strand.x, sy); ctx!.lineTo(strand.x, sy + strand.len); ctx!.stroke();
        ctx!.shadowBlur = 0; ctx!.globalAlpha = 1;
      }

      // Dewdrops
      for (const dew of game.dewdrops) {
        if (!dew.alive) continue;
        const dy = dew.y - game.cameraY; if (dy < -10 || dy > game.H + 10) continue;
        dew.pulse += 0.04;
        ctx!.fillStyle = T.cyan; ctx!.globalAlpha = inSlowmo ? 0.15 : 0.7;
        ctx!.beginPath(); ctx!.arc(dew.x, dy, 3 * (1 + Math.sin(dew.pulse) * 0.2), 0, Math.PI * 2); ctx!.fill();
        ctx!.globalAlpha = 1;
      }

      // Bugs
      for (const bug of game.bugs) {
        if (!bug.alive) continue;
        const by = bug.y - game.cameraY; if (by < -20 || by > game.H + 20) continue;
        let alpha = inSlowmo ? 1 : 0.9;
        const color = getBugColor(bug.type);
        if (bug.type === 'firefly') { if (Math.sin(game.gameTime * 4 + bug.blinkPhase) < 0) alpha = 0.1; }
        let drawX = bug.x, drawY = by;
        if (bug.type === 'wasp') { drawX += (Math.random() * 2 - 1) * 1.5; drawY += (Math.random() * 2 - 1) * 1.5; }
        ctx!.fillStyle = color; ctx!.globalAlpha = alpha; ctx!.shadowBlur = inSlowmo ? 14 : 3; ctx!.shadowColor = color;
        ctx!.beginPath(); ctx!.arc(drawX, drawY, bug.size, 0, Math.PI * 2); ctx!.fill();
        if (bug.type === 'moth') {
          const wa = Math.sin(game.gameTime * 6) * 0.3;
          ctx!.beginPath(); ctx!.ellipse(drawX - 4, drawY, 3, 5, wa, 0, Math.PI * 2); ctx!.fill();
          ctx!.beginPath(); ctx!.ellipse(drawX + 4, drawY, 3, 5, -wa, 0, Math.PI * 2); ctx!.fill();
        }
        ctx!.shadowBlur = 0; ctx!.globalAlpha = 1;
      }

      // Silk lines
      for (const sl of game.silkLines) {
        ctx!.strokeStyle = T.silk; ctx!.lineWidth = 1.5; ctx!.globalAlpha = sl.timer / 0.15;
        ctx!.shadowBlur = 6; ctx!.shadowColor = T.silk;
        ctx!.beginPath(); ctx!.moveTo(game.spider.x, game.spider.y - game.cameraY); ctx!.lineTo(sl.x2, sl.y2); ctx!.stroke();
        ctx!.shadowBlur = 0; ctx!.globalAlpha = 1;
      }

      // Catch range
      if (inSlowmo) {
        ctx!.strokeStyle = T.white; ctx!.lineWidth = 0.5; ctx!.globalAlpha = 0.15;
        ctx!.beginPath(); ctx!.arc(game.spider.x, game.spider.y - game.cameraY, FLING_RANGE, 0, Math.PI * 2); ctx!.stroke();
        ctx!.globalAlpha = 1;
      }

      // Spider
      if (game.phase !== 'over' && game.phase !== 'dead') {
        const sx = game.spider.x, sy = game.spider.y - game.cameraY;
        ctx!.fillStyle = T.white; ctx!.shadowBlur = inSlowmo ? 12 : 4; ctx!.shadowColor = T.white;
        ctx!.beginPath(); ctx!.arc(sx, sy, SPIDER_R, 0, Math.PI * 2); ctx!.fill();
        ctx!.strokeStyle = T.white; ctx!.lineWidth = 1; ctx!.shadowBlur = 0;
        const ls = game.spider.legAnim > 0 ? 8 + game.spider.legAnim * 6 : 6;
        for (let i = 0; i < 4; i++) {
          const a = (i - 1.5) * 0.4; const lx = Math.cos(a + Math.PI / 2) * ls; const ly = Math.sin(a) * 3;
          ctx!.beginPath(); ctx!.moveTo(sx - lx, sy + ly - 2 + i * 2); ctx!.lineTo(sx - lx - 4, sy + ly + 2 + i * 2); ctx!.stroke();
          ctx!.beginPath(); ctx!.moveTo(sx + lx, sy + ly - 2 + i * 2); ctx!.lineTo(sx + lx + 4, sy + ly + 2 + i * 2); ctx!.stroke();
        }
        ctx!.shadowBlur = 0;
      }

      // Particles
      for (const p of game.particles) {
        ctx!.fillStyle = p.color; ctx!.globalAlpha = p.life;
        ctx!.beginPath(); ctx!.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx!.fill(); ctx!.globalAlpha = 1;
      }

      ctx!.restore();

      // Flash
      if (game.flashTimer > 0 && game.flashColor) {
        const edgeW = game.W * 0.15; const alpha = game.flashTimer / 0.2 * 0.3;
        ctx!.fillStyle = game.flashColor; ctx!.globalAlpha = alpha;
        ctx!.fillRect(0, 0, edgeW, game.H); ctx!.fillRect(game.W - edgeW, 0, edgeW, game.H);
        ctx!.globalAlpha = 1;
      }

      // Death warning
      if (game.spider.deathWarning > 0.05) {
        ctx!.strokeStyle = T.wasp; ctx!.lineWidth = 3; ctx!.globalAlpha = game.spider.deathWarning * 0.3;
        ctx!.strokeRect(2, 2, game.W - 4, game.H - 4); ctx!.globalAlpha = 1;
      }

      // HUD
      ctx!.fillStyle = T.white; ctx!.font = 'bold 24px monospace'; ctx!.textAlign = 'left';
      ctx!.fillText(game.score + '', 16, 32 + game.safeTop);
      if (game.comboTimer > 0 && game.combo >= 3) {
        ctx!.textAlign = 'center'; ctx!.fillStyle = T.gold; ctx!.font = 'bold 18px monospace';
        ctx!.globalAlpha = Math.min(1, game.comboTimer / 0.5); ctx!.shadowBlur = 6; ctx!.shadowColor = T.gold;
        ctx!.fillText(game.combo + 'x COMBO', game.W / 2, 32 + game.safeTop);
        ctx!.shadowBlur = 0; ctx!.globalAlpha = 1;
      }
      ctx!.textAlign = 'left';
    }

    // --- Update ---
    function updateCommon(game: GameState, dt: number) {
      if (game.flashTimer > 0) game.flashTimer -= dt;
      if (game.comboTimer > 0) game.comboTimer -= dt;
      if (game.screenShake.timer > 0) game.screenShake.timer -= dt;
      const timeScale = (game.phase === 'slowmo' || game.phase === 'tutorial_slowmo') ? 0.15 : 1;
      for (const bug of game.bugs) {
        if (!bug.alive || bug.caught) continue;
        bug.x += bug.vx * dt * timeScale; bug.y += bug.vy * dt * timeScale;
        if (bug.x < -20) bug.x = game.W + 20; if (bug.x > game.W + 20) bug.x = -20;
      }
      for (let i = game.silkLines.length - 1; i >= 0; i--) { game.silkLines[i].timer -= dt; if (game.silkLines[i].timer <= 0) game.silkLines.splice(i, 1); }
      for (let i = game.particles.length - 1; i >= 0; i--) {
        const p = game.particles[i]; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 100 * dt; p.life -= dt * 2.5;
        if (p.life <= 0) game.particles.splice(i, 1);
      }
    }

    function updateSliding(game: GameState, dt: number) {
      const baseSpeed = SLIDE_SPEED_BASE + game.flingCount * 2;
      const speed = game.spider.dewSlowTimer > 0 ? baseSpeed * 0.6 : baseSpeed;
      game.spider.y += speed * dt;
      updateSlideHum(speed);
      for (const dew of game.dewdrops) {
        if (!dew.alive) continue;
        const dx = game.spider.x - dew.x, dy = game.spider.y - dew.y;
        if (dx * dx + dy * dy < 400) { dew.alive = false; game.score += 2; game.spider.dewSlowTimer = 0.3; spawnParticles(dew.x, dew.y - game.cameraY, T.cyan, 4); playCatch(0); }
      }
      if (game.spider.dewSlowTimer > 0) game.spider.dewSlowTimer -= dt;
      if (game.spider.onStrand && game.spider.y > game.spider.onStrand.y + game.spider.onStrand.len) doFling(game);
      const targetCam = game.spider.y - game.H * 0.3;
      game.cameraY += (targetCam - game.cameraY) * 3 * dt;
    }

    function updateFlinging(game: GameState, dt: number) {
      game.spider.vy += GRAVITY * dt; game.spider.y += game.spider.vy * dt; game.spider.x += game.spider.vx * dt;
      game.spider.legAnim = Math.max(0, game.spider.legAnim - dt * 3);
      const targetCam = game.spider.y - game.H * 0.4;
      game.cameraY += (targetCam - game.cameraY) * 3 * dt;
    }

    function updateSlowmo(game: GameState, dt: number) {
      game.slowmoTimer -= dt;
      game.spider.vy += GRAVITY * dt * 0.15; game.spider.y += game.spider.vy * dt * 0.15; game.spider.x += game.spider.vx * dt * 0.15;
      processCatches(game, dt);
      if (game.slowmoTimer <= 0) endSlowmo(game);
      const targetCam = game.spider.y - game.H * 0.4;
      game.cameraY += (targetCam - game.cameraY) * 1 * dt;
    }

    function updateFalling(game: GameState, dt: number, isTut: boolean) {
      game.spider.vy += GRAVITY * dt; game.spider.y += game.spider.vy * dt; game.spider.x += game.spider.vx * dt;
      game.spider.legAnim = Math.max(0, game.spider.legAnim - dt * 3);
      let nearestStrand: Strand | null = null; let nearestDist = 40;
      for (const strand of game.strands) {
        if (game.spider.y >= strand.y - 20 && game.spider.y <= strand.y + strand.len + 20) {
          const dx = Math.abs(game.spider.x - strand.x);
          if (dx < nearestDist) { nearestDist = dx; nearestStrand = strand; }
        }
      }
      if (nearestStrand) game.spider.x += (nearestStrand.x - game.spider.x) * 3 * dt;
      for (const strand of game.strands) {
        if (game.spider.y >= strand.y && game.spider.y <= strand.y + strand.len && Math.abs(game.spider.x - strand.x) < 20 && game.spider.vy > 0) {
          game.spider.onStrand = strand; game.spider.x = strand.x; game.spider.vy = 0; game.spider.vx = 0;
          game.phase = isTut ? 'tutorial_sliding' : 'sliding'; break;
        }
      }
      if (!nearestStrand && game.spider.vy > 100) game.spider.deathWarning = Math.min((game.spider.deathWarning || 0) + dt * 2, 1);
      else game.spider.deathWarning = Math.max((game.spider.deathWarning || 0) - dt * 4, 0);

      if (isTut && game.spider.y - game.cameraY > game.H + 100) {
        const closest = game.strands.reduce<Strand | null>((best, s) => {
          if (s.y > game.cameraY && s.y < game.cameraY + game.H * 2) return (!best || s.y < best.y) ? s : best;
          return best;
        }, null);
        if (closest) { game.spider.onStrand = closest; game.spider.x = closest.x; game.spider.y = closest.y; game.spider.vy = 0; game.spider.vx = 0; game.cameraY = game.spider.y - game.H * 0.3; game.phase = 'tutorial_sliding'; }
      }
      if (!isTut && game.spider.y - game.cameraY > game.H + 50) die(game);
      const targetCam = game.spider.y - game.H * 0.4;
      game.cameraY += (targetCam - game.cameraY) * 3 * dt;
    }

    function update(dt: number) {
      const game = g.current;
      if (game.phase === 'start' || game.phase === 'over' || game.phase === 'dead') { game.gameTime += dt; return; }
      game.gameTime += dt;
      updateCommon(game, dt);

      const isTut = game.phase.startsWith('tutorial');
      const basePhase = isTut ? game.phase.replace('tutorial_', '') : game.phase;

      if (basePhase === 'sliding') updateSliding(game, dt);
      else if (basePhase === 'flinging') updateFlinging(game, dt);
      else if (basePhase === 'slowmo') updateSlowmo(game, dt);
      else if (basePhase === 'falling') updateFalling(game, dt, isTut);

      // Generate strands ahead
      if (!isTut || game.tutStep === 4) {
        let lastStrandY = game.strands.length > 0 ? game.strands[game.strands.length - 1].y : 0;
        while (lastStrandY < game.cameraY + game.H * 2) { lastStrandY += STRAND_SPACING; generateStrand(game, lastStrandY); }
      }
      game.strands = game.strands.filter(s => s.y + s.len > game.cameraY - 100);
      game.bugs = game.bugs.filter(b => b.y > game.cameraY - 100);
      game.dewdrops = game.dewdrops.filter(d => d.y > game.cameraY - 100);

      // Tutorial check
      if (isTut) {
        if (!game.tutSuccess && TUT_STEPS[game.tutStep].check(game)) { game.tutSuccess = true; game.tutSuccessTimer = 1.5; playCatch(0); }
        if (game.tutSuccess) {
          game.tutSuccessTimer -= dt;
          if (game.tutSuccessTimer <= 0) {
            game.tutStep++; game.tutSuccess = false; game.tutSuccessTimer = 0;
            if (game.tutStep >= TUT_STEPS.length) { stopSlideHum(); initGameState(game); game.phase = 'sliding'; startSlideHum(); setGameState('playing'); return; }
            TUT_STEPS[game.tutStep].setup(game); game.phase = 'tutorial_sliding';
          }
        }
      }
    }

    function draw() {
      const game = g.current;
      if (game.phase === 'start' || game.phase === 'over') return;
      ctx!.fillStyle = T.bg; ctx!.fillRect(0, 0, game.W, game.H);
      drawCobwebs(game); drawScene(game);

      // Tutorial overlay
      if (game.phase.startsWith('tutorial')) {
        const step = TUT_STEPS[game.tutStep];
        ctx!.textAlign = 'center';
        ctx!.fillStyle = T.muted; ctx!.font = '12px monospace';
        ctx!.fillText('TUTORIAL ' + (game.tutStep + 1) + ' / ' + TUT_STEPS.length, game.W / 2, 24 + game.safeTop);
        ctx!.fillStyle = T.white; ctx!.font = 'bold 20px monospace';
        ctx!.fillText(step.name, game.W / 2, 48 + game.safeTop);
        if (!game.tutSuccess) { ctx!.fillStyle = T.muted; ctx!.font = '14px monospace'; ctx!.fillText(step.instruction, game.W / 2, game.H - 40); }
        if (game.tutStep === 4) { ctx!.textAlign = 'left'; ctx!.fillStyle = T.white; ctx!.font = 'bold 22px monospace'; ctx!.fillText(game.score + ' / 10', 16, 32 + game.safeTop); }
        if (game.tutSuccess) {
          ctx!.globalAlpha = Math.min(1, game.tutSuccessTimer);
          ctx!.textAlign = 'center'; ctx!.fillStyle = T.gold; ctx!.font = 'bold 28px monospace';
          ctx!.shadowBlur = 15; ctx!.shadowColor = T.gold;
          ctx!.fillText(game.tutStep === TUT_STEPS.length - 1 ? 'GO!' : 'NICE!', game.W / 2, game.H / 2);
          ctx!.shadowBlur = 0; ctx!.globalAlpha = 1;
        }
        ctx!.textAlign = 'right'; ctx!.fillStyle = T.muted; ctx!.font = '12px monospace';
        ctx!.fillText('SKIP ›', game.W - 16, 24 + game.safeTop);
        ctx!.textAlign = 'left';
      }
    }

    // --- Input ---
    function handleInput() {
      const game = g.current;
      initAudio();
      if (game.phase === 'tutorial_sliding') { doFling(game); return; }
      if (game.phase === 'sliding') { doFling(game); return; }
    }

    const handleTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      const game = g.current;
      initAudio();
      if (game.phase.startsWith('tutorial')) {
        const ex = e.touches[0].clientX, ey = e.touches[0].clientY;
        if (ex >= game.W - 80 && ey <= 50 + game.safeTop) {
          stopSlideHum(); initGameState(game); game.phase = 'sliding'; game.running = true; startSlideHum(); setGameState('playing'); return;
        }
      }
      handleInput();
    };
    const handleMouseDown = (e: MouseEvent) => {
      const game = g.current;
      initAudio();
      if (game.phase.startsWith('tutorial')) {
        if (e.clientX >= game.W - 80 && e.clientY <= 50 + game.safeTop) {
          stopSlideHum(); initGameState(game); game.phase = 'sliding'; game.running = true; startSlideHum(); setGameState('playing'); return;
        }
      }
      handleInput();
    };
    const handleKeyDown = (e: KeyboardEvent) => { if (e.key === ' ' || e.key === 'Enter') handleInput(); };

    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('keydown', handleKeyDown);

    // Init tutorial setup if needed
    if (g.current.phase === 'tutorial_sliding') { startSlideHum(); TUT_STEPS[0].setup(g.current); }

    let lastTime = performance.now(); let animId: number;
    function loop(ts: number) {
      const dt = Math.min((ts - lastTime) / 1000, 0.05); lastTime = ts;
      if (g.current.running) { update(dt); draw(); }
      animId = requestAnimationFrame(loop);
    }
    animId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animId); window.removeEventListener('resize', resize);
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('keydown', handleKeyDown);
      stopSlideHum();
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
            {/* Spider on strand */}
            <div style={{ position: 'relative', height: 60, marginBottom: 12 }}>
              <div style={{ position: 'absolute', left: '50%', top: 0, width: 1.5, height: 40, background: T.white, opacity: 0.4, transform: 'translateX(-50%)' }} />
              <div style={{ position: 'absolute', left: '50%', top: 32, width: 14, height: 14, borderRadius: '50%', background: T.white, transform: 'translateX(-50%)' }} />
            </div>
            <h1 style={{ fontFamily: 'ui-monospace, monospace', fontSize: 56, fontWeight: 700, color: T.white, marginBottom: 16, letterSpacing: 6 }}>FLING</h1>
            <p style={{ fontSize: 14, fontFamily: 'ui-monospace, monospace', color: T.muted, marginBottom: 30, lineHeight: 1.8, letterSpacing: 1 }}>
              tap to fling · catch bugs mid-air
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
              <button onClick={startGame} style={{ background: T.white, color: T.bg, border: 'none', padding: '16px 50px', fontSize: 16, fontFamily: 'ui-monospace, monospace', fontWeight: 600, cursor: 'pointer', borderRadius: 8, letterSpacing: 2 }}>play</button>
              <button onClick={startTutorial} style={{ background: 'transparent', color: T.muted, border: `1px solid ${T.border}`, padding: '12px 35px', fontSize: 12, fontFamily: 'ui-monospace, monospace', cursor: 'pointer', borderRadius: 6, letterSpacing: 2 }}>tutorial</button>
            </div>
          </div>
          <div style={{ marginTop: 24, fontSize: 12, fontFamily: 'ui-monospace, monospace', letterSpacing: 3 }}>
            <span style={{ color: T.gnat }}>pixel</span><span style={{ color: T.cyan }}>pit</span><span style={{ color: T.muted }}> arcade</span>
          </div>
        </div>
      )}

      {gameState === 'gameover' && (
        <div style={{ position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(9,9,11,0.85)', zIndex: 100, textAlign: 'center', padding: 40 }}>
          <h1 style={{ fontFamily: 'ui-monospace, monospace', fontSize: 14, fontWeight: 300, color: T.muted, marginBottom: 12, letterSpacing: 4 }}>WEB SNAPPED</h1>
          <div style={{ fontFamily: 'ui-monospace, monospace', fontSize: 72, fontWeight: 700, color: T.white, marginBottom: 8 }}>{score}</div>
          <div style={{ fontFamily: 'ui-monospace, monospace', fontSize: 13, color: T.muted, marginBottom: 25 }}>bugs caught</div>
          <ScoreFlow score={score} gameId={GAME_ID} colors={SCORE_FLOW_COLORS} maxScore={200} onRankReceived={(rank, entryId) => setSubmittedEntryId(entryId ?? null)} onProgression={(prog) => setProgression(prog)} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
            <button onClick={startGame} style={{ background: T.white, color: T.bg, border: 'none', borderRadius: 8, padding: '16px 50px', fontSize: 15, fontFamily: 'ui-monospace, monospace', fontWeight: 600, cursor: 'pointer', letterSpacing: 2 }}>play again</button>
            <button onClick={() => setGameState('leaderboard')} style={{ background: 'transparent', border: `1px solid ${T.border}`, borderRadius: 6, color: T.muted, padding: '14px 35px', fontSize: 11, fontFamily: 'ui-monospace, monospace', cursor: 'pointer', letterSpacing: 2 }}>leaderboard</button>
            {user ? (
              <button onClick={() => setShowShareModal(true)} style={{ background: 'transparent', border: `1px solid ${T.border}`, borderRadius: 6, color: T.muted, padding: '14px 35px', fontSize: 11, fontFamily: 'ui-monospace, monospace', cursor: 'pointer', letterSpacing: 2 }}>share / groups</button>
            ) : (
              <ShareButtonContainer id="share-btn-container" url={typeof window !== 'undefined' ? `${window.location.origin}/pixelpit/arcade/fling/share/${score}` : ''} text={`I caught ${score} bugs on FLING! Can you beat me?`} style="minimal" socialLoaded={socialLoaded} />
            )}
          </div>
        </div>
      )}

      {gameState === 'leaderboard' && <Leaderboard gameId={GAME_ID} limit={8} entryId={submittedEntryId ?? undefined} colors={LEADERBOARD_COLORS} onClose={() => setGameState('gameover')} groupsEnabled={true} gameUrl={GAME_URL} socialLoaded={socialLoaded} />}
      {showShareModal && user && <ShareModal gameUrl={GAME_URL} score={score} colors={LEADERBOARD_COLORS} onClose={() => setShowShareModal(false)} />}
    </>
  );
}

function initGameState(game: { spider: any; strands: any[]; bugs: any[]; silkLines: any[]; particles: any[]; dewdrops: any[]; cameraY: number; score: number; combo: number; comboTimer: number; flingCount: number; phase: string; gameTime: number; slowmoTimer: number; screenShake: any; flashColor: string | null; flashTimer: number; catchQueue: any[]; catchIndex: number; catchTimer: number; strandMagnetTarget: any; W: number; H: number; }) {
  game.spider = { x: game.W / 2, y: game.H * 0.3, vy: 0, vx: 0, onStrand: null, legAnim: 0, dewSlowTimer: 0, deathWarning: 0 };
  game.strands = []; game.bugs = []; game.silkLines = []; game.particles = []; game.dewdrops = [];
  game.cameraY = 0; game.score = 0; game.combo = 0; game.comboTimer = 0; game.flingCount = 0;
  game.gameTime = 0; game.slowmoTimer = 0;
  game.screenShake = { timer: 0, intensity: 0 }; game.flashColor = null; game.flashTimer = 0;
  game.catchQueue = []; game.catchIndex = 0; game.catchTimer = 0; game.strandMagnetTarget = null;
  // Generate initial strands — use simple inline generation since we don't have the full generateStrand here
  for (let i = 0; i < 15; i++) {
    const x = 40 + Math.random() * (game.W - 80);
    const strand = { x, y: i * STRAND_SPACING + 100, len: 80 + Math.random() * 60 };
    game.strands.push(strand);
  }
  game.spider.onStrand = game.strands[0];
  game.spider.x = game.strands[0].x;
  game.spider.y = game.strands[0].y;
}
