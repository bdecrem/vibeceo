'use client';

import React, { useEffect, useRef } from 'react';

// Neon Playroom style colors
const COLORS = {
  bg: '#0f172a',
  cyan: '#22d3ee',
  cyanGlow: '#67e8f9',
  cyanDark: '#0891b2',
};

// Trail point for fading effect
interface TrailPoint {
  x: number;
  y: number;
  size: number;
  alpha: number;
}

export default function WispCreature() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    // Wisp state
    const wisp = {
      x: canvas.width / 2,
      y: canvas.height / 2,
      targetX: canvas.width / 2,
      targetY: canvas.height / 2,
      size: 16,
      trail: [] as TrailPoint[],
      wanderTimer: 0,
      pulsePhase: 0,
    };

    // Pick a new random target
    const pickNewTarget = () => {
      const margin = 80;
      wisp.targetX = margin + Math.random() * (canvas.width - margin * 2);
      wisp.targetY = margin + Math.random() * (canvas.height - margin * 2);
    };

    // Animation loop
    let animationId: number;

    const loop = () => {
      // Update wander timer
      wisp.wanderTimer++;
      if (wisp.wanderTimer > 120 + Math.random() * 60) {
        pickNewTarget();
        wisp.wanderTimer = 0;
      }

      // Drift toward target with smooth easing
      const dx = wisp.targetX - wisp.x;
      const dy = wisp.targetY - wisp.y;
      wisp.x += dx * 0.02;
      wisp.y += dy * 0.02;

      // Add slight wobble
      wisp.x += Math.sin(Date.now() * 0.002) * 0.5;
      wisp.y += Math.cos(Date.now() * 0.0015) * 0.3;

      // Update pulse
      wisp.pulsePhase += 0.05;

      // Add trail point
      wisp.trail.push({
        x: wisp.x,
        y: wisp.y,
        size: wisp.size * (0.8 + Math.sin(wisp.pulsePhase) * 0.2),
        alpha: 1,
      });

      // Limit trail length
      if (wisp.trail.length > 25) {
        wisp.trail.shift();
      }

      // Fade trail points
      wisp.trail.forEach((point) => {
        point.alpha *= 0.92;
      });

      // Clear canvas
      ctx.fillStyle = COLORS.bg;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw trail (fading circles)
      wisp.trail.forEach((point, i) => {
        if (point.alpha < 0.02) return;

        const trailSize = point.size * (0.3 + (i / wisp.trail.length) * 0.7);

        // Outer glow
        ctx.beginPath();
        ctx.arc(point.x, point.y, trailSize * 1.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(34, 211, 238, ${point.alpha * 0.15})`;
        ctx.fill();

        // Core
        ctx.beginPath();
        ctx.arc(point.x, point.y, trailSize * 0.6, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(103, 232, 249, ${point.alpha * 0.4})`;
        ctx.fill();
      });

      // Draw main wisp
      const pulse = Math.sin(wisp.pulsePhase) * 0.3 + 0.7;
      const currentSize = wisp.size * (0.9 + pulse * 0.1);

      // Large outer glow
      ctx.shadowBlur = 60;
      ctx.shadowColor = COLORS.cyan;
      ctx.beginPath();
      ctx.arc(wisp.x, wisp.y, currentSize * 2, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(34, 211, 238, ${0.1 * pulse})`;
      ctx.fill();

      // Medium glow ring
      ctx.beginPath();
      ctx.arc(wisp.x, wisp.y, currentSize * 1.3, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(34, 211, 238, ${0.25 * pulse})`;
      ctx.fill();

      // Core glow
      ctx.beginPath();
      ctx.arc(wisp.x, wisp.y, currentSize * 0.8, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(103, 232, 249, ${0.6 * pulse})`;
      ctx.fill();

      // Bright center
      ctx.beginPath();
      ctx.arc(wisp.x, wisp.y, currentSize * 0.4, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${0.8 * pulse})`;
      ctx.fill();

      ctx.shadowBlur = 0;

      animationId = requestAnimationFrame(loop);
    };

    loop();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <>
      <style jsx global>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          background: ${COLORS.bg};
          overflow: hidden;
        }
      `}</style>
      <canvas
        ref={canvasRef}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
        }}
      />
      {/* Title overlay */}
      <div
        style={{
          position: 'fixed',
          bottom: 30,
          left: 0,
          right: 0,
          textAlign: 'center',
          fontFamily: 'ui-monospace, monospace',
          fontSize: 12,
          letterSpacing: 4,
          color: COLORS.cyan,
          textShadow: `0 0 20px ${COLORS.cyan}60`,
          textTransform: 'uppercase',
          opacity: 0.6,
        }}
      >
        wisp
      </div>
    </>
  );
}
