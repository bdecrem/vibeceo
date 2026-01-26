'use client';

import { useEffect, useRef, useState } from 'react';

export default function ClickerGame() {
  const [count, setCount] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleClick = () => {
    setCount(prevCount => prevCount + 1);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Responsive canvas sizing
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw count
    ctx.font = '64px Arial';
    ctx.fillStyle = 'white';
    ctx.textAlign = 'center';
    ctx.fillText(`Clicks: ${count}`, canvas.width / 2, canvas.height / 2);
  }, [count]);

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        backgroundColor: 'black',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        margin: 0,
        padding: 0,
        overflow: 'hidden'
      }}
    >
      <canvas
        ref={canvasRef}
        onClick={handleClick}
        style={{
          touchAction: 'manipulation',
          cursor: 'pointer'
        }}
      />
    </div>
  );
}