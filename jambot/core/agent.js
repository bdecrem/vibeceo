/**
 * Jambot Agent Loop (platform-agnostic)
 *
 * The one loop every Jambot front-end runs: the terminal UI, the headless
 * API, and the web app. It knows nothing about the Anthropic SDK, the file
 * system, or process.env — callers hand it an `llm` function that performs
 * a single Messages API call, and a tool executor.
 *
 * Fixes over the old loop that lived in jambot.js:
 *   - max_tokens defaults to 8192 (1024 truncated multi-step patterns)
 *   - iteration cap — a runaway tool loop can't bill forever
 *   - tool exceptions become `is_error` tool_results, never a crashed turn
 *   - prompt caching: the static system prompt and the tool schemas are
 *     marked ephemeral; only the small per-turn state block is uncached
 *   - session state context covers every instrument (was jb01/jb202 only)
 *   - every stop_reason terminates cleanly with a user-visible note
 *   - AbortSignal support
 *   - every tool_use in the history gets a tool_result, always: a response
 *     cut off by max_tokens mid tool call, a host callback that throws, or a
 *     saved history that already ends in an unanswered tool_use would
 *     otherwise make every later request fail with a 400
 *
 * @param {Object} opts
 * @param {string} opts.task - The user's message
 * @param {Object} opts.session - Jambot session
 * @param {Array} opts.messages - Anthropic-format history (mutated in place)
 * @param {Function} opts.llm - async (request) => Messages API response.
 *   `request` is { system, messages, tools, max_tokens, signal }.
 * @param {Function} opts.executeTool - async (name, input, session, context) => string
 * @param {Array} opts.tools - Tool definitions (Anthropic shape)
 * @param {string} opts.systemPrompt - Static system prompt (cached)
 * @param {Function} [opts.buildStateContext] - (session) => string, appended
 *   uncached each iteration. Defaults to no state.
 * @param {Function} [opts.buildGenreContext] - (conversationText) => string
 * @param {Object} [opts.callbacks] - { onStart, onTool, onToolResult, onAfterTool,
 *   onResponse, onEnd, onUsage }
 * @param {Object} [opts.context] - Passed through to executeTool
 * @param {number} [opts.maxIterations=30]
 * @param {number} [opts.maxTokens=8192]
 * @param {AbortSignal} [opts.signal]
 * @returns {Promise<{ session, messages, iterations, stopReason }>}
 */
export async function runAgent(opts) {
  const {
    task,
    session,
    messages,
    llm,
    executeTool,
    tools,
    systemPrompt,
    buildStateContext = () => '',
    buildGenreContext = () => '',
    callbacks = {},
    context = {},
    maxIterations = 30,
    maxTokens = 8192,
    signal,
  } = opts;

  if (typeof llm !== 'function') throw new Error('runAgent: llm function required');
  if (typeof executeTool !== 'function') throw new Error('runAgent: executeTool function required');

  callbacks.onStart?.(task);
  // A saved history may end in an unanswered tool_use (written by the old
  // loop, or by a crash mid-turn). Answer it before adding the new message,
  // otherwise the API rejects every request from here on.
  repairToolHistory(messages);
  messages.push({ role: 'user', content: task });

  // Genre/library context is detected once per turn from everything the
  // user and assistant have said (tool payloads excluded).
  const conversationText = messages
    .map(m => {
      if (typeof m.content === 'string') return m.content;
      if (!Array.isArray(m.content)) return '';
      return m.content.filter(b => b.type === 'text').map(b => b.text).join(' ');
    })
    .join(' ');
  const genreContext = buildGenreContext(conversationText) || '';

  // Static prefix (cached) + dynamic state (uncached, rebuilt per iteration).
  const staticSystem = { type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } };
  const cachedTools = tools.map((t, i) =>
    i === tools.length - 1 ? { ...t, cache_control: { type: 'ephemeral' } } : t
  );

  let iterations = 0;
  let stopReason = 'end_turn';

  while (true) {
    if (signal?.aborted) {
      stopReason = 'aborted';
      break;
    }
    if (iterations >= maxIterations) {
      stopReason = 'max_iterations';
      callbacks.onResponse?.(`(stopped after ${maxIterations} tool rounds — ask me to continue)`);
      break;
    }
    iterations++;

    const dynamic = [genreContext, buildStateContext(session) || ''].filter(Boolean).join('');
    const system = dynamic ? [staticSystem, { type: 'text', text: dynamic }] : [staticSystem];

    const response = await llm({
      system,
      messages,
      tools: cachedTools,
      max_tokens: maxTokens,
      signal,
    });

    if (response.usage) callbacks.onUsage?.(response.usage);

    const content = Array.isArray(response.content) ? response.content : [];
    const textBlocks = content.filter(b => b.type === 'text' && b.text);
    const toolBlocks = content.filter(b => b.type === 'tool_use');

    // The API rejects empty assistant content, so only record turns that
    // actually said or did something.
    if (content.length > 0) {
      messages.push({ role: 'assistant', content });
    }

    for (const block of textBlocks) callbacks.onResponse?.(block.text);

    if (toolBlocks.length > 0 && response.stop_reason === 'tool_use') {
      await runToolRound(toolBlocks, { executeTool, session, context, callbacks, messages });
      continue;
    }

    if (toolBlocks.length > 0) {
      // Cut off (max_tokens) or otherwise stopped while emitting a tool call.
      // The API still returns the partial tool_use blocks (input `{}` or
      // truncated), and rejects every later request until each one has a
      // tool_result. Don't run them — answer them as errors.
      const why = response.stop_reason || 'unknown stop reason';
      messages.push({
        role: 'user',
        content: toolBlocks.map(b => toolResult(b.id,
          `Not run: the response was cut off (${why}) before this ${b.name} call was complete. Call it again with the full input.`,
          true)),
      });
    }

    stopReason = response.stop_reason || 'end_turn';

    if (stopReason === 'end_turn' || stopReason === 'stop_sequence') break;

    // Every other stop reason (max_tokens, refusal, or a tool_use turn
    // that came back without tool blocks) terminates with a visible note
    // instead of re-sending the same request.
    if (stopReason === 'max_tokens') {
      callbacks.onResponse?.('(response was cut off — say "continue" to keep going)');
    } else if (stopReason === 'refusal') {
      callbacks.onResponse?.('Request declined by safety classifiers.');
    } else if (stopReason !== 'tool_use') {
      callbacks.onResponse?.(`(stopped: ${stopReason})`);
    }
    break;
  }

  callbacks.onEnd?.(stopReason);
  return { session, messages, iterations, stopReason };
}

/**
 * Execute one round of tool calls and push the tool_result user message.
 * A tool_result is recorded for every block no matter what: a tool that
 * throws becomes an is_error result, and if a host callback (onTool,
 * onToolResult, onAfterTool) throws, the results so far plus "not run"
 * errors for the rest are pushed before the exception propagates.
 */
async function runToolRound(toolBlocks, { executeTool, session, context, callbacks, messages }) {
  const toolResults = [];
  try {
    for (const block of toolBlocks) {
      let result;
      let isError = false;
      try {
        callbacks.onTool?.(block.name, block.input);
        try {
          result = await executeTool(block.name, block.input || {}, session, context);
        } catch (err) {
          result = `Error in ${block.name}: ${err?.message || err}`;
          isError = true;
        }
        if (typeof result !== 'string') result = result == null ? '' : String(result);
        if (result === '') result = '(no output)';
        if (!isError && isToolError(result)) isError = true;

        callbacks.onToolResult?.(result, block.name, isError);
        callbacks.onAfterTool?.(block.name, session);
      } finally {
        if (typeof result !== 'string') {
          result = `Error in ${block.name}: interrupted before the tool ran`;
          isError = true;
        }
        toolResults.push(toolResult(block.id, result, isError));
      }
    }
  } finally {
    for (const block of toolBlocks) {
      if (!toolResults.some(r => r.tool_use_id === block.id)) {
        toolResults.push(toolResult(block.id, `Error in ${block.name}: not run — the turn was interrupted`, true));
      }
    }
    messages.push({ role: 'user', content: toolResults });
  }
}

function toolResult(toolUseId, content, isError) {
  const tr = { type: 'tool_result', tool_use_id: toolUseId, content };
  if (isError) tr.is_error = true;
  return tr;
}

/**
 * Tool results that read as failures. Tools return plain strings and most
 * failures carry no "Error:" prefix — song-tools: 'No jt90 pattern "Z"
 * found', 'Unknown instrument: x'; jt/jb01-tools: 'JT90: invalid voice…';
 * jb01-tools: "Kit 'x' not found"; routing-tools: 'Track "x" doesn't exist';
 * mixer-tools: 'No delay found on jb01'. Only the first line is inspected so
 * a long success message that mentions "not found" further down is not
 * flagged, and informational empties ('No active automation', 'No tracks',
 * 'No JB01 kits found') are deliberately not matched.
 */
const TOOL_ERROR_RE = new RegExp([
  '^Error\\b',
  '^Unknown (?:tool|instrument)\\b',
  '^(?:Invalid|Cannot|Could not|Missing|Unsupported)\\b',
  '^No [\\w-]+ pattern "',                    // load_pattern / copy_pattern: no such saved pattern
  '^No automation found for',
  '^No [\\w-]+ (?:insert )?found on ',        // remove_effect / remove_channel_insert / tweak_effect
  '^No (?:inserts|effect chain) on ',
  '^No parameters (?:for|to tweak)',
  '^.{0,60}\\b(?:not found|doesn\'t exist|already exists)\\b',
  '^[^:]{1,40}: invalid\\b',                   // 'JT90: invalid voice. Use: …'
].join('|'));

export function isToolError(result) {
  const firstLine = String(result ?? '').split('\n')[0];
  return TOOL_ERROR_RE.test(firstLine);
}

/**
 * Make every tool_use in a history answered, in place. For each assistant
 * message with tool_use blocks, the following user message must hold a
 * tool_result per id; missing ones are added as is_error results (into that
 * user message, ahead of its other content, or as a new user message when
 * the history ends there). Returns the number of results added.
 */
export function repairToolHistory(messages) {
  if (!Array.isArray(messages)) return 0;
  let added = 0;
  for (let i = 0; i < messages.length; i++) {
    const m = messages[i];
    if (!m || m.role !== 'assistant' || !Array.isArray(m.content)) continue;
    const uses = m.content.filter(b => b && b.type === 'tool_use');
    if (uses.length === 0) continue;

    const next = messages[i + 1];
    const nextIsUser = next && next.role === 'user';
    const nextText = nextIsUser && typeof next.content === 'string' ? next.content : '';
    const nextBlocks = nextIsUser
      ? (Array.isArray(next.content) ? next.content : (nextText ? [{ type: 'text', text: nextText }] : []))
      : [];
    const answered = new Set(nextBlocks.filter(b => b && b.type === 'tool_result').map(b => b.tool_use_id));
    const missing = uses
      .filter(u => !answered.has(u.id))
      .map(u => toolResult(u.id, `Error in ${u.name}: no result was recorded for this call (the turn was interrupted). Call it again if it still matters.`, true));
    if (missing.length === 0) continue;

    if (nextIsUser) {
      const results = nextBlocks.filter(b => b && b.type === 'tool_result');
      const rest = nextBlocks.filter(b => !(b && b.type === 'tool_result'));
      next.content = [...results, ...missing, ...rest];
    } else {
      messages.splice(i + 1, 0, { role: 'user', content: missing });
    }
    added += missing.length;
  }
  return added;
}
