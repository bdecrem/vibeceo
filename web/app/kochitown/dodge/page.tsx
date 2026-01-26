'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import localFont from 'next/font/local';

// Pixel font
const pressStart2P = localFont({
  src: '../../../public/fonts/PressStart2P-Regular.ttf',
  variable: '--font-press-start'
});

// Pixel color palette
const COLORS = {
  BLACK: '#0D0D0D',
  HOT_PINK: '#FF1493',
  ELECTRIC_BLUE: '#00FFFF',
  WHITE: '#FFFFFF'
};

// Game configuration
const CANVAS_WIDTH = 300;
const CANVAS_HEIGHT = 500;
const PLAYER_WIDTH = 50;
const PLAYER_HEIGHT = 50;
const DROP_WIDTH = 20;
const DROP_HEIGHT = 20;
const GAME_DURATION = 20000; // 20 seconds
const DROP_SPAWN_INTERVAL = 500; // Drops every 500ms
const DROP_SPEED = 5; // Increased drop speed for more challenge

interface Drop {
  x: number;
  y: number;
  // Add speed variation
  speed: number;
}

export default function RainDodge() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [playerX, setPlayerX] = useState(CANVAS_WIDTH / 2 - PLAYER_WIDTH / 2);
  const [drops, setDrops] = useState<Drop[]>([]);
  const [gameState, setGameState] = useState<'playing' | 'win' | 'lose'>('playing');
  const [timeRemaining, setTimeRemaining] = useState(GAME_DURATION);
  const [dropCount, setDropCount] = useState(0);

  // Pixel-art style scanline effect
  const drawScanlines = (ctx: CanvasRenderingContext2D) => {
    ctx.fillStyle = 'rgba(0,0,0,0.1)';
    for (let y = 0; y < CANVAS_HEIGHT; y += 2) {
      ctx.fillRect(0, y, CANVAS_WIDTH, 1);
    }
  };

  // Game loop and mechanics
  const gameLoop = useCallback(() => {
    if (gameState !== 'playing') return;

    // Update time remaining
    setTimeRemaining(prev => {
      if (prev <= 0) {
        setGameState('win');
        return 0;
      }
      return prev - 16; // Approximate 60fps
    });

    // Move drops down with speed variation
    setDrops(prevDrops => {
      const updatedDrops = prevDrops
        .map(drop => ({ ...drop, y: drop.y + drop.speed }))
        .filter(drop => drop.y < CANVAS_HEIGHT);

      // Check for collisions with enhanced pixel-perfect detection
      const collision = updatedDrops.some(drop =>
        drop.x < playerX + PLAYER_WIDTH &&
        drop.x + DROP_WIDTH > playerX &&
        drop.y < CANVAS_HEIGHT - PLAYER_HEIGHT &&
        drop.y + DROP_HEIGHT > CANVAS_HEIGHT - PLAYER_HEIGHT
      );

      if (collision) {
        setGameState('lose');
      }

      return updatedDrops;
    });
  }, [gameState, playerX]);

  // Spawn new drops with speed variation
  useEffect(() => {
    if (gameState !== 'playing') return;

    const dropSpawner = setInterval(() => {
      setDrops(prevDrops => [
        ...prevDrops,
        {
          x: Math.random() * (CANVAS_WIDTH - DROP_WIDTH),
          y: -DROP_HEIGHT,
          // Add speed variation for more dynamic gameplay
          speed: DROP_SPEED + Math.random() * 2
        }
      ]);

      // Track drop count for progression
      setDropCount(prev => prev + 1);
    }, DROP_SPAWN_INTERVAL);

    return () => clearInterval(dropSpawner);
  }, [gameState]);

  // Game loop
  useEffect(() => {
    const intervalId = setInterval(gameLoop, 16); // ~60fps
    return () => clearInterval(intervalId);
  }, [gameLoop]);

  // Render game on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw background with pixel-like texture
    ctx.fillStyle = COLORS.BLACK;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw player as pixel-art square
    ctx.fillStyle = COLORS.HOT_PINK;
    ctx.fillRect(playerX, CANVAS_HEIGHT - PLAYER_HEIGHT, PLAYER_WIDTH, PLAYER_HEIGHT);

    // Draw drops as pixelated squares with speed color variation
    drops.forEach(drop => {
      // Color intensity based on drop speed
      const blueIntensity = Math.min(255, drop.speed * 50);
      ctx.fillStyle = `rgb(0, ${blueIntensity}, 255)`;
      ctx.fillRect(drop.x, drop.y, DROP_WIDTH, DROP_HEIGHT);
    });

    // Draw timer and drop count with pixel font
    ctx.fillStyle = COLORS.WHITE;
    ctx.font = '16px "Press Start 2P"';
    ctx.textBaseline = 'top';
    ctx.fillText(`TIME: ${Math.ceil(timeRemaining / 1000)}s`, 10, 10);
    ctx.fillText(`DROPS: ${dropCount}`, 10, 30);

    // Add scanline effect for retro look
    drawScanlines(ctx);
  }, [playerX, drops, timeRemaining, dropCount]);

  // Handle touch/mouse movement
  const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (gameState !== 'playing') return;

    let clientX;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
    } else {
      clientX = (e as React.MouseEvent).clientX;
    }

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const newX = clientX - rect.left - PLAYER_WIDTH / 2;
    const boundedX = Math.max(0, Math.min(newX, CANVAS_WIDTH - PLAYER_WIDTH));
    setPlayerX(boundedX);
  };

  // Restart game
  const restartGame = () => {
    setPlayerX(CANVAS_WIDTH / 2 - PLAYER_WIDTH / 2);
    setDrops([]);
    setGameState('playing');
    setTimeRemaining(GAME_DURATION);
    setDropCount(0);
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        backgroundColor: COLORS.BLACK,
        fontFamily: pressStart2P.style.fontFamily
      }}
    >
      <h1 style={{ color: COLORS.HOT_PINK, fontSize: '2rem' }}>RAIN DODGE</h1>
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        onMouseMove={handleMove}
        onTouchMove={handleMove}
        style={{
          border: `4px solid ${COLORS.ELECTRIC_BLUE}`,
          imageRendering: 'pixelated',
          touchAction: 'none'
        }}
      />
      {gameState !== 'playing' && (
        <div style={{ textAlign: 'center', color: COLORS.WHITE }}>
          <h2 style={{ color: COLORS.HOT_PINK }}>
            {gameState === 'win' ? 'SURVIVE!' : 'GAME OVER'}
          </h2>
          <button
            onClick={restartGame}
            style={{
              backgroundColor: COLORS.ELECTRIC_BLUE,
              color: COLORS.BLACK,
              border: 'none',
              padding: '10px 20px',
              fontFamily: pressStart2P.style.fontFamily,
              cursor: 'pointer'
            }}
          >
            RESTART
          </button>
        </div>
      )}
    </div>
  );
}