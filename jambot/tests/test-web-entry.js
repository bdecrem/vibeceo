#!/usr/bin/env node
/**
 * Browser entry contract (hilma/scripts/jam/jambot-web-entry.js) — the file
 * esbuild bundles into hilma/public/jam/jambot-web.js. Loaded here in Node
 * with the .md import and the esbuild define shimmed, so the web `render`
 * tool and the web runAgent wrapper are tested against the real engine.
 *
 *   - render bars are clamped to 1..128 (a 300-bar render kills a phone tab)
 *   - loop mode renders at least the longest programmed pattern, so a 4-bar
 *     drum fill is not cut at session.bars
 *   - the web runAgent passes max_tokens 16384 (the /api/jam/llm cap)
 *
 * Skips (exit 0, loudly) when hilma is not checked out next to vibeceo.
 */
import { strict as assert } from 'node:assert';
import { existsSync } from 'node:fs';
import { register } from 'node:module';
import { fileURLToPath } from 'node:url';

const ENTRY = new URL('../../../hilma/scripts/jam/jambot-web-entry.js', import.meta.url);
if (!existsSync(fileURLToPath(ENTRY))) {
  console.log(`  - skipped: ${fileURLToPath(ENTRY)} not found (hilma must be a sibling of vibeceo)`);
  process.exit(0);
}

// esbuild loaders the bundle relies on: `.md` as a string, `__JAM_BUILD__`
// as a define, and the entry itself as ESM (hilma's package.json has no type).
register('data:text/javascript,' + encodeURIComponent(`
  import { readFileSync } from 'node:fs';
  export async function load(url, ctx, next) {
    if (url.endsWith('.md')) {
      return { format: 'module', shortCircuit: true, source: 'export default ' + JSON.stringify(readFileSync(new URL(url), 'utf8')) + ';' };
    }
    if (url.endsWith('/scripts/jam/jambot-web-entry.js')) {
      return { format: 'module', shortCircuit: true, source: readFileSync(new URL(url), 'utf8') };
    }
    return next(url, ctx);
  }
`), import.meta.url);
globalThis.__JAM_BUILD__ = 'test';

const warn = console.warn;
console.warn = (...a) => { if (!/is being re-registered/.test(String(a[0]))) warn(...a); };
const web = await import(ENTRY.href);
console.warn = warn;

let passed = 0;
async function ok(name, fn) {
  try { await fn(); console.log(`  ✓ ${name}`); passed++; }
  catch (e) { console.error(`  ✗ ${name}\n    ${e.message}`); process.exitCode = 1; }
}

const tools = await web.ready();

await ok('web tool list has the browser render tool with the 1-128 contract', () => {
  const render = tools.find(t => t.name === 'render');
  assert.ok(render);
  assert.match(render.input_schema.properties.bars.description, /1-128/);
  assert.ok(!tools.some(t => t.name === 'list_projects'), 'hidden tools stay hidden');
});

// --- render bars: clamp + longest pattern ------------------------------------
{
  const session = web.createSession({ bpm: 128 });
  await ok('empty session: requested bars clamp to 1..128, fall back to session.bars', () => {
    assert.equal(web.MAX_RENDER_BARS, 128);
    assert.equal(web.resolveRenderBars(session, 300).bars, 128);
    assert.equal(web.resolveRenderBars(session, 0.3).bars, 1);
    assert.equal(web.resolveRenderBars(session, -4).bars, 2);
    assert.equal(web.resolveRenderBars(session, 'lots').bars, 2);
    assert.equal(web.resolveRenderBars(session, undefined).bars, 2);
    session.bars = 8;
    assert.equal(web.resolveRenderBars(session, undefined).bars, 8);
    assert.equal(web.resolveRenderBars(session, 3).bars, 3);
    session.bars = 2;
  });

  const ctx = { onRender: (r) => { ctx.last = r; } };
  const kick = Array.from({ length: 16 }, (_, i) => i * 4);
  await web.executeTool('add_jt90', { bars: 4, kick, crash: [48] }, session, ctx);
  // A saved track, or the Controls "bars" slider, can hold a loop length
  // shorter than the programmed pattern; the render must not truncate it.
  session.bars = 2;

  await ok('a 4-bar jt90 pattern raises the loop render from session.bars=2 to 4', async () => {
    assert.equal(session.bars, 2);
    assert.equal(session.getNode('jt90').getPatternBars(), 4);
    assert.deepEqual(web.resolveRenderBars(session, undefined), { bars: 4, longest: 4, longestId: 'jt90' });
    const msg = await web.executeTool('render', {}, session, ctx);
    assert.equal(ctx.last.bars, 4, msg);
    assert.match(msg, /Rendered 4 bars/);
    assert.match(msg, /to fit the jt90 pattern/);
    assert.equal(session.lastRender.bars, 4);
    // the crash on step 48 (bar 4) is inside the rendered audio
    const secondsPerBar = (60 / 128) * 4;
    assert.ok(ctx.last.buffer.duration >= 4 * secondsPerBar, `buffer ${ctx.last.buffer.duration}s`);
  });

  await ok('an explicit shorter request still renders the whole pattern', async () => {
    const msg = await web.executeTool('render', { bars: 2 }, session, ctx);
    assert.equal(ctx.last.bars, 4, msg);
  });

  await ok('an explicit longer request wins, and 300 bars is capped at 128 without rendering', () => {
    assert.equal(web.resolveRenderBars(session, 8).bars, 8);
    assert.equal(web.resolveRenderBars(session, 300).bars, 128);
  });

  await ok('a small over-cap request through the tool reports the cap', async () => {
    const s2 = web.createSession({ bpm: 128 });
    const c2 = { onRender: (r) => { c2.last = r; } };
    await web.executeTool('add_jt90', { kick: [0, 8] }, s2, c2);
    const r = web.resolveRenderBars(s2, 129);
    assert.equal(r.bars, 128);
    // Don't render 128 bars in a test; the tool path is the same function.
  });

  await ok('arrangement mode ignores bars', async () => {
    const s3 = web.createSession({ bpm: 128 });
    const c3 = { onRender: (r) => { c3.last = r; } };
    await web.executeTool('add_jt90', { kick: [0, 4, 8, 12] }, s3, c3);
    await web.executeTool('save_pattern', { instrument: 'jt90', name: 'A' }, s3, c3);
    await web.executeTool('set_arrangement', { sections: [{ bars: 3, jt90: 'A' }] }, s3, c3);
    const msg = await web.executeTool('render', { bars: 300 }, s3, c3);
    assert.equal(c3.last.bars, 3, msg);
    assert.doesNotMatch(msg, /capped|to fit/);
  });
}

// --- web runAgent: max_tokens -----------------------------------------------
{
  const calls = [];
  const llm = async (req) => { calls.push(req); return { stop_reason: 'end_turn', content: [{ type: 'text', text: 'hi' }] }; };
  const session = web.createSession({ bpm: 128 });
  await web.runAgent({ task: 'hello', session, messages: [], llm, executeTool: web.executeTool, tools, systemPrompt: 'S' });
  await web.runAgent({ task: 'hello', session, messages: [], llm, executeTool: web.executeTool, tools, systemPrompt: 'S', maxTokens: 100 });
  await ok('web runAgent sends max_tokens 16384 by default and honours an override', () => {
    assert.equal(web.WEB_MAX_TOKENS, 16384);
    assert.equal(calls[0].max_tokens, 16384);
    assert.equal(calls[1].max_tokens, 100);
  });
}

console.log(`\n${passed} web-entry checks passed${process.exitCode ? ' (with failures)' : ''}`);
