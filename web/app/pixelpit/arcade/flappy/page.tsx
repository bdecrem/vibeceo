'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import Script from 'next/script';
import {
  ScoreFlow,
  Leaderboard,
  ShareButtonContainer,
  usePixelpitSocial,
  type ScoreFlowColors,
  type LeaderboardColors,
  type ProgressionResult,
} from '@/app/pixelpit/components';

// Flappy theme - sky blue, warm gold bird
const THEME = {
  sky: '#71c5cf',
  skyDark: '#4aa3bd',
  bird: '#f7dc6f',
  birdEye: '#fff',
  birdPupil: '#000',
  beak: '#e74c3c',
  pipe: '#73bf2e',
  pipeCap: '#5aa020',
  ground: '#ded895',
  groundDark: '#c9b77c',
};

// UI colors
const COLORS = {
  bg: '#0a0f1a',
  surface: '#141d2b',
  gold: '#f7dc6f',
  green: '#73bf2e',
  teal: '#2dd4bf',
  cream: '#f8fafc',
  muted: '#94a3b8',
  coral: '#f87171',
};

const SCORE_FLOW_COLORS: ScoreFlowColors = {
  bg: COLORS.bg,
  surface: COLORS.surface,
  primary: COLORS.gold,
  secondary: COLORS.green,
  text: COLORS.cream,
  muted: COLORS.muted,
  error: COLORS.coral,
};

const LEADERBOARD_COLORS: LeaderboardColors = {
  bg: COLORS.bg,
  surface: COLORS.surface,
  primary: COLORS.gold,
  secondary: COLORS.green,
  text: COLORS.cream,
  muted: COLORS.muted,
};

const GAME_ID = 'flappy';

// Audio context (initialized on first interaction)
let audioCtx: AudioContext | null = null;
let masterGain: GainNode | null = null;

function initAudio() {
  if (audioCtx) return;
  audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  masterGain = audioCtx.createGain();
  masterGain.gain.value = 0.3;
  masterGain.connect(audioCtx.destination);
  if (audioCtx.state === 'suspended') audioCtx.resume();
}

function playFlap() {
  if (!audioCtx || !masterGain) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(400, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(600, audioCtx.currentTime + 0.1);
  gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.1);
  osc.connect(gain);
  gain.connect(masterGain);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.1);
}

function playScore() {
  if (!audioCtx || !masterGain) return;
  // Happy ding
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sine';
  osc.frequency.value = 880;
  gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);
  osc.connect(gain);
  gain.connect(masterGain);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.15);
  // Second note
  setTimeout(() => {
    if (!audioCtx || !masterGain) return;
    const osc2 = audioCtx.createOscillator();
    const gain2 = audioCtx.createGain();
    osc2.type = 'sine';
    osc2.frequency.value = 1108;
    gain2.gain.setValueAtTime(0.15, audioCtx.currentTime);
    gain2.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.1);
    osc2.connect(gain2);
    gain2.connect(masterGain);
    osc2.start();
    osc2.stop(audioCtx.currentTime + 0.1);
  }, 80);
}

function playDeath() {
  if (!audioCtx || !masterGain) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(300, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(50, audioCtx.currentTime + 0.3);
  gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
  osc.connect(gain);
  gain.connect(masterGain);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.3);
}

export default function FlappyGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<'start' | 'playing' | 'gameover' | 'leaderboard'>('start');
  const [score, setScore] = useState(0);
  const [socialLoaded, setSocialLoaded] = useState(false);
  const [submittedEntryId, setSubmittedEntryId] = useState<number | null>(null);
  const [progression, setProgression] = useState<ProgressionResult | null>(null);

  const { user } = usePixelpitSocial(socialLoaded);

  // Game state ref
  const gameRef = useRef({
    running: false,
    score: 0,
    bird: { x: 0, y: 0, vy: 0, size: 30 },
    pipes: [] as Array<{ x: number; gapY: number; scored: boolean }>,
    gravity: 0.4,        // Slightly floatier
    jumpForce: -9,       // Slightly softer jump
    pipeGap: 200,        // Wider gap (easier start)
    pipeWidth: 60,
    pipeSpeed: 2.5,      // Slightly slower (easier start)
    groundY: 0,
  });

  const startGame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const game = gameRef.current;
    game.bird.x = canvas.width * 0.2;
    game.bird.y = canvas.height * 0.5;
    game.bird.vy = 0;
    game.pipes = [];
    game.score = 0;
    game.running = true;
    game.groundY = canvas.height - 50;

    setScore(0);
    setGameState('playing');
    setSubmittedEntryId(null);
    setProgression(null);

    // Spawn first pipe
    spawnPipe();
  }, []);

  const spawnPipe = useCallback(() => {
    const canvas = canvasRef.current;
    const game = gameRef.current;
    if (!canvas) return;

    const minY = 100;
    const maxY = game.groundY - game.pipeGap - 100;
    const gapY = minY + Math.random() * (maxY - minY);
    game.pipes.push({ x: canvas.width, gapY, scored: false });
  }, []);

  const flap = useCallback(() => {
    initAudio();
    const game = gameRef.current;
    if (gameState === 'start') {
      startGame();
    } else if (gameState === 'playing' && game.running) {
      game.bird.vy = game.jumpForce;
      playFlap();
    } else if (gameState === 'gameover') {
      setGameState('start');
    }
  }, [gameState, startGame]);

  const gameOver = useCallback(() => {
    const game = gameRef.current;
    game.running = false;
    playDeath();

    // Track play for analytics
    if (game.score >= 1) {
      fetch('/api/pixelpit/stats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ game: GAME_ID }),
      }).catch(() => {});
    }

    setScore(game.score);
    setTimeout(() => setGameState('gameover'), 300);
  }, []);

  // Game loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      gameRef.current.groundY = canvas.height - 50;
    };
    resize();
    window.addEventListener('resize', resize);

    let animationId: number;

    const update = () => {
      const game = gameRef.current;
      if (!game.running) return;

      // Bird physics
      game.bird.vy += game.gravity;
      game.bird.y += game.bird.vy;

      // Spawn pipes
      if (game.pipes.length === 0 || game.pipes[game.pipes.length - 1].x < canvas.width - 250) {
        spawnPipe();
      }

      // Update pipes
      for (let i = game.pipes.length - 1; i >= 0; i--) {
        game.pipes[i].x -= game.pipeSpeed;

        // Score
        if (!game.pipes[i].scored && game.pipes[i].x + game.pipeWidth < game.bird.x) {
          game.pipes[i].scored = true;
          game.score++;
          setScore(game.score);
          playScore();
          
          // Progressive difficulty: speed up every 5 points
          if (game.score % 5 === 0) {
            game.pipeSpeed = Math.min(game.pipeSpeed + 0.3, 5);
            game.pipeGap = Math.max(game.pipeGap - 5, 150);
          }
        }

        // Remove off-screen
        if (game.pipes[i].x + game.pipeWidth < 0) {
          game.pipes.splice(i, 1);
        }
      }

      // Collision - ground/ceiling
      if (game.bird.y + game.bird.size > game.groundY || game.bird.y - game.bird.size < 0) {
        gameOver();
        return;
      }

      // Collision - pipes
      for (const pipe of game.pipes) {
        if (game.bird.x + game.bird.size > pipe.x && game.bird.x - game.bird.size < pipe.x + game.pipeWidth) {
          if (game.bird.y - game.bird.size < pipe.gapY || game.bird.y + game.bird.size > pipe.gapY + game.pipeGap) {
            gameOver();
            return;
          }
        }
      }
    };

    const draw = () => {
      const game = gameRef.current;

      // Sky gradient
      const skyGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
      skyGrad.addColorStop(0, THEME.sky);
      skyGrad.addColorStop(1, THEME.skyDark);
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Pipes
      for (const pipe of game.pipes) {
        // Top pipe
        ctx.fillStyle = THEME.pipe;
        ctx.fillRect(pipe.x, 0, game.pipeWidth, pipe.gapY);
        // Top pipe cap
        ctx.fillStyle = THEME.pipeCap;
        ctx.fillRect(pipe.x - 5, pipe.gapY - 25, game.pipeWidth + 10, 25);

        // Bottom pipe
        ctx.fillStyle = THEME.pipe;
        ctx.fillRect(pipe.x, pipe.gapY + game.pipeGap, game.pipeWidth, canvas.height - pipe.gapY - game.pipeGap);
        // Bottom pipe cap
        ctx.fillStyle = THEME.pipeCap;
        ctx.fillRect(pipe.x - 5, pipe.gapY + game.pipeGap, game.pipeWidth + 10, 25);
      }

      // Ground
      ctx.fillStyle = THEME.ground;
      ctx.fillRect(0, game.groundY, canvas.width, canvas.height - game.groundY);
      ctx.fillStyle = THEME.groundDark;
      ctx.fillRect(0, game.groundY, canvas.width, 5);

      // Bird body
      ctx.fillStyle = THEME.bird;
      ctx.beginPath();
      ctx.arc(game.bird.x, game.bird.y, game.bird.size, 0, Math.PI * 2);
      ctx.fill();

      // Bird eye
      ctx.fillStyle = THEME.birdEye;
      ctx.beginPath();
      ctx.arc(game.bird.x + 10, game.bird.y - 5, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = THEME.birdPupil;
      ctx.beginPath();
      ctx.arc(game.bird.x + 12, game.bird.y - 5, 5, 0, Math.PI * 2);
      ctx.fill();

      // Bird beak
      ctx.fillStyle = THEME.beak;
      ctx.beginPath();
      ctx.moveTo(game.bird.x + game.bird.size, game.bird.y);
      ctx.lineTo(game.bird.x + game.bird.size + 15, game.bird.y + 5);
      ctx.lineTo(game.bird.x + game.bird.size, game.bird.y + 10);
      ctx.fill();

      // Wing (simple)
      ctx.fillStyle = '#f5cd5e';
      ctx.beginPath();
      ctx.ellipse(game.bird.x - 8, game.bird.y + 5, 12, 8, 0, 0, Math.PI * 2);
      ctx.fill();
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
      flap();
    };
    const handleMouse = () => flap();
    const handleKey = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        flap();
      }
    };

    canvas.addEventListener('touchstart', handleTouch);
    canvas.addEventListener('mousedown', handleMouse);
    document.addEventListener('keydown', handleKey);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('touchstart', handleTouch);
      canvas.removeEventListener('mousedown', handleMouse);
      document.removeEventListener('keydown', handleKey);
    };
  }, [flap, gameOver, spawnPipe]);

  return (
    <>
      <Script
        src="/pixelpit/social.js"
        onLoad={() => setSocialLoaded(true)}
      />

      <style jsx global>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          background: ${THEME.sky};
          overflow: hidden;
          touch-action: none;
          user-select: none;
        }
        button {
          transition: all 0.15s ease-out;
        }
        button:hover {
          transform: translateY(-2px);
          filter: brightness(1.1);
        }
        button:active {
          transform: translateY(1px);
        }
        .btn-primary {
          animation: btnGlow 3s ease-in-out infinite;
        }
        @keyframes btnGlow {
          0%, 100% { box-shadow: 0 8px 30px rgba(247,220,111,0.3); }
          50% { box-shadow: 0 8px 40px rgba(247,220,111,0.5); }
        }
      `}</style>

      <canvas
        ref={canvasRef}
        style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh' }}
      />

      {/* Score during play */}
      {gameState === 'playing' && (
        <div style={{
          position: 'fixed',
          top: 40,
          left: 0,
          right: 0,
          textAlign: 'center',
          zIndex: 10,
          pointerEvents: 'none',
        }}>
          <div style={{
            fontFamily: 'ui-monospace, monospace',
            fontSize: 64,
            fontWeight: 700,
            color: '#fff',
            textShadow: '3px 3px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000',
          }}>
            {score}
          </div>
        </div>
      )}

      {/* Start screen */}
      {gameState === 'start' && (
        <div style={{
          position: 'fixed',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(0,0,0,0.4)',
          zIndex: 100,
        }}>
          <div style={{
            background: COLORS.surface,
            borderRadius: 16,
            padding: '50px 60px',
            textAlign: 'center',
            boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          }}>
            <h1 style={{
              fontFamily: 'ui-monospace, monospace',
              fontSize: 64,
              fontWeight: 700,
              color: COLORS.gold,
              marginBottom: 20,
              letterSpacing: 4,
              textShadow: '0 0 40px rgba(247,220,111,0.4)',
            }}>
              FLAPPY
            </h1>
            <p style={{
              fontSize: 16,
              fontFamily: 'ui-monospace, monospace',
              color: COLORS.green,
              marginBottom: 35,
              letterSpacing: 2,
            }}>
              tap to flap<br />
              avoid the pipes
            </p>
            <button
              className="btn-primary"
              onClick={startGame}
              style={{
                background: COLORS.gold,
                color: COLORS.bg,
                border: 'none',
                padding: '16px 50px',
                fontSize: 18,
                fontFamily: 'ui-monospace, monospace',
                fontWeight: 600,
                cursor: 'pointer',
                borderRadius: 8,
                letterSpacing: 2,
              }}
            >
              play
            </button>
          </div>
          <div style={{
            marginTop: 30,
            fontSize: 12,
            fontFamily: 'ui-monospace, monospace',
            letterSpacing: 3,
          }}>
            <span style={{ color: COLORS.gold }}>pixel</span>
            <span style={{ color: COLORS.green }}>pit</span>
            <span style={{ color: COLORS.cream, opacity: 0.6 }}> arcade</span>
          </div>
        </div>
      )}

      {/* Game over screen */}
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
          padding: 40,
        }}>
          <h1 style={{
            fontFamily: 'ui-monospace, monospace',
            fontSize: 28,
            fontWeight: 300,
            color: COLORS.green,
            marginBottom: 15,
            letterSpacing: 6,
          }}>
            game over
          </h1>
          <div style={{
            fontFamily: 'ui-monospace, monospace',
            fontSize: 80,
            fontWeight: 200,
            color: COLORS.gold,
            marginBottom: 30,
            textShadow: '0 0 40px rgba(247,220,111,0.4)',
          }}>
            {score}
          </div>

          {/* Progression display */}
          {progression && (
            <div style={{
              background: COLORS.surface,
              borderRadius: 12,
              padding: '16px 24px',
              marginBottom: 20,
              textAlign: 'center',
            }}>
              <div style={{
                fontFamily: 'ui-monospace, monospace',
                fontSize: 18,
                color: COLORS.gold,
                marginBottom: 8,
              }}>
                +{progression.xpEarned} XP
              </div>
              <div style={{
                fontFamily: 'ui-monospace, monospace',
                fontSize: 12,
                color: COLORS.muted,
              }}>
                Level {progression.level} • {progression.streak > 1 ? `${progression.multiplier}x streak` : ''}
              </div>
            </div>
          )}

          {/* Score submission */}
          <ScoreFlow
            score={score}
            gameId={GAME_ID}
            colors={SCORE_FLOW_COLORS}
            xpDivisor={1}
            onRankReceived={(rank, entryId) => {
              setSubmittedEntryId(entryId ?? null);
            }}
            onProgression={(prog) => setProgression(prog)}
          />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 15, alignItems: 'center', marginTop: 20 }}>
            <button
              className="btn-primary"
              onClick={startGame}
              style={{
                background: COLORS.green,
                color: COLORS.bg,
                border: 'none',
                borderRadius: 8,
                padding: '16px 50px',
                fontSize: 15,
                fontFamily: 'ui-monospace, monospace',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 8px 25px rgba(115,191,46,0.3)',
                letterSpacing: 2,
              }}
            >
              play again
            </button>
            <button
              onClick={() => setGameState('leaderboard')}
              style={{
                background: 'transparent',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 6,
                color: COLORS.muted,
                padding: '14px 35px',
                fontSize: 11,
                fontFamily: 'ui-monospace, monospace',
                cursor: 'pointer',
                letterSpacing: 2,
              }}
            >
              leaderboard
            </button>
            <ShareButtonContainer
              id="share-btn-container"
              url={typeof window !== 'undefined' ? `${window.location.origin}/pixelpit/arcade/flappy/share/${score}` : ''}
              text={`I scored ${score} on FLAPPY! Can you beat me? 🐦`}
              style="minimal"
              socialLoaded={socialLoaded}
            />
          </div>
        </div>
      )}

      {/* Leaderboard screen */}
      {gameState === 'leaderboard' && (
        <Leaderboard
          gameId={GAME_ID}
          limit={10}
          entryId={submittedEntryId ?? undefined}
          colors={LEADERBOARD_COLORS}
          onClose={() => setGameState('gameover')}
        />
      )}
    </>
  );
}
