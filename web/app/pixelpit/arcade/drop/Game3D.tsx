'use client';

import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

const PLATFORM_COUNT = 25;
const PLATFORM_SPACING = 4;
const TOWER_RADIUS = 0.4;
const PLATFORM_OUTER_RADIUS = 2;
const PLATFORM_THICKNESS = 0.5;
const BALL_RADIUS = 0.25;
const BOUNCE_VY = 0.05;        // initial bounce when game starts
const BOUNCE_DAMPING = 0.4;    // each bounce = 40% of impact speed
const MIN_BOUNCE = 0.015;      // below this → ball rests
const GRAVITY = 0.016;         // per-frame gravity — dense rubber ball, not floaty
const MAX_FALL_SPEED = 0.5;    // terminal velocity — long freefalls keep accelerating

// C minor pentatonic — the game's musical key
const PENTATONIC = [261.63, 311.13, 349.23, 392.00, 466.16, 523.25, 622.25, 698.46];

// Step sequencer music — same architecture as BEAM/RAIN
const MUSIC = {
  bpm: 115,
  // C minor sub bass pattern (C2, Eb2, Bb1)
  bass: [65.41, 0, 65.41, 0, 0, 0, 77.78, 0, 65.41, 0, 0, 0, 58.27, 0, 58.27, 0],
  // Dark C minor arpeggios — 4 bars cycling
  arp: [
    [523.25, 622.25, 783.99, 622.25], // Cm
    [466.16, 523.25, 622.25, 523.25], // Bb
    [415.30, 523.25, 622.25, 523.25], // Ab
    [392.00, 466.16, 523.25, 466.16], // Gm
  ],
  // Four on the floor kick
  kick: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
  // Offbeat hats
  hat:  [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0],
};

// ─── Audio Engine ───────────────────────────────────────────

let audioCtx: AudioContext | null = null;
let masterGain: GainNode | null = null;

function initAudio() {
  if (audioCtx) return;
  audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  masterGain = audioCtx.createGain();
  masterGain.gain.value = 0.3;
  masterGain.connect(audioCtx.destination);
  if (audioCtx.state === 'suspended') audioCtx.resume();
}

// ─── SFX ────────────────────────────────────────────────────

// Musical pluck — pitch follows score up the pentatonic
function playBounce(score = 0) {
  if (!audioCtx || !masterGain) return;
  const noteIndex = Math.min(score % PENTATONIC.length, PENTATONIC.length - 1);
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'triangle';
  osc.frequency.value = PENTATONIC[noteIndex];
  gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.08);
  osc.connect(gain);
  gain.connect(masterGain);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.08);
}

// Satisfying downward sweep — pitch rises with combo
function playFallThrough(combo = 1) {
  if (!audioCtx || !masterGain) return;
  const startFreq = 300 + Math.min(combo, 8) * 80;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(startFreq, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.15);
  gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);
  osc.connect(gain);
  gain.connect(masterGain);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.15);
}

// Low boom + noise crash — dramatic death
function playThunder() {
  if (!audioCtx || !masterGain) return;
  const boom = audioCtx.createOscillator();
  const boomGain = audioCtx.createGain();
  boom.type = 'sine';
  boom.frequency.setValueAtTime(60, audioCtx.currentTime);
  boom.frequency.exponentialRampToValueAtTime(30, audioCtx.currentTime + 0.4);
  boomGain.gain.setValueAtTime(0.4, audioCtx.currentTime);
  boomGain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);
  boom.connect(boomGain);
  boomGain.connect(masterGain);
  boom.start();
  boom.stop(audioCtx.currentTime + 0.5);
  const bufferSize = audioCtx.sampleRate * 0.6;
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 3);
  }
  const noise = audioCtx.createBufferSource();
  noise.buffer = buffer;
  const filter = audioCtx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(800, audioCtx.currentTime);
  filter.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.4);
  const noiseGain = audioCtx.createGain();
  noiseGain.gain.setValueAtTime(0.3, audioCtx.currentTime);
  noise.connect(filter);
  filter.connect(noiseGain);
  noiseGain.connect(masterGain);
  noise.start();
}

// Glass shatter — crystalline burst + low impact thud
function playGlassShatter(chain = 1) {
  if (!audioCtx || !masterGain) return;
  const t = audioCtx.currentTime;
  // Bright shimmer — filtered noise burst
  const len = audioCtx.sampleRate * 0.35;
  const buffer = audioCtx.createBuffer(1, len, audioCtx.sampleRate);
  const d = buffer.getChannelData(0);
  for (let i = 0; i < len; i++) {
    d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 1.5);
  }
  const noise = audioCtx.createBufferSource();
  noise.buffer = buffer;
  const hp = audioCtx.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 3000 + Math.min(chain, 6) * 800;
  const lp = audioCtx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 10000 + Math.min(chain, 6) * 1000;
  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(0.3, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
  noise.connect(hp);
  hp.connect(lp);
  lp.connect(gain);
  gain.connect(masterGain);
  noise.start();
  // Crystalline ping
  const ping = audioCtx.createOscillator();
  const pingGain = audioCtx.createGain();
  ping.type = 'sine';
  ping.frequency.value = 1200 + Math.min(chain, 8) * 200;
  pingGain.gain.setValueAtTime(0.15, t);
  pingGain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
  ping.connect(pingGain);
  pingGain.connect(masterGain);
  ping.start();
  ping.stop(t + 0.15);
  // Low impact thud — gives the shatter physical weight
  const thud = audioCtx.createOscillator();
  const thudGain = audioCtx.createGain();
  thud.type = 'sine';
  thud.frequency.setValueAtTime(80, t);
  thud.frequency.exponentialRampToValueAtTime(40, t + 0.1);
  thudGain.gain.setValueAtTime(0.2, t);
  thudGain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
  thud.connect(thudGain);
  thudGain.connect(masterGain);
  thud.start();
  thud.stop(t + 0.12);
}

// Power smash — heavy crunch when power ball breaks through
function playSmash() {
  if (!audioCtx || !masterGain) return;
  const t = audioCtx.currentTime;
  // Impact thud
  const osc = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(100, t);
  osc.frequency.exponentialRampToValueAtTime(30, t + 0.15);
  g.gain.setValueAtTime(0.35, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
  osc.connect(g);
  g.connect(masterGain);
  osc.start();
  osc.stop(t + 0.15);
  // Crunch noise
  const len = audioCtx.sampleRate * 0.1;
  const buf = audioCtx.createBuffer(1, len, audioCtx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2);
  const n = audioCtx.createBufferSource();
  n.buffer = buf;
  const bp = audioCtx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 1500;
  bp.Q.value = 2;
  const ng = audioCtx.createGain();
  ng.gain.setValueAtTime(0.15, t);
  ng.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
  n.connect(bp);
  bp.connect(ng);
  ng.connect(masterGain);
  n.start();
}

// Fireball smash — massive impact, explosive, rewarding
function playFireballSmash() {
  if (!audioCtx || !masterGain) return;
  const t = audioCtx.currentTime;
  // Deep boom
  const boom = audioCtx.createOscillator();
  const boomG = audioCtx.createGain();
  boom.type = 'sine';
  boom.frequency.setValueAtTime(150, t);
  boom.frequency.exponentialRampToValueAtTime(25, t + 0.25);
  boomG.gain.setValueAtTime(0.45, t);
  boomG.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
  boom.connect(boomG);
  boomG.connect(masterGain);
  boom.start();
  boom.stop(t + 0.3);
  // Bright impact ping
  const ping = audioCtx.createOscillator();
  const pingG = audioCtx.createGain();
  ping.type = 'square';
  ping.frequency.setValueAtTime(800, t);
  ping.frequency.exponentialRampToValueAtTime(200, t + 0.1);
  pingG.gain.setValueAtTime(0.12, t);
  pingG.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
  ping.connect(pingG);
  pingG.connect(masterGain);
  ping.start();
  ping.stop(t + 0.1);
  // Explosion noise burst
  const len = audioCtx.sampleRate * 0.2;
  const buf = audioCtx.createBuffer(1, len, audioCtx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
  const n = audioCtx.createBufferSource();
  n.buffer = buf;
  const lp = audioCtx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.setValueAtTime(3000, t);
  lp.frequency.exponentialRampToValueAtTime(500, t + 0.2);
  const ng = audioCtx.createGain();
  ng.gain.setValueAtTime(0.25, t);
  ng.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
  n.connect(lp);
  lp.connect(ng);
  ng.connect(masterGain);
  n.start();
}

// Fireball collect — aggressive rising power chord + sub rumble
function playFireballCollect() {
  if (!audioCtx || !masterGain) return;
  const t = audioCtx.currentTime;
  // Sub rumble
  const sub = audioCtx.createOscillator();
  const subG = audioCtx.createGain();
  sub.type = 'sine';
  sub.frequency.setValueAtTime(40, t);
  sub.frequency.exponentialRampToValueAtTime(80, t + 0.3);
  subG.gain.setValueAtTime(0.35, t);
  subG.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
  sub.connect(subG); subG.connect(masterGain);
  sub.start(); sub.stop(t + 0.4);
  // Power chord — fast ascending fifths
  [261.63, 392.00, 523.25, 783.99].forEach((freq, i) => {
    const osc = audioCtx!.createOscillator();
    const g = audioCtx!.createGain();
    osc.type = 'sawtooth';
    osc.frequency.value = freq;
    g.gain.setValueAtTime(0.12, t + i * 0.04);
    g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.04 + 0.15);
    osc.connect(g); g.connect(masterGain!);
    osc.start(t + i * 0.04); osc.stop(t + i * 0.04 + 0.15);
  });
}

// Shield collect — electric zap + crystalline ring
function playShieldCollect() {
  if (!audioCtx || !masterGain) return;
  const t = audioCtx.currentTime;
  // Electric zap — fast frequency sweep
  const zap = audioCtx.createOscillator();
  const zapG = audioCtx.createGain();
  zap.type = 'square';
  zap.frequency.setValueAtTime(200, t);
  zap.frequency.exponentialRampToValueAtTime(2000, t + 0.08);
  zap.frequency.exponentialRampToValueAtTime(600, t + 0.2);
  zapG.gain.setValueAtTime(0.15, t);
  zapG.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
  zap.connect(zapG); zapG.connect(masterGain);
  zap.start(); zap.stop(t + 0.25);
  // Crystalline ring — high sine with shimmer
  [1046.5, 1318.5, 1568.0].forEach((freq, i) => {
    const osc = audioCtx!.createOscillator();
    const g = audioCtx!.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    g.gain.setValueAtTime(0.1, t + 0.05 + i * 0.03);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.05 + i * 0.03 + 0.3);
    osc.connect(g); g.connect(masterGain!);
    osc.start(t + 0.05 + i * 0.03); osc.stop(t + 0.05 + i * 0.03 + 0.3);
  });
}

// Score2x collect — coin cascade + triumphant fanfare
function playScore2xCollect() {
  if (!audioCtx || !masterGain) return;
  const t = audioCtx.currentTime;
  // Rapid coin cascade
  [784, 988, 1175, 1319, 1568].forEach((freq, i) => {
    const osc = audioCtx!.createOscillator();
    const g = audioCtx!.createGain();
    osc.type = 'triangle';
    osc.frequency.value = freq;
    g.gain.setValueAtTime(0.15, t + i * 0.035);
    g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.035 + 0.1);
    osc.connect(g); g.connect(masterGain!);
    osc.start(t + i * 0.035); osc.stop(t + i * 0.035 + 0.1);
  });
  // Fanfare chord at the peak
  const chord = audioCtx.createOscillator();
  const cg = audioCtx.createGain();
  chord.type = 'sine';
  chord.frequency.value = 1568;
  cg.gain.setValueAtTime(0.2, t + 0.18);
  cg.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
  chord.connect(cg); cg.connect(masterGain);
  chord.start(t + 0.18); chord.stop(t + 0.5);
}

// Powerup collect — dispatches to per-type SFX
function playPowerupCollect(type: PowerupType = 'fireball') {
  if (type === 'fireball') playFireballCollect();
  else if (type === 'shield') playShieldCollect();
  else if (type === 'score2x') playScore2xCollect();
}

// Shield absorb — heavy electric crack + descending buzz
function playShieldBreak() {
  if (!audioCtx || !masterGain) return;
  const t = audioCtx.currentTime;
  // Electric crack
  const len = audioCtx.sampleRate * 0.15;
  const buf = audioCtx.createBuffer(1, len, audioCtx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2);
  const noise = audioCtx.createBufferSource();
  noise.buffer = buf;
  const bp = audioCtx.createBiquadFilter();
  bp.type = 'bandpass'; bp.frequency.value = 3000; bp.Q.value = 3;
  const ng = audioCtx.createGain();
  ng.gain.setValueAtTime(0.25, t);
  ng.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
  noise.connect(bp); bp.connect(ng); ng.connect(masterGain);
  noise.start();
  // Descending buzz
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(1200, t);
  osc.frequency.exponentialRampToValueAtTime(150, t + 0.25);
  gain.gain.setValueAtTime(0.15, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
  osc.connect(gain); gain.connect(masterGain);
  osc.start(); osc.stop(t + 0.3);
}

// ─── Music Engine (step sequencer, same arch as BEAM) ───────

let musicInterval: ReturnType<typeof setInterval> | null = null;
let musicStep = 0;
let musicScore = 0;

function playMusicKick() {
  if (!audioCtx || !masterGain) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  const filter = audioCtx.createBiquadFilter();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(120, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(35, audioCtx.currentTime + 0.12);
  filter.type = 'lowpass';
  filter.frequency.value = 200;
  gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.2);
  osc.connect(filter);
  filter.connect(gain);
  gain.connect(masterGain);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.2);
}

function playMusicHat() {
  if (!audioCtx || !masterGain) return;
  const len = audioCtx.sampleRate * 0.05;
  const buffer = audioCtx.createBuffer(1, len, audioCtx.sampleRate);
  const d = buffer.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  const noise = audioCtx.createBufferSource();
  noise.buffer = buffer;
  const hp = audioCtx.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 7000;
  const lp = audioCtx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 12000;
  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(0.06, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.05);
  noise.connect(hp);
  hp.connect(lp);
  lp.connect(gain);
  gain.connect(masterGain);
  noise.start();
}

function playMusicBass(freq: number) {
  if (!audioCtx || !masterGain) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  const filter = audioCtx.createBiquadFilter();
  osc.type = 'sine';
  osc.frequency.value = freq;
  filter.type = 'lowpass';
  filter.frequency.value = 180;
  gain.gain.setValueAtTime(0.18, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.2);
  osc.connect(filter);
  filter.connect(gain);
  gain.connect(masterGain);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.2);
}

function playMusicArp(freq: number) {
  if (!audioCtx || !masterGain) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  const filter = audioCtx.createBiquadFilter();
  osc.type = 'triangle';
  osc.frequency.value = freq;
  filter.type = 'lowpass';
  filter.frequency.value = 1800;
  gain.gain.setValueAtTime(0.06, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);
  osc.connect(filter);
  filter.connect(gain);
  gain.connect(masterGain);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.15);
}

function musicTick() {
  const step = musicStep % 16;
  const bar = Math.floor(musicStep / 16) % 4;

  // Kick — always playing (the pulse)
  if (MUSIC.kick[step]) playMusicKick();

  // Bass — enters after score 2
  if (musicScore >= 2 && MUSIC.bass[step]) playMusicBass(MUSIC.bass[step]);

  // Hats — enters after score 5
  if (musicScore >= 5 && MUSIC.hat[step]) playMusicHat();

  // Arps — enters after score 10, plays every 4th step
  if (musicScore >= 10 && step % 4 === 0) {
    playMusicArp(MUSIC.arp[bar][step / 4]);
  }

  musicStep++;
}

function startMusic() {
  stopMusic();
  musicStep = 0;
  musicScore = 0;
  const stepMs = (60 / MUSIC.bpm / 4) * 1000; // 16th note
  musicTick(); // Play first beat immediately
  musicInterval = setInterval(musicTick, stepMs);
}

function stopMusic() {
  if (musicInterval) {
    clearInterval(musicInterval);
    musicInterval = null;
  }
}

// ─── Gap Generation (chutes / drop corridors) ──────────────

let genRunAngle = 0;        // current chute angle
let genRunRemaining = 0;    // platforms left in this chute
let genTotalPlatforms = 0;  // tracks depth for difficulty ramp

function resetGenState() {
  genRunAngle = 0;
  genRunRemaining = 0;
  genTotalPlatforms = 0;
}

function generatePlatformGap(index: number): { gapAngle: number; gapSize: number } {
  genTotalPlatforms++;
  const depth = genTotalPlatforms;

  // Difficulty ramp: chutes get more frequent and longer over time
  const chuteChance = Math.min(0.15 + depth * 0.008, 0.55);   // 15% → 55%
  const minRun = Math.floor(2 + depth * 0.04);                  // 2 → 6
  const maxRun = Math.floor(4 + depth * 0.08);                  // 4 → 12

  // Gap size shrinks with depth — difficulty by tightening (Key #7)
  const baseGap = Math.max(0.6, 1.2 - depth * 0.02);

  if (genRunRemaining > 0) {
    // Continue the chute — slight drift so it's not perfectly boring
    genRunRemaining--;
    const drift = (Math.random() - 0.5) * 0.25;
    return { gapAngle: genRunAngle + drift, gapSize: baseGap + 0.15 };
  }

  // Maybe start a new chute
  if (index > 2 && Math.random() < chuteChance) {
    const runLen = minRun + Math.floor(Math.random() * (maxRun - minRun + 1));
    genRunAngle = Math.random() * Math.PI * 2;
    genRunRemaining = runLen - 1; // -1 because this platform is the first
    return { gapAngle: genRunAngle, gapSize: baseGap + 0.15 };
  }

  // Normal random gap
  return { gapAngle: Math.random() * Math.PI * 2, gapSize: baseGap };
}

// ─── Game Types ─────────────────────────────────────────────

type PowerupType = 'none' | 'fireball' | 'shield' | 'score2x';

interface PlatformData {
  y: number;
  gapAngle: number;
  gapSize: number;
  secondGapAngle: number; // escape route gap (only used when hasGlass)
  secondGapSize: number;
  hasStorm: boolean;
  stormAngle: number;
  stormSize: number;
  hasGlass: boolean;
  glassBroken: boolean;
  powerup: PowerupType;
  powerupAngle: number;
  powerupSize: number;
  powerupCollected: boolean;
  passed: boolean;
}

// ─── Glass Shard Particles ──────────────────────────────────

interface Shard {
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
  life: number;
}

const MAX_SHARDS = 120;
let shards: Shard[] = [];

function spawnShards(worldY: number, angle: number, rotation: number, count = 20) {
  const actualAngle = angle + rotation;
  const midR = (TOWER_RADIUS + PLATFORM_OUTER_RADIUS) / 2;
  const cx = Math.cos(actualAngle) * midR;
  const cz = -Math.sin(actualAngle) * midR;
  for (let i = 0; i < count; i++) {
    // Shards explode outward from break point
    const outAngle = actualAngle + (Math.random() - 0.5) * 1.5;
    const outSpeed = 0.08 + Math.random() * 0.15;
    shards.push({
      x: cx + (Math.random() - 0.5) * 0.4,
      y: worldY + PLATFORM_THICKNESS / 2,
      z: cz + (Math.random() - 0.5) * 0.4,
      vx: Math.cos(outAngle) * outSpeed,
      vy: Math.random() * 0.15 + 0.05,
      vz: -Math.sin(outAngle) * outSpeed,
      life: 1.0,
    });
  }
  if (shards.length > MAX_SHARDS) shards = shards.slice(-MAX_SHARDS);
}

const GAME_DURATION = 60;  // seconds
const GAME_FRAMES = GAME_DURATION * 60;  // at 60fps

interface GameState {
  ballY: number;
  ballVY: number;
  rotation: number;
  rotationVel: number;
  platforms: PlatformData[];
  score: number;
  combo: number;
  glassChain: number;
  glassBreakTimer: number;
  fireballTimer: number;  // frames remaining (5 sec = 300 frames)
  hasShield: boolean;
  score2xTimer: number;   // frames remaining (8 sec = 480 frames)
  timeLeft: number;       // frames remaining
  gameOver: boolean;
  started: boolean;
}

// ─── 3D Components ──────────────────────────────────────────

// Nintendo-style platform color palette — bright, saturated, cheerful
const PLATFORM_COLORS = [
  '#FF6B6B', // coral red
  '#FFA94D', // warm orange
  '#FFD43B', // golden yellow
  '#69DB7C', // leaf green
  '#4ECDC4', // teal
  '#74C0FC', // sky blue
  '#B197FC', // lavender
  '#F783AC', // bubblegum pink
];

function Tower({ rotation, ballY }: { rotation: number; ballY: number }) {
  return (
    <mesh rotation={[0, rotation, 0]} position={[0, ballY, 0]}>
      <cylinderGeometry args={[TOWER_RADIUS, TOWER_RADIUS, 200, 16]} />
      <meshStandardMaterial color="#f8f9fa" roughness={0.6} metalness={0.0} />
    </mesh>
  );
}

function createArcGeo(innerR: number, outerR: number, thetaStart: number, thetaLength: number, thickness: number) {
  const segs = Math.max(6, Math.round((thetaLength / (Math.PI * 2)) * 48));
  const shape = new THREE.Shape();
  shape.moveTo(Math.cos(thetaStart) * outerR, Math.sin(thetaStart) * outerR);
  for (let i = 1; i <= segs; i++) {
    const a = thetaStart + (i / segs) * thetaLength;
    shape.lineTo(Math.cos(a) * outerR, Math.sin(a) * outerR);
  }
  for (let i = segs; i >= 0; i--) {
    const a = thetaStart + (i / segs) * thetaLength;
    shape.lineTo(Math.cos(a) * innerR, Math.sin(a) * innerR);
  }
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, { depth: thickness, bevelEnabled: false });
  geo.translate(0, 0, -thickness / 2);
  geo.rotateX(-Math.PI / 2);
  return geo;
}

const norm2PI = (a: number) => ((a % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);

function Platform({
  y, gapAngle, gapSize, secondGapAngle, secondGapSize, hasStorm, stormAngle, stormSize,
  rotation, colorIndex, hasGlass, glassBroken,
  powerup, powerupAngle, powerupSize, powerupCollected,
}: {
  y: number; gapAngle: number; gapSize: number;
  secondGapAngle: number; secondGapSize: number;
  hasStorm: boolean; stormAngle: number; stormSize: number;
  rotation: number; colorIndex: number; hasGlass: boolean; glassBroken: boolean;
  powerup: PowerupType; powerupAngle: number; powerupSize: number; powerupCollected: boolean;
}) {
  const platformColor = PLATFORM_COLORS[((colorIndex % PLATFORM_COLORS.length) + PLATFORM_COLORS.length) % PLATFORM_COLORS.length];
  const arcs = useMemo(() => {
    const innerR = TOWER_RADIUS;
    const outerR = PLATFORM_OUTER_RADIUS;

    type Arc = { geo: THREE.BufferGeometry; kind: 'solid' | 'storm' | 'glass' | 'powerup' };
    const result: Arc[] = [];

    if (hasGlass && secondGapSize > 0.01) {
      // Two-gap platform: primary gap (glass-filled) + secondary gap (open escape route)
      const gaps = [
        { start: norm2PI(gapAngle - gapSize / 2), size: gapSize },
        { start: norm2PI(secondGapAngle - secondGapSize / 2), size: secondGapSize },
      ].sort((a, b) => a.start - b.start);

      // Solid arc from end of gap[0] to start of gap[1]
      const s1Start = gaps[0].start + gaps[0].size;
      const s1Len = norm2PI(gaps[1].start - s1Start);
      if (s1Len > 0.05) {
        result.push({ geo: createArcGeo(innerR, outerR, s1Start, s1Len, PLATFORM_THICKNESS), kind: 'solid' });
      }

      // Solid arc from end of gap[1] to start of gap[0]
      const s2Start = gaps[1].start + gaps[1].size;
      const s2Len = norm2PI(gaps[0].start - s2Start);
      if (s2Len > 0.05) {
        result.push({ geo: createArcGeo(innerR, outerR, s2Start, s2Len, PLATFORM_THICKNESS), kind: 'solid' });
      }

      // Glass fills the ENTIRE primary gap
      result.push({ geo: createArcGeo(innerR, outerR, norm2PI(gapAngle - gapSize / 2), gapSize, PLATFORM_THICKNESS), kind: 'glass' });
    } else {
      // Single-gap platform
      const solidStart = gapAngle + gapSize / 2;
      const solidLength = Math.PI * 2 - gapSize;

      if (hasStorm && stormSize > 0.01) {
        // Split solid around storm zone
        const off0 = norm2PI((stormAngle - stormSize / 2) - solidStart);
        const off1 = norm2PI((stormAngle + stormSize / 2) - solidStart);
        if (off0 >= solidLength && off1 >= solidLength) {
          result.push({ geo: createArcGeo(innerR, outerR, solidStart, solidLength, PLATFORM_THICKNESS), kind: 'solid' });
        } else if (off0 < off1 && off1 <= solidLength) {
          if (off0 > 0.02)
            result.push({ geo: createArcGeo(innerR, outerR, solidStart, off0, PLATFORM_THICKNESS), kind: 'solid' });
          result.push({ geo: createArcGeo(innerR, outerR, solidStart + off0, off1 - off0, PLATFORM_THICKNESS), kind: 'storm' });
          if (solidLength - off1 > 0.02)
            result.push({ geo: createArcGeo(innerR, outerR, solidStart + off1, solidLength - off1, PLATFORM_THICKNESS), kind: 'solid' });
        } else {
          result.push({ geo: createArcGeo(innerR, outerR, solidStart, solidLength, PLATFORM_THICKNESS), kind: 'solid' });
        }
      } else if (powerup !== 'none' && powerupSize > 0.01) {
        // Split solid around powerup zone
        const off0 = norm2PI((powerupAngle - powerupSize / 2) - solidStart);
        const off1 = norm2PI((powerupAngle + powerupSize / 2) - solidStart);
        if (off0 >= solidLength && off1 >= solidLength) {
          result.push({ geo: createArcGeo(innerR, outerR, solidStart, solidLength, PLATFORM_THICKNESS), kind: 'solid' });
        } else if (off0 < off1 && off1 <= solidLength) {
          if (off0 > 0.02)
            result.push({ geo: createArcGeo(innerR, outerR, solidStart, off0, PLATFORM_THICKNESS), kind: 'solid' });
          result.push({ geo: createArcGeo(innerR, outerR, solidStart + off0, off1 - off0, PLATFORM_THICKNESS), kind: 'powerup' });
          if (solidLength - off1 > 0.02)
            result.push({ geo: createArcGeo(innerR, outerR, solidStart + off1, solidLength - off1, PLATFORM_THICKNESS), kind: 'solid' });
        } else {
          result.push({ geo: createArcGeo(innerR, outerR, solidStart, solidLength, PLATFORM_THICKNESS), kind: 'solid' });
        }
      } else {
        // Plain solid
        result.push({ geo: createArcGeo(innerR, outerR, solidStart, solidLength, PLATFORM_THICKNESS), kind: 'solid' });
      }
    }

    return result;
  }, [gapAngle, gapSize, secondGapAngle, secondGapSize, hasStorm, stormAngle, stormSize, hasGlass, powerup, powerupAngle, powerupSize]);

  useEffect(() => {
    return () => { arcs.forEach(a => a.geo.dispose()); };
  }, [arcs]);

  return (
    <group position={[0, y, 0]} rotation={[0, rotation, 0]}>
      {arcs.map((a, i) => {
        if (a.kind === 'glass' && glassBroken) return null;
        const pColor = powerup === 'fireball' ? '#FFD700' : powerup === 'shield' ? '#00E5FF' : '#69DB7C';
        return (
          <group key={i}>
            <mesh geometry={a.geo}>
              {a.kind === 'glass' ? (
                <meshStandardMaterial
                  color="#d4d4d4"
                  emissive="#ffffff"
                  emissiveIntensity={0.15}
                  transparent
                  opacity={0.75}
                  roughness={0.1}
                  metalness={0.4}
                />
              ) : a.kind === 'powerup' ? (
                <meshStandardMaterial
                  color={powerupCollected ? platformColor : pColor}
                  emissive={powerupCollected ? platformColor : pColor}
                  emissiveIntensity={powerupCollected ? 0.1 : 0.5}
                  roughness={powerupCollected ? 0.4 : 0.15}
                  metalness={powerupCollected ? 0.0 : 0.3}
                />
              ) : a.kind === 'storm' ? (
                <meshStandardMaterial
                  color="#0d0d0d"
                  emissive="#CC1100"
                  emissiveIntensity={0.7}
                  roughness={0.15}
                  metalness={0.7}
                  toneMapped={false}
                />
              ) : (
                <meshStandardMaterial
                  color={platformColor}
                  emissive={platformColor}
                  emissiveIntensity={0.1}
                  roughness={0.4}
                  metalness={0.0}
                />
              )}
            </mesh>
            {/* Storm: hot glow layer — translucent red on top for molten lava look */}
            {a.kind === 'storm' && (
              <>
                <mesh geometry={a.geo}>
                  <meshStandardMaterial
                    color="#FF2200"
                    emissive="#FF4400"
                    emissiveIntensity={0.5}
                    transparent
                    opacity={0.18}
                    toneMapped={false}
                    depthWrite={false}
                  />
                </mesh>
                <mesh geometry={a.geo} position={[0, PLATFORM_THICKNESS * 0.51, 0]}>
                  <meshStandardMaterial
                    color="#FF0000"
                    emissive="#FF3300"
                    emissiveIntensity={1.0}
                    transparent
                    opacity={0.12}
                    toneMapped={false}
                    depthWrite={false}
                  />
                </mesh>
              </>
            )}
          </group>
        );
      })}
    </group>
  );
}

function Ball({ y, isFireball, hasShield, isScore2x }: {
  y: number; isFireball: boolean; hasShield: boolean; isScore2x: boolean;
}) {
  const x = (TOWER_RADIUS + PLATFORM_OUTER_RADIUS) / 2;
  const shieldRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);

  // Animate shield pulse and score2x glow
  useFrame(({ clock }) => {
    if (shieldRef.current) {
      const pulse = 1.5 + Math.sin(clock.elapsedTime * 6) * 0.15;
      shieldRef.current.scale.setScalar(pulse);
      (shieldRef.current.material as THREE.MeshStandardMaterial).opacity =
        0.2 + Math.sin(clock.elapsedTime * 8) * 0.08;
    }
    if (glowRef.current) {
      const pulse = 1.0 + Math.sin(clock.elapsedTime * 4) * 0.1;
      glowRef.current.scale.setScalar(pulse);
    }
  });

  const ballColor = isFireball ? '#FFD700' : isScore2x ? '#69DB7C' : hasShield ? '#66FFEE' : '#FF2244';
  const emissiveColor = isFireball ? '#FF6600' : isScore2x ? '#22CC55' : hasShield ? '#00CCB8' : '#FF2244';
  const intensity = isFireball ? 1.2 : isScore2x ? 0.7 : hasShield ? 0.5 : 0.08;
  return (
    <group position={[x, y, 0]}>
      <mesh>
        <sphereGeometry args={[BALL_RADIUS, 32, 32]} />
        <meshStandardMaterial
          color={ballColor}
          emissive={emissiveColor}
          emissiveIntensity={intensity}
          roughness={isFireball ? 0.0 : isScore2x ? 0.05 : hasShield ? 0.0 : 0.15}
          metalness={isFireball ? 0.8 : isScore2x ? 0.3 : hasShield ? 0.6 : 0.1}
          toneMapped={!(isFireball || isScore2x || hasShield)}
        />
      </mesh>
      {/* Fireball: double point lights + glow shell */}
      {isFireball && (
        <>
          <pointLight color="#FF6600" intensity={3} distance={6} />
          <pointLight color="#FFD700" intensity={1.5} distance={3} />
          <mesh>
            <sphereGeometry args={[BALL_RADIUS * 2.2, 16, 16]} />
            <meshStandardMaterial
              color="#FF8800" emissive="#FF6600" emissiveIntensity={0.8}
              transparent opacity={0.15} toneMapped={false}
            />
          </mesh>
        </>
      )}
      {/* Shield: pulsing electric bubble + hexagon wireframe + cyan light */}
      {hasShield && (
        <>
          <pointLight color="#00E5FF" intensity={2} distance={5} />
          <mesh ref={shieldRef}>
            <sphereGeometry args={[BALL_RADIUS * 1.6, 8, 6]} />
            <meshStandardMaterial
              color="#00E5FF" emissive="#00E5FF" emissiveIntensity={0.6}
              transparent opacity={0.2} roughness={0.0} metalness={0.8}
              toneMapped={false} wireframe
            />
          </mesh>
          {/* Inner solid glow */}
          <mesh>
            <sphereGeometry args={[BALL_RADIUS * 1.5, 16, 16]} />
            <meshStandardMaterial
              color="#00E5FF" emissive="#00E5FF" emissiveIntensity={0.3}
              transparent opacity={0.1} toneMapped={false}
            />
          </mesh>
        </>
      )}
      {/* Score2x: green glow shell + sparkle light */}
      {isScore2x && (
        <>
          <pointLight color="#69DB7C" intensity={2} distance={5} />
          <mesh ref={glowRef}>
            <sphereGeometry args={[BALL_RADIUS * 2.0, 16, 16]} />
            <meshStandardMaterial
              color="#69DB7C" emissive="#22CC55" emissiveIntensity={0.6}
              transparent opacity={0.12} toneMapped={false}
            />
          </mesh>
        </>
      )}
    </group>
  );
}

// ─── Background Particles ───────────────────────────────────

const PARTICLE_COUNT = 80;

function BackgroundParticles({ ballY }: { ballY: number }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const particleData = useRef<{ x: number; z: number; yOff: number; speed: number; size: number; phase: number }[]>([]);

  useMemo(() => {
    particleData.current = Array.from({ length: PARTICLE_COUNT }, () => ({
      x: (Math.random() - 0.5) * 28,
      z: (Math.random() - 0.5) * 28,
      yOff: (Math.random() - 0.5) * 35,
      speed: 0.15 + Math.random() * 0.4,
      size: 0.03 + Math.random() * 0.05,
      phase: Math.random() * Math.PI * 2,
    }));
  }, []);

  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame(({ clock }) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const t = clock.getElapsedTime();

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const p = particleData.current[i];
      const drift = Math.sin(t * 0.2 + p.phase) * 1.2;
      dummy.position.set(
        p.x + drift,
        ballY + p.yOff + Math.sin(t * p.speed + p.phase) * 1.5,
        p.z + Math.cos(t * 0.15 + p.phase) * 1.2,
      );
      const pulse = 0.6 + 0.4 * Math.sin(t * 2 + p.phase);
      dummy.scale.setScalar(p.size * pulse);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, PARTICLE_COUNT]}>
      <sphereGeometry args={[1, 6, 6]} />
      <meshBasicMaterial color="#ffffff" transparent opacity={0.25} />
    </instancedMesh>
  );
}

// ─── Glass Shard Renderer ───────────────────────────────────

function GlassShards() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    // Update shard physics
    for (let i = shards.length - 1; i >= 0; i--) {
      const s = shards[i];
      s.x += s.vx;
      s.y += s.vy;
      s.z += s.vz;
      s.vy -= 0.004; // gravity
      s.life -= 0.02;
      if (s.life <= 0) shards.splice(i, 1);
    }

    // Render
    for (let i = 0; i < MAX_SHARDS; i++) {
      if (i < shards.length) {
        const s = shards[i];
        dummy.position.set(s.x, s.y, s.z);
        dummy.scale.setScalar(0.04 * s.life);
        dummy.rotation.set(s.life * 10, s.life * 7, 0);
      } else {
        dummy.position.set(0, -1000, 0);
        dummy.scale.setScalar(0);
      }
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, MAX_SHARDS]}>
      <boxGeometry args={[1, 1, 0.3]} />
      <meshStandardMaterial color="#d4d4d4" emissive="#ffffff" emissiveIntensity={0.3} transparent opacity={0.8} />
    </instancedMesh>
  );
}

// ─── Game Scene ─────────────────────────────────────────────

function GameScene({
  onGameOver,
  onScoreUpdate,
  onPowerup
}: {
  onGameOver: (score: number) => void;
  onScoreUpdate: (score: number, combo: number, timeLeft: number) => void;
  onPowerup?: (type: PowerupType) => void;
}) {
  const { camera } = useThree();
  const gameState = useRef<GameState>({
    ballY: PLATFORM_THICKNESS / 2 + BALL_RADIUS + 0.01,
    ballVY: 0,
    rotation: 0,
    rotationVel: 0,
    platforms: [],
    score: 0,
    combo: 0,
    glassChain: 0,
    glassBreakTimer: 0,
    fireballTimer: 0,
    hasShield: false,
    score2xTimer: 0,
    timeLeft: GAME_FRAMES,
    gameOver: false,
    started: false,
  });

  const [, forceUpdate] = useState(0);
  const dragRef = useRef({ isDragging: false, lastX: 0 });

  // Initialize platforms + music
  useEffect(() => {
    initAudio();
    startMusic();
    resetGenState();

    shards = [];
    const platforms: PlatformData[] = [];
    platforms.push({
      y: 0,
      gapAngle: Math.PI,
      gapSize: 1.0,
      secondGapAngle: 0,
      secondGapSize: 0,
      hasStorm: false,
      stormAngle: 0,
      stormSize: 0,
      hasGlass: false,
      glassBroken: false,
      powerup: 'none',
      powerupAngle: 0,
      powerupSize: 0,
      powerupCollected: false,
      passed: false,
    });
    for (let i = 1; i < PLATFORM_COUNT; i++) {
      const { gapAngle, gapSize } = generatePlatformGap(i);
      const inChute = genRunRemaining > 0;
      // Storms ramp: 15% early → 70% late, aggressive ramp
      const stormChance = Math.min(0.15 + i * 0.012, 0.7);
      const hasStorm = !inChute && i > 3 && Math.random() < stormChance;
      // Glass ramp: 25% early → 45% late
      const glassChance = Math.min(0.25 + i * 0.005, 0.45);
      const hasGlass = !hasStorm && i > 1 && Math.random() < glassChance;
      // Glass platforms get a second escape gap on the opposite side
      const secondGapAngle = hasGlass ? norm2PI(gapAngle + Math.PI + (Math.random() - 0.5) * 1.0) : 0;
      const secondGapSize = hasGlass ? gapSize * 0.65 : 0;
      // Storm must NOT overlap the gap of the platform above (unfair death)
      const prevGap = platforms[i - 1];
      let stormAngle = 0;
      let stormSize = 0;
      if (hasStorm) {
        stormSize = 1.0 + Math.random() * 0.6;
        const margin = (prevGap.gapSize + stormSize) / 2 + 0.3;
        for (let attempt = 0; attempt < 20; attempt++) {
          stormAngle = Math.random() * Math.PI * 2;
          let d = Math.abs(stormAngle - prevGap.gapAngle);
          if (d > Math.PI) d = Math.PI * 2 - d;
          if (d > margin) break;
        }
      }
      // Powerups: ~10% on plain platforms (no storm, no glass), starting from level 5
      const hasPowerup = !hasStorm && !hasGlass && i > 5 && Math.random() < 0.18;
      // Fireball weighted 50%, shield 25%, score2x 25%
      const pickPowerup = (): PowerupType => {
        const r = Math.random();
        if (r < 0.5) return 'fireball';
        if (r < 0.75) return 'shield';
        return 'score2x';
      };
      const powerupType: PowerupType = hasPowerup ? pickPowerup() : 'none';
      const powerupAngle = hasPowerup ? norm2PI(gapAngle + Math.PI + (Math.random() - 0.5) * 2.0) : 0;
      const powerupSize = hasPowerup ? 0.6 : 0;
      platforms.push({
        y: -i * PLATFORM_SPACING,
        gapAngle,
        gapSize,
        secondGapAngle,
        secondGapSize,
        hasStorm,
        stormAngle,
        stormSize,
        hasGlass,
        glassBroken: false,
        powerup: powerupType,
        powerupAngle,
        powerupSize,
        powerupCollected: false,
        passed: false,
      });
    }
    gameState.current.platforms = platforms;
    gameState.current.ballY = PLATFORM_THICKNESS / 2 + BALL_RADIUS + 0.01;
    gameState.current.ballVY = 0;
    gameState.current.rotation = 0;
    gameState.current.score = 0;
    gameState.current.combo = 0;
    gameState.current.glassChain = 0;
    gameState.current.glassBreakTimer = 0;
    gameState.current.fireballTimer = 0;
    gameState.current.hasShield = false;
    gameState.current.score2xTimer = 0;
    gameState.current.timeLeft = GAME_FRAMES;
    gameState.current.gameOver = false;
    gameState.current.started = false;

    return () => { stopMusic(); };
  }, []);

  // Input handling
  useEffect(() => {
    const handleStart = (x: number) => {
      dragRef.current.isDragging = true;
      dragRef.current.lastX = x;
    };
    const handleMove = (x: number) => {
      if (!dragRef.current.isDragging) return;
      const dx = x - dragRef.current.lastX;
      gameState.current.rotationVel += dx * 0.005;
      dragRef.current.lastX = x;
      if (!gameState.current.started && Math.abs(dx) > 2) {
        gameState.current.started = true;
        gameState.current.ballVY = BOUNCE_VY; // Start bouncing!
      }
    };
    const handleEnd = () => {
      dragRef.current.isDragging = false;
    };

    const mouseDown = (e: MouseEvent) => handleStart(e.clientX);
    const mouseMove = (e: MouseEvent) => handleMove(e.clientX);
    const mouseUp = () => handleEnd();
    const touchStart = (e: TouchEvent) => { e.preventDefault(); handleStart(e.touches[0].clientX); };
    const touchMove = (e: TouchEvent) => { e.preventDefault(); handleMove(e.touches[0].clientX); };
    const touchEnd = () => handleEnd();

    window.addEventListener('mousedown', mouseDown);
    window.addEventListener('mousemove', mouseMove);
    window.addEventListener('mouseup', mouseUp);
    window.addEventListener('touchstart', touchStart, { passive: false });
    window.addEventListener('touchmove', touchMove, { passive: false });
    window.addEventListener('touchend', touchEnd);

    return () => {
      window.removeEventListener('mousedown', mouseDown);
      window.removeEventListener('mousemove', mouseMove);
      window.removeEventListener('mouseup', mouseUp);
      window.removeEventListener('touchstart', touchStart);
      window.removeEventListener('touchmove', touchMove);
      window.removeEventListener('touchend', touchEnd);
    };
  }, []);

  // Collision helpers
  const checkGap = (angle: number, p: PlatformData) => {
    let d = Math.abs(angle - p.gapAngle);
    if (d > Math.PI) d = Math.PI * 2 - d;
    return d < p.gapSize / 2;
  };
  const checkSecondGap = (angle: number, p: PlatformData) => {
    if (!p.hasGlass || p.secondGapSize < 0.01) return false;
    let d = Math.abs(angle - p.secondGapAngle);
    if (d > Math.PI) d = Math.PI * 2 - d;
    return d < p.secondGapSize / 2;
  };
  const checkStorm = (angle: number, p: PlatformData) => {
    if (!p.hasStorm) return false;
    let d = Math.abs(angle - p.stormAngle);
    if (d > Math.PI) d = Math.PI * 2 - d;
    return d < p.stormSize / 2;
  };
  const checkPowerup = (angle: number, p: PlatformData) => {
    if (p.powerup === 'none' || p.powerupCollected) return false;
    let d = Math.abs(angle - p.powerupAngle);
    if (d > Math.PI) d = Math.PI * 2 - d;
    return d < p.powerupSize / 2;
  };
  const collectPowerup = (p: PlatformData) => {
    p.powerupCollected = true;
    playPowerupCollect(p.powerup);
    const s = gameState.current;
    if (p.powerup === 'fireball') s.fireballTimer = 300;      // 5 seconds
    else if (p.powerup === 'shield') s.hasShield = true;
    else if (p.powerup === 'score2x') s.score2xTimer = 480;   // 8 seconds
    onPowerup?.(p.powerup);
  };

  // Game loop — Helix Jump style: ball always bounces, power ball on long drops
  useFrame(() => {
    const gs = gameState.current;
    if (gs.gameOver) return;

    musicScore = gs.score;

    // Powerup timers
    if (gs.fireballTimer > 0) gs.fireballTimer--;
    if (gs.score2xTimer > 0) gs.score2xTimer--;
    const scoreMult = gs.score2xTimer > 0 ? 2 : 1;

    // Countdown timer
    if (gs.started && gs.timeLeft > 0) {
      gs.timeLeft--;
      // Push time to HUD every ~6 frames (10x/sec) or on last frame
      if (gs.timeLeft % 6 === 0 || gs.timeLeft === 0) {
        onScoreUpdate(gs.score, gs.combo, Math.ceil(gs.timeLeft / 60));
      }
      if (gs.timeLeft <= 0) {
        gs.gameOver = true;
        stopMusic();
        onGameOver(gs.score);
        return;
      }
    }

    // Rotation always active
    gs.rotation += gs.rotationVel;
    gs.rotationVel *= 0.92;

    if (gs.started) {
      // Glass break freeze
      if (gs.glassBreakTimer > 0) {
        gs.glassBreakTimer--;
        if (gs.glassBreakTimer === 0) {
          // Mark the glass platform as passed and resume falling
          for (const p of gs.platforms) {
            if (p.hasGlass && p.glassBroken && !p.passed &&
                Math.abs(p.y + PLATFORM_THICKNESS / 2 + BALL_RADIUS - gs.ballY) < 0.3) {
              p.passed = true;
              break;
            }
          }
          gs.combo++;
          gs.score += gs.combo * 2 * scoreMult;
          onScoreUpdate(gs.score, gs.combo, Math.ceil(gs.timeLeft / 60));
          playFallThrough(gs.combo);
          gs.ballVY = -0.02; // Resume falling
        }
      } else {
        const ballAngle = norm2PI(-gs.rotation);

        // Ball at rest — check if gap rotates underneath
        if (gs.ballVY === 0) {
          for (const platform of gs.platforms) {
            if (platform.passed) continue;
            const platformTop = platform.y + PLATFORM_THICKNESS / 2;
            if (Math.abs((gs.ballY - BALL_RADIUS) - platformTop) < 0.1) {
              const inPrimaryGap = checkGap(ballAngle, platform);
              const inSecondGap = checkSecondGap(ballAngle, platform);
              if (inPrimaryGap || inSecondGap) {
                if (inPrimaryGap && platform.hasGlass && !platform.glassBroken) {
                  gs.ballY = platformTop + BALL_RADIUS;
                } else {
                  platform.passed = true;
                  gs.glassChain = 0;
                  gs.combo++;
                  gs.score += gs.combo * 2 * scoreMult;
                  onScoreUpdate(gs.score, gs.combo, Math.ceil(gs.timeLeft / 60));
                  playFallThrough(gs.combo);
                  gs.ballVY = -0.01;
                }
              } else if (checkStorm(ballAngle, platform)) {
                if (gs.hasShield) {
                  gs.hasShield = false;
                  playShieldBreak();
                  gs.ballY = platformTop + BALL_RADIUS;
                } else {
                  gs.gameOver = true;
                  stopMusic();
                  playThunder();
                  onGameOver(gs.score);
                  return;
                }
              } else {
                gs.ballY = platformTop + BALL_RADIUS;
                // Check powerup collection while resting
                if (checkPowerup(ballAngle, platform)) collectPowerup(platform);
              }
              break;
            }
          }
        }

        // Apply gravity (even when resting — if support vanishes, ball falls)
        if (gs.ballVY !== 0 || true) {
          if (gs.ballVY === 0) {
            // Check if still supported — skip gravity if so
            let supported = false;
            for (const p of gs.platforms) {
              if (p.passed) continue;
              const pTop = p.y + PLATFORM_THICKNESS / 2;
              if (Math.abs((gs.ballY - BALL_RADIUS) - pTop) < 0.1) {
                const angle = norm2PI(-gs.rotation);
                const inPrimary = checkGap(angle, p);
                const inSecond = checkSecondGap(angle, p);
                const glassBlocking = inPrimary && p.hasGlass && !p.glassBroken;
                if ((!inPrimary && !inSecond) || glassBlocking) { supported = true; }
                break;
              }
            }
            if (supported) {
              // Still resting — no gravity
            } else {
              gs.ballVY = -0.01; // Start falling
            }
          }

          if (gs.ballVY !== 0) {
            gs.ballVY -= GRAVITY;
            gs.ballVY = Math.max(gs.ballVY, -MAX_FALL_SPEED);

            const prevY = gs.ballY;
            gs.ballY += gs.ballVY;

            // Check collisions only when falling
            if (gs.ballVY < 0) {
              for (const platform of gs.platforms) {
                if (platform.passed) continue;
                const platformTop = platform.y + PLATFORM_THICKNESS / 2;

                if (prevY - BALL_RADIUS > platformTop && gs.ballY - BALL_RADIUS <= platformTop) {
                  const inPrimaryGap = checkGap(ballAngle, platform);
                  const inSecondGap = checkSecondGap(ballAngle, platform);
                  const isFireball = gs.fireballTimer > 0;

                  if (inPrimaryGap || inSecondGap) {
                    if (inPrimaryGap && platform.hasGlass && !platform.glassBroken) {
                      // Falling onto intact glass — SHATTER
                      if (isFireball) {
                        platform.glassBroken = true;
                        platform.passed = true;
                        gs.glassChain++;
                        gs.score += 15 * gs.glassChain * scoreMult;
                        gs.combo++;
                        onScoreUpdate(gs.score, gs.combo, Math.ceil(gs.timeLeft / 60));
                        playFireballSmash();
                        spawnShards(platform.y, platform.gapAngle, gs.rotation, 35);
                        gs.ballVY *= 0.85;
                      } else {
                        platform.glassBroken = true;
                        gs.glassChain++;
                        gs.score += 3 * gs.glassChain * scoreMult;
                        onScoreUpdate(gs.score, gs.combo, Math.ceil(gs.timeLeft / 60));
                        playGlassShatter(gs.glassChain);
                        spawnShards(platform.y, platform.gapAngle, gs.rotation, 20);
                        gs.ballY = platformTop + BALL_RADIUS;
                        gs.ballVY = 0;
                        gs.glassBreakTimer = 6;
                        break;
                      }
                    } else {
                      // Fall through open gap
                      platform.passed = true;
                      gs.glassChain = 0;
                      gs.combo++;
                      gs.score += gs.combo * 2 * scoreMult;
                      onScoreUpdate(gs.score, gs.combo, Math.ceil(gs.timeLeft / 60));
                      playFallThrough(gs.combo);
                    }
                  } else if (checkStorm(ballAngle, platform)) {
                    if (isFireball) {
                      // Fireball smashes through storms — BIG reward
                      platform.passed = true;
                      gs.score += 30 * scoreMult;
                      gs.combo++;
                      onScoreUpdate(gs.score, gs.combo, Math.ceil(gs.timeLeft / 60));
                      playFireballSmash();
                      spawnShards(platform.y, ballAngle, gs.rotation, 40);
                      gs.ballVY *= 0.7;
                    } else if (gs.hasShield) {
                      // Shield absorbs storm — bounce off safely
                      gs.hasShield = false;
                      playShieldBreak();
                      gs.ballY = platformTop + BALL_RADIUS;
                      gs.ballVY = Math.abs(gs.ballVY) * BOUNCE_DAMPING;
                      gs.combo = 0;
                      break;
                    } else {
                      gs.gameOver = true;
                      stopMusic();
                      playThunder();
                      onGameOver(gs.score);
                      return;
                    }
                  } else {
                    // Solid platform
                    if (isFireball) {
                      // Fireball smashes through solid — big reward
                      platform.passed = true;
                      gs.score += 20 * scoreMult;
                      gs.combo++;
                      onScoreUpdate(gs.score, gs.combo, Math.ceil(gs.timeLeft / 60));
                      playFireballSmash();
                      spawnShards(platform.y, ballAngle, gs.rotation, 30);
                      gs.ballVY *= 0.7;
                    } else {
                      // Normal bounce
                      gs.ballY = platformTop + BALL_RADIUS;
                      const bounceSpeed = Math.abs(gs.ballVY) * BOUNCE_DAMPING;
                      if (bounceSpeed < MIN_BOUNCE) {
                        gs.ballVY = 0;
                      } else {
                        gs.ballVY = bounceSpeed;
                      }
                      gs.combo = 0;
                      gs.glassChain = 0;
                      gs.score += 1 * scoreMult;
                      onScoreUpdate(gs.score, gs.combo, Math.ceil(gs.timeLeft / 60));
                      playBounce(gs.score);
                      // Collect powerup on bounce landing
                      if (checkPowerup(ballAngle, platform)) collectPowerup(platform);
                      break;
                    }
                  }
                }
              }
            }
          }
        }
      }
    }

    // Camera — smooth follow, biased downward (doesn't jerk up on bounce)
    const targetCamY = gs.ballY + 3;
    if (targetCamY < camera.position.y) {
      camera.position.y += (targetCamY - camera.position.y) * 0.15;
    } else {
      camera.position.y += (targetCamY - camera.position.y) * 0.01;
    }
    camera.lookAt(0, camera.position.y - 3, 0);

    // Screen shake during fireball — amplifies the rush (Key #5)
    if (gs.fireballTimer > 0) {
      const intensity = 0.08;
      camera.position.x += (Math.random() - 0.5) * intensity;
      camera.position.z += (Math.random() - 0.5) * intensity;
    }

    // Dynamic platform generation with ramping difficulty
    const lowestPlatform = gs.platforms[gs.platforms.length - 1];
    if (lowestPlatform && gs.ballY < lowestPlatform.y + 10) {
      const newY = lowestPlatform.y - PLATFORM_SPACING;
      const { gapAngle, gapSize } = generatePlatformGap(gs.platforms.length);
      const inChute = genRunRemaining > 0;
      const depth = genTotalPlatforms;
      const stormChance = Math.min(0.15 + depth * 0.01, 0.75);
      const hasStorm = !inChute && Math.random() < stormChance;
      const glassChance = Math.min(0.25 + depth * 0.004, 0.5);
      const hasGlass = !hasStorm && Math.random() < glassChance;
      const stormGrowth = Math.min(depth * 0.008, 0.45);
      const secAngle = hasGlass ? norm2PI(gapAngle + Math.PI + (Math.random() - 0.5) * 1.0) : 0;
      const secSize = hasGlass ? gapSize * 0.65 : 0;
      // Storm must NOT overlap the gap of the platform above (unfair death)
      let dynStormAngle = 0;
      let dynStormSize = 0;
      if (hasStorm) {
        dynStormSize = 0.8 + Math.random() * 0.6 + stormGrowth;
        const prevGap = lowestPlatform;
        const margin = (prevGap.gapSize + dynStormSize) / 2 + 0.3;
        for (let attempt = 0; attempt < 20; attempt++) {
          dynStormAngle = Math.random() * Math.PI * 2;
          let d = Math.abs(dynStormAngle - prevGap.gapAngle);
          if (d > Math.PI) d = Math.PI * 2 - d;
          if (d > margin) break;
        }
      }
      // Powerups: ~10% on plain platforms (no storm, no glass)
      const hasPup = !hasStorm && !hasGlass && Math.random() < 0.18;
      // Fireball weighted 50%, shield 25%, score2x 25%
      const pickPup = (): PowerupType => {
        const r = Math.random();
        if (r < 0.5) return 'fireball';
        if (r < 0.75) return 'shield';
        return 'score2x';
      };
      const pupType: PowerupType = hasPup ? pickPup() : 'none';
      gs.platforms.push({
        y: newY,
        gapAngle,
        gapSize,
        secondGapAngle: secAngle,
        secondGapSize: secSize,
        hasStorm,
        stormAngle: dynStormAngle,
        stormSize: dynStormSize,
        hasGlass,
        glassBroken: false,
        powerup: pupType,
        powerupAngle: hasPup ? norm2PI(gapAngle + Math.PI + (Math.random() - 0.5) * 2.0) : 0,
        powerupSize: hasPup ? 0.6 : 0,
        powerupCollected: false,
        passed: false,
      });
    }

    gs.platforms = gs.platforms.filter(p => p.y < gs.ballY + 20);
    forceUpdate(n => n + 1);
  });

  const gs = gameState.current;

  return (
    <>
      <ambientLight intensity={0.6} color="#fff5eb" />
      <directionalLight position={[5, 10, 5]} intensity={1.0} color="#ffffff" />
      <directionalLight position={[-3, 5, -2]} intensity={0.3} color="#74C0FC" />
      <pointLight position={[0, gs.ballY + 2, 3]} intensity={0.5} color="#FFD43B" distance={10} />

      <Tower rotation={gs.rotation} ballY={gs.ballY} />

      {gs.platforms.map((p, i) => (
        <Platform
          key={`${i}-${p.y}`}
          y={p.y}
          gapAngle={p.gapAngle}
          gapSize={p.gapSize}
          secondGapAngle={p.secondGapAngle}
          secondGapSize={p.secondGapSize}
          hasStorm={p.hasStorm}
          stormAngle={p.stormAngle}
          stormSize={p.stormSize}
          rotation={gs.rotation}
          colorIndex={i}
          hasGlass={p.hasGlass}
          glassBroken={p.glassBroken}
          powerup={p.powerup}
          powerupAngle={p.powerupAngle}
          powerupSize={p.powerupSize}
          powerupCollected={p.powerupCollected}
        />
      ))}

      <Ball
        y={gs.ballY}
        isFireball={gs.fireballTimer > 0}
        hasShield={gs.hasShield}
        isScore2x={gs.score2xTimer > 0}
      />
      <GlassShards />
      <BackgroundParticles ballY={gs.ballY} />

      <color attach="background" args={['#87CEEB']} />
      <fog attach="fog" args={['#87CEEB', 12, 30]} />
    </>
  );
}

const POWERUP_LABELS: Record<PowerupType, string> = {
  fireball: 'FIREBALL',
  shield: 'SHIELD',
  score2x: 'DOUBLE',
  none: '',
};
const POWERUP_SUBLABELS: Record<PowerupType, string> = {
  fireball: 'SMASH EVERYTHING',
  shield: 'ONE FREE HIT',
  score2x: 'ALL POINTS 2X',
  none: '',
};

export default function Game3D({
  onGameOver,
  onScoreUpdate
}: {
  onGameOver: (score: number) => void;
  onScoreUpdate: (score: number, combo: number, timeLeft: number) => void;
}) {
  const [mounted, setMounted] = useState(false);
  const [flash, setFlash] = useState<{ type: PowerupType; key: number } | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handlePowerup = useCallback((type: PowerupType) => {
    setFlash({ type, key: Date.now() });
  }, []);

  // Clear flash after animation
  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(null), 1200);
    return () => clearTimeout(t);
  }, [flash]);

  if (!mounted) {
    return <div style={{ position: 'absolute', inset: 0, background: '#87CEEB' }} />;
  }

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <Canvas
        camera={{ position: [6, 5, 6], fov: 50 }}
        style={{ touchAction: 'none' }}
      >
        <GameScene onGameOver={onGameOver} onScoreUpdate={onScoreUpdate} onPowerup={handlePowerup} />
      </Canvas>

      {/* Powerup flash overlay */}
      {flash && (
        <div
          key={flash.key}
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
            zIndex: 20,
            animation: `pupFlash-${flash.type} 1.2s ease-out forwards`,
          }}
        >
          <div style={{
            fontSize: 80,
            fontWeight: 900,
            fontFamily: '"SF Pro Rounded", "Nunito", system-ui, sans-serif',
            color: '#ffffff',
            letterSpacing: '8px',
            lineHeight: 1,
            animation: 'pupTextSlam 1.2s cubic-bezier(0.16, 1, 0.3, 1) forwards',
            textShadow: flash.type === 'fireball'
              ? '0 0 30px #FF6600, 0 0 60px #FF4400, 0 0 120px #CC3300, 0 6px 0 #993300'
              : flash.type === 'shield'
              ? '0 0 30px #00E5FF, 0 0 60px #0088FF, 0 0 120px #0044CC, 0 6px 0 #003388'
              : '0 0 30px #69DB7C, 0 0 60px #22CC55, 0 0 120px #00AA33, 0 6px 0 #006622',
            WebkitTextStroke: flash.type === 'fireball' ? '2px #FF8800' : flash.type === 'shield' ? '2px #44DDFF' : '2px #88FFAA',
          }}>
            {POWERUP_LABELS[flash.type]}
          </div>
          <div style={{
            fontSize: 16,
            fontWeight: 800,
            fontFamily: '"SF Pro Rounded", "Nunito", system-ui, sans-serif',
            color: flash.type === 'fireball' ? '#FFD700' : flash.type === 'shield' ? '#88EEFF' : '#AAFFCC',
            letterSpacing: '6px',
            marginTop: 8,
            animation: 'pupSubText 1.2s ease-out forwards',
          }}>
            {POWERUP_SUBLABELS[flash.type]}
          </div>
        </div>
      )}

      <style>{`
        @keyframes pupFlash-fireball {
          0% { background: rgba(255,140,0,0.5); }
          8% { background: rgba(255,255,200,0.6); }
          25% { background: rgba(255,100,0,0.15); }
          100% { background: transparent; }
        }
        @keyframes pupFlash-shield {
          0% { background: rgba(0,200,255,0.5); }
          8% { background: rgba(200,255,255,0.6); }
          25% { background: rgba(0,140,255,0.15); }
          100% { background: transparent; }
        }
        @keyframes pupFlash-score2x {
          0% { background: rgba(100,220,120,0.5); }
          8% { background: rgba(200,255,200,0.6); }
          25% { background: rgba(50,200,80,0.15); }
          100% { background: transparent; }
        }
        @keyframes pupTextSlam {
          0% { opacity: 0; transform: scale(3) translateY(10px); }
          12% { opacity: 1; transform: scale(0.9) translateY(-5px); }
          20% { transform: scale(1.05) translateY(0); }
          30% { transform: scale(1.0) translateY(0); }
          75% { opacity: 1; transform: scale(1.0) translateY(0); }
          100% { opacity: 0; transform: scale(0.95) translateY(-20px); }
        }
        @keyframes pupSubText {
          0% { opacity: 0; transform: translateY(15px); }
          20% { opacity: 0; transform: translateY(15px); }
          35% { opacity: 1; transform: translateY(0); }
          75% { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(-10px); }
        }
      `}</style>
    </div>
  );
}
