#!/usr/bin/env node
/**
 * Chat-history hygiene for the web app (hilma src/app/jam/history.ts).
 *
 * A stored track history can end in an assistant tool_use with no
 * tool_result (a turn cut off by max_tokens, or an autosave that caught a
 * half tool round). The Messages API rejects that history, so every later
 * send 400s and the track is dead. sanitizeHistory() repairs it; this test
 * pins down what it does and that the repaired history goes through the
 * real agent loop.
 *
 * The TypeScript module is imported directly (Node ≥ 22.18 strips types;
 * the file has no runtime imports). Skips when the hilma checkout is not
 * next to vibeceo.
 */
import { strict as assert } from 'node:assert';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { runAgent } from '../core/agent.js';

const here = dirname(fileURLToPath(import.meta.url));
const file = resolve(here, '../../../hilma/src/app/jam/history.ts');
if (!existsSync(file)) {
  console.log(`SKIP: ${file} not found (hilma checkout not next to vibeceo)`);
  process.exit(0);
}
const { sanitizeHistory, isWellFormedHistory, CUT_OFF_RESULT } = await import(pathToFileURL(file).href);

let passed = 0;
function ok(name, fn) {
  try { fn(); console.log(`  ✓ ${name}`); passed++; }
  catch (e) { console.error(`  ✗ ${name}\n    ${e.message}`); process.exitCode = 1; }
}

const text = (t) => ({ type: 'text', text: t });
const use = (id, name = 'tweak', input = { path: 'jt90.kick.decay', value: 50 }) => ({ type: 'tool_use', id, name, input });
const result = (id, content = 'ok') => ({ type: 'tool_result', tool_use_id: id, content });
const user = (content) => ({ role: 'user', content });
const asst = (content) => ({ role: 'assistant', content });
const clone = (v) => JSON.parse(JSON.stringify(v));

console.log('\nsanitizeHistory');

// --- 1. the bug: a turn cut off after emitting tool calls --------------------
{
  const cut = [user('techno beat'), asst([text('Adding drums.'), use('t1', 'add_jt90')])];
  const before = clone(cut);
  const fixed = sanitizeHistory(cut);
  ok('input is not mutated', () => assert.deepEqual(cut, before));
  ok('trailing unanswered tool_use is dropped, its text kept', () =>
    assert.deepEqual(fixed, [user('techno beat'), asst([text('Adding drums.')])]));
  ok('a trailing tool_use-only assistant message goes entirely', () =>
    assert.deepEqual(sanitizeHistory([user('hi'), asst([use('t1')])]), [user('hi')]));
  ok('result is well-formed', () => assert.equal(isWellFormedHistory(fixed), true));
  ok('the original was not', () => assert.equal(isWellFormedHistory(cut), false));
}

// --- 2. an unanswered tool_use in the middle -------------------------------
{
  const h = [user('go'), asst([use('t1')]), user('continue'), asst([text('Done.')])];
  const fixed = sanitizeHistory(h);
  ok('missing result is inserted before the user text (is_error)', () =>
    assert.deepEqual(fixed[2], user([{ ...result('t1', CUT_OFF_RESULT), is_error: true }, text('continue')])));
  ok('well-formed afterwards', () => assert.equal(isWellFormedHistory(fixed), true));

  const partial = [user('go'), asst([use('t1'), use('t2')]), user([result('t2')]), asst([text('Done.')])];
  const f2 = sanitizeHistory(partial);
  ok('only the missing id of a pair is added', () => {
    assert.equal(f2[2].content.length, 2);
    assert.deepEqual(f2[2].content.map((b) => b.tool_use_id).sort(), ['t1', 't2']);
    assert.equal(f2[2].content.find((b) => b.tool_use_id === 't1').is_error, true);
    assert.equal(f2[2].content.find((b) => b.tool_use_id === 't2').is_error, undefined);
  });

  const twoAssistants = [user('go'), asst([use('t1')]), asst([text('Anyway.')])];
  const f3 = sanitizeHistory(twoAssistants);
  ok('assistant → assistant gets a results message in between', () => {
    assert.equal(f3.length, 4);
    assert.deepEqual(f3[2], user([{ ...result('t1', CUT_OFF_RESULT), is_error: true }]));
    assert.equal(isWellFormedHistory(f3), true);
  });
}

// --- 3. orphan / duplicate tool_results --------------------------------------
{
  const h = [user('go'), asst([use('t1')]), user([result('t1'), result('zzz'), result('t1'), text('more')]), asst([text('ok')])];
  const fixed = sanitizeHistory(h);
  ok('orphan and duplicate results are dropped, text kept', () =>
    assert.deepEqual(fixed[2], user([result('t1'), text('more')])));
  ok('a results-only orphan message disappears', () =>
    assert.deepEqual(sanitizeHistory([user('go'), user([result('nope')]), asst([text('ok')])]), [user('go'), asst([text('ok')])]));
  ok('tool_results are moved ahead of text', () =>
    assert.deepEqual(sanitizeHistory([user('go'), asst([use('t1')]), user([text('note'), result('t1')])])[2].content.map((b) => b.type), ['tool_result', 'text']));
}

// --- 4. shape repairs ---------------------------------------------------------
{
  ok('leading assistant messages are dropped', () =>
    assert.deepEqual(sanitizeHistory([asst([text('hello')]), user('hi'), asst([text('yo')])]), [user('hi'), asst([text('yo')])]));
  ok('empty content and empty text blocks are dropped', () =>
    assert.deepEqual(sanitizeHistory([user(''), user('  '), user([]), user([text(''), text('real')]), asst([text('   ')]), asst('reply')]), [user([text('real')]), asst('reply')]));
  ok('garbage entries are dropped', () =>
    assert.deepEqual(sanitizeHistory([null, 42, 'x', { role: 'system', content: 'no' }, { role: 'user' }, user('ok')]), [user('ok')]));
  ok('wrong-role blocks are dropped (tool_use in user, tool_result in assistant)', () =>
    assert.deepEqual(sanitizeHistory([user([text('a'), use('t9')]), asst([text('b'), result('t9')])]), [user([text('a')]), asst([text('b')])]));
  ok('tool_use without input gets {}', () =>
    assert.deepEqual(sanitizeHistory([user('a'), asst([{ type: 'tool_use', id: 't1', name: 'render' }]), user([result('t1')])])[1].content[0].input, {}));
  ok('non-array input → []', () => { assert.deepEqual(sanitizeHistory(null), []); assert.deepEqual(sanitizeHistory('x'), []); });
}

// --- 5. a valid history passes through unchanged; idempotent ------------------
{
  const good = [
    user('techno beat'),
    asst([text('Programming.'), use('t1', 'add_jt90', { kick: [0, 4, 8, 12] })]),
    user([result('t1', 'JT90: kick 4 hits')]),
    asst([use('t2', 'render', {})]),
    user([result('t2', 'Rendered 2 bars')]),
    asst('Four on the floor.'),
    user('make it punchier'),
    asst([text('Done.')]),
  ];
  const fixed = sanitizeHistory(good);
  ok('valid history is unchanged', () => assert.deepEqual(fixed, good));
  ok('valid history is well-formed', () => assert.equal(isWellFormedHistory(good), true));
  const messy = [asst('x'), user('go'), asst([use('t1'), use('t2')]), user([result('t2'), result('bogus')]), asst([use('t3')]), asst('hm'), user(''), asst([text('End'), use('t4')])];
  const once = sanitizeHistory(messy);
  ok('idempotent', () => assert.deepEqual(sanitizeHistory(once), once));
  ok('messy history ends well-formed', () => assert.equal(isWellFormedHistory(once), true));
}

// --- 6. the repaired history runs through the real agent loop -----------------
{
  // A track whose stored history was cut off mid tool call; the user says "continue".
  const stored = [user('techno beat'), asst([text('Adding drums.'), use('t1', 'add_jt90', { kick: [0, 4, 8, 12] })])];
  const messages = sanitizeHistory(stored);
  const seen = [];
  const llm = async (req) => {
    seen.push(clone(req.messages));
    return { stop_reason: 'end_turn', content: [text('Continuing.')] };
  };
  await runAgent({
    task: 'continue', session: {}, messages, llm,
    executeTool: async () => 'ok', tools: [{ name: 'noop', description: '', input_schema: { type: 'object' } }],
    systemPrompt: 'You are Jambot',
  });
  ok('what the API receives is well-formed', () => assert.equal(isWellFormedHistory(seen[0]), true));
  ok('the cut-off tool call is gone and the new user turn follows the kept text', () => {
    assert.deepEqual(seen[0].map((m) => m.role), ['user', 'assistant', 'user']);
    assert.deepEqual(seen[0][1], asst([text('Adding drums.')]));
    assert.equal(seen[0][2].content, 'continue');
  });
  ok('the unrepaired history would not have been', () =>
    assert.equal(isWellFormedHistory([...stored, user('continue')]), false));
}

console.log(`\n${passed} checks passed${process.exitCode ? ', some FAILED' : ''}`);
