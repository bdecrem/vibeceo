'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';

const GAME_ID = 'devour';
const GAME_DURATION = 60; // seconds

// Pulse timing
const PULSE_EXPAND_MS = 150;
const PULSE_HOLD_MS = 200;
const PULSE_RETRACT_MS = 250;
const PULSE_COOLDOWN_MS = 400;

interface GameObject {
  id: number;
  x: number;
  y: number;
  size: number;
  type: 'debris' | 'asteroid' | 'satellite' | 'moon' | 'planet';
  consumed: boolean;
  respawnTimer: number;
}

interface Hole {
  x: number;
  y: number;
  size: number;
  pulseRadius: number;
  pulseState: 'idle' | 'expanding' | 'holding' | 'retracting' | 'cooldown';
  pulseTimer: number;
  diskAngle: number;
}

// Audio
let audioCtx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let droneOsc: OscillatorNode | null = null;

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
  droneOsc.frequency.value = 35;
  const droneGain = audioCtx.createGain();
  droneGain.gain.value = 0.06;
  droneOsc.connect(droneGain);
  droneGain.connect(masterGain);
  droneOsc.start();
}

function stopDrone() {
  if (droneOsc) {
    try { droneOsc.stop(); } catch {}
    droneOsc = null;
  }
}

function playPulse() {
  if (!audioCtx || !masterGain) return;
  const t = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(55, t);
  osc.frequency.exponentialRampToValueAtTime(25, t + 0.25);
  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(0.2, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
  osc.connect(gain);
  gain.connect(masterGain);
  osc.start(t);
  osc.stop(t + 0.3);
}

function playConsume(size: number) {
  if (!audioCtx || !masterGain) return;
  const t = audioCtx.currentTime;
  const baseFreq = Math.max(80, 350 - size * 25);
  const osc = audioCtx.createOscillator();
  osc.type = 'sine';
  osc.frequency.value = baseFreq;
  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(0.1, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
  osc.connect(gain);
  gain.connect(masterGain);
  osc.start(t);
  osc.stop(t + 0.15);
}

function playWin() {
  if (!audioCtx || !masterGain) return;
  const t = audioCtx.currentTime;
  [261.63, 329.63, 392, 523.25].forEach((freq, i) => {
    const osc = audioCtx!.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;
    const gain = audioCtx!.createGain();
    gain.gain.setValueAtTime(0, t + i * 0.1);
    gain.gain.linearRampToValueAtTime(0.12, t + i * 0.1 + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.1 + 0.4);
    osc.connect(gain);
    gain.connect(masterGain!);
    osc.start(t + i * 0.1);
    osc.stop(t + i * 0.1 + 0.5);
  });
}

function playLose() {
  if (!audioCtx || !masterGain) return;
  const t = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(200, t);
  osc.frequency.exponentialRampToValueAtTime(50, t + 0.5);
  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(0.15, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
  osc.connect(gain);
  gain.connect(masterGain);
  osc.start(t);
  osc.stop(t + 0.6);
}

export default function DevourGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<'start' | 'playing' | 'end'>('start');
  const [winner, setWinner] = useState<'player' | 'rival' | 'tie'>('player');
  const [canvasSize, setCanvasSize] = useState({ w: 400, h: 700 });

  const gameRef = useRef({
    running: false,
    timer: GAME_DURATION,
    // Player hole
    player: {
      x: 0, y: 0, size: 30,
      pulseRadius: 30,
      pulseState: 'idle' as Hole['pulseState'],
      pulseTimer: 0,
      diskAngle: 0,
    } as Hole,
    // AI rival hole
    rival: {
      x: 0, y: 0, size: 30,
      pulseRadius: 30,
      pulseState: 'idle' as Hole['pulseState'],
      pulseTimer: 0,
      diskAngle: 0,
    } as Hole,
    // Movement
    isDragging: false,
    targetX: 0,
    targetY: 0,
    // Objects
    objects: [] as GameObject[],
    nextObjectId: 0,
    // Particles
    particles: [] as { x: number; y: number; vx: number; vy: number; life: number; color: string; targetX: number; targetY: number }[],
  });

  const spawnObject = useCallback((canvasW: number, canvasH: number, existingObjects: GameObject[]) => {
    const margin = 40;
    let x, y;
    let attempts = 0;
    
    // Find a spot not too close to either hole or existing objects
    do {
      x = margin + Math.random() * (canvasW - margin * 2);
      y = margin + Math.random() * (canvasH - margin * 2);
      attempts++;
    } while (attempts < 20 && existingObjects.some(o => 
      Math.hypot(o.x - x, o.y - y) < 40
    ));
    
    // Size distribution
    const rand = Math.random();
    let size: number;
    let type: GameObject['type'];
    
    if (rand < 0.45) {
      size = 1 + Math.random() * 1.5;
      type = 'debris';
    } else if (rand < 0.75) {
      size = 2 + Math.random() * 2;
      type = 'asteroid';
    } else if (rand < 0.9) {
      size = 3 + Math.random() * 2;
      type = 'satellite';
    } else if (rand < 0.97) {
      size = 5 + Math.random() * 2;
      type = 'moon';
    } else {
      size = 7 + Math.random() * 3;
      type = 'planet';
    }
    
    return {
      id: gameRef.current.nextObjectId++,
      x, y, size, type,
      consumed: false,
      respawnTimer: 0,
    };
  }, []);

  const startGame = useCallback(() => {
    initAudio();
    startDrone();
    const game = gameRef.current;
    game.running = true;
    game.timer = GAME_DURATION;
    
    // Position holes on opposite sides
    const centerX = canvasSize.w / 2;
    const centerY = canvasSize.h / 2;
    
    game.player = {
      x: centerX - 80,
      y: centerY + 100,
      size: 15,
      pulseRadius: 15,
      pulseState: 'idle',
      pulseTimer: 0,
      diskAngle: 0,
    };
    game.targetX = game.player.x;
    game.targetY = game.player.y;
    
    game.rival = {
      x: centerX + 80,
      y: centerY - 100,
      size: 15,
      pulseRadius: 15,
      pulseState: 'idle',
      pulseTimer: 0,
      diskAngle: 0,
    };
    
    game.isDragging = false;
    game.objects = [];
    game.nextObjectId = 0;
    game.particles = [];
    
    // Spawn initial objects
    for (let i = 0; i < 20; i++) {
      game.objects.push(spawnObject(canvasSize.w, canvasSize.h, game.objects));
    }
    
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

    let animationId: number;

    const getMaxPulseReach = (hole: Hole) => hole.size * 3;
    const getConsumeThreshold = (hole: Hole) => 1.5 + Math.floor(hole.size / 8);

    const updatePulse = (hole: Hole, dt: number) => {
      if (hole.pulseState !== 'idle' && hole.pulseState !== 'cooldown') {
        hole.pulseTimer += dt * 1000;
        const maxReach = getMaxPulseReach(hole);
        
        if (hole.pulseState === 'expanding') {
          const progress = hole.pulseTimer / PULSE_EXPAND_MS;
          hole.pulseRadius = hole.size + (maxReach - hole.size) * Math.min(1, progress);
          if (hole.pulseTimer >= PULSE_EXPAND_MS) {
            hole.pulseState = 'holding';
            hole.pulseTimer = 0;
          }
        } else if (hole.pulseState === 'holding') {
          hole.pulseRadius = maxReach;
          if (hole.pulseTimer >= PULSE_HOLD_MS) {
            hole.pulseState = 'retracting';
            hole.pulseTimer = 0;
          }
        } else if (hole.pulseState === 'retracting') {
          const progress = hole.pulseTimer / PULSE_RETRACT_MS;
          hole.pulseRadius = maxReach - (maxReach - hole.size) * Math.min(1, progress);
          if (hole.pulseTimer >= PULSE_RETRACT_MS) {
            hole.pulseState = 'cooldown';
            hole.pulseTimer = 0;
          }
        }
      } else if (hole.pulseState === 'cooldown') {
        hole.pulseTimer += dt * 1000;
        if (hole.pulseTimer >= PULSE_COOLDOWN_MS) {
          hole.pulseState = 'idle';
          hole.pulseTimer = 0;
        }
      }
      hole.diskAngle += dt * 2;
    };

    const checkConsumption = (hole: Hole, isPlayer: boolean) => {
      const game = gameRef.current;
      if (hole.pulseState !== 'expanding' && hole.pulseState !== 'holding') return;
      
      const threshold = getConsumeThreshold(hole);
      
      for (const obj of game.objects) {
        if (obj.consumed) continue;
        
        const dist = Math.hypot(obj.x - hole.x, obj.y - hole.y);
        if (dist <= hole.pulseRadius && obj.size <= threshold) {
          obj.consumed = true;
          obj.respawnTimer = 2; // Respawn after 2 seconds
          
          // Grow the hole (diminishing returns - small objects matter less as you grow)
          const growth = obj.size / (hole.size * 0.15);
          hole.size += growth;
          
          // Particles toward the hole
          for (let i = 0; i < 4; i++) {
            game.particles.push({
              x: obj.x,
              y: obj.y,
              vx: (Math.random() - 0.5) * 50,
              vy: (Math.random() - 0.5) * 50,
              life: 0.4,
              color: obj.type === 'planet' ? '#f59e0b' : obj.type === 'moon' ? '#9ca3af' : '#22d3ee',
              targetX: hole.x,
              targetY: hole.y,
            });
          }
          
          if (isPlayer) {
            playConsume(obj.size);
          }
        }
      }
    };

    const updateAI = (dt: number) => {
      const game = gameRef.current;
      const rival = game.rival;
      const threshold = getConsumeThreshold(rival);
      
      // Find nearest consumable object
      let nearestDist = Infinity;
      let nearestObj: GameObject | null = null;
      
      for (const obj of game.objects) {
        if (obj.consumed || obj.size > threshold) continue;
        const dist = Math.hypot(obj.x - rival.x, obj.y - rival.y);
        if (dist < nearestDist) {
          nearestDist = dist;
          nearestObj = obj;
        }
      }
      
      if (nearestObj) {
        // Move toward it
        const dx = nearestObj.x - rival.x;
        const dy = nearestObj.y - rival.y;
        const dist = Math.hypot(dx, dy);
        
        if (dist > 5) {
          const speed = 100 + rival.size * 0.5; // Bigger = slightly faster
          rival.x += (dx / dist) * speed * dt;
          rival.y += (dy / dist) * speed * dt;
        }
        
        // Pulse when close enough
        if (dist < getMaxPulseReach(rival) && rival.pulseState === 'idle') {
          rival.pulseState = 'expanding';
          rival.pulseTimer = 0;
        }
      }
      
      // Keep in bounds
      const margin = 30;
      rival.x = Math.max(margin, Math.min(canvasSize.w - margin, rival.x));
      rival.y = Math.max(margin, Math.min(canvasSize.h - margin, rival.y));
    };

    const update = (dt: number) => {
      const game = gameRef.current;
      if (!game.running) return;

      // Timer
      game.timer -= dt;
      if (game.timer <= 0) {
        game.timer = 0;
        game.running = false;
        stopDrone();
        
        // Determine winner
        if (game.player.size > game.rival.size) {
          setWinner('player');
          playWin();
        } else if (game.rival.size > game.player.size) {
          setWinner('rival');
          playLose();
        } else {
          setWinner('tie');
        }
        
        setGameState('end');
        fetch('/api/pixelpit/stats', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ game: GAME_ID }),
        }).catch(() => {});
        return;
      }

      // Player movement (smooth toward target)
      if (game.isDragging) {
        const dx = game.targetX - game.player.x;
        const dy = game.targetY - game.player.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 2) {
          const speed = 150;
          game.player.x += (dx / dist) * speed * dt;
          game.player.y += (dy / dist) * speed * dt;
        }
      }

      // Keep player in bounds
      const margin = 30;
      game.player.x = Math.max(margin, Math.min(canvasSize.w - margin, game.player.x));
      game.player.y = Math.max(margin, Math.min(canvasSize.h - margin, game.player.y));

      // Update pulses
      updatePulse(game.player, dt);
      updatePulse(game.rival, dt);

      // AI behavior
      updateAI(dt);

      // Check consumption
      checkConsumption(game.player, true);
      checkConsumption(game.rival, false);

      // Respawn objects
      for (const obj of game.objects) {
        if (obj.consumed) {
          obj.respawnTimer -= dt;
          if (obj.respawnTimer <= 0) {
            // Respawn at new location
            const newObj = spawnObject(canvasSize.w, canvasSize.h, game.objects);
            obj.x = newObj.x;
            obj.y = newObj.y;
            obj.size = newObj.size;
            obj.type = newObj.type;
            obj.consumed = false;
          }
        }
      }

      // Update particles
      game.particles = game.particles.filter(p => {
        // Pull toward target hole
        const dx = p.targetX - p.x;
        const dy = p.targetY - p.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 5) {
          p.vx += (dx / dist) * 400 * dt;
          p.vy += (dy / dist) * 400 * dt;
        }
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.life -= dt;
        return p.life > 0;
      });
    };

    const drawHole = (hole: Hole, isPlayer: boolean) => {
      const color = isPlayer ? '#8b5cf6' : '#ef4444';
      const glowColor = isPlayer ? 'rgba(139, 92, 246, 0.3)' : 'rgba(239, 68, 68, 0.3)';
      
      // Pulse range
      if (hole.pulseState !== 'idle' && hole.pulseState !== 'cooldown') {
        ctx.strokeStyle = color;
        ctx.lineWidth = 4;
        ctx.shadowColor = color;
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(hole.x, hole.y, hole.pulseRadius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.shadowBlur = 0;
        
        // Fill
        const grad = ctx.createRadialGradient(hole.x, hole.y, hole.size, hole.x, hole.y, hole.pulseRadius);
        grad.addColorStop(0, glowColor);
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(hole.x, hole.y, hole.pulseRadius, 0, Math.PI * 2);
        ctx.fill();
      }
      
      // Accretion disk
      const diskSize = hole.size * 1.8;
      ctx.save();
      ctx.translate(hole.x, hole.y);
      ctx.rotate(hole.diskAngle);
      
      const diskGrad = ctx.createRadialGradient(0, 0, hole.size * 0.6, 0, 0, diskSize);
      if (isPlayer) {
        diskGrad.addColorStop(0, 'rgba(249, 115, 22, 0.7)');
        diskGrad.addColorStop(0.4, 'rgba(168, 85, 247, 0.4)');
        diskGrad.addColorStop(1, 'transparent');
      } else {
        diskGrad.addColorStop(0, 'rgba(239, 68, 68, 0.7)');
        diskGrad.addColorStop(0.4, 'rgba(251, 146, 60, 0.4)');
        diskGrad.addColorStop(1, 'transparent');
      }
      
      ctx.fillStyle = diskGrad;
      ctx.beginPath();
      ctx.ellipse(0, 0, diskSize, diskSize * 0.35, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      
      // Event horizon
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.arc(hole.x, hole.y, hole.size * 0.6, 0, Math.PI * 2);
      ctx.fill();
      
      // Eyes
      const eyeOffset = hole.size * 0.2;
      const eyeSize = hole.size * 0.1;
      ctx.fillStyle = isPlayer ? '#fbbf24' : '#fca5a5';
      ctx.beginPath();
      ctx.arc(hole.x - eyeOffset, hole.y - eyeOffset * 0.2, eyeSize, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(hole.x + eyeOffset, hole.y - eyeOffset * 0.2, eyeSize * 0.8, 0, Math.PI * 2);
      ctx.fill();
      
      // Size label
      ctx.fillStyle = isPlayer ? '#a78bfa' : '#fca5a5';
      ctx.font = 'bold 14px ui-monospace';
      ctx.textAlign = 'center';
      ctx.fillText(Math.floor(hole.size).toString(), hole.x, hole.y + hole.size + 20);
    };

    const draw = () => {
      const game = gameRef.current;
      
      // Background
      const gradient = ctx.createRadialGradient(
        canvasSize.w / 2, canvasSize.h / 2, 0,
        canvasSize.w / 2, canvasSize.h / 2, Math.max(canvasSize.w, canvasSize.h)
      );
      gradient.addColorStop(0, '#0f0520');
      gradient.addColorStop(1, '#020108');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvasSize.w, canvasSize.h);

      // Stars
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      for (let i = 0; i < 60; i++) {
        const x = (i * 137.5) % canvasSize.w;
        const y = (i * 89.3) % canvasSize.h;
        ctx.beginPath();
        ctx.arc(x, y, 1, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw objects
      const playerThreshold = getConsumeThreshold(game.player);
      
      for (const obj of game.objects) {
        if (obj.consumed) continue;
        
        const canConsume = obj.size <= playerThreshold;
        const visualSize = obj.size * 4;
        
        if (obj.type === 'debris') {
          ctx.fillStyle = canConsume ? '#67e8f9' : '#475569';
          ctx.beginPath();
          ctx.arc(obj.x, obj.y, visualSize, 0, Math.PI * 2);
          ctx.fill();
        } else if (obj.type === 'asteroid') {
          ctx.fillStyle = canConsume ? '#a78bfa' : '#64748b';
          ctx.beginPath();
          ctx.arc(obj.x, obj.y, visualSize, 0, Math.PI * 2);
          ctx.fill();
        } else if (obj.type === 'satellite') {
          ctx.fillStyle = canConsume ? '#60a5fa' : '#6b7280';
          ctx.fillRect(obj.x - visualSize, obj.y - visualSize * 0.3, visualSize * 2, visualSize * 0.6);
          ctx.fillRect(obj.x - visualSize * 1.3, obj.y - visualSize * 0.5, visualSize * 0.3, visualSize);
          ctx.fillRect(obj.x + visualSize, obj.y - visualSize * 0.5, visualSize * 0.3, visualSize);
        } else if (obj.type === 'moon') {
          ctx.fillStyle = canConsume ? '#e5e7eb' : '#9ca3af';
          ctx.beginPath();
          ctx.arc(obj.x, obj.y, visualSize, 0, Math.PI * 2);
          ctx.fill();
        } else if (obj.type === 'planet') {
          if (canConsume) {
            ctx.shadowColor = '#f59e0b';
            ctx.shadowBlur = 15;
          }
          ctx.fillStyle = canConsume ? '#f59e0b' : '#78716c';
          ctx.beginPath();
          ctx.arc(obj.x, obj.y, visualSize, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      }

      // Draw particles
      for (const p of game.particles) {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.life * 2;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // Draw holes (rival first so player is on top)
      drawHole(game.rival, false);
      drawHole(game.player, true);

      // UI - Timer (big, centered at top)
      const timerSecs = Math.ceil(game.timer);
      ctx.fillStyle = timerSecs <= 10 ? '#ef4444' : '#fff';
      ctx.font = 'bold 48px ui-monospace';
      ctx.textAlign = 'center';
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = 4;
      ctx.fillText(timerSecs.toString(), canvasSize.w / 2, 60);
      
      // Size comparison bar
      const barWidth = 200;
      const barHeight = 20;
      const barX = (canvasSize.w - barWidth) / 2;
      const barY = 80;
      const total = game.player.size + game.rival.size;
      const playerRatio = game.player.size / total;
      
      // Bar background
      ctx.fillStyle = '#27272a';
      ctx.fillRect(barX, barY, barWidth, barHeight);
      
      // Player portion (left, purple)
      ctx.fillStyle = '#8b5cf6';
      ctx.fillRect(barX, barY, barWidth * playerRatio, barHeight);
      
      // Rival portion (right, red)
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(barX + barWidth * playerRatio, barY, barWidth * (1 - playerRatio), barHeight);
      
      // Labels
      ctx.font = 'bold 14px ui-monospace';
      ctx.fillStyle = '#a78bfa';
      ctx.textAlign = 'left';
      ctx.fillText(`YOU: ${Math.floor(game.player.size)}`, barX, barY + barHeight + 18);
      ctx.fillStyle = '#fca5a5';
      ctx.textAlign = 'right';
      ctx.fillText(`RIVAL: ${Math.floor(game.rival.size)}`, barX + barWidth, barY + barHeight + 18);
      
      ctx.shadowBlur = 0;

      // Instructions (brief, at bottom)
      if (game.timer > GAME_DURATION - 5) {
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.font = '14px ui-monospace';
        ctx.textAlign = 'center';
        ctx.fillText('DRAG to move • TAP to pulse', canvasSize.w / 2, canvasSize.h - 40);
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
    const getPos = (e: Touch | PointerEvent | MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      return {
        x: (e as any).clientX - rect.left,
        y: (e as any).clientY - rect.top,
      };
    };

    const handleStart = (x: number, y: number) => {
      const game = gameRef.current;
      if (!game.running) return;
      game.isDragging = true;
      game.targetX = x;
      game.targetY = y;
    };

    const handleMove = (x: number, y: number) => {
      const game = gameRef.current;
      if (!game.running || !game.isDragging) return;
      game.targetX = x;
      game.targetY = y;
    };

    const handleEnd = () => {
      const game = gameRef.current;
      game.isDragging = false;
    };

    const handleTap = () => {
      const game = gameRef.current;
      if (!game.running) return;
      if (game.player.pulseState === 'idle') {
        game.player.pulseState = 'expanding';
        game.player.pulseTimer = 0;
        playPulse();
      }
    };

    let lastTapTime = 0;
    const TAP_THRESHOLD = 200; // ms

    const handlePointerDown = (e: PointerEvent) => {
      e.preventDefault();
      const pos = getPos(e);
      handleStart(pos.x, pos.y);
      lastTapTime = Date.now();
    };

    const handlePointerMove = (e: PointerEvent) => {
      e.preventDefault();
      const pos = getPos(e);
      handleMove(pos.x, pos.y);
    };

    const handlePointerUp = (e: PointerEvent) => {
      e.preventDefault();
      handleEnd();
      // If short tap (not a drag), trigger pulse
      if (Date.now() - lastTapTime < TAP_THRESHOLD) {
        handleTap();
      }
    };

    const handleTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      if (e.touches.length > 0) {
        const pos = getPos(e.touches[0]);
        handleStart(pos.x, pos.y);
        lastTapTime = Date.now();
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      if (e.touches.length > 0) {
        const pos = getPos(e.touches[0]);
        handleMove(pos.x, pos.y);
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      e.preventDefault();
      handleEnd();
      if (Date.now() - lastTapTime < TAP_THRESHOLD) {
        handleTap();
      }
    };

    canvas.addEventListener('pointerdown', handlePointerDown, { passive: false });
    canvas.addEventListener('pointermove', handlePointerMove, { passive: false });
    canvas.addEventListener('pointerup', handlePointerUp, { passive: false });
    canvas.addEventListener('pointercancel', handlePointerUp, { passive: false });
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd, { passive: false });

    return () => {
      cancelAnimationFrame(animationId);
      stopDrone();
      canvas.removeEventListener('pointerdown', handlePointerDown);
      canvas.removeEventListener('pointermove', handlePointerMove);
      canvas.removeEventListener('pointerup', handlePointerUp);
      canvas.removeEventListener('pointercancel', handlePointerUp);
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchmove', handleTouchMove);
      canvas.removeEventListener('touchend', handleTouchEnd);
    };
  }, [gameState, canvasSize, spawnObject]);

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
            Drag to hunt.<br />
            Tap to devour.<br />
            Beat the rival hole.
          </p>

          <div style={{
            display: 'flex',
            gap: 30,
            marginBottom: 30,
            fontSize: 40,
          }}>
            <div style={{ textAlign: 'center' }}>
              <div>🟣</div>
              <div style={{ fontSize: 12, color: '#a78bfa', marginTop: 5 }}>YOU</div>
            </div>
            <div style={{ fontSize: 24, color: '#6b7280', alignSelf: 'center' }}>vs</div>
            <div style={{ textAlign: 'center' }}>
              <div>🔴</div>
              <div style={{ fontSize: 12, color: '#fca5a5', marginTop: 5 }}>RIVAL</div>
            </div>
          </div>

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

      {gameState === 'end' && (
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(0,0,0,0.9)',
        }}>
          <div style={{ fontSize: 60, marginBottom: 10 }}>
            {winner === 'player' ? '🏆' : winner === 'rival' ? '💀' : '🤝'}
          </div>
          <h1 style={{ 
            color: winner === 'player' ? '#a78bfa' : winner === 'rival' ? '#ef4444' : '#fbbf24', 
            fontSize: 48, 
            marginBottom: 20 
          }}>
            {winner === 'player' ? 'YOU WIN!' : winner === 'rival' ? 'RIVAL WINS' : 'TIE!'}
          </h1>
          
          <div style={{
            display: 'flex',
            gap: 40,
            marginBottom: 30,
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ color: '#a78bfa', fontSize: 14 }}>YOU</div>
              <div style={{ color: '#fff', fontSize: 32, fontWeight: 'bold' }}>
                {Math.floor(gameRef.current.player.size)}
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ color: '#fca5a5', fontSize: 14 }}>RIVAL</div>
              <div style={{ color: '#fff', fontSize: 32, fontWeight: 'bold' }}>
                {Math.floor(gameRef.current.rival.size)}
              </div>
            </div>
          </div>

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
            PLAY AGAIN
          </button>
        </div>
      )}
    </div>
  );
}
