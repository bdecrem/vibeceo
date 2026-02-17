#!/usr/bin/env node
/**
 * Berlin Techno Track — produced by Jam
 * Standalone render script using Jambot's engine
 *
 * JT90 (909 drums) + JB202 (bass) + JT30 (acid stab)
 * Dark, hypnotic, stripped-back Berlin techno at 133 BPM
 */

import { createSession } from './core/session.js';
import { renderSession } from './core/render.js';

const session = createSession({ bpm: 133, sampleRate: 44100 });

// ============================================================
// DRUMS — JT90 (909)
// Kick on every beat. Sparse hats. Dry clap on 2&4.
// ============================================================

// Pattern: 16 steps = 1 bar
// Kick: four on the floor
// CH: offbeat 8ths only (steps 2, 6, 10, 14)
// Clap: 2 and 4 (steps 4, 12)
// Ride: very sparse — step 8 only (ghost)
// JT90 pattern: each voice is 16 steps of { velocity, accent }
function makeJT90Pattern(hits, vel = 100, accent = false) {
  const steps = Array(16).fill(null).map(() => ({ velocity: 0, accent: false }));
  for (const s of hits) {
    steps[s] = { velocity: vel, accent };
  }
  return steps;
}

const jt90Pattern = {};
const VOICES_ALL = ['kick','snare','clap','rimshot','lowtom','midtom','hitom','ch','oh','crash','ride'];
for (const v of VOICES_ALL) {
  jt90Pattern[v] = Array(16).fill(null).map(() => ({ velocity: 0, accent: false }));
}
jt90Pattern.kick = makeJT90Pattern([0, 4, 8, 12], 127, true);
jt90Pattern.clap = makeJT90Pattern([4, 12], 100);
jt90Pattern.ch = makeJT90Pattern([2, 6, 10, 14], 70);
jt90Pattern.ride = makeJT90Pattern([8], 40);

session._nodes.jt90.setPattern(jt90Pattern);

// Tune the 909 — dark and heavy
session.set('jt90.kick.decay', 70);     // long tail
session.set('jt90.kick.attack', 50);    // moderate click
session.set('jt90.kick.tune', -4);      // tuned DOWN — chest impact
session.set('jt90.kick.level', 0);      // full
session.set('jt90.clap.decay', 20);     // short and dry
session.set('jt90.clap.level', -6);     // pulled back
session.set('jt90.ch.decay', 15);       // tight
session.set('jt90.ch.level', -12);      // quiet — just texture
session.set('jt90.ride.decay', 30);
session.set('jt90.ride.level', -18);    // barely there

// ============================================================
// BASS — JB202
// Sub-heavy, mostly root note. Square wave, filter closed.
// ============================================================

// A minor — root A1 (MIDI 33)
// Mostly root with occasional minor 2nd tension
const bassPattern = [];
for (let i = 0; i < 16; i++) {
  if (i % 4 === 0) {
    // On-beat: root note, accented
    bassPattern.push({ note: 'A1', gate: true, accent: true, slide: false });
  } else if (i === 7) {
    // Tension: Bb1 (minor 2nd) — dread
    bassPattern.push({ note: 'Bb1', gate: true, accent: false, slide: true });
  } else if (i === 11) {
    // Rest before clap
    bassPattern.push({ note: 'A1', gate: false, accent: false, slide: false });
  } else if (i % 2 === 0) {
    // Even steps: root, gated
    bassPattern.push({ note: 'A1', gate: true, accent: false, slide: false });
  } else {
    // Odd steps: rest — let the kick tail breathe
    bassPattern.push({ note: 'A1', gate: false, accent: false, slide: false });
  }
}

session._nodes.jb202.setPattern(bassPattern);

// Sound: dark, subby, filtered down
session.set('jb202.osc1Waveform', 'square');
session.set('jb202.filterCutoff', 200);      // very closed
session.set('jb202.filterResonance', 10);    // no squelch — just weight
session.set('jb202.drive', 15);              // subtle warmth
session.set('jb202.filterDecay', 30);
session.set('jb202.filterSustain', 10);
session.set('jb202.ampDecay', 60);
session.set('jb202.ampSustain', 40);
session.set('jb202.level', 70);

// ============================================================
// ACID STAB — JT30 (303)
// Not a full acid line. Just a single repeated note with
// filter movement. Enters sparse, like a signal in the dark.
// ============================================================

const acidPattern = [];
for (let i = 0; i < 16; i++) {
  if (i === 0) {
    acidPattern.push({ note: 'A2', gate: true, accent: true, slide: false });
  } else if (i === 6) {
    acidPattern.push({ note: 'Bb2', gate: true, accent: false, slide: true });
  } else if (i === 10) {
    acidPattern.push({ note: 'A2', gate: true, accent: false, slide: false });
  } else {
    acidPattern.push({ note: 'A2', gate: false, accent: false, slide: false });
  }
}

session._nodes.jt30.setPattern(acidPattern);

// Sound: dark, restrained, not screamy
session.set('jt30.waveform', 'square');
session.set('jt30.filterCutoff', 300);       // closed
session.set('jt30.filterResonance', 40);     // some character but not acid scream
session.set('jt30.filterEnvAmount', 30);     // subtle filter movement
session.set('jt30.filterDecay', 40);
session.set('jt30.accentLevel', 50);
session.set('jt30.drive', 20);
session.set('jt30.level', 50);              // sits behind the kick

// ============================================================
// MIX
// ============================================================

// Sidechain bass to kick
session.mixer = session.mixer || {};
session.mixer.channelInserts = session.mixer.channelInserts || {};
session.mixer.channelInserts.jb202 = [
  { type: 'ducker', params: { trigger: 'kick', amount: 0.5 } }
];
session.mixer.channelInserts.jt30 = [
  { type: 'ducker', params: { trigger: 'kick', amount: 0.3 } }
];

// Instrument levels (dB)
session.jt90Level = 0;
session.jb202Level = -3;
session.jt30Level = -9;

// ============================================================
// RENDER — 8 bars
// ============================================================

const outputFile = process.argv[2] || 'berlin-jam.wav';
console.log(`Rendering Berlin techno at ${session.bpm} BPM...`);
console.log('JT90 (909) + JB202 (bass) + JT30 (acid stab)');
console.log(`Key: A minor | Swing: 0 | Bars: 8`);

try {
  const result = await renderSession(session, 8, outputFile);
  console.log(result);
  console.log(`Output: ${outputFile}`);
} catch (err) {
  console.error('Render failed:', err);
  process.exit(1);
}
