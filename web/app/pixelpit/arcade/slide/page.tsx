'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import Script from 'next/script';
import {
  ScoreFlow,
  Leaderboard,
  ShareButtonContainer,
  usePixelpitSocial,
  type ScoreFlowColors,
  type LeaderboardColors,
} from '@/app/pixelpit/components';

const GAME_ID = 'slide';

// Zone configs (time-based)
const ZONES = [
  { name: 'Dawn', sky1: '#fdf4ff', sky2: '#fce7f3', snow: '#f8fafc', accent: '#f472b6' },
  { name: 'Day', sky1: '#e0f2fe', sky2: '#bae6fd', snow: '#f1f5f9', accent: '#22d3ee' },
  { name: 'Golden Hour', sky1: '#fef3c7', sky2: '#fdba74', snow: '#fef9c3', accent: '#facc15' },
  { name: 'Twilight', sky1: '#c4b5fd', sky2: '#4c1d95', snow: '#e0e7ff', accent: '#a78bfa' },
];

const DAY_LENGTH = 90; // seconds
const ZONE_DURATION = DAY_LENGTH / 4;

// Physics (from Loop's spec)
const BASE_GRAVITY = 0.4;
const DIVE_BOOST = 0.25;
const MAX_VELOCITY = 16;
const FRICTION = 0.98;
const AIR_FRICTION = 0.995;

// Bounce detection windows
const PERFECT_WINDOW = 80; // ms
const GOOD_WINDOW = 200; // ms

// Social colors
const SCORE_FLOW_COLORS: ScoreFlowColors = {
  bg: '#fdf4ff',
  surface: '#ffffff',
  primary: '#f472b6',
  secondary: '#22d3ee',
  text: '#18181b',
  muted: '#64748b',
  error: '#ef4444',
};

const LEADERBOARD_COLORS: LeaderboardColors = {
  bg: '#fdf4ff',
  surface: '#ffffff',
  primary: '#f472b6',
  secondary: '#22d3ee',
  text: '#18181b',
  muted: '#64748b',
};

// Audio
let audioCtx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let musicPlaying = false;

function initAudio() {
  if (audioCtx) return;
  audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  masterGain = audioCtx.createGain();
  masterGain.gain.value = 0.4;
  masterGain.connect(audioCtx.destination);
  if (audioCtx.state === 'suspended') audioCtx.resume();
}

function startMusic() {
  if (!audioCtx || !masterGain || musicPlaying) return;
  musicPlaying = true;
  
  const bpm = 110;
  const beatMs = 60000 / bpm;
  const notes = [523.25, 659.25, 784, 659.25]; // C5, E5, G5, E5
  let noteIndex = 0;
  
  function playNote() {
    if (!audioCtx || !masterGain || !musicPlaying) return;
    
    const t = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = notes[noteIndex % notes.length];
    
    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0.15, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);
    
    osc.connect(gain);
    gain.connect(masterGain!);
    osc.start(t);
    osc.stop(t + 0.35);
    
    noteIndex++;
    if (musicPlaying) {
      setTimeout(playNote, beatMs / 2);
    }
  }
  
  playNote();
}

function stopMusic() {
  musicPlaying = false;
}

function playBounce(perfect: boolean) {
  if (!audioCtx || !masterGain) return;
  const t = audioCtx.currentTime;
  const freq = perfect ? 880 : 660;
  const osc = audioCtx.createOscillator();
  osc.type = 'sine';
  osc.frequency.value = freq;
  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(0.2, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
  osc.connect(gain);
  gain.connect(masterGain);
  osc.start(t);
  osc.stop(t + 0.2);
}

function playLand() {
  if (!audioCtx || !masterGain) return;
  const t = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  osc.type = 'triangle';
  osc.frequency.value = 150;
  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(0.1, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
  osc.connect(gain);
  gain.connect(masterGain);
  osc.start(t);
  osc.stop(t + 0.1);
}

function playGameOver() {
  if (!audioCtx || !masterGain) return;
  const t = audioCtx.currentTime;
  [400, 350, 300, 250].forEach((freq, i) => {
    const osc = audioCtx!.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;
    const gain = audioCtx!.createGain();
    gain.gain.setValueAtTime(0.15, t + i * 0.15);
    gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.15 + 0.2);
    osc.connect(gain);
    gain.connect(masterGain!);
    osc.start(t + i * 0.15);
    osc.stop(t + i * 0.15 + 0.25);
  });
}

interface Hill {
  startX: number;
  wavelength: number;
  amplitude: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
}

export default function SlideGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<'start' | 'playing' | 'end'>('start');
  const [canvasSize, setCanvasSize] = useState({ w: 400, h: 700 });
  
  // Social
  const [socialLoaded, setSocialLoaded] = useState(false);
  const [submittedEntryId, setSubmittedEntryId] = useState<number | null>(null);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [finalScore, setFinalScore] = useState(0);

  usePixelpitSocial(socialLoaded);

  const gameRef = useRef({
    running: false,
    time: 0,
    distance: 0,
    combo: 0,
    // Penguin state
    x: 100,
    y: 300,
    vx: 3,
    vy: 0,
    grounded: false,
    diving: false,
    rotation: 0,
    squash: 1,
    // Terrain
    hills: [] as Hill[],
    lastHillEnd: 0,
    // Bounce timing
    valleyTime: 0,
    lastPeakX: 0,
    // Particles
    particles: [] as Particle[],
    // Camera
    cameraX: 0,
  });

  const getZone = useCallback((time: number) => {
    const zoneIndex = Math.min(3, Math.floor(time / ZONE_DURATION));
    return ZONES[zoneIndex];
  }, []);

  const getZoneIndex = useCallback((time: number) => {
    return Math.min(3, Math.floor(time / ZONE_DURATION));
  }, []);

  const getTerrainY = useCallback((x: number, hills: Hill[]) => {
    const baseY = canvasSize.h * 0.6;
    
    for (const hill of hills) {
      if (x >= hill.startX && x < hill.startX + hill.wavelength) {
        const progress = (x - hill.startX) / hill.wavelength;
        const sineY = Math.sin(progress * Math.PI) * hill.amplitude;
        return baseY - sineY;
      }
    }
    
    return baseY;
  }, [canvasSize.h]);

  const getTerrainSlope = useCallback((x: number, hills: Hill[]) => {
    const dx = 2;
    const y1 = getTerrainY(x - dx, hills);
    const y2 = getTerrainY(x + dx, hills);
    return (y2 - y1) / (dx * 2);
  }, [getTerrainY]);

  const spawnHill = useCallback((startX: number, zoneIndex: number) => {
    // Hill size increases with zone
    const sizeMultiplier = 1 + zoneIndex * 0.3;
    const wavelength = (200 + Math.random() * 200) * sizeMultiplier;
    const amplitude = (60 + Math.random() * 60) * sizeMultiplier;
    
    return {
      startX,
      wavelength,
      amplitude,
    };
  }, []);

  const startGame = useCallback(() => {
    initAudio();
    startMusic();
    
    const game = gameRef.current;
    game.running = true;
    game.time = 0;
    game.distance = 0;
    game.combo = 0;
    
    game.x = 100;
    game.y = canvasSize.h * 0.4;
    game.vx = 4;
    game.vy = 0;
    game.grounded = false;
    game.diving = false;
    game.rotation = 0;
    game.squash = 1;
    
    game.hills = [];
    game.lastHillEnd = 0;
    game.valleyTime = 0;
    game.lastPeakX = 0;
    game.particles = [];
    game.cameraX = 0;
    
    // Generate initial hills
    for (let i = 0; i < 10; i++) {
      const hill = spawnHill(game.lastHillEnd, 0);
      game.hills.push(hill);
      game.lastHillEnd = hill.startX + hill.wavelength;
    }
    
    setGameState('playing');
  }, [canvasSize.h, spawnHill]);

  // Handle resize
  useEffect(() => {
    const updateSize = () => {
      setCanvasSize({
        w: Math.min(window.innerWidth, 500),
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
    let lastTime = 0;

    const update = (dt: number) => {
      const game = gameRef.current;
      if (!game.running) return;

      // Update time
      game.time += dt;
      
      // Check game over (night falls)
      if (game.time >= DAY_LENGTH) {
        endGame();
        return;
      }

      const zoneIndex = getZoneIndex(game.time);
      const speedMult = 1 + zoneIndex * 0.2;

      // Terrain Y at penguin position
      const terrainY = getTerrainY(game.x, game.hills);
      const slope = getTerrainSlope(game.x, game.hills);
      
      // Apply gravity
      let gravity = BASE_GRAVITY;
      if (game.diving) {
        gravity += DIVE_BOOST;
      }
      game.vy += gravity;

      // Ground collision
      if (game.y >= terrainY - 15) {
        game.y = terrainY - 15;
        
        if (!game.grounded) {
          // Just landed
          game.grounded = true;
          playLand();
          game.squash = 0.8; // Squash on landing
          
          // Check if this was a good/perfect bounce
          const timeSinceValley = performance.now() - game.valleyTime;
          if (timeSinceValley < PERFECT_WINDOW) {
            // Perfect bounce!
            game.vx *= 1.2;
            game.combo++;
            playBounce(true);
            // Sparkles
            for (let i = 0; i < 8; i++) {
              game.particles.push({
                x: game.x,
                y: game.y,
                vx: (Math.random() - 0.5) * 4,
                vy: -Math.random() * 4,
                life: 0.5,
                color: '#facc15',
              });
            }
          } else if (timeSinceValley < GOOD_WINDOW) {
            // Good bounce
            game.vx *= 1.1;
            game.combo++;
            playBounce(false);
          } else {
            // Normal/bad bounce
            game.combo = 0;
          }
        }
        
        // Grounded physics
        if (game.diving) {
          // Diving on downslope = speed boost
          if (slope > 0.1) {
            game.vx += slope * 0.5 * speedMult;
          }
          // Diving on upslope = speed loss
          if (slope < -0.1) {
            game.vx += slope * 0.3;
          }
        }
        
        // Apply friction
        game.vx *= FRICTION;
        game.vy = slope * game.vx; // Follow terrain
        
        // Launch detection (at peak)
        if (slope < -0.05 && !game.diving) {
          // At peak, release = launch
          const launchPower = Math.abs(game.vx) * 0.5;
          game.vy = -launchPower;
          game.grounded = false;
          game.squash = 1.15; // Stretch on launch
        }
      } else {
        game.grounded = false;
        // Air friction
        game.vx *= AIR_FRICTION;
      }

      // Track valley for bounce timing
      if (slope > 0 && game.grounded) {
        game.valleyTime = performance.now();
      }

      // Clamp velocity
      game.vx = Math.max(2, Math.min(MAX_VELOCITY, game.vx));
      
      // Combo multiplier
      const comboMult = Math.min(2, 1 + game.combo * 0.1);
      
      // Move penguin
      game.x += game.vx * comboMult * speedMult;
      game.y += game.vy;
      
      // Update distance (score)
      game.distance = Math.floor(game.x / 10);
      
      // Camera follows
      game.cameraX = game.x - 100;
      
      // Rotation based on velocity
      const targetRotation = Math.atan2(game.vy, game.vx) * (180 / Math.PI);
      game.rotation += (targetRotation - game.rotation) * 0.1;
      
      // Squash recovery
      game.squash += (1 - game.squash) * 0.2;
      
      // Spawn new hills
      while (game.lastHillEnd < game.x + canvasSize.w + 500) {
        const hill = spawnHill(game.lastHillEnd, zoneIndex);
        game.hills.push(hill);
        game.lastHillEnd = hill.startX + hill.wavelength;
      }
      
      // Remove old hills
      game.hills = game.hills.filter(h => h.startX + h.wavelength > game.cameraX - 100);
      
      // Update particles
      game.particles = game.particles.filter(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.2;
        p.life -= dt * 2;
        return p.life > 0;
      });
      
      // Speed trail particles
      if (game.combo >= 3 && Math.random() < 0.3) {
        game.particles.push({
          x: game.x - 20,
          y: game.y,
          vx: -1,
          vy: (Math.random() - 0.5) * 2,
          life: 0.3,
          color: getZone(game.time).accent,
        });
      }
    };

    const endGame = () => {
      const game = gameRef.current;
      game.running = false;
      stopMusic();
      playGameOver();
      
      setFinalScore(game.distance);
      setSubmittedEntryId(null);
      setShowLeaderboard(false);
      setGameState('end');
      
      fetch('/api/pixelpit/stats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ game: GAME_ID }),
      }).catch(() => {});
    };

    const drawPenguin = (x: number, y: number, rotation: number, squash: number, diving: boolean, combo: number) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rotation * Math.PI / 180);
      ctx.scale(1 / squash, squash);
      
      // Combo glow
      if (combo >= 2) {
        ctx.shadowColor = '#facc15';
        ctx.shadowBlur = 4 + combo * 2;
      }
      
      // Body (white belly)
      ctx.fillStyle = '#18181b';
      ctx.beginPath();
      ctx.ellipse(0, 0, 18, 22, 0, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.ellipse(2, 2, 12, 16, 0, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.shadowBlur = 0;
      
      // Beak
      ctx.fillStyle = '#fb923c';
      ctx.beginPath();
      ctx.moveTo(15, -2);
      ctx.lineTo(25, 0);
      ctx.lineTo(15, 4);
      ctx.closePath();
      ctx.fill();
      
      // Eye
      ctx.fillStyle = '#18181b';
      ctx.beginPath();
      ctx.arc(8, -6, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(9, -7, 1.5, 0, Math.PI * 2);
      ctx.fill();
      
      // Flippers (tucked when diving)
      ctx.fillStyle = '#18181b';
      if (diving) {
        // Tucked
        ctx.beginPath();
        ctx.ellipse(-8, 10, 6, 3, 0.3, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Spread
        ctx.beginPath();
        ctx.ellipse(-10, 5, 8, 4, -0.5, 0, Math.PI * 2);
        ctx.fill();
      }
      
      ctx.restore();
    };

    const draw = () => {
      const game = gameRef.current;
      const zone = getZone(game.time);
      const zoneProgress = (game.time % ZONE_DURATION) / ZONE_DURATION;
      
      // Sky gradient
      const skyGrad = ctx.createLinearGradient(0, 0, 0, canvasSize.h);
      skyGrad.addColorStop(0, zone.sky1);
      skyGrad.addColorStop(1, zone.sky2);
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, canvasSize.w, canvasSize.h);
      
      // Sun/moon position (sinking over time)
      const sunY = 80 + (game.time / DAY_LENGTH) * (canvasSize.h * 0.6);
      const sunColor = game.time < DAY_LENGTH * 0.75 ? '#fbbf24' : '#94a3b8';
      ctx.fillStyle = sunColor;
      ctx.beginPath();
      ctx.arc(canvasSize.w - 80, sunY, 40, 0, Math.PI * 2);
      ctx.fill();
      
      // Terrain
      ctx.fillStyle = zone.snow;
      ctx.beginPath();
      ctx.moveTo(0, canvasSize.h);
      
      for (let screenX = 0; screenX <= canvasSize.w; screenX += 5) {
        const worldX = screenX + game.cameraX;
        const y = getTerrainY(worldX, game.hills);
        ctx.lineTo(screenX, y);
      }
      
      ctx.lineTo(canvasSize.w, canvasSize.h);
      ctx.closePath();
      ctx.fill();
      
      // Terrain outline
      ctx.strokeStyle = zone.accent + '60';
      ctx.lineWidth = 3;
      ctx.beginPath();
      for (let screenX = 0; screenX <= canvasSize.w; screenX += 5) {
        const worldX = screenX + game.cameraX;
        const y = getTerrainY(worldX, game.hills);
        if (screenX === 0) ctx.moveTo(screenX, y);
        else ctx.lineTo(screenX, y);
      }
      ctx.stroke();
      
      // Particles
      for (const p of game.particles) {
        const screenX = p.x - game.cameraX;
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.life * 2;
        ctx.beginPath();
        ctx.arc(screenX, p.y, 4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      
      // Penguin
      const screenX = game.x - game.cameraX;
      drawPenguin(screenX, game.y, game.rotation, game.squash, game.diving, game.combo);
      
      // UI
      ctx.fillStyle = '#18181b';
      ctx.font = 'bold 48px ui-rounded, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(game.distance.toString() + 'm', canvasSize.w / 2, 60);
      
      // Zone name
      ctx.font = '14px ui-rounded, system-ui, sans-serif';
      ctx.fillStyle = zone.accent;
      ctx.fillText(zone.name, canvasSize.w / 2, 85);
      
      // Combo
      if (game.combo >= 2) {
        ctx.font = 'bold 20px ui-rounded, system-ui, sans-serif';
        ctx.fillStyle = '#facc15';
        ctx.fillText(`🔥 ${game.combo}x`, canvasSize.w / 2, 110);
      }
      
      // Time remaining (sunset bar)
      const timeLeft = DAY_LENGTH - game.time;
      const barWidth = (timeLeft / DAY_LENGTH) * (canvasSize.w - 40);
      ctx.fillStyle = '#18181b20';
      ctx.fillRect(20, canvasSize.h - 30, canvasSize.w - 40, 8);
      ctx.fillStyle = zone.accent;
      ctx.fillRect(20, canvasSize.h - 30, barWidth, 8);
    };

    const gameLoop = (timestamp: number) => {
      const dt = Math.min((timestamp - lastTime) / 1000, 0.05);
      lastTime = timestamp;
      update(dt);
      draw();
      animationId = requestAnimationFrame(gameLoop);
    };
    animationId = requestAnimationFrame(gameLoop);

    // Input
    const handleDown = () => {
      if (gameState === 'playing') {
        gameRef.current.diving = true;
      }
    };

    const handleUp = () => {
      gameRef.current.diving = false;
    };

    canvas.addEventListener('mousedown', handleDown);
    canvas.addEventListener('mouseup', handleUp);
    canvas.addEventListener('mouseleave', handleUp);
    canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      handleDown();
    }, { passive: false });
    canvas.addEventListener('touchend', (e) => {
      e.preventDefault();
      handleUp();
    }, { passive: false });

    document.addEventListener('keydown', (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        handleDown();
      }
    });
    document.addEventListener('keyup', (e) => {
      if (e.code === 'Space') {
        handleUp();
      }
    });

    return () => {
      cancelAnimationFrame(animationId);
      stopMusic();
    };
  }, [gameState, canvasSize, getZone, getZoneIndex, getTerrainY, getTerrainSlope, spawnHill]);

  return (
    <>
      <Script
        src="/pixelpit/social.js"
        strategy="afterInteractive"
        onLoad={() => setSocialLoaded(true)}
      />

      <div style={{
        position: 'fixed',
        inset: 0,
        background: '#fdf4ff',
        fontFamily: 'ui-rounded, system-ui, sans-serif',
        display: 'flex',
        justifyContent: 'center',
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
            background: 'linear-gradient(#fdf4ff, #fce7f3)',
          }}>
            <div style={{ fontSize: 80, marginBottom: 10 }}>🐧</div>
            <h1 style={{
              color: '#18181b',
              fontSize: 48,
              marginBottom: 10,
              fontWeight: 900,
            }}>
              SLIDE
            </h1>

            <p style={{
              color: '#64748b',
              fontSize: 16,
              marginBottom: 30,
              textAlign: 'center',
              lineHeight: 1.6,
              maxWidth: 280,
            }}>
              Hold to dive down hills.<br />
              Release to soar off peaks.<br />
              Race the sunset!
            </p>

            <button
              onClick={startGame}
              style={{
                background: '#f472b6',
                color: '#fff',
                border: '3px solid #18181b',
                padding: '18px 60px',
                fontSize: 18,
                fontWeight: 700,
                cursor: 'pointer',
                borderRadius: 30,
                boxShadow: '4px 4px 0 #18181b',
              }}
            >
              SLIDE
            </button>

            <button
              onClick={() => setShowLeaderboard(true)}
              style={{
                marginTop: 30,
                background: 'transparent',
                color: '#f472b6',
                border: '2px solid #f472b6',
                padding: '10px 24px',
                fontSize: 14,
                cursor: 'pointer',
                borderRadius: 20,
              }}
            >
              View Leaderboard
            </button>
          </div>
        )}

        {showLeaderboard && gameState !== 'playing' && (
          <div
            onClick={() => setShowLeaderboard(false)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(255,255,255,0.95)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 100,
              padding: 20,
            }}
          >
            <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: 400 }}>
              <Leaderboard
                gameId={GAME_ID}
                limit={10}
                entryId={submittedEntryId ?? undefined}
                colors={LEADERBOARD_COLORS}
              />
            </div>
            <button
              onClick={() => setShowLeaderboard(false)}
              style={{
                marginTop: 20,
                background: '#f472b6',
                color: '#fff',
                border: '2px solid #18181b',
                padding: '12px 30px',
                fontSize: 14,
                cursor: 'pointer',
                borderRadius: 20,
              }}
            >
              Close
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
            background: 'linear-gradient(#c4b5fd, #4c1d95)',
            overflowY: 'auto',
            padding: 20,
          }}>
            <div style={{ fontSize: 60, marginBottom: 10 }}>🌙</div>
            <h1 style={{ 
              color: '#fff', 
              fontSize: 36, 
              marginBottom: 5,
              fontWeight: 900,
            }}>
              NIGHTFALL
            </h1>
            <p style={{ color: '#c4b5fd', fontSize: 14, marginBottom: 20 }}>
              The sun has set on your run!
            </p>
            
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 8,
              marginBottom: 20,
            }}>
              <div style={{ color: '#f472b6', fontSize: 14, letterSpacing: 2 }}>DISTANCE</div>
              <div style={{ color: '#fff', fontSize: 64, fontWeight: 'bold' }}>
                {finalScore}m
              </div>
            </div>

            <div style={{ width: '100%', maxWidth: 350 }}>
              <ScoreFlow
                score={finalScore}
                gameId={GAME_ID}
                colors={{
                  ...SCORE_FLOW_COLORS,
                  bg: '#4c1d95',
                  surface: '#5b21b6',
                  text: '#fff',
                  muted: '#c4b5fd',
                }}
                onRankReceived={(rank, entryId) => setSubmittedEntryId(entryId ?? null)}
              />
            </div>

            <div style={{ marginTop: 15 }}>
              <ShareButtonContainer
                id="share-btn-slide"
                url={`${typeof window !== 'undefined' ? window.location.origin : ''}/pixelpit/arcade/slide/share/${finalScore}`}
                text={`I slid ${finalScore}m before nightfall! 🐧`}
                style="minimal"
                socialLoaded={socialLoaded}
              />
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 15 }}>
              <button
                onClick={() => setShowLeaderboard(!showLeaderboard)}
                style={{
                  background: 'transparent',
                  color: '#f472b6',
                  border: '2px solid #f472b6',
                  padding: '12px 20px',
                  fontSize: 14,
                  cursor: 'pointer',
                  borderRadius: 20,
                }}
              >
                {showLeaderboard ? 'Hide' : 'Leaderboard'}
              </button>
              <button
                onClick={startGame}
                style={{
                  background: '#f472b6',
                  color: '#fff',
                  border: '2px solid #18181b',
                  padding: '12px 30px',
                  fontSize: 16,
                  fontWeight: 600,
                  cursor: 'pointer',
                  borderRadius: 20,
                }}
              >
                SLIDE AGAIN
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
