'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';

// Stack Ball style - hold to smash, release to survive
const THEME = {
  ball: '#f97316', // orange ball
  ballGlow: '#fbbf24',
  breakable: '#4ade80', // bright green - smashable
  breakableAlt: '#60a5fa', // bright blue - smashable  
  solid: '#000000', // pure black - DANGER
  solidGlow: '#ef4444', // red glow on black = danger
  bg: '#1e293b',
  text: '#fafafa',
  danger: '#ef4444',
};

const GAME_ID = 'melt3';
const NUM_PLATFORMS = 40;
const MAX_HEALTH = 3; // 3 hits and you're dead

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

interface Platform {
  y: number;
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
    holding: false, // HOLD = smash mode
    ballX: 0,
    ballY: 80,
    ballVY: 0,
    ballAngle: Math.PI / 2, // angle on current platform (if landed)
    landedPlatform: null as Platform | null,
    cameraY: 0,
    platforms: [] as Platform[],
    particles: [] as Particle[],
    score: 0,
    lives: MAX_HEALTH,
    combo: 0,
  });

  const generatePlatforms = useCallback((canvasW: number) => {
    const platforms: Platform[] = [];
    let currentY = 250;
    
    for (let i = 0; i < NUM_PLATFORMS; i++) {
      const progress = i / NUM_PLATFORMS;
      
      // Spacing gets tighter
      const gap = 100 - progress * 30;
      currentY += gap;
      
      // Generate segments
      const numSegments = 8;
      const segments: Platform['segments'] = [];
      const segmentSize = (Math.PI * 2) / numSegments;
      
      for (let s = 0; s < numSegments; s++) {
        const startAngle = s * segmentSize;
        const endAngle = startAngle + segmentSize * 0.95;
        
        // More solid (black) platforms as difficulty increases
        // First few platforms: all breakable (tutorial)
        // Then gradually introduce solid
        let type: 'breakable' | 'solid' | 'gap';
        const roll = Math.random();
        
        if (i < 3) {
          // Tutorial: all breakable
          type = 'breakable';
        } else if (progress < 0.3) {
          // Early: mostly breakable, rare solid, some gaps
          type = roll < 0.15 ? 'gap' : (roll < 0.85 ? 'breakable' : 'solid');
        } else if (progress < 0.6) {
          // Mid: more solid
          type = roll < 0.1 ? 'gap' : (roll < 0.6 ? 'breakable' : 'solid');
        } else {
          // Late: lots of solid
          type = roll < 0.08 ? 'gap' : (roll < 0.45 ? 'breakable' : 'solid');
        }
        
        const color = type === 'breakable' 
          ? (Math.random() < 0.5 ? THEME.breakable : THEME.breakableAlt)
          : THEME.solid;
        
        segments.push({ startAngle, endAngle, type, broken: false, color });
      }
      
      // Ensure at least one breakable or gap per platform
      const hasEscape = segments.some(s => s.type === 'breakable' || s.type === 'gap');
      if (!hasEscape) {
        const idx = Math.floor(Math.random() * segments.length);
        segments[idx].type = 'breakable';
        segments[idx].color = THEME.breakable;
      }
      
      platforms.push({
        y: currentY,
        segments,
        rotation: Math.random() * Math.PI * 2,
        speed: (0.3 + progress * 0.3) * (Math.random() < 0.5 ? 1 : -1),
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
    game.ballVY = 0;
    game.ballAngle = Math.PI / 2;
    game.landedPlatform = null;
    game.cameraY = 0;
    game.platforms = generatePlatforms(canvasSize.w);
    game.particles = [];
    game.score = 0;
    game.lives = MAX_HEALTH;
    game.combo = 0;
    setScore(0);
    setLives(MAX_HEALTH);
    setGameState('playing');
  }, [generatePlatforms, canvasSize.w]);

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
    const BALL_X = canvasSize.w / 2;
    const BALL_RADIUS = 20;
    const PLATFORM_RADIUS = Math.min(140, canvasSize.w * 0.38);
    const PLATFORM_INNER = 25;

    const update = () => {
      const game = gameRef.current;
      if (!game.running) return;

      // Rotate platforms first
      for (const platform of game.platforms) {
        platform.rotation += platform.speed * 0.015;
      }

      // If landed on a platform, rotate with it
      if (game.landedPlatform && !game.holding) {
        game.ballAngle += game.landedPlatform.speed * 0.015;
        // Update ball X position based on angle
        const platformMidRadius = (PLATFORM_RADIUS + PLATFORM_INNER) / 2;
        game.ballX = canvasSize.w / 2 + Math.cos(game.ballAngle) * platformMidRadius;
        game.ballY = game.landedPlatform.y - 18/2 - BALL_RADIUS + Math.sin(game.ballAngle) * 5;
      } else {
        // Not landed - falling
        game.landedPlatform = null;
        game.ballX = canvasSize.w / 2; // Center when falling
        
        // Physics - holding = fast drop (smash mode)
        const gravity = game.holding ? 1.5 : 0.4;
        game.ballVY += gravity;
        game.ballVY = Math.min(game.ballVY, game.holding ? 25 : 8);
        game.ballY += game.ballVY;
      }

      // Camera
      const targetCameraY = game.ballY - canvasSize.h / 3;
      game.cameraY += (targetCameraY - game.cameraY) * 0.12;

      // Collision
      const PLATFORM_THICKNESS = 18;
      for (const platform of game.platforms) {
        const ballBottom = game.ballY + BALL_RADIUS;
        const ballTop = game.ballY - BALL_RADIUS;
        
        if (ballBottom > platform.y - PLATFORM_THICKNESS/2 && 
            ballTop < platform.y + PLATFORM_THICKNESS/2) {
          
          // Find which segment based on ball's current angle
          const checkAngle = game.landedPlatform ? game.ballAngle : Math.PI / 2;
          
          for (const seg of platform.segments) {
            if (seg.broken) continue;
            
            const segStart = (seg.startAngle + platform.rotation) % (Math.PI * 2);
            const segEnd = (seg.endAngle + platform.rotation) % (Math.PI * 2);
            
            let inSeg = false;
            const normBall = ((checkAngle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
            const normStart = ((segStart % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
            const normEnd = ((segEnd % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
            
            if (normStart < normEnd) {
              inSeg = normBall >= normStart && normBall <= normEnd;
            } else {
              inSeg = normBall >= normStart || normBall <= normEnd;
            }
            
            if (inSeg) {
              if (seg.type === 'gap') {
                // Pass through gap
                game.score += 10;
                game.landedPlatform = null;
                setScore(game.score);
              } else if (seg.type === 'breakable') {
                if (game.holding) {
                  // SMASH! Break through
                  seg.broken = true;
                  game.score += 20 + game.combo * 5;
                  game.combo++;
                  game.landedPlatform = null;
                  setScore(game.score);
                  playSmash();
                  
                  // Particles
                  for (let i = 0; i < 12; i++) {
                    game.particles.push({
                      x: game.ballX + (Math.random() - 0.5) * 60,
                      y: platform.y,
                      vx: (Math.random() - 0.5) * 12,
                      vy: -Math.random() * 8,
                      life: 25,
                      color: seg.color,
                    });
                  }
                } else {
                  // Not holding = land on it and rotate with it
                  game.ballY = platform.y - PLATFORM_THICKNESS/2 - BALL_RADIUS;
                  game.ballVY = 0;
                  game.ballAngle = checkAngle;
                  game.landedPlatform = platform;
                  game.combo = 0;
                }
              } else {
                // SOLID BLACK - instant death if smashing, land if not
                if (game.holding) {
                  // Hit solid while smashing = DEATH
                  game.lives--;
                  setLives(game.lives);
                  game.combo = 0;
                  playHit();
                  
                  // Red particles
                  for (let i = 0; i < 8; i++) {
                    game.particles.push({
                      x: game.ballX + (Math.random() - 0.5) * 40,
                      y: platform.y,
                      vx: (Math.random() - 0.5) * 6,
                      vy: Math.random() * 3,
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
                  
                  // Land and stop
                  game.ballY = platform.y - PLATFORM_THICKNESS/2 - BALL_RADIUS;
                  game.ballVY = 0;
                  game.ballAngle = checkAngle;
                  game.landedPlatform = platform;
                  game.holding = false;
                } else {
                  // Landing on solid = stop and rotate with it
                  game.ballY = platform.y - PLATFORM_THICKNESS/2 - BALL_RADIUS;
                  game.ballVY = 0;
                  game.ballAngle = checkAngle;
                  game.landedPlatform = platform;
                  game.combo = 0;
                }
              }
              break;
            }
          }
        }
      }

      // Win
      const lastPlatform = game.platforms[game.platforms.length - 1];
      if (game.ballY > lastPlatform.y + 150) {
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

      // Draw platforms
      for (const platform of game.platforms) {
        const screenY = platform.y - game.cameraY;
        if (screenY < -PLATFORM_RADIUS - 50 || screenY > canvasSize.h + PLATFORM_RADIUS + 50) continue;

        for (const seg of platform.segments) {
          if (seg.broken || seg.type === 'gap') continue;
          
          const startAngle = seg.startAngle + platform.rotation;
          const endAngle = seg.endAngle + platform.rotation;
          
          ctx.fillStyle = seg.color;
          if (seg.type === 'breakable') {
            ctx.shadowColor = seg.color;
            ctx.shadowBlur = 10;
          } else {
            // BLACK = DANGER - red glow
            ctx.shadowColor = THEME.solidGlow;
            ctx.shadowBlur = 15;
          }
          
          ctx.beginPath();
          ctx.arc(BALL_X, screenY, PLATFORM_RADIUS, startAngle, endAngle);
          ctx.arc(BALL_X, screenY, PLATFORM_INNER, endAngle, startAngle, true);
          ctx.closePath();
          ctx.fill();
        }
        ctx.shadowBlur = 0;
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

      // UI - Score
      ctx.fillStyle = THEME.text;
      ctx.font = 'bold 24px monospace';
      ctx.fillText(`${game.score}`, 20, 40);
      
      // Lives (hearts)
      ctx.font = '20px monospace';
      for (let i = 0; i < MAX_HEALTH; i++) {
        ctx.fillStyle = i < game.lives ? THEME.danger : '#333';
        ctx.fillText('♥', canvasSize.w - 30 - i * 25, 35);
      }
      
      // Combo
      if (game.combo > 1) {
        ctx.fillStyle = THEME.ballGlow;
        ctx.font = 'bold 18px monospace';
        ctx.fillText(`x${game.combo}`, 20, 65);
      }
      
      // Mode indicator - bigger and clearer
      if (game.holding) {
        ctx.fillStyle = THEME.ball;
        ctx.font = 'bold 18px monospace';
        ctx.fillText('⚡ SMASHING ⚡', canvasSize.w / 2 - 70, 70);
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
              ■ BLACK = don't hit!
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
          style={{ display: 'block', touchAction: 'none' }} 
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
            🎉 WIN!
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
