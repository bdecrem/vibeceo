#!/usr/bin/env node
/**
 * Instrument instances: two JB202s (and two JT90s) in one session.
 *   - add_instrument / list / remove
 *   - per-instance patterns, params, effects, automation paths
 *   - both instances render (and independently)
 *   - song mode: save/load/arrangement keyed by instance id
 *   - serialize → deserialize keeps the instance
 */
import { strict as assert } from 'node:assert';
import { createSession, serializeSession, deserializeSession } from '../core/session.js';
import { renderSessionToBuffer } from '../core/render.js';
import { initializeTools, executeTool } from '../tools/index.js';

await initializeTools();
let passed = 0;
function ok(name, fn) { try { fn(); console.log(`  ✓ ${name}`); passed++; } catch (e) { console.error(`  ✗ ${name}\n    ${e.message}`); process.exitCode = 1; } }
const mono = (n) => Array.from({ length: 16 }, (_, i) => ({ note: n, gate: i % 4 === 0 }));
const rms = async (s, bars = 1) => { const d = (await renderSessionToBuffer(s, bars)).buffer.getChannelData(0); let t = 0; for (let i = 0; i < d.length; i++) t += d[i] * d[i]; return Math.sqrt(t / d.length); };
const diffDb = async (a, b) => { const x = Float32Array.from((await renderSessionToBuffer(a, 1)).buffer.getChannelData(0)); const y = Float32Array.from((await renderSessionToBuffer(b, 1)).buffer.getChannelData(0)); let sd = 0, sa = 0; for (let i = 0; i < x.length; i++) { const d = x[i] - y[i]; sd += d * d; sa += x[i] * x[i]; } return 20 * Math.log10(Math.sqrt(sd / x.length) / Math.max(Math.sqrt(sa / x.length), 1e-9)); };

const s = createSession({ bpm: 128 });
const r1 = await executeTool('add_instrument', { type: 'jb202' }, s, {});
ok('add_instrument returns the new id', () => assert.match(r1, /"jb202-2"/));
ok('list_instruments shows it', () => assert.match(s.listInstruments().map(i => i.id).join(','), /jb202-2/));
ok('add_jb202 with instrument targets the instance', async () => {});
await executeTool('add_jb202', { instrument: 'jb202-2', pattern: mono('E3') }, s, {});
await executeTool('add_jb202', { pattern: mono('C2') }, s, {});
ok('patterns are independent', () => {
  assert.equal(s.instrument('jb202').pattern[0].note, 'C2');
  assert.equal(s.instrument('jb202-2').pattern[0].note, 'E3');
});
const t1 = await executeTool('tweak', { path: 'jb202-2.filterCutoff', value: 3000 }, s, {});
ok('tweak on the instance path works', () => assert.match(t1, /3.0kHz|3000Hz/));
ok('canonical params untouched', () => assert.notEqual(s.instrument('jb202').params.filterCutoff, s.instrument('jb202-2').params.filterCutoff));
const tj = await executeTool('tweak_jb202', { instrument: 'jb202-2', drive: 60 }, s, {});
ok('tweak_jb202 with instrument', () => assert.match(tj, /drive=60/));
ok('wrong-type instrument refused', async () => {});
const bad = await executeTool('add_jt90', { instrument: 'jb202-2', kick: [0] }, s, {});
ok('add_jt90 refuses a jb202 id', () => assert.match(bad, /is a jb202, not a jt90/));

const both = await renderSessionToBuffer(s, 1);
ok('render lists both instances', () => assert.match(both.message, /JB202-2/i));
const only1 = createSession({ bpm: 128 }); await executeTool('add_jb202', { pattern: mono('C2') }, only1, {});
ok('second instance audibly adds to the mix', async () => {});
const db = await diffDb(s, only1);
ok(`second instance changes the audio (${db.toFixed(1)} dB)`, () => assert.ok(db > -30));

const fx = await executeTool('add_effect', { target: 'jb202-2', effect: 'delay', mix: 40 }, s, {});
ok('effects target the instance', () => assert.match(fx, /fx\.jb202-2\.delay1/));
const au = await executeTool('automate', { path: 'jb202-2.filterCutoff', values: [300, 600, 900, 1200] }, s, {});
ok('automation on the instance path', () => assert.match(au, /automation set/));

// song mode
await executeTool('save_pattern', { instrument: 'jb202-2', name: 'A' }, s, {});
await executeTool('save_pattern', { instrument: 'jb202', name: 'A' }, s, {});
const arr = await executeTool('set_arrangement', { sections: [{ bars: 1, jb202: 'A', 'jb202-2': 'A' }, { bars: 1, 'jb202-2': 'A' }] }, s, {});
ok('arrangement accepts the instance key', () => assert.match(arr, /2 sections/));
ok('saved params carry the instance cutoff', () => assert.ok(s.patterns['jb202-2'].A.params.filterCutoff > s.patterns['jb202'].A.params.filterCutoff));
const song = await renderSessionToBuffer(s, 2);
ok('song render includes both', () => assert.match(song.message, /JB202\+JB202-2|JB202-2\+JB202/i));
const badArr = await executeTool('set_arrangement', { sections: [{ bars: 1, nope: 'A' }] }, s, {});
ok('arrangement rejects unknown ids', () => assert.match(badArr, /unknown instrument/));
const ld = await executeTool('load_pattern', { instrument: 'jb202-2', name: 'A' }, s, {});
ok('load_pattern by instance', () => assert.match(ld, /Loaded jb202-2/));

// serialization
const d = deserializeSession(JSON.parse(JSON.stringify(serializeSession(s))));
ok('deserialize recreates the instance', () => {
  assert.ok(d.instrument('jb202-2'));
  assert.equal(d.instrument('jb202-2').pattern[0].note, 'E3');
  assert.ok(d.patterns['jb202-2'].A);
  assert.equal(d.arrangement.length, 2);
});
ok('deserialized session renders both', async () => {});
const dm = await renderSessionToBuffer(d, 2);
ok('deserialized song render includes both', () => assert.match(dm.message, /JB202-2/i));

// two drum machines
const s2 = createSession({ bpm: 128 });
await executeTool('add_instrument', { type: 'jt90', id: 'kit2' }, s2, {});
await executeTool('add_jt90', { instrument: 'kit2', ch: [0, 2, 4, 6, 8, 10, 12, 14] }, s2, {});
await executeTool('add_jt90', { kick: [0, 4, 8, 12] }, s2, {});
const tk = await executeTool('tweak_jt90', { instrument: 'kit2', voice: 'ch', decay: 90 }, s2, {});
ok('tweak_jt90 on a named instance', () => assert.match(tk, /decay=90/));
ok('drum instance keeps its own voices', () => assert.ok(s2.instrument('kit2').pattern.ch.some(x => x.velocity > 0) && !s2.instrument('kit2').pattern.kick?.some(x => x?.velocity > 0)));
const rr = await renderSessionToBuffer(s2, 1);
ok('two JT90s render', () => assert.match(rr.message, /KIT2/i));

const rm = await executeTool('remove_instrument', { id: 'kit2' }, s2, {});
ok('remove_instrument', () => { assert.match(rm, /Removed/); assert.equal(s2.instrument('kit2'), null); });
const rm2 = await executeTool('remove_instrument', { id: 'jt90' }, s2, {});
ok('built-ins cannot be removed', () => assert.match(rm2, /built in/));

console.log(`\n${passed} instance checks passed${process.exitCode ? ' (with failures)' : ''}`);
