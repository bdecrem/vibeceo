#!/usr/bin/env node
/**
 * Mono synths (JB202 / JT30 / JT10) — behaviour tests for the 2026-09-05 audit.
 *
 * Renders real audio and asserts on the signal, because every bug here shipped
 * with all architecture tests green:
 *   - JB202 osc1Octave/osc2Octave: stored cents, engine semitones (-12 st was a
 *     DC thump instead of a sub octave); tweak_jb202 / kits / legacy saves
 *   - tweak_jb202 mute / level / levelDelta acted on a param that doesn't exist
 *   - add_jb202 truncated multi-bar patterns and accepted garbage note names
 *   - JT10 automation was a silent no-op; alias lanes (jt30.filterCutoff,
 *     jb202.cutoff) were dropped at render
 *   - JT30/JT10 deserialize skipped choice coercion (waveform 0 = render failure)
 *   - mute=false left the instrument muted; all-rest multi-bar patterns lost
 *     their length on reload; JT30 ampDecay aliased onto the FILTER decay
 *   - JT10 null-default filter env params showed as 0 (phantom Controls fader)
 *   - status.js formatted 'seconds' as an integer knob
 *   - engines: no swing, per-step Math.floor drift (bar ≠ clock.samplesPerBar),
 *     release tails hard-cut at the pattern end, automation lanes wrapped at
 *     the pattern length, JB202 cutoff knob dead above 5.5 kHz
 */
import { strict as assert } from 'node:assert';
import { writeFileSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createSession, serializeSession, deserializeSession } from '../core/session.js';
import { renderSessionToBuffer } from '../core/render.js';
import { initializeTools, executeTool } from '../tools/index.js';
import { describeSession, readProducerValue, formatProducerValue, buildSessionContext } from '../core/status.js';
import { toEngine, fromEngine, formatValue } from '../params/converters.js';
import { audioBufferToWav } from '../core/wav.js';
import { spectralAnalyzer } from '../effects/spectral-analyzer.js';

await initializeTools();
let passed = 0;
function ok(name, fn) {
  try { fn(); console.log(`  ✓ ${name}`); passed++; }
  catch (e) { console.error(`  ✗ ${name}\n    ${e.message}`); process.exitCode = 1; }
}

// ---- helpers ---------------------------------------------------------------
const mono = (note, every = 4, len = 16) =>
  Array.from({ length: len }, (_, i) => ({ note, gate: i % every === 0, accent: false, slide: false }));
const tool = (s, name, input) => executeTool(name, input, s, {});
const chan = async (s, bars = 1) => Float32Array.from((await renderSessionToBuffer(s, bars)).buffer.getChannelData(0));
const rms = (x, a = 0, b = x.length) => { let t = 0, n = 0; for (let i = a; i < Math.min(b, x.length); i++) { t += x[i] * x[i]; n++; } return Math.sqrt(t / Math.max(n, 1)); };
/** RMS of the first difference — high-frequency energy, i.e. "brightness". */
const hfRms = (x, a, b) => { let t = 0, n = 0; for (let i = Math.max(a, 1); i < Math.min(b, x.length); i++) { const d = x[i] - x[i - 1]; t += d * d; n++; } return Math.sqrt(t / Math.max(n, 1)); };
const zc = (x, a, b) => { let n = 0; for (let i = a + 1; i < Math.min(b, x.length); i++) if ((x[i - 1] < 0) !== (x[i] < 0)) n++; return n; };
const maxDiff = (a, b) => { let m = 0; for (let i = 0; i < Math.min(a.length, b.length); i++) m = Math.max(m, Math.abs(a[i] - b[i])); return m; };
const firstOnset = (x, from = 0, thr = 0.01) => { for (let i = from; i < x.length; i++) if (Math.abs(x[i]) > thr) return i; return -1; };
const hasNaN = (x) => { for (let i = 0; i < x.length; i++) if (!Number.isFinite(x[i])) return true; return false; };

// =============================================================================
console.log('\n[1] JB202 osc2Octave: cents stored, semitones at the engine');
// osc1 off, osc2 sine, filter wide open and static, held note → count zero
// crossings of the fundamental. C2 = 65.4 Hz; one octave down halves them.
async function sineOctaveRender(setup) {
  const s = createSession({ bpm: 128 });
  await tool(s, 'add_jb202', { pattern: mono('C2') });
  await tool(s, 'tweak_multi', { params: {
    'jb202.osc1Level': 0, 'jb202.osc2Waveform': 'sine', 'jb202.filterCutoff': 16000,
    'jb202.filterEnvAmount': 0, 'jb202.ampSustain': 100, 'jb202.ampRelease': 0, 'jb202.drive': 0,
  } });
  await setup(s);
  const x = await chan(s, 1);
  const win = Math.floor(s.clock.samplesPerStep * 0.8);
  return { s, zc: zc(x, 200, 200 + win), stored: s.get('jb202.bass.osc2Octave'), shown: await tool(s, 'get_param', { path: 'jb202.osc2Octave' }) };
}
{
  const base = await sineOctaveRender(async () => {});
  const half = (r, label) => ok(`${label}: fundamental halves (${r.zc} vs ${base.zc} zero crossings)`, () => {
    assert.ok(Math.abs(r.zc - base.zc / 2) <= 1, `expected ≈${base.zc / 2}, got ${r.zc}`);
  });
  ok(`baseline C2 sine has a fundamental (${base.zc} zero crossings in 0.8 step)`, () => assert.ok(base.zc >= 10));

  const gen = await sineOctaveRender(s => tool(s, 'tweak', { path: 'jb202.osc2Octave', value: -12 }));
  half(gen, 'generic tweak osc2Octave -12');
  ok('generic tweak stores cents (-1200) and reads back -12st', () => { assert.equal(gen.stored, -1200); assert.match(gen.shown, /-12st/); });

  const dep = await sineOctaveRender(s => tool(s, 'tweak_jb202', { osc2Octave: -12 }));
  half(dep, 'tweak_jb202 osc2Octave -12');
  ok('tweak_jb202 stores cents (-1200) and reads back -12st', () => { assert.equal(dep.stored, -1200); assert.match(dep.shown, /-12st/); });

  const up = await sineOctaveRender(s => tool(s, 'tweak', { path: 'jb202.osc2Octave', value: 12 }));
  ok(`osc2Octave +12 doubles the fundamental (${up.zc} vs ${base.zc})`, () => assert.ok(Math.abs(up.zc - base.zc * 2) <= 2));

  const auto = await sineOctaveRender(s => tool(s, 'automate', { path: 'jb202.osc2Octave', values: Array(16).fill(-12) }));
  half(auto, 'automate osc2Octave [-12 × 16]');

  const kitS = createSession({ bpm: 128 });
  await tool(kitS, 'load_jb202_kit', { kit: 'ember' });   // library preset: osc2Octave -12 (raw semitones)
  ok('load_jb202_kit ember stores cents and reads -12st', async () => {});
  assert.equal(kitS.get('jb202.bass.osc2Octave'), -1200);
  assert.match(await tool(kitS, 'get_param', { path: 'jb202.osc2Octave' }), /-12st/);

  // Legacy track: tweak_jb202 / kit loads used to store raw semitones
  const legacy = await sineOctaveRender(s => {
    const data = JSON.parse(JSON.stringify(serializeSession(s)));
    data.params.nodes.jb202.params['bass.osc2Octave'] = -12;
    const d = deserializeSession(data);
    // swap the rendered session's node state for the deserialized one
    s.params.deserialize(serializeSession(d).params);
  });
  half(legacy, 'deserialize migrates legacy -12 semitones');
  ok('legacy -12 is stored as -1200 after deserialize', () => assert.equal(legacy.stored, -1200));

  // Song mode: saved patterns hold raw engine values (legacy -12 or cents -1200)
  for (const saved of [-12, -1200]) {
    const song = await sineOctaveRender(async s => {
      await tool(s, 'save_pattern', { instrument: 'jb202', name: 'A' });
      s.patterns.jb202.A.params.osc2Octave = saved;
      await tool(s, 'set_arrangement', { sections: [{ bars: 1, jb202: 'A' }] });
    });
    half(song, `song mode saved osc2Octave=${saved}`);
  }

  ok('a fractional-cent value is left alone (12.5 cents stays 12.5)', () => {
    const s = createSession(); s._nodes.jb202.setParam('bass.osc2Octave', 12.5);
    assert.equal(s.get('jb202.bass.osc2Octave'), 12.5);
    assert.equal(s._nodes.jb202.getEngineParams().osc2Octave, 0.125);
  });
}

// =============================================================================
console.log('\n[2] tweak_jb202 mute / level / levelDelta / rejected values');
{
  const s = createSession({ bpm: 128 });
  await tool(s, 'add_jb202', { pattern: mono('C2') });
  const loud = rms(await chan(s));
  const m = await tool(s, 'tweak_jb202', { mute: true });
  const quiet = rms(await chan(s));
  ok('mute:true sets the node level to -60 dB and silences the render', () => {
    assert.match(m, /muted/); assert.equal(s._nodes.jb202.getLevel(), -60); assert.ok(quiet < loud * 0.01, `${quiet} vs ${loud}`);
  });
  const u = await tool(s, 'tweak_jb202', { mute: false });
  ok('mute:false restores the level', () => { assert.match(u, /unmuted/); assert.equal(s._nodes.jb202.getLevel(), 0); });
  await tool(s, 'tweak_jb202', { level: -30 });
  ok('level:-30 → node level -30 dB', () => assert.equal(s._nodes.jb202.getLevel(), -30));
  const r = await tool(s, 'tweak_jb202', { levelDelta: -10 });
  ok('levelDelta:-10 → -40 dB and says so', () => { assert.equal(s._nodes.jb202.getLevel(), -40); assert.match(r, /-40dB \(was -30dB, -10\)/); });
  const w = await tool(s, 'tweak_jb202', { osc1Waveform: 'saw' });
  ok('rejected waveform is reported as an error, not success', () => { assert.match(w, /Error: osc1Waveform="saw" rejected/); assert.equal(s.get('jb202.osc1Waveform'), 'sawtooth'); });
  const good = await tool(s, 'tweak_jb202', { osc1Waveform: 'square', filterCutoff: 800 });
  ok('valid values still apply', () => { assert.doesNotMatch(good, /Error/); assert.equal(s.get('jb202.osc1Waveform'), 'square'); });
}

// =============================================================================
console.log('\n[3] add_jb202: pattern length and note names');
{
  const s = createSession({ bpm: 128 });
  const r32 = await tool(s, 'add_jb202', { pattern: mono('C2', 4, 32) });
  ok('32-step pattern without bars becomes 2 bars', () => { assert.match(r32, /8 notes \(2 bars\)/); assert.equal(s.instrument('jb202').pattern.length, 32); });
  const rBad = await tool(s, 'add_jb202', { pattern: mono('C2', 4, 32), bars: 1 });
  ok('bars shorter than the pattern is an error, pattern untouched', () => { assert.match(rBad, /^Error: pattern has 32 steps but bars=1/); assert.equal(s.instrument('jb202').pattern.length, 32); });
  const r4 = await tool(s, 'add_jb202', { pattern: mono('C2', 8), bars: 4 });
  ok('explicit bars pads the pattern', () => { assert.match(r4, /4 bars/); assert.equal(s.instrument('jb202').pattern.length, 64); });
  const notes = await tool(s, 'add_jb202', { pattern: [{ note: 'DB2', gate: true }, { note: 'C', gate: true }, { note: 'H2', gate: true }, { note: ' e2 ', gate: true }] });
  ok('unparseable notes are an error naming the steps', () => { assert.match(notes, /^Error: unparseable note name/); assert.match(notes, /step 1 \("C"\)/); assert.match(notes, /step 2 \("H2"\)/); assert.doesNotMatch(notes, /step 0|step 3/); });
  await tool(s, 'add_jb202', { pattern: [{ note: 'DB2', gate: true }, { note: 'bb1', gate: true }, { note: ' e2 ', gate: true }, { note: 'F#2', gate: true }] });
  ok('note names are canonicalised (DB2→Db2, bb1→Bb1, " e2 "→E2)', () => {
    assert.deepEqual(s.instrument('jb202').pattern.slice(0, 4).map(p => p.note), ['Db2', 'Bb1', 'E2', 'F#2']);
  });
}

// =============================================================================
console.log('\n[4] automation reaches the engine: JT10, alias paths, multi-bar lanes');
{
  const s = createSession({ bpm: 128 });
  await tool(s, 'add_jt10', { pattern: mono('A2', 1) });
  await tool(s, 'tweak', { path: 'jt10.cutoff', value: 300 });
  const a = await chan(s);
  await tool(s, 'automate', { path: 'jt10.lead.cutoff', values: Array(16).fill(12000) });
  const b = await chan(s);
  ok('JT10 cutoff lane changes the loop render', () => assert.ok(maxDiff(a, b) > 0.1, `maxDiff ${maxDiff(a, b)}`));
  await tool(s, 'save_pattern', { instrument: 'jt10', name: 'A' });
  await tool(s, 'set_arrangement', { sections: [{ bars: 1, jt10: 'A' }] });
  const c = await chan(s);
  await tool(s, 'clear_automation', {});
  await tool(s, 'save_pattern', { instrument: 'jt10', name: 'A' });
  const d = await chan(s);
  ok('JT10 saved-pattern lane changes the song render', () => assert.ok(maxDiff(c, d) > 0.1, `maxDiff ${maxDiff(c, d)}`));
  await tool(s, 'clear_arrangement', {});
  await tool(s, 'automate', { path: 'jt10.filterCutoff', values: Array(16).fill(12000) });
  ok('JT10 alias lane (filterCutoff) is applied', async () => {});
  assert.ok(maxDiff(a, await chan(s)) > 0.1, 'jt10 alias lane had no effect');

  const t = createSession({ bpm: 128 });
  await tool(t, 'add_jt30', { pattern: mono('A1', 1) });
  await tool(t, 'tweak', { path: 'jt30.cutoff', value: 200 });
  const ta = await chan(t);
  await tool(t, 'automate', { path: 'jt30.filterCutoff', values: Array(16).fill(5000) });
  ok('JT30 alias lane (filterCutoff → cutoff) is applied', async () => {});
  assert.ok(maxDiff(ta, await chan(t)) > 0.1, 'jt30 alias lane had no effect');

  const j = createSession({ bpm: 128 });
  await tool(j, 'add_jb202', { pattern: mono('C2', 1) });
  await tool(j, 'tweak', { path: 'jb202.filterCutoff', value: 200 });
  const ja = await chan(j);
  await tool(j, 'automate', { path: 'jb202.cutoff', values: Array(16).fill(5000) });
  ok('JB202 alias lane (cutoff → filterCutoff) is applied', async () => {});
  assert.ok(maxDiff(ja, await chan(j)) > 0.1, 'jb202 alias lane had no effect');

  // A 32-value lane over a 16-step pattern must sweep across two bars
  for (const [id, add, note] of [['jb202', 'add_jb202', 'C2'], ['jt30', 'add_jt30', 'A1'], ['jt10', 'add_jt10', 'A2']]) {
    const m = createSession({ bpm: 128 });
    await tool(m, add, { pattern: mono(note, 1) });
    if (id === 'jb202') await tool(m, 'tweak', { path: 'jb202.filterEnvAmount', value: 0 });
    else await tool(m, 'tweak', { path: `${id}.envMod`, value: 0 });
    await tool(m, 'automate', { path: `${id}.cutoff`, values: [...Array(16).fill(150), ...Array(16).fill(8000)] });
    const x = await chan(m, 2);
    const spb = m.clock.samplesPerBar;
    const b1 = hfRms(x, 0, spb), b2 = hfRms(x, spb, 2 * spb);
    ok(`${id}: 32-step lane over a 16-step pattern sweeps across bars (bar1 hf ${b1.toExponential(2)}, bar2 ${b2.toExponential(2)})`, () => assert.ok(b2 > b1 * 3));
  }
}

// =============================================================================
console.log('\n[5] deserialize: choice coercion, all-rest pattern length');
{
  const s = createSession({ bpm: 128 });
  await tool(s, 'add_jt30', { pattern: mono('A1') });
  await tool(s, 'add_jt10', { pattern: mono('A2') });
  const data = JSON.parse(JSON.stringify(serializeSession(s)));
  data.params.nodes.jt30.params = { ...(data.params.nodes.jt30.params || {}), 'bass.waveform': 0 };
  data.params.nodes.jt10.params = { ...(data.params.nodes.jt10.params || {}), 'lead.lfoWaveform': 0, 'lead.subMode': '1' };
  const d = deserializeSession(data);
  ok('jt30 waveform 0 → sawtooth, jt10 lfoWaveform 0 → triangle, subMode "1" → 1', () => {
    assert.equal(d.get('jt30.waveform'), 'sawtooth');
    assert.equal(d.get('jt10.lfoWaveform'), 'triangle');
    assert.equal(d.get('jt10.subMode'), 1);
  });
  const r = await renderSessionToBuffer(d, 1);
  ok('the loaded track renders (no "FAILED TO RENDER")', () => assert.doesNotMatch(r.message, /FAILED/));

  for (const id of ['jt10', 'jt30']) {
    const e = createSession({ bpm: 128 });
    e._nodes[id].setPattern(Array.from({ length: 64 }, () => ({ note: 'C2', gate: false, accent: false, slide: false })));
    const back = deserializeSession(JSON.parse(JSON.stringify(serializeSession(e))));
    ok(`${id}: an all-rest 64-step pattern keeps its length through save/load`, () => assert.equal(back._nodes[id].getPatternLength(), 64));
  }
}

// =============================================================================
console.log('\n[6] mute pseudo-param both ways');
for (const id of ['jb202', 'jt30', 'jt10']) {
  const s = createSession({ bpm: 128 });
  const n = s._nodes[id];
  n.setLevel(-6);
  assert.equal(n.setParam('mute', true), true);
  const muted = n.getLevel();
  assert.equal(n.setParam('mute', false), true);
  const restored = n.getLevel();
  n.setParam('mute', 'true'); const s2 = n.getLevel(); n.setParam('mute', 'false');
  ok(`${id}: mute → -60, unmute restores the pre-mute level (-6); string flags work`, () => {
    assert.equal(muted, -60); assert.equal(restored, -6); assert.equal(s2, -60); assert.equal(n.getLevel(), -6);
  });
}

// =============================================================================
console.log('\n[7] JT10 null-default filter envelope params');
{
  const s = createSession({ bpm: 128 });
  await tool(s, 'add_jt10', { pattern: mono('A2') });
  ok('readProducerValue returns null (not 0) for an unset param', () => assert.equal(readProducerValue(s, 'jt10.lead.filterDecay'), null));
  const inst = describeSession(s).instruments.find(i => i.id === 'jt10');
  ok('describeSession omits null params (no phantom "filterDecay 0" fader)', () => {
    assert.equal(inst.params.find(p => p.sub === 'lead.filterDecay'), undefined);
    assert.ok(inst.params.find(p => p.sub === 'lead.decay'), 'decay still listed');
  });
  ok('toEngine/fromEngine pass null through; formatValue(null) = auto', () => {
    const def = { unit: '0-100', min: 0, max: 100 };
    assert.equal(toEngine(null, def), null); assert.equal(fromEngine(null, def), null);
    assert.equal(formatValue(null, def), 'auto');
    assert.equal(toEngine(50, def), 0.5);
  });
  const follow = await chan(s);
  await tool(s, 'tweak', { path: 'jt10.lead.filterDecay', value: 90 });
  const own = await chan(s);
  ok('a real filterDecay changes the sound', () => assert.ok(maxDiff(follow, own) > 0.01));
  const r = await tool(s, 'tweak', { path: 'jt10.lead.filterDecay', value: null });
  const back = await chan(s);
  ok('tweak value:null restores "follow amp" (stored null, identical render)', () => {
    assert.equal(s.get('jt10.lead.filterDecay'), null); assert.match(r, /auto/); assert.equal(maxDiff(follow, back), 0);
  });
}

// =============================================================================
console.log('\n[8] status: seconds unit, glideTime visible, JT30 ampDecay alias gone');
{
  ok("formatProducerValue formats 'seconds' with decimals", () => {
    assert.equal(formatProducerValue(0.3, { unit: 'seconds' }), '0.30s');
    assert.equal(formatProducerValue(0.8, { unit: 'seconds' }), '0.80s');
  });
  const s = createSession({ bpm: 128 });
  await tool(s, 'add_jt10', { pattern: mono('A2') });
  await tool(s, 'tweak', { path: 'jt10.lead.glideTime', value: 0.4 });
  const ctx = buildSessionContext(s);
  ok('a 0.4 s glide shows up in the session context', () => assert.match(ctx, /glideTime=0\.40s/));
  const t = createSession({ bpm: 128 });
  const before = t.get('jt30.decay');
  const okSet = t._nodes.jt30.setParam('bass.ampDecay', 0.9);
  ok('jt30 ampDecay is refused instead of changing the filter decay', () => { assert.equal(okSet, false); assert.equal(t.get('jt30.decay'), before); });
  ok('jt30 filterDecay alias still works', () => { assert.equal(t._nodes.jt30.setParam('bass.filterDecay', 0.9), true); assert.equal(t.get('jt30.decay'), 0.9); });
}

// =============================================================================
console.log('\n[9] JB202 filter opens above 5.5 kHz, stays clean');
{
  async function render(hz, res = 0) {
    const s = createSession({ bpm: 128 });
    await tool(s, 'add_jb202', { pattern: mono('A1', 1) });
    await tool(s, 'tweak_multi', { params: { 'jb202.filterEnvAmount': 0, 'jb202.filterCutoff': hz, 'jb202.filterResonance': res } });
    return chan(s, 1);
  }
  const a = await render(5500), b = await render(16000);
  ok('cutoff 16 kHz differs from 5.5 kHz (top of the knob is live)', () => assert.ok(maxDiff(a, b) > 0.05));
  ok('16 kHz is brighter than 5.5 kHz', () => assert.ok(hfRms(b, 0, b.length) > hfRms(a, 0, a.length)));
  const hot = await render(16000, 100);
  ok('16 kHz + resonance 100: finite', () => assert.ok(!hasNaN(hot)));
  const wav = join(tmpdir(), `jambot-mono-synths-${process.pid}.wav`);
  const buf = { numberOfChannels: 1, length: hot.length, sampleRate: 44100, getChannelData: () => hot };
  writeFileSync(wav, Buffer.from(audioBufferToWav(buf)));
  try {
    const res = spectralAnalyzer.detectResonance(wav, { minProminence: 25, minFreq: 2500, maxFreq: 16000 });
    const bad = (res.peaks || []).filter(p => (p.amplitudeDb ?? -200) > -40);
    ok('16 kHz + resonance 100: no screech line >2.5 kHz above -40 dBFS', () => assert.equal(bad.length, 0, bad.map(p => `${Math.round(p.freq ?? p.freqHz ?? 0)}Hz ${p.amplitudeDb}dB`).join(', ')));
  } finally { try { unlinkSync(wav); } catch {} }
}

// =============================================================================
console.log('\n[10] engine timing: bar-locked grid, swing, release tail');
for (const bpm of [128, 130]) {
  const s = createSession({ bpm });
  await tool(s, 'add_jb202', { pattern: mono('C2', 16) });     // one pluck on step 0 of every bar
  await tool(s, 'tweak_multi', { params: { 'jb202.ampRelease': 0, 'jb202.ampAttack': 0 } });
  const x = await chan(s, 8);
  const spb = s.clock.samplesPerBar;
  const onsets = []; let from = 0;
  for (let b = 0; b < 8; b++) { const o = firstOnset(x, from, 0.02); onsets.push(o); from = o + Math.floor(spb * 0.9); }
  const spacing = onsets.slice(1).map((o, i) => o - onsets[i]);
  ok(`${bpm} BPM: every JB202 bar is exactly clock.samplesPerBar (${spb}) — spacing ${spacing.join(',')}`, () => {
    assert.ok(spacing.every(d => d === spb));
    assert.ok(onsets[7] - onsets[0] === 7 * spb, `8-bar span ${onsets[7] - onsets[0]} vs ${7 * spb}`);
  });
}
for (const [id, add, note] of [['jb202', 'add_jb202', 'C2'], ['jt30', 'add_jt30', 'A1'], ['jt10', 'add_jt10', 'A2']]) {
  async function onsetOfStep1(swingPct) {
    const s = createSession({ bpm: 128 });
    await tool(s, add, { pattern: Array.from({ length: 16 }, (_, i) => ({ note, gate: i === 1 || i === 8, accent: false, slide: false })) });
    if (id === 'jb202') await tool(s, 'tweak', { path: 'jb202.ampAttack', value: 0 });
    if (id === 'jt10') await tool(s, 'tweak', { path: 'jt10.attack', value: 0 });
    await tool(s, 'set_swing', { amount: swingPct });
    const x = await chan(s, 2);
    const sps = s.clock.stepDuration * 44100;
    return { straight: firstOnset(x, 0, 0.02), sps, spb: s.clock.samplesPerBar, x };
  }
  const a = await onsetOfStep1(0), b = await onsetOfStep1(100);
  // Onset detection has a per-synth latency (filters open from closed), so
  // compare shifts, not absolute positions: swing 1 shortens step 0 to half a
  // step, so the step-1 note lands sps/2 earlier — the drum machines' factor.
  ok(`${id}: swing 100 % moves the step-1 note half a step earlier (${a.straight} → ${b.straight}, step = ${Math.round(a.sps)})`, () => {
    assert.ok(Math.abs(a.straight - Math.round(a.sps)) < 120, `straight onset ${a.straight} vs step ${Math.round(a.sps)}`);
    assert.ok(Math.abs((a.straight - b.straight) - a.sps * 0.5) < 8, `shift ${a.straight - b.straight} vs ${a.sps * 0.5}`);
  });
  // step 8 (even) starts a pair: with swing it stays exactly 7 straight steps after step 1's straight position
  const o8 = firstOnset(b.x, Math.floor(6 * b.sps), 0.02);
  ok(`${id}: swing keeps even steps on the grid (step 8 at ${o8}, step 1 straight at ${a.straight})`, () => assert.ok(Math.abs((o8 - a.straight) - 7 * a.sps) < 8, `spacing ${o8 - a.straight} vs ${7 * a.sps}`));
}
for (const [id, add, note, params] of [
  ['jb202', 'add_jb202', 'C2', { 'jb202.ampSustain': 100, 'jb202.ampRelease': 80 }],
  ['jt10', 'add_jt10', 'A2', { 'jt10.sustain': 100, 'jt10.release': 80 }],
]) {
  const s = createSession({ bpm: 128 });
  await tool(s, add, { pattern: Array.from({ length: 16 }, (_, i) => ({ note, gate: i === 15, accent: false, slide: false })) });
  await tool(s, 'tweak_multi', { params });
  const buf = await s._nodes[id].renderPattern({ bars: 1, stepDuration: s.clock.stepDuration, sampleRate: 44100 });
  const d = buf.getChannelData(0);
  const spb = s.clock.samplesPerBar;
  ok(`${id}: the last note's release rings past the bar end (tail rms ${rms(d, spb, spb + 20000).toFixed(3)})`, () => {
    assert.ok(Math.abs(d[spb - 1]) > 0.05, `bar end sample ${d[spb - 1]}`);
    assert.ok(rms(d, spb, spb + 20000) > 0.05);
    assert.ok(rms(d, spb + 60000, spb + 88000) < rms(d, spb, spb + 20000), 'tail decays');
  });
}
{
  // Song mode: two 1-bar sections — the bass must not click at the boundary
  const s = createSession({ bpm: 128 });
  await tool(s, 'add_jb202', { pattern: Array.from({ length: 16 }, (_, i) => ({ note: 'C2', gate: i === 15, accent: false, slide: false })) });
  await tool(s, 'tweak_multi', { params: { 'jb202.ampSustain': 100, 'jb202.ampRelease': 80 } });
  await tool(s, 'save_pattern', { instrument: 'jb202', name: 'A' });
  await tool(s, 'set_arrangement', { sections: [{ bars: 1, jb202: 'A' }, { bars: 1, jb202: 'A' }] });
  const x = await chan(s, 2);
  const spb = s.clock.samplesPerBar;
  let jump = 0; for (let i = spb - 5; i < spb + 5; i++) jump = Math.max(jump, Math.abs(x[i] - x[i - 1]));
  ok(`song mode: no hard cut at the section boundary (max sample jump ${jump.toFixed(3)})`, () => assert.ok(jump < 0.1));
}

// =============================================================================
console.log('\n[11] kochi.to engine defaults unchanged: renderPattern() with no swing/automation');
{
  const { JB202Engine } = await import('../../web/public/jb202/dist/machines/jb202/engine.js');
  const e = new JB202Engine({ sampleRate: 44100 });
  e.setPattern(mono('C2'));
  const buf = await e.renderPattern({ bars: 1 });
  ok('JB202Engine.renderPattern({ bars: 1 }) renders, finite, tail included', () => {
    const d = buf.getChannelData(0);
    assert.ok(!hasNaN(d)); assert.ok(rms(d, 0, d.length) > 0.01); assert.equal(buf.length, d.length);
  });
}

// =============================================================================
console.log('\n[12] generic tweak: jt10 glideTime takes seconds or a 0-100 knob position');
{
  const s = createSession({ bpm: 128 });
  await tool(s, 'add_jt10', { pattern: mono('C4') });
  const r1 = await tool(s, 'tweak', { path: 'jt10.lead.glideTime', value: 50 });
  ok('tweak glideTime 50 → 0.5 s (was clamped to 1 s)', () => { assert.equal(s.get('jt10.lead.glideTime'), 0.5); assert.match(r1, /0\.5/); });
  await tool(s, 'tweak', { path: 'jt10.lead.glideTime', value: 0.2 });
  ok('tweak glideTime 0.2 stays 0.2 s', () => assert.ok(Math.abs(s.get('jt10.lead.glideTime') - 0.2) < 1e-9));
  const r3 = await tool(s, 'tweak_multi', { params: { 'jt10.lead.glideTime': 25 } });
  ok('tweak_multi glideTime 25 → 0.25 s', () => { assert.equal(s.get('jt10.lead.glideTime'), 0.25); assert.match(r3, /0\.25/); });
}

console.log(`\n${passed} mono-synth checks passed${process.exitCode ? ' (with failures)' : ''}`);
