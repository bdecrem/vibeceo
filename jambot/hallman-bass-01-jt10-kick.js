#!/usr/bin/env node
/**
 * Hallman Bass 01 (JT10 + JB01 Kick)
 * 
 * 130 BPM, A minor. JT10 bassline + straight 4x4 kick from JB01.
 * Using the headless API as intended.
 */

import { JambotHeadless } from './headless.js';

const jb = new JambotHeadless({ bpm: 130 });

// ============================================================
// JB01 KICK — Straight 4x4
// ============================================================

await jb.tool('add_jb01', {
  kick: [0, 4, 8, 12],
});

await jb.tool('tweak', { path: 'jb01.kick.tune', value: -2 });
await jb.tool('tweak', { path: 'jb01.kick.decay', value: 65 });
await jb.tool('tweak', { path: 'jb01.kick.attack', value: 55 });
await jb.tool('tweak', { path: 'jb01.kick.sweep', value: 80 });
await jb.tool('tweak', { path: 'jb01.level', value: 2 });

// ============================================================
// JT10 BASS — Minimal techno bassline, A minor
// ============================================================

await jb.tool('add_jt10', {
  pattern: [
    { note: 'A1',  gate: true,  accent: true,  slide: false },  // 1 - ROOT
    { note: 'A1',  gate: false, accent: false, slide: false },  // 2
    { note: 'A1',  gate: true,  accent: false, slide: false },  // 3 - pulse
    { note: 'A1',  gate: false, accent: false, slide: false },  // 4
    { note: 'A1',  gate: true,  accent: true,  slide: false },  // 5 - ROOT
    { note: 'A1',  gate: true,  accent: false, slide: true  },  // 6 - slide
    { note: 'D2',  gate: true,  accent: false, slide: false },  // 7 - 4th
    { note: 'D2',  gate: false, accent: false, slide: false },  // 8
    { note: 'A1',  gate: true,  accent: true,  slide: false },  // 9 - ROOT
    { note: 'A1',  gate: false, accent: false, slide: false },  // 10
    { note: 'E2',  gate: true,  accent: false, slide: false },  // 11 - 5th
    { note: 'E2',  gate: true,  accent: false, slide: true  },  // 12 - slide
    { note: 'C2',  gate: true,  accent: true,  slide: false },  // 13 - minor 3rd
    { note: 'C2',  gate: false, accent: false, slide: false },  // 14
    { note: 'A1',  gate: true,  accent: false, slide: false },  // 15 - home
    { note: 'A1',  gate: false, accent: false, slide: false },  // 16
  ],
});

// Sound design — saw + sub, no resonance, filter envelope
await jb.tool('tweak_jt10', { sawLevel: 75, pulseLevel: 0, subLevel: 60, subMode: 1 });
await jb.tool('tweak_jt10', { cutoff: 200, resonance: 0, envMod: 65, keyTrack: 40 });
await jb.tool('tweak_jt10', { attack: 0, decay: 40, sustain: 25, release: 18 });
await jb.tool('tweak_jt10', { filterAttack: 0, filterDecay: 32, filterSustain: 10, filterRelease: 15 });
await jb.tool('tweak_jt10', { glideTime: 20 });
await jb.tool('tweak', { path: 'jt10.level', value: -3 });

// ============================================================
// RENDER — 8 bars
// ============================================================

console.log('Rendering JT10 + JB01 kick at 130 BPM, 8 bars...');
const result = await jb.render('hallman-bass-01-jt10-kick', 8);
console.log(result);
console.log('Done.');
