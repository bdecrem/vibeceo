'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';

const THEME = {
  snowball: '#e2e8f0',
  frost: '#94a3b8',
  gear: '#92400e', // rust/bronze
  gearGlow: '#d97706',
  bg: '#0c0a09', // almost black
  bgAccent: '#1c1917', // dark brown
  text: '#a8a29e',
  danger: '#dc2626',
};

const GAME_ID = 'melt';
const NUM_PLATFORMS = 25;
const MAX_HEALTH = 100;

// Audio
let audioCtx: AudioContext | null = null;
let masterGain: GainNode | null = null;

function initAudio() {
  if (audioCtx) return;
  audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  masterGain = audioCtx.createGain();
  masterGain.gain.value = 0.3;
  masterGain.connect(audioCtx.destination);
  if (audioCtx.state === 'suspended') audioCtx.resume();
}

function playSizzle() {
  if (!audioCtx || !masterGain) return;
  const bufferSize = audioCtx.sampleRate * 0.3;
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
  }
  const noise = audioCtx.createBufferSource();
  noise.buffer = buffer;
  const filter = audioCtx.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.value = 2000;
  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
  noise.connect(filter);
  filter.connect(gain);
  gain.connect(masterGain);
  noise.start();
}

function playPass() {
  if (!audioCtx || !masterGain) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sine';
  osc.frequency.value = 600;
  gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.1);
  osc.connect(gain);
  gain.connect(masterGain);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.1);
}

function playWin() {
  if (!audioCtx || !masterGain) return;
  [262, 330, 392].forEach((freq, i) => {
    setTimeout(() => {
      if (!audioCtx || !masterGain) return;
      const osc = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      g.gain.setValueAtTime(0.15, audioCtx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.8);
      osc.connect(g);
      g.connect(masterGain);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.8);
    }, i * 150);
  });
}

function playDeath() {
  if (!audioCtx || !masterGain) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(200, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(50, audioCtx.currentTime + 0.5);
  gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);
  osc.connect(gain);
  gain.connect(masterGain);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.5);
}

interface Platform {
  y: number;
  x: number; // offset from center
  radius: number;
  gapAngle: number;
  gapSize: number;
  rotation: number;
  speed: number;
  passed: boolean;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
}

export default function MeltGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<'start' | 'playing' | 'won' | 'dead'>('start');
  const [finalHealth, setFinalHealth] = useState(MAX_HEALTH);
  const [layersDescended, setLayersDescended] = useState(0);
  const [canvasSize, setCanvasSize] = useState({ w: 400, h: 700 });

  const gameRef = useRef({
    running: false,
    holding: false,
    ballX: 0,
    ballY: 80,
    ballSize: 18,
    ballVY: 0,
    cameraY: 0,
    platforms: [] as Platform[],
    particles: [] as Particle[],
    layersPassed: 0,
    health: MAX_HEALTH,
    stuckTo: null as number | null, // platform index ball is riding
    stuckAngle: 0, // angle on platform where ball is stuck
  });

  const generatePlatforms = useCallback((canvasW: number) => {
    const platforms: Platform[] = [];
    let currentY = 350;
    
    for (let i = 0; i < NUM_PLATFORMS; i++) {
      const progress = i / NUM_PLATFORMS; // 0 to 1
      
      // Difficulty progression
      // Gap between platforms: starts big, gets tighter
      const baseGap = 350 - progress * 150; // 350 -> 200
      currentY += baseGap;
      
      // Radius: starts big, varies more later
      const baseRadius = 120 - progress * 40; // 120 -> 80
      const radiusVariance = progress * 30;
      const radius = baseRadius + (Math.random() - 0.5) * radiusVariance;
      
      // X offset: starts centered, more offset later
      const maxOffset = progress * (canvasW * 0.25);
      const xOffset = (Math.random() - 0.5) * maxOffset;
      
      // Gap size: starts big (easy), gets smaller (hard)
      const gapSize = 1.4 - progress * 0.7; // ~80deg -> ~40deg
      
      // Rotation speed: starts slow, gets faster
      const speed = (0.3 + progress * 0.5) * (Math.random() < 0.5 ? 1 : -1);
      
      platforms.push({
        y: currentY,
        x: xOffset,
        radius: Math.max(60, radius),
        gapAngle: Math.random() * Math.PI * 2,
        gapSize: Math.max(0.5, gapSize + (Math.random() - 0.5) * 0.3),
        rotation: 0,
        speed,
        passed: false,
      });
    }
    return platforms;
  }, []);

  const startGame = useCallback(() => {
    initAudio();
    const game = gameRef.current;
    game.running = true;
    game.holding = false;
    game.ballX = canvasSize.w / 2;
    game.ballY = 80;
    game.ballSize = 18;
    game.ballVY = 0;
    game.cameraY = 0;
    game.platforms = generatePlatforms(canvasSize.w);
    game.particles = [];
    game.layersPassed = 0;
    game.health = MAX_HEALTH;
    game.stuckTo = null;
    game.stuckAngle = 0;
    setLayersDescended(0);
    setGameState('playing');
  }, [generatePlatforms, canvasSize.w]);

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
    const PIZZA_THICKNESS = 25;

    const update = () => {
      const game = gameRef.current;
      if (!game.running) return;

      // Rotate all platforms first
      for (let i = 0; i < game.platforms.length; i++) {
        game.platforms[i].rotation += game.platforms[i].speed * 0.015;
      }

      // Platform riding logic
      if (game.stuckTo !== null) {
        const platform = game.platforms[game.stuckTo];
        const platformX = canvasSize.w / 2 + platform.x;
        
        // Rotate with the platform
        game.stuckAngle += platform.speed * 0.015;
        
        // Position ball on the platform's edge at stuck angle
        const stickRadius = platform.radius * 0.7;
        game.ballX = platformX + Math.cos(game.stuckAngle) * stickRadius;
        game.ballY = platform.y + Math.sin(game.stuckAngle) * stickRadius;
        game.ballVY = 0;
        
        // Check if gap has rotated under us
        const currentGapAngle = (platform.gapAngle + platform.rotation) % (Math.PI * 2);
        let stuckNormalized = game.stuckAngle % (Math.PI * 2);
        if (stuckNormalized < 0) stuckNormalized += Math.PI * 2;
        
        let diff = Math.abs(stuckNormalized - currentGapAngle);
        if (diff > Math.PI) diff = Math.PI * 2 - diff;
        
        const overGap = diff < platform.gapSize / 2;
        
        // If holding OR over gap, unstick and fall
        if (game.holding || overGap) {
          game.stuckTo = null;
          game.ballVY = game.holding ? 5 : 2; // Fast fall if holding, slow drop if gap
          if (overGap && !platform.passed) {
            platform.passed = true;
            game.layersPassed++;
            setLayersDescended(game.layersPassed);
            playPass();
          }
        }
      } else {
        // Not stuck — normal physics
        game.ballX = canvasSize.w / 2;
        
        const gravity = game.holding ? 0.9 : 0.2;
        game.ballVY += gravity;
        game.ballVY = Math.min(game.ballVY, game.holding ? 16 : 3);
        game.ballY += game.ballVY;

        // Collision with platforms
        for (let i = 0; i < game.platforms.length; i++) {
          const platform = game.platforms[i];
          const ballBottom = game.ballY + game.ballSize;
          const ballTop = game.ballY - game.ballSize;
          const platformX = canvasSize.w / 2 + platform.x;
          
          // Check if ball is at platform level
          if (ballBottom > platform.y - PIZZA_THICKNESS/2 && 
              ballTop < platform.y + PIZZA_THICKNESS/2) {
            
            // Check distance from platform center
            const dx = game.ballX - platformX;
            const distFromCenter = Math.abs(dx);
            
            // Only collide if ball is within platform radius
            if (distFromCenter < platform.radius) {
              // Check if in gap
              const currentGapAngle = (platform.gapAngle + platform.rotation) % (Math.PI * 2);
              
              let diff = Math.abs(Math.PI / 2 - currentGapAngle); // Ball drops from top (PI/2 = top)
              if (diff > Math.PI) diff = Math.PI * 2 - diff;
              
              const inGap = diff < platform.gapSize / 2;
              
              if (inGap) {
                // Fall through gap
                if (!platform.passed) {
                  platform.passed = true;
                  game.layersPassed++;
                  setLayersDescended(game.layersPassed);
                  playPass();
                }
              } else {
                // Hit solid part
                if (game.holding) {
                  // Smashing through while holding = damage + bounce
                  if (!platform.passed) {
                    playSizzle();
                    game.health -= 18;
                    game.ballSize = Math.max(8, 8 + (game.health / MAX_HEALTH) * 10);
                    game.ballVY = -7;
                    platform.passed = true;
                    
                    for (let j = 0; j < 8; j++) {
                      game.particles.push({
                        x: game.ballX + (Math.random() - 0.5) * 40,
                        y: platform.y,
                        vx: (Math.random() - 0.5) * 5,
                        vy: -2 - Math.random() * 4,
                        life: 30,
                      });
                    }
                    
                    if (game.health <= 0) {
                      game.running = false;
                      playDeath();
                      setFinalHealth(0);
                      setGameState('dead');
                      return;
                    }
                  }
                } else {
                  // Not holding = stick to platform and ride
                  game.stuckTo = i;
                  game.stuckAngle = Math.PI / 2; // Start at top of platform
                  game.ballY = platform.y;
                  game.ballVY = 0;
                }
              }
            }
          }
        }
      }

      // Camera follows ball
      const targetCameraY = game.ballY - canvasSize.h / 3;
      game.cameraY += (targetCameraY - game.cameraY) * 0.1;

      // Win
      const lastPlatform = game.platforms[game.platforms.length - 1];
      if (game.ballY > lastPlatform.y + 200) {
        game.running = false;
        playWin();
        setFinalHealth(game.health);
        setGameState('won');
        fetch('/api/pixelpit/stats', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ game: GAME_ID }),
        }).catch(() => {});
      }

      // Particles
      game.particles = game.particles.filter(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.15;
        p.life--;
        return p.life > 0;
      });
    };

    const draw = () => {
      const game = gameRef.current;
      
      // Industrial dark background
      ctx.fillStyle = THEME.bg;
      ctx.fillRect(0, 0, canvasSize.w, canvasSize.h);
      
      // Subtle industrial lines
      ctx.strokeStyle = THEME.bgAccent;
      ctx.lineWidth = 1;
      for (let y = 0; y < canvasSize.h; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvasSize.w, y);
        ctx.stroke();
      }

      // Draw gears
      for (const platform of game.platforms) {
        const screenY = platform.y - game.cameraY;
        if (screenY < -platform.radius - 50 || screenY > canvasSize.h + platform.radius + 50) continue;

        const platformX = canvasSize.w / 2 + platform.x;
        const currentGapAngle = platform.gapAngle + platform.rotation;
        const gapStart = currentGapAngle - platform.gapSize / 2;
        const gapEnd = currentGapAngle + platform.gapSize / 2;
        
        // Gear teeth
        const numTeeth = Math.floor(platform.radius / 8);
        const toothSize = 12;
        ctx.fillStyle = THEME.gear;
        ctx.shadowColor = THEME.gearGlow;
        ctx.shadowBlur = 8;
        
        for (let t = 0; t < numTeeth; t++) {
          const angle = (t / numTeeth) * Math.PI * 2 + platform.rotation;
          // Skip teeth in the gap
          let angleDiff = Math.abs(angle - currentGapAngle);
          if (angleDiff > Math.PI) angleDiff = Math.PI * 2 - angleDiff;
          if (angleDiff < platform.gapSize / 2 + 0.1) continue;
          
          const tx = platformX + Math.cos(angle) * (platform.radius + toothSize/2);
          const ty = screenY + Math.sin(angle) * (platform.radius + toothSize/2);
          ctx.beginPath();
          ctx.arc(tx, ty, toothSize/2, 0, Math.PI * 2);
          ctx.fill();
        }
        
        // Main gear body
        ctx.beginPath();
        ctx.moveTo(platformX, screenY);
        ctx.arc(platformX, screenY, platform.radius, gapEnd, gapStart + Math.PI * 2);
        ctx.lineTo(platformX, screenY);
        ctx.closePath();
        ctx.fill();
        
        // Center hub
        ctx.fillStyle = THEME.bgAccent;
        ctx.shadowBlur = 0;
        ctx.beginPath();
        ctx.arc(platformX, screenY, platform.radius * 0.15, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = THEME.gear;
        ctx.shadowBlur = 0;
      }

      // Particles
      for (const p of game.particles) {
        const screenY = p.y - game.cameraY;
        ctx.fillStyle = '#fff';
        ctx.globalAlpha = p.life / 30;
        ctx.beginPath();
        ctx.arc(p.x, screenY, 4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // Snowball
      const ballScreenY = game.ballY - game.cameraY;
      
      ctx.fillStyle = THEME.snowball;
      ctx.shadowColor = THEME.frost;
      ctx.shadowBlur = 20;
      ctx.beginPath();
      ctx.arc(game.ballX, ballScreenY, game.ballSize, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      
      // Eyes
      const eyeSpacing = game.ballSize * 0.35;
      const eyeY = ballScreenY - game.ballSize * 0.1;
      const eyeSize = Math.max(2, game.ballSize * 0.12);
      
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.arc(game.ballX - eyeSpacing, eyeY, eyeSize, 0, Math.PI * 2);
      ctx.arc(game.ballX + eyeSpacing, eyeY, eyeSize, 0, Math.PI * 2);
      ctx.fill();
      
      if (game.ballSize <= 12) {
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(game.ballX, ballScreenY + game.ballSize * 0.15, game.ballSize * 0.25, 0.2, Math.PI - 0.2);
        ctx.stroke();
      }

      // Skinny health bar at very top - industrial style
      const barHeight = 4;
      const barPadding = 0;
      ctx.fillStyle = THEME.bgAccent;
      ctx.fillRect(barPadding, barPadding, canvasSize.w - barPadding * 2, barHeight);
      ctx.fillStyle = game.health > 30 ? THEME.frost : THEME.danger;
      ctx.fillRect(barPadding, barPadding, (game.health / MAX_HEALTH) * (canvasSize.w - barPadding * 2), barHeight);
    };

    const gameLoop = () => {
      update();
      draw();
      animationId = requestAnimationFrame(gameLoop);
    };
    animationId = requestAnimationFrame(gameLoop);

    const handleDown = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      if (gameRef.current.running) {
        gameRef.current.holding = true;
      }
    };
    const handleUp = () => {
      gameRef.current.holding = false;
    };

    canvas.addEventListener('mousedown', handleDown);
    canvas.addEventListener('mouseup', handleUp);
    canvas.addEventListener('mouseleave', handleUp);
    canvas.addEventListener('touchstart', handleDown, { passive: false });
    canvas.addEventListener('touchend', handleUp);

    return () => {
      cancelAnimationFrame(animationId);
      canvas.removeEventListener('mousedown', handleDown);
      canvas.removeEventListener('mouseup', handleUp);
      canvas.removeEventListener('mouseleave', handleUp);
      canvas.removeEventListener('touchstart', handleDown);
      canvas.removeEventListener('touchend', handleUp);
    };
  }, [gameState, canvasSize]);

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: THEME.bg,
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
        }}>
          <h1 style={{ 
            color: THEME.gear, 
            fontSize: 64, 
            marginBottom: 10,
            textShadow: `0 0 40px ${THEME.gearGlow}`,
            fontWeight: 900,
            letterSpacing: '-2px',
          }}>
            MELT
          </h1>
          
          <p style={{ color: THEME.text, fontSize: 18, marginBottom: 25, lineHeight: 1.5 }}>
            Trapped in the machine.<br/>
            <span style={{ color: THEME.gear }}>Fall through the gears. ↓</span>
          </p>
          
          <div style={{ 
            background: 'rgba(0,0,0,0.6)', 
            padding: 20, 
            borderRadius: 4,
            marginBottom: 30,
            textAlign: 'left',
            maxWidth: 260,
            border: `1px solid ${THEME.bgAccent}`,
          }}>
            <p style={{ color: THEME.text, fontSize: 15, marginBottom: 10 }}>
              <strong style={{ color: THEME.frost }}>HOLD</strong> — drop fast
            </p>
            <p style={{ color: THEME.text, fontSize: 15, marginBottom: 10 }}>
              <strong style={{ color: THEME.frost }}>RELEASE</strong> — float slow
            </p>
            <p style={{ color: THEME.gear, fontSize: 15 }}>
              Wait for the gap. Slip through.
            </p>
          </div>
          
          <button
            onClick={startGame}
            style={{
              background: THEME.gear,
              color: '#fff',
              border: 'none',
              padding: '18px 60px',
              fontSize: 18,
              fontWeight: 700,
              cursor: 'pointer',
              borderRadius: 4,
              textTransform: 'uppercase',
              letterSpacing: '2px',
            }}
          >
            Enter
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

      {gameState === 'won' && (
        <div style={{ 
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <h1 style={{ 
            color: THEME.gearGlow, 
            fontSize: 56, 
            marginBottom: 10,
            textShadow: `0 0 40px ${THEME.gear}`,
          }}>
            MELTED 😊
          </h1>
          <p style={{ color: THEME.text, fontSize: 20, marginBottom: 10 }}>
            You reached hell. You're free.
          </p>
          <p style={{ color: THEME.frost, fontSize: 16, marginBottom: 30 }}>
            Health: {Math.round(finalHealth)}%
          </p>
          <button
            onClick={startGame}
            style={{
              background: THEME.gearGlow,
              color: '#fff',
              border: 'none',
              padding: '16px 50px',
              fontSize: 18,
              fontWeight: 600,
              cursor: 'pointer',
              borderRadius: 12,
            }}
          >
            Melt Again
          </button>
        </div>
      )}

      {gameState === 'dead' && (
        <div style={{ 
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <h1 style={{ color: '#ef4444', fontSize: 56, marginBottom: 10 }}>
            EVAPORATED
          </h1>
          <p style={{ color: THEME.text, fontSize: 20, marginBottom: 10 }}>
            Too much heat.
          </p>
          <p style={{ color: THEME.frost, fontSize: 16, marginBottom: 30 }}>
            Layers: {layersDescended}
          </p>
          <button
            onClick={startGame}
            style={{
              background: THEME.frost,
              color: THEME.bg,
              border: 'none',
              padding: '16px 50px',
              fontSize: 18,
              fontWeight: 600,
              cursor: 'pointer',
              borderRadius: 12,
            }}
          >
            Try Again
          </button>
        </div>
      )}
    </div>
  );
}
