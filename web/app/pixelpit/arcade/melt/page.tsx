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
const CANVAS_W = 400;
const CANVAS_H = 700;
const PLATFORM_HEIGHT = 20;
const PLATFORM_GAP = 80;
const NUM_PLATFORMS = 50;

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
  gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.08);
  osc.connect(gain);
  gain.connect(masterGain);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.08);
  
  const chime = audioCtx.createOscillator();
  const chimeGain = audioCtx.createGain();
  chime.type = 'sine';
  chime.frequency.value = 1200 + Math.random() * 400;
  chimeGain.gain.setValueAtTime(0.1, audioCtx.currentTime);
  chimeGain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.1);
  chime.connect(chimeGain);
  chimeGain.connect(masterGain);
  chime.start();
  chime.stop(audioCtx.currentTime + 0.1);
}

function playSizzle() {
  if (!audioCtx || !masterGain) return;
  const bufferSize = audioCtx.sampleRate * 0.2;
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
  gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.2);
  noise.connect(filter);
  filter.connect(gain);
  gain.connect(masterGain);
  noise.start();
}

function playWin() {
  if (!audioCtx || !masterGain) return;
  const bufferSize = audioCtx.sampleRate * 0.5;
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize) * 0.3;
  }
  const noise = audioCtx.createBufferSource();
  noise.buffer = buffer;
  const filter = audioCtx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 1000;
  const gain = audioCtx.createGain();
  gain.gain.value = 0.2;
  noise.connect(filter);
  filter.connect(gain);
  gain.connect(masterGain);
  noise.start();
  
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
    }, i * 100);
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
  segments: Array<{
    startAngle: number;
    endAngle: number;
    type: 'ice' | 'lava' | 'gap';
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
    ballY: 100,
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
      const y = 200 + i * PLATFORM_GAP;
      const segments: Platform['segments'] = [];
      
      const lavaChance = Math.min(0.5, i / NUM_PLATFORMS);
      const gapCount = 1 + Math.floor(Math.random() * 2);
      
      let angle = Math.random() * Math.PI * 2;
      for (let j = 0; j < 4; j++) {
        const segmentSize = (Math.PI * 2) / 4;
        const isGap = j < gapCount && Math.random() < 0.4;
        const isLava = !isGap && Math.random() < lavaChance;
        
        segments.push({
          startAngle: angle,
          endAngle: angle + segmentSize * 0.8,
          type: isGap ? 'gap' : (isLava ? 'lava' : 'ice'),
        });
        angle += segmentSize;
      }
      
      platforms.push({
        y,
        segments,
        rotation: 0,
        speed: (0.5 + Math.random() * 0.5) * (Math.random() < 0.5 ? 1 : -1),
      });
    }
    return platforms;
  }, []);

  const startGame = useCallback(() => {
    initAudio();
    const game = gameRef.current;
    game.running = true;
    game.holding = false;
    game.ballY = 100;
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

      const gravity = game.holding ? 0.8 : 0.15;
      game.ballVY += gravity;
      game.ballVY = Math.min(game.ballVY, game.holding ? 15 : 3);
      game.ballY += game.ballVY;

      const targetCameraY = game.ballY - CANVAS_H / 3;
      game.cameraY += (targetCameraY - game.cameraY) * 0.1;

      game.progress = Math.min(1, game.ballY / (NUM_PLATFORMS * PLATFORM_GAP));

      for (const platform of game.platforms) {
        platform.rotation += platform.speed * 0.02;
      }

      const ballCenterX = CANVAS_W / 2;

      for (const platform of game.platforms) {
        if (game.ballY + game.ballSize > platform.y && 
            game.ballY + game.ballSize < platform.y + PLATFORM_HEIGHT + game.ballVY) {
          
          const platformRadius = 150;
          const distFromCenter = 0;
          
          if (distFromCenter < platformRadius) {
            const angle = (platform.rotation + Math.PI / 2) % (Math.PI * 2);
            
            let hitSegment: Platform['segments'][0] | null = null;
            for (const seg of platform.segments) {
              const segStart = (seg.startAngle + platform.rotation) % (Math.PI * 2);
              const segEnd = (seg.endAngle + platform.rotation) % (Math.PI * 2);
              
              const ballAngle = Math.PI / 2;
              
              const normalizedBall = ((ballAngle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
              const normalizedStart = ((segStart % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
              const normalizedEnd = ((segEnd % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
              
              if (normalizedStart < normalizedEnd) {
                if (normalizedBall >= normalizedStart && normalizedBall <= normalizedEnd) {
                  hitSegment = seg;
                  break;
                }
              } else {
                if (normalizedBall >= normalizedStart || normalizedBall <= normalizedEnd) {
                  hitSegment = seg;
                  break;
                }
              }
            }

            if (hitSegment) {
              if (hitSegment.type === 'gap') {
                // Pass through
              } else if (hitSegment.type === 'ice' && game.holding) {
                playCrunch();
                game.layersPassed++;
                setLayersDescended(game.layersPassed);
                
                for (let i = 0; i < 8; i++) {
                  game.particles.push({
                    x: ballCenterX + (Math.random() - 0.5) * 40,
                    y: game.ballY + game.ballSize,
                    vx: (Math.random() - 0.5) * 8,
                    vy: Math.random() * -3,
                    life: 30,
                    color: THEME.iceParticle,
                  });
                }
                
                hitSegment.type = 'gap';
              } else if (hitSegment.type === 'lava') {
                playSizzle();
                game.ballSize = Math.max(6, game.ballSize - 3);
                game.ballVY = -5;
                
                for (let i = 0; i < 5; i++) {
                  game.particles.push({
                    x: ballCenterX + (Math.random() - 0.5) * 20,
                    y: game.ballY + game.ballSize,
                    vx: (Math.random() - 0.5) * 2,
                    vy: -2 - Math.random() * 2,
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
              } else if (hitSegment.type === 'ice' && !game.holding) {
                game.ballY = platform.y - game.ballSize;
                game.ballVY = 0;
              }
            }
          }
        }
      }

      if (game.ballY > NUM_PLATFORMS * PLATFORM_GAP + 100) {
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

      game.particles = game.particles.filter(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.2;
        p.life--;
        return p.life > 0;
      });

      if (game.holding && Math.random() < 0.02) {
        game.ballSize = Math.max(6, game.ballSize - 0.1);
      }
    };

    const draw = () => {
      const game = gameRef.current;
      
      const r1 = 30, g1 = 58, b1 = 95;
      const r2 = 127, g2 = 29, b2 = 29;
      const r = Math.floor(r1 + (r2 - r1) * game.progress);
      const g = Math.floor(g1 + (g2 - g1) * game.progress);
      const b = Math.floor(b1 + (b2 - b1) * game.progress);
      ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

      for (const platform of game.platforms) {
        const screenY = platform.y - game.cameraY;
        if (screenY < -50 || screenY > CANVAS_H + 50) continue;

        const centerX = CANVAS_W / 2;
        const outerRadius = 150;
        const innerRadius = 30;

        for (const seg of platform.segments) {
          if (seg.type === 'gap') continue;
          
          const startAngle = seg.startAngle + platform.rotation;
          const endAngle = seg.endAngle + platform.rotation;
          
          ctx.beginPath();
          ctx.arc(centerX, screenY, outerRadius, startAngle, endAngle);
          ctx.arc(centerX, screenY, innerRadius, endAngle, startAngle, true);
          ctx.closePath();
          
          if (seg.type === 'ice') {
            ctx.fillStyle = THEME.ice;
          } else {
            ctx.fillStyle = THEME.lava;
            ctx.shadowColor = THEME.lavaGlow;
            ctx.shadowBlur = 15;
          }
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      }

      for (const p of game.particles) {
        const screenY = p.y - game.cameraY;
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.life / 40;
        ctx.beginPath();
        ctx.arc(p.x, screenY, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      const ballScreenY = game.ballY - game.cameraY;
      const ballX = CANVAS_W / 2;
      
      ctx.beginPath();
      ctx.arc(ballX, ballScreenY, game.ballSize, 0, Math.PI * 2);
      ctx.fillStyle = THEME.snowball;
      ctx.shadowColor = THEME.frost;
      ctx.shadowBlur = 10;
      ctx.fill();
      ctx.shadowBlur = 0;
      
      const eyeSpread = game.ballSize * 0.25;
      const eyeY = ballScreenY - game.ballSize * 0.15;
      ctx.fillStyle = '#333';
      ctx.beginPath();
      ctx.arc(ballX - eyeSpread, eyeY, game.ballSize * 0.12, 0, Math.PI * 2);
      ctx.arc(ballX + eyeSpread, eyeY, game.ballSize * 0.12, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = THEME.text;
      ctx.fillRect(CANVAS_W - 20, 50, 10, CANVAS_H - 100);
      ctx.fillStyle = THEME.lava;
      const progressHeight = (CANVAS_H - 100) * game.progress;
      ctx.fillRect(CANVAS_W - 20, 50, 10, progressHeight);
    };

    const gameLoop = () => {
      update();
      draw();
      animationId = requestAnimationFrame(gameLoop);
    };
    animationId = requestAnimationFrame(gameLoop);

    const handleDown = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      if (gameState === 'start') {
        startGame();
      } else {
        gameRef.current.holding = true;
      }
    };

    const handleUp = () => {
      gameRef.current.holding = false;
    };

    canvas.addEventListener('mousedown', handleDown);
    canvas.addEventListener('mouseup', handleUp);
    canvas.addEventListener('mouseleave', handleUp);
    canvas.addEventListener('touchstart', handleDown);
    canvas.addEventListener('touchend', handleUp);

    return () => {
      cancelAnimationFrame(animationId);
      canvas.removeEventListener('mousedown', handleDown);
      canvas.removeEventListener('mouseup', handleUp);
      canvas.removeEventListener('mouseleave', handleUp);
      canvas.removeEventListener('touchstart', handleDown);
      canvas.removeEventListener('touchend', handleUp);
    };
  }, [gameState, startGame]);

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
          <div style={{ textAlign: 'center' }}>
            <h1 style={{ 
              color: THEME.snowball, 
              fontSize: 64, 
              marginBottom: 10,
              textShadow: `0 0 30px ${THEME.frost}`,
            }}>
              MELT
            </h1>
            <p style={{ color: THEME.frost, fontSize: 16, marginBottom: 5 }}>
              You are a snowball.
            </p>
            <p style={{ color: THEME.lava, fontSize: 16, marginBottom: 30 }}>
              You want to reach hell.
            </p>
            <p style={{ color: THEME.text, fontSize: 12, marginBottom: 30 }}>
              HOLD to smash through ice<br/>
              RELEASE to dodge lava
            </p>
            <button
              onClick={startGame}
              style={{
                background: `linear-gradient(${THEME.frost}, ${THEME.ice})`,
                color: THEME.coldBg,
                border: 'none',
                padding: '16px 50px',
                fontSize: 18,
                fontWeight: 600,
                cursor: 'pointer',
                borderRadius: 8,
              }}
            >
              DESCEND
            </button>

            {/* Leaderboard on start */}
            <div style={{ marginTop: 30, width: '100%', maxWidth: 350 }}>
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
              You made it. You&apos;re free.
            </p>
            <p style={{ color: THEME.frost, fontSize: 14, marginBottom: 20 }}>
              Final size: {Math.round(finalSize)}px • Layers: {layersDescended}
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
