#!/usr/bin/env node
/**
 * EMERGENCE — a 5-minute JB01 track
 * Built with Jambot Headless API
 */

import { createHeadless } from './headless.js';

const OUTPUT = process.argv[2] || 'emergence.wav';
const jb = await createHeadless({ bpm: 133, outputDir: '.' });

console.log('\n  ╔══════════════════════════════════════╗');
console.log('  ║  EMERGENCE — JB01 | 133 BPM           ║');
console.log('  ╚══════════════════════════════════════╝\n');

// ============================================================
// ACT 1 — EMERGENCE (waking up in the dark)
// ============================================================

// A1: Just open hats, alone. Decay already moving.
await jb.tool('add_jb01', { clear: true, oh: [2, 6, 10, 14] });
await jb.tool('tweak', { path: 'jb01.oh.decay', value: 40 });
await jb.tool('tweak', { path: 'jb01.oh.level', value: -6 });
await jb.tool('automate', {
  path: 'jb01.oh.decay',
  values: [30, 50, 25, 60, 35, 45, 20, 55, 30, 50, 25, 65, 35, 45, 28, 58],
});
await jb.tool('save_pattern', { instrument: 'jb01', name: 'A1' });
console.log('  A1: Sparse oh, gentle decay movement');

// A2: Closed hats join. A whisper of rhythm.
await jb.tool('add_jb01', { clear: true, oh: [2, 6, 10, 14], ch: [1, 5, 9, 13] });
await jb.tool('tweak', { path: 'jb01.oh.decay', value: 40 });
await jb.tool('tweak', { path: 'jb01.oh.level', value: -5 });
await jb.tool('tweak', { path: 'jb01.ch.decay', value: 10 });
await jb.tool('tweak', { path: 'jb01.ch.level', value: -12 });
await jb.tool('automate', {
  path: 'jb01.oh.decay',
  values: [30, 55, 25, 65, 35, 50, 20, 60, 30, 55, 25, 70, 35, 50, 28, 62],
});
await jb.tool('save_pattern', { instrument: 'jb01', name: 'A2' });
console.log('  A2: ch joins, oh decay widens');

// A3: Kick appears. You didn't notice it was always there.
await jb.tool('add_jb01', {
  clear: true,
  kick: [0, 4, 8, 12],
  oh: [2, 6, 10, 14],
  ch: [1, 3, 5, 7, 9, 11, 13, 15],
});
await jb.tool('tweak', { path: 'jb01.kick.decay', value: 8 });
await jb.tool('tweak', { path: 'jb01.kick.tune', value: -3 });
await jb.tool('tweak', { path: 'jb01.kick.level', value: -20 });
await jb.tool('tweak', { path: 'jb01.oh.decay', value: 45 });
await jb.tool('tweak', { path: 'jb01.oh.level', value: -4 });
await jb.tool('tweak', { path: 'jb01.ch.decay', value: 10 });
await jb.tool('tweak', { path: 'jb01.ch.level', value: -10 });
await jb.tool('automate', {
  path: 'jb01.oh.decay',
  values: [25, 60, 20, 70, 30, 55, 15, 65, 25, 60, 20, 75, 30, 55, 22, 68],
});
await jb.tool('save_pattern', { instrument: 'jb01', name: 'A3' });
console.log('  A3: Kick enters at -20dB, ghost pulse');

// A4: Kick rises slightly. Becoming real.
await jb.tool('add_jb01', {
  clear: true,
  kick: [0, 4, 8, 12],
  oh: [2, 6, 10, 14],
  ch: [1, 3, 5, 7, 9, 11, 13, 15],
});
await jb.tool('tweak', { path: 'jb01.kick.decay', value: 12 });
await jb.tool('tweak', { path: 'jb01.kick.tune', value: -3 });
await jb.tool('tweak', { path: 'jb01.kick.level', value: -14 });
await jb.tool('tweak', { path: 'jb01.oh.decay', value: 50 });
await jb.tool('tweak', { path: 'jb01.oh.level', value: -3 });
await jb.tool('tweak', { path: 'jb01.ch.decay', value: 12 });
await jb.tool('tweak', { path: 'jb01.ch.level', value: -8 });
await jb.tool('automate', {
  path: 'jb01.oh.decay',
  values: [20, 70, 15, 80, 25, 60, 10, 75, 20, 70, 15, 85, 25, 60, 18, 72],
});
await jb.tool('automate', {
  path: 'jb01.ch.decay',
  values: [5, 18, 8, 25, 5, 15, 10, 30, 5, 20, 8, 22, 5, 15, 10, 28],
});
await jb.tool('save_pattern', { instrument: 'jb01', name: 'A4' });
console.log('  A4: Kick rises to -14dB, ch decay starts moving');

// ============================================================
// ACT 2 — THE ROOM (you're in it now)
// ============================================================

// B1: Clap anchors the groove. Now it's a track.
await jb.tool('add_jb01', {
  clear: true,
  kick: [0, 4, 8, 12],
  clap: [4, 12],
  oh: [2, 6, 10, 14],
  ch: [1, 3, 5, 7, 9, 11, 13, 15],
});
await jb.tool('tweak', { path: 'jb01.kick.decay', value: 15 });
await jb.tool('tweak', { path: 'jb01.kick.tune', value: -3 });
await jb.tool('tweak', { path: 'jb01.kick.level', value: -10 });
await jb.tool('tweak', { path: 'jb01.clap.decay', value: 20 });
await jb.tool('tweak', { path: 'jb01.clap.level', value: -8 });
await jb.tool('tweak', { path: 'jb01.oh.decay', value: 50 });
await jb.tool('tweak', { path: 'jb01.oh.level', value: -3 });
await jb.tool('tweak', { path: 'jb01.ch.decay', value: 12 });
await jb.tool('tweak', { path: 'jb01.ch.level', value: -8 });
await jb.tool('automate', {
  path: 'jb01.oh.decay',
  values: [20, 75, 15, 85, 25, 65, 10, 80, 20, 75, 15, 90, 25, 65, 18, 78],
});
await jb.tool('automate', {
  path: 'jb01.ch.decay',
  values: [5, 25, 8, 35, 5, 20, 10, 38, 5, 25, 8, 32, 5, 20, 10, 35],
});
await jb.tool('save_pattern', { instrument: 'jb01', name: 'B1' });
console.log('  B1: Clap on 2&4, groove established');

// B2: More hats, kick opens up. Settling in.
await jb.tool('add_jb01', {
  clear: true,
  kick: [0, 4, 8, 12],
  clap: [4, 12],
  oh: [2, 4, 6, 8, 10, 12, 14],
  ch: [1, 3, 5, 7, 9, 11, 13, 15],
});
await jb.tool('tweak', { path: 'jb01.kick.decay', value: 20 });
await jb.tool('tweak', { path: 'jb01.kick.tune', value: -4 });
await jb.tool('tweak', { path: 'jb01.kick.level', value: -8 });
await jb.tool('tweak', { path: 'jb01.clap.decay', value: 22 });
await jb.tool('tweak', { path: 'jb01.clap.level', value: -6 });
await jb.tool('tweak', { path: 'jb01.oh.decay', value: 50 });
await jb.tool('tweak', { path: 'jb01.oh.level', value: -3 });
await jb.tool('tweak', { path: 'jb01.ch.decay', value: 12 });
await jb.tool('tweak', { path: 'jb01.ch.level', value: -8 });
await jb.tool('automate', {
  path: 'jb01.oh.decay',
  values: [15, 80, 10, 90, 20, 70, 8, 85, 15, 80, 10, 92, 20, 70, 12, 82],
});
await jb.tool('automate', {
  path: 'jb01.kick.decay',
  values: [18, 22, 17, 25, 19, 21, 16, 24, 18, 23, 17, 26, 19, 21, 16, 25],
});
await jb.tool('save_pattern', { instrument: 'jb01', name: 'B2' });
console.log('  B2: Oh on all 8ths, kick decay starts breathing');

// ============================================================
// ACT 3 — THE CONVERSATION (toms talk to kick)
// ============================================================

// C1: Low tom enters. Call and response with kick.
await jb.tool('add_jb01', {
  clear: true,
  kick: [0, 4, 8, 12],
  clap: [4, 12],
  lowtom: [3, 11],
  oh: [2, 6, 10, 14],
  ch: [1, 3, 5, 7, 9, 11, 13, 15],
});
await jb.tool('tweak', { path: 'jb01.kick.decay', value: 22 });
await jb.tool('tweak', { path: 'jb01.kick.tune', value: -4 });
await jb.tool('tweak', { path: 'jb01.kick.level', value: -6 });
await jb.tool('tweak', { path: 'jb01.clap.decay', value: 22 });
await jb.tool('tweak', { path: 'jb01.clap.level', value: -6 });
await jb.tool('tweak', { path: 'jb01.lowtom.decay', value: 45 });
await jb.tool('tweak', { path: 'jb01.lowtom.tune', value: -4 });
await jb.tool('tweak', { path: 'jb01.lowtom.level', value: -8 });
await jb.tool('tweak', { path: 'jb01.oh.decay', value: 50 });
await jb.tool('tweak', { path: 'jb01.oh.level', value: -3 });
await jb.tool('tweak', { path: 'jb01.ch.decay', value: 12 });
await jb.tool('tweak', { path: 'jb01.ch.level', value: -8 });
await jb.tool('automate', {
  path: 'jb01.oh.decay',
  values: [15, 85, 10, 90, 20, 75, 8, 88, 15, 85, 10, 95, 20, 75, 12, 85],
});
await jb.tool('save_pattern', { instrument: 'jb01', name: 'C1' });
console.log('  C1: Low tom on 3&11, answering the kick');

// C2: Hi tom joins. The conversation gets busier. Clap drops.
await jb.tool('add_jb01', {
  clear: true,
  kick: [0, 4, 8, 12],
  lowtom: [3, 11],
  hitom: [7, 15],
  oh: [2, 4, 6, 8, 10, 12, 14],
  ch: [1, 3, 5, 7, 9, 11, 13, 15],
});
await jb.tool('tweak', { path: 'jb01.kick.decay', value: 25 });
await jb.tool('tweak', { path: 'jb01.kick.tune', value: -4 });
await jb.tool('tweak', { path: 'jb01.kick.level', value: -5 });
await jb.tool('tweak', { path: 'jb01.lowtom.decay', value: 45 });
await jb.tool('tweak', { path: 'jb01.lowtom.tune', value: -4 });
await jb.tool('tweak', { path: 'jb01.lowtom.level', value: -7 });
await jb.tool('tweak', { path: 'jb01.hitom.decay', value: 35 });
await jb.tool('tweak', { path: 'jb01.hitom.tune', value: 2 });
await jb.tool('tweak', { path: 'jb01.hitom.level', value: -9 });
await jb.tool('tweak', { path: 'jb01.oh.decay', value: 50 });
await jb.tool('tweak', { path: 'jb01.oh.level', value: -2 });
await jb.tool('tweak', { path: 'jb01.ch.decay', value: 12 });
await jb.tool('tweak', { path: 'jb01.ch.level', value: -7 });
await jb.tool('automate', {
  path: 'jb01.oh.decay',
  values: [10, 90, 8, 95, 15, 80, 5, 92, 10, 90, 8, 98, 15, 80, 10, 88],
});
await jb.tool('automate', {
  path: 'jb01.kick.decay',
  values: [22, 28, 20, 32, 24, 26, 18, 30, 22, 28, 20, 35, 24, 26, 18, 30],
});
await jb.tool('save_pattern', { instrument: 'jb01', name: 'C2' });
console.log('  C2: Hi tom joins, clap drops out, toms talking');

// C3: Clap returns. Impact.
await jb.tool('add_jb01', {
  clear: true,
  kick: [0, 4, 8, 12],
  clap: [4, 12],
  lowtom: [3, 11],
  hitom: [7, 15],
  oh: [2, 4, 6, 8, 10, 12, 14],
  ch: [1, 2, 3, 5, 6, 7, 9, 10, 11, 13, 14, 15],
});
await jb.tool('tweak', { path: 'jb01.kick.decay', value: 28 });
await jb.tool('tweak', { path: 'jb01.kick.tune', value: -5 });
await jb.tool('tweak', { path: 'jb01.kick.level', value: -4 });
await jb.tool('tweak', { path: 'jb01.clap.decay', value: 25 });
await jb.tool('tweak', { path: 'jb01.clap.level', value: -4 });
await jb.tool('tweak', { path: 'jb01.lowtom.decay', value: 45 });
await jb.tool('tweak', { path: 'jb01.lowtom.tune', value: -4 });
await jb.tool('tweak', { path: 'jb01.lowtom.level', value: -7 });
await jb.tool('tweak', { path: 'jb01.hitom.decay', value: 35 });
await jb.tool('tweak', { path: 'jb01.hitom.tune', value: 2 });
await jb.tool('tweak', { path: 'jb01.hitom.level', value: -9 });
await jb.tool('tweak', { path: 'jb01.oh.decay', value: 50 });
await jb.tool('tweak', { path: 'jb01.oh.level', value: -2 });
await jb.tool('tweak', { path: 'jb01.ch.decay', value: 10 });
await jb.tool('tweak', { path: 'jb01.ch.level', value: -7 });
await jb.tool('automate', {
  path: 'jb01.oh.decay',
  values: [8, 92, 5, 95, 12, 85, 5, 95, 8, 92, 5, 98, 12, 85, 8, 90],
});
await jb.tool('automate', {
  path: 'jb01.ch.decay',
  values: [5, 30, 3, 40, 5, 25, 3, 45, 5, 30, 3, 38, 5, 25, 3, 42],
});
await jb.tool('save_pattern', { instrument: 'jb01', name: 'C3' });
console.log('  C3: Clap returns, full conversation, rolling 16ths');

// ============================================================
// ACT 4 — THE VOID (silence is the loudest part)
// ============================================================

// D1: Everything falls away except oh + ch. Breathing.
await jb.tool('add_jb01', {
  clear: true,
  oh: [2, 10],
  ch: [5, 13],
});
await jb.tool('tweak', { path: 'jb01.oh.decay', value: 70 });
await jb.tool('tweak', { path: 'jb01.oh.level', value: -2 });
await jb.tool('tweak', { path: 'jb01.ch.decay', value: 20 });
await jb.tool('tweak', { path: 'jb01.ch.level', value: -6 });
await jb.tool('automate', {
  path: 'jb01.oh.decay',
  values: [60, null, null, null, null, null, null, null, 75, null, null, null, null, null, null, null],
});
await jb.tool('save_pattern', { instrument: 'jb01', name: 'D1' });
console.log('  D1: THE VOID — just 2 oh + 2 ch, space');

// D2: Low tom pulse. Heartbeat in the void.
await jb.tool('add_jb01', {
  clear: true,
  lowtom: [0, 8],
  oh: [4, 12],
  ch: [2, 6, 10, 14],
});
await jb.tool('tweak', { path: 'jb01.lowtom.decay', value: 55 });
await jb.tool('tweak', { path: 'jb01.lowtom.tune', value: -6 });
await jb.tool('tweak', { path: 'jb01.lowtom.level', value: -6 });
await jb.tool('tweak', { path: 'jb01.oh.decay', value: 65 });
await jb.tool('tweak', { path: 'jb01.oh.level', value: -3 });
await jb.tool('tweak', { path: 'jb01.ch.decay', value: 15 });
await jb.tool('tweak', { path: 'jb01.ch.level', value: -8 });
await jb.tool('automate', {
  path: 'jb01.oh.decay',
  values: [55, null, null, null, 70, null, null, null, 60, null, null, null, 80, null, null, null],
});
await jb.tool('save_pattern', { instrument: 'jb01', name: 'D2' });
console.log('  D2: Low tom pulse, heartbeat in the void');

// ============================================================
// ACT 5 — FULL TRANSMISSION (everything returns transformed)
// ============================================================

// E1: Kick returns. Earned its weight. Longer decay now.
await jb.tool('add_jb01', {
  clear: true,
  kick: [0, 4, 8, 12],
  oh: [2, 6, 10, 14],
  ch: [1, 3, 5, 7, 9, 11, 13, 15],
});
await jb.tool('tweak', { path: 'jb01.kick.decay', value: 35 });
await jb.tool('tweak', { path: 'jb01.kick.tune', value: -5 });
await jb.tool('tweak', { path: 'jb01.kick.level', value: -4 });
await jb.tool('tweak', { path: 'jb01.oh.decay', value: 50 });
await jb.tool('tweak', { path: 'jb01.oh.level', value: -2 });
await jb.tool('tweak', { path: 'jb01.ch.decay', value: 12 });
await jb.tool('tweak', { path: 'jb01.ch.level', value: -7 });
await jb.tool('automate', {
  path: 'jb01.oh.decay',
  values: [10, 85, 8, 90, 15, 75, 5, 88, 10, 85, 8, 92, 15, 75, 10, 85],
});
await jb.tool('automate', {
  path: 'jb01.kick.decay',
  values: [30, 38, 28, 42, 32, 36, 26, 40, 30, 38, 28, 45, 32, 36, 26, 40],
});
await jb.tool('save_pattern', { instrument: 'jb01', name: 'E1' });
console.log('  E1: Kick returns with weight, decay 30-45, earned');

// E2: Clap + toms. Building density.
await jb.tool('add_jb01', {
  clear: true,
  kick: [0, 4, 8, 12],
  clap: [4, 12],
  lowtom: [3, 11],
  oh: [2, 4, 6, 8, 10, 12, 14],
  ch: [1, 2, 3, 5, 6, 7, 9, 10, 11, 13, 14, 15],
});
await jb.tool('tweak', { path: 'jb01.kick.decay', value: 38 });
await jb.tool('tweak', { path: 'jb01.kick.tune', value: -5 });
await jb.tool('tweak', { path: 'jb01.kick.level', value: -3 });
await jb.tool('tweak', { path: 'jb01.clap.decay', value: 25 });
await jb.tool('tweak', { path: 'jb01.clap.level', value: -4 });
await jb.tool('tweak', { path: 'jb01.lowtom.decay', value: 50 });
await jb.tool('tweak', { path: 'jb01.lowtom.tune', value: -4 });
await jb.tool('tweak', { path: 'jb01.lowtom.level', value: -6 });
await jb.tool('tweak', { path: 'jb01.oh.decay', value: 50 });
await jb.tool('tweak', { path: 'jb01.oh.level', value: -1 });
await jb.tool('tweak', { path: 'jb01.ch.decay', value: 10 });
await jb.tool('tweak', { path: 'jb01.ch.level', value: -6 });
await jb.tool('automate', {
  path: 'jb01.oh.decay',
  values: [8, 90, 5, 95, 10, 82, 5, 92, 8, 90, 5, 96, 10, 82, 8, 88],
});
await jb.tool('automate', {
  path: 'jb01.ch.decay',
  values: [5, 35, 3, 45, 5, 30, 3, 50, 5, 35, 3, 42, 5, 30, 3, 48],
});
await jb.tool('automate', {
  path: 'jb01.kick.decay',
  values: [35, 42, 32, 48, 36, 40, 30, 45, 35, 42, 32, 50, 36, 40, 30, 45],
});
await jb.tool('save_pattern', { instrument: 'jb01', name: 'E2' });
console.log('  E2: Clap + tom, density building, triple automation');

// E3: CLIMAX. Maximum expression. Everything jammed.
await jb.tool('add_jb01', {
  clear: true,
  kick: [0, 4, 8, 12],
  clap: [4, 12],
  lowtom: [3, 11],
  hitom: [7, 15],
  oh: [2, 4, 6, 8, 10, 12, 14],
  ch: [1, 2, 3, 5, 6, 7, 9, 10, 11, 13, 14, 15],
});
await jb.tool('tweak', { path: 'jb01.kick.decay', value: 40 });
await jb.tool('tweak', { path: 'jb01.kick.tune', value: -5 });
await jb.tool('tweak', { path: 'jb01.kick.level', value: -2 });
await jb.tool('tweak', { path: 'jb01.clap.decay', value: 28 });
await jb.tool('tweak', { path: 'jb01.clap.level', value: -3 });
await jb.tool('tweak', { path: 'jb01.lowtom.decay', value: 50 });
await jb.tool('tweak', { path: 'jb01.lowtom.tune', value: -4 });
await jb.tool('tweak', { path: 'jb01.lowtom.level', value: -5 });
await jb.tool('tweak', { path: 'jb01.hitom.decay', value: 35 });
await jb.tool('tweak', { path: 'jb01.hitom.tune', value: 2 });
await jb.tool('tweak', { path: 'jb01.hitom.level', value: -7 });
await jb.tool('tweak', { path: 'jb01.oh.decay', value: 50 });
await jb.tool('tweak', { path: 'jb01.oh.level', value: 0 });
await jb.tool('tweak', { path: 'jb01.ch.decay', value: 10 });
await jb.tool('tweak', { path: 'jb01.ch.level', value: -5 });
// FULL MILLS — max range on everything
await jb.tool('automate', {
  path: 'jb01.oh.decay',
  values: [5, 100, 5, 95, 5, 100, 8, 92, 5, 100, 5, 98, 5, 100, 5, 95],
});
await jb.tool('automate', {
  path: 'jb01.ch.decay',
  values: [3, 55, 3, 65, 3, 50, 3, 60, 3, 55, 3, 68, 3, 50, 3, 62],
});
await jb.tool('automate', {
  path: 'jb01.kick.decay',
  values: [30, 55, 25, 60, 35, 50, 20, 58, 30, 55, 25, 65, 35, 50, 22, 55],
});
await jb.tool('save_pattern', { instrument: 'jb01', name: 'E3' });
console.log('  E3: CLIMAX — all voices, all decay jammed, maximum');

// ============================================================
// ACT 6 — LETTING GO (deliberate goodbye)
// ============================================================

// F1: Toms gone. Clap gone. Just kick + hats. But evolved.
await jb.tool('add_jb01', {
  clear: true,
  kick: [0, 4, 8, 12],
  oh: [2, 6, 10, 14],
  ch: [1, 3, 5, 7, 9, 11, 13, 15],
});
await jb.tool('tweak', { path: 'jb01.kick.decay', value: 30 });
await jb.tool('tweak', { path: 'jb01.kick.tune', value: -4 });
await jb.tool('tweak', { path: 'jb01.kick.level', value: -6 });
await jb.tool('tweak', { path: 'jb01.oh.decay', value: 50 });
await jb.tool('tweak', { path: 'jb01.oh.level', value: -3 });
await jb.tool('tweak', { path: 'jb01.ch.decay', value: 12 });
await jb.tool('tweak', { path: 'jb01.ch.level', value: -8 });
await jb.tool('automate', {
  path: 'jb01.oh.decay',
  values: [15, 70, 12, 75, 20, 60, 10, 72, 15, 70, 12, 78, 20, 60, 15, 68],
});
await jb.tool('save_pattern', { instrument: 'jb01', name: 'F1' });
console.log('  F1: Stripped to kick + hats, calming');

// F2: Kick fades. Hats alone again.
await jb.tool('add_jb01', {
  clear: true,
  kick: [0, 4, 8, 12],
  oh: [2, 6, 10, 14],
  ch: [1, 5, 9, 13],
});
await jb.tool('tweak', { path: 'jb01.kick.decay', value: 10 });
await jb.tool('tweak', { path: 'jb01.kick.tune', value: -3 });
await jb.tool('tweak', { path: 'jb01.kick.level', value: -18 });
await jb.tool('tweak', { path: 'jb01.oh.decay', value: 45 });
await jb.tool('tweak', { path: 'jb01.oh.level', value: -5 });
await jb.tool('tweak', { path: 'jb01.ch.decay', value: 10 });
await jb.tool('tweak', { path: 'jb01.ch.level', value: -12 });
await jb.tool('automate', {
  path: 'jb01.oh.decay',
  values: [30, 55, 25, 60, 35, 50, 22, 58, 30, 55, 25, 62, 35, 50, 28, 55],
});
await jb.tool('save_pattern', { instrument: 'jb01', name: 'F2' });
console.log('  F2: Kick ghost, returning to the start');

// F3: Just open hats. Where we began.
await jb.tool('add_jb01', { clear: true, oh: [2, 6, 10, 14] });
await jb.tool('tweak', { path: 'jb01.oh.decay', value: 40 });
await jb.tool('tweak', { path: 'jb01.oh.level', value: -6 });
await jb.tool('automate', {
  path: 'jb01.oh.decay',
  values: [30, 50, 25, 55, 35, 45, 20, 52, 30, 50, 25, 58, 35, 45, 28, 50],
});
await jb.tool('save_pattern', { instrument: 'jb01', name: 'F3' });
console.log('  F3: Just oh. Where we started. Full circle.');

// ============================================================
// ARRANGEMENT — 166 bars ≈ 5 minutes at 133 BPM
// ============================================================

await jb.tool('set_arrangement', {
  sections: [
    // ACT 1 — EMERGENCE (32 bars)
    { bars: 8,  jb01: 'A1' },   // just oh
    { bars: 8,  jb01: 'A2' },   // ch joins
    { bars: 8,  jb01: 'A3' },   // kick ghost
    { bars: 8,  jb01: 'A4' },   // kick rises

    // ACT 2 — THE ROOM (24 bars)
    { bars: 8,  jb01: 'B1' },   // clap enters
    { bars: 16, jb01: 'B2' },   // settling in

    // ACT 3 — THE CONVERSATION (24 bars)
    { bars: 8,  jb01: 'C1' },   // low tom
    { bars: 8,  jb01: 'C2' },   // hi tom, clap drops
    { bars: 8,  jb01: 'C3' },   // clap returns, full

    // ACT 4 — THE VOID (16 bars)
    { bars: 8,  jb01: 'D1' },   // stripped
    { bars: 8,  jb01: 'D2' },   // tom heartbeat

    // ACT 5 — FULL TRANSMISSION (40 bars)
    { bars: 8,  jb01: 'E1' },   // kick returns heavy
    { bars: 8,  jb01: 'E2' },   // density builds
    { bars: 24, jb01: 'E3' },   // CLIMAX — let it ride

    // ACT 6 — LETTING GO (30 bars)
    { bars: 8,  jb01: 'F1' },   // stripped back
    { bars: 8,  jb01: 'F2' },   // kick fading
    { bars: 8,  jb01: 'F3' },   // just oh, full circle
  ],
});

const totalBars = 8+8+8+8+8+16+8+8+8+8+8+8+8+24+8+8+8;
console.log(`\n  Arrangement: ${totalBars} bars | ${(totalBars * (60/133) * 4 / 60).toFixed(1)} minutes`);
console.log('  Rendering...\n');

const result = await jb.render(OUTPUT);
console.log(`  ${result}`);
console.log(`  Output: ${OUTPUT}\n`);
