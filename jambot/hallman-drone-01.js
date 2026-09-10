#!/usr/bin/env node
/**
 * Hallman Drone 01 — ambient background for art pieces
 *
 * JT10 only. No drums, no rhythm. Sustained low drone with slow filter
 * breathing. Uses the proven Hawtin JT10 patch (saw, zero resonance)
 * but with long gates and glacial automation.
 *
 * 60 BPM, 8 bars = 32 seconds. Designed to loop seamlessly.
 */

import { JambotHeadless } from './headless.js';
import { toEngine } from './params/converters.js';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const JT10_PARAMS = require('./params/jt10-params.json');

const jb = new JambotHeadless({ bpm: 60 });

// ============================================================
// PATTERN — sustained drone, minimal movement
// G1 held for most steps, occasional octave shift for subtle color
// ============================================================

const droneBar = [
  { note: 'G1', gate: true, accent: false, slide: true },
  { note: 'G1', gate: true, accent: false, slide: true },
  { note: 'G1', gate: true, accent: false, slide: true },
  { note: 'G1', gate: true, accent: false, slide: true },
  { note: 'G1', gate: true, accent: false, slide: true },
  { note: 'G1', gate: true, accent: false, slide: true },
  { note: 'G1', gate: true, accent: false, slide: true },
  { note: 'G1', gate: true, accent: false, slide: true },
  { note: 'G1', gate: true, accent: false, slide: true },
  { note: 'G1', gate: true, accent: false, slide: true },
  { note: 'G1', gate: true, accent: false, slide: true },
  { note: 'G1', gate: true, accent: false, slide: true },
  { note: 'G1', gate: true, accent: false, slide: true },
  { note: 'G1', gate: true, accent: false, slide: true },
  { note: 'G1', gate: true, accent: false, slide: true },
  { note: 'G1', gate: true, accent: false, slide: true },
];

// Bar 5 has a brief octave lift then settles — the only moment
const liftBar = [
  { note: 'G1', gate: true, accent: false, slide: true },
  { note: 'G1', gate: true, accent: false, slide: true },
  { note: 'G1', gate: true, accent: false, slide: true },
  { note: 'G1', gate: true, accent: false, slide: true },
  { note: 'G2', gate: true, accent: false, slide: true },
  { note: 'G2', gate: true, accent: false, slide: true },
  { note: 'G1', gate: true, accent: false, slide: true },
  { note: 'G1', gate: true, accent: false, slide: true },
  { note: 'G1', gate: true, accent: false, slide: true },
  { note: 'G1', gate: true, accent: false, slide: true },
  { note: 'G1', gate: true, accent: false, slide: true },
  { note: 'G1', gate: true, accent: false, slide: true },
  { note: 'G1', gate: true, accent: false, slide: true },
  { note: 'G1', gate: true, accent: false, slide: true },
  { note: 'G1', gate: true, accent: false, slide: true },
  { note: 'G1', gate: true, accent: false, slide: true },
];

const fullPattern = [];
for (let bar = 0; bar < 8; bar++) {
  fullPattern.push(...(bar === 4 ? liftBar : droneBar));
}
jb.session._nodes.jt10.setPattern(fullPattern);

// ============================================================
// SOUND DESIGN — proven Hawtin patch, softer
// ============================================================

await jb.tool('tweak_jt10', { sawLevel: 65, pulseLevel: 0, subLevel: 55, subMode: 1 });
await jb.tool('tweak_jt10', { cutoff: 150, resonance: 0, envMod: 20, keyTrack: 20 });
await jb.tool('tweak_jt10', { attack: 80, decay: 90, sustain: 75, release: 85 });
await jb.tool('tweak_jt10', { filterAttack: 60, filterDecay: 80, filterSustain: 60, filterRelease: 70 });
await jb.tool('tweak_jt10', { glideTime: 45 });
await jb.tool('tweak', { path: 'jt10.level', value: -22 });

// ============================================================
// AUTOMATION — slow filter breathing 150→280→150 Hz over 8 bars
// ============================================================

const cutoffDef = JT10_PARAMS.lead.cutoff;
const cutoffAuto = [];
for (let bar = 0; bar < 8; bar++) {
  const progress = bar / 7;
  const hz = 150 + Math.sin(progress * Math.PI) * 130; // 150 → 280 → 150
  const eng = toEngine(hz, cutoffDef);
  for (let s = 0; s < 16; s++) cutoffAuto.push(eng);
}
jb.session.params.automation.set('jt10.lead.cutoff', cutoffAuto);

// ============================================================
// RENDER
// ============================================================

console.log('Rendering Hallman Drone 01 — 8 bars at 60 BPM, JT10 sustained');
const result = await jb.render('hallman-drone-01', 8);
console.log(result);
console.log('Done.');
