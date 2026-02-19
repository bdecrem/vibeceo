'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
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

const GAME_ID = 'devour';
const GAME_URL = typeof window !== 'undefined'
  ? `${window.location.origin}/pixelpit/arcade/devour`
  : 'https://pixelpit.gg/pixelpit/arcade/devour';

// Social colors - cosmic purple theme
const SCORE_FLOW_COLORS: ScoreFlowColors = {
  bg: '#020108',
  surface: '#0f0520',
  primary: '#8B5CF6',
  secondary: '#a78bfa',
  text: '#E5E7EB',
  muted: '#9CA3AF',
  error: '#ef4444',
};

const LEADERBOARD_COLORS: LeaderboardColors = {
  bg: '#020108',
  surface: '#0f0520',
  primary: '#8B5CF6',
  secondary: '#a78bfa',
  text: '#E5E7EB',
  muted: '#9CA3AF',
};
const ROUND_DURATION = 30; // seconds per round

// Pulse timing
const PULSE_EXPAND_MS = 150;
const PULSE_HOLD_MS = 200;
const PULSE_RETRACT_MS = 250;
const PULSE_COOLDOWN_MS = 400;

interface GameObject {
  id: number;
  x: number;
  y: number;
  size: number;
  type: 'debris' | 'asteroid' | 'satellite' | 'moon' | 'planet';
  consumed: boolean;
  respawnTimer: number;
}

interface Hole {
  x: number;
  y: number;
  size: number;
  pulseRadius: number;
  pulseState: 'idle' | 'expanding' | 'holding' | 'retracting' | 'cooldown';
  pulseTimer: number;
  diskAngle: number;
}

// Audio
let audioCtx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let musicGain: GainNode | null = null;
let musicPlaying = false;
let musicInterval: ReturnType<typeof setInterval> | null = null;
let musicStep = 0;
let arpStep = 0;

// Void soundtrack — 85 BPM, chromatic descent, gravitational pull
const MUSIC = {
  bpm: 85,
  // Chromatic crawl: Bb0 → A0 → Ab0 → G0 (each held 4 steps, deep rumble)
  bass: [29.14, 0, 0, 29.14, 0, 0, 0, 0, 27.5, 0, 0, 27.5, 0, 0, 0, 0,
         25.96, 0, 0, 25.96, 0, 0, 0, 0, 24.5, 0, 0, 24.5, 0, 0, 0, 0],
  // Tritone stabs — dissonant, wide intervals, each bar shifts up
  arp: [[146.83, 207.65, 311.13], [155.56, 220, 329.63], [164.81, 233.08, 349.23], [155.56, 220, 329.63]],
  // Irregular thud — off-grid, lopsided gravity
  kick: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0],
  // Metallic ticks — sparse, unpredictable
  hat: [0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1],
};

function initAudio() {
  if (audioCtx) return;
  audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  masterGain = audioCtx.createGain();
  masterGain.gain.value = 0.3;
  masterGain.connect(audioCtx.destination);
  musicGain = audioCtx.createGain();
  musicGain.gain.value = 1.0;
  musicGain.connect(masterGain);
  if (audioCtx.state === 'suspended') audioCtx.resume();
}

function playMusicKick() {
  if (!audioCtx || !musicGain) return;
  const t = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(musicGain);
  osc.type = 'sine';
  osc.frequency.setValueAtTime(60, t);
  osc.frequency.exponentialRampToValueAtTime(20, t + 0.3);
  gain.gain.setValueAtTime(0.35, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
  osc.start(t);
  osc.stop(t + 0.4);
}

function playMusicHat() {
  if (!audioCtx || !musicGain) return;
  const t = audioCtx.currentTime;
  const bufferSize = audioCtx.sampleRate * 0.03;
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
  const noise = audioCtx.createBufferSource();
  noise.buffer = buffer;
  const hp = audioCtx.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 8000;
  const lp = audioCtx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 11000;
  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(0.04, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
  noise.connect(hp);
  hp.connect(lp);
  lp.connect(gain);
  gain.connect(musicGain);
  noise.start(t);
}

function playMusicBass(freq: number) {
  if (!audioCtx || !musicGain || freq === 0) return;
  const t = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const filter = audioCtx.createBiquadFilter();
  const gain = audioCtx.createGain();
  osc.connect(filter);
  filter.connect(gain);
  gain.connect(musicGain);
  osc.type = 'sine';
  osc.frequency.value = freq;
  filter.type = 'lowpass';
  filter.frequency.value = 150;
  gain.gain.setValueAtTime(0.2, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
  osc.start(t);
  osc.stop(t + 0.2);
}

function playMusicArp(freqs: number[]) {
  if (!audioCtx || !musicGain) return;
  const t = audioCtx.currentTime;
  const freq = freqs[arpStep % freqs.length];
  const osc = audioCtx.createOscillator();
  const filter = audioCtx.createBiquadFilter();
  const gain = audioCtx.createGain();
  osc.connect(filter);
  filter.connect(gain);
  gain.connect(musicGain);
  osc.type = 'sawtooth';
  osc.frequency.value = freq;
  filter.type = 'lowpass';
  filter.frequency.value = 900;
  filter.Q.value = 5;
  gain.gain.setValueAtTime(0.04, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
  osc.start(t);
  osc.stop(t + 0.35);
}

function musicTick() {
  if (!audioCtx || !musicPlaying) return;
  if (MUSIC.kick[musicStep % 16]) playMusicKick();
  if (MUSIC.hat[musicStep % 16]) playMusicHat();
  playMusicBass(MUSIC.bass[musicStep % 32]);
  // Arp plays every other step for a slower, heavier feel
  if (musicStep % 2 === 0) {
    const barIndex = Math.floor(musicStep / 16) % 4;
    playMusicArp(MUSIC.arp[barIndex]);
    arpStep++;
  }
  musicStep++;
}

function startMusic() {
  if (musicPlaying) return;
  musicPlaying = true;
  musicStep = 0;
  arpStep = 0;
  const stepTime = (60 / MUSIC.bpm) * 1000 / 4;
  musicInterval = setInterval(musicTick, stepTime);
}

function stopMusic() {
  musicPlaying = false;
  if (musicInterval) {
    clearInterval(musicInterval);
    musicInterval = null;
  }
}

function playPulse() {
  if (!audioCtx || !masterGain) return;
  const t = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(55, t);
  osc.frequency.exponentialRampToValueAtTime(25, t + 0.25);
  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(0.2, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
  osc.connect(gain);
  gain.connect(masterGain);
  osc.start(t);
  osc.stop(t + 0.3);
}

function playConsume(size: number) {
  if (!audioCtx || !masterGain) return;
  const t = audioCtx.currentTime;
  const baseFreq = Math.max(80, 350 - size * 25);
  const osc = audioCtx.createOscillator();
  osc.type = 'sine';
  osc.frequency.value = baseFreq;
  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(0.1, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
  osc.connect(gain);
  gain.connect(masterGain);
  osc.start(t);
  osc.stop(t + 0.15);
}

function playWin() {
  if (!audioCtx || !masterGain) return;
  const t = audioCtx.currentTime;
  [261.63, 329.63, 392, 523.25].forEach((freq, i) => {
    const osc = audioCtx!.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;
    const gain = audioCtx!.createGain();
    gain.gain.setValueAtTime(0, t + i * 0.1);
    gain.gain.linearRampToValueAtTime(0.12, t + i * 0.1 + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.1 + 0.4);
    osc.connect(gain);
    gain.connect(masterGain!);
    osc.start(t + i * 0.1);
    osc.stop(t + i * 0.1 + 0.5);
  });
}

function playLose() {
  if (!audioCtx || !masterGain) return;
  const t = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(200, t);
  osc.frequency.exponentialRampToValueAtTime(50, t + 0.5);
  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(0.15, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
  osc.connect(gain);
  gain.connect(masterGain);
  osc.start(t);
  osc.stop(t + 0.6);
}

export default function DevourGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<'start' | 'playing' | 'end'>('start');
  const [round, setRound] = useState(1);
  const [winner, setWinner] = useState<'player' | 'rival' | 'tie'>('player');
  const [canvasSize, setCanvasSize] = useState({ w: 400, h: 700 });
  
  // Social integration state
  const [socialLoaded, setSocialLoaded] = useState(false);
  const [submittedEntryId, setSubmittedEntryId] = useState<number | null>(null);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  const [progression, setProgression] = useState<ProgressionResult | null>(null);

  const { user } = usePixelpitSocial(socialLoaded);

  // Group code + logout URL handling
  useEffect(() => {
    if (!socialLoaded || typeof window === 'undefined') return;
    if (!(window as any).PixelpitSocial) return;

    const params = new URLSearchParams(window.location.search);
    if (params.has('logout')) {
      (window as any).PixelpitSocial.logout();
      params.delete('logout');
      const newUrl = params.toString()
        ? `${window.location.pathname}?${params.toString()}`
        : window.location.pathname;
      window.history.replaceState({}, '', newUrl);
      window.location.reload();
      return;
    }

    const groupCode = (window as any).PixelpitSocial.getGroupCodeFromUrl();
    if (groupCode) {
      (window as any).PixelpitSocial.storeGroupCode(groupCode);
    }
  }, [socialLoaded]);

  const gameRef = useRef({
    running: false,
    timer: ROUND_DURATION,
    // Player hole
    player: {
      x: 0, y: 0, size: 30,
      pulseRadius: 30,
      pulseState: 'idle' as Hole['pulseState'],
      pulseTimer: 0,
      diskAngle: 0,
    } as Hole,
    // AI rival hole
    rival: {
      x: 0, y: 0, size: 30,
      pulseRadius: 30,
      pulseState: 'idle' as Hole['pulseState'],
      pulseTimer: 0,
      diskAngle: 0,
    } as Hole,
    // Round tracking for canvas draw
    currentRound: 1,
    totalScore: 0,
    waveFlashTimer: 0, // counts down from 2s at wave start
    // Movement
    isDragging: false,
    targetX: 0,
    targetY: 0,
    // Objects
    objects: [] as GameObject[],
    nextObjectId: 0,
    // Particles
    particles: [] as { x: number; y: number; vx: number; vy: number; life: number; color: string; targetX: number; targetY: number }[],
  });

  const spawnObject = useCallback((canvasW: number, canvasH: number, existingObjects: GameObject[]) => {
    const marginX = 30;
    const marginTop = 80; // below HUD
    const marginBottom = 60; // above bottom text
    let x: number, y: number;
    let attempts = 0;

    // Find a spot not too close to either hole or existing objects
    do {
      x = marginX + Math.random() * (canvasW - marginX * 2);
      y = marginTop + Math.random() * (canvasH - marginTop - marginBottom);
      attempts++;
    } while (attempts < 20 && existingObjects.some(o => 
      Math.hypot(o.x - x, o.y - y) < 40
    ));
    
    // Size distribution
    const rand = Math.random();
    let size: number;
    let type: GameObject['type'];
    
    if (rand < 0.45) {
      size = 1 + Math.random() * 1.5;
      type = 'debris';
    } else if (rand < 0.75) {
      size = 2 + Math.random() * 2;
      type = 'asteroid';
    } else if (rand < 0.9) {
      size = 3 + Math.random() * 2;
      type = 'satellite';
    } else if (rand < 0.97) {
      size = 5 + Math.random() * 2;
      type = 'moon';
    } else {
      size = 7 + Math.random() * 3;
      type = 'planet';
    }
    
    return {
      id: gameRef.current.nextObjectId++,
      x, y, size, type,
      consumed: false,
      respawnTimer: 0,
    };
  }, []);

  // Get rival stats based on round - smooth ramp from easy to full strength at round 8
  const getRivalStats = useCallback((roundNum: number) => {
    const stats: Record<number, { size: number; speedMult: number }> = {
      1: { size: 6,  speedMult: 0.40 },
      2: { size: 8,  speedMult: 0.50 },
      3: { size: 9,  speedMult: 0.58 },
      4: { size: 10, speedMult: 0.65 },
      5: { size: 11, speedMult: 0.72 },
      6: { size: 12, speedMult: 0.80 },
      7: { size: 13, speedMult: 0.90 },
    };
    return stats[roundNum] || { size: 15, speedMult: 1.0 }; // Full strength from round 8+
  }, []);

  const startGame = useCallback((startRound: number = 1) => {
    initAudio();
    startMusic();
    const game = gameRef.current;
    game.running = true;
    game.timer = ROUND_DURATION;
    
    // Update round state
    game.currentRound = startRound;
    if (startRound === 1) game.totalScore = 0;
    game.waveFlashTimer = 2.0; // flash "WAVE X" for 2 seconds
    setRound(startRound);
    
    // Get rival stats for this round
    const rivalStats = getRivalStats(startRound);
    
    // Position holes on opposite sides
    const centerX = canvasSize.w / 2;
    const centerY = canvasSize.h / 2;
    
    game.player = {
      x: centerX - 80,
      y: centerY + 100,
      size: 15,  // Player always starts same size
      pulseRadius: 15,
      pulseState: 'idle',
      pulseTimer: 0,
      diskAngle: 0,
    };
    game.targetX = game.player.x;
    game.targetY = game.player.y;
    
    game.rival = {
      x: centerX + 80,
      y: centerY - 100,
      size: rivalStats.size,  // Rival size scales with round
      pulseRadius: rivalStats.size,
      pulseState: 'idle',
      pulseTimer: 0,
      diskAngle: 0,
    };
    
    // Store speed multiplier for AI
    (game as any).rivalSpeedMult = rivalStats.speedMult;
    
    game.isDragging = false;
    game.objects = [];
    game.nextObjectId = 0;
    game.particles = [];
    
    // Spawn initial objects
    for (let i = 0; i < 20; i++) {
      game.objects.push(spawnObject(canvasSize.w, canvasSize.h, game.objects));
    }
    
    setGameState('playing');
  }, [spawnObject, canvasSize, getRivalStats]);

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

    const getMaxPulseReach = (hole: Hole) => hole.size * 3;
    const getConsumeThreshold = (hole: Hole) => 1.5 + Math.floor(hole.size / 8);

    const updatePulse = (hole: Hole, dt: number) => {
      if (hole.pulseState !== 'idle' && hole.pulseState !== 'cooldown') {
        hole.pulseTimer += dt * 1000;
        const maxReach = getMaxPulseReach(hole);
        
        if (hole.pulseState === 'expanding') {
          const progress = hole.pulseTimer / PULSE_EXPAND_MS;
          hole.pulseRadius = hole.size + (maxReach - hole.size) * Math.min(1, progress);
          if (hole.pulseTimer >= PULSE_EXPAND_MS) {
            hole.pulseState = 'holding';
            hole.pulseTimer = 0;
          }
        } else if (hole.pulseState === 'holding') {
          hole.pulseRadius = maxReach;
          if (hole.pulseTimer >= PULSE_HOLD_MS) {
            hole.pulseState = 'retracting';
            hole.pulseTimer = 0;
          }
        } else if (hole.pulseState === 'retracting') {
          const progress = hole.pulseTimer / PULSE_RETRACT_MS;
          hole.pulseRadius = maxReach - (maxReach - hole.size) * Math.min(1, progress);
          if (hole.pulseTimer >= PULSE_RETRACT_MS) {
            hole.pulseState = 'cooldown';
            hole.pulseTimer = 0;
          }
        }
      } else if (hole.pulseState === 'cooldown') {
        hole.pulseTimer += dt * 1000;
        if (hole.pulseTimer >= PULSE_COOLDOWN_MS) {
          hole.pulseState = 'idle';
          hole.pulseTimer = 0;
        }
      }
      hole.diskAngle += dt * 2;
    };

    const checkConsumption = (hole: Hole, isPlayer: boolean) => {
      const game = gameRef.current;
      if (hole.pulseState !== 'expanding' && hole.pulseState !== 'holding') return;
      
      const threshold = getConsumeThreshold(hole);
      
      for (const obj of game.objects) {
        if (obj.consumed) continue;
        
        const dist = Math.hypot(obj.x - hole.x, obj.y - hole.y);
        if (dist <= hole.pulseRadius && obj.size <= threshold) {
          obj.consumed = true;
          obj.respawnTimer = 2; // Respawn after 2 seconds
          
          // Grow the hole (diminishing returns - small objects matter less as you grow)
          const growth = obj.size / (hole.size * 0.15);
          hole.size += growth;
          
          // Particles toward the hole
          for (let i = 0; i < 4; i++) {
            game.particles.push({
              x: obj.x,
              y: obj.y,
              vx: (Math.random() - 0.5) * 50,
              vy: (Math.random() - 0.5) * 50,
              life: 0.4,
              color: obj.type === 'planet' ? '#f59e0b' : obj.type === 'moon' ? '#9ca3af' : '#22d3ee',
              targetX: hole.x,
              targetY: hole.y,
            });
          }
          
          if (isPlayer) {
            const pts = obj.type === 'planet' ? 20 : obj.type === 'moon' ? 10 : obj.type === 'satellite' ? 5 : obj.type === 'asteroid' ? 3 : 1;
            game.totalScore += pts;
            playConsume(obj.size);
          }
        }
      }
    };

    const updateAI = (dt: number) => {
      const game = gameRef.current;
      const rival = game.rival;
      const threshold = getConsumeThreshold(rival);
      
      // Find nearest consumable object
      let nearestDist = Infinity;
      let nearestObj: GameObject | null = null;
      
      for (const obj of game.objects) {
        if (obj.consumed || obj.size > threshold) continue;
        const dist = Math.hypot(obj.x - rival.x, obj.y - rival.y);
        if (dist < nearestDist) {
          nearestDist = dist;
          nearestObj = obj;
        }
      }
      
      if (nearestObj) {
        // Move toward it
        const dx = nearestObj.x - rival.x;
        const dy = nearestObj.y - rival.y;
        const dist = Math.hypot(dx, dy);
        
        if (dist > 5) {
          const baseSpeed = 100 + rival.size * 0.5; // Bigger = slightly faster
          const speedMult = (gameRef.current as any).rivalSpeedMult || 1.0;
          const speed = baseSpeed * speedMult;
          rival.x += (dx / dist) * speed * dt;
          rival.y += (dy / dist) * speed * dt;
        }
        
        // Pulse when close enough
        if (dist < getMaxPulseReach(rival) && rival.pulseState === 'idle') {
          rival.pulseState = 'expanding';
          rival.pulseTimer = 0;
        }
      }
      
      // Keep in bounds (below HUD, above bottom text)
      rival.x = Math.max(20, Math.min(canvasSize.w - 20, rival.x));
      rival.y = Math.max(80, Math.min(canvasSize.h - 60, rival.y));
    };

    const update = (dt: number) => {
      const game = gameRef.current;
      if (!game.running) return;

      // Timer
      game.timer -= dt;
      if (game.timer <= 0) {
        game.timer = 0;
        game.running = false;
        stopMusic();
        
        // Determine round winner
        if (game.player.size > game.rival.size) {
          // Player won this round - bonus points + advance
          game.totalScore += game.currentRound * 25;
          setWinner('player');
          playWin();
          
          // Brief delay then start next round
          const nextRound = game.currentRound + 1;
          setTimeout(() => {
            startGame(nextRound);
          }, 1500);
          return;
        } else {
          // Player lost or tied - game over
          setFinalScore(game.totalScore);
          setSubmittedEntryId(null);
          setShowLeaderboard(false);
          setShowShareModal(false);
          setProgression(null);
          
          if (game.rival.size > game.player.size) {
            setWinner('rival');
            playLose();
          } else {
            setWinner('tie');
            playLose();
          }
          
          setGameState('end');
          if (game.totalScore >= 1) {
            fetch('/api/pixelpit/stats', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ game: GAME_ID }),
            }).catch(() => {});
          }
        }
        return;
      }

      // Wave flash countdown
      if (game.waveFlashTimer > 0) game.waveFlashTimer -= dt;

      // Player movement (smooth toward target)
      if (game.isDragging) {
        const dx = game.targetX - game.player.x;
        const dy = game.targetY - game.player.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 2) {
          const speed = 200;
          game.player.x += (dx / dist) * speed * dt;
          game.player.y += (dy / dist) * speed * dt;
        }
      }

      // Keep player in bounds (below HUD, above bottom text)
      game.player.x = Math.max(20, Math.min(canvasSize.w - 20, game.player.x));
      game.player.y = Math.max(80, Math.min(canvasSize.h - 60, game.player.y));

      // Update pulses
      updatePulse(game.player, dt);
      updatePulse(game.rival, dt);

      // AI behavior
      updateAI(dt);

      // Check consumption
      checkConsumption(game.player, true);
      checkConsumption(game.rival, false);

      // Respawn objects
      for (const obj of game.objects) {
        if (obj.consumed) {
          obj.respawnTimer -= dt;
          if (obj.respawnTimer <= 0) {
            // Respawn at new location
            const newObj = spawnObject(canvasSize.w, canvasSize.h, game.objects);
            obj.x = newObj.x;
            obj.y = newObj.y;
            obj.size = newObj.size;
            obj.type = newObj.type;
            obj.consumed = false;
          }
        }
      }

      // Update particles
      game.particles = game.particles.filter(p => {
        // Pull toward target hole
        const dx = p.targetX - p.x;
        const dy = p.targetY - p.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 5) {
          p.vx += (dx / dist) * 400 * dt;
          p.vy += (dy / dist) * 400 * dt;
        }
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.life -= dt;
        return p.life > 0;
      });
    };

    const drawHole = (hole: Hole, isPlayer: boolean) => {
      const color = isPlayer ? '#8b5cf6' : '#ef4444';
      const glowColor = isPlayer ? 'rgba(139, 92, 246, 0.3)' : 'rgba(239, 68, 68, 0.3)';
      
      // Pulse range
      if (hole.pulseState !== 'idle' && hole.pulseState !== 'cooldown') {
        ctx.strokeStyle = color;
        ctx.lineWidth = 4;
        ctx.shadowColor = color;
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(hole.x, hole.y, hole.pulseRadius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.shadowBlur = 0;
        
        // Fill
        const grad = ctx.createRadialGradient(hole.x, hole.y, hole.size, hole.x, hole.y, hole.pulseRadius);
        grad.addColorStop(0, glowColor);
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(hole.x, hole.y, hole.pulseRadius, 0, Math.PI * 2);
        ctx.fill();
      }
      
      // Accretion disk
      const diskSize = hole.size * 1.8;
      ctx.save();
      ctx.translate(hole.x, hole.y);
      ctx.rotate(hole.diskAngle);
      
      const diskGrad = ctx.createRadialGradient(0, 0, hole.size * 0.6, 0, 0, diskSize);
      if (isPlayer) {
        diskGrad.addColorStop(0, 'rgba(249, 115, 22, 0.7)');
        diskGrad.addColorStop(0.4, 'rgba(168, 85, 247, 0.4)');
        diskGrad.addColorStop(1, 'transparent');
      } else {
        diskGrad.addColorStop(0, 'rgba(239, 68, 68, 0.7)');
        diskGrad.addColorStop(0.4, 'rgba(251, 146, 60, 0.4)');
        diskGrad.addColorStop(1, 'transparent');
      }
      
      ctx.fillStyle = diskGrad;
      ctx.beginPath();
      ctx.ellipse(0, 0, diskSize, diskSize * 0.35, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      
      // Event horizon
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.arc(hole.x, hole.y, hole.size * 0.6, 0, Math.PI * 2);
      ctx.fill();
      
      // Eyes
      const eyeOffset = hole.size * 0.2;
      const eyeSize = hole.size * 0.1;
      ctx.fillStyle = isPlayer ? '#fbbf24' : '#fca5a5';
      ctx.beginPath();
      ctx.arc(hole.x - eyeOffset, hole.y - eyeOffset * 0.2, eyeSize, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(hole.x + eyeOffset, hole.y - eyeOffset * 0.2, eyeSize * 0.8, 0, Math.PI * 2);
      ctx.fill();
      
      // Size label removed — HUD meter shows the comparison
    };

    const draw = () => {
      const game = gameRef.current;
      
      // Background — deep purple across entire screen
      ctx.fillStyle = '#0f0520';
      ctx.fillRect(0, 0, canvasSize.w, canvasSize.h);

      // Stars — subtle twinkle
      const time = performance.now() * 0.001;
      for (let i = 0; i < 80; i++) {
        const x = (i * 137.5) % canvasSize.w;
        const y = (i * 89.3) % canvasSize.h;
        const flicker = 0.15 + 0.2 * Math.sin(time * (0.5 + i * 0.03) + i);
        ctx.fillStyle = `rgba(255, 255, 255, ${flicker})`;
        ctx.beginPath();
        ctx.arc(x, y, i % 7 === 0 ? 1.5 : 0.8, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw objects
      const playerThreshold = getConsumeThreshold(game.player);
      
      for (const obj of game.objects) {
        if (obj.consumed) continue;
        
        const canConsume = obj.size <= playerThreshold;
        const visualSize = obj.size * 4;
        
        if (obj.type === 'debris') {
          ctx.fillStyle = canConsume ? '#67e8f9' : '#475569';
          ctx.beginPath();
          ctx.arc(obj.x, obj.y, visualSize, 0, Math.PI * 2);
          ctx.fill();
        } else if (obj.type === 'asteroid') {
          ctx.fillStyle = canConsume ? '#a78bfa' : '#64748b';
          ctx.beginPath();
          ctx.arc(obj.x, obj.y, visualSize, 0, Math.PI * 2);
          ctx.fill();
        } else if (obj.type === 'satellite') {
          ctx.fillStyle = canConsume ? '#60a5fa' : '#6b7280';
          ctx.fillRect(obj.x - visualSize, obj.y - visualSize * 0.3, visualSize * 2, visualSize * 0.6);
          ctx.fillRect(obj.x - visualSize * 1.3, obj.y - visualSize * 0.5, visualSize * 0.3, visualSize);
          ctx.fillRect(obj.x + visualSize, obj.y - visualSize * 0.5, visualSize * 0.3, visualSize);
        } else if (obj.type === 'moon') {
          ctx.fillStyle = canConsume ? '#e5e7eb' : '#9ca3af';
          ctx.beginPath();
          ctx.arc(obj.x, obj.y, visualSize, 0, Math.PI * 2);
          ctx.fill();
        } else if (obj.type === 'planet') {
          if (canConsume) {
            ctx.shadowColor = '#f59e0b';
            ctx.shadowBlur = 15;
          }
          ctx.fillStyle = canConsume ? '#f59e0b' : '#78716c';
          ctx.beginPath();
          ctx.arc(obj.x, obj.y, visualSize, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      }

      // Draw particles
      for (const p of game.particles) {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.life * 2;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // Ambient glow behind player
      const glowGrad = ctx.createRadialGradient(
        game.player.x, game.player.y, game.player.size,
        game.player.x, game.player.y, game.player.size * 4
      );
      glowGrad.addColorStop(0, 'rgba(139, 92, 246, 0.08)');
      glowGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(game.player.x, game.player.y, game.player.size * 4, 0, Math.PI * 2);
      ctx.fill();

      // Draw holes (rival first so player is on top)
      drawHole(game.rival, false);
      drawHole(game.player, true);

      // === HUD — single row: R# left, meter center, timer right ===
      const hudY = 28;
      const hudPad = 16;
      const timerSecs = Math.ceil(game.timer);
      const hudFont = 'bold 20px ui-monospace';

      // HUD (drawn over the full background, no separate strip needed)

      // Left: Total score
      ctx.font = hudFont;
      ctx.textAlign = 'left';
      ctx.fillStyle = '#e5e7eb';
      ctx.fillText(`${game.totalScore}`, hudPad, hudY);

      // Right: Timer
      ctx.textAlign = 'right';
      ctx.fillStyle = timerSecs <= 10 ? '#ef4444' : '#e5e7eb';
      ctx.fillText(`${timerSecs}s`, canvasSize.w - hudPad, hudY);

      // Center: You/Rival meter
      const barWidth = Math.min(160, canvasSize.w - 160);
      const barHeight = 12;
      const barX = (canvasSize.w - barWidth) / 2;
      const barY = hudY - barHeight / 2 - 1;
      const total = game.player.size + game.rival.size;
      const playerRatio = game.player.size / total;

      // Rounded meter bar
      const barR = barHeight / 2;
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(barX, barY, barWidth, barHeight, barR);
      ctx.clip();
      ctx.fillStyle = '#27272a';
      ctx.fillRect(barX, barY, barWidth, barHeight);
      ctx.fillStyle = '#8b5cf6';
      ctx.fillRect(barX, barY, barWidth * playerRatio, barHeight);
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(barX + barWidth * playerRatio, barY, barWidth * (1 - playerRatio), barHeight);
      ctx.restore();

      // Wave flash — scales up then fades out
      if (game.waveFlashTimer > 0) {
        const elapsed = 2.0 - game.waveFlashTimer;
        const alpha = elapsed < 0.3 ? elapsed / 0.3 : Math.min(1, game.waveFlashTimer / 0.6);
        const scale = elapsed < 0.2 ? 0.7 + 0.3 * (elapsed / 0.2) : 1.0;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(canvasSize.w / 2, canvasSize.h / 2);
        ctx.scale(scale, scale);
        // "WAVE" label — small, above
        ctx.font = '600 14px ui-monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#a78bfa';
        ctx.fillText('WAVE', 0, -30);
        // Wave number — large, below
        ctx.font = '900 72px ui-monospace';
        ctx.fillStyle = '#fff';
        ctx.fillText(`${game.currentRound}`, 0, 40);
        ctx.restore();
      }

      // Instructions — fade out after 4 seconds
      if (game.timer > ROUND_DURATION - 4 && game.currentRound === 1) {
        const instrAlpha = Math.min(1, (game.timer - (ROUND_DURATION - 4)) / 1.5);
        ctx.save();
        ctx.globalAlpha = instrAlpha * 0.4;
        ctx.font = '13px ui-monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#a78bfa';
        ctx.fillText('drag to move \u00b7 tap to pulse', canvasSize.w / 2, canvasSize.h - 44);
        ctx.restore();
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
    const getPos = (e: Touch | PointerEvent | MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      return {
        x: (e as any).clientX - rect.left,
        y: (e as any).clientY - rect.top,
      };
    };

    const handleStart = (x: number, y: number) => {
      const game = gameRef.current;
      if (!game.running) return;
      game.isDragging = true;
      game.targetX = x;
      game.targetY = y;
    };

    const handleMove = (x: number, y: number) => {
      const game = gameRef.current;
      if (!game.running || !game.isDragging) return;
      game.targetX = x;
      game.targetY = y;
    };

    const handleEnd = () => {
      const game = gameRef.current;
      game.isDragging = false;
    };

    const handleTap = () => {
      const game = gameRef.current;
      if (!game.running) return;
      if (game.player.pulseState === 'idle') {
        game.player.pulseState = 'expanding';
        game.player.pulseTimer = 0;
        playPulse();
      }
    };

    let lastTapTime = 0;
    const TAP_THRESHOLD = 200; // ms

    const handlePointerDown = (e: PointerEvent) => {
      e.preventDefault();
      const pos = getPos(e);
      handleStart(pos.x, pos.y);
      lastTapTime = Date.now();
    };

    const handlePointerMove = (e: PointerEvent) => {
      e.preventDefault();
      const pos = getPos(e);
      handleMove(pos.x, pos.y);
    };

    const handlePointerUp = (e: PointerEvent) => {
      e.preventDefault();
      handleEnd();
      // If short tap (not a drag), trigger pulse
      if (Date.now() - lastTapTime < TAP_THRESHOLD) {
        handleTap();
      }
    };

    const handleTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      if (e.touches.length > 0) {
        const pos = getPos(e.touches[0]);
        handleStart(pos.x, pos.y);
        lastTapTime = Date.now();
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      if (e.touches.length > 0) {
        const pos = getPos(e.touches[0]);
        handleMove(pos.x, pos.y);
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      e.preventDefault();
      handleEnd();
      if (Date.now() - lastTapTime < TAP_THRESHOLD) {
        handleTap();
      }
    };

    canvas.addEventListener('pointerdown', handlePointerDown, { passive: false });
    canvas.addEventListener('pointermove', handlePointerMove, { passive: false });
    canvas.addEventListener('pointerup', handlePointerUp, { passive: false });
    canvas.addEventListener('pointercancel', handlePointerUp, { passive: false });
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd, { passive: false });

    return () => {
      cancelAnimationFrame(animationId);
      stopMusic();
      canvas.removeEventListener('pointerdown', handlePointerDown);
      canvas.removeEventListener('pointermove', handlePointerMove);
      canvas.removeEventListener('pointerup', handlePointerUp);
      canvas.removeEventListener('pointercancel', handlePointerUp);
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchmove', handleTouchMove);
      canvas.removeEventListener('touchend', handleTouchEnd);
    };
  }, [gameState, canvasSize, spawnObject]);

  return (
    <>
      {/* Load social.js */}
      <Script
        src="/pixelpit/social.js"
        strategy="afterInteractive"
        onLoad={() => setSocialLoaded(true)}
      />

      <div style={{
        position: 'fixed',
        inset: 0,
        background: '#020108',
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
          background: '#0f0520',
        }}>
          <h1 style={{
            color: '#fff',
            fontSize: 56,
            marginBottom: 8,
            fontWeight: 900,
            letterSpacing: 6,
          }}>
            DEVOUR
          </h1>

          <p style={{
            color: '#a78bfa',
            fontSize: 14,
            marginBottom: 48,
            textAlign: 'center',
            letterSpacing: 3,
            textTransform: 'uppercase',
          }}>
            Drag &middot; Pulse &middot; Consume
          </p>

          <button
            onClick={() => startGame(1)}
            style={{
              background: '#8B5CF6',
              color: '#fff',
              border: 'none',
              padding: '16px 56px',
              fontSize: 16,
              fontWeight: 700,
              cursor: 'pointer',
              borderRadius: 30,
              letterSpacing: 2,
            }}
          >
            PLAY
          </button>

          <button
            onClick={() => setShowLeaderboard(true)}
            style={{
              marginTop: 24,
              background: 'transparent',
              color: '#6b7280',
              border: 'none',
              padding: '10px 24px',
              fontSize: 13,
              cursor: 'pointer',
              letterSpacing: 1,
            }}
          >
            LEADERBOARD
          </button>
        </div>
      )}

      {/* Leaderboard — renders its own full-screen layout */}
      {showLeaderboard && gameState !== 'playing' && (
        <Leaderboard
          gameId={GAME_ID}
          limit={8}
          entryId={submittedEntryId ?? undefined}
          colors={LEADERBOARD_COLORS}
          onClose={() => setShowLeaderboard(false)}
          groupsEnabled={true}
          gameUrl={GAME_URL}
          socialLoaded={socialLoaded}
        />
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

      {gameState === 'end' && (
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'safe center',
          background: '#0f0520',
          overflowY: 'auto',
          padding: '40px 20px',
        }}>
          <div style={{ color: '#6b7280', fontSize: 13, letterSpacing: 3, marginBottom: 6 }}>
            {winner === 'rival' ? 'DEVOURED' : 'TIED'}
          </div>
          <div style={{ color: '#fff', fontSize: 72, fontWeight: 900, marginBottom: 4 }}>
            {finalScore}
          </div>
          <div style={{ color: '#a78bfa', fontSize: 13, letterSpacing: 2, marginBottom: 24 }}>
            WAVE {round}
          </div>

          {/* ScoreFlow */}
          <div style={{ width: '100%', maxWidth: 350 }}>
            <ScoreFlow
              score={finalScore}
              gameId={GAME_ID}
              colors={SCORE_FLOW_COLORS}
              maxScore={200}
              onRankReceived={(rank, entryId) => setSubmittedEntryId(entryId ?? null)}
              onProgression={(prog) => setProgression(prog)}
            />
          </div>

          {/* Progression */}
          {progression && (
            <div style={{ textAlign: 'center', marginTop: 12, marginBottom: 8 }}>
              <span style={{ color: '#a78bfa', fontSize: 14, fontWeight: 700 }}>+{progression.xpEarned} XP</span>
              <span style={{ color: '#6b7280', fontSize: 13, marginLeft: 8 }}>
                Lv{progression.level}{progression.streak > 1 ? ` · ${progression.multiplier}x streak` : ''}
              </span>
            </div>
          )}

          {/* Share — user-aware */}
          <div style={{ marginTop: 15 }}>
            {user ? (
              <button
                onClick={() => setShowShareModal(true)}
                style={{
                  background: 'transparent',
                  color: '#a78bfa',
                  border: '1px solid #a78bfa40',
                  padding: '10px 24px',
                  fontSize: 13,
                  cursor: 'pointer',
                  borderRadius: 20,
                  letterSpacing: 1,
                }}
              >
                SHARE / GROUPS
              </button>
            ) : (
              <ShareButtonContainer
                id="share-btn-devour"
                url={`${typeof window !== 'undefined' ? window.location.origin : ''}/pixelpit/arcade/devour/share/${finalScore}`}
                text={`I scored ${finalScore} on DEVOUR! Can you beat that? 🕳️`}
                style="minimal"
                socialLoaded={socialLoaded}
              />
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, marginTop: 20 }}>
            <button
              onClick={() => setShowLeaderboard(!showLeaderboard)}
              style={{
                background: 'transparent',
                color: '#6b7280',
                border: 'none',
                padding: '12px 20px',
                fontSize: 13,
                cursor: 'pointer',
                letterSpacing: 1,
              }}
            >
              {showLeaderboard ? 'HIDE' : 'RANKS'}
            </button>
            <button
              onClick={() => startGame(1)}
              style={{
                background: '#8B5CF6',
                color: '#fff',
                border: 'none',
                padding: '14px 40px',
                fontSize: 15,
                fontWeight: 700,
                cursor: 'pointer',
                borderRadius: 30,
                letterSpacing: 2,
              }}
            >
              PLAY AGAIN
            </button>
          </div>

        </div>
      )}
      </div>

      {/* ShareModal — at component root, overlays everything */}
      {showShareModal && user && (
        <ShareModal
          gameUrl={GAME_URL}
          score={finalScore}
          colors={LEADERBOARD_COLORS}
          onClose={() => setShowShareModal(false)}
        />
      )}
    </>
  );
}
