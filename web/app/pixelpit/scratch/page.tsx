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
import { Press_Start_2P } from 'next/font/google';

const pressStart = Press_Start_2P({
  weight: '400',
  subsets: ['latin'],
});

// Pixelpit Neon Playroom theme
const COLORS = {
  bg: '#0f172a',          // Dark background
  surface: '#1e293b',     // Card surface
  pink: '#ec4899',        // Hot pink primary
  cyan: '#22d3ee',        // Electric cyan secondary
  yellow: '#fbbf24',      // Amber yellow energy
  green: '#34d399',       // Emerald success
  purple: '#a78bfa',      // Violet special
  text: '#f8fafc',        // Light text
  muted: '#94a3b8',       // Muted text
};

// Color mappings for components
const SCORE_FLOW_COLORS: ScoreFlowColors = {
  bg: COLORS.bg,
  surface: COLORS.surface,
  primary: COLORS.yellow,
  secondary: COLORS.pink,
  text: COLORS.text,
  muted: COLORS.muted,
  error: '#f87171',
};

const LEADERBOARD_COLORS: LeaderboardColors = {
  bg: COLORS.bg,
  surface: COLORS.surface,
  primary: COLORS.yellow,
  secondary: COLORS.pink,
  text: COLORS.text,
  muted: COLORS.muted,
};

// Particle for visual effects
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

// Star breathing parameters
interface StarState {
  x: number;
  y: number;
  baseSize: number;
  breathPhase: number;
  breathSpeed: number;
  pulseIntensity: number;
}

export default function StarGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<'start' | 'playing' | 'gameover' | 'leaderboard'>('start');
  const [score, setScore] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [socialLoaded, setSocialLoaded] = useState(false);
  const [submittedEntryId, setSubmittedEntryId] = useState<number | null>(null);

  // Use the social hook for user state
  const { user } = usePixelpitSocial(socialLoaded);

  // Game refs
  const gameRef = useRef({
    running: false,
    score: 0,
    star: {
      x: 0,
      y: 0,
      baseSize: 80,
      breathPhase: 0,
      breathSpeed: 0.02, // Slow breathing
      pulseIntensity: 0.3,
    } as StarState,
    particles: [] as Particle[],
    frameCount: 0,
    lastClick: 0,
    breathDirection: 1, // For breath rhythm changes
    audioCtx: null as AudioContext | null,
    masterGain: null as GainNode | null,
  });

  const GAME_ID = 'scratch';

  // Audio functions
  const initAudio = () => {
    const game = gameRef.current;
    if (game.audioCtx) return;
    game.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    game.masterGain = game.audioCtx.createGain();
    game.masterGain.connect(game.audioCtx.destination);
    game.masterGain.gain.value = soundEnabled ? 1 : 0;
  };

  const playSound = (freq: number, duration: number, type: OscillatorType = 'sine', volume = 0.1) => {
    const game = gameRef.current;
    if (!game.audioCtx || !soundEnabled || !game.masterGain) return;
    const osc = game.audioCtx.createOscillator();
    const gain = game.audioCtx.createGain();
    osc.connect(gain);
    gain.connect(game.masterGain);
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(volume, game.audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, game.audioCtx.currentTime + duration);
    osc.start();
    osc.stop(game.audioCtx.currentTime + duration);
  };

  // Soft click sound
  const clickSound = () => {
    playSound(800, 0.1, 'sine', 0.05);
    setTimeout(() => playSound(1200, 0.08, 'sine', 0.03), 50);
  };

  // Game logic
  const startGame = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const game = gameRef.current;
    game.star.x = canvas.width / 2;
    game.star.y = canvas.height / 2;
    game.star.breathPhase = 0;
    game.star.breathSpeed = 0.02;
    game.particles = [];
    game.score = 0;
    game.frameCount = 0;
    game.lastClick = 0;
    game.breathDirection = 1;
    game.running = true;

    setScore(0);
    setGameState('playing');
    initAudio();
  };

  const handleStarClick = (x: number, y: number) => {
    const game = gameRef.current;
    if (!game.running) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const star = game.star;
    const breathMultiplier = 1 + Math.sin(star.breathPhase) * star.pulseIntensity;
    const currentSize = star.baseSize * breathMultiplier;

    // Check if click is within star bounds (using distance from center)
    const dx = x - star.x;
    const dy = y - star.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance <= currentSize / 2) {
      // Successful click!
      game.score++;
      setScore(game.score);
      game.lastClick = Date.now();

      clickSound();

      // Create celebratory particles
      for (let i = 0; i < 12; i++) {
        const angle = (Math.PI * 2 * i) / 12;
        const speed = 3 + Math.random() * 4;
        game.particles.push({
          x: star.x,
          y: star.y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 30 + Math.random() * 20,
          maxLife: 50,
          color: COLORS.yellow,
          size: 2 + Math.random() * 3,
        });
      }

      // Increase breathing speed slightly with each click
      star.breathSpeed = Math.min(0.05, 0.02 + game.score * 0.001);

      // Change breath direction occasionally for variation
      if (Math.random() < 0.1) {
        game.breathDirection *= -1;
      }
    }
  };

  // Game loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      // Update star position to stay centered
      if (gameRef.current.star) {
        gameRef.current.star.x = canvas.width / 2;
        gameRef.current.star.y = canvas.height / 2;
      }
    };
    resize();
    window.addEventListener('resize', resize);

    let animationId: number;

    const update = () => {
      const game = gameRef.current;
      if (!game.running) return;

      game.frameCount++;

      // Update star breathing with direction changes
      game.star.breathPhase += game.star.breathSpeed * game.breathDirection;

      // Update particles
      game.particles = game.particles.filter(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.98; // Slight friction
        p.vy *= 0.98;
        p.life--;
        return p.life > 0;
      });

      // Game over condition - no clicks for too long
      if (game.score > 0 && Date.now() - game.lastClick > 10000) {
        gameOver();
      }
    };

    const draw = () => {
      const game = gameRef.current;

      // Background
      ctx.fillStyle = COLORS.bg;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Subtle grid pattern
      ctx.strokeStyle = `${COLORS.pink}08`;
      ctx.lineWidth = 1;
      const gridSize = 64;
      for (let x = 0; x < canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      // Draw particles
      game.particles.forEach(p => {
        const alpha = p.life / p.maxLife;
        ctx.fillStyle = p.color + Math.floor(alpha * 255).toString(16).padStart(2, '0');
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
        ctx.fill();
      });

      // Draw the star
      const star = game.star;
      const breathMultiplier = 1 + Math.sin(star.breathPhase) * star.pulseIntensity;
      const currentSize = star.baseSize * breathMultiplier;

      // Star glow
      ctx.shadowBlur = 40 + Math.sin(star.breathPhase) * 20;
      ctx.shadowColor = COLORS.yellow;

      // Draw 5-pointed star
      ctx.fillStyle = COLORS.yellow;
      ctx.beginPath();

      const spikes = 5;
      const step = Math.PI / spikes;
      const innerRadius = currentSize * 0.4;
      const outerRadius = currentSize * 0.5;

      for (let i = 0; i <= spikes * 2; i++) {
        const radius = i % 2 === 0 ? outerRadius : innerRadius;
        const angle = i * step - Math.PI / 2;
        const x = star.x + Math.cos(angle) * radius;
        const y = star.y + Math.sin(angle) * radius;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }

      ctx.closePath();
      ctx.fill();

      // Inner glow
      ctx.fillStyle = `${COLORS.text}40`;
      ctx.beginPath();
      for (let i = 0; i <= spikes * 2; i++) {
        const radius = (i % 2 === 0 ? outerRadius : innerRadius) * 0.6;
        const angle = i * step - Math.PI / 2;
        const x = star.x + Math.cos(angle) * radius;
        const y = star.y + Math.sin(angle) * radius;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.closePath();
      ctx.fill();

      ctx.shadowBlur = 0;
    };

    const gameLoop = () => {
      update();
      draw();
      animationId = requestAnimationFrame(gameLoop);
    };

    gameLoop();

    // Input handlers
    const handleTouch = (e: TouchEvent) => {
      e.preventDefault();
      const touch = e.touches[0];
      handleStarClick(touch.clientX, touch.clientY);
    };

    const handleMouse = (e: MouseEvent) => {
      handleStarClick(e.clientX, e.clientY);
    };

    canvas.addEventListener('touchstart', handleTouch);
    canvas.addEventListener('mousedown', handleMouse);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('touchstart', handleTouch);
      canvas.removeEventListener('mousedown', handleMouse);
    };
  }, []);

  const gameOver = () => {
    const game = gameRef.current;
    game.running = false;

    // Track play for analytics
    if (game.score >= 1) {
      fetch('/api/pixelpit/stats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ game: GAME_ID }),
      }).catch(() => {});
    }

    setScore(game.score);
    setSubmittedEntryId(null);
    setTimeout(() => setGameState('gameover'), 1000);
  };

  return (
    <>
      <Script
        src="/pixelpit/social.js"
        onLoad={() => setSocialLoaded(true)}
      />

      <style jsx global>{`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          background: ${COLORS.bg};
          color: ${COLORS.text};
          overflow: hidden;
          touch-action: none;
          user-select: none;
        }

        button {
          transition: all 0.2s ease;
          border: 2px solid #000;
          font-family: ${pressStart.style.fontFamily};
          text-transform: uppercase;
          letter-spacing: 2px;
          cursor: pointer;
          box-shadow: 4px 4px 0px 0px rgba(0,0,0,0.8);
        }

        button:hover {
          transform: translate(-1px, -1px);
          box-shadow: 5px 5px 0px 0px rgba(0,0,0,0.8);
        }

        button:active {
          transform: translate(2px, 2px);
          box-shadow: 2px 2px 0px 0px rgba(0,0,0,0.8);
        }
      `}</style>

      <canvas
        ref={canvasRef}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          cursor: gameState === 'playing' ? 'pointer' : 'default'
        }}
      />

      {/* Sound Toggle */}
      <button
        onClick={() => {
          initAudio();
          setSoundEnabled(!soundEnabled);
          if (gameRef.current.masterGain) {
            gameRef.current.masterGain.gain.value = soundEnabled ? 0 : 1;
          }
        }}
        style={{
          position: 'fixed',
          top: 20,
          right: 20,
          zIndex: 150,
          background: soundEnabled ? COLORS.yellow : COLORS.surface,
          color: soundEnabled ? '#000' : COLORS.muted,
          padding: '8px 12px',
          fontSize: 12,
          opacity: soundEnabled ? 1 : 0.6,
        }}
      >
        {soundEnabled ? '♪' : '♪̶'}
      </button>

      {/* Score UI */}
      {gameState === 'playing' && (
        <div style={{
          position: 'fixed',
          top: 30,
          left: 0,
          right: 0,
          textAlign: 'center',
          zIndex: 10,
          pointerEvents: 'none',
          fontFamily: pressStart.style.fontFamily,
        }}>
          <div style={{
            fontSize: 24,
            color: COLORS.yellow,
            textShadow: `4px 4px 0px rgba(0,0,0,0.8), 0 0 20px ${COLORS.yellow}80`,
            letterSpacing: 4,
          }}>
            {String(score).padStart(6, '0')}
          </div>
          <div style={{
            fontSize: 8,
            color: COLORS.pink,
            marginTop: 8,
            letterSpacing: 3,
          }}>
            CLICK THE STAR
          </div>
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
          background: COLORS.bg,
          zIndex: 100,
          textAlign: 'center',
          padding: 40,
        }}>
          <div style={{
            background: COLORS.surface,
            border: `2px solid ${COLORS.yellow}`,
            padding: '40px 50px',
            boxShadow: '4px 4px 0px 0px rgba(0,0,0,0.8)',
            fontFamily: pressStart.style.fontFamily,
          }}>
            <h1 style={{
              fontSize: 32,
              color: COLORS.yellow,
              marginBottom: 20,
              letterSpacing: 4,
              textShadow: '4px 4px 0px rgba(0,0,0,0.8)',
            }}>
              STAR
            </h1>
            <p style={{
              fontSize: 10,
              color: COLORS.pink,
              marginBottom: 30,
              lineHeight: 1.6,
              letterSpacing: 2,
            }}>
              A PULSING YELLOW STAR<br />
              THAT BREATHES SLOWLY<br />
              <br />
              CLICK TO SCORE<br />
              DON'T STOP CLICKING
            </p>
            <button
              onClick={startGame}
              style={{
                background: COLORS.yellow,
                color: '#000',
                padding: '12px 30px',
                fontSize: 12,
                letterSpacing: 2,
              }}
            >
              START
            </button>
          </div>

          <div style={{
            marginTop: 30,
            fontSize: 8,
            fontFamily: pressStart.style.fontFamily,
            letterSpacing: 2,
            color: COLORS.muted,
          }}>
            <span style={{ color: COLORS.pink }}>PIXEL</span>
            <span style={{ color: COLORS.cyan }}>PIT</span>
            <span> CREATURE</span>
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
          background: COLORS.bg,
          zIndex: 100,
          textAlign: 'center',
          padding: 40,
          fontFamily: pressStart.style.fontFamily,
        }}>
          <h1 style={{
            fontSize: 16,
            color: COLORS.pink,
            marginBottom: 20,
            letterSpacing: 4,
          }}>
            STAR STOPPED
          </h1>
          <div style={{
            fontSize: 32,
            color: COLORS.yellow,
            marginBottom: 30,
            textShadow: '4px 4px 0px rgba(0,0,0,0.8)',
            letterSpacing: 4,
          }}>
            {String(score).padStart(6, '0')}
          </div>

          {/* Score Submission */}
          <ScoreFlow
            score={score}
            gameId={GAME_ID}
            colors={SCORE_FLOW_COLORS}
            onRankReceived={(rank, entryId) => {
              setSubmittedEntryId(entryId ?? null);
            }}
          />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 15, alignItems: 'center' }}>
            <button
              onClick={startGame}
              style={{
                background: COLORS.yellow,
                color: '#000',
                padding: '12px 30px',
                fontSize: 12,
                letterSpacing: 2,
              }}
            >
              AGAIN
            </button>
            <button
              onClick={() => setGameState('leaderboard')}
              style={{
                background: 'transparent',
                border: `2px solid ${COLORS.surface}`,
                color: COLORS.muted,
                padding: '12px 30px',
                fontSize: 10,
                letterSpacing: 2,
                boxShadow: '4px 4px 0px 0px rgba(0,0,0,0.4)',
              }}
            >
              SCORES
            </button>
            <ShareButtonContainer
              id="share-btn-container"
              url={typeof window !== 'undefined' ? `${window.location.origin}/pixelpit/scratch/share/${score}` : ''}
              text={`I scored ${score} clicks on the breathing star! Can you do better?`}
              style="minimal"
              socialLoaded={socialLoaded}
            />
          </div>
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
    </>
  );
}