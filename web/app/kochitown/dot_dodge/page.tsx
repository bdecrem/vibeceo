'use client';

import React, { useRef, useEffect, useState } from 'react';

const CANVAS_WIDTH = 300;
const CANVAS_HEIGHT = 500;
const DOT_RADIUS = 20; // Increased touch target size
const OBSTACLE_WIDTH = 50;
const OBSTACLE_HEIGHT = 20;
const OBSTACLE_SPEED = 3;

interface Obstacle {
  x: number;
  y: number;
}

export default function DotDodge() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dotX, setDotX] = useState(CANVAS_WIDTH / 2);
  const [dotY, setDotY] = useState(CANVAS_HEIGHT - 50);
  const [obstacles, setObstacles] = useState<Obstacle[]>([]);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: CANVAS_WIDTH, height: CANVAS_HEIGHT });

  useEffect(() => {
    // Handle device orientation and resize
    function handleResize() {
      const isMobile = window.innerWidth < 768;
      const isLandscape = window.orientation !== 0;

      let newWidth = CANVAS_WIDTH;
      let newHeight = CANVAS_HEIGHT;

      if (isMobile) {
        // Make canvas responsive on mobile
        newWidth = Math.min(window.innerWidth - 40, CANVAS_WIDTH);
        newHeight = isLandscape ? 300 : 500;
      }

      setCanvasSize({ width: newWidth, height: newHeight });
    }

    // Initial setup and add event listeners
    handleResize();
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let lastTime = 0;
    let obstacleSpawnTimer = 0;

    function update(timestamp: number) {
      if (gameOver) return;

      const delta = timestamp - lastTime;
      lastTime = timestamp;

      // Spawn new obstacles
      obstacleSpawnTimer += delta;
      if (obstacleSpawnTimer > 1000) {
        const newObstacle: Obstacle = {
          x: Math.random() * (CANVAS_WIDTH - OBSTACLE_WIDTH),
          y: -OBSTACLE_HEIGHT
        };
        setObstacles(prev => [...prev, newObstacle]);
        obstacleSpawnTimer = 0;
      }

      // Move obstacles
      setObstacles(prev =>
        prev.map(obs => ({...obs, y: obs.y + OBSTACLE_SPEED}))
          .filter(obs => obs.y < CANVAS_HEIGHT)
      );

      // Check for collisions
      // Improved collision detection with dot radius
      const collidedObstacle = obstacles.find(
        obs =>
          dotX + DOT_RADIUS > obs.x &&
          dotX - DOT_RADIUS < obs.x + OBSTACLE_WIDTH &&
          dotY + DOT_RADIUS > obs.y &&
          dotY - DOT_RADIUS < obs.y + OBSTACLE_HEIGHT
      );

      if (collidedObstacle) {
        setGameOver(true);
      } else {
        // Increment score
        setScore(prev => prev + 1);
      }

      // Render
      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Draw dot
      ctx.fillStyle = 'blue';
      ctx.beginPath();
      ctx.arc(dotX, dotY, DOT_RADIUS, 0, Math.PI * 2);
      ctx.fill();

      // Draw obstacles
      ctx.fillStyle = 'red';
      obstacles.forEach(obs => {
        ctx.fillRect(obs.x, obs.y, OBSTACLE_WIDTH, OBSTACLE_HEIGHT);
      });

      // Draw score
      ctx.fillStyle = 'black';
      ctx.font = '20px Arial';
      ctx.fillText(`Score: ${score}`, 10, 30);

      // Game over text
      if (gameOver) {
        ctx.fillStyle = 'red';
        ctx.font = '30px Arial';
        ctx.fillText('Game Over!', CANVAS_WIDTH / 2 - 70, CANVAS_HEIGHT / 2);
      }

      if (!gameOver) {
        animationFrameId = requestAnimationFrame(update);
      }
    }

    // Start game loop
    animationFrameId = requestAnimationFrame(update);

    // Touch/mouse move handler
    function handleMove(clientX: number) {
      if (!gameOver) {
        const rect = canvas.getBoundingClientRect();
        const x = clientX - rect.left;
        // Ensure dot stays within canvas with new radius
        setDotX(Math.max(DOT_RADIUS, Math.min(x, canvasSize.width - DOT_RADIUS)));
      }
    }

    canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      handleMove(e.touches[0].clientX);
    });

    canvas.addEventListener('mousemove', (e) => {
      handleMove(e.clientX);
    });

    // Restart game handler
    function handleRestart() {
      if (gameOver) {
        setDotX(CANVAS_WIDTH / 2);
        setDotY(CANVAS_HEIGHT - 50);
        setObstacles([]);
        setScore(0);
        setGameOver(false);
        animationFrameId = requestAnimationFrame(update);
      }
    }

    canvas.addEventListener('click', handleRestart);

    // Cleanup
    return () => {
      cancelAnimationFrame(animationFrameId);
      canvas.removeEventListener('touchmove', () => {});
      canvas.removeEventListener('mousemove', () => {});
      canvas.removeEventListener('click', handleRestart);
    };
  }, [gameOver]);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      touchAction: 'none',
      userSelect: 'none',
      maxWidth: '100%',
      overflow: 'hidden'
    }}>
      <h1 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Dot Dodge</h1>
      <canvas
        ref={canvasRef}
        width={canvasSize.width}
        height={canvasSize.height}
        style={{
          border: '2px solid black',
          touchAction: 'none',
          maxWidth: '100%',
          aspectRatio: `${canvasSize.width} / ${canvasSize.height}`
        }}
      />
      <p style={{ fontSize: '0.8rem', textAlign: 'center', marginTop: '1rem' }}>
        Move to dodge falling obstacles. Tap anywhere on the screen to restart after game over.
      </p>
    </div>
  );
}