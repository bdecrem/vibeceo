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
let musicInterval: ReturnType<typeof setInterval> | null = null;
let musicBeat = 0;

// C major scale frequencies
const NOTES = {
  C4: 261.63, E4: 329.63, G4: 392.00,  // Melody
  C2: 65.41,  // Bass
};
const MELODY = [NOTES.C4, NOTES.E4, NOTES.G4, NOTES.E4];  // C-E-G-E loop
const BPM = 120;
const BEAT_MS = 60000 / BPM;

function initAudio() {
  if (audioCtx) return;
  audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  masterGain = audioCtx.createGain();
  masterGain.gain.value = 0.5;
  masterGain.connect(audioCtx.destination);
  if (audioCtx.state === 'suspended') audioCtx.resume();
}

function playMusicNote() {
  if (!audioCtx || !masterGain) return;
  const t = audioCtx.currentTime;
  
  // Melody: C-E-G-E loop (every beat)
  const melodyOsc = audioCtx.createOscillator();
  const melodyGain = audioCtx.createGain();
  melodyOsc.type = 'triangle';
  melodyOsc.frequency.value = MELODY[musicBeat % 4];
  melodyGain.gain.setValueAtTime(0.35, t);
  melodyGain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
  melodyOsc.connect(melodyGain);
  melodyGain.connect(masterGain);
  melodyOsc.start(t);
  melodyOsc.stop(t + 0.25);
  
  // Bass: C2 on beats 0 and 2 (1 and 3 in musical terms)
  if (musicBeat % 2 === 0) {
    const bassOsc = audioCtx.createOscillator();
    const bassGain = audioCtx.createGain();
    bassOsc.type = 'sine';
    bassOsc.frequency.value = NOTES.C2;
    bassGain.gain.setValueAtTime(0.5, t);
    bassGain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    bassOsc.connect(bassGain);
    bassGain.connect(masterGain);
    bassOsc.start(t);
    bassOsc.stop(t + 0.35);
  }
  
  musicBeat++;
}

function startMusic() {
  if (!audioCtx || musicInterval) return;
  musicBeat = 0;
  
  // Play first note immediately (iOS unlock requires immediate playback)
  playMusicNote();
  
  // Then continue with interval
  musicInterval = setInterval(playMusicNote, BEAT_MS);
}

function stopMusic() {
  if (musicInterval) {
    clearInterval(musicInterval);
    musicInterval = null;
  }
}

function playFlap() {
  if (!audioCtx || !masterGain) return;
  // Quick "bwip" - high pitched blip
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(800, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.05);
  gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.08);
  osc.connect(gain);
  gain.connect(masterGain);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.08);
}

function playScore() {
  if (!audioCtx || !masterGain) return;
  // Happy ascending ding
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(523, audioCtx.currentTime);  // C5
  osc.frequency.exponentialRampToValueAtTime(784, audioCtx.currentTime + 0.1);  // G5
  gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);
  osc.connect(gain);
  gain.connect(masterGain);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.15);
  // Second chime
  setTimeout(() => {
    if (!audioCtx || !masterGain) return;
    const osc2 = audioCtx.createOscillator();
    const gain2 = audioCtx.createGain();
    osc2.type = 'sine';
    osc2.frequency.value = 1047;  // C6
    gain2.gain.setValueAtTime(0.12, audioCtx.currentTime);
    gain2.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.12);
    osc2.connect(gain2);
    gain2.connect(masterGain);
    osc2.start();
    osc2.stop(audioCtx.currentTime + 0.12);
  }, 80);
}

function playDeath() {
  if (!audioCtx || !masterGain) return;
  // Bonk
  const bonk = audioCtx.createOscillator();
  const bonkGain = audioCtx.createGain();
  bonk.type = 'square';
  bonk.frequency.value = 150;
  bonkGain.gain.setValueAtTime(0.25, audioCtx.currentTime);
  bonkGain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.1);
  bonk.connect(bonkGain);
  bonkGain.connect(masterGain);
  bonk.start();
  bonk.stop(audioCtx.currentTime + 0.1);
  // Sad descending slide
  setTimeout(() => {
    if (!audioCtx || !masterGain) return;
    const slide = audioCtx.createOscillator();
    const slideGain = audioCtx.createGain();
    slide.type = 'sawtooth';
    slide.frequency.setValueAtTime(400, audioCtx.currentTime);
    slide.frequency.exponentialRampToValueAtTime(80, audioCtx.currentTime + 0.4);
    slideGain.gain.setValueAtTime(0.15, audioCtx.currentTime);
    slideGain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4);
    slide.connect(slideGain);
    slideGain.connect(masterGain);
    slide.start();
    slide.stop(audioCtx.currentTime + 0.4);
  }, 100);
}

export default function FlappyGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<'start' | 'playing' | 'gameover' | 'leaderboard'>('start');
  const [score, setScore] = useState(0);
  const [musicEnabled, setMusicEnabled] = useState(false);
  const [socialLoaded, setSocialLoaded] = useState(false);
  const [submittedEntryId, setSubmittedEntryId] = useState<number | null>(null);
  const [progression, setProgression] = useState<ProgressionResult | null>(null);

  const { user } = usePixelpitSocial(socialLoaded);
  
  // Music toggle (handles iOS audio unlock)
  const toggleMusic = useCallback(() => {
    initAudio();  // Ensure audio context exists
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    if (musicEnabled) {
      stopMusic();
      setMusicEnabled(false);
    } else {
      startMusic();
      setMusicEnabled(true);
    }
  }, [musicEnabled]);

  // Game state ref (sizes scaled for mobile)
  const getMobileScale = () => typeof window !== 'undefined' ? Math.min(window.innerWidth / 500, 1) : 1;
  const gameRef = useRef({
    running: false,
    score: 0,
    pipesPassed: 0,      // Track pipes for difficulty curve
    mobileScale: 1,      // Set on resize
    bird: { x: 0, y: 0, vy: 0, size: 24, scaleX: 1, scaleY: 1 },  // Smaller bird (was 30)
    pipes: [] as Array<{ x: number; gapY: number; scored: boolean; wobble: number }>,
    particles: [] as Array<{ x: number; y: number; vx: number; vy: number; life: number; color: string }>,
    screenFlash: 0,      // Flash intensity (0-1)
    gravity: 0.4,
    jumpForce: -9,
    pipeGap: 220,        // Easier start
    minGap: 160,         // Never harder than this
    gapShrinkRate: 2,    // Shrink by 2px every 5 pipes
    pipeWidth: 50,        // Slightly narrower pipes (was 60)
    pipeSpeed: 2.5,
    speedIncreaseRate: 0.1,  // Speed up by 0.1 every 5 pipes
    groundY: 0,
  });

  const startGame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const game = gameRef.current;
    game.bird.x = canvas.width * 0.2;
    game.bird.y = canvas.height * 0.5;
    game.bird.vy = 0;
    game.bird.scaleX = 1;
    game.bird.scaleY = 1;
    game.pipes = [];
    game.particles = [];
    game.score = 0;
    game.pipesPassed = 0;
    game.screenFlash = 0;
    game.pipeGap = 220;      // Reset difficulty
    game.pipeSpeed = 2.5;
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
    game.pipes.push({ x: canvas.width, gapY, scored: false, wobble: Math.random() * Math.PI * 2 });
  }, []);
  
  const spawnDeathParticles = useCallback(() => {
    const game = gameRef.current;
    const colors = [THEME.bird, '#fff', THEME.beak, '#f5cd5e'];
    for (let i = 0; i < 20; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 4;
      game.particles.push({
        x: game.bird.x,
        y: game.bird.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        life: 1,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }
  }, []);

  const flap = useCallback(() => {
    initAudio();
    const game = gameRef.current;
    if (gameState === 'start') {
      startGame();
    } else if (gameState === 'playing' && game.running) {
      game.bird.vy = game.jumpForce;
      // Squash on flap (stretch vertically, compress horizontally)
      game.bird.scaleX = 0.7;
      game.bird.scaleY = 1.4;
      playFlap();
    } else if (gameState === 'gameover') {
      setGameState('start');
    }
  }, [gameState, startGame]);

  const gameOver = useCallback(() => {
    const game = gameRef.current;
    game.running = false;
    spawnDeathParticles();
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
    setTimeout(() => setGameState('gameover'), 500);  // Slightly longer to see particles
  }, [spawnDeathParticles]);

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
      gameRef.current.mobileScale = getMobileScale();
    };
    resize();
    window.addEventListener('resize', resize);

    let animationId: number;

    const update = () => {
      const game = gameRef.current;
      
      // Always update particles (even after death)
      for (let i = game.particles.length - 1; i >= 0; i--) {
        const p = game.particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.15;  // Gravity on particles
        p.life -= 0.02;
        if (p.life <= 0) game.particles.splice(i, 1);
      }
      
      // Decay screen flash
      if (game.screenFlash > 0) {
        game.screenFlash *= 0.85;
        if (game.screenFlash < 0.01) game.screenFlash = 0;
      }
      
      if (!game.running) return;

      // Bird physics
      game.bird.vy += game.gravity;
      game.bird.y += game.bird.vy;
      
      // Squash/stretch recovery (lerp back to 1)
      game.bird.scaleX += (1 - game.bird.scaleX) * 0.15;
      game.bird.scaleY += (1 - game.bird.scaleY) * 0.15;

      // Spawn pipes
      if (game.pipes.length === 0 || game.pipes[game.pipes.length - 1].x < canvas.width - 300) {
        spawnPipe();
      }

      // Update pipes
      for (let i = game.pipes.length - 1; i >= 0; i--) {
        game.pipes[i].x -= game.pipeSpeed;
        game.pipes[i].wobble += 0.08;  // Animate wobble

        // Score
        if (!game.pipes[i].scored && game.pipes[i].x + game.pipeWidth < game.bird.x) {
          game.pipes[i].scored = true;
          game.score++;
          game.pipesPassed++;
          game.screenFlash = 0.4;  // Flash on score
          setScore(game.score);
          playScore();
          
          // Progressive difficulty: every 5 pipes
          if (game.pipesPassed % 5 === 0) {
            game.pipeSpeed = Math.min(game.pipeSpeed + game.speedIncreaseRate, 4);
            game.pipeGap = Math.max(game.pipeGap - game.gapShrinkRate, game.minGap);
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

      // Pipes with wobble
      for (const pipe of game.pipes) {
        const wobbleOffset = Math.sin(pipe.wobble) * 2;  // Subtle wobble
        
        ctx.save();
        ctx.translate(pipe.x + game.pipeWidth / 2, 0);
        ctx.translate(wobbleOffset, 0);
        ctx.translate(-(pipe.x + game.pipeWidth / 2), 0);
        
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
        
        ctx.restore();
      }

      // Ground
      ctx.fillStyle = THEME.ground;
      ctx.fillRect(0, game.groundY, canvas.width, canvas.height - game.groundY);
      ctx.fillStyle = THEME.groundDark;
      ctx.fillRect(0, game.groundY, canvas.width, 5);

      // Bird with squash/stretch
      ctx.save();
      ctx.translate(game.bird.x, game.bird.y);
      ctx.scale(game.bird.scaleX, game.bird.scaleY);
      
      // Bird body
      ctx.fillStyle = THEME.bird;
      ctx.beginPath();
      ctx.arc(0, 0, game.bird.size, 0, Math.PI * 2);
      ctx.fill();

      // Bird eye
      ctx.fillStyle = THEME.birdEye;
      ctx.beginPath();
      ctx.arc(10, -5, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = THEME.birdPupil;
      ctx.beginPath();
      ctx.arc(12, -5, 5, 0, Math.PI * 2);
      ctx.fill();

      // Bird beak
      ctx.fillStyle = THEME.beak;
      ctx.beginPath();
      ctx.moveTo(game.bird.size, 0);
      ctx.lineTo(game.bird.size + 15, 5);
      ctx.lineTo(game.bird.size, 10);
      ctx.fill();

      // Wing (simple)
      ctx.fillStyle = '#f5cd5e';
      ctx.beginPath();
      ctx.ellipse(-8, 5, 12, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.restore();
      
      // Death particles
      for (const p of game.particles) {
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4 + p.life * 4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      
      // Screen flash on score
      if (game.screenFlash > 0) {
        ctx.fillStyle = `rgba(255, 255, 255, ${game.screenFlash})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
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
      stopMusic();
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
          top: 'max(60px, env(safe-area-inset-top, 60px))',
          left: 0,
          right: 0,
          textAlign: 'center',
          zIndex: 10,
          pointerEvents: 'none',
        }}>
          <div style={{
            fontFamily: 'ui-monospace, monospace',
            fontSize: 'min(64px, 12vw)',
            fontWeight: 700,
            color: '#fff',
            textShadow: '3px 3px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000',
          }}>
            {score}
          </div>
        </div>
      )}

      {/* Music toggle button */}
      {(gameState === 'playing' || gameState === 'start') && (
        <button
          onClick={(e) => { e.stopPropagation(); toggleMusic(); }}
          style={{
            position: 'fixed',
            top: 'max(20px, env(safe-area-inset-top, 20px))',
            right: 20,
            zIndex: 200,
            background: musicEnabled ? COLORS.gold : 'rgba(0,0,0,0.5)',
            color: musicEnabled ? COLORS.bg : '#fff',
            border: 'none',
            borderRadius: 8,
            padding: '10px 14px',
            fontSize: 20,
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          }}
          aria-label={musicEnabled ? 'Mute music' : 'Play music'}
        >
          {musicEnabled ? '🎵' : '🔇'}
        </button>
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
