'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Press_Start_2P } from 'next/font/google';

const pixelFont = Press_Start_2P({
  weight: '400',
  subsets: ['latin']
});

// Pixelpit color palette
const COLORS = {
  BACKGROUND: '#0f0f1a', // Dark Blue from design system
  TARGET_PINK: '#FF1493', // Dot's signature color
  TEXT_CYAN: '#00FFFF', // Electric Cyan for text
  BORDER_CYAN: '#00FFFF', // Electric Cyan for border
};

export default function SpeedTapGame() {
  const [gameState, setGameState] = useState<'start' | 'playing' | 'ended'>('start');
  const [targets, setTargets] = useState<number>(10);
  const [reactionTimes, setReactionTimes] = useState<number[]>([]);
  const [currentTarget, setCurrentTarget] = useState<{x: number, y: number} | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const startTimeRef = useRef<number>(0);

  const CANVAS_SIZE = 300;
  const TARGET_SIZE = 50;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas with Pixelpit background color
    ctx.fillStyle = COLORS.BACKGROUND;
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    // Pixelpit target rendering (block instead of circle)
    if (currentTarget) {
      ctx.fillStyle = COLORS.TARGET_PINK;
      ctx.fillRect(
        currentTarget.x - TARGET_SIZE / 2,
        currentTarget.y - TARGET_SIZE / 2,
        TARGET_SIZE,
        TARGET_SIZE
      );
    }
  }, [currentTarget]);

  const startGame = () => {
    setGameState('playing');
    setTargets(10);
    setReactionTimes([]);
    spawnTarget();
  };

  const spawnTarget = () => {
    if (targets <= 0) {
      endGame();
      return;
    }

    const x = Math.random() * (CANVAS_SIZE - TARGET_SIZE) + TARGET_SIZE / 2;
    const y = Math.random() * (CANVAS_SIZE - TARGET_SIZE) + TARGET_SIZE / 2;

    setCurrentTarget({ x, y });
    startTimeRef.current = Date.now();
  };

  const handleTap = (event: React.MouseEvent | React.TouchEvent) => {
    if (gameState !== 'playing' || !currentTarget) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX;
    const clientY = 'touches' in event ? event.touches[0].clientY : event.clientY;

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    const distance = Math.sqrt(
      Math.pow(x - currentTarget.x, 2) +
      Math.pow(y - currentTarget.y, 2)
    );

    if (distance <= TARGET_SIZE / 2) {
      const reactionTime = Date.now() - startTimeRef.current;
      setReactionTimes(prev => [...prev, reactionTime]);
      setTargets(prev => prev - 1);
      spawnTarget();
    }
  };

  const endGame = () => {
    setGameState('ended');
  };

  const averageReactionTime = reactionTimes.length
    ? (reactionTimes.reduce((a, b) => a + b, 0) / reactionTimes.length).toFixed(2)
    : '0';

  return (
    <div
      className={`flex flex-col items-center justify-center min-h-screen bg-[${COLORS.BACKGROUND}] ${pixelFont.className}`}
    >
      <h1
        className="text-2xl mb-4"
        style={{ color: COLORS.TEXT_CYAN }}
      >
        Speed Tap
      </h1>

      {gameState === 'start' && (
        <button
          onClick={startGame}
          className="bg-[#00FFFF] text-[#0f0f1a] px-4 py-2 rounded hover:opacity-80"
        >
          Start Game
        </button>
      )}

      {(gameState === 'playing' || gameState === 'ended') && (
        <canvas
          ref={canvasRef}
          width={CANVAS_SIZE}
          height={CANVAS_SIZE}
          onClick={handleTap}
          onTouchStart={handleTap}
          className="border-2 touch-none"
          style={{
            borderColor: COLORS.BORDER_CYAN,
            imageRendering: 'pixelated'
          }}
        />
      )}

      {gameState === 'ended' && (
        <div
          className="mt-4 text-center"
          style={{ color: COLORS.TEXT_CYAN }}
        >
          <p>Game Over!</p>
          <p>Average Reaction Time: {averageReactionTime} ms</p>
          <button
            onClick={startGame}
            className="bg-[#00FFFF] text-[#0f0f1a] px-4 py-2 rounded mt-2 hover:opacity-80"
          >
            Play Again
          </button>
        </div>
      )}
    </div>
  );
}