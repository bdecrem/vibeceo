'use client';

import { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  type: 'spark' | 'ash';
}

interface Crack {
  angle: number;
  length: number;
  width: number;
  glow: number;
}

export default function EmberPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const intensityRef = useRef(0.3);
  const targetIntensityRef = useRef(0.3);
  const particlesRef = useRef<Particle[]>([]);
  const cracksRef = useRef<Crack[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Generate permanent cracks in the ember
    cracksRef.current = Array.from({ length: 5 }, () => ({
      angle: Math.random() * Math.PI * 2,
      length: 0.4 + Math.random() * 0.5,
      width: 1 + Math.random() * 2,
      glow: Math.random(),
    }));

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    let animationId: number;
    let time = 0;

    const spawnParticle = (cx: number, cy: number, intensity: number) => {
      // Sparks rise
      if (Math.random() < intensity * 0.6) {
        const angle = (Math.random() - 0.5) * 0.8;
        particlesRef.current.push({
          x: cx + (Math.random() - 0.5) * 15,
          y: cy + (Math.random() - 0.5) * 10,
          vx: Math.sin(angle) * (0.3 + Math.random() * 0.5),
          vy: -1 - Math.random() * 1.5 * intensity,
          life: 1,
          maxLife: 40 + Math.random() * 80,
          size: 1 + Math.random() * 2.5,
          type: 'spark',
        });
      }
      // Ash falls occasionally
      if (Math.random() < intensity * 0.15) {
        particlesRef.current.push({
          x: cx + (Math.random() - 0.5) * 30,
          y: cy - 10 - Math.random() * 20,
          vx: (Math.random() - 0.5) * 0.3,
          vy: 0.2 + Math.random() * 0.3,
          life: 1,
          maxLife: 100 + Math.random() * 100,
          size: 1 + Math.random() * 1.5,
          type: 'ash',
        });
      }
    };

    const animate = () => {
      time += 0.016;

      const diff = targetIntensityRef.current - intensityRef.current;
      intensityRef.current += diff * 0.025;

      if (targetIntensityRef.current > 0.3) {
        targetIntensityRef.current -= 0.0015;
      }

      const w = canvas.width;
      const h = canvas.height;
      const cx = w / 2;
      const cy = h / 2;
      const intensity = intensityRef.current;

      ctx.fillStyle = '#0A0908';
      ctx.fillRect(0, 0, w, h);

      // Organic breathing
      const pulse = Math.sin(time * 1.8) * 0.08 + Math.sin(time * 4.1) * 0.04;
      const breathe = Math.sin(time * 0.4) * 0.12;
      const flicker = Math.sin(time * 12) * 0.02 * intensity;
      const currentIntensity = Math.max(0.1, intensity + pulse + breathe * intensity + flicker);

      // Heat shimmer (subtle displacement visual)
      if (currentIntensity > 0.4) {
        const shimmerRadius = 80 + currentIntensity * 60;
        for (let i = 0; i < 8; i++) {
          const shimmerAngle = (time * 0.5 + i * 0.785) % (Math.PI * 2);
          const shimmerDist = shimmerRadius * (0.7 + Math.sin(time * 3 + i) * 0.3);
          const sx = cx + Math.cos(shimmerAngle) * shimmerDist;
          const sy = cy + Math.sin(shimmerAngle) * shimmerDist * 0.6 - 20;

          const shimmerGrad = ctx.createRadialGradient(sx, sy, 0, sx, sy, 15);
          shimmerGrad.addColorStop(0, `rgba(212, 165, 116, ${0.015 * currentIntensity})`);
          shimmerGrad.addColorStop(1, 'rgba(10, 9, 8, 0)');
          ctx.fillStyle = shimmerGrad;
          ctx.fillRect(sx - 20, sy - 20, 40, 40);
        }
      }

      // Outer glow layers
      const glowLayers = [
        { radius: 180, alpha: 0.015 },
        { radius: 120, alpha: 0.035 },
        { radius: 70, alpha: 0.08 },
        { radius: 45, alpha: 0.18 },
        { radius: 28, alpha: 0.35 },
      ];

      glowLayers.forEach(({ radius, alpha }) => {
        const r = radius * (0.85 + currentIntensity * 0.4);
        const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
        gradient.addColorStop(0, `rgba(255, 180, 100, ${alpha * currentIntensity})`);
        gradient.addColorStop(0.4, `rgba(212, 165, 116, ${alpha * currentIntensity * 0.6})`);
        gradient.addColorStop(0.7, `rgba(184, 134, 11, ${alpha * currentIntensity * 0.3})`);
        gradient.addColorStop(1, 'rgba(10, 9, 8, 0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, w, h);
      });

      // Core ember body
      const coreRadius = 18 + currentIntensity * 8;

      // Dark ember base
      ctx.fillStyle = `rgba(40, 25, 15, ${0.8})`;
      ctx.beginPath();
      ctx.arc(cx, cy, coreRadius * 1.1, 0, Math.PI * 2);
      ctx.fill();

      // Glowing core
      const coreGradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreRadius);
      coreGradient.addColorStop(0, `rgba(255, 240, 200, ${0.95 * currentIntensity + 0.05})`);
      coreGradient.addColorStop(0.25, `rgba(255, 180, 80, ${0.8 * currentIntensity + 0.1})`);
      coreGradient.addColorStop(0.5, `rgba(220, 120, 40, ${0.6 * currentIntensity + 0.05})`);
      coreGradient.addColorStop(0.75, `rgba(150, 60, 20, ${0.4 * currentIntensity})`);
      coreGradient.addColorStop(1, 'rgba(60, 20, 10, 0)');
      ctx.fillStyle = coreGradient;
      ctx.beginPath();
      ctx.arc(cx, cy, coreRadius, 0, Math.PI * 2);
      ctx.fill();

      // Glowing cracks
      cracksRef.current.forEach((crack, i) => {
        const crackGlow = 0.3 + Math.sin(time * 2 + i * 1.5) * 0.3;
        const len = coreRadius * crack.length;
        const startX = cx;
        const startY = cy;
        const endX = cx + Math.cos(crack.angle) * len;
        const endY = cy + Math.sin(crack.angle) * len;

        // Glow
        ctx.strokeStyle = `rgba(255, 200, 100, ${crackGlow * currentIntensity * 0.5})`;
        ctx.lineWidth = crack.width + 4;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.stroke();

        // Core line
        ctx.strokeStyle = `rgba(255, 240, 180, ${crackGlow * currentIntensity * 0.8})`;
        ctx.lineWidth = crack.width;
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.stroke();
      });

      // Particles
      spawnParticle(cx, cy, currentIntensity);

      particlesRef.current = particlesRef.current.filter(p => {
        // Movement with swirl
        if (p.type === 'spark') {
          p.vx += (Math.random() - 0.5) * 0.05;
          p.vy -= 0.015;
          p.x += p.vx;
          p.y += p.vy;
        } else {
          p.vx += (Math.random() - 0.5) * 0.02;
          p.x += p.vx + Math.sin(time * 3 + p.y * 0.1) * 0.3;
          p.y += p.vy;
        }
        p.life -= 1 / p.maxLife;

        if (p.life <= 0) return false;

        const alpha = p.life * (p.type === 'spark' ? 0.9 : 0.4);

        if (p.type === 'spark') {
          const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * (1 + (1 - p.life) * 0.5));
          gradient.addColorStop(0, `rgba(255, 220, 150, ${alpha * currentIntensity})`);
          gradient.addColorStop(0.5, `rgba(255, 150, 50, ${alpha * currentIntensity * 0.5})`);
          gradient.addColorStop(1, 'rgba(200, 100, 30, 0)');
          ctx.fillStyle = gradient;
        } else {
          ctx.fillStyle = `rgba(80, 70, 60, ${alpha})`;
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();

        return true;
      });

      // Inner hotspots
      if (currentIntensity > 0.4) {
        for (let i = 0; i < 2; i++) {
          const angle = time * 0.5 + i * Math.PI;
          const dist = coreRadius * 0.3 * Math.sin(time * 2 + i);
          const hx = cx + Math.cos(angle) * dist;
          const hy = cy + Math.sin(angle) * dist;

          const hotGrad = ctx.createRadialGradient(hx, hy, 0, hx, hy, 6);
          hotGrad.addColorStop(0, `rgba(255, 255, 230, ${0.4 * currentIntensity})`);
          hotGrad.addColorStop(1, 'rgba(255, 200, 100, 0)');
          ctx.fillStyle = hotGrad;
          ctx.beginPath();
          ctx.arc(hx, hy, 6, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationId);
    };
  }, []);

  const kindle = () => {
    targetIntensityRef.current = Math.min(targetIntensityRef.current + 0.35, 1);
  };

  const warmth = () => {
    targetIntensityRef.current = Math.min(targetIntensityRef.current + 0.08, 0.85);
  };

  return (
    <canvas
      ref={canvasRef}
      onClick={kindle}
      onMouseMove={warmth}
      onTouchStart={kindle}
      onTouchMove={warmth}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        cursor: 'default',
        touchAction: 'none',
      }}
    />
  );
}
