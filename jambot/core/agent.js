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

    if (response.stop_reason === 'tool_use' && toolBlocks.length > 0) {
      const toolResults = [];
      for (const block of toolBlocks) {
        callbacks.onTool?.(block.name, block.input);

        let result;
        let isError = false;
        try {
          result = await executeTool(block.name, block.input || {}, session, context);
          if (result instanceof Promise) result = await result;
        } catch (err) {
          result = `Error in ${block.name}: ${err?.message || err}`;
          isError = true;
        }
        if (typeof result !== 'string') result = result == null ? '' : String(result);
        if (result === '') result = '(no output)';
        if (!isError && /^(Error|Unknown tool)/.test(result)) isError = true;

        callbacks.onToolResult?.(result, block.name, isError);
        callbacks.onAfterTool?.(block.name, session);

        const tr = { type: 'tool_result', tool_use_id: block.id, content: result };
        if (isError) tr.is_error = true;
        toolResults.push(tr);
      }
      messages.push({ role: 'user', content: toolResults });
      continue;
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
