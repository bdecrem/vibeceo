#!/usr/bin/env node
/**
 * Song tools: save/load/copy_pattern, list_patterns, set_arrangement,
 * show_arrangement — plus the tool schemas they depend on.
 *   - set_arrangement validates sections/bars/instrument ids/pattern names,
 *     reports everything wrong at once and leaves the arrangement untouched
 *   - show_arrangement / list_patterns include added instances, no retired jb200
 *   - channel inserts (effect chains) are saved with a pattern and restored on
 *     load; legacy saves (channelInserts: null) leave live effects alone
 *   - legacy aliases (drums/bass/lead) are rejected with the canonical id
 *   - tool schemas: free-string instrument on pattern tools, bars on
 *     add_jb202/add_jt30, well-formed show_jb01, channel targets documented
 */
import { strict as assert } from 'node:assert';
import { createSession, serializeSession, deserializeSession } from '../core/session.js';
import { renderSessionToBuffer } from '../core/render.js';
import { initializeTools, executeTool } from '../tools/index.js';
import { TOOLS } from '../tools/tool-definitions.js';

await initializeTools();
let passed = 0;
function ok(name, fn) { try { fn(); console.log(`  ✓ ${name}`); passed++; } catch (e) { console.error(`  ✗ ${name}\n    ${e.message}`); process.exitCode = 1; } }
const t = (name, input, s) => executeTool(name, input, s, {});
const mono = (n) => Array.from({ length: 16 }, (_, i) => ({ note: n, gate: i % 4 === 0 }));
const rms = async (s, bars = 1) => { const d = (await renderSessionToBuffer(s, bars)).buffer.getChannelData(0); let a = 0; for (let i = 0; i < d.length; i++) a += d[i] * d[i]; return Math.sqrt(a / d.length); };

// ---------------------------------------------------------------------------
console.log('set_arrangement validation');
let s = createSession({ bpm: 128 });
await t('add_jt90', { kick: [0, 4, 8, 12] }, s);
await t('save_pattern', { instrument: 'jt90', name: 'A' }, s);
await t('add_jb202', { pattern: mono('C2') }, s);
await t('save_pattern', { instrument: 'jb202', name: 'A' }, s);
const good = await t('set_arrangement', { sections: [{ bars: 2, jt90: 'A', jb202: 'A' }, { bars: '2', jt90: 'A' }] }, s);
ok('valid arrangement is set (numeric-string bars coerced)', () => {
  assert.match(good, /2 sections, 4 bars total/);
  assert.deepEqual(s.arrangement.map(x => x.bars), [2, 2]);
  assert.deepEqual(s.arrangement[0].patterns, { jt90: 'A', jb202: 'A' });
});
const before = JSON.stringify(s.arrangement);
const cases = [
  ['empty sections', { sections: [] }, /non-empty/],
  ['missing sections', {}, /non-empty/],
  ['unsaved pattern name', { sections: [{ bars: 2, jt90: 'A' }, { bars: 2, jt90: 'C' }] }, /section 2: no saved jt90 pattern "C" \(saved: A\)/],
  ['legacy drums key', { sections: [{ bars: 2, drums: 'A' }] }, /"drums" is a legacy alias.*"jb01"/],
  ['legacy bass key', { sections: [{ bars: 2, bass: 'A' }] }, /"bass" is a legacy alias.*"jb202"/],
  ['retired jb200 key', { sections: [{ bars: 2, jb200: 'A' }] }, /jb200 is retired/],
  ['unknown instrument', { sections: [{ bars: 2, nope: 'A' }] }, /unknown instrument "nope"/],
  ['bars 0', { sections: [{ bars: 0, jt90: 'A' }] }, /section 1: bars must be a whole number ≥ 1 \(got 0\)/],
  ['bars negative', { sections: [{ bars: -4, jt90: 'A' }] }, /got -4/],
  ['bars missing', { sections: [{ jt90: 'A' }] }, /got undefined/],
  ['bars null', { sections: [{ bars: null, jt90: 'A' }] }, /got null/],
  ['bars fractional', { sections: [{ bars: 1.5, jt90: 'A' }] }, /got 1.5/],
  ['bars non-numeric string', { sections: [{ bars: 'four', jt90: 'A' }] }, /got "four"/],
  ['total over 128 bars', { sections: [{ bars: 100, jt90: 'A' }, { bars: 29, jt90: 'A' }] }, /129 bars; max 128/],
  ['section not an object', { sections: [4] }, /section 1: must be an object/],
];
for (const [label, input, re] of cases) {
  const r = await t('set_arrangement', input, s);
  ok(`rejects ${label}`, () => {
    assert.match(r, /^Error/);
    assert.match(r, re);
    assert.match(r, /Arrangement unchanged/);
    assert.equal(JSON.stringify(s.arrangement), before, 'arrangement must be untouched');
  });
}
const multi = await t('set_arrangement', { sections: [{ bars: 0, drums: 'A', jt90: 'Z' }, { bars: 2, jt90: 'A' }] }, s);
ok('reports every problem in one error', () => {
  assert.match(multi, /bars must be a whole number/);
  assert.match(multi, /legacy alias/);
  assert.match(multi, /no saved jt90 pattern "Z"/);
});
const exact = await t('set_arrangement', { sections: [{ bars: 64, jt90: 'A' }, { bars: 64, jt90: 'A' }] }, s);
ok('exactly 128 bars is allowed', () => assert.match(exact, /128 bars total/));
await t('add_jb202', { pattern: [...mono('C2'), ...mono('E2')], bars: 2 }, s);
await t('save_pattern', { instrument: 'jb202', name: 'long' }, s);
const trunc = await t('set_arrangement', { sections: [{ bars: 1, jb202: 'long' }] }, s);
ok('notes when a pattern is longer than its section', () => assert.match(trunc, /Note: section 1: jb202 "long" is 2 bars but the section is 1/));

// ---------------------------------------------------------------------------
console.log('show_arrangement / list_patterns with an added instance');
s = createSession({ bpm: 128 });
await t('add_jt90', { kick: [0, 4, 8, 12] }, s);
await t('save_pattern', { instrument: 'jt90', name: 'A' }, s);
await t('add_instrument', { type: 'jb202' }, s);
await t('add_jb202', { instrument: 'jb202-2', pattern: mono('E2') }, s);
await t('save_pattern', { instrument: 'jb202-2', name: 'A' }, s);
await t('set_arrangement', { sections: [{ bars: 2, jt90: 'A', 'jb202-2': 'A' }, { bars: 2, 'jb202-2': 'A' }] }, s);
const shown = await t('show_arrangement', {}, s);
ok('PATTERNS lists the instance', () => assert.match(shown, /jb202-2: A/));
ok('sections show the instance slot', () => {
  assert.match(shown, /1\. 2 bars — jt90:A, jb202-2:A/);
  assert.match(shown, /2\. 2 bars — jb202-2:A/);
  assert.doesNotMatch(shown, /\(silent\)/);
});
const listed = await t('list_patterns', {}, s);
ok('list_patterns lists the instance and no jb200', () => {
  assert.match(listed, /jb202-2: \[A\]/);
  assert.doesNotMatch(listed, /jb200/);
});
s.patterns.drums = { A: { pattern: {}, params: {} } };   // legacy data from an old session
const listed2 = await t('list_patterns', {}, s);
ok('legacy pattern owners are still listed, flagged', () => assert.match(listed2, /drums: A \(not an instrument in this session\)/));

// ---------------------------------------------------------------------------
console.log('legacy aliases and unknown ids');
s = createSession({ bpm: 128 });
for (const [tool, input] of [
  ['save_pattern', { instrument: 'drums', name: 'A' }],
  ['load_pattern', { instrument: 'drums', name: 'A' }],
  ['copy_pattern', { instrument: 'drums', from: 'A', to: 'B' }],
]) {
  const r = await t(tool, input, s);
  ok(`${tool} rejects "drums" naming jb01`, () => assert.match(r, /^Error: "drums" is a legacy alias.*"jb01"/));
}
ok('bass names jb202', async () => {});
const rb = await t('save_pattern', { instrument: 'bass', name: 'A' }, s);
ok('save_pattern bass → jb202', () => assert.match(rb, /use "jb202"/));
const ru = await t('save_pattern', { instrument: 'nope', name: 'A' }, s);
ok('save_pattern unknown id lists instruments', () => assert.match(ru, /^Error: no instrument "nope"\. Instruments: jb01, jb202/));
const rj = await t('save_pattern', { instrument: 'jp9000', name: 'A' }, s);
ok('save_pattern jp9000 points at rigs', () => assert.match(rj, /save_jp9000_rig/));
const rn = await t('save_pattern', { instrument: 'jt90' }, s);
ok('save_pattern needs a name', () => assert.match(rn, /^Error: save_pattern needs a pattern name/));
const rl = await t('load_pattern', { instrument: 'jt90', name: 'Q' }, s);
ok('load_pattern missing name says none saved', () => assert.match(rl, /No jt90 pattern "Q" found \(none saved\)/));

// ---------------------------------------------------------------------------
console.log('channel inserts saved with patterns');
s = createSession({ bpm: 128 });
await t('add_jb202', { pattern: mono('C2') }, s);
await t('save_pattern', { instrument: 'jb202', name: 'B' }, s);          // no inserts
const fx1 = await t('add_channel_insert', { channel: 'jb202', effect: 'filter', params: { cutoff: 300 } }, s);
ok('insert lands on the canonical chain', () => assert.match(fx1, /fx\.jb202\.filter1/));
const sv = await t('save_pattern', { instrument: 'jb202', name: 'A' }, s);
ok('save_pattern reports the inserts it captured', () => assert.match(sv, /with inserts: jb202\/filter1/));
ok('saved A carries the filter snapshot, B an empty one', () => {
  assert.deepEqual(s.patterns.jb202.A.channelInserts, { jb202: [{ id: 'filter1', type: 'filter', params: { mode: 'lowpass', cutoff: 300, resonance: 30 } }] });
  assert.deepEqual(s.patterns.jb202.B.channelInserts, {});
});
const rmsA = await rms(s);
const lb = await t('load_pattern', { instrument: 'jb202', name: 'B' }, s);
ok('load B (no inserts) clears the live filter and says so', () => {
  assert.match(lb, /dropped live inserts not saved in this pattern: jb202\/filter1/);
  assert.equal(s.mixer.effectChains.jb202, undefined);
  assert.equal(s.params.nodes.has('fx.jb202.filter1'), false);
});
const rmsB = await rms(s);
ok(`unfiltered B renders louder than filtered A (${rmsB.toFixed(4)} vs ${rmsA.toFixed(4)})`, () => assert.ok(rmsB > rmsA * 1.2));
const la = await t('load_pattern', { instrument: 'jb202', name: 'A' }, s);
ok('load A rebuilds the filter with its params', () => {
  assert.match(la, /inserts restored: jb202\/filter1/);
  const chain = s.mixer.effectChains.jb202;
  assert.equal(chain.length, 1);
  assert.equal(chain[0]._node.getParams().cutoff, 300);
  assert.ok(s.params.nodes.has('fx.jb202.filter1'));
});
const rmsA2 = await rms(s);
ok('restored filter is audible again', () => assert.ok(Math.abs(rmsA2 - rmsA) < 1e-6));
const tw = await t('tweak', { path: 'fx.jb202.filter1.cutoff', value: 900 }, s);
ok('restored insert is addressable via fx path', () => assert.match(tw, /900/));

// per-voice chains belong to the drum instrument
await t('add_jt90', { kick: [0, 4, 8, 12], ch: [2, 6, 10, 14] }, s);
await t('add_effect', { target: 'jt90.kick', effect: 'filter', cutoff: 200 }, s);
await t('add_effect', { target: 'jt90', effect: 'delay', mix: 20 }, s);
await t('save_pattern', { instrument: 'jt90', name: 'A' }, s);
ok('drum save captures instrument and voice chains', () => {
  assert.deepEqual(Object.keys(s.patterns.jt90.A.channelInserts).sort(), ['jt90', 'jt90.kick']);
});
await t('remove_effect', { target: 'jt90.kick', effect: 'all' }, s);
await t('remove_effect', { target: 'jt90', effect: 'all' }, s);
await t('save_pattern', { instrument: 'jt90', name: 'B' }, s);
await t('load_pattern', { instrument: 'jt90', name: 'A' }, s);
ok('drum load restores both chains, jb202 chain untouched', () => {
  assert.equal(s.mixer.effectChains['jt90.kick'][0]._node.getParams().cutoff, 200);
  assert.equal(s.mixer.effectChains['jt90'][0].type, 'delay');
  assert.equal(s.mixer.effectChains.jb202[0]._node.getParams().cutoff, 900);
});

// legacy save: channelInserts null leaves live effects alone
s.patterns.jb202.legacy = { pattern: mono('D2'), params: {}, channelInserts: null };
const ll = await t('load_pattern', { instrument: 'jb202', name: 'legacy' }, s);
ok('legacy pattern (channelInserts: null) keeps live effects', () => {
  assert.equal(ll, 'Loaded jb202 pattern "legacy"');
  assert.equal(s.mixer.effectChains.jb202[0]._node.getParams().cutoff, 900);
});
delete s.patterns.jb202.channelInserts;
s.patterns.jb202.older = { pattern: mono('D2'), params: {} };
await t('load_pattern', { instrument: 'jb202', name: 'older' }, s);
ok('pattern without the field keeps live effects', () => assert.equal(s.mixer.effectChains.jb202.length, 1));

// copy_pattern carries the snapshot, serialize/deserialize keeps it
const cp = await t('copy_pattern', { instrument: 'jb202', from: 'A', to: 'A2' }, s);
ok('copy_pattern copies inserts and activates the copy', () => {
  assert.match(cp, /Copied jb202 pattern "A" to "A2" \(now active\)/);
  assert.equal(s.patterns.jb202.A2.channelInserts.jb202[0].params.cutoff, 300);
  assert.equal(s.currentPattern.jb202, 'A2');
});
const d = deserializeSession(JSON.parse(JSON.stringify(serializeSession(s))));
await t('load_pattern', { instrument: 'jb202', name: 'B' }, d);
await t('load_pattern', { instrument: 'jb202', name: 'A' }, d);
ok('deserialized session restores a pattern\'s inserts', () => assert.equal(d.mixer.effectChains.jb202[0]._node.getParams().cutoff, 300));

// added instance: inserts key on the instance id only
await t('add_instrument', { type: 'jb202' }, s);
await t('add_jb202', { instrument: 'jb202-2', pattern: mono('G2') }, s);
await t('add_effect', { target: 'jb202-2', effect: 'reverb', mix: 30 }, s);
await t('save_pattern', { instrument: 'jb202-2', name: 'A' }, s);
ok('instance snapshot does not include the canonical jb202 chain', () => {
  assert.deepEqual(Object.keys(s.patterns['jb202-2'].A.channelInserts), ['jb202-2']);
});
await t('load_pattern', { instrument: 'jb202', name: 'B' }, s);
ok('loading jb202 B leaves jb202-2\'s reverb alone', () => assert.equal(s.mixer.effectChains['jb202-2'][0].type, 'reverb'));

// ---------------------------------------------------------------------------
console.log('tool schemas');
const byName = Object.fromEntries(TOOLS.map(x => [x.name, x]));
const SCHEMA_KEYS = new Set(['type', 'properties', 'required', 'additionalProperties']);
ok('every tool has a well-formed input_schema', () => {
  for (const tool of TOOLS) {
    const sc = tool.input_schema;
    assert.equal(sc?.type, 'object', `${tool.name}: input_schema.type`);
    assert.equal(typeof sc.properties, 'object', `${tool.name}: properties`);
    for (const k of Object.keys(sc)) assert.ok(SCHEMA_KEYS.has(k), `${tool.name}: stray input_schema key "${k}" (belongs inside properties)`);
    for (const r of sc.required || []) assert.ok(r in sc.properties, `${tool.name}: required "${r}" is not a property`);
  }
});
ok('pattern tools take any instrument instance id (no enum)', () => {
  for (const n of ['save_pattern', 'load_pattern', 'copy_pattern']) {
    const p = byName[n].input_schema.properties.instrument;
    assert.equal(p.enum, undefined, `${n} instrument has an enum`);
    assert.match(p.description, /jb202-2/);
  }
});
ok('add_jb202 and add_jt30 declare bars like add_jt10', () => {
  for (const n of ['add_jb202', 'add_jt30', 'add_jt10']) assert.equal(byName[n].input_schema.properties.bars?.type, 'number', n);
});
ok('show_jb01 exposes instrument inside properties', () => {
  assert.equal(byName.show_jb01.input_schema.properties.instrument?.type, 'string');
  assert.equal(byName.show_jb01.input_schema.instrument, undefined);
});
ok('tweak_jt10 glideTime documented in seconds 0-1', () => {
  assert.match(byName.tweak_jt10.input_schema.properties.glideTime.description, /SECONDS, 0-1/);
  assert.match(byName.tweak_jt10.input_schema.properties.glideTime.description, /50 → 0\.5 s/);
  assert.match(byName.tweak_jt10.description, /glideTime in seconds/);
});
ok('channel insert tools document <instrument>.<voice> targets, no bare voices', () => {
  for (const n of ['add_channel_insert', 'remove_channel_insert']) {
    const p = byName[n].input_schema.properties.channel;
    assert.equal(p.enum, undefined, `${n} channel has an enum`);
    assert.match(p.description, /jt90\.kick/);
    assert.match(p.description, /Never a bare voice name/);
  }
  assert.match(byName.add_effect.input_schema.properties.target.description, /jt90\.kick/);
});
ok('insert presets are documented as eq/filter only', () => {
  for (const n of ['add_channel_insert', 'add_master_insert']) assert.match(byName[n].input_schema.properties.preset.description, /eq and filter only/);
});
ok('set_arrangement schema allows added ids and says bars is a whole number', () => {
  const items = byName.set_arrangement.input_schema.properties.sections.items;
  assert.equal(items.additionalProperties?.type, 'string');
  assert.match(items.properties.bars.description, /whole number/);
});

console.log(`\n${passed} song-tool checks passed${process.exitCode ? ' (with failures)' : ''}`);
