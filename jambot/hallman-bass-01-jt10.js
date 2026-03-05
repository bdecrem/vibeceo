#!/usr/bin/env node
/**
 * Hallman Bass 01 (JT10) — Same pattern, 101-style engine
 * 
 * 130 BPM, A minor. The JT10 is a 101-style monosynth —
 * saw + pulse oscs, sub oscillator, ladder filter, LFO, glide.
 * Using it as a bass here: saw only, sub -1oct for weight,
 * filter envelope for movement, no resonance per request.
 */

import { createSession } from './core/session.js';
import { renderSession } from './core/render.js';

const session = createSession({ bpm: 130, sampleRate: 44100 });

// ============================================================
// PATTERN — Same as JB202 and JT30 versions
// ============================================================

const pattern = [
  { note: 'A1',  gate: true,  accent: true,  slide: false },  // 1 - ROOT, heavy
  { note: 'A1',  gate: false, accent: false, slide: false },  // 2 - space
  { note: 'A1',  gate: true,  accent: false, slide: false },  // 3 - pulse
  { note: 'A1',  gate: false, accent: false, slide: false },  // 4 - space
  { note: 'A1',  gate: true,  accent: true,  slide: false },  // 5 - ROOT
  { note: 'A1',  gate: true,  accent: false, slide: true  },  // 6 - slide into...
  { note: 'D2',  gate: true,  accent: false, slide: false },  // 7 - 4th, lift
  { note: 'D2',  gate: false, accent: false, slide: false },  // 8 - breathe
  { note: 'A1',  gate: true,  accent: true,  slide: false },  // 9 - ROOT, reset
  { note: 'A1',  gate: false, accent: false, slide: false },  // 10 - space
  { note: 'E2',  gate: true,  accent: false, slide: false },  // 11 - 5th, tension
  { note: 'E2',  gate: true,  accent: false, slide: true  },  // 12 - slide down
  { note: 'C2',  gate: true,  accent: true,  slide: false },  // 13 - minor 3rd, DARK
  { note: 'C2',  gate: false, accent: false, slide: false },  // 14 - space
  { note: 'A1',  gate: true,  accent: false, slide: false },  // 15 - home
  { note: 'A1',  gate: false, accent: false, slide: false },  // 16 - rest
];

// ============================================================
// SOUND DESIGN — Saw + sub, no resonance, filter envelope
// ============================================================

// Oscillators: sawtooth main, no pulse, sub -1 octave for weight
session.set('jt10.sawLevel', 75);
session.set('jt10.pulseLevel', 0);           // off — pure saw
session.set('jt10.pulseWidth', 50);
session.set('jt10.subLevel', 60);             // sub for low-end body
session.set('jt10.subMode', 1);               // -1 octave

// Filter: dark, zero resonance, envelope sweeps
session.set('jt10.cutoff', 200);              // low starting point
session.set('jt10.resonance', 0);             // zero as requested
session.set('jt10.envMod', 65);               // healthy envelope sweep
session.set('jt10.keyTrack', 40);             // some tracking so higher notes open up

// Amp envelope: punchy bass
session.set('jt10.attack', 0);
session.set('jt10.decay', 40);
session.set('jt10.sustain', 25);
session.set('jt10.release', 18);

// Filter envelope: separate, tighter than amp
session.set('jt10.filterAttack', 0);
session.set('jt10.filterDecay', 32);          // quicker than amp decay
session.set('jt10.filterSustain', 10);        // drops low
session.set('jt10.filterRelease', 15);

// Glide: moderate for the slides
session.set('jt10.glideTime', 20);

// LFO: off — keeping it clean
session.set('jt10.lfoToPitch', 0);
session.set('jt10.lfoToFilter', 0);
session.set('jt10.lfoToPW', 0);

// Level
session.set('jt10.level', 80);

// ============================================================
// 8 bars, same loop
// ============================================================

const fullPattern = [];
for (let i = 0; i < 8; i++) {
  fullPattern.push(...pattern);
}
session._nodes.jt10.setPattern(fullPattern);

// ============================================================
// RENDER
// ============================================================

const outputFile = process.argv[2] || 'hallman-bass-01-jt10.wav';
console.log(`Rendering JT10 bassline at ${session.bpm} BPM...`);
console.log('JT10 — saw + sub, zero resonance, separate filter env, A minor');
console.log('8 bars, single pattern loop');

try {
  const result = await renderSession(session, 8, outputFile);
  console.log(result);
  console.log(`Output: ${outputFile}`);
} catch (err) {
  console.error('Render failed:', err);
  process.exit(1);
}
