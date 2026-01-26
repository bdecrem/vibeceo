'use client';

import React, { useEffect, useRef } from 'react';

export default function HelloWorld() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas to full window size
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Clear canvas
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw Hello World
    ctx.fillStyle = 'white';
    ctx.font = '48px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Hello World', canvas.width / 2, canvas.height / 2);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{position: 'fixed', top: 0, left: 0, width: '100%', height: '100%'}}
    />
  );
}