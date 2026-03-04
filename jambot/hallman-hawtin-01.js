#!/usr/bin/env node
/**
 * Hallman × Hawtin 01 — Plastikman-style minimal
 * 
 * JB01 (drums) + JT10 (acid bass, zero resonance)
 * 126 BPM, G minor. Function hats. Slow burn filter + decay automation.
 * 32 bars.
 * 
 * Bars 1-2:   Kick only
 * Bars 3-4:   Kick + hats (16ths)
 * Bars 5-32:  + JT10 acid, filter sweeps open
 * Bar 32:     Ghost bar — kick drops
 */

import { JambotHeadless } from './headless.js';
import { toEngine } from './params/converters.js';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const JT10_PARAMS = require('./params/jt10-params.json');
const JB01_PARAMS = require('./params/jb01-params.json');

const jb = new JambotHeadless({ bpm: 126 });

// ============================================================
// HELPERS
// ============================================================

const emptyBar = () => Array(16).fill(null).map(() => ({ velocity: 0, accent: false }));
const off = { note: 'G1', gate: false, accent: false, slide: false };

const acidBar = [
  { note: 'G1',  gate: true,  accent: true,  slide: false },
  { note: 'G1',  gate: true,  accent: false, slide: false },
  { note: 'G2',  gate: true,  accent: false, slide: false },
  { note: 'G1',  gate: true,  accent: false, slide: false },
  { note: 'Bb1', gate: true,  accent: true,  slide: false },
  { note: 'G1',  gate: true,  accent: false, slide: false },
  { note: 'C2',  gate: true,  accent: false, slide: true  },
  { note: 'G1',  gate: true,  accent: false, slide: false },
  { note: 'G1',  gate: true,  accent: false, slide: false },
  { note: 'G1',  gate: false, accent: false, slide: false },
  { note: 'G2',  gate: true,  accent: false, slide: false },
  { note: 'G1',  gate: true,  accent: true,  slide: false },
  { note: 'Bb1', gate: true,  accent: false, slide: false },
  { note: 'G1',  gate: false, accent: false, slide: false },
  { note: 'G1',  gate: true,  accent: false, slide: false },
  { note: 'G1',  gate: false, accent: false, slide: false },
];

const silentBar = Array(16).fill(off);
const voices = ['kick', 'snare', 'clap', 'ch', 'oh', 'lowtom', 'hitom', 'rim'];

// ============================================================
// BUILD 32-BAR PATTERNS
// ============================================================

const drumPattern = {};
for (const v of voices) drumPattern[v] = [];
const bassPattern = [];

for (let bar = 0; bar < 32; bar++) {

  // --- KICK ---
  const kickVel = 110 + Math.floor(bar / 8) * 2; // 1% rule: micro velocity increase
  if (bar < 31) {
    drumPattern.kick.push(...Array(16).fill(null).map((_, i) => {
      if ([0, 4, 8, 12].includes(i)) {
        const v = Math.max(1, Math.min(127, kickVel + Math.floor((Math.random() - 0.5) * 8)));
        return { velocity: v, accent: false };
      }
      return { velocity: 0, accent: false };
    }));
  } else {
    drumPattern.kick.push(...emptyBar());
  }

  // --- CH (16ths function pattern) ---
  if (bar >= 2) {
    const baseVel = bar < 8
      ? 50 + ((bar - 2) / 5) * 25
      : bar < 28 ? 75 : 85;

    const steps = Array(16).fill(null).map((_, i) => {
      let vel;
      if ([2, 6, 10, 14].includes(i)) vel = baseVel + 18;
      else if ([0, 4, 8, 12].includes(i)) vel = baseVel - 20;
      else vel = baseVel + Math.floor((Math.random() - 0.5) * 14);
      return { velocity: Math.max(1, Math.min(127, vel)), accent: false };
    });
    drumPattern.ch.push(...steps);
  } else {
    drumPattern.ch.push(...emptyBar());
  }

  // --- Silent voices ---
  for (const v of ['rim', 'snare', 'clap', 'oh', 'lowtom', 'hitom']) {
    drumPattern[v].push(...emptyBar());
  }

  // --- BASS ---
  bassPattern.push(...(bar >= 4 ? acidBar : silentBar));
}

// ============================================================
// SET PATTERNS
// ============================================================

jb.session._nodes.jb01.setPattern(drumPattern);
jb.session._nodes.jt10.setPattern(bassPattern);

// ============================================================
// SOUND DESIGN
// ============================================================

await jb.tool('tweak', { path: 'jb01.kick.decay', value: 15 });
await jb.tool('tweak', { path: 'jb01.kick.attack', value: 45 });
await jb.tool('tweak', { path: 'jb01.kick.tune', value: -3 });
await jb.tool('tweak', { path: 'jb01.level', value: 0 });
await jb.tool('tweak', { path: 'jb01.ch.decay', value: 12 });
await jb.tool('tweak', { path: 'jb01.ch.level', value: -8 });

await jb.tool('tweak_jt10', { sawLevel: 80, pulseLevel: 0, subLevel: 45, subMode: 1 });
await jb.tool('tweak_jt10', { cutoff: 100, resonance: 0, envMod: 55, keyTrack: 30 });
await jb.tool('tweak_jt10', { attack: 0, decay: 30, sustain: 10, release: 12 });
await jb.tool('tweak_jt10', { filterAttack: 0, filterDecay: 28, filterSustain: 5, filterRelease: 10 });
await jb.tool('tweak_jt10', { glideTime: 15 });
await jb.tool('tweak', { path: 'jt10.level', value: -16 });

// ============================================================
// AUTOMATION — the slow burn
//
// JT10 cutoff: 100Hz → 500Hz over bars 5-28, pulls back 29-31
// CH decay: 12 → 55 over bars 3-28
// ============================================================

// Build 512-step (32 bars × 16 steps) automation arrays

// JT10 cutoff (Hz → engine units)
const cutoffDef = JT10_PARAMS.lead.cutoff;
const cutoffAuto = [];
for (let bar = 0; bar < 32; bar++) {
  let hz;
  if (bar < 4) hz = 100;
  else if (bar < 28) hz = 100 + ((bar - 4) / 23) * 400;  // 100 → 500
  else if (bar < 31) hz = 350;  // pull back for tension
  else hz = 200;  // ghost bar
  const eng = toEngine(hz, cutoffDef);
  for (let s = 0; s < 16; s++) cutoffAuto.push(eng);
}
jb.session.params.automation.set('jt10.lead.cutoff', cutoffAuto);

// CH decay (0-100 → engine units)
const chDecayDef = JB01_PARAMS.ch.decay;
const chDecayAuto = [];
for (let bar = 0; bar < 32; bar++) {
  let val;
  if (bar < 2) val = 12;
  else if (bar < 28) val = 12 + ((bar - 2) / 25) * 43;  // 12 → 55
  else val = 55;  // wide open
  const eng = toEngine(val, chDecayDef);
  for (let s = 0; s < 16; s++) chDecayAuto.push(eng);
}
jb.session.params.automation.set('jb01.ch.decay', chDecayAuto);

// ============================================================
// RENDER
// ============================================================

console.log('Rendering Hawtin-style minimal — 32 bars at 126 BPM...');
console.log('Automation: cutoff 100→500Hz, ch decay 12→55');
console.log('Arrangement: Kick(2) → +hats(2) → +acid w/ sweep(27) → ghost(1)');

const result = await jb.render('hallman-hawtin-01', 32);
console.log(result);
console.log('Done.');
