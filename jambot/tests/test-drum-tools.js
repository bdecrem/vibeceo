#!/usr/bin/env node
/**
 * Drum + JT pattern tools (2026-09-05 fix batch, G4):
 *   - add_jt30 / add_jt10: note-less steps inherit the previous note, `bars`
 *     is honoured / inferred from the array, invalid notes are refused
 *   - add_jt90 / add_jb01: steps >= 16 grow the pattern, hit counts are real,
 *     voices not named are kept (repeated to the new length), clear:true
 *     wipes, loop length follows the pattern
 *   - JT90 mixed voice lengths: every voice plays in every bar, save/reload
 *     keeps hits beyond the kick's length, old saves recover them
 *   - tweak on a misspelled voice/param errors for jb01 and jt90
 *   - tweak_jt10 glideTime 0-100 → seconds
 *   - load_jb01_kit applies the kit (no stray object keys)
 */
import { strict as assert } from 'node:assert';
import { createSession, serializeSession, deserializeSession } from '../core/session.js';
import { renderSessionToBuffer } from '../core/render.js';
import { initializeTools, executeTool } from '../tools/index.js';
import { JT90Node } from '../instruments/jt90-node.js';
import { getParamDef, toEngine } from '../params/converters.js';

await initializeTools();
let passed = 0, failed = 0;
const ok = (name, fn) => { try { fn(); passed++; console.log(`  ✓ ${name}`); } catch (e) { failed++; console.error(`  ✗ ${name}\n    ${e.message}`); } };
const hits = (track) => (track || []).map((s, i) => (s && s.velocity > 0 ? i : null)).filter(i => i !== null);
const lengths = (pattern) => Object.fromEntries(Object.entries(pattern).map(([v, t]) => [v, t.length]));
const rmsRange = (buf, a, b) => { const d = buf.getChannelData(0); let t = 0, n = 0; for (let i = a; i < Math.min(b, d.length); i++) { t += d[i] * d[i]; n++; } return Math.sqrt(t / Math.max(n, 1)); };
const silence = console.warn; console.warn = () => {}; // setParam warnings are expected below

// ---------------------------------------------------------------- JT30 / JT10
console.log('\n[1] add_jt30 / add_jt10 step defaults, bars, validation');
{
  const s = createSession({ bpm: 128 });
  const r = await executeTool('add_jt30', { pattern: [{ gate: true }, { gate: false }, { note: 'C2', gate: true }, { gate: true, accent: true }] }, s, {});
  const p = s.instrument('jt30').pattern;
  ok('note-less first step falls back to A1', () => assert.equal(p[0].note, 'A1'));
  ok('note-less step inherits the previous note', () => assert.equal(p[3].note, 'C2'));
  ok('result counts notes', () => assert.match(r, /3 notes programmed/));
  const render = await renderSessionToBuffer(s, 1);
  ok('JT30 renders (no noteToMidi crash)', () => assert.doesNotMatch(render.message, /FAILED TO RENDER/));

  const bad = await executeTool('add_jt30', { pattern: [{ note: 'H2', gate: true }, { note: 'C2', gate: true }, { note: 'X', gate: true }] }, s, {});
  ok('invalid notes are refused, listing the steps', () => { assert.match(bad, /invalid note/); assert.match(bad, /step 0/); assert.match(bad, /step 2/); });
  ok('pattern untouched after the refused call', () => assert.equal(s.instrument('jt30').pattern.length, 16));

  const p32 = Array.from({ length: 32 }, (_, i) => ({ note: i < 16 ? 'A1' : 'C2', gate: true }));
  const r2 = await executeTool('add_jt30', { pattern: p32, bars: 2 }, s, {});
  ok('add_jt30 honours bars:2', () => { assert.equal(s.instrument('jt30').pattern.length, 32); assert.match(r2, /32 notes programmed \(2 bars\)/); });
  ok('bar 2 keeps its own notes', () => assert.equal(s.instrument('jt30').pattern[20].note, 'C2'));
  const r3 = await executeTool('add_jt30', { pattern: p32 }, s, {});
  ok('add_jt30 infers 2 bars from a 32-step array', () => { assert.equal(s.instrument('jt30').pattern.length, 32); assert.match(r3, /2 bars/); });
  const r4 = await executeTool('add_jt10', { pattern: p32 }, s, {});
  ok('add_jt10 infers 2 bars from a 32-step array', () => { assert.equal(s.instrument('jt10').pattern.length, 32); assert.match(r4, /2 bars/); });
  const r5 = await executeTool('add_jt10', { pattern: [{ gate: true }, { note: 'E3', gate: true }, { gate: true }] }, s, {});
  const q = s.instrument('jt10').pattern;
  ok('add_jt10 defaults: C3 then previous note', () => { assert.equal(q[0].note, 'C3'); assert.equal(q[2].note, 'E3'); assert.match(r5, /3 notes/); });
  const r6 = await executeTool('add_jt10', { pattern: p32, bars: 1 }, s, {});
  ok('explicit bars smaller than the array says so', () => { assert.equal(s.instrument('jt10').pattern.length, 16); assert.match(r6, /extra steps dropped/); });
  ok('loop length grew to fit the 2-bar bass', () => assert.ok(s.bars >= 2));
  const s4 = createSession({ bpm: 128 }); s4.bars = 1;
  await executeTool('add_jt30', { pattern: Array.from({ length: 64 }, () => ({ note: 'A1', gate: true })) }, s4, {});
  ok('4-bar pattern raises session.bars to 4 in loop mode', () => assert.equal(s4.bars, 4));
}

// ---------------------------------------------------------------- JT90 / JB01 programming
for (const [tool, id, label] of [['add_jt90', 'jt90', 'JT90'], ['add_jb01', 'jb01', 'JB01']]) {
  console.log(`\n[2] ${tool}: growth, kept voices, clear, hit counts`);
  const s = createSession({ bpm: 128 });
  const pat = () => s.instrument(id).pattern;

  const r1 = await executeTool(tool, { kick: [0, 4, 8, 12, 16, 20, 24, 28] }, s, {});
  ok(`${label}: steps >= 16 grow the pattern to 2 bars`, () => { assert.deepEqual(hits(pat().kick), [0, 4, 8, 12, 16, 20, 24, 28]); assert.equal(pat().kick.length, 32); });
  ok(`${label}: hit count is what landed`, () => assert.match(r1, /kick: 8 hits/));
  ok(`${label}: result says it grew`, () => assert.match(r1, /grown to 2 bars/));
  ok(`${label}: every voice is 32 steps`, () => assert.ok(Object.values(lengths(pat())).every(n => n === 32), JSON.stringify(lengths(pat()))));

  const r2 = await executeTool(tool, { bars: 2, ch: [0, 2, 4, 6, 8, 10, 12, 14] }, s, {});
  ok(`${label}: bars:2 keeps the kick from the previous call`, () => assert.deepEqual(hits(pat().kick), [0, 4, 8, 12, 16, 20, 24, 28]));
  ok(`${label}: with explicit bars:2 the steps are absolute (hats in bar 1 only)`, () => assert.deepEqual(hits(pat().ch), [0, 2, 4, 6, 8, 10, 12, 14]));
  ok(`${label}: result reports the 8 hits that landed`, () => { assert.match(r2, /ch: 8 hits/); assert.doesNotMatch(r2, /repeated/); });

  const r3 = await executeTool(tool, { oh: [2, 10] }, s, {});
  ok(`${label}: call without bars on a 2-bar pattern keeps all voices at 32`, () => assert.ok(Object.values(lengths(pat())).every(n => n === 32), JSON.stringify(lengths(pat()))));
  ok(`${label}: oh repeated across both bars`, () => { assert.deepEqual(hits(pat().oh), [2, 10, 18, 26]); assert.match(r3, /oh: 4 hits/); });
  ok(`${label}: kick still intact`, () => assert.equal(hits(pat().kick).length, 8));

  const r4 = await executeTool(tool, { bars: 1, snare: [4, 12] }, s, {});
  ok(`${label}: bars:1 without clear does not shrink`, () => { assert.equal(pat().snare.length, 32); assert.match(r4, /kept the existing 2-bar length/); });

  const r5 = await executeTool(tool, { clear: true, kick: [0, 8] }, s, {});
  ok(`${label}: clear:true wipes and shrinks to 1 bar`, () => { assert.equal(pat().kick.length, 16); assert.deepEqual(hits(pat().kick), [0, 8]); assert.deepEqual(hits(pat().ch), []); assert.match(r5, /cleared first/); });

  const r6 = await executeTool(tool, { kick: [0, -1, 4.5] }, s, {});
  ok(`${label}: bad step numbers are refused`, () => assert.match(r6, /whole numbers/));
  const r7 = await executeTool(tool, { kick: [0, 0, 4] }, s, {});
  ok(`${label}: duplicate steps count once`, () => assert.match(r7, /kick: 2 hits/));

  // full pattern objects still work
  const objs = Array.from({ length: 16 }, (_, i) => ({ velocity: i % 4 === 0 ? 0.8 : 0, accent: i === 0 }));
  const r8 = await executeTool(tool, { clap: objs }, s, {});
  ok(`${label}: object arrays are placed with real counts`, () => { assert.match(r8, /clap: 4 hits/); assert.equal(pat().clap[0].velocity, 0.8); assert.equal(pat().clap[0].accent, true); });

  // loop length follows the pattern in loop mode only
  const s2 = createSession({ bpm: 128 }); s2.bars = 1;
  const r9 = await executeTool(tool, { bars: 4, kick: [0] }, s2, {});
  ok(`${label}: 4-bar pattern raises session.bars`, () => { assert.equal(s2.bars, 4); assert.match(r9, /loop length set to 4 bars/); });
  const s3 = createSession({ bpm: 128 }); s3.bars = 1; s3.arrangement = [{ bars: 2, patterns: {} }];
  await executeTool(tool, { bars: 4, kick: [0] }, s3, {});
  ok(`${label}: with an arrangement session.bars is left alone`, () => assert.equal(s3.bars, 1));
}

// ---------------------------------------------------------------- JT90 mixed lengths: audio + persistence
console.log('\n[3] JT90 mixed voice lengths');
{
  const s = createSession({ bpm: 128 });
  const node = s.instrument('jt90').node;
  // hand the node a mixed-length pattern the way a saved song-mode pattern would
  node.setPattern({
    kick: Array(32).fill(null).map(() => ({ velocity: 0, accent: false })),
    ch: Array(16).fill(null).map((_, i) => ({ velocity: i % 2 === 0 ? 1 : 0, accent: false })),
  });
  ok('setPattern evens the hat out to the kick length', () => { assert.equal(node.getPattern().ch.length, 32); assert.equal(hits(node.getPattern().ch).length, 16); });
  ok('getPatternLength is the longest voice', () => assert.equal(node.getPatternLength(), 32));
  const r = await renderSessionToBuffer(s, 2);
  const spb = s.clock.samplesPerBar;
  const bar1 = rmsRange(r.buffer, 0, spb), bar2 = rmsRange(r.buffer, spb, 2 * spb);
  ok(`hats sound in both bars (bar1 ${bar1.toFixed(4)}, bar2 ${bar2.toFixed(4)})`, () => { assert.ok(bar1 > 0.005); assert.ok(bar2 > bar1 * 0.5); });

  // saved song-mode pattern with a short voice renders it in every bar too
  const raw = { kick: Array(32).fill(null).map(() => ({ velocity: 0, accent: false })), ch: Array(16).fill(null).map((_, i) => ({ velocity: i % 2 === 0 ? 1 : 0, accent: false })) };
  const buf = await node.renderPattern({ bars: 2, stepDuration: s.clock.stepDuration, sampleRate: 44100, pattern: raw });
  const b1 = rmsRange(buf, 0, spb), b2 = rmsRange(buf, spb, 2 * spb);
  ok(`pattern option with mixed lengths plays bar 2 (${b1.toFixed(4)} / ${b2.toFixed(4)})`, () => assert.ok(b2 > b1 * 0.5));

  // serialize keeps hits beyond the kick's length
  const s2 = createSession({ bpm: 128 });
  await executeTool('add_jt90', { bars: 2, kick: [0, 8, 16, 24], ch: [2, 18, 30] }, s2, {});
  await executeTool('add_jt90', { kick: [0, 8] }, s2, {});
  ok('ch still has its bar-2 hits after a 1-bar kick call', () => assert.deepEqual(hits(s2.instrument('jt90').pattern.ch), [2, 18, 30]));
  const s3 = deserializeSession(serializeSession(s2));
  ok('save/reload keeps ch at [2, 18, 30]', () => assert.deepEqual(hits(s3.instrument('jt90').pattern.ch), [2, 18, 30]));
  ok('reloaded pattern length is 32', () => assert.equal(s3.instrument('jt90').node.getPatternLength(), 32));

  // an OLD save (patternLength = kick length 16, hat steps beyond it) recovers its hits
  const old = new JT90Node({ id: 'jt90' });
  old.deserialize({ pattern: { kick: [{ i: 0, v: 1 }, { i: 8, v: 1 }], ch: [{ i: 2, v: 1 }, { i: 18, v: 1 }, { i: 30, v: 1 }] }, patternLength: 16 });
  ok('legacy save with patternLength 16 recovers steps 18 and 30', () => { assert.deepEqual(hits(old.getPattern().ch), [2, 18, 30]); assert.equal(old.getPatternLength(), 32); });
}

// ---------------------------------------------------------------- misspelled tweaks
console.log('\n[4] tweak rejects unknown drum params');
{
  const s = createSession({ bpm: 128 });
  for (const path of ['jt90.kick.decayy', 'jt90.kik.decay', 'jb01.kick.decayy', 'jb01.kik.decay']) {
    const r = await executeTool('tweak', { path, value: 50 }, s, {});
    ok(`tweak ${path} errors`, () => assert.match(r, /^Error/));
  }
  const m = await executeTool('tweak_multi', { params: { 'jb01.kik.decay': 50, 'jt90.kick.decay': 60 } }, s, {});
  ok('tweak_multi fails the bad one and sets the good one', () => { assert.match(m, /jb01\.kik\.decay: (FAILED|Error)/); assert.match(m, /jt90\.kick\.decay = 60/); });
  const good = await executeTool('tweak', { path: 'jt90.kick.decay', value: 80 }, s, {});
  ok('valid jt90 param still sets', () => { assert.match(good, /Set jt90\.kick\.decay = 80/); assert.equal(s.instrument('jt90').node.getParam('kick.decay'), 0.8); });
  const goodB = await executeTool('tweak', { path: 'jb01.kick.decay', value: 40 }, s, {});
  ok('valid jb01 param still sets', () => { assert.match(goodB, /Set jb01\.kick\.decay = 40/); assert.equal(s.instrument('jb01').node.getParam('kick.decay'), 0.4); });
  ok('mute still works for a real voice', () => { assert.equal(s.instrument('jt90').node.setParam('ch.mute', true), true); assert.equal(s.instrument('jt90').node.getParam('ch.level'), 0); });
  ok('non-numeric value refused', () => assert.equal(s.instrument('jb01').node.setParam('kick.decay', { a: 1 }), false));
  ok('nothing stray stored', () => assert.equal(Object.keys(s.instrument('jt90').node._params).filter(k => /decayy|kik/.test(k)).length, 0));
}

// ---------------------------------------------------------------- glideTime
console.log('\n[5] tweak_jt10 glideTime');
{
  const s = createSession({ bpm: 128 });
  const node = s.instrument('jt10').node;
  const r1 = await executeTool('tweak_jt10', { glideTime: 50 }, s, {});
  ok('glideTime 50 → 0.5 s', () => { assert.equal(node.getParam('lead.glideTime'), 0.5); assert.match(r1, /glideTime=0\.5s/); });
  const r2 = await executeTool('tweak_jt10', { glideTime: 0.2 }, s, {});
  ok('glideTime 0.2 passes through as seconds', () => { assert.equal(node.getParam('lead.glideTime'), 0.2); assert.match(r2, /glideTime=0\.2s/); });
  await executeTool('tweak_jt10', { glideTime: 100 }, s, {});
  ok('glideTime 100 → 1 s', () => assert.equal(node.getParam('lead.glideTime'), 1));
  await executeTool('tweak_jt10', { glideTime: 0 }, s, {});
  ok('glideTime 0 → 0 s', () => assert.equal(node.getParam('lead.glideTime'), 0));
}

// ---------------------------------------------------------------- JB01 kit
console.log('\n[6] load_jb01_kit');
{
  const s = createSession({ bpm: 128 });
  const node = s.instrument('jb01').node;
  const r = await executeTool('load_jb01_kit', { kit: 'default' }, s, {});
  ok('kit reports success with voices', () => assert.match(r, /Loaded JB01 kit: Default \(8 voices/));
  ok('kick.decay applied (40 → 0.4)', () => assert.ok(Math.abs(node.getParam('kick.decay') - 0.4) < 1e-9));
  ok('kick.attack applied (100 → 1)', () => assert.equal(node.getParam('kick.attack'), 1));
  ok('ch.decay applied (20 → 0.2)', () => assert.ok(Math.abs(node.getParam('ch.decay') - 0.2) < 1e-9));
  ok('level 0 dB → engine unity (same as tweak_jb01 level:0)', () => assert.ok(Math.abs(node.getParam('kick.level') - toEngine(0, getParamDef('jb01', 'kick', 'level'))) < 1e-9));
  ok('tune stays numeric (cents)', () => assert.equal(node.getParam('snare.tune'), 0));
  ok('no object-valued params stored', () => assert.equal(Object.values(node._params).filter(v => typeof v === 'object').length, 0));
  ok('no stray voice.voice keys', () => assert.equal(Object.keys(node._params).filter(k => /^kick\.(kick|snare|clap|ch|oh)$/.test(k)).length, 0));
  const missing = await executeTool('load_jb01_kit', { kit: 'no-such-kit' }, s, {});
  ok('unknown kit is an error', () => assert.match(missing, /^Error: Kit 'no-such-kit' not found/));
  // the saved track carries only clean params
  const data = serializeSession(s);
  const jb01 = data.params?.nodes?.jb01 || Object.values(data.params?.nodes || {}).find(n => n?.id === 'jb01');
  ok('serialized jb01 params are all numbers', () => assert.ok(Object.values(jb01?.params || {}).every(v => typeof v === 'number')));
  // a track saved by the old loader (object-valued keys) comes back clean
  const dirty = deserializeSession({ ...data, params: JSON.parse(JSON.stringify(data.params)) });
  dirty.instrument('jb01').node.deserialize({ params: { 'kick.decay': 0.4, 'kick.kick': { level: 0 }, 'kik.decay': 0.3 } });
  ok('deserialize drops object-valued and unknown keys', () => { const p = dirty.instrument('jb01').node._params; assert.equal(p['kick.kick'], undefined); assert.equal(p['kik.decay'], undefined); assert.equal(p['kick.decay'], 0.4); });
}

console.warn = silence;
console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
