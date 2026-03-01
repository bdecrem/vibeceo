'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
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

const GAME_ID = 'bullseye';
const GAME_NAME = 'BULLSEYE';

const COLORS = {
  bg: '#0a0a0a',
  surface: '#141414',
  primary: '#FFD700',
  secondary: '#2D9596',
  text: '#f8fafc',
  muted: '#71717a',
  error: '#ec4899',
  perfect: '#00ff88',
};

const SCORE_FLOW_COLORS: ScoreFlowColors = {
  bg: COLORS.bg,
  surface: COLORS.surface,
  primary: COLORS.primary,
  secondary: COLORS.secondary,
  text: COLORS.text,
  muted: COLORS.muted,
  error: COLORS.error,
};

const LEADERBOARD_COLORS: LeaderboardColors = {
  bg: COLORS.bg,
  surface: COLORS.surface,
  primary: COLORS.primary,
  secondary: COLORS.secondary,
  text: COLORS.text,
  muted: COLORS.muted,
};

// --- Game types ---
interface TargetState {
  id: number;
  x: number;
  y: number;
  r: number;
  ringR: number;
  speed: number;
  alive: boolean;
  hit: boolean;
}

interface ParticleState {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  life: number;
  decay: number;
  size: number;
}

export default function BullseyeGame() {
  const [gameState, setGameState] = useState<'start' | 'playing' | 'gameover' | 'leaderboard'>('start');
  const [score, setScore] = useState(0);
  const [socialLoaded, setSocialLoaded] = useState(false);
  const [submittedEntryId, setSubmittedEntryId] = useState<number | null>(null);
  const [progression, setProgression] = useState<ProgressionResult | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);

  const { user } = usePixelpitSocial(socialLoaded);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<{
    score: number;
    combo: number;
    lives: number;
    targets: TargetState[];
    particles: ParticleState[];
    running: boolean;
    spawnTimer: number;
    spawnInterval: number;
    nextId: number;
    feedbackText: string;
    feedbackColor: string;
    feedbackOpacity: number;
    audioCtx: AudioContext | null;
    best: number;
  }>({
    score: 0, combo: 0, lives: 3, targets: [], particles: [],
    running: false, spawnTimer: 60, spawnInterval: 90, nextId: 0,
    feedbackText: '', feedbackColor: '', feedbackOpacity: 0,
    audioCtx: null, best: 0,
  });
  const rafRef = useRef<number>(0);

  const GAME_URL = typeof window !== 'undefined'
    ? `${window.location.origin}/pixelpit/arcade/${GAME_ID}`
    : `https://pixelpit.gg/pixelpit/arcade/${GAME_ID}`;

  // --- Social init ---
  useEffect(() => {
    if (!socialLoaded || typeof window === 'undefined') return;
    if (!window.PixelpitSocial) return;

    const params = new URLSearchParams(window.location.search);
    if (params.has('logout')) {
      window.PixelpitSocial.logout();
      params.delete('logout');
      const newUrl = params.toString()
        ? `${window.location.pathname}?${params.toString()}`
        : window.location.pathname;
      window.history.replaceState({}, '', newUrl);
      window.location.reload();
      return;
    }

    const groupCode = window.PixelpitSocial.getGroupCodeFromUrl();
    if (groupCode) window.PixelpitSocial.storeGroupCode(groupCode);
  }, [socialLoaded]);

  // --- Load best score ---
  useEffect(() => {
    gameRef.current.best = +(localStorage.getItem('bullseye-best') || 0);
  }, []);

  // --- Audio helpers ---
  const initAudio = useCallback(() => {
    const g = gameRef.current;
    if (!g.audioCtx) g.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }, []);

  const playSound = useCallback((freq: number, type: OscillatorType, dur: number, vol = 0.3) => {
    const ctx = gameRef.current.audioCtx;
    if (!ctx) return;
    const o = ctx.createOscillator(), gn = ctx.createGain();
    o.type = type; o.frequency.value = freq;
    gn.gain.setValueAtTime(vol, ctx.currentTime);
    gn.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    o.connect(gn); gn.connect(ctx.destination);
    o.start(); o.stop(ctx.currentTime + dur);
  }, []);

  const hitSound = useCallback((quality: string) => {
    if (quality === 'perfect') { playSound(880, 'sine', 0.15, 0.4); setTimeout(() => playSound(1320, 'sine', 0.2, 0.3), 80); }
    else if (quality === 'great') playSound(660, 'sine', 0.12, 0.3);
    else if (quality === 'ok') playSound(440, 'triangle', 0.1, 0.2);
  }, [playSound]);

  const missSound = useCallback(() => {
    playSound(150, 'sawtooth', 0.2, 0.2);
    playSound(120, 'sawtooth', 0.3, 0.15);
  }, [playSound]);

  // --- Spawn target ---
  const spawnTarget = useCallback((W: number, H: number) => {
    const g = gameRef.current;
    const r = 30 + Math.random() * 15;
    g.targets.push({
      id: g.nextId++,
      x: 60 + Math.random() * (W - 120),
      y: 80 + Math.random() * (H - 160),
      r,
      ringR: r * 4,
      speed: 1.2 + g.score * 0.015,
      alive: true,
      hit: false,
    });
  }, []);

  // --- Spawn particles ---
  const spawnParticles = useCallback((x: number, y: number, color: string, n: number) => {
    const g = gameRef.current;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, s = 2 + Math.random() * 5;
      g.particles.push({
        id: g.nextId++, x, y,
        vx: Math.cos(a) * s, vy: Math.sin(a) * s,
        color, life: 1, decay: 0.02 + Math.random() * 0.03,
        size: 3 + Math.random() * 4,
      });
    }
  }, []);

  // --- Game end ---
  const endGame = useCallback(() => {
    const g = gameRef.current;
    g.running = false;
    const finalScore = Math.floor(g.score);
    if (finalScore > g.best) {
      g.best = finalScore;
      localStorage.setItem('bullseye-best', String(g.best));
    }
    setScore(finalScore);
    setGameState('gameover');

    // Analytics
    if (finalScore >= 1) {
      fetch('/api/pixelpit/stats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ game: GAME_ID }),
      }).catch(() => {});
    }
  }, []);

  // --- Canvas game loop ---
  useEffect(() => {
    if (gameState !== 'playing') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const g = gameRef.current;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const W = window.innerWidth, H = window.innerHeight;
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      canvas.style.width = W + 'px';
      canvas.style.height = H + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      return { W, H };
    };
    let { W, H } = resize();
    const onResize = () => { const s = resize(); W = s.W; H = s.H; };
    window.addEventListener('resize', onResize);

    const update = () => {
      g.spawnTimer++;
      if (g.spawnTimer >= g.spawnInterval) {
        g.spawnTimer = 0;
        spawnTarget(W, H);
        g.spawnInterval = Math.max(30, 90 - g.score * 0.08);
      }

      for (const t of g.targets) {
        if (t.hit) continue;
        t.ringR -= t.speed;
        if (t.ringR < 0) {
          t.alive = false;
          g.lives--;
          missSound();
          g.feedbackText = 'MISS'; g.feedbackColor = COLORS.error; g.feedbackOpacity = 1;
          g.combo = 0;
        }
      }
      g.targets = g.targets.filter(t => t.alive || t.hit);

      for (const p of g.particles) {
        p.x += p.vx; p.y += p.vy;
        p.vx *= 0.96; p.vy *= 0.96;
        p.life -= p.decay;
      }
      g.particles = g.particles.filter(p => p.life > 0);

      // Fade feedback
      if (g.feedbackOpacity > 0) g.feedbackOpacity -= 0.03;

      if (g.lives <= 0) endGame();
    };

    const draw = () => {
      ctx.clearRect(0, 0, W, H);

      // Lives
      for (let i = 0; i < 3; i++) {
        ctx.fillStyle = i < g.lives ? COLORS.error : 'rgba(236,72,153,.2)';
        ctx.beginPath();
        ctx.arc(W - 30 - i * 28, 30, 8, 0, Math.PI * 2);
        ctx.fill();
      }

      // Score
      ctx.fillStyle = COLORS.primary;
      ctx.font = 'bold 28px "SF Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(String(Math.floor(g.score)), W / 2, 36);

      // Combo
      if (g.combo > 1) {
        ctx.fillStyle = COLORS.secondary;
        ctx.font = '16px "SF Mono", monospace';
        ctx.fillText(g.combo + 'x COMBO', W / 2, 58);
      }

      // Targets
      for (const t of g.targets) {
        if (!t.alive && !t.hit) continue;
        const a = t.hit ? 0.3 : 1;
        ctx.beginPath();
        ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,215,0,${a * 0.15})`;
        ctx.fill();
        ctx.strokeStyle = `rgba(255,215,0,${a * 0.6})`;
        ctx.lineWidth = 2;
        ctx.stroke();

        if (!t.hit) {
          ctx.beginPath();
          ctx.arc(t.x, t.y, t.ringR, 0, Math.PI * 2);
          const diff = Math.abs(t.ringR - t.r);
          ctx.strokeStyle = diff < 5 ? COLORS.perfect : diff < 15 ? COLORS.primary : COLORS.secondary;
          ctx.lineWidth = 3;
          ctx.stroke();
        }
      }

      // Particles
      for (const p of g.particles) {
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      }
      ctx.globalAlpha = 1;

      // Feedback text
      if (g.feedbackOpacity > 0.01) {
        ctx.globalAlpha = g.feedbackOpacity;
        ctx.fillStyle = g.feedbackColor;
        ctx.font = 'bold 48px "SF Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(g.feedbackText, W / 2, H / 2);
        ctx.globalAlpha = 1;
      }
    };

    const handleTap = (e: PointerEvent) => {
      e.preventDefault();
      if (!g.running) return;
      const tx = e.clientX, ty = e.clientY;
      let hitAny = false;

      // Sort by closest ring match
      const sorted = [...g.targets].filter(t => !t.hit && t.alive).sort((a, b) =>
        Math.abs(a.ringR - a.r) - Math.abs(b.ringR - b.r)
      );

      for (const t of sorted) {
        const d = Math.hypot(tx - t.x, ty - t.y);
        if (d > t.ringR + 20) continue;
        const diff = Math.abs(t.ringR - t.r);
        t.hit = true;

        if (diff < 5) {
          g.score += 100 * (1 + g.combo * 0.5); g.combo++;
          hitSound('perfect');
          g.feedbackText = 'PERFECT'; g.feedbackColor = COLORS.perfect; g.feedbackOpacity = 1;
          spawnParticles(t.x, t.y, COLORS.perfect, 20);
        } else if (diff < 15) {
          g.score += 50 * (1 + g.combo * 0.3); g.combo++;
          hitSound('great');
          g.feedbackText = 'GREAT'; g.feedbackColor = COLORS.primary; g.feedbackOpacity = 1;
          spawnParticles(t.x, t.y, COLORS.primary, 12);
        } else if (diff < 30) {
          g.score += 20; g.combo = 0;
          hitSound('ok');
          g.feedbackText = 'OK'; g.feedbackColor = COLORS.secondary; g.feedbackOpacity = 1;
          spawnParticles(t.x, t.y, COLORS.secondary, 6);
        } else {
          g.lives--; g.combo = 0;
          missSound();
          g.feedbackText = 'MISS'; g.feedbackColor = COLORS.error; g.feedbackOpacity = 1;
        }

        setTimeout(() => { t.alive = false; }, 200);
        hitAny = true;
        break;
      }

      if (!hitAny) { g.combo = 0; }
    };

    canvas.addEventListener('pointerdown', handleTap);

    const loop = () => {
      if (!g.running) return;
      update();
      draw();
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener('resize', onResize);
      canvas.removeEventListener('pointerdown', handleTap);
      cancelAnimationFrame(rafRef.current);
    };
  }, [gameState, endGame, hitSound, missSound, spawnTarget, spawnParticles]);

  // --- Start game ---
  const startGame = useCallback(() => {
    initAudio();
    const g = gameRef.current;
    g.score = 0; g.combo = 0; g.lives = 3;
    g.targets = []; g.particles = [];
    g.spawnTimer = 60; g.spawnInterval = 90;
    g.feedbackOpacity = 0; g.running = true;
    setScore(0);
    setSubmittedEntryId(null);
    setProgression(null);
    setShowShareModal(false);
    setGameState('playing');
  }, [initAudio]);

  return (
    <>
      <Script src="/pixelpit/social.js" onLoad={() => setSocialLoaded(true)} />

      <style jsx global>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          background: ${COLORS.bg};
          font-family: 'SF Mono', ui-monospace, monospace;
          color: ${COLORS.text};
          overflow: hidden;
          touch-action: none;
          user-select: none;
          -webkit-user-select: none;
        }
      `}</style>

      {/* Canvas layer — visible during playing */}
      <canvas
        ref={canvasRef}
        style={{
          position: 'fixed', inset: 0,
          display: gameState === 'playing' ? 'block' : 'none',
          width: '100%', height: '100%',
        }}
      />

      {/* UI screens */}
      <div style={{
        minHeight: '100vh',
        display: gameState === 'playing' ? 'none' : 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        position: 'relative',
        zIndex: 10,
      }}>

        {/* --- START SCREEN --- */}
        {gameState === 'start' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 8 }}>🎯</div>
            <h1 style={{
              fontSize: 48, fontWeight: 700, color: COLORS.primary,
              letterSpacing: 6, marginBottom: 8,
            }}>
              {GAME_NAME}
            </h1>
            <p style={{
              fontSize: 12, color: COLORS.secondary,
              letterSpacing: 3, marginBottom: 8,
            }}>
              PIXELPIT ARCADE
            </p>
            <p style={{
              fontSize: 14, color: COLORS.muted,
              letterSpacing: 1, marginBottom: 40,
            }}>
              tap when the ring hits the circle
            </p>
            <button onClick={startGame} style={{
              background: 'none', border: `2px solid ${COLORS.primary}`,
              color: COLORS.primary, fontSize: 20, padding: '16px 48px',
              borderRadius: 50, fontFamily: 'inherit', cursor: 'pointer',
              minHeight: 56, minWidth: 200, letterSpacing: 2,
            }}>
              PLAY
            </button>
          </div>
        )}

        {/* --- GAME OVER SCREEN --- */}
        {gameState === 'gameover' && (
          <div style={{
            textAlign: 'center', display: 'flex', flexDirection: 'column',
            alignItems: 'center', maxWidth: 400, width: '100%',
          }}>
            <div style={{
              fontSize: 20, color: COLORS.error, letterSpacing: 4, marginBottom: 12,
            }}>
              GAME OVER
            </div>

            <div style={{
              fontSize: 64, fontWeight: 700, color: COLORS.primary,
              marginBottom: 4, lineHeight: 1,
            }}>
              {score}
            </div>

            <div style={{
              fontSize: 14, color: COLORS.secondary, marginBottom: 24,
            }}>
              best: {gameRef.current.best}
            </div>

            {/* Progression display */}
            {progression && (
              <div style={{
                background: COLORS.surface, borderRadius: 12,
                padding: '16px 24px', marginBottom: 20, textAlign: 'center',
              }}>
                <div style={{ fontSize: 18, color: COLORS.perfect, marginBottom: 8 }}>
                  +{progression.xpEarned} XP{progression.leveledUp ? ' 🎉 LEVEL UP!' : ''}
                </div>
                <div style={{ fontSize: 12, color: COLORS.muted }}>
                  Level {progression.level}{progression.streak > 1 ? ` · ${progression.multiplier}x streak` : ''}
                </div>
              </div>
            )}

            {/* Score submission */}
            <ScoreFlow
              score={score}
              gameId={GAME_ID}
              colors={SCORE_FLOW_COLORS}
              maxScore={2000}
              onRankReceived={(rank, entryId) => setSubmittedEntryId(entryId ?? null)}
              onProgression={(prog) => setProgression(prog)}
            />

            {/* Action buttons */}
            <div style={{
              display: 'flex', flexDirection: 'column', gap: 12,
              alignItems: 'center', marginTop: 20, width: '100%',
            }}>
              <button onClick={startGame} style={{
                background: 'none', border: `2px solid ${COLORS.primary}`,
                color: COLORS.primary, borderRadius: 50, padding: '14px 40px',
                fontSize: 16, fontFamily: 'inherit', fontWeight: 600,
                cursor: 'pointer', letterSpacing: 2,
              }}>
                AGAIN
              </button>
              <div style={{ display: 'flex', gap: 12 }}>
                <button onClick={() => setGameState('leaderboard')} style={{
                  background: 'transparent', border: `1px solid ${COLORS.surface}`,
                  borderRadius: 6, color: COLORS.muted, padding: '10px 24px',
                  fontSize: 11, fontFamily: 'inherit', cursor: 'pointer', letterSpacing: 2,
                }}>
                  leaderboard
                </button>
                {user ? (
                  <button onClick={() => setShowShareModal(true)} style={{
                    background: 'transparent', border: `1px solid ${COLORS.surface}`,
                    borderRadius: 6, color: COLORS.muted, padding: '10px 24px',
                    fontSize: 11, fontFamily: 'inherit', cursor: 'pointer', letterSpacing: 2,
                  }}>
                    share / groups
                  </button>
                ) : (
                  <ShareButtonContainer
                    id="share-btn-container"
                    url={typeof window !== 'undefined' ? `${window.location.origin}/pixelpit/arcade/${GAME_ID}/share/${score}` : ''}
                    text={`I scored ${score} on BULLSEYE! 🎯 Can you beat me?`}
                    style="minimal"
                    socialLoaded={socialLoaded}
                  />
                )}
              </div>
            </div>

            <div style={{
              marginTop: 24, fontSize: 11, letterSpacing: 3, color: COLORS.secondary, opacity: 0.5,
            }}>
              PIXELPIT ARCADE
            </div>
          </div>
        )}

        {/* --- LEADERBOARD --- */}
        {gameState === 'leaderboard' && (
          <Leaderboard
            gameId={GAME_ID}
            limit={10}
            entryId={submittedEntryId ?? undefined}
            colors={LEADERBOARD_COLORS}
            onClose={() => setGameState('gameover')}
            groupsEnabled={true}
            gameUrl={GAME_URL}
            socialLoaded={socialLoaded}
          />
        )}

        {/* --- SHARE MODAL --- */}
        {showShareModal && user && (
          <ShareModal
            gameUrl={GAME_URL}
            score={score}
            colors={LEADERBOARD_COLORS}
            onClose={() => setShowShareModal(false)}
          />
        )}
      </div>
    </>
  );
}
