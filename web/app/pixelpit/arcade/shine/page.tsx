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

interface Gem { x: number; y: number; type: GemType; radius: number; age: number; maxLife: number; pulse: number; alive: boolean; }
interface GemType { color: string; points: number; freq: number; name: string; }
interface Particle { x: number; y: number; vx: number; vy: number; life: number; color: string; size: number; }
interface FloatingText { x: number; y: number; text: string; color: string; life: number; vy: number; }

const gemTypes: GemType[] = [
  { color: T.amber, points: 1, freq: 440, name: 'amber' },
  { color: T.gold, points: 2, freq: 550, name: 'gold' },
  { color: T.teal, points: 3, freq: 660, name: 'teal' },
  { color: T.violet, points: 5, freq: 770, name: 'violet' },
  { color: T.pink, points: 10, freq: 880, name: 'pink' },
];

function selectGemType(): GemType {
  const r = Math.random();
  if (r < 0.40) return gemTypes[0];
  if (r < 0.70) return gemTypes[1];
  if (r < 0.85) return gemTypes[2];
  if (r < 0.95) return gemTypes[3];
  return gemTypes[4];
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
    phase: 'start' as 'start' | 'playing' | 'over',
    screenShake: { timer: 0, intensity: 0 },
    hitFreeze: 0, missDarken: 0, spawnTimer: 0,
    comboBreakFlash: { timer: 0, scale: 1, text: '', mult: 1 },
    timerFlash: 0, safeTop: 0,
    audioCtx: null as AudioContext | null,
    running: false, W: 0, H: 0,
  });

  const initAudio = useCallback(() => {
    const game = g.current;
    if (!game.audioCtx) game.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    if (game.audioCtx.state === 'suspended') game.audioCtx.resume();
  }, []);

  const playCollect = useCallback((freq: number) => {
    const ctx = g.current.audioCtx; if (!ctx) return;
    const osc = ctx.createOscillator(); const gn = ctx.createGain();
    osc.connect(gn); gn.connect(ctx.destination); osc.type = 'sine'; osc.frequency.value = freq;
    gn.gain.setValueAtTime(0.15, ctx.currentTime);
    gn.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    osc.start(); osc.stop(ctx.currentTime + 0.15);
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

  function getSpawnInterval(gameTime: number): number {
    const t = Math.min(gameTime / 30, 1);
    return 0.8 - t * 0.3;
  }

  function getGemLifetime(gameTime: number): number {
    const t = Math.min(gameTime / 30, 1);
    return 2.5 - t * 0.7;
  }

  function getComboMultiplier(c: number): number {
    if (c >= 8) return 2.0;
    if (c >= 5) return 1.5;
    if (c >= 3) return 1.2;
    return 1.0;
  }

  const initGame = useCallback(() => {
    const game = g.current;
    game.gems = []; game.particles = []; game.floatingTexts = [];
    game.score = 0; game.collected = 0; game.timeLeft = 30; game.gameTime = 0;
    game.combo = 0; game.comboTimer = 0; game.comboMultiplier = 1; game.maxCombo = 0;
    game.screenShake = { timer: 0, intensity: 0 };
    game.hitFreeze = 0; game.missDarken = 0; game.spawnTimer = 0;
    game.comboBreakFlash = { timer: 0, scale: 1, text: '', mult: 1 };
    game.timerFlash = 0;
  }, []);

  const startGame = useCallback(() => {
    initGame(); initAudio();
    g.current.phase = 'playing'; g.current.running = true;
    setGameState('playing'); setShowShareModal(false); setProgression(null);
  }, [initGame, initAudio]);

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;

    function resize() {
      canvas!.width = window.innerWidth; canvas!.height = window.innerHeight;
      g.current.W = canvas!.width; g.current.H = canvas!.height;
      g.current.safeTop = parseInt(getComputedStyle(document.documentElement).getPropertyValue('env(safe-area-inset-top)')) || 0;
    }
    resize(); window.addEventListener('resize', resize);

    function spawnGem(game: typeof g.current) {
      const margin = 60;
      const x = margin + Math.random() * (game.W - margin * 2);
      const y = margin + 100 + game.safeTop + Math.random() * (game.H - margin * 2 - 150 - game.safeTop);
      const type = selectGemType();
      game.gems.push({ x, y, type, radius: 25, age: 0, maxLife: getGemLifetime(game.gameTime), pulse: 0, alive: true });
    }

    function spawnParticles(game: typeof g.current, x: number, y: number, color: string, count: number) {
      for (let i = 0; i < count; i++) {
        game.particles.push({ x, y, vx: (Math.random() - 0.5) * 8, vy: (Math.random() - 0.5) * 8, life: 1, color, size: Math.random() * 4 + 2 });
      }
    }

    function spawnFloatingText(game: typeof g.current, x: number, y: number, text: string, color: string) {
      game.floatingTexts.push({ x, y, text, color, life: 1, vy: -1.5 });
    }

    const handleTap = (e: TouchEvent | MouseEvent) => {
      if (e instanceof TouchEvent) e.preventDefault();
      const game = g.current;
      const px = e instanceof TouchEvent ? e.touches[0].clientX : e.clientX;
      const py = e instanceof TouchEvent ? e.touches[0].clientY : e.clientY;
      initAudio();

      if (game.phase !== 'playing') return;

      for (let i = game.gems.length - 1; i >= 0; i--) {
        const gem = game.gems[i];
        const dx = px - gem.x, dy = py - gem.y;
        if (dx * dx + dy * dy < gem.radius * gem.radius) {
          const mult = game.comboMultiplier;
          const pts = Math.round(gem.type.points * mult);
          game.score += pts; game.collected++;
          game.combo++; game.comboTimer = 0.9;
          game.comboMultiplier = getComboMultiplier(game.combo);
          if (game.combo > game.maxCombo) game.maxCombo = game.combo;

          const pCount = game.timeLeft < 10 ? 10 : 20;
          spawnParticles(game, gem.x, gem.y, gem.type.color, pCount);

          const comboText = mult > 1 ? ` x${mult}` : '';
          spawnFloatingText(game, gem.x, gem.y - 30, `+${pts}${comboText}`, gem.type.color);
          if (game.combo >= 3) spawnFloatingText(game, game.W / 2, game.H * 0.15, `${game.combo} COMBO!`, T.gold);

          playCollect(gem.type.freq);
          if (gem.type.points >= 5) { game.hitFreeze = 0.03; game.screenShake = { timer: 0.08, intensity: 2 }; }
          game.gems.splice(i, 1);
          break;
        }
      }
    };

    canvas.addEventListener('touchstart', handleTap, { passive: false });
    canvas.addEventListener('click', handleTap);

    let lastTime = performance.now(); let animId: number;

    function update(dt: number) {
      const game = g.current;
      if (game.phase === 'start' || game.phase === 'over') return;
      if (game.hitFreeze > 0) { game.hitFreeze -= dt; return; }
      game.gameTime += dt;

      // timer
      game.timeLeft -= dt;
      if (game.timeLeft <= 0) { game.timeLeft = 0; endGame(game); return; }

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

      // spawn
      game.spawnTimer += dt;
      const interval = getSpawnInterval(game.gameTime);
      if (game.spawnTimer >= interval) { spawnGem(game); game.spawnTimer -= interval; }

      // gems
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
      setScore(game.score); setFinalCollected(game.collected); setFinalMaxCombo(game.maxCombo);
      setGameState('gameover');
      if (game.score >= 1) fetch('/api/pixelpit/stats', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ game: GAME_ID }) }).catch(() => {});
    }

    function draw() {
      const game = g.current;
      if (game.phase === 'start' || game.phase === 'over') return;
      const W = game.W, H = game.H;

      ctx!.fillStyle = 'rgba(0, 0, 0, 0.25)'; ctx!.fillRect(0, 0, W, H);

      ctx!.save();
      if (game.screenShake.timer > 0) {
        const s = game.screenShake.intensity * (game.screenShake.timer / 0.08);
        ctx!.translate((Math.random() * 2 - 1) * s, (Math.random() * 2 - 1) * s);
      }

      // gems
      for (const gem of game.gems) {
        const life = 1 - gem.age / gem.maxLife;
        const alpha = Math.max(0, life);
        const size = gem.radius * gem.pulse;
        const hexA1 = Math.floor(alpha * 255).toString(16).padStart(2, '0');
        const hexA2 = Math.floor(alpha * 100).toString(16).padStart(2, '0');
        const grad = ctx!.createRadialGradient(gem.x, gem.y, 0, gem.x, gem.y, size * 2);
        grad.addColorStop(0, gem.type.color + hexA1);
        grad.addColorStop(0.5, gem.type.color + hexA2);
        grad.addColorStop(1, gem.type.color + '00');
        ctx!.fillStyle = grad;
        ctx!.beginPath(); ctx!.arc(gem.x, gem.y, size * 2, 0, Math.PI * 2); ctx!.fill();
        ctx!.fillStyle = gem.type.color; ctx!.globalAlpha = alpha;
        ctx!.beginPath(); ctx!.arc(gem.x, gem.y, size, 0, Math.PI * 2); ctx!.fill();
        ctx!.globalAlpha = 1;
        if (alpha > 0.7) {
          ctx!.strokeStyle = '#fff';
          ctx!.globalAlpha = (Math.sin(gem.age * 10) * 0.3 + 0.5) * alpha;
          ctx!.lineWidth = 2;
          ctx!.beginPath();
          ctx!.moveTo(gem.x - size * 0.6, gem.y); ctx!.lineTo(gem.x + size * 0.6, gem.y);
          ctx!.moveTo(gem.x, gem.y - size * 0.6); ctx!.lineTo(gem.x, gem.y + size * 0.6);
          ctx!.stroke(); ctx!.globalAlpha = 1;
        }
      }

      // particles
      for (const p of game.particles) {
        ctx!.fillStyle = p.color; ctx!.globalAlpha = p.life;
        ctx!.beginPath(); ctx!.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx!.fill();
        ctx!.globalAlpha = 1;
      }
      ctx!.restore();

      // floating text
      for (const ft of game.floatingTexts) {
        ctx!.fillStyle = ft.color; ctx!.globalAlpha = ft.life;
        ctx!.font = 'bold 18px monospace'; ctx!.textAlign = 'center';
        ctx!.fillText(ft.text, ft.x, ft.y); ctx!.globalAlpha = 1;
      }

      // miss darken
      if (game.missDarken > 0) {
        ctx!.fillStyle = `rgba(0,0,0,${game.missDarken * 3})`;
        ctx!.fillRect(0, 0, W, H);
      }

      // combo border
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
  }, [initAudio, playCollect, playComboBreak, playMissThud]);

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
              tap gems before they fade<br />build combos for multipliers<br />missed gems cost time
            </p>
            <button onClick={startGame} style={{ background: T.gold, color: COLORS.bg, border: 'none', padding: '16px 50px', fontSize: 16, fontFamily: 'ui-monospace, monospace', fontWeight: 600, cursor: 'pointer', borderRadius: 8, letterSpacing: 2, boxShadow: `0 8px 30px rgba(255,215,0,0.3)` }}>play</button>
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
