'use client';

import React, { useState, useRef, useEffect } from 'react';

export default function WhackADot() {
  const [dots, setDots] = useState<{x: number, y: number, id: number}[]>([]);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(15);
  const [isGameActive, setIsGameActive] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameLoopRef = useRef<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const DOT_SIZE = 50;
  const DOT_DURATION = 1500; // ms a dot stays on screen
  const SPAWN_INTERVAL = 500; // ms between dot spawns
  const DOT_COLORS = ['#FF1493', '#00FFFF'];

  // Resize canvas to full window on mount
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  // Start game
  const startGame = () => {
    setScore(0);
    setTimeLeft(15);
    setIsGameActive(true);
    setDots([]);

    // Start timer
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          endGame();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Game loop for dot generation
    const spawnDots = () => {
      if (!canvasRef.current || !isGameActive) return;

      const canvas = canvasRef.current;
      const newDot = {
        x: Math.random() * (canvas.width - DOT_SIZE),
        y: Math.random() * (canvas.height - DOT_SIZE),
        id: Date.now()
      };

      setDots(prev => [...prev, newDot]);

      // Remove dot after duration
      setTimeout(() => {
        setDots(prev => prev.filter(dot => dot.id !== newDot.id));
      }, DOT_DURATION);

      // Schedule next dot spawn
      gameLoopRef.current = requestAnimationFrame(spawnDots);
    };

    // Start dot spawning
    spawnDots();
  };

  // End game
  const endGame = () => {
    setIsGameActive(false);
    if (timerRef.current) clearInterval(timerRef.current);
    if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
    setDots([]);
  };

  // Handle dot tap
  const handleTap = (event: React.MouseEvent | React.TouchEvent) => {
    if (!isGameActive) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    // Get tap coordinates
    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in event.nativeEvent
              ? (event.nativeEvent as TouchEvent).touches[0].clientX - rect.left
              : (event.nativeEvent as MouseEvent).clientX - rect.left;
    const y = 'touches' in event.nativeEvent
              ? (event.nativeEvent as TouchEvent).touches[0].clientY - rect.top
              : (event.nativeEvent as MouseEvent).clientY - rect.top;

    // Check if tap is on a dot
    const hitDot = dots.find(dot =>
      x > dot.x && x < dot.x + DOT_SIZE &&
      y > dot.y && y < dot.y + DOT_SIZE
    );

    if (hitDot) {
      setScore(prev => prev + 1);
      setDots(prev => prev.filter(dot => dot.id !== hitDot.id));
    }
  };

  // Render dots on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw dots
    dots.forEach((dot, index) => {
      ctx.fillStyle = DOT_COLORS[index % DOT_COLORS.length];
      ctx.fillRect(
        dot.x,
        dot.y,
        DOT_SIZE,
        DOT_SIZE
      );
    });

    // Display score and time
    ctx.fillStyle = '#00FFFF';
    ctx.font = '16px PressStart2P';
    ctx.fillText(`Score: ${score}`, 10, 30);
    ctx.fillText(`Time: ${timeLeft}s`, 10, 60);
  }, [dots, score, timeLeft]);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      backgroundColor: '#0D0D0D',
      margin: 0,
      padding: 0,
      overflow: 'hidden',
      fontFamily: 'PressStart2P, monospace'
    }}>
      <style jsx global>{`
        @font-face {
          font-family: 'PressStart2P';
          src: url('/app/kochitown/whack/fonts/PressStart2P.woff2') format('woff2');
        }

        @keyframes scanline {
          0% { top: 0%; }
          100% { top: 100%; }
        }

        .scanline {
          position: fixed;
          left: 0;
          width: 100%;
          height: 4px;
          background: rgba(255, 255, 255, 0.1);
          animation: scanline 2s linear infinite;
          pointer-events: none;
          z-index: 9999;
        }
      `}</style>
      <div className="scanline"></div>
      <h1 style={{ color: '#FFFFFF', fontSize: '1.5rem' }}>Whack-a-Dot</h1>
      {!isGameActive && (
        <button
          onClick={startGame}
          style={{
            fontSize: '1rem',
            padding: '10px 20px',
            margin: '20px',
            backgroundColor: '#00FFFF',
            color: '#0D0D0D',
            border: 'none',
            cursor: 'pointer'
          }}
        >
          Start Game
        </button>
      )}
      <canvas
        ref={canvasRef}
        style={{
          backgroundColor: '#0D0D0D',
          border: '2px solid #00FFFF',
          touchAction: 'none',  // Prevent default touch behaviors
          imageRendering: 'pixelated'
        }}
        onMouseDown={handleTap}
        onTouchStart={handleTap}
      />
      {!isGameActive && timeLeft === 0 && (
        <div style={{ marginTop: '20px', textAlign: 'center', color: '#FFFFFF' }}>
          <h2>Game Over!</h2>
          <p>Final Score: {score}</p>
        </div>
      )}
    </div>
  );
}