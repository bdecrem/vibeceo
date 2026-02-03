'use client';

import React, { useEffect, useRef, useState } from 'react';
import Script from 'next/script';
import {
  ScoreFlow,
  Leaderboard,
  ShareModal,
  usePixelpitSocial,
  type PixelpitUser,
  type ScoreFlowColors,
  type LeaderboardColors,
  type ProgressionResult,
} from '@/app/pixelpit/components';

// SPROUT theme - playful, nature, warm (refined palette)
const THEME = {
  // Sky gradient - warm to cool
  skyTop: '#fef3c7',       // warm cream/peach
  skyMid: '#a7f3d0',       // soft mint
  skyBottom: '#6ee7b7',    // vibrant mint
  // Hills - atmospheric depth
  hillFar: '#bbf7d0',      // very light, hazy
  hillMid: '#86efac',      // medium green
  hillNear: '#4ade80',     // saturated green
  // Ground
  ground: '#92400e',       // rich brown
  groundMid: '#a16207',    // warm brown
  groundLight: '#ca8a04',  // highlight
  grass: '#22c55e',        // vibrant grass
  grassLight: '#4ade80',   // grass highlight
  grassDark: '#16a34a',    // grass shadow
  // Accents
  surface: '#ffffff',
  border: '#1c1917',       // warm black
  bubblegum: '#f472b6',
  sunshine: '#fbbf24',     // warm gold
  sunGlow: '#fef08a',      // sun center
  mint: '#34d399',
  text: '#1c1917',
  muted: '#78716c',   // warm gray for secondary text
  bg: '#fef3c7',      // for UI styling (matches skyTop)
  // Flowers
  flowerPink: '#f9a8d4',
  flowerWhite: '#fefce8',
  flowerYellow: '#fde047',
};

// UI colors for components (warm nature theme to match in-game)
const COLORS = {
  bg: 'rgba(254, 243, 199, 0.95)',  // warm cream, semi-transparent
  surface: '#ffffff',               // white cards
  primary: '#f59e0b',               // amber/gold
  secondary: '#22c55e',             // grass green
  text: '#1c1917',                  // warm black
  muted: '#78716c',                 // warm gray
  error: '#dc2626',                 // red
};

// Color mappings for extracted components (warm theme)
const SCORE_FLOW_COLORS: ScoreFlowColors = {
  bg: '#fef3c7',              // warm cream
  surface: '#ffffff',
  primary: '#f59e0b',         // amber
  secondary: '#22c55e',       // green
  text: '#1c1917',
  muted: '#78716c',
  error: '#dc2626',
};

const LEADERBOARD_COLORS: LeaderboardColors = {
  bg: '#fef3c7',
  surface: '#ffffff',
  primary: '#f59e0b',
  secondary: '#22c55e',
  text: '#1c1917',
  muted: '#78716c',
};

// Game constants
const GRAVITY = 1800;           // Strong constant pull - gravity always wins
const BOOST_VELOCITY = -580;    // Upward impulse per tap
const BOOST_COOLDOWN = 0.35;    // Seconds between effective taps
const BASE_SPEED = 280;
// Sundrops needed to reach each size level (index = target size)
// Size 1→2: 5, Size 2→3: 10, Size 3→4: 20, Size 4→5: 30
const SUNDROPS_PER_LEVEL = [0, 0, 5, 10, 20, 30];
const MAX_SIZE = 5;
const SMASH_SIZE = 3;  // Size 3+ can smash (but it costs you a level!)

// Particle type
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  life: number;
  decay: number;
  gravity?: boolean;
  leaf?: boolean;
}

// Obstacle type
interface Obstacle {
  x: number;
  y: number;
  type: 'mushroom' | 'rock' | 'acorn' | 'thorn';
  size: number;
  smashable: boolean;
  wiggle: number;
}

// Sundrop type
interface Sundrop {
  x: number;
  y: number;
  size: number;
  sparkle: number;
  collected: boolean;
}

// Cloud type
interface Cloud {
  x: number;
  y: number;
  size: number;
  speed: number;
}

// Hill point for parallax layers
interface HillPoint {
  x: number;
  y: number;
}

// Ground decoration (grass tufts, flowers, pebbles)
interface GroundDecor {
  x: number;
  type: 'tuft' | 'flower' | 'pebble';
  size: number;
  color: string;
  sway: number;  // animation offset
}

// Ambient floating particle (seeds, pollen)
interface AmbientParticle {
  x: number;
  y: number;
  size: number;
  drift: number;   // horizontal sway
  float: number;   // vertical bob
  alpha: number;
  speed: number;
}

// Bird flying in sky
interface Bird {
  x: number;
  y: number;
  size: number;
  speed: number;
  wingPhase: number;
  type: 'v' | 'flap';  // v-shape or flapping
}

// Pop-up text effect (level up, etc)
interface PopText {
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
  scale: number;
  vy: number;
}

// Animated progression display component
function ProgressionDisplay({ progression }: { progression: ProgressionResult }) {
  const [animatedXp, setAnimatedXp] = useState(0);
  const [animatedProgress, setAnimatedProgress] = useState(0);
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [barPulse, setBarPulse] = useState(false);

  useEffect(() => {
    const startDelay = setTimeout(() => {
      const startProgress = progression.leveledUp
        ? 0
        : Math.max(0, progression.levelProgress - progression.xpEarned);

      setAnimatedProgress(startProgress);
      setAnimatedXp(0);

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

      const barDelay = setTimeout(() => {
        setBarPulse(true);

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
      background: 'rgba(255,255,255,0.9)',
      borderRadius: 16,
      padding: '16px 24px',
      marginBottom: 16,
      boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
      textAlign: 'center',
      minWidth: 200,
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        marginBottom: 10,
      }}>
        <span style={{
          fontFamily: 'system-ui, -apple-system, sans-serif',
          fontSize: 18,
          fontWeight: 700,
          color: COLORS.primary,
        }}>
          +{animatedXp} XP
        </span>
        {progression.streak > 1 && (
          <span style={{
            background: COLORS.secondary,
            color: '#fff',
            padding: '4px 10px',
            borderRadius: 12,
            fontSize: 11,
            fontWeight: 600,
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}>
            {progression.multiplier}x streak
          </span>
        )}
      </div>

      <div style={{
        background: 'rgba(0,0,0,0.08)',
        borderRadius: 8,
        height: 10,
        overflow: 'hidden',
        marginBottom: 8,
        position: 'relative',
      }}>
        <div style={{
          background: `linear-gradient(90deg, ${COLORS.primary}, ${COLORS.secondary})`,
          height: '100%',
          width: `${progressPercent}%`,
          borderRadius: 8,
          transition: 'width 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
          boxShadow: barPulse ? `0 0 12px ${COLORS.primary}` : 'none',
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
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: 12,
        color: COLORS.muted,
      }}>
        Level {progression.level} · {Math.floor(animatedProgress)}/{progression.levelNeeded} XP
      </div>

      {showLevelUp && (
        <div style={{
          marginTop: 10,
          padding: '8px 16px',
          background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.secondary})`,
          borderRadius: 12,
          fontFamily: 'system-ui, -apple-system, sans-serif',
          fontSize: 14,
          fontWeight: 700,
          color: '#fff',
          animation: 'popIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}>
          LEVEL UP!
        </div>
      )}

      {progression.streak >= 3 && (
        <div style={{
          marginTop: 8,
          fontFamily: 'system-ui, -apple-system, sans-serif',
          fontSize: 11,
          fontWeight: 600,
          color: COLORS.secondary,
        }}>
          🔥 {progression.streak} day streak
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

// Fun level-up messages
const LEVEL_UP_WORDS = ['POW!', 'BOOM!', 'YES!', 'HUGE!', 'WOW!', 'NICE!', 'GROW!', 'BIG!'];

export default function SproutRunGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<'start' | 'playing' | 'gameover' | 'leaderboard'>('start');
  const [score, setScore] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [socialLoaded, setSocialLoaded] = useState(false);

  // Live distance display (updated from game loop)
  const [displayDistance, setDisplayDistance] = useState(0);
  const [displayHighScore, setDisplayHighScore] = useState(0);

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
    ? `${window.location.origin}/pixelpit/arcade/sprout-run`
    : 'https://pixelpit.io/pixelpit/arcade/sprout-run';

  const GAME_ID = 'sprout-run';

  // Detect group code from URL and store it
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

  // Game state ref
  const gameRef = useRef({
    running: false,
    distance: 0,
    highScore: 0,
    scrollOffset: 0,
    spawnTimer: 0,
    sundropTimer: 0,
    groundY: 0,
    slowMo: 1,
    slowMoTimer: 0,
    deathPauseTimer: 0,
    lastBoostTime: 0,  // For tap cooldown
    player: {
      x: 0,
      y: 0,
      vy: 0,
      baseSize: 20,
      size: 1,
      sundrops: 0,
      grounded: true,
      squash: 1,
      stretch: 1,
      wiggle: 0,
    },
    obstacles: [] as Obstacle[],
    sundrops: [] as Sundrop[],
    particles: [] as Particle[],
    clouds: [] as Cloud[],
    farClouds: [] as Cloud[],
    // Parallax hills
    hillsFar: [] as HillPoint[],
    hillsMid: [] as HillPoint[],
    hillsNear: [] as HillPoint[],
    // Ground decorations
    groundDecor: [] as GroundDecor[],
    // Ambient particles
    ambientParticles: [] as AmbientParticle[],
    // Birds
    birds: [] as Bird[],
    // Pop-up text effects
    popTexts: [] as PopText[],
    // Animation time
    time: 0,
    screenShake: { x: 0, y: 0, duration: 0 },
    screenFlash: { color: null as string | null, duration: 0 },
    levelUpPulse: 0,
    // Audio
    audioCtx: null as AudioContext | null,
    musicPlaying: false,
    musicInterval: null as NodeJS.Timeout | null,
    musicStep: 0,
    arpStep: 0,
  });

  // Audio functions
  const initAudio = () => {
    const game = gameRef.current;
    if (game.audioCtx) return;
    game.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  };

  const playTone = (freq: number, duration: number, type: OscillatorType = 'sine', volume = 0.3, attack = 0.01) => {
    const game = gameRef.current;
    if (!game.audioCtx || !soundEnabled) return;
    const osc = game.audioCtx.createOscillator();
    const gain = game.audioCtx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, game.audioCtx.currentTime);
    gain.gain.linearRampToValueAtTime(volume, game.audioCtx.currentTime + attack);
    gain.gain.linearRampToValueAtTime(0, game.audioCtx.currentTime + duration);
    osc.connect(gain);
    gain.connect(game.audioCtx.destination);
    osc.start();
    osc.stop(game.audioCtx.currentTime + duration);
  };

  const playNoise = (duration: number, volume = 0.1) => {
    const game = gameRef.current;
    if (!game.audioCtx || !soundEnabled) return;
    const bufferSize = game.audioCtx.sampleRate * duration;
    const buffer = game.audioCtx.createBuffer(1, bufferSize, game.audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noise = game.audioCtx.createBufferSource();
    noise.buffer = buffer;
    const gainNode = game.audioCtx.createGain();
    const filter = game.audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 800;
    gainNode.gain.setValueAtTime(volume, game.audioCtx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0, game.audioCtx.currentTime + duration);
    noise.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(game.audioCtx.destination);
    noise.start();
  };

  const playCollect = () => {
    const notes = [523, 659, 784];
    const freq = notes[Math.floor(Math.random() * notes.length)];
    playTone(freq, 0.2, 'triangle', 0.25, 0.005);
    playTone(freq * 2, 0.15, 'sine', 0.1, 0.01);
  };

  const playLevelUp = () => {
    const notes = [523, 659, 784, 1047];
    notes.forEach((freq, i) => {
      setTimeout(() => playTone(freq, 0.3, 'triangle', 0.2), i * 80);
    });
  };

  const playSmash = () => {
    playNoise(0.15, 0.3);
    playTone(80, 0.2, 'square', 0.3, 0.01);
    playTone(60, 0.25, 'sawtooth', 0.2, 0.01);
  };

  const playHurt = () => {
    const game = gameRef.current;
    if (!game.audioCtx || !soundEnabled) return;
    const osc = game.audioCtx.createOscillator();
    const gain = game.audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, game.audioCtx.currentTime);
    osc.frequency.linearRampToValueAtTime(150, game.audioCtx.currentTime + 0.3);
    gain.gain.setValueAtTime(0.2, game.audioCtx.currentTime);
    gain.gain.linearRampToValueAtTime(0, game.audioCtx.currentTime + 0.3);
    osc.connect(gain);
    gain.connect(game.audioCtx.destination);
    osc.start();
    osc.stop(game.audioCtx.currentTime + 0.3);
  };

  const playDeath = () => {
    const game = gameRef.current;
    if (!game.audioCtx || !soundEnabled) return;
    const osc = game.audioCtx.createOscillator();
    const gain = game.audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, game.audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, game.audioCtx.currentTime + 0.5);
    gain.gain.setValueAtTime(0.25, game.audioCtx.currentTime);
    gain.gain.linearRampToValueAtTime(0, game.audioCtx.currentTime + 0.5);
    osc.connect(gain);
    gain.connect(game.audioCtx.destination);
    osc.start();
    osc.stop(game.audioCtx.currentTime + 0.5);
  };

  // Music
  const MUSIC = {
    bpm: 120,
    bass: [131, 131, 165, 0, 196, 0, 196, 0, 131, 131, 165, 0, 196, 165, 131, 0],
    melody: [523, 0, 659, 0, 784, 0, 659, 523, 880, 0, 784, 0, 659, 784, 523, 0],
    kick: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1],
    hat: [0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1, 1],
    arps: [
      [523, 659, 784, 1047],
      [523, 659, 784, 1047],
      [587, 698, 880, 1175],
      [392, 523, 659, 784],
    ],
  };

  const playKick = () => {
    const game = gameRef.current;
    if (!game.audioCtx || !soundEnabled) return;
    const osc = game.audioCtx.createOscillator();
    const gain = game.audioCtx.createGain();
    osc.connect(gain);
    gain.connect(game.audioCtx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(100, game.audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40, game.audioCtx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.22, game.audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, game.audioCtx.currentTime + 0.15);
    osc.start();
    osc.stop(game.audioCtx.currentTime + 0.15);
  };

  const playHat = () => {
    const game = gameRef.current;
    if (!game.audioCtx || !soundEnabled) return;
    const bufferSize = game.audioCtx.sampleRate * 0.035;
    const buffer = game.audioCtx.createBuffer(1, bufferSize, game.audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noise = game.audioCtx.createBufferSource();
    noise.buffer = buffer;
    const hipass = game.audioCtx.createBiquadFilter();
    hipass.type = 'highpass';
    hipass.frequency.value = 5000;
    const lopass = game.audioCtx.createBiquadFilter();
    lopass.type = 'lowpass';
    lopass.frequency.value = 12000;
    const gain = game.audioCtx.createGain();
    gain.gain.setValueAtTime(0.07, game.audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, game.audioCtx.currentTime + 0.035);
    noise.connect(hipass);
    hipass.connect(lopass);
    lopass.connect(gain);
    gain.connect(game.audioCtx.destination);
    noise.start();
  };

  const playBass = (freq: number) => {
    const game = gameRef.current;
    if (!game.audioCtx || !soundEnabled || freq === 0) return;
    const osc = game.audioCtx.createOscillator();
    const gain = game.audioCtx.createGain();
    osc.connect(gain);
    gain.connect(game.audioCtx.destination);
    osc.type = 'triangle';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.15, game.audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, game.audioCtx.currentTime + 0.15);
    osc.start();
    osc.stop(game.audioCtx.currentTime + 0.18);
  };

  const playMelody = (freq: number) => {
    const game = gameRef.current;
    if (!game.audioCtx || !soundEnabled || freq === 0) return;
    const osc = game.audioCtx.createOscillator();
    const osc2 = game.audioCtx.createOscillator();
    const gain = game.audioCtx.createGain();
    osc.connect(gain);
    osc2.connect(gain);
    gain.connect(game.audioCtx.destination);
    osc.type = 'triangle';
    osc2.type = 'sine';
    osc.frequency.value = freq;
    osc2.frequency.value = freq * 2;
    gain.gain.setValueAtTime(0.12, game.audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, game.audioCtx.currentTime + 0.25);
    osc.start();
    osc2.start();
    osc.stop(game.audioCtx.currentTime + 0.28);
    osc2.stop(game.audioCtx.currentTime + 0.28);
  };

  const playArp = (freqs: number[]) => {
    const game = gameRef.current;
    if (!game.audioCtx || !soundEnabled) return;
    const freq = freqs[game.arpStep % freqs.length];
    const osc = game.audioCtx.createOscillator();
    const gain = game.audioCtx.createGain();
    osc.connect(gain);
    gain.connect(game.audioCtx.destination);
    osc.type = 'square';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.04, game.audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, game.audioCtx.currentTime + 0.06);
    osc.start();
    osc.stop(game.audioCtx.currentTime + 0.08);
  };

  const musicTick = () => {
    const game = gameRef.current;
    if (!game.audioCtx || !game.musicPlaying) return;

    const step = game.musicStep % 16;
    const bar = Math.floor(game.musicStep / 16) % 4;

    if (MUSIC.kick[step]) playKick();
    if (MUSIC.hat[step]) playHat();
    if (MUSIC.melody[step]) playMelody(MUSIC.melody[step]);
    if (game.distance > 200 && step % 2 === 0) playBass(MUSIC.bass[step]);
    if (game.distance > 400) {
      playArp(MUSIC.arps[bar]);
      game.arpStep++;
    }
    if (game.distance > 800 && step === 0) {
      playTone(523, 0.15, 'square', 0.06, 0.01);
      playTone(659, 0.15, 'square', 0.05, 0.01);
      playTone(784, 0.15, 'square', 0.04, 0.01);
    }

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
    const stepTime = (60 / MUSIC.bpm) * 1000 / 4;
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

  // Game functions
  const resetGame = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const game = gameRef.current;
    game.groundY = canvas.height - 80;
    game.distance = 0;
    game.scrollOffset = 0;
    game.spawnTimer = 0;
    game.sundropTimer = 0;
    game.slowMo = 1;
    game.slowMoTimer = 0;
    game.deathPauseTimer = 0;

    game.player = {
      x: canvas.width * 0.2,
      y: game.groundY - 20,
      vy: 0,
      baseSize: 20,
      size: 1,
      sundrops: 0,
      grounded: true,
      squash: 1,
      stretch: 1,
      wiggle: 0,
    };

    game.obstacles = [];
    game.sundrops = [];
    game.particles = [];
    game.screenShake = { x: 0, y: 0, duration: 0 };
    game.screenFlash = { color: null, duration: 0 };
    game.levelUpPulse = 0;

    // Init far clouds (fewer, larger, higher)
    game.farClouds = [];
    for (let i = 0; i < 4; i++) {
      game.farClouds.push({
        x: Math.random() * canvas.width * 1.5,
        y: 60 + Math.random() * 80,
        size: 100 + Math.random() * 80,
        speed: 5 + Math.random() * 8,
      });
    }

    // Init near clouds
    game.clouds = [];
    for (let i = 0; i < 3; i++) {
      game.clouds.push({
        x: Math.random() * canvas.width,
        y: 80 + Math.random() * 100,
        size: 50 + Math.random() * 40,
        speed: 15 + Math.random() * 20,
      });
    }

    // Generate rolling hills (procedural, seamless)
    const generateHills = (baseY: number, amplitude: number, frequency: number, points: number): HillPoint[] => {
      const hills: HillPoint[] = [];
      const segmentWidth = (canvas.width + 200) / points;
      for (let i = 0; i <= points; i++) {
        const x = i * segmentWidth - 100;
        // Combine multiple sine waves for organic feel
        const y = baseY +
          Math.sin(i * frequency) * amplitude +
          Math.sin(i * frequency * 2.3 + 1) * amplitude * 0.4 +
          Math.sin(i * frequency * 0.7 + 2) * amplitude * 0.6;
        hills.push({ x, y });
      }
      return hills;
    };

    game.hillsFar = generateHills(game.groundY - 180, 40, 0.3, 12);
    game.hillsMid = generateHills(game.groundY - 100, 50, 0.4, 10);
    game.hillsNear = generateHills(game.groundY - 40, 30, 0.5, 14);

    // Init ground decorations
    game.groundDecor = [];
    const decorTypes: Array<'tuft' | 'flower' | 'pebble'> = ['tuft', 'tuft', 'tuft', 'flower', 'flower', 'pebble'];
    const flowerColors = [THEME.flowerPink, THEME.flowerWhite, THEME.flowerYellow];
    for (let i = 0; i < 40; i++) {
      const type = decorTypes[Math.floor(Math.random() * decorTypes.length)];
      game.groundDecor.push({
        x: Math.random() * (canvas.width + 400) - 200,
        type,
        size: type === 'pebble' ? 3 + Math.random() * 4 : 6 + Math.random() * 8,
        color: type === 'flower'
          ? flowerColors[Math.floor(Math.random() * flowerColors.length)]
          : type === 'tuft' ? THEME.grass : THEME.groundLight,
        sway: Math.random() * Math.PI * 2,
      });
    }

    // Init ambient particles (floating seeds, pollen)
    game.ambientParticles = [];
    for (let i = 0; i < 15; i++) {
      game.ambientParticles.push({
        x: Math.random() * canvas.width,
        y: 100 + Math.random() * (game.groundY - 200),
        size: 2 + Math.random() * 3,
        drift: Math.random() * Math.PI * 2,
        float: Math.random() * Math.PI * 2,
        alpha: 0.3 + Math.random() * 0.4,
        speed: 10 + Math.random() * 20,
      });
    }

    // Init birds
    game.birds = [];
    for (let i = 0; i < 4; i++) {
      game.birds.push({
        x: Math.random() * canvas.width * 1.5,
        y: 80 + Math.random() * 150,
        size: 8 + Math.random() * 8,
        speed: 40 + Math.random() * 60,
        wingPhase: Math.random() * Math.PI * 2,
        type: Math.random() > 0.5 ? 'v' : 'flap',
      });
    }

    // Clear pop texts
    game.popTexts = [];

    game.time = 0;
  };

  const startGame = () => {
    const game = gameRef.current;
    resetGame();
    game.running = true;
    setGameState('playing');
    // Music will be started by the music useEffect
  };

  // Separate useEffect for music - starts when playing, stops when not
  useEffect(() => {
    if (gameState === 'playing') {
      startMusic();
    } else {
      stopMusic();
    }
  }, [gameState]);

  const handleGameOver = () => {
    const game = gameRef.current;
    game.running = false;

    // Track play for analytics
    if (game.distance >= 1) {
      fetch('/api/pixelpit/stats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ game: GAME_ID }),
      }).catch(() => {});
    }

    stopMusic();
    setScore(Math.floor(game.distance));
    setSubmittedEntryId(null);
    setProgression(null);
    setTimeout(() => setGameState('gameover'), 600);
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
      gameRef.current.groundY = canvas.height - 80;
    };
    resize();
    window.addEventListener('resize', resize);

    // Load high score
    gameRef.current.highScore = parseInt(localStorage.getItem('sproutrun-high') || '0');

    let lastTime = 0;
    let animationId: number;

    const emitParticles = (x: number, y: number, color: string, count: number, speed = 200) => {
      const game = gameRef.current;
      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 / count) * i + Math.random() * 0.5;
        game.particles.push({
          x, y,
          vx: Math.cos(angle) * speed * (0.5 + Math.random() * 0.5),
          vy: Math.sin(angle) * speed * (0.5 + Math.random() * 0.5) - 100,
          size: 4 + Math.random() * 4,
          color,
          life: 1,
          decay: 2 + Math.random(),
        });
      }
    };

    const emitDebris = (x: number, y: number) => {
      const game = gameRef.current;
      const colors = [THEME.ground, THEME.groundLight, '#666'];
      for (let i = 0; i < 8; i++) {
        game.particles.push({
          x, y,
          vx: (Math.random() - 0.5) * 300,
          vy: -200 - Math.random() * 200,
          size: 3 + Math.random() * 5,
          color: colors[Math.floor(Math.random() * colors.length)],
          life: 1,
          decay: 3,
          gravity: true,
        });
      }
    };

    const emitLeaves = (x: number, y: number) => {
      const game = gameRef.current;
      const colors = [THEME.mint, THEME.grass, '#86efac'];
      for (let i = 0; i < 12; i++) {
        game.particles.push({
          x, y,
          vx: (Math.random() - 0.5) * 150,
          vy: -100 - Math.random() * 150,
          size: 6 + Math.random() * 6,
          color: colors[Math.floor(Math.random() * colors.length)],
          life: 1,
          decay: 1.5,
          gravity: true,
          leaf: true,
        });
      }
    };

    const emitJumpParticles = (x: number, y: number) => {
      const game = gameRef.current;
      const colors = [THEME.mint, THEME.grass, '#bbf7d0'];
      // Burst of particles downward on jump
      for (let i = 0; i < 6; i++) {
        game.particles.push({
          x: x + (Math.random() - 0.5) * 20,
          y: y,
          vx: (Math.random() - 0.5) * 80,
          vy: 80 + Math.random() * 120,
          size: 3 + Math.random() * 4,
          color: colors[Math.floor(Math.random() * colors.length)],
          life: 1,
          decay: 3,
          leaf: true,
        });
      }
    };

    const spawnObstacle = () => {
      const game = gameRef.current;
      const types: Array<'mushroom' | 'rock' | 'acorn' | 'thorn'> = ['mushroom', 'rock', 'acorn', 'thorn'];
      const weights = [0.3, 0.25, 0.25, 0.2];
      let r = Math.random();
      let type = types[0];
      let cumulative = 0;
      for (let i = 0; i < types.length; i++) {
        cumulative += weights[i];
        if (r < cumulative) { type = types[i]; break; }
      }

      const smashable = type !== 'thorn';
      const baseSize = type === 'thorn' ? 25 : (type === 'rock' ? 35 : 30);

      game.obstacles.push({
        x: canvas.width + 50,
        y: game.groundY - baseSize / 2,
        type,
        size: baseSize,
        smashable,
        wiggle: 0,
      });
    };

    const spawnSundrop = () => {
      const game = gameRef.current;
      const y = game.groundY - 60 - Math.random() * 100;
      game.sundrops.push({
        x: canvas.width + 50,
        y,
        size: 18,
        sparkle: 0,
        collected: false,
      });
    };

    const update = (dt: number) => {
      const game = gameRef.current;

      // Death pause
      if (game.deathPauseTimer > 0) {
        game.deathPauseTimer -= dt;
        if (game.deathPauseTimer <= 0) {
          if (game.distance > game.highScore) {
            game.highScore = Math.floor(game.distance);
            localStorage.setItem('sproutrun-high', game.highScore.toString());
          }
          handleGameOver();
        }
        return;
      }

      if (!game.running) return;

      // Slow motion
      if (game.slowMoTimer > 0) {
        game.slowMoTimer -= dt;
        game.slowMo = 0.3;
        if (game.slowMoTimer <= 0) {
          game.slowMo = 1;
          game.deathPauseTimer = 0.4;
        }
      }

      const adt = dt * game.slowMo;

      // Speed: 100% → 150% @1000m → 180% @2000m → 200% @3000m
      const sizeSpeedMod = 1 - (game.player.size - 1) * 0.08;
      let distanceSpeedMod: number;
      if (game.distance < 1000) {
        distanceSpeedMod = 1 + (game.distance / 1000) * 0.5;
      } else if (game.distance < 2000) {
        distanceSpeedMod = 1.5 + ((game.distance - 1000) / 1000) * 0.3;
      } else {
        distanceSpeedMod = 1.8 + Math.min((game.distance - 2000) / 1000, 1) * 0.2;
      }
      const speed = BASE_SPEED * sizeSpeedMod * distanceSpeedMod;

      // Distance
      game.distance += speed * adt / 10;
      game.scrollOffset += speed * adt;

      // Player physics - tap-to-boost with constant gravity
      const playerRadius = game.player.baseSize * (1 + (game.player.size - 1) * 0.3) / 2;

      // Gravity always pulls down
      game.player.vy += GRAVITY * adt;

      // Cap velocity (reasonable limits both directions)
      game.player.vy = Math.max(-900, Math.min(800, game.player.vy));
      game.player.y += game.player.vy * adt;

      // Ground collision
      if (game.player.y + playerRadius >= game.groundY) {
        game.player.y = game.groundY - playerRadius;
        if (game.player.vy > 100) {
          game.player.squash = 1.3;
          game.player.stretch = 0.7;
        }
        game.player.vy = 0;
        game.player.grounded = true;
      } else {
        game.player.grounded = false;
      }

      // Ceiling
      if (game.player.y - playerRadius < 80) {
        game.player.y = 80 + playerRadius;
        game.player.vy = Math.max(0, game.player.vy);
      }

      // Squash/stretch recovery
      game.player.squash += (1 - game.player.squash) * 8 * adt;
      game.player.stretch += (1 - game.player.stretch) * 8 * adt;

      // Wiggle
      if (game.player.grounded) {
        game.player.wiggle += speed * adt * 0.02;
      }

      // Spawn obstacles: 1.5s → 1.0s @1000m → 0.65s @2000m → 0.45s @3000m
      game.spawnTimer += adt;
      let spawnRate: number;
      if (game.distance < 1000) {
        spawnRate = 1.5 - (game.distance / 1000) * 0.5;
      } else if (game.distance < 2000) {
        spawnRate = 1.0 - ((game.distance - 1000) / 1000) * 0.35;
      } else {
        spawnRate = Math.max(0.45, 0.65 - ((game.distance - 2000) / 1000) * 0.2);
      }
      if (game.spawnTimer > spawnRate) {
        game.spawnTimer = 0;
        spawnObstacle();
      }

      // Spawn sundrops
      game.sundropTimer += adt;
      if (game.sundropTimer > 0.6) {
        game.sundropTimer = 0;
        if (Math.random() < 0.6) spawnSundrop();
      }

      // Update obstacles
      for (let i = game.obstacles.length - 1; i >= 0; i--) {
        const obs = game.obstacles[i];
        obs.x -= speed * adt;
        obs.wiggle += adt * 5;

        if (obs.x < -50) {
          game.obstacles.splice(i, 1);
          continue;
        }

        // Collision
        const obsRadius = obs.size / 2;
        const dx = game.player.x - obs.x;
        const dy = game.player.y - obs.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const minDist = playerRadius + obsRadius - 5;

        if (dist < minDist) {
          if (obs.smashable && game.player.size >= SMASH_SIZE) {
            // SMASH! But it costs you a size level
            playSmash();
            emitDebris(obs.x, obs.y);
            game.screenShake.duration = 0.08;
            game.screenShake.x = 4;
            game.screenShake.y = 4;
            game.obstacles.splice(i, 1);
            game.distance += 10;
            // Smashing costs 1 size
            game.player.size--;
            game.player.sundrops = 0; // Reset progress toward next level
            game.player.squash = 0.8;
            game.player.stretch = 1.2;
          } else if (obs.type === 'thorn') {
            // Thorns shrink you (even if small)
            playHurt();
            game.player.size--;
            game.player.sundrops = 0;
            game.player.squash = 0.6;
            game.player.stretch = 1.4;
            game.screenFlash.color = 'rgba(239, 68, 68, 0.3)';
            game.screenFlash.duration = 0.1;
            game.obstacles.splice(i, 1);

            if (game.player.size < 1) {
              playDeath();
              emitLeaves(game.player.x, game.player.y);
              game.slowMoTimer = 0.3;
            }
          } else {
            // Too small to smash = death
            playDeath();
            emitLeaves(game.player.x, game.player.y);
            game.slowMoTimer = 0.3;
          }
        }
      }

      // Update sundrops
      for (let i = game.sundrops.length - 1; i >= 0; i--) {
        const drop = game.sundrops[i];
        drop.x -= speed * adt;
        drop.sparkle += adt * 10;

        if (drop.x < -50) {
          game.sundrops.splice(i, 1);
          continue;
        }

        // Collection
        const dx = game.player.x - drop.x;
        const dy = game.player.y - drop.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < playerRadius + drop.size && !drop.collected) {
          drop.collected = true;
          playCollect();
          emitParticles(drop.x, drop.y, THEME.sunshine, 6, 150);
          game.screenFlash.color = 'rgba(251, 191, 36, 0.2)';
          game.screenFlash.duration = 0.05;

          game.player.sundrops++;
          // Check if we've collected enough for next size (scaling requirement)
          const nextSize = game.player.size + 1;
          const neededForNext = nextSize <= MAX_SIZE ? SUNDROPS_PER_LEVEL[nextSize] : Infinity;
          if (game.player.sundrops >= neededForNext && game.player.size < MAX_SIZE) {
            game.player.sundrops = 0;
            game.player.size++;
            game.levelUpPulse = 0.2;
            playLevelUp();
            game.screenFlash.color = 'rgba(251, 191, 36, 0.4)';
            game.screenFlash.duration = 0.2;
            emitParticles(game.player.x, game.player.y, THEME.sunshine, 12, 200);
            // Fun pop text!
            const word = LEVEL_UP_WORDS[Math.floor(Math.random() * LEVEL_UP_WORDS.length)];
            game.popTexts.push({
              x: game.player.x,
              y: game.player.y - 40,
              text: word,
              color: THEME.sunshine,
              life: 1,
              scale: 0.5,
              vy: -80,
            });
          }

          game.sundrops.splice(i, 1);
        }
      }

      // Update particles
      for (let i = game.particles.length - 1; i >= 0; i--) {
        const p = game.particles[i];
        p.x += p.vx * adt;
        p.y += p.vy * adt;
        if (p.gravity) {
          p.vy += 600 * adt;
        }
        p.life -= p.decay * adt;
        if (p.life <= 0) {
          game.particles.splice(i, 1);
        }
      }

      // Update time for animations
      game.time += adt;

      // Update clouds
      for (const cloud of game.farClouds) {
        cloud.x -= cloud.speed * adt * 0.1;
        if (cloud.x < -cloud.size * 1.5) {
          cloud.x = canvas.width + cloud.size;
          cloud.y = 60 + Math.random() * 80;
        }
      }

      for (const cloud of game.clouds) {
        cloud.x -= cloud.speed * adt * 0.2;
        if (cloud.x < -cloud.size * 1.5) {
          cloud.x = canvas.width + cloud.size;
          cloud.y = 80 + Math.random() * 100;
        }
      }

      // Update ground decorations (scroll with parallax)
      for (const decor of game.groundDecor) {
        decor.x -= speed * adt;
        decor.sway += adt * 3;
        if (decor.x < -50) {
          decor.x = canvas.width + 50 + Math.random() * 100;
        }
      }

      // Update ambient particles
      for (const ap of game.ambientParticles) {
        ap.x -= ap.speed * adt;
        ap.drift += adt * 0.8;
        ap.float += adt * 1.2;
        if (ap.x < -20) {
          ap.x = canvas.width + 20;
          ap.y = 100 + Math.random() * (game.groundY - 200);
        }
      }

      // Update birds
      for (const bird of game.birds) {
        bird.x -= bird.speed * adt;
        bird.wingPhase += adt * 12;
        if (bird.x < -30) {
          bird.x = canvas.width + 30 + Math.random() * 100;
          bird.y = 80 + Math.random() * 150;
          bird.speed = 40 + Math.random() * 60;
        }
      }

      // Update pop texts
      for (let i = game.popTexts.length - 1; i >= 0; i--) {
        const pt = game.popTexts[i];
        pt.y += pt.vy * adt;
        pt.vy -= 200 * adt; // slow down rise
        pt.life -= adt * 1.5;
        pt.scale = Math.min(1.2, pt.scale + adt * 3);
        if (pt.life <= 0) {
          game.popTexts.splice(i, 1);
        }
      }

      // Update display state for React UI
      setDisplayDistance(Math.floor(game.distance));
      setDisplayHighScore(game.highScore);

      // Screen effects
      if (game.screenShake.duration > 0) game.screenShake.duration -= adt;
      if (game.screenFlash.duration > 0) game.screenFlash.duration -= adt;
      if (game.levelUpPulse > 0) game.levelUpPulse -= adt;
    };

    const drawCloud = (x: number, y: number, size: number) => {
      ctx.beginPath();
      ctx.arc(x, y, size * 0.5, 0, Math.PI * 2);
      ctx.arc(x + size * 0.4, y - size * 0.1, size * 0.4, 0, Math.PI * 2);
      ctx.arc(x + size * 0.7, y + size * 0.1, size * 0.35, 0, Math.PI * 2);
      ctx.arc(x - size * 0.3, y + size * 0.1, size * 0.35, 0, Math.PI * 2);
      ctx.fill();
    };

    const drawPlayer = () => {
      const game = gameRef.current;
      const radius = game.player.baseSize * (1 + (game.player.size - 1) * 0.3) / 2;
      const x = game.player.x;
      const y = game.player.y;

      ctx.save();
      ctx.translate(x, y);

      const wiggleAngle = Math.sin(game.player.wiggle) * 0.1;
      ctx.rotate(wiggleAngle);
      ctx.scale(game.player.stretch, game.player.squash);

      // Drop shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
      ctx.beginPath();
      ctx.ellipse(3, radius + 2, radius * 0.9, radius * 0.3, 0, 0, Math.PI * 2);
      ctx.fill();

      // Body
      ctx.fillStyle = THEME.mint;
      ctx.strokeStyle = THEME.border;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Face
      const eyeOffset = radius * 0.25;
      const eyeSize = radius * 0.15;

      ctx.fillStyle = THEME.border;
      ctx.beginPath();
      ctx.arc(-eyeOffset, -eyeSize, eyeSize, 0, Math.PI * 2);
      ctx.arc(eyeOffset, -eyeSize, eyeSize, 0, Math.PI * 2);
      ctx.fill();

      // Blush
      ctx.fillStyle = 'rgba(244, 114, 182, 0.4)';
      ctx.beginPath();
      ctx.ellipse(-radius * 0.5, eyeSize * 2, radius * 0.2, radius * 0.12, 0, 0, Math.PI * 2);
      ctx.ellipse(radius * 0.5, eyeSize * 2, radius * 0.2, radius * 0.12, 0, 0, Math.PI * 2);
      ctx.fill();

      // Smile
      ctx.strokeStyle = THEME.border;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, eyeSize * 0.5, radius * 0.3, 0.2, Math.PI - 0.2);
      ctx.stroke();

      // Sprout
      ctx.strokeStyle = THEME.grass;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, -radius);
      ctx.quadraticCurveTo(radius * 0.3, -radius - 8, radius * 0.1, -radius - 12 - game.player.size * 2);
      ctx.stroke();

      // Leaf
      ctx.fillStyle = THEME.grass;
      ctx.beginPath();
      ctx.ellipse(radius * 0.1, -radius - 12 - game.player.size * 2, 4 + game.player.size, 2 + game.player.size * 0.5, -0.3, 0, Math.PI * 2);
      ctx.fill();

      // Size indicator
      if (game.player.size >= SMASH_SIZE) {
        ctx.strokeStyle = THEME.sunshine;
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.5 + Math.sin(Date.now() * 0.005) * 0.3;
        ctx.beginPath();
        ctx.arc(0, 0, radius + 5, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      ctx.restore();
    };

    const drawSundrop = (drop: Sundrop) => {
      const { x, y, size, sparkle } = drop;
      const sparkleScale = 1 + Math.sin(sparkle) * 0.1;

      ctx.save();
      ctx.translate(x, y);
      ctx.scale(sparkleScale, sparkleScale);

      // Shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
      ctx.beginPath();
      ctx.ellipse(2, size * 0.6, size * 0.6, size * 0.2, 0, 0, Math.PI * 2);
      ctx.fill();

      // Glow
      ctx.shadowBlur = 15;
      ctx.shadowColor = THEME.sunshine;
      ctx.fillStyle = THEME.sunshine;
      ctx.strokeStyle = THEME.border;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, size / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.stroke();

      // Shine
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.beginPath();
      ctx.arc(-size * 0.15, -size * 0.15, size * 0.15, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    };

    const drawObstacle = (obs: Obstacle) => {
      const { x, y, type, size, wiggle } = obs;
      const wiggleOffset = Math.sin(wiggle) * 2;

      ctx.save();
      ctx.translate(x, y + wiggleOffset);

      // Shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
      ctx.beginPath();
      ctx.ellipse(3, size / 2 + 2, size / 2.5, size / 6, 0, 0, Math.PI * 2);
      ctx.fill();

      if (type === 'mushroom') {
        // Stem
        ctx.fillStyle = '#fef3c7';
        ctx.strokeStyle = THEME.border;
        ctx.lineWidth = 2;
        ctx.fillRect(-size * 0.15, 0, size * 0.3, size * 0.4);
        ctx.strokeRect(-size * 0.15, 0, size * 0.3, size * 0.4);

        // Cap
        ctx.fillStyle = THEME.bubblegum;
        ctx.beginPath();
        ctx.ellipse(0, -size * 0.1, size / 2, size / 3, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Spots
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(-size * 0.15, -size * 0.15, 4, 0, Math.PI * 2);
        ctx.arc(size * 0.1, -size * 0.05, 3, 0, Math.PI * 2);
        ctx.fill();

        // Face
        ctx.fillStyle = THEME.border;
        ctx.beginPath();
        ctx.arc(-5, 5, 2, 0, Math.PI * 2);
        ctx.arc(5, 5, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(0, 10, 4, 0, Math.PI);
        ctx.stroke();
      } else if (type === 'rock') {
        ctx.fillStyle = '#94a3b8';
        ctx.strokeStyle = THEME.border;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-size / 2, size * 0.1);
        ctx.lineTo(-size * 0.3, -size / 2.5);
        ctx.lineTo(size * 0.2, -size / 2.5);
        ctx.lineTo(size / 2, size * 0.1);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = THEME.border;
        ctx.beginPath();
        ctx.arc(-6, -3, 2, 0, Math.PI * 2);
        ctx.arc(6, -3, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(0, 5, 5, 0.2, Math.PI - 0.2);
        ctx.stroke();
      } else if (type === 'acorn') {
        ctx.fillStyle = '#92400e';
        ctx.strokeStyle = THEME.border;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(0, -size * 0.2, size / 2.2, size / 4, 0, 0, Math.PI, true);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#d97706';
        ctx.beginPath();
        ctx.ellipse(0, size * 0.1, size / 2.5, size / 2.2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = THEME.border;
        ctx.beginPath();
        ctx.arc(-4, 3, 2, 0, Math.PI * 2);
        ctx.arc(4, 3, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(0, 10, 4, 0.3, Math.PI - 0.3);
        ctx.stroke();
      } else if (type === 'thorn') {
        ctx.fillStyle = '#7f1d1d';
        ctx.strokeStyle = THEME.border;
        ctx.lineWidth = 2;

        ctx.beginPath();
        ctx.moveTo(-size / 2, size / 3);
        ctx.lineTo(0, -size / 2);
        ctx.lineTo(size / 2, size / 3);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(-size / 3, 0);
        ctx.lineTo(-size / 2 - 5, -size / 4);
        ctx.lineTo(-size / 4, -size / 5);
        ctx.fill();
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(size / 3, 0);
        ctx.lineTo(size / 2 + 5, -size / 4);
        ctx.lineTo(size / 4, -size / 5);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = THEME.sunshine;
        ctx.beginPath();
        ctx.arc(-5, -5, 3, 0, Math.PI * 2);
        ctx.arc(5, -5, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = THEME.border;
        ctx.beginPath();
        ctx.arc(-5, -5, 1.5, 0, Math.PI * 2);
        ctx.arc(5, -5, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    };

    // Draw helper: bird
    const drawBird = (bird: Bird) => {
      const wingAngle = Math.sin(bird.wingPhase) * 0.5;
      ctx.save();
      ctx.translate(bird.x, bird.y);
      ctx.fillStyle = '#374151'; // dark gray
      if (bird.type === 'v') {
        // Simple V-shape bird
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(-bird.size, -bird.size * wingAngle);
        ctx.lineTo(-bird.size * 0.7, 0);
        ctx.lineTo(0, bird.size * 0.3);
        ctx.lineTo(bird.size * 0.7, 0);
        ctx.lineTo(bird.size, -bird.size * wingAngle);
        ctx.closePath();
        ctx.fill();
      } else {
        // Flapping bird with body
        ctx.beginPath();
        ctx.ellipse(0, 0, bird.size * 0.4, bird.size * 0.25, 0, 0, Math.PI * 2);
        ctx.fill();
        // Wings
        ctx.beginPath();
        ctx.moveTo(-bird.size * 0.2, 0);
        ctx.quadraticCurveTo(-bird.size * 0.6, -bird.size * wingAngle * 1.5, -bird.size, -bird.size * wingAngle);
        ctx.lineTo(-bird.size * 0.3, bird.size * 0.1);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(bird.size * 0.2, 0);
        ctx.quadraticCurveTo(bird.size * 0.6, -bird.size * wingAngle * 1.5, bird.size, -bird.size * wingAngle);
        ctx.lineTo(bird.size * 0.3, bird.size * 0.1);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    };

    // Draw helper: pop text
    const drawPopText = (pt: PopText) => {
      ctx.save();
      ctx.translate(pt.x, pt.y);
      ctx.scale(pt.scale, pt.scale);
      ctx.globalAlpha = pt.life;
      ctx.font = 'bold 32px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      // Outline
      ctx.strokeStyle = THEME.border;
      ctx.lineWidth = 4;
      ctx.strokeText(pt.text, 0, 0);
      // Fill
      ctx.fillStyle = pt.color;
      ctx.fillText(pt.text, 0, 0);
      ctx.globalAlpha = 1;
      ctx.restore();
    };

    // Draw helper: rolling hill shape
    const drawHills = (hills: HillPoint[], color: string, bottomY: number) => {
      if (hills.length < 2) return;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(hills[0].x, hills[0].y);
      for (let i = 1; i < hills.length; i++) {
        const prev = hills[i - 1];
        const curr = hills[i];
        const cpX = (prev.x + curr.x) / 2;
        ctx.quadraticCurveTo(prev.x, prev.y, cpX, (prev.y + curr.y) / 2);
      }
      ctx.lineTo(hills[hills.length - 1].x, bottomY + 50);
      ctx.lineTo(hills[0].x, bottomY + 50);
      ctx.closePath();
      ctx.fill();
    };

    // Draw helper: grass tuft
    const drawGrassTuft = (x: number, y: number, size: number, sway: number) => {
      const swayOffset = Math.sin(sway) * 3;
      ctx.strokeStyle = THEME.grass;
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      // Multiple blades
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.moveTo(x + i * 3, y);
        ctx.quadraticCurveTo(
          x + i * 3 + swayOffset,
          y - size * 0.6,
          x + i * 2 + swayOffset * 1.5,
          y - size
        );
        ctx.stroke();
      }
    };

    // Draw helper: flower
    const drawFlower = (x: number, y: number, size: number, color: string, sway: number) => {
      const swayOffset = Math.sin(sway) * 2;
      // Stem
      ctx.strokeStyle = THEME.grassDark;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + swayOffset, y - size * 0.6, x + swayOffset * 1.2, y - size);
      ctx.stroke();
      // Petals
      ctx.fillStyle = color;
      const petalX = x + swayOffset * 1.2;
      const petalY = y - size;
      for (let i = 0; i < 5; i++) {
        const angle = (i / 5) * Math.PI * 2;
        ctx.beginPath();
        ctx.ellipse(
          petalX + Math.cos(angle) * 3,
          petalY + Math.sin(angle) * 3,
          3, 2, angle, 0, Math.PI * 2
        );
        ctx.fill();
      }
      // Center
      ctx.fillStyle = THEME.sunshine;
      ctx.beginPath();
      ctx.arc(petalX, petalY, 2, 0, Math.PI * 2);
      ctx.fill();
    };

    const draw = () => {
      const game = gameRef.current;
      const w = canvas.width;
      const h = canvas.height;

      // Screen shake
      let shakeX = 0, shakeY = 0;
      if (game.screenShake.duration > 0) {
        shakeX = (Math.random() - 0.5) * game.screenShake.x * 2;
        shakeY = (Math.random() - 0.5) * game.screenShake.y * 2;
      }

      ctx.save();
      ctx.translate(shakeX, shakeY);

      // Level up pulse
      if (game.levelUpPulse > 0) {
        const scale = 1 + game.levelUpPulse * 0.25;
        ctx.translate(w / 2, h / 2);
        ctx.scale(scale, scale);
        ctx.translate(-w / 2, -h / 2);
      }

      // === SKY GRADIENT (warm top to cool bottom) ===
      const skyGradient = ctx.createLinearGradient(0, 0, 0, game.groundY);
      skyGradient.addColorStop(0, THEME.skyTop);
      skyGradient.addColorStop(0.4, THEME.skyMid);
      skyGradient.addColorStop(1, THEME.skyBottom);
      ctx.fillStyle = skyGradient;
      ctx.fillRect(-10, -10, w + 20, game.groundY + 10);

      // === SUN (upper right with glow) ===
      const sunX = w * 0.8;
      const sunY = 100;
      const sunRadius = 50;
      // Outer glow
      const sunGlow = ctx.createRadialGradient(sunX, sunY, sunRadius * 0.5, sunX, sunY, sunRadius * 3);
      sunGlow.addColorStop(0, 'rgba(254, 240, 138, 0.4)');
      sunGlow.addColorStop(0.5, 'rgba(254, 240, 138, 0.1)');
      sunGlow.addColorStop(1, 'rgba(254, 240, 138, 0)');
      ctx.fillStyle = sunGlow;
      ctx.fillRect(sunX - sunRadius * 3, sunY - sunRadius * 3, sunRadius * 6, sunRadius * 6);
      // Sun body
      ctx.fillStyle = THEME.sunGlow;
      ctx.beginPath();
      ctx.arc(sunX, sunY, sunRadius, 0, Math.PI * 2);
      ctx.fill();
      // Sun center
      ctx.fillStyle = '#fff';
      ctx.globalAlpha = 0.6;
      ctx.beginPath();
      ctx.arc(sunX - 10, sunY - 10, sunRadius * 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;

      // === BIRDS (in distant sky) ===
      for (const bird of game.birds) {
        drawBird(bird);
      }

      // === FAR CLOUDS ===
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      for (const cloud of game.farClouds) {
        drawCloud(cloud.x, cloud.y, cloud.size);
      }

      // === PARALLAX HILLS (far to near) ===
      drawHills(game.hillsFar, THEME.hillFar, game.groundY);
      drawHills(game.hillsMid, THEME.hillMid, game.groundY);

      // === NEAR CLOUDS (between mid and near hills) ===
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      for (const cloud of game.clouds) {
        drawCloud(cloud.x, cloud.y, cloud.size);
      }

      drawHills(game.hillsNear, THEME.hillNear, game.groundY);

      // === AMBIENT PARTICLES (floating seeds/pollen) ===
      for (const ap of game.ambientParticles) {
        const driftX = Math.sin(ap.drift) * 8;
        const floatY = Math.sin(ap.float) * 5;
        ctx.globalAlpha = ap.alpha;
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(ap.x + driftX, ap.y + floatY, ap.size, 0, Math.PI * 2);
        ctx.fill();
        // Tiny seed trail
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.beginPath();
        ctx.arc(ap.x + driftX - 4, ap.y + floatY + 2, ap.size * 0.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      // === GROUND BASE ===
      const groundGradient = ctx.createLinearGradient(0, game.groundY, 0, h);
      groundGradient.addColorStop(0, THEME.ground);
      groundGradient.addColorStop(0.3, THEME.groundMid);
      groundGradient.addColorStop(1, '#78350f');
      ctx.fillStyle = groundGradient;
      ctx.fillRect(-10, game.groundY, w + 20, h - game.groundY + 10);

      // === ORGANIC GRASS LINE ===
      ctx.fillStyle = THEME.grass;
      ctx.beginPath();
      ctx.moveTo(-10, game.groundY + 4);
      const grassSegments = Math.ceil(w / 8) + 3;
      for (let i = 0; i <= grassSegments; i++) {
        const gx = -10 + i * 8;
        const gy = game.groundY + Math.sin(i * 0.8 + game.time * 2) * 2;
        if (i === 0) {
          ctx.lineTo(gx, gy);
        } else {
          ctx.lineTo(gx, gy);
        }
      }
      ctx.lineTo(w + 10, game.groundY + 10);
      ctx.lineTo(-10, game.groundY + 10);
      ctx.closePath();
      ctx.fill();

      // Grass highlight
      ctx.fillStyle = THEME.grassLight;
      ctx.globalAlpha = 0.4;
      ctx.beginPath();
      ctx.moveTo(-10, game.groundY + 2);
      for (let i = 0; i <= grassSegments; i++) {
        const gx = -10 + i * 8;
        const gy = game.groundY + Math.sin(i * 0.8 + game.time * 2) * 2 - 2;
        ctx.lineTo(gx, gy);
      }
      ctx.lineTo(w + 10, game.groundY + 4);
      ctx.lineTo(-10, game.groundY + 4);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;

      // === GROUND DECORATIONS ===
      for (const decor of game.groundDecor) {
        if (decor.x < -30 || decor.x > w + 30) continue;
        if (decor.type === 'tuft') {
          drawGrassTuft(decor.x, game.groundY, decor.size, decor.sway);
        } else if (decor.type === 'flower') {
          drawFlower(decor.x, game.groundY, decor.size, decor.color, decor.sway);
        } else if (decor.type === 'pebble') {
          ctx.fillStyle = THEME.groundLight;
          ctx.beginPath();
          ctx.ellipse(decor.x, game.groundY + 3, decor.size, decor.size * 0.5, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // === SUNDROPS ===
      for (const drop of game.sundrops) {
        drawSundrop(drop);
      }

      // === OBSTACLES ===
      for (const obs of game.obstacles) {
        drawObstacle(obs);
      }

      // === PLAYER ===
      if (game.slowMoTimer <= 0 || game.running) {
        drawPlayer();
      }

      // === PARTICLES (gameplay effects) ===
      for (const p of game.particles) {
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        if (p.leaf) {
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.vx * 0.01);
          ctx.beginPath();
          ctx.ellipse(0, 0, p.size, p.size / 2, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        } else {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }

      // === POP TEXTS (level up messages) ===
      for (const pt of game.popTexts) {
        drawPopText(pt);
      }

      // Screen flash
      if (game.screenFlash.duration > 0 && game.screenFlash.color) {
        ctx.fillStyle = game.screenFlash.color;
        ctx.fillRect(-10, -10, w + 20, h + 20);
      }

      ctx.restore();
    };

    const gameLoop = (timestamp: number) => {
      const dt = Math.min((timestamp - lastTime) / 1000, 0.1);
      lastTime = timestamp;

      update(dt);
      draw();

      animationId = requestAnimationFrame(gameLoop);
    };

    animationId = requestAnimationFrame(gameLoop);

    // Input handlers - tap to boost with cooldown
    const handleTap = () => {
      initAudio();

      // Start game on first tap
      if (gameState === 'start') {
        startGame();
        return;
      }

      // Apply boost if game is running and cooldown has passed
      const game = gameRef.current;
      const now = performance.now() / 1000;

      if (game.running && (now - game.lastBoostTime) >= BOOST_COOLDOWN) {
        game.lastBoostTime = now;

        // Add upward impulse
        game.player.vy += BOOST_VELOCITY;
        game.player.grounded = false;

        // Visual feedback
        game.player.squash = 0.7;
        game.player.stretch = 1.3;

        // Jump particles
        const playerRadius = game.player.baseSize * (1 + (game.player.size - 1) * 0.3) / 2;
        emitJumpParticles(game.player.x, game.player.y + playerRadius);

        // Play jump sound
        playTone(400, 0.15, 'sine', 0.2, 0.01);
        playTone(600, 0.1, 'sine', 0.1, 0.02);
      }
    };

    const handleTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      handleTap();
    };
    const handleMouseDown = (e: MouseEvent) => {
      e.preventDefault();
      handleTap();
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault();
        if (!e.repeat) handleTap();
      }
    };

    canvas.addEventListener('touchstart', handleTouchStart);
    canvas.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('keydown', handleKeyDown);
      // Music is managed by separate useEffect
    };
  }, [gameState]);

  return (
    <>
      <Script
        src="/pixelpit/social.js"
        onLoad={() => setSocialLoaded(true)}
      />

      <style jsx global>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          background: ${THEME.bg};
          overflow: hidden;
          touch-action: none;
          user-select: none;
        }
        button {
          transition: all 0.15s ease-out;
        }
        button:hover {
          transform: translateY(-2px);
          filter: brightness(1.1);
        }
        button:active {
          transform: translateY(1px);
        }
        .btn-primary {
          animation: btnGlow 3s ease-in-out infinite;
        }
        @keyframes btnGlow {
          0%, 100% { box-shadow: 0 8px 30px rgba(250,204,21,0.3); }
          50% { box-shadow: 0 8px 40px rgba(250,204,21,0.5); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.05); }
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
          color: '#fff',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          fontSize: 14,
          cursor: 'pointer',
          opacity: soundEnabled ? 0.8 : 0.4,
        }}
      >
        {soundEnabled ? '♪' : '♪̶'}
      </button>

      {/* In-Game UI */}
      {gameState === 'playing' && (
        <div style={{
          position: 'fixed',
          top: 20,
          left: 20,
          zIndex: 10,
          pointerEvents: 'none',
        }}>
          <div style={{
            fontFamily: 'system-ui, -apple-system, sans-serif',
            fontWeight: 'bold',
            fontSize: 24,
            color: THEME.text,
          }}>
            {displayDistance}m
          </div>
          <div style={{
            fontFamily: 'system-ui, -apple-system, sans-serif',
            fontSize: 16,
            color: 'rgba(30, 41, 59, 0.6)',
          }}>
            Best: {displayHighScore}m
          </div>
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
          background: 'linear-gradient(180deg, rgba(254,243,199,0.9) 0%, rgba(167,243,208,0.85) 100%)',
          zIndex: 100,
          textAlign: 'center',
          padding: 20,
        }}>
          {/* Main card */}
          <div style={{
            background: 'rgba(255,255,255,0.95)',
            borderRadius: 24,
            padding: '40px 50px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.15), 0 8px 20px rgba(0,0,0,0.1)',
            maxWidth: 340,
          }}>
            {/* Sprout character preview */}
            <div style={{
              width: 80,
              height: 80,
              margin: '0 auto 20px',
              background: THEME.mint,
              borderRadius: '50%',
              border: `3px solid ${THEME.border}`,
              position: 'relative',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            }}>
              {/* Eyes */}
              <div style={{
                position: 'absolute',
                top: '30%',
                left: '30%',
                width: 8,
                height: 8,
                background: THEME.border,
                borderRadius: '50%',
              }} />
              <div style={{
                position: 'absolute',
                top: '30%',
                right: '30%',
                width: 8,
                height: 8,
                background: THEME.border,
                borderRadius: '50%',
              }} />
              {/* Blush */}
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '15%',
                width: 12,
                height: 6,
                background: 'rgba(244,114,182,0.4)',
                borderRadius: '50%',
              }} />
              <div style={{
                position: 'absolute',
                top: '50%',
                right: '15%',
                width: 12,
                height: 6,
                background: 'rgba(244,114,182,0.4)',
                borderRadius: '50%',
              }} />
              {/* Sprout */}
              <div style={{
                position: 'absolute',
                top: -12,
                left: '50%',
                transform: 'translateX(-50%)',
                width: 3,
                height: 15,
                background: THEME.grass,
                borderRadius: 2,
              }} />
              <div style={{
                position: 'absolute',
                top: -18,
                left: '50%',
                transform: 'translateX(-50%) rotate(-15deg)',
                width: 14,
                height: 8,
                background: THEME.grass,
                borderRadius: '50%',
              }} />
            </div>

            <h1 style={{
              fontFamily: 'system-ui, -apple-system, sans-serif',
              fontSize: 36,
              fontWeight: 800,
              color: THEME.text,
              marginBottom: 8,
              letterSpacing: -1,
            }}>
              Sprout Run
            </h1>
            <p style={{
              fontSize: 15,
              fontFamily: 'system-ui, -apple-system, sans-serif',
              color: THEME.muted,
              marginBottom: 28,
            }}>
              Tap to boost · Collect sundrops · Grow big!
            </p>
            <button
              onClick={startGame}
              style={{
                background: `linear-gradient(135deg, ${THEME.sunshine} 0%, #f59e0b 100%)`,
                color: THEME.text,
                border: 'none',
                padding: '18px 60px',
                fontSize: 18,
                fontFamily: 'system-ui, -apple-system, sans-serif',
                fontWeight: 700,
                cursor: 'pointer',
                borderRadius: 16,
                boxShadow: '0 4px 20px rgba(251,191,36,0.4)',
                transition: 'transform 0.1s, box-shadow 0.1s',
              }}
            >
              Play
            </button>
          </div>

          {/* Pixelpit branding */}
          <div style={{
            marginTop: 24,
            fontSize: 13,
            fontFamily: 'system-ui, -apple-system, sans-serif',
            opacity: 0.8,
          }}>
            <span style={{ color: THEME.sunshine, fontWeight: 700 }}>pixel</span>
            <span style={{ color: THEME.grass, fontWeight: 700 }}>pit</span>
            <span style={{ color: THEME.text, opacity: 0.5 }}> arcade</span>
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
          background: 'linear-gradient(180deg, rgba(254,243,199,0.95) 0%, rgba(167,243,208,0.9) 100%)',
          zIndex: 100,
          textAlign: 'center',
          padding: 20,
          overflowY: 'auto',
        }}>
          {/* Sad sprout icon */}
          <div style={{
            width: 50,
            height: 50,
            marginBottom: 12,
            background: `linear-gradient(135deg, ${THEME.grass} 0%, #16a34a 100%)`,
            borderRadius: '50%',
            border: '3px solid #15803d',
            position: 'relative',
            boxShadow: '0 4px 12px rgba(34,197,94,0.3)',
          }}>
            {/* Wilted leaf */}
            <div style={{
              position: 'absolute',
              top: -6,
              left: '50%',
              transform: 'translateX(-50%) rotate(45deg)',
              width: 12,
              height: 8,
              background: '#86efac',
              borderRadius: '50% 50% 50% 0',
              border: '2px solid #22c55e',
              opacity: 0.8,
            }} />
            {/* X eyes */}
            <div style={{
              position: 'absolute',
              top: '35%',
              left: '22%',
              fontSize: 10,
              fontWeight: 900,
              color: '#15803d',
            }}>✕</div>
            <div style={{
              position: 'absolute',
              top: '35%',
              right: '22%',
              fontSize: 10,
              fontWeight: 900,
              color: '#15803d',
            }}>✕</div>
            {/* Sad mouth */}
            <div style={{
              position: 'absolute',
              bottom: '22%',
              left: '50%',
              transform: 'translateX(-50%)',
              width: 12,
              height: 6,
              borderTop: '2px solid #15803d',
              borderRadius: '0 0 50% 50%',
            }} />
          </div>

          <h1 style={{
            fontFamily: 'system-ui, -apple-system, sans-serif',
            fontSize: 20,
            fontWeight: 600,
            color: THEME.muted,
            marginBottom: 8,
            textTransform: 'uppercase',
            letterSpacing: 3,
          }}>
            Game Over
          </h1>

          {/* Score display */}
          <div style={{
            background: 'rgba(255,255,255,0.9)',
            borderRadius: 20,
            padding: '20px 40px',
            marginBottom: 20,
            boxShadow: '0 8px 30px rgba(0,0,0,0.1)',
          }}>
            <div style={{
              fontFamily: 'system-ui, -apple-system, sans-serif',
              fontSize: 56,
              fontWeight: 800,
              color: THEME.text,
              lineHeight: 1,
            }}>
              {score}
              <span style={{ fontSize: 24, fontWeight: 600, marginLeft: 4 }}>m</span>
            </div>
          </div>

          {/* Score Submission */}
          <ScoreFlow
            score={score}
            gameId={GAME_ID}
            colors={SCORE_FLOW_COLORS}
            xpDivisor={10}
            onRankReceived={(rank, entryId) => {
              setSubmittedEntryId(entryId ?? null);
            }}
            onProgression={(prog) => setProgression(prog)}
          />

          {/* Progression Display */}
          {progression && (
            <ProgressionDisplay progression={progression} />
          )}

          {/* Action buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center', marginTop: 8 }}>
            <button
              onClick={startGame}
              style={{
                background: `linear-gradient(135deg, ${THEME.grass} 0%, #16a34a 100%)`,
                color: '#fff',
                border: 'none',
                borderRadius: 14,
                padding: '16px 50px',
                fontSize: 16,
                fontFamily: 'system-ui, -apple-system, sans-serif',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 4px 20px rgba(34,197,94,0.4)',
              }}
            >
              Play Again
            </button>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setGameState('leaderboard')}
                style={{
                  background: 'rgba(255,255,255,0.8)',
                  border: `1px solid ${THEME.border}20`,
                  borderRadius: 10,
                  color: THEME.text,
                  padding: '12px 24px',
                  fontSize: 13,
                  fontFamily: 'system-ui, -apple-system, sans-serif',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Leaderboard
              </button>
              <button
                onClick={() => {
                  if (user) {
                    setShowShareModal(true);
                  } else {
                    // Use native share or copy to clipboard
                    const shareUrl = `${window.location.origin}/pixelpit/arcade/sprout-run/share/${score}`;
                    const shareText = `I ran ${score}m in Sprout Run! Can you beat me?`;
                    if (navigator.share) {
                      navigator.share({ url: shareUrl, text: shareText }).catch(() => {});
                    } else {
                      navigator.clipboard.writeText(`${shareText} ${shareUrl}`);
                      if (window.PixelpitSocial?.showToast) {
                        window.PixelpitSocial.showToast('Link copied!');
                      }
                    }
                  }
                }}
                style={{
                  background: 'rgba(255,255,255,0.8)',
                  border: `1px solid ${THEME.border}20`,
                  borderRadius: 10,
                  color: THEME.text,
                  padding: '12px 24px',
                  fontSize: 13,
                  fontFamily: 'system-ui, -apple-system, sans-serif',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Share
              </button>
            </div>
          </div>

          {/* Pixelpit branding */}
          <div style={{
            marginTop: 20,
            fontSize: 12,
            fontFamily: 'system-ui, -apple-system, sans-serif',
            opacity: 0.6,
          }}>
            <span style={{ color: THEME.sunshine, fontWeight: 700 }}>pixel</span>
            <span style={{ color: THEME.grass, fontWeight: 700 }}>pit</span>
          </div>
        </div>
      )}

      {/* Leaderboard Screen */}
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
          gameUrl={`${GAME_URL}/share/${score}`}
          score={score}
          colors={LEADERBOARD_COLORS}
          onClose={() => setShowShareModal(false)}
        />
      )}
    </>
  );
}
