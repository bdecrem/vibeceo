#!/usr/bin/env node
/**
 * TRIBAL RAW — JB01
 * 
 * Jeff Mills approach: tension through subtraction and addition.
 * Change one element at a time. Evolve slowly. Velocity is expression.
 * 
 * Two kicks: syncopated tribal (kick) + steady 4x4 (lowtom)
 * Closed hats with per-step decay automation — the decay IS the performance.
 * 
 * "Hypnotic repetition — lock a groove for 16-64 bars before changing."
 * "Micro-variations — change one element at a time."
 */

import { OfflineAudioContext } from 'node-web-audio-api';
globalThis.OfflineAudioContext = OfflineAudioContext;

import { audioBufferToWav } from './core/wav.js';
import { writeFileSync } from 'fs';

const BPM = 132;  // Mills range
const SAMPLE_RATE = 44100;
const stepDuration = 60 / BPM / 4;

// ─── HELPERS ───
function makeStep(vel = 0) { return { velocity: vel }; }

// Velocity humanization — Mills principle: "velocity is expression"
function makeTrackHumanized(hits, baseVel, spread = 10) {
  const steps = Array(16).fill(null).map(() => makeStep(0));
  for (const s of hits) {
    const v = Math.max(1, Math.min(127, baseVel + Math.floor((Math.random() - 0.5) * spread)));
    steps[s] = makeStep(v);
  }
  return steps;
}

function makeTrack(hits, vel = 100) {
  const steps = Array(16).fill(null).map(() => makeStep(0));
  for (const s of hits) steps[s] = makeStep(vel);
  return steps;
}

// ─── PATTERNS ───
// Mills tribal_build: kick [0,3,6,8,12] — syncopated
// Our variation: [0,3,4,6,8,11,12,14] — denser tresillo
// 4x4 anchor on lowtom: [0,4,8,12]
// Hats: 16ths — Mills runs continuous 16ths and rides the decay

const tribalKick = () => makeTrackHumanized([0,3,4,6,8,11,12,14], 95, 15);
const fourFloor  = () => makeTrack([0,4,8,12], 90);
const hats16     = () => makeTrackHumanized([0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15], 75, 20); // continuous 16ths, varied velocity
const hats8      = () => makeTrackHumanized([0,2,4,6,8,10,12,14], 70, 15); // 8ths — sparser
const noHits     = () => makeTrack([], 0);

// ─── HAT DECAY AUTOMATION CURVES ───
// All engine units 0-1. These cycle per bar (16 steps).

// Dead tight — barely a tick
const tight = Array(16).fill(0.05);

// Slightly open — you can hear the hat ring just a bit
const warm = Array(16).fill(0.15);

// Slow triangle: opens mid-bar, closes at edges
const triangle = Array.from({length:16}, (_,i) => {
  const t = i / 15;
  return 0.05 + (t < 0.5 ? t * 2 : 2 - t * 2) * 0.35;
});

// Ramp up: each step longer across the bar — building energy
const rampUp = Array.from({length:16}, (_,i) => 0.05 + (i/15) * 0.5);

// Ramp down: longest at start, tightens — receding
const rampDown = Array.from({length:16}, (_,i) => 0.55 - (i/15) * 0.5);

// Mills accent: short-LONG pattern, musical phrasing
const millsAccent = [0.05,0.4,0.05,0.55, 0.08,0.35,0.05,0.6, 0.05,0.7,0.04,0.45, 0.08,0.5,0.1,0.75];

// Wild: wider range, more chaotic but still weighted (probability, not randomness)
const wild = Array.from({length:16}, (_,i) => {
  // Accents on offbeats (odd steps) tend longer
  const base = i % 2 === 1 ? 0.3 : 0.06;
  return base + Math.random() * 0.5;
});

// Breathing: sine, very slow feel
const breathe = Array.from({length:16}, (_,i) => 0.08 + 0.25 * (0.5 + 0.5 * Math.sin(i / 15 * Math.PI * 2)));

// Full open: long decay throughout — washy, splashy
const open = Array(16).fill(0.55);

// ─── KICK + HAT LEVEL PARAMS per scene ───
// Mills: "the kick is the anchor" but not the loudest thing in the room
const KICK_PARAMS = { decay: 0.45, tune: -0.2, level: 0.8, attack: 0.65 };
const FOUR_PARAMS = { decay: 0.4, tune: -0.35, level: 0.7, attack: 0.55 };

// ─── ARRANGEMENT ───
// Mills philosophy: evolve slowly, change ONE thing at a time.
// 48 bars @ 132 BPM = ~87 seconds.
//
// The arc:
// 1. Hats alone (establish rhythm)
// 2. 4x4 enters (add foundation)
// 3. Tribal kick layers in (double kick groove locked)
// 4. Hat decay starts opening (the performance begins)
// 5. Decay gets wilder, peaks
// 6. Strip everything back — just hats (the Mills tension move)
// 7. Kicks return, ride it out
// 8. Simplify to 4x4 only, fade

const scenes = [
  // === ACT 1: ESTABLISHING ===
  
  // 8ths hats, dead tight — just rhythm, nothing else
  { bars: 4, name: 'HATS — 8ths, tight',
    pattern: { ch: hats8() },
    params: { ch: { level: 0.45 } },
    automation: { 'ch.decay': tight },
  },
  // Move to 16ths — density shift, still tight
  { bars: 4, name: 'HATS — 16ths, tight',
    pattern: { ch: hats16() },
    params: { ch: { level: 0.45 } },
    automation: { 'ch.decay': tight },
  },

  // === ACT 2: FOUNDATION ===
  
  // 4x4 enters — one change only
  { bars: 4, name: '4x4 IN — hats still tight',
    pattern: { lowtom: fourFloor(), ch: hats16() },
    params: { lowtom: FOUR_PARAMS, ch: { level: 0.5 } },
    automation: { 'ch.decay': warm },
  },
  // Tribal kick layers in — the double kick locks
  { bars: 4, name: 'TRIBAL KICK IN — groove locked',
    pattern: { kick: tribalKick(), lowtom: fourFloor(), ch: hats16() },
    params: { kick: KICK_PARAMS, lowtom: FOUR_PARAMS, ch: { level: 0.5 } },
    automation: { 'ch.decay': warm },
  },

  // === ACT 3: THE PERFORMANCE (hat decay opens) ===
  
  // Triangle sweep — the hats start breathing
  { bars: 4, name: 'DECAY OPENS — triangle',
    pattern: { kick: tribalKick(), lowtom: fourFloor(), ch: hats16() },
    params: { kick: KICK_PARAMS, lowtom: FOUR_PARAMS, ch: { level: 0.55 } },
    automation: { 'ch.decay': triangle },
  },
  // Ramp up — building energy
  { bars: 4, name: 'BUILDING — ramp up',
    pattern: { kick: tribalKick(), lowtom: fourFloor(), ch: hats16() },
    params: { kick: KICK_PARAMS, lowtom: FOUR_PARAMS, ch: { level: 0.55 } },
    automation: { 'ch.decay': rampUp },
  },
  // Mills accent pattern — musical, dynamic
  { bars: 4, name: 'MILLS — accent pattern',
    pattern: { kick: tribalKick(), lowtom: fourFloor(), ch: hats16() },
    params: { kick: KICK_PARAMS, lowtom: FOUR_PARAMS, ch: { level: 0.6 } },
    automation: { 'ch.decay': millsAccent },
  },
  // Wild — the peak, hats fully alive
  { bars: 4, name: 'PEAK — wild decay',
    pattern: { kick: tribalKick(), lowtom: fourFloor(), ch: hats16() },
    params: { kick: KICK_PARAMS, lowtom: FOUR_PARAMS, ch: { level: 0.6 } },
    automation: { 'ch.decay': wild },
  },

  // === ACT 4: THE STRIP (tension through subtraction) ===
  
  // Tribal kick drops — just 4x4 + open hats
  { bars: 4, name: 'STRIP 1 — tribal kick out',
    pattern: { lowtom: fourFloor(), ch: hats16() },
    params: { lowtom: FOUR_PARAMS, ch: { level: 0.5 } },
    automation: { 'ch.decay': open },
  },
  // 4x4 drops — JUST HATS. The Mills tension move.
  { bars: 4, name: 'STRIP 2 — just hats, breathing',
    pattern: { ch: hats16() },
    params: { ch: { level: 0.45 } },
    automation: { 'ch.decay': breathe },
  },

  // === ACT 5: RETURN + RIDE ===
  
  // 4x4 returns first — one element at a time
  { bars: 2, name: '4x4 RETURNS',
    pattern: { lowtom: fourFloor(), ch: hats16() },
    params: { lowtom: FOUR_PARAMS, ch: { level: 0.5 } },
    automation: { 'ch.decay': triangle },
  },
  // Tribal kick back — double kick rides
  { bars: 4, name: 'FULL RETURN — ride it',
    pattern: { kick: tribalKick(), lowtom: fourFloor(), ch: hats16() },
    params: { kick: KICK_PARAMS, lowtom: FOUR_PARAMS, ch: { level: 0.55 } },
    automation: { 'ch.decay': millsAccent },
  },

  // === ACT 6: CLOSE ===
  
  // Tribal kick drops again, ramp down on hats
  { bars: 4, name: 'CLOSING — 4x4 + ramp down',
    pattern: { lowtom: fourFloor(), ch: hats16() },
    params: { lowtom: { ...FOUR_PARAMS, level: 0.6 }, ch: { level: 0.45 } },
    automation: { 'ch.decay': rampDown },
  },
  // Just hats, tightening
  { bars: 2, name: 'TAIL — hats fading',
    pattern: { ch: hats8() },
    params: { ch: { level: 0.3 } },
    automation: { 'ch.decay': tight },
  },
];

// ─── RENDER ───
const totalBars = scenes.reduce((s, x) => s + x.bars, 0);
const samplesPerBar = Math.floor(16 * stepDuration * SAMPLE_RATE);
const totalSamples = Math.floor(totalBars * samplesPerBar + SAMPLE_RATE * 1);
const totalSeconds = totalBars * 16 * stepDuration;

console.log(`\n  🥁 TRIBAL RAW — JB01 × Jeff Mills`);
console.log(`  ${BPM} BPM | ${totalBars} bars | ${totalSeconds.toFixed(1)}s`);
console.log(`  "Tension through subtraction and addition."\n`);

const { JB01Engine } = await import('../web/public/jb01/dist/machines/jb01/engine.js');

const outputL = new Float32Array(totalSamples);
const outputR = new Float32Array(totalSamples);
let currentSample = 0;

for (const scene of scenes) {
  const barStart = Math.round(currentSample / samplesPerBar) + 1;
  console.log(`  Bar ${String(barStart).padStart(2)}: ${scene.name}`);

  const context = new OfflineAudioContext(2, SAMPLE_RATE, SAMPLE_RATE);
  const engine = new JB01Engine({ context });

  if (scene.params) {
    for (const [voiceId, vp] of Object.entries(scene.params)) {
      for (const [param, value] of Object.entries(vp)) {
        engine.setVoiceParam(voiceId, param, value);
      }
    }
  }

  const buffer = await engine.renderPattern(scene.pattern, {
    bars: scene.bars,
    stepDuration,
    sampleRate: SAMPLE_RATE,
    automation: scene.automation,
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

// Soft-clip master — gentle
const gain = 0.85;
for (let i = 0; i < totalSamples; i++) {
  outputL[i] = Math.tanh(outputL[i] * gain * 1.3) / 1.1;
  outputR[i] = Math.tanh(outputR[i] * gain * 1.3) / 1.1;
}

const outCtx = new OfflineAudioContext(2, totalSamples, SAMPLE_RATE);
const outBuf = outCtx.createBuffer(2, totalSamples, SAMPLE_RATE);
outBuf.getChannelData(0).set(outputL);
outBuf.getChannelData(1).set(outputR);

const wav = audioBufferToWav(outBuf);
const outputFile = process.argv[2] || `${process.env.HOME}/Desktop/tribal-raw.wav`;
writeFileSync(outputFile, Buffer.from(wav));

console.log(`\n  ✅ ${outputFile}`);
console.log(`  ${totalBars} bars | ${totalSeconds.toFixed(1)}s\n`);
