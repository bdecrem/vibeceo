#!/usr/bin/env node
/**
 * Audio regression tests — renders real audio and asserts on the signal.
 *
 * These exist because the JT30/JT10/JB202 resonance screech shipped for
 * months with all architecture tests green: nothing rendered audio and
 * listened. Every test here locks in a fix from the 2026-07-27 audit
 * (see code-review-2026-07-27.md).
 */
import { readFileSync, unlinkSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHeadless } from '../headless.js';
import { spectralAnalyzer } from '../effects/spectral-analyzer.js';

let passed = 0, failed = 0;
const tmp = (name) => join(tmpdir(), `jambot-audiotest-${name}`);

function check(name, cond, detail = '') {
  if (cond) { passed++; console.log(`  ✓ ${name}`); }
  else { failed++; console.error(`  ✗ ${name}${detail ? ' — ' + detail : ''}`); }
}

/** Read a 16-bit PCM wav rendered by jambot; returns mono Float samples + sr. */
function readWav(path) {
  const buf = readFileSync(path);
  const channels = buf.readUInt16LE(22);
  const sr = buf.readUInt32LE(24);
  const data = buf.subarray(44);
  const n = Math.floor(data.length / 2 / channels);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let s = 0;
    for (let c = 0; c < channels; c++) s += data.readInt16LE((i * channels + c) * 2);
    out[i] = s / channels / 32768;
  }
  return { x: out, sr };
}

const rms = (x, a, b) => {
  let s = 0, n = 0;
  for (let i = a; i < Math.min(b, x.length); i++) { s += x[i] * x[i]; n++; }
  return n ? Math.sqrt(s / n) : 0;
};
const hasNaN = (x) => { for (let i = 0; i < x.length; i++) if (!Number.isFinite(x[i])) return true; return false; };

const ACID = Array.from({ length: 16 }, (_, i) => ({ note: 'A1', gate: true, accent: i % 4 === 0, slide: i % 8 === 5 }));

/** No narrow line above 2.5kHz may be both prominent (>25dB) and loud (>-40dBFS). */
function screechCheck(name, wavPath) {
  const res = spectralAnalyzer.detectResonance(wavPath, { minProminence: 25, minFreq: 2500, maxFreq: 16000 });
  const bad = (res.peaks || []).filter(p => (p.amplitudeDb ?? -200) > -40);
  check(`${name}: no screech line >2.5kHz above -40dBFS`, bad.length === 0,
    bad.map(p => `${Math.round(p.freq ?? p.freqHz ?? 0)}Hz ${p.amplitudeDb}dB`).join(', '));
}

async function main() {
  // ---------- 1. every synth renders non-silent, finite audio at stress settings
  console.log('\n[1] render smoke + screech guard (jt30/jb202/jt10 at max resonance)');
  for (const [name, setup] of [
    ['jt30', async jb => {
      await jb.tool('add_jt30', { pattern: ACID });
      await jb.tool('tweak_jt30', { filterCutoff: 2500, filterResonance: 100, filterEnvAmount: 100, accentLevel: 100, drive: 40 });
    }],
    ['jb202', async jb => {
      await jb.tool('add_jb202', { pattern: ACID });
      await jb.tool('tweak', { path: 'jb202.filterCutoff', value: 400 });
      await jb.tool('tweak', { path: 'jb202.filterResonance', value: 90 });
      await jb.tool('tweak', { path: 'jb202.filterEnvAmount', value: 100 });
    }],
    ['jt10', async jb => {
      await jb.tool('add_jt10', { pattern: ACID.map(s => ({ ...s, note: 'A2' })) });
      await jb.tool('tweak_jt10', { filterCutoff: 12000, filterResonance: 100, filterEnvAmount: 0 }).catch(() => {});
    }],
  ]) {
    const jb = await createHeadless({ bpm: 130 });
    await setup(jb);
    const out = tmp(name);
    await jb.render(out, 2);
    const wav = out + '.wav';
    const { x } = readWav(wav);
    check(`${name}: renders non-silent`, rms(x, 0, x.length) > 0.01);
    check(`${name}: no NaN/Inf`, !hasNaN(x));
    screechCheck(name, wav);
    unlinkSync(wav);
  }

  // ---------- 2. reverb tail decays (max-decay used to be feedback 1.0 = integrator)
  console.log('\n[2] reverb decay');
  {
    const jb = await createHeadless({ bpm: 120 });
    await jb.tool('add_jt90', { clear: true, rimshot: [0] });
    await jb.tool('add_effect', { target: 'jt90', effect: 'reverb', decay: 2, damping: 30, mix: 60 });
    const out = tmp('reverb');
    await jb.render(out, 1);
    const { x, sr } = readWav(out + '.wav');
    const early = rms(x, Math.floor(0.3 * sr), Math.floor(0.9 * sr));
    const late = rms(x, Math.floor(1.2 * sr), Math.floor(1.8 * sr));
    check('reverb tail decays (late < 50% of early)', late < early * 0.5, `early=${early.toFixed(4)} late=${late.toFixed(4)}`);
    unlinkSync(out + '.wav');
  }

  // ---------- 3. sidechain ducks the trigger pattern, not every step
  console.log('\n[3] sidechain gating');
  {
    const jb = await createHeadless({ bpm: 120 });
    await jb.tool('add_jt90', { clear: true, kick: [0, 8] });
    await jb.tool('tweak_jt90', { voice: 'kick', level: -60 });
    await jb.tool('add_jt30', { pattern: Array.from({ length: 16 }, () => ({ note: 'A1', gate: true, accent: false, slide: true })) });
    await jb.tool('tweak_jt30', { filterCutoff: 300, filterResonance: 20, filterEnvAmount: 10, level: 70 });
    await jb.tool('add_sidechain', { target: 'jt30', trigger: 'kick', amount: 0.8 });
    const out = tmp('sidechain');
    await jb.render(out, 1);
    const { x, sr } = readWav(out + '.wav');
    const spb = Math.floor(sr * 60 / 120 / 4);
    const s0 = rms(x, 0, spb);            // kick step — ducked
    const s3 = rms(x, 3 * spb, 4 * spb);  // no kick — full drone
    check('sidechain ducks on the kick step only', s0 < s3 * 0.8, `step0=${s0.toFixed(3)} step3=${s3.toFixed(3)}`);
    unlinkSync(out + '.wav');
  }

  // ---------- 4. producer-unit nodes round-trip through the generic path
  console.log('\n[4] unit round-trips (effects + jbs via generic tweak)');
  {
    const jb = await createHeadless({ bpm: 130 });
    await jb.tool('add_jt90', { clear: true, rimshot: [0] });
    await jb.tool('add_effect', { target: 'jt90', effect: 'delay', feedback: 50, mix: 30 });
    const fxId = [...jb.session.params.nodes.keys()].find(k => k.startsWith('fx.'));
    await jb.tool('tweak', { path: `${fxId}.feedback`, value: 85 });
    const node = jb.session.params.nodes.get(fxId);
    check('effect feedback stores producer units (85, not 0.85)', node._params.feedback === 85, `got ${node._params.feedback}`);
    const shown = String(await jb.tool('get_param', { path: `${fxId}.feedback` }));
    check('effect feedback reads back as 85', shown.includes('85'), shown);

    await jb.tool('load_jbs_kit', { kit: '808' });
    await jb.tool('tweak', { path: 'jbs.s1.level', value: -6 });
    const jbs = jb.session.params.nodes.get('jbs');
    check('jbs slot level stores producer dB (-6)', jbs._params['s1.level'] === -6, `got ${jbs._params['s1.level']}`);
    const eng = jbs.getSlotEngineParams('s1');
    check('jbs render boundary converts once (10^(-6/20))', Math.abs(eng.level - 0.2512) < 0.01, `got ${eng.level}`);
    check('jbs tune passes semitones raw', (jbs.setParam('s1.tune', 7), jbs.getSlotEngineParams('s1').tune === 7),
      `got ${jbs.getSlotEngineParams('s1').tune}`);
  }

  // ---------- 5. mixer state reaches the render
  console.log('\n[5] mixer state (mute) affects the mix');
  {
    async function renderMix(mute) {
      const jb = await createHeadless({ bpm: 130 });
      await jb.tool('add_jt90', { clear: true, kick: [0, 4, 8, 12] });
      await jb.tool('add_jt30', { pattern: Array.from({ length: 16 }, () => ({ note: 'A2', gate: true, accent: false, slide: false })) });
      await jb.tool('tweak_jt30', { filterCutoff: 1200, filterResonance: 30, level: 70 });
      if (mute) { await jb.tool('add_track', { id: 'jt30' }); await jb.tool('mute_track', { track: 'jt30' }); }
      const out = tmp('mix' + (mute ? '-muted' : ''));
      await jb.render(out, 1);
      const { x } = readWav(out + '.wav');
      unlinkSync(out + '.wav');
      return rms(x, 0, x.length);
    }
    const full = await renderMix(false);
    const muted = await renderMix(true);
    check('mute_track removes the instrument from the mix', muted < full * 0.9, `full=${full.toFixed(3)} muted=${muted.toFixed(3)}`);
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}

main().catch(e => { console.error('Test crashed:', e); process.exit(1); });
