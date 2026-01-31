'use client';

import React, { useEffect, useRef, useState } from 'react';

// Cat colors for variety
const CAT_COLORS = [
  { body: '#FFB347', stripe: '#E8941A', name: 'orange' },  // Orange tabby
  { body: '#A0A0A0', stripe: '#707070', name: 'gray' },    // Gray
  { body: '#FFE4C4', stripe: '#DDB892', name: 'cream' },   // Cream
  { body: '#2D2D2D', stripe: '#1A1A1A', name: 'black' },   // Black
  { body: '#FFFFFF', stripe: '#E0E0E0', name: 'white' },   // White
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

export default function CatStackGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<'start' | 'playing' | 'gameover'>('start');
  const [score, setScore] = useState(0);
  const [perfectStreak, setPerfectStreak] = useState(0);

  const gameRef = useRef({
    running: false,
    score: 0,
    perfectStreak: 0,
    // The cat currently moving
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
    // Stack of cats
    stack: [] as StackedCat[],
    // Falling trimmed pieces
    fallingPieces: [] as FallingPiece[],
    // Perfect landing flash
    perfectFlash: 0,
    // Screen shake
    shake: 0,
    // Base platform
    baseY: 0,
    baseWidth: 120,
    // Camera
    cameraY: 0,
    targetCameraY: 0,
  });

  const CAT_HEIGHT = 40;
  const PERFECT_THRESHOLD = 5; // pixels of tolerance for "perfect"
  const MIN_WIDTH = 15; // Game over if cat gets this thin

  const startGame = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const game = gameRef.current;
    game.baseY = canvas.height - 120;
    game.baseWidth = 120;
    game.cameraY = 0;
    game.targetCameraY = 0;
    game.stack = [];
    game.fallingPieces = [];
    game.score = 0;
    game.perfectStreak = 0;
    game.perfectFlash = 0;
    game.shake = 0;

    // First cat matches base width
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
    setPerfectStreak(0);
    setGameState('playing');
  };

  const dropCat = () => {
    const game = gameRef.current;
    if (!game.running || game.currentCat.dropping) return;
    game.currentCat.dropping = true;
    game.currentCat.dropSpeed = 0;
  };

  const spawnNextCat = (newWidth: number, alignedX: number) => {
    const game = gameRef.current;

    // Speed up slightly each level
    const newSpeed = Math.min(6, 2.5 + game.score * 0.15);

    // Alternate starting side
    const startFromLeft = game.score % 2 === 0;

    game.currentCat = {
      x: startFromLeft ? -newWidth : canvasRef.current!.width,
      width: newWidth,
      height: CAT_HEIGHT,
      direction: startFromLeft ? 1 : -1,
      speed: newSpeed,
      dropping: false,
      dropY: 60 + game.cameraY, // Spawn at top of visible area
      dropSpeed: 0,
      color: CAT_COLORS[Math.floor(Math.random() * CAT_COLORS.length)],
      face: CAT_FACES[Math.floor(Math.random() * CAT_FACES.length)],
    };
  };

  const gameOver = () => {
    const game = gameRef.current;
    game.running = false;
    game.shake = 15;
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
        // Move cat side to side
        cat.x += cat.speed * cat.direction;

        // Bounce off edges
        if (cat.x <= -cat.width * 0.3) {
          cat.direction = 1;
        } else if (cat.x >= canvas.width - cat.width * 0.7) {
          cat.direction = -1;
        }
      } else {
        // Dropping
        cat.dropSpeed += 1.2; // gravity
        cat.dropY += cat.dropSpeed;

        // Calculate where this cat should land
        let landingY: number;
        let targetX: number;
        let targetWidth: number;

        if (game.stack.length === 0) {
          // First cat lands on base platform
          landingY = game.baseY - CAT_HEIGHT;
          targetX = (canvas.width - game.baseWidth) / 2;
          targetWidth = game.baseWidth;
        } else {
          // Land on previous cat
          const prev = game.stack[game.stack.length - 1];
          landingY = prev.y - CAT_HEIGHT;
          targetX = prev.x;
          targetWidth = prev.width;
        }

        // Check if landed
        if (cat.dropY >= landingY) {
          cat.dropY = landingY;

          // Calculate overlap
          const catLeft = cat.x;
          const catRight = cat.x + cat.width;
          const targetLeft = targetX;
          const targetRight = targetX + targetWidth;

          const overlapLeft = Math.max(catLeft, targetLeft);
          const overlapRight = Math.min(catRight, targetRight);
          const overlapWidth = overlapRight - overlapLeft;

          if (overlapWidth < MIN_WIDTH) {
            // Missed! Cat falls off
            game.fallingPieces.push({
              x: cat.x,
              y: cat.dropY,
              width: cat.width,
              color: cat.color,
              vy: 2,
              vx: cat.x < targetX ? -3 : 3,
              rotation: 0,
              rotationSpeed: (Math.random() - 0.5) * 0.3,
            });
            gameOver();
            return;
          }

          // Check if perfect landing
          const isPerfect = Math.abs(cat.x - targetX) < PERFECT_THRESHOLD;

          if (isPerfect) {
            // Perfect! Keep full width, align exactly
            game.stack.push({
              x: targetX,
              y: landingY,
              width: targetWidth,
              color: cat.color,
              face: cat.face,
            });
            game.perfectStreak++;
            game.perfectFlash = 1;
            setPerfectStreak(game.perfectStreak);
          } else {
            // Trimmed landing
            game.perfectStreak = 0;
            setPerfectStreak(0);

            // Add the trimmed cat to stack
            game.stack.push({
              x: overlapLeft,
              y: landingY,
              width: overlapWidth,
              color: cat.color,
              face: cat.face,
            });

            // Create falling piece(s) for the overhang
            // Left overhang
            if (catLeft < targetLeft) {
              game.fallingPieces.push({
                x: catLeft,
                y: landingY,
                width: targetLeft - catLeft,
                color: cat.color,
                vy: 0,
                vx: -2 - Math.random() * 2,
                rotation: 0,
                rotationSpeed: -0.1 - Math.random() * 0.1,
              });
            }
            // Right overhang
            if (catRight > targetRight) {
              game.fallingPieces.push({
                x: targetRight,
                y: landingY,
                width: catRight - targetRight,
                color: cat.color,
                vy: 0,
                vx: 2 + Math.random() * 2,
                rotation: 0,
                rotationSpeed: 0.1 + Math.random() * 0.1,
              });
            }

            game.shake = 3;
          }

          game.score++;
          setScore(game.score);

          // Scroll camera up
          const stackTop = landingY;
          const visibleTop = game.cameraY + 150;
          if (stackTop < visibleTop) {
            game.targetCameraY = stackTop - 150;
          }

          // Spawn next cat with the new width
          const newWidth = isPerfect ? targetWidth : overlapWidth;
          spawnNextCat(newWidth, overlapLeft);
        }
      }

      // Smooth camera follow
      game.cameraY += (game.targetCameraY - game.cameraY) * 0.1;

      // Update falling pieces
      game.fallingPieces = game.fallingPieces.filter(piece => {
        piece.vy += 0.5;
        piece.y += piece.vy;
        piece.x += piece.vx;
        piece.rotation += piece.rotationSpeed;
        return piece.y < canvas.height + 100;
      });

      // Decay effects
      game.perfectFlash *= 0.9;
      game.shake *= 0.85;
    };

    const drawCat = (
      x: number,
      y: number,
      width: number,
      height: number,
      color: typeof CAT_COLORS[0],
      face: string,
      rotation = 0,
      isFragment = false
    ) => {
      if (width < 3) return;

      ctx.save();
      ctx.translate(x + width / 2, y + height / 2);
      ctx.rotate(rotation);

      // Cat body
      ctx.fillStyle = color.body;
      ctx.beginPath();
      ctx.roundRect(-width / 2, -height / 2, width, height, Math.min(12, width / 4));
      ctx.fill();

      // Stripes (only if wide enough)
      if (width > 25) {
        ctx.fillStyle = color.stripe;
        const stripeCount = Math.floor(width / 25);
        for (let i = 0; i < stripeCount; i++) {
          const stripeX = -width / 2 + (i + 1) * (width / (stripeCount + 1));
          ctx.beginPath();
          ctx.ellipse(stripeX, 0, 2, height / 3, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Only draw face and ears if not a fragment and wide enough
      if (!isFragment && width > 30) {
        // Ears
        const earSize = Math.min(12, width / 6);
        ctx.fillStyle = color.body;
        // Left ear
        ctx.beginPath();
        ctx.moveTo(-width / 2 + 5, -height / 2);
        ctx.lineTo(-width / 2 + 5 + earSize / 2, -height / 2 - earSize);
        ctx.lineTo(-width / 2 + 5 + earSize, -height / 2);
        ctx.fill();
        // Right ear
        ctx.beginPath();
        ctx.moveTo(width / 2 - 5 - earSize, -height / 2);
        ctx.lineTo(width / 2 - 5 - earSize / 2, -height / 2 - earSize);
        ctx.lineTo(width / 2 - 5, -height / 2);
        ctx.fill();

        // Inner ears
        ctx.fillStyle = '#FFB6C1';
        const innerEar = earSize * 0.5;
        ctx.beginPath();
        ctx.moveTo(-width / 2 + 8, -height / 2);
        ctx.lineTo(-width / 2 + 5 + earSize / 2, -height / 2 - innerEar);
        ctx.lineTo(-width / 2 + 5 + earSize - 3, -height / 2);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(width / 2 - 5 - earSize + 3, -height / 2);
        ctx.lineTo(width / 2 - 5 - earSize / 2, -height / 2 - innerEar);
        ctx.lineTo(width / 2 - 8, -height / 2);
        ctx.fill();

        // Face
        ctx.fillStyle = color.name === 'black' ? '#888' : '#333';
        const fontSize = Math.min(14, width / 5);
        ctx.font = `${fontSize}px monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(face, 0, 2);
      }

      ctx.restore();
    };

    const draw = () => {
      const game = gameRef.current;

      // Apply screen shake
      ctx.save();
      if (game.shake > 0.5) {
        ctx.translate(
          (Math.random() - 0.5) * game.shake * 2,
          (Math.random() - 0.5) * game.shake * 2
        );
      }

      // Background gradient
      const bgGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
      bgGrad.addColorStop(0, '#1a1a2e');
      bgGrad.addColorStop(1, '#16213e');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Stars
      ctx.fillStyle = '#ffffff15';
      for (let i = 0; i < 40; i++) {
        const sx = (i * 73 + 10) % canvas.width;
        const sy = ((i * 137 + game.cameraY * 0.05) % (canvas.height + 200)) - 100;
        ctx.beginPath();
        ctx.arc(sx, sy, Math.random() > 0.8 ? 1.5 : 1, 0, Math.PI * 2);
        ctx.fill();
      }

      // Perfect flash
      if (game.perfectFlash > 0.1) {
        ctx.fillStyle = `rgba(255, 215, 0, ${game.perfectFlash * 0.3})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      ctx.save();
      ctx.translate(0, -game.cameraY);

      // Base platform
      const baseX = (canvas.width - game.baseWidth) / 2;
      ctx.fillStyle = '#4a4a6a';
      ctx.beginPath();
      ctx.roundRect(baseX - 10, game.baseY, game.baseWidth + 20, 30, 8);
      ctx.fill();
      ctx.fillStyle = '#5a5a7a';
      ctx.beginPath();
      ctx.roundRect(baseX, game.baseY - 5, game.baseWidth, 15, 5);
      ctx.fill();

      // Draw stacked cats (from bottom to top)
      game.stack.forEach((cat) => {
        drawCat(cat.x, cat.y, cat.width, CAT_HEIGHT, cat.color, cat.face);
      });

      // Draw falling pieces
      game.fallingPieces.forEach(piece => {
        drawCat(
          piece.x,
          piece.y,
          piece.width,
          CAT_HEIGHT,
          piece.color,
          '',
          piece.rotation,
          true
        );
      });

      // Draw current cat
      if (game.running || game.currentCat.dropping) {
        const cat = game.currentCat;
        const drawY = cat.dropping ? cat.dropY : 60 + game.cameraY;
        drawCat(cat.x, drawY, cat.width, cat.height, cat.color, cat.face);

        // Landing guide (subtle)
        if (!cat.dropping) {
          const targetY = game.stack.length > 0
            ? game.stack[game.stack.length - 1].y
            : game.baseY;

          ctx.strokeStyle = 'rgba(255,255,255,0.1)';
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
      ctx.restore();
    };

    const gameLoop = () => {
      update();
      draw();
      animationId = requestAnimationFrame(gameLoop);
    };

    gameLoop();

    // Input
    const handleInput = (e?: Event) => {
      e?.preventDefault();
      if (gameRef.current.running) {
        dropCat();
      }
    };

    canvas.addEventListener('touchstart', handleInput, { passive: false });
    canvas.addEventListener('mousedown', handleInput);
    const handleKey = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        handleInput();
      }
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
        body {
          background: #1a1a2e;
          overflow: hidden;
          touch-action: none;
          user-select: none;
          display: flex;
          justify-content: center;
        }
      `}</style>

      <canvas
        ref={canvasRef}
        style={{
          display: 'block',
          maxWidth: 420,
        }}
      />

      {/* Score HUD */}
      {gameState === 'playing' && (
        <div style={{
          position: 'fixed',
          top: 20,
          left: 0,
          right: 0,
          textAlign: 'center',
          fontFamily: 'monospace',
          pointerEvents: 'none',
        }}>
          <div style={{
            fontSize: 42,
            fontWeight: 'bold',
            color: '#FFB347',
            textShadow: '0 0 20px rgba(255,179,71,0.5)',
          }}>
            {score}
          </div>
          {perfectStreak >= 2 && (
            <div style={{
              fontSize: 16,
              color: '#FFD700',
              textShadow: '0 0 10px rgba(255,215,0,0.8)',
              animation: 'pulse 0.5s ease-in-out infinite',
            }}>
              PERFECT x{perfectStreak}! 🔥
            </div>
          )}
        </div>
      )}

      {/* Start Screen */}
      {gameState === 'start' && (
        <div style={{
          position: 'fixed',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(180deg, #1a1a2e 0%, #16213e 100%)',
          textAlign: 'center',
          fontFamily: 'monospace',
          color: '#fff',
          padding: 30,
        }}>
          <div style={{ fontSize: 72, marginBottom: 5 }}>🐱</div>
          <h1 style={{
            fontSize: 42,
            color: '#FFB347',
            marginBottom: 15,
            textShadow: '0 0 30px rgba(255,179,71,0.4)',
          }}>
            CAT STACK
          </h1>
          <p style={{
            color: '#8888aa',
            marginBottom: 10,
            fontSize: 15,
            lineHeight: 1.6,
          }}>
            tap to drop the cat<br />
            align perfectly to keep width<br />
            miss and you lose pieces!
          </p>
          <p style={{
            color: '#666',
            marginBottom: 30,
            fontSize: 12,
          }}>
            how high can you go?
          </p>
          <button
            onClick={startGame}
            style={{
              background: 'linear-gradient(180deg, #FFB347 0%, #E8941A 100%)',
              color: '#1a1a2e',
              border: 'none',
              padding: '18px 55px',
              fontSize: 20,
              fontFamily: 'monospace',
              fontWeight: 'bold',
              borderRadius: 12,
              cursor: 'pointer',
              boxShadow: '0 8px 25px rgba(255,179,71,0.4)',
            }}
          >
            PLAY
          </button>
          <div style={{
            marginTop: 40,
            fontSize: 11,
            letterSpacing: 2,
            color: '#666',
          }}>
            <span style={{ color: '#FFB347' }}>pixel</span>
            <span style={{ color: '#6B8DD6' }}>pit</span>
          </div>
        </div>
      )}

      {/* Game Over */}
      {gameState === 'gameover' && (
        <div style={{
          position: 'fixed',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(26,26,46,0.97)',
          textAlign: 'center',
          fontFamily: 'monospace',
          color: '#fff',
          padding: 30,
        }}>
          <div style={{ fontSize: 56, marginBottom: 10 }}>😿</div>
          <div style={{ fontSize: 18, color: '#8888aa', marginBottom: 20 }}>
            the tower fell!
          </div>
          <div style={{
            fontSize: 72,
            fontWeight: 'bold',
            color: '#FFB347',
            marginBottom: 10,
            textShadow: '0 0 30px rgba(255,179,71,0.4)',
          }}>
            {score}
          </div>
          <div style={{ fontSize: 14, color: '#666', marginBottom: 35 }}>
            cats stacked
          </div>
          <button
            onClick={startGame}
            style={{
              background: 'linear-gradient(180deg, #FFB347 0%, #E8941A 100%)',
              color: '#1a1a2e',
              border: 'none',
              padding: '18px 55px',
              fontSize: 20,
              fontFamily: 'monospace',
              fontWeight: 'bold',
              borderRadius: 12,
              cursor: 'pointer',
              boxShadow: '0 8px 25px rgba(255,179,71,0.4)',
              marginBottom: 15,
            }}
          >
            TRY AGAIN
          </button>
        </div>
      )}

      <style jsx>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
      `}</style>
    </>
  );
}
