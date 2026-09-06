/**
 * Test: Parameter Round-Trip
 * Verifies that producer -> engine -> producer conversion is lossless.
 * Guards Fix 1 (single conversion path).
 */
import { strict as assert } from 'node:assert';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { toEngine, fromEngine, getParamDef } from '../params/converters.js';
import { createSession } from '../core/session.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load ALL param definitions by globbing params/*-params.json — the same files
// converters.js loads. This is the single source of truth: a new instrument's
// params JSON gets round-trip coverage automatically, no test edits required.
// jb200 is a retired synth (no session node) — skip it.
const paramsDir = join(__dirname, '..', 'params');
const SKIP_PARAMS = new Set(['jb200-params.json']);
const ALL_PARAMS = {};
for (const file of readdirSync(paramsDir).sort()) {
  if (!file.endsWith('-params.json') || SKIP_PARAMS.has(file)) continue;
  const synthId = file.replace('-params.json', '');
  ALL_PARAMS[synthId] = JSON.parse(readFileSync(join(paramsDir, file), 'utf-8'));
}

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
  } catch (e) {
    failed++;
    console.error(`FAIL: ${name}`);
    console.error(`  ${e.message}`);
  }
}

// Test round-trip for every parameter in every instrument
for (const [synth, synthParams] of Object.entries(ALL_PARAMS)) {
  for (const [voice, voiceParams] of Object.entries(synthParams)) {
    if (voice.startsWith('_')) continue; // Skip _meta, _node
    for (const [param, def] of Object.entries(voiceParams)) {
      // Skip choice params for numeric round-trip tests
      if (def.unit === 'choice') continue;

      // Test default value round-trip
      test(`${synth}.${voice}.${param} default round-trip`, () => {
        const engineVal = toEngine(def.default, def);
        const producerVal = fromEngine(engineVal, def);
        const tolerance = def.unit === 'Hz' ? 1.0 : 0.5;
        assert.ok(
          Math.abs(producerVal - def.default) < tolerance,
          `Expected ~${def.default}, got ${producerVal} (engine: ${engineVal})`
        );
      });

      // Test min value
      test(`${synth}.${voice}.${param} min round-trip`, () => {
        const engineVal = toEngine(def.min, def);
        const producerVal = fromEngine(engineVal, def);
        // dB at min (-60) maps to near-zero linear, which clips to -60 on return
        const tolerance = def.unit === 'Hz' ? 1.0 : (def.unit === 'dB' ? 1.0 : 0.5);
        assert.ok(
          Math.abs(producerVal - def.min) < tolerance,
          `Expected ~${def.min}, got ${producerVal}`
        );
      });

      // Test max value
      test(`${synth}.${voice}.${param} max round-trip`, () => {
        const engineVal = toEngine(def.max, def);
        const producerVal = fromEngine(engineVal, def);
        const tolerance = def.unit === 'Hz' ? 1.0 : 0.5;
        assert.ok(
          Math.abs(producerVal - def.max) < tolerance,
          `Expected ~${def.max}, got ${producerVal}`
        );
      });
    }
  }
}

// Regression: JT90 kick tune +5 semitones should produce 500 cents
test('JT90 kick tune +5st = 500 cents', () => {
  const def = ALL_PARAMS.jt90.kick.tune;
  const engineVal = toEngine(5, def);
  assert.strictEqual(engineVal, 500, `Expected 500 cents, got ${engineVal}`);
});

// ============================================================
// Golden conversion table — ABSOLUTE values.
// Round-trip (fromEngine(toEngine(x)) ≈ x) is satisfied by ANY matched pair of
// inverse curves, so a broken dB taper / Hz log curve / pan law would still
// pass all the round-trip assertions above. These rows pin the curves
// themselves to known engine values, which round-trip structurally cannot.
// Values verified against params/converters.js.
// ============================================================
const GOLDEN = [
  // dB taper: linear / maxLinear, ceiling +6dB → maxLinear ≈ 1.9953
  { name: 'dB +6 (max)  → 1.0',      producer: 6,        engine: 1.0,        def: { unit: 'dB', min: -60, max: 6 } },
  { name: 'dB 0 (unity) → 0.5012',   producer: 0,        engine: 0.501187,   def: { unit: 'dB', min: -60, max: 6 } },
  { name: 'dB -6        → 0.2512',   producer: -6,       engine: 0.251189,   def: { unit: 'dB', min: -60, max: 6 } },
  { name: 'dB -60 (min) → ~0.0005',  producer: -60,      engine: 0.000501,   def: { unit: 'dB', min: -60, max: 6 } },
  // 0-100 linear
  { name: '0-100 50 → 0.5',          producer: 50,       engine: 0.5,        def: { unit: '0-100', min: 0, max: 100 } },
  { name: '0-100 100 → 1.0',         producer: 100,      engine: 1.0,        def: { unit: '0-100', min: 0, max: 100 } },
  // pan law: ±100 → ±1
  { name: 'pan -100 → -1',           producer: -100,     engine: -1,         def: { unit: 'pan', min: -100, max: 100 } },
  { name: 'pan +100 → +1',           producer: 100,      engine: 1,          def: { unit: 'pan', min: -100, max: 100 } },
  { name: 'pan 0 → 0',               producer: 0,        engine: 0,          def: { unit: 'pan', min: -100, max: 100 } },
  // Hz log midpoint: geometric mean of [20, 20000] = 632.4555 → 0.5
  { name: 'Hz 632.4555 → 0.5',       producer: 632.4555, engine: 0.5,        def: { unit: 'Hz', min: 20, max: 20000 } },
  // bipolar center → 0.5
  { name: 'bipolar 0 (-50..50) → 0.5', producer: 0,      engine: 0.5,        def: { unit: 'bipolar', min: -50, max: 50 } },
];

for (const row of GOLDEN) {
  test(`golden toEngine: ${row.name}`, () => {
    const got = toEngine(row.producer, row.def);
    assert.ok(
      Math.abs(got - row.engine) < 1e-3,
      `Expected engine ~${row.engine}, got ${got}`
    );
  });
}

// Semitones stay semitones (as cents), NOT normalized 0-1 — jbs tune.
test('golden: jbs tune +5st stays in pitch domain (500 cents)', () => {
  const def = ALL_PARAMS.jbs.slot.tune;
  assert.strictEqual(def.unit, 'semitones');
  assert.strictEqual(toEngine(5, def), 500, 'semitones → cents');
  assert.strictEqual(fromEngine(500, def), 5, 'cents → semitones');
});

// ============================================================
// R2: exercise the documented read/write API — session.get()/session.set().
// No other test in the suite calls these. Assert set→get round-trips and that
// aliases (drums→jb01) resolve to the SAME canonical node.
// ============================================================
test('session set/get round-trip (jb01.kick.decay)', () => {
  const s = createSession();
  assert.strictEqual(s.set('jb01.kick.decay', 0.5), true, 'set should succeed');
  assert.strictEqual(s.get('jb01.kick.decay'), 0.5, 'get should return what set wrote');
});

test('session set/get round-trip (jt90.kick.tune, semitones)', () => {
  const s = createSession();
  assert.strictEqual(s.set('jt90.kick.tune', 3), true);
  assert.strictEqual(s.get('jt90.kick.tune'), 3);
});

test('session alias resolves to canonical node (drums → jb01)', () => {
  const s = createSession();
  s.set('drums.kick.decay', 0.42);
  assert.strictEqual(s.get('drums.kick.decay'), 0.42, 'alias path reads back');
  assert.strictEqual(s.get('jb01.kick.decay'), 0.42, 'alias writes reach canonical node');
});

// ============================================================
// ParamSystem.serialize writes each node ONCE, under its canonical id.
// drums/bass/lead/synth/sampler are the same nodes as jb01/jb202/jbs; writing
// them too put the whole JB202 pattern in every save four times. Old saves
// that still carry the alias keys must keep loading.
// ============================================================
test('serialize: one entry per node, canonical ids only', () => {
  const s = createSession();
  const nodes = s.params.serialize().nodes;
  assert.deepEqual(Object.keys(nodes).sort(), ['jb01', 'jb202', 'jbs', 'jp9000', 'jt10', 'jt30', 'jt90']);
  for (const alias of ['drums', 'bass', 'lead', 'synth', 'sampler']) assert.ok(!(alias in nodes), `${alias} written`);
});

test('serialize: an added instance and an effect node are written under their own keys', () => {
  const s = createSession();
  s.addInstrument('jb202');
  s.params.register('fx.jb202.delay1', { id: 'delay1', serialize: () => ({ id: 'delay1', params: { mix: 30 } }), getParam() {}, setParam() { return true; }, getParameterDescriptors: () => ({}) });
  const nodes = s.params.serialize().nodes;
  assert.ok('jb202-2' in nodes, 'instance missing');
  assert.deepEqual(nodes['fx.jb202.delay1'], { id: 'delay1', params: { mix: 30 } });
});

test('deserialize: a legacy save carrying alias keys (bass/drums/lead/synth/sampler) still restores', () => {
  const src = createSession();
  src.set('jb202.filterCutoff', 0.77);
  src.set('jb01.kick.decay', 0.33);
  src.instrument('jb202').pattern = Array.from({ length: 16 }, (_, i) => ({ note: 'E2', gate: i % 4 === 0, accent: false, slide: false }));
  const data = JSON.parse(JSON.stringify(src.params.serialize()));
  // What every save looked like before the fix: the same node under every alias
  for (const [alias, canon] of [['drums', 'jb01'], ['bass', 'jb202'], ['lead', 'jb202'], ['synth', 'jb202'], ['sampler', 'jbs']]) {
    data.nodes[alias] = data.nodes[canon];
  }
  const dst = createSession();
  dst.params.deserialize(data);
  assert.equal(dst.get('jb202.filterCutoff'), 0.77);
  assert.equal(dst.get('jb01.kick.decay'), 0.33);
  assert.equal(dst.instrument('jb202').pattern.filter(st => st.gate).length, 4);
});

test('serialize: dropping the alias copies shrinks the payload', () => {
  const s = createSession();
  s.instrument('jb202').pattern = Array.from({ length: 16 * 128 }, (_, i) => ({ note: 'C2', gate: i % 4 === 0, accent: false, slide: false }));
  const json = JSON.stringify(s.params.serialize());
  const one = JSON.stringify(s.params.serialize().nodes.jb202);
  assert.ok(json.length < one.length * 1.6, `payload ${json.length} vs one jb202 copy ${one.length} — the pattern is stored more than once`);
});

// Regression: No local toEngine in instrument files
test('No local toEngine in instrument nodes', () => {
  const instrumentDir = join(__dirname, '..', 'instruments');
  const files = readdirSync(instrumentDir).filter(f => f.endsWith('-node.js'));
  for (const file of files) {
    const content = readFileSync(join(instrumentDir, file), 'utf-8');
    assert.ok(
      !content.includes('function toEngine('),
      `${file} contains a local toEngine() -- should use shared converter`
    );
  }
});

console.log(`\nParam round-trip: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
