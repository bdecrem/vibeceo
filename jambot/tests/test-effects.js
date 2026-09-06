#!/usr/bin/env node
/**
 * Effects, mixer, routing and render (audit group G6):
 *   - song-mode sidechain ducks to each section's SAVED drum pattern (not the
 *     live node), any drum instance (jt90-2) can trigger it, master-chain
 *     sidechains follow the sections too
 *   - effect targets are validated: bare voices resolve to the drum playing
 *     them, unknown voices / mono-synth voices / unknown names are refused
 *   - rejected or unknown params are reported, never silently dropped
 *   - effect ids never collide after remove_effect
 *   - sends apply their params, are tweakable (tweak_effect + send.<id>.<param>),
 *     and survive serialize/deserialize together with the track routes
 *   - delay/reverb presets load; unknown presets are refused
 *   - track tools resolve instruments, aliases and added instances; solo
 *     silences everything else; mute works through an alias
 */
import { strict as assert } from 'node:assert';
import { createSession, serializeSession, deserializeSession } from '../core/session.js';
import { renderSessionToBuffer } from '../core/render.js';
import { initializeTools, executeTool } from '../tools/index.js';

await initializeTools();
let passed = 0;
function ok(name, fn) { try { fn(); console.log(`  ✓ ${name}`); passed++; } catch (e) { console.error(`  ✗ ${name}\n    ${e.message}`); process.exitCode = 1; } }
const t = (name, input, s) => executeTool(name, input, s, {});
const mono = (n, every = 1) => Array.from({ length: 16 }, (_, i) => ({ note: n, gate: i % every === 0 }));
const ALL16 = Array.from({ length: 16 }, (_, i) => i);
const rms = (d, a = 0, b = d.length) => { let s = 0, n = 0; for (let i = a; i < Math.min(b, d.length); i++) { s += d[i] * d[i]; n++; } return n ? Math.sqrt(s / n) : 0; };
const render = async (s, bars) => { const r = await renderSessionToBuffer(s, bars); return { ...r, L: r.buffer.getChannelData(0), spb: s.clock.samplesPerBar }; };
const diffRms = (x, y) => { let sd = 0; const n = Math.min(x.length, y.length); for (let i = 0; i < n; i++) { const d = x[i] - y[i]; sd += d * d; } return Math.sqrt(sd / n); };

// ---------------------------------------------------------------- sidechain
console.log('\n[sidechain]');
async function sidechainSong(live) {
  const s = createSession({ bpm: 128 });
  await t('add_jt90', { kick: ALL16 }, s); await t('save_pattern', { instrument: 'jt90', name: 'A' }, s);
  await t('add_jt90', { kick: [0] }, s); await t('save_pattern', { instrument: 'jt90', name: 'B' }, s);
  await t('add_jb202', { pattern: mono('C2') }, s); await t('save_pattern', { instrument: 'jb202', name: 'A' }, s);
  await t('tweak', { path: 'jt90.level', value: -60 }, s); // only the bass is measured
  await t('add_sidechain', { target: 'jb202', trigger: 'kick', amount: 1 }, s);
  await t('set_arrangement', { sections: [{ bars: 1, jt90: 'A', jb202: 'A' }, { bars: 1, jt90: 'B', jb202: 'A' }] }, s);
  await t('load_pattern', { instrument: 'jt90', name: live }, s);
  const r = await render(s, 2);
  return { s1: rms(r.L, 0, r.spb), s2: rms(r.L, r.spb, 2 * r.spb) };
}
const liveA = await sidechainSong('A');
const liveB = await sidechainSong('B');
ok(`song mode: section with 16 kicks ducks, section with 1 kick does not (live=A: ${liveA.s1.toFixed(3)} vs ${liveA.s2.toFixed(3)})`, () => assert.ok(liveA.s1 < liveA.s2 * 0.5));
ok(`song mode: same result when the OTHER pattern is loaded live (live=B: ${liveB.s1.toFixed(3)} vs ${liveB.s2.toFixed(3)})`, () => assert.ok(liveB.s1 < liveB.s2 * 0.5));
ok('song mode: the live pattern has no influence at all', () => { assert.ok(Math.abs(liveA.s1 - liveB.s1) < 1e-3); assert.ok(Math.abs(liveA.s2 - liveB.s2) < 1e-3); });

{
  // an added drum instance is a trigger source
  const s = createSession({ bpm: 128 });
  await t('add_instrument', { type: 'jt90', id: 'jt90-2' }, s);
  await t('add_jt90', { instrument: 'jt90-2', kick: ALL16 }, s);
  await t('tweak', { path: 'jt90-2.level', value: -60 }, s);
  await t('add_jb202', { pattern: mono('C2') }, s);
  const before = rms((await render(s, 1)).L);
  await t('add_sidechain', { target: 'jb202', trigger: 'kick', amount: 1 }, s);
  const after = rms((await render(s, 1)).L);
  ok(`loop mode: a kick on jt90-2 (only drum playing) ducks the bass (${before.toFixed(3)} → ${after.toFixed(3)})`, () => assert.ok(after < before * 0.7));
}
{
  // master-chain sidechain in song mode follows the sections
  const s = createSession({ bpm: 128 });
  await t('add_jt90', { kick: ALL16 }, s); await t('save_pattern', { instrument: 'jt90', name: 'A' }, s);
  await t('add_jt90', { kick: [0] }, s); await t('save_pattern', { instrument: 'jt90', name: 'B' }, s);
  await t('add_jb202', { pattern: mono('C2') }, s); await t('save_pattern', { instrument: 'jb202', name: 'A' }, s);
  await t('tweak', { path: 'jt90.level', value: -60 }, s);
  const r0 = await t('add_effect', { target: 'master', effect: 'sidechain', trigger: 'kick', amount: 1 }, s);
  ok('sidechain on master accepted', () => assert.match(r0, /fx\.master\.sidechain1/));
  await t('set_arrangement', { sections: [{ bars: 1, jt90: 'A', jb202: 'A' }, { bars: 1, jt90: 'B', jb202: 'A' }] }, s);
  const r = await render(s, 2);
  const s1 = rms(r.L, 0, r.spb), s2 = rms(r.L, r.spb, 2 * r.spb);
  ok(`master sidechain in song mode ducks per section (${s1.toFixed(3)} vs ${s2.toFixed(3)})`, () => assert.ok(s1 < s2 * 0.5));
}

// ---------------------------------------------------------------- targets
console.log('\n[effect targets]');
{
  const s = createSession({ bpm: 128 });
  await t('add_jb01', { ch: [0, 2, 4, 6, 8, 10, 12, 14] }, s);
  await t('add_jb202', { pattern: mono('C2') }, s);
  await t('add_instrument', { type: 'jb202' }, s);
  const plain = Float32Array.from((await render(s, 1)).L);

  const r1 = await t('add_effect', { target: 'ch', effect: 'filter', mode: 'lowpass', cutoff: 150 }, s);
  ok('bare voice resolves to the drum playing it', () => { assert.match(r1, /fx\.jb01\.ch\.filter1/); assert.ok(s.mixer.effectChains['jb01.ch']); assert.equal(s.mixer.effectChains.ch, undefined); });
  const filtered = (await render(s, 1)).L;
  ok('the resolved voice effect is audible', () => assert.ok(diffRms(plain, filtered) > 1e-3));
  for (const [target, re] of [['jt90.hat', /no voice "hat"/], ['jb202.bass', /no per-voice targets/], ['hats', /unknown effect target "hats"/], ['nope', /unknown effect target/], ['jbs.s1', /no per-voice targets/]]) {
    const r = await t('add_effect', { target, effect: 'filter', cutoff: 200 }, s);
    ok(`"${target}" is refused (${r.slice(0, 40)}…)`, () => { assert.match(r, /^Error/); assert.match(r, re); assert.equal(s.mixer.effectChains[target], undefined); });
  }
  const amb = await t('add_effect', { target: 'kick', effect: 'filter', cutoff: 200 }, s);
  ok('ambiguous bare voice (neither jb01 nor jt90 plays kick) asks which', () => assert.match(amb, /jb01\.kick, jt90\.kick/));
  await t('add_jt90', { kick: [0, 4, 8, 12] }, s);
  const kick = await t('add_effect', { target: 'kick', effect: 'filter', cutoff: 200 }, s);
  ok('bare voice picks the drum that plays it once one does', () => assert.match(kick, /fx\.jt90\.kick\.filter1/));
  const alias = await t('add_effect', { target: 'bass', effect: 'delay', mix: 20 }, s);
  ok('alias resolves to the canonical instrument', () => assert.match(alias, /fx\.jb202\.delay1/));
  const inst = await t('add_effect', { target: 'jb202-2', effect: 'delay', mix: 20 }, s);
  ok('added instance is a valid target', () => assert.match(inst, /fx\.jb202-2\.delay1/));
  const ci = await t('add_channel_insert', { channel: 'ch', effect: 'filter', params: { mode: 'highpass', cutoff: 500 } }, s);
  ok('add_channel_insert replaces the same-type insert on the resolved voice', () => { assert.match(ci, /^Replaced filter/); assert.equal(s.mixer.effectChains['jb01.ch'].length, 1); assert.equal(s.mixer.effectChains['jb01.ch'][0]._node.getParam('mode'), 'highpass'); });
  const sc = await t('add_sidechain', { target: 'nope', trigger: 'kick' }, s);
  ok('add_sidechain refuses an unknown target', () => assert.match(sc, /^Error: unknown effect target/));

  // legacy chain saved under a raw key can still be removed
  const legacy = deserializeSession({ ...JSON.parse(JSON.stringify(serializeSession(createSession({ bpm: 128 })))), mixer: { effectChains: { hats: [{ id: 'filter1', type: 'filter', params: { cutoff: 100 } }] } } });
  const rm = await t('remove_effect', { target: 'hats', effect: 'all' }, legacy);
  ok('legacy chain under a raw key is removable', () => { assert.match(rm, /Removed all 1/); assert.equal(legacy.mixer.effectChains.hats, undefined); });
}

// ---------------------------------------------------------------- params
console.log('\n[param validation]');
{
  const s = createSession({ bpm: 128 });
  await t('add_jb202', { pattern: mono('C2') }, s);
  const r1 = await t('add_sidechain', { target: 'jb202', trigger: 'rimshot', amount: 0.8 }, s);
  ok('JT90-only voice (rimshot) is a valid trigger', () => { assert.match(r1, /ducks when rimshot/); assert.equal(s.mixer.effectChains.jb202[0]._node.getParam('trigger'), 'rimshot'); });
  const r2 = await t('add_sidechain', { target: 'jb202', trigger: 'bogus' }, s);
  ok('bad trigger is an error and adds nothing', () => { assert.match(r2, /^Error: sidechain "trigger" must be one of/); assert.equal(s.mixer.effectChains.jb202.length, 1); });
  const r3 = await t('tweak_effect', { target: 'jb202', effect: 'sidechain', trigger: 'bogus', amount: 0.9 }, s);
  ok('tweak_effect refuses a bad choice and changes nothing', () => { assert.match(r3, /^Error/); assert.equal(s.mixer.effectChains.jb202[0]._node.getParam('amount'), 0.8); });
  const r4 = await t('tweak_effect', { target: 'jb202', effect: 'sidechain', amout: 0.1 }, s);
  ok('tweak_effect refuses an unknown key', () => { assert.match(r4, /unknown param "amout" \(has: trigger, amount, attack, release, hold\)/); assert.equal(s.mixer.effectChains.jb202[0]._node.getParam('amount'), 0.8); });
  const r5 = await t('tweak_effect', { target: 'jb202', effect: 'sidechain', amount: 0.3, trigger: 'snare' }, s);
  ok('valid tweak applies and reports stored values', () => { assert.match(r5, /amount=0.3, trigger=snare/); assert.equal(s.mixer.effectChains.jb202[0]._node.getParam('trigger'), 'snare'); });
  const r6 = await t('add_effect', { target: 'jb202', effect: 'filter', cutof: 100 }, s);
  ok('add_effect refuses a misspelled param and adds nothing', () => { assert.match(r6, /unknown param "cutof"/); assert.equal(s.mixer.effectChains.jb202.length, 1); });
  const r7 = await t('add_effect', { target: 'jb202', effect: 'filter', mix: 30 }, s);
  ok('a delay param on a filter is refused', () => assert.match(r7, /unknown param "mix" \(has: mode, cutoff, resonance\)/));
  const r8 = await t('add_effect', { target: 'jb202', effect: 'delay', mix: 150 }, s);
  ok('out-of-range numbers clamp and report the stored value', () => assert.match(r8, /mix=100/));
}

// ---------------------------------------------------------------- ids
console.log('\n[effect ids]');
{
  const s = createSession({ bpm: 128 });
  await t('add_jt10', { pattern: mono('C3') }, s);
  await t('add_effect', { target: 'jt10', effect: 'delay', mix: 10 }, s);
  await t('add_effect', { target: 'jt10', effect: 'delay', mix: 20 }, s);
  await t('remove_effect', { target: 'jt10', effect: 'delay1' }, s);
  const r = await t('add_effect', { target: 'jt10', effect: 'delay', mix: 30 }, s);
  ok('after removing delay1 the next delay is delay3, not a second delay2', () => { assert.match(r, /fx\.jt10\.delay3/); assert.deepEqual(s.mixer.effectChains.jt10.map(e => e.id), ['delay2', 'delay3']); });
  await t('tweak', { path: 'fx.jt10.delay3.mix', value: 55 }, s);
  ok('tweak by path reaches only the new effect', () => assert.deepEqual(s.mixer.effectChains.jt10.map(e => e._node.getParam('mix')), [20, 55]));
  const rm = await t('remove_effect', { target: 'jt10', effect: 'delay3' }, s);
  ok('remove by id removes just that one', () => { assert.match(rm, /Removed delay3/); assert.deepEqual(s.mixer.effectChains.jt10.map(e => e.id), ['delay2']); });
  const re = await t('add_effect', { target: 'jt10', effect: 'delay', mix: 40 }, s);
  ok('a removed id is free again (max existing + 1)', () => assert.match(re, /fx\.jt10\.delay3/));
  const d = deserializeSession(JSON.parse(JSON.stringify(serializeSession(s))));
  ok('ids survive a reload', () => { assert.deepEqual(d.mixer.effectChains.jt10.map(e => e.id), ['delay2', 'delay3']); assert.ok(d.params.nodes.has('fx.jt10.delay3')); });
}

// ---------------------------------------------------------------- sends
console.log('\n[sends]');
{
  const s = createSession({ bpm: 128 });
  await t('add_jb01', { kick: [0, 4, 8, 12] }, s);
  await t('add_jb202', { pattern: mono('C2', 4) }, s);
  const dry = Float32Array.from((await render(s, 1)).L);
  const r1 = await t('add_send', { id: 'dly', effect: 'delay', time: 750, feedback: 70, mode: 'pingpong' }, s);
  ok('add_send applies its params', () => { assert.match(r1, /time=750, feedback=70, mode=pingpong/); const p = s.routing.sends.get('dly').effectNode.getParams(); assert.equal(p.time, 750); assert.equal(p.feedback, 70); assert.equal(p.mode, 'pingpong'); });
  const r2 = await t('add_send', { id: 'verb', effect: 'reverb', decay: 6, dcay: 1 }, s);
  ok('add_send refuses an unknown param and creates nothing', () => { assert.match(r2, /unknown param "dcay"/); assert.ok(!s.routing.sends.has('verb')); });
  const r3 = await t('add_send', { id: 'jb01', effect: 'reverb' }, s);
  ok('a send cannot take an instrument name', () => assert.match(r3, /^Error/));
  const r4 = await t('add_send', { id: 'verb', effect: 'chorus' }, s);
  ok('unknown send effect is refused (no silent delay fallback)', () => assert.match(r4, /unknown send effect "chorus"/));
  await t('add_send', { id: 'verb', effect: 'reverb', decay: 6 }, s);
  ok('reverb send decay applied', () => assert.equal(s.routing.sends.get('verb').effectNode.getParam('decay'), 6));
  const tw = await t('tweak', { path: 'send.dly.feedback', value: 20 }, s);
  ok('send is addressable as send.<id>.<param>', () => { assert.match(tw, /send\.dly\.feedback = 20/); assert.equal(s.routing.sends.get('dly').effectNode.getParam('feedback'), 20); });
  const te = await t('tweak_effect', { target: 'dly', effect: 'delay', feedback: 25 }, s);
  ok('tweak_effect accepts a send id as target', () => { assert.match(te, /Tweaked send dly/); assert.equal(s.routing.sends.get('dly').effectNode.getParam('feedback'), 25); });
  await t('route', { track: 'jb202', send: 'dly', level: 0.6 }, s);
  const wet = (await render(s, 1)).L;
  ok('routed send changes the mix', () => assert.ok(diffRms(dry, wet) > 1e-3));
  const d = deserializeSession(JSON.parse(JSON.stringify(serializeSession(s))));
  ok('serialize/deserialize keeps send params, level and track routes', () => {
    const p = d.routing.sends.get('dly').effectNode.getParams();
    assert.equal(p.time, 750); assert.equal(p.feedback, 25); assert.equal(p.mode, 'pingpong');
    assert.equal(d.routing.sends.get('dly').level, 1);
    assert.deepEqual(d.routing.tracks.get('jb202').sends, { dly: 0.6 });
  });
  const d2 = await render(d, 1);
  ok('reloaded session renders the send too', () => assert.ok(diffRms(dry, d2.L) > 1e-3));
  // deserializeSession attaches the ParamSystem to the routing, so the send
  // path is live before any routing or mixer tool has run.
  const tw2 = await t('tweak', { path: 'send.dly.time', value: 500 }, d);
  ok('send path works right after reload (no tool call first)', () => assert.match(tw2, /send\.dly\.time = 500/));
  const te2 = await t('tweak_effect', { target: 'verb', effect: 'reverb', decay: 3 }, deserializeSession(JSON.parse(JSON.stringify(serializeSession(s)))));
  ok('tweak_effect on a send works right after reload', () => assert.match(te2, /decay=3/));
}

// ---------------------------------------------------------------- presets
console.log('\n[presets]');
{
  const s = createSession({ bpm: 128 });
  await t('add_jb202', { pattern: mono('C2') }, s);
  const r1 = await t('add_effect', { target: 'master', effect: 'reverb', preset: 'cathedral' }, s);
  ok('reverb preset loads', () => { assert.match(r1, /reverb \(cathedral\)/); const p = s.mixer.effectChains.master[0]._node.getParams(); assert.equal(p.decay, 5); assert.equal(p.size, 90); });
  const r2 = await t('add_effect', { target: 'jb202', effect: 'delay', preset: 'dub' }, s);
  ok('delay preset loads', () => { assert.match(r2, /delay \(dub\)/); const p = s.mixer.effectChains.jb202[0]._node.getParams(); assert.equal(p.time, 500); assert.equal(p.feedback, 70); assert.equal(p.mode, 'analog'); });
  await t('add_effect', { target: 'jb202', effect: 'delay', preset: 'pingpong', feedback: 30 }, s);
  ok('preset mode maps to the choice name; explicit params win over the preset', () => { const p = s.mixer.effectChains.jb202[1]._node.getParams(); assert.equal(p.mode, 'pingpong'); assert.equal(p.feedback, 30); });
  const r3 = await t('add_effect', { target: 'jb202', effect: 'filter', preset: 'dubby' }, s);
  ok('unknown preset is refused with the list', () => { assert.match(r3, /unknown filter preset "dubby" \(have: dubDelay/); assert.equal(s.mixer.effectChains.jb202.length, 2); });
  const r4 = await t('add_effect', { target: 'jb202', effect: 'sidechain', preset: 'pump' }, s);
  ok('effects without presets say so', () => assert.match(r4, /sidechain has no presets/));
  const r5 = await t('add_master_insert', { effect: 'eq', preset: 'nope' }, s);
  ok('add_master_insert refuses an unknown EQ preset', () => assert.match(r5, /unknown eq preset "nope"/));
}

// ---------------------------------------------------------------- routing
console.log('\n[tracks]');
{
  const s = createSession({ bpm: 128 });
  await t('add_jb01', { kick: [0, 4, 8, 12] }, s);
  const lt = await t('list_tracks', {}, s);
  ok('tracks are instruments only (no alias tracks)', () => { assert.doesNotMatch(lt, /drums|bass|lead|synth|sampler/); assert.match(lt, /jb01/); });
  await t('add_instrument', { type: 'jb202' }, s);
  await t('add_jb202', { instrument: 'jb202-2', pattern: mono('E3') }, s);
  const m = await t('mute_track', { track: 'jb202-2' }, s);
  ok('an instance added after routing exists can be muted without add_track', () => assert.match(m, /jb202-2 muted/));
  await t('mute_track', { track: 'jb202-2', mute: false }, s);

  const jb01Only = createSession({ bpm: 128 }); await t('add_jb01', { kick: [0, 4, 8, 12] }, jb01Only);
  const ref = Float32Array.from((await render(jb01Only, 1)).L);
  const jb202Only = createSession({ bpm: 128 }); await t('add_instrument', { type: 'jb202' }, jb202Only); await t('add_jb202', { instrument: 'jb202-2', pattern: mono('E3') }, jb202Only);
  const ref2 = Float32Array.from((await render(jb202Only, 1)).L);

  await t('solo_track', { track: 'jb01' }, s);
  const solo = (await render(s, 1)).L;
  ok('solo silences instruments that have no soloed track', () => assert.ok(diffRms(solo, ref) < rms(ref) * 0.01));
  await t('solo_track', { track: 'jb01', solo: false }, s);
  const md = await t('mute_track', { track: 'drums', mute: true }, s);
  const muted = (await render(s, 1)).L;
  ok('mute through an alias mutes the instrument', () => { assert.match(md, /jb01 muted/); assert.ok(diffRms(muted, ref2) < rms(ref2) * 0.01); });
  await t('mute_track', { track: 'jb01', mute: false }, s);
  const sd = await t('solo_track', { track: 'drums' }, s);
  const solo2 = (await render(s, 1)).L;
  ok('solo through an alias', () => { assert.match(sd, /jb01 soloed/); assert.ok(diffRms(solo2, ref) < rms(ref) * 0.01); });
  const bad = await t('mute_track', { track: 'nothing' }, s);
  ok('unknown track is an error listing tracks', () => assert.match(bad, /doesn't exist\. Tracks: jb01/));
  const rt = await t('route', { track: 'bass', send: 'x' }, s);
  ok('route resolves the alias before checking the send', () => assert.match(rt, /Send "x" doesn't exist/));

  // legacy alias tracks from a saved session don't start applying
  const d = deserializeSession({ ...JSON.parse(JSON.stringify(serializeSession(jb01Only))), routing: { tracks: { jb01: { nodeId: 'jb01', volume: 0, mute: false, solo: false, pan: 0, sends: {}, inserts: [] }, drums: { nodeId: 'drums', volume: 0, mute: true, solo: false, pan: 0, sends: {}, inserts: [] } }, sends: {}, master: { volume: 0.8, inserts: [] } } });
  const legacy = (await render(d, 1)).L;
  ok('a stale legacy alias track (drums muted) is shadowed by the instrument track', () => assert.ok(diffRms(legacy, ref) < rms(ref) * 0.01));
}

console.log(`\n${passed} effects/routing checks passed${process.exitCode ? ' (with failures)' : ''}`);
