import React, { useEffect, useRef, useCallback } from 'react';

const PixelPitHero = () => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const mouseRef = useRef({ x: -9999, y: -9999 });
  const mouseActiveRef = useRef(0);
  const voxelsRef = useRef([]);
  const trailsRef = useRef([]);
  const lastPulseRef = useRef(0);
  const lastInteractionRef = useRef(0);

  const colors = [
    { base: '#db2777', hi: '#f472b6', top: '#f9a8d4' },
    { base: '#0891b2', hi: '#22d3ee', top: '#67e8f9' },
    { base: '#eab308', hi: '#facc15', top: '#fde68a' },
    { base: '#65a30d', hi: '#84cc16', top: '#bef264' },
    { base: '#7c3aed', hi: '#8b5cf6', top: '#c4b5fd' },
    { base: '#dc2626', hi: '#ef4444', top: '#fca5a5' },
    { base: '#c2410c', hi: '#ea580c', top: '#fdba74' },
    { base: '#0369a1', hi: '#0284c7', top: '#7dd3fc' },
  ];

  const icons = ['★', '◆', '●', '▲', '■', '♦', '♥', '✦'];

  const initVoxels = useCallback((w, h) => {
    const cx = w / 2;
    const cy = h / 2;
    const voxels = [];

    const pShape = [
      [0,0],[0,1],[0,2],[0,3],[0,4],[0,5],[0,6],[0,7],
      [1,0],[1,1],[1,2],[1,3],[1,4],[1,5],[1,6],[1,7],
      [2,0],[3,0],[4,0],[5,0],
      [2,1],[3,1],[4,1],[5,1],
      [5,2],[5,3],
      [2,3],[3,3],[4,3],[5,3],
      [2,4],
    ];

    const tileSize = Math.max(14, Math.min(26, h / 16));
    const pOffX = cx - 3.8 * tileSize;
    const pOffY = cy - 4 * tileSize;

    pShape.forEach(([col, row], i) => {
      voxels.push({
        homeX: pOffX + col * tileSize,
        homeY: pOffY + row * tileSize,
        x: pOffX + col * tileSize,
        y: pOffY + row * tileSize,
        vx: 0, vy: 0,
        size: tileSize - 2,
        color: colors[i % colors.length],
        icon: icons[i % icons.length],
        angle: 0, angVel: 0,
        isP: true,
        phase: Math.random() * Math.PI * 2,
        breathe: 0.3 + Math.random() * 0.4,
        opacity: 1,
      });
    });

    // Three orbital rings — inner bright, outer faint
    const rings = [
      { count: 12, minDist: 0.12, maxDist: 0.18, minSize: 8, maxSize: 14, speed: [0.003, 0.007], opRange: [0.7, 1] },
      { count: 18, minDist: 0.2, maxDist: 0.35, minSize: 5, maxSize: 12, speed: [0.001, 0.004], opRange: [0.45, 0.7] },
      { count: 24, minDist: 0.38, maxDist: 0.48, minSize: 3, maxSize: 8, speed: [0.0005, 0.002], opRange: [0.2, 0.4] },
    ];

    rings.forEach((ring) => {
      for (let i = 0; i < ring.count; i++) {
        const angle = (i / ring.count) * Math.PI * 2 + Math.random() * 0.5;
        const distFrac = ring.minDist + Math.random() * (ring.maxDist - ring.minDist);
        const distX = w * distFrac;
        const distY = h * distFrac * 0.9;
        const size = ring.minSize + Math.random() * (ring.maxSize - ring.minSize);

        voxels.push({
          x: cx + Math.cos(angle) * distX,
          y: cy + Math.sin(angle) * distY,
          vx: 0, vy: 0,
          size,
          color: colors[Math.floor(Math.random() * colors.length)],
          icon: icons[Math.floor(Math.random() * icons.length)],
          angle: Math.random() * 45 - 22,
          angVel: (Math.random() - 0.5) * 0.2,
          isP: false,
          orbitAngle: angle,
          orbitDistX: distX,
          orbitDistY: distY,
          orbitSpeed: ring.speed[0] + Math.random() * (ring.speed[1] - ring.speed[0]),
          phase: Math.random() * Math.PI * 2,
          breathe: 0.15 + Math.random() * 0.25,
          opacity: ring.opRange[0] + Math.random() * (ring.opRange[1] - ring.opRange[0]),
        });
      }
    });

    return voxels;
  }, []);

  const drawVoxel = useCallback((ctx, v, time) => {
    const breath = Math.sin(time * 1.5 + v.phase) * v.breathe;
    const s = v.size + breath;

    ctx.save();
    ctx.globalAlpha = v.opacity;
    ctx.translate(v.x, v.y);
    ctx.rotate((v.angle * Math.PI) / 180);

    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(3, 3, s, s);

    ctx.fillStyle = v.color.base;
    ctx.fillRect(0, 0, s, s);

    ctx.fillStyle = v.color.top;
    ctx.fillRect(0, 0, s, s * 0.25);

    ctx.fillStyle = v.color.hi;
    ctx.fillRect(0, 0, s * 0.22, s);

    ctx.fillStyle = v.color.top;
    ctx.fillRect(0, 0, s * 0.22, s * 0.25);

    if (s > 12) {
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.font = `bold ${Math.floor(s * 0.5)}px monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(v.icon, s / 2, s / 2 + 1);
    }

    ctx.restore();
  }, []);

  const drawSparkle = useCallback((ctx, x, y, size, opacity) => {
    ctx.fillStyle = `rgba(255,255,255,${opacity})`;
    ctx.fillRect(x - 1, y - size / 2, 2, size);
    ctx.fillRect(x - size / 2, y - 1, size, 2);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;

    const resize = () => {
      const rect = container.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      voxelsRef.current = initVoxels(w, h);
    };

    resize();
    window.addEventListener('resize', resize);

    const getPos = (e, rect) => ({ x: e.clientX - rect.left, y: e.clientY - rect.top });

    const handleMouse = (e) => { mouseRef.current = getPos(e, canvas.getBoundingClientRect()); mouseActiveRef.current = 1; lastInteractionRef.current = Date.now(); };
    const handleMouseLeave = () => { mouseActiveRef.current = 0; };
    const handleTouch = (e) => {
      if (e.touches.length > 0) {
        const r = canvas.getBoundingClientRect();
        mouseRef.current = { x: e.touches[0].clientX - r.left, y: e.touches[0].clientY - r.top };
        mouseActiveRef.current = 1;
        lastInteractionRef.current = Date.now();
      }
    };
    const handleTouchEnd = () => { mouseActiveRef.current = 0; };

    canvas.addEventListener('mousemove', handleMouse);
    canvas.addEventListener('mouseleave', handleMouseLeave);
    canvas.addEventListener('touchstart', handleTouch, { passive: true });
    canvas.addEventListener('touchmove', handleTouch, { passive: true });
    canvas.addEventListener('touchend', handleTouchEnd);
    canvas.addEventListener('touchcancel', handleTouchEnd);

    let animId;
    const startTime = Date.now();
    // First auto-pulse fires after 3s, then every 8s
    lastPulseRef.current = Date.now() - 5000;

    const animate = () => {
      const w = canvas.width / dpr;
      const h = canvas.height / dpr;
      const time = (Date.now() - startTime) / 1000;
      const mouse = mouseRef.current;
      const cx = w / 2;
      const cy = h / 2;

      // Dark warm background
      ctx.fillStyle = '#0f0812';
      ctx.fillRect(0, 0, w, h);

      // Pink glow — centered
      const g1 = ctx.createRadialGradient(cx, cy, 0, cx, cy, h * 0.7);
      g1.addColorStop(0, 'rgba(219, 39, 119, 0.09)');
      g1.addColorStop(0.4, 'rgba(219, 39, 119, 0.03)');
      g1.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g1;
      ctx.fillRect(0, 0, w, h);

      // Cyan counter-glow — offset upper right
      const g2 = ctx.createRadialGradient(cx + w * 0.15, cy - h * 0.15, 0, cx + w * 0.15, cy - h * 0.15, h * 0.5);
      g2.addColorStop(0, 'rgba(8, 145, 178, 0.05)');
      g2.addColorStop(0.5, 'rgba(8, 145, 178, 0.01)');
      g2.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g2;
      ctx.fillRect(0, 0, w, h);

      // Grid
      ctx.strokeStyle = 'rgba(255,255,255,0.018)';
      ctx.lineWidth = 1;
      for (let x = 0; x < w; x += 28) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
      for (let y = 0; y < h; y += 28) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }

      const voxels = voxelsRef.current;

      // Sparkle trails
      if (Math.random() > 0.94) {
        const rv = voxels[Math.floor(Math.random() * voxels.length)];
        trailsRef.current.push({ x: rv.x + rv.size / 2, y: rv.y + rv.size / 2, life: 1, size: 2 + Math.random() * 5 });
      }
      trailsRef.current = trailsRef.current.filter(t => {
        t.life -= 0.02;
        if (t.life <= 0) return false;
        ctx.fillStyle = `rgba(163, 230, 53, ${t.life * 0.2})`;
        ctx.fillRect(t.x - 1, t.y - t.size / 2, 2, t.size);
        ctx.fillRect(t.x - t.size / 2, t.y - 1, t.size, 2);
        return true;
      });

      // Physics + draw
      const sorted = [...voxels].sort((a, b) => a.y - b.y);

      // Auto-pulse: every 8s of no interaction, burst the P outward
      const now = Date.now();
      const timeSinceInteraction = now - lastInteractionRef.current;
      const timeSincePulse = now - lastPulseRef.current;
      let pulseActive = false;

      if (timeSinceInteraction > 3000 && timeSincePulse > 8000) {
        lastPulseRef.current = now;
        pulseActive = true;
        // Burst of sparkle trails on pulse
        voxels.filter(v => v.isP).forEach(v => {
          trailsRef.current.push({ x: v.x + v.size / 2, y: v.y + v.size / 2, life: 1, size: 4 + Math.random() * 6 });
        });
      }

      sorted.forEach((v) => {
        const dx = mouse.x - (v.x + v.size / 2);
        const dy = mouse.y - (v.y + v.size / 2);
        const dist = Math.sqrt(dx * dx + dy * dy);
        const active = mouseActiveRef.current;

        if (v.isP) {
          let fx = 0, fy = 0;
          if (active > 0 && dist < 130 && dist > 0) {
            const f = (1 - dist / 130) * 28 * active;
            fx = -(dx / dist) * f;
            fy = -(dy / dist) * f;
          }
          // Auto-pulse: radial kick from P center
          if (pulseActive) {
            const pdx = v.homeX - cx;
            const pdy = v.homeY - cy;
            const pdist = Math.sqrt(pdx * pdx + pdy * pdy) || 1;
            const kick = 12 + Math.random() * 8;
            v.vx += (pdx / pdist) * kick;
            v.vy += (pdy / pdist) * kick;
          }
          v.vx = (v.vx + fx + (v.homeX - v.x) * 0.07) * 0.87;
          v.vy = (v.vy + fy + (v.homeY - v.y) * 0.07) * 0.87;
          v.x += v.vx;
          v.y += v.vy;
          v.angle = v.vx * 0.7;
        } else {
          v.orbitAngle += v.orbitSpeed;
          let tx = cx + Math.cos(v.orbitAngle) * v.orbitDistX;
          let ty = cy + Math.sin(v.orbitAngle) * v.orbitDistY;
          if (active > 0 && dist < 200 && dist > 0) {
            const pull = (1 - dist / 200) * 0.1 * active;
            tx += dx * pull;
            ty += dy * pull;
          }
          v.x += (tx - v.x) * 0.03;
          v.y += (ty - v.y) * 0.03;
          v.angle += v.angVel;
        }

        drawVoxel(ctx, v, time);
      });

      // Floating sparkles
      for (let i = 0; i < 8; i++) {
        const sp = time * 0.5 + i * 0.9;
        const sx = cx + Math.cos(sp * 0.6 + i * 1.2) * (w * 0.15 + i * w * 0.04);
        const sy = cy + Math.sin(sp * 0.9 + i * 0.6) * (h * 0.2 + i * h * 0.03);
        const fl = Math.sin(time * 2.5 + i * 1.8) * 0.5 + 0.5;
        if (sx > 0 && sx < w && sy > 0 && sy < h) {
          drawSparkle(ctx, sx, sy, 4 + i, fl * 0.25);
        }
      }

      // Scanlines
      ctx.fillStyle = 'rgba(0,0,0,0.025)';
      for (let y = 0; y < h; y += 4) { ctx.fillRect(0, y, w, 2); }

      // Vignette
      const vig = ctx.createRadialGradient(cx, cy, 0, cx, cy, w * 0.52);
      vig.addColorStop(0, 'rgba(0,0,0,0)');
      vig.addColorStop(0.65, 'rgba(0,0,0,0)');
      vig.addColorStop(1, 'rgba(15,8,18,0.75)');
      ctx.fillStyle = vig;
      ctx.fillRect(0, 0, w, h);

      animId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('mousemove', handleMouse);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
      canvas.removeEventListener('touchstart', handleTouch);
      canvas.removeEventListener('touchmove', handleTouch);
      canvas.removeEventListener('touchend', handleTouchEnd);
      canvas.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [initVoxels, drawVoxel, drawSparkle]);

  return (
    <div style={{ width: '100%', maxWidth: 1200, margin: '0 auto', background: '#0f0812' }}>
      <div
        ref={containerRef}
        style={{
          position: 'relative',
          width: '100%',
          paddingBottom: '42%',
          overflow: 'hidden',
          cursor: 'crosshair',
        }}
      >
        <canvas
          ref={canvasRef}
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'block' }}
        />
      </div>
    </div>
  );
};

export default PixelPitHero;
