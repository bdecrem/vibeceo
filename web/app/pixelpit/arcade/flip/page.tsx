'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';

// INDIE BITE theme
const THEME = {
  bg: '#09090b',
  tunnel: '#27272a',
  player: '#f8fafc',
  glow: '#22d3ee',
  spike: '#ef4444',
  text: '#ffffff',
};

const GAME_ID = 'flip';

// Audio
let audioCtx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let musicInterval: ReturnType<typeof setInterval> | null = null;
let musicBeat = 0;
let musicLevel = 1;

// E minor: E2 = 82.41 Hz
const E2 = 82.41;
const BPM = 100;
const BEAT_MS = 60000 / BPM;

function initAudio() {
  if (audioCtx) return;
  audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  masterGain = audioCtx.createGain();
  masterGain.gain.value = 0.4;
  masterGain.connect(audioCtx.destination);
  if (audioCtx.state === 'suspended') audioCtx.resume();
}

function playMusicBeat() {
  if (!audioCtx || !masterGain) return;
  const t = audioCtx.currentTime;
  
  // Base drone (always playing)
  const drone = audioCtx.createOscillator();
  const droneGain = audioCtx.createGain();
  drone.type = 'sawtooth';
  drone.frequency.value = E2;
  droneGain.gain.setValueAtTime(0.08, t);
  droneGain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
  drone.connect(droneGain);
  droneGain.connect(masterGain);
  drone.start(t);
  drone.stop(t + 0.5);
  
  // Kick on beats 0 and 2 (1 and 3 in musical terms)
  if (musicBeat % 2 === 0) {
    const kick = audioCtx.createOscillator();
    const kickGain = audioCtx.createGain();
    kick.type = 'sine';
    kick.frequency.setValueAtTime(150, t);
    kick.frequency.exponentialRampToValueAtTime(40, t + 0.1);
    kickGain.gain.setValueAtTime(0.4, t);
    kickGain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    kick.connect(kickGain);
    kickGain.connect(masterGain);
    kick.start(t);
    kick.stop(t + 0.15);
  }
  
  // Hi-hat on every beat (8th notes = every half beat at higher levels)
  const hatRate = musicLevel >= 3 ? 1 : 2;  // Faster hats at level 3+
  if (musicBeat % hatRate === 0) {
    const bufferSize = audioCtx.sampleRate * 0.03;
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 3);
    }
    const hat = audioCtx.createBufferSource();
    hat.buffer = buffer;
    const hatFilter = audioCtx.createBiquadFilter();
    hatFilter.type = 'highpass';
    hatFilter.frequency.value = 7000;
    const hatGain = audioCtx.createGain();
    hatGain.gain.value = 0.1 + musicLevel * 0.02;
    hat.connect(hatFilter);
    hatFilter.connect(hatGain);
    hatGain.connect(masterGain);
    hat.start(t);
  }
  
  // Bass stab at level 4+ (every 4 beats)
  if (musicLevel >= 4 && musicBeat % 4 === 0) {
    const bass = audioCtx.createOscillator();
    const bassGain = audioCtx.createGain();
    bass.type = 'square';
    bass.frequency.value = E2 * 2;
    bassGain.gain.setValueAtTime(0.15, t);
    bassGain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    bass.connect(bassGain);
    bassGain.connect(masterGain);
    bass.start(t);
    bass.stop(t + 0.1);
  }
  
  musicBeat++;
}

function startMusic() {
  if (!audioCtx || musicInterval) return;
  musicBeat = 0;
  playMusicBeat();
  musicInterval = setInterval(playMusicBeat, BEAT_MS / 2);  // 8th notes
}

function stopMusic() {
  if (musicInterval) {
    clearInterval(musicInterval);
    musicInterval = null;
  }
}

function setMusicIntensity(level: number) {
  musicLevel = level;
}

function playLevelUp() {
  if (!audioCtx || !masterGain) return;
  const t = audioCtx.currentTime;
  // Rising arpeggio
  [0, 0.1, 0.2].forEach((delay, i) => {
    const osc = audioCtx!.createOscillator();
    const gain = audioCtx!.createGain();
    osc.type = 'square';
    osc.frequency.value = E2 * Math.pow(2, i + 2);  // E4, E5, E6
    gain.gain.setValueAtTime(0.15, t + delay);
    gain.gain.exponentialRampToValueAtTime(0.001, t + delay + 0.15);
    osc.connect(gain);
    gain.connect(masterGain!);
    osc.start(t + delay);
    osc.stop(t + delay + 0.15);
  });
}

function playFlip() {
  if (!audioCtx || !masterGain) return;
  // White noise burst whoosh
  const bufferSize = audioCtx.sampleRate * 0.05;
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
  }
  const noise = audioCtx.createBufferSource();
  noise.buffer = buffer;
  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.05);
  noise.connect(gain);
  gain.connect(masterGain);
  noise.start();
}

function playDeath() {
  if (!audioCtx || !masterGain) return;
  // Low thud
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(80, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(30, audioCtx.currentTime + 0.2);
  gain.gain.setValueAtTime(0.5, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.2);
  osc.connect(gain);
  gain.connect(masterGain);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.2);
  // Crunch
  setTimeout(() => {
    if (!audioCtx || !masterGain) return;
    const bufferSize = audioCtx.sampleRate * 0.1;
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2);
    }
    const noise = audioCtx.createBufferSource();
    noise.buffer = buffer;
    const g = audioCtx.createGain();
    g.gain.value = 0.2;
    noise.connect(g);
    g.connect(masterGain);
    noise.start();
  }, 50);
}

export default function FlipGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<'start' | 'playing' | 'gameover'>('start');
  const [score, setScore] = useState(0);

  const [musicEnabled, setMusicEnabled] = useState(false);
  
  // Music toggle
  const toggleMusic = useCallback(() => {
    initAudio();
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    if (musicEnabled) {
      stopMusic();
      setMusicEnabled(false);
    } else {
      startMusic();
      setMusicEnabled(true);
    }
  }, [musicEnabled]);
  
  const gameRef = useRef({
    running: false,
    score: 0,
    distance: 0,
    level: 1,
    lastLevelScore: 0,
    levelUpFlash: '',
    player: { x: 0, y: 0, vy: 0, size: 20, scaleX: 1, scaleY: 1 },
    gravity: 0.4,
    maxFallSpeed: 8,
    tunnelTop: 0,
    tunnelBottom: 0,
    spikes: [] as Array<{ x: number; top: boolean; height: number }>,
    spikeGap: 300,
    spikeSize: 30,
    scrollSpeed: 3,
    particles: [] as Array<{ x: number; y: number; vx: number; vy: number; life: number }>,
    trail: [] as Array<{ x: number; y: number; alpha: number }>,
    shake: 0,
    screenFlash: 0,
  });

  const startGame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const game = gameRef.current;
    const tunnelHeight = canvas.height * 0.6;
    game.tunnelTop = (canvas.height - tunnelHeight) / 2;
    game.tunnelBottom = game.tunnelTop + tunnelHeight;
    
    game.player.x = canvas.width * 0.2;
    game.player.y = canvas.height / 2;
    game.player.vy = 0;
    game.player.scaleX = 1;
    game.player.scaleY = 1;
    game.gravity = 0.4;
    game.score = 0;
    game.distance = 0;
    game.level = 1;
    game.lastLevelScore = 0;
    game.levelUpFlash = '';
    game.spikes = [];
    game.particles = [];
    game.trail = [];
    game.shake = 0;
    game.screenFlash = 0;
    game.spikeGap = 300;
    game.spikeSize = 30;
    game.scrollSpeed = 3;
    game.running = true;
    
    setMusicIntensity(1);

    setScore(0);
    setGameState('playing');
  }, []);

  const flip = useCallback(() => {
    initAudio();
    const game = gameRef.current;
    if (gameState === 'start') {
      startGame();
    } else if (gameState === 'playing' && game.running) {
      game.gravity *= -1;
      // Squish on flip
      game.player.scaleX = game.gravity > 0 ? 1.3 : 0.7;
      game.player.scaleY = game.gravity > 0 ? 0.7 : 1.3;
      playFlip();
    } else if (gameState === 'gameover') {
      setGameState('start');
    }
  }, [gameState, startGame]);

  const gameOver = useCallback(() => {
    const game = gameRef.current;
    game.running = false;
    game.shake = 3;
    playDeath();
    
    // Death particles
    for (let i = 0; i < 15; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 4;
      game.particles.push({
        x: game.player.x,
        y: game.player.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
      });
    }

    // Analytics
    if (game.score >= 1) {
      fetch('/api/pixelpit/stats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ game: GAME_ID }),
      }).catch(() => {});
    }

    setScore(game.score);
    setTimeout(() => setGameState('gameover'), 500);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      const game = gameRef.current;
      const tunnelHeight = canvas.height * 0.6;
      game.tunnelTop = (canvas.height - tunnelHeight) / 2;
      game.tunnelBottom = game.tunnelTop + tunnelHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    let animationId: number;

    const update = () => {
      const game = gameRef.current;

      // Update particles
      for (let i = game.particles.length - 1; i >= 0; i--) {
        const p = game.particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.03;
        if (p.life <= 0) game.particles.splice(i, 1);
      }

      // Decay shake
      if (game.shake > 0) game.shake *= 0.9;

      // Update trail
      for (let i = game.trail.length - 1; i >= 0; i--) {
        game.trail[i].alpha -= 0.05;
        game.trail[i].x -= game.scrollSpeed;
        if (game.trail[i].alpha <= 0) game.trail.splice(i, 1);
      }

      if (!game.running) return;

      // Add to trail
      if (game.trail.length === 0 || 
          Math.abs(game.trail[game.trail.length - 1].y - game.player.y) > 5) {
        game.trail.push({ x: game.player.x, y: game.player.y, alpha: 0.6 });
      }

      // Player physics
      game.player.vy += game.gravity;
      game.player.vy = Math.max(-game.maxFallSpeed, Math.min(game.maxFallSpeed, game.player.vy));
      game.player.y += game.player.vy;

      // Squish recovery
      game.player.scaleX += (1 - game.player.scaleX) * 0.15;
      game.player.scaleY += (1 - game.player.scaleY) * 0.15;

      // Distance/score
      game.distance += game.scrollSpeed;
      game.score = Math.floor(game.distance / 10);
      setScore(game.score);

      // Decay level-up flash
      if (game.levelUpFlash && game.screenFlash <= 0) {
        game.levelUpFlash = '';
      }
      if (game.screenFlash > 0) {
        game.screenFlash *= 0.92;
        if (game.screenFlash < 0.01) game.screenFlash = 0;
      }

      // Level up every 200 points (aggressive ramp)
      const newLevel = Math.floor(game.score / 200) + 1;
      if (newLevel > game.level) {
        game.level = newLevel;
        game.levelUpFlash = `LEVEL ${game.level}`;
        game.screenFlash = 0.6;
        game.scrollSpeed = Math.min(3 + (game.level - 1) * 0.2, 8);  // Speed up to max 8
        setMusicIntensity(Math.min(game.level, 5));  // Cap music intensity at 5
        playLevelUp();
        // Clear flash text after a moment
        setTimeout(() => { game.levelUpFlash = ''; }, 800);
      }

      // Difficulty ramp (aggressive)
      game.spikeGap = Math.max(120, 300 - (game.level - 1) * 25);  // Min 120px gap
      game.spikeSize = Math.min(60, 30 + (game.level - 1) * 4);

      // Spawn spikes
      const lastSpike = game.spikes[game.spikes.length - 1];
      if (!lastSpike || lastSpike.x < canvas.width - game.spikeGap) {
        const topHeight = game.spikeSize + Math.random() * 30;
        const bottomHeight = game.spikeSize + Math.random() * 30;
        // Ensure survivable gap
        const tunnelHeight = game.tunnelBottom - game.tunnelTop;
        const minGap = 80;
        if (topHeight + bottomHeight < tunnelHeight - minGap) {
          game.spikes.push({ x: canvas.width + 50, top: true, height: topHeight });
          game.spikes.push({ x: canvas.width + 50, top: false, height: bottomHeight });
        }
      }

      // Update spikes
      for (let i = game.spikes.length - 1; i >= 0; i--) {
        game.spikes[i].x -= game.scrollSpeed;
        if (game.spikes[i].x < -100) game.spikes.splice(i, 1);
      }

      // Collision with tunnel walls
      if (game.player.y - game.player.size / 2 < game.tunnelTop ||
          game.player.y + game.player.size / 2 > game.tunnelBottom) {
        gameOver();
        return;
      }

      // Collision with spikes
      const px = game.player.x;
      const py = game.player.y;
      const ps = game.player.size / 2;
      for (const spike of game.spikes) {
        const spikeLeft = spike.x - 15;
        const spikeRight = spike.x + 15;
        if (px + ps > spikeLeft && px - ps < spikeRight) {
          if (spike.top) {
            const spikeBottom = game.tunnelTop + spike.height;
            if (py - ps < spikeBottom) {
              gameOver();
              return;
            }
          } else {
            const spikeTop = game.tunnelBottom - spike.height;
            if (py + ps > spikeTop) {
              gameOver();
              return;
            }
          }
        }
      }
    };

    const draw = () => {
      const game = gameRef.current;

      // Apply shake
      ctx.save();
      if (game.shake > 0.1) {
        ctx.translate(
          (Math.random() - 0.5) * game.shake * 2,
          (Math.random() - 0.5) * game.shake * 2
        );
      }

      // Background
      ctx.fillStyle = THEME.bg;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Tunnel walls
      ctx.strokeStyle = THEME.tunnel;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, game.tunnelTop);
      ctx.lineTo(canvas.width, game.tunnelTop);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, game.tunnelBottom);
      ctx.lineTo(canvas.width, game.tunnelBottom);
      ctx.stroke();

      // Spikes
      ctx.fillStyle = THEME.spike;
      for (const spike of game.spikes) {
        ctx.beginPath();
        if (spike.top) {
          ctx.moveTo(spike.x - 15, game.tunnelTop);
          ctx.lineTo(spike.x, game.tunnelTop + spike.height);
          ctx.lineTo(spike.x + 15, game.tunnelTop);
        } else {
          ctx.moveTo(spike.x - 15, game.tunnelBottom);
          ctx.lineTo(spike.x, game.tunnelBottom - spike.height);
          ctx.lineTo(spike.x + 15, game.tunnelBottom);
        }
        ctx.fill();
      }

      // Trail
      for (const t of game.trail) {
        ctx.globalAlpha = t.alpha * 0.5;
        ctx.fillStyle = THEME.glow;
        ctx.fillRect(t.x - 5, t.y - 5, 10, 10);
      }
      ctx.globalAlpha = 1;

      // Player
      ctx.save();
      ctx.translate(game.player.x, game.player.y);
      ctx.scale(game.player.scaleX, game.player.scaleY);
      
      // Glow
      ctx.shadowColor = THEME.glow;
      ctx.shadowBlur = 15;
      ctx.fillStyle = THEME.player;
      ctx.fillRect(-game.player.size / 2, -game.player.size / 2, game.player.size, game.player.size);
      ctx.shadowBlur = 0;
      ctx.restore();

      // Particles
      for (const p of game.particles) {
        ctx.globalAlpha = p.life;
        ctx.fillStyle = THEME.player;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3 + p.life * 3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      
      // Screen flash (cyan for level up)
      if (game.screenFlash > 0) {
        ctx.fillStyle = `rgba(34, 211, 238, ${game.screenFlash * 0.4})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      
      // Level up text
      if (game.levelUpFlash) {
        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = 'bold 48px ui-monospace, monospace';
        ctx.fillStyle = THEME.glow;
        ctx.shadowColor = THEME.glow;
        ctx.shadowBlur = 20;
        ctx.fillText(game.levelUpFlash, canvas.width / 2, canvas.height / 2);
        ctx.restore();
      }

      ctx.restore(); // Shake
    };

    const gameLoop = () => {
      update();
      draw();
      animationId = requestAnimationFrame(gameLoop);
    };
    gameLoop();

    // Input
    const handleTouch = (e: TouchEvent) => { e.preventDefault(); flip(); };
    const handleMouse = () => flip();
    const handleKey = (e: KeyboardEvent) => { if (e.code === 'Space') { e.preventDefault(); flip(); } };

    canvas.addEventListener('touchstart', handleTouch);
    canvas.addEventListener('mousedown', handleMouse);
    document.addEventListener('keydown', handleKey);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('touchstart', handleTouch);
      canvas.removeEventListener('mousedown', handleMouse);
      document.removeEventListener('keydown', handleKey);
    };
  }, [flip, gameOver]);
  
  // Stop music on unmount only
  useEffect(() => {
    return () => { stopMusic(); };
  }, []);

  return (
    <>
      <style jsx global>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          background: ${THEME.bg};
          overflow: hidden;
          touch-action: none;
          user-select: none;
        }
      `}</style>

      <canvas
        ref={canvasRef}
        style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh' }}
      />

      {/* Score */}
      {gameState === 'playing' && (
        <div style={{
          position: 'fixed',
          top: 'max(40px, env(safe-area-inset-top, 40px))',
          left: 0,
          right: 0,
          textAlign: 'center',
          zIndex: 10,
          pointerEvents: 'none',
        }}>
          <div style={{
            fontFamily: 'ui-monospace, monospace',
            fontSize: 48,
            fontWeight: 700,
            color: THEME.text,
            textShadow: `0 0 20px ${THEME.glow}`,
          }}>
            {score}
          </div>
        </div>
      )}

      {/* Music toggle */}
      {(gameState === 'playing' || gameState === 'start') && (
        <button
          onClick={(e) => { e.stopPropagation(); toggleMusic(); }}
          style={{
            position: 'fixed',
            top: 'max(20px, env(safe-area-inset-top, 20px))',
            right: 20,
            zIndex: 200,
            background: musicEnabled ? THEME.glow : 'rgba(255,255,255,0.1)',
            color: musicEnabled ? THEME.bg : THEME.text,
            border: 'none',
            borderRadius: 4,
            padding: '10px 14px',
            fontSize: 20,
            cursor: 'pointer',
          }}
          aria-label={musicEnabled ? 'Mute music' : 'Play music'}
        >
          {musicEnabled ? '🎵' : '🔇'}
        </button>
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
          background: 'rgba(0,0,0,0.8)',
          zIndex: 100,
        }}>
          <h1 style={{
            fontFamily: 'ui-monospace, monospace',
            fontSize: 72,
            fontWeight: 700,
            color: THEME.glow,
            marginBottom: 20,
            textShadow: `0 0 40px ${THEME.glow}`,
          }}>
            FLIP
          </h1>
          <p style={{
            fontFamily: 'ui-monospace, monospace',
            fontSize: 16,
            color: THEME.text,
            opacity: 0.7,
            marginBottom: 40,
          }}>
            tap to flip gravity<br />
            avoid the spikes
          </p>
          <button
            onClick={startGame}
            style={{
              background: THEME.glow,
              color: THEME.bg,
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

      {/* Game over */}
      {gameState === 'gameover' && (
        <div style={{
          position: 'fixed',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: THEME.bg,
          zIndex: 100,
        }}>
          <p style={{
            fontFamily: 'ui-monospace, monospace',
            fontSize: 24,
            color: THEME.spike,
            marginBottom: 20,
          }}>
            game over
          </p>
          <div style={{
            fontFamily: 'ui-monospace, monospace',
            fontSize: 72,
            fontWeight: 200,
            color: THEME.glow,
            marginBottom: 40,
            textShadow: `0 0 30px ${THEME.glow}`,
          }}>
            {score}
          </div>
          <button
            onClick={startGame}
            style={{
              background: THEME.glow,
              color: THEME.bg,
              border: 'none',
              padding: '16px 50px',
              fontSize: 18,
              fontFamily: 'ui-monospace, monospace',
              fontWeight: 600,
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
