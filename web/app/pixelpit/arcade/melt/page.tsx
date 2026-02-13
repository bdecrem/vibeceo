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

// Theme (INDIE BITE - Dither spec)
const THEME = {
  bg: '#1c1917',
  lavaDark: '#ef4444',
  lavaGlow: '#f97316',
  rock: '#292524',
  rockLight: '#44403c',
  ice: '#22d3ee',
  iceHighlight: '#ffffff',
  icePickup: '#67e8f9',
  steam: '#ffffff60',
  text: '#ffffff',
  danger: '#ef4444',
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
    game.playerSize = START_SIZE;
    game.scrollY = 0;
    game.obstacles = [];
    game.icePickups = [];
    game.particles = [];
    game.score = 0;
    game.distance = 0;
    game.lastSpawnY = 0;
    game.screenShake = 0;
    game.flashRed = 0;
    
    // Initial obstacles
    spawnObstacles(GAME_HEIGHT, GAME_HEIGHT + 1500);
    
    setScore(0);
    setGameState('playing');
  }, [spawnObstacles]);

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
      
      // Scroll
      game.scrollY += SCROLL_SPEED * dt;
      game.distance += SCROLL_SPEED * dt;
      
      // Melt!
      game.playerSize -= MELT_RATE * dt;
      
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
      
      // Spawn more obstacles
      if (game.scrollY + GAME_HEIGHT > game.lastSpawnY - 500) {
        spawnObstacles(game.lastSpawnY, game.lastSpawnY + 500);
      }
      
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
            playSizzle();
            
            // Sizzle particles
            for (let i = 0; i < 8; i++) {
              game.particles.push({
                x: game.playerX,
                y: game.playerY,
                vx: (Math.random() - 0.5) * 80,
                vy: -40 - Math.random() * 40,
                life: 0.4,
                color: THEME.lavaGlow,
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
                color: THEME.icePickup,
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
      
      // Screen shake offset
      const shakeX = game.screenShake * (Math.random() - 0.5) * 10;
      const shakeY = game.screenShake * (Math.random() - 0.5) * 10;
      
      // Background
      ctx.fillStyle = THEME.bg;
      ctx.fillRect(0, 0, canvasSize.w, canvasSize.h);
      
      // Red flash on hit
      if (game.flashRed > 0) {
        ctx.fillStyle = `rgba(239, 68, 68, ${game.flashRed * 0.3})`;
        ctx.fillRect(0, 0, canvasSize.w, canvasSize.h);
      }
      
      ctx.save();
      ctx.translate(offsetX + shakeX, offsetY + shakeY);
      ctx.scale(scale, scale);
      
      // Lava veins (decorative)
      const veinOffset = (game.scrollY * 0.3) % 200;
      ctx.strokeStyle = THEME.lavaDark + '40';
      ctx.lineWidth = 3;
      for (let y = -veinOffset; y < GAME_HEIGHT + 100; y += 100) {
        ctx.beginPath();
        ctx.moveTo(50, y);
        ctx.quadraticCurveTo(100, y + 50, 50, y + 100);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(GAME_WIDTH - 50, y + 50);
        ctx.quadraticCurveTo(GAME_WIDTH - 100, y + 100, GAME_WIDTH - 50, y + 150);
        ctx.stroke();
      }
      
      // Lane dividers
      ctx.strokeStyle = THEME.rockLight + '30';
      ctx.lineWidth = 2;
      ctx.setLineDash([10, 10]);
      for (let i = 0; i < 2; i++) {
        const x = (LANES[i] + LANES[i + 1]) / 2;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, GAME_HEIGHT);
        ctx.stroke();
      }
      ctx.setLineDash([]);
      
      // Draw lava rocks
      for (const obs of game.obstacles) {
        const y = obs.y - game.scrollY;
        if (y < -50 || y > GAME_HEIGHT + 50) continue;
        
        const x = LANES[obs.lane];
        
        // Lava pool with glow
        ctx.shadowColor = THEME.lavaGlow;
        ctx.shadowBlur = 20;
        ctx.fillStyle = THEME.lavaDark;
        ctx.beginPath();
        ctx.ellipse(x, y, 35, 20, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Hot center
        ctx.fillStyle = THEME.lavaGlow;
        ctx.beginPath();
        ctx.ellipse(x, y, 20, 10, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
      
      // Draw ice pickups
      for (const ice of game.icePickups) {
        if (ice.collected) continue;
        const y = ice.y - game.scrollY;
        if (y < -50 || y > GAME_HEIGHT + 50) continue;
        
        const x = LANES[ice.lane];
        
        // Ice crystal with glow
        ctx.shadowColor = THEME.icePickup;
        ctx.shadowBlur = 15;
        ctx.fillStyle = THEME.icePickup;
        ctx.beginPath();
        ctx.moveTo(x, y - 18);
        ctx.lineTo(x + 12, y);
        ctx.lineTo(x, y + 18);
        ctx.lineTo(x - 12, y);
        ctx.closePath();
        ctx.fill();
        
        // Highlight
        ctx.fillStyle = THEME.iceHighlight + '80';
        ctx.beginPath();
        ctx.moveTo(x - 2, y - 10);
        ctx.lineTo(x + 4, y - 2);
        ctx.lineTo(x - 2, y + 2);
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
      
      // Draw player (ice cube with face)
      const size = game.playerSize;
      const x = game.playerX;
      const y = game.playerY;
      
      // Ice glow
      ctx.shadowColor = THEME.ice;
      ctx.shadowBlur = 25;
      
      // Main ice body
      ctx.fillStyle = THEME.ice;
      ctx.beginPath();
      ctx.roundRect(x - size / 2, y - size / 2, size, size, size * 0.15);
      ctx.fill();
      
      // Highlight
      ctx.fillStyle = THEME.iceHighlight + '60';
      ctx.beginPath();
      ctx.roundRect(x - size / 2 + 4, y - size / 2 + 4, size * 0.4, size * 0.3, 4);
      ctx.fill();
      
      ctx.shadowBlur = 0;
      
      // Face - worry level based on size
      const worry = 1 - (game.playerSize - MIN_SIZE) / (MAX_SIZE - MIN_SIZE);
      const eyeSize = size * 0.08;
      const eyeY = y - size * 0.1;
      const eyeSpacing = size * 0.2;
      
      // Eyes
      ctx.fillStyle = '#1c1917';
      ctx.beginPath();
      ctx.ellipse(x - eyeSpacing, eyeY, eyeSize, eyeSize * (1 + worry * 0.5), 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(x + eyeSpacing, eyeY, eyeSize, eyeSize * (1 + worry * 0.5), 0, 0, Math.PI * 2);
      ctx.fill();
      
      // Worried eyebrows when small
      if (worry > 0.3) {
        ctx.strokeStyle = '#1c1917';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x - eyeSpacing - eyeSize, eyeY - eyeSize * 2);
        ctx.lineTo(x - eyeSpacing + eyeSize, eyeY - eyeSize * 1.5 - worry * 3);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x + eyeSpacing + eyeSize, eyeY - eyeSize * 2);
        ctx.lineTo(x + eyeSpacing - eyeSize, eyeY - eyeSize * 1.5 - worry * 3);
        ctx.stroke();
      }
      
      // Mouth - more worried as smaller
      ctx.strokeStyle = '#1c1917';
      ctx.lineWidth = 2;
      ctx.beginPath();
      if (worry > 0.5) {
        // Worried frown
        ctx.arc(x, y + size * 0.25, size * 0.15, Math.PI * 0.2, Math.PI * 0.8);
      } else {
        // Slight smile
        ctx.arc(x, y + size * 0.1, size * 0.12, 0, Math.PI);
      }
      ctx.stroke();
      
      ctx.restore();
      
      // UI
      ctx.fillStyle = THEME.text;
      ctx.font = 'bold 24px ui-monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`${game.score}`, 20, 40);
      
      // Size bar
      const barWidth = 100;
      const barHeight = 12;
      const barX = canvasSize.w - barWidth - 20;
      const barY = 30;
      const sizePercent = (game.playerSize - MIN_SIZE) / (MAX_SIZE - MIN_SIZE);
      
      ctx.fillStyle = THEME.rock;
      ctx.fillRect(barX, barY, barWidth, barHeight);
      ctx.fillStyle = sizePercent > 0.3 ? THEME.ice : THEME.danger;
      ctx.fillRect(barX, barY, barWidth * sizePercent, barHeight);
      ctx.strokeStyle = THEME.text + '40';
      ctx.strokeRect(barX, barY, barWidth, barHeight);
      
      ctx.fillStyle = THEME.text;
      ctx.font = '14px ui-monospace';
      ctx.textAlign = 'right';
      ctx.fillText('🧊', barX - 5, barY + 11);
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
        <div style={{ textAlign: 'center', padding: 20 }}>
          <div style={{ fontSize: 80 }}>🧊</div>
          <h1 style={{ color: THEME.text, fontSize: 48, margin: '10px 0' }}>MELT</h1>
          <p style={{ color: THEME.ice, fontSize: 16, marginBottom: 30, lineHeight: 1.8 }}>
            Slide down the volcano! 🌋<br />
            Swipe LEFT / RIGHT to dodge<br />
            Collect ice to stay alive 🧊<br />
            <span style={{ color: THEME.lavaGlow }}>Bigger = more points!</span>
          </p>
          <button
            onClick={startGame}
            style={{
              background: THEME.ice,
              color: THEME.bg,
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
          <h1 style={{ color: THEME.text, fontSize: 36, margin: '10px 0' }}>EVAPORATED!</h1>
          <p style={{ color: THEME.ice, fontSize: 28, marginBottom: 10 }}>
            {score}
          </p>
          {score >= highScore && highScore > 0 && (
            <p style={{ color: THEME.lavaGlow, fontSize: 18, marginBottom: 10 }}>
              🎉 NEW HIGH SCORE!
            </p>
          )}
          <p style={{ color: THEME.ice, fontSize: 16, marginBottom: 30, opacity: 0.6 }}>
            Best: {highScore}
          </p>
          <button
            onClick={startGame}
            style={{
              background: THEME.ice,
              color: THEME.bg,
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
