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

  // Score-based difficulty - smooth curve, no cliffs
  // Fun 0-40, then gentle ramp. Spawn rate NEVER goes below 2.
  const getDifficulty = (currentScore: number) => {
    const level = Math.floor(currentScore / 10);
    // Speed: fast growth 0-40, then slower after
    const speedBonus = level <= 4
      ? level * 0.25                    // 0-40: +0.25 per level
      : 1.0 + (level - 4) * 0.1;        // 40+: +0.1 per level
    return {
      bpm: Math.min(120 + level * 1.5, 150),            // 120 → 150 BPM (gentle)
      speed: Math.min(3.0 + speedBonus, 6),             // 3.0 → 6.0 max
      spawnEveryNBeats: Math.max(4 - Math.floor(level / 4), 2), // 4→3→2 at 40,80
    };
  };

  const gameRef = useRef({
    running: false,
    score: 0,
    breach: 0,
    frame: 0,
    beatCount: 0,
    lastBeatTime: 0,
    beatPulse: 0, // visual pulse intensity 0-1
    paddle: { x: 200, w: 100, h: 10 },
    particles: [] as Particle[],
    audioCtx: null as AudioContext | null,
    masterGain: null as GainNode | null,
    musicPlaying: false,
    keysDown: { left: false, right: false },
    keyboardInterval: null as NodeJS.Timeout | null,
  });

  const GAME_ID = 'singularity';
  const W = 400;
  const H = 600;

  // Dedicated keyboard input loop - runs at 60fps independent of game loop
  const startKeyboardLoop = () => {
    const game = gameRef.current;
    if (game.keyboardInterval) return;

    game.keyboardInterval = setInterval(() => {
      if (!game.running) return;
      const speed = 12; // pixels per tick at 60fps = 720px/sec
      if (game.keysDown.left) {
        game.paddle.x = Math.max(game.paddle.w / 2, game.paddle.x - speed);
      }
      if (game.keysDown.right) {
        game.paddle.x = Math.min(W - game.paddle.w / 2, game.paddle.x + speed);
      }
    }, 16); // ~60fps
  };

  const stopKeyboardLoop = () => {
    const game = gameRef.current;
    if (game.keyboardInterval) {
      clearInterval(game.keyboardInterval);
      game.keyboardInterval = null;
    }
  };

  // Audio
  const initAudio = () => {
    const game = gameRef.current;
    if (game.audioCtx) return;
    game.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    game.masterGain = game.audioCtx.createGain();
    game.masterGain.connect(game.audioCtx.destination);
    game.masterGain.gain.value = soundEnabled ? 0.3 : 0;
  };

  // Beat-synced music patterns (16 steps = 1 bar at 4/4)
  const PATTERNS = {
    kick: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
    hat:  [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0],
    bass: [55, 0, 55, 0, 0, 0, 55, 0, 44, 0, 0, 0, 55, 0, 0, 0],
  };

  // Musical catch notes (pentatonic scale in A minor - always sounds good)
  const CATCH_NOTES = [220, 261.6, 293.7, 349.2, 392, 440, 523.3, 587.3];

  const playKick = () => {
    const game = gameRef.current;
    if (!game.audioCtx || !game.masterGain) return;
    // Industrial kick - distorted, punchy
    const osc = game.audioCtx.createOscillator();
    const osc2 = game.audioCtx.createOscillator(); // noise layer
    const distortion = game.audioCtx.createWaveShaper();
    const gain = game.audioCtx.createGain();

    // Distortion curve
    const curve = new Float32Array(256);
    for (let i = 0; i < 256; i++) {
      const x = (i * 2) / 256 - 1;
      curve[i] = Math.tanh(x * 3);
    }
    distortion.curve = curve;

    osc.connect(distortion);
    osc2.connect(distortion);
    distortion.connect(gain);
    gain.connect(game.masterGain);

    osc.type = 'square'; // harsher
    osc.frequency.setValueAtTime(80, game.audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(30, game.audioCtx.currentTime + 0.08);

    osc2.type = 'sawtooth';
    osc2.frequency.setValueAtTime(60, game.audioCtx.currentTime);
    osc2.frequency.exponentialRampToValueAtTime(20, game.audioCtx.currentTime + 0.05);

    gain.gain.setValueAtTime(0.4, game.audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, game.audioCtx.currentTime + 0.15);
    osc.start();
    osc2.start();
    osc.stop(game.audioCtx.currentTime + 0.15);
    osc2.stop(game.audioCtx.currentTime + 0.15);
  };

  const playHat = () => {
    const game = gameRef.current;
    if (!game.audioCtx || !game.masterGain) return;
    // Industrial hi-hat - metallic, harsh
    const bufferSize = game.audioCtx.sampleRate * 0.06;
    const buffer = game.audioCtx.createBuffer(1, bufferSize, game.audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      // Add some ring mod character
      data[i] = (Math.random() * 2 - 1) * Math.sin(i * 0.1);
    }
    const noise = game.audioCtx.createBufferSource();
    noise.buffer = buffer;
    const hpFilter = game.audioCtx.createBiquadFilter();
    hpFilter.type = 'highpass';
    hpFilter.frequency.value = 7000;
    hpFilter.Q.value = 2; // resonance for metallic tone
    const bpFilter = game.audioCtx.createBiquadFilter();
    bpFilter.type = 'bandpass';
    bpFilter.frequency.value = 10000;
    bpFilter.Q.value = 1;
    const gain = game.audioCtx.createGain();
    gain.gain.setValueAtTime(0.08, game.audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, game.audioCtx.currentTime + 0.05);
    noise.connect(hpFilter);
    hpFilter.connect(bpFilter);
    bpFilter.connect(gain);
    gain.connect(game.masterGain);
    noise.start();
  };

  const playBass = (freq: number) => {
    const game = gameRef.current;
    if (!game.audioCtx || !game.masterGain || freq === 0) return;
    // Industrial bass - gritty, distorted
    const osc = game.audioCtx.createOscillator();
    const osc2 = game.audioCtx.createOscillator();
    const filter = game.audioCtx.createBiquadFilter();
    const distortion = game.audioCtx.createWaveShaper();
    const gain = game.audioCtx.createGain();

    const curve = new Float32Array(256);
    for (let i = 0; i < 256; i++) {
      const x = (i * 2) / 256 - 1;
      curve[i] = Math.tanh(x * 2);
    }
    distortion.curve = curve;

    osc.connect(filter);
    osc2.connect(filter);
    filter.connect(distortion);
    distortion.connect(gain);
    gain.connect(game.masterGain);

    osc.type = 'sawtooth';
    osc.frequency.value = freq;
    osc2.type = 'square';
    osc2.frequency.value = freq * 0.5; // sub octave

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, game.audioCtx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(200, game.audioCtx.currentTime + 0.08);
    filter.Q.value = 8; // resonant

    gain.gain.setValueAtTime(0.2, game.audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, game.audioCtx.currentTime + 0.1);
    osc.start();
    osc2.start();
    osc.stop(game.audioCtx.currentTime + 0.12);
    osc2.stop(game.audioCtx.currentTime + 0.12);
  };

  // Catch sound - industrial blip, less melodic
  const playCatchSound = () => {
    const game = gameRef.current;
    if (!game.audioCtx || !game.masterGain || !soundEnabled) return;
    // Percussive digital blip instead of melodic
    const osc = game.audioCtx.createOscillator();
    const osc2 = game.audioCtx.createOscillator();
    const gain = game.audioCtx.createGain();
    const filter = game.audioCtx.createBiquadFilter();

    osc.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(game.masterGain);

    // High pitched digital blip
    osc.type = 'square';
    osc.frequency.setValueAtTime(800 + (game.score % 4) * 100, game.audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(200, game.audioCtx.currentTime + 0.05);

    osc2.type = 'sawtooth';
    osc2.frequency.setValueAtTime(1200, game.audioCtx.currentTime);
    osc2.frequency.exponentialRampToValueAtTime(400, game.audioCtx.currentTime + 0.03);

    filter.type = 'bandpass';
    filter.frequency.value = 1000;
    filter.Q.value = 2;

    gain.gain.setValueAtTime(0.12, game.audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, game.audioCtx.currentTime + 0.08);
    osc.start();
    osc2.start();
    osc.stop(game.audioCtx.currentTime + 0.08);
    osc2.stop(game.audioCtx.currentTime + 0.08);
  };

  const breachSound = () => {
    const game = gameRef.current;
    if (!game.audioCtx || !game.masterGain || !soundEnabled) return;
    const osc = game.audioCtx.createOscillator();
    const gain = game.audioCtx.createGain();
    osc.connect(gain);
    gain.connect(game.masterGain);
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(110, game.audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(55, game.audioCtx.currentTime + 0.3);
    gain.gain.setValueAtTime(0.2, game.audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, game.audioCtx.currentTime + 0.3);
    osc.start();
    osc.stop(game.audioCtx.currentTime + 0.3);
  };

  const failSound = () => {
    const game = gameRef.current;
    if (!game.audioCtx || !game.masterGain || !soundEnabled) return;
    [80, 60, 40].forEach((freq, i) => {
      const osc = game.audioCtx!.createOscillator();
      const gain = game.audioCtx!.createGain();
      osc.connect(gain);
      gain.connect(game.masterGain!);
      osc.type = 'sawtooth';
      osc.frequency.value = freq;
      const startTime = game.audioCtx!.currentTime + i * 0.1;
      gain.gain.setValueAtTime(0.2, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.3);
      osc.start(startTime);
      osc.stop(startTime + 0.3);
    });
  };

  // Master beat callback - drives EVERYTHING
  const onBeat = (beatNum: number) => {
    const game = gameRef.current;
    if (!game.running || !soundEnabled) return;

    const step = beatNum % 16;
    const difficulty = getDifficulty(game.score);

    // Play music on beat
    if (PATTERNS.kick[step]) playKick();
    if (PATTERNS.hat[step]) playHat();
    if (PATTERNS.bass[step]) playBass(PATTERNS.bass[step]);

    // Spawn particle on beat (based on difficulty)
    if (beatNum % difficulty.spawnEveryNBeats === 0) {
      const margin = 30;
      const usableWidth = W - margin * 2;
      game.particles.push({
        x: margin + Math.random() * usableWidth,
        y: -10,
        speed: difficulty.speed,
        size: 10,
      });
    }

    // Visual pulse on downbeat (every 4 steps)
    if (step % 4 === 0) {
      game.beatPulse = 1;
    }
  };

  const startGame = () => {
    initAudio();
    const game = gameRef.current;
    game.running = true;
    game.score = 0;
    game.breach = 0;
    game.frame = 0;
    game.beatCount = 0;
    game.lastBeatTime = performance.now();
    game.beatPulse = 0;
    game.particles = [];
    game.paddle.x = W / 2;
    game.keysDown = { left: false, right: false };
    game.musicPlaying = true;
    startKeyboardLoop();
    setScore(0);
    setBreach(0);
    setSubmittedEntryId(null);
    setGameState('playing');
  };

  const gameOver = () => {
    const game = gameRef.current;
    game.running = false;
    game.musicPlaying = false;
    stopKeyboardLoop();
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

    const update = (now: number) => {
      const game = gameRef.current;
      if (!game.running) return;

      // Beat timing - check if a new beat should trigger
      const difficulty = getDifficulty(game.score);
      const msPerBeat = 60000 / difficulty.bpm / 4; // 16th notes
      if (now - game.lastBeatTime >= msPerBeat) {
        game.lastBeatTime = now;
        game.beatCount++;
        onBeat(game.beatCount);
      }

      // Decay visual pulse
      game.beatPulse *= 0.9;

      // Update particles - ALL move at current difficulty speed (no mixed speeds)
      for (let i = game.particles.length - 1; i >= 0; i--) {
        const p = game.particles[i];
        p.y += difficulty.speed;

        // Caught by paddle (generous hitbox for fun)
        if (p.y > H - 35 && p.y < H - 5 &&
            Math.abs(p.x - game.paddle.x) < game.paddle.w / 2 + p.size) {
          game.particles.splice(i, 1);
          game.score++;
          setScore(game.score);
          playCatchSound();
        }
        // Missed - breach
        else if (p.y > H + 10) {
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
      const pulse = game.beatPulse;

      // Background with subtle pulse
      ctx.fillStyle = THEME.bg;
      ctx.fillRect(0, 0, W, H);

      // Singularity gradient - pulses with beat
      const singularitySize = 150 + pulse * 30;
      const gradient = ctx.createRadialGradient(W / 2, 0, 0, W / 2, 0, singularitySize);
      gradient.addColorStop(0, THEME.accent);
      gradient.addColorStop(0.3, THEME.accentDark);
      gradient.addColorStop(1, THEME.bg);
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(W / 2, -50, singularitySize, 0, Math.PI * 2);
      ctx.fill();

      // Grid lines - subtle pulse intensity
      const gridAlpha = 0.15 + pulse * 0.1;
      ctx.strokeStyle = `rgba(255, 77, 0, ${gridAlpha})`;
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

      // Particles with glow
      game.particles.forEach(p => {
        ctx.fillStyle = THEME.accent;
        ctx.shadowColor = THEME.accent;
        ctx.shadowBlur = 20 + pulse * 10;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      // Paddle / Containment beam - wider, more visible
      const paddleGlow = 25 + pulse * 15;
      ctx.fillStyle = THEME.accent;
      ctx.shadowColor = THEME.accent;
      ctx.shadowBlur = paddleGlow;
      ctx.fillRect(game.paddle.x - game.paddle.w / 2, H - 25, game.paddle.w, game.paddle.h);
      ctx.shadowBlur = 0;

      // Scanlines (subtle)
      ctx.fillStyle = 'rgba(0,0,0,0.08)';
      for (let i = 0; i < H; i += 4) {
        ctx.fillRect(0, i, W, 2);
      }

      // Random glitch effect - horizontal tear
      if (Math.random() < 0.03) {
        const y = Math.random() * H;
        const h = 3 + Math.random() * 8;
        const offset = (Math.random() - 0.5) * 10;
        ctx.drawImage(canvas, 0, y, W, h, offset, y, W, h);
      }
    };

    const loop = (now: number) => {
      update(now);
      draw();
      animationId = requestAnimationFrame(loop);
    };

    animationId = requestAnimationFrame(loop);

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
    const handleKeyDown = (e: KeyboardEvent) => {
      const game = gameRef.current;
      // Only capture keys when game is actively playing
      if (!game.running) return;
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        game.keysDown.left = true;
        e.preventDefault();
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        game.keysDown.right = true;
        e.preventDefault();
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      const game = gameRef.current;
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        game.keysDown.left = false;
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        game.keysDown.right = false;
      }
    };

    canvas.addEventListener('mousemove', handleMouse);
    canvas.addEventListener('touchmove', handleTouch, { passive: false });
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);

    return () => {
      cancelAnimationFrame(animationId);
      canvas.removeEventListener('mousemove', handleMouse);
      canvas.removeEventListener('touchmove', handleTouch);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
      stopKeyboardLoop();
      gameRef.current.musicPlaying = false;
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
          50% { opacity: 0.7; }
        }
        @keyframes glitch {
          0%, 100% { opacity: 1; transform: translate(0); }
          10% { opacity: 0.8; transform: translate(-2px, 1px); }
          20% { opacity: 1; transform: translate(2px, -1px); }
          30% { opacity: 0.9; transform: translate(0); }
          40% { opacity: 1; transform: translate(1px, 2px); }
          50% { opacity: 0.8; transform: translate(-1px, -1px); }
        }
        @keyframes scanline {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100vh); }
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
            overflow: 'hidden',
          }}>
            {/* Scanline overlay */}
            <div style={{
              position: 'absolute',
              inset: 0,
              background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.3) 2px, rgba(0,0,0,0.3) 4px)',
              pointerEvents: 'none',
              zIndex: 1,
            }} />
            {/* Moving scanline */}
            <div style={{
              position: 'absolute',
              left: 0,
              right: 0,
              height: 4,
              background: `linear-gradient(transparent, ${THEME.accent}40, transparent)`,
              animation: 'scanline 3s linear infinite',
              pointerEvents: 'none',
              zIndex: 2,
            }} />
            <div style={{ zIndex: 10, textAlign: 'center' }}>
              <h1 style={{
                fontSize: 32,
                fontWeight: 'normal',
                letterSpacing: 10,
                marginBottom: 8,
                animation: 'glitch 0.3s infinite',
                textShadow: `0 0 30px ${THEME.accent}`,
              }}>
                SINGULARITY
              </h1>
              <p style={{
                fontSize: 12,
                letterSpacing: 6,
                color: THEME.textMuted,
                marginBottom: 50,
              }}>
                ◢ PROTOCOL ◣
              </p>
              <div style={{
                fontSize: 10,
                color: THEME.textMuted,
                marginBottom: 40,
                textAlign: 'center',
                lineHeight: 2.5,
                letterSpacing: 2,
              }}>
                CONTAIN THE BREACH<br />
                <span style={{ opacity: 0.5 }}>[ ← → ] or [ A D ]</span>
              </div>
              <button
                onClick={startGame}
                style={{
                  background: THEME.accent,
                  color: THEME.bg,
                  border: 'none',
                  padding: '16px 50px',
                  fontSize: 14,
                  letterSpacing: 6,
                  cursor: 'pointer',
                  textTransform: 'uppercase',
                  animation: 'flicker 0.1s infinite',
                }}
              >
                INITIALIZE
              </button>
              <div style={{
                marginTop: 60,
                fontSize: 10,
                letterSpacing: 3,
                opacity: 0.4,
              }}>
                <span style={{ color: THEME.accent }}>pixel</span>
                <span style={{ color: THEME.textMuted }}>pit</span>
              </div>
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
            overflow: 'hidden',
          }}>
            {/* Scanline overlay */}
            <div style={{
              position: 'absolute',
              inset: 0,
              background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.3) 2px, rgba(0,0,0,0.3) 4px)',
              pointerEvents: 'none',
              zIndex: 1,
            }} />
            {/* Red warning flash - no animation to avoid iOS input issues */}
            <div style={{
              position: 'absolute',
              inset: 0,
              background: 'radial-gradient(circle at center, transparent 30%, rgba(255,0,0,0.08) 100%)',
              pointerEvents: 'none',
              zIndex: 1,
            }} />
            <div style={{ zIndex: 10, textAlign: 'center', position: 'relative' }}>
              <h1 style={{
                fontSize: 24,
                letterSpacing: 8,
                marginBottom: 15,
                textShadow: `0 0 30px ${THEME.accent}`,
              }}>
                CONTAINMENT FAILURE
              </h1>
              <div style={{
                fontSize: 80,
                fontWeight: 'bold',
                marginBottom: 20,
                textShadow: `0 0 50px ${THEME.accent}`,
              }}>
                {score}
              </div>
              <div style={{
                fontSize: 10,
                letterSpacing: 4,
                color: THEME.textMuted,
                marginBottom: 30,
              }}>
                PARTICLES CONTAINED
              </div>

            <ScoreFlow
              score={score}
              gameId={GAME_ID}
              colors={SCORE_FLOW_COLORS}
              maxScore={100}
              onRankReceived={(rank, entryId) => {
                setSubmittedEntryId(entryId ?? null);
              }}
            />

            <div style={{ display: 'flex', flexDirection: 'column', gap: 15, marginTop: 10 }}>
              <button
                onClick={startGame}
                style={{
                  background: THEME.accent,
                  color: THEME.bg,
                  border: 'none',
                  padding: '16px 50px',
                  fontSize: 14,
                  letterSpacing: 6,
                  cursor: 'pointer',
                  textTransform: 'uppercase',
                }}
              >
                REINITIALIZE
              </button>
              <button
                onClick={() => setGameState('leaderboard')}
                style={{
                  background: 'transparent',
                  border: `1px solid ${THEME.accent}40`,
                  color: THEME.textMuted,
                  padding: '12px 30px',
                  fontSize: 10,
                  letterSpacing: 4,
                  cursor: 'pointer',
                  textTransform: 'uppercase',
                }}
              >
                [ BREACH LOG ]
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
