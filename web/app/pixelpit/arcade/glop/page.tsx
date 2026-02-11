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

const GAME_ID = 'glop';

// Slime tiers
const SLIMES = [
  { name: 'Droplet', radius: 8, color: '#22d3ee', mass: 1 },
  { name: 'Blob', radius: 12, color: '#a3e635', mass: 2 },
  { name: 'Puddle', radius: 16, color: '#facc15', mass: 3 },
  { name: 'Slime', radius: 24, color: '#fb923c', mass: 5 },
  { name: 'Ooze', radius: 32, color: '#f472b6', mass: 8 },
  { name: 'Gloop', radius: 40, color: '#a78bfa', mass: 13 },
  { name: 'Glob', radius: 48, color: '#ef4444', mass: 21 },
  { name: 'KING', radius: 64, color: '#fbbf24', mass: 34 },
];

// Spawn weights for tiers 0-3
const SPAWN_WEIGHTS = [40, 30, 20, 10];

// Physics
const GRAVITY = 0.5;
const MAX_FALL_SPEED = 12;
const BOUNCE = 0.6;
const FRICTION = 0.92;
const WALL_BOUNCE = 0.5;
const MERGE_OVERLAP = 0.5;

// Cauldron dimensions
const CAULDRON_WIDTH = 300;
const CAULDRON_HEIGHT = 400;
const OVERFLOW_LINE = 50;

// INDIE BITE theme
const THEME = {
  bg: '#09090b',
  cauldron: '#18181b',
  glow: '#a3e635',
  text: '#ffffff',
};

// Social colors
const SCORE_FLOW_COLORS: ScoreFlowColors = {
  bg: '#09090b',
  surface: '#18181b',
  primary: '#a3e635',
  secondary: '#22d3ee',
  text: '#ffffff',
  muted: '#71717a',
  error: '#ef4444',
};

const LEADERBOARD_COLORS: LeaderboardColors = {
  bg: '#09090b',
  surface: '#18181b',
  primary: '#a3e635',
  secondary: '#22d3ee',
  text: '#ffffff',
  muted: '#71717a',
};

// Audio
let audioCtx: AudioContext | null = null;
let masterGain: GainNode | null = null;

function initAudio() {
  if (audioCtx) return;
  audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  masterGain = audioCtx.createGain();
  masterGain.gain.value = 0.4;
  masterGain.connect(audioCtx.destination);
  if (audioCtx.state === 'suspended') audioCtx.resume();
}

function playDrop() {
  if (!audioCtx || !masterGain) return;
  const t = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(300, t);
  osc.frequency.exponentialRampToValueAtTime(150, t + 0.1);
  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(0.15, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
  osc.connect(gain);
  gain.connect(masterGain);
  osc.start(t);
  osc.stop(t + 0.15);
}

function playMerge(tier: number) {
  if (!audioCtx || !masterGain) return;
  const t = audioCtx.currentTime;
  const baseFreq = 200 + tier * 50;
  const osc = audioCtx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(baseFreq, t);
  osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.5, t + 0.1);
  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(0.2, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
  osc.connect(gain);
  gain.connect(masterGain);
  osc.start(t);
  osc.stop(t + 0.25);
}

function playKingSlime() {
  if (!audioCtx || !masterGain) return;
  const t = audioCtx.currentTime;
  [261.63, 329.63, 392, 523.25, 659.25].forEach((freq, i) => {
    const osc = audioCtx!.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;
    const gain = audioCtx!.createGain();
    gain.gain.setValueAtTime(0, t + i * 0.1);
    gain.gain.linearRampToValueAtTime(0.2, t + i * 0.1 + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.1 + 0.4);
    osc.connect(gain);
    gain.connect(masterGain!);
    osc.start(t + i * 0.1);
    osc.stop(t + i * 0.1 + 0.5);
  });
}

function playGameOver() {
  if (!audioCtx || !masterGain) return;
  const t = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(200, t);
  osc.frequency.exponentialRampToValueAtTime(50, t + 0.5);
  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(0.15, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
  osc.connect(gain);
  gain.connect(masterGain);
  osc.start(t);
  osc.stop(t + 0.6);
}

interface Slime {
  id: number;
  tier: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  merged: boolean;
  mergeTimer: number;
  squash: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
}

// Tutorial steps
const TUTORIAL_STEPS = [
  {
    title: 'MATCH',
    instruction: 'DROP ON THE SAME COLOR',
    emoji: '🎯',
  },
  {
    title: 'AIM',
    instruction: 'FIND THE MATCH',
    emoji: '👈',
  },
  {
    title: 'CHAIN',
    instruction: 'WATCH THE COMBO',
    emoji: '🔥',
  },
];

export default function GlopGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<'start' | 'playing' | 'tutorial' | 'end'>('start');
  const [canvasSize, setCanvasSize] = useState({ w: 400, h: 700 });
  
  // Social
  const [socialLoaded, setSocialLoaded] = useState(false);
  const [submittedEntryId, setSubmittedEntryId] = useState<number | null>(null);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  
  // Tutorial
  const [tutorialStep, setTutorialStep] = useState(0);
  const [tutorialMessage, setTutorialMessage] = useState('');

  usePixelpitSocial(socialLoaded);

  const gameRef = useRef({
    running: false,
    score: 0,
    highestTier: 0,
    slimes: [] as Slime[],
    nextSlimeId: 0,
    nextTier: 0,
    dropX: 150,
    canDrop: true,
    particles: [] as Particle[],
    overflowTimer: 0,
    shakeAmount: 0,
    slowMo: false,
    slowMoTimer: 0,
    bubbles: [] as { x: number; y: number; size: number; speed: number }[],
    // Tutorial state
    isTutorial: false,
    tutorialStep: 0,
    tutorialWaitingForMerge: false,
    tutorialComplete: false,
  });

  const getSpawnTier = useCallback(() => {
    const rand = Math.random() * 100;
    let cumulative = 0;
    for (let i = 0; i < SPAWN_WEIGHTS.length; i++) {
      cumulative += SPAWN_WEIGHTS[i];
      if (rand < cumulative) return i;
    }
    return 0;
  }, []);

  const cauldronLeft = useCallback(() => {
    return (canvasSize.w - CAULDRON_WIDTH) / 2;
  }, [canvasSize.w]);

  const cauldronTop = useCallback(() => {
    return canvasSize.h - CAULDRON_HEIGHT - 50;
  }, [canvasSize.h]);

  const initGameState = useCallback(() => {
    const game = gameRef.current;
    game.running = true;
    game.score = 0;
    game.highestTier = 0;
    game.slimes = [];
    game.nextSlimeId = 0;
    game.dropX = CAULDRON_WIDTH / 2;
    game.canDrop = true;
    game.particles = [];
    game.overflowTimer = 0;
    game.shakeAmount = 0;
    game.slowMo = false;
    game.slowMoTimer = 0;
    game.isTutorial = false;
    game.tutorialStep = 0;
    game.tutorialWaitingForMerge = false;
    game.tutorialComplete = false;
    
    // Ambient bubbles
    game.bubbles = [];
    for (let i = 0; i < 10; i++) {
      game.bubbles.push({
        x: Math.random() * CAULDRON_WIDTH,
        y: Math.random() * CAULDRON_HEIGHT,
        size: 2 + Math.random() * 4,
        speed: 0.5 + Math.random() * 1,
      });
    }
  }, []);

  const setupTutorialStep = useCallback((step: number) => {
    const game = gameRef.current;
    game.slimes = [];
    game.nextSlimeId = 0;
    game.particles = [];
    game.canDrop = true;
    game.tutorialWaitingForMerge = false;
    
    if (step === 0) {
      // Step 1: One cyan in cauldron, give them cyan
      game.slimes.push({
        id: game.nextSlimeId++,
        tier: 0, // Cyan
        x: CAULDRON_WIDTH / 2,
        y: CAULDRON_HEIGHT - 50,
        vx: 0,
        vy: 0,
        merged: false,
        mergeTimer: 0,
        squash: 1,
      });
      game.nextTier = 0; // Cyan
      game.dropX = CAULDRON_WIDTH / 2;
    } else if (step === 1) {
      // Step 2: Cyan left, Lime right, give them cyan
      game.slimes.push({
        id: game.nextSlimeId++,
        tier: 0, // Cyan
        x: CAULDRON_WIDTH * 0.3,
        y: CAULDRON_HEIGHT - 50,
        vx: 0,
        vy: 0,
        merged: false,
        mergeTimer: 0,
        squash: 1,
      });
      game.slimes.push({
        id: game.nextSlimeId++,
        tier: 1, // Lime
        x: CAULDRON_WIDTH * 0.7,
        y: CAULDRON_HEIGHT - 50,
        vx: 0,
        vy: 0,
        merged: false,
        mergeTimer: 0,
        squash: 1,
      });
      game.nextTier = 0; // Cyan
      game.dropX = CAULDRON_WIDTH * 0.3;
    } else if (step === 2) {
      // Step 3: Chain setup - cyan touching lime
      game.slimes.push({
        id: game.nextSlimeId++,
        tier: 0, // Cyan
        x: CAULDRON_WIDTH / 2 - 30,
        y: CAULDRON_HEIGHT - 50,
        vx: 0,
        vy: 0,
        merged: false,
        mergeTimer: 0,
        squash: 1,
      });
      game.slimes.push({
        id: game.nextSlimeId++,
        tier: 1, // Lime (will be created when cyans merge)
        x: CAULDRON_WIDTH / 2 + 30,
        y: CAULDRON_HEIGHT - 50,
        vx: 0,
        vy: 0,
        merged: false,
        mergeTimer: 0,
        squash: 1,
      });
      game.nextTier = 0; // Cyan
      game.dropX = CAULDRON_WIDTH / 2 - 30;
    }
    
    setTutorialStep(step);
    setTutorialMessage('');
  }, []);

  const startTutorial = useCallback(() => {
    initAudio();
    initGameState();
    
    const game = gameRef.current;
    game.isTutorial = true;
    game.tutorialStep = 0;
    
    setupTutorialStep(0);
    setGameState('tutorial');
  }, [initGameState, setupTutorialStep]);

  const startGame = useCallback(() => {
    initAudio();
    initGameState();
    
    const game = gameRef.current;
    game.nextTier = getSpawnTier();
    
    setGameState('playing');
  }, [getSpawnTier, initGameState]);

  const dropSlime = useCallback(() => {
    const game = gameRef.current;
    if (!game.canDrop || !game.running) return;
    
    playDrop();
    
    const slime: Slime = {
      id: game.nextSlimeId++,
      tier: game.nextTier,
      x: game.dropX,
      y: 30,
      vx: 0,
      vy: 0,
      merged: false,
      mergeTimer: 0,
      squash: 1,
    };
    
    game.slimes.push(slime);
    game.nextTier = getSpawnTier();
    game.canDrop = false;
    
    // Re-enable drop after slime settles
    setTimeout(() => {
      game.canDrop = true;
    }, 500);
  }, [getSpawnTier]);

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

      // Slow-mo
      if (game.slowMo) {
        dt *= 0.2;
        game.slowMoTimer -= dt * 5; // Use real time for timer
        if (game.slowMoTimer <= 0) {
          game.slowMo = false;
        }
      }

      const cLeft = cauldronLeft();
      const cTop = cauldronTop();
      const cBottom = cTop + CAULDRON_HEIGHT;
      const cRight = cLeft + CAULDRON_WIDTH;
      const cCenterX = cLeft + CAULDRON_WIDTH / 2;

      // Update slimes
      for (const slime of game.slimes) {
        if (slime.merged) continue;

        const radius = SLIMES[slime.tier].radius;

        // Apply gravity
        slime.vy += GRAVITY;
        slime.vy = Math.min(slime.vy, MAX_FALL_SPEED);

        // Apply friction
        slime.vx *= FRICTION;
        slime.vy *= FRICTION;

        // Move
        slime.x += slime.vx;
        slime.y += slime.vy;

        // Cauldron collision (left/right walls)
        if (slime.x - radius < 0) {
          slime.x = radius;
          slime.vx *= -WALL_BOUNCE;
        }
        if (slime.x + radius > CAULDRON_WIDTH) {
          slime.x = CAULDRON_WIDTH - radius;
          slime.vx *= -WALL_BOUNCE;
        }

        // Cauldron bottom (curved)
        const distFromCenter = Math.abs(slime.x - CAULDRON_WIDTH / 2);
        const curveY = CAULDRON_HEIGHT - Math.sqrt(Math.max(0, (CAULDRON_WIDTH / 2) ** 2 - distFromCenter ** 2)) * 0.3;
        const bottomY = Math.min(CAULDRON_HEIGHT, curveY);

        if (slime.y + radius > bottomY) {
          slime.y = bottomY - radius;
          slime.vy *= -BOUNCE;
          slime.squash = 0.7;
          
          // Slight slide toward center
          slime.vx += (CAULDRON_WIDTH / 2 - slime.x) * 0.01;
        }

        // Squash recovery
        slime.squash += (1 - slime.squash) * 0.2;

        // Merge timer decay
        if (slime.mergeTimer > 0) {
          slime.mergeTimer -= dt * 1000;
        }
      }

      // Slime-slime collision
      for (let i = 0; i < game.slimes.length; i++) {
        const a = game.slimes[i];
        if (a.merged) continue;

        for (let j = i + 1; j < game.slimes.length; j++) {
          const b = game.slimes[j];
          if (b.merged) continue;

          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const minDist = SLIMES[a.tier].radius + SLIMES[b.tier].radius;

          if (dist < minDist) {
            // Check for merge
            const overlap = 1 - dist / minDist;
            if (overlap >= MERGE_OVERLAP && a.tier === b.tier && a.tier < SLIMES.length - 1) {
              // Merge!
              const newTier = a.tier + 1;
              const newX = (a.x + b.x) / 2;
              const newY = (a.y + b.y) / 2;

              a.merged = true;
              b.merged = true;

              // Create merged slime
              const merged: Slime = {
                id: game.nextSlimeId++,
                tier: newTier,
                x: newX,
                y: newY,
                vx: (a.vx + b.vx) * 0.5,
                vy: (a.vy + b.vy) * 0.5,
                merged: false,
                mergeTimer: 200, // Can chain merge for 200ms
                squash: 1.3,
              };
              game.slimes.push(merged);

              // Score
              game.score += (newTier + 1) * 10;
              if (newTier > game.highestTier) {
                game.highestTier = newTier;
              }

              // Effects
              playMerge(newTier);
              game.shakeAmount = Math.min(10, 2 + newTier);

              // Particles
              for (let p = 0; p < 8; p++) {
                game.particles.push({
                  x: newX + cLeft,
                  y: newY + cTop,
                  vx: (Math.random() - 0.5) * 6,
                  vy: (Math.random() - 0.5) * 6,
                  life: 0.5,
                  color: SLIMES[newTier].color,
                });
              }

              // KING SLIME!
              if (newTier === SLIMES.length - 1) {
                playKingSlime();
                game.slowMo = true;
                game.slowMoTimer = 1;
                game.shakeAmount = 15;
                // Extra particles
                for (let p = 0; p < 20; p++) {
                  game.particles.push({
                    x: newX + cLeft,
                    y: newY + cTop,
                    vx: (Math.random() - 0.5) * 10,
                    vy: (Math.random() - 0.5) * 10,
                    life: 1,
                    color: '#fbbf24',
                  });
                }
              }
              
              // Tutorial merge detection
              if (game.isTutorial) {
                game.tutorialWaitingForMerge = true;
                // Delay to let player see the merge
                setTimeout(() => {
                  if (!game.isTutorial) return;
                  
                  if (game.tutorialStep === 0) {
                    setTutorialMessage('MERGE! 🎉');
                    setTimeout(() => {
                      if (!game.isTutorial) return;
                      game.tutorialStep = 1;
                      setupTutorialStep(1);
                    }, 1000);
                  } else if (game.tutorialStep === 1) {
                    setTutorialMessage('NICE! 🎯');
                    setTimeout(() => {
                      if (!game.isTutorial) return;
                      game.tutorialStep = 2;
                      setupTutorialStep(2);
                    }, 1000);
                  } else if (game.tutorialStep === 2) {
                    // Check if it was a chain (newTier >= 2 means we went cyan->lime->yellow)
                    if (newTier >= 2) {
                      setTutorialMessage('COMBO! 🔥');
                      game.tutorialComplete = true;
                      setTimeout(() => {
                        if (!game.isTutorial) return;
                        setTutorialMessage('READY!');
                        setTimeout(() => {
                          startGame();
                        }, 1000);
                      }, 1500);
                    } else {
                      setTutorialMessage('MERGE! Keep going...');
                    }
                  }
                }, 300);
              }
            } else {
              // Push apart
              const nx = dx / dist;
              const ny = dy / dist;
              const pushForce = (minDist - dist) * 0.3;

              const massA = SLIMES[a.tier].mass;
              const massB = SLIMES[b.tier].mass;
              const totalMass = massA + massB;

              a.x -= nx * pushForce * (massB / totalMass);
              a.y -= ny * pushForce * (massB / totalMass);
              b.x += nx * pushForce * (massA / totalMass);
              b.y += ny * pushForce * (massA / totalMass);

              // Transfer momentum
              const relVx = a.vx - b.vx;
              const relVy = a.vy - b.vy;
              const impact = relVx * nx + relVy * ny;

              if (impact > 0) {
                a.vx -= impact * nx * (massB / totalMass) * BOUNCE;
                a.vy -= impact * ny * (massB / totalMass) * BOUNCE;
                b.vx += impact * nx * (massA / totalMass) * BOUNCE;
                b.vy += impact * ny * (massA / totalMass) * BOUNCE;
              }
            }
          }
        }
      }

      // Remove merged slimes
      game.slimes = game.slimes.filter(s => !s.merged);

      // Check overflow
      let hasOverflow = false;
      for (const slime of game.slimes) {
        if (slime.y - SLIMES[slime.tier].radius < OVERFLOW_LINE) {
          hasOverflow = true;
          break;
        }
      }

      // Skip overflow in tutorial
      if (!game.isTutorial) {
        if (hasOverflow) {
          game.overflowTimer += dt;
          if (game.overflowTimer >= 1) {
            endGame();
            return;
          }
        } else {
          game.overflowTimer = Math.max(0, game.overflowTimer - dt);
        }
      }

      // Shake decay
      game.shakeAmount *= 0.9;

      // Update particles
      game.particles = game.particles.filter(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.2;
        p.life -= dt * 2;
        return p.life > 0;
      });

      // Update bubbles
      for (const bubble of game.bubbles) {
        bubble.y -= bubble.speed;
        if (bubble.y < 0) {
          bubble.y = CAULDRON_HEIGHT;
          bubble.x = Math.random() * CAULDRON_WIDTH;
        }
      }
    };

    const endGame = () => {
      const game = gameRef.current;
      game.running = false;
      playGameOver();
      
      setFinalScore(game.score);
      setSubmittedEntryId(null);
      setShowLeaderboard(false);
      setGameState('end');
      
      fetch('/api/pixelpit/stats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ game: GAME_ID }),
      }).catch(() => {});
    };

    const draw = () => {
      const game = gameRef.current;
      
      // Shake offset
      const shakeX = (Math.random() - 0.5) * game.shakeAmount;
      const shakeY = (Math.random() - 0.5) * game.shakeAmount;

      // Background
      ctx.fillStyle = THEME.bg;
      ctx.fillRect(0, 0, canvasSize.w, canvasSize.h);

      const cLeft = cauldronLeft();
      const cTop = cauldronTop();

      ctx.save();
      ctx.translate(shakeX, shakeY);

      // Cauldron glow
      const glowGrad = ctx.createRadialGradient(
        cLeft + CAULDRON_WIDTH / 2, cTop + CAULDRON_HEIGHT,
        0,
        cLeft + CAULDRON_WIDTH / 2, cTop + CAULDRON_HEIGHT,
        CAULDRON_WIDTH
      );
      glowGrad.addColorStop(0, THEME.glow + '30');
      glowGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = glowGrad;
      ctx.fillRect(0, 0, canvasSize.w, canvasSize.h);

      // Cauldron body
      ctx.fillStyle = THEME.cauldron;
      ctx.beginPath();
      ctx.moveTo(cLeft, cTop);
      ctx.lineTo(cLeft, cTop + CAULDRON_HEIGHT * 0.7);
      ctx.quadraticCurveTo(
        cLeft, cTop + CAULDRON_HEIGHT,
        cLeft + CAULDRON_WIDTH / 2, cTop + CAULDRON_HEIGHT
      );
      ctx.quadraticCurveTo(
        cLeft + CAULDRON_WIDTH, cTop + CAULDRON_HEIGHT,
        cLeft + CAULDRON_WIDTH, cTop + CAULDRON_HEIGHT * 0.7
      );
      ctx.lineTo(cLeft + CAULDRON_WIDTH, cTop);
      ctx.closePath();
      ctx.fill();

      // Cauldron inner glow
      ctx.fillStyle = '#0f0f0f';
      ctx.beginPath();
      ctx.moveTo(cLeft + 4, cTop + 4);
      ctx.lineTo(cLeft + 4, cTop + CAULDRON_HEIGHT * 0.7);
      ctx.quadraticCurveTo(
        cLeft + 4, cTop + CAULDRON_HEIGHT - 4,
        cLeft + CAULDRON_WIDTH / 2, cTop + CAULDRON_HEIGHT - 4
      );
      ctx.quadraticCurveTo(
        cLeft + CAULDRON_WIDTH - 4, cTop + CAULDRON_HEIGHT - 4,
        cLeft + CAULDRON_WIDTH - 4, cTop + CAULDRON_HEIGHT * 0.7
      );
      ctx.lineTo(cLeft + CAULDRON_WIDTH - 4, cTop + 4);
      ctx.closePath();
      ctx.fill();

      // Bubbles
      ctx.fillStyle = THEME.glow + '40';
      for (const bubble of game.bubbles) {
        ctx.beginPath();
        ctx.arc(cLeft + bubble.x, cTop + bubble.y, bubble.size, 0, Math.PI * 2);
        ctx.fill();
      }

      // Overflow line
      if (game.overflowTimer > 0) {
        ctx.strokeStyle = `rgba(239, 68, 68, ${0.5 + Math.sin(Date.now() / 100) * 0.5})`;
        ctx.lineWidth = 3;
        ctx.setLineDash([10, 5]);
        ctx.beginPath();
        ctx.moveTo(cLeft, cTop + OVERFLOW_LINE);
        ctx.lineTo(cLeft + CAULDRON_WIDTH, cTop + OVERFLOW_LINE);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Slimes
      for (const slime of game.slimes) {
        const tier = SLIMES[slime.tier];
        const x = cLeft + slime.x;
        const y = cTop + slime.y;

        // Glow for high tiers
        if (slime.tier >= 5) {
          ctx.shadowColor = tier.color;
          ctx.shadowBlur = 10 + slime.tier * 2;
        }

        // Rainbow shimmer for KING
        let fillColor = tier.color;
        if (slime.tier === SLIMES.length - 1) {
          const hue = (Date.now() / 20) % 360;
          fillColor = `hsl(${hue}, 80%, 60%)`;
        }

        ctx.fillStyle = fillColor;
        ctx.beginPath();
        ctx.ellipse(x, y, tier.radius, tier.radius * slime.squash, 0, 0, Math.PI * 2);
        ctx.fill();

        // Highlight
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.beginPath();
        ctx.ellipse(x - tier.radius * 0.3, y - tier.radius * 0.3, tier.radius * 0.3, tier.radius * 0.2, -0.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.shadowBlur = 0;
      }

      // Particles
      for (const p of game.particles) {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.life * 2;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      ctx.restore();

      // UI - Drop preview
      if (game.canDrop && game.running) {
        const previewTier = SLIMES[game.nextTier];
        const previewX = cLeft + game.dropX;
        const previewY = cTop - 30;

        // Drop line
        ctx.strokeStyle = '#ffffff30';
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(previewX, previewY + previewTier.radius);
        ctx.lineTo(previewX, cTop + CAULDRON_HEIGHT);
        ctx.stroke();
        ctx.setLineDash([]);

        // Preview slime
        ctx.fillStyle = previewTier.color;
        ctx.beginPath();
        ctx.arc(previewX, previewY, previewTier.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.beginPath();
        ctx.arc(previewX - previewTier.radius * 0.3, previewY - previewTier.radius * 0.3, previewTier.radius * 0.3, 0, Math.PI * 2);
        ctx.fill();
      }

      // Score
      ctx.fillStyle = THEME.text;
      ctx.font = 'bold 48px ui-monospace, monospace';
      ctx.textAlign = 'center';
      ctx.fillText(game.score.toString(), canvasSize.w / 2, 60);

      // Highest tier achieved
      if (game.highestTier > 0) {
        ctx.font = '14px ui-monospace, monospace';
        ctx.fillStyle = SLIMES[game.highestTier].color;
        ctx.fillText(`Best: ${SLIMES[game.highestTier].name}`, canvasSize.w / 2, 85);
      }

      // Slow-mo indicator
      if (game.slowMo) {
        ctx.fillStyle = '#fbbf24';
        ctx.font = 'bold 24px ui-monospace, monospace';
        ctx.fillText('👑 KING SLIME! 👑', canvasSize.w / 2, canvasSize.h / 2 - 100);
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
    const handleMove = (clientX: number) => {
      const rect = canvas.getBoundingClientRect();
      const x = clientX - rect.left;
      const cLeft = cauldronLeft();
      const relX = x - cLeft;
      const nextRadius = SLIMES[gameRef.current.nextTier].radius;
      gameRef.current.dropX = Math.max(nextRadius, Math.min(CAULDRON_WIDTH - nextRadius, relX));
    };

    const handleTap = () => {
      if (gameState === 'playing' || gameState === 'tutorial') {
        dropSlime();
      }
    };

    canvas.addEventListener('mousemove', (e) => handleMove(e.clientX));
    canvas.addEventListener('click', handleTap);
    canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      if (e.touches.length > 0) {
        handleMove(e.touches[0].clientX);
      }
    }, { passive: false });
    canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      if (e.touches.length > 0) {
        handleMove(e.touches[0].clientX);
      }
      handleTap();
    }, { passive: false });

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [gameState, canvasSize, cauldronLeft, cauldronTop, dropSlime, setupTutorialStep, startGame]);

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
        background: THEME.bg,
        fontFamily: 'ui-monospace, monospace',
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
            background: THEME.bg,
          }}>
            <div style={{ fontSize: 80, marginBottom: 10 }}>👑</div>
            <h1 style={{
              color: THEME.glow,
              fontSize: 48,
              marginBottom: 10,
              fontWeight: 900,
              textShadow: `0 0 20px ${THEME.glow}`,
            }}>
              GLOP
            </h1>

            <p style={{
              color: '#71717a',
              fontSize: 16,
              marginBottom: 30,
              textAlign: 'center',
              lineHeight: 1.6,
              maxWidth: 280,
            }}>
              Drop slimes into the cauldron.<br />
              Match to merge. Chain for chaos.<br />
              Make the KING SLIME!
            </p>

            {/* Tier preview */}
            <div style={{
              display: 'flex',
              gap: 8,
              marginBottom: 30,
              flexWrap: 'wrap',
              justifyContent: 'center',
              maxWidth: 300,
            }}>
              {SLIMES.map((slime, i) => (
                <div
                  key={i}
                  style={{
                    width: 20 + i * 4,
                    height: 20 + i * 4,
                    borderRadius: '50%',
                    background: slime.color,
                    boxShadow: i === 7 ? `0 0 10px ${slime.color}` : 'none',
                  }}
                />
              ))}
            </div>

            <button
              onClick={startGame}
              style={{
                background: THEME.glow,
                color: THEME.bg,
                border: 'none',
                padding: '18px 60px',
                fontSize: 18,
                fontWeight: 700,
                cursor: 'pointer',
                borderRadius: 30,
                boxShadow: `0 0 20px ${THEME.glow}50`,
              }}
            >
              DROP
            </button>

            <button
              onClick={startTutorial}
              style={{
                marginTop: 20,
                background: 'transparent',
                color: THEME.glow,
                border: `2px solid ${THEME.glow}`,
                padding: '12px 28px',
                fontSize: 14,
                cursor: 'pointer',
                borderRadius: 20,
              }}
            >
              HOW TO PLAY
            </button>

            <button
              onClick={() => setShowLeaderboard(true)}
              style={{
                marginTop: 12,
                background: 'transparent',
                color: '#71717a',
                border: `2px solid #71717a50`,
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
              background: 'rgba(0,0,0,0.9)',
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
                background: THEME.glow,
                color: THEME.bg,
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

        {(gameState === 'playing' || gameState === 'tutorial') && (
          <>
            <canvas
              ref={canvasRef}
              style={{
                display: 'block',
                touchAction: 'none',
              }}
            />
            {gameState === 'tutorial' && (
              <div style={{
                position: 'absolute',
                top: 100,
                left: '50%',
                transform: 'translateX(-50%)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                pointerEvents: 'none',
                zIndex: 10,
              }}>
                {tutorialMessage ? (
                  <div style={{
                    background: THEME.glow,
                    color: THEME.bg,
                    padding: '16px 32px',
                    borderRadius: 16,
                    fontSize: 24,
                    fontWeight: 700,
                    boxShadow: `0 0 30px ${THEME.glow}`,
                  }}>
                    {tutorialMessage}
                  </div>
                ) : (
                  <>
                    <div style={{
                      fontSize: 48,
                      marginBottom: 10,
                    }}>
                      {TUTORIAL_STEPS[tutorialStep]?.emoji}
                    </div>
                    <div style={{
                      background: '#18181bdd',
                      color: THEME.text,
                      padding: '12px 24px',
                      borderRadius: 12,
                      fontSize: 14,
                      fontWeight: 600,
                      border: `2px solid ${THEME.glow}`,
                      textAlign: 'center',
                    }}>
                      <div style={{ color: THEME.glow, fontSize: 12, marginBottom: 4 }}>
                        STEP {tutorialStep + 1}/3: {TUTORIAL_STEPS[tutorialStep]?.title}
                      </div>
                      {TUTORIAL_STEPS[tutorialStep]?.instruction}
                    </div>
                  </>
                )}
              </div>
            )}
          </>
        )}

        {gameState === 'end' && (
          <div style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: THEME.bg,
            overflowY: 'auto',
            padding: 20,
          }}>
            <div style={{ fontSize: 60, marginBottom: 10 }}>💀</div>
            <h1 style={{ 
              color: '#ef4444', 
              fontSize: 36, 
              marginBottom: 5,
              fontWeight: 900,
            }}>
              OVERFLOW
            </h1>
            <p style={{ color: '#71717a', fontSize: 14, marginBottom: 20 }}>
              The cauldron overflowed!
            </p>
            
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 8,
              marginBottom: 20,
            }}>
              <div style={{ color: THEME.glow, fontSize: 14, letterSpacing: 2 }}>SCORE</div>
              <div style={{ color: THEME.text, fontSize: 64, fontWeight: 'bold' }}>
                {finalScore}
              </div>
              {gameRef.current.highestTier > 0 && (
                <div style={{ color: SLIMES[gameRef.current.highestTier].color, fontSize: 14 }}>
                  Highest: {SLIMES[gameRef.current.highestTier].name}
                </div>
              )}
            </div>

            <div style={{ width: '100%', maxWidth: 350 }}>
              <ScoreFlow
                score={finalScore}
                gameId={GAME_ID}
                colors={SCORE_FLOW_COLORS}
                onRankReceived={(rank, entryId) => setSubmittedEntryId(entryId ?? null)}
              />
            </div>

            <div style={{ marginTop: 15 }}>
              <ShareButtonContainer
                id="share-btn-glop"
                url={`${typeof window !== 'undefined' ? window.location.origin : ''}/pixelpit/arcade/glop/share/${finalScore}`}
                text={`I scored ${finalScore} on GLOP! ${gameRef.current.highestTier === 7 ? '👑 Made a KING SLIME!' : ''}`}
                style="minimal"
                socialLoaded={socialLoaded}
              />
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 15 }}>
              <button
                onClick={() => setShowLeaderboard(!showLeaderboard)}
                style={{
                  background: 'transparent',
                  color: THEME.glow,
                  border: `2px solid ${THEME.glow}`,
                  padding: '12px 20px',
                  fontSize: 14,
                  cursor: 'pointer',
                  borderRadius: 20,
                }}
              >
                {showLeaderboard ? 'Hide' : 'Leaderboard'}
              </button>
              <button
                onClick={startGame}
                style={{
                  background: THEME.glow,
                  color: THEME.bg,
                  border: 'none',
                  padding: '12px 30px',
                  fontSize: 16,
                  fontWeight: 600,
                  cursor: 'pointer',
                  borderRadius: 20,
                }}
              >
                DROP AGAIN
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
