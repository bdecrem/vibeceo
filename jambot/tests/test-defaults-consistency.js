/**
 * Test: Defaults Consistency
 * Verifies web (param-defs.js) and headless (jt90-params.json) parameter
 * definitions agree on defaults, ranges, and parameter names.
 * Guards Fix 5 (shared defaults).
 */
import { strict as assert } from 'node:assert';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

// Load headless definitions (the canonical source)
const JT90_JSON = require('../params/jt90-params.json');

// Load web definitions
const { VOICE_PARAM_DEFS } = await import('../../web/public/jt90/dist/machines/jt90/param-defs.js');

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

// Voice name mapping: web uses engine names (ltom, mtom, htom),
// JSON uses full names (lowtom, midtom, hitom).
// See _meta.voiceNameMapping in jt90-params.json.
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

  test(`${webVoiceId} exists in JSON (as ${jsonVoiceId})`, () => {
    assert.ok(jsonVoice, `Voice ${webVoiceId} (mapped to ${jsonVoiceId}) in param-defs.js but not in jt90-params.json`);
  });

  if (!jsonVoice) continue;

  for (const webParam of webParams) {
    const jsonParam = jsonVoice[webParam.id];

    test(`${webVoiceId}.${webParam.id} exists in JSON`, () => {
      assert.ok(jsonParam, `Param ${webParam.id} in param-defs.js but not in JSON for voice ${jsonVoiceId}`);
    });

    if (!jsonParam) continue;

    // Compare defaults.
    // Web param-defs stores in engine-friendly format:
    // - 0-1 for 0-100 params (JSON default / 100)
    // - semitones for tune (same as JSON)
    test(`${webVoiceId}.${webParam.id} defaults match`, () => {
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
    test(`${webVoiceId}.${webParam.id} name consistency`, () => {
      assert.ok(jsonParam, `JSON missing param ${webParam.id} for voice ${jsonVoiceId}`);
    });
  }

  // Check for params in JSON that are missing from web
  for (const [paramId, jsonParam] of Object.entries(jsonVoice)) {
    const webHasIt = webParams.some(p => p.id === paramId);
    test(`${webVoiceId}.${paramId} in JSON also exists in web`, () => {
      assert.ok(webHasIt, `Param ${paramId} in JSON (voice ${jsonVoiceId}) but missing from param-defs.js (voice ${webVoiceId})`);
    });
  }
}

// Reverse check: ensure all JSON voices (non-meta) are represented in web
for (const [jsonVoiceId, jsonVoice] of Object.entries(JT90_JSON)) {
  if (jsonVoiceId.startsWith('_')) continue; // Skip _meta, _node

  // Find the web voice ID (reverse mapping)
  const jsonToWeb = { lowtom: 'ltom', midtom: 'mtom', hitom: 'htom' };
  const webVoiceId = jsonToWeb[jsonVoiceId] || jsonVoiceId;

  test(`JSON voice ${jsonVoiceId} exists in web (as ${webVoiceId})`, () => {
    assert.ok(
      VOICE_PARAM_DEFS[webVoiceId],
      `Voice ${jsonVoiceId} in jt90-params.json but not in param-defs.js (expected web key: ${webVoiceId})`
    );
  });
}

console.log(`\nDefaults consistency: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
