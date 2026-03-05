#!/usr/bin/env node
/**
 * Hallman Bass 01 — Minimal Techno Bassline
 * 
 * JB202 only. Hypnotic, repetitive, filter-driven.
 * 130 BPM, A minor. The kind of bass that anchors a 3am set.
 * Single pattern, 8 bars — let it breathe.
 */

import { createSession } from './core/session.js';
import { renderSession } from './core/render.js';

const session = createSession({ bpm: 130, sampleRate: 44100 });

// ============================================================
// PATTERN — Minimal techno bass
// 
// Root-heavy with tension on the offbeats.
// A1 is the anchor. The Eb2 and D2 give it that dark minor pull.
// Slides on steps 6→7 and 12→13 for that 303-ish glide.
// Rests are deliberate — the space IS the groove.
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
// SOUND DESIGN — Dark, tight, filter-heavy
// ============================================================

// Osc 1: square wave for body and harmonic content
session.set('jb202.osc1Waveform', 'square');
session.set('jb202.osc1Octave', 0);
session.set('jb202.osc1Detune', 0);
session.set('jb202.osc1Level', 85);

// Osc 2: sawtooth, sub-octave for weight
session.set('jb202.osc2Waveform', 'sawtooth');
session.set('jb202.osc2Octave', -12);
session.set('jb202.osc2Detune', 3);
session.set('jb202.osc2Level', 55);

// Filter: closed down, envelope does the talking
session.set('jb202.filterCutoff', 280);        // dark starting point
session.set('jb202.filterResonance', 42);       // enough to sing
session.set('jb202.filterEnvAmount', 55);       // accents really open it up
session.set('jb202.filterAttack', 0);           // instant snap
session.set('jb202.filterDecay', 38);           // quick pluck
session.set('jb202.filterSustain', 8);          // drops way down — tight
session.set('jb202.filterRelease', 18);         // short tail

// Amp: staccato, punchy
session.set('jb202.ampAttack', 0);
session.set('jb202.ampDecay', 35);
session.set('jb202.ampSustain', 15);
session.set('jb202.ampRelease', 15);

// Drive: warm saturation, not aggressive
session.set('jb202.drive', 25);

// Level
session.set('jb202.level', 80);

// ============================================================
// Set pattern (8 bars of the same loop — repetition is the point)
// ============================================================

const fullPattern = [];
for (let i = 0; i < 8; i++) {
  fullPattern.push(...pattern);
}
session._nodes.jb202.setPattern(fullPattern);

// ============================================================
// RENDER
// ============================================================

const outputFile = process.argv[2] || 'hallman-bass-01.wav';
console.log(`Rendering minimal techno bassline at ${session.bpm} BPM...`);
console.log('JB202 — square + saw sub, A minor, filter-driven');
console.log('8 bars, single pattern loop');

try {
  const result = await renderSession(session, 8, outputFile);
  console.log(result);
  console.log(`Output: ${outputFile}`);
} catch (err) {
  console.error('Render failed:', err);
  process.exit(1);
}
