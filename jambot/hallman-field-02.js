#!/usr/bin/env node
/**
 * Hallman Field 02 — evolving ambient for field 2.0
 *
 * JB202 (drone) + JT10 (melodic fragments) + JB01 (texture percussion)
 * All proven instruments, proven patch families.
 *
 * 48 bars at 60 BPM = 192 seconds. Designed to loop.
 * G minor pentatonic: G Bb C D F
 *
 * Arc:
 *   1-12   JB202 drone only (G1 sustained, filter breathing)
 *   13-20  JT10 melodic fragments emerge (1-2 notes per bar, sparse)
 *   21-32  melody develops (3-5 notes per bar, phrases form)
 *   33-40  peak (dense melody + subtle JB01 ch texture)
 *   41-48  wind down (melody thins, filter closes, percussion fades)
 */

import { JambotHeadless } from './headless.js';
import { toEngine } from './params/converters.js';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const JT10_PARAMS = require('./params/jt10-params.json');

const TOTAL_BARS = 48;
const jb = new JambotHeadless({ bpm: 60 });

// ============================================================
// HELPERS
// ============================================================

const SCALE = ['G2', 'Bb2', 'C3', 'D3', 'F3', 'G3', 'Bb3'];
const SCALE_LOW = ['G1', 'Bb1', 'C2', 'D2'];

const off = { note: 'G2', gate: false, accent: false, slide: false };
const emptyBar16 = () => Array(16).fill(null).map(() => off);
const emptyDrumBar = () => Array(16).fill(null).map(() => ({ velocity: 0, accent: false }));

function melodyBar(density, scalePool = SCALE) {
  const bar = emptyBar16();
  const noteCount = Math.min(density, 12);
  const placed = new Set();
  for (let n = 0; n < noteCount; n++) {
    let step;
    // Prefer rhythmic positions: 0, 3, 4, 7, 8, 11, 12, 15
    const rhythmic = [0, 3, 4, 7, 8, 11, 12, 15];
    const pool = n < rhythmic.length ? rhythmic : Array.from({ length: 16 }, (_, i) => i);
    let attempts = 0;
    do {
      step = pool[Math.floor(Math.random() * pool.length)];
      attempts++;
    } while (placed.has(step) && attempts < 20);
    if (placed.has(step)) continue;
    placed.add(step);
    const note = scalePool[Math.floor(Math.random() * scalePool.length)];
    const shouldSlide = Math.random() < 0.25 && n > 0;
    const shouldAccent = Math.random() < 0.3;
    bar[step] = { note, gate: true, accent: shouldAccent, slide: shouldSlide };
  }
  return bar;
}

// ============================================================
// JB202 DRONE PATTERN — sustained G1, all 48 bars
// ============================================================

const droneStep = { note: 'G1', gate: true, accent: false, slide: true };
const dronePat = [];
// Occasional octave lift every 12 bars
for (let bar = 0; bar < TOTAL_BARS; bar++) {
  for (let s = 0; s < 16; s++) {
    if (bar % 12 === 8 && s >= 4 && s <= 7) {
      dronePat.push({ note: 'G2', gate: true, accent: false, slide: true });
    } else {
      dronePat.push(droneStep);
    }
  }
}
jb.session._nodes.jb202.setPattern(dronePat);

// ============================================================
// JT10 MELODY PATTERN — evolving density
// ============================================================

const melodyPat = [];
for (let bar = 0; bar < TOTAL_BARS; bar++) {
  let density;
  if (bar < 12) density = 0;                     // silent
  else if (bar < 20) density = 1 + Math.floor((bar - 12) / 4); // 1-2
  else if (bar < 32) density = 3 + Math.floor((bar - 20) / 3); // 3-7
  else if (bar < 40) density = 6 + Math.floor((bar - 32) / 2); // 6-10 peak
  else density = Math.max(1, 8 - (bar - 40) * 2);              // wind down

  if (density === 0) {
    melodyPat.push(...emptyBar16());
  } else {
    // Use higher notes at peak
    const pool = bar >= 33 && bar < 40 ? SCALE : (bar < 20 ? SCALE_LOW : SCALE);
    melodyPat.push(...melodyBar(density, pool));
  }
}
jb.session._nodes.jt10.setPattern(melodyPat);

// ============================================================
// JB01 TEXTURE PERCUSSION — subtle ch only during bars 33-44
// ============================================================

const VOICES = ['kick', 'snare', 'clap', 'ch', 'oh', 'lowtom', 'hitom', 'cymbal'];
const drumPattern = {};
for (const v of VOICES) drumPattern[v] = [];

for (let bar = 0; bar < TOTAL_BARS; bar++) {
  // CH texture — only bars 33-44, very quiet, sparse 8ths
  if (bar >= 32 && bar < 44) {
    const fadeIn = bar < 36 ? (bar - 32) / 4 : 1;
    const fadeOut = bar >= 40 ? (44 - bar) / 4 : 1;
    const baseVel = Math.round(35 * fadeIn * fadeOut);
    const steps = Array(16).fill(null).map((_, i) => {
      if (i % 2 === 0) return { velocity: Math.max(1, baseVel + Math.floor((Math.random() - 0.5) * 10)), accent: false };
      return { velocity: 0, accent: false };
    });
    drumPattern.ch.push(...steps);
  } else {
    drumPattern.ch.push(...emptyDrumBar());
  }

  // All other voices silent
  for (const v of ['kick', 'snare', 'clap', 'oh', 'lowtom', 'hitom', 'cymbal']) {
    drumPattern[v].push(...emptyDrumBar());
  }
}

jb.session._nodes.jb01.setPattern(drumPattern);

// ============================================================
// SOUND DESIGN
// ============================================================

// JB202 — EXACT hallman-bass-01.js values, ZERO modifications
jb.session.set('jb202.osc1Waveform', 'square');
jb.session.set('jb202.osc1Octave', 0);
jb.session.set('jb202.osc1Detune', 0);
jb.session.set('jb202.osc1Level', 85);
jb.session.set('jb202.osc2Waveform', 'sawtooth');
jb.session.set('jb202.osc2Octave', -12);
jb.session.set('jb202.osc2Detune', 3);
jb.session.set('jb202.osc2Level', 55);
jb.session.set('jb202.filterCutoff', 280);
jb.session.set('jb202.filterResonance', 42);
jb.session.set('jb202.filterEnvAmount', 55);
jb.session.set('jb202.filterAttack', 0);
jb.session.set('jb202.filterDecay', 38);
jb.session.set('jb202.filterSustain', 8);
jb.session.set('jb202.filterRelease', 18);
jb.session.set('jb202.ampAttack', 0);
jb.session.set('jb202.ampDecay', 35);
jb.session.set('jb202.ampSustain', 15);
jb.session.set('jb202.ampRelease', 15);
jb.session.set('jb202.drive', 25);
jb.session.set('jb202.level', 80);

// JT10 — EXACT hallman-hawtin-01.js values, ZERO modifications
await jb.tool('tweak_jt10', { sawLevel: 80, pulseLevel: 0, subLevel: 45, subMode: 1 });
await jb.tool('tweak_jt10', { cutoff: 100, resonance: 0, envMod: 55, keyTrack: 30 });
await jb.tool('tweak_jt10', { attack: 0, decay: 30, sustain: 10, release: 12 });
await jb.tool('tweak_jt10', { filterAttack: 0, filterDecay: 28, filterSustain: 5, filterRelease: 10 });
await jb.tool('tweak_jt10', { glideTime: 15 });
await jb.tool('tweak', { path: 'jt10.level', value: -16 });

// JB01 — EXACT hallman-hawtin-01.js values
await jb.tool('tweak', { path: 'jb01.ch.decay', value: 12 });
await jb.tool('tweak', { path: 'jb01.ch.level', value: -8 });
await jb.tool('tweak', { path: 'jb01.level', value: 0 });

// ============================================================
// AUTOMATION — JT10 cutoff sweep follows the density arc
// ============================================================

const cutoffDef = JT10_PARAMS.lead.cutoff;
const cutoffAuto = [];
for (let bar = 0; bar < TOTAL_BARS; bar++) {
  let hz;
  // Proven range from hallman-hawtin-01: 100→500Hz max
  if (bar < 12) hz = 100;
  else if (bar < 20) hz = 100 + ((bar - 12) / 8) * 100;      // 100→200
  else if (bar < 32) hz = 200 + ((bar - 20) / 12) * 150;     // 200→350
  else if (bar < 40) hz = 350 + ((bar - 32) / 8) * 150;      // 350→500 peak
  else hz = 500 - ((bar - 40) / 8) * 300;                     // 500→200 wind down
  const eng = toEngine(hz, cutoffDef);
  for (let s = 0; s < 16; s++) cutoffAuto.push(eng);
}
jb.session.params.automation.set('jt10.lead.cutoff', cutoffAuto);

// ============================================================
// RENDER
// ============================================================

console.log(`Rendering Hallman Field 02 — ${TOTAL_BARS} bars at 60 BPM`);
console.log('Arc: drone(12) → melody emerges(8) → develops(12) → peak(8) → wind down(8)');

const result = await jb.render('hallman-field-02', TOTAL_BARS);
console.log(result);
console.log('Done.');
