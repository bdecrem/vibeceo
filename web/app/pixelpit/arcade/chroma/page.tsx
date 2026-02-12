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

const GAME_ID = 'chroma';

// Colors
const COLORS = [
  { name: 'Pink', hex: '#f472b6' },
  { name: 'Cyan', hex: '#22d3ee' },
  { name: 'Yellow', hex: '#facc15' },
  { name: 'Purple', hex: '#a78bfa' },
];

// Physics
const HOP_FORCE = -10;
const GRAVITY = 0.45;
const MAX_FALL_SPEED = 12;
const HITBOX_FORGIVENESS = 6;

// PLAYROOM theme - Jungle
const THEME = {
  bg: '#166534',
  bgLight: '#22c55e',
  sky: '#7dd3fc',
  text: '#ffffff',
  textDark: '#1e293b',
};

// Social colors
const SCORE_FLOW_COLORS: ScoreFlowColors = {
  bg: '#166534',
  surface: '#15803d',
  primary: '#facc15',
  secondary: '#22d3ee',
  text: '#ffffff',
  muted: '#86efac',
  error: '#ef4444',
};

const LEADERBOARD_COLORS: LeaderboardColors = {
  bg: '#166534',
  surface: '#15803d',
  primary: '#facc15',
  secondary: '#22d3ee',
  text: '#ffffff',
  muted: '#86efac',
};

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

function playHop() {
  if (!audioCtx || !masterGain) return;
  const t = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(400, t);
  osc.frequency.exponentialRampToValueAtTime(600, t + 0.08);
  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(0.15, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
  osc.connect(gain);
  gain.connect(masterGain);
  osc.start(t);
  osc.stop(t + 0.1);
}

function playPass() {
  if (!audioCtx || !masterGain) return;
  const t = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  osc.type = 'sine';
  osc.frequency.value = 800;
  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(0.1, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
  osc.connect(gain);
  gain.connect(masterGain);
  osc.start(t);
  osc.stop(t + 0.15);
}

function playEat() {
  if (!audioCtx || !masterGain) return;
  const t = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(300, t);
  osc.frequency.exponentialRampToValueAtTime(500, t + 0.1);
  osc.frequency.exponentialRampToValueAtTime(400, t + 0.15);
  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(0.2, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
  osc.connect(gain);
  gain.connect(masterGain);
  osc.start(t);
  osc.stop(t + 0.2);
}

function playDeath() {
  if (!audioCtx || !masterGain) return;
  const t = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(400, t);
  osc.frequency.exponentialRampToValueAtTime(100, t + 0.4);
  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(0.15, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
  osc.connect(gain);
  gain.connect(masterGain);
  osc.start(t);
  osc.stop(t + 0.5);
}

interface Obstacle {
  y: number;
  type: 'ring' | 'bars' | 'flower';
  rotation: number;
  spinSpeed: number;
  spinDirection: number;
  colorOffset: number; // Which color is at top
  passed: boolean;
  // For flower type
  currentColorIndex: number;
  colorTimer: number;
  colorDuration: number;
  // For training wheels (first 15 obstacles)
  specialColors?: number[]; // Override segment colors [0,1,2,3] = 4 segments
}

interface Bug {
  y: number;
  x: number;
  colorIndex: number;
  eaten: boolean;
  orbitAngle: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
}

export default function ChromaGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<'start' | 'playing' | 'end'>('start');
  const [canvasSize, setCanvasSize] = useState({ w: 400, h: 700 });
  const [finalScore, setFinalScore] = useState(0);

  // Social
  const [socialLoaded, setSocialLoaded] = useState(false);
  const [submittedEntryId, setSubmittedEntryId] = useState<number | null>(null);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  
  usePixelpitSocial(socialLoaded);

  const gameRef = useRef({
    running: false,
    chameleon: {
      x: 200,
      y: 500,
      vy: 0,
      colorIndex: 0,
      squash: 1,
      eyeOffset: { x: 0, y: 0 },
      tongueOut: false,
      tongueTimer: 0,
      dead: false,
      deathTimer: 0,
    },
    cameraY: 0,
    score: 0,
    highScore: 0,
    obstacles: [] as Obstacle[],
    bugs: [] as Bug[],
    particles: [] as Particle[],
    nextObstacleY: 400,
    lastObstacleType: 'ring' as string,
    zone: 1,
    obstacleCount: 0, // Track how many obstacles spawned for training wheels
  });

  const getZone = useCallback((height: number) => {
    if (height < 250) return 1;
    if (height < 500) return 2;
    if (height < 1000) return 3;
    return 4;
  }, []);

  const getSpinSpeed = useCallback((baseSpeed: number, obstacleNum: number) => {
    // Training wheels: first 5 obstacles are glacially slow
    // Obstacles 1-5: 0.2x (10 sec rotation)
    // Obstacles 6-15: 0.4x (5 sec rotation)  
    // Obstacles 16+: Normal zone-based speed
    if (obstacleNum <= 5) return baseSpeed * 0.2;
    if (obstacleNum <= 15) return baseSpeed * 0.4;
    if (obstacleNum <= 30) return baseSpeed * 0.8;
    return baseSpeed * 1.2;
  }, []);

  const spawnObstacle = useCallback((y: number, playerColorIndex: number) => {
    const game = gameRef.current;
    game.obstacleCount++;
    const num = game.obstacleCount;
    
    // TRAINING WHEELS: First 5 obstacles teach by being easy, not by explaining
    // Obs 1-2: ALL segments are player's color (impossible to fail)
    // Obs 3: Player color + gray (teaches: not-your-color = bad)
    // Obs 4-5: Player color + one other (2 colors, easy timing)
    // Obs 6-15: 2 colors, slow spin
    // Obs 16+: Full 4 colors, normal speed
    
    let type: 'ring' | 'bars' | 'flower' = 'ring';
    let colorOffset = 0;
    let specialColors: number[] | null = null; // null = use normal random colors
    
    if (num <= 2) {
      // ALL SAME COLOR - literally impossible to fail
      type = 'ring';
      specialColors = [playerColorIndex, playerColorIndex, playerColorIndex, playerColorIndex];
    } else if (num === 3) {
      // Player color in 2 segments, gray (treated as wall) in 2
      // Actually: just make it 2-color with player + one other, very slow
      type = 'ring';
      const otherColor = (playerColorIndex + 2) % 4; // Opposite color
      specialColors = [playerColorIndex, otherColor, playerColorIndex, otherColor];
    } else if (num <= 5) {
      // 2 colors: player + one other
      type = 'ring';
      const otherColor = (playerColorIndex + 1) % 4;
      specialColors = [playerColorIndex, otherColor, playerColorIndex, otherColor];
    } else if (num <= 15) {
      // 2-color rings, random which 2
      type = 'ring';
      const color1 = Math.floor(Math.random() * 4);
      const color2 = (color1 + 2) % 4;
      specialColors = [color1, color2, color1, color2];
    } else {
      // Full game: random types, 4 colors
      const types: ('ring' | 'bars' | 'flower')[] = num < 40 
        ? ['ring', 'bars'] 
        : ['ring', 'bars', 'flower'];
      type = types[Math.floor(Math.random() * types.length)];
      
      // Avoid too many of the same type in a row
      if (type === game.lastObstacleType && Math.random() > 0.3) {
        type = types[(types.indexOf(type) + 1) % types.length];
      }
    }
    game.lastObstacleType = type;

    const baseSpinSpeed = type === 'ring' ? (Math.PI * 2) / 3 : (Math.PI * 2) / 2;
    
    const obstacle: Obstacle = {
      y,
      type,
      rotation: Math.random() * Math.PI * 2,
      spinSpeed: getSpinSpeed(baseSpinSpeed, num),
      spinDirection: Math.random() > 0.5 ? 1 : -1,
      colorOffset: specialColors ? 0 : Math.floor(Math.random() * 4),
      passed: false,
      currentColorIndex: Math.floor(Math.random() * 4),
      colorTimer: 0,
      colorDuration: num < 30 ? 0.8 : 0.4,
      // Store special colors for training wheels
      specialColors: specialColors ?? undefined,
    };

    game.obstacles.push(obstacle);
  }, [getSpinSpeed]);

  const spawnBug = useCallback((y: number, currentColorIndex: number) => {
    // Bug gives you the NEXT color in sequence
    const nextColorIndex = (currentColorIndex + 1) % 4;
    
    const bug: Bug = {
      y,
      x: 100 + Math.random() * 200,
      colorIndex: nextColorIndex,
      eaten: false,
      orbitAngle: Math.random() * Math.PI * 2,
    };

    gameRef.current.bugs.push(bug);
  }, []);

  const startGame = useCallback(() => {
    initAudio();
    
    const game = gameRef.current;
    game.running = true;
    game.obstacleCount = 0; // Reset training wheel counter
    game.chameleon = {
      x: canvasSize.w / 2,
      y: canvasSize.h - 150,
      vy: 0,
      colorIndex: 0, // Start pink
      squash: 1,
      eyeOffset: { x: 0, y: 0 },
      tongueOut: false,
      tongueTimer: 0,
      dead: false,
      deathTimer: 0,
    };
    game.cameraY = 0;
    game.score = 0;
    game.obstacles = [];
    game.bugs = [];
    game.particles = [];
    game.nextObstacleY = canvasSize.h - 300;
    game.zone = 1;

    // Spawn initial obstacles (training wheels - pass player color)
    for (let i = 0; i < 5; i++) {
      spawnObstacle(game.nextObstacleY, game.chameleon.colorIndex);
      game.nextObstacleY -= 150;
    }

    // Spawn first bug after obstacle 3-4 area (teaches color change early)
    spawnBug(canvasSize.h - 450, 0);

    setGameState('playing');
  }, [canvasSize, spawnObstacle, spawnBug]);

  const hop = useCallback(() => {
    const game = gameRef.current;
    if (game.chameleon.dead) return;
    
    game.chameleon.vy = HOP_FORCE;
    game.chameleon.squash = 0.7;
    playHop();
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

    const update = (dt: number) => {
      const game = gameRef.current;
      if (!game.running) return;

      const cham = game.chameleon;

      if (cham.dead) {
        cham.deathTimer += dt;
        cham.vy += GRAVITY;
        cham.y += cham.vy;
        
        if (cham.deathTimer > 1.5) {
          game.running = false;
          setFinalScore(game.score);
          game.highScore = Math.max(game.highScore, game.score);
          setGameState('end');
        }
        return;
      }

      // Physics
      cham.vy += GRAVITY;
      cham.vy = Math.min(cham.vy, MAX_FALL_SPEED);
      cham.y += cham.vy;

      // Squash recovery
      cham.squash += (1 - cham.squash) * 0.2;

      // Tongue timer
      if (cham.tongueOut) {
        cham.tongueTimer -= dt;
        if (cham.tongueTimer <= 0) {
          cham.tongueOut = false;
        }
      }

      // Camera follows chameleon
      const targetCameraY = cham.y - canvasSize.h * 0.6;
      if (targetCameraY < game.cameraY) {
        game.cameraY = targetCameraY;
      }

      // Update score based on height
      const height = Math.max(0, (canvasSize.h - 150) - cham.y + game.cameraY);
      game.score = Math.max(game.score, Math.floor(height / 10));

      // Update zone
      game.zone = getZone(game.score * 10);

      // Spawn new obstacles
      while (game.nextObstacleY > game.cameraY - 200) {
        spawnObstacle(game.nextObstacleY, cham.colorIndex);
        game.nextObstacleY -= 130 + Math.random() * 40;

        // Spawn bug: guaranteed after obs 3, then every 3-4 obstacles
        const bugChance = game.obstacleCount <= 5 ? 0.4 : 0.25;
        if (Math.random() < bugChance) {
          spawnBug(game.nextObstacleY + 60, cham.colorIndex);
        }
      }

      // Update obstacles
      for (const obs of game.obstacles) {
        obs.rotation += obs.spinSpeed * obs.spinDirection * dt;

        if (obs.type === 'flower') {
          obs.colorTimer += dt;
          if (obs.colorTimer >= obs.colorDuration) {
            obs.colorTimer = 0;
            obs.currentColorIndex = (obs.currentColorIndex + 1) % 4;
          }
        }

        // Check collision
        if (!obs.passed) {
          const screenY = obs.y - game.cameraY;
          const chamScreenY = cham.y - game.cameraY;

          if (chamScreenY < screenY + 30 && chamScreenY > screenY - 30) {
            // In the obstacle zone - check color
            let inSafeZone = false;
            const chamColor = cham.colorIndex;

            if (obs.type === 'ring') {
              // Ring has 4 segments
              const ringRadius = 80;
              const chamAngle = Math.atan2(cham.x - canvasSize.w / 2, 0) + Math.PI;
              const normalizedAngle = ((chamAngle - obs.rotation) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
              const segment = Math.floor((normalizedAngle / (Math.PI * 2)) * 4);
              
              // Use specialColors if present (training wheels), otherwise normal offset
              const segmentColor = obs.specialColors 
                ? obs.specialColors[segment]
                : (segment + obs.colorOffset) % 4;
              
              // Check if chameleon is passing through the ring
              const distFromCenter = Math.abs(cham.x - canvasSize.w / 2);
              if (distFromCenter < ringRadius + 20 && distFromCenter > ringRadius - 20) {
                if (segmentColor === chamColor) {
                  inSafeZone = true;
                } else {
                  // Hit wrong color
                  cham.dead = true;
                  playDeath();
                }
              } else if (distFromCenter <= ringRadius - 20) {
                // Safely inside
                inSafeZone = true;
              }
            } else if (obs.type === 'bars') {
              // Two bars swinging
              const barPhase = Math.sin(obs.rotation);
              const topBarColor = (obs.colorOffset) % 4;
              const bottomBarColor = (obs.colorOffset + 2) % 4;
              
              const barY = screenY + barPhase * 15;
              if (Math.abs(chamScreenY - barY) < 15) {
                const activeColor = barPhase > 0 ? topBarColor : bottomBarColor;
                if (activeColor === chamColor) {
                  inSafeZone = true;
                } else {
                  cham.dead = true;
                  playDeath();
                }
              } else {
                inSafeZone = true;
              }
            } else if (obs.type === 'flower') {
              // Flower pulses between colors
              if (obs.currentColorIndex === chamColor) {
                inSafeZone = true;
              } else {
                // Check if we're in the center (safe) or edge (color matters)
                const distFromCenter = Math.abs(cham.x - canvasSize.w / 2);
                if (distFromCenter < 25) {
                  inSafeZone = true;
                } else if (distFromCenter < 70) {
                  cham.dead = true;
                  playDeath();
                } else {
                  inSafeZone = true;
                }
              }
            }

            if (inSafeZone && chamScreenY < screenY - 20) {
              obs.passed = true;
              playPass();
              
              // Particles
              for (let i = 0; i < 8; i++) {
                game.particles.push({
                  x: cham.x,
                  y: cham.y,
                  vx: (Math.random() - 0.5) * 4,
                  vy: (Math.random() - 0.5) * 4,
                  life: 0.5,
                  color: COLORS[chamColor].hex,
                });
              }
            }
          }
        }
      }

      // Check bug collisions
      for (const bug of game.bugs) {
        if (bug.eaten) continue;

        bug.orbitAngle += dt * 2;
        const bugScreenX = bug.x + Math.cos(bug.orbitAngle) * 8;
        const bugScreenY = bug.y - game.cameraY + Math.sin(bug.orbitAngle) * 8;
        const chamScreenY = cham.y - game.cameraY;

        const dx = cham.x - bugScreenX;
        const dy = chamScreenY - bugScreenY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 40) {
          bug.eaten = true;
          cham.colorIndex = bug.colorIndex;
          cham.tongueOut = true;
          cham.tongueTimer = 0.1;
          playEat();

          // Color change particles
          for (let i = 0; i < 12; i++) {
            game.particles.push({
              x: cham.x,
              y: cham.y - game.cameraY,
              vx: (Math.random() - 0.5) * 6,
              vy: (Math.random() - 0.5) * 6,
              life: 0.6,
              color: COLORS[bug.colorIndex].hex,
            });
          }
        }
      }

      // Update particles
      game.particles = game.particles.filter((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.life -= dt * 2;
        return p.life > 0;
      });

      // Cleanup off-screen objects
      game.obstacles = game.obstacles.filter((o) => o.y > game.cameraY - 100);
      game.bugs = game.bugs.filter((b) => b.y > game.cameraY - 100 && !b.eaten);

      // Death by falling
      if (cham.y - game.cameraY > canvasSize.h + 100) {
        cham.dead = true;
        playDeath();
      }
    };

    const draw = () => {
      const game = gameRef.current;
      const cham = game.chameleon;

      // Background gradient based on zone
      const zoneColors = [
        ['#166534', '#15803d'], // Forest floor
        ['#15803d', '#22c55e'], // Understory
        ['#22c55e', '#86efac'], // Canopy
        ['#86efac', '#7dd3fc'], // Treetops
      ];
      const colors = zoneColors[Math.min(game.zone - 1, 3)];
      
      const gradient = ctx.createLinearGradient(0, 0, 0, canvasSize.h);
      gradient.addColorStop(0, colors[1]);
      gradient.addColorStop(1, colors[0]);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvasSize.w, canvasSize.h);

      // Draw decorative vines
      ctx.strokeStyle = '#166534';
      ctx.lineWidth = 3;
      for (let i = 0; i < 3; i++) {
        const x = 50 + i * 150;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        for (let y = 0; y < canvasSize.h; y += 20) {
          ctx.lineTo(x + Math.sin((y - game.cameraY * 0.1) / 30) * 15, y);
        }
        ctx.stroke();
      }

      // Draw obstacles
      for (const obs of game.obstacles) {
        const screenY = obs.y - game.cameraY;
        if (screenY < -100 || screenY > canvasSize.h + 100) continue;

        ctx.save();
        ctx.translate(canvasSize.w / 2, screenY);

        if (obs.type === 'ring') {
          // Draw 4-segment ring
          const radius = 80;
          const thickness = 20;
          
          for (let i = 0; i < 4; i++) {
            const startAngle = obs.rotation + (i * Math.PI / 2);
            const endAngle = startAngle + Math.PI / 2 - 0.1;
            
            // Use specialColors if present (training wheels), otherwise normal offset
            const colorIndex = obs.specialColors 
              ? obs.specialColors[i]
              : (i + obs.colorOffset) % 4;
            
            ctx.beginPath();
            ctx.arc(0, 0, radius, startAngle, endAngle);
            ctx.arc(0, 0, radius - thickness, endAngle, startAngle, true);
            ctx.closePath();
            ctx.fillStyle = COLORS[colorIndex].hex;
            ctx.fill();
            ctx.strokeStyle = '#00000030';
            ctx.lineWidth = 2;
            ctx.stroke();
          }
        } else if (obs.type === 'bars') {
          // Two colored bars
          const barPhase = Math.sin(obs.rotation);
          const barWidth = 150;
          const barHeight = 15;

          for (let i = 0; i < 2; i++) {
            const colorIndex = (obs.colorOffset + i * 2) % 4;
            const yOffset = i === 0 ? barPhase * 15 : -barPhase * 15;
            
            ctx.fillStyle = COLORS[colorIndex].hex;
            ctx.fillRect(-barWidth / 2, yOffset - barHeight / 2, barWidth, barHeight);
            ctx.strokeStyle = '#00000030';
            ctx.lineWidth = 2;
            ctx.strokeRect(-barWidth / 2, yOffset - barHeight / 2, barWidth, barHeight);
          }
        } else if (obs.type === 'flower') {
          // Pulsing flower
          const petalRadius = 45;
          const pulseScale = 0.9 + Math.sin(obs.colorTimer / obs.colorDuration * Math.PI) * 0.1;
          
          // Petals
          ctx.fillStyle = COLORS[obs.currentColorIndex].hex;
          for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2 + obs.rotation * 0.2;
            const px = Math.cos(angle) * petalRadius * pulseScale;
            const py = Math.sin(angle) * petalRadius * pulseScale;
            ctx.beginPath();
            ctx.ellipse(px, py, 20 * pulseScale, 12 * pulseScale, angle, 0, Math.PI * 2);
            ctx.fill();
          }

          // Center (always safe)
          ctx.fillStyle = '#facc15';
          ctx.beginPath();
          ctx.arc(0, 0, 20, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      }

      // Draw bugs
      for (const bug of game.bugs) {
        if (bug.eaten) continue;
        
        const screenX = bug.x + Math.cos(bug.orbitAngle) * 8;
        const screenY = bug.y - game.cameraY + Math.sin(bug.orbitAngle) * 8;
        
        if (screenY < -50 || screenY > canvasSize.h + 50) continue;

        // Bug body
        ctx.fillStyle = COLORS[bug.colorIndex].hex;
        ctx.beginPath();
        ctx.ellipse(screenX, screenY, 10, 8, 0, 0, Math.PI * 2);
        ctx.fill();

        // Wings
        ctx.fillStyle = '#ffffff80';
        const wingFlap = Math.sin(Date.now() / 30) * 0.3;
        ctx.beginPath();
        ctx.ellipse(screenX - 5, screenY - 8 + wingFlap * 5, 6, 4, -0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(screenX + 5, screenY - 8 - wingFlap * 5, 6, 4, 0.3, 0, Math.PI * 2);
        ctx.fill();

        // Eyes
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(screenX - 3, screenY - 2, 2, 0, Math.PI * 2);
        ctx.arc(screenX + 3, screenY - 2, 2, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw chameleon
      const chamScreenY = cham.y - game.cameraY;
      
      ctx.save();
      ctx.translate(cham.x, chamScreenY);
      
      if (cham.dead) {
        ctx.rotate(cham.deathTimer * 5);
        ctx.globalAlpha = 1 - cham.deathTimer / 1.5;
      }

      // Body (scaled by squash)
      const bodyWidth = 28 * (1 / cham.squash);
      const bodyHeight = 22 * cham.squash;
      
      ctx.fillStyle = COLORS[cham.colorIndex].hex;
      ctx.beginPath();
      ctx.ellipse(0, 0, bodyWidth, bodyHeight, 0, 0, Math.PI * 2);
      ctx.fill();

      // Darker belly
      ctx.fillStyle = '#00000020';
      ctx.beginPath();
      ctx.ellipse(0, 5, bodyWidth * 0.8, bodyHeight * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Tail
      ctx.strokeStyle = COLORS[cham.colorIndex].hex;
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-bodyWidth, 0);
      ctx.quadraticCurveTo(-bodyWidth - 15, -10, -bodyWidth - 10, -20);
      ctx.stroke();

      // Tongue
      if (cham.tongueOut) {
        ctx.strokeStyle = '#f472b6';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(bodyWidth - 5, -5);
        ctx.lineTo(bodyWidth + 30, -15);
        ctx.stroke();
        ctx.fillStyle = '#f472b6';
        ctx.beginPath();
        ctx.arc(bodyWidth + 30, -15, 4, 0, Math.PI * 2);
        ctx.fill();
      }

      // Eyes (googly, move independently)
      const eyeOffsetX = Math.sin(Date.now() / 500) * 2;
      const eyeOffsetY = Math.cos(Date.now() / 700) * 1;

      // Eye sockets
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(-8, -10, 10, 10, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(8, -10, 10, 10, 0, 0, Math.PI * 2);
      ctx.fill();

      // Pupils
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.arc(-8 + eyeOffsetX, -10 + eyeOffsetY, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(8 - eyeOffsetX, -10 - eyeOffsetY, 4, 0, Math.PI * 2);
      ctx.fill();

      // Legs
      ctx.strokeStyle = COLORS[cham.colorIndex].hex;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(-10, bodyHeight - 5);
      ctx.lineTo(-15, bodyHeight + 8);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(10, bodyHeight - 5);
      ctx.lineTo(15, bodyHeight + 8);
      ctx.stroke();

      ctx.restore();

      // Draw particles
      for (const p of game.particles) {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.life * 2;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // HUD
      ctx.fillStyle = THEME.text;
      ctx.font = 'bold 32px ui-monospace, monospace';
      ctx.textAlign = 'center';
      ctx.fillText(game.score.toString(), canvasSize.w / 2, 50);

      // Current color indicator
      ctx.fillStyle = COLORS[cham.colorIndex].hex;
      ctx.beginPath();
      ctx.arc(canvasSize.w - 30, 40, 15, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Zone indicator
      ctx.fillStyle = '#ffffff80';
      ctx.font = '14px ui-monospace';
      ctx.textAlign = 'left';
      const zoneNames = ['Forest Floor', 'Understory', 'Canopy', 'Treetops'];
      ctx.fillText(zoneNames[game.zone - 1], 15, 35);
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
    const handleTap = () => {
      hop();
    };

    canvas.addEventListener('click', handleTap);
    canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      handleTap();
    }, { passive: false });

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [gameState, canvasSize, hop, getZone, spawnObstacle, spawnBug, startGame]);

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
        {gameState === 'start' && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 20,
              background: `linear-gradient(180deg, ${THEME.bgLight} 0%, ${THEME.bg} 100%)`,
            }}
          >
            <div style={{ fontSize: 80, marginBottom: 10 }}>🦎</div>
            <h1
              style={{
                color: THEME.text,
                fontSize: 48,
                marginBottom: 10,
                fontWeight: 900,
              }}
            >
              CHROMA
            </h1>

            <p
              style={{
                color: '#86efac',
                fontSize: 16,
                marginBottom: 30,
                textAlign: 'center',
                lineHeight: 1.6,
                maxWidth: 280,
              }}
            >
              Tap to hop. Match your color.<br />
              Eat bugs to change.<br />
              Climb the jungle canopy!
            </p>

            {/* Color preview */}
            <div
              style={{
                display: 'flex',
                gap: 12,
                marginBottom: 30,
              }}
            >
              {COLORS.map((color, i) => (
                <div
                  key={i}
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    background: color.hex,
                    border: '3px solid #ffffff',
                  }}
                />
              ))}
            </div>

            <button
              onClick={startGame}
              style={{
                background: '#facc15',
                color: THEME.textDark,
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

            {gameRef.current.highScore > 0 && (
              <div style={{ marginTop: 20, color: '#86efac', fontSize: 16 }}>
                Best: {gameRef.current.highScore}
              </div>
            )}

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
                background: '#facc15',
                color: THEME.textDark,
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

        {gameState === 'end' && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              background: THEME.bg,
              padding: 20,
              overflowY: 'auto',
            }}
          >
            <div style={{ fontSize: 60, marginBottom: 10 }}>🦎</div>
            <h1
              style={{
                color: '#ef4444',
                fontSize: 36,
                marginBottom: 5,
                fontWeight: 900,
              }}
            >
              WRONG COLOR!
            </h1>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 8,
                marginBottom: 20,
              }}
            >
              <div style={{ color: '#86efac', fontSize: 14, letterSpacing: 2 }}>HEIGHT</div>
              <div style={{ color: THEME.text, fontSize: 64, fontWeight: 'bold' }}>
                {finalScore}
              </div>
              {finalScore === gameRef.current.highScore && finalScore > 0 && (
                <div style={{ color: '#facc15', fontSize: 14 }}>NEW BEST! 🎉</div>
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
                id="share-btn-chroma"
                url={`${typeof window !== 'undefined' ? window.location.origin : ''}/pixelpit/arcade/chroma/share/${finalScore}`}
                text={`I climbed ${finalScore}m in CHROMA! 🦎`}
                style="minimal"
                socialLoaded={socialLoaded}
              />
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 15 }}>
              <button
                onClick={() => setShowLeaderboard(!showLeaderboard)}
                style={{
                  background: 'transparent',
                  color: THEME.text,
                  border: `2px solid ${THEME.text}`,
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
                  background: '#facc15',
                  color: THEME.textDark,
                  border: 'none',
                  padding: '12px 30px',
                  fontSize: 16,
                  fontWeight: 600,
                  cursor: 'pointer',
                  borderRadius: 20,
                }}
              >
                TRY AGAIN
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
