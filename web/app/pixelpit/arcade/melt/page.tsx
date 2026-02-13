'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';

// Game settings
const GAME_WIDTH = 400;
const GAME_HEIGHT = 700;
const MELT_RATE = 0.3; // Size lost per second
const MIN_SIZE = 15;
const MAX_SIZE = 80;
const START_SIZE = 40;
const SCROLL_SPEED = 120; // pixels per second
const PLAYER_SPEED = 250;

// Theme (volcanic)
const THEME = {
  bg1: '#1a0a0a',
  bg2: '#2d1810',
  lava: '#ff4500',
  lavaGlow: '#ff6b35',
  rock: '#3d3d3d',
  rockLight: '#5a5a5a',
  ice: '#a8e6ff',
  iceCore: '#e0f7ff',
  icePickup: '#40c4ff',
  steam: '#ffffff80',
  text: '#ffffff',
};

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  size: number;
}

interface Obstacle {
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'rock' | 'lava';
}

interface IcePickup {
  x: number;
  y: number;
  size: number;
  collected: boolean;
}

// Audio
let audioCtx: AudioContext | null = null;

function initAudio() {
  if (audioCtx) return;
  audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  if (audioCtx.state === 'suspended') audioCtx.resume();
}

function playCollect() {
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(800, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.1);
  gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.15);
}

function playHit() {
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(200, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(80, audioCtx.currentTime + 0.2);
  gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.2);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.2);
}

function playMelt() {
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(400, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(200, audioCtx.currentTime + 0.3);
  gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.3);
}

export default function MeltGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<'start' | 'playing' | 'gameOver'>('start');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [canvasSize, setCanvasSize] = useState({ w: GAME_WIDTH, h: GAME_HEIGHT });

  const gameRef = useRef({
    playerX: GAME_WIDTH / 2,
    playerY: GAME_HEIGHT * 0.7,
    playerSize: START_SIZE,
    targetX: GAME_WIDTH / 2,
    scrollY: 0,
    obstacles: [] as Obstacle[],
    icePickups: [] as IcePickup[],
    particles: [] as Particle[],
    score: 0,
    distance: 0,
    lastSpawnY: 0,
    isDragging: false,
  });

  const spawnObstacles = useCallback((startY: number, endY: number) => {
    const game = gameRef.current;
    const spacing = 150;
    
    for (let y = startY; y < endY; y += spacing) {
      // Spawn 1-3 obstacles per row
      const count = 1 + Math.floor(Math.random() * 2);
      const usedX: number[] = [];
      
      for (let i = 0; i < count; i++) {
        let x: number;
        let attempts = 0;
        do {
          x = 30 + Math.random() * (GAME_WIDTH - 100);
          attempts++;
        } while (usedX.some(ux => Math.abs(ux - x) < 80) && attempts < 10);
        
        usedX.push(x);
        
        const isLava = Math.random() < 0.3;
        game.obstacles.push({
          x,
          y: y + (Math.random() - 0.5) * 40,
          width: 40 + Math.random() * 40,
          height: isLava ? 15 : 25 + Math.random() * 20,
          type: isLava ? 'lava' : 'rock',
        });
      }
      
      // Spawn ice pickup (30% chance)
      if (Math.random() < 0.3) {
        let iceX = 40 + Math.random() * (GAME_WIDTH - 80);
        // Avoid obstacles
        while (usedX.some(ux => Math.abs(ux - iceX) < 60)) {
          iceX = 40 + Math.random() * (GAME_WIDTH - 80);
        }
        game.icePickups.push({
          x: iceX,
          y: y + 50,
          size: 15 + Math.random() * 10,
          collected: false,
        });
      }
    }
    game.lastSpawnY = endY;
  }, []);

  const startGame = useCallback(() => {
    initAudio();
    const game = gameRef.current;
    game.playerX = GAME_WIDTH / 2;
    game.playerY = GAME_HEIGHT * 0.7;
    game.playerSize = START_SIZE;
    game.targetX = GAME_WIDTH / 2;
    game.scrollY = 0;
    game.obstacles = [];
    game.icePickups = [];
    game.particles = [];
    game.score = 0;
    game.distance = 0;
    game.lastSpawnY = 0;
    
    // Initial obstacles
    spawnObstacles(GAME_HEIGHT, GAME_HEIGHT + 1000);
    
    setScore(0);
    setGameState('playing');
  }, [spawnObstacles]);

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
      
      // Scroll (ice slides down volcano)
      game.scrollY += SCROLL_SPEED * dt;
      game.distance += SCROLL_SPEED * dt;
      
      // Melt!
      game.playerSize -= MELT_RATE * dt;
      
      // Check if melted completely
      if (game.playerSize <= MIN_SIZE) {
        playMelt();
        setHighScore(h => Math.max(h, game.score));
        setGameState('gameOver');
        return;
      }
      
      // Move player toward target
      const dx = game.targetX - game.playerX;
      game.playerX += dx * 8 * dt;
      
      // Clamp to screen
      const halfSize = game.playerSize / 2;
      game.playerX = Math.max(halfSize, Math.min(GAME_WIDTH - halfSize, game.playerX));
      
      // Spawn more obstacles as we scroll
      if (game.scrollY + GAME_HEIGHT > game.lastSpawnY - 500) {
        spawnObstacles(game.lastSpawnY, game.lastSpawnY + 500);
      }
      
      // Check collisions with obstacles
      const playerTop = game.playerY - halfSize;
      const playerBottom = game.playerY + halfSize;
      const playerLeft = game.playerX - halfSize;
      const playerRight = game.playerX + halfSize;
      
      for (const obs of game.obstacles) {
        const obsY = obs.y - game.scrollY;
        if (obsY < -100 || obsY > GAME_HEIGHT + 100) continue;
        
        const obsLeft = obs.x - obs.width / 2;
        const obsRight = obs.x + obs.width / 2;
        const obsTop = obsY - obs.height / 2;
        const obsBottom = obsY + obs.height / 2;
        
        // AABB collision
        if (playerRight > obsLeft && playerLeft < obsRight &&
            playerBottom > obsTop && playerTop < obsBottom) {
          if (obs.type === 'lava') {
            // Lava = instant big melt
            game.playerSize -= 15;
            playHit();
            // Particles
            for (let i = 0; i < 10; i++) {
              game.particles.push({
                x: game.playerX,
                y: game.playerY,
                vx: (Math.random() - 0.5) * 100,
                vy: (Math.random() - 0.5) * 100 - 50,
                life: 0.5,
                color: THEME.steam,
                size: 8,
              });
            }
          } else {
            // Rock = push and shrink a bit
            game.playerSize -= 3;
            playHit();
            // Push away from obstacle center
            if (game.playerX < obs.x) {
              game.playerX = obsLeft - halfSize;
              game.targetX = game.playerX;
            } else {
              game.playerX = obsRight + halfSize;
              game.targetX = game.playerX;
            }
          }
        }
      }
      
      // Check ice pickups
      for (const ice of game.icePickups) {
        if (ice.collected) continue;
        const iceY = ice.y - game.scrollY;
        if (iceY < -50 || iceY > GAME_HEIGHT + 50) continue;
        
        const dist = Math.sqrt((game.playerX - ice.x) ** 2 + (game.playerY - iceY) ** 2);
        if (dist < halfSize + ice.size) {
          ice.collected = true;
          game.playerSize = Math.min(MAX_SIZE, game.playerSize + ice.size);
          game.score += Math.floor(ice.size * 10);
          setScore(game.score);
          playCollect();
          
          // Sparkle particles
          for (let i = 0; i < 8; i++) {
            game.particles.push({
              x: ice.x,
              y: iceY,
              vx: (Math.random() - 0.5) * 80,
              vy: (Math.random() - 0.5) * 80,
              life: 0.4,
              color: THEME.icePickup,
              size: 5,
            });
          }
        }
      }
      
      // Score based on distance + size bonus
      const sizeBonus = Math.floor((game.playerSize - MIN_SIZE) / 10);
      game.score = Math.floor(game.distance / 10) + sizeBonus * 50;
      setScore(game.score);
      
      // Update particles
      game.particles = game.particles.filter(p => {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.life -= dt * 2;
        return p.life > 0;
      });
      
      // Cleanup old obstacles/pickups
      game.obstacles = game.obstacles.filter(o => o.y - game.scrollY > -200);
      game.icePickups = game.icePickups.filter(i => i.y - game.scrollY > -100 && !i.collected);
    };

    const draw = () => {
      const game = gameRef.current;
      
      // Background gradient (volcanic)
      const gradient = ctx.createLinearGradient(0, 0, 0, canvasSize.h);
      gradient.addColorStop(0, THEME.bg1);
      gradient.addColorStop(1, THEME.bg2);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvasSize.w, canvasSize.h);
      
      ctx.save();
      ctx.translate(offsetX, offsetY);
      ctx.scale(scale, scale);
      
      // Volcanic side walls
      ctx.fillStyle = THEME.rock;
      ctx.fillRect(0, 0, 20, GAME_HEIGHT);
      ctx.fillRect(GAME_WIDTH - 20, 0, 20, GAME_HEIGHT);
      
      // Lava glow at edges
      const edgeGlow = ctx.createLinearGradient(0, 0, 30, 0);
      edgeGlow.addColorStop(0, THEME.lavaGlow + '40');
      edgeGlow.addColorStop(1, 'transparent');
      ctx.fillStyle = edgeGlow;
      ctx.fillRect(0, 0, 30, GAME_HEIGHT);
      
      const edgeGlow2 = ctx.createLinearGradient(GAME_WIDTH, 0, GAME_WIDTH - 30, 0);
      edgeGlow2.addColorStop(0, THEME.lavaGlow + '40');
      edgeGlow2.addColorStop(1, 'transparent');
      ctx.fillStyle = edgeGlow2;
      ctx.fillRect(GAME_WIDTH - 30, 0, 30, GAME_HEIGHT);
      
      // Draw obstacles
      for (const obs of game.obstacles) {
        const y = obs.y - game.scrollY;
        if (y < -100 || y > GAME_HEIGHT + 100) continue;
        
        if (obs.type === 'lava') {
          // Lava pool
          ctx.fillStyle = THEME.lava;
          ctx.shadowColor = THEME.lavaGlow;
          ctx.shadowBlur = 15;
          ctx.beginPath();
          ctx.ellipse(obs.x, y, obs.width / 2, obs.height / 2, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        } else {
          // Rock
          ctx.fillStyle = THEME.rock;
          ctx.beginPath();
          ctx.roundRect(obs.x - obs.width / 2, y - obs.height / 2, obs.width, obs.height, 8);
          ctx.fill();
          ctx.fillStyle = THEME.rockLight;
          ctx.beginPath();
          ctx.roundRect(obs.x - obs.width / 2 + 4, y - obs.height / 2 + 4, obs.width - 16, obs.height / 3, 4);
          ctx.fill();
        }
      }
      
      // Draw ice pickups
      for (const ice of game.icePickups) {
        if (ice.collected) continue;
        const y = ice.y - game.scrollY;
        if (y < -50 || y > GAME_HEIGHT + 50) continue;
        
        // Ice crystal
        ctx.fillStyle = THEME.icePickup;
        ctx.shadowColor = THEME.icePickup;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.moveTo(ice.x, y - ice.size);
        ctx.lineTo(ice.x + ice.size * 0.7, y);
        ctx.lineTo(ice.x, y + ice.size);
        ctx.lineTo(ice.x - ice.size * 0.7, y);
        ctx.closePath();
        ctx.fill();
        ctx.shadowBlur = 0;
      }
      
      // Draw particles
      for (const p of game.particles) {
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      
      // Draw player (ice cube)
      const size = game.playerSize;
      const x = game.playerX;
      const y = game.playerY;
      
      // Ice glow
      ctx.shadowColor = THEME.ice;
      ctx.shadowBlur = 20;
      
      // Main ice body
      ctx.fillStyle = THEME.ice;
      ctx.beginPath();
      ctx.roundRect(x - size / 2, y - size / 2, size, size, size * 0.2);
      ctx.fill();
      
      // Ice core (lighter)
      ctx.fillStyle = THEME.iceCore;
      ctx.beginPath();
      ctx.roundRect(x - size / 3, y - size / 3, size * 0.5, size * 0.5, size * 0.1);
      ctx.fill();
      
      // Shine
      ctx.fillStyle = '#ffffff80';
      ctx.beginPath();
      ctx.ellipse(x - size / 4, y - size / 4, size / 6, size / 8, -0.5, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.shadowBlur = 0;
      
      ctx.restore();
      
      // UI
      ctx.fillStyle = THEME.text;
      ctx.font = 'bold 24px ui-monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`Score: ${game.score}`, 15, 35);
      
      ctx.textAlign = 'right';
      // Size indicator
      const sizePercent = Math.floor(((game.playerSize - MIN_SIZE) / (MAX_SIZE - MIN_SIZE)) * 100);
      ctx.fillText(`🧊 ${sizePercent}%`, canvasSize.w - 15, 35);
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
    const getX = (e: MouseEvent | TouchEvent) => {
      const rect = canvas.getBoundingClientRect();
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      return (clientX - rect.left - offsetX) / scale;
    };

    const handleStart = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      gameRef.current.isDragging = true;
      gameRef.current.targetX = getX(e);
    };

    const handleMove = (e: MouseEvent | TouchEvent) => {
      if (!gameRef.current.isDragging) return;
      e.preventDefault();
      gameRef.current.targetX = getX(e);
    };

    const handleEnd = () => {
      gameRef.current.isDragging = false;
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
  }, [gameState, canvasSize, spawnObstacles]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: THEME.bg1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'ui-monospace, monospace',
      }}
    >
      {gameState === 'start' && (
        <div style={{ textAlign: 'center', padding: 20 }}>
          <div style={{ fontSize: 80 }}>🧊</div>
          <h1 style={{ color: THEME.text, fontSize: 48, margin: '10px 0' }}>MELT</h1>
          <p style={{ color: THEME.ice, fontSize: 16, marginBottom: 30, lineHeight: 1.6 }}>
            Slide down the volcano!<br />
            Collect ice to grow 🧊<br />
            Avoid rocks and lava 🌋<br />
            Bigger = more points!
          </p>
          <button
            onClick={startGame}
            style={{
              background: THEME.ice,
              color: THEME.bg1,
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

      {gameState === 'playing' && (
        <canvas
          ref={canvasRef}
          width={canvasSize.w}
          height={canvasSize.h}
          style={{ touchAction: 'none' }}
        />
      )}

      {gameState === 'gameOver' && (
        <div style={{ textAlign: 'center', padding: 20 }}>
          <div style={{ fontSize: 60 }}>💧</div>
          <h1 style={{ color: THEME.text, fontSize: 36, margin: '10px 0' }}>MELTED!</h1>
          <p style={{ color: THEME.ice, fontSize: 24, marginBottom: 10 }}>
            Score: {score}
          </p>
          {score >= highScore && highScore > 0 && (
            <p style={{ color: THEME.lava, fontSize: 18, marginBottom: 10 }}>
              🎉 NEW HIGH SCORE!
            </p>
          )}
          <p style={{ color: THEME.ice, fontSize: 16, marginBottom: 30, opacity: 0.7 }}>
            Best: {highScore}
          </p>
          <button
            onClick={startGame}
            style={{
              background: THEME.ice,
              color: THEME.bg1,
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
