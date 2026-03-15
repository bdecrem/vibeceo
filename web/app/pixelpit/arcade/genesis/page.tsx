'use client';

import { useRef, useEffect, useState, useCallback } from 'react';

const GAME_ID = 'genesis';

// Only use the colors each level needs
const ALL_COLORS = ['#ff6b6b', '#4ecdc4', '#ffe66d', '#a29bfe', '#55efc4', '#fd79a8'];
const ALL_NAMES = ['Red', 'Teal', 'Yellow', 'Lavender', 'Mint', 'Pink'];

const PARTICLE_RADIUS = 2.8;
const FRICTION = 0.92;
const MAX_FORCE = 0.8;
const FORCE_RANGE = 120;
const MIN_DIST = 15;
const HEALTH_REGEN = 0.008;
const HEALTH_DECAY = 0.003;
const ISOLATION_DIST = 60;

// ── Level definitions ──

interface SliderDef {
  from: number;
  to: number;
  initial: number;
}

interface Level {
  id: number;
  name: string;
  briefing: string;
  hint: string;
  numColors: number;
  particlesPerColor: number;
  duration: number; // seconds
  lockedMatrix: (number | null)[][]; // null = player controls via slider
  sliders: SliderDef[];
  winCondition: (state: SimState) => boolean;
  winText: string;
  loseText: string;
}

interface SimState {
  colorCounts: number[];
  elapsed: number;
  particles: Particle[];
  numColors: number;
}

const LEVELS: Level[] = [
  {
    id: 1,
    name: 'FIRST CONTACT',
    briefing: 'Two species. Make them coexist.',
    hint: 'Both colors must survive for 20 seconds. If a species scatters too far apart, it fades and dies.',
    numColors: 2,
    particlesPerColor: 40,
    duration: 20,
    lockedMatrix: [
      [0.3, null],
      [null, 0.3],
    ],
    sliders: [
      { from: 0, to: 1, initial: 0 },   // Red→Teal
      { from: 1, to: 0, initial: 0 },   // Teal→Red
    ],
    winCondition: (s) => s.elapsed >= 20 && s.colorCounts.every(c => c >= 5),
    winText: 'Both species survived. Coexistence achieved.',
    loseText: 'A species went extinct.',
  },
  {
    id: 2,
    name: 'THE HUNT',
    briefing: 'Create a predator-prey chase.',
    hint: 'Red must chase Teal. Make Red pursue, make Teal flee. Both must survive 25 seconds.',
    numColors: 2,
    particlesPerColor: 45,
    duration: 25,
    lockedMatrix: [
      [0.2, null],
      [null, 0.5],
    ],
    sliders: [
      { from: 0, to: 1, initial: 0.5 },   // Red→Teal (hint: should attract)
      { from: 1, to: 0, initial: -0.5 },   // Teal→Red (hint: should repel)
    ],
    winCondition: (s) => s.elapsed >= 25 && s.colorCounts.every(c => c >= 5),
    winText: 'The chase held. Neither species collapsed.',
    loseText: 'The ecosystem collapsed. One species was lost.',
  },
  {
    id: 3,
    name: 'TRIANGLE',
    briefing: 'Three species. All must survive.',
    hint: 'Red hunts Teal. Teal hunts Yellow. You control Yellow\'s feelings. Keep all three alive for 30 seconds.',
    numColors: 3,
    particlesPerColor: 35,
    duration: 30,
    lockedMatrix: [
      [0.3,  0.7,  null],   // Red likes itself, chases Teal, you set Red→Yellow
      [null, 0.3,  0.7],    // you set Teal→Red, Teal likes itself, Teal chases Yellow
      [null, null, 0.4],    // you set Yellow→Red, Yellow→Teal, Yellow likes itself
    ],
    sliders: [
      { from: 0, to: 2, initial: 0 },    // Red→Yellow
      { from: 1, to: 0, initial: -0.3 },  // Teal→Red
      { from: 2, to: 0, initial: 0 },     // Yellow→Red
      { from: 2, to: 1, initial: 0 },     // Yellow→Teal
    ],
    winCondition: (s) => s.elapsed >= 30 && s.colorCounts.every(c => c >= 5),
    winText: 'All three species thrived. A stable ecosystem.',
    loseText: 'The triangle collapsed. Try different relationships.',
  },
];

// ── Particle ──

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: number;
  health: number;
}

function createLevelParticles(numColors: number, perColor: number, w: number, h: number): Particle[] {
  const particles: Particle[] = [];
  const margin = 80;
  for (let c = 0; c < numColors; c++) {
    // Start each color in a cluster
    const cx = margin + Math.random() * (w - margin * 2);
    const cy = margin + Math.random() * (h - margin * 2);
    for (let i = 0; i < perColor; i++) {
      particles.push({
        x: cx + (Math.random() - 0.5) * 60,
        y: cy + (Math.random() - 0.5) * 60,
        vx: 0,
        vy: 0,
        color: c,
        health: 1,
      });
    }
  }
  return particles;
}

function buildMatrix(level: Level, sliderValues: number[]): number[][] {
  const n = level.numColors;
  const m: number[][] = [];
  for (let i = 0; i < n; i++) {
    m[i] = [];
    for (let j = 0; j < n; j++) {
      m[i][j] = level.lockedMatrix[i][j] ?? 0;
    }
  }
  // Apply slider values
  level.sliders.forEach((s, idx) => {
    m[s.from][s.to] = sliderValues[idx];
  });
  return m;
}

function isMobile(): boolean {
  if (typeof window === 'undefined') return false;
  return window.innerWidth < 768 || /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
}

// ── Component ──

type GamePhase = 'intro' | 'tuning' | 'simulating' | 'win' | 'lose';

export default function GenesisPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [phase, setPhase] = useState<GamePhase>('intro');
  const [levelIdx, setLevelIdx] = useState(0);
  const [sliderValues, setSliderValues] = useState<number[]>([]);
  const [simTime, setSimTime] = useState(0);
  const [colorCounts, setColorCounts] = useState<number[]>([]);
  const [mobile, setMobile] = useState(false);

  const simRef = useRef<{
    particles: Particle[];
    matrix: number[][];
    w: number;
    h: number;
    running: boolean;
    mobile: boolean;
    elapsed: number;
    level: Level;
    phase: GamePhase;
  }>({
    particles: [],
    matrix: [],
    w: 0,
    h: 0,
    running: false,
    mobile: false,
    elapsed: 0,
    level: LEVELS[0],
    phase: 'intro',
  });
  const animRef = useRef<number>(0);

  const level = LEVELS[levelIdx];

  // Initialize sliders for current level
  useEffect(() => {
    setSliderValues(level.sliders.map(s => s.initial));
  }, [levelIdx, level.sliders]);

  // Canvas setup + render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = '#0a0a0f';
      ctx.fillRect(0, 0, w, h);
    }

    const s = simRef.current;
    s.w = w;
    s.h = h;
    s.mobile = isMobile();
    setMobile(s.mobile);

    const preventScroll = (e: TouchEvent) => e.preventDefault();
    document.body.addEventListener('touchmove', preventScroll, { passive: false });
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
    document.body.style.height = '100%';

    const handleResize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      s.w = w;
      s.h = h;
    };
    window.addEventListener('resize', handleResize);

    let lastTime = 0;

    const loop = (time: number) => {
      const dt = lastTime ? Math.min(time - lastTime, 50) : 16;
      lastTime = time;

      const ctx = canvas.getContext('2d');
      if (!ctx) { animRef.current = requestAnimationFrame(loop); return; }

      // Trail
      ctx.fillStyle = 'rgba(10, 10, 15, 0.08)';
      ctx.fillRect(0, 0, s.w, s.h);

      const particles = s.particles;
      const matrix = s.matrix;
      const isSimulating = s.phase === 'simulating';
      const forceRange = s.mobile ? 80 : FORCE_RANGE;

      if (particles.length > 0 && (isSimulating || s.phase === 'tuning')) {
        // Physics
        for (let i = 0; i < particles.length; i++) {
          const p = particles[i];
          if (p.health <= 0) continue;
          let fx = 0;
          let fy = 0;
          let nearestSame = Infinity;

          for (let j = 0; j < particles.length; j++) {
            if (i === j) continue;
            const q = particles[j];
            if (q.health <= 0) continue;

            let dx = q.x - p.x;
            let dy = q.y - p.y;
            if (dx > s.w / 2) dx -= s.w;
            if (dx < -s.w / 2) dx += s.w;
            if (dy > s.h / 2) dy -= s.h;
            if (dy < -s.h / 2) dy += s.h;

            const dist2 = dx * dx + dy * dy;

            if (q.color === p.color && dist2 < nearestSame) nearestSame = dist2;

            if (dist2 > forceRange * forceRange || dist2 < 1) continue;
            const dist = Math.sqrt(dist2);
            const attraction = matrix[p.color]?.[q.color] ?? 0;

            let force: number;
            if (dist < MIN_DIST) {
              force = (dist / MIN_DIST - 1) * MAX_FORCE;
            } else {
              const normalDist = (dist - MIN_DIST) / (forceRange - MIN_DIST);
              force = attraction * MAX_FORCE * (1 - Math.abs(2 * normalDist - 1));
            }
            fx += (dx / dist) * force;
            fy += (dy / dist) * force;
          }

          // During tuning, particles move gently but don't die
          const speedMul = isSimulating ? 1 : 0.5;
          p.vx = (p.vx + fx * speedMul * (dt / 16)) * FRICTION;
          p.vy = (p.vy + fy * speedMul * (dt / 16)) * FRICTION;
          p.x += p.vx;
          p.y += p.vy;

          if (p.x < 0) p.x += s.w;
          if (p.x >= s.w) p.x -= s.w;
          if (p.y < 0) p.y += s.h;
          if (p.y >= s.h) p.y -= s.h;

          // Health: only during simulation
          if (isSimulating) {
            const nearDist = Math.sqrt(nearestSame);
            if (nearDist < ISOLATION_DIST) {
              p.health = Math.min(1, p.health + HEALTH_REGEN);
            } else {
              p.health -= HEALTH_DECAY * (nearDist / ISOLATION_DIST);
            }
          }
        }

        // Remove dead particles
        if (isSimulating) {
          for (let i = particles.length - 1; i >= 0; i--) {
            if (particles[i].health <= 0) particles.splice(i, 1);
          }
        }

        // Track time
        if (isSimulating) {
          s.elapsed += dt / 1000;
          // Update React state every ~500ms
          if (Math.floor(s.elapsed * 2) !== Math.floor((s.elapsed - dt / 1000) * 2)) {
            setSimTime(Math.floor(s.elapsed));
            const counts: number[] = [];
            for (let c = 0; c < s.level.numColors; c++) {
              counts[c] = particles.filter(p => p.color === c).length;
            }
            setColorCounts(counts);

            // Check win/lose
            if (counts.some(c => c < 3)) {
              s.phase = 'lose';
              s.running = false;
              setPhase('lose');
            } else if (s.level.winCondition({
              colorCounts: counts,
              elapsed: s.elapsed,
              particles,
              numColors: s.level.numColors,
            })) {
              s.phase = 'win';
              s.running = false;
              setPhase('win');
            }
          }
        }
      }

      // Draw particles
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        if (p.health <= 0) continue;
        const alpha = Math.max(0.1, p.health);
        const color = ALL_COLORS[p.color];

        if (!s.mobile) {
          const speed2 = p.vx * p.vx + p.vy * p.vy;
          const glow = Math.min(speed2 * 0.5, 6);
          if (glow > 1) {
            ctx.beginPath();
            ctx.arc(p.x, p.y, PARTICLE_RADIUS + glow, 0, Math.PI * 2);
            ctx.fillStyle = color + Math.round(alpha * 0.1 * 255).toString(16).padStart(2, '0');
            ctx.fill();
          }
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, PARTICLE_RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = color + Math.round(alpha * 255).toString(16).padStart(2, '0');
        ctx.fill();
      }

      animRef.current = requestAnimationFrame(loop);
    };

    animRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', handleResize);
      document.body.removeEventListener('touchmove', preventScroll);
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.height = '';
    };
  }, []);

  // When entering tuning, spawn particles with preview physics
  const startTuning = useCallback(() => {
    const s = simRef.current;
    s.level = level;
    s.particles = createLevelParticles(level.numColors, level.particlesPerColor, s.w, s.h);
    s.matrix = buildMatrix(level, level.sliders.map(sl => sl.initial));
    s.elapsed = 0;
    s.phase = 'tuning';
    s.running = true;
    setPhase('tuning');
    setSimTime(0);
    setColorCounts(Array(level.numColors).fill(level.particlesPerColor));

    // Clear canvas
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#0a0a0f';
      ctx.fillRect(0, 0, s.w, s.h);
    }
  }, [level]);

  // Update matrix when sliders change
  const updateSlider = useCallback((idx: number, value: number) => {
    setSliderValues(prev => {
      const next = [...prev];
      next[idx] = value;
      // Update sim matrix
      simRef.current.matrix = buildMatrix(simRef.current.level, next);
      return next;
    });
  }, []);

  // Start simulation
  const startSim = useCallback(() => {
    const s = simRef.current;
    // Reset particles fresh
    s.particles = createLevelParticles(level.numColors, level.particlesPerColor, s.w, s.h);
    s.matrix = buildMatrix(level, sliderValues);
    s.elapsed = 0;
    s.phase = 'simulating';
    s.running = true;
    setPhase('simulating');
    setSimTime(0);

    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#0a0a0f';
      ctx.fillRect(0, 0, s.w, s.h);
    }
  }, [level, sliderValues]);

  // Retry same level
  const retry = useCallback(() => {
    startTuning();
  }, [startTuning]);

  // Next level
  const nextLevel = useCallback(() => {
    if (levelIdx < LEVELS.length - 1) {
      setLevelIdx(levelIdx + 1);
      setPhase('intro');
    } else {
      // All levels complete
      setPhase('intro');
      setLevelIdx(0);
    }
  }, [levelIdx]);

  const mono = { fontFamily: 'monospace' } as const;

  return (
    <div style={{
      background: '#0a0a0f',
      width: '100vw',
      height: '100dvh',
      overflow: 'hidden',
      position: 'relative',
      userSelect: 'none',
      WebkitUserSelect: 'none',
      touchAction: 'none',
    }}>
      <canvas ref={canvasRef} style={{ position: 'absolute', top: 0, left: 0 }} />

      {/* ── INTRO SCREEN ── */}
      {phase === 'intro' && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 30,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          background: '#0a0a0fee',
        }}>
          <div style={{
            ...mono, fontSize: 10, letterSpacing: 4, color: '#ffffff30',
            textTransform: 'uppercase', marginBottom: 24,
          }}>
            Genesis &middot; Level {level.id}
          </div>
          <div style={{
            ...mono, fontSize: mobile ? 28 : 36, fontWeight: 900, color: '#ffffff',
            letterSpacing: 6, marginBottom: 16, textAlign: 'center',
            textTransform: 'uppercase',
          }}>
            {level.name}
          </div>
          <div style={{
            ...mono, fontSize: mobile ? 14 : 16, color: '#ffffff80',
            marginBottom: 12, textAlign: 'center', maxWidth: 400, lineHeight: 1.6,
          }}>
            {level.briefing}
          </div>
          <div style={{
            ...mono, fontSize: 11, color: '#ffffff40',
            marginBottom: 40, textAlign: 'center', maxWidth: 380, lineHeight: 1.5,
          }}>
            {level.hint}
          </div>

          {/* Color preview */}
          <div style={{ display: 'flex', gap: 16, marginBottom: 40 }}>
            {Array.from({ length: level.numColors }).map((_, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{
                  width: 12, height: 12, borderRadius: 9999,
                  background: ALL_COLORS[i],
                  boxShadow: `0 0 8px ${ALL_COLORS[i]}60`,
                }} />
                <span style={{ ...mono, fontSize: 11, color: ALL_COLORS[i] }}>
                  {ALL_NAMES[i]}
                </span>
              </div>
            ))}
          </div>

          <button onClick={startTuning} style={{
            ...mono, fontSize: 13, letterSpacing: 3, color: '#0a0a0f',
            background: '#ffffff', border: 'none', borderRadius: 24,
            padding: '14px 36px', cursor: 'pointer', fontWeight: 700,
            textTransform: 'uppercase',
          }}>
            Begin
          </button>
        </div>
      )}

      {/* ── TUNING SCREEN ── */}
      {phase === 'tuning' && (
        <>
          {/* Top bar */}
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, zIndex: 20,
            paddingTop: 'max(16px, env(safe-area-inset-top, 16px))',
            paddingLeft: 16, paddingRight: 16,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            pointerEvents: 'none',
          }}>
            <div>
              <div style={{ ...mono, fontSize: 10, letterSpacing: 3, color: '#ffffff30', textTransform: 'uppercase' }}>
                Level {level.id} &middot; {level.name}
              </div>
              <div style={{ ...mono, fontSize: 10, color: '#ffffff20', marginTop: 2 }}>
                Set the rules, then simulate
              </div>
            </div>
          </div>

          {/* Slider panel */}
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 20,
            background: '#0a0a0fdd', backdropFilter: 'blur(12px)',
            borderTop: '1px solid #ffffff10',
            paddingBottom: 'max(20px, env(safe-area-inset-bottom, 20px))',
            padding: mobile ? '16px 16px' : '20px 32px',
          }}>
            <div style={{
              ...mono, fontSize: 9, letterSpacing: 2, color: '#ffffff30',
              textTransform: 'uppercase', marginBottom: 12, textAlign: 'center',
            }}>
              Tune Relationships
            </div>

            <div style={{
              display: 'flex', flexDirection: 'column', gap: 12,
              maxWidth: 400, margin: '0 auto',
            }}>
              {level.sliders.map((slider, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {/* From color dot */}
                  <div style={{
                    width: 10, height: 10, borderRadius: 9999,
                    background: ALL_COLORS[slider.from], flexShrink: 0,
                  }} />
                  <span style={{ ...mono, fontSize: 9, color: ALL_COLORS[slider.from], width: 24, flexShrink: 0 }}>
                    {ALL_NAMES[slider.from].slice(0, 3)}
                  </span>
                  <span style={{ ...mono, fontSize: 9, color: '#ffffff30', flexShrink: 0 }}>→</span>
                  <div style={{
                    width: 10, height: 10, borderRadius: 9999,
                    background: ALL_COLORS[slider.to], flexShrink: 0,
                  }} />
                  <span style={{ ...mono, fontSize: 9, color: ALL_COLORS[slider.to], width: 24, flexShrink: 0 }}>
                    {ALL_NAMES[slider.to].slice(0, 3)}
                  </span>

                  {/* Slider */}
                  <input
                    type="range"
                    min="-100"
                    max="100"
                    value={Math.round((sliderValues[idx] ?? 0) * 100)}
                    onChange={(e) => updateSlider(idx, parseInt(e.target.value) / 100)}
                    style={{
                      flex: 1,
                      accentColor: (sliderValues[idx] ?? 0) >= 0 ? '#55efc4' : '#ff6b6b',
                      height: 4,
                    }}
                  />

                  {/* Value label */}
                  <span style={{
                    ...mono, fontSize: 9, width: 36, textAlign: 'right', flexShrink: 0,
                    color: (sliderValues[idx] ?? 0) >= 0 ? '#55efc4' : '#ff6b6b',
                  }}>
                    {(sliderValues[idx] ?? 0) >= 0 ? '+' : ''}{Math.round((sliderValues[idx] ?? 0) * 100)}
                  </span>
                </div>
              ))}
            </div>

            {/* Simulate button */}
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: 16, gap: 12 }}>
              <button onClick={startSim} style={{
                ...mono, fontSize: 12, letterSpacing: 3, color: '#0a0a0f',
                background: '#55efc4', border: 'none', borderRadius: 20,
                padding: '12px 32px', cursor: 'pointer', fontWeight: 700,
                textTransform: 'uppercase',
              }}>
                Simulate
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── SIMULATING ── */}
      {phase === 'simulating' && (
        <>
          {/* Top bar with timer + species counts */}
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, zIndex: 20,
            paddingTop: 'max(16px, env(safe-area-inset-top, 16px))',
            paddingLeft: 16, paddingRight: 16,
            display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
            pointerEvents: 'none',
          }}>
            <div>
              <div style={{ ...mono, fontSize: 10, letterSpacing: 3, color: '#ffffff30', textTransform: 'uppercase' }}>
                Level {level.id} &middot; Simulating
              </div>
              <div style={{
                ...mono, fontSize: 24, fontWeight: 900, color: '#ffffff60',
                marginTop: 4, fontVariantNumeric: 'tabular-nums',
              }}>
                {simTime}s / {level.duration}s
              </div>
            </div>

            {/* Species counts */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
              {colorCounts.map((count, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{
                    ...mono, fontSize: 11, fontVariantNumeric: 'tabular-nums',
                    color: count < 10 ? '#ff6b6b' : ALL_COLORS[i],
                    fontWeight: count < 10 ? 900 : 400,
                  }}>
                    {count}
                  </span>
                  <div style={{
                    width: 8, height: 8, borderRadius: 9999,
                    background: ALL_COLORS[i],
                    opacity: count < 5 ? 0.3 : 1,
                    boxShadow: count < 10 ? `0 0 6px #ff6b6b` : 'none',
                  }} />
                </div>
              ))}
            </div>
          </div>

          {/* Progress bar */}
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, zIndex: 20,
            background: '#ffffff08',
          }}>
            <div style={{
              height: '100%', background: '#55efc4',
              width: `${Math.min(100, (simTime / level.duration) * 100)}%`,
              transition: 'width 0.5s linear',
            }} />
          </div>
        </>
      )}

      {/* ── WIN/LOSE SCREEN ── */}
      {(phase === 'win' || phase === 'lose') && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 30,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          background: '#0a0a0fcc',
        }}>
          <div style={{
            ...mono, fontSize: mobile ? 32 : 48, fontWeight: 900,
            color: phase === 'win' ? '#55efc4' : '#ff6b6b',
            letterSpacing: 6, marginBottom: 16, textTransform: 'uppercase',
          }}>
            {phase === 'win' ? 'STABLE' : 'EXTINCT'}
          </div>
          <div style={{
            ...mono, fontSize: 13, color: '#ffffff60',
            marginBottom: 8, textAlign: 'center', maxWidth: 360,
          }}>
            {phase === 'win' ? level.winText : level.loseText}
          </div>
          <div style={{
            ...mono, fontSize: 11, color: '#ffffff30',
            marginBottom: 40,
          }}>
            Time: {simTime}s &middot; {colorCounts.filter(c => c >= 3).length}/{level.numColors} species survived
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <button onClick={retry} style={{
              ...mono, fontSize: 11, letterSpacing: 2,
              color: '#ffffff60', background: '#ffffff08',
              border: '1px solid #ffffff15', borderRadius: 20,
              padding: '12px 24px', cursor: 'pointer', textTransform: 'uppercase',
            }}>
              Retry
            </button>
            {phase === 'win' && (
              <button onClick={nextLevel} style={{
                ...mono, fontSize: 11, letterSpacing: 2,
                color: '#0a0a0f', background: '#55efc4',
                border: 'none', borderRadius: 20,
                padding: '12px 24px', cursor: 'pointer', fontWeight: 700,
                textTransform: 'uppercase',
              }}>
                {levelIdx < LEVELS.length - 1 ? 'Next Level' : 'Play Again'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
