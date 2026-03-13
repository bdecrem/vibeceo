'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import Script from 'next/script';
import {
  ScoreFlow,
  Leaderboard,
  ShareButtonContainer,
  ShareModal,
  usePixelpitSocial,
  type ScoreFlowColors,
  type LeaderboardColors,
  type ProgressionResult,
} from '@/app/pixelpit/components';

// --- Constants ---
const GAME_ID = 'sushi';
const GAME_NAME = 'SUSHI TRAIN';
const MAX_MISSES = 5;

const COLORS = {
  bg: '#000000',
  surface: '#1a1a1a',
  primary: '#FFD700',    // gold
  secondary: '#7B68EE',  // purple
  text: '#D4A574',       // warm brown
  muted: '#71717a',
  error: '#FF6B6B',
  teal: '#2D9596',
};

const SCORE_FLOW_COLORS: ScoreFlowColors = {
  bg: COLORS.bg,
  surface: COLORS.surface,
  primary: COLORS.primary,
  secondary: COLORS.secondary,
  text: '#f8fafc',
  muted: COLORS.muted,
  error: COLORS.error,
};

const LEADERBOARD_COLORS: LeaderboardColors = {
  bg: COLORS.bg,
  surface: COLORS.surface,
  primary: COLORS.primary,
  secondary: COLORS.secondary,
  text: '#f8fafc',
  muted: COLORS.muted,
};

// Sushi types
const SUSHI_TYPES = [
  { emoji: '🍣', name: 'nigiri', color: '#FFD700' },
  { emoji: '🍱', name: 'bento', color: '#2D9596' },
  { emoji: '🍤', name: 'tempura', color: '#FF69B4' },
  { emoji: '🍙', name: 'onigiri', color: '#D4A574' },
  { emoji: '🍜', name: 'ramen', color: '#FF6347' },
];

type SushiType = typeof SUSHI_TYPES[number];

interface Plate {
  x: number;
  y: number;
  type: SushiType;
  radius: number;
  id: number;
}

interface Customer {
  x: number;
  y: number;
  wantedType: SushiType;
  radius: number;
  patience: number;
  id: number;
}

interface GameState {
  plates: Plate[];
  customers: Customer[];
  score: number;
  served: number;
  missed: number;
  beltSpeed: number;
  spawnRate: number;
  customerRate: number;
  dragging: Plate | null;
  dragOffset: { x: number; y: number };
  gameOver: boolean;
  lastPlateSpawn: number;
  lastCustomerSpawn: number;
  statusText: string;
  statusColor: string;
}

// Audio
let audioCtx: AudioContext | null = null;

function initAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
}

function playTone(freq: number, duration = 0.1, type: OscillatorType = 'sine') {
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.frequency.value = freq;
  osc.type = type;
  gain.gain.value = 0.2;
  osc.start();
  gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
  osc.stop(audioCtx.currentTime + duration);
}

export default function SushiTrainGame() {
  const [screenState, setScreenState] = useState<'start' | 'playing' | 'gameover' | 'leaderboard'>('start');
  const [score, setScore] = useState(0);
  const [socialLoaded, setSocialLoaded] = useState(false);
  const [submittedEntryId, setSubmittedEntryId] = useState<number | null>(null);
  const [progression, setProgression] = useState<ProgressionResult | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);

  const { user } = usePixelpitSocial(socialLoaded);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<GameState | null>(null);
  const animRef = useRef<number>(0);
  const scoreRef = useRef(0);

  const GAME_URL = typeof window !== 'undefined'
    ? `${window.location.origin}/pixelpit/arcade/${GAME_ID}`
    : `https://pixelpit.gg/pixelpit/arcade/${GAME_ID}`;

  // --- Group code detection ---
  useEffect(() => {
    if (!socialLoaded || typeof window === 'undefined') return;
    if (!window.PixelpitSocial) return;

    const params = new URLSearchParams(window.location.search);
    if (params.has('logout')) {
      window.PixelpitSocial.logout();
      params.delete('logout');
      const newUrl = params.toString()
        ? `${window.location.pathname}?${params.toString()}`
        : window.location.pathname;
      window.history.replaceState({}, '', newUrl);
      window.location.reload();
      return;
    }

    const groupCode = window.PixelpitSocial.getGroupCodeFromUrl();
    if (groupCode) {
      window.PixelpitSocial.storeGroupCode(groupCode);
    }
  }, [socialLoaded]);

  // --- Canvas game loop ---
  useEffect(() => {
    if (screenState !== 'playing') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    function resize() {
      canvas!.width = window.innerWidth;
      canvas!.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    // --- Upbeat K-pop-ish background music via Web Audio ---
    let musicPlaying = true;
    const musicCtx = audioCtx!;
    const masterGain = musicCtx.createGain();
    masterGain.gain.value = 0.12;
    masterGain.connect(musicCtx.destination);

    // Bass line loop
    const bassNotes = [261.63, 329.63, 293.66, 349.23, 261.63, 329.63, 392.00, 349.23]; // C4 E4 D4 F4 C4 E4 G4 F4
    let bassIndex = 0;
    const bassInterval = setInterval(() => {
      if (!musicPlaying) return;
      const osc = musicCtx.createOscillator();
      const g = musicCtx.createGain();
      osc.connect(g);
      g.connect(masterGain);
      osc.type = 'triangle';
      osc.frequency.value = bassNotes[bassIndex % bassNotes.length] / 2;
      g.gain.value = 0.3;
      osc.start();
      g.gain.exponentialRampToValueAtTime(0.01, musicCtx.currentTime + 0.2);
      osc.stop(musicCtx.currentTime + 0.25);
      bassIndex++;
    }, 250);

    // Melody loop — bouncy synth
    const melodyNotes = [523.25, 659.25, 783.99, 659.25, 587.33, 523.25, 698.46, 783.99, 0, 523.25, 659.25, 587.33, 523.25, 783.99, 698.46, 659.25];
    let melodyIndex = 0;
    const melodyInterval = setInterval(() => {
      if (!musicPlaying) return;
      const note = melodyNotes[melodyIndex % melodyNotes.length];
      melodyIndex++;
      if (note === 0) return; // rest
      const osc = musicCtx.createOscillator();
      const g = musicCtx.createGain();
      osc.connect(g);
      g.connect(masterGain);
      osc.type = 'square';
      osc.frequency.value = note;
      g.gain.value = 0.08;
      osc.start();
      g.gain.exponentialRampToValueAtTime(0.01, musicCtx.currentTime + 0.12);
      osc.stop(musicCtx.currentTime + 0.15);
    }, 125);

    // Hi-hat rhythm
    const hatInterval = setInterval(() => {
      if (!musicPlaying) return;
      const bufferSize = musicCtx.sampleRate * 0.03;
      const buffer = musicCtx.createBuffer(1, bufferSize, musicCtx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * 0.3;
      const src = musicCtx.createBufferSource();
      const g = musicCtx.createGain();
      src.buffer = buffer;
      src.connect(g);
      g.connect(masterGain);
      g.gain.value = 0.15;
      src.start();
    }, 125);

    const beltY = () => canvas!.height * 0.85;
    const beltHeight = 80;

    const gs: GameState = {
      plates: [],
      customers: [],
      score: 0,
      served: 0,
      missed: 0,
      beltSpeed: 1.5,
      spawnRate: 2000,
      customerRate: 4000,
      dragging: null,
      dragOffset: { x: 0, y: 0 },
      gameOver: false,
      lastPlateSpawn: 0,
      lastCustomerSpawn: 0,
      statusText: 'Drag sushi to customers!',
      statusColor: COLORS.teal,
    };
    gameRef.current = gs;

    // Fair item rotation: shuffle bag ensures every type appears regularly
    let plateBag: SushiType[] = [];
    function getNextPlateType(): SushiType {
      if (plateBag.length === 0) {
        // Refill with 3 copies of each type (15 items), then shuffle
        plateBag = [...SUSHI_TYPES, ...SUSHI_TYPES, ...SUSHI_TYPES];
        for (let i = plateBag.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [plateBag[i], plateBag[j]] = [plateBag[j], plateBag[i]];
        }
      }
      return plateBag.pop()!;
    }

    let customerBag: SushiType[] = [];
    function getNextCustomerType(): SushiType {
      if (customerBag.length === 0) {
        customerBag = [...SUSHI_TYPES, ...SUSHI_TYPES, ...SUSHI_TYPES];
        for (let i = customerBag.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [customerBag[i], customerBag[j]] = [customerBag[j], customerBag[i]];
        }
      }
      return customerBag.pop()!;
    }

    function spawnPlate() {
      const type = getNextPlateType();
      gs.plates.push({
        x: canvas!.width + 50,
        y: beltY(),
        type,
        radius: 30,
        id: Math.random(),
      });
    }

    // Fixed customer slots — 3 columns, each gets its own non-overlapping zone
    const CUSTOMER_SLOTS = [
      { col: 0 }, // left
      { col: 1 }, // center
      { col: 2 }, // right
    ];

    function spawnCustomer() {
      if (gs.customers.length >= 3) return;
      const type = getNextCustomerType();

      // Find which slots are taken
      const topMargin = 100; // below HUD
      const bottomMargin = beltY() - 80; // above belt
      const midY = topMargin + (bottomMargin - topMargin) / 2;

      const colWidth = canvas!.width / 3;
      // Track which columns are occupied using stored col property
      const takenCols = new Set(gs.customers.map(c => (c as any)._col as number));

      // Pick first available column
      let col = -1;
      for (let i = 0; i < 3; i++) {
        if (!takenCols.has(i)) { col = i; break; }
      }
      if (col === -1) return; // all slots full

      // Center precisely in column — no random offset to prevent overlap
      const x = colWidth * col + colWidth / 2;
      // Stagger Y slightly per column to avoid visual monotony
      const yOffsets = [0, -25, 10];
      const y = midY + yOffsets[col];

      const customer: any = {
        x,
        y,
        wantedType: type,
        radius: 40,
        patience: 1.0,
        id: Math.random(),
        _col: col,
      };
      gs.customers.push(customer);
    }

    function checkCollision(x: number, y: number, target: { x: number; y: number; radius: number }) {
      const dx = x - target.x;
      const dy = y - target.y;
      return Math.sqrt(dx * dx + dy * dy) < (target.radius + 30);
    }

    function endGame() {
      gs.gameOver = true;
      musicPlaying = false;
      scoreRef.current = gs.score;
      setScore(gs.score);
      playTone(300, 0.5, 'sawtooth');
      setTimeout(() => playTone(200, 0.5, 'sawtooth'), 200);
      fetch('/api/pixelpit/stats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ game: GAME_ID }),
      }).catch(() => {});
      setScreenState('gameover');
    }

    function drawBelt() {
      const by = beltY();
      ctx!.fillStyle = '#8B7355';
      ctx!.fillRect(0, by - beltHeight / 2, canvas!.width, beltHeight);
      ctx!.strokeStyle = '#5C4033';
      ctx!.lineWidth = 2;
      ctx!.beginPath();
      ctx!.moveTo(0, by - beltHeight / 2);
      ctx!.lineTo(canvas!.width, by - beltHeight / 2);
      ctx!.stroke();
      ctx!.beginPath();
      ctx!.moveTo(0, by + beltHeight / 2);
      ctx!.lineTo(canvas!.width, by + beltHeight / 2);
      ctx!.stroke();
    }

    function drawPlate(plate: Plate, alpha = 1) {
      ctx!.save();
      ctx!.globalAlpha = alpha;
      ctx!.fillStyle = '#2D9596';
      ctx!.beginPath();
      ctx!.arc(plate.x, plate.y, plate.radius, 0, Math.PI * 2);
      ctx!.fill();
      ctx!.strokeStyle = '#FFD700';
      ctx!.lineWidth = 3;
      ctx!.stroke();
      ctx!.font = '32px Arial';
      ctx!.textAlign = 'center';
      ctx!.textBaseline = 'middle';
      ctx!.fillText(plate.type.emoji, plate.x, plate.y);
      ctx!.restore();
    }

    function drawCustomer(customer: Customer) {
      ctx!.fillStyle = '#7B68EE';
      ctx!.beginPath();
      ctx!.arc(customer.x, customer.y, customer.radius, 0, Math.PI * 2);
      ctx!.fill();
      ctx!.font = '40px Arial';
      ctx!.textAlign = 'center';
      ctx!.textBaseline = 'middle';
      ctx!.fillText('😋', customer.x, customer.y);

      // Thought bubble — positioned ABOVE customer to avoid overlapping neighbors
      const bubbleX = customer.x;
      const bubbleY = customer.y - customer.radius - 30;
      ctx!.fillStyle = '#ffffffe6';
      ctx!.beginPath();
      ctx!.arc(bubbleX, bubbleY, 22, 0, Math.PI * 2);
      ctx!.fill();
      // Little connector dots
      ctx!.beginPath();
      ctx!.arc(customer.x + 8, customer.y - customer.radius - 5, 4, 0, Math.PI * 2);
      ctx!.fill();
      ctx!.font = '22px Arial';
      ctx!.fillText(customer.wantedType.emoji, bubbleX, bubbleY);

      // Patience bar
      const barWidth = 60;
      const barHeight = 8;
      const barX = customer.x - barWidth / 2;
      const barY = customer.y + customer.radius + 10;
      ctx!.fillStyle = '#333';
      ctx!.fillRect(barX, barY, barWidth, barHeight);
      const pColor = customer.patience > 0.5 ? '#2D9596' : customer.patience > 0.25 ? '#FFD700' : '#FF6B6B';
      ctx!.fillStyle = pColor;
      ctx!.fillRect(barX, barY, barWidth * customer.patience, barHeight);
    }

    function update(timestamp: number) {
      if (gs.gameOver) return;

      // Spawn plates
      if (timestamp - gs.lastPlateSpawn > gs.spawnRate) {
        spawnPlate();
        gs.lastPlateSpawn = timestamp;
      }

      // Spawn customers
      if (timestamp - gs.lastCustomerSpawn > gs.customerRate) {
        spawnCustomer();
        gs.lastCustomerSpawn = timestamp;
      }

      // Update plates — scrolling off is just lost opportunity, not a fail
      gs.plates = gs.plates.filter(plate => {
        if (plate !== gs.dragging) {
          plate.x -= gs.beltSpeed;
        }
        if (plate.x < -50 && plate !== gs.dragging) {
          return false;
        }
        return true;
      });

      // Update customers — patience drains smoothly, game over when ANY bar hits 0
      // Drain rate scales with difficulty: 0.0003 (easy) → 0.0008 (hard)
      const drainProgress = gs.served >= 5 ? Math.min((gs.served - 5) / 15, 1) : 0;
      const drainRate = 0.0003 + drainProgress * 0.0005;
      gs.customers = gs.customers.filter(customer => {
        customer.patience -= drainRate;
        if (customer.patience <= 0) {
          customer.patience = 0;
          gs.statusText = 'Customer left hungry!';
          gs.statusColor = '#FF6B6B';
          playTone(150, 0.3, 'sawtooth');
          endGame();
          return false;
        }
        return true;
      });

      // Difficulty ramp — gradual from 5 served, challenging by 20
      // Belt: 1.5 → 4.0 | Customer spawn: 4000ms → 1500ms | Patience drain: 0.0003 → 0.0008
      if (gs.served >= 5) {
        const progress = Math.min((gs.served - 5) / 15, 1); // 0 at 5 served, 1 at 20 served
        gs.beltSpeed = 1.5 + progress * 2.5;           // 1.5 → 4.0
        gs.customerRate = 4000 - progress * 2500;       // 4000ms → 1500ms
        gs.spawnRate = 2000 - progress * 1000;          // 2000ms → 1000ms (more plates)
      }
    }

    function draw() {
      // Light color gradient background
      const grad = ctx!.createLinearGradient(0, 0, 0, canvas!.height);
      grad.addColorStop(0, '#FFF5E6');    // warm cream top
      grad.addColorStop(0.5, '#FFE0F0');  // soft pink middle
      grad.addColorStop(1, '#E6F0FF');    // light blue bottom
      ctx!.fillStyle = grad;
      ctx!.fillRect(0, 0, canvas!.width, canvas!.height);

      // Score HUD — dark text on light bg
      ctx!.font = 'bold 32px ui-monospace, monospace';
      ctx!.textAlign = 'left';
      ctx!.textBaseline = 'top';
      ctx!.fillStyle = '#B8860B';
      ctx!.shadowColor = '#FFD70080';
      ctx!.shadowBlur = 10;
      ctx!.fillText(`${gs.score} pts`, 20, 20);
      ctx!.shadowBlur = 0;

      ctx!.font = '16px ui-monospace, monospace';
      ctx!.fillStyle = gs.statusColor;
      ctx!.fillText(gs.statusText, 20, 58);

      ctx!.textAlign = 'left';

      drawBelt();

      gs.plates.forEach(plate => {
        if (plate !== gs.dragging) drawPlate(plate);
      });

      gs.customers.forEach(customer => drawCustomer(customer));

      if (gs.dragging) drawPlate(gs.dragging);
    }

    function gameLoop(timestamp: number) {
      update(timestamp);
      draw();
      if (!gs.gameOver) {
        animRef.current = requestAnimationFrame(gameLoop);
      }
    }

    // Pointer handlers
    function getPos(e: MouseEvent | TouchEvent) {
      const rect = canvas!.getBoundingClientRect();
      const clientX = 'touches' in e ? e.touches[0]?.clientX ?? (e as TouchEvent).changedTouches[0].clientX : (e as MouseEvent).clientX;
      const clientY = 'touches' in e ? e.touches[0]?.clientY ?? (e as TouchEvent).changedTouches[0].clientY : (e as MouseEvent).clientY;
      return { x: clientX - rect.left, y: clientY - rect.top };
    }

    function handleStart(e: MouseEvent | TouchEvent) {
      if (gs.gameOver) return;
      e.preventDefault();
      const pos = getPos(e);
      for (const plate of gs.plates) {
        if (checkCollision(pos.x, pos.y, plate)) {
          gs.dragging = plate;
          gs.dragOffset = { x: plate.x - pos.x, y: plate.y - pos.y };
          canvas!.style.cursor = 'grabbing';
          playTone(440, 0.05);
          break;
        }
      }
    }

    function handleMove(e: MouseEvent | TouchEvent) {
      if (!gs.dragging) return;
      e.preventDefault();
      const pos = getPos(e);
      gs.dragging.x = pos.x + gs.dragOffset.x;
      gs.dragging.y = pos.y + gs.dragOffset.y;
    }

    function handleEnd(e: MouseEvent | TouchEvent) {
      if (!gs.dragging) return;
      e.preventDefault();
      const plate = gs.dragging;
      let served = false;

      for (let i = 0; i < gs.customers.length; i++) {
        const customer = gs.customers[i];
        if (checkCollision(plate.x, plate.y, customer)) {
          if (plate.type.name === customer.wantedType.name) {
            gs.score += 10;
            gs.served++;
            scoreRef.current = gs.score;
            setScore(gs.score);
            gs.statusText = 'Perfect! Customer happy!';
            gs.statusColor = '#2D9596';
            playTone(660, 0.15, 'triangle');
            setTimeout(() => playTone(880, 0.15, 'triangle'), 100);
            gs.customers.splice(i, 1);
            gs.plates = gs.plates.filter(p => p.id !== plate.id);
            served = true;
          } else {
            gs.statusText = 'Wrong dish!';
            gs.statusColor = '#FF6B6B';
            playTone(220, 0.2, 'sawtooth');
          }
          break;
        }
      }

      if (!served) {
        plate.x = canvas!.width + 50;
        plate.y = beltY();
      }

      gs.dragging = null;
      canvas!.style.cursor = 'grab';
    }

    canvas.addEventListener('touchstart', handleStart, { passive: false });
    canvas.addEventListener('touchmove', handleMove, { passive: false });
    canvas.addEventListener('touchend', handleEnd, { passive: false });
    canvas.addEventListener('mousedown', handleStart);
    canvas.addEventListener('mousemove', handleMove);
    canvas.addEventListener('mouseup', handleEnd);

    // Initial spawns
    spawnPlate();
    spawnCustomer();
    animRef.current = requestAnimationFrame(gameLoop);

    return () => {
      musicPlaying = false;
      clearInterval(bassInterval);
      clearInterval(melodyInterval);
      clearInterval(hatInterval);
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animRef.current);
      canvas.removeEventListener('touchstart', handleStart);
      canvas.removeEventListener('touchmove', handleMove);
      canvas.removeEventListener('touchend', handleEnd);
      canvas.removeEventListener('mousedown', handleStart);
      canvas.removeEventListener('mousemove', handleMove);
      canvas.removeEventListener('mouseup', handleEnd);
    };
  }, [screenState]);

  const startGame = useCallback(() => {
    initAudio();
    scoreRef.current = 0;
    setScore(0);
    setSubmittedEntryId(null);
    setProgression(null);
    setShowShareModal(false);
    setScreenState('playing');
  }, []);

  return (
    <>
      <Script
        src="/pixelpit/social.js"
        onLoad={() => setSocialLoaded(true)}
      />

      <style jsx global>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          background: ${COLORS.bg};
          font-family: ui-monospace, monospace;
          color: ${COLORS.text};
          overflow: hidden;
          user-select: none;
          -webkit-user-select: none;
          touch-action: none;
        }
      `}</style>

      {/* --- START SCREEN --- */}
      {screenState === 'start' && (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          textAlign: 'center',
        }}>
          <h1 style={{
            fontSize: 48,
            fontWeight: 700,
            color: COLORS.primary,
            textShadow: '0 0 30px #FFD700',
            letterSpacing: 6,
            marginBottom: 16,
          }}>
            {GAME_NAME}
          </h1>
          <p style={{ fontSize: 16, color: COLORS.text, marginBottom: 8 }}>
            Customers are hungry!
          </p>
          <p style={{ fontSize: 14, color: COLORS.muted, maxWidth: 400, marginBottom: 8 }}>
            Drag sushi plates from the conveyor belt to match their orders.
          </p>
          <p style={{ fontSize: 14, color: COLORS.muted, marginBottom: 40 }}>
            Don&apos;t let plates scroll away!
          </p>
          <button
            onClick={startGame}
            style={{
              background: COLORS.secondary,
              color: COLORS.primary,
              border: `3px solid ${COLORS.primary}`,
              padding: '20px 40px',
              fontSize: 20,
              fontFamily: 'ui-monospace, monospace',
              fontWeight: 600,
              cursor: 'pointer',
              borderRadius: 10,
              letterSpacing: 2,
              boxShadow: '0 0 30px #7B68EE80',
            }}
          >
            START SERVING
          </button>
          <div style={{
            marginTop: 40,
            fontSize: 12,
            letterSpacing: 3,
          }}>
            <span style={{ color: COLORS.primary }}>pixel</span>
            <span style={{ color: COLORS.secondary }}>pit</span>
            <span style={{ color: COLORS.text, opacity: 0.6 }}> arcade</span>
          </div>
        </div>
      )}

      {/* --- PLAYING SCREEN (canvas) --- */}
      {screenState === 'playing' && (
        <canvas
          ref={canvasRef}
          style={{ display: 'block', cursor: 'grab' }}
        />
      )}

      {/* --- GAME OVER SCREEN --- */}
      {screenState === 'gameover' && (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
        }}>
          <div style={{
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            maxWidth: 400,
            width: '100%',
          }}>
            <div style={{
              fontSize: 20,
              color: COLORS.muted,
              letterSpacing: 4,
              marginBottom: 12,
            }}>
              RESTAURANT CLOSED
            </div>

            <div style={{
              fontSize: 80,
              fontWeight: 200,
              color: COLORS.primary,
              marginBottom: 8,
              lineHeight: 1,
              textShadow: '0 0 20px #FFD700',
            }}>
              {score}
            </div>

            <div style={{
              fontSize: 12,
              color: COLORS.muted,
              letterSpacing: 2,
              marginBottom: 30,
            }}>
              points scored
            </div>

            {progression && (
              <div style={{
                background: COLORS.surface,
                borderRadius: 12,
                padding: '16px 24px',
                marginBottom: 20,
                textAlign: 'center',
              }}>
                <div style={{ fontSize: 18, color: COLORS.primary, marginBottom: 8 }}>
                  +{progression.xpEarned} XP
                </div>
                <div style={{ fontSize: 12, color: COLORS.muted }}>
                  Level {progression.level}{progression.streak > 1 ? ` • ${progression.multiplier}x streak` : ''}
                </div>
              </div>
            )}

            <ScoreFlow
              score={score}
              gameId={GAME_ID}
              colors={SCORE_FLOW_COLORS}
              maxScore={150}
              onRankReceived={(rank, entryId) => {
                setSubmittedEntryId(entryId ?? null);
              }}
              onProgression={(prog) => setProgression(prog)}
            />

            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              alignItems: 'center',
              marginTop: 20,
              width: '100%',
            }}>
              <button
                onClick={startGame}
                style={{
                  background: COLORS.primary,
                  color: COLORS.bg,
                  border: 'none',
                  borderRadius: 8,
                  padding: '14px 40px',
                  fontSize: 15,
                  fontFamily: 'ui-monospace, monospace',
                  fontWeight: 600,
                  cursor: 'pointer',
                  letterSpacing: 2,
                }}
              >
                play again
              </button>
              <button
                onClick={() => setScreenState('leaderboard')}
                style={{
                  background: 'transparent',
                  border: `1px solid ${COLORS.surface}`,
                  borderRadius: 6,
                  color: COLORS.muted,
                  padding: '12px 30px',
                  fontSize: 11,
                  fontFamily: 'ui-monospace, monospace',
                  cursor: 'pointer',
                  letterSpacing: 2,
                }}
              >
                leaderboard
              </button>
              {user ? (
                <button
                  onClick={() => setShowShareModal(true)}
                  style={{
                    background: 'transparent',
                    border: `1px solid ${COLORS.surface}`,
                    borderRadius: 6,
                    color: COLORS.muted,
                    padding: '12px 30px',
                    fontSize: 11,
                    fontFamily: 'ui-monospace, monospace',
                    cursor: 'pointer',
                    letterSpacing: 2,
                  }}
                >
                  share / groups
                </button>
              ) : (
                <ShareButtonContainer
                  id="share-btn-container"
                  url={typeof window !== 'undefined' ? `${window.location.origin}/pixelpit/arcade/${GAME_ID}/share/${score}` : ''}
                  text={`I scored ${score} points on SUSHI TRAIN! Can you serve faster?`}
                  style="minimal"
                  socialLoaded={socialLoaded}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- LEADERBOARD --- */}
      {screenState === 'leaderboard' && (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
        }}>
          <Leaderboard
            gameId={GAME_ID}
            limit={10}
            entryId={submittedEntryId ?? undefined}
            colors={LEADERBOARD_COLORS}
            onClose={() => setScreenState('gameover')}
            groupsEnabled={true}
            gameUrl={GAME_URL}
            socialLoaded={socialLoaded}
          />
        </div>
      )}

      {/* --- SHARE MODAL --- */}
      {showShareModal && user && (
        <ShareModal
          gameUrl={GAME_URL}
          score={score}
          colors={LEADERBOARD_COLORS}
          onClose={() => setShowShareModal(false)}
        />
      )}
    </>
  );
}
