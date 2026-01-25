'use client';

import { useRef, useEffect } from 'react';

export default function BounceBall() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ballRef = useRef<{x: number, y: number, vy: number}>({
    x: 0,
    y: 0,
    vy: 0
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Resize canvas to window
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Ball properties
    const ball = ballRef.current;
    ball.x = canvas.width / 2;
    ball.y = canvas.height / 2;
    const ballRadius = 30;
    const gravity = 0.5;
    const bounceCoeff = -0.7;

    function drawBall() {
      if (!ctx) return;
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ballRadius, 0, Math.PI * 2);
      ctx.fillStyle = 'electric blue';
      ctx.fill();
      ctx.closePath();
    }

    function update() {
      if (!canvas) return;
      // Physics update
      ball.vy += gravity;
      ball.y += ball.vy;

      // Floor bounce
      if (ball.y + ballRadius > canvas.height) {
        ball.y = canvas.height - ballRadius;
        ball.vy *= bounceCoeff;
      }
    }

    function render() {
      if (!ctx || !canvas) return;
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      drawBall();
    }

    function gameLoop() {
      update();
      render();
      requestAnimationFrame(gameLoop);
    }

    // Input handlers
    function bounce() {
      ball.vy = -10; // Strong upward velocity
    }

    canvas.addEventListener('touchstart', bounce);
    canvas.addEventListener('click', bounce);
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        bounce();
      }
    });

    // Start game loop
    gameLoop();

    // Cleanup
    return () => {
      canvas.removeEventListener('touchstart', bounce);
      canvas.removeEventListener('click', bounce);
      window.removeEventListener('keydown', (e) => {
        if (e.code === 'Space') bounce();
      });
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: 'black'
      }}
    />
  );
}