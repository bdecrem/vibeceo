'use client';

import React, { useState, useRef, useEffect } from 'react';
import Script from 'next/script';
import {
  ScoreFlow,
  Leaderboard,
  ShareButtonContainer,
  type ScoreFlowColors
} from '@/app/pixelpit/components';
import { Press_Start_2P } from 'next/font/google';

const pixelFont = Press_Start_2P({
  weight: '400',
  subsets: ['latin']
});

// Game Colors
const GAME_COLORS: ScoreFlowColors = {
  bg: '#0f172a',        // deep space blue
  surface: '#1e293b',   // dark slate
  primary: '#fbbf24',   // golden yellow
  secondary: '#22d3ee', // bright cyan
  text: '#f8fafc',      // almost white
  muted: '#94a3b8',     // slate gray
  error: '#f87171',     // soft red
};

export default function BoostGame() {
  // Game State
  const [gameState, setGameState] = useState<'start' | 'playing' | 'gameover'>('start');
  const [score, setScore] = useState(0);
  const [multiplier, setMultiplier] = useState(1);
  const [socialLoaded, setSocialLoaded] = useState(false);
  const [submittedEntryId, setSubmittedEntryId] = useState<number | null>(null);

  // Canvas and Game Logic
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<{
    gates: Array<{x: number, y: number, width: number}>,
    playerX: number,
    scrollSpeed: number,
    difficulty: number
  }>({
    gates: [],
    playerX: 0,
    scrollSpeed: 2,
    difficulty: 1
  });

  // Initialize game
  const initGame = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Reset game state
    setScore(0);
    setMultiplier(1);
    setGameState('playing');

    // Setup initial game state
    const centerX = canvas.width / 2;
    gameRef.current = {
      gates: [
        { x: centerX - 50, y: canvas.height, width: 100 },
        { x: centerX - 40, y: canvas.height + 200, width: 80 },
        { x: centerX - 30, y: canvas.height + 400, width: 60 }
      ],
      playerX: centerX,
      scrollSpeed: 2,
      difficulty: 1
    };

    gameLoop(performance.now());
  };

  // Game loop
  const gameLoop = (timestamp: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Update game state
    const game = gameRef.current;

    // Move gates down (player perspective of scrolling up)
    game.gates.forEach(gate => {
      gate.y -= game.scrollSpeed;

      // Remove gates that are off screen
      if (gate.y < -100) {
        game.gates.shift();

        // Add new gate with increasing difficulty
        const centerX = canvas.width / 2;
        game.gates.push({
          x: centerX - (50 - game.difficulty * 5),
          y: canvas.height + 400,
          width: 100 - game.difficulty * 5
        });

        // Increase score and difficulty
        setScore(prev => prev + 10 * multiplier);
        gameRef.current.scrollSpeed += 0.1;
        gameRef.current.difficulty += 0.1;
      }
    });

    // Draw gates
    ctx.fillStyle = GAME_COLORS.primary;
    game.gates.forEach(gate => {
      ctx.fillRect(gate.x, gate.y, gate.width, 20);
    });

    // Continue game loop if still playing
    if (gameState === 'playing') {
      requestAnimationFrame(gameLoop);
    }
  };

  // Handle touch/click
  const handleTouch = () => {
    if (gameState !== 'playing') {
      initGame();
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const game = gameRef.current;
    const centerGate = game.gates[0];

    // Check if player hit the gate perfectly
    const gateCenter = centerGate.x + centerGate.width / 2;
    const playerTouchX = canvas.width / 2;

    if (Math.abs(playerTouchX - gateCenter) < 10) {
      // Perfect hit - double multiplier
      setMultiplier(prev => Math.min(prev * 2, 16));
    } else if (Math.abs(playerTouchX - gateCenter) > centerGate.width / 2) {
      // Miss - reset multiplier
      setMultiplier(1);
    }
  };

  // Render game or UI
  return (
    <div
      style={{
        backgroundColor: GAME_COLORS.bg,
        color: GAME_COLORS.text,
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center'
      }}
      className={pixelFont.className}
    >
      <Script
        src="/pixelpit/social.js"
        onLoad={() => setSocialLoaded(true)}
      />

      {/* Game Canvas */}
      <canvas
        ref={canvasRef}
        width={400}
        height={600}
        onClick={handleTouch}
        onTouchStart={handleTouch}
        style={{
          backgroundColor: GAME_COLORS.surface,
          touchAction: 'manipulation'
        }}
      />

      {/* Game Info */}
      <div style={{
        position: 'absolute',
        top: '20px',
        display: 'flex',
        justifyContent: 'space-between',
        width: '90%'
      }}>
        <div>Score: {score}</div>
        <div>Multiplier: {multiplier}×</div>
      </div>

      {/* Game Over UI */}
      {gameState === 'gameover' && (
        <div style={{
          position: 'absolute',
          top: '50%',
          transform: 'translateY(-50%)',
          textAlign: 'center'
        }}>
          <h2>Game Over</h2>
          <ScoreFlow
            score={score}
            gameId="boost"
            colors={GAME_COLORS}
            onRankReceived={(rank, entryId) => setSubmittedEntryId(entryId ?? null)}
          />
          <ShareButtonContainer
            id="share-btn"
            url={`${typeof window !== 'undefined' ? window.location.origin : ''}/pixelpit/arcade/boost/share/${score}`}
            text={`I scored ${score} on BOOST!`}
            socialLoaded={socialLoaded}
          />
        </div>
      )}

      {/* Leaderboard */}
      {submittedEntryId && (
        <Leaderboard
          gameId="boost"
          limit={8}
          entryId={submittedEntryId}
          colors={GAME_COLORS}
          onClose={() => setGameState('gameover')}
        />
      )}

      {/* Start Screen */}
      {gameState === 'start' && (
        <div style={{
          position: 'absolute',
          textAlign: 'center'
        }}>
          <h1>BOOST</h1>
          <p>Tap to hit gates perfectly. Higher multipliers!</p>
          <button
            onClick={initGame}
            style={{
              backgroundColor: GAME_COLORS.primary,
              color: GAME_COLORS.bg,
              border: 'none',
              padding: '10px 20px',
              borderRadius: '5px'
            }}
          >
            START
          </button>
        </div>
      )}
    </div>
  );
}