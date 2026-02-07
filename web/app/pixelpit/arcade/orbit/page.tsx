'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';

const GAME_ID = 'orbit';

const TILE_SIZE = 60; // Taller lanes for clearer positioning
const PLAYER_SIZE = 20;
const ABDUCTION_TIMEOUT = 3000; // 3 seconds idle = abducted

// Lane types
type LaneType = 'platform' | 'lane' | 'debris' | 'beam';

interface Lane {
  y: number;
  type: LaneType;
  objects: LaneObject[];
  speed: number;
  direction: 1 | -1;
  hasWarning?: boolean;
  beamActive?: boolean;
}

interface LaneObject {
  x: number;
  width: number;
  type: 'ufo' | 'asteroid' | 'satellite' | 'mothership' | 'crystal';
  color?: string;
}

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
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sine';
  osc.frequency.value = 600;
  osc.frequency.exponentialRampToValueAtTime(800, audioCtx.currentTime + 0.08);
  gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.08);
  osc.connect(gain);
  gain.connect(masterGain);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.08);
}

function playZap() {
  if (!audioCtx || !masterGain) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.value = 200;
  osc.frequency.exponentialRampToValueAtTime(50, audioCtx.currentTime + 0.15);
  gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.2);
  osc.connect(gain);
  gain.connect(masterGain);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.2);
}

function playVoid() {
  if (!audioCtx || !masterGain) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sine';
  osc.frequency.value = 100;
  osc.frequency.exponentialRampToValueAtTime(20, audioCtx.currentTime + 0.5);
  gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);
  osc.connect(gain);
  gain.connect(masterGain);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.5);
}

function playCrystal() {
  if (!audioCtx || !masterGain) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sine';
  osc.frequency.value = 1000;
  osc.frequency.exponentialRampToValueAtTime(1500, audioCtx.currentTime + 0.1);
  gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);
  osc.connect(gain);
  gain.connect(masterGain);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.15);
}

function playBeamWarning() {
  if (!audioCtx || !masterGain) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'square';
  osc.frequency.value = 880;
  gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
  gain.gain.setValueAtTime(0, audioCtx.currentTime + 0.1);
  gain.gain.setValueAtTime(0.08, audioCtx.currentTime + 0.2);
  gain.gain.setValueAtTime(0, audioCtx.currentTime + 0.3);
  osc.connect(gain);
  gain.connect(masterGain);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.3);
}

export default function OrbitGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<'start' | 'playing' | 'dead'>('start');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [canvasSize, setCanvasSize] = useState({ w: 400, h: 700 });

  const gameRef = useRef({
    running: false,
    playerX: 0,
    playerY: 0,
    playerRow: 0,
    maxRow: 0,
    targetX: 0,
    targetY: 0,
    isHopping: false,
    hopProgress: 0,
    lanes: [] as Lane[],
    cameraY: 0,
    lastMoveTime: 0,
    abductorActive: false,
    abductorX: 0,
    abductorY: 0,
    crystals: 0,
    deathType: '',
    stars: [] as { x: number; y: number; size: number; twinkle: number }[],
  });

  const generateLane = useCallback((row: number, canvasW: number): Lane => {
    // First few rows are safe platforms
    if (row < 2) {
      return { y: -row * TILE_SIZE, type: 'platform', objects: [], speed: 0, direction: 1 };
    }
    
    const rand = Math.random();
    let type: LaneType;
    
    // No debris fields for first 15 lanes - easier start
    if (row < 15) {
      if (rand < 0.35) type = 'platform';
      else if (rand < 0.9) type = 'lane';
      else type = 'beam';
    } else {
      if (rand < 0.3) type = 'platform';
      else if (rand < 0.7) type = 'lane';
      else if (rand < 0.9) type = 'debris';
      else type = 'beam';
    }
    
    const direction = Math.random() < 0.5 ? 1 : -1 as 1 | -1;
    const baseSpeed = 1 + Math.min(row / 50, 2);
    let speed = baseSpeed * (0.5 + Math.random());
    
    const objects: LaneObject[] = [];
    const colors = ['#FF6B6B', '#4ECDC4', '#A855F7', '#22D3EE', '#F472B6'];
    
    if (type === 'lane') {
      // UFOs and asteroids
      const numObjects = 2 + Math.floor(Math.random() * 2);
      const gap = canvasW / numObjects;
      for (let i = 0; i < numObjects; i++) {
        const isAsteroid = Math.random() < 0.3;
        objects.push({
          x: i * gap + Math.random() * (gap * 0.5),
          width: isAsteroid ? 70 : 45,
          type: isAsteroid ? 'asteroid' : 'ufo',
          color: colors[Math.floor(Math.random() * colors.length)],
        });
      }
      speed *= 1.2;
    } else if (type === 'debris') {
      // Satellites to ride on
      const numSats = 2 + Math.floor(Math.random() * 2);
      const gap = canvasW / numSats;
      for (let i = 0; i < numSats; i++) {
        objects.push({
          x: i * gap + Math.random() * (gap * 0.3),
          width: 60 + Math.random() * 40,
          type: 'satellite',
        });
      }
      speed *= 0.6;
    } else if (type === 'beam') {
      speed = 8;
    }
    
    // Crystals on platforms sometimes
    if (type === 'platform' && Math.random() < 0.2) {
      objects.push({
        x: Math.random() * canvasW,
        width: 20,
        type: 'crystal',
      });
    }
    
    return { y: -row * TILE_SIZE, type, objects, speed, direction };
  }, []);

  const startGame = useCallback(() => {
    initAudio();
    stopMusic(); // Stop any existing music
    startMusic(); // Start fresh music (iOS audio unlocked by button tap)
    const game = gameRef.current;
    game.running = true;
    game.playerRow = 0;
    game.maxRow = 0;
    game.playerX = canvasSize.w / 2;
    game.playerY = 0;
    game.targetX = game.playerX;
    game.targetY = game.playerY;
    game.isHopping = false;
    game.hopProgress = 0;
    game.cameraY = game.playerY - canvasSize.h * 0.7;
    game.lastMoveTime = Date.now();
    game.abductorActive = false;
    game.crystals = 0;
    game.deathType = '';
    
    // Generate stars
    game.stars = [];
    for (let i = 0; i < 100; i++) {
      game.stars.push({
        x: Math.random() * canvasSize.w,
        y: Math.random() * 3000 - 1500,
        size: 1 + Math.random() * 2,
        twinkle: Math.random() * Math.PI * 2,
      });
    }
    
    // Generate initial lanes
    game.lanes = [];
    for (let i = -5; i < 30; i++) {
      game.lanes.push(generateLane(i, canvasSize.w));
    }
    
    setScore(0);
    setGameState('playing');
    startMusic();
  }, [generateLane, canvasSize]);

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
    let beamTimer = 0;

    const update = (dt: number) => {
      const game = gameRef.current;
      if (!game.running) return;

      const now = Date.now();

      // Abductor (alien mothership if idle)
      if (!game.abductorActive && now - game.lastMoveTime > ABDUCTION_TIMEOUT) {
        game.abductorActive = true;
        game.abductorX = -100;
        game.abductorY = game.playerY - 50;
      }

      if (game.abductorActive) {
        game.abductorX += 6;
        if (game.abductorX > game.playerX - 20 && game.abductorX < game.playerX + 20) {
          game.running = false;
          game.deathType = 'abducted';
          stopMusic();
          playVoid();
          stopMusic();
          if (game.maxRow > highScore) setHighScore(game.maxRow);
          setGameState('dead');
          fetch('/api/pixelpit/stats', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ game: GAME_ID }),
          }).catch(() => {});
          return;
        }
      }

      // Update hop animation
      if (game.isHopping) {
        game.hopProgress += dt * 8;
        if (game.hopProgress >= 1) {
          game.isHopping = false;
          game.hopProgress = 0;
          game.playerX = game.targetX;
          game.playerY = game.targetY;
        } else {
          game.playerX = game.playerX + (game.targetX - game.playerX) * 0.3;
          game.playerY = game.playerY + (game.targetY - game.playerY) * 0.3;
        }
      }

      // Camera follows player
      const targetCameraY = game.playerY - canvasSize.h * 0.7;
      game.cameraY += (targetCameraY - game.cameraY) * 0.1;

      // Update lane objects
      for (const lane of game.lanes) {
        for (const obj of lane.objects) {
          if (obj.type !== 'crystal') {
            obj.x += lane.speed * lane.direction;
            
            if (lane.direction > 0 && obj.x > canvasSize.w + obj.width) {
              obj.x = -obj.width;
            } else if (lane.direction < 0 && obj.x < -obj.width) {
              obj.x = canvasSize.w + obj.width;
            }
          }
        }

        // Beam logic (like trains)
        if (lane.type === 'beam') {
          beamTimer += dt;
          if (!lane.beamActive && beamTimer > 3 + Math.random() * 4) {
            lane.beamActive = true;
            lane.hasWarning = true;
            playBeamWarning();
            setTimeout(() => {
              if (lane.beamActive) {
                lane.objects = [{
                  x: lane.direction > 0 ? -200 : canvasSize.w + 200,
                  width: 200,
                  type: 'mothership',
                }];
                setTimeout(() => {
                  lane.beamActive = false;
                  lane.hasWarning = false;
                  lane.objects = [];
                  beamTimer = 0;
                }, 2000);
              }
            }, 1000);
          }
        }
      }

      // Check player collision
      const currentLane = game.lanes.find(l => Math.abs(l.y - (-game.playerRow * TILE_SIZE)) < 5);
      if (currentLane && !game.isHopping) {
        // Debris field - must be on satellite
        if (currentLane.type === 'debris') {
          let onSatellite = false;
          for (const obj of currentLane.objects) {
            if (obj.type === 'satellite') {
              if (game.playerX > obj.x - 10 && game.playerX < obj.x + obj.width + 10) {
                onSatellite = true;
                game.playerX += currentLane.speed * currentLane.direction;
                game.targetX = game.playerX;
                break;
              }
            }
          }
          if (!onSatellite) {
            game.running = false;
            game.deathType = 'void';
            stopMusic();
            playVoid();
            stopMusic();
            if (game.maxRow > highScore) setHighScore(game.maxRow);
            setGameState('dead');
            fetch('/api/pixelpit/stats', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ game: GAME_ID }),
            }).catch(() => {});
            return;
          }
        }

        // Lane or beam - check UFO/asteroid/mothership collision
        if (currentLane.type === 'lane' || currentLane.type === 'beam') {
          for (const obj of currentLane.objects) {
            if (obj.type === 'ufo' || obj.type === 'asteroid' || obj.type === 'mothership') {
              if (game.playerX > obj.x - 15 && game.playerX < obj.x + obj.width + 15) {
                game.running = false;
                game.deathType = obj.type === 'mothership' ? 'beam' : 'collision';
                stopMusic();
                playZap();
                stopMusic();
                if (game.maxRow > highScore) setHighScore(game.maxRow);
                setGameState('dead');
                fetch('/api/pixelpit/stats', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ game: GAME_ID }),
                }).catch(() => {});
                return;
              }
            }
          }
        }

        // Crystal collection
        for (let i = currentLane.objects.length - 1; i >= 0; i--) {
          const obj = currentLane.objects[i];
          if (obj.type === 'crystal' && Math.abs(game.playerX - obj.x) < 30) {
            currentLane.objects.splice(i, 1);
            game.crystals++;
            playCrystal();
          }
        }
      }

      // Generate more lanes ahead
      const maxLaneRow = Math.max(...game.lanes.map(l => -l.y / TILE_SIZE));
      if (game.playerRow > maxLaneRow - 20) {
        for (let i = 0; i < 10; i++) {
          game.lanes.push(generateLane(Math.floor(maxLaneRow) + i + 1, canvasSize.w));
        }
      }

      // Remove old lanes
      game.lanes = game.lanes.filter(l => -l.y / TILE_SIZE > game.playerRow - 10);
    };

    const draw = () => {
      const game = gameRef.current;
      
      // Deep space background
      const gradient = ctx.createLinearGradient(0, 0, 0, canvasSize.h);
      gradient.addColorStop(0, '#0a0a1a');
      gradient.addColorStop(1, '#1a0a2e');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvasSize.w, canvasSize.h);

      // Stars
      for (const star of game.stars) {
        const screenY = star.y - game.cameraY;
        if (screenY < -10 || screenY > canvasSize.h + 10) continue;
        const twinkle = 0.5 + 0.5 * Math.sin(Date.now() / 500 + star.twinkle);
        ctx.fillStyle = `rgba(255, 255, 255, ${twinkle * 0.8})`;
        ctx.beginPath();
        ctx.arc(star.x, screenY, star.size, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw lanes
      for (const lane of game.lanes) {
        const screenY = lane.y - game.cameraY;
        if (screenY < -TILE_SIZE * 2 || screenY > canvasSize.h + TILE_SIZE) continue;

        // Lane background
        if (lane.type === 'platform') {
          // Moon rock platform
          ctx.fillStyle = '#374151';
          ctx.fillRect(0, screenY, canvasSize.w, TILE_SIZE);
          // Crater details
          ctx.fillStyle = '#1F2937';
          for (let cx = 30; cx < canvasSize.w; cx += 80) {
            ctx.beginPath();
            ctx.arc(cx, screenY + 25, 8, 0, Math.PI * 2);
            ctx.fill();
          }
        } else if (lane.type === 'lane') {
          // Space lane
          ctx.fillStyle = '#1E1B4B';
          ctx.fillRect(0, screenY, canvasSize.w, TILE_SIZE);
          // Lane markings (energy lines)
          ctx.strokeStyle = '#4C1D95';
          ctx.lineWidth = 2;
          ctx.setLineDash([15, 15]);
          ctx.beginPath();
          ctx.moveTo(0, screenY + TILE_SIZE / 2);
          ctx.lineTo(canvasSize.w, screenY + TILE_SIZE / 2);
          ctx.stroke();
          ctx.setLineDash([]);
        } else if (lane.type === 'debris') {
          // Debris field (void)
          ctx.fillStyle = '#030712';
          ctx.fillRect(0, screenY, canvasSize.w, TILE_SIZE);
          // Void particles
          ctx.fillStyle = '#4B5563';
          for (let px = 10; px < canvasSize.w; px += 30) {
            ctx.beginPath();
            ctx.arc(px + Math.sin(Date.now() / 1000 + px) * 5, screenY + 25, 2, 0, Math.PI * 2);
            ctx.fill();
          }
        } else if (lane.type === 'beam') {
          // Beam lane
          ctx.fillStyle = '#1C1917';
          ctx.fillRect(0, screenY, canvasSize.w, TILE_SIZE);
          // Warning indicator
          if (lane.hasWarning) {
            ctx.fillStyle = Math.floor(Date.now() / 200) % 2 ? '#EF4444' : '#7F1D1D';
            ctx.beginPath();
            ctx.arc(30, screenY + 25, 8, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        // Draw objects
        for (const obj of lane.objects) {
          const objY = screenY + TILE_SIZE / 2;
          
          if (obj.type === 'ufo') {
            // UFO
            ctx.fillStyle = obj.color || '#A855F7';
            ctx.beginPath();
            ctx.ellipse(obj.x + obj.width / 2, objY, obj.width / 2, 12, 0, 0, Math.PI * 2);
            ctx.fill();
            // Dome
            ctx.fillStyle = '#22D3EE';
            ctx.beginPath();
            ctx.arc(obj.x + obj.width / 2, objY - 8, 10, Math.PI, 0);
            ctx.fill();
            // Lights
            ctx.fillStyle = '#FBBF24';
            for (let l = 0; l < 3; l++) {
              ctx.beginPath();
              ctx.arc(obj.x + 10 + l * 12, objY + 5, 3, 0, Math.PI * 2);
              ctx.fill();
            }
          } else if (obj.type === 'asteroid') {
            // Asteroid
            ctx.fillStyle = '#78716C';
            ctx.beginPath();
            ctx.arc(obj.x + obj.width / 2, objY, obj.width / 3, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#57534E';
            ctx.beginPath();
            ctx.arc(obj.x + obj.width / 2 - 8, objY - 5, 8, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(obj.x + obj.width / 2 + 10, objY + 5, 6, 0, Math.PI * 2);
            ctx.fill();
          } else if (obj.type === 'satellite') {
            // Satellite
            ctx.fillStyle = '#6B7280';
            ctx.fillRect(obj.x, objY - 8, obj.width, 16);
            // Solar panels
            ctx.fillStyle = '#1E40AF';
            ctx.fillRect(obj.x - 15, objY - 12, 15, 24);
            ctx.fillRect(obj.x + obj.width, objY - 12, 15, 24);
            // Antenna
            ctx.strokeStyle = '#9CA3AF';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(obj.x + obj.width / 2, objY - 8);
            ctx.lineTo(obj.x + obj.width / 2, objY - 20);
            ctx.stroke();
          } else if (obj.type === 'mothership') {
            // Mothership
            ctx.fillStyle = '#1F2937';
            ctx.fillRect(obj.x, objY - 25, obj.width, 50);
            ctx.fillStyle = '#DC2626';
            ctx.fillRect(obj.x, objY - 25, 40, 50);
            // Windows
            ctx.fillStyle = '#22D3EE';
            for (let w = 50; w < obj.width - 20; w += 30) {
              ctx.fillRect(obj.x + w, objY - 10, 20, 15);
            }
            // Beam
            ctx.fillStyle = 'rgba(34, 211, 238, 0.3)';
            ctx.beginPath();
            ctx.moveTo(obj.x + obj.width / 2 - 30, objY + 25);
            ctx.lineTo(obj.x + obj.width / 2 + 30, objY + 25);
            ctx.lineTo(obj.x + obj.width / 2 + 50, objY + 100);
            ctx.lineTo(obj.x + obj.width / 2 - 50, objY + 100);
            ctx.fill();
          } else if (obj.type === 'crystal') {
            // Energy crystal
            ctx.fillStyle = '#22D3EE';
            ctx.shadowColor = '#22D3EE';
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.moveTo(obj.x, objY);
            ctx.lineTo(obj.x + 8, objY - 12);
            ctx.lineTo(obj.x + 16, objY);
            ctx.lineTo(obj.x + 8, objY + 12);
            ctx.closePath();
            ctx.fill();
            ctx.shadowBlur = 0;
          }
        }
      }

      // Draw player (astronaut)
      const playerScreenX = game.playerX;
      const playerScreenY = game.playerY - game.cameraY;
      const hopOffset = game.isHopping ? Math.sin(game.hopProgress * Math.PI) * 15 : 0;
      
      // LANE INDICATOR - clear glow showing which lane player is on
      if (!game.isHopping) {
        ctx.fillStyle = 'rgba(34, 211, 238, 0.3)';
        ctx.fillRect(playerScreenX - 20, playerScreenY, 40, TILE_SIZE);
        ctx.strokeStyle = '#22D3EE';
        ctx.lineWidth = 2;
        ctx.strokeRect(playerScreenX - 20, playerScreenY, 40, TILE_SIZE);
      }
      
      // Shadow (at bottom of current lane)
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.beginPath();
      ctx.ellipse(playerScreenX, playerScreenY + TILE_SIZE - 8, 12, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      
      // Player centered in lane (TILE_SIZE / 2 is center)
      const playerCenterY = playerScreenY + TILE_SIZE / 2;
      
      // Suit body
      ctx.fillStyle = '#E5E7EB';
      ctx.beginPath();
      ctx.ellipse(playerScreenX, playerCenterY + 5 - hopOffset, 9, 12, 0, 0, Math.PI * 2);
      ctx.fill();
      
      // Helmet
      ctx.fillStyle = '#F3F4F6';
      ctx.beginPath();
      ctx.arc(playerScreenX, playerCenterY - 10 - hopOffset, 9, 0, Math.PI * 2);
      ctx.fill();
      
      // Visor
      ctx.fillStyle = '#1E40AF';
      ctx.beginPath();
      ctx.arc(playerScreenX, playerCenterY - 10 - hopOffset, 6, 0, Math.PI * 2);
      ctx.fill();
      
      // Visor reflection
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.beginPath();
      ctx.arc(playerScreenX - 2, playerCenterY - 12 - hopOffset, 2, 0, Math.PI * 2);
      ctx.fill();
      
      // Backpack
      ctx.fillStyle = '#9CA3AF';
      ctx.fillRect(playerScreenX - 5, playerCenterY - 2 - hopOffset, 4, 10);

      // Abductor (alien ship)
      if (game.abductorActive) {
        const abductorScreenY = game.abductorY - game.cameraY;
        ctx.fillStyle = '#4C1D95';
        ctx.beginPath();
        ctx.ellipse(game.abductorX, abductorScreenY, 50, 20, 0, 0, Math.PI * 2);
        ctx.fill();
        // Beam
        ctx.fillStyle = 'rgba(167, 139, 250, 0.4)';
        ctx.beginPath();
        ctx.moveTo(game.abductorX - 20, abductorScreenY + 20);
        ctx.lineTo(game.abductorX + 20, abductorScreenY + 20);
        ctx.lineTo(game.abductorX + 40, abductorScreenY + 80);
        ctx.lineTo(game.abductorX - 40, abductorScreenY + 80);
        ctx.fill();
      }

      // UI
      ctx.fillStyle = '#FFF';
      ctx.font = 'bold 28px ui-monospace';
      ctx.textAlign = 'center';
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = 4;
      ctx.fillText(`${game.maxRow}`, canvasSize.w / 2, 40);
      
      ctx.font = '16px ui-monospace';
      ctx.fillText(`HI: ${highScore}`, canvasSize.w / 2, 65);
      
      if (game.crystals > 0) {
        ctx.fillStyle = '#22D3EE';
        ctx.fillText(`💎 ${game.crystals}`, canvasSize.w / 2, 90);
      }
      
      ctx.shadowBlur = 0;

      // Tap hint
      if (game.maxRow === 0) {
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.font = '16px ui-monospace';
        ctx.fillText('TAP TO JUMP FORWARD', canvasSize.w / 2, canvasSize.h - 100);
        ctx.fillText('SWIPE ← → TO MOVE', canvasSize.w / 2, canvasSize.h - 75);
      }
    };

    let lastTime = 0;
    const gameLoop = (timestamp: number) => {
      const dt = Math.min((timestamp - lastTime) / 1000, 0.05);
      lastTime = timestamp;
      update(dt);
      draw();
      animationId = requestAnimationFrame(gameLoop);
    };
    animationId = requestAnimationFrame(gameLoop);

    // Input handling
    let touchStartX = 0;
    let touchStartY = 0;
    let touchStartTime = 0;

    const handleMove = (dx: number, dy: number) => {
      const game = gameRef.current;
      if (!game.running || game.isHopping) return;

      let newRow = game.playerRow;
      let newX = game.playerX;

      if (Math.abs(dx) > Math.abs(dy)) {
        if (dx > 30) newX += TILE_SIZE;
        else if (dx < -30) newX -= TILE_SIZE;
        else return;
      } else {
        if (dy < -30) {
          newRow++;
        } else if (dy > 30) {
          newRow = Math.max(0, newRow - 1);
        } else {
          newRow++;
        }
      }

      newX = Math.max(TILE_SIZE / 2, Math.min(canvasSize.w - TILE_SIZE / 2, newX));

      game.targetX = newX;
      game.targetY = -newRow * TILE_SIZE;
      game.playerRow = newRow;
      game.isHopping = true;
      game.hopProgress = 0;
      game.lastMoveTime = Date.now();
      game.abductorActive = false;

      if (newRow > game.maxRow) {
        game.maxRow = newRow;
        setScore(newRow);
      }

      playHop();
    };

    const handleTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
      touchStartTime = Date.now();
    };

    const handleTouchEnd = (e: TouchEvent) => {
      e.preventDefault();
      const dx = e.changedTouches[0].clientX - touchStartX;
      const dy = e.changedTouches[0].clientY - touchStartY;
      const elapsed = Date.now() - touchStartTime;
      
      if (elapsed < 200 && Math.abs(dx) < 20 && Math.abs(dy) < 20) {
        handleMove(0, -50);
      } else {
        handleMove(dx, dy);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp' || e.key === 'w') handleMove(0, -50);
      else if (e.key === 'ArrowDown' || e.key === 's') handleMove(0, 50);
      else if (e.key === 'ArrowLeft' || e.key === 'a') handleMove(-50, 0);
      else if (e.key === 'ArrowRight' || e.key === 'd') handleMove(50, 0);
    };

    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd, { passive: false });
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      cancelAnimationFrame(animationId);
      stopMusic();
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [gameState, canvasSize, generateLane, highScore]);

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: '#0a0a1a',
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
          background: 'linear-gradient(180deg, #0a0a1a 0%, #1a0a2e 100%)',
        }}>
          <div style={{ fontSize: 80, marginBottom: 10 }}>🚀</div>
          <h1 style={{
            color: '#E5E7EB',
            fontSize: 48,
            marginBottom: 10,
            fontWeight: 900,
          }}>
            ORBIT
          </h1>

          <p style={{
            color: '#9CA3AF',
            fontSize: 16,
            marginBottom: 30,
            textAlign: 'center',
            lineHeight: 1.6,
            maxWidth: 280,
          }}>
            Tap to jump forward.<br />
            Swipe to move sideways.<br />
            Dodge UFOs, ride satellites!
          </p>

          <button
            onClick={startGame}
            style={{
              background: '#7C3AED',
              color: '#fff',
              border: 'none',
              padding: '18px 60px',
              fontSize: 18,
              fontWeight: 700,
              cursor: 'pointer',
              borderRadius: 30,
              boxShadow: '0 4px 15px rgba(124, 58, 237, 0.4)',
            }}
          >
            LAUNCH
          </button>
          
          {highScore > 0 && (
            <p style={{ color: '#6B7280', marginTop: 20 }}>
              High Score: {highScore}
            </p>
          )}
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
          background: 'rgba(0,0,0,0.9)',
        }}>
          <div style={{ fontSize: 60, marginBottom: 10 }}>
            {gameRef.current.deathType === 'void' ? '🕳️' : 
             gameRef.current.deathType === 'abducted' ? '👽' : '💥'}
          </div>
          <h1 style={{ color: '#E5E7EB', fontSize: 48, marginBottom: 10 }}>
            {gameRef.current.deathType === 'void' ? 'LOST IN VOID!' : 
             gameRef.current.deathType === 'abducted' ? 'ABDUCTED!' : 'COLLISION!'}
          </h1>
          <p style={{ color: '#E5E7EB', fontSize: 24, marginBottom: 10 }}>
            Distance: {score}
          </p>
          {score >= highScore && score > 0 && (
            <p style={{ color: '#22D3EE', fontSize: 18, marginBottom: 20 }}>
              NEW HIGH SCORE!
            </p>
          )}
          <button
            onClick={startGame}
            style={{
              background: '#7C3AED',
              color: '#fff',
              border: 'none',
              padding: '16px 50px',
              fontSize: 18,
              fontWeight: 600,
              cursor: 'pointer',
              borderRadius: 30,
            }}
          >
            RELAUNCH
          </button>
        </div>
      )}
    </div>
  );
}
