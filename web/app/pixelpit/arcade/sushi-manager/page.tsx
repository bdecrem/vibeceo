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

const GAME_ID = 'sushi-manager';
const GAME_NAME = 'SUSHI MANAGER';

const COLORS = {
  bg: '#0a0a0f',
  surface: '#1a1a2a',
  primary: '#FFD700',
  secondary: '#7B68EE',
  text: '#D4A574',
  muted: '#71717a',
  error: '#FF6B6B',
  teal: '#2D9596',
  wood: '#8B7355',
  woodDark: '#5C4033',
  counter: '#D4A574',
  wash: '#4488AA',
  chain: '#FF8C00',
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

const SUSHI_TYPES = [
  { emoji: '🍣', name: 'nigiri', color: '#FFD700' },
  { emoji: '🍱', name: 'bento', color: '#2D9596' },
  { emoji: '🍤', name: 'tempura', color: '#FF69B4' },
  { emoji: '🍙', name: 'onigiri', color: '#D4A574' },
  { emoji: '🍜', name: 'ramen', color: '#FF6347' },
];

type SushiType = typeof SUSHI_TYPES[number];

type SeatState = 'empty' | 'waiting' | 'eating' | 'dirty';

interface Plate {
  x: number;
  y: number;
  type: SushiType;
  radius: number;
  id: number;
}

interface Seat {
  x: number;
  y: number;
  state: SeatState;
  wantedType: SushiType | null;
  patience: number;
  eatTimer: number;
  dirtyType: SushiType | null;
  id: number;
}

interface DirtyPlate {
  x: number;
  y: number;
  type: SushiType;
  radius: number;
  seatId: number;
  id: number;
}

interface FloatingText {
  x: number;
  y: number;
  text: string;
  color: string;
  alpha: number;
  vy: number;
  life: number;
}

interface GameState {
  plates: Plate[];
  seats: Seat[];
  dirtyPlates: DirtyPlate[];
  floatingTexts: FloatingText[];
  score: number;
  served: number;
  cleaned: number;
  wave: number;
  waveCustomersLeft: number;
  waveCustomersTotal: number;
  waveBreak: boolean;
  waveBreakTimer: number;
  beltSpeed: number;
  spawnRate: number;
  customerRate: number;
  dragging: Plate | DirtyPlate | null;
  dragType: 'plate' | 'dirty' | null;
  dragOffset: { x: number; y: number };
  gameOver: boolean;
  lastPlateSpawn: number;
  lastCustomerSpawn: number;
  chain: number;
  lastServeType: string | null;
  statusText: string;
  statusColor: string;
  eatDuration: number;
  patienceDrain: number;
  scoreDrainAccum: number;
}

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

function playChainSound(chain: number) {
  if (!audioCtx) return;
  const baseFreq = 440;
  const notes = [0, 4, 7, 12, 16]; // major arpeggio in semitones
  const idx = Math.min(chain - 1, notes.length - 1);
  const freq = baseFreq * Math.pow(2, notes[idx] / 12);
  playTone(freq, 0.2, 'triangle');
  setTimeout(() => playTone(freq * 1.5, 0.15, 'triangle'), 80);
}

const NUM_SEATS = 5;
const BELT_HEIGHT = 70;
const SEAT_RADIUS = 32;
const PLATE_RADIUS = 26;
const WASH_ZONE_SIZE = 80;
const EAT_DURATION_BASE = 2.5; // seconds

export default function SushiManagerGame() {
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
  const lastTimeRef = useRef<number>(0);

  const GAME_URL = typeof window !== 'undefined'
    ? `${window.location.origin}/pixelpit/arcade/${GAME_ID}`
    : `https://pixelpit.gg/pixelpit/arcade/${GAME_ID}`;

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

    // Music
    let musicPlaying = true;
    const musicCtx = audioCtx!;
    const masterGain = musicCtx.createGain();
    masterGain.gain.value = 0.10;
    masterGain.connect(musicCtx.destination);

    // Chill jazzy loop
    const bassNotes = [196.00, 220.00, 246.94, 220.00, 261.63, 246.94, 220.00, 196.00]; // G3-A3-B3...
    let bassIndex = 0;
    const bassInterval = setInterval(() => {
      if (!musicPlaying) return;
      const osc = musicCtx.createOscillator();
      const g = musicCtx.createGain();
      osc.connect(g);
      g.connect(masterGain);
      osc.type = 'triangle';
      osc.frequency.value = bassNotes[bassIndex % bassNotes.length];
      g.gain.value = 0.25;
      osc.start();
      g.gain.exponentialRampToValueAtTime(0.01, musicCtx.currentTime + 0.3);
      osc.stop(musicCtx.currentTime + 0.35);
      bassIndex++;
    }, 350);

    // Gentle melody
    const melodyNotes = [523.25, 0, 659.25, 587.33, 0, 523.25, 493.88, 0, 440.00, 0, 523.25, 587.33, 659.25, 0, 587.33, 0];
    let melodyIndex = 0;
    const melodyInterval = setInterval(() => {
      if (!musicPlaying) return;
      const note = melodyNotes[melodyIndex % melodyNotes.length];
      melodyIndex++;
      if (note === 0) return;
      const osc = musicCtx.createOscillator();
      const g = musicCtx.createGain();
      osc.connect(g);
      g.connect(masterGain);
      osc.type = 'sine';
      osc.frequency.value = note;
      g.gain.value = 0.06;
      osc.start();
      g.gain.exponentialRampToValueAtTime(0.01, musicCtx.currentTime + 0.2);
      osc.stop(musicCtx.currentTime + 0.25);
    }, 175);

    // Layout helpers
    const beltY = () => canvas!.height - BELT_HEIGHT / 2 - 10;
    const counterY = () => canvas!.height * 0.45;
    const washX = () => canvas!.width - WASH_ZONE_SIZE - 20;
    const washY = () => 80;

    // Create seats
    function createSeats(): Seat[] {
      const seats: Seat[] = [];
      const cw = canvas!.width;
      const cy = counterY();
      const spacing = cw / (NUM_SEATS + 1);
      for (let i = 0; i < NUM_SEATS; i++) {
        seats.push({
          x: spacing * (i + 1),
          y: cy,
          state: 'empty',
          wantedType: null,
          patience: 1.0,
          eatTimer: 0,
          dirtyType: null,
          id: i,
        });
      }
      return seats;
    }

    const gs: GameState = {
      plates: [],
      seats: createSeats(),
      dirtyPlates: [],
      floatingTexts: [],
      score: 0,
      served: 0,
      cleaned: 0,
      wave: 1,
      waveCustomersLeft: 5,
      waveCustomersTotal: 5,
      waveBreak: false,
      waveBreakTimer: 0,
      beltSpeed: 0.64,
      spawnRate: 2500,
      customerRate: 3500,
      dragging: null,
      dragType: null,
      dragOffset: { x: 0, y: 0 },
      gameOver: false,
      lastPlateSpawn: 0,
      lastCustomerSpawn: 0,
      chain: 0,
      lastServeType: null,
      statusText: 'Drag sushi to customers. Clean dirty plates!',
      statusColor: COLORS.teal,
      eatDuration: EAT_DURATION_BASE,
      patienceDrain: 0.03, // per second (halved = 2x patience time)
      scoreDrainAccum: 0,
    };
    gameRef.current = gs;

    // Shuffle bags
    let plateBag: SushiType[] = [];
    function getNextPlateType(): SushiType {
      if (plateBag.length === 0) {
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

    const MIN_PLATE_GAP = PLATE_RADIUS * 3; // minimum distance between plates

    function spawnPlate() {
      // Don't spawn if the rightmost plate on belt is too close to the spawn edge
      const beltPlates = gs.plates.filter(p => p !== gs.dragging);
      if (beltPlates.length > 0) {
        const rightmost = beltPlates.reduce((a, b) => a.x > b.x ? a : b);
        if (rightmost.x > canvas!.width + 40 - MIN_PLATE_GAP) return;
      }

      const type = getNextPlateType();
      gs.plates.push({
        x: canvas!.width + 40,
        y: beltY(),
        type,
        radius: PLATE_RADIUS,
        id: Math.random(),
      });
    }

    function spawnCustomer() {
      if (gs.waveCustomersLeft <= 0) return;
      // Find empty seat
      const emptySeats = gs.seats.filter(s => s.state === 'empty');
      if (emptySeats.length === 0) return;

      const seat = emptySeats[Math.floor(Math.random() * emptySeats.length)];
      seat.state = 'waiting';
      seat.wantedType = getNextCustomerType();
      seat.patience = 1.0;
      seat.eatTimer = 0;
      gs.waveCustomersLeft--;
    }

    function addFloatingText(x: number, y: number, text: string, color: string) {
      gs.floatingTexts.push({
        x, y, text, color,
        alpha: 1.0,
        vy: -1.5,
        life: 1.2,
      });
    }

    function checkCollision(x: number, y: number, tx: number, ty: number, r: number) {
      const dx = x - tx;
      const dy = y - ty;
      return Math.sqrt(dx * dx + dy * dy) < r + PLATE_RADIUS;
    }

    function checkWashZone(x: number, y: number) {
      const wx = washX();
      const wy = washY();
      return x > wx - WASH_ZONE_SIZE / 2 && x < wx + WASH_ZONE_SIZE / 2 + 20 &&
             y > wy - WASH_ZONE_SIZE / 2 && y < wy + WASH_ZONE_SIZE / 2 + 20;
    }

    function startNextWave() {
      gs.wave++;
      const customersThisWave = Math.min(5 + gs.wave * 2, 20);
      gs.waveCustomersLeft = customersThisWave;
      gs.waveCustomersTotal = customersThisWave;
      gs.waveBreak = false;
      gs.waveBreakTimer = 0;

      // Difficulty ramp per wave
      gs.beltSpeed = Math.min(0.64 + gs.wave * 0.12, 2.0);
      gs.customerRate = Math.max(3500 - gs.wave * 200, 1500);
      gs.spawnRate = Math.max(2500 - gs.wave * 150, 1200);
      gs.patienceDrain = Math.min(0.03 + gs.wave * 0.0075, 0.09);
      gs.eatDuration = Math.max(EAT_DURATION_BASE - gs.wave * 0.1, 1.5);

      gs.statusText = `Wave ${gs.wave} — ${customersThisWave} customers!`;
      gs.statusColor = COLORS.chain;

      addFloatingText(canvas!.width / 2, canvas!.height * 0.3, `WAVE ${gs.wave}`, COLORS.primary);
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

    // --- Drawing ---

    function drawBelt() {
      const by = beltY();
      // Belt background
      ctx!.fillStyle = COLORS.wood;
      ctx!.fillRect(0, by - BELT_HEIGHT / 2, canvas!.width, BELT_HEIGHT);
      // Belt lines
      ctx!.strokeStyle = COLORS.woodDark;
      ctx!.lineWidth = 2;
      ctx!.beginPath();
      ctx!.moveTo(0, by - BELT_HEIGHT / 2);
      ctx!.lineTo(canvas!.width, by - BELT_HEIGHT / 2);
      ctx!.stroke();
      ctx!.beginPath();
      ctx!.moveTo(0, by + BELT_HEIGHT / 2);
      ctx!.lineTo(canvas!.width, by + BELT_HEIGHT / 2);
      ctx!.stroke();
      // Belt label
      ctx!.font = '10px ui-monospace, monospace';
      ctx!.fillStyle = COLORS.woodDark;
      ctx!.textAlign = 'left';
      ctx!.fillText('CONVEYOR', 8, by + BELT_HEIGHT / 2 - 6);
    }

    function drawPlate(plate: Plate | DirtyPlate, alpha = 1, isDirty = false) {
      ctx!.save();
      ctx!.globalAlpha = alpha;

      // Plate circle
      ctx!.fillStyle = isDirty ? '#666655' : '#2D9596';
      ctx!.beginPath();
      ctx!.arc(plate.x, plate.y, plate.radius, 0, Math.PI * 2);
      ctx!.fill();

      // Border
      ctx!.strokeStyle = isDirty ? '#888877' : '#FFD700';
      ctx!.lineWidth = 2;
      ctx!.stroke();

      // Emoji
      ctx!.font = `${isDirty ? 20 : 24}px Arial`;
      ctx!.textAlign = 'center';
      ctx!.textBaseline = 'middle';
      if (isDirty) {
        ctx!.fillText('🫧', plate.x, plate.y);
      } else {
        ctx!.fillText(plate.type.emoji, plate.x, plate.y);
      }

      ctx!.restore();
    }

    function drawSeat(seat: Seat) {
      const { x, y, state } = seat;

      // Seat/stool
      ctx!.fillStyle = state === 'dirty' ? '#554433' : '#8B7355';
      ctx!.beginPath();
      ctx!.arc(x, y + SEAT_RADIUS + 12, 18, 0, Math.PI * 2);
      ctx!.fill();
      ctx!.strokeStyle = '#5C4033';
      ctx!.lineWidth = 1;
      ctx!.stroke();

      if (state === 'empty') {
        // Empty seat indicator
        ctx!.font = '11px ui-monospace, monospace';
        ctx!.fillStyle = '#555';
        ctx!.textAlign = 'center';
        ctx!.fillText('empty', x, y + SEAT_RADIUS + 16);
        return;
      }

      if (state === 'waiting') {
        // Customer face
        ctx!.font = '36px Arial';
        ctx!.textAlign = 'center';
        ctx!.textBaseline = 'middle';
        ctx!.fillText('😋', x, y);

        // Thought bubble
        const bubbleY = y - SEAT_RADIUS - 28;
        ctx!.fillStyle = '#ffffffe6';
        ctx!.beginPath();
        ctx!.arc(x, bubbleY, 20, 0, Math.PI * 2);
        ctx!.fill();
        ctx!.beginPath();
        ctx!.arc(x + 6, y - SEAT_RADIUS - 6, 4, 0, Math.PI * 2);
        ctx!.fill();
        ctx!.font = '20px Arial';
        ctx!.fillText(seat.wantedType!.emoji, x, bubbleY);

        // Patience bar
        const barW = 50;
        const barH = 6;
        const barX = x - barW / 2;
        const barY = y + SEAT_RADIUS + 28;
        ctx!.fillStyle = '#333';
        ctx!.fillRect(barX, barY, barW, barH);
        const pColor = seat.patience > 0.5 ? COLORS.teal : seat.patience > 0.25 ? COLORS.primary : COLORS.error;
        ctx!.fillStyle = pColor;
        ctx!.fillRect(barX, barY, barW * seat.patience, barH);
      }

      if (state === 'eating') {
        // Happy eating face
        ctx!.font = '36px Arial';
        ctx!.textAlign = 'center';
        ctx!.textBaseline = 'middle';
        ctx!.fillText('😊', x, y);

        // Eat progress bar (teal, filling up)
        const barW = 50;
        const barH = 6;
        const barX = x - barW / 2;
        const barY = y + SEAT_RADIUS + 28;
        ctx!.fillStyle = '#333';
        ctx!.fillRect(barX, barY, barW, barH);
        ctx!.fillStyle = '#66BB6A';
        const eatProgress = seat.eatTimer / gs.eatDuration;
        ctx!.fillRect(barX, barY, barW * eatProgress, barH);
      }

      if (state === 'dirty') {
        // No customer, dirty plate on counter
        ctx!.font = '28px Arial';
        ctx!.textAlign = 'center';
        ctx!.textBaseline = 'middle';
        ctx!.fillText('🫧', x, y);

        // "DIRTY" label
        ctx!.font = '9px ui-monospace, monospace';
        ctx!.fillStyle = COLORS.error;
        ctx!.fillText('DIRTY', x, y + SEAT_RADIUS + 28);
      }
    }

    function drawWashZone() {
      const wx = washX();
      const wy = washY();
      const size = WASH_ZONE_SIZE;

      // Wash zone background
      ctx!.fillStyle = COLORS.wash + '30';
      ctx!.strokeStyle = COLORS.wash;
      ctx!.lineWidth = 2;

      // Rounded rect
      const r = 12;
      ctx!.beginPath();
      ctx!.moveTo(wx - size / 2 + r, wy - size / 2);
      ctx!.lineTo(wx + size / 2 - r, wy - size / 2);
      ctx!.quadraticCurveTo(wx + size / 2, wy - size / 2, wx + size / 2, wy - size / 2 + r);
      ctx!.lineTo(wx + size / 2, wy + size / 2 - r);
      ctx!.quadraticCurveTo(wx + size / 2, wy + size / 2, wx + size / 2 - r, wy + size / 2);
      ctx!.lineTo(wx - size / 2 + r, wy + size / 2);
      ctx!.quadraticCurveTo(wx - size / 2, wy + size / 2, wx - size / 2, wy + size / 2 - r);
      ctx!.lineTo(wx - size / 2, wy - size / 2 + r);
      ctx!.quadraticCurveTo(wx - size / 2, wy - size / 2, wx - size / 2 + r, wy - size / 2);
      ctx!.closePath();
      ctx!.fill();
      ctx!.stroke();

      // Wash icon
      ctx!.font = '28px Arial';
      ctx!.textAlign = 'center';
      ctx!.textBaseline = 'middle';
      ctx!.fillText('🚿', wx, wy);

      // Label
      ctx!.font = '10px ui-monospace, monospace';
      ctx!.fillStyle = COLORS.wash;
      ctx!.fillText('WASH', wx, wy + size / 2 - 8);
    }

    function drawHUD() {
      // Score
      ctx!.font = 'bold 28px ui-monospace, monospace';
      ctx!.textAlign = 'left';
      ctx!.textBaseline = 'top';
      ctx!.fillStyle = COLORS.primary;
      ctx!.shadowColor = '#FFD70060';
      ctx!.shadowBlur = 8;
      ctx!.fillText(`${gs.score} pts`, 16, 16);
      ctx!.shadowBlur = 0;

      // Score bleed warning
      const bleedDirty = gs.seats.filter(s => s.state === 'dirty').length;
      if (bleedDirty > 0 && gs.score > 0) {
        const drainPerSec = (bleedDirty * 0.2).toFixed(1);
        ctx!.font = 'bold 16px ui-monospace, monospace';
        ctx!.fillStyle = COLORS.error;
        // Pulse opacity for urgency
        const pulse = 0.6 + 0.4 * Math.sin(Date.now() / 200);
        ctx!.globalAlpha = pulse;
        ctx!.fillText(`-${drainPerSec}/s`, 16 + ctx!.measureText(`${gs.score} pts`).width + 12, 20);
        ctx!.globalAlpha = 1;
      }

      // Wave info
      ctx!.font = '13px ui-monospace, monospace';
      ctx!.fillStyle = COLORS.muted;
      const waveServed = gs.waveCustomersTotal - gs.waveCustomersLeft;
      const waitingCount = gs.seats.filter(s => s.state === 'waiting').length;
      const eatingCount = gs.seats.filter(s => s.state === 'eating').length;
      ctx!.fillText(`Wave ${gs.wave} — ${waveServed + waitingCount + eatingCount}/${gs.waveCustomersTotal}`, 16, 48);

      // Chain
      if (gs.chain >= 2) {
        ctx!.font = 'bold 22px ui-monospace, monospace';
        ctx!.fillStyle = COLORS.chain;
        ctx!.shadowColor = '#FF8C0060';
        ctx!.shadowBlur = 10;
        ctx!.textAlign = 'center';
        ctx!.fillText(`${gs.chain}x CHAIN`, canvas!.width / 2, 20);
        ctx!.shadowBlur = 0;
      }

      // Status
      ctx!.font = '12px ui-monospace, monospace';
      ctx!.textAlign = 'left';
      ctx!.fillStyle = gs.statusColor;
      ctx!.fillText(gs.statusText, 16, 68);

      // Dirty count warning
      const dirtyCount = gs.seats.filter(s => s.state === 'dirty').length;
      if (dirtyCount >= 2) {
        ctx!.font = 'bold 12px ui-monospace, monospace';
        ctx!.fillStyle = COLORS.error;
        ctx!.textAlign = 'right';
        ctx!.fillText(`${dirtyCount} dirty seats!`, canvas!.width - 16, canvas!.height - BELT_HEIGHT - 30);
      }
    }

    function drawFloatingTexts() {
      gs.floatingTexts.forEach(ft => {
        ctx!.save();
        ctx!.globalAlpha = ft.alpha;
        ctx!.font = 'bold 20px ui-monospace, monospace';
        ctx!.textAlign = 'center';
        ctx!.fillStyle = ft.color;
        ctx!.shadowColor = ft.color;
        ctx!.shadowBlur = 6;
        ctx!.fillText(ft.text, ft.x, ft.y);
        ctx!.restore();
      });
    }

    function drawWaveBreak() {
      if (!gs.waveBreak) return;
      const progress = gs.waveBreakTimer / 3.0;

      // Dim overlay
      ctx!.fillStyle = '#00000040';
      ctx!.fillRect(0, 0, canvas!.width, canvas!.height);

      // Wave complete text
      ctx!.font = 'bold 32px ui-monospace, monospace';
      ctx!.textAlign = 'center';
      ctx!.fillStyle = COLORS.primary;
      ctx!.shadowColor = '#FFD70080';
      ctx!.shadowBlur = 15;
      ctx!.fillText(`WAVE ${gs.wave} COMPLETE!`, canvas!.width / 2, canvas!.height * 0.35);
      ctx!.shadowBlur = 0;

      // Timer bar
      const barW = 200;
      const barH = 8;
      const barX = canvas!.width / 2 - barW / 2;
      const barY = canvas!.height * 0.35 + 30;
      ctx!.fillStyle = '#333';
      ctx!.fillRect(barX, barY, barW, barH);
      ctx!.fillStyle = COLORS.teal;
      ctx!.fillRect(barX, barY, barW * (1 - progress), barH);

      ctx!.font = '14px ui-monospace, monospace';
      ctx!.fillStyle = COLORS.muted;
      ctx!.fillText('Next wave incoming...', canvas!.width / 2, barY + 30);
    }

    // Counter bar visual
    function drawCounter() {
      const cy = counterY();
      // Counter surface
      ctx!.fillStyle = COLORS.counter + '40';
      ctx!.fillRect(0, cy + SEAT_RADIUS + 4, canvas!.width, 6);
    }

    // --- Update ---

    function update(timestamp: number) {
      if (gs.gameOver) return;

      const dt = lastTimeRef.current > 0 ? Math.min((timestamp - lastTimeRef.current) / 1000, 0.1) : 0.016;
      lastTimeRef.current = timestamp;

      // Float texts
      gs.floatingTexts = gs.floatingTexts.filter(ft => {
        ft.y += ft.vy;
        ft.life -= dt;
        ft.alpha = Math.max(0, ft.life / 1.2);
        return ft.life > 0;
      });

      // Wave break
      if (gs.waveBreak) {
        gs.waveBreakTimer += dt;
        if (gs.waveBreakTimer >= 3.0) {
          startNextWave();
        }
        return; // Don't update game during break
      }

      // Spawn plates
      if (timestamp - gs.lastPlateSpawn > gs.spawnRate) {
        spawnPlate();
        gs.lastPlateSpawn = timestamp;
      }

      // Spawn customers into empty seats
      if (timestamp - gs.lastCustomerSpawn > gs.customerRate) {
        spawnCustomer();
        gs.lastCustomerSpawn = timestamp;
      }

      // Move plates on belt
      gs.plates = gs.plates.filter(plate => {
        if (plate !== gs.dragging) {
          plate.x -= gs.beltSpeed;
        }
        return plate.x > -50 || plate === gs.dragging;
      });

      // Update seats
      for (const seat of gs.seats) {
        if (seat.state === 'waiting') {
          seat.patience -= gs.patienceDrain * dt;
          if (seat.patience <= 0) {
            seat.patience = 0;
            gs.statusText = 'Customer left hungry!';
            gs.statusColor = COLORS.error;
            playTone(150, 0.3, 'sawtooth');
            endGame();
            return;
          }
        }

        if (seat.state === 'eating') {
          seat.eatTimer += dt;
          if (seat.eatTimer >= gs.eatDuration) {
            // Done eating -> dirty
            seat.state = 'dirty';
            seat.dirtyType = seat.wantedType;
            seat.wantedType = null;
            seat.eatTimer = 0;

            // Create dirty plate on the seat
            gs.dirtyPlates.push({
              x: seat.x,
              y: seat.y,
              type: seat.dirtyType!,
              radius: PLATE_RADIUS - 4,
              seatId: seat.id,
              id: Math.random(),
            });
          }
        }
      }

      // Score bleed: -2 pts/sec per dirty seat
      const dirtyCount = gs.seats.filter(s => s.state === 'dirty').length;
      if (dirtyCount > 0 && gs.score > 0) {
        gs.scoreDrainAccum += dirtyCount * 0.2 * dt;
        if (gs.scoreDrainAccum >= 1) {
          const drain = Math.floor(gs.scoreDrainAccum);
          gs.score = Math.max(0, gs.score - drain);
          gs.scoreDrainAccum -= drain;
          scoreRef.current = gs.score;
          setScore(gs.score);
        }
      }

      // Check if wave is complete (all customers served/eaten/cleaned)
      if (gs.waveCustomersLeft <= 0) {
        const activeSeats = gs.seats.filter(s => s.state !== 'empty');
        if (activeSeats.length === 0) {
          // Wave complete!
          gs.waveBreak = true;
          gs.waveBreakTimer = 0;
          const waveBonus = gs.wave * 50;
          gs.score += waveBonus;
          scoreRef.current = gs.score;
          setScore(gs.score);
          addFloatingText(canvas!.width / 2, canvas!.height * 0.45, `+${waveBonus} WAVE BONUS`, COLORS.primary);
          playTone(523.25, 0.15, 'triangle');
          setTimeout(() => playTone(659.25, 0.15, 'triangle'), 100);
          setTimeout(() => playTone(783.99, 0.3, 'triangle'), 200);
        }
      }
    }

    function draw() {
      // Background gradient
      const grad = ctx!.createLinearGradient(0, 0, 0, canvas!.height);
      grad.addColorStop(0, '#1a0a08');
      grad.addColorStop(0.4, '#2d1210');
      grad.addColorStop(0.7, '#1a0808');
      grad.addColorStop(1, '#0d0503');
      ctx!.fillStyle = grad;
      ctx!.fillRect(0, 0, canvas!.width, canvas!.height);

      drawWashZone();
      drawCounter();

      // Draw seats
      gs.seats.forEach(seat => drawSeat(seat));

      drawBelt();

      // Draw belt plates (not being dragged)
      gs.plates.forEach(plate => {
        if (plate !== gs.dragging) drawPlate(plate);
      });

      // Draw dirty plates on seats (not being dragged)
      gs.dirtyPlates.forEach(dp => {
        if (dp !== gs.dragging) drawPlate(dp, 0.9, true);
      });

      drawHUD();
      drawFloatingTexts();
      drawWaveBreak();

      // Draw dragged item on top
      if (gs.dragging) {
        drawPlate(gs.dragging, 1, gs.dragType === 'dirty');
      }
    }

    function gameLoop(timestamp: number) {
      update(timestamp);
      draw();
      if (!gs.gameOver) {
        animRef.current = requestAnimationFrame(gameLoop);
      }
    }

    // --- Input ---

    function getPos(e: MouseEvent | TouchEvent) {
      const rect = canvas!.getBoundingClientRect();
      const clientX = 'touches' in e ? e.touches[0]?.clientX ?? (e as TouchEvent).changedTouches[0].clientX : (e as MouseEvent).clientX;
      const clientY = 'touches' in e ? e.touches[0]?.clientY ?? (e as TouchEvent).changedTouches[0].clientY : (e as MouseEvent).clientY;
      return { x: clientX - rect.left, y: clientY - rect.top };
    }

    function handleStart(e: MouseEvent | TouchEvent) {
      if (gs.gameOver || gs.waveBreak) return;
      e.preventDefault();
      const pos = getPos(e);

      // Try to pick up a dirty plate first (they're on top of seats)
      for (const dp of gs.dirtyPlates) {
        if (checkCollision(pos.x, pos.y, dp.x, dp.y, dp.radius)) {
          gs.dragging = dp;
          gs.dragType = 'dirty';
          gs.dragOffset = { x: dp.x - pos.x, y: dp.y - pos.y };
          canvas!.style.cursor = 'grabbing';
          playTone(330, 0.05, 'sine');
          return;
        }
      }

      // Try to pick up a belt plate
      for (const plate of gs.plates) {
        if (checkCollision(pos.x, pos.y, plate.x, plate.y, plate.radius)) {
          gs.dragging = plate;
          gs.dragType = 'plate';
          gs.dragOffset = { x: plate.x - pos.x, y: plate.y - pos.y };
          canvas!.style.cursor = 'grabbing';
          playTone(440, 0.05);
          return;
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

      if (gs.dragType === 'plate') {
        const plate = gs.dragging as Plate;
        let served = false;

        // Check if dropped on a waiting customer
        for (const seat of gs.seats) {
          if (seat.state !== 'waiting') continue;
          if (checkCollision(plate.x, plate.y, seat.x, seat.y, SEAT_RADIUS)) {
            if (plate.type.name === seat.wantedType!.name) {
              // Correct serve!
              seat.state = 'eating';
              seat.eatTimer = 0;
              gs.served++;

              // Chain scoring
              if (gs.lastServeType === plate.type.name) {
                gs.chain++;
              } else {
                gs.chain = 1;
                gs.lastServeType = plate.type.name;
              }

              const chainMultiplier = Math.min(gs.chain, 5);
              const points = 10 * chainMultiplier;
              gs.score += points;
              scoreRef.current = gs.score;
              setScore(gs.score);

              if (gs.chain >= 2) {
                addFloatingText(seat.x, seat.y - 50, `+${points} (${chainMultiplier}x)`, COLORS.chain);
                gs.statusText = `${chainMultiplier}x chain! Keep matching ${plate.type.emoji}!`;
                gs.statusColor = COLORS.chain;
                playChainSound(gs.chain);
              } else {
                addFloatingText(seat.x, seat.y - 50, `+${points}`, COLORS.primary);
                gs.statusText = 'Served!';
                gs.statusColor = COLORS.teal;
                playTone(660, 0.15, 'triangle');
                setTimeout(() => playTone(880, 0.15, 'triangle'), 100);
              }

              // Remove plate
              gs.plates = gs.plates.filter(p => p.id !== plate.id);
              served = true;
            } else {
              // Wrong dish
              gs.statusText = 'Wrong order!';
              gs.statusColor = COLORS.error;
              gs.chain = 0;
              gs.lastServeType = null;
              playTone(220, 0.2, 'sawtooth');
              addFloatingText(seat.x, seat.y - 50, 'WRONG', COLORS.error);
            }
            break;
          }
        }

        if (!served && gs.dragType === 'plate') {
          // Return plate to belt
          (gs.dragging as Plate).x = canvas!.width + 40;
          (gs.dragging as Plate).y = beltY();
        }
      }

      if (gs.dragType === 'dirty') {
        const dp = gs.dragging as DirtyPlate;

        if (checkWashZone(dp.x, dp.y)) {
          // Cleaned!
          gs.cleaned++;
          const seat = gs.seats.find(s => s.id === dp.seatId);
          if (seat) {
            seat.state = 'empty';
            seat.dirtyType = null;
          }
          gs.dirtyPlates = gs.dirtyPlates.filter(d => d.id !== dp.id);

          const cleanBonus = 5;
          gs.score += cleanBonus;
          scoreRef.current = gs.score;
          setScore(gs.score);

          addFloatingText(washX(), washY() + 30, `+${cleanBonus}`, COLORS.wash);
          gs.statusText = 'Cleaned! Seat open.';
          gs.statusColor = COLORS.wash;
          playTone(550, 0.1, 'sine');
          setTimeout(() => playTone(660, 0.1, 'sine'), 60);
        } else {
          // Return to seat
          const seat = gs.seats.find(s => s.id === dp.seatId);
          if (seat) {
            dp.x = seat.x;
            dp.y = seat.y;
          }
        }
      }

      gs.dragging = null;
      gs.dragType = null;
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
    lastTimeRef.current = 0;
    animRef.current = requestAnimationFrame(gameLoop);

    return () => {
      musicPlaying = false;
      clearInterval(bassInterval);
      clearInterval(melodyInterval);
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
    lastTimeRef.current = 0;
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

      {screenState === 'start' && (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          textAlign: 'center',
          background: 'linear-gradient(180deg, #1a0505 0%, #2d1210 40%, #1a0a08 70%, #0d0503 100%)',
        }}>
          <div style={{ fontSize: 36, marginBottom: 12, letterSpacing: 16 }}>
            🏮🍣🏮
          </div>

          <h1 style={{
            fontSize: 44,
            fontWeight: 900,
            color: '#fff5ee',
            textShadow: '0 0 40px #ff6b3580, 0 2px 8px #000',
            letterSpacing: 3,
            marginBottom: 6,
          }}>
            {GAME_NAME}
          </h1>

          <p style={{
            fontSize: 13,
            color: '#ffa726',
            letterSpacing: 4,
            textTransform: 'uppercase' as const,
            marginBottom: 24,
          }}>
            Serve &middot; Wait &middot; Clean &middot; Repeat
          </p>

          <div style={{
            background: '#ffffff10',
            borderRadius: 12,
            padding: '16px 20px',
            maxWidth: 320,
            marginBottom: 24,
            textAlign: 'left',
            lineHeight: 1.8,
          }}>
            <div style={{ fontSize: 13, color: '#D4A574' }}>
              <span style={{ color: COLORS.teal }}>1.</span> Drag sushi from belt to matching customers<br/>
              <span style={{ color: COLORS.primary }}>2.</span> Customers eat, then leave dirty plates<br/>
              <span style={{ color: COLORS.wash }}>3.</span> Drag dirty plates to wash station<br/>
              <span style={{ color: COLORS.chain }}>4.</span> Chain same types for combo multipliers!
            </div>
          </div>

          <p style={{ fontSize: 12, color: '#71717a', marginBottom: 32, maxWidth: 280 }}>
            Dirty seats block new customers. Balance serving and cleaning to survive each wave!
          </p>

          <button
            onClick={startGame}
            style={{
              background: 'linear-gradient(135deg, #ff6b35, #ff8a50)',
              color: '#fff',
              border: 'none',
              padding: '18px 48px',
              fontSize: 18,
              fontFamily: 'ui-monospace, monospace',
              fontWeight: 700,
              cursor: 'pointer',
              borderRadius: 30,
              letterSpacing: 2,
              boxShadow: '0 4px 24px #ff6b3560',
            }}
          >
            OPEN RESTAURANT
          </button>

          <div style={{
            marginTop: 40,
            fontSize: 12,
            letterSpacing: 3,
          }}>
            <span style={{ color: '#FFD700' }}>pixel</span>
            <span style={{ color: '#7B68EE' }}>pit</span>
            <span style={{ color: '#D4A574', opacity: 0.6 }}> arcade</span>
          </div>
        </div>
      )}

      {screenState === 'playing' && (
        <canvas
          ref={canvasRef}
          style={{ display: 'block', cursor: 'grab' }}
        />
      )}

      {screenState === 'gameover' && (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          background: 'linear-gradient(180deg, #1a0505 0%, #2d1210 40%, #1a0a08 70%, #0d0503 100%)',
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
              maxScore={300}
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
                  text={`I scored ${score} points managing my sushi restaurant! Can you do better?`}
                  style="minimal"
                  socialLoaded={socialLoaded}
                />
              )}
            </div>
          </div>
        </div>
      )}

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
