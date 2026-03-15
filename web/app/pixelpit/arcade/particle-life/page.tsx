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

// Pentatonic scale for ambient melody (MIDI notes)
const MELODY_NOTES = [48, 50, 52, 55, 57, 60, 62, 64, 67, 69, 72]; // C3 to C5 pentatonic

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: number;
}

interface AudioState {
  ctx: AudioContext;
  jb01: any;
  jt10: any;
  reverb: ConvolverNode;
  reverbGain: GainNode;
  masterGain: GainNode;
  running: boolean;
  lastKickTime: number;
  lastMelodyTime: number;
  lastHatTime: number;
  melodyIndex: number;
}

function randomMatrix(): number[][] {
  const m: number[][] = [];
  for (let i = 0; i < NUM_COLORS; i++) {
    m[i] = [];
    for (let j = 0; j < NUM_COLORS; j++) {
      m[i][j] = Math.random() * 2 - 1;
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

function isMobile(): boolean {
  if (typeof window === 'undefined') return false;
  return window.innerWidth < 768 || /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
}

// Generate a reverb impulse response
function createReverbIR(ctx: AudioContext, duration: number, decay: number): AudioBuffer {
  const length = ctx.sampleRate * duration;
  const ir = ctx.createBuffer(2, length, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = ir.getChannelData(ch);
    for (let i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
    }
  }
  return ir;
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
    mobile: boolean;
    avgSpeed: number;
    clusterCount: number;
  }>({
    particles: [],
    matrix: randomMatrix(),
    w: 0,
    h: 0,
    running: true,
    trail: 0.08,
    showMatrix: false,
    speed: 1,
    mobile: false,
    avgSpeed: 0,
    clusterCount: 0,
  });
  const audioRef = useRef<AudioState | null>(null);
  const audioInitRef = useRef(false);
  const [, forceRender] = useState(0);
  const [showUI, setShowUI] = useState(true);
  const [showMatrix, setShowMatrix] = useState(false);
  const [particleCount, setParticleCount] = useState(0);
  const [universeAge, setUniverseAge] = useState(0);
  const [mobile, setMobile] = useState(false);
  const [audioReady, setAudioReady] = useState(false);
  const [muted, setMuted] = useState(false);
  const ageRef = useRef(0);
  const animRef = useRef<number>(0);

  // Initialize audio on first user interaction
  const initAudio = useCallback(async () => {
    if (audioInitRef.current) return;
    audioInitRef.current = true;

    try {
      const ctx = new AudioContext({ sampleRate: 44100 });
      if (ctx.state === 'suspended') await ctx.resume();

      // Master output chain: masterGain → destination
      const masterGain = ctx.createGain();
      masterGain.gain.value = 0.6;
      masterGain.connect(ctx.destination);

      // Reverb send
      const reverb = ctx.createConvolver();
      reverb.buffer = createReverbIR(ctx, 3.5, 2.5);
      const reverbGain = ctx.createGain();
      reverbGain.gain.value = 0.4;
      reverb.connect(reverbGain);
      reverbGain.connect(masterGain);

      // Load JB01 (drums)
      let jb01: any = null;
      try {
        const jb01Path = ['/jb01/dist/machines/jb01', 'engine.js'].join('/');
        const jb01Module = await import(/* webpackIgnore: true */ jb01Path);
        jb01 = new jb01Module.JB01Engine({ context: ctx });
        jb01.connectOutput(masterGain);
        // Also send to reverb
        jb01.masterGain.connect(reverb);

        // Set up ambient drum tones
        jb01.setVoiceParam('kick', 'decay', 0.8);
        jb01.setVoiceParam('kick', 'tone', 0.3);
        jb01.setVoiceParam('ch', 'decay', 0.15);
        jb01.setVoiceParam('ch', 'tone', 0.6);
        jb01.setVoiceParam('oh', 'decay', 0.4);
      } catch (e) {
        console.warn('JB01 not available:', e);
      }

      // Load JT10 (melody synth)
      let jt10: any = null;
      try {
        const jt10Path = ['/jt10/dist/machines/jt10', 'engine.js'].join('/');
        const jt10Module = await import(/* webpackIgnore: true */ jt10Path);
        jt10 = new jt10Module.JT10Engine({ context: ctx });
        jt10.connectOutput(masterGain);
        // Heavy reverb on melody
        jt10.masterGain.connect(reverb);

        // Configure for ambient: dark, soft, long release
        jt10.setParameter('waveform', 'saw');
        jt10.setParameter('cutoff', 0.15);
        jt10.setParameter('resonance', 0.1);
        jt10.setParameter('attack', 0.3);
        jt10.setParameter('decay', 1.5);
        jt10.setParameter('sustain', 0.2);
        jt10.setParameter('release', 2.0);
        jt10.setParameter('filterAttack', 0.2);
        jt10.setParameter('filterDecay', 1.0);
        jt10.setParameter('filterSustain', 0.1);
        jt10.setParameter('filterRelease', 1.5);
        jt10.setParameter('filterEnvAmount', 0.3);
      } catch (e) {
        console.warn('JT10 not available:', e);
      }

      const audio: AudioState = {
        ctx,
        jb01,
        jt10,
        reverb,
        reverbGain,
        masterGain,
        running: true,
        lastKickTime: 0,
        lastMelodyTime: 0,
        lastHatTime: 0,
        melodyIndex: Math.floor(Math.random() * MELODY_NOTES.length),
      };

      audioRef.current = audio;
      setAudioReady(true);

      // Start generative music loop
      startMusicLoop(audio);
    } catch (e) {
      console.warn('Audio init failed:', e);
    }
  }, []);

  const startMusicLoop = useCallback((audio: AudioState) => {
    const schedule = () => {
      if (!audio.running) return;
      const s = stateRef.current;
      const now = audio.ctx.currentTime;
      const avgSpeed = s.avgSpeed;

      // Ambient kick: soft, slow pulse every 3-6 seconds
      if (audio.jb01 && now - audio.lastKickTime > 3 + Math.random() * 3) {
        const vel = 0.15 + Math.min(avgSpeed * 0.1, 0.2);
        audio.jb01.trigger('kick', vel, now + 0.05);
        audio.lastKickTime = now;
      }

      // Hi-hats: density scales with particle activity
      const hatInterval = Math.max(0.3, 1.5 - avgSpeed * 0.3);
      if (audio.jb01 && now - audio.lastHatTime > hatInterval) {
        if (Math.random() < 0.6) {
          const vel = 0.05 + Math.random() * 0.15;
          const voice = Math.random() < 0.8 ? 'ch' : 'oh';
          audio.jb01.trigger(voice, vel, now + 0.05);
        }
        audio.lastHatTime = now;
      }

      // Melody: pentatonic notes, walking up/down, every 4-10 seconds
      if (audio.jt10 && now - audio.lastMelodyTime > 4 + Math.random() * 6) {
        // Walk through pentatonic scale with occasional jumps
        const step = Math.random() < 0.7
          ? (Math.random() < 0.5 ? 1 : -1)  // step up or down
          : Math.floor(Math.random() * 5) - 2; // jump
        audio.melodyIndex = Math.max(0, Math.min(MELODY_NOTES.length - 1, audio.melodyIndex + step));
        const note = MELODY_NOTES[audio.melodyIndex];
        const vel = 0.2 + Math.random() * 0.2;
        audio.jt10.trigger(note, vel, now + 0.05);
        audio.lastMelodyTime = now;
      }

      setTimeout(schedule, 200);
    };
    schedule();
  }, []);

  const toggleMute = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (muted) {
      audio.masterGain.gain.linearRampToValueAtTime(0.6, audio.ctx.currentTime + 0.3);
      audio.running = true;
      startMusicLoop(audio);
    } else {
      audio.masterGain.gain.linearRampToValueAtTime(0, audio.ctx.currentTime + 0.3);
      audio.running = false;
    }
    setMuted(!muted);
  }, [muted, startMusicLoop]);

  const init = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const s = stateRef.current;
    const dpr = window.devicePixelRatio || 1;
    s.w = window.innerWidth;
    s.h = window.innerHeight;
    canvas.width = s.w * dpr;
    canvas.height = s.h * dpr;
    canvas.style.width = s.w + 'px';
    canvas.style.height = s.h + 'px';
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = '#0a0a0f';
      ctx.fillRect(0, 0, s.w, s.h);
    }

    s.mobile = isMobile();
    setMobile(s.mobile);

    const maxParticles = s.mobile ? 250 : 600;
    const count = Math.min(maxParticles, Math.floor((s.w * s.h) / (s.mobile ? 1200 : 2000)));
    s.particles = createParticles(count, s.w, s.h);
    s.matrix = randomMatrix();
    ageRef.current = 0;
    setParticleCount(count);
    setUniverseAge(0);
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
      ctx.fillRect(0, 0, stateRef.current.w, stateRef.current.h);
    }
    forceRender(n => n + 1);

    // Reset melody to a new starting point on new universe
    if (audioRef.current) {
      audioRef.current.melodyIndex = Math.floor(Math.random() * MELODY_NOTES.length);
    }
  }, []);

  useEffect(() => {
    init();

    const handleResize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const s = stateRef.current;
      const dpr = window.devicePixelRatio || 1;
      s.w = window.innerWidth;
      s.h = window.innerHeight;
      canvas.width = s.w * dpr;
      canvas.height = s.h * dpr;
      canvas.style.width = s.w + 'px';
      canvas.style.height = s.h + 'px';
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    window.addEventListener('resize', handleResize);

    const preventScroll = (e: TouchEvent) => e.preventDefault();
    document.body.addEventListener('touchmove', preventScroll, { passive: false });
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
    document.body.style.height = '100%';

    let lastTime = 0;
    let ageAccum = 0;
    let speedAccum = 0;
    let speedSamples = 0;

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

        // Update average speed for audio reactivity
        if (speedSamples > 0) {
          s.avgSpeed = speedAccum / speedSamples;
          speedAccum = 0;
          speedSamples = 0;
        }
      }

      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!ctx || !canvas) {
        animRef.current = requestAnimationFrame(loop);
        return;
      }

      ctx.fillStyle = `rgba(10, 10, 15, ${s.trail})`;
      ctx.fillRect(0, 0, s.w, s.h);

      const particles = s.particles;
      const matrix = s.matrix;
      const speed = s.speed;
      const forceRange = s.mobile ? 80 : FORCE_RANGE;

      let totalSpeed = 0;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        let fx = 0;
        let fy = 0;

        for (let j = 0; j < particles.length; j++) {
          if (i === j) continue;
          const q = particles[j];
          let dx = q.x - p.x;
          let dy = q.y - p.y;

          if (dx > s.w / 2) dx -= s.w;
          if (dx < -s.w / 2) dx += s.w;
          if (dy > s.h / 2) dy -= s.h;
          if (dy < -s.h / 2) dy += s.h;

          const dist2 = dx * dx + dy * dy;
          if (dist2 > forceRange * forceRange || dist2 < 1) continue;

          const dist = Math.sqrt(dist2);
          const attraction = matrix[p.color][q.color];

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

        p.vx = (p.vx + fx * speed * (dt / 16)) * FRICTION;
        p.vy = (p.vy + fy * speed * (dt / 16)) * FRICTION;
        p.x += p.vx;
        p.y += p.vy;

        totalSpeed += Math.sqrt(p.vx * p.vx + p.vy * p.vy);

        if (p.x < 0) p.x += s.w;
        if (p.x >= s.w) p.x -= s.w;
        if (p.y < 0) p.y += s.h;
        if (p.y >= s.h) p.y -= s.h;
      }

      // Track speed for audio
      if (particles.length > 0) {
        speedAccum += totalSpeed / particles.length;
        speedSamples++;
      }

      // Draw
      if (s.mobile) {
        for (let i = 0; i < particles.length; i++) {
          const p = particles[i];
          ctx.beginPath();
          ctx.arc(p.x, p.y, PARTICLE_RADIUS, 0, Math.PI * 2);
          ctx.fillStyle = COLORS[p.color];
          ctx.fill();
        }
      } else {
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
      if (audioRef.current) {
        audioRef.current.running = false;
      }
    };
  }, [init]);

  // Touch/click handlers
  const handleCanvasTouch = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    if (!audioInitRef.current) initAudio();
    const s = stateRef.current;
    const touch = e.touches[0];
    if (!touch) return;
    const color = Math.floor(Math.random() * NUM_COLORS);
    const burst = s.mobile ? 5 : 8;
    for (let i = 0; i < burst; i++) {
      const angle = (Math.PI * 2 * i) / burst;
      s.particles.push({
        x: touch.clientX + Math.cos(angle) * 10,
        y: touch.clientY + Math.sin(angle) * 10,
        vx: Math.cos(angle) * 0.5,
        vy: Math.sin(angle) * 0.5,
        color,
      });
    }
    setParticleCount(s.particles.length);
  }, [initAudio]);

  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    if (!audioInitRef.current) initAudio();
    const s = stateRef.current;
    const color = Math.floor(Math.random() * NUM_COLORS);
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2 * i) / 8;
      s.particles.push({
        x: e.clientX + Math.cos(angle) * 10,
        y: e.clientY + Math.sin(angle) * 10,
        vx: Math.cos(angle) * 0.5,
        vy: Math.sin(angle) * 0.5,
        color,
      });
    }
    setParticleCount(s.particles.length);
  }, [initAudio]);

  const formatAge = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    const m = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (m < 60) return `${m}m ${secs}s`;
    const h = Math.floor(m / 60);
    return `${h}h ${m % 60}m`;
  };

  const s = stateRef.current;

  return (
    <div style={{
      background: '#0a0a0f',
      width: '100vw',
      height: '100dvh',
      overflow: 'hidden',
      position: 'relative',
      cursor: 'crosshair',
      userSelect: 'none',
      WebkitUserSelect: 'none',
      touchAction: 'none',
    }}>
      <canvas
        ref={canvasRef}
        onClick={handleCanvasClick}
        onTouchStart={handleCanvasTouch}
        style={{ position: 'absolute', top: 0, left: 0 }}
      />

      {/* Top HUD */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        paddingTop: 'max(16px, env(safe-area-inset-top, 16px))',
        paddingLeft: 'max(16px, env(safe-area-inset-left, 16px))',
        paddingRight: 'max(16px, env(safe-area-inset-right, 16px))',
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
          {!audioReady ? 'tap to start' : mobile ? 'tap to seed' : 'tap to seed \u00b7 space for new universe'}
        </div>
      </div>

      {/* Matrix overlay */}
      {showMatrix && (
        <div style={{
          position: 'absolute',
          bottom: mobile ? 100 : 80,
          left: '50%',
          transform: 'translateX(-50%)',
          background: '#0a0a0fdd',
          backdropFilter: 'blur(10px)',
          borderRadius: 12,
          padding: mobile ? 12 : 16,
          zIndex: 20,
          border: '1px solid #ffffff10',
          maxWidth: 'calc(100vw - 32px)',
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
          <div style={{ display: 'flex', gap: 1, overflowX: 'auto' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1, marginRight: 4, justifyContent: 'flex-end' }}>
              {COLORS.map((c, i) => (
                <div key={i} style={{
                  width: mobile ? 22 : 28, height: mobile ? 22 : 28,
                  display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
                  fontFamily: 'monospace', fontSize: mobile ? 7 : 8, color: c, paddingRight: 4,
                  flexShrink: 0,
                }}>
                  {COLOR_NAMES[i].slice(0, 3)}
                </div>
              ))}
            </div>
            <div>
              <div style={{ display: 'flex', gap: 1, marginBottom: 2 }}>
                {COLORS.map((c, j) => (
                  <div key={j} style={{
                    width: mobile ? 22 : 28, height: 14,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: 'monospace', fontSize: mobile ? 7 : 8, color: c,
                    flexShrink: 0,
                  }}>
                    {COLOR_NAMES[j].slice(0, 3)}
                  </div>
                ))}
              </div>
              {s.matrix.map((row, i) => (
                <div key={i} style={{ display: 'flex', gap: 1 }}>
                  {row.map((val, j) => {
                    const intensity = Math.abs(val);
                    const hue = val > 0 ? '140' : '0';
                    return (
                      <div
                        key={j}
                        style={{
                          width: mobile ? 22 : 28,
                          height: mobile ? 22 : 28,
                          borderRadius: 4,
                          background: `hsla(${hue}, 70%, 50%, ${intensity * 0.6})`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontFamily: 'monospace',
                          fontSize: mobile ? 6 : 8,
                          color: '#ffffff80',
                          border: '1px solid #ffffff08',
                          flexShrink: 0,
                        }}
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
            green = attract &middot; red = repel
          </div>
        </div>
      )}

      {/* Bottom controls */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingBottom: 'max(20px, env(safe-area-inset-bottom, 20px))',
        display: 'flex',
        justifyContent: 'center',
        gap: 8,
        zIndex: 10,
        opacity: showUI ? 1 : 0,
        transition: 'opacity 0.3s',
        flexWrap: 'wrap',
      }}>
        {[
          { label: 'NEW UNIVERSE', action: newUniverse },
          { label: showMatrix ? 'HIDE RULES' : 'RULES', action: () => { stateRef.current.showMatrix = !showMatrix; setShowMatrix(!showMatrix); } },
          ...(audioReady ? [{ label: muted ? 'UNMUTE' : 'MUTE', action: toggleMute }] : []),
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
              fontSize: mobile ? 11 : 10,
              letterSpacing: 2,
              color: '#ffffff60',
              background: '#ffffff08',
              border: '1px solid #ffffff15',
              borderRadius: 20,
              padding: mobile ? '12px 20px' : '8px 18px',
              cursor: 'pointer',
              textTransform: 'uppercase',
              transition: 'all 0.2s',
              WebkitTapHighlightColor: 'transparent',
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
