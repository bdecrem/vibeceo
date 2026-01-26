'use client';

import React, { useEffect, useRef, useState } from 'react';

export default function SuperBounce() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<'playing' | 'game_over'>('playing');
  const [score, setScore] = useState(0);
  const [canvasSize, setCanvasSize] = useState({ width: 300, height: 500 });
  const [isHovering, setIsHovering] = useState(false);

  // Game physics constants
  const GRAVITY = 0.5;
  const BOUNCE_STRENGTH = -10;
  const DEFAULT_CANVAS_WIDTH = 300;
  const DEFAULT_CANVAS_HEIGHT = 500;

  // Ball properties
  const ballProperties = {
    radius: 20,
    x: DEFAULT_CANVAS_WIDTH / 2,
    y: 100,
    velocityY: 0,
    color: 'electric blue'
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let ball = { ...ballProperties };

    // Resize and scaling handling
    function handleResize() {
      const containerWidth = window.innerWidth;
      const containerHeight = window.innerHeight;
      const scaleFactor = Math.min(
        containerWidth / DEFAULT_CANVAS_WIDTH,
        containerHeight / DEFAULT_CANVAS_HEIGHT
      );

      const newWidth = DEFAULT_CANVAS_WIDTH * scaleFactor;
      const newHeight = DEFAULT_CANVAS_HEIGHT * scaleFactor;

      setCanvasSize({
        width: Math.floor(newWidth),
        height: Math.floor(newHeight)
      });

      // Scale ball position relative to canvas size
      ball.x = newWidth / 2;
      ball.radius = 20 * scaleFactor;
    }

    // Initial resize
    handleResize();
    window.addEventListener('resize', handleResize);

    function drawBall() {
      ctx.beginPath();
      ctx.fillStyle = isHovering ? 'rgba(7, 93, 255, 0.7)' : ball.color;
      ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
      ctx.fill();
    }

    function drawFloor() {
      ctx.fillStyle = 'black';
      ctx.fillRect(0, canvasSize.height - 10, canvasSize.width, 10);
    }

    function drawScore() {
      ctx.fillStyle = 'black';
      ctx.font = `${20 * (canvasSize.width / DEFAULT_CANVAS_WIDTH)}px Arial`;
      ctx.fillText(`Score: ${score}`, 10, 30);
    }

    function update() {
      // Apply gravity
      ball.velocityY += GRAVITY;
      ball.y += ball.velocityY;

      // Check floor collision
      if (ball.y + ball.radius >= canvasSize.height - 10) {
        setGameState('game_over');
        return false;
      }

      return true;
    }

    function render() {
      ctx.clearRect(0, 0, canvasSize.width, canvasSize.height);
      drawBall();
      drawFloor();
      drawScore();
    }

    function bounce(e?: Event) {
      // Prevent default to handle browser zoom/touch behavior
      e?.preventDefault();

      if (gameState === 'playing') {
        ball.velocityY = BOUNCE_STRENGTH;
        setScore(prevScore => prevScore + 1);
      } else {
        // Restart game
        ball = { ...ballProperties, x: canvasSize.width / 2 };
        setScore(0);
        setGameState('playing');
      }
    }

    function gameLoop(timestamp: number) {
      if (gameState === 'playing') {
        if (update()) {
          render();
          animationFrameId = requestAnimationFrame(gameLoop);
        }
      }
    }

    // Scoped event listeners to canvas
    const canvasEl = canvasRef.current;
    if (canvasEl) {
      canvasEl.addEventListener('click', bounce);
      canvasEl.addEventListener('touchstart', bounce, { passive: false });

      // Hover state handling
      canvasEl.addEventListener('mouseenter', () => setIsHovering(true));
      canvasEl.addEventListener('mouseleave', () => setIsHovering(false));
    }

    // Keyboard shortcut
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'KeyR') {
        bounce(e);
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    // Start game loop
    gameLoop(performance.now());

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', handleKeyDown);

      if (canvasEl) {
        canvasEl.removeEventListener('click', bounce);
        canvasEl.removeEventListener('touchstart', bounce);
        canvasEl.removeEventListener('mouseenter', () => setIsHovering(true));
        canvasEl.removeEventListener('mouseleave', () => setIsHovering(false));
      }

      cancelAnimationFrame(animationFrameId);
    };
  }, [gameState]);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      backgroundColor: '#f0f0f0'
    }}>
      <canvas
        ref={canvasRef}
        width={canvasSize.width}
        height={canvasSize.height}
        style={{
          border: '2px solid black',
          touchAction: 'manipulation',
          cursor: isHovering ? 'pointer' : 'default'
        }}
      />
      {gameState === 'game_over' && (
        <div style={{
          position: 'absolute',
          color: 'red',
          fontSize: '24px'
        }}>
          Game Over! Tap to restart
        </div>
      )}
    </div>
  );
}