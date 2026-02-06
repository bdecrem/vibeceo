'use client';

import React, { useEffect, useRef, useState } from 'react';
import Script from 'next/script';
import {
  ScoreFlow,
  Leaderboard,
  ShareButtonContainer,
  usePixelpitSocial,
  type ScoreFlowColors,
  type LeaderboardColors,
  type ProgressionResult,
} from '@/app/pixelpit/components';

// EMOJI MADNESS theme - bright & playful
const THEME = {
  bgTop: '#fef3c7',
  bgBottom: '#fce7f3',
  pink: '#ec4899',
  pinkLight: '#f472b6',
  yellow: '#facc15',
  yellowLight: '#fde047',
  cyan: '#06b6d4',
  cyanLight: '#22d3ee',
  orange: '#f97316',
  purple: '#a855f7',
  red: '#ef4444',
  white: '#ffffff',
  dark: '#1e1b4b',
};

// Color mappings for components
const SCORE_FLOW_COLORS: ScoreFlowColors = {
  bg: THEME.white,
  surface: '#fef3c7',
  primary: THEME.pink,
  secondary: THEME.cyan,
  text: THEME.dark,
  muted: '#64748b',
  error: THEME.red,
};

const LEADERBOARD_COLORS: LeaderboardColors = {
  bg: THEME.white,
  surface: '#fef3c7',
  primary: THEME.pink,
  secondary: THEME.cyan,
  text: THEME.dark,
  muted: '#64748b',
};

// Emoji color rings
const EMOJI_COLORS: Record<string, string> = {
  '😀': '#facc15',
  '😃': '#3b82f6',
  '😄': '#ec4899',
  '😁': '#22c55e',
  '😎': '#a855f7',
  '🤩': '#8b5cf6',
  '🥳': '#d946ef',
  '🐱': '#f97316',
  '🐶': '#f59e0b',
  '🐰': '#fb7185',
};

const GOOD = ['😀','😃','😄','😁','😎','🤩','🥳','🐱','🐶','🐰'];
const BAD = ['💀','☠️','💣','😡','🤬','👿','😈'];
const GOLDEN = '⭐';

const GAME_ID = 'emoji';

// Animated progression display component
function ProgressionDisplay({ progression, theme }: { progression: ProgressionResult; theme: typeof THEME }) {
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
      background: theme.white,
      borderRadius: 16,
      padding: '16px 24px',
      marginBottom: 15,
      boxShadow: `0 4px 20px ${theme.purple}30`,
      textAlign: 'center',
      minWidth: 200,
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        marginBottom: 8,
      }}>
        <span style={{
          fontFamily: 'ui-rounded, system-ui, sans-serif',
          fontSize: 18,
          fontWeight: 700,
          color: theme.pink,
        }}>
          +{animatedXp} XP
        </span>
        {progression.streak > 1 && (
          <span style={{
            background: theme.purple,
            color: theme.white,
            padding: '3px 8px',
            borderRadius: 10,
            fontSize: 11,
            fontWeight: 600,
            fontFamily: 'ui-rounded, system-ui, sans-serif',
          }}>
            {progression.multiplier}x streak
          </span>
        )}
      </div>

      {/* XP Progress Bar */}
      <div style={{
        background: '#f1f5f9',
        borderRadius: 8,
        height: 10,
        overflow: 'hidden',
        marginBottom: 6,
        position: 'relative',
      }}>
        <div style={{
          background: `linear-gradient(90deg, ${theme.pink}, ${theme.purple})`,
          height: '100%',
          width: `${progressPercent}%`,
          borderRadius: 8,
          transition: 'width 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
          boxShadow: barPulse ? `0 0 12px ${theme.pink}` : 'none',
        }} />
        {barPulse && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: `linear-gradient(90deg, transparent, ${theme.white}40, transparent)`,
            animation: 'shimmer 0.6s ease-out',
          }} />
        )}
      </div>

      <div style={{
        fontFamily: 'ui-rounded, system-ui, sans-serif',
        fontSize: 12,
        color: '#64748b',
      }}>
        Level {progression.level} • {Math.floor(animatedProgress)}/{progression.levelNeeded} XP
      </div>

      {showLevelUp && (
        <div style={{
          marginTop: 10,
          padding: '8px 16px',
          background: `linear-gradient(135deg, ${theme.yellow}, ${theme.orange})`,
          borderRadius: 12,
          fontFamily: 'ui-rounded, system-ui, sans-serif',
          fontSize: 14,
          fontWeight: 700,
          color: theme.white,
          animation: 'popIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}>
          LEVEL UP!
        </div>
      )}

      {progression.streak >= 3 && (
        <div style={{
          marginTop: 8,
          fontFamily: 'ui-rounded, system-ui, sans-serif',
          fontSize: 11,
          color: theme.purple,
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

export default function EmojiMadness() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<'start' | 'playing' | 'gameover' | 'leaderboard'>('start');
  const [score, setScore] = useState(0);
  const [socialLoaded, setSocialLoaded] = useState(false);
  const [submittedEntryId, setSubmittedEntryId] = useState<number | null>(null);
  const [progression, setProgression] = useState<ProgressionResult | null>(null);

  const { user } = usePixelpitSocial(socialLoaded);

  // Game refs
  const gameRef = useRef({
    running: false,
    score: 0,
    lives: 3,
    combo: 1,
    comboCount: 0,
    timeLeft: 60,
    lastTime: 0,
    targets: [] as any[],
    particles: [] as any[],
    screenShake: 0,
    lastSpawn: 0,
    pulsePhase: 0,
    lastTempoUpdate: 60,
    lastEmoji: null as string | null,
    emojiStreak: 0,
    flowMultiplier: 1,
    flowTimeLeft: 0,
    flowEmoji: null as string | null,
    bgShapes: [] as any[],
    // Audio
    audioCtx: null as AudioContext | null,
    masterGain: null as GainNode | null,
    musicInterval: null as NodeJS.Timeout | null,
    musicStep: 0,
    arpStep: 0,
  });

  // Music config
  const MUSIC = {
    bpm: 140,
    bass: [130.8, 0, 130.8, 0, 164.8, 0, 196, 0, 174.6, 0, 174.6, 0, 146.8, 0, 164.8, 0],
    arp: [
      [523, 659, 784, 1047],
      [587, 740, 880, 1175],
      [523, 659, 784, 1047],
      [440, 554, 659, 880],
    ],
    kick: [1, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1, 0, 1, 0],
    hat: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    stab: [1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0],
  };

  // Audio functions
  const initAudio = () => {
    const game = gameRef.current;
    if (game.audioCtx) return;
    game.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    game.masterGain = game.audioCtx.createGain();
    game.masterGain.gain.value = 0.7;
    game.masterGain.connect(game.audioCtx.destination);
  };

  const playSoftSound = (freq: number, dur: number, type: OscillatorType, vol: number, cutoff: number) => {
    const game = gameRef.current;
    if (!game.audioCtx || !game.masterGain) return;
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

  const playKick = () => {
    const game = gameRef.current;
    if (!game.audioCtx || !game.masterGain) return;
    const osc = game.audioCtx.createOscillator();
    const gain = game.audioCtx.createGain();
    osc.connect(gain);
    gain.connect(game.masterGain);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, game.audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(50, game.audioCtx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.3, game.audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, game.audioCtx.currentTime + 0.15);
    osc.start();
    osc.stop(game.audioCtx.currentTime + 0.15);
  };

  const playHat = () => {
    const game = gameRef.current;
    if (!game.audioCtx || !game.masterGain) return;
    const bufferSize = game.audioCtx.sampleRate * 0.025;
    const buffer = game.audioCtx.createBuffer(1, bufferSize, game.audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const noise = game.audioCtx.createBufferSource();
    noise.buffer = buffer;
    const hpFilter = game.audioCtx.createBiquadFilter();
    hpFilter.type = 'highpass';
    hpFilter.frequency.value = 8000;
    const lpFilter = game.audioCtx.createBiquadFilter();
    lpFilter.type = 'lowpass';
    lpFilter.frequency.value = 14000;
    const gain = game.audioCtx.createGain();
    gain.gain.setValueAtTime(0.04, game.audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, game.audioCtx.currentTime + 0.03);
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
    const osc2 = game.audioCtx.createOscillator();
    const filter = game.audioCtx.createBiquadFilter();
    const gain = game.audioCtx.createGain();
    osc.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(game.masterGain);
    osc.type = 'sine';
    osc2.type = 'triangle';
    osc.frequency.value = freq;
    osc2.frequency.value = freq * 2;
    filter.type = 'lowpass';
    filter.frequency.value = 400;
    gain.gain.setValueAtTime(0.15, game.audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, game.audioCtx.currentTime + 0.12);
    osc.start();
    osc2.start();
    osc.stop(game.audioCtx.currentTime + 0.15);
    osc2.stop(game.audioCtx.currentTime + 0.15);
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
    osc.type = 'square';
    osc.frequency.value = freq;
    filter.type = 'lowpass';
    filter.frequency.value = 3000;
    filter.Q.value = 2;
    gain.gain.setValueAtTime(0.06, game.audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, game.audioCtx.currentTime + 0.1);
    osc.start();
    osc.stop(game.audioCtx.currentTime + 0.12);
  };

  const playStab = () => {
    const game = gameRef.current;
    if (!game.audioCtx || !game.masterGain) return;
    [1, 1.25, 1.5].forEach((mult) => {
      const osc = game.audioCtx!.createOscillator();
      const filter = game.audioCtx!.createBiquadFilter();
      const gain = game.audioCtx!.createGain();
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(game.masterGain!);
      osc.type = 'sawtooth';
      osc.frequency.value = 220 * mult;
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(2000, game.audioCtx!.currentTime);
      filter.frequency.exponentialRampToValueAtTime(500, game.audioCtx!.currentTime + 0.15);
      gain.gain.setValueAtTime(0.05, game.audioCtx!.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, game.audioCtx!.currentTime + 0.15);
      osc.start();
      osc.stop(game.audioCtx!.currentTime + 0.18);
    });
  };

  const musicTick = () => {
    const game = gameRef.current;
    if (!game.audioCtx || !game.running) return;
    if (MUSIC.kick[game.musicStep % 16]) playKick();
    if (MUSIC.hat[game.musicStep % 16]) playHat();
    if (MUSIC.stab[game.musicStep % 16]) playStab();
    if (game.musicStep % 2 === 0) playBass(MUSIC.bass[(game.musicStep / 2) % 16]);
    const barIndex = Math.floor(game.musicStep / 16) % 4;
    playArp(MUSIC.arp[barIndex]);
    game.arpStep++;
    game.musicStep++;
  };

  const startMusic = () => {
    const game = gameRef.current;
    if (game.musicInterval) return;
    game.musicStep = 0;
    game.arpStep = 0;
    const bpm = MUSIC.bpm + (60 - game.timeLeft) * 0.3;
    const stepTime = (60 / bpm) * 1000 / 4;
    game.musicInterval = setInterval(musicTick, stepTime);
  };

  const updateMusicTempo = () => {
    const game = gameRef.current;
    if (!game.musicInterval) return;
    clearInterval(game.musicInterval);
    const bpm = MUSIC.bpm + (60 - game.timeLeft) * 0.5;
    const stepTime = (60 / bpm) * 1000 / 4;
    game.musicInterval = setInterval(musicTick, stepTime);
  };

  const stopMusic = () => {
    const game = gameRef.current;
    if (game.musicInterval) {
      clearInterval(game.musicInterval);
      game.musicInterval = null;
    }
  };

  // SFX
  const playPop = () => {
    playSoftSound(880 + Math.random() * 200, 0.08, 'sine', 0.12, 4000);
    setTimeout(() => playSoftSound(1200, 0.06, 'sine', 0.08, 3500), 30);
  };

  const playGolden = () => {
    const notes = [784, 988, 1175, 1568, 1175, 1568];
    notes.forEach((freq, i) => {
      setTimeout(() => playSoftSound(freq, 0.15, 'sine', 0.1, 5000), i * 50);
    });
  };

  const playBad = () => {
    playSoftSound(200, 0.1, 'square', 0.15, 800);
    setTimeout(() => playSoftSound(120, 0.15, 'square', 0.12, 500), 50);
  };

  const playMiss = () => {
    const game = gameRef.current;
    if (!game.audioCtx || !game.masterGain) return;
    const osc = game.audioCtx.createOscillator();
    const gain = game.audioCtx.createGain();
    osc.connect(gain);
    gain.connect(game.masterGain);
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(600, game.audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(200, game.audioCtx.currentTime + 0.2);
    gain.gain.setValueAtTime(0.1, game.audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, game.audioCtx.currentTime + 0.2);
    osc.start();
    osc.stop(game.audioCtx.currentTime + 0.2);
  };

  const playComboUp = (level: number) => {
    const base = 600 + level * 100;
    [0, 60, 120].forEach((delay, i) => {
      setTimeout(() => playSoftSound(base * (1 + i * 0.25), 0.1, 'square', 0.08, 4000), delay);
    });
  };

  const playFlowUp = (level: number) => {
    const base = 800 + level * 80;
    playSoftSound(base, 0.15, 'sine', 0.1, 5000);
    setTimeout(() => playSoftSound(base * 1.5, 0.12, 'sine', 0.08, 4500), 50);
  };

  const playFlowBreak = () => {
    playSoftSound(500, 0.1, 'triangle', 0.06, 1500);
  };

  const playGameOver = () => {
    const notes = [392, 370, 349, 330];
    notes.forEach((freq, i) => {
      setTimeout(() => playSoftSound(freq, 0.3, 'triangle', 0.12, 1200), i * 200);
    });
  };

  const playHighScore = () => {
    const notes = [523, 523, 523, 698, 880, 784, 698, 880];
    notes.forEach((freq, i) => {
      setTimeout(() => playSoftSound(freq, 0.12, 'square', 0.1, 4000), i * 80);
    });
  };

  // Game functions
  const startGame = () => {
    const game = gameRef.current;
    initAudio();
    if (game.audioCtx?.state === 'suspended') game.audioCtx.resume();

    // Reset
    game.score = 0;
    game.lives = 3;
    game.combo = 1;
    game.comboCount = 0;
    game.timeLeft = 60;
    game.targets = [];
    game.particles = [];
    game.screenShake = 0;
    game.lastSpawn = 0;
    game.pulsePhase = 0;
    game.lastTempoUpdate = 60;
    game.lastEmoji = null;
    game.emojiStreak = 0;
    game.flowMultiplier = 1;
    game.flowTimeLeft = 0;
    game.flowEmoji = null;
    game.running = true;
    game.lastTime = performance.now();

    // Init bg shapes
    game.bgShapes = [];
    for (let i = 0; i < 15; i++) {
      game.bgShapes.push({
        x: Math.random() * 1000,
        y: Math.random() * 1000,
        size: 20 + Math.random() * 60,
        speed: 0.2 + Math.random() * 0.3,
        color: [THEME.pink, THEME.yellow, THEME.cyan, THEME.purple, THEME.orange][Math.floor(Math.random() * 5)],
        rotation: Math.random() * Math.PI * 2
      });
    }

    setScore(0);
    setGameState('playing');
    // Music started by useEffect when gameState changes to 'playing'
  };

  const endGame = () => {
    const game = gameRef.current;
    game.running = false;
    stopMusic();

    // Track play for analytics (fire-and-forget)
    if (game.score >= 1) {
      fetch('/api/pixelpit/stats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ game: GAME_ID }),
      }).catch(() => {}); // Silent fail
    }

    const storedHigh = parseInt(localStorage.getItem('emoji_madness_high') || '0');
    if (game.score > storedHigh) {
      localStorage.setItem('emoji_madness_high', game.score.toString());
      playHighScore();
    } else {
      playGameOver();
    }

    setScore(game.score);
    setSubmittedEntryId(null);
    setProgression(null);
    setGameState('gameover');
  };

  // Game loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      const vv = window.visualViewport;
      canvas.width = vv ? vv.width : window.innerWidth;
      canvas.height = vv ? vv.height : window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', resize);
    }

    let animationId: number;
    const game = gameRef.current;

    const getSpawnInterval = () => {
      if (game.timeLeft > 40) return 800;
      if (game.timeLeft > 20) return 500;
      return 300;
    };

    const getSpeed = () => {
      if (game.timeLeft > 40) return 1.5;
      if (game.timeLeft > 20) return 2.5;
      return 3.5;
    };

    const getBadRatio = () => {
      if (game.timeLeft > 40) return 0.20;
      if (game.timeLeft > 20) return 0.25;
      return 0.30;
    };

    const spawn = () => {
      const rand = Math.random();
      let emoji: string, type: string;

      if (rand < 0.05) {
        emoji = GOLDEN;
        type = 'golden';
      } else if (rand < 0.05 + getBadRatio()) {
        emoji = BAD[Math.floor(Math.random() * BAD.length)];
        type = 'bad';
      } else {
        emoji = GOOD[Math.floor(Math.random() * GOOD.length)];
        type = 'good';
      }

      game.targets.push({
        x: 40 + Math.random() * (canvas.width - 80),
        y: canvas.height + 40,
        r: 30,
        speed: getSpeed() + Math.random() * 1.5,
        emoji,
        type,
        rotation: Math.random() * 0.3 - 0.15,
        wobble: Math.random() * Math.PI * 2,
        color: EMOJI_COLORS[emoji] || THEME.pink
      });
    };

    const spawnParticles = (x: number, y: number, color: string, count: number) => {
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 3 + Math.random() * 5;
        game.particles.push({
          x, y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 2,
          r: 4 + Math.random() * 8,
          color,
          alpha: 1,
          decay: 0.025 + Math.random() * 0.02
        });
      }
    };

    const spawnText = (x: number, y: number, text: string, color: string) => {
      game.particles.push({
        x, y,
        vx: 0,
        vy: -2,
        text,
        color,
        alpha: 1,
        decay: 0.02,
        isText: true,
        scale: 1.5
      });
    };

    const updateCombo = (hit: boolean) => {
      if (hit) {
        game.comboCount++;
        const prevCombo = game.combo;
        if (game.comboCount >= 10) game.combo = 5;
        else if (game.comboCount >= 6) game.combo = 3;
        else if (game.comboCount >= 3) game.combo = 2;
        else game.combo = 1;
        if (game.combo > prevCombo) playComboUp(game.combo);
      } else {
        game.comboCount = 0;
        game.combo = 1;
      }
    };

    const handleTap = (x: number, y: number) => {
      if (!game.running) return;

      for (let i = game.targets.length - 1; i >= 0; i--) {
        const t = game.targets[i];
        const dist = Math.hypot(x - t.x, y - t.y);

        if (dist < t.r + 15) {
          game.targets.splice(i, 1);

          if (t.type === 'bad') {
            game.lives--;
            updateCombo(false);
            if (game.flowMultiplier >= 2) playFlowBreak();
            game.lastEmoji = null;
            game.emojiStreak = 0;
            game.flowMultiplier = 1;
            game.flowTimeLeft = 0;
            game.flowEmoji = null;
            game.screenShake = 15;
            spawnParticles(t.x, t.y, THEME.red, 15);
            spawnText(t.x, t.y - 30, '💔', THEME.red);
            playBad();
            if (game.lives <= 0) endGame();
          } else if (t.type === 'golden') {
            const pts = 5 * game.combo;
            game.score += pts;
            updateCombo(true);
            game.screenShake = 5;
            spawnParticles(t.x, t.y, THEME.yellow, 30);
            spawnText(t.x, t.y - 30, '+' + pts, THEME.yellow);
            playGolden();
          } else {
            const prevStreak = game.emojiStreak;
            if (t.emoji === game.lastEmoji) {
              game.emojiStreak++;
              if (game.emojiStreak === 2) {
                game.flowMultiplier = 2;
                game.flowTimeLeft = 3;
                game.flowEmoji = t.emoji;
                playFlowUp(2);
              } else if (game.emojiStreak >= 3) {
                game.flowMultiplier = 3;
                game.flowTimeLeft = 5;
                game.flowEmoji = t.emoji;
                playFlowUp(3);
              }
            } else {
              game.emojiStreak = 1;
              game.lastEmoji = t.emoji;
            }
            const pts = game.combo * game.flowMultiplier;
            game.score += pts;
            updateCombo(true);
            spawnParticles(t.x, t.y, t.color, 12 + game.flowMultiplier * 3);
            playPop();
            if (pts > 1) spawnText(t.x, t.y - 30, '+' + pts, THEME.pink);
            if (game.flowMultiplier >= 2 && game.emojiStreak >= 2) {
              spawnText(t.x, t.y - 55, 'FLOW ×' + game.flowMultiplier, THEME.purple);
            }
          }
          setScore(game.score);
          return;
        }
      }
    };

    const update = (dt: number) => {
      if (!game.running) return;

      game.pulsePhase += dt * 4;
      game.timeLeft -= dt;

      if (game.timeLeft <= 0) {
        game.timeLeft = 0;
        endGame();
        return;
      }

      if (Math.floor(game.timeLeft / 10) < Math.floor(game.lastTempoUpdate / 10)) {
        updateMusicTempo();
        game.lastTempoUpdate = game.timeLeft;
      }

      // Flow timer
      if (game.flowTimeLeft > 0) {
        game.flowTimeLeft -= dt;
        if (game.flowTimeLeft <= 0) {
          game.flowTimeLeft = 0;
          if (game.flowMultiplier >= 2) playFlowBreak();
          game.flowMultiplier = 1;
          game.flowEmoji = null;
          game.emojiStreak = 0;
          game.lastEmoji = null;
        }
      }

      // Spawn
      game.lastSpawn += dt * 1000;
      if (game.lastSpawn > getSpawnInterval()) {
        spawn();
        game.lastSpawn = 0;
      }

      // Background shapes
      game.bgShapes.forEach((s: any) => {
        s.y -= s.speed;
        s.rotation += 0.005;
        if (s.y < -s.size) {
          s.y = canvas.height + s.size;
          s.x = Math.random() * canvas.width;
        }
      });

      // Targets
      for (let i = game.targets.length - 1; i >= 0; i--) {
        const t = game.targets[i];
        t.y -= t.speed;
        t.wobble += 0.1;
        t.x += Math.sin(t.wobble) * 0.5;

        if (t.y < -50) {
          game.targets.splice(i, 1);
          if (t.type === 'good' || t.type === 'golden') {
            game.lives--;
            updateCombo(false);
            if (game.flowMultiplier >= 2) playFlowBreak();
            game.lastEmoji = null;
            game.emojiStreak = 0;
            game.flowMultiplier = 1;
            game.flowTimeLeft = 0;
            game.flowEmoji = null;
            game.screenShake = 8;
            spawnText(canvas.width / 2, 100, 'MISSED!', THEME.red);
            playMiss();
            if (game.lives <= 0) endGame();
          }
        }
      }

      // Particles
      for (let i = game.particles.length - 1; i >= 0; i--) {
        const p = game.particles[i];
        p.x += p.vx || 0;
        p.y += p.vy || 0;
        if (p.vy && !p.isText) p.vy += 0.12;
        if (p.scale) p.scale *= 0.95;
        p.alpha -= p.decay;
        if (p.alpha <= 0) game.particles.splice(i, 1);
      }

      if (game.screenShake > 0) game.screenShake *= 0.85;
    };

    const draw = () => {
      const W = canvas.width;
      const H = canvas.height;

      ctx.save();
      if (game.screenShake > 0.5 && game.running) {
        ctx.translate(
          (Math.random() - 0.5) * game.screenShake,
          (Math.random() - 0.5) * game.screenShake
        );
      }

      // Background
      const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
      bgGrad.addColorStop(0, THEME.bgTop);
      bgGrad.addColorStop(1, THEME.bgBottom);
      ctx.fillStyle = bgGrad;
      ctx.fillRect(-10, -10, W + 20, H + 20);

      // Background shapes
      game.bgShapes.forEach((s: any) => {
        ctx.save();
        ctx.translate(s.x % W, s.y);
        ctx.rotate(s.rotation);
        ctx.globalAlpha = 0.15;
        ctx.fillStyle = s.color;
        ctx.beginPath();
        ctx.arc(0, 0, s.size / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      if (game.running) {
        // Flow border
        if (game.flowMultiplier >= 2 && game.flowTimeLeft > 0) {
          const flowColor = EMOJI_COLORS[game.flowEmoji || ''] || THEME.purple;
          const shimmer = Math.sin(game.pulsePhase * 6) * 0.4 + 0.6;
          const borderWidth = 4 + shimmer * 2;

          ctx.save();
          ctx.strokeStyle = flowColor;
          ctx.lineWidth = borderWidth;
          ctx.shadowBlur = 25 + shimmer * 20;
          ctx.shadowColor = flowColor;
          ctx.beginPath();
          ctx.roundRect(borderWidth/2, borderWidth/2, W - borderWidth, H - borderWidth, 0);
          ctx.stroke();
          ctx.shadowBlur = 50 + shimmer * 30;
          ctx.globalAlpha = 0.5;
          ctx.stroke();
          ctx.restore();
        }

        // Targets
        game.targets.forEach((t: any) => {
          ctx.save();
          ctx.translate(t.x, t.y);
          const bounce = 1 + Math.sin(game.pulsePhase + t.wobble) * 0.05;
          ctx.scale(bounce, bounce);
          ctx.rotate(t.rotation);

          ctx.fillStyle = 'rgba(0,0,0,0.1)';
          ctx.beginPath();
          ctx.ellipse(3, 5, t.r * 0.9, t.r * 0.4, 0, 0, Math.PI * 2);
          ctx.fill();

          const bgColor = t.type === 'bad' ? '#fee2e2' :
                          t.type === 'golden' ? '#fef9c3' : THEME.white;
          ctx.fillStyle = bgColor;
          ctx.shadowBlur = 15;
          ctx.shadowColor = t.type === 'bad' ? THEME.red + '50' :
                            t.type === 'golden' ? THEME.yellow + '80' : t.color + '40';
          ctx.beginPath();
          ctx.arc(0, 0, t.r, 0, Math.PI * 2);
          ctx.fill();

          ctx.strokeStyle = t.type === 'bad' ? THEME.red :
                            t.type === 'golden' ? THEME.yellow : t.color;
          ctx.lineWidth = 3;
          ctx.stroke();
          ctx.shadowBlur = 0;

          ctx.font = '36px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = '#000';
          ctx.fillText(t.emoji, 0, 2);

          ctx.restore();
        });

        // Particles
        game.particles.forEach((p: any) => {
          ctx.save();
          ctx.globalAlpha = p.alpha;

          if (p.isText) {
            const scale = p.scale || 1;
            ctx.font = `700 ${24 * scale}px ui-rounded, system-ui, sans-serif`;
            ctx.textAlign = 'center';
            ctx.fillStyle = p.color;
            ctx.fillText(p.text, p.x, p.y);
          } else {
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r * p.alpha, 0, Math.PI * 2);
            ctx.fill();
          }

          ctx.restore();
        });

        // HUD - Score
        ctx.textAlign = 'center';
        ctx.font = '800 52px ui-rounded, system-ui, sans-serif';
        ctx.fillStyle = THEME.pink;
        ctx.fillText(game.score.toString(), W/2, 50);

        // Combo
        if (game.combo > 1) {
          ctx.font = '700 16px ui-rounded, system-ui, sans-serif';
          ctx.fillStyle = THEME.purple;
          ctx.fillText('×' + game.combo + ' COMBO', W/2, 78);
        }

        // Flow indicator
        if (game.flowMultiplier >= 2 && game.flowTimeLeft > 0) {
          const flowY = game.combo > 1 ? 105 : 82;
          const shimmer = Math.sin(game.pulsePhase * 8) * 0.5 + 0.5;
          const pulse = 1 + Math.sin(game.pulsePhase * 3) * 0.08;
          const flowColor = EMOJI_COLORS[game.flowEmoji || ''] || THEME.purple;

          ctx.save();
          ctx.translate(W/2, flowY);
          ctx.scale(pulse, pulse);

          const barW = 140;
          const barH = 28;
          ctx.fillStyle = flowColor + '30';
          ctx.shadowBlur = 20 + shimmer * 15;
          ctx.shadowColor = flowColor;
          ctx.beginPath();
          ctx.roundRect(-barW/2, -barH/2, barW, barH, 14);
          ctx.fill();

          const timeRatio = game.flowTimeLeft / (game.flowMultiplier === 3 ? 5 : 3);
          ctx.fillStyle = flowColor + '60';
          ctx.beginPath();
          ctx.roundRect(-barW/2 + 3, -barH/2 + 3, (barW - 6) * timeRatio, barH - 6, 11);
          ctx.fill();

          ctx.shadowBlur = 10 + shimmer * 10;
          ctx.font = '700 14px ui-rounded, system-ui, sans-serif';
          ctx.fillStyle = '#fff';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(game.flowEmoji + ' FLOW ×' + game.flowMultiplier, 0, 1);

          ctx.restore();
        }

        // Timer
        ctx.font = '700 22px ui-rounded, system-ui, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillStyle = game.timeLeft <= 10 ? THEME.red : THEME.dark;
        ctx.fillText(Math.ceil(game.timeLeft) + 's', 20, 38);

        // Lives
        ctx.textAlign = 'right';
        ctx.font = '22px sans-serif';
        ctx.fillText('❤️'.repeat(game.lives), W - 20, 38);
      }

      ctx.restore();
    };

    const gameLoop = (now: number) => {
      const dt = Math.min((now - game.lastTime) / 1000, 0.1);
      game.lastTime = now;
      update(dt);
      draw();
      animationId = requestAnimationFrame(gameLoop);
    };

    // Input handlers - only prevent default when actually playing
    const onTouch = (e: TouchEvent) => {
      if (gameState === 'playing') {
        e.preventDefault();
        handleTap(e.touches[0].clientX, e.touches[0].clientY);
      }
    };
    const onClick = (e: MouseEvent) => {
      if (gameState === 'playing') {
        handleTap(e.clientX, e.clientY);
      }
    };

    canvas.addEventListener('touchstart', onTouch, { passive: false });
    canvas.addEventListener('click', onClick);

    game.lastTime = performance.now();
    animationId = requestAnimationFrame(gameLoop);

    // Start music when entering playing state
    if (gameState === 'playing') {
      startMusic();
    }

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resize);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', resize);
      }
      canvas.removeEventListener('touchstart', onTouch);
      canvas.removeEventListener('click', onClick);
      // Only stop music when leaving playing state
      if (gameState === 'playing') {
        stopMusic();
      }
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
        html, body {
          width: 100%;
          height: 100%;
          height: 100dvh;
          background: ${THEME.bgTop};
          overflow: hidden;
          touch-action: manipulation;
          user-select: none;
          position: fixed;
          inset: 0;
        }
        canvas {
          display: block;
          width: 100%;
          height: 100%;
          height: 100dvh;
          position: fixed;
          top: 0;
          left: 0;
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
      `}</style>

      <canvas ref={canvasRef} />

      {/* Start Screen */}
      {gameState === 'start' && (
        <div style={{
          position: 'fixed',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: `linear-gradient(${THEME.bgTop}, ${THEME.bgBottom})`,
          zIndex: 100,
          overflow: 'hidden',
        }}>
          {/* Background bubbles */}
          <div style={{ position: 'absolute', top: 60, left: '10%', width: 100, height: 100, borderRadius: '50%', background: THEME.pink, opacity: 0.15 }} />
          <div style={{ position: 'absolute', top: '20%', right: '15%', width: 70, height: 70, borderRadius: '50%', background: THEME.cyan, opacity: 0.15 }} />
          <div style={{ position: 'absolute', top: '15%', left: '25%', width: 50, height: 50, borderRadius: '50%', background: THEME.yellow, opacity: 0.15 }} />
          <div style={{ position: 'absolute', bottom: '25%', left: '8%', width: 90, height: 90, borderRadius: '50%', background: THEME.purple, opacity: 0.15 }} />
          <div style={{ position: 'absolute', bottom: '15%', right: '20%', width: 60, height: 60, borderRadius: '50%', background: THEME.pink, opacity: 0.15 }} />
          <div style={{ position: 'absolute', top: '40%', left: '5%', width: 40, height: 40, borderRadius: '50%', background: THEME.cyan, opacity: 0.15 }} />
          <div style={{ position: 'absolute', bottom: '40%', right: '8%', width: 80, height: 80, borderRadius: '50%', background: THEME.yellow, opacity: 0.15 }} />
          <div style={{ position: 'absolute', top: '60%', right: '5%', width: 55, height: 55, borderRadius: '50%', background: THEME.orange, opacity: 0.15 }} />

          <div style={{
            position: 'relative',
            background: THEME.white,
            padding: '50px 60px',
            borderRadius: 24,
            boxShadow: `8px 8px 0 ${THEME.pink}30, 0 20px 40px ${THEME.pink}40`,
            textAlign: 'center',
          }}>
            <h1 style={{
              fontFamily: 'ui-rounded, system-ui, sans-serif',
              fontSize: 38,
              fontWeight: 700,
              color: THEME.pink,
              margin: 0,
            }}>
              EMOJI
            </h1>
            <h1 style={{
              fontFamily: 'ui-rounded, system-ui, sans-serif',
              fontSize: 38,
              fontWeight: 700,
              color: THEME.yellow,
              margin: '0 0 20px',
            }}>
              BLASTER
            </h1>
            <div style={{ fontSize: 40, marginBottom: 20 }}>
              😀 🎯 💀
            </div>
            <p style={{
              fontFamily: 'ui-rounded, system-ui, sans-serif',
              fontSize: 15,
              color: THEME.dark,
              marginBottom: 25,
            }}>
              tap the happy ones!
            </p>
            <button
              onClick={startGame}
              style={{
                background: THEME.pink,
                color: THEME.white,
                border: 'none',
                borderRadius: 20,
                padding: '16px 50px',
                fontSize: 16,
                fontFamily: 'ui-rounded, system-ui, sans-serif',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              PLAY
            </button>
          </div>
          <div style={{
            marginTop: 30,
            fontFamily: 'ui-rounded, system-ui, sans-serif',
            fontSize: 12,
            fontWeight: 600,
          }}>
            <span style={{ color: THEME.pink }}>pixel</span>
            <span style={{ color: THEME.cyan }}>pit</span>
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
          background: `linear-gradient(${THEME.bgTop}, ${THEME.bgBottom})`,
          zIndex: 100,
          padding: 20,
          overflow: 'hidden',
        }}>
          {/* Background bubbles */}
          <div style={{ position: 'absolute', top: '8%', left: '12%', width: 80, height: 80, borderRadius: '50%', background: THEME.cyan, opacity: 0.15 }} />
          <div style={{ position: 'absolute', top: '15%', right: '10%', width: 60, height: 60, borderRadius: '50%', background: THEME.pink, opacity: 0.15 }} />
          <div style={{ position: 'absolute', bottom: '20%', left: '8%', width: 70, height: 70, borderRadius: '50%', background: THEME.yellow, opacity: 0.15 }} />
          <div style={{ position: 'absolute', bottom: '12%', right: '15%', width: 90, height: 90, borderRadius: '50%', background: THEME.purple, opacity: 0.15 }} />
          <div style={{ position: 'absolute', top: '45%', left: '5%', width: 50, height: 50, borderRadius: '50%', background: THEME.orange, opacity: 0.15 }} />
          <div style={{ position: 'absolute', top: '50%', right: '6%', width: 55, height: 55, borderRadius: '50%', background: THEME.cyan, opacity: 0.15 }} />

          <h1 style={{
            fontFamily: 'ui-rounded, system-ui, sans-serif',
            fontSize: 24,
            fontWeight: 600,
            color: THEME.dark,
            margin: '0 0 15px',
          }}>
            GAME OVER
          </h1>
          <div style={{
            fontFamily: 'ui-rounded, system-ui, sans-serif',
            fontSize: 72,
            fontWeight: 800,
            color: THEME.pink,
            marginBottom: 20,
          }}>
            {score}
          </div>

          <ScoreFlow
            score={score}
            gameId={GAME_ID}
            colors={SCORE_FLOW_COLORS}
            maxScore={500}
            onRankReceived={(rank, entryId) => {
              setSubmittedEntryId(entryId ?? null);
            }}
            onProgression={(prog) => {
              setProgression(prog);
            }}
          />

          {/* Animated Progression Display */}
          {progression && (
            <ProgressionDisplay progression={progression} theme={THEME} />
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center', marginTop: 20 }}>
            <button
              onClick={startGame}
              style={{
                background: THEME.cyan,
                color: THEME.white,
                border: 'none',
                borderRadius: 20,
                padding: '14px 45px',
                fontSize: 15,
                fontFamily: 'ui-rounded, system-ui, sans-serif',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              PLAY AGAIN
            </button>
            <button
              onClick={() => setGameState('leaderboard')}
              style={{
                background: 'transparent',
                border: `2px solid ${THEME.pink}40`,
                borderRadius: 12,
                color: THEME.dark,
                padding: '12px 30px',
                fontSize: 13,
                fontFamily: 'ui-rounded, system-ui, sans-serif',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              LEADERBOARD
            </button>
            <ShareButtonContainer
              id="share-btn-container"
              url={typeof window !== 'undefined' ? `${window.location.origin}/pixelpit/arcade/emoji/share/${score}` : ''}
              text={`I scored ${score} on Emoji Blaster! 😀💀 Can you beat me?`}
              style="minimal"
              socialLoaded={socialLoaded}
            />
          </div>
        </div>
      )}

      {/* Leaderboard */}
      {gameState === 'leaderboard' && (
        <Leaderboard
          gameId={GAME_ID}
          limit={10}
          entryId={submittedEntryId ?? undefined}
          colors={LEADERBOARD_COLORS}
          onClose={() => setGameState('gameover')}
        />
      )}
    </>
  );
}
