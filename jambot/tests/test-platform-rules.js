/**
 * Test: Platform Rules
 * Mechanically enforces PLATFORM.md coding practices.
 * If a rule can be expressed as a pattern match, it belongs here.
 *
 * TECH DEBT allowlists: Files listed below have pre-existing violations
 * that predate this test. Remove entries as you clean them up.
 * The goal is to shrink these lists to empty.
 */
import { strict as assert } from 'node:assert';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'url';
import { createSession } from '../core/session.js';
import { initializeTools, executeTool } from '../tools/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const toolsDir = join(__dirname, '..', 'tools');

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

/**
 * Read all .js files in a directory
 */
function readJsFiles(dir) {
  return readdirSync(dir)
    .filter(f => f.endsWith('.js'))
    .map(f => ({
      name: f,
      path: join(dir, f),
      content: readFileSync(join(dir, f), 'utf-8'),
    }));
}

// ============================================================
// Rule: No _nodes access in tools layer
// PLATFORM.md: "Use session.set()/get(), never session._nodes"
//
// TECH DEBT: These files still use _nodes. Clean them up and
// remove from this list. Do NOT add new files here.
// ============================================================

const NODES_ALLOWLIST = new Set([
  'automation-tools.js',  // 1 hit — needs session.listNodes() or similar
  'jb01-tools.js',        // 2 hits — redundant setPattern (same as jt-tools fix)
  'jb200-tools.js',       // 2 hits — redundant setPattern
  'jb202-tools.js',       // 2 hits — redundant setPattern
  'jp9000-tools.js',      // 5 hits — lazy init of jp9000 node (needs design work)
  'session-tools.js',     // 2 hits — show tool reads node directly
]);

const toolFiles = readJsFiles(toolsDir);

for (const file of toolFiles) {
  test(`${file.name}: no session._nodes access`, () => {
    const lines = file.content.split('\n');
    const violations = [];
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('session._nodes')) {
        violations.push(`  line ${i + 1}: ${lines[i].trim()}`);
      }
    }
    if (violations.length > 0) {
      if (NODES_ALLOWLIST.has(file.name)) {
        // Known tech debt — warn but don't fail
        return;
      }
      throw new Error(
        `session._nodes used ${violations.length} time(s) — use session.set()/get() or session accessors instead:\n${violations.join('\n')}`
      );
    }
  });
}

// ============================================================
// Rule: No direct engine imports in tools layer
// Tools should go through session/ParamSystem, not import engines
//
// TECH DEBT: Remove entries as you clean them up.
// ============================================================

const ENGINE_IMPORT_ALLOWLIST = new Set([
  'session-tools.js',    // 1 hit — imports TR909_KITS presets
]);

const engineImports = [
  /from\s+['"].*\/engine\.js['"]/,
  /from\s+['"].*\/machines\//,
];

for (const file of toolFiles) {
  test(`${file.name}: no direct engine imports`, () => {
    const lines = file.content.split('\n');
    const violations = [];
    for (let i = 0; i < lines.length; i++) {
      for (const pattern of engineImports) {
        if (pattern.test(lines[i])) {
          violations.push(`  line ${i + 1}: ${lines[i].trim()}`);
        }
      }
    }
    if (violations.length > 0) {
      if (ENGINE_IMPORT_ALLOWLIST.has(file.name)) {
        return;
      }
      throw new Error(
        `Direct engine import in tools layer — tools should use session/ParamSystem:\n${violations.join('\n')}`
      );
    }
  });
}

// ============================================================
// Rule: No references to session.mixer.sends in tool code
// Dead send bus API was removed — guard against regression.
// ============================================================

for (const file of toolFiles) {
  test(`${file.name}: no session.mixer.sends references`, () => {
    const lines = file.content.split('\n');
    const violations = [];
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('session.mixer.sends') || lines[i].includes('session.mixer.voiceRouting')) {
        violations.push(`  line ${i + 1}: ${lines[i].trim()}`);
      }
    }
    if (violations.length > 0) {
      throw new Error(
        `Dead send bus code found (session.mixer.sends/voiceRouting removed — use add_effect + effect chains):\n${violations.join('\n')}`
      );
    }
  });
}

// ============================================================
// Rule: Parameter addressability via the public session API (R2/R10/R16)
// PLATFORM.md documents session.get()/set() as the single read/write API, and
// that adding effects makes tweak() work "for free" because every effect param
// is addressable as fx.{target}.{effectId}.{param}. Exercise it end to end:
//   - instrument params round-trip through session.get()/set()
//   - aliases (drums→jb01, bass→jb202) resolve to the canonical node
//   - every effect type registers addressable fx.* params after add_effect
// This is behavioral (not a pattern match), but it guards the same contract.
// ============================================================

await initializeTools();

// --- Instrument addressability + alias resolution ---
test('addressability: session.set/get round-trips (jb01.kick.decay)', () => {
  const s = createSession();
  assert.strictEqual(s.set('jb01.kick.decay', 0.5), true);
  assert.strictEqual(s.get('jb01.kick.decay'), 0.5);
});

test('addressability: alias drums→jb01 resolves to canonical node', () => {
  const s = createSession();
  s.set('drums.kick.decay', 0.33);
  assert.strictEqual(s.get('drums.kick.decay'), 0.33);
  assert.strictEqual(s.get('jb01.kick.decay'), 0.33, 'alias write must reach canonical node');
});

test('addressability: alias bass→jb202 resolves to canonical node', () => {
  const s = createSession();
  s.set('bass.filterCutoff', 0.7);
  assert.strictEqual(s.get('bass.filterCutoff'), 0.7);
  assert.strictEqual(s.get('jb202.filterCutoff'), 0.7, 'alias write must reach canonical node');
});

// --- Effect-parameter addressability (R10 "tweak() for free") ---
// Add every effect type to master + one instrument chain, then assert each
// registered fx.* param is gettable, settable (round-trips), and has a descriptor.
const fxSession = createSession();
for (const effect of ['delay', 'eq', 'filter', 'sidechain', 'reverb']) {
  const result = await executeTool('add_effect', { target: 'master', effect }, fxSession);
  test(`addressability: add_effect ${effect} on master succeeds`, () => {
    assert.ok(
      typeof result === 'string' && !result.startsWith('Error'),
      `add_effect ${effect} failed: ${result}`
    );
  });
}
// Effect on an instrument chain (proves non-master targets register too).
await executeTool('add_effect', { target: 'jb202', effect: 'delay' }, fxSession);

const fxNodes = fxSession.listNodes().filter((n) => n.startsWith('fx.'));
test('addressability: all 5 effect types registered under fx.master.*', () => {
  for (const id of ['fx.master.delay1', 'fx.master.eq1', 'fx.master.filter1', 'fx.master.sidechain1', 'fx.master.reverb1']) {
    assert.ok(fxNodes.includes(id), `Missing addressable effect node: ${id}`);
  }
  assert.ok(fxNodes.includes('fx.jb202.delay1'), 'Effect on instrument chain not registered');
});

for (const nodeId of fxNodes) {
  const descriptors = fxSession.describe(nodeId) || {};
  const paramNames = Object.keys(descriptors);

  test(`addressability: ${nodeId} exposes params`, () => {
    assert.ok(paramNames.length > 0, `Effect node ${nodeId} registered no addressable params`);
  });

  for (const param of paramNames) {
    const path = `${nodeId}.${param}`;
    test(`addressability: ${path} get/set round-trips + has descriptor`, () => {
      const value = fxSession.get(path);
      assert.notStrictEqual(value, undefined, `get(${path}) returned undefined`);
      assert.strictEqual(fxSession.set(path, value), true, `set(${path}) failed`);
      assert.deepStrictEqual(fxSession.get(path), value, `${path} did not round-trip`);
      assert.ok(fxSession.getDescriptor(path), `No descriptor for ${path}`);
    });
  }
}

// ============================================================
// Summary
// ============================================================

console.log(`\nPlatform rules: ${passed} passed, ${failed} failed`);
if (NODES_ALLOWLIST.size > 0) {
  console.log(`  (${NODES_ALLOWLIST.size} files on _nodes allowlist — tech debt to clean up)`);
}
if (failed > 0) process.exit(1);
