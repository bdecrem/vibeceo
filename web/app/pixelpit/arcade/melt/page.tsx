'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import Script from 'next/script';
import {
  ScoreFlow,
  Leaderboard,
  ShareButtonContainer,
  usePixelpitSocial,
  type ScoreFlowColors,
  type LeaderboardColors,
} from '@/app/pixelpit/components';

// MELT palette - cold to hot
const THEME = {
  snowball: '#f0f9ff',
  frost: '#bae6fd',
  ice: '#0ea5e9',
  iceParticle: '#7dd3fc',
  lava: '#f97316',
  lavaGlow: '#fbbf24',
  coldBg: '#1e3a5f',
  hellBg: '#7f1d1d',
  hellFloor: '#450a0a',
  text: '#fafafa',
};

const GAME_ID = 'melt';
const CANVAS_W = 360;
const CANVAS_H = 640;
const PLATFORM_HEIGHT = 16;
const PLATFORM_GAP = 70;
const NUM_PLATFORMS = 40;
const BALL_X = CANVAS_W / 2;

// Social colors
const SCORE_FLOW_COLORS: ScoreFlowColors = {
  bg: THEME.coldBg,
  surface: '#1e3a5f',
  primary: THEME.lava,
  secondary: THEME.ice,
  text: THEME.text,
  muted: THEME.frost,
  error: '#ef4444',
};

const LEADERBOARD_COLORS: LeaderboardColors = {
  bg: THEME.coldBg,
  surface: '#1e3a5f',
  primary: THEME.lava,
  secondary: THEME.ice,
  text: THEME.text,
  muted: THEME.frost,
};

// Audio
let audioCtx: AudioContext | null = null;
let masterGain: GainNode | null = null;

function initAudio() {
  if (audioCtx) return;
  audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  masterGain = audioCtx.createGain();
  masterGain.gain.value = 0.3;
  masterGain.connect(audioCtx.destination);
  if (audioCtx.state === 'suspended') audioCtx.resume();
}

function playCrunch() {
  if (!audioCtx || !masterGain) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'square';
  osc.frequency.setValueAtTime(800, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(200, audioCtx.currentTime + 0.05);
  gain.gain.setValueAtTime(0.25, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.1);
  osc.connect(gain);
  gain.connect(masterGain);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.1);
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

interface Platform {
  y: number;
  gapStart: number;
  gapWidth: number;
  type: 'ice' | 'lava';
  broken: boolean;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
}

export default function MeltGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<'start' | 'playing' | 'won' | 'dead'>('start');
  const [finalSize, setFinalSize] = useState(20);
  const [layersDescended, setLayersDescended] = useState(0);
  
  // Social integration state
  const [socialLoaded, setSocialLoaded] = useState(false);
  const [submittedEntryId, setSubmittedEntryId] = useState<number | null>(null);
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  usePixelpitSocial(socialLoaded);

  const gameRef = useRef({
    running: false,
    holding: false,
    ballY: 80,
    ballSize: 20,
    ballVY: 0,
    cameraY: 0,
    platforms: [] as Platform[],
    particles: [] as Particle[],
    layersPassed: 0,
    progress: 0,
  });

  const generatePlatforms = useCallback(() => {
    const platforms: Platform[] = [];
    for (let i = 0; i < NUM_PLATFORMS; i++) {
      const y = 180 + i * PLATFORM_GAP;
      
      // First 5 platforms = all ice (tutorial)
      // Then gradually more lava
      const isLava = i >= 5 && Math.random() < Math.min(0.6, (i - 5) / 20);
      
      // Gap position and width
      const gapWidth = 60 + Math.random() * 40;
      const gapStart = 30 + Math.random() * (CANVAS_W - gapWidth - 60);
      
      platforms.push({
        y,
        gapStart,
        gapWidth,
        type: isLava ? 'lava' : 'ice',
        broken: false,
      });
    }
    return platforms;
  }, []);

  const startGame = useCallback(() => {
    initAudio();
    const game = gameRef.current;
    game.running = true;
    game.holding = false;
    game.ballY = 80;
    game.ballSize = 20;
    game.ballVY = 0;
    game.cameraY = 0;
    game.platforms = generatePlatforms();
    game.particles = [];
    game.layersPassed = 0;
    game.progress = 0;
    setFinalSize(20);
    setLayersDescended(0);
    setSubmittedEntryId(null);
    setShowLeaderboard(false);
    setGameState('playing');
  }, [generatePlatforms]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = CANVAS_W;
    canvas.height = CANVAS_H;

    let animationId: number;

    const update = () => {
      const game = gameRef.current;
      if (!game.running) return;

      // Physics - HOLD = fast, RELEASE = slow
      const gravity = game.holding ? 1.2 : 0.3;
      game.ballVY += gravity;
      game.ballVY = Math.min(game.ballVY, game.holding ? 18 : 4);
      game.ballY += game.ballVY;

      // Camera follows
      const targetCameraY = game.ballY - CANVAS_H / 3;
      game.cameraY += (targetCameraY - game.cameraY) * 0.1;

      // Progress
      game.progress = Math.min(1, game.ballY / (NUM_PLATFORMS * PLATFORM_GAP));

      // Collision with platforms
      for (const platform of game.platforms) {
        if (platform.broken) continue;
        
        const ballBottom = game.ballY + game.ballSize;
        const ballTop = game.ballY - game.ballSize;
        
        // Check if ball is hitting platform
        if (ballBottom > platform.y && ballTop < platform.y + PLATFORM_HEIGHT) {
          // Check if ball is in the gap
          const inGap = BALL_X > platform.gapStart && BALL_X < platform.gapStart + platform.gapWidth;
          
          if (!inGap) {
            if (platform.type === 'ice') {
              if (game.holding) {
                // Smash through ice!
                platform.broken = true;
                game.layersPassed++;
                setLayersDescended(game.layersPassed);
                playCrunch();
                
                // Particles
                for (let i = 0; i < 12; i++) {
                  game.particles.push({
                    x: BALL_X + (Math.random() - 0.5) * 50,
                    y: platform.y,
                    vx: (Math.random() - 0.5) * 10,
                    vy: -Math.random() * 5,
                    life: 30,
                    color: THEME.iceParticle,
                  });
                }
              } else {
                // Land on ice
                game.ballY = platform.y - game.ballSize;
                game.ballVY = 0;
              }
            } else {
              // Hit lava - OUCH
              playSizzle();
              game.ballSize = Math.max(6, game.ballSize - 4);
              game.ballVY = -8;
              platform.broken = true;
              
              // Steam particles
              for (let i = 0; i < 8; i++) {
                game.particles.push({
                  x: BALL_X + (Math.random() - 0.5) * 30,
                  y: platform.y,
                  vx: (Math.random() - 0.5) * 3,
                  vy: -3 - Math.random() * 3,
                  life: 40,
                  color: '#fff',
                });
              }
              
              if (game.ballSize <= 6) {
                game.running = false;
                playDeath();
                setFinalSize(game.ballSize);
                setGameState('dead');
                return;
              }
            }
          }
        }
      }

      // Win - reached hell
      const hellY = NUM_PLATFORMS * PLATFORM_GAP + 200;
      if (game.ballY > hellY) {
        game.running = false;
        playWin();
        setFinalSize(game.ballSize);
        setGameState('won');
        fetch('/api/pixelpit/stats', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ game: GAME_ID }),
        }).catch(() => {});
      }

      // Update particles
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
      
      // Background gradient
      const r1 = 30, g1 = 58, b1 = 95;
      const r2 = 127, g2 = 29, b2 = 29;
      const r = Math.floor(r1 + (r2 - r1) * game.progress);
      const g = Math.floor(g1 + (g2 - g1) * game.progress);
      const b = Math.floor(b1 + (b2 - b1) * game.progress);
      ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

      // Draw platforms
      for (const platform of game.platforms) {
        if (platform.broken) continue;
        
        const screenY = platform.y - game.cameraY;
        if (screenY < -50 || screenY > CANVAS_H + 50) continue;

        // Left section
        if (platform.gapStart > 0) {
          ctx.fillStyle = platform.type === 'ice' ? THEME.ice : THEME.lava;
          if (platform.type === 'lava') {
            ctx.shadowColor = THEME.lavaGlow;
            ctx.shadowBlur = 15;
          }
          ctx.fillRect(0, screenY, platform.gapStart, PLATFORM_HEIGHT);
          ctx.shadowBlur = 0;
        }
        
        // Right section
        const rightStart = platform.gapStart + platform.gapWidth;
        if (rightStart < CANVAS_W) {
          ctx.fillStyle = platform.type === 'ice' ? THEME.ice : THEME.lava;
          if (platform.type === 'lava') {
            ctx.shadowColor = THEME.lavaGlow;
            ctx.shadowBlur = 15;
          }
          ctx.fillRect(rightStart, screenY, CANVAS_W - rightStart, PLATFORM_HEIGHT);
          ctx.shadowBlur = 0;
        }
      }

      // Draw particles
      for (const p of game.particles) {
        const screenY = p.y - game.cameraY;
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.life / 40;
        ctx.beginPath();
        ctx.arc(p.x, screenY, 4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // Draw snowball
      const ballScreenY = game.ballY - game.cameraY;
      
      // Glow
      ctx.fillStyle = THEME.snowball;
      ctx.shadowColor = THEME.frost;
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.arc(BALL_X, ballScreenY, game.ballSize, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      
      // Eyes
      const eyeSpacing = game.ballSize * 0.35;
      const eyeY = ballScreenY - game.ballSize * 0.15;
      const eyeSize = Math.max(2, game.ballSize * 0.12);
      
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.arc(BALL_X - eyeSpacing, eyeY, eyeSize, 0, Math.PI * 2);
      ctx.arc(BALL_X + eyeSpacing, eyeY, eyeSize, 0, Math.PI * 2);
      ctx.fill();

      // UI - Health bar
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(15, 15, 104, 20);
      ctx.fillStyle = THEME.frost;
      ctx.fillRect(17, 17, game.ballSize * 5, 16);
      ctx.fillStyle = THEME.text;
      ctx.font = 'bold 11px monospace';
      ctx.fillText('SIZE', 22, 29);

      // Layers counter
      ctx.fillStyle = THEME.text;
      ctx.font = '14px monospace';
      ctx.fillText(`LAYERS: ${game.layersPassed}`, 15, 50);
      
      // Goal indicator
      ctx.fillStyle = THEME.lava;
      ctx.font = 'bold 12px monospace';
      ctx.fillText('↓ HELL', CANVAS_W - 60, 30);
      
      // Hold indicator
      if (game.holding) {
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.font = 'bold 14px monospace';
        ctx.fillText('SMASHING!', CANVAS_W / 2 - 40, 30);
      }
    };

    const gameLoop = () => {
      update();
      draw();
      animationId = requestAnimationFrame(gameLoop);
    };
    animationId = requestAnimationFrame(gameLoop);

    // Input
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
  }, [gameState]);

  return (
    <>
      {/* Load social.js */}
      <Script
        src="/pixelpit/social.js"
        strategy="afterInteractive"
        onLoad={() => setSocialLoaded(true)}
      />

      <div style={{
        minHeight: '100vh',
        background: THEME.coldBg,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        fontFamily: 'ui-monospace, monospace',
      }}>
        {gameState === 'start' && (
          <div style={{ textAlign: 'center', maxWidth: 300 }}>
            <h1 style={{ 
              color: THEME.snowball, 
              fontSize: 56, 
              marginBottom: 10,
              textShadow: `0 0 30px ${THEME.frost}`,
            }}>
              MELT
            </h1>
            
            <p style={{ color: THEME.frost, fontSize: 18, marginBottom: 20 }}>
              You&apos;re a snowball.<br/>
              <span style={{ color: THEME.lava }}>Reach hell. ↓</span>
            </p>
            
            <div style={{ 
              background: 'rgba(0,0,0,0.3)', 
              padding: 15, 
              borderRadius: 8,
              marginBottom: 25,
              textAlign: 'left',
            }}>
              <p style={{ color: THEME.ice, fontSize: 14, marginBottom: 8 }}>
                <strong>HOLD</strong> = Fall fast, smash <span style={{ color: THEME.ice }}>blue ice</span>
              </p>
              <p style={{ color: THEME.lava, fontSize: 14, marginBottom: 8 }}>
                <strong>RELEASE</strong> = Fall slow, dodge <span style={{ color: THEME.lava }}>orange lava</span>
              </p>
              <p style={{ color: THEME.text, fontSize: 12 }}>
                Hit lava = shrink. Too small = die.
              </p>
            </div>
            
            <button
              onClick={startGame}
              style={{
                background: `linear-gradient(135deg, ${THEME.frost}, ${THEME.ice})`,
                color: THEME.coldBg,
                border: 'none',
                padding: '16px 50px',
                fontSize: 18,
                fontWeight: 700,
                cursor: 'pointer',
                borderRadius: 8,
              }}
            >
              DESCEND ↓
            </button>

            {/* Leaderboard on start */}
            <div style={{ marginTop: 30, width: '100%' }}>
              <Leaderboard
                gameId={GAME_ID}
                limit={5}
                entryId={submittedEntryId ?? undefined}
                colors={LEADERBOARD_COLORS}
              />
            </div>
          </div>
        )}

        {gameState === 'playing' && (
          <canvas 
            ref={canvasRef} 
            style={{ 
              borderRadius: 8,
              touchAction: 'none',
            }} 
          />
        )}

        {gameState === 'won' && (
          <div style={{ textAlign: 'center', maxWidth: 400, width: '100%' }}>
            <h1 style={{ 
              color: THEME.lava, 
              fontSize: 48, 
              marginBottom: 10,
              textShadow: `0 0 30px ${THEME.lavaGlow}`,
            }}>
              MELTED
            </h1>
            <p style={{ color: THEME.text, fontSize: 18, marginBottom: 10 }}>
              You reached hell. You&apos;re free.
            </p>
            <p style={{ color: THEME.frost, fontSize: 14, marginBottom: 20 }}>
              Final size: {Math.round(finalSize)}px • Layers smashed: {layersDescended}
            </p>

            {/* ScoreFlow */}
            <ScoreFlow
              score={layersDescended}
              gameId={GAME_ID}
              colors={SCORE_FLOW_COLORS}
              xpDivisor={1}
              onRankReceived={(rank, entryId) => setSubmittedEntryId(entryId ?? null)}
            />

            {/* Share button */}
            <div style={{ marginTop: 20 }}>
              <ShareButtonContainer
                id="share-btn-melt-win"
                url={`${typeof window !== 'undefined' ? window.location.origin : ''}/pixelpit/arcade/melt/share/${layersDescended}`}
                text={`I melted through ${layersDescended} layers and reached hell on MELT! Can you make it? ❄️🔥`}
                style="minimal"
                socialLoaded={socialLoaded}
              />
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 20 }}>
              <button
                onClick={() => setShowLeaderboard(!showLeaderboard)}
                style={{
                  background: 'transparent',
                  color: THEME.frost,
                  border: `1px solid ${THEME.frost}`,
                  padding: '12px 20px',
                  fontSize: 14,
                  cursor: 'pointer',
                  borderRadius: 8,
                }}
              >
                {showLeaderboard ? 'Hide' : 'Leaderboard'}
              </button>
              <button
                onClick={startGame}
                style={{
                  background: THEME.lava,
                  color: '#fff',
                  border: 'none',
                  padding: '12px 30px',
                  fontSize: 16,
                  cursor: 'pointer',
                  borderRadius: 8,
                }}
              >
                Melt Again
              </button>
            </div>

            {showLeaderboard && (
              <div style={{ marginTop: 20 }}>
                <Leaderboard
                  gameId={GAME_ID}
                  limit={5}
                  entryId={submittedEntryId ?? undefined}
                  colors={LEADERBOARD_COLORS}
                />
              </div>
            )}
          </div>
        )}

        {gameState === 'dead' && (
          <div style={{ textAlign: 'center', maxWidth: 400, width: '100%' }}>
            <h1 style={{ color: '#ef4444', fontSize: 48, marginBottom: 10 }}>
              EVAPORATED
            </h1>
            <p style={{ color: THEME.text, fontSize: 18, marginBottom: 10 }}>
              Too much lava. You vanished.
            </p>
            <p style={{ color: THEME.frost, fontSize: 14, marginBottom: 20 }}>
              Layers descended: {layersDescended}
            </p>

            {/* ScoreFlow for partial progress */}
            {layersDescended > 0 && (
              <ScoreFlow
                score={layersDescended}
                gameId={GAME_ID}
                colors={SCORE_FLOW_COLORS}
                xpDivisor={1}
                onRankReceived={(rank, entryId) => setSubmittedEntryId(entryId ?? null)}
              />
            )}

            {/* Share button */}
            <div style={{ marginTop: 20 }}>
              <ShareButtonContainer
                id="share-btn-melt-dead"
                url={`${typeof window !== 'undefined' ? window.location.origin : ''}/pixelpit/arcade/melt/share/${layersDescended}`}
                text={`I descended ${layersDescended} layers on MELT before evaporating. Can you reach hell? ❄️🔥`}
                style="minimal"
                socialLoaded={socialLoaded}
              />
            </div>

            <button
              onClick={startGame}
              style={{
                marginTop: 20,
                background: THEME.ice,
                color: THEME.coldBg,
                border: 'none',
                padding: '16px 40px',
                fontSize: 18,
                cursor: 'pointer',
                borderRadius: 8,
              }}
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    </>
  );
}
