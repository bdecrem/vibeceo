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
  bg: '#09090b', surface: '#18181b', slime: '#a3e635', gold: '#facc15',
  goldDark: '#b8960f', cyan: '#22d3ee', fuchsia: '#d946ef',
  text: '#ffffff', grey: '#555555', danger: '#ef4444',
};

const COLORS = {
  bg: '#09090b', surface: '#18181b', primary: '#a3e635', secondary: '#facc15',
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

const GAME_ID = 'snip';
const RIBBON_BASE_WIDTH = 50;
const RIBBON_MIN_WIDTH = 18;
const RIBBON_SEGMENT_LEN = 10;

interface RibbonPoint { x: number; y: number; }
interface Particle { x: number; y: number; vx: number; vy: number; r: number; color: string; life: number; maxLife: number; }
interface CutPoint { x: number; y: number; life: number; }

export default function SnipGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<'start' | 'playing' | 'gameover' | 'leaderboard'>('start');
  const [score, setScore] = useState(0);
  const [finalDepth, setFinalDepth] = useState(0);
  const [finalStreak, setFinalStreak] = useState(0);
  const [socialLoaded, setSocialLoaded] = useState(false);
  const [submittedEntryId, setSubmittedEntryId] = useState<number | null>(null);
  const [progression, setProgression] = useState<ProgressionResult | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);

  const { user } = usePixelpitSocial(socialLoaded);
  const GAME_URL = typeof window !== 'undefined' ? `${window.location.origin}/pixelpit/arcade/snip` : 'https://pixelpit.gg/pixelpit/arcade/snip';

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
    scissors: { x: 0, y: 80, angle: 0 },
    cutTrail: [] as CutPoint[], particles: [] as Particle[],
    ribbonPoints: [] as RibbonPoint[], ribbonGenY: 0, ribbonWidthOverride: 0,
    score: 0, bestCenter: 0, speedMult: 1,
    cameraY: 0, scrollSpeed: 120, holding: false, touchX: 0,
    lastSnipScore: 0, screenShake: { timer: 0, intensity: 0 },
    gameTime: 0, deadTimer: 0,
    phase: 'start' as 'start' | 'playing' | 'tutorial' | 'dead' | 'over',
    running: false, W: 0, H: 0,
    audioCtx: null as AudioContext | null,
    cutNoiseNode: null as AudioBufferSourceNode | null,
    cutNoiseGain: null as GainNode | null,
    playTime: 0, graceTimer: 1.0,
    // tutorial
    tutorialStep: -1, tutorialPhase: 'instruction' as 'instruction' | 'playing' | 'success',
    tutorialTimer: 0, tutorialDistanceCut: 0,
  });

  // Audio
  const initAudio = useCallback(() => {
    const game = g.current;
    if (!game.audioCtx) game.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    if (game.audioCtx.state === 'suspended') game.audioCtx.resume();
  }, []);

  const startCutNoise = useCallback(() => {
    const game = g.current;
    if (!game.audioCtx || game.cutNoiseNode) return;
    const bufSize = game.audioCtx.sampleRate * 2;
    const buf = game.audioCtx.createBuffer(1, bufSize, game.audioCtx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1) * 0.5;
    game.cutNoiseNode = game.audioCtx.createBufferSource();
    game.cutNoiseNode.buffer = buf; game.cutNoiseNode.loop = true;
    const filter = game.audioCtx.createBiquadFilter();
    filter.type = 'bandpass'; filter.frequency.value = 4000; filter.Q.value = 1;
    game.cutNoiseGain = game.audioCtx.createGain(); game.cutNoiseGain.gain.value = 0;
    game.cutNoiseNode.connect(filter); filter.connect(game.cutNoiseGain); game.cutNoiseGain.connect(game.audioCtx.destination);
    game.cutNoiseNode.start();
  }, []);

  const stopCutNoise = useCallback(() => {
    const game = g.current;
    if (game.cutNoiseNode) { game.cutNoiseNode.stop(); game.cutNoiseNode = null; game.cutNoiseGain = null; }
  }, []);

  const setCutVolume = useCallback((vol: number) => { if (g.current.cutNoiseGain) g.current.cutNoiseGain.gain.value = vol; }, []);

  const playSnip = useCallback(() => {
    const ctx = g.current.audioCtx; if (!ctx) return;
    const osc = ctx.createOscillator(); const gn = ctx.createGain();
    osc.connect(gn); gn.connect(ctx.destination); osc.type = 'sine'; osc.frequency.value = 2000;
    gn.gain.setValueAtTime(0.08, ctx.currentTime);
    gn.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
    osc.start(); osc.stop(ctx.currentTime + 0.05);
  }, []);

  const playSnag = useCallback(() => {
    const ctx = g.current.audioCtx; if (!ctx) return;
    const osc = ctx.createOscillator(); const gn = ctx.createGain();
    osc.connect(gn); gn.connect(ctx.destination); osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(400, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(60, ctx.currentTime + 0.2);
    gn.gain.setValueAtTime(0.2, ctx.currentTime);
    gn.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
    osc.start(); osc.stop(ctx.currentTime + 0.25);
    const buf = ctx.createBuffer(1, ctx.sampleRate * 0.15, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    const src = ctx.createBufferSource(); const ng = ctx.createGain();
    src.buffer = buf; src.connect(ng); ng.connect(ctx.destination);
    ng.gain.setValueAtTime(0.15, ctx.currentTime);
    ng.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15); src.start();
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

  function generateRibbon(toY: number, opts?: { straight?: boolean; wide?: boolean }) {
    const game = g.current;
    if (game.ribbonPoints.length === 0) { game.ribbonPoints.push({ x: game.W / 2, y: 0 }); game.ribbonGenY = 0; }
    while (game.ribbonGenY < toY) {
      const depth = game.ribbonGenY / 1000;
      let amp: number, freq: number;
      if (opts?.straight) { amp = 10; freq = 0.001; }
      else { amp = 60 + Math.min(depth * 20, 120); freq = 0.003 + Math.min(depth * 0.0005, 0.003); }
      const nx = game.W / 2 + Math.sin(game.ribbonGenY * freq) * amp + Math.sin(game.ribbonGenY * freq * 2.3 + 1.7) * amp * 0.4;
      game.ribbonGenY += RIBBON_SEGMENT_LEN;
      game.ribbonPoints.push({ x: Math.max(40, Math.min(game.W - 40, nx)), y: game.ribbonGenY });
    }
  }

  function getRibbonWidth(y: number): number {
    const game = g.current;
    if (game.ribbonWidthOverride) return game.ribbonWidthOverride;
    const depth = y / 1000;
    let w = Math.max(RIBBON_MIN_WIDTH, RIBBON_BASE_WIDTH - depth * 3);
    // easy start: extra wide for first 10s, ease to normal over 3s
    if (game.phase === 'playing' && game.playTime < 13) {
      const wideBonus = game.playTime < 10 ? 20 : 20 * (1 - (game.playTime - 10) / 3);
      w += Math.max(0, wideBonus);
    }
    return w;
  }

  function closestRibbonPoint(px: number, py: number) {
    const pts = g.current.ribbonPoints;
    let bestDist = Infinity, bestIdx = 0;
    const startIdx = Math.max(0, Math.floor((py - 200) / RIBBON_SEGMENT_LEN));
    const endIdx = Math.min(pts.length - 1, startIdx + 60);
    for (let i = startIdx; i <= endIdx; i++) {
      const dx = px - pts[i].x, dy = py - pts[i].y;
      const d = dx * dx + dy * dy;
      if (d < bestDist) { bestDist = d; bestIdx = i; }
    }
    return { idx: bestIdx, dist: Math.sqrt(bestDist), point: pts[bestIdx] };
  }

  const TUTORIAL_STEPS = [
    { name: 'CUT', instruction: 'HOLD TO CUT THE RIBBON', successText: 'NICE!', distTarget: 300, widthOverride: 80, straight: true, speed: 80 },
    { name: 'STEER', instruction: 'FOLLOW THE CURVE', successText: 'SMOOTH!', distTarget: 400, widthOverride: 60, straight: false, speed: 90 },
    { name: 'BOOST', instruction: 'HUG THE CENTER LINE', successText: 'READY!', distTarget: 0, widthOverride: 50, straight: false, speed: 100, boostTarget: 1.4 },
  ];

  const initGame = useCallback(() => {
    const game = g.current;
    game.scissors = { x: game.W / 2, y: 80, angle: 0 };
    game.cutTrail = []; game.particles = [];
    game.ribbonPoints = []; game.ribbonGenY = 0; game.ribbonWidthOverride = 0;
    game.score = 0; game.bestCenter = 0; game.speedMult = 1;
    game.cameraY = 0; game.scrollSpeed = 120;
    game.holding = false; game.touchX = game.W / 2; game.lastSnipScore = 0;
    game.screenShake = { timer: 0, intensity: 0 };
    game.gameTime = 0; game.deadTimer = 0;
    game.tutorialStep = -1; game.tutorialPhase = 'instruction'; game.tutorialTimer = 0; game.tutorialDistanceCut = 0;
    game.playTime = 0; game.graceTimer = 1.0;
    stopCutNoise();
    generateRibbon(game.H + 500);
  }, [stopCutNoise]);

  const startPlaying = useCallback(() => {
    initGame(); initAudio(); startCutNoise();
    const game = g.current;
    game.phase = 'playing'; game.running = true;
    game.playTime = 0; game.graceTimer = 1.0;
    setGameState('playing'); setShowShareModal(false); setProgression(null);
  }, [initGame, initAudio, startCutNoise]);

  const setupTutorialStep = useCallback((step: number) => {
    const game = g.current;
    const s = TUTORIAL_STEPS[step];
    game.scissors = { x: game.W / 2, y: 80, angle: 0 };
    game.cutTrail = []; game.particles = [];
    game.ribbonPoints = []; game.ribbonGenY = 0;
    game.ribbonWidthOverride = s.widthOverride;
    game.score = 0; game.bestCenter = 0; game.speedMult = 1;
    game.cameraY = 0; game.scrollSpeed = s.speed;
    game.holding = false; game.lastSnipScore = 0;
    game.screenShake = { timer: 0, intensity: 0 };
    game.tutorialDistanceCut = 0;
    generateRibbon(game.H + 500, { straight: s.straight });
    startCutNoise();
  }, [startCutNoise]);

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

    const handleTouch = (e: TouchEvent) => {
      e.preventDefault();
      const game = g.current;
      if (game.phase === 'tutorial' && game.tutorialPhase === 'playing') {
        const t = e.touches[0];
        if (t.clientX > game.W - 80 && t.clientY < 45) { game.tutorialStep = -1; stopCutNoise(); initGame(); startPlaying(); return; }
        game.holding = true; game.touchX = t.clientX;
      } else if (game.phase === 'tutorial') {
        const t = e.touches[0];
        if (t.clientX > game.W - 80 && t.clientY < 45) { game.tutorialStep = -1; stopCutNoise(); initGame(); startPlaying(); }
      } else if (game.phase === 'playing') {
        game.holding = true; game.touchX = e.touches[0].clientX;
      }
      initAudio();
    };
    const handleTouchMove = (e: TouchEvent) => { e.preventDefault(); g.current.touchX = e.touches[0].clientX; };
    const handleTouchEnd = (e: TouchEvent) => {
      e.preventDefault();
      g.current.holding = false;
    };
    const handleMouseDown = (e: MouseEvent) => {
      const game = g.current;
      if (game.phase === 'tutorial') {
        if (e.clientX > game.W - 80 && e.clientY < 45) { game.tutorialStep = -1; stopCutNoise(); initGame(); startPlaying(); return; }
        if (game.tutorialPhase === 'playing') { game.holding = true; game.touchX = e.clientX; }
      } else if (game.phase === 'playing') {
        game.holding = true; game.touchX = e.clientX;
      }
      initAudio();
    };
    const handleMouseMove = (e: MouseEvent) => { g.current.touchX = e.clientX; };
    const handleMouseUp = () => {
      g.current.holding = false;
    };

    canvas.addEventListener('touchstart', handleTouch, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd, { passive: false });
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);

    let lastTime = performance.now(); let animId: number;

    function die() {
      const game = g.current;
      game.phase = 'dead'; game.deadTimer = 0;
      game.screenShake = { timer: 0.15, intensity: 3 };
      playSnag();
      for (let i = 0; i < 10; i++) {
        const a = Math.random() * Math.PI * 2; const s = 30 + Math.random() * 60;
        game.particles.push({ x: game.scissors.x, y: game.scissors.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, r: 1 + Math.random() * 2, color: T.danger, life: 0.3 + Math.random() * 0.2, maxLife: 0.5 });
      }
    }

    function updateScissors(dt: number, isTutorial: boolean) {
      const game = g.current;
      const genOpts = isTutorial && game.tutorialStep === 0 ? { straight: true, wide: true } : {};
      generateRibbon(game.cameraY + game.H + 500, genOpts);

      // easy start: 40% speed for first 3s, ramp to 100% by 10s
      const startRamp = isTutorial ? 1 : (game.playTime < 3 ? 0.4 : Math.min(1, 0.4 + (game.playTime - 3) * 0.086));
      const effectiveSpeed = game.scrollSpeed * game.speedMult * startRamp;
      game.cameraY += effectiveSpeed * dt;
      game.scissors.y = game.cameraY + 120;

      if (game.holding) game.scissors.x += (game.touchX - game.scissors.x) * 8 * dt;

      if (game.graceTimer > 0) game.graceTimer -= dt;

      // collision at V junction point — only horizontal distance from ribbon center matters
      const closest = closestRibbonPoint(game.scissors.x, game.scissors.y);
      const ribbonW = getRibbonWidth(game.scissors.y);
      const halfW = ribbonW / 2;
      const centerDist = closest.point ? Math.abs(game.scissors.x - closest.point.x) : closest.dist;

      const pts = game.ribbonPoints;
      if (pts[closest.idx + 1]) {
        const next = pts[closest.idx + 1]; const prev = pts[Math.max(0, closest.idx - 1)];
        game.scissors.angle = Math.atan2(next.y - prev.y, next.x - prev.x);
      }

      if (game.holding) {
        if (centerDist < halfW - 4) {
          const accuracy = 1 - (centerDist / halfW);
          game.score += effectiveSpeed * dt * 0.1 * (1 + accuracy);
          if (isTutorial) game.tutorialDistanceCut += effectiveSpeed * dt;
          const targetSpeed = 1 + accuracy * accuracy * 0.8;
          if (targetSpeed > game.speedMult) game.speedMult = Math.min(game.speedMult + 0.4 * dt, 1.8);
          else game.speedMult = Math.max(1, game.speedMult - 0.5 * dt);
          if (accuracy > 0.8) game.bestCenter += dt;
          game.cutTrail.push({ x: game.scissors.x, y: game.scissors.y, life: 3 });
          if (Math.floor(game.score) > game.lastSnipScore && Math.floor(game.score) % 5 === 0) { playSnip(); game.lastSnipScore = Math.floor(game.score); }
          setCutVolume(0.03 + accuracy * 0.04);
        } else if (centerDist < halfW + 4) {
          setCutVolume(0.01); game.speedMult = Math.max(1, game.speedMult - 1 * dt);
        } else {
          if (isTutorial || game.graceTimer > 0) {
            game.scissors.x = closest.point ? closest.point.x : game.W / 2;
            if (isTutorial) { game.screenShake = { timer: 0.1, intensity: 2 }; playSnag(); game.holding = false; }
          } else {
            die(); return false;
          }
        }
      } else {
        setCutVolume(0); game.speedMult = Math.max(1, game.speedMult - 0.8 * dt);
        if (closest.point) game.scissors.x += (closest.point.x - game.scissors.x) * 1.5 * dt;
      }

      if (!isTutorial) game.scrollSpeed = 120 + Math.min(game.cameraY * 0.01, 100);

      for (let i = game.cutTrail.length - 1; i >= 0; i--) { game.cutTrail[i].life -= dt; if (game.cutTrail[i].life <= 0) game.cutTrail.splice(i, 1); }
      for (let i = game.particles.length - 1; i >= 0; i--) { const p = game.particles[i]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.life <= 0) game.particles.splice(i, 1); }
      if (game.screenShake.timer > 0) game.screenShake.timer -= dt;
      while (game.ribbonPoints.length > 2 && game.ribbonPoints[0].y < game.cameraY - 100) game.ribbonPoints.shift();
      return true;
    }

    function update(dt: number) {
      const game = g.current;
      if (game.phase === 'start') { game.gameTime += dt; return; }
      game.gameTime += dt;

      if (game.phase === 'tutorial') {
        if (game.tutorialStep < 0 || game.tutorialStep >= TUTORIAL_STEPS.length) return;
        if (game.tutorialPhase === 'instruction') {
          game.tutorialTimer += dt;
          if (game.tutorialTimer >= 1.2) { game.tutorialPhase = 'playing'; game.tutorialTimer = 0; }
          return;
        }
        if (game.tutorialPhase === 'playing') {
          updateScissors(dt, true);
          const step = TUTORIAL_STEPS[game.tutorialStep];
          const done = step.boostTarget ? game.speedMult >= step.boostTarget : game.tutorialDistanceCut > (step.distTarget || 300);
          if (done) { game.tutorialPhase = 'success'; game.tutorialTimer = 0; playLevelUp(); }
          return;
        }
        if (game.tutorialPhase === 'success') {
          game.tutorialTimer += dt;
          const delay = game.tutorialStep === TUTORIAL_STEPS.length - 1 ? 1.0 : 0.6;
          if (game.tutorialTimer >= delay) {
            game.tutorialStep++;
            if (game.tutorialStep >= TUTORIAL_STEPS.length) { game.tutorialStep = -1; stopCutNoise(); initGame(); startPlaying(); }
            else { game.tutorialPhase = 'instruction'; game.tutorialTimer = 0; setupTutorialStep(game.tutorialStep); }
          }
        }
        return;
      }

      if (game.phase === 'dead') {
        game.deadTimer += dt; setCutVolume(0);
        if (game.deadTimer >= 1.5) {
          game.phase = 'over';
          setScore(Math.floor(game.score)); setFinalDepth(Math.floor(game.cameraY / 10)); setFinalStreak(parseFloat(game.bestCenter.toFixed(1)));
          setGameState('gameover');
          if (game.score >= 1) fetch('/api/pixelpit/stats', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ game: GAME_ID }) }).catch(() => {});
        }
        return;
      }

      if (game.phase !== 'playing') return;
      game.playTime += dt;
      updateScissors(dt, false);
    }

    function drawRibbon(ctx: CanvasRenderingContext2D) {
      const game = g.current;
      if (game.ribbonPoints.length < 2) return;
      for (let i = 0; i < game.ribbonPoints.length - 1; i++) {
        const p1 = game.ribbonPoints[i]; const p2 = game.ribbonPoints[i + 1];
        const sy1 = p1.y - game.cameraY; const sy2 = p2.y - game.cameraY;
        if (sy2 < -20 || sy1 > game.H + 20) continue;
        const w1 = getRibbonWidth(p1.y) / 2; const w2 = getRibbonWidth(p2.y) / 2;
        const dx = p2.x - p1.x; const dy = p2.y - p1.y; const len = Math.sqrt(dx * dx + dy * dy) || 1;
        const nx = -dy / len; const ny = dx / len;
        ctx.fillStyle = T.gold; ctx.globalAlpha = 0.85;
        ctx.beginPath();
        ctx.moveTo(p1.x + nx * w1, sy1 + ny * w1); ctx.lineTo(p2.x + nx * w2, sy2 + ny * w2);
        ctx.lineTo(p2.x - nx * w2, sy2 - ny * w2); ctx.lineTo(p1.x - nx * w1, sy1 - ny * w1);
        ctx.closePath(); ctx.fill();
        ctx.strokeStyle = T.goldDark; ctx.lineWidth = 1.5; ctx.globalAlpha = 0.9;
        ctx.beginPath(); ctx.moveTo(p1.x + nx * w1, sy1 + ny * w1); ctx.lineTo(p2.x + nx * w2, sy2 + ny * w2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(p1.x - nx * w1, sy1 - ny * w1); ctx.lineTo(p2.x - nx * w2, sy2 - ny * w2); ctx.stroke();
        ctx.strokeStyle = game.speedMult > 1.3 ? T.gold : T.goldDark; ctx.lineWidth = 1;
        ctx.globalAlpha = game.speedMult > 1.3 ? 0.5 + Math.sin(game.gameTime * 6) * 0.15 : 0.5;
        ctx.beginPath(); ctx.moveTo(p1.x, sy1); ctx.lineTo(p2.x, sy2); ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }

    function draw() {
      const game = g.current;
      if (game.phase === 'start' || game.phase === 'over') return;

      ctx!.fillStyle = T.bg; ctx!.fillRect(0, 0, game.W, game.H);

      ctx!.save();
      if (game.screenShake.timer > 0) {
        const s = game.screenShake.intensity * (game.screenShake.timer / 0.15);
        ctx!.translate((Math.random() * 2 - 1) * s, (Math.random() * 2 - 1) * s);
      }

      // grid
      ctx!.strokeStyle = '#111111'; ctx!.lineWidth = 1;
      const gridSize = 40; const offY = -(game.cameraY % gridSize);
      for (let y = offY; y < game.H; y += gridSize) { ctx!.beginPath(); ctx!.moveTo(0, y); ctx!.lineTo(game.W, y); ctx!.stroke(); }
      for (let x = 0; x < game.W; x += gridSize) { ctx!.beginPath(); ctx!.moveTo(x, 0); ctx!.lineTo(x, game.H); ctx!.stroke(); }

      drawRibbon(ctx!);

      // cut trail
      for (const t of game.cutTrail) {
        const sy = t.y - game.cameraY; if (sy < -10 || sy > game.H + 10) continue;
        ctx!.globalAlpha = Math.min(t.life / 2, 0.6); ctx!.fillStyle = '#1a1a1a';
        ctx!.beginPath(); ctx!.arc(t.x, sy, 1, 0, Math.PI * 2); ctx!.fill();
      }
      ctx!.globalAlpha = 1;

      // particles
      for (const p of game.particles) {
        const py = p.y - game.cameraY;
        ctx!.globalAlpha = p.life / p.maxLife; ctx!.fillStyle = p.color;
        ctx!.beginPath(); ctx!.arc(p.x, py, p.r, 0, Math.PI * 2); ctx!.fill();
      }
      ctx!.globalAlpha = 1;

      // scissors
      const sx = game.scissors.x; const sy = game.scissors.y - game.cameraY;
      ctx!.save(); ctx!.translate(sx, sy); ctx!.rotate(game.scissors.angle - Math.PI / 2);
      const bladeSpread = game.holding ? 12 : 5;
      ctx!.strokeStyle = T.slime; ctx!.lineWidth = 3.5;
      ctx!.shadowBlur = game.holding ? 8 : 0; ctx!.shadowColor = T.slime;
      ctx!.beginPath(); ctx!.moveTo(0, 0); ctx!.lineTo(-bladeSpread, -28); ctx!.stroke();
      ctx!.beginPath(); ctx!.moveTo(0, 0); ctx!.lineTo(bladeSpread, -28); ctx!.stroke();
      ctx!.fillStyle = T.slime; ctx!.beginPath(); ctx!.arc(0, 0, 3, 0, Math.PI * 2); ctx!.fill();
      ctx!.shadowBlur = 0; ctx!.restore();

      ctx!.restore();

      // HUD
      ctx!.fillStyle = T.text; ctx!.font = 'bold 28px monospace'; ctx!.textAlign = 'left';
      ctx!.fillText(Math.floor(game.score) + '', 16, 40);
      if (game.speedMult > 1.1) {
        ctx!.fillStyle = T.slime; ctx!.font = 'bold 16px monospace'; ctx!.textAlign = 'right';
        ctx!.fillText(game.speedMult.toFixed(1) + 'x', game.W - 16, 40);
      }
      ctx!.fillStyle = T.grey; ctx!.font = '12px monospace'; ctx!.textAlign = 'left';
      ctx!.fillText('depth ' + Math.floor(game.cameraY / 10), 16, 58);

      // grace period fingerprint indicator
      if (game.phase === 'playing' && game.graceTimer > 0) {
        const fpX = game.scissors.x;
        const fpY = game.scissors.y - game.cameraY;
        const pulse = 0.4 + Math.sin(game.gameTime * 10) * 0.4;
        const fade = Math.min(game.graceTimer / 0.3, 1);
        ctx!.save();
        ctx!.globalAlpha = pulse * fade;
        const fpR = 18;
        ctx!.strokeStyle = '#ffffff'; ctx!.lineWidth = 1.5;
        ctx!.beginPath(); ctx!.arc(fpX, fpY - 44, fpR, 0, Math.PI * 2); ctx!.stroke();
        ctx!.lineWidth = 1; ctx!.strokeStyle = 'rgba(255,255,255,0.7)';
        for (let r = 5; r <= 14; r += 3) { ctx!.beginPath(); ctx!.arc(fpX, fpY - 44, r, -Math.PI * 0.7, Math.PI * 0.7); ctx!.stroke(); }
        ctx!.fillStyle = '#ffffff'; ctx!.beginPath(); ctx!.arc(fpX, fpY - 44, 2, 0, Math.PI * 2); ctx!.fill();
        ctx!.fillStyle = '#ffffff'; ctx!.font = 'bold 12px monospace'; ctx!.textAlign = 'center';
        ctx!.fillText('PLACE FINGER', fpX, fpY - 68);
        ctx!.restore();
      }

      // tutorial overlay
      if (game.phase === 'tutorial' && game.tutorialStep >= 0) {
        ctx!.fillStyle = 'rgba(255,255,255,0.4)'; ctx!.font = '14px monospace'; ctx!.textAlign = 'left';
        ctx!.fillText((game.tutorialStep + 1) + '/' + TUTORIAL_STEPS.length, 16, 78);
        if (game.tutorialPhase === 'instruction' || game.tutorialPhase === 'playing') {
          ctx!.fillStyle = T.text; ctx!.font = 'bold 22px monospace'; ctx!.textAlign = 'center';
          ctx!.fillText(TUTORIAL_STEPS[game.tutorialStep].instruction, game.W / 2, 50);
        }
        if (game.tutorialStep === 2 && game.tutorialPhase === 'playing' && game.speedMult > 1.1) {
          ctx!.fillStyle = T.slime; ctx!.font = 'bold 16px monospace'; ctx!.textAlign = 'center';
          ctx!.globalAlpha = 0.6 + Math.sin(game.gameTime * 4) * 0.3;
          ctx!.fillText('BOOSTING ' + game.speedMult.toFixed(1) + 'x', game.W / 2, game.H - 60);
          ctx!.globalAlpha = 1;
        }
        if (game.tutorialPhase === 'success') {
          ctx!.fillStyle = T.slime; ctx!.font = 'bold 36px monospace'; ctx!.textAlign = 'center';
          ctx!.shadowBlur = 12; ctx!.shadowColor = T.slime;
          ctx!.fillText(TUTORIAL_STEPS[game.tutorialStep].successText, game.W / 2, game.H / 2 - 20);
          ctx!.shadowBlur = 0;
        }
        ctx!.fillStyle = 'rgba(255,255,255,0.3)'; ctx!.font = '14px monospace'; ctx!.textAlign = 'right';
        ctx!.fillText('SKIP >', game.W - 16, 30);
      }

      // dead overlay
      if (game.phase === 'dead') {
        const t = Math.min(game.deadTimer / 1.0, 1);
        ctx!.fillStyle = `rgba(0,0,0,${t * 0.6})`; ctx!.fillRect(0, 0, game.W, game.H);
        ctx!.fillStyle = T.danger; ctx!.font = 'bold 32px monospace'; ctx!.textAlign = 'center';
        ctx!.fillText('SNAGGED', game.W / 2, game.H / 2 - 10);
      }
      ctx!.textAlign = 'left';
    }

    function loop(ts: number) {
      const dt = Math.min((ts - lastTime) / 1000, 0.05); lastTime = ts;
      if (g.current.running) { update(dt); draw(); }
      animId = requestAnimationFrame(loop);
    }
    animId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animId); window.removeEventListener('resize', resize);
      canvas.removeEventListener('touchstart', handleTouch); canvas.removeEventListener('touchmove', handleTouchMove);
      canvas.removeEventListener('touchend', handleTouchEnd); canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mousemove', handleMouseMove); canvas.removeEventListener('mouseup', handleMouseUp);
      stopCutNoise();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initAudio, initGame, startCutNoise, stopCutNoise, setCutVolume, playSnip, playSnag, playLevelUp, startPlaying, setupTutorialStep]);

  return (
    <>
      <Script src="/pixelpit/social.js" strategy="lazyOnload" onLoad={() => setSocialLoaded(true)} />
      <canvas ref={canvasRef} style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', display: 'block', background: T.bg, touchAction: 'none' }} />

      {gameState === 'start' && (
        <div style={{ position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: COLORS.bg, zIndex: 100, textAlign: 'center', padding: 40 }}>
          <div style={{ background: COLORS.surface, border: '1px solid rgba(255,255,255,0.05)', padding: '50px 60px', boxShadow: '0 20px 60px rgba(0,0,0,0.5)', borderRadius: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 4, marginBottom: 20 }}>
              <div style={{ width: 3, height: 24, background: T.slime, transform: 'rotate(-15deg)', boxShadow: `0 0 8px ${T.slime}` }} />
              <div style={{ width: 3, height: 24, background: T.slime, transform: 'rotate(15deg)', boxShadow: `0 0 8px ${T.slime}` }} />
            </div>
            <h1 style={{ fontFamily: 'ui-monospace, monospace', fontSize: 64, fontWeight: 300, color: T.slime, marginBottom: 20, letterSpacing: 8, textShadow: `0 0 40px rgba(163,230,53,0.4)` }}>SNIP</h1>
            <p style={{ fontSize: 14, fontFamily: 'ui-monospace, monospace', color: COLORS.secondary, marginBottom: 35, lineHeight: 1.8, letterSpacing: 2 }}>
              hold to cut along the ribbon<br />stay centered for speed boost<br />hit the edge = snag
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
              <button onClick={startPlaying} style={{ background: T.slime, color: COLORS.bg, border: 'none', padding: '16px 50px', fontSize: 16, fontFamily: 'ui-monospace, monospace', fontWeight: 600, cursor: 'pointer', borderRadius: 8, letterSpacing: 2, boxShadow: `0 8px 30px rgba(163,230,53,0.3)` }}>play</button>
              <button onClick={startTutorial} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: COLORS.muted, padding: '12px 40px', fontSize: 13, fontFamily: 'ui-monospace, monospace', cursor: 'pointer', borderRadius: 6, letterSpacing: 2 }}>tutorial</button>
            </div>
          </div>
          <div style={{ marginTop: 30, fontSize: 12, fontFamily: 'ui-monospace, monospace', letterSpacing: 3 }}>
            <span style={{ color: T.slime }}>pixel</span><span style={{ color: COLORS.secondary }}>pit</span><span style={{ color: COLORS.text, opacity: 0.4 }}> arcade</span>
          </div>
        </div>
      )}

      {gameState === 'gameover' && (
        <div style={{ position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: COLORS.bg, zIndex: 100, textAlign: 'center', padding: 40 }}>
          <h1 style={{ fontFamily: 'ui-monospace, monospace', fontSize: 28, fontWeight: 300, color: T.danger, marginBottom: 15, letterSpacing: 6 }}>snagged</h1>
          <div style={{ fontFamily: 'ui-monospace, monospace', fontSize: 80, fontWeight: 200, color: T.slime, marginBottom: 10, textShadow: `0 0 40px rgba(163,230,53,0.4)` }}>{score}</div>
          <div style={{ fontFamily: 'ui-monospace, monospace', fontSize: 14, color: COLORS.muted, marginBottom: 30 }}>depth: {finalDepth} · best streak: {finalStreak}s</div>
          <ScoreFlow score={score} gameId={GAME_ID} colors={SCORE_FLOW_COLORS} maxScore={100} onRankReceived={(rank, entryId) => setSubmittedEntryId(entryId ?? null)} onProgression={(prog) => setProgression(prog)} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 15, alignItems: 'center' }}>
            <button onClick={startPlaying} style={{ background: T.slime, color: COLORS.bg, border: 'none', borderRadius: 8, padding: '16px 50px', fontSize: 15, fontFamily: 'ui-monospace, monospace', fontWeight: 600, cursor: 'pointer', boxShadow: `0 8px 25px rgba(163,230,53,0.3)`, letterSpacing: 2 }}>play again</button>
            <button onClick={() => setGameState('leaderboard')} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, color: COLORS.muted, padding: '14px 35px', fontSize: 11, fontFamily: 'ui-monospace, monospace', cursor: 'pointer', letterSpacing: 2 }}>leaderboard</button>
            {user ? (
              <button onClick={() => setShowShareModal(true)} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, color: COLORS.muted, padding: '14px 35px', fontSize: 11, fontFamily: 'ui-monospace, monospace', cursor: 'pointer', letterSpacing: 2 }}>share / groups</button>
            ) : (
              <ShareButtonContainer id="share-btn-container" url={typeof window !== 'undefined' ? `${window.location.origin}/pixelpit/arcade/snip/share/${score}` : ''} text={`I scored ${score} on SNIP! Can you beat me?`} style="minimal" socialLoaded={socialLoaded} />
            )}
          </div>
        </div>
      )}

      {gameState === 'leaderboard' && <Leaderboard gameId={GAME_ID} limit={8} entryId={submittedEntryId ?? undefined} colors={LEADERBOARD_COLORS} onClose={() => setGameState('gameover')} groupsEnabled={true} gameUrl={GAME_URL} socialLoaded={socialLoaded} />}
      {showShareModal && user && <ShareModal gameUrl={GAME_URL} score={score} colors={LEADERBOARD_COLORS} onClose={() => setShowShareModal(false)} />}
    </>
  );
}
