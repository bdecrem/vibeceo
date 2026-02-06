'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';

const THEME = {
  sky: '#87ceeb',
  skyDark: '#1e3a5f',
  cloud: '#ffffff',
  cloudShadow: '#e0e0e0',
  storm: '#2d1b4e', // deep purple
  stormGlow: '#ff4444', // danger red glow
  lightning: '#ffff66',
  raindrop: '#4fc3f7',
  raindropHighlight: '#b3e5fc',
  combo: '#ffd700',
  text: '#ffffff',
};

const GAME_ID = 'drop';
const RING_COUNT = 20;
const RING_SPACING = 100;
const BALL_RADIUS = 15;

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

function playBounce() {
  if (!audioCtx || !masterGain) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sine';
  osc.frequency.value = 300 + Math.random() * 100;
  gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.1);
  osc.connect(gain);
  gain.connect(masterGain);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.1);
}

function playFallThrough() {
  if (!audioCtx || !masterGain) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sine';
  osc.frequency.value = 600;
  osc.frequency.exponentialRampToValueAtTime(800, audioCtx.currentTime + 0.08);
  gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.08);
  osc.connect(gain);
  gain.connect(masterGain);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.08);
}

function playThunder() {
  if (!audioCtx || !masterGain) return;
  const bufferSize = audioCtx.sampleRate * 0.5;
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2);
  }
  const noise = audioCtx.createBufferSource();
  noise.buffer = buffer;
  const filter = audioCtx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 400;
  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(0.4, audioCtx.currentTime);
  noise.connect(filter);
  filter.connect(gain);
  gain.connect(masterGain);
  noise.start();
}

function playCombo(level: number) {
  if (!audioCtx || !masterGain) return;
  const freq = 400 + level * 100;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sine';
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);
  osc.connect(gain);
  gain.connect(masterGain);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.15);
}

interface Ring {
  y: number;
  rotation: number;
  gapAngle: number;
  gapSize: number;
  hasStorm: boolean;
  stormAngle: number;
  stormSize: number;
  passed: boolean;
  lightningFlash: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
}

export default function DropGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<'start' | 'playing' | 'gameover'>('start');
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [canvasSize, setCanvasSize] = useState({ w: 400, h: 700 });

  const gameRef = useRef({
    running: false,
    ballX: 0,
    ballY: 80,
    ballVY: 0,
    rotation: 0, // global tower rotation controlled by player
    rotationVel: 0,
    rings: [] as Ring[],
    particles: [] as Particle[],
    cameraY: 0,
    combo: 0,
    score: 0,
    squash: 1, // for squash/stretch effect
    lastTouchX: 0,
    isDragging: false,
  });

  const generateRings = useCallback(() => {
    const rings: Ring[] = [];
    for (let i = 0; i < RING_COUNT; i++) {
      const hasStorm = i > 2 && Math.random() < 0.4; // No storm on first few rings
      rings.push({
        y: 200 + i * RING_SPACING,
        rotation: 0,
        gapAngle: Math.random() * Math.PI * 2,
        gapSize: 1.2 - Math.min(i * 0.02, 0.5), // Gaps get smaller
        hasStorm,
        stormAngle: hasStorm ? Math.random() * Math.PI * 2 : 0,
        stormSize: hasStorm ? 0.8 + Math.random() * 0.4 : 0,
        passed: false,
        lightningFlash: 0,
      });
    }
    return rings;
  }, []);

  const startGame = useCallback(() => {
    initAudio();
    const game = gameRef.current;
    game.running = true;
    game.ballX = canvasSize.w / 2;
    game.ballY = 80;
    game.ballVY = 0;
    game.rotation = 0;
    game.rotationVel = 0;
    game.rings = generateRings();
    game.particles = [];
    game.cameraY = 0;
    game.combo = 0;
    game.score = 0;
    game.squash = 1;
    setScore(0);
    setCombo(0);
    setGameState('playing');
  }, [generateRings, canvasSize]);

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
    const TOWER_RADIUS = Math.min(canvasSize.w * 0.4, 150);
    const RING_THICKNESS = 25;

    const update = () => {
      const game = gameRef.current;
      if (!game.running) return;

      // Apply rotation with friction
      game.rotation += game.rotationVel;
      game.rotationVel *= 0.92;

      // Gravity
      game.ballVY += 0.4;
      game.ballVY = Math.min(game.ballVY, 12);

      // Squash recovery
      game.squash += (1 - game.squash) * 0.2;

      const prevY = game.ballY;
      game.ballY += game.ballVY;

      // Camera follows ball
      const targetCameraY = game.ballY - canvasSize.h / 3;
      game.cameraY += (targetCameraY - game.cameraY) * 0.1;

      // Check collision with rings
      for (const ring of game.rings) {
        if (ring.passed) continue;

        const ringTop = ring.y;
        const ringBottom = ring.y + RING_THICKNESS;

        // Ball passing through ring level
        if (prevY + BALL_RADIUS <= ringTop && game.ballY + BALL_RADIUS >= ringTop) {
          // Calculate ball angle relative to tower (world rotates, ball stays center)
          // Ball is always at center, so its angle is opposite of world rotation
          const ballAngle = (-game.rotation + Math.PI / 2) % (Math.PI * 2);
          const normalizedBallAngle = ballAngle < 0 ? ballAngle + Math.PI * 2 : ballAngle;

          // Check if in gap
          const gapAngle = ring.gapAngle;
          let gapDiff = Math.abs(normalizedBallAngle - gapAngle);
          if (gapDiff > Math.PI) gapDiff = Math.PI * 2 - gapDiff;
          const inGap = gapDiff < ring.gapSize / 2;

          // Check if hitting storm
          let hitStorm = false;
          if (ring.hasStorm && !inGap) {
            const stormAngle = ring.stormAngle;
            let stormDiff = Math.abs(normalizedBallAngle - stormAngle);
            if (stormDiff > Math.PI) stormDiff = Math.PI * 2 - stormDiff;
            hitStorm = stormDiff < ring.stormSize / 2;
          }

          if (inGap) {
            // Fall through!
            ring.passed = true;
            game.combo++;
            game.score += game.combo;
            setScore(game.score);
            setCombo(game.combo);
            playFallThrough();
            if (game.combo > 1) playCombo(game.combo);

            // Combo particles
            for (let i = 0; i < 5; i++) {
              game.particles.push({
                x: canvasSize.w / 2 + (Math.random() - 0.5) * 30,
                y: ring.y - game.cameraY,
                vx: (Math.random() - 0.5) * 4,
                vy: -2 - Math.random() * 2,
                life: 30,
                color: game.combo > 2 ? THEME.combo : THEME.raindrop,
              });
            }
          } else if (hitStorm) {
            // Hit storm cloud = DEATH
            game.running = false;
            playThunder();
            ring.lightningFlash = 1;
            
            // Death particles
            for (let i = 0; i < 20; i++) {
              game.particles.push({
                x: canvasSize.w / 2 + (Math.random() - 0.5) * 50,
                y: ring.y - game.cameraY,
                vx: (Math.random() - 0.5) * 8,
                vy: (Math.random() - 0.5) * 8,
                life: 40,
                color: THEME.lightning,
              });
            }

            setGameState('gameover');
            fetch('/api/pixelpit/stats', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ game: GAME_ID }),
            }).catch(() => {});
            return;
          } else {
            // Hit normal cloud = bounce
            game.ballY = ringTop - BALL_RADIUS;
            game.ballVY = -8;
            game.combo = 0;
            game.squash = 0.6;
            setCombo(0);
            playBounce();
            ring.passed = true;
            game.score += 1;
            setScore(game.score);
          }
        }
      }

      // Add more rings as we descend
      const lastRing = game.rings[game.rings.length - 1];
      if (lastRing && game.ballY > lastRing.y - canvasSize.h) {
        const newY = lastRing.y + RING_SPACING;
        const hasStorm = Math.random() < 0.45;
        game.rings.push({
          y: newY,
          rotation: 0,
          gapAngle: Math.random() * Math.PI * 2,
          gapSize: Math.max(0.7, 1.2 - game.rings.length * 0.015),
          hasStorm,
          stormAngle: hasStorm ? Math.random() * Math.PI * 2 : 0,
          stormSize: hasStorm ? 0.8 + Math.random() * 0.5 : 0,
          passed: false,
          lightningFlash: 0,
        });
      }

      // Remove old rings
      game.rings = game.rings.filter(r => r.y > game.cameraY - 200);

      // Update particles
      game.particles = game.particles.filter(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.1;
        p.life--;
        return p.life > 0;
      });

      // Lightning flash decay
      for (const ring of game.rings) {
        if (ring.lightningFlash > 0) {
          ring.lightningFlash -= 0.05;
        }
      }
    };

    const draw = () => {
      const game = gameRef.current;

      // Sky gradient (gets darker as you descend)
      const depth = Math.min(game.cameraY / 2000, 1);
      const gradient = ctx.createLinearGradient(0, 0, 0, canvasSize.h);
      const skyR = Math.floor(135 - depth * 105);
      const skyG = Math.floor(206 - depth * 148);
      const skyB = Math.floor(235 - depth * 140);
      gradient.addColorStop(0, `rgb(${skyR}, ${skyG}, ${skyB})`);
      gradient.addColorStop(1, `rgb(${Math.floor(skyR * 0.7)}, ${Math.floor(skyG * 0.7)}, ${Math.floor(skyB * 0.7)})`);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvasSize.w, canvasSize.h);

      const centerX = canvasSize.w / 2;

      // Draw rings (clouds)
      for (const ring of game.rings) {
        const screenY = ring.y - game.cameraY;
        if (screenY < -100 || screenY > canvasSize.h + 100) continue;

        const effectiveRotation = game.rotation;
        const gapStart = ring.gapAngle - ring.gapSize / 2;
        const gapEnd = ring.gapAngle + ring.gapSize / 2;

        // Draw cloud ring segments
        const segments = 32;
        for (let i = 0; i < segments; i++) {
          const angle1 = (i / segments) * Math.PI * 2;
          const angle2 = ((i + 1) / segments) * Math.PI * 2;

          // Check if this segment is in the gap
          const midAngle = (angle1 + angle2) / 2;
          let gapDiff = Math.abs(midAngle - ring.gapAngle);
          if (gapDiff > Math.PI) gapDiff = Math.PI * 2 - gapDiff;
          if (gapDiff < ring.gapSize / 2) continue; // Skip gap

          // Check if this segment is storm
          let isStorm = false;
          if (ring.hasStorm) {
            let stormDiff = Math.abs(midAngle - ring.stormAngle);
            if (stormDiff > Math.PI) stormDiff = Math.PI * 2 - stormDiff;
            isStorm = stormDiff < ring.stormSize / 2;
          }

          const x1 = centerX + Math.cos(angle1 + effectiveRotation) * TOWER_RADIUS;
          const y1 = screenY + Math.sin(angle1 + effectiveRotation) * 20;
          const x2 = centerX + Math.cos(angle2 + effectiveRotation) * TOWER_RADIUS;
          const y2 = screenY + Math.sin(angle2 + effectiveRotation) * 20;

          if (isStorm) {
            // STORM CLOUD - unmistakably dangerous
            ctx.fillStyle = THEME.storm;
            ctx.shadowColor = THEME.stormGlow;
            ctx.shadowBlur = 15 + Math.sin(Date.now() / 100) * 5; // Pulsing glow
            
            // Draw storm segment
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.lineTo(x2, y2 + RING_THICKNESS);
            ctx.lineTo(x1, y1 + RING_THICKNESS);
            ctx.closePath();
            ctx.fill();

            // Lightning crackle effect
            if (Math.random() < 0.03 || ring.lightningFlash > 0) {
              ctx.strokeStyle = THEME.lightning;
              ctx.lineWidth = 2;
              ctx.beginPath();
              const lx = (x1 + x2) / 2;
              const ly = (y1 + y2) / 2 + RING_THICKNESS / 2;
              ctx.moveTo(lx, ly - 10);
              ctx.lineTo(lx + (Math.random() - 0.5) * 10, ly);
              ctx.lineTo(lx + (Math.random() - 0.5) * 10, ly + 10);
              ctx.stroke();
            }
            
            ctx.shadowBlur = 0;
          } else {
            // Normal fluffy cloud
            ctx.fillStyle = THEME.cloud;
            ctx.shadowColor = 'rgba(0,0,0,0.2)';
            ctx.shadowBlur = 5;
            ctx.shadowOffsetY = 3;

            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.lineTo(x2, y2 + RING_THICKNESS);
            ctx.lineTo(x1, y1 + RING_THICKNESS);
            ctx.closePath();
            ctx.fill();

            ctx.shadowBlur = 0;
            ctx.shadowOffsetY = 0;
          }
        }
      }

      // Draw particles
      for (const p of game.particles) {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.life / 40;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // Draw raindrop
      const ballScreenY = game.ballY - game.cameraY;
      const squashX = 1 / game.squash;
      const squashY = game.squash;

      ctx.save();
      ctx.translate(centerX, ballScreenY);
      ctx.scale(squashX, squashY);

      // Raindrop shape (teardrop)
      ctx.fillStyle = THEME.raindrop;
      ctx.shadowColor = THEME.raindropHighlight;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.moveTo(0, -BALL_RADIUS * 1.3);
      ctx.bezierCurveTo(
        BALL_RADIUS, -BALL_RADIUS * 0.5,
        BALL_RADIUS, BALL_RADIUS * 0.8,
        0, BALL_RADIUS
      );
      ctx.bezierCurveTo(
        -BALL_RADIUS, BALL_RADIUS * 0.8,
        -BALL_RADIUS, -BALL_RADIUS * 0.5,
        0, -BALL_RADIUS * 1.3
      );
      ctx.fill();

      // Highlight
      ctx.fillStyle = THEME.raindropHighlight;
      ctx.globalAlpha = 0.6;
      ctx.beginPath();
      ctx.ellipse(-BALL_RADIUS * 0.3, -BALL_RADIUS * 0.2, BALL_RADIUS * 0.25, BALL_RADIUS * 0.4, -0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;

      ctx.shadowBlur = 0;
      ctx.restore();

      // UI
      ctx.fillStyle = THEME.text;
      ctx.font = 'bold 32px ui-monospace, monospace';
      ctx.textAlign = 'center';
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = 4;
      ctx.fillText(`${game.score}`, centerX, 50);

      if (game.combo > 1) {
        ctx.fillStyle = THEME.combo;
        ctx.font = 'bold 24px ui-monospace, monospace';
        ctx.fillText(`×${game.combo}`, centerX, 85);
      }
      ctx.shadowBlur = 0;

      // Swipe hint
      if (game.score === 0 && gameState === 'playing') {
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.font = '16px ui-monospace, monospace';
        ctx.fillText('← swipe to rotate →', centerX, canvasSize.h - 40);
      }
    };

    const gameLoop = () => {
      update();
      draw();
      animationId = requestAnimationFrame(gameLoop);
    };
    animationId = requestAnimationFrame(gameLoop);

    // Input - swipe to rotate
    const handleStart = (x: number) => {
      const game = gameRef.current;
      game.lastTouchX = x;
      game.isDragging = true;
    };

    const handleMove = (x: number) => {
      const game = gameRef.current;
      if (!game.isDragging) return;
      const dx = x - game.lastTouchX;
      game.rotationVel += dx * 0.008;
      game.lastTouchX = x;
    };

    const handleEnd = () => {
      const game = gameRef.current;
      game.isDragging = false;
    };

    const mouseDown = (e: MouseEvent) => handleStart(e.clientX);
    const mouseMove = (e: MouseEvent) => handleMove(e.clientX);
    const mouseUp = () => handleEnd();
    const touchStart = (e: TouchEvent) => {
      e.preventDefault();
      handleStart(e.touches[0].clientX);
    };
    const touchMove = (e: TouchEvent) => {
      e.preventDefault();
      handleMove(e.touches[0].clientX);
    };
    const touchEnd = (e: TouchEvent) => {
      e.preventDefault();
      handleEnd();
    };

    canvas.addEventListener('mousedown', mouseDown);
    canvas.addEventListener('mousemove', mouseMove);
    canvas.addEventListener('mouseup', mouseUp);
    canvas.addEventListener('mouseleave', handleEnd);
    canvas.addEventListener('touchstart', touchStart, { passive: false });
    canvas.addEventListener('touchmove', touchMove, { passive: false });
    canvas.addEventListener('touchend', touchEnd, { passive: false });

    return () => {
      cancelAnimationFrame(animationId);
      canvas.removeEventListener('mousedown', mouseDown);
      canvas.removeEventListener('mousemove', mouseMove);
      canvas.removeEventListener('mouseup', mouseUp);
      canvas.removeEventListener('mouseleave', handleEnd);
      canvas.removeEventListener('touchstart', touchStart);
      canvas.removeEventListener('touchmove', touchMove);
      canvas.removeEventListener('touchend', touchEnd);
    };
  }, [gameState, canvasSize]);

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: THEME.sky,
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
          background: 'linear-gradient(180deg, #87ceeb 0%, #5f9ea0 100%)',
        }}>
          <div style={{ fontSize: 80, marginBottom: 10 }}>💧</div>
          <h1 style={{
            color: THEME.text,
            fontSize: 56,
            marginBottom: 10,
            fontWeight: 900,
            textShadow: '0 4px 8px rgba(0,0,0,0.3)',
          }}>
            DROP
          </h1>

          <p style={{
            color: 'rgba(255,255,255,0.9)',
            fontSize: 16,
            marginBottom: 30,
            textAlign: 'center',
            lineHeight: 1.6,
            maxWidth: 280,
          }}>
            Swipe to rotate the clouds.<br />
            Fall through the gaps.<br />
            <span style={{ color: THEME.stormGlow }}>Avoid the storm clouds!</span>
          </p>

          <button
            onClick={startGame}
            style={{
              background: THEME.raindrop,
              color: '#fff',
              border: 'none',
              padding: '18px 60px',
              fontSize: 18,
              fontWeight: 700,
              cursor: 'pointer',
              borderRadius: 30,
              boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
            }}
          >
            FALL
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

      {gameState === 'gameover' && (
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(180deg, #1e3a5f 0%, #0d1b2a 100%)',
        }}>
          <div style={{ fontSize: 60, marginBottom: 10 }}>⚡</div>
          <h1 style={{ color: THEME.stormGlow, fontSize: 48, marginBottom: 10 }}>
            ZAPPED!
          </h1>
          <p style={{ color: THEME.text, fontSize: 24, marginBottom: 30 }}>
            Score: {score}
          </p>
          <button
            onClick={startGame}
            style={{
              background: THEME.raindrop,
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
