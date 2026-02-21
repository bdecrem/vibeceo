/**
 * Test: Platform Rules
 * Mechanically enforces PLATFORM.md coding practices.
 * If a rule can be expressed as a pattern match, it belongs here.
 *
 * TECH DEBT allowlists: Files listed below have pre-existing violations
 * that predate this test. Remove entries as you clean them up.
 * The goal is to shrink these lists to empty.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'url';

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
// Summary
// ============================================================

console.log(`\nPlatform rules: ${passed} passed, ${failed} failed`);
if (NODES_ALLOWLIST.size > 0) {
  console.log(`  (${NODES_ALLOWLIST.size} files on _nodes allowlist — tech debt to clean up)`);
}
if (failed > 0) process.exit(1);
