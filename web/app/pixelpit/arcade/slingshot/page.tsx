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

const GAME_ID = 'slingshot';
const GAME_NAME = 'SLINGSHOT';
const GAME_DURATION = 45;

const COLORS = {
  bg: '#0a0a0a',
  surface: '#1a1a1a',
  primary: '#FFD700',
  secondary: '#2D9596',
  text: '#f8fafc',
  muted: '#666666',
  error: '#ef4444',
  pink: '#ec4899',
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

// --- Audio helpers ---
let actx: AudioContext | null = null;
function initAudio() {
  if (!actx) actx = new (window.AudioContext || (window as any).webkitAudioContext)();
}
function playTone(f: number, d: number, v = 0.3, type: OscillatorType = 'sine') {
  if (!actx) return;
  const o = actx.createOscillator(), g = actx.createGain();
  o.type = type; o.frequency.value = f;
  g.gain.setValueAtTime(v, actx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + d);
  o.connect(g); g.connect(actx.destination);
  o.start(); o.stop(actx.currentTime + d);
}
function playHit(perfect: boolean) {
  if (!actx) return;
  if (perfect) { playTone(880, 0.15, 0.4); setTimeout(() => playTone(1320, 0.2, 0.3), 80); }
  else { playTone(660, 0.12, 0.3); }
}
function playMiss() { if (!actx) return; playTone(150, 0.3, 0.2, 'sawtooth'); }

// --- Game types ---
interface Ball { x: number; y: number; vx: number; vy: number; r: number; alive: boolean; trail: { x: number; y: number; a: number }[]; }
interface Target { x: number; y: number; r: number; pulse: number; hit: boolean; }
interface Particle { x: number; y: number; vx: number; vy: number; life: number; color: string; r: number; }

export default function SlingshotGame() {
  const [gameState, setGameState] = useState<'start' | 'playing' | 'gameover' | 'leaderboard'>('start');
  const [displayScore, setDisplayScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [socialLoaded, setSocialLoaded] = useState(false);
  const [submittedEntryId, setSubmittedEntryId] = useState<number | null>(null);
  const [progression, setProgression] = useState<ProgressionResult | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);

  const { user } = usePixelpitSocial(socialLoaded);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<{
    score: number; combo: number; charging: boolean; chargeStart: number; chargePct: number;
    touchX: number; touchY: number; ball: Ball | null; target: Target; particles: Particle[];
    chargeRing: { x: number; y: number; r: number }; W: number; H: number; running: boolean;
    timerInterval: ReturnType<typeof setInterval> | null; animFrame: number;
  }>({
    score: 0, combo: 0, charging: false, chargeStart: 0, chargePct: 0,
    touchX: 0, touchY: 0, ball: null,
    target: { x: 0, y: 0, r: 30, pulse: 0, hit: false },
    particles: [], chargeRing: { x: 0, y: 0, r: 0 }, W: 0, H: 0, running: false,
    timerInterval: null, animFrame: 0,
  });

  const GAME_URL = typeof window !== 'undefined'
    ? `${window.location.origin}/pixelpit/arcade/${GAME_ID}`
    : `https://pixelpit.gg/pixelpit/arcade/${GAME_ID}`;

  // --- Group code + logout ---
  useEffect(() => {
    if (!socialLoaded || typeof window === 'undefined') return;
    if (!window.PixelpitSocial) return;
    const params = new URLSearchParams(window.location.search);
    if (params.has('logout')) {
      window.PixelpitSocial.logout();
      params.delete('logout');
      window.history.replaceState({}, '', params.toString() ? `${window.location.pathname}?${params}` : window.location.pathname);
      window.location.reload();
      return;
    }
    const groupCode = window.PixelpitSocial.getGroupCodeFromUrl();
    if (groupCode) window.PixelpitSocial.storeGroupCode(groupCode);
  }, [socialLoaded]);

  // --- Game engine ---
  const endGame = useCallback(() => {
    const g = gameRef.current;
    g.running = false;
    if (g.timerInterval) { clearInterval(g.timerInterval); g.timerInterval = null; }
    if (g.animFrame) cancelAnimationFrame(g.animFrame);
    setDisplayScore(g.score);
    setTimeLeft(0);
    fetch('/api/pixelpit/stats', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ game: GAME_ID }),
    }).catch(() => {});
    setGameState('gameover');
  }, []);

  const startGame = useCallback(() => {
    const g = gameRef.current;
    g.score = 0; g.combo = 0; g.charging = false; g.ball = null; g.particles = [];
    g.running = true;
    setDisplayScore(0);
    setTimeLeft(GAME_DURATION);
    setSubmittedEntryId(null);
    setProgression(null);
    setShowShareModal(false);
    setGameState('playing');
  }, []);

  useEffect(() => {
    if (gameState !== 'playing') return;
    const g = gameRef.current;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;

    function resize() {
      const dpr = window.devicePixelRatio || 1;
      g.W = window.innerWidth; g.H = window.innerHeight;
      canvas!.width = g.W * dpr; canvas!.height = g.H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    window.addEventListener('resize', resize);

    function spawnTarget() {
      const margin = 60;
      g.target = {
        x: margin + Math.random() * (g.W - margin * 2),
        y: margin + Math.random() * (g.H * 0.5 - margin) + 40,
        r: 24 + Math.random() * 16, pulse: 0, hit: false,
      };
    }
    spawnTarget();

    function spawnParticles(x: number, y: number, color: string, count = 12) {
      for (let i = 0; i < count; i++) {
        const a = Math.random() * Math.PI * 2, sp = 2 + Math.random() * 4;
        g.particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 1, color, r: 2 + Math.random() * 3 });
      }
    }

    // Input handlers
    function onDown(e: TouchEvent | MouseEvent) {
      e.preventDefault(); initAudio();
      const t = 'touches' in e ? e.touches[0] : e;
      g.touchX = t.clientX; g.touchY = t.clientY;
      g.charging = true; g.chargeStart = performance.now(); g.chargePct = 0;
      g.chargeRing = { x: g.touchX, y: g.touchY, r: 0 };
    }
    function onUp(e: TouchEvent | MouseEvent) {
      e.preventDefault();
      if (!g.charging || !g.running) return;
      g.charging = false;
      const power = Math.min(g.chargePct, 1);
      const angle = Math.atan2(g.target.y - g.touchY, g.target.x - g.touchX);
      const speed = 8 + power * 18;
      g.ball = {
        x: g.touchX, y: g.touchY,
        vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        r: 8, alive: true, trail: [],
      };
      playTone(300 + power * 400, 0.15, 0.2);
    }
    canvas.addEventListener('touchstart', onDown, { passive: false });
    canvas.addEventListener('touchend', onUp, { passive: false });
    canvas.addEventListener('mousedown', onDown);
    canvas.addEventListener('mouseup', onUp);

    // Timer
    let timeRemaining = GAME_DURATION;
    g.timerInterval = setInterval(() => {
      timeRemaining--;
      setTimeLeft(timeRemaining);
      if (timeRemaining <= 0) endGame();
    }, 1000);

    // Game loop
    function update() {
      if (g.charging) {
        g.chargePct = Math.min((performance.now() - g.chargeStart) / 1000, 1);
        g.chargeRing.r = 20 + g.chargePct * 60;
      }

      if (g.ball && g.ball.alive) {
        g.ball.x += g.ball.vx;
        g.ball.y += g.ball.vy;
        g.ball.vy += 0.15;
        g.ball.trail.push({ x: g.ball.x, y: g.ball.y, a: 1 });
        if (g.ball.trail.length > 20) g.ball.trail.shift();
        g.ball.trail.forEach(t => t.a *= 0.92);

        if (!g.target.hit) {
          const dx = g.ball.x - g.target.x, dy = g.ball.y - g.target.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < g.target.r + g.ball.r) {
            g.target.hit = true;
            const perfect = dist < g.target.r * 0.4;
            const pts = perfect ? 50 : 20;
            g.combo++;
            g.score += pts * (1 + Math.floor(g.combo / 3));
            setDisplayScore(g.score);
            playHit(perfect);
            spawnParticles(g.target.x, g.target.y, perfect ? '#FFD700' : '#2D9596', perfect ? 24 : 12);
            if (perfect) spawnParticles(g.target.x, g.target.y, '#ec4899', 8);
            g.ball.alive = false;
            setTimeout(spawnTarget, 400);
          }
        }

        if (g.ball.y > g.H + 50 || g.ball.x < -50 || g.ball.x > g.W + 50) {
          g.ball.alive = false;
          g.combo = 0;
          playMiss();
          spawnParticles(g.ball.x, Math.min(g.ball.y, g.H - 10), '#444', 6);
        }
      }

      g.particles.forEach(p => { p.x += p.vx; p.y += p.vy; p.vy += 0.1; p.vx *= 0.98; p.life -= 0.025; });
      g.particles = g.particles.filter(p => p.life > 0);
      if (!g.target.hit) g.target.pulse = (g.target.pulse + 0.03) % 1;
    }

    function draw() {
      ctx.clearRect(0, 0, g.W, g.H);

      // Grid dots
      ctx.fillStyle = '#1a1a1a';
      for (let gx = 40; gx < g.W; gx += 40)
        for (let gy = 40; gy < g.H; gy += 40)
          ctx.fillRect(gx, gy, 1, 1);

      // Target
      if (!g.target.hit) {
        const p = Math.sin(g.target.pulse * Math.PI * 2) * 0.3 + 0.7;
        ctx.beginPath(); ctx.arc(g.target.x, g.target.y, g.target.r + 4, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(45,149,150,${p * 0.5})`; ctx.lineWidth = 2; ctx.stroke();
        ctx.beginPath(); ctx.arc(g.target.x, g.target.y, g.target.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(45,149,150,${p * 0.15})`; ctx.fill();
        ctx.strokeStyle = `rgba(255,215,0,${p})`; ctx.lineWidth = 2; ctx.stroke();
        ctx.beginPath(); ctx.arc(g.target.x, g.target.y, g.target.r * 0.35, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(236,72,153,${p * 0.6})`; ctx.fill();
      }

      // Charge ring
      if (g.charging) {
        const p = g.chargePct;
        ctx.beginPath(); ctx.arc(g.chargeRing.x, g.chargeRing.y, g.chargeRing.r, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255,215,0,${0.3 + p * 0.5})`; ctx.lineWidth = 3; ctx.stroke();
        ctx.beginPath(); ctx.arc(g.chargeRing.x, g.chargeRing.y, g.chargeRing.r, -Math.PI / 2, -Math.PI / 2 + p * Math.PI * 2);
        ctx.strokeStyle = p > 0.8 ? '#ec4899' : '#FFD700'; ctx.lineWidth = 4; ctx.stroke();
        if (!g.target.hit) {
          ctx.beginPath(); ctx.moveTo(g.chargeRing.x, g.chargeRing.y);
          ctx.lineTo(g.chargeRing.x + (g.target.x - g.chargeRing.x) * 0.3, g.chargeRing.y + (g.target.y - g.chargeRing.y) * 0.3);
          ctx.strokeStyle = 'rgba(255,215,0,0.15)'; ctx.lineWidth = 1; ctx.setLineDash([4, 8]); ctx.stroke(); ctx.setLineDash([]);
        }
      }

      // Ball trail + ball
      if (g.ball) {
        g.ball.trail.forEach(t => {
          ctx.beginPath(); ctx.arc(t.x, t.y, 3 * t.a, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255,215,0,${t.a * 0.4})`; ctx.fill();
        });
        if (g.ball.alive) {
          ctx.beginPath(); ctx.arc(g.ball.x, g.ball.y, g.ball.r, 0, Math.PI * 2);
          ctx.fillStyle = '#FFD700'; ctx.fill();
          ctx.shadowColor = '#FFD700'; ctx.shadowBlur = 12; ctx.fill(); ctx.shadowBlur = 0;
        }
      }

      // Particles
      g.particles.forEach(p => {
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r * p.life, 0, Math.PI * 2);
        ctx.fillStyle = p.color; ctx.globalAlpha = p.life; ctx.fill(); ctx.globalAlpha = 1;
      });
    }

    function loop() {
      if (!g.running) return;
      update(); draw();
      g.animFrame = requestAnimationFrame(loop);
    }
    g.animFrame = requestAnimationFrame(loop);

    return () => {
      g.running = false;
      if (g.timerInterval) clearInterval(g.timerInterval);
      if (g.animFrame) cancelAnimationFrame(g.animFrame);
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('touchstart', onDown);
      canvas.removeEventListener('touchend', onUp);
      canvas.removeEventListener('mousedown', onDown);
      canvas.removeEventListener('mouseup', onUp);
    };
  }, [gameState, endGame]);

  return (
    <>
      <Script src="/pixelpit/social.js" onLoad={() => setSocialLoaded(true)} />
      <style jsx global>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { background: ${COLORS.bg}; font-family: 'Courier New', monospace; color: ${COLORS.text}; overflow: hidden; user-select: none; -webkit-user-select: none; touch-action: none; }
      `}</style>

      {/* --- START --- */}
      {gameState === 'start' && (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ fontSize: 56, fontWeight: 700, color: COLORS.primary, letterSpacing: 8, marginBottom: 12 }}>🎯</div>
          <h1 style={{ fontSize: 48, fontWeight: 700, color: COLORS.primary, letterSpacing: 6, marginBottom: 16, textShadow: '0 0 12px rgba(255,215,0,.5)' }}>
            {GAME_NAME}
          </h1>
          <p style={{ fontSize: 14, color: COLORS.muted, letterSpacing: 2, marginBottom: 8 }}>hold · charge · release</p>
          <p style={{ fontSize: 12, color: COLORS.secondary, letterSpacing: 2, marginBottom: 40 }}>{GAME_DURATION} seconds</p>
          <button onClick={startGame} style={{
            background: COLORS.primary, color: COLORS.bg, border: 'none', padding: '16px 50px',
            fontSize: 18, fontFamily: "'Courier New', monospace", fontWeight: 600, cursor: 'pointer',
            borderRadius: 8, letterSpacing: 2,
          }}>
            start
          </button>
          <div style={{ marginTop: 40, fontSize: 12, letterSpacing: 3 }}>
            <span style={{ color: COLORS.primary }}>pixel</span>
            <span style={{ color: COLORS.secondary }}>pit</span>
            <span style={{ color: COLORS.text, opacity: 0.6 }}> arcade</span>
          </div>
        </div>
      )}

      {/* --- PLAYING --- */}
      {gameState === 'playing' && (
        <>
          <div style={{
            position: 'fixed', top: 16, left: 0, right: 0, textAlign: 'center',
            pointerEvents: 'none', zIndex: 10,
          }}>
            <div style={{ fontSize: 28, fontWeight: 'bold', color: COLORS.primary, textShadow: '0 0 12px rgba(255,215,0,.5)' }}>
              {displayScore}
            </div>
            <div style={{ fontSize: 16, color: timeLeft <= 10 ? COLORS.error : COLORS.secondary, marginTop: 4, transition: 'color 0.3s' }}>
              {timeLeft}s
            </div>
          </div>
          <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />
        </>
      )}

      {/* --- GAME OVER --- */}
      {gameState === 'gameover' && (
        <div style={{
          minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', padding: 24,
        }}>
          <div style={{ textAlign: 'center', maxWidth: 400, width: '100%' }}>
            <div style={{ fontSize: 20, color: COLORS.muted, letterSpacing: 4, marginBottom: 12 }}>time&apos;s up</div>
            <div style={{ fontSize: 80, fontWeight: 200, color: COLORS.primary, marginBottom: 8, lineHeight: 1 }}>{displayScore}</div>
            <div style={{ fontSize: 12, color: COLORS.muted, letterSpacing: 2, marginBottom: 30 }}>points in {GAME_DURATION} seconds</div>

            {progression && (
              <div style={{ background: COLORS.surface, borderRadius: 12, padding: '16px 24px', marginBottom: 20, textAlign: 'center' }}>
                <div style={{ fontSize: 18, color: COLORS.primary, marginBottom: 8 }}>+{progression.xpEarned} XP</div>
                <div style={{ fontSize: 12, color: COLORS.muted }}>
                  Level {progression.level}{progression.streak > 1 ? ` • ${progression.multiplier}x streak` : ''}
                </div>
              </div>
            )}

            <ScoreFlow
              score={displayScore}
              gameId={GAME_ID}
              colors={SCORE_FLOW_COLORS}
              maxScore={2000}
              onRankReceived={(rank, entryId) => setSubmittedEntryId(entryId ?? null)}
              onProgression={(prog) => setProgression(prog)}
            />

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center', marginTop: 20, width: '100%' }}>
              <button onClick={startGame} style={{
                background: COLORS.primary, color: COLORS.bg, border: 'none', borderRadius: 8,
                padding: '14px 40px', fontSize: 15, fontFamily: "'Courier New', monospace",
                fontWeight: 600, cursor: 'pointer', letterSpacing: 2,
              }}>
                play again
              </button>
              <button onClick={() => setGameState('leaderboard')} style={{
                background: 'transparent', border: `1px solid ${COLORS.surface}`, borderRadius: 6,
                color: COLORS.muted, padding: '12px 30px', fontSize: 11,
                fontFamily: "'Courier New', monospace", cursor: 'pointer', letterSpacing: 2,
              }}>
                leaderboard
              </button>
              {user ? (
                <button onClick={() => setShowShareModal(true)} style={{
                  background: 'transparent', border: `1px solid ${COLORS.surface}`, borderRadius: 6,
                  color: COLORS.muted, padding: '12px 30px', fontSize: 11,
                  fontFamily: "'Courier New', monospace", cursor: 'pointer', letterSpacing: 2,
                }}>
                  share / groups
                </button>
              ) : (
                <ShareButtonContainer
                  id="share-btn-container"
                  url={typeof window !== 'undefined' ? `${window.location.origin}/pixelpit/arcade/${GAME_ID}/share/${displayScore}` : ''}
                  text={`I scored ${displayScore} on SLINGSHOT! Can you beat me? 🎯`}
                  style="minimal"
                  socialLoaded={socialLoaded}
                />
              )}
            </div>
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
          score={displayScore}
          colors={LEADERBOARD_COLORS}
          onClose={() => setShowShareModal(false)}
        />
      )}
    </>
  );
}
