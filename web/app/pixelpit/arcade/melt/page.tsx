'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';

const THEME = {
  snowball: '#f0f9ff',
  frost: '#bae6fd',
  lava: '#f97316',
  lavaGlow: '#fbbf24',
  bg: '#0f172a',
  text: '#fafafa',
};

const GAME_ID = 'melt';
const CANVAS_W = 360;
const CANVAS_H = 640;
const NUM_PLATFORMS = 20;
const BALL_X = CANVAS_W / 2;
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

  const gameRef = useRef({
    running: false,
    holding: false,
    ballY: 80,
    ballSize: 20,
    ballVY: 0,
    cameraY: 0,
    platforms: [] as Platform[],
    particles: [] as Particle[],
    layersPassed: 0,
    health: MAX_HEALTH,
  });

  const generatePlatforms = useCallback(() => {
    const platforms: Platform[] = [];
    let currentY = 300;
    for (let i = 0; i < NUM_PLATFORMS; i++) {
      // Start with big gaps between wheels, get tighter later
      // Ring radius is 130, so need at least 280+ to not overlap
      const baseGap = 320;
      const minGap = 200;
      const gap = Math.max(minGap, baseGap - i * 6);
      
      currentY += gap;
      const y = currentY;
      
      // Gap size in wheel: starts big, gets smaller
      const gapSize = Math.max(0.6, 1.2 - i * 0.02); // radians
      
      platforms.push({
        y,
        gapAngle: Math.random() * Math.PI * 2,
        gapSize,
        rotation: 0,
        speed: (0.4 + Math.random() * 0.3) * (Math.random() < 0.5 ? 1 : -1),
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
    game.ballY = 80;
    game.ballSize = 20;
    game.ballVY = 0;
    game.cameraY = 0;
    game.platforms = generatePlatforms();
    game.particles = [];
    game.layersPassed = 0;
    game.health = MAX_HEALTH;
    setLayersDescended(0);
    setGameState('playing');
  }, [generatePlatforms]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = CANVAS_W;
    canvas.height = CANVAS_H;

    let animationId: number;
    const RING_OUTER = 130;
    const RING_INNER = 30;
    const RING_THICKNESS = RING_OUTER - RING_INNER;

    const update = () => {
      const game = gameRef.current;
      if (!game.running) return;

      // Physics - HOLD = fast drop, RELEASE = slow/float
      const gravity = game.holding ? 0.8 : 0.2;
      game.ballVY += gravity;
      game.ballVY = Math.min(game.ballVY, game.holding ? 14 : 3);
      game.ballY += game.ballVY;

      // Camera
      const targetCameraY = game.ballY - CANVAS_H / 3;
      game.cameraY += (targetCameraY - game.cameraY) * 0.1;

      // Rotate wheels
      for (const platform of game.platforms) {
        platform.rotation += platform.speed * 0.015;
      }

      // Collision
      for (const platform of game.platforms) {
        const ballBottom = game.ballY + game.ballSize;
        const ballTop = game.ballY - game.ballSize;
        
        // Check if ball is at wheel level
        if (ballBottom > platform.y - RING_THICKNESS/2 && 
            ballTop < platform.y + RING_THICKNESS/2) {
          
          // Check if in gap
          const ballAngle = Math.PI / 2; // Ball drops straight down
          const currentGapAngle = (platform.gapAngle + platform.rotation) % (Math.PI * 2);
          
          let diff = Math.abs(ballAngle - currentGapAngle);
          if (diff > Math.PI) diff = Math.PI * 2 - diff;
          
          const inGap = diff < platform.gapSize / 2;
          
          if (inGap) {
            // Passed through!
            if (!platform.passed) {
              platform.passed = true;
              game.layersPassed++;
              setLayersDescended(game.layersPassed);
              playPass();
            }
          } else {
            // Hit orange!
            if (!platform.passed) {
              playSizzle();
              game.health -= 20;
              game.ballSize = Math.max(8, 8 + (game.health / MAX_HEALTH) * 12);
              game.ballVY = -6;
              platform.passed = true;
              
              // Steam particles
              for (let i = 0; i < 8; i++) {
                game.particles.push({
                  x: BALL_X + (Math.random() - 0.5) * 40,
                  y: platform.y,
                  vx: (Math.random() - 0.5) * 4,
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
          }
        }
      }

      // Win - passed all platforms
      const lastPlatform = game.platforms[game.platforms.length - 1];
      if (game.ballY > lastPlatform.y + 150) {
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
      
      // Dark blue background
      ctx.fillStyle = THEME.bg;
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

      // Draw orange wheels (filled pie wedges)
      for (const platform of game.platforms) {
        const screenY = platform.y - game.cameraY;
        if (screenY < -RING_OUTER - 50 || screenY > CANVAS_H + RING_OUTER + 50) continue;

        const currentGapAngle = platform.gapAngle + platform.rotation;
        const gapStart = currentGapAngle - platform.gapSize / 2;
        const gapEnd = currentGapAngle + platform.gapSize / 2;
        
        // Filled ring with gap (donut shape)
        ctx.fillStyle = THEME.lava;
        ctx.shadowColor = THEME.lavaGlow;
        ctx.shadowBlur = 15;
        
        // Draw filled arc (outer arc, then inner arc reversed)
        ctx.beginPath();
        ctx.arc(BALL_X, screenY, RING_OUTER, gapEnd, gapStart + Math.PI * 2);
        ctx.arc(BALL_X, screenY, RING_INNER, gapStart + Math.PI * 2, gapEnd, true);
        ctx.closePath();
        ctx.fill();
        
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
      ctx.arc(BALL_X, ballScreenY, game.ballSize, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      
      // Eyes
      const eyeSpacing = game.ballSize * 0.35;
      const eyeY = ballScreenY - game.ballSize * 0.1;
      const eyeSize = Math.max(2, game.ballSize * 0.12);
      
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.arc(BALL_X - eyeSpacing, eyeY, eyeSize, 0, Math.PI * 2);
      ctx.arc(BALL_X + eyeSpacing, eyeY, eyeSize, 0, Math.PI * 2);
      ctx.fill();
      
      // Smile when small
      if (game.ballSize <= 12) {
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(BALL_X, ballScreenY + game.ballSize * 0.15, game.ballSize * 0.25, 0.2, Math.PI - 0.2);
        ctx.stroke();
      }

      // Health bar at top
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(15, 15, 154, 28);
      ctx.fillStyle = THEME.frost;
      ctx.fillRect(17, 17, (game.health / MAX_HEALTH) * 150, 24);
      
      ctx.fillStyle = THEME.text;
      ctx.font = 'bold 14px monospace';
      ctx.fillText(`${Math.round(game.health)}%`, 25, 35);
      
      // Layers
      ctx.fillStyle = THEME.text;
      ctx.font = '12px monospace';
      ctx.fillText(`LAYERS: ${game.layersPassed}`, 15, 58);
      
      // Goal
      ctx.fillStyle = THEME.lava;
      ctx.font = 'bold 14px monospace';
      ctx.fillText('↓ HELL', CANVAS_W - 70, 35);
    };

    const gameLoop = () => {
      update();
      draw();
      animationId = requestAnimationFrame(gameLoop);
    };
    animationId = requestAnimationFrame(gameLoop);

    // Input
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
  }, [gameState]);

  return (
    <div style={{
      minHeight: '100vh',
      background: THEME.bg,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
      fontFamily: 'ui-monospace, monospace',
    }}>
      {gameState === 'start' && (
        <div style={{ textAlign: 'center', maxWidth: 300 }}>
          <h1 style={{ 
            color: THEME.snowball, 
            fontSize: 56, 
            marginBottom: 10,
            textShadow: `0 0 30px ${THEME.frost}`,
          }}>
            MELT
          </h1>
          
          <p style={{ color: THEME.frost, fontSize: 18, marginBottom: 20 }}>
            You're a snowball.<br/>
            <span style={{ color: THEME.lava }}>Reach hell. ↓</span>
          </p>
          
          <div style={{ 
            background: 'rgba(0,0,0,0.4)', 
            padding: 15, 
            borderRadius: 8,
            marginBottom: 25,
            textAlign: 'left',
          }}>
            <p style={{ color: THEME.text, fontSize: 14, marginBottom: 8 }}>
              <strong>HOLD</strong> = Drop fast
            </p>
            <p style={{ color: THEME.text, fontSize: 14, marginBottom: 8 }}>
              <strong>RELEASE</strong> = Float slow
            </p>
            <p style={{ color: THEME.lava, fontSize: 14 }}>
              Wait for the <strong>gap</strong> in the wheel.
            </p>
          </div>
          
          <button
            onClick={startGame}
            style={{
              background: `linear-gradient(135deg, ${THEME.frost}, ${THEME.snowball})`,
              color: THEME.bg,
              border: 'none',
              padding: '16px 50px',
              fontSize: 18,
              fontWeight: 700,
              cursor: 'pointer',
              borderRadius: 8,
            }}
          >
            DESCEND ↓
          </button>
        </div>
      )}

      {gameState === 'playing' && (
        <canvas 
          ref={canvasRef} 
          style={{ 
            borderRadius: 8,
            touchAction: 'none',
          }} 
        />
      )}

      {gameState === 'won' && (
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ 
            color: THEME.lava, 
            fontSize: 48, 
            marginBottom: 10,
            textShadow: `0 0 30px ${THEME.lavaGlow}`,
          }}>
            MELTED 😊
          </h1>
          <p style={{ color: THEME.text, fontSize: 18, marginBottom: 10 }}>
            You reached hell. You're free.
          </p>
          <p style={{ color: THEME.frost, fontSize: 14, marginBottom: 30 }}>
            Health: {Math.round(finalHealth)}% • Layers: {layersDescended}
          </p>
          <button
            onClick={startGame}
            style={{
              background: THEME.lava,
              color: '#fff',
              border: 'none',
              padding: '16px 40px',
              fontSize: 18,
              fontWeight: 600,
              cursor: 'pointer',
              borderRadius: 8,
            }}
          >
            Melt Again
          </button>
        </div>
      )}

      {gameState === 'dead' && (
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ color: '#ef4444', fontSize: 48, marginBottom: 10 }}>
            EVAPORATED
          </h1>
          <p style={{ color: THEME.text, fontSize: 18, marginBottom: 10 }}>
            Too much heat. You vanished.
          </p>
          <p style={{ color: THEME.frost, fontSize: 14, marginBottom: 30 }}>
            Layers: {layersDescended}
          </p>
          <button
            onClick={startGame}
            style={{
              background: THEME.frost,
              color: THEME.bg,
              border: 'none',
              padding: '16px 40px',
              fontSize: 18,
              fontWeight: 600,
              cursor: 'pointer',
              borderRadius: 8,
            }}
          >
            Try Again
          </button>
        </div>
      )}
    </div>
  );
}
