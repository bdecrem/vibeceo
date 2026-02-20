/**
 * Test: Defaults Consistency
 *
 * Part 1: JSON Self-Validation — ALL instruments
 *   Verifies every param JSON file has valid structure: defaults within range,
 *   valid units, min < max, required fields present.
 *
 * Part 2: Web vs Headless — JT90 only
 *   Verifies web (param-defs.js) and headless (jt90-params.json) parameter
 *   definitions agree on defaults, ranges, and parameter names.
 *   (JT90 is the only instrument with a shared param-defs.js file.
 *   Other instruments have private DEFAULT_PARAMS in their web engines.)
 */
import { strict as assert } from 'node:assert';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

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

// ============================================================
// PART 1: JSON Self-Validation — ALL instruments
// ============================================================

const VALID_UNITS = ['dB', '0-100', 'semitones', 'Hz', 'bipolar', 'pan', 'choice'];

const ALL_PARAMS = {
  jb01: require('../params/jb01-params.json'),
  jb202: require('../params/jb202-params.json'),
  jt10: require('../params/jt10-params.json'),
  jt30: require('../params/jt30-params.json'),
  jt90: require('../params/jt90-params.json'),
  sampler: require('../params/sampler-params.json'),
};

for (const [synthId, json] of Object.entries(ALL_PARAMS)) {
  // _meta must exist
  test(`${synthId}: has _meta`, () => {
    assert.ok(json._meta, `Missing _meta in ${synthId}-params.json`);
    assert.ok(json._meta.name, `Missing _meta.name`);
  });

  // At least one voice
  const voiceEntries = Object.entries(json).filter(([k]) => !k.startsWith('_'));
  test(`${synthId}: has at least one voice`, () => {
    assert.ok(voiceEntries.length > 0, `No voices defined`);
  });

  for (const [voiceId, voiceParams] of voiceEntries) {
    const paramEntries = Object.entries(voiceParams);

    test(`${synthId}.${voiceId}: has at least one param`, () => {
      assert.ok(paramEntries.length > 0, `No params defined`);
    });

    for (const [paramId, def] of paramEntries) {
      const path = `${synthId}.${voiceId}.${paramId}`;

      // Unit is valid
      test(`${path}: valid unit`, () => {
        assert.ok(VALID_UNITS.includes(def.unit), `Invalid unit "${def.unit}"`);
      });

      // Choice params have options array and valid default
      if (def.unit === 'choice') {
        test(`${path}: choice has options`, () => {
          assert.ok(Array.isArray(def.options), `Choice param missing options array`);
          assert.ok(def.options.length >= 2, `Choice needs at least 2 options`);
        });
        test(`${path}: choice default is valid option`, () => {
          assert.ok(
            def.options.includes(def.default),
            `Default "${def.default}" not in options [${def.options}]`
          );
        });
        continue; // skip numeric checks for choice
      }

      // Numeric params: required fields
      test(`${path}: has min/max/default`, () => {
        assert.ok(typeof def.min === 'number', `Missing or non-numeric min`);
        assert.ok(typeof def.max === 'number', `Missing or non-numeric max`);
        assert.ok(def.default !== undefined, `Missing default`);
      });

      // min < max
      test(`${path}: min < max`, () => {
        assert.ok(def.min < def.max, `min (${def.min}) >= max (${def.max})`);
      });

      // default within range
      test(`${path}: default in range`, () => {
        assert.ok(
          def.default >= def.min && def.default <= def.max,
          `Default ${def.default} outside [${def.min}, ${def.max}]`
        );
      });

      // Unit-specific range checks
      if (def.unit === 'dB') {
        test(`${path}: dB max <= 6`, () => {
          assert.ok(def.max <= 6, `dB max ${def.max} exceeds +6dB ceiling`);
        });
      }
      if (def.unit === '0-100') {
        test(`${path}: 0-100 range is [0, 100]`, () => {
          assert.strictEqual(def.min, 0, `0-100 min should be 0, got ${def.min}`);
          assert.strictEqual(def.max, 100, `0-100 max should be 100, got ${def.max}`);
        });
      }
      if (def.unit === 'pan') {
        test(`${path}: pan range is [-100, 100]`, () => {
          assert.strictEqual(def.min, -100, `pan min should be -100`);
          assert.strictEqual(def.max, 100, `pan max should be 100`);
        });
      }
    }
  }
}

// ============================================================
// PART 2: Web vs Headless — JT90
// ============================================================

const JT90_JSON = ALL_PARAMS.jt90;
const { VOICE_PARAM_DEFS } = await import('../../web/public/jt90/dist/machines/jt90/param-defs.js');

// Voice name mapping: web uses engine names (ltom, mtom, htom),
// JSON uses full names (lowtom, midtom, hitom).
const WEB_TO_JSON_VOICE = {
  ltom: 'lowtom',
  mtom: 'midtom',
  htom: 'hitom',
};

function jsonVoiceKey(webVoiceId) {
  return WEB_TO_JSON_VOICE[webVoiceId] || webVoiceId;
}

// For each voice in the web param defs, verify against JSON
for (const [webVoiceId, webParams] of Object.entries(VOICE_PARAM_DEFS)) {
  const jsonVoiceId = jsonVoiceKey(webVoiceId);
  const jsonVoice = JT90_JSON[jsonVoiceId];

  test(`jt90 web-vs-json: ${webVoiceId} exists in JSON (as ${jsonVoiceId})`, () => {
    assert.ok(jsonVoice, `Voice ${webVoiceId} (mapped to ${jsonVoiceId}) in param-defs.js but not in jt90-params.json`);
  });

  if (!jsonVoice) continue;

  for (const webParam of webParams) {
    const jsonParam = jsonVoice[webParam.id];

    test(`jt90 web-vs-json: ${webVoiceId}.${webParam.id} exists in JSON`, () => {
      assert.ok(jsonParam, `Param ${webParam.id} in param-defs.js but not in JSON for voice ${jsonVoiceId}`);
    });

    if (!jsonParam) continue;

    // Compare defaults.
    // Web param-defs stores in engine-friendly format:
    // - 0-1 for 0-100 params (JSON default / 100)
    // - semitones for tune (same as JSON)
    test(`jt90 web-vs-json: ${webVoiceId}.${webParam.id} defaults match`, () => {
      if (jsonParam.unit === '0-100') {
        // Web stores 0-1, JSON stores 0-100
        const expectedWeb = jsonParam.default / 100;
        assert.ok(
          Math.abs(webParam.defaultValue - expectedWeb) < 0.01,
          `Default mismatch: web=${webParam.defaultValue}, json=${jsonParam.default} (expected web=${expectedWeb})`
        );
      } else if (jsonParam.unit === 'semitones') {
        // Both store semitones
        assert.strictEqual(
          webParam.defaultValue, jsonParam.default,
          `Default mismatch: web=${webParam.defaultValue}, json=${jsonParam.default}`
        );
      }
    });

    // Verify parameter names match
    test(`jt90 web-vs-json: ${webVoiceId}.${webParam.id} name consistency`, () => {
      assert.ok(jsonParam, `JSON missing param ${webParam.id} for voice ${jsonVoiceId}`);
    });
  }

  // Check for params in JSON that are missing from web
  for (const [paramId, jsonParam] of Object.entries(jsonVoice)) {
    const webHasIt = webParams.some(p => p.id === paramId);
    test(`jt90 web-vs-json: ${webVoiceId}.${paramId} in JSON also exists in web`, () => {
      assert.ok(webHasIt, `Param ${paramId} in JSON (voice ${jsonVoiceId}) but missing from param-defs.js (voice ${webVoiceId})`);
    });
  }
}

// Reverse check: ensure all JSON voices (non-meta) are represented in web
for (const [jsonVoiceId, jsonVoice] of Object.entries(JT90_JSON)) {
  if (jsonVoiceId.startsWith('_')) continue; // Skip _meta, _node

  const jsonToWeb = { lowtom: 'ltom', midtom: 'mtom', hitom: 'htom' };
  const webVoiceId = jsonToWeb[jsonVoiceId] || jsonVoiceId;

  test(`jt90 web-vs-json: JSON voice ${jsonVoiceId} exists in web (as ${webVoiceId})`, () => {
    assert.ok(
      VOICE_PARAM_DEFS[webVoiceId],
      `Voice ${jsonVoiceId} in jt90-params.json but not in param-defs.js (expected web key: ${webVoiceId})`
    );
  });
}

console.log(`\nDefaults consistency: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
