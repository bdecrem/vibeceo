#!/usr/bin/env node
/**
 * Kick + Bass test — Hallman
 * 
 * JB01 kick (4x4) + JB202 bass (simple A notes). 4 bars. 130 BPM.
 * Just testing how the two instruments sit together.
 */

import { createSession } from './core/session.js';
import { renderSession } from './core/render.js';

const session = createSession({ bpm: 130, sampleRate: 44100 });

const VOICES = ['kick','snare','clap','ch','oh','lowtom','hitom','cymbal'];

// ============================================================
// JB01 — Just the kick, four on the floor, 4 bars
// ============================================================
const drumPattern = {};
for (const v of VOICES) {
  drumPattern[v] = Array(64).fill(null).map(() => ({ velocity: 0, accent: false }));
}
// Kick on every beat across 4 bars (steps 0,4,8,12, 16,20,24,28, ...)
for (let bar = 0; bar < 4; bar++) {
  for (let beat = 0; beat < 4; beat++) {
    drumPattern.kick[bar * 16 + beat * 4] = { velocity: 127, accent: true };
  }
}

session._nodes.jb01.setPattern(drumPattern);

// Kick tuning: heavy, solid
session.set('jb01.kick.tune', -3);
session.set('jb01.kick.decay', 70);
session.set('jb01.kick.attack', 55);
session.set('jb01.kick.sweep', 85);
session.set('jb01.kick.level', 0);

// ============================================================
// JB202 — Simple A notes. Just 4 hits per bar.
// A1 on beats 1 and 3, that's it. Simple.
// ============================================================
const bassPattern = [];
for (let bar = 0; bar < 4; bar++) {
  for (let step = 0; step < 16; step++) {
    if (step === 0) {
      // Beat 1: root
      bassPattern.push({ note: 'A1', gate: true, accent: true, slide: false });
    } else if (step === 4) {
      // Beat 2: rest (let kick breathe)
      bassPattern.push({ note: 'A1', gate: false, accent: false, slide: false });
    } else if (step === 8) {
      // Beat 3: root again
      bassPattern.push({ note: 'A1', gate: true, accent: false, slide: false });
    } else if (step === 12) {
      // Beat 4: octave up for a little movement
      bassPattern.push({ note: 'A2', gate: true, accent: false, slide: false });
    } else {
      bassPattern.push({ note: 'A1', gate: false, accent: false, slide: false });
    }
  }
}

session._nodes.jb202.setPattern(bassPattern);

// Bass sound: simple, sub-heavy, stays out of the kick's way
session.set('jb202.osc1Waveform', 'square');
session.set('jb202.osc1Level', 80);
session.set('jb202.osc2Waveform', 'square');
session.set('jb202.osc2Octave', 0);
session.set('jb202.osc2Detune', 5);
session.set('jb202.osc2Level', 50);

session.set('jb202.filterCutoff', 250);
session.set('jb202.filterResonance', 10);
session.set('jb202.filterEnvAmount', 20);
session.set('jb202.filterDecay', 35);
session.set('jb202.filterSustain', 10);
session.set('jb202.ampDecay', 50);
session.set('jb202.ampSustain', 20);
session.set('jb202.ampRelease', 15);
session.set('jb202.drive', 15);
session.set('jb202.level', 65);

// ============================================================
// RENDER — 4 bars
// ============================================================

const outputFile = process.argv[2] || 'kick-bass-test.wav';
console.log(`Rendering kick + bass test at ${session.bpm} BPM...`);
console.log('JB01 kick (4x4) + JB202 bass (A notes)');
console.log('4 bars');

try {
  const result = await renderSession(session, 4, outputFile);
  console.log(result);
  console.log(`Output: ${outputFile}`);
} catch (err) {
  console.error('Render failed:', err);
  process.exit(1);
}
