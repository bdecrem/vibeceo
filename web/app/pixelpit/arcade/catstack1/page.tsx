'use client';

import React, { useEffect, useRef, useState } from 'react';

// VERSION 1: STABILITY METER
// Bad landings drain stability, perfect landings restore it
// Tower collapses when stability hits zero

const CAT_COLORS = [
  { body: '#FFB347', stripe: '#E8941A', name: 'orange' },
  { body: '#A0A0A0', stripe: '#707070', name: 'gray' },
  { body: '#FFE4C4', stripe: '#DDB892', name: 'cream' },
  { body: '#2D2D2D', stripe: '#1A1A1A', name: 'black' },
  { body: '#FFFFFF', stripe: '#E0E0E0', name: 'white' },
];

const CAT_FACES = ['=^.^=', '>^.^<', '=^o^=', '>^w^<', '=^_^=', '=°.°='];

interface StackedCat {
  x: number;
  y: number;
  width: number;
  color: typeof CAT_COLORS[0];
  face: string;
  wobble: number;
}

export default function CatStack1Game() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<'start' | 'playing' | 'gameover'>('start');
  const [score, setScore] = useState(0);
  const [stability, setStability] = useState(100);

  const gameRef = useRef({
    running: false,
    score: 0,
    stability: 100, // 0-100, game over at 0
    currentCat: {
      x: 0,
      width: 100,
      height: 40,
      direction: 1,
      speed: 2.5,
      dropping: false,
      dropY: 0,
      dropSpeed: 0,
      color: CAT_COLORS[0],
      face: CAT_FACES[0],
    },
    stack: [] as StackedCat[],
    shake: 0,
    baseY: 0,
    baseWidth: 120,
    cameraY: 0,
    targetCameraY: 0,
    wobbleTime: 0,
  });

  const CAT_HEIGHT = 40;
  const PERFECT_THRESHOLD = 15;
  const MAX_STABILITY = 100;

  const startGame = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const game = gameRef.current;
    game.baseY = canvas.height - 120;
    game.baseWidth = 120;
    game.cameraY = 0;
    game.targetCameraY = 0;
    game.stack = [];
    game.score = 0;
    game.stability = MAX_STABILITY;
    game.shake = 0;
    game.wobbleTime = 0;

    game.currentCat = {
      x: 0,
      width: game.baseWidth,
      height: CAT_HEIGHT,
      direction: 1,
      speed: 2.5,
      dropping: false,
      dropY: 60,
      dropSpeed: 0,
      color: CAT_COLORS[Math.floor(Math.random() * CAT_COLORS.length)],
      face: CAT_FACES[Math.floor(Math.random() * CAT_FACES.length)],
    };

    game.running = true;
    setScore(0);
    setStability(MAX_STABILITY);
    setGameState('playing');
  };

  const dropCat = () => {
    const game = gameRef.current;
    if (!game.running || game.currentCat.dropping) return;
    game.currentCat.dropping = true;
    game.currentCat.dropSpeed = 0;
  };

  const spawnNextCat = () => {
    const game = gameRef.current;
    const newSpeed = Math.min(5, 2.5 + game.score * 0.1);
    const startFromLeft = game.score % 2 === 0;

    game.currentCat = {
      x: startFromLeft ? -game.baseWidth : canvasRef.current!.width,
      width: game.baseWidth, // Always full width in this version
      height: CAT_HEIGHT,
      direction: startFromLeft ? 1 : -1,
      speed: newSpeed,
      dropping: false,
      dropY: 60 + game.cameraY,
      dropSpeed: 0,
      color: CAT_COLORS[Math.floor(Math.random() * CAT_COLORS.length)],
      face: CAT_FACES[Math.floor(Math.random() * CAT_FACES.length)],
    };
  };

  const gameOver = () => {
    const game = gameRef.current;
    game.running = false;
    game.shake = 20;
    setScore(game.score);
    setTimeout(() => setGameState('gameover'), 800);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = Math.min(window.innerWidth, 420);
      canvas.height = window.innerHeight;
      gameRef.current.baseY = canvas.height - 120;
    };
    resize();
    window.addEventListener('resize', resize);

    let animationId: number;

    const update = () => {
      const game = gameRef.current;
      if (!game.running) return;

      game.wobbleTime += 0.1;
      const cat = game.currentCat;

      if (!cat.dropping) {
        cat.x += cat.speed * cat.direction;
        if (cat.x <= -cat.width * 0.3) cat.direction = 1;
        else if (cat.x >= canvas.width - cat.width * 0.7) cat.direction = -1;
      } else {
        cat.dropSpeed += 1.2;
        cat.dropY += cat.dropSpeed;

        let landingY: number;
        let targetX: number;

        if (game.stack.length === 0) {
          landingY = game.baseY - CAT_HEIGHT;
          targetX = (canvas.width - game.baseWidth) / 2;
        } else {
          const prev = game.stack[game.stack.length - 1];
          landingY = prev.y - CAT_HEIGHT;
          targetX = prev.x;
        }

        if (cat.dropY >= landingY) {
          cat.dropY = landingY;

          // Calculate how off-center we are
          const offset = Math.abs(cat.x - targetX);
          const maxOffset = game.baseWidth * 0.6;

          if (offset > maxOffset) {
            // Completely missed
            gameOver();
            return;
          }

          // Calculate stability change based on accuracy
          const accuracy = 1 - (offset / maxOffset);

          if (offset < PERFECT_THRESHOLD) {
            // Perfect landing - restore stability
            game.stability = Math.min(MAX_STABILITY, game.stability + 15);
            game.stack.push({
              x: targetX,
              y: landingY,
              width: game.baseWidth,
              color: cat.color,
              face: cat.face,
              wobble: 0,
            });
          } else {
            // Imperfect landing - lose stability based on how bad
            const stabilityLoss = Math.floor((1 - accuracy) * 30);
            game.stability = Math.max(0, game.stability - stabilityLoss);
            game.shake = stabilityLoss / 3;

            // Add wobble to all cats
            game.stack.forEach(c => {
              c.wobble = (Math.random() - 0.5) * 0.1 * (1 - accuracy);
            });

            game.stack.push({
              x: cat.x, // Keep actual position
              y: landingY,
              width: game.baseWidth,
              color: cat.color,
              face: cat.face,
              wobble: (Math.random() - 0.5) * 0.15,
            });
          }

          setStability(game.stability);

          if (game.stability <= 0) {
            gameOver();
            return;
          }

          game.score++;
          setScore(game.score);

          const stackTop = landingY;
          const visibleTop = game.cameraY + 150;
          if (stackTop < visibleTop) {
            game.targetCameraY = stackTop - 150;
          }

          spawnNextCat();
        }
      }

      game.cameraY += (game.targetCameraY - game.cameraY) * 0.1;

      // Decay wobble
      game.stack.forEach(c => {
        c.wobble *= 0.95;
      });

      game.shake *= 0.9;
    };

    const drawCat = (
      x: number, y: number, width: number, height: number,
      color: typeof CAT_COLORS[0], face: string, wobble = 0
    ) => {
      ctx.save();
      ctx.translate(x + width / 2, y + height / 2);
      ctx.rotate(wobble);

      ctx.fillStyle = color.body;
      ctx.beginPath();
      ctx.roundRect(-width / 2, -height / 2, width, height, 12);
      ctx.fill();

      if (width > 25) {
        ctx.fillStyle = color.stripe;
        for (let i = 0; i < 3; i++) {
          ctx.beginPath();
          ctx.ellipse(-width / 4 + i * (width / 4), 0, 2, height / 3, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Ears
      const earSize = 10;
      ctx.fillStyle = color.body;
      ctx.beginPath();
      ctx.moveTo(-width / 2 + 5, -height / 2);
      ctx.lineTo(-width / 2 + 10, -height / 2 - earSize);
      ctx.lineTo(-width / 2 + 15, -height / 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(width / 2 - 15, -height / 2);
      ctx.lineTo(width / 2 - 10, -height / 2 - earSize);
      ctx.lineTo(width / 2 - 5, -height / 2);
      ctx.fill();

      ctx.fillStyle = '#FFB6C1';
      ctx.beginPath();
      ctx.moveTo(-width / 2 + 7, -height / 2);
      ctx.lineTo(-width / 2 + 10, -height / 2 - 5);
      ctx.lineTo(-width / 2 + 13, -height / 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(width / 2 - 13, -height / 2);
      ctx.lineTo(width / 2 - 10, -height / 2 - 5);
      ctx.lineTo(width / 2 - 7, -height / 2);
      ctx.fill();

      ctx.fillStyle = color.name === 'black' ? '#888' : '#333';
      ctx.font = '14px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(face, 0, 2);

      ctx.restore();
    };

    const draw = () => {
      const game = gameRef.current;

      ctx.save();
      if (game.shake > 0.5) {
        ctx.translate(
          (Math.random() - 0.5) * game.shake * 2,
          (Math.random() - 0.5) * game.shake * 2
        );
      }

      // Background
      const bgGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
      bgGrad.addColorStop(0, '#1a1a2e');
      bgGrad.addColorStop(1, '#16213e');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Stability warning flash
      if (game.stability < 30) {
        const flash = Math.sin(game.wobbleTime * 3) * 0.5 + 0.5;
        ctx.fillStyle = `rgba(255, 0, 0, ${flash * 0.1})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      ctx.save();
      ctx.translate(0, -game.cameraY);

      // Base
      const baseX = (canvas.width - game.baseWidth) / 2;
      ctx.fillStyle = '#4a4a6a';
      ctx.beginPath();
      ctx.roundRect(baseX - 10, game.baseY, game.baseWidth + 20, 30, 8);
      ctx.fill();

      // Draw stacked cats with wobble
      const towerWobble = game.stability < 50
        ? Math.sin(game.wobbleTime * 2) * (1 - game.stability / 100) * 0.03
        : 0;

      game.stack.forEach((cat, i) => {
        const stackWobble = towerWobble * (i + 1) * 0.5;
        drawCat(cat.x, cat.y, cat.width, CAT_HEIGHT, cat.color, cat.face, cat.wobble + stackWobble);
      });

      // Current cat
      if (game.running || game.currentCat.dropping) {
        const cat = game.currentCat;
        const drawY = cat.dropping ? cat.dropY : 60 + game.cameraY;
        drawCat(cat.x, drawY, cat.width, cat.height, cat.color, cat.face);
      }

      ctx.restore();

      // Stability meter UI
      const meterWidth = 150;
      const meterHeight = 12;
      const meterX = (canvas.width - meterWidth) / 2;
      const meterY = 70;

      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.beginPath();
      ctx.roundRect(meterX - 5, meterY - 5, meterWidth + 10, meterHeight + 10, 8);
      ctx.fill();

      ctx.fillStyle = '#333';
      ctx.beginPath();
      ctx.roundRect(meterX, meterY, meterWidth, meterHeight, 4);
      ctx.fill();

      const stabilityColor = game.stability > 60 ? '#4ade80' : game.stability > 30 ? '#fbbf24' : '#ef4444';
      ctx.fillStyle = stabilityColor;
      ctx.beginPath();
      ctx.roundRect(meterX, meterY, meterWidth * (game.stability / 100), meterHeight, 4);
      ctx.fill();

      ctx.restore();
    };

    const gameLoop = () => {
      update();
      draw();
      animationId = requestAnimationFrame(gameLoop);
    };

    gameLoop();

    const handleInput = (e?: Event) => {
      e?.preventDefault();
      if (gameRef.current.running) dropCat();
    };

    canvas.addEventListener('touchstart', handleInput, { passive: false });
    canvas.addEventListener('mousedown', handleInput);
    const handleKey = (e: KeyboardEvent) => {
      if (e.code === 'Space') { e.preventDefault(); handleInput(); }
    };
    document.addEventListener('keydown', handleKey);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('touchstart', handleInput);
      canvas.removeEventListener('mousedown', handleInput);
      document.removeEventListener('keydown', handleKey);
    };
  }, []);

  return (
    <>
      <style jsx global>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { background: #1a1a2e; overflow: hidden; touch-action: none; user-select: none; display: flex; justify-content: center; }
      `}</style>

      <canvas ref={canvasRef} style={{ display: 'block', maxWidth: 420 }} />

      {gameState === 'playing' && (
        <div style={{
          position: 'fixed', top: 20, left: 0, right: 0, textAlign: 'center',
          fontFamily: 'monospace', pointerEvents: 'none',
        }}>
          <div style={{ fontSize: 42, fontWeight: 'bold', color: '#FFB347' }}>{score}</div>
          <div style={{ fontSize: 11, color: '#888', marginTop: 35 }}>STABILITY</div>
        </div>
      )}

      {gameState === 'start' && (
        <div style={{
          position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          background: 'linear-gradient(180deg, #1a1a2e 0%, #16213e 100%)',
          textAlign: 'center', fontFamily: 'monospace', color: '#fff', padding: 30,
        }}>
          <div style={{ fontSize: 72, marginBottom: 5 }}>🐱</div>
          <h1 style={{ fontSize: 36, color: '#FFB347', marginBottom: 10 }}>CAT STACK</h1>
          <div style={{ fontSize: 14, color: '#4ade80', marginBottom: 15 }}>v1: STABILITY METER</div>
          <p style={{ color: '#888', marginBottom: 25, fontSize: 14, lineHeight: 1.6 }}>
            bad landings drain stability<br />
            perfect landings restore it<br />
            tower falls at zero!
          </p>
          <button onClick={startGame} style={{
            background: 'linear-gradient(180deg, #FFB347 0%, #E8941A 100%)',
            color: '#1a1a2e', border: 'none', padding: '18px 55px', fontSize: 20,
            fontFamily: 'monospace', fontWeight: 'bold', borderRadius: 12, cursor: 'pointer',
          }}>PLAY</button>
        </div>
      )}

      {gameState === 'gameover' && (
        <div style={{
          position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', background: 'rgba(26,26,46,0.97)',
          textAlign: 'center', fontFamily: 'monospace', color: '#fff', padding: 30,
        }}>
          <div style={{ fontSize: 56, marginBottom: 10 }}>😿</div>
          <div style={{ fontSize: 18, color: '#888', marginBottom: 20 }}>tower collapsed!</div>
          <div style={{ fontSize: 72, fontWeight: 'bold', color: '#FFB347', marginBottom: 30 }}>{score}</div>
          <button onClick={startGame} style={{
            background: 'linear-gradient(180deg, #FFB347 0%, #E8941A 100%)',
            color: '#1a1a2e', border: 'none', padding: '18px 55px', fontSize: 20,
            fontFamily: 'monospace', fontWeight: 'bold', borderRadius: 12, cursor: 'pointer',
          }}>TRY AGAIN</button>
        </div>
      )}
    </>
  );
}
