'use client';

import { useRef, useEffect, useState, useCallback } from 'react';

const GAME_ID = 'genesis';

const ALL_COLORS = ['#ff6b6b', '#4ecdc4', '#ffe66d', '#a29bfe', '#55efc4', '#fd79a8'];
const ALL_NAMES = ['Red', 'Teal', 'Yellow', 'Lavender', 'Mint', 'Pink'];

const PARTICLE_RADIUS = 2.8;
const FRICTION = 0.92;
const MAX_FORCE = 0.8;
const FORCE_RANGE = 120;
const MIN_DIST = 15;
const COMBAT_RADIUS = 50;
const DAMAGE_RATE = 0.012;
const HEAL_RATE = 0.006;
const WALL_BOUNCE = 0.6;   // velocity retained on wall bounce
const GRID_SIZE = 40;       // territory grid cell size in pixels
const TERRITORY_PRESENCE = 1; // min particles in cell to claim it

// ── Level definitions ──

interface SliderDef {
  from: number;
  to: number;
  initial: number;
  label?: string;
}

interface Level {
  id: number;
  name: string;
  briefing: string;
  hint: string;
  numColors: number;
  particlesPerColor: number;
  duration: number;
  territoryGoal: number; // each color must claim this % of grid
  lockedMatrix: (number | null)[][];
  sliders: SliderDef[];
  winText: string;
  loseText: string;
}

interface SimState {
  colorCounts: number[];
  territory: number[]; // % of grid each color claims
  elapsed: number;
  particles: Particle[];
  numColors: number;
}

const LEVELS: Level[] = [
  {
    id: 1,
    name: 'FIRST CONTACT',
    briefing: 'Colonize the arena. Both species must claim territory.',
    hint: 'Spread out to claim cells — but clump too thin and enemies will kill you. Both species need 15% territory to win.',
    numColors: 2,
    particlesPerColor: 50,
    duration: 25,
    territoryGoal: 15,
    lockedMatrix: [
      [0.3, null],
      [null, 0.3],
    ],
    sliders: [
      { from: 0, to: 1, initial: 0, label: 'Red feels about Teal' },
      { from: 1, to: 0, initial: 0, label: 'Teal feels about Red' },
    ],
    winText: 'Both species colonized. Coexistence.',
    loseText: 'Colony failed.',
  },
  {
    id: 2,
    name: 'THE HUNT',
    briefing: 'Red is a predator. Help Teal colonize anyway.',
    hint: 'Red chases Teal hard (+80, locked). You control Teal\'s instinct. Teal needs 15% territory AND must survive.',
    numColors: 2,
    particlesPerColor: 50,
    duration: 30,
    territoryGoal: 15,
    lockedMatrix: [
      [0.3, 0.8],
      [null, 0.3],
    ],
    sliders: [
      { from: 1, to: 0, initial: 0, label: 'Teal feels about Red' },
    ],
    winText: 'Teal colonized under pressure. The prey adapts.',
    loseText: 'Teal couldn\'t hold territory.',
  },
  {
    id: 3,
    name: 'TRIANGLE',
    briefing: 'Three species. All must colonize.',
    hint: 'Red hunts Teal. Teal hunts Yellow. Each species needs 10% territory. Give Yellow a survival strategy.',
    numColors: 3,
    particlesPerColor: 40,
    duration: 35,
    territoryGoal: 10,
    lockedMatrix: [
      [0.3,  0.7,  null],
      [-0.4, 0.3,  0.7],
      [null, null, 0.3],
    ],
    sliders: [
      { from: 0, to: 2, initial: 0, label: 'Red feels about Yellow' },
      { from: 2, to: 0, initial: 0, label: 'Yellow feels about Red' },
      { from: 2, to: 1, initial: 0, label: 'Yellow feels about Teal' },
    ],
    winText: 'All three colonized. A balanced world.',
    loseText: 'A species lost its territory.',
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
  // Place each color in distinct starting zones
  const zones = numColors === 2
    ? [{ x: w * 0.25, y: h * 0.5 }, { x: w * 0.75, y: h * 0.5 }]
    : [{ x: w * 0.2, y: h * 0.3 }, { x: w * 0.8, y: h * 0.3 }, { x: w * 0.5, y: h * 0.75 }];

  for (let c = 0; c < numColors; c++) {
    const zone = zones[c];
    for (let i = 0; i < perColor; i++) {
      particles.push({
        x: zone.x + (Math.random() - 0.5) * 50,
        y: zone.y + (Math.random() - 0.5) * 50,
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
  level.sliders.forEach((s, idx) => {
    m[s.from][s.to] = sliderValues[idx];
  });
  return m;
}

// Calculate territory: divide screen into grid, count cells with presence per color
function calcTerritory(particles: Particle[], w: number, h: number, numColors: number): number[] {
  const cols = Math.ceil(w / GRID_SIZE);
  const rows = Math.ceil(h / GRID_SIZE);
  const totalCells = cols * rows;

  // Count particles per color per cell
  const grid: number[][] = new Array(totalCells);
  for (let i = 0; i < totalCells; i++) grid[i] = new Array(numColors).fill(0);

  for (const p of particles) {
    if (p.health <= 0) continue;
    const col = Math.min(cols - 1, Math.floor(p.x / GRID_SIZE));
    const row = Math.min(rows - 1, Math.floor(p.y / GRID_SIZE));
    const idx = row * cols + col;
    if (idx >= 0 && idx < totalCells) grid[idx][p.color]++;
  }

  // Count cells claimed by each color (need TERRITORY_PRESENCE particles)
  const claimed = new Array(numColors).fill(0);
  for (let i = 0; i < totalCells; i++) {
    for (let c = 0; c < numColors; c++) {
      if (grid[i][c] >= TERRITORY_PRESENCE) claimed[c]++;
    }
  }

  return claimed.map(c => Math.round((c / totalCells) * 100));
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
  const [territory, setTerritory] = useState<number[]>([]);
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

      // Clear with slight trail
      ctx.fillStyle = 'rgba(10, 10, 15, 0.12)';
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
          let nearbyAllies = 0;
          let nearbyEnemies = 0;

          for (let j = 0; j < particles.length; j++) {
            if (i === j) continue;
            const q = particles[j];
            if (q.health <= 0) continue;

            const dx = q.x - p.x;
            const dy = q.y - p.y;
            const dist2 = dx * dx + dy * dy;

            // Count nearby allies/enemies for combat
            if (dist2 < COMBAT_RADIUS * COMBAT_RADIUS) {
              if (q.color === p.color) nearbyAllies++;
              else nearbyEnemies++;
            }

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

          const speedMul = isSimulating ? 1 : 0.5;
          p.vx = (p.vx + fx * speedMul * (dt / 16)) * FRICTION;
          p.vy = (p.vy + fy * speedMul * (dt / 16)) * FRICTION;
          p.x += p.vx;
          p.y += p.vy;

          // Wall bounce (no wrap-around)
          if (p.x < PARTICLE_RADIUS) { p.x = PARTICLE_RADIUS; p.vx = Math.abs(p.vx) * WALL_BOUNCE; }
          if (p.x > s.w - PARTICLE_RADIUS) { p.x = s.w - PARTICLE_RADIUS; p.vx = -Math.abs(p.vx) * WALL_BOUNCE; }
          if (p.y < PARTICLE_RADIUS) { p.y = PARTICLE_RADIUS; p.vy = Math.abs(p.vy) * WALL_BOUNCE; }
          if (p.y > s.h - PARTICLE_RADIUS) { p.y = s.h - PARTICLE_RADIUS; p.vy = -Math.abs(p.vy) * WALL_BOUNCE; }

          // Combat: outnumbered = damage
          if (isSimulating) {
            const pressure = nearbyEnemies - nearbyAllies;
            if (pressure > 0) {
              p.health -= DAMAGE_RATE * pressure * (dt / 16);
            } else {
              p.health = Math.min(1, p.health + HEAL_RATE * (dt / 16));
            }
          }
        }

        // Remove dead
        if (isSimulating) {
          for (let i = particles.length - 1; i >= 0; i--) {
            if (particles[i].health <= 0) particles.splice(i, 1);
          }
        }

        // Track time + check conditions
        if (isSimulating) {
          s.elapsed += dt / 1000;
          if (Math.floor(s.elapsed * 2) !== Math.floor((s.elapsed - dt / 1000) * 2)) {
            const elapsed = Math.floor(s.elapsed);
            setSimTime(elapsed);

            const counts: number[] = [];
            for (let c = 0; c < s.level.numColors; c++) {
              counts[c] = particles.filter(p => p.color === c).length;
            }
            setColorCounts(counts);

            const terr = calcTerritory(particles, s.w, s.h, s.level.numColors);
            setTerritory(terr);

            // Lose: any species drops below 3
            if (counts.some(c => c < 3)) {
              s.phase = 'lose';
              setPhase('lose');
            }
            // Win: time up + all species alive + all meet territory goal
            else if (s.elapsed >= s.level.duration) {
              const goal = s.level.territoryGoal;
              if (counts.every(c => c >= 5) && terr.every(t => t >= goal)) {
                s.phase = 'win';
                setPhase('win');
              } else {
                s.phase = 'lose';
                setPhase('lose');
              }
            }
          }
        }
      }

      // Draw territory grid (subtle, during simulation only)
      if ((s.phase === 'simulating' || s.phase === 'tuning') && particles.length > 0) {
        const cols = Math.ceil(s.w / GRID_SIZE);
        const rows = Math.ceil(s.h / GRID_SIZE);
        const gridCounts: number[][] = [];
        for (let i = 0; i < cols * rows; i++) gridCounts[i] = new Array(s.level.numColors).fill(0);

        for (const p of particles) {
          if (p.health <= 0) continue;
          const col = Math.min(cols - 1, Math.floor(p.x / GRID_SIZE));
          const row = Math.min(rows - 1, Math.floor(p.y / GRID_SIZE));
          const idx = row * cols + col;
          if (idx >= 0 && idx < cols * rows) gridCounts[idx][p.color]++;
        }

        // Draw claimed cells with very faint color
        for (let row = 0; row < rows; row++) {
          for (let col = 0; col < cols; col++) {
            const idx = row * cols + col;
            let dominant = -1;
            let maxCount = 0;
            for (let c = 0; c < s.level.numColors; c++) {
              if (gridCounts[idx][c] > maxCount) {
                maxCount = gridCounts[idx][c];
                dominant = c;
              }
            }
            if (dominant >= 0 && maxCount >= TERRITORY_PRESENCE) {
              ctx.fillStyle = ALL_COLORS[dominant] + '0a'; // very faint
              ctx.fillRect(col * GRID_SIZE, row * GRID_SIZE, GRID_SIZE, GRID_SIZE);
            }
          }
        }
      }

      // Draw particles
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        if (p.health <= 0) continue;
        const alpha = Math.max(0.15, p.health);
        const color = ALL_COLORS[p.color];
        const alphaHex = Math.round(alpha * 255).toString(16).padStart(2, '0');

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
        ctx.fillStyle = color + alphaHex;
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
    setTerritory(Array(level.numColors).fill(0));

    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) { ctx.fillStyle = '#0a0a0f'; ctx.fillRect(0, 0, s.w, s.h); }
  }, [level]);

  const updateSlider = useCallback((idx: number, value: number) => {
    setSliderValues(prev => {
      const next = [...prev];
      next[idx] = value;
      simRef.current.matrix = buildMatrix(simRef.current.level, next);
      return next;
    });
  }, []);

  const startSim = useCallback(() => {
    const s = simRef.current;
    s.particles = createLevelParticles(level.numColors, level.particlesPerColor, s.w, s.h);
    s.matrix = buildMatrix(level, sliderValues);
    s.elapsed = 0;
    s.phase = 'simulating';
    s.running = true;
    setPhase('simulating');
    setSimTime(0);
    setTerritory(Array(level.numColors).fill(0));

    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) { ctx.fillStyle = '#0a0a0f'; ctx.fillRect(0, 0, s.w, s.h); }
  }, [level, sliderValues]);

  const retry = useCallback(() => startTuning(), [startTuning]);

  const nextLevel = useCallback(() => {
    if (levelIdx < LEVELS.length - 1) {
      setLevelIdx(levelIdx + 1);
      setPhase('intro');
    } else {
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

      {/* ── INTRO ── */}
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

      {/* ── TUNING ── */}
      {phase === 'tuning' && (
        <>
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
            <div style={{ ...mono, fontSize: 10, color: '#ffffff20' }}>
              Goal: {level.territoryGoal}% territory each
            </div>
          </div>

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
              display: 'flex', flexDirection: 'column', gap: 14,
              maxWidth: 400, margin: '0 auto',
            }}>
              {level.sliders.map((slider, idx) => (
                <div key={idx}>
                  {/* Label */}
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4,
                  }}>
                    <div style={{
                      width: 8, height: 8, borderRadius: 9999,
                      background: ALL_COLORS[slider.from], flexShrink: 0,
                    }} />
                    <span style={{ ...mono, fontSize: 9, color: '#ffffff40' }}>
                      {slider.label || `${ALL_NAMES[slider.from]} → ${ALL_NAMES[slider.to]}`}
                    </span>
                  </div>

                  {/* Slider row */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ ...mono, fontSize: 8, color: '#ff6b6b80', width: 32, flexShrink: 0 }}>
                      repel
                    </span>
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
                    <span style={{ ...mono, fontSize: 8, color: '#55efc480', width: 32, flexShrink: 0, textAlign: 'right' }}>
                      attract
                    </span>
                    <span style={{
                      ...mono, fontSize: 10, width: 36, textAlign: 'right', flexShrink: 0,
                      color: (sliderValues[idx] ?? 0) >= 0 ? '#55efc4' : '#ff6b6b',
                      fontWeight: 700,
                    }}>
                      {(sliderValues[idx] ?? 0) >= 0 ? '+' : ''}{Math.round((sliderValues[idx] ?? 0) * 100)}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', marginTop: 16 }}>
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
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, zIndex: 20,
            paddingTop: 'max(16px, env(safe-area-inset-top, 16px))',
            paddingLeft: 16, paddingRight: 16,
            display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
            pointerEvents: 'none',
          }}>
            <div>
              <div style={{ ...mono, fontSize: 10, letterSpacing: 3, color: '#ffffff30', textTransform: 'uppercase' }}>
                Colonizing...
              </div>
              <div style={{
                ...mono, fontSize: 24, fontWeight: 900, color: '#ffffff60',
                marginTop: 4, fontVariantNumeric: 'tabular-nums',
              }}>
                {simTime}s / {level.duration}s
              </div>
            </div>

            {/* Species status: count + territory % */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
              {colorCounts.map((count, i) => {
                const terr = territory[i] ?? 0;
                const goalMet = terr >= level.territoryGoal;
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{
                      ...mono, fontSize: 10, fontVariantNumeric: 'tabular-nums',
                      color: count < 10 ? '#ff6b6b' : '#ffffff40',
                    }}>
                      {count}
                    </span>
                    <div style={{
                      width: 8, height: 8, borderRadius: 9999,
                      background: ALL_COLORS[i],
                      opacity: count < 5 ? 0.3 : 1,
                    }} />
                    <span style={{
                      ...mono, fontSize: 10, fontVariantNumeric: 'tabular-nums',
                      color: goalMet ? '#55efc4' : ALL_COLORS[i],
                      fontWeight: goalMet ? 900 : 400,
                    }}>
                      {terr}%
                    </span>
                  </div>
                );
              })}
              <div style={{ ...mono, fontSize: 8, color: '#ffffff20', marginTop: 2 }}>
                goal: {level.territoryGoal}%
              </div>
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

      {/* ── WIN/LOSE ── */}
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
            {phase === 'win' ? 'COLONIZED' : 'FAILED'}
          </div>
          <div style={{
            ...mono, fontSize: 13, color: '#ffffff60',
            marginBottom: 12, textAlign: 'center', maxWidth: 360,
          }}>
            {phase === 'win' ? level.winText : level.loseText}
          </div>

          {/* Final stats */}
          <div style={{ display: 'flex', gap: 20, marginBottom: 32 }}>
            {colorCounts.map((count, i) => (
              <div key={i} style={{ textAlign: 'center' }}>
                <div style={{
                  width: 12, height: 12, borderRadius: 9999,
                  background: ALL_COLORS[i], margin: '0 auto 4px',
                  opacity: count < 3 ? 0.2 : 1,
                }} />
                <div style={{ ...mono, fontSize: 10, color: '#ffffff40' }}>{count}</div>
                <div style={{
                  ...mono, fontSize: 10, fontWeight: 700,
                  color: (territory[i] ?? 0) >= level.territoryGoal ? '#55efc4' : '#ff6b6b',
                }}>
                  {territory[i] ?? 0}%
                </div>
              </div>
            ))}
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
