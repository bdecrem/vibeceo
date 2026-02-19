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
  bg: '#0a0a0a', surface: '#18181b', slime: '#a3e635', cyan: '#22d3ee',
  fuchsia: '#d946ef', gold: '#facc15', grey: '#555555', text: '#ffffff',
  paper: '#f5f0e8', paperShadow: 'rgba(200,190,170,0.3)', crease: '#d4cfc5', shelf: '#22d3ee',
};

const COLORS = {
  bg: '#0a0a0a', surface: '#18181b', primary: '#a3e635', secondary: '#22d3ee',
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

const GAME_ID = 'fold';
const PAPER_SIZE = 40;
const LANDING_TOLERANCE = 25;
const TORQUE_FORCE = 8;
const STAMP_SYMBOLS = ['★', '✓', '☺', '◆', '♦', '●', '▲', '✦', '⊕', '☆'];
const STAMP_COLORS = [T.fuchsia, T.gold, T.cyan, T.slime, '#ef4444'];

interface Shelf { index: number; x: number; y: number; width: number; height: number; filed: boolean; fileOffset: number; windDir: number; windStrength: number; }
interface Particle { x: number; y: number; vx: number; vy: number; r: number; color: string; life: number; maxLife: number; }
interface Stamp { x: number; y: number; symbol: string; color: string; scale: number; rotation: number; }
interface Paper { x: number; y: number; vy: number; vx: number; angle: number; angularVel: number; width: number; height: number; }
interface CrumpleAnim { x: number; y: number; r: number; vy: number; rotation: number; }

function normalizeAngle(a: number): number { a = a % (Math.PI * 2); if (a < 0) a += Math.PI * 2; return a; }
function isFlat(angle: number): boolean {
  const deg = (normalizeAngle(angle) * 180 / Math.PI) % 90;
  const fromFlat = Math.min(deg, 90 - deg);
  return fromFlat <= LANDING_TOLERANCE;
}

export default function FoldGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<'start' | 'playing' | 'gameover' | 'leaderboard'>('start');
  const [score, setScore] = useState(0);
  const [finalDepth, setFinalDepth] = useState(0);
  const [finalStamps, setFinalStamps] = useState(0);
  const [finalFolds, setFinalFolds] = useState(0);
  const [socialLoaded, setSocialLoaded] = useState(false);
  const [submittedEntryId, setSubmittedEntryId] = useState<number | null>(null);
  const [progression, setProgression] = useState<ProgressionResult | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);

  const { user } = usePixelpitSocial(socialLoaded);
  const GAME_URL = typeof window !== 'undefined' ? `${window.location.origin}/pixelpit/arcade/fold` : 'https://pixelpit.gg/pixelpit/arcade/fold';

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
    paper: { x: 0, y: 100, vy: 0, vx: 0, angle: 0, angularVel: 0, width: PAPER_SIZE, height: PAPER_SIZE * 0.7 } as Paper,
    shelves: [] as Shelf[], particles: [] as Particle[], stamps: [] as Stamp[],
    score: 0, depth: 0, foldCount: 0, gameTime: 0, deadTimer: 0, cameraY: 0,
    screenShake: { timer: 0, intensity: 0 },
    fileAnim: null as { shelf: Shelf; timer: number } | null,
    crumpleAnim: null as CrumpleAnim | null,
    audioCtx: null as AudioContext | null,
    phase: 'start' as 'start' | 'playing' | 'crumple' | 'over',
    running: false, W: 0, H: 0,
  });

  // Audio
  const initAudio = useCallback(() => {
    const game = g.current;
    if (!game.audioCtx) game.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    if (game.audioCtx.state === 'suspended') game.audioCtx.resume();
  }, []);

  const playFold = useCallback((fc: number) => {
    const ctx = g.current.audioCtx; if (!ctx) return;
    const osc = ctx.createOscillator(); const gn = ctx.createGain();
    osc.connect(gn); gn.connect(ctx.destination); osc.type = 'square';
    osc.frequency.value = 1200 + fc * 80;
    gn.gain.setValueAtTime(0.1, ctx.currentTime);
    gn.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
    osc.start(); osc.stop(ctx.currentTime + 0.04);
    const buf = ctx.createBuffer(1, ctx.sampleRate * 0.02, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length) * 0.5;
    const src = ctx.createBufferSource(); const ng = ctx.createGain();
    src.buffer = buf; src.connect(ng); ng.connect(ctx.destination); ng.gain.value = 0.15; src.start();
  }, []);

  const playFile = useCallback(() => {
    const ctx = g.current.audioCtx; if (!ctx) return;
    const buf = ctx.createBuffer(1, ctx.sampleRate * 0.3, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    const src = ctx.createBufferSource(); const flt = ctx.createBiquadFilter(); const gn = ctx.createGain();
    src.buffer = buf; flt.type = 'bandpass';
    flt.frequency.setValueAtTime(3000, ctx.currentTime);
    flt.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.25); flt.Q.value = 2;
    src.connect(flt); flt.connect(gn); gn.connect(ctx.destination);
    gn.gain.setValueAtTime(0.12, ctx.currentTime);
    gn.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3); src.start();
  }, []);

  const playStamp = useCallback(() => {
    const ctx = g.current.audioCtx; if (!ctx) return;
    const osc = ctx.createOscillator(); const gn = ctx.createGain();
    osc.connect(gn); gn.connect(ctx.destination); osc.type = 'sine';
    osc.frequency.setValueAtTime(150, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(60, ctx.currentTime + 0.08);
    gn.gain.setValueAtTime(0.15, ctx.currentTime);
    gn.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
    osc.start(); osc.stop(ctx.currentTime + 0.1);
  }, []);

  const playCrumple = useCallback(() => {
    const ctx = g.current.audioCtx; if (!ctx) return;
    const buf = ctx.createBuffer(1, ctx.sampleRate * 0.25, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) { const env = (1 - i / data.length); data[i] = (Math.random() * 2 - 1) * env * env; }
    const src = ctx.createBufferSource(); const flt = ctx.createBiquadFilter(); const gn = ctx.createGain();
    src.buffer = buf; flt.type = 'lowpass'; flt.frequency.value = 2000;
    src.connect(flt); flt.connect(gn); gn.connect(ctx.destination);
    gn.gain.setValueAtTime(0.2, ctx.currentTime);
    gn.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25); src.start();
  }, []);

  const spawnParticles = useCallback((x: number, y: number, color: string, count: number) => {
    const game = g.current;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2; const speed = 30 + Math.random() * 60;
      const life = 0.2 + Math.random() * 0.3;
      game.particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, r: 1 + Math.random() * 2, color, life, maxLife: life });
    }
  }, []);

  function createShelf(index: number, W: number): Shelf {
    const baseWidth = W * 0.5; const minWidth = W * 0.15;
    const widthDecay = Math.max(minWidth, baseWidth - index * 4);
    const spacing = 150 + Math.min(index * 3, 80);
    const hasWind = index > 8 && Math.random() < 0.2;
    return { index, x: W * 0.15 + Math.random() * (W * 0.7 - widthDecay), y: 300 + index * spacing, width: widthDecay, height: 6, filed: false, fileOffset: 0, windDir: hasWind ? (Math.random() < 0.5 ? -1 : 1) : 0, windStrength: hasWind ? (40 + Math.random() * 60) : 0 };
  }

  const initGame = useCallback(() => {
    const game = g.current;
    game.paper = { x: game.W / 2, y: 100, vy: 0, vx: 0, angle: 0, angularVel: 0, width: PAPER_SIZE, height: PAPER_SIZE * 0.7 };
    game.shelves = []; game.particles = []; game.stamps = [];
    game.score = 0; game.depth = 0; game.foldCount = 0; game.gameTime = 0; game.deadTimer = 0; game.cameraY = 0;
    game.screenShake = { timer: 0, intensity: 0 }; game.fileAnim = null; game.crumpleAnim = null;
    for (let i = 0; i < 30; i++) game.shelves.push(createShelf(i, game.W));
  }, []);

  const startGame = useCallback(() => {
    initGame(); initAudio();
    g.current.phase = 'playing'; g.current.running = true;
    setGameState('playing'); setShowShareModal(false); setProgression(null);
  }, [initGame, initAudio]);

  // Game loop
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;

    function resize() { canvas!.width = window.innerWidth; canvas!.height = window.innerHeight; g.current.W = canvas!.width; g.current.H = canvas!.height; }
    resize(); window.addEventListener('resize', resize);

    const handleTap = (e: TouchEvent | MouseEvent) => {
      if (e instanceof TouchEvent) e.preventDefault();
      const game = g.current;
      if (game.phase === 'playing') { game.paper.angularVel += TORQUE_FORCE; game.foldCount++; playFold(game.foldCount); }
      initAudio();
    };

    canvas.addEventListener('touchstart', handleTap, { passive: false });
    canvas.addEventListener('click', handleTap);

    let lastTime = performance.now(); let animId: number;

    function update(dt: number) {
      const game = g.current;
      game.gameTime += dt;

      if (game.phase === 'crumple') {
        game.deadTimer += dt;
        if (game.crumpleAnim) {
          game.crumpleAnim.vy += 400 * dt; game.crumpleAnim.y += game.crumpleAnim.vy * dt;
          game.crumpleAnim.rotation += 3 * dt; game.crumpleAnim.r = Math.max(5, game.crumpleAnim.r - 10 * dt);
        }
        if (game.deadTimer >= 2.0) {
          game.phase = 'over';
          setScore(game.score); setFinalDepth(game.depth); setFinalStamps(game.stamps.length); setFinalFolds(game.foldCount);
          setGameState('gameover');
          if (game.score >= 1) fetch('/api/pixelpit/stats', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ game: GAME_ID }) }).catch(() => {});
        }
        return;
      }
      if (game.phase !== 'playing') return;

      const gravity = 250 + game.stamps.length * 15 + game.depth * 5;
      game.paper.vy += gravity * dt;
      game.paper.vx *= 0.92;
      game.paper.vx += Math.sin(game.gameTime * 3 + game.paper.y * 0.01) * 15 * dt;
      game.paper.angularVel *= 0.97;

      for (const s of game.shelves) {
        if (s.filed || s.windDir === 0) continue;
        const dist = Math.abs(game.paper.y - s.y);
        if (dist < 120) game.paper.vx += s.windDir * s.windStrength * (1 - dist / 120) * dt;
      }

      game.paper.x += game.paper.vx * dt; game.paper.y += game.paper.vy * dt;
      game.paper.angle += game.paper.angularVel * dt;
      game.paper.x = Math.max(20, Math.min(game.W - 20, game.paper.x));

      for (const s of game.shelves) {
        if (s.filed) continue;
        if (game.paper.y + game.paper.height / 2 >= s.y && game.paper.y - game.paper.height / 2 <= s.y + s.height &&
            game.paper.x >= s.x - 5 && game.paper.x <= s.x + s.width + 5 && game.paper.vy > 0) {
          if (isFlat(game.paper.angle)) {
            s.filed = true; game.depth++; game.score += 1 + game.stamps.length;
            game.paper.y = s.y - game.paper.height / 2; game.paper.vy = 0; game.paper.vx = 0; game.paper.angularVel = 0;
            const deg = normalizeAngle(game.paper.angle) * 180 / Math.PI;
            game.paper.angle = Math.round(deg / 90) * 90 * Math.PI / 180;
            game.fileAnim = { shelf: s, timer: 0.3 }; s.fileOffset = 0; playFile();
            setTimeout(() => {
              game.stamps.push({ x: -0.3 + Math.random() * 0.6, y: -0.2 + Math.random() * 0.4, symbol: STAMP_SYMBOLS[Math.floor(Math.random() * STAMP_SYMBOLS.length)], color: STAMP_COLORS[Math.floor(Math.random() * STAMP_COLORS.length)], scale: 0.6 + Math.random() * 0.4, rotation: (Math.random() - 0.5) * 0.3 });
              playStamp();
            }, 200);
            spawnParticles(game.paper.x, s.y, T.cyan, 8);
            game.screenShake = { timer: 0.08, intensity: 1.5 };
            setTimeout(() => {
              if (game.phase === 'playing') {
                const shelfCenter = s.x + s.width / 2;
                const dir = game.paper.x > shelfCenter ? 1 : -1;
                game.paper.vx = dir * 40;
                game.paper.angularVel = dir * 0.5;
              }
            }, 400);
          } else {
            game.phase = 'crumple'; game.deadTimer = 0;
            game.crumpleAnim = { x: game.paper.x, y: game.paper.y, r: 15, vy: -50, rotation: game.paper.angle };
            playCrumple(); game.screenShake = { timer: 0.15, intensity: 3 }; return;
          }
        }
      }

      const targetCam = game.paper.y - game.H * 0.35;
      game.cameraY += (targetCam - game.cameraY) * 3 * dt;
      const last = game.shelves[game.shelves.length - 1];
      if (last && last.y - game.cameraY < game.H + 300) game.shelves.push(createShelf(last.index + 1, game.W));
      while (game.shelves.length > 0 && game.shelves[0].y < game.cameraY - 200) game.shelves.shift();

      if (game.fileAnim) { game.fileAnim.timer -= dt; game.fileAnim.shelf.fileOffset = Math.min(1, 1 - game.fileAnim.timer / 0.3) * -60; if (game.fileAnim.timer <= 0) game.fileAnim = null; }
      if (game.screenShake.timer > 0) game.screenShake.timer -= dt;
      for (let i = game.particles.length - 1; i >= 0; i--) { const p = game.particles[i]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.life <= 0) game.particles.splice(i, 1); }
    }

    function draw() {
      const game = g.current; const W = game.W, H = game.H;
      if (game.phase === 'start' || game.phase === 'over') return;

      ctx!.fillStyle = T.bg; ctx!.fillRect(0, 0, W, H);

      // Filing cabinet lines
      ctx!.strokeStyle = '#151515'; ctx!.lineWidth = 1;
      for (const xp of [W * 0.1, W * 0.9]) {
        const startY = Math.max(0, -game.cameraY % 100);
        for (let y = startY; y < H; y += 100) { ctx!.beginPath(); ctx!.moveTo(xp, y); ctx!.lineTo(xp, y + 60); ctx!.stroke(); }
      }

      ctx!.save();
      if (game.screenShake.timer > 0) {
        const s = game.screenShake.intensity * (game.screenShake.timer / 0.15);
        ctx!.translate((Math.random() * 2 - 1) * s, (Math.random() * 2 - 1) * s);
      }

      // Shelves
      for (const s of game.shelves) {
        const sy = s.y - game.cameraY; if (sy < -20 || sy > H + 20) continue;
        const ox = s.filed ? s.fileOffset : 0;
        ctx!.fillStyle = s.filed ? T.grey : T.shelf; ctx!.globalAlpha = s.filed ? 0.3 : 1;
        if (!s.filed) { ctx!.shadowBlur = 4; ctx!.shadowColor = T.shelf; }
        ctx!.fillRect(s.x + ox, sy, s.width, s.height); ctx!.shadowBlur = 0;
        if (s.windDir !== 0 && !s.filed) {
          ctx!.fillStyle = T.fuchsia; ctx!.globalAlpha = 0.3 + Math.sin(game.gameTime * 4) * 0.15;
          ctx!.font = '12px monospace'; ctx!.textAlign = 'center';
          ctx!.fillText(s.windDir > 0 ? '→' : '←', s.x + s.width / 2, sy - 8);
        }
        ctx!.globalAlpha = 1;
      }

      // Particles
      for (const p of game.particles) {
        const py = p.y - game.cameraY; ctx!.globalAlpha = p.life / p.maxLife; ctx!.fillStyle = p.color;
        ctx!.beginPath(); ctx!.arc(p.x, py, p.r, 0, Math.PI * 2); ctx!.fill();
      }
      ctx!.globalAlpha = 1;

      // Paper
      if (game.phase === 'playing') {
        const py = game.paper.y - game.cameraY;
        ctx!.save(); ctx!.translate(game.paper.x, py); ctx!.rotate(game.paper.angle);
        ctx!.fillStyle = 'rgba(0,0,0,0.2)';
        ctx!.fillRect(-game.paper.width / 2 + 3, -game.paper.height / 2 + 3, game.paper.width, game.paper.height);
        ctx!.fillStyle = T.paper;
        ctx!.fillRect(-game.paper.width / 2, -game.paper.height / 2, game.paper.width, game.paper.height);
        ctx!.strokeStyle = T.crease; ctx!.lineWidth = 0.5;
        const vc = Math.min(game.foldCount, 5);
        for (let i = 0; i < vc; i++) {
          const off = (i + 1) / (vc + 1);
          ctx!.beginPath();
          if (i % 2 === 0) { const cy = -game.paper.height / 2 + game.paper.height * off; ctx!.moveTo(-game.paper.width / 2, cy); ctx!.lineTo(game.paper.width / 2, cy); }
          else { const cx = -game.paper.width / 2 + game.paper.width * off; ctx!.moveTo(cx, -game.paper.height / 2); ctx!.lineTo(cx, game.paper.height / 2); }
          ctx!.stroke();
        }
        for (const st of game.stamps) {
          ctx!.save(); ctx!.translate(st.x * game.paper.width, st.y * game.paper.height); ctx!.rotate(st.rotation);
          ctx!.fillStyle = st.color; ctx!.globalAlpha = 0.7; ctx!.font = `${8 * st.scale}px monospace`; ctx!.textAlign = 'center';
          ctx!.fillText(st.symbol, 0, 3); ctx!.restore();
        }
        ctx!.restore();
      }

      // Crumple
      if (game.phase === 'crumple' && game.crumpleAnim) {
        const cy = game.crumpleAnim.y - game.cameraY;
        ctx!.save(); ctx!.translate(game.crumpleAnim.x, cy); ctx!.rotate(game.crumpleAnim.rotation);
        ctx!.fillStyle = '#a09880'; ctx!.beginPath(); ctx!.arc(0, 0, game.crumpleAnim.r, 0, Math.PI * 2); ctx!.fill();
        ctx!.strokeStyle = '#80756a'; ctx!.lineWidth = 0.5;
        for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + game.crumpleAnim.rotation; ctx!.beginPath(); ctx!.moveTo(0, 0); ctx!.lineTo(Math.cos(a) * game.crumpleAnim.r * 0.8, Math.sin(a) * game.crumpleAnim.r * 0.8); ctx!.stroke(); }
        ctx!.restore();
      }

      ctx!.restore();

      // HUD
      if (game.phase === 'playing' || game.phase === 'crumple') {
        ctx!.fillStyle = T.text; ctx!.font = 'bold 28px monospace'; ctx!.textAlign = 'left';
        ctx!.fillText(game.score + '', 16, 40);
        ctx!.font = '14px monospace'; ctx!.fillStyle = T.grey;
        ctx!.fillText('depth ' + game.depth, 16, 60);
        ctx!.textAlign = 'right'; ctx!.fillStyle = T.paper; ctx!.font = '12px monospace';
        ctx!.fillText('folds: ' + game.foldCount, W - 16, 30);
        ctx!.fillStyle = T.fuchsia; ctx!.fillText('stamps: ' + game.stamps.length, W - 16, 48);
      }

      if (game.phase === 'crumple') {
        const t = Math.min(game.deadTimer / 1.5, 1);
        ctx!.fillStyle = `rgba(0,0,0,${t * 0.6})`; ctx!.fillRect(0, 0, W, H);
        ctx!.fillStyle = T.text; ctx!.font = 'bold 32px monospace'; ctx!.textAlign = 'center';
        ctx!.fillText('CRUMPLED', W / 2, H / 2 - 10);
      }
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
  }, [initAudio, initGame, playFold, playFile, playStamp, playCrumple, spawnParticles]);

  return (
    <>
      <Script src="/pixelpit/social.js" strategy="lazyOnload" onLoad={() => setSocialLoaded(true)} />
      <canvas ref={canvasRef} style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', display: 'block', background: T.bg, touchAction: 'none' }} />

      {gameState === 'start' && (
        <div style={{ position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: COLORS.bg, zIndex: 100, textAlign: 'center', padding: 40 }}>
          <div style={{ background: COLORS.surface, border: '1px solid rgba(255,255,255,0.05)', padding: '50px 60px', boxShadow: '0 20px 60px rgba(0,0,0,0.5)', borderRadius: 16 }}>
            <div style={{ width: 60, height: 42, background: T.paper, margin: '0 auto 20px', transform: 'rotate(-5deg)', boxShadow: '3px 3px 0 rgba(0,0,0,0.2)' }} />
            <h1 style={{ fontFamily: 'ui-monospace, monospace', fontSize: 64, fontWeight: 300, color: COLORS.primary, marginBottom: 20, letterSpacing: 8, textShadow: '0 0 40px rgba(163,230,53,0.4)' }}>FOLD</h1>
            <p style={{ fontSize: 14, fontFamily: 'ui-monospace, monospace', color: COLORS.secondary, marginBottom: 35, lineHeight: 1.8, letterSpacing: 2 }}>
              tap to fold the paper<br />land flat on shelves<br />bad angle = crumple
            </p>
            <button onClick={startGame} style={{ background: COLORS.primary, color: COLORS.bg, border: 'none', padding: '16px 50px', fontSize: 16, fontFamily: 'ui-monospace, monospace', fontWeight: 600, cursor: 'pointer', borderRadius: 8, letterSpacing: 2, boxShadow: '0 8px 30px rgba(163,230,53,0.3)' }}>play</button>
          </div>
          <div style={{ marginTop: 30, fontSize: 12, fontFamily: 'ui-monospace, monospace', letterSpacing: 3 }}>
            <span style={{ color: COLORS.primary }}>pixel</span><span style={{ color: COLORS.secondary }}>pit</span><span style={{ color: COLORS.text, opacity: 0.4 }}> arcade</span>
          </div>
        </div>
      )}

      {gameState === 'gameover' && (
        <div style={{ position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: COLORS.bg, zIndex: 100, textAlign: 'center', padding: 40 }}>
          <h1 style={{ fontFamily: 'ui-monospace, monospace', fontSize: 28, fontWeight: 300, color: COLORS.secondary, marginBottom: 15, letterSpacing: 6 }}>crumpled</h1>
          <div style={{ fontFamily: 'ui-monospace, monospace', fontSize: 80, fontWeight: 200, color: COLORS.primary, marginBottom: 10, textShadow: '0 0 40px rgba(163,230,53,0.4)' }}>{score}</div>
          <div style={{ fontFamily: 'ui-monospace, monospace', fontSize: 14, color: COLORS.muted, marginBottom: 30 }}>depth: {finalDepth} · stamps: {finalStamps} · folds: {finalFolds}</div>
          <ScoreFlow score={score} gameId={GAME_ID} colors={SCORE_FLOW_COLORS} maxScore={100} onRankReceived={(rank, entryId) => setSubmittedEntryId(entryId ?? null)} onProgression={(prog) => setProgression(prog)} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 15, alignItems: 'center' }}>
            <button onClick={startGame} style={{ background: COLORS.primary, color: COLORS.bg, border: 'none', borderRadius: 8, padding: '16px 50px', fontSize: 15, fontFamily: 'ui-monospace, monospace', fontWeight: 600, cursor: 'pointer', boxShadow: '0 8px 25px rgba(163,230,53,0.3)', letterSpacing: 2 }}>play again</button>
            <button onClick={() => setGameState('leaderboard')} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, color: COLORS.muted, padding: '14px 35px', fontSize: 11, fontFamily: 'ui-monospace, monospace', cursor: 'pointer', letterSpacing: 2 }}>leaderboard</button>
            {user ? (
              <button onClick={() => setShowShareModal(true)} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, color: COLORS.muted, padding: '14px 35px', fontSize: 11, fontFamily: 'ui-monospace, monospace', cursor: 'pointer', letterSpacing: 2 }}>share / groups</button>
            ) : (
              <ShareButtonContainer id="share-btn-container" url={typeof window !== 'undefined' ? `${window.location.origin}/pixelpit/arcade/fold/share/${score}` : ''} text={`I scored ${score} on FOLD! Can you beat me?`} style="minimal" socialLoaded={socialLoaded} />
            )}
          </div>
        </div>
      )}

      {gameState === 'leaderboard' && <Leaderboard gameId={GAME_ID} limit={8} entryId={submittedEntryId ?? undefined} colors={LEADERBOARD_COLORS} onClose={() => setGameState('gameover')} groupsEnabled={true} gameUrl={GAME_URL} socialLoaded={socialLoaded} />}
      {showShareModal && user && <ShareModal gameUrl={GAME_URL} score={score} colors={LEADERBOARD_COLORS} onClose={() => setShowShareModal(false)} />}
    </>
  );
}
