'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';

// Grid settings
const CELL_SIZE = 8;
const BRUSH_RADIUS = 12; // pixels (narrow tunnels)
const GRID_WIDTH = 50; // cells
const GRID_HEIGHT = 80; // cells

// Physics
const GRAVITY = 0.3;
const SLIDE_FRICTION = 0.85;
const BOUNCE = 0.2;
const STUCK_THRESHOLD = 2000; // ms before nudge

// Cloud types
const CLOUD_EMPTY = 0;
const CLOUD_WHITE = 1;
const CLOUD_GRAY = 2;
const CLOUD_DARK = 3;

// Theme colors (PLAYROOM)
const THEME = {
  sky: '#87CEEB',
  skyDark: '#5BA3C6',
  cloudWhite: '#FFFFFF',
  cloudGray: '#B0B0B0',
  cloudDark: '#606060',
  raindrop: '#4FC3F7',
  raindropDark: '#29B6F6',
  pot: '#8B4513',
  potDark: '#5D2E0C',
  dirt: '#3E2723',
  flower1: '#FF69B4',
  flower2: '#FFD700',
  flower3: '#FF6347',
  flower4: '#9370DB',
  stem: '#228B22',
  text: '#FFFFFF',
  textDark: '#1E3A5F',
};

// Audio
let audioCtx: AudioContext | null = null;

function initAudio() {
  if (audioCtx) return;
  audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  if (audioCtx.state === 'suspended') audioCtx.resume();
}

function playPoof() {
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(800, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(200, audioCtx.currentTime + 0.1);
  gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.1);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.1);
}

function playPlink() {
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(1200, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(800, audioCtx.currentTime + 0.15);
  gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.2);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.2);
}

function playMiss() {
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(300, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.3);
  gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.3);
}

function playBloom() {
  if (!audioCtx) return;
  const t = audioCtx.currentTime;
  [523, 659, 784, 1047].forEach((freq, i) => {
    const osc = audioCtx!.createOscillator();
    const gain = audioCtx!.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, t + i * 0.1);
    gain.gain.linearRampToValueAtTime(0.1, t + i * 0.1 + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.1 + 0.3);
    osc.connect(gain);
    gain.connect(audioCtx!.destination);
    osc.start(t + i * 0.1);
    osc.stop(t + i * 0.1 + 0.3);
  });
}

// Level definitions (World 1: teaching by doing)
// Each level adds ONE concept
const LEVELS = [
  // Level 1: "Swipe to dig" — thin strip, straight path, impossible to fail
  {
    drops: 1,
    lives: 3,
    dropX: 25, // center, directly above pot
    clouds: (grid: number[][]) => {
      // THIN cloud strip - only 4 rows, full width
      for (let y = 35; y < 39; y++) {
        for (let x = 5; x < 45; x++) {
          grid[y][x] = CLOUD_WHITE;
        }
      }
    },
    potX: 25,
    hint: null,
  },
  // Level 2: "Dig a longer path" — thicker cloud, still straight
  {
    drops: 2,
    lives: 3,
    dropX: 25,
    clouds: (grid: number[][]) => {
      // Thicker cloud block
      for (let y = 25; y < 50; y++) {
        for (let x = 10; x < 40; x++) {
          grid[y][x] = CLOUD_WHITE;
        }
      }
    },
    potX: 25,
    hint: null,
  },
  // Level 3: "Angle your path" — drop offset from pot
  {
    drops: 2,
    lives: 3,
    dropX: 15, // left side
    clouds: (grid: number[][]) => {
      for (let y = 20; y < 50; y++) {
        for (let x = 8; x < 42; x++) {
          grid[y][x] = CLOUD_WHITE;
        }
      }
    },
    potX: 35, // right side — must carve diagonal
    hint: null,
  },
  // Level 4: "Multiple drops" — 3 drops, one path
  {
    drops: 3,
    lives: 3,
    dropX: 25,
    clouds: (grid: number[][]) => {
      for (let y = 18; y < 52; y++) {
        for (let x = 10; x < 40; x++) {
          grid[y][x] = CLOUD_WHITE;
        }
      }
    },
    potX: 25,
    hint: null,
  },
  // Level 5: "Obstacles exist" — first gray cloud appears
  {
    drops: 3,
    lives: 3,
    dropX: 25,
    clouds: (grid: number[][]) => {
      // Main white cloud
      for (let y = 15; y < 55; y++) {
        for (let x = 8; x < 42; x++) {
          grid[y][x] = CLOUD_WHITE;
        }
      }
      // Gray obstacle in middle — must go around
      for (let y = 32; y < 40; y++) {
        for (let x = 20; x < 30; x++) {
          grid[y][x] = CLOUD_GRAY;
        }
      }
    },
    potX: 25,
    hint: null,
  },

  // ========== ZONE 2: GARDEN (Levels 6-10) ==========
  // Introduces gray obstacles

  // Level 6: "First Block" — center gray obstacle
  {
    drops: 3,
    lives: 3,
    dropX: 25,
    clouds: (grid: number[][]) => {
      // White cloud
      for (let y = 20; y < 50; y++) {
        for (let x = 10; x < 40; x++) {
          grid[y][x] = CLOUD_WHITE;
        }
      }
      // Gray block in center
      for (let y = 30; y < 35; y++) {
        for (let x = 22; x < 28; x++) {
          grid[y][x] = CLOUD_GRAY;
        }
      }
    },
    potX: 25,
    hint: null,
  },

  // Level 7: "Side Wall" — left side blocked
  {
    drops: 3,
    lives: 3,
    dropX: 20,
    clouds: (grid: number[][]) => {
      // White cloud
      for (let y = 15; y < 55; y++) {
        for (let x = 10; x < 40; x++) {
          grid[y][x] = CLOUD_WHITE;
        }
      }
      // Gray wall on left
      for (let y = 15; y < 55; y++) {
        for (let x = 10; x < 15; x++) {
          grid[y][x] = CLOUD_GRAY;
        }
      }
    },
    potX: 30,
    hint: null,
  },

  // Level 8: "Two Drops" — pillars force choice
  {
    drops: 4,
    lives: 3,
    dropX: 15, // Will alternate with 35
    clouds: (grid: number[][]) => {
      // White cloud
      for (let y = 20; y < 50; y++) {
        for (let x = 8; x < 42; x++) {
          grid[y][x] = CLOUD_WHITE;
        }
      }
      // Left pillar
      for (let y = 25; y < 45; y++) {
        for (let x = 18; x < 20; x++) {
          grid[y][x] = CLOUD_GRAY;
        }
      }
      // Right pillar
      for (let y = 25; y < 45; y++) {
        for (let x = 30; x < 32; x++) {
          grid[y][x] = CLOUD_GRAY;
        }
      }
    },
    potX: 25,
    hint: null,
  },

  // Level 9: "Low Ceiling" — carve around the gray ceiling
  {
    drops: 3,
    lives: 3,
    dropX: 25,
    clouds: (grid: number[][]) => {
      // White cloud - FULL coverage so player can carve a path
      for (let y = 15; y < 55; y++) {
        for (let x = 10; x < 40; x++) {
          grid[y][x] = CLOUD_WHITE;
        }
      }
      // Gray ceiling in middle — must carve AROUND it (left or right)
      for (let y = 28; y < 38; y++) {
        for (let x = 18; x < 32; x++) {
          grid[y][x] = CLOUD_GRAY;
        }
      }
    },
    potX: 25,
    hint: null,
  },

  // Level 10: "Mini Maze" — scattered obstacles
  {
    drops: 4,
    lives: 3,
    dropX: 25,
    clouds: (grid: number[][]) => {
      // White cloud fills area
      for (let y = 15; y < 55; y++) {
        for (let x = 5; x < 45; x++) {
          grid[y][x] = CLOUD_WHITE;
        }
      }
      // Scattered gray blocks
      for (let y = 20; y < 25; y++) {
        for (let x = 15; x < 20; x++) {
          grid[y][x] = CLOUD_GRAY;
        }
      }
      for (let y = 30; y < 35; y++) {
        for (let x = 30; x < 35; x++) {
          grid[y][x] = CLOUD_GRAY;
        }
      }
      for (let y = 40; y < 45; y++) {
        for (let x = 20; x < 25; x++) {
          grid[y][x] = CLOUD_GRAY;
        }
      }
    },
    potX: 25,
    hint: null,
  },
];

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  size: number;
}

interface Raindrop {
  x: number;
  y: number;
  vx: number;
  vy: number;
  lastMoveTime: number;
}

interface Flower {
  x: number;
  color: string;
  growth: number; // 0 to 1
}

export default function PourGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<'start' | 'playing' | 'levelComplete' | 'gameOver' | 'win'>('start');
  const [level, setLevel] = useState(0);
  const [canvasSize, setCanvasSize] = useState({ w: 400, h: 640 });

  const gameRef = useRef({
    grid: [] as number[][],
    gridHealth: [] as number[][], // For multi-hit clouds
    raindrop: null as Raindrop | null,
    particles: [] as Particle[],
    flowers: [] as Flower[],
    collected: 0,
    lives: 3,
    dropsNeeded: 3,
    potX: 25,
    dropX: 25, // level-specific drop spawn X
    isDrawing: false,
    levelCompleteTimer: 0,
    hint: null as string | null,
    showHint: true, // fades after first swipe
    hasSwipedOnce: false,
  });

  const initLevel = useCallback((levelIndex: number) => {
    const game = gameRef.current;
    const levelData = LEVELS[levelIndex];
    
    // Reset grid
    game.grid = Array(GRID_HEIGHT).fill(null).map(() => Array(GRID_WIDTH).fill(CLOUD_EMPTY));
    game.gridHealth = Array(GRID_HEIGHT).fill(null).map(() => Array(GRID_WIDTH).fill(0));
    
    // Apply level cloud pattern
    levelData.clouds(game.grid);
    
    // Set health based on cloud type
    for (let y = 0; y < GRID_HEIGHT; y++) {
      for (let x = 0; x < GRID_WIDTH; x++) {
        if (game.grid[y][x] === CLOUD_WHITE) game.gridHealth[y][x] = 1;
        else if (game.grid[y][x] === CLOUD_GRAY) game.gridHealth[y][x] = 2;
        else if (game.grid[y][x] === CLOUD_DARK) game.gridHealth[y][x] = 999;
      }
    }
    
    game.raindrop = null;
    game.particles = [];
    game.flowers = [];
    game.collected = 0;
    game.lives = levelData.lives;
    game.dropsNeeded = levelData.drops;
    game.potX = levelData.potX;
    game.dropX = levelData.dropX ?? 25;
    game.levelCompleteTimer = 0;
    game.hint = levelData.hint ?? null;
    game.showHint = !!levelData.hint;
    game.hasSwipedOnce = false;
  }, []);

  const spawnRaindrop = useCallback(() => {
    const game = gameRef.current;
    // Spawn at level-specific X position (or slight random offset for variety)
    const baseX = game.dropX;
    const variance = game.dropsNeeded > 1 ? (Math.random() - 0.5) * 6 : 0;
    let spawnX = (baseX + variance) * CELL_SIZE;
    let spawnY = 5 * CELL_SIZE; // Start at very top
    
    // SPAWN VALIDATION: Find clear spot (no obstacles)
    const gx = Math.floor(spawnX / CELL_SIZE);
    for (let gy = 5; gy < 20; gy++) {
      if (game.grid[gy]?.[gx] === CLOUD_EMPTY || game.grid[gy]?.[gx] === undefined) {
        spawnY = gy * CELL_SIZE;
        break;
      }
    }
    
    game.raindrop = {
      x: spawnX,
      y: spawnY,
      vx: 0,
      vy: 0,
      lastMoveTime: Date.now(),
    };
  }, []);

  const carveAt = useCallback((px: number, py: number) => {
    const game = gameRef.current;
    const brushCells = Math.ceil(BRUSH_RADIUS / CELL_SIZE);
    
    let carved = false;
    
    for (let dy = -brushCells; dy <= brushCells; dy++) {
      for (let dx = -brushCells; dx <= brushCells; dx++) {
        const gx = Math.floor(px / CELL_SIZE) + dx;
        const gy = Math.floor(py / CELL_SIZE) + dy;
        
        if (gx < 0 || gx >= GRID_WIDTH || gy < 0 || gy >= GRID_HEIGHT) continue;
        
        // Check if within circular brush
        const dist = Math.sqrt(dx * dx + dy * dy) * CELL_SIZE;
        if (dist > BRUSH_RADIUS) continue;
        
        const cloudType = game.grid[gy][gx];
        // Can only carve white clouds — gray and dark are obstacles
        if (cloudType !== CLOUD_WHITE) continue;
        
        game.gridHealth[gy][gx]--;
        
        if (game.gridHealth[gy][gx] <= 0) {
          game.grid[gy][gx] = CLOUD_EMPTY;
          carved = true;
          
          // Spawn particles
          for (let i = 0; i < 3; i++) {
            game.particles.push({
              x: gx * CELL_SIZE + CELL_SIZE / 2,
              y: gy * CELL_SIZE + CELL_SIZE / 2,
              vx: (Math.random() - 0.5) * 3,
              vy: (Math.random() - 0.5) * 3 - 1,
              life: 0.5,
              color: '#FFFFFF',
              size: 4,
            });
          }
        }
      }
    }
    
    if (carved) {
      playPoof();
      // Hide hint after first successful swipe
      if (!game.hasSwipedOnce) {
        game.hasSwipedOnce = true;
        game.showHint = false;
      }
    }
  }, []);

  const startGame = useCallback(() => {
    initAudio();
    setLevel(0);
    initLevel(0);
    spawnRaindrop();
    setGameState('playing');
  }, [initLevel, spawnRaindrop]);

  const nextLevel = useCallback(() => {
    if (level + 1 >= LEVELS.length) {
      setGameState('win');
    } else {
      setLevel(level + 1);
      initLevel(level + 1);
      spawnRaindrop();
      setGameState('playing');
    }
  }, [level, initLevel, spawnRaindrop]);

  const restartLevel = useCallback(() => {
    initLevel(level);
    spawnRaindrop();
    setGameState('playing');
  }, [level, initLevel, spawnRaindrop]);

  const skipDrop = useCallback(() => {
    const game = gameRef.current;
    
    // If no active drop, just spawn one (no cost)
    if (!game.raindrop) {
      spawnRaindrop();
      return;
    }
    
    // If this would kill us, game over
    if (game.lives <= 1) {
      game.lives = 0;
      playMiss();
      setGameState('gameOver');
      return;
    }
    
    // Cost: 1 life, respawn drop
    game.lives--;
    playMiss();
    game.raindrop = null;
    setTimeout(spawnRaindrop, 300);
  }, [spawnRaindrop]);

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
    const canvas = canvasRef.current;
    if (!canvas || gameState !== 'playing') return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Calculate scale to fit grid in canvas
    const scaleX = canvasSize.w / (GRID_WIDTH * CELL_SIZE);
    const scaleY = canvasSize.h / (GRID_HEIGHT * CELL_SIZE);
    const scale = Math.min(scaleX, scaleY);
    const offsetX = (canvasSize.w - GRID_WIDTH * CELL_SIZE * scale) / 2;
    const offsetY = (canvasSize.h - GRID_HEIGHT * CELL_SIZE * scale) / 2;

    canvas.width = canvasSize.w;
    canvas.height = canvasSize.h;

    let animationId: number;
    let lastTime = 0;

    const update = (dt: number) => {
      const game = gameRef.current;

      // Update raindrop
      if (game.raindrop) {
        const drop = game.raindrop;
        const prevX = drop.x;
        const prevY = drop.y;
        
        // Apply gravity
        drop.vy += GRAVITY;
        
        // Apply velocity
        drop.x += drop.vx;
        drop.y += drop.vy;
        
        // Grid collision
        const gridX = Math.floor(drop.x / CELL_SIZE);
        const gridY = Math.floor(drop.y / CELL_SIZE);
        
        // Check collision with clouds
        if (gridY >= 0 && gridY < GRID_HEIGHT && gridX >= 0 && gridX < GRID_WIDTH) {
          if (game.grid[gridY][gridX] !== CLOUD_EMPTY) {
            // Hit cloud - try to slide
            const leftClear = gridX > 0 && game.grid[gridY][gridX - 1] === CLOUD_EMPTY;
            const rightClear = gridX < GRID_WIDTH - 1 && game.grid[gridY][gridX + 1] === CLOUD_EMPTY;
            
            if (leftClear && !rightClear) {
              drop.vx = -Math.abs(drop.vy) * 0.5;
            } else if (rightClear && !leftClear) {
              drop.vx = Math.abs(drop.vy) * 0.5;
            } else if (leftClear && rightClear) {
              drop.vx = (Math.random() > 0.5 ? 1 : -1) * Math.abs(drop.vy) * 0.3;
            }
            
            drop.vy *= -BOUNCE;
            drop.y = prevY;
            drop.vx *= SLIDE_FRICTION;
          }
        }
        
        // Check if drop moved
        if (Math.abs(drop.x - prevX) > 0.1 || Math.abs(drop.y - prevY) > 0.1) {
          drop.lastMoveTime = Date.now();
        }
        
        // Unstick if stuck too long
        if (Date.now() - drop.lastMoveTime > STUCK_THRESHOLD) {
          drop.vx += (Math.random() - 0.5) * 2;
          drop.vy += 1;
          drop.lastMoveTime = Date.now();
        }
        
        // Check pot collision (bottom of screen)
        const potLeft = (game.potX - 5) * CELL_SIZE;
        const potRight = (game.potX + 5) * CELL_SIZE;
        const potTop = (GRID_HEIGHT - 8) * CELL_SIZE;
        
        if (drop.y > potTop && drop.x > potLeft && drop.x < potRight) {
          // Collected!
          game.collected++;
          playPlink();
          
          // Splash particles
          for (let i = 0; i < 10; i++) {
            game.particles.push({
              x: drop.x,
              y: potTop,
              vx: (Math.random() - 0.5) * 4,
              vy: -Math.random() * 3 - 1,
              life: 0.6,
              color: THEME.raindrop,
              size: 5,
            });
          }
          
          game.raindrop = null;
          
          // Check win condition
          if (game.collected >= game.dropsNeeded) {
            // Level complete!
            playBloom();
            // Spawn flowers
            const flowerColors = [THEME.flower1, THEME.flower2, THEME.flower3, THEME.flower4];
            for (let i = 0; i < game.dropsNeeded; i++) {
              game.flowers.push({
                x: potLeft + (i + 0.5) * (potRight - potLeft) / game.dropsNeeded,
                color: flowerColors[i % flowerColors.length],
                growth: 0,
              });
            }
            setGameState('levelComplete');
          } else {
            // Spawn next drop
            setTimeout(spawnRaindrop, 500);
          }
        }
        
        // Check if missed (fell off sides or bottom)
        if (drop.x < 0 || drop.x > GRID_WIDTH * CELL_SIZE || drop.y > GRID_HEIGHT * CELL_SIZE) {
          game.lives--;
          playMiss();
          game.raindrop = null;
          
          if (game.lives <= 0) {
            setGameState('gameOver');
          } else {
            setTimeout(spawnRaindrop, 500);
          }
        }
      }

      // Update particles
      game.particles = game.particles.filter(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.1;
        p.life -= dt * 2;
        return p.life > 0;
      });

      // Update flowers
      game.flowers.forEach(f => {
        if (f.growth < 1) {
          f.growth = Math.min(1, f.growth + dt * 0.5);
        }
      });
    };

    const draw = () => {
      const game = gameRef.current;
      
      // Sky gradient
      const gradient = ctx.createLinearGradient(0, 0, 0, canvasSize.h);
      gradient.addColorStop(0, THEME.sky);
      gradient.addColorStop(1, THEME.skyDark);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvasSize.w, canvasSize.h);

      ctx.save();
      ctx.translate(offsetX, offsetY);
      ctx.scale(scale, scale);

      // Draw clouds
      for (let y = 0; y < GRID_HEIGHT; y++) {
        for (let x = 0; x < GRID_WIDTH; x++) {
          const cell = game.grid[y][x];
          if (cell === CLOUD_EMPTY) continue;
          
          if (cell === CLOUD_WHITE) ctx.fillStyle = THEME.cloudWhite;
          else if (cell === CLOUD_GRAY) ctx.fillStyle = THEME.cloudGray;
          else if (cell === CLOUD_DARK) ctx.fillStyle = THEME.cloudDark;
          
          ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
        }
      }

      // Draw pot
      const potLeft = (game.potX - 5) * CELL_SIZE;
      const potRight = (game.potX + 5) * CELL_SIZE;
      const potTop = (GRID_HEIGHT - 8) * CELL_SIZE;
      const potBottom = GRID_HEIGHT * CELL_SIZE;
      
      // Pot body
      ctx.fillStyle = THEME.pot;
      ctx.beginPath();
      ctx.moveTo(potLeft, potTop);
      ctx.lineTo(potLeft + 10, potBottom);
      ctx.lineTo(potRight - 10, potBottom);
      ctx.lineTo(potRight, potTop);
      ctx.closePath();
      ctx.fill();
      
      // Pot rim
      ctx.fillStyle = THEME.potDark;
      ctx.fillRect(potLeft - 5, potTop - 8, potRight - potLeft + 10, 12);
      
      // Dirt
      ctx.fillStyle = THEME.dirt;
      ctx.fillRect(potLeft + 5, potTop, potRight - potLeft - 10, 20);
      
      // Water level indicator
      const waterLevel = game.collected / game.dropsNeeded;
      ctx.fillStyle = THEME.raindrop + '80';
      ctx.fillRect(potLeft + 8, potTop + 20 - waterLevel * 15, potRight - potLeft - 16, waterLevel * 15);

      // Draw flowers
      game.flowers.forEach(f => {
        const stemHeight = 40 * f.growth;
        const flowerSize = 12 * f.growth;
        
        // Stem
        ctx.strokeStyle = THEME.stem;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(f.x, potTop);
        ctx.lineTo(f.x, potTop - stemHeight);
        ctx.stroke();
        
        // Flower
        if (f.growth > 0.3) {
          ctx.fillStyle = f.color;
          for (let i = 0; i < 5; i++) {
            const angle = (i / 5) * Math.PI * 2;
            ctx.beginPath();
            ctx.ellipse(
              f.x + Math.cos(angle) * flowerSize * 0.6,
              potTop - stemHeight + Math.sin(angle) * flowerSize * 0.6,
              flowerSize * 0.5, flowerSize * 0.3,
              angle, 0, Math.PI * 2
            );
            ctx.fill();
          }
          // Center
          ctx.fillStyle = '#FFD700';
          ctx.beginPath();
          ctx.arc(f.x, potTop - stemHeight, flowerSize * 0.3, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      // Draw raindrop
      if (game.raindrop) {
        const drop = game.raindrop;
        
        // Wobble animation
        const wobble = Math.sin(Date.now() / 100) * 2;
        
        ctx.fillStyle = THEME.raindrop;
        ctx.beginPath();
        ctx.moveTo(drop.x, drop.y - 12);
        ctx.quadraticCurveTo(drop.x + 8 + wobble, drop.y, drop.x, drop.y + 8);
        ctx.quadraticCurveTo(drop.x - 8 - wobble, drop.y, drop.x, drop.y - 12);
        ctx.fill();
        
        // Highlight
        ctx.fillStyle = '#FFFFFF80';
        ctx.beginPath();
        ctx.arc(drop.x - 2, drop.y - 4, 3, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw particles
      game.particles.forEach(p => {
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;

      ctx.restore();

      // UI
      ctx.fillStyle = THEME.text;
      ctx.font = 'bold 20px ui-monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`Level ${level + 1}`, 15, 30);
      
      ctx.textAlign = 'center';
      ctx.fillText(`${game.collected}/${game.dropsNeeded} 💧`, canvasSize.w / 2, 30);
      
      ctx.textAlign = 'right';
      ctx.fillText('❤️'.repeat(game.lives), canvasSize.w - 15, 30);

      // Hint text (fades after first swipe)
      if (game.showHint && game.hint) {
        ctx.fillStyle = THEME.text;
        ctx.font = 'bold 28px ui-monospace';
        ctx.textAlign = 'center';
        // Pulsing opacity
        const pulse = 0.7 + Math.sin(Date.now() / 300) * 0.3;
        ctx.globalAlpha = pulse;
        ctx.fillText(game.hint, canvasSize.w / 2, canvasSize.h / 2);
        ctx.globalAlpha = 1;
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

    // Input handlers
    const getPos = (e: MouseEvent | TouchEvent) => {
      const rect = canvas.getBoundingClientRect();
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      const x = (clientX - rect.left - offsetX) / scale;
      const y = (clientY - rect.top - offsetY) / scale;
      return { x, y };
    };

    const handleStart = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      gameRef.current.isDrawing = true;
      const pos = getPos(e);
      carveAt(pos.x, pos.y);
    };

    const handleMove = (e: MouseEvent | TouchEvent) => {
      if (!gameRef.current.isDrawing) return;
      e.preventDefault();
      const pos = getPos(e);
      carveAt(pos.x, pos.y);
    };

    const handleEnd = () => {
      gameRef.current.isDrawing = false;
    };

    canvas.addEventListener('mousedown', handleStart);
    canvas.addEventListener('mousemove', handleMove);
    canvas.addEventListener('mouseup', handleEnd);
    canvas.addEventListener('mouseleave', handleEnd);
    canvas.addEventListener('touchstart', handleStart, { passive: false });
    canvas.addEventListener('touchmove', handleMove, { passive: false });
    canvas.addEventListener('touchend', handleEnd);

    return () => {
      cancelAnimationFrame(animationId);
      canvas.removeEventListener('mousedown', handleStart);
      canvas.removeEventListener('mousemove', handleMove);
      canvas.removeEventListener('mouseup', handleEnd);
      canvas.removeEventListener('mouseleave', handleEnd);
      canvas.removeEventListener('touchstart', handleStart);
      canvas.removeEventListener('touchmove', handleMove);
      canvas.removeEventListener('touchend', handleEnd);
    };
  }, [gameState, canvasSize, level, carveAt, spawnRaindrop]);

  // Level complete animation
  useEffect(() => {
    if (gameState !== 'levelComplete') return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const scale = Math.min(canvasSize.w / (GRID_WIDTH * CELL_SIZE), canvasSize.h / (GRID_HEIGHT * CELL_SIZE));
    const offsetX = (canvasSize.w - GRID_WIDTH * CELL_SIZE * scale) / 2;
    const offsetY = (canvasSize.h - GRID_HEIGHT * CELL_SIZE * scale) / 2;

    let animationId: number;
    let lastTime = 0;

    const animate = (timestamp: number) => {
      const dt = (timestamp - lastTime) / 1000;
      lastTime = timestamp;
      
      const game = gameRef.current;
      
      // Update flowers
      game.flowers.forEach(f => {
        if (f.growth < 1) {
          f.growth = Math.min(1, f.growth + dt * 0.8);
        }
      });
      
      // Draw
      const gradient = ctx.createLinearGradient(0, 0, 0, canvasSize.h);
      gradient.addColorStop(0, THEME.sky);
      gradient.addColorStop(1, THEME.skyDark);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvasSize.w, canvasSize.h);

      ctx.save();
      ctx.translate(offsetX, offsetY);
      ctx.scale(scale, scale);

      // Draw pot
      const potLeft = (game.potX - 5) * CELL_SIZE;
      const potRight = (game.potX + 5) * CELL_SIZE;
      const potTop = (GRID_HEIGHT - 8) * CELL_SIZE;
      const potBottom = GRID_HEIGHT * CELL_SIZE;
      
      ctx.fillStyle = THEME.pot;
      ctx.beginPath();
      ctx.moveTo(potLeft, potTop);
      ctx.lineTo(potLeft + 10, potBottom);
      ctx.lineTo(potRight - 10, potBottom);
      ctx.lineTo(potRight, potTop);
      ctx.closePath();
      ctx.fill();
      
      ctx.fillStyle = THEME.potDark;
      ctx.fillRect(potLeft - 5, potTop - 8, potRight - potLeft + 10, 12);
      
      ctx.fillStyle = THEME.dirt;
      ctx.fillRect(potLeft + 5, potTop, potRight - potLeft - 10, 20);

      // Draw flowers
      game.flowers.forEach(f => {
        const stemHeight = 50 * f.growth;
        const flowerSize = 15 * f.growth;
        
        ctx.strokeStyle = THEME.stem;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(f.x, potTop);
        ctx.lineTo(f.x, potTop - stemHeight);
        ctx.stroke();
        
        if (f.growth > 0.3) {
          ctx.fillStyle = f.color;
          for (let i = 0; i < 5; i++) {
            const angle = (i / 5) * Math.PI * 2 + Date.now() / 2000;
            ctx.beginPath();
            ctx.ellipse(
              f.x + Math.cos(angle) * flowerSize * 0.6,
              potTop - stemHeight + Math.sin(angle) * flowerSize * 0.6,
              flowerSize * 0.5, flowerSize * 0.3,
              angle, 0, Math.PI * 2
            );
            ctx.fill();
          }
          ctx.fillStyle = '#FFD700';
          ctx.beginPath();
          ctx.arc(f.x, potTop - stemHeight, flowerSize * 0.35, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      ctx.restore();

      // Level complete text
      ctx.fillStyle = THEME.text;
      ctx.font = 'bold 36px ui-monospace';
      ctx.textAlign = 'center';
      ctx.fillText('🌸 BLOOMED! 🌸', canvasSize.w / 2, canvasSize.h / 2 - 50);
      
      ctx.font = '20px ui-monospace';
      ctx.fillText('Tap to continue', canvasSize.w / 2, canvasSize.h / 2 + 20);

      animationId = requestAnimationFrame(animate);
    };
    animationId = requestAnimationFrame(animate);

    const handleTap = () => {
      nextLevel();
    };

    canvas.addEventListener('click', handleTap);
    canvas.addEventListener('touchstart', handleTap);

    return () => {
      cancelAnimationFrame(animationId);
      canvas.removeEventListener('click', handleTap);
      canvas.removeEventListener('touchstart', handleTap);
    };
  }, [gameState, canvasSize, nextLevel]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: THEME.skyDark,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'ui-monospace, monospace',
      }}
    >
      {gameState === 'start' && (
        <div style={{ textAlign: 'center', padding: 20 }}>
          <div style={{ fontSize: 80 }}>💧</div>
          <h1 style={{ color: THEME.text, fontSize: 48, margin: '10px 0' }}>POUR</h1>
          <p style={{ color: THEME.cloudWhite, fontSize: 16, marginBottom: 30, lineHeight: 1.6 }}>
            Swipe to carve through clouds<br />
            Guide raindrops to the flower pot<br />
            Watch your garden bloom! 🌸
          </p>
          <button
            onClick={startGame}
            style={{
              background: THEME.raindrop,
              color: '#fff',
              border: 'none',
              padding: '15px 50px',
              fontSize: 20,
              fontWeight: 'bold',
              borderRadius: 30,
              cursor: 'pointer',
            }}
          >
            START
          </button>
        </div>
      )}

      {(gameState === 'playing' || gameState === 'levelComplete') && (
        <>
          <canvas
            ref={canvasRef}
            width={canvasSize.w}
            height={canvasSize.h}
            style={{ touchAction: 'none' }}
          />
          {/* Skip button - costs 1 life, always visible during play */}
          {gameState === 'playing' && (
            <button
              onClick={skipDrop}
              style={{
                position: 'absolute',
                bottom: 20,
                right: 20,
                background: 'rgba(0,0,0,0.5)',
                color: '#fff',
                border: '2px solid rgba(255,255,255,0.3)',
                padding: '10px 20px',
                fontSize: 14,
                fontWeight: 'bold',
                borderRadius: 20,
                cursor: 'pointer',
                fontFamily: 'ui-monospace, monospace',
              }}
            >
              SKIP (-1❤️)
            </button>
          )}
        </>
      )}

      {gameState === 'gameOver' && (
        <div style={{ textAlign: 'center', padding: 20 }}>
          <div style={{ fontSize: 60 }}>😢</div>
          <h1 style={{ color: THEME.text, fontSize: 36, margin: '10px 0' }}>DRIED OUT</h1>
          <p style={{ color: THEME.cloudWhite, fontSize: 16, marginBottom: 20 }}>
            Level {level + 1} - {gameRef.current.collected}/{gameRef.current.dropsNeeded} collected
          </p>
          <button
            onClick={restartLevel}
            style={{
              background: THEME.raindrop,
              color: '#fff',
              border: 'none',
              padding: '15px 40px',
              fontSize: 18,
              fontWeight: 'bold',
              borderRadius: 30,
              cursor: 'pointer',
              marginRight: 10,
            }}
          >
            TRY AGAIN
          </button>
        </div>
      )}

      {gameState === 'win' && (
        <div style={{ textAlign: 'center', padding: 20 }}>
          <div style={{ fontSize: 80 }}>🌻🌸🌷</div>
          <h1 style={{ color: THEME.text, fontSize: 36, margin: '10px 0' }}>GARDEN COMPLETE!</h1>
          <p style={{ color: THEME.cloudWhite, fontSize: 16, marginBottom: 20 }}>
            You grew all the flowers!
          </p>
          <button
            onClick={() => {
              setLevel(0);
              initLevel(0);
              spawnRaindrop();
              setGameState('playing');
            }}
            style={{
              background: THEME.raindrop,
              color: '#fff',
              border: 'none',
              padding: '15px 40px',
              fontSize: 18,
              fontWeight: 'bold',
              borderRadius: 30,
              cursor: 'pointer',
            }}
          >
            PLAY AGAIN
          </button>
        </div>
      )}
    </div>
  );
}
