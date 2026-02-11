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

const GAME_ID = 'swarm';

// PLAYROOM theme
const THEME = {
  bg: '#f0fdf4',      // Soft green
  surface: '#ffffff',
  meadow: '#86efac',
  sky: '#e0f2fe',
  text: '#1e293b',
  bee: '#facc15',
  beeStripe: '#1e293b',
};

// Gate colors
const GATE_COLORS: Record<string, string> = {
  '×2': '#f472b6',  // Pink
  '×3': '#22d3ee',  // Cyan
  '×5': '#a78bfa',  // Purple
  '+5': '#facc15',  // Yellow
};

// Physics
const BEE_SPEED = 8;
const SPREAD_ANGLE = 8; // degrees
const GRAVITY = 0.15;

// Social colors
const SCORE_FLOW_COLORS: ScoreFlowColors = {
  bg: '#f0fdf4',
  surface: '#ffffff',
  primary: '#facc15',
  secondary: '#f472b6',
  text: '#1e293b',
  muted: '#71717a',
  error: '#ef4444',
};

const LEADERBOARD_COLORS: LeaderboardColors = {
  bg: '#f0fdf4',
  surface: '#ffffff',
  primary: '#facc15',
  secondary: '#f472b6',
  text: '#1e293b',
  muted: '#71717a',
};

// Level definitions - World 1 (Meadow, no hazards)
interface Gate {
  x: number;
  y: number;
  type: '×2' | '×3' | '×5' | '+5';
  width: number;
}

interface LevelDef {
  startBees: number;
  requiredBees: number;
  gates: Gate[];
  basketX: number;
  basketY: number;
}

const LEVELS: LevelDef[] = [
  // Level 1: Tutorial - one ×2 gate, need 2 bees
  {
    startBees: 1,
    requiredBees: 2,
    gates: [{ x: 0.5, y: 0.5, type: '×2', width: 120 }],
    basketX: 0.5,
    basketY: 0.15,
  },
  // Level 2: Two ×2 gates in a row
  {
    startBees: 1,
    requiredBees: 4,
    gates: [
      { x: 0.5, y: 0.6, type: '×2', width: 100 },
      { x: 0.5, y: 0.35, type: '×2', width: 100 },
    ],
    basketX: 0.5,
    basketY: 0.12,
  },
  // Level 3: Choice - ×2 left or ×3 right
  {
    startBees: 1,
    requiredBees: 3,
    gates: [
      { x: 0.3, y: 0.5, type: '×2', width: 80 },
      { x: 0.7, y: 0.5, type: '×3', width: 80 },
    ],
    basketX: 0.5,
    basketY: 0.15,
  },
  // Level 4: ×2 → ×2 → ×2 = 8
  {
    startBees: 1,
    requiredBees: 8,
    gates: [
      { x: 0.5, y: 0.65, type: '×2', width: 90 },
      { x: 0.5, y: 0.45, type: '×2', width: 90 },
      { x: 0.5, y: 0.25, type: '×2', width: 90 },
    ],
    basketX: 0.5,
    basketY: 0.1,
  },
  // Level 5: Introduce ×5, need 10
  {
    startBees: 2,
    requiredBees: 10,
    gates: [
      { x: 0.5, y: 0.5, type: '×5', width: 70 },
    ],
    basketX: 0.5,
    basketY: 0.15,
  },
  // Level 6: Branching - ×2+×2 left vs ×3 right
  {
    startBees: 1,
    requiredBees: 6,
    gates: [
      { x: 0.25, y: 0.6, type: '×2', width: 70 },
      { x: 0.25, y: 0.35, type: '×3', width: 70 },
      { x: 0.7, y: 0.5, type: '×2', width: 70 },
    ],
    basketX: 0.5,
    basketY: 0.12,
  },
  // Level 7: Need 15
  {
    startBees: 1,
    requiredBees: 15,
    gates: [
      { x: 0.5, y: 0.65, type: '×3', width: 80 },
      { x: 0.5, y: 0.4, type: '×5', width: 70 },
    ],
    basketX: 0.5,
    basketY: 0.12,
  },
  // Level 8: +5 gate intro
  {
    startBees: 1,
    requiredBees: 12,
    gates: [
      { x: 0.3, y: 0.55, type: '×2', width: 80 },
      { x: 0.7, y: 0.55, type: '+5', width: 80 },
      { x: 0.5, y: 0.3, type: '×2', width: 80 },
    ],
    basketX: 0.5,
    basketY: 0.1,
  },
  // Level 9: Multiple routes to 20
  {
    startBees: 1,
    requiredBees: 20,
    gates: [
      { x: 0.25, y: 0.6, type: '×2', width: 70 },
      { x: 0.75, y: 0.6, type: '×5', width: 60 },
      { x: 0.25, y: 0.35, type: '×5', width: 60 },
      { x: 0.75, y: 0.35, type: '×2', width: 70 },
    ],
    basketX: 0.5,
    basketY: 0.1,
  },
  // Level 10: Big finale - need 40
  {
    startBees: 1,
    requiredBees: 40,
    gates: [
      { x: 0.5, y: 0.7, type: '×2', width: 90 },
      { x: 0.35, y: 0.5, type: '×2', width: 70 },
      { x: 0.65, y: 0.5, type: '×5', width: 60 },
      { x: 0.5, y: 0.3, type: '×2', width: 80 },
    ],
    basketX: 0.5,
    basketY: 0.1,
  },
];

// Audio
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

function playLaunch() {
  if (!audioCtx || !masterGain) return;
  const t = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(440, t);
  osc.frequency.exponentialRampToValueAtTime(880, t + 0.1);
  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(0.2, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
  osc.connect(gain);
  gain.connect(masterGain);
  osc.start(t);
  osc.stop(t + 0.15);
}

function playMultiply(multiplier: number) {
  if (!audioCtx || !masterGain) return;
  const t = audioCtx.currentTime;
  const baseFreq = 300 + multiplier * 100;
  const osc = audioCtx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(baseFreq, t);
  osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.5, t + 0.15);
  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(0.25, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
  osc.connect(gain);
  gain.connect(masterGain);
  osc.start(t);
  osc.stop(t + 0.25);
}

function playSuccess() {
  if (!audioCtx || !masterGain) return;
  const t = audioCtx.currentTime;
  [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
    const osc = audioCtx!.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;
    const gain = audioCtx!.createGain();
    gain.gain.setValueAtTime(0, t + i * 0.1);
    gain.gain.linearRampToValueAtTime(0.2, t + i * 0.1 + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.1 + 0.3);
    osc.connect(gain);
    gain.connect(masterGain!);
    osc.start(t + i * 0.1);
    osc.stop(t + i * 0.1 + 0.4);
  });
}

function playBuzz(volume: number) {
  if (!audioCtx || !masterGain) return;
  const t = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(120, t);
  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(Math.min(0.1, volume * 0.02), t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
  osc.connect(gain);
  gain.connect(masterGain);
  osc.start(t);
  osc.stop(t + 0.05);
}

interface Bee {
  x: number;
  y: number;
  vx: number;
  vy: number;
  alive: boolean;
  hitBasket: boolean;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  size: number;
}

interface FloatingText {
  x: number;
  y: number;
  text: string;
  life: number;
  color: string;
}

export default function SwarmGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'levelComplete' | 'gameComplete'>('menu');
  const [canvasSize, setCanvasSize] = useState({ w: 400, h: 700 });
  const [currentLevel, setCurrentLevel] = useState(0);
  const [totalStars, setTotalStars] = useState(0);
  const [levelStars, setLevelStars] = useState<number[]>(new Array(LEVELS.length).fill(0));

  // Social
  const [socialLoaded, setSocialLoaded] = useState(false);
  const [submittedEntryId, setSubmittedEntryId] = useState<number | null>(null);
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  usePixelpitSocial(socialLoaded);

  const gameRef = useRef({
    bees: [] as Bee[],
    particles: [] as Particle[],
    floatingTexts: [] as FloatingText[],
    aiming: false,
    aimAngle: -Math.PI / 2, // Straight up
    aimStartX: 0,
    aimStartY: 0,
    launched: false,
    beesAtBasket: 0,
    gatesHit: new Set<number>(),
    shakeAmount: 0,
    basketWobble: 0,
    levelWon: false,
    levelLost: false,
    buzzTimer: 0,
  });

  const launcherY = useCallback(() => canvasSize.h - 80, [canvasSize.h]);

  const startLevel = useCallback((levelIndex: number) => {
    initAudio();
    const game = gameRef.current;
    game.bees = [];
    game.particles = [];
    game.floatingTexts = [];
    game.aiming = false;
    game.aimAngle = -Math.PI / 2;
    game.launched = false;
    game.beesAtBasket = 0;
    game.gatesHit.clear();
    game.shakeAmount = 0;
    game.basketWobble = 0;
    game.levelWon = false;
    game.levelLost = false;
    game.buzzTimer = 0;

    setCurrentLevel(levelIndex);
    setGameState('playing');
  }, []);

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
    if (!canvas || gameState !== 'playing') return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = canvasSize.w;
    canvas.height = canvasSize.h;

    let animationId: number;
    let lastTime = 0;

    const level = LEVELS[currentLevel];
    const launchY = launcherY();
    const launchX = canvasSize.w / 2;

    const update = (dt: number) => {
      const game = gameRef.current;
      if (game.levelWon || game.levelLost) return;

      // Update bees
      let activeBees = 0;
      for (const bee of game.bees) {
        if (!bee.alive || bee.hitBasket) continue;
        activeBees++;

        bee.vy += GRAVITY;
        bee.x += bee.vx;
        bee.y += bee.vy;

        // Wall bounce
        if (bee.x < 15) {
          bee.x = 15;
          bee.vx *= -0.8;
        }
        if (bee.x > canvasSize.w - 15) {
          bee.x = canvasSize.w - 15;
          bee.vx *= -0.8;
        }

        // Check gate collisions
        for (let i = 0; i < level.gates.length; i++) {
          const gate = level.gates[i];
          const gateX = gate.x * canvasSize.w;
          const gateY = gate.y * canvasSize.h;
          const halfWidth = gate.width / 2;

          // Gate hitbox
          if (
            bee.y > gateY - 20 &&
            bee.y < gateY + 20 &&
            bee.x > gateX - halfWidth &&
            bee.x < gateX + halfWidth &&
            !game.gatesHit.has(i * 1000 + bee.x | 0) // Prevent double-hit
          ) {
            game.gatesHit.add(i * 1000 + bee.x | 0);

            // Apply multiplier
            let multiplier = 1;
            let addFlat = 0;
            if (gate.type === '×2') multiplier = 2;
            else if (gate.type === '×3') multiplier = 3;
            else if (gate.type === '×5') multiplier = 5;
            else if (gate.type === '+5') addFlat = 5;

            const currentBeeCount = game.bees.filter(b => b.alive && !b.hitBasket).length;

            if (multiplier > 1) {
              // Spawn (multiplier - 1) new bees
              for (let j = 0; j < multiplier - 1; j++) {
                const spreadAngle = ((j - (multiplier - 2) / 2) * SPREAD_ANGLE * Math.PI) / 180;
                const speed = Math.sqrt(bee.vx * bee.vx + bee.vy * bee.vy);
                const baseAngle = Math.atan2(bee.vy, bee.vx);
                game.bees.push({
                  x: bee.x + (Math.random() - 0.5) * 10,
                  y: bee.y,
                  vx: Math.cos(baseAngle + spreadAngle) * speed,
                  vy: Math.sin(baseAngle + spreadAngle) * speed,
                  alive: true,
                  hitBasket: false,
                });
              }
              playMultiply(multiplier);
              game.shakeAmount = multiplier;
            } else if (addFlat > 0) {
              for (let j = 0; j < addFlat; j++) {
                game.bees.push({
                  x: bee.x + (Math.random() - 0.5) * 20,
                  y: bee.y,
                  vx: bee.vx + (Math.random() - 0.5) * 2,
                  vy: bee.vy,
                  alive: true,
                  hitBasket: false,
                });
              }
              playMultiply(2);
            }

            // Floating text
            game.floatingTexts.push({
              x: gateX,
              y: gateY - 30,
              text: gate.type,
              life: 1,
              color: GATE_COLORS[gate.type],
            });

            // Particles
            for (let p = 0; p < 10; p++) {
              game.particles.push({
                x: gateX,
                y: gateY,
                vx: (Math.random() - 0.5) * 4,
                vy: (Math.random() - 0.5) * 4,
                life: 0.5,
                color: '#facc15',
                size: 3 + Math.random() * 3,
              });
            }
          }
        }

        // Check basket collision
        const basketX = level.basketX * canvasSize.w;
        const basketY = level.basketY * canvasSize.h;
        const basketWidth = 80;
        const basketHeight = 50;

        if (
          bee.y > basketY - basketHeight / 2 &&
          bee.y < basketY + basketHeight / 2 &&
          bee.x > basketX - basketWidth / 2 &&
          bee.x < basketX + basketWidth / 2
        ) {
          bee.hitBasket = true;
          game.beesAtBasket++;
          game.basketWobble = 0.3;

          // Particles
          for (let p = 0; p < 5; p++) {
            game.particles.push({
              x: bee.x,
              y: bee.y,
              vx: (Math.random() - 0.5) * 3,
              vy: -Math.random() * 3,
              life: 0.4,
              color: '#facc15',
              size: 2 + Math.random() * 2,
            });
          }
        }

        // Off screen
        if (bee.y > canvasSize.h + 50 || bee.y < -50) {
          bee.alive = false;
        }
      }

      // Buzz sound based on bee count
      game.buzzTimer -= dt;
      if (game.buzzTimer <= 0 && activeBees > 0) {
        playBuzz(activeBees);
        game.buzzTimer = 0.1;
      }

      // Check win/lose
      if (game.launched && activeBees === 0) {
        if (game.beesAtBasket >= level.requiredBees) {
          game.levelWon = true;
          playSuccess();

          // Calculate stars
          const ratio = game.beesAtBasket / level.requiredBees;
          let stars = 1;
          if (ratio >= 2) stars = 3;
          else if (ratio >= 1.5) stars = 2;

          // Update stars
          const newLevelStars = [...levelStars];
          newLevelStars[currentLevel] = Math.max(newLevelStars[currentLevel], stars);
          setLevelStars(newLevelStars);
          setTotalStars(newLevelStars.reduce((a, b) => a + b, 0));

          setTimeout(() => {
            setGameState('levelComplete');
          }, 1000);
        } else {
          game.levelLost = true;
          setTimeout(() => {
            // Restart level
            startLevel(currentLevel);
          }, 1500);
        }
      }

      // Update particles
      game.particles = game.particles.filter((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.1;
        p.life -= dt * 2;
        return p.life > 0;
      });

      // Update floating texts
      game.floatingTexts = game.floatingTexts.filter((t) => {
        t.y -= 1;
        t.life -= dt;
        return t.life > 0;
      });

      // Decay effects
      game.shakeAmount *= 0.9;
      game.basketWobble *= 0.9;
    };

    const draw = () => {
      const game = gameRef.current;
      const level = LEVELS[currentLevel];

      // Shake
      const shakeX = (Math.random() - 0.5) * game.shakeAmount * 2;
      const shakeY = (Math.random() - 0.5) * game.shakeAmount * 2;

      // Background gradient (sky to meadow)
      const gradient = ctx.createLinearGradient(0, 0, 0, canvasSize.h);
      gradient.addColorStop(0, THEME.sky);
      gradient.addColorStop(0.6, THEME.bg);
      gradient.addColorStop(1, THEME.meadow);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvasSize.w, canvasSize.h);

      ctx.save();
      ctx.translate(shakeX, shakeY);

      // Draw gates (flowers)
      for (const gate of level.gates) {
        const x = gate.x * canvasSize.w;
        const y = gate.y * canvasSize.h;
        const color = GATE_COLORS[gate.type];

        // Stem
        ctx.strokeStyle = '#22c55e';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(x, y + 20);
        ctx.lineTo(x, y + 50);
        ctx.stroke();

        // Petals
        ctx.fillStyle = color;
        for (let i = 0; i < 6; i++) {
          const angle = (i / 6) * Math.PI * 2;
          const petalX = x + Math.cos(angle) * 18;
          const petalY = y + Math.sin(angle) * 18;
          ctx.beginPath();
          ctx.ellipse(petalX, petalY, 12, 8, angle, 0, Math.PI * 2);
          ctx.fill();
        }

        // Center
        ctx.fillStyle = '#facc15';
        ctx.beginPath();
        ctx.arc(x, y, 10, 0, Math.PI * 2);
        ctx.fill();

        // Multiplier text
        ctx.fillStyle = THEME.text;
        ctx.font = 'bold 16px ui-monospace';
        ctx.textAlign = 'center';
        ctx.fillText(gate.type, x, y - 30);

        // Gate width indicator
        ctx.strokeStyle = color + '40';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(x - gate.width / 2, y);
        ctx.lineTo(x + gate.width / 2, y);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Draw basket
      const basketX = level.basketX * canvasSize.w;
      const basketY = level.basketY * canvasSize.h;
      const wobble = Math.sin(Date.now() / 100) * game.basketWobble * 10;

      ctx.save();
      ctx.translate(basketX, basketY);
      ctx.rotate(wobble * 0.1);

      // Basket body
      ctx.fillStyle = '#92400e';
      ctx.beginPath();
      ctx.moveTo(-40, -20);
      ctx.lineTo(-35, 25);
      ctx.lineTo(35, 25);
      ctx.lineTo(40, -20);
      ctx.closePath();
      ctx.fill();

      // Weave pattern
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 2;
      for (let i = -30; i <= 30; i += 10) {
        ctx.beginPath();
        ctx.moveTo(i, -15);
        ctx.lineTo(i - 3, 20);
        ctx.stroke();
      }

      // Red cloth
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.moveTo(-35, -20);
      ctx.quadraticCurveTo(-20, -30, 0, -25);
      ctx.quadraticCurveTo(20, -30, 35, -20);
      ctx.lineTo(30, -15);
      ctx.quadraticCurveTo(0, -20, -30, -15);
      ctx.closePath();
      ctx.fill();

      ctx.restore();

      // Requirement text
      ctx.fillStyle = THEME.text;
      ctx.font = 'bold 14px ui-monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`Need: ${level.requiredBees} 🐝`, basketX, basketY + 50);

      // Draw bees
      for (const bee of game.bees) {
        if (!bee.alive) continue;

        ctx.save();
        ctx.translate(bee.x, bee.y);
        const angle = Math.atan2(bee.vy, bee.vx);
        ctx.rotate(angle);

        // Body
        ctx.fillStyle = THEME.bee;
        ctx.beginPath();
        ctx.ellipse(0, 0, 8, 6, 0, 0, Math.PI * 2);
        ctx.fill();

        // Stripes
        ctx.fillStyle = THEME.beeStripe;
        ctx.fillRect(-3, -6, 2, 12);
        ctx.fillRect(2, -6, 2, 12);

        // Wings
        ctx.fillStyle = '#ffffff80';
        const wingFlap = Math.sin(Date.now() / 20) * 0.3;
        ctx.beginPath();
        ctx.ellipse(-2, -8 + wingFlap * 5, 5, 3, -0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(2, -8 - wingFlap * 5, 5, 3, 0.3, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      }

      // Draw particles
      for (const p of game.particles) {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.life * 2;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // Draw floating texts
      for (const t of game.floatingTexts) {
        ctx.fillStyle = t.color;
        ctx.globalAlpha = t.life;
        ctx.font = 'bold 24px ui-monospace';
        ctx.textAlign = 'center';
        ctx.fillText(t.text, t.x, t.y);
      }
      ctx.globalAlpha = 1;

      ctx.restore();

      // Launcher
      ctx.fillStyle = '#78350f';
      ctx.beginPath();
      ctx.arc(launchX, launchY, 30, 0, Math.PI * 2);
      ctx.fill();

      // Starting bees indicator
      if (!game.launched) {
        ctx.fillStyle = THEME.bee;
        ctx.font = 'bold 18px ui-monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`${level.startBees} 🐝`, launchX, launchY + 5);
      }

      // Aim line
      if (game.aiming && !game.launched) {
        ctx.strokeStyle = '#facc1580';
        ctx.lineWidth = 3;
        ctx.setLineDash([10, 10]);
        ctx.beginPath();
        ctx.moveTo(launchX, launchY);
        const aimLength = 150;
        ctx.lineTo(
          launchX + Math.cos(game.aimAngle) * aimLength,
          launchY + Math.sin(game.aimAngle) * aimLength
        );
        ctx.stroke();
        ctx.setLineDash([]);

        // Arrow head
        const arrowX = launchX + Math.cos(game.aimAngle) * aimLength;
        const arrowY = launchY + Math.sin(game.aimAngle) * aimLength;
        ctx.fillStyle = '#facc15';
        ctx.beginPath();
        ctx.moveTo(arrowX, arrowY);
        ctx.lineTo(
          arrowX - Math.cos(game.aimAngle - 0.3) * 15,
          arrowY - Math.sin(game.aimAngle - 0.3) * 15
        );
        ctx.lineTo(
          arrowX - Math.cos(game.aimAngle + 0.3) * 15,
          arrowY - Math.sin(game.aimAngle + 0.3) * 15
        );
        ctx.closePath();
        ctx.fill();
      }

      // HUD
      ctx.fillStyle = THEME.text;
      ctx.font = 'bold 20px ui-monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`Level ${currentLevel + 1}`, 20, 40);

      ctx.textAlign = 'right';
      ctx.fillText(`🐝 ${game.beesAtBasket}/${level.requiredBees}`, canvasSize.w - 20, 40);

      // Win/lose message
      if (game.levelWon) {
        ctx.fillStyle = '#22c55e';
        ctx.font = 'bold 36px ui-monospace';
        ctx.textAlign = 'center';
        ctx.fillText('SUCCESS!', canvasSize.w / 2, canvasSize.h / 2);
        ctx.font = 'bold 24px ui-monospace';
        ctx.fillText(`${game.beesAtBasket} BEES!`, canvasSize.w / 2, canvasSize.h / 2 + 40);
      } else if (game.levelLost) {
        ctx.fillStyle = '#ef4444';
        ctx.font = 'bold 36px ui-monospace';
        ctx.textAlign = 'center';
        ctx.fillText('NOT ENOUGH!', canvasSize.w / 2, canvasSize.h / 2);
        ctx.font = '18px ui-monospace';
        ctx.fillText('Retrying...', canvasSize.w / 2, canvasSize.h / 2 + 35);
      }

      // Instructions
      if (!game.launched && !game.aiming) {
        ctx.fillStyle = THEME.text + '80';
        ctx.font = '16px ui-monospace';
        ctx.textAlign = 'center';
        ctx.fillText('SWIPE TO AIM', canvasSize.w / 2, launchY + 60);
      }
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
    const handleStart = (x: number, y: number) => {
      const game = gameRef.current;
      if (game.launched) return;
      game.aiming = true;
      game.aimStartX = x;
      game.aimStartY = y;
    };

    const handleMove = (x: number, y: number) => {
      const game = gameRef.current;
      if (!game.aiming || game.launched) return;

      const dx = x - launchX;
      const dy = y - launchY;
      // Invert: drag down to aim up
      game.aimAngle = Math.atan2(-dy, -dx);
      // Clamp to upper hemisphere
      if (game.aimAngle > 0) game.aimAngle = 0;
      if (game.aimAngle < -Math.PI) game.aimAngle = -Math.PI;
    };

    const handleEnd = () => {
      const game = gameRef.current;
      if (!game.aiming || game.launched) return;

      game.aiming = false;
      game.launched = true;
      playLaunch();

      // Launch bees
      const level = LEVELS[currentLevel];
      for (let i = 0; i < level.startBees; i++) {
        const spreadAngle = ((i - (level.startBees - 1) / 2) * SPREAD_ANGLE * Math.PI) / 180;
        game.bees.push({
          x: launchX + (Math.random() - 0.5) * 10,
          y: launchY,
          vx: Math.cos(game.aimAngle + spreadAngle) * BEE_SPEED,
          vy: Math.sin(game.aimAngle + spreadAngle) * BEE_SPEED,
          alive: true,
          hitBasket: false,
        });
      }
    };

    canvas.addEventListener('mousedown', (e) => {
      const rect = canvas.getBoundingClientRect();
      handleStart(e.clientX - rect.left, e.clientY - rect.top);
    });
    canvas.addEventListener('mousemove', (e) => {
      const rect = canvas.getBoundingClientRect();
      handleMove(e.clientX - rect.left, e.clientY - rect.top);
    });
    canvas.addEventListener('mouseup', handleEnd);

    canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const touch = e.touches[0];
      handleStart(touch.clientX - rect.left, touch.clientY - rect.top);
    }, { passive: false });
    canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const touch = e.touches[0];
      handleMove(touch.clientX - rect.left, touch.clientY - rect.top);
    }, { passive: false });
    canvas.addEventListener('touchend', (e) => {
      e.preventDefault();
      handleEnd();
    }, { passive: false });

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [gameState, canvasSize, currentLevel, launcherY, startLevel, levelStars]);

  const nextLevel = () => {
    if (currentLevel < LEVELS.length - 1) {
      startLevel(currentLevel + 1);
    } else {
      setGameState('gameComplete');
    }
  };

  return (
    <>
      <Script
        src="/pixelpit/social.js"
        strategy="afterInteractive"
        onLoad={() => setSocialLoaded(true)}
      />

      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: THEME.bg,
          fontFamily: 'ui-monospace, monospace',
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        {gameState === 'menu' && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 20,
              background: `linear-gradient(180deg, ${THEME.sky} 0%, ${THEME.bg} 60%, ${THEME.meadow} 100%)`,
            }}
          >
            <div style={{ fontSize: 80, marginBottom: 10 }}>🐝</div>
            <h1
              style={{
                color: THEME.text,
                fontSize: 48,
                marginBottom: 10,
                fontWeight: 900,
              }}
            >
              SWARM
            </h1>

            <p
              style={{
                color: '#71717a',
                fontSize: 16,
                marginBottom: 30,
                textAlign: 'center',
                lineHeight: 1.6,
                maxWidth: 280,
              }}
            >
              Aim your bees through flowers.<br />
              Watch them multiply!<br />
              Overwhelm the basket!
            </p>

            {/* Level select */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(5, 1fr)',
                gap: 8,
                marginBottom: 30,
                maxWidth: 300,
              }}
            >
              {LEVELS.map((_, i) => (
                <button
                  key={i}
                  onClick={() => startLevel(i)}
                  style={{
                    width: 50,
                    height: 50,
                    background: levelStars[i] > 0 ? THEME.bee : THEME.surface,
                    border: `2px solid ${THEME.text}20`,
                    borderRadius: 10,
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 14,
                    fontWeight: 600,
                    color: THEME.text,
                  }}
                >
                  {i + 1}
                  <div style={{ fontSize: 10 }}>
                    {'⭐'.repeat(levelStars[i])}
                  </div>
                </button>
              ))}
            </div>

            <button
              onClick={() => startLevel(0)}
              style={{
                background: THEME.bee,
                color: THEME.text,
                border: 'none',
                padding: '18px 60px',
                fontSize: 18,
                fontWeight: 700,
                cursor: 'pointer',
                borderRadius: 30,
                boxShadow: '0 4px 0 #ca8a04',
              }}
            >
              START
            </button>

            <div style={{ marginTop: 20, color: '#71717a', fontSize: 14 }}>
              Total: {totalStars} / {LEVELS.length * 3} ⭐
            </div>

            <button
              onClick={() => setShowLeaderboard(true)}
              style={{
                marginTop: 20,
                background: 'transparent',
                color: THEME.text,
                border: `2px solid ${THEME.text}30`,
                padding: '10px 24px',
                fontSize: 14,
                cursor: 'pointer',
                borderRadius: 20,
              }}
            >
              Leaderboard
            </button>
          </div>
        )}

        {showLeaderboard && gameState !== 'playing' && (
          <div
            onClick={() => setShowLeaderboard(false)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.8)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 100,
              padding: 20,
            }}
          >
            <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: 400 }}>
              <Leaderboard
                gameId={GAME_ID}
                limit={10}
                entryId={submittedEntryId ?? undefined}
                colors={LEADERBOARD_COLORS}
              />
            </div>
            <button
              onClick={() => setShowLeaderboard(false)}
              style={{
                marginTop: 20,
                background: THEME.bee,
                color: THEME.text,
                border: 'none',
                padding: '12px 30px',
                fontSize: 14,
                cursor: 'pointer',
                borderRadius: 20,
              }}
            >
              Close
            </button>
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

        {gameState === 'levelComplete' && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              background: `linear-gradient(180deg, ${THEME.sky} 0%, ${THEME.bg} 100%)`,
              padding: 20,
            }}
          >
            <div style={{ fontSize: 60, marginBottom: 10 }}>🎉</div>
            <h1 style={{ color: THEME.text, fontSize: 36, marginBottom: 10, fontWeight: 900 }}>
              LEVEL {currentLevel + 1} COMPLETE!
            </h1>

            <div style={{ fontSize: 48, marginBottom: 20 }}>
              {'⭐'.repeat(levelStars[currentLevel])}
              {'☆'.repeat(3 - levelStars[currentLevel])}
            </div>

            <p style={{ color: '#71717a', fontSize: 18, marginBottom: 30 }}>
              {gameRef.current.beesAtBasket} bees reached the basket!
            </p>

            <div style={{ display: 'flex', gap: 15 }}>
              <button
                onClick={() => startLevel(currentLevel)}
                style={{
                  background: 'transparent',
                  color: THEME.text,
                  border: `2px solid ${THEME.text}`,
                  padding: '14px 28px',
                  fontSize: 16,
                  cursor: 'pointer',
                  borderRadius: 25,
                }}
              >
                RETRY
              </button>
              <button
                onClick={nextLevel}
                style={{
                  background: THEME.bee,
                  color: THEME.text,
                  border: 'none',
                  padding: '14px 28px',
                  fontSize: 16,
                  fontWeight: 700,
                  cursor: 'pointer',
                  borderRadius: 25,
                  boxShadow: '0 4px 0 #ca8a04',
                }}
              >
                {currentLevel < LEVELS.length - 1 ? 'NEXT' : 'FINISH'}
              </button>
            </div>
          </div>
        )}

        {gameState === 'gameComplete' && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              background: `linear-gradient(180deg, ${THEME.sky} 0%, ${THEME.bg} 100%)`,
              padding: 20,
              overflowY: 'auto',
            }}
          >
            <div style={{ fontSize: 80, marginBottom: 10 }}>🏆</div>
            <h1 style={{ color: THEME.text, fontSize: 36, marginBottom: 10, fontWeight: 900 }}>
              WORLD 1 COMPLETE!
            </h1>

            <div style={{ color: '#71717a', fontSize: 18, marginBottom: 20 }}>
              Total Stars: {totalStars} / {LEVELS.length * 3}
            </div>

            <div style={{ width: '100%', maxWidth: 350, marginBottom: 20 }}>
              <ScoreFlow
                score={totalStars}
                gameId={GAME_ID}
                colors={SCORE_FLOW_COLORS}
                onRankReceived={(rank, entryId) => setSubmittedEntryId(entryId ?? null)}
              />
            </div>

            <ShareButtonContainer
              id="share-btn-swarm"
              url={`${typeof window !== 'undefined' ? window.location.origin : ''}/pixelpit/arcade/swarm`}
              text={`I collected ${totalStars} stars in SWARM! 🐝`}
              style="minimal"
              socialLoaded={socialLoaded}
            />

            <button
              onClick={() => setGameState('menu')}
              style={{
                marginTop: 20,
                background: THEME.bee,
                color: THEME.text,
                border: 'none',
                padding: '14px 40px',
                fontSize: 16,
                fontWeight: 700,
                cursor: 'pointer',
                borderRadius: 25,
                boxShadow: '0 4px 0 #ca8a04',
              }}
            >
              PLAY AGAIN
            </button>
          </div>
        )}
      </div>
    </>
  );
}
