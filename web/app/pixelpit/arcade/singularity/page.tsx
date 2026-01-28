'use client';

import React, { useEffect, useRef, useState } from 'react';
import Script from 'next/script';
import {
  ScoreFlow,
  Leaderboard,
  ShareButtonContainer,
  usePixelpitSocial,
  type ScoreFlowColors,
  type LeaderboardColors,
} from '@/app/pixelpit/components';

// VOID PROTOCOL theme - pure black, blood orange accent
const THEME = {
  bg: '#000000',
  surface: '#0a0a0a',
  accent: '#ff4d00',      // blood orange
  accentGlow: '#ff6a00',
  accentDark: '#331100',
  text: '#ff4d00',
  textMuted: '#662200',
  grid: '#1a0800',
};

const SCORE_FLOW_COLORS: ScoreFlowColors = {
  bg: THEME.bg,
  surface: THEME.surface,
  primary: THEME.accent,
  secondary: THEME.accent,
  text: THEME.accent,
  muted: THEME.textMuted,
  error: '#ff0000',
};

const LEADERBOARD_COLORS: LeaderboardColors = {
  bg: THEME.bg,
  surface: THEME.surface,
  primary: THEME.accent,
  secondary: THEME.accent,
  text: THEME.accent,
  muted: THEME.textMuted,
};

interface Particle {
  x: number;
  y: number;
  speed: number;
  size: number;
}

export default function SingularityGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<'start' | 'playing' | 'gameover' | 'leaderboard'>('start');
  const [score, setScore] = useState(0);
  const [breach, setBreach] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [socialLoaded, setSocialLoaded] = useState(false);
  const [submittedEntryId, setSubmittedEntryId] = useState<number | null>(null);

  const { user } = usePixelpitSocial(socialLoaded);

  const gameRef = useRef({
    running: false,
    score: 0,
    breach: 0,
    frame: 0,
    spawnRate: 60,
    paddle: { x: 200, w: 80, h: 8 },
    particles: [] as Particle[],
    audioCtx: null as AudioContext | null,
    masterGain: null as GainNode | null,
    musicPlaying: false,
    musicInterval: null as NodeJS.Timeout | null,
    musicStep: 0,
  });

  const GAME_ID = 'singularity';
  const W = 400;
  const H = 600;

  // Audio
  const initAudio = () => {
    const game = gameRef.current;
    if (game.audioCtx) return;
    game.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    game.masterGain = game.audioCtx.createGain();
    game.masterGain.connect(game.audioCtx.destination);
    game.masterGain.gain.value = soundEnabled ? 0.3 : 0;
  };

  // Techno music engine - dark industrial 4/4 beat
  const MUSIC = {
    bpm: 130,
    kick: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
    hat:  [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0],
    bass: [55, 0, 55, 0, 0, 0, 55, 0, 44, 0, 0, 0, 55, 0, 0, 0],
  };

  const playKick = () => {
    const game = gameRef.current;
    if (!game.audioCtx || !game.masterGain) return;
    const osc = game.audioCtx.createOscillator();
    const gain = game.audioCtx.createGain();
    osc.connect(gain);
    gain.connect(game.masterGain);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, game.audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40, game.audioCtx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.4, game.audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, game.audioCtx.currentTime + 0.2);
    osc.start();
    osc.stop(game.audioCtx.currentTime + 0.2);
  };

  const playHat = () => {
    const game = gameRef.current;
    if (!game.audioCtx || !game.masterGain) return;
    const bufferSize = game.audioCtx.sampleRate * 0.05;
    const buffer = game.audioCtx.createBuffer(1, bufferSize, game.audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const noise = game.audioCtx.createBufferSource();
    noise.buffer = buffer;
    const hpFilter = game.audioCtx.createBiquadFilter();
    hpFilter.type = 'highpass';
    hpFilter.frequency.value = 8000;
    const gain = game.audioCtx.createGain();
    gain.gain.setValueAtTime(0.08, game.audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, game.audioCtx.currentTime + 0.05);
    noise.connect(hpFilter);
    hpFilter.connect(gain);
    gain.connect(game.masterGain);
    noise.start();
  };

  const playBass = (freq: number) => {
    const game = gameRef.current;
    if (!game.audioCtx || !game.masterGain || freq === 0) return;
    const osc = game.audioCtx.createOscillator();
    const filter = game.audioCtx.createBiquadFilter();
    const gain = game.audioCtx.createGain();
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(game.masterGain);
    osc.type = 'sawtooth';
    osc.frequency.value = freq;
    filter.type = 'lowpass';
    filter.frequency.value = 300;
    gain.gain.setValueAtTime(0.2, game.audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, game.audioCtx.currentTime + 0.12);
    osc.start();
    osc.stop(game.audioCtx.currentTime + 0.15);
  };

  const musicTick = () => {
    const game = gameRef.current;
    if (!game.audioCtx || !game.musicPlaying || !soundEnabled) return;
    const step = game.musicStep % 16;
    if (MUSIC.kick[step]) playKick();
    if (MUSIC.hat[step]) playHat();
    if (MUSIC.bass[step]) playBass(MUSIC.bass[step]);
    game.musicStep++;
  };

  const startMusic = () => {
    const game = gameRef.current;
    if (game.musicPlaying) return;
    game.musicPlaying = true;
    game.musicStep = 0;
    const stepTime = (60 / MUSIC.bpm) * 1000 / 4;
    game.musicInterval = setInterval(musicTick, stepTime);
  };

  const stopMusic = () => {
    const game = gameRef.current;
    game.musicPlaying = false;
    if (game.musicInterval) {
      clearInterval(game.musicInterval);
      game.musicInterval = null;
    }
  };

  const playSound = (freq: number, duration: number, type: OscillatorType = 'sine') => {
    const game = gameRef.current;
    if (!game.audioCtx || !soundEnabled || !game.masterGain) return;
    const osc = game.audioCtx.createOscillator();
    const gain = game.audioCtx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.1, game.audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, game.audioCtx.currentTime + duration);
    osc.connect(gain);
    gain.connect(game.masterGain);
    osc.start();
    osc.stop(game.audioCtx.currentTime + duration);
  };

  const catchSound = () => playSound(880, 0.05, 'square');
  const breachSound = () => playSound(110, 0.3, 'sawtooth');
  const failSound = () => {
    playSound(80, 0.5, 'sawtooth');
    playSound(60, 0.6, 'square');
  };

  const spawn = () => {
    const game = gameRef.current;
    const cols = Math.min(3 + Math.floor(game.score / 10), 7);
    for (let i = 0; i < cols; i++) {
      game.particles.push({
        x: 40 + i * (W - 80) / (cols - 1 || 1) + Math.random() * 20 - 10,
        y: -20,
        speed: 2 + Math.random() * 2 + game.score * 0.02,
        size: 6 + Math.random() * 4,
      });
    }
  };

  const startGame = () => {
    initAudio();
    const game = gameRef.current;
    game.running = true;
    game.score = 0;
    game.breach = 0;
    game.frame = 0;
    game.particles = [];
    game.paddle.x = W / 2;
    setScore(0);
    setBreach(0);
    setSubmittedEntryId(null);
    setGameState('playing');
    startMusic();
  };

  const gameOver = () => {
    const game = gameRef.current;
    game.running = false;
    stopMusic();
    failSound();

    // Track play
    if (game.score >= 1) {
      fetch('/api/pixelpit/stats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ game: GAME_ID }),
      }).catch(() => {});
    }

    setScore(game.score);
    setTimeout(() => setGameState('gameover'), 400);
  };

  // Game loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = W;
    canvas.height = H;

    let animationId: number;

    const update = () => {
      const game = gameRef.current;
      if (!game.running) return;

      game.frame++;
      if (game.frame % Math.max(20, game.spawnRate - game.score) === 0) {
        spawn();
      }

      for (let i = game.particles.length - 1; i >= 0; i--) {
        const p = game.particles[i];
        p.y += p.speed;

        // Caught by paddle
        if (p.y > H - 30 && p.y < H - 10 &&
            Math.abs(p.x - game.paddle.x) < game.paddle.w / 2 + p.size / 2) {
          game.particles.splice(i, 1);
          game.score++;
          setScore(game.score);
          catchSound();
        }
        // Missed - breach
        else if (p.y > H) {
          game.particles.splice(i, 1);
          game.breach++;
          setBreach(game.breach);
          breachSound();
          if (game.breach >= 5) {
            gameOver();
          }
        }
      }
    };

    const draw = () => {
      const game = gameRef.current;

      // Background
      ctx.fillStyle = THEME.bg;
      ctx.fillRect(0, 0, W, H);

      // Singularity gradient
      const gradient = ctx.createRadialGradient(W / 2, 0, 0, W / 2, 0, 150);
      gradient.addColorStop(0, THEME.accent);
      gradient.addColorStop(0.3, THEME.accentDark);
      gradient.addColorStop(1, THEME.bg);
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(W / 2, -50, 150, 0, Math.PI * 2);
      ctx.fill();

      // Grid lines
      ctx.strokeStyle = THEME.grid;
      ctx.lineWidth = 1;
      for (let i = 0; i < W; i += 40) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, H);
        ctx.stroke();
      }
      for (let i = 0; i < H; i += 40) {
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(W, i);
        ctx.stroke();
      }

      // Particles
      game.particles.forEach(p => {
        ctx.fillStyle = THEME.accent;
        ctx.shadowColor = THEME.accent;
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      // Paddle / Containment beam
      ctx.fillStyle = THEME.accent;
      ctx.shadowColor = THEME.accent;
      ctx.shadowBlur = 20;
      ctx.fillRect(game.paddle.x - game.paddle.w / 2, H - 25, game.paddle.w, game.paddle.h);
      ctx.shadowBlur = 0;

      // Scanlines
      ctx.fillStyle = 'rgba(0,0,0,0.1)';
      for (let i = 0; i < H; i += 4) {
        ctx.fillRect(0, i, W, 2);
      }

      // Glitch effect
      if (Math.random() < 0.02) {
        const y = Math.random() * H;
        const h = 5 + Math.random() * 10;
        ctx.drawImage(canvas, 0, y, W, h, Math.random() * 10 - 5, y, W, h);
      }
    };

    const loop = () => {
      update();
      draw();
      animationId = requestAnimationFrame(loop);
    };

    loop();

    // Input handlers
    const move = (x: number) => {
      const rect = canvas.getBoundingClientRect();
      const relX = (x - rect.left) * (W / rect.width);
      gameRef.current.paddle.x = Math.max(
        gameRef.current.paddle.w / 2,
        Math.min(W - gameRef.current.paddle.w / 2, relX)
      );
    };

    const handleMouse = (e: MouseEvent) => move(e.clientX);
    const handleTouch = (e: TouchEvent) => {
      e.preventDefault();
      move(e.touches[0].clientX);
    };

    canvas.addEventListener('mousemove', handleMouse);
    canvas.addEventListener('touchmove', handleTouch, { passive: false });

    return () => {
      cancelAnimationFrame(animationId);
      canvas.removeEventListener('mousemove', handleMouse);
      canvas.removeEventListener('touchmove', handleTouch);
      stopMusic();
    };
  }, [soundEnabled]);

  return (
    <>
      <Script
        src="/pixelpit/social.js"
        onLoad={() => setSocialLoaded(true)}
      />

      <style jsx global>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          background: ${THEME.bg};
          color: ${THEME.accent};
          font-family: 'Courier New', monospace;
          overflow: hidden;
          touch-action: none;
          user-select: none;
        }
        @keyframes flicker {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.8; }
        }
        @keyframes pulse {
          0%, 100% { text-shadow: 0 0 20px ${THEME.accent}; }
          50% { text-shadow: 0 0 40px ${THEME.accent}, 0 0 60px ${THEME.accentDark}; }
        }
        button {
          transition: all 0.1s;
        }
        button:hover {
          filter: brightness(1.2);
        }
        button:active {
          transform: scale(0.98);
        }
      `}</style>

      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        background: THEME.bg,
      }}>
        <canvas
          ref={canvasRef}
          style={{
            display: gameState === 'playing' ? 'block' : 'none',
            border: `2px solid ${THEME.accent}`,
            borderRadius: 8,
            boxShadow: `0 0 40px ${THEME.accentDark}`,
            maxWidth: '100vw',
            maxHeight: '100vh',
          }}
        />

        {/* Sound Toggle */}
        <button
          onClick={() => {
            initAudio();
            setSoundEnabled(!soundEnabled);
            if (gameRef.current.masterGain) {
              gameRef.current.masterGain.gain.value = soundEnabled ? 0 : 0.3;
            }
          }}
          style={{
            position: 'fixed',
            top: 20,
            right: 20,
            zIndex: 150,
            background: 'transparent',
            border: `1px solid ${THEME.accent}40`,
            borderRadius: 4,
            padding: '8px 12px',
            color: THEME.accent,
            fontSize: 14,
            cursor: 'pointer',
            opacity: soundEnabled ? 0.8 : 0.4,
          }}
        >
          {soundEnabled ? '♪' : '♪̶'}
        </button>

        {/* HUD during gameplay */}
        {gameState === 'playing' && (
          <div style={{
            position: 'fixed',
            top: 20,
            left: 20,
            zIndex: 10,
            fontFamily: "'Courier New', monospace",
            fontSize: 12,
            textTransform: 'uppercase',
            letterSpacing: 2,
            color: THEME.accent,
          }}>
            BREACH: <span style={{ color: breach >= 4 ? '#ff0000' : THEME.accent }}>{breach}</span>/5 | CONTAINED: {score}
          </div>
        )}

        {/* Start Screen */}
        {gameState === 'start' && (
          <div style={{
            position: 'fixed',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: THEME.bg,
            zIndex: 100,
          }}>
            <h1 style={{
              fontSize: 28,
              fontWeight: 'normal',
              letterSpacing: 8,
              marginBottom: 20,
              animation: 'pulse 2s infinite',
            }}>
              SINGULARITY
            </h1>
            <p style={{
              fontSize: 10,
              letterSpacing: 4,
              color: THEME.textMuted,
              marginBottom: 10,
            }}>
              PROTOCOL
            </p>
            <p style={{
              fontSize: 11,
              color: THEME.textMuted,
              marginBottom: 40,
              textAlign: 'center',
              lineHeight: 2,
            }}>
              contain the breach<br />
              ← drag →
            </p>
            <button
              onClick={startGame}
              style={{
                background: THEME.accent,
                color: THEME.bg,
                border: 'none',
                padding: '14px 40px',
                fontSize: 12,
                letterSpacing: 4,
                cursor: 'pointer',
                textTransform: 'uppercase',
              }}
            >
              initialize
            </button>
            <div style={{
              marginTop: 50,
              fontSize: 10,
              letterSpacing: 3,
              opacity: 0.5,
            }}>
              <span style={{ color: THEME.accent }}>pixel</span>
              <span style={{ color: THEME.textMuted }}>pit</span>
            </div>
          </div>
        )}

        {/* Game Over Screen */}
        {gameState === 'gameover' && (
          <div style={{
            position: 'fixed',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: THEME.bg,
            zIndex: 100,
            padding: 40,
          }}>
            <h1 style={{
              fontSize: 20,
              letterSpacing: 6,
              marginBottom: 10,
              animation: 'flicker 0.1s infinite',
            }}>
              CONTAINMENT FAILURE
            </h1>
            <div style={{
              fontSize: 72,
              fontWeight: 'bold',
              marginBottom: 30,
              textShadow: `0 0 40px ${THEME.accent}`,
            }}>
              {score}
            </div>

            <ScoreFlow
              score={score}
              gameId={GAME_ID}
              colors={SCORE_FLOW_COLORS}
              onRankReceived={(rank, entryId) => {
                setSubmittedEntryId(entryId ?? null);
              }}
            />

            <div style={{ display: 'flex', flexDirection: 'column', gap: 15, marginTop: 20 }}>
              <button
                onClick={startGame}
                style={{
                  background: THEME.accent,
                  color: THEME.bg,
                  border: 'none',
                  padding: '14px 40px',
                  fontSize: 12,
                  letterSpacing: 4,
                  cursor: 'pointer',
                  textTransform: 'uppercase',
                }}
              >
                reinitialize
              </button>
              <button
                onClick={() => setGameState('leaderboard')}
                style={{
                  background: 'transparent',
                  border: `1px solid ${THEME.accent}40`,
                  color: THEME.textMuted,
                  padding: '12px 30px',
                  fontSize: 10,
                  letterSpacing: 3,
                  cursor: 'pointer',
                  textTransform: 'uppercase',
                }}
              >
                breach log
              </button>
            </div>

            <ShareButtonContainer
              id="share-singularity"
              url={typeof window !== 'undefined' ? `${window.location.origin}/pixelpit/arcade/singularity/share/${score}` : ''}
              text={`I contained ${score} particles in SINGULARITY! Can you beat me?`}
              style="minimal"
              socialLoaded={socialLoaded}
            />
          </div>
        )}

        {/* Leaderboard Screen */}
        {gameState === 'leaderboard' && (
          <Leaderboard
            gameId={GAME_ID}
            limit={8}
            entryId={submittedEntryId ?? undefined}
            colors={LEADERBOARD_COLORS}
            onClose={() => setGameState('gameover')}
          />
        )}
      </div>
    </>
  );
}
