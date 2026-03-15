'use client';

import { useRef, useEffect, useState, useCallback } from 'react';

const GAME_ID = 'particle-life';

const COLORS = [
  '#ff6b6b', // red
  '#4ecdc4', // teal
  '#ffe66d', // yellow
  '#a29bfe', // lavender
  '#55efc4', // mint
  '#fd79a8', // pink
];

const COLOR_NAMES = ['Red', 'Teal', 'Yellow', 'Lavender', 'Mint', 'Pink'];

const NUM_COLORS = COLORS.length;
const PARTICLE_RADIUS = 2.5;
const FRICTION = 0.92;
const MAX_FORCE = 0.8;
const FORCE_RANGE = 120;
const MIN_DIST = 15;

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: number;
}

function randomMatrix(): number[][] {
  const m: number[][] = [];
  for (let i = 0; i < NUM_COLORS; i++) {
    m[i] = [];
    for (let j = 0; j < NUM_COLORS; j++) {
      m[i][j] = Math.random() * 2 - 1; // -1 to +1
    }
  }
  return m;
}

function createParticles(count: number, w: number, h: number): Particle[] {
  const particles: Particle[] = [];
  for (let i = 0; i < count; i++) {
    particles.push({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: 0,
      vy: 0,
      color: Math.floor(Math.random() * NUM_COLORS),
    });
  }
  return particles;
}

export default function ParticleLifePage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<{
    particles: Particle[];
    matrix: number[][];
    w: number;
    h: number;
    running: boolean;
    trail: number;
    showMatrix: boolean;
    speed: number;
    hoveredRule: { i: number; j: number } | null;
  }>({
    particles: [],
    matrix: randomMatrix(),
    w: 0,
    h: 0,
    running: true,
    trail: 0.08,
    showMatrix: false,
    speed: 1,
    hoveredRule: null,
  });
  const [, forceRender] = useState(0);
  const [showUI, setShowUI] = useState(true);
  const [showMatrix, setShowMatrix] = useState(false);
  const [particleCount, setParticleCount] = useState(0);
  const [universeAge, setUniverseAge] = useState(0);
  const ageRef = useRef(0);
  const animRef = useRef<number>(0);

  const init = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const s = stateRef.current;
    s.w = window.innerWidth;
    s.h = window.innerHeight;
    canvas.width = s.w;
    canvas.height = s.h;
    const count = Math.min(600, Math.floor((s.w * s.h) / 2000));
    s.particles = createParticles(count, s.w, s.h);
    s.matrix = randomMatrix();
    ageRef.current = 0;
    setParticleCount(count);
    setUniverseAge(0);

    // Clear canvas
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#0a0a0f';
      ctx.fillRect(0, 0, s.w, s.h);
    }
  }, []);

  const newUniverse = useCallback(() => {
    const s = stateRef.current;
    s.matrix = randomMatrix();
    s.particles.forEach(p => {
      p.x = Math.random() * s.w;
      p.y = Math.random() * s.h;
      p.vx = 0;
      p.vy = 0;
      p.color = Math.floor(Math.random() * NUM_COLORS);
    });
    ageRef.current = 0;
    setUniverseAge(0);
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#0a0a0f';
      ctx.fillRect(0, 0, s.w, s.h);
    }
    forceRender(n => n + 1);
  }, []);

  useEffect(() => {
    init();

    const handleResize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const s = stateRef.current;
      s.w = window.innerWidth;
      s.h = window.innerHeight;
      canvas.width = s.w;
      canvas.height = s.h;
    };

    window.addEventListener('resize', handleResize);

    // Game loop
    let lastTime = 0;
    let ageAccum = 0;

    const loop = (time: number) => {
      const s = stateRef.current;
      if (!s.running) {
        animRef.current = requestAnimationFrame(loop);
        return;
      }

      const dt = lastTime ? Math.min(time - lastTime, 50) : 16;
      lastTime = time;
      ageAccum += dt;
      if (ageAccum > 1000) {
        ageRef.current += Math.floor(ageAccum / 1000);
        ageAccum %= 1000;
        setUniverseAge(ageRef.current);
      }

      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!ctx || !canvas) {
        animRef.current = requestAnimationFrame(loop);
        return;
      }

      // Trail effect
      ctx.fillStyle = `rgba(10, 10, 15, ${s.trail})`;
      ctx.fillRect(0, 0, s.w, s.h);

      const particles = s.particles;
      const matrix = s.matrix;
      const speed = s.speed;

      // Physics update
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        let fx = 0;
        let fy = 0;

        for (let j = 0; j < particles.length; j++) {
          if (i === j) continue;
          const q = particles[j];
          let dx = q.x - p.x;
          let dy = q.y - p.y;

          // Wrap-around distance
          if (dx > s.w / 2) dx -= s.w;
          if (dx < -s.w / 2) dx += s.w;
          if (dy > s.h / 2) dy -= s.h;
          if (dy < -s.h / 2) dy += s.h;

          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > FORCE_RANGE || dist < 1) continue;

          const attraction = matrix[p.color][q.color];

          let force: number;
          if (dist < MIN_DIST) {
            // Strong repulsion at very close range
            force = (dist / MIN_DIST - 1) * MAX_FORCE;
          } else {
            // Attraction/repulsion based on matrix
            const normalDist = (dist - MIN_DIST) / (FORCE_RANGE - MIN_DIST);
            // Bell-shaped force curve
            force = attraction * MAX_FORCE * (1 - Math.abs(2 * normalDist - 1));
          }

          fx += (dx / dist) * force;
          fy += (dy / dist) * force;
        }

        p.vx = (p.vx + fx * speed * (dt / 16)) * FRICTION;
        p.vy = (p.vy + fy * speed * (dt / 16)) * FRICTION;
        p.x += p.vx;
        p.y += p.vy;

        // Wrap around
        if (p.x < 0) p.x += s.w;
        if (p.x >= s.w) p.x -= s.w;
        if (p.y < 0) p.y += s.h;
        if (p.y >= s.h) p.y -= s.h;
      }

      // Draw particles with glow
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        const speed2 = p.vx * p.vx + p.vy * p.vy;
        const glow = Math.min(speed2 * 0.5, 8);

        if (glow > 1) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, PARTICLE_RADIUS + glow, 0, Math.PI * 2);
          ctx.fillStyle = COLORS[p.color] + '18';
          ctx.fill();
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, PARTICLE_RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = COLORS[p.color];
        ctx.fill();
      }

      animRef.current = requestAnimationFrame(loop);
    };

    animRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', handleResize);
    };
  }, [init]);

  // Touch/click to add particles
  const handleCanvasClick = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const s = stateRef.current;
    let x: number, y: number;
    if ('touches' in e) {
      x = e.touches[0].clientX;
      y = e.touches[0].clientY;
    } else {
      x = e.clientX;
      y = e.clientY;
    }

    // Add a burst of particles at tap location
    const color = Math.floor(Math.random() * NUM_COLORS);
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2 * i) / 8;
      s.particles.push({
        x: x + Math.cos(angle) * 10,
        y: y + Math.sin(angle) * 10,
        vx: Math.cos(angle) * 0.5,
        vy: Math.sin(angle) * 0.5,
        color,
      });
    }
    setParticleCount(s.particles.length);
  }, []);

  const formatAge = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    if (m < 60) return `${m}m ${s}s`;
    const h = Math.floor(m / 60);
    return `${h}h ${m % 60}m`;
  };

  const s = stateRef.current;

  return (
    <div style={{
      background: '#0a0a0f',
      width: '100vw',
      height: '100vh',
      overflow: 'hidden',
      position: 'relative',
      cursor: 'crosshair',
      userSelect: 'none',
    }}>
      <canvas
        ref={canvasRef}
        onClick={handleCanvasClick}
        onTouchStart={handleCanvasClick}
        style={{ position: 'absolute', top: 0, left: 0 }}
      />

      {/* Top HUD */}
      <div style={{
        position: 'absolute',
        top: 16,
        left: 16,
        right: 16,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        pointerEvents: 'none',
        zIndex: 10,
        opacity: showUI ? 1 : 0,
        transition: 'opacity 0.3s',
      }}>
        <div>
          <div style={{
            fontFamily: 'monospace',
            fontSize: 11,
            letterSpacing: 4,
            color: '#ffffff40',
            textTransform: 'uppercase',
            marginBottom: 4,
          }}>
            Particle Life
          </div>
          <div style={{
            fontFamily: 'monospace',
            fontSize: 10,
            color: '#ffffff25',
          }}>
            {particleCount} particles &middot; age {formatAge(universeAge)}
          </div>
        </div>
        <div style={{
          fontFamily: 'monospace',
          fontSize: 10,
          color: '#ffffff25',
          textAlign: 'right',
        }}>
          tap to seed &middot; space for new universe
        </div>
      </div>

      {/* Matrix overlay */}
      {showMatrix && (
        <div style={{
          position: 'absolute',
          bottom: 80,
          left: '50%',
          transform: 'translateX(-50%)',
          background: '#0a0a0f99',
          backdropFilter: 'blur(10px)',
          borderRadius: 12,
          padding: 16,
          zIndex: 20,
          border: '1px solid #ffffff10',
        }}>
          <div style={{
            fontFamily: 'monospace',
            fontSize: 9,
            color: '#ffffff40',
            letterSpacing: 2,
            textTransform: 'uppercase',
            marginBottom: 10,
            textAlign: 'center',
          }}>
            Rules of this Universe
          </div>
          <div style={{ display: 'flex', gap: 1 }}>
            {/* Row labels */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1, marginRight: 4, justifyContent: 'flex-end' }}>
              {COLORS.map((c, i) => (
                <div key={i} style={{
                  width: 28, height: 28,
                  display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
                  fontFamily: 'monospace', fontSize: 8, color: c, paddingRight: 4,
                }}>
                  {COLOR_NAMES[i].slice(0, 3)}
                </div>
              ))}
            </div>
            <div>
              {/* Column headers */}
              <div style={{ display: 'flex', gap: 1, marginBottom: 2 }}>
                {COLORS.map((c, j) => (
                  <div key={j} style={{
                    width: 28, height: 14,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: 'monospace', fontSize: 8, color: c,
                  }}>
                    {COLOR_NAMES[j].slice(0, 3)}
                  </div>
                ))}
              </div>
              {/* Matrix cells */}
              {s.matrix.map((row, i) => (
                <div key={i} style={{ display: 'flex', gap: 1 }}>
                  {row.map((val, j) => {
                    const intensity = Math.abs(val);
                    const hue = val > 0 ? '140' : '0'; // green for attract, red for repel
                    return (
                      <div
                        key={j}
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 4,
                          background: `hsla(${hue}, 70%, 50%, ${intensity * 0.6})`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontFamily: 'monospace',
                          fontSize: 8,
                          color: '#ffffff80',
                          cursor: 'pointer',
                          border: '1px solid #ffffff08',
                        }}
                        title={`${COLOR_NAMES[i]} → ${COLOR_NAMES[j]}: ${val > 0 ? 'attracts' : 'repels'} (${(val * 100).toFixed(0)}%)`}
                      >
                        {val > 0 ? '+' : ''}{(val * 100).toFixed(0)}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
          <div style={{
            fontFamily: 'monospace',
            fontSize: 8,
            color: '#ffffff20',
            textAlign: 'center',
            marginTop: 8,
          }}>
            green = attract &middot; red = repel &middot; row acts on column
          </div>
        </div>
      )}

      {/* Bottom controls */}
      <div style={{
        position: 'absolute',
        bottom: 20,
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        gap: 8,
        zIndex: 10,
        opacity: showUI ? 1 : 0,
        transition: 'opacity 0.3s',
      }}>
        {[
          { label: 'NEW UNIVERSE', action: newUniverse },
          { label: showMatrix ? 'HIDE RULES' : 'SHOW RULES', action: () => { stateRef.current.showMatrix = !showMatrix; setShowMatrix(!showMatrix); } },
          { label: 'CLEAR', action: () => {
            const s = stateRef.current;
            s.particles = [];
            setParticleCount(0);
            const ctx = canvasRef.current?.getContext('2d');
            if (ctx) { ctx.fillStyle = '#0a0a0f'; ctx.fillRect(0, 0, s.w, s.h); }
          }},
        ].map(btn => (
          <button
            key={btn.label}
            onClick={btn.action}
            style={{
              fontFamily: 'monospace',
              fontSize: 10,
              letterSpacing: 2,
              color: '#ffffff60',
              background: '#ffffff08',
              border: '1px solid #ffffff15',
              borderRadius: 20,
              padding: '8px 18px',
              cursor: 'pointer',
              textTransform: 'uppercase',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = '#ffffff18';
              e.currentTarget.style.color = '#ffffffa0';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = '#ffffff08';
              e.currentTarget.style.color = '#ffffff60';
            }}
          >
            {btn.label}
          </button>
        ))}
      </div>

      {/* Keyboard handler */}
      <KeyboardHandler
        onSpace={newUniverse}
        onH={() => setShowUI(u => !u)}
        onM={() => { stateRef.current.showMatrix = !showMatrix; setShowMatrix(!showMatrix); }}
      />
    </div>
  );
}

function KeyboardHandler({ onSpace, onH, onM }: { onSpace: () => void; onH: () => void; onM: () => void }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.code === 'Space') { e.preventDefault(); onSpace(); }
      if (e.key === 'h') onH();
      if (e.key === 'm') onM();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onSpace, onH, onM]);
  return null;
}
