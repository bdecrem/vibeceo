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
 *   - every tool_use always gets a tool_result: max_tokens mid tool call,
 *     a host callback that throws, a saved history ending in a dangling
 *     tool_use (repairToolHistory)
 *   - is_error heuristic recognises the failure strings tools actually return
 */
import { strict as assert } from 'node:assert';
import { runAgent, isToolError, repairToolHistory } from '../core/agent.js';
import { createSession } from '../core/session.js';
import { buildSessionContext, describeSession } from '../core/status.js';
import { initializeTools, executeTool } from '../tools/index.js';
import { TOOLS } from '../tools/tool-definitions.js';

await initializeTools();

let passed = 0;
async function ok(name, fn) {
  try { await fn(); console.log(`  ✓ ${name}`); passed++; }
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

/** Every tool_use must be answered by a tool_result in the very next message. */
function unansweredToolUses(messages) {
  const out = [];
  messages.forEach((m, i) => {
    if (m.role !== 'assistant' || !Array.isArray(m.content)) return;
    const next = messages[i + 1];
    const answered = new Set(next?.role === 'user' && Array.isArray(next.content)
      ? next.content.filter(b => b.type === 'tool_result').map(b => b.tool_use_id) : []);
    for (const b of m.content) if (b.type === 'tool_use' && !answered.has(b.id)) out.push(b.id);
  });
  return out;
}

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

  await ok('loop ran three LLM rounds', () => assert.equal(calls.length, 3));
  await ok('tools executed in order', () => assert.deepEqual(seenTools, ['add_jt90', 'tweak']));
  await ok('stopReason end_turn', () => assert.equal(result.stopReason, 'end_turn'));
  await ok('history: user, asst, tool_result, asst, tool_result, asst', () => {
    assert.deepEqual(messages.map(m => m.role), ['user', 'assistant', 'user', 'assistant', 'user', 'assistant']);
    assert.equal(messages[2].content[0].type, 'tool_result');
    assert.equal(messages[2].content[0].tool_use_id, 't1');
    assert.ok(!messages[2].content[0].is_error);
  });
  await ok('session actually changed', () => {
    const d = describeSession(session);
    const jt90 = d.instruments.find(i => i.id === 'jt90');
    assert.ok(jt90.active);
    assert.deepEqual(jt90.voices.sort(), ['ch', 'kick']);
  });
  await ok('state context sees jt90 with tweak', () => {
    const ctx = buildSessionContext(session);
    assert.match(ctx, /jt90 \(kick ch\)/);
    assert.match(ctx, /kick\.decay=70/);
  });
  await ok('static system block cached, state block not', () => {
    const sys = calls[2].system;
    assert.equal(sys[0].cache_control.type, 'ephemeral');
    assert.equal(sys[0].text, 'SYS');
    assert.ok(!sys[1].cache_control);
    assert.match(sys[1].text, /CURRENT SESSION STATE/);
  });
  await ok('last tool carries cache_control, others do not', () => {
    const tools = calls[0].tools;
    assert.equal(tools[tools.length - 1].cache_control.type, 'ephemeral');
    assert.ok(!tools[0].cache_control);
    assert.ok(!TOOLS[TOOLS.length - 1].cache_control, 'must not mutate TOOLS');
  });
  await ok('max_tokens defaults to 8192', () => assert.equal(calls[0].max_tokens, 8192));
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
  await ok('exception → is_error tool_result, loop continues', () => {
    assert.equal(result.stopReason, 'end_turn');
    const tr = messages[2].content;
    assert.equal(tr[0].is_error, true);
    assert.match(tr[0].content, /kaboom/);
  });
  await ok('unknown tool → is_error', () => {
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
  await ok(`${reason} terminates after one call with a note`, () => {
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
  await ok('runaway tool loop stops at maxIterations', () => {
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
  await ok('empty assistant turn is not recorded', () => assert.deepEqual(messages.map(m => m.role), ['user']));
}

// --- 6. max_tokens mid tool call: partial tool_use is answered, not run -----
{
  const session = createSession({ bpm: 128 });
  const { llm, calls } = scripted([
    { stop_reason: 'max_tokens', content: [text('Programming'), toolUse('cut1', 'add_jt90', {}), toolUse('cut2', 'set_arrangement', {})] },
  ]);
  const messages = [];
  const notes = [];
  let toolsRun = 0;
  const result = await runAgent({
    task: 'big song', session, messages, llm, executeTool, tools: TOOLS, systemPrompt: 'S',
    callbacks: { onTool: () => toolsRun++, onResponse: (t) => notes.push(t) },
  });
  await ok('max_tokens with tool_use blocks: one LLM call, nothing executed, note shown', () => {
    assert.equal(calls.length, 1);
    assert.equal(result.stopReason, 'max_tokens');
    assert.equal(toolsRun, 0);
    assert.ok(notes.some(n => /cut off/.test(n)), notes.join(' | '));
    assert.ok(!describeSession(session).instruments.find(i => i.id === 'jt90').active, 'partial add_jt90 must not run');
  });
  await ok('every partial tool_use has an is_error tool_result right after it', () => {
    assert.deepEqual(unansweredToolUses(messages), []);
    assert.deepEqual(messages.map(m => m.role), ['user', 'assistant', 'user']);
    const results = messages[2].content;
    assert.deepEqual(results.map(r => r.tool_use_id), ['cut1', 'cut2']);
    assert.ok(results.every(r => r.type === 'tool_result' && r.is_error === true));
    assert.match(results[0].content, /cut off \(max_tokens\)/);
    assert.match(results[0].content, /add_jt90/);
  });
  await ok('the next turn can be sent: no dangling tool_use after the follow-up', () => {
    // A "continue" turn appended to the same history must leave it valid.
    const { llm: llm2 } = scripted([{ stop_reason: 'end_turn', content: [text('done')] }]);
    return runAgent({ task: 'continue', session, messages, llm: llm2, executeTool, tools: TOOLS, systemPrompt: 'S' })
      .then(() => assert.deepEqual(unansweredToolUses(messages), []));
  });
}

// --- 7. a host callback that throws still leaves the history consistent ----
{
  const session = createSession({ bpm: 128 });
  const { llm } = scripted([
    { stop_reason: 'tool_use', content: [toolUse('c1', 'set_swing', { amount: 10 }), toolUse('c2', 'set_swing', { amount: 20 }), toolUse('c3', 'set_swing', { amount: 30 })] },
    { stop_reason: 'end_turn', content: [text('ok')] },
  ]);
  const messages = [];
  let seen = 0;
  let threw = null;
  try {
    await runAgent({
      task: 'x', session, messages, llm, executeTool, tools: TOOLS, systemPrompt: 'S',
      callbacks: { onToolResult: () => { if (++seen === 2) throw new Error('ui bug'); } },
    });
  } catch (e) { threw = e; }
  await ok('callback exception propagates to the caller', () => assert.match(threw?.message || '', /ui bug/));
  await ok('…but all three tool_use blocks are answered (ran, ran, not run)', () => {
    assert.deepEqual(unansweredToolUses(messages), []);
    assert.deepEqual(messages.map(m => m.role), ['user', 'assistant', 'user']);
    const results = messages[2].content;
    assert.deepEqual(results.map(r => r.tool_use_id), ['c1', 'c2', 'c3']);
    assert.ok(!results[0].is_error, 'c1 ran fine');
    assert.ok(!results[1].is_error, 'c2 ran fine (its callback threw afterwards)');
    assert.equal(results[2].is_error, true);
    assert.match(results[2].content, /not run/);
  });
}

// --- 8. repairToolHistory fixes a saved history that ends in a tool_use -----
{
  // Shape a poisoned jam_tracks.messages had: assistant tool_use, nothing after.
  const messages = [
    { role: 'user', content: 'techno beat' },
    { role: 'assistant', content: [text('Programming'), toolUse('old1', 'add_jt90', {})] },
  ];
  const session = createSession({ bpm: 128 });
  const { llm, calls } = scripted([{ stop_reason: 'end_turn', content: [text('back')] }]);
  await runAgent({ task: 'continue', session, messages, llm, executeTool, tools: TOOLS, systemPrompt: 'S' });
  await ok('dangling tail tool_use gets an error tool_result before the new task', () => {
    assert.deepEqual(unansweredToolUses(messages), []);
    assert.deepEqual(messages.map(m => m.role), ['user', 'assistant', 'user', 'user', 'assistant']);
    assert.equal(messages[2].content[0].tool_use_id, 'old1');
    assert.equal(messages[2].content[0].is_error, true);
    assert.equal(messages[3].content, 'continue');
    assert.deepEqual(unansweredToolUses(calls[0].messages), [], 'the request that went out was already valid');
  });

  // Dangling tool_use followed by a plain user message (the failed follow-up
  // was saved too): results go into that message, ahead of its text.
  const m2 = [
    { role: 'user', content: 'techno beat' },
    { role: 'assistant', content: [toolUse('old2', 'render', {})] },
    { role: 'user', content: 'continue' },
    { role: 'assistant', content: [toolUse('ok1', 'set_swing', { amount: 5 })] },
    { role: 'user', content: [{ type: 'tool_result', tool_use_id: 'ok1', content: 'Set swing' }] },
  ];
  const added = repairToolHistory(m2);
  await ok('repairToolHistory merges into the following user message and leaves answered calls alone', () => {
    assert.equal(added, 1);
    assert.deepEqual(unansweredToolUses(m2), []);
    assert.equal(m2.length, 5);
    assert.deepEqual(m2[2].content.map(b => b.type), ['tool_result', 'text']);
    assert.equal(m2[2].content[0].tool_use_id, 'old2');
    assert.equal(m2[2].content[1].text, 'continue');
    assert.equal(m2[4].content.length, 1, 'already-answered round untouched');
    assert.equal(repairToolHistory(m2), 0, 'idempotent');
  });
}

// --- 9. is_error heuristic matches what tools actually return ---------------
{
  const session = createSession({ bpm: 128 });
  await executeTool('add_jt90', { kick: [0, 4, 8, 12] }, session, {});
  const failures = [
    await executeTool('load_pattern', { instrument: 'jt90', name: 'Z' }, session, {}),         // No jt90 pattern "Z" found
    await executeTool('load_pattern', { instrument: 'nope', name: 'Z' }, session, {}),         // Unknown instrument: nope
    await executeTool('nope_tool', {}, session, {}),                                            // Unknown tool: nope_tool
    await executeTool('remove_effect', { target: 'jt90', effect: 'delay' }, session, {}),      // No effect chain on jt90
    await executeTool('tweak', { path: 'jt90.kick.nothing', value: 1 }, session, {}),          // Error: …
    'JT90: invalid voice. Use: kick, snare',
    "Kit 'x' not found or empty",
    'Track "x" doesn\'t exist. Available: a, b',
    'Send "x" already exists',
    'No delay insert found on master',
    'No automation found for "jt90.kick.decay"',
    'Invalid waveform: tri. Use: saw, square',
    'Cannot open projects in this context.',
    'Could not detect waveform: silence',
  ];
  const successes = [
    await executeTool('tweak', { path: 'jt90.kick.decay', value: 50 }, session, {}),           // Set jt90.kick.decay = 50
    await executeTool('add_jt90', { snare: [4, 12] }, session, {}),                            // JT90: snare: 2 hits
    await executeTool('save_pattern', { instrument: 'jt90', name: 'A' }, session, {}),
    await executeTool('show_automation', {}, session, {}),                                     // No active automation
    await executeTool('show_effects', {}, session, {}),                                        // No effect chains configured…
    await executeTool('list_tracks', {}, session, {}),                                         // No tracks
    'No JB01 kits found',
    'Rendered 2 bars at 128 BPM (JT90)',
    'Set arrangement: 4 sections, 32 bars\nintro (8 bars): the pattern "not found" gag is only on line two',
  ];
  await ok('failure strings are flagged is_error', () => {
    const missed = failures.filter(s => !isToolError(s));
    assert.deepEqual(missed, [], `not flagged: ${JSON.stringify(missed)}`);
  });
  await ok('success and informational strings are not flagged', () => {
    const wrong = successes.filter(s => isToolError(s));
    assert.deepEqual(wrong, [], `wrongly flagged: ${JSON.stringify(wrong)}`);
  });
  await ok('the loop marks a not-found load_pattern as is_error for the model and the UI', async () => {
    const s2 = createSession({ bpm: 128 });
    const { llm } = scripted([
      { stop_reason: 'tool_use', content: [toolUse('lp', 'load_pattern', { instrument: 'jt90', name: 'Z' })] },
      { stop_reason: 'end_turn', content: [text('ok')] },
    ]);
    const messages = [];
    const flags = [];
    await runAgent({ task: 'x', session: s2, messages, llm, executeTool, tools: TOOLS, systemPrompt: 'S', callbacks: { onToolResult: (r, n, e) => flags.push(e) } });
    assert.deepEqual(flags, [true]);
    assert.equal(messages[2].content[0].is_error, true);
  });
}

console.log(`\n${passed} agent-loop checks passed${process.exitCode ? ' (with failures)' : ''}`);
