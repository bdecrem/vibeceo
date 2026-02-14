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

const GAME_ID = 'blast';

// INDIE BITE theme - Neon arcade
const THEME = {
  bg: '#09090b',
  surface: '#18181b',
  slime: '#22d3ee',     // Cyan player
  goo: '#67e8f9',       // Lighter cyan for projectiles
  triangle: '#f472b6',  // Pink
  square: '#a78bfa',    // Purple
  hexagon: '#facc15',   // Yellow
  boss: '#ef4444',      // Red
  text: '#ffffff',
};

// Shape sizes
const SIZE = {
  big: 32,      // Loop spec
  medium: 20,   // Loop spec
  small: 12,    // Loop spec
};

// Physics (Loop spec)
const PLAYER_SPEED = 400;
const GOO_SPEED = 500;       // ~8px per frame at 60fps
const BASE_ENEMY_SPEED = 40;
const DESCENT_STEP = 16;     // Loop spec
const MAX_BULLETS = 3;       // Loop spec: max 3 on screen
const MAX_SHAPES = 20;       // Loop spec: cap to prevent chaos
const ENEMY_FIRE_INTERVAL = 2; // seconds, starting wave 3

type ShapeType = 'triangle' | 'square' | 'hexagon';
type ShapeSize = 'big' | 'medium' | 'small';

interface Shape {
  id: number;
  x: number;
  y: number;
  type: ShapeType;
  size: ShapeSize;
  rotation: number;
  rotationSpeed: number;
  hp: number;
}

interface Goo {
  x: number;
  y: number;
  vy: number;
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

interface Boss {
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  phase: number;
  attackTimer: number;
}

// Social colors
const SCORE_FLOW_COLORS: ScoreFlowColors = {
  bg: THEME.bg,
  surface: THEME.surface,
  primary: THEME.slime,
  secondary: THEME.triangle,
  text: THEME.text,
  muted: '#71717a',
  error: '#ef4444',
};

const LEADERBOARD_COLORS: LeaderboardColors = {
  bg: THEME.bg,
  surface: THEME.surface,
  primary: THEME.slime,
  secondary: THEME.triangle,
  text: THEME.text,
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

function playShoot() {
  if (!audioCtx || !masterGain) return;
  const t = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(600, t);
  osc.frequency.exponentialRampToValueAtTime(200, t + 0.1);
  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(0.15, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
  osc.connect(gain);
  gain.connect(masterGain);
  osc.start(t);
  osc.stop(t + 0.1);
}

function playHit(big = false) {
  if (!audioCtx || !masterGain) return;
  const t = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  osc.type = 'square';
  osc.frequency.setValueAtTime(big ? 150 : 300, t);
  osc.frequency.exponentialRampToValueAtTime(big ? 80 : 150, t + 0.15);
  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(big ? 0.2 : 0.12, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
  osc.connect(gain);
  gain.connect(masterGain);
  osc.start(t);
  osc.stop(t + 0.15);
}

function playDeath() {
  if (!audioCtx || !masterGain) return;
  const t = audioCtx.currentTime;
  [200, 150, 100, 80].forEach((freq, i) => {
    const osc = audioCtx!.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = freq;
    const gain = audioCtx!.createGain();
    gain.gain.setValueAtTime(0.15, t + i * 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.1 + 0.2);
    osc.connect(gain);
    gain.connect(masterGain!);
    osc.start(t + i * 0.1);
    osc.stop(t + i * 0.1 + 0.2);
  });
}

function playWaveClear() {
  if (!audioCtx || !masterGain) return;
  const t = audioCtx.currentTime;
  [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
    const osc = audioCtx!.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;
    const gain = audioCtx!.createGain();
    gain.gain.setValueAtTime(0.12, t + i * 0.08);
    gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.08 + 0.3);
    osc.connect(gain);
    gain.connect(masterGain!);
    osc.start(t + i * 0.08);
    osc.stop(t + i * 0.08 + 0.3);
  });
}

function playCombo(count: number) {
  if (!audioCtx || !masterGain) return;
  const t = audioCtx.currentTime;
  const freq = 400 + count * 50;
  const osc = audioCtx.createOscillator();
  osc.type = 'sine';
  osc.frequency.value = Math.min(freq, 1200);
  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(0.1, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
  osc.connect(gain);
  gain.connect(masterGain);
  osc.start(t);
  osc.stop(t + 0.1);
}

export default function BlastPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [canvasSize, setCanvasSize] = useState({ w: 400, h: 600 });
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'gameover'>('menu');
  const [score, setScore] = useState(0);
  const [wave, setWave] = useState(1);
  const [highScore, setHighScore] = useState(0);
  const [socialLoaded, setSocialLoaded] = useState(false);
  const [submittedEntryId, setSubmittedEntryId] = useState<number | null>(null);
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  const gameRef = useRef({
    player: { x: 200, y: 550, squash: 1, shootCooldown: 0 },
    shapes: [] as Shape[],
    goos: [] as Goo[],
    particles: [] as Particle[],
    boss: null as Boss | null,
    bossProjectiles: [] as { x: number; y: number; vx: number; vy: number }[],
    enemyProjectiles: [] as { x: number; y: number; vy: number }[], // Shapes fire back
    wave: 1,
    score: 0,
    combo: 0,
    comboTimer: 0,
    enemyDirection: 1,
    enemySpeed: BASE_ENEMY_SPEED,
    enemyFireTimer: ENEMY_FIRE_INTERVAL,
    moveDown: false,
    shapeIdCounter: 0,
    screenShake: 0,
    autoFire: false,
    isFiring: false,
  });

  const inputRef = useRef({
    targetX: 200,
    firing: false,
  });

  usePixelpitSocial(socialLoaded);

  // Load high score
  useEffect(() => {
    const saved = localStorage.getItem('blast_highscore');
    if (saved) setHighScore(parseInt(saved));
  }, []);

  // Resize handler
  useEffect(() => {
    const handleResize = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const w = Math.min(vw - 20, 450);
      const h = Math.min(vh - 100, 700);
      setCanvasSize({ w, h });
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Spawn wave (Loop spec)
  const spawnWave = useCallback((waveNum: number) => {
    const game = gameRef.current;
    game.shapes = [];
    game.boss = null;
    game.bossProjectiles = [];
    game.enemyFireTimer = ENEMY_FIRE_INTERVAL;
    
    // Boss every 5 waves
    if (waveNum % 5 === 0) {
      const bossHp = 8 + Math.floor(waveNum / 5) * 2; // Start at 8, +2 per boss
      game.boss = {
        x: canvasSize.w / 2,
        y: 80,
        hp: bossHp,
        maxHp: bossHp,
        phase: 0,
        attackTimer: 2,
      };
      return;
    }
    
    // Wave progression per Loop spec
    let largeCount: number, mediumCount: number, smallCount: number, rows: number;
    if (waveNum === 1) {
      largeCount = 3; mediumCount = 0; smallCount = 0; rows = 1;
    } else if (waveNum === 2) {
      largeCount = 4; mediumCount = 2; smallCount = 0; rows = 2;
    } else if (waveNum === 3) {
      largeCount = 5; mediumCount = 3; smallCount = 2; rows = 3;
    } else if (waveNum === 4) {
      largeCount = 6; mediumCount = 4; smallCount = 4; rows = 3;
    } else {
      // Wave 6+: scaling
      largeCount = 6 + Math.floor((waveNum - 5) / 2);
      mediumCount = 4 + Math.floor((waveNum - 5) / 2);
      smallCount = 4 + Math.floor((waveNum - 5) / 3);
      rows = Math.min(4 + Math.floor((waveNum - 5) / 3), 6);
    }
    
    // Create shape pool with proper size distribution
    const shapePool: { size: ShapeSize; type: ShapeType }[] = [];
    const types: ShapeType[] = ['triangle', 'square', 'hexagon'];
    
    for (let i = 0; i < largeCount; i++) {
      shapePool.push({ size: 'big', type: types[i % 3] });
    }
    for (let i = 0; i < mediumCount; i++) {
      shapePool.push({ size: 'medium', type: types[(i + 1) % 3] });
    }
    for (let i = 0; i < smallCount; i++) {
      shapePool.push({ size: 'small', type: types[(i + 2) % 3] });
    }
    
    // Shuffle pool
    for (let i = shapePool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shapePool[i], shapePool[j]] = [shapePool[j], shapePool[i]];
    }
    
    // Layout in grid
    const cols = Math.ceil(shapePool.length / rows);
    const spacing = 50;
    const startX = (canvasSize.w - (cols - 1) * spacing) / 2;
    const startY = 60;
    
    let shapeIndex = 0;
    for (let row = 0; row < rows && shapeIndex < shapePool.length; row++) {
      for (let col = 0; col < cols && shapeIndex < shapePool.length; col++) {
        const { size, type } = shapePool[shapeIndex];
        game.shapes.push({
          id: game.shapeIdCounter++,
          x: startX + col * spacing,
          y: startY + row * spacing,
          type,
          size,
          rotation: Math.random() * Math.PI * 2,
          rotationSpeed: (Math.random() - 0.5) * 2,
          hp: 1,
        });
        shapeIndex++;
      }
    }
    
    // Speed scales with wave (Loop spec: 1 + wave × 0.05)
    game.enemySpeed = BASE_ENEMY_SPEED * (1 + waveNum * 0.05);
    game.enemyDirection = 1;
  }, [canvasSize]);

  // Start game
  const startGame = useCallback(() => {
    initAudio();
    const game = gameRef.current;
    game.player = { x: canvasSize.w / 2, y: canvasSize.h - 50, squash: 1, shootCooldown: 0 };
    game.goos = [];
    game.particles = [];
    game.enemyProjectiles = [];
    game.wave = 1;
    game.score = 0;
    game.combo = 0;
    game.comboTimer = 0;
    game.screenShake = 0;
    game.enemyFireTimer = ENEMY_FIRE_INTERVAL;
    inputRef.current.targetX = canvasSize.w / 2;
    spawnWave(1);
    setScore(0);
    setWave(1);
    setGameState('playing');
  }, [canvasSize, spawnWave]);

  // Get shape color
  const getShapeColor = (type: ShapeType) => {
    switch (type) {
      case 'triangle': return THEME.triangle;
      case 'square': return THEME.square;
      case 'hexagon': return THEME.hexagon;
    }
  };

  // Get shape size pixels
  const getShapeSize = (size: ShapeSize) => SIZE[size];

  // Spawn particles
  const spawnParticles = useCallback((x: number, y: number, color: string, count: number) => {
    const game = gameRef.current;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 50 + Math.random() * 100;
      game.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.5 + Math.random() * 0.3,
        color,
        size: 3 + Math.random() * 4,
      });
    }
  }, []);

  // Split shape
  const splitShape = useCallback((shape: Shape) => {
    const game = gameRef.current;
    const color = getShapeColor(shape.type);
    spawnParticles(shape.x, shape.y, color, 8);
    
    if (shape.size === 'big') {
      // Split into 2 medium
      for (let i = 0; i < 2; i++) {
        game.shapes.push({
          id: game.shapeIdCounter++,
          x: shape.x + (i === 0 ? -15 : 15),
          y: shape.y,
          type: shape.type,
          size: 'medium',
          rotation: Math.random() * Math.PI * 2,
          rotationSpeed: (Math.random() - 0.5) * 3,
          hp: 1,
        });
      }
      playHit(true);
    } else if (shape.size === 'medium') {
      // Split into 2 small
      for (let i = 0; i < 2; i++) {
        game.shapes.push({
          id: game.shapeIdCounter++,
          x: shape.x + (i === 0 ? -10 : 10),
          y: shape.y,
          type: shape.type,
          size: 'small',
          rotation: Math.random() * Math.PI * 2,
          rotationSpeed: (Math.random() - 0.5) * 4,
          hp: 1,
        });
      }
      playHit(false);
    } else {
      // Small destroyed
      playHit(false);
    }
    
    // Remove original
    game.shapes = game.shapes.filter(s => s.id !== shape.id);
  }, [spawnParticles]);

  // Input handlers
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (gameState !== 'playing') return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    inputRef.current.targetX = x;
    inputRef.current.firing = true;
  }, [gameState]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (gameState !== 'playing') return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    inputRef.current.targetX = x;
  }, [gameState]);

  const handlePointerUp = useCallback(() => {
    inputRef.current.firing = false;
  }, []);

  // Game loop
  useEffect(() => {
    if (gameState !== 'playing') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let lastTime = performance.now();

    const update = (dt: number) => {
      const game = gameRef.current;
      const input = inputRef.current;

      // Move player toward target
      const dx = input.targetX - game.player.x;
      const moveSpeed = PLAYER_SPEED * dt;
      if (Math.abs(dx) > moveSpeed) {
        game.player.x += Math.sign(dx) * moveSpeed;
      } else {
        game.player.x = input.targetX;
      }
      game.player.x = Math.max(25, Math.min(canvasSize.w - 25, game.player.x));

      // Shooting (Loop spec: max 3 bullets on screen)
      game.player.shootCooldown -= dt;
      if (input.firing && game.player.shootCooldown <= 0 && game.goos.length < MAX_BULLETS) {
        game.goos.push({
          x: game.player.x,
          y: game.player.y - 20,
          vy: -GOO_SPEED,
        });
        game.player.squash = 0.7;
        game.player.shootCooldown = 0.2;
        playShoot();
      }

      // Recover squash
      game.player.squash += (1 - game.player.squash) * 10 * dt;

      // Update goos
      for (const goo of game.goos) {
        goo.y += goo.vy * dt;
      }
      game.goos = game.goos.filter(g => g.y > -10);

      // Update combo timer
      if (game.comboTimer > 0) {
        game.comboTimer -= dt;
        if (game.comboTimer <= 0) {
          game.combo = 0;
        }
      }

      // Screen shake decay
      game.screenShake *= 0.9;

      // BOSS LOGIC
      if (game.boss) {
        const boss = game.boss;
        
        // Boss movement (side to side)
        boss.x += Math.sin(performance.now() / 500) * 2;
        
        // Boss attacks
        boss.attackTimer -= dt;
        if (boss.attackTimer <= 0) {
          boss.attackTimer = 1.5 - game.wave * 0.05;
          // Fire projectiles
          const angle = Math.atan2(game.player.y - boss.y, game.player.x - boss.x);
          game.bossProjectiles.push({
            x: boss.x,
            y: boss.y + 30,
            vx: Math.cos(angle) * 200,
            vy: Math.sin(angle) * 200,
          });
        }
        
        // Boss projectiles
        for (const proj of game.bossProjectiles) {
          proj.x += proj.vx * dt;
          proj.y += proj.vy * dt;
          
          // Hit player
          const dx = proj.x - game.player.x;
          const dy = proj.y - game.player.y;
          if (Math.sqrt(dx * dx + dy * dy) < 25) {
            // Player hit!
            playDeath();
            game.screenShake = 20;
            setGameState('gameover');
            setSocialLoaded(true);
            if (game.score > highScore) {
              setHighScore(game.score);
              localStorage.setItem('blast_highscore', game.score.toString());
            }
            return;
          }
        }
        game.bossProjectiles = game.bossProjectiles.filter(p => 
          p.y < canvasSize.h + 20 && p.x > -20 && p.x < canvasSize.w + 20
        );
        
        // Check goo hits on boss
        for (const goo of game.goos) {
          const dx = goo.x - boss.x;
          const dy = goo.y - boss.y;
          if (Math.sqrt(dx * dx + dy * dy) < 50) {
            boss.hp--;
            game.score += 50;
            setScore(game.score);
            spawnParticles(goo.x, goo.y, THEME.boss, 5);
            playHit(true);
            game.screenShake = 5;
            game.goos = game.goos.filter(g => g !== goo);
            
            if (boss.hp <= 0) {
              // Boss defeated!
              spawnParticles(boss.x, boss.y, THEME.boss, 30);
              game.score += 500;
              setScore(game.score);
              playWaveClear();
              game.screenShake = 15;
              game.boss = null;
              game.wave++;
              setWave(game.wave);
              setTimeout(() => spawnWave(game.wave), 1000);
            }
            break;
          }
        }
        
      } else {
        // REGULAR WAVE LOGIC
        
        // Move shapes
        let hitEdge = false;
        for (const shape of game.shapes) {
          shape.x += game.enemyDirection * game.enemySpeed * dt;
          shape.rotation += shape.rotationSpeed * dt;
          
          const size = getShapeSize(shape.size);
          if (shape.x < size || shape.x > canvasSize.w - size) {
            hitEdge = true;
          }
        }
        
        // Reverse and descend
        if (hitEdge) {
          game.enemyDirection *= -1;
          for (const shape of game.shapes) {
            shape.y += DESCENT_STEP;
            
            // Check if shapes reached player
            if (shape.y > canvasSize.h - 80) {
              playDeath();
              game.screenShake = 20;
              setGameState('gameover');
              setSocialLoaded(true);
              if (game.score > highScore) {
                setHighScore(game.score);
                localStorage.setItem('blast_highscore', game.score.toString());
              }
              return;
            }
          }
          // Speed up as shapes die
          const remainingBig = game.shapes.filter(s => s.size === 'big').length;
          game.enemySpeed = BASE_ENEMY_SPEED + game.wave * 5 + (20 - remainingBig) * 3;
        }
        
        // Check goo collisions
        for (const goo of [...game.goos]) {
          for (const shape of [...game.shapes]) {
            const size = getShapeSize(shape.size);
            const dx = goo.x - shape.x;
            const dy = goo.y - shape.y;
            if (Math.sqrt(dx * dx + dy * dy) < size) {
              // Hit!
              game.combo++;
              game.comboTimer = 1.5;
              const points = (shape.size === 'big' ? 10 : shape.size === 'medium' ? 20 : 30) * game.combo;
              game.score += points;
              setScore(game.score);
              
              if (game.combo > 1) {
                playCombo(game.combo);
              }
              
              splitShape(shape);
              game.goos = game.goos.filter(g => g !== goo);
              break;
            }
          }
        }
        
        // Enemy fire (Loop spec: starting wave 3, one shot per 2 seconds)
        if (game.wave >= 3 && game.shapes.length > 0) {
          game.enemyFireTimer -= dt;
          if (game.enemyFireTimer <= 0) {
            game.enemyFireTimer = ENEMY_FIRE_INTERVAL;
            // Pick random shape to fire
            const shooter = game.shapes[Math.floor(Math.random() * game.shapes.length)];
            game.enemyProjectiles.push({
              x: shooter.x,
              y: shooter.y + getShapeSize(shooter.size),
              vy: 150, // Slow projectile
            });
          }
        }
        
        // Update enemy projectiles
        for (const proj of game.enemyProjectiles) {
          proj.y += proj.vy * dt;
          
          // Hit player
          const dx = proj.x - game.player.x;
          const dy = proj.y - game.player.y;
          if (Math.sqrt(dx * dx + dy * dy) < 25) {
            playDeath();
            game.screenShake = 20;
            setGameState('gameover');
            setSocialLoaded(true);
            if (game.score > highScore) {
              setHighScore(game.score);
              localStorage.setItem('blast_highscore', game.score.toString());
            }
            return;
          }
        }
        game.enemyProjectiles = game.enemyProjectiles.filter(p => p.y < canvasSize.h + 20);
        
        // Check wave clear
        if (game.shapes.length === 0) {
          game.enemyProjectiles = []; // Clear projectiles on wave clear
          playWaveClear();
          game.wave++;
          setWave(game.wave);
          setTimeout(() => spawnWave(game.wave), 1000);
        }
      }

      // Update particles
      game.particles = game.particles.filter(p => {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 200 * dt; // gravity
        p.life -= dt;
        return p.life > 0;
      });
    };

    const draw = () => {
      const now = performance.now();
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;

      update(dt);

      const game = gameRef.current;

      // Screen shake offset
      const shakeX = (Math.random() - 0.5) * game.screenShake;
      const shakeY = (Math.random() - 0.5) * game.screenShake;

      ctx.save();
      ctx.translate(shakeX, shakeY);

      // Background
      ctx.fillStyle = THEME.bg;
      ctx.fillRect(-10, -10, canvasSize.w + 20, canvasSize.h + 20);

      // Wave indicator
      ctx.fillStyle = THEME.text;
      ctx.font = 'bold 16px system-ui';
      ctx.textAlign = 'left';
      ctx.fillText(`WAVE ${game.wave}`, 15, 30);

      // Score
      ctx.textAlign = 'right';
      ctx.fillText(`${game.score}`, canvasSize.w - 15, 30);

      // Combo
      if (game.combo > 1) {
        ctx.fillStyle = THEME.slime;
        ctx.font = 'bold 20px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText(`${game.combo}x COMBO!`, canvasSize.w / 2, 55);
      }

      // Draw goos
      ctx.fillStyle = THEME.goo;
      ctx.shadowBlur = 8;
      ctx.shadowColor = THEME.goo;
      for (const goo of game.goos) {
        ctx.beginPath();
        ctx.ellipse(goo.x, goo.y, 6, 10, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.shadowBlur = 0;

      // Draw shapes
      for (const shape of game.shapes) {
        const size = getShapeSize(shape.size);
        const color = getShapeColor(shape.type);
        
        ctx.save();
        ctx.translate(shape.x, shape.y);
        ctx.rotate(shape.rotation);
        ctx.shadowBlur = 10;
        ctx.shadowColor = color;
        ctx.fillStyle = color;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        
        ctx.beginPath();
        if (shape.type === 'triangle') {
          for (let i = 0; i < 3; i++) {
            const angle = (i * Math.PI * 2) / 3 - Math.PI / 2;
            const x = Math.cos(angle) * size;
            const y = Math.sin(angle) * size;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
        } else if (shape.type === 'square') {
          ctx.rect(-size * 0.7, -size * 0.7, size * 1.4, size * 1.4);
        } else {
          for (let i = 0; i < 6; i++) {
            const angle = (i * Math.PI * 2) / 6;
            const x = Math.cos(angle) * size;
            const y = Math.sin(angle) * size;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }

      // Draw boss
      if (game.boss) {
        const boss = game.boss;
        ctx.save();
        ctx.translate(boss.x, boss.y);
        ctx.shadowBlur = 20;
        ctx.shadowColor = THEME.boss;
        ctx.fillStyle = THEME.boss;
        
        // Boss shape (big hexagon with inner detail)
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const angle = (i * Math.PI * 2) / 6 + performance.now() / 1000;
          const x = Math.cos(angle) * 50;
          const y = Math.sin(angle) * 50;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fill();
        
        // HP bar
        ctx.fillStyle = '#333';
        ctx.fillRect(-40, 60, 80, 8);
        ctx.fillStyle = THEME.boss;
        ctx.fillRect(-40, 60, 80 * (boss.hp / boss.maxHp), 8);
        
        ctx.restore();
        
        // Boss projectiles
        ctx.fillStyle = THEME.boss;
        ctx.shadowBlur = 10;
        ctx.shadowColor = THEME.boss;
        for (const proj of game.bossProjectiles) {
          ctx.beginPath();
          ctx.arc(proj.x, proj.y, 8, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      
      // Enemy projectiles (shapes firing back, wave 3+)
      ctx.fillStyle = THEME.triangle;
      ctx.shadowBlur = 8;
      ctx.shadowColor = THEME.triangle;
      for (const proj of game.enemyProjectiles) {
        ctx.beginPath();
        ctx.arc(proj.x, proj.y, 6, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.shadowBlur = 0;

      // Draw particles
      for (const p of game.particles) {
        ctx.globalAlpha = p.life * 2;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;

      // Draw player (slime)
      const player = game.player;
      ctx.save();
      ctx.translate(player.x, player.y);
      ctx.scale(1 / player.squash, player.squash);
      
      // Slime body
      ctx.shadowBlur = 15;
      ctx.shadowColor = THEME.slime;
      ctx.fillStyle = THEME.slime;
      ctx.beginPath();
      ctx.ellipse(0, 0, 25, 20, 0, 0, Math.PI * 2);
      ctx.fill();
      
      // Eyes
      ctx.fillStyle = THEME.bg;
      ctx.beginPath();
      ctx.ellipse(-8, -5, 5, 6, 0, 0, Math.PI * 2);
      ctx.ellipse(8, -5, 5, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      
      // Pupils
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(-8, -5, 2, 0, Math.PI * 2);
      ctx.arc(8, -5, 2, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.restore();
      ctx.restore();

      animationId = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animationId);
  }, [gameState, canvasSize, spawnWave, splitShape, spawnParticles, highScore]);

  return (
    <>
      <Script src="https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.3/dist/confetti.browser.min.js" />

      <div
        className="min-h-screen flex flex-col items-center justify-center p-4"
        style={{ backgroundColor: THEME.bg }}
      >
        {gameState === 'menu' && (
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-2" style={{ color: THEME.slime }}>
              👾 BLAST
            </h1>
            <p className="text-lg mb-2" style={{ color: '#9ca3af' }}>
              Slime vs Shapes
            </p>
            {highScore > 0 && (
              <p className="text-sm mb-6" style={{ color: '#6b7280' }}>
                High Score: {highScore}
              </p>
            )}
            <button
              onClick={startGame}
              className="px-8 py-4 rounded-xl text-xl font-bold"
              style={{ backgroundColor: THEME.slime, color: THEME.bg }}
            >
              Start
            </button>
            <p className="text-xs mt-4" style={{ color: '#6b7280' }}>
              Drag to move • Tap to shoot
            </p>
          </div>
        )}

        {gameState === 'playing' && (
          <canvas
            ref={canvasRef}
            width={canvasSize.w}
            height={canvasSize.h}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
            style={{ touchAction: 'none' }}
          />
        )}

        {gameState === 'gameover' && (
          <div className="text-center">
            <h2 className="text-3xl font-bold mb-2" style={{ color: THEME.text }}>
              GAME OVER
            </h2>
            <p className="text-lg mb-1" style={{ color: THEME.slime }}>
              Wave {wave}
            </p>
            <p className="text-4xl font-bold mb-6" style={{ color: THEME.text }}>
              {score}
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
                id="share-btn-blast"
                url={`${typeof window !== 'undefined' ? window.location.origin : ''}/pixelpit/arcade/blast/share/${score}`}
                text={`I scored ${score} in BLAST! Wave ${wave} 👾`}
                style="minimal"
                socialLoaded={socialLoaded}
              />
            </div>

            <div className="flex gap-4 justify-center">
              <button
                onClick={startGame}
                className="px-6 py-3 rounded-xl font-bold"
                style={{ backgroundColor: THEME.slime, color: THEME.bg }}
              >
                Play Again
              </button>
              <button
                onClick={() => setShowLeaderboard(!showLeaderboard)}
                className="px-6 py-3 rounded-xl font-bold border-2"
                style={{ borderColor: THEME.slime, color: THEME.slime, backgroundColor: 'transparent' }}
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
