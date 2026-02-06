'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';

const THEME = {
  snowball: '#e2e8f0',
  frost: '#94a3b8',
  gear: '#92400e',
  gearGlow: '#d97706',
  weak: '#3b82f6', // blue - breakable
  weakGlow: '#60a5fa',
  bg: '#0c0a09',
  bgAccent: '#1c1917',
  text: '#a8a29e',
  danger: '#dc2626',
};

const GAME_ID = 'melt2';
const NUM_PLATFORMS = 25;
const MAX_HEALTH = 100;
const DASH_COOLDOWN = 500; // ms

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

function playDash() {
  if (!audioCtx || !masterGain) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'square';
  osc.frequency.setValueAtTime(150, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(80, audioCtx.currentTime + 0.1);
  gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.1);
  osc.connect(gain);
  gain.connect(masterGain);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.1);
}

function playBreak() {
  if (!audioCtx || !masterGain) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(400, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.15);
  gain.gain.setValueAtTime(0.25, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);
  osc.connect(gain);
  gain.connect(masterGain);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.15);
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

interface Segment {
  startAngle: number;
  endAngle: number;
  type: 'solid' | 'weak' | 'gap';
  broken: boolean;
}

interface Platform {
  y: number;
  x: number;
  radius: number;
  segments: Segment[];
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
  color: string;
}

export default function Melt2Game() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<'start' | 'playing' | 'won' | 'dead'>('start');
  const [finalHealth, setFinalHealth] = useState(MAX_HEALTH);
  const [layersDescended, setLayersDescended] = useState(0);
  const [canvasSize, setCanvasSize] = useState({ w: 400, h: 700 });

  const gameRef = useRef({
    running: false,
    dashing: false,
    lastDash: 0,
    ballX: 0,
    ballY: 80,
    ballSize: 16,
    ballVY: 2, // constant slow fall
    cameraY: 0,
    platforms: [] as Platform[],
    particles: [] as Particle[],
    layersPassed: 0,
    health: MAX_HEALTH,
  });

  const generatePlatforms = useCallback((canvasW: number) => {
    const platforms: Platform[] = [];
    let currentY = 300;
    
    for (let i = 0; i < NUM_PLATFORMS; i++) {
      const progress = i / NUM_PLATFORMS;
      
      // Spacing
      const baseGap = 280 - progress * 100;
      currentY += baseGap;
      
      // Radius
      const radius = 100 - progress * 30 + (Math.random() - 0.5) * 20;
      
      // X offset
      const maxOffset = progress * (canvasW * 0.2);
      const xOffset = (Math.random() - 0.5) * maxOffset;
      
      // Generate segments (4-6 segments per gear)
      const numSegments = 4 + Math.floor(Math.random() * 3);
      const segments: Segment[] = [];
      const segmentSize = (Math.PI * 2) / numSegments;
      
      for (let s = 0; s < numSegments; s++) {
        const startAngle = s * segmentSize;
        const endAngle = startAngle + segmentSize * 0.9; // small gap between segments
        
        // Decide segment type
        // More gaps early, more solid/weak later
        const roll = Math.random();
        let type: 'solid' | 'weak' | 'gap';
        
        if (progress < 0.2) {
          // Easy: mostly gaps and weak
          type = roll < 0.4 ? 'gap' : (roll < 0.7 ? 'weak' : 'solid');
        } else if (progress < 0.5) {
          // Medium: balanced
          type = roll < 0.25 ? 'gap' : (roll < 0.55 ? 'weak' : 'solid');
        } else {
          // Hard: mostly solid and weak, few gaps
          type = roll < 0.15 ? 'gap' : (roll < 0.45 ? 'weak' : 'solid');
        }
        
        segments.push({ startAngle, endAngle, type, broken: false });
      }
      
      // Ensure at least one gap or weak spot
      const hasEscape = segments.some(s => s.type === 'gap' || s.type === 'weak');
      if (!hasEscape) {
        segments[Math.floor(Math.random() * segments.length)].type = 'weak';
      }
      
      platforms.push({
        y: currentY,
        x: xOffset,
        radius: Math.max(60, radius),
        segments,
        rotation: Math.random() * Math.PI * 2,
        speed: (0.3 + progress * 0.4) * (Math.random() < 0.5 ? 1 : -1),
        passed: false,
      });
    }
    return platforms;
  }, []);

  const startGame = useCallback(() => {
    initAudio();
    const game = gameRef.current;
    game.running = true;
    game.dashing = false;
    game.lastDash = 0;
    game.ballX = canvasSize.w / 2;
    game.ballY = 80;
    game.ballSize = 16;
    game.ballVY = 2;
    game.cameraY = 0;
    game.platforms = generatePlatforms(canvasSize.w);
    game.particles = [];
    game.layersPassed = 0;
    game.health = MAX_HEALTH;
    setLayersDescended(0);
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

    const update = () => {
      const game = gameRef.current;
      if (!game.running) return;

      game.ballX = canvasSize.w / 2;

      // Constant slow fall OR dashing
      if (game.dashing) {
        game.ballVY = 25; // dash speed
        game.dashing = false;
      } else {
        game.ballVY = Math.max(2, game.ballVY * 0.95); // slow down after dash
      }
      
      game.ballY += game.ballVY;

      // Camera
      const targetCameraY = game.ballY - canvasSize.h / 3;
      game.cameraY += (targetCameraY - game.cameraY) * 0.1;

      // Rotate gears
      for (const platform of game.platforms) {
        platform.rotation += platform.speed * 0.012;
      }

      // Collision
      const GEAR_THICKNESS = 25;
      for (const platform of game.platforms) {
        const ballBottom = game.ballY + game.ballSize;
        const ballTop = game.ballY - game.ballSize;
        const platformX = canvasSize.w / 2 + platform.x;
        
        if (ballBottom > platform.y - GEAR_THICKNESS/2 && 
            ballTop < platform.y + GEAR_THICKNESS/2) {
          
          const dx = game.ballX - platformX;
          const distFromCenter = Math.abs(dx);
          
          if (distFromCenter < platform.radius) {
            // Find which segment we're hitting
            const ballAngle = (Math.PI / 2 + platform.rotation) % (Math.PI * 2);
            
            let hitSegment: Segment | null = null;
            for (const seg of platform.segments) {
              const segStart = (seg.startAngle + platform.rotation) % (Math.PI * 2);
              const segEnd = (seg.endAngle + platform.rotation) % (Math.PI * 2);
              
              // Check if ball angle is in this segment
              let inSeg = false;
              if (segStart < segEnd) {
                inSeg = ballAngle >= segStart && ballAngle <= segEnd;
              } else {
                inSeg = ballAngle >= segStart || ballAngle <= segEnd;
              }
              
              if (inSeg && !seg.broken) {
                hitSegment = seg;
                break;
              }
            }
            
            if (hitSegment) {
              if (hitSegment.type === 'gap') {
                // Pass through
                if (!platform.passed) {
                  platform.passed = true;
                  game.layersPassed++;
                  setLayersDescended(game.layersPassed);
                }
              } else if (hitSegment.type === 'weak') {
                // Can break through if moving fast (dashing)
                if (game.ballVY > 10) {
                  hitSegment.broken = true;
                  platform.passed = true;
                  game.layersPassed++;
                  setLayersDescended(game.layersPassed);
                  playBreak();
                  
                  // Break particles
                  for (let i = 0; i < 10; i++) {
                    game.particles.push({
                      x: game.ballX + (Math.random() - 0.5) * 50,
                      y: platform.y,
                      vx: (Math.random() - 0.5) * 8,
                      vy: -Math.random() * 5,
                      life: 30,
                      color: THEME.weak,
                    });
                  }
                } else {
                  // Too slow - bounce
                  if (!platform.passed) {
                    game.ballVY = -4;
                    game.health -= 10;
                    game.ballSize = Math.max(8, 8 + (game.health / MAX_HEALTH) * 8);
                    platform.passed = true;
                    playSizzle();
                    
                    if (game.health <= 0) {
                      game.running = false;
                      playDeath();
                      setFinalHealth(0);
                      setGameState('dead');
                      return;
                    }
                  }
                }
              } else {
                // Solid - always hurts
                if (!platform.passed) {
                  playSizzle();
                  game.health -= 20;
                  game.ballSize = Math.max(8, 8 + (game.health / MAX_HEALTH) * 8);
                  game.ballVY = -6;
                  platform.passed = true;
                  
                  for (let i = 0; i < 6; i++) {
                    game.particles.push({
                      x: game.ballX + (Math.random() - 0.5) * 40,
                      y: platform.y,
                      vx: (Math.random() - 0.5) * 4,
                      vy: -2 - Math.random() * 3,
                      life: 25,
                      color: '#fff',
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
            } else if (!platform.passed) {
              // In a gap or broken segment
              platform.passed = true;
              game.layersPassed++;
              setLayersDescended(game.layersPassed);
            }
          }
        }
      }

      // Win
      const lastPlatform = game.platforms[game.platforms.length - 1];
      if (game.ballY > lastPlatform.y + 200) {
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
        p.vy += 0.2;
        p.life--;
        return p.life > 0;
      });
    };

    const draw = () => {
      const game = gameRef.current;
      
      ctx.fillStyle = THEME.bg;
      ctx.fillRect(0, 0, canvasSize.w, canvasSize.h);
      
      // Industrial lines
      ctx.strokeStyle = THEME.bgAccent;
      ctx.lineWidth = 1;
      for (let y = 0; y < canvasSize.h; y += 50) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvasSize.w, y);
        ctx.stroke();
      }

      // Draw gears with segments
      for (const platform of game.platforms) {
        const screenY = platform.y - game.cameraY;
        if (screenY < -platform.radius - 50 || screenY > canvasSize.h + platform.radius + 50) continue;

        const platformX = canvasSize.w / 2 + platform.x;
        
        // Draw each segment
        for (const seg of platform.segments) {
          if (seg.broken) continue;
          
          const startAngle = seg.startAngle + platform.rotation;
          const endAngle = seg.endAngle + platform.rotation;
          
          if (seg.type === 'gap') continue;
          
          ctx.fillStyle = seg.type === 'solid' ? THEME.gear : THEME.weak;
          ctx.shadowColor = seg.type === 'solid' ? THEME.gearGlow : THEME.weakGlow;
          ctx.shadowBlur = 12;
          
          ctx.beginPath();
          ctx.moveTo(platformX, screenY);
          ctx.arc(platformX, screenY, platform.radius, startAngle, endAngle);
          ctx.lineTo(platformX, screenY);
          ctx.closePath();
          ctx.fill();
        }
        
        // Center hub
        ctx.fillStyle = THEME.bgAccent;
        ctx.shadowBlur = 0;
        ctx.beginPath();
        ctx.arc(platformX, screenY, platform.radius * 0.12, 0, Math.PI * 2);
        ctx.fill();
      }

      // Particles
      for (const p of game.particles) {
        const screenY = p.y - game.cameraY;
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.life / 30;
        ctx.beginPath();
        ctx.arc(p.x, screenY, 5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // Snowball
      const ballScreenY = game.ballY - game.cameraY;
      
      // Trail when dashing
      if (game.ballVY > 5) {
        ctx.fillStyle = THEME.frost;
        ctx.globalAlpha = 0.3;
        for (let i = 1; i <= 3; i++) {
          ctx.beginPath();
          ctx.arc(game.ballX, ballScreenY - i * 15, game.ballSize * (1 - i * 0.2), 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
      
      ctx.fillStyle = THEME.snowball;
      ctx.shadowColor = THEME.frost;
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.arc(game.ballX, ballScreenY, game.ballSize, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      
      // Eyes
      const eyeSpacing = game.ballSize * 0.35;
      const eyeY = ballScreenY - game.ballSize * 0.1;
      const eyeSize = Math.max(2, game.ballSize * 0.12);
      
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.arc(game.ballX - eyeSpacing, eyeY, eyeSize, 0, Math.PI * 2);
      ctx.arc(game.ballX + eyeSpacing, eyeY, eyeSize, 0, Math.PI * 2);
      ctx.fill();

      // Health bar
      const barHeight = 4;
      ctx.fillStyle = THEME.bgAccent;
      ctx.fillRect(0, 0, canvasSize.w, barHeight);
      ctx.fillStyle = game.health > 30 ? THEME.frost : THEME.danger;
      ctx.fillRect(0, 0, (game.health / MAX_HEALTH) * canvasSize.w, barHeight);
      
      // Dash cooldown indicator
      const now = Date.now();
      const canDash = now - game.lastDash > DASH_COOLDOWN;
      ctx.fillStyle = canDash ? THEME.weak : THEME.bgAccent;
      ctx.font = 'bold 14px monospace';
      ctx.fillText(canDash ? 'TAP TO DASH' : '...', 10, 25);
    };

    const gameLoop = () => {
      update();
      draw();
      animationId = requestAnimationFrame(gameLoop);
    };
    animationId = requestAnimationFrame(gameLoop);

    const handleTap = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      const game = gameRef.current;
      if (!game.running) return;
      
      const now = Date.now();
      if (now - game.lastDash > DASH_COOLDOWN) {
        game.dashing = true;
        game.lastDash = now;
        playDash();
      }
    };

    canvas.addEventListener('mousedown', handleTap);
    canvas.addEventListener('touchstart', handleTap, { passive: false });

    return () => {
      cancelAnimationFrame(animationId);
      canvas.removeEventListener('mousedown', handleTap);
      canvas.removeEventListener('touchstart', handleTap);
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
            color: THEME.gear, 
            fontSize: 64, 
            marginBottom: 10,
            textShadow: `0 0 40px ${THEME.gearGlow}`,
            fontWeight: 900,
          }}>
            MELT 2
          </h1>
          
          <p style={{ color: THEME.text, fontSize: 18, marginBottom: 25 }}>
            Trapped in the machine.<br/>
            <span style={{ color: THEME.gear }}>Dash through the gears.</span>
          </p>
          
          <div style={{ 
            background: 'rgba(0,0,0,0.6)', 
            padding: 20, 
            borderRadius: 4,
            marginBottom: 30,
            textAlign: 'left',
            maxWidth: 280,
            border: `1px solid ${THEME.bgAccent}`,
          }}>
            <p style={{ color: THEME.text, fontSize: 15, marginBottom: 12 }}>
              <strong style={{ color: THEME.frost }}>TAP</strong> — dash downward
            </p>
            <p style={{ color: THEME.text, fontSize: 15, marginBottom: 12 }}>
              <span style={{ color: THEME.gear }}>■ Orange</span> = solid (avoid)
            </p>
            <p style={{ color: THEME.text, fontSize: 15 }}>
              <span style={{ color: THEME.weak }}>■ Blue</span> = weak (dash through)
            </p>
          </div>
          
          <button
            onClick={startGame}
            style={{
              background: THEME.gear,
              color: '#fff',
              border: 'none',
              padding: '18px 60px',
              fontSize: 18,
              fontWeight: 700,
              cursor: 'pointer',
              borderRadius: 4,
              textTransform: 'uppercase',
            }}
          >
            Enter
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
          <h1 style={{ color: THEME.gearGlow, fontSize: 56, marginBottom: 10 }}>
            ESCAPED 😊
          </h1>
          <p style={{ color: THEME.text, fontSize: 20, marginBottom: 30 }}>
            Health: {Math.round(finalHealth)}%
          </p>
          <button
            onClick={startGame}
            style={{
              background: THEME.gear,
              color: '#fff',
              border: 'none',
              padding: '16px 50px',
              fontSize: 18,
              cursor: 'pointer',
              borderRadius: 4,
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
          <h1 style={{ color: THEME.danger, fontSize: 56, marginBottom: 10 }}>
            CRUSHED
          </h1>
          <p style={{ color: THEME.text, fontSize: 20, marginBottom: 30 }}>
            Layers: {layersDescended}
          </p>
          <button
            onClick={startGame}
            style={{
              background: THEME.frost,
              color: THEME.bg,
              border: 'none',
              padding: '16px 50px',
              fontSize: 18,
              cursor: 'pointer',
              borderRadius: 4,
            }}
          >
            Retry
          </button>
        </div>
      )}
    </div>
  );
}
