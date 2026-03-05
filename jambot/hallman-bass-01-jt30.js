#!/usr/bin/env node
/**
 * Hallman Bass 01 (JT30) — Same pattern, 303-style engine, zero resonance
 * 
 * 130 BPM, A minor. Pure filter envelope movement, no squelch.
 * The JT30 is a 303-style monosynth — saw/square, ladder filter, accent, slide.
 * With resonance at 0 it becomes this dark, subby, envelope-only bass.
 */

import { createSession } from './core/session.js';
import { renderSession } from './core/render.js';

const session = createSession({ bpm: 130, sampleRate: 44100 });

// ============================================================
// PATTERN — Same as the JB202 version
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
// SOUND DESIGN — Dark, no resonance, envelope-only character
// ============================================================

// Sawtooth — more harmonic content to work with since no resonance
session.set('jt30.waveform', 'sawtooth');

// Filter: low cutoff, ZERO resonance, envelope does everything
session.set('jt30.cutoff', 65);           // very dark starting point
session.set('jt30.resonance', 0);          // zero. none. clean.
session.set('jt30.envMod', 70);            // big envelope sweep to compensate for no reso
session.set('jt30.decay', 42);             // medium — not too plucky, not too long

// Accent: still punchy, boosts cutoff even without resonance
session.set('jt30.accent', 75);

// Drive: a bit more than the JB202 version — warm it up since no reso harmonics
session.set('jt30.drive', 35);

// Level
session.set('jt30.level', 80);

// ============================================================
// 8 bars, same loop
// ============================================================

const fullPattern = [];
for (let i = 0; i < 8; i++) {
  fullPattern.push(...pattern);
}
session._nodes.jt30.setPattern(fullPattern);

// ============================================================
// RENDER
// ============================================================

const outputFile = process.argv[2] || 'hallman-bass-01-jt30.wav';
console.log(`Rendering JT30 bassline at ${session.bpm} BPM...`);
console.log('JT30 — sawtooth, zero resonance, envelope-driven, A minor');
console.log('8 bars, single pattern loop');

try {
  const result = await renderSession(session, 8, outputFile);
  console.log(result);
  console.log(`Output: ${outputFile}`);
} catch (err) {
  console.error('Render failed:', err);
  process.exit(1);
}
