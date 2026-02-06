'use client';

import React, { useEffect, useRef, useState } from 'react';
import Script from 'next/script';
import {
  ScoreFlow,
  Leaderboard,
  ShareButtonContainer,
  ShareModal,
  usePixelpitSocial,
  type PixelpitUser,
  type ScoreFlowColors,
  type LeaderboardColors,
  type ProgressionResult,
} from '@/app/pixelpit/components';

// RAIN theme - soft glows, warm amber/teal
const THEME = {
  bgPrimary: '#0a0f1a',      // deep warm dark
  bgSecondary: '#141d2b',    // cards, surface
  beamColor: '#fbbf24',      // warm amber/gold
  beamGlow: '#fcd34d',       // soft gold glow
  playerColor: '#2dd4bf',    // soft teal
  playerAccent: '#5eead4',   // lighter teal
  particleColors: ['#fbbf24', '#fcd34d', '#2dd4bf'],
};

// RAIN UI colors - warm, soft
const COLORS = {
  bg: '#0a0f1a',          // deep warm dark
  surface: '#141d2b',     // card background
  gold: '#fbbf24',        // warm amber (primary)
  teal: '#2dd4bf',        // soft teal (secondary)
  tealLight: '#5eead4',   // lighter teal
  coral: '#f87171',       // soft red
  cream: '#f8fafc',       // light text
  muted: '#94a3b8',       // muted text
};

// Color mappings for extracted components
const SCORE_FLOW_COLORS: ScoreFlowColors = {
  bg: COLORS.bg,
  surface: COLORS.surface,
  primary: COLORS.gold,
  secondary: COLORS.teal,
  text: COLORS.cream,
  muted: COLORS.muted,
  error: COLORS.coral,
};

const LEADERBOARD_COLORS: LeaderboardColors = {
  bg: COLORS.bg,
  surface: COLORS.surface,
  primary: COLORS.gold,
  secondary: COLORS.teal,
  text: COLORS.cream,
  muted: COLORS.muted,
};

// Particle system for visual juice
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

// Trail point for player afterimage
interface TrailPoint {
  x: number;
  y: number;
  alpha: number;
}

// Difficulty levels
const LEVELS = [
  { name: 'level 1', minScore: 0, speed: 3, wallInterval: 2000, gapChance: 0.7 },
  { name: 'level 2', minScore: 10, speed: 4, wallInterval: 1600, gapChance: 0.6 },
  { name: 'level 3', minScore: 25, speed: 5, wallInterval: 1300, gapChance: 0.5 },
  { name: 'level 4', minScore: 50, speed: 6, wallInterval: 1000, gapChance: 0.4 },
  { name: 'level 5', minScore: 75, speed: 7, wallInterval: 800, gapChance: 0.3 },
  { name: 'insane', minScore: 100, speed: 8, wallInterval: 600, gapChance: 0.2 },
];

// Note: PixelpitSocial types are defined in @/app/pixelpit/components/types

// Animated progression display component
function ProgressionDisplay({ progression }: { progression: ProgressionResult }) {
  const [animatedXp, setAnimatedXp] = useState(0);
  const [animatedProgress, setAnimatedProgress] = useState(0);
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [barPulse, setBarPulse] = useState(false);

  useEffect(() => {
    // Start animation after a brief delay
    const startDelay = setTimeout(() => {
      // Calculate starting point (before this XP was earned)
      const startProgress = progression.leveledUp
        ? 0  // If leveled up, we wrapped around from full
        : Math.max(0, progression.levelProgress - progression.xpEarned);

      setAnimatedProgress(startProgress);
      setAnimatedXp(0);

      // Animate XP counter
      const xpDuration = 800;
      const xpSteps = 30;
      const xpIncrement = progression.xpEarned / xpSteps;
      let currentXp = 0;

      const xpInterval = setInterval(() => {
        currentXp += xpIncrement;
        if (currentXp >= progression.xpEarned) {
          setAnimatedXp(progression.xpEarned);
          clearInterval(xpInterval);
        } else {
          setAnimatedXp(Math.floor(currentXp));
        }
      }, xpDuration / xpSteps);

      // Animate progress bar with slight delay
      const barDelay = setTimeout(() => {
        setBarPulse(true);

        // If leveled up, first fill to 100%, then reset and fill to new progress
        if (progression.leveledUp) {
          setAnimatedProgress(progression.levelNeeded);

          setTimeout(() => {
            setShowLevelUp(true);
            setAnimatedProgress(0);

            setTimeout(() => {
              setAnimatedProgress(progression.levelProgress);
              setBarPulse(false);
            }, 300);
          }, 500);
        } else {
          setAnimatedProgress(progression.levelProgress);
          setTimeout(() => setBarPulse(false), 600);
        }
      }, 200);

      return () => {
        clearInterval(xpInterval);
        clearTimeout(barDelay);
      };
    }, 100);

    return () => clearTimeout(startDelay);
  }, [progression]);

  const progressPercent = (animatedProgress / progression.levelNeeded) * 100;

  return (
    <div style={{
      background: COLORS.surface,
      borderRadius: 12,
      padding: '16px 24px',
      marginBottom: 20,
      boxShadow: `0 4px 20px rgba(0,0,0,0.3)`,
      textAlign: 'center',
      minWidth: 200,
      border: '1px solid rgba(255,255,255,0.05)',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        marginBottom: 8,
      }}>
        <span style={{
          fontFamily: 'ui-monospace, monospace',
          fontSize: 18,
          fontWeight: 700,
          color: COLORS.gold,
        }}>
          +{animatedXp} XP
        </span>
        {progression.streak > 1 && (
          <span style={{
            background: COLORS.teal,
            color: COLORS.bg,
            padding: '3px 8px',
            borderRadius: 10,
            fontSize: 11,
            fontWeight: 600,
            fontFamily: 'ui-monospace, monospace',
          }}>
            {progression.multiplier}x streak
          </span>
        )}
      </div>

      {/* XP Progress Bar */}
      <div style={{
        background: 'rgba(255,255,255,0.1)',
        borderRadius: 8,
        height: 10,
        overflow: 'hidden',
        marginBottom: 6,
        position: 'relative',
      }}>
        <div style={{
          background: `linear-gradient(90deg, ${COLORS.gold}, ${COLORS.teal})`,
          height: '100%',
          width: `${progressPercent}%`,
          borderRadius: 8,
          transition: 'width 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
          boxShadow: barPulse ? `0 0 12px ${COLORS.gold}` : 'none',
        }} />
        {barPulse && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: `linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)`,
            animation: 'shimmer 0.6s ease-out',
          }} />
        )}
      </div>

      <div style={{
        fontFamily: 'ui-monospace, monospace',
        fontSize: 12,
        color: COLORS.muted,
      }}>
        Level {progression.level} • {Math.floor(animatedProgress)}/{progression.levelNeeded} XP
      </div>

      {showLevelUp && (
        <div style={{
          marginTop: 10,
          padding: '8px 16px',
          background: `linear-gradient(135deg, ${COLORS.gold}, ${COLORS.teal})`,
          borderRadius: 12,
          fontFamily: 'ui-monospace, monospace',
          fontSize: 14,
          fontWeight: 700,
          color: COLORS.bg,
          animation: 'popIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}>
          LEVEL UP!
        </div>
      )}

      {progression.streak >= 3 && (
        <div style={{
          marginTop: 8,
          fontFamily: 'ui-monospace, monospace',
          fontSize: 11,
          color: COLORS.teal,
        }}>
          {progression.streak} day streak
        </div>
      )}

      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        @keyframes popIn {
          0% { transform: scale(0.5); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

export default function SuperbeamGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<'start' | 'playing' | 'gameover' | 'leaderboard'>('start');
  const [score, setScore] = useState(0);
  const [currentLevel, setCurrentLevel] = useState(0);
  const [levelUpText, setLevelUpText] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [socialLoaded, setSocialLoaded] = useState(false);

  // Track submitted entry for leaderboard positioning
  const [submittedEntryId, setSubmittedEntryId] = useState<number | null>(null);

  // Progression state for XP/level/streak display
  const [progression, setProgression] = useState<ProgressionResult | null>(null);

  // Groups state
  const [showShareModal, setShowShareModal] = useState(false);

  // Use the social hook for user state
  const { user } = usePixelpitSocial(socialLoaded);

  // Game URL for sharing
  const GAME_URL = typeof window !== 'undefined'
    ? `${window.location.origin}/pixelpit/arcade/superbeam`
    : 'https://pixelpit.io/pixelpit/arcade/superbeam';

  // Detect group code from URL and store it
  // Also handle ?logout param
  useEffect(() => {
    if (!socialLoaded || typeof window === 'undefined') return;
    if (!window.PixelpitSocial) return;

    // Handle logout param
    const params = new URLSearchParams(window.location.search);
    if (params.has('logout')) {
      window.PixelpitSocial.logout();
      // Remove the param from URL
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

  // Game refs
  const gameRef = useRef({
    running: false,
    score: 0,
    level: 0,
    speed: 3,
    wallInterval: 2000,
    lastWallTime: 0,
    player: { x: 0, y: 0, width: 12, height: 50, targetX: 0 },
    walls: [] as Array<{ y: number; gapLanes: number[]; passed: boolean }>,
    audioCtx: null as AudioContext | null,
    masterGain: null as GainNode | null,
    musicPlaying: false,
    musicInterval: null as NodeJS.Timeout | null,
    musicStep: 0,
    arpStep: 0,
    // Visual juice
    particles: [] as Particle[],
    trail: [] as TrailPoint[],
    screenShake: { x: 0, y: 0, intensity: 0 },
    pulsePhase: 0,
    frameCount: 0,
  });

  const LANES = 5;
  const GAME_ID = 'superbeam';

  // Note: User state is now managed by usePixelpitSocial hook
  // Share button is now handled by ShareButtonContainer component

  // Audio functions
  const initAudio = () => {
    const game = gameRef.current;
    if (game.audioCtx) return;
    game.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    game.masterGain = game.audioCtx.createGain();
    game.masterGain.connect(game.audioCtx.destination);
    game.masterGain.gain.value = soundEnabled ? 1 : 0;
  };

  const playSound = (freq: number, duration: number, type: OscillatorType = 'sine', volume = 0.1) => {
    const game = gameRef.current;
    if (!game.audioCtx || !soundEnabled || !game.masterGain) return;
    const osc = game.audioCtx.createOscillator();
    const gain = game.audioCtx.createGain();
    osc.connect(gain);
    gain.connect(game.masterGain);
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(volume, game.audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, game.audioCtx.currentTime + duration);
    osc.start();
    osc.stop(game.audioCtx.currentTime + duration);
  };

  // Modern filtered SFX helper
  const playSoftSound = (freq: number, dur: number, type: OscillatorType, vol: number, cutoff: number) => {
    const game = gameRef.current;
    if (!game.audioCtx || !soundEnabled || !game.masterGain) return;
    const osc = game.audioCtx.createOscillator();
    const flt = game.audioCtx.createBiquadFilter();
    const gain = game.audioCtx.createGain();
    osc.connect(flt);
    flt.connect(gain);
    gain.connect(game.masterGain);
    osc.type = type;
    osc.frequency.value = freq;
    flt.type = 'lowpass';
    flt.frequency.value = cutoff;
    gain.gain.setValueAtTime(vol, game.audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, game.audioCtx.currentTime + dur);
    osc.start();
    osc.stop(game.audioCtx.currentTime + dur);
  };

  // Modern SFX - soft, filtered to match music
  const dodgeSound = () => playSoftSound(500, 0.06, 'triangle', 0.07, 1500);
  const scoreSound = () => {
    playSoftSound(660, 0.1, 'sine', 0.08, 3000);
    setTimeout(() => playSoftSound(880, 0.12, 'sine', 0.06, 2500), 60);
  };
  const crashSound = () => {
    const game = gameRef.current;
    if (!game.audioCtx || !soundEnabled || !game.masterGain) return;
    // Modern thud - filtered noise + sub
    const len = game.audioCtx.sampleRate * 0.25;
    const buf = game.audioCtx.createBuffer(1, len, game.audioCtx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = game.audioCtx.createBufferSource();
    src.buffer = buf;
    const flt = game.audioCtx.createBiquadFilter();
    flt.type = 'lowpass';
    flt.frequency.value = 350;
    const gn = game.audioCtx.createGain();
    gn.gain.setValueAtTime(0.12, game.audioCtx.currentTime);
    gn.gain.exponentialRampToValueAtTime(0.001, game.audioCtx.currentTime + 0.25);
    src.connect(flt);
    flt.connect(gn);
    gn.connect(game.masterGain);
    src.start();
    playSoftSound(45, 0.35, 'sine', 0.18, 80);
  };
  const levelUpSound = () => {
    playSoftSound(440, 0.15, 'sine', 0.1, 2000);
    setTimeout(() => playSoftSound(554, 0.15, 'sine', 0.1, 2200), 120);
    setTimeout(() => playSoftSound(659, 0.2, 'sine', 0.12, 2500), 240);
  };

  // Music engine - modern electronic, less chiptune
  const MUSIC = {
    bpm: 128, // slower, more groove
    bass: [55, 0, 55, 0, 73.42, 0, 55, 0, 65.41, 0, 0, 0, 49, 0, 49, 0], // sub bass, more space
    arp: [[330, 392, 494, 587], [330, 392, 494, 587], [349, 440, 523, 659], [294, 370, 440, 554]], // higher, dreamier
    kick: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0], // four on floor
    hat: [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0], // steady offbeat
  };

  const playKick = () => {
    const game = gameRef.current;
    if (!game.audioCtx || !game.masterGain) return;
    const osc = game.audioCtx.createOscillator();
    const gain = game.audioCtx.createGain();
    osc.connect(gain);
    gain.connect(game.masterGain);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(120, game.audioCtx.currentTime); // lower attack
    osc.frequency.exponentialRampToValueAtTime(35, game.audioCtx.currentTime + 0.12); // longer sweep
    gain.gain.setValueAtTime(0.25, game.audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, game.audioCtx.currentTime + 0.2); // longer tail
    osc.start();
    osc.stop(game.audioCtx.currentTime + 0.2);
  };

  const playHat = () => {
    const game = gameRef.current;
    if (!game.audioCtx || !game.masterGain) return;
    const bufferSize = game.audioCtx.sampleRate * 0.04;
    const buffer = game.audioCtx.createBuffer(1, bufferSize, game.audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const noise = game.audioCtx.createBufferSource();
    noise.buffer = buffer;
    const hpFilter = game.audioCtx.createBiquadFilter();
    hpFilter.type = 'highpass';
    hpFilter.frequency.value = 7000;
    const lpFilter = game.audioCtx.createBiquadFilter();
    lpFilter.type = 'lowpass';
    lpFilter.frequency.value = 12000; // tame the harshness
    const gain = game.audioCtx.createGain();
    gain.gain.setValueAtTime(0.06, game.audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, game.audioCtx.currentTime + 0.06);
    noise.connect(hpFilter);
    hpFilter.connect(lpFilter);
    lpFilter.connect(gain);
    gain.connect(game.masterGain);
    noise.start();
  };

  const playBass = (freq: number) => {
    const game = gameRef.current;
    if (!game.audioCtx || !game.masterGain || freq === 0) return;
    const osc = game.audioCtx.createOscillator();
    const filter = game.audioCtx.createBiquadFilter();
    const gain = game.audioCtx.createGain();
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(game.masterGain);
    osc.type = 'sine'; // smooth sub bass
    osc.frequency.value = freq;
    filter.type = 'lowpass';
    filter.frequency.value = 200; // warm, filtered
    gain.gain.setValueAtTime(0.18, game.audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, game.audioCtx.currentTime + 0.15);
    osc.start();
    osc.stop(game.audioCtx.currentTime + 0.18);
  };

  const playArp = (freqs: number[]) => {
    const game = gameRef.current;
    if (!game.audioCtx || !game.masterGain) return;
    const freq = freqs[game.arpStep % freqs.length];
    const osc = game.audioCtx.createOscillator();
    const filter = game.audioCtx.createBiquadFilter();
    const gain = game.audioCtx.createGain();
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(game.masterGain);
    osc.type = 'triangle'; // softer, more modern
    osc.frequency.value = freq;
    filter.type = 'lowpass';
    filter.frequency.value = 2000; // take edge off
    filter.Q.value = 1;
    gain.gain.setValueAtTime(0.05, game.audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, game.audioCtx.currentTime + 0.12);
    osc.start();
    osc.stop(game.audioCtx.currentTime + 0.15);
  };

  const musicTick = () => {
    const game = gameRef.current;
    if (!game.audioCtx || !game.musicPlaying) return;
    if (MUSIC.kick[game.musicStep % 16]) playKick();
    if (MUSIC.hat[game.musicStep % 16]) playHat();
    if (game.musicStep % 2 === 0) playBass(MUSIC.bass[(game.musicStep / 2) % 16]);
    const barIndex = Math.floor(game.musicStep / 16) % 4;
    playArp(MUSIC.arp[barIndex]);
    game.arpStep++;
    game.musicStep++;
  };

  const startMusic = () => {
    const game = gameRef.current;
    if (game.musicPlaying) return;
    initAudio();
    if (game.audioCtx?.state === 'suspended') game.audioCtx.resume();
    game.musicPlaying = true;
    game.musicStep = 0;
    game.arpStep = 0;
    const bpm = MUSIC.bpm + game.level * 10;
    const stepTime = (60 / bpm) * 1000 / 4;
    game.musicInterval = setInterval(musicTick, stepTime);
  };

  const stopMusic = () => {
    const game = gameRef.current;
    game.musicPlaying = false;
    if (game.musicInterval) {
      clearInterval(game.musicInterval);
      game.musicInterval = null;
    }
  };

  const updateMusicTempo = (level: number) => {
    const game = gameRef.current;
    if (game.musicInterval) clearInterval(game.musicInterval);
    if (!game.musicPlaying) return;
    const bpm = MUSIC.bpm + level * 10;
    const stepTime = (60 / bpm) * 1000 / 4;
    game.musicInterval = setInterval(musicTick, stepTime);
  };

  // Game logic
  const startGame = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const game = gameRef.current;
    const laneWidth = canvas.width / LANES;

    game.player.x = canvas.width / 2 - game.player.width / 2;
    game.player.y = canvas.height - 100;
    game.player.targetX = game.player.x;
    game.walls = [];
    game.score = 0;
    game.level = 0;
    game.speed = LEVELS[0].speed;
    game.wallInterval = LEVELS[0].wallInterval;
    game.lastWallTime = Date.now();
    game.running = true;

    setScore(0);
    setCurrentLevel(0);
    setGameState('playing');
    startMusic();
  };

  const createWall = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const game = gameRef.current;
    const level = LEVELS[game.level];
    const gapLane = Math.floor(Math.random() * LANES);
    const doubleGap = Math.random() < level.gapChance && LANES > 3;
    const gapLanes = doubleGap && gapLane < LANES - 1 ? [gapLane, gapLane + 1] : [gapLane];

    game.walls.push({ y: -20, gapLanes, passed: false });
  };

  const checkLevelUp = () => {
    const game = gameRef.current;
    for (let i = LEVELS.length - 1; i >= 0; i--) {
      if (game.score >= LEVELS[i].minScore && game.level < i) {
        game.level = i;
        game.speed = LEVELS[i].speed;
        game.wallInterval = LEVELS[i].wallInterval;
        setCurrentLevel(i);
        setLevelUpText(LEVELS[i].name);
        levelUpSound();
        updateMusicTempo(i);
        setTimeout(() => setLevelUpText(null), 1500);
        break;
      }
    }
  };

  const gameOver = () => {
    const game = gameRef.current;
    game.running = false;
    game.screenShake.intensity = 35; // Big shake on death

    // Track play for analytics (fire-and-forget)
    if (game.score >= 1) {
      fetch('/api/pixelpit/stats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ game: GAME_ID }),
      }).catch(() => {}); // Silent fail
    }

    // Death explosion particles
    for (let i = 0; i < 25; i++) {
      const deathColor = THEME.particleColors[Math.floor(Math.random() * THEME.particleColors.length)];
      game.particles.push({
        x: game.player.x + game.player.width / 2,
        y: game.player.y + game.player.height / 2,
        vx: (Math.random() - 0.5) * 10,
        vy: (Math.random() - 0.5) * 10,
        life: 40 + Math.random() * 30,
        maxLife: 70,
        color: deathColor,
        size: 3 + Math.random() * 4
      });
    }

    stopMusic();
    crashSound();
    setScore(game.score);
    // Reset entry ID and progression for new game
    setSubmittedEntryId(null);
    setProgression(null);
    setTimeout(() => setGameState('gameover'), 600);
  };

  const handleInput = (x: number) => {
    const canvas = canvasRef.current;
    const game = gameRef.current;
    if (!canvas || !game.running) return;

    const laneWidth = canvas.width / LANES;
    const currentLane = Math.floor((game.player.x + game.player.width / 2) / laneWidth);

    if (x < canvas.width / 2) {
      if (currentLane > 0) {
        game.player.targetX = (currentLane - 1) * laneWidth + laneWidth / 2 - game.player.width / 2;
        dodgeSound();
      }
    } else {
      if (currentLane < LANES - 1) {
        game.player.targetX = (currentLane + 1) * laneWidth + laneWidth / 2 - game.player.width / 2;
        dodgeSound();
      }
    }
  };

  // Game loop
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

    const update = () => {
      const game = gameRef.current;
      if (!game.running) return;

      // Move player
      const diff = game.player.targetX - game.player.x;
      game.player.x += diff * 0.2;

      // Spawn walls
      if (Date.now() - game.lastWallTime > game.wallInterval) {
        createWall();
        game.lastWallTime = Date.now();
      }

      // Update walls
      game.walls = game.walls.filter((wall) => {
        wall.y += game.speed;

        // Score when passed
        if (!wall.passed && wall.y > game.player.y) {
          wall.passed = true;
          game.score++;
          setScore(game.score);
          scoreSound();
          checkLevelUp();

          // Spawn celebration particles using theme colors
          const pColor = THEME.particleColors[Math.floor(Math.random() * THEME.particleColors.length)];
          for (let i = 0; i < 8; i++) {
            game.particles.push({
              x: game.player.x + game.player.width / 2,
              y: game.player.y,
              vx: (Math.random() - 0.5) * 4,
              vy: -Math.random() * 4 - 1,
              life: 25 + Math.random() * 15,
              maxLife: 40,
              color: pColor,
              size: 2 + Math.random() * 2
            });
          }
        }

        // Collision check
        if (wall.y < game.player.y + game.player.height && wall.y + 20 > game.player.y) {
          const laneWidth = canvas.width / LANES;
          const playerLane = Math.floor((game.player.x + game.player.width / 2) / laneWidth);
          if (!wall.gapLanes.includes(playerLane)) {
            gameOver();
            return false;
          }
        }

        return wall.y < canvas.height + 50;
      });
    };

    const draw = () => {
      const game = gameRef.current;
      const t = THEME;
      game.frameCount++;
      game.pulsePhase += 0.08;
      const laneWidth = canvas.width / LANES;

      // Apply screen shake
      ctx.save();
      if (game.screenShake.intensity > 0) {
        game.screenShake.x = (Math.random() - 0.5) * game.screenShake.intensity;
        game.screenShake.y = (Math.random() - 0.5) * game.screenShake.intensity;
        game.screenShake.intensity *= 0.9;
        ctx.translate(game.screenShake.x, game.screenShake.y);
      }

      // ========== BACKGROUND ==========
      ctx.fillStyle = t.bgPrimary;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Ambient glow at bottom
      const ambientGrad = ctx.createLinearGradient(0, canvas.height - 250, 0, canvas.height);
      ambientGrad.addColorStop(0, 'transparent');
      ambientGrad.addColorStop(1, `${t.playerColor}15`);
      ctx.fillStyle = ambientGrad;
      ctx.fillRect(0, canvas.height - 250, canvas.width, 250);

      // Very subtle lane dividers
      ctx.strokeStyle = 'rgba(255,255,255,0.03)';
      ctx.lineWidth = 1;
      for (let i = 1; i < LANES; i++) {
        ctx.beginPath();
        ctx.moveTo(i * laneWidth, 0);
        ctx.lineTo(i * laneWidth, canvas.height);
        ctx.stroke();
      }

      // ========== PARTICLES ==========
      game.particles = game.particles.filter(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.1;
        p.life--;
        if (p.life <= 0) return false;

        const alpha = Math.max(0, p.life / p.maxLife);
        const radius = Math.max(0.5, p.size * alpha);
        ctx.fillStyle = p.color.replace(')', `,${alpha})`).replace('rgb', 'rgba');
        ctx.beginPath();
        ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
        ctx.fill();
        return true;
      });

      // ========== BEAMS / WALLS ==========
      const pulse = Math.sin(game.pulsePhase) * 0.3 + 0.7;
      const beamHeight = 20;

      game.walls.forEach((wall) => {
        for (let i = 0; i < LANES; i++) {
          if (!wall.gapLanes.includes(i)) {
            const x = i * laneWidth;
            // Soft warm glowing beams
            ctx.shadowBlur = 40 * pulse;
            ctx.shadowColor = t.beamGlow;
            ctx.fillStyle = t.beamColor;
            ctx.beginPath();
            ctx.roundRect(x + 4, wall.y + 2, laneWidth - 8, beamHeight - 4, 10);
            ctx.fill();
            // Soft inner glow
            ctx.fillStyle = `rgba(255,250,220,${0.3 * pulse})`;
            ctx.beginPath();
            ctx.roundRect(x + 8, wall.y + 4, laneWidth - 16, beamHeight - 8, 6);
            ctx.fill();
            ctx.shadowBlur = 0;
          }
        }
      });

      // ========== PLAYER TRAIL ==========
      game.trail.push({
        x: game.player.x + game.player.width / 2,
        y: game.player.y + game.player.height,
        alpha: 1
      });
      if (game.trail.length > 15) game.trail.shift();

      game.trail.forEach((point) => {
        point.alpha *= 0.85;
        if (point.alpha < 0.05) return;
        ctx.shadowBlur = 8;
        ctx.shadowColor = t.playerAccent;
        ctx.fillStyle = t.playerColor + Math.floor(point.alpha * 80).toString(16).padStart(2, '0');
        ctx.beginPath();
        ctx.roundRect(point.x - 4, point.y - 15, 8, 15, 4);
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      // ========== PLAYER ==========
      const px = game.player.x;
      const py = game.player.y;
      const pw = game.player.width;
      const ph = game.player.height;

      // Soft warm rounded player with diffuse glow
      ctx.shadowBlur = 25;
      ctx.shadowColor = t.playerAccent;
      ctx.fillStyle = t.playerColor;
      ctx.beginPath();
      ctx.roundRect(px - 2, py, pw + 4, ph, 12);
      ctx.fill();
      // Soft inner light
      const playerGrad = ctx.createLinearGradient(px, py, px, py + ph);
      playerGrad.addColorStop(0, `${t.playerAccent}60`);
      playerGrad.addColorStop(0.5, 'transparent');
      playerGrad.addColorStop(1, `${t.playerAccent}30`);
      ctx.fillStyle = playerGrad;
      ctx.beginPath();
      ctx.roundRect(px - 2, py, pw + 4, ph, 12);
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.restore();
    };

    const gameLoop = () => {
      update();
      draw();
      animationId = requestAnimationFrame(gameLoop);
    };

    gameLoop();

    // Input handlers
    const handleTouch = (e: TouchEvent) => {
      e.preventDefault();
      handleInput(e.touches[0].clientX);
    };
    const handleMouse = (e: MouseEvent) => handleInput(e.clientX);
    const handleKey = (e: KeyboardEvent) => {
      const game = gameRef.current;
      if (!game.running) return;
      const laneWidth = canvas.width / LANES;
      const currentLane = Math.floor((game.player.x + game.player.width / 2) / laneWidth);

      if (e.key === 'ArrowLeft' || e.key === 'a') {
        if (currentLane > 0) {
          game.player.targetX = (currentLane - 1) * laneWidth + laneWidth / 2 - game.player.width / 2;
          dodgeSound();
        }
      } else if (e.key === 'ArrowRight' || e.key === 'd') {
        if (currentLane < LANES - 1) {
          game.player.targetX = (currentLane + 1) * laneWidth + laneWidth / 2 - game.player.width / 2;
          dodgeSound();
        }
      }
    };

    canvas.addEventListener('touchstart', handleTouch);
    canvas.addEventListener('mousedown', handleMouse);
    document.addEventListener('keydown', handleKey);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('touchstart', handleTouch);
      canvas.removeEventListener('mousedown', handleMouse);
      document.removeEventListener('keydown', handleKey);
      stopMusic();
    };
  }, []);

  // Note: Leaderboard and score submission functions are now handled by
  // the Leaderboard and ScoreFlow components respectively

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
          color: ${COLORS.cream};
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          overflow: hidden;
          touch-action: none;
          user-select: none;
        }

        /* Soft button behavior */
        button {
          transition: all 0.15s ease-out;
          position: relative;
          overflow: hidden;
        }
        button:hover {
          transform: translateY(-2px);
          filter: brightness(1.1);
        }
        button:active {
          transform: translateY(1px);
        }

        /* Primary button glow */
        .btn-primary {
          animation: btnGlow 3s ease-in-out infinite;
        }
        @keyframes btnGlow {
          0%, 100% { box-shadow: 0 8px 30px rgba(251,191,36,0.3); }
          50% { box-shadow: 0 8px 40px rgba(251,191,36,0.5); }
        }

        /* Input focus states */
        input {
          outline: none;
        }
        input:focus {
          box-shadow: 0 0 0 2px ${COLORS.teal}40;
        }
      `}</style>

      <canvas
        ref={canvasRef}
        style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh' }}
      />

      {/* Sound Toggle */}
      <button
        onClick={() => {
          initAudio();
          setSoundEnabled(!soundEnabled);
          if (gameRef.current.masterGain) {
            gameRef.current.masterGain.gain.value = soundEnabled ? 0 : 1;
          }
        }}
        style={{
          position: 'fixed',
          top: 20,
          right: 20,
          zIndex: 150,
          background: 'rgba(0,0,0,0.4)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 8,
          padding: '10px 14px',
          color: COLORS.cream,
          fontFamily: "ui-monospace, monospace",
          fontSize: 14,
          cursor: 'pointer',
          opacity: soundEnabled ? 0.8 : 0.4,
        }}
      >
        {soundEnabled ? '♪' : '♪̶'}
      </button>

      {/* Score UI */}
      {gameState === 'playing' && (
        <div style={{
          position: 'fixed',
          top: 25,
          left: 0,
          right: 0,
          textAlign: 'center',
          zIndex: 10,
          pointerEvents: 'none',
        }}>
          <div style={{
            fontFamily: "ui-monospace, monospace",
            fontSize: 48,
            fontWeight: 200,
            color: COLORS.gold,
            textShadow: `0 0 40px rgba(251,191,36,0.4)`,
          }}>
            {score}
          </div>
          <div style={{
            fontFamily: "ui-monospace, monospace",
            fontSize: 11,
            color: COLORS.teal,
            marginTop: 8,
            letterSpacing: 4,
            textShadow: `0 0 20px ${COLORS.teal}60`,
            textTransform: 'lowercase',
          }}>
            {LEVELS[currentLevel].name}
          </div>
        </div>
      )}

      {/* Level Up Notification */}
      {levelUpText && (
        <div style={{
          position: 'fixed',
          top: '35%',
          left: 0,
          right: 0,
          textAlign: 'center',
          zIndex: 50,
          fontFamily: "ui-monospace, monospace",
          fontSize: 32,
          fontWeight: 300,
          color: COLORS.teal,
          textShadow: `0 0 40px ${COLORS.teal}, 0 0 80px ${COLORS.teal}80`,
          animation: 'pulse 0.5s ease-out',
          letterSpacing: 6,
        }}>
          ↑ {levelUpText} ↑
        </div>
      )}

      {/* Start Screen */}
      {gameState === 'start' && (
        <div style={{
          position: 'fixed',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: COLORS.bg,
          zIndex: 100,
          textAlign: 'center',
          padding: 40,
        }}>
          {/* Card */}
          <div style={{
            background: COLORS.surface,
            border: '1px solid rgba(255,255,255,0.05)',
            padding: '50px 60px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
            borderRadius: 16,
          }}>
            <h1 style={{
              fontFamily: "ui-monospace, monospace",
              fontSize: 64,
              fontWeight: 300,
              color: COLORS.gold,
              marginBottom: 20,
              letterSpacing: 8,
              textShadow: '0 0 40px rgba(251,191,36,0.4)',
            }}>
              SUPERBEAM
            </h1>
            <p style={{
              fontSize: 14,
              fontFamily: "ui-monospace, monospace",
              color: COLORS.tealLight,
              marginBottom: 35,
              lineHeight: 1.8,
              letterSpacing: 2,
            }}>
              dodge the light<br />
              ← tap →
            </p>
            <button
              className="btn-primary"
              onClick={startGame}
              style={{
                background: COLORS.gold,
                color: COLORS.bg,
                border: 'none',
                padding: '16px 50px',
                fontSize: 16,
                fontFamily: "ui-monospace, monospace",
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 8px 30px rgba(251,191,36,0.3)',
                borderRadius: 8,
                letterSpacing: 2,
              }}
            >
              play
            </button>
          </div>
          <div style={{
            marginTop: 30,
            fontSize: 12,
            fontFamily: "ui-monospace, monospace",
            letterSpacing: 3,
          }}>
            <span style={{ color: COLORS.gold }}>pixel</span>
            <span style={{ color: COLORS.teal }}>pit</span>
            <span style={{ color: COLORS.cream, opacity: 0.4 }}> arcade</span>
          </div>
        </div>
      )}

      {/* Game Over Screen */}
      {gameState === 'gameover' && (
        <div style={{
          position: 'fixed',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: COLORS.bg,
          zIndex: 100,
          textAlign: 'center',
          padding: 40,
        }}>
          <h1 style={{
            fontFamily: "ui-monospace, monospace",
            fontSize: 28,
            fontWeight: 300,
            color: COLORS.tealLight,
            marginBottom: 15,
            letterSpacing: 6,
          }}>
            game over
          </h1>
          <div style={{
            fontFamily: "ui-monospace, monospace",
            fontSize: 80,
            fontWeight: 200,
            color: COLORS.gold,
            marginBottom: 30,
            textShadow: '0 0 40px rgba(251,191,36,0.4)',
          }}>
            {score}
          </div>

          {/* Score Submission - Using extracted ScoreFlow component */}
          <ScoreFlow
            score={score}
            gameId={GAME_ID}
            colors={SCORE_FLOW_COLORS}
            maxScore={20}
            onRankReceived={(rank, entryId) => {
              setSubmittedEntryId(entryId ?? null);
            }}
            onProgression={(prog) => setProgression(prog)}
          />

          {/* Animated Progression Display */}
          {progression && (
            <ProgressionDisplay progression={progression} />
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 15, alignItems: 'center' }}>
            <button
              className="btn-primary"
              onClick={startGame}
              style={{
                background: COLORS.teal,
                color: COLORS.bg,
                border: 'none',
                borderRadius: 8,
                padding: '16px 50px',
                fontSize: 15,
                fontFamily: "ui-monospace, monospace",
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 8px 25px rgba(45,212,191,0.3)',
                letterSpacing: 2,
              }}
            >
              play again
            </button>
            <button
              onClick={() => setGameState('leaderboard')}
              style={{
                background: 'transparent',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 6,
                color: COLORS.muted,
                padding: '14px 35px',
                fontSize: 11,
                fontFamily: "ui-monospace, monospace",
                cursor: 'pointer',
                letterSpacing: 2,
              }}
            >
              leaderboard
            </button>
            {/* Groups Share button for logged-in users */}
            {user ? (
              <button
                onClick={() => setShowShareModal(true)}
                style={{
                  background: 'transparent',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 6,
                  color: COLORS.muted,
                  padding: '14px 35px',
                  fontSize: 11,
                  fontFamily: "ui-monospace, monospace",
                  cursor: 'pointer',
                  letterSpacing: 2,
                }}
              >
                share / groups
              </button>
            ) : (
              <ShareButtonContainer
                id="share-btn-container"
                url={typeof window !== 'undefined' ? `${window.location.origin}/pixelpit/arcade/superbeam/share/${score}` : ''}
                text={`I scored ${score} on SUPERBEAM! Can you beat me?`}
                style="minimal"
                socialLoaded={socialLoaded}
              />
            )}
          </div>
        </div>
      )}

      {/* Leaderboard Screen - Using extracted Leaderboard component */}
      {gameState === 'leaderboard' && (
        <Leaderboard
          gameId={GAME_ID}
          limit={8}
          entryId={submittedEntryId ?? undefined}
          colors={LEADERBOARD_COLORS}
          onClose={() => setGameState('gameover')}
          groupsEnabled={true}
          gameUrl={GAME_URL}
          socialLoaded={socialLoaded}
        />
      )}

      {/* Share Modal for Groups */}
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
