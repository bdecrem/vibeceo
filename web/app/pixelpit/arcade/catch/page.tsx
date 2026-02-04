'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';

// Inverted INDIE BITE - starts dark, light kills
const THEME = {
  void: '#000000',
  shadow: '#0a0a0f',
  coin: '#fbbf24',
  coinGlow: '#fde68a',
  player: '#22d3ee',
  playerDim: '#0e4a5c',
  danger: '#ffffff',
  text: '#94a3b8',
};

const GAME_ID = 'catch';
const GAME_DURATION = 60; // seconds

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

function playCoinCollect() {
  if (!audioCtx || !masterGain) return;
  // Deceptively pleasant chime... that's killing you
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(880, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(1760, audioCtx.currentTime + 0.1);
  gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);
  osc.connect(gain);
  gain.connect(masterGain);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.15);
}

function playHeal() {
  if (!audioCtx || !masterGain) return;
  // Soft, safe sound
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sine';
  osc.frequency.value = 220;
  gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
  osc.connect(gain);
  gain.connect(masterGain);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.3);
}

function playDeath() {
  if (!audioCtx || !masterGain) return;
  // Bright, harsh - overexposure
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.value = 2000;
  gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);
  osc.connect(gain);
  gain.connect(masterGain);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.5);
}

function playWin() {
  if (!audioCtx || !masterGain) return;
  // Deep, peaceful resolution
  [110, 165, 220].forEach((freq, i) => {
    setTimeout(() => {
      if (!audioCtx || !masterGain) return;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4);
      osc.connect(gain);
      gain.connect(masterGain);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.4);
    }, i * 150);
  });
}

export default function CatchGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<'start' | 'playing' | 'dead' | 'won'>('start');
  const [displayScore, setDisplayScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [showHint, setShowHint] = useState(false);

  const gameRef = useRef({
    running: false,
    player: { x: 0, y: 0, size: 20 },
    coins: [] as Array<{ x: number; y: number; size: number }>,
    shadows: [] as Array<{ x: number; y: number; radius: number }>,
    health: 100,        // Start healthy (glowing)
    brightness: 0,      // Light pollution from coins
    score: 0,           // Fake score - collecting coins
    coinsCollected: 0,
    startTime: 0,
    lastHealSound: 0,
  });

  const startGame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    initAudio();

    const game = gameRef.current;
    game.player.x = canvas.width / 2;
    game.player.y = canvas.height - 60;
    game.coins = [];
    game.health = 100;
    game.brightness = 0;
    game.score = 0;
    game.coinsCollected = 0;
    game.startTime = Date.now();
    game.running = true;
    game.lastHealSound = 0;

    // Create shadow safe zones (3 pools)
    game.shadows = [
      { x: canvas.width * 0.2, y: canvas.height * 0.5, radius: 80 },
      { x: canvas.width * 0.8, y: canvas.height * 0.4, radius: 70 },
      { x: canvas.width * 0.5, y: canvas.height * 0.7, radius: 90 },
    ];

    setDisplayScore(0);
    setTimeLeft(GAME_DURATION);
    setShowHint(false);
    setGameState('playing');
  }, []);

  const gameOver = useCallback((won: boolean) => {
    const game = gameRef.current;
    game.running = false;
    if (won) {
      playWin();
      setGameState('won');
    } else {
      playDeath();
      setGameState('dead');
    }

    // Analytics
    fetch('/api/pixelpit/stats', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ game: GAME_ID }),
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    let animationId: number;
    let lastCoinSpawn = 0;

    const update = (timestamp: number) => {
      const game = gameRef.current;
      if (!game.running) return;

      // Time check
      const elapsed = (Date.now() - game.startTime) / 1000;
      const remaining = Math.max(0, GAME_DURATION - elapsed);
      setTimeLeft(Math.ceil(remaining));

      if (remaining <= 0) {
        gameOver(true); // Survived!
        return;
      }

      // Show hint after 5 seconds if health is low
      if (elapsed > 5 && game.health < 50 && !showHint) {
        setShowHint(true);
      }

      // Spawn coins (more frequent over time)
      const spawnRate = Math.max(300, 800 - elapsed * 10);
      if (timestamp - lastCoinSpawn > spawnRate) {
        game.coins.push({
          x: Math.random() * (canvas.width - 40) + 20,
          y: -20,
          size: 15 + Math.random() * 10,
        });
        lastCoinSpawn = timestamp;
      }

      // Update coins
      for (let i = game.coins.length - 1; i >= 0; i--) {
        game.coins[i].y += 2 + elapsed * 0.05; // Speed up over time

        // Remove if off screen
        if (game.coins[i].y > canvas.height + 30) {
          game.coins.splice(i, 1);
          continue;
        }

        // Collision with player
        const coin = game.coins[i];
        const dx = coin.x - game.player.x;
        const dy = coin.y - game.player.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < coin.size + game.player.size) {
          game.coins.splice(i, 1);
          game.score += 10;
          game.coinsCollected++;
          game.brightness = Math.min(1, game.brightness + 0.15);
          game.health -= 15; // COINS HURT
          setDisplayScore(game.score);
          playCoinCollect();

          if (game.health <= 0) {
            gameOver(false);
            return;
          }
        }
      }

      // Check if in shadow (healing)
      let inShadow = false;
      for (const shadow of game.shadows) {
        const dx = game.player.x - shadow.x;
        const dy = game.player.y - shadow.y;
        if (Math.sqrt(dx * dx + dy * dy) < shadow.radius) {
          inShadow = true;
          break;
        }
      }

      if (inShadow) {
        game.health = Math.min(100, game.health + 0.5);
        game.brightness = Math.max(0, game.brightness - 0.01);
        // Occasional heal sound
        if (timestamp - game.lastHealSound > 2000) {
          playHeal();
          game.lastHealSound = timestamp;
        }
      } else {
        // Slow brightness decay even outside shadows
        game.brightness = Math.max(0, game.brightness - 0.002);
      }
    };

    const draw = () => {
      const game = gameRef.current;

      // Background - darker when healthy, painful white when dying
      const bgBrightness = Math.floor(game.brightness * 200);
      ctx.fillStyle = `rgb(${bgBrightness}, ${bgBrightness}, ${bgBrightness})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Shadow safe zones
      for (const shadow of game.shadows) {
        const gradient = ctx.createRadialGradient(
          shadow.x, shadow.y, 0,
          shadow.x, shadow.y, shadow.radius
        );
        gradient.addColorStop(0, 'rgba(0, 0, 0, 0.9)');
        gradient.addColorStop(0.7, 'rgba(0, 0, 0, 0.5)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(shadow.x, shadow.y, shadow.radius, 0, Math.PI * 2);
        ctx.fill();
      }

      // Coins - golden and inviting (the trap)
      for (const coin of game.coins) {
        ctx.save();
        ctx.shadowColor = THEME.coinGlow;
        ctx.shadowBlur = 15 + Math.sin(Date.now() / 100) * 5;
        ctx.fillStyle = THEME.coin;
        ctx.beginPath();
        ctx.arc(coin.x, coin.y, coin.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Player - glowing when DYING, dim when healthy (inverted!)
      const playerGlow = game.health / 100; // More health = dimmer (safer)
      ctx.save();
      ctx.shadowColor = THEME.player;
      ctx.shadowBlur = (1 - playerGlow) * 30; // Glow when unhealthy
      
      // Interpolate between dim (healthy) and bright (dying)
      const r = Math.floor(14 + (34 - 14) * (1 - playerGlow));
      const g = Math.floor(74 + (211 - 74) * (1 - playerGlow));
      const b = Math.floor(92 + (238 - 92) * (1 - playerGlow));
      ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
      
      ctx.beginPath();
      ctx.arc(game.player.x, game.player.y, game.player.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };

    const gameLoop = (timestamp: number) => {
      update(timestamp);
      draw();
      animationId = requestAnimationFrame(gameLoop);
    };
    animationId = requestAnimationFrame(gameLoop);

    // Input - mouse/touch to move player
    const handleMove = (clientX: number) => {
      const game = gameRef.current;
      if (game.running) {
        game.player.x = Math.max(20, Math.min(canvas.width - 20, clientX));
      }
    };

    const handleMouseMove = (e: MouseEvent) => handleMove(e.clientX);
    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      if (e.touches[0]) handleMove(e.touches[0].clientX);
    };
    const handleClick = () => {
      if (gameState === 'start' || gameState === 'dead' || gameState === 'won') {
        startGame();
      }
    };

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('click', handleClick);
    canvas.addEventListener('touchstart', handleClick);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('touchmove', handleTouchMove);
      canvas.removeEventListener('click', handleClick);
      canvas.removeEventListener('touchstart', handleClick);
    };
  }, [gameState, gameOver, startGame, showHint]);

  return (
    <>
      <style jsx global>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          background: #000;
          overflow: hidden;
          touch-action: none;
          user-select: none;
        }
      `}</style>

      <canvas
        ref={canvasRef}
        style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh' }}
      />

      {/* HUD during play */}
      {gameState === 'playing' && (
        <>
          {/* Fake score (the lie) */}
          <div style={{
            position: 'fixed',
            top: 20,
            left: 20,
            fontFamily: 'ui-monospace, monospace',
            fontSize: 24,
            color: THEME.coin,
            textShadow: `0 0 10px ${THEME.coin}`,
          }}>
            SCORE: {displayScore}
          </div>

          {/* Time remaining */}
          <div style={{
            position: 'fixed',
            top: 20,
            right: 20,
            fontFamily: 'ui-monospace, monospace',
            fontSize: 24,
            color: THEME.text,
          }}>
            {timeLeft}s
          </div>

          {/* Hint after player struggles */}
          {showHint && (
            <div style={{
              position: 'fixed',
              bottom: 40,
              left: 0,
              right: 0,
              textAlign: 'center',
              fontFamily: 'ui-monospace, monospace',
              fontSize: 14,
              color: 'rgba(255,255,255,0.3)',
              animation: 'fadeIn 1s ease-in',
            }}>
              the shadows feel... safe?
            </div>
          )}
        </>
      )}

      {/* Start screen */}
      {gameState === 'start' && (
        <div style={{
          position: 'fixed',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(0,0,0,0.9)',
        }}>
          <h1 style={{
            fontFamily: 'ui-monospace, monospace',
            fontSize: 64,
            color: THEME.coin,
            textShadow: `0 0 30px ${THEME.coin}`,
            marginBottom: 20,
          }}>
            CATCH
          </h1>
          <p style={{
            fontFamily: 'ui-monospace, monospace',
            fontSize: 16,
            color: THEME.text,
            marginBottom: 40,
            textAlign: 'center',
          }}>
            collect the coins<br />
            survive 60 seconds
          </p>
          <button
            onClick={startGame}
            style={{
              background: THEME.coin,
              color: '#000',
              border: 'none',
              padding: '16px 50px',
              fontSize: 18,
              fontFamily: 'ui-monospace, monospace',
              fontWeight: 600,
              cursor: 'pointer',
              borderRadius: 4,
            }}
          >
            play
          </button>
        </div>
      )}

      {/* Death screen - the realization */}
      {gameState === 'dead' && (
        <div style={{
          position: 'fixed',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#fff',
        }}>
          <h1 style={{
            fontFamily: 'ui-monospace, monospace',
            fontSize: 48,
            color: '#000',
            marginBottom: 20,
          }}>
            TOO BRIGHT
          </h1>
          <p style={{
            fontFamily: 'ui-monospace, monospace',
            fontSize: 18,
            color: '#666',
            marginBottom: 10,
          }}>
            you collected {gameRef.current.coinsCollected} coins
          </p>
          <p style={{
            fontFamily: 'ui-monospace, monospace',
            fontSize: 14,
            color: '#999',
            marginBottom: 40,
            fontStyle: 'italic',
          }}>
            ...maybe that was the problem?
          </p>
          <button
            onClick={startGame}
            style={{
              background: '#000',
              color: '#fff',
              border: 'none',
              padding: '16px 50px',
              fontSize: 18,
              fontFamily: 'ui-monospace, monospace',
              cursor: 'pointer',
              borderRadius: 4,
            }}
          >
            try again
          </button>
        </div>
      )}

      {/* Win screen - embraced the darkness */}
      {gameState === 'won' && (
        <div style={{
          position: 'fixed',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#000',
        }}>
          <h1 style={{
            fontFamily: 'ui-monospace, monospace',
            fontSize: 48,
            color: THEME.player,
            textShadow: `0 0 30px ${THEME.player}`,
            marginBottom: 20,
          }}>
            SURVIVED
          </h1>
          <p style={{
            fontFamily: 'ui-monospace, monospace',
            fontSize: 18,
            color: THEME.text,
            marginBottom: 10,
          }}>
            you learned the truth
          </p>
          <p style={{
            fontFamily: 'ui-monospace, monospace',
            fontSize: 14,
            color: '#666',
            marginBottom: 40,
          }}>
            coins collected: {gameRef.current.coinsCollected} (oops)
          </p>
          <button
            onClick={startGame}
            style={{
              background: THEME.player,
              color: '#000',
              border: 'none',
              padding: '16px 50px',
              fontSize: 18,
              fontFamily: 'ui-monospace, monospace',
              cursor: 'pointer',
              borderRadius: 4,
            }}
          >
            play again
          </button>
        </div>
      )}
    </>
  );
}
