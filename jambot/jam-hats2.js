#!/usr/bin/env node
/**
 * Open Hat Decay Jam — JB01 (simple render, no arrangement)
 * Automation on oh.decay — per-step values cycle every bar.
 */

import { createSession } from './core/session.js';
import { renderSession } from './core/render.js';

const session = createSession({ bpm: 133, sampleRate: 44100 });

// Drums
session._nodes.jb01.setPattern({
  kick: [0, 4, 8, 12],
  clap: [4, 12],
  oh:   [2, 4, 6, 8, 10, 12, 14],
  ch:   [1, 3, 5, 7, 9, 11, 13, 15],
});

// Params (engine units 0-1 since it warns about producer units)
session._nodes.jb01.setParam('kick', 'decay', 0.7);
session._nodes.jb01.setParam('kick', 'tune', -0.25);
session._nodes.jb01.setParam('kick', 'level', 1.0);
session._nodes.jb01.setParam('clap', 'decay', 0.25);
session._nodes.jb01.setParam('clap', 'level', 0.6);
session._nodes.jb01.setParam('oh', 'decay', 0.5);
session._nodes.jb01.setParam('oh', 'level', 0.7);
session._nodes.jb01.setParam('ch', 'decay', 0.1);
session._nodes.jb01.setParam('ch', 'level', 0.35);

// Automation: oh.decay — Jeff Mills style per-step jam
// Short = tight tick, long = washy splash
session.automate('jb01.oh.decay', [
  20, 80, 15, 90,   // short-long-short-LONG
  10, 70, 20, 85,   // tight-open-tight-OPEN
  15, 95, 10, 75,   // short-SPLASH-tight-open  
  20, 60, 30, 90,   // building to end of bar
]);

// Also jam ch.decay for texture variation
session.automate('jb01.ch.decay', [
  5, 15, 8, 30, 5, 20, 10, 35,
  5, 15, 8, 25, 5, 20, 10, 40,
]);

console.log('\n  🎩 OPEN HAT DECAY JAM — JB01');
console.log('  133 BPM | 8 bars | per-step oh.decay automation');
console.log('  OH decay: [20,80,15,90,10,70,20,85,15,95,10,75,20,60,30,90]\n');

const outputFile = process.argv[2] || 'hat-decay-jam.wav';

try {
  const result = await renderSession(session, 8, outputFile);
  console.log(`  ${result}`);
  console.log(`  Output: ${outputFile}\n`);
} catch (err) {
  console.error('Render failed:', err);
  process.exit(1);
}
