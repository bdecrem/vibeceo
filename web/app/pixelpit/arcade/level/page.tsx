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

// ===== MUSIC ENGINE — Slow glass-like ambient for balance gameplay =====
const MUSIC_BPM = 72;
const MUSIC_STEP_MS = (60 / MUSIC_BPM) * 1000 / 4; // 16th notes

// Eb minor pentatonic — contemplative, not sad
// Pads: Ebm9, Gbmaj7, Abm7, Bbm7 — 4-bar cycle
const MUSIC_PADS = [
  [155.56, 233.08, 311.13, 349.23],  // Ebm9  (Eb3, Bb3, Eb4, F4)
  [185.00, 233.08, 293.66, 349.23],  // Gbmaj7 (Gb3, Bb3, D4, F4)
  [207.65, 261.63, 311.13, 392.00],  // Abm7  (Ab3, C4, Eb4, G4)
  [233.08, 293.66, 349.23, 466.16],  // Bbm7  (Bb3, D4, F4, Bb4)
];
// Arpeggio notes — high register, glass-bell feel (Eb pentatonic: Eb, Gb, Ab, Bb, Db)
const MUSIC_ARP = [622.25, 739.99, 830.61, 932.33, 1108.73, 932.33, 830.61, 739.99];
// Arp rhythm: sparse, not every beat (1 = play, 0 = rest) — 16 steps
const MUSIC_ARP_PATTERN = [1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0, 0];
// Sub bass: Eb and Bb, very slow movement
const MUSIC_BASS = [77.78, 0, 0, 0, 0, 0, 0, 0, 116.54, 0, 0, 0, 0, 0, 0, 0];

let musicPlaying = false;
let musicInterval: ReturnType<typeof setInterval> | null = null;
let musicStep = 0;

function playPad(freqs: number[]) {
  if (!audioCtx) return;
  // Only play on bar boundaries (every 16 steps)
  if (musicStep % 16 !== 0) return;
  const now = audioCtx.currentTime;
  freqs.forEach((freq, i) => {
    setTimeout(() => {
      if (!audioCtx) return;
      const osc = audioCtx.createOscillator();
      const flt = audioCtx.createBiquadFilter();
      const gn = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      flt.type = 'lowpass';
      flt.frequency.value = 900;
      gn.gain.setValueAtTime(0.022, audioCtx.currentTime);
      gn.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 2.5);
      osc.connect(flt);
      flt.connect(gn);
      gn.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 3.0);
      osc.onended = () => { osc.disconnect(); flt.disconnect(); gn.disconnect(); };
    }, i * 50); // gentle strum
  });
}

function playArp(freq: number) {
  if (!audioCtx || freq === 0) return;
  const osc = audioCtx.createOscillator();
  const flt = audioCtx.createBiquadFilter();
  const gn = audioCtx.createGain();
  osc.type = 'triangle';
  osc.frequency.value = freq;
  // Slight detune for shimmer
  const osc2 = audioCtx.createOscillator();
  const gn2 = audioCtx.createGain();
  osc2.type = 'sine';
  osc2.frequency.value = freq * 1.003;
  flt.type = 'lowpass';
  flt.frequency.value = 2000;
  flt.Q.value = 0.5;
  const now = audioCtx.currentTime;
  gn.gain.setValueAtTime(0.03, now);
  gn.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
  gn2.gain.setValueAtTime(0.015, now);
  gn2.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
  osc.connect(flt);
  flt.connect(gn);
  gn.connect(audioCtx.destination);
  osc2.connect(gn2);
  gn2.connect(audioCtx.destination);
  osc.start(); osc.stop(now + 1.5);
  osc2.start(); osc2.stop(now + 1.0);
  osc.onended = () => { osc.disconnect(); flt.disconnect(); gn.disconnect(); };
  osc2.onended = () => { osc2.disconnect(); gn2.disconnect(); };
}

function playSubBass(freq: number) {
  if (!audioCtx || freq === 0) return;
  const osc = audioCtx.createOscillator();
  const flt = audioCtx.createBiquadFilter();
  const gn = audioCtx.createGain();
  osc.type = 'sine';
  osc.frequency.value = freq;
  flt.type = 'lowpass';
  flt.frequency.value = 120;
  const now = audioCtx.currentTime;
  gn.gain.setValueAtTime(0.1, now);
  gn.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
  osc.connect(flt);
  flt.connect(gn);
  gn.connect(audioCtx.destination);
  osc.start(); osc.stop(now + 0.6);
  osc.onended = () => { osc.disconnect(); flt.disconnect(); gn.disconnect(); };
}

function musicTick() {
  if (!audioCtx || !musicPlaying) return;
  const step16 = musicStep % 16;
  // Pads: one chord per bar
  const chordIdx = Math.floor(musicStep / 16) % 4;
  playPad(MUSIC_PADS[chordIdx]);
  // Arp: sparse glass notes
  if (MUSIC_ARP_PATTERN[step16]) {
    playArp(MUSIC_ARP[musicStep % MUSIC_ARP.length]);
  }
  // Sub bass: every 8 steps
  if (step16 % 8 === 0) {
    playSubBass(MUSIC_BASS[step16]);
  }
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
          playTone(600 + newMult * 100, 0.15, 'triangle');
          // Milestone splashes
          const milestones: [number, number, string, string, string][] = [
            [2, 2, '2×', '🔥', COLORS.teal],
            [5, 4, '4×', '⚡', COLORS.primary],
            [10, 8, '8×', '💎', '#FF69B4'],
          ];
          for (const [secs, mult, label, emoji, color] of milestones) {
            if (newMult === mult && !gs.milestonesHit.has(mult)) {
              gs.milestonesHit.add(mult);
              gs.splashes.push({ text: label, emoji, color, life: 1.0, scale: 0, y: h * 0.35 });
              // Burst particles outward from center
              for (let i = 0; i < 24 + mult * 4; i++) {
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

      gs.toneTimer += dt;
      if (centered && gs.toneTimer > 0.2) {
        playTone(440 + gs.elapsed * 2, 0.05, 'sine');
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
        s.life -= dt * 0.6;
        s.scale = Math.min(1, s.scale + dt * 5); // fast pop-in
        s.y -= dt * 15; // gentle float up
        return s.life > 0;
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

      // Living gradient background — dark but playful, always evolving
      const t = gs.bgTime;
      const hue1 = 240 + Math.sin(t * 0.15) * 30; // deep blue ↔ purple
      const hue2 = 280 + Math.sin(t * 0.1 + 2) * 40; // purple ↔ magenta
      const hue3 = 200 + Math.sin(t * 0.08 + 4) * 25; // teal ↔ blue
      // Undulating center point
      const cx1 = w * (0.3 + Math.sin(t * 0.2) * 0.2);
      const cy1 = h * (0.3 + Math.cos(t * 0.15) * 0.2);
      const cx2 = w * (0.7 + Math.sin(t * 0.12 + 3) * 0.15);
      const cy2 = h * (0.7 + Math.cos(t * 0.18 + 1) * 0.15);

      // Base fill (mostly opaque for trail effect)
      ctx!.fillStyle = `hsla(${hue1}, 40%, 6%, 0.25)`;
      ctx!.fillRect(0, 0, w, h);

      // Soft radial blob 1
      ctx!.save();
      const g1 = ctx!.createRadialGradient(cx1, cy1, 0, cx1, cy1, Math.max(w, h) * 0.5);
      g1.addColorStop(0, `hsla(${hue2}, 50%, 12%, 0.08)`);
      g1.addColorStop(1, `hsla(${hue2}, 50%, 5%, 0)`);
      ctx!.fillStyle = g1;
      ctx!.fillRect(0, 0, w, h);

      // Soft radial blob 2
      const g2 = ctx!.createRadialGradient(cx2, cy2, 0, cx2, cy2, Math.max(w, h) * 0.4);
      g2.addColorStop(0, `hsla(${hue3}, 45%, 10%, 0.06)`);
      g2.addColorStop(1, `hsla(${hue3}, 45%, 5%, 0)`);
      ctx!.fillStyle = g2;
      ctx!.fillRect(0, 0, w, h);

      // Multiplier-reactive warmth: higher multiplier = warmer glow from center
      if (gs.multiplier > 1) {
        const warmth = gs.multiplier >= 8 ? 0.06 : gs.multiplier >= 4 ? 0.04 : 0.02;
        const warmHue = gs.multiplier >= 8 ? 320 : gs.multiplier >= 4 ? 45 : 170;
        const gw = ctx!.createRadialGradient(centerX, centerY, 0, centerX, centerY, Math.min(w, h) * 0.5);
        gw.addColorStop(0, `hsla(${warmHue}, 60%, 20%, ${warmth})`);
        gw.addColorStop(1, `hsla(${warmHue}, 60%, 5%, 0)`);
        ctx!.fillStyle = gw;
        ctx!.fillRect(0, 0, w, h);
      }
      ctx!.restore();

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

      // Milestone splashes
      gs.splashes.forEach((s: { text: string; emoji: string; color: string; life: number; scale: number; y: number }) => {
        ctx!.save();
        ctx!.translate(w / 2, s.y);
        const ease = 1 - Math.pow(1 - s.scale, 3); // ease-out cubic
        ctx!.scale(ease, ease);
        ctx!.globalAlpha = Math.min(1, s.life * 2);
        // Emoji
        ctx!.font = `${60 + (s.text === '8×' ? 20 : 0)}px sans-serif`;
        ctx!.textAlign = 'center';
        ctx!.textBaseline = 'middle';
        ctx!.fillText(s.emoji, 0, -30);
        // Multiplier text
        ctx!.font = `bold ${48 + (s.text === '8×' ? 16 : 0)}px ui-monospace, monospace`;
        ctx!.fillStyle = s.color;
        ctx!.shadowColor = s.color;
        ctx!.shadowBlur = 30;
        ctx!.fillText(s.text, 0, 30);
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
