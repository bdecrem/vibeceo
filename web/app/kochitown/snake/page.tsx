'use client';

import React, { useRef, useEffect, useState } from 'react';
import { Press_Start_2P } from 'next/font/google';

// Pixel font
const pixelFont = Press_Start_2P({
  weight: '400',
  subsets: ['latin'],
});

// Dot's color palette
const COLORS = {
  BACKGROUND: '#0D0D0D',
  SNAKE: '#FF1493', // Hot Pink
  FOOD: '#00FFFF', // Electric Blue
  TEXT: '#FFFFFF', // White
  GRID: '#00FFFF33' // Electric Blue with opacity
};

// Game constants
const GRID_SIZE = 20;
const CELL_SIZE = 20;
const CANVAS_WIDTH = 300;
const CANVAS_HEIGHT = 500;

// Game state types
type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
type Point = { x: number; y: number };

export default function SnakePage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<'PLAYING' | 'GAME_OVER'>('PLAYING');
  const [score, setScore] = useState(0);

  // Game logic ref to persist between renders
  const gameLogicRef = useRef({
    snake: [{ x: 5, y: 5 }] as Point[],
    direction: 'RIGHT' as Direction,
    food: { x: 10, y: 10 } as Point,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas with black background
    ctx.fillStyle = COLORS.BACKGROUND;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw pixelated grid
    ctx.strokeStyle = COLORS.GRID;
    for (let x = 0; x < CANVAS_WIDTH; x += CELL_SIZE) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, CANVAS_HEIGHT);
      ctx.stroke();
    }
    for (let y = 0; y < CANVAS_HEIGHT; y += CELL_SIZE) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(CANVAS_WIDTH, y);
      ctx.stroke();
    }

    // Draw snake with hot pink, pixelated look
    ctx.fillStyle = COLORS.SNAKE;
    gameLogicRef.current.snake.forEach(segment => {
      ctx.fillRect(
        segment.x * CELL_SIZE + 1,
        segment.y * CELL_SIZE + 1,
        CELL_SIZE - 2,
        CELL_SIZE - 2
      );
    });

    // Draw food with electric blue
    ctx.fillStyle = COLORS.FOOD;
    ctx.fillRect(
      gameLogicRef.current.food.x * CELL_SIZE + 1,
      gameLogicRef.current.food.y * CELL_SIZE + 1,
      CELL_SIZE - 2,
      CELL_SIZE - 2
    );

    // Add CRT-like scanline effect
    ctx.fillStyle = 'rgba(0,0,0,0.1)';
    for (let y = 0; y < CANVAS_HEIGHT; y += 2) {
      ctx.fillRect(0, y, CANVAS_WIDTH, 1);
    }
  }, [gameState]);

  // Game loop and update logic
  const updateGame = () => {
    const { snake, direction, food } = gameLogicRef.current;
    const newSnake = [...snake];
    const head = { ...newSnake[0] };

    // Move snake based on current direction
    switch (direction) {
      case 'UP': head.y -= 1; break;
      case 'DOWN': head.y += 1; break;
      case 'LEFT': head.x -= 1; break;
      case 'RIGHT': head.x += 1; break;
    }

    // Check for wall collision or self-collision
    if (
      head.x < 0 || head.x >= CANVAS_WIDTH / CELL_SIZE ||
      head.y < 0 || head.y >= CANVAS_HEIGHT / CELL_SIZE ||
      newSnake.some(segment => segment.x === head.x && segment.y === head.y)
    ) {
      setGameState('GAME_OVER');
      return;
    }

    // Add new head
    newSnake.unshift(head);

    // Check for food collision
    if (head.x === food.x && head.y === food.y) {
      // Grow snake and generate new food
      setScore(prevScore => prevScore + 1);
      gameLogicRef.current.food = {
        x: Math.floor(Math.random() * (CANVAS_WIDTH / CELL_SIZE)),
        y: Math.floor(Math.random() * (CANVAS_HEIGHT / CELL_SIZE))
      };
    } else {
      // Remove tail if no food eaten
      newSnake.pop();
    }

    gameLogicRef.current.snake = newSnake;
  };

  // Touch controls
  const handleTouch = (e: React.TouchEvent) => {
    if (gameState === 'GAME_OVER') return;

    const touch = e.touches[0];
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const { direction } = gameLogicRef.current;

    // Divide canvas into two halves for left/right controls
    if (x < rect.width / 2) {
      // Left side of screen
      switch (direction) {
        case 'UP': gameLogicRef.current.direction = 'LEFT'; break;
        case 'DOWN': gameLogicRef.current.direction = 'RIGHT'; break;
        case 'LEFT': gameLogicRef.current.direction = 'DOWN'; break;
        case 'RIGHT': gameLogicRef.current.direction = 'UP'; break;
      }
    } else {
      // Right side of screen
      switch (direction) {
        case 'UP': gameLogicRef.current.direction = 'RIGHT'; break;
        case 'DOWN': gameLogicRef.current.direction = 'LEFT'; break;
        case 'LEFT': gameLogicRef.current.direction = 'UP'; break;
        case 'RIGHT': gameLogicRef.current.direction = 'DOWN'; break;
      }
    }
  };

  // Restart game
  const restartGame = () => {
    gameLogicRef.current = {
      snake: [{ x: 5, y: 5 }],
      direction: 'RIGHT',
      food: { x: 10, y: 10 }
    };
    setScore(0);
    setGameState('PLAYING');
  };

  // Game loop using requestAnimationFrame
  useEffect(() => {
    let animationFrameId: number;

    const gameLoop = () => {
      if (gameState === 'PLAYING') {
        updateGame();
      }
      animationFrameId = requestAnimationFrame(gameLoop);
    };

    animationFrameId = requestAnimationFrame(gameLoop);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [gameState]);

  return (
    <div
      onTouchStart={handleTouch}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        userSelect: 'none',
        touchAction: 'none',
        backgroundColor: COLORS.BACKGROUND,
        minHeight: '100vh',
        color: COLORS.TEXT,
        fontFamily: pixelFont.style.fontFamily
      }}
    >
      <h1 style={{
        fontSize: '2rem',
        textTransform: 'uppercase',
        letterSpacing: '2px'
      }}>Pixel Snake</h1>
      <p style={{ fontSize: '1rem' }}>Score: {score}</p>
      {gameState === 'GAME_OVER' && (
        <button
          onClick={restartGame}
          style={{
            backgroundColor: COLORS.SNAKE,
            color: COLORS.BACKGROUND,
            border: 'none',
            padding: '10px 20px',
            fontSize: '1rem',
            cursor: 'pointer',
            textTransform: 'uppercase'
          }}
        >
          Restart
        </button>
      )}
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        style={{
          border: `4px solid ${COLORS.FOOD}`,
          backgroundColor: COLORS.BACKGROUND,
          touchAction: 'none'
        }}
      />
      <p style={{
        fontSize: '0.8rem',
        marginTop: '10px',
        textTransform: 'uppercase'
      }}>
        Tap left or right to turn snake
      </p>
    </div>
  );
}