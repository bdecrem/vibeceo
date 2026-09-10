#!/usr/bin/env node
/**
 * Hallman Tribal 01 — JB01 percussion, no synth
 *
 * Only JB01 drums. No JT10, no JT30, no JT90, no bass, no lead.
 * Tribal, dynamic, multi-section. 126 BPM.
 * Proven patches: same kick/hats patch as hallman-hawtin-01.
 *
 * 28-bar arrangement (first 4 bars cut):
 *   1-4    kick + ch 16ths (disco-era function pattern, quieter ghosts)
 *   5-12   +tom pattern A (sparse tribal — hitom accents, lowtom answer)
 *   12     fill: descending tom roll
 *   13-16  +clap on 2 & 4
 *   17-19  pattern B (denser toms, +oh on offbeats) — PEAK
 *   20     fill: cymbal + tom roll
 *   21-24  breakdown — toms only, kick drops, ch drops
 *   25-27  return full kit, +claps
 *   28     ghost — kick on 1 only
 */

import { JambotHeadless } from './headless.js';

const jb = new JambotHeadless({ bpm: 126 });

// ============================================================
// HELPERS
// ============================================================

const VOICES = ['kick', 'snare', 'clap', 'ch', 'oh', 'lowtom', 'hitom', 'cymbal'];
const emptyBar = () => Array(16).fill(null).map(() => ({ velocity: 0, accent: false }));
const makeBar = (hits = {}) => {
  const bar = emptyBar();
  for (const [step, def] of Object.entries(hits)) {
    bar[Number(step)] = typeof def === 'number'
      ? { velocity: def, accent: false }
      : { velocity: def.v, accent: !!def.a };
  }
  return bar;
};
const humanize = (v, range = 6) => Math.max(1, Math.min(127, v + Math.floor((Math.random() - 0.5) * range)));

// ============================================================
// TOM PATTERNS
// ============================================================

// Pattern A — sparse tribal: hitom announces, lowtom answers
const patternA_hitom = () => makeBar({
  0:  { v: humanize(115), a: true  },
  6:  { v: humanize(85)  },
  10: { v: humanize(95)  },
  14: { v: humanize(70)  },
});
const patternA_lowtom = () => makeBar({
  4:  { v: humanize(110), a: true },
  11: { v: humanize(100) },
});

// Pattern B — dense peak: more syncopation
const patternB_hitom = () => makeBar({
  0:  { v: humanize(127), a: true },
  2:  { v: humanize(80)  },
  6:  { v: humanize(90)  },
  10: { v: humanize(110), a: true },
  14: { v: humanize(95)  },
});
const patternB_lowtom = () => makeBar({
  1:  { v: humanize(85)  },
  4:  { v: humanize(120), a: true },
  8:  { v: humanize(100) },
  11: { v: humanize(115), a: true },
  13: { v: humanize(75)  },
});

// Fill patterns
const fillDescendingToms_hitom = () => makeBar({
  12: { v: 115 }, 13: { v: 95 },
});
const fillDescendingToms_lowtom = () => makeBar({
  14: { v: 120, a: true }, 15: { v: 110 },
});

const fillTomRoll_hitom = () => makeBar({
  10: { v: 100 }, 12: { v: 105 }, 14: { v: 110 },
});
const fillTomRoll_lowtom = () => makeBar({
  11: { v: 95 }, 13: { v: 105 }, 15: { v: 115, a: true },
});
const fillCymbal = () => makeBar({
  8: { v: 115, a: true }, // cymbal crash on bar 24 beat 3 leading in
});

// CH (closed hat) — disco function pattern, 16ths with accents on offbeats
const chBar = (baseVel) => {
  const steps = [];
  for (let i = 0; i < 16; i++) {
    let v;
    if ([2, 6, 10, 14].includes(i)) v = baseVel + 18; // accent offbeats
    else if ([0, 4, 8, 12].includes(i)) v = baseVel - 22; // ghost onbeats
    else v = baseVel + Math.floor((Math.random() - 0.5) * 14);
    steps.push({ velocity: humanize(v, 4), accent: false });
  }
  return steps;
};

// OH (open hat) on offbeats
const ohBar = () => makeBar({
  2: { v: humanize(90) },  6: { v: humanize(85) },
  10: { v: humanize(92) }, 14: { v: humanize(88) },
});

// Clap on 2 & 4
const clapBar = () => makeBar({
  4:  { v: humanize(110), a: true },
  12: { v: humanize(115), a: true },
});

// Kick — 4-on-floor with micro velocity variation
const kickBar = (baseVel) => {
  const steps = Array(16).fill(null).map(() => ({ velocity: 0, accent: false }));
  for (const i of [0, 4, 8, 12]) {
    steps[i] = { velocity: humanize(baseVel, 8), accent: false };
  }
  return steps;
};

// ============================================================
// BUILD 32-BAR PATTERNS
// ============================================================

const drumPattern = {};
for (const v of VOICES) drumPattern[v] = [];

for (let bar = 0; bar < 28; bar++) {
  // ---------- KICK ----------
  let kickVel = 115;
  if (bar < 20) kickVel = 115;
  else if (bar >= 20 && bar < 24) kickVel = 0; // breakdown
  else if (bar < 27) kickVel = 115;
  else if (bar === 27) kickVel = 0; // ghost — handled below

  if (bar === 27) {
    // Ghost bar — kick on 1 only
    const g = emptyBar();
    g[0] = { velocity: 95, accent: false };
    drumPattern.kick.push(...g);
  } else if (kickVel === 0) {
    drumPattern.kick.push(...emptyBar());
  } else {
    drumPattern.kick.push(...kickBar(kickVel));
  }

  // ---------- CH ----------
  if (bar < 20) {
    const baseVel = bar < 4 ? 55 + bar * 5 : bar < 17 ? 75 : 82;
    drumPattern.ch.push(...chBar(baseVel));
  } else if (bar >= 24 && bar < 27) {
    drumPattern.ch.push(...chBar(75));
  } else {
    drumPattern.ch.push(...emptyBar());
  }

  // ---------- OH (open hats, peak bars 17-20) ----------
  if (bar >= 16 && bar < 20) {
    drumPattern.oh.push(...ohBar());
  } else {
    drumPattern.oh.push(...emptyBar());
  }

  // ---------- CLAP ----------
  if (bar >= 12 && bar < 20) {
    drumPattern.clap.push(...clapBar());
  } else if (bar >= 24 && bar < 27) {
    drumPattern.clap.push(...clapBar());
  } else {
    drumPattern.clap.push(...emptyBar());
  }

  // ---------- TOMS ----------
  // Pattern A in bars 4-15, 20-23 (breakdown), 24-26 (return)
  // Pattern B in bars 16-18 (peak)
  // Fills at bar 11 (→ clap section) and bar 19 (→ breakdown)
  if (bar === 11) {
    drumPattern.hitom.push(...fillDescendingToms_hitom());
    drumPattern.lowtom.push(...fillDescendingToms_lowtom());
  } else if (bar === 19) {
    drumPattern.hitom.push(...fillTomRoll_hitom());
    drumPattern.lowtom.push(...fillTomRoll_lowtom());
  } else if ((bar >= 4 && bar < 16) || (bar >= 20 && bar < 24)) {
    drumPattern.hitom.push(...patternA_hitom());
    drumPattern.lowtom.push(...patternA_lowtom());
  } else if (bar >= 16 && bar < 19) {
    drumPattern.hitom.push(...patternB_hitom());
    drumPattern.lowtom.push(...patternB_lowtom());
  } else if (bar >= 24 && bar < 27) {
    drumPattern.hitom.push(...patternA_hitom());
    drumPattern.lowtom.push(...patternA_lowtom());
  } else {
    drumPattern.hitom.push(...emptyBar());
    drumPattern.lowtom.push(...emptyBar());
  }

  // ---------- CYMBAL ----------
  // Single crash on bar 19 to lead into breakdown
  if (bar === 19) {
    const c = emptyBar();
    c[8] = { velocity: 115, accent: true };
    drumPattern.cymbal.push(...c);
  } else {
    drumPattern.cymbal.push(...emptyBar());
  }

  // ---------- SNARE (unused) ----------
  drumPattern.snare.push(...emptyBar());
}

// ============================================================
// SET PATTERN
// ============================================================

jb.session._nodes.jb01.setPattern(drumPattern);

// ============================================================
// SOUND DESIGN (proven patches)
// ============================================================

// Kick — same as hallman-hawtin-01
await jb.tool('tweak', { path: 'jb01.kick.decay',  value: 15 });
await jb.tool('tweak', { path: 'jb01.kick.attack', value: 45 });
await jb.tool('tweak', { path: 'jb01.kick.tune',   value: -3 });
await jb.tool('tweak', { path: 'jb01.level',       value: 0 });

// CH — same as hawtin
await jb.tool('tweak', { path: 'jb01.ch.decay', value: 30 });
await jb.tool('tweak', { path: 'jb01.ch.level', value: -8 });

// OH — open hat
await jb.tool('tweak', { path: 'jb01.oh.decay', value: 55 });
await jb.tool('tweak', { path: 'jb01.oh.level', value: -12 });

// Clap — defaults
await jb.tool('tweak', { path: 'jb01.clap.decay', value: 45 });
await jb.tool('tweak', { path: 'jb01.clap.level', value: -4 });

// Toms — tuned for tribal (lower pitched, longer decay)
await jb.tool('tweak', { path: 'jb01.lowtom.decay', value: 65 });
await jb.tool('tweak', { path: 'jb01.lowtom.tune',  value: -5 });
await jb.tool('tweak', { path: 'jb01.lowtom.level', value: -2 });

await jb.tool('tweak', { path: 'jb01.hitom.decay', value: 48 });
await jb.tool('tweak', { path: 'jb01.hitom.tune',  value: -1 });
await jb.tool('tweak', { path: 'jb01.hitom.level', value: -4 });

// Cymbal
await jb.tool('tweak', { path: 'jb01.cymbal.decay', value: 70 });
await jb.tool('tweak', { path: 'jb01.cymbal.level', value: -6 });

// ============================================================
// RENDER
// ============================================================

console.log('Rendering Hallman Tribal 01 — 28 bars at 126 BPM, percussion only');
console.log('Arrangement: kick+ch(4) → +toms A(8) → +claps(4) → peak B(3) → breakdown(4) → return(3) → ghost(1)');

const result = await jb.render('hallman-tribal-01', 28);
console.log(result);
console.log('Done.');
