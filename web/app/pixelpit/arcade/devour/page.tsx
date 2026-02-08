'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';

const GAME_ID = 'devour';

// Pulse timing (Loop's spec)
const PULSE_EXPAND_MS = 200;
const PULSE_HOLD_MS = 300;
const PULSE_RETRACT_MS = 400;
const PULSE_COOLDOWN_MS = 500;
const PULSE_TOTAL_MS = PULSE_EXPAND_MS + PULSE_HOLD_MS + PULSE_RETRACT_MS;

// Growth milestones
const MILESTONES = [10, 25, 50, 100];

interface OrbitObject {
  id: number;
  orbitRadius: number;
  angle: number;
  angularSpeed: number;
  size: number;
  type: 'debris' | 'asteroid' | 'satellite' | 'moon' | 'planet';
  consumed: boolean;
}

// Audio
let audioCtx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let droneOsc: OscillatorNode | null = null;
let droneGain: GainNode | null = null;

function initAudio() {
  if (audioCtx) return;
  audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  masterGain = audioCtx.createGain();
  masterGain.gain.value = 0.3;
  masterGain.connect(audioCtx.destination);
  if (audioCtx.state === 'suspended') audioCtx.resume();
}

function startDrone() {
  if (!audioCtx || !masterGain || droneOsc) return;
  droneOsc = audioCtx.createOscillator();
  droneOsc.type = 'sine';
  droneOsc.frequency.value = 40;
  droneGain = audioCtx.createGain();
  droneGain.gain.value = 0.08;
  droneOsc.connect(droneGain);
  droneGain.connect(masterGain);
  droneOsc.start();
}

function stopDrone() {
  if (droneOsc) {
    try { droneOsc.stop(); } catch {}
    droneOsc = null;
    droneGain = null;
  }
}

function playPulse() {
  if (!audioCtx || !masterGain) return;
  const t = audioCtx.currentTime;
  // Deep "THOOM"
  const osc = audioCtx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(60, t);
  osc.frequency.exponentialRampToValueAtTime(30, t + 0.3);
  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(0.25, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
  osc.connect(gain);
  gain.connect(masterGain);
  osc.start(t);
  osc.stop(t + 0.4);
}

function playConsume(size: number) {
  if (!audioCtx || !masterGain) return;
  const t = audioCtx.currentTime;
  // Pitch based on size (small = high, big = low)
  const baseFreq = Math.max(60, 400 - size * 30);
  const osc = audioCtx.createOscillator();
  osc.type = 'sine';
  osc.frequency.value = baseFreq;
  const gain = audioCtx.createGain();
  const vol = Math.min(0.15, 0.05 + size * 0.02);
  gain.gain.setValueAtTime(vol, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
  osc.connect(gain);
  gain.connect(masterGain);
  osc.start(t);
  osc.stop(t + 0.2);
}

function playMilestone() {
  if (!audioCtx || !masterGain) return;
  const t = audioCtx.currentTime;
  // Triumphant chord
  const notes = [130.81, 164.81, 196, 261.63];
  notes.forEach((freq, i) => {
    const osc = audioCtx!.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;
    const gain = audioCtx!.createGain();
    gain.gain.setValueAtTime(0, t + i * 0.05);
    gain.gain.linearRampToValueAtTime(0.1, t + i * 0.05 + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.05 + 0.5);
    osc.connect(gain);
    gain.connect(masterGain!);
    osc.start(t + i * 0.05);
    osc.stop(t + i * 0.05 + 0.6);
  });
}

function playDeath() {
  if (!audioCtx || !masterGain) return;
  const t = audioCtx.currentTime;
  // Reverse suck / collapse
  const osc = audioCtx.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(30, t);
  osc.frequency.exponentialRampToValueAtTime(200, t + 0.5);
  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(0.2, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
  osc.connect(gain);
  gain.connect(masterGain);
  osc.start(t);
  osc.stop(t + 0.6);
}

export default function DevourGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<'start' | 'playing' | 'dead'>('start');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [canvasSize, setCanvasSize] = useState({ w: 400, h: 700 });

  const gameRef = useRef({
    running: false,
    // Hole state
    holeSize: 20,
    pulseRadius: 20,
    pulseState: 'idle' as 'idle' | 'expanding' | 'holding' | 'retracting' | 'cooldown',
    pulseTimer: 0,
    maxPulseReach: 80,
    consumeThreshold: 3, // Can eat objects with size <= this
    // Accretion disk
    diskAngle: 0,
    // Objects
    objects: [] as OrbitObject[],
    nextObjectId: 0,
    spawnTimer: 0,
    // Score
    consumed: 0,
    milestone: 0,
    // Effects
    screenPulse: 0,
    comboCount: 0,
    comboTimer: 0,
    particles: [] as { x: number; y: number; vx: number; vy: number; life: number; color: string }[],
  });

  const spawnObject = useCallback((canvasW: number, canvasH: number) => {
    const game = gameRef.current;
    const centerX = canvasW / 2;
    const centerY = canvasH / 2;
    const minRadius = game.holeSize + 50;
    const maxRadius = Math.min(centerX, centerY) - 20;
    
    // Size distribution: mostly small, occasionally big
    const rand = Math.random();
    let size: number;
    let type: OrbitObject['type'];
    
    if (rand < 0.5) {
      size = 1 + Math.random() * 2;
      type = 'debris';
    } else if (rand < 0.8) {
      size = 2 + Math.random() * 2;
      type = 'asteroid';
    } else if (rand < 0.93) {
      size = 4 + Math.random() * 2;
      type = 'satellite';
    } else if (rand < 0.98) {
      size = 6 + Math.random() * 3;
      type = 'moon';
    } else {
      size = 10 + Math.random() * 5;
      type = 'planet';
    }
    
    const orbitRadius = minRadius + Math.random() * (maxRadius - minRadius);
    const angularSpeed = (0.3 + Math.random() * 0.5) * (Math.random() < 0.5 ? 1 : -1);
    
    game.objects.push({
      id: game.nextObjectId++,
      orbitRadius,
      angle: Math.random() * Math.PI * 2,
      angularSpeed,
      size,
      type,
      consumed: false,
    });
  }, []);

  const startGame = useCallback(() => {
    initAudio();
    startDrone();
    const game = gameRef.current;
    game.running = true;
    game.holeSize = 25;
    game.pulseRadius = 25;
    game.pulseState = 'idle';
    game.pulseTimer = 0;
    game.maxPulseReach = 120; // Bigger initial reach
    game.consumeThreshold = 4; // Can eat slightly bigger things
    game.diskAngle = 0;
    game.objects = [];
    game.nextObjectId = 0;
    game.spawnTimer = 0;
    game.consumed = 0;
    game.milestone = 0;
    game.screenPulse = 0;
    game.comboCount = 0;
    game.comboTimer = 0;
    game.particles = [];
    
    // Initial objects - force small debris CLOSE to center for immediate feedback
    const centerX = canvasSize.w / 2;
    const centerY = canvasSize.h / 2;
    // Close debris (guaranteed consumable)
    for (let i = 0; i < 8; i++) {
      game.objects.push({
        id: game.nextObjectId++,
        orbitRadius: 70 + Math.random() * 50, // Close!
        angle: (i / 8) * Math.PI * 2 + Math.random() * 0.3,
        angularSpeed: (0.4 + Math.random() * 0.3) * (Math.random() < 0.5 ? 1 : -1),
        size: 1 + Math.random() * 2, // Small = consumable
        type: 'debris',
        consumed: false,
      });
    }
    // Outer objects (mix of sizes)
    for (let i = 0; i < 10; i++) {
      spawnObject(canvasSize.w, canvasSize.h);
    }
    
    setScore(0);
    setGameState('playing');
  }, [spawnObject, canvasSize]);

  // Handle resize
  useEffect(() => {
    const updateSize = () => {
      setCanvasSize({
        w: window.innerWidth,
        h: window.innerHeight,
      });
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = canvasSize.w;
    canvas.height = canvasSize.h;

    const centerX = canvasSize.w / 2;
    const centerY = canvasSize.h / 2;

    let animationId: number;

    const update = (dt: number) => {
      const game = gameRef.current;
      if (!game.running) return;

      // Update pulse state
      if (game.pulseState !== 'idle' && game.pulseState !== 'cooldown') {
        game.pulseTimer += dt * 1000;
        
        if (game.pulseState === 'expanding') {
          const progress = game.pulseTimer / PULSE_EXPAND_MS;
          game.pulseRadius = game.holeSize + (game.maxPulseReach - game.holeSize) * Math.min(1, progress);
          if (game.pulseTimer >= PULSE_EXPAND_MS) {
            game.pulseState = 'holding';
            game.pulseTimer = 0;
          }
        } else if (game.pulseState === 'holding') {
          game.pulseRadius = game.maxPulseReach;
          if (game.pulseTimer >= PULSE_HOLD_MS) {
            game.pulseState = 'retracting';
            game.pulseTimer = 0;
          }
        } else if (game.pulseState === 'retracting') {
          const progress = game.pulseTimer / PULSE_RETRACT_MS;
          game.pulseRadius = game.maxPulseReach - (game.maxPulseReach - game.holeSize) * Math.min(1, progress);
          if (game.pulseTimer >= PULSE_RETRACT_MS) {
            game.pulseState = 'cooldown';
            game.pulseTimer = 0;
          }
        }
      } else if (game.pulseState === 'cooldown') {
        game.pulseTimer += dt * 1000;
        if (game.pulseTimer >= PULSE_COOLDOWN_MS) {
          game.pulseState = 'idle';
          game.pulseTimer = 0;
        }
      }

      // Update disk rotation
      game.diskAngle += dt * 2;

      // Combo timer
      if (game.comboTimer > 0) {
        game.comboTimer -= dt;
        if (game.comboTimer <= 0) {
          game.comboCount = 0;
        }
      }

      // Screen pulse decay
      if (game.screenPulse > 0) {
        game.screenPulse -= dt * 3;
      }

      // Update objects
      let consumedThisFrame = 0;
      for (const obj of game.objects) {
        if (obj.consumed) continue;
        
        // Orbit
        obj.angle += obj.angularSpeed * dt;
        
        // Check consumption
        if (game.pulseState === 'expanding' || game.pulseState === 'holding') {
          if (obj.orbitRadius <= game.pulseRadius && obj.size <= game.consumeThreshold) {
            obj.consumed = true;
            consumedThisFrame++;
            game.consumed++;
            
            // Add score
            const points = Math.ceil(obj.size);
            setScore(prev => prev + points);
            
            // Particles
            const objX = centerX + Math.cos(obj.angle) * obj.orbitRadius;
            const objY = centerY + Math.sin(obj.angle) * obj.orbitRadius;
            for (let i = 0; i < 5; i++) {
              game.particles.push({
                x: objX,
                y: objY,
                vx: (Math.random() - 0.5) * 100,
                vy: (Math.random() - 0.5) * 100,
                life: 0.5,
                color: obj.type === 'planet' ? '#f59e0b' : obj.type === 'moon' ? '#9ca3af' : '#22d3ee',
              });
            }
            
            playConsume(obj.size);
            
            // Grow
            game.holeSize += obj.size * 0.3;
            game.maxPulseReach = game.holeSize * 4;
            game.consumeThreshold = 3 + Math.floor(game.holeSize / 15);
          }
        }
      }

      // Combo
      if (consumedThisFrame > 0) {
        game.comboCount += consumedThisFrame;
        game.comboTimer = 0.5;
        if (consumedThisFrame >= 3) {
          game.screenPulse = 1;
        }
      }

      // Check milestones
      const currentMilestone = MILESTONES.findIndex(m => game.consumed < m);
      if (currentMilestone > game.milestone) {
        game.milestone = currentMilestone;
        game.screenPulse = 1;
        playMilestone();
      }

      // Remove consumed objects
      game.objects = game.objects.filter(o => !o.consumed);

      // Spawn new objects
      game.spawnTimer += dt;
      const spawnRate = Math.max(0.3, 1 - game.consumed / 100);
      if (game.spawnTimer > spawnRate && game.objects.length < 30) {
        game.spawnTimer = 0;
        spawnObject(canvasSize.w, canvasSize.h);
      }

      // Update particles
      game.particles = game.particles.filter(p => {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        // Pull toward center
        const dx = centerX - p.x;
        const dy = centerY - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        p.vx += (dx / dist) * 200 * dt;
        p.vy += (dy / dist) * 200 * dt;
        p.life -= dt;
        return p.life > 0;
      });

      // Game over check: if no consumable objects for too long
      // (For now, no death condition — endless mode)
    };

    const draw = () => {
      const game = gameRef.current;
      
      // Background
      const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, Math.max(centerX, centerY));
      gradient.addColorStop(0, '#0f0520');
      gradient.addColorStop(1, '#020108');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvasSize.w, canvasSize.h);

      // Screen pulse effect
      if (game.screenPulse > 0) {
        ctx.fillStyle = `rgba(34, 211, 238, ${game.screenPulse * 0.1})`;
        ctx.fillRect(0, 0, canvasSize.w, canvasSize.h);
      }

      // Stars background
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      for (let i = 0; i < 50; i++) {
        const x = (i * 137.5) % canvasSize.w;
        const y = (i * 89.3) % canvasSize.h;
        ctx.beginPath();
        ctx.arc(x, y, 1, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw orbit rings (faint guides)
      ctx.strokeStyle = 'rgba(139, 92, 246, 0.1)';
      ctx.lineWidth = 1;
      for (let r = 80; r < Math.max(centerX, centerY); r += 60) {
        ctx.beginPath();
        ctx.arc(centerX, centerY, r, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Draw objects
      for (const obj of game.objects) {
        const x = centerX + Math.cos(obj.angle) * obj.orbitRadius;
        const y = centerY + Math.sin(obj.angle) * obj.orbitRadius;
        const visualSize = obj.size * 4;
        
        // Can consume indicator
        const canConsume = obj.size <= game.consumeThreshold;
        
        if (obj.type === 'debris') {
          ctx.fillStyle = canConsume ? '#67e8f9' : '#475569';
          ctx.beginPath();
          ctx.arc(x, y, visualSize, 0, Math.PI * 2);
          ctx.fill();
        } else if (obj.type === 'asteroid') {
          ctx.fillStyle = canConsume ? '#a78bfa' : '#64748b';
          ctx.beginPath();
          ctx.arc(x, y, visualSize, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = canConsume ? '#8b5cf6' : '#475569';
          ctx.beginPath();
          ctx.arc(x - visualSize * 0.3, y - visualSize * 0.2, visualSize * 0.4, 0, Math.PI * 2);
          ctx.fill();
        } else if (obj.type === 'satellite') {
          ctx.fillStyle = canConsume ? '#60a5fa' : '#6b7280';
          ctx.fillRect(x - visualSize, y - visualSize * 0.3, visualSize * 2, visualSize * 0.6);
          ctx.fillStyle = canConsume ? '#3b82f6' : '#4b5563';
          ctx.fillRect(x - visualSize * 1.5, y - visualSize * 0.5, visualSize * 0.4, visualSize);
          ctx.fillRect(x + visualSize * 1.1, y - visualSize * 0.5, visualSize * 0.4, visualSize);
        } else if (obj.type === 'moon') {
          ctx.fillStyle = canConsume ? '#e5e7eb' : '#9ca3af';
          ctx.beginPath();
          ctx.arc(x, y, visualSize, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = canConsume ? '#d1d5db' : '#6b7280';
          ctx.beginPath();
          ctx.arc(x + visualSize * 0.3, y - visualSize * 0.2, visualSize * 0.3, 0, Math.PI * 2);
          ctx.fill();
        } else if (obj.type === 'planet') {
          // Glow
          if (canConsume) {
            ctx.shadowColor = '#f59e0b';
            ctx.shadowBlur = 20;
          }
          ctx.fillStyle = canConsume ? '#f59e0b' : '#78716c';
          ctx.beginPath();
          ctx.arc(x, y, visualSize, 0, Math.PI * 2);
          ctx.fill();
          // Bands
          ctx.strokeStyle = canConsume ? '#d97706' : '#57534e';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(x, y, visualSize * 0.7, 0.2, Math.PI - 0.2);
          ctx.stroke();
          ctx.shadowBlur = 0;
        }
      }

      // Draw particles
      for (const p of game.particles) {
        ctx.fillStyle = `rgba(${p.color === '#22d3ee' ? '34, 211, 238' : p.color === '#f59e0b' ? '245, 158, 11' : '156, 163, 175'}, ${p.life * 2})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw pulse range (when active) - VERY VISIBLE
      if (game.pulseState !== 'idle' && game.pulseState !== 'cooldown') {
        // Bright outer ring
        ctx.strokeStyle = '#a78bfa';
        ctx.lineWidth = 6;
        ctx.shadowColor = '#8b5cf6';
        ctx.shadowBlur = 20;
        ctx.beginPath();
        ctx.arc(centerX, centerY, game.pulseRadius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.shadowBlur = 0;
        
        // Pulsing inner fill
        const pulseAlpha = game.pulseState === 'expanding' ? 0.4 : 0.25;
        const pulseGrad = ctx.createRadialGradient(centerX, centerY, game.holeSize, centerX, centerY, game.pulseRadius);
        pulseGrad.addColorStop(0, `rgba(139, 92, 246, ${pulseAlpha})`);
        pulseGrad.addColorStop(0.7, `rgba(139, 92, 246, ${pulseAlpha * 0.5})`);
        pulseGrad.addColorStop(1, 'rgba(139, 92, 246, 0)');
        ctx.fillStyle = pulseGrad;
        ctx.beginPath();
        ctx.arc(centerX, centerY, game.pulseRadius, 0, Math.PI * 2);
        ctx.fill();
        
        // Flash at start of pulse
        if (game.pulseState === 'expanding' && game.pulseTimer < 50) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
          ctx.beginPath();
          ctx.arc(centerX, centerY, game.pulseRadius * 0.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Draw black hole
      // Outer glow / accretion disk
      const diskSize = game.holeSize * 2.5;
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(game.diskAngle);
      
      // Disk gradient
      const diskGrad = ctx.createRadialGradient(0, 0, game.holeSize * 0.8, 0, 0, diskSize);
      diskGrad.addColorStop(0, 'rgba(249, 115, 22, 0.8)');
      diskGrad.addColorStop(0.3, 'rgba(239, 68, 68, 0.5)');
      diskGrad.addColorStop(0.6, 'rgba(168, 85, 247, 0.3)');
      diskGrad.addColorStop(1, 'rgba(168, 85, 247, 0)');
      
      ctx.fillStyle = diskGrad;
      ctx.beginPath();
      ctx.ellipse(0, 0, diskSize, diskSize * 0.4, 0, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.restore();

      // Event horizon (black center)
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.arc(centerX, centerY, game.holeSize * 0.7, 0, Math.PI * 2);
      ctx.fill();

      // "Eyes" - bright spots
      const eyeOffset = game.holeSize * 0.25;
      const eyeSize = game.holeSize * 0.12;
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.arc(centerX - eyeOffset, centerY - eyeOffset * 0.3, eyeSize, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(centerX + eyeOffset, centerY - eyeOffset * 0.3, eyeSize * 0.8, 0, Math.PI * 2);
      ctx.fill();

      // UI
      ctx.fillStyle = '#FFF';
      ctx.font = 'bold 28px ui-monospace';
      ctx.textAlign = 'center';
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = 4;
      ctx.fillText(`${score}`, centerX, 50);
      
      ctx.font = '16px ui-monospace';
      ctx.fillText(`HI: ${highScore}`, centerX, 75);
      
      // Consumed count
      ctx.fillStyle = '#a78bfa';
      ctx.fillText(`🕳️ ${game.consumed}`, centerX, 100);
      
      // Cooldown indicator
      if (game.pulseState === 'cooldown') {
        const cooldownProgress = game.pulseTimer / PULSE_COOLDOWN_MS;
        ctx.fillStyle = 'rgba(139, 92, 246, 0.5)';
        ctx.fillRect(centerX - 30, canvasSize.h - 60, 60 * cooldownProgress, 8);
        ctx.strokeStyle = '#8b5cf6';
        ctx.lineWidth = 1;
        ctx.strokeRect(centerX - 30, canvasSize.h - 60, 60, 8);
      }
      
      ctx.shadowBlur = 0;

      // Combo display
      if (game.comboCount >= 3) {
        ctx.fillStyle = '#22d3ee';
        ctx.font = 'bold 24px ui-monospace';
        ctx.fillText(`COMBO x${game.comboCount}!`, centerX, 130);
      }

      // Tap hint
      if (game.consumed === 0) {
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.font = '16px ui-monospace';
        ctx.fillText('TAP TO PULSE', centerX, canvasSize.h - 100);
      }
    };

    let lastTime = 0;
    const gameLoop = (timestamp: number) => {
      const dt = Math.min((timestamp - lastTime) / 1000, 0.05);
      lastTime = timestamp;
      update(dt);
      draw();
      animationId = requestAnimationFrame(gameLoop);
    };
    animationId = requestAnimationFrame(gameLoop);

    // Input handling
    const handlePulse = () => {
      const game = gameRef.current;
      if (!game.running) return;
      if (game.pulseState === 'idle') {
        game.pulseState = 'expanding';
        game.pulseTimer = 0;
        playPulse();
      }
    };

    const handleTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      handlePulse();
    };

    const handlePointerDown = (e: PointerEvent) => {
      e.preventDefault();
      handlePulse();
    };

    const handleClick = () => {
      handlePulse();
    };

    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('pointerdown', handlePointerDown, { passive: false });
    canvas.addEventListener('click', handleClick);

    return () => {
      cancelAnimationFrame(animationId);
      stopDrone();
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('pointerdown', handlePointerDown);
      canvas.removeEventListener('click', handleClick);
    };
  }, [gameState, canvasSize, spawnObject, highScore]);

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: '#020108',
      fontFamily: 'ui-monospace, monospace',
    }}>
      {gameState === 'start' && (
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 20,
          background: 'radial-gradient(circle at center, #0f0520 0%, #020108 100%)',
        }}>
          <div style={{ fontSize: 80, marginBottom: 10 }}>🕳️</div>
          <h1 style={{
            color: '#E5E7EB',
            fontSize: 48,
            marginBottom: 10,
            fontWeight: 900,
          }}>
            DEVOUR
          </h1>

          <p style={{
            color: '#9CA3AF',
            fontSize: 16,
            marginBottom: 30,
            textAlign: 'center',
            lineHeight: 1.6,
            maxWidth: 280,
          }}>
            Tap to pulse your gravity.<br />
            Consume what orbits you.<br />
            Grow. Devour. Expand.
          </p>

          <button
            onClick={startGame}
            style={{
              background: '#8B5CF6',
              color: '#fff',
              border: 'none',
              padding: '18px 60px',
              fontSize: 18,
              fontWeight: 700,
              cursor: 'pointer',
              borderRadius: 30,
              boxShadow: '0 4px 15px rgba(139, 92, 246, 0.4)',
            }}
          >
            BEGIN
          </button>
          
          {highScore > 0 && (
            <p style={{ color: '#6B7280', marginTop: 20 }}>
              High Score: {highScore}
            </p>
          )}
        </div>
      )}

      {gameState === 'playing' && (
        <canvas
          ref={canvasRef}
          style={{
            display: 'block',
            touchAction: 'none',
          }}
        />
      )}

      {gameState === 'dead' && (
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(0,0,0,0.9)',
        }}>
          <div style={{ fontSize: 60, marginBottom: 10 }}>💥</div>
          <h1 style={{ color: '#E5E7EB', fontSize: 48, marginBottom: 10 }}>
            COLLAPSED
          </h1>
          <p style={{ color: '#E5E7EB', fontSize: 24, marginBottom: 10 }}>
            Score: {score}
          </p>
          <p style={{ color: '#a78bfa', fontSize: 18, marginBottom: 20 }}>
            Objects consumed: {gameRef.current.consumed}
          </p>
          {score >= highScore && score > 0 && (
            <p style={{ color: '#22D3EE', fontSize: 18, marginBottom: 20 }}>
              NEW HIGH SCORE!
            </p>
          )}
          <button
            onClick={startGame}
            style={{
              background: '#8B5CF6',
              color: '#fff',
              border: 'none',
              padding: '16px 50px',
              fontSize: 18,
              fontWeight: 600,
              cursor: 'pointer',
              borderRadius: 30,
            }}
          >
            TRY AGAIN
          </button>
        </div>
      )}
    </div>
  );
}
