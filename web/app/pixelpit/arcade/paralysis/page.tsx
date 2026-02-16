'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';

// ─────────────────────────────────────────────
// PARALYSIS — A trading anxiety game
// Based on Drift's 9-day paralysis in Token Tank
// Dither says: "The screen should BREATHE with your indecision."
// ─────────────────────────────────────────────

const GAME_ID = 'paralysis';

// ── PALETTE (Indie Bite) ──
const C = {
  bg: '#09090b',
  cyan: '#22d3ee',
  green: '#a3e635',
  red: '#ef4444',
  gold: '#facc15',
  fuchsia: '#d946ef',
  white: '#f8fafc',
  dim: '#3f3f46',
  darkGray: '#18181b',
};

// ── GAME CONFIG ──
const ROUND_DURATION = 7000; // ms per round
const OBSERVATION_TIME = 1500; // ms before you can trade
const RESULT_DURATION = 2000; // ms to show result
const PARALYZED_DURATION = 1500;
const STARTING_CASH = 500;
const STARTING_NERVE = 100;
const NERVE_DRAIN_PER_SKIP = 18;
const NERVE_RECOVERY_PER_TRADE = 4;
const BUST_THRESHOLD = -250; // lose $250 = game over
const MAX_ROUNDS = 20;

// ── INTRO TEXT ──
const INTRO_LINES = [
  'DRIFT SAT IN CASH FOR 9 DAYS.',
  'HE CALLED IT DISCIPLINE.',
  'THE MARKET CALLED IT FEAR.',
  '',
  'TAP TO TRADE.',
];

// ── AUDIO ──
let audioCtx: AudioContext | null = null;
let masterGain: GainNode | null = null;

function initAudio() {
  if (audioCtx) return;
  audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  masterGain = audioCtx.createGain();
  masterGain.gain.value = 0.25;
  masterGain.connect(audioCtx.destination);
  if (audioCtx.state === 'suspended') audioCtx.resume();
}

function playPulse(bpm: number) {
  if (!audioCtx || !masterGain) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sine';
  osc.frequency.value = 40;
  gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);
  osc.connect(gain);
  gain.connect(masterGain!);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.15);
}

function playTrade() {
  if (!audioCtx || !masterGain) return;
  // Sharp metallic click
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'square';
  osc.frequency.value = 800;
  osc.frequency.exponentialRampToValueAtTime(200, audioCtx.currentTime + 0.05);
  gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.08);
  osc.connect(gain);
  gain.connect(masterGain!);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.08);
}

function playProfit(amount: number) {
  if (!audioCtx || !masterGain) return;
  // Bright ascending bell
  const baseFreq = 600 + amount * 8;
  [0, 80, 160].forEach((delay, i) => {
    setTimeout(() => {
      if (!audioCtx || !masterGain) return;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.value = baseFreq + i * 120;
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(masterGain!);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.3);
    }, delay);
  });
}

function playLoss() {
  if (!audioCtx || !masterGain) return;
  // Low boom with reverb tail
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sine';
  osc.frequency.value = 55;
  osc.frequency.exponentialRampToValueAtTime(30, audioCtx.currentTime + 0.6);
  gain.gain.setValueAtTime(0.25, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.8);
  osc.connect(gain);
  gain.connect(masterGain!);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.8);
  // Add noise burst
  const bufferSize = audioCtx.sampleRate * 0.3;
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
  }
  const noise = audioCtx.createBufferSource();
  noise.buffer = buffer;
  const noiseGain = audioCtx.createGain();
  noiseGain.gain.setValueAtTime(0.08, audioCtx.currentTime);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
  noise.connect(noiseGain);
  noiseGain.connect(masterGain!);
  noise.start();
}

function playParalyzed() {
  if (!audioCtx || !masterGain) return;
  // Low drone
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.value = 65;
  gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 1.2);
  osc.connect(gain);
  gain.connect(masterGain!);
  osc.start();
  osc.stop(audioCtx.currentTime + 1.2);
}

function playGameOver() {
  if (!audioCtx || !masterGain) return;
  // Descending chord that decays
  [220, 165, 130].forEach((freq, i) => {
    setTimeout(() => {
      if (!audioCtx || !masterGain) return;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      osc.frequency.exponentialRampToValueAtTime(freq * 0.8, audioCtx.currentTime + 2);
      gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 2.5);
      osc.connect(gain);
      gain.connect(masterGain!);
      osc.start();
      osc.stop(audioCtx.currentTime + 2.5);
    }, i * 200);
  });
}

// ── PRICE GENERATION ──
function generatePricePath(basePrice: number, roundNum: number): number[] {
  const points: number[] = [];
  const steps = 200;
  let price = basePrice;

  // Determine round character
  const isBullish = Math.random() > 0.45;
  const drift = isBullish ? 0.03 : -0.02;
  const volatility = 0.4 + roundNum * 0.04;

  // Create 2-3 dip opportunities
  const dipPositions = [
    0.25 + Math.random() * 0.1,
    0.5 + Math.random() * 0.1,
    0.75 + Math.random() * 0.1,
  ];
  const dipDepths = dipPositions.map(() => -(1.5 + Math.random() * 2.5));

  for (let i = 0; i < steps; i++) {
    const t = i / steps;

    // Base random walk
    price += drift + (Math.random() - 0.5) * volatility;

    // Add dip influence
    for (let d = 0; d < dipPositions.length; d++) {
      const dist = Math.abs(t - dipPositions[d]);
      if (dist < 0.06) {
        price += dipDepths[d] * Math.cos((dist / 0.06) * Math.PI * 0.5);
      }
    }

    // Keep in reasonable range
    price = Math.max(basePrice - 15, Math.min(basePrice + 15, price));
    points.push(price);
  }

  return points;
}

// Score a trade: how good was the entry relative to remaining price action
function scoreTrade(pricePath: number[], entryIndex: number): number {
  const entryPrice = pricePath[entryIndex];
  const remaining = pricePath.slice(entryIndex);
  const futureAvg = remaining.reduce((a, b) => a + b, 0) / remaining.length;
  const futurePeak = Math.max(...remaining);
  const bestCase = futurePeak - entryPrice;
  const avgCase = futureAvg - entryPrice;

  // Weighted: 60% average future, 40% peak opportunity
  const raw = avgCase * 0.6 + bestCase * 0.4;

  // Scale to dollar P&L
  return Math.round(raw * 3.5);
}

// ── PARTICLES ──
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

// ── MAIN COMPONENT ──
export default function ParalysisGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<{
    state: 'intro' | 'playing' | 'result' | 'paralyzed' | 'gameover';
    introLine: number;
    introTimer: number;
    introAlpha: number;
    // Game state
    cash: number;
    pnl: number;
    nerve: number;
    round: number;
    trades: number;
    skips: number;
    // Round state
    pricePath: number[];
    priceIndex: number;
    roundStartTime: number;
    canTrade: boolean;
    traded: boolean;
    tradeIndex: number;
    tradePnl: number;
    // Result display
    resultTimer: number;
    resultType: 'profit' | 'loss' | 'paralyzed' | '';
    // Effects
    shake: { x: number; y: number; decay: number };
    flash: { color: string; alpha: number };
    particles: Particle[];
    hitFreeze: number;
    vignette: number;
    staticNoise: number;
    // Pulse
    pulseTimer: number;
    pulseBpm: number;
    // Animation
    time: number;
    // Best trade
    bestTrade: number;
    worstTrade: number;
  }>({
    state: 'intro',
    introLine: 0,
    introTimer: 0,
    introAlpha: 0,
    cash: STARTING_CASH,
    pnl: 0,
    nerve: STARTING_NERVE,
    round: 0,
    trades: 0,
    skips: 0,
    pricePath: [],
    priceIndex: 0,
    roundStartTime: 0,
    canTrade: false,
    traded: false,
    tradeIndex: 0,
    tradePnl: 0,
    resultTimer: 0,
    resultType: '',
    shake: { x: 0, y: 0, decay: 0 },
    flash: { color: '', alpha: 0 },
    particles: [],
    hitFreeze: 0,
    vignette: 0.3,
    staticNoise: 0,
    pulseTimer: 0,
    pulseBpm: 70,
    time: 0,
    bestTrade: 0,
    worstTrade: 0,
  });

  const startRound = useCallback(() => {
    const g = gameRef.current;
    g.round++;
    if (g.round > MAX_ROUNDS) {
      g.state = 'gameover';
      playGameOver();
      return;
    }
    const basePrice = 42 + Math.random() * 16;
    g.pricePath = generatePricePath(basePrice, g.round);
    g.priceIndex = 0;
    g.roundStartTime = performance.now();
    g.canTrade = false;
    g.traded = false;
    g.tradeIndex = 0;
    g.tradePnl = 0;
    g.state = 'playing';
  }, []);

  const handleTrade = useCallback(() => {
    const g = gameRef.current;
    initAudio();

    if (g.state === 'intro') {
      // Skip to game
      g.state = 'playing';
      g.introLine = INTRO_LINES.length;
      startRound();
      return;
    }

    if (g.state === 'gameover') {
      // Reset
      g.cash = STARTING_CASH;
      g.pnl = 0;
      g.nerve = STARTING_NERVE;
      g.round = 0;
      g.trades = 0;
      g.skips = 0;
      g.bestTrade = 0;
      g.worstTrade = 0;
      g.particles = [];
      startRound();
      return;
    }

    if (g.state !== 'playing' || !g.canTrade || g.traded) return;

    // TRADE!
    g.traded = true;
    g.tradeIndex = g.priceIndex;
    g.trades++;

    playTrade();

    // Hit freeze — 50ms. Dither says: "Makes impact feel weighty."
    g.hitFreeze = 50;

    // Flash white for 2 frames
    g.flash = { color: C.white, alpha: 0.3 };

    // Nerve recovery
    g.nerve = Math.min(100, g.nerve + NERVE_RECOVERY_PER_TRADE);
  }, [startRound]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d')!;
    let animId: number;
    let lastTime = performance.now();

    function resize() {
      canvas!.width = window.innerWidth;
      canvas!.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    // ── GAME LOOP ──
    function update(now: number) {
      const dt = Math.min(now - lastTime, 50);
      lastTime = now;
      const g = gameRef.current;
      g.time = now;

      // Hit freeze
      if (g.hitFreeze > 0) {
        g.hitFreeze -= dt;
        animId = requestAnimationFrame(update);
        draw();
        return;
      }

      // ── INTRO STATE ──
      if (g.state === 'intro') {
        g.introTimer += dt;
        if (g.introTimer > 1200) {
          g.introTimer = 0;
          g.introLine++;
          if (g.introLine >= INTRO_LINES.length) {
            startRound();
          }
        }
        g.introAlpha = Math.min(1, g.introTimer / 400);
      }

      // ── PLAYING STATE ──
      if (g.state === 'playing') {
        const elapsed = now - g.roundStartTime;

        // Can trade after observation period
        if (elapsed > OBSERVATION_TIME && !g.canTrade) {
          g.canTrade = true;
        }

        // Advance price
        const speed = 200 / ROUND_DURATION; // points per ms
        g.priceIndex = Math.min(
          g.pricePath.length - 1,
          Math.floor(elapsed * speed * g.pricePath.length / 1000)
        );

        // If traded, check if enough time has passed to show result
        if (g.traded) {
          const timeSinceTrade = (g.priceIndex - g.tradeIndex) / g.pricePath.length;
          if (timeSinceTrade > 0.15 || g.priceIndex >= g.pricePath.length - 1) {
            // Score the trade
            g.tradePnl = scoreTrade(g.pricePath, g.tradeIndex);
            g.pnl += g.tradePnl;
            g.cash += g.tradePnl;

            if (g.tradePnl > g.bestTrade) g.bestTrade = g.tradePnl;
            if (g.tradePnl < g.worstTrade) g.worstTrade = g.tradePnl;

            if (g.tradePnl >= 0) {
              g.resultType = 'profit';
              playProfit(g.tradePnl);
              // Gold particles burst
              const cx = canvas!.width * 0.5;
              const cy = canvas!.height * 0.45;
              for (let i = 0; i < 20; i++) {
                const angle = (Math.PI * 2 * i) / 20 + Math.random() * 0.3;
                const speed = 2 + Math.random() * 4;
                g.particles.push({
                  x: cx, y: cy,
                  vx: Math.cos(angle) * speed,
                  vy: Math.sin(angle) * speed,
                  life: 1, maxLife: 1,
                  color: C.gold,
                  size: 3 + Math.random() * 3,
                });
              }
              // Screen shake
              g.shake = { x: 0, y: 0, decay: 4 };
            } else {
              g.resultType = 'loss';
              playLoss();
              // Red flash
              g.flash = { color: C.red, alpha: 0.4 };
              // Bigger shake
              g.shake = { x: 0, y: 0, decay: 6 };
            }

            g.resultTimer = RESULT_DURATION;
            g.state = 'result';

            // Check bust
            if (g.pnl <= BUST_THRESHOLD) {
              setTimeout(() => {
                g.state = 'gameover';
                playGameOver();
              }, RESULT_DURATION);
            }
          }
        }

        // Round timeout — no trade
        if (!g.traded && elapsed > ROUND_DURATION) {
          g.skips++;
          g.nerve -= NERVE_DRAIN_PER_SKIP;
          g.resultType = 'paralyzed';
          g.resultTimer = PARALYZED_DURATION;
          g.state = 'paralyzed';
          playParalyzed();
          g.flash = { color: C.fuchsia, alpha: 0.25 };

          // Check nerve death
          if (g.nerve <= 0) {
            g.nerve = 0;
            setTimeout(() => {
              g.state = 'gameover';
              playGameOver();
            }, PARALYZED_DURATION);
          }
        }

        // Pulse heartbeat
        const bpmInterval = 60000 / g.pulseBpm;
        g.pulseTimer += dt;
        if (g.pulseTimer > bpmInterval) {
          g.pulseTimer -= bpmInterval;
          playPulse(g.pulseBpm);
        }

        // Anxiety escalation based on nerve
        g.pulseBpm = 70 + (100 - g.nerve) * 0.8;
        g.vignette = 0.3 + (100 - g.nerve) * 0.005;
        g.staticNoise = (100 - g.nerve) / 100;
      }

      // ── RESULT / PARALYZED STATE ──
      if (g.state === 'result' || g.state === 'paralyzed') {
        g.resultTimer -= dt;
        if (g.resultTimer <= 0) {
          if (g.pnl <= BUST_THRESHOLD || g.nerve <= 0) {
            g.state = 'gameover';
            playGameOver();
          } else {
            startRound();
          }
        }
      }

      // ── UPDATE EFFECTS ──
      // Shake decay
      if (g.shake.decay > 0) {
        g.shake.x = (Math.random() - 0.5) * g.shake.decay * 2;
        g.shake.y = (Math.random() - 0.5) * g.shake.decay * 2;
        g.shake.decay *= 0.9;
        if (g.shake.decay < 0.3) g.shake.decay = 0;
      }

      // Flash decay
      if (g.flash.alpha > 0) {
        g.flash.alpha *= 0.92;
        if (g.flash.alpha < 0.01) g.flash.alpha = 0;
      }

      // Particles
      g.particles = g.particles.filter(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.05; // gravity
        p.life -= 0.02;
        return p.life > 0;
      });

      draw();
      animId = requestAnimationFrame(update);
    }

    // ── DRAW ──
    function draw() {
      const g = gameRef.current;
      const w = canvas!.width;
      const h = canvas!.height;

      ctx.save();
      ctx.translate(g.shake.x, g.shake.y);

      // Background
      ctx.fillStyle = C.bg;
      ctx.fillRect(-10, -10, w + 20, h + 20);

      // Static noise (anxiety)
      if (g.staticNoise > 0.1) {
        const imageData = ctx.getImageData(0, 0, w, h);
        const data = imageData.data;
        const intensity = g.staticNoise * 0.08;
        // Sample sparse pixels for performance
        for (let i = 0; i < data.length; i += 16) {
          if (Math.random() < intensity) {
            const v = Math.random() * 30;
            data[i] = v;
            data[i + 1] = v;
            data[i + 2] = v;
          }
        }
        ctx.putImageData(imageData, 0, 0);
      }

      // ── INTRO ──
      if (g.state === 'intro') {
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        for (let i = 0; i <= g.introLine && i < INTRO_LINES.length; i++) {
          const line = INTRO_LINES[i];
          const alpha = i === g.introLine ? g.introAlpha : 1;
          const isLast = i === INTRO_LINES.length - 1;

          ctx.font = isLast ? 'bold 16px monospace' : 'bold 18px monospace';
          ctx.fillStyle = isLast
            ? `rgba(250, 204, 21, ${alpha})`
            : line === ''
              ? 'transparent'
              : `rgba(248, 250, 252, ${alpha})`;

          if (isLast) {
            // Pulse the "TAP TO TRADE" text
            const pulse = 0.7 + Math.sin(g.time * 0.004) * 0.3;
            ctx.fillStyle = `rgba(250, 204, 21, ${alpha * pulse})`;
          }

          ctx.fillText(line, w / 2, h / 2 - 60 + i * 36);
        }
      }

      // ── PLAYING / RESULT / PARALYZED ──
      if (g.state === 'playing' || g.state === 'result' || g.state === 'paralyzed') {
        // Nerve bar at top
        const nerveWidth = (g.nerve / 100) * (w - 40);
        const nerveColor = g.nerve > 50 ? C.gold : g.nerve > 25 ? '#f97316' : C.red;
        ctx.fillStyle = C.darkGray;
        ctx.fillRect(20, 12, w - 40, 6);
        ctx.fillStyle = nerveColor;
        ctx.fillRect(20, 12, nerveWidth, 6);
        // Nerve glow
        ctx.shadowColor = nerveColor;
        ctx.shadowBlur = g.nerve < 30 ? 8 + Math.sin(g.time * 0.01) * 4 : 4;
        ctx.fillRect(20, 12, nerveWidth, 6);
        ctx.shadowBlur = 0;

        // NERVE label
        ctx.font = '10px monospace';
        ctx.fillStyle = C.dim;
        ctx.textAlign = 'left';
        ctx.fillText('NERVE', 20, 32);

        // P&L display top left
        ctx.font = 'bold 20px monospace';
        ctx.textAlign = 'left';
        const pnlStr = (g.pnl >= 0 ? '+' : '') + '$' + g.pnl.toFixed(0);
        ctx.fillStyle = g.pnl >= 0 ? C.green : C.red;
        ctx.shadowColor = g.pnl >= 0 ? C.green : C.red;
        ctx.shadowBlur = 8;
        ctx.fillText(pnlStr, 20, 60);
        ctx.shadowBlur = 0;

        // Cash
        ctx.font = '12px monospace';
        ctx.fillStyle = C.dim;
        ctx.fillText('$' + g.cash.toFixed(0), 20, 78);

        // Round counter top right
        ctx.textAlign = 'right';
        ctx.font = '12px monospace';
        ctx.fillStyle = C.dim;
        ctx.fillText(`ROUND ${g.round}/${MAX_ROUNDS}`, w - 20, 35);

        // Trades/Skips
        ctx.fillText(`${g.trades} traded / ${g.skips} skipped`, w - 20, 50);

        // ── PRICE CHART ──
        const chartLeft = 30;
        const chartRight = w - 30;
        const chartTop = 100;
        const chartBottom = h * 0.6;
        const chartW = chartRight - chartLeft;
        const chartH = chartBottom - chartTop;

        // Chart background
        ctx.fillStyle = 'rgba(24, 24, 27, 0.6)';
        ctx.fillRect(chartLeft - 5, chartTop - 5, chartW + 10, chartH + 10);

        // Grid lines
        ctx.strokeStyle = 'rgba(63, 63, 70, 0.3)';
        ctx.lineWidth = 0.5;
        for (let i = 0; i < 5; i++) {
          const y = chartTop + (chartH * i) / 4;
          ctx.beginPath();
          ctx.moveTo(chartLeft, y);
          ctx.lineTo(chartRight, y);
          ctx.stroke();
        }

        if (g.pricePath.length > 0) {
          // Price range for chart
          const visiblePrices = g.pricePath.slice(0, g.priceIndex + 1);
          const allPrices = g.pricePath;
          const minP = Math.min(...allPrices) - 2;
          const maxP = Math.max(...allPrices) + 2;

          const priceToY = (p: number) => chartTop + chartH - ((p - minP) / (maxP - minP)) * chartH;
          const indexToX = (i: number) => chartLeft + (i / g.pricePath.length) * chartW;

          // Draw price line
          ctx.beginPath();
          ctx.strokeStyle = C.cyan;
          ctx.lineWidth = 2;
          ctx.shadowColor = C.cyan;
          ctx.shadowBlur = 6;

          for (let i = 0; i <= g.priceIndex; i++) {
            const x = indexToX(i);
            const y = priceToY(g.pricePath[i]);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.stroke();
          ctx.shadowBlur = 0;

          // Current price dot
          if (g.priceIndex > 0) {
            const cx = indexToX(g.priceIndex);
            const cy = priceToY(g.pricePath[g.priceIndex]);
            const dotPulse = 4 + Math.sin(g.time * 0.008) * 1.5;
            ctx.beginPath();
            ctx.arc(cx, cy, dotPulse, 0, Math.PI * 2);
            ctx.fillStyle = C.cyan;
            ctx.shadowColor = C.cyan;
            ctx.shadowBlur = 12;
            ctx.fill();
            ctx.shadowBlur = 0;
          }

          // Trade marker
          if (g.traded && g.tradeIndex > 0) {
            const tx = indexToX(g.tradeIndex);
            const ty = priceToY(g.pricePath[g.tradeIndex]);
            // Vertical line
            ctx.strokeStyle = 'rgba(250, 204, 21, 0.5)';
            ctx.lineWidth = 1;
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.moveTo(tx, chartTop);
            ctx.lineTo(tx, chartBottom);
            ctx.stroke();
            ctx.setLineDash([]);
            // Diamond marker
            ctx.fillStyle = C.gold;
            ctx.shadowColor = C.gold;
            ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.moveTo(tx, ty - 6);
            ctx.lineTo(tx + 5, ty);
            ctx.lineTo(tx, ty + 6);
            ctx.lineTo(tx - 5, ty);
            ctx.closePath();
            ctx.fill();
            ctx.shadowBlur = 0;

            // Entry price label
            ctx.font = '11px monospace';
            ctx.fillStyle = C.gold;
            ctx.textAlign = 'center';
            ctx.fillText('$' + g.pricePath[g.tradeIndex].toFixed(2), tx, ty - 12);
          }

          // Current price display
          const currentPrice = g.pricePath[g.priceIndex];
          ctx.font = 'bold 32px monospace';
          ctx.textAlign = 'center';
          ctx.fillStyle = C.white;
          ctx.shadowColor = C.cyan;
          ctx.shadowBlur = 10;
          ctx.fillText('$' + currentPrice.toFixed(2), w / 2, chartBottom + 45);
          ctx.shadowBlur = 0;

          // Timer bar under chart
          if (g.state === 'playing') {
            const elapsed = g.time - g.roundStartTime;
            const progress = Math.min(1, elapsed / ROUND_DURATION);
            const barY = chartBottom + 65;
            ctx.fillStyle = C.darkGray;
            ctx.fillRect(chartLeft, barY, chartW, 3);
            const timerColor = progress > 0.8 ? C.red : progress > 0.6 ? C.gold : C.dim;
            ctx.fillStyle = timerColor;
            ctx.fillRect(chartLeft, barY, chartW * progress, 3);
          }
        }

        // ── TRADE BUTTON AREA ──
        if (g.state === 'playing' && g.canTrade && !g.traded) {
          const btnY = h * 0.78;
          const btnW = 200;
          const btnH = 56;
          const btnX = w / 2 - btnW / 2;

          // Button pulse — breathes with anxiety
          const pulseScale = 1 + Math.sin(g.time * (0.003 + (100 - g.nerve) * 0.0001)) * 0.03;
          const flickering = g.nerve < 25 && Math.random() > 0.85;

          ctx.save();
          ctx.translate(w / 2, btnY + btnH / 2);
          ctx.scale(pulseScale, pulseScale);
          ctx.translate(-w / 2, -(btnY + btnH / 2));

          // Button glow
          ctx.shadowColor = flickering ? C.red : C.gold;
          ctx.shadowBlur = 12 + Math.sin(g.time * 0.005) * 4;
          ctx.strokeStyle = flickering ? C.red : C.gold;
          ctx.lineWidth = 2;
          ctx.strokeRect(btnX, btnY, btnW, btnH);
          ctx.shadowBlur = 0;

          // Button fill
          ctx.fillStyle = flickering ? 'rgba(239, 68, 68, 0.1)' : 'rgba(250, 204, 21, 0.08)';
          ctx.fillRect(btnX, btnY, btnW, btnH);

          // Button text
          ctx.font = 'bold 22px monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = flickering ? C.red : C.gold;
          ctx.fillText('TRADE', w / 2, btnY + btnH / 2);

          ctx.restore();

          // "or wait..." text
          ctx.font = '11px monospace';
          ctx.fillStyle = `rgba(63, 63, 70, ${0.5 + Math.sin(g.time * 0.002) * 0.3})`;
          ctx.textAlign = 'center';
          ctx.fillText('...or wait', w / 2, btnY + btnH + 20);
        }

        // Observation period indicator
        if (g.state === 'playing' && !g.canTrade) {
          ctx.font = '13px monospace';
          ctx.fillStyle = C.dim;
          ctx.textAlign = 'center';
          ctx.fillText('READING THE CHART...', w / 2, h * 0.78 + 28);
        }

        // ── RESULT OVERLAY ──
        if (g.state === 'result') {
          const alpha = Math.min(1, g.resultTimer / 500);

          if (g.resultType === 'profit') {
            ctx.font = 'bold 40px monospace';
            ctx.textAlign = 'center';
            ctx.fillStyle = `rgba(163, 230, 53, ${alpha})`;
            ctx.shadowColor = C.green;
            ctx.shadowBlur = 20;
            ctx.fillText('+$' + Math.abs(g.tradePnl), w / 2, h * 0.78);
            ctx.shadowBlur = 0;
          } else if (g.resultType === 'loss') {
            ctx.font = 'bold 40px monospace';
            ctx.textAlign = 'center';
            ctx.fillStyle = `rgba(239, 68, 68, ${alpha})`;
            ctx.shadowColor = C.red;
            ctx.shadowBlur = 20;
            ctx.fillText('-$' + Math.abs(g.tradePnl), w / 2, h * 0.78);
            ctx.shadowBlur = 0;
          }
        }

        // ── PARALYZED OVERLAY ──
        if (g.state === 'paralyzed') {
          const alpha = Math.min(1, g.resultTimer / 400);
          // Fuchsia flash
          ctx.font = 'bold 36px monospace';
          ctx.textAlign = 'center';
          ctx.fillStyle = `rgba(217, 70, 239, ${alpha})`;
          ctx.shadowColor = C.fuchsia;
          ctx.shadowBlur = 30;
          ctx.fillText('PARALYZED', w / 2, h * 0.5);
          ctx.shadowBlur = 0;

          ctx.font = '14px monospace';
          ctx.fillStyle = `rgba(217, 70, 239, ${alpha * 0.6})`;
          ctx.fillText(`NERVE -${NERVE_DRAIN_PER_SKIP}`, w / 2, h * 0.5 + 35);
        }
      }

      // ── GAME OVER ──
      if (g.state === 'gameover') {
        const reason = g.nerve <= 0 ? 'FROZEN OUT' : g.pnl <= BUST_THRESHOLD ? 'BROKE' : 'FINAL BELL';

        ctx.textAlign = 'center';

        // Title
        ctx.font = 'bold 28px monospace';
        ctx.fillStyle = g.nerve <= 0 ? C.fuchsia : g.pnl <= BUST_THRESHOLD ? C.red : C.gold;
        ctx.shadowColor = ctx.fillStyle as string;
        ctx.shadowBlur = 20;
        ctx.fillText(reason, w / 2, h * 0.25);
        ctx.shadowBlur = 0;

        // Stats
        const stats = [
          { label: 'P&L', value: (g.pnl >= 0 ? '+' : '') + '$' + g.pnl.toFixed(0), color: g.pnl >= 0 ? C.green : C.red },
          { label: 'FINAL CASH', value: '$' + g.cash.toFixed(0), color: C.white },
          { label: 'TRADES', value: String(g.trades), color: C.cyan },
          { label: 'SKIPPED', value: String(g.skips), color: g.skips > 0 ? C.fuchsia : C.dim },
          { label: 'BEST TRADE', value: g.bestTrade > 0 ? '+$' + g.bestTrade : '--', color: C.green },
          { label: 'WORST TRADE', value: g.worstTrade < 0 ? '-$' + Math.abs(g.worstTrade) : '--', color: C.red },
          { label: 'NERVE LEFT', value: g.nerve + '%', color: g.nerve > 50 ? C.gold : C.red },
        ];

        stats.forEach((s, i) => {
          const y = h * 0.35 + i * 32;
          ctx.font = '11px monospace';
          ctx.fillStyle = C.dim;
          ctx.textAlign = 'right';
          ctx.fillText(s.label, w / 2 - 10, y);
          ctx.font = 'bold 16px monospace';
          ctx.fillStyle = s.color;
          ctx.textAlign = 'left';
          ctx.fillText(s.value, w / 2 + 10, y);
        });

        // Drift's actual record
        ctx.font = '11px monospace';
        ctx.fillStyle = C.dim;
        ctx.textAlign = 'center';
        ctx.fillText('DRIFT\'S ACTUAL RECORD: -$4.69 / 9 DAYS IN CASH', w / 2, h * 0.72);

        // Retry
        const retryPulse = 0.5 + Math.sin(g.time * 0.004) * 0.5;
        ctx.font = 'bold 16px monospace';
        ctx.fillStyle = `rgba(250, 204, 21, ${retryPulse})`;
        ctx.fillText('TAP TO RETRY', w / 2, h * 0.82);
      }

      // ── PARTICLES ──
      g.particles.forEach(p => {
        ctx.globalAlpha = p.life / p.maxLife;
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 4;
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      });
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;

      // ── FLASH OVERLAY ──
      if (g.flash.alpha > 0) {
        ctx.fillStyle = g.flash.color;
        ctx.globalAlpha = g.flash.alpha;
        ctx.fillRect(-10, -10, w + 20, h + 20);
        ctx.globalAlpha = 1;
      }

      // ── VIGNETTE ──
      const vg = ctx.createRadialGradient(w / 2, h / 2, w * 0.25, w / 2, h / 2, w * 0.75);
      vg.addColorStop(0, 'transparent');
      vg.addColorStop(1, `rgba(0, 0, 0, ${g.vignette})`);
      ctx.fillStyle = vg;
      ctx.fillRect(-10, -10, w + 20, h + 20);

      // ── SCANLINES (subtle) ──
      ctx.fillStyle = 'rgba(0, 0, 0, 0.04)';
      for (let y = 0; y < h; y += 3) {
        ctx.fillRect(0, y, w, 1);
      }

      ctx.restore();
    }

    // ── INPUT ──
    const handleTouch = (e: TouchEvent) => {
      e.preventDefault();
      handleTrade();
    };
    const handleClick = () => handleTrade();

    canvas.addEventListener('touchstart', handleTouch, { passive: false });
    canvas.addEventListener('click', handleClick);

    animId = requestAnimationFrame(update);

    return () => {
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('touchstart', handleTouch);
      canvas.removeEventListener('click', handleClick);
      cancelAnimationFrame(animId);
    };
  }, [handleTrade, startRound]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        display: 'block',
        width: '100vw',
        height: '100vh',
        touchAction: 'none',
        cursor: 'pointer',
        background: C.bg,
      }}
    />
  );
}
