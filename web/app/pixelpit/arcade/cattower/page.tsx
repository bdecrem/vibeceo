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
  type ProgressionResult,
} from '@/app/pixelpit/components';

// =============================================================================
// CAT TOWER — Stack game with cats
// =============================================================================

const GAME_ID = 'cat-tower';

// Thresholds for name prompt
const PLAYS_UNTIL_NAME_PROMPT = 3;
const SCORE_FOR_IMMEDIATE_NAME_PROMPT = 5;

// =============================================================================
// AUDIO SYSTEM - Modern Electronic / Techno
// =============================================================================

class GameAudio {
  ctx: AudioContext | null = null;
  masterGain: GainNode | null = null;
  musicGain: GainNode | null = null;
  sfxGain: GainNode | null = null;
  musicPlaying = false;
  musicInterval: NodeJS.Timeout | null = null;
  musicStep = 0;
  arpStep = 0;
  enabled = true;

  // Electronic dance config - 124 BPM, four-on-the-floor
  music = {
    bpm: 124,
    // Sub bass pattern (A minor pentatonic root notes)
    bass: [55, 0, 55, 0, 55, 0, 55, 65, 55, 0, 55, 0, 55, 0, 73, 65],
    // Four-on-the-floor kick
    kick: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
    // Offbeat hi-hats
    hat: [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0],
    // Closed hats for texture
    closedHat: [1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1],
    // Dreamy arpeggio notes (Am - F - C - G progression)
    arp: [
      [220, 262, 330, 392, 440],  // Am
      [175, 220, 262, 330, 349],  // F
      [196, 262, 330, 392, 523],  // C
      [196, 247, 294, 392, 494],  // G
    ],
    // Pad chord stabs
    pad: [
      [220, 262, 330],  // Am
      [175, 220, 262],  // F
      [196, 262, 330],  // C
      [196, 247, 392],  // G
    ],
  };

  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();

      this.masterGain = this.ctx.createGain();
      this.masterGain.connect(this.ctx.destination);
      this.masterGain.gain.value = 1;

      this.musicGain = this.ctx.createGain();
      this.musicGain.connect(this.masterGain);
      this.musicGain.gain.value = 0.5;

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.connect(this.masterGain);
      this.sfxGain.gain.value = 0.4;
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (this.masterGain) {
      this.masterGain.gain.value = enabled ? 1 : 0;
    }
  }

  playSoftTone(freq: number, duration: number, type: OscillatorType, volume: number, cutoff: number) {
    if (!this.ctx || !this.sfxGain) return;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const g = this.ctx.createGain();
    osc.connect(filter);
    filter.connect(g);
    g.connect(this.sfxGain);
    osc.type = type;
    osc.frequency.value = freq;
    filter.type = 'lowpass';
    filter.frequency.value = cutoff;
    g.gain.setValueAtTime(volume, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  playDrop() {
    this.playSoftTone(200, 0.08, 'sine', 0.15, 1500);
    setTimeout(() => this.playSoftTone(150, 0.06, 'sine', 0.1, 1000), 40);
  }

  playLand() {
    if (!this.ctx || !this.sfxGain) return;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(120, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(50, this.ctx.currentTime + 0.1);
    g.gain.setValueAtTime(0.2, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.15);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.15);
  }

  playPerfect(streak: number) {
    // Bright synth arp
    const baseFreq = 523 + streak * 50;
    [0, 80, 160].forEach((delay, i) => {
      setTimeout(() => this.playSoftTone(baseFreq * (1 + i * 0.25), 0.12, 'square', 0.06, 3000), delay);
    });
  }

  playSlice() {
    if (!this.ctx || !this.sfxGain) return;
    const bufferSize = this.ctx.sampleRate * 0.05;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const hp = this.ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 2000;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.08, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.05);
    noise.connect(hp);
    hp.connect(g);
    g.connect(this.sfxGain);
    noise.start();
  }

  playGrow() {
    // Rising synth sweep
    [0, 100, 200, 300].forEach((delay, i) => {
      setTimeout(() => this.playSoftTone(440 + i * 110, 0.15, 'sawtooth', 0.05, 2500), delay);
    });
  }

  playGameOver() {
    // Descending tones
    [0, 200, 400].forEach((delay, i) => {
      setTimeout(() => this.playSoftTone(440 - i * 80, 0.25, 'triangle', 0.08, 1500), delay);
    });
  }

  startMusic() {
    if (this.musicPlaying || !this.ctx) return;
    this.init();
    if (this.ctx.state === 'suspended') this.ctx.resume();

    this.musicPlaying = true;
    this.musicStep = 0;
    this.arpStep = 0;

    const stepTime = (60 / this.music.bpm) * 1000 / 4; // 16th notes

    this.musicInterval = setInterval(() => {
      if (!this.musicPlaying || !this.ctx) return;
      this.musicTick();
    }, stepTime);
  }

  musicTick() {
    const beat = this.musicStep % 16;
    const bar = Math.floor(this.musicStep / 16) % 4;

    // Four-on-the-floor kick
    if (this.music.kick[beat]) {
      this.playKick();
    }

    // Offbeat open hi-hat
    if (this.music.hat[beat]) {
      this.playOpenHat();
    }

    // Closed hats for groove
    if (this.music.closedHat[beat]) {
      this.playClosedHat();
    }

    // Sub bass
    const bassNote = this.music.bass[beat];
    if (bassNote > 0) {
      this.playSubBass(bassNote);
    }

    // Dreamy arpeggiator - plays on every 16th note
    this.playArp(this.music.arp[bar]);

    // Pad stab on beat 1 of each bar
    if (beat === 0) {
      this.playPad(this.music.pad[bar]);
    }

    this.musicStep++;
    this.arpStep++;
  }

  playKick() {
    if (!this.ctx || !this.musicGain) return;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.connect(g);
    g.connect(this.musicGain);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40, this.ctx.currentTime + 0.08);
    g.gain.setValueAtTime(0.35, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.2);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.2);
  }

  playOpenHat() {
    if (!this.ctx || !this.musicGain) return;
    const bufferSize = this.ctx.sampleRate * 0.08;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const hp = this.ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 7000;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.06, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.08);
    noise.connect(hp);
    hp.connect(g);
    g.connect(this.musicGain);
    noise.start();
  }

  playClosedHat() {
    if (!this.ctx || !this.musicGain) return;
    const bufferSize = this.ctx.sampleRate * 0.02;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const hp = this.ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 9000;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.03, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.025);
    noise.connect(hp);
    hp.connect(g);
    g.connect(this.musicGain);
    noise.start();
  }

  playSubBass(freq: number) {
    if (!this.ctx || !this.musicGain) return;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const g = this.ctx.createGain();
    osc.connect(filter);
    filter.connect(g);
    g.connect(this.musicGain);
    osc.type = 'sine';
    osc.frequency.value = freq;
    filter.type = 'lowpass';
    filter.frequency.value = 200;
    g.gain.setValueAtTime(0.2, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.12);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.15);
  }

  playArp(notes: number[]) {
    if (!this.ctx || !this.musicGain) return;
    const note = notes[this.arpStep % notes.length];
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const g = this.ctx.createGain();
    osc.connect(filter);
    filter.connect(g);
    g.connect(this.musicGain);
    osc.type = 'sawtooth';
    osc.frequency.value = note;
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(3500, this.ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(800, this.ctx.currentTime + 0.15);
    filter.Q.value = 3;
    g.gain.setValueAtTime(0.04, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.12);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.15);
  }

  playPad(freqs: number[]) {
    if (!this.ctx || !this.musicGain) return;
    freqs.forEach((freq) => {
      const osc = this.ctx!.createOscillator();
      const osc2 = this.ctx!.createOscillator();
      const filter = this.ctx!.createBiquadFilter();
      const g = this.ctx!.createGain();
      osc.connect(filter);
      osc2.connect(filter);
      filter.connect(g);
      g.connect(this.musicGain!);
      osc.type = 'sawtooth';
      osc.frequency.value = freq;
      osc2.type = 'sawtooth';
      osc2.frequency.value = freq * 1.003; // Slight detune for width
      filter.type = 'lowpass';
      filter.frequency.value = 1500;
      g.gain.setValueAtTime(0.025, this.ctx!.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, this.ctx!.currentTime + 0.8);
      osc.start();
      osc2.start();
      osc.stop(this.ctx!.currentTime + 0.85);
      osc2.stop(this.ctx!.currentTime + 0.85);
    });
  }

  stopMusic() {
    this.musicPlaying = false;
    if (this.musicInterval) {
      clearInterval(this.musicInterval);
      this.musicInterval = null;
    }
  }
}

const gameAudio = new GameAudio();

// =============================================================================
// GAME TYPES & CONSTANTS
// =============================================================================

const CAT_COLORS = [
  { body: '#FF6B6B', stripe: '#E85555' },
  { body: '#FFB347', stripe: '#E8941A' },
  { body: '#FFE66D', stripe: '#E8D14A' },
  { body: '#7BED9F', stripe: '#5ED17F' },
  { body: '#70A1FF', stripe: '#5588E8' },
  { body: '#9B59B6', stripe: '#7D3C98' },
  { body: '#FF85C0', stripe: '#E86AA8' },
];

const CAT_FACES = ['=^.^=', '>^.^<', '=^o^=', '>^w^<', '=^_^='];

interface StackedCat {
  x: number;
  y: number;
  width: number;
  colorIndex: number;
  squash: number;
}

interface FallingPiece {
  x: number;
  y: number;
  width: number;
  height: number;
  colorIndex: number;
  vy: number;
  vx: number;
  rotation: number;
  rotationSpeed: number;
}

// =============================================================================
// COLORS (matching Neon Playroom style)
// =============================================================================

const COLORS = {
  bg: '#1a1a2e',
  surface: '#16213e',
  primary: '#FFB347',
  secondary: '#70A1FF',
  text: '#f8fafc',
  muted: '#64748b',
};

const LEADERBOARD_COLORS: LeaderboardColors = {
  bg: COLORS.bg,
  surface: COLORS.surface,
  primary: COLORS.primary,
  secondary: COLORS.secondary,
  text: COLORS.text,
  muted: COLORS.muted,
};

const SCORE_FLOW_COLORS: ScoreFlowColors = {
  bg: COLORS.bg,
  surface: COLORS.surface,
  primary: COLORS.primary,
  secondary: COLORS.secondary,
  text: COLORS.text,
  muted: COLORS.muted,
  error: '#f87171',
};

// =============================================================================
// PROGRESSION DISPLAY COMPONENT
// =============================================================================

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
      background: COLORS.surface,
      border: `1px solid ${COLORS.primary}30`,
      borderRadius: 12,
      padding: '14px 20px',
      marginBottom: 15,
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
          fontFamily: 'monospace',
          fontSize: 16,
          fontWeight: 700,
          color: COLORS.primary,
        }}>
          +{animatedXp} XP
        </span>
        {progression.streak > 1 && (
          <span style={{
            background: COLORS.secondary,
            color: COLORS.bg,
            padding: '3px 8px',
            borderRadius: 10,
            fontSize: 10,
            fontWeight: 600,
            fontFamily: 'monospace',
          }}>
            {progression.multiplier}x streak
          </span>
        )}
      </div>

      {/* XP Progress Bar */}
      <div style={{
        background: COLORS.bg,
        borderRadius: 6,
        height: 8,
        overflow: 'hidden',
        marginBottom: 6,
        position: 'relative',
      }}>
        <div style={{
          background: `linear-gradient(90deg, ${COLORS.primary}, ${COLORS.secondary})`,
          height: '100%',
          width: `${progressPercent}%`,
          borderRadius: 6,
          transition: 'width 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
          boxShadow: barPulse ? `0 0 12px ${COLORS.primary}` : 'none',
        }} />
      </div>

      <div style={{
        fontFamily: 'monospace',
        fontSize: 11,
        color: COLORS.muted,
      }}>
        Level {progression.level} • {Math.floor(animatedProgress)}/{progression.levelNeeded} XP
      </div>

      {showLevelUp && (
        <div style={{
          marginTop: 10,
          padding: '8px 16px',
          background: `linear-gradient(135deg, ${COLORS.primary}, #E8941A)`,
          borderRadius: 10,
          fontFamily: 'monospace',
          fontSize: 13,
          fontWeight: 700,
          color: COLORS.bg,
        }}>
          LEVEL UP!
        </div>
      )}

      {progression.streak >= 3 && (
        <div style={{
          marginTop: 8,
          fontFamily: 'monospace',
          fontSize: 10,
          color: COLORS.secondary,
        }}>
          🔥 {progression.streak} day streak
        </div>
      )}
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function CatTowerGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<'start' | 'playing' | 'gameover' | 'leaderboard'>('start');
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isNewBest, setIsNewBest] = useState(false);

  // Social state
  const [socialLoaded, setSocialLoaded] = useState(false);
  const [playCount, setPlayCount] = useState(0);
  const [sessionPlays, setSessionPlays] = useState(0); // Games played this session (in a row)
  const [entryId, setEntryId] = useState<number | null>(null);
  const [progression, setProgression] = useState<ProgressionResult | null>(null);
  const [hasHandle, setHasHandle] = useState(false); // User has submitted a handle before

  // User from social library (logged in user)
  const { user } = usePixelpitSocial(socialLoaded);

  // Show Leaderboard/Share when: user has handle OR (3 games OR score >= 5)
  const shouldShowLeaderboardShare = hasHandle || user || sessionPlays >= PLAYS_UNTIL_NAME_PROMPT || score >= SCORE_FOR_IMMEDIATE_NAME_PROMPT;

  // Show ScoreFlow (handle input) ONLY when: conditions met AND user doesn't have a handle yet
  const shouldShowScoreFlow = !hasHandle && !user && (sessionPlays >= PLAYS_UNTIL_NAME_PROMPT || score >= SCORE_FOR_IMMEDIATE_NAME_PROMPT);

  // Game state ref
  const gameRef = useRef({
    running: false,
    score: 0,
    perfectStreak: 0,
    colorIndex: 0,
    currentCat: {
      x: 0,
      y: 0,
      width: 120,
      vy: 0,
      direction: 1,
      speed: 3,
      state: 'sliding' as 'sliding' | 'dropping' | 'landed',
    },
    stack: [] as StackedCat[],
    ghostStack: [] as StackedCat[],
    fallingPieces: [] as FallingPiece[],
    flashIntensity: 0,
    shake: 0,
    slideY: 0,
    landingY: 0,
    baseWidth: 120,
    catHeight: 35,
    gameOverPending: false,
  });

  const PERFECT_THRESHOLD = 8;
  const PERFECTS_TO_GROW = 5;
  const GROW_AMOUNT = 3;
  const MIN_WIDTH = 15;
  const GRAVITY = 0.8;
  const DROP_GAP = 20;

  const getColor = (index: number) => CAT_COLORS[index % CAT_COLORS.length];

  // Load persisted state on mount
  useEffect(() => {
    const savedBest = localStorage.getItem('cattower_best');
    if (savedBest) setBestScore(parseInt(savedBest, 10));

    const savedPlays = localStorage.getItem('cattower_plays');
    if (savedPlays) setPlayCount(parseInt(savedPlays, 10));

    // Check if user already has a handle from previous sessions
    const savedGuestName = localStorage.getItem('pixelpit_guest_name');
    if (savedGuestName) setHasHandle(true);
  }, []);

  // Auto-submit score when user has a handle (logged in or guest name saved)
  const autoSubmitScore = useCallback(async (finalScore: number) => {
    if (!window.PixelpitSocial || !socialLoaded) return;

    try {
      const nickname = user?.handle || localStorage.getItem('pixelpit_guest_name');
      if (!nickname) return;

      const result = await window.PixelpitSocial.submitScore(GAME_ID, finalScore, { nickname });
      if (result.success) {
        if (result.entry?.id) {
          setEntryId(result.entry.id);
        }
        if (result.progression) {
          setProgression(result.progression);
        }
      }
    } catch (e) {
      console.error('Failed to auto-submit score:', e);
    }
  }, [socialLoaded, user]);

  // Start game
  const startGame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const game = gameRef.current;
    game.baseWidth = 120;
    game.stack = [];
    game.fallingPieces = [];
    game.score = 0;
    game.perfectStreak = 0;
    game.colorIndex = 0;
    game.flashIntensity = 0;
    game.shake = 0;
    game.gameOverPending = false;

    game.landingY = canvas.height * 0.55;
    game.slideY = game.landingY - game.catHeight - DROP_GAP;

    const baseX = (canvas.width - game.baseWidth) / 2;
    const ghostStackCount = Math.ceil((canvas.height - game.landingY) / game.catHeight) + 1;
    game.ghostStack = [];
    for (let i = 0; i < ghostStackCount; i++) {
      game.ghostStack.push({
        x: baseX,
        y: game.landingY + (i * game.catHeight),
        width: game.baseWidth,
        colorIndex: i,
        squash: 1,
      });
    }

    game.currentCat = {
      x: baseX,
      y: game.slideY,
      width: game.baseWidth,
      vy: 0,
      direction: 1,
      speed: 3,
      state: 'sliding',
    };

    game.running = true;
    setScore(0);
    setIsNewBest(false);
    setGameState('playing');

    gameAudio.init();
    gameAudio.startMusic();
  }, []);

  // Drop cat
  const dropCat = useCallback(() => {
    const game = gameRef.current;
    if (!game.running || game.currentCat.state !== 'sliding') return;

    game.currentCat.state = 'dropping';
    game.currentCat.vy = 0;
    gameAudio.playDrop();
  }, []);

  // Handle game over
  const handleGameOver = useCallback((finalScore: number) => {
    const game = gameRef.current;
    game.running = false;

    // Check if user has a handle now (from previous game's ScoreFlow submission)
    const guestName = localStorage.getItem('pixelpit_guest_name');
    if (guestName && !hasHandle) {
      setHasHandle(true);
    }

    // Update play counts (total and session)
    const newPlayCount = playCount + 1;
    setPlayCount(newPlayCount);
    setSessionPlays(prev => prev + 1);
    localStorage.setItem('cattower_plays', newPlayCount.toString());

    // Check for new best
    const isNew = finalScore > bestScore;
    if (isNew) {
      setBestScore(finalScore);
      localStorage.setItem('cattower_best', finalScore.toString());
      setIsNewBest(true);
    }

    gameAudio.playGameOver();
    gameAudio.stopMusic();

    // Track play for analytics (fire-and-forget)
    if (finalScore >= 1) {
      fetch('/api/pixelpit/stats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ game: GAME_ID }),
      }).catch(() => {}); // Silent fail
    }

    // Reset for new game
    setEntryId(null);
    setProgression(null);

    // Auto-submit score if user has a handle
    const savedGuestName = localStorage.getItem('pixelpit_guest_name');
    if (user || savedGuestName) {
      autoSubmitScore(finalScore);
    }

    setTimeout(() => {
      setGameState('gameover');
    }, 600);
  }, [playCount, bestScore, user, hasHandle, autoSubmitScore]);

  // Handle landing
  const handleLanding = useCallback(() => {
    const game = gameRef.current;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const cat = game.currentCat;
    const catHeight = game.catHeight;

    let targetX: number;
    let targetWidth: number;

    if (game.stack.length === 0) {
      const topGhost = game.ghostStack[0];
      targetX = topGhost.x;
      targetWidth = topGhost.width;
    } else {
      const topCat = game.stack[game.stack.length - 1];
      targetX = topCat.x;
      targetWidth = topCat.width;
    }

    const catLeft = cat.x;
    const catRight = cat.x + cat.width;
    const targetLeft = targetX;
    const targetRight = targetX + targetWidth;

    const overlapLeft = Math.max(catLeft, targetLeft);
    const overlapRight = Math.min(catRight, targetRight);
    const overlapWidth = overlapRight - overlapLeft;

    const triggerGameOver = () => {
      game.shake = 15;
      game.gameOverPending = true;
      game.currentCat.state = 'landed';
      setScore(game.score);
      handleGameOver(game.score);
    };

    if (overlapWidth <= 0) {
      game.fallingPieces.push({
        x: cat.x,
        y: game.landingY,
        width: cat.width,
        height: catHeight,
        colorIndex: game.colorIndex,
        vy: cat.vy * 0.5,
        vx: cat.x < targetX ? -4 : 4,
        rotation: 0,
        rotationSpeed: (cat.x < targetX ? -1 : 1) * 0.15,
      });
      triggerGameOver();
      return;
    }

    const offset = Math.abs(cat.x - targetX);
    const isPerfect = offset <= PERFECT_THRESHOLD;

    let newCatX: number;
    let newCatWidth: number;

    if (isPerfect) {
      game.perfectStreak++;
      game.flashIntensity = Math.min(1, 0.3 + game.perfectStreak * 0.15);

      newCatWidth = targetWidth;
      if (game.perfectStreak >= PERFECTS_TO_GROW) {
        newCatWidth = Math.min(game.baseWidth, targetWidth + GROW_AMOUNT);
        if (newCatWidth > targetWidth) {
          gameAudio.playGrow();
        }
      }
      newCatX = targetX - (newCatWidth - targetWidth) / 2;

      gameAudio.playPerfect(game.perfectStreak);
      gameAudio.playLand();
    } else {
      game.perfectStreak = 0;
      game.flashIntensity = 0;
      gameAudio.playLand();
      gameAudio.playSlice();

      if (catLeft < targetLeft) {
        const pieceWidth = targetLeft - catLeft;
        game.fallingPieces.push({
          x: catLeft,
          y: game.landingY,
          width: pieceWidth,
          height: catHeight,
          colorIndex: game.colorIndex,
          vy: -2 - Math.random() * 2,
          vx: -3 - Math.random() * 2,
          rotation: 0,
          rotationSpeed: -0.1 - Math.random() * 0.1,
        });
      }
      if (catRight > targetRight) {
        const pieceWidth = catRight - targetRight;
        game.fallingPieces.push({
          x: targetRight,
          y: game.landingY,
          width: pieceWidth,
          height: catHeight,
          colorIndex: game.colorIndex,
          vy: -2 - Math.random() * 2,
          vx: 3 + Math.random() * 2,
          rotation: 0,
          rotationSpeed: 0.1 + Math.random() * 0.1,
        });
      }

      game.shake = 4;

      if (overlapWidth < MIN_WIDTH) {
        triggerGameOver();
        return;
      }

      newCatX = overlapLeft;
      newCatWidth = overlapWidth;
    }

    game.stack.forEach(stackedCat => {
      stackedCat.y += catHeight;
    });
    game.ghostStack.forEach(ghostCat => {
      ghostCat.y += catHeight;
    });
    game.fallingPieces.forEach(piece => {
      piece.y += catHeight;
    });

    game.stack.push({
      x: newCatX,
      y: game.landingY,
      width: newCatWidth,
      colorIndex: game.colorIndex,
      squash: 0.7,
    });

    game.currentCat.width = newCatWidth;

    game.score++;
    setScore(game.score);
    game.colorIndex++;

    if (game.score % 15 === 0 && game.currentCat.speed < 7) {
      game.currentCat.speed += 0.5;
    }

    const startFromLeft = game.score % 2 === 0;

    const centerX = canvas.width / 2;
    const travelRange = game.baseWidth * 1.2;
    const leftBound = centerX - travelRange;
    const rightBound = centerX + travelRange - game.currentCat.width;

    game.currentCat.x = startFromLeft ? leftBound : rightBound;
    game.currentCat.y = game.slideY;
    game.currentCat.vy = 0;
    game.currentCat.direction = startFromLeft ? 1 : -1;
    game.currentCat.state = 'sliding';
  }, [handleGameOver]);

  // Game loop effect
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = Math.min(window.innerWidth, 420);
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    let animationId: number;

    const update = () => {
      const game = gameRef.current;
      if (!game.running || game.gameOverPending) return;

      const cat = game.currentCat;

      if (cat.state === 'sliding') {
        cat.x += cat.speed * cat.direction;

        const centerX = canvas.width / 2;
        const travelRange = game.baseWidth * 1.2;
        const leftBound = centerX - travelRange;
        const rightBound = centerX + travelRange - cat.width;

        if (cat.x <= leftBound) {
          cat.direction = 1;
        } else if (cat.x >= rightBound) {
          cat.direction = -1;
        }
      } else if (cat.state === 'dropping') {
        cat.vy += GRAVITY;
        cat.y += cat.vy;

        const landingY = game.landingY;

        if (cat.y >= landingY) {
          cat.y = landingY;
          cat.state = 'landed';
          handleLanding();
        }
      }
    };

    const updateEffects = () => {
      const game = gameRef.current;

      game.fallingPieces = game.fallingPieces.filter(piece => {
        piece.vy += GRAVITY;
        piece.y += piece.vy;
        piece.x += piece.vx;
        piece.vx *= 0.99;
        piece.rotation += piece.rotationSpeed;
        return piece.y < canvas.height + 300;
      });

      game.stack.forEach(cat => {
        if (cat.squash < 1) {
          cat.squash += (1 - cat.squash) * 0.2;
          if (cat.squash > 0.99) cat.squash = 1;
        }
      });

      game.flashIntensity *= 0.92;
      game.shake *= 0.88;
    };

    const drawCat = (
      x: number,
      y: number,
      width: number,
      height: number,
      colorIndex: number,
      rotation = 0,
      squash = 1,
      drawFace = true
    ) => {
      if (width < 3) return;
      const color = getColor(colorIndex);

      ctx.save();
      ctx.translate(x + width / 2, y + height);
      ctx.rotate(rotation);
      ctx.scale(1 + (1 - squash) * 0.3, squash);

      const drawHeight = height;

      if (squash === 1 && rotation === 0) {
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.beginPath();
        ctx.ellipse(0, 2, width / 2 - 2, 4, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.fillStyle = color.body;
      ctx.beginPath();
      ctx.roundRect(-width / 2, -drawHeight, width, drawHeight, Math.min(10, width / 5));
      ctx.fill();

      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      ctx.beginPath();
      ctx.roundRect(-width / 2 + 3, -drawHeight + 3, width - 6, drawHeight / 3, 5);
      ctx.fill();

      if (width > 20) {
        ctx.fillStyle = color.stripe;
        const stripeCount = Math.max(1, Math.floor(width / 30));
        for (let i = 0; i < stripeCount; i++) {
          const sx = -width / 2 + (i + 1) * (width / (stripeCount + 1));
          ctx.beginPath();
          ctx.ellipse(sx, -drawHeight / 2, 2, drawHeight / 3, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      if (drawFace && width > 40) {
        const earSize = Math.min(8, width / 10);
        ctx.fillStyle = color.body;
        ctx.beginPath();
        ctx.moveTo(-width / 2 + 4, -drawHeight);
        ctx.lineTo(-width / 2 + 4 + earSize / 2, -drawHeight - earSize);
        ctx.lineTo(-width / 2 + 4 + earSize, -drawHeight);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(width / 2 - 4 - earSize, -drawHeight);
        ctx.lineTo(width / 2 - 4 - earSize / 2, -drawHeight - earSize);
        ctx.lineTo(width / 2 - 4, -drawHeight);
        ctx.fill();

        ctx.fillStyle = '#FFB6C1';
        const ie = earSize * 0.5;
        ctx.beginPath();
        ctx.moveTo(-width / 2 + 6, -drawHeight);
        ctx.lineTo(-width / 2 + 4 + earSize / 2, -drawHeight - ie);
        ctx.lineTo(-width / 2 + 4 + earSize - 2, -drawHeight);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(width / 2 - 4 - earSize + 2, -drawHeight);
        ctx.lineTo(width / 2 - 4 - earSize / 2, -drawHeight - ie);
        ctx.lineTo(width / 2 - 6, -drawHeight);
        ctx.fill();

        ctx.fillStyle = '#333';
        const fontSize = Math.min(11, width / 8);
        ctx.font = `${fontSize}px monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const face = CAT_FACES[colorIndex % CAT_FACES.length];
        ctx.fillText(face, 0, -drawHeight / 2 + 2);
      }

      ctx.restore();
    };

    const draw = () => {
      const game = gameRef.current;
      const catHeight = game.catHeight;

      ctx.save();

      if (game.shake > 0.5) {
        ctx.translate(
          (Math.random() - 0.5) * game.shake * 2,
          (Math.random() - 0.5) * game.shake * 2
        );
      }

      const bgHue = (game.colorIndex * 12) % 360;
      const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
      grad.addColorStop(0, `hsl(${bgHue}, 25%, 15%)`);
      grad.addColorStop(1, `hsl(${(bgHue + 30) % 360}, 20%, 10%)`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      if (game.flashIntensity > 0.05) {
        ctx.fillStyle = `rgba(255, 255, 255, ${game.flashIntensity * 0.5})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      ctx.globalAlpha = 0.25;
      game.ghostStack.forEach((cat) => {
        if (cat.y < canvas.height + catHeight && cat.y > -catHeight) {
          drawCat(cat.x, cat.y, cat.width, catHeight, cat.colorIndex, 0, 1, true);
        }
      });
      ctx.globalAlpha = 1;

      game.stack.forEach((cat) => {
        if (cat.y < canvas.height + catHeight && cat.y > -catHeight) {
          drawCat(cat.x, cat.y, cat.width, catHeight, cat.colorIndex, 0, cat.squash, true);
        }
      });

      game.fallingPieces.forEach(piece => {
        drawCat(piece.x, piece.y, piece.width, piece.height, piece.colorIndex, piece.rotation, 1, false);
      });

      if (game.running && !game.gameOverPending) {
        const cat = game.currentCat;
        if (cat.state === 'sliding' || cat.state === 'dropping') {
          if (cat.state === 'dropping') {
            const landingY = game.landingY;
            const shadowScale = Math.max(0.3, 1 - (landingY - cat.y) / 200);
            ctx.fillStyle = `rgba(0,0,0,${0.15 * shadowScale})`;
            ctx.beginPath();
            ctx.ellipse(
              cat.x + cat.width / 2,
              landingY + catHeight,
              (cat.width / 2) * shadowScale,
              4 * shadowScale,
              0, 0, Math.PI * 2
            );
            ctx.fill();
          }

          drawCat(cat.x, cat.y, cat.width, catHeight, game.colorIndex, 0, 1, true);
        }
      }

      if (game.perfectStreak > 0 && game.running && !game.gameOverPending) {
        const streakY = 95;

        if (game.perfectStreak >= PERFECTS_TO_GROW) {
          ctx.fillStyle = '#FFD700';
          ctx.font = 'bold 18px monospace';
          ctx.textAlign = 'center';
          ctx.fillText(`PERFECT x${game.perfectStreak}`, canvas.width / 2, streakY);
          ctx.fillStyle = '#4ade80';
          ctx.font = 'bold 14px monospace';
          ctx.fillText('+GROWING!', canvas.width / 2, streakY + 20);
        } else {
          ctx.font = 'bold 14px monospace';
          ctx.textAlign = 'center';
          for (let i = 0; i < PERFECTS_TO_GROW; i++) {
            const dotX = canvas.width / 2 - (PERFECTS_TO_GROW - 1) * 10 + i * 20;
            ctx.fillStyle = i < game.perfectStreak ? '#FFD700' : '#444';
            ctx.beginPath();
            ctx.arc(dotX, streakY, 5, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.fillStyle = '#888';
          ctx.fillText('PERFECT', canvas.width / 2, streakY + 20);
        }
      }

      ctx.restore();
    };

    const gameLoop = () => {
      update();
      updateEffects();
      draw();
      animationId = requestAnimationFrame(gameLoop);
    };

    gameLoop();

    const handleInput = (e?: Event) => {
      e?.preventDefault();
      if (gameRef.current.running && !gameRef.current.gameOverPending) {
        dropCat();
      }
    };

    canvas.addEventListener('touchstart', handleInput, { passive: false });
    canvas.addEventListener('mousedown', handleInput);
    const handleKey = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        handleInput();
      }
    };
    document.addEventListener('keydown', handleKey);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('touchstart', handleInput);
      canvas.removeEventListener('mousedown', handleInput);
      document.removeEventListener('keydown', handleKey);
      gameAudio.stopMusic();
    };
  }, [dropCat, handleLanding]);

  // Get share URL
  const shareUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/pixelpit/arcade/cattower/share/${score}`
    : '';

  return (
    <>
      {/* PixelpitSocial Script */}
      <Script
        src="/pixelpit/social.js"
        onLoad={() => setSocialLoaded(true)}
      />

      <style jsx global>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          background: ${COLORS.bg};
          overflow: hidden;
          touch-action: none;
          user-select: none;
          display: flex;
          justify-content: center;
        }
      `}</style>

      <canvas ref={canvasRef} style={{ display: 'block', maxWidth: 420 }} />

      {/* Sound Toggle */}
      <button
        onClick={() => {
          const newEnabled = !soundEnabled;
          setSoundEnabled(newEnabled);
          gameAudio.setEnabled(newEnabled);
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
          fontFamily: 'monospace',
          fontSize: 16,
          cursor: 'pointer',
          opacity: soundEnabled ? 0.8 : 0.4,
        }}
      >
        {soundEnabled ? '♪' : '♪̶'}
      </button>

      {/* Score Display */}
      {gameState === 'playing' && (
        <div style={{
          position: 'fixed',
          top: 25,
          left: 0,
          right: 0,
          textAlign: 'center',
          fontFamily: 'monospace',
          pointerEvents: 'none',
        }}>
          <div style={{
            fontSize: 56,
            fontWeight: 'bold',
            color: '#fff',
            textShadow: '0 4px 20px rgba(0,0,0,0.5)',
          }}>
            {score}
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
          background: `linear-gradient(180deg, ${COLORS.bg} 0%, ${COLORS.surface} 100%)`,
          textAlign: 'center',
          fontFamily: 'monospace',
          color: '#fff',
          padding: 30,
        }}>
          <div style={{ fontSize: 80, marginBottom: 15 }}>🐱</div>
          <h1 style={{
            fontSize: 42,
            color: COLORS.primary,
            marginBottom: 25,
            textShadow: `0 0 40px ${COLORS.primary}66`,
            letterSpacing: 4,
          }}>
            CAT TOWER
          </h1>
          <p style={{
            color: COLORS.muted,
            marginBottom: 35,
            fontSize: 16,
            lineHeight: 2,
          }}>
            tap to drop<br />
            align perfectly<br />
            <span style={{ color: '#FFD700' }}>5 perfects = grow back!</span>
          </p>
          <button
            onClick={startGame}
            style={{
              background: `linear-gradient(180deg, ${COLORS.primary} 0%, #E8941A 100%)`,
              color: COLORS.bg,
              border: 'none',
              padding: '22px 70px',
              fontSize: 24,
              fontFamily: 'monospace',
              fontWeight: 'bold',
              borderRadius: 14,
              cursor: 'pointer',
              boxShadow: `0 10px 40px ${COLORS.primary}66`,
            }}
          >
            PLAY
          </button>
          {bestScore > 0 && (
            <div style={{ marginTop: 30, fontSize: 14, color: COLORS.muted }}>
              BEST: {bestScore}
            </div>
          )}
          <div style={{
            marginTop: 60,
            fontSize: 12,
            letterSpacing: 4,
            color: '#444',
          }}>
            <span style={{ color: COLORS.primary }}>pixel</span>
            <span style={{ color: COLORS.secondary }}>pit</span>
          </div>
        </div>
      )}

      {/* Game Over */}
      {gameState === 'gameover' && (
        <div style={{
          position: 'fixed',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(20,20,40,0.97)',
          textAlign: 'center',
          fontFamily: 'monospace',
          color: '#fff',
          padding: 30,
          overflowY: 'auto',
        }}>
          <div style={{ fontSize: 48, marginBottom: 15 }}>
            {isNewBest ? '🎉' : '😿'}
          </div>
          <div style={{
            fontSize: 72,
            fontWeight: 'bold',
            color: COLORS.primary,
            marginBottom: 8,
            textShadow: `0 0 30px ${COLORS.primary}4d`,
          }}>
            {score}
          </div>
          <div style={{
            fontSize: 14,
            color: isNewBest ? '#FFD700' : COLORS.muted,
            marginBottom: 20,
          }}>
            {isNewBest ? 'NEW BEST!' : `BEST: ${bestScore}`}
          </div>

          {/* ScoreFlow for nickname entry - ONLY shown once until user submits */}
          {shouldShowScoreFlow && (
            <ScoreFlow
              score={score}
              gameId={GAME_ID}
              colors={SCORE_FLOW_COLORS}
              xpDivisor={1}
              onRankReceived={(rank, newEntryId) => {
                setEntryId(newEntryId ?? null);
              }}
              onProgression={(prog) => {
                setProgression(prog);
              }}
            />
          )}

          {/* Progression Display */}
          {progression && (
            <ProgressionDisplay progression={progression} />
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center', marginTop: 10 }}>
            <button
              onClick={startGame}
              style={{
                background: `linear-gradient(180deg, ${COLORS.primary} 0%, #E8941A 100%)`,
                color: COLORS.bg,
                border: 'none',
                padding: '16px 50px',
                fontSize: 18,
                fontFamily: 'monospace',
                fontWeight: 'bold',
                borderRadius: 10,
                cursor: 'pointer',
                boxShadow: `0 8px 30px ${COLORS.primary}50`,
                letterSpacing: 2,
              }}
            >
              TRY AGAIN
            </button>

            {/* Leaderboard & Share - always show once user has a handle */}
            {shouldShowLeaderboardShare && (
              <>
                <button
                  onClick={() => setGameState('leaderboard')}
                  style={{
                    background: 'transparent',
                    border: `1px solid ${COLORS.secondary}40`,
                    borderRadius: 8,
                    color: COLORS.muted,
                    padding: '12px 35px',
                    fontSize: 12,
                    fontFamily: 'monospace',
                    cursor: 'pointer',
                    letterSpacing: 2,
                  }}
                >
                  leaderboard
                </button>
                {socialLoaded && (
                  <ShareButtonContainer
                    id="cat-tower-share"
                    url={shareUrl}
                    text={`I scored ${score} on CAT TOWER! Can you beat me? 🐱`}
                    style="minimal"
                    socialLoaded={socialLoaded}
                  />
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Leaderboard Screen */}
      {gameState === 'leaderboard' && (
        <Leaderboard
          gameId={GAME_ID}
          limit={10}
          entryId={entryId ?? undefined}
          colors={LEADERBOARD_COLORS}
          onClose={() => setGameState('gameover')}
        />
      )}
    </>
  );
}
