'use client';

import React, { useState, useEffect, useRef } from 'react';
import { SoundEffects } from './sounds';

export default function RunGame() {
  const [playerY, setPlayerY] = useState(200);
  const [obstacles, setObstacles] = useState<{x: number, width: number}[]>([]);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const soundEffectsRef = useRef<SoundEffects | null>(null);
  const playerWidth = 50;
  const playerHeight = 50;

  // Game loop and logic
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let obstacleSpawnTimer = 0;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    const spawnObstacle = () => {
      const newObstacle = {
        x: canvas.width,
        width: 30 + Math.random() * 50
      };
      setObstacles(prev => [...prev, newObstacle]);
    };

    const gameLoop = () => {
      if (gameOver) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw player
      ctx.fillStyle = 'hotpink';
      ctx.fillRect(50, playerY, playerWidth, playerHeight);

      // Move and draw obstacles
      setObstacles(prev =>
        prev.map(obs => ({ ...obs, x: obs.x - 5 }))
          .filter(obs => {
            // Check collision
            const playerRight = 50 + playerWidth;
            const playerBottom = playerY + playerHeight;
            const obstacleRight = obs.x + obs.width;

            const collision =
              playerRight > obs.x &&
              50 < obstacleRight &&
              playerY < canvas.height - 50 &&
              playerBottom > canvas.height - 50;

            if (collision) {
              soundEffectsRef.current?.playGameOver();
              setGameOver(true);
            }

            // Remove obstacles that are off-screen
            return obs.x + obs.width > 0;
          })
      );

      // Draw obstacles
      ctx.fillStyle = 'red';
      obstacles.forEach(obs => {
        ctx.fillRect(obs.x, canvas.height - 50, obs.width, 50);
      });

      // Spawn obstacles
      obstacleSpawnTimer++;
      if (obstacleSpawnTimer > 60) {
        spawnObstacle();
        obstacleSpawnTimer = 0;
        setScore(prev => prev + 1);
      }

      animationFrameId = requestAnimationFrame(gameLoop);
    };

    // Touch/click controls
    const handleTouch = () => {
      if (gameOver) {
        // Restart game
        soundEffectsRef.current?.playRestart();
        setPlayerY(200);
        setObstacles([]);
        setScore(0);
        setGameOver(false);
        return;
      }

      // Jump when touched
      soundEffectsRef.current?.playJump();
      const jumpHeight = 100;
      setPlayerY(prev => Math.max(0, prev - jumpHeight));
    };

    // Resize and start game
    soundEffectsRef.current = new SoundEffects();
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    canvas.addEventListener('touchstart', handleTouch);
    canvas.addEventListener('click', handleTouch);

    animationFrameId = requestAnimationFrame(gameLoop);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resizeCanvas);
      canvas.removeEventListener('touchstart', handleTouch);
      canvas.removeEventListener('click', handleTouch);
    };
  }, [gameOver]);

  return (
    <div style={{
      width: '100%',
      height: '100vh',
      margin: 0,
      overflow: 'hidden',
      backgroundColor: '#f0f0f0'
    }}>
      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          height: '100%',
          touchAction: 'none'  // Disable browser touch gestures
        }}
      />
      {gameOver && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: 'rgba(0,0,0,0.7)',
          color: 'white',
          padding: '20px',
          borderRadius: '10px',
          textAlign: 'center'
        }}>
          <h2>Game Over</h2>
          <p>Score: {score}</p>
          <button
            onClick={() => {
              soundEffectsRef.current?.playRestart();
              setPlayerY(200);
              setObstacles([]);
              setScore(0);
              setGameOver(false);
            }}
            style={{
              minWidth: '44px',
              minHeight: '44px',
              padding: '10px 20px',
              fontSize: '16px',
              backgroundColor: '#4ECDC4',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              touchAction: 'manipulation',
              userSelect: 'none'
            }}
          >
            Restart
          </button>
        </div>
      )}
      {!gameOver && (
        <div style={{
          position: 'absolute',
          top: '10px',
          left: '10px',
          color: 'black',
          fontSize: '20px'
        }}>
          Score: {score}
        </div>
      )}
    </div>
  );
}