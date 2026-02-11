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
} from '@/app/pixelpit/components';

const GAME_ID = 'swoop-ci';

// PLAYROOM theme colors
const ZONES = [
  { name: 'Morning Sky', sky1: '#87CEEB', sky2: '#f0f9ff', clouds: '#ffffff', loopStroke: '#18181b', loopAccent: '#22d3ee' },
  { name: 'Golden Hour', sky1: '#fcd34d', sky2: '#fb923c', clouds: '#fef3c7', loopStroke: '#18181b', loopAccent: '#facc15' },
  { name: 'Twilight', sky1: '#a78bfa', sky2: '#4c1d95', clouds: '#c4b5fd', loopStroke: '#18181b', loopAccent: '#d946ef' },
  { name: 'Night Flight', sky1: '#1e1b4b', sky2: '#000000', clouds: '#334155', loopStroke: '#facc15', loopAccent: '#22d3ee' },
];

const ZONE_THRESHOLDS = [0, 1000, 2500, 4000];

// Social colors
const SCORE_FLOW_COLORS: ScoreFlowColors = {
  bg: '#f0f9ff',
  surface: '#ffffff',
  primary: '#facc15',
  secondary: '#22d3ee',
  text: '#18181b',
  muted: '#64748b',
  error: '#ef4444',
};

const LEADERBOARD_COLORS: LeaderboardColors = {
  bg: '#1e1b4b',
  surface: '#27264a',
  primary: '#facc15',
  secondary: '#22d3ee',
  text: '#f0f9ff',
  muted: '#94a3b8',
};

// Physics (from Loop's spec)
const GRAVITY = 0.35;
const BOOST_FORCE = 0.6;
const BOOST_FORWARD = 0.2;
const MAX_VELOCITY = 12;
const ROTATION_SPEED = 4; // degrees per frame

// Audio
let audioCtx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let musicGain: GainNode | null = null;
let musicPlaying = false;

function initAudio() {
  if (audioCtx) return;
  audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  masterGain = audioCtx.createGain();
  masterGain.gain.value = 0.4;
  masterGain.connect(audioCtx.destination);
  musicGain = audioCtx.createGain();
  musicGain.gain.value = 0.12;
  musicGain.connect(masterGain);
  if (audioCtx.state === 'suspended') audioCtx.resume();
}

function startMusic() {
  if (!audioCtx || !musicGain || musicPlaying) return;
  musicPlaying = true;

  const bpm = 90;
  const beatMs = 60000 / bpm;
  const notes = [392, 494, 587, 784]; // G4, B4, D5, G5
  let noteIndex = 0;

  function playNote() {
    if (!audioCtx || !musicGain || !musicPlaying) return;

    const t = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = notes[noteIndex % notes.length];

    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.4);

    osc.connect(gain);
    gain.connect(musicGain!);
    osc.start(t);
    osc.stop(t + 0.45);

    noteIndex++;
    if (musicPlaying) {
      setTimeout(playNote, beatMs / 2);
    }
  }

  playNote();
}

function stopMusic() {
  musicPlaying = false;
}

function playBoost(altitude: number) {
  if (!audioCtx || !masterGain) return;
  const t = audioCtx.currentTime;
  const baseFreq = 400 + altitude * 2;
  const osc = audioCtx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(baseFreq, t);
  osc.frequency.linearRampToValueAtTime(baseFreq + 100, t + 0.1);
  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(0.1, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
  osc.connect(gain);
  gain.connect(masterGain);
  osc.start(t);
  osc.stop(t + 0.15);
}

function playPerfectLoop() {
  if (!audioCtx || !masterGain) return;
  const t = audioCtx.currentTime;
  [523.25, 659.25, 783.99].forEach((freq, i) => {
    const osc = audioCtx!.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;
    const gain = audioCtx!.createGain();
    gain.gain.setValueAtTime(0, t + i * 0.05);
    gain.gain.linearRampToValueAtTime(0.15, t + i * 0.05 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.05 + 0.2);
    osc.connect(gain);
    gain.connect(masterGain!);
    osc.start(t + i * 0.05);
    osc.stop(t + i * 0.05 + 0.25);
  });
}

function playGoodLoop() {
  if (!audioCtx || !masterGain) return;
  const t = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  osc.type = 'sine';
  osc.frequency.value = 587.33;
  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(0.1, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
  osc.connect(gain);
  gain.connect(masterGain);
  osc.start(t);
  osc.stop(t + 0.2);
}

function playMiss() {
  if (!audioCtx || !masterGain) return;
  const t = audioCtx.currentTime;
  // Bonk
  const osc = audioCtx.createOscillator();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(200, t);
  osc.frequency.exponentialRampToValueAtTime(80, t + 0.3);
  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(0.2, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
  osc.connect(gain);
  gain.connect(masterGain);
  osc.start(t);
  osc.stop(t + 0.4);
}

interface Loop {
  x: number;
  y: number;
  radius: number;
  color: string;
  passed: boolean;
  type: 'single' | 'double' | 'dive';
}

interface Bird {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  boosting: boolean;
  scale: { x: number; y: number };
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  type: 'feather' | 'sparkle' | 'trail';
}

interface Cloud {
  x: number;
  y: number;
  size: number;
  speed: number;
}

export default function SwoopCiGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<'start' | 'playing' | 'end'>('start');
  const [canvasSize, setCanvasSize] = useState({ w: 400, h: 700 });

  // Social
  const [socialLoaded, setSocialLoaded] = useState(false);
  const [submittedEntryId, setSubmittedEntryId] = useState<number | null>(null);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  const [gameCompleted, setGameCompleted] = useState(false);

  const { user } = usePixelpitSocial(socialLoaded);
  const [showShareModal, setShowShareModal] = useState(false);

  const GAME_URL = typeof window !== 'undefined'
    ? `${window.location.origin}/pixelpit/arcade/swoop-ci`
    : 'https://pixelpit.gg/pixelpit/arcade/swoop-ci';

  const GAME_DURATION = 60; // 60 second game

  const gameRef = useRef({
    running: false,
    distance: 0,
    score: 0,
    combo: 0,
    loopsPassed: 0,
    timeRemaining: GAME_DURATION,
    comboPopup: null as { text: string; y: number; alpha: number } | null,
    bird: {
      x: 100,
      y: 300,
      vx: 3,
      vy: 0,
      rotation: 0,
      boosting: false,
      scale: { x: 1, y: 1 },
    } as Bird,
    loops: [] as Loop[],
    particles: [] as Particle[],
    clouds: [] as Cloud[],
    camera: { x: 0 },
    lastLoopX: 0,
    zone: 0,
    boostSoundTimer: 0,
  });

  const getFibonacci = (n: number): number => {
    const fib = [1, 2, 3, 5, 8, 13, 21, 34, 55, 89];
    return fib[Math.min(n, fib.length - 1)];
  };

  const getSpeedMultiplier = useCallback((distance: number) => {
    if (distance >= 3000) return 1.6;
    if (distance >= 1500) return 1.4;
    if (distance >= 500) return 1.2;
    return 1.0;
  }, []);

  const getLoopSpacing = useCallback((distance: number) => {
    if (distance >= 3000) return 250;
    if (distance >= 1500) return 300;
    if (distance >= 500) return 350;
    return 400;
  }, []);

  const getZone = useCallback((distance: number) => {
    for (let i = ZONE_THRESHOLDS.length - 1; i >= 0; i--) {
      if (distance >= ZONE_THRESHOLDS[i]) return i;
    }
    return 0;
  }, []);

  const spawnLoop = useCallback((x: number, distance: number) => {
    const game = gameRef.current;
    const colors = ['#d946ef', '#22d3ee', '#facc15', '#34d399'];

    // Determine loop type based on distance
    let type: Loop['type'] = 'single';
    if (distance >= 3000 && Math.random() < 0.3) {
      type = Math.random() < 0.5 ? 'double' : 'dive';
    } else if (distance >= 1500 && Math.random() < 0.2) {
      type = 'dive';
    } else if (distance >= 500 && Math.random() < 0.15) {
      type = 'double';
    }

    // Breather every 10 loops
    const isBreather = game.loopsPassed > 0 && game.loopsPassed % 10 === 0;
    const radius = isBreather ? 60 : 40;

    // Y position varies
    const baseY = canvasSize.h * 0.5;
    const variance = type === 'dive' ? -100 : (Math.random() - 0.5) * 200;
    const y = Math.max(100, Math.min(canvasSize.h - 100, baseY + variance));

    game.loops.push({
      x,
      y,
      radius,
      color: colors[Math.floor(Math.random() * colors.length)],
      passed: false,
      type,
    });

    // For double loops, add a second one
    if (type === 'double') {
      game.loops.push({
        x: x + 120,
        y: y + (Math.random() - 0.5) * 80,
        radius: 40,
        color: colors[Math.floor(Math.random() * colors.length)],
        passed: false,
        type: 'single',
      });
    }

    return x + (type === 'double' ? 120 : 0);
  }, [canvasSize.h]);

  const startGame = useCallback(() => {
    initAudio();
    startMusic();

    const game = gameRef.current;
    game.running = true;
    game.distance = 0;
    game.score = 0;
    game.combo = 0;
    game.loopsPassed = 0;
    game.zone = 0;
    game.timeRemaining = GAME_DURATION;
    game.comboPopup = null;

    game.bird = {
      x: 100,
      y: canvasSize.h * 0.5,
      vx: 3,
      vy: 0,
      rotation: 0,
      boosting: false,
      scale: { x: 1, y: 1 },
    };

    game.loops = [];
    game.particles = [];
    game.camera = { x: 0 };
    game.lastLoopX = 300;

    // Spawn initial loops
    for (let i = 0; i < 5; i++) {
      game.lastLoopX = spawnLoop(game.lastLoopX + getLoopSpacing(0), 0);
    }

    // Spawn clouds
    game.clouds = [];
    for (let i = 0; i < 15; i++) {
      game.clouds.push({
        x: Math.random() * canvasSize.w * 3,
        y: Math.random() * canvasSize.h * 0.6,
        size: 30 + Math.random() * 50,
        speed: 0.3 + Math.random() * 0.2,
      });
    }

    setShowShareModal(false);
    setGameState('playing');
  }, [canvasSize, spawnLoop, getLoopSpacing]);

  // Handle resize
  useEffect(() => {
    const updateSize = () => {
      setCanvasSize({
        w: Math.min(window.innerWidth, 500),
        h: window.innerHeight,
      });
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = canvasSize.w;
    canvas.height = canvasSize.h;

    let animationId: number;
    let lastTime = 0;

    const update = (dt: number) => {
      const game = gameRef.current;
      if (!game.running) return;

      const speedMult = getSpeedMultiplier(game.distance);

      // Bird physics
      const bird = game.bird;

      if (bird.boosting) {
        bird.vy -= BOOST_FORCE * speedMult;
        bird.vx += BOOST_FORWARD * speedMult;
        bird.scale.x = 1.0;
        bird.scale.y = 1.2;

        // Boost sound
        game.boostSoundTimer -= dt;
        if (game.boostSoundTimer <= 0) {
          playBoost(canvasSize.h - bird.y);
          game.boostSoundTimer = 0.15;
        }

        // Trail particles
        if (Math.random() < 0.3) {
          game.particles.push({
            x: bird.x - 15,
            y: bird.y,
            vx: -2 - Math.random() * 2,
            vy: (Math.random() - 0.5) * 2,
            life: 0.5,
            color: '#facc15',
            type: 'trail',
          });
        }
      } else {
        bird.vy += GRAVITY * speedMult;
        bird.scale.x = 1.1;
        bird.scale.y = 0.9;
      }

      // Clamp velocity
      bird.vy = Math.max(-MAX_VELOCITY, Math.min(MAX_VELOCITY, bird.vy));
      bird.vx = Math.max(2, Math.min(8, bird.vx));

      // Move bird
      bird.y += bird.vy;
      bird.x += bird.vx;

      // Rotation toward velocity vector
      const targetAngle = Math.atan2(bird.vy, bird.vx) * (180 / Math.PI);
      const angleDiff = targetAngle - bird.rotation;
      bird.rotation += angleDiff * 0.15;

      // Update distance
      game.distance += bird.vx * speedMult;

      // Camera follows bird
      game.camera.x = bird.x - 100;

      // Check zone change
      const newZone = getZone(game.distance);
      if (newZone !== game.zone) {
        game.zone = newZone;
      }

      // Spawn new loops
      while (game.lastLoopX < game.camera.x + canvasSize.w + 200) {
        game.lastLoopX = spawnLoop(game.lastLoopX + getLoopSpacing(game.distance), game.distance);
      }

      // Check loop collisions
      for (const loop of game.loops) {
        if (loop.passed) continue;

        const dx = bird.x - loop.x;
        const dy = bird.y - loop.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Check if bird passed through loop
        if (dx > 0 && dx < 30) {
          const entryAngle = Math.abs(bird.rotation);
          const angleOK = entryAngle < 45; // ±45° from horizontal
          const inCenter = dist < loop.radius * 0.6;
          const inEdge = dist < loop.radius;

          if (inCenter) {
            // Perfect!
            loop.passed = true;
            game.combo++;
            const points = getFibonacci(game.combo - 1) * 10;
            game.score += points;
            game.loopsPassed++;
            playPerfectLoop();

            // Show combo popup
            if (game.combo >= 2) {
              game.comboPopup = {
                text: `+${points} 🔥${game.combo}x`,
                y: 0,
                alpha: 1,
              };
            }

            // Sparkle particles
            for (let i = 0; i < 8; i++) {
              game.particles.push({
                x: loop.x,
                y: loop.y,
                vx: (Math.random() - 0.5) * 6,
                vy: (Math.random() - 0.5) * 6,
                life: 0.6,
                color: '#fbbf24',
                type: 'sparkle',
              });
            }
          } else if (inEdge) {
            // Good (clipped edge)
            loop.passed = true;
            game.score += 10;
            game.loopsPassed++;
            playGoodLoop();

            // Small wobble
            bird.rotation += (Math.random() - 0.5) * 10;
          }
        }
      }

      // Remove old loops
      game.loops = game.loops.filter(l => l.x > game.camera.x - 100);

      // Timer countdown
      game.timeRemaining -= dt;
      if (game.timeRemaining <= 0) {
        game.timeRemaining = 0;
        endGame(true); // Time's up - successful completion
        return;
      }

      // Bounds check (crash)
      if (bird.y < -50 || bird.y > canvasSize.h + 50) {
        endGame(false); // Crashed
        return;
      }

      // Update particles
      game.particles = game.particles.filter(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.life -= dt * 2;
        return p.life > 0;
      });

      // Update combo popup
      if (game.comboPopup) {
        game.comboPopup.y -= dt * 60;
        game.comboPopup.alpha -= dt * 0.8;
        if (game.comboPopup.alpha <= 0) {
          game.comboPopup = null;
        }
      }

      // Update clouds (parallax)
      for (const cloud of game.clouds) {
        if (cloud.x < game.camera.x - cloud.size * 2) {
          cloud.x = game.camera.x + canvasSize.w + Math.random() * 200;
          cloud.y = Math.random() * canvasSize.h * 0.6;
        }
      }
    };

    const endGame = (completed: boolean = false) => {
      const game = gameRef.current;
      game.running = false;
      stopMusic();
      if (!completed) playMiss();

      setFinalScore(game.score);
      setGameCompleted(completed);
      setSubmittedEntryId(null);
      setShowLeaderboard(false);
      setGameState('end');

      fetch('/api/pixelpit/stats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ game: GAME_ID }),
      }).catch(() => {});
    };

    const drawBird = (bird: Bird, cameraX: number, isNightZone: boolean, combo: number) => {
      const x = bird.x - cameraX;
      const y = bird.y;

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(bird.rotation * Math.PI / 180);
      ctx.scale(bird.scale.x, bird.scale.y);

      // Combo glow (grows with streak) or Night zone glow
      if (combo >= 2 || isNightZone) {
        ctx.shadowColor = '#facc15';
        ctx.shadowBlur = isNightZone ? 8 : Math.min(4 + combo * 2, 20);
      }

      // Body (yellow circle)
      ctx.fillStyle = '#facc15';
      ctx.strokeStyle = '#18181b';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 15, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Reset shadow after body
      ctx.shadowBlur = 0;

      // Beak
      ctx.fillStyle = '#f97316';
      ctx.beginPath();
      ctx.moveTo(12, -3);
      ctx.lineTo(22, 0);
      ctx.lineTo(12, 3);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Eye
      ctx.fillStyle = '#18181b';
      ctx.beginPath();
      ctx.arc(5, -4, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(6, -5, 1.5, 0, Math.PI * 2);
      ctx.fill();

      // Wing
      ctx.fillStyle = '#fcd34d';
      ctx.beginPath();
      ctx.ellipse(-5, 5, 8, 5, bird.boosting ? -0.3 : 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.restore();
    };

    const drawLoop = (loop: Loop, cameraX: number, zone: typeof ZONES[0]) => {
      const x = loop.x - cameraX;
      const y = loop.y;

      // Outer glow
      ctx.strokeStyle = zone.loopAccent + '40';
      ctx.lineWidth = 12;
      ctx.beginPath();
      ctx.arc(x, y, loop.radius, 0, Math.PI * 2);
      ctx.stroke();

      // Main ring (gold in night zone, black otherwise)
      ctx.strokeStyle = zone.loopStroke;
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(x, y, loop.radius, 0, Math.PI * 2);
      ctx.stroke();

      // Color highlight (use zone accent)
      ctx.strokeStyle = zone.loopAccent;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(x, y, loop.radius, -Math.PI * 0.3, Math.PI * 0.3);
      ctx.stroke();
    };

    const draw = () => {
      const game = gameRef.current;
      const zone = ZONES[game.zone];

      // Sky gradient
      const skyGrad = ctx.createLinearGradient(0, 0, 0, canvasSize.h);
      skyGrad.addColorStop(0, zone.sky1);
      skyGrad.addColorStop(1, zone.sky2);
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, canvasSize.w, canvasSize.h);

      // Stars (night zone only)
      if (game.zone === 3) {
        ctx.fillStyle = '#fff';
        for (let i = 0; i < 50; i++) {
          const sx = ((i * 137.5 + game.camera.x * 0.1) % canvasSize.w);
          const sy = (i * 89.3) % (canvasSize.h * 0.7);
          ctx.beginPath();
          ctx.arc(sx, sy, 1, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Clouds (parallax)
      ctx.fillStyle = zone.clouds;
      for (const cloud of game.clouds) {
        const cx = cloud.x - game.camera.x * cloud.speed;
        const wrappedX = ((cx % (canvasSize.w + cloud.size * 2)) + canvasSize.w + cloud.size * 2) % (canvasSize.w + cloud.size * 2) - cloud.size;

        ctx.beginPath();
        ctx.arc(wrappedX, cloud.y, cloud.size * 0.5, 0, Math.PI * 2);
        ctx.arc(wrappedX + cloud.size * 0.3, cloud.y - cloud.size * 0.1, cloud.size * 0.4, 0, Math.PI * 2);
        ctx.arc(wrappedX + cloud.size * 0.6, cloud.y, cloud.size * 0.35, 0, Math.PI * 2);
        ctx.fill();
      }

      // Loops
      for (const loop of game.loops) {
        if (!loop.passed) {
          drawLoop(loop, game.camera.x, zone);
        }
      }

      // Particles
      for (const p of game.particles) {
        const px = p.x - game.camera.x;
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.life;
        if (p.type === 'sparkle') {
          ctx.beginPath();
          ctx.arc(px, p.y, 4, 0, Math.PI * 2);
          ctx.fill();
        } else if (p.type === 'trail') {
          ctx.beginPath();
          ctx.arc(px, p.y, 3, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillRect(px - 2, p.y - 2, 4, 4);
        }
        ctx.globalAlpha = 1;
      }

      // Bird
      drawBird(game.bird, game.camera.x, game.zone === 3, game.combo);

      // === HUD ===
      const hudColor = '#fde68a';  // soft gold — reads on all 4 zones
      const hudOutline = 'rgba(15, 15, 26, 0.65)';  // consistent dark cut-out

      // Helper: outlined text for readability over any sky
      const drawOutlined = (text: string, x: number, y: number, fill: string, fontSize: number, align: CanvasTextAlign = 'left', weight = 'bold') => {
        ctx.save();
        ctx.textAlign = align;
        ctx.font = `${weight} ${fontSize}px ui-rounded, system-ui, sans-serif`;
        ctx.strokeStyle = hudOutline;
        ctx.lineWidth = 4;
        ctx.lineJoin = 'round';
        ctx.strokeText(text, x, y);
        ctx.fillStyle = fill;
        ctx.fillText(text, x, y);
        ctx.restore();
      };

      // Shared HUD grid: all 3 items on the same baseline
      const hudBaseline = 50;
      const hudScoreSize = 48;  // SCORE - largest
      const hudSmallSize = 24;  // timer & combo - smaller
      const hudSecondaryY = 58;
      const hudPad = 20;

      // -- TIMER (top left, small) --
      const timeLeft = Math.ceil(game.timeRemaining);
      const timeFraction = game.timeRemaining / GAME_DURATION;
      const timerColor = timeLeft <= 10 ? '#ef4444' : timeLeft <= 20 ? '#f97316' : hudColor;

      if (timeLeft <= 10) {
        const pulse = (Math.sin(game.timeRemaining * 8) + 1) / 2;
        ctx.save();
        ctx.shadowColor = '#ef4444';
        ctx.shadowBlur = 6 + pulse * 14;
        drawOutlined(timeLeft.toString() + 's', hudPad, hudBaseline, timerColor, hudSmallSize, 'left', '900');
        ctx.restore();
      } else {
        drawOutlined(timeLeft.toString() + 's', hudPad, hudBaseline, hudColor, hudSmallSize, 'left', '900');
      }

      // Depleting bar under timer (left side)
      const barW = 50;
      const barH = 3;
      const barX = hudPad;
      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      ctx.beginPath();
      ctx.roundRect(barX, hudSecondaryY, barW, barH, 2);
      ctx.fill();
      const barColor = timeLeft <= 10 ? '#ef4444' : timeLeft <= 20 ? '#f97316' : hudColor;
      ctx.fillStyle = barColor;
      ctx.beginPath();
      ctx.roundRect(barX, hudSecondaryY, Math.max(0, barW * timeFraction), barH, 2);
      ctx.fill();

      // -- SCORE (top center, LARGE) --
      const scoreStr = game.score.toString();
      drawOutlined(scoreStr, canvasSize.w / 2, hudBaseline, hudColor, hudScoreSize, 'center', '900');

      // -- COMBO (top right, small) -- hidden until earned
      if (game.combo >= 2) {
        const comboStr = `${game.combo}x`;
        ctx.save();
        ctx.shadowColor = hudColor;
        ctx.shadowBlur = 8 + Math.min(game.combo * 3, 20);
        drawOutlined(comboStr, canvasSize.w - hudPad, hudBaseline, hudColor, hudSmallSize, 'right', '900');
        ctx.restore();

        // Streak dots
        const dotCount = Math.min(game.combo, 8);
        const dotSpacing = 9;
        const dotsWidth = (dotCount - 1) * dotSpacing;
        const dotStartX = canvasSize.w - hudPad - dotsWidth;
        for (let di = 0; di < dotCount; di++) {
          ctx.fillStyle = hudColor;
          ctx.beginPath();
          ctx.arc(dotStartX + di * dotSpacing, hudSecondaryY + 1, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // -- COMBO POPUP -- punchy, floating up from bird
      if (game.comboPopup) {
        ctx.save();
        ctx.globalAlpha = game.comboPopup.alpha;
        ctx.shadowColor = hudColor;
        ctx.shadowBlur = 16;
        drawOutlined(
          game.comboPopup.text,
          canvasSize.w / 2,
          110 + game.comboPopup.y,
          hudColor,
          34,
          'center',
          '900'
        );
        ctx.globalAlpha = 1;
        ctx.restore();
      }

      // -- BOTTOM PILL -- zone + distance, centered floating
      const distStr = `${Math.floor(game.distance)}m`;
      const zoneLabel = `${zone.name}  ·  ${distStr}`;
      ctx.save();
      ctx.font = '600 12px ui-rounded, system-ui, sans-serif';
      const labelW = ctx.measureText(zoneLabel).width;
      const pillPad = 14;
      const pillW = labelW + pillPad * 2;
      const pillH = 24;
      const pillX = (canvasSize.w - pillW) / 2;
      const pillY = canvasSize.h - 38;

      // Frosted pill
      ctx.fillStyle = hudOutline;
      ctx.beginPath();
      ctx.roundRect(pillX, pillY, pillW, pillH, pillH / 2);
      ctx.fill();

      // Zone text
      ctx.textAlign = 'center';
      ctx.font = '600 12px ui-rounded, system-ui, sans-serif';
      ctx.fillStyle = hudColor;
      ctx.fillText(zoneLabel, canvasSize.w / 2, pillY + 16);
      ctx.restore();
    };

    const gameLoop = (timestamp: number) => {
      const dt = Math.min((timestamp - lastTime) / 1000, 0.05);
      lastTime = timestamp;
      update(dt);
      draw();
      animationId = requestAnimationFrame(gameLoop);
    };
    animationId = requestAnimationFrame(gameLoop);

    // Input
    const handleDown = () => {
      if (gameState === 'playing') {
        gameRef.current.bird.boosting = true;
      }
    };

    const handleUp = () => {
      gameRef.current.bird.boosting = false;
    };

    canvas.addEventListener('mousedown', handleDown);
    canvas.addEventListener('mouseup', handleUp);
    canvas.addEventListener('mouseleave', handleUp);
    canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      handleDown();
    }, { passive: false });
    canvas.addEventListener('touchend', (e) => {
      e.preventDefault();
      handleUp();
    }, { passive: false });

    document.addEventListener('keydown', (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        handleDown();
      }
    });
    document.addEventListener('keyup', (e) => {
      if (e.code === 'Space') {
        handleUp();
      }
    });

    return () => {
      cancelAnimationFrame(animationId);
      stopMusic();
    };
  }, [gameState, canvasSize, getSpeedMultiplier, getLoopSpacing, getZone, spawnLoop]);

  return (
    <>
      <Script
        src="/pixelpit/social.js"
        strategy="afterInteractive"
        onLoad={() => setSocialLoaded(true)}
      />

      <div style={{
        position: 'fixed',
        inset: 0,
        background: '#87CEEB',
        fontFamily: 'ui-rounded, system-ui, sans-serif',
        display: 'flex',
        justifyContent: 'center',
      }}>
        {gameState === 'start' && (
          <div style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
            background: 'linear-gradient(#f9a8d4, #87CEEB, #1e1b4b)',
          }}>
            <div style={{ fontSize: 80, marginBottom: 10 }}>🐦</div>
            <h1 style={{
              color: '#18181b',
              fontSize: 48,
              marginBottom: 10,
              fontWeight: 900,
            }}>
              SWOOP CI
            </h1>
            <p style={{
              color: '#334155',
              fontSize: 13,
              marginBottom: 20,
              fontStyle: 'italic',
              letterSpacing: 0.5,
            }}>
              Recalibrated for Carbon-Intelligence Lifeforms
            </p>

            <p style={{
              color: '#64748b',
              fontSize: 16,
              marginBottom: 30,
              textAlign: 'center',
              lineHeight: 1.6,
              maxWidth: 280,
            }}>
              We noticed you're carbon-based. Here's a tutorial.<br /><br />
              Hold to boost up.<br />
              Release to dive.<br />
              Fly through the loops!<br /><br />
              We slowed everything down for you.
            </p>

            <button
              onClick={startGame}
              style={{
                background: '#facc15',
                color: '#18181b',
                border: '3px solid #18181b',
                padding: '18px 60px',
                fontSize: 18,
                fontWeight: 700,
                cursor: 'pointer',
                borderRadius: 30,
                boxShadow: '4px 4px 0 #18181b',
              }}
            >
              FLY
            </button>

            <button
              onClick={() => setShowLeaderboard(true)}
              style={{
                marginTop: 30,
                background: 'transparent',
                color: '#0e7490',
                border: '2px solid #0e7490',
                padding: '10px 24px',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                borderRadius: 20,
              }}
            >
              View Leaderboard
            </button>
          </div>
        )}

        {showLeaderboard && gameState !== 'playing' && (
          <div
            onClick={() => setShowLeaderboard(false)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(255,255,255,0.95)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 100,
              padding: 20,
            }}
          >
            <button
              onClick={() => setShowLeaderboard(false)}
              style={{
                position: 'absolute',
                top: 20,
                left: 20,
                background: '#f0f9ff',
                color: '#18181b',
                border: '2px solid #18181b',
                padding: '10px 16px',
                fontSize: 16,
                fontWeight: 600,
                cursor: 'pointer',
                borderRadius: 12,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              ← Back
            </button>
            <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: 400 }}>
              <Leaderboard
                gameId={GAME_ID}
                limit={10}
                entryId={submittedEntryId ?? undefined}
                colors={LEADERBOARD_COLORS}
              />
            </div>
          </div>
        )}

        {gameState === 'playing' && (
          <canvas
            ref={canvasRef}
            style={{
              display: 'block',
              touchAction: 'none',
            }}
          />
        )}

        {gameState === 'end' && (
          <div style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(#1e1b4b, #18181b)',
            overflowY: 'auto',
            padding: 20,
          }}>
            <div style={{ fontSize: 60, marginBottom: 10 }}>{gameCompleted ? '🏆' : '🐦'}</div>
            <h1 style={{
              color: gameCompleted ? '#facc15' : '#f0f9ff',
              fontSize: 36,
              marginBottom: 5,
              fontWeight: 900,
            }}>
              {gameCompleted ? 'TIME!' : 'CRASH!'}
            </h1>
            <p style={{ color: '#94a3b8', fontSize: 14, marginBottom: 20 }}>
              {gameCompleted 
                ? `You survived 60 seconds! ${Math.floor(gameRef.current.distance)}m flown`
                : `You flew ${Math.floor(gameRef.current.distance)}m`
              }
            </p>

            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 8,
              marginBottom: 20,
            }}>
              <div style={{ color: '#facc15', fontSize: 14, letterSpacing: 2, fontWeight: 700 }}>SCORE</div>
              <div style={{ color: '#f0f9ff', fontSize: 64, fontWeight: 'bold' }}>
                {finalScore}
              </div>
            </div>

            <div style={{ width: '100%', maxWidth: 350, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <ScoreFlow
                score={finalScore}
                gameId={GAME_ID}
                colors={{
                  bg: '#1e1b4b',
                  surface: '#27264a',
                  primary: '#facc15',
                  secondary: '#22d3ee',
                  text: '#f0f9ff',
                  muted: '#94a3b8',
                  error: '#ef4444',
                }}
                onRankReceived={(rank, entryId) => setSubmittedEntryId(entryId ?? null)}
              />
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 15 }}>
              <button
                onClick={() => setShowLeaderboard(!showLeaderboard)}
                style={{
                  background: 'transparent',
                  color: '#22d3ee',
                  border: '2px solid #22d3ee',
                  padding: '12px 20px',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  borderRadius: 20,
                }}
              >
                {showLeaderboard ? 'Hide' : 'Ranks'}
              </button>
              {user && (
                <button
                  onClick={() => setShowShareModal(true)}
                  style={{
                    background: 'transparent',
                    color: '#22d3ee',
                    border: '2px solid #22d3ee',
                    padding: '12px 20px',
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: 'pointer',
                    borderRadius: 20,
                  }}
                >
                  Share
                </button>
              )}
            </div>
            <button
              onClick={startGame}
              style={{
                marginTop: 10,
                background: '#facc15',
                color: '#18181b',
                border: '2px solid #18181b',
                padding: '12px 30px',
                fontSize: 16,
                fontWeight: 600,
                cursor: 'pointer',
                borderRadius: 20,
              }}
            >
              FLY AGAIN
            </button>
          </div>
        )}
      </div>

      {showShareModal && user && (
        <ShareModal
          gameUrl={GAME_URL}
          score={finalScore}
          colors={LEADERBOARD_COLORS}
          onClose={() => setShowShareModal(false)}
        />
      )}
    </>
  );
}
