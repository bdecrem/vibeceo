'use client';

import React, { useEffect, useRef, useState } from 'react';

// VERSION 2: ELASTIC CATS
// Cats stretch to catch edges - they bend/squish but spring back
// Only after multiple bad landings does width actually shrink

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
  stretchX: number; // horizontal stretch factor
  squishY: number;  // vertical squish factor
}

export default function CatStack2Game() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<'start' | 'playing' | 'gameover'>('start');
  const [score, setScore] = useState(0);
  const [badLandings, setBadLandings] = useState(0);

  const gameRef = useRef({
    running: false,
    score: 0,
    badLandingsInARow: 0,
    totalBadLandings: 0,
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
    shake: 0,
    baseY: 0,
    baseWidth: 120,
    cameraY: 0,
    targetCameraY: 0,
  });

  const CAT_HEIGHT = 40;
  const PERFECT_THRESHOLD = 12;
  const BAD_LANDINGS_TO_SHRINK = 3;
  const SHRINK_AMOUNT = 15;
  const MIN_WIDTH = 30;

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
    game.score = 0;
    game.badLandingsInARow = 0;
    game.totalBadLandings = 0;
    game.shake = 0;

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
    setBadLandings(0);
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
          const maxOffset = targetWidth * 0.8;

          if (offset > maxOffset) {
            gameOver();
            return;
          }

          const isPerfect = offset < PERFECT_THRESHOLD;
          let stretchX = 1;
          let squishY = 1;

          if (isPerfect) {
            // Perfect - reset bad landing counter, maybe restore width
            game.badLandingsInARow = 0;
            if (game.currentWidth < game.baseWidth) {
              game.currentWidth = Math.min(game.baseWidth, game.currentWidth + 5);
            }
            squishY = 0.8; // Happy squish
          } else {
            // Bad landing - cat stretches to catch
            game.badLandingsInARow++;
            game.totalBadLandings++;
            setBadLandings(game.badLandingsInARow);

            // Calculate stretch based on offset
            stretchX = 1 + (offset / targetWidth) * 0.4;
            squishY = 1 / stretchX;

            game.shake = 3;

            // After N bad landings in a row, width shrinks
            if (game.badLandingsInARow >= BAD_LANDINGS_TO_SHRINK) {
              game.currentWidth = Math.max(MIN_WIDTH, game.currentWidth - SHRINK_AMOUNT);
              game.badLandingsInARow = 0;
              setBadLandings(0);
              game.shake = 8;

              if (game.currentWidth <= MIN_WIDTH) {
                gameOver();
                return;
              }
            }
          }

          // Snap to center for stacking
          const stackX = isPerfect ? targetX : cat.x;

          game.stack.push({
            x: stackX,
            y: landingY,
            width: game.currentWidth,
            color: cat.color,
            face: cat.face,
            stretchX,
            squishY,
          });

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

      // Animate stretch/squish back to normal
      game.stack.forEach(c => {
        c.stretchX += (1 - c.stretchX) * 0.15;
        c.squishY += (1 - c.squishY) * 0.15;
      });

      game.shake *= 0.9;
    };

    const drawCat = (
      x: number, y: number, width: number, height: number,
      color: typeof CAT_COLORS[0], face: string,
      stretchX = 1, squishY = 1
    ) => {
      ctx.save();
      ctx.translate(x + width / 2, y + height / 2);
      ctx.scale(stretchX, squishY);

      const drawWidth = width / stretchX;
      const drawHeight = height / squishY;

      ctx.fillStyle = color.body;
      ctx.beginPath();
      ctx.roundRect(-drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight, 12);
      ctx.fill();

      if (drawWidth > 25) {
        ctx.fillStyle = color.stripe;
        for (let i = 0; i < 3; i++) {
          ctx.beginPath();
          ctx.ellipse(-drawWidth / 4 + i * (drawWidth / 4), 0, 2, drawHeight / 3, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Ears
      const earSize = 10;
      ctx.fillStyle = color.body;
      ctx.beginPath();
      ctx.moveTo(-drawWidth / 2 + 5, -drawHeight / 2);
      ctx.lineTo(-drawWidth / 2 + 10, -drawHeight / 2 - earSize);
      ctx.lineTo(-drawWidth / 2 + 15, -drawHeight / 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(drawWidth / 2 - 15, -drawHeight / 2);
      ctx.lineTo(drawWidth / 2 - 10, -drawHeight / 2 - earSize);
      ctx.lineTo(drawWidth / 2 - 5, -drawHeight / 2);
      ctx.fill();

      ctx.fillStyle = '#FFB6C1';
      ctx.beginPath();
      ctx.moveTo(-drawWidth / 2 + 7, -drawHeight / 2);
      ctx.lineTo(-drawWidth / 2 + 10, -drawHeight / 2 - 5);
      ctx.lineTo(-drawWidth / 2 + 13, -drawHeight / 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(drawWidth / 2 - 13, -drawHeight / 2);
      ctx.lineTo(drawWidth / 2 - 10, -drawHeight / 2 - 5);
      ctx.lineTo(drawWidth / 2 - 7, -drawHeight / 2);
      ctx.fill();

      // Face changes with stretch
      const stretchFace = stretchX > 1.2 ? '=@.@=' : face;
      ctx.fillStyle = color.name === 'black' ? '#888' : '#333';
      ctx.font = '14px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(stretchFace, 0, 2);

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

      ctx.save();
      ctx.translate(0, -game.cameraY);

      const baseX = (canvas.width - game.baseWidth) / 2;
      ctx.fillStyle = '#4a4a6a';
      ctx.beginPath();
      ctx.roundRect(baseX - 10, game.baseY, game.baseWidth + 20, 30, 8);
      ctx.fill();

      game.stack.forEach((cat) => {
        drawCat(cat.x, cat.y, cat.width, CAT_HEIGHT, cat.color, cat.face, cat.stretchX, cat.squishY);
      });

      if (game.running || game.currentCat.dropping) {
        const cat = game.currentCat;
        const drawY = cat.dropping ? cat.dropY : 60 + game.cameraY;
        drawCat(cat.x, drawY, cat.width, cat.height, cat.color, cat.face);
      }

      ctx.restore();
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
          {badLandings > 0 && (
            <div style={{
              fontSize: 14, color: '#ef4444', marginTop: 5,
              animation: 'pulse 0.3s ease-in-out',
            }}>
              {'⚠️'.repeat(badLandings)} {badLandings}/{BAD_LANDINGS_TO_SHRINK}
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
          <div style={{ fontSize: 14, color: '#f472b6', marginBottom: 15 }}>v2: ELASTIC CATS</div>
          <p style={{ color: '#888', marginBottom: 25, fontSize: 14, lineHeight: 1.6 }}>
            cats stretch to catch edges!<br />
            3 bad landings = cats shrink<br />
            perfect landings restore size
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
          <div style={{ fontSize: 18, color: '#888', marginBottom: 20 }}>cats too stretchy!</div>
          <div style={{ fontSize: 72, fontWeight: 'bold', color: '#FFB347', marginBottom: 30 }}>{score}</div>
          <button onClick={startGame} style={{
            background: 'linear-gradient(180deg, #FFB347 0%, #E8941A 100%)',
            color: '#1a1a2e', border: 'none', padding: '18px 55px', fontSize: 20,
            fontFamily: 'monospace', fontWeight: 'bold', borderRadius: 12, cursor: 'pointer',
          }}>TRY AGAIN</button>
        </div>
      )}

      <style jsx>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
      `}</style>
    </>
  );
}
