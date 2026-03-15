'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
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

const GAME_ID = 'level';
const GAME_NAME = 'LEVEL';
const GRACE_PERIOD = 5;

const COLORS = {
  bg: '#0a0a0f',
  surface: '#1a1a2e',
  primary: '#FFD700',
  secondary: '#7B68EE',
  text: '#D4A574',
  muted: '#71717a',
  teal: '#2D9596',
  error: '#FF6B6B',
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

// Audio
let audioCtx: AudioContext | null = null;
function initAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') audioCtx.resume();
}
function playTone(freq: number, dur: number, type: OscillatorType = 'sine') {
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.value = 0.08;
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + dur);
}

// ===== MUSIC ENGINE — Arcade driving pulse, 130 BPM =====
const MUSIC_BPM = 130;
const MUSIC_STEP_MS = (60 / MUSIC_BPM) * 1000 / 4; // 16th notes

// A minor — tense, driving, arcade energy
// Bass: punchy saw octave pattern (A1→A2 movement)
const M_BASS = [55, 0, 55, 0, 0, 55, 0, 0, 55, 0, 0, 55, 55, 0, 0, 0]; // syncopated
// Arp: square wave stabs — Am, C, F, Em cycle (16 notes per bar, 4 bars)
const M_ARP_NOTES = [
  // Bar 1: Am — A C E
  440, 0, 523.25, 0, 659.25, 0, 523.25, 0, 440, 0, 659.25, 0, 523.25, 0, 440, 0,
  // Bar 2: C — C E G
  523.25, 0, 659.25, 0, 783.99, 0, 659.25, 0, 523.25, 0, 783.99, 0, 659.25, 0, 523.25, 0,
  // Bar 3: F — F A C
  349.23, 0, 440, 0, 523.25, 0, 440, 0, 349.23, 0, 523.25, 0, 440, 0, 349.23, 0,
  // Bar 4: Em — E G B
  329.63, 0, 392, 0, 493.88, 0, 392, 0, 329.63, 0, 493.88, 0, 392, 0, 329.63, 0,
];
// Kick: four-on-the-floor
const M_KICK = [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0];
// Hi-hat: offbeat 8ths
const M_HAT = [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0];

let musicPlaying = false;
let musicInterval: ReturnType<typeof setInterval> | null = null;
let musicStep = 0;

function mKick() {
  if (!audioCtx) return;
  const now = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gn = audioCtx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(150, now);
  osc.frequency.exponentialRampToValueAtTime(40, now + 0.08);
  gn.gain.setValueAtTime(0.18, now);
  gn.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
  osc.connect(gn); gn.connect(audioCtx.destination);
  osc.start(); osc.stop(now + 0.15);
  osc.onended = () => { osc.disconnect(); gn.disconnect(); };
}

function mHat() {
  if (!audioCtx) return;
  const now = audioCtx.currentTime;
  const len = Math.floor(audioCtx.sampleRate * 0.02);
  const buf = audioCtx.createBuffer(1, len, audioCtx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  const src = audioCtx.createBufferSource();
  src.buffer = buf;
  const hp = audioCtx.createBiquadFilter();
  hp.type = 'highpass'; hp.frequency.value = 8000;
  const gn = audioCtx.createGain();
  gn.gain.setValueAtTime(0.06, now);
  gn.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
  src.connect(hp); hp.connect(gn); gn.connect(audioCtx.destination);
  src.start();
  src.onended = () => { src.disconnect(); hp.disconnect(); gn.disconnect(); };
}

function mBass(freq: number) {
  if (!audioCtx || freq === 0) return;
  const now = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const flt = audioCtx.createBiquadFilter();
  const gn = audioCtx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.value = freq;
  flt.type = 'lowpass'; flt.frequency.value = 300; flt.Q.value = 3;
  gn.gain.setValueAtTime(0.1, now);
  gn.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
  osc.connect(flt); flt.connect(gn); gn.connect(audioCtx.destination);
  osc.start(); osc.stop(now + 0.15);
  osc.onended = () => { osc.disconnect(); flt.disconnect(); gn.disconnect(); };
}

function mArp(freq: number) {
  if (!audioCtx || freq === 0) return;
  const now = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const flt = audioCtx.createBiquadFilter();
  const gn = audioCtx.createGain();
  osc.type = 'square';
  osc.frequency.value = freq;
  flt.type = 'lowpass'; flt.frequency.value = 1800; flt.Q.value = 1;
  gn.gain.setValueAtTime(0.035, now);
  gn.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
  osc.connect(flt); flt.connect(gn); gn.connect(audioCtx.destination);
  osc.start(); osc.stop(now + 0.1);
  osc.onended = () => { osc.disconnect(); flt.disconnect(); gn.disconnect(); };
}

function musicTick() {
  if (!audioCtx || !musicPlaying) return;
  const s16 = musicStep % 16;
  if (M_KICK[s16]) mKick();
  if (M_HAT[s16]) mHat();
  mBass(M_BASS[s16]);
  mArp(M_ARP_NOTES[musicStep % M_ARP_NOTES.length]);
  musicStep++;
}

function startMusic() {
  if (musicPlaying) return;
  initAudio();
  musicPlaying = true;
  musicStep = 0;
  musicInterval = setInterval(musicTick, MUSIC_STEP_MS);
}

function stopMusic() {
  musicPlaying = false;
  if (musicInterval) {
    clearInterval(musicInterval);
    musicInterval = null;
  }
}

export default function LevelGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [screenState, setScreenState] = useState<'start' | 'playing' | 'gameover' | 'leaderboard'>('start');
  const [score, setScore] = useState(0);
  const [socialLoaded, setSocialLoaded] = useState(false);
  const [submittedEntryId, setSubmittedEntryId] = useState<number | null>(null);
  const [progression, setProgression] = useState<ProgressionResult | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);

  const { user } = usePixelpitSocial(socialLoaded);
  const gameRef = useRef<any>(null);
  const animRef = useRef<number>(0);
  const scoreRef = useRef(0);

  const GAME_URL = typeof window !== 'undefined'
    ? `${window.location.origin}/pixelpit/arcade/${GAME_ID}`
    : `https://pixelpit.gg/pixelpit/arcade/${GAME_ID}`;

  // Group code detection
  useEffect(() => {
    if (!socialLoaded || typeof window === 'undefined') return;
    if (!window.PixelpitSocial) return;
    const params = new URLSearchParams(window.location.search);
    if (params.has('logout')) {
      window.PixelpitSocial.logout();
      params.delete('logout');
      const newUrl = params.toString() ? `${window.location.pathname}?${params.toString()}` : window.location.pathname;
      window.history.replaceState({}, '', newUrl);
      window.location.reload();
      return;
    }
    const groupCode = window.PixelpitSocial.getGroupCodeFromUrl();
    if (groupCode) window.PixelpitSocial.storeGroupCode(groupCode);
  }, [socialLoaded]);

  // Main game loop
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

    const gs = {
      bubble: { x: canvas.width / 2, y: canvas.height / 2, vx: 0, vy: 0, radius: 22 },
      tiltX: 0,
      tiltY: 0,
      startTime: performance.now(),
      elapsed: 0,
      graceActive: true,
      gameOver: false,
      particles: [] as { x: number; y: number; vx: number; vy: number; life: number; color: string }[],
      toneTimer: 0,
      mouseActive: false,
      mouseX: 0,
      mouseY: 0,
      // Scoring
      points: 0,
      centeredTime: 0,
      multiplier: 1,
      lastMultiplier: 1,
      multiplierFlash: 0,
      // Milestone splashes
      milestonesHit: new Set<number>(),
      splashes: [] as { text: string; emoji: string; color: string; life: number; scale: number; y: number }[],
      screenFlash: '' as string,
      screenFlashLife: 0,
      rings: [] as { x: number; y: number; radius: number; maxRadius: number; life: number; color: string }[],
      // Living background
      bgTime: 0,
    };
    gameRef.current = gs;

    // Device orientation (mobile)
    function handleOrientation(e: DeviceOrientationEvent) {
      let tx = e.gamma || 0;
      let ty = e.beta || 0;
      tx = Math.max(-45, Math.min(45, tx));
      ty = Math.max(-45, Math.min(45, ty));
      gs.tiltX = tx;
      gs.tiltY = ty;
    }

    if (typeof DeviceOrientationEvent !== 'undefined' &&
        typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
      (DeviceOrientationEvent as any).requestPermission()
        .then((state: string) => {
          if (state === 'granted') window.addEventListener('deviceorientation', handleOrientation);
        })
        .catch(() => {});
    } else {
      window.addEventListener('deviceorientation', handleOrientation);
    }

    // Mouse/touch fallback for desktop
    function handleMouseMove(e: MouseEvent) { gs.mouseActive = true; gs.mouseX = e.clientX; gs.mouseY = e.clientY; }
    function handleTouchMove(e: TouchEvent) { gs.mouseActive = true; gs.mouseX = e.touches[0].clientX; gs.mouseY = e.touches[0].clientY; }
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('touchmove', handleTouchMove);

    function endGame() {
      if (gs.gameOver) return;
      gs.gameOver = true;
      stopMusic();
      const finalScore = Math.round(gs.points);
      scoreRef.current = finalScore;
      setScore(finalScore);
      playTone(200, 0.4, 'sawtooth');
      setTimeout(() => playTone(150, 0.4, 'sawtooth'), 150);
      fetch('/api/pixelpit/stats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ game: GAME_ID }),
      }).catch(() => {});
      setScreenState('gameover');
    }

    function update() {
      if (gs.gameOver) return;
      const now = performance.now();
      gs.elapsed = (now - gs.startTime) / 1000;
      gs.graceActive = gs.elapsed < GRACE_PERIOD;

      const w = canvas!.width;
      const h = canvas!.height;
      const b = gs.bubble;

      if (gs.mouseActive) {
        const dx = (gs.mouseX - w / 2) / (w / 2);
        const dy = (gs.mouseY - h / 2) / (h / 2);
        gs.tiltX = dx * 30;
        gs.tiltY = dy * 30;
      }

      const sensitivity = 0.4;
      b.vx += gs.tiltX * sensitivity;
      b.vy += gs.tiltY * sensitivity;
      b.vx *= 0.93;
      b.vy *= 0.93;
      b.x += b.vx;
      b.y += b.vy;

      if (gs.graceActive) {
        if (b.x - b.radius < 0) { b.x = b.radius; b.vx *= -0.6; }
        if (b.x + b.radius > w) { b.x = w - b.radius; b.vx *= -0.6; }
        if (b.y - b.radius < 0) { b.y = b.radius; b.vy *= -0.6; }
        if (b.y + b.radius > h) { b.y = h - b.radius; b.vy *= -0.6; }
      } else {
        if (b.x + b.radius < 0 || b.x - b.radius > w || b.y + b.radius < 0 || b.y - b.radius > h) {
          endGame();
          return;
        }
      }

      const centerX = w / 2;
      const centerY = h / 2;
      const dist = Math.hypot(b.x - centerX, b.y - centerY);
      const targetRadius = Math.min(w, h) * 0.08;
      const centered = dist < targetRadius;

      // Scoring: accumulate points based on multiplier
      const dt = 1 / 60;
      if (centered) {
        gs.centeredTime += dt;
        // Multiplier tiers: 2s→2x, 5s→4x, 10s→8x
        const newMult = gs.centeredTime >= 10 ? 8 : gs.centeredTime >= 5 ? 4 : gs.centeredTime >= 2 ? 2 : 1;
        if (newMult > gs.multiplier) {
          gs.multiplierFlash = 1.0;
          // Ascending fanfare — more notes at higher tiers
          playTone(500, 0.08, 'square');
          setTimeout(() => playTone(700, 0.08, 'square'), 50);
          setTimeout(() => playTone(900, 0.12, 'square'), 100);
          if (newMult >= 4) setTimeout(() => playTone(1100, 0.12, 'square'), 150);
          if (newMult >= 8) setTimeout(() => playTone(1300, 0.15, 'triangle'), 200);
          // Milestone splashes
          const milestones: [number, number, string, string, string][] = [
            [2, 2, '2×', '🔥', COLORS.teal],
            [5, 4, '4×', '⚡', COLORS.primary],
            [10, 8, '8×', '💎', '#FF69B4'],
          ];
          for (const [secs, mult, label, emoji, color] of milestones) {
            if (newMult === mult && !gs.milestonesHit.has(mult)) {
              gs.milestonesHit.add(mult);
              gs.splashes.push({ text: label, emoji, color, life: 1.0, scale: 0, y: h * 0.38 });
              // Screen flash
              gs.screenFlash = color;
              gs.screenFlashLife = 1.0;
              // Expanding ring
              gs.rings.push({ x: centerX, y: centerY, radius: targetRadius, maxRadius: Math.min(w, h) * 0.6, life: 1.0, color });
              // Burst particles outward from center
              for (let i = 0; i < 30 + mult * 8; i++) {
                const angle = (i / (24 + mult * 4)) * Math.PI * 2;
                const speed = 3 + Math.random() * 5;
                gs.particles.push({
                  x: centerX, y: centerY,
                  vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
                  life: 1, color,
                });
              }
            }
          }
        }
        gs.multiplier = newMult;
        gs.points += gs.multiplier * dt * 10; // ~10 pts/sec at 1x, 80 pts/sec at 8x
      } else {
        if (gs.centeredTime > 0 && gs.multiplier > 1) {
          // Lost the streak
          playTone(250, 0.1, 'sawtooth');
        }
        gs.centeredTime = 0;
        gs.multiplier = 1;
        gs.milestonesHit.clear();
        gs.points += dt * 2;
      }
      if (gs.multiplierFlash > 0) gs.multiplierFlash -= dt * 2;

      // Tick-tock SFX — speeds up with multiplier
      const tickInterval = gs.multiplier >= 8 ? 0.07 : gs.multiplier >= 4 ? 0.1 : gs.multiplier >= 2 ? 0.15 : 0.25;
      gs.toneTimer += dt;
      if (centered && gs.toneTimer > tickInterval) {
        const tickFreq = gs.multiplier >= 8 ? 880 : gs.multiplier >= 4 ? 660 : gs.multiplier >= 2 ? 550 : 440;
        playTone(tickFreq + (gs.toneTimer % 2 < tickInterval ? 100 : 0), 0.03, 'square');
        gs.toneTimer = 0;
      }

      if (centered && Math.random() < 0.3) {
        gs.particles.push({
          x: b.x + (Math.random() - 0.5) * b.radius,
          y: b.y + (Math.random() - 0.5) * b.radius,
          vx: (Math.random() - 0.5) * 2,
          vy: (Math.random() - 0.5) * 2,
          life: 1,
          color: gs.multiplier >= 4 ? '#FF69B4' : Math.random() < 0.5 ? COLORS.primary : COLORS.teal,
        });
      }

      // More particles at higher multipliers
      if (centered && gs.multiplier >= 4 && Math.random() < 0.5) {
        gs.particles.push({
          x: b.x + (Math.random() - 0.5) * b.radius * 2,
          y: b.y + (Math.random() - 0.5) * b.radius * 2,
          vx: (Math.random() - 0.5) * 4,
          vy: (Math.random() - 0.5) * 4,
          life: 1,
          color: gs.multiplier >= 8 ? COLORS.primary : '#FF69B4',
        });
      }

      gs.particles = gs.particles.filter(p => {
        p.x += p.vx; p.y += p.vy; p.life -= 0.02;
        return p.life > 0;
      });

      // Update splashes
      gs.splashes = gs.splashes.filter(s => {
        s.life -= dt * 0.5;
        s.scale = Math.min(1, s.scale + dt * 6);
        s.y -= dt * 20;
        return s.life > 0;
      });

      // Update screen flash
      if (gs.screenFlashLife > 0) gs.screenFlashLife -= dt * 4;

      // Update rings
      gs.rings = gs.rings.filter(r => {
        r.life -= dt * 1.5;
        r.radius += (r.maxRadius - r.radius) * dt * 4;
        return r.life > 0;
      });

      gs.bgTime += dt;
    }

    function draw() {
      const w = canvas!.width;
      const h = canvas!.height;
      const b = gs.bubble;
      const centerX = w / 2;
      const centerY = h / 2;
      const targetRadius = Math.min(w, h) * 0.08;
      const dist = Math.hypot(b.x - centerX, b.y - centerY);
      const centered = dist < targetRadius;

      // Living gradient background — full clear each frame (no trail-to-black)
      const t = gs.bgTime;
      const hue1 = 240 + Math.sin(t * 0.15) * 30;
      const hue2 = 280 + Math.sin(t * 0.1 + 2) * 40;
      const hue3 = 170 + Math.sin(t * 0.08 + 4) * 30;

      // Solid base — dark but NOT black
      ctx!.fillStyle = `hsl(${hue1}, 35%, 10%)`;
      ctx!.fillRect(0, 0, w, h);

      // Drifting blob 1 — large, warm purple/magenta
      const cx1 = w * (0.3 + Math.sin(t * 0.2) * 0.2);
      const cy1 = h * (0.3 + Math.cos(t * 0.15) * 0.2);
      const g1 = ctx!.createRadialGradient(cx1, cy1, 0, cx1, cy1, Math.max(w, h) * 0.55);
      g1.addColorStop(0, `hsla(${hue2}, 60%, 25%, 0.35)`);
      g1.addColorStop(0.5, `hsla(${hue2}, 50%, 18%, 0.15)`);
      g1.addColorStop(1, `hsla(${hue2}, 40%, 10%, 0)`);
      ctx!.fillStyle = g1;
      ctx!.fillRect(0, 0, w, h);

      // Drifting blob 2 — teal/cyan, opposite corner
      const cx2 = w * (0.7 + Math.sin(t * 0.12 + 3) * 0.2);
      const cy2 = h * (0.7 + Math.cos(t * 0.18 + 1) * 0.2);
      const g2 = ctx!.createRadialGradient(cx2, cy2, 0, cx2, cy2, Math.max(w, h) * 0.5);
      g2.addColorStop(0, `hsla(${hue3}, 55%, 22%, 0.3)`);
      g2.addColorStop(0.5, `hsla(${hue3}, 45%, 15%, 0.12)`);
      g2.addColorStop(1, `hsla(${hue3}, 35%, 10%, 0)`);
      ctx!.fillStyle = g2;
      ctx!.fillRect(0, 0, w, h);

      // Third blob — smaller, faster moving, adds variety
      const cx3 = w * (0.5 + Math.sin(t * 0.25 + 5) * 0.3);
      const cy3 = h * (0.4 + Math.cos(t * 0.22 + 2) * 0.3);
      const hue4 = 320 + Math.sin(t * 0.12) * 30;
      const g3 = ctx!.createRadialGradient(cx3, cy3, 0, cx3, cy3, Math.max(w, h) * 0.3);
      g3.addColorStop(0, `hsla(${hue4}, 50%, 20%, 0.2)`);
      g3.addColorStop(1, `hsla(${hue4}, 40%, 10%, 0)`);
      ctx!.fillStyle = g3;
      ctx!.fillRect(0, 0, w, h);

      // Multiplier-reactive warmth from center
      if (gs.multiplier > 1) {
        const warmth = gs.multiplier >= 8 ? 0.2 : gs.multiplier >= 4 ? 0.12 : 0.06;
        const warmHue = gs.multiplier >= 8 ? 320 : gs.multiplier >= 4 ? 45 : 170;
        const gw = ctx!.createRadialGradient(centerX, centerY, 0, centerX, centerY, Math.min(w, h) * 0.5);
        gw.addColorStop(0, `hsla(${warmHue}, 70%, 30%, ${warmth})`);
        gw.addColorStop(0.6, `hsla(${warmHue}, 50%, 15%, ${warmth * 0.3})`);
        gw.addColorStop(1, `hsla(${warmHue}, 40%, 10%, 0)`);
        ctx!.fillStyle = gw;
        ctx!.fillRect(0, 0, w, h);
      }

      // Edge danger glow (after grace period)
      if (!gs.graceActive) {
        const edgeThreshold = 80;
        ctx!.save();
        ctx!.globalAlpha = 0.3;
        if (b.x < edgeThreshold) {
          const grad = ctx!.createLinearGradient(0, 0, edgeThreshold, 0);
          grad.addColorStop(0, COLORS.error); grad.addColorStop(1, 'transparent');
          ctx!.fillStyle = grad; ctx!.fillRect(0, 0, edgeThreshold, h);
        }
        if (b.x > w - edgeThreshold) {
          const grad = ctx!.createLinearGradient(w - edgeThreshold, 0, w, 0);
          grad.addColorStop(0, 'transparent'); grad.addColorStop(1, COLORS.error);
          ctx!.fillStyle = grad; ctx!.fillRect(w - edgeThreshold, 0, edgeThreshold, h);
        }
        if (b.y < edgeThreshold) {
          const grad = ctx!.createLinearGradient(0, 0, 0, edgeThreshold);
          grad.addColorStop(0, COLORS.error); grad.addColorStop(1, 'transparent');
          ctx!.fillStyle = grad; ctx!.fillRect(0, 0, w, edgeThreshold);
        }
        if (b.y > h - edgeThreshold) {
          const grad = ctx!.createLinearGradient(0, h - edgeThreshold, 0, h);
          grad.addColorStop(0, 'transparent'); grad.addColorStop(1, COLORS.error);
          ctx!.fillStyle = grad; ctx!.fillRect(0, h - edgeThreshold, w, edgeThreshold);
        }
        ctx!.restore();
      }

      // Target zone
      ctx!.beginPath();
      ctx!.arc(centerX, centerY, targetRadius, 0, Math.PI * 2);
      ctx!.strokeStyle = centered ? COLORS.teal : 'rgba(45, 149, 150, 0.3)';
      ctx!.lineWidth = 2;
      ctx!.stroke();

      // Crosshair
      ctx!.strokeStyle = 'rgba(45, 149, 150, 0.4)';
      ctx!.lineWidth = 1;
      ctx!.beginPath();
      ctx!.moveTo(centerX - 12, centerY); ctx!.lineTo(centerX + 12, centerY);
      ctx!.moveTo(centerX, centerY - 12); ctx!.lineTo(centerX, centerY + 12);
      ctx!.stroke();

      // Particles
      gs.particles.forEach(p => {
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, 3, 0, Math.PI * 2);
        ctx!.fillStyle = p.color;
        ctx!.globalAlpha = p.life;
        ctx!.fill();
        ctx!.globalAlpha = 1;
      });

      // Bubble
      const glowIntensity = centered ? 0.8 : 0.3;
      const glow = ctx!.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.radius * 2.5);
      glow.addColorStop(0, `rgba(212, 165, 116, ${glowIntensity})`);
      glow.addColorStop(1, 'rgba(212, 165, 116, 0)');
      ctx!.beginPath();
      ctx!.arc(b.x, b.y, b.radius * 2.5, 0, Math.PI * 2);
      ctx!.fillStyle = glow;
      ctx!.fill();

      const bubbleGrad = ctx!.createRadialGradient(b.x - b.radius * 0.3, b.y - b.radius * 0.3, 0, b.x, b.y, b.radius);
      bubbleGrad.addColorStop(0, COLORS.primary);
      bubbleGrad.addColorStop(1, COLORS.text);
      ctx!.beginPath();
      ctx!.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
      ctx!.fillStyle = bubbleGrad;
      ctx!.fill();

      ctx!.beginPath();
      ctx!.arc(b.x - b.radius * 0.3, b.y - b.radius * 0.3, b.radius * 0.3, 0, Math.PI * 2);
      ctx!.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx!.fill();

      ctx!.beginPath();
      ctx!.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
      ctx!.strokeStyle = centered ? COLORS.teal : COLORS.text;
      ctx!.lineWidth = 2;
      ctx!.stroke();

      // Screen flash overlay
      if (gs.screenFlashLife > 0) {
        ctx!.save();
        ctx!.globalAlpha = gs.screenFlashLife * 0.15;
        ctx!.fillStyle = gs.screenFlash;
        ctx!.fillRect(0, 0, w, h);
        ctx!.restore();
      }

      // Expanding rings
      gs.rings.forEach((r: { x: number; y: number; radius: number; maxRadius: number; life: number; color: string }) => {
        ctx!.save();
        ctx!.globalAlpha = r.life * 0.6;
        ctx!.strokeStyle = r.color;
        ctx!.lineWidth = 3 + r.life * 4;
        ctx!.beginPath();
        ctx!.arc(r.x, r.y, Math.max(0, r.radius), 0, Math.PI * 2);
        ctx!.stroke();
        ctx!.restore();
      });

      // Milestone splashes — BIG and juicy
      gs.splashes.forEach((s: { text: string; emoji: string; color: string; life: number; scale: number; y: number }) => {
        ctx!.save();
        ctx!.translate(w / 2, s.y);
        const ease = 1 - Math.pow(1 - s.scale, 3);
        const bounce = 1 + Math.sin(s.scale * Math.PI) * 0.15; // overshoot bounce
        ctx!.scale(ease * bounce, ease * bounce);
        ctx!.globalAlpha = Math.min(1, s.life * 2.5);
        // Emoji — huge
        const emojiSize = s.text === '8×' ? 100 : s.text === '4×' ? 85 : 70;
        ctx!.font = `${emojiSize}px sans-serif`;
        ctx!.textAlign = 'center';
        ctx!.textBaseline = 'middle';
        ctx!.fillText(s.emoji, 0, -45);
        // Multiplier text — massive
        const textSize = s.text === '8×' ? 96 : s.text === '4×' ? 80 : 64;
        ctx!.font = `bold ${textSize}px ui-monospace, monospace`;
        ctx!.fillStyle = s.color;
        ctx!.shadowColor = s.color;
        ctx!.shadowBlur = 50;
        ctx!.fillText(s.text, 0, 45);
        ctx!.shadowBlur = 0;
        ctx!.restore();
      });

      // HUD — Score
      ctx!.font = 'bold 32px ui-monospace, monospace';
      ctx!.textAlign = 'center';
      ctx!.textBaseline = 'top';
      ctx!.fillStyle = COLORS.primary;
      ctx!.shadowColor = COLORS.primary;
      ctx!.shadowBlur = 15;
      ctx!.fillText(`${Math.round(gs.points)}`, w / 2, 16);
      ctx!.shadowBlur = 0;

      // Timer (smaller, below score)
      ctx!.font = '14px ui-monospace, monospace';
      ctx!.fillStyle = COLORS.muted;
      ctx!.fillText(`${gs.elapsed.toFixed(1)}s`, w / 2, 52);

      // Multiplier badge
      if (gs.multiplier > 1) {
        const multColor = gs.multiplier >= 8 ? '#FF69B4' : gs.multiplier >= 4 ? COLORS.primary : COLORS.teal;
        const flashScale = 1 + (gs.multiplierFlash > 0 ? gs.multiplierFlash * 0.3 : 0);
        ctx!.save();
        ctx!.translate(w / 2, 78);
        ctx!.scale(flashScale, flashScale);
        ctx!.font = 'bold 22px ui-monospace, monospace';
        ctx!.fillStyle = multColor;
        ctx!.shadowColor = multColor;
        ctx!.shadowBlur = 20;
        ctx!.fillText(`${gs.multiplier}×`, 0, 0);
        ctx!.shadowBlur = 0;
        ctx!.restore();
      }

    }

    function loop() {
      update();
      draw();
      animRef.current = requestAnimationFrame(loop);
    }
    animRef.current = requestAnimationFrame(loop);

    return () => {
      stopMusic();
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', resize);
      window.removeEventListener('deviceorientation', handleOrientation);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchmove', handleTouchMove);
    };
  }, [screenState]);

  const startGame = useCallback(() => {
    initAudio();
    startMusic();
    scoreRef.current = 0;
    setScore(0);
    setSubmittedEntryId(null);
    setProgression(null);
    setShowShareModal(false);
    setScreenState('playing');
  }, []);

  const displayScore = (s: number) => `${s}`;

  return (
    <>
      <Script src="/pixelpit/social.js" onLoad={() => setSocialLoaded(true)} />

      <style jsx global>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { background: ${COLORS.bg}; font-family: ui-monospace, monospace; overflow: hidden; }
      `}</style>

      {/* --- START SCREEN --- */}
      {screenState === 'start' && (
        <div style={{
          position: 'fixed', inset: 0,
          background: 'radial-gradient(ellipse at center, #1a1a2e 0%, #0a0a0f 70%)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'ui-monospace, monospace', color: '#fff',
        }}>
          <div style={{ fontSize: 48, marginBottom: 8, filter: 'drop-shadow(0 0 20px rgba(255,215,0,0.5))' }}>⚖️</div>
          <h1 style={{ fontSize: 36, color: COLORS.primary, textShadow: '0 0 30px rgba(255,215,0,0.4)', marginBottom: 4 }}>
            LEVEL
          </h1>
          <p style={{ color: COLORS.text, fontSize: 14, marginBottom: 30, opacity: 0.7 }}>Tilt to balance. Stay centered for multipliers.</p>

          <button onClick={startGame} style={{
            padding: '16px 48px', fontSize: 20, fontFamily: 'ui-monospace, monospace',
            background: COLORS.secondary, color: COLORS.primary,
            border: `2px solid ${COLORS.primary}`, borderRadius: 8, cursor: 'pointer',
            boxShadow: '0 0 30px rgba(123,104,238,0.5)',
          }}>
            START
          </button>
        </div>
      )}

      {/* --- PLAYING --- */}
      {screenState === 'playing' && (
        <canvas ref={canvasRef} style={{ display: 'block', position: 'fixed', inset: 0, background: COLORS.bg }} />
      )}

      {/* --- GAME OVER --- */}
      {screenState === 'gameover' && (
        <div style={{
          minHeight: '100vh',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: 24,
          background: 'radial-gradient(ellipse at center, #1a1a2e 0%, #0a0a0f 70%)',
        }}>
          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', maxWidth: 400, width: '100%' }}>
            <div style={{ fontSize: 20, color: COLORS.muted, letterSpacing: 4, marginBottom: 12 }}>
              DRIFTED AWAY
            </div>

            <div style={{ fontSize: 80, fontWeight: 200, color: COLORS.primary, marginBottom: 8, lineHeight: 1, textShadow: '0 0 20px #FFD700' }}>
              {displayScore(score)}
            </div>

            <div style={{ fontSize: 12, color: COLORS.muted, letterSpacing: 2, marginBottom: 30 }}>
              POINTS
            </div>

            {progression && (
              <div style={{ background: COLORS.surface, borderRadius: 12, padding: '16px 24px', marginBottom: 20, textAlign: 'center' }}>
                <div style={{ fontSize: 18, color: COLORS.primary, marginBottom: 8 }}>+{progression.xpEarned} XP</div>
                <div style={{ fontSize: 12, color: COLORS.muted }}>
                  Level {progression.level}{progression.streak > 1 ? ` • ${progression.multiplier}x streak` : ''}
                </div>
              </div>
            )}

            <ScoreFlow
              score={score}
              gameId={GAME_ID}
              colors={SCORE_FLOW_COLORS}
              maxScore={2000}
              onRankReceived={(rank, entryId) => setSubmittedEntryId(entryId ?? null)}
              onProgression={(prog) => setProgression(prog)}
            />

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center', marginTop: 20, width: '100%' }}>
              <button onClick={startGame} style={{
                background: COLORS.primary, color: COLORS.bg, border: 'none', borderRadius: 8,
                padding: '14px 40px', fontSize: 15, fontFamily: 'ui-monospace, monospace', fontWeight: 600,
                cursor: 'pointer', letterSpacing: 2,
              }}>
                play again
              </button>
              <button onClick={() => setScreenState('leaderboard')} style={{
                background: 'transparent', border: `1px solid ${COLORS.surface}`, borderRadius: 6,
                color: COLORS.muted, padding: '12px 30px', fontSize: 11,
                fontFamily: 'ui-monospace, monospace', cursor: 'pointer', letterSpacing: 2,
              }}>
                leaderboard
              </button>
              {user ? (
                <button onClick={() => setShowShareModal(true)} style={{
                  background: 'transparent', border: `1px solid ${COLORS.surface}`, borderRadius: 6,
                  color: COLORS.muted, padding: '12px 30px', fontSize: 11,
                  fontFamily: 'ui-monospace, monospace', cursor: 'pointer', letterSpacing: 2,
                }}>
                  share / groups
                </button>
              ) : (
                <ShareButtonContainer
                  id="share-btn-container"
                  url={typeof window !== 'undefined' ? `${window.location.origin}/pixelpit/arcade/${GAME_ID}/share/${score}` : ''}
                  text={`I scored ${score} on LEVEL! Keep the bubble centered for multiplier streaks!`}
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
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
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
