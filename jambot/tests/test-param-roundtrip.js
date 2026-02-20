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
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));

// Load all param definitions
const ALL_PARAMS = {
  jb01: require('../params/jb01-params.json'),
  jb202: require('../params/jb202-params.json'),
  jt10: require('../params/jt10-params.json'),
  jt30: require('../params/jt30-params.json'),
  jt90: require('../params/jt90-params.json'),
  sampler: require('../params/sampler-params.json'),
};

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
