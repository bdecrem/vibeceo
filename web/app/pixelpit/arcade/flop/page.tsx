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
} from '@/app/pixelpit/components';

const GAME_ID = 'flop';

// PLAYROOM theme
const THEME = {
  bg: '#f8fafc',
  surface: '#ffffff',
  border: '#000000',
  bubblegum: '#f472b6',
  splash: '#22d3ee',
  sunshine: '#facc15',
  mint: '#34d399',
  grape: '#a78bfa',
  text: '#1e293b',
};

const AI_COLORS = [THEME.splash, THEME.sunshine, THEME.mint, THEME.grape];

const SCORE_FLOW_COLORS: ScoreFlowColors = {
  bg: THEME.bg,
  surface: THEME.surface,
  primary: THEME.bubblegum,
  secondary: THEME.splash,
  text: THEME.text,
  muted: '#94a3b8',
  error: '#ef4444',
};

const LEADERBOARD_COLORS: LeaderboardColors = {
  bg: THEME.bg,
  surface: THEME.surface,
  primary: THEME.bubblegum,
  secondary: THEME.splash,
  text: THEME.text,
  muted: '#94a3b8',
};

// Physics constants
const GRAVITY = 1800;
const GROUND_Y_RATIO = 0.78;
const RUN_SPEED = 400;
const SPRINT_MULT = 1.6;
const JUMP_VEL = -820;
const CONSTRAINT_ITERS = 3;
const STUMBLE_TIME = 0.5;
const FACEPLANT_TIME = 0.8;
const COURSE_LENGTH = 8000;
const FINISH_EXTRA = 200;
const RAGDOLL_SCALE = 1.8;

// Verlet point
interface VPoint {
  x: number;
  y: number;
  ox: number;
  oy: number;
  pinned: boolean;
}

// Distance constraint
interface VConstraint {
  a: number;
  b: number;
  len: number;
}

// Ragdoll structure
// Points: 0=head, 1=neck, 2=hip, 3=lhand, 4=lElbow, 5=rhand, 6=rElbow, 7=lfoot, 8=lknee, 9=rfoot, 10=rknee
interface Ragdoll {
  points: VPoint[];
  constraints: VConstraint[];
  color: string;
  eyeX: number;
  eyeY: number;
  // State
  x: number;
  vx: number;
  vy: number;
  onGround: boolean;
  jumping: boolean;
  sprinting: boolean;
  stumbleTimer: number;
  faceplantTimer: number;
  hitTimer: number;
  finishTime: number;
  finished: boolean;
  isAI: boolean;
  aiJumpCooldown: number;
  aiReaction: number;
  wobble: number;
  runPhase: number;
  armWindmill: number;
  lastPlaceFinishes: number;
}

// Obstacle types
type ObstacleType = 'hurdle' | 'spinner' | 'mud' | 'bouncy' | 'hammer';

interface Obstacle {
  type: ObstacleType;
  x: number;
  width: number;
  height: number;
  angle: number;
  speed: number;
}

function createPoint(x: number, y: number, pinned = false): VPoint {
  return { x, y, ox: x, oy: y, pinned };
}

function createRagdoll(x: number, groundY: number, color: string, isAI: boolean): Ragdoll {
  const S = RAGDOLL_SCALE;
  const headY = groundY - 60 * S;
  const neckY = groundY - 48 * S;
  const hipY = groundY - 20 * S;
  const footY = groundY;

  const points: VPoint[] = [
    createPoint(x, headY),        // 0 head
    createPoint(x, neckY),        // 1 neck
    createPoint(x, hipY),         // 2 hip
    createPoint(x - 14 * S, neckY + 4 * S),  // 3 left hand
    createPoint(x - 7 * S, neckY + 2 * S),   // 4 left elbow
    createPoint(x + 14 * S, neckY + 4 * S),  // 5 right hand
    createPoint(x + 7 * S, neckY + 2 * S),   // 6 right elbow
    createPoint(x - 8 * S, footY),    // 7 left foot
    createPoint(x - 4 * S, hipY + 14 * S),// 8 left knee
    createPoint(x + 8 * S, footY),    // 9 right foot
    createPoint(x + 4 * S, hipY + 14 * S),// 10 right knee
  ];

  const constraints: VConstraint[] = [
    { a: 0, b: 1, len: 12 * S },  // head-neck
    { a: 1, b: 2, len: 28 * S },  // neck-hip (spine)
    { a: 1, b: 4, len: 10 * S },  // neck-lelbow
    { a: 4, b: 3, len: 10 * S },  // lelbow-lhand
    { a: 1, b: 6, len: 10 * S },  // neck-relbow
    { a: 6, b: 5, len: 10 * S },  // relbow-rhand
    { a: 2, b: 8, len: 14 * S },  // hip-lknee
    { a: 8, b: 7, len: 14 * S },  // lknee-lfoot
    { a: 2, b: 10, len: 14 * S }, // hip-rknee
    { a: 10, b: 9, len: 14 * S }, // rknee-rfoot
    { a: 0, b: 2, len: 40 * S },  // head-hip (keep upright)
  ];

  return {
    points,
    constraints,
    color,
    eyeX: 0,
    eyeY: 0,
    x,
    vx: RUN_SPEED,
    vy: 0,
    onGround: true,
    jumping: false,
    sprinting: false,
    stumbleTimer: 0,
    faceplantTimer: 0,
    hitTimer: 0,
    finishTime: 0,
    finished: false,
    isAI,
    aiJumpCooldown: 0,
    aiReaction: 0.15 + Math.random() * 0.25,
    wobble: 0,
    runPhase: Math.random() * Math.PI * 2,
    armWindmill: 0,
    lastPlaceFinishes: 0,
  };
}

function resetRagdollPosition(r: Ragdoll, x: number, groundY: number) {
  const S = RAGDOLL_SCALE;
  const headY = groundY - 60 * S;
  const neckY = groundY - 48 * S;
  const hipY = groundY - 20 * S;
  const footY = groundY;
  const positions = [
    [x, headY], [x, neckY], [x, hipY],
    [x - 14 * S, neckY + 4 * S], [x - 7 * S, neckY + 2 * S],
    [x + 14 * S, neckY + 4 * S], [x + 7 * S, neckY + 2 * S],
    [x - 8 * S, footY], [x - 4 * S, hipY + 14 * S],
    [x + 8 * S, footY], [x + 4 * S, hipY + 14 * S],
  ];
  for (let i = 0; i < r.points.length; i++) {
    r.points[i].x = positions[i][0];
    r.points[i].y = positions[i][1];
    r.points[i].ox = positions[i][0];
    r.points[i].oy = positions[i][1];
  }
  r.x = x;
  r.vx = RUN_SPEED;
  r.vy = 0;
  r.onGround = true;
  r.jumping = false;
  r.sprinting = false;
  r.stumbleTimer = 0;
  r.faceplantTimer = 0;
  r.hitTimer = 0;
  r.finished = false;
  r.finishTime = 0;
  r.wobble = 0;
  r.armWindmill = 0;
  r.runPhase = Math.random() * Math.PI * 2;
}

function generateCourse(raceNum: number): Obstacle[] {
  const obstacles: Obstacle[] = [];
  const types: ObstacleType[] = ['hurdle', 'spinner', 'mud', 'bouncy', 'hammer'];
  const count = 6 + Math.min(raceNum, 8);
  const spacing = (COURSE_LENGTH - 400) / count;

  for (let i = 0; i < count; i++) {
    const tx = 300 + i * spacing + (Math.random() - 0.5) * spacing * 0.3;
    // More varied obstacles as races progress
    const available = Math.min(2 + Math.floor(raceNum / 2), types.length);
    const type = types[Math.floor(Math.random() * available)];
    let w = 40, h = 50, speed = 0;
    const S = RAGDOLL_SCALE;
    switch (type) {
      case 'hurdle': w = 12 * S; h = (30 + Math.random() * 20) * S; break;
      case 'spinner': w = 60 * S; h = 8 * S; speed = 2 + raceNum * 0.3; break;
      case 'mud': w = (80 + Math.random() * 40) * S; h = 10 * S; break;
      case 'bouncy': w = 50 * S; h = 14 * S; break;
      case 'hammer': w = 20 * S; h = 50 * S; speed = 1.5 + raceNum * 0.2; break;
    }
    obstacles.push({ type, x: tx, width: w, height: h, angle: Math.random() * Math.PI * 2, speed });
  }
  return obstacles;
}

// Audio
let audioCtx: AudioContext | null = null;
let masterGain: GainNode | null = null;

function initAudio() {
  if (audioCtx) return;
  audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  masterGain = audioCtx.createGain();
  masterGain.gain.value = 0.35;
  masterGain.connect(audioCtx.destination);
  if (audioCtx.state === 'suspended') audioCtx.resume();
}

function playBonk() {
  if (!audioCtx || !masterGain) return;
  const t = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(800, t);
  osc.frequency.exponentialRampToValueAtTime(200, t + 0.12);
  const g = audioCtx.createGain();
  g.gain.setValueAtTime(0.3, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
  osc.connect(g); g.connect(masterGain);
  osc.start(t); osc.stop(t + 0.12);
}

function playThud() {
  if (!audioCtx || !masterGain) return;
  const t = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(120, t);
  osc.frequency.exponentialRampToValueAtTime(40, t + 0.2);
  const g = audioCtx.createGain();
  g.gain.setValueAtTime(0.25, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
  osc.connect(g); g.connect(masterGain);
  osc.start(t); osc.stop(t + 0.2);
}

function playSlideWhistle(up: boolean) {
  if (!audioCtx || !masterGain) return;
  const t = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  osc.type = 'sine';
  if (up) {
    osc.frequency.setValueAtTime(300, t);
    osc.frequency.exponentialRampToValueAtTime(1200, t + 0.3);
  } else {
    osc.frequency.setValueAtTime(1200, t);
    osc.frequency.exponentialRampToValueAtTime(200, t + 0.4);
  }
  const g = audioCtx.createGain();
  g.gain.setValueAtTime(0.15, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + (up ? 0.3 : 0.4));
  osc.connect(g); g.connect(masterGain);
  osc.start(t); osc.stop(t + 0.5);
}

function playBoing() {
  if (!audioCtx || !masterGain) return;
  const t = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(200, t);
  osc.frequency.exponentialRampToValueAtTime(600, t + 0.05);
  osc.frequency.exponentialRampToValueAtTime(150, t + 0.2);
  const g = audioCtx.createGain();
  g.gain.setValueAtTime(0.25, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
  osc.connect(g); g.connect(masterGain);
  osc.start(t); osc.stop(t + 0.25);
}

function playWin() {
  if (!audioCtx || !masterGain) return;
  const t = audioCtx.currentTime;
  [523, 659, 784, 1047].forEach((f, i) => {
    const osc = audioCtx!.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = f;
    const g = audioCtx!.createGain();
    g.gain.setValueAtTime(0.15, t + i * 0.1);
    g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.1 + 0.3);
    osc.connect(g); g.connect(masterGain!);
    osc.start(t + i * 0.1); osc.stop(t + i * 0.1 + 0.3);
  });
}

function playSplat() {
  if (!audioCtx || !masterGain) return;
  const t = audioCtx.currentTime;
  // Noise burst for splat
  const bufferSize = audioCtx.sampleRate * 0.15;
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
  }
  const source = audioCtx.createBufferSource();
  source.buffer = buffer;
  const g = audioCtx.createGain();
  g.gain.setValueAtTime(0.15, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
  const filter = audioCtx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 800;
  source.connect(filter); filter.connect(g); g.connect(masterGain);
  source.start(t);
}

// Particles
interface Particle {
  x: number; y: number; vx: number; vy: number;
  life: number; color: string; size: number;
}

export default function FlopPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [canvasSize, setCanvasSize] = useState({ w: 450, h: 350 });
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'raceover' | 'gameover'>('menu');
  const [score, setScore] = useState(0);
  const [raceNum, setRaceNum] = useState(1);
  const [highScore, setHighScore] = useState(0);
  const [socialLoaded, setSocialLoaded] = useState(false);
  const [submittedEntryId, setSubmittedEntryId] = useState<number | null>(null);
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  const gameRef = useRef({
    racers: [] as Ragdoll[],
    obstacles: [] as Obstacle[],
    particles: [] as Particle[],
    groundY: 280,
    cameraX: 0,
    raceNum: 1,
    score: 0,
    raceTimer: 0,
    finishOrder: [] as number[], // indices of racers in finish order
    courseLength: COURSE_LENGTH,
    raceActive: true as boolean,
    countdownTimer: 0,
    lastPlaceCount: 0,
    inputDown: false,
    inputHoldTime: 0,
  });

  usePixelpitSocial(socialLoaded);

  useEffect(() => {
    const saved = localStorage.getItem('flop_highscore');
    if (saved) setHighScore(parseInt(saved));
  }, []);

  useEffect(() => {
    const handleResize = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const w = Math.min(vw - 16, 600);
      const h = Math.min(vh - 100, 450);
      setCanvasSize({ w, h });
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (gameState === 'gameover' && score >= 1) {
      fetch('/api/pixelpit/stats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ game: GAME_ID }),
      }).catch(() => {});
    }
  }, [gameState, score]);

  const startRace = useCallback((raceNumber: number, existingScore: number, lastPlaceCount: number) => {
    const game = gameRef.current;
    const groundY = canvasSize.h * GROUND_Y_RATIO;
    game.groundY = groundY;
    game.cameraX = 0;
    game.raceTimer = 0;
    game.finishOrder = [];
    game.raceActive = true;
    game.countdownTimer = 1.5;
    game.courseLength = COURSE_LENGTH + raceNumber * 200;
    game.particles = [];
    game.inputDown = false;
    game.inputHoldTime = 0;
    game.raceNum = raceNumber;
    game.score = existingScore;
    game.lastPlaceCount = lastPlaceCount;

    // Shuffle AI colors
    const shuffled = [...AI_COLORS].sort(() => Math.random() - 0.5);

    game.racers = [];
    // Player at index 0
    const startX = 60;
    game.racers.push(createRagdoll(startX, groundY, THEME.bubblegum, false));
    game.racers[0].lastPlaceFinishes = lastPlaceCount;
    // 3 AI — stagger vertically on the start line so all visible
    for (let i = 0; i < 3; i++) {
      const aiX = startX + (i + 1) * 15; // slight stagger
      const r = createRagdoll(aiX, groundY, shuffled[i], true);
      // Vary AI skill — keep them competitive with player
      r.vx = RUN_SPEED * (0.9 + Math.random() * 0.2);
      r.aiReaction = 0.1 + Math.random() * 0.3;
      game.racers.push(r);
    }

    game.obstacles = generateCourse(raceNumber);

    setRaceNum(raceNumber);
    setScore(existingScore);
    setGameState('playing');
  }, [canvasSize]);

  const startGame = useCallback(() => {
    initAudio();
    startRace(1, 0, 0);
  }, [startRace]);

  // Input
  const handleDown = useCallback((e?: any) => {
    if (e?.preventDefault) e.preventDefault();
    initAudio();
    const game = gameRef.current;
    if (gameState === 'playing') {
      game.inputDown = true;
      game.inputHoldTime = 0;
    }
  }, [gameState]);

  const handleUp = useCallback(() => {
    const game = gameRef.current;
    game.inputDown = false;
    game.inputHoldTime = 0;
  }, []);

  // Keyboard
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault();
        handleDown();
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') handleUp();
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => { window.removeEventListener('keydown', onKeyDown); window.removeEventListener('keyup', onKeyUp); };
  }, [handleDown, handleUp]);

  // Main game loop
  useEffect(() => {
    if (gameState !== 'playing') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let lastTime = performance.now();

    const tick = () => {
      const now = performance.now();
      const dt = Math.min((now - lastTime) / 1000, 0.033);
      lastTime = now;
      const game = gameRef.current;
      const { w, h } = canvasSize;
      const groundY = game.groundY;

      // Countdown
      if (game.countdownTimer > 0) {
        game.countdownTimer -= dt;
        // During countdown, racers don't move
      }

      // Update input hold time
      if (game.inputDown) {
        game.inputHoldTime += dt;
      }

      // Update racers
      for (let ri = 0; ri < game.racers.length; ri++) {
        const r = game.racers[ri];
        if (r.finished) continue;
        if (game.countdownTimer > 0) continue;

        const isSprinting = r.isAI ? (Math.random() < 0.3) : (game.inputDown && game.inputHoldTime > 0.15);
        r.sprinting = isSprinting;
        const speedMult = isSprinting ? SPRINT_MULT : 1;

        // Decrement timers
        if (r.stumbleTimer > 0) r.stumbleTimer -= dt;
        if (r.faceplantTimer > 0) r.faceplantTimer -= dt;
        if (r.hitTimer > 0) r.hitTimer -= dt;
        if (r.aiJumpCooldown > 0) r.aiJumpCooldown -= dt;

        // Wobble when sprinting
        if (isSprinting) {
          r.wobble += dt * 15;
        } else {
          r.wobble *= 0.9;
        }

        // Movement speed
        let moveSpeed = r.vx * speedMult;
        if (r.stumbleTimer > 0) moveSpeed *= 0.4;
        if (r.faceplantTimer > 0) moveSpeed *= 0.1;
        if (r.hitTimer > 0) moveSpeed *= 0.2;

        // Horizontal movement
        r.x += moveSpeed * dt;

        // Player jump (TAP — short press)
        if (!r.isAI) {
          if (game.inputDown && game.inputHoldTime < 0.15 && r.onGround && r.faceplantTimer <= 0 && r.hitTimer <= 0) {
            // Jump triggered on release for tap detection
          }
        }

        // AI jump logic
        if (r.isAI) {
          // Look ahead for obstacles
          for (const obs of game.obstacles) {
            const dist = obs.x - r.x;
            if (dist > 0 && dist < 80 + r.aiReaction * 100) {
              if (obs.type === 'hurdle' || obs.type === 'spinner' || obs.type === 'hammer') {
                if (r.onGround && r.aiJumpCooldown <= 0 && Math.random() < 0.7) {
                  r.vy = JUMP_VEL * (0.9 + Math.random() * 0.2);
                  r.onGround = false;
                  r.jumping = true;
                  r.aiJumpCooldown = 0.8;
                }
              }
            }
          }
        }

        // Gravity
        if (!r.onGround) {
          r.vy += GRAVITY * dt;
        }

        // Vertical position (applied to ragdoll base)
        const baseY = r.points[2].y; // hip
        const newBaseY = baseY + r.vy * dt;

        // Ground collision
        if (newBaseY >= groundY - 20 * RAGDOLL_SCALE && r.vy > 0) {
          r.vy = 0;
          r.onGround = true;
          if (r.jumping && Math.abs(r.vy) < 50) {
            // Bad landing check
            if (r.vy > 400) {
              r.stumbleTimer = 0.3;
              r.armWindmill = 1.0;
              playThud();
            }
          }
          r.jumping = false;
        }

        // Obstacle collisions
        for (const obs of game.obstacles) {
          const dx = r.x - obs.x;
          if (Math.abs(dx) > obs.width * 0.6 + 15) continue;

          switch (obs.type) {
            case 'hurdle':
              if (r.onGround && Math.abs(dx) < obs.width + 10) {
                // Faceplant!
                r.faceplantTimer = FACEPLANT_TIME;
                r.vy = -100;
                r.onGround = false;
                playBonk();
                spawnParts(r.x, groundY - 30, r.color, 6);
              }
              break;
            case 'spinner': {
              const sAngle = obs.angle;
              const endX = obs.x + Math.cos(sAngle) * obs.width * 0.5;
              const endY = groundY - 25 + Math.sin(sAngle) * obs.width * 0.5;
              const dsx = r.x - endX;
              const dsy = (groundY - 40) - endY;
              if (Math.sqrt(dsx * dsx + dsy * dsy) < 25) {
                r.vy = JUMP_VEL * 1.5;
                r.vx = RUN_SPEED * 0.5;
                r.onGround = false;
                r.hitTimer = 0.4;
                playSlideWhistle(true);
                spawnParts(r.x, groundY - 40, THEME.sunshine, 8);
              }
              break;
            }
            case 'mud':
              if (r.onGround && Math.abs(dx) < obs.width * 0.5) {
                moveSpeed *= 0.3;
                r.x -= moveSpeed * dt * 0.7; // counter some movement
                // Sink effect
                r.wobble += dt * 5;
              }
              break;
            case 'bouncy':
              if (r.onGround && Math.abs(dx) < obs.width * 0.4) {
                r.vy = JUMP_VEL * 1.8;
                r.onGround = false;
                playBoing();
                playSlideWhistle(true);
                spawnParts(r.x, groundY, THEME.mint, 5);
              }
              break;
            case 'hammer': {
              const hamAngle = obs.angle;
              const hamX = obs.x + Math.sin(hamAngle) * obs.height * 0.8;
              const hamY = groundY - 25 - Math.cos(hamAngle) * obs.height * 0.4;
              const dhx = r.x - hamX;
              const dhy = (groundY - 35) - hamY;
              if (Math.sqrt(dhx * dhx + dhy * dhy) < 30) {
                r.vx = RUN_SPEED * (0.3 + Math.random() * 0.3);
                r.vy = -300 - Math.random() * 200;
                r.onGround = false;
                r.hitTimer = 0.6;
                playBonk();
                playThud();
                spawnParts(r.x, groundY - 35, r.color, 10);
              }
              break;
            }
          }
        }

        // Arm windmill decay
        if (r.armWindmill > 0) r.armWindmill -= dt * 2;

        // Update ragdoll verlet
        r.runPhase += dt * (moveSpeed / RUN_SPEED) * 10;
        updateRagdoll(r, dt, groundY, moveSpeed);

        // Finish line
        if (r.x >= game.courseLength && !r.finished) {
          r.finished = true;
          r.finishTime = game.raceTimer;
          game.finishOrder.push(ri);
          if (ri === 0) {
            playWin();
          } else if (game.finishOrder.length === 1) {
            // AI finished first
          }
        }
      }

      // Race timer
      if (game.countdownTimer <= 0 && game.raceActive) {
        game.raceTimer += dt;
      }

      // Update obstacle animations
      for (const obs of game.obstacles) {
        if (obs.speed > 0) {
          obs.angle += obs.speed * dt;
        }
      }

      // Update particles
      game.particles = game.particles.filter(p => {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 600 * dt;
        p.life -= dt;
        return p.life > 0;
      });
      if (game.particles.length > 20) game.particles = game.particles.slice(-20);

      // Camera follows player
      const player = game.racers[0];
      const targetCam = player.x - w * 0.3;
      game.cameraX += (targetCam - game.cameraX) * 5 * dt;

      // Check race end
      if (game.finishOrder.length >= 4 || (game.finishOrder.length > 0 && game.raceTimer > 20)) {
        if (game.raceActive) {
          game.raceActive = false;
          // Fill in unfinished racers
          for (let i = 0; i < 4; i++) {
            if (!game.finishOrder.includes(i)) {
              game.finishOrder.push(i);
            }
          }
          // Determine player placement
          const playerPlace = game.finishOrder.indexOf(0) + 1;
          if (playerPlace === 1) {
            game.score += 1;
            setScore(game.score);
          }
          // Check last place
          if (playerPlace === 4) {
            game.lastPlaceCount++;
          }

          // Delay then show result
          setTimeout(() => {
            if (game.lastPlaceCount >= 3) {
              // Game over
              setGameState('gameover');
              setSocialLoaded(true);
              if (game.score > highScore) {
                setHighScore(game.score);
                localStorage.setItem('flop_highscore', game.score.toString());
              }
            } else {
              setGameState('raceover');
            }
          }, 1500);
        }
      }

      // === DRAW ===
      ctx.save();
      ctx.clearRect(0, 0, w, h);

      // Sky
      ctx.fillStyle = THEME.bg;
      ctx.fillRect(0, 0, w, h);

      // Cheerful clouds
      ctx.fillStyle = '#e2e8f0';
      const cloudOffset = -game.cameraX * 0.1;
      for (let i = 0; i < 5; i++) {
        const cx = ((i * 200 + cloudOffset) % (w + 200)) - 50;
        const cy = 30 + (i % 3) * 25;
        ctx.beginPath();
        ctx.arc(cx, cy, 25, 0, Math.PI * 2);
        ctx.arc(cx + 20, cy - 8, 20, 0, Math.PI * 2);
        ctx.arc(cx + 40, cy, 22, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.save();
      ctx.translate(-game.cameraX, 0);

      // Ground
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(0, groundY, game.courseLength + FINISH_EXTRA + 500, h - groundY + 50);
      // Ground line with shadow
      ctx.fillStyle = THEME.border;
      ctx.fillRect(0, groundY, game.courseLength + FINISH_EXTRA + 500, 3);

      // Finish line
      const finishX = game.courseLength;
      ctx.save();
      ctx.fillStyle = THEME.border;
      ctx.fillRect(finishX, groundY - 80, 6, 80);
      // Checkered flag
      const flagW = 30, flagH = 24;
      for (let fy = 0; fy < 3; fy++) {
        for (let fx = 0; fx < 4; fx++) {
          ctx.fillStyle = (fx + fy) % 2 === 0 ? '#000' : '#fff';
          ctx.fillRect(finishX + 6 + fx * (flagW / 4), groundY - 80 + fy * (flagH / 3), flagW / 4, flagH / 3);
        }
      }
      ctx.strokeStyle = THEME.border;
      ctx.lineWidth = 2;
      ctx.strokeRect(finishX + 6, groundY - 80, flagW, flagH);
      ctx.restore();

      // Draw obstacles
      for (const obs of game.obstacles) {
        const ox = obs.x;
        ctx.save();

        switch (obs.type) {
          case 'hurdle':
            // Post with bar
            ctx.fillStyle = THEME.border;
            ctx.shadowColor = THEME.border;
            ctx.shadowOffsetX = 4;
            ctx.shadowOffsetY = 4;
            ctx.fillRect(ox - 3, groundY - obs.height, 6, obs.height);
            ctx.fillStyle = '#ef4444';
            ctx.fillRect(ox - 15, groundY - obs.height, 30, 6);
            ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;
            break;

          case 'spinner':
            ctx.translate(ox, groundY - 25);
            ctx.rotate(obs.angle);
            ctx.fillStyle = THEME.sunshine;
            ctx.strokeStyle = THEME.border;
            ctx.lineWidth = 3;
            ctx.shadowColor = THEME.border;
            ctx.shadowOffsetX = 3;
            ctx.shadowOffsetY = 3;
            ctx.beginPath();
            ctx.roundRect(-obs.width / 2, -4, obs.width, 8, 4);
            ctx.fill();
            ctx.stroke();
            ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;
            // Center bolt
            ctx.fillStyle = THEME.border;
            ctx.beginPath();
            ctx.arc(0, 0, 5, 0, Math.PI * 2);
            ctx.fill();
            break;

          case 'mud':
            ctx.fillStyle = '#92400e';
            ctx.strokeStyle = THEME.border;
            ctx.lineWidth = 2;
            ctx.shadowColor = THEME.border;
            ctx.shadowOffsetX = 3;
            ctx.shadowOffsetY = 3;
            ctx.beginPath();
            ctx.ellipse(ox, groundY, obs.width / 2, 8, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;
            // Bubbles
            ctx.fillStyle = '#78350f';
            for (let b = 0; b < 3; b++) {
              const bx = ox - obs.width * 0.3 + b * obs.width * 0.3;
              const by = groundY - 3 + Math.sin(now / 300 + b) * 2;
              ctx.beginPath();
              ctx.arc(bx, by, 3, 0, Math.PI * 2);
              ctx.fill();
            }
            break;

          case 'bouncy':
            ctx.fillStyle = THEME.mint;
            ctx.strokeStyle = THEME.border;
            ctx.lineWidth = 3;
            ctx.shadowColor = THEME.border;
            ctx.shadowOffsetX = 4;
            ctx.shadowOffsetY = 4;
            // Spring pad shape
            ctx.beginPath();
            ctx.moveTo(ox - obs.width / 2, groundY);
            ctx.lineTo(ox - obs.width / 2 + 5, groundY - obs.height);
            ctx.lineTo(ox + obs.width / 2 - 5, groundY - obs.height);
            ctx.lineTo(ox + obs.width / 2, groundY);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;
            // Arrow
            ctx.fillStyle = THEME.border;
            ctx.font = 'bold 16px system-ui';
            ctx.textAlign = 'center';
            ctx.fillText('↑', ox, groundY - obs.height - 4);
            break;

          case 'hammer':
            // Swinging hammer
            ctx.translate(ox, groundY - obs.height);
            ctx.rotate(Math.sin(obs.angle) * 0.8);
            // Arm
            ctx.fillStyle = '#71717a';
            ctx.strokeStyle = THEME.border;
            ctx.lineWidth = 2;
            ctx.fillRect(-3, 0, 6, obs.height * 0.8);
            ctx.strokeRect(-3, 0, 6, obs.height * 0.8);
            // Head
            ctx.fillStyle = '#ef4444';
            ctx.shadowColor = THEME.border;
            ctx.shadowOffsetX = 3;
            ctx.shadowOffsetY = 3;
            ctx.beginPath();
            ctx.roundRect(-12, obs.height * 0.7, 24, 18, 4);
            ctx.fill();
            ctx.stroke();
            ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;
            break;
        }
        ctx.restore();
      }

      // Draw racers (back to front, player last)
      const drawOrder = [1, 2, 3, 0];
      for (const ri of drawOrder) {
        const r = game.racers[ri];
        drawRagdoll(ctx, r, groundY, now);
      }

      // Particles
      for (const p of game.particles) {
        ctx.globalAlpha = Math.min(1, p.life * 3);
        ctx.fillStyle = p.color;
        ctx.shadowColor = THEME.border;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * Math.min(1, p.life * 2), 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;
      }
      ctx.globalAlpha = 1;

      ctx.restore(); // camera

      // UI overlay
      // Race number
      ctx.fillStyle = THEME.text;
      ctx.font = 'bold 16px system-ui';
      ctx.textAlign = 'left';
      ctx.fillText(`Race ${game.raceNum}`, 12, 24);

      // Score
      ctx.textAlign = 'right';
      ctx.fillText(`Wins: ${game.score}`, w - 12, 24);

      // Last place counter (X marks)
      ctx.textAlign = 'right';
      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 14px system-ui';
      let xMarks = '';
      for (let i = 0; i < 3; i++) {
        xMarks += i < game.lastPlaceCount ? '✕ ' : '○ ';
      }
      ctx.fillText(xMarks.trim(), w - 12, 42);

      // Position indicator
      const positions = game.racers
        .map((r, i) => ({ i, x: r.x }))
        .sort((a, b) => b.x - a.x);
      const playerPos = positions.findIndex(p => p.i === 0) + 1;
      const posLabels = ['1st', '2nd', '3rd', '4th'];
      const posColors = [THEME.mint, THEME.splash, THEME.sunshine, '#ef4444'];
      ctx.textAlign = 'center';
      ctx.fillStyle = posColors[playerPos - 1];
      ctx.font = 'bold 22px system-ui';
      ctx.strokeStyle = THEME.border;
      ctx.lineWidth = 3;
      ctx.strokeText(posLabels[playerPos - 1], w / 2, 28);
      ctx.fillText(posLabels[playerPos - 1], w / 2, 28);
      ctx.lineWidth = 1;

      // Countdown
      if (game.countdownTimer > 0) {
        const countNum = Math.ceil(game.countdownTimer);
        ctx.fillStyle = THEME.text;
        ctx.font = `bold ${60 + (game.countdownTimer % 1) * 20}px system-ui`;
        ctx.textAlign = 'center';
        ctx.strokeStyle = THEME.border;
        ctx.lineWidth = 4;
        const txt = countNum > 0 ? countNum.toString() : 'GO!';
        ctx.strokeText(txt, w / 2, h / 2);
        ctx.fillStyle = THEME.sunshine;
        ctx.fillText(txt, w / 2, h / 2);
        ctx.lineWidth = 1;
      }

      // Race result overlay
      if (!game.raceActive && game.finishOrder.length >= 4) {
        const playerPlace = game.finishOrder.indexOf(0) + 1;
        ctx.fillStyle = 'rgba(248,250,252,0.7)';
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = THEME.text;
        ctx.font = 'bold 32px system-ui';
        ctx.textAlign = 'center';
        ctx.strokeStyle = THEME.border;
        ctx.lineWidth = 3;
        const resultText = playerPlace === 1 ? '🏆 YOU WIN!' : `${posLabels[playerPlace - 1]} Place`;
        ctx.strokeText(resultText, w / 2, h / 2 - 10);
        ctx.fillStyle = playerPlace === 1 ? THEME.mint : (playerPlace === 4 ? '#ef4444' : THEME.sunshine);
        ctx.fillText(resultText, w / 2, h / 2 - 10);
        ctx.lineWidth = 1;
        if (playerPlace === 4) {
          ctx.fillStyle = '#ef4444';
          ctx.font = 'bold 16px system-ui';
          ctx.fillText(`Strike ${game.lastPlaceCount}/3`, w / 2, h / 2 + 20);
        }
      }

      ctx.restore();
      animId = requestAnimationFrame(tick);
    };

    const spawnParts = (x: number, y: number, color: string, count: number) => {
      const game = gameRef.current;
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 80 + Math.random() * 150;
        game.particles.push({
          x, y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 100,
          life: 0.4 + Math.random() * 0.3,
          color,
          size: 3 + Math.random() * 4,
        });
      }
    };

    // Make spawnParts available to update
    (gameRef.current as any)._spawnParts = spawnParts;

    const updateRagdoll = (r: Ragdoll, dt: number, groundY: number, moveSpeed: number) => {
      const pts = r.points;

      // Apply running animation to target positions
      const phase = r.runPhase;
      const wobbleOffset = Math.sin(r.wobble) * (r.sprinting ? 4 : 1);

      // Move all points with character
      const dx = moveSpeed * dt;
      for (const p of pts) {
        p.x += dx;
        p.ox += dx;
      }

      // Animate legs (running cycle)
      if (r.onGround && r.faceplantTimer <= 0 && r.hitTimer <= 0) {
        const legSwing = Math.sin(phase) * 12;
        const legSwing2 = Math.sin(phase + Math.PI) * 12;
        // Left foot
        pts[7].x = r.x + dx - 6 + legSwing;
        pts[7].y = groundY - 2 + Math.abs(Math.sin(phase)) * -8;
        // Right foot
        pts[9].x = r.x + dx + 6 + legSwing2;
        pts[9].y = groundY - 2 + Math.abs(Math.sin(phase + Math.PI)) * -8;
      }

      // Arm windmill animation
      if (r.armWindmill > 0) {
        const armPhase = performance.now() / 100;
        pts[3].x = r.x + dx + Math.cos(armPhase) * 20;
        pts[3].y = pts[1].y + Math.sin(armPhase) * 20;
        pts[5].x = r.x + dx + Math.cos(armPhase + Math.PI) * 20;
        pts[5].y = pts[1].y + Math.sin(armPhase + Math.PI) * 20;
      }

      // Faceplant: crumple forward
      if (r.faceplantTimer > 0) {
        pts[0].y = groundY - 8; // Head near ground
        pts[0].x = r.x + dx + 10;
        pts[1].y = groundY - 12;
        pts[2].y = groundY - 15;
      }

      // Hit: limbs go wild
      if (r.hitTimer > 0) {
        for (let i = 3; i <= 10; i++) {
          pts[i].x += (Math.random() - 0.5) * 8;
          pts[i].y += (Math.random() - 0.5) * 8;
        }
      }

      // Apply gravity to non-grounded points
      if (!r.onGround) {
        for (const p of pts) {
          const vy = p.y - p.oy;
          p.oy = p.y;
          p.y += vy + GRAVITY * dt * dt * 0.5;
        }
      }

      // Solve constraints
      for (let iter = 0; iter < CONSTRAINT_ITERS; iter++) {
        for (const c of r.constraints) {
          const a = pts[c.a];
          const b = pts[c.b];
          const ddx = b.x - a.x;
          const ddy = b.y - a.y;
          const dist = Math.sqrt(ddx * ddx + ddy * ddy) || 0.001;
          const diff = (dist - c.len) / dist * 0.5;
          const ox = ddx * diff;
          const oy = ddy * diff;
          a.x += ox; a.y += oy;
          b.x -= ox; b.y -= oy;
        }

        // Ground constraint
        for (const p of pts) {
          if (p.y > groundY) p.y = groundY;
        }
      }

      // Keep body centered on r.x
      const bodyCenter = (pts[1].x + pts[2].x) / 2;
      const recenter = r.x + dx - bodyCenter;
      // Don't recenter during hit
      if (r.hitTimer <= 0) {
        for (const p of pts) {
          p.x += recenter * 0.3;
        }
      }
      r.x += dx;

      // Wobble offset
      pts[0].x += wobbleOffset * 0.5;

      // Googly eyes (lerp with delay)
      const targetEyeX = (pts[0].x - pts[0].ox) * 2;
      const targetEyeY = (pts[0].y - pts[0].oy) * 2;
      r.eyeX += (targetEyeX - r.eyeX) * 0.15;
      r.eyeY += (targetEyeY - r.eyeY) * 0.15;
      r.eyeX = Math.max(-4, Math.min(4, r.eyeX));
      r.eyeY = Math.max(-4, Math.min(4, r.eyeY));
    };

    const drawRagdoll = (ctx: CanvasRenderingContext2D, r: Ragdoll, groundY: number, now: number) => {
      const pts = r.points;
      const color = r.color;

      ctx.save();
      ctx.strokeStyle = THEME.border;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // Drop shadow for character
      ctx.shadowColor = 'rgba(0,0,0,0.2)';
      ctx.shadowOffsetX = 4;
      ctx.shadowOffsetY = 4;

      // Body (rectangle from neck to hip)
      ctx.fillStyle = color;
      ctx.strokeStyle = THEME.border;
      ctx.lineWidth = 2.5;
      const bodyW = 14;
      ctx.beginPath();
      ctx.roundRect(pts[1].x - bodyW / 2, pts[1].y, bodyW, pts[2].y - pts[1].y, 3);
      ctx.fill();
      ctx.stroke();

      ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;

      // Limbs (noodle style)
      ctx.strokeStyle = color;
      ctx.lineWidth = 5;
      // Left arm
      drawLimb(ctx, pts[1], pts[4], pts[3]);
      // Right arm
      drawLimb(ctx, pts[1], pts[6], pts[5]);
      // Left leg
      drawLimb(ctx, pts[2], pts[8], pts[7]);
      // Right leg
      drawLimb(ctx, pts[2], pts[10], pts[9]);

      // Outline limbs
      ctx.strokeStyle = THEME.border;
      ctx.lineWidth = 1.5;
      drawLimb(ctx, pts[1], pts[4], pts[3]);
      drawLimb(ctx, pts[1], pts[6], pts[5]);
      drawLimb(ctx, pts[2], pts[8], pts[7]);
      drawLimb(ctx, pts[2], pts[10], pts[9]);

      // Head (circle)
      ctx.fillStyle = color;
      ctx.strokeStyle = THEME.border;
      ctx.lineWidth = 2.5;
      ctx.shadowColor = 'rgba(0,0,0,0.2)';
      ctx.shadowOffsetX = 3;
      ctx.shadowOffsetY = 3;
      ctx.beginPath();
      ctx.arc(pts[0].x, pts[0].y, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;

      // Googly eyes
      const headX = pts[0].x;
      const headY = pts[0].y;
      // White of eyes
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(headX - 4, headY - 2, 4, 0, Math.PI * 2);
      ctx.arc(headX + 4, headY - 2, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = THEME.border;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(headX - 4, headY - 2, 4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(headX + 4, headY - 2, 4, 0, Math.PI * 2);
      ctx.stroke();
      // Pupils (lag behind movement)
      ctx.fillStyle = THEME.border;
      const pupilClamp = 2;
      const px = Math.max(-pupilClamp, Math.min(pupilClamp, r.eyeX));
      const py = Math.max(-pupilClamp, Math.min(pupilClamp, r.eyeY));
      ctx.beginPath();
      ctx.arc(headX - 4 + px, headY - 2 + py, 2, 0, Math.PI * 2);
      ctx.arc(headX + 4 + px, headY - 2 + py, 2, 0, Math.PI * 2);
      ctx.fill();

      // Mouth expression
      ctx.strokeStyle = THEME.border;
      ctx.lineWidth = 1.5;
      ctx.lineCap = 'round';
      if (r.faceplantTimer > 0) {
        // X_X face
        ctx.beginPath();
        ctx.arc(headX, headY + 4, 3, 0, Math.PI * 2);
        ctx.stroke();
      } else if (r.hitTimer > 0) {
        // Shocked O
        ctx.beginPath();
        ctx.arc(headX, headY + 5, 3, 0, Math.PI * 2);
        ctx.stroke();
      } else if (r.finished) {
        // Big grin
        ctx.beginPath();
        ctx.arc(headX, headY + 2, 4, 0.1, Math.PI - 0.1);
        ctx.stroke();
      } else {
        // Running smile/determined
        ctx.beginPath();
        ctx.arc(headX, headY + 2, 3, 0.2, Math.PI - 0.2);
        ctx.stroke();
      }

      // Hands and feet (small circles)
      ctx.fillStyle = color;
      ctx.strokeStyle = THEME.border;
      ctx.lineWidth = 1.5;
      for (const idx of [3, 5, 7, 9]) {
        ctx.beginPath();
        ctx.arc(pts[idx].x, pts[idx].y, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }

      ctx.restore();
    };

    const drawLimb = (ctx: CanvasRenderingContext2D, a: VPoint, mid: VPoint, b: VPoint) => {
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.quadraticCurveTo(mid.x, mid.y, b.x, b.y);
      ctx.stroke();
    };

    // Handle player jump on tap (not hold)
    const handleJump = () => {
      const game = gameRef.current;
      const player = game.racers[0];
      if (!player || player.finished) return;
      if (player.onGround && player.faceplantTimer <= 0 && player.hitTimer <= 0 && game.countdownTimer <= 0) {
        player.vy = JUMP_VEL;
        player.onGround = false;
        player.jumping = true;
        playBoing();
      }
    };

    // Tap detection: jump on pointerdown if short tap
    const onPointerDown = () => {
      handleJump();
    };

    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });

    animId = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(animId);
      canvas.removeEventListener('pointerdown', onPointerDown);
    };
  }, [gameState, canvasSize, highScore]);

  const nextRace = useCallback(() => {
    const game = gameRef.current;
    startRace(game.raceNum + 1, game.score, game.lastPlaceCount);
  }, [startRace]);

  return (
    <>
      <Script src="https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.3/dist/confetti.browser.min.js" />

      <div
        className="min-h-screen flex flex-col items-center justify-center p-2"
        style={{ backgroundColor: THEME.bg }}
      >
        {gameState === 'menu' && (
          <div className="text-center">
            <h1
              className="text-5xl font-bold mb-1"
              style={{
                color: THEME.bubblegum,
                textShadow: `4px 4px 0 ${THEME.border}`,
                letterSpacing: '4px',
              }}
            >
              FLOP
            </h1>
            <p className="text-lg mb-1" style={{ color: THEME.text }}>
              🏃 Ragdoll Racing 🏃
            </p>
            <p className="text-sm mb-4" style={{ color: '#94a3b8' }}>
              Tap to jump • Hold to sprint
            </p>
            {highScore > 0 && (
              <p className="text-sm mb-4" style={{ color: '#64748b' }}>
                Best: {highScore} wins
              </p>
            )}
            <button
              onClick={startGame}
              className="px-8 py-4 rounded-xl text-xl font-bold border-4"
              style={{
                backgroundColor: THEME.bubblegum,
                color: '#fff',
                borderColor: THEME.border,
                boxShadow: `4px 4px 0 ${THEME.border}`,
              }}
            >
              RACE!
            </button>
            <p className="text-xs mt-3" style={{ color: '#94a3b8' }}>
              Last place 3 times = game over
            </p>
          </div>
        )}

        {gameState === 'playing' && (
          <canvas
            ref={canvasRef}
            width={canvasSize.w}
            height={canvasSize.h}
            style={{
              touchAction: 'none',
              borderRadius: '12px',
              border: `3px solid ${THEME.border}`,
              boxShadow: `6px 6px 0 ${THEME.border}`,
            }}
          />
        )}

        {gameState === 'raceover' && (
          <div className="text-center">
            <h2 className="text-3xl font-bold mb-2" style={{ color: THEME.text }}>
              {gameRef.current.finishOrder.indexOf(0) === 0 ? '🏆 Winner!' : `Race ${raceNum} Done`}
            </h2>
            <p className="text-lg mb-1" style={{ color: THEME.bubblegum }}>
              Wins: {score}
            </p>
            <p className="text-sm mb-4" style={{ color: '#ef4444' }}>
              Strikes: {'✕'.repeat(gameRef.current.lastPlaceCount)}{'○'.repeat(3 - gameRef.current.lastPlaceCount)}
            </p>
            <button
              onClick={nextRace}
              className="px-8 py-4 rounded-xl text-xl font-bold border-4"
              style={{
                backgroundColor: THEME.mint,
                color: '#fff',
                borderColor: THEME.border,
                boxShadow: `4px 4px 0 ${THEME.border}`,
              }}
            >
              Next Race →
            </button>
          </div>
        )}

        {gameState === 'gameover' && (
          <div className="text-center">
            <h2
              className="text-3xl font-bold mb-2"
              style={{
                color: THEME.text,
                textShadow: `3px 3px 0 ${THEME.border}`,
              }}
            >
              GAME OVER
            </h2>
            <p className="text-lg mb-1" style={{ color: THEME.bubblegum }}>
              {score} {score === 1 ? 'Win' : 'Wins'}
            </p>
            <p className="text-sm mb-4" style={{ color: '#94a3b8' }}>
              Race {raceNum}
            </p>

            <div className="w-full max-w-sm mb-4">
              <ScoreFlow
                score={score}
                gameId={GAME_ID}
                colors={SCORE_FLOW_COLORS}
                onRankReceived={(rank, entryId) => setSubmittedEntryId(entryId ?? null)}
              />
            </div>

            <div className="mb-4">
              <ShareButtonContainer
                id="share-btn-flop"
                url={`${typeof window !== 'undefined' ? window.location.origin : ''}/pixelpit/arcade/flop/share/${score}`}
                text={`I won ${score} races in FLOP! 🏃💥`}
                style="minimal"
                socialLoaded={socialLoaded}
              />
            </div>

            <div className="flex gap-4 justify-center">
              <button
                onClick={startGame}
                className="px-6 py-3 rounded-xl font-bold border-3"
                style={{
                  backgroundColor: THEME.bubblegum,
                  color: '#fff',
                  borderColor: THEME.border,
                  border: `3px solid ${THEME.border}`,
                  boxShadow: `4px 4px 0 ${THEME.border}`,
                }}
              >
                Play Again
              </button>
              <button
                onClick={() => setShowLeaderboard(!showLeaderboard)}
                className="px-6 py-3 rounded-xl font-bold"
                style={{
                  borderColor: THEME.bubblegum,
                  color: THEME.bubblegum,
                  backgroundColor: 'transparent',
                  border: `3px solid ${THEME.bubblegum}`,
                  boxShadow: `4px 4px 0 ${THEME.border}`,
                }}
              >
                {showLeaderboard ? 'Hide' : 'Leaderboard'}
              </button>
            </div>

            {showLeaderboard && (
              <div className="mt-6 w-full max-w-md">
                <Leaderboard
                  gameId={GAME_ID}
                  limit={10}
                  entryId={submittedEntryId ?? undefined}
                  colors={LEADERBOARD_COLORS}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
