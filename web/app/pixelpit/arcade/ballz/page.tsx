'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';

const THEME = {
  bg: '#0f172a',
  brick: '#3b82f6',
  brickHot: '#ef4444',
  brickWarm: '#f59e0b',
  ball: '#ffffff',
  powerup: '#22c55e',
  text: '#e2e8f0',
  textDim: '#64748b',
  aimLine: 'rgba(255,255,255,0.3)',
};

const GAME_ID = 'ballz';
const COLS = 7;
const ROWS = 8;
const BALL_RADIUS = 8;
const BALL_SPEED = 12;

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

function playHit(pitch = 1) {
  if (!audioCtx || !masterGain) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sine';
  osc.frequency.value = 400 * pitch;
  gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.05);
  osc.connect(gain);
  gain.connect(masterGain);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.05);
}

function playPowerup() {
  if (!audioCtx || !masterGain) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sine';
  osc.frequency.value = 800;
  osc.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.1);
  gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);
  osc.connect(gain);
  gain.connect(masterGain);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.15);
}

function playGameOver() {
  if (!audioCtx || !masterGain) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(200, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(50, audioCtx.currentTime + 0.5);
  gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);
  osc.connect(gain);
  gain.connect(masterGain);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.5);
}

interface Brick {
  col: number;
  row: number;
  hits: number;
}

interface Powerup {
  col: number;
  row: number;
}

interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  active: boolean;
  landed: boolean;
  landX?: number;
}

export default function BallzGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<'start' | 'aiming' | 'firing' | 'gameover'>('start');
  const [score, setScore] = useState(0);
  const [canvasSize, setCanvasSize] = useState({ w: 400, h: 700 });

  const gameRef = useRef({
    bricks: [] as Brick[],
    powerups: [] as Powerup[],
    balls: [] as Ball[],
    ballCount: 1,
    launchX: 200,
    aimAngle: -Math.PI / 2,
    aiming: false,
    turn: 1,
    cellW: 50,
    cellH: 50,
    gridTop: 100,
    newBallCount: 0,
  });

  const startGame = useCallback(() => {
    initAudio();
    const game = gameRef.current;
    game.bricks = [];
    game.powerups = [];
    game.balls = [];
    game.ballCount = 1;
    game.launchX = canvasSize.w / 2;
    game.turn = 1;
    game.cellW = canvasSize.w / COLS;
    game.cellH = (canvasSize.h - 150) / ROWS;
    game.gridTop = 80;
    game.newBallCount = 0;
    
    // Spawn initial row
    spawnRow(game, 1);
    
    setScore(0);
    setGameState('aiming');
  }, [canvasSize]);

  const spawnRow = (game: typeof gameRef.current, turnNum: number) => {
    // Move existing bricks down
    for (const brick of game.bricks) {
      brick.row++;
    }
    for (const powerup of game.powerups) {
      powerup.row++;
    }
    
    // Spawn new bricks in row 0
    const numBricks = Math.min(COLS - 1, Math.floor(Math.random() * 3) + 2 + Math.floor(turnNum / 5));
    const positions = Array.from({ length: COLS }, (_, i) => i);
    
    // Shuffle positions
    for (let i = positions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [positions[i], positions[j]] = [positions[j], positions[i]];
    }
    
    // Add bricks
    for (let i = 0; i < numBricks; i++) {
      game.bricks.push({
        col: positions[i],
        row: 0,
        hits: turnNum + Math.floor(Math.random() * Math.ceil(turnNum / 2)),
      });
    }
    
    // Add powerup (not on a brick)
    if (Math.random() < 0.7) {
      const freeCols = positions.slice(numBricks);
      if (freeCols.length > 0) {
        game.powerups.push({
          col: freeCols[Math.floor(Math.random() * freeCols.length)],
          row: 0,
        });
      }
    }
  };

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
    let lastLaunchTime = 0;
    let ballsToLaunch = 0;
    let launchInterval = 80; // ms between ball launches

    const update = (timestamp: number) => {
      const game = gameRef.current;
      
      if (gameState === 'firing') {
        // Launch balls with delay
        if (ballsToLaunch > 0 && timestamp - lastLaunchTime > launchInterval) {
          const angle = game.aimAngle;
          game.balls.push({
            x: game.launchX,
            y: canvasSize.h - 30,
            vx: Math.cos(angle) * BALL_SPEED,
            vy: Math.sin(angle) * BALL_SPEED,
            active: true,
            landed: false,
          });
          ballsToLaunch--;
          lastLaunchTime = timestamp;
        }
        
        // Update balls
        for (const ball of game.balls) {
          if (!ball.active || ball.landed) continue;
          
          ball.x += ball.vx;
          ball.y += ball.vy;
          
          // Wall bounce
          if (ball.x < BALL_RADIUS) {
            ball.x = BALL_RADIUS;
            ball.vx = -ball.vx;
          }
          if (ball.x > canvasSize.w - BALL_RADIUS) {
            ball.x = canvasSize.w - BALL_RADIUS;
            ball.vx = -ball.vx;
          }
          if (ball.y < game.gridTop) {
            ball.y = game.gridTop;
            ball.vy = -ball.vy;
          }
          
          // Floor - ball lands
          if (ball.y > canvasSize.h - 30) {
            ball.y = canvasSize.h - 30;
            ball.landed = true;
            ball.landX = ball.x;
            ball.active = false;
          }
          
          // Brick collision
          for (let i = game.bricks.length - 1; i >= 0; i--) {
            const brick = game.bricks[i];
            const bx = brick.col * game.cellW;
            const by = game.gridTop + brick.row * game.cellH;
            const bw = game.cellW - 4;
            const bh = game.cellH - 4;
            
            // Simple AABB collision with ball center
            if (ball.x > bx && ball.x < bx + bw &&
                ball.y > by && ball.y < by + bh) {
              
              // Determine which side was hit
              const overlapLeft = ball.x - bx;
              const overlapRight = (bx + bw) - ball.x;
              const overlapTop = ball.y - by;
              const overlapBottom = (by + bh) - ball.y;
              
              const minOverlap = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);
              
              if (minOverlap === overlapLeft || minOverlap === overlapRight) {
                ball.vx = -ball.vx;
                ball.x += ball.vx > 0 ? 2 : -2;
              } else {
                ball.vy = -ball.vy;
                ball.y += ball.vy > 0 ? 2 : -2;
              }
              
              brick.hits--;
              playHit(1 + Math.random() * 0.3);
              
              if (brick.hits <= 0) {
                game.bricks.splice(i, 1);
                setScore(s => s + 1);
              }
              break;
            }
          }
          
          // Powerup collection
          for (let i = game.powerups.length - 1; i >= 0; i--) {
            const powerup = game.powerups[i];
            const px = powerup.col * game.cellW + game.cellW / 2;
            const py = game.gridTop + powerup.row * game.cellH + game.cellH / 2;
            
            const dist = Math.sqrt((ball.x - px) ** 2 + (ball.y - py) ** 2);
            if (dist < BALL_RADIUS + 15) {
              game.powerups.splice(i, 1);
              game.newBallCount++;
              playPowerup();
            }
          }
        }
        
        // Check if all balls landed
        const allLanded = game.balls.length > 0 && 
                          ballsToLaunch === 0 &&
                          game.balls.every(b => b.landed);
        
        if (allLanded) {
          // Set new launch position to first ball's land position
          const firstLanded = game.balls.find(b => b.landX !== undefined);
          if (firstLanded && firstLanded.landX !== undefined) {
            game.launchX = firstLanded.landX;
          }
          
          // Add collected powerups to ball count
          game.ballCount += game.newBallCount;
          game.newBallCount = 0;
          
          // Clear balls
          game.balls = [];
          
          // Spawn new row
          game.turn++;
          spawnRow(game, game.turn);
          
          // Check game over - any brick in bottom row
          const gameOver = game.bricks.some(b => b.row >= ROWS - 1);
          if (gameOver) {
            playGameOver();
            setGameState('gameover');
            fetch('/api/pixelpit/stats', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ game: GAME_ID }),
            }).catch(() => {});
          } else {
            setGameState('aiming');
          }
        }
      }
    };

    const draw = () => {
      const game = gameRef.current;
      
      ctx.fillStyle = THEME.bg;
      ctx.fillRect(0, 0, canvasSize.w, canvasSize.h);
      
      // Score
      ctx.fillStyle = THEME.text;
      ctx.font = 'bold 24px ui-monospace, monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`${score}`, canvasSize.w / 2, 50);
      
      // Ball count
      ctx.fillStyle = THEME.textDim;
      ctx.font = '14px ui-monospace, monospace';
      ctx.fillText(`×${game.ballCount}`, canvasSize.w / 2, canvasSize.h - 8);
      
      // Bricks
      for (const brick of game.bricks) {
        const bx = brick.col * game.cellW + 2;
        const by = game.gridTop + brick.row * game.cellH + 2;
        const bw = game.cellW - 4;
        const bh = game.cellH - 4;
        
        // Color based on hits
        let color = THEME.brick;
        if (brick.hits > game.turn * 2) color = THEME.brickHot;
        else if (brick.hits > game.turn) color = THEME.brickWarm;
        
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.roundRect(bx, by, bw, bh, 6);
        ctx.fill();
        
        // Hit count
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 16px ui-monospace, monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${brick.hits}`, bx + bw / 2, by + bh / 2);
      }
      
      // Powerups
      for (const powerup of game.powerups) {
        const px = powerup.col * game.cellW + game.cellW / 2;
        const py = game.gridTop + powerup.row * game.cellH + game.cellH / 2;
        
        ctx.fillStyle = THEME.powerup;
        ctx.beginPath();
        ctx.arc(px, py, 12, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 14px ui-monospace, monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('+1', px, py);
      }
      
      // Aim line
      if (gameState === 'aiming' && game.aiming) {
        ctx.strokeStyle = THEME.aimLine;
        ctx.lineWidth = 2;
        ctx.setLineDash([10, 10]);
        ctx.beginPath();
        ctx.moveTo(game.launchX, canvasSize.h - 30);
        const lineLen = 150;
        ctx.lineTo(
          game.launchX + Math.cos(game.aimAngle) * lineLen,
          canvasSize.h - 30 + Math.sin(game.aimAngle) * lineLen
        );
        ctx.stroke();
        ctx.setLineDash([]);
      }
      
      // Balls
      ctx.fillStyle = THEME.ball;
      for (const ball of game.balls) {
        if (ball.active) {
          ctx.beginPath();
          ctx.arc(ball.x, ball.y, BALL_RADIUS, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      
      // Launch position indicator
      if (gameState === 'aiming') {
        ctx.fillStyle = THEME.ball;
        ctx.beginPath();
        ctx.arc(game.launchX, canvasSize.h - 30, BALL_RADIUS, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const gameLoop = (timestamp: number) => {
      update(timestamp);
      draw();
      animationId = requestAnimationFrame(gameLoop);
    };
    animationId = requestAnimationFrame(gameLoop);

    // Input
    const getAngle = (x: number, y: number) => {
      const game = gameRef.current;
      const dx = x - game.launchX;
      const dy = y - (canvasSize.h - 30);
      let angle = Math.atan2(dy, dx);
      // Clamp to upward angles only
      if (angle > -0.1) angle = -0.1;
      if (angle < -Math.PI + 0.1) angle = -Math.PI + 0.1;
      return angle;
    };

    const handleStart = (x: number, y: number) => {
      if (gameState !== 'aiming') return;
      const game = gameRef.current;
      game.aiming = true;
      game.aimAngle = getAngle(x, y);
    };

    const handleMove = (x: number, y: number) => {
      if (gameState !== 'aiming') return;
      const game = gameRef.current;
      if (game.aiming) {
        game.aimAngle = getAngle(x, y);
      }
    };

    const handleEnd = () => {
      if (gameState !== 'aiming') return;
      const game = gameRef.current;
      if (game.aiming) {
        game.aiming = false;
        ballsToLaunch = game.ballCount;
        lastLaunchTime = 0;
        setGameState('firing');
      }
    };

    const mouseDown = (e: MouseEvent) => handleStart(e.clientX, e.clientY);
    const mouseMove = (e: MouseEvent) => handleMove(e.clientX, e.clientY);
    const mouseUp = () => handleEnd();
    const touchStart = (e: TouchEvent) => {
      e.preventDefault();
      handleStart(e.touches[0].clientX, e.touches[0].clientY);
    };
    const touchMove = (e: TouchEvent) => {
      e.preventDefault();
      handleMove(e.touches[0].clientX, e.touches[0].clientY);
    };
    const touchEnd = (e: TouchEvent) => {
      e.preventDefault();
      handleEnd();
    };

    canvas.addEventListener('mousedown', mouseDown);
    canvas.addEventListener('mousemove', mouseMove);
    canvas.addEventListener('mouseup', mouseUp);
    canvas.addEventListener('touchstart', touchStart, { passive: false });
    canvas.addEventListener('touchmove', touchMove, { passive: false });
    canvas.addEventListener('touchend', touchEnd, { passive: false });

    return () => {
      cancelAnimationFrame(animationId);
      canvas.removeEventListener('mousedown', mouseDown);
      canvas.removeEventListener('mousemove', mouseMove);
      canvas.removeEventListener('mouseup', mouseUp);
      canvas.removeEventListener('touchstart', touchStart);
      canvas.removeEventListener('touchmove', touchMove);
      canvas.removeEventListener('touchend', touchEnd);
    };
  }, [gameState, canvasSize, score]);

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
            fontSize: 64,
            marginBottom: 10,
            fontWeight: 900,
          }}>
            BALLZ
          </h1>
          
          <p style={{ color: THEME.textDim, fontSize: 16, marginBottom: 30, textAlign: 'center', lineHeight: 1.6 }}>
            Aim and fire balls at numbered bricks.<br />
            Collect <span style={{ color: THEME.powerup }}>+1</span> to grow your arsenal.<br />
            Don't let bricks reach the bottom.
          </p>
          
          <button
            onClick={startGame}
            style={{
              background: THEME.brick,
              color: '#fff',
              border: 'none',
              padding: '18px 60px',
              fontSize: 18,
              fontWeight: 700,
              cursor: 'pointer',
              borderRadius: 12,
            }}
          >
            PLAY
          </button>
        </div>
      )}

      {(gameState === 'aiming' || gameState === 'firing') && (
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
        }}>
          <h1 style={{ color: THEME.brickHot, fontSize: 48, marginBottom: 10 }}>
            GAME OVER
          </h1>
          <p style={{ color: THEME.text, fontSize: 24, marginBottom: 30 }}>
            Score: {score}
          </p>
          <button
            onClick={startGame}
            style={{
              background: THEME.brick,
              color: '#fff',
              border: 'none',
              padding: '16px 50px',
              fontSize: 18,
              fontWeight: 600,
              cursor: 'pointer',
              borderRadius: 12,
            }}
          >
            PLAY AGAIN
          </button>
        </div>
      )}
    </div>
  );
}
