/*
 * "Haze" — a dub-techno track on the jambot engine.
 * A minor, 124 BPM. Built section-by-section and stitched, so the arrangement
 * actually evolves (filter opens, a breakdown, a chord move to F, an outro) —
 * the depth the DK tracks never had: kick + offbeat hats + a round sub + a
 * delay-drenched minor stab, all gain-staged so nothing clips.
 *
 * Run from the jambot dir:  node tracks-claude/haze.mjs
 * Output: tracks-claude/haze.wav
 *
 * Notes on driving the engine correctly (hard-won):
 *  - output level is the NODE path: ses.set('jt30.level', dB)  — WORKS.
 *    ses.set('jt30.bass.level', ...) silently does nothing (a real footgun).
 *  - voice params are 0-100 producer units: ses.set('jt30.bass.cutoff', ...).
 *  - sections render to temp WAVs, then we stitch with short equal-power
 *    crossfades and a final master trim to hit ~0.89 peak (headroom, no clip).
 */

import { createSession } from '../core/session.js';
import { renderSession } from '../core/render.js';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const HERE = dirname(fileURLToPath(import.meta.url));
const BPM = 124, SR = 44100;
const DRUM_VOICES = ['kick', 'snare', 'clap', 'ch', 'oh', 'lowtom', 'hitom', 'cymbal'];

/* ---------- pattern helpers ---------- */
function emptyDrums(bars) {
  const p = {};
  for (const v of DRUM_VOICES) p[v] = Array(16 * bars).fill(0).map(() => ({ velocity: 0, accent: false }));
  return p;
}
function hit(p, voice, step, velocity, accent = false) { p[voice][step] = { velocity, accent }; }

function emptyNotes(bars) {
  return Array(16 * bars).fill(0).map(() => ({ note: 'A1', gate: false, accent: false, slide: false }));
}
function note(arr, step, n, accent = false, slide = false) { arr[step] = { note: n, gate: true, accent, slide }; }

/* ---------- the building blocks (one bar = 16 steps) ---------- */

// 4-on-the-floor kick + offbeat closed hats, with a little human velocity drift
function drumsBar(p, bar, { kick = true, hats = true, openHatStep = -1, ghostClap = false } = {}) {
  const o = bar * 16;
  if (kick) {
    for (const s of [0, 4, 8, 12]) hit(p, 'kick', o + s, s === 0 ? 118 : 108, s === 0);
  }
  if (hats) {
    // offbeat 8ths (the "&"s) — soft, slightly varied so it breathes
    for (const s of [2, 6, 10, 14]) hit(p, 'ch', o + s, 60 + ((s / 2) % 2 ? 8 : 0), false);
    // a few 16th ghosts for swing feel
    hit(p, 'ch', o + 7, 38);
    hit(p, 'ch', o + 15, 44);
    if (openHatStep >= 0) hit(p, 'oh', o + openHatStep, 70);
  }
  if (ghostClap) hit(p, 'clap', o + 12, 64);
}

// deep round sub — root pulse with a syncopated ghost; not acid, just weight
function subBar(arr, bar, root = 'A1', fifth = 'E1') {
  const o = bar * 16;
  note(arr, o + 0, root, true);      // under the kick
  note(arr, o + 6, root, false);     // offbeat push
  note(arr, o + 8, root, false);
  note(arr, o + 11, fifth, false);   // ghost fifth, dub momentum
}

// the dub stab — short, on the offbeat, drenched in dotted-8th delay so it
// ripples across the bar. third over the chord (C over Am, A over F).
function stabBar(arr, bar, third = 'C4', under = 'A3') {
  const o = bar * 16;
  note(arr, o + 3, under, true);     // the "e" of beat 1 — the hit
  note(arr, o + 11, third, false);   // a softer answer mid-bar
}

/* ---------- render one section to a stereo Float32 pair ---------- */
async function renderSection(name, bars, build) {
  const ses = createSession({ bpm: BPM, sampleRate: SR });
  ses.clock.swing = 0.12;            // a touch of swing — groove, not a grid

  build(ses, bars);

  const out = `/tmp/haze-${name}.wav`;
  await renderSession(ses, bars, out);
  return readWavStereo(out);
}

/* ---------- minimal WAV read/write (16-bit stereo) ---------- */
function readWavStereo(file) {
  const b = readFileSync(file);
  const sr = b.readUInt32LE(24);
  let off = 12, dataOff = -1, dataLen = 0;
  while (off < b.length - 8) {
    const id = b.toString('ascii', off, off + 4), sz = b.readUInt32LE(off + 4);
    if (id === 'data') { dataOff = off + 8; dataLen = sz; break; }
    off += 8 + sz + (sz & 1);
  }
  const frames = dataLen / 4;
  const L = new Float32Array(frames), R = new Float32Array(frames);
  for (let i = 0; i < frames; i++) {
    L[i] = b.readInt16LE(dataOff + i * 4) / 32768;
    R[i] = b.readInt16LE(dataOff + i * 4 + 2) / 32768;
  }
  return { L, R, sr };
}

function writeWavStereo(file, L, R, sr) {
  const frames = L.length, dataLen = frames * 4, buf = Buffer.alloc(44 + dataLen);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + dataLen, 4); buf.write('WAVE', 8);
  buf.write('fmt ', 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(2, 22); buf.writeUInt32LE(sr, 24); buf.writeUInt32LE(sr * 4, 28);
  buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34);
  buf.write('data', 36); buf.writeUInt32LE(dataLen, 40);
  for (let i = 0; i < frames; i++) {
    const l = Math.max(-1, Math.min(1, L[i])), r = Math.max(-1, Math.min(1, R[i]));
    buf.writeInt16LE((l * 32767) | 0, 44 + i * 4);
    buf.writeInt16LE((r * 32767) | 0, 44 + i * 4 + 2);
  }
  writeFileSync(file, buf);
}

/* ---------- stitch sections with a short equal-power crossfade ---------- */
function stitch(sections, xfadeSec) {
  const sr = sections[0].sr;
  const xf = Math.floor(xfadeSec * sr);
  let total = 0;
  for (const s of sections) total += s.L.length;
  total -= xf * (sections.length - 1);
  const L = new Float32Array(total), R = new Float32Array(total);
  let pos = 0;
  for (let si = 0; si < sections.length; si++) {
    const s = sections[si];
    if (si === 0) { L.set(s.L, 0); R.set(s.R, 0); pos = s.L.length; continue; }
    const start = pos - xf;
    for (let i = 0; i < s.L.length; i++) {
      const dst = start + i;
      if (i < xf) {
        const t = i / xf, g1 = Math.cos(t * Math.PI / 2), g2 = Math.sin(t * Math.PI / 2);
        L[dst] = L[dst] * g1 + s.L[i] * g2;
        R[dst] = R[dst] * g1 + s.R[i] * g2;
      } else { L[dst] = s.L[i]; R[dst] = s.R[i]; }
    }
    pos = start + s.L.length;
  }
  return { L, R, sr };
}

/* ====================================================================== */
/* THE ARRANGEMENT                                                         */
/* ====================================================================== */

// per-section instrument setup. levels via the WORKING node path.
function setupKickHats(ses, opts = {}) {
  ses.set('jb01.kick.tune', -4);
  ses.set('jb01.kick.decay', 58);
  ses.set('jb01.kick.attack', 40);
  ses.set('jb01.kick.sweep', 70);
  ses.set('jb01.ch.tone', 30);       // darker hats
  ses.set('jb01.ch.decay', opts.hatDecay ?? 30);
  ses.set('jb01.oh.decay', 55);
  ses.set('jb01.level', opts.drumLevel ?? -7);
}
function setupSub(ses, level = -9) {
  ses.set('jt30.bass.waveform', 'square');
  ses.set('jt30.bass.cutoff', 62);   // low = round sub, not acid
  ses.set('jt30.bass.resonance', 16);
  ses.set('jt30.bass.envMod', 30);
  ses.set('jt30.bass.decay', 42);
  ses.set('jt30.bass.accent', 60);
  ses.set('jt30.bass.drive', 12);
  ses.set('jt30.level', level);
}
function setupStab(ses, { cutoff = 1400, level = -12, feedback = 46, mix = 40 } = {}) {
  // JT10 as a short filtered pluck
  ses.set('jt10.level', level);
  // dotted-8th dub delay, feedback filtered so it doesn't get muddy/harsh
  ses.mixer = ses.mixer || {};
  ses.mixer.effectChains = {
    jt10: [{
      type: 'delay',
      // pingpong: the echoes ripple across the stereo field — the dub-techno
      // spatial signature. center stays kick+sub, the stab opens the room up.
      params: { mode: 1, sync: 2 /* dotted8th */, feedback, mix,
                lowcut: 140, highcut: 5500, saturation: 28, spread: 100 },
    }],
  };
  // try to set the lead filter if the param exists (best-effort, harmless if not)
  try { ses.set('jt10.lead.cutoff', cutoff); } catch (_) {}
}

async function main() {
  const sections = [];

  // 1) INTRO (8 bars): kick + hats find the room, hats slowly open
  sections.push(await renderSection('intro', 8, (ses, bars) => {
    setupKickHats(ses, { hatDecay: 24, drumLevel: -7 });
    const d = emptyDrums(bars);
    for (let b = 0; b < bars; b++) drumsBar(d, b, { kick: true, hats: true, openHatStep: b >= 4 ? 14 : -1 });
    ses._nodes.jb01.setPattern(d);
  }));

  // 2) SUB ENTERS (8 bars): the floor gets weight
  sections.push(await renderSection('sub', 8, (ses, bars) => {
    setupKickHats(ses, { hatDecay: 30 });
    setupSub(ses, -9);
    const d = emptyDrums(bars), s = emptyNotes(bars);
    for (let b = 0; b < bars; b++) { drumsBar(d, b, { openHatStep: 14 }); subBar(s, b); }
    ses._nodes.jb01.setPattern(d);
    ses._nodes.jt30.setPattern(s);
  }));

  // 3) MAIN GROOVE (16 bars): the stab drops in, delay rippling, filter opening
  sections.push(await renderSection('main', 16, (ses, bars) => {
    setupKickHats(ses, { hatDecay: 34 });
    setupSub(ses, -9);
    setupStab(ses, { cutoff: 1500, level: -12, feedback: 48, mix: 42 });
    const d = emptyDrums(bars), s = emptyNotes(bars), st = emptyNotes(bars);
    for (let b = 0; b < bars; b++) {
      drumsBar(d, b, { openHatStep: 14, ghostClap: b % 4 === 3 });
      subBar(s, b);
      stabBar(st, b);                // Am: C over A
    }
    ses._nodes.jb01.setPattern(d);
    ses._nodes.jt30.setPattern(s);
    ses._nodes.jt10.setPattern(st);
  }));

  // 4) BREAKDOWN (8 bars): kick drops out, stab + delay wash, sub thins
  sections.push(await renderSection('break', 8, (ses, bars) => {
    setupKickHats(ses, { hatDecay: 40, drumLevel: -10 });
    setupSub(ses, -13);
    setupStab(ses, { cutoff: 900, level: -10, feedback: 62, mix: 55 }); // more echo, darker
    const d = emptyDrums(bars), s = emptyNotes(bars), st = emptyNotes(bars);
    for (let b = 0; b < bars; b++) {
      drumsBar(d, b, { kick: false, hats: true, openHatStep: b % 2 ? 14 : -1 });
      if (b >= 4) note(s, b * 16 + 0, 'A1', false);   // a lone sub swell late
      stabBar(st, b, 'C4', 'A3');
    }
    ses._nodes.jb01.setPattern(d);
    ses._nodes.jt30.setPattern(s);
    ses._nodes.jt10.setPattern(st);
  }));

  // 5) REBUILD + CHORD MOVE TO F (16 bars): everything back, stab lifts to F
  sections.push(await renderSection('lift', 16, (ses, bars) => {
    setupKickHats(ses, { hatDecay: 34 });
    setupSub(ses, -9);
    setupStab(ses, { cutoff: 1800, level: -12, feedback: 50, mix: 44 });
    const d = emptyDrums(bars), s = emptyNotes(bars), st = emptyNotes(bars);
    for (let b = 0; b < bars; b++) {
      drumsBar(d, b, { openHatStep: 14, ghostClap: b % 4 === 3 });
      // 8 bars on Am, then 8 bars move to F (the dub-techno chord change)
      if (b < 8) { subBar(s, b, 'A1', 'E1'); stabBar(st, b, 'C4', 'A3'); }
      else       { subBar(s, b, 'F1', 'C2'); stabBar(st, b, 'A3', 'F3'); }
    }
    ses._nodes.jb01.setPattern(d);
    ses._nodes.jt30.setPattern(s);
    ses._nodes.jt10.setPattern(st);
  }));

  // 6) OUTRO (8 bars): strip to kick + the delay tail, fade
  sections.push(await renderSection('outro', 8, (ses, bars) => {
    setupKickHats(ses, { hatDecay: 28, drumLevel: -8 });
    setupStab(ses, { cutoff: 1100, level: -13, feedback: 56, mix: 50 });
    const d = emptyDrums(bars), st = emptyNotes(bars);
    for (let b = 0; b < bars; b++) {
      drumsBar(d, b, { kick: b < 6, hats: true, openHatStep: 14 });
      if (b < 5) stabBar(st, b, 'C4', 'A3');
    }
    ses._nodes.jb01.setPattern(d);
    ses._nodes.jt10.setPattern(st);
  }));

  // stitch with 60ms equal-power crossfades so sections glue
  let mix = stitch(sections, 0.06);

  // fade the last 3 seconds out
  const fade = Math.floor(3 * mix.sr);
  for (let i = 0; i < fade; i++) {
    const g = 1 - i / fade, idx = mix.L.length - fade + i;
    mix.L[idx] *= g; mix.R[idx] *= g;
  }

  // master trim to ~0.89 peak (headroom, no clip)
  let peak = 0;
  for (let i = 0; i < mix.L.length; i++) peak = Math.max(peak, Math.abs(mix.L[i]), Math.abs(mix.R[i]));
  const trim = peak > 0 ? 0.89 / peak : 1;
  for (let i = 0; i < mix.L.length; i++) { mix.L[i] *= trim; mix.R[i] *= trim; }

  mkdirSync(HERE, { recursive: true });
  const final = `${HERE}/haze.wav`;
  writeWavStereo(final, mix.L, mix.R, mix.sr);

  const secs = (mix.L.length / mix.sr).toFixed(1);
  let rms = 0; for (let i = 0; i < mix.L.length; i++) rms += mix.L[i] * mix.L[i];
  rms = Math.sqrt(rms / mix.L.length);
  console.log(`\nHAZE: ${secs}s, peak before trim ${peak.toFixed(3)} (trim x${trim.toFixed(2)}), rms ${rms.toFixed(3)}`);
  console.log(`wrote ${final}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
