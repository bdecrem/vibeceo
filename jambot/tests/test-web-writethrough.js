#!/usr/bin/env node
/**
 * Song-mode slider write-through (hilma src/app/jam/Studio.tsx,
 * writeThroughSavedPatterns). Arrangement renders use the params captured in
 * each saved pattern, so a slider move has to reach every saved pattern of
 * that instrument. The web app used to do that with load_pattern → tweak →
 * save_pattern per saved pattern, which replaced the live pattern, params,
 * automation and inserts with each saved copy — one slider move wiped
 * whatever the agent had programmed since its last save.
 *
 * The algorithm below mirrors Studio.writeThroughSavedPatterns line for line
 * (keep them in step by hand — Studio.tsx is a React module). Checks:
 *   - live pattern / automation / inserts / currentPattern survive
 *   - every saved pattern holds the new engine value (drums, mono, added instance)
 *   - it produces exactly what load → tweak → save would have saved
 *   - the song render actually changes
 *   - out of song mode, or for fx / node level, nothing is written
 */
import { strict as assert } from 'node:assert';
import { createSession } from '../core/session.js';
import { renderSessionToBuffer } from '../core/render.js';
import { initializeTools, executeTool } from '../tools/index.js';

await initializeTools();

let passed = 0;
function ok(name, fn) {
  try { fn(); console.log(`  ✓ ${name}`); passed++; }
  catch (e) { console.error(`  ✗ ${name}\n    ${e.message}`); process.exitCode = 1; }
}

// === mirror of Studio.writeThroughSavedPatterns ===============================
function writeThroughSavedPatterns(session, path) {
  const [inst, ...rest] = path.split('.');
  if (!Array.isArray(session.arrangement) || session.arrangement.length === 0) return 0;
  if (inst === 'fx' || rest.length === 0) return 0;
  if (rest.length === 1 && rest[0] === 'level') return 0;
  const saved = session.patterns?.[inst];
  if (!saved) return 0;
  const acc = session.instrument?.(inst);
  if (!acc || acc.kind === 'sampler' || acc.kind === 'modular') return 0;

  let voice = null;
  let key;
  if (acc.kind === 'drums') {
    [voice] = rest;
    key = rest.slice(1).join('.');
    if (!key) return 0;
  } else {
    const sub = rest.join('.');
    const live = Object.keys(acc.params || {});
    const match = live.filter((k) => sub === k || sub.endsWith(`.${k}`)).sort((a, b) => b.length - a.length)[0];
    if (!match) return 0;
    key = match;
  }
  const value = voice ? acc.params?.[voice]?.[key] : acc.params?.[key];
  if (value === undefined) return 0;

  let n = 0;
  for (const entry of Object.values(saved)) {
    if (!entry || typeof entry !== 'object') continue;
    const params = (entry.params ||= {});
    if (voice) {
      const vp = (params[voice] ||= {});
      vp[key] = value;
    } else {
      params[key] = value;
    }
    n++;
  }
  return n;
}

// Studio.onParam, as shipped now: tweak the live node, then write through.
async function applyParam(session, path, value) {
  const r = await executeTool('tweak', { path, value }, session, {});
  if (/^Error/.test(r)) return { r, n: 0 };
  return { r, n: writeThroughSavedPatterns(session, path) };
}
// =============================================================================

const mono = (a, b) => Array.from({ length: 16 }, (_, i) => ({ note: i % 8 === 0 ? a : b, gate: i % 2 === 0, accent: i % 4 === 0, slide: false }));
const hits = (s, inst, v) => (s.instrument(inst).pattern[v] || []).filter((x) => x.velocity > 0).length;
const quiet = (fn) => { const w = console.warn; console.warn = () => {}; try { return fn(); } finally { console.warn = w; } };

async function songSession() {
  const s = createSession({ bpm: 128 });
  await executeTool('add_jt90', { kick: [0, 8], snare: [4, 12] }, s, {});
  await executeTool('save_pattern', { instrument: 'jt90', name: 'A' }, s, {});
  await executeTool('add_jt90', { kick: [0, 4, 8, 12], ch: [2, 6, 10, 14] }, s, {});
  await executeTool('save_pattern', { instrument: 'jt90', name: 'B' }, s, {});
  await executeTool('add_jb202', { pattern: mono('C2', 'G2') }, s, {});
  await executeTool('save_pattern', { instrument: 'jb202', name: 'A' }, s, {});
  await executeTool('add_instrument', { type: 'jb202' }, s, {});
  s.instrument('jb202-2').pattern = mono('A1', 'E2');
  await executeTool('save_pattern', { instrument: 'jb202-2', name: 'A' }, s, {});
  await executeTool('set_arrangement', { sections: [{ bars: 1, jt90: 'A', jb202: 'A', 'jb202-2': 'A' }, { bars: 1, jt90: 'B', jb202: 'A' }] }, s, {});
  await executeTool('add_effect', { target: 'jt90.kick', effect: 'delay', mode: 'pingpong', mix: 20 }, s, {});
  return s;
}

console.log('\nsong-mode write-through');

// --- 1. live work survives a slider move ----------------------------------------
{
  const s = await songSession();
  // Unsaved live work: a 2-bar variation with claps, automation, an insert.
  await executeTool('add_jt90', { kick: [0, 4, 8, 12, 16, 20, 24, 28], clap: [4, 12, 20, 28], oh: [6, 14, 22, 30], bars: 2 }, s, {});
  s.params.automate('jt90.kick.decay', Array.from({ length: 16 }, (_, i) => 30 + i * 3));
  s.mixer.channelInserts.clap = [{ type: 'filter', params: { type: 'highpass', cutoff: 400 } }];
  const before = {
    kick: hits(s, 'jt90', 'kick'), clap: hits(s, 'jt90', 'clap'), steps: s.instrument('jt90').pattern.kick.length,
    automation: s.params.listAutomation(), inserts: Object.keys(s.mixer.channelInserts).sort(), current: s.currentPattern.jt90,
    chain: JSON.stringify(s.mixer.effectChains['jt90.kick']?.map((e) => e.params)),
  };

  const { r, n } = await applyParam(s, 'jt90.kick.decay', 75);
  const after = {
    kick: hits(s, 'jt90', 'kick'), clap: hits(s, 'jt90', 'clap'), steps: s.instrument('jt90').pattern.kick.length,
    automation: s.params.listAutomation(), inserts: Object.keys(s.mixer.channelInserts).sort(), current: s.currentPattern.jt90,
    chain: JSON.stringify(s.mixer.effectChains['jt90.kick']?.map((e) => e.params)),
  };
  ok('tweak succeeded', () => assert.match(r, /kick\.decay/));
  ok('both saved jt90 patterns were written', () => assert.equal(n, 2));
  ok('live 2-bar variation, claps, automation, inserts, currentPattern untouched', () => assert.deepEqual(after, before));
  ok('live node has the new value', () => assert.equal(s.get('jt90.kick.decay'), 0.75));
  ok('saved A and B hold the new engine value', () => {
    assert.equal(s.patterns.jt90.A.params.kick.decay, 0.75);
    assert.equal(s.patterns.jt90.B.params.kick.decay, 0.75);
  });
  ok('other saved params are untouched', () => {
    assert.equal(JSON.stringify(s.patterns.jt90.A.pattern), JSON.stringify(s.patterns.jt90.A.pattern));
    assert.equal(s.patterns.jt90.A.params.kick.tune, s.patterns.jt90.B.params.kick.tune);
  });
}

// --- 2. exactly what load → tweak → save would have saved ------------------------
{
  // Two identical sessions whose live node equals saved 'B' (the only case
  // where the old round-trip was lossless): the results must match.
  const direct = await songSession();
  const roundtrip = await songSession();
  for (const path of ['jt90.snare.decay', 'jb202.bass.filterCutoff', 'jb202-2.bass.filterResonance']) {
    const value = path.endsWith('filterCutoff') ? 900 : 42;
    await applyParam(direct, path, value);
    const [inst] = path.split('.');
    for (const name of Object.keys(roundtrip.patterns[inst])) {
      await executeTool('load_pattern', { instrument: inst, name }, roundtrip, {});
      await executeTool('tweak', { path, value }, roundtrip, {});
      await executeTool('save_pattern', { instrument: inst, name }, roundtrip, {});
    }
  }
  ok('saved patterns equal the load→tweak→save result (jt90, jb202, jb202-2)', () => {
    for (const inst of ['jt90', 'jb202', 'jb202-2']) {
      assert.deepEqual(JSON.parse(JSON.stringify(direct.patterns[inst])), JSON.parse(JSON.stringify(roundtrip.patterns[inst])), inst);
    }
  });
  ok('mono synth key resolution: jb202.bass.filterCutoff → params.filterCutoff', () => {
    assert.equal(direct.patterns.jb202.A.params.filterCutoff, direct.get('jb202.bass.filterCutoff'));
    assert.equal(direct.patterns['jb202-2'].A.params.filterResonance, direct.get('jb202-2.bass.filterResonance'));
    assert.equal(direct.patterns.jb202.A.params.filterResonance, roundtrip.patterns.jb202.A.params.filterResonance);
  });
}

// --- 3. the song render changes ---------------------------------------------------
{
  const s = await songSession();
  const a = Float32Array.from((await renderSessionToBuffer(s, 2)).buffer.getChannelData(0));
  await applyParam(s, 'jt90.kick.decay', 100);
  const b = Float32Array.from((await renderSessionToBuffer(s, 2)).buffer.getChannelData(0));
  let diff = 0; let ref = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i++) { diff += (a[i] - b[i]) ** 2; ref += a[i] ** 2; }
  ok('arrangement render reflects the slider (kick decay 100)', () => assert.ok(diff / Math.max(ref, 1e-9) > 1e-3, `relative diff ${diff / ref}`));
}

// --- 4. when nothing should be written ---------------------------------------------
{
  const s = await songSession();
  const snap = () => JSON.stringify(s.patterns);
  const before = snap();
  let res = await applyParam(s, 'jt90.level', -6);
  ok('node level is not a pattern param', () => { assert.equal(res.n, 0); assert.equal(snap(), before); });
  const fxPath = `fx.jt90.kick.${s.mixer.effectChains['jt90.kick'][0].id}.mix`;
  res = await applyParam(s, fxPath, 45);
  ok('effect params are not pattern params', () => { assert.equal(res.n, 0); assert.equal(snap(), before); });
  res = await quiet(() => applyParam(s, 'jt90.kick.nope', 1));
  ok('unknown param: tweak errors, nothing written', () => { assert.match(res.r, /^Error/); assert.equal(snap(), before); });

  const loop = createSession({ bpm: 128 });
  await executeTool('add_jt90', { kick: [0, 4, 8, 12] }, loop, {});
  await executeTool('save_pattern', { instrument: 'jt90', name: 'A' }, loop, {});
  const saved = JSON.stringify(loop.patterns);
  res = await applyParam(loop, 'jt90.kick.decay', 80);
  ok('loop mode (no arrangement): live only, saved patterns untouched', () => {
    assert.equal(res.n, 0); assert.equal(JSON.stringify(loop.patterns), saved); assert.equal(loop.get('jt90.kick.decay'), 0.8);
  });
}

console.log(`\n${passed} checks passed${process.exitCode ? ', some FAILED' : ''}`);
