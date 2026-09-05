#!/usr/bin/env node
/**
 * Agent loop contract tests (core/agent.js) — mock LLM, real tools.
 *
 *   - tool_use rounds execute tools and feed results back
 *   - tool exceptions become is_error tool_results (turn survives)
 *   - max_tokens / refusal / unknown stop reasons terminate with a note
 *   - iteration cap stops runaway loops
 *   - prompt caching markers are on the static system block + last tool
 *   - session state context reflects every instrument
 */
import { strict as assert } from 'node:assert';
import { runAgent } from '../core/agent.js';
import { createSession } from '../core/session.js';
import { buildSessionContext, describeSession } from '../core/status.js';
import { initializeTools, executeTool } from '../tools/index.js';
import { TOOLS } from '../tools/tool-definitions.js';

await initializeTools();

let passed = 0;
function ok(name, fn) {
  try { fn(); console.log(`  ✓ ${name}`); passed++; }
  catch (e) { console.error(`  ✗ ${name}\n    ${e.message}`); process.exitCode = 1; }
}

function scripted(responses) {
  const calls = [];
  const llm = async (req) => {
    calls.push(req);
    const r = responses.shift();
    if (!r) throw new Error('mock llm: no more scripted responses');
    return r;
  };
  return { llm, calls };
}

const text = (t) => ({ type: 'text', text: t });
const toolUse = (id, name, input) => ({ type: 'tool_use', id, name, input });

// --- 1. tool round-trip -----------------------------------------------------
{
  const session = createSession({ bpm: 128 });
  const { llm, calls } = scripted([
    { stop_reason: 'tool_use', content: [text('Programming drums.'), toolUse('t1', 'add_jt90', { kick: [0, 4, 8, 12], ch: [2, 6, 10, 14] })] },
    { stop_reason: 'tool_use', content: [toolUse('t2', 'tweak', { path: 'jt90.kick.decay', value: 70 })] },
    { stop_reason: 'end_turn', content: [text('Four on the floor, kick decay 70.')] },
  ]);
  const messages = [];
  const seenTools = [];
  const result = await runAgent({
    task: 'techno beat', session, messages, llm, executeTool, tools: TOOLS,
    systemPrompt: 'SYS', buildStateContext: buildSessionContext,
    callbacks: { onTool: (n) => seenTools.push(n) },
  });

  ok('loop ran three LLM rounds', () => assert.equal(calls.length, 3));
  ok('tools executed in order', () => assert.deepEqual(seenTools, ['add_jt90', 'tweak']));
  ok('stopReason end_turn', () => assert.equal(result.stopReason, 'end_turn'));
  ok('history: user, asst, tool_result, asst, tool_result, asst', () => {
    assert.deepEqual(messages.map(m => m.role), ['user', 'assistant', 'user', 'assistant', 'user', 'assistant']);
    assert.equal(messages[2].content[0].type, 'tool_result');
    assert.equal(messages[2].content[0].tool_use_id, 't1');
    assert.ok(!messages[2].content[0].is_error);
  });
  ok('session actually changed', () => {
    const d = describeSession(session);
    const jt90 = d.instruments.find(i => i.id === 'jt90');
    assert.ok(jt90.active);
    assert.deepEqual(jt90.voices.sort(), ['ch', 'kick']);
  });
  ok('state context sees jt90 with tweak', () => {
    const ctx = buildSessionContext(session);
    assert.match(ctx, /jt90 \(kick ch\)/);
    assert.match(ctx, /kick\.decay=70/);
  });
  ok('static system block cached, state block not', () => {
    const sys = calls[2].system;
    assert.equal(sys[0].cache_control.type, 'ephemeral');
    assert.equal(sys[0].text, 'SYS');
    assert.ok(!sys[1].cache_control);
    assert.match(sys[1].text, /CURRENT SESSION STATE/);
  });
  ok('last tool carries cache_control, others do not', () => {
    const tools = calls[0].tools;
    assert.equal(tools[tools.length - 1].cache_control.type, 'ephemeral');
    assert.ok(!tools[0].cache_control);
    assert.ok(!TOOLS[TOOLS.length - 1].cache_control, 'must not mutate TOOLS');
  });
  ok('max_tokens defaults to 8192', () => assert.equal(calls[0].max_tokens, 8192));
}

// --- 2. tool errors survive -------------------------------------------------
{
  const session = createSession({ bpm: 128 });
  const boom = async (name) => { if (name === 'explode') throw new Error('kaboom'); return executeTool(...arguments); };
  const { llm } = scripted([
    { stop_reason: 'tool_use', content: [toolUse('t1', 'explode', {}), toolUse('t2', 'nope_tool', {})] },
    { stop_reason: 'end_turn', content: [text('ok')] },
  ]);
  const messages = [];
  const errs = [];
  const result = await runAgent({
    task: 'x', session, messages, llm, tools: TOOLS, systemPrompt: 'S',
    executeTool: async (name, input, s, c) => name === 'explode' ? boom(name) : executeTool(name, input, s, c),
    callbacks: { onToolResult: (r, n, isErr) => errs.push([n, isErr]) },
  });
  ok('exception → is_error tool_result, loop continues', () => {
    assert.equal(result.stopReason, 'end_turn');
    const tr = messages[2].content;
    assert.equal(tr[0].is_error, true);
    assert.match(tr[0].content, /kaboom/);
  });
  ok('unknown tool → is_error', () => {
    assert.equal(messages[2].content[1].is_error, true);
    assert.deepEqual(errs, [['explode', true], ['nope_tool', true]]);
  });
}

// --- 3. terminal stop reasons ----------------------------------------------
for (const [reason, pattern] of [['max_tokens', /cut off/], ['refusal', /declined/], ['weird', /stopped: weird/]]) {
  const session = createSession({ bpm: 128 });
  const { llm, calls } = scripted([{ stop_reason: reason, content: [text('partial')] }, { stop_reason: 'end_turn', content: [] }]);
  const notes = [];
  const result = await runAgent({ task: 'x', session, messages: [], llm, executeTool, tools: TOOLS, systemPrompt: 'S', callbacks: { onResponse: (t) => notes.push(t) } });
  ok(`${reason} terminates after one call with a note`, () => {
    assert.equal(calls.length, 1);
    assert.equal(result.stopReason, reason);
    assert.ok(notes.some(n => pattern.test(n)), notes.join(' | '));
  });
}

// --- 4. iteration cap -------------------------------------------------------
{
  const session = createSession({ bpm: 128 });
  let n = 0;
  const llm = async () => ({ stop_reason: 'tool_use', content: [toolUse(`t${n++}`, 'set_swing', { amount: 10 })] });
  const result = await runAgent({ task: 'x', session, messages: [], llm, executeTool, tools: TOOLS, systemPrompt: 'S', maxIterations: 5 });
  ok('runaway tool loop stops at maxIterations', () => {
    assert.equal(result.stopReason, 'max_iterations');
    assert.equal(result.iterations, 5);
  });
}

// --- 5. empty content never lands in history --------------------------------
{
  const session = createSession({ bpm: 128 });
  const { llm } = scripted([{ stop_reason: 'end_turn', content: [] }]);
  const messages = [];
  await runAgent({ task: 'x', session, messages, llm, executeTool, tools: TOOLS, systemPrompt: 'S' });
  ok('empty assistant turn is not recorded', () => assert.deepEqual(messages.map(m => m.role), ['user']));
}

console.log(`\n${passed} agent-loop checks passed${process.exitCode ? ' (with failures)' : ''}`);
