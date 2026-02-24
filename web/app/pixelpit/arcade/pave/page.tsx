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
  bg: '#f8fafc', ghost: '#e2e8f0', solid: '#a3e635', solidBorder: '#65a30d',
  dot: '#22d3ee', dotGlow: '#06b6d4', player: '#1e293b', text: '#1e293b',
  muted: '#94a3b8', danger: '#ef4444', gold: '#facc15',
};

const COLORS = {
  bg: '#f8fafc', surface: '#ffffff', primary: '#a3e635', secondary: '#22d3ee',
  text: '#1e293b', muted: '#94a3b8', error: '#ef4444',
};

const SCORE_FLOW_COLORS: ScoreFlowColors = { ...COLORS };
const LEADERBOARD_COLORS: LeaderboardColors = { ...COLORS };
const GAME_ID = 'pave';

const BOUNCE_VY = -650, GRAVITY = 1400, PLAT_W = 70, PLAT_H = 12;
const PLAT_SPACING_MIN = 60, PLAT_SPACING_MAX = 100, PLAYER_R = 10, DOT_R = 8;

interface Platform { x: number; y: number; w: number; solid: boolean; flash: number; }
interface Dot { x: number; y: number; alive: boolean; pulse: number; }
interface Particle { x: number; y: number; vx: number; vy: number; life: number; color: string; size: number; }

export default function PaveGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<'start' | 'playing' | 'gameover' | 'leaderboard'>('start');
  const [score, setScore] = useState(0);
  const [socialLoaded, setSocialLoaded] = useState(false);
  const [submittedEntryId, setSubmittedEntryId] = useState<number | null>(null);
  const [progression, setProgression] = useState<ProgressionResult | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const { user } = usePixelpitSocial(socialLoaded);
  const GAME_URL = typeof window !== 'undefined' ? `${window.location.origin}/pixelpit/arcade/pave` : 'https://pixelpit.gg/pixelpit/arcade/pave';

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

  const g = useRef({
    player: { x: 0, y: 0, vx: 0, vy: 0 },
    platforms: [] as Platform[], dots: [] as Dot[], particles: [] as Particle[],
    cameraY: 0, score: 0, maxHeight: 0, dotsCount: 1,
    phase: 'start' as 'start' | 'playing' | 'dead' | 'over',
    gameTime: 0, deadTimer: 0, dragActive: false, dragX: 0,
    screenShake: { timer: 0, intensity: 0 }, safeTop: 0,
    audioCtx: null as AudioContext | null, running: false, W: 0, H: 0,
  });

  const initAudio = useCallback(() => {
    const game = g.current;
    if (!game.audioCtx) game.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    if (game.audioCtx.state === 'suspended') game.audioCtx.resume();
  }, []);

  const playBounce = useCallback((pitch: number) => {
    const ctx = g.current.audioCtx; if (!ctx) return;
    const osc = ctx.createOscillator(); const gn = ctx.createGain();
    osc.connect(gn); gn.connect(ctx.destination); osc.type = 'sine'; osc.frequency.value = pitch || 440;
    gn.gain.setValueAtTime(0.12, ctx.currentTime); gn.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
    osc.start(); osc.stop(ctx.currentTime + 0.1);
  }, []);

  const playCollectSound = useCallback(() => {
    const ctx = g.current.audioCtx; if (!ctx) return;
    const osc = ctx.createOscillator(); const gn = ctx.createGain();
    osc.connect(gn); gn.connect(ctx.destination); osc.type = 'sine'; osc.frequency.value = 880;
    gn.gain.setValueAtTime(0.1, ctx.currentTime); gn.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
    osc.start(); osc.stop(ctx.currentTime + 0.08);
  }, []);

  const playSolidify = useCallback(() => {
    const ctx = g.current.audioCtx; if (!ctx) return;
    const osc = ctx.createOscillator(); const gn = ctx.createGain();
    osc.connect(gn); gn.connect(ctx.destination); osc.type = 'square';
    osc.frequency.setValueAtTime(330, ctx.currentTime); osc.frequency.exponentialRampToValueAtTime(500, ctx.currentTime + 0.1);
    gn.gain.setValueAtTime(0.1, ctx.currentTime); gn.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
    osc.start(); osc.stop(ctx.currentTime + 0.18);
  }, []);

  const playFallThrough = useCallback(() => {
    const ctx = g.current.audioCtx; if (!ctx) return;
    const osc = ctx.createOscillator(); const gn = ctx.createGain();
    osc.connect(gn); gn.connect(ctx.destination); osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(300, ctx.currentTime); osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.3);
    gn.gain.setValueAtTime(0.1, ctx.currentTime); gn.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc.start(); osc.stop(ctx.currentTime + 0.35);
  }, []);

  const initGame = useCallback(() => {
    const game = g.current;
    game.player = { x: game.W / 2, y: 0, vx: 0, vy: 0 };
    game.platforms = []; game.dots = []; game.particles = [];
    game.cameraY = 0; game.score = 0; game.maxHeight = 0; game.dotsCount = 1;
    game.gameTime = 0; game.deadTimer = 0; game.dragActive = false; game.dragX = 0;
    game.screenShake = { timer: 0, intensity: 0 };
    game.platforms.push({ x: game.W / 2, y: 50, w: PLAT_W * 1.5, solid: true, flash: 0 });
    let lastY = 50;
    for (let i = 0; i < 30; i++) {
      lastY -= PLAT_SPACING_MIN + Math.random() * (PLAT_SPACING_MAX - PLAT_SPACING_MIN);
      const x = 30 + Math.random() * (game.W - 60);
      game.platforms.push({ x, y: lastY, w: PLAT_W, solid: false, flash: 0 });
      if (Math.random() < 0.6) {
        game.dots.push({ x: x + (Math.random() - 0.5) * 80, y: lastY - 20 - Math.random() * 40, alive: true, pulse: Math.random() * Math.PI * 2 });
      }
    }
  }, []);

  const startGame = useCallback(() => {
    initGame(); initAudio();
    g.current.phase = 'playing'; g.current.player.vy = BOUNCE_VY; g.current.running = true;
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

    function spawnParticles(game: typeof g.current, x: number, y: number, color: string, count: number) {
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2, speed = 40 + Math.random() * 80;
        game.particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: 1, color, size: 2 + Math.random() * 3 });
      }
    }

    function generateAbove(game: typeof g.current) {
      const target = game.cameraY - game.H * 1.5;
      while (true) {
        const highest = game.platforms.reduce((min, p) => Math.min(min, p.y), Infinity);
        if (highest <= target) break;
        const newY = highest - PLAT_SPACING_MIN - Math.random() * (PLAT_SPACING_MAX - PLAT_SPACING_MIN);
        const x = 30 + Math.random() * (game.W - 60);
        const diffMult = Math.min(game.score / 50, 1);
        game.platforms.push({ x, y: newY, w: PLAT_W - diffMult * 15, solid: false, flash: 0 });
        const dotChance = 0.65 - diffMult * 0.15;
        if (Math.random() < dotChance) {
          game.dots.push({ x: x + (Math.random() - 0.5) * 80, y: newY - 20 - Math.random() * 40, alive: true, pulse: Math.random() * Math.PI * 2 });
        }
      }
    }

    const handleStart = (x: number) => { initAudio(); g.current.dragActive = true; g.current.dragX = x; };
    const handleMove = (x: number) => {
      const game = g.current; if (!game.dragActive || game.phase !== 'playing') return;
      game.player.vx = (x - game.dragX) * 15; game.dragX = x;
    };
    const handleEnd = () => { g.current.dragActive = false; };
    const handleTouchStart = (e: TouchEvent) => { e.preventDefault(); handleStart(e.touches[0].clientX); };
    const handleTouchMove = (e: TouchEvent) => { e.preventDefault(); handleMove(e.touches[0].clientX); };
    const handleMouseDown = (e: MouseEvent) => handleStart(e.clientX);
    const handleMouseMove = (e: MouseEvent) => { if (g.current.dragActive) handleMove(e.clientX); };

    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleEnd);
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleEnd);

    function update(dt: number) {
      const game = g.current;
      if (game.phase === 'start' || game.phase === 'over') return;
      if (game.phase === 'dead') {
        game.deadTimer += dt; game.player.vy += GRAVITY * dt; game.player.y += game.player.vy * dt;
        if (game.deadTimer >= 1.5) {
          game.phase = 'over'; game.running = false;
          setScore(game.score); setGameState('gameover');
          if (game.score >= 1) fetch('/api/pixelpit/stats', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ game: GAME_ID }) }).catch(() => {});
        }
        return;
      }
      game.gameTime += dt;
      game.player.vy += GRAVITY * dt; game.player.y += game.player.vy * dt;
      game.player.x += game.player.vx * dt; game.player.vx *= 0.88;
      if (game.player.x < -PLAYER_R) game.player.x = game.W + PLAYER_R;
      if (game.player.x > game.W + PLAYER_R) game.player.x = -PLAYER_R;

      for (const dot of game.dots) {
        if (!dot.alive) continue;
        const dx = game.player.x - dot.x, dy = game.player.y - dot.y;
        if (dx * dx + dy * dy < (PLAYER_R + DOT_R) * (PLAYER_R + DOT_R)) {
          dot.alive = false; game.dotsCount++; playCollectSound();
          spawnParticles(game, dot.x, dot.y, T.dot, 6);
        }
      }

      if (game.player.vy > 0) {
        for (const plat of game.platforms) {
          if (game.player.y + PLAYER_R >= plat.y && game.player.y + PLAYER_R <= plat.y + PLAT_H + game.player.vy * dt &&
              game.player.x >= plat.x - plat.w / 2 - PLAYER_R * 0.5 && game.player.x <= plat.x + plat.w / 2 + PLAYER_R * 0.5) {
            if (plat.solid) {
              game.player.y = plat.y - PLAYER_R; game.player.vy = BOUNCE_VY;
              playBounce(440 + game.score * 2); spawnParticles(game, game.player.x, plat.y, T.solid, 4);
            } else if (game.dotsCount > 0) {
              game.dotsCount--; plat.solid = true; plat.flash = 0.3;
              game.player.y = plat.y - PLAYER_R; game.player.vy = BOUNCE_VY;
              playSolidify(); spawnParticles(game, game.player.x, plat.y, T.solid, 8);
              game.screenShake = { timer: 0.06, intensity: 1.5 };
            } else {
              playFallThrough(); game.phase = 'dead'; game.deadTimer = 0;
              game.screenShake = { timer: 0.15, intensity: 3 }; return;
            }
            break;
          }
        }
      }

      const height = Math.floor(-game.player.y / 10);
      if (height > game.maxHeight) { game.maxHeight = height; game.score = game.maxHeight; }
      const targetCam = game.player.y - game.H * 0.6;
      game.cameraY += (targetCam - game.cameraY) * 4 * dt;
      if (game.player.y > game.cameraY + game.H + 50) { game.phase = 'dead'; game.deadTimer = 0; }
      generateAbove(game);
      game.platforms = game.platforms.filter(p => p.y < game.cameraY + game.H + 100);
      game.dots = game.dots.filter(d => d.y < game.cameraY + game.H + 100);
      for (let i = game.particles.length - 1; i >= 0; i--) {
        const p = game.particles[i]; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 200 * dt; p.life -= dt * 2;
        if (p.life <= 0) game.particles.splice(i, 1);
      }
      for (const plat of game.platforms) { if (plat.flash > 0) plat.flash -= dt; }
      if (game.screenShake.timer > 0) game.screenShake.timer -= dt;
    }

    function draw() {
      const game = g.current;
      if (game.phase === 'start' || game.phase === 'over') return;
      const W = game.W, H = game.H;
      ctx!.fillStyle = T.bg; ctx!.fillRect(0, 0, W, H);
      ctx!.save();
      if (game.screenShake.timer > 0) {
        const s = game.screenShake.intensity * (game.screenShake.timer / 0.15);
        ctx!.translate((Math.random() * 2 - 1) * s, (Math.random() * 2 - 1) * s);
      }
      for (const plat of game.platforms) {
        const sy = plat.y - game.cameraY; if (sy < -20 || sy > H + 20) continue;
        if (plat.solid) {
          const fa = plat.flash > 0 ? plat.flash / 0.3 : 0;
          ctx!.fillStyle = T.solid; ctx!.shadowBlur = fa > 0 ? 12 : 0; ctx!.shadowColor = T.solid;
          ctx!.fillRect(plat.x - plat.w / 2, sy, plat.w, PLAT_H); ctx!.shadowBlur = 0;
          ctx!.strokeStyle = T.solidBorder; ctx!.lineWidth = 2;
          ctx!.strokeRect(plat.x - plat.w / 2, sy, plat.w, PLAT_H);
          if (fa > 0) { ctx!.fillStyle = `rgba(255,255,255,${fa * 0.5})`; ctx!.fillRect(plat.x - plat.w / 2, sy, plat.w, PLAT_H); }
        } else {
          ctx!.fillStyle = T.ghost; ctx!.globalAlpha = 0.25 + Math.sin(game.gameTime * 3 + plat.x) * 0.05;
          ctx!.fillRect(plat.x - plat.w / 2, sy, plat.w, PLAT_H); ctx!.globalAlpha = 1;
          ctx!.strokeStyle = T.ghost; ctx!.lineWidth = 1; ctx!.setLineDash([4, 4]);
          ctx!.strokeRect(plat.x - plat.w / 2, sy, plat.w, PLAT_H); ctx!.setLineDash([]);
        }
      }
      for (const dot of game.dots) {
        if (!dot.alive) continue; const sy = dot.y - game.cameraY; if (sy < -20 || sy > H + 20) continue;
        dot.pulse += 0.05; const pulse = 1 + Math.sin(dot.pulse) * 0.15; const r = DOT_R * pulse;
        ctx!.fillStyle = T.dot; ctx!.globalAlpha = 0.3; ctx!.beginPath(); ctx!.arc(dot.x, sy, r * 2, 0, Math.PI * 2); ctx!.fill(); ctx!.globalAlpha = 1;
        ctx!.fillStyle = T.dot; ctx!.beginPath(); ctx!.arc(dot.x, sy, r, 0, Math.PI * 2); ctx!.fill();
        ctx!.fillStyle = '#fff'; ctx!.globalAlpha = 0.6; ctx!.beginPath(); ctx!.arc(dot.x - r * 0.3, sy - r * 0.3, r * 0.3, 0, Math.PI * 2); ctx!.fill(); ctx!.globalAlpha = 1;
      }
      const py = game.player.y - game.cameraY;
      if (game.phase !== 'dead' || game.deadTimer < 1.5) {
        ctx!.fillStyle = 'rgba(0,0,0,0.1)'; ctx!.beginPath(); ctx!.arc(game.player.x + 2, py + 2, PLAYER_R, 0, Math.PI * 2); ctx!.fill();
        ctx!.fillStyle = T.player; ctx!.beginPath(); ctx!.arc(game.player.x, py, PLAYER_R, 0, Math.PI * 2); ctx!.fill();
        ctx!.fillStyle = '#fff'; const eyeOff = game.player.vx > 10 ? 2 : game.player.vx < -10 ? -2 : 0;
        ctx!.beginPath(); ctx!.arc(game.player.x - 3 + eyeOff, py - 2, 2.5, 0, Math.PI * 2); ctx!.fill();
        ctx!.beginPath(); ctx!.arc(game.player.x + 3 + eyeOff, py - 2, 2.5, 0, Math.PI * 2); ctx!.fill();
      }
      for (const p of game.particles) {
        ctx!.fillStyle = p.color; ctx!.globalAlpha = p.life; ctx!.beginPath(); ctx!.arc(p.x, p.y - game.cameraY, p.size, 0, Math.PI * 2); ctx!.fill(); ctx!.globalAlpha = 1;
      }
      ctx!.restore();
      const hy = game.safeTop;
      ctx!.fillStyle = T.text; ctx!.font = 'bold 28px monospace'; ctx!.textAlign = 'left'; ctx!.fillText(game.score + '', 16, 36 + hy);
      ctx!.textAlign = 'right'; ctx!.fillStyle = game.dotsCount > 0 ? T.dot : T.danger; ctx!.font = 'bold 22px monospace';
      ctx!.fillText(game.dotsCount + '', W - 16, 36 + hy); ctx!.fillStyle = T.muted; ctx!.font = '10px monospace'; ctx!.fillText('DOTS', W - 16, 50 + hy);
      if (game.dotsCount <= 1 && game.phase === 'playing') {
        ctx!.strokeStyle = T.danger; ctx!.lineWidth = 2; ctx!.globalAlpha = 0.2 + Math.sin(game.gameTime * 6) * 0.15;
        ctx!.strokeRect(2, 2, W - 4, H - 4); ctx!.globalAlpha = 1;
      }
      ctx!.textAlign = 'left';
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
      canvas.removeEventListener('touchstart', handleTouchStart); canvas.removeEventListener('touchmove', handleTouchMove);
      canvas.removeEventListener('touchend', handleEnd); canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mousemove', handleMouseMove); canvas.removeEventListener('mouseup', handleEnd);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initAudio, playBounce, playCollectSound, playSolidify, playFallThrough]);

  return (
    <>
      <Script src="/pixelpit/social.js" strategy="lazyOnload" onLoad={() => setSocialLoaded(true)} />
      <canvas ref={canvasRef} style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', display: 'block', background: T.bg, touchAction: 'none' }} />

      {gameState === 'start' && (
        <div style={{ position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: COLORS.bg, zIndex: 100, textAlign: 'center', padding: 40 }}>
          <div style={{ background: COLORS.surface, border: '1px solid rgba(0,0,0,0.06)', padding: '50px 60px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', borderRadius: 16 }}>
            <div style={{ width: 20, height: 20, borderRadius: '50%', background: T.player, margin: '0 auto 12px' }} />
            <h1 style={{ fontFamily: 'ui-monospace, monospace', fontSize: 56, fontWeight: 700, color: T.text, marginBottom: 16, letterSpacing: 6 }}>PAVE</h1>
            <p style={{ fontSize: 14, fontFamily: 'ui-monospace, monospace', color: T.muted, marginBottom: 30, lineHeight: 1.8, letterSpacing: 1 }}>
              collect dots to build your path<br />drag to steer
            </p>
            <button onClick={startGame} style={{ background: T.solid, color: T.text, border: `2px solid ${T.solidBorder}`, padding: '16px 50px', fontSize: 16, fontFamily: 'ui-monospace, monospace', fontWeight: 600, cursor: 'pointer', borderRadius: 8, letterSpacing: 2 }}>play</button>
          </div>
          <div style={{ marginTop: 24, fontSize: 12, fontFamily: 'ui-monospace, monospace', letterSpacing: 3 }}>
            <span style={{ color: T.solid }}>pixel</span><span style={{ color: T.dot }}>pit</span><span style={{ color: T.muted }}> arcade</span>
          </div>
        </div>
      )}

      {gameState === 'gameover' && (
        <div style={{ position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: COLORS.bg, zIndex: 100, textAlign: 'center', padding: 40 }}>
          <h1 style={{ fontFamily: 'ui-monospace, monospace', fontSize: 24, fontWeight: 300, color: T.muted, marginBottom: 12, letterSpacing: 4 }}>game over</h1>
          <div style={{ fontFamily: 'ui-monospace, monospace', fontSize: 72, fontWeight: 700, color: T.text, marginBottom: 8 }}>{score}</div>
          <div style={{ fontFamily: 'ui-monospace, monospace', fontSize: 13, color: T.muted, marginBottom: 25 }}>height reached</div>
          <ScoreFlow score={score} gameId={GAME_ID} colors={SCORE_FLOW_COLORS} maxScore={100} onRankReceived={(rank, entryId) => setSubmittedEntryId(entryId ?? null)} onProgression={(prog) => setProgression(prog)} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
            <button onClick={startGame} style={{ background: T.solid, color: T.text, border: `2px solid ${T.solidBorder}`, borderRadius: 8, padding: '16px 50px', fontSize: 15, fontFamily: 'ui-monospace, monospace', fontWeight: 600, cursor: 'pointer', letterSpacing: 2 }}>play again</button>
            <button onClick={() => setGameState('leaderboard')} style={{ background: 'transparent', border: '1px solid rgba(0,0,0,0.1)', borderRadius: 6, color: T.muted, padding: '14px 35px', fontSize: 11, fontFamily: 'ui-monospace, monospace', cursor: 'pointer', letterSpacing: 2 }}>leaderboard</button>
            {user ? (
              <button onClick={() => setShowShareModal(true)} style={{ background: 'transparent', border: '1px solid rgba(0,0,0,0.1)', borderRadius: 6, color: T.muted, padding: '14px 35px', fontSize: 11, fontFamily: 'ui-monospace, monospace', cursor: 'pointer', letterSpacing: 2 }}>share / groups</button>
            ) : (
              <ShareButtonContainer id="share-btn-container" url={typeof window !== 'undefined' ? `${window.location.origin}/pixelpit/arcade/pave/share/${score}` : ''} text={`I reached height ${score} on PAVE! Can you beat me?`} style="minimal" socialLoaded={socialLoaded} />
            )}
          </div>
        </div>
      )}

      {gameState === 'leaderboard' && <Leaderboard gameId={GAME_ID} limit={8} entryId={submittedEntryId ?? undefined} colors={LEADERBOARD_COLORS} onClose={() => setGameState('gameover')} groupsEnabled={true} gameUrl={GAME_URL} socialLoaded={socialLoaded} />}
      {showShareModal && user && <ShareModal gameUrl={GAME_URL} score={score} colors={LEADERBOARD_COLORS} onClose={() => setShowShareModal(false)} />}
    </>
  );
}
