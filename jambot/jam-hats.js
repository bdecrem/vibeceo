#!/usr/bin/env node
/**
 * Open Hat Decay Jam — JB01
 * 
 * Jamming the open hat decay per-step using Jambot's automation system.
 * Every step gets a different decay value — the hat breathes, stutters,
 * opens and closes like someone's riding the fader live.
 */

import { createSession } from './core/session.js';
import { renderSession } from './core/render.js';
import { generateAutomation } from './core/automation.js';

const session = createSession({ bpm: 133, sampleRate: 44100 });

// ============================================================
// DRUMS — JB01
// Four on the floor, clap on 2&4, open hats on every 8th
// ============================================================

session._nodes.jb01.setPattern({
  kick: [0, 4, 8, 12],
  clap: [4, 12],
  oh:   [2, 4, 6, 8, 10, 12, 14],   // open hats on most 8ths — lots to jam with
  ch:   [1, 3, 5, 7, 9, 11, 13, 15], // 16th closed hats filling the gaps
});

// Base params
session.set('jb01.kick.decay', 70);
session.set('jb01.kick.tune', -3);
session.set('jb01.kick.level', 0);
session.set('jb01.clap.decay', 25);
session.set('jb01.clap.level', -4);
session.set('jb01.oh.decay', 50);        // base — automation overrides per step
session.set('jb01.oh.level', -3);
session.set('jb01.ch.decay', 10);
session.set('jb01.ch.level', -10);

// ============================================================
// THE JAM — Open hat decay automation
// 
// 16 values, one per step. The decay changes on every hit.
// Short = tight tick. Long = washy splash. The variation IS the groove.
// ============================================================

// Pattern 1: Random chaos — every step different (bars 1-4)
const randomDecay = generateAutomation('random', 10, 95, 16);

// Pattern 2: Triangle sweep — opens up then closes down (bars 5-8)  
const triangleDecay = generateAutomation('triangle', 10, 90, 16);

// Pattern 3: Sawtooth ramp — gradually opens across the bar (bars 9-12)
const rampDecay = generateAutomation('ramp', 15, 85, 16);

// Pattern 4: Hand-crafted Jeff Mills style — accent hits get long decay
const millsDecay = [
  20, 80, 15, 90,   // short-long-short-LONG
  10, 70, 20, 85,   // tight-open-tight-OPEN
  15, 95, 10, 75,   // short-SPLASH-tight-open
  20, 60, 30, 90,   // building tension...
];

// Also jam the closed hat decay for texture
const chDecay = generateAutomation('random', 5, 40, 16);

// Let's render 4 separate sections and stitch them

console.log('\n  🎩 OPEN HAT DECAY JAM — JB01');
console.log(`  133 BPM | 16 bars | 4 automation patterns\n`);

// Render each section with different automation
const sections = [
  { name: 'RANDOM',   ohDecay: randomDecay,   bars: 4 },
  { name: 'TRIANGLE', ohDecay: triangleDecay,  bars: 4 },
  { name: 'RAMP',     ohDecay: rampDecay,      bars: 4 },
  { name: 'MILLS',    ohDecay: millsDecay,     bars: 4 },
];

for (const s of sections) {
  console.log(`  ${s.name}: OH decay = [${s.ohDecay.map(v => Math.round(v)).join(', ')}]`);
}

// Use the automation system — set it on the session
session.automate('jb01.oh.decay', millsDecay);  // start with mills
session.automate('jb01.ch.decay', chDecay);

// For the full jam, render 16 bars changing automation every 4
// Since renderSession renders in one shot, let's use the arrangement system
// with saved patterns

// Save pattern A with random decay automation
session.automate('jb01.oh.decay', randomDecay);
const patternA = session._nodes.jb01.serialize();
patternA.automation = { 'oh.decay': randomDecay, 'ch.decay': chDecay };

// Save pattern B with triangle
const patternB = { ...patternA, automation: { 'oh.decay': triangleDecay, 'ch.decay': chDecay } };

// Save pattern C with ramp
const patternC = { ...patternA, automation: { 'oh.decay': rampDecay, 'ch.decay': chDecay } };

// Save pattern D with mills
const patternD = { ...patternA, automation: { 'oh.decay': millsDecay, 'ch.decay': chDecay } };

// Store patterns
session.patterns = session.patterns || {};
session.patterns.jb01 = {
  A: patternA,
  B: patternB,
  C: patternC,
  D: patternD,
};

// Set arrangement
session.arrangement = [
  { bars: 4, patterns: { jb01: 'A' } },
  { bars: 4, patterns: { jb01: 'B' } },
  { bars: 4, patterns: { jb01: 'C' } },
  { bars: 4, patterns: { jb01: 'D' } },
];

console.log('\n  Rendering 16 bars...');

const outputFile = process.argv[2] || 'hat-decay-jam.wav';

try {
  const result = await renderSession(session, 16, outputFile);
  console.log(`  ${result}`);
  console.log(`  Output: ${outputFile}\n`);
} catch (err) {
  console.error('Render failed:', err);
  process.exit(1);
}
