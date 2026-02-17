#!/usr/bin/env node
/**
 * THE BELLS — Jeff Mills style
 * 
 * Pure 909 performance. No bass synth, no acid line.
 * Just a 909 being PLAYED — decay changing, voices dropping in/out,
 * kick tune shifting, hat patterns mutating.
 * 
 * 32 bars at 135 BPM. Every 2 bars the machine evolves.
 * This is a live performance rendered to tape.
 */

import { OfflineAudioContext, AudioContext } from 'node-web-audio-api';
globalThis.OfflineAudioContext = OfflineAudioContext;
globalThis.AudioContext = AudioContext;

import { audioBufferToWav } from './core/wav.js';
import { writeFileSync } from 'fs';

// ============================================================
// UTILITIES
// ============================================================

function makeStep(vel = 0, accent = false) {
  return { velocity: vel, accent };
}

function makeTrack(hits, vel = 100, accent = false) {
  const steps = Array(16).fill(null).map(() => makeStep(0));
  for (const s of hits) steps[s] = makeStep(vel, accent);
  return steps;
}

function emptyTrack() {
  return Array(16).fill(null).map(() => makeStep(0));
}

const VOICES = ['kick','snare','clap','rimshot','lowtom','midtom','hitom','ch','oh','crash','ride'];

function makeFullPattern(overrides = {}) {
  const p = {};
  for (const v of VOICES) p[v] = emptyTrack();
  Object.assign(p, overrides);
  return p;
}

// Lerp helper
function lerp(a, b, t) { return a + (b - a) * t; }

// ============================================================
// THE PERFORMANCE — 32 bars, evolving every 2 bars
// ============================================================

const BPM = 135;
const SAMPLE_RATE = 44100;

// Each "scene" is 2 bars with specific pattern + params
// This is Jeff Mills performing — every scene is a deliberate move

const scenes = [
  // === INTRO: Just kick. Nothing else. Establishing the pulse. ===
  {
    bars: 2,
    pattern: { kick: makeTrack([0,4,8,12], 127, true) },
    params: { kick: { decay: 0.8, attack: 0.3, tune: 0, level: 1.0 } },
    name: 'PULSE'
  },
  // Kick decay stretches out
  {
    bars: 2,
    pattern: { kick: makeTrack([0,4,8,12], 127, true) },
    params: { kick: { decay: 0.9, attack: 0.3, tune: -0.15, level: 1.0 } },
    name: 'DEEPER'
  },
  // === HATS ENTER: offbeat closed hats, quiet ===
  {
    bars: 2,
    pattern: {
      kick: makeTrack([0,4,8,12], 127, true),
      ch: makeTrack([2,6,10,14], 50),
    },
    params: {
      kick: { decay: 0.9, attack: 0.3, tune: -0.15, level: 1.0 },
      ch: { decay: 0.15, tone: 0.6, level: 0.35 },
    },
    name: 'HATS IN'
  },
  // Hats get busier — rolling 16ths
  {
    bars: 2,
    pattern: {
      kick: makeTrack([0,4,8,12], 127, true),
      ch: makeTrack([1,2,3,5,6,7,9,10,11,13,14,15], 60),
    },
    params: {
      kick: { decay: 0.85, attack: 0.35, tune: -0.15, level: 1.0 },
      ch: { decay: 0.12, tone: 0.5, level: 0.3 },
    },
    name: 'ROLLING'
  },
  // === CLAP ENTERS ===
  {
    bars: 2,
    pattern: {
      kick: makeTrack([0,4,8,12], 127, true),
      clap: makeTrack([4,12], 100),
      ch: makeTrack([1,2,3,5,6,7,9,10,11,13,14,15], 60),
    },
    params: {
      kick: { decay: 0.85, attack: 0.35, tune: -0.15, level: 1.0 },
      clap: { decay: 0.2, tone: 0.5, level: 0.5 },
      ch: { decay: 0.12, tone: 0.5, level: 0.3 },
    },
    name: 'CLAP'
  },
  // === OPEN HAT: tension ===
  {
    bars: 2,
    pattern: {
      kick: makeTrack([0,4,8,12], 127, true),
      clap: makeTrack([4,12], 100),
      ch: makeTrack([2,6,10,14], 60),
      oh: makeTrack([3,11], 70),
    },
    params: {
      kick: { decay: 0.85, attack: 0.4, tune: -0.15, level: 1.0 },
      clap: { decay: 0.2, tone: 0.5, level: 0.5 },
      ch: { decay: 0.15, tone: 0.5, level: 0.35 },
      oh: { decay: 0.4, tone: 0.5, level: 0.35 },
    },
    name: 'OPEN'
  },
  // === FULL GROOVE: ride enters, everything locked ===
  {
    bars: 4,
    pattern: {
      kick: makeTrack([0,4,8,12], 127, true),
      clap: makeTrack([4,12], 100),
      ch: makeTrack([2,6,10,14], 55),
      oh: makeTrack([3,11], 60),
      ride: makeTrack([0,4,8,12], 40),
    },
    params: {
      kick: { decay: 0.8, attack: 0.4, tune: -0.2, level: 1.0 },
      clap: { decay: 0.2, tone: 0.5, level: 0.5 },
      ch: { decay: 0.15, tone: 0.45, level: 0.3 },
      oh: { decay: 0.35, tone: 0.5, level: 0.3 },
      ride: { decay: 0.5, tone: 0.4, level: 0.2 },
    },
    name: 'LOCKED IN'
  },
  // === MILLS MOVE: kick decay SLAMS short. Tension. ===
  {
    bars: 2,
    pattern: {
      kick: makeTrack([0,4,8,12], 127, true),
      clap: makeTrack([4,12], 100),
      ch: makeTrack([2,6,10,14], 55),
      ride: makeTrack([0,4,8,12], 40),
    },
    params: {
      kick: { decay: 0.35, attack: 0.6, tune: 0.1, level: 1.0 },  // SHORT, clicky, tuned UP
      clap: { decay: 0.15, tone: 0.6, level: 0.55 },
      ch: { decay: 0.1, tone: 0.6, level: 0.35 },
      ride: { decay: 0.4, tone: 0.4, level: 0.2 },
    },
    name: 'STRIPPED'
  },
  // === KICK TUNE DROPS: back to heavy, decay opens back up ===
  {
    bars: 2,
    pattern: {
      kick: makeTrack([0,4,8,12], 127, true),
      clap: makeTrack([4,12], 110, true),
      ch: makeTrack([1,2,3,5,6,7,9,10,11,13,14,15], 50),
      oh: makeTrack([3,7,11,15], 65),
    },
    params: {
      kick: { decay: 0.95, attack: 0.3, tune: -0.3, level: 1.0 },  // DEEP, long tail
      clap: { decay: 0.25, tone: 0.5, level: 0.55 },
      ch: { decay: 0.1, tone: 0.4, level: 0.25 },
      oh: { decay: 0.3, tone: 0.45, level: 0.3 },
    },
    name: 'DEEP DROP'
  },
  // === RIMSHOT ENTERS: metallic, syncopated ===
  {
    bars: 2,
    pattern: {
      kick: makeTrack([0,4,8,12], 127, true),
      clap: makeTrack([4,12], 100),
      rimshot: makeTrack([2,7,10,15], 80),
      ch: makeTrack([2,6,10,14], 55),
      oh: makeTrack([3,11], 60),
    },
    params: {
      kick: { decay: 0.85, attack: 0.35, tune: -0.2, level: 1.0 },
      clap: { decay: 0.2, tone: 0.5, level: 0.5 },
      rimshot: { level: 0.4, tone: 0.7 },
      ch: { decay: 0.12, tone: 0.5, level: 0.3 },
      oh: { decay: 0.3, tone: 0.5, level: 0.3 },
    },
    name: 'RIMSHOT'
  },
  // === TOMS: floor tom hits, tribal ===
  {
    bars: 2,
    pattern: {
      kick: makeTrack([0,4,8,12], 127, true),
      clap: makeTrack([4,12], 100),
      lowtom: makeTrack([3,11], 90, true),
      rimshot: makeTrack([2,7,10,15], 70),
      ch: makeTrack([2,6,10,14], 50),
    },
    params: {
      kick: { decay: 0.8, attack: 0.35, tune: -0.2, level: 1.0 },
      clap: { decay: 0.2, tone: 0.5, level: 0.45 },
      lowtom: { decay: 0.6, tune: -0.3, level: 0.55 },
      rimshot: { level: 0.35, tone: 0.7 },
      ch: { decay: 0.12, tone: 0.5, level: 0.3 },
    },
    name: 'TRIBAL'
  },
  // === BREAKDOWN: kick drops out. Just hats + rim + tom ===
  {
    bars: 2,
    pattern: {
      rimshot: makeTrack([2,7,10,15], 70),
      lowtom: makeTrack([0,8], 80),
      ch: makeTrack([1,2,3,5,6,7,9,10,11,13,14,15], 40),
      oh: makeTrack([3,7,11,15], 50),
    },
    params: {
      rimshot: { level: 0.45, tone: 0.7 },
      lowtom: { decay: 0.5, tune: -0.25, level: 0.5 },
      ch: { decay: 0.08, tone: 0.4, level: 0.25 },
      oh: { decay: 0.25, tone: 0.45, level: 0.25 },
    },
    name: 'BREAKDOWN'
  },
  // === THE DROP: everything comes back HARD ===
  {
    bars: 4,
    pattern: {
      kick: makeTrack([0,4,8,12], 127, true),
      clap: makeTrack([4,12], 120, true),
      rimshot: makeTrack([2,7,10,15], 80),
      lowtom: makeTrack([3,11], 85, true),
      ch: makeTrack([1,2,3,5,6,7,9,10,11,13,14,15], 55),
      oh: makeTrack([3,7,11,15], 65),
      ride: makeTrack([0,4,8,12], 35),
    },
    params: {
      kick: { decay: 0.95, attack: 0.5, tune: -0.3, level: 1.0 },
      clap: { decay: 0.25, tone: 0.55, level: 0.6 },
      rimshot: { level: 0.4, tone: 0.65 },
      lowtom: { decay: 0.55, tune: -0.25, level: 0.5 },
      ch: { decay: 0.1, tone: 0.45, level: 0.25 },
      oh: { decay: 0.3, tone: 0.5, level: 0.3 },
      ride: { decay: 0.45, tone: 0.4, level: 0.18 },
    },
    name: 'FULL FORCE'
  },
  // === OUTRO: voices strip away. Back to just kick. ===
  {
    bars: 2,
    pattern: {
      kick: makeTrack([0,4,8,12], 127, true),
      ch: makeTrack([2,6,10,14], 45),
    },
    params: {
      kick: { decay: 0.9, attack: 0.3, tune: -0.2, level: 1.0 },
      ch: { decay: 0.15, tone: 0.5, level: 0.25 },
    },
    name: 'STRIPPING'
  },
  {
    bars: 2,
    pattern: {
      kick: makeTrack([0,4,8,12], 127, true),
    },
    params: {
      kick: { decay: 0.85, attack: 0.25, tune: -0.15, level: 1.0 },
    },
    name: 'PULSE OUT'
  },
];

// ============================================================
// RENDER SCENE BY SCENE
// ============================================================

const stepDuration = 60 / BPM / 4; // 16th note duration
const samplesPerBar = Math.floor(16 * stepDuration * SAMPLE_RATE);
const totalBars = scenes.reduce((sum, s) => sum + s.bars, 0);
const totalSamples = Math.floor(totalBars * samplesPerBar + SAMPLE_RATE * 2); // +2s tail

console.log(`\n  ╔══════════════════════════════════════╗`);
console.log(`  ║  THE BELLS — Jeff Mills style         ║`);
console.log(`  ║  Pure 909. ${totalBars} bars at ${BPM} BPM.         ║`);
console.log(`  ╚══════════════════════════════════════╝\n`);

const { JT90Engine } = await import('../web/public/jt90/dist/machines/jt90/engine.js');

// We'll collect all rendered scenes into one output buffer
const outputL = new Float32Array(totalSamples);
const outputR = new Float32Array(totalSamples);
let currentSample = 0;

for (let i = 0; i < scenes.length; i++) {
  const scene = scenes[i];
  const barStart = scenes.slice(0, i).reduce((sum, s) => sum + s.bars, 0);

  console.log(`  Bar ${barStart + 1}-${barStart + scene.bars}: ${scene.name}`);

  // Create fresh engine per scene (clean state)
  const context = new OfflineAudioContext(2, SAMPLE_RATE, SAMPLE_RATE);
  const engine = new JT90Engine({ context });

  // Apply params
  if (scene.params) {
    for (const [voiceId, voiceParams] of Object.entries(scene.params)) {
      for (const [param, value] of Object.entries(voiceParams)) {
        engine.setVoiceParameter(voiceId, param, value);
      }
    }
  }

  // Set pattern
  engine.setPattern(makeFullPattern(scene.pattern));

  // Render
  const buffer = await engine.renderPattern({
    bars: scene.bars,
    stepDuration,
    sampleRate: SAMPLE_RATE,
  });

  if (buffer) {
    const bufL = buffer.getChannelData(0);
    const bufR = buffer.numberOfChannels > 1 ? buffer.getChannelData(1) : bufL;
    const len = Math.min(bufL.length, totalSamples - currentSample);
    for (let j = 0; j < len; j++) {
      outputL[currentSample + j] += bufL[j];
      outputR[currentSample + j] += bufR[j];
    }
  }

  currentSample += scene.bars * samplesPerBar;
}

// ============================================================
// MASTER — light compression via soft clip
// ============================================================

const masterGain = 0.85;
for (let i = 0; i < totalSamples; i++) {
  outputL[i] = Math.tanh(outputL[i] * masterGain * 1.5) / 1.2;
  outputR[i] = Math.tanh(outputR[i] * masterGain * 1.5) / 1.2;
}

// Create output AudioBuffer-like object for WAV encoder
const outputContext = new OfflineAudioContext(2, totalSamples, SAMPLE_RATE);
const outputBuffer = outputContext.createBuffer(2, totalSamples, SAMPLE_RATE);
outputBuffer.getChannelData(0).set(outputL);
outputBuffer.getChannelData(1).set(outputR);

const wav = audioBufferToWav(outputBuffer);
const outputFile = process.argv[2] || 'the-bells-jam.wav';
writeFileSync(outputFile, Buffer.from(wav));

console.log(`\n  Output: ${outputFile}`);
console.log(`  ${totalBars} bars | ${BPM} BPM | ${(totalBars * 4 * stepDuration * 4).toFixed(0)}s\n`);
