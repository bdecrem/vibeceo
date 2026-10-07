#!/usr/bin/env node
/**
 * Drive law + gain-staging tests (2026-10-06).
 *
 * The shared Drive's soft-clip curve ((π+k)x/(π+k|x|), k = amount/2) is a gain
 * stage first: ×5 at drive 25, ×11 at 62, into a ceiling of ~1.25. Every patch
 * "proven" on it carries that gain, so it stays as LAW 1 and every session
 * saved before today keeps it bit for bit (hashes below were taken BEFORE the
 * change). New sessions get LAW 2 (session.driveLaw = 2): pre-gain into tanh
 * with √g makeup, so `drive` changes timbre at roughly constant loudness, and
 * the JT30's +20 accent drive scales with the knob instead of firing at drive 0.
 *
 * Also here: `level` automation lanes are dB offsets from the instrument's
 * level (0 = the fader, so a fade survives gain staging), the render message carries a per-stem readout, the
 * automate / save_pattern messages say what a lane does, and the library
 * context emits mills_minimal's blueprint, rules and exemplars.
 */
import { strict as assert } from 'node:assert';
import { createHash } from 'node:crypto';
import { createSession, serializeSession, deserializeSession, restoreSessionInPlace } from '../core/session.js';
import { renderSessionToBuffer } from '../core/render.js';
import { initializeTools, executeTool } from '../tools/index.js';
import { buildSessionContext } from '../core/status.js';
import { audioBufferToWav } from '../core/wav.js';
import { detectLibraryKeys, buildLibraryContext } from '../core/library.js';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
await initializeTools();
let passed = 0;
function ok(name, fn) {
  try { fn(); console.log(`  ✓ ${name}`); passed++; }
  catch (e) { console.error(`  ✗ ${name}\n    ${e.message}`); process.exitCode = 1; }
}
const okAsync = async (name, fn) => { try { await fn(); console.log(`  ✓ ${name}`); passed++; } catch (e) { console.error(`  ✗ ${name}\n    ${e.message}`); process.exitCode = 1; } };

// The Overclock acid line in E (a 16-step 303 line with two rests), one slide.
const SEQ = [0, 0, 12, 0, 3, null, 15, 7, 0, 10, 0, 12, 3, null, 7, 19], ACC = [1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 0, 1, 1];
const NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const nn = (m) => `${NAMES[m % 12]}${Math.floor(m / 12) - 1}`;
const line = (opts = {}) => SEQ.map((x, i) => x === null
  ? { note: 'E2', gate: false, accent: false, slide: false }
  : { note: nn(40 + x), gate: true, accent: opts.accent ?? !!ACC[i], slide: opts.slide ?? i === 7 });
const two = (l) => [...l.map(s => ({ ...s })), ...l.map(s => ({ ...s }))];

async function solo(s, keep) { for (const { id } of s.listInstruments()) if (!keep.includes(id)) await executeTool('mute_track', { track: id, mute: true }, s, {}); }
const wavHash = (buffer) => createHash('sha1').update(Buffer.from(audioBufferToWav(buffer)).subarray(44)).digest('hex').slice(0, 12);
function rmsDb(buffer) {
  let s = 0, n = 0;
  for (let c = 0; c < buffer.numberOfChannels; c++) { const d = buffer.getChannelData(c); for (let i = 0; i < d.length; i++) s += d[i] * d[i]; n += d.length; }
  return 20 * Math.log10(Math.sqrt(s / n) || 1e-9);
}
const SUB62 = { 'jb202.osc1Waveform': 'triangle', 'jb202.osc2Waveform': 'sine', 'jb202.osc1Level': 55, 'jb202.osc2Level': 100, 'jb202.filterCutoff': 120, 'jb202.filterResonance': 0, 'jb202.filterEnvAmount': 60, 'jb202.filterDecay': 47, 'jb202.ampDecay': 72, 'jb202.ampSustain': 60, 'jb202.ampRelease': 15, 'jb202.drive': 62 };
const ACID131 = { 'jt30.bass.cutoff': 300, 'jt30.bass.resonance': 70, 'jt30.bass.envMod': 35, 'jt30.bass.decay': 30, 'jt30.bass.accent': 60, 'jt30.bass.drive': 25 };

// ---------------------------------------------------------------------------
console.log('\nLaw 1 is bit-identical to the engine before the law existed');
// Hashes of the 16-bit WAV data rendered on 2026-10-06 before any of this landed.
const LEGACY = [
  ['jt30 default', '045c60e4e467', async (s) => { await executeTool('add_jt30', { pattern: two(line()), bars: 2 }, s, {}); return ['jt30', 2]; }],
  ['jt30 Minimal-131 patch (drive 25)', 'f5244ccd97ea', async (s) => { await executeTool('add_jt30', { pattern: two(line()), bars: 2 }, s, {}); await executeTool('tweak_multi', { params: ACID131 }, s, {}); return ['jt30', 2]; }],
  ['jb202 default', '633cf7005d73', async (s) => { await executeTool('add_jb202', { pattern: two(line()) }, s, {}); return ['jb202', 2]; }],
  ['jb202 sub (drive 62)', '7f90d10a4ad0', async (s) => { await executeTool('add_jb202', { pattern: two(line()) }, s, {}); await executeTool('tweak_multi', { params: SUB62 }, s, {}); return ['jb202', 2]; }],
  ['jt10 default', '3aed1b8737cd', async (s) => { await executeTool('add_jt10', { pattern: two(line()) }, s, {}); return ['jt10', 2]; }],
  ['jp9000 basic preset', '3ea29e30c04b', async (s) => { await executeTool('add_jp9000', { preset: 'basic' }, s, {}); await executeTool('add_jp9000_pattern', { pattern: line() }, s, {}); return ['jp9000', 2]; }],
  ['jb01 kit', '2b2bffc2761a', async (s) => { await executeTool('add_jb01', { kick: [0, 4, 8, 12], snare: [4, 12], ch: [2, 6, 10, 14], oh: [14] }, s, {}); return ['jb01', 2]; }],
];
for (const [name, hash, build] of LEGACY) {
  await okAsync(`${name} → ${hash}`, async () => {
    const s = createSession({ bpm: 128, driveLaw: 1 });
    const [id, bars] = await build(s);
    await solo(s, [id]);
    const r = await renderSessionToBuffer(s, bars);
    assert.equal(wavHash(r.buffer), hash, `got ${wavHash(r.buffer)} (${r.message})`);
  });
}
await okAsync("Bart's techno-128 base (no engine field) → d71c69304581 on load", async () => {
  const base = JSON.parse(readFileSync(join(__dirname, '..', '..', '..', 'hilma', 'scripts', 'jam', 'songs', 'techno-128-base.json'), 'utf8'));
  const s = deserializeSession(base);
  assert.equal(s.driveLaw, 1);
  const r = await renderSessionToBuffer(s, 4);
  assert.equal(wavHash(r.buffer), 'd71c69304581', r.message);
});

// ---------------------------------------------------------------------------
console.log('\nThe law lives on the session');
ok('a new session is on law 2', () => assert.equal(createSession({ bpm: 128 }).driveLaw, 2));
ok('createSession({ driveLaw: 1 }) is honoured', () => assert.equal(createSession({ driveLaw: 1 }).driveLaw, 1));
ok('serialize writes engine.driveLaw', () => assert.equal(serializeSession(createSession()).engine.driveLaw, 2));
ok('a save without engine.driveLaw loads on law 1', () => { const d = serializeSession(createSession()); delete d.engine; assert.equal(deserializeSession(d).driveLaw, 1); });
ok('a law-2 save round-trips', () => assert.equal(deserializeSession(serializeSession(createSession())).driveLaw, 2));
ok('restoreSessionInPlace follows the save', () => { const s = createSession(); const d = serializeSession(createSession()); delete d.engine; restoreSessionInPlace(s, d); assert.equal(s.driveLaw, 1); restoreSessionInPlace(s, serializeSession(createSession())); assert.equal(s.driveLaw, 2); });
ok('the agent context names the legacy law only on law-1 tracks', () => {
  assert.match(buildSessionContext(createSession({ driveLaw: 1 })), /legacy drive law/);
  assert.doesNotMatch(buildSessionContext(createSession()), /legacy drive law/);
});

// ---------------------------------------------------------------------------
console.log('\nLaw 2: drive is timbre, not volume');
async function acidRms(law, drive, extra = {}) {
  const s = createSession({ bpm: 128, driveLaw: law });
  await executeTool('add_jt30', { pattern: two(line(extra)), bars: 2 }, s, {});
  await executeTool('tweak_multi', { params: { ...ACID131, 'jt30.bass.drive': drive } }, s, {});
  await solo(s, ['jt30']);
  return rmsDb((await renderSessionToBuffer(s, 2)).buffer);
}
const v2 = {}; for (const d of [0, 25, 50, 100]) v2[d] = await acidRms(2, d);
const v1 = {}; for (const d of [0, 25, 100]) v1[d] = await acidRms(1, d);
ok(`law 2 keeps the acid line within 6 dB across the knob (${Object.entries(v2).map(([d, v]) => `${d}: ${v.toFixed(1)}`).join(', ')})`, () => {
  const vals = Object.values(v2); assert.ok(Math.max(...vals) - Math.min(...vals) < 6);
});
ok(`law 1 lifts it by 6 dB or more (${v1[0].toFixed(1)} → ${v1[100].toFixed(1)})`, () => assert.ok(v1[100] - v1[0] >= 6));
ok('at drive 25 law 2 is quieter than law 1', () => assert.ok(v2[25] < v1[25] - 3));
const accOn = await acidRms(2, 0, { accent: true }), accOff = await acidRms(2, 0, { accent: false });
const accOn1 = await acidRms(1, 0, { accent: true }), accOff1 = await acidRms(1, 0, { accent: false });
ok(`law 2, drive 0: accents add under 5 dB (${(accOn - accOff).toFixed(1)}); law 1 added ${(accOn1 - accOff1).toFixed(1)}`, () => { assert.ok(accOn - accOff < 5); assert.ok(accOn - accOff > 0); assert.ok(accOn1 - accOff1 > accOn - accOff); });

// ---------------------------------------------------------------------------
console.log('\nlevel lanes are dB offsets from the fader');
for (const [inst, add] of [['jb202', (s) => executeTool('add_jb202', { pattern: two(line()) }, s, {})], ['jt30', (s) => executeTool('add_jt30', { pattern: two(line()), bars: 2 }, s, {})], ['jt10', (s) => executeTool('add_jt10', { pattern: two(line()) }, s, {})]]) {
  await okAsync(`${inst}: a lane at 0 is unity, -6 is 6 dB quieter, whatever the fader says`, async () => {
    const render = async (lane) => {
      const s = createSession({ bpm: 128 }); await add(s); await executeTool('tweak', { path: `${inst}.level`, value: -6 }, s, {}); await solo(s, [inst]);
      if (lane != null) await executeTool('automate', { path: `${inst}.level`, values: Array(32).fill(lane) }, s, {});
      return rmsDb((await renderSessionToBuffer(s, 2)).buffer);
    };
    const plain = await render(null), same = await render(0), down = await render(-6);
    assert.ok(Math.abs(same - plain) < 0.2, `lane at 0: ${same.toFixed(2)} vs ${plain.toFixed(2)}`);
    assert.ok(Math.abs((plain - down) - 6) < 0.3, `lane 6 dB under: ${(plain - down).toFixed(2)} dB quieter`);
  });
}

// ---------------------------------------------------------------------------
console.log('\nWhat the agent is told');
await okAsync('render message carries a per-stem readout and the result carries stems', async () => {
  const s = createSession({ bpm: 128 });
  await executeTool('add_jt90', { kick: [0, 4, 8, 12], ch: [2, 6, 10, 14] }, s, {});
  await executeTool('add_jt30', { pattern: line(), bars: 1 }, s, {});
  const r = await renderSessionToBuffer(s, 2);
  assert.match(r.message, /Stems: .*jt90 -?\d+\.\d dBFS crest \d+ dB/);
  assert.match(r.message, /jt30 -?\d+\.\d dBFS crest \d+ dB/);
  assert.ok(r.stems.jt30.crestDb > 5 && r.stems.jt90.crestDb > 8, JSON.stringify(r.stems));
});
await okAsync('a squashed stem gets the hint; a sustained drone reads as crest under 5 dB', async () => {
  const s = createSession({ bpm: 128 });
  await executeTool('add_jb202', { pattern: Array.from({ length: 16 }, (_, i) => ({ note: 'E1', gate: true, accent: false, slide: i > 0 })) }, s, {});
  await executeTool('tweak_multi', { params: { 'jb202.ampSustain': 100, 'jb202.filterEnvAmount': 0, 'jb202.filterCutoff': 400, 'jb202.drive': 0 } }, s, {});
  const r = await renderSessionToBuffer(s, 1);
  assert.ok(r.stems.jb202.crestDb < 6, `drone crest ${r.stems.jb202.crestDb}`);
  assert.match(r.message, /crest under 5 dB/);
});
await okAsync('automate says the lane stays live; save_pattern lists captured lanes', async () => {
  const s = createSession({ bpm: 128 });
  await executeTool('add_jb202', { pattern: two(line()) }, s, {});
  const au = await executeTool('automate', { path: 'jb202.level', values: Array(32).fill(-10) }, s, {});
  assert.match(au, /stays live until clear_automation/);
  assert.match(au, /dB offsets from the instrument's level: 0 = the fader/);
  const sv = await executeTool('save_pattern', { instrument: 'jb202', name: 'IN' }, s, {});
  assert.match(sv, /automation: level 32 steps/);
  await executeTool('clear_automation', { path: 'jb202.level' }, s, {});
  const sv2 = await executeTool('save_pattern', { instrument: 'jb202', name: 'D' }, s, {});
  assert.doesNotMatch(sv2, /automation:/);
});

// ---------------------------------------------------------------------------
console.log('\nLibrary: mills_minimal is back in the checkout');
ok("'minimal techno' resolves to mills_minimal", () => assert.deepEqual(detectLibraryKeys('a minimal techno track at 130'), ['mills_minimal']));
ok('its context carries the blueprint, rules and exemplars', () => {
  const ctx = buildLibraryContext(['mills_minimal']);
  assert.match(ctx, /Arrangement blueprint:/); assert.match(ctx, /Rules:\n- /); assert.match(ctx, /Exemplars \(built with these exact tool calls\): .*minimal-130/);
});

console.log(`\n${passed} passed${process.exitCode ? ', with failures' : ''}`);
