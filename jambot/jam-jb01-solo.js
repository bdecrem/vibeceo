#!/usr/bin/env node
/**
 * JB01 Solo Drum Jam — Hallman
 * 
 * Pure JB01 drums. No synths. 132 BPM.
 * Inspired by Jeff Mills / Plastikman — hypnotic, evolving drum patterns.
 * 
 * 4 patterns across 16 bars:
 *   A: Kick + CH only (stripped)
 *   B: Add clap + OH (builds)
 *   C: Full kit — toms, snare ghost hits (peak energy)
 *   D: Breakdown — kick drops out, just hats and clap (tension)
 * 
 * Arrangement: AABB BBCC CCDD CCAA
 */

import { createSession } from './core/session.js';
import { renderSession } from './core/render.js';

const session = createSession({ bpm: 132, sampleRate: 44100 });

const VOICES = ['kick','snare','clap','ch','oh','lowtom','hitom','cymbal'];

function emptyBar() {
  const p = {};
  for (const v of VOICES) {
    p[v] = Array(16).fill(null).map(() => ({ velocity: 0, accent: false }));
  }
  return p;
}

function hits(pattern, voice, steps, vel = 100, accent = false) {
  for (const s of steps) {
    pattern[voice][s] = { velocity: vel, accent };
  }
}

// ============================================================
// PATTERN A — Stripped. Kick + closed hats. The hypnosis starts.
// ============================================================
function patternA() {
  const p = emptyBar();
  // Kick: four on the floor
  hits(p, 'kick', [0, 4, 8, 12], 127, true);
  // CH: 16ths but with velocity variation — the hat IS the groove
  hits(p, 'ch', [0, 2, 4, 6, 8, 10, 12, 14], 90);     // on-beats louder
  hits(p, 'ch', [1, 3, 5, 7, 9, 11, 13, 15], 50);      // offbeats quiet
  // Accent certain hats for shuffle feel
  p.ch[2] = { velocity: 110, accent: true };
  p.ch[10] = { velocity: 110, accent: true };
  return p;
}

// ============================================================
// PATTERN B — Clap on 2&4, OH opens up the space
// ============================================================
function patternB() {
  const p = patternA(); // builds on A
  // Clap on 2 and 4
  hits(p, 'clap', [4, 12], 100, false);
  // OH on the & of 2 and & of 4 — classic
  hits(p, 'oh', [6, 14], 70);
  return p;
}

// ============================================================
// PATTERN C — Full kit. Toms + snare ghosts. Peak energy.
// ============================================================
function patternC() {
  const p = patternB(); // builds on B
  // Snare ghost notes — quiet, just texture
  hits(p, 'snare', [3, 11], 40);
  // Low tom fills — end of bar momentum
  hits(p, 'lowtom', [13], 80);
  hits(p, 'hitom', [14], 70);
  // Extra kick for drive
  hits(p, 'kick', [6], 80, false); // offbeat kick, lower velocity
  return p;
}

// ============================================================
// PATTERN D — Breakdown. No kick. Just hats, clap, space.
// ============================================================
function patternD() {
  const p = emptyBar();
  // No kick — feel the absence
  // CH: sparse, just offbeats
  hits(p, 'ch', [2, 6, 10, 14], 70);
  // OH: breathing
  hits(p, 'oh', [0, 8], 60);
  // Clap: 4 only (half time feel)
  hits(p, 'clap', [12], 90, true);
  // Cymbal swell hint
  hits(p, 'cymbal', [0], 30);
  return p;
}

// ============================================================
// TUNING — Dark, tight, Berlin-adjacent
// ============================================================

// Kick: tuned down, long decay, heavy sweep
session.set('jb01.kick.tune', -4);
session.set('jb01.kick.decay', 75);
session.set('jb01.kick.attack', 60);
session.set('jb01.kick.sweep', 80);
session.set('jb01.kick.level', 0);

// Snare: low, tight, just a ghost
session.set('jb01.snare.tune', -3);
session.set('jb01.snare.decay', 25);
session.set('jb01.snare.tone', 30);
session.set('jb01.snare.snappy', 70);
session.set('jb01.snare.level', -12);

// Clap: dry and short
session.set('jb01.clap.decay', 20);
session.set('jb01.clap.tone', 40);
session.set('jb01.clap.level', -4);

// CH: tight, dark
session.set('jb01.ch.decay', 12);
session.set('jb01.ch.tone', 35);
session.set('jb01.ch.level', -6);

// OH: medium, not washy
session.set('jb01.oh.decay', 40);
session.set('jb01.oh.tone', 35);
session.set('jb01.oh.level', -9);

// Toms: tuned apart, short
session.set('jb01.lowtom.tune', -6);
session.set('jb01.lowtom.decay', 40);
session.set('jb01.lowtom.level', -6);
session.set('jb01.hitom.tune', 3);
session.set('jb01.hitom.decay', 30);
session.set('jb01.hitom.level', -8);

// Cymbal: dark wash
session.set('jb01.cymbal.tune', -4);
session.set('jb01.cymbal.decay', 50);
session.set('jb01.cymbal.level', -18);

// ============================================================
// ARRANGEMENT — 16 bars: AABB BBCC CCDD CCAA
// ============================================================

const patterns = {
  A: patternA(),
  B: patternB(),
  C: patternC(),
  D: patternD(),
};

const arrangement = ['A','A','B','B','B','B','C','C','C','C','D','D','C','C','A','A'];

// Build multi-bar pattern by concatenating
const fullPattern = {};
for (const v of VOICES) {
  fullPattern[v] = [];
}
for (const section of arrangement) {
  const p = patterns[section];
  for (const v of VOICES) {
    fullPattern[v].push(...p[v]);
  }
}

session._nodes.jb01.setPattern(fullPattern);

// ============================================================
// RENDER
// ============================================================

const outputFile = process.argv[2] || 'jb01-solo-jam.wav';
console.log(`Rendering JB01 drum jam at ${session.bpm} BPM...`);
console.log('JB01 only — kick, hats, clap, toms, cymbal');
console.log(`Arrangement: ${arrangement.join(' ')}`);
console.log('16 bars');

try {
  const result = await renderSession(session, 16, outputFile);
  console.log(result);
  console.log(`Output: ${outputFile}`);
} catch (err) {
  console.error('Render failed:', err);
  process.exit(1);
}
