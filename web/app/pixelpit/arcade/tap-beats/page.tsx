'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import Script from 'next/script';
import {
  ScoreFlow,
  Leaderboard,
  ShareModal,
  usePixelpitSocial,
  type ScoreFlowColors,
  type LeaderboardColors,
  type ProgressionResult,
} from '@/app/pixelpit/components';

// TAP BEATS THEME - DDR-inspired neon arcade
const THEME = {
  void: '#09090b',
  lane0: '#22d3ee',  // cyan - left
  lane1: '#ec4899',  // pink - center
  lane2: '#facc15',  // gold - right
  perfect: '#a3e635', // slime green
  good: '#22d3ee',    // cyan
  miss: '#ef4444',    // red
  text: '#f8fafc',
  surface: '#1e293b',
  muted: '#94a3b8',   // muted gray
};

const LANE_COLORS = [THEME.lane0, THEME.lane1, THEME.lane2];

// UI colors for social components
const SCORE_FLOW_COLORS: ScoreFlowColors = {
  bg: '#09090b',
  surface: '#1e293b',
  primary: '#ec4899',
  secondary: '#22d3ee',
  text: '#f8fafc',
  muted: '#94a3b8',
  error: '#ef4444',
};

const LEADERBOARD_COLORS: LeaderboardColors = {
  bg: '#09090b',
  surface: '#1e293b',
  primary: '#ec4899',
  secondary: '#22d3ee',
  text: '#f8fafc',
  muted: '#94a3b8',
};

// Song definitions
const SONGS = [
  {
    id: 'robot-rave-lite',
    name: 'ROBOT RAVE LITE',
    artist: 'PixelPit',
    bpm: 150,
    duration: 56000,
    difficulty: 'MEDIUM',
    locked: false,
    description: 'Part 1 - Learn the moves',
  },
  {
    id: 'ddr-rave',
    name: 'DDR RAVE',
    artist: 'PixelPit',
    bpm: 170,
    duration: 60000,
    difficulty: 'HARD',
    locked: true,
    description: 'Part 2 - Faster tempo, 8th note runs',
  },
];

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
      background: 'rgba(30, 41, 59, 0.95)',
      borderRadius: 16,
      padding: '16px 24px',
      marginBottom: 16,
      boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
      textAlign: 'center',
      minWidth: 200,
      border: '1px solid rgba(236, 72, 153, 0.3)',
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
          color: THEME.lane1,
        }}>
          +{animatedXp} XP
        </span>
        {progression.streak > 1 && (
          <span style={{
            background: THEME.lane0,
            color: '#000',
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
        background: 'rgba(0,0,0,0.3)',
        borderRadius: 8,
        height: 10,
        overflow: 'hidden',
        marginBottom: 8,
        position: 'relative',
      }}>
        <div style={{
          background: `linear-gradient(90deg, ${THEME.lane1}, ${THEME.lane0})`,
          height: '100%',
          width: `${progressPercent}%`,
          borderRadius: 8,
          transition: 'width 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
          boxShadow: barPulse ? `0 0 12px ${THEME.lane1}` : 'none',
        }} />
      </div>

      <div style={{
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: 12,
        color: THEME.muted,
      }}>
        Level {progression.level} · {Math.floor(animatedProgress)}/{progression.levelNeeded} XP
      </div>

      {showLevelUp && (
        <div style={{
          marginTop: 10,
          padding: '8px 16px',
          background: `linear-gradient(135deg, ${THEME.lane1}, ${THEME.lane0})`,
          borderRadius: 12,
          fontFamily: 'system-ui, -apple-system, sans-serif',
          fontSize: 14,
          fontWeight: 700,
          color: '#fff',
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
          color: THEME.lane2,
        }}>
          {progression.streak} day streak
        </div>
      )}
    </div>
  );
}

// Grade calculation
function calculateGrade(perfects: number, goods: number, misses: number): string {
  const total = perfects + goods + misses;
  if (total === 0) return 'F';
  const accuracy = (perfects * 100 + goods * 50) / (total * 100);
  if (accuracy >= 0.95 && misses === 0) return 'S';
  if (accuracy >= 0.9) return 'A';
  if (accuracy >= 0.8) return 'B';
  if (accuracy >= 0.7) return 'C';
  if (accuracy >= 0.5) return 'D';
  return 'F';
}

// ═══════════════════════════════════════════════════════════════
// MUSIC CONSTANTS
// ═══════════════════════════════════════════════════════════════

// Note frequencies
const NOTE = {
  A2: 110, E2: 82.41, F2: 87.31, G2: 98, D2: 73.42,
  A1: 55, D1: 36.71,
  G4: 392, A4: 440, B4: 493.88, C5: 523.25, D5: 587.33, E5: 659.25,
  A3: 220, C4: 261.63, E4: 329.63, D4: 293.66,
};

// Song 1 structure
const SONG1 = {
  intro: { start: 0, end: 3.2 },
  verse1: { start: 3.2, end: 9.6 },
  build1: { start: 9.6, end: 12.8 },
  drop1: { start: 12.8, end: 22.4 },
  verse2: { start: 22.4, end: 28.8 },
  build2: { start: 28.8, end: 32 },
  drop2: { start: 32, end: 48 },
  outro: { start: 48, end: 56 },
};

// Song 1 melody (Robot Rave)
const MELODY1 = [
  { note: NOTE.A4, beat: 0 },
  { note: NOTE.C5, beat: 0.5 },
  { note: NOTE.A4, beat: 1 },
  { note: NOTE.E5, beat: 1.5 },
  { note: NOTE.D5, beat: 2 },
  { note: NOTE.C5, beat: 2.5 },
  { note: NOTE.A4, beat: 3 },
  { note: NOTE.G4, beat: 3.5 },
];

const BASS1 = [
  { note: NOTE.A1, bar: 0 },
  { note: NOTE.A1, bar: 1 },
  { note: NOTE.D2, bar: 2 },
  { note: NOTE.A1, bar: 3 },
];

// Song 2 constants (DDR Rave)
const DDR_MELODY = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33, 659.25];
const DDR_MELODY_PATTERN = [0, 2, 4, 2, 5, 4, 2, 0, 3, 5, 7, 5, 4, 2, 0, 2];
const DDR_CHORDS = [
  [261.63, 329.63, 392.00],
  [293.66, 369.99, 440.00],
  [349.23, 440.00, 523.25],
  [392.00, 493.88, 587.33],
];
const DDR_BASS = [130.81, 130.81, 146.83, 164.81];

export default function TapBeatsGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<'songSelect' | 'countdown' | 'playing' | 'gameover' | 'scoreflow' | 'leaderboard' | 'payoff'>('songSelect');
  const [score, setScore] = useState(0);
  const [selectedSong, setSelectedSong] = useState(0);
  const [socialLoaded, setSocialLoaded] = useState(false);
  const [submittedEntryId, setSubmittedEntryId] = useState<number | null>(null);
  const [progression, setProgression] = useState<ProgressionResult | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [unlockedSong2, setUnlockedSong2] = useState(false);
  const [paused, setPaused] = useState(false);
  const [unlockedPayoff, setUnlockedPayoff] = useState(false);
  const [payoffFromGame, setPayoffFromGame] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  // Game stats for display
  const [finalStats, setFinalStats] = useState({ perfects: 0, goods: 0, misses: 0, maxCombo: 0, grade: 'F' });

  const { user } = usePixelpitSocial(socialLoaded);

  const GAME_ID = 'tap-beats';
  const GAME_URL = typeof window !== 'undefined'
    ? `${window.location.origin}/pixelpit/arcade/tap-beats`
    : 'https://pixelpit.gg/pixelpit/arcade/tap-beats';

  // Check for unlocked content and device type on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const unlocked = localStorage.getItem('tap-beats-song2-unlocked') === 'true';
      setUnlockedSong2(unlocked);
      const payoffUnlocked = localStorage.getItem('tap-beats-payoff-unlocked') === 'true';
      setUnlockedPayoff(payoffUnlocked);
      // Check if desktop (no touch support)
      setIsDesktop(!('ontouchstart' in window));
    }
  }, []);

  // Game state ref for animation loop
  const gameRef = useRef({
    running: false,
    w: 0,
    h: 0,
    songTime: 0,
    startTime: 0,
    score: 0,
    combo: 0,
    maxCombo: 0,
    perfects: 0,
    goods: 0,
    misses: 0,
    currentBeatmap: [] as { time: number; lane: number }[],
    notes: [] as { time: number; lane: number; hit: boolean; missed: boolean }[],
    nextNoteIndex: 0,
    hitEffects: [] as { x: number; y: number; color: string; alpha: number; scale: number; text: string }[],
    screenFlash: 0,
    lanePulse: [0, 0, 0],
    countdownValue: 3,
    audioCtx: null as AudioContext | null,
    masterGain: null as GainNode | null,
    selectedSong: 0,
    musicStartTime: 0,
    musicNodes: [] as AudioNode[],
    musicInterval: null as NodeJS.Timeout | null,
    beat: 0,
    melodyPhase: 0,
    lastBeatTime: 0,
    song2Beat: 0,
    song2MelodyPhase: 0,
  });

  // Audio initialization
  const initAudio = useCallback(() => {
    const game = gameRef.current;
    if (game.audioCtx) return;
    game.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    game.masterGain = game.audioCtx.createGain();
    game.masterGain.gain.value = 0.5;
    game.masterGain.connect(game.audioCtx.destination);
    if (game.audioCtx.state === 'suspended') {
      game.audioCtx.resume();
    }
  }, []);

  // Play note helper
  const playNote = useCallback((freq: number, duration: number, type: OscillatorType = 'sine', volume = 0.3) => {
    const game = gameRef.current;
    if (!game.audioCtx || !game.masterGain) return;
    const osc = game.audioCtx.createOscillator();
    const gain = game.audioCtx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(volume, game.audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, game.audioCtx.currentTime + duration);
    osc.connect(gain);
    gain.connect(game.masterGain);
    osc.start();
    osc.stop(game.audioCtx.currentTime + duration);
  }, []);

  // ═══════════════════════════════════════════════════════════════
  // SONG 1 MUSIC (Robot Rave @ 150 BPM) - Pre-scheduled
  // ═══════════════════════════════════════════════════════════════

  const inSection = useCallback((timeSec: number, section: { start: number; end: number }) => {
    return timeSec >= section.start && timeSec < section.end;
  }, []);

  const isDrumSection = useCallback((timeSec: number) => {
    return !inSection(timeSec, SONG1.build1) && !inSection(timeSec, SONG1.build2);
  }, [inSection]);

  const isDropSection = useCallback((timeSec: number) => {
    return inSection(timeSec, SONG1.drop1) || inSection(timeSec, SONG1.drop2);
  }, [inSection]);

  const startMusicSong1 = useCallback(() => {
    const game = gameRef.current;
    if (!game.audioCtx || !game.masterGain) return;

    const audioCtx = game.audioCtx;
    const masterGain = game.masterGain;
    game.musicStartTime = audioCtx.currentTime;
    const startTime = game.musicStartTime;

    const beatSec = 60 / 150;
    const barSec = beatSec * 4;

    // Schedule kicks
    for (let t = 0; t < 60; t += beatSec) {
      if (isDrumSection(t)) {
        const time = startTime + t;
        const volume = isDropSection(t) ? 0.5 : 0.35;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(150, time);
        osc.frequency.exponentialRampToValueAtTime(35, time + 0.12);
        gain.gain.setValueAtTime(volume, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.25);
        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(time);
        osc.stop(time + 0.25);
      }
    }

    // Schedule hi-hats
    for (let t = 0; t < 60; t += beatSec / 2) {
      if (isDrumSection(t) && t >= SONG1.verse1.start) {
        const isOffbeat = Math.round(t / beatSec * 2) % 2 === 1;
        const time = startTime + t;
        const volume = isOffbeat ? 0.08 : 0.12;
        const bufferSize = audioCtx.sampleRate * 0.04;
        const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
        const noise = audioCtx.createBufferSource();
        noise.buffer = buffer;
        const filter = audioCtx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 9000;
        const gainNode = audioCtx.createGain();
        gainNode.gain.setValueAtTime(volume, time);
        gainNode.gain.exponentialRampToValueAtTime(0.001, time + 0.04);
        noise.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(masterGain);
        noise.start(time);
        noise.stop(time + 0.04);
      }
    }

    // Schedule claps on 2 and 4
    for (let t = 0; t < 60; t += beatSec) {
      const beatInBar = Math.round(t / beatSec) % 4;
      if ((beatInBar === 1 || beatInBar === 3) && isDrumSection(t) && t >= SONG1.verse1.start) {
        const time = startTime + t;
        const volume = isDropSection(t) ? 0.4 : 0.3;
        for (let layer = 0; layer < 3; layer++) {
          const bufferSize = audioCtx.sampleRate * 0.08;
          const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
          const data = buffer.getChannelData(0);
          for (let j = 0; j < bufferSize; j++) data[j] = Math.random() * 2 - 1;
          const noise = audioCtx.createBufferSource();
          noise.buffer = buffer;
          const filter = audioCtx.createBiquadFilter();
          filter.type = 'bandpass';
          filter.frequency.value = 1500 + layer * 500;
          filter.Q.value = 2;
          const gainNode = audioCtx.createGain();
          const offset = layer * 0.01;
          gainNode.gain.setValueAtTime(volume * 0.4, time + offset);
          gainNode.gain.exponentialRampToValueAtTime(0.001, time + offset + 0.1);
          noise.connect(filter);
          filter.connect(gainNode);
          gainNode.connect(masterGain);
          noise.start(time + offset);
          noise.stop(time + offset + 0.1);
        }
      }
    }

    // Schedule bass
    for (let t = SONG1.verse1.start; t < 60; t += barSec) {
      if (t >= SONG1.build1.start && t < SONG1.drop1.start) continue;
      if (t >= SONG1.build2.start && t < SONG1.drop2.start) continue;
      const barIndex = Math.floor((t - SONG1.verse1.start) / barSec) % 4;
      const bassNote = BASS1[barIndex].note;
      const volume = isDropSection(t) ? 0.3 : 0.2;
      for (const offset of [0, beatSec * 2]) {
        const time = startTime + t + offset;
        const osc = audioCtx.createOscillator();
        const osc2 = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.value = bassNote;
        osc2.type = 'sine';
        osc2.frequency.value = bassNote * 2;
        const subGain = audioCtx.createGain();
        const harmGain = audioCtx.createGain();
        subGain.gain.value = 1;
        harmGain.gain.value = 0.3;
        gainNode.gain.setValueAtTime(0, time);
        gainNode.gain.linearRampToValueAtTime(volume, time + 0.02);
        gainNode.gain.exponentialRampToValueAtTime(volume * 0.6, time + 0.1);
        gainNode.gain.exponentialRampToValueAtTime(0.001, time + beatSec * 1.5);
        osc.connect(subGain);
        osc2.connect(harmGain);
        subGain.connect(gainNode);
        harmGain.connect(gainNode);
        gainNode.connect(masterGain);
        osc.start(time);
        osc2.start(time);
        osc.stop(time + beatSec * 1.5);
        osc2.stop(time + beatSec * 1.5);
      }
    }

    // Schedule rave synth melody during drops
    for (const section of [SONG1.drop1, SONG1.drop2]) {
      for (let t = section.start; t < section.end; t += beatSec / 2) {
        const beatInRiff = ((t - section.start) / (beatSec / 2)) % 8;
        const melodyNote = MELODY1.find(m => Math.abs(m.beat - beatInRiff) < 0.1);
        if (melodyNote && melodyNote.note) {
          const time = startTime + t;
          const osc1 = audioCtx.createOscillator();
          const osc2 = audioCtx.createOscillator();
          const gainNode = audioCtx.createGain();
          osc1.type = 'sawtooth';
          osc1.frequency.value = melodyNote.note;
          osc2.type = 'sawtooth';
          osc2.frequency.value = melodyNote.note * 1.01;
          const filter = audioCtx.createBiquadFilter();
          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(3000, time);
          filter.frequency.exponentialRampToValueAtTime(800, time + beatSec * 0.4);
          filter.Q.value = 5;
          gainNode.gain.setValueAtTime(0.2, time);
          gainNode.gain.exponentialRampToValueAtTime(0.001, time + beatSec * 0.4);
          osc1.connect(filter);
          osc2.connect(filter);
          filter.connect(gainNode);
          gainNode.connect(masterGain);
          osc1.start(time);
          osc2.start(time);
          osc1.stop(time + beatSec * 0.4);
          osc2.stop(time + beatSec * 0.4);
        }
      }
    }

    // Schedule arpeggios
    const arpNotes = [NOTE.A3, NOTE.C4, NOTE.E4, NOTE.A4, NOTE.E4, NOTE.C4];
    for (const section of [SONG1.drop1, SONG1.drop2]) {
      let noteIndex = 0;
      for (let t = section.start; t < section.end; t += beatSec / 4) {
        const freq = arpNotes[noteIndex % arpNotes.length];
        const time = startTime + t;
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        osc.type = 'square';
        osc.frequency.value = freq;
        const filter = audioCtx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 2000;
        gainNode.gain.setValueAtTime(0.1, time);
        gainNode.gain.exponentialRampToValueAtTime(0.001, time + beatSec / 4 * 0.8);
        osc.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(masterGain);
        osc.start(time);
        osc.stop(time + beatSec / 4);
        noteIndex++;
      }
    }

    // Schedule risers during builds
    for (const build of [SONG1.build1, SONG1.build2]) {
      const duration = build.end - build.start;
      const time = startTime + build.start;
      const osc = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(200, time);
      osc.frequency.exponentialRampToValueAtTime(800, time + duration);
      const filter = audioCtx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(500, time);
      filter.frequency.exponentialRampToValueAtTime(4000, time + duration);
      gainNode.gain.setValueAtTime(0.05, time);
      gainNode.gain.linearRampToValueAtTime(0.2, time + duration - 0.1);
      gainNode.gain.exponentialRampToValueAtTime(0.001, time + duration);
      osc.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(masterGain);
      osc.start(time);
      osc.stop(time + duration);
    }
  }, [isDrumSection, isDropSection]);

  // ═══════════════════════════════════════════════════════════════
  // SONG 2 MUSIC (DDR Rave @ 170 BPM) - Interval-based
  // ═══════════════════════════════════════════════════════════════

  const startMusicSong2 = useCallback(() => {
    const game = gameRef.current;
    if (!game.audioCtx || !game.masterGain) return;

    // IMPORTANT: Clear any existing interval first to prevent multiple intervals
    if (game.musicInterval) {
      clearInterval(game.musicInterval);
      game.musicInterval = null;
    }

    const audioCtx = game.audioCtx;
    const masterGain = game.masterGain;
    game.musicStartTime = audioCtx.currentTime;
    game.song2Beat = 0;
    game.song2MelodyPhase = 0;

    const beatMs = 60000 / 170;

    game.musicInterval = setInterval(() => {
      if (!game.running || !audioCtx || !masterGain) return;
      game.song2Beat++;

      // Kick on 1 and 3
      if (game.song2Beat % 4 === 0 || game.song2Beat % 4 === 2) {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(180, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(35, audioCtx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.7, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
        osc.connect(gain);
        gain.connect(masterGain);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.15);
      }

      // Snare on 2 and 4
      if (game.song2Beat % 4 === 1 || game.song2Beat % 4 === 3) {
        const bufferSize = audioCtx.sampleRate * 0.1;
        const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.15));
        }
        const source = audioCtx.createBufferSource();
        const gain = audioCtx.createGain();
        const filter = audioCtx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 3000;
        source.buffer = buffer;
        gain.gain.value = 0.35;
        source.connect(filter);
        filter.connect(gain);
        gain.connect(masterGain);
        source.start();
        // Snare tone
        const osc = audioCtx.createOscillator();
        const oscGain = audioCtx.createGain();
        osc.type = 'triangle';
        osc.frequency.value = 200;
        oscGain.gain.setValueAtTime(0.25, audioCtx.currentTime);
        oscGain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.08);
        osc.connect(oscGain);
        oscGain.connect(masterGain);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.08);
      }

      // Hi-hat on every beat + offbeat
      const playHihat = () => {
        const bufferSize = audioCtx.sampleRate * 0.03;
        const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.08));
        }
        const source = audioCtx.createBufferSource();
        const gain = audioCtx.createGain();
        const filter = audioCtx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 8000;
        source.buffer = buffer;
        gain.gain.value = 0.1;
        source.connect(filter);
        filter.connect(gain);
        gain.connect(masterGain);
        source.start();
      };
      playHihat();
      setTimeout(playHihat, beatMs / 2);

      // Bass
      const bassNote = DDR_BASS[game.song2Beat % 4];
      const bassOsc = audioCtx.createOscillator();
      const bassGain = audioCtx.createGain();
      const bassFilter = audioCtx.createBiquadFilter();
      bassOsc.type = 'sawtooth';
      bassOsc.frequency.value = bassNote;
      bassFilter.type = 'lowpass';
      bassFilter.frequency.setValueAtTime(800, audioCtx.currentTime);
      bassFilter.frequency.exponentialRampToValueAtTime(200, audioCtx.currentTime + 0.15);
      bassGain.gain.setValueAtTime(0.2, audioCtx.currentTime);
      bassGain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
      bassOsc.connect(bassFilter);
      bassFilter.connect(bassGain);
      bassGain.connect(masterGain);
      bassOsc.start();
      bassOsc.stop(audioCtx.currentTime + 0.2);

      // Melody
      game.song2MelodyPhase++;
      const noteIndex = DDR_MELODY_PATTERN[game.song2MelodyPhase % DDR_MELODY_PATTERN.length];
      const melodyNote = DDR_MELODY[noteIndex];
      const melodyOsc = audioCtx.createOscillator();
      const melodyGain = audioCtx.createGain();
      const melodyFilter = audioCtx.createBiquadFilter();
      melodyOsc.type = 'square';
      melodyOsc.frequency.value = melodyNote;
      melodyFilter.type = 'lowpass';
      melodyFilter.frequency.value = 2000;
      melodyGain.gain.setValueAtTime(0.12, audioCtx.currentTime);
      melodyGain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
      melodyOsc.connect(melodyFilter);
      melodyFilter.connect(melodyGain);
      melodyGain.connect(masterGain);
      melodyOsc.start();
      melodyOsc.stop(audioCtx.currentTime + 0.15);

      // Arpeggio every 2 beats
      if (game.song2Beat % 2 === 0) {
        const chordIndex = Math.floor(game.song2Beat / 8) % DDR_CHORDS.length;
        const chord = DDR_CHORDS[chordIndex];
        const arpBeatMs = beatMs / 4;
        chord.forEach((note, i) => {
          setTimeout(() => {
            if (!game.running) return;
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'triangle';
            osc.frequency.value = note * 2;
            gain.gain.setValueAtTime(0.06, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
            osc.connect(gain);
            gain.connect(masterGain);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.1);
          }, i * arpBeatMs);
        });
      }

      // Chord stabs every 4 beats
      if (game.song2Beat % 4 === 0) {
        const chordIndex = Math.floor(game.song2Beat / 4) % DDR_CHORDS.length;
        const chord = DDR_CHORDS[chordIndex];
        chord.forEach(note => {
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          const filter = audioCtx.createBiquadFilter();
          osc.type = 'sawtooth';
          osc.frequency.value = note;
          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(3000, audioCtx.currentTime);
          filter.frequency.exponentialRampToValueAtTime(500, audioCtx.currentTime + 0.3);
          gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
          osc.connect(filter);
          filter.connect(gain);
          gain.connect(masterGain);
          osc.start();
          osc.stop(audioCtx.currentTime + 0.4);
        });
      }
    }, beatMs);
  }, []);

  const stopMusic = useCallback(() => {
    const game = gameRef.current;
    if (game.musicInterval) {
      clearInterval(game.musicInterval);
      game.musicInterval = null;
    }
  }, []);

  // Beatmap generators
  const generateBeatmapSong1 = useCallback(() => {
    const beat = 60000 / 150;
    const map: { time: number; lane: number }[] = [];

    // INTRO
    for (let t = 1200; t < 3200; t += beat) {
      map.push({ time: t, lane: 1 });
    }

    // VERSE 1
    const verse1Pattern = [0, 1, 2, 1];
    for (let t = 3200; t < 9600; t += beat) {
      const idx = Math.floor((t - 3200) / beat) % 4;
      map.push({ time: t, lane: verse1Pattern[idx] });
    }

    // BUILD 1
    for (let t = 9600; t < 12800; t += beat) {
      map.push({ time: t, lane: 1 });
    }

    // DROP 1
    const drop1Pattern = [1, 0, 1, 2, 1, 2, 0, 1];
    for (let t = 12800; t < 22400; t += beat) {
      const idx = Math.floor((t - 12800) / beat) % 8;
      map.push({ time: t, lane: drop1Pattern[idx] });
      if (idx === 3 || idx === 7) {
        map.push({ time: t + beat / 2, lane: 1 });
      }
    }

    // VERSE 2
    for (let t = 22400; t < 28800; t += beat) {
      const pos = Math.floor((t - 22400) / beat);
      const wave = Math.floor(1 + Math.sin(pos * 0.8) * 1);
      map.push({ time: t, lane: wave });
    }

    // BUILD 2
    [28800, 29600, 30200, 30700, 31100, 31400, 31700].forEach(t => {
      map.push({ time: t, lane: 1 });
    });

    // DROP 2
    const drop2Pattern = [1, 0, 1, 2, 1, 0, 2, 1];
    for (let t = 32000; t < 48000; t += beat) {
      const idx = Math.floor((t - 32000) / beat) % 8;
      map.push({ time: t, lane: drop2Pattern[idx] });
      const beatNum = Math.floor((t - 32000) / beat);
      if (idx === 7 && beatNum % 2 === 1) {
        map.push({ time: t + beat / 2, lane: 1 });
      }
    }

    // OUTRO
    for (let t = 48000; t < 54000; t += beat) {
      map.push({ time: t, lane: 1 });
    }
    map.push({ time: 55000, lane: 0 });
    map.push({ time: 55000, lane: 1 });
    map.push({ time: 55000, lane: 2 });

    map.sort((a, b) => a.time - b.time);
    return map;
  }, []);

  const generateBeatmapSong2 = useCallback(() => {
    // DDR Rave @ 170 BPM - HARD difficulty with 16th note runs towards end
    const beat = 60000 / 170;
    const map: { time: number; lane: number }[] = [];

    // INTRO - simple center lane warmup
    for (let t = 1000; t < 4000; t += beat) {
      map.push({ time: t, lane: 1 });
    }

    // VERSE 1 - gentle left-center-right pattern
    const verse1Pattern = [0, 1, 2, 1];
    for (let t = 4000; t < 12000; t += beat) {
      const idx = Math.floor((t - 4000) / beat) % 4;
      map.push({ time: t, lane: verse1Pattern[idx] });
    }

    // BUILD 1 - center lane with some 8th notes building tension
    for (let t = 12000; t < 16000; t += beat) {
      map.push({ time: t, lane: 1 });
      const beatNum = Math.floor((t - 12000) / beat);
      if (beatNum >= 6) {
        map.push({ time: t + beat / 2, lane: 1 });
      }
    }

    // DROP 1 - more movement with occasional 8th notes
    const drop1Pattern = [1, 0, 1, 2, 1, 2, 0, 1];
    for (let t = 16000; t < 28000; t += beat) {
      const idx = Math.floor((t - 16000) / beat) % 8;
      map.push({ time: t, lane: drop1Pattern[idx] });
      // Add 8th note every 4 beats
      const beatNum = Math.floor((t - 16000) / beat);
      if (beatNum % 4 === 3) {
        map.push({ time: t + beat / 2, lane: 1 });
      }
    }

    // VERSE 2 - wave pattern following melody
    for (let t = 28000; t < 36000; t += beat) {
      const pos = Math.floor((t - 28000) / beat);
      const wave = Math.floor(1 + Math.sin(pos * 0.6) * 1);
      map.push({ time: t, lane: wave });
    }

    // BUILD 2 - tension building with accelerating 8th notes
    for (let t = 36000; t < 40000; t += beat) {
      map.push({ time: t, lane: 1 });
      const beatNum = Math.floor((t - 36000) / beat);
      if (beatNum >= 4) {
        map.push({ time: t + beat / 2, lane: beatNum % 2 === 0 ? 0 : 2 });
      }
    }

    // DROP 2 - harder section with 8th notes and 16th note runs
    const drop2Pattern = [1, 0, 2, 1, 0, 2, 1, 0];
    for (let t = 40000; t < 52000; t += beat) {
      const idx = Math.floor((t - 40000) / beat) % 8;
      map.push({ time: t, lane: drop2Pattern[idx] });
      const beatNum = Math.floor((t - 40000) / beat);
      // 8th notes more frequently
      if (beatNum % 4 === 3) {
        map.push({ time: t + beat / 2, lane: 1 });
      }
      // 16th note runs every 8 beats
      if (beatNum % 8 === 7) {
        map.push({ time: t + beat / 4, lane: 0 });
        map.push({ time: t + beat / 2, lane: 1 });
        map.push({ time: t + beat * 3 / 4, lane: 2 });
      }
    }

    // CLIMAX (52-56s) - intense 16th note patterns
    for (let t = 52000; t < 56000; t += beat) {
      const beatNum = Math.floor((t - 52000) / beat);
      map.push({ time: t, lane: beatNum % 3 });
      // 16th note triplets
      map.push({ time: t + beat / 4, lane: (beatNum + 1) % 3 });
      map.push({ time: t + beat / 2, lane: (beatNum + 2) % 3 });
      // Add extra 16th on some beats for intensity
      if (beatNum % 2 === 1) {
        map.push({ time: t + beat * 3 / 4, lane: 1 });
      }
    }

    // OUTRO - quick wind down
    for (let t = 56000; t < 58500; t += beat) {
      map.push({ time: t, lane: 1 });
    }

    // Final 16th note flourish into triple hit
    map.push({ time: 58800, lane: 0 });
    map.push({ time: 58900, lane: 1 });
    map.push({ time: 59000, lane: 2 });
    map.push({ time: 59100, lane: 1 });
    // Final triple hit
    map.push({ time: 59500, lane: 0 });
    map.push({ time: 59500, lane: 1 });
    map.push({ time: 59500, lane: 2 });

    map.sort((a, b) => a.time - b.time);
    return map;
  }, []);

  // Start game
  const startGame = useCallback((songIndex: number) => {
    initAudio();
    const game = gameRef.current;

    // Stop any existing music first
    if (game.musicInterval) {
      clearInterval(game.musicInterval);
      game.musicInterval = null;
    }

    // Reset all game state
    game.selectedSong = songIndex;
    game.score = 0;
    game.combo = 0;
    game.maxCombo = 0;
    game.perfects = 0;
    game.goods = 0;
    game.misses = 0;
    game.songTime = 0;
    game.nextNoteIndex = 0;
    game.notes = [];
    game.hitEffects = [];
    game.screenFlash = 0;
    game.lanePulse = [0, 0, 0];
    game.currentBeatmap = songIndex === 0 ? generateBeatmapSong1() : generateBeatmapSong2();
    game.countdownValue = 3;
    game.running = false;

    // Reset music state
    game.musicStartTime = 0;
    game.beat = 0;
    game.melodyPhase = 0;
    game.lastBeatTime = 0;
    game.song2Beat = 0;
    game.song2MelodyPhase = 0;

    setSelectedSong(songIndex);
    setScore(0);
    setGameState('countdown');
  }, [initAudio, generateBeatmapSong1, generateBeatmapSong2]);

  // Handle game over
  const handleGameOver = useCallback(() => {
    const game = gameRef.current;
    game.running = false;

    // Stop music
    if (game.musicInterval) {
      clearInterval(game.musicInterval);
      game.musicInterval = null;
    }

    const grade = calculateGrade(game.perfects, game.goods, game.misses);
    setFinalStats({
      perfects: game.perfects,
      goods: game.goods,
      misses: game.misses,
      maxCombo: game.maxCombo,
      grade,
    });
    setScore(Math.floor(game.score));

    // Track analytics
    if (game.score >= 1) {
      fetch('/api/pixelpit/stats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ game: GAME_ID }),
      }).catch(() => {});
    }

    // Show payoff after completing Song 2 (already unlocked from playing half of Song 1)
    if (game.selectedSong === 1 && unlockedPayoff) {
      // Ensure AudioContext is active for the iframe to potentially inherit
      if (game.audioCtx && game.audioCtx.state === 'suspended') {
        game.audioCtx.resume();
      }
      setPayoffFromGame(true);
      setGameState('payoff');
    } else {
      setGameState('gameover');
    }
  }, []);

  // Pause/Resume functions
  const pauseGame = useCallback(() => {
    const game = gameRef.current;
    if (!game.running) return;
    game.running = false;
    setPaused(true);

    // Suspend AudioContext to stop ALL sound immediately
    if (game.audioCtx && game.audioCtx.state === 'running') {
      game.audioCtx.suspend();
    }

    // Clear music interval for song 2
    if (game.musicInterval) {
      clearInterval(game.musicInterval);
      game.musicInterval = null;
    }
  }, []);

  const resumeGame = useCallback(() => {
    const game = gameRef.current;
    game.running = true;
    setPaused(false);

    // Resume AudioContext
    if (game.audioCtx && game.audioCtx.state === 'suspended') {
      game.audioCtx.resume();
    }

    // Restart music interval for song 2
    if (game.selectedSong === 1) {
      startMusicSong2();
    }
  }, [startMusicSong2]);

  const quitGame = useCallback(() => {
    const game = gameRef.current;

    // Stop everything
    game.running = false;
    stopMusic();

    // IMPORTANT: Resume AudioContext so it works for next game
    if (game.audioCtx && game.audioCtx.state === 'suspended') {
      game.audioCtx.resume();
    }

    // Reset all game state
    game.songTime = 0;
    game.startTime = 0;
    game.score = 0;
    game.combo = 0;
    game.maxCombo = 0;
    game.perfects = 0;
    game.goods = 0;
    game.misses = 0;
    game.currentBeatmap = [];
    game.notes = [];
    game.nextNoteIndex = 0;
    game.hitEffects = [];
    game.screenFlash = 0;
    game.lanePulse = [0, 0, 0];
    game.countdownValue = 3;
    game.musicStartTime = 0;
    game.beat = 0;
    game.melodyPhase = 0;
    game.lastBeatTime = 0;
    game.song2Beat = 0;
    game.song2MelodyPhase = 0;

    // Reset React state
    setScore(0);
    setPaused(false);
    setGameState('songSelect');
  }, [stopMusic]);

  // Main game loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const game = gameRef.current;

    // Resize handler - only update if dimensions actually change significantly
    // This prevents mobile Safari address bar animations from causing glitches
    const resize = () => {
      const newW = window.innerWidth;
      const newH = window.innerHeight;
      // Only resize if dimensions changed by more than 1px (ignore sub-pixel changes)
      // and if the change is reasonable (not a temporary glitch value)
      if (Math.abs(newW - game.w) > 1 || Math.abs(newH - game.h) > 1) {
        // Don't resize during active gameplay to prevent mid-game glitches
        if (!game.running) {
          game.w = canvas.width = newW;
          game.h = canvas.height = newH;
        }
      }
    };
    // Initial size
    game.w = canvas.width = window.innerWidth;
    game.h = canvas.height = window.innerHeight;
    window.addEventListener('resize', resize);

    // Game constants
    const NUM_LANES = 3;
    const NOTE_SPEED = 0.6;
    const HIT_ZONE_Y = 0.85;
    const PERFECT_WINDOW = 50;
    const GOOD_WINDOW = 120;

    const getLaneX = (lane: number) => {
      const laneWidth = game.w / NUM_LANES;
      return laneWidth * lane + laneWidth / 2;
    };

    const getHitZoneY = () => game.h * HIT_ZONE_Y;

    const getNoteY = (noteTime: number) => {
      const hitZoneY = getHitZoneY();
      const timeUntilHit = noteTime - game.songTime;
      return hitZoneY - (timeUntilHit * NOTE_SPEED * game.h / 1000);
    };

    // Multiplier system
    const getMultiplier = () => {
      if (game.combo >= 50) return 8;
      if (game.combo >= 40) return 4;
      if (game.combo >= 30) return 3;
      if (game.combo >= 20) return 2;
      return 1;
    };

    const getNextMultiplierThreshold = () => {
      if (game.combo < 20) return 20;
      if (game.combo < 30) return 30;
      if (game.combo < 40) return 40;
      if (game.combo < 50) return 50;
      return null;
    };

    // Hit detection
    const hitNote = (lane: number) => {
      const hitZoneY = getHitZoneY();
      let closestNote: typeof game.notes[0] | null = null;
      let closestDist = Infinity;

      for (const note of game.notes) {
        if (note.lane !== lane || note.hit) continue;
        const timeDiff = Math.abs(note.time - game.songTime);
        if (timeDiff < closestDist && timeDiff < GOOD_WINDOW) {
          closestDist = timeDiff;
          closestNote = note;
        }
      }

      if (closestNote) {
        closestNote.hit = true;
        const x = getLaneX(lane);
        game.combo++;
        const multiplier = getMultiplier();

        if (closestDist <= PERFECT_WINDOW) {
          game.score += 100 * multiplier;
          game.perfects++;
          playNote(880, 0.1, 'sine', 0.2);
          playNote(1108, 0.15, 'sine', 0.15);
          game.screenFlash = 0.3;
          game.hitEffects.push({
            x, y: hitZoneY,
            color: THEME.perfect,
            alpha: 1, scale: 1,
            text: 'PERFECT'
          });
        } else {
          game.score += 50 * multiplier;
          game.goods++;
          playNote(660, 0.1, 'sine', 0.15);
          game.hitEffects.push({
            x, y: hitZoneY,
            color: THEME.good,
            alpha: 1, scale: 0.8,
            text: 'GOOD'
          });
        }

        game.maxCombo = Math.max(game.maxCombo, game.combo);
        game.lanePulse[lane] = 1;
        setScore(Math.floor(game.score));
      }
    };

    const missNote = (note: typeof game.notes[0]) => {
      if (note.missed) return;
      note.missed = true;
      game.misses++;
      game.combo = 0;
      playNote(150, 0.2, 'sawtooth', 0.1);
      const x = getLaneX(note.lane);
      game.hitEffects.push({
        x, y: getHitZoneY(),
        color: THEME.miss,
        alpha: 1, scale: 0.6,
        text: 'MISS'
      });
    };

    // Input handling
    const handleInput = (clientX: number) => {
      if (gameState === 'playing' && game.running) {
        const lane = Math.floor(clientX / (game.w / NUM_LANES));
        hitNote(Math.min(Math.max(lane, 0), 2));
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState === 'playing' && game.running) {
        if (e.code === 'KeyA' || e.code === 'ArrowLeft') hitNote(0);
        else if (e.code === 'KeyS' || e.code === 'ArrowDown' || e.code === 'Space') hitNote(1);
        else if (e.code === 'KeyD' || e.code === 'ArrowRight') hitNote(2);
      }
    };

    const handleTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      for (let i = 0; i < e.touches.length; i++) {
        handleInput(e.touches[i].clientX);
      }
    };

    const handleClick = (e: MouseEvent) => {
      handleInput(e.clientX);
    };

    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('click', handleClick);
    document.addEventListener('keydown', handleKeyDown);

    // Draw functions
    const draw = () => {
      const { w, h } = game;

      // Background
      ctx.fillStyle = THEME.void;
      ctx.fillRect(0, 0, w, h);

      // Lane lines
      ctx.strokeStyle = 'rgba(255,255,255,0.1)';
      ctx.lineWidth = 1;
      for (let i = 1; i < NUM_LANES; i++) {
        const x = (w / NUM_LANES) * i;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }

      // Hit zone
      const hitZoneY = getHitZoneY();
      const hitZoneHeight = 20;

      for (let i = 0; i < NUM_LANES; i++) {
        const x = getLaneX(i);
        const laneWidth = w / NUM_LANES;
        const pulseScale = 1 + game.lanePulse[i] * 0.3;

        ctx.fillStyle = LANE_COLORS[i] + '40';
        ctx.beginPath();
        ctx.arc(x, hitZoneY, 35 * pulseScale, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = LANE_COLORS[i];
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(x, hitZoneY, 35 * pulseScale, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Notes
      for (const note of game.notes) {
        if (note.hit || note.missed) continue;
        const y = getNoteY(note.time);
        if (y < -50 || y > h + 50) continue;

        const x = getLaneX(note.lane);
        const size = 28;

        ctx.fillStyle = LANE_COLORS[note.lane];
        ctx.shadowColor = LANE_COLORS[note.lane];
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // Hit effects
      for (const effect of game.hitEffects) {
        ctx.globalAlpha = effect.alpha;
        ctx.fillStyle = effect.color;
        ctx.font = `bold ${24 * effect.scale}px system-ui, -apple-system, sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(effect.text, effect.x, effect.y);
        ctx.globalAlpha = 1;
      }

      // Screen flash
      if (game.screenFlash > 0) {
        ctx.fillStyle = THEME.perfect;
        ctx.globalAlpha = game.screenFlash;
        ctx.fillRect(0, 0, w, h);
        ctx.globalAlpha = 1;
      }

      // UI
      if (gameState === 'playing') {
        // Score - aligned with top row (pause button is at y=20, centered in 44px = y=42)
        ctx.fillStyle = THEME.text;
        ctx.font = 'bold 24px system-ui, -apple-system, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(`${Math.floor(game.score)}`, 20, 46);

        // Multiplier display - only show when active, no progress counter
        const multiplier = getMultiplier();
        ctx.textAlign = 'center';

        if (multiplier > 1) {
          const multiplierColors: Record<number, string> = { 2: THEME.good, 3: THEME.lane1, 4: THEME.lane2, 8: THEME.perfect };
          ctx.fillStyle = multiplierColors[multiplier] || THEME.text;
          ctx.shadowColor = multiplierColors[multiplier] || THEME.text;
          ctx.shadowBlur = 15;
          ctx.font = 'bold 32px system-ui, -apple-system, sans-serif';
          ctx.fillText(`${multiplier}X`, w / 2, 46);
          ctx.shadowBlur = 0;
        }
      }

      // Countdown
      if (gameState === 'countdown') {
        ctx.fillStyle = THEME.text;
        ctx.font = 'bold 120px system-ui, -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(game.countdownValue > 0 ? String(game.countdownValue) : 'GO!', w / 2, h / 2);
      }
    };

    // Update
    let lastTime = 0;
    const update = (dt: number) => {
      if (!game.running) return;

      game.songTime += dt * 1000;

      // Spawn notes
      const spawnAheadTime = (game.h * HIT_ZONE_Y) / NOTE_SPEED * 1000 + 100;
      while (game.nextNoteIndex < game.currentBeatmap.length &&
             game.currentBeatmap[game.nextNoteIndex].time < game.songTime + spawnAheadTime) {
        const noteData = game.currentBeatmap[game.nextNoteIndex];
        game.notes.push({
          time: noteData.time,
          lane: noteData.lane,
          hit: false,
          missed: false,
        });
        game.nextNoteIndex++;
      }

      // Check for missed notes
      for (const note of game.notes) {
        if (!note.hit && !note.missed && note.time < game.songTime - GOOD_WINDOW) {
          missNote(note);
        }
      }

      // Remove old notes
      game.notes = game.notes.filter(n => {
        const y = getNoteY(n.time);
        return y < game.h + 50;
      });

      // Update effects
      for (let i = game.hitEffects.length - 1; i >= 0; i--) {
        game.hitEffects[i].alpha -= dt * 2;
        game.hitEffects[i].scale += dt * 2;
        game.hitEffects[i].y -= dt * 50;
        if (game.hitEffects[i].alpha <= 0) {
          game.hitEffects.splice(i, 1);
        }
      }

      game.screenFlash = Math.max(0, game.screenFlash - dt * 4);
      for (let i = 0; i < NUM_LANES; i++) {
        game.lanePulse[i] = Math.max(0, game.lanePulse[i] - dt * 5);
      }

      // Unlock Song 2 and Payoff after playing half of Song 1
      if (game.selectedSong === 0 && game.songTime >= 28000) {
        if (typeof window !== 'undefined') {
          if (localStorage.getItem('tap-beats-song2-unlocked') !== 'true') {
            localStorage.setItem('tap-beats-song2-unlocked', 'true');
            setUnlockedSong2(true);
          }
          if (localStorage.getItem('tap-beats-payoff-unlocked') !== 'true') {
            localStorage.setItem('tap-beats-payoff-unlocked', 'true');
            setUnlockedPayoff(true);
          }
        }
      }

      // Check song end
      const songDuration = SONGS[game.selectedSong].duration;
      if (game.songTime >= songDuration + 2000) {
        handleGameOver();
      }
    };

    // Animation loop with cancellation
    let animationId: number;
    let cancelled = false;

    const loop = (time: number) => {
      if (cancelled) return;

      const dt = Math.min((time - lastTime) / 1000, 0.1);
      lastTime = time;

      if (gameState === 'playing') {
        update(dt);
      }
      draw();
      animationId = requestAnimationFrame(loop);
    };

    animationId = requestAnimationFrame(loop);

    // Cleanup - IMPORTANT: cancel the animation loop
    return () => {
      cancelled = true;
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('click', handleClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [gameState, playNote, handleGameOver]);

  // Countdown effect
  useEffect(() => {
    if (gameState !== 'countdown') return;

    const game = gameRef.current;
    let count = 3;
    game.countdownValue = count;

    const interval = setInterval(() => {
      count--;
      game.countdownValue = count;

      if (count < 0) {
        clearInterval(interval);
        game.running = true;
        game.songTime = 0;
        setGameState('playing');

        // Start the proper music for selected song
        if (game.selectedSong === 0) {
          startMusicSong1();
        } else {
          startMusicSong2();
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [gameState, startMusicSong1, startMusicSong2]);

  return (
    <>
      <style jsx global>{`
        html, body {
          margin: 0;
          padding: 0;
          height: 100%;
          overflow: hidden;
          background: #09090b;
        }
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.8; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(1.2); }
        }
        @keyframes gridScroll {
          0% { transform: translateY(0); }
          100% { transform: translateY(60px); }
        }
        @keyframes floatBounce {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-15px) rotate(5deg); }
        }
      `}</style>
      <Script src="/pixelpit/social.js" onLoad={() => setSocialLoaded(true)} />

      <canvas
        ref={canvasRef}
        style={{
          display: gameState === 'songSelect' || gameState === 'gameover' || gameState === 'scoreflow' || gameState === 'leaderboard' || gameState === 'payoff' ? 'none' : 'block',
          position: 'fixed',
          top: 0,
          left: 0,
          touchAction: 'none',
        }}
      />

      {/* Pause Button - shown during gameplay */}
      {(gameState === 'playing' || gameState === 'countdown') && !paused && (
        <button
          onClick={pauseGame}
          style={{
            position: 'fixed',
            top: 20,
            right: 20,
            width: 44,
            height: 44,
            background: 'rgba(255, 255, 255, 0.08)',
            border: 'none',
            borderRadius: 22,
            cursor: 'pointer',
            zIndex: 100,
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 4,
          }}
        >
          {/* Two pause bars */}
          <div style={{ width: 4, height: 16, background: 'rgba(255,255,255,0.7)', borderRadius: 2 }} />
          <div style={{ width: 4, height: 16, background: 'rgba(255,255,255,0.7)', borderRadius: 2 }} />
        </button>
      )}

      {/* Pause Modal */}
      {paused && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.85)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 200,
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}>
          <div style={{
            background: THEME.surface,
            borderRadius: 24,
            padding: '40px 48px',
            textAlign: 'center',
            border: `2px solid ${THEME.lane1}`,
            boxShadow: `0 0 40px ${THEME.lane1}40`,
          }}>
            <h2 style={{
              color: THEME.lane1,
              fontSize: 36,
              fontWeight: 700,
              letterSpacing: 4,
              marginBottom: 8,
            }}>
              PAUSED
            </h2>
            <p style={{
              color: THEME.muted,
              fontSize: 14,
              marginBottom: 32,
            }}>
              {SONGS[selectedSong].name}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <button
                onClick={resumeGame}
                style={{
                  background: THEME.lane1,
                  color: '#fff',
                  border: 'none',
                  borderRadius: 12,
                  padding: '16px 48px',
                  fontSize: 18,
                  fontWeight: 700,
                  cursor: 'pointer',
                  letterSpacing: 2,
                }}
              >
                ▶ RESUME
              </button>

              <button
                onClick={quitGame}
                style={{
                  background: 'transparent',
                  color: THEME.muted,
                  border: `2px solid ${THEME.muted}`,
                  borderRadius: 12,
                  padding: '14px 48px',
                  fontSize: 16,
                  fontWeight: 600,
                  cursor: 'pointer',
                  letterSpacing: 1,
                }}
              >
                QUIT TO MENU
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Song Select Screen */}
      {gameState === 'songSelect' && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: THEME.void,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 20,
          fontFamily: 'system-ui, -apple-system, sans-serif',
          overflow: 'hidden',
        }}>
          {/* Animated grid background */}
          <div style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `
              linear-gradient(rgba(236, 72, 153, 0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(236, 72, 153, 0.1) 1px, transparent 1px)
            `,
            backgroundSize: '60px 60px',
            animation: 'gridScroll 4s linear infinite',
            pointerEvents: 'none',
          }} />

          {/* Floating arrows */}
          <div className="float-arrow" style={{
            position: 'absolute',
            top: '15%',
            left: '10%',
            fontSize: 40,
            color: THEME.lane0,
            opacity: 0.3,
            animation: 'floatBounce 3s ease-in-out infinite',
            textShadow: `0 0 20px ${THEME.lane0}`,
          }}>▲</div>
          <div className="float-arrow" style={{
            position: 'absolute',
            top: '25%',
            right: '12%',
            fontSize: 35,
            color: THEME.lane1,
            opacity: 0.3,
            animation: 'floatBounce 2.5s ease-in-out infinite 0.5s',
            textShadow: `0 0 20px ${THEME.lane1}`,
          }}>▼</div>
          <div className="float-arrow" style={{
            position: 'absolute',
            bottom: '20%',
            left: '8%',
            fontSize: 30,
            color: THEME.lane2,
            opacity: 0.3,
            animation: 'floatBounce 3.5s ease-in-out infinite 1s',
            textShadow: `0 0 20px ${THEME.lane2}`,
          }}>◀</div>
          <div className="float-arrow" style={{
            position: 'absolute',
            bottom: '30%',
            right: '10%',
            fontSize: 38,
            color: THEME.lane0,
            opacity: 0.3,
            animation: 'floatBounce 2.8s ease-in-out infinite 0.3s',
            textShadow: `0 0 20px ${THEME.lane0}`,
          }}>▶</div>

          {/* Corner accents */}
          <div style={{
            position: 'absolute',
            top: 20,
            left: 20,
            width: 40,
            height: 40,
            borderTop: `3px solid ${THEME.lane1}`,
            borderLeft: `3px solid ${THEME.lane1}`,
            opacity: 0.6,
          }} />
          <div style={{
            position: 'absolute',
            top: 20,
            right: 20,
            width: 40,
            height: 40,
            borderTop: `3px solid ${THEME.lane1}`,
            borderRight: `3px solid ${THEME.lane1}`,
            opacity: 0.6,
          }} />
          <div style={{
            position: 'absolute',
            bottom: 20,
            left: 20,
            width: 40,
            height: 40,
            borderBottom: `3px solid ${THEME.lane1}`,
            borderLeft: `3px solid ${THEME.lane1}`,
            opacity: 0.6,
          }} />
          <div style={{
            position: 'absolute',
            bottom: 20,
            right: 20,
            width: 40,
            height: 40,
            borderBottom: `3px solid ${THEME.lane1}`,
            borderRight: `3px solid ${THEME.lane1}`,
            opacity: 0.6,
          }} />

          {/* Glowing orbs */}
          <div style={{
            position: 'absolute',
            top: '40%',
            left: '5%',
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: THEME.lane0,
            boxShadow: `0 0 20px ${THEME.lane0}, 0 0 40px ${THEME.lane0}`,
            animation: 'pulse 2s ease-in-out infinite',
          }} />
          <div style={{
            position: 'absolute',
            top: '60%',
            right: '7%',
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: THEME.lane2,
            boxShadow: `0 0 15px ${THEME.lane2}, 0 0 30px ${THEME.lane2}`,
            animation: 'pulse 2.5s ease-in-out infinite 0.5s',
          }} />

          <h1 style={{
            color: THEME.lane1,
            fontSize: 48,
            fontWeight: 700,
            letterSpacing: 8,
            marginBottom: 10,
            textShadow: `0 0 30px ${THEME.lane1}, 0 0 60px ${THEME.lane1}50`,
            zIndex: 1,
          }}>
            TAP BEATS
          </h1>
          <p style={{
            color: THEME.lane0,
            fontSize: 14,
            letterSpacing: 6,
            marginBottom: 30,
            opacity: 0.7,
            zIndex: 1,
          }}>
            RHYTHM ARCADE
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, width: '100%', maxWidth: 400 }}>
            {SONGS.map((song, i) => {
              const isLocked = song.locked && !unlockedSong2;
              return (
                <button
                  key={song.id}
                  onClick={() => !isLocked && startGame(i)}
                  disabled={isLocked}
                  style={{
                    background: isLocked ? THEME.surface : LANE_COLORS[i % 3] + '20',
                    border: `2px solid ${isLocked ? THEME.muted : LANE_COLORS[i % 3]}`,
                    borderRadius: 16,
                    padding: '20px 24px',
                    textAlign: 'left',
                    cursor: isLocked ? 'not-allowed' : 'pointer',
                    opacity: isLocked ? 0.5 : 1,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: THEME.text, fontSize: 20, fontWeight: 700 }}>
                      {isLocked ? '🔒 ' : ''}{song.name}
                    </span>
                    <span style={{
                      background: song.difficulty === 'HARD' ? THEME.lane2 : THEME.lane0,
                      color: '#000',
                      padding: '4px 12px',
                      borderRadius: 8,
                      fontSize: 12,
                      fontWeight: 700,
                    }}>
                      {song.difficulty}
                    </span>
                  </div>
                  <div style={{ color: THEME.muted, fontSize: 14, marginTop: 8 }}>
                    {song.description} · {song.bpm} BPM
                  </div>
                  {isLocked && (
                    <div style={{ color: THEME.lane2, fontSize: 12, marginTop: 8 }}>
                      Play halfway through Song 1 to unlock
                    </div>
                  )}
                </button>
              );
            })}

            {/* DDR Rave Reward Card */}
            <button
              onClick={() => {
                if (unlockedPayoff) {
                  setPayoffFromGame(false);
                  setGameState('payoff');
                }
              }}
              disabled={!unlockedPayoff}
              style={{
                background: unlockedPayoff
                  ? 'linear-gradient(135deg, #ec489920, #22d3ee20, #facc1520)'
                  : THEME.surface,
                border: `2px solid ${unlockedPayoff ? THEME.perfect : THEME.muted}`,
                borderRadius: 16,
                padding: '20px 24px',
                textAlign: 'left',
                cursor: unlockedPayoff ? 'pointer' : 'not-allowed',
                opacity: unlockedPayoff ? 1 : 0.5,
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {unlockedPayoff && (
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: 'linear-gradient(45deg, transparent 40%, rgba(255,255,255,0.1) 50%, transparent 60%)',
                  animation: 'shimmer 2s infinite',
                  pointerEvents: 'none',
                }} />
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: THEME.text, fontSize: 20, fontWeight: 700 }}>
                  {unlockedPayoff ? '🎉 ' : '🔒 '}DDR RAVE SHOW
                </span>
                <span style={{
                  background: unlockedPayoff ? THEME.perfect : THEME.muted,
                  color: '#000',
                  padding: '4px 12px',
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 700,
                }}>
                  REWARD
                </span>
              </div>
              <div style={{ color: THEME.muted, fontSize: 14, marginTop: 8 }}>
                {unlockedPayoff
                  ? 'Watch the full DDR Rave visualizer with music'
                  : 'Play halfway through Song 1 to unlock'}
              </div>
              {unlockedPayoff && (
                <div style={{ color: THEME.perfect, fontSize: 12, marginTop: 8 }}>
                  ✓ UNLOCKED — Tap to watch
                </div>
              )}
            </button>
          </div>

          {isDesktop && (
            <div style={{ marginTop: 40, color: THEME.muted, fontSize: 14, textAlign: 'center' }}>
              Use A/S/D keys
            </div>
          )}
        </div>
      )}

      {/* Game Over Screen */}
      {gameState === 'gameover' && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: THEME.void,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 20,
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}>
          <div style={{
            fontSize: 80,
            fontWeight: 700,
            color: finalStats.grade === 'S' ? THEME.perfect : finalStats.grade === 'A' ? THEME.lane2 : THEME.text,
            textShadow: `0 0 30px ${finalStats.grade === 'S' ? THEME.perfect : THEME.lane1}`,
            marginBottom: 10,
          }}>
            {finalStats.grade}
          </div>

          <div style={{ fontSize: 48, fontWeight: 700, color: THEME.lane1, marginBottom: 20 }}>
            {score}
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 16,
            marginBottom: 30,
            textAlign: 'center',
          }}>
            <div>
              <div style={{ color: THEME.perfect, fontSize: 24, fontWeight: 700 }}>{finalStats.perfects}</div>
              <div style={{ color: THEME.muted, fontSize: 12 }}>PERFECT</div>
            </div>
            <div>
              <div style={{ color: THEME.good, fontSize: 24, fontWeight: 700 }}>{finalStats.goods}</div>
              <div style={{ color: THEME.muted, fontSize: 12 }}>GOOD</div>
            </div>
            <div>
              <div style={{ color: THEME.miss, fontSize: 24, fontWeight: 700 }}>{finalStats.misses}</div>
              <div style={{ color: THEME.muted, fontSize: 12 }}>MISS</div>
            </div>
            <div>
              <div style={{ color: THEME.lane2, fontSize: 24, fontWeight: 700 }}>{finalStats.maxCombo}</div>
              <div style={{ color: THEME.muted, fontSize: 12 }}>MAX COMBO</div>
            </div>
          </div>

          <button
            onClick={() => setGameState('scoreflow')}
            style={{
              background: THEME.lane1,
              color: '#fff',
              border: 'none',
              borderRadius: 12,
              padding: '16px 48px',
              fontSize: 18,
              fontWeight: 700,
              cursor: 'pointer',
              marginBottom: 16,
            }}
          >
            SUBMIT SCORE
          </button>

          <button
            onClick={() => setGameState('songSelect')}
            style={{
              background: 'transparent',
              color: THEME.muted,
              border: `1px solid ${THEME.muted}`,
              borderRadius: 12,
              padding: '12px 32px',
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            Back to Songs
          </button>
        </div>
      )}

      {/* Score Flow Screen */}
      {gameState === 'scoreflow' && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: THEME.void,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 20,
        }}>
          {progression && <ProgressionDisplay progression={progression} />}

          <ScoreFlow
            score={score}
            gameId={GAME_ID}
            colors={SCORE_FLOW_COLORS}
            xpDivisor={1}
            onRankReceived={(rank, entryId) => {
              setSubmittedEntryId(entryId ?? null);
            }}
            onProgression={(prog) => setProgression(prog)}
          />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 20, width: '100%', maxWidth: 280 }}>
            <button
              onClick={() => setGameState('leaderboard')}
              style={{
                background: THEME.lane0,
                color: '#000',
                border: 'none',
                borderRadius: 12,
                padding: '14px 24px',
                fontSize: 14,
                fontWeight: 700,
                cursor: 'pointer',
                width: '100%',
              }}
            >
              LEADERBOARD
            </button>

            <button
              onClick={() => setShowShareModal(true)}
              style={{
                background: THEME.lane1,
                color: '#fff',
                border: 'none',
                borderRadius: 12,
                padding: '14px 24px',
                fontSize: 14,
                fontWeight: 700,
                cursor: 'pointer',
                width: '100%',
              }}
            >
              SHARE
            </button>

            <button
              onClick={() => setGameState('songSelect')}
              style={{
                background: THEME.lane2,
                color: '#000',
                border: 'none',
                borderRadius: 12,
                padding: '14px 24px',
                fontSize: 14,
                fontWeight: 700,
                cursor: 'pointer',
                width: '100%',
              }}
            >
              PLAY MORE
            </button>
          </div>
        </div>
      )}

      {/* Leaderboard Screen */}
      {gameState === 'leaderboard' && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: THEME.void,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 20,
        }}>
          <Leaderboard
            gameId={GAME_ID}
            limit={10}
            entryId={submittedEntryId ?? undefined}
            colors={LEADERBOARD_COLORS}
            onClose={() => setGameState('scoreflow')}
          />
        </div>
      )}

      {/* Share Modal */}
      {showShareModal && (
        <ShareModal
          gameUrl={`${GAME_URL}/share/${score}`}
          score={score}
          colors={LEADERBOARD_COLORS}
          onClose={() => setShowShareModal(false)}
        />
      )}

      {/* Payoff Screen - DDR Rave fullscreen after beating song 2 */}
      {gameState === 'payoff' && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: THEME.void,
          zIndex: 1000,
        }}>
          <iframe
            src="https://kochi.to/amber/ddr-rave.html"
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
            }}
            allow="autoplay"
          />

          {/* Exit button overlay */}
          <button
            onClick={() => setGameState(payoffFromGame ? 'gameover' : 'songSelect')}
            style={{
              position: 'absolute',
              top: 20,
              right: 20,
              width: 44,
              height: 44,
              background: 'rgba(255, 255, 255, 0.08)',
              border: 'none',
              borderRadius: 22,
              cursor: 'pointer',
              zIndex: 1001,
              backdropFilter: 'blur(8px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {payoffFromGame ? (
              /* Arrow right for "view score" */
              <div style={{
                width: 0,
                height: 0,
                borderTop: '8px solid transparent',
                borderBottom: '8px solid transparent',
                borderLeft: '12px solid rgba(255,255,255,0.7)',
                marginLeft: 4,
              }} />
            ) : (
              /* Arrow left for "back" */
              <div style={{
                width: 0,
                height: 0,
                borderTop: '8px solid transparent',
                borderBottom: '8px solid transparent',
                borderRight: '12px solid rgba(255,255,255,0.7)',
                marginRight: 4,
              }} />
            )}
          </button>

          {/* Celebration text - only show when unlocking for first time */}
          {payoffFromGame && (
            <div style={{
              position: 'absolute',
              top: 20,
              left: 20,
              background: 'rgba(0, 0, 0, 0.7)',
              color: THEME.perfect,
              padding: '12px 20px',
              borderRadius: 12,
              fontSize: 16,
              fontWeight: 700,
              fontFamily: 'system-ui, -apple-system, sans-serif',
              zIndex: 1001,
              backdropFilter: 'blur(4px)',
              textShadow: `0 0 10px ${THEME.perfect}`,
            }}>
              🎉 DDR RAVE UNLOCKED!
            </div>
          )}

          {/* The iframe (ddr-rave.html) has its own start modal that handles audio */}
        </div>
      )}
    </>
  );
}
