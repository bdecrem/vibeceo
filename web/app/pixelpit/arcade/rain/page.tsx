'use client';

import { useEffect, useRef, useState } from 'react';
import Script from 'next/script';

// RAIN theme: Soft glows, warm, cozy
const THEME = {
  bg: '#0f172a',
  accent: '#f472b6',      // pink
  secondary: '#22d3ee',   // cyan
  highlight: '#fbbf24',   // gold
};

// Legacy colors object (for compatibility)
const COLORS = {
  black: '#0f172a',
  amber: '#f472b6',
  gold: '#fbbf24',
  teal: '#22d3ee',
  darkAmber: '#be185d',
};

// Particle for catch effects
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
}

// Drop (falling amber)
interface Drop {
  x: number;
  y: number;
  speed: number;
}

declare global {
  interface Window {
    PixelpitSocial?: {
      getUser: () => { id: number; handle: string } | null;
      submitScore: (game: string, score: number, opts?: { nickname?: string }) => Promise<{ success: boolean; rank: number }>;
      getLeaderboard: (game: string, limit?: number) => Promise<Array<{ rank: number; name: string; score: number; isRegistered: boolean }>>;
      login: (handle: string, code: string) => Promise<{ success: boolean; user?: { id: number; handle: string }; error?: string }>;
      register: (handle: string, code: string) => Promise<{ success: boolean; user?: { id: number; handle: string }; error?: string }>;
      checkHandle: (handle: string) => Promise<{ exists: boolean }>;
      logout: () => void;
      ShareButton: (containerId: string, opts: { url: string; text: string; style?: 'button' | 'icon' | 'minimal' }) => void;
      showToast: (message: string, duration?: number) => void;
    };
  }
}

export default function RainGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<'start' | 'playing' | 'gameover' | 'leaderboard' | 'auth'>('start');
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [leaderboard, setLeaderboard] = useState<Array<{ rank: number; name: string; score: number; isRegistered: boolean }>>([]);
  const [submitStatus, setSubmitStatus] = useState<string>('');
  const [playerName, setPlayerName] = useState('');
  const [user, setUser] = useState<{ id: number; handle: string } | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [socialLoaded, setSocialLoaded] = useState(false);

  // Auth state
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authHandle, setAuthHandle] = useState('');
  const [authCode, setAuthCode] = useState('');
  const [authError, setAuthError] = useState('');

  // Game refs
  const gameRef = useRef({
    running: false,
    score: 0,
    lives: 3,
    drops: [] as Drop[],
    particles: [] as Particle[],
    basket: { x: 0, width: 80, height: 50 },
    targetX: 0,
    dropSpeed: 2,
    spawnRate: 1000,
    lastSpawn: 0,
    audioCtx: null as AudioContext | null,
    masterGain: null as GainNode | null,
    screenShake: { x: 0, y: 0, intensity: 0 },
    // Music state
    musicPlaying: false,
    musicInterval: null as NodeJS.Timeout | null,
    musicStep: 0,
    padStep: 0,
  });

  const GAME_ID = 'rain';

  // Initialize user from social lib
  useEffect(() => {
    if (socialLoaded && window.PixelpitSocial) {
      const u = window.PixelpitSocial.getUser();
      setUser(u);
      const savedName = localStorage.getItem('pixelpit_guest_name');
      if (savedName) setPlayerName(savedName);
    }
  }, [socialLoaded]);

  // Initialize share button on game over
  useEffect(() => {
    if (gameState === 'gameover' && socialLoaded && window.PixelpitSocial) {
      setTimeout(() => {
        const container = document.getElementById('share-btn-container');
        if (container) {
          container.innerHTML = '';
          window.PixelpitSocial!.ShareButton('share-btn-container', {
            url: `${window.location.origin}/pixelpit/arcade/rain`,
            text: `I caught ${score} drops in RAIN! Can you beat me?`,
            style: 'minimal',
          });
        }
      }, 100);
    }
  }, [gameState, socialLoaded, score]);

  // Audio
  const initAudio = () => {
    const game = gameRef.current;
    if (game.audioCtx) return;
    game.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    game.masterGain = game.audioCtx.createGain();
    game.masterGain.connect(game.audioCtx.destination);
    game.masterGain.gain.value = soundEnabled ? 1 : 0;
  };

  // Filtered sound helper - modern, soft
  const playSoftSound = (freq: number, dur: number, type: OscillatorType, vol: number, cutoff: number) => {
    const game = gameRef.current;
    if (!game.audioCtx || !soundEnabled || !game.masterGain) return;
    const osc = game.audioCtx.createOscillator();
    const flt = game.audioCtx.createBiquadFilter();
    const gain = game.audioCtx.createGain();
    osc.connect(flt);
    flt.connect(gain);
    gain.connect(game.masterGain);
    osc.type = type;
    osc.frequency.value = freq;
    flt.type = 'lowpass';
    flt.frequency.value = cutoff;
    gain.gain.setValueAtTime(vol, game.audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, game.audioCtx.currentTime + dur);
    osc.start();
    osc.stop(game.audioCtx.currentTime + dur);
  };

  // Modern SFX - soft, warm
  const catchSound = () => {
    playSoftSound(600, 0.12, 'sine', 0.1, 2500);
    setTimeout(() => playSoftSound(800, 0.15, 'sine', 0.07, 2000), 70);
  };

  const missSound = () => {
    const game = gameRef.current;
    if (!game.audioCtx || !soundEnabled || !game.masterGain) return;
    // Soft thud
    const len = game.audioCtx.sampleRate * 0.2;
    const buf = game.audioCtx.createBuffer(1, len, game.audioCtx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) * 0.5;
    const src = game.audioCtx.createBufferSource();
    src.buffer = buf;
    const flt = game.audioCtx.createBiquadFilter();
    flt.type = 'lowpass';
    flt.frequency.value = 300;
    const gn = game.audioCtx.createGain();
    gn.gain.setValueAtTime(0.1, game.audioCtx.currentTime);
    gn.gain.exponentialRampToValueAtTime(0.001, game.audioCtx.currentTime + 0.2);
    src.connect(flt);
    flt.connect(gn);
    gn.connect(game.masterGain);
    src.start();
    playSoftSound(80, 0.25, 'sine', 0.12, 120);
  };

  const gameOverSound = () => {
    playSoftSound(220, 0.3, 'sine', 0.12, 1000);
    setTimeout(() => playSoftSound(165, 0.4, 'sine', 0.1, 800), 250);
    setTimeout(() => playSoftSound(110, 0.5, 'sine', 0.08, 600), 550);
  };

  // ===== MUSIC ENGINE - Chill ambient, same studio as BEAM =====
  const MUSIC = {
    bpm: 100, // slower, dreamy
    // Warm sub bass - pentatonic feel
    bass: [55, 0, 0, 0, 55, 0, 0, 0, 73.42, 0, 0, 0, 65.41, 0, 0, 0],
    // Soft pad chords (Fmaj7, Am7, Dm7, Em7)
    pads: [
      [174.61, 220, 261.63, 329.63], // Fmaj7
      [220, 261.63, 329.63, 392],     // Am7
      [146.83, 174.61, 220, 261.63],  // Dm7
      [164.81, 196, 246.94, 293.66],  // Em7
    ],
    // Gentle kick on 1 and 3
    kick: [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0],
    // Soft shaker
    shaker: [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0],
  };

  const playMusicKick = () => {
    const game = gameRef.current;
    if (!game.audioCtx || !game.masterGain) return;
    const osc = game.audioCtx.createOscillator();
    const gain = game.audioCtx.createGain();
    osc.connect(gain);
    gain.connect(game.masterGain);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(80, game.audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40, game.audioCtx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.15, game.audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, game.audioCtx.currentTime + 0.25);
    osc.start();
    osc.stop(game.audioCtx.currentTime + 0.25);
  };

  const playShaker = () => {
    const game = gameRef.current;
    if (!game.audioCtx || !game.masterGain) return;
    const len = game.audioCtx.sampleRate * 0.03;
    const buf = game.audioCtx.createBuffer(1, len, game.audioCtx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = game.audioCtx.createBufferSource();
    src.buffer = buf;
    const hp = game.audioCtx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 6000;
    const lp = game.audioCtx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 10000;
    const gn = game.audioCtx.createGain();
    gn.gain.setValueAtTime(0.04, game.audioCtx.currentTime);
    gn.gain.exponentialRampToValueAtTime(0.001, game.audioCtx.currentTime + 0.04);
    src.connect(hp);
    hp.connect(lp);
    lp.connect(gn);
    gn.connect(game.masterGain);
    src.start();
  };

  const playMusicBass = (freq: number) => {
    const game = gameRef.current;
    if (!game.audioCtx || !game.masterGain || freq === 0) return;
    const osc = game.audioCtx.createOscillator();
    const flt = game.audioCtx.createBiquadFilter();
    const gn = game.audioCtx.createGain();
    osc.connect(flt);
    flt.connect(gn);
    gn.connect(game.masterGain);
    osc.type = 'sine';
    osc.frequency.value = freq;
    flt.type = 'lowpass';
    flt.frequency.value = 150;
    gn.gain.setValueAtTime(0.12, game.audioCtx.currentTime);
    gn.gain.exponentialRampToValueAtTime(0.001, game.audioCtx.currentTime + 0.2);
    osc.start();
    osc.stop(game.audioCtx.currentTime + 0.25);
  };

  const playPad = (freqs: number[]) => {
    const game = gameRef.current;
    if (!game.audioCtx || !game.masterGain) return;
    // Play every 4th step (whole note feel)
    if (game.padStep % 4 !== 0) return;
    freqs.forEach((freq, i) => {
      setTimeout(() => {
        if (!game.audioCtx || !game.masterGain) return;
        const osc = game.audioCtx.createOscillator();
        const flt = game.audioCtx.createBiquadFilter();
        const gn = game.audioCtx.createGain();
        osc.connect(flt);
        flt.connect(gn);
        gn.connect(game.masterGain);
        osc.type = 'sine';
        osc.frequency.value = freq;
        flt.type = 'lowpass';
        flt.frequency.value = 1200;
        gn.gain.setValueAtTime(0.025, game.audioCtx.currentTime);
        gn.gain.exponentialRampToValueAtTime(0.001, game.audioCtx.currentTime + 1.5);
        osc.start();
        osc.stop(game.audioCtx.currentTime + 1.8);
      }, i * 30); // slight strum
    });
  };

  const musicTick = () => {
    const game = gameRef.current;
    if (!game.audioCtx || !game.musicPlaying) return;
    if (MUSIC.kick[game.musicStep % 16]) playMusicKick();
    if (MUSIC.shaker[game.musicStep % 16]) playShaker();
    if (game.musicStep % 2 === 0) playMusicBass(MUSIC.bass[(game.musicStep / 2) % 16]);
    const chordIndex = Math.floor(game.musicStep / 16) % 4;
    playPad(MUSIC.pads[chordIndex]);
    game.padStep++;
    game.musicStep++;
  };

  const startMusic = () => {
    const game = gameRef.current;
    if (game.musicPlaying) return;
    initAudio();
    if (game.audioCtx?.state === 'suspended') game.audioCtx.resume();
    game.musicPlaying = true;
    game.musicStep = 0;
    game.padStep = 0;
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

  // Game logic
  const startGame = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    initAudio();
    const game = gameRef.current;
    if (game.audioCtx?.state === 'suspended') game.audioCtx.resume();

    game.basket.x = canvas.width / 2 - game.basket.width / 2;
    game.targetX = game.basket.x;
    game.drops = [];
    game.particles = [];
    game.score = 0;
    game.lives = 3;
    game.dropSpeed = 2;
    game.spawnRate = 1000;
    game.lastSpawn = 0;
    game.running = true;

    setScore(0);
    setLives(3);
    setGameState('playing');
    startMusic();
  };

  const spawnDrop = (canvasWidth: number) => {
    const game = gameRef.current;
    game.drops.push({
      x: Math.random() * (canvasWidth - 20),
      y: -30,
      speed: game.dropSpeed,
    });
  };

  const createParticles = (x: number, y: number) => {
    const game = gameRef.current;
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2 * i) / 8;
      const velocity = 2 + Math.random() * 2;
      game.particles.push({
        x,
        y,
        vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity - 2,
        life: 30,
        maxLife: 30,
      });
    }
  };

  const gameOver = () => {
    const game = gameRef.current;
    game.running = false;
    game.screenShake.intensity = 20;
    stopMusic();
    gameOverSound();
    setScore(game.score);
    setTimeout(() => setGameState('gameover'), 400);
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
    };
    resize();
    window.addEventListener('resize', resize);

    let animationId: number;
    let mouseX = canvas.width / 2;

    const handleMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX;
    };

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      mouseX = e.touches[0].clientX;
    };

    const handleTouchStart = (e: TouchEvent) => {
      mouseX = e.touches[0].clientX;
    };

    const update = (timestamp: number) => {
      const game = gameRef.current;
      if (!game.running) return;

      // Update basket position (smooth follow)
      const targetX = mouseX - game.basket.width / 2;
      game.basket.x += (targetX - game.basket.x) * 0.15;
      game.basket.x = Math.max(0, Math.min(canvas.width - game.basket.width, game.basket.x));

      // Spawn drops
      if (timestamp - game.lastSpawn > game.spawnRate) {
        spawnDrop(canvas.width);
        game.lastSpawn = timestamp;
      }

      // Update drops
      const basketTop = canvas.height - 100;
      const basketBottom = canvas.height - 50;

      for (let i = game.drops.length - 1; i >= 0; i--) {
        const drop = game.drops[i];
        drop.y += drop.speed;

        // Check collision with basket
        if (drop.y + 28 > basketTop && drop.y < basketBottom) {
          if (drop.x + 10 > game.basket.x && drop.x + 10 < game.basket.x + game.basket.width) {
            // Caught!
            game.score++;
            setScore(game.score);
            catchSound();
            createParticles(drop.x + 10, drop.y + 14);
            game.drops.splice(i, 1);

            // Increase difficulty every 10 catches
            if (game.score % 10 === 0) {
              game.dropSpeed += 0.3;
              game.spawnRate = Math.max(400, game.spawnRate - 50);
            }
            continue;
          }
        }

        // Check if missed (hit bottom)
        if (drop.y > canvas.height) {
          game.lives--;
          setLives(game.lives);
          missSound();
          game.screenShake.intensity = 10;
          game.drops.splice(i, 1);

          if (game.lives === 0) {
            gameOver();
            return;
          }
        }
      }

      // Update particles
      game.particles = game.particles.filter(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.1;
        p.life--;
        return p.life > 0;
      });
    };

    const draw = () => {
      const game = gameRef.current;

      // Apply screen shake
      ctx.save();
      if (game.screenShake.intensity > 0) {
        const shakeX = (Math.random() - 0.5) * game.screenShake.intensity;
        const shakeY = (Math.random() - 0.5) * game.screenShake.intensity;
        ctx.translate(shakeX, shakeY);
        game.screenShake.intensity *= 0.9;
      }

      // Background
      ctx.fillStyle = THEME.bg;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Ambient glow at bottom
      const gradient = ctx.createLinearGradient(0, canvas.height - 200, 0, canvas.height);
      gradient.addColorStop(0, 'transparent');
      gradient.addColorStop(1, `${THEME.secondary}20`);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, canvas.height - 200, canvas.width, 200);

      // Draw particles
      game.particles.forEach(p => {
        const alpha = p.life / p.maxLife;
        ctx.fillStyle = `rgba(251, 191, 36, ${alpha})`; // gold
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
        ctx.fill();
      });

      // Draw drops (soft glow style)
      game.drops.forEach(drop => {
        ctx.shadowBlur = 10;
        ctx.shadowColor = THEME.accent;
        const grd = ctx.createRadialGradient(drop.x + 10, drop.y + 10, 0, drop.x + 10, drop.y + 14, 14);
        grd.addColorStop(0, THEME.highlight);
        grd.addColorStop(1, THEME.accent);
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.ellipse(drop.x + 10, drop.y + 14, 10, 14, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      // Draw basket (gradient style)
      const bx = game.basket.x;
      const by = canvas.height - 100;
      const bw = game.basket.width;

      ctx.fillStyle = THEME.secondary;
      ctx.fillRect(bx - 5, by, bw + 10, 3);

      const basketGrad = ctx.createLinearGradient(bx, by, bx, by + 50);
      basketGrad.addColorStop(0, THEME.secondary);
      basketGrad.addColorStop(1, `${THEME.secondary}80`);
      ctx.fillStyle = basketGrad;

      ctx.beginPath();
      ctx.moveTo(bx, by + 3);
      ctx.lineTo(bx + 10, by + 50);
      ctx.lineTo(bx + bw - 10, by + 50);
      ctx.lineTo(bx + bw, by + 3);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = THEME.secondary;
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.restore();
    };

    const gameLoop = (timestamp: number) => {
      update(timestamp);
      draw();
      animationId = requestAnimationFrame(gameLoop);
    };

    gameLoop(0);

    document.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchstart', handleTouchStart);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resize);
      document.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('touchmove', handleTouchMove);
      canvas.removeEventListener('touchstart', handleTouchStart);
      stopMusic();
    };
  }, []);

  // Leaderboard functions
  const loadLeaderboard = async () => {
    if (!window.PixelpitSocial) return;
    try {
      const lb = await window.PixelpitSocial.getLeaderboard(GAME_ID, 10);
      setLeaderboard(lb);
    } catch (e) {
      console.error('Failed to load leaderboard', e);
    }
  };

  const submitScore = async () => {
    if (!window.PixelpitSocial) return;

    const currentUser = window.PixelpitSocial.getUser();

    if (currentUser) {
      setSubmitStatus('Submitting...');
      try {
        const result = await window.PixelpitSocial.submitScore(GAME_ID, score);
        if (result.success) {
          setSubmitStatus(`Rank #${result.rank}!`);
        } else {
          setSubmitStatus('Failed to submit');
        }
      } catch (e) {
        setSubmitStatus('Network error');
      }
    } else {
      if (!playerName.trim()) {
        setSubmitStatus('Enter a name first!');
        return;
      }
      setSubmitStatus('Submitting...');
      localStorage.setItem('pixelpit_guest_name', playerName);
      try {
        const result = await window.PixelpitSocial.submitScore(GAME_ID, score, { nickname: playerName });
        if (result.success) {
          setSubmitStatus(`Rank #${result.rank}!`);
        } else {
          setSubmitStatus('Failed to submit');
        }
      } catch (e) {
        setSubmitStatus('Network error');
      }
    }
  };

  const handleAuth = async () => {
    if (!window.PixelpitSocial) return;
    setAuthError('');

    if (authMode === 'register') {
      const result = await window.PixelpitSocial.register(authHandle, authCode);
      if (result.success && result.user) {
        setUser(result.user);
        setGameState('gameover');
      } else {
        setAuthError(result.error || 'Registration failed');
      }
    } else {
      const result = await window.PixelpitSocial.login(authHandle, authCode);
      if (result.success && result.user) {
        setUser(result.user);
        setGameState('gameover');
      } else {
        setAuthError(result.error || 'Login failed');
      }
    }
  };

  return (
    <>
      <Script
        src="/pixelpit/social.js"
        onLoad={() => setSocialLoaded(true)}
      />

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&display=swap');

        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          background: ${COLORS.black};
          color: ${COLORS.amber};
          font-family: 'Space Mono', monospace;
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
          transform: translateY(0);
          filter: brightness(0.95);
        }

        .btn-primary {
          animation: btnPulse 2s ease-in-out infinite;
        }
        @keyframes btnPulse {
          0%, 100% { box-shadow: 0 0 20px ${COLORS.teal}60; }
          50% { box-shadow: 0 0 35px ${COLORS.teal}90; }
        }

        @keyframes textGlow {
          0%, 100% { text-shadow: 0 0 20px currentColor; }
          50% { text-shadow: 0 0 40px currentColor, 0 0 60px currentColor; }
        }
        .glow-text {
          animation: textGlow 2s ease-in-out infinite;
        }

        input:focus {
          outline: none;
          box-shadow: 0 0 20px ${COLORS.gold}50;
        }

        .heart {
          transition: opacity 0.3s;
        }
        .heart.lost {
          opacity: 0.2;
        }
      `}</style>

      <canvas
        ref={canvasRef}
        style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', cursor: 'none' }}
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
          background: 'rgba(0,0,0,0.6)',
          border: `1px solid ${COLORS.amber}40`,
          borderRadius: 8,
          padding: '8px 12px',
          color: COLORS.amber,
          fontFamily: "'Space Mono', monospace",
          fontSize: 12,
          cursor: 'pointer',
          opacity: soundEnabled ? 1 : 0.5,
        }}
      >
        {soundEnabled ? '♪' : '♪̶'}
      </button>

      {/* HUD */}
      {gameState === 'playing' && (
        <div style={{
          position: 'fixed',
          top: 20,
          left: 20,
          right: 120,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          zIndex: 10,
          pointerEvents: 'none',
        }}>
          <div style={{
            fontSize: 24,
            fontWeight: 700,
            color: THEME.highlight,
            textShadow: `0 0 20px ${THEME.highlight}80`,
          }}>
            {score}
          </div>
          <div style={{
            fontSize: 18,
            color: THEME.secondary,
            display: 'flex',
            gap: 8,
          }}>
            {[0, 1, 2].map(i => (
              <span
                key={i}
                className={`heart ${i >= lives ? 'lost' : ''}`}
                style={{ textShadow: i < lives ? `0 0 10px ${THEME.secondary}` : 'none' }}
              >
                ♥
              </span>
            ))}
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
          background: `rgba(0,0,0,0.95)`,
          zIndex: 100,
          textAlign: 'center',
          padding: 40,
          gap: 20,
        }}>
          <h1 style={{
            fontSize: 48,
            color: COLORS.gold,
            textShadow: `0 0 30px ${COLORS.gold}80`,
            marginBottom: 10,
          }}>
            RAIN
          </h1>
          <div style={{
            fontSize: 16,
            color: COLORS.amber,
            marginBottom: 20,
          }}>
            Catch the falling light
          </div>
          <div style={{
            fontSize: 14,
            color: COLORS.amber,
            maxWidth: 300,
            lineHeight: 1.8,
            opacity: 0.8,
          }}>
            Move to catch amber drops.<br />
            Don't let them hit the ground.<br />
            Three lives. How many can you catch?
          </div>
          <button
            className="btn-primary"
            onClick={startGame}
            style={{
              background: THEME.secondary,
              color: THEME.bg,
              border: 'none',
              padding: '15px 40px',
              fontSize: 18,
              fontWeight: 700,
              borderRadius: 8,
              cursor: 'pointer',
              marginTop: 20,
            }}
          >
            START
          </button>
          <div style={{
            marginTop: 30,
            fontSize: 10,
            fontFamily: "'Space Mono', monospace",
            opacity: 0.6,
          }}>
            <span style={{ color: '#ec4899' }}>PIXEL</span>
            <span style={{ color: '#22d3ee' }}>PIT</span>
            <span style={{ color: COLORS.gold }}> ARCADE</span>
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
          background: `rgba(0,0,0,0.95)`,
          zIndex: 100,
          textAlign: 'center',
          padding: 40,
        }}>
          <h1 style={{
            fontSize: 36,
            color: COLORS.amber,
            marginBottom: 15,
            textShadow: `0 0 30px ${COLORS.amber}80`,
          }}>
            GAME OVER
          </h1>
          <div className="glow-text" style={{
            fontSize: 64,
            fontWeight: 700,
            color: COLORS.gold,
            marginBottom: 30,
            textShadow: `0 0 40px ${COLORS.gold}`,
          }}>
            {score}
          </div>

          {/* Score Submission */}
          <div style={{ marginBottom: 20, width: '100%', maxWidth: 300 }}>
            {user ? (
              <div style={{ color: COLORS.teal, marginBottom: 10 }}>
                Playing as @{user.handle}
              </div>
            ) : (
              <input
                type="text"
                placeholder="YOUR NAME"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                maxLength={20}
                style={{
                  width: '100%',
                  padding: '15px 20px',
                  fontSize: 16,
                  fontFamily: "'Space Mono', monospace",
                  background: `${COLORS.gold}15`,
                  border: `2px solid ${COLORS.gold}`,
                  color: COLORS.gold,
                  textAlign: 'center',
                  letterSpacing: 2,
                  marginBottom: 10,
                }}
              />
            )}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button
                onClick={submitScore}
                style={{
                  background: COLORS.gold,
                  color: COLORS.black,
                  border: 'none',
                  padding: '12px 25px',
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: 'pointer',
                  borderRadius: 4,
                }}
              >
                SUBMIT
              </button>
              {!user && (
                <button
                  onClick={() => setGameState('auth')}
                  style={{
                    background: 'transparent',
                    border: `2px solid ${COLORS.amber}`,
                    color: COLORS.amber,
                    padding: '12px 20px',
                    fontSize: 12,
                    cursor: 'pointer',
                    borderRadius: 4,
                  }}
                >
                  LOGIN
                </button>
              )}
            </div>
            {submitStatus && (
              <div style={{
                marginTop: 10,
                color: submitStatus.includes('#') ? COLORS.teal : COLORS.amber,
                fontSize: 14,
              }}>
                {submitStatus}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 15, alignItems: 'center' }}>
            <button
              className="btn-primary"
              onClick={startGame}
              style={{
                background: THEME.secondary,
                color: THEME.bg,
                border: 'none',
                padding: '15px 40px',
                fontSize: 16,
                fontWeight: 700,
                cursor: 'pointer',
                borderRadius: 8,
              }}
            >
              PLAY AGAIN
            </button>
            <button
              onClick={() => {
                setGameState('leaderboard');
                loadLeaderboard();
              }}
              style={{
                background: 'transparent',
                border: `2px solid ${THEME.accent}60`,
                color: THEME.accent,
                padding: '12px 30px',
                fontSize: 12,
                cursor: 'pointer',
                borderRadius: 4,
              }}
            >
              LEADERBOARD
            </button>
            <div id="share-btn-container" style={{ marginTop: 10 }} />
          </div>
        </div>
      )}

      {/* Leaderboard Screen */}
      {gameState === 'leaderboard' && (
        <div style={{
          position: 'fixed',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: `rgba(0,0,0,0.98)`,
          zIndex: 100,
          padding: 40,
        }}>
          <h2 style={{
            fontSize: 24,
            color: COLORS.gold,
            marginBottom: 30,
            letterSpacing: 4,
          }}>
            LEADERBOARD
          </h2>
          <div style={{ width: '100%', maxWidth: 400, marginBottom: 30 }}>
            {leaderboard.length === 0 ? (
              <div style={{ color: COLORS.amber, textAlign: 'center', padding: 40, opacity: 0.6 }}>
                No scores yet. Be the first!
              </div>
            ) : (
              leaderboard.map((entry, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px 20px',
                    borderBottom: `1px solid ${COLORS.amber}20`,
                    background: i === 0 ? `${COLORS.gold}15` : 'transparent',
                  }}
                >
                  <span style={{ width: 30, color: i === 0 ? COLORS.gold : `${COLORS.amber}60` }}>
                    {i + 1}
                  </span>
                  <span style={{
                    flex: 1,
                    paddingLeft: 15,
                    color: entry.isRegistered ? COLORS.amber : COLORS.gold,
                    fontStyle: entry.isRegistered ? 'normal' : 'italic',
                  }}>
                    {entry.isRegistered ? `@${entry.name}` : entry.name}
                  </span>
                  <span style={{ fontWeight: 700, color: COLORS.teal, fontSize: 18 }}>
                    {entry.score.toLocaleString()}
                  </span>
                </div>
              ))
            )}
          </div>
          <button
            onClick={() => setGameState('gameover')}
            style={{
              background: COLORS.teal,
              color: COLORS.black,
              border: 'none',
              padding: '14px 35px',
              fontSize: 14,
              fontWeight: 700,
              cursor: 'pointer',
              borderRadius: 4,
            }}
          >
            BACK
          </button>
        </div>
      )}

      {/* Auth Screen */}
      {gameState === 'auth' && (
        <div style={{
          position: 'fixed',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: `rgba(0,0,0,0.98)`,
          zIndex: 100,
          padding: 40,
        }}>
          <h2 style={{
            fontSize: 20,
            color: COLORS.teal,
            marginBottom: 30,
            letterSpacing: 2,
          }}>
            {authMode === 'login' ? 'LOGIN' : 'SIGN UP'}
          </h2>

          <div style={{ width: '100%', maxWidth: 300, marginBottom: 20 }}>
            <input
              type="text"
              placeholder="Handle"
              value={authHandle}
              onChange={(e) => setAuthHandle(e.target.value)}
              maxLength={20}
              style={{
                width: '100%',
                padding: '15px 20px',
                fontSize: 16,
                fontFamily: "'Space Mono', monospace",
                background: `${COLORS.teal}20`,
                border: `2px solid ${COLORS.teal}`,
                color: COLORS.amber,
                marginBottom: 10,
              }}
            />
            <input
              type="text"
              placeholder="4-digit code"
              value={authCode}
              onChange={(e) => setAuthCode(e.target.value)}
              maxLength={4}
              style={{
                width: '100%',
                padding: '15px 20px',
                fontSize: 16,
                fontFamily: "'Space Mono', monospace",
                background: `${COLORS.teal}20`,
                border: `2px solid ${COLORS.teal}`,
                color: COLORS.amber,
                marginBottom: 10,
                letterSpacing: 8,
                textAlign: 'center',
              }}
            />
            {authError && (
              <div style={{ color: '#FF6B6B', fontSize: 14, marginBottom: 10 }}>
                {authError}
              </div>
            )}
            <button
              onClick={handleAuth}
              style={{
                width: '100%',
                background: COLORS.teal,
                color: COLORS.black,
                border: 'none',
                padding: '15px',
                fontSize: 14,
                fontWeight: 700,
                cursor: 'pointer',
                marginBottom: 15,
              }}
            >
              {authMode === 'login' ? 'LOGIN' : 'CREATE ACCOUNT'}
            </button>
            <button
              onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
              style={{
                width: '100%',
                background: 'transparent',
                border: `1px solid ${COLORS.amber}40`,
                color: COLORS.amber,
                padding: '10px',
                fontSize: 12,
                cursor: 'pointer',
              }}
            >
              {authMode === 'login' ? 'Need an account? Sign up' : 'Have an account? Login'}
            </button>
          </div>

          <button
            onClick={() => setGameState('gameover')}
            style={{
              background: 'transparent',
              border: `2px solid ${COLORS.amber}`,
              color: COLORS.amber,
              padding: '12px 30px',
              fontSize: 12,
              cursor: 'pointer',
              marginTop: 20,
              borderRadius: 4,
            }}
          >
            BACK
          </button>
        </div>
      )}
    </>
  );
}
