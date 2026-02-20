#!/usr/bin/env node
/**
 * JB202 Solo Jam — Hallman
 * 
 * Pure JB202 bass synth, nothing else. Minimal techno bassline.
 * Two patterns alternating: A (hypnotic root pulse) and B (tension/release).
 * 130 BPM, C minor. 16 bars total.
 */

import { createSession } from './core/session.js';
import { renderSession } from './core/render.js';

const session = createSession({ bpm: 130, sampleRate: 44100 });

// ============================================================
// JB202 — The Only Voice
// 
// Concept: a single bass synth doing everything.
// Pattern A: hypnotic root pulse with filter movement
// Pattern B: melodic variation with slides
// ============================================================

// Pattern A — Hypnotic root pulse
// C2 on every other step, accents on downbeats, one ghost Eb2
const patternA = [
  { note: 'C2',  gate: true,  accent: true,  slide: false },  // 1 - ROOT, hard
  { note: 'C2',  gate: false, accent: false, slide: false },  // 2 - rest
  { note: 'C2',  gate: true,  accent: false, slide: false },  // 3 - pulse
  { note: 'C2',  gate: false, accent: false, slide: false },  // 4 - rest
  { note: 'C2',  gate: true,  accent: true,  slide: false },  // 5 - ROOT
  { note: 'C2',  gate: true,  accent: false, slide: true  },  // 6 - slide into...
  { note: 'Eb2', gate: true,  accent: false, slide: false },  // 7 - minor 3rd, tension
  { note: 'C2',  gate: false, accent: false, slide: false },  // 8 - rest (breathe)
  { note: 'C2',  gate: true,  accent: true,  slide: false },  // 9 - ROOT
  { note: 'C2',  gate: false, accent: false, slide: false },  // 10 - rest
  { note: 'C2',  gate: true,  accent: false, slide: false },  // 11 - pulse
  { note: 'C2',  gate: true,  accent: false, slide: true  },  // 12 - slide
  { note: 'G1',  gate: true,  accent: true,  slide: false },  // 13 - 5th below, weight
  { note: 'G1',  gate: false, accent: false, slide: false },  // 14 - rest
  { note: 'C2',  gate: true,  accent: false, slide: false },  // 15 - back to root
  { note: 'C2',  gate: false, accent: false, slide: false },  // 16 - rest
];

// Pattern B — Melodic tension
// More movement, chromatic tension with Bb1 and Ab1
const patternB = [
  { note: 'C2',  gate: true,  accent: true,  slide: false },  // 1
  { note: 'C2',  gate: true,  accent: false, slide: true  },  // 2 - slide up
  { note: 'Eb2', gate: true,  accent: false, slide: false },  // 3 - minor 3rd
  { note: 'Eb2', gate: false, accent: false, slide: false },  // 4 - rest
  { note: 'F2',  gate: true,  accent: true,  slide: false },  // 5 - 4th, momentum
  { note: 'F2',  gate: false, accent: false, slide: false },  // 6 - rest
  { note: 'Eb2', gate: true,  accent: false, slide: true  },  // 7 - slide back
  { note: 'C2',  gate: true,  accent: false, slide: false },  // 8 - resolve
  { note: 'C2',  gate: true,  accent: true,  slide: false },  // 9 - root anchor
  { note: 'C2',  gate: false, accent: false, slide: false },  // 10 - rest
  { note: 'Bb1', gate: true,  accent: false, slide: false },  // 11 - minor 7th below, DARK
  { note: 'Bb1', gate: true,  accent: false, slide: true  },  // 12 - slide
  { note: 'Ab1', gate: true,  accent: true,  slide: false },  // 13 - flat 6th, dread
  { note: 'Ab1', gate: false, accent: false, slide: false },  // 14 - rest
  { note: 'G1',  gate: true,  accent: false, slide: true  },  // 15 - slide to 5th
  { note: 'C2',  gate: true,  accent: false, slide: false },  // 16 - resolve home
];

// ============================================================
// SOUND DESIGN — Two sawtooths, detuned, filter sweep
// ============================================================

// Osc 1: sawtooth, main body
session.set('jb202.osc1Waveform', 'sawtooth');
session.set('jb202.osc1Octave', 0);
session.set('jb202.osc1Detune', 0);
session.set('jb202.osc1Level', 80);

// Osc 2: sawtooth, slightly detuned for thickness
session.set('jb202.osc2Waveform', 'sawtooth');
session.set('jb202.osc2Octave', 0);
session.set('jb202.osc2Detune', 8);
session.set('jb202.osc2Level', 65);

// Filter: starts closed, envelope opens it on accents
session.set('jb202.filterCutoff', 350);        // warm but not muddy
session.set('jb202.filterResonance', 35);       // some character, not screamy
session.set('jb202.filterEnvAmount', 45);       // envelope opens the filter nicely
session.set('jb202.filterAttack', 0);           // instant
session.set('jb202.filterDecay', 50);           // medium sweep
session.set('jb202.filterSustain', 15);         // drops back down
session.set('jb202.filterRelease', 25);         // controlled tail

// Amp: punchy with some sustain
session.set('jb202.ampAttack', 0);
session.set('jb202.ampDecay', 45);
session.set('jb202.ampSustain', 30);
session.set('jb202.ampRelease', 20);

// Drive: warm, not distorted
session.set('jb202.drive', 30);

// Level
session.set('jb202.level', 85);

// ============================================================
// ARRANGEMENT — 16 bars: AAAA AABB AABB ABBA
// ============================================================

// Build the full 16-bar pattern by concatenating A and B patterns
const arrangement = [
  // Bars 1-4: establish the groove
  ...patternA, ...patternA, ...patternA, ...patternA,
  // Bars 5-8: introduce B
  ...patternA, ...patternA, ...patternB, ...patternB,
  // Bars 9-12: alternate
  ...patternA, ...patternA, ...patternB, ...patternB,
  // Bars 13-16: tension and resolve
  ...patternA, ...patternB, ...patternB, ...patternA,
];

session._nodes.jb202.setPattern(arrangement);

// ============================================================
// RENDER
// ============================================================

const outputFile = process.argv[2] || 'jb202-solo-jam.wav';
console.log(`Rendering JB202 solo jam at ${session.bpm} BPM...`);
console.log('Pure JB202 — two detuned saws, filter sweep, C minor');
console.log(`Bars: 16 | Pattern: AAAA AABB AABB ABBA`);

try {
  const result = await renderSession(session, 16, outputFile);
  console.log(result);
  console.log(`Output: ${outputFile}`);
} catch (err) {
  console.error('Render failed:', err);
  process.exit(1);
}
