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

// HAUNT palette (Indie Bite Dark)
const THEME = {
  void: '#09090b',
  wall: '#18181b',
  floor: '#1c1917',
  danger: '#7f1d1d',
  flashlight: '#fef9c3',
  presence: '#7c3aed',
  exit: '#22c55e',
  text: '#a1a1aa',
  energy: '#a855f7',
};

const GAME_ID = 'haunt';

// Social colors
const SCORE_FLOW_COLORS: ScoreFlowColors = {
  bg: THEME.void,
  surface: '#18181b',
  primary: THEME.presence,
  secondary: THEME.exit,
  text: '#fafafa',
  muted: THEME.text,
  error: '#ef4444',
};

const LEADERBOARD_COLORS: LeaderboardColors = {
  bg: THEME.void,
  surface: '#18181b',
  primary: THEME.presence,
  secondary: THEME.exit,
  text: '#fafafa',
  muted: THEME.text,
};

const GRID_W = 5;
const GRID_H = 4;
const ROOM_SIZE = 70;
const WALL_THICK = 4;

// Room types
const ROOM_EMPTY = 0;
const ROOM_ENTRANCE = 1;
const ROOM_EXIT = 2;
const ROOM_DANGER = 3;

// Layout: entrance top-left, exit bottom-right, danger center
function createLevel(): number[][] {
  const grid: number[][] = [];
  for (let y = 0; y < GRID_H; y++) {
    const row: number[] = [];
    for (let x = 0; x < GRID_W; x++) {
      row.push(ROOM_EMPTY);
    }
    grid.push(row);
  }
  grid[0][0] = ROOM_ENTRANCE;
  grid[GRID_H - 1][GRID_W - 1] = ROOM_EXIT;
  grid[Math.floor(GRID_H / 2)][Math.floor(GRID_W / 2)] = ROOM_DANGER;
  return grid;
}

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

function playFlicker() {
  if (!audioCtx || !masterGain) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.value = 60;
  gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.1);
  osc.connect(gain);
  gain.connect(masterGain);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.1);
}

function playSlam() {
  if (!audioCtx || !masterGain) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'square';
  osc.frequency.value = 80;
  gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.2);
  osc.connect(gain);
  gain.connect(masterGain);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.2);
}

function playWhisper() {
  if (!audioCtx || !masterGain) return;
  const bufferSize = audioCtx.sampleRate * 0.3;
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * 0.1;
  }
  const noise = audioCtx.createBufferSource();
  noise.buffer = buffer;
  const filter = audioCtx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 800;
  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
  noise.connect(filter);
  filter.connect(gain);
  gain.connect(masterGain);
  noise.start();
}

function playScream() {
  if (!audioCtx || !masterGain) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(600, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(200, audioCtx.currentTime + 0.3);
  gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
  osc.connect(gain);
  gain.connect(masterGain);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.3);
}

function playDeath() {
  if (!audioCtx || !masterGain) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sine';
  osc.frequency.value = 50;
  gain.gain.setValueAtTime(0.4, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 1);
  osc.connect(gain);
  gain.connect(masterGain);
  osc.start();
  osc.stop(audioCtx.currentTime + 1);
}

function playWin() {
  if (!audioCtx || !masterGain) return;
  [330, 392, 523].forEach((freq, i) => {
    setTimeout(() => {
      if (!audioCtx || !masterGain) return;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(masterGain);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.3);
    }, i * 100);
  });
}

interface Tourist {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  scared: boolean;
  scaredTimer: number;
}

interface Scare {
  x: number;
  y: number;
  type: 'flicker' | 'slam' | 'whisper';
  timer: number;
}

export default function HauntGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<'start' | 'playing' | 'won' | 'lost'>('start');
  const [score, setScore] = useState(0);
  const [energy, setEnergy] = useState(100);
  const [tourists, setTourists] = useState(0);
  const [selectedScare, setSelectedScare] = useState<'flicker' | 'slam' | 'whisper'>('flicker');
  
  // Social integration state
  const [socialLoaded, setSocialLoaded] = useState(false);
  const [submittedEntryId, setSubmittedEntryId] = useState<number | null>(null);
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  usePixelpitSocial(socialLoaded);

  const gameRef = useRef({
    level: createLevel(),
    tourist: null as Tourist | null,
    scares: [] as Scare[],
    fearMap: Array(GRID_H).fill(null).map(() => Array(GRID_W).fill(0)),
    energy: 100,
    score: 0,
    touristsEscaped: 0,
    running: false,
    spawnTimer: 0,
  });

  const startGame = useCallback(() => {
    initAudio();
    const game = gameRef.current;
    game.level = createLevel();
    game.tourist = null;
    game.scares = [];
    game.fearMap = Array(GRID_H).fill(null).map(() => Array(GRID_W).fill(0));
    game.energy = 100;
    game.score = 0;
    game.touristsEscaped = 0;
    game.running = true;
    game.spawnTimer = 60;
    setScore(0);
    setEnergy(100);
    setTourists(0);
    setSubmittedEntryId(null);
    setShowLeaderboard(false);
    setGameState('playing');
  }, []);

  const triggerScare = useCallback((gridX: number, gridY: number, type: 'flicker' | 'slam' | 'whisper') => {
    const game = gameRef.current;
    if (!game.running) return;
    
    const costs = { flicker: 5, slam: 15, whisper: 25 };
    const cost = costs[type];
    if (game.energy < cost) return;
    
    game.energy -= cost;
    setEnergy(game.energy);
    
    game.scares.push({ x: gridX, y: gridY, type, timer: 30 });
    game.fearMap[gridY][gridX] = Math.min(100, game.fearMap[gridY][gridX] + (type === 'flicker' ? 20 : type === 'slam' ? 50 : 80));
    
    if (type === 'flicker') playFlicker();
    else if (type === 'slam') playSlam();
    else playWhisper();
    
    // Scare tourist if in adjacent room
    if (game.tourist) {
      const dx = Math.abs(game.tourist.x - gridX);
      const dy = Math.abs(game.tourist.y - gridY);
      if (dx <= 1 && dy <= 1) {
        game.tourist.scared = true;
        game.tourist.scaredTimer = 60;
        playScream();
      }
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const totalW = GRID_W * ROOM_SIZE + WALL_THICK * 2;
    const totalH = GRID_H * ROOM_SIZE + WALL_THICK * 2 + 80;
    canvas.width = totalW;
    canvas.height = totalH;

    let animationId: number;

    const findPath = (fromX: number, fromY: number, toX: number, toY: number, fearMap: number[][]): { x: number; y: number } | null => {
      const neighbors = [
        { x: fromX - 1, y: fromY },
        { x: fromX + 1, y: fromY },
        { x: fromX, y: fromY - 1 },
        { x: fromX, y: fromY + 1 },
      ].filter(n => n.x >= 0 && n.x < GRID_W && n.y >= 0 && n.y < GRID_H);
      
      if (neighbors.length === 0) return null;
      
      let best = neighbors[0];
      let bestScore = Infinity;
      
      for (const n of neighbors) {
        const dist = Math.abs(n.x - toX) + Math.abs(n.y - toY);
        const fear = fearMap[n.y][n.x];
        const score = dist + fear * 0.5;
        if (score < bestScore) {
          bestScore = score;
          best = n;
        }
      }
      
      return best;
    };

    const update = () => {
      const game = gameRef.current;
      if (!game.running) return;

      // Spawn tourist
      if (!game.tourist && game.spawnTimer <= 0) {
        game.tourist = {
          x: 0, y: 0,
          targetX: GRID_W - 1, targetY: GRID_H - 1,
          scared: false, scaredTimer: 0,
        };
        game.spawnTimer = 180;
      }
      game.spawnTimer--;

      // Update tourist
      if (game.tourist) {
        const t = game.tourist;
        
        if (t.scaredTimer > 0) {
          t.scaredTimer--;
          if (t.scaredTimer === 0) t.scared = false;
        }
        
        if (!t.scared && Math.random() < 0.03) {
          const next = findPath(t.x, t.y, t.targetX, t.targetY, game.fearMap);
          if (next) {
            t.x = next.x;
            t.y = next.y;
          }
        }
        
        const roomType = game.level[t.y][t.x];
        if (roomType === ROOM_EXIT) {
          game.touristsEscaped++;
          game.score += 100;
          game.energy = Math.min(100, game.energy + 20);
          setScore(game.score);
          setEnergy(game.energy);
          setTourists(game.touristsEscaped);
          playWin();
          game.tourist = null;
          
          if (game.touristsEscaped >= 5) {
            game.running = false;
            setGameState('won');
            fetch('/api/pixelpit/stats', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ game: GAME_ID }),
            }).catch(() => {});
          }
        } else if (roomType === ROOM_DANGER) {
          playDeath();
          game.running = false;
          setGameState('lost');
          fetch('/api/pixelpit/stats', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ game: GAME_ID }),
          }).catch(() => {});
        }
      }

      // Decay fear map
      for (let y = 0; y < GRID_H; y++) {
        for (let x = 0; x < GRID_W; x++) {
          game.fearMap[y][x] = Math.max(0, game.fearMap[y][x] - 0.5);
        }
      }

      // Update scares
      game.scares = game.scares.filter(s => {
        s.timer--;
        return s.timer > 0;
      });

      // Energy drain check
      if (game.energy <= 0) {
        game.running = false;
        setGameState('lost');
      }
    };

    const draw = () => {
      const game = gameRef.current;
      
      ctx.fillStyle = THEME.void;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const offsetX = WALL_THICK;
      const offsetY = WALL_THICK;

      for (let y = 0; y < GRID_H; y++) {
        for (let x = 0; x < GRID_W; x++) {
          const rx = offsetX + x * ROOM_SIZE;
          const ry = offsetY + y * ROOM_SIZE;
          const roomType = game.level[y][x];
          
          let floorColor = THEME.floor;
          if (roomType === ROOM_DANGER) floorColor = THEME.danger;
          else if (roomType === ROOM_EXIT) floorColor = '#1a2e1a';
          
          const fear = game.fearMap[y][x];
          if (fear > 0) {
            const intensity = Math.min(fear / 100, 1);
            floorColor = `rgba(124, 58, 237, ${intensity * 0.3})`;
          }
          
          ctx.fillStyle = floorColor;
          ctx.fillRect(rx, ry, ROOM_SIZE, ROOM_SIZE);
          
          ctx.strokeStyle = THEME.wall;
          ctx.lineWidth = 2;
          ctx.strokeRect(rx, ry, ROOM_SIZE, ROOM_SIZE);
          
          if (roomType === ROOM_ENTRANCE) {
            ctx.fillStyle = THEME.text;
            ctx.font = '10px monospace';
            ctx.fillText('IN', rx + 5, ry + 15);
          } else if (roomType === ROOM_EXIT) {
            ctx.fillStyle = THEME.exit;
            ctx.font = '12px monospace';
            ctx.fillText('EXIT', rx + 5, ry + 15);
          } else if (roomType === ROOM_DANGER) {
            ctx.fillStyle = '#ef4444';
            ctx.font = '16px monospace';
            ctx.fillText('☠', rx + ROOM_SIZE/2 - 8, ry + ROOM_SIZE/2 + 6);
          }
        }
      }

      for (const scare of game.scares) {
        const rx = offsetX + scare.x * ROOM_SIZE;
        const ry = offsetY + scare.y * ROOM_SIZE;
        ctx.fillStyle = `rgba(124, 58, 237, ${scare.timer / 30 * 0.5})`;
        ctx.fillRect(rx, ry, ROOM_SIZE, ROOM_SIZE);
        
        ctx.fillStyle = '#fff';
        ctx.font = '20px monospace';
        const icon = scare.type === 'flicker' ? '💨' : scare.type === 'slam' ? '🚪' : '👻';
        ctx.fillText(icon, rx + ROOM_SIZE/2 - 10, ry + ROOM_SIZE/2 + 7);
      }

      if (game.tourist) {
        const t = game.tourist;
        const tx = offsetX + t.x * ROOM_SIZE + ROOM_SIZE / 2;
        const ty = offsetY + t.y * ROOM_SIZE + ROOM_SIZE / 2;
        
        const gradient = ctx.createRadialGradient(tx, ty, 0, tx, ty, ROOM_SIZE);
        gradient.addColorStop(0, 'rgba(254, 249, 195, 0.3)');
        gradient.addColorStop(1, 'rgba(254, 249, 195, 0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(offsetX, offsetY, GRID_W * ROOM_SIZE, GRID_H * ROOM_SIZE);
        
        ctx.fillStyle = t.scared ? '#ef4444' : THEME.flashlight;
        ctx.beginPath();
        ctx.arc(tx, ty, 12, 0, Math.PI * 2);
        ctx.fill();
        
        if (t.scared) {
          ctx.fillStyle = '#fff';
          ctx.font = 'bold 14px monospace';
          ctx.fillText('!', tx - 4, ty - 18);
        }
      }

      // HUD
      const hudY = GRID_H * ROOM_SIZE + WALL_THICK * 2 + 20;
      
      ctx.fillStyle = THEME.text;
      ctx.font = '14px monospace';
      ctx.fillText(`Energy: ${Math.floor(game.energy)}`, 10, hudY);
      ctx.fillText(`Saved: ${game.touristsEscaped}/5`, 10, hudY + 20);
      
      ctx.fillStyle = THEME.energy;
      ctx.fillRect(90, hudY - 12, game.energy, 10);
      ctx.strokeStyle = THEME.wall;
      ctx.strokeRect(90, hudY - 12, 100, 10);
    };

    const gameLoop = () => {
      update();
      draw();
      animationId = requestAnimationFrame(gameLoop);
    };
    animationId = requestAnimationFrame(gameLoop);

    const handleClick = (e: MouseEvent | TouchEvent) => {
      if (gameState !== 'playing') return;
      e.preventDefault();
      
      const rect = canvas.getBoundingClientRect();
      let clientX: number, clientY: number;
      
      if ('touches' in e) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else {
        clientX = e.clientX;
        clientY = e.clientY;
      }
      
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      
      const gridX = Math.floor((x - WALL_THICK) / ROOM_SIZE);
      const gridY = Math.floor((y - WALL_THICK) / ROOM_SIZE);
      
      if (gridX >= 0 && gridX < GRID_W && gridY >= 0 && gridY < GRID_H) {
        if ('ctrlKey' in e && (e.ctrlKey || e.metaKey)) {
          triggerScare(gridX, gridY, 'whisper');
        } else if ('shiftKey' in e && e.shiftKey) {
          triggerScare(gridX, gridY, 'slam');
        } else {
          triggerScare(gridX, gridY, selectedScare);
        }
      }
    };

    canvas.addEventListener('click', handleClick);
    canvas.addEventListener('touchstart', handleClick as EventListener, { passive: false });

    return () => {
      cancelAnimationFrame(animationId);
      canvas.removeEventListener('click', handleClick);
      canvas.removeEventListener('touchstart', handleClick as EventListener);
    };
  }, [gameState, triggerScare, selectedScare]);

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
        background: THEME.void,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        fontFamily: 'ui-monospace, monospace',
      }}>
        {gameState === 'start' && (
          <div style={{ textAlign: 'center' }}>
            <h1 style={{ color: THEME.presence, fontSize: 48, marginBottom: 20, textShadow: `0 0 30px ${THEME.presence}` }}>
              HAUNT
            </h1>
            <p style={{ color: THEME.text, marginBottom: 10 }}>You are a haunted house.</p>
            <p style={{ color: THEME.text, marginBottom: 10 }}>Guide tourists to the exit.</p>
            <p style={{ color: '#ef4444', marginBottom: 30 }}>Don&apos;t let them find the skull room.</p>
            <button
              onClick={startGame}
              style={{
                background: THEME.presence,
                color: '#fff',
                border: 'none',
                padding: '16px 40px',
                fontSize: 18,
                cursor: 'pointer',
                borderRadius: 4,
              }}
            >
              Haunt
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
          <>
            <canvas ref={canvasRef} style={{ imageRendering: 'pixelated' }} />
            
            <div style={{
              display: 'flex',
              gap: 10,
              marginTop: 15,
            }}>
              {[
                { type: 'flicker' as const, icon: '💨', cost: 5 },
                { type: 'slam' as const, icon: '🚪', cost: 15 },
                { type: 'whisper' as const, icon: '👻', cost: 25 },
              ].map(({ type, icon, cost }) => (
                <button
                  key={type}
                  onClick={() => setSelectedScare(type)}
                  style={{
                    background: selectedScare === type ? THEME.presence : THEME.wall,
                    border: selectedScare === type ? `2px solid ${THEME.energy}` : '2px solid transparent',
                    color: '#fff',
                    padding: '12px 16px',
                    fontSize: 20,
                    cursor: 'pointer',
                    borderRadius: 8,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 4,
                    minWidth: 70,
                  }}
                >
                  <span>{icon}</span>
                  <span style={{ fontSize: 10, color: THEME.text }}>{cost}</span>
                </button>
              ))}
            </div>
            
            <p style={{
              color: THEME.text,
              fontSize: 10,
              marginTop: 10,
              textAlign: 'center',
            }}>
              select scare type, then tap a room
            </p>
          </>
        )}

        {gameState === 'won' && (
          <div style={{ textAlign: 'center', maxWidth: 400, width: '100%' }}>
            <h1 style={{ color: THEME.exit, fontSize: 48, marginBottom: 20 }}>
              ALL SAFE
            </h1>
            <p style={{ color: THEME.text, marginBottom: 30 }}>
              5 tourists escaped. You protected them all.
            </p>

            {/* ScoreFlow */}
            <ScoreFlow
              score={5}
              gameId={GAME_ID}
              colors={SCORE_FLOW_COLORS}
              xpDivisor={1}
              onRankReceived={(rank, entryId) => setSubmittedEntryId(entryId ?? null)}
            />

            {/* Share button */}
            <div style={{ marginTop: 20 }}>
              <ShareButtonContainer
                id="share-btn-haunt-win"
                url={`${typeof window !== 'undefined' ? window.location.origin : ''}/pixelpit/arcade/haunt/share/5`}
                text={`I protected all 5 tourists on HAUNT! Can you guide them safely?`}
                style="minimal"
                socialLoaded={socialLoaded}
              />
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 20 }}>
              <button
                onClick={() => setShowLeaderboard(!showLeaderboard)}
                style={{
                  background: 'transparent',
                  color: THEME.text,
                  border: `1px solid ${THEME.text}`,
                  padding: '12px 20px',
                  fontSize: 14,
                  cursor: 'pointer',
                  borderRadius: 4,
                }}
              >
                {showLeaderboard ? 'Hide' : 'Leaderboard'}
              </button>
              <button
                onClick={startGame}
                style={{
                  background: THEME.presence,
                  color: '#fff',
                  border: 'none',
                  padding: '12px 30px',
                  fontSize: 16,
                  cursor: 'pointer',
                  borderRadius: 4,
                }}
              >
                Haunt Again
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

        {gameState === 'lost' && (
          <div style={{ textAlign: 'center', maxWidth: 400, width: '100%' }}>
            <h1 style={{ color: '#ef4444', fontSize: 48, marginBottom: 20 }}>
              {energy <= 0 ? 'FADED AWAY' : 'SOMEONE DIED'}
            </h1>
            <p style={{ color: THEME.text, marginBottom: 10 }}>
              {energy <= 0 ? 'You ran out of energy.' : 'A tourist found the danger room.'}
            </p>
            <p style={{ color: THEME.text, marginBottom: 30 }}>
              Tourists saved: {tourists}
            </p>

            {/* ScoreFlow for partial progress */}
            {tourists > 0 && (
              <ScoreFlow
                score={tourists}
                gameId={GAME_ID}
                colors={SCORE_FLOW_COLORS}
                xpDivisor={1}
                onRankReceived={(rank, entryId) => setSubmittedEntryId(entryId ?? null)}
              />
            )}

            {/* Share button */}
            <div style={{ marginTop: 20 }}>
              <ShareButtonContainer
                id="share-btn-haunt-lose"
                url={`${typeof window !== 'undefined' ? window.location.origin : ''}/pixelpit/arcade/haunt/share/${tourists}`}
                text={`I saved ${tourists}/5 tourists on HAUNT before ${energy <= 0 ? 'fading away' : 'someone died'}. Can you do better?`}
                style="minimal"
                socialLoaded={socialLoaded}
              />
            </div>

            <button
              onClick={startGame}
              style={{
                marginTop: 20,
                background: THEME.presence,
                color: '#fff',
                border: 'none',
                padding: '16px 40px',
                fontSize: 18,
                cursor: 'pointer',
                borderRadius: 4,
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
