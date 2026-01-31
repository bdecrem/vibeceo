'use client';

import React, { useEffect, useRef, useState } from 'react';

// VERSION 3: GENEROUS SNAP + SLOW DECAY
// Big perfect zone, width only shrinks a little per bad landing
// Perfect streaks grow width back

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
}

interface FallingPiece {
  x: number;
  y: number;
  width: number;
  color: typeof CAT_COLORS[0];
  vy: number;
  vx: number;
  rotation: number;
  rotationSpeed: number;
}

export default function CatStack3Game() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<'start' | 'playing' | 'gameover'>('start');
  const [score, setScore] = useState(0);
  const [perfectStreak, setPerfectStreak] = useState(0);
  const [showPerfect, setShowPerfect] = useState(false);

  const gameRef = useRef({
    running: false,
    score: 0,
    perfectStreak: 0,
    currentWidth: 120,
    currentCat: {
      x: 0,
      width: 120,
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
    fallingPieces: [] as FallingPiece[],
    shake: 0,
    perfectFlash: 0,
    baseY: 0,
    baseWidth: 120,
    cameraY: 0,
    targetCameraY: 0,
  });

  const CAT_HEIGHT = 40;
  const PERFECT_THRESHOLD = 20; // Very generous!
  const SHRINK_PER_MISS = 8; // Small shrink
  const GROW_PER_PERFECT = 4; // Slow grow back
  const MIN_WIDTH = 25;

  const startGame = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const game = gameRef.current;
    game.baseY = canvas.height - 120;
    game.baseWidth = 120;
    game.currentWidth = 120;
    game.cameraY = 0;
    game.targetCameraY = 0;
    game.stack = [];
    game.fallingPieces = [];
    game.score = 0;
    game.perfectStreak = 0;
    game.shake = 0;
    game.perfectFlash = 0;

    game.currentCat = {
      x: 0,
      width: game.currentWidth,
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
    setPerfectStreak(0);
    setShowPerfect(false);
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
    const newSpeed = Math.min(5, 2.5 + game.score * 0.08);
    const startFromLeft = game.score % 2 === 0;

    game.currentCat = {
      x: startFromLeft ? -game.currentWidth : canvasRef.current!.width,
      width: game.currentWidth,
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
        let targetWidth: number;

        if (game.stack.length === 0) {
          landingY = game.baseY - CAT_HEIGHT;
          targetX = (canvas.width - game.baseWidth) / 2;
          targetWidth = game.baseWidth;
        } else {
          const prev = game.stack[game.stack.length - 1];
          landingY = prev.y - CAT_HEIGHT;
          targetX = prev.x;
          targetWidth = prev.width;
        }

        if (cat.dropY >= landingY) {
          cat.dropY = landingY;

          const offset = Math.abs(cat.x - targetX);
          const maxOffset = targetWidth * 0.9;

          if (offset > maxOffset) {
            // Total miss
            game.fallingPieces.push({
              x: cat.x, y: landingY, width: cat.width,
              color: cat.color, vy: 2, vx: cat.x < targetX ? -4 : 4,
              rotation: 0, rotationSpeed: (Math.random() - 0.5) * 0.3,
            });
            gameOver();
            return;
          }

          const isPerfect = offset < PERFECT_THRESHOLD;

          if (isPerfect) {
            // Perfect landing - snap to center, maybe grow
            game.perfectStreak++;
            setPerfectStreak(game.perfectStreak);
            setShowPerfect(true);
            setTimeout(() => setShowPerfect(false), 500);
            game.perfectFlash = 1;

            // Grow width on perfect streaks
            if (game.perfectStreak >= 2 && game.currentWidth < game.baseWidth) {
              game.currentWidth = Math.min(game.baseWidth, game.currentWidth + GROW_PER_PERFECT);
            }

            game.stack.push({
              x: targetX, // Snap to perfect alignment
              y: landingY,
              width: game.currentWidth,
              color: cat.color,
              face: cat.face,
            });
          } else {
            // Imperfect landing - small shrink, show falling piece
            game.perfectStreak = 0;
            setPerfectStreak(0);

            const shrinkAmount = Math.min(SHRINK_PER_MISS, offset * 0.3);
            const newWidth = Math.max(MIN_WIDTH, game.currentWidth - shrinkAmount);

            // Create small falling piece for visual feedback
            const pieceSide = cat.x < targetX ? 'left' : 'right';
            game.fallingPieces.push({
              x: pieceSide === 'left' ? cat.x : cat.x + newWidth,
              y: landingY,
              width: Math.max(5, game.currentWidth - newWidth),
              color: cat.color,
              vy: 0,
              vx: pieceSide === 'left' ? -2 : 2,
              rotation: 0,
              rotationSpeed: pieceSide === 'left' ? -0.1 : 0.1,
            });

            game.currentWidth = newWidth;
            game.shake = 2;

            if (game.currentWidth <= MIN_WIDTH) {
              gameOver();
              return;
            }

            game.stack.push({
              x: cat.x < targetX ? targetX : targetX + (targetWidth - newWidth),
              y: landingY,
              width: newWidth,
              color: cat.color,
              face: cat.face,
            });
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

      game.fallingPieces = game.fallingPieces.filter(piece => {
        piece.vy += 0.5;
        piece.y += piece.vy;
        piece.x += piece.vx;
        piece.rotation += piece.rotationSpeed;
        return piece.y < canvas.height + 100;
      });

      game.perfectFlash *= 0.9;
      game.shake *= 0.9;
    };

    const drawCat = (
      x: number, y: number, width: number, height: number,
      color: typeof CAT_COLORS[0], face: string, rotation = 0, isFragment = false
    ) => {
      if (width < 5) return;

      ctx.save();
      ctx.translate(x + width / 2, y + height / 2);
      ctx.rotate(rotation);

      ctx.fillStyle = color.body;
      ctx.beginPath();
      ctx.roundRect(-width / 2, -height / 2, width, height, Math.min(12, width / 4));
      ctx.fill();

      if (width > 25) {
        ctx.fillStyle = color.stripe;
        const stripeCount = Math.floor(width / 30);
        for (let i = 0; i < stripeCount; i++) {
          const stripeX = -width / 2 + (i + 1) * (width / (stripeCount + 1));
          ctx.beginPath();
          ctx.ellipse(stripeX, 0, 2, height / 3, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      if (!isFragment && width > 35) {
        const earSize = Math.min(10, width / 8);
        ctx.fillStyle = color.body;
        ctx.beginPath();
        ctx.moveTo(-width / 2 + 5, -height / 2);
        ctx.lineTo(-width / 2 + 5 + earSize / 2, -height / 2 - earSize);
        ctx.lineTo(-width / 2 + 5 + earSize, -height / 2);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(width / 2 - 5 - earSize, -height / 2);
        ctx.lineTo(width / 2 - 5 - earSize / 2, -height / 2 - earSize);
        ctx.lineTo(width / 2 - 5, -height / 2);
        ctx.fill();

        ctx.fillStyle = '#FFB6C1';
        ctx.beginPath();
        ctx.moveTo(-width / 2 + 7, -height / 2);
        ctx.lineTo(-width / 2 + 5 + earSize / 2, -height / 2 - earSize * 0.5);
        ctx.lineTo(-width / 2 + 5 + earSize - 2, -height / 2);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(width / 2 - 5 - earSize + 2, -height / 2);
        ctx.lineTo(width / 2 - 5 - earSize / 2, -height / 2 - earSize * 0.5);
        ctx.lineTo(width / 2 - 7, -height / 2);
        ctx.fill();

        ctx.fillStyle = color.name === 'black' ? '#888' : '#333';
        const fontSize = Math.min(14, width / 6);
        ctx.font = `${fontSize}px monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(face, 0, 2);
      }

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

      const bgGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
      bgGrad.addColorStop(0, '#1a1a2e');
      bgGrad.addColorStop(1, '#16213e');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Perfect flash
      if (game.perfectFlash > 0.1) {
        ctx.fillStyle = `rgba(255, 215, 0, ${game.perfectFlash * 0.25})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      ctx.save();
      ctx.translate(0, -game.cameraY);

      const baseX = (canvas.width - game.baseWidth) / 2;
      ctx.fillStyle = '#4a4a6a';
      ctx.beginPath();
      ctx.roundRect(baseX - 10, game.baseY, game.baseWidth + 20, 30, 8);
      ctx.fill();
      ctx.fillStyle = '#5a5a7a';
      ctx.beginPath();
      ctx.roundRect(baseX, game.baseY - 5, game.baseWidth, 15, 5);
      ctx.fill();

      game.stack.forEach((cat) => {
        drawCat(cat.x, cat.y, cat.width, CAT_HEIGHT, cat.color, cat.face);
      });

      game.fallingPieces.forEach(piece => {
        drawCat(piece.x, piece.y, piece.width, CAT_HEIGHT, piece.color, '', piece.rotation, true);
      });

      if (game.running || game.currentCat.dropping) {
        const cat = game.currentCat;
        const drawY = cat.dropping ? cat.dropY : 60 + game.cameraY;
        drawCat(cat.x, drawY, cat.width, cat.height, cat.color, cat.face);

        // Landing guide
        if (!cat.dropping) {
          const targetY = game.stack.length > 0
            ? game.stack[game.stack.length - 1].y
            : game.baseY;

          ctx.strokeStyle = 'rgba(255,255,255,0.08)';
          ctx.setLineDash([4, 8]);
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(cat.x, drawY + cat.height);
          ctx.lineTo(cat.x, targetY);
          ctx.moveTo(cat.x + cat.width, drawY + cat.height);
          ctx.lineTo(cat.x + cat.width, targetY);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }

      ctx.restore();

      // Width indicator
      const widthPercent = (game.currentWidth / game.baseWidth) * 100;
      const indicatorWidth = 80;
      const indicatorX = canvas.width - indicatorWidth - 15;
      const indicatorY = 25;

      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.beginPath();
      ctx.roundRect(indicatorX - 5, indicatorY - 5, indicatorWidth + 10, 25, 6);
      ctx.fill();

      ctx.fillStyle = '#333';
      ctx.beginPath();
      ctx.roundRect(indicatorX, indicatorY, indicatorWidth, 8, 3);
      ctx.fill();

      const widthColor = widthPercent > 70 ? '#4ade80' : widthPercent > 40 ? '#fbbf24' : '#ef4444';
      ctx.fillStyle = widthColor;
      ctx.beginPath();
      ctx.roundRect(indicatorX, indicatorY, indicatorWidth * (widthPercent / 100), 8, 3);
      ctx.fill();

      ctx.fillStyle = '#888';
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('width', indicatorX + indicatorWidth / 2, indicatorY + 20);

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
          position: 'fixed', top: 20, left: 20,
          fontFamily: 'monospace', pointerEvents: 'none',
        }}>
          <div style={{ fontSize: 42, fontWeight: 'bold', color: '#FFB347' }}>{score}</div>
          {showPerfect && (
            <div style={{
              fontSize: 18, color: '#FFD700', marginTop: 5,
              textShadow: '0 0 10px rgba(255,215,0,0.8)',
              animation: 'popIn 0.3s ease-out',
            }}>
              {perfectStreak >= 3 ? '🔥 PERFECT!' : perfectStreak >= 2 ? '✨ PERFECT!' : 'PERFECT!'}
            </div>
          )}
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
          <div style={{ fontSize: 14, color: '#60a5fa', marginBottom: 15 }}>v3: GENEROUS + SLOW DECAY</div>
          <p style={{ color: '#888', marginBottom: 25, fontSize: 14, lineHeight: 1.6 }}>
            big "perfect" zone for snapping<br />
            misses shrink slowly<br />
            perfect streaks grow width back!
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
          <div style={{ fontSize: 18, color: '#888', marginBottom: 20 }}>tower got too thin!</div>
          <div style={{ fontSize: 72, fontWeight: 'bold', color: '#FFB347', marginBottom: 30 }}>{score}</div>
          <button onClick={startGame} style={{
            background: 'linear-gradient(180deg, #FFB347 0%, #E8941A 100%)',
            color: '#1a1a2e', border: 'none', padding: '18px 55px', fontSize: 20,
            fontFamily: 'monospace', fontWeight: 'bold', borderRadius: 12, cursor: 'pointer',
          }}>TRY AGAIN</button>
        </div>
      )}

      <style jsx>{`
        @keyframes popIn {
          0% { transform: scale(0.5); opacity: 0; }
          50% { transform: scale(1.2); }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </>
  );
}
