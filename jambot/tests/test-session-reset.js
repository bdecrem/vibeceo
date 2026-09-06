#!/usr/bin/env node
/**
 * Session reset + generic-path validation (G2 fixes).
 *
 *   - create_session truly starts over, IN PLACE: every node's pattern and
 *     params back to factory defaults, added instances gone, saved patterns /
 *     arrangement / automation / effect chains / routing cleared, 2 bars,
 *     swing 0 — and the result serializes identically to a brand-new session.
 *   - tweak / tweak_multi / get_param refuse a voice or param the node does
 *     not have (no dead keys, no "Set …" for a no-op); aliases still resolve;
 *     `<voice>.mute` false actually unmutes.
 *   - automate / clear_automation resolve aliases like tweak and report what
 *     they really did; automate refuses unknown params and effect paths.
 *   - remove_instrument unregisters the instance's effect nodes.
 *   - genre detection ignores bare synth vocabulary (wave, plug, breaks,
 *     minimal) and a specific genre name does not also fire the generic one.
 */
import { strict as assert } from 'node:assert';
import { createSession, serializeSession } from '../core/session.js';
import { renderSessionToBuffer } from '../core/render.js';
import { initializeTools, executeTool } from '../tools/index.js';
import { detectGenres } from '../core/library.js';

await initializeTools();
let passed = 0;
function ok(name, fn) { try { fn(); console.log(`  ✓ ${name}`); passed++; } catch (e) { console.error(`  ✗ ${name}\n    ${e.message}`); process.exitCode = 1; } }
const mono = (n) => Array.from({ length: 16 }, (_, i) => ({ note: n, gate: i % 4 === 0 }));
const hits = (p) => Array.isArray(p)
  ? p.filter(s => s?.gate).length
  : Object.values(p || {}).reduce((n, v) => n + (Array.isArray(v) ? v.filter(s => s?.velocity > 0).length : 0), 0);
const rms = (buffer) => { const d = buffer.getChannelData(0); let t = 0; for (let i = 0; i < d.length; i++) t += d[i] * d[i]; return Math.sqrt(t / d.length); };
const plain = (o) => JSON.parse(JSON.stringify(o));

// ─── create_session ──────────────────────────────────────────────────────────
console.log('\n[1] create_session starts over in place');
const s = createSession({ bpm: 128 });
const identity = s;
await executeTool('add_jb01', { kick: [0, 4, 8, 12] }, s, {});
await executeTool('add_jt90', { kick: [0, 4, 8, 12], ch: [2, 6, 10, 14] }, s, {});
await executeTool('add_jb202', { pattern: mono('C2') }, s, {});
await executeTool('add_jt30', { pattern: mono('A1') }, s, {});
await executeTool('add_jt10', { pattern: mono('E3') }, s, {});
await executeTool('add_instrument', { type: 'jb202' }, s, {});
await executeTool('add_jb202', { instrument: 'jb202-2', pattern: mono('G2') }, s, {});
await executeTool('tweak', { path: 'jt90.kick.decay', value: 90 }, s, {});
await executeTool('tweak', { path: 'jb202.filterCutoff', value: 3000 }, s, {});
await executeTool('tweak', { path: 'jt10.level', value: -12 }, s, {});
await executeTool('tweak_jt90', { swing: 40, accentLevel: 60 }, s, {}).catch(() => {});
await executeTool('add_effect', { target: 'jt30', effect: 'delay', mix: 40 }, s, {});
await executeTool('add_effect', { target: 'master', effect: 'reverb', mix: 20 }, s, {});
await executeTool('automate', { path: 'jt30.cutoff', values: [300, 600, 900, 1200] }, s, {});
await executeTool('save_pattern', { instrument: 'jt90', name: 'A' }, s, {});
await executeTool('save_pattern', { instrument: 'jb202-2', name: 'A' }, s, {});
await executeTool('set_arrangement', { sections: [{ bars: 4, jt90: 'A', 'jb202-2': 'A' }, { bars: 4, jt90: 'A' }] }, s, {});
await executeTool('add_track', { instrument: 'jt90' }, s, {}).catch(() => {});
await executeTool('set_swing', { amount: 30 }, s, {});
s.bars = 8;

const before = await renderSessionToBuffer(s, 2);
ok('the old song renders before the reset', () => { assert.match(before.message, /2 sections/); assert.ok(rms(before.buffer) > 0.01); });

const warns = [];
const origWarn = console.warn;
console.warn = (...a) => warns.push(a.join(' '));
const created = await executeTool('create_session', { bpm: 100 }, s, {});
console.warn = origWarn;

ok('reports the new tempo and what was cleared', () => assert.match(created, /Session created at 100 BPM.*cleared/));
ok('no "unknown parameter" warnings during the reset', () => assert.equal(warns.length, 0, warns.join('\n')));
ok('same session object (the web Studio holds a reference)', () => assert.equal(s, identity));
ok('bpm 100, swing 0, bars 2', () => { assert.equal(s.bpm, 100); assert.equal(s.swing, 0); assert.equal(s.bars, 2); });
ok('every live pattern is empty', () => {
  for (const { id } of s.listInstruments()) assert.equal(hits(s.instrument(id).pattern), 0, `${id} still has hits`);
});
ok('added instance removed', () => { assert.equal(s.instrument('jb202-2'), null); assert.ok(!s.listNodes().includes('jb202-2')); });
ok('params back to defaults', () => {
  const fresh = createSession({ bpm: 100 });
  assert.equal(s.get('jt90.kick.decay'), fresh.get('jt90.kick.decay'));
  assert.equal(s.get('jb202.filterCutoff'), fresh.get('jb202.filterCutoff'));
  assert.equal(s.get('jt10.level'), 0);
  assert.equal(s.jt90Swing, 0);
  assert.equal(s.jt90AccentLevel, 1);
});
ok('saved patterns, arrangement, automation, effects, routing cleared', () => {
  assert.deepEqual(Object.values(s.patterns).map(p => Object.keys(p).length), s.listInstruments().map(() => 0));
  assert.deepEqual(s.arrangement, []);
  assert.deepEqual(s.params.listAutomation(), []);
  assert.deepEqual(Object.keys(s.mixer.effectChains), []);
  assert.deepEqual(s.listNodes().filter(n => n.startsWith('fx.')), []);
  assert.equal(s.routing, undefined);
});
ok('serializes identically to a brand-new session at that BPM', () => {
  assert.deepEqual(plain(serializeSession(s)), plain(serializeSession(createSession({ bpm: 100 }))));
});
const after = await renderSessionToBuffer(s, 2);
ok('render after reset is 2 empty bars', () => { assert.equal(after.bars, 2); assert.deepEqual(after.synths, []); assert.ok(rms(after.buffer) < 1e-6); });
await executeTool('add_jb202', { pattern: mono('C2') }, s, {});
const again = await renderSessionToBuffer(s, 2);
ok('the reset session is fully usable again', () => { assert.match(again.message, /JB202/); assert.ok(rms(again.buffer) > 0.01); });
const bad = await executeTool('create_session', {}, s, {});
ok('create_session without a valid bpm is refused and changes nothing', () => { assert.match(bad, /^Error: bpm/); assert.equal(s.bpm, 100); assert.equal(hits(s.instrument('jb202').pattern), 4); });

// ─── tweak / tweak_multi / get_param ─────────────────────────────────────────
console.log('\n[2] generic paths refuse unknown voices/params, keep aliases');
const t = createSession({ bpm: 128 });
const r1 = await executeTool('tweak', { path: 'jt90.hat.level', value: -6 }, t, {});
ok('unknown voice → error listing the voices', () => assert.match(r1, /^Error: unknown voice "hat" on jt90\. Voices: kick, snare, clap/));
const r2 = await executeTool('tweak', { path: 'jt90.ch.decy', value: 50 }, t, {});
ok('typo\'d param → error listing valid params for that voice', () => assert.match(r2, /^Error: unknown parameter "jt90\.ch\.decy"\. Valid for jt90\.ch: level, tune, decay, tone/));
const r3 = await executeTool('tweak', { path: 'jb01.kick.pitch', value: 3 }, t, {});
ok('jb01 unknown param → error', () => assert.match(r3, /^Error: unknown parameter "jb01\.kick\.pitch"/));
const r4 = await executeTool('tweak', { path: 'jbs.s1.pitch', value: 3 }, t, {});
ok('jbs unknown slot param → error', () => assert.match(r4, /^Error: unknown parameter "jbs\.s1\.pitch"\. Valid for jbs\.s1: level, tune/));
ok('nothing was stored under the bad keys', () => {
  assert.equal(t.getNode('jt90').getParam('hat.level'), undefined);
  assert.equal(t.getNode('jt90').getParam('ch.decy'), undefined);
  assert.equal(t.getNode('jb01').getParam('kick.pitch'), undefined);
});
const a1 = await executeTool('tweak', { path: 'bass.cutoff', value: 2000 }, t, {});
ok('alias bass.cutoff still resolves (→ jb202 filterCutoff)', () => { assert.match(a1, /^Set bass\.cutoff = 2\.0kHz/); assert.ok(Math.abs(t.get('jb202.filterCutoff') - t.get('bass.cutoff')) < 1e-9); });
const a2 = await executeTool('tweak', { path: 'jt30.cutoff', value: 2000 }, t, {});
ok('jt30.cutoff shorthand still resolves', () => assert.match(a2, /^Set jt30\.cutoff = 2\.0kHz/));
const a3 = await executeTool('tweak', { path: 'drums.kick.decay', delta: 10 }, t, {});
ok('delta on an alias path works', () => assert.match(a3, /^Adjusted drums\.kick\.decay by \+10/));
const a4 = await executeTool('tweak', { path: 'jt10.level', value: -6 }, t, {});
ok('node-level level still works', () => { assert.match(a4, /^Set jt10\.level = -6/); assert.equal(t.get('jt10.level'), -6); });
const a5 = await executeTool('tweak', { path: 'jp9000.level', value: -3 }, t, {});
ok('jp9000 (dynamic params) is not over-validated', () => assert.match(a5, /^Set jp9000\.level = -3/));
await executeTool('add_effect', { target: 'jb202', effect: 'delay' }, t, {});
const f1 = await executeTool('tweak', { path: 'fx.jb202.delay1.mix', value: 35 }, t, {});
ok('effect param path works', () => assert.match(f1, /^Set fx\.jb202\.delay1\.mix = 35/));
const f2 = await executeTool('tweak', { path: 'fx.jb202.delay1.mixx', value: 35 }, t, {});
ok('effect typo → error listing its params', () => assert.match(f2, /^Error: unknown parameter "fx\.jb202\.delay1\.mixx"\. Valid for fx\.jb202\.delay1: .*mix/));
const n1 = await executeTool('tweak', { path: 'jb202', value: 1 }, t, {});
ok('a bare node id is not a parameter', () => assert.match(n1, /^Error: "jb202" is a node, not a parameter/));

const m1 = await executeTool('tweak', { path: 'jt90.clap.mute', value: true }, t, {});
ok('mute true silences the voice', () => { assert.match(m1, /^Muted jt90\.clap/); assert.equal(t.get('jt90.clap.level'), 0); });
const m2 = await executeTool('tweak', { path: 'jt90.clap.mute', value: false }, t, {});
ok('mute false actually unmutes (level back to default)', () => {
  assert.match(m2, /^Unmuted jt90\.clap/);
  assert.equal(t.get('jt90.clap.level'), createSession().get('jt90.clap.level'));
});
await executeTool('tweak', { path: 'jb202.mute', value: true }, t, {});
ok('mono node mute drops the node level', () => assert.equal(t.get('jb202.level'), -60));
const m3 = await executeTool('tweak', { path: 'jb202.mute', value: 0 }, t, {});
ok('mono node unmute restores 0 dB', () => { assert.match(m3, /^Unmuted jb202/); assert.equal(t.get('jb202.level'), 0); });
const m4 = await executeTool('tweak', { path: 'fx.jb202.delay1.mute', value: true }, t, {});
ok('effects have no mute', () => assert.match(m4, /^Error: .*effects have no mute/));

const tm = await executeTool('tweak_multi', { params: { 'jt90.hat.level': -6, 'jt90.kick.decay': 50, 'jt90.snare.mute': true } }, t, {});
ok('tweak_multi reports the bad path and applies the rest', () => {
  assert.match(tm, /jt90\.hat\.level: Error: unknown voice "hat"/);
  assert.match(tm, /jt90\.kick\.decay = 50/);
  assert.match(tm, /Muted jt90\.snare/);
  assert.equal(t.get('jt90.snare.level'), 0);
});
const g1 = await executeTool('get_param', { path: 'jt90.hat.level' }, t, {});
ok('get_param unknown voice → error', () => assert.match(g1, /^Error: unknown voice "hat"/));
const g2 = await executeTool('get_param', { path: 'jb01.kick.pitch' }, t, {});
ok('get_param unknown param → error', () => assert.match(g2, /^Error: unknown parameter "jb01\.kick\.pitch"/));
const g3 = await executeTool('get_param', { path: 'bass.cutoff' }, t, {});
ok('get_param alias works', () => assert.match(g3, /^bass\.cutoff = 2\.0kHz/));
const g4 = await executeTool('get_param', { path: 'nope.kick.decay' }, t, {});
ok('get_param unknown node → error', () => assert.match(g4, /^Error: No node for "nope\.kick\.decay"/));

// ─── automation ──────────────────────────────────────────────────────────────
console.log('\n[3] automate / clear_automation resolve aliases and report truthfully');
const a = createSession({ bpm: 128 });
const au1 = await executeTool('automate', { path: 'drums.kick.decay', values: [10, 90] }, a, {});
ok('automate on an alias stores the canonical lane and says so', () => { assert.match(au1, /^jb01 kick\.decay automation set: 2\/2 steps/); assert.deepEqual(a.params.listAutomation(), ['jb01.kick.decay']); });
const cl0 = await executeTool('clear_automation', { path: 'jt10.cutoff' }, a, {});
ok('clearing a lane that does not exist says so', () => { assert.match(cl0, /^No automation found/); assert.equal(a.params.listAutomation().length, 1); });
const cl1 = await executeTool('clear_automation', { path: 'drums.kick.decay' }, a, {});
ok('clear_automation via alias removes the canonical lane', () => { assert.match(cl1, /^Cleared automation on jb01\.kick\.decay/); assert.deepEqual(a.params.listAutomation(), []); });
await executeTool('automate', { path: 'jb01.kick.decay', values: [10, 90] }, a, {});
await executeTool('automate', { path: 'jb01.ch.decay', values: [10, 90] }, a, {});
await executeTool('automate', { path: 'jt90.kick.tune', values: [0, 5] }, a, {});
const cl2 = await executeTool('clear_automation', { path: 'drums' }, a, {});
ok('clear_automation on an alias instrument clears that instrument only', () => { assert.match(cl2, /^Cleared 2 automation lanes under jb01/); assert.deepEqual(a.params.listAutomation(), ['jt90.kick.tune']); });
const au2 = await executeTool('automate', { path: 'jt90.hat.decay', values: [10, 90] }, a, {});
ok('automate refuses an unknown voice', () => { assert.match(au2, /^Error: unknown voice "hat"/); assert.deepEqual(a.params.listAutomation(), ['jt90.kick.tune']); });
await executeTool('add_effect', { target: 'jb202', effect: 'delay' }, a, {});
const au3 = await executeTool('automate', { path: 'fx.jb202.delay1.mix', values: [10, 90] }, a, {});
ok('automate refuses effect paths (render never reads them)', () => assert.match(au3, /^Error: effect parameters can't be automated/));
// legacy: a lane saved under an alias path by an older build is still clearable
a.params.automation.set('bass.filterCutoff', [1, 2]);
const cl3 = await executeTool('clear_automation', { path: 'bass.filterCutoff' }, a, {});
ok('a legacy alias-keyed lane is still cleared', () => { assert.match(cl3, /^Cleared automation on jb202\.filterCutoff/); assert.ok(!a.params.hasAutomation('bass.filterCutoff')); });

// ─── remove_instrument ───────────────────────────────────────────────────────
console.log('\n[4] remove_instrument unregisters the instance\'s effect nodes');
const m = createSession({ bpm: 128 });
await executeTool('add_instrument', { type: 'jb202' }, m, {});
await executeTool('add_effect', { target: 'jb202-2', effect: 'delay', mix: 40 }, m, {});
ok('effect is registered while the instance exists', () => assert.ok(m.listNodes().includes('fx.jb202-2.delay1')));
await executeTool('remove_instrument', { id: 'jb202-2' }, m, {});
ok('no fx.* registration survives the removal', () => assert.deepEqual(m.listNodes().filter(n => n.startsWith('fx.')), []));
const ghost = await executeTool('tweak', { path: 'fx.jb202-2.delay1.mix', value: 50 }, m, {});
ok('tweak on the ghost effect is an error', () => assert.match(ghost, /^Error: No node for "fx\.jb202-2\.delay1\.mix"/));
const rewarn = [];
console.warn = (...x) => rewarn.push(x.join(' '));
await executeTool('add_instrument', { type: 'jb202', id: 'jb202-2' }, m, {});
await executeTool('add_effect', { target: 'jb202-2', effect: 'delay', mix: 40 }, m, {});
console.warn = origWarn;
ok('re-adding the same id + effect does not hit the re-register warning', () => assert.deepEqual(rewarn.filter(w => /re-registered/.test(w)), []));

// ─── genre detection ─────────────────────────────────────────────────────────
console.log('\n[5] genre detection: whole genre names only');
for (const txt of ['use a square wave for the bass', 'plug the hats into the delay', 'keep it minimal', 'add some breaks in the second half', 'make the kick punchier']) {
  ok(`no genre in ${JSON.stringify(txt)}`, () => assert.deepEqual(detectGenres(txt), []));
}
ok('"trap wave" → wave', () => assert.deepEqual(detectGenres('a trap wave beat at 150'), ['wave']));
ok('"pluggnb" → pluggnb', () => assert.deepEqual(detectGenres('pluggnb vibes'), ['pluggnb']));
ok('"breakbeat" / "big beat" → breakbeat', () => { assert.deepEqual(detectGenres('breakbeat please'), ['breakbeat']); assert.deepEqual(detectGenres('some big beat energy'), ['breakbeat']); });
ok('"minimal techno" → minimal_techno only (not also the generic techno default)', () => assert.deepEqual(detectGenres('minimal techno at 126'), ['minimal_techno']));
ok('"tech house" → tech_house only', () => assert.deepEqual(detectGenres('a tech house groove'), ['tech_house']));
ok('"detroit techno" → detroit_techno only', () => assert.deepEqual(detectGenres('detroit techno'), ['detroit_techno']));
ok('bare "techno" still maps to the default', () => assert.deepEqual(detectGenres('techno at 128'), ['berlin_techno']));
ok('"vaporwave" does not leak "wave"', () => assert.deepEqual(detectGenres('vaporwave'), ['vaporwave']));

console.log(`\n${passed} session-reset checks passed${process.exitCode ? ' (with failures)' : ''}`);
