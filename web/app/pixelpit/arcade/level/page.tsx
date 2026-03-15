'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';

const GAME_ID = 'level';
const GAME_NAME = 'LEVEL';
const GRACE_PERIOD = 5; // seconds before offscreen = game over

const COLORS = {
  bg: '#0a0a0f',
  primary: '#FFD700',
  secondary: '#7B68EE',
  text: '#D4A574',
  teal: '#2D9596',
  error: '#FF6B6B',
};

type ScreenState = 'title' | 'playing' | 'gameover';

export default function LevelGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [screenState, setScreenState] = useState<ScreenState>('title');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const gameRef = useRef<any>(null);
  const animRef = useRef<number>(0);

  // Load high score
  useEffect(() => {
    const saved = localStorage.getItem('level-highscore');
    if (saved) setHighScore(parseFloat(saved));
  }, []);

  const startGame = useCallback(() => {
    setScreenState('playing');
    setScore(0);
  }, []);

  // Main game loop
  useEffect(() => {
    if (screenState !== 'playing') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    function resize() {
      canvas!.width = window.innerWidth;
      canvas!.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    // Audio context
    let audioCtx: AudioContext | null = null;
    try {
      audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch {}

    function playTone(freq: number, dur: number, type: OscillatorType = 'sine') {
      if (!audioCtx) return;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.value = 0.08;
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + dur);
    }

    const gs = {
      bubble: { x: canvas.width / 2, y: canvas.height / 2, vx: 0, vy: 0, radius: 22 },
      tiltX: 0,
      tiltY: 0,
      startTime: performance.now(),
      elapsed: 0,
      graceActive: true,
      gameOver: false,
      particles: [] as { x: number; y: number; vx: number; vy: number; life: number; color: string }[],
      toneTimer: 0,
      // For mouse/touch fallback (desktop)
      mouseActive: false,
      mouseX: 0,
      mouseY: 0,
    };
    gameRef.current = gs;

    // Device orientation (mobile)
    function handleOrientation(e: DeviceOrientationEvent) {
      let tx = e.gamma || 0; // left-right
      let ty = e.beta || 0;  // front-back
      tx = Math.max(-45, Math.min(45, tx));
      ty = Math.max(-45, Math.min(45, ty));
      gs.tiltX = tx;
      gs.tiltY = ty;
    }

    // Request orientation permission on iOS
    if (typeof DeviceOrientationEvent !== 'undefined' &&
        typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
      (DeviceOrientationEvent as any).requestPermission()
        .then((state: string) => {
          if (state === 'granted') {
            window.addEventListener('deviceorientation', handleOrientation);
          }
        })
        .catch(() => {});
    } else {
      window.addEventListener('deviceorientation', handleOrientation);
    }

    // Mouse fallback for desktop — tilt based on mouse position relative to center
    function handleMouseMove(e: MouseEvent) {
      gs.mouseActive = true;
      gs.mouseX = e.clientX;
      gs.mouseY = e.clientY;
    }
    function handleTouchMove(e: TouchEvent) {
      gs.mouseActive = true;
      gs.mouseX = e.touches[0].clientX;
      gs.mouseY = e.touches[0].clientY;
    }
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('touchmove', handleTouchMove);

    function endGame() {
      if (gs.gameOver) return;
      gs.gameOver = true;
      const finalScore = gs.elapsed;
      playTone(200, 0.4, 'sawtooth');
      setTimeout(() => playTone(150, 0.4, 'sawtooth'), 150);

      setScore(finalScore);
      // Save high score
      const prev = parseFloat(localStorage.getItem('level-highscore') || '0');
      if (finalScore > prev) {
        localStorage.setItem('level-highscore', finalScore.toString());
        setHighScore(finalScore);
      }
      // Track stats
      fetch('/api/pixelpit/stats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ game: GAME_ID }),
      }).catch(() => {});
      setScreenState('gameover');
    }

    function update() {
      if (gs.gameOver) return;

      const now = performance.now();
      gs.elapsed = (now - gs.startTime) / 1000;
      gs.graceActive = gs.elapsed < GRACE_PERIOD;

      const w = canvas!.width;
      const h = canvas!.height;
      const b = gs.bubble;

      // Apply tilt or mouse-based force
      if (gs.mouseActive) {
        // Desktop: simulate tilt from mouse position relative to center
        const dx = (gs.mouseX - w / 2) / (w / 2); // -1 to 1
        const dy = (gs.mouseY - h / 2) / (h / 2);
        gs.tiltX = dx * 30;
        gs.tiltY = dy * 30;
      }

      const sensitivity = 0.4;
      b.vx += gs.tiltX * sensitivity;
      b.vy += gs.tiltY * sensitivity;

      // Damping
      b.vx *= 0.93;
      b.vy *= 0.93;

      // Update position
      b.x += b.vx;
      b.y += b.vy;

      // During grace period: bounce off walls
      if (gs.graceActive) {
        if (b.x - b.radius < 0) { b.x = b.radius; b.vx *= -0.6; }
        if (b.x + b.radius > w) { b.x = w - b.radius; b.vx *= -0.6; }
        if (b.y - b.radius < 0) { b.y = b.radius; b.vy *= -0.6; }
        if (b.y + b.radius > h) { b.y = h - b.radius; b.vy *= -0.6; }
      } else {
        // After grace: if ball fully offscreen → game over
        if (b.x + b.radius < 0 || b.x - b.radius > w ||
            b.y + b.radius < 0 || b.y - b.radius > h) {
          endGame();
          return;
        }
      }

      // Centered check (for particles + tone)
      const centerX = w / 2;
      const centerY = h / 2;
      const dist = Math.hypot(b.x - centerX, b.y - centerY);
      const targetRadius = Math.min(w, h) * 0.08;
      const centered = dist < targetRadius;

      // Tone feedback
      gs.toneTimer += 1 / 60;
      if (centered && gs.toneTimer > 0.2) {
        playTone(440 + gs.elapsed * 2, 0.05, 'sine');
        gs.toneTimer = 0;
      }

      // Spawn particles when centered
      if (centered && Math.random() < 0.3) {
        gs.particles.push({
          x: b.x + (Math.random() - 0.5) * b.radius,
          y: b.y + (Math.random() - 0.5) * b.radius,
          vx: (Math.random() - 0.5) * 2,
          vy: (Math.random() - 0.5) * 2,
          life: 1,
          color: Math.random() < 0.5 ? COLORS.primary : COLORS.teal,
        });
      }

      // Update particles
      gs.particles = gs.particles.filter(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.02;
        return p.life > 0;
      });
    }

    function draw() {
      const w = canvas!.width;
      const h = canvas!.height;
      const b = gs.bubble;
      const centerX = w / 2;
      const centerY = h / 2;
      const targetRadius = Math.min(w, h) * 0.08;
      const dist = Math.hypot(b.x - centerX, b.y - centerY);
      const centered = dist < targetRadius;

      // Fade background
      ctx!.fillStyle = 'rgba(10, 10, 15, 0.15)';
      ctx!.fillRect(0, 0, w, h);

      // Grace period indicator
      if (gs.graceActive) {
        const remaining = Math.max(0, GRACE_PERIOD - gs.elapsed);
        ctx!.save();
        ctx!.font = 'bold 14px ui-monospace, monospace';
        ctx!.textAlign = 'center';
        ctx!.fillStyle = COLORS.primary;
        ctx!.globalAlpha = 0.6 + Math.sin(gs.elapsed * 6) * 0.3;
        ctx!.fillText(`GRACE: ${remaining.toFixed(1)}s — walls are bouncy!`, w / 2, 90);
        ctx!.restore();
      } else {
        // Warning: no more walls
        ctx!.save();
        ctx!.font = '12px ui-monospace, monospace';
        ctx!.textAlign = 'center';
        ctx!.fillStyle = COLORS.error;
        ctx!.globalAlpha = 0.5;
        ctx!.fillText('⚠ No walls — don\'t let it slide off!', w / 2, 90);
        ctx!.restore();

        // Draw edge danger indicators when bubble is near edge
        const edgeThreshold = 80;
        ctx!.save();
        ctx!.globalAlpha = 0.3;
        if (b.x < edgeThreshold) {
          const grad = ctx!.createLinearGradient(0, 0, edgeThreshold, 0);
          grad.addColorStop(0, COLORS.error);
          grad.addColorStop(1, 'transparent');
          ctx!.fillStyle = grad;
          ctx!.fillRect(0, 0, edgeThreshold, h);
        }
        if (b.x > w - edgeThreshold) {
          const grad = ctx!.createLinearGradient(w - edgeThreshold, 0, w, 0);
          grad.addColorStop(0, 'transparent');
          grad.addColorStop(1, COLORS.error);
          ctx!.fillStyle = grad;
          ctx!.fillRect(w - edgeThreshold, 0, edgeThreshold, h);
        }
        if (b.y < edgeThreshold) {
          const grad = ctx!.createLinearGradient(0, 0, 0, edgeThreshold);
          grad.addColorStop(0, COLORS.error);
          grad.addColorStop(1, 'transparent');
          ctx!.fillStyle = grad;
          ctx!.fillRect(0, 0, w, edgeThreshold);
        }
        if (b.y > h - edgeThreshold) {
          const grad = ctx!.createLinearGradient(0, h - edgeThreshold, 0, h);
          grad.addColorStop(0, 'transparent');
          grad.addColorStop(1, COLORS.error);
          ctx!.fillStyle = grad;
          ctx!.fillRect(0, h - edgeThreshold, w, edgeThreshold);
        }
        ctx!.restore();
      }

      // Target zone
      ctx!.beginPath();
      ctx!.arc(centerX, centerY, targetRadius, 0, Math.PI * 2);
      ctx!.strokeStyle = centered ? COLORS.teal : 'rgba(45, 149, 150, 0.3)';
      ctx!.lineWidth = 2;
      ctx!.stroke();

      // Center crosshair
      ctx!.strokeStyle = 'rgba(45, 149, 150, 0.4)';
      ctx!.lineWidth = 1;
      ctx!.beginPath();
      ctx!.moveTo(centerX - 12, centerY);
      ctx!.lineTo(centerX + 12, centerY);
      ctx!.moveTo(centerX, centerY - 12);
      ctx!.lineTo(centerX, centerY + 12);
      ctx!.stroke();

      // Particles
      gs.particles.forEach(p => {
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, 3, 0, Math.PI * 2);
        ctx!.fillStyle = p.color;
        ctx!.globalAlpha = p.life;
        ctx!.fill();
        ctx!.globalAlpha = 1;
      });

      // Bubble glow
      const glowIntensity = centered ? 0.8 : 0.3;
      const glow = ctx!.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.radius * 2.5);
      glow.addColorStop(0, `rgba(212, 165, 116, ${glowIntensity})`);
      glow.addColorStop(1, 'rgba(212, 165, 116, 0)');
      ctx!.beginPath();
      ctx!.arc(b.x, b.y, b.radius * 2.5, 0, Math.PI * 2);
      ctx!.fillStyle = glow;
      ctx!.fill();

      // Bubble body
      const bubbleGrad = ctx!.createRadialGradient(
        b.x - b.radius * 0.3, b.y - b.radius * 0.3, 0,
        b.x, b.y, b.radius
      );
      bubbleGrad.addColorStop(0, COLORS.primary);
      bubbleGrad.addColorStop(1, COLORS.text);
      ctx!.beginPath();
      ctx!.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
      ctx!.fillStyle = bubbleGrad;
      ctx!.fill();

      // Bubble highlight
      ctx!.beginPath();
      ctx!.arc(b.x - b.radius * 0.3, b.y - b.radius * 0.3, b.radius * 0.3, 0, Math.PI * 2);
      ctx!.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx!.fill();

      // Bubble outline
      ctx!.beginPath();
      ctx!.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
      ctx!.strokeStyle = centered ? COLORS.teal : COLORS.text;
      ctx!.lineWidth = 2;
      ctx!.stroke();

      // HUD — score
      ctx!.font = 'bold 28px ui-monospace, monospace';
      ctx!.textAlign = 'center';
      ctx!.textBaseline = 'top';
      ctx!.fillStyle = COLORS.primary;
      ctx!.shadowColor = COLORS.primary;
      ctx!.shadowBlur = 15;
      ctx!.fillText(`${gs.elapsed.toFixed(1)}s`, w / 2, 20);
      ctx!.shadowBlur = 0;

      // Status
      ctx!.font = '14px ui-monospace, monospace';
      ctx!.fillStyle = centered ? COLORS.teal : COLORS.text;
      ctx!.fillText(
        centered ? '✓ CENTERED' : 'Tilt to center',
        w / 2, 55
      );
    }

    function loop() {
      update();
      draw();
      animRef.current = requestAnimationFrame(loop);
    }

    animRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', resize);
      window.removeEventListener('deviceorientation', handleOrientation);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchmove', handleTouchMove);
      if (audioCtx) audioCtx.close();
    };
  }, [screenState]);

  // Title screen
  if (screenState === 'title') {
    return (
      <div style={{
        position: 'fixed', inset: 0,
        background: 'radial-gradient(ellipse at center, #1a1a2e 0%, #0a0a0f 70%)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'ui-monospace, monospace', color: '#fff',
      }}>
        <div style={{ fontSize: 48, marginBottom: 8, filter: 'drop-shadow(0 0 20px rgba(255,215,0,0.5))' }}>⚖️</div>
        <h1 style={{ fontSize: 36, color: COLORS.primary, textShadow: `0 0 30px rgba(255,215,0,0.4)`, marginBottom: 4 }}>
          LEVEL
        </h1>
        <p style={{ color: COLORS.text, fontSize: 14, marginBottom: 30, opacity: 0.7 }}>Keep it centered. Don't let it drift.</p>

        {highScore > 0 && (
          <p style={{ color: COLORS.teal, fontSize: 16, marginBottom: 20 }}>
            Best: {highScore.toFixed(1)}s
          </p>
        )}

        <button
          onClick={startGame}
          style={{
            padding: '16px 48px', fontSize: 20, fontFamily: 'ui-monospace, monospace',
            background: COLORS.secondary, color: COLORS.primary,
            border: `2px solid ${COLORS.primary}`, borderRadius: 8, cursor: 'pointer',
            boxShadow: `0 0 30px rgba(123,104,238,0.5)`,
          }}
        >
          START
        </button>

        <p style={{ color: COLORS.teal, fontSize: 12, marginTop: 20, opacity: 0.6, textAlign: 'center', maxWidth: 280 }}>
          📱 Tilt your phone to move the bubble<br/>
          🖱️ Or move your mouse on desktop<br/><br/>
          5s grace period, then the walls disappear!
        </p>
      </div>
    );
  }

  // Game over screen
  if (screenState === 'gameover') {
    return (
      <div style={{
        position: 'fixed', inset: 0,
        background: 'radial-gradient(ellipse at center, #1a1a2e 0%, #0a0a0f 70%)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'ui-monospace, monospace', color: '#fff',
      }}>
        <div style={{ fontSize: 48, marginBottom: 8 }}>💫</div>
        <h2 style={{ fontSize: 28, color: COLORS.error, marginBottom: 4 }}>GAME OVER</h2>
        <p style={{ color: COLORS.text, fontSize: 14, marginBottom: 20, opacity: 0.6 }}>The bubble slid away...</p>

        <div style={{ fontSize: 40, color: COLORS.primary, textShadow: `0 0 20px rgba(255,215,0,0.5)`, marginBottom: 8 }}>
          {score.toFixed(1)}s
        </div>

        {score >= highScore && score > 0 && (
          <p style={{ color: COLORS.teal, fontSize: 14, marginBottom: 8 }}>🏆 NEW BEST!</p>
        )}

        <p style={{ color: COLORS.teal, fontSize: 14, marginBottom: 30 }}>
          Best: {highScore.toFixed(1)}s
        </p>

        <button
          onClick={startGame}
          style={{
            padding: '14px 40px', fontSize: 18, fontFamily: 'ui-monospace, monospace',
            background: COLORS.secondary, color: COLORS.primary,
            border: `2px solid ${COLORS.primary}`, borderRadius: 8, cursor: 'pointer',
            boxShadow: `0 0 30px rgba(123,104,238,0.5)`,
          }}
        >
          TRY AGAIN
        </button>
      </div>
    );
  }

  // Playing
  return (
    <canvas
      ref={canvasRef}
      style={{ display: 'block', position: 'fixed', inset: 0, background: COLORS.bg }}
    />
  );
}
