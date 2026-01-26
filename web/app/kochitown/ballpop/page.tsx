'use client';

import React, { useRef, useEffect, useState } from 'react';

// Press Start 2P font import
import { Press_Start_2P } from 'next/font/google';

const pressStart2P = Press_Start_2P({
  weight: '400',
  subsets: ['latin']
});

interface Ball {
  x: number;
  y: number;
  radius: number;
}

export default function BallPopGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [balls, setBalls] = useState<Ball[]>([]);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(10);
  const [gameOver, setGameOver] = useState(false);

  // Pixel ball generation
  const generatePixelBall = () => {
    if (canvasRef.current) {
      const canvas = canvasRef.current;
      const radius = 30 + Math.random() * 20; // Randomize ball size
      const x = radius + Math.random() * (canvas.width - radius * 2);
      const y = radius + Math.random() * (canvas.height - radius * 2);
      return { x, y, radius };
    }
    return null;
  };

  // Render pixel art balls
  const renderPixelBalls = (ctx: CanvasRenderingContext2D) => {
    balls.forEach(ball => {
      // Hot pink color
      ctx.fillStyle = 'rgba(255, 20, 147, 0.7)';

      // 8-bit style: draw multiple small squares to create a pixelated look
      const pixelSize = ball.radius / 5;
      for (let x = -ball.radius; x < ball.radius; x += pixelSize) {
        for (let y = -ball.radius; y < ball.radius; y += pixelSize) {
          // Only draw pixels inside the ball's circular area
          if (x*x + y*y <= ball.radius*ball.radius) {
            ctx.fillRect(
              ball.x + x,
              ball.y + y,
              pixelSize,
              pixelSize
            );
          }
        }
      }
    });
  };

  // Handle canvas click
  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (gameOver) {
      // Restart game
      setBalls([]);
      setScore(0);
      setTimeLeft(10);
      setGameOver(false);
      return;
    }

    if (canvasRef.current) {
      const canvas = canvasRef.current;
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      // Check if click is inside any ball
      const hitBalls = balls.filter(ball => {
        const distance = Math.sqrt((x - ball.x)**2 + (y - ball.y)**2);
        return distance < ball.radius;
      });

      if (hitBalls.length > 0) {
        // Remove hit balls and increase score
        setBalls(prevBalls => prevBalls.filter(ball =>
          !hitBalls.includes(ball)
        ));
        setScore(prevScore => prevScore + hitBalls.length);
      }
    }
  };

  // Game loop and timer
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');

    if (!canvas || !ctx) return;

    // Set canvas to full screen
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight - 100; // Leave space for timer/score

    // Clear canvas with dark background
    ctx.fillStyle = '#0D0D0D';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Render balls
    renderPixelBalls(ctx);

    // Timer logic
    let timerId: NodeJS.Timeout;
    if (!gameOver && timeLeft > 0) {
      // Spawn new balls periodically
      const ballSpawner = setInterval(() => {
        const newBall = generatePixelBall();
        if (newBall) {
          setBalls(prevBalls => [...prevBalls, newBall]);
        }
      }, 1000); // Spawn a ball every second

      // Countdown timer
      timerId = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(ballSpawner);
            setGameOver(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    // Cleanup
    return () => {
      clearInterval(timerId);
    };
  }, [gameOver, timeLeft]);

  // Optional CRT glow effect style
  const crtGlowStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
    background: 'radial-gradient(circle, rgba(13,13,13,0.7) 0%, rgba(13,13,13,0) 70%)',
    boxShadow: 'inset 0 0 100px rgba(32, 255, 255, 0.2)', // Electric blue glow
    zIndex: 10
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      backgroundColor: '#0D0D0D',
      height: '100vh',
      color: '#20FFFF', // Electric blue text
      fontFamily: pressStart2P.style.fontFamily
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        width: '100%',
        padding: '10px'
      }}>
        <div>Time: {timeLeft}s</div>
        <div>Score: {score}</div>
      </div>

      <canvas
        ref={canvasRef}
        onClick={handleCanvasClick}
        style={{
          backgroundColor: '#0D0D0D',
          cursor: 'pointer'
        }}
      />

      {gameOver && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center'
        }}>
          <h2>Game Over!</h2>
          <p>Final Score: {score}</p>
          <p>Tap anywhere to restart</p>
        </div>
      )}

      {/* Optional CRT Glow Effect */}
      <div style={crtGlowStyle} />
    </div>
  );
}