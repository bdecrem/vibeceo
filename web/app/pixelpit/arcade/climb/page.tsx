'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';

const GAME_ID = 'climb';

// Zone configs
const ZONES = [
  { name: 'BASE CAMP', startLedge: 0, skyTop: '#87CEEB', skyBottom: '#E0F4FF', hazards: ['rock'], speed: 1 },
  { name: 'TREE LINE', startLedge: 25, skyTop: '#6BB3D9', skyBottom: '#B8E0F0', hazards: ['rock', 'eagle'], speed: 1.2 },
  { name: 'SNOW FIELD', startLedge: 50, skyTop: '#4A90A4', skyBottom: '#A8D4E6', hazards: ['rock', 'eagle', 'ice'], speed: 1.4, wind: true },
  { name: 'ICE SHELF', startLedge: 75, skyTop: '#2C5F7C', skyBottom: '#7AB8D4', hazards: ['rock', 'eagle', 'ice'], speed: 1.6, fog: true },
  { name: 'SUMMIT', startLedge: 100, skyTop: '#1A3A4A', skyBottom: '#4A8BA8', hazards: ['rock', 'eagle', 'ice'], speed: 2 },
];

const LEDGE_HEIGHT = 60;
const LEDGE_WIDTH_MIN = 80;
const LEDGE_WIDTH_MAX = 140;
const PLAYER_SIZE = 30;
const CRUMBLE_WARNING = 2000; // ms
const CRUMBLE_CRITICAL = 2500; // ms
const CRUMBLE_DEATH = 3500; // ms

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

function playHop() {
  if (!audioCtx || !masterGain) return;
  // Stone clack + grunt
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'triangle';
  osc.frequency.value = 150;
  gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.1);
  osc.connect(gain);
  gain.connect(masterGain);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.1);
}

function playLand() {
  if (!audioCtx || !masterGain) return;
  // Thud + pebbles
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sine';
  osc.frequency.value = 80;
  gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);
  osc.connect(gain);
  gain.connect(masterGain);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.15);
}

function playCrumble() {
  if (!audioCtx || !masterGain) return;
  const bufferSize = audioCtx.sampleRate * 0.2;
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize) * 0.3;
  }
  const noise = audioCtx.createBufferSource();
  noise.buffer = buffer;
  const filter = audioCtx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 800;
  noise.connect(filter);
  filter.connect(masterGain);
  noise.start();
}

function playDeath() {
  if (!audioCtx || !masterGain) return;
  // Scream + impact
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(400, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.5);
  gain.gain.setValueAtTime(0.25, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);
  osc.connect(gain);
  gain.connect(masterGain);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.5);
}

function playEagleScreech() {
  if (!audioCtx || !masterGain) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(800, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.15);
  gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.2);
  osc.connect(gain);
  gain.connect(masterGain);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.2);
}

interface Ledge {
  y: number;
  x: number;
  width: number;
  crumbleStart: number | null;
  crumbled: boolean;
}

interface Hazard {
  type: 'rock' | 'eagle' | 'ice';
  x: number;
  y: number;
  vx: number;
  shadowX?: number;
  screeched?: boolean;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
}

export default function ClimbGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<'start' | 'playing' | 'dead'>('start');
  const [score, setScore] = useState(0);
  const [canvasSize, setCanvasSize] = useState({ w: 400, h: 700 });

  const gameRef = useRef({
    running: false,
    playerX: 0,
    playerY: 0,
    playerLedge: 0,
    isHopping: false,
    hopProgress: 0,
    hopStartX: 0,
    hopStartY: 0,
    hopTargetX: 0,
    hopTargetY: 0,
    ledges: [] as Ledge[],
    hazards: [] as Hazard[],
    particles: [] as Particle[],
    cameraY: 0,
    score: 0,
    zone: 0,
    zoneBanner: '',
    zoneBannerTime: 0,
    windDirection: 0,
    windActive: false,
  });

  const getZone = (ledge: number) => {
    for (let i = ZONES.length - 1; i >= 0; i--) {
      if (ledge >= ZONES[i].startLedge) return i;
    }
    return 0;
  };

  const generateLedges = useCallback((startLedge: number, count: number, canvasW: number) => {
    const ledges: Ledge[] = [];
    for (let i = 0; i < count; i++) {
      const ledgeNum = startLedge + i;
      const width = LEDGE_WIDTH_MIN + Math.random() * (LEDGE_WIDTH_MAX - LEDGE_WIDTH_MIN);
      const x = Math.random() * (canvasW - width);
      ledges.push({
        y: -ledgeNum * LEDGE_HEIGHT,
        x,
        width,
        crumbleStart: null,
        crumbled: false,
      });
    }
    return ledges;
  }, []);

  const startGame = useCallback(() => {
    initAudio();
    const game = gameRef.current;
    game.running = true;
    game.playerLedge = 0;
    game.isHopping = false;
    game.hopProgress = 0;
    game.score = 0;
    game.zone = 0;
    game.zoneBanner = '';
    game.zoneBannerTime = 0;
    game.windDirection = 0;
    game.windActive = false;
    
    // Generate initial ledges
    game.ledges = generateLedges(0, 30, canvasSize.w);
    game.hazards = [];
    game.particles = [];
    
    // Position player on first ledge
    const firstLedge = game.ledges[0];
    game.playerX = firstLedge.x + firstLedge.width / 2;
    game.playerY = firstLedge.y - PLAYER_SIZE;
    game.cameraY = game.playerY + canvasSize.h * 0.7;
    
    setScore(0);
    setGameState('playing');
  }, [generateLedges, canvasSize]);

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
    let lastTime = 0;
    let hazardSpawnTimer = 0;

    const spawnHazard = (game: typeof gameRef.current) => {
      const zone = ZONES[game.zone];
      const hazardTypes = zone.hazards;
      const type = hazardTypes[Math.floor(Math.random() * hazardTypes.length)] as 'rock' | 'eagle' | 'ice';
      
      const fromLeft = Math.random() < 0.5;
      const targetLedge = game.playerLedge + Math.floor(Math.random() * 5) + 1;
      const ledge = game.ledges.find(l => Math.abs(l.y - (-targetLedge * LEDGE_HEIGHT)) < 5);
      if (!ledge) return;
      
      const baseSpeed = 2 + zone.speed;
      let speed = baseSpeed;
      if (type === 'eagle') speed = baseSpeed * 1.5;
      if (type === 'ice') speed = baseSpeed * 0.8;
      
      const hazard: Hazard = {
        type,
        x: fromLeft ? -50 : canvasSize.w + 50,
        y: ledge.y - PLAYER_SIZE / 2,
        vx: fromLeft ? speed : -speed,
      };
      
      // Rock shadow appears first
      if (type === 'rock') {
        hazard.shadowX = fromLeft ? -80 : canvasSize.w + 80;
      }
      
      game.hazards.push(hazard);
      
      // Eagle screech
      if (type === 'eagle') {
        setTimeout(() => playEagleScreech(), 0);
      }
    };

    const update = (timestamp: number) => {
      const dt = Math.min((timestamp - lastTime) / 1000, 0.05);
      lastTime = timestamp;
      
      const game = gameRef.current;
      if (!game.running) return;

      const now = Date.now();
      
      // Spawn hazards
      hazardSpawnTimer += dt;
      const spawnInterval = 1.5 / ZONES[game.zone].speed;
      if (hazardSpawnTimer > spawnInterval) {
        hazardSpawnTimer = 0;
        spawnHazard(game);
      }

      // Update hop animation
      if (game.isHopping) {
        game.hopProgress += dt * 4; // ~250ms hop
        
        if (game.hopProgress >= 1) {
          // Landing
          game.isHopping = false;
          game.hopProgress = 0;
          game.playerX = game.hopTargetX;
          game.playerY = game.hopTargetY;
          game.playerLedge++;
          game.score = game.playerLedge;
          setScore(game.score);
          playLand();
          
          // Start crumble timer on current ledge
          const currentLedge = game.ledges.find(l => Math.abs(l.y - (-game.playerLedge * LEDGE_HEIGHT)) < 5);
          if (currentLedge) {
            currentLedge.crumbleStart = now;
          }
          
          // Check zone transition
          const newZone = getZone(game.playerLedge);
          if (newZone !== game.zone) {
            game.zone = newZone;
            game.zoneBanner = ZONES[newZone].name;
            game.zoneBannerTime = now;
          }
          
          // Spawn particles
          for (let i = 0; i < 5; i++) {
            game.particles.push({
              x: game.playerX + (Math.random() - 0.5) * 20,
              y: game.playerY + PLAYER_SIZE,
              vx: (Math.random() - 0.5) * 2,
              vy: Math.random() * -2,
              life: 20,
              color: '#8B7355',
            });
          }
          
          // Generate more ledges if needed
          const highestLedge = Math.max(...game.ledges.map(l => -l.y / LEDGE_HEIGHT));
          if (game.playerLedge > highestLedge - 20) {
            const newLedges = generateLedges(Math.floor(highestLedge) + 1, 10, canvasSize.w);
            game.ledges.push(...newLedges);
          }
        } else {
          // Interpolate position with arc
          const t = game.hopProgress;
          const arcHeight = LEDGE_HEIGHT * 0.8;
          game.playerX = game.hopStartX + (game.hopTargetX - game.hopStartX) * t;
          game.playerY = game.hopStartY + (game.hopTargetY - game.hopStartY) * t - Math.sin(t * Math.PI) * arcHeight;
          
          // Wind push mid-hop
          if (game.windActive && ZONES[game.zone].wind) {
            game.playerX += game.windDirection * dt * 50;
          }
        }
      }

      // Check crumble on current ledge
      if (!game.isHopping) {
        const currentLedge = game.ledges.find(l => Math.abs(l.y - (-game.playerLedge * LEDGE_HEIGHT)) < 5);
        if (currentLedge && currentLedge.crumbleStart) {
          const elapsed = now - currentLedge.crumbleStart;
          
          if (elapsed > CRUMBLE_CRITICAL && elapsed % 200 < 100) {
            // Shake
          }
          
          if (elapsed > CRUMBLE_DEATH && !currentLedge.crumbled) {
            currentLedge.crumbled = true;
            // Death by crumble
            game.running = false;
            playDeath();
            setGameState('dead');
            fetch('/api/pixelpit/stats', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ game: GAME_ID }),
            }).catch(() => {});
            return;
          }
          
          if (elapsed > CRUMBLE_WARNING) {
            playCrumble();
          }
        }
      }

      // Update hazards
      for (let i = game.hazards.length - 1; i >= 0; i--) {
        const h = game.hazards[i];
        
        // Shadow moves ahead of rock
        if (h.type === 'rock' && h.shadowX !== undefined) {
          h.shadowX += h.vx * 1.2;
        }
        
        h.x += h.vx;
        
        // Remove if off screen
        if (h.x < -100 || h.x > canvasSize.w + 100) {
          game.hazards.splice(i, 1);
          continue;
        }
        
        // Collision with player
        const playerScreenY = game.playerY;
        if (Math.abs(h.y - playerScreenY) < PLAYER_SIZE &&
            Math.abs(h.x - game.playerX) < PLAYER_SIZE) {
          // Death!
          game.running = false;
          playDeath();
          setGameState('dead');
          fetch('/api/pixelpit/stats', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ game: GAME_ID }),
          }).catch(() => {});
          return;
        }
      }

      // Update particles
      game.particles = game.particles.filter(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.2;
        p.life--;
        return p.life > 0;
      });

      // Wind gusts
      if (ZONES[game.zone].wind && Math.random() < 0.002) {
        game.windActive = true;
        game.windDirection = Math.random() < 0.5 ? -1 : 1;
        setTimeout(() => {
          game.windActive = false;
        }, 1000);
      }

      // Camera follows player (70% above, 30% below)
      const targetCameraY = game.playerY + canvasSize.h * 0.7;
      game.cameraY += (targetCameraY - game.cameraY) * 0.1;

      // Remove old ledges
      game.ledges = game.ledges.filter(l => l.y < game.cameraY + 200);
    };

    const draw = () => {
      const game = gameRef.current;
      const zone = ZONES[game.zone];
      
      // Sky gradient
      const gradient = ctx.createLinearGradient(0, 0, 0, canvasSize.h);
      gradient.addColorStop(0, zone.skyTop);
      gradient.addColorStop(1, zone.skyBottom);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvasSize.w, canvasSize.h);

      // Fog effect for Ice Shelf
      if (zone.fog && Math.random() < 0.3) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.fillRect(0, 0, canvasSize.w, canvasSize.h);
      }

      // Draw ledges
      for (const ledge of game.ledges) {
        const screenY = game.cameraY - ledge.y;
        if (screenY < -50 || screenY > canvasSize.h + 50) continue;

        const isCurrentLedge = Math.abs(ledge.y - (-game.playerLedge * LEDGE_HEIGHT)) < 5;
        
        // Crumble effects
        let shake = 0;
        let alpha = 1;
        if (ledge.crumbleStart) {
          const elapsed = Date.now() - ledge.crumbleStart;
          if (elapsed > CRUMBLE_CRITICAL) {
            shake = (Math.random() - 0.5) * 4;
            alpha = 0.7 + Math.sin(elapsed / 100) * 0.3;
          } else if (elapsed > CRUMBLE_WARNING) {
            // Cracks appear
          }
        }

        // Current ledge glow
        if (isCurrentLedge && !game.isHopping) {
          ctx.shadowColor = '#FFD700';
          ctx.shadowBlur = 10;
        }

        ctx.globalAlpha = alpha;
        ctx.fillStyle = ledge.crumbled ? '#555' : '#8B7355';
        ctx.beginPath();
        ctx.roundRect(ledge.x + shake, screenY, ledge.width, 15, 4);
        ctx.fill();
        
        // Ledge detail
        ctx.fillStyle = '#6B5344';
        ctx.fillRect(ledge.x + shake + 5, screenY + 10, ledge.width - 10, 5);
        
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;

        // Crumble cracks
        if (ledge.crumbleStart && Date.now() - ledge.crumbleStart > CRUMBLE_WARNING) {
          ctx.strokeStyle = '#333';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(ledge.x + ledge.width * 0.3, screenY);
          ctx.lineTo(ledge.x + ledge.width * 0.4, screenY + 15);
          ctx.moveTo(ledge.x + ledge.width * 0.7, screenY);
          ctx.lineTo(ledge.x + ledge.width * 0.6, screenY + 15);
          ctx.stroke();
        }
      }

      // Draw hazard shadows (for rocks)
      for (const h of game.hazards) {
        if (h.type === 'rock' && h.shadowX !== undefined) {
          const screenY = game.cameraY - h.y;
          ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
          ctx.beginPath();
          ctx.ellipse(h.shadowX, screenY + 20, 20, 8, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Draw hazards
      for (const h of game.hazards) {
        const screenY = game.cameraY - h.y;
        
        if (h.type === 'rock') {
          ctx.fillStyle = '#666';
          ctx.beginPath();
          ctx.arc(h.x, screenY, 18, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#555';
          ctx.beginPath();
          ctx.arc(h.x - 5, screenY - 5, 6, 0, Math.PI * 2);
          ctx.fill();
        } else if (h.type === 'eagle') {
          ctx.fillStyle = '#4A3728';
          // Body
          ctx.beginPath();
          ctx.ellipse(h.x, screenY, 25, 12, 0, 0, Math.PI * 2);
          ctx.fill();
          // Wings
          const wingFlap = Math.sin(Date.now() / 50) * 10;
          ctx.beginPath();
          ctx.moveTo(h.x - 10, screenY);
          ctx.lineTo(h.x - 35, screenY - 15 + wingFlap);
          ctx.lineTo(h.x - 20, screenY);
          ctx.fill();
          ctx.beginPath();
          ctx.moveTo(h.x + 10, screenY);
          ctx.lineTo(h.x + 35, screenY - 15 + wingFlap);
          ctx.lineTo(h.x + 20, screenY);
          ctx.fill();
          // Beak
          ctx.fillStyle = '#FFD700';
          ctx.beginPath();
          ctx.moveTo(h.x + (h.vx > 0 ? 25 : -25), screenY);
          ctx.lineTo(h.x + (h.vx > 0 ? 35 : -35), screenY + 3);
          ctx.lineTo(h.x + (h.vx > 0 ? 25 : -25), screenY + 6);
          ctx.fill();
        } else if (h.type === 'ice') {
          ctx.fillStyle = '#ADD8E6';
          ctx.shadowColor = '#87CEEB';
          ctx.shadowBlur = 8;
          ctx.beginPath();
          ctx.moveTo(h.x, screenY - 15);
          ctx.lineTo(h.x + 15, screenY);
          ctx.lineTo(h.x + 10, screenY + 15);
          ctx.lineTo(h.x - 10, screenY + 15);
          ctx.lineTo(h.x - 15, screenY);
          ctx.closePath();
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      }

      // Draw particles
      for (const p of game.particles) {
        const screenY = game.cameraY - p.y;
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.life / 20;
        ctx.beginPath();
        ctx.arc(p.x, screenY, 3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // Draw player
      const playerScreenY = game.cameraY - game.playerY;
      
      // Body
      ctx.fillStyle = '#E74C3C'; // Red jacket
      ctx.beginPath();
      ctx.arc(game.playerX, playerScreenY, PLAYER_SIZE / 2, 0, Math.PI * 2);
      ctx.fill();
      
      // Backpack
      ctx.fillStyle = '#8B4513';
      ctx.beginPath();
      ctx.arc(game.playerX - 8, playerScreenY + 5, 8, 0, Math.PI * 2);
      ctx.fill();
      
      // Head
      ctx.fillStyle = '#FDBF6F';
      ctx.beginPath();
      ctx.arc(game.playerX, playerScreenY - PLAYER_SIZE / 2 + 5, 10, 0, Math.PI * 2);
      ctx.fill();
      
      // Eyes
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.arc(game.playerX - 3, playerScreenY - PLAYER_SIZE / 2 + 3, 2, 0, Math.PI * 2);
      ctx.arc(game.playerX + 3, playerScreenY - PLAYER_SIZE / 2 + 3, 2, 0, Math.PI * 2);
      ctx.fill();
      
      // Scarf
      ctx.fillStyle = '#3498DB';
      ctx.fillRect(game.playerX - 5, playerScreenY - PLAYER_SIZE / 2 + 12, 10, 5);
      // Scarf tail (shows wind)
      if (game.windActive) {
        ctx.fillRect(game.playerX + (game.windDirection > 0 ? 5 : -15), playerScreenY - PLAYER_SIZE / 2 + 12, 10, 3);
      }

      // Wind indicator
      if (game.windActive) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.font = '20px ui-monospace';
        ctx.textAlign = 'center';
        ctx.fillText(game.windDirection > 0 ? '→ WIND →' : '← WIND ←', canvasSize.w / 2, 80);
      }

      // Zone banner
      if (game.zoneBanner && Date.now() - game.zoneBannerTime < 2000) {
        const bannerAlpha = Math.min(1, (2000 - (Date.now() - game.zoneBannerTime)) / 500);
        ctx.globalAlpha = bannerAlpha;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, canvasSize.h / 2 - 40, canvasSize.w, 80);
        ctx.fillStyle = '#FFF';
        ctx.font = 'bold 32px ui-monospace';
        ctx.textAlign = 'center';
        ctx.fillText(game.zoneBanner, canvasSize.w / 2, canvasSize.h / 2 + 10);
        ctx.globalAlpha = 1;
      }

      // Score
      ctx.fillStyle = '#FFF';
      ctx.font = 'bold 28px ui-monospace';
      ctx.textAlign = 'center';
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = 4;
      ctx.fillText(`${game.score}`, canvasSize.w / 2, 40);
      ctx.shadowBlur = 0;

      // Tap hint
      if (game.score === 0 && !game.isHopping) {
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.font = '16px ui-monospace';
        ctx.fillText('TAP TO CLIMB', canvasSize.w / 2, canvasSize.h - 60);
      }
    };

    const gameLoop = (timestamp: number) => {
      update(timestamp);
      draw();
      animationId = requestAnimationFrame(gameLoop);
    };
    animationId = requestAnimationFrame(gameLoop);

    // Input - tap to hop
    const handleTap = () => {
      const game = gameRef.current;
      if (!game.running || game.isHopping) return;

      // Find next ledge
      const nextLedgeY = -(game.playerLedge + 1) * LEDGE_HEIGHT;
      const nextLedge = game.ledges.find(l => Math.abs(l.y - nextLedgeY) < 5);
      if (!nextLedge) return;

      // Start hop
      game.isHopping = true;
      game.hopProgress = 0;
      game.hopStartX = game.playerX;
      game.hopStartY = game.playerY;
      game.hopTargetX = nextLedge.x + nextLedge.width / 2;
      game.hopTargetY = nextLedge.y - PLAYER_SIZE;
      
      playHop();
    };

    const handleClick = (e: MouseEvent) => {
      e.preventDefault();
      handleTap();
    };
    const handleTouch = (e: TouchEvent) => {
      e.preventDefault();
      handleTap();
    };

    canvas.addEventListener('click', handleClick);
    canvas.addEventListener('touchstart', handleTouch, { passive: false });

    return () => {
      cancelAnimationFrame(animationId);
      canvas.removeEventListener('click', handleClick);
      canvas.removeEventListener('touchstart', handleTouch);
    };
  }, [gameState, canvasSize, generateLedges]);

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: '#87CEEB',
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
          background: 'linear-gradient(180deg, #87CEEB 0%, #E0F4FF 100%)',
        }}>
          <div style={{ fontSize: 80, marginBottom: 10 }}>🧗</div>
          <h1 style={{
            color: '#2C3E50',
            fontSize: 56,
            marginBottom: 10,
            fontWeight: 900,
          }}>
            CLIMB
          </h1>

          <p style={{
            color: '#34495E',
            fontSize: 16,
            marginBottom: 30,
            textAlign: 'center',
            lineHeight: 1.6,
            maxWidth: 280,
          }}>
            Tap to climb the mountain.<br />
            Avoid falling rocks and eagles.<br />
            Don't wait too long — ledges crumble!
          </p>

          <button
            onClick={startGame}
            style={{
              background: '#E74C3C',
              color: '#fff',
              border: 'none',
              padding: '18px 60px',
              fontSize: 18,
              fontWeight: 700,
              cursor: 'pointer',
              borderRadius: 30,
              boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
            }}
          >
            START
          </button>
        </div>
      )}

      {gameState === 'playing' && (
        <canvas
          ref={canvasRef}
          style={{
            display: 'block',
            touchAction: 'none',
          }}
        />
      )}

      {gameState === 'dead' && (
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(180deg, #1A3A4A 0%, #0D1F2D 100%)',
        }}>
          <div style={{ fontSize: 60, marginBottom: 10 }}>💀</div>
          <h1 style={{ color: '#E74C3C', fontSize: 48, marginBottom: 10 }}>
            FELL!
          </h1>
          <p style={{ color: '#ECF0F1', fontSize: 24, marginBottom: 30 }}>
            {score} ledges
          </p>
          <button
            onClick={startGame}
            style={{
              background: '#E74C3C',
              color: '#fff',
              border: 'none',
              padding: '16px 50px',
              fontSize: 18,
              fontWeight: 600,
              cursor: 'pointer',
              borderRadius: 30,
            }}
          >
            CLIMB AGAIN
          </button>
        </div>
      )}
    </div>
  );
}
