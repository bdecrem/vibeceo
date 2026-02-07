'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';

const GAME_ID = 'crossy';

const TILE_SIZE = 50;
const PLAYER_SIZE = 35;
const EAGLE_TIMEOUT = 3000; // 3 seconds idle = eagle

// Lane types
type LaneType = 'grass' | 'road' | 'river' | 'rail';

interface Lane {
  y: number;
  type: LaneType;
  objects: LaneObject[];
  speed: number;
  direction: 1 | -1;
  hasWarning?: boolean;
  trainComing?: boolean;
}

interface LaneObject {
  x: number;
  width: number;
  type: 'car' | 'truck' | 'log' | 'train' | 'coin';
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
  osc.frequency.value = 400;
  gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.08);
  osc.connect(gain);
  gain.connect(masterGain);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.08);
}

function playSplat() {
  if (!audioCtx || !masterGain) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.value = 100;
  gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.2);
  osc.connect(gain);
  gain.connect(masterGain);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.2);
}

function playSplash() {
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
  filter.type = 'lowpass';
  filter.frequency.value = 600;
  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
  noise.connect(filter);
  filter.connect(gain);
  gain.connect(masterGain);
  noise.start();
}

function playCoin() {
  if (!audioCtx || !masterGain) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sine';
  osc.frequency.value = 800;
  osc.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.1);
  gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);
  osc.connect(gain);
  gain.connect(masterGain);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.15);
}

function playTrainWarning() {
  if (!audioCtx || !masterGain) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'square';
  osc.frequency.value = 440;
  gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
  gain.gain.setValueAtTime(0, audioCtx.currentTime + 0.1);
  gain.gain.setValueAtTime(0.1, audioCtx.currentTime + 0.2);
  gain.gain.setValueAtTime(0, audioCtx.currentTime + 0.3);
  osc.connect(gain);
  gain.connect(masterGain);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.3);
}

export default function CrossyGame() {
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
    eagleActive: false,
    eagleX: 0,
    eagleY: 0,
    coins: 0,
    deathType: '',
  });

  const generateLane = useCallback((row: number, canvasW: number): Lane => {
    // First few rows are grass for safety
    if (row < 2) {
      return { y: -row * TILE_SIZE, type: 'grass', objects: [], speed: 0, direction: 1 };
    }
    
    // Random lane type with some patterns
    const rand = Math.random();
    let type: LaneType;
    if (rand < 0.3) type = 'grass';
    else if (rand < 0.7) type = 'road';
    else if (rand < 0.9) type = 'river';
    else type = 'rail';
    
    const direction = Math.random() < 0.5 ? 1 : -1 as 1 | -1;
    const baseSpeed = 1 + Math.min(row / 50, 2); // Speed increases with distance
    let speed = baseSpeed * (0.5 + Math.random());
    
    const objects: LaneObject[] = [];
    
    if (type === 'road') {
      // Cars and trucks
      const numCars = 2 + Math.floor(Math.random() * 2);
      const gap = canvasW / numCars;
      for (let i = 0; i < numCars; i++) {
        const isTruck = Math.random() < 0.3;
        objects.push({
          x: i * gap + Math.random() * (gap * 0.5),
          width: isTruck ? 80 : 50,
          type: isTruck ? 'truck' : 'car',
        });
      }
      speed *= 1.2;
    } else if (type === 'river') {
      // Logs
      const numLogs = 2 + Math.floor(Math.random() * 2);
      const gap = canvasW / numLogs;
      for (let i = 0; i < numLogs; i++) {
        objects.push({
          x: i * gap + Math.random() * (gap * 0.3),
          width: 70 + Math.random() * 50,
          type: 'log',
        });
      }
      speed *= 0.6;
    } else if (type === 'rail') {
      // Train spawns separately
      speed = 8;
    }
    
    // Coins on grass sometimes
    if (type === 'grass' && Math.random() < 0.2) {
      objects.push({
        x: Math.random() * canvasW,
        width: 20,
        type: 'coin',
      });
    }
    
    return { y: -row * TILE_SIZE, type, objects, speed, direction };
  }, []);

  const startGame = useCallback(() => {
    initAudio();
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
    game.cameraY = 0;
    game.lastMoveTime = Date.now();
    game.eagleActive = false;
    game.coins = 0;
    game.deathType = '';
    
    // Generate initial lanes
    game.lanes = [];
    for (let i = -5; i < 30; i++) {
      game.lanes.push(generateLane(i, canvasSize.w));
    }
    
    setScore(0);
    setGameState('playing');
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
    let trainTimer = 0;

    const update = (dt: number) => {
      const game = gameRef.current;
      if (!game.running) return;

      const now = Date.now();

      // Eagle timer
      if (!game.eagleActive && now - game.lastMoveTime > EAGLE_TIMEOUT) {
        game.eagleActive = true;
        game.eagleX = -100;
        game.eagleY = game.playerY - 50;
      }

      if (game.eagleActive) {
        game.eagleX += 8;
        if (game.eagleX > game.playerX - 20 && game.eagleX < game.playerX + 20) {
          // Eagle got you
          game.running = false;
          game.deathType = 'eagle';
          playSplat();
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
          const t = game.hopProgress;
          game.playerX = game.playerX + (game.targetX - game.playerX) * 0.3;
          game.playerY = game.playerY + (game.targetY - game.playerY) * 0.3;
        }
      }

      // Camera follows player
      const targetCameraY = -game.playerY - canvasSize.h * 0.6;
      game.cameraY += (targetCameraY - game.cameraY) * 0.1;

      // Update lane objects
      for (const lane of game.lanes) {
        for (const obj of lane.objects) {
          if (obj.type !== 'coin') {
            obj.x += lane.speed * lane.direction;
            
            // Wrap around
            if (lane.direction > 0 && obj.x > canvasSize.w + obj.width) {
              obj.x = -obj.width;
            } else if (lane.direction < 0 && obj.x < -obj.width) {
              obj.x = canvasSize.w + obj.width;
            }
          }
        }

        // Train logic
        if (lane.type === 'rail') {
          trainTimer += dt;
          if (!lane.trainComing && trainTimer > 3 + Math.random() * 4) {
            lane.trainComing = true;
            lane.hasWarning = true;
            playTrainWarning();
            setTimeout(() => {
              if (lane.trainComing) {
                lane.objects = [{
                  x: lane.direction > 0 ? -200 : canvasSize.w + 200,
                  width: 200,
                  type: 'train',
                }];
                setTimeout(() => {
                  lane.trainComing = false;
                  lane.hasWarning = false;
                  lane.objects = [];
                  trainTimer = 0;
                }, 2000);
              }
            }, 1000);
          }
        }
      }

      // Check player collision with current lane
      const currentLane = game.lanes.find(l => Math.abs(l.y - (-game.playerRow * TILE_SIZE)) < 5);
      if (currentLane && !game.isHopping) {
        // River - must be on log
        if (currentLane.type === 'river') {
          let onLog = false;
          for (const obj of currentLane.objects) {
            if (obj.type === 'log') {
              if (game.playerX > obj.x - 10 && game.playerX < obj.x + obj.width + 10) {
                onLog = true;
                // Move with log
                game.playerX += currentLane.speed * currentLane.direction;
                game.targetX = game.playerX;
                break;
              }
            }
          }
          if (!onLog) {
            // Splash!
            game.running = false;
            game.deathType = 'water';
            playSplash();
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

        // Road or rail - check car/train collision
        if (currentLane.type === 'road' || currentLane.type === 'rail') {
          for (const obj of currentLane.objects) {
            if (obj.type === 'car' || obj.type === 'truck' || obj.type === 'train') {
              if (game.playerX > obj.x - 15 && game.playerX < obj.x + obj.width + 15) {
                // Splat!
                game.running = false;
                game.deathType = obj.type === 'train' ? 'train' : 'car';
                playSplat();
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

        // Coin collection
        for (let i = currentLane.objects.length - 1; i >= 0; i--) {
          const obj = currentLane.objects[i];
          if (obj.type === 'coin' && Math.abs(game.playerX - obj.x) < 30) {
            currentLane.objects.splice(i, 1);
            game.coins++;
            playCoin();
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
      
      // Sky
      ctx.fillStyle = '#87CEEB';
      ctx.fillRect(0, 0, canvasSize.w, canvasSize.h);

      // Draw lanes
      for (const lane of game.lanes) {
        const screenY = lane.y - game.cameraY;
        if (screenY < -TILE_SIZE * 2 || screenY > canvasSize.h + TILE_SIZE) continue;

        // Lane background
        if (lane.type === 'grass') {
          ctx.fillStyle = '#90EE90';
        } else if (lane.type === 'road') {
          ctx.fillStyle = '#555';
        } else if (lane.type === 'river') {
          ctx.fillStyle = '#4169E1';
        } else if (lane.type === 'rail') {
          ctx.fillStyle = '#8B4513';
        }
        ctx.fillRect(0, screenY, canvasSize.w, TILE_SIZE);

        // Road markings
        if (lane.type === 'road') {
          ctx.strokeStyle = '#FFF';
          ctx.lineWidth = 2;
          ctx.setLineDash([20, 20]);
          ctx.beginPath();
          ctx.moveTo(0, screenY + TILE_SIZE / 2);
          ctx.lineTo(canvasSize.w, screenY + TILE_SIZE / 2);
          ctx.stroke();
          ctx.setLineDash([]);
        }

        // Rail tracks
        if (lane.type === 'rail') {
          ctx.fillStyle = '#444';
          ctx.fillRect(0, screenY + 15, canvasSize.w, 8);
          ctx.fillRect(0, screenY + 27, canvasSize.w, 8);
          // Warning light
          if (lane.hasWarning) {
            ctx.fillStyle = Math.floor(Date.now() / 200) % 2 ? '#FF0000' : '#880000';
            ctx.beginPath();
            ctx.arc(30, screenY + 25, 10, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        // Draw objects
        for (const obj of lane.objects) {
          const objY = screenY + TILE_SIZE / 2;
          
          if (obj.type === 'car') {
            ctx.fillStyle = ['#FF6B6B', '#4ECDC4', '#FFE66D', '#95E1D3'][Math.floor(obj.x) % 4];
            ctx.fillRect(obj.x, objY - 15, obj.width, 30);
            // Windows
            ctx.fillStyle = '#333';
            ctx.fillRect(obj.x + 10, objY - 10, 15, 20);
          } else if (obj.type === 'truck') {
            ctx.fillStyle = '#8B4513';
            ctx.fillRect(obj.x, objY - 18, obj.width, 36);
            ctx.fillStyle = '#654321';
            ctx.fillRect(obj.x + 5, objY - 13, 25, 26);
          } else if (obj.type === 'log') {
            ctx.fillStyle = '#8B4513';
            ctx.fillRect(obj.x, objY - 12, obj.width, 24);
            // Wood rings
            ctx.fillStyle = '#654321';
            ctx.beginPath();
            ctx.arc(obj.x + 10, objY, 8, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(obj.x + obj.width - 10, objY, 8, 0, Math.PI * 2);
            ctx.fill();
          } else if (obj.type === 'train') {
            ctx.fillStyle = '#2C3E50';
            ctx.fillRect(obj.x, objY - 20, obj.width, 40);
            ctx.fillStyle = '#E74C3C';
            ctx.fillRect(obj.x, objY - 20, 30, 40);
            // Windows
            ctx.fillStyle = '#F1C40F';
            for (let w = 40; w < obj.width - 20; w += 25) {
              ctx.fillRect(obj.x + w, objY - 10, 15, 15);
            }
          } else if (obj.type === 'coin') {
            ctx.fillStyle = '#FFD700';
            ctx.beginPath();
            ctx.arc(obj.x, objY, 10, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#FFA500';
            ctx.beginPath();
            ctx.arc(obj.x, objY, 6, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      // Draw player (chicken)
      const playerScreenX = game.playerX;
      const playerScreenY = game.playerY - game.cameraY;
      const hopOffset = game.isHopping ? Math.sin(game.hopProgress * Math.PI) * 15 : 0;
      
      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath();
      ctx.ellipse(playerScreenX, playerScreenY + TILE_SIZE / 2, 15, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      
      // Body
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.ellipse(playerScreenX, playerScreenY + TILE_SIZE / 2 - 15 - hopOffset, 18, 20, 0, 0, Math.PI * 2);
      ctx.fill();
      
      // Head
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(playerScreenX, playerScreenY + TILE_SIZE / 2 - 35 - hopOffset, 12, 0, Math.PI * 2);
      ctx.fill();
      
      // Beak
      ctx.fillStyle = '#FFA500';
      ctx.beginPath();
      ctx.moveTo(playerScreenX, playerScreenY + TILE_SIZE / 2 - 35 - hopOffset);
      ctx.lineTo(playerScreenX + 10, playerScreenY + TILE_SIZE / 2 - 32 - hopOffset);
      ctx.lineTo(playerScreenX, playerScreenY + TILE_SIZE / 2 - 29 - hopOffset);
      ctx.fill();
      
      // Eyes
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.arc(playerScreenX - 4, playerScreenY + TILE_SIZE / 2 - 38 - hopOffset, 3, 0, Math.PI * 2);
      ctx.arc(playerScreenX + 4, playerScreenY + TILE_SIZE / 2 - 38 - hopOffset, 3, 0, Math.PI * 2);
      ctx.fill();
      
      // Comb
      ctx.fillStyle = '#FF0000';
      ctx.beginPath();
      ctx.arc(playerScreenX - 5, playerScreenY + TILE_SIZE / 2 - 46 - hopOffset, 4, 0, Math.PI * 2);
      ctx.arc(playerScreenX, playerScreenY + TILE_SIZE / 2 - 48 - hopOffset, 4, 0, Math.PI * 2);
      ctx.arc(playerScreenX + 5, playerScreenY + TILE_SIZE / 2 - 46 - hopOffset, 4, 0, Math.PI * 2);
      ctx.fill();

      // Eagle
      if (game.eagleActive) {
        const eagleScreenY = game.eagleY - game.cameraY;
        ctx.fillStyle = '#4A3728';
        ctx.beginPath();
        ctx.ellipse(game.eagleX, eagleScreenY, 40, 20, 0, 0, Math.PI * 2);
        ctx.fill();
        // Wings
        const wingFlap = Math.sin(Date.now() / 50) * 15;
        ctx.beginPath();
        ctx.moveTo(game.eagleX - 20, eagleScreenY);
        ctx.lineTo(game.eagleX - 60, eagleScreenY - 20 + wingFlap);
        ctx.lineTo(game.eagleX - 30, eagleScreenY);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(game.eagleX + 20, eagleScreenY);
        ctx.lineTo(game.eagleX + 60, eagleScreenY - 20 + wingFlap);
        ctx.lineTo(game.eagleX + 30, eagleScreenY);
        ctx.fill();
      }

      // UI
      ctx.fillStyle = '#FFF';
      ctx.font = 'bold 28px ui-monospace';
      ctx.textAlign = 'center';
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = 4;
      ctx.fillText(`${game.maxRow}`, canvasSize.w / 2, 40);
      
      // High score
      ctx.font = '16px ui-monospace';
      ctx.fillText(`HI: ${highScore}`, canvasSize.w / 2, 65);
      
      // Coins
      if (game.coins > 0) {
        ctx.fillStyle = '#FFD700';
        ctx.fillText(`🪙 ${game.coins}`, canvasSize.w / 2, 90);
      }
      
      ctx.shadowBlur = 0;

      // Tap hint
      if (game.maxRow === 0) {
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.font = '16px ui-monospace';
        ctx.fillText('TAP TO HOP FORWARD', canvasSize.w / 2, canvasSize.h - 100);
        ctx.fillText('SWIPE ← → TO MOVE SIDEWAYS', canvasSize.w / 2, canvasSize.h - 75);
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

      // Determine direction
      if (Math.abs(dx) > Math.abs(dy)) {
        // Horizontal
        if (dx > 30) newX += TILE_SIZE;
        else if (dx < -30) newX -= TILE_SIZE;
        else return; // Too small
      } else {
        // Vertical
        if (dy < -30) {
          newRow++;
        } else if (dy > 30) {
          newRow = Math.max(0, newRow - 1);
        } else {
          // Tap = forward
          newRow++;
        }
      }

      // Bounds check
      newX = Math.max(TILE_SIZE / 2, Math.min(canvasSize.w - TILE_SIZE / 2, newX));

      // Update position
      game.targetX = newX;
      game.targetY = -newRow * TILE_SIZE;
      game.playerRow = newRow;
      game.isHopping = true;
      game.hopProgress = 0;
      game.lastMoveTime = Date.now();
      game.eagleActive = false;

      // Update max row
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
      
      // Quick tap = forward
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
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [gameState, canvasSize, generateLane, highScore]);

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
          background: 'linear-gradient(180deg, #87CEEB 0%, #90EE90 100%)',
        }}>
          <div style={{ fontSize: 80, marginBottom: 10 }}>🐔</div>
          <h1 style={{
            color: '#2C3E50',
            fontSize: 48,
            marginBottom: 10,
            fontWeight: 900,
          }}>
            CROSSY
          </h1>

          <p style={{
            color: '#34495E',
            fontSize: 16,
            marginBottom: 30,
            textAlign: 'center',
            lineHeight: 1.6,
            maxWidth: 280,
          }}>
            Tap to hop forward.<br />
            Swipe to move sideways.<br />
            Cross roads, rivers, and rails!
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
            PLAY
          </button>
          
          {highScore > 0 && (
            <p style={{ color: '#666', marginTop: 20 }}>
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
          background: 'rgba(0,0,0,0.8)',
        }}>
          <div style={{ fontSize: 60, marginBottom: 10 }}>
            {gameRef.current.deathType === 'water' ? '💦' : 
             gameRef.current.deathType === 'eagle' ? '🦅' : '💥'}
          </div>
          <h1 style={{ color: '#FFF', fontSize: 48, marginBottom: 10 }}>
            {gameRef.current.deathType === 'water' ? 'SPLASH!' : 
             gameRef.current.deathType === 'eagle' ? 'SNATCHED!' : 'SPLAT!'}
          </h1>
          <p style={{ color: '#FFF', fontSize: 24, marginBottom: 10 }}>
            Score: {score}
          </p>
          {score >= highScore && score > 0 && (
            <p style={{ color: '#FFD700', fontSize: 18, marginBottom: 20 }}>
              NEW HIGH SCORE!
            </p>
          )}
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
            TRY AGAIN
          </button>
        </div>
      )}
    </div>
  );
}
