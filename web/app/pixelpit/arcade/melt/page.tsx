'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';

// Game settings
const GAME_WIDTH = 400;
const GAME_HEIGHT = 700;
const LANES = [GAME_WIDTH * 0.25, GAME_WIDTH * 0.5, GAME_WIDTH * 0.75]; // 3 lanes
const MELT_RATE = 2; // px lost per second
const MIN_SIZE = 8; // Death threshold
const MAX_SIZE = 64;
const START_SIZE = 48;
const SCROLL_SPEED = 150; // pixels per second
const LAVA_DAMAGE = 8; // Shrink on lava hit
const ICE_GAIN = 12; // Growth on ice pickup

// Theme — VOLCANIC DESCENT
const THEME = {
  bg: '#000000',
  bgDeep: '#0a0000',
  lavaDark: '#8b0000',
  lavaMid: '#cc2200',
  lavaHot: '#ff4400',
  lavaWhite: '#ff8844',
  rock: '#111111',
  rockLight: '#1a1a1a',
  ice: '#ffffff',
  iceCore: '#aaeeff',
  iceDim: '#556677',
  steam: '#ffffff30',
  text: '#ffffff',
  textDim: '#444444',
  danger: '#ff2200',
};

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  size: number;
  type: 'steam' | 'sparkle' | 'sizzle';
}

interface Obstacle {
  lane: number;
  y: number;
  type: 'lava';
}

interface IcePickup {
  lane: number;
  y: number;
  collected: boolean;
}

// Audio
let audioCtx: AudioContext | null = null;

function initAudio() {
  if (audioCtx) return;
  audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  if (audioCtx.state === 'suspended') audioCtx.resume();
}

function playCrystallize() {
  if (!audioCtx) return;
  const t = audioCtx.currentTime;
  [1200, 1500, 1800].forEach((freq, i) => {
    const osc = audioCtx!.createOscillator();
    const gain = audioCtx!.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.1, t + i * 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.05 + 0.15);
    osc.connect(gain);
    gain.connect(audioCtx!.destination);
    osc.start(t + i * 0.05);
    osc.stop(t + i * 0.05 + 0.15);
  });
}

function playSizzle() {
  if (!audioCtx) return;
  const bufferSize = audioCtx.sampleRate * 0.2;
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
  }
  const source = audioCtx.createBufferSource();
  const gain = audioCtx.createGain();
  source.buffer = buffer;
  gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.2);
  source.connect(gain);
  gain.connect(audioCtx.destination);
  source.start();
}

function playEvaporate() {
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(600, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.5);
  gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.5);
}

export default function MeltGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<'start' | 'playing' | 'gameOver'>('start');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [canvasSize, setCanvasSize] = useState({ w: GAME_WIDTH, h: GAME_HEIGHT });

  const gameRef = useRef({
    lane: 1, // 0=left, 1=center, 2=right
    targetLane: 1,
    playerX: LANES[1],
    playerY: GAME_HEIGHT * 0.75,
    playerSize: START_SIZE,
    scrollY: 0,
    obstacles: [] as Obstacle[],
    icePickups: [] as IcePickup[],
    particles: [] as Particle[],
    score: 0,
    distance: 0,
    lastSpawnY: 0,
    screenShake: 0,
    flashRed: 0,
    gameTime: 0, // Track time for tutorial phases
    popupText: '' as string,
    popupTimer: 0,
    tutorialPhase: 0, // 0=melting, 1=first ice, 2=first rock, 3=normal
    difficultyPhase: 1, // 1=onboarding, 2=learning, 3=challenge, 4=mastery
    lastPhaseAnnounced: 0,
  });

  const spawnRow = useCallback((y: number) => {
    const game = gameRef.current;
    
    // Decide what to spawn (0-2 lava rocks, 0-1 ice pickup)
    const lavaCount = Math.random() < 0.7 ? (Math.random() < 0.5 ? 1 : 2) : 0;
    const hasIce = Math.random() < 0.25;
    
    const usedLanes: number[] = [];
    
    // Spawn lava rocks
    for (let i = 0; i < lavaCount; i++) {
      let lane: number;
      do {
        lane = Math.floor(Math.random() * 3);
      } while (usedLanes.includes(lane));
      usedLanes.push(lane);
      
      game.obstacles.push({ lane, y, type: 'lava' });
    }
    
    // Spawn ice pickup (in empty lane)
    if (hasIce) {
      const emptyLanes = [0, 1, 2].filter(l => !usedLanes.includes(l));
      if (emptyLanes.length > 0) {
        const lane = emptyLanes[Math.floor(Math.random() * emptyLanes.length)];
        game.icePickups.push({ lane, y, collected: false });
      }
    }
  }, []);

  const spawnObstacles = useCallback((startY: number, endY: number) => {
    const game = gameRef.current;
    const spacing = 180; // Space between rows
    
    for (let y = startY; y < endY; y += spacing) {
      spawnRow(y);
    }
    game.lastSpawnY = endY;
  }, [spawnRow]);

  const startGame = useCallback(() => {
    initAudio();
    const game = gameRef.current;
    game.lane = 1;
    game.targetLane = 1;
    game.playerX = LANES[1];
    game.playerY = GAME_HEIGHT * 0.75;
    game.playerSize = MAX_SIZE; // Start at MAX for tutorial
    game.scrollY = 0;
    game.obstacles = [];
    game.icePickups = [];
    game.particles = [];
    game.score = 0;
    game.distance = 0;
    game.lastSpawnY = GAME_HEIGHT;
    game.screenShake = 0;
    game.flashRed = 0;
    game.gameTime = 0;
    game.popupText = '';
    game.popupTimer = 0;
    game.tutorialPhase = 0;
    
    // NO initial obstacles - tutorial approach
    // Phase 0-3s: empty, just melting
    // Phase 3-6s: first ice appears
    // Phase 6-10s: first rock appears
    // After 10s: normal spawning
    
    setScore(0);
    setGameState('playing');
  }, []);

  const switchLane = useCallback((direction: number) => {
    const game = gameRef.current;
    const newLane = Math.max(0, Math.min(2, game.lane + direction));
    game.lane = newLane;
    game.targetLane = newLane;
  }, []);

  useEffect(() => {
    const updateSize = () => {
      const w = Math.min(window.innerWidth, 500);
      const h = Math.min(window.innerHeight, 800);
      setCanvasSize({ w, h });
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  useEffect(() => {
    if (gameState !== 'playing') return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let lastTime = performance.now();

    const scale = Math.min(canvasSize.w / GAME_WIDTH, canvasSize.h / GAME_HEIGHT);
    const offsetX = (canvasSize.w - GAME_WIDTH * scale) / 2;
    const offsetY = (canvasSize.h - GAME_HEIGHT * scale) / 2;

    const update = (dt: number) => {
      const game = gameRef.current;
      
      // Track game time for tutorial
      game.gameTime += dt;
      
      // Tutorial phases
      if (game.tutorialPhase === 0 && game.gameTime < 3) {
        // Phase 0: Just melting, show "YOU'RE MELTING!"
        if (game.gameTime < 0.1) {
          game.popupText = "YOU'RE MELTING!";
          game.popupTimer = 2.5;
        }
      } else if (game.tutorialPhase === 0 && game.gameTime >= 3) {
        // Phase 1: Spawn first ice in center lane
        game.tutorialPhase = 1;
        game.icePickups.push({ lane: 1, y: game.scrollY + GAME_HEIGHT + 100, collected: false });
      } else if (game.tutorialPhase === 1 && game.gameTime >= 6) {
        // Phase 2: Spawn first rock (in side lane, easy to dodge)
        game.tutorialPhase = 2;
        game.obstacles.push({ lane: 0, y: game.scrollY + GAME_HEIGHT + 100, type: 'lava' });
      } else if (game.tutorialPhase === 2 && game.gameTime >= 10) {
        // Phase 3: Normal gameplay
        game.tutorialPhase = 3;
      }
      
      // CONTINUOUS DIFFICULTY RAMP (no discrete phases)
      // All parameters scale SLOWLY with distance - gentler curve
      const dist = game.distance;
      
      // Speed: 1.0x at start → 1.8x at 10000 distance (slower ramp)
      const speedMult = Math.min(1.8, 1.0 + (dist / 10000) * 0.8);
      
      // Melt rate: 1.0x at start → 1.3x at 10000 distance (gentler)
      const meltMult = Math.min(1.3, 1.0 + (dist / 10000) * 0.3);
      
      // Rock density: spacing shrinks from 220 → 120 over 8000 distance
      const spacing = Math.max(120, 220 - (dist / 8000) * 100);
      
      // Rock chance: 0.3 at start → 0.7 at 6000 distance (slower ramp)
      const rockChance = Math.min(0.7, 0.3 + (dist / 6000) * 0.4);
      
      // Ice frequency: 0.5 at start → 0.2 at 8000 distance (stays generous longer)
      const iceChance = Math.max(0.2, 0.5 - (dist / 8000) * 0.3);
      
      // Pairs chance: 0% at start, slowly increases to 40% at 5000+ (much gentler)
      const pairsChance = Math.min(0.4, dist / 5000 * 0.4);
      
      // Normal spawning after tutorial
      if (game.tutorialPhase >= 3 && game.scrollY + GAME_HEIGHT > game.lastSpawnY - 300) {
        for (let y = game.lastSpawnY; y < game.lastSpawnY + 500; y += spacing) {
          const usedLanes: number[] = [];
          
          // Spawn rocks (continuous scaling)
          // RULE: MAX 2 rocks per row - ALWAYS leave 1 clear lane
          if (Math.random() < rockChance) {
            const rockCount = Math.random() < pairsChance ? 2 : 1;
            // HARD CAP at 2 - never block all lanes
            const actualRockCount = Math.min(rockCount, 2);
            
            for (let i = 0; i < actualRockCount; i++) {
              let lane: number;
              let attempts = 0;
              do { 
                lane = Math.floor(Math.random() * 3); 
                attempts++;
              } while (usedLanes.includes(lane) && attempts < 10);
              
              if (!usedLanes.includes(lane)) {
                usedLanes.push(lane);
                game.obstacles.push({ lane, y, type: 'lava' });
              }
            }
          }
          
          // Spawn ice ONLY in empty lanes, NEVER where rocks are
          // Also offset Y slightly so they don't overlap visually
          if (Math.random() < iceChance && usedLanes.length < 3) {
            const emptyLanes = [0, 1, 2].filter(l => !usedLanes.includes(l));
            if (emptyLanes.length > 0) {
              const lane = emptyLanes[Math.floor(Math.random() * emptyLanes.length)];
              // Offset ice Y by half spacing to avoid visual overlap with rocks
              game.icePickups.push({ lane, y: y + spacing * 0.4, collected: false });
            }
          }
        }
        game.lastSpawnY += 500;
      }
      
      // Update popup timer
      if (game.popupTimer > 0) {
        game.popupTimer -= dt;
        if (game.popupTimer <= 0) game.popupText = '';
      }
      
      // Scroll (continuous speed ramp)
      game.scrollY += SCROLL_SPEED * speedMult * dt;
      game.distance += SCROLL_SPEED * speedMult * dt;
      
      // Melt! (continuous melt ramp)
      game.playerSize -= MELT_RATE * meltMult * dt;
      
      // Spawn steam particles (more when small)
      const steamRate = 0.3 + (1 - game.playerSize / MAX_SIZE) * 0.5;
      if (Math.random() < steamRate) {
        game.particles.push({
          x: game.playerX + (Math.random() - 0.5) * game.playerSize,
          y: game.playerY - game.playerSize / 2,
          vx: (Math.random() - 0.5) * 20,
          vy: -30 - Math.random() * 30,
          life: 0.8,
          color: THEME.steam,
          size: 4 + Math.random() * 4,
          type: 'steam',
        });
      }
      
      // Check death
      if (game.playerSize <= MIN_SIZE) {
        playEvaporate();
        // Big steam burst
        for (let i = 0; i < 20; i++) {
          game.particles.push({
            x: game.playerX,
            y: game.playerY,
            vx: (Math.random() - 0.5) * 100,
            vy: -50 - Math.random() * 50,
            life: 1,
            color: THEME.steam,
            size: 8,
            type: 'steam',
          });
        }
        setHighScore(h => Math.max(h, game.score));
        setGameState('gameOver');
        return;
      }
      
      // Move player toward target lane
      const targetX = LANES[game.lane];
      const dx = targetX - game.playerX;
      game.playerX += dx * 12 * dt;
      
      // Check collisions
      const halfSize = game.playerSize / 2;
      
      for (const obs of game.obstacles) {
        const obsY = obs.y - game.scrollY;
        if (obsY < -50 || obsY > GAME_HEIGHT + 50) continue;
        
        // Same lane collision
        if (obs.lane === game.lane) {
          const obsX = LANES[obs.lane];
          const dist = Math.abs(game.playerY - obsY);
          if (dist < halfSize + 25) {
            // Hit lava!
            game.playerSize -= LAVA_DAMAGE;
            game.screenShake = 0.3;
            game.flashRed = 0.2;
            game.popupText = 'OUCH!';
            game.popupTimer = 0.5;
            playSizzle();
            
            // Sizzle particles
            for (let i = 0; i < 8; i++) {
              game.particles.push({
                x: game.playerX,
                y: game.playerY,
                vx: (Math.random() - 0.5) * 80,
                vy: -40 - Math.random() * 40,
                life: 0.4,
                color: THEME.lavaMid,
                size: 6,
                type: 'sizzle',
              });
            }
            
            // Remove this obstacle
            obs.y = -1000;
          }
        }
      }
      
      // Check ice pickups
      for (const ice of game.icePickups) {
        if (ice.collected) continue;
        const iceY = ice.y - game.scrollY;
        if (iceY < -50 || iceY > GAME_HEIGHT + 50) continue;
        
        if (ice.lane === game.lane) {
          const dist = Math.abs(game.playerY - iceY);
          if (dist < halfSize + 20) {
            ice.collected = true;
            game.playerSize = Math.min(MAX_SIZE, game.playerSize + ICE_GAIN);
            game.popupText = 'ICE!';
            game.popupTimer = 0.5;
            playCrystallize();
            
            // Sparkle particles
            for (let i = 0; i < 12; i++) {
              const angle = (i / 12) * Math.PI * 2;
              game.particles.push({
                x: LANES[ice.lane],
                y: iceY,
                vx: Math.cos(angle) * 60,
                vy: Math.sin(angle) * 60,
                life: 0.5,
                color: THEME.iceCore,
                size: 5,
                type: 'sparkle',
              });
            }
          }
        }
      }
      
      // Score: distance + size bonus (bigger = 2x multiplier)
      const sizeMultiplier = 1 + (game.playerSize - MIN_SIZE) / (MAX_SIZE - MIN_SIZE);
      game.score = Math.floor(game.distance / 5 * sizeMultiplier);
      setScore(game.score);
      
      // Decay effects
      game.screenShake *= 0.9;
      game.flashRed -= dt * 5;
      if (game.flashRed < 0) game.flashRed = 0;
      
      // Update particles
      game.particles = game.particles.filter(p => {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (p.type === 'steam') p.vy -= 20 * dt; // Steam rises
        p.life -= dt * 2;
        return p.life > 0;
      });
      
      // Cleanup
      game.obstacles = game.obstacles.filter(o => o.y - game.scrollY > -100);
      game.icePickups = game.icePickups.filter(i => i.y - game.scrollY > -100 && !i.collected);
    };

    const draw = () => {
      const game = gameRef.current;
      const t = Date.now() / 1000;

      // Screen shake offset
      const shakeX = game.screenShake * (Math.random() - 0.5) * 10;
      const shakeY = game.screenShake * (Math.random() - 0.5) * 10;

      // === BACKGROUND — volcanic depth ===
      const bgGrad = ctx.createLinearGradient(0, 0, 0, canvasSize.h);
      bgGrad.addColorStop(0, THEME.bg);
      bgGrad.addColorStop(0.7, THEME.bgDeep);
      bgGrad.addColorStop(1, '#1a0505');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, canvasSize.w, canvasSize.h);

      // Ambient lava glow at bottom
      const bottomGlow = ctx.createRadialGradient(
        canvasSize.w / 2, canvasSize.h + 50, 0,
        canvasSize.w / 2, canvasSize.h + 50, canvasSize.h * 0.6
      );
      const glowPulse = 0.08 + Math.sin(t * 1.5) * 0.03;
      bottomGlow.addColorStop(0, `rgba(249, 115, 22, ${glowPulse})`);
      bottomGlow.addColorStop(1, 'transparent');
      ctx.fillStyle = bottomGlow;
      ctx.fillRect(0, 0, canvasSize.w, canvasSize.h);

      // Red flash on hit
      if (game.flashRed > 0) {
        ctx.fillStyle = `rgba(244, 63, 94, ${game.flashRed * 0.4})`;
        ctx.fillRect(0, 0, canvasSize.w, canvasSize.h);
      }

      ctx.save();
      ctx.translate(offsetX + shakeX, offsetY + shakeY);
      ctx.scale(scale, scale);

      // === VOLCANIC CRACKS — glowing fissures in the ground ===
      const crackOffset = (game.scrollY * 0.4) % 160;
      for (let cy = -crackOffset; cy < GAME_HEIGHT + 100; cy += 80) {
        const crackPulse = 0.15 + Math.sin(t * 2 + cy * 0.02) * 0.1;
        ctx.strokeStyle = `rgba(249, 115, 22, ${crackPulse})`;
        ctx.lineWidth = 1.5;
        // Left wall cracks
        ctx.beginPath();
        ctx.moveTo(8, cy);
        ctx.lineTo(18 + Math.sin(cy * 0.1) * 8, cy + 20);
        ctx.lineTo(10, cy + 40);
        ctx.stroke();
        // Right wall cracks
        ctx.beginPath();
        ctx.moveTo(GAME_WIDTH - 8, cy + 30);
        ctx.lineTo(GAME_WIDTH - 20 + Math.cos(cy * 0.08) * 6, cy + 50);
        ctx.lineTo(GAME_WIDTH - 12, cy + 70);
        ctx.stroke();
      }

      // === LANE MARKERS — subtle volcanic grooves ===
      for (let i = 0; i < 2; i++) {
        const lx = (LANES[i] + LANES[i + 1]) / 2;
        const grooveGrad = ctx.createLinearGradient(lx, 0, lx, GAME_HEIGHT);
        grooveGrad.addColorStop(0, 'rgba(255,255,255,0.02)');
        grooveGrad.addColorStop(0.5, 'rgba(255,255,255,0.05)');
        grooveGrad.addColorStop(1, 'rgba(255,255,255,0.02)');
        ctx.strokeStyle = grooveGrad;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(lx, 0);
        ctx.lineTo(lx, GAME_HEIGHT);
        ctx.stroke();
      }

      // === LAVA POOLS — menacing and alive ===
      for (const obs of game.obstacles) {
        const oy = obs.y - game.scrollY;
        if (oy < -60 || oy > GAME_HEIGHT + 60) continue;
        const ox = LANES[obs.lane];
        const lavaPulse = 1 + Math.sin(t * 4 + obs.y * 0.05) * 0.12;
        const bubblePulse = Math.sin(t * 6 + obs.y * 0.1);

        // Outer glow (no shadowBlur — manual radial)
        const lavaGlow = ctx.createRadialGradient(ox, oy, 0, ox, oy, 55);
        lavaGlow.addColorStop(0, 'rgba(249, 115, 22, 0.15)');
        lavaGlow.addColorStop(1, 'transparent');
        ctx.fillStyle = lavaGlow;
        ctx.fillRect(ox - 60, oy - 60, 120, 120);

        // Dark crust ring
        ctx.fillStyle = '#1a0505';
        ctx.beginPath();
        ctx.ellipse(ox, oy, 38 * lavaPulse, 22 * lavaPulse, 0, 0, Math.PI * 2);
        ctx.fill();

        // Molten pool
        const poolGrad = ctx.createRadialGradient(ox, oy - 2, 0, ox, oy, 30 * lavaPulse);
        poolGrad.addColorStop(0, THEME.lavaWhite);
        poolGrad.addColorStop(0.3, THEME.lavaHot);
        poolGrad.addColorStop(0.7, THEME.lavaMid);
        poolGrad.addColorStop(1, THEME.lavaDark);
        ctx.fillStyle = poolGrad;
        ctx.beginPath();
        ctx.ellipse(ox, oy, 30 * lavaPulse, 16 * lavaPulse, 0, 0, Math.PI * 2);
        ctx.fill();

        // Bubbles
        if (bubblePulse > 0.5) {
          ctx.fillStyle = THEME.lavaHot;
          ctx.beginPath();
          ctx.arc(ox + 8, oy - 4, 3 * (bubblePulse - 0.5) * 2, 0, Math.PI * 2);
          ctx.fill();
        }
        if (bubblePulse < -0.3) {
          ctx.fillStyle = THEME.lavaHot;
          ctx.beginPath();
          ctx.arc(ox - 10, oy + 2, 2.5 * (-bubblePulse - 0.3) * 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // === ICE PICKUPS — crystalline beacons ===
      for (const ice of game.icePickups) {
        if (ice.collected) continue;
        const iy = ice.y - game.scrollY;
        if (iy < -60 || iy > GAME_HEIGHT + 60) continue;
        const ix = LANES[ice.lane];
        const spin = t * 2 + ice.y * 0.01;
        const bob = Math.sin(t * 3 + ice.y * 0.05) * 4;

        // Beacon column (faint vertical light)
        const beaconGrad = ctx.createLinearGradient(ix, iy - 80, ix, iy + 40);
        beaconGrad.addColorStop(0, 'transparent');
        beaconGrad.addColorStop(0.4, 'rgba(6, 182, 212, 0.06)');
        beaconGrad.addColorStop(0.6, 'rgba(6, 182, 212, 0.1)');
        beaconGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = beaconGrad;
        ctx.fillRect(ix - 15, iy - 80, 30, 120);

        // Frost aura
        const frostGlow = ctx.createRadialGradient(ix, iy + bob, 0, ix, iy + bob, 30);
        frostGlow.addColorStop(0, 'rgba(103, 232, 249, 0.2)');
        frostGlow.addColorStop(1, 'transparent');
        ctx.fillStyle = frostGlow;
        ctx.fillRect(ix - 35, iy + bob - 35, 70, 70);

        // Crystal body — rotating diamond
        ctx.save();
        ctx.translate(ix, iy + bob);
        ctx.rotate(spin);
        // Outer crystal
        ctx.fillStyle = THEME.ice;
        ctx.beginPath();
        ctx.moveTo(0, -16);
        ctx.lineTo(11, 0);
        ctx.lineTo(0, 16);
        ctx.lineTo(-11, 0);
        ctx.closePath();
        ctx.fill();
        // Inner highlight
        ctx.fillStyle = THEME.iceCore;
        ctx.beginPath();
        ctx.moveTo(0, -9);
        ctx.lineTo(5, 0);
        ctx.lineTo(0, 9);
        ctx.lineTo(-5, 0);
        ctx.closePath();
        ctx.fill();
        // Hot-white center dot
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(0, 0, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // === PARTICLES ===
      for (const p of game.particles) {
        ctx.globalAlpha = Math.min(1, p.life * 1.5);
        if (p.type === 'sparkle') {
          // Diamond sparkle
          ctx.fillStyle = p.color;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(t * 8);
          ctx.fillRect(-p.size * p.life / 2, -1, p.size * p.life, 2);
          ctx.fillRect(-1, -p.size * p.life / 2, 2, p.size * p.life);
          ctx.restore();
        } else {
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;

      // === PLAYER — the ice cube ===
      const size = game.playerSize;
      const x = game.playerX;
      const y = game.playerY;
      const sizePercent = (size - MIN_SIZE) / (MAX_SIZE - MIN_SIZE);
      const worry = 1 - sizePercent;

      // Frost trail on ground behind player
      const trailGrad = ctx.createRadialGradient(x, y + size / 2 + 5, 0, x, y + size / 2 + 5, size * 0.8);
      trailGrad.addColorStop(0, `rgba(6, 182, 212, ${0.08 * sizePercent})`);
      trailGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = trailGrad;
      ctx.fillRect(x - size, y, size * 2, size);

      // Ice glow — shifts from cyan to pink when endangered
      const glowColor = worry > 0.6
        ? `rgba(244, 63, 94, ${0.3 + Math.sin(t * 8) * 0.15})`
        : `rgba(6, 182, 212, 0.25)`;
      const iceGlow = ctx.createRadialGradient(x, y, size * 0.2, x, y, size);
      iceGlow.addColorStop(0, glowColor);
      iceGlow.addColorStop(1, 'transparent');
      ctx.fillStyle = iceGlow;
      ctx.fillRect(x - size, y - size, size * 2, size * 2);

      // Main ice body — faceted look
      const halfS = size / 2;
      const bevel = size * 0.12;

      // Shadow face (bottom-right)
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.beginPath();
      ctx.moveTo(x + halfS, y - halfS + bevel);
      ctx.lineTo(x + halfS, y + halfS - bevel);
      ctx.lineTo(x + halfS - bevel, y + halfS);
      ctx.lineTo(x - halfS + bevel, y + halfS);
      ctx.lineTo(x - halfS + bevel + 3, y + halfS - 3);
      ctx.lineTo(x + halfS - 3, y + halfS - 3);
      ctx.lineTo(x + halfS - 3, y - halfS + bevel + 3);
      ctx.closePath();
      ctx.fill();

      // Body — color shifts warmer when melting
      const bodyColor = worry > 0.6 ? '#0891b2' : THEME.ice;
      ctx.fillStyle = bodyColor;
      ctx.beginPath();
      ctx.moveTo(x - halfS + bevel, y - halfS);
      ctx.lineTo(x + halfS - bevel, y - halfS);
      ctx.lineTo(x + halfS, y - halfS + bevel);
      ctx.lineTo(x + halfS, y + halfS - bevel);
      ctx.lineTo(x + halfS - bevel, y + halfS);
      ctx.lineTo(x - halfS + bevel, y + halfS);
      ctx.lineTo(x - halfS, y + halfS - bevel);
      ctx.lineTo(x - halfS, y - halfS + bevel);
      ctx.closePath();
      ctx.fill();

      // Top-left highlight facet
      ctx.fillStyle = `rgba(236, 254, 255, ${0.25 + sizePercent * 0.15})`;
      ctx.beginPath();
      ctx.moveTo(x - halfS + bevel, y - halfS);
      ctx.lineTo(x - halfS + bevel + size * 0.35, y - halfS);
      ctx.lineTo(x - halfS + bevel + size * 0.25, y - halfS + size * 0.25);
      ctx.lineTo(x - halfS, y - halfS + bevel + size * 0.25);
      ctx.lineTo(x - halfS, y - halfS + bevel);
      ctx.closePath();
      ctx.fill();

      // Melting drip (when worried)
      if (worry > 0.2) {
        const dripLen = worry * 10 + Math.sin(t * 4) * 3;
        ctx.fillStyle = bodyColor;
        ctx.beginPath();
        ctx.ellipse(x + size * 0.15, y + halfS + dripLen * 0.5, 3, dripLen, 0, 0, Math.PI * 2);
        ctx.fill();
        if (worry > 0.5) {
          const drip2 = worry * 7 + Math.sin(t * 3 + 2) * 2;
          ctx.beginPath();
          ctx.ellipse(x - size * 0.2, y + halfS + drip2 * 0.4, 2.5, drip2, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Face
      const eyeSize = Math.max(2, size * 0.08);
      const eyeY = y - size * 0.08;
      const eyeSpacing = size * 0.18;
      const eyeStretch = 1 + worry * 0.6;

      // Eye whites (when worried)
      if (worry > 0.3) {
        ctx.fillStyle = '#ecfeff';
        ctx.beginPath();
        ctx.ellipse(x - eyeSpacing, eyeY, eyeSize * 1.6, eyeSize * 1.6 * eyeStretch, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(x + eyeSpacing, eyeY, eyeSize * 1.6, eyeSize * 1.6 * eyeStretch, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      // Pupils
      ctx.fillStyle = '#0a0a0a';
      ctx.beginPath();
      ctx.ellipse(x - eyeSpacing, eyeY, eyeSize, eyeSize * eyeStretch, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(x + eyeSpacing, eyeY, eyeSize, eyeSize * eyeStretch, 0, 0, Math.PI * 2);
      ctx.fill();

      // Eye shine
      ctx.fillStyle = '#ecfeff';
      ctx.beginPath();
      ctx.arc(x - eyeSpacing + 1, eyeY - eyeSize * 0.4, eyeSize * 0.35, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x + eyeSpacing + 1, eyeY - eyeSize * 0.4, eyeSize * 0.35, 0, Math.PI * 2);
      ctx.fill();

      // Eyebrows
      if (worry > 0.3) {
        ctx.strokeStyle = '#0a0a0a';
        ctx.lineWidth = Math.max(1.5, size * 0.04);
        ctx.lineCap = 'round';
        const browLift = worry * 4;
        ctx.beginPath();
        ctx.moveTo(x - eyeSpacing - eyeSize * 1.5, eyeY - eyeSize * 2.2);
        ctx.lineTo(x - eyeSpacing + eyeSize * 0.5, eyeY - eyeSize * 2 - browLift);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x + eyeSpacing + eyeSize * 1.5, eyeY - eyeSize * 2.2);
        ctx.lineTo(x + eyeSpacing - eyeSize * 0.5, eyeY - eyeSize * 2 - browLift);
        ctx.stroke();
      }

      // Mouth
      ctx.strokeStyle = '#0a0a0a';
      ctx.lineWidth = Math.max(1.5, size * 0.035);
      ctx.lineCap = 'round';
      ctx.beginPath();
      if (worry > 0.6) {
        // Panicked open mouth
        ctx.fillStyle = '#0a0a0a';
        ctx.ellipse(x, y + size * 0.22, size * 0.1, size * 0.08, 0, 0, Math.PI * 2);
        ctx.fill();
      } else if (worry > 0.3) {
        // Worried squiggle
        ctx.moveTo(x - size * 0.1, y + size * 0.2);
        ctx.quadraticCurveTo(x - size * 0.04, y + size * 0.15, x, y + size * 0.2);
        ctx.quadraticCurveTo(x + size * 0.04, y + size * 0.25, x + size * 0.1, y + size * 0.2);
        ctx.stroke();
      } else {
        // Chill smile
        ctx.arc(x, y + size * 0.1, size * 0.12, 0.1, Math.PI - 0.1);
        ctx.stroke();
      }

      ctx.restore();

      // === DANGER VIGNETTE ===
      if (sizePercent < 0.25) {
        const pulse = Math.sin(t * 6) * 0.5 + 0.5;
        const vignette = ctx.createRadialGradient(
          canvasSize.w / 2, canvasSize.h / 2, canvasSize.h * 0.25,
          canvasSize.w / 2, canvasSize.h / 2, canvasSize.h * 0.65
        );
        vignette.addColorStop(0, 'transparent');
        vignette.addColorStop(1, `rgba(244, 63, 94, ${pulse * 0.35})`);
        ctx.fillStyle = vignette;
        ctx.fillRect(0, 0, canvasSize.w, canvasSize.h);
      }

      // === POPUP TEXT ===
      if (game.popupText && game.popupTimer > 0) {
        const popupProgress = 1 - game.popupTimer / 0.5;
        const popupScale = 1 + popupProgress * 0.3;
        const popupAlpha = game.popupTimer * 2;
        ctx.save();
        ctx.globalAlpha = Math.min(1, popupAlpha);
        ctx.translate(canvasSize.w / 2, canvasSize.h * 0.4);
        ctx.scale(popupScale, popupScale);
        ctx.font = 'bold 42px ui-monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.letterSpacing = '4px';
        const popColor = game.popupText === 'OUCH!' ? THEME.danger :
                         game.popupText === 'ICE!' ? THEME.iceCore : THEME.text;
        // Text shadow
        ctx.fillStyle = '#0a0a0a';
        ctx.fillText(game.popupText, 2, 2);
        // Text
        ctx.fillStyle = popColor;
        ctx.fillText(game.popupText, 0, 0);
        ctx.restore();
      }

      // === HUD ===
      // Score
      ctx.fillStyle = THEME.text;
      ctx.font = 'bold 28px ui-monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`${game.score}`, 20, 42);

      // Multiplier badge
      const multiplier = 1 + sizePercent;
      if (multiplier >= 1.3) {
        ctx.fillStyle = THEME.iceCore;
        ctx.font = 'bold 14px ui-monospace';
        ctx.fillText(`${multiplier.toFixed(1)}x`, 20, 62);
      }

      // Size bar — integrated look
      const barW = 80;
      const barH = 6;
      const barX = canvasSize.w - barW - 20;
      const barY = 34;

      // Bar background
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.beginPath();
      ctx.roundRect(barX, barY, barW, barH, 3);
      ctx.fill();

      // Bar fill
      const barColor = sizePercent > 0.3 ? THEME.ice : THEME.danger;
      ctx.fillStyle = barColor;
      ctx.beginPath();
      ctx.roundRect(barX, barY, barW * Math.max(0, sizePercent), barH, 3);
      ctx.fill();

      // Bar glow when healthy
      if (sizePercent > 0.5) {
        ctx.shadowColor = THEME.ice;
        ctx.shadowBlur = 8;
        ctx.fillStyle = THEME.ice;
        ctx.beginPath();
        ctx.roundRect(barX, barY, barW * sizePercent, barH, 3);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // Label
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.font = '11px ui-monospace';
      ctx.textAlign = 'right';
      ctx.fillText('ICE', barX - 6, barY + 6);
    };

    const gameLoop = (timestamp: number) => {
      const dt = Math.min((timestamp - lastTime) / 1000, 0.05);
      lastTime = timestamp;
      update(dt);
      draw();
      animationId = requestAnimationFrame(gameLoop);
    };
    animationId = requestAnimationFrame(gameLoop);

    // Touch/swipe controls
    let touchStartX = 0;

    const handleTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      touchStartX = e.touches[0].clientX;
    };

    const handleTouchEnd = (e: TouchEvent) => {
      e.preventDefault();
      const touchEndX = e.changedTouches[0].clientX;
      const diff = touchEndX - touchStartX;
      
      if (Math.abs(diff) > 30) {
        switchLane(diff > 0 ? 1 : -1);
      }
    };

    // Mouse click controls (click left/right half)
    const handleClick = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const midX = rect.width / 2;
      
      switchLane(clickX > midX ? 1 : -1);
    };

    // Keyboard controls
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'a') switchLane(-1);
      if (e.key === 'ArrowRight' || e.key === 'd') switchLane(1);
    };

    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd, { passive: false });
    canvas.addEventListener('click', handleClick);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      cancelAnimationFrame(animationId);
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchend', handleTouchEnd);
      canvas.removeEventListener('click', handleClick);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [gameState, canvasSize, spawnObstacles, switchLane]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: THEME.bg,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'ui-monospace, monospace',
      }}
    >
      {gameState === 'start' && (
        <div style={{ textAlign: 'center', padding: 30, maxWidth: 360 }}>
          <div style={{ fontSize: 72, marginBottom: 4 }}>🧊</div>
          <h1 style={{
            color: THEME.text,
            fontSize: 56,
            margin: '0 0 4px',
            fontWeight: 900,
            letterSpacing: '6px',
          }}>
            MELT
          </h1>
          <p style={{
            color: THEME.ice,
            fontSize: 13,
            marginBottom: 32,
            lineHeight: 2,
            letterSpacing: '1px',
            opacity: 0.7,
          }}>
            SWIPE TO DODGE LAVA<br />
            COLLECT ICE TO SURVIVE<br />
            <span style={{ color: THEME.lavaMid }}>BIGGER = MORE POINTS</span>
          </p>
          <button
            onClick={startGame}
            style={{
              background: 'transparent',
              color: THEME.ice,
              border: `2px solid ${THEME.ice}`,
              padding: '14px 56px',
              fontSize: 16,
              fontWeight: 700,
              letterSpacing: '4px',
              borderRadius: 0,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = THEME.ice;
              e.currentTarget.style.color = THEME.bg;
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = THEME.ice;
            }}
          >
            START
          </button>
        </div>
      )}

      {gameState === 'playing' && (
        <canvas
          ref={canvasRef}
          width={canvasSize.w}
          height={canvasSize.h}
          style={{ touchAction: 'none' }}
        />
      )}

      {gameState === 'gameOver' && (
        <div style={{ textAlign: 'center', padding: 30, maxWidth: 360 }}>
          <div style={{ fontSize: 56, marginBottom: 8 }}>💧</div>
          <h1 style={{
            color: THEME.danger,
            fontSize: 32,
            margin: '0 0 20px',
            fontWeight: 900,
            letterSpacing: '4px',
          }}>
            EVAPORATED
          </h1>
          <div style={{
            color: THEME.text,
            fontSize: 56,
            fontWeight: 900,
            marginBottom: 4,
          }}>
            {score}
          </div>
          {score >= highScore && highScore > 0 && (
            <p style={{
              color: THEME.lavaMid,
              fontSize: 14,
              letterSpacing: '2px',
              marginBottom: 8,
            }}>
              NEW BEST
            </p>
          )}
          <p style={{
            color: THEME.text,
            fontSize: 13,
            marginBottom: 32,
            opacity: 0.3,
          }}>
            BEST {highScore}
          </p>
          <button
            onClick={startGame}
            style={{
              background: 'transparent',
              color: THEME.ice,
              border: `2px solid ${THEME.ice}`,
              padding: '14px 44px',
              fontSize: 14,
              fontWeight: 700,
              letterSpacing: '4px',
              borderRadius: 0,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = THEME.ice;
              e.currentTarget.style.color = THEME.bg;
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = THEME.ice;
            }}
          >
            AGAIN
          </button>
        </div>
      )}
    </div>
  );
}
