'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';

const THEME = {
  ball: '#f97316',
  ballGlow: '#fbbf24',
  breakable: '#4ade80',
  breakableAlt: '#60a5fa',
  solid: '#000000',
  solidGlow: '#ef4444',
  bg: '#1e293b',
  hub: '#334155',
  text: '#fafafa',
  danger: '#ef4444',
};

const GAME_ID = 'melt3';
const NUM_PIZZAS = 40;
const MAX_HEALTH = 3;
const BALL_RADIUS = 20;

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

function playSmash() {
  if (!audioCtx || !masterGain) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'square';
  osc.frequency.setValueAtTime(200, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(80, audioCtx.currentTime + 0.08);
  gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.1);
  osc.connect(gain);
  gain.connect(masterGain);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.1);
}

function playHit() {
  if (!audioCtx || !masterGain) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(150, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(50, audioCtx.currentTime + 0.3);
  gain.gain.setValueAtTime(0.4, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
  osc.connect(gain);
  gain.connect(masterGain);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.3);
}

function playWin() {
  if (!audioCtx || !masterGain) return;
  [523, 659, 784, 1047].forEach((freq, i) => {
    setTimeout(() => {
      if (!audioCtx || !masterGain) return;
      const osc = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      g.gain.setValueAtTime(0.2, audioCtx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4);
      osc.connect(g);
      g.connect(masterGain);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.4);
    }, i * 100);
  });
}

function playDeath() {
  if (!audioCtx || !masterGain) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(200, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(30, audioCtx.currentTime + 0.8);
  gain.gain.setValueAtTime(0.4, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.8);
  osc.connect(gain);
  gain.connect(masterGain);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.8);
}

interface Pizza {
  x: number;
  y: number;
  radius: number;
  innerRadius: number;
  segments: Array<{
    startAngle: number;
    endAngle: number;
    type: 'breakable' | 'solid' | 'gap';
    broken: boolean;
    color: string;
  }>;
  rotation: number;
  speed: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
}

export default function Melt3Game() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<'start' | 'playing' | 'won' | 'dead'>('start');
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(MAX_HEALTH);
  const [canvasSize, setCanvasSize] = useState({ w: 400, h: 700 });

  const gameRef = useRef({
    running: false,
    holding: false,
    ballX: 0,
    ballY: 80,
    ballVY: 0,
    ballLocalAngle: 0, // angle on the pizza in LOCAL space (center of landed slice)
    landedPizza: null as Pizza | null,
    skipPizza: null as Pizza | null,
    cameraY: 0,
    pizzas: [] as Pizza[],
    particles: [] as Particle[],
    score: 0,
    lives: MAX_HEALTH,
    combo: 0,
  });

  const generatePizzas = useCallback((canvasW: number) => {
    const pizzas: Pizza[] = [];
    let currentY = 250;
    const centerX = canvasW / 2;
    let wanderX = centerX;

    const minRadius = Math.max(50, canvasW * 0.13);
    const maxRadius = Math.min(170, canvasW * 0.44);

    for (let i = 0; i < NUM_PIZZAS; i++) {
      const progress = i / NUM_PIZZAS;

      const sizeBias = 1 - progress * 0.35;
      const radius = minRadius + Math.random() * (maxRadius - minRadius) * sizeBias;
      const innerRadius = Math.max(12, radius * 0.17);

      const prevPizza = pizzas[i - 1];
      const prevR = prevPizza ? prevPizza.radius : 0;
      const verticalSpacing = Math.max(55, (radius + prevR) * 0.48);
      currentY += verticalSpacing;

      // First pizza near center so ball can reach it
      if (i < 2) {
        wanderX += (Math.random() - 0.5) * 40;
      } else {
        wanderX += (Math.random() - 0.5) * canvasW * 0.55;
      }
      wanderX = Math.max(radius * 0.35, Math.min(canvasW - radius * 0.35, wanderX));

      const numSegments = Math.round(5 + (radius / maxRadius) * 7);
      const segments: Pizza['segments'] = [];
      const segmentSize = (Math.PI * 2) / numSegments;

      for (let s = 0; s < numSegments; s++) {
        const startAngle = s * segmentSize;
        const endAngle = startAngle + segmentSize * 0.84;

        let type: 'breakable' | 'solid' | 'gap';
        const roll = Math.random();

        if (i < 3) {
          type = 'breakable';
        } else if (progress < 0.3) {
          type = roll < 0.15 ? 'gap' : (roll < 0.85 ? 'breakable' : 'solid');
        } else if (progress < 0.6) {
          type = roll < 0.1 ? 'gap' : (roll < 0.6 ? 'breakable' : 'solid');
        } else {
          type = roll < 0.08 ? 'gap' : (roll < 0.45 ? 'breakable' : 'solid');
        }

        const color = type === 'breakable'
          ? (Math.random() < 0.5 ? THEME.breakable : THEME.breakableAlt)
          : THEME.solid;

        segments.push({ startAngle, endAngle, type, broken: false, color });
      }

      const hasEscape = segments.some(s => s.type === 'breakable' || s.type === 'gap');
      if (!hasEscape) {
        const idx = Math.floor(Math.random() * segments.length);
        segments[idx].type = 'breakable';
        segments[idx].color = THEME.breakable;
      }

      const baseSpeed = 50 / radius;
      const direction = i % 2 === 0 ? 1 : -1;
      const speedVariation = 0.8 + Math.random() * 0.4;

      pizzas.push({
        x: wanderX,
        y: currentY,
        radius,
        innerRadius,
        segments,
        rotation: Math.random() * Math.PI * 2,
        speed: baseSpeed * direction * speedVariation,
      });
    }
    return pizzas;
  }, []);

  const startGame = useCallback(() => {
    initAudio();
    const game = gameRef.current;
    game.running = true;
    game.holding = false;
    game.ballY = 80;
    game.ballVY = 0;
    game.ballLocalAngle = 0;
    game.landedPizza = null;
    game.skipPizza = null;
    game.cameraY = 0;
    game.pizzas = generatePizzas(canvasSize.w);
    game.ballX = game.pizzas[0]?.x ?? canvasSize.w / 2;
    game.particles = [];
    game.score = 0;
    game.lives = MAX_HEALTH;
    game.combo = 0;
    setScore(0);
    setLives(MAX_HEALTH);
    setGameState('playing');
  }, [generatePizzas, canvasSize.w]);

  useEffect(() => {
    const MAX_GAME_WIDTH = 430; // iPhone-ish viewport
    const updateSize = () => {
      setCanvasSize({
        w: Math.min(window.innerWidth, MAX_GAME_WIDTH),
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

    const update = () => {
      const game = gameRef.current;
      if (!game.running) return;

      // Rotate all gears
      for (const pizza of game.pizzas) {
        pizza.rotation += pizza.speed * 0.015;
      }

      // === GLUED: ball is welded to a specific slice ===
      // localAngle is fixed (center of the slice). Pizza rotation moves it.
      if (game.landedPizza && !game.holding) {
        const worldAngle = game.ballLocalAngle + game.landedPizza.rotation;
        const glueR = game.landedPizza.radius + BALL_RADIUS;
        game.ballX = game.landedPizza.x + Math.cos(worldAngle) * glueR;
        game.ballY = game.landedPizza.y + Math.sin(worldAngle) * glueR;
      } else {
        // === DETACH from pizza if we were on one ===
        if (game.landedPizza) {
          game.skipPizza = game.landedPizza;
          game.landedPizza = null;
        }

        // === FALL STRAIGHT DOWN — no horizontal drift ===
        const gravity = game.holding ? 1.5 : 0.4;
        game.ballVY += gravity;
        game.ballVY = Math.min(game.ballVY, game.holding ? 25 : 8);
        game.ballY += game.ballVY;
      }

      // Camera — track pizza center when glued (prevents jitter), ball when falling
      const cameraTarget = game.landedPizza
        ? game.landedPizza.y - canvasSize.h / 3
        : game.ballY - canvasSize.h / 3;
      game.cameraY += (cameraTarget - game.cameraY) * 0.12;

      // === COLLISION — 2D ring intersection ===
      if (!game.landedPizza) {
        for (const pizza of game.pizzas) {
          if (game.landedPizza) break;

          // Skip the pizza we just detached from until we're clear of it
          if (pizza === game.skipPizza) {
            const sdx = game.ballX - pizza.x;
            const sdy = game.ballY - pizza.y;
            const sDist = Math.sqrt(sdx * sdx + sdy * sdy);
            if (sDist < pizza.radius + BALL_RADIUS * 2.5) continue;
            game.skipPizza = null;
          }

          const dx = game.ballX - pizza.x;
          const dy = game.ballY - pizza.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          // Ball must overlap the ring (between inner and outer radius)
          if (dist + BALL_RADIUS < pizza.innerRadius) continue;
          if (dist - BALL_RADIUS > pizza.radius) continue;

          // Angle where ball meets the ring
          const rawAngle = Math.atan2(dy, dx);
          const checkAngle = ((rawAngle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);

          // Check segments at this angle
          for (const seg of pizza.segments) {
            if (seg.broken || seg.type === 'gap') continue;

            const segStart = (seg.startAngle + pizza.rotation) % (Math.PI * 2);
            const segEnd = (seg.endAngle + pizza.rotation) % (Math.PI * 2);

            const normStart = ((segStart % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
            const normEnd = ((segEnd % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);

            let inSeg = false;
            if (normStart < normEnd) {
              inSeg = checkAngle >= normStart && checkAngle <= normEnd;
            } else {
              inSeg = checkAngle >= normStart || checkAngle <= normEnd;
            }

            if (inSeg) {
              if (seg.type === 'breakable') {
                if (game.holding) {
                  // SMASH through
                  seg.broken = true;
                  game.score += 20 + game.combo * 5;
                  game.combo++;
                  setScore(game.score);
                  playSmash();

                  for (let p = 0; p < 12; p++) {
                    game.particles.push({
                      x: game.ballX + (Math.random() - 0.5) * 60,
                      y: game.ballY,
                      vx: (Math.random() - 0.5) * 12,
                      vy: (Math.random() - 0.5) * 8,
                      life: 25,
                      color: seg.color,
                    });
                  }
                } else {
                  // LAND — weld to the center of this slice
                  game.ballLocalAngle = (seg.startAngle + seg.endAngle) / 2;
                  game.landedPizza = pizza;
                  game.skipPizza = null;
                  game.ballVY = 0;
                  game.combo = 0;
                  const wAngle = game.ballLocalAngle + pizza.rotation;
                  const glueR = pizza.radius + BALL_RADIUS;
                  game.ballX = pizza.x + Math.cos(wAngle) * glueR;
                  game.ballY = pizza.y + Math.sin(wAngle) * glueR;
                }
              } else {
                // SOLID
                if (game.holding) {
                  game.lives--;
                  setLives(game.lives);
                  game.combo = 0;
                  playHit();

                  for (let p = 0; p < 8; p++) {
                    game.particles.push({
                      x: game.ballX + (Math.random() - 0.5) * 40,
                      y: game.ballY,
                      vx: (Math.random() - 0.5) * 6,
                      vy: (Math.random() - 0.5) * 3,
                      life: 20,
                      color: THEME.danger,
                    });
                  }

                  if (game.lives <= 0) {
                    game.running = false;
                    playDeath();
                    setGameState('dead');
                    return;
                  }
                }

                // Land on solid — weld to center of this slice
                game.ballLocalAngle = (seg.startAngle + seg.endAngle) / 2;
                game.landedPizza = pizza;
                game.skipPizza = null;
                game.ballVY = 0;
                game.holding = false;
                game.combo = 0;
                const wAngle2 = game.ballLocalAngle + pizza.rotation;
                const glueR = pizza.radius + BALL_RADIUS;
                game.ballX = pizza.x + Math.cos(wAngle2) * glueR;
                game.ballY = pizza.y + Math.sin(wAngle2) * glueR;
              }
              break;
            }
          }
        }
      }

      // Win
      const lastPizza = game.pizzas[game.pizzas.length - 1];
      if (game.ballY > lastPizza.y + lastPizza.radius + 200) {
        game.running = false;
        playWin();
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
        p.vy += 0.3;
        p.life--;
        return p.life > 0;
      });
    };

    const draw = () => {
      const game = gameRef.current;

      ctx.fillStyle = THEME.bg;
      ctx.fillRect(0, 0, canvasSize.w, canvasSize.h);

      // Draw pizzas (gears)
      for (const pizza of game.pizzas) {
        const screenY = pizza.y - game.cameraY;
        if (screenY < -pizza.radius - 50 || screenY > canvasSize.h + pizza.radius + 50) continue;

        for (const seg of pizza.segments) {
          if (seg.broken || seg.type === 'gap') continue;

          const startAngle = seg.startAngle + pizza.rotation;
          const endAngle = seg.endAngle + pizza.rotation;

          ctx.fillStyle = seg.color;
          if (seg.type === 'breakable') {
            ctx.shadowColor = seg.color;
            ctx.shadowBlur = 10;
          } else {
            ctx.shadowColor = THEME.solidGlow;
            ctx.shadowBlur = 15;
          }

          ctx.beginPath();
          ctx.arc(pizza.x, screenY, pizza.radius, startAngle, endAngle);
          ctx.arc(pizza.x, screenY, pizza.innerRadius, endAngle, startAngle, true);
          ctx.closePath();
          ctx.fill();
        }
        ctx.shadowBlur = 0;

        // Hub / axle
        ctx.fillStyle = THEME.hub;
        ctx.beginPath();
        ctx.arc(pizza.x, screenY, pizza.innerRadius * 0.6, 0, Math.PI * 2);
        ctx.fill();
      }

      // Particles
      for (const p of game.particles) {
        const screenY = p.y - game.cameraY;
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.life / 25;
        ctx.beginPath();
        ctx.arc(p.x, screenY, 6, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // Ball
      const ballScreenY = game.ballY - game.cameraY;

      // Smash trail
      if (game.holding && game.ballVY > 5) {
        ctx.fillStyle = THEME.ballGlow;
        ctx.globalAlpha = 0.4;
        for (let i = 1; i <= 4; i++) {
          ctx.beginPath();
          ctx.arc(game.ballX, ballScreenY - i * 12, BALL_RADIUS * (1 - i * 0.15), 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }

      ctx.fillStyle = THEME.ball;
      ctx.shadowColor = THEME.ballGlow;
      ctx.shadowBlur = game.holding ? 25 : 10;
      ctx.beginPath();
      ctx.arc(game.ballX, ballScreenY, BALL_RADIUS, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // UI
      ctx.fillStyle = THEME.text;
      ctx.font = 'bold 24px monospace';
      ctx.fillText(`${game.score}`, 20, 40);

      ctx.font = '20px monospace';
      for (let i = 0; i < MAX_HEALTH; i++) {
        ctx.fillStyle = i < game.lives ? THEME.danger : '#333';
        ctx.fillText('\u2665', canvasSize.w - 30 - i * 25, 35);
      }

      if (game.combo > 1) {
        ctx.fillStyle = THEME.ballGlow;
        ctx.font = 'bold 18px monospace';
        ctx.fillText(`x${game.combo}`, 20, 65);
      }

      if (game.holding) {
        ctx.fillStyle = THEME.ball;
        ctx.font = 'bold 18px monospace';
        ctx.fillText('\u26A1 SMASHING \u26A1', canvasSize.w / 2 - 70, 70);
      }
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
            color: THEME.ball,
            fontSize: 72,
            marginBottom: 20,
            textShadow: `0 0 40px ${THEME.ballGlow}`,
            fontWeight: 900,
          }}>
            SMASH
          </h1>

          <div style={{
            background: 'rgba(0,0,0,0.5)',
            padding: 25,
            borderRadius: 12,
            marginBottom: 30,
            textAlign: 'left',
            maxWidth: 300,
          }}>
            <p style={{ color: THEME.breakable, fontSize: 18, marginBottom: 15 }}>
              <strong>HOLD</strong> = smash through colors
            </p>
            <p style={{ color: THEME.text, fontSize: 18, marginBottom: 15 }}>
              <strong>RELEASE</strong> = land safely
            </p>
            <p style={{ color: THEME.solid, fontSize: 16, background: '#fff', padding: '4px 8px', borderRadius: 4, display: 'inline-block' }}>
              &#9632; BLACK = don&apos;t hit!
            </p>
          </div>

          <button
            onClick={startGame}
            style={{
              background: THEME.ball,
              color: '#fff',
              border: 'none',
              padding: '20px 70px',
              fontSize: 22,
              fontWeight: 700,
              cursor: 'pointer',
              borderRadius: 50,
              textTransform: 'uppercase',
            }}
          >
            Play
          </button>
        </div>
      )}

      {gameState === 'playing' && (
        <canvas
          ref={canvasRef}
          style={{ display: 'block', touchAction: 'none', margin: '0 auto' }}
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
          <h1 style={{ color: THEME.ballGlow, fontSize: 64, marginBottom: 20 }}>
            WIN!
          </h1>
          <p style={{ color: THEME.text, fontSize: 28, marginBottom: 30 }}>
            Score: {score}
          </p>
          <button
            onClick={startGame}
            style={{
              background: THEME.ball,
              color: '#fff',
              border: 'none',
              padding: '18px 60px',
              fontSize: 20,
              cursor: 'pointer',
              borderRadius: 50,
            }}
          >
            Again
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
          <h1 style={{ color: THEME.danger, fontSize: 56, marginBottom: 20 }}>
            GAME OVER
          </h1>
          <p style={{ color: THEME.text, fontSize: 28, marginBottom: 30 }}>
            Score: {score}
          </p>
          <button
            onClick={startGame}
            style={{
              background: THEME.ball,
              color: '#fff',
              border: 'none',
              padding: '18px 60px',
              fontSize: 20,
              cursor: 'pointer',
              borderRadius: 50,
            }}
          >
            Retry
          </button>
        </div>
      )}
    </div>
  );
}
